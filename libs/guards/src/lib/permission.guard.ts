import { Injectable, CanActivate, ExecutionContext, HttpStatus } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Reflector } from '@nestjs/core';
import { Permissions } from '@common/decorators/permission.decorator';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { MetadataKey } from '@common/constants/common.constant';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<PERMISSION[]>(Permissions, context.getHandler());

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userData = request[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;

    if (!userData?.metadata) {
      throw new BusinessException(ErrorCode.AUTH_USER_DATA_NOT_FOUND, HttpStatus.UNAUTHORIZED);
    }

    const permissions = userData.metadata.permissions;
    const userPermissions = Array.isArray(permissions) ? (permissions as PERMISSION[]) : [];

    const isValid = requiredPermissions.every((permission) => userPermissions.includes(permission));

    if (!isValid) {
      throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
    }

    return isValid;
  }
}
