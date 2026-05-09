import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../services/session.service';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { SessionRepository } from '../repositories/session.repository';
import { Session } from '@common/entities/session.entity';
import { SessionStatus } from '@einvoice/types';
import { ErrorCode } from '@common/error-messages/error-code.enum';

describe('SessionService', () => {
  let service: SessionService;
  let redis: {
    hgetall: jest.Mock;
    pexpire: jest.Mock;
    del: jest.Mock;
    hset: jest.Mock;
    exists: jest.Mock;
    type: jest.Mock;
  };
  let sessionRepo: { findActiveByIdAndTenant: jest.Mock; updateLastActivity: jest.Mock; markClosed: jest.Mock };

  beforeEach(async () => {
    redis = {
      hgetall: jest.fn(),
      pexpire: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      hset: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(0),
      type: jest.fn().mockResolvedValue('none'),
    };
    sessionRepo = {
      findActiveByIdAndTenant: jest.fn(),
      updateLastActivity: jest.fn().mockResolvedValue(undefined),
      markClosed: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: RedisClientService, useValue: { getClient: () => redis } },
        { provide: SessionRepository, useValue: sessionRepo },
      ],
    }).compile();

    service = module.get(SessionService);
  });

  it('throws SESSION_CLOSED when no active session in Redis or PG', async () => {
    redis.hgetall.mockResolvedValue({});
    sessionRepo.findActiveByIdAndTenant.mockResolvedValue(null);

    await expect(service.getActiveSessionOrThrow('tenant-1', 'sess-x')).rejects.toMatchObject({
      errorCode: ErrorCode.SESSION_CLOSED,
    });
  });

  it('returns session from Redis cache when fresh', async () => {
    const now = new Date().toISOString();
    redis.hgetall.mockResolvedValue({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      tableId: '00000000-0000-4000-8000-000000000001',
      tableName: 'T1',
      status: SessionStatus.ACTIVE,
      startedAt: now,
      lastActivity: now,
      orderCount: '0',
      closedAt: '',
    });

    const row = await service.getActiveSessionOrThrow('tenant-1', 'sess-1');
    expect(row.id).toBe('sess-1');
    expect(sessionRepo.findActiveByIdAndTenant).not.toHaveBeenCalled();
    expect(redis.pexpire).toHaveBeenCalled();
  });

  it('hydrates from PostgreSQL on Redis miss', async () => {
    redis.hgetall.mockResolvedValue({});
    const entity = {
      id: 'sess-1',
      tenantId: 'tenant-1',
      tableId: '00000000-0000-4000-8000-000000000001',
      tableName: 'T1',
      status: SessionStatus.ACTIVE,
      startedAt: new Date(),
      lastActivity: new Date(),
      closedAt: null,
      orderCount: 0,
    } as Session;
    sessionRepo.findActiveByIdAndTenant.mockResolvedValue(entity);

    const row = await service.getActiveSessionOrThrow('tenant-1', 'sess-1');
    expect(row).toEqual(entity);
    expect(redis.hset).toHaveBeenCalled();
    expect(redis.pexpire).toHaveBeenCalled();
  });

  it('deletes a wrong-type Redis session key and hydrates the Order session from PostgreSQL', async () => {
    const wrongType = new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    redis.hgetall.mockRejectedValueOnce(wrongType).mockResolvedValueOnce({});
    const entity = {
      id: 'sess-1',
      tenantId: 'tenant-1',
      tableId: '00000000-0000-4000-8000-000000000001',
      tableName: 'T1',
      status: SessionStatus.ACTIVE,
      startedAt: new Date(),
      lastActivity: new Date(),
      closedAt: null,
      orderCount: 0,
    } as Session;
    sessionRepo.findActiveByIdAndTenant.mockResolvedValue(entity);

    const row = await service.getActiveSessionOrThrow('tenant-1', 'sess-1');

    expect(row).toEqual(entity);
    expect(redis.del).toHaveBeenCalledWith('session:tenant-1:sess-1');
    expect(redis.hset).toHaveBeenCalled();
  });

  it('idle-closes session when orderCount is 0 and lastActivity is stale', async () => {
    const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    redis.hgetall.mockResolvedValue({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      tableId: '00000000-0000-4000-8000-000000000001',
      tableName: 'T1',
      status: SessionStatus.ACTIVE,
      startedAt: stale,
      lastActivity: stale,
      orderCount: '0',
      closedAt: '',
    });

    await expect(service.getActiveSessionOrThrow('tenant-1', 'sess-1')).rejects.toMatchObject({
      errorCode: ErrorCode.SESSION_CLOSED,
    });
    expect(sessionRepo.markClosed).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalled();
  });

  it('refreshes stale Redis orderCount from PostgreSQL instead of idle-closing a session with orders', async () => {
    const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    redis.hgetall.mockResolvedValue({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      tableId: '00000000-0000-4000-8000-000000000001',
      tableName: 'T1',
      status: SessionStatus.ACTIVE,
      startedAt: stale,
      lastActivity: stale,
      orderCount: '0',
      closedAt: '',
    });
    const entity = {
      id: 'sess-1',
      tenantId: 'tenant-1',
      tableId: '00000000-0000-4000-8000-000000000001',
      tableName: 'T1',
      status: SessionStatus.ACTIVE,
      startedAt: new Date(stale),
      lastActivity: new Date(stale),
      closedAt: null,
      orderCount: 3,
    } as Session;
    sessionRepo.findActiveByIdAndTenant.mockResolvedValue(entity);

    const row = await service.getActiveSessionOrThrow('tenant-1', 'sess-1');

    expect(row.orderCount).toBe(3);
    expect(sessionRepo.markClosed).not.toHaveBeenCalled();
    expect(redis.hset).toHaveBeenCalledWith('session:tenant-1:sess-1', expect.objectContaining({ orderCount: '3' }));
    expect(redis.del).not.toHaveBeenCalledWith('cart:tenant-1:sess-1');
  });

  it('closes durable session and removes active Redis session/cart keys after payment', async () => {
    await service.closeAfterPayment('t1', 'sess-1', new Date('2026-05-08T12:00:00.000Z'));

    expect(sessionRepo.markClosed).toHaveBeenCalledWith('sess-1', 't1', new Date('2026-05-08T12:00:00.000Z'));
    expect(redis.del).toHaveBeenCalledWith('session:t1:sess-1');
    expect(redis.del).toHaveBeenCalledWith('cart:t1:sess-1');
  });

  it('does not idle-close when orderCount > 0 even if stale', async () => {
    const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    redis.hgetall.mockResolvedValue({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      tableId: '00000000-0000-4000-8000-000000000001',
      tableName: 'T1',
      status: SessionStatus.ACTIVE,
      startedAt: stale,
      lastActivity: stale,
      orderCount: '2',
      closedAt: '',
    });

    const row = await service.getActiveSessionOrThrow('tenant-1', 'sess-1');
    expect(row.orderCount).toBe(2);
    expect(sessionRepo.markClosed).not.toHaveBeenCalled();
  });
});
