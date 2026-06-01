import { Injectable } from '@nestjs/common';
import { TenantStatus } from '@common/constants/saas.constants';
import type { PlatformReportRequest, PlatformReportResponse } from '@common/interfaces/tcp/saas';
import { normalizeReportRange } from '@common/utils/report-range.util';
import { formatBucketLabel } from '@common/utils/report-bucket.util';
import { SubscriptionInvoiceRepository } from '../repositories/subscription-invoice.repository';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { TenantRepository } from '../repositories/tenant.repository';

@Injectable()
export class PlatformReportService {
  constructor(
    private readonly subscriptionInvoiceRepository: SubscriptionInvoiceRepository,
    private readonly tenantRepository: TenantRepository,
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async getPlatformReport(request: PlatformReportRequest): Promise<PlatformReportResponse> {
    const normalized = normalizeReportRange({
      from: request.from,
      to: request.to,
      grain: request.grain,
      timezone: request.timezone,
      limit: request.limit,
    });

    const [revenueSummary, revenueSeries, tenantStatusBreakdown, invoiceStatusBreakdown, planBreakdown] =
      await Promise.all([
        this.subscriptionInvoiceRepository.aggregatePlatformRevenueSummary(normalized.fromUtc, normalized.toUtc),
        this.subscriptionInvoiceRepository.aggregatePlatformRevenueSeries(
          normalized.fromUtc,
          normalized.toUtc,
          normalized.grain,
          normalized.timezone,
        ),
        this.tenantRepository.aggregateStatusBreakdown(),
        this.subscriptionInvoiceRepository.aggregateInvoiceStatusBreakdown(normalized.fromUtc, normalized.toUtc),
        this.subscriptionRepository.aggregatePlanBreakdown(),
      ]);

    const tenantStatusMap = new Map(tenantStatusBreakdown.map((row) => [row.status, row.count]));

    return {
      range: normalized.range,
      timezone: normalized.timezone,
      grain: normalized.grain,
      generatedAt: new Date().toISOString(),
      summary: {
        platformRevenueVnd: revenueSummary.platformRevenueVnd,
        paidInvoiceCount: revenueSummary.paidInvoiceCount,
        pendingInvoiceCount: revenueSummary.pendingInvoiceCount,
        activeTenantCount: tenantStatusMap.get(TenantStatus.ACTIVE) ?? 0,
        suspendedTenantCount: tenantStatusMap.get(TenantStatus.SUSPENDED) ?? 0,
        closedTenantCount: tenantStatusMap.get(TenantStatus.CLOSED) ?? 0,
      },
      revenueSeries: revenueSeries.map((row) => ({
        bucket: row.bucket,
        label: formatBucketLabel(row.bucket, normalized.grain),
        platformRevenueVnd: row.platformRevenueVnd,
        paidInvoiceCount: row.paidInvoiceCount,
      })),
      tenantStatusBreakdown,
      invoiceStatusBreakdown,
      planBreakdown,
    };
  }
}
