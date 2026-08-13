import type { FieldViolationCode } from '@/shared/api/generated/models/fieldViolationCode';
import type { ProblemCode } from '@/shared/api/generated/models/problemCode';
import {
  ApiProblemError,
  ApiTransportError,
} from '@/shared/api/http/api-error';

/** Authentication fields that may receive a public Backend violation. */
export type AuthenticationField = 'email' | 'password';

/** One field violation safe to expose through an authentication form. */
interface AuthenticationFieldViolation {
  code: FieldViolationCode;
  field: AuthenticationField;
}

/** Safe form failure derived from a typed public API error. */
export interface AuthenticationFormFailure {
  fieldViolations: AuthenticationFieldViolation[];
  problemCode?: ProblemCode;
  transportFailure: boolean;
}

/**
 * Maps an authentication request error without exposing Backend detail text.
 *
 * @param error Safe error emitted by the generated API boundary.
 * @returns Stable problem and field codes suitable for localization.
 */
export function toAuthenticationFormFailure(
  error: unknown,
): AuthenticationFormFailure {
  if (error instanceof ApiProblemError) {
    const fieldViolations: AuthenticationFieldViolation[] = [];
    for (const violation of error.problem.violations ?? []) {
      if (violation.field === 'email' || violation.field === 'password') {
        fieldViolations.push({
          code: violation.code,
          field: violation.field,
        });
      }
    }

    return {
      fieldViolations,
      problemCode: error.problem.code,
      transportFailure: false,
    };
  }

  return {
    fieldViolations: [],
    transportFailure: error instanceof ApiTransportError,
  };
}
