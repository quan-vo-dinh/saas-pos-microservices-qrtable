import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { TenantStatus } from '@common/constants/saas.constants';
import { Subscription } from '@common/entities/subscription.entity';
import { Tenant } from '@common/entities/tenant.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { User } from '@common/schemas/user.schema';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { firstValueFrom, isObservable } from 'rxjs';
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

type OwnerDisplay = {
  ownerEmail: string | null;
  ownerName: string | null;
};

type TcpMaybeObservable<T> = {
  toPromise?: () => Promise<T>;
};

@Injectable()
export class TenantAdminService {
  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly planRepository: PricingPlanRepository,
    @Inject(TCP_SERVICES.USER_ACCESS_SERVICE) private readonly userClient: TcpClient,
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
    const ownerById = await this.resolveOwnersById(result.items);
    const items = result.items.map((tenant) =>
      this.toTenantListItem(
        tenant,
        subscriptionByTenant.get(tenant.id),
        tenant.ownerId ? ownerById.get(tenant.ownerId) : undefined,
      ),
    );

    return {
      ...result,
      items,
    };
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const tenant = await this.findTenant(id);
    const current = await this.subscriptionRepository.findActiveByTenantId(id);
    const owner = tenant.ownerId ? await this.fetchOwnerDisplay(tenant.ownerId) : undefined;
    return this.toTenantDetail(tenant, current ?? undefined, owner);
  }

  async update(id: string, input: Partial<Tenant>): Promise<Record<string, unknown>> {
    const tenant = await this.tenantRepository.updateProfile(id, input);
    const current = await this.subscriptionRepository.findActiveByTenantId(id);
    const owner = tenant.ownerId ? await this.fetchOwnerDisplay(tenant.ownerId) : undefined;
    return this.toTenantDetail(tenant, current ?? undefined, owner);
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

  private async resolveOwnersById(tenants: Tenant[]): Promise<Map<string, OwnerDisplay>> {
    const ownerIds = [...new Set(tenants.map((tenant) => tenant.ownerId).filter((id): id is string => Boolean(id)))];
    if (ownerIds.length === 0) {
      return new Map();
    }

    const entries = await Promise.all(
      ownerIds.map(async (ownerId) => [ownerId, await this.fetchOwnerDisplay(ownerId)] as const),
    );
    return new Map(entries);
  }

  private async fetchOwnerDisplay(ownerId: string): Promise<OwnerDisplay> {
    try {
      const response = await this.resolveTcp<{ data: User }>(
        this.userClient.send(TCP_REQUEST_MESSAGE.USER.GET_BY_USER_ID, { data: ownerId }),
      );
      const user = response.data;
      return {
        ownerEmail: user.email ?? null,
        ownerName: this.formatOwnerName(user),
      };
    } catch {
      return { ownerEmail: null, ownerName: null };
    }
  }

  private formatOwnerName(user: Pick<User, 'firstName' | 'lastName' | 'email'>): string | null {
    const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    if (name) {
      return name;
    }
    return user.email?.trim() || null;
  }

  private resolveTcp<T>(value: TcpMaybeObservable<T> | unknown): Promise<T> {
    if (value && typeof value === 'object' && 'toPromise' in value && typeof value.toPromise === 'function') {
      return value.toPromise();
    }
    if (isObservable(value)) {
      return firstValueFrom(value as never);
    }
    return Promise.resolve(value as T);
  }

  private async findTenant(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(id);
    if (!tenant) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return tenant;
  }

  private toTenantListItem(tenant: Tenant, subscription?: Subscription, owner?: OwnerDisplay): Record<string, unknown> {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      type: tenant.type,
      ownerEmail: owner?.ownerEmail ?? null,
      ownerName: owner?.ownerName ?? null,
      planCode: subscription?.planCodeSnapshot ?? null,
      subscriptionStatus: subscription?.status ?? null,
      expiresAt: subscription?.expiresAt ? this.toIso(subscription.expiresAt) : null,
      createdAt: this.toIso(tenant.createdAt),
    };
  }

  private toTenantDetail(tenant: Tenant, subscription?: Subscription, owner?: OwnerDisplay): Record<string, unknown> {
    return {
      ...this.toTenantListItem(tenant, subscription, owner),
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
