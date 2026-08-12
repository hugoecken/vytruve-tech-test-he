/** Stable field-level validation codes exposed by the public API. */
export const FieldViolationCode = {
  EMAIL_INVALID: 'EMAIL_INVALID',
  INTEGER_REQUIRED: 'INTEGER_REQUIRED',
  INVALID: 'INVALID',
  LENGTH_INVALID: 'LENGTH_INVALID',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  REQUIRED: 'REQUIRED',
  STRING_REQUIRED: 'STRING_REQUIRED',
  TOO_LONG: 'TOO_LONG',
  TOO_SHORT: 'TOO_SHORT',
  UNKNOWN_FIELD: 'UNKNOWN_FIELD',
  UUID_INVALID: 'UUID_INVALID',
} as const;

/** Union of stable field-level validation codes. */
export type FieldViolationCode =
  (typeof FieldViolationCode)[keyof typeof FieldViolationCode];
