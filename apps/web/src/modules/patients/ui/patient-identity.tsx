import type { ElementType, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { getPatientInitials } from '@/modules/patients/lib/patient-identity';
import { getPatientPhotoUrl } from '@/modules/patients/lib/patient-photo-url';
import type { PatientResponse } from '@/shared/api/generated/models/patientResponse';
import { cn } from '@/shared/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar';

/** Props for the shared non-interactive patient identity composition. */
interface PatientIdentityProps {
  as?: 'h1' | 'span';
  avatarClassName?: string;
  className?: string;
  description?: ReactNode;
  nameClassName?: string;
  nameId?: string;
  patient: PatientResponse;
  photoRevision?: number;
}

/** Shows one current private photo or initials beside the authoritative full name. */
export function PatientIdentity({
  as = 'span',
  avatarClassName,
  className,
  description,
  nameClassName,
  nameId,
  patient,
  photoRevision = 0,
}: PatientIdentityProps) {
  const { i18n } = useTranslation();
  const Name: ElementType = as;
  const fullName = `${patient.firstName} ${patient.lastName}`;
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <Avatar aria-hidden="true" className={avatarClassName}>
        {patient.hasPhoto && (
          <AvatarImage
            alt=""
            crossOrigin="use-credentials"
            key={photoRevision}
            src={getPatientPhotoUrl(patient.id)}
          />
        )}
        <AvatarFallback>
          {getPatientInitials(
            patient.firstName,
            patient.lastName,
            i18n.language,
          )}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <Name className={cn('block min-w-0', nameClassName)} id={nameId}>
          {fullName}
        </Name>
        {description}
      </div>
    </div>
  );
}
