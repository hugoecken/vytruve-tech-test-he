import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { Repository } from 'typeorm';
import { PatientsService } from '@api/app/patients/application/services/patients.service';
import { ScansService } from '@api/app/scans/application/services/scans.service';
import { ProblemCode } from '@api/http/problem-code';
import { ProblemDetailsException } from '@api/http/problem-details.exception';
import {
  createPage,
  createPageWindow,
  type PageParameters,
} from '@api/pagination/page';
import { isUniqueViolation } from '@api/persistence/postgres-error';
import { PrintRequestEntity } from '../../infrastructure/persistence/print-request.entity';
import { PrintRequestPersistenceMapper } from '../../infrastructure/persistence/mappers/print-request-persistence.mapper';
import { PrintRequestViewMapper } from '../mappers/print-request-view.mapper';
import {
  applyPrintJobObservation,
  type CreatePrintRequestCommand,
  type PrintJobObservationModel,
  type PrintRequestPageModel,
  type PrintRequestViewModel,
} from '../models/print-request.model';
import {
  PRINTING_PROVIDER,
  PrintingProviderError,
  type PrintingProviderPort,
} from '../ports/printing-provider.port';

const ACTIVE_REQUEST_CONSTRAINT = 'uq_print_request_active_slot';
const PRINT_REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PRINT_REFERENCE_LENGTH = 12;

/** Coordinates durable print submission, reconciliation, and history reads. */
@Injectable()
export class PrintingService {
  private readonly logger = new Logger(PrintingService.name);

  /**
   * Creates printing orchestration with its owned persistence and external boundaries.
   *
   * @param requests Feature-owned TypeORM repository.
   * @param patients Parent ownership boundary for history reads.
   * @param scans Owner-authorized private scan content boundary.
   * @param provider Non-idempotent submission and scoped reconciliation port.
   * @param persistence Persistence boundary mapper.
   * @param views Public-safe application view mapper.
   */
  constructor(
    @InjectRepository(PrintRequestEntity)
    private readonly requests: Repository<PrintRequestEntity>,
    private readonly patients: PatientsService,
    private readonly scans: ScansService,
    @Inject(PRINTING_PROVIDER)
    private readonly provider: PrintingProviderPort,
    private readonly persistence: PrintRequestPersistenceMapper,
    private readonly views: PrintRequestViewMapper,
  ) {}

  /**
   * Reserves a stable reference before submitting one scan exactly once.
   *
   * @param command Session-owned patient and scan identifiers.
   * @returns Confirmed state or the durable confirmation-pending reservation.
   * @throws Resource, conflict, capacity, provider, or local persistence problems.
   */
  async create(
    command: CreatePrintRequestCommand,
  ): Promise<PrintRequestViewModel> {
    const scan = await this.scans.readContent(
      command.accountId,
      command.patientId,
      command.scanId,
    );
    const pendingEntity = await this.reserve(scan.id, createReference());
    const pendingModel = this.persistence.toModel(pendingEntity);

    let observation: PrintJobObservationModel;
    try {
      observation = await this.provider.submit(
        scan.content,
        pendingEntity.reference,
      );
    } catch (error) {
      if (!(error instanceof PrintingProviderError)) {
        this.logger.error({
          event: 'printing_submission',
          outcome: 'unexpected_failure_retained_as_pending',
          requestId: pendingEntity.id,
        });
        throw internalError();
      }

      if (error.kind === 'ambiguous_submission') {
        return this.views.toView(pendingModel, new Date());
      }

      if (error.kind === 'capacity_reached') {
        await this.removeRejectedReservation(pendingEntity.id);
        throw printingCapacityReached();
      }

      if (error.kind === 'authentication_failed') {
        await this.removeRejectedReservation(pendingEntity.id);
        throw printingUnavailable();
      }

      return this.views.toView(pendingModel, new Date());
    }

    const observedAt = new Date();
    const observedModel = applyPrintJobObservation(
      pendingModel,
      observation,
      observedAt,
    );
    const observedEntity = this.persistence.toUpdatedEntity(
      pendingEntity,
      observedModel,
    );
    try {
      const saved = await this.requests.save(observedEntity);
      return this.views.toView(this.persistence.toModel(saved), observedAt);
    } catch {
      this.logger.error({
        event: 'printing_submission_persistence',
        outcome: 'confirmation_not_persisted',
        reference: pendingEntity.reference,
        requestId: pendingEntity.id,
      });
      return this.views.toView(pendingModel, observedAt);
    }
  }

  /**
   * Lists one patient page and safely refreshes only its non-terminal rows.
   *
   * @param accountId Verified session owner.
   * @param patientId Requested patient identifier.
   * @param query Validated zero-based server page.
   * @returns Last-known page after independent best-effort reconciliation.
   * @throws PATIENT_NOT_FOUND when the parent is missing or foreign-owned.
   */
  async list(
    accountId: string,
    patientId: string,
    query: PageParameters,
  ): Promise<PrintRequestPageModel> {
    await this.patients.get(accountId, patientId);
    const window = createPageWindow(query);
    const entities = await this.requests
      .createQueryBuilder('printRequest')
      .innerJoin('printRequest.scan', 'scan')
      .where('scan.patientId = :patientId', { patientId })
      .orderBy('printRequest.createdAt', 'DESC')
      .addOrderBy('printRequest.id', 'DESC')
      .skip(window.skip)
      .take(window.take)
      .getMany();
    const page = createPage(entities, query);
    const reconciled = await Promise.all(
      page.items.map((entity) => this.reconcile(entity)),
    );
    const observedAt = new Date();
    return {
      ...page,
      items: reconciled.map((entity) =>
        this.views.toView(this.persistence.toModel(entity), observedAt),
      ),
    };
  }

  /**
   * Persists the active-slot reservation and translates only its expected conflict.
   *
   * @param scanId Owner-authorized scan identifier.
   * @param reference Cryptographically random reconciliation reference.
   * @returns Durable confirmation-pending entity.
   * @throws PRINT_REQUEST_CONFLICT when the scan already has active work.
   */
  private async reserve(
    scanId: string,
    reference: string,
  ): Promise<PrintRequestEntity> {
    try {
      return await this.requests.save(
        this.persistence.toPendingEntity(scanId, reference),
      );
    } catch (error) {
      if (isUniqueViolation(error, ACTIVE_REQUEST_CONSTRAINT)) {
        throw printRequestConflict();
      }
      throw error;
    }
  }

  /**
   * Removes a reservation only after the provider definitively rejected submission.
   *
   * @param requestId Exact local request identifier to compensate.
   * @throws When local cleanup cannot restore print eligibility.
   */
  private async removeRejectedReservation(requestId: string): Promise<void> {
    try {
      const result = await this.requests.delete({ id: requestId });
      if (result.affected !== 1) {
        throw new Error('Print reservation was not removed');
      }
    } catch {
      this.logger.error({
        event: 'printing_submission_compensation',
        outcome: 'failed',
        requestId,
      });
      throw internalError();
    }
  }

  /**
   * Reconciles one active row by reference then identifier while preserving safe state.
   *
   * @param entity Last safely persisted request entity.
   * @returns Updated entity or the unchanged last-known entity on provider degradation.
   */
  private async reconcile(
    entity: PrintRequestEntity,
  ): Promise<PrintRequestEntity> {
    if (entity.activeSlot !== true) {
      return entity;
    }

    try {
      const current = this.persistence.toModel(entity);
      const providerId =
        current.providerId ??
        (await this.provider.findIdByReference(current.reference));
      if (providerId === null) {
        return entity;
      }
      const observation = await this.provider.getById(providerId);
      const observedAt = new Date();
      const observed = applyPrintJobObservation(
        current,
        observation,
        observedAt,
      );
      const updated = this.persistence.toUpdatedEntity(entity, observed);
      try {
        return await this.requests.save(updated);
      } catch {
        this.logger.error({
          event: 'printing_reconciliation_persistence',
          outcome: 'last_known_state_retained',
          reference: entity.reference,
          requestId: entity.id,
        });
        return entity;
      }
    } catch (error) {
      if (error instanceof PrintingProviderError) {
        return entity;
      }
      throw error;
    }
  }
}

/**
 * Generates the exact URL-safe provider reference selected by the accepted plan.
 *
 * @returns Twelve cryptographically random uppercase-safe characters.
 */
function createReference(): string {
  return Array.from(
    { length: PRINT_REFERENCE_LENGTH },
    () => PRINT_REFERENCE_ALPHABET[randomInt(PRINT_REFERENCE_ALPHABET.length)],
  ).join('');
}

/** @returns Stable conflict problem for an already reserved scan. */
function printRequestConflict(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.PRINT_REQUEST_CONFLICT,
    detail: 'This scan already has a non-terminal print request.',
    status: HttpStatus.CONFLICT,
    title: 'Print request conflict',
  });
}

/** @returns Stable capacity problem after definite provider rejection. */
function printingCapacityReached(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.PRINTING_CAPACITY_REACHED,
    detail: 'The printing center has reached its current capacity.',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    title: 'Printing capacity reached',
  });
}

/** @returns Stable provider-neutral problem for definite integration failures. */
function printingUnavailable(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.PRINTING_UNAVAILABLE,
    detail: 'The printing center is temporarily unavailable.',
    status: HttpStatus.SERVICE_UNAVAILABLE,
    title: 'Printing unavailable',
  });
}

/** @returns Stable internal problem after a logged local consistency failure. */
function internalError(): ProblemDetailsException {
  return new ProblemDetailsException({
    code: ProblemCode.INTERNAL_ERROR,
    detail: 'The request could not be completed.',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    title: 'Internal server error',
  });
}
