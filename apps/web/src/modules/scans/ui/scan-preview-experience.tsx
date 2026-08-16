import { useCallback, useRef, useState } from 'react';
import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createScanPreviewRenderer,
  type ScanPreviewRenderer,
} from '@/modules/scans/lib/scan-preview-renderer';
import { ScanPreviewToolbar } from '@/modules/scans/ui/scan-preview-toolbar';
import { useDownloadPatientScan } from '@/shared/api/generated/client/scans/scans';
import { Button } from '@/shared/ui/button';
import { Spinner } from '@/shared/ui/spinner';

/** Identifies the owned scan consumed by one preview session. */
interface ScanPreviewExperienceProps {
  patientId: string;
  scanId: string;
}

/** Represents local renderer preparation independently from query status. */
type PreparationState = 'preparing' | 'ready' | 'unavailable';

/** Owns one automatically started authenticated preview session and renderer. */
export function ScanPreviewExperience({
  patientId,
  scanId,
}: ScanPreviewExperienceProps) {
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(1);
  const [preparation, setPreparation] = useState<PreparationState>('preparing');
  const rendererRef = useRef<ScanPreviewRenderer | null>(null);
  const query = useDownloadPatientScan(patientId, scanId, {
    query: {
      enabled: true,
      gcTime: 0,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: false,
      select: (response) => response.data,
    },
  });
  const content = query.data;
  const unavailable = query.isError || preparation === 'unavailable';
  const onReady = useCallback(() => setPreparation('ready'), []);
  const onUnavailable = useCallback(() => setPreparation('unavailable'), []);
  const containerRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (container === null || content === undefined) return;
      let active = true;
      let renderer: ScanPreviewRenderer | null = null;
      void content
        .arrayBuffer()
        .then((data) => {
          if (!active) return;
          renderer = createScanPreviewRenderer({
            container,
            data,
            onReady,
            onUnavailable,
          });
          if (!active) {
            renderer?.dispose();
            return;
          }
          rendererRef.current = renderer;
        })
        .catch(() => {
          if (active) onUnavailable();
        });
      return () => {
        active = false;
        renderer?.dispose();
        if (rendererRef.current === renderer) rendererRef.current = null;
      };
    },
    [content, onReady, onUnavailable],
  );

  /** Starts one deliberate retry while preventing concurrent requests. */
  const retry = () => {
    if (query.isFetching) return;
    setPreparation('preparing');
    setAttempt((current) => current + 1);
    void query.refetch({ cancelRefetch: false });
  };

  if (unavailable) {
    return (
      <div className="mx-auto flex w-full max-w-80 flex-col gap-2 sm:max-w-none">
        <div className="flex aspect-4/3 flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 p-6 text-center">
          <CircleAlertIcon
            aria-hidden="true"
            className="size-8 text-muted-foreground"
          />
          <p className="font-medium">
            {t('scans.details.preview.unavailableTitle')}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t('scans.details.preview.unavailableDescription')}
          </p>
        </div>
        <div className="flex justify-center rounded-lg border bg-muted/40 p-2">
          <Button
            disabled={query.isFetching}
            onClick={retry}
            type="button"
            variant="outline"
          >
            <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
            {t('scans.details.preview.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (query.isFetching || content === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-80 flex-col gap-2 sm:max-w-none">
        <div
          aria-live="polite"
          className="flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-lg bg-accent/30 p-6 text-center"
          role="status"
        >
          <Spinner aria-hidden="true" className="mb-2 size-8" />
          <p className="font-medium">{t('scans.details.preview.preparing')}</p>
          <p className="text-sm text-muted-foreground">
            {t('scans.details.preview.preparingDescription')}
          </p>
        </div>
        <ScanPreviewToolbar ready={false} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-80 flex-col gap-2 sm:max-w-none">
      <div
        aria-label={t('scans.details.preview.viewport')}
        className="relative aspect-4/3 overflow-hidden rounded-lg bg-foreground [&>canvas]:block [&>canvas]:size-full"
        data-base-ui-swipe-ignore
        key={attempt}
        ref={containerRef}
        role="img"
      >
        {preparation === 'preparing' ? (
          <div
            aria-live="polite"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-accent/30 p-6 text-center"
            role="status"
          >
            <Spinner aria-hidden="true" className="mb-2 size-8" />
            <p className="font-medium">
              {t('scans.details.preview.preparing')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('scans.details.preview.preparingDescription')}
            </p>
          </div>
        ) : (
          <span className="pointer-events-none absolute inset-x-3 bottom-3 z-10 text-center text-xs text-primary-foreground/75">
            {t('scans.details.preview.interactionHint')}
          </span>
        )}
      </div>
      <ScanPreviewToolbar
        ready={preparation === 'ready'}
        renderer={rendererRef.current}
      />
    </div>
  );
}
