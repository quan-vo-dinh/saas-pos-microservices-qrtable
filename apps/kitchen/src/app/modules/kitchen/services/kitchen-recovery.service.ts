import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { KdsRebuildTenantTcpRequest, KdsRebuildTenantTcpResponse } from '@common/interfaces/tcp/kitchen';
import type { KdsActiveOrdersGetTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { KdsActiveOrdersGetTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import { Inject, Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { KdsRedisRepository } from '../repositories/kds-redis.repository';
import { KitchenEventsPublisher } from './kitchen-events.publisher';

@Injectable()
export class KitchenRecoveryService {
  constructor(
    @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
    private readonly repository: KdsRedisRepository,
    private readonly eventsPublisher: KitchenEventsPublisher,
  ) {}

  async rebuildTenant(request: KdsRebuildTenantTcpRequest): Promise<KdsRebuildTenantTcpResponse> {
    const locked = await this.repository.tryAcquireRebuildLock(request.tenantId, request.requestId);
    if (!locked) {
      return {
        tenantId: request.tenantId,
        station: request.station,
        rebuiltTickets: 0,
        revision: 0,
      };
    }

    try {
      const tcp = await firstValueFrom(
        this.orderClient.send<KdsActiveOrdersGetTcpResponse, KdsActiveOrdersGetTcpRequest>(
          TCP_REQUEST_MESSAGE.ORDER.KDS_ACTIVE_ORDERS_GET,
          new Request<KdsActiveOrdersGetTcpRequest>({
            data: {
              tenantId: request.tenantId,
              station: request.station,
            },
          }),
        ),
      );

      const snapshots = tcp.data ?? [];
      const { events, rebuiltCount } = await this.repository.rebuildMissingTicketsFromSnapshots(
        snapshots,
        request.station,
      );
      await this.eventsPublisher.publishMany(events);
      const revision = events.reduce((max, e) => Math.max(max, e.revision), 0);

      return {
        tenantId: request.tenantId,
        station: request.station,
        rebuiltTickets: rebuiltCount,
        revision,
      };
    } finally {
      await this.repository.releaseRebuildLockIfHeld(request.tenantId, request.requestId);
    }
  }
}
