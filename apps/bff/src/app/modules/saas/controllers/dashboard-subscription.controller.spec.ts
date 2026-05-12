jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { DashboardSubscriptionController } from './dashboard-subscription.controller';

describe('DashboardSubscriptionController', () => {
  let controller: DashboardSubscriptionController;
  let saasClient: { send: jest.Mock };

  const req = {
    [MetadataKey.TENANT_ID]: 'tenant-from-request',
    [MetadataKey.USER_DATA]: { metadata: { userId: 'owner-1' } },
  } as unknown as Request;

  beforeEach(async () => {
    saasClient = { send: jest.fn().mockReturnValue(of(Response.success({ ok: true }))) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardSubscriptionController],
      providers: [{ provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient }],
    }).compile();
    controller = module.get(DashboardSubscriptionController);
  });

  it('checkout forwards tenantId from request, never from body', async () => {
    await firstValueFrom(
      controller.checkout(
        { planCode: 'BASIC', billingPeriod: 'MONTHLY', tenantId: 'body-tenant' } as {
          planCode: 'BASIC';
          billingPeriod: 'MONTHLY';
          tenantId: string;
        },
        'pid-1',
        req,
      ),
    );

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE,
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-from-request',
          requestedByUserId: 'owner-1',
          planCode: 'BASIC',
        }),
      }),
    );
    expect(saasClient.send.mock.calls[0][1].data.tenantId).not.toBe('body-tenant');
  });
});
