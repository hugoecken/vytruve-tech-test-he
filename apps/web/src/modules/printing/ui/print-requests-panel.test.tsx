import { HttpResponse, http } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { PrintRequestOverlay } from '@/modules/printing/ui/print-request-overlay';
import { PrintRequestsPanel } from '@/modules/printing/ui/print-requests-panel';
import { createDeferred } from '@/test/deferred';
import {
  API_URL,
  pageInfo,
  patient,
  printRequest,
  problem,
  scan,
} from '@/test/fixtures';
import { renderWithQueryClient } from '@/test/render';
import { server } from '@/test/server';

const PRINTS_URL = `${API_URL}/patients/${patient.id}/print-requests`;
const STATUSES_URL = `${PRINTS_URL}/statuses`;
const CREATE_URL = `${API_URL}/patients/${patient.id}/scans/${scan.id}/print-requests`;

const completedRequest = {
  ...printRequest,
  estimatedProgress: 100,
  id: '55555555-5555-4555-8555-555555555555',
  reference: 'VRV987654321',
  status: 'completed' as const,
};

/** Renders the tracking collection with isolated callback boundaries. */
function renderPrintRequestsPanel() {
  return renderWithQueryClient(
    <PrintRequestsPanel
      acceptedRequest={null}
      active
      notice={null}
      onAuthenticationRequired={vi.fn()}
      onPatientUnavailable={vi.fn()}
      onShowScans={vi.fn()}
      patientId={patient.id}
    />,
  );
}

describe('print requests', () => {
  it('shows persisted rows immediately and skeletons only active status fields', async () => {
    const user = userEvent.setup();
    const statuses = createDeferred<void>();
    server.use(
      http.get(PRINTS_URL, () =>
        HttpResponse.json({
          items: [printRequest, completedRequest],
          pageInfo: pageInfo(),
        }),
      ),
      http.get(STATUSES_URL, async () => {
        await statuses.promise;
        return HttpResponse.json({
          items: [printRequest, completedRequest],
          pageInfo: pageInfo(),
        });
      }),
    );

    renderPrintRequestsPanel();

    expect(await screen.findByText(printRequest.reference)).toBeVisible();
    expect(screen.getByText(completedRequest.reference)).toBeVisible();
    expect(screen.getAllByText('Refreshing statuses')).toHaveLength(2);
    expect(screen.getByLabelText('Completed')).toBeVisible();
    expect(screen.getByLabelText('Estimated progress: 100%')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Refresh statuses' }),
    ).toBeDisabled();

    statuses.resolve();
    expect(await screen.findByLabelText('In progress')).toBeVisible();
    expect(screen.queryByText('Refreshing statuses')).not.toBeInTheDocument();

    await user.click(
      screen.getByLabelText(`View print request ${printRequest.reference}`),
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('40%');
    expect(within(dialog).queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('keeps persisted status data and offers one manual refresh after provider failure', async () => {
    const user = userEvent.setup();
    let statusAttempts = 0;
    server.use(
      http.get(PRINTS_URL, () =>
        HttpResponse.json({ items: [printRequest], pageInfo: pageInfo() }),
      ),
      http.get(STATUSES_URL, () => {
        statusAttempts += 1;
        return statusAttempts === 1
          ? HttpResponse.json(problem('PRINTING_UNAVAILABLE', 503), {
              status: 503,
            })
          : HttpResponse.json({
              items: [{ ...printRequest, estimatedProgress: 60 }],
              pageInfo: pageInfo(),
            });
      }),
    );

    renderPrintRequestsPanel();

    expect(
      await screen.findByText('Print requests could not be refreshed'),
    ).toBeVisible();
    expect(screen.getByLabelText('In progress')).toBeVisible();
    const refresh = screen.getByRole('button', { name: 'Refresh statuses' });
    expect(refresh).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();

    await user.click(refresh);
    expect(
      await screen.findByLabelText('Estimated progress: 60%'),
    ).toBeVisible();
    expect(
      screen.queryByText('Print requests could not be refreshed'),
    ).not.toBeInTheDocument();
    expect(statusAttempts).toBe(2);
  });

  it('recovers explicitly from an initial list failure', async () => {
    const user = userEvent.setup();
    let listAttempts = 0;
    server.use(
      http.get(PRINTS_URL, () => {
        listAttempts += 1;
        return listAttempts === 1
          ? HttpResponse.json(problem('INTERNAL_ERROR', 500), { status: 500 })
          : HttpResponse.json({ items: [], pageInfo: pageInfo() });
      }),
    );

    renderPrintRequestsPanel();

    expect(
      await screen.findByText(/Unable to load print requests/i),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Refresh statuses' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No print requests yet')).toBeVisible();
  });

  it('disables a submission in flight and surfaces the confirmed request once', async () => {
    const user = userEvent.setup();
    const onAccepted = vi.fn();
    const request = createDeferred<void>();
    server.use(
      http.post(CREATE_URL, async () => {
        await request.promise;
        return HttpResponse.json(printRequest, { status: 201 });
      }),
    );

    renderWithQueryClient(
      <PrintRequestOverlay
        onAccepted={onAccepted}
        onAuthenticationRequired={vi.fn()}
        onClose={vi.fn()}
        onPatientUnavailable={vi.fn()}
        onReconcileRequired={vi.fn()}
        onScanUnavailable={vi.fn()}
        patientId={patient.id}
        scan={scan}
      />,
    );
    await user.click(
      await screen.findByRole('button', { name: 'Request printing' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Requesting…' }),
    ).toBeDisabled();
    request.resolve();
    await waitFor(() => expect(onAccepted).toHaveBeenCalledOnce());
    expect(onAccepted).toHaveBeenCalledWith(printRequest);
  });

  it('reconciles a duplicate without repeating the non-idempotent submission', async () => {
    const user = userEvent.setup();
    const onReconcileRequired = vi.fn();
    let requestCount = 0;
    server.use(
      http.post(CREATE_URL, () => {
        requestCount += 1;
        return HttpResponse.json(problem('PRINT_REQUEST_CONFLICT', 409), {
          status: 409,
        });
      }),
    );

    renderWithQueryClient(
      <PrintRequestOverlay
        onAccepted={vi.fn()}
        onAuthenticationRequired={vi.fn()}
        onClose={vi.fn()}
        onPatientUnavailable={vi.fn()}
        onReconcileRequired={onReconcileRequired}
        onScanUnavailable={vi.fn()}
        patientId={patient.id}
        scan={scan}
      />,
    );
    await user.click(
      await screen.findByRole('button', { name: 'Request printing' }),
    );

    await waitFor(() =>
      expect(onReconcileRequired).toHaveBeenCalledWith('conflict'),
    );
    expect(requestCount).toBe(1);
  });

  it('reconciles an ambiguous server outcome instead of offering a blind retry', async () => {
    const user = userEvent.setup();
    const onReconcileRequired = vi.fn();
    let requestCount = 0;
    server.use(
      http.post(CREATE_URL, () => {
        requestCount += 1;
        return HttpResponse.json(problem('INTERNAL_ERROR', 500), {
          status: 500,
        });
      }),
    );

    renderWithQueryClient(
      <PrintRequestOverlay
        onAccepted={vi.fn()}
        onAuthenticationRequired={vi.fn()}
        onClose={vi.fn()}
        onPatientUnavailable={vi.fn()}
        onReconcileRequired={onReconcileRequired}
        onScanUnavailable={vi.fn()}
        patientId={patient.id}
        scan={scan}
      />,
    );
    await user.click(
      await screen.findByRole('button', { name: 'Request printing' }),
    );

    await waitFor(() =>
      expect(onReconcileRequired).toHaveBeenCalledWith('uncertain'),
    );
    expect(requestCount).toBe(1);
  });
});
