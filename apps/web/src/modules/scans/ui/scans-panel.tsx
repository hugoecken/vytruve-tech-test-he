import { useCallback, useMemo, useState } from 'react';
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
import {
  formatScanFileSize,
  formatScanLabel,
} from '@/modules/scans/lib/scan-formatters';
import { ScanUploadOverlay } from '@/modules/scans/ui/scan-upload-overlay';
import { ScanPreview } from '@/modules/scans/ui/scan-preview';
import {
  downloadPatientScan,
  useListPatientScans,
} from '@/shared/api/generated/client/scans/scans';
import type { ScanResponse } from '@/shared/api/generated/models/scanResponse';
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
  DetailItem,
  DetailList,
  ResponsiveDetailsOverlay,
} from '@/shared/ui/responsive-details-overlay';
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
  active: boolean;
  onRequestPrint: (scan: ScanResponse) => void;
  patientId: string;
}

/**
 * Lists, uploads and downloads patient scans within their ownership context.
 *
 * @param props Parent patient identity used by every generated scan request.
 * @returns The responsive 3D scan collection and workflows.
 */
export function ScansPanel({
  active,
  onRequestPrint,
  patientId,
}: ScansPanelProps) {
  const { i18n, t } = useTranslation();
  const [requestedPage, setRequestedPage] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadFailure, setDownloadFailure] = useState<ScanResponse | null>(
    null,
  );
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const query = useListPatientScans(
    patientId,
    { page: requestedPage, pageSize: SCAN_PAGE_SIZE },
    {
      query: {
        enabled: active,
        placeholderData: keepPreviousData,
        select: (response) => response.data,
      },
    },
  );
  const data = query.data;

  const download = useCallback(
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

  const columns = useMemo(
    () =>
      scanColumnHelper.columns([
        scanColumnHelper.accessor((scan) => formatScanLabel(scan.id), {
          header: t('scans.table.scan'),
          id: 'scan',
        }),
        scanColumnHelper.accessor('format', {
          cell: ({ getValue }) => getValue().toUpperCase(),
          header: t('scans.table.format'),
        }),
        scanColumnHelper.accessor('sizeBytes', {
          cell: ({ getValue }) => formatScanFileSize(getValue(), i18n.language),
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
                        scan: formatScanLabel(row.original.id),
                      })}
                      disabled={downloadingId !== null}
                      onClick={(event) => {
                        event.stopPropagation();
                        void download(row.original);
                      }}
                      size="icon"
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
                      aria-label={
                        row.original.printingAvailable
                          ? t('scans.printing.requestNamed', {
                              scan: formatScanLabel(row.original.id),
                            })
                          : t('scans.printing.unavailableNamed', {
                              scan: formatScanLabel(row.original.id),
                            })
                      }
                      disabled={!row.original.printingAvailable}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRequestPrint(row.original);
                      }}
                      size="icon"
                      type="button"
                      variant="ghost"
                    />
                  }
                >
                  <PrinterIcon aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>
                  {row.original.printingAvailable
                    ? t('scans.printing.request')
                    : t('scans.printing.unavailable')}
                </TooltipContent>
              </Tooltip>
            </div>
          ),
          header: t('scans.table.actions'),
          id: 'actions',
        }),
      ]),
    [download, downloadingId, i18n.language, onRequestPrint, t],
  );
  const scans = data?.items ?? EMPTY_SCANS;
  const selectedScan = scans.find((scan) => scan.id === selectedScanId) ?? null;
  const table = useTable({
    features: scanTableFeatures,
    columns,
    data: scans,
  });

  return (
    <section aria-label={t('scans.title')} className="flex flex-col gap-6">
      <div className="relative flex flex-col gap-2">
        <p className="text-sm leading-[25px] text-muted-foreground sm:max-w-[47.5rem]">
          {t('scans.description')}
        </p>
        <div className="sm:absolute sm:-top-1 sm:right-0">
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

      {data?.items.length === 0 && (
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
          {query.isError && (
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
                  scan: formatScanLabel(downloadFailure.id),
                })}
              </AlertDescription>
              <AlertAction>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label={t('common.actions.retry')}
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
            onNext={() => setRequestedPage(data.pageInfo.page + 1)}
            onPrevious={() => setRequestedPage(data.pageInfo.page - 1)}
            page={data.pageInfo.page}
            pageLabel={t('collections.pagination.page', {
              page: data.pageInfo.page + 1,
            })}
            pending={query.isFetching}
            previousLabel={t('collections.pagination.previous')}
          >
            <Table>
              <TableCaption className="sr-only">
                {t('scans.table.caption')}
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
                    aria-label={t('scans.details.action', {
                      scan: formatScanLabel(row.original.id),
                    })}
                    className="h-12"
                    key={row.id}
                    onActivate={() => setSelectedScanId(row.original.id)}
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
          </CollectionTableShell>
        </div>
      )}

      <ScanDetailsOverlay
        onOpenChange={(open) => {
          if (!open) {
            setSelectedScanId(null);
          }
        }}
        patientId={patientId}
        scan={selectedScan}
      />
    </section>
  );
}

/** Props for the read-only scan consultation overlay. */
interface ScanDetailsOverlayProps {
  onOpenChange: (open: boolean) => void;
  patientId: string;
  scan: ScanResponse | null;
}

/**
 * Presents all safe scan metadata already available in the collection response.
 *
 * @param props Selected scan and controlled close action.
 * @returns A responsive read-only scan consultation overlay.
 */
function ScanDetailsOverlay({
  onOpenChange,
  patientId,
  scan,
}: ScanDetailsOverlayProps) {
  const { i18n, t } = useTranslation();

  return (
    <ResponsiveDetailsOverlay
      closeLabel={t('common.actions.close')}
      contentClassName="sm:max-w-5xl"
      description={t('scans.details.description')}
      onOpenChange={onOpenChange}
      open={scan !== null}
      title={t('scans.details.title')}
    >
      {scan !== null && (
        <div className="grid min-h-0 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
          <ScanPreview patientId={patientId} scanId={scan.id} />
          <DetailList>
            <DetailItem label={t('scans.details.fields.format')}>
              {scan.format.toUpperCase()}
            </DetailItem>
            <DetailItem label={t('scans.details.fields.encoding')}>
              {t(`scans.encoding.${scan.encoding}`)}
            </DetailItem>
            <DetailItem label={t('scans.details.fields.size')}>
              {formatScanFileSize(scan.sizeBytes, i18n.language)}
            </DetailItem>
            <DetailItem label={t('scans.details.fields.added')}>
              {formatDateTime(scan.createdAt, i18n.language)}
            </DetailItem>
            <DetailItem label={t('scans.details.fields.printing')}>
              {scan.printingAvailable
                ? t('scans.details.printing.available')
                : t('scans.details.printing.unavailable')}
            </DetailItem>
          </DetailList>
        </div>
      )}
    </ResponsiveDetailsOverlay>
  );
}

/** Renders initial scan loading without inventing collection rows. */
function ScansTableLoading({ loadingLabel }: { loadingLabel: string }) {
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

/** Formats an ISO date for the active product language. */
function formatDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

/** Formats an exact scan creation instant for consultation details. */
function formatDateTime(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
