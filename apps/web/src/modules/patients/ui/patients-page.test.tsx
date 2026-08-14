import { HttpResponse, delay, http } from 'msw';
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

describe('patient directory', () => {
  it('announces the initial loading state', async () => {
    server.use(
      http.get(`${API_URL}/patients`, async () => {
        await delay('infinite');
        return HttpResponse.json({ items: [], pageInfo: pageInfo() });
      }),
    );

    renderRoute('/patients', { session: accountSession });

    expect(
      await screen.findByRole('status', { name: 'Loading' }),
    ).toBeVisible();
  });

  it('recovers explicitly from an initial load failure', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    server.use(
      http.get(`${API_URL}/patients`, () => {
        requestCount += 1;
        return requestCount === 1
          ? HttpResponse.json(problem('INTERNAL_ERROR', 500), { status: 500 })
          : HttpResponse.json({ items: [], pageInfo: pageInfo() });
      }),
    );

    renderRoute('/patients', { session: accountSession });

    expect(await screen.findByText('Unable to load patients')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No patient records yet')).toBeVisible();
  });

  it('opens a patient workspace by activating its named row', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [patient], pageInfo: pageInfo() }),
      ),
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(patient),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
    );
    const { router } = renderRoute('/patients', { session: accountSession });

    await user.click(
      await screen.findByLabelText('Open Alex Martin’s patient record'),
    );

    expect(
      await screen.findByRole('heading', { name: 'Alex Martin' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe(`/patients/${patient.id}`);
  });

  it('keeps the previous page visible and recovers when the next page fails', async () => {
    const user = userEvent.setup();
    let secondPageAttempts = 0;
    const secondPatient = {
      ...patient,
      firstName: 'Sam',
      id: '55555555-5555-4555-8555-555555555555',
      lastName: 'Lee',
    };
    server.use(
      http.get(`${API_URL}/patients`, ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        if (requestedPage === '0') {
          return HttpResponse.json({
            items: [patient],
            pageInfo: pageInfo(0, true),
          });
        }
        secondPageAttempts += 1;
        return secondPageAttempts === 2
          ? HttpResponse.json(problem('INTERNAL_ERROR', 500), { status: 500 })
          : HttpResponse.json({
              items: [secondPatient],
              pageInfo: pageInfo(1),
            });
      }),
    );

    const { queryClient } = renderRoute('/patients', {
      session: accountSession,
    });
    await screen.findByText('Alex Martin');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Sam Lee')).toBeVisible();
    expect(screen.getByText('Page 2')).toBeVisible();
    await queryClient.invalidateQueries();

    expect(
      await screen.findByText('Patients could not be refreshed'),
    ).toBeVisible();
    expect(screen.getByText('Sam Lee')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Sam Lee')).toBeVisible();
    expect(
      screen.queryByText('Patients could not be refreshed'),
    ).not.toBeInTheDocument();
  });

  it('creates a valid patient and navigates to the new workspace', async () => {
    const user = userEvent.setup();
    let submittedBody: unknown;
    server.use(
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
      http.post(`${API_URL}/patients`, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(patient, { status: 201 });
      }),
      http.get(`${API_URL}/patients/${patient.id}`, () =>
        HttpResponse.json(patient),
      ),
      http.get(`${API_URL}/patients/${patient.id}/scans`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
    );
    const { router } = renderRoute('/patients', { session: accountSession });

    await user.click(
      await screen.findByRole('button', { name: 'Add patient' }),
    );
    await user.type(
      screen.getByLabelText('First name'),
      `  ${patient.firstName}  `,
    );
    await user.type(screen.getByLabelText('Last name'), patient.lastName);
    await user.type(screen.getByLabelText('Age'), String(patient.age));
    await user.click(screen.getByRole('button', { name: 'Add patient' }));

    expect(
      await screen.findByRole('heading', { name: 'Alex Martin' }),
    ).toBeVisible();
    expect(submittedBody).toEqual({
      age: patient.age,
      firstName: patient.firstName,
      lastName: patient.lastName,
    });
    expect(router.state.location.pathname).toBe(`/patients/${patient.id}`);
  });
});
