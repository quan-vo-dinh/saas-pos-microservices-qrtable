import { SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ConfigService } from '@nestjs/config';
import { SubscriptionInvoiceService } from './subscription-invoice.service';

async function expectBusinessError(promise: Promise<unknown>, errorCode: ErrorCode): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(BusinessException);
  expect((caught as BusinessException).errorCode).toBe(errorCode);
}

describe('SubscriptionInvoiceService', () => {
  const invoiceRepo = {
    createInvoice: jest.fn(),
    findById: jest.fn(),
    findByBillingReferenceForUpdate: jest.fn(),
    list: jest.fn(),
    markPaid: jest.fn(),
    updateById: jest.fn(),
    auditUnderpaid: jest.fn(),
  };
  const subscriptionService = { assignPlan: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does not activate subscription when transfer is underpaid', async () => {
    invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
      id: 'invoice-1',
      billingReference: 'QRSUB123',
      amountVnd: 999000,
      status: SubscriptionInvoiceStatus.PENDING,
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
      periodEndsAt: new Date('2026-06-12T00:00:00.000Z'),
    });
    invoiceRepo.markPaid.mockResolvedValue({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
      periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
    });
    const service = createService();

    await service.handleWebhook({
      code: 'QRSUB123',
      transferAmount: 100000,
      sepayTransactionId: 'tx-1',
      secret: 'platform-secret',
    });

    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
    expect(invoiceRepo.auditUnderpaid).toHaveBeenCalledWith(
      'invoice-1',
      expect.objectContaining({ transferAmount: 100000 }),
    );
  });

  it('marks paid and assigns plan when amount is enough', async () => {
    invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
      id: 'invoice-1',
      billingReference: 'QRSUB123',
      amountVnd: 999000,
      status: SubscriptionInvoiceStatus.PENDING,
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
      periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
    });
    invoiceRepo.markPaid.mockResolvedValue({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
      periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
    });
    const service = createService();

    await service.handleWebhook({
      code: 'QRSUB123',
      transferAmount: 999000,
      sepayTransactionId: 'tx-1',
      secret: 'platform-secret',
    });

    expect(invoiceRepo.markPaid).toHaveBeenCalledWith(
      'invoice-1',
      expect.objectContaining({ sepayTransactionId: null }),
    );
    expect(subscriptionService.assignPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        planCode: 'PREMIUM',
        expiresAt: new Date('2027-05-12T00:00:00.000Z'),
      }),
    );
  });

  it('extracts QRSUB billing reference from transfer content when code is null', async () => {
    invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
      id: 'invoice-1',
      billingReference: 'QRSUBDDD611CC97',
      amountVnd: 5000,
      status: SubscriptionInvoiceStatus.PENDING,
      tenantId: 'tenant-1',
      planCodeSnapshot: 'VIP-2',
      periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
    });
    invoiceRepo.markPaid.mockResolvedValue({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      planCodeSnapshot: 'VIP-2',
      periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
    });
    const service = createService();

    await service.handleWebhook({
      code: null,
      transferAmount: 5000,
      sepayTransactionId: '60608248',
      secret: 'platform-secret',
      content:
        'MBVCB.14398446377.792251.QRSUBDDD611CC97.CT tu 9332770502 VO DINH MINH QUAN toi 0332770502 VO DINH MINH QUAN tai MB- Ma GD ACSP/ sf792251',
    });

    expect(invoiceRepo.findByBillingReferenceForUpdate).toHaveBeenCalledWith('QRSUBDDD611CC97');
    expect(subscriptionService.assignPlan).toHaveBeenCalled();
  });

  it('does not assign subscription when duplicate webhook loses pending update race', async () => {
    invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
      id: 'invoice-1',
      billingReference: 'QRSUB123',
      amountVnd: 999000,
      status: SubscriptionInvoiceStatus.PENDING,
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
      periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
    });
    invoiceRepo.markPaid.mockResolvedValue(null);
    const service = createService();

    await service.handleWebhook({
      code: 'QRSUB123',
      transferAmount: 999000,
      sepayTransactionId: 'tx-1',
      secret: 'platform-secret',
    });

    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
  });

  it('rejects manual confirmation without an audit note', async () => {
    const service = createService();

    await expectBusinessError(
      service.manualConfirm({
        invoiceId: 'invoice-1',
        confirmedByUserId: '6a09eb83438a79c4d6e70707',
        note: '   ',
      }),
      ErrorCode.SAAS_MANUAL_CONFIRM_NOTE_REQUIRED,
    );

    expect(invoiceRepo.findById).not.toHaveBeenCalled();
    expect(invoiceRepo.markPaid).not.toHaveBeenCalled();
    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
  });

  it('manual confirms an underpaid invoice after audit evidence is provided', async () => {
    const periodEndsAt = new Date('2026-06-26T00:00:00.000Z');
    const invoice = {
      id: 'invoice-1',
      tenantId: 'tenant-1',
      pricingPlanId: 'plan-basic',
      planCodeSnapshot: 'BASIC',
      amountVnd: 22000,
      billingPeriod: 'MONTHLY',
      billingReference: 'QRSUB123',
      status: SubscriptionInvoiceStatus.UNDERPAID,
      qrUrl: null,
      qrExpiresAt: new Date('2026-05-26T00:15:00.000Z'),
      paidAt: null,
      paidAmountVnd: 12000,
      periodEndsAt,
      createdAt: new Date('2026-05-26T00:00:00.000Z'),
    };
    invoiceRepo.findById.mockResolvedValue(invoice);
    invoiceRepo.markPaid.mockResolvedValue({
      ...invoice,
      status: SubscriptionInvoiceStatus.PAID,
      paidAmountVnd: 22000,
      paidAt: new Date('2026-05-26T00:20:00.000Z'),
    });
    const service = createService();

    const result = await service.manualConfirm({
      invoiceId: 'invoice-1',
      confirmedByUserId: '6a09eb83438a79c4d6e70707',
      note: '  Bank transfer TX  ',
    });

    expect(invoiceRepo.markPaid).toHaveBeenCalledWith(
      'invoice-1',
      expect.objectContaining({
        paidAmountVnd: 22000,
        sepayTransferContent: 'Bank transfer TX',
        manuallyConfirmedByUserId: '6a09eb83438a79c4d6e70707',
      }),
      [SubscriptionInvoiceStatus.PENDING, SubscriptionInvoiceStatus.UNDERPAID],
    );
    expect(subscriptionService.assignPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        planCode: 'BASIC',
        expiresAt: periodEndsAt,
        createdByUserId: '6a09eb83438a79c4d6e70707',
      }),
    );
    expect(result).toEqual(expect.objectContaining({ status: SubscriptionInvoiceStatus.PAID, paidAmountVnd: 22000 }));
  });

  it('rejects invalid platform webhook secret before marking invoice paid or assigning subscription', async () => {
    invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
      id: 'invoice-1',
      billingReference: 'QRSUB123',
      amountVnd: 999000,
      status: SubscriptionInvoiceStatus.PENDING,
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
      periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
    });
    invoiceRepo.markPaid.mockResolvedValue({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
      periodEndsAt: new Date('2027-05-12T00:00:00.000Z'),
    });
    const service = createService();

    await expectBusinessError(
      service.handleWebhook({
        code: 'QRSUB123',
        transferAmount: 999000,
        sepayTransactionId: 'tx-1',
        secret: 'wrong-secret',
      }),
      ErrorCode.SEPAY_PLATFORM_WEBHOOK_SECRET_INVALID,
    );

    expect(invoiceRepo.findByBillingReferenceForUpdate).not.toHaveBeenCalled();
    expect(invoiceRepo.markPaid).not.toHaveBeenCalled();
    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
  });

  it('rejects unconfigured platform webhook secret without mutating invoice or subscription', async () => {
    const service = createService({ WEBHOOK_SECRET: undefined });

    await expectBusinessError(
      service.handleWebhook({
        code: 'QRSUB123',
        transferAmount: 999000,
        sepayTransactionId: 'tx-1',
        secret: 'platform-secret',
      }),
      ErrorCode.SEPAY_PLATFORM_WEBHOOK_SECRET_INVALID,
    );

    expect(invoiceRepo.findByBillingReferenceForUpdate).not.toHaveBeenCalled();
    expect(invoiceRepo.markPaid).not.toHaveBeenCalled();
    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
  });

  it('ignores QRTBL payloads on the platform route without mutating invoice state', async () => {
    const service = createService();

    await service.handleWebhook({
      code: 'QRTBL11111111',
      transferAmount: 128000,
      sepayTransactionId: 'tx-1',
      secret: 'platform-secret',
    });

    expect(invoiceRepo.findByBillingReferenceForUpdate).not.toHaveBeenCalled();
    expect(invoiceRepo.markPaid).not.toHaveBeenCalled();
    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
  });

  function createService(config: { WEBHOOK_SECRET?: string } = { WEBHOOK_SECRET: 'platform-secret' }) {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SAAS_PLATFORM_PAYMENT_CONFIG.WEBHOOK_SECRET') {
          return config.WEBHOOK_SECRET;
        }

        return undefined;
      }),
    } as unknown as ConfigService;

    return new SubscriptionInvoiceService(
      invoiceRepo as never,
      subscriptionService as never,
      undefined,
      undefined,
      configService as never,
    );
  }
});
