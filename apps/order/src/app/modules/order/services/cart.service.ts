import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { ValidateOrderableTcpRequest } from '@common/interfaces/tcp/catalog/menu-item-request.interface';
import type { OrderableMenuItemSnapshot } from '@common/interfaces/tcp/catalog/menu-item-response.interface';
import type { CartMutateTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { CartLine, CartSnapshot, CartUpdatedEvent, PreparationStation } from '@einvoice/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import type Redis from 'ioredis';
import { SESSION_POLICY } from '../constants/session-policy';
import { SessionService } from './session.service';

@Injectable()
export class CartService {
  constructor(
    private readonly redisClient: RedisClientService,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    private readonly sessionService: SessionService,
  ) {}

  cartKey(tenantId: string, sessionId: string): string {
    return `cart:${tenantId}:${sessionId}`;
  }

  async getSnapshot(tenantId: string, sessionId: string): Promise<CartSnapshot> {
    await this.sessionService.getActiveSessionOrThrow(tenantId, sessionId);
    const redis = this.redisClient.getClient();
    const snapshot = await this.loadSnapshot(redis, tenantId, sessionId);
    await redis.pexpire(this.cartKey(tenantId, sessionId), SESSION_POLICY.TTL_MS);
    return snapshot;
  }

  async mutate(input: CartMutateTcpRequest): Promise<CartUpdatedEvent> {
    await this.sessionService.getActiveSessionOrThrow(input.tenantId, input.sessionId);

    const redis = this.redisClient.getClient();
    const key = this.cartKey(input.tenantId, input.sessionId);

    const snapshot = await this.loadSnapshot(redis, input.tenantId, input.sessionId);

    if (snapshot.status === 'LOCKED') {
      throw new BusinessException(ErrorCode.CART_LOCKED, HttpStatus.CONFLICT);
    }

    if (snapshot.cartVersion !== input.expectedCartVersion) {
      throw new BusinessException(ErrorCode.CART_VERSION_CONFLICT, HttpStatus.CONFLICT);
    }

    const next = await this.applyOperation(snapshot, input);
    next.cartVersion = snapshot.cartVersion + 1;
    next.updatedAt = new Date().toISOString();

    await this.persistAtomic(redis, key, next);
    await this.sessionService.touchAfterCartMutation(input.tenantId, input.sessionId);

    return this.toCartUpdatedEvent(next, input.sessionClientId);
  }

  async lockCart(tenantId: string, sessionId: string, expectedCartVersion: number): Promise<CartUpdatedEvent> {
    await this.sessionService.getActiveSessionOrThrow(tenantId, sessionId);
    const redis = this.redisClient.getClient();
    const key = this.cartKey(tenantId, sessionId);
    const snapshot = await this.loadSnapshot(redis, tenantId, sessionId);
    if (snapshot.status === 'LOCKED') {
      throw new BusinessException(ErrorCode.CART_LOCKED, HttpStatus.CONFLICT);
    }
    if (snapshot.cartVersion !== expectedCartVersion) {
      throw new BusinessException(ErrorCode.CART_VERSION_CONFLICT, HttpStatus.CONFLICT);
    }
    const next: CartSnapshot = {
      ...snapshot,
      status: 'LOCKED',
      cartVersion: snapshot.cartVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.persistAtomic(redis, key, next);
    await this.sessionService.touchAfterCartMutation(tenantId, sessionId);
    return this.toCartUpdatedEvent(next);
  }

  /** Staff reopen bill (OPEN) — restore cart from LOCKED to ACTIVE without clearing lines. */
  async unlockCartForBillReopen(tenantId: string, sessionId: string): Promise<CartUpdatedEvent> {
    await this.sessionService.getActiveSessionOrThrow(tenantId, sessionId);
    const redis = this.redisClient.getClient();
    const key = this.cartKey(tenantId, sessionId);
    const snapshot = await this.loadSnapshot(redis, tenantId, sessionId);
    if (snapshot.status !== 'LOCKED') {
      return this.toCartUpdatedEvent(snapshot);
    }
    const next: CartSnapshot = {
      ...snapshot,
      status: 'ACTIVE',
      cartVersion: snapshot.cartVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.persistAtomic(redis, key, next);
    await this.sessionService.touchAfterCartMutation(tenantId, sessionId);
    return this.toCartUpdatedEvent(next);
  }

  private toCartUpdatedEvent(snapshot: CartSnapshot, changedBySessionClientId?: string): CartUpdatedEvent {
    return {
      tenantId: snapshot.tenantId,
      sessionId: snapshot.sessionId,
      cartVersion: snapshot.cartVersion,
      status: snapshot.status,
      items: snapshot.items,
      updatedAt: snapshot.updatedAt,
      changedBySessionClientId,
    };
  }

  private async loadSnapshot(redis: Redis, tenantId: string, sessionId: string): Promise<CartSnapshot> {
    const key = this.cartKey(tenantId, sessionId);
    const raw = await redis.hgetall(key);
    if (!raw || Object.keys(raw).length === 0) {
      return this.emptyCart(tenantId, sessionId);
    }
    return this.parseSnapshot(raw, tenantId, sessionId);
  }

  private emptyCart(tenantId: string, sessionId: string): CartSnapshot {
    return {
      tenantId,
      sessionId,
      cartVersion: 0,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString(),
      items: [],
    };
  }

  private parseSnapshot(raw: Record<string, string>, tenantId: string, sessionId: string): CartSnapshot {
    let items: CartLine[] = [];
    try {
      items = JSON.parse(raw['items'] || '[]') as CartLine[];
    } catch {
      items = [];
    }
    return {
      tenantId: raw['tenantId'] || tenantId,
      sessionId: raw['sessionId'] || sessionId,
      cartVersion: Number.parseInt(raw['cartVersion'] ?? '0', 10) || 0,
      status: (raw['status'] as CartSnapshot['status']) || 'ACTIVE',
      updatedAt: raw['updatedAt'] || new Date().toISOString(),
      items,
    };
  }

  private async persistAtomic(redis: Redis, key: string, snapshot: CartSnapshot): Promise<void> {
    const multi = redis.multi();
    multi.hset(key, {
      tenantId: snapshot.tenantId,
      sessionId: snapshot.sessionId,
      cartVersion: String(snapshot.cartVersion),
      status: snapshot.status,
      updatedAt: snapshot.updatedAt,
      items: JSON.stringify(snapshot.items),
    });
    multi.pexpire(key, SESSION_POLICY.TTL_MS);
    await multi.exec();
  }

  private async applyOperation(snapshot: CartSnapshot, input: CartMutateTcpRequest): Promise<CartSnapshot> {
    const items = [...snapshot.items];

    switch (input.operation) {
      case 'ADD_ITEM': {
        if (!input.menuItemId || !input.quantity || input.quantity < 1) {
          throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
        }
        const line = await this.buildLineFromCatalog(input.tenantId, input.menuItemId, input.quantity, input.note);
        items.push(line);
        return { ...snapshot, items };
      }
      case 'SET_QUANTITY': {
        if (!input.cartLineId || input.quantity === undefined || input.quantity < 0) {
          throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
        }
        const idx = items.findIndex((l) => l.cartLineId === input.cartLineId);
        if (idx < 0) {
          throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
        }
        if (input.quantity === 0) {
          items.splice(idx, 1);
        } else {
          items[idx] = { ...items[idx], quantity: input.quantity, lineVersion: items[idx].lineVersion + 1 };
        }
        return { ...snapshot, items };
      }
      case 'UPDATE_NOTE': {
        if (!input.cartLineId) {
          throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
        }
        const idx = items.findIndex((l) => l.cartLineId === input.cartLineId);
        if (idx < 0) {
          throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
        }
        const note = this.normalizeNote(input.note);
        items[idx] = { ...items[idx], note, lineVersion: items[idx].lineVersion + 1 };
        return { ...snapshot, items };
      }
      case 'REMOVE_LINE': {
        if (!input.cartLineId) {
          throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
        }
        const filtered = items.filter((l) => l.cartLineId !== input.cartLineId);
        if (filtered.length === items.length) {
          throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
        }
        return { ...snapshot, items: filtered };
      }
      case 'CLEAR':
        return { ...snapshot, items: [] };
      default:
        throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
    }
  }

  private normalizeNote(note?: string): string | undefined {
    if (note === undefined) {
      return undefined;
    }
    const t = note.trim();
    if (!t) {
      return undefined;
    }
    return t.slice(0, 255);
  }

  private async buildLineFromCatalog(
    tenantId: string,
    menuItemId: string,
    quantity: number,
    note?: string,
  ): Promise<CartLine> {
    const payload: ValidateOrderableTcpRequest = {
      tenantId,
      items: [{ menuItemId, quantity }],
    };

    const response = await firstValueFrom(
      this.catalogClient.send<OrderableMenuItemSnapshot[], ValidateOrderableTcpRequest>(
        TCP_REQUEST_MESSAGE.MENU_ITEM.VALIDATE_ORDERABLE,
        new Request<ValidateOrderableTcpRequest>({ tenantId, data: payload }),
      ),
    );

    const row = this.unwrapTcpData(response)[0];
    if (!row) {
      throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_ORDERABLE, HttpStatus.CONFLICT, { menuItemId });
    }

    return {
      cartLineId: randomUUID(),
      menuItemId: row.menuItemId,
      menuItemName: row.menuItemName,
      menuItemImageUrl: row.menuItemImageUrl ?? null,
      quantity,
      unitPrice: Math.round(Number(row.unitPrice)),
      note: this.normalizeNote(note),
      station: row.station as PreparationStation,
      lineVersion: 1,
    };
  }

  private unwrapTcpData<T>(response: ResponseType<T>): T {
    if (response.statusCode >= 400) {
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
    if (response.data === undefined || response.data === null) {
      return [] as unknown as T;
    }
    return response.data;
  }
}
