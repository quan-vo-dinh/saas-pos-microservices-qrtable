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
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { DashboardPaymentSettingsController } from './dashboard-payment-settings.controller';

describe('DashboardPaymentSettingsController', () => {
  let controller: DashboardPaymentSettingsController;
  let paymentClient: { send: jest.Mock };

  const req = {
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
    [MetadataKey.TENANT_ID]: 'tenant-a',
    [MetadataKey.USER_DATA]: { metadata: { userId: 'owner-1' } },
  } as unknown as Request;

  beforeEach(async () => {
    paymentClient = { send: jest.fn().mockReturnValue(of(Response.success({ ok: true }))) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardPaymentSettingsController],
      providers: [
        { provide: TCP_SERVICES.PAYMENT_SERVICE, useValue: paymentClient },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'BFF_PAYMENT_CONFIG.PUBLIC_API_BASE_URL' ? 'https://api.qrtable.local' : undefined,
            ),
          },
        },
      ],
    }).compile();
    controller = module.get(DashboardPaymentSettingsController);
  });

  it('uses Payment TCP client for settings routes', async () => {
    await firstValueFrom(controller.getSettings('pid-1', req));

    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GET,
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-a' }) }),
    );
  });

  it('OAuth callback route forwards code/state without tenant payload', async () => {
    await firstValueFrom(controller.handleSepayCallback('code-1', 'state-1', 'pid-1', req));

    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.HANDLE_OAUTH_CALLBACK,
      expect.objectContaining({
        data: {
          code: 'code-1',
          state: 'state-1',
          requestIp: '127.0.0.1',
          userAgent: 'jest',
        },
      }),
    );
  });

  it('callback route has no permission metadata', () => {
    const reflector = new Reflector();

    expect(
      reflector.get(Permissions, DashboardPaymentSettingsController.prototype.handleSepayCallback),
    ).toBeUndefined();
    expect(reflector.get(Permissions, DashboardPaymentSettingsController.prototype.getSettings)).toEqual([
      PERMISSION.PAYMENT_SETTINGS_READ_OWN,
    ]);
  });
});
