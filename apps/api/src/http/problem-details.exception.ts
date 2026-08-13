import { HttpException } from '@nestjs/common';
import type { ProblemCode } from './problem-code';
import type {
  FieldViolation,
  ProblemDetailsDefinition,
} from './problem-details.model';

/** Parameters required to create one supported public problem response. */
interface ProblemDetailsParameters {
  code: ProblemCode;
  detail: string;
  status: number;
  title: string;
  violations?: FieldViolation[];
}

/** Carries a safe, stable RFC 9457 problem from application code to HTTP. */
export class ProblemDetailsException extends HttpException {
  private readonly problem: ProblemDetailsDefinition;

  /**
   * Creates a public problem without request-specific or sensitive values.
   *
   * @param parameters Stable error metadata owned by the failing boundary.
   */
  constructor(parameters: ProblemDetailsParameters) {
    const problem: ProblemDetailsDefinition = {
      code: parameters.code,
      detail: parameters.detail,
      status: parameters.status,
      title: parameters.title,
      type: 'about:blank',
      ...(parameters.violations === undefined
        ? {}
        : { violations: parameters.violations }),
    };
    super(problem, parameters.status);
    this.problem = problem;
  }

  /** @returns The safe problem payload before its request instance is attached. */
  getProblemDetails(): ProblemDetailsDefinition {
    return this.problem;
  }
}
