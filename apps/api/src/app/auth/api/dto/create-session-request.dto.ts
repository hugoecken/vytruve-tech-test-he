import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GraphemeLength } from '../../../../validation/grapheme-length.validator';

/** Validated credentials used to create one browser session. */
export class CreateSessionRequest {
  @ApiProperty({ example: 'clinician@example.test', maxLength: 320 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({
    format: 'password',
    maxLength: 128,
    minLength: 12,
    writeOnly: true,
  })
  @IsString()
  @GraphemeLength(12, 128)
  password!: string;
}
