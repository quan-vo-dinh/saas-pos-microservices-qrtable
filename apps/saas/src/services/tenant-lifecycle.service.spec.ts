import { TenantStatus } from '@common/constants/saas.constants';
import { TenantLifecycleService } from './tenant-lifecycle.service';

describe('TenantLifecycleService', () => {
  const tenantRepo = {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };
  const redis = {
    markSuspended: jest.fn(),
    clearSuspended: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('suspends tenant and sets redis flag', async () => {
    tenantRepo.findById.mockResolvedValue({ id: 'tenant-1', status: TenantStatus.ACTIVE });
    const service = new TenantLifecycleService(tenantRepo as never, redis as never);

    await service.suspend({ tenantId: 'tenant-1', reason: 'subscription expired' });

    expect(tenantRepo.updateStatus).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ status: TenantStatus.SUSPENDED }),
    );
    expect(redis.markSuspended).toHaveBeenCalledWith('tenant-1');
  });

  it('activates tenant and clears redis flag', async () => {
    tenantRepo.findById.mockResolvedValue({ id: 'tenant-1', status: TenantStatus.SUSPENDED });
    const service = new TenantLifecycleService(tenantRepo as never, redis as never);

    await service.activate({ tenantId: 'tenant-1' });

    expect(redis.clearSuspended).toHaveBeenCalledWith('tenant-1');
  });
});
