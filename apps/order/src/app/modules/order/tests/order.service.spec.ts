import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
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
  let orderRepository: { findByIdAndTenantForUpdate: jest.Mock };
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
    orderRepository = { findByIdAndTenantForUpdate: jest.fn() };
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
});
