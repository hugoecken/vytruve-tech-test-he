import { Injectable } from '@nestjs/common';
import {
  PrintRequestStatus,
  type PrintRequestModel,
} from '../../../application/models/print-request.model';
import { PrintRequestEntity } from '../print-request.entity';

/** Maps print-request state across the application and TypeORM boundary. */
@Injectable()
export class PrintRequestPersistenceMapper {
  /**
   * Builds the durable reservation required before non-idempotent submission.
   *
   * @param scanId Owner-authorized scan identifier.
   * @param reference Unique application reconciliation reference.
   * @returns New confirmation-pending entity with its active slot reserved.
   */
  toPendingEntity(scanId: string, reference: string): PrintRequestEntity {
    const entity = new PrintRequestEntity();
    entity.activeSlot = true;
    entity.lastObservedAt = null;
    entity.providerId = null;
    entity.reference = reference;
    entity.scanId = scanId;
    entity.scheduledEndAt = null;
    entity.scheduledStartAt = null;
    entity.status = PrintRequestStatus.CONFIRMATION_PENDING;
    return entity;
  }

  /**
   * Projects one stored request without provider-only persistence mechanics.
   *
   * @param entity Last safely persisted print-request state.
   * @returns Framework-independent application model.
   */
  toModel(entity: PrintRequestEntity): PrintRequestModel {
    return {
      activeSlot: entity.activeSlot,
      createdAt: entity.createdAt,
      id: entity.id,
      lastObservedAt: entity.lastObservedAt,
      providerId: entity.providerId,
      reference: entity.reference,
      scanId: entity.scanId,
      scheduledEndAt: entity.scheduledEndAt,
      scheduledStartAt: entity.scheduledStartAt,
      status: entity.status,
    };
  }

  /**
   * Builds a separate updated entity so failed persistence keeps the prior model intact.
   *
   * @param current Entity holding immutable identity and relation context.
   * @param model Application state produced from a validated observation.
   * @returns Explicit entity update ready for TypeORM save.
   */
  toUpdatedEntity(
    current: PrintRequestEntity,
    model: PrintRequestModel,
  ): PrintRequestEntity {
    const entity = new PrintRequestEntity();
    entity.activeSlot = model.activeSlot;
    entity.createdAt = current.createdAt;
    entity.id = current.id;
    entity.lastObservedAt = model.lastObservedAt;
    entity.providerId = model.providerId;
    entity.reference = current.reference;
    entity.scanId = current.scanId;
    entity.scheduledEndAt = model.scheduledEndAt;
    entity.scheduledStartAt = model.scheduledStartAt;
    entity.status = model.status;
    entity.updatedAt = current.updatedAt;
    return entity;
  }
}
