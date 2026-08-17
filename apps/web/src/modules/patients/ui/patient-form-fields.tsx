import type {
  FieldError as FormFieldError,
  UseFormReturn,
} from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { CreatePatientBody } from '@/shared/api/generated/models/createPatientBody';
import { Field, FieldError, FieldLabel } from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';

/** Editable identity fields shared by patient creation and editing. */
export type PatientFormValues = Omit<CreatePatientBody, 'photo'>;

/** Props for the three existing patient identity fields. */
interface PatientFormFieldsProps {
  disabled?: boolean;
  form: UseFormReturn<PatientFormValues>;
  idPrefix: string;
}

/** Renders the existing generated-schema-backed patient identity fields. */
export function PatientFormFields({
  disabled = false,
  form,
  idPrefix,
}: PatientFormFieldsProps) {
  const { t } = useTranslation();
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

  return (
    <>
      <Field className="min-h-15" data-invalid={firstNameError !== undefined}>
        <FieldLabel
          className="leading-[18px]"
          htmlFor={`${idPrefix}-first-name`}
        >
          {t('patients.create.fields.firstName')}
        </FieldLabel>
        <Input
          {...form.register('firstName', { setValueAs: trimTextValue })}
          aria-invalid={firstNameError !== undefined}
          autoComplete="given-name"
          disabled={disabled}
          id={`${idPrefix}-first-name`}
          placeholder={t('patients.create.fields.firstNamePlaceholder')}
        />
        <FieldError>{firstNameError}</FieldError>
      </Field>
      <Field className="min-h-15" data-invalid={lastNameError !== undefined}>
        <FieldLabel
          className="leading-[18px]"
          htmlFor={`${idPrefix}-last-name`}
        >
          {t('patients.create.fields.lastName')}
        </FieldLabel>
        <Input
          {...form.register('lastName', { setValueAs: trimTextValue })}
          aria-invalid={lastNameError !== undefined}
          autoComplete="family-name"
          disabled={disabled}
          id={`${idPrefix}-last-name`}
          placeholder={t('patients.create.fields.lastNamePlaceholder')}
        />
        <FieldError>{lastNameError}</FieldError>
      </Field>
      <Field className="min-h-15" data-invalid={ageError !== undefined}>
        <FieldLabel className="leading-[18px]" htmlFor={`${idPrefix}-age`}>
          {t('patients.create.fields.age')}
        </FieldLabel>
        <Input
          {...form.register('age', { valueAsNumber: true })}
          aria-invalid={ageError !== undefined}
          disabled={disabled}
          id={`${idPrefix}-age`}
          inputMode="numeric"
          max={150}
          min={0}
          placeholder={t('patients.create.fields.agePlaceholder')}
          type="number"
        />
        <FieldError>{ageError}</FieldError>
      </Field>
    </>
  );
}

/** Normalizes patient names before generated-schema validation. */
function trimTextValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** Resolves one local or server-side patient field error. */
function getPatientFieldErrorMessage(
  error: FormFieldError | undefined,
  fallbackMessage: string,
  t: ReturnType<typeof useTranslation>['t'],
): string | undefined {
  if (error === undefined) {
    return undefined;
  }
  return error.type === 'server'
    ? t(`errors.validation.${error.message}`)
    : fallbackMessage;
}
