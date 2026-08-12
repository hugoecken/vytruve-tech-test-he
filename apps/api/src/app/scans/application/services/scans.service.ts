import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { Repository } from 'typeorm';
import { PatientsService } from '@api/app/patients/application/services/patients.service';
import type { ApiEnvironment } from '@api/config/environment';
import { ProblemCode } from '@api/http/problem-code';
import { ProblemDetailsException } from '@api/http/problem-details.exception';
import {
  createPage,
  createPageWindow,
  type PageParameters,
} from '@api/pagination/page';
import { ScanEntity } from '../../infrastructure/persistence/scan.entity';
import { ScanPersistenceMapper } from '../../infrastructure/persistence/mappers/scan-persistence.mapper';
import type {
  CreateScanCommand,
  ScanContentModel,
  ScanDownloadModel,
  ScanModel,
  ScanPageModel,
} from '../models/scan.model';
import {
  SCAN_STORAGE,
  ScanStorageError,
  type ScanStoragePort,
} from '../ports/scan-storage.port';
import { PlyContentValidator } from '../validation/ply-content.validator';

/** Coordinates scan ownership, PLY validation, metadata, and private storage. */
@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);
  private readonly maxScanSizeBytes: number;

  /**
   * Creates the scan use-case provider with its current feature dependencies.
   *
   * @param scans Feature-owned TypeORM repository.
   * @param patients Parent ownership boundary.
   * @param validator Bounded structural PLY validator.
   * @param storage Private object-storage port.
   * @param mapper Scan persistence mapper.
   * @param config Validated scan-size boundary.
   */
  constructor(
    @InjectRepository(ScanEntity)
    private readonly scans: Repository<ScanEntity>,
    private readonly patients: PatientsService,
    private readonly validator: PlyContentValidator,
    @Inject(SCAN_STORAGE)
    private readonly storage: ScanStoragePort,
    private readonly mapper: ScanPersistenceMapper,
    config: ConfigService<ApiEnvironment, true>,
  ) {
    this.maxScanSizeBytes = config.getOrThrow<number>('MAX_SCAN_SIZE_BYTES');
  }

  /**
   * Writes validated content before metadata and compensates a failed database write.
   *
   * @param command Session-owned patient and bounded multipart bytes.
   * @returns Persisted public-safe scan metadata.
   * @throws PATIENT_NOT_FOUND, scan validation problems, or storage failures.
   */
  async create(command: CreateScanCommand): Promise<ScanModel> {
    await this.patients.get(command.accountId, command.patientId);
    const { encoding } = this.validator.validate(command.content);
    const storageKey = randomUUID();

    try {
      await this.storage.write(storageKey, command.content);
    } catch (error) {
      this.rethrowStorageFailure(error, 'write');
    }

    try {
      const entity = this.mapper.toEntity(
        command.patientId,
        encoding,
        command.content.length,
        storageKey,
      );
      return this.mapper.toModel(await this.scans.save(entity), true);
    } catch (persistenceError) {
      try {
        await this.storage.remove(storageKey);
      } catch {
        this.logger.error({
          event: 'scan_storage_operation',
          operation: 'compensate_metadata_failure',
          outcome: 'failed',
        });
        throw scanStorageUnavailable();
      }
      throw persistenceError;
    }
  }

  /**
   * Lists one deterministic page after authorizing the parent patient.
   *
   * @param accountId Verified session owner.
   * @param patientId Requested parent patient.
   * @param query Validated zero-based server page.
   * @returns Owner-visible scan page and next-page availability.
   * @throws PATIENT_NOT_FOUND for missing and foreign parents.
   */
  async list(
    accountId: string,
    patientId: string,
    query: PageParameters,
  ): Promise<ScanPageModel> {
    await this.patients.get(accountId, patientId);
    const window = createPageWindow(query);
    const entities = await this.scans
      .createQueryBuilder('scan')
      .leftJoinAndSelect(
        'scan.printRequests',
        'activePrintRequest',
        'activePrintRequest.activeSlot = :activeSlot',
        { activeSlot: true },
      )
      .select([
        'scan.createdAt',
        'scan.encoding',
        'scan.id',
        'scan.patientId',
        'scan.sizeBytes',
        'activePrintRequest.activeSlot',
        'activePrintRequest.id',
      ])
      .where('scan.patientId = :patientId', { patientId })
      .orderBy('scan.createdAt', 'DESC')
      .addOrderBy('scan.id', 'DESC')
      .skip(window.skip)
      .take(window.take)
      .getMany();
    const page = createPage(entities, query);
    return {
      ...page,
      items: page.items.map((entity) =>
        this.mapper.toModel(entity, entity.printRequests.length === 0),
      ),
    };
  }

  /**
   * Opens a private stream only after both patient and scan ownership checks.
   *
   * @param accountId Verified session owner.
   * @param patientId Requested parent patient.
   * @param scanId Requested scan identifier.
   * @returns Authorized object stream and verified byte length.
   * @throws PATIENT_NOT_FOUND, SCAN_NOT_FOUND, or SCAN_STORAGE_UNAVAILABLE.
   */
  async openDownload(
    accountId: string,
    patientId: string,
    scanId: string,
  ): Promise<ScanDownloadModel> {
    const scan = await this.findOwnedStorageRecord(
      accountId,
      patientId,
      scanId,
    );

    try {
      return await this.storage.open(scan.storageKey, scan.sizeBytes);
    } catch (error) {
      this.rethrowStorageFailure(error, 'open');
    }
  }

  /**
   * Reads one bounded scan for an internal consumer after full ownership checks.
   *
   * @param accountId Verified session owner.
   * @param patientId Requested parent patient.
   * @param scanId Requested scan identifier.
   * @returns Exact stored bytes without storage or filename metadata.
   * @throws PATIENT_NOT_FOUND, SCAN_NOT_FOUND, or SCAN_STORAGE_UNAVAILABLE.
   */
  async readContent(
    accountId: string,
    patientId: string,
    scanId: string,
  ): Promise<ScanContentModel> {
    const scan = await this.findOwnedStorageRecord(
      accountId,
      patientId,
      scanId,
    );
    try {
      const opened = await this.storage.open(scan.storageKey, scan.sizeBytes);
      if (opened.sizeBytes > this.maxScanSizeBytes) {
        throw new ScanStorageError('unavailable');
      }
      const content = await this.readBoundedStream(
        opened.stream,
        scan.sizeBytes,
      );
      return { content, id: scan.id };
    } catch (error) {
      this.rethrowStorageFailure(error, 'read');
    }
  }

  /**
   * Resolves storage metadata through combined patient and scan ownership predicates.
   *
   * @param accountId Verified session owner.
   * @param patientId Requested patient identifier.
   * @param scanId Requested scan identifier.
   * @returns Private storage metadata for the exact owned scan.
   * @throws PATIENT_NOT_FOUND or SCAN_NOT_FOUND without ownership disclosure.
   */
  private async findOwnedStorageRecord(
    accountId: string,
    patientId: string,
    scanId: string,
  ): Promise<ScanEntity> {
    await this.patients.get(accountId, patientId);
    const scan = await this.scans.findOne({
      select: { id: true, sizeBytes: true, storageKey: true },
      where: { id: scanId, patientId },
    });
    if (scan === null) {
      throw new ProblemDetailsException({
        code: ProblemCode.SCAN_NOT_FOUND,
        detail: 'The requested scan was not found.',
        status: HttpStatus.NOT_FOUND,
        title: 'Scan not found',
      });
    }
    return scan;
  }

  /**
   * Consumes one private object while enforcing its declared and configured limits.
   *
   * @param stream Authorized object stream returned by the storage adapter.
   * @param expectedSize Exact byte length persisted with the scan metadata.
   * @returns Buffered content whose length matches the persisted metadata.
   * @throws ScanStorageError when content exceeds a limit or has changed length.
   */
  private async readBoundedStream(
    stream: Readable,
    expectedSize: number,
  ): Promise<Buffer> {
    const chunks: Buffer[] = [];
    let sizeBytes = 0;

    for await (const value of stream) {
      if (!(value instanceof Uint8Array)) {
        throw new ScanStorageError('unavailable');
      }
      const chunk = Buffer.from(value);
      sizeBytes += chunk.length;
      if (sizeBytes > expectedSize || sizeBytes > this.maxScanSizeBytes) {
        throw new ScanStorageError('unavailable');
      }
      chunks.push(chunk);
    }

    if (sizeBytes !== expectedSize) {
      throw new ScanStorageError('unavailable');
    }
    return Buffer.concat(chunks, sizeBytes);
  }

  /**
   * Logs only operational storage context and translates provider-neutral failures.
   *
   * @param error Unknown value raised by the storage boundary.
   * @param operation Storage operation that failed.
   * @throws SCAN_STORAGE_UNAVAILABLE for known storage failures.
   */
  private rethrowStorageFailure(
    error: unknown,
    operation: 'open' | 'read' | 'write',
  ): never {
    if (error instanceof ScanStorageError) {
      this.logger.error({
        event: 'scan_storage_operation',
        operation,
        outcome: error.kind,
      });
      throw scanStorageUnavailable();
    }
    if (operation === 'read') {
      this.logger.error({
        event: 'scan_storage_operation',
        operation,
        outcome: 'unavailable',
      });
      throw scanStorageUnavailable();
    }
    throw error;
  }
}

/**
 * Creates the stable public problem for private object-storage failures.
 *
 * @returns Provider-neutral service-unavailable problem.
 */
function scanStorageUnavailable(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.SCAN_STORAGE_UNAVAILABLE,
    detail: 'Private scan storage is temporarily unavailable.',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    title: 'Scan storage unavailable',
  });
}
