# IMPLEMENTATION PLAN — QRTable SaaS POS

> **Frontend & UI/UX principles:** Maximize use of Shadcn UI ecosystem (Lucide icons, React Hook Form, Zod, Radix UI, Recharts). Follow the conventions in `.github/instructions/`.
>
> **Backend Principle:** Pragmatic Layered Architecture (Controller → service → Repository). Multi-tenant isolation using `tenant_id`. Guard chain: **UserGuard** (staff/JWT) or **SessionGuard** (guest) → **TenantGuard** → **PermissionGuard** (see §8.2 technical-architecture).
>
> **Reference:** [Technical Architecture](technical-architecture.md) | [Business Logic](business-logic.md) | [Auth Reference](references/auth-system-reference.md)

---

## Agreed Architectural Decisions

| #   | Decision           | Summary                                                                                                                                                                                                                                                                                                                                                                                          | Reference                             |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| 1   | Kafka 4P+1AP       | Current Kafka topics: order.confirmed, order.status_changed, payment.completed, kitchen.sla_warning, tenant.created. UI-only events use BFF Direct, Redis internal hints, or socket emits after commit; `order.status_changed` is the durable Order outbox exception, not the immediate UI push path.                                                                                            | [§7.2-7.4](technical-architecture.md) |
| 2   | Bills Ownership    | Bills belong to the Order service. Payment only receives billId.                                                                                                                                                                                                                                                                                                                                 | [§6.2.5](technical-architecture.md)   |
| 3   | Cloudinary Upload  | CloudinaryModule lives in `libs/providers/cloudinary/` and stores assets under `qrtable/{tenant_id}/{folder}/`. Use `libs/providers/` instead of `libs/configuration/` because Cloudinary contains business behavior such as upload, validation, and URL generation, not only configuration. `libs/providers/` is the category for external service integrations such as Cloudinary and Payment. | [§6.2.4](technical-architecture.md)   |
| 4   | Simplified Outbox  | outbox_events table + cron poll. Full CDC (Debezium) = post-thesis                                                                                                                                                                                                                                                                                                                               | [§12](technical-architecture.md)      |
| 5   | BFF Direct Pattern | BFF emit WebSocket + invalidate cache after TCP response for UI-layer events                                                                                                                                                                                                                                                                                                                     | [§7.3](technical-architecture.md)     |
| 6   | Template-First     | Course services are kept as living templates, not edited                                                                                                                                                                                                                                                                                                                                         | Phase 0 strategy                      |
| 7   | Step 2.4 business  | Finalized business specification (stock Catalog TCP, deduct on confirmation, first bill submitted, transfer saga, session PG+Redis, RBAC cancel, WS/event scope, `MenuItem.station`, payment boundary) — [Step 2.4 business specification](specs/business-logic-step-2.4-spec.md)                                                                                                                | Audit Q1–Q12 → spec                   |

---

## Roadmap Overview

Column **Weight** = estimated percentage contribution of phase to **entire project volume** (100%), based on business scope, number of system layers touched, technical risks and thesis demo flow dependencies — **not** calculated by dividing equally by the number of weeks recorded in each phase file.

Column **% phase** = internal completion level for that phase (0–100%), independent of weights.

Column **Cumulative range (P0→Pn @100%)** = weighted sum from **Phase 0** to **end of phase in that row**, **assume** every phase in that segment is **100%** complete. This is the **ceiling percentage of the entire project's volume** that has been "covered" when reaching that milestone — **not** the current actual progress (actual progress is still taken from `Σ (Weight × % phase)` below).

| Phase     | Content                              | Estimate     | Weight   | % phase  | Accumulation range (P0→Pn @100%) | Status                 | Detailed files                                   |
| --------- | ------------------------------------ | ------------ | -------- | -------- | -------------------------------- | ---------------------- | ------------------------------------------------ |
| Phase 0   | Platform & Architecture              | ~1 week      | **7%**   | **100%** | **7%**                           | ✅ Complete            | [phase-0](phases/phase-0-foundation.md)          |
| Phase 1   | Catalog + Menu + Table               | ~2-3 weeks   | **20%**  | **100%** | **27%**                          | ✅ Complete            | [phase-1](phases/phase-1-catalog.md)             |
| Phase 2A  | Permissions + Orders + Kafka         | ~2-2.5 weeks | **18%**  | **100%** | **45%**                          | ✅ Complete            | [phase-2a](phases/phase-2a-order-kafka.md)       |
| Phase 2B  | Kitchen/KDS + WebSocket              | ~1-1.5 weeks | **10%**  | **100%** | **55%**                          | ✅ Complete            | [phase-2b](phases/phase-2b-kitchen-websocket.md) |
| Phase 3   | Payment (SePay/VietQR + Cash)        | ~1-2 weeks   | **10%**  | **100%** | **65%**                          | ✅ Complete            | [phase-3](phases/phase-3-payment.md)             |
| Phase 4A  | Saga + Hardening                     | ~1 week      | **8%**   | **40%**  | **73%**                          | ◐ Representative slice | [phase-4a](phases/phase-4a-saga-hardening.md)    |
| Phase 4B  | SaaS + tenant Onboarding             | ~1 week      | **7%**   | **100%** | **80%**                          | ✅ Complete            | [phase-4b](phases/phase-4b-saas-onboarding.md)   |
| Phase 4C  | Staff Management                     | ~3-5 days    | **3%**   | **0%**   | **83%**                          | ⬜ Not started yet     | [phase-4c](phases/phase-4c-staff-management.md)  |
| Phase 5-7 | Testing + Observability + Deployment | ~3-5 weeks   | **17%**  | **0%**   | **100%**                         | ⬜ Not started yet     | [phase-5-7](phases/phase-5-7-finalization.md)    |
| **Σ**     |                                      |              | **100%** |          | —                                |                        |                                                  |

**Total project progress (weighted):** `Σ (Weight × % phase)` = **75.2%** (Phase 0, 1, 2A, 2B, 3 and 4B completed; Phase 4A representative Saga slice implemented; Phase 4C Staff Management and Phase 5-7 not yet started) — updated synchronously on 2026-05-31 after removing Step 4.5 Notification Service from the current project scope.

**Phase 1 Note (✅):** Steps 1.1–1.6 and acceptance in `phase-1-catalog.md` have been closed according to Phase 1 scope. Improvements that do not block phases (eg export QR PDF, tenant dynamic resolution on Customer PWA) are recorded as backlog or later phases.

**Notes after Phase 4A representative saga slice (2026-05-30):** This table reflects the current implementation status after Phase 4B is complete, May 27 SaaS/domain-label stabilization landed, Phase 2A empty-session recovery was added, and the Order Confirm Saga representative slice was implemented. Future phases or historical supporting docs must still apply the source of truth order in [README](README.md).

---

## Dependency Graph

```
CRITICAL PATH (demo / main thread)
  ══════════════════════════════════

      Phase 0
          │
          ▼
      Phase 1
          │
          ▼
      Phase 2A
          │
          ▼
      Phase 2B
          │
          ▼
      Phase 3 ────────────────────────────────────────────────► Phase 5-7
          │                    (Testing + Observability + Deploy)
          │
│ PARALLEL TRACK (current state after Phase 4A representative slice + Phase 4B)
          │
          ├──────────────────────────────► Phase 4A
          │                                (representative Saga slice done;
          │                                 full hardening future work)
          │
          └──────────────────────────────► Phase 4B
(completed)
                                                 │
                                                 ▼
                                            Phase 4C
(staff management, optional for core demo)


Symbol
  ───────
│ ▼ ──► dependency order/deployment flow
    Phase 5-7 = Phase 5 (Testing) + Phase 6 (Observability) + Phase 7 (Deploy)
```

**Critical Path:** Phase 0 → 1 → 2A → 2B → 3 → 5-7 (Demo)

**Parallel Track:** Phase 4B has been completed after Phase 3. Phase 4A now has a representative Saga slice, while full hardening remains future work; Phase 4C Staff Management depends on Phase 4B and has not yet begun. Former Step 4.5 Notification Service is outside the current implementation scope.

---

## Mapping Course Lessons → Phase

| Article | Content                                     | Phase       |
| ------- | ------------------------------------------- | ----------- |
| 1-104   | Foundation (Nx, TCP, gRPC, Keycloak, Redis) | ✅ Done     |
| 105-110 | New TCP service + Cloudinary upload         | ✅ Done     |
| 115-123 | Kafka + Event-Driven                        | Phase 2A/2B |
| 111-113 | SePay VietQR + Webhook (thay Stripe)        | Phase 3     |
| 124-129 | Saga Pattern + Compensation                 | Phase 4A    |
| 130-135 | Testing (Unit + Integration + E2E)          | Phase 5     |
| 136-151 | Observability (PLG + Prometheus + Tempo)    | Phase 6     |
| 152-155 | Docker Deploy                               | Phase 7     |

---

## Related Documents

| Documents                                                                  | Description                                                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [technical-architecture.md](technical-architecture.md)                     | Architecture overall, microservices, Kafka, WebSocket, Auth, Payment                             |
| [business-logic.md](business-logic.md)                                     | Business rules, state machines, tenant isolation                                                 |
| [business-logic-step-2.4-spec.md](specs/business-logic-step-2.4-spec.md)   | Step 2.4 specification finalized (Q1–Q12); conflicts with other documents → prioritize this file |
| [references/auth-system-reference.md](references/auth-system-reference.md) | Details of the deployed auth system                                                              |
| [.github/copilot-instructions.md](../.github/copilot-instructions.md)      | Project guidelines, conventions, tech stack                                                      |

---

## Progress Overview

| Phase     | Weight   | % phase completed | Contribute to the total project | Accumulation range (P0→Pn @100%) | Updated date | Notes                                                                                                                                                                                                                     |
| --------- | -------- | ----------------- | ------------------------------- | -------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0   | 7%       | 100%              | 7.0%                            | **7%**                           | 2026-04-17   | Platform, auth, monorepo, 2 app skeleton                                                                                                                                                                                  |
| Phase 1   | 20%      | 100%              | 20.0%                           | **27%**                          | 2026-04-17   | Catalog + BFF + Cloudinary + CRUD + hooks + FE↔BE; Phase 1 close                                                                                                                                                         |
| Phase 2A  | 18%      | 100%              | 18.0%                           | **45%**                          | 2026-05-27   | Permissions, Order service, Redis cart/session, safe empty-session recovery, Kafka `order.confirmed`, BFF Direct and FE↔BE integration implemented; The phase doc has been canonicalized into the final phase record.    |
| Phase 2B  | 10%      | 100%              | 10.0%                           | **55%**                          | 2026-05-13   | Kitchen service, KDS, WebSocket Gateway and realtime FE↔BE deployed; The phase doc has been canonicalized into the final phase record.                                                                                   |
| Phase 3   | 10%      | 100%              | 10.0%                           | **65%**                          | 2026-05-09   | Payment service + POS `/pos/bills` + Dashboard payment history (read-only) + post-payment bill/session/table finalization; email/receipt delivery is outside the current implementation scope.                            |
| Phase 4A  | 8%       | 40%               | 3.2%                            | **73%**                          | 2026-05-30   | Representative Saga slice implemented: `OrderConfirmSagaService` orchestrates stock deduct/order commit/outbox with Catalog release compensation; full hardening remains future work.                                     |
| Phase 4B  | 7%       | 100%              | 7.0%                            | **80%**                          | 2026-05-27   | SaaS onboarding, tenant lifecycle, subscription/plan, live usage counters, domain label mapping, two-tier payment, tenant payment settings, landing/admin/dashboard/customer suspend behavior and verification completed. |
| Phase 4C  | 3%       | 0%                | 0%                              | **83%**                          | —            | Staff management only; Step 4.5 Notification Service removed from scope                                                                                                                                                   |
| Phase 5-7 | 17%      | 0%                | 0%                              | **100%**                         | —            | Test + PLG stack + deploy demo                                                                                                                                                                                            |
| **Total** | **100%** | —                 | **75.2%**                       | —                                | 2026-05-30   | Real progress formula: `Σ (weight × % phase / 100)`                                                                                                                                                                       |

> **4 most impressive demo highlights:** Phase 1 (QR + Menu), Phase 2 (Real-time Ordering), Phase 3 (Payment), Phase 6 (Grafana Tracing).

### How to read weights (summary of reasons)

- **Cumulative range (P0→Pn @100%):** For example, when **absolutely completed** to the end of Phase 2A, you have "registered" to do **45%** of the weighted volume of the whole project (7+20+18); This column helps compare milestones with each other, separate from **actual progress** (the actual `% phase` dependency row of each phase).
- **Phase 0 (7%):** Fewer steps than domain phases but prerequisites (auth, repo layout, apps) — moderate weight.
- **Phase 1 (20%):** Two frontends, entire domain catalog (4 aggregates), BFF, TCP, Redis menu cache, Cloudinary, multi-tenant — **largest volume** of the “single domain” phases — **✅ completed**.
- **Phase 2A (18%):** Order + Kafka + inventory locking + permission expansion — **high complexity and integration risk**, almost equivalent to Phase 1 in terms of technical effort.
- **Phase 2B (10%) / Phase 3 (10%):** Each phase has a large axis (real-time / currency) but the scope is narrower than 2A if separated.
- **Phase 4A–4C (8% + 7% + 3%):** SaaS platform operations and staff management — important but less surface area than the order–cook–pay flow. Notification/email is not part of the current implementation scope.
- **Phase 5–7 (17%):** According to schedule ~ 3–5 weeks but is **demonstration of thesis quality** (test + observation + demo replication) - significant weight even though not many new "features" are recorded.
