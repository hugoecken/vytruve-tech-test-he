import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { ApiProblemResponse } from '@api/http/api-problem-response.decorator';
import type { AuthenticatedSessionModel } from '../../application/models/auth-session.model';
import { AuthService } from '../../application/services/auth.service';
import { SessionCookieService } from '../../infrastructure/security/session-cookie.service';
import { SESSION_COOKIE_NAME } from '../../infrastructure/security/session.constants';
import { CurrentSession } from '../decorators/current-session.decorator';
import { Public } from '../decorators/public.decorator';
import { AccountSessionResponse } from '../dto/account-session-response.dto';
import { CreateAccountRequest } from '../dto/create-account-request.dto';
import { CreateSessionRequest } from '../dto/create-session-request.dto';
import { AuthApiMapper } from '../mappers/auth-api.mapper';

/** Exposes account registration and the browser-managed session lifecycle. */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  /**
   * Creates the transport boundary with no direct persistence ownership.
   *
   * @param auth Authentication use cases.
   * @param mapper Authentication API mapper.
   * @param cookies Secure session-cookie boundary.
   */
  constructor(
    private readonly auth: AuthService,
    private readonly mapper: AuthApiMapper,
    private readonly cookies: SessionCookieService,
  ) {}

  /**
   * Registers one account and writes its HTTP-only cookie.
   *
   * @param request Validated account credentials.
   * @param response Passthrough response used only for cookie issuance.
   * @returns Public account identity and session expiry.
   * @throws ACCOUNT_ALREADY_EXISTS, VALIDATION_FAILED, or AUTH_RATE_LIMITED.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('accounts')
  @Header('Location', '/api/auth/session')
  @ApiOperation({
    description:
      'Registers a unique normalized account and starts its browser session.',
    operationId: 'createAccount',
    summary: 'Create an account',
  })
  @ApiResponse({
    description: 'Account created and session cookie issued.',
    headers: {
      Location: {
        description: 'Canonical session resource.',
        schema: { type: 'string' },
      },
      'Set-Cookie': {
        description: 'HTTP-only session cookie.',
        schema: { type: 'string' },
      },
    },
    status: HttpStatus.CREATED,
    type: AccountSessionResponse,
  })
  @ApiProblemResponse(400, 'The account request contains invalid fields.')
  @ApiProblemResponse(409, 'The normalized email is already registered.')
  @ApiProblemResponse(429, 'The registration rate limit was reached.')
  @ApiProblemResponse(500, 'The account could not be created safely.')
  async createAccount(
    @Body() request: CreateAccountRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccountSessionResponse> {
    const issued = await this.auth.register(
      this.mapper.toCreateAccountCommand(request),
    );
    this.cookies.set(response, issued.token);
    return this.mapper.toResponse(issued.session);
  }

  /**
   * Verifies credentials and starts one browser-managed session.
   *
   * @param request Validated but untrusted credentials.
   * @param response Passthrough response used only for cookie issuance.
   * @returns Public account identity and session expiry.
   * @throws AUTHENTICATION_FAILED, VALIDATION_FAILED, or AUTH_RATE_LIMITED.
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    description:
      'Authenticates generic credentials and stores the session only in a cookie.',
    operationId: 'createSession',
    summary: 'Sign in',
  })
  @ApiResponse({
    description: 'Credentials accepted and session cookie issued.',
    headers: {
      'Set-Cookie': {
        description: 'HTTP-only session cookie.',
        schema: { type: 'string' },
      },
    },
    status: HttpStatus.OK,
    type: AccountSessionResponse,
  })
  @ApiProblemResponse(400, 'The credential request contains invalid fields.')
  @ApiProblemResponse(401, 'The credentials are not valid.')
  @ApiProblemResponse(429, 'The login rate limit was reached.')
  @ApiProblemResponse(500, 'Authentication could not be completed safely.')
  async createSession(
    @Body() request: CreateSessionRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AccountSessionResponse> {
    const issued = await this.auth.login(
      this.mapper.toCreateSessionCommand(request),
    );
    this.cookies.set(response, issued.token);
    return this.mapper.toResponse(issued.session);
  }

  /**
   * Restores the public account view from the verified existing cookie.
   *
   * @param session Verified server-derived session subject and expiry.
   * @returns Current public account identity without rotating the JWT.
   * @throws AUTHENTICATION_REQUIRED when the cookie or identity is unavailable.
   */
  @Get('session')
  @ApiCookieAuth(SESSION_COOKIE_NAME)
  @ApiOperation({
    description:
      'Returns the account represented by the existing verified session cookie.',
    operationId: 'getSession',
    summary: 'Restore the current session',
  })
  @ApiResponse({
    description: 'Current authenticated account and original session expiry.',
    status: HttpStatus.OK,
    type: AccountSessionResponse,
  })
  @ApiProblemResponse(401, 'A valid session cookie is required.')
  @ApiProblemResponse(500, 'Session restoration failed unexpectedly.')
  async getSession(
    @CurrentSession() session: AuthenticatedSessionModel,
  ): Promise<AccountSessionResponse> {
    return this.mapper.toResponse(await this.auth.restore(session));
  }

  /**
   * Clears the cookie idempotently even when it is absent or expired.
   *
   * @param response Passthrough response used only to clear the cookie.
   */
  @Public()
  @Delete('session')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    description:
      'Clears the browser session cookie without requiring a valid token.',
    operationId: 'deleteSession',
    summary: 'Sign out',
  })
  @ApiResponse({
    description: 'Session cookie cleared idempotently.',
    headers: {
      'Set-Cookie': {
        description: 'Expired session cookie.',
        schema: { type: 'string' },
      },
    },
    status: HttpStatus.NO_CONTENT,
  })
  deleteSession(@Res({ passthrough: true }) response: Response): void {
    this.cookies.clear(response);
  }
}
