import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ApiEnvironment } from '@api/config/environment';
import type { AuthenticatedSessionModel } from '../../application/models/auth-session.model';
import { SESSION_LIFETIME_SECONDS } from './session.constants';

/** Exact private JWT shape accepted by the session guard. */
interface SessionClaims {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
}

/** Result of issuing a private session token. */
interface IssuedToken {
  expiresAt: Date;
  token: string;
}

/** Issues and verifies the minimal HS256 JWT session contract. */
@Injectable()
export class JwtSessionService {
  /**
   * Creates the JWT adapter with validated signing configuration.
   *
   * @param config Validated application configuration.
   * @param jwt Nest JWT primitive used for standard JOSE processing.
   */
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Issues a 30-minute JWT containing no personal data.
   *
   * @param accountId Persisted account identifier used as the token subject.
   * @returns The private token and its public expiration time.
   */
  async issue(accountId: string): Promise<IssuedToken> {
    const issuedAt = Math.floor(Date.now() / 1_000);
    const expiresAt = issuedAt + SESSION_LIFETIME_SECONDS;
    const claims: SessionClaims = {
      aud: this.config.getOrThrow<string>('JWT_AUDIENCE'),
      exp: expiresAt,
      iat: issuedAt,
      iss: this.config.getOrThrow<string>('JWT_ISSUER'),
      sub: accountId,
    };
    const token = await this.jwt.signAsync(claims, {
      algorithm: 'HS256',
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
    });
    return { expiresAt: new Date(expiresAt * 1_000), token };
  }

  /**
   * Verifies algorithm, signature, issuer, audience, lifetime, and exact claim shape.
   *
   * @param token Untrusted JWT read from the HTTP-only cookie.
   * @returns Authenticated account subject and expiration.
   * @throws When any cryptographic or structural validation fails.
   */
  async verify(token: string): Promise<AuthenticatedSessionModel> {
    const claims = await this.jwt.verifyAsync<Record<string, unknown>>(token, {
      algorithms: ['HS256'],
      audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
      issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
    });
    if (!isSessionClaims(claims)) {
      throw new Error('Session claims are invalid');
    }
    return {
      accountId: claims.sub,
      expiresAt: new Date(claims.exp * 1_000),
    };
  }
}

/**
 * Rejects extra or malformed JWT claims after cryptographic verification.
 *
 * @param value Verified but structurally untrusted JWT payload.
 * @returns Whether the payload matches the exact five-claim contract.
 */
function isSessionClaims(value: unknown): value is SessionClaims {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const expectedKeys = ['aud', 'exp', 'iat', 'iss', 'sub'];
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    typeof record.aud === 'string' &&
    Number.isInteger(record.exp) &&
    Number.isInteger(record.iat) &&
    typeof record.iss === 'string' &&
    typeof record.sub === 'string'
  );
}
