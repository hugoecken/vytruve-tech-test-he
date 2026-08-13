import { createFileRoute, redirect } from '@tanstack/react-router';
import { getCachedAccountSession } from '@/modules/auth/api/session-cache';
import { toSafeRedirect } from '@/modules/auth/navigation/safe-redirect';
import { AuthenticationLayout } from '@/modules/auth/ui/authentication-layout';
import { SignInForm } from '@/modules/auth/ui/sign-in-form';

/** Search values accepted by public authentication routes. */
interface AuthenticationSearch {
  redirect: string;
}

/** Public sign-in route with safe post-authentication redirection. */
export const Route = createFileRoute('/sign-in')({
  validateSearch: (search: Record<string, unknown>): AuthenticationSearch => ({
    redirect: toSafeRedirect(search.redirect),
  }),
  beforeLoad: ({ context }) => {
    if (getCachedAccountSession(context.queryClient) !== null) {
      throw redirect({ to: '/patients' });
    }
  },
  component: SignInRouteComponent,
});

/**
 * Composes the canonical account-access layout and sign-in form.
 *
 * @returns The public sign-in screen.
 */
function SignInRouteComponent(): React.JSX.Element {
  const { redirect } = Route.useSearch();
  return (
    <AuthenticationLayout>
      <SignInForm redirect={redirect} />
    </AuthenticationLayout>
  );
}
