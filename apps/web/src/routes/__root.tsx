import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { RouterContext } from '../router';

/** Root route that provides only the file-routing composition boundary. */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootRouteComponent,
});

/**
 * Renders the active child route without introducing product layout.
 *
 * @returns The active file-route outlet.
 */
function RootRouteComponent(): React.JSX.Element {
  return <Outlet />;
}
