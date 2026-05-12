import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { SubscriptionInvoiceService } from './subscription-invoice.service';
import { SubscriptionService } from './subscription.service';
import { TenantAdminService } from './tenant-admin.service';

@Injectable()
export class SubscriptionDashboardService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly planRepository: PricingPlanRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly subscriptionService: SubscriptionService,
    private readonly subscriptionInvoiceService: SubscriptionInvoiceService,
    private readonly tenantAdminService: TenantAdminService,
  ) {}

  async getDashboardSubscription(tenantId: string): Promise<Record<string, unknown>> {
    const tenant = await this.findTenant(tenantId);
    const [current, plans, history, usage] = await Promise.all([
      this.subscriptionRepository.findActiveByTenantId(tenantId),
      this.planRepository.listActive(),
      this.subscriptionRepository.listByTenantId(tenantId),
      this.tenantAdminService.usage(tenantId),
    ]);
    const currentPlan = current ? await this.planRepository.findByCode(current.planCodeSnapshot) : null;

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        status: tenant.status,
      },
      current: current ? this.toCurrentSubscription(current, currentPlan ?? undefined) : null,
      usage,
      plans: plans.map((plan) => this.toPlanResponse(plan)),
      history: history.map((subscription) => this.toSubscriptionHistory(subscription)),
    };
  }

  async listSubscriptions(tenantId: string): Promise<Record<string, unknown>[]> {
    await this.findTenant(tenantId);
    return (await this.subscriptionRepository.listByTenantId(tenantId)).map((subscription) =>
      this.toSubscriptionHistory(subscription),
    );
  }

  async assignSubscription(input: {
    tenantId: string;
    planCode: string;
    billingPeriod?: 'MONTHLY' | 'YEARLY';
    createdByUserId?: string | null;
  }): Promise<Record<string, unknown>> {
    await this.findTenant(input.tenantId);
    const now = new Date();
    const subscription = await this.subscriptionService.assignPlan({
      tenantId: input.tenantId,
      planCode: input.planCode,
      source: 'ADMIN_MANUAL',
      startsAt: now,
      expiresAt: this.addBillingPeriod(now, input.billingPeriod ?? 'MONTHLY'),
      createdByUserId: input.createdByUserId ?? null,
    });
    return this.toSubscriptionHistory(subscription as Subscription);
  }

  async cancelSubscription(input: { tenantId: string; reason?: string | null }): Promise<Record<string, unknown>> {
    const current = await this.subscriptionRepository.findActiveByTenantId(input.tenantId);
    if (!current) {
      throw new NotFoundException('ACTIVE_SUBSCRIPTION_NOT_FOUND');
    }
    if (!input.reason?.trim()) {
      throw new BadRequestException('CANCEL_REASON_REQUIRED');
    }
    return this.toSubscriptionHistory(
      await this.subscriptionRepository.cancelActive(input.tenantId, current.id, input.reason.trim()),
    );
  }

  checkoutInvoice(input: {
    tenantId: string;
    planCode: string;
    billingPeriod: 'MONTHLY' | 'YEARLY';
    requestedByUserId: string;
  }): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.checkout(input);
  }

  listInvoices(query: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.list(query);
  }

  getInvoice(input: { tenantId?: string; invoiceId: string; statusOnly?: boolean }): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.getInvoice(input);
  }

  cancelInvoice(input: {
    tenantId?: string;
    invoiceId: string;
    reason?: string | null;
  }): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.cancelInvoice(input);
  }

  manualConfirmInvoice(input: {
    invoiceId: string;
    confirmedByUserId: string;
    note?: string | null;
  }): Promise<Record<string, unknown>> {
    return this.subscriptionInvoiceService.manualConfirm(input);
  }

  private async findTenant(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new NotFoundException('TENANT_NOT_FOUND');
    }
    return tenant;
  }

  private toPlanResponse(plan: PricingPlan): Record<string, unknown> {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description ?? null,
      priceVnd: Number(plan.priceVnd),
      billingPeriod: plan.billingPeriod,
      maxTables: plan.maxTables,
      maxStaff: plan.maxStaff,
      maxOrdersPerDay: plan.maxOrdersPerDay,
      features: plan.features ?? [],
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
    };
  }

  private toSubscriptionHistory(subscription: Subscription): Record<string, unknown> {
    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      pricingPlanId: subscription.pricingPlanId,
      planCode: subscription.planCodeSnapshot,
      planCodeSnapshot: subscription.planCodeSnapshot,
      priceVndSnapshot: Number(subscription.priceVndSnapshot),
      status: subscription.status,
      startsAt: this.toIso(subscription.startsAt),
      expiresAt: subscription.expiresAt ? this.toIso(subscription.expiresAt) : null,
      createdAt: this.toIso(subscription.createdAt),
    };
  }

  private toCurrentSubscription(subscription: Subscription, plan?: PricingPlan): Record<string, unknown> {
    return {
      planCode: subscription.planCodeSnapshot,
      planName: plan?.name ?? subscription.planCodeSnapshot,
      status: subscription.status,
      expiresAt: subscription.expiresAt ? this.toIso(subscription.expiresAt) : null,
      billingPeriod: plan?.billingPeriod ?? 'MONTHLY',
      features: plan?.features ?? [],
      maxTables: plan?.maxTables ?? 0,
      maxStaff: plan?.maxStaff ?? 0,
      maxOrdersPerDay: plan?.maxOrdersPerDay ?? 0,
    };
  }

  private addBillingPeriod(now: Date, billingPeriod: 'MONTHLY' | 'YEARLY'): Date {
    const next = new Date(now);
    if (billingPeriod === 'YEARLY') {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  private toIso(value: Date | string | undefined): string {
    return value instanceof Date ? value.toISOString() : (value ?? '');
  }
}
