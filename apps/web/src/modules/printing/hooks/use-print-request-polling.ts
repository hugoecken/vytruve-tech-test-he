import * as React from 'react';

const PRINT_REFRESH_INTERVAL_MS = 5_000;
const PRINT_REFRESH_WINDOW_MS = 5 * 60_000;

/** Options for the bounded print-request refresh lifecycle. */
interface PrintRequestPollingOptions {
  enabled: boolean;
  onRefresh: () => void;
  restartKey: string | null;
}

/** State exposed by the bounded print-request refresh lifecycle. */
interface PrintRequestPollingState {
  expired: boolean;
  restart: () => void;
}

/**
 * Refreshes active print requests only during visible, bounded viewing time.
 *
 * @param options Feature-owned eligibility, refresh action and restart key.
 * @returns Whether manual refresh is required and an explicit restart action.
 */
export function usePrintRequestPolling({
  enabled,
  onRefresh,
  restartKey,
}: PrintRequestPollingOptions): PrintRequestPollingState {
  const [documentVisible, setDocumentVisible] = React.useState(
    () => document.visibilityState === 'visible',
  );
  const [expired, setExpired] = React.useState(false);
  const elapsedRef = React.useRef(0);
  const segmentStartedAtRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    /** Mirrors the browser visibility state into React state. */
    const updateVisibility = (): void => {
      setDocumentVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', updateVisibility);
    return () =>
      document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  /** Starts a fresh five-minute visible polling window. */
  const restart = React.useCallback((): void => {
    elapsedRef.current = 0;
    segmentStartedAtRef.current = null;
    setExpired(false);
  }, []);

  React.useEffect(() => {
    restart();
  }, [restart, restartKey]);

  React.useEffect(() => {
    if (!enabled || !documentVisible || expired) {
      return;
    }

    const startedAt = Date.now();
    const remaining = Math.max(PRINT_REFRESH_WINDOW_MS - elapsedRef.current, 0);
    segmentStartedAtRef.current = startedAt;

    const interval = window.setInterval(onRefresh, PRINT_REFRESH_INTERVAL_MS);
    const timeout = window.setTimeout(() => {
      elapsedRef.current = PRINT_REFRESH_WINDOW_MS;
      segmentStartedAtRef.current = null;
      setExpired(true);
    }, remaining);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
      if (segmentStartedAtRef.current === startedAt) {
        elapsedRef.current = Math.min(
          elapsedRef.current + Date.now() - startedAt,
          PRINT_REFRESH_WINDOW_MS,
        );
        segmentStartedAtRef.current = null;
      }
    };
  }, [documentVisible, enabled, expired, onRefresh, restartKey]);

  return { expired, restart };
}
