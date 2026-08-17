import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, PencilIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { getPatientPhotoUrl } from '@/modules/patients/lib/patient-photo-url';
import {
  getGetPatientQueryKey,
  getListPatientsQueryKey,
  useUpdatePatient,
} from '@/shared/api/generated/client/patients/patients';
import type { PatientResponse } from '@/shared/api/generated/models/patientResponse';
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

const EDIT_PATIENT_FORM_ID = 'edit-patient-form';

/** Props for the responsive owned-patient edit workflow. */
interface PatientEditOverlayProps {
  onPhotoChanged: () => void;
  patient: PatientResponse;
}

/** Edits complete patient identity and one explicit current-photo decision. */
export function PatientEditOverlay({
  onPhotoChanged,
  patient,
}: PatientEditOverlayProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const mutation = useUpdatePatient();
  const form = useForm<PatientFormValues>({
    defaultValues: patientFields(patient),
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
      form.reset(patientFields(patient));
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
          photoAction:
            photoDecision.action === 'remove'
              ? 'remove'
              : photoDecision.action === 'replace'
                ? 'replace'
                : 'keep',
        },
        patientId: patient.id,
      });
      queryClient.setQueryData(getGetPatientQueryKey(patient.id), response);
      await queryClient.invalidateQueries({
        queryKey: getListPatientsQueryKey(),
      });
      form.reset(patientFields(response.data));
      if (
        photoDecision.action === 'remove' ||
        photoDecision.action === 'replace'
      ) {
        onPhotoChanged();
      }
      mutation.reset();
      setPhotoDecision({ action: 'keep' });
      setPhotoFieldKey((key) => key + 1);
      setOpen(false);
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
  const unchanged = !form.formState.isDirty && photoDecision.action === 'keep';
  const content = (
    <form id={EDIT_PATIENT_FORM_ID} noValidate onSubmit={submit}>
      <FieldGroup className="gap-4">
        {form.formState.errors.root?.message !== undefined && (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}
        <PatientFormFields
          disabled={mutation.isPending}
          form={form}
          idPrefix="patient-edit"
        />
        <PatientPhotoField
          currentPhotoUrl={
            patient.hasPhoto ? getPatientPhotoUrl(patient.id) : undefined
          }
          disabled={mutation.isPending}
          hasCurrentPhoto={patient.hasPhoto}
          inputId="patient-edit-photo"
          key={photoFieldKey}
          onChange={setPhotoDecision}
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
        {t('patients.edit.cancel')}
      </Button>
      <Button
        disabled={mutation.isPending || photoUnavailable || unchanged}
        form={EDIT_PATIENT_FORM_ID}
        size="lg"
        type="submit"
      >
        {mutation.isPending && (
          <Spinner aria-hidden="true" data-icon="inline-start" />
        )}
        {mutation.isPending
          ? t('patients.edit.pending')
          : t('patients.edit.submit')}
      </Button>
    </>
  );

  return (
    <>
      <Button
        aria-label={t('patients.edit.action')}
        onClick={() => setOpen(true)}
        size="icon"
        type="button"
        variant="ghost"
      >
        <PencilIcon aria-hidden="true" />
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
              <DrawerTitle>{t('patients.edit.title')}</DrawerTitle>
              <DrawerDescription>
                {t('patients.edit.description')}
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
          <DialogContent
            className="sm:max-w-xl"
            showCloseButton={!mutation.isPending}
          >
            <DialogHeader>
              <DialogTitle>{t('patients.edit.title')}</DialogTitle>
              <DialogDescription>
                {t('patients.edit.description')}
              </DialogDescription>
            </DialogHeader>
            {content}
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/** Selects only editable generated patient values. */
function patientFields(patient: PatientResponse): PatientFormValues {
  return {
    age: patient.age,
    firstName: patient.firstName,
    lastName: patient.lastName,
  };
}
