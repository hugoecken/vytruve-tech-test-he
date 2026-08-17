import { fileTypeFromBlob } from 'file-type';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import {
  PatientPhotoField,
  type PatientPhotoDecision,
} from './patient-photo-field';

vi.mock('file-type', () => ({ fileTypeFromBlob: vi.fn() }));

const detectedFileType = vi.mocked(fileTypeFromBlob);
const createImageBitmapMock = vi.fn();

describe(PatientPhotoField.name, () => {
  beforeEach(() => {
    detectedFileType.mockReset();
    createImageBitmapMock.mockReset();
    detectedFileType.mockResolvedValue({ ext: 'png', mime: 'image/png' });
    createImageBitmapMock.mockResolvedValue({ close: vi.fn() });
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.mocked(URL.createObjectURL).mockImplementation(
      (file) => `blob:${(file as File).size}`,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prepares and reviews a supported selection without making a request', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(decision: PatientPhotoDecision) => void>();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const decoding = deferred<ImageBitmap>();
    createImageBitmapMock.mockReturnValueOnce(decoding.promise);
    render(<PatientPhotoField inputId="patient-photo" onChange={onChange} />);

    const file = new File([new Uint8Array(9 * 1024)], 'patient.png', {
      type: 'image/png',
    });
    await user.upload(screen.getByLabelText('Profile photo (optional)'), file);

    expect(
      screen.getByRole('status', { name: 'Preparing photo' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeVisible();
    decoding.resolve({ close: vi.fn() } as unknown as ImageBitmap);

    expect(
      await screen.findByRole('img', { name: 'Selected photo' }),
    ).toHaveAttribute('src', `blob:${file.size}`);
    expect(screen.getByText('PNG · 9 KiB')).toBeVisible();
    expect(onChange).toHaveBeenLastCalledWith({ action: 'replace', file });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('replaces and removes a selected photo', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(decision: PatientPhotoDecision) => void>();
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce('blob:first')
      .mockReturnValueOnce('blob:second');
    render(<PatientPhotoField inputId="patient-photo" onChange={onChange} />);

    const first = new File(['first'], 'first.png', { type: 'image/png' });
    const second = new File(['second'], 'second.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Profile photo (optional)'), first);
    await screen.findByRole('img', { name: 'Selected photo' });
    await user.upload(
      screen.getByLabelText('Profile photo (optional)'),
      second,
    );

    expect(
      await screen.findByRole('img', { name: 'Selected photo' }),
    ).toHaveAttribute('src', 'blob:second');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
    await user.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(screen.getByRole('button', { name: 'Choose photo' })).toBeVisible();
    expect(onChange).toHaveBeenLastCalledWith({ action: 'keep' });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second');
  });

  it('rejects an unsupported selection and keeps submission empty', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn<(decision: PatientPhotoDecision) => void>();
    detectedFileType.mockResolvedValueOnce({ ext: 'gif', mime: 'image/gif' });
    render(<PatientPhotoField inputId="patient-photo" onChange={onChange} />);

    await user.upload(
      screen.getByLabelText('Profile photo (optional)'),
      new File(['synthetic'], 'patient.gif', { type: 'image/gif' }),
    );

    expect(
      await screen.findByText('Choose a JPEG, PNG, or WebP image.'),
    ).toBeVisible();
    expect(createImageBitmapMock).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith({ action: 'invalid' });
  });

  it('recovers from truncated content inspection with a safe decode error', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(decision: PatientPhotoDecision) => void>();
    detectedFileType.mockRejectedValueOnce(new Error('truncated content'));
    render(<PatientPhotoField inputId="patient-photo" onChange={onChange} />);

    await user.upload(
      screen.getByLabelText('Profile photo (optional)'),
      new File(['synthetic'], 'patient.png', { type: 'image/png' }),
    );

    expect(
      await screen.findByText('Choose an image that can be opened safely.'),
    ).toBeVisible();
    expect(onChange).toHaveBeenLastCalledWith({ action: 'invalid' });
  });

  it('ignores an obsolete decode after a replacement is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(decision: PatientPhotoDecision) => void>();
    const firstDecode = deferred<ImageBitmap>();
    const secondDecode = deferred<ImageBitmap>();
    createImageBitmapMock
      .mockReturnValueOnce(firstDecode.promise)
      .mockReturnValueOnce(secondDecode.promise);
    render(<PatientPhotoField inputId="patient-photo" onChange={onChange} />);

    const first = new File(['first'], 'first.png', { type: 'image/png' });
    const second = new File(['second'], 'second.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Profile photo (optional)'), first);
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeVisible();
    await user.upload(
      screen.getByLabelText('Profile photo (optional)'),
      second,
    );
    secondDecode.resolve({ close: vi.fn() } as unknown as ImageBitmap);
    await screen.findByRole('img', { name: 'Selected photo' });
    firstDecode.resolve({ close: vi.fn() } as unknown as ImageBitmap);

    expect(onChange).toHaveBeenLastCalledWith({
      action: 'replace',
      file: second,
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('releases the local Blob URL when the field is discarded', async () => {
    const user = userEvent.setup();
    vi.mocked(URL.createObjectURL).mockReturnValueOnce('blob:selected');
    const { unmount } = render(
      <PatientPhotoField inputId="patient-photo" onChange={vi.fn()} />,
    );

    await user.upload(
      screen.getByLabelText('Profile photo (optional)'),
      new File(['synthetic'], 'patient.png', { type: 'image/png' }),
    );
    await screen.findByRole('img', { name: 'Selected photo' });
    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:selected');
  });
});

/** Creates a controllable promise for asynchronous state assertions. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
