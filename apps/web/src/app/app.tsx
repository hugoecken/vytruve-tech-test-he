import { QueryClientProvider } from '@tanstack/react-query';
import { SessionBoundary } from '@/modules/auth/ui/session-boundary';
import { queryClient } from '@/shared/query/query-client';

/**
 * Provides routing, server-state, and shared interaction contexts.
 *
 * @returns The application providers and active neutral route.
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBoundary />
    </QueryClientProvider>
  );
}

export default App;
