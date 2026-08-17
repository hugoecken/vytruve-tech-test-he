import { useCallback, useRef, useState } from 'react';
import { ImageIcon, UploadIcon, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatFileSize } from '@/shared/lib/format-file-size';
import { Button } from '@/shared/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/shared/ui/field';
import { Input } from '@/shared/ui/input';
import { Spinner } from '@/shared/ui/spinner';

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Patient-photo decision owned by the containing create or edit form. */
export type PatientPhotoDecision =
  | { action: 'invalid' }
  | { action: 'keep' }
  | { action: 'preparing' }
  | { action: 'remove' }
  | { action: 'replace'; file: File };

type RestingState = 'current' | 'empty' | 'removed';
type PhotoState =
  | { status: 'current' }
  | { status: 'empty' }
  | { status: 'removed' }
  | { code: PhotoErrorCode; returnTo: RestingState; status: 'invalid' }
  | { file: File; returnTo: RestingState; status: 'preparing' }
  | {
      file: File;
      format: string;
      objectUrl: string;
      returnTo: RestingState;
      status: 'selected';
    };
type PhotoErrorCode = 'decode' | 'size' | 'type';

/** Props for one reusable local patient-photo decision field. */
interface PatientPhotoFieldProps {
  currentPhotoUrl?: string;
  disabled?: boolean;
  hasCurrentPhoto?: boolean;
  inputId: string;
  onChange: (decision: PatientPhotoDecision) => void;
}

/**
 * Validates and previews one local patient photo without network activity.
 *
 * @param props Current confirmed-photo state and form decision callback.
 * @returns One accessible choose, change, or remove field.
 */
export function PatientPhotoField({
  currentPhotoUrl,
  disabled = false,
  hasCurrentPhoto = false,
  inputId,
  onChange,
}: PatientPhotoFieldProps) {
  const { i18n, t } = useTranslation();
  const generation = useRef(0);
  const [state, setState] = useState<PhotoState>({
    status: hasCurrentPhoto ? 'current' : 'empty',
  });
  const lifecycleRef = useCallback(() => {
    return () => {
      generation.current += 1;
    };
  }, []);

  const restingState = getRestingState(state);
  const chooseFile = async (file: File) => {
    const request = generation.current + 1;
    generation.current = request;
    setState({ file, returnTo: restingState, status: 'preparing' });
    onChange({ action: 'preparing' });

    const result = await inspectPhoto(file);
    if (request !== generation.current) {
      return;
    }
    if ('error' in result) {
      setState({
        code: result.error,
        returnTo: restingState,
        status: 'invalid',
      });
      onChange({ action: 'invalid' });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setState({
      file,
      format: result.format,
      objectUrl,
      returnTo: restingState,
      status: 'selected',
    });
    onChange({ action: 'replace', file });
  };

  const selectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file !== undefined) {
      void chooseFile(file);
    }
  };

  const remove = () => {
    generation.current += 1;
    if (state.status === 'current') {
      setState({ status: 'removed' });
      onChange({ action: 'remove' });
      return;
    }
    const restored = getRestingState(state);
    setState({ status: restored });
    onChange({ action: restored === 'removed' ? 'remove' : 'keep' });
  };

  return (
    <Field ref={lifecycleRef}>
      <FieldLabel htmlFor={inputId}>{t('patients.photo.label')}</FieldLabel>
      <Input
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        disabled={disabled}
        hidden
        id={inputId}
        onChange={selectFile}
        type="file"
      />
      {isPhotoMediaState(state) ? (
        <div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center">
          <PhotoMedia currentPhotoUrl={currentPhotoUrl} state={state} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <PhotoSummary language={i18n.language} state={state} />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                disabled={disabled}
                nativeButton={false}
                render={<label htmlFor={inputId} />}
                type="button"
                variant="outline"
              >
                <UploadIcon aria-hidden="true" data-icon="inline-start" />
                {t('patients.photo.change')}
              </Button>
              <Button
                disabled={disabled}
                onClick={remove}
                type="button"
                variant="outline"
              >
                <XIcon aria-hidden="true" data-icon="inline-start" />
                {t('patients.photo.remove')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-4 text-center">
          <ImageIcon
            aria-hidden="true"
            className="size-6 text-muted-foreground"
          />
          <FieldDescription>
            {state.status === 'removed'
              ? t('patients.photo.removed')
              : t('patients.photo.hint')}
          </FieldDescription>
          <Button
            disabled={disabled}
            nativeButton={false}
            render={<label htmlFor={inputId} />}
            type="button"
            variant="outline"
          >
            <UploadIcon aria-hidden="true" data-icon="inline-start" />
            {t('patients.photo.choose')}
          </Button>
        </div>
      )}
      {state.status === 'invalid' && (
        <FieldError>{t(`patients.photo.validation.${state.code}`)}</FieldError>
      )}
      {state.status !== 'invalid' && !isPhotoMediaState(state) && (
        <FieldDescription>{t('patients.photo.formats')}</FieldDescription>
      )}
    </Field>
  );
}

/** Renders the stable photo footprint while preparing or selected. */
function PhotoMedia({
  currentPhotoUrl,
  state,
}: {
  currentPhotoUrl?: string;
  state: Extract<PhotoState, { status: 'current' | 'preparing' | 'selected' }>;
}) {
  const { t } = useTranslation();
  if (state.status === 'preparing') {
    return (
      <div
        aria-label={t('patients.photo.preparing')}
        className="flex size-28 shrink-0 items-center justify-center rounded-xl bg-muted sm:size-32"
        role="status"
      >
        <Spinner aria-hidden="true" className="size-6" />
      </div>
    );
  }
  if (state.status === 'current') {
    return currentPhotoUrl === undefined ? (
      <div className="flex size-28 shrink-0 items-center justify-center rounded-xl bg-muted sm:size-32">
        <ImageIcon
          aria-hidden="true"
          className="size-7 text-muted-foreground"
        />
      </div>
    ) : (
      <img
        alt={t('patients.photo.current')}
        className="size-28 shrink-0 rounded-xl object-cover sm:size-32"
        src={currentPhotoUrl}
      />
    );
  }
  return <LocalPhotoPreview objectUrl={state.objectUrl} />;
}

/** Owns revocation of exactly one rendered local Blob URL via a React 19 ref. */
function LocalPhotoPreview({ objectUrl }: { objectUrl: string }) {
  const { t } = useTranslation();
  const imageRef = useCallback(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);
  return (
    <img
      alt={t('patients.photo.selected')}
      className="size-28 shrink-0 rounded-xl object-cover sm:size-32"
      ref={imageRef}
      src={objectUrl}
    />
  );
}

/** Shows only a safe local format and bounded size summary. */
function PhotoSummary({
  language,
  state,
}: {
  language: string;
  state: Extract<PhotoState, { status: 'current' | 'preparing' | 'selected' }>;
}) {
  const { t } = useTranslation();
  if (state.status === 'selected') {
    return (
      <p className="text-sm text-muted-foreground">
        {state.format.toUpperCase()} ·{' '}
        {formatFileSize(state.file.size, language)}
      </p>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      {state.status === 'preparing'
        ? t('patients.photo.preparing')
        : t('patients.photo.current')}
    </p>
  );
}

/** Resolves the state restored when a local selection is removed. */
function getRestingState(state: PhotoState): RestingState {
  return 'returnTo' in state ? state.returnTo : state.status;
}

/** Narrows a field state to the stable media-and-actions layout. */
function isPhotoMediaState(
  state: PhotoState,
): state is Extract<
  PhotoState,
  { status: 'current' | 'preparing' | 'selected' }
> {
  return (
    state.status === 'current' ||
    state.status === 'preparing' ||
    state.status === 'selected'
  );
}

/** Performs bounded signature and browser decode checks without I/O. */
async function inspectPhoto(
  file: File,
): Promise<{ error: PhotoErrorCode } | { format: string }> {
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return { error: 'size' };
  }
  if (file.size === 0) {
    return { error: 'decode' };
  }
  try {
    const { fileTypeFromBlob } = await import('file-type');
    const detected = await fileTypeFromBlob(file);
    if (
      detected === undefined ||
      !ACCEPTED_MEDIA_TYPES.has(detected.mime) ||
      file.type !== detected.mime
    ) {
      return { error: 'type' };
    }
    const bitmap = await createImageBitmap(file);
    bitmap.close();
    return { format: detected.ext === 'jpg' ? 'jpeg' : detected.ext };
  } catch {
    return { error: 'decode' };
  }
}
