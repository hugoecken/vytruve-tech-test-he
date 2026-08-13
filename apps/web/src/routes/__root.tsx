import {
  createRootRouteWithContext,
  Outlet,
  type ErrorComponentProps,
} from '@tanstack/react-router';
import { getCachedAccountSession } from '@/modules/auth/api/session-cache';
import { NotFoundPage } from '@/shared/layout/not-found-page';
import { UnexpectedErrorPage } from '@/shared/layout/unexpected-error-page';
import type { RouterContext } from '../router';

/** Root route that provides only the file-routing composition boundary. */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootRouteComponent,
  errorComponent: RootErrorComponent,
  notFoundComponent: RootNotFoundComponent,
});

/**
 * Renders the active child route without introducing product layout.
 *
 * @returns The active file-route outlet.
 */
function RootRouteComponent(): React.JSX.Element {
  return <Outlet />;
}

/**
 * Selects the public or authenticated fallback from the restored session.
 *
 * @returns The route fallback appropriate to the current session.
 */
function RootNotFoundComponent(): React.JSX.Element {
  const { queryClient } = Route.useRouteContext();
  return (
    <NotFoundPage
      authenticated={getCachedAccountSession(queryClient) !== null}
    />
  );
}

/**
 * Recovers from an unexpected route or rendering failure without exposing it.
 *
 * @param props TanStack Router recovery callback.
 * @returns The generic system fallback.
 */
function RootErrorComponent({ reset }: ErrorComponentProps): React.JSX.Element {
  return <UnexpectedErrorPage onRetry={reset} />;
}
