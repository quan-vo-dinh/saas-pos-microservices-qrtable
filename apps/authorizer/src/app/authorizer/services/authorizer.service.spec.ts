import jwt from 'jsonwebtoken';
import { of } from 'rxjs';
import { BusinessException } from '@common/error-messages/business.exception';
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
  afterEach(() => {
    jest.resetAllMocks();
  });

  const createService = (autoProvisionOnFirstLogin = false) => {
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

          if (key === 'AUTHORIZER_AUTH_CONFIG.AUTO_PROVISION_ON_FIRST_LOGIN') {
            return autoProvisionOnFirstLogin;
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

    await expect(service.verifyUserToken('token', 'pid-1')).rejects.toThrow(BusinessException);
  });

  it('auto-provisions user on first login when enabled', async () => {
    const { service, mockUserAccessService } = createService(true);

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
