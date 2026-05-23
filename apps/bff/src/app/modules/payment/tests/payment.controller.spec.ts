jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { createHmac } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Reflector } from '@nestjs/core';
import { MetadataKey } from '@common/constants/common.constant';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { SepayWebhookRequestDto } from '@common/interfaces/gateway/payment';
import type { SepayWebhookPayload } from '@common/interfaces/tcp/payment';
import { NEVER, of } from 'rxjs';
import { PaymentController } from '../controllers/payment.controller';
import { assertSepayHmacSignature } from '../verify-sepay-webhook-secret';

// ─── helpers ──────────────────────────────────────────────────────────────────

function makeSignature(secret: string, timestamp: string, body: string): string {
  const hex = createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
  return `sha256=${hex}`;
}

function expectBusinessThrow(fn: () => void, errorCode: ErrorCode): void {
  expect(fn).toThrow(BusinessException);

  try {
    fn();
  } catch (error) {
    expect((error as BusinessException).errorCode).toBe(errorCode);
  }
}

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

// ─── DTO validation ───────────────────────────────────────────────────────────

describe('SepayWebhookRequestDto validation', () => {
  it('rejects malformed SePay webhook payloads before TCP forwarding', async () => {
    const dto = plainToInstance(SepayWebhookRequestDto, {
      id: 'not-a-number',
      gateway: '',
      transactionDate: '',
      accountNumber: '',
      code: null,
      content: '',
      transferType: 'sideways',
      transferAmount: -1,
      accumulated: 0,
      subAccount: null,
      referenceCode: '',
      description: '',
    });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

// ─── assertSepayHmacSignature ─────────────────────────────────────────────────

describe('assertSepayHmacSignature', () => {
  const SECRET = 'test-secret';
  const TIMESTAMP = '1715000000';
  const BODY = '{"id":1}';
  const VALID_SIG = makeSignature(SECRET, TIMESTAMP, BODY);

  it('throws when secret is empty', () => {
    expectBusinessThrow(
      () => assertSepayHmacSignature(VALID_SIG, TIMESTAMP, BODY, ''),
      ErrorCode.SEPAY_WEBHOOK_SECRET_NOT_CONFIGURED,
    );
  });

  it('throws when signature header is missing', () => {
    expectBusinessThrow(
      () => assertSepayHmacSignature(undefined, TIMESTAMP, BODY, SECRET),
      ErrorCode.SEPAY_WEBHOOK_SIGNATURE_MISSING,
    );
  });

  it('throws when timestamp header is missing', () => {
    expectBusinessThrow(
      () => assertSepayHmacSignature(VALID_SIG, undefined, BODY, SECRET),
      ErrorCode.SEPAY_WEBHOOK_SIGNATURE_MISSING,
    );
  });

  it('throws when signature does not match', () => {
    expectBusinessThrow(
      () => assertSepayHmacSignature('sha256=deadbeef', TIMESTAMP, BODY, SECRET),
      ErrorCode.SEPAY_WEBHOOK_SIGNATURE_INVALID,
    );
  });

  it('throws when timestamp is tampered', () => {
    expectBusinessThrow(
      () => assertSepayHmacSignature(VALID_SIG, '9999999999', BODY, SECRET),
      ErrorCode.SEPAY_WEBHOOK_SIGNATURE_INVALID,
    );
  });

  it('accepts a valid HMAC-SHA256 signature', () => {
    expect(() => assertSepayHmacSignature(VALID_SIG, TIMESTAMP, BODY, SECRET)).not.toThrow();
  });

  it('accepts raw body as Buffer', () => {
    const buf = Buffer.from(BODY, 'utf8');
    expect(() => assertSepayHmacSignature(VALID_SIG, TIMESTAMP, buf, SECRET)).not.toThrow();
  });
});

// ─── PaymentController ────────────────────────────────────────────────────────

describe('PaymentController TCP behavior', () => {
  it('marks SePay webhook as a raw response endpoint for the external provider contract', () => {
    const reflector = new Reflector();
    expect(reflector.get(MetadataKey.SKIP_RESPONSE_WRAPPER, PaymentController.prototype.sepayWebhook)).toBe(true);
  });

  it('wraps SePay webhook TCP calls with a bounded timeout', async () => {
    const send = jest.fn(() => NEVER);
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'BFF_PAYMENT_CONFIG.SEPAY_WEBHOOK_SECRET') return 'secret';
        if (key === 'BFF_PAYMENT_CONFIG.PAYMENT_TCP_TIMEOUT_MS') return '1';
        return undefined;
      }),
    };
    const controller = new PaymentController({ send } as never, configService as never);

    await expect(controller.sepayWebhook(makeSepayPayload(), 'process-1')).rejects.toMatchObject({
      name: 'TimeoutError',
    });
    expect(send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK, expect.any(Object));
  });

  it('returns the exact success body SePay requires after the Payment TCP call succeeds', async () => {
    const send = jest.fn(() => of({ data: { status: 'success' }, statusCode: 200, code: HTTP_MESSAGE.OK }));
    const configService = {
      get: jest.fn((key: string) => (key === 'BFF_PAYMENT_CONFIG.SEPAY_WEBHOOK_SECRET' ? 'secret' : undefined)),
    };
    const controller = new PaymentController({ send } as never, configService as never);

    const response = await controller.sepayWebhook(makeSepayPayload(), 'process-1');

    expect(response).toEqual({ success: true });
  });
});
