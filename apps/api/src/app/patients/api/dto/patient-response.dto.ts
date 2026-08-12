import { ApiProperty } from '@nestjs/swagger';

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

/** Server-side collection navigation metadata. */
export class PageInfoResponse {
  @ApiProperty()
  hasNext!: boolean;

  @ApiProperty({ format: 'int32', minimum: 0, type: 'integer' })
  page!: number;

  @ApiProperty({ format: 'int32', maximum: 50, minimum: 1, type: 'integer' })
  pageSize!: number;
}

/** Public server-paginated patient collection page without a total. */
export class PatientPageResponse {
  @ApiProperty({ type: [PatientResponse] })
  items!: PatientResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo!: PageInfoResponse;
}
