import { Injectable } from '@nestjs/common';
import type {
  AccountModel,
  CreateAccountModel,
} from '../../../application/models/account.model';
import { AccountEntity } from '../account.entity';

/** Maps account persistence records without leaking TypeORM entities. */
@Injectable()
export class AccountPersistenceMapper {
  /** Maps a persisted account to the internal application representation. */
  toModel(entity: AccountEntity): AccountModel {
    return {
      createdAt: entity.createdAt,
      email: entity.email,
      id: entity.id,
      passwordHash: entity.passwordHash,
    };
  }

  /** Maps a normalized registration input to a new persistence entity. */
  toEntity(model: CreateAccountModel): AccountEntity {
    const entity = new AccountEntity();
    entity.email = model.email;
    entity.passwordHash = model.passwordHash;
    return entity;
  }
}
