import { SubscriptionStatus, normalizePlanCode } from '@common/constants/saas.constants';
import { Subscription } from '@common/entities/subscription.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import type { AssignPlanParams } from '../services/subscription.service';

type CreateActiveParams = AssignPlanParams & {
  pricingPlanId: string;
  priceVndSnapshot: number;
};

@Injectable()
export class SubscriptionRepository {
  constructor(@InjectRepository(Subscription) private readonly repo: Repository<Subscription>) {}

  findActiveByTenantId(tenantId: string): Promise<Subscription | null> {
    return this.repo.findOne({ where: { tenantId, status: SubscriptionStatus.ACTIVE } });
  }

  findById(id: string): Promise<Subscription | null> {
    return this.repo.findOne({ where: { id } });
  }

  findActiveByTenantIds(tenantIds: string[]): Promise<Subscription[]> {
    if (!tenantIds.length) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { tenantId: In(tenantIds), status: SubscriptionStatus.ACTIVE } });
  }

  async supersedeActive(tenantId: string, oldSubscriptionId: string): Promise<void> {
    await this.repo.update(
      { id: oldSubscriptionId, tenantId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.SUPERSEDED },
    );
  }

  async createActive(params: CreateActiveParams): Promise<Subscription> {
    const row = this.repo.create({
      tenantId: params.tenantId,
      pricingPlanId: params.pricingPlanId,
      planCodeSnapshot: normalizePlanCode(params.planCode),
      priceVndSnapshot: params.priceVndSnapshot,
      startsAt: params.startsAt ?? new Date(),
      expiresAt: params.expiresAt ?? null,
      status: SubscriptionStatus.ACTIVE,
      source: this.toRepositorySource(params.source),
      sourceInvoiceId: params.sourceInvoiceId ?? null,
      createdByUserId: params.createdByUserId ?? null,
    });
    return this.repo.save(row);
  }

  async deleteInitialOnboardingByTenantId(tenantId: string): Promise<void> {
    await this.repo.delete({
      tenantId,
      source: 'INITIAL_ONBOARDING',
    });
  }

  listByTenantId(tenantId: string): Promise<Subscription[]> {
    return this.repo.find({ where: { tenantId }, order: { startsAt: 'DESC' } });
  }

  findExpirableActive(now: Date, limit: number): Promise<Subscription[]> {
    return this.repo.find({
      where: { status: SubscriptionStatus.ACTIVE, expiresAt: LessThan(now) },
      order: { expiresAt: 'ASC' },
      take: limit,
    });
  }

  findExpiredBeyondGrace(now: Date, graceHours: number): Promise<Array<{ tenantId: string }>> {
    const cutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
    return this.repo.find({
      select: { tenantId: true },
      where: { status: SubscriptionStatus.ACTIVE, expiresAt: LessThan(cutoff) },
    });
  }

  async markExpired(subscriptionId: string, expiredAt: Date): Promise<void> {
    await this.repo.update({ id: subscriptionId }, { status: SubscriptionStatus.EXPIRED, expiredAt });
  }

  async cancelActive(tenantId: string, subscriptionId: string, reason: string): Promise<Subscription> {
    await this.repo.update(
      { id: subscriptionId, tenantId, status: SubscriptionStatus.ACTIVE },
      { status: SubscriptionStatus.CANCELED, canceledAt: new Date(), canceledReason: reason },
    );
    const updated = await this.findById(subscriptionId);
    if (!updated) {
      throw new Error('SUBSCRIPTION_NOT_FOUND_AFTER_CANCEL');
    }
    return updated;
  }

  private toRepositorySource(source: AssignPlanParams['source']): Subscription['source'] {
    if (source === 'ADMIN_MANUAL') {
      return 'ADMIN_ASSIGN';
    }
    if (source === 'SUBSCRIPTION_PAYMENT') {
      return 'INVOICE_PAID';
    }
    return source;
  }
}
