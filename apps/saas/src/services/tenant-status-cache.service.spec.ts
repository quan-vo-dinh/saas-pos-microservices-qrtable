import { SubscriptionCacheService } from './subscription-cache.service';
import { TenantStatusCacheService } from './tenant-status-cache.service';

describe('TenantStatusCacheService', () => {
  const redis = {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('marks tenant suspended in Redis', async () => {
    const service = new TenantStatusCacheService(redis as never);

    await service.markSuspended('tenant-1');

    expect(redis.set).toHaveBeenCalledWith('tenant:tenant-1:suspended', '1');
  });

  it('clears tenant suspended flag', async () => {
    const service = new TenantStatusCacheService(redis as never);

    await service.clearSuspended('tenant-1');

    expect(redis.del).toHaveBeenCalledWith('tenant:tenant-1:suspended');
  });
});

describe('SubscriptionCacheService', () => {
  const redis = {
    set: jest.fn(),
    del: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('stores current subscription quota summary with 5 minute TTL', async () => {
    const service = new SubscriptionCacheService(redis as never);

    await service.setCurrent('tenant-1', {
      tenantId: 'tenant-1',
      planCode: 'FREE',
      status: 'ACTIVE',
      maxTables: 10,
      maxStaff: 5,
      maxOrdersPerDay: 100,
      features: ['basic_pos'],
      expiresAt: null,
    });

    expect(redis.set).toHaveBeenCalledWith(
      'subscription:tenant-1',
      expect.stringContaining('"planCode":"FREE"'),
      'EX',
      300,
    );
  });
});
