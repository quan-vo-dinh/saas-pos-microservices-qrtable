import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { Bill } from '@common/entities/bill.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { Session } from '@common/entities/session.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { BillStatus, OrderItemStatus, OrderStatus, SessionStatus } from '@einvoice/types';
import { of, throwError } from 'rxjs';
import { DataSource } from 'typeorm';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CartService } from '../services/cart.service';
import { OrderService } from '../services/order.service';
import { SessionService } from '../services/session.service';

describe('OrderService', () => {
  let service: OrderService;
  let dataSource: { transaction: jest.Mock };
  let orderRepository: {
    findByIdAndTenantForUpdate: jest.Mock;
    findBySessionIdAndTenant: jest.Mock;
    findActiveKdsOrders: jest.Mock;
  };
  let orderItemRepository: { findByOrderIdAndTenant: jest.Mock; findByOrderIdAndTenantWithManager: jest.Mock };
  let billRepository: { findByIdAndTenant: jest.Mock; findByIdAndTenantForUpdate: jest.Mock };
  let sessionRepository: { findByIdAndTenant: jest.Mock; save: jest.Mock; findActiveByIdAndTenant: jest.Mock };
  let cartService: { getSnapshot: jest.Mock; mutate: jest.Mock };
  let sessionService: {
    getActiveSessionOrThrow: jest.Mock;
    touchCustomerSessionActivity: jest.Mock;
  };
  let catalogClient: { send: jest.Mock };

  beforeEach(async () => {
    dataSource = { transaction: jest.fn() };
    orderRepository = {
      findByIdAndTenantForUpdate: jest.fn(),
      findBySessionIdAndTenant: jest.fn(),
      findActiveKdsOrders: jest.fn(),
    };
    orderItemRepository = {
      findByOrderIdAndTenant: jest.fn(),
      findByOrderIdAndTenantWithManager: jest.fn(),
    };
    billRepository = {
      findByIdAndTenant: jest.fn(),
      findByIdAndTenantForUpdate: jest.fn(),
    };
    sessionRepository = { findByIdAndTenant: jest.fn(), save: jest.fn(), findActiveByIdAndTenant: jest.fn() };
    cartService = { getSnapshot: jest.fn(), mutate: jest.fn() };
    sessionService = { getActiveSessionOrThrow: jest.fn(), touchCustomerSessionActivity: jest.fn() };
    catalogClient = { send: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: DataSource, useValue: dataSource },
        { provide: OrderRepository, useValue: orderRepository },
        { provide: OrderItemRepository, useValue: orderItemRepository },
        { provide: BillRepository, useValue: billRepository },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: CartService, useValue: cartService },
        { provide: SessionService, useValue: sessionService },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('submitOrder rejects empty cart without starting a DB transaction', async () => {
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

  it('submitOrder rejects cart version mismatch', async () => {
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

  it('confirmOrder propagates Catalog stock errors and does not persist confirmation', async () => {
    const managerSave = jest.fn();
    const managerFindOne = jest.fn().mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      currentBillId: 'b1',
    });

    const pendingOrder = {
      id: 'o1',
      tenantId: 't1',
      sessionId: 's1',
      tableId: 'tbl',
      tableName: 'A1',
      status: OrderStatus.PENDING,
      totalAmount: 2000,
      idempotencyKey: 'k',
      notes: null,
      confirmedAt: null,
      confirmedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([
      {
        id: 'i1',
        tenantId: 't1',
        orderId: 'o1',
        menuItemId: 'm1',
        menuItemName: 'X',
        quantity: 1,
        unitPrice: 2000,
        note: null,
        status: OrderItemStatus.PROCESSING,
        station: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as OrderItem,
    ]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue({
      id: 'b1',
      tenantId: 't1',
      sessionId: 's1',
      orderIds: ['o1'],
      subtotal: 2000,
      total: 2000,
      roundingAmount: 0,
      paymentMethod: null,
      status: BillStatus.OPEN,
      closedAt: null,
      paidAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    catalogClient.send.mockReturnValue(
      throwError(
        () =>
          new RpcException({
            code: 409,
            message: 'Insufficient stock',
            errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
          }),
      ),
    );

    const manager = {
      findOne: managerFindOne,
      save: managerSave,
      create: jest.fn(),
    };

    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    await expect(service.confirmOrder({ tenantId: 't1', orderId: 'o1', userId: 'staff-1' })).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
    });

    expect(managerSave).not.toHaveBeenCalled();
  });

  it('requires reason for processing cancel', async () => {
    await expect(
      service.cancelProcessing({ tenantId: 't1', orderId: 'o1', userId: 'manager-1' }),
    ).rejects.toMatchObject({ errorCode: ErrorCode.ORDER_CANCEL_REASON_REQUIRED });
  });

  it('lists customer session orders after validating active session', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    sessionService.getActiveSessionOrThrow.mockResolvedValue({ id: 'sess-1' });
    orderRepository.findBySessionIdAndTenant.mockResolvedValue([
      {
        id: 'order-1',
        tenantId: 't1',
        sessionId: 'sess-1',
        tableId: 'tbl',
        tableName: 'A1',
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
      } as Order,
    ]);
    orderItemRepository.findByOrderIdAndTenant.mockResolvedValue([
      {
        id: 'item-1',
        tenantId: 't1',
        orderId: 'order-1',
        menuItemId: 'menu-1',
        menuItemName: 'Phở bò',
        menuItemImageUrl: 'https://cdn.example.com/pho.jpg',
        quantity: 1,
        unitPrice: 65000,
        note: null,
        status: OrderItemStatus.PROCESSING,
        station: null,
        createdAt: now,
        updatedAt: now,
      } as OrderItem,
    ]);

    const result = await service.listOrdersForCustomerSession({ tenantId: 't1', sessionId: 'sess-1' });

    expect(sessionService.getActiveSessionOrThrow).toHaveBeenCalledWith('t1', 'sess-1');
    expect(orderRepository.findBySessionIdAndTenant).toHaveBeenCalledWith('sess-1', 't1');
    expect(result).toHaveLength(1);
    expect(result[0].items[0].menuItemImageUrl).toBe('https://cdn.example.com/pho.jpg');
  });

  it('persists order item image snapshot when submitting order', async () => {
    const now = new Date('2026-05-02T00:00:00.000Z');
    const session = {
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

    sessionService.getActiveSessionOrThrow.mockResolvedValue(session);
    cartService.getSnapshot
      .mockResolvedValueOnce({
        tenantId: 't1',
        sessionId: 'sess-1',
        cartVersion: 0,
        status: 'ACTIVE',
        updatedAt: now.toISOString(),
        items: [
          {
            cartLineId: 'line-1',
            menuItemId: 'menu-1',
            menuItemName: 'Phở bò',
            menuItemImageUrl: 'https://cdn.example.com/pho.jpg',
            quantity: 1,
            unitPrice: 65000,
            lineVersion: 1,
          },
        ],
      })
      .mockResolvedValueOnce({
        tenantId: 't1',
        sessionId: 'sess-1',
        cartVersion: 1,
        status: 'ACTIVE',
        updatedAt: now.toISOString(),
        items: [],
      });
    cartService.mutate.mockResolvedValue({
      tenantId: 't1',
      sessionId: 'sess-1',
      cartVersion: 1,
      status: 'ACTIVE',
      updatedAt: now.toISOString(),
      items: [],
    });

    const savedOrderItems: OrderItem[] = [];
    const savedBill = {
      id: 'bill-1',
      tenantId: 't1',
      sessionId: 'sess-1',
      orderIds: [],
      subtotal: 0,
      total: 0,
      roundingAmount: 0,
      paymentMethod: null,
      status: BillStatus.OPEN,
      closedAt: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const savedOrder = {
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
        if (ctor === Order) return { ...savedOrder, ...payload };
        if (ctor === OrderItem)
          return { id: `item-${savedOrderItems.length + 1}`, ...payload, createdAt: now, updatedAt: now };
        if (ctor === Bill) return { ...savedBill, ...payload };
        return payload;
      }),
      save: jest.fn((_ctor: unknown, row: unknown) => {
        if ((row as OrderItem).menuItemId) {
          savedOrderItems.push(row as OrderItem);
        }
        return Promise.resolve(row);
      }),
      find: jest.fn().mockResolvedValue([savedOrder]),
    };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

    const result = await service.submitOrder({
      tenantId: 't1',
      sessionId: 'sess-1',
      expectedCartVersion: 0,
      idempotencyKey: 'idem-1',
    });

    expect(savedOrderItems[0].menuItemImageUrl).toBe('https://cdn.example.com/pho.jpg');
    expect(result.order.items[0].menuItemImageUrl).toBe('https://cdn.example.com/pho.jpg');
  });

  it('rejects customer cancel for another session order', async () => {
    const pendingOrder = {
      id: 'o1',
      tenantId: 't1',
      sessionId: 'sess-other',
      tableId: 'tbl',
      tableName: 'A1',
      status: OrderStatus.PENDING,
      totalAmount: 1000,
      idempotencyKey: 'k',
      notes: null,
      confirmedAt: null,
      confirmedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    const manager = { save: jest.fn(), findOne: jest.fn() };
    dataSource.transaction.mockImplementation(async (cb: (m: unknown) => Promise<unknown>) => cb(manager));

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
    const now = new Date();
    const pendingOrder = {
      id: 'o1',
      tenantId: 't1',
      sessionId: 'sess-1',
      tableId: 'tbl',
      tableName: 'A1',
      status: OrderStatus.PENDING,
      totalAmount: 1000,
      idempotencyKey: 'k',
      notes: null,
      confirmedAt: null,
      confirmedByUserId: null,
      cancelledAt: null,
      cancelledByUserId: null,
      cancelReason: null,
      createdAt: now,
      updatedAt: now,
    } as Order;

    orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(pendingOrder);
    orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([]);
    billRepository.findByIdAndTenantForUpdate.mockResolvedValue(null);

    const managerSave = jest.fn().mockImplementation((_entity, row: Order) => {
      if (row.status === OrderStatus.CANCELED) {
        Object.assign(pendingOrder, row);
      }
      return Promise.resolve(row);
    });
    const manager = { save: managerSave, findOne: jest.fn() };
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

  describe('joinSession', () => {
    const baseTable = {
      id: 'tbl-1',
      name: 'T1',
      status: TABLE_STATUS.AVAILABLE,
      sessionId: null as string | null,
    };

    beforeEach(() => {
      catalogClient.send.mockReset();
      sessionRepository.save.mockReset();
      sessionRepository.findActiveByIdAndTenant.mockReset();
      sessionService.getActiveSessionOrThrow.mockReset();
      sessionService.touchCustomerSessionActivity.mockReset();
    });

    it('creates session when table is AVAILABLE', async () => {
      catalogClient.send.mockImplementation((msg: string) => {
        if (msg === TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN) {
          return of({ statusCode: 200, data: { ...baseTable, status: TABLE_STATUS.AVAILABLE } });
        }
        if (msg === TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS) {
          return of({ statusCode: 200, data: {} });
        }
        return of({ statusCode: 500, data: null });
      });

      const savedSession = {
        id: 'sess-new',
        tenantId: 't1',
        tableId: 'tbl-1',
        tableName: 'T1',
        status: SessionStatus.ACTIVE,
        startedAt: new Date(),
        lastActivity: new Date(),
        closedAt: null,
        orderCount: 0,
        currentBillId: null,
        version: 1,
      } as Session;

      sessionRepository.save.mockResolvedValue(savedSession);
      sessionService.getActiveSessionOrThrow.mockResolvedValue(savedSession);

      const result = await service.joinSession({
        tenantId: 't1',
        tableId: 'tbl-1',
        qrToken: 'tok',
      });

      expect(result.id).toBe('sess-new');
      expect(sessionRepository.save).toHaveBeenCalled();
      expect(sessionService.touchCustomerSessionActivity).not.toHaveBeenCalled();
    });

    it('returns existing active session when table is OCCUPIED', async () => {
      catalogClient.send.mockImplementation((msg: string) => {
        if (msg === TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN) {
          return of({
            statusCode: 200,
            data: { ...baseTable, status: TABLE_STATUS.OCCUPIED, sessionId: 'sess-1' },
          });
        }
        return of({ statusCode: 500, data: null });
      });

      const existing = {
        id: 'sess-1',
        tenantId: 't1',
        tableId: 'tbl-1',
        tableName: 'T1',
        status: SessionStatus.ACTIVE,
        startedAt: new Date(),
        lastActivity: new Date(),
        closedAt: null,
        orderCount: 0,
        currentBillId: null,
        version: 1,
      } as Session;

      sessionRepository.findActiveByIdAndTenant.mockResolvedValue(existing);

      const result = await service.joinSession({
        tenantId: 't1',
        tableId: 'tbl-1',
        qrToken: 'tok',
      });

      expect(result.id).toBe('sess-1');
      expect(sessionRepository.save).not.toHaveBeenCalled();
      expect(sessionService.touchCustomerSessionActivity).toHaveBeenCalledWith('t1', 'sess-1');
    });

    it('rejects BILLING table', async () => {
      catalogClient.send.mockImplementation(() =>
        of({
          statusCode: 200,
          data: { ...baseTable, status: TABLE_STATUS.BILLING },
        }),
      );

      await expect(service.joinSession({ tenantId: 't1', tableId: 'tbl-1', qrToken: 'tok' })).rejects.toMatchObject({
        errorCode: ErrorCode.ORDER_JOIN_TABLE_BILLING,
      });
    });
  });

  describe('KDS sync TCP helpers', () => {
    it('getKdsActiveOrderSnapshots maps PROCESSING orders with station-bearing items', async () => {
      const confirmed = new Date('2026-05-07T12:00:00.000Z');
      orderRepository.findActiveKdsOrders.mockResolvedValue([
        {
          id: 'ord-1',
          tenantId: 't1',
          sessionId: 'sess-1',
          tableId: 'tbl-1',
          tableName: 'T1',
          status: OrderStatus.PROCESSING,
          totalAmount: 100,
          idempotencyKey: 'k1',
          notes: null,
          confirmedAt: confirmed,
          confirmedByUserId: 'staff-1',
          cancelledAt: null,
          cancelledByUserId: null,
          cancelReason: null,
          createdAt: confirmed,
          updatedAt: confirmed,
        } as Order,
      ]);
      orderItemRepository.findByOrderIdAndTenant.mockResolvedValue([
        {
          id: 'line-1',
          tenantId: 't1',
          orderId: 'ord-1',
          menuItemId: 'm1',
          menuItemName: 'Phở',
          quantity: 1,
          unitPrice: 50000,
          note: null,
          status: OrderItemStatus.PROCESSING,
          station: 'KITCHEN',
          menuItemImageUrl: null,
          createdAt: confirmed,
          updatedAt: confirmed,
        } as OrderItem,
      ]);

      const rows = await service.getKdsActiveOrderSnapshots({ tenantId: 't1' });

      expect(orderRepository.findActiveKdsOrders).toHaveBeenCalledWith('t1', undefined);
      expect(rows).toHaveLength(1);
      expect(rows[0].orderId).toBe('ord-1');
      expect(rows[0].items[0].station).toBe('KITCHEN');
    });

    it('getKdsActiveOrderSnapshots filters items by station when station is set', async () => {
      const confirmed = new Date('2026-05-07T12:00:00.000Z');
      orderRepository.findActiveKdsOrders.mockResolvedValue([
        {
          id: 'ord-1',
          tenantId: 't1',
          sessionId: 'sess-1',
          tableId: 'tbl-1',
          tableName: 'T1',
          status: OrderStatus.PROCESSING,
          totalAmount: 100,
          idempotencyKey: 'k1',
          notes: null,
          confirmedAt: confirmed,
          confirmedByUserId: 'staff-1',
          cancelledAt: null,
          cancelledByUserId: null,
          cancelReason: null,
          createdAt: confirmed,
          updatedAt: confirmed,
        } as Order,
      ]);
      orderItemRepository.findByOrderIdAndTenant.mockResolvedValue([
        {
          id: 'k-line',
          tenantId: 't1',
          orderId: 'ord-1',
          menuItemId: 'm1',
          menuItemName: 'Phở',
          quantity: 1,
          unitPrice: 50000,
          note: null,
          status: OrderItemStatus.PROCESSING,
          station: 'KITCHEN',
          menuItemImageUrl: null,
          createdAt: confirmed,
          updatedAt: confirmed,
        } as OrderItem,
        {
          id: 'b-line',
          tenantId: 't1',
          orderId: 'ord-1',
          menuItemId: 'm2',
          menuItemName: 'Cà phê',
          quantity: 1,
          unitPrice: 30000,
          note: null,
          status: OrderItemStatus.PROCESSING,
          station: 'BAR',
          menuItemImageUrl: null,
          createdAt: confirmed,
          updatedAt: confirmed,
        } as OrderItem,
      ]);

      const rows = await service.getKdsActiveOrderSnapshots({ tenantId: 't1', station: 'BAR' });

      expect(orderRepository.findActiveKdsOrders).toHaveBeenCalledWith('t1', 'BAR');
      expect(rows[0].items).toHaveLength(1);
      expect(rows[0].items[0].station).toBe('BAR');
    });

    it('markOrderItemsReady rejects when item station does not match ticket station', async () => {
      dataSource.transaction.mockImplementation(async (cb) =>
        cb({
          createQueryBuilder: jest.fn(() => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 0 }),
          })),
          save: jest.fn(),
        }),
      );

      orderRepository.findByIdAndTenantForUpdate.mockResolvedValue({
        id: 'ord-1',
        tenantId: 't1',
        sessionId: 'sess-1',
        tableId: 'tbl',
        tableName: 'A',
        status: OrderStatus.PROCESSING,
        confirmedAt: new Date(),
      } as Order);

      orderItemRepository.findByOrderIdAndTenantWithManager.mockResolvedValue([
        {
          id: 'wrong-line',
          tenantId: 't1',
          orderId: 'ord-1',
          menuItemId: 'm1',
          menuItemName: 'X',
          quantity: 1,
          unitPrice: 1,
          note: null,
          status: OrderItemStatus.PROCESSING,
          station: 'BAR',
          menuItemImageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as OrderItem,
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
      const orderRow = {
        id: 'ord-1',
        tenantId: 't1',
        sessionId: 'sess-1',
        tableId: 'tbl',
        tableName: 'A',
        status: OrderStatus.PROCESSING,
        totalAmount: 100,
        idempotencyKey: 'k',
        notes: null,
        confirmedAt: confirmed,
        confirmedByUserId: 's',
        cancelledAt: null,
        cancelledByUserId: null,
        cancelReason: null,
        createdAt: confirmed,
        updatedAt: confirmed,
      } as Order;

      const line = {
        id: 'line-1',
        tenantId: 't1',
        orderId: 'ord-1',
        menuItemId: 'm1',
        menuItemName: 'Phở',
        quantity: 1,
        unitPrice: 50000,
        note: null,
        status: OrderItemStatus.PROCESSING,
        station: 'KITCHEN',
        menuItemImageUrl: null,
        createdAt: confirmed,
        updatedAt: confirmed,
      } as OrderItem;

      orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(orderRow);
      orderItemRepository.findByOrderIdAndTenantWithManager
        .mockResolvedValueOnce([line])
        .mockResolvedValueOnce([{ ...line, status: OrderItemStatus.READY }]);

      const managerMock = {
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        })),
        save: jest.fn((_Entity: unknown, o: Order) => Promise.resolve(o)),
      };
      dataSource.transaction.mockImplementation(async (cb) => cb(managerMock));

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
      expect(managerMock.save).toHaveBeenCalled();
    });

    it('revertOrderItemsProcessing moves READY order back to PROCESSING when items return to PROCESSING', async () => {
      const confirmed = new Date('2026-05-07T12:00:00.000Z');
      const orderRow = {
        id: 'ord-1',
        tenantId: 't1',
        sessionId: 'sess-1',
        tableId: 'tbl',
        tableName: 'A',
        status: OrderStatus.READY,
        totalAmount: 100,
        idempotencyKey: 'k',
        notes: null,
        confirmedAt: confirmed,
        confirmedByUserId: 's',
        cancelledAt: null,
        cancelledByUserId: null,
        cancelReason: null,
        createdAt: confirmed,
        updatedAt: confirmed,
      } as Order;

      const readyLine = {
        id: 'line-1',
        tenantId: 't1',
        orderId: 'ord-1',
        menuItemId: 'm1',
        menuItemName: 'Phở',
        quantity: 1,
        unitPrice: 50000,
        note: null,
        status: OrderItemStatus.READY,
        station: 'KITCHEN',
        menuItemImageUrl: null,
        createdAt: confirmed,
        updatedAt: confirmed,
      } as OrderItem;

      orderRepository.findByIdAndTenantForUpdate.mockResolvedValue(orderRow);
      orderItemRepository.findByOrderIdAndTenantWithManager
        .mockResolvedValueOnce([readyLine])
        .mockResolvedValueOnce([{ ...readyLine, status: OrderItemStatus.PROCESSING }]);

      const managerMock = {
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 1 }),
        })),
        save: jest.fn((_Entity: unknown, o: Order) => Promise.resolve(o)),
      };
      dataSource.transaction.mockImplementation(async (cb) => cb(managerMock));

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
  });
});
