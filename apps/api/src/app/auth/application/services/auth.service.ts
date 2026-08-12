import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AccountsService } from '@api/app/accounts/application/services/accounts.service';
import { ProblemCode } from '@api/http/problem-code';
import { ProblemDetailsException } from '@api/http/problem-details.exception';
import type {
  AccountSessionModel,
  AuthenticatedSessionModel,
  CreateAccountCommand,
  CreateSessionCommand,
  IssuedAccountSessionModel,
} from '../models/auth-session.model';
import { PasswordHasherService } from '../../infrastructure/crypto/password-hasher.service';
import { JwtSessionService } from '../../infrastructure/security/jwt-session.service';

/** Coordinates account registration and the browser-managed session lifecycle. */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /**
   * Creates the authentication use-case provider.
   *
   * @param accounts Persisted identity capability owned by AccountsModule.
   * @param passwords Argon2id hashing boundary.
   * @param sessions JWT issuance boundary.
   */
  constructor(
    private readonly accounts: AccountsService,
    private readonly passwords: PasswordHasherService,
    private readonly sessions: JwtSessionService,
  ) {}

  /**
   * Registers an account and immediately issues its browser session.
   *
   * @param command Validated registration credentials.
   * @returns Private token plus the token-free public session model.
   * @throws ACCOUNT_ALREADY_EXISTS when normalized email uniqueness is violated.
   */
  async register(
    command: CreateAccountCommand,
  ): Promise<IssuedAccountSessionModel> {
    const passwordHash = await this.passwords.hash(command.password);
    const account = await this.accounts.create({
      email: command.email,
      passwordHash,
    });
    this.logger.log('Account registration succeeded');
    return this.issue(account.id, account.email);
  }

  /**
   * Authenticates generic credentials without exposing identity existence.
   *
   * @param command Validated but untrusted login credentials.
   * @returns Private token plus the token-free public session model.
   * @throws AUTHENTICATION_FAILED for either an unknown account or wrong password.
   */
  async login(
    command: CreateSessionCommand,
  ): Promise<IssuedAccountSessionModel> {
    const account = await this.accounts.findByEmail(command.email);
    if (
      account === null ||
      !(await this.passwords.verify(command.password, account.passwordHash))
    ) {
      this.logger.warn('Credential authentication failed');
      throw authenticationFailed();
    }
    this.logger.log('Credential authentication succeeded');
    return this.issue(account.id, account.email);
  }

  /**
   * Restores public identity using a previously verified token without rotating it.
   *
   * @param authenticatedSession Verified JWT subject and original expiration.
   * @returns Current public account session.
   * @throws AUTHENTICATION_REQUIRED if the persisted account no longer exists.
   */
  async restore(
    authenticatedSession: AuthenticatedSessionModel,
  ): Promise<AccountSessionModel> {
    const account = await this.accounts.findById(
      authenticatedSession.accountId,
    );
    if (account === null) {
      throw new ProblemDetailsException({
        code: ProblemCode.AUTHENTICATION_REQUIRED,
        detail: 'A valid authenticated session is required.',
        status: HttpStatus.UNAUTHORIZED,
        title: 'Authentication required',
      });
    }
    return {
      accountId: account.id,
      email: account.email,
      expiresAt: authenticatedSession.expiresAt,
    };
  }

  /**
   * Issues the private token and assembles its public session projection.
   *
   * @param accountId Persisted identity used as JWT subject.
   * @param email Normalized email returned to its authenticated owner.
   * @returns Private token plus public session model.
   */
  private async issue(
    accountId: string,
    email: string,
  ): Promise<IssuedAccountSessionModel> {
    const issued = await this.sessions.issue(accountId);
    return {
      session: { accountId, email, expiresAt: issued.expiresAt },
      token: issued.token,
    };
  }
}

/** @returns The generic problem shared by unknown identities and wrong passwords. */
function authenticationFailed(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.AUTHENTICATION_FAILED,
    detail: 'The email or password is incorrect.',
    status: HttpStatus.UNAUTHORIZED,
    title: 'Authentication failed',
  });
}
