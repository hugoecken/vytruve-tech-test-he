import { Injectable } from '@nestjs/common';
import type {
  ScanEncoding,
  ScanModel,
} from '../../../application/models/scan.model';
import { ScanEntity } from '../scan.entity';

/** Maps private scan metadata across the application and TypeORM boundary. */
@Injectable()
export class ScanPersistenceMapper {
  /**
   * Builds a new scan entity without retaining a client filename or MIME claim.
   *
   * @param patientId Authorized parent identifier.
   * @param encoding Structurally validated PLY encoding.
   * @param sizeBytes Exact upload byte length.
   * @param storageKey Opaque private object key.
   * @returns Explicit persistence entity ready for insertion.
   */
  toEntity(
    patientId: string,
    encoding: ScanEncoding,
    sizeBytes: number,
    storageKey: string,
  ): ScanEntity {
    const entity = new ScanEntity();
    entity.encoding = encoding;
    entity.format = 'ply';
    entity.patientId = patientId;
    entity.sizeBytes = sizeBytes;
    entity.storageKey = storageKey;
    return entity;
  }

  /**
   * Projects stored metadata without its private object key.
   *
   * @param entity Stored scan metadata.
   * @param printingAvailable Whether no non-terminal request reserves the scan.
   * @returns Framework-independent scan model.
   */
  toModel(entity: ScanEntity, printingAvailable: boolean): ScanModel {
    return {
      createdAt: entity.createdAt,
      encoding: entity.encoding,
      id: entity.id,
      patientId: entity.patientId,
      printingAvailable,
      sizeBytes: entity.sizeBytes,
    };
  }
}
