import { Reflector } from '@nestjs/core';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { PermissionGuard } from '@common/guards/permission.guard';
import { BusinessException } from '@common/error-messages/business.exception';

describe('PermissionGuard', () => {
  const getContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => 'handler',
    }) as any;

  it('returns true when route has no required permissions', () => {
    const guard = new PermissionGuard({ get: jest.fn().mockReturnValue(undefined) } as unknown as Reflector);
    expect(guard.canActivate(getContext({}))).toBe(true);
  });

  it('throws UnauthorizedException when user data is missing', () => {
    const guard = new PermissionGuard({
      get: jest.fn().mockReturnValue([PERMISSION.CATALOG_GET_LIST]),
    } as unknown as Reflector);

    expect(() => guard.canActivate(getContext({}))).toThrow(BusinessException);
  });

  it('throws ForbiddenException when user lacks required permissions', () => {
    const guard = new PermissionGuard({
      get: jest.fn().mockReturnValue([PERMISSION.CATALOG_GET_LIST]),
    } as unknown as Reflector);

    const request = {
      [MetadataKey.USER_DATA]: {
        metadata: {
          permissions: [PERMISSION.CATALOG_GET_BY_ID],
        },
      },
    } as Record<string, unknown>;

    expect(() => guard.canActivate(getContext(request))).toThrow(BusinessException);
  });

  it('returns true when user has all required permissions', () => {
    const guard = new PermissionGuard({
      get: jest.fn().mockReturnValue([PERMISSION.CATALOG_GET_LIST]),
    } as unknown as Reflector);

    const request = {
      [MetadataKey.USER_DATA]: {
        metadata: {
          permissions: [PERMISSION.CATALOG_GET_LIST, PERMISSION.CATALOG_GET_BY_ID],
        },
      },
    } as Record<string, unknown>;

    expect(guard.canActivate(getContext(request))).toBe(true);
  });
});
