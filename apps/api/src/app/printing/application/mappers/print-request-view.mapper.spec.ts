import {
  PrintRequestStatus,
  type PrintRequestModel,
} from '../models/print-request.model';
import { PrintRequestViewMapper } from './print-request-view.mapper';

const START = new Date('2026-08-12T10:00:00.000Z');
const END = new Date('2026-08-12T10:10:00.000Z');

describe(PrintRequestViewMapper.name, () => {
  const mapper = new PrintRequestViewMapper();

  it.each([
    [PrintRequestStatus.CONFIRMATION_PENDING, null],
    [PrintRequestStatus.FAILED, null],
    [PrintRequestStatus.QUEUED, 0],
    [PrintRequestStatus.COMPLETED, 100],
  ] as const)('returns %p progress for %s', (status, expected) => {
    expect(mapper.toView(createRequest(status), START).estimatedProgress).toBe(
      expected,
    );
  });

  it('calculates elapsed in-progress time without exceeding 99 percent', () => {
    const halfway = mapper.toView(
      createRequest(PrintRequestStatus.IN_PROGRESS),
      new Date('2026-08-12T10:05:00.000Z'),
    );
    const overdue = mapper.toView(
      createRequest(PrintRequestStatus.IN_PROGRESS),
      new Date('2026-08-12T10:20:00.000Z'),
    );

    expect(halfway.estimatedProgress).toBe(50);
    expect(overdue.estimatedProgress).toBe(99);
  });

  it('returns zero when an active schedule cannot support an estimate', () => {
    const request = createRequest(PrintRequestStatus.IN_PROGRESS);
    request.scheduledEndAt = START;

    expect(mapper.toView(request, START).estimatedProgress).toBe(0);
  });
});

/** Builds one complete request for progress projection. */
function createRequest(status: PrintRequestStatus): PrintRequestModel {
  return {
    activeSlot:
      status === PrintRequestStatus.COMPLETED ||
      status === PrintRequestStatus.FAILED
        ? null
        : true,
    createdAt: new Date('2026-08-12T09:55:00.000Z'),
    id: '00000000-0000-4000-8000-000000000001',
    lastObservedAt: START,
    providerId: '00000000-0000-4000-8000-000000000010',
    reference: 'ABCDEFGH2345',
    scanId: '00000000-0000-4000-8000-000000000002',
    scheduledEndAt: END,
    scheduledStartAt: START,
    status,
  };
}
