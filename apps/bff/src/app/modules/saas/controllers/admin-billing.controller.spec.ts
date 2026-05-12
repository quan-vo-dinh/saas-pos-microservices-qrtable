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
import { AdminBillingController } from './admin-billing.controller';

describe('AdminBillingController', () => {
  let controller: AdminBillingController;
  let saasClient: { send: jest.Mock };

  beforeEach(async () => {
    saasClient = { send: jest.fn().mockReturnValue(of(Response.success({ ok: true }))) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBillingController],
      providers: [{ provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient }],
    }).compile();
    controller = module.get(AdminBillingController);
  });

  it('forwards confirmedByUserId for manual confirmations', async () => {
    const req = {
      [MetadataKey.USER_DATA]: { metadata: { userId: 'admin-user-1' } },
    } as unknown as Request;

    await firstValueFrom(controller.manualConfirm('invoice-1', { note: 'bank matched' }, 'pid-1', req));

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SUBSCRIPTION.MANUAL_CONFIRM_INVOICE,
      expect.objectContaining({
        data: {
          invoiceId: 'invoice-1',
          confirmedByUserId: 'admin-user-1',
          note: 'bank matched',
        },
      }),
    );
  });
});
