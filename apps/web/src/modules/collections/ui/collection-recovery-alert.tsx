import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

/** Props for a failed refresh that preserves TanStack-retained rows. */
interface CollectionRecoveryAlertProps {
  description: string;
  onRetry: () => void;
  pending?: boolean;
  retryLabel: string;
  title: string;
}

/**
 * Reports a background refresh failure without removing retained rows.
 *
 * @param props Localized failure content and retry action.
 * @returns A destructive alert with an integrated icon-only refresh button.
 */
export function CollectionRecoveryAlert({
  description,
  onRetry,
  pending = false,
  retryLabel,
  title,
}: CollectionRecoveryAlertProps) {
  return (
    <Alert className="min-h-14 pr-16 sm:pr-18" variant="destructive">
      <CircleAlertIcon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
      <AlertAction className="top-1/2 -translate-y-1/2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={retryLabel}
                disabled={pending}
                onClick={onRetry}
                size="icon-lg"
                type="button"
                variant="ghost"
              />
            }
          >
            <RefreshCwIcon
              aria-hidden="true"
              className={pending ? 'animate-spin' : undefined}
            />
          </TooltipTrigger>
          <TooltipContent>{retryLabel}</TooltipContent>
        </Tooltip>
      </AlertAction>
    </Alert>
  );
}
