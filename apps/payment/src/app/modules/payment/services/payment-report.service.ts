import { Injectable } from '@nestjs/common';
import type { PaymentRevenueReportRequest, PaymentRevenueReportResponse } from '@common/interfaces/tcp/payment';
import { normalizeReportRange } from '@common/utils/report-range.util';
import { formatBucketLabel } from '@common/utils/report-bucket.util';
import { PaymentRepository } from '../repositories/payment.repository';

@Injectable()
export class PaymentReportService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async getRevenueReport(request: PaymentRevenueReportRequest): Promise<PaymentRevenueReportResponse> {
    const normalized = normalizeReportRange({
      from: request.from,
      to: request.to,
      grain: request.grain,
      timezone: request.timezone,
      limit: request.limit,
    });

    const [summaryRow, seriesRows, methodRows, recentRows] = await Promise.all([
      this.paymentRepository.aggregatePaidSummary(request.tenantId, normalized.fromUtc, normalized.toUtc),
      this.paymentRepository.aggregateRevenueSeries(
        request.tenantId,
        normalized.fromUtc,
        normalized.toUtc,
        normalized.grain,
        normalized.timezone,
      ),
      this.paymentRepository.aggregateMethodBreakdown(request.tenantId, normalized.fromUtc, normalized.toUtc),
      this.paymentRepository.findRecentPaid(request.tenantId, normalized.fromUtc, normalized.toUtc, normalized.limit),
    ]);

    const paidPaymentCount = summaryRow?.paidPaymentCount ?? 0;
    const grossSalesVnd = summaryRow?.grossSalesVnd ?? 0;
    const collectedVnd = summaryRow?.collectedVnd ?? 0;
    const roundingDeltaVnd = summaryRow?.roundingDeltaVnd ?? 0;

    return {
      range: normalized.range,
      timezone: normalized.timezone,
      grain: normalized.grain,
      generatedAt: new Date().toISOString(),
      summary: {
        grossSalesVnd,
        collectedVnd,
        roundingDeltaVnd,
        paidPaymentCount,
        averagePaidPaymentVnd: paidPaymentCount > 0 ? Math.round(grossSalesVnd / paidPaymentCount) : 0,
      },
      revenueSeries: seriesRows.map((row) => ({
        bucket: row.bucket,
        label: formatBucketLabel(row.bucket, normalized.grain),
        grossSalesVnd: row.grossSalesVnd,
        collectedVnd: row.collectedVnd,
        paymentCount: row.paymentCount,
      })),
      paymentMethodBreakdown: methodRows.map((row) => ({
        method: row.method ?? 'UNKNOWN',
        grossSalesVnd: row.grossSalesVnd,
        collectedVnd: row.collectedVnd,
        paymentCount: row.paymentCount,
      })),
      recentPayments: recentRows.map((payment) => ({
        paymentId: payment.id,
        billId: payment.billId,
        billReference: payment.billReference,
        method: payment.method ?? 'UNKNOWN',
        status: payment.status,
        grossSalesVnd: payment.roundedTotal,
        collectedVnd: payment.paidAmount ?? payment.roundedTotal,
        paidAt: payment.paidAt?.toISOString() ?? payment.updatedAt.toISOString(),
      })),
    };
  }
}
