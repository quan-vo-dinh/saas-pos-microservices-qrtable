import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { BillStatus, OrderItemStatus, OrderStatus } from '@einvoice/types';
import { throwError } from 'rxjs';
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
  let sessionRepository: { findByIdAndTenant: jest.Mock };
  let cartService: { getSnapshot: jest.Mock; mutate: jest.Mock };
  let sessionService: { getActiveSessionOrThrow: jest.Mock };
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
    sessionRepository = { findByIdAndTenant: jest.fn() };
    cartService = { getSnapshot: jest.fn(), mutate: jest.fn() };
    sessionService = { getActiveSessionOrThrow: jest.fn() };
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
});
