import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionInvoiceRepository } from '../repositories/subscription-invoice.repository';

@Injectable()
export class SubscriptionInvoiceExpireCronService {
  private readonly logger = new Logger(SubscriptionInvoiceExpireCronService.name);

  constructor(
    @Inject(SubscriptionInvoiceRepository)
    private readonly invoiceRepository: {
      expirePendingPastQrExpiry(now: Date): Promise<number>;
    },
  ) {}

  /** Marks PENDING invoices past qrExpiresAt as EXPIRED (QR validity window). */
  @Cron('*/5 * * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runScheduled(): Promise<void> {
    await this.runOnce(new Date());
  }

  async runOnce(now: Date): Promise<number> {
    const expiredCount = await this.invoiceRepository.expirePendingPastQrExpiry(now);
    if (expiredCount > 0) {
      this.logger.log(`Expired ${expiredCount} pending subscription invoice(s)`);
    }
    return expiredCount;
  }
}
