import { ErrorCode } from '@common/error-messages/error-code.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { of, throwError } from 'rxjs';
import { TenantUserService } from './tenant-user.service';

describe('TenantUserService', () => {
  const userRepository = {
    upsertTenantUserByUserId: jest.fn(),
    disableUsersByTenantId: jest.fn(),
    countByTenantId: jest.fn(),
  };
  const saasClient = {
    send: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('upserts owner profile with tenantId', async () => {
    userRepository.upsertTenantUserByUserId.mockResolvedValue({ userId: 'owner-1', tenantId: 'tenant-1' });
    const service = new TenantUserService(userRepository as never, saasClient as never);

    await service.upsertOwnerProfile({
      userId: 'owner-1',
      tenantId: 'tenant-1',
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'One',
      roleNames: ['OWNER'],
    });

    expect(userRepository.upsertTenantUserByUserId).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'owner-1', tenantId: 'tenant-1', roleNames: ['OWNER'] }),
    );
    expect(saasClient.send).not.toHaveBeenCalled();
    expect(userRepository.countByTenantId).not.toHaveBeenCalled();
  });

  it('counts active tenant users by default', async () => {
    userRepository.countByTenantId.mockResolvedValue(2);
    const service = new TenantUserService(userRepository as never, saasClient as never);

    await expect(service.countTenantUsers({ tenantId: 'tenant-1' })).resolves.toEqual({
      tenantId: 'tenant-1',
      count: 2,
    });
    expect(userRepository.countByTenantId).toHaveBeenCalledWith({ tenantId: 'tenant-1', activeOnly: true });
  });

  it('disables users for a tenant only', async () => {
    userRepository.disableUsersByTenantId.mockResolvedValue({ modifiedCount: 3 });
    const service = new TenantUserService(userRepository as never, saasClient as never);

    await expect(service.disableTenantUsers({ tenantId: 'tenant-1', reason: 'closed' })).resolves.toEqual({
      tenantId: 'tenant-1',
      modifiedCount: 3,
    });
    expect(userRepository.disableUsersByTenantId).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', reason: 'closed' }),
    );
  });

  it('blocks non-owner tenant staff upsert when current subscription is unavailable', async () => {
    const service = new TenantUserService(userRepository as never, saasClient as never);

    saasClient.send.mockReturnValue(throwError(() => new Error('saas unavailable')));

    await expect(
      service.upsertOwnerProfile({
        userId: 'staff-1',
        tenantId: 'tenant-1',
        email: 'staff@example.com',
        firstName: 'Staff',
        lastName: 'One',
        roleNames: ['WAITER'],
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
    });

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
      expect.objectContaining({
        tenantId: 'tenant-1',
        data: { tenantId: 'tenant-1' },
      }),
    );
    expect(userRepository.upsertTenantUserByUserId).not.toHaveBeenCalled();
  });

  it('blocks non-owner tenant staff upsert at max_staff limit with details', async () => {
    const service = new TenantUserService(userRepository as never, saasClient as never);

    saasClient.send.mockReturnValue(
      of({
        data: {
          current: {
            status: 'ACTIVE',
            maxStaff: 1,
          },
        },
      }),
    );
    userRepository.countByTenantId.mockResolvedValue(1);

    await expect(
      service.upsertOwnerProfile({
        userId: 'staff-1',
        tenantId: 'tenant-1',
        email: 'staff@example.com',
        firstName: 'Staff',
        lastName: 'One',
        roleNames: ['WAITER'],
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
      response: expect.objectContaining({
        details: {
          limitType: 'max_staff',
          limit: 1,
          current: 1,
          upgradeUrl: '/dashboard/subscription',
        },
      }),
    });

    expect(userRepository.countByTenantId).toHaveBeenCalledWith({ tenantId: 'tenant-1', activeOnly: true });
    expect(userRepository.upsertTenantUserByUserId).not.toHaveBeenCalled();
  });
});
