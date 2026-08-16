import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanPreviewToolbar } from '@/modules/scans/ui/scan-preview-toolbar';
import { Spinner } from '@/shared/ui/spinner';

const ScanPreviewExperience = lazy(() =>
  import('@/modules/scans/ui/scan-preview-experience').then((module) => ({
    default: module.ScanPreviewExperience,
  })),
);

/** Identifies the owned scan whose preview starts with the open overlay. */
interface ScanPreviewProps {
  patientId: string;
  scanId: string;
}

/** Starts preview preparation while keeping Three.js outside the initial bundle. */
export function ScanPreview({ patientId, scanId }: ScanPreviewProps) {
  return (
    <Suspense fallback={<PreviewPreparing />}>
      <ScanPreviewExperience patientId={patientId} scanId={scanId} />
    </Suspense>
  );
}

/** Announces preparation while the deferred preview module loads. */
function PreviewPreparing() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex w-full max-w-80 flex-col gap-2 sm:max-w-none">
      <div
        aria-live="polite"
        className="flex aspect-4/3 flex-col items-center justify-center gap-3 rounded-lg bg-accent/30 p-6 text-center"
        role="status"
      >
        <Spinner aria-hidden="true" className="size-8" />
        <span className="font-medium">
          {t('scans.details.preview.preparing')}
        </span>
      </div>
      <ScanPreviewToolbar ready={false} />
    </div>
  );
}
