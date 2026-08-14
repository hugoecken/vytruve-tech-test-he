import { HttpResponse, delay, http } from 'msw';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import {
  cacheAccountSession,
  getCachedAccountSession,
} from '@/modules/auth/api/session-cache';
import { SessionBoundary } from '@/modules/auth/ui/session-boundary';
import { router } from '@/router';
import { queryClient } from '@/shared/query/query-client';
import { API_URL, accountSession, pageInfo, problem } from '@/test/fixtures';
import { renderWithQueryClient } from '@/test/render';
import { server } from '@/test/server';

describe('session restoration', () => {
  it('announces restoration while the cookie session is loading', async () => {
    server.use(
      http.get(`${API_URL}/auth/session`, async () => {
        await delay('infinite');
        return HttpResponse.json(null);
      }),
    );

    renderWithQueryClient(<SessionBoundary />);

    expect(
      await screen.findByRole('main', { name: 'Restoring your session' }),
    ).toBeVisible();
  });

  it('offers an explicit retry for a temporary restoration failure', async () => {
    const user = userEvent.setup();
    let requestCount = 0;
    server.use(
      http.get(`${API_URL}/auth/session`, () => {
        requestCount += 1;
        return HttpResponse.json(problem('INTERNAL_ERROR', 500), {
          status: 500,
        });
      }),
    );

    renderWithQueryClient(<SessionBoundary />);

    expect(
      await screen.findByText('Your workspace is temporarily unavailable'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(requestCount).toBe(2));
  });

  it('treats an unauthenticated response as a public session outcome', async () => {
    server.use(
      http.get(`${API_URL}/auth/session`, () =>
        HttpResponse.json(problem('AUTHENTICATION_REQUIRED', 401), {
          status: 401,
        }),
      ),
    );

    renderWithQueryClient(<SessionBoundary />);

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    expect(
      screen.queryByText('Your workspace is temporarily unavailable'),
    ).not.toBeInTheDocument();
  });

  it('expires account state and returns safely to sign-in', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T10:00:00.000Z'));
    const expiringSession = {
      ...accountSession,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    cacheAccountSession(queryClient, expiringSession);
    server.use(
      http.get(`${API_URL}/patients`, () =>
        HttpResponse.json({ items: [], pageInfo: pageInfo() }),
      ),
    );
    router.history.push('/patients');

    renderWithQueryClient(<SessionBoundary />, queryClient);

    expect(getCachedAccountSession(queryClient)).toEqual(expiringSession);
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    expect(getCachedAccountSession(queryClient)).toBeNull();
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(router.state.location.search).toEqual({ redirect: '/patients' });
  });
});
