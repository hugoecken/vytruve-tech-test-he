import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsController } from './api/controllers/patients.controller';
import { PatientApiMapper } from './api/mappers/patient-api.mapper';
import { PatientsService } from './application/services/patients.service';
import { PatientEntity } from './infrastructure/persistence/patient.entity';
import { PatientPersistenceMapper } from './infrastructure/persistence/mappers/patient-persistence.mapper';

/** Encapsulates owner-scoped patient records and their server pagination. */
@Module({
  controllers: [PatientsController],
  exports: [PatientsService],
  imports: [TypeOrmModule.forFeature([PatientEntity])],
  providers: [PatientApiMapper, PatientPersistenceMapper, PatientsService],
})
export class PatientsModule {}
