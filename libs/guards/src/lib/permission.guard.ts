import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
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
      throw new UnauthorizedException('User data not found');
    }

    const permissions = userData.metadata.permissions;
    const userPermissions = Array.isArray(permissions) ? (permissions as PERMISSION[]) : [];

    const isValid = requiredPermissions.every((permission) => userPermissions.includes(permission));

    if (!isValid) {
      throw new ForbiddenException('Permission denied');
    }

    return isValid;
  }
}
