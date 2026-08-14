import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CircleAlertIcon, CirclePlusIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { FieldError as FormFieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  getListPatientsQueryKey,
  useCreatePatient,
} from '@/shared/api/generated/client/patients/patients';
import type { CreatePatientRequest } from '@/shared/api/generated/models/createPatientRequest';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Spinner } from '@/shared/ui/spinner';

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
  const form = useForm<CreatePatientRequest>({
    defaultValues: { firstName: '', lastName: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    resolver: zodResolver(CreatePatientBody),
  });
  const [open, setOpen] = useState(false);

  const setOverlayOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset();
      mutation.reset();
    }
  };

  const submit = form.handleSubmit(async (values) => {
    form.clearErrors('root');
    try {
      const response = await mutation.mutateAsync({
        data: values,
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

  const firstNameError = getPatientFieldErrorMessage(
    form.formState.errors.firstName,
    t('patients.create.validation.name'),
    t,
  );
  const lastNameError = getPatientFieldErrorMessage(
    form.formState.errors.lastName,
    t('patients.create.validation.name'),
    t,
  );
  const ageError = getPatientFieldErrorMessage(
    form.formState.errors.age,
    t('patients.create.validation.age'),
    t,
  );
  const formContent = (
    <form
      className="pb-2"
      id={CREATE_PATIENT_FORM_ID}
      noValidate
      onSubmit={submit}
    >
      <FieldGroup className="gap-4">
        {form.formState.errors.root?.message !== undefined && (
          <Alert variant="destructive">
            <CircleAlertIcon aria-hidden="true" />
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}
        <Field className="min-h-15" data-invalid={firstNameError !== undefined}>
          <FieldLabel className="leading-[18px]" htmlFor="patient-first-name">
            {t('patients.create.fields.firstName')}
          </FieldLabel>
          <Input
            {...form.register('firstName', {
              setValueAs: trimTextValue,
            })}
            aria-invalid={firstNameError !== undefined}
            autoComplete="given-name"
            id="patient-first-name"
            placeholder={t('patients.create.fields.firstNamePlaceholder')}
          />
          <FieldError>{firstNameError}</FieldError>
        </Field>
        <Field className="min-h-15" data-invalid={lastNameError !== undefined}>
          <FieldLabel className="leading-[18px]" htmlFor="patient-last-name">
            {t('patients.create.fields.lastName')}
          </FieldLabel>
          <Input
            {...form.register('lastName', { setValueAs: trimTextValue })}
            aria-invalid={lastNameError !== undefined}
            autoComplete="family-name"
            id="patient-last-name"
            placeholder={t('patients.create.fields.lastNamePlaceholder')}
          />
          <FieldError>{lastNameError}</FieldError>
        </Field>
        <Field className="min-h-15" data-invalid={ageError !== undefined}>
          <FieldLabel className="leading-[18px]" htmlFor="patient-age">
            {t('patients.create.fields.age')}
          </FieldLabel>
          <Input
            {...form.register('age', { valueAsNumber: true })}
            aria-invalid={ageError !== undefined}
            id="patient-age"
            inputMode="numeric"
            max={150}
            min={0}
            placeholder={t('patients.create.fields.agePlaceholder')}
            type="number"
          />
          <FieldError>{ageError}</FieldError>
        </Field>
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
        disabled={mutation.isPending}
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('patients.create.title')}</DialogTitle>
              <DialogDescription>
                {t('patients.create.description')}
              </DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter>{footer}</DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/** Normalizes patient names before generated-schema validation. */
function trimTextValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/**
 * Resolves a patient field error from local or server-side validation.
 *
 * @param error React Hook Form error for the field.
 * @param fallbackMessage Localized message for client-side validation.
 * @param t Active translator for stable server violation codes.
 * @returns The localized error message, when the field is invalid.
 */
function getPatientFieldErrorMessage(
  error: FormFieldError | undefined,
  fallbackMessage: string,
  t: ReturnType<typeof useTranslation>['t'],
): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  if (error.type === 'server') {
    return t(`errors.validation.${error.message}`);
  }
  return fallbackMessage;
}
