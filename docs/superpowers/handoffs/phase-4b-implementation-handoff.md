# Phase 4B Implementation Handoff

**Date:** 2026-05-13  
**Scope:** Plan 07 — Landing, customer PWA tenant lifecycle, BFF guards, realtime `tenant.*` events, demo quality gates (`docs/superpowers/plans/2026-05-12-phase-4b-saas/07-landing-customer-pwa-quality-gates.md`).

## Implemented

- **Public landing (management-app):** Production-oriented sections (hero, pricing from BFF public plans, workflow, payment trust, contact CTA). Root `/` is public; authenticated users redirect per existing middleware.
- **Customer PWA:** `tenantStatus` / `tenantStatusReason` on session; banner + ordering disabled for suspended/closed; VietQR / request-payment path remains available for `PENDING_PAYMENT` per Phase 4B rules; socket auth includes `tenantSlug` where applicable; lifecycle events update client state.
- **SaaS service:** `getBySlug` rejects **CLOSED** only; **SUSPENDED** resolves for QR; TCP/gateway DTOs expose `suspendedReason` where applicable.
- **BFF:** `CustomerTenantLifecycleGuard` on customer/menu/order paths; `RealtimeEventsService.emitTenantLifecycle`; customer socket rooms `tenant:{id}:customers` (+ slug room when slug present); admin tenant status change emits lifecycle after successful TCP.
- **Constants:** `TENANT_LIFECYCLE_SOCKET_EVENTS`, room builders in `libs/constants`.
- **Demo / docs:** `docs/superpowers/reports/phase-4b-landing-ui-ux-notes.md`, `tools/demo/phase-4b-demo-checklist.md`, `tools/demo/phase-4b-smoke.sh` (executable). Optional persisted ui-ux output under `design-system/qrtable/` (small markdown artifacts).

## Environment variables (names only — no values)

Configure in deployment / `.env` as required by your environment:

- `NEXT_PUBLIC_BFF_BASE_URL` — management-app landing fetches public plans.
- `SEPAY_OAUTH_CLIENT_ID`
- `SEPAY_OAUTH_CLIENT_SECRET`
- `SEPAY_OAUTH_REDIRECT_URI`
- `SEPAY_PLATFORM_QR_ACCOUNT`
- `SEPAY_PLATFORM_QR_BANK`
- `SEPAY_PLATFORM_WEBHOOK_SECRET`
- `PAYMENT_SECRETS_ENCRYPTION_KEY`
- BFF / SaaS Redis and TCP URLs as already documented for the monorepo.

## Migrations

None introduced in this Phase 4B slice.

## Verification commands (run before merge)

Commands below were executed on **2026-05-13** in this workspace (representative results):

| Command                                                                                                                                      | Result                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm nx run-many -t test --projects=constants,entities,interfaces,saas,payment,bff,guards,authorizer,user-access,catalog,order --runInBand` | **Pass** (Nx skipped `entities`/`interfaces` — no `test` target). 9 projects: constants, guards, user-access, order, authorizer, catalog, payment, saas, bff — all green. |
| `pnpm nx test customer-pwa --runInBand --skip-nx-cache`                                                                                      | **Pass** — 13 suites / 57 tests after adding tenant suspended-state regression coverage.                                                                                  |
| `pnpm nx test bff --runInBand --skip-nx-cache`                                                                                               | **Pass** — 25 suites / 128 tests after adding customer tenant lifecycle guard + realtime lifecycle emit coverage.                                                         |
| `pnpm nx test management-app --runInBand --skip-nx-cache`                                                                                    | **Pass** — 33 suites / 140 tests.                                                                                                                                         |
| `pnpm nx run-many -t lint --projects=saas,payment,bff,guards,authorizer,user-access,catalog,order,management-app,customer-pwa`               | **Pass** (0 errors; pre-existing warnings in user-access, authorizer, bff specs, management-app POS/tests).                                                               |
| `pnpm nx run customer-pwa:typecheck`                                                                                                         | **Pass** (`tsc --noEmit -p tsconfig.app.json`).                                                                                                                           |
| `pnpm nx build customer-pwa --skip-nx-cache`                                                                                                 | **Pass** (Vite build; chunk-size warning only).                                                                                                                           |
| `pnpm nx build management-app`                                                                                                               | **Pass** (Next.js production build + TS). _Note:_ `management-app` has no Nx `typecheck` target; production build covers TS.                                              |
| `pnpm nx affected -t build --base=origin/main`                                                                                               | **Pass** — 16 affected projects built (bff, customer-pwa, management-app, saas, microservices, libs).                                                                     |
| `git diff --check`                                                                                                                           | **Pass** (no whitespace errors).                                                                                                                                          |

```bash
pnpm nx run-many -t test --projects=constants,entities,interfaces,saas,payment,bff,guards,authorizer,user-access,catalog,order --runInBand
pnpm nx test management-app --runInBand
pnpm nx test customer-pwa --runInBand
pnpm nx test bff --runInBand
pnpm nx run-many -t lint --projects=saas,payment,bff,guards,authorizer,user-access,catalog,order,management-app,customer-pwa
pnpm nx run-many -t typecheck --projects=management-app,customer-pwa   # management-app: omit if target missing; use nx build management-app instead
pnpm nx build customer-pwa
pnpm nx affected -t build
git diff --check
```

**Contract scans:** (run from repo root; matches are expected for internal TCP bodies, payment server config, and docs — review diffs for new customer/dashboard routes trusting `tenantId` from untrusted HTTP bodies.)

```bash
rg -n "tenantId.*body|body.*tenantId|SEPAY_OAUTH_CLIENT_SECRET|PAYMENT_SECRETS_ENCRYPTION_KEY" apps libs
rg -n "QRTBL|QRSUB|tenant\\.suspended|payment_settings\\.update_own|subscription\\.checkout" apps libs docs
```

**Smoke (requires live BFF + token + tenant):**

```bash
BFF_BASE_URL=http://localhost:3300/api/v1 ACCESS_TOKEN=... TENANT_ID=... bash tools/demo/phase-4b-smoke.sh
```

**Browser (desktop ~1440×900, mobile ~390×844):** `/`, `/dashboard/subscription`, `/dashboard/payment-settings`, admin SaaS routes as in plan, customer PWA menu for active vs suspended tenant — confirm no blank screens, no horizontal scroll, suspended banner does not fully obscure primary navigation.

**Browser automation note:** Cursor IDE browser MCP in this environment did not load `http://localhost:3001/` (Chrome showed `chrome-error://chromewebdata/`). A local `next dev --port 3001` was started successfully for smoke; **use a real browser** (or Browser MCP against a reachable host) for the full desktop/mobile checklist. Prior stabilization session reported dashboard pages and smoke script passing on real browser.

## Known limitations

- **Self-service tenant registration wizard** remains out of scope for Phase 4B (Q16 = static landing + contact path).
- **SePay production webhook** validation depends on a publicly reachable BFF URL and platform webhook secret configuration.
- **OAuth mock** is for automated tests / local isolation only.
- **Auto-suspend (cron) → WebSocket:** lifecycle emit is wired from BFF admin tenant status updates; paths that change tenant status **without** going through that BFF flow may not emit until the next customer reconnect or admin action.
- **Suspended tenant payment exception:** Customer order mutations are blocked while suspended/closed, but pending customer VietQR generation remains available so an already requested bill can still be settled.

## References

- [business-logic-phase-4b-spec.md](../../specs/business-logic-phase-4b-spec.md)
- [phase-4b-audit-report.md](../audits/phase-4b-audit-report.md)
- Plans: [00-execution-map.md](../plans/2026-05-12-phase-4b-saas/00-execution-map.md) through [07-landing-customer-pwa-quality-gates.md](../plans/2026-05-12-phase-4b-saas/07-landing-customer-pwa-quality-gates.md)
