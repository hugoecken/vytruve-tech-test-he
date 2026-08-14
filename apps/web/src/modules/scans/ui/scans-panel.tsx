import * as React from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import {
  CircleAlertIcon,
  DownloadIcon,
  FileBoxIcon,
  PrinterIcon,
  RefreshCwIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollectionLoadError } from '@/modules/collections/ui/collection-load-error';
import { CollectionRecoveryAlert } from '@/modules/collections/ui/collection-recovery-alert';
import { CollectionTableShell } from '@/modules/collections/ui/collection-table-shell';
import { ScanUploadOverlay } from '@/modules/scans/ui/scan-upload-overlay';
import {
  downloadPatientScan,
  useListPatientScans,
} from '@/shared/api/generated/client/scans/scans';
import type { ScanResponse } from '@/shared/api/generated/models/scanResponse';
import type { ScanPageResponse } from '@/shared/api/generated/models/scanPageResponse';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/empty';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

const SCAN_PAGE_SIZE = 10;
const EMPTY_SCANS: ScanResponse[] = [];
const scanTableFeatures = tableFeatures({});
const scanColumnHelper = createColumnHelper<
  typeof scanTableFeatures,
  ScanResponse
>();

/** Props for the patient scan collection. */
interface ScansPanelProps {
  patientId: string;
}

/**
 * Lists, uploads and downloads patient scans within their ownership context.
 *
 * @param props Parent patient identity used by every generated scan request.
 * @returns The responsive 3D scan collection and workflows.
 */
export function ScansPanel({ patientId }: ScansPanelProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [requestedPage, setRequestedPage] = React.useState(0);
  const confirmedData = React.useRef<ScanPageResponse | undefined>(undefined);
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [downloadFailure, setDownloadFailure] =
    React.useState<ScanResponse | null>(null);
  const query = useListPatientScans(
    patientId,
    { page: requestedPage, pageSize: SCAN_PAGE_SIZE },
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
  const data = query.data ?? confirmedData.current;
  const confirmedPage = data?.pageInfo.page ?? 0;
  const pageFailed =
    query.isError && data !== undefined && requestedPage !== confirmedPage;
  const refreshFailed =
    query.isError && data !== undefined && requestedPage === confirmedPage;

  const download = React.useCallback(
    async (scan: ScanResponse) => {
      if (downloadingId !== null) {
        return;
      }
      setDownloadFailure(null);
      setDownloadingId(scan.id);
      let objectUrl: string | null = null;
      try {
        const response = await downloadPatientScan(patientId, scan.id);
        objectUrl = URL.createObjectURL(response.data);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `vytruve-scan-${scan.id}.ply`;
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } catch {
        setDownloadFailure(scan);
      } finally {
        if (objectUrl !== null) {
          URL.revokeObjectURL(objectUrl);
        }
        setDownloadingId(null);
      }
    },
    [downloadingId, patientId],
  );

  const columns = React.useMemo(
    () =>
      scanColumnHelper.columns([
        scanColumnHelper.accessor((scan) => formatScanName(scan.id), {
          header: t('scans.table.scan'),
          id: 'scan',
        }),
        scanColumnHelper.accessor('format', {
          cell: ({ getValue }) => getValue().toUpperCase(),
          header: t('scans.table.format'),
        }),
        scanColumnHelper.accessor('sizeBytes', {
          cell: ({ getValue }) => formatFileSize(getValue(), i18n.language),
          header: t('scans.table.size'),
        }),
        scanColumnHelper.accessor('createdAt', {
          cell: ({ getValue }) => formatDate(getValue(), i18n.language),
          header: t('scans.table.uploaded'),
        }),
        scanColumnHelper.display({
          cell: ({ row }) => (
            <div className="flex justify-start gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label={t('scans.download.action', {
                        scan: formatScanName(row.original.id),
                      })}
                      className="size-8"
                      disabled={downloadingId !== null}
                      onClick={() => void download(row.original)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    />
                  }
                >
                  {downloadingId === row.original.id ? (
                    <RefreshCwIcon
                      aria-hidden="true"
                      className="animate-spin"
                    />
                  ) : (
                    <DownloadIcon aria-hidden="true" />
                  )}
                </TooltipTrigger>
                <TooltipContent>{t('scans.download.label')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      aria-label={t('scans.printing.unavailable')}
                      className="size-8"
                      disabled
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    />
                  }
                >
                  <PrinterIcon aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>
                  {t('scans.printing.unavailable')}
                </TooltipContent>
              </Tooltip>
            </div>
          ),
          header: t('scans.table.actions'),
          id: 'actions',
        }),
      ]),
    [download, downloadingId, i18n.language, t],
  );
  const table = useTable({
    features: scanTableFeatures,
    columns,
    data: data?.items ?? EMPTY_SCANS,
  });

  return (
    <section
      aria-label={t('scans.title')}
      className="flex flex-col gap-6 sm:gap-8"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm leading-[25px] text-muted-foreground sm:max-w-[47.5rem]">
          {t('scans.description')}
        </p>
        <div className="sm:-translate-y-1">
          <ScanUploadOverlay patientId={patientId} />
        </div>
      </div>

      {query.isPending && (
        <ScansTableLoading loadingLabel={t('common.status.loading')} />
      )}

      {query.isError && data === undefined && (
        <CollectionLoadError
          description={t('collections.load.description')}
          onRetry={() => void query.refetch()}
          pending={query.isFetching}
          retryLabel={t('common.actions.retry')}
          title={t('collections.load.title', {
            collection: t('scans.collection').toLowerCase(),
          })}
        />
      )}

      {data !== undefined && data.items.length === 0 && (
        <Empty className="min-h-64 rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileBoxIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t('scans.empty.title')}</EmptyTitle>
            <EmptyDescription>{t('scans.empty.description')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {data !== undefined && data.items.length > 0 && (
        <div className="flex flex-col gap-3">
          {pageFailed && (
            <CollectionRecoveryAlert
              description={t('collections.page.description')}
              onRetry={() => void query.refetch()}
              pending={query.isFetching}
              retryLabel={t('common.actions.refresh')}
              title={t('collections.page.title')}
            />
          )}
          {refreshFailed && (
            <CollectionRecoveryAlert
              description={t('collections.refresh.description')}
              onRetry={() => void query.refetch()}
              pending={query.isFetching}
              retryLabel={t('common.actions.refresh')}
              title={t('collections.refresh.title', {
                collection: t('scans.collection'),
              })}
            />
          )}
          {downloadFailure !== null && (
            <Alert variant="destructive">
              <CircleAlertIcon aria-hidden="true" />
              <AlertTitle>{t('scans.download.errorTitle')}</AlertTitle>
              <AlertDescription>
                {t('scans.download.errorDescription', {
                  scan: formatScanName(downloadFailure.id),
                })}
              </AlertDescription>
              <AlertAction>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={t('common.actions.retry')}
                        className="size-11 sm:size-9"
                        disabled={downloadingId !== null}
                        onClick={() => void download(downloadFailure)}
                        size="icon-lg"
                        type="button"
                        variant="ghost"
                      />
                    }
                  >
                    <RefreshCwIcon aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipContent>{t('common.actions.retry')}</TooltipContent>
                </Tooltip>
              </AlertAction>
            </Alert>
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
            <Table className="table-fixed">
              <TableCaption className="sr-only">
                {t('scans.table.caption')}
              </TableCaption>
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
          </CollectionTableShell>
        </div>
      )}
    </section>
  );
}

/** Renders initial scan loading without inventing collection rows. */
function ScansTableLoading({
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

/** Creates a synthetic scan label without relying on an original filename. */
function formatScanName(scanId: string): string {
  return `SCN-${scanId.replace(/-/g, '').slice(-6).toUpperCase()}`;
}

/** Formats an ISO date for the active product language. */
function formatDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

/** Formats scan bytes as a compact binary size. */
function formatFileSize(bytes: number, language: string): string {
  if (bytes < 1024 * 1024) {
    const kibibytes = bytes / 1024;
    return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(kibibytes)} KiB`;
  }
  const mebibytes = bytes / (1024 * 1024);
  return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(mebibytes)} MiB`;
}

/** Hides lower-priority scan metadata in compact table layouts. */
function getResponsiveColumnClass(columnId: string): string | undefined {
  if (columnId === 'scan') {
    return 'w-[44%] md:w-[31.667%]';
  }
  if (columnId === 'format') {
    return 'w-[24%] md:w-[11.667%]';
  }
  if (columnId === 'sizeBytes') {
    return 'hidden md:table-cell md:w-[13.333%]';
  }
  if (columnId === 'createdAt') {
    return 'hidden md:table-cell md:w-1/5';
  }
  if (columnId === 'actions') {
    return 'w-[32%] md:w-[23.333%]';
  }
  return undefined;
}
