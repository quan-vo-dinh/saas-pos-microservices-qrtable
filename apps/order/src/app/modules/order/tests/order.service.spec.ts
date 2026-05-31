import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { Session } from '@common/entities/session.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { OrderActionTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemStatus, OrderStatus, SessionStatus } from '@einvoice/types';
import { of } from 'rxjs';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { OrderKdsEventService } from '../services/order-kds-event.service';
import { OrderConfirmSagaService } from '../services/order-confirm-saga.service';
import { OrderService } from '../services/order.service';
import { OrderStateTransitionService } from '../services/order-state-transition.service';
import { OrderSubmitService } from '../services/order-submit.service';
import { SessionService } from '../services/session.service';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepository: {
    findByIdAndTenantForUpdate: jest.Mock;
    findBySessionIdAndTenant: jest.Mock;
    findActiveKdsOrders: jest.Mock;
    countCreatedBetweenByTenant: jest.Mock;
  };
  let orderItemRepository: { findByOrderIdAndTenant: jest.Mock; findByOrderIdAndTenantWithManager: jest.Mock };
  let sessionRepository: { findByIdAndTenant: jest.Mock; save: jest.Mock; findActiveByIdAndTenant: jest.Mock };
  let sessionService: {
    getActiveSessionOrThrow: jest.Mock;
    touchCustomerSessionActivity: jest.Mock;
    releaseTableForClosedSession: jest.Mock;
    releaseEmptyTableSession: jest.Mock;
  };
  let catalogClient: { send: jest.Mock };
  let orderSubmitService: { submitOrder: jest.Mock };
  let orderConfirmSagaService: { confirmOrder: jest.Mock };
  let orderStateTransitionService: {
    customerCancelPending: jest.Mock;
    cancelPendingStaff: jest.Mock;
    cancelProcessing: jest.Mock;
    markOrderServed: jest.Mock;
    markOrderItemsReady: jest.Mock;
    revertOrderItemsProcessing: jest.Mock;
  };

  beforeEach(async () => {
    orderRepository = {
      findByIdAndTenantForUpdate: jest.fn(),
      findBySessionIdAndTenant: jest.fn(),
      findActiveKdsOrders: jest.fn(),
      countCreatedBetweenByTenant: jest.fn(),
    };
    orderItemRepository = {
      findByOrderIdAndTenant: jest.fn(),
      findByOrderIdAndTenantWithManager: jest.fn(),
    };
    sessionRepository = { findByIdAndTenant: jest.fn(), save: jest.fn(), findActiveByIdAndTenant: jest.fn() };
    sessionService = {
      getActiveSessionOrThrow: jest.fn(),
      touchCustomerSessionActivity: jest.fn(),
      releaseTableForClosedSession: jest.fn(),
      releaseEmptyTableSession: jest.fn(),
    };
    catalogClient = { send: jest.fn() };
    orderSubmitService = { submitOrder: jest.fn() };
    orderConfirmSagaService = { confirmOrder: jest.fn() };
    orderStateTransitionService = {
      customerCancelPending: jest.fn(),
      cancelPendingStaff: jest.fn(),
      cancelProcessing: jest.fn(),
      markOrderServed: jest.fn(),
      markOrderItemsReady: jest.fn(),
      revertOrderItemsProcessing: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: OrderRepository, useValue: orderRepository },
        { provide: OrderItemRepository, useValue: orderItemRepository },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: SessionService, useValue: sessionService },
        { provide: OrderSubmitService, useValue: orderSubmitService },
        { provide: OrderConfirmSagaService, useValue: orderConfirmSagaService },
        { provide: OrderKdsEventService, useClass: OrderKdsEventService },
        { provide: OrderStateTransitionService, useValue: orderStateTransitionService },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('counts all persisted tenant orders created during the current Ho Chi Minh day', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-26T18:15:30.000Z'));
    orderRepository.countCreatedBetweenByTenant.mockResolvedValue(7);

    const result = await service.countTodayByTenant({ tenantId: 't1' });

    expect(result).toEqual({ tenantId: 't1', count: 7 });
    expect(orderRepository.countCreatedBetweenByTenant).toHaveBeenCalledWith(
      't1',
      new Date('2026-05-26T17:00:00.000Z'),
      new Date('2026-05-27T17:00:00.000Z'),
    );
  });

  it('delegates order confirmation to the order confirm saga orchestrator', async () => {
    const response = {
      order: { id: 'o1', status: OrderStatus.PROCESSING },
      events: {
        orderStatusChanged: {
          tenantId: 't1',
          orderId: 'o1',
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.PROCESSING,
          changedByUserId: 'staff-1',
          timestamp: '2026-05-02T08:00:00.000Z',
        },
      },
    } as unknown as OrderActionTcpResponse;
    orderConfirmSagaService.confirmOrder.mockResolvedValue(response);

    const dto = { tenantId: 't1', orderId: 'o1', userId: 'staff-1' };
    await expect(service.confirmOrder(dto)).resolves.toBe(response);

    expect(orderConfirmSagaService.confirmOrder).toHaveBeenCalledWith(dto);
    expect(orderStateTransitionService.customerCancelPending).not.toHaveBeenCalled();
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
      sessionService.releaseTableForClosedSession.mockReset();
      sessionService.releaseTableForClosedSession.mockResolvedValue(true);
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

      sessionService.getActiveSessionOrThrow.mockResolvedValue(existing);
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

    it('creates a fresh session when the stale session was already idle-closed and table was released', async () => {
      const validateResponses = [
        { ...baseTable, status: TABLE_STATUS.OCCUPIED, sessionId: 'sess-stale' },
        { ...baseTable, status: TABLE_STATUS.AVAILABLE, sessionId: null },
      ];
      catalogClient.send.mockImplementation((msg: string) => {
        if (msg === TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN) {
          return of({ statusCode: 200, data: validateResponses.shift() });
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
      sessionService.getActiveSessionOrThrow
        .mockRejectedValueOnce(new BusinessException(ErrorCode.SESSION_CLOSED, 410))
        .mockResolvedValueOnce(savedSession);

      const result = await service.joinSession({
        tenantId: 't1',
        tableId: 'tbl-1',
        qrToken: 'tok',
      });

      expect(sessionService.releaseTableForClosedSession).not.toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('sess-new');
    });

    it('releases an OCCUPIED table before creating a fresh session when the stale session was closed elsewhere', async () => {
      const validateResponses = [
        { ...baseTable, status: TABLE_STATUS.OCCUPIED, sessionId: 'sess-stale' },
        { ...baseTable, status: TABLE_STATUS.OCCUPIED, sessionId: 'sess-stale' },
        { ...baseTable, status: TABLE_STATUS.AVAILABLE, sessionId: null },
      ];
      catalogClient.send.mockImplementation((msg: string) => {
        if (msg === TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN) {
          return of({ statusCode: 200, data: validateResponses.shift() });
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
      sessionService.getActiveSessionOrThrow
        .mockRejectedValueOnce(new BusinessException(ErrorCode.SESSION_CLOSED, 410))
        .mockResolvedValueOnce(savedSession);

      const result = await service.joinSession({
        tenantId: 't1',
        tableId: 'tbl-1',
        qrToken: 'tok',
      });

      expect(sessionService.releaseTableForClosedSession).toHaveBeenCalledWith('t1', 'sess-stale', 'tbl-1');
      expect(sessionRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('sess-new');
    });

    it('rejects stale occupied recovery when the closed session is not empty', async () => {
      catalogClient.send.mockImplementation((msg: string) => {
        if (msg === TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN) {
          return of({
            statusCode: 200,
            data: { ...baseTable, status: TABLE_STATUS.OCCUPIED, sessionId: 'sess-with-orders' },
          });
        }
        return of({ statusCode: 500, data: null });
      });
      sessionService.getActiveSessionOrThrow.mockRejectedValueOnce(
        new BusinessException(ErrorCode.SESSION_CLOSED, 410),
      );
      sessionService.releaseTableForClosedSession.mockResolvedValue(false);

      await expect(
        service.joinSession({
          tenantId: 't1',
          tableId: 'tbl-1',
          qrToken: 'tok',
        }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.ORDER_SESSION_MISSING_FOR_OCCUPIED_TABLE,
      });

      expect(sessionService.releaseTableForClosedSession).toHaveBeenCalledWith('t1', 'sess-with-orders', 'tbl-1');
      expect(sessionRepository.save).not.toHaveBeenCalled();
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

  describe('releaseEmptyTableSession', () => {
    beforeEach(() => {
      sessionRepository.findByIdAndTenant.mockReset();
      orderRepository.findBySessionIdAndTenant.mockReset();
      sessionService.releaseEmptyTableSession.mockReset();
    });

    it('releases an empty session that belongs to the requested table', async () => {
      sessionRepository.findByIdAndTenant.mockResolvedValue({
        id: 'sess-empty',
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
      } as Session);
      orderRepository.findBySessionIdAndTenant.mockResolvedValue([]);
      sessionService.releaseEmptyTableSession.mockResolvedValue(true);

      const result = await service.releaseEmptyTableSession({
        tenantId: 't1',
        tableId: 'tbl-1',
        sessionId: 'sess-empty',
        userId: 'staff-1',
      });

      expect(orderRepository.findBySessionIdAndTenant).toHaveBeenCalledWith('sess-empty', 't1');
      expect(sessionService.releaseEmptyTableSession).toHaveBeenCalledWith('t1', 'sess-empty', 'tbl-1');
      expect(result).toEqual({
        tenantId: 't1',
        tableId: 'tbl-1',
        sessionId: 'sess-empty',
        released: true,
      });
    });

    it('rejects release when the session already has persisted orders', async () => {
      sessionRepository.findByIdAndTenant.mockResolvedValue({
        id: 'sess-with-orders',
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
      } as Session);
      orderRepository.findBySessionIdAndTenant.mockResolvedValue([{ id: 'order-1' } as Order]);

      await expect(
        service.releaseEmptyTableSession({
          tenantId: 't1',
          tableId: 'tbl-1',
          sessionId: 'sess-with-orders',
          userId: 'staff-1',
        }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.ORDER_EMPTY_TABLE_SESSION_RELEASE_INVALID,
      });

      expect(sessionService.releaseEmptyTableSession).not.toHaveBeenCalled();
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
  });
});
