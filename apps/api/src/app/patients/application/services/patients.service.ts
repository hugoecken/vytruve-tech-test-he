import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProblemCode } from '../../../../http/problem-code';
import { ProblemDetailsException } from '../../../../http/problem-details.exception';
import type {
  CreatePatientCommand,
  ListPatientsQuery,
  PatientModel,
  PatientPageModel,
} from '../models/patient.model';
import { PatientEntity } from '../../infrastructure/persistence/patient.entity';
import { PatientPersistenceMapper } from '../../infrastructure/persistence/mappers/patient-persistence.mapper';

/** Coordinates owner-scoped patient creation and deterministic collection reads. */
@Injectable()
export class PatientsService {
  /**
   * Creates the patient use-case provider with its feature-owned repository.
   *
   * @param patients Patient entity repository injected by Nest TypeORM.
   * @param mapper Patient persistence boundary mapper.
   */
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    private readonly mapper: PatientPersistenceMapper,
  ) {}

  /**
   * Creates one patient using ownership derived from the verified session.
   *
   * @param command Validated patient data and server-derived account ID.
   * @returns Persisted patient model.
   */
  async create(command: CreatePatientCommand): Promise<PatientModel> {
    const entity = this.mapper.toEntity(command);
    return this.mapper.toModel(await this.patients.save(entity));
  }

  /**
   * Reads one server page ordered by creation time and UUID descending.
   *
   * @param accountId Verified collection owner.
   * @param query Validated page index and size.
   * @returns Owner-scoped page and next-page availability without a total.
   */
  async list(
    accountId: string,
    query: ListPatientsQuery,
  ): Promise<PatientPageModel> {
    const entities = await this.patients.find({
      order: { createdAt: 'DESC', id: 'DESC' },
      select: {
        age: true,
        createdAt: true,
        firstName: true,
        id: true,
        lastName: true,
      },
      skip: query.page * query.pageSize,
      take: query.pageSize + 1,
      where: { accountId },
    });
    const hasNext = entities.length > query.pageSize;
    const pageEntities = entities.slice(0, query.pageSize);
    return {
      hasNext,
      items: pageEntities.map((entity) => this.mapper.toModel(entity)),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  /**
   * Retrieves one patient through a combined resource-and-owner predicate.
   *
   * @param accountId Verified owner from the session.
   * @param patientId Requested patient resource identifier.
   * @returns The owned patient model.
   * @throws PATIENT_NOT_FOUND for both missing and foreign resources.
   */
  async get(accountId: string, patientId: string): Promise<PatientModel> {
    const entity = await this.patients.findOneBy({
      accountId,
      id: patientId,
    });
    if (entity === null) {
      throw new ProblemDetailsException({
        code: ProblemCode.PATIENT_NOT_FOUND,
        detail: 'The requested patient record was not found.',
        status: HttpStatus.NOT_FOUND,
        title: 'Patient not found',
      });
    }
    return this.mapper.toModel(entity);
  }
}
