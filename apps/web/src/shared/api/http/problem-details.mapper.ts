import { FieldViolationCode } from '@/shared/api/generated/models/fieldViolationCode';
import type { FieldViolationResponse } from '@/shared/api/generated/models/fieldViolationResponse';
import { ProblemCode } from '@/shared/api/generated/models/problemCode';
import type { ApiProblem } from './api-error';

/**
 * Maps an untrusted response body to the safe public Problem Details contract.
 *
 * @param value Untrusted response body.
 * @returns A typed API problem, or null when the response is not conforming.
 */
export function toApiProblem(value: unknown): ApiProblem | null {
  if (!isRecord(value)) {
    return null;
  }

  const { type, title, status, detail, instance, code, violations } = value;
  const problemCode = Object.values(ProblemCode).find(
    (knownCode) => knownCode === code,
  );
  if (
    typeof type !== 'string' ||
    typeof title !== 'string' ||
    typeof status !== 'number' ||
    typeof detail !== 'string' ||
    typeof instance !== 'string' ||
    problemCode === undefined
  ) {
    return null;
  }

  const parsedViolations = toFieldViolations(violations);
  if (parsedViolations === null) {
    return null;
  }

  return {
    type,
    title,
    status,
    detail,
    instance,
    code: problemCode,
    ...(parsedViolations === undefined ? {} : { violations: parsedViolations }),
  };
}

/**
 * Maps optional untrusted violations without retaining rejected values.
 *
 * @param value Untrusted violations member.
 * @returns Safe violations, undefined when absent, or null when malformed.
 */
function toFieldViolations(
  value: unknown,
): FieldViolationResponse[] | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return null;
  }

  const violations: FieldViolationResponse[] = [];
  for (const violation of value) {
    if (
      !isRecord(violation) ||
      typeof violation.field !== 'string' ||
      typeof violation.code !== 'string'
    ) {
      return null;
    }

    const violationCode = Object.values(FieldViolationCode).find(
      (knownCode) => knownCode === violation.code,
    );
    if (violationCode === undefined) {
      return null;
    }

    violations.push({ field: violation.field, code: violationCode });
  }
  return violations;
}

/**
 * Narrows an untrusted JSON value to a string-keyed record.
 *
 * @param value Untrusted value read from the response.
 * @returns Whether the value can be inspected as a record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
