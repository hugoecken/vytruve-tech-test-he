import { HttpResponse, http } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import { ScanPreview } from '@/modules/scans/ui/scan-preview';
import { ScanPreviewExperience } from '@/modules/scans/ui/scan-preview-experience';
import { getDownloadPatientScanQueryKey } from '@/shared/api/generated/client/scans/scans';
import { createDeferred } from '@/test/deferred';
import { API_URL, patient, scan } from '@/test/fixtures';
import { renderWithQueryClient } from '@/test/render';
import { server } from '@/test/server';

const preview = vi.hoisted(() => {
  const renderer = {
    dispose: vi.fn(),
    reset: vi.fn(),
    rotateLeft: vi.fn(),
    rotateRight: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  };
  return {
    createRenderer: vi.fn(({ onReady }: { onReady: () => void }) => {
      onReady();
      return renderer;
    }),
    renderer,
  };
});

vi.mock('@/modules/scans/lib/scan-preview-renderer', () => ({
  createScanPreviewRenderer: preview.createRenderer,
}));

const CONTENT_URL = `${API_URL}/patients/${patient.id}/scans/${scan.id}/content`;

describe('scan preview experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.use(
      http.get(
        CONTENT_URL,
        () =>
          new HttpResponse(syntheticAsciiPly(), {
            headers: { 'Content-Type': 'application/octet-stream' },
          }),
      ),
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('announces preparation and forwards all five icon-only controls', async () => {
    const user = userEvent.setup();
    renderWithQueryClient(
      <ScanPreviewExperience patientId={patient.id} scanId={scan.id} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Preparing 3D preview',
    );

    const rotateLeft = await screen.findByRole('button', {
      name: 'Rotate left',
    });
    await waitFor(() => expect(rotateLeft).toBeEnabled());
    expect(rotateLeft).not.toHaveTextContent('Rotate left');
    expect(screen.getByRole('toolbar')).toHaveClass('flex-nowrap');
    await user.click(rotateLeft);
    await user.click(screen.getByRole('button', { name: 'Rotate right' }));
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Zoom out' }));
    await user.click(screen.getByRole('button', { name: 'Reset view' }));

    expect(preview.renderer.rotateLeft).toHaveBeenCalledOnce();
    expect(preview.renderer.rotateRight).toHaveBeenCalledOnce();
    expect(preview.renderer.zoomIn).toHaveBeenCalledOnce();
    expect(preview.renderer.zoomOut).toHaveBeenCalledOnce();
    expect(preview.renderer.reset).toHaveBeenCalledOnce();
  });

  it('keeps failures generic and retries only after one explicit action', async () => {
    const user = userEvent.setup();
    const retryResponse = createDeferred<void>();
    let requestCount = 0;
    server.use(
      http.get(CONTENT_URL, async () => {
        requestCount += 1;
        if (requestCount === 1) {
          return HttpResponse.json(
            { code: 'SCAN_STORAGE_UNAVAILABLE', detail: 'private-provider' },
            { status: 503 },
          );
        }
        await retryResponse.promise;
        return new HttpResponse(syntheticAsciiPly());
      }),
    );

    renderWithQueryClient(
      <ScanPreviewExperience patientId={patient.id} scanId={scan.id} />,
    );

    expect(await screen.findByText('3D preview unavailable')).toBeVisible();
    expect(screen.queryByText(/private-provider|503/i)).not.toBeInTheDocument();
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(requestCount).toBe(1));

    const retry = screen.getByRole('button', { name: 'Retry' });
    await user.click(retry);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Preparing 3D preview',
    );
    expect(
      screen.queryByRole('button', { name: 'Retry' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(requestCount).toBe(2));
    retryResponse.resolve();

    expect(
      await screen.findByRole('img', { name: 'Interactive 3D scan preview' }),
    ).toBeVisible();
    expect(requestCount).toBe(2);
  });

  it('collapses Blob conversion failures into the same safe state', async () => {
    vi.spyOn(Blob.prototype, 'arrayBuffer').mockRejectedValueOnce(
      new Error('synthetic conversion failure'),
    );

    renderWithQueryClient(
      <ScanPreviewExperience patientId={patient.id} scanId={scan.id} />,
    );

    expect(await screen.findByText('3D preview unavailable')).toBeVisible();
    expect(
      screen.queryByText('synthetic conversion failure'),
    ).not.toBeInTheDocument();
    expect(preview.createRenderer).not.toHaveBeenCalled();
  });

  it('cancels retrieval and evicts private content when unmounted', async () => {
    const started = createDeferred<void>();
    let aborted = false;
    server.use(
      http.get(CONTENT_URL, async ({ request }) => {
        started.resolve();
        await new Promise<void>((resolve) => {
          request.signal.addEventListener(
            'abort',
            () => {
              aborted = true;
              resolve();
            },
            { once: true },
          );
        });
        return new HttpResponse(null, { status: 499 });
      }),
    );
    const { queryClient, unmount } = renderWithQueryClient(
      <ScanPreviewExperience patientId={patient.id} scanId={scan.id} />,
    );

    await started.promise;
    unmount();

    await waitFor(() => expect(aborted).toBe(true));
    await waitFor(() =>
      expect(
        queryClient.getQueryData(
          getDownloadPatientScanQueryKey(patient.id, scan.id),
        ),
      ).toBeUndefined(),
    );
    expect(preview.createRenderer).not.toHaveBeenCalled();
  });

  it('disposes a ready renderer and ignores late Blob conversion', async () => {
    const first = renderWithQueryClient(
      <ScanPreviewExperience patientId={patient.id} scanId={scan.id} />,
    );
    await screen.findByRole('img', { name: 'Interactive 3D scan preview' });
    await waitFor(() => expect(preview.createRenderer).toHaveBeenCalledOnce());
    first.unmount();
    expect(preview.renderer.dispose).toHaveBeenCalledOnce();

    vi.clearAllMocks();
    const conversion = createDeferred<ArrayBuffer>();
    vi.spyOn(Blob.prototype, 'arrayBuffer').mockReturnValueOnce(
      conversion.promise,
    );
    const second = renderWithQueryClient(
      <ScanPreviewExperience patientId={patient.id} scanId={scan.id} />,
    );
    await screen.findByRole('img', { name: 'Interactive 3D scan preview' });
    second.unmount();
    conversion.resolve(new ArrayBuffer(8));

    await waitFor(() => expect(preview.createRenderer).not.toHaveBeenCalled());
  });

  it('starts one new attempt when a failed preview session reopens', async () => {
    let requestCount = 0;
    server.use(
      http.get(CONTENT_URL, () => {
        requestCount += 1;
        return new HttpResponse(null, { status: 503 });
      }),
    );
    const first = renderWithQueryClient(
      <ScanPreview patientId={patient.id} scanId={scan.id} />,
    );
    expect(await screen.findByText('3D preview unavailable')).toBeVisible();
    expect(requestCount).toBe(1);
    first.unmount();

    renderWithQueryClient(
      <ScanPreview patientId={patient.id} scanId={scan.id} />,
    );
    expect(await screen.findByText('3D preview unavailable')).toBeVisible();
    expect(requestCount).toBe(2);
  });
});

function syntheticAsciiPly(): string {
  return [
    'ply',
    'format ascii 1.0',
    'element vertex 3',
    'property float x',
    'property float y',
    'property float z',
    'element face 1',
    'property list uchar int vertex_indices',
    'end_header',
    '0 0 0',
    '1 0 0',
    '0 1 0',
    '3 0 1 2',
  ].join('\n');
}
