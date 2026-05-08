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
  let realtimeEvents: { emitOrderStatusChanged: jest.Mock };

  beforeEach(async () => {
    orderClient = {
      send: jest.fn().mockReturnValue(of(Response.success([]))),
    };
    realtimeEvents = {
      emitOrderStatusChanged: jest.fn(),
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
            emitOrderStatusChanged: realtimeEvents.emitOrderStatusChanged,
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

  it('serve sends MARK_SERVED and emits orderStatusChanged realtime event', async () => {
    const orderStatusChanged = {
      tenantId: 'tenant-1',
      orderId: 'order-1',
      fromStatus: 'READY',
      toStatus: 'SERVED',
      changedByUserId: 'staff-1',
      timestamp: '2026-05-07T12:00:00.000Z',
    };
    orderClient.send.mockReturnValueOnce(
      of(
        Response.success({
          order: { id: 'order-1', sessionId: 'session-1' },
          events: { orderStatusChanged },
        }),
      ),
    );

    const req = {
      [MetadataKey.TENANT_ID]: 'tenant-1',
      [MetadataKey.USER_DATA]: { metadata: { userId: 'staff-1' } },
    } as unknown as Request;

    await controller.serve('order-1', 'pid-1', req);

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.MARK_SERVED,
      expect.objectContaining({
        processId: 'pid-1',
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          orderId: 'order-1',
          userId: 'staff-1',
          processId: 'pid-1',
        }),
      }),
    );
    expect(realtimeEvents.emitOrderStatusChanged).toHaveBeenCalledWith(orderStatusChanged, 'session-1');
  });

  it('serve requires ORDER_CONFIRM permission for waiter progression', () => {
    const reflector = new Reflector();
    const required = reflector.get(Permissions, StaffOrderController.prototype.serve);
    expect(required).toEqual([PERMISSION.ORDER_CONFIRM]);
  });
});
