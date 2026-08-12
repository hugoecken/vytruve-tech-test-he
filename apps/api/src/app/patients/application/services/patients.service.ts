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
import { PatientCursorCodec } from '../../infrastructure/pagination/patient-cursor-codec';
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
   * @param cursors Owner-bound pagination cursor codec.
   */
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    private readonly mapper: PatientPersistenceMapper,
    private readonly cursors: PatientCursorCodec,
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
   * Reads one forward page ordered by creation time and UUID descending.
   *
   * @param accountId Verified collection owner.
   * @param query Validated page size and optional opaque cursor.
   * @returns Owner-scoped page and continuation metadata without a total.
   * @throws INVALID_CURSOR when the cursor cannot be safely applied.
   */
  async list(
    accountId: string,
    query: ListPatientsQuery,
  ): Promise<PatientPageModel> {
    const boundary =
      query.cursor === undefined
        ? undefined
        : this.cursors.decode(query.cursor);
    const builder = this.patients
      .createQueryBuilder('patient')
      .select([
        'patient.id',
        'patient.age',
        'patient.createdAt',
        'patient.firstName',
        'patient.lastName',
      ])
      .where('patient.account_id = :accountId', { accountId })
      .orderBy('patient.created_at', 'DESC')
      .addOrderBy('patient.id', 'DESC')
      .take(query.pageSize + 1);

    if (boundary !== undefined) {
      builder.andWhere(
        '(patient.created_at < :createdAt OR (patient.created_at = :createdAt AND patient.id < :id))',
        { createdAt: boundary.createdAt, id: boundary.id },
      );
    }

    const entities = await builder.getMany();
    const hasNext = entities.length > query.pageSize;
    const pageEntities = entities.slice(0, query.pageSize);
    const last = pageEntities.at(-1);
    return {
      hasNext,
      items: pageEntities.map((entity) => this.mapper.toModel(entity)),
      nextCursor:
        hasNext && last !== undefined
          ? this.cursors.encode({ createdAt: last.createdAt, id: last.id })
          : null,
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
