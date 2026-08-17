import { useMemo, useState } from 'react';
import { keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { ChevronRightIcon, UsersIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollectionLoadError } from '@/modules/collections/ui/collection-load-error';
import { CollectionRecoveryAlert } from '@/modules/collections/ui/collection-recovery-alert';
import { CollectionTableShell } from '@/modules/collections/ui/collection-table-shell';
import { PatientCreateOverlay } from '@/modules/patients/ui/patient-create-overlay';
import { PatientIdentity } from '@/modules/patients/ui/patient-identity';
import { useListPatients } from '@/shared/api/generated/client/patients/patients';
import type { PatientResponse } from '@/shared/api/generated/models/patientResponse';
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
  InteractiveTableRow,
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
export function PatientsPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [requestedPage, setRequestedPage] = useState(0);
  const query = useListPatients(
    { page: requestedPage, pageSize: PATIENT_PAGE_SIZE },
    {
      query: {
        placeholderData: keepPreviousData,
        select: (response) => response.data,
      },
    },
  );
  const data = query.data;
  const columns = useMemo(
    () =>
      patientColumnHelper.columns([
        patientColumnHelper.accessor(
          (patient) => `${patient.firstName} ${patient.lastName}`,
          {
            cell: ({ row }) => <PatientIdentity patient={row.original} />,
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
              aria-label={t('patients.table.openNamed', {
                name: `${row.original.firstName} ${row.original.lastName}`,
              })}
              onClick={(event) => {
                event.stopPropagation();
                void navigate({
                  params: { patientId: row.original.id },
                  to: '/patients/$patientId',
                });
              }}
              size="icon"
              type="button"
              variant="outline"
            >
              <ChevronRightIcon aria-hidden="true" />
            </Button>
          ),
          header: t('patients.table.action'),
          id: 'action',
        }),
      ]),
    [i18n.language, navigate, t],
  );
  const table = useTable({
    features: patientTableFeatures,
    columns,
    data: data?.items ?? EMPTY_PATIENTS,
  });

  return (
    <section aria-labelledby="patients-title" className="flex flex-col pt-2">
      <h1 className="text-2xl leading-8 font-semibold" id="patients-title">
        {t('patients.title')}
      </h1>
      <div className="mt-5 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm leading-5 text-muted-foreground">
          {t('patients.description')}
        </p>
        <PatientCreateOverlay />
      </div>

      <div className="mt-9 sm:mt-13">
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
            {query.isError && (
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
              onNext={() => setRequestedPage(data.pageInfo.page + 1)}
              onPrevious={() => setRequestedPage(data.pageInfo.page - 1)}
              page={data.pageInfo.page}
              pageLabel={t('collections.pagination.page', {
                page: data.pageInfo.page + 1,
              })}
              pending={query.isFetching}
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
                          className={getPatientColumnClass(header.column.id)}
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
                    <InteractiveTableRow
                      aria-label={t('patients.table.openNamed', {
                        name: `${row.original.firstName} ${row.original.lastName}`,
                      })}
                      className="h-12"
                      key={row.id}
                      onActivate={() => {
                        void navigate({
                          params: { patientId: row.original.id },
                          to: '/patients/$patientId',
                        });
                      }}
                    >
                      {row.getAllCells().map((cell) => (
                        <TableCell
                          className={getPatientColumnClass(cell.column.id)}
                          key={cell.id}
                        >
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
      </div>
    </section>
  );
}

/** Keeps the accepted patient-directory columns stable across breakpoints. */
function getPatientColumnClass(columnId: string): string {
  switch (columnId) {
    case 'patient':
      return 'w-1/2 whitespace-normal';
    case 'age':
      return 'w-1/4 sm:w-[13.333%]';
    case 'createdAt':
      return 'hidden sm:table-cell sm:w-[23.333%]';
    case 'action':
      return 'w-1/4 sm:w-[13.333%]';
    default:
      return '';
  }
}

/** Renders the initial patient table skeleton without provisional rows. */
function PatientsTableLoading({ loadingLabel }: { loadingLabel: string }) {
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
