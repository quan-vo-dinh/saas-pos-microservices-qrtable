jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

jest.mock('../../../../configuration', () => ({
  CONFIGURATION: {
    REDIS_CONFIG: { HOST: '127.0.0.1', PORT: 6379 },
  },
}));

import { RealtimeEventsService } from '../services/realtime-events.service';
import { KdsInternalEventsSubscriber } from '../services/kds-internal-events.subscriber';

describe('KdsInternalEventsSubscriber', () => {
  it('parses Redis payload and emits KDS queue changed', () => {
    const emitKdsQueueChanged = jest.fn();
    const realtime = { emitKdsQueueChanged } as unknown as RealtimeEventsService;
    const sub = new KdsInternalEventsSubscriber(realtime);

    (sub as unknown as { onKdsMessage: (c: string, m: string) => void }).onKdsMessage(
      'realtime:kds:t1',
      JSON.stringify({
        eventId: 'e1',
        eventType: 'kds.queue_changed',
        schemaVersion: 1,
        tenantId: 't1',
        station: 'KITCHEN',
        revision: 3,
        reason: 'TICKET_CREATED',
        occurredAt: new Date().toISOString(),
      }),
    );

    expect(emitKdsQueueChanged).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', eventType: 'kds.queue_changed' }),
    );
  });
});
