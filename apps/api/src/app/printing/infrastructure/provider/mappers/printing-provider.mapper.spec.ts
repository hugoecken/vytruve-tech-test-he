import { PrintingProviderMapper } from './printing-provider.mapper';

const PROVIDER_ID = '00000000-0000-4000-8000-000000000010';

describe(PrintingProviderMapper.name, () => {
  const mapper = new PrintingProviderMapper();

  it('maps a valid provider response to a provider-neutral observation', () => {
    expect(
      mapper.toObservation({
        endDate: '2026-08-12T10:10:00.000Z',
        id: PROVIDER_ID,
        startDate: '2026-08-12T10:00:00.000Z',
        status: null,
      }),
    ).toEqual({
      outcome: 'pending',
      providerId: PROVIDER_ID,
      scheduledEndAt: new Date('2026-08-12T10:10:00.000Z'),
      scheduledStartAt: new Date('2026-08-12T10:00:00.000Z'),
    });
  });

  it.each([
    ['identifier', { id: 'not-a-uuid' }],
    ['status', { status: 'unknown' }],
    [
      'chronology',
      {
        endDate: '2026-08-12T09:59:00.000Z',
        startDate: '2026-08-12T10:00:00.000Z',
      },
    ],
    ['timezone', { startDate: '2026-08-12T10:00:00' }],
  ])('rejects an invalid provider %s', (_label, override) => {
    const response = {
      endDate: '2026-08-12T10:10:00.000Z',
      id: PROVIDER_ID,
      startDate: '2026-08-12T10:00:00.000Z',
      status: null,
      ...override,
    };

    expect(() => mapper.toObservation(response)).toThrow();
  });
});
