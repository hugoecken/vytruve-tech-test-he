import { ApiProperty } from '@nestjs/swagger';
import { PageInfoResponse } from '../../../../pagination/page-info-response.dto';
import {
  ScanEncoding,
  type ScanEncoding as ScanEncodingValue,
} from '../../application/models/scan.model';

/** Public scan metadata that excludes all private storage information. */
export class ScanResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: ['ply'], example: 'ply' })
  format!: 'ply';

  @ApiProperty({
    enum: Object.values(ScanEncoding),
    enumName: 'ScanEncoding',
  })
  encoding!: ScanEncodingValue;

  @ApiProperty({
    format: 'int32',
    minimum: 1,
    type: 'integer',
  })
  sizeBytes!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({
    description:
      'Whether this scan currently has no non-terminal print request.',
  })
  printingAvailable!: boolean;
}

/** Public server-paginated scan collection without a total. */
export class ScanPageResponse {
  @ApiProperty({ type: [ScanResponse] })
  items!: ScanResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo!: PageInfoResponse;
}
