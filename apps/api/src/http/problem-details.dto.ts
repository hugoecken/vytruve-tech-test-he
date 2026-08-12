import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ProblemCode,
  type ProblemCode as ProblemCodeValue,
} from './problem-code';

/** OpenAPI representation of one field-level validation violation. */
export class FieldViolationResponse {
  @ApiProperty({ example: 'OUT_OF_RANGE' })
  code!: ProblemCodeValue;

  @ApiProperty({ example: 'age' })
  field!: string;
}

/** OpenAPI representation of the API's RFC 9457 error contract. */
export class ProblemDetailsResponse {
  @ApiProperty({
    enum: Object.values(ProblemCode),
    enumName: 'ProblemCode',
    example: ProblemCode.VALIDATION_FAILED,
  })
  code!: string;

  @ApiProperty({ example: 'The request contains invalid fields.' })
  detail!: string;

  @ApiProperty({ example: '/api/patients' })
  instance!: string;

  @ApiProperty({ example: 400, format: 'int32', type: 'integer' })
  status!: number;

  @ApiProperty({ example: 'Validation failed' })
  title!: string;

  @ApiProperty({
    example: 'about:blank',
    format: 'uri',
  })
  type!: string;

  @ApiPropertyOptional({ type: [FieldViolationResponse] })
  violations?: FieldViolationResponse[];
}
