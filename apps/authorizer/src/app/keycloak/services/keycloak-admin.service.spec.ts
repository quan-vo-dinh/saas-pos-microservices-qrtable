import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { KeycloakAdminService } from './keycloak-admin.service';

describe('KeycloakAdminService', () => {
  const keycloakHttp = {
    exchangeClientToken: jest.fn(),
    createUserWithToken: jest.fn(),
    getRealmRole: jest.fn(),
    assignRealmRoles: jest.fn(),
    getUserRealmRoles: jest.fn(),
    deleteRealmRoles: jest.fn(),
    updateUser: jest.fn(),
    getUserById: jest.fn(),
    isDuplicateUserError: jest.fn(),
    isForbiddenError: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    keycloakHttp.exchangeClientToken.mockResolvedValue({ access_token: 'client-token' });
  });

  it('creates tenant owner with tenant attributes and update-password action', async () => {
    keycloakHttp.createUserWithToken.mockResolvedValue({
      headers: { location: 'http://keycloak/admin/realms/qr/users/owner-1' },
    });
    keycloakHttp.getRealmRole.mockResolvedValue({ data: { id: 'role-owner', name: 'OWNER' } });

    const service = new KeycloakAdminService(keycloakHttp as never);
    const result = await service.createTenantOwner({
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'One',
      tenantId: 'tenant-1',
      tenantSlug: 'pho-ha-noi',
      roleNames: ['OWNER'],
      temporaryPassword: 'Password123!',
    });

    expect(result).toEqual({
      userId: 'owner-1',
      email: 'owner@example.com',
      enabled: true,
      requiredActions: ['UPDATE_PASSWORD'],
    });
    expect(keycloakHttp.createUserWithToken).toHaveBeenCalledWith(
      'client-token',
      expect.objectContaining({
        enabled: true,
        requiredActions: ['UPDATE_PASSWORD'],
        attributes: { tenant_id: ['tenant-1'], tenant_slug: ['pho-ha-noi'] },
      }),
    );
    expect(keycloakHttp.assignRealmRoles).toHaveBeenCalledWith('client-token', 'owner-1', [
      { id: 'role-owner', name: 'OWNER' },
    ]);
  });

  it('disables a user for compensation while preserving email and username', async () => {
    keycloakHttp.getUserById.mockResolvedValue({
      id: 'owner-1',
      email: 'owner@example.com',
      username: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'One',
      emailVerified: true,
      attributes: { tenant_id: ['tenant-1'] },
    });

    const service = new KeycloakAdminService(keycloakHttp as never);

    await expect(service.disableUser({ userId: 'owner-1', reason: 'onboarding failed' })).resolves.toEqual({
      userId: 'owner-1',
      enabled: false,
    });
    expect(keycloakHttp.getUserById).toHaveBeenCalledWith('client-token', 'owner-1');
    expect(keycloakHttp.updateUser).toHaveBeenCalledWith(
      'client-token',
      'owner-1',
      expect.objectContaining({
        enabled: false,
        email: 'owner@example.com',
        username: 'owner@example.com',
        attributes: {
          tenant_id: ['tenant-1'],
          disabled_reason: ['onboarding failed'],
        },
      }),
    );
  });

  it('maps duplicate owner email to stable error code', async () => {
    keycloakHttp.createUserWithToken.mockRejectedValue(new Error('duplicate'));
    keycloakHttp.isDuplicateUserError.mockReturnValue(true);

    const service = new KeycloakAdminService(keycloakHttp as never);
    await expect(
      service.createTenantOwner({
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'One',
        tenantId: 'tenant-1',
        tenantSlug: 'pho-ha-noi',
        roleNames: ['OWNER'],
      }),
    ).rejects.toMatchObject<Partial<BusinessException>>({ errorCode: ErrorCode.OWNER_EMAIL_ALREADY_EXISTS });
  });

  it('creates staff user with tenant attribute, temporary password, and realm role', async () => {
    keycloakHttp.createUserWithToken.mockResolvedValue({
      headers: { location: 'http://keycloak/admin/realms/qr/users/staff-1' },
    });
    keycloakHttp.getRealmRole.mockResolvedValue({ data: { id: 'role-waiter', name: 'WAITER' } });

    const service = new KeycloakAdminService(keycloakHttp as never);
    const result = await service.createStaffUser({
      email: 'waiter@example.com',
      firstName: 'Waiter',
      lastName: 'One',
      tenantId: 'tenant-1',
      roleNames: ['WAITER'],
      password: 'Password123!',
      requirePasswordUpdate: true,
    });

    expect(result).toEqual({
      userId: 'staff-1',
      email: 'waiter@example.com',
      enabled: true,
      requiredActions: ['UPDATE_PASSWORD'],
    });
    expect(keycloakHttp.createUserWithToken).toHaveBeenCalledWith(
      'client-token',
      expect.objectContaining({
        enabled: true,
        requiredActions: ['UPDATE_PASSWORD'],
        attributes: { tenant_id: ['tenant-1'] },
        credentials: [
          {
            type: 'password',
            value: 'Password123!',
            temporary: true,
          },
        ],
      }),
    );
    expect(keycloakHttp.assignRealmRoles).toHaveBeenCalledWith('client-token', 'staff-1', [
      { id: 'role-waiter', name: 'WAITER' },
    ]);
  });

  it('replaces managed realm roles for a user', async () => {
    keycloakHttp.getUserRealmRoles.mockResolvedValue([
      { id: 'role-waiter', name: 'WAITER' },
      { id: 'offline', name: 'offline_access' },
    ]);
    keycloakHttp.getRealmRole.mockResolvedValue({ data: { id: 'role-chef', name: 'CHEF' } });

    const service = new KeycloakAdminService(keycloakHttp as never);
    await service.replaceRealmRoles({
      userId: 'staff-1',
      managedRoleNames: ['MANAGER', 'WAITER', 'CHEF', 'BARISTA'],
      nextRoleNames: ['CHEF'],
    });

    expect(keycloakHttp.deleteRealmRoles).toHaveBeenCalledWith('client-token', 'staff-1', [
      { id: 'role-waiter', name: 'WAITER' },
    ]);
    expect(keycloakHttp.assignRealmRoles).toHaveBeenCalledWith('client-token', 'staff-1', [
      { id: 'role-chef', name: 'CHEF' },
    ]);
  });

  it('sets enabled status while preserving email, username, and existing attributes', async () => {
    keycloakHttp.getUserById.mockResolvedValue({
      id: 'staff-1',
      email: 'waiter@example.com',
      username: 'waiter@example.com',
      firstName: 'Waiter',
      lastName: 'One',
      emailVerified: true,
      attributes: { tenant_id: ['tenant-1'] },
    });

    const service = new KeycloakAdminService(keycloakHttp as never);
    await service.setUserEnabled({ userId: 'staff-1', enabled: false, reason: 'left restaurant' });

    expect(keycloakHttp.updateUser).toHaveBeenCalledWith(
      'client-token',
      'staff-1',
      expect.objectContaining({
        enabled: false,
        email: 'waiter@example.com',
        username: 'waiter@example.com',
        firstName: 'Waiter',
        lastName: 'One',
        emailVerified: true,
        attributes: {
          tenant_id: ['tenant-1'],
          disabled_reason: ['left restaurant'],
        },
      }),
    );
  });

  it('re-enables staff while preserving email and username on PUT', async () => {
    keycloakHttp.getUserById.mockResolvedValue({
      id: 'staff-1',
      email: 'waiter@example.com',
      username: 'waiter@example.com',
      firstName: 'Waiter',
      lastName: 'One',
      emailVerified: true,
      enabled: false,
      attributes: { tenant_id: ['tenant-1'], disabled_reason: ['left restaurant'] },
    });

    const service = new KeycloakAdminService(keycloakHttp as never);
    await service.setUserEnabled({ userId: 'staff-1', enabled: true, reason: 're-enabled' });

    expect(keycloakHttp.updateUser).toHaveBeenCalledWith(
      'client-token',
      'staff-1',
      expect.objectContaining({
        enabled: true,
        email: 'waiter@example.com',
        username: 'waiter@example.com',
        attributes: {
          tenant_id: ['tenant-1'],
          disabled_reason: ['re-enabled'],
        },
      }),
    );
  });

  it('disables staff user when realm role assignment fails after create', async () => {
    keycloakHttp.createUserWithToken.mockResolvedValue({
      headers: { location: 'http://keycloak/admin/realms/qr/users/staff-1' },
    });
    keycloakHttp.getRealmRole.mockResolvedValue({ data: { id: 'role-waiter', name: 'WAITER' } });
    keycloakHttp.assignRealmRoles.mockRejectedValue(new Error('role assign failed'));
    keycloakHttp.getUserById.mockResolvedValue({
      id: 'staff-1',
      email: 'waiter@example.com',
      username: 'waiter@example.com',
      firstName: 'Waiter',
      lastName: 'One',
      emailVerified: true,
      attributes: { tenant_id: ['tenant-1'] },
    });

    const service = new KeycloakAdminService(keycloakHttp as never);
    await expect(
      service.createStaffUser({
        email: 'waiter@example.com',
        firstName: 'Waiter',
        lastName: 'One',
        tenantId: 'tenant-1',
        roleNames: ['WAITER'],
        password: 'Password123!',
      }),
    ).rejects.toThrow('role assign failed');

    expect(keycloakHttp.updateUser).toHaveBeenCalledWith(
      'client-token',
      'staff-1',
      expect.objectContaining({
        enabled: false,
        email: 'waiter@example.com',
        username: 'waiter@example.com',
        attributes: {
          tenant_id: ['tenant-1'],
          disabled_reason: ['staff_role_assign_failed'],
        },
      }),
    );
  });

  it('restores managed realm roles when assign fails after delete', async () => {
    keycloakHttp.getUserRealmRoles.mockResolvedValue([{ id: 'role-waiter', name: 'WAITER' }]);
    keycloakHttp.getRealmRole.mockImplementation(async (_token: string, roleName: string) => {
      if (roleName === 'CHEF') return { data: { id: 'role-chef', name: 'CHEF' } };
      return { data: { id: 'role-waiter', name: 'WAITER' } };
    });
    keycloakHttp.assignRealmRoles
      .mockRejectedValueOnce(new Error('assign chef failed'))
      .mockResolvedValueOnce(undefined);

    const service = new KeycloakAdminService(keycloakHttp as never);
    await expect(
      service.replaceRealmRoles({
        userId: 'staff-1',
        managedRoleNames: ['MANAGER', 'WAITER', 'CHEF', 'BARISTA'],
        nextRoleNames: ['CHEF'],
      }),
    ).rejects.toThrow('assign chef failed');

    expect(keycloakHttp.assignRealmRoles).toHaveBeenLastCalledWith('client-token', 'staff-1', [
      { id: 'role-waiter', name: 'WAITER' },
    ]);
  });

  it('maps duplicate staff email to USER_ALREADY_EXISTS', async () => {
    keycloakHttp.createUserWithToken.mockRejectedValue(new Error('duplicate'));
    keycloakHttp.isDuplicateUserError.mockReturnValue(true);

    const service = new KeycloakAdminService(keycloakHttp as never);
    await expect(
      service.createStaffUser({
        email: 'waiter@example.com',
        firstName: 'Waiter',
        lastName: 'One',
        tenantId: 'tenant-1',
        roleNames: ['WAITER'],
        password: 'Password123!',
      }),
    ).rejects.toMatchObject<Partial<BusinessException>>({ errorCode: ErrorCode.USER_ALREADY_EXISTS });
  });

  it('maps Keycloak admin 403 to a stable permission error', async () => {
    keycloakHttp.createUserWithToken.mockRejectedValue(new Error('Request failed with status code 403'));
    keycloakHttp.isDuplicateUserError.mockReturnValue(false);
    keycloakHttp.isForbiddenError.mockReturnValue(true);

    const service = new KeycloakAdminService(keycloakHttp as never);
    await expect(
      service.createTenantOwner({
        email: 'owner@example.com',
        firstName: 'Owner',
        lastName: 'One',
        tenantId: 'tenant-1',
        tenantSlug: 'pho-ha-noi',
        roleNames: ['OWNER'],
      }),
    ).rejects.toMatchObject<Partial<BusinessException>>({ errorCode: ErrorCode.KEYCLOAK_ADMIN_PERMISSION_DENIED });
  });
});
