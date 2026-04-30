import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { DataSource } from 'typeorm';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { OrderRepository } from '../repositories/order.repository';
import { ServiceRequestRepository } from '../repositories/service-request.repository';
import { SessionRepository } from '../repositories/session.repository';
import { SessionService } from '../services/session.service';
import { TransferService } from '../services/transfer.service';

describe('TransferService', () => {
  let service: TransferService;
  let redis: { set: jest.Mock; get: jest.Mock; del: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let sessionRepository: { findActiveByIdAndTenant: jest.Mock; findByIdAndTenant: jest.Mock };
  let orderRepository: { updateTableForSession: jest.Mock };
  let serviceRequestRepository: { updateTableForSession: jest.Mock };
  let sessionService: { patchSessionTableInRedis: jest.Mock };
  let catalogClient: { send: jest.Mock };

  beforeEach(async () => {
    redis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };
    dataSource = { transaction: jest.fn() };
    sessionRepository = {
      findActiveByIdAndTenant: jest.fn(),
      findByIdAndTenant: jest.fn(),
    };
    orderRepository = { updateTableForSession: jest.fn() };
    serviceRequestRepository = { updateTableForSession: jest.fn() };
    sessionService = { patchSessionTableInRedis: jest.fn() };
    catalogClient = { send: jest.fn().mockReturnValue(of({ statusCode: 200, data: {} })) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        { provide: RedisClientService, useValue: { getClient: () => redis } },
        { provide: DataSource, useValue: dataSource },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: OrderRepository, useValue: orderRepository },
        { provide: ServiceRequestRepository, useValue: serviceRequestRepository },
        { provide: SessionService, useValue: sessionService },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
      ],
    }).compile();

    service = module.get(TransferService);
  });

  it('uses transfer locks before changing session table metadata', async () => {
    redis.set.mockResolvedValue('OK');
    redis.get.mockResolvedValue('transfer-1');
    sessionRepository.findActiveByIdAndTenant.mockResolvedValue({
      id: 'sess-1',
      tenantId: 'tenant-1',
      tableId: 'table-old',
      tableName: 'Old',
      status: 'ACTIVE',
    });
    sessionRepository.findByIdAndTenant.mockResolvedValue({
      id: 'sess-1',
      tenantId: 'tenant-1',
      tableId: 'table-new',
      tableName: 'New',
      status: 'ACTIVE',
      startedAt: new Date(),
      lastActivity: new Date(),
      orderCount: 0,
      closedAt: null,
      version: 1,
      currentBillId: null,
    });

    catalogClient.send.mockImplementation((msg: string) => {
      if (msg === TCP_REQUEST_MESSAGE.TABLE.GET_BY_ID) {
        return of({
          statusCode: 200,
          data: {
            id: 'table-new',
            tenantId: 'tenant-1',
            name: 'New',
            status: 'available',
            areaId: 'a',
            capacity: 4,
            qrToken: 'x',
            sessionId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      return of({ statusCode: 200, data: {} });
    });

    dataSource.transaction.mockImplementationOnce(async (cb) => {
      const manager = {
        getRepository: jest.fn(() => ({
          update: jest.fn().mockResolvedValue(undefined),
        })),
      };
      await cb(manager);
    });

    await service.transferTable({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      fromTableId: 'table-old',
      toTableId: 'table-new',
      userId: 'waiter-1',
      requestId: 'transfer-1',
    });

    expect(redis.set).toHaveBeenNthCalledWith(
      1,
      'transfer:tenant-1:sess-1',
      'transfer-1',
      'PX',
      expect.any(Number),
      'NX',
    );
    expect(orderRepository.updateTableForSession).toHaveBeenCalledWith(
      'sess-1',
      'tenant-1',
      'table-new',
      'New',
      expect.anything(),
    );
  });
});
