import { TenantUserService } from './tenant-user.service';

describe('TenantUserService', () => {
  const userRepository = {
    upsertTenantUserByUserId: jest.fn(),
    disableUsersByTenantId: jest.fn(),
    countByTenantId: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('upserts owner profile with tenantId', async () => {
    userRepository.upsertTenantUserByUserId.mockResolvedValue({ userId: 'owner-1', tenantId: 'tenant-1' });
    const service = new TenantUserService(userRepository as never);

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
  });

  it('counts active tenant users by default', async () => {
    userRepository.countByTenantId.mockResolvedValue(2);
    const service = new TenantUserService(userRepository as never);

    await expect(service.countTenantUsers({ tenantId: 'tenant-1' })).resolves.toEqual({
      tenantId: 'tenant-1',
      count: 2,
    });
    expect(userRepository.countByTenantId).toHaveBeenCalledWith({ tenantId: 'tenant-1', activeOnly: true });
  });

  it('disables users for a tenant only', async () => {
    userRepository.disableUsersByTenantId.mockResolvedValue({ modifiedCount: 3 });
    const service = new TenantUserService(userRepository as never);

    await expect(service.disableTenantUsers({ tenantId: 'tenant-1', reason: 'closed' })).resolves.toEqual({
      tenantId: 'tenant-1',
      modifiedCount: 3,
    });
    expect(userRepository.disableUsersByTenantId).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', reason: 'closed' }),
    );
  });
});
