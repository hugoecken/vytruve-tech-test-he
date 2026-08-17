import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { ApiEnvironment } from '@api/config/environment';
import {
  PRIVATE_OBJECT_STORAGE,
  type PrivateObjectStoragePort,
} from '@api/storage/private-object-storage.port';

/** Safe operational state returned without dependency or configuration details. */
export interface HealthResult {
  revision: string;
  status: 'live' | 'ready' | 'unavailable';
}

/** Owns process, revision, PostgreSQL, and private-storage readiness checks. */
@Injectable()
export class HealthService {
  private readonly revision: string;

  /**
   * Creates the readiness boundary from validated runtime dependencies.
   *
   * @param config Validated API configuration.
   * @param dataSource Active application PostgreSQL connection.
   * @param privateStorage Shared private object-storage boundary.
   */
  constructor(
    config: ConfigService<ApiEnvironment, true>,
    private readonly dataSource: DataSource,
    @Inject(PRIVATE_OBJECT_STORAGE)
    private readonly privateStorage: PrivateObjectStoragePort,
  ) {
    this.revision = config.getOrThrow<string>('APP_REVISION');
  }

  /** @returns Process availability and its immutable source revision. */
  getLiveness(): HealthResult {
    return { revision: this.revision, status: 'live' };
  }

  /**
   * Verifies the expected revision and dependencies required to serve the product.
   *
   * @param expectedRevision Full source revision requested by the release workflow.
   * @returns Ready only when the revision, PostgreSQL, and MinIO all match.
   */
  async getReadiness(expectedRevision: string): Promise<HealthResult> {
    if (expectedRevision !== this.revision) {
      return { revision: this.revision, status: 'unavailable' };
    }

    try {
      await this.dataSource.query('SELECT 1');
      await this.privateStorage.checkReadiness();
      return { revision: this.revision, status: 'ready' };
    } catch {
      return { revision: this.revision, status: 'unavailable' };
    }
  }
}
