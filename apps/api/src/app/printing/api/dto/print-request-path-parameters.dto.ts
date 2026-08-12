import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Validated patient path used by print-request history. */
export class PatientPrintRequestsPathParameters {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId!: string;
}

/** Validated patient and scan path used by print submission. */
export class ScanPrintRequestsPathParameters {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  scanId!: string;
}
