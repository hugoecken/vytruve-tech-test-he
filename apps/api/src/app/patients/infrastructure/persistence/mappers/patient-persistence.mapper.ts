import { Injectable } from '@nestjs/common';
import type {
  CreatePatientCommand,
  PatientModel,
  PatientPhotoFormat,
  PatientPhotoModel,
  UpdatePatientCommand,
} from '../../../application/models/patient.model';
import { PatientEntity } from '../patient.entity';

/** Maps patient application values at the TypeORM persistence boundary. */
@Injectable()
export class PatientPersistenceMapper {
  /** Maps a validated owner-scoped command and confirmed photo metadata. */
  toEntity(
    command: CreatePatientCommand,
    photo: PatientPhotoModel | null = null,
  ): PatientEntity {
    const entity = new PatientEntity();
    entity.accountId = command.accountId;
    entity.age = command.age;
    entity.firstName = command.firstName;
    entity.lastName = command.lastName;
    entity.photoFormat = photo?.format ?? null;
    entity.photoSizeBytes = photo?.sizeBytes ?? null;
    entity.photoStorageKey = photo?.storageKey ?? null;
    return entity;
  }

  /** Applies complete editable fields and the selected current-photo metadata. */
  applyUpdate(
    entity: PatientEntity,
    command: UpdatePatientCommand,
    photo: PatientPhotoModel | null,
  ): PatientEntity {
    entity.age = command.age;
    entity.firstName = command.firstName;
    entity.lastName = command.lastName;
    entity.photoFormat = photo?.format ?? null;
    entity.photoSizeBytes = photo?.sizeBytes ?? null;
    entity.photoStorageKey = photo?.storageKey ?? null;
    return entity;
  }

  /** Maps one patient entity to its persistence-free application model. */
  toModel(entity: PatientEntity): PatientModel {
    return {
      age: entity.age,
      createdAt: entity.createdAt,
      firstName: entity.firstName,
      id: entity.id,
      lastName: entity.lastName,
      photo: toPhotoModel(entity),
    };
  }
}

/** Maps the database-enforced nullable photo metadata tuple. */
function toPhotoModel(entity: PatientEntity): PatientPhotoModel | null {
  if (
    entity.photoStorageKey === null &&
    entity.photoFormat === null &&
    entity.photoSizeBytes === null
  ) {
    return null;
  }
  if (
    entity.photoStorageKey === null ||
    entity.photoFormat === null ||
    entity.photoSizeBytes === null
  ) {
    throw new Error('Patient photo metadata is inconsistent');
  }
  return {
    format: entity.photoFormat as PatientPhotoFormat,
    sizeBytes: entity.photoSizeBytes,
    storageKey: entity.photoStorageKey,
  };
}
