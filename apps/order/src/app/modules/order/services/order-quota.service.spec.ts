import { OrderQuotaService } from './order-quota.service';

describe('OrderQuotaService', () => {
  const redis = {
    incr: jest.fn(),
    decr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('builds daily key using Asia/Ho_Chi_Minh date', () => {
    const service = new OrderQuotaService(redis as never);

    expect(service.buildDailyOrderKey('tenant-1', new Date('2026-05-11T18:30:00.000Z'))).toBe(
      'quota:tenant-1:orders:2026-05-12',
    );
  });

  it('sets 48h TTL on first increment', async () => {
    redis.incr.mockResolvedValue(1);
    const service = new OrderQuotaService(redis as never);

    await expect(service.incrementDailyOrders('tenant-1', new Date('2026-05-12T00:00:00Z'))).resolves.toBe(1);
    expect(redis.expire).toHaveBeenCalledWith('quota:tenant-1:orders:2026-05-12', 60 * 60 * 48);
  });

  it('returns zero when counter key is missing', async () => {
    redis.get.mockResolvedValue(null);
    const service = new OrderQuotaService(redis as never);

    await expect(service.getDailyOrders('tenant-1', new Date('2026-05-12T00:00:00Z'))).resolves.toBe(0);
  });

  it('decrements daily count for released quota reservations', async () => {
    redis.decr.mockResolvedValue(0);
    const service = new OrderQuotaService(redis as never);

    await expect(service.decrementDailyOrders('tenant-1', new Date('2026-05-12T00:00:00Z'))).resolves.toBe(0);
    expect(redis.decr).toHaveBeenCalledWith('quota:tenant-1:orders:2026-05-12');
  });
});
