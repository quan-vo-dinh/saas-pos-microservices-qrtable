import { Bill } from '@common/entities/bill.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { BillStatus, OrderStatus, ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';
import { of } from 'rxjs';
import { DataSource } from 'typeorm';
import { BillRepository } from '../repositories/bill.repository';
import { OrderRepository } from '../repositories/order.repository';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { SessionRepository } from '../repositories/session.repository';
import { BillService } from '../services/bill.service';
import { CartService } from '../services/cart.service';
import { SessionService } from '../services/session.service';

describe('BillService', () => {
  let service: BillService;
  let sessionService: { getActiveSessionOrThrow: jest.Mock };
  let sessionRepository: { findActiveByIdAndTenant: jest.Mock };
  let billRepository: { findByIdAndTenant: jest.Mock; findByIdAndTenantForUpdate: jest.Mock };
  let orderRepository: { findByIdsAndTenant: jest.Mock };
  let cartService: { getSnapshot: jest.Mock; lockCart: jest.Mock; unlockCartForBillReopen: jest.Mock };
  let catalogClient: { send: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    sessionService = { getActiveSessionOrThrow: jest.fn().mockResolvedValue({}) };
    sessionRepository = { findActiveByIdAndTenant: jest.fn() };
    billRepository = {
      findByIdAndTenant: jest.fn(),
      findByIdAndTenantForUpdate: jest.fn(),
    };
    orderRepository = { findByIdsAndTenant: jest.fn() };
    cartService = {
      getSnapshot: jest.fn(),
      lockCart: jest.fn(),
      unlockCartForBillReopen: jest.fn(),
    };
    catalogClient = { send: jest.fn() };
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillService,
        { provide: DataSource, useValue: dataSource },
        { provide: BillRepository, useValue: billRepository },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: OrderRepository, useValue: orderRepository },
        { provide: ServiceRequestRepository, useValue: {} },
        { provide: CartService, useValue: cartService },
        { provide: SessionService, useValue: sessionService },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
      ],
    }).compile();

    service = module.get(BillService);
  });

  it('rejects bill request when cart is not empty', async () => {
    sessionRepository.findActiveByIdAndTenant.mockResolvedValue({
      id: 'sess-1',
      tenantId: 't1',
      currentBillId: 'bill-1',
      tableId: 'tbl',
      tableName: 'A1',
    });
    billRepository.findByIdAndTenant.mockResolvedValue({
      id: 'bill-1',
      tenantId: 't1',
      sessionId: 'sess-1',
      orderIds: ['o1'],
      status: BillStatus.OPEN,
      subtotal: 1000,
      total: 1000,
      roundingAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Bill);
    orderRepository.findByIdsAndTenant.mockResolvedValue([
      { id: 'o1', status: OrderStatus.SERVED, totalAmount: 1000 } as never,
    ]);
    cartService.getSnapshot.mockResolvedValue({
      tenantId: 't1',
      sessionId: 'sess-1',
      cartVersion: 1,
      status: 'ACTIVE',
      updatedAt: '2026-04-30T00:00:00.000Z',
      items: [
        {
          cartLineId: 'line-1',
          menuItemId: 'item-1',
          menuItemName: 'Pho',
          quantity: 1,
          unitPrice: 65000,
          lineVersion: 1,
        },
      ],
    });

    await expect(service.requestBill({ tenantId: 't1', sessionId: 'sess-1' })).rejects.toMatchObject({
      errorCode: ErrorCode.BILL_CART_NOT_EMPTY,
    });
  });

  it('turns bill OPEN to PENDING_PAYMENT only when all active orders are SERVED', async () => {
    sessionRepository.findActiveByIdAndTenant.mockResolvedValue({
      id: 'sess-1',
      tenantId: 't1',
      currentBillId: 'bill-1',
      tableId: 'tbl',
      tableName: 'A1',
    });
    const openBill = {
      id: 'bill-1',
      tenantId: 't1',
      sessionId: 'sess-1',
      orderIds: ['o1'],
      status: BillStatus.OPEN,
      subtotal: 1000,
      total: 1000,
      roundingAmount: 0,
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Bill;
    billRepository.findByIdAndTenant.mockResolvedValue(openBill);
    orderRepository.findByIdsAndTenant.mockResolvedValue([
      { id: 'o1', status: OrderStatus.SERVED, totalAmount: 1000 } as never,
    ]);
    cartService.getSnapshot.mockResolvedValueOnce({
      tenantId: 't1',
      sessionId: 'sess-1',
      cartVersion: 2,
      status: 'ACTIVE',
      updatedAt: '2026-04-30T00:00:00.000Z',
      items: [],
    });

    const billEntity = { ...openBill, status: BillStatus.PENDING_PAYMENT, closedAt: new Date() };
    const requestEntity = {
      id: 'req-1',
      tenantId: 't1',
      tableId: 'tbl',
      tableName: 'A1',
      sessionId: 'sess-1',
      type: ServiceRequestType.REQUEST_BILL,
      status: ServiceRequestStatus.PENDING,
      note: null,
      acknowledgedAt: null,
      acknowledgedByUserId: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    dataSource.transaction.mockResolvedValue({ billEntity, requestEntity });

    cartService.lockCart.mockResolvedValue({
      tenantId: 't1',
      sessionId: 'sess-1',
      cartVersion: 3,
      status: 'LOCKED',
      items: [],
      updatedAt: '2026-04-30T00:00:01.000Z',
    });
    catalogClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: { id: 'tbl', tenantId: 't1', name: 'A1', status: 'billing' },
      }),
    );
    cartService.getSnapshot.mockResolvedValueOnce({
      tenantId: 't1',
      sessionId: 'sess-1',
      cartVersion: 3,
      status: 'LOCKED',
      items: [],
      updatedAt: '2026-04-30T00:00:01.000Z',
    });

    const result = await service.requestBill({ tenantId: 't1', sessionId: 'sess-1' });

    expect(result.bill.status).toBe(BillStatus.PENDING_PAYMENT);
    expect(catalogClient.send).toHaveBeenCalled();
  });
});
