import { HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import type { Repository } from 'typeorm';
import type { PatientModel } from '@api/app/patients/application/models/patient.model';
import type { PatientsService } from '@api/app/patients/application/services/patients.service';
import type { ApiEnvironment } from '@api/config/environment';
import { ProblemCode } from '@api/http/problem-code';
import { expectProblemDetails } from '@api/test-support/problem-details';
import { ASCII_TRIANGLE_PLY } from '@api/test-support/ply-fixtures';
import { ScanEntity } from '../../infrastructure/persistence/scan.entity';
import { ScanPersistenceMapper } from '../../infrastructure/persistence/mappers/scan-persistence.mapper';
import {
  ScanStorageError,
  type ScanStoragePort,
} from '../ports/scan-storage.port';
import { PlyContentValidator } from '../validation/ply-content.validator';
import { ScansService } from './scans.service';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const PATIENT_ID = '00000000-0000-4000-8000-000000000002';
const SCAN_ID = '00000000-0000-4000-8000-000000000003';
const CREATED_AT = new Date('2026-08-12T10:00:00.000Z');
const PATIENT: PatientModel = {
  age: 42,
  createdAt: CREATED_AT,
  firstName: 'Alex',
  id: PATIENT_ID,
  lastName: 'Morgan',
};

/** Repository methods exercised by scan application behavior. */
interface ScansRepositoryDouble {
  findOne: jest.Mock;
  save: jest.Mock;
}

/** Patient authorization operation required before scan access. */
interface PatientsDouble {
  get: jest.MockedFunction<PatientsService['get']>;
}

/** Private object-storage operations exercised by scan behavior. */
interface StorageDouble {
  checkReadiness: jest.MockedFunction<ScanStoragePort['checkReadiness']>;
  open: jest.MockedFunction<ScanStoragePort['open']>;
  remove: jest.MockedFunction<ScanStoragePort['remove']>;
  write: jest.MockedFunction<ScanStoragePort['write']>;
}

describe(ScansService.name, () => {
  let patients: PatientsDouble;
  let repository: ScansRepositoryDouble;
  let storage: StorageDouble;
  let service: ScansService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    patients = {
      get: jest.fn().mockResolvedValue(PATIENT),
    };
    repository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity: ScanEntity) =>
        Object.assign(entity, { createdAt: CREATED_AT, id: SCAN_ID }),
      ),
    };
    storage = {
      checkReadiness: jest.fn().mockResolvedValue(undefined),
      open: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      write: jest.fn().mockResolvedValue(undefined),
    };
    const config = new ConfigService<ApiEnvironment, true>({
      MAX_SCAN_SIZE_BYTES: 1024,
    });
    service = new ScansService(
      repository as unknown as Repository<ScanEntity>,
      patients as unknown as PatientsService,
      new PlyContentValidator(),
      storage,
      new ScanPersistenceMapper(),
      config,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not validate or store content before patient authorization succeeds', async () => {
    patients.get.mockRejectedValue(new Error('not authorized'));

    await expect(
      service.create({
        accountId: ACCOUNT_ID,
        content: ASCII_TRIANGLE_PLY,
        patientId: PATIENT_ID,
      }),
    ).rejects.toThrow('not authorized');

    expect(storage.write).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('removes the exact stored object when metadata persistence fails', async () => {
    repository.save.mockRejectedValue(new Error('database unavailable'));

    await expect(
      service.create({
        accountId: ACCOUNT_ID,
        content: ASCII_TRIANGLE_PLY,
        patientId: PATIENT_ID,
      }),
    ).rejects.toThrow('database unavailable');

    const storageKey = storage.write.mock.calls[0]?.[0];
    expect(storageKey).toEqual(expect.any(String));
    expect(storage.remove).toHaveBeenCalledWith(storageKey);
  });

  it('returns a stable storage problem when metadata compensation fails', async () => {
    repository.save.mockRejectedValue(new Error('database unavailable'));
    storage.remove.mockRejectedValue(new ScanStorageError('unavailable'));

    await expectProblemDetails(
      service.create({
        accountId: ACCOUNT_ID,
        content: ASCII_TRIANGLE_PLY,
        patientId: PATIENT_ID,
      }),
      ProblemCode.SCAN_STORAGE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('translates private storage write failures without exposing provider details', async () => {
    storage.write.mockRejectedValue(new ScanStorageError('unavailable'));

    await expectProblemDetails(
      service.create({
        accountId: ACCOUNT_ID,
        content: ASCII_TRIANGLE_PLY,
        patientId: PATIENT_ID,
      }),
      ProblemCode.SCAN_STORAGE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });

  it('rejects an internal read when stored bytes exceed persisted metadata', async () => {
    const scan = new ScanEntity();
    scan.id = SCAN_ID;
    scan.sizeBytes = 4;
    scan.storageKey = '00000000-0000-4000-8000-000000000004';
    repository.findOne.mockResolvedValue(scan);
    storage.open.mockResolvedValue({
      sizeBytes: 4,
      stream: Readable.from([Buffer.from('five!')]),
    });

    await expectProblemDetails(
      service.readContent(ACCOUNT_ID, PATIENT_ID, SCAN_ID),
      ProblemCode.SCAN_STORAGE_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  });
});
