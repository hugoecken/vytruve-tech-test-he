import { HttpStatus, Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { PatientModel } from '@api/app/patients/application/models/patient.model';
import type { PatientsService } from '@api/app/patients/application/services/patients.service';
import type { ScansService } from '@api/app/scans/application/services/scans.service';
import { ProblemCode } from '@api/http/problem-code';
import { expectProblemDetails } from '@api/test-support/problem-details';
import { PrintRequestEntity } from '../../infrastructure/persistence/print-request.entity';
import { PrintRequestPersistenceMapper } from '../../infrastructure/persistence/mappers/print-request-persistence.mapper';
import { PrintRequestViewMapper } from '../mappers/print-request-view.mapper';
import {
  PrintRequestStatus,
  type PrintJobObservationModel,
} from '../models/print-request.model';
import {
  PrintingProviderError,
  type PrintingProviderPort,
} from '../ports/printing-provider.port';
import { PrintingService } from './printing.service';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const PATIENT_ID = '00000000-0000-4000-8000-000000000002';
const SCAN_ID = '00000000-0000-4000-8000-000000000003';
const REQUEST_ID = '00000000-0000-4000-8000-000000000004';
const PROVIDER_ID = '00000000-0000-4000-8000-000000000005';
const CREATED_AT = new Date('2026-08-12T10:00:00.000Z');
const START_AT = new Date('2026-08-12T10:10:00.000Z');
const END_AT = new Date('2026-08-12T10:20:00.000Z');
const PATIENT: PatientModel = {
  age: 42,
  createdAt: CREATED_AT,
  firstName: 'Alex',
  id: PATIENT_ID,
  lastName: 'Morgan',
  photo: null,
};

/** Repository mutations relevant to printing orchestration. */
interface RequestsRepositoryDouble {
  createQueryBuilder: jest.Mock;
  delete: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
}

/** Query-builder operations used by the paginated print-request read. */
interface RequestsQueryBuilderDouble {
  addOrderBy: jest.Mock;
  getMany: jest.Mock;
  innerJoin: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  where: jest.Mock;
}

/** Patient authorization operation required before printing. */
interface PatientsDouble {
  get: jest.MockedFunction<PatientsService['get']>;
}

/** Owner-scoped scan content operation required for submission. */
interface ScansDouble {
  readContent: jest.MockedFunction<ScansService['readContent']>;
}

/** External printing operations controlled by orchestration tests. */
interface ProviderDouble {
  findIdByReference: jest.MockedFunction<
    PrintingProviderPort['findIdByReference']
  >;
  getById: jest.MockedFunction<PrintingProviderPort['getById']>;
  submit: jest.MockedFunction<PrintingProviderPort['submit']>;
}

/** Creates one durable pending entity as returned by PostgreSQL. */
function pendingEntity(reference = 'ABCDEFGHJK23'): PrintRequestEntity {
  const entity = new PrintRequestEntity();
  Object.assign(entity, {
    activeSlot: true,
    createdAt: CREATED_AT,
    id: REQUEST_ID,
    lastObservedAt: null,
    providerId: null,
    reference,
    scanId: SCAN_ID,
    scheduledEndAt: null,
    scheduledStartAt: null,
    status: PrintRequestStatus.CONFIRMATION_PENDING,
    updatedAt: CREATED_AT,
  });
  return entity;
}

/** Creates one validated provider observation for orchestration tests. */
function providerObservation(): PrintJobObservationModel {
  return {
    outcome: 'pending',
    providerId: PROVIDER_ID,
    scheduledEndAt: END_AT,
    scheduledStartAt: START_AT,
  };
}

describe(PrintingService.name, () => {
  let events: string[];
  let patients: PatientsDouble;
  let provider: ProviderDouble;
  let queryBuilder: RequestsQueryBuilderDouble;
  let repository: RequestsRepositoryDouble;
  let scans: ScansDouble;
  let service: PrintingService;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    events = [];
    patients = {
      get: jest.fn().mockResolvedValue(PATIENT),
    };
    provider = {
      findIdByReference: jest.fn().mockResolvedValue(null),
      getById: jest.fn().mockResolvedValue(providerObservation()),
      submit: jest.fn().mockImplementation(async () => {
        events.push('submit');
        return providerObservation();
      }),
    };
    queryBuilder = {
      addOrderBy: jest.fn(),
      getMany: jest.fn().mockResolvedValue([]),
      innerJoin: jest.fn(),
      orderBy: jest.fn(),
      skip: jest.fn(),
      take: jest.fn(),
      where: jest.fn(),
    };
    queryBuilder.addOrderBy.mockReturnValue(queryBuilder);
    queryBuilder.innerJoin.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);
    queryBuilder.skip.mockReturnValue(queryBuilder);
    queryBuilder.take.mockReturnValue(queryBuilder);
    queryBuilder.where.mockReturnValue(queryBuilder);
    repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      delete: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
      save: jest.fn(async (entity: PrintRequestEntity) => {
        if (entity.id === undefined) {
          events.push('reserve');
          return pendingEntity(entity.reference);
        }
        events.push('confirm');
        return entity;
      }),
      update: jest.fn().mockResolvedValue({ affected: 1, raw: [] }),
    };
    scans = {
      readContent: jest.fn().mockResolvedValue({
        content: Buffer.from('synthetic-ply'),
        id: SCAN_ID,
      }),
    };
    service = new PrintingService(
      repository as unknown as Repository<PrintRequestEntity>,
      patients as unknown as PatientsService,
      scans as unknown as ScansService,
      provider,
      new PrintRequestPersistenceMapper(),
      new PrintRequestViewMapper(),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('persists the active reservation before submitting exactly once', async () => {
    await service.create({
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      scanId: SCAN_ID,
    });

    expect(events).toEqual(['reserve', 'submit', 'confirm']);
    expect(provider.submit).toHaveBeenCalledTimes(1);
  });

  it('removes a reservation after a definite capacity rejection', async () => {
    provider.submit.mockRejectedValue(
      new PrintingProviderError('capacity_reached'),
    );

    await expectProblemDetails(
      service.create({
        accountId: ACCOUNT_ID,
        patientId: PATIENT_ID,
        scanId: SCAN_ID,
      }),
      ProblemCode.PRINTING_CAPACITY_REACHED,
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    expect(repository.delete).toHaveBeenCalledWith({ id: REQUEST_ID });
    expect(provider.submit).toHaveBeenCalledTimes(1);
  });

  it('keeps a durable pending reservation after an ambiguous submission', async () => {
    provider.submit.mockRejectedValue(
      new PrintingProviderError('ambiguous_submission'),
    );

    const result = await service.create({
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      scanId: SCAN_ID,
    });

    expect(result.status).toBe(PrintRequestStatus.CONFIRMATION_PENDING);
    expect(repository.delete).not.toHaveBeenCalled();
    expect(provider.submit).toHaveBeenCalledTimes(1);
  });

  it('keeps the pending state when provider confirmation cannot be persisted', async () => {
    repository.save
      .mockResolvedValueOnce(pendingEntity())
      .mockRejectedValueOnce(new Error('database unavailable'));

    const result = await service.create({
      accountId: ACCOUNT_ID,
      patientId: PATIENT_ID,
      scanId: SCAN_ID,
    });

    expect(result.status).toBe(PrintRequestStatus.CONFIRMATION_PENDING);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('fails safely when a definite rejection cannot release its reservation', async () => {
    provider.submit.mockRejectedValue(
      new PrintingProviderError('capacity_reached'),
    );
    repository.delete.mockResolvedValue({ affected: 0, raw: [] });

    await expectProblemDetails(
      service.create({
        accountId: ACCOUNT_ID,
        patientId: PATIENT_ID,
        scanId: SCAN_ID,
      }),
      ProblemCode.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  });

  it('keeps an unresolved reference pending without treating it as provider failure', async () => {
    queryBuilder.getMany.mockResolvedValue([pendingEntity()]);

    const result = await service.refresh(ACCOUNT_ID, PATIENT_ID, {
      page: 0,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe(
      PrintRequestStatus.CONFIRMATION_PENDING,
    );
    expect(provider.findIdByReference).toHaveBeenCalledWith('ABCDEFGHJK23');
    expect(provider.getById).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('lists persisted requests without contacting the provider', async () => {
    queryBuilder.getMany.mockResolvedValue([pendingEntity()]);

    const result = await service.list(ACCOUNT_ID, PATIENT_ID, {
      page: 0,
      pageSize: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe(
      PrintRequestStatus.CONFIRMATION_PENDING,
    );
    expect(provider.findIdByReference).not.toHaveBeenCalled();
    expect(provider.getById).not.toHaveBeenCalled();
  });

  it('reports provider degradation instead of returning a false refresh success', async () => {
    queryBuilder.getMany.mockResolvedValue([pendingEntity()]);
    provider.findIdByReference.mockRejectedValue(
      new PrintingProviderError('unavailable'),
    );

    await expectProblemDetails(
      service.refresh(ACCOUNT_ID, PATIENT_ID, { page: 0, pageSize: 10 }),
      ProblemCode.PRINTING_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('persists a resolved provider identifier before reading its job details', async () => {
    queryBuilder.getMany.mockResolvedValue([pendingEntity()]);
    provider.findIdByReference.mockResolvedValue(PROVIDER_ID);
    provider.getById.mockRejectedValue(
      new PrintingProviderError('unavailable'),
    );

    await expectProblemDetails(
      service.refresh(ACCOUNT_ID, PATIENT_ID, { page: 0, pageSize: 10 }),
      ProblemCode.PRINTING_UNAVAILABLE,
      HttpStatus.SERVICE_UNAVAILABLE,
    );

    expect(repository.update).toHaveBeenCalledWith(
      { id: REQUEST_ID },
      { providerId: PROVIDER_ID },
    );
    expect(repository.update.mock.invocationCallOrder[0]).toBeLessThan(
      provider.getById.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it('reports an internal failure when a provider identity cannot be persisted', async () => {
    queryBuilder.getMany.mockResolvedValue([pendingEntity()]);
    provider.findIdByReference.mockResolvedValue(PROVIDER_ID);
    repository.update.mockResolvedValue({ affected: 0, raw: [] });

    await expectProblemDetails(
      service.refresh(ACCOUNT_ID, PATIENT_ID, { page: 0, pageSize: 10 }),
      ProblemCode.INTERNAL_ERROR,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );

    expect(provider.getById).not.toHaveBeenCalled();
  });
});
