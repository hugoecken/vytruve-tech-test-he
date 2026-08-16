import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
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
    <div
      aria-live="polite"
      className="mx-auto flex aspect-4/3 w-full max-w-80 flex-col items-center justify-center gap-3 rounded-lg bg-accent/30 p-6 text-center sm:max-w-none"
      role="status"
    >
      <Spinner aria-hidden="true" className="size-8" />
      <span className="font-medium">
        {t('scans.details.preview.preparing')}
      </span>
    </div>
  );
}
