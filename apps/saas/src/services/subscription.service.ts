import { normalizePlanCode } from '@common/constants/saas.constants';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { buildVndRoundingSnapshot } from '@common/utils/vnd-rounding.util';
import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionCacheService } from './subscription-cache.service';

export type AssignPlanParams = {
  tenantId: string;
  planCode: string;
  source: 'INITIAL_ONBOARDING' | 'ADMIN_MANUAL' | 'SUBSCRIPTION_PAYMENT';
  startsAt: Date;
  expiresAt?: Date | null;
  sourceInvoiceId?: string | null;
  createdByUserId?: string | null;
};

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(PricingPlanRepository)
    private readonly planRepository: {
      findActiveByCode(code: string): Promise<{
        id: string;
        code: string;
        priceVnd: number;
        maxTables?: number;
        maxStaff?: number;
        maxOrdersPerDay?: number;
        features?: string[];
      } | null>;
    },
    @Inject(SubscriptionRepository)
    private readonly subscriptionRepository: {
      findActiveByTenantId(tenantId: string): Promise<{ id: string } | null>;
      supersedeActive(tenantId: string, oldSubscriptionId: string): Promise<void>;
      deleteInitialOnboardingByTenantId(tenantId: string): Promise<void>;
      createActive(
        params: AssignPlanParams & { pricingPlanId: string; priceVndSnapshot: number },
      ): Promise<{ id: string; expiresAt?: Date | null }>;
    },
    @Optional() private readonly subscriptionCache?: SubscriptionCacheService,
  ) {}

  async assignPlan(params: AssignPlanParams) {
    const planCode = normalizePlanCode(params.planCode);
    const plan = await this.planRepository.findActiveByCode(planCode);
    if (!plan) {
      throw new BusinessException(ErrorCode.SAAS_PLAN_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const existing = await this.subscriptionRepository.findActiveByTenantId(params.tenantId);
    if (existing) {
      await this.subscriptionRepository.supersedeActive(params.tenantId, existing.id);
    }

    const subscription = await this.subscriptionRepository.createActive({
      ...params,
      planCode,
      pricingPlanId: plan.id,
      priceVndSnapshot: buildVndRoundingSnapshot(Number(plan.priceVnd)).roundedTotal,
    });

    await this.subscriptionCache?.setCurrent(params.tenantId, {
      tenantId: params.tenantId,
      planCode,
      status: 'ACTIVE',
      maxTables: plan.maxTables ?? 0,
      maxStaff: plan.maxStaff ?? 0,
      maxOrdersPerDay: plan.maxOrdersPerDay ?? 0,
      features: plan.features ?? [],
      expiresAt: subscription.expiresAt?.toISOString() ?? params.expiresAt?.toISOString() ?? null,
    });

    return subscription;
  }

  async compensateInitialOnboarding(tenantId: string): Promise<void> {
    await this.subscriptionRepository.deleteInitialOnboardingByTenantId(tenantId);
    await this.subscriptionCache?.clearCurrent(tenantId);
  }
}
