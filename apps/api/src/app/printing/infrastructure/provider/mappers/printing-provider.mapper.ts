import { Injectable } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { PrintJobObservationModel } from '../../../application/models/print-request.model';

/** Maps the provider multipart contract and validates every untrusted response. */
@Injectable()
export class PrintingProviderMapper {
  /**
   * Builds the provider multipart body without retaining client file metadata.
   *
   * @param content Owner-authorized bounded PLY bytes.
   * @param reference Persisted reconciliation reference.
   * @returns Provider-specific multipart form with a synthetic filename.
   */
  toSubmissionForm(content: Buffer, reference: string): FormData {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(content)]), 'scan.ply');
    form.append('socketReference', reference);
    return form;
  }

  /**
   * Validates an identifier returned by the provider as plain text.
   *
   * @param value Untrusted provider response value.
   * @returns Validated UUID identifier.
   * @throws When the response is not an exact UUID string.
   */
  toProviderId(value: unknown): string {
    if (typeof value !== 'string' || !isUUID(value)) {
      throw new Error('Invalid provider identifier');
    }
    return value;
  }

  /**
   * Validates identity, dates, chronology, and state before provider-neutral mapping.
   *
   * @param value Untrusted parsed provider response body.
   * @returns Validated provider observation with no raw provider values.
   * @throws When any required field violates the supplied provider contract.
   */
  toObservation(value: unknown): PrintJobObservationModel {
    if (typeof value !== 'object' || value === null) {
      throw new Error('Invalid provider response');
    }
    const candidate = value as Record<string, unknown>;
    const providerId = this.toProviderId(candidate['id']);
    const scheduledStartAt = this.toDate(candidate['startDate']);
    const scheduledEndAt = this.toDate(candidate['endDate']);
    if (scheduledEndAt.getTime() <= scheduledStartAt.getTime()) {
      throw new Error('Invalid provider schedule');
    }

    const status = candidate['status'];
    if (status !== null && status !== 'success' && status !== 'failed') {
      throw new Error('Invalid provider status');
    }
    let outcome: PrintJobObservationModel['outcome'];
    switch (status) {
      case null:
        outcome = 'pending';
        break;
      case 'success':
        outcome = 'completed';
        break;
      case 'failed':
        outcome = 'failed';
        break;
    }
    return {
      outcome,
      providerId,
      scheduledEndAt,
      scheduledStartAt,
    };
  }

  /**
   * Parses only timezone-qualified timestamps into absolute UTC instants.
   *
   * @param value Untrusted provider timestamp value.
   * @returns Valid absolute timestamp.
   * @throws When the value lacks timezone information or cannot be parsed.
   */
  private toDate(value: unknown): Date {
    if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
      throw new Error('Invalid provider timestamp');
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid provider timestamp');
    }
    return date;
  }
}
