import { QueryClient } from '@tanstack/react-query';
import { isRetryableApiError } from '@/shared/api/http/api-error';

/** Shared TanStack Query client for all future server state. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        failureCount < 1 && isRetryableApiError(error),
    },
    mutations: {
      retry: false,
    },
  },
});
