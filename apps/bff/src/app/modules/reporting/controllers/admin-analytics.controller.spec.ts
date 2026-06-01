jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { AdminAnalyticsController } from './admin-analytics.controller';

describe('AdminAnalyticsController', () => {
  let controller: AdminAnalyticsController;
  let saasClient: { send: jest.Mock };
  let paymentClient: { send: jest.Mock };

  const req = {} as Request;

  beforeEach(async () => {
    saasClient = { send: jest.fn().mockReturnValue(of(Response.success({ platform: true }))) };
    paymentClient = { send: jest.fn().mockReturnValue(of(Response.success({ revenue: true }))) };
    const orderClient = { send: jest.fn().mockReturnValue(of(Response.success({}))) };
    const catalogClient = { send: jest.fn().mockReturnValue(of(Response.success({}))) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminAnalyticsController],
      providers: [
        { provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient },
        { provide: TCP_SERVICES.PAYMENT_SERVICE, useValue: paymentClient },
        { provide: TCP_SERVICES.ORDER_SERVICE, useValue: orderClient },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: catalogClient },
      ],
    }).compile();

    controller = module.get(AdminAnalyticsController);
  });

  it('forwards platform analytics to SaaS subscription report', async () => {
    await firstValueFrom(controller.getPlatform({ grain: 'month' }, 'pid-1', req));

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SUBSCRIPTION.REPORT_PLATFORM,
      expect.objectContaining({
        data: expect.objectContaining({ grain: 'month' }),
      }),
    );
  });

  it('forwards explicit tenant id for revenue drilldown', async () => {
    await firstValueFrom(controller.getTenantRevenue('tenant-drill', { grain: 'day' }, 'pid-2', req));

    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT.REPORT_REVENUE,
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-drill' }),
      }),
    );
  });
});
