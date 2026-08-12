import { HttpStatus } from '@nestjs/common';
import { ProblemCode } from '@api/http/problem-code';
import { ProblemDetailsException } from '@api/http/problem-details.exception';
import {
  ASCII_TRIANGLE_PLY,
  createBinaryTrianglePly,
} from '@api/test-support/ply-fixtures';
import { ScanEncoding } from '../models/scan.model';
import { PlyContentValidator } from './ply-content.validator';

describe(PlyContentValidator.name, () => {
  const validator = new PlyContentValidator();

  it('accepts a structurally complete ASCII triangle', () => {
    expect(validator.validate(ASCII_TRIANGLE_PLY)).toEqual({
      encoding: ScanEncoding.ASCII,
    });
  });

  it.each([
    ['binary_little_endian', ScanEncoding.BINARY_LITTLE_ENDIAN],
    ['binary_big_endian', ScanEncoding.BINARY_BIG_ENDIAN],
  ] as const)(
    'accepts a structurally complete %s triangle',
    (encoding, expected) => {
      expect(validator.validate(createBinaryTrianglePly(encoding))).toEqual({
        encoding: expected,
      });
    },
  );

  it('rejects an unsupported PLY version with the stable media-type problem', () => {
    const content = Buffer.from(
      ASCII_TRIANGLE_PLY.toString('ascii').replace('ascii 1.0', 'ascii 2.0'),
    );

    expectProblem(
      () => validator.validate(content),
      ProblemCode.SCAN_UNSUPPORTED_TYPE,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    );
  });

  it('rejects a mesh without a face declaration', () => {
    const content = Buffer.from(
      ASCII_TRIANGLE_PLY.toString('ascii')
        .replace('element face 1\n', '')
        .replace('property list uchar int vertex_indices\n', '')
        .replace('3 0 1 2\n', ''),
    );

    expectProblem(
      () => validator.validate(content),
      ProblemCode.SCAN_INVALID_CONTENT,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it('rejects a face index outside the declared vertex range', () => {
    const content = Buffer.from(
      ASCII_TRIANGLE_PLY.toString('ascii').replace('3 0 1 2', '3 0 1 3'),
    );

    expectProblem(
      () => validator.validate(content),
      ProblemCode.SCAN_INVALID_CONTENT,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it('rejects a truncated binary body', () => {
    const complete = createBinaryTrianglePly('binary_little_endian');

    expectProblem(
      () => validator.validate(complete.subarray(0, complete.length - 1)),
      ProblemCode.SCAN_INVALID_CONTENT,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });

  it('rejects an ASCII face count that exceeds the remaining tokens', () => {
    const content = Buffer.from(
      ASCII_TRIANGLE_PLY.toString('ascii').replace('3 0 1 2', '4 0 1 2'),
    );

    expectProblem(
      () => validator.validate(content),
      ProblemCode.SCAN_INVALID_CONTENT,
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  });
});

/** Asserts the public problem contract produced by synchronous validation. */
function expectProblem(
  operation: () => unknown,
  code: ProblemCode,
  status: number,
): void {
  try {
    operation();
    throw new Error('Expected validation to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemDetailsException);
    expect(
      (error as ProblemDetailsException).getProblemDetails(),
    ).toMatchObject({ code, status });
  }
}
