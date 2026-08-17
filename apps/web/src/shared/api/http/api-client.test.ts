import { vi } from 'vitest';
import { apiClient } from './api-client';
import { ApiTransportError } from './api-error';

/** Rejects one synthetic asynchronous operation when its signal aborts. */
function rejectWhenAborted<T = never>(
  signal: AbortSignal | null | undefined,
): Promise<T> {
  if (signal === null || signal === undefined) {
    throw new Error('Expected the request to carry an abort signal.');
  }

  return new Promise<T>((_resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true,
    });
  });
}

describe('apiClient request deadlines', () => {
  it('maps the default deadline expiry to a transport error', async () => {
    const timeout = new AbortController();
    const timeoutSpy = vi
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(timeout.signal);
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) =>
      rejectWhenAborted(init?.signal),
    );

    const request = apiClient('/patients', { method: 'GET' });

    expect(timeoutSpy).toHaveBeenCalledWith(15_000);
    timeout.abort(new DOMException('Synthetic timeout.', 'TimeoutError'));
    await expect(request).rejects.toMatchObject({
      name: 'ApiTransportError',
      status: null,
    });
  });

  it('honors a longer operation-specific deadline', async () => {
    const timeoutSpy = vi
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(new AbortController().signal);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 }),
    );

    await apiClient('/scans', { method: 'GET', timeoutMs: 30_000 });

    expect(timeoutSpy).toHaveBeenCalledWith(30_000);
  });

  it('preserves TanStack cancellation instead of exposing an error', async () => {
    const cancellation = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(
      new AbortController().signal,
    );
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) =>
      rejectWhenAborted(init?.signal),
    );
    const reason = new DOMException('Synthetic cancellation.', 'AbortError');

    const request = apiClient('/patients', {
      method: 'GET',
      signal: cancellation.signal,
    });
    cancellation.abort(reason);

    await expect(request).rejects.toBe(reason);
  });

  it('preserves cancellation while a JSON response body is being read', async () => {
    const cancellation = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(
      new AbortController().signal,
    );
    const readJson = vi.fn(() => rejectWhenAborted(cancellation.signal));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      headers: new Headers({ 'content-type': 'application/json' }),
      json: readJson,
      ok: true,
      status: 200,
    } as Response);
    const reason = new DOMException('Synthetic cancellation.', 'AbortError');

    const request = apiClient('/patients', {
      method: 'GET',
      signal: cancellation.signal,
    });
    await vi.waitFor(() => expect(readJson).toHaveBeenCalledOnce());
    cancellation.abort(reason);

    await expect(request).rejects.toBe(reason);
  });

  it('maps a browser network failure to the safe transport error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new TypeError('Synthetic network failure.'),
    );

    await expect(apiClient('/patients', { method: 'GET' })).rejects.toEqual(
      new ApiTransportError(null),
    );
  });
});
