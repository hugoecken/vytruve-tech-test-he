import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ProblemCode } from './problem-code';
import type {
  ProblemDetails,
  ProblemDetailsDefinition,
} from './problem-details.model';
import { ProblemDetailsException } from './problem-details.exception';

/** Translates every uncaught API failure into the stable RFC 9457 contract. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  /**
   * Serializes one safe problem and owns the single log point for unexpected failures.
   *
   * @param exception Untrusted failure escaping the request pipeline.
   * @param host Nest execution context containing the HTTP request and response.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const problem = this.resolveProblem(exception, request);
    const responseProblem: ProblemDetails = {
      ...problem,
      instance: request.path,
    };

    response
      .status(problem.status)
      .type('application/problem+json')
      .json(responseProblem);
  }

  /**
   * Resolves supported failures without exposing framework or infrastructure messages.
   *
   * @param exception Failure escaping a controller or guard.
   * @param request Current request used only to classify bounded upload routes.
   * @returns Safe problem metadata without its request-specific instance.
   */
  private resolveProblem(
    exception: unknown,
    request: Request,
  ): ProblemDetailsDefinition {
    if (exception instanceof ProblemDetailsException) {
      return exception.getProblemDetails();
    }
    if (exception instanceof ThrottlerException) {
      return createProblem(
        HttpStatus.TOO_MANY_REQUESTS,
        ProblemCode.AUTH_RATE_LIMITED,
        'Too many authentication attempts',
        'Too many authentication attempts were made. Try again later.',
      );
    }
    if (exception instanceof PayloadTooLargeException) {
      if (isPatientPhotoUpload(request)) {
        return createProblem(
          HttpStatus.PAYLOAD_TOO_LARGE,
          ProblemCode.PATIENT_PHOTO_TOO_LARGE,
          'Patient photo too large',
          'The patient photo exceeds the 5 MiB size limit.',
        );
      }
      return createProblem(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ProblemCode.SCAN_TOO_LARGE,
        'Scan too large',
        'The uploaded scan exceeds the configured size limit.',
      );
    }
    if (
      exception instanceof HttpException &&
      exception.getStatus() === HttpStatus.BAD_REQUEST
    ) {
      return createProblem(
        HttpStatus.BAD_REQUEST,
        ProblemCode.VALIDATION_FAILED,
        'Validation failed',
        'The request could not be parsed or contains invalid fields.',
      );
    }
    if (
      exception instanceof HttpException &&
      exception.getStatus() === HttpStatus.NOT_FOUND
    ) {
      return createProblem(
        HttpStatus.NOT_FOUND,
        ProblemCode.ROUTE_NOT_FOUND,
        'Route not found',
        'The requested API route does not exist.',
      );
    }

    this.logger.error('Unexpected internal failure');
    return createProblem(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ProblemCode.INTERNAL_ERROR,
      'Internal server error',
      'The request could not be completed.',
    );
  }
}

/** Identifies only the two bounded multipart patient-photo mutations. */
function isPatientPhotoUpload(request: Request): boolean {
  return (
    (request.method === 'POST' || request.method === 'PATCH') &&
    /^\/api\/patients(?:\/[0-9a-f-]+)?\/?$/i.test(request.path)
  );
}

/**
 * Builds framework-originated problems using the same stable type convention.
 *
 * @param status HTTP status exposed to the client.
 * @param code Stable machine-readable error code.
 * @param title Short problem category.
 * @param detail Safe English fallback detail.
 * @returns Problem metadata without a request instance.
 */
function createProblem(
  status: number,
  code: ProblemDetailsDefinition['code'],
  title: string,
  detail: string,
): ProblemDetailsDefinition {
  return {
    code,
    detail,
    status,
    title,
    type: 'about:blank',
  };
}
