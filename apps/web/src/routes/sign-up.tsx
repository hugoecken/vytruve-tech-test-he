import { createFileRoute, redirect } from '@tanstack/react-router';
import { getCachedAccountSession } from '@/modules/auth/api/session-cache';
import { toSafeRedirect } from '@/modules/auth/navigation/safe-redirect';
import { AuthenticationLayout } from '@/modules/auth/ui/authentication-layout';
import { SignUpForm } from '@/modules/auth/ui/sign-up-form';

/** Search values accepted by public authentication routes. */
interface AuthenticationSearch {
  redirect: string;
}

/** Public account-creation route with safe post-authentication redirection. */
export const Route = createFileRoute('/sign-up')({
  validateSearch: (search: Record<string, unknown>): AuthenticationSearch => ({
    redirect: toSafeRedirect(search.redirect),
  }),
  beforeLoad: ({ context }) => {
    if (getCachedAccountSession(context.queryClient) !== null) {
      throw redirect({ to: '/patients' });
    }
  },
  component: SignUpRouteComponent,
});

/**
 * Composes the canonical account-access layout and registration form.
 *
 * @returns The public account-creation screen.
 */
function SignUpRouteComponent(): React.JSX.Element {
  const { redirect } = Route.useSearch();
  return (
    <AuthenticationLayout>
      <SignUpForm redirect={redirect} />
    </AuthenticationLayout>
  );
}
