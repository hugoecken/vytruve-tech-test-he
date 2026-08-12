import {
  applyPrintJobObservation,
  PrintRequestStatus,
  type PrintJobObservationModel,
  type PrintRequestModel,
} from './print-request.model';

const START = new Date('2026-08-12T10:00:00.000Z');
const END = new Date('2026-08-12T10:10:00.000Z');
const PROVIDER_ID = '00000000-0000-4000-8000-000000000010';

describe(applyPrintJobObservation.name, () => {
  it('keeps pending work queued before the scheduled start', () => {
    const result = applyPrintJobObservation(
      createRequest(PrintRequestStatus.CONFIRMATION_PENDING),
      createObservation('pending'),
      new Date('2026-08-12T09:59:00.000Z'),
    );

    expect(result.status).toBe(PrintRequestStatus.QUEUED);
    expect(result.activeSlot).toBe(true);
  });

  it('marks pending work in progress from its scheduled start', () => {
    const result = applyPrintJobObservation(
      createRequest(PrintRequestStatus.QUEUED),
      createObservation('pending'),
      START,
    );

    expect(result.status).toBe(PrintRequestStatus.IN_PROGRESS);
  });

  it('does not move in-progress work back to queued', () => {
    const result = applyPrintJobObservation(
      createRequest(PrintRequestStatus.IN_PROGRESS),
      createObservation('pending'),
      new Date('2026-08-12T09:59:00.000Z'),
    );

    expect(result.status).toBe(PrintRequestStatus.IN_PROGRESS);
  });

  it.each([
    ['completed', PrintRequestStatus.COMPLETED],
    ['failed', PrintRequestStatus.FAILED],
  ] as const)(
    'releases the active slot after a %s observation',
    (outcome, status) => {
      const result = applyPrintJobObservation(
        createRequest(PrintRequestStatus.IN_PROGRESS),
        createObservation(outcome),
        END,
      );

      expect(result.status).toBe(status);
      expect(result.activeSlot).toBeNull();
    },
  );
});

/** Builds one complete request state for lifecycle transitions. */
function createRequest(status: PrintRequestStatus): PrintRequestModel {
  return {
    activeSlot: true,
    createdAt: new Date('2026-08-12T09:55:00.000Z'),
    id: '00000000-0000-4000-8000-000000000001',
    lastObservedAt: null,
    providerId: null,
    reference: 'ABCDEFGH2345',
    scanId: '00000000-0000-4000-8000-000000000002',
    scheduledEndAt: null,
    scheduledStartAt: null,
    status,
  };
}

/** Builds one provider-neutral observation for the selected outcome. */
function createObservation(
  outcome: PrintJobObservationModel['outcome'],
): PrintJobObservationModel {
  return {
    outcome,
    providerId: PROVIDER_ID,
    scheduledEndAt: END,
    scheduledStartAt: START,
  };
}
