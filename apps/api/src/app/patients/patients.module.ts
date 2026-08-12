import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsController } from './api/controllers/patients.controller';
import { PatientApiMapper } from './api/mappers/patient-api.mapper';
import { PatientsService } from './application/services/patients.service';
import { PatientCursorCodec } from './infrastructure/pagination/patient-cursor-codec';
import { PatientEntity } from './infrastructure/persistence/patient.entity';
import { PatientPersistenceMapper } from './infrastructure/persistence/mappers/patient-persistence.mapper';

/** Encapsulates owner-scoped patient records and their forward pagination. */
@Module({
  controllers: [PatientsController],
  imports: [TypeOrmModule.forFeature([PatientEntity])],
  providers: [
    PatientApiMapper,
    PatientCursorCodec,
    PatientPersistenceMapper,
    PatientsService,
  ],
})
export class PatientsModule {}
