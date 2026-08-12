import {
  createParamDecorator,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ProblemCode } from '../../../../http/problem-code';
import { ProblemDetailsException } from '../../../../http/problem-details.exception';
import type { AuthenticatedSessionModel } from '../../application/models/auth-session.model';

/** Express request after successful execution of the global session guard. */
export interface AuthenticatedRequest extends Request {
  authenticatedSession?: AuthenticatedSessionModel;
}

/** Extracts the verified server-side session without accepting a client owner ID. */
export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedSessionModel => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.authenticatedSession === undefined) {
      throw new ProblemDetailsException({
        code: ProblemCode.AUTHENTICATION_REQUIRED,
        detail: 'A valid authenticated session is required.',
        status: HttpStatus.UNAUTHORIZED,
        title: 'Authentication required',
      });
    }
    return request.authenticatedSession;
  },
);
