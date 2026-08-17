import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { ProblemCode } from '@api/http/problem-code';
import { ProblemDetailsException } from '@api/http/problem-details.exception';
import {
  PRIVATE_OBJECT_STORAGE,
  PrivateObjectStorageError,
  type PrivateObjectStoragePort,
} from '@api/storage/private-object-storage.port';
import {
  createPage,
  createPageWindow,
  type PageParameters,
} from '@api/pagination/page';
import type {
  CreatePatientCommand,
  PatientModel,
  PatientPageModel,
  PatientPhotoContent,
  PatientPhotoModel,
  UpdatePatientCommand,
} from '../models/patient.model';
import { PatientEntity } from '../../infrastructure/persistence/patient.entity';
import { PatientPersistenceMapper } from '../../infrastructure/persistence/mappers/patient-persistence.mapper';

/** Coordinates owner-scoped patient creation and deterministic collection reads. */
@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  /**
   * Creates the patient use-case provider with its feature-owned repository.
   *
   * @param patients Patient entity repository injected by Nest TypeORM.
   * @param mapper Patient persistence boundary mapper.
   * @param storage Shared private object-storage boundary.
   * @param dataSource Transaction boundary for owner-scoped updates.
   */
  constructor(
    @InjectRepository(PatientEntity)
    private readonly patients: Repository<PatientEntity>,
    private readonly mapper: PatientPersistenceMapper,
    @Inject(PRIVATE_OBJECT_STORAGE)
    private readonly storage: PrivateObjectStoragePort,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Creates one patient using ownership derived from the verified session.
   *
   * @param command Validated patient data and server-derived account ID.
   * @returns Persisted patient model.
   */
  async create(command: CreatePatientCommand): Promise<PatientModel> {
    if (command.photo === undefined) {
      return this.mapper.toModel(
        await this.patients.save(this.mapper.toEntity(command)),
      );
    }

    const storageKey = randomUUID();
    try {
      await this.storage.write(
        storageKey,
        command.photo.content,
        command.photo.mediaType,
      );
    } catch (error) {
      this.rethrowStorageFailure(error, 'write');
    }

    try {
      const entity = this.mapper.toEntity(command, {
        format: command.photo.format,
        sizeBytes: command.photo.sizeBytes,
        storageKey,
      });
      return this.mapper.toModel(await this.patients.save(entity));
    } catch (persistenceError) {
      try {
        await this.storage.remove(storageKey);
      } catch {
        this.logger.error({
          event: 'patient_photo_storage_operation',
          operation: 'compensate_create_failure',
          outcome: 'failed',
        });
        throw patientPhotoStorageUnavailable();
      }
      throw persistenceError;
    }
  }

  /**
   * Confirms complete owned identity fields and one explicit photo decision.
   *
   * @param command Validated update, owner, patient ID, and photo decision.
   * @returns The committed current patient state.
   */
  async update(command: UpdatePatientCommand): Promise<PatientModel> {
    validatePhotoDecision(command);
    const newPhoto = await this.writeReplacement(command);
    let confirmed: { formerStorageKey: string | null; patient: PatientModel };

    try {
      confirmed = await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(PatientEntity);
        const entity = await repository
          .createQueryBuilder('patient')
          .setLock('pessimistic_write')
          .where('patient.id = :patientId AND patient.accountId = :accountId', {
            accountId: command.accountId,
            patientId: command.patientId,
          })
          .getOne();
        if (entity === null) {
          throw patientNotFound();
        }

        const currentPhoto = this.mapper.toModel(entity).photo;
        const nextPhoto = resolveUpdatedPhoto(
          command.photoAction,
          currentPhoto,
          newPhoto,
        );
        const saved = await repository.save(
          this.mapper.applyUpdate(entity, command, nextPhoto),
        );
        return {
          formerStorageKey:
            currentPhoto?.storageKey !== nextPhoto?.storageKey
              ? (currentPhoto?.storageKey ?? null)
              : null,
          patient: this.mapper.toModel(saved),
        };
      });
    } catch (error) {
      if (newPhoto !== null) {
        await this.compensateNewPhoto(newPhoto.storageKey);
      }
      throw error;
    }

    if (confirmed.formerStorageKey !== null) {
      await this.cleanupFormerPhoto(confirmed.formerStorageKey);
    }
    return confirmed.patient;
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
    query: PageParameters,
  ): Promise<PatientPageModel> {
    const window = createPageWindow(query);
    const entities = await this.patients.find({
      order: { createdAt: 'DESC', id: 'DESC' },
      select: {
        age: true,
        createdAt: true,
        firstName: true,
        id: true,
        lastName: true,
        photoFormat: true,
        photoSizeBytes: true,
        photoStorageKey: true,
      },
      ...window,
      where: { accountId },
    });
    const page = createPage(entities, query);
    return {
      ...page,
      items: page.items.map((entity) => this.mapper.toModel(entity)),
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
      throw patientNotFound();
    }
    return this.mapper.toModel(entity);
  }

  /**
   * Opens the current private photo only after one owner-scoped row lookup.
   *
   * @param accountId Verified owner from the session.
   * @param patientId Requested patient resource identifier.
   * @returns Validated media metadata and provider stream.
   */
  async getPhoto(
    accountId: string,
    patientId: string,
  ): Promise<PatientPhotoContent> {
    const entity = await this.patients.findOneBy({ accountId, id: patientId });
    if (entity === null) {
      throw patientNotFound();
    }
    const photo = this.mapper.toModel(entity).photo;
    if (photo === null) {
      throw patientNotFound();
    }
    try {
      const object = await this.storage.open(photo.storageKey, photo.sizeBytes);
      return {
        mediaType: photoMediaType(photo.format),
        sizeBytes: object.sizeBytes,
        stream: object.stream,
      };
    } catch (error) {
      this.rethrowStorageFailure(error, 'read');
    }
  }

  /** Translates only provider-neutral failures into the public photo problem. */
  private rethrowStorageFailure(
    error: unknown,
    operation: 'read' | 'write',
  ): never {
    if (error instanceof PrivateObjectStorageError) {
      this.logger.error({
        event: 'patient_photo_storage_operation',
        operation,
        outcome: error.kind,
      });
      throw patientPhotoStorageUnavailable();
    }
    throw error;
  }

  /** Writes one validated replacement before entering the SQL transaction. */
  private async writeReplacement(
    command: UpdatePatientCommand,
  ): Promise<PatientPhotoModel | null> {
    if (command.photoAction !== 'replace' || command.photo === undefined) {
      return null;
    }
    const storageKey = randomUUID();
    try {
      await this.storage.write(
        storageKey,
        command.photo.content,
        command.photo.mediaType,
      );
    } catch (error) {
      this.rethrowStorageFailure(error, 'write');
    }
    return {
      format: command.photo.format,
      sizeBytes: command.photo.sizeBytes,
      storageKey,
    };
  }

  /** Removes one new unconfirmed object after a failed transaction. */
  private async compensateNewPhoto(storageKey: string): Promise<void> {
    try {
      await this.storage.remove(storageKey);
    } catch {
      this.logger.error({
        event: 'patient_photo_storage_operation',
        operation: 'compensate_update_failure',
        outcome: 'failed',
      });
      throw patientPhotoStorageUnavailable();
    }
  }

  /** Best-effort cleanup after the committed row no longer references a photo. */
  private async cleanupFormerPhoto(storageKey: string): Promise<void> {
    try {
      await this.storage.remove(storageKey);
    } catch {
      this.logger.error({
        event: 'patient_photo_storage_operation',
        operation: 'cleanup_former_photo',
        outcome: 'failed',
      });
    }
  }
}

/** Rejects ambiguous photoAction and file combinations at the API boundary. */
function validatePhotoDecision(command: UpdatePatientCommand): void {
  const hasPhoto = command.photo !== undefined;
  if (
    (command.photoAction === 'replace' && !hasPhoto) ||
    (command.photoAction !== 'replace' && hasPhoto)
  ) {
    throw new BadRequestException('Invalid patient photo decision');
  }
}

/** Resolves the current metadata after one explicit update decision. */
function resolveUpdatedPhoto(
  action: UpdatePatientCommand['photoAction'],
  currentPhoto: PatientPhotoModel | null,
  newPhoto: PatientPhotoModel | null,
): PatientPhotoModel | null {
  if (action === 'keep') {
    return currentPhoto;
  }
  return action === 'remove' ? null : newPhoto;
}

/** Creates the indistinguishable missing-or-foreign patient problem. */
function patientNotFound(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.PATIENT_NOT_FOUND,
    detail: 'The requested patient record was not found.',
    status: HttpStatus.NOT_FOUND,
    title: 'Patient not found',
  });
}

/** Maps persisted validated formats to exact response media types. */
function photoMediaType(
  format: PatientPhotoModel['format'],
): PatientPhotoContent['mediaType'] {
  return format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
}

/** Creates the stable public problem for private patient-photo storage. */
function patientPhotoStorageUnavailable(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.PATIENT_PHOTO_STORAGE_UNAVAILABLE,
    detail: 'Private patient photo storage is temporarily unavailable.',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    title: 'Patient photo storage unavailable',
  });
}
