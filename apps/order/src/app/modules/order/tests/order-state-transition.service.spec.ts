import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { BillStatus, OrderItemStatus, OrderStatus } from '@einvoice/types';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { DataSource } from 'typeorm';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { OrderKdsEventService } from '../services/order-kds-event.service';
import { OrderStateTransitionService } from '../services/order-state-transition.service';
import { CONFIGURATION } from '../../../../configuration';

describe('OrderStateTransitionService', () => {
  let service: OrderStateTransitionService;
  let dataSource: { transaction: jest.Mock };
  let orderRepository: { findByIdAndTenantForUpdate: jest.Mock };
  let orderItemRepository: { findByOrderIdAndTenantWithManager: jest.Mock };
  let billRepository: { findByIdAndTenantForUpdate: jest.Mock };
  let catalogClient: { send: jest.Mock };

  beforeEach(async () => {
    dataSource = { transaction: jest.fn() };
    orderRepository = { findByIdAndTenantForUpdate: jest.fn() };
    orderItemRepository = { findByOrderIdAndTenantWithManager: jest.fn() };
    billRepository = { findByIdAndTenantForUpdate: jest.fn() };
    catalogClient = { send: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderStateTransitionService,
        OrderKdsEventService,
        { provide: DataSource, useValue: dataSource },
        { provide: OrderRepository, useValue: orderRepository },
        { provide: OrderItemRepository, useValue: orderItemRepository },
        { provide: BillRepository, useValue: billRepository },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
      ],
    }).compile();

    service = module.get(OrderStateTransitionService);
  });

  it('confirmOrder deducts stock, moves the order to processing, and records order.confirmed outbox', async () => {
    const now = new Date('2026-05-02T08:00:00.000Z');
    const pendingOrder = buildOrder({ createdAt: now, updatedAt: now });
    const item = buildOrderItem({ createdAt: now, updatedAt: now });

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([item]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(now));
    catalogClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: [{ menuItemId: 'm1', menuItemName: 'X', requestedQuantity: 2, remainingStock: 0 }],
      }),
    );

    const savedRows: Array<{ ctor: unknown; row: unknown }> = [];
    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      create: jest.fn((_ctor: unknown, payload: Record<string, unknown>) => ({ id: 'outbox-1', ...payload })),
      save: jest.fn((ctor: unknown, row: unknown) => {
        savedRows.push({ ctor, row });
        return Promise.resolve(row);
      }),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' });

    expect(catalogClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_DEDUCT_FOR_ORDER,
      expect.objectContaining({
        tenantId: 't1',
        data: expect.objectContaining({
          tenantId: 't1',
          orderId: 'o1',
          idempotencyKey: 'confirm-order:o1',
          items: [{ menuItemId: 'm1', quantity: 2 }],
        }),
      }),
    );
    expect(result.order.status).toBe(OrderStatus.PROCESSING);
    expect(result.events.orderStatusChanged).toEqual(
      expect.objectContaining({
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.PROCESSING,
        changedByUserId: 'staff-1',
      }),
    );
    expect(savedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ctor: Order,
          row: expect.objectContaining({ status: OrderStatus.PROCESSING, confirmedByUserId: 'staff-1' }),
        }),
        expect.objectContaining({
          ctor: OrderItem,
          row: expect.objectContaining({ status: OrderItemStatus.PROCESSING }),
        }),
        expect.objectContaining({
          ctor: OutboxEvent,
          row: expect.objectContaining({
            tenantId: 't1',
            eventType: 'order.confirmed',
            aggregateId: 'o1',
            partitionKey: 't1',
            status: 'PENDING',
          }),
        }),
      ]),
    );

    const outbox = savedRows.find((entry) => entry.ctor === OutboxEvent)?.row as { payload?: Record<string, unknown> };
    expect(outbox.payload).toEqual(expect.objectContaining({ eventType: 'order.confirmed', orderId: 'o1' }));
  });

  it('confirmOrder replay for an already processing order does not rededuct stock or create outbox', async () => {
    const now = new Date('2026-05-02T08:00:00.000Z');
    const processingOrder = buildOrder({
      status: OrderStatus.PROCESSING,
      confirmedAt: now,
      confirmedByUserId: 'staff-1',
      createdAt: now,
      updatedAt: now,
    });

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(processingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([
      buildOrderItem({ createdAt: now, updatedAt: now }),
    ]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(now));

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      create: jest.fn(),
      save: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' });

    expect(result.order.status).toBe(OrderStatus.PROCESSING);
    expect(catalogClient.send).not.toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_DEDUCT_FOR_ORDER,
      expect.anything(),
    );
    expect(manager.create).not.toHaveBeenCalledWith(OutboxEvent, expect.anything());
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('confirmOrder propagates Catalog stock errors from live TCP payloads and does not persist confirmation', async () => {
    const pendingOrder = buildOrder();

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem({ quantity: 1 })]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date(), { subtotal: 2000, total: 2000 }));
    catalogClient.send.mockReturnValue(
      throwError(() => ({
        code: 409,
        message: 'Insufficient stock',
        errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
      })),
    );

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      save: jest.fn(),
      create: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
    });
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('requires reason for processing cancel', async () => {
    await expect(
      service.cancelProcessing({ tenantId: 't1', orderId: 'o1', userId: 'manager-1' }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.ORDER_CANCEL_REASON_REQUIRED });
  });

  it('rejects customer cancel for another session order', async () => {
    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildOrder({ sessionId: 'sess-other' }));
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) =>
      cb({ save: jest.fn(), findOne: jest.fn() }),
    );

    await expect(
      service.customerCancelPending({
        tenantId: 't1',
        sessionId: 'sess-1',
        orderId: 'o1',
        reason: 'CUSTOMER_REQUESTED',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.TENANT_MISMATCH_SESSION });
  });

  it('lets customer cancel only own pending order', async () => {
    const pendingOrder = buildOrder({ sessionId: 'sess-1' });

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(null);

    const manager = {
      save: jest.fn((_entity, row: Order) => Promise.resolve(row)),
      findOne: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.customerCancelPending({
      tenantId: 't1',
      sessionId: 'sess-1',
      orderId: 'o1',
      reason: 'CUSTOMER_REQUESTED',
    });

    expect(result.order.status).toBe(OrderStatus.CANCELED);
    expect(result.events.orderStatusChanged).toEqual(
      expect.objectContaining({
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.CANCELED,
      }),
    );
  });

  it('cancelPendingStaff cancels pending order without stock release', async () => {
    const pendingOrder = buildOrder();
    const item = buildOrderItem({ status: OrderItemStatus.PROCESSING });
    const savedRows: Array<{ ctor: unknown; row: unknown }> = [];

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([item]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(null);

    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn((ctor: unknown, row: unknown) => {
        savedRows.push({ ctor, row });
        return Promise.resolve(row);
      }),
      create: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.cancelPendingStaff({
      tenantId: 't1',
      orderId: 'o1',
      userId: 'staff-1',
      reason: 'STAFF_CANCELLED',
    });

    expect(catalogClient.send).not.toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_RELEASE_FOR_ORDER,
      expect.anything(),
    );
    expect(result.order.status).toBe(OrderStatus.CANCELED);
    expect(result.events.orderStatusChanged).toMatchObject({
      tenantId: 't1',
      orderId: 'o1',
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.CANCELED,
      changedByUserId: 'staff-1',
    });
    expect(savedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ctor: Order,
          row: expect.objectContaining({ status: OrderStatus.CANCELED, cancelledByUserId: 'staff-1' }),
        }),
        expect.objectContaining({
          ctor: OrderItem,
          row: expect.objectContaining({ status: OrderItemStatus.CANCELED }),
        }),
      ]),
    );
  });

  it('cancelProcessing releases stock and records cancel outbox', async () => {
    const now = new Date('2026-05-02T08:00:00.000Z');
    const processingOrder = buildOrder({
      status: OrderStatus.PROCESSING,
      confirmedAt: now,
      confirmedByUserId: 'staff-1',
      createdAt: now,
      updatedAt: now,
    });
    const item = buildOrderItem({ status: OrderItemStatus.PROCESSING, createdAt: now, updatedAt: now });
    const savedRows: Array<{ ctor: unknown; row: unknown }> = [];

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(processingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([item]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(now));
    catalogClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: [{ menuItemId: 'm1', menuItemName: 'X', requestedQuantity: 2, remainingStock: 5 }],
      }),
    );

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((_ctor: unknown, payload: Record<string, unknown>) => ({ id: 'outbox-cancel-1', ...payload })),
      save: jest.fn((ctor: unknown, row: unknown) => {
        savedRows.push({ ctor, row });
        return Promise.resolve(row);
      }),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.cancelProcessing({
      tenantId: 't1',
      orderId: 'o1',
      userId: 'manager-1',
      reason: 'Customer complaint',
      processId: 'process-1',
    });

    expect(catalogClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_RELEASE_FOR_ORDER,
      expect.objectContaining({
        tenantId: 't1',
        data: expect.objectContaining({
          tenantId: 't1',
          orderId: 'o1',
          idempotencyKey: 'cancel-processing:o1',
          items: [{ menuItemId: 'm1', quantity: 2 }],
        }),
      }),
    );
    expect(result.events.orderStatusChanged).toMatchObject({
      tenantId: 't1',
      orderId: 'o1',
      fromStatus: OrderStatus.PROCESSING,
      toStatus: OrderStatus.CANCELED,
      changedByUserId: 'manager-1',
    });
    expect(savedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ctor: OutboxEvent,
          row: expect.objectContaining({
            tenantId: 't1',
            topic: CONFIGURATION.KAFKA_CONFIG.ORDER_STATUS_CHANGED_TOPIC,
            eventType: 'order.status_changed',
            aggregateId: 'o1',
            partitionKey: 't1',
            status: 'PENDING',
          }),
        }),
      ]),
    );

    const outbox = savedRows.find((entry) => entry.ctor === OutboxEvent)?.row as { payload?: Record<string, unknown> };
    expect(outbox.payload).toEqual(
      expect.objectContaining({
        tenantId: 't1',
        orderId: 'o1',
        fromStatus: OrderStatus.PROCESSING,
        toStatus: OrderStatus.CANCELED,
        changedByUserId: 'manager-1',
      }),
    );
  });

  it('markOrderItemsReady rejects when item station does not match ticket station', async () => {
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) =>
      cb({
        createQueryBuilder: jest.fn(() => queryBuilder()),
        save: jest.fn(),
      }),
    );
    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(
      buildOrder({ status: OrderStatus.PROCESSING, confirmedAt: new Date() }),
    );
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([
      buildOrderItem({ id: 'wrong-line', station: 'BAR' }),
    ]);

    await expect(
      service.markOrderItemsReady({
        tenantId: 't1',
        orderId: 'ord-1',
        ticketId: 'ord-1:KITCHEN',
        station: 'KITCHEN',
        orderItemIds: ['wrong-line'],
        userId: 'chef',
        requestId: 'r1',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.COMMON_VALIDATION_FAILED });
  });

  it('markOrderItemsReady transitions order to READY when no PROCESSING lines remain', async () => {
    const confirmed = new Date('2026-05-07T12:00:00.000Z');
    const orderRow = buildOrder({
      id: 'ord-1',
      status: OrderStatus.PROCESSING,
      confirmedAt: confirmed,
      confirmedByUserId: 's',
      createdAt: confirmed,
      updatedAt: confirmed,
    });
    const line = buildOrderItem({
      id: 'line-1',
      orderId: 'ord-1',
      station: 'KITCHEN',
      createdAt: confirmed,
      updatedAt: confirmed,
    });

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(orderRow);
    orderItemRepository.findByOrderIdAndTenantWithManager
      .mockResolvedValueOnce([line])
      .mockResolvedValueOnce([{ ...line, status: OrderItemStatus.READY }]);

    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(() => queryBuilder()),
      save: jest.fn((_Entity: unknown, o: Order) => Promise.resolve(o)),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.markOrderItemsReady({
      tenantId: 't1',
      orderId: 'ord-1',
      ticketId: 'ord-1:KITCHEN',
      station: 'KITCHEN',
      orderItemIds: ['line-1'],
      userId: 'chef',
      requestId: 'r1',
    });

    expect(result.kitchenItemReady.eventType).toBe('kitchen.item_ready');
    expect(result.orderStatusChanged?.toStatus).toBe(OrderStatus.READY);
    expect(manager.save).toHaveBeenCalled();
  });

  it('markOrderServed transitions a READY order and all ready lines to SERVED', async () => {
    const readyAt = new Date('2026-05-07T12:05:00.000Z');
    const orderRow = buildOrder({
      id: 'ord-1',
      status: OrderStatus.READY,
      confirmedAt: new Date('2026-05-07T12:00:00.000Z'),
      confirmedByUserId: 's',
      createdAt: new Date('2026-05-07T11:59:00.000Z'),
      updatedAt: readyAt,
    });
    const line = buildOrderItem({
      id: 'line-1',
      orderId: 'ord-1',
      status: OrderItemStatus.READY,
      station: 'KITCHEN',
      createdAt: readyAt,
      updatedAt: readyAt,
    });

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(orderRow);
    orderItemRepository.findByOrderIdAndTenantWithManager
      .mockResolvedValueOnce([line])
      .mockResolvedValueOnce([{ ...line, status: OrderItemStatus.SERVED }]);

    const execute = jest.fn().mockResolvedValue({ affected: 1 });
    const manager = {
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn(() => queryBuilder(execute)),
      save: jest.fn((_Entity: unknown, o: Order) => Promise.resolve(o)),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.markOrderServed({ tenantId: 't1', orderId: 'ord-1', userId: 'waiter' });

    expect(execute).toHaveBeenCalled();
    expect(orderRow.status).toBe(OrderStatus.SERVED);
    expect(result.order.status).toBe(OrderStatus.SERVED);
    expect(result.order.items[0]?.status).toBe(OrderItemStatus.SERVED);
    expect(result.events.orderStatusChanged).toMatchObject({
      fromStatus: OrderStatus.READY,
      toStatus: OrderStatus.SERVED,
      changedByUserId: 'waiter',
    });
  });

  it('revertOrderItemsProcessing moves READY order back to PROCESSING when items return to PROCESSING', async () => {
    const confirmed = new Date('2026-05-07T12:00:00.000Z');
    const orderRow = buildOrder({
      id: 'ord-1',
      status: OrderStatus.READY,
      confirmedAt: confirmed,
      confirmedByUserId: 's',
      createdAt: confirmed,
      updatedAt: confirmed,
    });
    const readyLine = buildOrderItem({
      id: 'line-1',
      orderId: 'ord-1',
      status: OrderItemStatus.READY,
      station: 'KITCHEN',
      createdAt: confirmed,
      updatedAt: confirmed,
    });

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(orderRow);
    orderItemRepository.findByOrderIdAndTenantWithManager
      .mockResolvedValueOnce([readyLine])
      .mockResolvedValueOnce([{ ...readyLine, status: OrderItemStatus.PROCESSING }]);

    const manager = {
      createQueryBuilder: jest.fn(() => queryBuilder()),
      save: jest.fn((_Entity: unknown, o: Order) => Promise.resolve(o)),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.revertOrderItemsProcessing({
      tenantId: 't1',
      orderId: 'ord-1',
      ticketId: 'ord-1:KITCHEN',
      station: 'KITCHEN',
      orderItemIds: ['line-1'],
      userId: 'chef',
      requestId: 'r1',
      reason: 'KITCHEN_RECALL',
    });

    expect(result.orderStatusChanged?.fromStatus).toBe(OrderStatus.READY);
    expect(result.orderStatusChanged?.toStatus).toBe(OrderStatus.PROCESSING);
  });

  it('revertOrderItemsProcessing rejects item ids outside the requested station', async () => {
    const orderRow = buildOrder({ id: 'ord-1', status: OrderStatus.READY, confirmedAt: new Date() });
    const readyLine = buildOrderItem({
      id: 'line-1',
      orderId: 'ord-1',
      status: OrderItemStatus.READY,
      station: 'BAR',
    });

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(orderRow);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([readyLine]);

    const manager = {
      createQueryBuilder: jest.fn(() => queryBuilder()),
      save: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await expect(
      service.revertOrderItemsProcessing({
        tenantId: 't1',
        orderId: 'ord-1',
        ticketId: 'ord-1:KITCHEN',
        station: 'KITCHEN',
        orderItemIds: ['line-1'],
        userId: 'chef',
        requestId: 'r1',
        reason: 'KITCHEN_RECALL',
      }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.COMMON_VALIDATION_FAILED });
    expect(manager.createQueryBuilder).not.toHaveBeenCalled();
  });
});

function queryBuilder(execute = jest.fn().mockResolvedValue({ affected: 1 })) {
  return {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute,
  };
}

function buildOrder(overrides: Partial<Order> = {}): Order {
  const now = new Date('2026-05-02T08:00:00.000Z');
  return {
    id: 'o1',
    tenantId: 't1',
    sessionId: 's1',
    tableId: 'tbl',
    tableName: 'A1',
    status: OrderStatus.PENDING,
    totalAmount: 4000,
    idempotencyKey: 'k',
    notes: null,
    confirmedAt: null,
    confirmedByUserId: null,
    cancelledAt: null,
    cancelledByUserId: null,
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Order;
}

function buildOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  const now = new Date('2026-05-02T08:00:00.000Z');
  return {
    id: 'i1',
    tenantId: 't1',
    orderId: 'o1',
    menuItemId: 'm1',
    menuItemName: 'X',
    menuItemImageUrl: null,
    quantity: 2,
    unitPrice: 2000,
    note: null,
    status: OrderItemStatus.PROCESSING,
    station: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as OrderItem;
}

function buildBill(now: Date, overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'b1',
    tenantId: 't1',
    sessionId: 's1',
    orderIds: ['o1'],
    subtotal: 4000,
    total: 4000,
    roundingAmount: 0,
    paymentMethod: null,
    status: BillStatus.OPEN,
    closedAt: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  } as Bill;
}
