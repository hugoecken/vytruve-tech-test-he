import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import type { ApiEnvironment } from '@api/config/environment';
import type { ScanStoragePort } from '@api/app/scans/application/ports/scan-storage.port';
import { HealthService } from './health.service';

const REVISION = '0123456789abcdef0123456789abcdef01234567';

describe(HealthService.name, () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue(REVISION),
  } as unknown as ConfigService<ApiEnvironment, true>;

  it('reports ready when the expected revision and retained dependencies are available', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const scanStorage = {
      checkReadiness: jest.fn().mockResolvedValue(undefined),
    };
    const service = new HealthService(
      config,
      dataSource as unknown as DataSource,
      scanStorage as unknown as ScanStoragePort,
    );

    await expect(service.getReadiness(REVISION)).resolves.toEqual({
      revision: REVISION,
      status: 'ready',
    });
  });

  it('does not query dependencies when the expected revision is not running', async () => {
    const dataSource = { query: jest.fn() };
    const scanStorage = { checkReadiness: jest.fn() };
    const service = new HealthService(
      config,
      dataSource as unknown as DataSource,
      scanStorage as unknown as ScanStoragePort,
    );

    await expect(service.getReadiness('previous')).resolves.toEqual({
      revision: REVISION,
      status: 'unavailable',
    });
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(scanStorage.checkReadiness).not.toHaveBeenCalled();
  });

  it('reports unavailable without exposing which retained dependency failed', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('offline')),
    };
    const scanStorage = { checkReadiness: jest.fn() };
    const service = new HealthService(
      config,
      dataSource as unknown as DataSource,
      scanStorage as unknown as ScanStoragePort,
    );

    await expect(service.getReadiness(REVISION)).resolves.toEqual({
      revision: REVISION,
      status: 'unavailable',
    });
    expect(scanStorage.checkReadiness).not.toHaveBeenCalled();
  });
});
