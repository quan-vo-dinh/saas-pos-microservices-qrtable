import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { BusinessException } from '@common/error-messages/business.exception';
import { MetadataKey } from '@common/constants/common.constant';
import { UserGuard } from '@common/guards/user.guard';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('UserGuard', () => {
  const getContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => 'handler',
      getClass: () => 'controller',
    }) as unknown as ExecutionContext;

  const reflectorWithAuth = (authOptions: { secured: boolean }) =>
    ({
      getAllAndOverride: jest.fn().mockReturnValue(authOptions),
    }) as unknown as Reflector;

  it('returns true for unsecured route', async () => {
    const reflector = reflectorWithAuth({ secured: false });

    const guard = new UserGuard(reflector, {} as never, { get: jest.fn(), set: jest.fn() } as never);

    const result = await guard.canActivate(getContext({}));
    expect(result).toBe(true);
  });

  it('throws invalid_token when access token is missing', async () => {
    const reflector = reflectorWithAuth({ secured: true });

    const guard = new UserGuard(reflector, {} as never, { get: jest.fn(), set: jest.fn() } as never);

    await expect(guard.canActivate(getContext({ headers: {} }))).rejects.toThrow(BusinessException);
  });

  it('maps role_mapping_mismatch to user_not_provisioned', async () => {
    const reflector = reflectorWithAuth({ secured: true });

    const mockAuthorizerService = {
      verifyUserToken: jest.fn().mockReturnValue(throwError(() => ({ details: 'ROLE_MAPPING_MISMATCH' }))),
    };

    const guard = new UserGuard(
      reflector,
      {
        getService: jest.fn().mockReturnValue(mockAuthorizerService),
      } as never,
      {
        get: jest.fn().mockResolvedValue(undefined),
        set: jest.fn(),
      } as never,
    );

    guard.onModuleInit();

    await expect(
      guard.canActivate(
        getContext({
          headers: {
            authorization: 'Bearer token',
          },
          [MetadataKey.PROCESSID]: 'pid-1',
        }),
      ),
    ).rejects.toThrow(BusinessException);
  });

  it('returns true and caches user data when token is valid', async () => {
    const reflector = reflectorWithAuth({ secured: true });

    const mockAuthorizeResponse = {
      valid: true,
      metadata: {
        userId: 'u-1',
      },
    };

    const mockAuthorizerService = {
      verifyUserToken: jest.fn().mockReturnValue(
        of({
          data: mockAuthorizeResponse,
        }),
      ),
    };

    const cacheSet = jest.fn();

    const request: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer token',
      },
      [MetadataKey.PROCESSID]: 'pid-1',
    };

    const guard = new UserGuard(
      reflector,
      {
        getService: jest.fn().mockReturnValue(mockAuthorizerService),
      } as never,
      {
        get: jest.fn().mockResolvedValue(undefined),
        set: cacheSet,
      } as never,
    );

    guard.onModuleInit();

    const result = await guard.canActivate(getContext(request));

    expect(result).toBe(true);
    expect(request[MetadataKey.USER_DATA]).toEqual(mockAuthorizeResponse);
    expect(cacheSet).toHaveBeenCalled();
  });

  it('reads class-level authorization metadata for secured controllers', async () => {
    const getAllAndOverride = jest.fn().mockReturnValue({ secured: true });
    const reflector = {
      getAllAndOverride,
    } as unknown as Reflector;

    const guard = new UserGuard(reflector, {} as never, { get: jest.fn(), set: jest.fn() } as never);

    await expect(guard.canActivate(getContext({ headers: {} }))).rejects.toThrow(BusinessException);
    expect(getAllAndOverride).toHaveBeenCalledWith(MetadataKey.SECURED, ['handler', 'controller']);
  });
});
