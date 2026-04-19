import type { TableStatus, CategoryStatus, MenuItemStatus } from '@einvoice/types';
import {
  OrderStatus,
  OrderItemStatus,
  BillStatus,
  SessionStatus,
  ServiceRequestType,
  ServiceRequestStatus,
  PaymentMethod,
} from '@einvoice/types';

// ─── Out-of-scope (kept as-is — table/menu/category are string unions) ───
export const TABLE_STATUSES: readonly TableStatus[] = ['available', 'occupied', 'billing', 'cleaning'];
export const CATEGORY_STATUSES: readonly CategoryStatus[] = ['active', 'inactive'];
export const MENU_ITEM_STATUSES: readonly MenuItemStatus[] = ['available', 'out_of_stock'];

// ─── Phase 2A — derive từ enum để always-in-sync ─────
export const ORDER_STATUSES = Object.values(OrderStatus);
export const ORDER_ITEM_STATUSES = Object.values(OrderItemStatus);
export const BILL_STATUSES = Object.values(BillStatus);
export const SESSION_STATUSES = Object.values(SessionStatus);
export const SERVICE_REQUEST_TYPES = Object.values(ServiceRequestType);
export const SERVICE_REQUEST_STATUSES = Object.values(ServiceRequestStatus);
export const PAYMENT_METHODS = Object.values(PaymentMethod);

// REMOVED: PAYMENT_STATUSES (PaymentStatus enum loại bỏ — replaced by BillStatus)
