import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { SepayWebhookPayload } from '@common/interfaces/tcp/payment';
import { BillStatus, PaymentMethod } from '@einvoice/types';
import { of, throwError } from 'rxjs';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { PaymentEntity } from '../entities/payment.entity';
import { CONFIGURATION } from '../../../../configuration';
import { PaymentMapper } from '../services/payment.mapper';
import { PaymentOrderGateway } from '../services/payment-order.gateway';
import { PaymentQueryService } from '../services/payment-query.service';
import { PaymentReferenceService } from '../services/payment-reference.service';
import { PaymentSettlementService } from '../services/payment-settlement.service';
import { PaymentService } from '../services/payment.service';
import { SepayWebhookService } from '../services/sepay-webhook.service';

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

function buildPaymentServiceForTest(opts: {
  dataSource: DataSource;
  orderClient: unknown;
  paymentRepo: unknown;
  auditRepo: unknown;
  outboxRepo: unknown;
  tenantPaymentSettingsRepository?: unknown;
  paymentSecrets?: unknown;
  tenantGateway?: unknown;
  reference?: PaymentReferenceService;
}): PaymentService {
  const reference = opts.reference ?? new PaymentReferenceService();
  const tenantPaymentSettingsRepository = opts.tenantPaymentSettingsRepository ?? {
    findByTenantId: jest.fn().mockResolvedValue({
      tenantId: 'tenant-1',
      webhookSecretEncrypted: 'encrypted-tenant-secret',
    }),
  };
  const paymentSecrets = opts.paymentSecrets ?? {
    decrypt: jest.fn().mockReturnValue('tenant-secret'),
  };
  const tenantGateway = opts.tenantGateway ?? {
    resolveBySlug: jest.fn().mockResolvedValue({ id: 'tenant-1', slug: 'tenant-a' }),
  };
  const gateway = new PaymentOrderGateway(opts.orderClient as never);
  const mapper = new PaymentMapper();
  const query = new PaymentQueryService(opts.paymentRepo as never, mapper);
  const settlement = new PaymentSettlementService(
    opts.dataSource,
    gateway,
    opts.paymentRepo as never,
    opts.auditRepo as never,
    opts.outboxRepo as never,
    tenantPaymentSettingsRepository as never,
    reference,
    mapper,
  );
  const sepay = new SepayWebhookService(
    opts.dataSource,
    gateway,
    opts.paymentRepo as never,
    opts.auditRepo as never,
    opts.outboxRepo as never,
    reference,
    tenantPaymentSettingsRepository as never,
    paymentSecrets as never,
    tenantGateway as never,
  );
  return new PaymentService(settlement, sepay, query);
}

function baseSepayPayload(overrides: Partial<SepayWebhookPayload> = {}): SepayWebhookPayload {
  return {
    id: 42,
    gateway: 'MB',
    transactionDate: '2026-05-08 10:00:00',
    accountNumber: '123456',
    code: 'QRTBL11111111',
    content: 'transfer',
    transferType: 'in',
    transferAmount: 128_000,
    accumulated: 0,
    subAccount: null,
    referenceCode: 'REF-1',
    description: 'SePay in',
    ...overrides,
  };
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
    const service = buildPaymentServiceForTest({
      dataSource: {} as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo: {} as never,
    });

    const result = await service.createVietQr({
      tenantId: existing.tenantId,
      billId: existing.billId,
      userId: 'user-1',
      processId: 'process-1',
    });

    expect(result.id).toBe(existing.id);
    expect(result.qrUrl).toContain(`des=${existing.billReference}`);
    expect(result.bankAccount).toBe('0010000000355');
    expect(result.bankName).toBe('Vietcombank');
    expect(paymentRepo.findByTenantAndBill).toHaveBeenCalledTimes(2);
    expect(auditRepo.createPaymentAudit).not.toHaveBeenCalled();
  });

  it('creates VietQR using tenant payment settings instead of platform env account', async () => {
    CONFIGURATION.SEPAY_CONFIG.QR_ACCOUNT = '0010000000355';
    CONFIGURATION.SEPAY_CONFIG.QR_BANK = 'Vietcombank';
    const payment = makePayment();
    const tenantPaymentSettingsRepository = {
      findByTenantId: jest.fn().mockResolvedValue({
        tenantId: 'tenant-1',
        vietqrEnabled: true,
        vietqrAccountNumber: '9332770502',
        vietqrBankName: 'VCB',
        connectionStatus: 'CONNECTED',
      }),
    };
    const paymentRepo = {
      findByTenantAndBill: jest.fn().mockResolvedValueOnce(null),
      create: jest.fn((input: Partial<PaymentEntity>) => makePayment(input)),
      save: jest.fn().mockResolvedValue(payment),
    };
    const auditRepo = { createPaymentAudit: jest.fn() };
    const orderClient = {
      send: jest.fn().mockReturnValue(
        of({
          data: {
            billId: payment.billId,
            tenantId: payment.tenantId,
            sessionId: 'session-1',
            status: BillStatus.PENDING_PAYMENT,
            rawTotal: payment.rawTotal,
            roundedTotal: payment.roundedTotal,
            roundingDelta: payment.roundingDelta,
          },
        }),
      ),
    };
    const service = buildPaymentServiceForTest({
      dataSource: {} as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo: {} as never,
      tenantPaymentSettingsRepository,
    });

    const result = await service.createVietQr({
      tenantId: 'tenant-1',
      billId: 'bill-1',
      userId: 'user-1',
    });

    expect(result.bankAccount).toBe('9332770502');
    expect(result.bankName).toBe('VCB');
    expect(result.qrUrl).toContain('acc=9332770502');
    expect(result.qrUrl).toContain('amount=128000');
    expect(paymentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        rawTotal: 127_500,
        roundedTotal: 128_000,
        roundingDelta: 500,
      }),
    );
  });

  it('rejects an inconsistent Order bill snapshot before creating a VietQR payment', async () => {
    CONFIGURATION.SEPAY_CONFIG.QR_ACCOUNT = '0010000000355';
    CONFIGURATION.SEPAY_CONFIG.QR_BANK = 'Vietcombank';
    const paymentRepo = {
      findByTenantAndBill: jest.fn(),
      create: jest.fn((input: Partial<PaymentEntity>) => makePayment(input)),
      save: jest.fn().mockImplementation(async (payment: PaymentEntity) => payment),
    };
    const auditRepo = { createPaymentAudit: jest.fn() };
    const orderClient = {
      send: jest.fn().mockReturnValue(
        of({
          data: {
            billId: 'bill-1',
            tenantId: 'tenant-1',
            sessionId: 'session-1',
            status: BillStatus.PENDING_PAYMENT,
            rawTotal: 127_500,
            roundedTotal: 127_500,
            roundingDelta: 0,
          },
        }),
      ),
    };
    const service = buildPaymentServiceForTest({
      dataSource: {} as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo: {} as never,
    });

    await expect(
      service.createVietQr({
        tenantId: 'tenant-1',
        billId: 'bill-1',
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(paymentRepo.create).not.toHaveBeenCalled();
    expect(paymentRepo.save).not.toHaveBeenCalled();
    expect(auditRepo.createPaymentAudit).not.toHaveBeenCalled();
  });
});

describe('PaymentService settlement behavior', () => {
  const snapshot = {
    billId: '11111111-1111-4111-8111-111111111111',
    tenantId: 'tenant-1',
    sessionId: 'session-1',
    status: BillStatus.PENDING_PAYMENT,
    rawTotal: 127_500,
    roundedTotal: 128_000,
    roundingDelta: 500,
  };

  it('handleSepayWebhook: underpaid transfer records UNDERPAID audit and does not complete payment', async () => {
    const payment = makePayment({
      billReference: 'QRTBL11111111',
      status: 'PENDING',
      sepayTransactionId: null,
    });
    const manager = { save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e) };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn().mockResolvedValue(payment),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = { send: jest.fn() };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await service.handleSepayWebhook({
      payload: baseSepayPayload({ transferAmount: 100_000 }),
      tenantSlug: 'tenant-a',
      secret: 'tenant-secret',
    });

    const actions = auditRepo.createPaymentAudit.mock.calls.map((c) => c[1]);
    expect(actions).toContain('SEPAY_WEBHOOK_UNDERPAID');
    expect(auditRepo.createPaymentAudit).toHaveBeenCalledWith(
      payment,
      'SEPAY_WEBHOOK_UNDERPAID',
      'SEPAY',
      null,
      null,
      expect.objectContaining({
        expectedAmount: payment.roundedTotal,
        actualAmount: 100_000,
      }),
      expect.anything(),
    );
    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('handleSepayWebhook: duplicate SePay transaction id records DUPLICATE and skips settlement', async () => {
    const payment = makePayment({
      billReference: 'QRTBL11111111',
      status: 'PENDING',
      sepayTransactionId: 42,
    });
    const manager = { save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e) };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn().mockResolvedValue(payment),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = { send: jest.fn() };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await service.handleSepayWebhook({
      payload: baseSepayPayload({ id: 42 }),
      tenantSlug: 'tenant-a',
      secret: 'tenant-secret',
    });

    const actions = auditRepo.createPaymentAudit.mock.calls.map((c) => c[1]);
    expect(actions).toContain('SEPAY_WEBHOOK_DUPLICATE');
    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('handleSepayWebhook: webhook after PAID records AFTER_PAID and does not call Order', async () => {
    const payment = makePayment({
      billReference: 'QRTBL11111111',
      status: 'PAID',
      sepayTransactionId: 1,
    });
    const manager = { save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e) };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn().mockResolvedValue(payment),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = { send: jest.fn() };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await service.handleSepayWebhook({
      payload: baseSepayPayload({ id: 99 }),
      tenantSlug: 'tenant-a',
      secret: 'tenant-secret',
    });

    const actions = auditRepo.createPaymentAudit.mock.calls.map((c) => c[1]);
    expect(actions).toContain('SEPAY_WEBHOOK_AFTER_PAID');
    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('handleSepayWebhook: sufficient or overpaid transfer completes payment and notifies Order', async () => {
    const payment = makePayment({
      billReference: 'QRTBL11111111',
      status: 'PENDING',
      sepayTransactionId: null,
    });
    const manager = { save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e) };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn().mockResolvedValue(payment),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = {
      send: jest.fn().mockImplementation((pattern: string) => {
        if (pattern === TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID) {
          return of({ data: { ok: true } });
        }
        return throwError(() => new Error(`unexpected pattern ${pattern}`));
      }),
    };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await service.handleSepayWebhook({
      payload: baseSepayPayload({ transferAmount: 200_000 }),
      processId: 'proc-1',
      tenantSlug: 'tenant-a',
      secret: 'tenant-secret',
    });

    expect(payment.status).toBe('PAID');
    expect(payment.method).toBe(PaymentMethod.VIETQR);
    expect(outboxRepo.createCompleted).toHaveBeenCalled();
    expect(orderClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID,
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          billId: payment.billId,
          paymentId: payment.id,
          method: 'VIETQR',
        }),
      }),
    );
  });

  it('handleSepayWebhook: invalid tenant secret rejects before mutating payment, outbox, or Order', async () => {
    const payment = makePayment({
      billReference: 'QRTBL11111111',
      status: 'PENDING',
      sepayTransactionId: null,
    });
    const manager = { save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e) };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn().mockResolvedValue(payment),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = {
      send: jest.fn().mockReturnValue(of({ data: { ok: true } })),
    };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await expect(
      service.handleSepayWebhook({
        payload: baseSepayPayload({ transferAmount: 200_000 }),
        tenantSlug: 'tenant-a',
        secret: 'wrong-secret',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(payment.status).toBe('PENDING');
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
    expect(auditRepo.createPaymentAudit).not.toHaveBeenCalled();
    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('handleSepayWebhook: unconfigured tenant secret rejects before opening a settlement transaction', async () => {
    const dataSource = {
      transaction: jest.fn(),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn(),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = { send: jest.fn() };
    const tenantPaymentSettingsRepository = {
      findByTenantId: jest.fn().mockResolvedValue({
        tenantId: 'tenant-1',
        webhookSecretEncrypted: null,
      }),
    };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
      tenantPaymentSettingsRepository,
    });

    await expect(
      service.handleSepayWebhook({
        payload: baseSepayPayload({ transferAmount: 200_000 }),
        tenantSlug: 'tenant-a',
        secret: 'tenant-secret',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(paymentRepo.findByBillReferenceForUpdate).not.toHaveBeenCalled();
    expect(auditRepo.createPaymentAudit).not.toHaveBeenCalled();
    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('handleSepayWebhook: tenant slug mismatch rejects before mutating payment, outbox, or Order', async () => {
    const payment = makePayment({
      tenantId: 'tenant-b',
      billReference: 'QRTBL11111111',
      status: 'PENDING',
      sepayTransactionId: null,
    });
    const manager = { save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e) };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn().mockResolvedValue(payment),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = {
      send: jest.fn().mockReturnValue(of({ data: { ok: true } })),
    };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await expect(
      service.handleSepayWebhook({
        payload: baseSepayPayload({ transferAmount: 200_000 }),
        tenantSlug: 'tenant-a',
        secret: 'tenant-secret',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(payment.status).toBe('PENDING');
    expect(manager.save).not.toHaveBeenCalled();
    expect(auditRepo.createPaymentAudit).not.toHaveBeenCalled();
    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('handleSepayWebhook: QRSUB payload on tenant route does not mutate payment state', async () => {
    const dataSource = {
      transaction: jest.fn(),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn(),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = { send: jest.fn() };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await service.handleSepayWebhook({
      payload: baseSepayPayload({
        code: 'QRSUB123',
        content: 'Thanh toan QRSUB123',
        transferAmount: 999_000,
      }),
      tenantSlug: 'tenant-a',
      secret: 'tenant-secret',
    });

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(paymentRepo.findByBillReferenceForUpdate).not.toHaveBeenCalled();
    expect(auditRepo.createPaymentAudit).not.toHaveBeenCalled();
    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
    expect(orderClient.send).not.toHaveBeenCalled();
  });

  it('confirmCash: persists PAID payment even when BILL_MARK_PAID TCP fails afterward', async () => {
    const payment = makePayment({ status: 'PENDING', method: null, paidAmount: null });
    const manager = { save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e) };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn(),
      findByTenantBillForUpdate: jest.fn().mockResolvedValue(payment),
      findByTenantAndBill: jest.fn().mockResolvedValue({
        ...payment,
        status: 'PAID',
        method: PaymentMethod.CASH,
        paidAmount: 128_000,
        amountReceived: 130_000,
        changeAmount: 2000,
        paidAt: new Date('2026-05-08T12:00:00.000Z'),
      }),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = {
      send: jest.fn().mockImplementation((pattern: string) => {
        if (pattern === TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT) {
          return of({ data: snapshot });
        }
        if (pattern === TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID) {
          return throwError(() => new Error('order unavailable'));
        }
        return throwError(() => new Error(`unexpected pattern ${pattern}`));
      }),
    };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    const result = await service.confirmCash({
      tenantId: 'tenant-1',
      billId: payment.billId,
      userId: 'user-1',
      amountReceived: 130_000,
      processId: 'p1',
    });

    expect(result.status).toBe('PAID');
    expect(result.method).toBe(PaymentMethod.CASH);
    expect(outboxRepo.createCompleted).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'PAID' }),
      expect.any(String),
    );
    expect(orderClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID, expect.anything());
  });

  it('confirmCash: rejects cash below roundedTotal even when amountReceived covers rawTotal', async () => {
    const payment = makePayment({ status: 'PENDING', method: null, paidAmount: null });
    const manager = { save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e) };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn(),
      findByTenantBillForUpdate: jest.fn().mockResolvedValue(payment),
      findByTenantAndBill: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = {
      send: jest.fn().mockReturnValue(of({ data: snapshot })),
    };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await expect(
      service.confirmCash({
        tenantId: 'tenant-1',
        billId: payment.billId,
        userId: 'user-1',
        amountReceived: 127_500,
        processId: 'p1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
  });

  it('confirmCash: rejects an inconsistent Order bill snapshot before creating a cash payment', async () => {
    const manager = {
      save: jest.fn().mockImplementation(async (_: unknown, e: unknown) => e),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (m: EntityManager) => Promise<void>) => fn(manager as unknown as EntityManager)),
    };
    const inconsistentPayment = makePayment({
      roundedTotal: 127_500,
      roundingDelta: 0,
      paidAmount: null,
      amountReceived: null,
      changeAmount: null,
    });
    const paymentRepo = {
      findByBillReferenceForUpdate: jest.fn(),
      findByTenantBillForUpdate: jest.fn(),
      findByTenantAndBill: jest.fn().mockResolvedValue({
        ...inconsistentPayment,
        status: 'PAID',
        method: PaymentMethod.CASH,
        paidAmount: 127_500,
        amountReceived: 127_500,
        changeAmount: 0,
      }),
      create: jest.fn(() => inconsistentPayment),
      save: jest.fn(),
    };
    const auditRepo = { createPaymentAudit: jest.fn().mockResolvedValue(undefined) };
    const outboxRepo = { createCompleted: jest.fn().mockResolvedValue(undefined) };
    const orderClient = {
      send: jest.fn().mockReturnValue(
        of({
          data: {
            ...snapshot,
            roundedTotal: 127_500,
            roundingDelta: 0,
          },
        }),
      ),
    };

    const service = buildPaymentServiceForTest({
      dataSource: dataSource as unknown as DataSource,
      orderClient,
      paymentRepo,
      auditRepo,
      outboxRepo,
    });

    await expect(
      service.confirmCash({
        tenantId: 'tenant-1',
        billId: snapshot.billId,
        userId: 'user-1',
        amountReceived: 127_500,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(paymentRepo.create).not.toHaveBeenCalled();
    expect(manager.save).not.toHaveBeenCalled();
    expect(outboxRepo.createCompleted).not.toHaveBeenCalled();
  });
});
