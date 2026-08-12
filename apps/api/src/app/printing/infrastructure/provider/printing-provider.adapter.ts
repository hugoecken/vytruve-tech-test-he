import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ApiEnvironment } from '@api/config/environment';
import type { PrintJobObservationModel } from '../../application/models/print-request.model';
import {
  PrintingProviderError,
  type PrintingProviderPort,
} from '../../application/ports/printing-provider.port';
import { PrintingProviderMapper } from './mappers/printing-provider.mapper';

/** Provider operations emitted in safe structured logs. */
type ProviderOperation = 'find_by_reference' | 'get_by_id' | 'submit';

/** Provider outcomes emitted without credentials, bodies, or scan data. */
type ProviderOutcome =
  | 'accepted'
  | 'ambiguous_http_failure'
  | 'ambiguous_invalid_response'
  | 'ambiguous_transport_failure'
  | 'authentication_rejected'
  | 'capacity_rejected'
  | 'invalid_response'
  | 'not_found'
  | 'succeeded'
  | 'unavailable';

/** Encapsulates authenticated printing HTTP calls and their failure semantics. */
@Injectable()
export class PrintingProviderAdapter implements PrintingProviderPort {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly logger = new Logger(PrintingProviderAdapter.name);
  private readonly timeoutMs: number;

  /**
   * Captures validated immutable configuration and the provider boundary mapper.
   *
   * @param config Validated printing URL, credential, and timeout.
   * @param mapper Provider request and runtime response mapper.
   */
  constructor(
    config: ConfigService<ApiEnvironment, true>,
    private readonly mapper: PrintingProviderMapper,
  ) {
    this.apiKey = config.getOrThrow<string>('PRINTING_API_KEY');
    this.baseUrl = config.getOrThrow<string>('PRINTING_API_BASE_URL');
    this.timeoutMs = config.getOrThrow<number>('PRINTING_API_TIMEOUT_MS');
  }

  /**
   * Submits the non-idempotent provider operation exactly once.
   *
   * @param content Owner-authorized bounded PLY bytes.
   * @param reference Persisted reference that owns later reconciliation.
   * @returns Validated provider observation when acceptance is certain.
   * @throws A safe provider category for definite or ambiguous failures.
   */
  async submit(
    content: Buffer,
    reference: string,
  ): Promise<PrintJobObservationModel> {
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await this.request('/printing', {
        body: this.mapper.toSubmissionForm(content, reference),
        method: 'POST',
      });
    } catch {
      this.logOperation(
        'warn',
        'submit',
        'ambiguous_transport_failure',
        startedAt,
        { reference },
      );
      throw new PrintingProviderError('ambiguous_submission');
    }

    if (response.status === 400) {
      this.logOperation('warn', 'submit', 'capacity_rejected', startedAt, {
        providerStatus: response.status,
        reference,
      });
      throw new PrintingProviderError('capacity_reached');
    }
    if (response.status === 401) {
      this.logOperation(
        'error',
        'submit',
        'authentication_rejected',
        startedAt,
        { providerStatus: response.status, reference },
      );
      throw new PrintingProviderError('authentication_failed');
    }
    if (!response.ok) {
      this.logOperation('warn', 'submit', 'ambiguous_http_failure', startedAt, {
        providerStatus: response.status,
        reference,
      });
      throw new PrintingProviderError('ambiguous_submission');
    }

    try {
      const observation = this.mapper.toObservation(await response.json());
      this.logOperation('log', 'submit', 'accepted', startedAt, {
        providerStatus: response.status,
        reference,
      });
      return observation;
    } catch {
      this.logOperation(
        'warn',
        'submit',
        'ambiguous_invalid_response',
        startedAt,
        { providerStatus: response.status, reference },
      );
      throw new PrintingProviderError('ambiguous_submission');
    }
  }

  /**
   * Resolves only the exact persisted reference and never queries a global list.
   *
   * @param reference Durable reference from the original submission.
   * @returns Validated provider identifier or null while it is not found.
   * @throws A safe provider category for access or validation failures.
   */
  async findIdByReference(reference: string): Promise<string | null> {
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await this.request(
        `/printing/reference/${encodeURIComponent(reference)}`,
        { method: 'GET' },
      );
    } catch {
      this.logOperation('warn', 'find_by_reference', 'unavailable', startedAt, {
        reference,
      });
      throw new PrintingProviderError('unavailable');
    }

    if (response.status === 404) {
      this.logOperation('log', 'find_by_reference', 'not_found', startedAt, {
        reference,
      });
      return null;
    }
    this.assertReadableResponse(response, 'find_by_reference', startedAt, {
      reference,
    });

    try {
      const providerId = this.mapper.toProviderId(
        (await response.text()).trim(),
      );
      this.logOperation('log', 'find_by_reference', 'succeeded', startedAt, {
        providerStatus: response.status,
        reference,
      });
      return providerId;
    } catch {
      this.logOperation(
        'error',
        'find_by_reference',
        'invalid_response',
        startedAt,
        { providerStatus: response.status, reference },
      );
      throw new PrintingProviderError('invalid_response');
    }
  }

  /**
   * Reads one known provider job and verifies response identity.
   *
   * @param providerId Previously validated provider identifier.
   * @returns Validated provider-neutral observation.
   * @throws A safe provider category for access, absence, or invalid data.
   */
  async getById(providerId: string): Promise<PrintJobObservationModel> {
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await this.request(
        `/printing/${encodeURIComponent(providerId)}`,
        { method: 'GET' },
      );
    } catch {
      this.logOperation('warn', 'get_by_id', 'unavailable', startedAt, {});
      throw new PrintingProviderError('unavailable');
    }

    if (response.status === 404) {
      this.logOperation('warn', 'get_by_id', 'not_found', startedAt, {});
      throw new PrintingProviderError('not_found');
    }
    this.assertReadableResponse(response, 'get_by_id', startedAt, {});

    try {
      const observation = this.mapper.toObservation(await response.json());
      if (observation.providerId !== providerId) {
        throw new Error('Provider identity mismatch');
      }
      this.logOperation('log', 'get_by_id', 'succeeded', startedAt, {
        providerStatus: response.status,
      });
      return observation;
    } catch {
      this.logOperation('error', 'get_by_id', 'invalid_response', startedAt, {
        providerStatus: response.status,
      });
      throw new PrintingProviderError('invalid_response');
    }
  }

  /**
   * Translates non-successful read responses before parsing their bodies.
   *
   * @param response Provider response whose body remains unread.
   * @param operation Safe read operation identifier.
   * @param startedAt Local timestamp used to derive duration only.
   * @param identifiers Safe correlation identifiers.
   * @throws Authentication or temporary-unavailability provider categories.
   */
  private assertReadableResponse(
    response: Response,
    operation: Exclude<ProviderOperation, 'submit'>,
    startedAt: number,
    identifiers: { reference?: string },
  ): void {
    if (response.status === 401) {
      this.logOperation(
        'error',
        operation,
        'authentication_rejected',
        startedAt,
        { ...identifiers, providerStatus: response.status },
      );
      throw new PrintingProviderError('authentication_failed');
    }
    if (!response.ok) {
      this.logOperation('warn', operation, 'unavailable', startedAt, {
        ...identifiers,
        providerStatus: response.status,
      });
      throw new PrintingProviderError('unavailable');
    }
  }

  /**
   * Emits one bounded operational event without protected integration data.
   *
   * @param level Nest logger level matching the operation outcome.
   * @param operation Stable provider operation identifier.
   * @param outcome Stable provider outcome category.
   * @param startedAt Local timestamp used to derive duration only.
   * @param identifiers Safe technical identifiers and optional HTTP status.
   */
  private logOperation(
    level: 'error' | 'log' | 'warn',
    operation: ProviderOperation,
    outcome: ProviderOutcome,
    startedAt: number,
    identifiers: {
      providerStatus?: number;
      reference?: string;
    },
  ): void {
    this.logger[level]({
      durationMs: Date.now() - startedAt,
      event: 'printing_provider_operation',
      operation,
      outcome,
      ...identifiers,
    });
  }

  /**
   * Applies authentication and a finite timeout to one provider-relative request.
   *
   * @param path Provider-relative path owned by the current operation.
   * @param init Request options excluding centrally owned headers and timeout.
   * @returns Raw response for operation-specific status handling.
   */
  private request(path: string, init: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...init.headers, 'api-key': this.apiKey },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}
