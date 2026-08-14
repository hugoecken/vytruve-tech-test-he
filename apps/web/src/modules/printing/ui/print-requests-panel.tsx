import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { CircleAlertIcon, PrinterIcon, RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollectionLoadError } from '@/modules/collections/ui/collection-load-error';
import { CollectionTableShell } from '@/modules/collections/ui/collection-table-shell';
import {
  isActivePrintRequestStatus,
  PRINT_REQUEST_PAGE_SIZE,
} from '@/modules/printing/config/printing';
import { formatScanLabel } from '@/modules/scans/lib/scan-formatters';
import {
  useListPatientPrintRequests,
  useRefreshPatientPrintRequests,
} from '@/shared/api/generated/client/printing/printing';
import type { PrintRequestResponse } from '@/shared/api/generated/models/printRequestResponse';
import type { PrintRequestStatus } from '@/shared/api/generated/models/printRequestStatus';
import { ApiProblemError } from '@/shared/api/http/api-error';
import { cn } from '@/shared/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/empty';
import { Progress } from '@/shared/ui/progress';
import {
  DetailItem,
  DetailList,
  ResponsiveDetailsOverlay,
} from '@/shared/ui/responsive-details-overlay';
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  InteractiveTableRow,
  TableRow,
} from '@/shared/ui/table';

const EMPTY_PRINT_REQUESTS: PrintRequestResponse[] = [];
const printTableFeatures = tableFeatures({});
const printColumnHelper = createColumnHelper<
  typeof printTableFeatures,
  PrintRequestResponse
>();

/** Props for the patient print-request collection. */
interface PrintRequestsPanelProps {
  acceptedRequest: PrintRequestResponse | null;
  active: boolean;
  notice: 'conflict' | 'uncertain' | null;
  onAuthenticationRequired: () => void;
  onPatientUnavailable: () => void;
  onShowScans: () => void;
  patientId: string;
}

/**
 * Lists and safely refreshes one patient's print requests.
 *
 * @param props Patient scope, active-tab state and safe workspace transitions.
 * @returns The responsive lifecycle table and its local recovery states.
 */
export function PrintRequestsPanel({
  acceptedRequest,
  active,
  notice,
  onAuthenticationRequired,
  onPatientUnavailable,
  onShowScans,
  patientId,
}: PrintRequestsPanelProps) {
  const { i18n, t } = useTranslation();
  const [requestedPage, setRequestedPage] = useState(0);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [manualRefreshPending, setManualRefreshPending] = useState(false);
  const listQuery = useListPatientPrintRequests(
    patientId,
    { page: requestedPage, pageSize: PRINT_REQUEST_PAGE_SIZE },
    {
      query: {
        enabled: active,
        placeholderData: keepPreviousData,
        select: (response) => response.data,
      },
    },
  );
  const statusQuery = useRefreshPatientPrintRequests(
    patientId,
    { page: requestedPage, pageSize: PRINT_REQUEST_PAGE_SIZE },
    {
      query: {
        enabled:
          active &&
          listQuery.data !== undefined &&
          !listQuery.isPlaceholderData &&
          listQuery.data.items.length > 0,
        retry: false,
        select: (response) => response.data,
      },
    },
  );

  usePrintRequestAccessRecovery(
    statusQuery.error ?? listQuery.error,
    onAuthenticationRequired,
    onPatientUnavailable,
  );

  const persistedData = listQuery.data;
  const data = statusQuery.data ?? persistedData;
  const loadFailed = listQuery.isError && persistedData === undefined;
  let items = data?.items ?? EMPTY_PRINT_REQUESTS;
  if (
    acceptedRequest !== null &&
    (data === undefined || data.pageInfo.page === 0) &&
    !items.some((item) => item.id === acceptedRequest.id)
  ) {
    items = [acceptedRequest, ...items];
  }
  const acceptedWithoutPage =
    acceptedRequest !== null && persistedData === undefined && !loadFailed;
  const statusRefreshPending = statusQuery.isFetching;

  /** Runs the provider refresh with feedback reserved for user activation. */
  const refreshStatusesManually = async (): Promise<void> => {
    if (statusQuery.isFetching) {
      return;
    }
    setManualRefreshPending(true);
    try {
      await statusQuery.refetch();
    } finally {
      setManualRefreshPending(false);
    }
  };

  const columns = useMemo(
    () =>
      printColumnHelper.columns([
        printColumnHelper.accessor('reference', {
          header: t('printing.table.reference'),
        }),
        printColumnHelper.accessor(
          (request) => formatScanLabel(request.scanId),
          {
            header: t('printing.table.scan'),
            id: 'scan',
          },
        ),
        printColumnHelper.accessor('status', {
          cell: ({ getValue, row }) =>
            statusRefreshPending &&
            isActivePrintRequestStatus(row.original.status) ? (
              <PrintStatusSkeleton
                loadingLabel={t('printing.refresh.loading')}
              />
            ) : (
              <PrintStatusBadge status={getValue()} />
            ),
          header: t('printing.table.status'),
        }),
        printColumnHelper.display({
          cell: ({ row }) =>
            statusRefreshPending &&
            isActivePrintRequestStatus(row.original.status) ? (
              <PrintProgressSkeleton
                loadingLabel={t('printing.refresh.loading')}
              />
            ) : (
              <PrintProgress request={row.original} />
            ),
          header: t('printing.table.progress'),
          id: 'progress',
        }),
        printColumnHelper.display({
          cell: ({ row }) => formatTiming(row.original, i18n.language, t),
          header: t('printing.table.timing'),
          id: 'timing',
        }),
      ]),
    [i18n.language, statusRefreshPending, t],
  );
  const selectedRequest =
    items.find((request) => request.id === selectedRequestId) ?? null;
  const table = useTable({
    features: printTableFeatures,
    columns,
    data: items,
  });
  const tableContent = (
    <Table>
      <TableCaption className="sr-only">
        {t('printing.table.caption')}
      </TableCaption>
      <TableHeader className="bg-muted/70">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="h-10" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : (
                  <table.FlexRender header={header} />
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <InteractiveTableRow
            aria-label={t('printing.details.action', {
              reference: row.original.reference,
            })}
            className="h-12"
            key={row.id}
            onActivate={() => setSelectedRequestId(row.original.id)}
          >
            {row.getAllCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </InteractiveTableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <section aria-label={t('printing.title')} className="flex flex-col gap-6">
      <div className="relative flex flex-col gap-3">
        <p className="text-sm leading-[25px] text-muted-foreground sm:max-w-[47.5rem]">
          {t('printing.description')}
        </p>
        <Button
          className="sm:absolute sm:-top-1 sm:right-0"
          disabled={persistedData === undefined || statusRefreshPending}
          onClick={() => void refreshStatusesManually()}
          size="lg"
          type="button"
          variant="outline"
        >
          <RefreshCwIcon
            aria-hidden="true"
            className={cn(manualRefreshPending && 'animate-spin')}
            data-icon="inline-start"
          />
          {t('printing.refresh.action')}
        </Button>
      </div>

      {acceptedRequest !== null && (
        <p aria-live="polite" className="sr-only" role="status">
          {t('printing.create.accepted', {
            reference: acceptedRequest.reference,
          })}
        </p>
      )}

      {notice !== null && (
        <Alert>
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>{t(`printing.notice.${notice}Title`)}</AlertTitle>
          <AlertDescription>
            {t(`printing.notice.${notice}Description`)}
          </AlertDescription>
        </Alert>
      )}

      {listQuery.isPending && acceptedRequest === null && (
        <PrintRequestsTableLoading loadingLabel={t('common.status.loading')} />
      )}

      {loadFailed && (
        <CollectionLoadError
          description={t('collections.load.description')}
          onRetry={() => void listQuery.refetch()}
          pending={listQuery.isFetching}
          retryLabel={t('common.actions.retry')}
          title={t('collections.load.title', {
            collection: t('printing.collection').toLowerCase(),
          })}
        />
      )}

      {data !== undefined && items.length === 0 && (
        <Empty className="min-h-64 rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PrinterIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t('printing.empty.title')}</EmptyTitle>
            <EmptyDescription>
              {t('printing.empty.description')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={onShowScans} type="button" variant="outline">
              {t('printing.empty.action')}
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {acceptedWithoutPage && (
        <div className="flex flex-col gap-3">
          <div
            aria-busy={listQuery.isFetching || statusRefreshPending}
            className="overflow-hidden rounded-xl border bg-card"
          >
            {tableContent}
          </div>
        </div>
      )}

      {data !== undefined && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {statusQuery.isError && (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle>
                {t('collections.refresh.title', {
                  collection: t('printing.collection'),
                })}
              </AlertTitle>
              <AlertDescription>
                {t('collections.refresh.description')}
              </AlertDescription>
            </Alert>
          )}
          <CollectionTableShell
            hasNext={data.pageInfo.hasNext}
            nextLabel={t('collections.pagination.next')}
            onNext={() => setRequestedPage(data.pageInfo.page + 1)}
            onPrevious={() => setRequestedPage(data.pageInfo.page - 1)}
            page={data.pageInfo.page}
            pageLabel={t('collections.pagination.page', {
              page: data.pageInfo.page + 1,
            })}
            pending={listQuery.isFetching}
            previousLabel={t('collections.pagination.previous')}
          >
            {tableContent}
          </CollectionTableShell>
        </div>
      )}

      <PrintRequestDetailsOverlay
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequestId(null);
          }
        }}
        request={selectedRequest}
      />
    </section>
  );
}

/** Props for the read-only print-request consultation overlay. */
interface PrintRequestDetailsOverlayProps {
  onOpenChange: (open: boolean) => void;
  request: PrintRequestResponse | null;
}

/**
 * Presents the latest safe print-request lifecycle information from the table.
 *
 * @param props Selected request and controlled close action.
 * @returns A responsive read-only print-request consultation overlay.
 */
function PrintRequestDetailsOverlay({
  onOpenChange,
  request,
}: PrintRequestDetailsOverlayProps) {
  const { i18n, t } = useTranslation();
  const estimatedProgress =
    request === null ? null : getEstimatedProgress(request);

  return (
    <ResponsiveDetailsOverlay
      closeLabel={t('common.actions.close')}
      description={t('printing.details.description')}
      onOpenChange={onOpenChange}
      open={request !== null}
      title={
        request === null
          ? t('printing.details.title')
          : t('printing.details.titleNamed', {
              reference: request.reference,
            })
      }
    >
      {request !== null && (
        <DetailList>
          <DetailItem label={t('printing.details.fields.reference')}>
            <span className="font-mono text-xs">{request.reference}</span>
          </DetailItem>
          <DetailItem label={t('printing.details.fields.scan')}>
            {formatScanLabel(request.scanId)}
          </DetailItem>
          <DetailItem label={t('printing.details.fields.status')}>
            <PrintStatusBadge status={request.status} />
          </DetailItem>
          <DetailItem label={t('printing.details.fields.progress')}>
            {estimatedProgress === null ? (
              <span>
                <span aria-hidden="true">—</span>
                <span className="sr-only">
                  {t('printing.progress.unavailable')}
                </span>
              </span>
            ) : (
              <span className="tabular-nums">
                {formatEstimatedProgress(estimatedProgress, i18n.language)}
              </span>
            )}
          </DetailItem>
          <DetailItem label={t('printing.details.fields.requested')}>
            {formatDateTime(request.createdAt, i18n.language)}
          </DetailItem>
          <DetailItem label={t('printing.details.fields.start')}>
            {formatOptionalDateTime(request.scheduledStartAt, i18n.language, t)}
          </DetailItem>
          <DetailItem label={t('printing.details.fields.end')}>
            {formatOptionalDateTime(request.scheduledEndAt, i18n.language, t)}
          </DetailItem>
          <DetailItem label={t('printing.details.fields.updated')}>
            {formatOptionalDateTime(request.lastObservedAt, i18n.language, t)}
          </DetailItem>
        </DetailList>
      )}
    </ResponsiveDetailsOverlay>
  );
}

/**
 * Synchronizes collection access failures with the owning workspace boundary.
 *
 * @param error Safe query error produced by the generated collection hook.
 * @param onAuthenticationRequired Recovery action for an expired session.
 * @param onPatientUnavailable Recovery action for a concealed patient scope.
 */
function usePrintRequestAccessRecovery(
  error: unknown,
  onAuthenticationRequired: () => void,
  onPatientUnavailable: () => void,
): void {
  useEffect(() => {
    if (!(error instanceof ApiProblemError)) {
      return;
    }

    if (error.problem.code === 'AUTHENTICATION_REQUIRED') {
      onAuthenticationRequired();
    } else if (error.problem.code === 'PATIENT_NOT_FOUND') {
      onPatientUnavailable();
    }
  }, [error, onAuthenticationRequired, onPatientUnavailable]);
}

/** Renders the canonical status with text and a visible shape marker. */
function PrintStatusBadge({ status }: { status: PrintRequestStatus }) {
  const { t } = useTranslation();
  const label = t(`printing.status.${status}`);
  return (
    <Badge aria-label={label} title={label} variant={getStatusVariant(status)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      <span className="hidden md:inline">{label}</span>
      <span className="md:hidden">{t(`printing.statusCompact.${status}`)}</span>
    </Badge>
  );
}

/** Shows the status placeholder while provider reconciliation is pending. */
function PrintStatusSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <span className="inline-flex items-center">
      <Skeleton aria-hidden="true" className="h-6 w-24 rounded-full" />
      <span className="sr-only">{loadingLabel}</span>
    </span>
  );
}

/** Shows the Estimated progress placeholder during provider reconciliation. */
function PrintProgressSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <span className="inline-flex items-center">
      <Skeleton aria-hidden="true" className="h-4 w-28" />
      <span className="sr-only">{loadingLabel}</span>
    </span>
  );
}

/** Renders Estimated progress without implying progress for nullable states. */
function PrintProgress({ request }: { request: PrintRequestResponse }) {
  const { i18n, t } = useTranslation();
  const value = getEstimatedProgress(request);
  if (value === null) {
    return (
      <span>
        <span aria-hidden="true">—</span>
        <span className="sr-only">{t('printing.progress.unavailable')}</span>
      </span>
    );
  }

  const formatted = formatEstimatedProgress(value, i18n.language);
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 shrink-0 tabular-nums">{formatted}</span>
      <Progress
        aria-label={t('printing.progress.label', { progress: formatted })}
        className="min-w-0 flex-1 flex-nowrap gap-0"
        value={value}
      />
    </div>
  );
}

/** Formats an estimated-progress value for the active interface locale. */
function formatEstimatedProgress(value: number, language: string): string {
  return new Intl.NumberFormat(language, {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(value / 100);
}

/** Resolves a badge variant for every generated print lifecycle value. */
function getStatusVariant(
  status: PrintRequestStatus,
): 'default' | 'destructive' | 'outline' | 'secondary' {
  switch (status) {
    case 'confirmation_pending':
    case 'queued':
      return 'secondary';
    case 'in_progress':
      return 'outline';
    case 'completed':
      return 'default';
    case 'failed':
      return 'destructive';
  }
}

/** Preserves the accepted progress invariant for every lifecycle state. */
function getEstimatedProgress(request: PrintRequestResponse): number | null {
  switch (request.status) {
    case 'confirmation_pending':
    case 'failed':
      return null;
    case 'queued':
      return 0;
    case 'in_progress':
      return request.estimatedProgress === null
        ? null
        : Math.min(Math.max(request.estimatedProgress, 0), 99);
    case 'completed':
      return 100;
  }
}

/** Formats planned production dates or the latest confirmed timing fallback. */
function formatTiming(
  request: PrintRequestResponse,
  language: string,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (request.scheduledStartAt !== null) {
    const start = formatDateTime(request.scheduledStartAt, language);
    if (request.scheduledEndAt !== null) {
      return t('printing.timing.range', {
        end: formatDateTime(request.scheduledEndAt, language),
        start,
      });
    }
    return start;
  }
  if (request.scheduledEndAt !== null) {
    return formatDateTime(request.scheduledEndAt, language);
  }
  if (request.lastObservedAt !== null) {
    return t('printing.timing.updated', {
      date: formatDateTime(request.lastObservedAt, language),
    });
  }
  return t('printing.timing.requested', {
    date: formatDateTime(request.createdAt, language),
  });
}

/** Formats one server instant for the active product language. */
function formatDateTime(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

/** Formats an optional provider instant without inventing timing information. */
function formatOptionalDateTime(
  value: string | null,
  language: string,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  return value === null
    ? t('printing.details.unavailable')
    : formatDateTime(value, language);
}

/** Renders initial print-request loading without provisional rows. */
function PrintRequestsTableLoading({ loadingLabel }: { loadingLabel: string }) {
  return (
    <div
      aria-label={loadingLabel}
      aria-live="polite"
      className="rounded-xl border bg-card p-4"
      role="status"
    >
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
