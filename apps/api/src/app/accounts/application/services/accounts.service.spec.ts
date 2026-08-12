import { HttpStatus } from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import { ProblemCode } from '@api/http/problem-code';
import { expectProblemDetails } from '@api/test-support/problem-details';
import type { AccountEntity } from '../../infrastructure/persistence/account.entity';
import { AccountPersistenceMapper } from '../../infrastructure/persistence/mappers/account-persistence.mapper';
import { AccountsService } from './accounts.service';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const CREATED_AT = new Date('2026-08-12T10:00:00.000Z');

/** Repository methods exercised by account application behavior. */
interface AccountsRepositoryDouble {
  findOneBy: jest.Mock;
  save: jest.Mock;
}

describe(AccountsService.name, () => {
  let repository: AccountsRepositoryDouble;
  let service: AccountsService;

  beforeEach(() => {
    repository = {
      findOneBy: jest.fn(),
      save: jest.fn(async (entity: AccountEntity) =>
        Object.assign(entity, { createdAt: CREATED_AT, id: ACCOUNT_ID }),
      ),
    };
    service = new AccountsService(
      repository as unknown as Repository<AccountEntity>,
      new AccountPersistenceMapper(),
    );
  });

  it('normalizes an account email before persistence', async () => {
    const result = await service.create({
      email: '  Clinician@Example.Test  ',
      passwordHash: 'private-hash',
    });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'clinician@example.test' }),
    );
    expect(result.email).toBe('clinician@example.test');
  });

  it('normalizes an account email before credential lookup', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await service.findByEmail('  Clinician@Example.Test  ');

    expect(repository.findOneBy).toHaveBeenCalledWith({
      email: 'clinician@example.test',
    });
  });

  it('translates only the named email uniqueness constraint', async () => {
    repository.save.mockRejectedValue(
      new QueryFailedError(
        '',
        [],
        Object.assign(new Error('synthetic unique violation'), {
          code: '23505',
          constraint: 'uq_account_email',
        }),
      ),
    );

    await expectProblemDetails(
      service.create({ email: 'clinician@example.test', passwordHash: 'hash' }),
      ProblemCode.ACCOUNT_ALREADY_EXISTS,
      HttpStatus.CONFLICT,
    );
  });
});
