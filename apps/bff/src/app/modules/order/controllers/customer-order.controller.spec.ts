jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { of } from 'rxjs';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { CustomerOrderController } from './customer-order.controller';

describe('CustomerOrderController', () => {
  let controller: CustomerOrderController;
  let orderClient: { send: jest.Mock };

  beforeEach(async () => {
    orderClient = {
      send: jest.fn().mockReturnValue(of(Response.success([]))),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerOrderController],
      providers: [
        { provide: TCP_SERVICES.ORDER_SERVICE, useValue: orderClient },
        {
          provide: RealtimeEventsService,
          useValue: {
            emitCartUpdated: jest.fn(),
            emitOrderCreated: jest.fn(),
            emitOrderStatusChanged: jest.fn(),
            emitServiceRequested: jest.fn(),
            emitBillRequested: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(CustomerOrderController);
  });

  it('listOrders sends tenant and session scoped payload to Order TCP', async () => {
    const req = {
      [MetadataKey.TENANT_ID]: 'tenant-1',
      [MetadataKey.SESSION_ID]: 'session-1',
    } as unknown as Request;

    await controller.listOrders('pid-1', req);

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.GET_SESSION_LIST,
      expect.objectContaining({
        processId: 'pid-1',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        data: {
          tenantId: 'tenant-1',
          sessionId: 'session-1',
        },
      }),
    );
  });
});
