import { Injectable } from '@nestjs/common';
import type { OrderReportRequest, OrderReportResponse } from '@common/interfaces/tcp/order';
import { normalizeReportRange } from '@common/utils/report-range.util';
import { formatBucketLabel } from '@common/utils/report-bucket.util';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';

@Injectable()
export class OrderReportService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly billRepository: BillRepository,
    private readonly orderItemRepository: OrderItemRepository,
  ) {}

  async getOrderReport(request: OrderReportRequest): Promise<OrderReportResponse> {
    const normalized = normalizeReportRange({
      from: request.from,
      to: request.to,
      grain: request.grain,
      timezone: request.timezone,
      limit: request.limit,
    });

    const [orderSummary, orderSeriesRows, paidBillSeriesRows, billStatusBreakdown, billPaidSummary, topItems] =
      await Promise.all([
        this.orderRepository.aggregateOrderSummary(request.tenantId, normalized.fromUtc, normalized.toUtc),
        this.orderRepository.aggregateOrderSeries(
          request.tenantId,
          normalized.fromUtc,
          normalized.toUtc,
          normalized.grain,
          normalized.timezone,
        ),
        this.billRepository.aggregatePaidBillSeries(
          request.tenantId,
          normalized.fromUtc,
          normalized.toUtc,
          normalized.grain,
          normalized.timezone,
        ),
        this.billRepository.aggregateBillStatusBreakdown(request.tenantId, normalized.fromUtc, normalized.toUtc),
        this.billRepository.aggregatePaidBillSummary(request.tenantId, normalized.fromUtc, normalized.toUtc),
        this.orderItemRepository.aggregateTopItems(
          request.tenantId,
          normalized.fromUtc,
          normalized.toUtc,
          normalized.limit,
        ),
      ]);

    const paidBillByBucket = new Map(paidBillSeriesRows.map((row) => [row.bucket, row.paidBillCount]));
    const orderSeries = orderSeriesRows.map((row) => ({
      ...row,
      paidBillCount: paidBillByBucket.get(row.bucket) ?? 0,
    }));

    const paidBillCount = billPaidSummary?.paidBillCount ?? 0;
    const averagePaidBillVnd =
      paidBillCount > 0 ? Math.round((billPaidSummary?.paidBillTotalVnd ?? 0) / paidBillCount) : 0;

    return {
      range: normalized.range,
      timezone: normalized.timezone,
      grain: normalized.grain,
      generatedAt: new Date().toISOString(),
      summary: {
        orderCount: orderSummary?.orderCount ?? 0,
        completedOrderCount: orderSummary?.completedOrderCount ?? 0,
        cancelledOrderCount: orderSummary?.cancelledOrderCount ?? 0,
        paidBillCount,
        pendingBillCount: billPaidSummary?.pendingBillCount ?? 0,
        averagePaidBillVnd,
      },
      orderSeries: orderSeries.map((row) => ({
        bucket: row.bucket,
        label: formatBucketLabel(row.bucket, normalized.grain),
        orderCount: row.orderCount,
        paidBillCount: row.paidBillCount,
        completedOrderCount: row.completedOrderCount,
      })),
      billStatusBreakdown,
      topItems,
    };
  }
}
