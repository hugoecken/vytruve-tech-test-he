import { useCallback, useRef, useState } from 'react';
import { CircleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createScanPreviewRenderer,
  type ScanPreviewEncoding,
  type ScanPreviewRenderer,
} from '@/modules/scans/lib/scan-preview-renderer';
import { ScanPreviewToolbar } from '@/modules/scans/ui/scan-preview-toolbar';
import { Spinner } from '@/shared/ui/spinner';

/** Inputs for one selected-file renderer lifecycle. */
interface ScanUploadPreviewExperienceProps {
  onReady: (encoding: ScanPreviewEncoding) => void;
  previewData: Promise<ArrayBuffer | null>;
}

/** Local renderer preparation tracked against its exact read promise. */
interface PreparationState {
  source: Promise<ArrayBuffer | null>;
  status: 'preparing' | 'ready' | 'unavailable';
}

/** Owns one deferred, disposable local PLY preview without network state. */
export function ScanUploadPreviewExperience({
  onReady,
  previewData,
}: ScanUploadPreviewExperienceProps) {
  const { t } = useTranslation();
  const rendererRef = useRef<ScanPreviewRenderer | null>(null);
  const [preparation, setPreparation] = useState<PreparationState>({
    source: previewData,
    status: 'preparing',
  });
  const status =
    preparation.source === previewData ? preparation.status : 'preparing';
  const rendererReady = useCallback(
    (encoding: ScanPreviewEncoding) => {
      onReady(encoding);
      setPreparation({ source: previewData, status: 'ready' });
    },
    [onReady, previewData],
  );
  const rendererUnavailable = useCallback(
    () => setPreparation({ source: previewData, status: 'unavailable' }),
    [previewData],
  );
  const containerRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (container === null) return;
      let active = true;
      let renderer: ScanPreviewRenderer | null = null;
      void previewData
        .then((data) => {
          if (!active) return;
          if (data === null) {
            rendererUnavailable();
            return;
          }
          renderer = createScanPreviewRenderer({
            container,
            data,
            onReady: rendererReady,
            onUnavailable: rendererUnavailable,
          });
          if (!active) {
            renderer?.dispose();
            return;
          }
          rendererRef.current = renderer;
        })
        .catch(() => {
          if (active) rendererUnavailable();
        });
      return () => {
        active = false;
        renderer?.dispose();
        if (rendererRef.current === renderer) rendererRef.current = null;
      };
    },
    [previewData, rendererReady, rendererUnavailable],
  );

  if (status === 'unavailable') {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex aspect-4/3 flex-col items-center justify-center gap-3 rounded-lg bg-muted/40 p-6 text-center">
          <CircleAlertIcon
            aria-hidden="true"
            className="size-8 text-muted-foreground"
          />
          <p className="font-medium">
            {t('scans.upload.preview.unavailableTitle')}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t('scans.upload.preview.unavailableDescription')}
          </p>
        </div>
        <ScanPreviewToolbar ready={false} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        aria-label={t('scans.upload.preview.viewport')}
        className="relative aspect-4/3 overflow-hidden rounded-lg bg-foreground [&>canvas]:block [&>canvas]:size-full"
        data-base-ui-swipe-ignore
        ref={containerRef}
        role="img"
      >
        {status === 'preparing' ? (
          <div
            aria-live="polite"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-accent/30 p-6 text-center"
            role="status"
          >
            <Spinner aria-hidden="true" className="mb-2 size-8" />
            <p className="font-medium">{t('scans.upload.preview.preparing')}</p>
            <p className="text-sm text-muted-foreground">
              {t('scans.upload.preview.preparingDescription')}
            </p>
          </div>
        ) : (
          <span className="pointer-events-none absolute inset-x-3 bottom-3 z-10 text-center text-xs text-primary-foreground/75">
            {t('scans.details.preview.interactionHint')}
          </span>
        )}
      </div>
      <ScanPreviewToolbar
        ready={status === 'ready'}
        renderer={rendererRef.current}
      />
    </div>
  );
}
