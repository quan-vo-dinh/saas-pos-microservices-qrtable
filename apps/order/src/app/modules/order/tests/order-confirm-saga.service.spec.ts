import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { OutboxEvent } from '@common/entities/outbox-event.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';
import type { StockMutationOperationResult } from '@common/interfaces/tcp/catalog/menu-item-response.interface';
import { BillStatus, OrderItemStatus, OrderStatus } from '@einvoice/types';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CONFIGURATION } from '../../../../configuration';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { CatalogStockGatewayService } from '../services/catalog-stock-gateway.service';
import { OrderConfirmSagaService } from '../services/order-confirm-saga.service';

const APPLIED_DEDUCT: StockMutationOperationResult = {
  reservationVersion: 1,
  outcome: 'APPLIED',
  items: [
    {
      menuItemId: 'm1',
      menuItemName: 'X',
      requestedQuantity: 2,
      remainingStock: 0,
      status: MENU_ITEM_STATUS.OUT_OF_STOCK,
    },
  ],
};

const APPLIED_RELEASE: StockMutationOperationResult = {
  reservationVersion: 1,
  outcome: 'APPLIED',
  items: [
    {
      menuItemId: 'm1',
      menuItemName: 'X',
      requestedQuantity: 2,
      remainingStock: 2,
      status: MENU_ITEM_STATUS.AVAILABLE,
    },
  ],
};

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

  it('confirms a pending order by deducting stock, persisting reservationVersion, and recording order.confirmed outbox', async () => {
    console.log('\n  [TEST 1.1] 🚀 Starting Flow: Confirm order successfully and create Outbox Event');
    const now = new Date('2026-05-02T08:00:00.000Z');
    const pendingOrder = buildOrder({ createdAt: now, updatedAt: now });
    const item = buildOrderItem({ createdAt: now, updatedAt: now });
    const savedRows: Array<{ ctor: unknown; row: unknown }> = [];

    console.log('  [TEST 1.1] 🔍 Step 1: Mock DB - Order #o1 is in PENDING state');
    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([item]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(now));

    console.log('  [TEST 1.1] 📦 Step 2: Mock Catalog - Deduct stock succeeds, returning reservationVersion = 1');
    catalogStockGateway.deductForOrder.mockResolvedValue(APPLIED_DEDUCT);

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      create: jest.fn((_ctor: unknown, payload: Record<string, unknown>) => ({ id: 'outbox-1', ...payload })),
      save: jest.fn((ctor: unknown, row: unknown) => {
        savedRows.push({ ctor, row });
        return Promise.resolve(row);
      }),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    console.log('  [TEST 1.1] 🔄 Step 3: Call confirmOrder()...');
    const result = await service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' });

    console.log('  [TEST 1.1] ✅ Step 4: Verify order status changed to PROCESSING');
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

    console.log('  [TEST 1.1] 💾 Step 5: Verify Outbox Event (order.confirmed) is persisted to DB');
    expect(savedRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ctor: Order,
          row: expect.objectContaining({
            status: OrderStatus.PROCESSING,
            confirmedByUserId: 'staff-1',
            stockReservationVersion: 1,
          }),
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
    console.log('  [TEST 1.1] 🎉 Test Case 1.1 PASSED!');
  });

  it('replays an already processing order without deducting stock or creating a new outbox row', async () => {
    console.log('\n  [TEST 1.2] 🚀 Starting Flow: Replay mechanism when order is already PROCESSING');
    const now = new Date('2026-05-02T08:00:00.000Z');
    const processingOrder = buildOrder({
      status: OrderStatus.PROCESSING,
      confirmedAt: now,
      confirmedByUserId: 'staff-1',
      stockReservationVersion: 1,
      createdAt: now,
      updatedAt: now,
    });

    console.log('  [TEST 1.2] 🔍 Step 1: Mock DB - Order #o1 is already PROCESSING');
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

    console.log('  [TEST 1.2] 🔄 Step 2: Call confirmOrder() again...');
    const result = await service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' });

    console.log('  [TEST 1.2] ✅ Step 3: Verify stock is NOT deducted again, and no new Outbox Event is created');
    expect(result.order.status).toBe(OrderStatus.PROCESSING);
    expect(catalogStockGateway.deductForOrder).not.toHaveBeenCalled();
    expect(catalogStockGateway.releaseForOrder).not.toHaveBeenCalled();
    expect(manager.create).not.toHaveBeenCalledWith(OutboxEvent, expect.anything());
    expect(manager.save).not.toHaveBeenCalled();
    console.log('  [TEST 1.2] 🎉 Test Case 1.2 PASSED!');
  });

  it('propagates Catalog stock errors and does not compensate when stock was never deducted', async () => {
    console.log('\n  [TEST 1.3] 🚀 Starting Flow: Catalog stock error handling and no compensation');
    const pendingOrder = buildOrder();

    console.log('  [TEST 1.3] 🔍 Step 1: Mock DB - Order #o1 is PENDING');
    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem({ quantity: 1 })]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date(), { subtotal: 2000, total: 2000 }));

    console.log('  [TEST 1.3] ❌ Step 2: Mock Catalog - Return CATALOG_STOCK_INSUFFICIENT error');
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

    console.log('  [TEST 1.3] 🔄 Step 3: Call confirmOrder() and expect exception');
    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
    });

    console.log('  [TEST 1.3] ✅ Step 4: Verify release is NOT called (no stock was ever reserved)');
    expect(manager.save).not.toHaveBeenCalled();
    expect(catalogStockGateway.releaseForOrder).not.toHaveBeenCalled();
    console.log('  [TEST 1.3] 🎉 Test Case 1.3 PASSED!');
  });

  it('does not compensate an ambiguous transport failure before Catalog acknowledges a reservation', async () => {
    console.log('\n  [TEST 1.4] 🚀 Starting Flow: No automatic compensation on ambiguous network timeouts');
    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildOrder());
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem()]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date()));

    const transportError = new Error('Catalog TCP response timed out');
    console.log('  [TEST 1.4] ❌ Step 1: Mock Catalog - Simulate TCP network timeout');
    catalogStockGateway.deductForOrder.mockRejectedValue(transportError);

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      save: jest.fn(),
      create: jest.fn(),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    console.log('  [TEST 1.4] 🔄 Step 2: Call confirmOrder() and expect timeout error');
    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toBe(
      transportError,
    );

    console.log('  [TEST 1.4] ✅ Step 3: Verify release is NOT called to prevent incorrect stock state');
    expect(catalogStockGateway.releaseForOrder).not.toHaveBeenCalled();
    console.log('  [TEST 1.4] 🎉 Test Case 1.4 PASSED!');
  });

  it('persists the returned version when Catalog replays an active reservation', async () => {
    console.log('\n  [TEST 1.5] 🚀 Starting Flow: Persisting reservation version on Catalog Replay');
    const pendingOrder = buildOrder();
    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem()]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date()));

    console.log('  [TEST 1.5] 📦 Step 1: Mock Catalog - Return REPLAYED status with reservationVersion = 2');
    catalogStockGateway.deductForOrder.mockResolvedValue({
      ...APPLIED_DEDUCT,
      reservationVersion: 2,
      outcome: 'REPLAYED',
    });

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      create: jest.fn((_ctor: unknown, payload: Record<string, unknown>) => payload),
      save: jest.fn((_ctor: unknown, row: unknown) => Promise.resolve(row)),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    console.log('  [TEST 1.5] 🔄 Step 2: Call confirmOrder()');
    const result = await service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' });

    console.log('  [TEST 1.5] ✅ Step 3: Verify order status = PROCESSING and stockReservationVersion = 2');
    expect(result.order.status).toBe(OrderStatus.PROCESSING);
    expect(pendingOrder.stockReservationVersion).toBe(2);
    expect(catalogStockGateway.releaseForOrder).not.toHaveBeenCalled();
    console.log('  [TEST 1.5] 🎉 Test Case 1.5 PASSED!');
  });

  it('releases stock with correct version when the Order transaction fails after Catalog deduct succeeds', async () => {
    console.log(
      '\n  [TEST 1.6] 🚀 Starting Flow: Trigger Compensating Transaction (Rollback Stock) on DB Commit Failure',
    );
    const pendingOrder = buildOrder();
    const orderCommitError = new Error('Order DB failed after stock deduct');
    let isTransactionCallbackActive = false;
    let compensatedWhileTransactionCallbackActive = false;

    console.log('  [TEST 1.6] 🔍 Step 1: Mock Catalog - Deduct stock succeeds (reservationVersion = 1)');
    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem()]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date()));
    catalogStockGateway.deductForOrder.mockResolvedValue(APPLIED_DEDUCT);

    console.log('  [TEST 1.6] 🔄 Step 2: Simulate DB Order failed when saving OutboxEvent');
    catalogStockGateway.releaseForOrder.mockImplementation(() => {
      compensatedWhileTransactionCallbackActive = isTransactionCallbackActive;
      return Promise.resolve(APPLIED_RELEASE);
    });

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
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
      isTransactionCallbackActive = true;
      try {
        return await cb(manager);
      } finally {
        isTransactionCallbackActive = false;
      }
    });

    console.log('  [TEST 1.6] 🔄 Step 3: Call confirmOrder() and expect rollback behavior');
    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toBe(
      orderCommitError,
    );

    console.log('  [TEST 1.6] ✅ Step 4: Verify Catalog releaseForOrder was called with reservationVersion = 1');
    expect(catalogStockGateway.releaseForOrder).toHaveBeenCalledWith({
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'confirm-order-compensation:o1:1',
      reservationVersion: 1,
      items: [{ menuItemId: 'm1', quantity: 2 }],
    });
    expect(compensatedWhileTransactionCallbackActive).toBe(true);
    console.log('  [TEST 1.6] 🎉 Test Case 1.6 PASSED!');
  });

  it('logs compensation failure and still propagates the original Order error', async () => {
    console.log('\n  [TEST 1.7] 🚀 Starting Flow: Log compensation failure and propagate original error');
    const pendingOrder = buildOrder();
    const orderCommitError = new Error('Order DB failed after stock deduct');
    const compensationError = new Error('Catalog release failed');
    const logSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem()]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date()));
    catalogStockGateway.deductForOrder.mockResolvedValue(APPLIED_DEDUCT);

    console.log('  [TEST 1.7] ❌ Step 1: Mock Catalog - Release compensation fails');
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

    console.log('  [TEST 1.7] 🔄 Step 2: Call confirmOrder()');
    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toBe(
      orderCommitError,
    );

    console.log(
      '  [TEST 1.7] ✅ Step 3: Verify Saga logs the critical compensation error but still propagates the original DB error',
    );
    expect(catalogStockGateway.releaseForOrder).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('reservationVersion=1'), expect.any(String));

    logSpy.mockRestore();
    console.log('  [TEST 1.7] 🎉 Test Case 1.7 PASSED!');
  });

  it('compensates when the Order transaction rejects during commit', async () => {
    console.log('\n  [TEST 1.8] 🚀 Starting Flow: Compensate stock when Order transaction rejects during commit');
    const commitError = new Error('Order transaction commit failed');
    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildOrder());
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([buildOrderItem()]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(buildBill(new Date()));
    catalogStockGateway.deductForOrder.mockResolvedValue(APPLIED_DEDUCT);
    catalogStockGateway.releaseForOrder.mockResolvedValue(APPLIED_RELEASE);

    const manager = {
      findOne: jest.fn().mockResolvedValue({ id: 's1', tenantId: 't1', currentBillId: 'b1' }),
      create: jest.fn((_ctor: unknown, payload: Record<string, unknown>) => payload),
      save: jest.fn((_ctor: unknown, row: unknown) => Promise.resolve(row)),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => {
      await cb(manager);
      console.log('  [TEST 1.8] 💥 Trigger transaction commit rejection');
      throw commitError;
    });

    console.log('  [TEST 1.8] 🔄 Call confirmOrder()');
    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toBe(commitError);

    console.log('  [TEST 1.8] ✅ Verify Saga automatically calls releaseForOrder with reservationVersion = 1');
    expect(catalogStockGateway.releaseForOrder).toHaveBeenCalledWith({
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'confirm-order-compensation:o1:1',
      reservationVersion: 1,
      items: [{ menuItemId: 'm1', quantity: 2 }],
    });
    console.log('  [TEST 1.8] 🎉 Test Case 1.8 PASSED!');
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
    stockReservationVersion: null,
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
