import { normalizePlanCode } from '@common/constants/saas.constants';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';

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
      findActiveByCode(code: string): Promise<{ id: string; code: string; priceVnd: number } | null>;
    },
    @Inject(SubscriptionRepository)
    private readonly subscriptionRepository: {
      findActiveByTenantId(tenantId: string): Promise<{ id: string } | null>;
      supersedeActive(tenantId: string, oldSubscriptionId: string): Promise<void>;
      createActive(
        params: AssignPlanParams & { pricingPlanId: string; priceVndSnapshot: number },
      ): Promise<{ id: string }>;
    },
  ) {}

  async assignPlan(params: AssignPlanParams) {
    const planCode = normalizePlanCode(params.planCode);
    const plan = await this.planRepository.findActiveByCode(planCode);
    if (!plan) {
      throw new NotFoundException('PLAN_NOT_FOUND');
    }

    const existing = await this.subscriptionRepository.findActiveByTenantId(params.tenantId);
    if (existing) {
      await this.subscriptionRepository.supersedeActive(params.tenantId, existing.id);
    }

    return this.subscriptionRepository.createActive({
      ...params,
      planCode,
      pricingPlanId: plan.id,
      priceVndSnapshot: plan.priceVnd,
    });
  }
}
