import { StrictMode } from 'react';
import { HttpResponse, http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, vi } from 'vitest';
import { ScanUploadOverlay } from '@/modules/scans/ui/scan-upload-overlay';
import { i18n } from '@/shared/i18n/i18n';
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
    createRenderer: vi.fn(
      ({
        onReady,
      }: {
        onReady: (encoding: string) => void;
        onUnavailable: () => void;
      }) => {
        onReady('ascii');
        return renderer;
      },
    ),
    renderer,
  };
});

vi.mock('@/modules/scans/lib/scan-preview-renderer', () => ({
  createScanPreviewRenderer: preview.createRenderer,
}));

const SCANS_URL = `${API_URL}/patients/${patient.id}/scans`;

describe('scan upload preview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads once, previews locally, forwards controls, then uploads explicitly', async () => {
    const user = userEvent.setup();
    const conversion = createDeferred<ArrayBuffer>();
    const file = createPlyFile('synthetic.ply', conversion.promise);
    let requestCount = 0;
    server.use(
      http.post(SCANS_URL, () => {
        requestCount += 1;
        return HttpResponse.json(scan, { status: 201 });
      }),
    );
    renderWithQueryClient(
      <StrictMode>
        <ScanUploadOverlay patientId={patient.id} />
      </StrictMode>,
    );

    await user.click(screen.getByRole('button', { name: 'Add scan' }));
    await user.upload(screen.getByLabelText('Choose a PLY file'), file);

    expect(file.arrayBuffer).toHaveBeenCalledOnce();
    expect(screen.getByText('Preparing local preview…')).toBeVisible();
    expect(requestCount).toBe(0);
    for (const name of previewControlNames) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }

    conversion.resolve(syntheticAsciiPly());
    expect(
      await screen.findByRole('img', { name: 'Selected 3D scan preview' }),
    ).toHaveAttribute('data-base-ui-swipe-ignore', 'true');
    expect(screen.getByText('ASCII')).toBeVisible();
    for (const name of previewControlNames) {
      await waitFor(() =>
        expect(screen.getByRole('button', { name })).toBeEnabled(),
      );
      await user.click(screen.getByRole('button', { name }));
    }
    expect(preview.renderer.rotateLeft).toHaveBeenCalledOnce();
    expect(preview.renderer.rotateRight).toHaveBeenCalledOnce();
    expect(preview.renderer.zoomIn).toHaveBeenCalledOnce();
    expect(preview.renderer.zoomOut).toHaveBeenCalledOnce();
    expect(preview.renderer.reset).toHaveBeenCalledOnce();
    expect(requestCount).toBe(0);

    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Add scan',
      }),
    );
    await waitFor(() => expect(requestCount).toBe(1));
    await waitFor(() =>
      expect(preview.renderer.dispose).toHaveBeenCalledTimes(
        preview.createRenderer.mock.calls.length,
      ),
    );
  });

  it('disposes replaced previews and ignores late completion after close', async () => {
    const user = userEvent.setup();
    const first = createPlyFile(
      'first-synthetic.ply',
      Promise.resolve(syntheticAsciiPly()),
    );
    const replacementConversion = createDeferred<ArrayBuffer>();
    const replacement = createPlyFile(
      'replacement-synthetic.ply',
      replacementConversion.promise,
    );
    renderWithQueryClient(<ScanUploadOverlay patientId={patient.id} />);

    await user.click(screen.getByRole('button', { name: 'Add scan' }));
    const input = screen.getByLabelText('Choose a PLY file');
    await user.upload(input, first);
    await screen.findByRole('img', { name: 'Selected 3D scan preview' });
    await user.upload(input, replacement);

    await waitFor(() =>
      expect(preview.renderer.dispose).toHaveBeenCalledOnce(),
    );
    expect(replacement.arrayBuffer).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    replacementConversion.resolve(syntheticAsciiPly());
    await waitFor(() => expect(preview.createRenderer).toHaveBeenCalledOnce());
  });

  it('disposes the local preview when the selection is removed', async () => {
    const user = userEvent.setup();
    const file = createPlyFile(
      'synthetic.ply',
      Promise.resolve(syntheticAsciiPly()),
    );
    renderWithQueryClient(<ScanUploadOverlay patientId={patient.id} />);

    await user.click(screen.getByRole('button', { name: 'Add scan' }));
    await user.upload(screen.getByLabelText('Choose a PLY file'), file);
    await screen.findByRole('img', { name: 'Selected 3D scan preview' });
    await user.click(
      screen.getByRole('button', { name: 'Remove selected scan' }),
    );

    await waitFor(() =>
      expect(preview.renderer.dispose).toHaveBeenCalledOnce(),
    );
    expect(
      screen.getByRole('button', { name: 'Choose a PLY file' }),
    ).toBeVisible();
  });

  it('keeps an eligible upload available when local preview fails', async () => {
    const user = userEvent.setup();
    let rejectConversion!: (reason: Error) => void;
    const conversion = new Promise<ArrayBuffer>((_resolve, reject) => {
      rejectConversion = reject;
    });
    const file = createPlyFile('unavailable-synthetic.ply', conversion);
    let requestCount = 0;
    server.use(
      http.post(SCANS_URL, () => {
        requestCount += 1;
        return HttpResponse.json(scan, { status: 201 });
      }),
    );
    renderWithQueryClient(<ScanUploadOverlay patientId={patient.id} />);

    await user.click(screen.getByRole('button', { name: 'Add scan' }));
    await user.upload(screen.getByLabelText('Choose a PLY file'), file);
    rejectConversion(new Error('synthetic private detail'));

    expect(await screen.findByText('Local preview unavailable')).toBeVisible();
    expect(
      screen.queryByText('synthetic private detail'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry preview' }),
    ).not.toBeInTheDocument();
    const submit = within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Add scan',
    });
    expect(submit).toBeEnabled();
    expect(requestCount).toBe(0);

    await user.click(submit);
    await waitFor(() => expect(requestCount).toBe(1));
  });

  it('keeps upload available when the renderer rejects the local file', async () => {
    const user = userEvent.setup();
    preview.createRenderer.mockImplementationOnce(({ onUnavailable }) => {
      onUnavailable();
      return null;
    });
    const file = createPlyFile(
      'synthetic.ply',
      Promise.resolve(syntheticAsciiPly()),
    );
    renderWithQueryClient(<ScanUploadOverlay patientId={patient.id} />);

    await user.click(screen.getByRole('button', { name: 'Add scan' }));
    await user.upload(screen.getByLabelText('Choose a PLY file'), file);

    expect(await screen.findByText('Local preview unavailable')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Retry preview' }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Add scan',
      }),
    ).toBeEnabled();
  });

  it('does not read an invalid selection or enable its upload', async () => {
    const user = userEvent.setup();
    const invalid = createPlyFile(
      'synthetic.txt',
      Promise.resolve(syntheticAsciiPly()),
    );
    renderWithQueryClient(<ScanUploadOverlay patientId={patient.id} />);

    await user.click(screen.getByRole('button', { name: 'Add scan' }));
    await user.upload(screen.getByLabelText('Choose a PLY file'), invalid);

    expect(invalid.arrayBuffer).not.toHaveBeenCalled();
    expect(preview.createRenderer).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Add scan',
      }),
    ).toBeDisabled();
  });

  it('keeps endian names technical in French', () => {
    const t = i18n.getFixedT('fr');

    expect(t('scans.encoding.binary_little_endian')).toBe(
      'Binaire (little-endian)',
    );
    expect(t('scans.encoding.binary_big_endian')).toBe('Binaire (big-endian)');
  });
});

const previewControlNames = [
  'Rotate left',
  'Rotate right',
  'Zoom in',
  'Zoom out',
  'Reset view',
];

/** Creates one synthetic file with a controlled standard local read. */
function createPlyFile(name: string, result: Promise<ArrayBuffer>): File {
  const file = new File(['synthetic'], name);
  Object.defineProperty(file, 'arrayBuffer', {
    configurable: true,
    value: vi.fn(() => result),
  });
  return file;
}

/** Returns the smallest synthetic ASCII mesh needed by preview tests. */
function syntheticAsciiPly(): ArrayBuffer {
  const bytes = new TextEncoder().encode(
    [
      'ply',
      'format ascii 1.0',
      'element vertex 3',
      'property float x',
      'property float y',
      'property float z',
      'end_header',
      '0 0 0',
      '1 0 0',
      '0 1 0',
    ].join('\n'),
  );
  return bytes.buffer;
}
