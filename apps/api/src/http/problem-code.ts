/** Stable machine-readable error codes exposed by the current API slice. */
export const ProblemCode = {
  ACCOUNT_ALREADY_EXISTS: 'ACCOUNT_ALREADY_EXISTS',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  AUTH_RATE_LIMITED: 'AUTH_RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_CURSOR: 'INVALID_CURSOR',
  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;

/** Union of stable problem codes derived from the canonical value map. */
export type ProblemCode = (typeof ProblemCode)[keyof typeof ProblemCode];
