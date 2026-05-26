import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { Test, TestingModule } from '@nestjs/testing';
import { firstValueFrom, of } from 'rxjs';
import { SepayWebhookController } from './sepay-webhook.controller';

describe('SepayWebhookController', () => {
  let controller: SepayWebhookController;
  let saasClient: { send: jest.Mock };
  let paymentClient: { send: jest.Mock };

  beforeEach(async () => {
    saasClient = { send: jest.fn().mockReturnValue(of(Response.success({ matched: true }))) };
    paymentClient = { send: jest.fn().mockReturnValue(of(Response.success({ matched: true }))) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SepayWebhookController],
      providers: [
        { provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient },
        { provide: TCP_SERVICES.PAYMENT_SERVICE, useValue: paymentClient },
      ],
    }).compile();
    controller = module.get(SepayWebhookController);
  });

  it('platform webhook forwards to SaaS without tenantSlug or returning the raw secret', async () => {
    const response = await firstValueFrom(controller.handlePlatformWebhook('secret', { transferAmount: 299000 }));

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SUBSCRIPTION.HANDLE_WEBHOOK,
      expect.objectContaining({
        data: expect.objectContaining({ secret: 'secret', payload: { transferAmount: 299000 } }),
      }),
    );
    expect(saasClient.send.mock.calls[0][1].data).not.toHaveProperty('tenantSlug');
    expect(paymentClient.send).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain('secret');
  });

  it('tenant webhook forwards to Payment with tenantSlug', async () => {
    await firstValueFrom(controller.handleTenantWebhook('tenant-a', 'secret', '', '', '', { id: 1 }));

    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK,
      expect.objectContaining({
        data: expect.objectContaining({ tenantSlug: 'tenant-a', secret: 'secret', payload: { id: 1 } }),
      }),
    );
    expect(saasClient.send).not.toHaveBeenCalled();
  });

  it('tenant webhook accepts OAuth2 API key style headers', async () => {
    await firstValueFrom(controller.handleTenantWebhook('tenant-a', '', 'tenant-secret', '', '', { id: 1 }));

    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK,
      expect.objectContaining({
        data: expect.objectContaining({ tenantSlug: 'tenant-a', secret: 'tenant-secret' }),
      }),
    );
  });

  it('tenant webhook accepts SePay Authorization Apikey header', async () => {
    await firstValueFrom(controller.handleTenantWebhook('tenant-a', '', '', '', 'Apikey tenant-secret', { id: 1 }));

    expect(paymentClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK,
      expect.objectContaining({
        data: expect.objectContaining({ tenantSlug: 'tenant-a', secret: 'tenant-secret' }),
      }),
    );
  });

  it('missing secret returns typed BusinessException', () => {
    expect(() => controller.handlePlatformWebhook('', {})).toThrow(BusinessException);
    expect(() => controller.handleTenantWebhook('tenant-a', '', '', '', '', {})).toThrow(BusinessException);

    try {
      controller.handlePlatformWebhook('', {});
    } catch (error) {
      expect((error as BusinessException).errorCode).toBe(ErrorCode.SEPAY_SECRET_REQUIRED);
    }
  });
});
