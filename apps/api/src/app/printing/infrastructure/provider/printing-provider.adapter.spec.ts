import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ApiEnvironment } from '@api/config/environment';
import { PrintingProviderError } from '../../application/ports/printing-provider.port';
import { PrintingProviderMapper } from './mappers/printing-provider.mapper';
import { PrintingProviderAdapter } from './printing-provider.adapter';

const PROVIDER_ID = '00000000-0000-4000-8000-000000000010';
const REFERENCE = 'ABCDEFGHJK23';

/** Request behavior selected independently by each local protocol scenario. */
type RequestHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void | Promise<void>;

/** Provider request facts retained for one protocol assertion. */
interface RecordedRequest {
  body: Buffer;
  headers: IncomingMessage['headers'];
  method: string | undefined;
  url: string | undefined;
}

/** Valid provider payload emitted by the controlled local server. */
interface ControlledProviderResponse {
  endDate: string;
  id: string;
  startDate: string;
  status: null | 'failed' | 'success';
}

/** Reads one bounded synthetic request body received by the local provider. */
async function readRequest(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Writes one JSON response from the controlled local provider. */
function respondJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

/** Returns one valid provider response with a configurable terminal status. */
function providerResponse(
  status: null | 'failed' | 'success' = null,
): ControlledProviderResponse {
  return {
    endDate: '2026-08-12T10:20:00.000Z',
    id: PROVIDER_ID,
    startDate: '2026-08-12T10:10:00.000Z',
    status,
  };
}

describe(PrintingProviderAdapter.name, () => {
  let adapter: PrintingProviderAdapter;
  let handler: RequestHandler;
  let requests: RecordedRequest[];
  let server: Server;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    requests = [];
    handler = (_request, response) =>
      respondJson(response, 200, providerResponse());
    server = createServer((request, response) => {
      void (async () => {
        requests.push({
          body: await readRequest(request),
          headers: request.headers,
          method: request.method,
          url: request.url,
        });
        await handler(request, response);
      })();
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    const address = getServerAddress(server);
    const config = new ConfigService<ApiEnvironment, true>({
      PRINTING_API_BASE_URL: `http://127.0.0.1:${address.port}`,
      PRINTING_API_KEY: 'synthetic-provider-key',
      PRINTING_API_TIMEOUT_MS: 100,
    });
    adapter = new PrintingProviderAdapter(config, new PrintingProviderMapper());
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
    jest.restoreAllMocks();
  });

  it('submits the expected authenticated multipart request exactly once', async () => {
    await adapter.submit(Buffer.from('synthetic-ply'), REFERENCE);

    expect(requests).toHaveLength(1);
    expect(requests[0]?.method).toBe('POST');
    expect(requests[0]?.url).toBe('/printing');
    expect(requests[0]?.headers['api-key']).toBe('synthetic-provider-key');
    expect(requests[0]?.headers['content-type']).toContain(
      'multipart/form-data; boundary=',
    );
    expect(requests[0]?.body.toString('utf8')).toContain('filename="scan.ply"');
    expect(requests[0]?.body.toString('utf8')).toContain(
      'name="socketReference"',
    );
    expect(requests[0]?.body.toString('utf8')).toContain(REFERENCE);
  });

  it.each([
    [400, 'capacity_reached'],
    [401, 'authentication_failed'],
    [503, 'ambiguous_submission'],
  ] as const)(
    'translates provider status %i without retrying submission',
    async (status, expectedKind) => {
      handler = (_request, response) => {
        response.writeHead(status);
        response.end();
      };

      await expect(
        adapter.submit(Buffer.from('synthetic-ply'), REFERENCE),
      ).rejects.toMatchObject({ kind: expectedKind });

      expect(requests).toHaveLength(1);
    },
  );

  it('treats malformed successful submission as ambiguous without retrying', async () => {
    handler = (_request, response) =>
      respondJson(response, 200, { id: 'invalid' });

    await expect(
      adapter.submit(Buffer.from('synthetic-ply'), REFERENCE),
    ).rejects.toMatchObject({ kind: 'ambiguous_submission' });

    expect(requests).toHaveLength(1);
  });

  it('applies the configured timeout to submission without retrying', async () => {
    handler = () => undefined;
    const address = getServerAddress(server);
    adapter = new PrintingProviderAdapter(
      new ConfigService<ApiEnvironment, true>({
        PRINTING_API_BASE_URL: `http://127.0.0.1:${address.port}`,
        PRINTING_API_KEY: 'synthetic-provider-key',
        PRINTING_API_TIMEOUT_MS: 20,
      }),
      new PrintingProviderMapper(),
    );

    await expect(
      adapter.submit(Buffer.from('synthetic-ply'), REFERENCE),
    ).rejects.toEqual(new PrintingProviderError('ambiguous_submission'));

    expect(requests).toHaveLength(1);
  });

  it('encodes an exact reference lookup and returns its validated identifier', async () => {
    handler = (_request, response) => {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end(PROVIDER_ID);
    };

    const result = await adapter.findIdByReference('REF / 42');

    expect(result).toBe(PROVIDER_ID);
    expect(requests[0]?.url).toBe('/printing/reference/REF%20%2F%2042');
  });

  it('rejects a mismatched identifier returned for an exact provider read', async () => {
    handler = (_request, response) =>
      respondJson(response, 200, {
        ...providerResponse(),
        id: '00000000-0000-4000-8000-000000000011',
      });

    await expect(adapter.getById(PROVIDER_ID)).rejects.toMatchObject({
      kind: 'invalid_response',
    });
  });
});

/** Returns the TCP address assigned to the controlled local HTTP server. */
function getServerAddress(server: Server): AddressInfo {
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Expected the provider test server to use a TCP address');
  }
  return address;
}
