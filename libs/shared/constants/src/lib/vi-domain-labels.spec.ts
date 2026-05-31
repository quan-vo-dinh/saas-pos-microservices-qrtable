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
  displayDomainLabel,
  invoiceStatusVi,
  paymentConnectionStatusVi,
  planFeatureVi,
  subscriptionStatusVi,
  tenantLifecycleReasonVi,
  staffRoleVi,
  staffStatusVi,
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

  it('maps subscription and payment connection statuses', () => {
    expect(subscriptionStatusVi('ACTIVE')).toBe('Đang hiệu lực');
    expect(paymentConnectionStatusVi('CONNECTED')).toBe('Đã kết nối');
    expect(paymentConnectionStatusVi('CONNECTED')).not.toMatch(/^CONNECTED$/);
  });

  it('humanizes unknown enum tokens instead of echoing wire values', () => {
    expect(displayDomainLabel({ FOO_BAR: 'Nhãn' }, 'UNKNOWN_CODE')).toBe('Unknown Code');
  });

  it('maps plan features and tenant lifecycle reasons', () => {
    expect(planFeatureVi('basic_pos')).toBe('POS cơ bản');
    expect(planFeatureVi('priority_support')).toBe('Hỗ trợ ưu tiên');
    expect(tenantLifecycleReasonVi('SUBSCRIPTION_EXPIRED')).toBe('Gói đăng ký đã hết hạn');
  });
});

describe('vi-domain-labels — staff', () => {
  it('maps staff roles and statuses to Vietnamese', () => {
    expect(staffRoleVi('MANAGER')).toBe('Quản lý ca');
    expect(staffRoleVi('WAITER')).toBe('Phục vụ');
    expect(staffRoleVi('MANAGER')).not.toMatch(/^MANAGER$/);
    expect(staffStatusVi('ACTIVE')).toBe('Đang hoạt động');
    expect(staffStatusVi('DISABLED')).toBe('Đã vô hiệu hóa');
    expect(staffStatusVi('ACTIVE')).not.toMatch(/^ACTIVE$/);
  });
});
