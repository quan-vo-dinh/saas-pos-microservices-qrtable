import { of } from 'rxjs';
import { BusinessException } from '@common/error-messages/business.exception';
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
    };

    const authorizerClient = {
      send: jest.fn(),
    };

    const service = new UserService(userRepository as any, authorizerClient as any);

    return {
      service,
      userRepository,
      authorizerClient,
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
      roleNames: ['OWNER'],
    });

    expect(userRepository.upsertByUserId).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'sub-1',
        email: 'owner@example.com',
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
});
