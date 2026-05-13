/**
 * ServiceRequest domain types — Phase 2A QRTable.
 * Customer-initiated requests phục vụ (call staff, request bill, general help).
 *
 * @see docs/phases/phase-2a-order-kafka.md §8 (state flow)
 * @see docs/specs/business-logic-step-2.4-spec.vi.md §17
 */

// ─── Enums ──────────────────────────────────────────
// Using const-object + type alias pattern (see order.types.ts header note).

export const ServiceRequestType = {
  /** Gọi nhân viên đến bàn */
  CALL_STAFF: 'CALL_STAFF',
  /** Yêu cầu thanh toán — trigger Bill OPEN → PENDING_PAYMENT */
  REQUEST_BILL: 'REQUEST_BILL',
  /** Hỗ trợ chung (vd: hỏi wifi, đổi bàn, etc.) */
  GENERAL_HELP: 'GENERAL_HELP',
} as const;
export type ServiceRequestType = (typeof ServiceRequestType)[keyof typeof ServiceRequestType];

export const ServiceRequestStatus = {
  /** Mới tạo, chưa có staff xác nhận */
  PENDING: 'PENDING',
  /** Staff đã xác nhận thấy notification */
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  /** Staff đã xử lý xong */
  RESOLVED: 'RESOLVED',
} as const;
export type ServiceRequestStatus = (typeof ServiceRequestStatus)[keyof typeof ServiceRequestStatus];

// ─── Entity types ───────────────────────────────────

export type ServiceRequest = {
  id: string;
  tenantId: string;
  tableId: string;
  sessionId: string;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  /** Customer message (vd: "thêm 1 ly nước") */
  note?: string;
  /** Audit — set khi PENDING → ACKNOWLEDGED */
  acknowledgedAt?: string;
  /** Audit — staff Keycloak sub */
  acknowledgedByUserId?: string;
  /** Audit — set khi ACKNOWLEDGED → RESOLVED */
  resolvedAt?: string;
  /** ISO 8601 */
  createdAt: string;
  /** ISO 8601 */
  updatedAt: string;
};

// ─── State transition matrix ────────────────────────

/**
 * Allowed ServiceRequest state transitions per Phase 2A spec §8.
 */
export const ALLOWED_SERVICE_REQUEST_TRANSITIONS: Record<ServiceRequestStatus, readonly ServiceRequestStatus[]> = {
  [ServiceRequestStatus.PENDING]: [ServiceRequestStatus.ACKNOWLEDGED],
  [ServiceRequestStatus.ACKNOWLEDGED]: [ServiceRequestStatus.RESOLVED],
  [ServiceRequestStatus.RESOLVED]: [],
} as const;
