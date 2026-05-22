import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { Session } from '@common/entities/session.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { BillStatus, OrderItemStatus, OrderStatus, SessionStatus } from '@einvoice/types';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { DataSource } from 'typeorm';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CartService } from '../services/cart.service';
import { OrderQuotaService } from '../services/order-quota.service';
import { OrderSubmitService } from '../services/order-submit.service';
import { SessionService } from '../services/session.service';

describe('OrderSubmitService', () => {
  let service: OrderSubmitService;
  let dataSource: { transaction: jest.Mock };
  let orderRepository: {
    findByIdempotencyKey: jest.Mock;
    findByOrderIdAndTenant?: jest.Mock;
  };
  let orderItemRepository: { findByOrderIdAndTenant: jest.Mock };
  let billRepository: { findByIdAndTenant: jest.Mock; findByIdAndTenantForUpdate: jest.Mock };
  let sessionRepository: { findByIdAndTenant: jest.Mock };
  let cartService: { getSnapshot: jest.Mock; clearForSubmittedOrder: jest.Mock };
  let sessionService: { getActiveSessionOrThrow: jest.Mock };
  let catalogClient: { send: jest.Mock };
  let saasClient: { send: jest.Mock };
  let orderQuotaService: {
    incrementDailyOrders: jest.Mock;
    decrementDailyOrders: jest.Mock;
  };

  beforeEach(async () => {
    dataSource = { transaction: jest.fn() };
    orderRepository = {
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
    };
    orderItemRepository = {
      findByOrderIdAndTenant: jest.fn(),
    };
    billRepository = {
      findByIdAndTenant: jest.fn(),
      findByIdAndTenantForUpdate: jest.fn(),
    };
    sessionRepository = { findByIdAndTenant: jest.fn() };
    cartService = { getSnapshot: jest.fn(), clearForSubmittedOrder: jest.fn() };
    sessionService = { getActiveSessionOrThrow: jest.fn() };
    catalogClient = { send: jest.fn() };
    saasClient = { send: jest.fn() };
    orderQuotaService = {
      incrementDailyOrders: jest.fn().mockResolvedValue(1),
      decrementDailyOrders: jest.fn().mockResolvedValue(0),
    };
    mockCurrentSubscriptionLimit(100);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderSubmitService,
        { provide: DataSource, useValue: dataSource },
        { provide: OrderRepository, useValue: orderRepository },
        { provide: OrderItemRepository, useValue: orderItemRepository },
        { provide: BillRepository, useValue: billRepository },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: CartService, useValue: cartService },
        { provide: SessionService, useValue: sessionService },
        { provide: OrderQuotaService, useValue: orderQuotaService },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
        { provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient },
      ],
    }).compile();

    service = module.get(OrderSubmitService);
  });

  it('rejects empty cart without starting a DB transaction', async () => {
    sessionService.getActiveSessionOrThrow.mockResolvedValue({ id: 's1' });
    cartService.getSnapshot.mockResolvedValue({
      tenantId: 't1',
      sessionId: 's1',
      cartVersion: 0,
      status: 'ACTIVE',
      updatedAt: '2026-04-30T00:00:00.000Z',
      items: [],
    });

    await expect(
      service.submitOrder({
        tenantId: 't1',
        sessionId: 's1',
        expectedCartVersion: 0,
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.ORDER_EMPTY_CART });

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects cart version mismatch', async () => {
    sessionService.getActiveSessionOrThrow.mockResolvedValue({ id: 's1' });
    cartService.getSnapshot.mockResolvedValue({
      tenantId: 't1',
      sessionId: 's1',
      cartVersion: 2,
      status: 'ACTIVE',
      updatedAt: '2026-04-30T00:00:00.000Z',
      items: [{ cartLineId: 'c1', menuItemId: 'm1', menuItemName: 'X', quantity: 1, unitPrice: 1, lineVersion: 1 }],
    });

    await expect(
      service.submitOrder({
        tenantId: 't1',
        sessionId: 's1',
        expectedCartVersion: 1,
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.CART_VERSION_CONFLICT });
  });

  it('creates PENDING order from cart snapshot and preserves menu item image snapshot', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const session = buildActiveSession(now);
    const { manager, savedOrderItems } = buildSubmitManager({ now, session });
    sessionService.getActiveSessionOrThrow.mockResolvedValue(session);
    mockCartWithOneItem(now, { menuItemImageUrl: 'https://cdn.example.com/pho.jpg' });
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.submitOrder({
      tenantId: 't1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      idempotencyKey: 'idem-1',
    });

    expect(manager.create).toHaveBeenCalledWith(
      Order,
      expect.objectContaining({
        tenantId: 't1',
        sessionId: 'sess-1',
        status: OrderStatus.PENDING,
        totalAmount: 65000,
        idempotencyKey: 'idem-1',
      }),
    );
    expect(savedOrderItems[0]).toMatchObject({
      menuItemId: 'menu-1',
      menuItemImageUrl: 'https://cdn.example.com/pho.jpg',
      status: OrderItemStatus.PROCESSING,
    });
    expect(result.order.status).toBe(OrderStatus.PENDING);
    expect(result.order.items[0].menuItemImageUrl).toBe('https://cdn.example.com/pho.jpg');
    expect(result.events.orderCreated.items[0].menuItemImageUrl).toBe('https://cdn.example.com/pho.jpg');
  });

  it('stores raw order item sum and leaves customer payable rounding to bill totals', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const session = buildActiveSession(now);
    const { manager } = buildSubmitManager({ now, session });
    sessionService.getActiveSessionOrThrow.mockResolvedValue(session);
    mockCartWithOneItem(now, { quantity: 3, unitPrice: 42_500 });
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.submitOrder({
      tenantId: 't1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      idempotencyKey: 'idem-1',
    });

    expect(result.order.totalAmount).toBe(127_500);
    expect(result.events.orderCreated.totalAmount).toBe(127_500);
    expect(result.bill.subtotal).toBe(127_500);
    expect(result.bill.total).toBe(128_000);
    expect(result.bill.roundingAmount).toBe(500);
  });

  it('deducts no stock until confirmation', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const session = buildActiveSession(now);
    const { manager } = buildSubmitManager({ now, session });
    sessionService.getActiveSessionOrThrow.mockResolvedValue(session);
    mockCartWithOneItem(now);
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await service.submitOrder({
      tenantId: 't1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      idempotencyKey: 'idem-1',
    });

    expect(catalogClient.send).not.toHaveBeenCalled();
  });

  it('allows unlimited daily orders without touching the Redis quota counter', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const session = buildActiveSession(now);
    const { manager } = buildSubmitManager({ now, session });
    sessionService.getActiveSessionOrThrow.mockResolvedValue(session);
    mockCartWithOneItem(now);
    mockCurrentSubscriptionLimit(-1);
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await service.submitOrder({
      tenantId: 't1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      idempotencyKey: 'idem-1',
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(orderQuotaService.incrementDailyOrders).not.toHaveBeenCalled();
    expect(orderQuotaService.decrementDailyOrders).not.toHaveBeenCalled();
  });

  it('reserves a finite daily order quota slot before creating a new order', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const session = buildActiveSession(now);
    const { manager } = buildSubmitManager({ now, session });
    sessionService.getActiveSessionOrThrow.mockResolvedValue(session);
    mockCartWithOneItem(now);
    mockCurrentSubscriptionLimit(2);
    orderQuotaService.incrementDailyOrders.mockResolvedValue(1);
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await service.submitOrder({
      tenantId: 't1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      idempotencyKey: 'idem-1',
    });

    expect(orderQuotaService.incrementDailyOrders).toHaveBeenCalledWith('t1');
    expect(orderQuotaService.decrementDailyOrders).not.toHaveBeenCalled();
  });

  it('blocks when daily order quota is reached before starting a DB transaction', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    sessionService.getActiveSessionOrThrow.mockResolvedValue(buildActiveSession(now));
    mockCartWithOneItem(now);
    mockCurrentSubscriptionLimit(2);
    orderQuotaService.incrementDailyOrders.mockResolvedValue(3);

    await expect(
      service.submitOrder({
        tenantId: 't1',
        sessionId: 'sess-1',
        expectedCartVersion: 0,
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
      response: {
        details: {
          limitType: 'max_orders_per_day',
          limit: 2,
          current: 2,
          upgradeUrl: '/dashboard/subscription',
        },
      },
    });

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(orderQuotaService.incrementDailyOrders).toHaveBeenCalledWith('t1');
    expect(orderQuotaService.decrementDailyOrders).toHaveBeenCalledWith('t1');
  });

  it('idempotency replay does not increment quota', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const session = buildActiveSession(now);
    const existingOrder = buildOrder(now);
    const bill = buildBill(now, ['order-1']);
    session.currentBillId = bill.id;
    sessionService.getActiveSessionOrThrow.mockResolvedValue(session);
    mockCartWithOneItem(now);
    mockCurrentSubscriptionLimit(10);
    orderRepository.findByIdempotencyKey.mockResolvedValue(existingOrder);
    orderItemRepository.findByOrderIdAndTenant.mockResolvedValue([]);
    sessionRepository.findByIdAndTenant.mockResolvedValue(session);
    billRepository.findByIdAndTenant.mockResolvedValue(bill);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(bill);

    const manager = buildReplayManager({ session, existingOrder });
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await service.submitOrder({
      tenantId: 't1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      idempotencyKey: 'idem-1',
    });

    expect(saasClient.send).not.toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT, expect.anything());
    expect(orderQuotaService.incrementDailyOrders).not.toHaveBeenCalled();
    expect(orderQuotaService.decrementDailyOrders).not.toHaveBeenCalled();
  });

  it('replay does not increment daily quota', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const session = buildActiveSession(now);
    const existingOrder = buildOrder(now);
    const bill = buildBill(now, ['order-1']);
    session.currentBillId = bill.id;
    sessionService.getActiveSessionOrThrow.mockResolvedValue(session);
    mockCartWithOneItem(now);
    mockCurrentSubscriptionLimit(10);
    orderRepository.findByIdempotencyKey.mockResolvedValue(null);
    orderQuotaService.incrementDailyOrders.mockResolvedValue(1);
    orderItemRepository.findByOrderIdAndTenant.mockResolvedValue([]);
    sessionRepository.findByIdAndTenant.mockResolvedValue(session);
    billRepository.findByIdAndTenant.mockResolvedValue(bill);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(bill);

    const manager = buildReplayManager({ session, existingOrder });
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await service.submitOrder({
      tenantId: 't1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      idempotencyKey: 'idem-1',
    });

    expect(orderQuotaService.incrementDailyOrders).toHaveBeenCalledWith('t1');
    expect(orderQuotaService.decrementDailyOrders).toHaveBeenCalledWith('t1');
  });

  it('rolls back quota reservation when transaction/create fails', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    sessionService.getActiveSessionOrThrow.mockResolvedValue(buildActiveSession(now));
    mockCartWithOneItem(now);
    mockCurrentSubscriptionLimit(2);
    orderQuotaService.incrementDailyOrders.mockResolvedValue(1);
    dataSource.transaction.mockRejectedValue(new Error('db failed'));

    await expect(
      service.submitOrder({
        tenantId: 't1',
        sessionId: 'sess-1',
        expectedCartVersion: 0,
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toThrow('db failed');

    expect(orderQuotaService.incrementDailyOrders).toHaveBeenCalledWith('t1');
    expect(orderQuotaService.decrementDailyOrders).toHaveBeenCalledWith('t1');
  });

  it('blocks when current subscription is unavailable', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    sessionService.getActiveSessionOrThrow.mockResolvedValue(buildActiveSession(now));
    mockCartWithOneItem(now);
    saasClient.send.mockReturnValue(throwError(() => new Error('SaaS unavailable')));

    await expect(
      service.submitOrder({
        tenantId: 't1',
        sessionId: 'sess-1',
        expectedCartVersion: 0,
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED });

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(orderQuotaService.incrementDailyOrders).not.toHaveBeenCalled();
    expect(orderQuotaService.decrementDailyOrders).not.toHaveBeenCalled();
  });

  it('blocks when current subscription is missing', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    sessionService.getActiveSessionOrThrow.mockResolvedValue(buildActiveSession(now));
    mockCartWithOneItem(now);
    saasClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: {
          tenant: { id: 't1', name: 'Tenant', slug: 'tenant', status: 'ACTIVE' },
          current: null,
          usage: {},
          plans: [],
          history: [],
        },
      }),
    );

    await expect(
      service.submitOrder({
        tenantId: 't1',
        sessionId: 'sess-1',
        expectedCartVersion: 0,
        idempotencyKey: 'idem-1',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED });

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(orderQuotaService.incrementDailyOrders).not.toHaveBeenCalled();
    expect(orderQuotaService.decrementDailyOrders).not.toHaveBeenCalled();
  });

  function buildActiveSession(now: Date): Session {
    return {
      id: 'sess-1',
      tenantId: 't1',
      tableId: 'tbl',
      tableName: 'A1',
      status: SessionStatus.ACTIVE,
      startedAt: now,
      lastActivity: now,
      closedAt: null,
      orderCount: 0,
      currentBillId: null,
      version: 1,
    } as Session;
  }

  function buildOrder(now: Date): Order {
    return {
      id: 'order-1',
      tenantId: 't1',
      tableId: 'tbl',
      tableName: 'A1',
      sessionId: 'sess-1',
      status: OrderStatus.PENDING,
      totalAmount: 65000,
      idempotencyKey: 'idem-1',
      notes: null,
      confirmedAt: null,
      confirmedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      createdAt: now,
      updatedAt: now,
    } as Order;
  }

  function buildBill(now: Date, orderIds: string[] = []): Bill {
    return {
      id: 'bill-1',
      tenantId: 't1',
      sessionId: 'sess-1',
      orderIds,
      subtotal: 65000,
      total: 65000,
      roundingAmount: 0,
      paymentMethod: null,
      status: BillStatus.OPEN,
      closedAt: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    } as Bill;
  }

  function buildSubmitManager({ now, session }: { now: Date; session: Session }): {
    manager: Record<string, jest.Mock>;
    savedOrderItems: OrderItem[];
  } {
    const savedOrderItems: OrderItem[] = [];
    const savedOrders: Order[] = [];
    const defaultOrder = buildOrder(now);
    const savedBill = buildBill(now);

    const manager = {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(session),
        })),
        findOne: jest.fn().mockResolvedValue(null),
      })),
      create: jest.fn((ctor: unknown, payload: Record<string, unknown>) => {
        if (ctor === Order) return { ...defaultOrder, ...payload };
        if (ctor === OrderItem) {
          return { id: `item-${savedOrderItems.length + 1}`, ...payload, createdAt: now, updatedAt: now };
        }
        if (ctor === Bill) return { ...savedBill, ...payload };
        return payload;
      }),
      save: jest.fn((ctor: unknown, row: unknown) => {
        if (ctor === Order) {
          savedOrders.push(row as Order);
        }
        if ((row as OrderItem).menuItemId) {
          savedOrderItems.push(row as OrderItem);
        }
        return Promise.resolve(row);
      }),
      find: jest.fn().mockImplementation(async () => (savedOrders.length > 0 ? savedOrders : [defaultOrder])),
    };

    return { manager, savedOrderItems };
  }

  function buildReplayManager({
    session,
    existingOrder,
  }: {
    session: Session;
    existingOrder: Order;
  }): Record<string, jest.Mock> {
    return {
      getRepository: jest.fn(() => ({
        createQueryBuilder: jest.fn(() => ({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(session),
        })),
        findOne: jest.fn().mockResolvedValue(existingOrder),
      })),
      find: jest.fn().mockResolvedValue([existingOrder]),
      findOne: jest.fn().mockResolvedValue(session),
    };
  }

  function mockCartWithOneItem(
    now: Date,
    overrides: { menuItemImageUrl?: string; quantity?: number; unitPrice?: number } = {},
  ): void {
    const item = {
      cartLineId: 'line-1',
      menuItemId: 'menu-1',
      menuItemName: 'Phở bò',
      menuItemImageUrl: overrides.menuItemImageUrl,
      quantity: overrides.quantity ?? 1,
      unitPrice: overrides.unitPrice ?? 65000,
      lineVersion: 1,
    };

    cartService.getSnapshot
      .mockResolvedValueOnce({
        tenantId: 't1',
        sessionId: 'sess-1',
        cartVersion: 0,
        status: 'ACTIVE',
        updatedAt: now.toISOString(),
        items: [item],
      })
      .mockResolvedValueOnce({
        tenantId: 't1',
        sessionId: 'sess-1',
        cartVersion: 0,
        status: 'ACTIVE',
        updatedAt: now.toISOString(),
        items: [item],
      })
      .mockResolvedValueOnce({
        tenantId: 't1',
        sessionId: 'sess-1',
        cartVersion: 1,
        status: 'ACTIVE',
        updatedAt: now.toISOString(),
        items: [],
      });
    cartService.clearForSubmittedOrder.mockResolvedValue({
      tenantId: 't1',
      sessionId: 'sess-1',
      cartVersion: 1,
      status: 'ACTIVE',
      updatedAt: now.toISOString(),
      items: [],
    });
  }

  function mockCurrentSubscriptionLimit(maxOrdersPerDay: number): void {
    saasClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: {
          tenant: { id: 't1', name: 'Tenant', slug: 'tenant', status: 'ACTIVE' },
          current: {
            planCode: 'BASIC',
            planName: 'Basic',
            status: SubscriptionStatus.ACTIVE,
            expiresAt: null,
            billingPeriod: 'MONTHLY',
            features: [],
            maxTables: 10,
            maxStaff: 10,
            maxOrdersPerDay,
          },
          usage: {},
          plans: [],
          history: [],
        },
      }),
    );
  }
});
