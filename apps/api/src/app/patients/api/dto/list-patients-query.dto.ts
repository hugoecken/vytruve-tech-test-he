import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Validated forward-pagination query for the current owner's patients. */
export class ListPatientsQuery {
  @ApiPropertyOptional({
    description: 'Opaque continuation cursor returned by the preceding page.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2_048)
  cursor?: string;

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
