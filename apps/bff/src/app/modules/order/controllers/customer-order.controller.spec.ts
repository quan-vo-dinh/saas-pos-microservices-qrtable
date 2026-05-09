jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { BillStatus } from '@einvoice/types';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { of } from 'rxjs';
import { RealtimeEventsService } from '../../realtime/services/realtime-events.service';
import { CustomerOrderController } from './customer-order.controller';

describe('CustomerOrderController', () => {
  let controller: CustomerOrderController;
  let orderClient: { send: jest.Mock };
  let paymentClient: { send: jest.Mock };

  const req = {
    [MetadataKey.TENANT_ID]: 't1',
    [MetadataKey.SESSION_ID]: 'sess-1',
  } as unknown as Request;

  beforeEach(async () => {
    orderClient = {
      send: jest.fn().mockReturnValue(of(Response.success([]))),
    };
    paymentClient = {
      send: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerOrderController],
      providers: [
        { provide: TCP_SERVICES.ORDER_SERVICE, useValue: orderClient },
        { provide: TCP_SERVICES.PAYMENT_SERVICE, useValue: paymentClient },
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
    const listReq = {
      [MetadataKey.TENANT_ID]: 'tenant-1',
      [MetadataKey.SESSION_ID]: 'session-1',
    } as unknown as Request;

    await controller.listOrders('pid-1', listReq);

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

  it('creates VietQR only for current session pending bill', async () => {
    orderClient.send.mockImplementation((pattern: string) => {
      if (pattern === TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT) {
        return of({
          statusCode: 200,
          data: {
            bill: {
              id: 'bill-1',
              tenantId: 't1',
              sessionId: 'sess-1',
              status: BillStatus.PENDING_PAYMENT,
            },
            cart: {
              tenantId: 't1',
              sessionId: 'sess-1',
              status: 'LOCKED',
              cartVersion: 1,
              items: [],
              updatedAt: '2026-05-08T12:00:00.000Z',
            },
          },
        });
      }
      return of({ statusCode: 200, data: {} });
    });
    paymentClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: {
          billId: 'bill-1',
          qrUrl: 'https://qr.sepay.vn/img?...',
          billReference: 'QRTBL11111111',
          roundedTotal: 128_000,
          bankAccount: '001',
          bankName: 'Vietcombank',
        },
      }),
    );

    const result = await controller.createCustomerVietQr('proc-1', req);

    expect(result.data?.qrUrl).toContain('qr.sepay.vn');
    expect(result.data?.bankAccount).toBe('001');
    expect(result.data?.bankName).toBe('Vietcombank');
    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT.CREATE_VIETQR,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 't1', billId: 'bill-1', userId: 'customer-session:sess-1' }),
      }),
    );
  });

  it('rejects customer VietQR when current bill is not pending payment', async () => {
    orderClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: { bill: { id: 'bill-1', status: BillStatus.OPEN, sessionId: 'sess-1' }, cart: null },
      }),
    );
    await expect(controller.createCustomerVietQr('proc-1', req)).rejects.toBeInstanceOf(ConflictException);
    expect(paymentClient.send).not.toHaveBeenCalled();
  });

  it('rejects customer VietQR when bill session does not match request session', async () => {
    orderClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: {
          bill: { id: 'bill-1', tenantId: 't1', sessionId: 'other-sess', status: BillStatus.PENDING_PAYMENT },
          cart: null,
        },
      }),
    );
    await expect(controller.createCustomerVietQr('proc-1', req)).rejects.toBeInstanceOf(ConflictException);
    expect(paymentClient.send).not.toHaveBeenCalled();
  });
});
