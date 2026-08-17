import { fileTypeFromBlob } from 'file-type';
import { HttpResponse, http } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import {
  API_URL,
  accountSession,
  pageInfo,
  patient,
  problem,
} from '@/test/fixtures';
import { renderRoute } from '@/test/render';
import { server } from '@/test/server';

vi.mock('file-type', () => ({ fileTypeFromBlob: vi.fn() }));

const detectedFileType = vi.mocked(fileTypeFromBlob);

describe('patient editing', () => {
  beforeEach(() => {
    detectedFileType.mockResolvedValue({ ext: 'png', mime: 'image/png' });
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ close: vi.fn() }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens prefilled, keeps the photo decision, and refreshes identity without changing tabs', async () => {
    const user = userEvent.setup();
    const currentPatient = { ...patient, hasPhoto: true };
    let submittedBody: FormData | undefined;
    server.use(
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(currentPatient),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
      http.patch(`${API_URL}/patients/${patient.id}`, async ({ request }) => {
        submittedBody = await request.formData();
        return HttpResponse.json({ ...currentPatient, firstName: 'Jamie' });
      }),
    );
    renderRoute(`/patients/${patient.id}`, { session: accountSession });

    await user.click(
      await screen.findByRole(
        'button',
        { name: 'Edit patient' },
        { timeout: 3000 },
      ),
    );
    expect(screen.getByLabelText('First name')).toHaveValue(patient.firstName);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Jamie');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByRole('heading', { name: 'Jamie Martin' }),
    ).toBeVisible();
    expect(submittedBody?.get('photoAction')).toBe('keep');
    expect(screen.getByRole('tab', { name: '3D scans' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('cancels without sending patient changes', async () => {
    const user = userEvent.setup();
    let updateCount = 0;
    server.use(
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(patient),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
      http.patch(`${API_URL}/patients/${patient.id}`, () => {
        updateCount += 1;
        return HttpResponse.json(patient);
      }),
    );
    renderRoute(`/patients/${patient.id}`, { session: accountSession });

    await user.click(
      await screen.findByRole('button', { name: 'Edit patient' }),
    );
    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Jamie');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updateCount).toBe(0);
  });

  it('retains edited values after a safe failed save', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(patient),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
      http.patch(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(problem('INTERNAL_ERROR', 500), { status: 500 }),
      ),
    );
    renderRoute(`/patients/${patient.id}`, { session: accountSession });

    await user.click(
      await screen.findByRole('button', { name: 'Edit patient' }),
    );
    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Jamie');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('The service encountered an unexpected problem.'),
    ).toBeVisible();
    expect(screen.getByLabelText('First name')).toHaveValue('Jamie');
  });

  it('submits an explicit replacement photo decision', async () => {
    const user = userEvent.setup();
    let submittedBody: FormData | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        submittedBody = init.body as FormData;
        return Response.json({ ...patient, hasPhoto: true });
      }
      if (url.endsWith(`/patients/${patient.id}`)) {
        return Response.json(patient);
      }
      if (url.endsWith(`/patients/${patient.id}/scans?page=0&pageSize=10`)) {
        return Response.json({ items: [], pageInfo: pageInfo() });
      }
      return Response.json({ items: [], pageInfo: pageInfo() });
    });
    renderRoute(`/patients/${patient.id}`, { session: accountSession });

    await user.click(
      await screen.findByRole('button', { name: 'Edit patient' }),
    );
    const photo = new File(['synthetic'], 'patient.png', {
      type: 'image/png',
    });
    await user.upload(screen.getByLabelText('Profile photo (optional)'), photo);
    await screen.findByRole('img', { name: 'Selected photo' });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(submittedBody?.get('photoAction')).toBe('replace');
    expect((submittedBody?.get('photo') as Blob).size).toBe(photo.size);
  });

  it('submits an explicit removal decision', async () => {
    const user = userEvent.setup();
    const currentPatient = { ...patient, hasPhoto: true };
    let submittedBody: FormData | undefined;
    server.use(
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(currentPatient),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
      http.patch(`${API_URL}/patients/${patient.id}`, async ({ request }) => {
        submittedBody = await request.formData();
        return HttpResponse.json({ ...currentPatient, hasPhoto: false });
      }),
    );
    renderRoute(`/patients/${patient.id}`, { session: accountSession });

    await user.click(
      await screen.findByRole('button', { name: 'Edit patient' }),
    );
    await user.click(screen.getByRole('button', { name: 'Remove photo' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(submittedBody?.get('photoAction')).toBe('remove');
    expect(submittedBody?.get('photo')).toBeNull();
  });

  it('prevents dismissal and duplicate updates while saving', async () => {
    const user = userEvent.setup();
    const pendingRequest = deferred<void>();
    let updateCount = 0;
    server.use(
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(patient),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
      http.patch(`${API_URL}/patients/${patient.id}`, async () => {
        updateCount += 1;
        await pendingRequest.promise;
        return HttpResponse.json({ ...patient, firstName: 'Jamie' });
      }),
    );
    renderRoute(`/patients/${patient.id}`, { session: accountSession });

    await user.click(
      await screen.findByRole('button', { name: 'Edit patient' }),
    );
    await user.clear(screen.getByLabelText('First name'));
    await user.type(screen.getByLabelText('First name'), 'Jamie');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(updateCount).toBe(1));

    expect(
      screen.getByRole('button', { name: 'Saving changes…' }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
    pendingRequest.resolve(undefined);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

/** Creates a controllable promise for pending-state assertions. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}
