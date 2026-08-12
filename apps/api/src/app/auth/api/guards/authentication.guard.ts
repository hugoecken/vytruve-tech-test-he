import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProblemCode } from '../../../../http/problem-code';
import { ProblemDetailsException } from '../../../../http/problem-details.exception';
import type { AuthenticatedRequest } from '../decorators/current-session.decorator';
import { PUBLIC_ROUTE_METADATA } from '../decorators/public.decorator';
import { JwtSessionService } from '../../infrastructure/security/jwt-session.service';
import { SESSION_COOKIE_NAME } from '../../infrastructure/security/session.constants';

/** Protects every route unless its controller metadata explicitly declares it public. */
@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticationGuard.name);

  /**
   * Creates the global guard with metadata and JWT verification dependencies.
   *
   * @param reflector Nest metadata reader used for explicit public routes.
   * @param sessions JWT verification boundary.
   */
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: JwtSessionService,
  ) {}

  /**
   * Verifies the HTTP-only cookie and attaches its server-derived subject.
   *
   * @param context Current Nest execution context.
   * @returns Whether request execution may continue.
   * @throws AUTHENTICATION_REQUIRED for missing, invalid, or expired sessions.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[SESSION_COOKIE_NAME];
    if (typeof token !== 'string' || token.length === 0) {
      throw authenticationRequired();
    }

    try {
      request.authenticatedSession = await this.sessions.verify(token);
      return true;
    } catch {
      this.logger.warn('Session authentication failed');
      throw authenticationRequired();
    }
  }
}

/** @returns The generic problem used for every invalid session category. */
function authenticationRequired(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.AUTHENTICATION_REQUIRED,
    detail: 'A valid authenticated session is required.',
    status: HttpStatus.UNAUTHORIZED,
    title: 'Authentication required',
  });
}
