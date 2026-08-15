import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '@api/app/auth/api/decorators/public.decorator';
import { HealthService, type HealthResult } from './health.service';

/** Exposes non-product operational probes without authentication or OpenAPI generation. */
@ApiExcludeController()
@Public()
@Controller('health')
export class HealthController {
  /** @param health Operational health boundary. */
  constructor(private readonly health: HealthService) {}

  /** @returns Process availability and its source revision. */
  @Get('live')
  getLiveness(): HealthResult {
    return this.health.getLiveness();
  }

  /**
   * Translates dependency and revision readiness into a probe status.
   *
   * @param revision Full source revision expected by the release workflow.
   * @param response Express response used for the dynamic readiness status.
   * @returns The serialized readiness result.
   */
  @Get('ready/:revision')
  async getReadiness(
    @Param('revision') revision: string,
    @Res() response: Response,
  ): Promise<Response> {
    const result = await this.health.getReadiness(revision);
    return response.status(result.status === 'ready' ? 200 : 503).json(result);
  }
}
