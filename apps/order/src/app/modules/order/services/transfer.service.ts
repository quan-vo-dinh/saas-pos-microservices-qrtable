import { Session } from '@common/entities/session.entity';
import { Table } from '@common/entities/table.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { GetTableByIdTcpRequest } from '@common/interfaces/tcp/catalog/table-request.interface';
import type { UpdateTableStatusTcpRequest } from '@common/interfaces/tcp/catalog/table-request.interface';
import type { TransferTableTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { TableTransferredTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import type { Session as SessionDto } from '@einvoice/types';
import { SessionStatus, TableTransferredEvent } from '@einvoice/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { OrderRepository } from '../repositories/order.repository';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionService } from './session.service';

const LOCK_TTL_MS = 30_000;

@Injectable()
export class TransferService {
  constructor(
    private readonly redisClient: RedisClientService,
    private readonly dataSource: DataSource,
    private readonly sessionRepository: SessionRepository,
    private readonly orderRepository: OrderRepository,
    private readonly serviceRequestRepository: ServiceRequestRepository,
    private readonly sessionService: SessionService,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
  ) {}

  async transferTable(dto: TransferTableTcpRequest): Promise<TableTransferredTcpResponse> {
    const redis = this.redisClient.getClient();
    const lockKeys = [
      `transfer:${dto.tenantId}:${dto.sessionId}`,
      `table-transfer:${dto.tenantId}:${dto.fromTableId}`,
      `table-transfer:${dto.tenantId}:${dto.toTableId}`,
    ];
    const acquired: string[] = [];

    try {
      for (const key of lockKeys) {
        const ok = await redis.set(key, dto.requestId, 'PX', LOCK_TTL_MS, 'NX');
        if (ok !== 'OK') {
          throw new BusinessException(ErrorCode.TRANSFER_LOCK_FAILED, HttpStatus.CONFLICT);
        }
        acquired.push(key);
      }

      const session = await this.sessionRepository.findActiveByIdAndTenant(dto.sessionId, dto.tenantId);
      if (!session || session.tableId !== dto.fromTableId) {
        throw new BusinessException(ErrorCode.TRANSFER_SESSION_TABLE_MISMATCH, HttpStatus.CONFLICT);
      }

      const toTable = await this.catalogGetTableById({ id: dto.toTableId, tenantId: dto.tenantId });
      if (toTable.status !== TABLE_STATUS.AVAILABLE) {
        throw new BusinessException(ErrorCode.TRANSFER_DESTINATION_INVALID, HttpStatus.CONFLICT);
      }

      await this.dataSource.transaction(async (manager) => {
        await manager
          .getRepository(Session)
          .update(
            { id: dto.sessionId, tenantId: dto.tenantId },
            { tableId: dto.toTableId, tableName: toTable.name, lastActivity: new Date() },
          );
        await this.orderRepository.updateTableForSession(
          dto.sessionId,
          dto.tenantId,
          dto.toTableId,
          toTable.name,
          manager,
        );
        await this.serviceRequestRepository.updateTableForSession(
          dto.sessionId,
          dto.tenantId,
          dto.toTableId,
          toTable.name,
          manager,
        );
      });

      await this.catalogUpdateTableStatus({
        id: dto.fromTableId,
        tenantId: dto.tenantId,
        status: TABLE_STATUS.AVAILABLE,
      });
      await this.catalogUpdateTableStatus({
        id: dto.toTableId,
        tenantId: dto.tenantId,
        status: TABLE_STATUS.OCCUPIED,
        sessionId: dto.sessionId,
      });

      await this.sessionService.patchSessionTableInRedis(dto.tenantId, dto.sessionId, dto.toTableId, toTable.name);

      const updated = await this.sessionRepository.findByIdAndTenant(dto.sessionId, dto.tenantId);
      if (!updated) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const tableTransferred: TableTransferredEvent = {
        tenantId: dto.tenantId,
        sessionId: dto.sessionId,
        fromTableId: dto.fromTableId,
        fromTableName: session.tableName,
        toTableId: dto.toTableId,
        toTableName: toTable.name,
        transferredByUserId: dto.userId,
        timestamp: new Date().toISOString(),
      };

      return {
        session: this.toSessionDto(updated),
        events: { tableTransferred },
      };
    } finally {
      for (const key of acquired) {
        const v = await redis.get(key);
        if (v === dto.requestId) {
          await redis.del(key);
        }
      }
    }
  }

  private async catalogGetTableById(payload: GetTableByIdTcpRequest): Promise<Table> {
    try {
      const response = await firstValueFrom(
        this.catalogClient.send<ResponseType<Table>, GetTableByIdTcpRequest>(
          TCP_REQUEST_MESSAGE.TABLE.GET_BY_ID,
          new Request<GetTableByIdTcpRequest>({ tenantId: payload.tenantId, data: payload }),
        ),
      );
      if (response.statusCode >= 400 || !response.data) {
        throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return response.data as unknown as Table;
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      if (e instanceof RpcException) {
        const err = e.getError() as { code?: number; errorCode?: ErrorCode };
        if (err?.errorCode) {
          throw new BusinessException(err.errorCode, (err.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
        }
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }

  private async catalogUpdateTableStatus(payload: UpdateTableStatusTcpRequest): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.catalogClient.send<ResponseType<Table>, UpdateTableStatusTcpRequest>(
          TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS,
          new Request<UpdateTableStatusTcpRequest>({ tenantId: payload.tenantId, data: payload }),
        ),
      );
      if (response.statusCode >= 400) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, response.statusCode as HttpStatus);
      }
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      if (e instanceof RpcException) {
        const err = e.getError() as { code?: number; errorCode?: ErrorCode };
        if (err?.errorCode) {
          throw new BusinessException(err.errorCode, (err.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
        }
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }

  private toSessionDto(row: Session): SessionDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tableId: row.tableId,
      tableName: row.tableName,
      status: row.status as SessionStatus,
      startedAt: row.startedAt.toISOString(),
      lastActivity: row.lastActivity.toISOString(),
      closedAt: row.closedAt?.toISOString(),
      orderCount: row.orderCount,
    };
  }
}
