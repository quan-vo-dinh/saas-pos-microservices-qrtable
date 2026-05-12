import { SubscriptionStatus } from '@common/constants/saas.constants';
import { SubscriptionService } from './subscription.service';

describe('SubscriptionService', () => {
  const planRepo = {
    findActiveByCode: jest.fn(),
  };
  const subRepo = {
    findActiveByTenantId: jest.fn(),
    supersedeActive: jest.fn(),
    createActive: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('assigns a new active subscription and supersedes the previous one', async () => {
    planRepo.findActiveByCode.mockResolvedValue({ id: 'plan-premium', code: 'PREMIUM', priceVnd: 999000 });
    subRepo.findActiveByTenantId.mockResolvedValue({ id: 'sub-old', status: SubscriptionStatus.ACTIVE });
    subRepo.createActive.mockResolvedValue({ id: 'sub-new', planCodeSnapshot: 'PREMIUM' });

    const service = new SubscriptionService(planRepo as never, subRepo as never);
    const result = await service.assignPlan({
      tenantId: 'tenant-1',
      planCode: 'PREMIUM',
      source: 'ADMIN_MANUAL',
      startsAt: new Date('2026-05-12T00:00:00Z'),
      expiresAt: new Date('2026-06-12T00:00:00Z'),
    });

    expect(subRepo.supersedeActive).toHaveBeenCalledWith('tenant-1', 'sub-old');
    expect(result.id).toBe('sub-new');
  });
});
