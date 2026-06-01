import { MetadataKey } from '@common/constants/common.constant';
import { RequiresPlanFeature } from '@common/decorators/requires-plan-feature.decorator';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantSubscriptionResolver } from '../services/tenant-subscription-resolver.service';

type RequestWithSubscription = {
  subscription?: unknown;
  [MetadataKey.TENANT_ID]?: string;
};

@Injectable()
export class TenantSubscriptionContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionResolver: TenantSubscriptionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get(RequiresPlanFeature, context.getHandler());
    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest() as RequestWithSubscription;
    if (request.subscription) {
      return true;
    }

    const tenantId = request[MetadataKey.TENANT_ID];
    if (!tenantId) {
      return true;
    }

    const subscription = await this.subscriptionResolver.resolve(tenantId, context.switchToHttp().getRequest());
    if (subscription) {
      request.subscription = subscription;
    }

    return true;
  }
}
