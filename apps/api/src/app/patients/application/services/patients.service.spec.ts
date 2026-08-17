import { HttpStatus, Logger } from '@nestjs/common';
import { Readable } from 'node:stream';
import type { DataSource, Repository } from 'typeorm';
import { ProblemCode } from '@api/http/problem-code';
import {
  PrivateObjectStorageError,
  type PrivateObjectStoragePort,
} from '@api/storage/private-object-storage.port';
import { expectProblemDetails } from '@api/test-support/problem-details';
import { PatientEntity } from '../../infrastructure/persistence/patient.entity';
import { PatientPersistenceMapper } from '../../infrastructure/persistence/mappers/patient-persistence.mapper';
import type {
  CreatePatientCommand,
  UpdatePatientCommand,
} from '../models/patient.model';
import { PatientsService } from './patients.service';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const PATIENT_ID = '00000000-0000-4000-8000-000000000002';
const CREATED_AT = new Date('2026-08-17T08:00:00.000Z');
const PHOTO_CONTENT = Buffer.from('synthetic-photo');

interface PatientsRepositoryDouble {
  find: jest.Mock;
  findOneBy: jest.Mock;
  save: jest.Mock;
}

interface StorageDouble {
  checkReadiness: jest.MockedFunction<
    PrivateObjectStoragePort['checkReadiness']
  >;
  open: jest.MockedFunction<PrivateObjectStoragePort['open']>;
  remove: jest.MockedFunction<PrivateObjectStoragePort['remove']>;
  write: jest.MockedFunction<PrivateObjectStoragePort['write']>;
}

interface PatientQueryBuilderDouble {
  getOne: jest.Mock;
  setLock: jest.Mock;
  where: jest.Mock;
}

interface TransactionRepositoryDouble {
  createQueryBuilder: jest.Mock;
  save: jest.Mock;
}

const BASE_COMMAND: CreatePatientCommand = {
  accountId: ACCOUNT_ID,
  age: 42,
  firstName: 'Alex',
  lastName: 'Morgan',
};
const BASE_UPDATE: UpdatePatientCommand = {
  ...BASE_COMMAND,
  patientId: PATIENT_ID,
  photoAction: 'keep',
};

describe(PatientsService.name, () => {
  let repository: PatientsRepositoryDouble;
  let service: PatientsService;
  let storage: StorageDouble;
  let transactionRepository: TransactionRepositoryDouble;
  let queryBuilder: PatientQueryBuilderDouble;
  let dataSource: { transaction: jest.Mock };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    repository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(async (entity: PatientEntity) =>
        Object.assign(entity, { createdAt: CREATED_AT, id: PATIENT_ID }),
      ),
    };
    storage = {
      checkReadiness: jest.fn().mockResolvedValue(undefined),
      open: jest.fn().mockResolvedValue({
        sizeBytes: PHOTO_CONTENT.length,
        stream: Readable.from([PHOTO_CONTENT]),
      }),
      remove: jest.fn().mockResolvedValue(undefined),
      write: jest.fn().mockResolvedValue(undefined),
    };
    queryBuilder = {
      getOne: jest.fn().mockResolvedValue(patientEntity()),
      setLock: jest.fn(),
      where: jest.fn(),
    };
    queryBuilder.setLock.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    transactionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      save: jest.fn(async (entity: PatientEntity) => entity),
    };
    dataSource = {
      transaction: jest.fn(async (work) =>
        work({ getRepository: () => transactionRepository }),
      ),
    };
    service = new PatientsService(
      repository as unknown as Repository<PatientEntity>,
      new PatientPersistenceMapper(),
      storage,
      dataSource as unknown as DataSource,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates the existing patient result without touching object storage', async () => {
    const patient = await service.create(BASE_COMMAND);

    expect(patient).toMatchObject({ id: PATIENT_ID, photo: null });
    expect(storage.write).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('stores one validated photo before confirming its patient metadata', async () => {
    const patient = await service.create({
      ...BASE_COMMAND,
      photo: {
        content: PHOTO_CONTENT,
        format: 'png',
        mediaType: 'image/png',
        sizeBytes: PHOTO_CONTENT.length,
      },
    });

    const storageKey = storage.write.mock.calls[0]?.[0];
    expect(storage.write).toHaveBeenCalledWith(
      storageKey,
      PHOTO_CONTENT,
      'image/png',
    );
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        photoFormat: 'png',
        photoSizeBytes: PHOTO_CONTENT.length,
        photoStorageKey: storageKey,
      }),
    );
    expect(patient.photo).toEqual({
      format: 'png',
      sizeBytes: PHOTO_CONTENT.length,
      storageKey,
    });
  });

  it('does not persist a patient when private storage rejects the photo', async () => {
    storage.write.mockRejectedValue(
      new PrivateObjectStorageError('unavailable'),
    );

    await expectProblemDetails(
      service.create({
        ...BASE_COMMAND,
        photo: {
          content: PHOTO_CONTENT,
          format: 'png',
          mediaType: 'image/png',
          sizeBytes: PHOTO_CONTENT.length,
        },
      }),
      ProblemCode.PATIENT_PHOTO_STORAGE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('removes the exact new object when patient persistence fails', async () => {
    repository.save.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.create({
        ...BASE_COMMAND,
        photo: {
          content: PHOTO_CONTENT,
          format: 'png',
          mediaType: 'image/png',
          sizeBytes: PHOTO_CONTENT.length,
        },
      }),
    ).rejects.toThrow('database unavailable');

    expect(storage.remove).toHaveBeenCalledWith(
      storage.write.mock.calls[0]?.[0],
    );
  });

  it('returns a safe storage problem when persistence compensation fails', async () => {
    repository.save.mockRejectedValue(new Error('database unavailable'));
    storage.remove.mockRejectedValue(
      new PrivateObjectStorageError('unavailable'),
    );

    await expectProblemDetails(
      service.create({
        ...BASE_COMMAND,
        photo: {
          content: PHOTO_CONTENT,
          format: 'png',
          mediaType: 'image/png',
          sizeBytes: PHOTO_CONTENT.length,
        },
      }),
      ProblemCode.PATIENT_PHOTO_STORAGE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('updates owned identity fields under one pessimistic row lock while keeping the photo', async () => {
    const current = patientEntity({ storageKey: 'current-photo' });
    queryBuilder.getOne.mockResolvedValue(current);

    const result = await service.update({
      ...BASE_UPDATE,
      age: 43,
      firstName: 'Jamie',
    });

    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'patient.id = :patientId AND patient.accountId = :accountId',
      { accountId: ACCOUNT_ID, patientId: PATIENT_ID },
    );
    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ age: 43, firstName: 'Jamie' }),
    );
    expect(result.photo?.storageKey).toBe('current-photo');
    expect(storage.write).not.toHaveBeenCalled();
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('writes a replacement before the transaction and removes the former object after commit', async () => {
    const events: string[] = [];
    queryBuilder.getOne.mockResolvedValue(
      patientEntity({ storageKey: 'former-photo' }),
    );
    storage.write.mockImplementation(async () => {
      events.push('write');
    });
    dataSource.transaction.mockImplementation(async (work) => {
      events.push('transaction');
      return work({ getRepository: () => transactionRepository });
    });
    transactionRepository.save.mockImplementation(async (entity) => {
      events.push('save');
      return entity;
    });
    storage.remove.mockImplementation(async () => {
      events.push('remove');
    });

    const result = await service.update({
      ...BASE_UPDATE,
      photo: validPhoto(),
      photoAction: 'replace',
    });

    expect(events).toEqual(['write', 'transaction', 'save', 'remove']);
    expect(storage.remove).toHaveBeenCalledWith('former-photo');
    expect(result.photo?.storageKey).toBe(storage.write.mock.calls[0]?.[0]);
  });

  it('commits photo removal before cleaning the former object', async () => {
    queryBuilder.getOne.mockResolvedValue(
      patientEntity({ storageKey: 'former-photo' }),
    );

    const result = await service.update({
      ...BASE_UPDATE,
      photoAction: 'remove',
    });

    expect(transactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        photoFormat: null,
        photoSizeBytes: null,
        photoStorageKey: null,
      }),
    );
    expect(storage.remove).toHaveBeenCalledWith('former-photo');
    expect(result.photo).toBeNull();
  });

  it('compensates the exact new object when the update transaction fails', async () => {
    dataSource.transaction.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.update({
        ...BASE_UPDATE,
        photo: validPhoto(),
        photoAction: 'replace',
      }),
    ).rejects.toThrow('database unavailable');

    expect(storage.remove).toHaveBeenCalledWith(
      storage.write.mock.calls[0]?.[0],
    );
  });

  it('conceals missing and foreign patients with the same safe problem', async () => {
    queryBuilder.getOne.mockResolvedValue(null);

    await expectProblemDetails(
      service.update(BASE_UPDATE),
      ProblemCode.PATIENT_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
  });

  it('keeps the committed result when former-object cleanup fails', async () => {
    queryBuilder.getOne.mockResolvedValue(
      patientEntity({ storageKey: 'former-photo' }),
    );
    storage.remove.mockRejectedValue(
      new PrivateObjectStorageError('unavailable'),
    );

    const result = await service.update({
      ...BASE_UPDATE,
      photoAction: 'remove',
    });

    expect(result.photo).toBeNull();
    expect(Logger.prototype.error).toHaveBeenCalledWith({
      event: 'patient_photo_storage_operation',
      operation: 'cleanup_former_photo',
      outcome: 'failed',
    });
  });

  it('opens the current owned photo with exact persisted metadata', async () => {
    repository.findOneBy.mockResolvedValue(
      patientEntity({ storageKey: 'current-photo' }),
    );

    const content = await service.getPhoto(ACCOUNT_ID, PATIENT_ID);

    expect(repository.findOneBy).toHaveBeenCalledWith({
      accountId: ACCOUNT_ID,
      id: PATIENT_ID,
    });
    expect(storage.open).toHaveBeenCalledWith(
      'current-photo',
      PHOTO_CONTENT.length,
    );
    expect(content).toMatchObject({
      mediaType: 'image/png',
      sizeBytes: PHOTO_CONTENT.length,
    });
  });

  it.each([
    ['missing or foreign patient', null],
    ['patient without a photo', patientEntity()],
  ])('conceals a %s on current-photo reads', async (_case, entity) => {
    repository.findOneBy.mockResolvedValue(entity);

    await expectProblemDetails(
      service.getPhoto(ACCOUNT_ID, PATIENT_ID),
      ProblemCode.PATIENT_NOT_FOUND,
      HttpStatus.NOT_FOUND,
    );
    expect(storage.open).not.toHaveBeenCalled();
  });

  it.each(['not_found', 'unavailable'] as const)(
    'returns one safe storage problem when referenced content is %s',
    async (kind) => {
      repository.findOneBy.mockResolvedValue(
        patientEntity({ storageKey: 'current-photo' }),
      );
      storage.open.mockRejectedValue(new PrivateObjectStorageError(kind));

      await expectProblemDetails(
        service.getPhoto(ACCOUNT_ID, PATIENT_ID),
        ProblemCode.PATIENT_PHOTO_STORAGE_UNAVAILABLE,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    },
  );
});

/** Creates one complete persisted patient without protected fixture data. */
function patientEntity(photo?: { storageKey: string }): PatientEntity {
  return Object.assign(new PatientEntity(), {
    accountId: ACCOUNT_ID,
    age: BASE_COMMAND.age,
    createdAt: CREATED_AT,
    firstName: BASE_COMMAND.firstName,
    id: PATIENT_ID,
    lastName: BASE_COMMAND.lastName,
    photoFormat: photo === undefined ? null : 'png',
    photoSizeBytes: photo === undefined ? null : PHOTO_CONTENT.length,
    photoStorageKey: photo?.storageKey ?? null,
  });
}

/** Creates one already validated synthetic replacement photo. */
function validPhoto() {
  return {
    content: PHOTO_CONTENT,
    format: 'png' as const,
    mediaType: 'image/png',
    sizeBytes: PHOTO_CONTENT.length,
  };
}
