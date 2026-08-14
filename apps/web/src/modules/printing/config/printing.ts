import type { PrintRequestStatus } from '@/shared/api/generated/models/printRequestStatus';

/** Number of print requests requested for each server page. */
export const PRINT_REQUEST_PAGE_SIZE = 10;

/** Identifies lifecycle values that still require safe GET reconciliation. */
export function isActivePrintRequestStatus(
  status: PrintRequestStatus,
): boolean {
  return (
    status === 'confirmation_pending' ||
    status === 'queued' ||
    status === 'in_progress'
  );
}
