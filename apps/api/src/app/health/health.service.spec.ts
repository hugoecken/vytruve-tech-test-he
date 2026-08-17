import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import type { ApiEnvironment } from '@api/config/environment';
import type { PrivateObjectStoragePort } from '@api/storage/private-object-storage.port';
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
    const privateStorage = {
      checkReadiness: jest.fn().mockResolvedValue(undefined),
    };
    const service = new HealthService(
      config,
      dataSource as unknown as DataSource,
      privateStorage as unknown as PrivateObjectStoragePort,
    );

    await expect(service.getReadiness(REVISION)).resolves.toEqual({
      revision: REVISION,
      status: 'ready',
    });
  });

  it('does not query dependencies when the expected revision is not running', async () => {
    const dataSource = { query: jest.fn() };
    const privateStorage = { checkReadiness: jest.fn() };
    const service = new HealthService(
      config,
      dataSource as unknown as DataSource,
      privateStorage as unknown as PrivateObjectStoragePort,
    );

    await expect(service.getReadiness('previous')).resolves.toEqual({
      revision: REVISION,
      status: 'unavailable',
    });
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(privateStorage.checkReadiness).not.toHaveBeenCalled();
  });

  it('reports unavailable without exposing which retained dependency failed', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('offline')),
    };
    const privateStorage = { checkReadiness: jest.fn() };
    const service = new HealthService(
      config,
      dataSource as unknown as DataSource,
      privateStorage as unknown as PrivateObjectStoragePort,
    );

    await expect(service.getReadiness(REVISION)).resolves.toEqual({
      revision: REVISION,
      status: 'unavailable',
    });
    expect(privateStorage.checkReadiness).not.toHaveBeenCalled();
  });
});
