import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from '@/shared/query/query-client';
import { router } from '../router';

/**
 * Provides routing, server-state, and shared interaction contexts.
 *
 * @returns The application providers and active neutral route.
 */
export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;
