import {
  BillStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  ServiceRequestStatus,
  ServiceRequestType,
  SessionStatus,
} from '@einvoice/types';
import type { TableStatus } from '@einvoice/types';
import {
  BILL_STATUSES,
  ORDER_ITEM_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_TYPES,
  SESSION_STATUSES,
  TABLE_STATUSES,
} from './status';
import {
  billStatusVi,
  orderItemStatusVi,
  orderStatusVi,
  paymentMethodVi,
  serviceRequestStatusVi,
  serviceRequestTypeVi,
  sessionStatusVi,
  tableStatusVi,
  billingPeriodVi,
  invoiceStatusVi,
} from './vi-domain-labels';

describe('vi-domain-labels', () => {
  it('covers every OrderStatus with a non-empty Vietnamese label', () => {
    for (const s of ORDER_STATUSES) {
      expect(orderStatusVi(s).trim().length).toBeGreaterThan(0);
    }
  });

  it('covers every OrderItemStatus', () => {
    for (const s of ORDER_ITEM_STATUSES) {
      expect(orderItemStatusVi(s).trim().length).toBeGreaterThan(0);
    }
  });

  it('covers every TableStatus', () => {
    for (const s of TABLE_STATUSES) {
      expect(tableStatusVi(s as TableStatus).trim().length).toBeGreaterThan(0);
    }
  });

  it('covers every BillStatus', () => {
    for (const s of BILL_STATUSES) {
      expect(billStatusVi(s).trim().length).toBeGreaterThan(0);
    }
  });

  it('covers every ServiceRequestStatus', () => {
    for (const s of SERVICE_REQUEST_STATUSES) {
      expect(serviceRequestStatusVi(s).trim().length).toBeGreaterThan(0);
    }
  });

  it('covers every ServiceRequestType', () => {
    for (const t of SERVICE_REQUEST_TYPES) {
      expect(serviceRequestTypeVi(t).trim().length).toBeGreaterThan(0);
    }
  });

  it('covers every SessionStatus', () => {
    for (const s of SESSION_STATUSES) {
      expect(sessionStatusVi(s).trim().length).toBeGreaterThan(0);
    }
  });

  it('covers every PaymentMethod', () => {
    for (const m of PAYMENT_METHODS) {
      expect(paymentMethodVi(m).trim().length).toBeGreaterThan(0);
    }
  });

  it('does not echo raw enum token for a representative order status', () => {
    expect(orderStatusVi(OrderStatus.PENDING)).not.toMatch(/^PENDING$/);
  });
});

describe('vi-domain-labels — SaaS', () => {
  it('maps billing period and invoice status to Vietnamese', () => {
    expect(billingPeriodVi('MONTHLY')).toBe('Hàng tháng');
    expect(invoiceStatusVi('PENDING')).toBe('Chờ thanh toán');
    expect(invoiceStatusVi('PENDING')).not.toMatch(/^PENDING$/);
  });
});
