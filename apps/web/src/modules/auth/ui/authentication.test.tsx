import { HttpResponse, delay, http } from 'msw';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createDeferred } from '@/test/deferred';
import { API_URL, accountSession, pageInfo, problem } from '@/test/fixtures';
import { renderRoute } from '@/test/render';
import { server } from '@/test/server';

describe('authentication', () => {
  it('validates sign-in fields before sending a request', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    server.use(
      http.post(`${API_URL}/auth/sessions`, () => {
        requestCount += 1;
        return HttpResponse.json(accountSession);
      }),
    );

    renderRoute('/sign-in');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeVisible();
    expect(screen.getByText('Enter your password.')).toBeVisible();
    expect(requestCount).toBe(0);
  });

  it('maps stable server violation codes to their fields', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/auth/sessions`, () =>
        HttpResponse.json(
          {
            ...problem('VALIDATION_FAILED', 400, [
              { code: 'EMAIL_INVALID', field: 'email' },
            ]),
            detail: 'Synthetic backend implementation detail',
          },
          { status: 400 },
        ),
      ),
    );

    renderRoute('/sign-in');
    await user.type(await screen.findByLabelText('Email'), 'alex@example.test');
    await user.type(screen.getByLabelText('Password'), 'not-the-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(
      screen.queryByText('Synthetic backend implementation detail'),
    ).not.toBeInTheDocument();
  });

  it('keeps the submit action disabled while sign-in is pending', async () => {
    const user = userEvent.setup();
    const request = createDeferred<void>();
    server.use(
      http.post(`${API_URL}/auth/sessions`, async () => {
        await request.promise;
        return HttpResponse.json(accountSession);
      }),
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
    );

    renderRoute('/sign-in');
    await user.type(
      await screen.findByLabelText('Email'),
      accountSession.email,
    );
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('button', { name: 'Signing in…' }),
    ).toBeDisabled();
    request.resolve();
    expect(
      await screen.findByRole('heading', { name: 'Patients' }),
    ).toBeVisible();
  });

  it('reports a request deadline through the existing network error', async () => {
    const user = userEvent.setup();
    const timeout = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
    server.use(
      http.post(`${API_URL}/auth/sessions`, async () => {
        await delay('infinite');
        return HttpResponse.json(accountSession);
      }),
    );

    renderRoute('/sign-in');
    await user.type(
      await screen.findByLabelText('Email'),
      accountSession.email,
    );
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('button', { name: 'Signing in…' }),
    ).toBeDisabled();
    timeout.abort(new DOMException('Synthetic timeout.', 'TimeoutError'));
    expect(
      await screen.findByText(
        'The service is temporarily unavailable. Please try again.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('rejects an external redirect and navigates to the patient directory', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${API_URL}/auth/sessions`, () =>
        HttpResponse.json(accountSession),
      ),
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
    );

    const { router } = renderRoute(
      '/sign-in?redirect=https%3A%2F%2Fevil.example%2Fcapture',
    );
    await user.type(
      await screen.findByLabelText('Email'),
      accountSession.email,
    );
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Patients' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/patients');
  });

  it('validates password confirmation before account creation', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    server.use(
      http.post(`${API_URL}/auth/accounts`, () => {
        requestCount += 1;
        return HttpResponse.json(accountSession, { status: 201 });
      }),
    );

    renderRoute('/sign-up');
    await user.type(
      await screen.findByLabelText('Email'),
      accountSession.email,
    );
    await user.type(screen.getByLabelText('Password'), 'long-password');
    await user.type(
      screen.getByLabelText('Confirm password'),
      'other-password',
    );
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByText('Enter the same password in both fields.'),
    ).toBeVisible();
    expect(requestCount).toBe(0);
  });

  it('creates an account without sending the confirmation field', async () => {
    const user = userEvent.setup();
    let submittedBody: unknown;
    server.use(
      http.post(`${API_URL}/auth/accounts`, async ({ request }) => {
        submittedBody = await request.json();
        return HttpResponse.json(accountSession, { status: 201 });
      }),
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
    );
    renderRoute('/sign-up');

    await user.type(
      await screen.findByLabelText('Email'),
      accountSession.email,
    );
    await user.type(screen.getByLabelText('Password'), 'long-password');
    await user.type(screen.getByLabelText('Confirm password'), 'long-password');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(
      await screen.findByRole('heading', { name: 'Patients' }),
    ).toBeVisible();
    expect(submittedBody).toEqual({
      email: accountSession.email,
      password: 'long-password',
    });
  });
});
