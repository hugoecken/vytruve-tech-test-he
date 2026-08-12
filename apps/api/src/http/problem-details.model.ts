import type { FieldViolationCode } from './field-violation-code';
import type { ProblemCode } from './problem-code';

/** One safe field-level validation failure without the rejected value. */
export interface FieldViolation {
  code: FieldViolationCode;
  field: string;
}

/** Safe problem metadata produced before request-specific HTTP context exists. */
export interface ProblemDetailsDefinition {
  code: ProblemCode;
  detail: string;
  status: number;
  title: string;
  type: string;
  violations?: FieldViolation[];
}

/** Complete RFC 9457 payload returned by the public HTTP boundary. */
export interface ProblemDetails extends ProblemDetailsDefinition {
  instance: string;
}
