import { MetadataKey } from '@common/constants/common.constant';
import { hasPlanFeature, PlanFeatureCode, SubscriptionStatus } from '@common/constants/saas.constants';
import { RequiresPlanFeature } from '@common/decorators/requires-plan-feature.decorator';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantSubscriptionContext } from './tenant-subscription.context';

export type MissingPlanFeatureDetails = {
  requiredFeature: PlanFeatureCode;
  currentPlanCode: string | null;
  upgradeUrl: '/dashboard/subscription';
};

type RequestWithSubscription = {
  subscription?: TenantSubscriptionContext;
  [MetadataKey.TENANT_ID]?: string;
};

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.get(RequiresPlanFeature, context.getHandler());
    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest() as RequestWithSubscription;
    const subscription = request.subscription;

    if (!subscription) {
      throw new BusinessException(
        ErrorCode.SAAS_PLAN_FEATURE_REQUIRED,
        HttpStatus.FORBIDDEN,
        undefined,
        undefined,
        this.buildDetails(requiredFeature, null),
      );
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new BusinessException(
        ErrorCode.SAAS_PLAN_FEATURE_REQUIRED,
        HttpStatus.FORBIDDEN,
        undefined,
        undefined,
        this.buildDetails(requiredFeature, subscription.planCode),
      );
    }

    if (!hasPlanFeature(subscription.features, requiredFeature)) {
      throw new BusinessException(
        ErrorCode.SAAS_PLAN_FEATURE_REQUIRED,
        HttpStatus.FORBIDDEN,
        undefined,
        undefined,
        this.buildDetails(requiredFeature, subscription.planCode),
      );
    }

    return true;
  }

  private buildDetails(requiredFeature: PlanFeatureCode, currentPlanCode: string | null): MissingPlanFeatureDetails {
    return {
      requiredFeature,
      currentPlanCode,
      upgradeUrl: '/dashboard/subscription',
    };
  }
}
