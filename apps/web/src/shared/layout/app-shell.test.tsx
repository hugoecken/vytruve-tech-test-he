import { HttpResponse, http } from 'msw';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { API_URL, accountSession, pageInfo } from '@/test/fixtures';
import { renderRoute } from '@/test/render';
import { server } from '@/test/server';

describe('application shell', () => {
  it('returns an unauthenticated unknown route to sign-in safely', async () => {
    const user = userEvent.setup();
    const { router } = renderRoute('/missing-page');

    expect(
      await screen.findByRole('heading', {
        name: 'This page took a wrong turn',
      }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Back to sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('returns an authenticated unknown route to patients', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
    );
    const { router } = renderRoute('/missing-page', {
      session: accountSession,
    });

    await user.click(
      await screen.findByRole('button', { name: 'Back to patients' }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Patients' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/patients');
  });

  it('exposes named shell controls and keeps the document language synchronized', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
    );
    renderRoute('/patients', { session: accountSession });

    expect(
      await screen.findByRole('link', { name: 'Go to home' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Open account menu' }));
    const languageItem = await screen.findByRole('menuitem', {
      name: 'Language',
    });
    await user.hover(languageItem);
    // Base UI leaves the animated submenu non-interactive in jsdom.
    fireEvent.click(
      await screen.findByRole('menuitemradio', { name: 'French' }),
    );

    await waitFor(() => expect(document.documentElement.lang).toBe('fr'));
    expect(screen.getByRole('heading', { name: 'Patients' })).toBeVisible();
  });

  it('clears the session and redirects after logout', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
      http.delete(
        `${API_URL}/auth/session`,
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    const { queryClient, router } = renderRoute('/patients', {
      session: accountSession,
    });

    await user.click(
      await screen.findByRole('button', { name: 'Open account menu' }),
    );
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});
