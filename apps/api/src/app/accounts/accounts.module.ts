import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsService } from './application/services/accounts.service';
import { AccountEntity } from './infrastructure/persistence/account.entity';
import { AccountPersistenceMapper } from './infrastructure/persistence/mappers/account-persistence.mapper';

/** Encapsulates persisted account identity without exposing management endpoints. */
@Module({
  exports: [AccountsService],
  imports: [TypeOrmModule.forFeature([AccountEntity])],
  providers: [AccountsService, AccountPersistenceMapper],
})
export class AccountsModule {}
