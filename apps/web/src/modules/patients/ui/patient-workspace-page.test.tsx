import { HttpResponse, http } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  API_URL,
  accountSession,
  pageInfo,
  patient,
  problem,
} from '@/test/fixtures';
import { renderRoute } from '@/test/render';
import { server } from '@/test/server';

describe('patient workspace', () => {
  it('shows patient identity, loads scans first, and fetches prints after tab activation', async () => {
    const user = userEvent.setup();
    let printRequestCount = 0;
    server.use(
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(patient),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
      http.get(`${API_URL}/patients/${patient.id}/print-requests`, () => {
        printRequestCount += 1;
        return HttpResponse.json({ items: [], pageInfo: pageInfo() });
      }),
    );

    const { container } = renderRoute(`/patients/${patient.id}`, {
      session: accountSession,
    });

    expect(
      await screen.findByRole(
        'heading',
        { name: 'Alex Martin' },
        { timeout: 3000 },
      ),
    ).toBeVisible();
    expect(container.querySelector('.lucide-user-round')).toBeVisible();
    expect(screen.getByText(/34 years · Record created/)).toBeVisible();
    expect(screen.getByRole('tab', { name: '3D scans' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByText('No 3D scans yet')).toBeVisible();
    expect(printRequestCount).toBe(0);

    await user.click(screen.getByRole('tab', { name: 'Print requests' }));
    expect(await screen.findByText('No print requests yet')).toBeVisible();
    expect(printRequestCount).toBe(1);
  });

  it('conceals the workspace when the patient is unavailable', async () => {
    let scanRequestCount = 0;
    server.use(
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(problem('PATIENT_NOT_FOUND', 404), { status: 404 }),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () => {
        scanRequestCount += 1;
        return HttpResponse.json({ items: [], pageInfo: pageInfo() });
      }),
    );

    renderRoute(`/patients/${patient.id}`, { session: accountSession });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Patient record unavailable',
    );
    expect(screen.queryByText('Alex Martin')).not.toBeInTheDocument();
    expect(scanRequestCount).toBe(0);
  });
});
