import * as React from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { ArrowRightIcon, UsersIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollectionLoadError } from '@/modules/collections/ui/collection-load-error';
import { CollectionRecoveryAlert } from '@/modules/collections/ui/collection-recovery-alert';
import { CollectionTableShell } from '@/modules/collections/ui/collection-table-shell';
import { PatientCreateOverlay } from '@/modules/patients/ui/patient-create-overlay';
import { useListPatients } from '@/shared/api/generated/client/patients/patients';
import type { PatientResponse } from '@/shared/api/generated/models/patientResponse';
import type { PatientPageResponse } from '@/shared/api/generated/models/patientPageResponse';
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

const PATIENT_PAGE_SIZE = 10;
const EMPTY_PATIENTS: PatientResponse[] = [];
const patientTableFeatures = tableFeatures({});
const patientColumnHelper = createColumnHelper<
  typeof patientTableFeatures,
  PatientResponse
>();

/**
 * Lists patient records with server pagination and explicit recovery states.
 *
 * @returns The localized responsive patient directory.
 */
export function PatientsPage(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const [requestedPage, setRequestedPage] = React.useState(0);
  const confirmedData = React.useRef<PatientPageResponse | undefined>(
    undefined,
  );
  const query = useListPatients(
    { page: requestedPage, pageSize: PATIENT_PAGE_SIZE },
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
  const columns = React.useMemo(
    () =>
      patientColumnHelper.columns([
        patientColumnHelper.accessor(
          (patient) => `${patient.firstName} ${patient.lastName}`,
          {
            header: t('patients.table.patient'),
            id: 'patient',
          },
        ),
        patientColumnHelper.accessor('age', {
          header: t('patients.table.age'),
        }),
        patientColumnHelper.accessor('createdAt', {
          cell: ({ getValue }) => formatDate(getValue(), i18n.language),
          header: t('patients.table.created'),
        }),
        patientColumnHelper.display({
          cell: ({ row }) => (
            <Button
              className="size-8"
              nativeButton={false}
              render={
                <Link
                  aria-label={t('patients.table.openNamed', {
                    name: `${row.original.firstName} ${row.original.lastName}`,
                  })}
                  params={{ patientId: row.original.id }}
                  to="/patients/$patientId"
                />
              }
              size="icon"
              variant="ghost"
            >
              <ArrowRightIcon aria-hidden="true" />
            </Button>
          ),
          header: t('patients.table.action'),
          id: 'actions',
        }),
      ]),
    [i18n.language, t],
  );
  const table = useTable({
    features: patientTableFeatures,
    columns,
    data: data?.items ?? EMPTY_PATIENTS,
  });

  return (
    <section aria-labelledby="patients-title" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl leading-8 font-semibold" id="patients-title">
            {t('patients.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('patients.description')}
          </p>
        </div>
        <PatientCreateOverlay />
      </div>

      {query.isPending && (
        <PatientsTableLoading loadingLabel={t('common.status.loading')} />
      )}

      {query.isError && data === undefined && (
        <CollectionLoadError
          description={t('collections.load.description')}
          onRetry={() => void query.refetch()}
          pending={query.isFetching}
          retryLabel={t('common.actions.retry')}
          title={t('collections.load.title', {
            collection: t('patients.collection').toLowerCase(),
          })}
        />
      )}

      {data !== undefined && data.items.length === 0 && (
        <Empty className="min-h-72 rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{t('patients.empty.title')}</EmptyTitle>
            <EmptyDescription>
              {t('patients.empty.description')}
            </EmptyDescription>
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
                collection: t('patients.collection'),
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
            <Table className="table-fixed">
              <TableCaption className="sr-only">
                {t('patients.table.caption')}
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

/** Renders the initial patient table skeleton without provisional rows. */
function PatientsTableLoading({
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

/** Matches the approved desktop and compact patient table proportions. */
function getResponsiveColumnClass(columnId: string): string | undefined {
  if (columnId === 'patient') {
    return 'w-[47%] sm:w-1/2';
  }
  if (columnId === 'age') {
    return 'w-[24%] sm:w-[13.333%]';
  }
  if (columnId === 'createdAt') {
    return 'hidden sm:table-cell sm:w-[23.333%]';
  }
  if (columnId === 'actions') {
    return 'w-[29%] sm:w-[13.333%]';
  }
  return undefined;
}
