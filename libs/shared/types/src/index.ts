// ─── Common ─────────────────────────────────────────
export type { ApiResponse, ApiErrorResponse, PaginatedResponse, PaginationParams, SortParams } from './lib/api.types';

// ─── User & Auth ────────────────────────────────────
export type { UserProfile, UserSession } from './lib/user.types';

// ─── Menu ───────────────────────────────────────────
export type { Category, MenuItem, CategoryStatus, MenuItemStatus } from './lib/menu.types';

// ─── Table ──────────────────────────────────────────
export type { Area, RestaurantTable, TableStatus } from './lib/table.types';

// ─── Order (Phase 2A) ───────────────────────────────
export type { Order, OrderItem } from './lib/order.types';
export { OrderStatus, OrderItemStatus, ALLOWED_ORDER_TRANSITIONS } from './lib/order.types';

// ─── Bill (Phase 2A) ────────────────────────────────
export type { Bill } from './lib/bill.types';
export { BillStatus, PaymentMethod, ALLOWED_BILL_TRANSITIONS } from './lib/bill.types';

// ─── Session & Cart (Phase 2A) ──────────────────────
export type { Session, CartItem } from './lib/session.types';
export { SessionStatus } from './lib/session.types';

// ─── Service Request (Phase 2A) ─────────────────────
export type { ServiceRequest } from './lib/service-request.types';
export {
  ServiceRequestType,
  ServiceRequestStatus,
  ALLOWED_SERVICE_REQUEST_TRANSITIONS,
} from './lib/service-request.types';

// ─── Realtime Events (Phase 2A) ─────────────────────
export type {
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  ServiceRequestedEvent,
  OrderConfirmedEvent,
  KDSTicket,
} from './lib/realtime-events.types';

// ─── Public Menu (Customer PWA) ─────────────────────
export type { PublicMenuResponse, PublicMenuCategory, PublicMenuItem } from './lib/public-menu.types';

// ─── QR Validation ──────────────────────────────────
export type { ValidateQrRequest, ValidateQrResponse } from './lib/qr-validation.types';
