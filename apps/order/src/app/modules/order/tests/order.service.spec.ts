import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { Session } from '@common/entities/session.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderItemStatus, OrderStatus, SessionStatus } from '@einvoice/types';
import { of } from 'rxjs';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { OrderKdsEventService } from '../services/order-kds-event.service';
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
  };
  let orderItemRepository: { findByOrderIdAndTenant: jest.Mock; findByOrderIdAndTenantWithManager: jest.Mock };
  let sessionRepository: { findByIdAndTenant: jest.Mock; save: jest.Mock; findActiveByIdAndTenant: jest.Mock };
  let sessionService: {
    getActiveSessionOrThrow: jest.Mock;
    touchCustomerSessionActivity: jest.Mock;
  };
  let catalogClient: { send: jest.Mock };
  let orderSubmitService: { submitOrder: jest.Mock };
  let orderStateTransitionService: {
    confirmOrder: jest.Mock;
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
    };
    orderItemRepository = {
      findByOrderIdAndTenant: jest.fn(),
      findByOrderIdAndTenantWithManager: jest.fn(),
    };
    sessionRepository = { findByIdAndTenant: jest.fn(), save: jest.fn(), findActiveByIdAndTenant: jest.fn() };
    sessionService = { getActiveSessionOrThrow: jest.fn(), touchCustomerSessionActivity: jest.fn() };
    catalogClient = { send: jest.fn() };
    orderSubmitService = { submitOrder: jest.fn() };
    orderStateTransitionService = {
      confirmOrder: jest.fn(),
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
        { provide: OrderKdsEventService, useClass: OrderKdsEventService },
        { provide: OrderStateTransitionService, useValue: orderStateTransitionService },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
      ],
    }).compile();

    service = module.get(OrderService);
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
  });
});
