import { SubscriptionInvoiceStatus } from '@common/constants/saas.constants';
import { SubscriptionInvoiceService } from './subscription-invoice.service';

describe('SubscriptionInvoiceService', () => {
  const invoiceRepo = {
    findByBillingReferenceForUpdate: jest.fn(),
    markPaid: jest.fn(),
    auditUnderpaid: jest.fn(),
  };
  const subscriptionService = { assignPlan: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  it('does not activate subscription when transfer is underpaid', async () => {
    invoiceRepo.findByBillingReferenceForUpdate.mockResolvedValue({
      id: 'invoice-1',
      billingReference: 'QRSUB123',
      amountVnd: 999000,
      status: SubscriptionInvoiceStatus.PENDING,
      tenantId: 'tenant-1',
      planCodeSnapshot: 'PREMIUM',
    });
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

    await service.handleWebhook({ code: 'QRSUB123', transferAmount: 100000, sepayTransactionId: 'tx-1' });

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
    });
    const service = new SubscriptionInvoiceService(invoiceRepo as never, subscriptionService as never);

    await service.handleWebhook({ code: 'QRSUB123', transferAmount: 999000, sepayTransactionId: 'tx-1' });

    expect(invoiceRepo.markPaid).toHaveBeenCalledWith(
      'invoice-1',
      expect.objectContaining({ sepayTransactionId: 'tx-1' }),
    );
    expect(subscriptionService.assignPlan).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-1', planCode: 'PREMIUM' }),
    );
  });
});
