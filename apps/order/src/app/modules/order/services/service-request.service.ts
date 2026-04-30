import { ServiceRequest } from '@common/entities/service-request.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type {
  CreateServiceRequestTcpRequest,
  ListServiceRequestsTcpRequest,
  ServiceRequestActionTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type { ServiceRequestCreatedTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import type { ServiceRequest as ServiceRequestDto } from '@einvoice/types';
import { ServiceRequestedEvent, ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';
import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { SessionRepository } from '../repositories/session.repository';
import { BillService } from './bill.service';

@Injectable()
export class ServiceRequestService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly serviceRequestRepository: ServiceRequestRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly billService: BillService,
  ) {}

  async list(dto: ListServiceRequestsTcpRequest): Promise<ServiceRequestDto[]> {
    const limit = Math.min(Math.max(dto.limit ?? 50, 1), 200);
    const offset = Math.max(dto.offset ?? 0, 0);
    const rows = await this.serviceRequestRepository.findStaffList(dto.tenantId, {
      status: dto.status,
      limit,
      offset,
    });
    return rows.map((r) => this.toDto(r));
  }

  async create(dto: CreateServiceRequestTcpRequest): Promise<ServiceRequestCreatedTcpResponse> {
    if (dto.type === ServiceRequestType.REQUEST_BILL) {
      const billRes = await this.billService.requestBill({
        tenantId: dto.tenantId,
        sessionId: dto.sessionId,
        userId: undefined,
      });
      if (!billRes.request || !billRes.events.serviceRequested) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return {
        request: billRes.request,
        events: { serviceRequested: billRes.events.serviceRequested },
      };
    }

    const session = await this.sessionRepository.findActiveByIdAndTenant(dto.sessionId, dto.tenantId);
    if (!session) {
      throw new BusinessException(ErrorCode.SESSION_CLOSED, HttpStatus.GONE);
    }

    const row = await this.dataSource.transaction(async (manager) => {
      const entity = manager.create(ServiceRequest, {
        tenantId: dto.tenantId,
        tableId: session.tableId,
        tableName: session.tableName,
        sessionId: dto.sessionId,
        type: dto.type,
        status: ServiceRequestStatus.PENDING,
        note: dto.note?.trim() ? dto.note.trim().slice(0, 500) : null,
        acknowledgedAt: null,
        acknowledgedByUserId: null,
        resolvedAt: null,
      });
      return manager.save(ServiceRequest, entity);
    });

    const requestDto = this.toDto(row);
    const serviceRequested: ServiceRequestedEvent = {
      tenantId: dto.tenantId,
      requestId: row.id,
      tableId: session.tableId,
      tableName: session.tableName,
      sessionId: dto.sessionId,
      type: dto.type,
      note: requestDto.note,
      timestamp: row.createdAt.toISOString(),
    };

    return { request: requestDto, events: { serviceRequested } };
  }

  async acknowledge(dto: ServiceRequestActionTcpRequest): Promise<ServiceRequestCreatedTcpResponse> {
    const row = await this.dataSource.transaction(async (manager) => {
      const req = await this.serviceRequestRepository.findByIdAndTenantForUpdate(dto.requestId, dto.tenantId, manager);
      if (!req) {
        throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.NOT_FOUND);
      }
      if (req.status !== ServiceRequestStatus.PENDING) {
        throw new BusinessException(ErrorCode.SERVICE_REQUEST_INVALID_STATE, HttpStatus.CONFLICT);
      }
      req.status = ServiceRequestStatus.ACKNOWLEDGED;
      req.acknowledgedAt = new Date();
      req.acknowledgedByUserId = dto.userId;
      await manager.save(ServiceRequest, req);
      return req;
    });

    const serviceRequested: ServiceRequestedEvent = {
      tenantId: dto.tenantId,
      requestId: row.id,
      tableId: row.tableId,
      tableName: row.tableName,
      sessionId: row.sessionId,
      type: row.type,
      note: row.note ?? undefined,
      timestamp: row.acknowledgedAt?.toISOString() ?? new Date().toISOString(),
    };

    return { request: this.toDto(row), events: { serviceRequested } };
  }

  async resolve(dto: ServiceRequestActionTcpRequest): Promise<ServiceRequestCreatedTcpResponse> {
    const row = await this.dataSource.transaction(async (manager) => {
      const req = await this.serviceRequestRepository.findByIdAndTenantForUpdate(dto.requestId, dto.tenantId, manager);
      if (!req) {
        throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.NOT_FOUND);
      }
      if (req.status !== ServiceRequestStatus.ACKNOWLEDGED) {
        throw new BusinessException(ErrorCode.SERVICE_REQUEST_INVALID_STATE, HttpStatus.CONFLICT);
      }
      req.status = ServiceRequestStatus.RESOLVED;
      req.resolvedAt = new Date();
      await manager.save(ServiceRequest, req);
      return req;
    });

    const serviceRequested: ServiceRequestedEvent = {
      tenantId: dto.tenantId,
      requestId: row.id,
      tableId: row.tableId,
      tableName: row.tableName,
      sessionId: row.sessionId,
      type: row.type,
      note: row.note ?? undefined,
      timestamp: row.resolvedAt?.toISOString() ?? new Date().toISOString(),
    };

    return { request: this.toDto(row), events: { serviceRequested } };
  }

  private toDto(entity: ServiceRequest): ServiceRequestDto {
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
