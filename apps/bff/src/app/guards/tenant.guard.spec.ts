import { MetadataKey } from '@common/constants/common.constant';
import { TenantGuard } from '@common/guards/tenant.guard';
import { BusinessException } from '@common/error-messages/business.exception';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('TenantGuard', () => {
  const getContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  it('passes excluded path without tenant', async () => {
    const guard = new TenantGuard({ get: jest.fn(), set: jest.fn() } as any);

    await expect(
      guard.canActivate(
        getContext({
          path: '/authorizer/login',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('throws when tenant claim mismatches request tenant', async () => {
    const guard = new TenantGuard({ get: jest.fn(), set: jest.fn() } as any);

    await expect(
      guard.canActivate(
        getContext({
          path: '/catalog',
          [MetadataKey.TENANT_ID]: 'tenant-a',
          [MetadataKey.USER_DATA]: {
            metadata: {
              jwt: {
                tenant_id: 'tenant-b',
              },
            },
          },
        }),
      ),
    ).rejects.toThrow(BusinessException);
  });

  it('throws when session tenant mismatches request tenant', async () => {
    const cacheManager = {
      get: jest.fn().mockResolvedValue({
        tenantId: 'tenant-b',
        createdAt: Date.now(),
      }),
      set: jest.fn(),
    };
    const guard = new TenantGuard(cacheManager as any);

    await expect(
      guard.canActivate(
        getContext({
          path: '/catalog',
          [MetadataKey.TENANT_ID]: 'tenant-a',
          [MetadataKey.SESSION_ID]: 'sid-1',
        }),
      ),
    ).rejects.toThrow(BusinessException);
  });

  it('allows super admin without tenant context', async () => {
    const guard = new TenantGuard({ get: jest.fn(), set: jest.fn() } as any);

    await expect(
      guard.canActivate(
        getContext({
          path: '/catalog',
          [MetadataKey.USER_DATA]: {
            metadata: {
              jwt: {
                realm_access: {
                  roles: ['SUPER_ADMIN'],
                },
              },
            },
          },
        }),
      ),
    ).resolves.toBe(true);
  });
});
