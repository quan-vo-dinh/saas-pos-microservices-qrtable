jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { DashboardReportController } from './dashboard-report.controller';

describe('DashboardReportController', () => {
  let controller: DashboardReportController;
  let paymentClient: { send: jest.Mock };
  let orderClient: { send: jest.Mock };
  let catalogClient: { send: jest.Mock };

  const req = {
    [MetadataKey.TENANT_ID]: 'tenant-from-request',
    [MetadataKey.USER_DATA]: { metadata: { userId: 'owner-1', permissions: [PERMISSION.REPORT_READ_OWN] } },
  } as unknown as Request;

  beforeEach(async () => {
    paymentClient = { send: jest.fn().mockReturnValue(of(Response.success({ ok: true }))) };
    orderClient = { send: jest.fn().mockReturnValue(of(Response.success({ ok: true }))) };
    catalogClient = { send: jest.fn().mockReturnValue(of(Response.success({ ok: true }))) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardReportController],
      providers: [
        { provide: TCP_SERVICES.PAYMENT_SERVICE, useValue: paymentClient },
        { provide: TCP_SERVICES.ORDER_SERVICE, useValue: orderClient },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
        Reflector,
      ],
    }).compile();

    controller = module.get(DashboardReportController);
  });

  it('forwards revenue report with tenant id from request context', async () => {
    await firstValueFrom(controller.getRevenue({ grain: 'day' }, 'pid-1', req));

    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT.REPORT_REVENUE,
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-from-request',
          grain: 'day',
        }),
      }),
    );
  });

  it('forwards order report to order service', async () => {
    await firstValueFrom(controller.getOrders({}, 'pid-2', req));

    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.REPORT_ORDERS,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-from-request' }),
      }),
    );
  });

  it('forwards table report to catalog service', async () => {
    await firstValueFrom(controller.getTables('pid-3', req));

    expect(catalogClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.CATALOG.REPORT_TABLES,
      expect.objectContaining({
        data: { tenantId: 'tenant-from-request' },
      }),
    );
  });
});
