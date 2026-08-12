import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsString, Max, Min } from 'class-validator';
import { GraphemeLength } from '@api/validation/grapheme-length.validator';

/** Validated patient fields supplied without any ownership identifier. */
export class CreatePatientRequest {
  @ApiProperty({ example: 'Alex', maxLength: 100, minLength: 1 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @GraphemeLength(1, 100)
  firstName!: string;

  @ApiProperty({ example: 'Morgan', maxLength: 100, minLength: 1 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @GraphemeLength(1, 100)
  lastName!: string;

  @ApiProperty({
    example: 42,
    format: 'int32',
    maximum: 150,
    minimum: 0,
    type: 'integer',
  })
  @IsInt()
  @Min(0)
  @Max(150)
  age!: number;
}
