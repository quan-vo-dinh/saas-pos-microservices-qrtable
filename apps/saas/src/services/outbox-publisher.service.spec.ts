import { SaasOutboxPublisherService } from './saas-outbox-publisher.service';

describe('OutboxPublisherService', () => {
  const outbox = {
    lockPending: jest.fn(),
    markPublishedById: jest.fn(),
    markAttemptFailed: jest.fn(),
  };
  const producer = {
    send: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('marks event published after Kafka send', async () => {
    outbox.lockPending.mockResolvedValue([
      {
        id: 'evt-1',
        topic: 'tenant.created',
        partitionKey: 'tenant-1',
        payload: { tenantId: 'tenant-1' },
      },
    ]);
    producer.send.mockResolvedValue(undefined);
    const service = new SaasOutboxPublisherService(outbox as never);
    (service as unknown as { producer: typeof producer }).producer = producer;

    await expect(service.publishPendingBatch()).resolves.toEqual({ published: 1, failed: 0 });
    expect(outbox.markPublishedById).toHaveBeenCalledWith('evt-1');
  });

  it('records publish failures for retry', async () => {
    const error = new Error('broker unavailable');
    outbox.lockPending.mockResolvedValue([
      {
        id: 'evt-1',
        topic: 'tenant.created',
        partitionKey: 'tenant-1',
        payload: { tenantId: 'tenant-1' },
      },
    ]);
    producer.send.mockRejectedValue(error);
    const service = new SaasOutboxPublisherService(outbox as never);
    (service as unknown as { producer: typeof producer }).producer = producer;

    await expect(service.publishPendingBatch()).resolves.toEqual({ published: 0, failed: 1 });
    expect(outbox.markAttemptFailed).toHaveBeenCalledWith('evt-1', error);
  });
});
