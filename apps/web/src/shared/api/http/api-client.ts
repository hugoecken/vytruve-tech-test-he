import { browserEnvironment } from '@/shared/config/browser-environment';
import { ApiProblemError, ApiTransportError } from './api-error';
import { toApiProblem } from './problem-details.mapper';

const DEFAULT_API_REQUEST_TIMEOUT_MS = 15_000;

/** Fetch options with an application-owned finite request deadline. */
export interface ApiRequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Error exposed by every generated query and mutation hook.
 *
 * @typeParam TProblem Error schema supplied by Orval at generation time. The
 * runtime boundary normalizes every public API problem to `ApiProblemError`.
 */
// Orval requires its custom error alias to accept the generated schema type.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type ErrorType<TProblem> = ApiProblemError | ApiTransportError;

/**
 * Executes one generated request through the browser-safe HTTP boundary.
 *
 * @param path Relative or API-rooted URL emitted from OpenAPI.
 * @param options Fetch options emitted by Orval, including cancellation.
 * @returns Orval's typed response envelope containing data, status and headers.
 * @throws {ApiProblemError} When the API returns valid Problem Details.
 * @throws {ApiTransportError} When transport or response parsing fails safely.
 */
export async function apiClient<T>(
  path: string,
  options: ApiRequestOptions,
): Promise<T> {
  const {
    signal: cancellationSignal,
    timeoutMs = DEFAULT_API_REQUEST_TIMEOUT_MS,
    ...requestOptions
  } = options;
  const headers = new Headers(requestOptions.headers);
  if (requestOptions.body instanceof FormData) {
    headers.delete('content-type');
  }
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal =
    cancellationSignal === null || cancellationSignal === undefined
      ? timeoutSignal
      : AbortSignal.any([cancellationSignal, timeoutSignal]);

  let response: Response;
  let content: unknown;
  try {
    response = await fetch(new URL(path, `${browserEnvironment.apiBaseUrl}/`), {
      ...requestOptions,
      credentials: 'include',
      headers,
      signal,
    });
    content = await readResponseContent(response);
  } catch (error) {
    if (error instanceof ApiTransportError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiTransportError(null);
  }

  if (!response.ok) {
    const problem = toApiProblem(content);
    if (problem !== null) {
      throw new ApiProblemError(problem);
    }
    throw new ApiTransportError(response.status);
  }

  return {
    data: content,
    headers: response.headers,
    status: response.status,
  } as T;
}

/**
 * Reads a response according to its status and declared media type.
 *
 * @param response Fetch response returned by the API.
 * @returns Parsed JSON, a Blob, or undefined for an empty response.
 * @throws {ApiTransportError} When a declared JSON response is malformed.
 */
async function readResponseContent(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) {
    try {
      return await response.json();
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'AbortError' || error.name === 'TimeoutError')
      ) {
        throw error;
      }
      throw new ApiTransportError(response.status);
    }
  }

  if (contentType.length === 0) {
    return undefined;
  }

  return response.blob();
}
