import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScanPreviewEncoding } from '@/modules/scans/lib/scan-preview-renderer';
import { ScanPreviewToolbar } from '@/modules/scans/ui/scan-preview-toolbar';
import { Spinner } from '@/shared/ui/spinner';

const ScanUploadPreviewExperience = lazy(() =>
  import('@/modules/scans/ui/scan-upload-preview-experience').then(
    (module) => ({ default: module.ScanUploadPreviewExperience }),
  ),
);

/** Inputs for one deferred local-file preview boundary. */
interface ScanUploadPreviewProps {
  onReady: (encoding: ScanPreviewEncoding) => void;
  previewData: Promise<ArrayBuffer | null>;
}

/** Keeps the final preview footprint visible while Three.js loads. */
export function ScanUploadPreview({
  onReady,
  previewData,
}: ScanUploadPreviewProps) {
  return (
    <Suspense fallback={<UploadPreviewPreparing />}>
      <ScanUploadPreviewExperience
        onReady={onReady}
        previewData={previewData}
      />
    </Suspense>
  );
}

/** Announces local preparation with the stable disabled toolbar. */
function UploadPreviewPreparing() {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        aria-live="polite"
        className="flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-lg bg-accent/30 p-6 text-center"
        role="status"
      >
        <Spinner aria-hidden="true" className="mb-2 size-8" />
        <p className="font-medium">{t('scans.upload.preview.preparing')}</p>
        <p className="text-sm text-muted-foreground">
          {t('scans.upload.preview.preparingDescription')}
        </p>
      </div>
      <ScanPreviewToolbar ready={false} />
    </div>
  );
}
