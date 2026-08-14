import { FolderXIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/empty';

/** Props for a blocking collection load failure. */
interface CollectionLoadErrorProps {
  description: string;
  onRetry: () => void;
  pending?: boolean;
  retryLabel: string;
  title: string;
}

/**
 * Replaces a collection when its current query has no data to display.
 *
 * @param props Localized failure content and retry action.
 * @returns A blocking, keyboard-accessible recovery state.
 */
export function CollectionLoadError({
  description,
  onRetry,
  pending = false,
  retryLabel,
  title,
}: CollectionLoadErrorProps) {
  return (
    <Empty className="min-h-72 rounded-xl border bg-card" role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderXIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button disabled={pending} onClick={onRetry} type="button">
          {retryLabel}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
