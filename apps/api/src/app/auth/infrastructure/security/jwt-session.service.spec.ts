import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { ApiEnvironment } from '@api/config/environment';
import { JwtSessionService } from './jwt-session.service';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const ISSUED_AT = new Date('2026-08-12T10:00:00.000Z');
const EXPIRES_AT = new Date('2026-08-12T10:30:00.000Z');

describe(JwtSessionService.name, () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(ISSUED_AT.getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('issues and verifies the accepted 30-minute session', async () => {
    const service = new JwtSessionService(
      new ConfigService<ApiEnvironment, true>({
        JWT_AUDIENCE: 'vytruve-web',
        JWT_ISSUER: 'vytruve-api',
        JWT_SECRET: 'synthetic-jwt-secret-at-least-32-characters',
      }),
      new JwtService(),
    );

    const issued = await service.issue(ACCOUNT_ID);

    expect(issued.expiresAt).toEqual(EXPIRES_AT);
    await expect(service.verify(issued.token)).resolves.toEqual({
      accountId: ACCOUNT_ID,
      expiresAt: EXPIRES_AT,
    });
  });
});
