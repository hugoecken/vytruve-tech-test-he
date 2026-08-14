import { Link } from '@tanstack/react-router';
import { CircleAlertIcon, PrinterIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollectionLoadError } from '@/modules/collections/ui/collection-load-error';
import { CollectionRecoveryAlert } from '@/modules/collections/ui/collection-recovery-alert';
import { ScansPanel } from '@/modules/scans/ui/scans-panel';
import { useGetPatient } from '@/shared/api/generated/client/patients/patients';
import { ApiProblemError } from '@/shared/api/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card, CardHeader } from '@/shared/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/shared/ui/empty';
import { Skeleton } from '@/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';

/** Props for the ownership-scoped patient workspace. */
interface PatientWorkspacePageProps {
  patientId: string;
}

/**
 * Renders a patient identity and the scan-first clinical workspace.
 *
 * @param props Patient identifier resolved by the typed route.
 * @returns The safe patient workspace or its local recovery state.
 */
export function PatientWorkspacePage({
  patientId,
}: PatientWorkspacePageProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const query = useGetPatient(patientId, {
    query: { select: (response) => response.data },
  });
  const patient = query.data;
  const patientNotFound =
    query.error instanceof ApiProblemError &&
    query.error.problem.code === 'PATIENT_NOT_FOUND';

  if (patientNotFound) {
    return <PatientUnavailable />;
  }

  if (query.isPending) {
    return (
      <PatientWorkspaceLoading loadingLabel={t('common.status.loading')} />
    );
  }

  if (query.isError && patient === undefined) {
    return (
      <CollectionLoadError
        description={t('patients.workspace.loadErrorDescription')}
        onRetry={() => void query.refetch()}
        pending={query.isFetching}
        retryLabel={t('common.actions.retry')}
        title={t('patients.workspace.loadErrorTitle')}
      />
    );
  }

  if (patient === undefined) {
    return <PatientUnavailable />;
  }

  return (
    <section
      aria-labelledby="patient-workspace-title"
      className="flex flex-col"
    >
      <h1
        className="w-fit text-2xl leading-8 font-semibold"
        id="patient-workspace-title"
      >
        <Link className="text-foreground no-underline" to="/patients">
          {t('patients.workspace.back')}
        </Link>
      </h1>

      {query.isError && (
        <div className="mt-4">
          <CollectionRecoveryAlert
            description={t('patients.workspace.refreshErrorDescription')}
            onRetry={() => void query.refetch()}
            pending={query.isFetching}
            retryLabel={t('common.actions.refresh')}
            title={t('patients.workspace.refreshErrorTitle')}
          />
        </div>
      )}

      <Card className="mt-5 h-30">
        <CardHeader>
          <h2 className="text-lg leading-6 font-semibold">
            {patient.firstName} {patient.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('patients.workspace.identity', {
              age: patient.age,
              date: formatDate(patient.createdAt, i18n.language),
            })}
          </p>
        </CardHeader>
      </Card>

      <Tabs className="mt-4 gap-3" defaultValue="scans">
        <div className="flex h-20 items-center">
          <TabsList
            aria-label={t('patients.workspace.tabsLabel')}
            className="h-11 w-full sm:w-[35rem]"
          >
            <TabsTrigger value="scans">
              {t('patients.workspace.tabs.scans')}
            </TabsTrigger>
            <TabsTrigger value="prints">
              {t('patients.workspace.tabs.prints')}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="scans">
          <ScansPanel key={patientId} patientId={patientId} />
        </TabsContent>
        <TabsContent value="prints">
          <Empty className="min-h-64 rounded-xl border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PrinterIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{t('patients.workspace.prints.title')}</EmptyTitle>
              <EmptyDescription>
                {t('patients.workspace.prints.description')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </TabsContent>
      </Tabs>
    </section>
  );
}

/** Hides patient identity when ownership or existence is no longer confirmed. */
function PatientUnavailable(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Empty className="min-h-80 rounded-xl border bg-card" role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlertIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{t('patients.workspace.unavailable.title')}</EmptyTitle>
        <EmptyDescription>
          {t('patients.workspace.unavailable.description')}
        </EmptyDescription>
      </EmptyHeader>
      <Button nativeButton={false} render={<Link to="/patients" />}>
        {t('patients.workspace.unavailable.action')}
      </Button>
    </Empty>
  );
}

/** Renders identity placeholders without provisional patient data. */
function PatientWorkspaceLoading({
  loadingLabel,
}: {
  loadingLabel: string;
}): React.JSX.Element {
  return (
    <div
      aria-label={loadingLabel}
      aria-live="polite"
      className="flex flex-col"
      role="status"
    >
      <Skeleton className="h-8 w-28" />
      <Skeleton className="mt-5 h-30 w-full rounded-xl" />
      <Skeleton className="mt-4 h-20 w-full max-w-[35rem] rounded-xl" />
      <Skeleton className="mt-3 h-64 w-full rounded-xl" />
    </div>
  );
}

/** Formats the patient creation date for the active locale. */
function formatDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
