import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CreatePatientRequest } from './create-patient-request.dto';

/** Explicit current-photo decision required by every patient update. */
export enum PatientPhotoAction {
  KEEP = 'keep',
  REMOVE = 'remove',
  REPLACE = 'replace',
}

/** Complete editable patient fields and one explicit photo decision. */
export class UpdatePatientRequest extends CreatePatientRequest {
  @ApiProperty({ enum: PatientPhotoAction, enumName: 'PatientPhotoAction' })
  @IsEnum(PatientPhotoAction)
  photoAction!: PatientPhotoAction;
}
