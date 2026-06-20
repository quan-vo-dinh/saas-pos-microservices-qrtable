// ─── Common ─────────────────────────────────────────
export type { ApiResponse, ApiErrorResponse, PaginatedResponse, PaginationParams, SortParams } from './lib/api.types';

// ─── User & Auth ────────────────────────────────────
export type { UserProfile, UserSession } from './lib/user.types';

// ─── Menu ───────────────────────────────────────────
export {
  PreparationStation,
  type Category,
  type MenuItem,
  type CategoryStatus,
  type MenuItemStatus,
  type StockMutationResult,
} from './lib/menu.types';

// ─── Table ──────────────────────────────────────────
export type { Area, RestaurantTable, TableStatus } from './lib/table.types';

// ─── Order (Phase 2A) ───────────────────────────────
export type { Order, OrderItem } from './lib/order.types';
export { OrderStatus, OrderItemStatus, ALLOWED_ORDER_TRANSITIONS } from './lib/order.types';

// ─── Bill (Phase 2A) ────────────────────────────────
export type { Bill } from './lib/bill.types';
export { BillStatus, PaymentMethod, ALLOWED_BILL_TRANSITIONS } from './lib/bill.types';

// ─── Payment (Phase 3) ─────────────────────────────
export type { PaymentCompletedEvent } from './lib/payment.types';
export { PaymentActorType, PaymentAuditAction, PaymentStatus } from './lib/payment.types';
export type {
  PaymentActorType as PaymentActorTypeValue,
  PaymentAuditAction as PaymentAuditActionValue,
  PaymentStatus as PaymentStatusValue,
} from './lib/payment.types';

// ─── Session & Cart (Phase 2A) ──────────────────────
export type { Session, CartItem, CartLine, CartSnapshot } from './lib/session.types';
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
  CartUpdatedEvent,
  BillRequestedEvent,
  TableTransferredEvent,
  PaymentCompletedRealtimeEvent,
  OrderConfirmedEvent,
  OrderConfirmedEventItem,
  KDSTicket,
} from './lib/realtime-events.types';

// ─── KDS (Step 2.6) ────────────────────────────────
export type {
  KdsActiveOrderSnapshot,
  KdsQueueChangedEvent,
  KdsQueueChangedReason,
  KdsQueueSnapshot,
  KdsTicketDto,
  KdsTicketItemDto,
  KdsWarningLevel,
  KitchenItemReadyEvent,
  KitchenSlaWarningEvent,
} from './lib/kds.types';
export { KdsTicketItemStatus, KdsTicketStatus } from './lib/kds.types';

// ─── Public Menu (Customer PWA) ─────────────────────
export type { PublicMenuResponse, PublicMenuCategory, PublicMenuItem } from './lib/public-menu.types';

// ─── QR Validation ──────────────────────────────────
export type { ValidateQrRequest, ValidateQrResponse } from './lib/qr-validation.types';
