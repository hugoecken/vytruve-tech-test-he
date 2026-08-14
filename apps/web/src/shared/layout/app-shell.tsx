import { AppHeader } from '@/shared/layout/app-header';

/** Props for the authenticated application shell. */
interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Provides the durable authenticated header and content boundary.
 *
 * @param props Active protected route content.
 * @returns The responsive authenticated shell.
 */
export function AppShell({ children }: AppShellProps): React.JSX.Element {
  return (
    <div className="min-h-svh bg-secondary">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1248px] px-4 py-12 sm:px-6">
        {children}
      </main>
    </div>
  );
}
