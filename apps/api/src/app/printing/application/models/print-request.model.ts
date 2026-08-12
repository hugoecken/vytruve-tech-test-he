import type { Page } from '@api/pagination/page';

/** Canonical lifecycle values exposed by the public printing contract. */
export const PrintRequestStatus = {
  COMPLETED: 'completed',
  CONFIRMATION_PENDING: 'confirmation_pending',
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress',
  QUEUED: 'queued',
} as const;

/** Union of canonical print-request lifecycle values. */
export type PrintRequestStatus =
  (typeof PrintRequestStatus)[keyof typeof PrintRequestStatus];

/** Persistence-independent state for one local printing attempt. */
export interface PrintRequestModel {
  activeSlot: true | null;
  createdAt: Date;
  id: string;
  lastObservedAt: Date | null;
  providerId: string | null;
  reference: string;
  scanId: string;
  scheduledEndAt: Date | null;
  scheduledStartAt: Date | null;
  status: PrintRequestStatus;
}

/** Public-safe application projection including read-time estimated progress. */
export interface PrintRequestViewModel {
  createdAt: Date;
  estimatedProgress: number | null;
  id: string;
  lastObservedAt: Date | null;
  reference: string;
  scanId: string;
  scheduledEndAt: Date | null;
  scheduledStartAt: Date | null;
  status: PrintRequestStatus;
}

/** Session-derived identifiers required to create one printing attempt. */
export interface CreatePrintRequestCommand {
  accountId: string;
  patientId: string;
  scanId: string;
}

/** Server-paginated printing history for one owned patient. */
export type PrintRequestPageModel = Page<PrintRequestViewModel>;

/** Validated provider observation with no provider-specific status values. */
export interface PrintJobObservationModel {
  outcome: 'completed' | 'failed' | 'pending';
  providerId: string;
  scheduledEndAt: Date;
  scheduledStartAt: Date;
}

/**
 * Advances one non-terminal request from a validated provider observation.
 *
 * @param request Last safely persisted request state.
 * @param observation Runtime-validated provider observation.
 * @param observedAt UTC instant when the provider response was accepted.
 * @returns Updated lifecycle state without permitting a backward transition.
 */
export function applyPrintJobObservation(
  request: PrintRequestModel,
  observation: PrintJobObservationModel,
  observedAt: Date,
): PrintRequestModel {
  const observedStatus = resolveObservedStatus(observation, observedAt);
  const status =
    request.status === PrintRequestStatus.IN_PROGRESS &&
    observedStatus === PrintRequestStatus.QUEUED
      ? PrintRequestStatus.IN_PROGRESS
      : observedStatus;
  return {
    ...request,
    activeSlot:
      status === PrintRequestStatus.COMPLETED ||
      status === PrintRequestStatus.FAILED
        ? null
        : true,
    lastObservedAt: observedAt,
    providerId: observation.providerId,
    scheduledEndAt: observation.scheduledEndAt,
    scheduledStartAt: observation.scheduledStartAt,
    status,
  };
}

/**
 * Resolves the canonical state represented by one validated provider observation.
 *
 * @param observation Provider-neutral outcome and production schedule.
 * @param observedAt UTC instant used to distinguish queued from active work.
 * @returns Canonical lifecycle state.
 */
function resolveObservedStatus(
  observation: PrintJobObservationModel,
  observedAt: Date,
): PrintRequestStatus {
  switch (observation.outcome) {
    case 'completed':
      return PrintRequestStatus.COMPLETED;
    case 'failed':
      return PrintRequestStatus.FAILED;
    case 'pending':
      return observedAt.getTime() < observation.scheduledStartAt.getTime()
        ? PrintRequestStatus.QUEUED
        : PrintRequestStatus.IN_PROGRESS;
  }
}
