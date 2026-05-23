import { TenantStatus } from '@common/constants/saas.constants';
import { Subscription } from '@common/entities/subscription.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Injectable } from '@nestjs/common';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantRepository } from '../repositories/tenant.repository';

type AdminTenantQuery = {
  search?: string;
  status?: TenantStatus | string;
  planCode?: string;
  page?: number | string;
  limit?: number | string;
};

@Injectable()
export class TenantAdminService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planRepository: PricingPlanRepository,
  ) {}

  async getPlatformStats(): Promise<Record<string, unknown>> {
    const [activeTenants, suspendedTenants, closedTenants, plans] = await Promise.all([
      this.tenantRepository.countByStatus(TenantStatus.ACTIVE),
      this.tenantRepository.countByStatus(TenantStatus.SUSPENDED),
      this.tenantRepository.countByStatus(TenantStatus.CLOSED),
      this.planRepository.listActive(),
    ]);

    return {
      tenants: {
        active: activeTenants,
        suspended: suspendedTenants,
        closed: closedTenants,
        total: activeTenants + suspendedTenants + closedTenants,
      },
      activePlans: plans.length,
    };
  }

  async list(query: AdminTenantQuery): Promise<Record<string, unknown>> {
    const result = await this.tenantRepository.list(query);
    const activeSubscriptions = await this.subscriptionRepository.findActiveByTenantIds(
      result.items.map((tenant) => tenant.id),
    );
    const subscriptionByTenant = new Map(
      activeSubscriptions.map((subscription) => [subscription.tenantId, subscription]),
    );
    const items = result.items.map((tenant) => this.toTenantListItem(tenant, subscriptionByTenant.get(tenant.id)));

    return {
      ...result,
      items,
    };
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const tenant = await this.findTenant(id);
    const current = await this.subscriptionRepository.findActiveByTenantId(id);
    return this.toTenantDetail(tenant, current ?? undefined);
  }

  async update(id: string, input: Partial<Tenant>): Promise<Record<string, unknown>> {
    const tenant = await this.tenantRepository.updateProfile(id, input);
    const current = await this.subscriptionRepository.findActiveByTenantId(id);
    return this.toTenantDetail(tenant, current ?? undefined);
  }

  async usage(tenantId: string): Promise<Record<string, unknown>> {
    await this.findTenant(tenantId);
    const current = await this.subscriptionRepository.findActiveByTenantId(tenantId);
    const plan = current ? await this.planRepository.findByCode(current.planCodeSnapshot) : null;
    return {
      tablesUsed: 0,
      tablesMax: plan?.maxTables ?? 0,
      staffUsed: 0,
      staffMax: plan?.maxStaff ?? 0,
      ordersToday: 0,
      ordersMaxPerDay: plan?.maxOrdersPerDay ?? 0,
    };
  }

  async audit(tenantId: string): Promise<Record<string, unknown>[]> {
    const tenant = await this.findTenant(tenantId);
    return [
      {
        id: `${tenant.id}:created`,
        action: 'TENANT_CREATED',
        at: this.toIso(tenant.createdAt),
        detail: `${tenant.name} được tạo trên nền tảng.`,
      },
    ];
  }

  private async findTenant(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return tenant;
  }

  private toTenantListItem(tenant: Tenant, subscription?: Subscription): Record<string, unknown> {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      type: tenant.type,
      ownerEmail: null,
      planCode: subscription?.planCodeSnapshot ?? null,
      subscriptionStatus: subscription?.status ?? null,
      expiresAt: subscription?.expiresAt ? this.toIso(subscription.expiresAt) : null,
      createdAt: this.toIso(tenant.createdAt),
    };
  }

  private toTenantDetail(tenant: Tenant, subscription?: Subscription): Record<string, unknown> {
    return {
      ...this.toTenantListItem(tenant, subscription),
      address: tenant.address ?? null,
      ownerId: tenant.ownerId ?? null,
      defaultCurrency: tenant.defaultCurrency ?? 'VND',
      defaultLocale: tenant.defaultLocale ?? 'vi-VN',
      operatingModes: tenant.operatingModes ?? [],
      suspendedAt: tenant.suspendedAt ? this.toIso(tenant.suspendedAt) : null,
      suspendedReason: tenant.suspendedReason ?? null,
      closedAt: tenant.closedAt ? this.toIso(tenant.closedAt) : null,
      closedReason: tenant.closedReason ?? null,
    };
  }

  private toIso(value: Date | string | undefined): string {
    return value instanceof Date ? value.toISOString() : (value ?? '');
  }
}
