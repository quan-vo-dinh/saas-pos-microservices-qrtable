import { ROLE } from '@common/constants/enum/role.enum';
import { UserRepository } from './user.repository';

describe('UserRepository.findOwnerByTenantId', () => {
  it('queries active tenant user with OWNER role', async () => {
    const ownerRoleId = 'role-owner-id';
    const roleModel = {
      findOne: jest.fn().mockReturnValue({ exec: () => Promise.resolve({ _id: ownerRoleId, name: ROLE.OWNER }) }),
    };
    const userModel = {
      findOne: jest.fn().mockReturnValue({
        populate: () => ({
          exec: () => Promise.resolve({ userId: 'u-1', email: 'o@t.com', tenantId: 'tenant-1' }),
        }),
      }),
    };

    const repo = new UserRepository(userModel as never, roleModel as never);
    const user = await repo.findOwnerByTenantId('tenant-1');

    expect(roleModel.findOne).toHaveBeenCalledWith({ name: ROLE.OWNER });
    expect(userModel.findOne).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      isActive: true,
      roles: ownerRoleId,
    });
    expect(user?.userId).toBe('u-1');
  });
});
