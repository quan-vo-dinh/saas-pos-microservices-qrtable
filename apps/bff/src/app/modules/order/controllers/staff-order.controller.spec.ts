jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Permissions } from '@common/decorators/permission.decorator';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Reflector } from '@nestjs/core';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus } from '@einvoice/types';
import { Request } from 'express';
import { of } from 'rxjs';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { StaffOrderController } from './staff-order.controller';

describe('StaffOrderController', () => {
  let controller: StaffOrderController;
  let orderClient: { send: jest.Mock };
  let paymentClient: { send: jest.Mock };
  let realtimeEvents: { emitOrderStatusChanged: jest.Mock };

  const staffReq = () =>
    ({
      [MetadataKey.TENANT_ID]: 'tenant-1',
      [MetadataKey.USER_DATA]: { metadata: { userId: 'staff-1' } },
    }) as unknown as Request;

  const minimalPayment = (status: string) => ({
    id: 'pay-1',
    tenantId: 'tenant-1',
    billId: 'bill-1',
    billReference: 'BR-1',
    method: null,
    status,
    rawTotal: 100,
    roundedTotal: 100,
    roundingDelta: 0,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
  });

  beforeEach(async () => {
    orderClient = {
      send: jest.fn().mockReturnValue(of(Response.success([]))),
    };
    paymentClient = {
      send: jest.fn().mockReturnValue(of(Response.success([]))),
    };
    realtimeEvents = {
      emitOrderStatusChanged: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StaffOrderController],
      providers: [
        { provide: TCP_SERVICES.ORDER_SERVICE, useValue: orderClient },
        { provide: TCP_SERVICES.PAYMENT_SERVICE, useValue: paymentClient },
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

  it('listBills sends BILL_GET_LIST with tenant-scoped payload', async () => {
    const req = { [MetadataKey.TENANT_ID]: 'tenant-1' } as unknown as Request;
    await controller.listBills('pid-1', req, 'PENDING_PAYMENT', '25', '10');

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.BILL_GET_LIST,
      expect.objectContaining({
        processId: 'pid-1',
        data: {
          tenantId: 'tenant-1',
          status: 'PENDING_PAYMENT',
          limit: 25,
          offset: 10,
        },
      }),
    );
  });

  it('listBills requires PAYMENT_GET_HISTORY permission for POS settlement', () => {
    const reflector = new Reflector();
    const required = reflector.get(Permissions, StaffOrderController.prototype.listBills);
    expect(required).toEqual([PERMISSION.PAYMENT_GET_HISTORY]);
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

  it('reopenBill rejects when payment history has PENDING', async () => {
    orderClient.send.mockReturnValueOnce(
      of(Response.success({ bill: { id: 'bill-1' }, cart: {} })),
    );
    paymentClient.send.mockReturnValueOnce(of(Response.success([minimalPayment(PaymentStatus.PENDING)])));

    await expect(controller.reopenBill('session-1', 'pid-1', staffReq())).rejects.toMatchObject({
      errorCode: ErrorCode.BILL_REOPEN_BLOCKED_BY_PAYMENT,
    });

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT,
      expect.any(Object),
    );
    expect(orderClient.send).toHaveBeenCalledTimes(1);
    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT.GET_HISTORY,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-1', billId: 'bill-1' }),
      }),
    );
  });

  it('reopenBill rejects when payment history has REFUND_PENDING', async () => {
    orderClient.send.mockReturnValueOnce(
      of(Response.success({ bill: { id: 'bill-1' }, cart: {} })),
    );
    paymentClient.send.mockReturnValueOnce(of(Response.success([minimalPayment(PaymentStatus.REFUND_PENDING)])));

    await expect(controller.reopenBill('session-1', 'pid-1', staffReq())).rejects.toMatchObject({
      errorCode: ErrorCode.BILL_REOPEN_BLOCKED_BY_PAYMENT,
    });
  });

  it('reopenBill calls BILL_REOPEN when history has only FAILED', async () => {
    const reopenPayload = {
      bill: { id: 'bill-1' },
      cart: {},
      events: { cartUpdated: { tenantId: 'tenant-1', sessionId: 'session-1' } },
    };
    orderClient.send
      .mockReturnValueOnce(of(Response.success({ bill: { id: 'bill-1' }, cart: {} })))
      .mockReturnValueOnce(of(Response.success(reopenPayload)));
    paymentClient.send.mockReturnValueOnce(of(Response.success([minimalPayment(PaymentStatus.FAILED)])));

    await controller.reopenBill('session-1', 'pid-1', staffReq());

    expect(orderClient.send).toHaveBeenNthCalledWith(
      2,
      TCP_REQUEST_MESSAGE.ORDER.BILL_REOPEN,
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          sessionId: 'session-1',
          userId: 'staff-1',
        }),
      }),
    );
  });

  it('reopenBill skips payment check when current bill is null', async () => {
    const reopenPayload = {
      bill: { id: 'bill-1' },
      cart: {},
      events: { cartUpdated: { tenantId: 'tenant-1', sessionId: 'session-1' } },
    };
    orderClient.send
      .mockReturnValueOnce(of(Response.success({ bill: null, cart: {} })))
      .mockReturnValueOnce(of(Response.success(reopenPayload)));

    await controller.reopenBill('session-1', 'pid-1', staffReq());

    expect(paymentClient.send).not.toHaveBeenCalled();
    expect(orderClient.send).toHaveBeenNthCalledWith(1, TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT, expect.any(Object));
    expect(orderClient.send).toHaveBeenNthCalledWith(2, TCP_REQUEST_MESSAGE.ORDER.BILL_REOPEN, expect.any(Object));
  });

  it('reopenBill throws COMMON_INTERNAL_ERROR when payment history TCP fails', async () => {
    orderClient.send.mockReturnValueOnce(
      of(Response.success({ bill: { id: 'bill-1' }, cart: {} })),
    );
    paymentClient.send.mockReturnValueOnce(
      of(new Response({ statusCode: HttpStatus.BAD_GATEWAY, code: 'FAILED' as never, data: undefined })),
    );

    await expect(controller.reopenBill('session-1', 'pid-1', staffReq())).rejects.toMatchObject({
      errorCode: ErrorCode.COMMON_INTERNAL_ERROR,
    });
    expect(orderClient.send).toHaveBeenCalledTimes(1);
  });
});
