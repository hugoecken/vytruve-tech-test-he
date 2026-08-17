import { Module } from '@nestjs/common';
import { MinioPrivateObjectStorageAdapter } from './minio-private-object-storage.adapter';
import { PRIVATE_OBJECT_STORAGE } from './private-object-storage.port';

/** Provides the single private object-storage boundary shared by API features. */
@Module({
  exports: [PRIVATE_OBJECT_STORAGE],
  providers: [
    {
      provide: PRIVATE_OBJECT_STORAGE,
      useClass: MinioPrivateObjectStorageAdapter,
    },
  ],
})
export class PrivateObjectStorageModule {}
