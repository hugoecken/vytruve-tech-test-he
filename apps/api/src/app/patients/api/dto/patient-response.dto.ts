import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

/** Forward-only collection navigation metadata. */
export class PageInfoResponse {
  @ApiProperty()
  hasNext!: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  nextCursor!: string | null;
}

/** Public patient collection page without a total or reverse cursor. */
export class PatientPageResponse {
  @ApiProperty({ type: [PatientResponse] })
  items!: PatientResponse[];

  @ApiProperty({ type: PageInfoResponse })
  pageInfo!: PageInfoResponse;
}
