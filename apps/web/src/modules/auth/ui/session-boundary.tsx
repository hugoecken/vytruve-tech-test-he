import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { CircleAlertIcon } from 'lucide-react';
import { router } from '@/router';
import { clearAccountState } from '@/modules/auth/api/session-cache';
import { toSafeRedirect } from '@/modules/auth/navigation/safe-redirect';
import { useGetSession } from '@/shared/api/generated/client/authentication/authentication';
import type { AccountSessionResponse } from '@/shared/api/generated/models/accountSessionResponse';
import { ApiProblemError } from '@/shared/api/http/api-error';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

/**
 * Restores the cookie-backed session before mounting route guards.
 *
 * @returns The router with a resolved session, or a focused restoration state.
 */
export function SessionBoundary(): React.JSX.Element {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const query = useGetSession({
    query: {
      retry: false,
      staleTime: 60_000,
    },
  });
  const authenticationRequired =
    query.error instanceof ApiProblemError &&
    query.error.problem.status === 401;
  const session = authenticationRequired ? null : (query.data?.data ?? null);

  useSessionExpiration(queryClient, session);

  if (query.isPending) {
    return (
      <main
        aria-label={t('auth.session.restoring')}
        className="grid min-h-svh place-items-center bg-background"
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner aria-hidden="true" />
          <span>{t('auth.session.restoring')}</span>
        </div>
      </main>
    );
  }

  if (query.isError && !authenticationRequired) {
    return (
      <main className="grid min-h-svh place-items-center bg-background px-4">
        <Alert className="max-w-md" variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>{t('auth.session.restoreFailedTitle')}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-4">
            <span>{t('auth.session.restoreFailedDescription')}</span>
            <Button onClick={() => void query.refetch()} variant="outline">
              {t('common.actions.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  return <RouterProvider router={router} />;
}

/**
 * Clears an expired session and preserves only the current internal destination.
 *
 * @param queryClient Query client that owns the account-scoped cache.
 * @param session Session currently owned by the session query.
 */
function useSessionExpiration(
  queryClient: QueryClient,
  session: AccountSessionResponse | null,
): void {
  useEffect(() => {
    if (session === null) {
      return;
    }

    const delay = new Date(session.expiresAt).getTime() - Date.now();
    const expire = (): void => {
      clearAccountState(queryClient);
      const redirect = toSafeRedirect(router.state.location.href);
      void router.navigate({
        replace: true,
        search: { redirect },
        to: '/sign-in',
      });
    };

    if (delay <= 0) {
      expire();
      return;
    }

    const timer = window.setTimeout(expire, delay);
    return () => window.clearTimeout(timer);
  }, [queryClient, session]);
}
