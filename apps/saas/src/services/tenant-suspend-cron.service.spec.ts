import { TenantSuspendCronService } from './tenant-suspend-cron.service';

describe('TenantSuspendCronService', () => {
  it('suspends tenants whose active subscription expired more than 24 hours ago', async () => {
    const subRepo = { findExpiredBeyondGrace: jest.fn().mockResolvedValue([{ tenantId: 'tenant-1' }]) };
    const lifecycle = { suspend: jest.fn() };
    const service = new TenantSuspendCronService(subRepo as never, lifecycle as never);

    await service.runOnce(new Date('2026-05-12T02:00:00+07:00'));

    expect(lifecycle.suspend).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      reason: 'subscription expired',
    });
  });
});
