import type { ProblemDetailsResponse } from '@/shared/api/generated/models/problemDetailsResponse';

/** Runtime-validated Problem Details contract returned by the public API. */
export type ApiProblem = ProblemDetailsResponse;

/** Typed failure for a valid Problem Details response. */
export class ApiProblemError extends Error {
  /**
   * Creates a safe frontend error from a validated public problem.
   *
   * @param problem Public Problem Details payload without rejected values.
   */
  constructor(readonly problem: ApiProblem) {
    super('The API rejected the request.');
    this.name = 'ApiProblemError';
  }
}

/** Typed failure for network errors or non-conforming HTTP responses. */
export class ApiTransportError extends Error {
  /**
   * Creates a transport failure without retaining a raw browser exception.
   *
   * @param status HTTP status when a response was received, otherwise null.
   */
  constructor(readonly status: number | null) {
    super('The API could not be reached or returned an invalid response.');
    this.name = 'ApiTransportError';
  }
}

/**
 * Determines whether a failed query may be attempted once more.
 *
 * @param error Safe API error produced by the shared transport.
 * @returns Whether the failure is network-related or a server-side response.
 */
export function isRetryableApiError(error: unknown): boolean {
  if (error instanceof ApiProblemError) {
    return error.problem.status >= 500;
  }

  if (error instanceof ApiTransportError) {
    return error.status === null || error.status >= 500;
  }

  return false;
}
