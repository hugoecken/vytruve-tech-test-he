import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, PrinterIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  isActivePrintRequestStatus,
  PRINTING_REQUEST_TIMEOUT_MS,
  PRINT_REQUEST_PAGE_SIZE,
} from '@/modules/printing/config/printing';
import { formatScanLabel } from '@/modules/scans/lib/scan-formatters';
import {
  getListPatientPrintRequestsQueryKey,
  getRefreshPatientPrintRequestsQueryKey,
  type listPatientPrintRequestsResponseSuccess,
  useCreatePrintRequest,
} from '@/shared/api/generated/client/printing/printing';
import {
  getListPatientScansQueryKey,
  type listPatientScansResponseSuccess,
} from '@/shared/api/generated/client/scans/scans';
import type { PrintRequestResponse } from '@/shared/api/generated/models/printRequestResponse';
import type { ScanResponse } from '@/shared/api/generated/models/scanResponse';
import { ApiProblemError } from '@/shared/api/http/api-error';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer';
import { Spinner } from '@/shared/ui/spinner';

/** Props for the responsive print-request confirmation workflow. */
interface PrintRequestOverlayProps {
  onAccepted: (request: PrintRequestResponse) => void;
  onAuthenticationRequired: () => void;
  onClose: () => void;
  onPatientUnavailable: () => void;
  onReconcileRequired: (reason: 'conflict' | 'uncertain') => void;
  onScanUnavailable: () => void;
  patientId: string;
  scan: ScanResponse | null;
}

/**
 * Confirms one eligible scan before issuing the non-idempotent print mutation.
 *
 * @param props Selected scan and safe workspace transitions.
 * @returns A desktop Dialog or compact Drawer without user-authored reference data.
 */
export function PrintRequestOverlay({
  onAccepted,
  onAuthenticationRequired,
  onClose,
  onPatientUnavailable,
  onReconcileRequired,
  onScanUnavailable,
  patientId,
  scan,
}: PrintRequestOverlayProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const mutation = useCreatePrintRequest({
    mutation: { retry: false },
    request: { timeoutMs: PRINTING_REQUEST_TIMEOUT_MS },
  });

  /** Closes the controlled overlay only while no mutation is in flight. */
  const setOpen = (nextOpen: boolean): void => {
    if (!nextOpen && !mutation.isPending) {
      onClose();
    }
  };

  /** Refreshes both server-owned collections after a submission result. */
  const invalidateCollections = (): void => {
    void queryClient.invalidateQueries({
      queryKey: getListPatientPrintRequestsQueryKey(patientId),
    });
    void queryClient.invalidateQueries({
      queryKey: getRefreshPatientPrintRequestsQueryKey(patientId),
    });
    void queryClient.invalidateQueries({
      queryKey: getListPatientScansQueryKey(patientId),
    });
  };

  /** Prepends a confirmed POST response to an existing confirmed first page. */
  const cacheAcceptedRequest = (request: PrintRequestResponse): void => {
    const firstPageKey = getListPatientPrintRequestsQueryKey(patientId, {
      page: 0,
      pageSize: PRINT_REQUEST_PAGE_SIZE,
    });
    queryClient.setQueryData<listPatientPrintRequestsResponseSuccess>(
      firstPageKey,
      (current) => {
        if (current === undefined) {
          return current;
        }
        return {
          ...current,
          data: {
            ...current.data,
            items: [
              request,
              ...current.data.items.filter((item) => item.id !== request.id),
            ].slice(0, current.data.pageInfo.pageSize),
          },
        };
      },
    );
  };

  /** Prevents duplicate activation until the authoritative scan GET returns. */
  const blockScanPrinting = (scanId: string): void => {
    queryClient.setQueriesData<listPatientScansResponseSuccess>(
      { queryKey: getListPatientScansQueryKey(patientId) },
      (current) => {
        if (current === undefined) {
          return current;
        }
        return {
          ...current,
          data: {
            ...current.data,
            items: current.data.items.map((item) =>
              item.id === scanId ? { ...item, printingAvailable: false } : item,
            ),
          },
        };
      },
    );
  };

  /** Submits once and reconciles ambiguous outcomes exclusively through reads. */
  const submit = async (): Promise<void> => {
    if (scan === null || mutation.isPending) {
      return;
    }

    try {
      const response = await mutation.mutateAsync({
        patientId,
        scanId: scan.id,
      });
      cacheAcceptedRequest(response.data);
      if (isActivePrintRequestStatus(response.data.status)) {
        blockScanPrinting(scan.id);
      }
      onAccepted(response.data);
      invalidateCollections();
    } catch (error) {
      if (error instanceof ApiProblemError) {
        const code = error.problem.code;
        if (code === 'AUTHENTICATION_REQUIRED') {
          onAuthenticationRequired();
          return;
        }
        if (code === 'PATIENT_NOT_FOUND') {
          onPatientUnavailable();
          return;
        }
        if (code === 'SCAN_NOT_FOUND') {
          onScanUnavailable();
          return;
        }
        if (code === 'PRINT_REQUEST_CONFLICT') {
          blockScanPrinting(scan.id);
          invalidateCollections();
          onReconcileRequired('conflict');
          return;
        }
        if (
          code !== 'PRINTING_CAPACITY_REACHED' &&
          code !== 'PRINTING_UNAVAILABLE' &&
          error.problem.status >= 500
        ) {
          blockScanPrinting(scan.id);
          invalidateCollections();
          onReconcileRequired('uncertain');
        }
        return;
      }

      blockScanPrinting(scan.id);
      invalidateCollections();
      onReconcileRequired('uncertain');
    }
  };

  const error = mutation.isError
    ? getPrintRequestError(mutation.error, t)
    : null;
  const content = (
    <div className="flex flex-col gap-4">
      {error !== null && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>{error.title}</AlertTitle>
          <AlertDescription>{error.description}</AlertDescription>
        </Alert>
      )}
      {scan !== null && (
        <Alert>
          <PrinterIcon aria-hidden="true" />
          <AlertTitle>{formatScanLabel(scan.id)}</AlertTitle>
          <AlertDescription>
            {t('printing.create.referenceGenerated')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
  const footer = (
    <>
      <Button
        disabled={mutation.isPending}
        onClick={onClose}
        size="lg"
        type="button"
        variant="outline"
      >
        {t('printing.create.cancel')}
      </Button>
      <Button
        disabled={scan === null || mutation.isPending}
        onClick={() => void submit()}
        size="lg"
        type="button"
      >
        {mutation.isPending && (
          <Spinner aria-hidden="true" data-icon="inline-start" />
        )}
        {mutation.isPending
          ? t('printing.create.pending')
          : mutation.isError
            ? t('common.actions.retry')
            : t('printing.create.submit')}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={setOpen} open={scan !== null} showSwipeHandle>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('printing.create.title')}</DrawerTitle>
            <DrawerDescription>
              {t('printing.create.description')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 py-4">{content}</div>
          <DrawerFooter className="flex-row justify-end gap-3">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog onOpenChange={setOpen} open={scan !== null}>
      <DialogContent showCloseButton={false}>
        <DialogClose
          render={
            <Button
              aria-label={t('printing.create.cancel')}
              className="absolute top-2 right-2"
              disabled={mutation.isPending}
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <XIcon aria-hidden="true" />
        </DialogClose>
        <DialogHeader>
          <DialogTitle>{t('printing.create.title')}</DialogTitle>
          <DialogDescription>
            {t('printing.create.description')}
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Resolves only definite, safely retryable print-submission failures. */
function getPrintRequestError(
  error: unknown,
  t: ReturnType<typeof useTranslation>['t'],
): { description: string; title: string } | null {
  if (!(error instanceof ApiProblemError)) {
    return null;
  }

  if (error.problem.code === 'PRINTING_CAPACITY_REACHED') {
    return {
      description: t('printing.create.capacityDescription'),
      title: t('printing.create.capacityTitle'),
    };
  }
  if (error.problem.code === 'PRINTING_UNAVAILABLE') {
    return {
      description: t('printing.create.unavailableDescription'),
      title: t('printing.create.unavailableTitle'),
    };
  }
  if (error.problem.status < 500) {
    return {
      description: t(`errors.problem.${error.problem.code}`),
      title: t('printing.create.failedTitle'),
    };
  }
  return null;
}
