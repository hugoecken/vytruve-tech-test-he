import type { AccountSessionResponse } from '@/shared/api/generated/models/accountSessionResponse';
import type { PageInfoResponse } from '@/shared/api/generated/models/pageInfoResponse';
import type { PatientResponse } from '@/shared/api/generated/models/patientResponse';
import type { PrintRequestResponse } from '@/shared/api/generated/models/printRequestResponse';
import type { ProblemCode } from '@/shared/api/generated/models/problemCode';
import type { ProblemDetailsResponse } from '@/shared/api/generated/models/problemDetailsResponse';
import type { ScanResponse } from '@/shared/api/generated/models/scanResponse';
import { browserEnvironment } from '@/shared/config/browser-environment';

/** API origin used by the jsdom integration environment. */
export const API_URL = browserEnvironment.apiBaseUrl;

/** Synthetic authenticated account used by frontend integration tests. */
export const accountSession: AccountSessionResponse = {
  accountId: '11111111-1111-4111-8111-111111111111',
  email: 'clinician@example.test',
  expiresAt: '2099-01-01T12:00:00.000Z',
};

/** Synthetic patient record used by frontend integration tests. */
export const patient: PatientResponse = {
  age: 34,
  createdAt: '2026-08-10T08:30:00.000Z',
  firstName: 'Alex',
  id: '22222222-2222-4222-8222-222222222222',
  lastName: 'Martin',
};

/** Synthetic validated scan used by frontend integration tests. */
export const scan: ScanResponse = {
  createdAt: '2026-08-11T09:00:00.000Z',
  encoding: 'ascii',
  format: 'ply',
  id: '33333333-3333-4333-8333-333333333333',
  printingAvailable: true,
  sizeBytes: 2048,
};

/** Synthetic active print request used by frontend integration tests. */
export const printRequest: PrintRequestResponse = {
  createdAt: '2026-08-11T09:05:00.000Z',
  estimatedProgress: 40,
  id: '44444444-4444-4444-8444-444444444444',
  lastObservedAt: '2026-08-11T09:06:00.000Z',
  reference: 'VRV123456789',
  scanId: scan.id,
  scheduledEndAt: '2026-08-11T10:00:00.000Z',
  scheduledStartAt: '2026-08-11T09:15:00.000Z',
  status: 'in_progress',
};

/** Creates pagination metadata for one synthetic response page. */
export function pageInfo(page = 0, hasNext = false): PageInfoResponse {
  return { hasNext, page, pageSize: 10 };
}

/** Creates a safe RFC 9457 response without backend implementation details. */
export function problem(
  code: ProblemCode,
  status: number,
  violations?: ProblemDetailsResponse['violations'],
): ProblemDetailsResponse {
  return {
    code,
    detail: 'The request could not be completed.',
    instance: '/api/test',
    status,
    title: 'Request failed',
    type: 'about:blank',
    violations,
  };
}
