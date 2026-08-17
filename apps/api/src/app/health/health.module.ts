import { Module } from '@nestjs/common';
import { PrivateObjectStorageModule } from '@api/storage/private-object-storage.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/** Composes operational health probes with the dependencies they verify. */
@Module({
  controllers: [HealthController],
  imports: [PrivateObjectStorageModule],
  providers: [HealthService],
})
export class HealthModule {}
