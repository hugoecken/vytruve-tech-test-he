import { Module } from '@nestjs/common';
import { ScansModule } from '@api/app/scans/scans.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/** Composes operational health probes with the dependencies they verify. */
@Module({
  controllers: [HealthController],
  imports: [ScansModule],
  providers: [HealthService],
})
export class HealthModule {}
