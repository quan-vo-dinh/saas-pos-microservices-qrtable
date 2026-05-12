import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { DEFAULT_PLAN_CODES, TenantStatus } from '@common/constants/saas.constants';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { firstValueFrom, isObservable } from 'rxjs';
import { SaasOutboxRepository } from '../repositories/saas-outbox.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { SlugService } from './slug.service';
import { SubscriptionService } from './subscription.service';

export type OnboardTenantParams = {
  tenantName: string;
  slug?: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  type?: string;
  address?: string;
  planCode?: string;
  createdByUserId?: string;
  processId?: string;
};

type TcpMaybeObservable<T> = {
  toPromise?: () => Promise<T>;
};

@Injectable()
export class OnboardingSagaService {
  constructor(
    @Inject(TenantRepository)
    private readonly tenantRepository: {
      create(data: Record<string, unknown>): Promise<{ id: string; slug: string; name: string }>;
      deleteById(id: string): Promise<void>;
      findBySlug?(slug: string): Promise<unknown | null>;
    },
    private readonly subscriptionService: SubscriptionService,
    @Inject(TCP_SERVICES.AUTHORIZER_SERVICE) private readonly authorizerClient: TcpClient,
    @Inject(TCP_SERVICES.USER_ACCESS_SERVICE) private readonly userClient: TcpClient,
    @Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient,
    @Inject(SaasOutboxRepository)
    private readonly outboxRepository: { createTenantCreated(input: Record<string, unknown>): Promise<void> },
    @Optional() @Inject(SlugService) private readonly slugService: SlugService = new SlugService(),
  ) {}

  async onboard(params: OnboardTenantParams) {
    let tenant: { id: string; slug: string; name: string } | undefined;
    let ownerUserId: string | undefined;

    try {
      const slug = await this.slugService.generateUnique(params.slug ?? params.tenantName, async (candidate) => {
        if (!('findBySlug' in this.tenantRepository) || typeof this.tenantRepository.findBySlug !== 'function') {
          return false;
        }
        return Boolean(await this.tenantRepository.findBySlug(candidate));
      });
      const planCode = params.planCode ?? DEFAULT_PLAN_CODES.FREE;

      tenant = await this.tenantRepository.create({
        name: params.tenantName.trim(),
        slug,
        status: TenantStatus.ACTIVE,
        isActive: true,
        type: params.type ?? 'RESTAURANT',
        address: params.address ?? null,
        defaultCurrency: 'VND',
        defaultLocale: 'vi-VN',
      });

      ownerUserId = await this.resolveTcp<{ data: string }>(
        this.authorizerClient.send(TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_USER, {
          data: {
            email: params.ownerEmail,
            password: params.ownerPassword,
            firstName: params.ownerFirstName ?? '',
            lastName: params.ownerLastName ?? '',
            tenantId: tenant.id,
          },
          processId: params.processId,
        }),
      ).then((res) => res.data);

      await this.resolveTcp(
        this.userClient.send(TCP_REQUEST_MESSAGE.USER.UPSERT_WITH_TENANT, {
          data: {
            userId: ownerUserId,
            email: params.ownerEmail,
            firstName: params.ownerFirstName ?? '',
            lastName: params.ownerLastName ?? '',
            tenantId: tenant.id,
            roleNames: ['OWNER'],
          },
          processId: params.processId,
        }),
      );

      await this.subscriptionService.assignPlan({
        tenantId: tenant.id,
        planCode,
        source: 'INITIAL_ONBOARDING',
        startsAt: new Date(),
        expiresAt: null,
      });

      await this.resolveTcp(
        this.paymentClient.send(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY, {
          tenantId: tenant.id,
          processId: params.processId,
        }),
      );

      await this.outboxRepository.createTenantCreated({
        tenantId: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        ownerUserId,
        ownerEmail: params.ownerEmail,
        ownerFirstName: params.ownerFirstName,
        ownerLastName: params.ownerLastName,
        planCode,
        processId: params.processId,
      });

      return { tenant, ownerUserId };
    } catch (error) {
      if (tenant) {
        await Promise.resolve(this.tenantRepository.deleteById(tenant.id)).catch(() => undefined);
      }
      throw error;
    }
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
}
