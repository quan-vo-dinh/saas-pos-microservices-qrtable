import { UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { of } from 'rxjs';
import { AUTH_ERROR_CODE } from '@common/constants/enum/auth-error-code.enum';
import { AuthorizerService } from './authorizer.service';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    decode: jest.fn(),
    verify: jest.fn(),
  },
}));

jest.mock('jwks-rsa', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockResolvedValue({
      getPublicKey: () => 'public-key',
    }),
  })),
}));

describe('AuthorizerService', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetAllMocks();
  });

  const createService = () => {
    const mockUserAccessService = {
      getByUserId: jest.fn(),
      upsertByIdentity: jest.fn(),
    };

    const service = new AuthorizerService(
      {} as any,
      {
        get: jest.fn((key: string) => {
          if (key === 'KEYCLOAK_CONFIG.HOST') {
            return 'http://localhost:8180';
          }

          if (key === 'KEYCLOAK_CONFIG.REALM') {
            return 'qrtable';
          }

          return undefined;
        }),
      } as any,
      {
        getService: jest.fn().mockReturnValue(mockUserAccessService),
      } as any,
    );

    (service as any).jwksClient = {
      getSigningKey: jest.fn().mockResolvedValue({
        getPublicKey: () => 'public-key',
      }),
    };

    service.onModuleInit();

    return {
      service,
      mockUserAccessService,
    };
  };

  it('returns user_not_provisioned when user is missing and auto-provision is disabled', async () => {
    process.env = {
      ...originalEnv,
      AUTH_AUTO_PROVISION_ON_FIRST_LOGIN: 'false',
    };

    const { service, mockUserAccessService } = createService();

    (jwt.decode as jest.Mock).mockReturnValue({
      header: { kid: 'kid-1' },
      payload: { sub: 'sub-1' },
    });

    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'sub-1',
      email: 'owner@example.com',
      realm_access: { roles: ['OWNER'] },
    });

    mockUserAccessService.getByUserId.mockReturnValue(
      of({
        data: undefined,
      }),
    );

    await expect(service.verifyUserToken('token', 'pid-1')).rejects.toThrow(
      new UnauthorizedException(AUTH_ERROR_CODE.USER_NOT_PROVISIONED),
    );
  });

  it('auto-provisions user on first login when enabled', async () => {
    process.env = {
      ...originalEnv,
      AUTH_AUTO_PROVISION_ON_FIRST_LOGIN: 'true',
    };

    const { service, mockUserAccessService } = createService();

    (jwt.decode as jest.Mock).mockReturnValue({
      header: { kid: 'kid-1' },
      payload: { sub: 'sub-1' },
    });

    (jwt.verify as jest.Mock).mockReturnValue({
      sub: 'sub-1',
      email: 'owner@example.com',
      given_name: 'Owner',
      family_name: 'One',
      realm_access: { roles: ['OWNER'] },
    });

    mockUserAccessService.getByUserId.mockReturnValue(
      of({
        data: undefined,
      }),
    );

    mockUserAccessService.upsertByIdentity.mockReturnValue(
      of({
        data: {
          id: 'mongo-id',
          roles: [
            {
              name: 'OWNER',
              permissions: ['catalog.get_list'],
            },
          ],
        },
      }),
    );

    const result = await service.verifyUserToken('token', 'pid-1');

    expect(result.valid).toBe(true);
    expect(mockUserAccessService.upsertByIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        processId: 'pid-1',
        userId: 'sub-1',
        email: 'owner@example.com',
      }),
    );
  });
});
