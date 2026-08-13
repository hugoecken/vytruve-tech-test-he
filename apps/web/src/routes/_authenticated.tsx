import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { getCachedAccountSession } from '@/modules/auth/api/session-cache';
import { toSafeRedirect } from '@/modules/auth/navigation/safe-redirect';
import { AppShell } from '@/shared/layout/app-shell';

/** Pathless protected layout for authenticated product destinations. */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    const session = getCachedAccountSession(context.queryClient);
    if (session === null) {
      throw redirect({
        search: { redirect: toSafeRedirect(location.href) },
        to: '/sign-in',
      });
    }
  },
  component: AuthenticatedLayoutComponent,
});

/**
 * Renders protected route content within the canonical application shell.
 *
 * @returns The authenticated shell and active child route.
 */
function AuthenticatedLayoutComponent(): React.JSX.Element {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
