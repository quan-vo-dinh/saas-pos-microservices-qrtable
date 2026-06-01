import { PaymentStatus } from '@einvoice/types';
import { PaymentReportService } from '../services/payment-report.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentEntity } from '../entities/payment.entity';

describe('PaymentReportService', () => {
  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';
  const from = '2026-05-01T00:00:00.000Z';
  const to = '2026-05-31T23:59:59.999Z';

  let repository: jest.Mocked<
    Pick<
      PaymentRepository,
      'aggregatePaidSummary' | 'aggregateRevenueSeries' | 'aggregateMethodBreakdown' | 'findRecentPaid'
    >
  >;
  let service: PaymentReportService;

  beforeEach(() => {
    repository = {
      aggregatePaidSummary: jest.fn(),
      aggregateRevenueSeries: jest.fn(),
      aggregateMethodBreakdown: jest.fn(),
      findRecentPaid: jest.fn(),
    };
    service = new PaymentReportService(repository as unknown as PaymentRepository);
  });

  const baseRequest = {
    tenantId: tenantA,
    timezone: 'Asia/Ho_Chi_Minh',
    grain: 'day' as const,
    from,
    to,
    limit: 10,
  };

  it('returns zero totals and empty arrays when no paid payments exist', async () => {
    repository.aggregatePaidSummary.mockResolvedValue({
      grossSalesVnd: 0,
      collectedVnd: 0,
      roundingDeltaVnd: 0,
      paidPaymentCount: 0,
    });
    repository.aggregateRevenueSeries.mockResolvedValue([]);
    repository.aggregateMethodBreakdown.mockResolvedValue([]);
    repository.findRecentPaid.mockResolvedValue([]);

    const result = await service.getRevenueReport(baseRequest);

    expect(result.summary).toEqual({
      grossSalesVnd: 0,
      collectedVnd: 0,
      roundingDeltaVnd: 0,
      paidPaymentCount: 0,
      averagePaidPaymentVnd: 0,
    });
    expect(result.revenueSeries).toEqual([]);
    expect(result.paymentMethodBreakdown).toEqual([]);
    expect(result.recentPayments).toEqual([]);
    expect(repository.aggregatePaidSummary).toHaveBeenCalledWith(tenantA, expect.any(Date), expect.any(Date));
  });

  it('scopes repository queries to the requested tenant', async () => {
    repository.aggregatePaidSummary.mockResolvedValue(null);
    repository.aggregateRevenueSeries.mockResolvedValue([]);
    repository.aggregateMethodBreakdown.mockResolvedValue([]);
    repository.findRecentPaid.mockResolvedValue([]);

    await service.getRevenueReport({ ...baseRequest, tenantId: tenantB });

    expect(repository.aggregatePaidSummary.mock.calls[0][0]).toBe(tenantB);
    expect(repository.findRecentPaid.mock.calls[0][0]).toBe(tenantB);
  });

  it('maps payment method breakdown and recent payments', async () => {
    repository.aggregatePaidSummary.mockResolvedValue({
      grossSalesVnd: 300_000,
      collectedVnd: 300_000,
      roundingDeltaVnd: 1_000,
      paidPaymentCount: 2,
    });
    repository.aggregateRevenueSeries.mockResolvedValue([
      { bucket: '2026-05-10', grossSalesVnd: 300_000, collectedVnd: 300_000, paymentCount: 2 },
    ]);
    repository.aggregateMethodBreakdown.mockResolvedValue([
      { method: 'CASH', grossSalesVnd: 100_000, collectedVnd: 100_000, paymentCount: 1 },
      { method: 'VIETQR', grossSalesVnd: 200_000, collectedVnd: 200_000, paymentCount: 1 },
    ]);
    const paidAt = new Date('2026-05-10T12:00:00.000Z');
    repository.findRecentPaid.mockResolvedValue([
      Object.assign(new PaymentEntity(), {
        id: 'p1',
        tenantId: tenantA,
        billId: 'b1',
        billReference: 'REF1',
        method: 'CASH',
        status: PaymentStatus.PAID,
        roundedTotal: 100_000,
        paidAmount: 100_000,
        paidAt,
        updatedAt: paidAt,
      }),
    ]);

    const result = await service.getRevenueReport(baseRequest);

    expect(result.summary.averagePaidPaymentVnd).toBe(150_000);
    expect(result.paymentMethodBreakdown).toHaveLength(2);
    expect(result.recentPayments[0]).toMatchObject({
      paymentId: 'p1',
      method: 'CASH',
      status: PaymentStatus.PAID,
      grossSalesVnd: 100_000,
    });
  });
});
