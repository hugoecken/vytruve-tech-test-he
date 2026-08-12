import type { ProblemCode } from './problem-code';

/** One safe field-level validation failure without the rejected value. */
export interface FieldViolation {
  code: string;
  field: string;
}

/** RFC 9457 payload used at every public API error boundary. */
export interface ProblemDetails {
  code: ProblemCode;
  detail: string;
  instance?: string;
  status: number;
  title: string;
  type: string;
  violations?: FieldViolation[];
}
