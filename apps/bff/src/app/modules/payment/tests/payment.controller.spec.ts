jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { SepayWebhookPayload } from '@common/interfaces/tcp/payment';
import { NEVER, of } from 'rxjs';
import { PaymentController } from '../controllers/payment.controller';
import { assertSepayWebhookSecret } from '../verify-sepay-webhook-secret';

function makeSepayPayload(overrides: Partial<SepayWebhookPayload> = {}): SepayWebhookPayload {
  return {
    id: 1,
    gateway: 'VCB',
    transactionDate: '2026-05-08 10:00:00',
    accountNumber: '0010000000355',
    code: 'QRTBL11111111',
    content: 'QRTBL11111111',
    transferType: 'in',
    transferAmount: 128000,
    accumulated: 128000,
    subAccount: null,
    referenceCode: 'REF-1',
    description: 'QRTBL11111111',
    ...overrides,
  };
}

describe('assertSepayWebhookSecret', () => {
  it('rejects missing secret', () => {
    expect(() => assertSepayWebhookSecret(undefined, 'secret')).toThrow(UnauthorizedException);
  });

  it('rejects invalid secret', () => {
    expect(() => assertSepayWebhookSecret('wrong', 'secret')).toThrow(UnauthorizedException);
  });

  it('rejects empty configured secret', () => {
    expect(() => assertSepayWebhookSecret('anything', '')).toThrow(UnauthorizedException);
  });

  it('accepts matching secret', () => {
    expect(() => assertSepayWebhookSecret('secret', 'secret')).not.toThrow();
  });
});

describe('PaymentController TCP behavior', () => {
  it('marks SePay webhook as a raw response endpoint for the external provider contract', () => {
    const reflector = new Reflector();
    expect(reflector.get(MetadataKey.SKIP_RESPONSE_WRAPPER, PaymentController.prototype.sepayWebhook)).toBe(true);
  });

  it('wraps SePay webhook TCP calls with a bounded timeout', async () => {
    const send = jest.fn(() => NEVER);
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SEPAY_WEBHOOK_SECRET') {
          return 'secret';
        }
        if (key === 'BFF_PAYMENT_TCP_TIMEOUT_MS') {
          return '1';
        }
        return undefined;
      }),
    };
    const controller = new PaymentController({ send } as never, configService as never);

    await expect(controller.sepayWebhook('secret', makeSepayPayload(), 'process-1')).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    expect(send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK, expect.any(Object));
  });

  it('returns the exact success body SePay requires after the Payment TCP call succeeds', async () => {
    const send = jest.fn(() => of({ data: { status: 'success' }, statusCode: 200, code: HTTP_MESSAGE.OK }));
    const configService = {
      get: jest.fn((key: string) => (key === 'SEPAY_WEBHOOK_SECRET' ? 'secret' : undefined)),
    };
    const controller = new PaymentController({ send } as never, configService as never);

    const response = await controller.sepayWebhook('secret', makeSepayPayload(), 'process-1');

    expect(response).toEqual({ success: true });
  });
});
