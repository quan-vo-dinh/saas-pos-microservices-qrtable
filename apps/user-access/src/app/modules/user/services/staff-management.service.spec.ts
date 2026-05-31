import { HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ObjectId } from 'mongodb';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ROLE } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { UserRepository } from '../repositories/user.repository';
import { StaffManagementService } from './staff-management.service';

const waiterRoleId = new ObjectId();
const managerRoleId = new ObjectId();
const chefRoleId = new ObjectId();

const waiterRole = { _id: waiterRoleId, name: ROLE.WAITER };
const managerRole = { _id: managerRoleId, name: ROLE.MANAGER };
const chefRole = { _id: chefRoleId, name: ROLE.CHEF };

const buildStaffUser = (overrides: Record<string, unknown> = {}) => ({
  userId: 'staff-1',
  tenantId: 'tenant-1',
  email: 'waiter@example.com',
  firstName: 'Waiter',
  lastName: 'One',
  isActive: true,
  disabledAt: null,
  roles: [waiterRole],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
});

describe('StaffManagementService', () => {
  const createService = () => {
    const userRepository = {
      exists: jest.fn(),
      findRoleByName: jest.fn(),
      findTenantStaffByUserId: jest.fn(),
      createStaffProfile: jest.fn(),
      listTenantStaff: jest.fn(),
      setTenantStaffRole: jest.fn(),
      setTenantStaffActiveStatus: jest.fn(),
      countByTenantId: jest.fn(),
    };

    const authorizerClient = {
      send: jest.fn(),
    };

    const saasClient = {
      send: jest.fn(),
    };

    const service = new StaffManagementService(
      userRepository as unknown as UserRepository,
      authorizerClient as unknown as TcpClient,
      saasClient as unknown as TcpClient,
    );

    return { service, userRepository, authorizerClient, saasClient };
  };

  const mockQuotaOk = (saasClient: { send: jest.Mock }) => {
    saasClient.send.mockReturnValue(
      of({
        data: {
          current: {
            status: 'ACTIVE',
            maxStaff: 10,
          },
        },
      }),
    );
    return saasClient;
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows owner to create manager and calls keycloak before creating profile', async () => {
    const { service, userRepository, authorizerClient, saasClient } = createService();
    mockQuotaOk(saasClient);

    userRepository.exists.mockResolvedValue(false);
    userRepository.countByTenantId.mockResolvedValue(1);
    userRepository.findRoleByName.mockResolvedValue(managerRole);
    authorizerClient.send.mockReturnValue(
      of({
        data: {
          userId: 'kc-manager-1',
          email: 'manager@example.com',
          enabled: true,
          requiredActions: ['UPDATE_PASSWORD'],
        },
      }),
    );
    userRepository.createStaffProfile.mockResolvedValue(
      buildStaffUser({
        userId: 'kc-manager-1',
        email: 'manager@example.com',
        firstName: 'Manager',
        lastName: 'One',
        roles: [managerRole],
      }),
    );

    const result = await service.createStaff({
      tenantId: 'tenant-1',
      requestedByUserId: 'owner-1',
      requestedByRoles: ['OWNER'],
      email: 'manager@example.com',
      firstName: 'Manager',
      lastName: 'One',
      roleName: ROLE.MANAGER,
      password: 'Password123!',
      processId: 'pid-1',
    });

    expect(result.userId).toBe('kc-manager-1');
    expect(result.roleName).toBe(ROLE.MANAGER);
    expect(authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_STAFF_USER,
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'manager@example.com',
          tenantId: 'tenant-1',
          roleNames: [ROLE.MANAGER],
        }),
        processId: 'pid-1',
      }),
    );
    expect(userRepository.createStaffProfile).toHaveBeenCalled();
    const keycloakOrder = authorizerClient.send.mock.invocationCallOrder[0];
    const mongoOrder = userRepository.createStaffProfile.mock.invocationCallOrder[0];
    expect(keycloakOrder).toBeLessThan(mongoOrder);
  });

  it('allows manager to create waiter but rejects manager creating manager', async () => {
    const { service, userRepository, authorizerClient, saasClient } = createService();
    mockQuotaOk(saasClient);
    userRepository.exists.mockResolvedValue(false);
    userRepository.countByTenantId.mockResolvedValue(1);
    userRepository.findRoleByName.mockResolvedValue(waiterRole);
    authorizerClient.send.mockReturnValue(
      of({
        data: {
          userId: 'kc-waiter-1',
          email: 'waiter@example.com',
          enabled: true,
          requiredActions: [],
        },
      }),
    );
    userRepository.createStaffProfile.mockResolvedValue(buildStaffUser());

    await expect(
      service.createStaff({
        tenantId: 'tenant-1',
        requestedByUserId: 'manager-1',
        requestedByRoles: ['MANAGER'],
        email: 'waiter@example.com',
        firstName: 'Waiter',
        lastName: 'One',
        roleName: ROLE.WAITER,
        password: 'Password123!',
      }),
    ).resolves.toMatchObject({ roleName: ROLE.WAITER });

    await expect(
      service.createStaff({
        tenantId: 'tenant-1',
        requestedByUserId: 'manager-1',
        requestedByRoles: ['MANAGER'],
        email: 'manager2@example.com',
        firstName: 'Manager',
        lastName: 'Two',
        roleName: ROLE.MANAGER,
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.AUTH_PERMISSION_DENIED,
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('enforces max_staff before keycloak mutation', async () => {
    const { service, userRepository, authorizerClient, saasClient } = createService();

    userRepository.exists.mockResolvedValue(false);
    userRepository.countByTenantId.mockResolvedValue(2);
    saasClient.send.mockReturnValue(
      of({
        data: {
          current: {
            status: 'ACTIVE',
            maxStaff: 2,
          },
        },
      }),
    );

    await expect(
      service.createStaff({
        tenantId: 'tenant-1',
        requestedByUserId: 'owner-1',
        requestedByRoles: ['OWNER'],
        email: 'waiter@example.com',
        firstName: 'Waiter',
        lastName: 'One',
        roleName: ROLE.WAITER,
        password: 'Password123!',
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
    });

    expect(authorizerClient.send).not.toHaveBeenCalled();
    expect(userRepository.createStaffProfile).not.toHaveBeenCalled();
  });

  it('disables keycloak user when mongo profile creation fails', async () => {
    const { service, userRepository, authorizerClient, saasClient } = createService();
    mockQuotaOk(saasClient);

    userRepository.exists.mockResolvedValue(false);
    userRepository.countByTenantId.mockResolvedValue(0);
    userRepository.findRoleByName.mockResolvedValue(waiterRole);
    authorizerClient.send
      .mockReturnValueOnce(
        of({
          data: {
            userId: 'kc-waiter-1',
            email: 'waiter@example.com',
            enabled: true,
            requiredActions: [],
          },
        }),
      )
      .mockReturnValueOnce(
        of({
          data: {
            userId: 'kc-waiter-1',
            enabled: false,
          },
        }),
      );
    userRepository.createStaffProfile.mockRejectedValue(new Error('mongo failed'));

    await expect(
      service.createStaff({
        tenantId: 'tenant-1',
        requestedByUserId: 'owner-1',
        requestedByRoles: ['OWNER'],
        email: 'waiter@example.com',
        firstName: 'Waiter',
        lastName: 'One',
        roleName: ROLE.WAITER,
        password: 'Password123!',
        processId: 'pid-1',
      }),
    ).rejects.toThrow('mongo failed');

    expect(authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.SET_USER_ENABLED,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'kc-waiter-1',
          enabled: false,
          reason: 'staff_profile_create_failed',
        }),
      }),
    );
  });

  it('lists only staff in current tenant and excludes owner profiles', async () => {
    const { service, userRepository } = createService();

    userRepository.findRoleByName.mockImplementation(async (roleName: ROLE) => {
      if (roleName === ROLE.MANAGER) return managerRole;
      if (roleName === ROLE.WAITER) return waiterRole;
      if (roleName === ROLE.CHEF) return chefRole;
      if (roleName === ROLE.BARISTA) return { _id: new ObjectId(), name: ROLE.BARISTA };
      return null;
    });
    userRepository.listTenantStaff.mockResolvedValue({
      items: [buildStaffUser()],
      total: 1,
    });

    const result = await service.listStaff({
      tenantId: 'tenant-1',
      requestedByUserId: 'owner-1',
      requestedByRoles: ['OWNER'],
      page: 1,
      limit: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(userRepository.listTenantStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        manageableRoleIds: expect.arrayContaining([managerRoleId, waiterRoleId, chefRoleId]),
      }),
    );
  });

  it('allows owner to change staff role and compensates mongo role when keycloak replace fails', async () => {
    const { service, userRepository, authorizerClient } = createService();

    userRepository.findRoleByName.mockResolvedValue(chefRole);
    userRepository.findTenantStaffByUserId.mockResolvedValue(buildStaffUser());
    userRepository.setTenantStaffRole
      .mockResolvedValueOnce(buildStaffUser({ roles: [chefRole] }))
      .mockResolvedValueOnce(buildStaffUser());
    authorizerClient.send.mockReturnValue(throwError(() => new Error('keycloak replace failed')));

    await expect(
      service.changeRole({
        tenantId: 'tenant-1',
        requestedByUserId: 'owner-1',
        requestedByRoles: ['OWNER'],
        userId: 'staff-1',
        roleName: ROLE.CHEF,
        processId: 'pid-1',
      }),
    ).rejects.toThrow('keycloak replace failed');

    expect(userRepository.setTenantStaffRole).toHaveBeenCalledTimes(2);
    expect(userRepository.setTenantStaffRole).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ roleId: chefRoleId }),
    );
    expect(userRepository.setTenantStaffRole).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ roleId: waiterRoleId }),
    );
    expect(authorizerClient.send).toHaveBeenCalledTimes(2);
    expect(authorizerClient.send).toHaveBeenNthCalledWith(
      1,
      TCP_REQUEST_MESSAGE.KEYCLOAK.REPLACE_REALM_ROLES,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'staff-1',
          nextRoleNames: [ROLE.CHEF],
        }),
      }),
    );
    expect(authorizerClient.send).toHaveBeenNthCalledWith(
      2,
      TCP_REQUEST_MESSAGE.KEYCLOAK.REPLACE_REALM_ROLES,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'staff-1',
          nextRoleNames: [ROLE.WAITER],
        }),
      }),
    );
  });

  it('rejects manager role change', async () => {
    const { service, userRepository, authorizerClient } = createService();

    await expect(
      service.changeRole({
        tenantId: 'tenant-1',
        requestedByUserId: 'manager-1',
        requestedByRoles: ['MANAGER'],
        userId: 'staff-1',
        roleName: ROLE.CHEF,
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.AUTH_PERMISSION_DENIED,
      status: HttpStatus.FORBIDDEN,
    });

    expect(userRepository.findTenantStaffByUserId).not.toHaveBeenCalled();
    expect(authorizerClient.send).not.toHaveBeenCalled();
  });

  it('sets staff disabled status through keycloak and mongo profile', async () => {
    const { service, userRepository, authorizerClient } = createService();

    userRepository.findTenantStaffByUserId.mockResolvedValue(buildStaffUser({ isActive: true }));
    authorizerClient.send.mockReturnValue(
      of({
        data: {
          userId: 'staff-1',
          enabled: false,
        },
      }),
    );
    userRepository.setTenantStaffActiveStatus.mockResolvedValue(
      buildStaffUser({ isActive: false, disabledAt: new Date('2026-05-01T00:00:00.000Z') }),
    );

    const result = await service.setStatus({
      tenantId: 'tenant-1',
      requestedByUserId: 'owner-1',
      requestedByRoles: ['OWNER'],
      userId: 'staff-1',
      enabled: false,
      reason: 'left restaurant',
      processId: 'pid-1',
    });

    expect(result.isActive).toBe(false);
    expect(authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.SET_USER_ENABLED,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'staff-1',
          enabled: false,
          reason: 'left restaurant',
        }),
      }),
    );
    expect(userRepository.setTenantStaffActiveStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: false,
        reason: 'left restaurant',
      }),
    );
    const keycloakOrder = authorizerClient.send.mock.invocationCallOrder[0];
    const mongoOrder = userRepository.setTenantStaffActiveStatus.mock.invocationCallOrder[0];
    expect(keycloakOrder).toBeLessThan(mongoOrder);
  });

  it('reverts keycloak status when mongo profile update fails', async () => {
    const { service, userRepository, authorizerClient } = createService();

    userRepository.findTenantStaffByUserId.mockResolvedValue(buildStaffUser({ isActive: true }));
    authorizerClient.send.mockReturnValue(
      of({
        data: {
          userId: 'staff-1',
          enabled: false,
        },
      }),
    );
    userRepository.setTenantStaffActiveStatus.mockRejectedValue(new Error('mongo failed'));

    await expect(
      service.setStatus({
        tenantId: 'tenant-1',
        requestedByUserId: 'owner-1',
        requestedByRoles: ['OWNER'],
        userId: 'staff-1',
        enabled: false,
        reason: 'left restaurant',
        processId: 'pid-1',
      }),
    ).rejects.toThrow('mongo failed');

    expect(authorizerClient.send).toHaveBeenCalledTimes(2);
    expect(authorizerClient.send).toHaveBeenNthCalledWith(
      2,
      TCP_REQUEST_MESSAGE.KEYCLOAK.SET_USER_ENABLED,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'staff-1',
          enabled: true,
          reason: 'staff_status_profile_update_failed',
        }),
      }),
    );
  });

  it('sets staff enabled status through keycloak and mongo profile', async () => {
    const { service, userRepository, authorizerClient } = createService();

    userRepository.findTenantStaffByUserId.mockResolvedValue(
      buildStaffUser({ isActive: false, disabledAt: new Date('2026-05-01T00:00:00.000Z') }),
    );
    authorizerClient.send.mockReturnValue(
      of({
        data: {
          userId: 'staff-1',
          enabled: true,
        },
      }),
    );
    userRepository.setTenantStaffActiveStatus.mockResolvedValue(buildStaffUser({ isActive: true, disabledAt: null }));

    const result = await service.setStatus({
      tenantId: 'tenant-1',
      requestedByUserId: 'owner-1',
      requestedByRoles: ['OWNER'],
      userId: 'staff-1',
      enabled: true,
      reason: 're-enabled',
    });

    expect(result.isActive).toBe(true);
    expect(authorizerClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KEYCLOAK.SET_USER_ENABLED,
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: true,
          reason: 're-enabled',
        }),
      }),
    );
    expect(userRepository.setTenantStaffActiveStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        isActive: true,
        disabledAt: null,
      }),
    );
  });
});
