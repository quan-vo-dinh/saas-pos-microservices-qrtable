# Phase 5 P0 — SaaS Quota Enforcement Spec

> **Status:** Canonical mini-spec for Phase 5 before Step 5.2.
> **Rule ID:** `P0-SAAS-FEATURE-GATING-QUOTAS`.
> **Scope:** Phase 4B `max_tables`, `max_staff`, and `max_orders_per_day` enforcement.

---

## 1. Problem

Phase 4B defines pricing plans with resource quotas, but Phase 5 inventory found only data shape, count endpoints, cache summaries, and active-subscription checks. It did not find quota-blocking behavior for creating the 11th table, 6th staff account, or 101st daily order on the FREE plan.

Phase 5 tests must not mark quota behavior as covered until enforcement exists at both the edge and the resource owner boundary.

---

## 2. Canonical Limits

Pricing plan quota fields:

- `max_tables`
- `max_staff`
- `max_orders_per_day`

Seeded plans must use explicit values. For the thesis/demo contract:

| Plan      | `max_tables` | `max_staff` | `max_orders_per_day` |
| --------- | ------------ | ----------- | -------------------- |
| `FREE`    | 10           | 5           | 100                  |
| `BASIC`   | 50           | 15          | 1000                 |
| `PREMIUM` | -1           | -1          | -1                   |

Quota value semantics:

- `-1` means unlimited.
- `0` means zero allowed and should only appear intentionally.
- Missing subscription, inactive subscription, or unavailable quota source blocks quota-consuming writes.

---

## 3. Decision

1. SaaS Service owns pricing plans, current subscription, and subscription summary cache.
2. BFF `TenantPlanGuard` or route-level edge logic may block early for UX and fast feedback.
3. Edge checks are not sufficient. The resource-owning service must enforce the quota before committing the write:
   - Catalog owns table creation and `max_tables`.
   - User-Access owns staff creation/invite/upsert and `max_staff`.
   - Order owns order creation or submit flow and `max_orders_per_day`.
4. Owner checks must use the owner service count as the source of truth:
   - Catalog counts active tenant tables.
   - User-Access counts active tenant users/staff covered by the quota.
   - Order counts successful orders for the tenant's `Asia/Ho_Chi_Minh` day.
5. Quota-consuming writes that exceed the limit fail with a stable application error:

   ```json
   {
     "code": "TENANT_PLAN_LIMIT_EXCEEDED",
     "details": {
       "limitType": "max_tables | max_staff | max_orders_per_day",
       "limit": 10,
       "current": 10,
       "upgradeUrl": "/dashboard/subscription"
     }
   }
   ```

6. `SUSPENDED` or `CLOSED` tenants remain blocked for new operational writes even if quota counts are below limit.
7. Reads, historical views, and payment of already-created `PENDING_PAYMENT` bills remain allowed according to the tenant lifecycle contract.

---

## 4. Owner-Specific Behavior

### 4.1 Catalog `max_tables`

- Creating a table checks current active table count before insert.
- If current count is equal to or greater than `max_tables`, creation is rejected.
- Upgrading the tenant plan allows creation immediately after subscription summary cache refresh or invalidation.
- Deleting or deactivating a table reduces the active count used by future checks.

### 4.2 User-Access `max_staff`

- Creating or inviting a tenant staff user checks current active tenant staff count before creation.
- Disabled users do not count as active staff.
- Owner onboarding must still create the initial owner as part of the onboarding contract; follow-up staff creation is quota-gated.
- SUPER_ADMIN platform users do not consume tenant staff quota unless explicitly assigned to that tenant as tenant staff.

### 4.3 Order `max_orders_per_day`

- Order quota day boundary uses `Asia/Ho_Chi_Minh`.
- The quota is consumed only by successful order creation or submit, not by cart edits or failed attempts.
- The enforcement must be race-safe enough that concurrent submissions cannot persist more successful orders than the plan allows.
- Idempotent retry with the same idempotency key must not consume quota twice.

---

## 5. Test Contract

Required fast or integration tests:

- BFF or guard test: inactive subscription blocks quota-consuming writes.
- Catalog service test: FREE tenant with 10 active tables cannot create the 11th table.
- Catalog service test: `-1` table quota allows creation above normal limits.
- User-Access service test: FREE tenant with 5 active staff cannot create or invite the 6th active staff user.
- Order service test: FREE tenant with 100 successful orders for the HCM day cannot create the 101st order.
- Order service test: HCM day boundary uses `Asia/Ho_Chi_Minh`.
- Resource owner backup test: direct TCP/service call is blocked even if BFF guard is bypassed.
- Cache refresh test: plan upgrade from FREE to PREMIUM allows the previously blocked write after summary refresh or invalidation.

Required negative tests:

- Missing subscription or missing quota summary blocks quota-consuming writes.
- Suspended tenant remains blocked even below quota.
- Failed order creation does not consume daily order quota.
- Idempotent order retry does not double-count.

---

## 6. Out of Scope

- Overage billing.
- Proration and downgrade remediation UI.
- Self-service signup wizard.
- Post-thesis quota analytics dashboards.

---

## 7. Acceptance Criteria

- `P0-SAAS-FEATURE-GATING-QUOTAS` can move from `implementation-gap` to `covered` only when table, staff, and daily order quotas have owner-service enforcement plus tests.
- A BFF guard-only implementation is partial coverage, not acceptance.
- Seeded pricing plans must not rely on entity defaults for quota values.
