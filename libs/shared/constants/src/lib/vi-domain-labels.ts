/**
 * Nhãn hiển thị tiếng Việt cho các giá trị enum domain (Phase 2A).
 * Wire/API/DB vẫn dùng chuỗi enum tiếng Anh; UI chỉ map qua các hàm dưới đây.
 */
import type { CategoryStatus, MenuItemStatus, TableStatus } from '@einvoice/types';
import type { AppRole } from './roles';
import {
  BillStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  ServiceRequestStatus,
  ServiceRequestType,
  SessionStatus,
} from '@einvoice/types';

const ORDER_STATUS_VI = {
  [OrderStatus.DRAFT]: 'Nháp',
  [OrderStatus.PENDING]: 'Chờ xác nhận',
  [OrderStatus.PROCESSING]: 'Đang chế biến',
  [OrderStatus.READY]: 'Sẵn sàng ra món',
  [OrderStatus.SERVED]: 'Đã phục vụ',
  [OrderStatus.COMPLETED]: 'Hoàn tất',
  [OrderStatus.CANCELED]: 'Đã huỷ',
} as const satisfies Record<OrderStatus, string>;

const ORDER_ITEM_STATUS_VI = {
  [OrderItemStatus.PROCESSING]: 'Đang làm',
  [OrderItemStatus.READY]: 'Chờ bưng',
  [OrderItemStatus.SERVED]: 'Đã phục vụ',
  [OrderItemStatus.CANCELED]: 'Đã huỷ',
} as const satisfies Record<OrderItemStatus, string>;

const TABLE_STATUS_VI = {
  available: 'Trống',
  occupied: 'Có khách',
  billing: 'Thanh toán',
  cleaning: 'Đang dọn',
} as const satisfies Record<TableStatus, string>;

const CATEGORY_STATUS_VI = {
  active: 'Đang hiển thị',
  inactive: 'Ẩn',
} as const satisfies Record<CategoryStatus, string>;

const MENU_ITEM_STATUS_VI = {
  available: 'Còn hàng',
  out_of_stock: 'Hết hàng',
} as const satisfies Record<MenuItemStatus, string>;

const BILL_STATUS_VI = {
  [BillStatus.OPEN]: 'Mở',
  [BillStatus.PENDING_PAYMENT]: 'Chờ thanh toán',
  [BillStatus.PAID]: 'Đã thanh toán',
} as const satisfies Record<BillStatus, string>;

const SERVICE_REQUEST_STATUS_VI = {
  [ServiceRequestStatus.PENDING]: 'Chờ nhận',
  [ServiceRequestStatus.ACKNOWLEDGED]: 'Đã nhận',
  [ServiceRequestStatus.RESOLVED]: 'Đã xong',
} as const satisfies Record<ServiceRequestStatus, string>;

const SERVICE_REQUEST_TYPE_VI = {
  [ServiceRequestType.CALL_STAFF]: 'Gọi nhân viên',
  [ServiceRequestType.REQUEST_BILL]: 'Yêu cầu thanh toán',
  [ServiceRequestType.GENERAL_HELP]: 'Hỗ trợ chung',
} as const satisfies Record<ServiceRequestType, string>;

const SESSION_STATUS_VI = {
  [SessionStatus.ACTIVE]: 'Đang hoạt động',
  [SessionStatus.CLOSED]: 'Đã đóng',
} as const satisfies Record<SessionStatus, string>;

const PAYMENT_METHOD_VI = {
  [PaymentMethod.CASH]: 'Tiền mặt',
  [PaymentMethod.VIETQR]: 'VietQR',
} as const satisfies Record<PaymentMethod, string>;

export function orderStatusVi(status: OrderStatus): string {
  return ORDER_STATUS_VI[status];
}

export function orderItemStatusVi(status: OrderItemStatus): string {
  return ORDER_ITEM_STATUS_VI[status];
}

export function tableStatusVi(status: TableStatus): string {
  return TABLE_STATUS_VI[status];
}

export function categoryStatusVi(status: CategoryStatus | string): string {
  return displayDomainLabel(CATEGORY_STATUS_VI, status);
}

export function menuItemStatusVi(status: MenuItemStatus | string): string {
  return displayDomainLabel(MENU_ITEM_STATUS_VI, status);
}

export function billStatusVi(status: BillStatus): string {
  return BILL_STATUS_VI[status];
}

export function serviceRequestStatusVi(status: ServiceRequestStatus): string {
  return SERVICE_REQUEST_STATUS_VI[status];
}

export function serviceRequestTypeVi(type: ServiceRequestType): string {
  return SERVICE_REQUEST_TYPE_VI[type];
}

export function sessionStatusVi(status: SessionStatus): string {
  return SESSION_STATUS_VI[status];
}

export function paymentMethodVi(method: PaymentMethod): string {
  return PAYMENT_METHOD_VI[method];
}

/** Phase 4B — SaaS / subscription display labels (wire values stay English enums). */
export type BillingPeriod = 'MONTHLY' | 'YEARLY';
export type InvoiceStatusLabel = 'PENDING' | 'PAID' | 'UNDERPAID' | 'EXPIRED' | 'CANCELED';
export type TenantStatusLabel = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type SubscriptionStatusLabel = 'ACTIVE' | 'EXPIRED' | 'SUPERSEDED' | 'CANCELED' | 'PENDING_PAYMENT';
export type TenantTypeLabel = 'RESTAURANT' | 'CAFE' | 'FOOD_COURT' | 'PUB' | 'OTHER';
export type PaymentConnectionStatusLabel = 'NOT_CONNECTED' | 'CONNECTED' | 'TOKEN_EXPIRED' | 'REVOKED' | 'ERROR';

const BILLING_PERIOD_VI = {
  MONTHLY: 'Hàng tháng',
  YEARLY: 'Hàng năm',
} as const satisfies Record<BillingPeriod, string>;

const INVOICE_STATUS_VI = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  UNDERPAID: 'Thiếu tiền',
  EXPIRED: 'Hết hạn',
  CANCELED: 'Đã huỷ',
} as const satisfies Record<InvoiceStatusLabel, string>;

const TENANT_STATUS_VI = {
  ACTIVE: 'Hoạt động',
  SUSPENDED: 'Tạm khóa',
  CLOSED: 'Đã đóng',
} as const satisfies Record<TenantStatusLabel, string>;

const SUBSCRIPTION_STATUS_VI = {
  ACTIVE: 'Đang hiệu lực',
  EXPIRED: 'Hết hạn',
  SUPERSEDED: 'Đã thay thế',
  CANCELED: 'Đã huỷ',
  PENDING_PAYMENT: 'Chờ thanh toán',
} as const satisfies Record<SubscriptionStatusLabel, string>;

const TENANT_TYPE_VI = {
  RESTAURANT: 'Nhà hàng',
  CAFE: 'Cà phê',
  FOOD_COURT: 'Khu ẩm thực',
  PUB: 'Quán bar',
  OTHER: 'Khác',
} as const satisfies Record<TenantTypeLabel, string>;

const PAYMENT_CONNECTION_STATUS_VI = {
  NOT_CONNECTED: 'Chưa kết nối',
  CONNECTED: 'Đã kết nối',
  TOKEN_EXPIRED: 'Token hết hạn',
  REVOKED: 'Đã thu hồi',
  ERROR: 'Lỗi',
} as const satisfies Record<PaymentConnectionStatusLabel, string>;

const PLAN_FEATURE_VI: Record<string, string> = {
  basic_pos: 'POS cơ bản',
  analytics_basic: 'Báo cáo cơ bản',
  analytics_advanced: 'Báo cáo nâng cao',
  priority_support: 'Hỗ trợ ưu tiên',
  kds: 'Màn hình bếp (KDS)',
  multi_branch: 'Nhiều chi nhánh',
  vietqr: 'Thanh toán VietQR',
  staff_roles: 'Phân quyền nhân sự',
};

const TENANT_LIFECYCLE_REASON_VI: Record<string, string> = {
  SUBSCRIPTION_EXPIRED: 'Gói đăng ký đã hết hạn',
  'subscription expired': 'Gói đăng ký đã hết hạn',
  expired: 'Gói đã hết hạn',
  CLOSED_BY_ADMIN: 'Đóng bởi quản trị viên',
  TENANT_ONBOARDING_FAILED: 'Onboard thất bại',
};

function humanizeToken(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/** Map wire enum → Vietnamese label; unknown values get a readable fallback (never raw UPPER_SNAKE). */
export function displayDomainLabel(map: Record<string, string>, value: string | null | undefined): string {
  if (!value?.trim()) {
    return '—';
  }
  const normalized = value.trim();
  const direct = map[normalized] ?? map[normalized.toUpperCase()] ?? map[normalized.toLowerCase()];
  if (direct) {
    return direct;
  }
  return humanizeToken(normalized);
}

export function billingPeriodVi(period: BillingPeriod | string): string {
  return displayDomainLabel(BILLING_PERIOD_VI, period);
}

export function invoiceStatusVi(status: InvoiceStatusLabel | string): string {
  return displayDomainLabel(INVOICE_STATUS_VI, status);
}

export function tenantStatusVi(status: TenantStatusLabel | string): string {
  return displayDomainLabel(TENANT_STATUS_VI, status);
}

export function subscriptionStatusVi(status: SubscriptionStatusLabel | string): string {
  return displayDomainLabel(SUBSCRIPTION_STATUS_VI, status);
}

export function tenantTypeVi(type: TenantTypeLabel | string): string {
  return displayDomainLabel(TENANT_TYPE_VI, type);
}

export function paymentConnectionStatusVi(status: PaymentConnectionStatusLabel | string): string {
  return displayDomainLabel(PAYMENT_CONNECTION_STATUS_VI, status);
}

export function planFeatureVi(code: string): string {
  return displayDomainLabel(PLAN_FEATURE_VI, code);
}

export function tenantLifecycleReasonVi(reason: string | null | undefined): string {
  if (!reason?.trim()) {
    return '';
  }
  return displayDomainLabel(TENANT_LIFECYCLE_REASON_VI, reason);
}

export function booleanEnabledVi(enabled: boolean): string {
  return enabled ? 'Bật' : 'Tắt';
}

/** Phase 4C — staff role/status display labels (wire values stay English enums). */
export type StaffRoleLabel = Extract<AppRole, 'MANAGER' | 'WAITER' | 'CHEF' | 'BARISTA'>;
export type StaffStatusLabel = 'ACTIVE' | 'DISABLED';

const STAFF_ROLE_VI = {
  MANAGER: 'Quản lý ca',
  WAITER: 'Phục vụ',
  CHEF: 'Bếp',
  BARISTA: 'Quầy bar',
} as const satisfies Record<StaffRoleLabel, string>;

const STAFF_STATUS_VI = {
  ACTIVE: 'Đang hoạt động',
  DISABLED: 'Đã vô hiệu hóa',
} as const satisfies Record<StaffStatusLabel, string>;

export function staffRoleVi(role: StaffRoleLabel | string): string {
  return displayDomainLabel(STAFF_ROLE_VI, role);
}

export function staffStatusVi(status: StaffStatusLabel | string): string {
  return displayDomainLabel(STAFF_STATUS_VI, status);
}
