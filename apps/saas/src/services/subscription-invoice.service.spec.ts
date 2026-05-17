import { SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { UnauthorizedException } from '@nestjs/common';
import { SubscriptionInvoiceService } from './subscription-invoice.service';

describe('SubscriptionInvoiceService', () => {
  const originalPlatformSecret = process.env.SEPAY_PLATFORM_WEBHOOK_SECRET;
  const invoiceRepo = {
    findByBillingReferenceForUpdate: jest.fn(),
    markPaid: jest.fn(),
    auditUnderpaid: jest.fn(),
  };
  const subscriptionService = { assignPlan: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.SEPAY_PLATFORM_WEBHOOK_SECRET = 'platform-secret';
  });

  afterAll(() => {
    if (originalPlatformSecret === undefined) {
      delete process.env.SEPAY_PLATFORM_WEBHOOK_SECRET;
      return;
    }
    process.env.SEPAY_PLATFORM_WEBHOOK_SECRET = originalPlatformSecret;
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
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

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
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

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
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

    await service.handleWebhook({
      code: 'QRSUB123',
      transferAmount: 999000,
      sepayTransactionId: 'tx-1',
      secret: 'platform-secret',
    });

    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
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
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

    await expect(
      service.handleWebhook({
        code: 'QRSUB123',
        transferAmount: 999000,
        sepayTransactionId: 'tx-1',
        secret: 'wrong-secret',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(invoiceRepo.findByBillingReferenceForUpdate).not.toHaveBeenCalled();
    expect(invoiceRepo.markPaid).not.toHaveBeenCalled();
    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
  });

  it('rejects unconfigured platform webhook secret without mutating invoice or subscription', async () => {
    delete process.env.SEPAY_PLATFORM_WEBHOOK_SECRET;
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

    await expect(
      service.handleWebhook({
        code: 'QRSUB123',
        transferAmount: 999000,
        sepayTransactionId: 'tx-1',
        secret: 'platform-secret',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(invoiceRepo.findByBillingReferenceForUpdate).not.toHaveBeenCalled();
    expect(invoiceRepo.markPaid).not.toHaveBeenCalled();
    expect(subscriptionService.assignPlan).not.toHaveBeenCalled();
  });

  it('ignores QRTBL payloads on the platform route without mutating invoice state', async () => {
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

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
});
