# Frontend Domain Display (Wire Enum → UI Labels)

> **Role:** Supporting guide for how QRTable maps backend enum values to user-visible Vietnamese text.  
> **Canonical enums:** `libs/constants/saas.constants.ts` (backend SaaS), `libs/shared/constants/saas-wire-types.ts` (frontend SaaS wire unions), `@einvoice/types` (POS/customer).  
> **Canonical labels:** `libs/shared/constants/vi-domain-labels.ts` (`@einvoice/shared-constants`).

## Problem

API and database keep **English wire values** (`ACTIVE`, `CONNECTED`, `PENDING_PAYMENT`). The UI must not render those strings directly. Dates and money must use locale formatters, not raw ISO strings or unrounded numbers.

## Layered Model (Nx Monorepo)

| Layer                         | Location                                                                 | Responsibility                                                  | Must not                   |
| ----------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------- |
| Domain enum (source of truth) | `libs/constants/saas.constants.ts`, `@einvoice/types` (`OrderStatus`, …) | Valid states for DB/API                                         | Contain UI copy            |
| SaaS wire types (FE)          | `@einvoice/shared-constants` → `saas-wire-types.ts`                      | Same string values as backend; used in `features/saas/types.ts` | Drift from backend         |
| Vietnamese label map          | `@einvoice/shared-constants` → `*Vi()` helpers                           | `subscriptionStatusVi('ACTIVE')` → display string               | Import React               |
| Locale formatters             | App `formatters.ts` or `@einvoice/frontend-utils`                        | `formatVnd`, `formatDateTime`, `formatCurrency`                 | Redefine label maps        |
| Status badges (optional)      | App feature folders, e.g. `management-app/.../components/badges/`        | Color + `Badge` wrapping `*Vi()`                                | Re-export shared-constants |
| Screens                       | `features/*/`, `app/(dashboard)/`, pages                                 | Compose tables/dialogs                                          | Inline `ACTIVE` in JSX     |

```text
Backend enum  →  JSON wire value  →  *Vi() in shared-constants  →  Badge/text in app UI
```

## Import Rules

```typescript
// Plain Vietnamese text
import { billingPeriodVi, tenantStatusVi } from '@einvoice/shared-constants';

// SaaS status badges (management-app only today)
import { SubscriptionStatusBadge } from '@/features/saas/components/badges';

// Money / datetime for SaaS screens
import { formatVnd, formatDateTime } from '@/features/saas/formatters';
```

Do **not** create app barrels that re-export `@einvoice/shared-constants` together with React components (former `features/saas/display/` anti-pattern).

## SaaS Feature Layout (management-app)

See `apps/management-app/src/features/saas/README.md`:

- `components/badges/` — invoice, tenant, subscription, payment-connection badges
- `admin-billing/`, `admin-tenants/`, `subscription/`, `payment-settings/` — route-facing UI

## Customer PWA

Use `*Vi()` from `@einvoice/shared-constants` directly in components (order tracking, tenant banner, bill status). Extract shared badges to `libs/frontend/ui` only when **both** apps need the same badge component.

## Adding a New Status

1. Add enum in `libs/constants` (or extend `@einvoice/types` if POS-wide).
2. Add map + `*Vi()` in `vi-domain-labels.ts` and a unit test in `vi-domain-labels.spec.ts`.
3. Update app view types if needed (`features/saas/types.ts` should stay aligned with `saas.constants`).
4. Add or extend a badge in `components/badges/` when the status appears in tables or headers.
5. Never render `{entity.status}` without mapping in user-facing UI.

## Related Docs

- `docs/technical-architecture.md` §4.4.1 — architecture summary
- `docs/phases/phase-4b-saas-onboarding.md` — SaaS UI surfaces and stabilization notes
- `docs/guides/codebase-reading-map.md` — where to read SaaS UI code
- `AGENTS.md` — VND rounding, Redis/Kafka conventions (backend); label pattern mirrors those rules on the frontend
