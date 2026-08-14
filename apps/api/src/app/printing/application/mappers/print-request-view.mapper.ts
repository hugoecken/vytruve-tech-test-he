import { Injectable } from '@nestjs/common';
import type { Page } from '@api/pagination/page';
import {
  type PrintRequestPageModel,
  PrintRequestStatus,
  type PrintRequestModel,
  type PrintRequestViewModel,
} from '../models/print-request.model';

/** Maps persisted application state to its public-safe read projection. */
@Injectable()
export class PrintRequestViewMapper {
  /** Adds read-time presentation values to one application-model page. */
  toPage(
    page: Page<PrintRequestModel>,
    observedAt: Date,
  ): PrintRequestPageModel {
    return {
      ...page,
      items: page.items.map((request) => this.toView(request, observedAt)),
    };
  }

  /**
   * Adds the non-authoritative progress estimate selected by the product contract.
   *
   * @param request Last safely persisted request state.
   * @param observedAt UTC instant used only for estimated progress.
   * @returns Public-safe state with no provider identifier or active-slot detail.
   */
  toView(request: PrintRequestModel, observedAt: Date): PrintRequestViewModel {
    return {
      createdAt: request.createdAt,
      estimatedProgress: this.estimateProgress(request, observedAt),
      id: request.id,
      lastObservedAt: request.lastObservedAt,
      reference: request.reference,
      scanId: request.scanId,
      scheduledEndAt: request.scheduledEndAt,
      scheduledStartAt: request.scheduledStartAt,
      status: request.status,
    };
  }

  /**
   * Computes progress only for lifecycle states where a percentage is meaningful.
   *
   * @param request Last safely persisted request state and provider schedule.
   * @param observedAt UTC instant at which the representation is produced.
   * @returns Null or a bounded integer from zero through one hundred.
   */
  private estimateProgress(
    request: PrintRequestModel,
    observedAt: Date,
  ): number | null {
    switch (request.status) {
      case PrintRequestStatus.CONFIRMATION_PENDING:
      case PrintRequestStatus.FAILED:
        return null;
      case PrintRequestStatus.QUEUED:
        return 0;
      case PrintRequestStatus.COMPLETED:
        return 100;
      case PrintRequestStatus.IN_PROGRESS: {
        const start = request.scheduledStartAt?.getTime();
        const end = request.scheduledEndAt?.getTime();
        if (start === undefined || end === undefined || end <= start) {
          return 0;
        }
        const percentage = Math.floor(
          ((observedAt.getTime() - start) / (end - start)) * 100,
        );
        return Math.min(99, Math.max(0, percentage));
      }
    }
  }
}
