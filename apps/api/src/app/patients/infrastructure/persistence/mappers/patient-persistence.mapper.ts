import { Injectable } from '@nestjs/common';
import type {
  CreatePatientCommand,
  PatientModel,
} from '../../../application/models/patient.model';
import { PatientEntity } from '../patient.entity';

/** Maps patient application values at the TypeORM persistence boundary. */
@Injectable()
export class PatientPersistenceMapper {
  /** Maps a validated owner-scoped command to a new patient entity. */
  toEntity(command: CreatePatientCommand): PatientEntity {
    const entity = new PatientEntity();
    entity.accountId = command.accountId;
    entity.age = command.age;
    entity.firstName = command.firstName;
    entity.lastName = command.lastName;
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
    };
  }
}
