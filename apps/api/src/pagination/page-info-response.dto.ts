import { ApiProperty } from '@nestjs/swagger';

/** Server-side collection navigation metadata shared by paginated responses. */
export class PageInfoResponse {
  @ApiProperty()
  hasNext!: boolean;

  @ApiProperty({ format: 'int32', minimum: 0, type: 'integer' })
  page!: number;

  @ApiProperty({ format: 'int32', maximum: 50, minimum: 1, type: 'integer' })
  pageSize!: number;
}
