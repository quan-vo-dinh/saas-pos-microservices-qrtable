import { Bill } from '@common/entities/bill.entity';
import { ServiceRequest } from '@common/entities/service-request.entity';
import { Table } from '@common/entities/table.entity';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { UpdateTableStatusTcpRequest } from '@common/interfaces/tcp/catalog/table-request.interface';
import type {
  BillMarkPaidTcpRequest,
  BillPaymentSnapshotTcpRequest,
  BillSessionTcpRequest,
  ListBillsTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  BillCurrentTcpResponse,
  BillMarkedPaidTcpResponse,
  BillPaymentSnapshotTcpResponse,
  BillRequestedTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import type { Bill as BillDto, ServiceRequest as ServiceRequestDto } from '@einvoice/types';
import {
  BillRequestedEvent,
  BillStatus,
  OrderStatus,
  PaymentMethod,
  ServiceRequestedEvent,
  ServiceRequestStatus,
  ServiceRequestType,
} from '@einvoice/types';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { DataSource } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { BillRepository } from '../repositories/bill.repository';
import { OrderRepository } from '../repositories/order.repository';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { SessionRepository } from '../repositories/session.repository';
import { CartService } from './cart.service';
import { SessionService } from './session.service';

@Injectable()
export class BillService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly billRepository: BillRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly orderRepository: OrderRepository,
    private readonly serviceRequestRepository: ServiceRequestRepository,
    private readonly cartService: CartService,
    private readonly sessionService: SessionService,
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
  ) {}

  async getCurrentBill(dto: BillSessionTcpRequest): Promise<BillCurrentTcpResponse> {
    await this.sessionService.getActiveSessionOrThrow(dto.tenantId, dto.sessionId);
    const session = await this.sessionRepository.findActiveByIdAndTenant(dto.sessionId, dto.tenantId);
    const cart = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);
    if (!session?.currentBillId) {
      return { bill: null, cart };
    }
    const bill = await this.billRepository.findByIdAndTenant(session.currentBillId, dto.tenantId);
    return { bill: bill ? this.toBillDto(bill) : null, cart };
  }

  async listBills(dto: ListBillsTcpRequest): Promise<BillDto[]> {
    const limit = Math.min(Math.max(dto.limit ?? 50, 1), 200);
    const offset = Math.max(dto.offset ?? 0, 0);
    const rows = await this.billRepository.findStaffList(dto.tenantId, {
      status: dto.status,
      limit,
      offset,
    });
    return rows.map((r) => this.toBillDto(r));
  }

  async getPaymentSnapshot(dto: BillPaymentSnapshotTcpRequest): Promise<BillPaymentSnapshotTcpResponse> {
    const bill = await this.billRepository.findByIdAndTenant(dto.billId, dto.tenantId);
    if (!bill) {
      throw new BusinessException(ErrorCode.BILL_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return {
      billId: bill.id,
      tenantId: bill.tenantId,
      sessionId: bill.sessionId,
      status: bill.status,
      rawTotal: bill.subtotal,
      roundedTotal: bill.total,
      roundingDelta: bill.roundingAmount,
    };
  }

  async markPaid(dto: BillMarkPaidTcpRequest): Promise<BillMarkedPaidTcpResponse> {
    const bill = await this.billRepository.findByIdAndTenant(dto.billId, dto.tenantId);
    if (!bill) {
      throw new BusinessException(ErrorCode.BILL_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (bill.status === BillStatus.PAID) {
      return { bill: this.toBillDto(bill) };
    }
    if (bill.status !== BillStatus.PENDING_PAYMENT) {
      throw new BusinessException(ErrorCode.BILL_NOT_PENDING_PAYMENT, HttpStatus.CONFLICT);
    }
    bill.status = BillStatus.PAID;
    bill.paymentMethod = dto.method as PaymentMethod;
    bill.paidAt = new Date(dto.paidAt);
    await this.billRepository.save(bill);
    return { bill: this.toBillDto(bill) };
  }

  async requestBill(dto: BillSessionTcpRequest): Promise<BillRequestedTcpResponse> {
    await this.sessionService.getActiveSessionOrThrow(dto.tenantId, dto.sessionId);
    const session = await this.sessionRepository.findActiveByIdAndTenant(dto.sessionId, dto.tenantId);
    if (!session?.currentBillId) {
      throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
    }

    const cartSnap = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);
    if (cartSnap.items.length > 0) {
      throw new BusinessException(ErrorCode.BILL_CART_NOT_EMPTY, HttpStatus.CONFLICT);
    }

    const bill = await this.billRepository.findByIdAndTenant(session.currentBillId, dto.tenantId);
    if (!bill || bill.status !== BillStatus.OPEN) {
      throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
    }

    const orderIds = (bill.orderIds ?? []).filter(Boolean);
    const ordersOnBill = await this.orderRepository.findByIdsAndTenant(orderIds, dto.tenantId);
    const byId = new Map(ordersOnBill.map((o) => [o.id, o]));
    for (const oid of orderIds) {
      const o = byId.get(oid);
      if (!o) {
        continue;
      }
      if (o.status === OrderStatus.CANCELED) {
        continue;
      }
      if (o.status !== OrderStatus.SERVED) {
        throw new BusinessException(ErrorCode.BILL_ORDERS_NOT_ALL_SERVED, HttpStatus.CONFLICT);
      }
    }

    const { billEntity, requestEntity } = await this.dataSource.transaction(async (manager) => {
      const lockedBill = await this.billRepository.findByIdAndTenantForUpdate(bill.id, dto.tenantId, manager);
      if (!lockedBill || lockedBill.status !== BillStatus.OPEN) {
        throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
      }

      const now = new Date();
      lockedBill.status = BillStatus.PENDING_PAYMENT;
      lockedBill.closedAt = now;
      await manager.save(Bill, lockedBill);

      const req = manager.create(ServiceRequest, {
        tenantId: dto.tenantId,
        tableId: session.tableId,
        tableName: session.tableName,
        sessionId: dto.sessionId,
        type: ServiceRequestType.REQUEST_BILL,
        status: ServiceRequestStatus.PENDING,
        note: null,
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
      });
      await manager.save(ServiceRequest, req);

      return { billEntity: lockedBill, requestEntity: req };
    });

    const cartUpdated = await this.cartService.lockCart(dto.tenantId, dto.sessionId, cartSnap.cartVersion);

    await this.callCatalogUpdateTableStatus({
      id: session.tableId,
      tenantId: dto.tenantId,
      status: TABLE_STATUS.BILLING,
      sessionId: dto.sessionId,
    });

    const billDto = this.toBillDto(billEntity);
    const requestDto = this.toServiceRequestDto(requestEntity);
    const cartDto = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);

    const billRequested: BillRequestedEvent = {
      tenantId: dto.tenantId,
      billId: billEntity.id,
      sessionId: dto.sessionId,
      tableId: session.tableId,
      tableName: session.tableName,
      status: 'PENDING_PAYMENT',
      total: billEntity.total,
      requestedAt: (billEntity.closedAt ?? new Date()).toISOString(),
    };

    const serviceRequested: ServiceRequestedEvent = {
      tenantId: dto.tenantId,
      requestId: requestEntity.id,
      tableId: session.tableId,
      tableName: session.tableName,
      sessionId: dto.sessionId,
      type: ServiceRequestType.REQUEST_BILL,
      timestamp: requestEntity.createdAt.toISOString(),
    };

    return {
      bill: billDto,
      request: requestDto,
      cart: cartDto,
      events: {
        billRequested,
        serviceRequested,
        cartUpdated,
      },
    };
  }

  async reopenBill(dto: BillSessionTcpRequest): Promise<BillRequestedTcpResponse> {
    await this.sessionService.getActiveSessionOrThrow(dto.tenantId, dto.sessionId);
    const session = await this.sessionRepository.findActiveByIdAndTenant(dto.sessionId, dto.tenantId);
    if (!session?.currentBillId) {
      throw new BusinessException(ErrorCode.BILL_NOT_OPEN, HttpStatus.CONFLICT);
    }

    const bill = await this.billRepository.findByIdAndTenant(session.currentBillId, dto.tenantId);
    if (!bill || bill.status !== BillStatus.PENDING_PAYMENT) {
      throw new BusinessException(ErrorCode.BILL_NOT_PENDING_PAYMENT, HttpStatus.CONFLICT);
    }

    const billEntity = await this.dataSource.transaction(async (manager) => {
      const lockedBill = await this.billRepository.findByIdAndTenantForUpdate(bill.id, dto.tenantId, manager);
      if (!lockedBill || lockedBill.status !== BillStatus.PENDING_PAYMENT) {
        throw new BusinessException(ErrorCode.BILL_NOT_PENDING_PAYMENT, HttpStatus.CONFLICT);
      }
      lockedBill.status = BillStatus.OPEN;
      lockedBill.closedAt = null;
      await manager.save(Bill, lockedBill);
      return lockedBill;
    });

    const cartUpdated = await this.cartService.unlockCartForBillReopen(dto.tenantId, dto.sessionId);

    await this.callCatalogUpdateTableStatus({
      id: session.tableId,
      tenantId: dto.tenantId,
      status: TABLE_STATUS.OCCUPIED,
      sessionId: dto.sessionId,
    });

    const billDto = this.toBillDto(billEntity);
    const cartDto = await this.cartService.getSnapshot(dto.tenantId, dto.sessionId);

    return {
      bill: billDto,
      cart: cartDto,
      events: { cartUpdated },
    };
  }

  private async callCatalogUpdateTableStatus(payload: UpdateTableStatusTcpRequest): Promise<Table> {
    try {
      const response = await firstValueFrom(
        this.catalogClient.send<ResponseType<Table>, UpdateTableStatusTcpRequest>(
          TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS,
          new Request<UpdateTableStatusTcpRequest>({ tenantId: payload.tenantId, data: payload }),
        ),
      );
      if (response.statusCode >= 400) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, response.statusCode as HttpStatus);
      }
      if (!response.data) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
      }
      return response.data as unknown as Table;
    } catch (e) {
      if (e instanceof BusinessException) {
        throw e;
      }
      if (e instanceof RpcException) {
        const err = e.getError() as { code?: number; errorCode?: ErrorCode };
        if (err?.errorCode) {
          throw new BusinessException(err.errorCode, (err.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
        }
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
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

  private toServiceRequestDto(entity: ServiceRequest): ServiceRequestDto {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      tableId: entity.tableId,
      sessionId: entity.sessionId,
      type: entity.type,
      status: entity.status,
      note: entity.note ?? undefined,
      acknowledgedAt: entity.acknowledgedAt?.toISOString(),
      acknowledgedByUserId: entity.acknowledgedByUserId ?? undefined,
      resolvedAt: entity.resolvedAt?.toISOString(),
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
