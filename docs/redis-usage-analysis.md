# Redis Usage Analysis — Superseded Inventory

> **Status:** Facts in this file have been absorbed into [technical architecture](technical-architecture.md#11-canonical-redis-ownership). Keep this short transition record until Task 7 deletes it; do not extend it as a second canonical source.

## Verified Current Ownership

| Owner      | Key / purpose                                                               | TTL                                          | Invalidation or lifecycle                                                                                                                      |
| ---------- | --------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| BFF        | `menu:{tenantId}` public-menu cache through `RedisKey.menu.public()`        | 600 seconds                                  | Menu-item and category writes delete the key.                                                                                                  |
| Order      | `session:{tenantId}:{sessionId}`, `cart:{tenantId}:{sessionId}`             | 2 hours                                      | Refresh on relevant writes; close/payment and safe empty-session release delete both. Empty active sessions use the 30-minute idle-close rule. |
| Order      | `quota:{tenantId}:orders:{YYYY-MM-DD}`                                      | 48 hours                                     | Set only when increment creates the counter; the date uses `Asia/Ho_Chi_Minh`.                                                                 |
| SaaS       | `subscription:{tenantId}` current-subscription snapshot                     | 300 seconds                                  | `clearCurrent()` deletes the key.                                                                                                              |
| SaaS / BFF | `tenant:{tenantId}:suspended` tenant lifecycle edge flag                    | no expiry set                                | SaaS sets `1` when suspending and clears it when activating; BFF reads it in the customer lifecycle guard.                                     |
| Payment    | `oauth_state:{state}` SePay OAuth state                                     | 300 seconds                                  | Callback consumes it with `GET` then `DEL`; an in-memory fallback is for absent Redis only.                                                    |
| Kitchen    | `kds:{tenantId}:{station}` active queue and `kds:{tenantId}:*` ticket state | no blanket TTL for active queue/ticket state | Redis-only KDS storage; key builders live in `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`.                                         |

## Verified Kitchen Expirations

- Event/ticket dedupe: 14 days.
- Command dedupe: 24 hours.
- Dead-letter `order.confirmed`: 7 days.
- SLA claim: 30 seconds; SLA dedupe: 24 hours.
- Recovery rebuild lock: 120 seconds.

No current source defines a table-status Redis cache. Do not document `table:{tenantId}:{tableId}:status` as implemented.
