import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Session } from '@common/entities/session.entity';
import { RedisKey } from '@common/constants/redis-key.constants';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { UpdateTableStatusTcpRequest } from '@common/interfaces/tcp/catalog/table-request.interface';
import type { Table } from '@common/entities/table.entity';
import { SessionStatus } from '@einvoice/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { SESSION_POLICY } from '../constants/session-policy';
import { SessionRepository } from '../repositories/session.repository';

type SessionRedisFields = {
  tenantId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  status: string;
  startedAt: string;
  lastActivity: string;
  orderCount: string;
  closedAt: string;
};

@Injectable()
export class SessionService {
  constructor(
    private readonly redisClient: RedisClientService,
    private readonly sessionRepository: SessionRepository,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
  ) {}

  sessionKey(tenantId: string, sessionId: string): string {
    return RedisKey.session.data(tenantId, sessionId);
  }

  /**
   * Resolves an ACTIVE session for cart/order flows: Redis cache first, else PG,
   * then repopulates Redis. Applies idle-close only when orderCount === 0.
   */
  async getActiveSessionOrThrow(tenantId: string, sessionId: string): Promise<Session> {
    const session = await this.resolveActiveSession(tenantId, sessionId);
    if (!session) {
      throw new BusinessException(ErrorCode.SESSION_CLOSED, HttpStatus.GONE);
    }
    return session;
  }

  /** Refreshes PG `lastActivity` and Redis session/cart TTL after a successful cart write. */
  async touchAfterCartMutation(tenantId: string, sessionId: string): Promise<void> {
    const now = new Date();
    await this.sessionRepository.updateLastActivity(sessionId, tenantId, now);

    const redis = this.redisClient.getClient();
    const key = this.sessionKey(tenantId, sessionId);
    if ((await redis.exists(key)) === 1) {
      const type = await redis.type(key);
      if (type !== 'hash') {
        await redis.del(key);
        const row = await this.sessionRepository.findActiveByIdAndTenant(sessionId, tenantId);
        if (row) {
          await this.writeSessionRedis(redis, key, row);
          await redis.pexpire(key, SESSION_POLICY.TTL_MS);
        }
        return;
      }
      await redis.hset(key, 'lastActivity', now.toISOString());
      await redis.pexpire(key, SESSION_POLICY.TTL_MS);
    }
  }

  /** Updates activity timestamps when a guest rejoins an occupied table via QR (no cart mutation). */
  async touchCustomerSessionActivity(tenantId: string, sessionId: string): Promise<void> {
    await this.touchAfterCartMutation(tenantId, sessionId);
  }

  async closeAfterPayment(tenantId: string, sessionId: string, closedAt: Date): Promise<void> {
    await this.sessionRepository.markClosed(sessionId, tenantId, closedAt);
    const redis = this.redisClient.getClient();
    await redis.del(this.sessionKey(tenantId, sessionId));
    await redis.del(RedisKey.cart.data(tenantId, sessionId));
  }

  async releaseTableForClosedSession(tenantId: string, sessionId: string, tableId: string): Promise<boolean> {
    const session = await this.sessionRepository.findByIdAndTenant(sessionId, tenantId);
    if (
      !session ||
      session.status !== SessionStatus.CLOSED ||
      session.orderCount > 0 ||
      session.currentBillId ||
      session.tableId !== tableId
    ) {
      return false;
    }

    await this.releaseCatalogTable({
      id: tableId,
      tenantId,
      status: TABLE_STATUS.AVAILABLE,
      sessionId,
    });

    const redis = this.redisClient.getClient();
    await redis.del(this.sessionKey(tenantId, sessionId));
    await redis.del(RedisKey.cart.data(tenantId, sessionId));
    return true;
  }

  async releaseEmptyTableSession(tenantId: string, sessionId: string, tableId: string): Promise<boolean> {
    const session = await this.sessionRepository.findByIdAndTenant(sessionId, tenantId);
    if (!this.isReleasableEmptyTableSession(session, tableId)) {
      return false;
    }

    if (session.status === SessionStatus.CLOSED) {
      return this.releaseTableForClosedSession(tenantId, sessionId, tableId);
    }

    const closed = await this.sessionRepository.markActiveClosedIfEmpty(sessionId, tenantId, new Date());
    if (!closed) {
      return false;
    }

    await this.releaseCatalogTable({
      id: tableId,
      tenantId,
      status: TABLE_STATUS.AVAILABLE,
      sessionId,
    });

    const redis = this.redisClient.getClient();
    await redis.del(this.sessionKey(tenantId, sessionId));
    await redis.del(RedisKey.cart.data(tenantId, sessionId));
    return true;
  }

  async getSessionForReadOnlyBill(tenantId: string, sessionId: string): Promise<Session> {
    const session =
      (await this.sessionRepository.findActiveByIdAndTenant(sessionId, tenantId)) ??
      (await this.sessionRepository.findByIdAndTenant(sessionId, tenantId));
    if (!session) {
      throw new BusinessException(ErrorCode.SESSION_CLOSED, HttpStatus.GONE);
    }
    return session;
  }

  /** Updates cached session hash after table transfer (same session id / cart key). */
  async patchSessionTableInRedis(
    tenantId: string,
    sessionId: string,
    tableId: string,
    tableName: string,
  ): Promise<void> {
    const redis = this.redisClient.getClient();
    const key = this.sessionKey(tenantId, sessionId);
    if ((await redis.exists(key)) !== 1) {
      return;
    }
    if ((await redis.type(key)) !== 'hash') {
      await redis.del(key);
      return;
    }
    await redis.hset(key, { tableId, tableName });
    await redis.pexpire(key, SESSION_POLICY.TTL_MS);
  }

  private async resolveActiveSession(tenantId: string, sessionId: string): Promise<Session | null> {
    const redis = this.redisClient.getClient();
    const key = this.sessionKey(tenantId, sessionId);
    const cached = await this.readSessionHash(redis, key);
    if (cached && Object.keys(cached).length > 0) {
      const hydrated = this.parseSessionFromRedis(cached);
      if (!hydrated) {
        await redis.del(key);
      } else {
        const closed = await this.applyIdleCloseIfNeeded(hydrated, redis, key);
        if (closed) {
          return null;
        }
        await redis.pexpire(key, SESSION_POLICY.TTL_MS);
        return this.toSessionEntity(hydrated);
      }
    }

    const row = await this.sessionRepository.findActiveByIdAndTenant(sessionId, tenantId);
    if (!row) {
      return null;
    }

    if (await this.applyIdleCloseIfNeeded(this.entityToRedisFields(row), redis, key)) {
      return null;
    }

    await this.writeSessionRedis(redis, key, row);
    await redis.pexpire(key, SESSION_POLICY.TTL_MS);
    return row;
  }

  private async readSessionHash(redis: Redis, key: string): Promise<Record<string, string>> {
    try {
      return await redis.hgetall(key);
    } catch (error) {
      if (this.isWrongTypeRedisError(error)) {
        await redis.del(key);
        return {};
      }
      throw error;
    }
  }

  private entityToRedisFields(row: Session): SessionRedisFields {
    return {
      tenantId: row.tenantId,
      sessionId: row.id,
      tableId: row.tableId,
      tableName: row.tableName,
      status: row.status,
      startedAt: row.startedAt.toISOString(),
      lastActivity: row.lastActivity.toISOString(),
      orderCount: String(row.orderCount),
      closedAt: row.closedAt ? row.closedAt.toISOString() : '',
    };
  }

  private parseSessionFromRedis(raw: Record<string, string>): SessionRedisFields | null {
    const { tenantId, sessionId, tableId, tableName, status, startedAt, lastActivity, orderCount, closedAt } = raw;
    if (!tenantId || !sessionId || !tableId || !tableName || !status) {
      return null;
    }
    return {
      tenantId,
      sessionId,
      tableId,
      tableName,
      status,
      startedAt: startedAt || '',
      lastActivity: lastActivity || '',
      orderCount: orderCount ?? '0',
      closedAt: closedAt ?? '',
    };
  }

  private toSessionEntity(f: SessionRedisFields): Session {
    const row = new Session();
    row.id = f.sessionId;
    row.tenantId = f.tenantId;
    row.tableId = f.tableId;
    row.tableName = f.tableName;
    row.status = f.status as Session['status'];
    row.startedAt = new Date(f.startedAt);
    row.lastActivity = new Date(f.lastActivity);
    row.closedAt = f.closedAt ? new Date(f.closedAt) : null;
    row.orderCount = Number.parseInt(f.orderCount, 10) || 0;
    row.version = 1;
    row.currentBillId = null;
    return row;
  }

  private async writeSessionRedis(redis: Redis, key: string, row: Session): Promise<void> {
    const f = this.entityToRedisFields(row);
    await redis.hset(key, f as unknown as Record<string, string>);
  }

  private isReleasableEmptyTableSession(session: Session | null, tableId: string): session is Session {
    if (!session) {
      return false;
    }
    return (
      session.tableId === tableId &&
      session.orderCount === 0 &&
      !session.currentBillId &&
      (session.status === SessionStatus.ACTIVE || session.status === SessionStatus.CLOSED)
    );
  }

  private isWrongTypeRedisError(error: unknown): boolean {
    return error instanceof Error && error.message.includes('WRONGTYPE');
  }

  /**
   * @returns true when session was idle-closed in this call.
   */
  private async applyIdleCloseIfNeeded(fields: SessionRedisFields, redis: Redis, redisKey: string): Promise<boolean> {
    if (fields.status !== SessionStatus.ACTIVE) {
      return true;
    }

    const orderCount = Number.parseInt(fields.orderCount, 10) || 0;
    const lastActivity = new Date(fields.lastActivity).getTime();
    const idleMs = Date.now() - lastActivity;

    if (idleMs <= SESSION_POLICY.IDLE_CLOSE_MS) {
      return false;
    }

    if (orderCount > 0) {
      return false;
    }

    const durable = await this.sessionRepository.findActiveByIdAndTenant(fields.sessionId, fields.tenantId);
    if (durable && durable.orderCount > 0) {
      Object.assign(fields, this.entityToRedisFields(durable));
      await this.writeSessionRedis(redis, redisKey, durable);
      await redis.pexpire(redisKey, SESSION_POLICY.TTL_MS);
      return false;
    }

    const closedAt = new Date();
    const staleBefore = new Date(closedAt.getTime() - SESSION_POLICY.IDLE_CLOSE_MS);
    const closed = await this.sessionRepository.markIdleClosedIfEmptyAndStale(
      fields.sessionId,
      fields.tenantId,
      staleBefore,
      closedAt,
    );
    if (!closed) {
      const latest = await this.sessionRepository.findActiveByIdAndTenant(fields.sessionId, fields.tenantId);
      if (!latest) {
        await redis.del(redisKey);
        await redis.del(RedisKey.cart.data(fields.tenantId, fields.sessionId));
        return true;
      }
      Object.assign(fields, this.entityToRedisFields(latest));
      await this.writeSessionRedis(redis, redisKey, latest);
      await redis.pexpire(redisKey, SESSION_POLICY.TTL_MS);
      return false;
    }

    await this.releaseCatalogTable({
      id: fields.tableId,
      tenantId: fields.tenantId,
      status: TABLE_STATUS.AVAILABLE,
      sessionId: fields.sessionId,
    });
    await redis.del(redisKey);
    await redis.del(RedisKey.cart.data(fields.tenantId, fields.sessionId));
    return true;
  }

  private async releaseCatalogTable(payload: UpdateTableStatusTcpRequest): Promise<void> {
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
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      if (error instanceof RpcException) {
        const rpcError = error.getError() as { code?: number; errorCode?: ErrorCode };
        if (rpcError?.errorCode) {
          throw new BusinessException(rpcError.errorCode, (rpcError.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
        }
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }
}
