import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeftIcon, CircleAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { clearAccountState } from '@/modules/auth/api/session-cache';
import { CollectionLoadError } from '@/modules/collections/ui/collection-load-error';
import { CollectionRecoveryAlert } from '@/modules/collections/ui/collection-recovery-alert';
import { PrintRequestOverlay } from '@/modules/printing/ui/print-request-overlay';
import { PrintRequestsPanel } from '@/modules/printing/ui/print-requests-panel';
import { ScansPanel } from '@/modules/scans/ui/scans-panel';
import { useGetPatient } from '@/shared/api/generated/client/patients/patients';
import { getListPatientScansQueryKey } from '@/shared/api/generated/client/scans/scans';
import type { PrintRequestResponse } from '@/shared/api/generated/models/printRequestResponse';
import type { ScanResponse } from '@/shared/api/generated/models/scanResponse';
import { ApiProblemError } from '@/shared/api/http/api-error';
import { Button, buttonVariants } from '@/shared/ui/button';
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
export function PatientWorkspacePage({ patientId }: PatientWorkspacePageProps) {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'prints' | 'scans'>('scans');
  const [selectedScan, setSelectedScan] = useState<ScanResponse | null>(null);
  const [acceptedRequest, setAcceptedRequest] =
    useState<PrintRequestResponse | null>(null);
  const [printNotice, setPrintNotice] = useState<
    'conflict' | 'uncertain' | null
  >(null);
  const [resourceUnavailable, setResourceUnavailable] = useState(false);
  const query = useGetPatient(patientId, {
    query: { select: (response) => response.data },
  });
  const patient = query.data;
  const patientNotFound =
    query.error instanceof ApiProblemError &&
    query.error.problem.code === 'PATIENT_NOT_FOUND';

  /** Removes account-scoped state after an authenticated print operation expires. */
  const handleAuthenticationRequired = useCallback((): void => {
    clearAccountState(queryClient);
    void navigate({
      replace: true,
      search: { redirect: `/patients/${patientId}` },
      to: '/sign-in',
    });
  }, [navigate, patientId, queryClient]);

  /** Opens the confirmation workflow for one server-eligible scan. */
  const requestPrint = useCallback((scan: ScanResponse): void => {
    setPrintNotice(null);
    setSelectedScan(scan);
  }, []);

  /** Surfaces a confirmed request immediately in the tracking collection. */
  const acceptPrintRequest = useCallback(
    (request: PrintRequestResponse): void => {
      setAcceptedRequest(request);
      setPrintNotice(null);
      setSelectedScan(null);
      setActiveTab('prints');
    },
    [],
  );

  /** Switches to safe read reconciliation without repeating an uncertain POST. */
  const reconcilePrintRequest = useCallback(
    (reason: 'conflict' | 'uncertain'): void => {
      setPrintNotice(reason);
      setSelectedScan(null);
      setActiveTab('prints');
    },
    [],
  );

  /** Removes a stale scan selection and refreshes server-owned eligibility. */
  const handleScanUnavailable = useCallback((): void => {
    setSelectedScan(null);
    void queryClient.invalidateQueries({
      queryKey: getListPatientScansQueryKey(patientId),
    });
  }, [patientId, queryClient]);

  /** Removes patient content once ownership or existence is no longer confirmed. */
  const handlePatientUnavailable = useCallback((): void => {
    setSelectedScan(null);
    setResourceUnavailable(true);
  }, []);

  /** Applies only the two supported patient-workspace tab values. */
  const changeTab = useCallback((value: string | number): void => {
    if (value === 'prints' || value === 'scans') {
      setActiveTab(value);
      if (value === 'scans') {
        setPrintNotice(null);
      }
    }
  }, []);

  if (patientNotFound || resourceUnavailable) {
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
      <Link
        className={buttonVariants({
          className: 'h-11 w-fit',
          variant: 'outline',
        })}
        to="/patients"
      >
        <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
        {t('patients.workspace.back')}
      </Link>

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
          <h1
            className="text-lg leading-6 font-semibold"
            id="patient-workspace-title"
          >
            {patient.firstName} {patient.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('patients.workspace.identity', {
              age: patient.age,
              date: formatDate(patient.createdAt, i18n.language),
            })}
          </p>
        </CardHeader>
      </Card>

      <Tabs className="mt-4 gap-3" onValueChange={changeTab} value={activeTab}>
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
        <TabsContent keepMounted value="scans">
          <ScansPanel
            active={activeTab === 'scans'}
            key={patientId}
            onRequestPrint={requestPrint}
            patientId={patientId}
          />
        </TabsContent>
        <TabsContent keepMounted value="prints">
          <PrintRequestsPanel
            acceptedRequest={acceptedRequest}
            active={activeTab === 'prints'}
            key={`${patientId}:${acceptedRequest?.id ?? printNotice ?? 'tracking'}`}
            notice={printNotice}
            onAuthenticationRequired={handleAuthenticationRequired}
            onPatientUnavailable={handlePatientUnavailable}
            onShowScans={() => setActiveTab('scans')}
            patientId={patientId}
          />
        </TabsContent>
      </Tabs>

      <PrintRequestOverlay
        key={selectedScan?.id ?? 'closed'}
        onAccepted={acceptPrintRequest}
        onAuthenticationRequired={handleAuthenticationRequired}
        onClose={() => setSelectedScan(null)}
        onPatientUnavailable={handlePatientUnavailable}
        onReconcileRequired={reconcilePrintRequest}
        onScanUnavailable={handleScanUnavailable}
        patientId={patientId}
        scan={selectedScan}
      />
    </section>
  );
}

/** Hides patient identity when ownership or existence is no longer confirmed. */
function PatientUnavailable() {
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
function PatientWorkspaceLoading({ loadingLabel }: { loadingLabel: string }) {
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
