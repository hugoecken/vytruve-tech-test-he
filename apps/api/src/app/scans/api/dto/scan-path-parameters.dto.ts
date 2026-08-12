import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Validated parent path used by scan list and upload operations. */
export class PatientScansPathParameters {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId!: string;
}

/** Validated parent and scan path used by content streaming. */
export class ScanContentPathParameters {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  scanId!: string;
}
