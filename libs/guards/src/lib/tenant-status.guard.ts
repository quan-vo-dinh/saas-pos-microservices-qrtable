import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';

type TenantWithStatus = {
  status?: 'ACTIVE' | 'SUSPENDED' | 'CLOSED' | string;
};

@Injectable()
export class TenantStatusGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant as TenantWithStatus | undefined;

    if (!tenant) {
      throw new BusinessException(ErrorCode.TENANT_REQUIRED, HttpStatus.FORBIDDEN);
    }

    if (tenant.status === 'CLOSED') {
      throw new BusinessException(ErrorCode.TENANT_CLOSED, HttpStatus.FORBIDDEN);
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
        throw new BusinessException(ErrorCode.TENANT_SUSPENDED, HttpStatus.FORBIDDEN);
      }
    }

    return true;
  }
}
