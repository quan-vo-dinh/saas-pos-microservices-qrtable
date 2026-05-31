import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { BillStatus, OrderItemStatus, OrderStatus } from '@einvoice/types';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CONFIGURATION } from '../../../../configuration';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { CatalogStockGatewayService } from '../services/catalog-stock-gateway.service';
import { OrderConfirmSagaService } from '../services/order-confirm-saga.service';

describe('OrderConfirmSagaService', () => {
  let service: OrderConfirmSagaService;
  let dataSource: { transaction: jest.Mock };
  let orderRepository: { findByIdAndTenantForUpdate: jest.Mock };
  let orderItemRepository: { findByOrderIdAndTenantWithManager: jest.Mock };
  let billRepository: { findByIdAndTenantForUpdate: jest.Mock };
  let catalogStockGateway: { deductForOrder: jest.Mock; releaseForOrder: jest.Mock };

  beforeEach(() => {
    dataSource = { transaction: jest.fn() };
    orderRepository = { findByIdAndTenantForUpdate: jest.fn() };
    orderItemRepository = { findByOrderIdAndTenantWithManager: jest.fn() };
    billRepository = { findByIdAndTenantForUpdate: jest.fn() };
    catalogStockGateway = {
      deductForOrder: jest.fn(),
      releaseForOrder: jest.fn(),
    };

    service = new OrderConfirmSagaService(
      dataSource as unknown as DataSource,
      orderRepository as unknown as OrderRepository,
      orderItemRepository as unknown as OrderItemRepository,
      billRepository as unknown as BillRepository,
      catalogStockGateway as unknown as CatalogStockGatewayService,
    );
  });

  it('confirms a pending order by deducting stock, moving rows to processing, and recording order.confirmed outbox', async () => {
    const now = new Date('2026-05-02T08:00:00.000Z');
    const pendingOrder = buildOrder({ createdAt: now, updatedAt: now });
    const item = buildOrderItem({ createdAt: now, updatedAt: now });
    const savedRows: Array<{ ctor: unknown; row: unknown }> = [];

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([item]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(now));
    catalogStockGateway.deductForOrder.mockResolvedValue([
      { menuItemId: 'm1', menuItemName: 'X', requestedQuantity: 2, remainingStock: 0 },
    ]);

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

    expect(catalogStockGateway.deductForOrder).toHaveBeenCalledWith({
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'confirm-order:o1',
      items: [{ menuItemId: 'm1', quantity: 2 }],
    });
    expect(catalogStockGateway.releaseForOrder).not.toHaveBeenCalled();
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
            topic: CONFIGURATION.KAFKA_CONFIG.ORDER_CONFIRMED_TOPIC,
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

  it('replays an already processing order without deducting stock or creating a new outbox row', async () => {
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
    expect(catalogStockGateway.deductForOrder).not.toHaveBeenCalled();
    expect(catalogStockGateway.releaseForOrder).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalledWith(OutboxEvent, expect.anything());
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('propagates Catalog stock errors and does not compensate when stock was never deducted', async () => {
    const pendingOrder = buildOrder();

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem({ quantity: 1 })]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date(), { subtotal: 2000, total: 2000 }));
    catalogStockGateway.deductForOrder.mockRejectedValue(
      Object.assign(new Error('Insufficient stock'), {
        errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
      }),
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
    expect(catalogStockGateway.releaseForOrder).not.toHaveBeenCalled();
  });

  it('releases stock when the Order transaction fails after Catalog deduct succeeds', async () => {
    const pendingOrder = buildOrder();
    const orderCommitError = new Error('Order DB failed after stock deduct');

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem()]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date()));
    catalogStockGateway.deductForOrder.mockResolvedValue([
      { menuItemId: 'm1', menuItemName: 'X', requestedQuantity: 2, remainingStock: 0 },
    ]);
    catalogStockGateway.releaseForOrder.mockResolvedValue([
      { menuItemId: 'm1', menuItemName: 'X', requestedQuantity: 2, remainingStock: 2 },
    ]);

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      create: jest.fn((_ctor: unknown, payload: Record<string, unknown>) => ({ id: 'outbox-1', ...payload })),
      save: jest.fn((ctor: unknown, row: unknown) => {
        if (ctor === OutboxEvent) {
          return Promise.reject(orderCommitError);
        }
        return Promise.resolve(row);
      }),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toBe(
      orderCommitError,
    );

    expect(catalogStockGateway.releaseForOrder).toHaveBeenCalledWith({
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'confirm-order-compensation:o1',
      items: [{ menuItemId: 'm1', quantity: 2 }],
    });
  });

  it('logs compensation failure and still propagates the original Order error', async () => {
    const pendingOrder = buildOrder();
    const orderCommitError = new Error('Order DB failed after stock deduct');
    const compensationError = new Error('Catalog release failed');
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem()]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date()));
    catalogStockGateway.deductForOrder.mockResolvedValue([
      { menuItemId: 'm1', menuItemName: 'X', requestedQuantity: 2, remainingStock: 0 },
    ]);
    catalogStockGateway.releaseForOrder.mockRejectedValue(compensationError);

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      create: jest.fn((_ctor: unknown, payload: Record<string, unknown>) => ({ id: 'outbox-1', ...payload })),
      save: jest.fn((ctor: unknown, row: unknown) => {
        if (ctor === OutboxEvent) {
          return Promise.reject(orderCommitError);
        }
        return Promise.resolve(row);
      }),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toBe(
      orderCommitError,
    );

    expect(catalogStockGateway.releaseForOrder).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Order confirm compensation failed'),
      expect.any(String),
    );

    logSpy.mockRestore();
  });
});

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
