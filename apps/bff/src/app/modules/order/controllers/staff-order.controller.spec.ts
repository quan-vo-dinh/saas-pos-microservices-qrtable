jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Permissions } from '@common/decorators/permission.decorator';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { of } from 'rxjs';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { StaffOrderController } from './staff-order.controller';

describe('StaffOrderController', () => {
  let controller: StaffOrderController;
  let orderClient: { send: jest.Mock };

  beforeEach(async () => {
    orderClient = {
      send: jest.fn().mockReturnValue(of(Response.success([]))),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffOrderController],
      providers: [
        { provide: TCP_SERVICES.ORDER_SERVICE, useValue: orderClient },
        {
          provide: TCP_SERVICES.KITCHEN_SERVICE,
          useValue: { send: jest.fn().mockReturnValue(of(Response.success(true))) },
        },
        {
          provide: RealtimeEventsService,
          useValue: {
            emitOrderStatusChanged: jest.fn(),
            emitServiceRequested: jest.fn(),
            emitCartUpdated: jest.fn(),
            emitTableTransferred: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(StaffOrderController);
  });

  it('listServiceRequests sends SERVICE_REQUEST_GET_LIST with tenant-scoped payload', async () => {
    const req = { [MetadataKey.TENANT_ID]: 'tenant-1' } as unknown as Request;
    await controller.listServiceRequests('pid-1', req, 'ACKNOWLEDGED', '25', '10');

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.SERVICE_REQUEST_GET_LIST,
      expect.objectContaining({
        processId: 'pid-1',
        data: {
          tenantId: 'tenant-1',
          status: 'ACKNOWLEDGED',
          limit: 25,
          offset: 10,
        },
      }),
    );
  });

  it('listServiceRequests requires SERVICE_REQUEST_ACKNOWLEDGE', () => {
    const reflector = new Reflector();
    const required = reflector.get(Permissions, StaffOrderController.prototype.listServiceRequests);
    expect(required).toEqual([PERMISSION.SERVICE_REQUEST_ACKNOWLEDGE]);
  });
});
