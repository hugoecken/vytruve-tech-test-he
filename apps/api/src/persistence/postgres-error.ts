import { QueryFailedError } from 'typeorm';

/**
 * Recognizes one named PostgreSQL unique constraint without matching driver messages.
 *
 * @param error Unknown persistence failure.
 * @param constraint Expected database constraint name.
 * @returns Whether PostgreSQL reported the expected uniqueness violation.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505' &&
    'constraint' in driverError &&
    driverError.constraint === constraint
  );
}
