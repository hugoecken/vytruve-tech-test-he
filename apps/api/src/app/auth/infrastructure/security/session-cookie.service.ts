import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import type { ApiEnvironment } from '../../../../config/environment';
import {
  SESSION_COOKIE_NAME,
  SESSION_LIFETIME_SECONDS,
} from './session.constants';

/** Applies identical secure attributes when setting and clearing the session cookie. */
@Injectable()
export class SessionCookieService {
  /**
   * Creates the cookie adapter with validated environment awareness.
   *
   * @param config Validated configuration used to enable Secure in production.
   */
  constructor(private readonly config: ConfigService<ApiEnvironment, true>) {}

  /**
   * Writes a private browser-managed session cookie.
   *
   * @param response Express response used through Nest passthrough mode.
   * @param token Private JWT that must never enter the response body.
   */
  set(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE_NAME, token, {
      ...this.baseOptions(),
      maxAge: SESSION_LIFETIME_SECONDS * 1_000,
    });
  }

  /**
   * Clears the session using the exact path and security attributes used at issuance.
   *
   * @param response Express response used through Nest passthrough mode.
   */
  clear(response: Response): void {
    response.clearCookie(SESSION_COOKIE_NAME, this.baseOptions());
  }

  /** @returns Shared cookie attributes for issuance and deletion. */
  private baseOptions(): CookieOptions {
    return {
      httpOnly: true,
      path: '/api',
      sameSite: 'lax',
      secure: this.config.getOrThrow<string>('NODE_ENV') === 'production',
    };
  }
}
