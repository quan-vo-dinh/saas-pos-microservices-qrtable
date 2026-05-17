import { of } from 'rxjs';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { UserRepository } from '../repositories/user.repository';
import { UserService } from './user.service';

jest.mock('../mapper', () => ({
  createUserRequestMapping: jest.fn().mockReturnValue({ userId: 'kc-id-1' }),
}));

describe('UserService', () => {
  const createService = () => {
    const userRepository = {
      exists: jest.fn(),
      create: jest.fn(),
      getByUserId: jest.fn(),
      upsertByUserId: jest.fn(),
      countByTenantId: jest.fn(),
    };

    const authorizerClient = {
      send: jest.fn(),
    };

    const saasClient = {
      send: jest.fn(),
    };

    const service = new UserService(
      userRepository as unknown as UserRepository,
      authorizerClient as unknown as TcpClient,
      saasClient as unknown as TcpClient,
    );

    return {
      service,
      userRepository,
      authorizerClient,
      saasClient,
    };
  };

  it('throws USER_ALREADY_EXISTS when email already exists', async () => {
    const { service, userRepository } = createService();

    userRepository.exists.mockResolvedValue(true);

    await expect(
      service.create(
        {
          email: 'exists@example.com',
          password: '123456',
          firstName: 'A',
          lastName: 'B',
          roles: ['r1'],
          tenantId: 'tenant-a',
        },
        'pid-1',
      ),
    ).rejects.toThrow(BusinessException);
  });

  it('upserts user by identity through repository', async () => {
    const { service, userRepository } = createService();
    userRepository.upsertByUserId.mockResolvedValue({ id: 'user-1' });

    const result = await service.upsertUserByIdentity({
      userId: 'sub-1',
      email: 'owner@example.com',
      firstName: 'Owner',
      lastName: 'One',
      tenantId: 'tenant-a',
      roleNames: ['OWNER'],
    });

    expect(userRepository.upsertByUserId).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'sub-1',
        email: 'owner@example.com',
        tenantId: 'tenant-a',
      }),
    );
    expect(result).toEqual({ id: 'user-1' });
  });

  it('creates keycloak user via tcp client and maps response data', async () => {
    const { service, authorizerClient } = createService();

    authorizerClient.send.mockReturnValue(
      of({
        data: 'kc-id-1',
      }),
    );

    const result = await service.createKeycloakUser(
      {
        email: 'new@example.com',
        password: '123456',
        firstName: 'N',
        lastName: 'U',
        tenantId: 'tenant-a',
      },
      'pid-1',
    );

    expect(result).toBe('kc-id-1');
  });

  it('blocks tenant user create at max_staff limit before keycloak or repository mutation with details', async () => {
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
      service.create(
        {
          email: 'staff@example.com',
          password: '123456',
          firstName: 'Staff',
          lastName: 'One',
          roles: ['WAITER'],
          tenantId: 'tenant-a',
        },
        'pid-1',
      ),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
      response: expect.objectContaining({
        details: {
          limitType: 'max_staff',
          limit: 2,
          current: 2,
          upgradeUrl: '/dashboard/subscription',
        },
      }),
    });

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
      expect.objectContaining({
        tenantId: 'tenant-a',
        data: { tenantId: 'tenant-a' },
      }),
    );
    expect(userRepository.countByTenantId).toHaveBeenCalledWith({ tenantId: 'tenant-a', activeOnly: true });
    expect(authorizerClient.send).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('does not enforce staff quota for platform user create without tenantId', async () => {
    const { service, userRepository, authorizerClient, saasClient } = createService();

    userRepository.exists.mockResolvedValue(false);
    authorizerClient.send.mockReturnValue(
      of({
        data: 'kc-platform-id',
      }),
    );
    userRepository.create.mockResolvedValue({ userId: 'kc-platform-id' });

    await expect(
      service.create(
        {
          email: 'admin@example.com',
          password: '123456',
          firstName: 'Super',
          lastName: 'Admin',
          roles: ['SUPER_ADMIN'],
        },
        'pid-1',
      ),
    ).resolves.toEqual({ userId: 'kc-platform-id' });

    expect(saasClient.send).not.toHaveBeenCalled();
    expect(userRepository.countByTenantId).not.toHaveBeenCalled();
  });

  it('passes activeOnly true so disabled tenant users do not count toward max_staff', async () => {
    const { service, userRepository, authorizerClient, saasClient } = createService();

    userRepository.exists.mockResolvedValue(false);
    userRepository.countByTenantId.mockResolvedValue(1);
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
    authorizerClient.send.mockReturnValue(
      of({
        data: 'kc-id-1',
      }),
    );
    userRepository.create.mockResolvedValue({ userId: 'kc-id-1' });

    await service.create(
      {
        email: 'staff@example.com',
        password: '123456',
        firstName: 'Staff',
        lastName: 'One',
        roles: ['WAITER'],
        tenantId: 'tenant-a',
      },
      'pid-1',
    );

    expect(userRepository.countByTenantId).toHaveBeenCalledWith({ tenantId: 'tenant-a', activeOnly: true });
    expect(authorizerClient.send).toHaveBeenCalled();
    expect(userRepository.create).toHaveBeenCalled();
  });

  it('blocks tenant staff create when current subscription is missing', async () => {
    const { service, userRepository, authorizerClient, saasClient } = createService();

    userRepository.exists.mockResolvedValue(false);
    saasClient.send.mockReturnValue(
      of({
        data: {
          current: null,
        },
      }),
    );

    await expect(
      service.create(
        {
          email: 'staff@example.com',
          password: '123456',
          firstName: 'Staff',
          lastName: 'One',
          roles: ['WAITER'],
          tenantId: 'tenant-a',
        },
        'pid-1',
      ),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
    });

    expect(authorizerClient.send).not.toHaveBeenCalled();
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
