import { ApiProperty } from '@nestjs/swagger';
import { PageInfoResponse } from '@api/pagination/page-info-response.dto';

/** Public owner-visible patient record. */
export class PatientResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Alex' })
  firstName!: string;

  @ApiProperty({ example: 'Morgan' })
  lastName!: string;

  @ApiProperty({ example: 42, format: 'int32', type: 'integer' })
  age!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

/** Public server-paginated patient collection page without a total. */
export class PatientPageResponse {
  @ApiProperty({ type: [PatientResponse] })
  items!: PatientResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo!: PageInfoResponse;
}
