import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';
import { DataSource } from 'typeorm';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { SessionRepository } from '../repositories/session.repository';
import { BillService } from '../services/bill.service';
import { ServiceRequestService } from '../services/service-request.service';

describe('ServiceRequestService', () => {
  let service: ServiceRequestService;
  let billService: { requestBill: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let sessionRepository: { findActiveByIdAndTenant: jest.Mock };
  let srRepo: { findByIdAndTenantForUpdate: jest.Mock };

  beforeEach(async () => {
    billService = { requestBill: jest.fn() };
    dataSource = { transaction: jest.fn() };
    sessionRepository = { findActiveByIdAndTenant: jest.fn() };
    srRepo = { findByIdAndTenantForUpdate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceRequestService,
        { provide: DataSource, useValue: dataSource },
        { provide: ServiceRequestRepository, useValue: srRepo },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: BillService, useValue: billService },
      ],
    }).compile();

    service = module.get(ServiceRequestService);
  });

  it('routes REQUEST_BILL to BillService.requestBill', async () => {
    billService.requestBill.mockResolvedValue({
      request: {
        id: 'r1',
        tenantId: 't1',
        tableId: 'tb',
        sessionId: 's1',
        type: ServiceRequestType.REQUEST_BILL,
        status: ServiceRequestStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      events: {
        serviceRequested: {
          tenantId: 't1',
          requestId: 'r1',
          tableId: 'tb',
          tableName: 'T',
          sessionId: 's1',
          type: ServiceRequestType.REQUEST_BILL,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const out = await service.create({
      tenantId: 't1',
      sessionId: 's1',
      type: ServiceRequestType.REQUEST_BILL,
    });

    expect(billService.requestBill).toHaveBeenCalledWith({ tenantId: 't1', sessionId: 's1', userId: undefined });
    expect(out.request.id).toBe('r1');
  });

  it('resolve rejects when not ACKNOWLEDGED', async () => {
    srRepo.findByIdAndTenantForUpdate.mockResolvedValue({
      id: 'r1',
      tenantId: 't1',
      tableId: 'tb',
      tableName: 'T',
      sessionId: 's1',
      type: ServiceRequestType.CALL_STAFF,
      status: ServiceRequestStatus.PENDING,
      note: null,
      acknowledgedAt: null,
      acknowledgedByUserId: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    dataSource.transaction.mockImplementation(async (cb) => {
      const manager = { save: jest.fn() };
      return cb(manager);
    });

    await expect(service.resolve({ tenantId: 't1', requestId: 'r1', userId: 'u1' })).rejects.toMatchObject({
      errorCode: ErrorCode.SERVICE_REQUEST_INVALID_STATE,
    });
  });
});
