import {
  FileValidator,
  HttpStatus,
  Injectable,
  ParseFilePipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ApiEnvironment } from '@api/config/environment';
import { ProblemCode } from '@api/http/problem-code';
import { ProblemDetailsException } from '@api/http/problem-details.exception';

/** Enforces the presence of exactly one uploaded scan. */
@Injectable()
export class RequiredScanFilePipe extends ParseFilePipe {
  /**
   * Creates the feature-owned required-file validation.
   */
  constructor() {
    super({
      exceptionFactory: () =>
        new ProblemDetailsException({
          code: ProblemCode.VALIDATION_FAILED,
          detail: 'Exactly one scan file is required.',
          status: HttpStatus.BAD_REQUEST,
          title: 'Validation failed',
        }),
      fileIsRequired: true,
    });
  }
}

/** Repeats the transport byte limit at the application validation boundary. */
@Injectable()
export class ScanFileSizePipe extends ParseFilePipe {
  /**
   * Creates the feature-owned byte-limit validation.
   *
   * @param config Validated API configuration shared with Multer.
   */
  constructor(config: ConfigService<ApiEnvironment, true>) {
    super({
      exceptionFactory: () =>
        new ProblemDetailsException({
          code: ProblemCode.SCAN_TOO_LARGE,
          detail: 'The uploaded scan exceeds the configured size limit.',
          status: HttpStatus.PAYLOAD_TOO_LARGE,
          title: 'Scan too large',
        }),
      fileIsRequired: false,
      validators: [
        new ScanFileSizeValidator({
          maxSizeBytes: config.getOrThrow<number>('MAX_SCAN_SIZE_BYTES'),
        }),
      ],
    });
  }
}

/** Validates the inclusive application-owned scan size limit. */
class ScanFileSizeValidator extends FileValidator<
  { maxSizeBytes: number },
  Express.Multer.File
> {
  /**
   * Checks one uploaded file against the inclusive configured limit.
   *
   * @param file Uploaded multipart file.
   * @returns Whether the file size is within the accepted byte limit.
   */
  isValid(file?: Express.Multer.File): boolean {
    return (
      file !== undefined && file.size <= this.validationOptions.maxSizeBytes
    );
  }

  /**
   * Supplies the internal validator message required by ParseFilePipe.
   *
   * @returns Internal validation description; the public error is owned by the pipe.
   */
  buildErrorMessage(): string {
    return 'Scan exceeds the configured size limit';
  }
}
