/**
 * Bill domain types — Phase 2A QRTable.
 * Bill aggregate roll-up từ nhiều Orders trong cùng Session.
 *
 * Phase 3 sẽ EXTEND file này (thêm paidAmount, change, refund references).
 * Phase 3: PaymentMethod includes CASH, VIETQR (future methods may extend further).
 *
 * @see docs/superpowers/specs/2026-04-19-step-2.3-shared-types-design.md
 */

// ─── Enums ──────────────────────────────────────────
// Using const-object + type alias pattern (see order.types.ts header note).

export const BillStatus = {
  /** Session active, accepting orders */
  OPEN: 'OPEN',
  /** Customer triggered REQUEST_BILL, chờ staff process payment */
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  /** Payment confirmed (Phase 3 sẽ trigger transition này) */
  PAID: 'PAID',
} as const;
export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  VIETQR: 'VIETQR',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

// ─── Entity types ───────────────────────────────────

export type Bill = {
  id: string;
  tenantId: string;
  sessionId: string;
  /** Aggregate references — bill tổng hợp từ nhiều orders trong session */
  orderIds: string[];
  /** VND integer */
  subtotal: number;
  /** VND integer = subtotal + roundingAmount */
  total: number;
  /** VND integer (positive or negative) — VND rounding rule */
  roundingAmount: number;
  /** Set khi staff process payment (Phase 3) */
  paymentMethod?: PaymentMethod;
  status: BillStatus;
  /** Audit — set khi OPEN → PENDING_PAYMENT */
  closedAt?: string;
  /** Audit — set khi PENDING_PAYMENT → PAID (Phase 3) */
  paidAt?: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
};

// ─── State transition matrix ────────────────────────

/**
 * Allowed Bill state transitions per Phase 2A spec.
 *
 * PENDING_PAYMENT → OPEN allowed: customer triggered REQUEST_BILL rồi đổi ý
 * (vd muốn order thêm món) — staff revert bill về OPEN.
 */
export const ALLOWED_BILL_TRANSITIONS: Record<BillStatus, readonly BillStatus[]> = {
  [BillStatus.OPEN]: [BillStatus.PENDING_PAYMENT],
  [BillStatus.PENDING_PAYMENT]: [BillStatus.PAID, BillStatus.OPEN],
  [BillStatus.PAID]: [],
} as const;
