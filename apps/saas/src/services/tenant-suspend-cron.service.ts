import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantLifecycleService } from './tenant-lifecycle.service';

@Injectable()
export class TenantSuspendCronService {
  private readonly logger = new Logger(TenantSuspendCronService.name);

  constructor(
    @Inject(SubscriptionRepository)
    private readonly subscriptionRepository: {
      findExpiredBeyondGrace(now: Date, graceHours: number): Promise<Array<{ tenantId: string }>>;
    },
    private readonly tenantLifecycleService: TenantLifecycleService,
  ) {}

  @Cron('0 2 * * *', { timeZone: 'Asia/Ho_Chi_Minh' })
  async runDaily(): Promise<void> {
    await this.runOnce(new Date());
  }

  async runOnce(now: Date): Promise<void> {
    const expired = await this.subscriptionRepository.findExpiredBeyondGrace(now, 24);
    for (const row of expired) {
      try {
        await this.tenantLifecycleService.suspend({ tenantId: row.tenantId, reason: 'subscription expired' });
      } catch (error) {
        this.logger.error(`Failed to suspend expired tenant ${row.tenantId}`, error as Error);
      }
    }
  }
}
