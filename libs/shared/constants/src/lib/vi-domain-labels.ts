/**
 * Nhãn hiển thị tiếng Việt cho các giá trị enum domain (Phase 2A).
 * Wire/API/DB vẫn dùng chuỗi enum tiếng Anh; UI chỉ map qua các hàm dưới đây.
 */
import type { TableStatus } from '@einvoice/types';
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
