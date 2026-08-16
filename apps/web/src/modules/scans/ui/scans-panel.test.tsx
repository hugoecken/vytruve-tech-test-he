import { HttpResponse, http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ScanUploadOverlay } from '@/modules/scans/ui/scan-upload-overlay';
import { ScansPanel } from '@/modules/scans/ui/scans-panel';
import { createDeferred } from '@/test/deferred';
import { API_URL, pageInfo, patient, problem, scan } from '@/test/fixtures';
import { renderWithQueryClient } from '@/test/render';
import { server } from '@/test/server';

const SCANS_URL = `${API_URL}/patients/${patient.id}/scans`;
const previewRenderer = vi.hoisted(() => ({
  dispose: vi.fn(),
  reset: vi.fn(),
  rotateLeft: vi.fn(),
  rotateRight: vi.fn(),
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
}));

vi.mock('@/modules/scans/lib/scan-preview-renderer', () => ({
  createScanPreviewRenderer: vi.fn(({ onReady }: { onReady: () => void }) => {
    onReady();
    return previewRenderer;
  }),
}));

describe('3D scans', () => {
  it('recovers from a list failure without inventing rows', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    server.use(
      http.get(SCANS_URL, () => {
        requestCount += 1;
        return requestCount === 1
          ? HttpResponse.json(problem('INTERNAL_ERROR', 500), { status: 500 })
          : HttpResponse.json({ items: [], pageInfo: pageInfo() });
      }),
    );

    renderWithQueryClient(
      <ScansPanel active onRequestPrint={vi.fn()} patientId={patient.id} />,
    );

    expect(await screen.findByText(/Unable to load 3D scans/i)).toBeVisible();
    expect(screen.queryByRole('row')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No 3D scans yet')).toBeVisible();
  });

  it('opens safe metadata, requests printing, and downloads through named actions', async () => {
    const user = userEvent.setup();
    const onRequestPrint = vi.fn();
    const previewRequest = createDeferred<void>();
    let contentRequestCount = 0;
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const createObjectUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:synthetic-scan');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL');
    server.use(
      http.get(SCANS_URL, () =>
        HttpResponse.json({ items: [scan], pageInfo: pageInfo() }),
      ),
      http.get(`${SCANS_URL}/${scan.id}/content`, async () => {
        contentRequestCount += 1;
        if (contentRequestCount === 1) {
          await previewRequest.promise;
        }
        return new HttpResponse('ply\nformat ascii 1.0\nend_header', {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }),
    );

    renderWithQueryClient(
      <ScansPanel
        active
        onRequestPrint={onRequestPrint}
        patientId={patient.id}
      />,
    );

    await user.click(await screen.findByLabelText(/View details for SCN-/));
    expect(await screen.findByRole('dialog')).toHaveTextContent('ASCII');
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Available for a print request',
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Preparing 3D preview',
    );
    expect(
      within(screen.getByRole('dialog')).queryByRole('button', {
        name: 'Preview 3D scan',
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Available for a print request',
    );
    await waitFor(() => expect(contentRequestCount).toBe(1));
    previewRequest.resolve();
    await user.keyboard('{Escape}');

    await user.click(
      screen.getByRole('button', { name: /Request printing for SCN-/ }),
    );
    expect(onRequestPrint).toHaveBeenCalledWith(scan);
    await user.click(screen.getByRole('button', { name: /Download SCN-/ }));

    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:synthetic-scan');
    expect(contentRequestCount).toBe(2);
  });

  it('reports a storage failure while keeping the scan available', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(SCANS_URL, () =>
        HttpResponse.json({ items: [scan], pageInfo: pageInfo() }),
      ),
      http.get(`${SCANS_URL}/${scan.id}/content`, () =>
        HttpResponse.json(problem('SCAN_STORAGE_UNAVAILABLE', 503), {
          status: 503,
        }),
      ),
    );

    renderWithQueryClient(
      <ScansPanel active onRequestPrint={vi.fn()} patientId={patient.id} />,
    );
    await user.click(
      await screen.findByRole('button', { name: /Download SCN-/ }),
    );

    expect(
      await screen.findByText('3D scan could not be downloaded'),
    ).toBeVisible();
    expect(
      screen.getByText(/SCN-.* remains available in the list/),
    ).toBeVisible();
  });

  it('protects compact preview gestures from the drawer swipe boundary', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          addEventListener: vi.fn(),
          addListener: vi.fn(),
          dispatchEvent: vi.fn(() => false),
          matches: true,
          media: query,
          onchange: null,
          removeEventListener: vi.fn(),
          removeListener: vi.fn(),
        }) as MediaQueryList,
    );
    server.use(
      http.get(SCANS_URL, () =>
        HttpResponse.json({ items: [scan], pageInfo: pageInfo() }),
      ),
      http.get(
        `${SCANS_URL}/${scan.id}/content`,
        () => new HttpResponse('synthetic private preview'),
      ),
    );
    renderWithQueryClient(
      <ScansPanel active onRequestPrint={vi.fn()} patientId={patient.id} />,
    );

    await user.click(await screen.findByLabelText(/View details for SCN-/));

    expect(
      await screen.findByRole('img', {
        name: 'Interactive 3D scan preview',
      }),
    ).toHaveAttribute('data-base-ui-swipe-ignore', 'true');
    expect(screen.getByText('Available for a print request')).toBeVisible();
    expect(screen.queryByText('Private · Ready')).not.toBeInTheDocument();
    expect(screen.queryByText(/public scan URL/i)).not.toBeInTheDocument();
  });

  it('validates the local file type before upload', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderWithQueryClient(<ScanUploadOverlay patientId={patient.id} />);

    await user.click(screen.getByRole('button', { name: 'Add scan' }));
    await user.upload(
      screen.getByLabelText('Choose a PLY file'),
      new File(['mesh'], 'synthetic.stl', { type: 'model/stl' }),
    );

    expect(
      await screen.findByText('Choose a file with the .ply extension.'),
    ).toBeVisible();
    expect(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Add scan',
      }),
    ).toBeDisabled();
  });

  it('disables upload while pending and localizes a stable server failure', async () => {
    const user = userEvent.setup();
    const request = createDeferred<void>();
    server.use(
      http.post(SCANS_URL, async () => {
        await request.promise;
        return HttpResponse.json(problem('SCAN_INVALID_CONTENT', 422), {
          status: 422,
        });
      }),
    );
    renderWithQueryClient(<ScanUploadOverlay patientId={patient.id} />);

    await user.click(screen.getByRole('button', { name: 'Add scan' }));
    await user.upload(
      screen.getByLabelText('Choose a PLY file'),
      new File(['ply\nformat ascii 1.0\nend_header'], 'synthetic.ply'),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Add scan',
      }),
    );

    expect(
      await screen.findByRole('button', { name: 'Adding scan…' }),
    ).toBeDisabled();
    request.resolve();
    expect(
      await screen.findByText('The selected file is not a valid PLY 3D scan.'),
    ).toBeVisible();
  });
});
