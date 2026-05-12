import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { OnboardingSagaService } from './onboarding-saga.service';

describe('OnboardingSaga integration', () => {
  const tenantRepo = {
    create: jest.fn(),
    deleteById: jest.fn(),
    findBySlug: jest.fn(),
  };
  const subscriptionService = { assignPlan: jest.fn() };
  const paymentClient = { send: jest.fn() };
  const authorizerClient = { send: jest.fn() };
  const userClient = { send: jest.fn() };
  const outbox = { createTenantCreated: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    tenantRepo.findBySlug.mockResolvedValue(null);
    tenantRepo.create.mockResolvedValue({ id: 'tenant-1', slug: 'pho-ha-noi', name: 'Pho Ha Noi' });
    subscriptionService.assignPlan.mockResolvedValue({ id: 'sub-1' });
    paymentClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: { tenantId: 'tenant-1' } }) });
  });

  it('creates tenant, owner, profile, payment settings, subscription and tenant.created outbox', async () => {
    authorizerClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: { userId: 'owner-1' } }) });
    userClient.send.mockReturnValue({ toPromise: () => Promise.resolve({ data: { userId: 'owner-1' } }) });
    const service = new OnboardingSagaService(
      tenantRepo as never,
      subscriptionService as never,
      authorizerClient as never,
      userClient as never,
      paymentClient as never,
      outbox as never,
    );

    await service.onboard({
      tenantName: 'Phở Hà Nội',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'Password123!',
      ownerFirstName: 'Owner',
      ownerLastName: 'One',
      processId: 'p1',
    });

    expect(authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER,
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', tenantSlug: 'pho-ha-noi' }) }),
    );
    expect(userClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.USER.UPSERT_WITH_TENANT,
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', userId: 'owner-1' }) }),
    );
    expect(subscriptionService.assignPlan).toHaveBeenCalledWith(expect.objectContaining({ planCode: 'FREE' }));
    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY,
      expect.objectContaining({ tenantId: 'tenant-1' }),
    );
    expect(outbox.createTenantCreated).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-1' }));
  });

  it('disables Keycloak owner and avoids tenant.created when profile upsert fails', async () => {
    authorizerClient.send.mockImplementation((message: string) => {
      if (message === TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER) {
        return { toPromise: () => Promise.resolve({ data: { userId: 'owner-1' } }) };
      }
      return { toPromise: () => Promise.resolve({ data: { userId: 'owner-1', enabled: false } }) };
    });
    userClient.send.mockReturnValue({ toPromise: () => Promise.reject(new Error('mongo unavailable')) });
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
        tenantName: 'Phở Hà Nội',
        ownerEmail: 'owner@example.com',
        ownerPassword: 'Password123!',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.TENANT_ONBOARDING_FAILED });

    expect(authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.DISABLE_USER,
      expect.objectContaining({ data: expect.objectContaining({ userId: 'owner-1' }) }),
    );
    expect(tenantRepo.deleteById).toHaveBeenCalledWith('tenant-1');
    expect(outbox.createTenantCreated).not.toHaveBeenCalled();
  });
});
