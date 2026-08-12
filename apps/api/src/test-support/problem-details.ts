import type { ProblemCode } from '@api/http/problem-code';
import { ProblemDetailsException } from '@api/http/problem-details.exception';

/**
 * Resolves one supported application failure and verifies its public contract.
 *
 * @param operation Application operation expected to reject.
 * @param code Stable public error code owned by the failing boundary.
 * @param status Expected HTTP status exposed by the failing boundary.
 * @returns The verified Problem Details exception for additional assertions.
 */
export async function expectProblemDetails(
  operation: Promise<unknown>,
  code: ProblemCode,
  status: number,
): Promise<ProblemDetailsException> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemDetailsException);
    const problem = error as ProblemDetailsException;
    expect(problem.getProblemDetails()).toMatchObject({ code, status });
    return problem;
  }
  throw new Error(`Expected operation to reject with ${code}`);
}
