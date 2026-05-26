import { SubscriptionInvoiceExpireCronService } from './subscription-invoice-expire-cron.service';

describe('SubscriptionInvoiceExpireCronService', () => {
  it('expires pending invoices past qrExpiresAt', async () => {
    const expirePendingPastQrExpiry = jest.fn().mockResolvedValue(2);
    const service = new SubscriptionInvoiceExpireCronService({ expirePendingPastQrExpiry });

    const count = await service.runOnce(new Date('2026-05-26T12:00:00.000Z'));

    expect(count).toBe(2);
    expect(expirePendingPastQrExpiry).toHaveBeenCalledWith(new Date('2026-05-26T12:00:00.000Z'));
  });
});
