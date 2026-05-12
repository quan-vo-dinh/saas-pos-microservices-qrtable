import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

type TenantWithStatus = {
  status?: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | string;
};

@Injectable()
export class TenantStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant as TenantWithStatus | undefined;

    if (!tenant) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }

    if (tenant.status === 'CLOSED') {
      throw new ForbiddenException('TENANT_CLOSED');
    }

    if (tenant.status === 'SUSPENDED') {
      const routePath = request.route?.path ?? request.path ?? '';
      const method = request.method;
      const allowedWhileSuspended =
        method === 'GET' &&
        (routePath.includes('/dashboard/subscription') ||
          routePath.includes('/dashboard/billing') ||
          routePath.includes('/dashboard/payment-settings'));

      if (!allowedWhileSuspended) {
        throw new ForbiddenException('TENANT_SUSPENDED');
      }
    }

    return true;
  }
}
