import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

/** Validates user-visible length using Unicode grapheme clusters. */
@ValidatorConstraint({ name: 'graphemeLength', async: false })
export class GraphemeLengthConstraint implements ValidatorConstraintInterface {
  /**
   * Checks a string against the decorator's inclusive grapheme bounds.
   *
   * @param value Untrusted field value supplied to class-validator.
   * @param validationArguments Decorator bounds and property metadata.
   * @returns Whether the value is a string inside the accepted range.
   */
  validate(value: unknown, validationArguments: ValidationArguments): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const [minimum, maximum] = validationArguments.constraints as [
      number,
      number,
    ];
    const length = [...new Intl.Segmenter().segment(value)].length;
    return length >= minimum && length <= maximum;
  }

  /**
   * Supplies a developer-facing fallback that is never exposed directly by the API.
   *
   * @param validationArguments Decorator bounds and property metadata.
   * @returns A concise validation diagnostic.
   */
  defaultMessage(validationArguments: ValidationArguments): string {
    const [minimum, maximum] = validationArguments.constraints as [
      number,
      number,
    ];
    return `${validationArguments.property} must contain between ${minimum} and ${maximum} characters`;
  }
}

/**
 * Creates a reusable Unicode grapheme-length decorator.
 *
 * @param minimum Inclusive minimum grapheme count.
 * @param maximum Inclusive maximum grapheme count.
 * @param options Optional class-validator behavior.
 * @returns A property decorator registered with class-validator.
 */
export function GraphemeLength(
  minimum: number,
  maximum: number,
  options?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    registerDecorator({
      constraints: [minimum, maximum],
      name: 'graphemeLength',
      options,
      propertyName: propertyKey.toString(),
      target: target.constructor,
      validator: GraphemeLengthConstraint,
    });
  };
}
