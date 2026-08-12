import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ProblemCode } from '../../../../http/problem-code';
import { ProblemDetailsException } from '../../../../http/problem-details.exception';
import type { AccountModel, CreateAccountModel } from '../models/account.model';
import { AccountEntity } from '../../infrastructure/persistence/account.entity';
import { AccountPersistenceMapper } from '../../infrastructure/persistence/mappers/account-persistence.mapper';

const ACCOUNT_EMAIL_CONSTRAINT = 'uq_account_email';

/** Owns normalized account identity persistence for the authentication feature. */
@Injectable()
export class AccountsService {
  /**
   * Creates the account provider with its feature-owned TypeORM repository.
   *
   * @param accounts Account entity repository injected by Nest TypeORM.
   * @param mapper Persistence boundary mapper.
   */
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accounts: Repository<AccountEntity>,
    private readonly mapper: AccountPersistenceMapper,
  ) {}

  /**
   * Persists one normalized unique account identity.
   *
   * @param model Registration input containing a plaintext-free password hash.
   * @returns The persisted internal account model.
   * @throws ACCOUNT_ALREADY_EXISTS when normalized email uniqueness is violated.
   */
  async create(model: CreateAccountModel): Promise<AccountModel> {
    const entity = this.mapper.toEntity({
      ...model,
      email: normalizeEmail(model.email),
    });
    try {
      return this.mapper.toModel(await this.accounts.save(entity));
    } catch (error: unknown) {
      if (isUniqueViolation(error, ACCOUNT_EMAIL_CONSTRAINT)) {
        throw new ProblemDetailsException({
          code: ProblemCode.ACCOUNT_ALREADY_EXISTS,
          detail: 'An account already exists for this email address.',
          status: HttpStatus.CONFLICT,
          title: 'Account already exists',
        });
      }
      throw error;
    }
  }

  /**
   * Finds an account by case-insensitive identity.
   *
   * @param email Untrusted email supplied during authentication.
   * @returns The internal account model or null when no identity matches.
   */
  async findByEmail(email: string): Promise<AccountModel | null> {
    const entity = await this.accounts.findOneBy({
      email: normalizeEmail(email),
    });
    return entity === null ? null : this.mapper.toModel(entity);
  }

  /**
   * Finds the account represented by an already verified session subject.
   *
   * @param accountId Verified account identifier from JWT claims.
   * @returns The account model or null if the identity was removed.
   */
  async findById(accountId: string): Promise<AccountModel | null> {
    const entity = await this.accounts.findOneBy({ id: accountId });
    return entity === null ? null : this.mapper.toModel(entity);
  }
}

/** Normalizes email identity exactly once before every persistence lookup. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Recognizes one named PostgreSQL unique constraint without matching messages.
 *
 * @param error Unknown persistence failure.
 * @param constraint Expected database constraint name.
 * @returns Whether PostgreSQL reported the expected uniqueness violation.
 */
function isUniqueViolation(error: unknown, constraint: string): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driverError = error.driverError as {
    code?: unknown;
    constraint?: unknown;
  };
  return driverError.code === '23505' && driverError.constraint === constraint;
}
