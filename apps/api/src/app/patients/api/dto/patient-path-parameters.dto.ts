import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Validated patient resource path parameters. */
export class PatientPathParameters {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  patientId!: string;
}
