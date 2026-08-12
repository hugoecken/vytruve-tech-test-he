import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsModule } from '@api/app/patients/patients.module';
import { ScansModule } from '@api/app/scans/scans.module';
import { PrintRequestsController } from './api/controllers/print-requests.controller';
import { PrintRequestApiMapper } from './api/mappers/print-request-api.mapper';
import { PrintRequestViewMapper } from './application/mappers/print-request-view.mapper';
import { PRINTING_PROVIDER } from './application/ports/printing-provider.port';
import { PrintingService } from './application/services/printing.service';
import { PrintRequestEntity } from './infrastructure/persistence/print-request.entity';
import { PrintRequestPersistenceMapper } from './infrastructure/persistence/mappers/print-request-persistence.mapper';
import { PrintingProviderMapper } from './infrastructure/provider/mappers/printing-provider.mapper';
import { PrintingProviderAdapter } from './infrastructure/provider/printing-provider.adapter';

/** Composes owner-scoped printing persistence, HTTP, and provider integration. */
@Module({
  controllers: [PrintRequestsController],
  imports: [
    PatientsModule,
    ScansModule,
    TypeOrmModule.forFeature([PrintRequestEntity]),
  ],
  providers: [
    { provide: PRINTING_PROVIDER, useClass: PrintingProviderAdapter },
    PrintingProviderMapper,
    PrintRequestApiMapper,
    PrintRequestViewMapper,
    PrintRequestPersistenceMapper,
    PrintingService,
  ],
})
export class PrintingModule {}
