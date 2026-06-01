import { PlatformReportService } from './platform-report.service';
import { SubscriptionInvoiceRepository } from '../repositories/subscription-invoice.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantRepository } from '../repositories/tenant.repository';

describe('PlatformReportService', () => {
  it('returns empty platform revenue when no paid invoices exist', async () => {
    const subscriptionInvoiceRepository = {
      aggregatePlatformRevenueSummary: jest.fn().mockResolvedValue({
        platformRevenueVnd: 0,
        paidInvoiceCount: 0,
        pendingInvoiceCount: 0,
      }),
      aggregatePlatformRevenueSeries: jest.fn().mockResolvedValue([]),
      aggregateInvoiceStatusBreakdown: jest.fn().mockResolvedValue([]),
    };
    const tenantRepository = {
      aggregateStatusBreakdown: jest.fn().mockResolvedValue([]),
    };
    const subscriptionRepository = {
      aggregatePlanBreakdown: jest.fn().mockResolvedValue([]),
    };

    const service = new PlatformReportService(
      subscriptionInvoiceRepository as unknown as SubscriptionInvoiceRepository,
      tenantRepository as unknown as TenantRepository,
      subscriptionRepository as unknown as SubscriptionRepository,
    );

    const result = await service.getPlatformReport({
      timezone: 'Asia/Ho_Chi_Minh',
      grain: 'day',
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-31T23:59:59.999Z',
      limit: 10,
    });

    expect(result.summary.platformRevenueVnd).toBe(0);
    expect(result.revenueSeries).toEqual([]);
  });
});
