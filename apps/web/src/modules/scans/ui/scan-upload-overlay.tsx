import { useId, useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CircleAlertIcon,
  CirclePlusIcon,
  FileBoxIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatScanFileSize } from '@/modules/scans/lib/scan-formatters';
import {
  getListPatientScansQueryKey,
  useCreatePatientScan,
} from '@/shared/api/generated/client/scans/scans';
import {
  ApiProblemError,
  ApiTransportError,
} from '@/shared/api/http/api-error';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from '@/shared/ui/attachment';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
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
import { Input } from '@/shared/ui/input';
import { Spinner } from '@/shared/ui/spinner';

const MAX_SCAN_BYTES = 25 * 1024 * 1024;

/** Props for the scan upload workflow. */
interface ScanUploadOverlayProps {
  patientId: string;
}

/** Supported local scan validation failure. */
type ScanFileFailure = 'size' | 'type';

/**
 * Selects, validates and uploads one PLY scan through the generated mutation.
 *
 * @param props Parent patient identity used by the ownership-scoped API.
 * @returns A responsive Dialog or compact Drawer upload workflow.
 */
export function ScanUploadOverlay({ patientId }: ScanUploadOverlayProps) {
  const { i18n, t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const mutation = useCreatePatientScan();
  let fileFailure: ScanFileFailure | null = null;
  if (file !== null && !file.name.toLocaleLowerCase().endsWith('.ply')) {
    fileFailure = 'type';
  } else if (file !== null && file.size > MAX_SCAN_BYTES) {
    fileFailure = 'size';
  }

  const resetSelection = () => {
    setFile(null);
    mutation.reset();
  };

  const setOverlayOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetSelection();
    }
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    mutation.reset();
    setFile(selectedFile);
  };

  const upload = async () => {
    if (file === null || fileFailure !== null || mutation.isPending) {
      return;
    }
    try {
      await mutation.mutateAsync({ data: { file }, patientId });
      await queryClient.invalidateQueries({
        queryKey: getListPatientScansQueryKey(patientId),
      });
      setOverlayOpen(false);
    } catch {
      // The generated mutation retains the safe error for contextual rendering.
    }
  };

  const uploadError = mutation.isError
    ? getScanUploadError(mutation.error, t)
    : undefined;
  const localError =
    fileFailure === null
      ? undefined
      : t(`scans.upload.validation.${fileFailure}`);
  let attachmentState: 'done' | 'error' | 'uploading' = 'done';
  if (localError !== undefined || uploadError !== undefined) {
    attachmentState = 'error';
  } else if (mutation.isPending) {
    attachmentState = 'uploading';
  }
  let attachmentDescription: string | undefined;
  if (localError !== undefined) {
    attachmentDescription = localError;
  } else if (uploadError !== undefined) {
    attachmentDescription = t('scans.upload.failed');
  } else if (file !== null) {
    attachmentDescription = t('scans.upload.fileReady', {
      size: formatScanFileSize(file.size, i18n.language),
    });
  }
  const content = (
    <div className="flex min-w-0 flex-col gap-4">
      {uploadError !== undefined && (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
      <Input
        accept=".ply"
        hidden
        id={fileInputId}
        onChange={selectFile}
        type="file"
      />
      {file === null ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-4 text-center">
          <FileBoxIcon
            aria-hidden="true"
            className="size-6 text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">
            {t('scans.upload.fileHint')}
          </p>
          <Button
            nativeButton={false}
            render={<label htmlFor={fileInputId} />}
            size="lg"
            variant="outline"
          >
            <UploadIcon aria-hidden="true" data-icon="inline-start" />
            {t('scans.upload.choose')}
          </Button>
        </div>
      ) : (
        <Attachment
          className="w-full flex-nowrap overflow-hidden"
          state={attachmentState}
        >
          <AttachmentMedia>
            {mutation.isPending ? (
              <Spinner aria-hidden="true" />
            ) : (
              <FileBoxIcon aria-hidden="true" />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle title={file.name}>{file.name}</AttachmentTitle>
            <AttachmentDescription>
              {attachmentDescription}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction
              aria-label={t('scans.upload.remove')}
              disabled={mutation.isPending}
              onClick={resetSelection}
              type="button"
            >
              <XIcon aria-hidden="true" />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      )}
      {file !== null && (
        <p className="text-sm leading-[25px] text-muted-foreground">
          {t('scans.upload.review')}
        </p>
      )}
    </div>
  );
  const footer = (
    <>
      <Button
        disabled={mutation.isPending}
        onClick={() => setOverlayOpen(false)}
        size="lg"
        type="button"
        variant="outline"
      >
        {t('scans.upload.cancel')}
      </Button>
      <Button
        disabled={file === null || fileFailure !== null || mutation.isPending}
        onClick={() => void upload()}
        size="lg"
        type="button"
      >
        {mutation.isPending ? (
          <Spinner aria-hidden="true" data-icon="inline-start" />
        ) : (
          <UploadIcon aria-hidden="true" data-icon="inline-start" />
        )}
        {mutation.isPending
          ? t('scans.upload.pending')
          : mutation.isError
            ? t('common.actions.retry')
            : t('scans.upload.submit')}
      </Button>
    </>
  );

  return (
    <>
      <Button
        className="w-full sm:w-auto"
        onClick={() => setOverlayOpen(true)}
        size="lg"
        type="button"
      >
        <CirclePlusIcon aria-hidden="true" data-icon="inline-start" />
        {t('scans.add')}
      </Button>
      {isMobile ? (
        <Drawer
          disablePointerDismissal
          onOpenChange={setOverlayOpen}
          open={open}
          showSwipeHandle
        >
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('scans.upload.title')}</DrawerTitle>
              <DrawerDescription>
                {t('scans.upload.description')}
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 py-4">{content}</div>
            <DrawerFooter className="flex-row justify-end gap-3">
              {footer}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          disablePointerDismissal
          onOpenChange={setOverlayOpen}
          open={open}
        >
          <DialogContent>
            <DialogHeader className="min-w-0">
              <DialogTitle>{t('scans.upload.title')}</DialogTitle>
              <DialogDescription>
                {t('scans.upload.description')}
              </DialogDescription>
            </DialogHeader>
            {content}
            <DialogFooter className="min-w-0">{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/** Resolves a safe localized upload failure. */
function getScanUploadError(
  error: unknown,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  if (error instanceof ApiProblemError) {
    return t(`errors.problem.${error.problem.code}`);
  }
  return error instanceof ApiTransportError
    ? t('errors.network')
    : t('errors.unexpected');
}
