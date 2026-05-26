import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { KeycloakAdminService } from './keycloak-admin.service';

describe('KeycloakAdminService', () => {
  const keycloakHttp = {
    exchangeClientToken: jest.fn(),
    createUserWithToken: jest.fn(),
    getRealmRole: jest.fn(),
    assignRealmRoles: jest.fn(),
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

  it('disables a user for compensation', async () => {
    const service = new KeycloakAdminService(keycloakHttp as never);

    await expect(service.disableUser({ userId: 'owner-1', reason: 'onboarding failed' })).resolves.toEqual({
      userId: 'owner-1',
      enabled: false,
    });
    expect(keycloakHttp.updateUser).toHaveBeenCalledWith(
      'client-token',
      'owner-1',
      expect.objectContaining({
        enabled: false,
        attributes: { disabled_reason: ['onboarding failed'] },
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
