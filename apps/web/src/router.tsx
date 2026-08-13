import { createRouter } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { queryClient } from '@/shared/query/query-client';
import { routeTree } from './routeTree.gen';

/** Dependencies available to route guards and loaders. */
export interface RouterContext {
  queryClient: QueryClient;
}

/** File-based application router with the shared query boundary. */
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
