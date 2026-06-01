import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { TenantSubscriptionContext } from '@common/guards/tenant-subscription.context';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { firstValueFrom } from 'rxjs';

type DashboardSubscriptionPayload = {
  current?: {
    planCode?: string;
    status?: string;
    features?: string[];
  } | null;
};

@Injectable()
export class TenantSubscriptionResolver {
  constructor(@Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient) {}

  async resolve(tenantId: string, req: Request): Promise<TenantSubscriptionContext | null> {
    const processId = randomUUID();
    const userData = req[MetadataKey.USER_DATA] as AuthorizeResponse | undefined;
    const requestedByUserId = userData?.metadata?.userId ?? 'bff-plan-feature-guard';

    const response = await firstValueFrom(
      this.saasClient.send(
        TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
        buildTcpRequestContext(req, processId, { tenantId, requestedByUserId }),
      ),
    );

    const payload = response.data as DashboardSubscriptionPayload | undefined;
    const current = payload?.current;
    if (!current?.status) {
      return null;
    }

    return {
      status: current.status,
      planCode: current.planCode ?? null,
      features: Array.isArray(current.features) ? current.features : [],
    };
  }

  /** Convenience for tests — validates ACTIVE without feature list. */
  isActive(context: TenantSubscriptionContext | null): boolean {
    return context?.status === SubscriptionStatus.ACTIVE;
  }
}
