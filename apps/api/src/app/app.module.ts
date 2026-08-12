import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  type ApiEnvironment,
  validateEnvironment,
} from '@api/config/environment';
import { AccountsModule } from '@api/app/accounts/accounts.module';
import { AuthModule } from '@api/app/auth/auth.module';
import { PatientsModule } from '@api/app/patients/patients.module';
import { PrintingModule } from '@api/app/printing/printing.module';
import { ScansModule } from '@api/app/scans/scans.module';

/** Composes configuration, persistence, and the current backend product features. */
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnvironment, true>) => ({
        autoLoadEntities: true,
        database: config.getOrThrow<string>('POSTGRES_DB'),
        host: config.getOrThrow<string>('DATABASE_HOST'),
        migrationsRun: false,
        password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
        port: config.getOrThrow<number>('DATABASE_PORT'),
        synchronize: false,
        type: 'postgres' as const,
        username: config.getOrThrow<string>('POSTGRES_USER'),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        limit: 5,
        ttl: 60_000,
      },
    ]),
    AccountsModule,
    AuthModule,
    PatientsModule,
    ScansModule,
    PrintingModule,
  ],
})
export class AppModule {}
