import type { ReactNode } from 'react';
import {
  RotateCcwIcon,
  RotateCwIcon,
  ScanSearchIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScanPreviewRenderer } from '@/modules/scans/lib/scan-preview-renderer';
import { Button } from '@/shared/ui/button';

/** State and optional renderer commands for the stable preview toolbar. */
interface ScanPreviewToolbarProps {
  ready: boolean;
  renderer?: ScanPreviewRenderer | null;
}

/** Renders the five icon-only preview commands without importing Three.js. */
export function ScanPreviewToolbar({
  ready,
  renderer,
}: ScanPreviewToolbarProps) {
  const { t } = useTranslation();

  return (
    <div
      aria-label={t('scans.details.preview.controls')}
      className="flex flex-nowrap justify-center gap-2 rounded-lg border bg-muted/40 p-2"
      role="toolbar"
    >
      <PreviewControl
        label={t('scans.details.preview.rotateLeft')}
        onClick={() => renderer?.rotateLeft()}
        ready={ready}
      >
        <RotateCcwIcon aria-hidden="true" />
      </PreviewControl>
      <PreviewControl
        label={t('scans.details.preview.rotateRight')}
        onClick={() => renderer?.rotateRight()}
        ready={ready}
      >
        <RotateCwIcon aria-hidden="true" />
      </PreviewControl>
      <PreviewControl
        label={t('scans.details.preview.zoomIn')}
        onClick={() => renderer?.zoomIn()}
        ready={ready}
      >
        <ZoomInIcon aria-hidden="true" />
      </PreviewControl>
      <PreviewControl
        label={t('scans.details.preview.zoomOut')}
        onClick={() => renderer?.zoomOut()}
        ready={ready}
      >
        <ZoomOutIcon aria-hidden="true" />
      </PreviewControl>
      <PreviewControl
        label={t('scans.details.preview.reset')}
        onClick={() => renderer?.reset()}
        ready={ready}
      >
        <ScanSearchIcon aria-hidden="true" />
      </PreviewControl>
    </div>
  );
}

/** Props for one accessible icon-only preview command. */
interface PreviewControlProps {
  children: ReactNode;
  label: string;
  onClick: () => void;
  ready: boolean;
}

/** Renders one toolbar command with a stable disabled footprint. */
function PreviewControl({
  children,
  label,
  onClick,
  ready,
}: PreviewControlProps) {
  return (
    <Button
      aria-label={label}
      disabled={!ready}
      onClick={onClick}
      size="icon"
      type="button"
      variant="outline"
    >
      {children}
    </Button>
  );
}
