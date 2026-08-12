import { HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import {
  FieldViolationCode,
  type FieldViolationCode as FieldViolationCodeValue,
} from '../http/field-violation-code';
import { ProblemCode } from '../http/problem-code';
import type { FieldViolation } from '../http/problem-details.model';
import { ProblemDetailsException } from '../http/problem-details.exception';

const CONSTRAINT_CODES: Readonly<Record<string, FieldViolationCodeValue>> = {
  graphemeLength: FieldViolationCode.LENGTH_INVALID,
  isEmail: FieldViolationCode.EMAIL_INVALID,
  isInt: FieldViolationCode.INTEGER_REQUIRED,
  isNotEmpty: FieldViolationCode.REQUIRED,
  isString: FieldViolationCode.STRING_REQUIRED,
  isUuid: FieldViolationCode.UUID_INVALID,
  max: FieldViolationCode.OUT_OF_RANGE,
  maxLength: FieldViolationCode.TOO_LONG,
  min: FieldViolationCode.OUT_OF_RANGE,
  minLength: FieldViolationCode.TOO_SHORT,
  whitelistValidation: FieldViolationCode.UNKNOWN_FIELD,
};

/**
 * Converts class-validator failures into safe field codes without rejected values.
 *
 * @param errors Validation errors produced by the strict global pipe.
 * @returns A public validation problem suitable for the global filter.
 */
export function createValidationException(
  errors: ValidationError[],
): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.VALIDATION_FAILED,
    detail: 'The request contains invalid fields.',
    status: HttpStatus.BAD_REQUEST,
    title: 'Validation failed',
    violations: flattenViolations(errors),
  });
}

/**
 * Flattens nested validation failures into stable field paths.
 *
 * @param errors Validation tree from class-validator.
 * @param parent Parent property path for nested DTOs.
 * @returns Safe field and code pairs.
 */
function flattenViolations(
  errors: ValidationError[],
  parent = '',
): FieldViolation[] {
  return errors.flatMap((error) => {
    const field =
      parent.length === 0 ? error.property : `${parent}.${error.property}`;
    const ownViolations = Object.keys(error.constraints ?? {}).map(
      (constraint): FieldViolation => ({
        code: CONSTRAINT_CODES[constraint] ?? FieldViolationCode.INVALID,
        field,
      }),
    );
    return [
      ...ownViolations,
      ...flattenViolations(error.children ?? [], field),
    ];
  });
}
