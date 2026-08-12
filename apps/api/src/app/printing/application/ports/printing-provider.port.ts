import type { PrintJobObservationModel } from '../models/print-request.model';

/** Injection token for the application-owned printing-center boundary. */
export const PRINTING_PROVIDER = Symbol('PRINTING_PROVIDER');

/** Safe provider failure categories used by printing orchestration. */
export type PrintingProviderFailureKind =
  | 'ambiguous_submission'
  | 'authentication_failed'
  | 'capacity_reached'
  | 'invalid_response'
  | 'not_found'
  | 'unavailable';

/** Provider-neutral integration failure that never carries response bodies. */
export class PrintingProviderError extends Error {
  /**
   * Creates one safe provider failure category.
   *
   * @param kind Stable internal category used for orchestration and logging.
   */
  constructor(readonly kind: PrintingProviderFailureKind) {
    super('Printing provider operation failed.');
    this.name = PrintingProviderError.name;
  }
}

/** Non-idempotent submission and scoped reconciliation operations. */
export interface PrintingProviderPort {
  /**
   * Submits one owner-authorized scan exactly once.
   *
   * @param content Bounded PLY bytes without original filename metadata.
   * @param reference Persisted application reference used for reconciliation.
   * @returns Runtime-validated provider observation.
   */
  submit(content: Buffer, reference: string): Promise<PrintJobObservationModel>;

  /**
   * Resolves the provider identifier for one exact application reference.
   *
   * @param reference Persisted reference from the original submission.
   * @returns Provider identifier or null when the reference is not yet known.
   */
  findIdByReference(reference: string): Promise<string | null>;

  /**
   * Reads one known provider job without using a provider-wide collection.
   *
   * @param providerId Previously validated provider identifier.
   * @returns Runtime-validated provider observation.
   */
  getById(providerId: string): Promise<PrintJobObservationModel>;
}
