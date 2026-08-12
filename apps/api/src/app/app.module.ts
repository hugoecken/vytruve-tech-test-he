import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  type ApiEnvironment,
  validateEnvironment,
} from '../config/environment';
import { AccountsModule } from './accounts/accounts.module';

/** Composes validated configuration and persistence-backed account identities. */
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
    AccountsModule,
  ],
})
export class AppModule {}
