import * as zod from 'zod/mini';
import {
  CreateAccountBody,
  CreateSessionBody,
} from '@/shared/api/generated/validation/authentication/authentication.zod';

const MIN_PASSWORD_GRAPHEMES = 12;
const MAX_PASSWORD_GRAPHEMES = 128;
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const signUpPassword = CreateAccountBody.shape.password.check(
  zod.refine(hasValidPasswordLength),
);

/** Runtime form schema derived from the generated sign-in contract. */
export const SignInFormSchema = CreateSessionBody;

/** Runtime form schema derived from the generated account contract. */
export const SignUpFormSchema = zod
  .extend(CreateAccountBody, {
    confirmPassword: zod.string().check(zod.minLength(1)),
    password: signUpPassword,
  })
  .check(
    zod.refine((value) => value.password === value.confirmPassword, {
      path: ['confirmPassword'],
    }),
  );

/** Values accepted by the sign-in form. */
export type SignInFormValues = zod.infer<typeof SignInFormSchema>;

/** Values accepted by the account-creation form. */
export type SignUpFormValues = zod.infer<typeof SignUpFormSchema>;

/**
 * Checks the password policy using user-perceived characters.
 *
 * @param password Password value from the generated request schema.
 * @returns Whether its grapheme count satisfies the API invariant.
 */
function hasValidPasswordLength(password: string): boolean {
  const length = [...segmenter.segment(password)].length;
  return length >= MIN_PASSWORD_GRAPHEMES && length <= MAX_PASSWORD_GRAPHEMES;
}
