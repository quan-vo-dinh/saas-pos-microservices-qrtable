// ─── Common ─────────────────────────────────────────
export type { ApiResponse, ApiErrorResponse, PaginatedResponse, PaginationParams, SortParams } from './lib/api.types';

// ─── User & Auth ────────────────────────────────────
export type { UserProfile, UserSession } from './lib/user.types';

// ─── Menu ───────────────────────────────────────────
export type { Category, MenuItem, CategoryStatus, MenuItemStatus } from './lib/menu.types';

// ─── Table ──────────────────────────────────────────
export type { Area, RestaurantTable, TableStatus } from './lib/table.types';

// ─── Order ──────────────────────────────────────────
export type { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from './lib/order.types';

// ─── Public Menu (Customer PWA) ─────────────────────
export type { PublicMenuResponse, PublicMenuCategory, PublicMenuItem } from './lib/public-menu.types';

// ─── QR Validation ──────────────────────────────────
export type { ValidateQrRequest, ValidateQrResponse } from './lib/qr-validation.types';
