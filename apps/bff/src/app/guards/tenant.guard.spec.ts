import { MetadataKey } from '@common/constants/common.constant';
import { TenantGuard } from '@common/guards/tenant.guard';
import { BusinessException } from '@common/error-messages/business.exception';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('TenantGuard', () => {
  const makeGuard = (cacheManager: { get: jest.Mock; set?: jest.Mock }, skipBffSessionGuard = false) =>
    new (TenantGuard as any)(cacheManager, {
      getAllAndOverride: jest.fn().mockReturnValue(skipBffSessionGuard),
    });

  const getContext = (request: Record<string, unknown>) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  it('passes excluded path without tenant', async () => {
    const guard = makeGuard({ get: jest.fn(), set: jest.fn() });

    await expect(
      guard.canActivate(
        getContext({
          path: '/authorizer/login',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('throws when tenant claim mismatches request tenant', async () => {
    const guard = makeGuard({ get: jest.fn(), set: jest.fn() });

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
    const guard = makeGuard(cacheManager as any);

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
    const guard = makeGuard({ get: jest.fn(), set: jest.fn() });

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

  it('does not validate Order session ids against BFF cache when route skips BFF session guard', async () => {
    const cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };
    const guard = makeGuard(cacheManager, true);

    await expect(
      guard.canActivate(
        getContext({
          path: '/customer/cart',
          [MetadataKey.TENANT_ID]: 'tenant-a',
          [MetadataKey.SESSION_ID]: 'order-session-uuid',
        }),
      ),
    ).resolves.toBe(true);

    expect(cacheManager.get).not.toHaveBeenCalled();
  });
});
