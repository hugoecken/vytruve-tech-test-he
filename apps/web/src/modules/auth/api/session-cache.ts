import type { QueryClient } from '@tanstack/react-query';
import type { AccountSessionResponse } from '@/shared/api/generated/models/accountSessionResponse';
import {
  getGetSessionQueryKey,
  type GetSessionQueryResult,
} from '@/shared/api/generated/client/authentication/authentication';

/**
 * Reads the account session already accepted by TanStack Query.
 *
 * @param queryClient Shared TanStack Query client.
 * @returns The cached session, or `null` when no session is available.
 */
export function getCachedAccountSession(
  queryClient: QueryClient,
): AccountSessionResponse | null {
  const queryKey = getGetSessionQueryKey();
  if (queryClient.getQueryState(queryKey)?.status !== 'success') {
    return null;
  }

  return (
    queryClient.getQueryData<GetSessionQueryResult>(queryKey)?.data ?? null
  );
}

/**
 * Stores an accepted account session in the canonical session query.
 *
 * @param queryClient Shared TanStack Query client.
 * @param session Session returned by account creation or sign-in.
 */
export function cacheAccountSession(
  queryClient: QueryClient,
  session: AccountSessionResponse,
): void {
  queryClient.setQueryData(getGetSessionQueryKey(), {
    data: session,
    headers: new Headers(),
    status: 200 as const,
  });
}

/**
 * Removes all account-scoped server and mutation state.
 *
 * @param queryClient Shared TanStack Query client.
 */
export function clearAccountState(queryClient: QueryClient): void {
  queryClient.clear();
}
