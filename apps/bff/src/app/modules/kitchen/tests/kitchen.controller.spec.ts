jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { Permissions } from '@common/decorators/permission.decorator';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Reflector } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { of } from 'rxjs';
import { PreparationStation } from '@einvoice/types';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { KitchenController } from '../controllers/kitchen.controller';
import { KdsStationAccessService } from '../services/kds-station-access.service';

describe('KitchenController', () => {
  let controller: KitchenController;
  let kitchenClient: { send: jest.Mock };
  let orderClient: { send: jest.Mock };
  let realtime: { emitKitchenItemReady: jest.Mock; emitOrderStatusChanged: jest.Mock };
  let stationAccess: { assertCanAccessStation: jest.Mock };

  const tenantId = 't1';
  const processId = 'pid-1';

  beforeEach(async () => {
    kitchenClient = { send: jest.fn() };
    orderClient = { send: jest.fn() };
    realtime = {
      emitKitchenItemReady: jest.fn(),
      emitOrderStatusChanged: jest.fn(),
    };
    stationAccess = { assertCanAccessStation: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KitchenController],
      providers: [
        { provide: TCP_SERVICES.KITCHEN_SERVICE, useValue: kitchenClient },
        { provide: TCP_SERVICES.ORDER_SERVICE, useValue: orderClient },
        { provide: RealtimeEventsService, useValue: realtime },
        { provide: KdsStationAccessService, useValue: stationAccess },
      ],
    }).compile();

    controller = module.get(KitchenController);
  });

  function staffReq(roles: string[]): Request {
    return {
      [MetadataKey.TENANT_ID]: tenantId,
      [MetadataKey.USER_DATA]: {
        valid: true,
        metadata: {
          userId: 'u1',
          jwt: { realm_access: { roles } },
        },
      },
    } as unknown as Request;
  }

  it('getQueue requires KITCHEN_GET_QUEUE', () => {
    const reflector = new Reflector();
    const p = reflector.get(Permissions, KitchenController.prototype.getQueue);
    expect(p).toEqual([PERMISSION.KITCHEN_GET_QUEUE]);
  });

  it('CHEF can query KITCHEN queue; station access is enforced', async () => {
    kitchenClient.send.mockReturnValue(
      of(Response.success({ tenantId, station: 'KITCHEN', revision: 1, serverTime: '', tickets: [] })),
    );

    await controller.getQueue({ station: PreparationStation.KITCHEN }, processId, staffReq(['CHEF']));

    expect(stationAccess.assertCanAccessStation).toHaveBeenCalledWith(expect.anything(), PreparationStation.KITCHEN);
    expect(kitchenClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KITCHEN.GET_QUEUE,
      expect.objectContaining({
        data: { tenantId, station: PreparationStation.KITCHEN },
      }),
    );
  });

  it('done calls MARK_READY then MARK_ITEMS_READY and emits when Order succeeds', async () => {
    const ticket = {
      ticketId: 'ord:kitchen',
      orderId: 'ord',
      sessionId: 'sid',
      tenantId,
      station: PreparationStation.KITCHEN,
      items: [{ orderItemId: 'oi1' }],
    };

    kitchenClient.send.mockReturnValue(of(Response.success({ ticket, revision: 2 })));
    orderClient.send.mockReturnValue(
      of(
        Response.success({
          kitchenItemReady: { eventType: 'kitchen.item_ready', tenantId, sessionId: 'sid' } as never,
        }),
      ),
    );

    await controller.markDone(
      'ord:kitchen',
      PreparationStation.KITCHEN,
      { requestId: 'r1' },
      processId,
      staffReq(['CHEF']),
    );

    expect(kitchenClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.KITCHEN.MARK_READY,
      expect.objectContaining({
        data: expect.objectContaining({ ticketId: 'ord:kitchen', station: PreparationStation.KITCHEN }),
      }),
    );
    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.MARK_ITEMS_READY,
      expect.objectContaining({
        data: expect.objectContaining({ orderId: 'ord', orderItemIds: ['oi1'] }),
      }),
    );
    expect(realtime.emitKitchenItemReady).toHaveBeenCalled();
  });

  it('done compensates with RECALL_TICKET when Order fails', async () => {
    const ticket = {
      ticketId: 'ord:kitchen',
      orderId: 'ord',
      sessionId: 'sid',
      tenantId,
      station: PreparationStation.KITCHEN,
      items: [{ orderItemId: 'oi1' }],
    };

    kitchenClient.send
      .mockReturnValueOnce(of(Response.success({ ticket, revision: 2 })))
      .mockReturnValueOnce(of(Response.success({ ticket, revision: 3 })));

    orderClient.send.mockReturnValue(of(new Response({ statusCode: HttpStatus.BAD_GATEWAY, code: 'ERR' as never })));

    await expect(
      controller.markDone(
        'ord:kitchen',
        PreparationStation.KITCHEN,
        { requestId: 'r1' },
        processId,
        staffReq(['CHEF']),
      ),
    ).rejects.toBeInstanceOf(BusinessException);

    expect(kitchenClient.send).toHaveBeenCalledTimes(2);
    expect(kitchenClient.send.mock.calls[1][0]).toBe(TCP_REQUEST_MESSAGE.KITCHEN.RECALL_TICKET);
    expect(realtime.emitKitchenItemReady).not.toHaveBeenCalled();
  });

  it('start requires KITCHEN_UPDATE_TICKET', () => {
    const reflector = new Reflector();
    expect(reflector.get(Permissions, KitchenController.prototype.startTicket)).toEqual([
      PERMISSION.KITCHEN_UPDATE_TICKET,
    ]);
  });

  it('recall requires KITCHEN_RECALL', () => {
    const reflector = new Reflector();
    expect(reflector.get(Permissions, KitchenController.prototype.recallTicket)).toEqual([PERMISSION.KITCHEN_RECALL]);
  });

  it('priority requires KITCHEN_SET_PRIORITY', () => {
    const reflector = new Reflector();
    expect(reflector.get(Permissions, KitchenController.prototype.setPriority)).toEqual([
      PERMISSION.KITCHEN_SET_PRIORITY,
    ]);
  });
});
