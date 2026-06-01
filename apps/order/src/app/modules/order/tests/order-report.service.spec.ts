import { OrderReportService } from '../services/order-report.service';
import { BillRepository } from '../repositories/bill.repository';
import { OrderItemRepository } from '../repositories/order-item.repository';
import { OrderRepository } from '../repositories/order.repository';

describe('OrderReportService', () => {
  let orderRepository: jest.Mocked<Pick<OrderRepository, 'aggregateOrderSummary' | 'aggregateOrderSeries'>>;
  let billRepository: jest.Mocked<
    Pick<BillRepository, 'aggregateBillStatusBreakdown' | 'aggregatePaidBillSummary' | 'aggregatePaidBillSeries'>
  >;
  let orderItemRepository: jest.Mocked<Pick<OrderItemRepository, 'aggregateTopItems'>>;
  let service: OrderReportService;

  const request = {
    tenantId: 'tenant-1',
    timezone: 'Asia/Ho_Chi_Minh',
    grain: 'day' as const,
    from: '2026-05-01T00:00:00.000Z',
    to: '2026-05-31T23:59:59.999Z',
    limit: 10,
  };

  beforeEach(() => {
    orderRepository = {
      aggregateOrderSummary: jest.fn(),
      aggregateOrderSeries: jest.fn(),
    };
    billRepository = {
      aggregateBillStatusBreakdown: jest.fn(),
      aggregatePaidBillSummary: jest.fn(),
      aggregatePaidBillSeries: jest.fn(),
    };
    orderItemRepository = { aggregateTopItems: jest.fn() };
    service = new OrderReportService(
      orderRepository as unknown as OrderRepository,
      billRepository as unknown as BillRepository,
      orderItemRepository as unknown as OrderItemRepository,
    );
  });

  it('returns zero summary when aggregates are empty', async () => {
    orderRepository.aggregateOrderSummary.mockResolvedValue(null);
    orderRepository.aggregateOrderSeries.mockResolvedValue([]);
    billRepository.aggregatePaidBillSeries.mockResolvedValue([]);
    billRepository.aggregateBillStatusBreakdown.mockResolvedValue([]);
    billRepository.aggregatePaidBillSummary.mockResolvedValue({
      paidBillCount: 0,
      paidBillTotalVnd: 0,
      pendingBillCount: 0,
    });
    orderItemRepository.aggregateTopItems.mockResolvedValue([]);

    const result = await service.getOrderReport(request);

    expect(result.summary.averagePaidBillVnd).toBe(0);
    expect(result.topItems).toEqual([]);
    expect(result.orderSeries).toEqual([]);
  });

  it('computes average paid bill without NaN when no paid bills', async () => {
    orderRepository.aggregateOrderSummary.mockResolvedValue({
      orderCount: 5,
      completedOrderCount: 2,
      cancelledOrderCount: 1,
    });
    orderRepository.aggregateOrderSeries.mockResolvedValue([]);
    billRepository.aggregatePaidBillSeries.mockResolvedValue([]);
    billRepository.aggregateBillStatusBreakdown.mockResolvedValue([]);
    billRepository.aggregatePaidBillSummary.mockResolvedValue({
      paidBillCount: 0,
      paidBillTotalVnd: 0,
      pendingBillCount: 3,
    });
    orderItemRepository.aggregateTopItems.mockResolvedValue([]);

    const result = await service.getOrderReport(request);

    expect(result.summary.pendingBillCount).toBe(3);
    expect(Number.isNaN(result.summary.averagePaidBillVnd)).toBe(false);
  });
});
