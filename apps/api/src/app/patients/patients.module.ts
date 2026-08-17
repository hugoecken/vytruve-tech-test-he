import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PrivateObjectStorageModule } from '@api/storage/private-object-storage.module';
import { PatientsController } from './api/controllers/patients.controller';
import { PatientApiMapper } from './api/mappers/patient-api.mapper';
import { PatientPhotoUploadPipe } from './api/pipes/patient-photo-upload.pipe';
import { PatientsService } from './application/services/patients.service';
import {
  MAX_PATIENT_PHOTO_SIZE_BYTES,
  PatientPhotoValidator,
} from './application/validation/patient-photo.validator';
import { PatientEntity } from './infrastructure/persistence/patient.entity';
import { PatientPersistenceMapper } from './infrastructure/persistence/mappers/patient-persistence.mapper';

/** Encapsulates owner-scoped patient records and their server pagination. */
@Module({
  controllers: [PatientsController],
  exports: [PatientsService],
  imports: [
    MulterModule.register({
      limits: { fileSize: MAX_PATIENT_PHOTO_SIZE_BYTES + 1, files: 1 },
      storage: memoryStorage(),
    }),
    PrivateObjectStorageModule,
    TypeOrmModule.forFeature([PatientEntity]),
  ],
  providers: [
    PatientApiMapper,
    PatientPersistenceMapper,
    PatientPhotoUploadPipe,
    PatientPhotoValidator,
    PatientsService,
  ],
})
export class PatientsModule {}
