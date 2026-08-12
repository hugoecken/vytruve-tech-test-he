import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AccountsModule } from '../accounts/accounts.module';
import { AuthController } from './api/controllers/auth.controller';
import { AuthenticationGuard } from './api/guards/authentication.guard';
import { AuthApiMapper } from './api/mappers/auth-api.mapper';
import { AuthService } from './application/services/auth.service';
import { PasswordHasherService } from './infrastructure/crypto/password-hasher.service';
import { JwtSessionService } from './infrastructure/security/jwt-session.service';
import { SessionCookieService } from './infrastructure/security/session-cookie.service';

/** Encapsulates registration, credentials, JWT verification, and cookie lifecycle. */
@Module({
  controllers: [AuthController],
  imports: [AccountsModule, JwtModule.register({})],
  providers: [
    AuthApiMapper,
    AuthService,
    JwtSessionService,
    PasswordHasherService,
    SessionCookieService,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
})
export class AuthModule {}
