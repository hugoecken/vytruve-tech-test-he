import * as React from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { CircleAlertIcon, PrinterIcon, RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollectionLoadError } from '@/modules/collections/ui/collection-load-error';
import { CollectionRecoveryAlert } from '@/modules/collections/ui/collection-recovery-alert';
import { CollectionTableShell } from '@/modules/collections/ui/collection-table-shell';
import {
  isActivePrintRequestStatus,
  PRINT_REQUEST_PAGE_SIZE,
} from '@/modules/printing/config/printing';
import { usePrintRequestPolling } from '@/modules/printing/hooks/use-print-request-polling';
import { useListPatientPrintRequests } from '@/shared/api/generated/client/printing/printing';
import type { PrintRequestPageResponse } from '@/shared/api/generated/models/printRequestPageResponse';
import type { PrintRequestResponse } from '@/shared/api/generated/models/printRequestResponse';
import type { PrintRequestStatus } from '@/shared/api/generated/models/printRequestStatus';
import { ApiProblemError } from '@/shared/api/http/api-error';
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
import { Skeleton } from '@/shared/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
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
}: PrintRequestsPanelProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [requestedPage, setRequestedPage] = React.useState(0);
  const confirmedData = React.useRef<PrintRequestPageResponse | undefined>(
    undefined,
  );
  const query = useListPatientPrintRequests(
    patientId,
    { page: requestedPage, pageSize: PRINT_REQUEST_PAGE_SIZE },
    {
      query: {
        placeholderData: keepPreviousData,
        select: (response) => response.data,
      },
    },
  );

  React.useEffect(() => {
    if (
      query.data !== undefined &&
      !query.isPlaceholderData &&
      !query.isError
    ) {
      confirmedData.current = query.data;
    }
  }, [query.data, query.isError, query.isPlaceholderData]);

  const authenticationRequired =
    query.error instanceof ApiProblemError &&
    query.error.problem.code === 'AUTHENTICATION_REQUIRED';
  const patientUnavailable =
    query.error instanceof ApiProblemError &&
    query.error.problem.code === 'PATIENT_NOT_FOUND';
  React.useEffect(() => {
    if (authenticationRequired) {
      onAuthenticationRequired();
    }
  }, [authenticationRequired, onAuthenticationRequired]);
  React.useEffect(() => {
    if (patientUnavailable) {
      onPatientUnavailable();
    }
  }, [onPatientUnavailable, patientUnavailable]);

  const data = query.data ?? confirmedData.current;
  const confirmedPage = data?.pageInfo.page ?? 0;
  const pageFailed =
    query.isError && data !== undefined && requestedPage !== confirmedPage;
  const refreshFailed =
    query.isError && data !== undefined && requestedPage === confirmedPage;
  let items = data?.items ?? EMPTY_PRINT_REQUESTS;
  if (
    acceptedRequest !== null &&
    (data === undefined || confirmedPage === 0) &&
    !items.some((item) => item.id === acceptedRequest.id)
  ) {
    items = [acceptedRequest, ...items];
  }
  const acceptedWithoutPage = acceptedRequest !== null && data === undefined;
  const hasActiveRequests = items.some((item) =>
    isActivePrintRequestStatus(item.status),
  );
  const refetch = query.refetch;
  /** Performs the safe GET used by the bounded polling window. */
  const refreshAutomatically = React.useCallback((): void => {
    void refetch();
  }, [refetch]);
  const polling = usePrintRequestPolling({
    enabled:
      active && data !== undefined && hasActiveRequests && !query.isError,
    onRefresh: refreshAutomatically,
    restartKey: acceptedRequest?.id ?? null,
  });
  /** Retries the collection and reopens polling after a successful manual GET. */
  const refresh = async (): Promise<void> => {
    const result = await refetch();
    if (!result.isError) {
      polling.restart();
    }
  };

  const columns = React.useMemo(
    () =>
      printColumnHelper.columns([
        printColumnHelper.accessor('reference', {
          header: t('printing.table.reference'),
        }),
        printColumnHelper.accessor(
          (request) => formatScanName(request.scanId),
          {
            header: t('printing.table.scan'),
            id: 'scan',
          },
        ),
        printColumnHelper.accessor('status', {
          cell: ({ getValue }) => <PrintStatusBadge status={getValue()} />,
          header: t('printing.table.status'),
        }),
        printColumnHelper.display({
          cell: ({ row }) => <PrintProgress request={row.original} />,
          header: t('printing.table.progress'),
          id: 'progress',
        }),
        printColumnHelper.display({
          cell: ({ row }) => formatTiming(row.original, i18n.language, t),
          header: t('printing.table.timing'),
          id: 'timing',
        }),
      ]),
    [i18n.language, t],
  );
  const table = useTable({
    features: printTableFeatures,
    columns,
    data: items,
  });
  const tableContent = (
    <PrintRequestsTable caption={t('printing.table.caption')} table={table} />
  );

  return (
    <section
      aria-label={t('printing.title')}
      className="flex flex-col gap-6"
    >
      <div className="relative flex flex-col gap-3">
        <p className="text-sm leading-[25px] text-muted-foreground sm:max-w-[47.5rem]">
          {t('printing.description')}
        </p>
        {polling.expired && hasActiveRequests && (
          <Button
            className="sm:absolute sm:-top-1 sm:right-0"
            disabled={query.isFetching}
            onClick={() => void refresh()}
            size="lg"
            type="button"
            variant="outline"
          >
            <RefreshCwIcon
              aria-hidden="true"
              className={query.isFetching ? 'animate-spin' : undefined}
              data-icon="inline-start"
            />
            {t('printing.refresh.action')}
          </Button>
        )}
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

      {query.isPending && acceptedRequest === null && (
        <PrintRequestsTableLoading loadingLabel={t('common.status.loading')} />
      )}

      {query.isError && data === undefined && acceptedRequest === null && (
        <CollectionLoadError
          description={t('collections.load.description')}
          onRetry={() => void refresh()}
          pending={query.isFetching}
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
          {query.isError && (
            <CollectionRecoveryAlert
              description={t('collections.refresh.description')}
              onRetry={() => void refresh()}
              pending={query.isFetching}
              retryLabel={t('common.actions.refresh')}
              title={t('collections.refresh.title', {
                collection: t('printing.collection'),
              })}
            />
          )}
          <div
            aria-busy={query.isFetching}
            className="overflow-hidden rounded-xl border bg-card"
          >
            {tableContent}
          </div>
        </div>
      )}

      {data !== undefined && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {pageFailed && (
            <CollectionRecoveryAlert
              description={t('collections.page.description')}
              onRetry={() => void refresh()}
              pending={query.isFetching}
              retryLabel={t('common.actions.refresh')}
              title={t('collections.page.title')}
            />
          )}
          {refreshFailed && (
            <CollectionRecoveryAlert
              description={t('collections.refresh.description')}
              onRetry={() => void refresh()}
              pending={query.isFetching}
              retryLabel={t('common.actions.refresh')}
              title={t('collections.refresh.title', {
                collection: t('printing.collection'),
              })}
            />
          )}
          <CollectionTableShell
            hasNext={data.pageInfo.hasNext}
            nextLabel={t('collections.pagination.next')}
            onNext={() => setRequestedPage(confirmedPage + 1)}
            onPrevious={() => setRequestedPage(confirmedPage - 1)}
            page={confirmedPage}
            pageLabel={t('collections.pagination.page', {
              page: confirmedPage + 1,
            })}
            pending={query.isFetching || pageFailed}
            previousLabel={t('collections.pagination.previous')}
          >
            {tableContent}
          </CollectionTableShell>
        </div>
      )}
    </section>
  );
}

/** Props for the feature-owned TanStack print-request table. */
interface PrintRequestsTableProps {
  caption: string;
  table: ReturnType<
    typeof useTable<typeof printTableFeatures, PrintRequestResponse>
  >;
}

/** Renders print-request rows with Figma-approved responsive disclosure. */
function PrintRequestsTable({
  caption,
  table,
}: PrintRequestsTableProps): React.JSX.Element {
  return (
    <Table className="table-fixed">
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader className="bg-muted/70">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow className="h-10" key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                className={getResponsiveColumnClass(header.column.id)}
                key={header.id}
              >
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
          <TableRow className="h-12" key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell
                className={getResponsiveColumnClass(cell.column.id)}
                key={cell.id}
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Renders the canonical status with text and a visible shape marker. */
function PrintStatusBadge({
  status,
}: {
  status: PrintRequestStatus;
}): React.JSX.Element {
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

/** Renders Estimated progress without implying progress for nullable states. */
function PrintProgress({
  request,
}: {
  request: PrintRequestResponse;
}): React.JSX.Element {
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

  const formatted = new Intl.NumberFormat(i18n.language, {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(value / 100);
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

/** Creates a safe scan label without exposing the uploaded filename. */
function formatScanName(scanId: string): string {
  return `SCN-${scanId.replace(/-/g, '').slice(-6).toUpperCase()}`;
}

/** Hides secondary print metadata at the compact Figma breakpoint. */
function getResponsiveColumnClass(columnId: string): string | undefined {
  if (columnId === 'reference') {
    return 'w-[30.727%] md:w-1/5';
  }
  if (columnId === 'scan') {
    return 'hidden md:table-cell md:w-[18.333%]';
  }
  if (columnId === 'status') {
    return 'w-[30.727%] md:w-[18.333%]';
  }
  if (columnId === 'progress') {
    return 'w-[38.546%] md:w-[23.334%]';
  }
  if (columnId === 'timing') {
    return 'hidden md:table-cell md:w-1/5';
  }
  return undefined;
}

/** Renders initial print-request loading without provisional rows. */
function PrintRequestsTableLoading({
  loadingLabel,
}: {
  loadingLabel: string;
}): React.JSX.Element {
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
