/**
 * Session + cart Redis TTL / idle rules — Step 2.4 spec §4.1–4.2.
 */
export const SESSION_POLICY = {
  /** Redis key TTL (spec: 2 hours) */
  TTL_MS: 2 * 60 * 60 * 1000,
  /** Idle auto-close when orderCount === 0 (spec: 30 minutes) */
  IDLE_CLOSE_MS: 30 * 60 * 1000,
} as const;
