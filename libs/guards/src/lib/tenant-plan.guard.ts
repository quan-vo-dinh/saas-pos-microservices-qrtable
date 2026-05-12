import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

type SubscriptionWithStatus = {
  status?: string;
};

@Injectable()
export class TenantPlanGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const subscription = request.subscription as SubscriptionWithStatus | undefined;

    if (!subscription) {
      return true;
    }

    return subscription.status === 'ACTIVE';
  }
}
