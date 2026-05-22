import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { SubscriptionStatus } from '@common/constants/saas.constants';
import { Bill } from '@common/entities/bill.entity';
import { OrderItem } from '@common/entities/order-item.entity';
import { Order } from '@common/entities/order.entity';
import { Session } from '@common/entities/session.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { SubmitOrderTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { SubmitOrderTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import type {
  SubscriptionDashboardTcpResponse,
  TenantPlanLimitExceededDetails,
} from '@common/interfaces/tcp/saas/saas-response.interface';
import type { Bill as BillDto, Order as OrderDto, OrderItem as OrderItemDto } from '@einvoice/types';
import { BillStatus, OrderCreatedEvent, OrderItemStatus, OrderStatus, SessionStatus } from '@einvoice/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { firstValueFrom, timeout } from 'rxjs';
import { recalculateBillTotals } from '../utils/recalculate-bill-totals';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CartService } from './cart.service';
import { OrderQuotaService } from './order-quota.service';
import { SessionService } from './session.service';

type SubmitTxOutcome =
  | { kind: 'replay'; order: Order }
  | {
      kind: 'created';
      order: Order;
      bill: Bill;
      items: OrderItem[];
      cartUpdated: SubmitOrderTcpResponse['events']['cartUpdated'];
    };

const SAAS_ORDER_QUOTA_TIMEOUT_MS = 2500;

@Injectable()
export class OrderSubmitService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
    private readonly orderItemRepository: OrderItemRepository,
    private readonly billRepository: BillRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly cartService: CartService,
    private readonly sessionService: SessionService,
    private readonly orderQuotaService: OrderQuotaService,
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
  ) {}

  async submitOrder(dto: SubmitOrderTcpRequest): Promise<SubmitOrderTcpResponse> {
    await this.sessionService.getActiveSessionOrThrow(dto.tenantId, dto.sessionId);

    const existingBeforeQuota = await this.orderRepository.findByIdempotencyKey(
      dto.tenantId,
      dto.sessionId,
      dto.idempotencyKey,
    );
    let quotaReserved = false;
    if (!existingBeforeQuota) {
      const snapshot = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);
      if (snapshot.cartVersion !== dto.expectedCartVersion) {
        throw new BusinessException(ErrorCode.CART_VERSION_CONFLICT, HttpStatus.CONFLICT);
      }
      if (snapshot.items.length === 0) {
        throw new BusinessException(ErrorCode.ORDER_EMPTY_CART, HttpStatus.BAD_REQUEST);
      }
      quotaReserved = await this.reserveDailyOrderQuota(dto.tenantId);
    }

    let outcome: SubmitTxOutcome;
    try {
      outcome = await this.dataSource.transaction(async (manager) => {
        const session = await this.lockSession(manager, dto.sessionId, dto.tenantId);
        if (!session || session.status !== SessionStatus.ACTIVE) {
          throw new BusinessException(ErrorCode.SESSION_CLOSED, HttpStatus.GONE);
        }

        const existing = await manager.getRepository(Order).findOne({
          where: { tenantId: dto.tenantId, sessionId: dto.sessionId, idempotencyKey: dto.idempotencyKey },
        });
        if (existing) {
          return { kind: 'replay', order: existing } satisfies SubmitTxOutcome;
        }

        const snapshot = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);
        if (snapshot.cartVersion !== dto.expectedCartVersion) {
          throw new BusinessException(ErrorCode.CART_VERSION_CONFLICT, HttpStatus.CONFLICT);
        }
        if (snapshot.items.length === 0) {
          throw new BusinessException(ErrorCode.ORDER_EMPTY_CART, HttpStatus.BAD_REQUEST);
        }

        const totalAmount = snapshot.items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

        const bill = await this.resolveOpenBillForSubmit(manager, session, dto.tenantId);

        const order = manager.create(Order, {
          tenantId: dto.tenantId,
          tableId: session.tableId,
          tableName: session.tableName,
          sessionId: dto.sessionId,
          status: OrderStatus.PENDING,
          totalAmount,
          idempotencyKey: dto.idempotencyKey,
          notes: dto.notes?.trim() ? dto.notes.trim().slice(0, 2000) : null,
          confirmedAt: null,
          confirmedByUserId: null,
          cancelledAt: null,
          cancelledByUserId: null,
          cancelReason: null,
        });
        await manager.save(Order, order);

        const items: OrderItem[] = [];
        for (const line of snapshot.items) {
          const row = manager.create(OrderItem, {
            tenantId: dto.tenantId,
            orderId: order.id,
            menuItemId: line.menuItemId,
            menuItemName: line.menuItemName,
            menuItemImageUrl: line.menuItemImageUrl ?? null,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            note: line.note ?? null,
            status: OrderItemStatus.PROCESSING,
            station: line.station ?? null,
          });
          await manager.save(OrderItem, row);
          items.push(row);
        }

        const orderIds = [...(bill.orderIds ?? []).filter(Boolean), order.id];
        bill.orderIds = orderIds;
        await recalculateBillTotals(manager, bill, dto.tenantId);
        await manager.save(Bill, bill);

        session.orderCount += 1;
        session.currentBillId = bill.id;
        await manager.save(Session, session);

        const cartUpdated = await this.cartService.clearForSubmittedOrder(
          dto.tenantId,
          dto.sessionId,
          snapshot.cartVersion,
        );

        return { kind: 'created', order, bill, items, cartUpdated } satisfies SubmitTxOutcome;
      });
    } catch (error) {
      if (quotaReserved) {
        await this.orderQuotaService.decrementDailyOrders(dto.tenantId);
      }
      throw error;
    }

    if (quotaReserved && outcome.kind === 'replay') {
      await this.orderQuotaService.decrementDailyOrders(dto.tenantId);
    }

    let cartUpdated: SubmitOrderTcpResponse['events']['cartUpdated'];
    if (outcome.kind === 'created') {
      cartUpdated = outcome.cartUpdated;
    } else {
      const snap = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);
      cartUpdated = {
        tenantId: snap.tenantId,
        sessionId: snap.sessionId,
        cartVersion: snap.cartVersion,
        status: snap.status,
        items: snap.items,
        updatedAt: snap.updatedAt,
      };
    }

    const orderEntity = outcome.order;
    const items =
      outcome.kind === 'created'
        ? outcome.items
        : await this.orderItemRepository.findByOrderIdAndTenant(orderEntity.id, dto.tenantId);
    const billEntity =
      outcome.kind === 'created'
        ? outcome.bill
        : await this.resolveBillForOrder(orderEntity.sessionId, dto.tenantId, orderEntity.id);

    if (!billEntity) {
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const orderDto = this.toOrderDto(orderEntity, items);
    const billDto = this.toBillDto(billEntity);
    const cartDto = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);

    const orderCreated: OrderCreatedEvent = {
      tenantId: dto.tenantId,
      orderId: orderEntity.id,
      tableId: orderEntity.tableId,
      tableName: orderEntity.tableName,
      sessionId: orderEntity.sessionId,
      items: orderDto.items,
      totalAmount: orderEntity.totalAmount,
      timestamp: orderEntity.createdAt.toISOString(),
    };

    return {
      order: orderDto,
      bill: billDto,
      cart: cartDto,
      events: { cartUpdated, orderCreated },
    };
  }

  private async lockSession(manager: EntityManager, sessionId: string, tenantId: string): Promise<Session | null> {
    return manager
      .getRepository(Session)
      .createQueryBuilder('s')
      .setLock('pessimistic_write')
      .where('s.id = :sessionId', { sessionId })
      .andWhere('s.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  private async resolveOpenBillForSubmit(manager: EntityManager, session: Session, tenantId: string): Promise<Bill> {
    if (session.currentBillId) {
      const bill = await this.billRepository.findByIdAndTenantForUpdate(session.currentBillId, tenantId, manager);
      if (!bill) {
        throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
      }
      if (bill.status !== BillStatus.OPEN) {
        throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
      }
      return bill;
    }

    const bill = manager.create(Bill, {
      tenantId,
      sessionId: session.id,
      orderIds: [],
      subtotal: 0,
      total: 0,
      roundingAmount: 0,
      paymentMethod: null,
      status: BillStatus.OPEN,
      closedAt: null,
      paidAt: null,
    });
    await manager.save(Bill, bill);
    return bill;
  }

  private async resolveBillForOrder(sessionId: string, tenantId: string, orderId: string): Promise<Bill | null> {
    const session = await this.sessionRepository.findByIdAndTenant(sessionId, tenantId);
    if (!session?.currentBillId) {
      return null;
    }
    const bill = await this.billRepository.findByIdAndTenant(session.currentBillId, tenantId);
    if (!bill?.orderIds?.includes(orderId)) {
      return null;
    }
    return bill;
  }

  private async reserveDailyOrderQuota(tenantId: string): Promise<boolean> {
    const dashboard = await this.callSaasCurrentSubscription(tenantId);
    const limit = dashboard.current?.maxOrdersPerDay;

    if (dashboard.current?.status !== SubscriptionStatus.ACTIVE || !Number.isSafeInteger(limit) || limit < -1) {
      throw this.buildTenantPlanLimitExceeded(0, 0);
    }

    if (limit === -1) {
      return false;
    }

    const reservedCount = await this.orderQuotaService.incrementDailyOrders(tenantId);
    if (reservedCount > limit) {
      await this.orderQuotaService.decrementDailyOrders(tenantId);
      throw this.buildTenantPlanLimitExceeded(limit, reservedCount - 1);
    }
    return true;
  }

  private async callSaasCurrentSubscription(tenantId: string): Promise<SubscriptionDashboardTcpResponse> {
    try {
      const response = await firstValueFrom(
        this.saasClient
          .send<
            SubscriptionDashboardTcpResponse,
            { tenantId: string }
          >(TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT, new Request<{ tenantId: string }>({ tenantId, data: { tenantId } }))
          .pipe(timeout({ first: SAAS_ORDER_QUOTA_TIMEOUT_MS })),
      );
      if (response.error || response.statusCode >= 400 || !response.data?.current) {
        throw this.buildTenantPlanLimitExceeded(0, 0);
      }
      return response.data;
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      throw this.buildTenantPlanLimitExceeded(0, 0);
    }
  }

  private buildTenantPlanLimitExceeded(limit: number, current: number): BusinessException {
    const details: TenantPlanLimitExceededDetails = {
      limitType: 'max_orders_per_day',
      limit,
      current,
      upgradeUrl: '/dashboard/subscription',
    };
    return new BusinessException(
      ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
      HttpStatus.FORBIDDEN,
      undefined,
      undefined,
      details,
    );
  }

  private toOrderDto(entity: Order, items: OrderItem[]): OrderDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      tableId: entity.tableId,
      tableName: entity.tableName,
      sessionId: entity.sessionId,
      status: entity.status,
      totalAmount: entity.totalAmount,
      idempotencyKey: entity.idempotencyKey,
      notes: entity.notes ?? undefined,
      confirmedAt: entity.confirmedAt?.toISOString(),
      confirmedByUserId: entity.confirmedByUserId ?? undefined,
      cancelledAt: entity.cancelledAt?.toISOString(),
      cancelledByUserId: entity.cancelledByUserId ?? undefined,
      cancelReason: entity.cancelReason ?? undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      items: items.map((it) => this.toOrderItemDto(it)),
    };
  }

  private toOrderItemDto(entity: OrderItem): OrderItemDto {
    return {
      id: entity.id,
      orderId: entity.orderId,
      menuItemId: entity.menuItemId,
      menuItemName: entity.menuItemName,
      menuItemImageUrl: entity.menuItemImageUrl ?? null,
      quantity: entity.quantity,
      unitPrice: entity.unitPrice,
      note: entity.note ?? undefined,
      status: entity.status,
      station: entity.station ?? undefined,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private toBillDto(entity: Bill): BillDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      sessionId: entity.sessionId,
      orderIds: entity.orderIds ?? [],
      subtotal: entity.subtotal,
      total: entity.total,
      roundingAmount: entity.roundingAmount,
      paymentMethod: entity.paymentMethod ?? undefined,
      status: entity.status,
      closedAt: entity.closedAt?.toISOString(),
      paidAt: entity.paidAt?.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
