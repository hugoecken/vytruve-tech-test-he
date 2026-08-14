import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  getAuthenticationFailureMessage,
  getAuthenticationFieldMessage,
  getPasswordFieldMessage,
} from '@/modules/auth/ui/authentication-form.helpers';
import { cacheAccountSession } from '@/modules/auth/api/session-cache';
import {
  SignUpFormSchema,
  type SignUpFormValues,
} from '@/modules/auth/forms/authentication.schemas';
import { useCreateAccount } from '@/shared/api/generated/client/authentication/authentication';
import { ApiProblemError } from '@/shared/api/http/api-error';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Spinner } from '@/shared/ui/spinner';

/** Props for the account-creation form. */
interface SignUpFormProps {
  redirect: string;
}

/**
 * Creates an account through the generated API mutation.
 *
 * @param props Safe destination restored after successful registration.
 * @returns The localized account-creation form.
 */
export function SignUpForm({ redirect }: SignUpFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<SignUpFormValues>({
    defaultValues: { confirmPassword: '', email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(SignUpFormSchema),
  });
  const mutation = useCreateAccount();

  const submit = form.handleSubmit(
    async (values) => {
      form.clearErrors('root');
      try {
        const response = await mutation.mutateAsync({
          data: { email: values.email, password: values.password },
        });
        cacheAccountSession(queryClient, response.data);
        await navigate({ href: redirect, replace: true });
      } catch (error) {
        let shouldFocus = true;
        if (error instanceof ApiProblemError) {
          for (const violation of error.problem.violations ?? []) {
            if (violation.field !== 'email' && violation.field !== 'password') {
              continue;
            }
            form.setError(
              violation.field,
              { message: violation.code, type: 'server' },
              { shouldFocus },
            );
            shouldFocus = false;
          }
        }
        if (shouldFocus) {
          form.setError('root', {
            message: getAuthenticationFailureMessage(error, t),
            type: 'server',
          });
        }
      }
    },
    () => form.clearErrors('root'),
  );

  const emailError = getAuthenticationFieldMessage(
    'email',
    form.formState.errors.email,
    t,
  );
  const passwordError = getPasswordFieldMessage(
    form.formState.errors.password,
    form.getValues('password'),
    'new',
    t,
  );
  const confirmationError = getAuthenticationFieldMessage(
    'confirmPassword',
    form.formState.errors.confirmPassword,
    t,
  );
  const pending = mutation.isPending;
  const formError = form.formState.errors.root?.message;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl leading-8 font-semibold">
          {t('auth.signUp.title')}
        </h1>
        <p className="text-sm leading-5 text-muted-foreground">
          {t('auth.signUp.description')}
        </p>
      </div>

      {formError !== undefined && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form noValidate onSubmit={submit}>
        <FieldGroup>
          <Field data-invalid={emailError !== undefined}>
            <FieldLabel htmlFor="sign-up-email">
              {t('auth.fields.email')}
            </FieldLabel>
            <Input
              {...form.register('email')}
              aria-invalid={emailError !== undefined}
              autoComplete="email"
              id="sign-up-email"
              inputMode="email"
              placeholder={t('auth.fields.emailPlaceholder')}
              type="email"
            />
            <FieldError>{emailError}</FieldError>
          </Field>

          <Field data-invalid={passwordError !== undefined}>
            <FieldLabel htmlFor="sign-up-password">
              {t('auth.fields.password')}
            </FieldLabel>
            <Input
              {...form.register('password')}
              aria-invalid={passwordError !== undefined}
              autoComplete="new-password"
              id="sign-up-password"
              placeholder={t('auth.fields.newPasswordPlaceholder')}
              type="password"
            />
            {passwordError === undefined ? (
              <FieldDescription>
                {t('auth.fields.passwordDescription')}
              </FieldDescription>
            ) : (
              <FieldError>{passwordError}</FieldError>
            )}
          </Field>

          <Field data-invalid={confirmationError !== undefined}>
            <FieldLabel htmlFor="sign-up-confirm-password">
              {t('auth.fields.confirmPassword')}
            </FieldLabel>
            <Input
              {...form.register('confirmPassword')}
              aria-invalid={confirmationError !== undefined}
              autoComplete="new-password"
              id="sign-up-confirm-password"
              placeholder={t('auth.fields.confirmPasswordPlaceholder')}
              type="password"
            />
            <FieldError>{confirmationError}</FieldError>
          </Field>

          <Button className="w-full" disabled={pending} type="submit">
            {pending && <Spinner aria-hidden="true" data-icon="inline-start" />}
            {pending ? t('auth.signUp.pending') : t('auth.signUp.submit')}
          </Button>

          <p className="text-sm text-primary">
            {t('auth.signUp.hasAccount')}{' '}
            <Link
              className="font-medium underline-offset-4 hover:underline"
              search={{ redirect }}
              to="/sign-in"
            >
              {t('auth.signUp.signIn')}
            </Link>
          </p>
        </FieldGroup>
      </form>
    </div>
  );
}
