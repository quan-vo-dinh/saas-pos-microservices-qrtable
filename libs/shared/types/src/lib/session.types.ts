/**
 * Session + Cart domain types — Phase 2A QRTable.
 *
 * Session scope: customer scan QR → session bắt đầu, accumulates orders + cart.
 * Cart scope: per-session ephemeral state (Redis Hash với optimistic version).
 *
 * @see docs/phases/phase-2a-order-kafka.md §8 (auto-close rules)
 * @see docs/specs/business-logic-step-2.4-spec.vi.md §4
 */

import type { PreparationStation } from './menu.types';

// ─── Enums ──────────────────────────────────────────
// Using const-object + type alias pattern (see order.types.ts header note).

export const SessionStatus = {
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED',
  // Note: IDLE là internal Redis TTL state, KHÔNG expose enum.
  // Auto-close logic: nếu lastActivity > 30 min AND orderCount == 0 → CLOSED.
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

// ─── Entity types ───────────────────────────────────

export type Session = {
  /** sessionId (UUID generated khi customer scan QR) */
  id: string;
  tenantId: string;
  tableId: string;
  /** Denormalized for display */
  tableName: string;
  status: SessionStatus;
  /** ISO 8601 — khi customer scan QR */
  startedAt: string;
  /** ISO 8601 — refresh mỗi action customer/staff trong session */
  lastActivity: string;
  /** Audit — set khi → CLOSED */
  closedAt?: string;
  /** Denormalized — tránh JOIN khi check auto-close rule (orderCount == 0?) */
  orderCount: number;
  /** Phase 4B — SaaS tenant lifecycle for customer PWA (BFF-enriched on join). */
  tenantStatus?: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  tenantStatusReason?: string | null;
};

export type CartItem = {
  menuItemId: string;
  /** Denormalized for display */
  menuItemName: string;
  quantity: number;
  /** VND integer */
  unitPrice: number;
  note?: string;
  /**
   * Optimistic lock version for Redis Hash conflicts.
   * Incrementing integer; client phải send matching version trước khi update.
   * Conflict → BE trả lỗi → client refresh + retry.
   */
  version: number;
};

/** Step 2.4 — cart line with stable id + line version for Redis cart (spec §15) */
export type CartLine = {
  cartLineId: string;
  menuItemId: string;
  menuItemName: string;
  menuItemImageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  note?: string;
  station?: PreparationStation;
  lineVersion: number;
};

export type CartSnapshot = {
  tenantId: string;
  sessionId: string;
  cartVersion: number;
  status: 'ACTIVE' | 'LOCKED';
  updatedAt: string;
  items: CartLine[];
};
