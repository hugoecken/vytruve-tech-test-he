import { Button } from '@/shared/ui/button';

/** Props for the visual surface and controls around a feature-owned table. */
interface CollectionTableShellProps {
  children: React.ReactNode;
  hasNext: boolean;
  nextLabel: string;
  onNext: () => void;
  onPrevious: () => void;
  page: number;
  pageLabel: string;
  pending?: boolean;
  previousLabel: string;
}

/**
 * Provides only the shared table surface and server-page controls.
 *
 * @param props Feature-owned table content and confirmed pagination state.
 * @returns A bordered collection surface with Previous/Page/Next controls.
 */
export function CollectionTableShell({
  children,
  hasNext,
  nextLabel,
  onNext,
  onPrevious,
  page,
  pageLabel,
  pending = false,
  previousLabel,
}: CollectionTableShellProps): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {children}
      <div className="flex h-18 items-center justify-center gap-3 border-t px-2 sm:justify-end">
        <Button
          className="h-9"
          disabled={page === 0 || pending}
          onClick={onPrevious}
          type="button"
          variant="outline"
        >
          {previousLabel}
        </Button>
        <span aria-live="polite" className="min-w-14 text-center text-sm">
          {pageLabel}
        </span>
        <Button
          className="h-9"
          disabled={!hasNext || pending}
          onClick={onNext}
          type="button"
          variant="outline"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
