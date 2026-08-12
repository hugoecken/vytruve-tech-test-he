import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { ProblemCode } from '../../../../http/problem-code';
import { ProblemDetailsException } from '../../../../http/problem-details.exception';
import {
  createPage,
  createPageWindow,
  type PageParameters,
} from '../../../../pagination/page';
import { PatientsService } from '../../../patients/application/services/patients.service';
import { ScanEntity } from '../../infrastructure/persistence/scan.entity';
import { ScanPersistenceMapper } from '../../infrastructure/persistence/mappers/scan-persistence.mapper';
import type {
  CreateScanCommand,
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

  /**
   * Creates the scan use-case provider with its current feature dependencies.
   *
   * @param scans Feature-owned TypeORM repository.
   * @param patients Parent ownership boundary.
   * @param validator Bounded structural PLY validator.
   * @param storage Private object-storage port.
   * @param mapper Scan persistence mapper.
   */
  constructor(
    @InjectRepository(ScanEntity)
    private readonly scans: Repository<ScanEntity>,
    private readonly patients: PatientsService,
    private readonly validator: PlyContentValidator,
    @Inject(SCAN_STORAGE)
    private readonly storage: ScanStoragePort,
    private readonly mapper: ScanPersistenceMapper,
  ) {}

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
      return this.mapper.toModel(await this.scans.save(entity));
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
    const entities = await this.scans.find({
      order: { createdAt: 'DESC', id: 'DESC' },
      select: {
        createdAt: true,
        encoding: true,
        id: true,
        patientId: true,
        sizeBytes: true,
      },
      ...window,
      where: { patientId },
    });
    const page = createPage(entities, query);
    return {
      ...page,
      items: page.items.map((entity) => this.mapper.toModel(entity)),
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

    try {
      return await this.storage.open(scan.storageKey, scan.sizeBytes);
    } catch (error) {
      this.rethrowStorageFailure(error, 'open');
    }
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
    operation: 'open' | 'write',
  ): never {
    if (error instanceof ScanStorageError) {
      this.logger.error({
        event: 'scan_storage_operation',
        operation,
        outcome: error.kind,
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
