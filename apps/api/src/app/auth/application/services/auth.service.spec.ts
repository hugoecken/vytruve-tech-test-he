import { HttpStatus, Logger } from '@nestjs/common';
import { ProblemCode } from '@api/http/problem-code';
import { expectProblemDetails } from '@api/test-support/problem-details';
import type { AccountsService } from '@api/app/accounts/application/services/accounts.service';
import type { AccountModel } from '@api/app/accounts/application/models/account.model';
import type { PasswordHasherService } from '../../infrastructure/crypto/password-hasher.service';
import type { JwtSessionService } from '../../infrastructure/security/jwt-session.service';
import { AuthService } from './auth.service';

const ACCOUNT: AccountModel = {
  email: 'clinician@example.test',
  id: '00000000-0000-4000-8000-000000000001',
  passwordHash: 'private-hash',
};
const EXPIRES_AT = new Date('2026-08-12T10:30:00.000Z');

/** Account operations crossing the authentication service boundary. */
interface AccountsDouble {
  create: jest.MockedFunction<AccountsService['create']>;
  findByEmail: jest.MockedFunction<AccountsService['findByEmail']>;
  findById: jest.MockedFunction<AccountsService['findById']>;
}

/** Password operations crossing the authentication service boundary. */
interface PasswordsDouble {
  hash: jest.MockedFunction<PasswordHasherService['hash']>;
  verify: jest.MockedFunction<PasswordHasherService['verify']>;
}

/** Session operations crossing the authentication service boundary. */
interface SessionsDouble {
  issue: jest.MockedFunction<JwtSessionService['issue']>;
}

describe(AuthService.name, () => {
  let accounts: AccountsDouble;
  let passwords: PasswordsDouble;
  let service: AuthService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    accounts = {
      create: jest.fn().mockResolvedValue(ACCOUNT),
      findByEmail: jest.fn().mockResolvedValue(ACCOUNT),
      findById: jest.fn().mockResolvedValue(ACCOUNT),
    };
    passwords = {
      hash: jest.fn().mockResolvedValue('private-hash'),
      verify: jest.fn().mockResolvedValue(true),
    };
    const sessions: SessionsDouble = {
      issue: jest.fn().mockResolvedValue({
        expiresAt: EXPIRES_AT,
        token: 'private-token',
      }),
    };
    service = new AuthService(
      accounts as unknown as AccountsService,
      passwords as unknown as PasswordHasherService,
      sessions as unknown as JwtSessionService,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hashes the password before creating an account and issuing its session', async () => {
    const result = await service.register({
      email: ACCOUNT.email,
      password: 'correct horse battery staple',
    });

    expect(passwords.hash).toHaveBeenCalledWith('correct horse battery staple');
    expect(accounts.create).toHaveBeenCalledWith({
      email: ACCOUNT.email,
      passwordHash: 'private-hash',
    });
    expect(result).toEqual({
      session: {
        accountId: ACCOUNT.id,
        email: ACCOUNT.email,
        expiresAt: EXPIRES_AT,
      },
      token: 'private-token',
    });
  });

  it.each([
    ['an unknown account', null, true],
    ['an invalid password', ACCOUNT, false],
  ] as const)(
    'returns the same safe problem for %s',
    async (_label, account, matches) => {
      accounts.findByEmail.mockResolvedValue(account);
      passwords.verify.mockResolvedValue(matches);

      await expectProblemDetails(
        service.login({ email: ACCOUNT.email, password: 'invalid password' }),
        ProblemCode.AUTHENTICATION_FAILED,
        HttpStatus.UNAUTHORIZED,
      );
    },
  );
});
