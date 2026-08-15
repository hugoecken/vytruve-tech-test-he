import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { memoryStorage } from 'multer';
import { PatientsModule } from '@api/app/patients/patients.module';
import type { ApiEnvironment } from '@api/config/environment';
import { ScansController } from './api/controllers/scans.controller';
import { ScanApiMapper } from './api/mappers/scan-api.mapper';
import {
  RequiredScanFilePipe,
  ScanFileSizePipe,
} from './api/pipes/ply-upload.pipe';
import { SCAN_STORAGE } from './application/ports/scan-storage.port';
import { ScansService } from './application/services/scans.service';
import { PlyContentValidator } from './application/validation/ply-content.validator';
import { ScanEntity } from './infrastructure/persistence/scan.entity';
import { ScanPersistenceMapper } from './infrastructure/persistence/mappers/scan-persistence.mapper';
import { MinioScanStorageAdapter } from './infrastructure/storage/minio-scan-storage.adapter';

/** Composes owner-scoped scan HTTP, validation, persistence, and storage. */
@Module({
  controllers: [ScansController],
  exports: [SCAN_STORAGE, ScansService],
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnvironment, true>) => {
        const maxScanSizeBytes = config.getOrThrow<number>(
          'MAX_SCAN_SIZE_BYTES',
        );
        return {
          limits: {
            // Multer marks a file as truncated when it reaches this boundary.
            fileSize: maxScanSizeBytes + 1,
            files: 1,
          },
          storage: memoryStorage(),
        };
      },
    }),
    PatientsModule,
    TypeOrmModule.forFeature([ScanEntity]),
  ],
  providers: [
    { provide: SCAN_STORAGE, useClass: MinioScanStorageAdapter },
    PlyContentValidator,
    RequiredScanFilePipe,
    ScanFileSizePipe,
    ScanApiMapper,
    ScanPersistenceMapper,
    ScansService,
  ],
})
export class ScansModule {}
