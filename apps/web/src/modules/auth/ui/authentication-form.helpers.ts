import type { FieldError as ReactHookFormFieldError } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { FieldViolationCode } from '@/shared/api/generated/models/fieldViolationCode';
import {
  ApiProblemError,
  ApiTransportError,
} from '@/shared/api/http/api-error';

/**
 * Resolves a client validation error without displaying Zod's raw message.
 *
 * @param field Authentication field represented by the control.
 * @param error React Hook Form error produced by the Zod resolver.
 * @param t Active i18next translator.
 * @returns A localized, user-facing validation message.
 */
export function getAuthenticationFieldMessage(
  field: 'confirmPassword' | 'email',
  error: ReactHookFormFieldError | undefined,
  t: TFunction,
): string | undefined {
  if (error === undefined) {
    return undefined;
  }

  const violationCode = Object.values(FieldViolationCode).find(
    (code) => code === error.message,
  );
  if (violationCode !== undefined) {
    return t(`errors.validation.${violationCode}`);
  }

  if (field === 'email') {
    return t('auth.validation.email');
  }
  if (field === 'confirmPassword') {
    return t('auth.validation.passwordConfirmation');
  }
  return undefined;
}

/**
 * Resolves a password validation error according to its form purpose.
 *
 * @param error React Hook Form error produced by local or server validation.
 * @param value Current password value used only to distinguish an empty field.
 * @param purpose Whether the field authenticates or creates a password.
 * @param t Active i18next translator.
 * @returns A localized message without exposing the account password policy on sign-in.
 */
export function getPasswordFieldMessage(
  error: ReactHookFormFieldError | undefined,
  value: string,
  purpose: 'current' | 'new',
  t: TFunction,
): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  if (value.length === 0) {
    return t('auth.validation.passwordRequired');
  }
  return purpose === 'new'
    ? t('auth.validation.passwordLength')
    : t('auth.validation.passwordInvalid');
}

/**
 * Resolves a safe form-level API failure to localized copy.
 *
 * @param error Safe error produced by the API boundary.
 * @param t Active i18next translator.
 * @returns A localized message that never includes Backend detail text.
 */
export function getAuthenticationFailureMessage(
  error: unknown,
  t: TFunction,
): string {
  if (error instanceof ApiProblemError) {
    return t(`errors.problem.${error.problem.code}`);
  }
  if (error instanceof ApiTransportError) {
    return t('errors.network');
  }
  return t('errors.unexpected');
}
