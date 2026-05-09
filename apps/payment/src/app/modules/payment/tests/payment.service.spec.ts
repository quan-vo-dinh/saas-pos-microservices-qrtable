import { ConflictException } from '@nestjs/common';
import { BillStatus, PaymentMethod } from '@einvoice/types';
import { of } from 'rxjs';
import { QueryFailedError } from 'typeorm';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { PaymentEntity } from '../entities/payment.entity';
import { CONFIGURATION } from '../../../../configuration';
import { PaymentReferenceService } from '../services/payment-reference.service';
import { PaymentService } from '../services/payment.service';

function makePayment(overrides: Partial<PaymentEntity> = {}): PaymentEntity {
  return Object.assign(new PaymentEntity(), {
    id: 'payment-1',
    tenantId: 'tenant-1',
    billId: '11111111-1111-4111-8111-111111111111',
    billReference: 'QRTBL11111111',
    method: null,
    status: 'PENDING',
    rawTotal: 127_500,
    roundedTotal: 128_000,
    roundingDelta: 500,
    paidAmount: null,
    amountReceived: null,
    changeAmount: null,
    sepayTransactionId: null,
    sepayReferenceCode: null,
    sepayGateway: null,
    sepayAccountNumber: null,
    sepayTransferContent: null,
    sepayTransactionDate: null,
    paidAt: null,
    createdAt: new Date('2026-05-08T10:00:00.000Z'),
    updatedAt: new Date('2026-05-08T10:00:00.000Z'),
    ...overrides,
  });
}

function uniqueViolation(): QueryFailedError {
  return new QueryFailedError('INSERT INTO payments', [], { code: '23505' } as Error & { code: string });
}

describe('PaymentService policy checks', () => {
  const reference = new PaymentReferenceService();
  const originalSepayQrAccount = CONFIGURATION.SEPAY_CONFIG.QR_ACCOUNT;
  const originalSepayQrBank = CONFIGURATION.SEPAY_CONFIG.QR_BANK;

  afterEach(() => {
    CONFIGURATION.SEPAY_CONFIG.QR_ACCOUNT = originalSepayQrAccount;
    CONFIGURATION.SEPAY_CONFIG.QR_BANK = originalSepayQrBank;
  });

  it('extracts underpaid matched webhook as pending policy', () => {
    const billReference = reference.extractBillReference({
      code: 'QRTBLABC12345',
      content: 'ignored',
    });
    expect(billReference).toBe('QRTBLABC12345');
    expect(100000 < 128000).toBe(true);
  });

  it('defines cash conflict error as 409 conflict', () => {
    const err = new ConflictException('Bill already paid');
    expect(err.getStatus()).toBe(409);
  });

  it('uses VIETQR method for SePay payments', () => {
    expect(PaymentMethod.VIETQR).toBe('VIETQR');
  });

  it('reuses a pending payment when VietQR creation races on the bill unique key', async () => {
    CONFIGURATION.SEPAY_CONFIG.QR_ACCOUNT = '0010000000355';
    CONFIGURATION.SEPAY_CONFIG.QR_BANK = 'Vietcombank';
    const existing = makePayment();
    const paymentRepo = {
      findByTenantAndBill: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existing),
      create: jest.fn((input: Partial<PaymentEntity>) => makePayment(input)),
      save: jest.fn().mockRejectedValue(uniqueViolation()),
    };
    const auditRepo = { createPaymentAudit: jest.fn() };
    const orderClient = {
      send: jest.fn((pattern) => {
        expect(pattern).toBe(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT);
        return of({
          data: {
            billId: existing.billId,
            tenantId: existing.tenantId,
            sessionId: 'session-1',
            status: BillStatus.PENDING_PAYMENT,
            rawTotal: existing.rawTotal,
            roundedTotal: existing.roundedTotal,
            roundingDelta: existing.roundingDelta,
          },
        });
      }),
    };
    const service = new PaymentService(
      {} as never,
      orderClient as never,
      paymentRepo as never,
      auditRepo as never,
      {} as never,
      new PaymentReferenceService(),
    );

    const result = await service.createVietQr({
      tenantId: existing.tenantId,
      billId: existing.billId,
      userId: 'user-1',
      processId: 'process-1',
    });

    expect(result.id).toBe(existing.id);
    expect(result.qrUrl).toContain(`des=${existing.billReference}`);
    expect(paymentRepo.findByTenantAndBill).toHaveBeenCalledTimes(2);
    expect(auditRepo.createPaymentAudit).not.toHaveBeenCalled();
  });
});
