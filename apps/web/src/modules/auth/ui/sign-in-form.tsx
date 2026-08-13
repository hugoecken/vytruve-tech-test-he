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
import { toAuthenticationFormFailure } from '@/modules/auth/forms/authentication-error.mapper';
import {
  SignInFormSchema,
  type SignInFormValues,
} from '@/modules/auth/forms/authentication.schemas';
import { useCreateSession } from '@/shared/api/generated/client/authentication/authentication';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Spinner } from '@/shared/ui/spinner';

/** Props for the sign-in form. */
interface SignInFormProps {
  redirect: string;
}

/**
 * Authenticates an account through the generated API mutation.
 *
 * @param props Safe destination restored after successful authentication.
 * @returns The localized sign-in form.
 */
export function SignInForm({ redirect }: SignInFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<SignInFormValues>({
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(SignInFormSchema),
  });
  const mutation = useCreateSession();

  const submit = form.handleSubmit(
    async (values) => {
      form.clearErrors('root');
      try {
        const response = await mutation.mutateAsync({ data: values });
        cacheAccountSession(queryClient, response.data);
        await navigate({ href: redirect, replace: true });
      } catch (error) {
        const failure = toAuthenticationFormFailure(error);
        let shouldFocus = true;
        for (const { code, field } of failure.fieldViolations) {
          form.setError(
            field,
            { message: code, type: 'server' },
            { shouldFocus },
          );
          shouldFocus = false;
        }
        if (shouldFocus) {
          form.setError('root', {
            message: getAuthenticationFailureMessage(failure, t),
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
    'current',
    t,
  );
  const pending = mutation.isPending;
  const formError = form.formState.errors.root?.message;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl leading-8 font-semibold">
          {t('auth.signIn.title')}
        </h1>
        <p className="text-sm leading-5 text-muted-foreground">
          {t('auth.signIn.description')}
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
            <FieldLabel htmlFor="sign-in-email">
              {t('auth.fields.email')}
            </FieldLabel>
            <Input
              {...form.register('email')}
              aria-invalid={emailError !== undefined}
              autoComplete="email"
              id="sign-in-email"
              inputMode="email"
              placeholder={t('auth.fields.emailPlaceholder')}
              type="email"
            />
            <FieldError>{emailError}</FieldError>
          </Field>

          <Field data-invalid={passwordError !== undefined}>
            <FieldLabel htmlFor="sign-in-password">
              {t('auth.fields.password')}
            </FieldLabel>
            <Input
              {...form.register('password')}
              aria-invalid={passwordError !== undefined}
              autoComplete="current-password"
              id="sign-in-password"
              placeholder={t('auth.fields.passwordPlaceholder')}
              type="password"
            />
            <FieldError>{passwordError}</FieldError>
          </Field>

          <Button className="w-full" disabled={pending} type="submit">
            {pending && <Spinner aria-hidden="true" data-icon="inline-start" />}
            {pending ? t('auth.signIn.pending') : t('auth.signIn.submit')}
          </Button>

          <p className="text-sm text-primary">
            {t('auth.signIn.noAccount')}{' '}
            <Link
              className="font-medium underline-offset-4 hover:underline"
              search={{ redirect }}
              to="/sign-up"
            >
              {t('auth.signIn.createAccount')}
            </Link>
          </p>
        </FieldGroup>
      </form>
    </div>
  );
}
