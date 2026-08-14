import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { cacheAccountSession } from '@/modules/auth/api/session-cache';
import { routeTree } from '@/routeTree.gen';
import type { AccountSessionResponse } from '@/shared/api/generated/models/accountSessionResponse';

/** Render result paired with the isolated server-state owner used by the test. */
interface QueryRenderResult extends RenderResult {
  queryClient: QueryClient;
}

/** Options for rendering a real application route in memory. */
interface RouteRenderOptions {
  session?: AccountSessionResponse;
}

/** Render result paired with the isolated router and server-state owners. */
interface RouteRenderResult extends QueryRenderResult {
  router: ReturnType<typeof createTestRouter>;
}

/** Creates an isolated query client with deterministic retry behavior. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: Infinity },
    },
  });
}

/**
 * Renders one feature with an isolated TanStack Query client.
 *
 * @param children Component tree under test.
 * @param queryClient Optional client for cache assertions.
 * @returns Testing Library result and its server-state owner.
 */
export function renderWithQueryClient(
  children: ReactNode,
  queryClient = createTestQueryClient(),
): QueryRenderResult {
  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>,
    ),
    queryClient,
  };
}

/**
 * Renders a product route through the real route tree and guards.
 *
 * @param path Initial browser path, including optional search parameters.
 * @param options Optional authenticated session accepted before route loading.
 * @returns Testing Library result with the isolated router and query client.
 */
export function renderRoute(
  path: string,
  options: RouteRenderOptions = {},
): RouteRenderResult {
  const queryClient = createTestQueryClient();
  if (options.session !== undefined) {
    cacheAccountSession(queryClient, options.session);
  }
  const router = createTestRouter(path, queryClient);

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
    queryClient,
    router,
  };
}

/** Creates one memory router around the production route tree. */
function createTestRouter(path: string, queryClient: QueryClient) {
  return createRouter({
    context: { queryClient },
    defaultPreload: 'intent',
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree,
  });
}
