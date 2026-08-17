import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, S3Error } from 'minio';
import { Readable } from 'node:stream';
import type { ApiEnvironment } from '@api/config/environment';
import { MinioPrivateObjectStorageAdapter } from './minio-private-object-storage.adapter';
import { PrivateObjectStorageError } from './private-object-storage.port';

jest.mock('minio', () => {
  class MockS3Error extends Error {
    code = '';
  }

  return { Client: jest.fn(), S3Error: MockS3Error };
});

const STORAGE_KEY = '00000000-0000-4000-8000-000000000001';

interface MinioClientDouble {
  bucketExists: jest.Mock;
  getObject: jest.Mock;
  makeBucket: jest.Mock;
  putObject: jest.Mock;
  removeObject: jest.Mock;
  statObject: jest.Mock;
}

describe(MinioPrivateObjectStorageAdapter.name, () => {
  let client: MinioClientDouble;
  let storage: MinioPrivateObjectStorageAdapter;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    client = {
      bucketExists: jest.fn().mockResolvedValue(true),
      getObject: jest.fn().mockResolvedValue(Readable.from(['content'])),
      makeBucket: jest.fn().mockResolvedValue(undefined),
      putObject: jest.fn().mockResolvedValue(undefined),
      removeObject: jest.fn().mockResolvedValue(undefined),
      statObject: jest.fn().mockResolvedValue({ size: 7 }),
    };
    (Client as unknown as jest.Mock).mockImplementation(() => client);
    const config = new ConfigService<ApiEnvironment, true>({
      MINIO_ACCESS_KEY: 'development-access',
      MINIO_BUCKET: 'private-content',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_SECRET_KEY: 'development-secret',
      MINIO_USE_SSL: false,
    });
    storage = new MinioPrivateObjectStorageAdapter(config);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('confirms readiness when the configured bucket is reachable', async () => {
    await expect(storage.checkReadiness()).resolves.toBeUndefined();

    expect(client.bucketExists).toHaveBeenCalledWith('private-content');
  });

  it('creates the configured private bucket during initialization when absent', async () => {
    client.bucketExists.mockResolvedValue(false);

    await storage.onModuleInit();

    expect(client.makeBucket).toHaveBeenCalledWith('private-content');
  });

  it('stores bounded content under the exact opaque key and media type', async () => {
    const content = Buffer.from('content');

    await storage.write(STORAGE_KEY, content, 'image/png');

    expect(client.putObject).toHaveBeenCalledWith(
      'private-content',
      STORAGE_KEY,
      content,
      content.length,
      { 'Content-Type': 'image/png' },
    );
  });

  it('opens content only when provider and persisted sizes match', async () => {
    const opened = await storage.open(STORAGE_KEY, 7);

    expect(opened.sizeBytes).toBe(7);
    expect(client.getObject).toHaveBeenCalledWith(
      'private-content',
      STORAGE_KEY,
    );
  });

  it('rejects a key outside the flat UUID namespace before provider access', async () => {
    await expect(storage.remove('../private-content')).rejects.toMatchObject({
      kind: 'unavailable',
    });

    expect(client.removeObject).not.toHaveBeenCalled();
  });

  it('translates missing objects without exposing the provider error', async () => {
    const missing = new S3Error();
    missing.code = 'NoSuchKey';
    client.statObject.mockRejectedValue(missing);

    await expect(storage.open(STORAGE_KEY, 7)).rejects.toEqual(
      new PrivateObjectStorageError('not_found'),
    );
  });

  it('rejects provider metadata that disagrees with persisted size', async () => {
    client.statObject.mockResolvedValue({ size: 6 });

    await expect(storage.open(STORAGE_KEY, 7)).rejects.toMatchObject({
      kind: 'unavailable',
    });

    expect(client.getObject).not.toHaveBeenCalled();
  });
});
