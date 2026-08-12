import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Validated query shared by zero-based server-paginated collections. */
export class PageQuery {
  @ApiPropertyOptional({
    default: 0,
    format: 'int32',
    minimum: 0,
    type: 'integer',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  page = 0;

  @ApiPropertyOptional({
    default: 20,
    format: 'int32',
    maximum: 50,
    minimum: 1,
    type: 'integer',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  pageSize = 20;
}
