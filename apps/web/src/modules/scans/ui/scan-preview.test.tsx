import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ScanPreview } from '@/modules/scans/ui/scan-preview';
import { patient, scan } from '@/test/fixtures';
import { renderWithQueryClient } from '@/test/render';

const deferredModule = vi.hoisted(() => {
  let resolve = () => undefined;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
});

vi.mock('@/modules/scans/ui/scan-preview-experience', async () => {
  await deferredModule.promise;
  return { ScanPreviewExperience: () => null };
});

describe('scan preview boundary', () => {
  it('renders the complete disabled toolbar with the deferred viewport', () => {
    renderWithQueryClient(
      <ScanPreview patientId={patient.id} scanId={scan.id} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Preparing 3D preview',
    );
    expect(screen.getByRole('toolbar')).toBeVisible();
    for (const name of [
      'Rotate left',
      'Rotate right',
      'Zoom in',
      'Zoom out',
      'Reset view',
    ]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });
});
