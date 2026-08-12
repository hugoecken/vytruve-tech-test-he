import { ApiProperty } from '@nestjs/swagger';
import { PageInfoResponse } from '@api/pagination/page-info-response.dto';
import {
  PrintRequestStatus,
  type PrintRequestStatus as PrintRequestStatusValue,
} from '../../application/models/print-request.model';

/** Public provider-neutral projection of one printing attempt. */
export class PrintRequestResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ maxLength: 12, minLength: 12 })
  reference!: string;

  @ApiProperty({ format: 'uuid' })
  scanId!: string;

  @ApiProperty({
    enum: Object.values(PrintRequestStatus),
    enumName: 'PrintRequestStatus',
  })
  status!: PrintRequestStatusValue;

  @ApiProperty({
    maximum: 100,
    minimum: 0,
    nullable: true,
    type: 'integer',
  })
  estimatedProgress!: number | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: 'string' })
  scheduledStartAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: 'string' })
  scheduledEndAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true, type: 'string' })
  lastObservedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

/** Public server-paginated print-request history without a total. */
export class PrintRequestPageResponse {
  @ApiProperty({ type: [PrintRequestResponse] })
  items!: PrintRequestResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo!: PageInfoResponse;
}
