import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Session } from '@common/entities/session.entity';
import { SessionStatus } from '@einvoice/types';
import { HttpStatus, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
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
  ) {}

  sessionKey(tenantId: string, sessionId: string): string {
    return `session:${tenantId}:${sessionId}`;
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
      await redis.hset(key, 'lastActivity', now.toISOString());
      await redis.pexpire(key, SESSION_POLICY.TTL_MS);
    }
  }

  private async resolveActiveSession(tenantId: string, sessionId: string): Promise<Session | null> {
    const redis = this.redisClient.getClient();
    const key = this.sessionKey(tenantId, sessionId);
    const cached = await redis.hgetall(key);
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

    const closedAt = new Date();
    await this.sessionRepository.markClosed(fields.sessionId, fields.tenantId, closedAt);
    await redis.del(redisKey);
    await redis.del(`cart:${fields.tenantId}:${fields.sessionId}`);
    return true;
  }
}
