import { ErrorCode } from '@common/error-messages/error-code.enum';
import { OnboardingSagaService } from './onboarding-saga.service';

describe('OnboardingSagaService', () => {
  const tenantRepo = { create: jest.fn(), deleteById: jest.fn() };
  const subscriptionService = { assignPlan: jest.fn() };
  const paymentClient = { send: jest.fn() };
  const authorizerClient = { send: jest.fn() };
  const userClient = { send: jest.fn() };
  const outbox = { createTenantCreated: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  it('creates tenant, owner, selected subscription, empty payment settings, and outbox event', async () => {
    tenantRepo.create.mockResolvedValue({ id: 'tenant-1', slug: 'pho-ha-noi', name: 'Pho Ha Noi' });
    authorizerClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: { userId: 'kc-owner-1' } }) });
    userClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: { userId: 'kc-owner-1' } }) });
    paymentClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: { tenantId: 'tenant-1' } }) });
    subscriptionService.assignPlan.mockResolvedValue({ id: 'sub-1' });

    const service = new OnboardingSagaService(
      tenantRepo as never,
      subscriptionService as never,
      authorizerClient as never,
      userClient as never,
      paymentClient as never,
      outbox as never,
    );

    const result = await service.onboard({
      tenantName: 'Pho Ha Noi',
      slug: 'pho-ha-noi',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'Password123!',
      ownerFirstName: 'Owner',
      ownerLastName: 'One',
      planCode: 'STARTER',
      processId: 'p1',
    });

    expect(result.tenant.id).toBe('tenant-1');
    expect(subscriptionService.assignPlan).toHaveBeenCalledWith(expect.objectContaining({ planCode: 'STARTER' }));
    expect(outbox.createTenantCreated).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
  });

  it('rolls back tenant when Keycloak owner creation fails', async () => {
    tenantRepo.create.mockResolvedValue({ id: 'tenant-1', slug: 'pho-ha-noi', name: 'Pho Ha Noi' });
    authorizerClient.send.mockReturnValue({ toPromise: () => Promise.reject(new Error('kc failed')) });

    const service = new OnboardingSagaService(
      tenantRepo as never,
      subscriptionService as never,
      authorizerClient as never,
      userClient as never,
      paymentClient as never,
      outbox as never,
    );

    await expect(
      service.onboard({
        tenantName: 'Pho Ha Noi',
        ownerEmail: 'owner@example.com',
        ownerPassword: 'Password123!',
        planCode: 'STARTER',
        processId: 'p1',
      }),
    ).rejects.toThrow('kc failed');
    expect(tenantRepo.deleteById).toHaveBeenCalledWith('tenant-1');
  });

  it('requires an explicit initial plan before creating tenant side effects', async () => {
    const service = new OnboardingSagaService(
      tenantRepo as never,
      subscriptionService as never,
      authorizerClient as never,
      userClient as never,
      paymentClient as never,
      outbox as never,
    );

    await expect(
      service.onboard({
        tenantName: 'Pho Ha Noi',
        ownerEmail: 'owner@example.com',
        ownerPassword: 'Password123!',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.SAAS_PLAN_NOT_FOUND });

    expect(tenantRepo.create).not.toHaveBeenCalled();
    expect(authorizerClient.send).not.toHaveBeenCalled();
    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
  });
});
