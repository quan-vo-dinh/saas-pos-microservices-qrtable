import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from '../services/cart.service';
import { SessionService } from '../services/session.service';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { of } from 'rxjs';

describe('CartService', () => {
  let service: CartService;
  let redis: { hgetall: jest.Mock; pexpire: jest.Mock; multi: jest.Mock };
  let catalog: { send: jest.Mock };
  let sessionService: { getActiveSessionOrThrow: jest.Mock; touchAfterCartMutation: jest.Mock };

  const baseSnapshot = {
    tenantId: 'tenant-1',
    sessionId: 'sess-1',
    cartVersion: '2',
    status: 'ACTIVE',
    updatedAt: '2026-04-28T00:00:00.000Z',
    items: JSON.stringify([]),
  };

  beforeEach(async () => {
    const exec = jest.fn().mockResolvedValue([[null, 'OK']]);
    const multi = {
      hset: jest.fn().mockReturnThis(),
      pexpire: jest.fn().mockReturnThis(),
      exec,
    };
    redis = {
      hgetall: jest.fn(),
      pexpire: jest.fn().mockResolvedValue(1),
      multi: jest.fn(() => multi),
    };
    catalog = { send: jest.fn() };
    sessionService = {
      getActiveSessionOrThrow: jest.fn().mockResolvedValue({ id: 'sess-1' }),
      touchAfterCartMutation: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: RedisClientService, useValue: { getClient: () => redis } },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalog },
        { provide: SessionService, useValue: sessionService },
      ],
    }).compile();

    service = module.get(CartService);
  });

  it('rejects cart mutation when expectedCartVersion does not match', async () => {
    redis.hgetall.mockResolvedValue({
      ...baseSnapshot,
      cartVersion: '3',
    });

    await expect(
      service.mutate({
        tenantId: 'tenant-1',
        sessionId: 'sess-1',
        expectedCartVersion: 2,
        operation: 'CLEAR',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.CART_VERSION_CONFLICT });
  });

  it('rejects mutations when cart is LOCKED', async () => {
    redis.hgetall.mockResolvedValue({
      ...baseSnapshot,
      status: 'LOCKED',
      cartVersion: '1',
    });

    await expect(
      service.mutate({
        tenantId: 'tenant-1',
        sessionId: 'sess-1',
        expectedCartVersion: 1,
        operation: 'CLEAR',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.CART_LOCKED });
  });

  it('CLEAR increments cartVersion and persists', async () => {
    redis.hgetall.mockResolvedValue({
      ...baseSnapshot,
      cartVersion: '2',
    });

    const result = await service.mutate({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      expectedCartVersion: 2,
      operation: 'CLEAR',
    });

    expect(result.cartVersion).toBe(3);
    expect(result.items).toEqual([]);
    expect(redis.multi).toHaveBeenCalled();
    expect(sessionService.touchAfterCartMutation).toHaveBeenCalledWith('tenant-1', 'sess-1');
  });

  it('normalizes duplicate Redis cart lines when reading a snapshot', async () => {
    redis.hgetall.mockResolvedValue({
      ...baseSnapshot,
      items: JSON.stringify([
        {
          cartLineId: 'line-1',
          menuItemId: 'mi-1',
          menuItemName: 'Pho',
          quantity: 1,
          unitPrice: 65000,
          note: ' no onions ',
          station: 'KITCHEN',
          lineVersion: 1,
        },
        {
          cartLineId: 'line-2',
          menuItemId: 'mi-1',
          menuItemName: 'Pho',
          quantity: 2,
          unitPrice: 65000,
          note: 'no onions',
          station: 'KITCHEN',
          lineVersion: 1,
        },
      ]),
    });

    const result = await service.getSnapshot('tenant-1', 'sess-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        cartLineId: 'line-1',
        menuItemId: 'mi-1',
        quantity: 3,
        note: 'no onions',
      }),
    );
  });

  it('ADD_ITEM calls Catalog validate and appends line', async () => {
    redis.hgetall.mockResolvedValue({
      ...baseSnapshot,
      cartVersion: '0',
    });

    catalog.send.mockReturnValue(
      of({
        statusCode: 200,
        data: [
          {
            menuItemId: 'mi-1',
            menuItemName: 'Pho',
            unitPrice: 65000,
            status: 'available',
            stock: 10,
            station: 'KITCHEN',
            menuItemImageUrl: 'https://cdn.example.com/pho.jpg',
          },
        ],
      }),
    );

    const result = await service.mutate({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      operation: 'ADD_ITEM',
      menuItemId: 'mi-1',
      quantity: 2,
      note: ' no onions ',
    });

    expect(catalog.send).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].menuItemId).toBe('mi-1');
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[0].unitPrice).toBe(65000);
    expect(result.items[0].menuItemImageUrl).toBe('https://cdn.example.com/pho.jpg');
    expect(result.cartVersion).toBe(1);
  });

  it('ADD_ITEM increments an existing line when menu item and note match', async () => {
    redis.hgetall.mockResolvedValue({
      ...baseSnapshot,
      cartVersion: '4',
      items: JSON.stringify([
        {
          cartLineId: 'line-1',
          menuItemId: 'mi-1',
          menuItemName: 'Pho',
          menuItemImageUrl: 'https://cdn.example.com/pho.jpg',
          quantity: 2,
          unitPrice: 65000,
          note: 'no onions',
          station: 'KITCHEN',
          lineVersion: 1,
        },
      ]),
    });

    catalog.send.mockReturnValue(
      of({
        statusCode: 200,
        data: [
          {
            menuItemId: 'mi-1',
            menuItemName: 'Pho',
            unitPrice: 65000,
            status: 'available',
            stock: 10,
            station: 'KITCHEN',
            menuItemImageUrl: 'https://cdn.example.com/pho.jpg',
          },
        ],
      }),
    );

    const result = await service.mutate({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      expectedCartVersion: 4,
      operation: 'ADD_ITEM',
      menuItemId: 'mi-1',
      quantity: 3,
      note: ' no onions ',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        cartLineId: 'line-1',
        menuItemId: 'mi-1',
        quantity: 5,
        note: 'no onions',
        lineVersion: 2,
      }),
    );
    expect(result.cartVersion).toBe(5);
  });
});
