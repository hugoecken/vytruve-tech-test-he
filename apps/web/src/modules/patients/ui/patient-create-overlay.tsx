import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, CirclePlusIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  getListPatientsQueryKey,
  useCreatePatient,
} from '@/shared/api/generated/client/patients/patients';
import { CreatePatientBody } from '@/shared/api/generated/validation/patients/patients.zod';
import {
  ApiProblemError,
  ApiTransportError,
} from '@/shared/api/http/api-error';
import { useIsMobile } from '@/shared/hooks/use-mobile';
import { Alert, AlertDescription } from '@/shared/ui/alert';
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
import { FieldGroup } from '@/shared/ui/field';
import { Spinner } from '@/shared/ui/spinner';
import {
  PatientFormFields,
  type PatientFormValues,
} from './patient-form-fields';
import {
  PatientPhotoField,
  type PatientPhotoDecision,
} from './patient-photo-field';

const CREATE_PATIENT_FORM_ID = 'create-patient-form';

/**
 * Opens a responsive patient creation Dialog or compact Drawer.
 *
 * @returns The trigger and localized patient form.
 */
export function PatientCreateOverlay() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useCreatePatient();
  const form = useForm<PatientFormValues>({
    defaultValues: { firstName: '', lastName: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(CreatePatientBody),
  });
  const [open, setOpen] = useState(false);
  const [photoDecision, setPhotoDecision] = useState<PatientPhotoDecision>({
    action: 'keep',
  });
  const [photoFieldKey, setPhotoFieldKey] = useState(0);

  const setOverlayOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset();
      mutation.reset();
      setPhotoDecision({ action: 'keep' });
      setPhotoFieldKey((key) => key + 1);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      const response = await mutation.mutateAsync({
        data: {
          ...values,
          photo:
            photoDecision.action === 'replace' ? photoDecision.file : undefined,
        },
      });
      await queryClient.invalidateQueries({
        queryKey: getListPatientsQueryKey(),
      });
      setOverlayOpen(false);
      await navigate({
        params: { patientId: response.data.id },
        to: '/patients/$patientId',
      });
    } catch (error) {
      let shouldFocus = true;
      if (error instanceof ApiProblemError) {
        for (const violation of error.problem.violations ?? []) {
          if (
            violation.field !== 'firstName' &&
            violation.field !== 'lastName' &&
            violation.field !== 'age'
          ) {
            continue;
          }
          form.setError(
            violation.field,
            { message: violation.code, type: 'server' },
            { shouldFocus },
          );
          shouldFocus = false;
        }
      }
      if (shouldFocus) {
        const message =
          error instanceof ApiProblemError
            ? t(`errors.problem.${error.problem.code}`)
            : error instanceof ApiTransportError
              ? t('errors.network')
              : t('errors.unexpected');
        form.setError('root', { message, type: 'server' });
      }
    }
  });

  const photoUnavailable =
    photoDecision.action === 'invalid' || photoDecision.action === 'preparing';
  const formContent = (
    <form id={CREATE_PATIENT_FORM_ID} noValidate onSubmit={submit}>
      <FieldGroup className="gap-4">
        {form.formState.errors.root?.message !== undefined && (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}
        <PatientPhotoField
          disabled={mutation.isPending}
          inputId="patient-create-photo"
          key={photoFieldKey}
          onChange={setPhotoDecision}
        />
        <PatientFormFields
          disabled={mutation.isPending}
          form={form}
          idPrefix="patient-create"
        />
      </FieldGroup>
    </form>
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
        {t('patients.create.cancel')}
      </Button>
      <Button
        disabled={mutation.isPending || photoUnavailable}
        form={CREATE_PATIENT_FORM_ID}
        size="lg"
        type="submit"
      >
        {mutation.isPending ? (
          <Spinner aria-hidden="true" data-icon="inline-start" />
        ) : (
          <CirclePlusIcon aria-hidden="true" data-icon="inline-start" />
        )}
        {mutation.isPending
          ? t('patients.create.pending')
          : t('patients.create.submit')}
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
        {t('patients.add')}
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
              <DrawerTitle>{t('patients.create.title')}</DrawerTitle>
              <DrawerDescription>
                {t('patients.create.description')}
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 py-4">{formContent}</div>
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
          <DialogContent showCloseButton={!mutation.isPending}>
            <DialogHeader>
              <DialogTitle>{t('patients.create.title')}</DialogTitle>
              <DialogDescription>
                {t('patients.create.description')}
              </DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter className="bg-background">{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
