# QRTable Database-Per-Service Split Plan

## Goal

Move QRTable from the current mostly shared development database layout to the documented database-per-service architecture while keeping the existing service boundaries, tenant isolation rules, and local developer workflow understandable.

## Pre-Implementation State

Conclusion: QRTable is not fully database-per-service yet. It is partially split.

Evidence gathered with CodeGraph first, then verified against docs, source, env, seed scripts, and the running local containers:

- CodeGraph index is current and points database configuration to `libs/configuration/src/lib/type-orm.config.ts` and `libs/configuration/src/lib/mongo.config.ts`.
- Canonical architecture requires:
  - SaaS: PostgreSQL `qrtable_saas`
  - Catalog: PostgreSQL `qrtable_catalog`
  - Order: PostgreSQL `qrtable_order`
  - Payment: PostgreSQL `qrtable_payment`
  - User-Access: MongoDB `qrtable_auth`
  - Kitchen: Redis only
  - BFF and Authorizer: no business database
- Runtime source code already registers service-owned entities per service:
  - Catalog registers `Area`, `Category`, `MenuItem`, `Table`.
  - Order registers `Session`, `Order`, `OrderItem`, `Bill`, `ServiceRequest`, `OutboxEvent`.
  - SaaS registers `Tenant`, `PricingPlan`, `Subscription`, `SubscriptionInvoice`, `SaasOutboxEvent`.
  - Payment registers `PaymentEntity`, `AuditPaymentEntity`, `PaymentOutboxEventEntity`, `TenantPaymentSettingsEntity`.
  - User-Access registers Mongo `User` and `Role`.
- Current database name configuration is incomplete:
  - Shared `TypeOrmConfiguration` defaults to `TYPEORM_DATABASE` or `qrtable`.
  - Catalog uses the shared default directly.
  - SaaS uses the shared default directly.
  - Order supports `ORDER_TYPEORM_DATABASE`, but local env examples do not define it.
  - Payment supports `PAYMENT_TYPEORM_DATABASE` and requires it in staging/production.
  - User-Access uses `MONGO_DB_NAME`, currently `qrtable`, not `qrtable_auth`.
- Local `docker-compose.provider.yaml` creates one PostgreSQL database: `qrtable`.
- Running local PostgreSQL currently has `postgres`, `qrtable`, and `qrtable_payment`; it does not have `qrtable_catalog`, `qrtable_order`, or `qrtable_saas`.
- Running local `qrtable` database still contains mixed SaaS, Catalog, Order, and legacy Payment tables.
- Running local `qrtable_payment` database contains only Payment tables: `payments`, `audit_payments`, `tenant_payment_settings`, `outbox_events`.
- Running local MongoDB has `qrtable`, not `qrtable_auth`.
- Dev seed tooling still assumes one PostgreSQL database:
  - `tools/dev-reseed.sh`
  - `tools/dev-seed/postgres/reseed-postgres.js`
  - `tools/dev-seed/postgres/seed-dashboard-demo.js`
  - `tools/dev-seed/verify/verify-dev-seed.js`
- `tools/dev-seed/README.md` explicitly says runtime dev still uses one PostgreSQL database `qrtable` and the folder layout is ready for future database-per-service splitting.

## Implemented Target State

One PostgreSQL instance can still be used, but each service must own a separate database.

| Service     | Target datastore             | Owned tables or collections                                                           |
| ----------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| SaaS        | PostgreSQL `qrtable_saas`    | `tenants`, `pricing_plans`, `subscriptions`, `subscription_invoices`, `outbox_events` |
| Catalog     | PostgreSQL `qrtable_catalog` | `areas`, `categories`, `menu_items`, `tables`                                         |
| Order       | PostgreSQL `qrtable_order`   | `sessions`, `orders`, `order_items`, `bills`, `service_requests`, `outbox_events`     |
| Payment     | PostgreSQL `qrtable_payment` | `payments`, `audit_payments`, `tenant_payment_settings`, `outbox_events`              |
| User-Access | MongoDB `qrtable_auth`       | `user`, `role`                                                                        |
| Kitchen     | Redis only                   | KDS queue/cache keys only                                                             |
| BFF         | None                         | Gateway, guards, WS, cache/rate limit only                                            |
| Authorizer  | None                         | Keycloak/JWKS/Admin API only                                                          |

Important: `outbox_events` appears in multiple services by design. That is safe only when each service has its own database. It is unsafe as a long-term shared DB table because the same table name represents different service-owned outboxes.

## Plan Tasks

- [x] Task 1: Freeze the database ownership map in docs and config naming.
  - Add service-specific env names: `SAAS_TYPEORM_DATABASE`, `CATALOG_TYPEORM_DATABASE`, `ORDER_TYPEORM_DATABASE`, `PAYMENT_TYPEORM_DATABASE`, `USER_ACCESS_MONGO_DB_NAME`.
  - Keep `TYPEORM_DATABASE` and `MONGO_DB_NAME` only as local transition fallbacks.
  - Verify: `rg` shows every service-specific database env in `.env.example`, service configuration, and seed docs.

- [x] Task 2: Add service-specific configuration classes.
  - Create Catalog and SaaS TypeORM configuration classes matching the existing Order and Payment pattern.
  - Update Order default to `qrtable_order` when no shared fallback is intentionally enabled.
  - Keep Payment's staging/production guard and align the other PostgreSQL services with the same rule.
  - Add a User-Access Mongo configuration that resolves `USER_ACCESS_MONGO_DB_NAME` before `MONGO_DB_NAME`.
  - Verify: unit tests cover development fallback plus staging/production required dedicated database names.

- [x] Task 3: Provision target databases locally.
  - Add Postgres init SQL for `qrtable_catalog`, `qrtable_order`, `qrtable_saas`, `qrtable_payment`, and optionally `qrtable_keycloak` if Keycloak moves to PostgreSQL later.
  - Keep one Postgres instance for development, but create separate database names.
  - Decide later whether to add per-service database users in the same release or a follow-up hardening pass.
  - Verify: `psql` lists all target databases after a fresh provider bootstrap.

- [x] Task 4: Split schema creation and migrations per service.
  - Introduce per-service TypeORM data-source/migration targets instead of relying on `TYPEORM_SYNCHRONIZE` or one shared schema.
  - Keep each service migration folder scoped to its own entities.
  - Ensure `outbox_events` migrations are generated per service database, not as one shared table.
  - Verify: migration run creates only service-owned tables in each target database.

- [x] Task 5: Migrate existing development data safely.
  - For local/dev, prefer reseed into target databases rather than preserving all mixed data.
  - For any data worth preserving, copy by ownership:
    - SaaS tables from `qrtable` to `qrtable_saas`.
    - Catalog tables from `qrtable` to `qrtable_catalog`.
    - Order tables from `qrtable` to `qrtable_order`.
    - Payment tables from `qrtable_payment` if present, otherwise from legacy `qrtable`.
    - Mongo `user` and `role` from `qrtable` to `qrtable_auth`.
  - Preserve IDs and `tenant_id` values. Do not create cross-database foreign keys.
  - Verify: row counts and sample tenant rows match between old and new sources before cutting services over.

- [x] Task 6: Refactor seed and demo tooling.
  - Split PostgreSQL seed scripts by owner: `postgres/saas`, `postgres/catalog`, `postgres/order`, `postgres/payment`.
  - Make dashboard demo seed call each service database explicitly instead of inserting all demo rows through one connection.
  - Update seed verification to check each target database and Mongo `qrtable_auth`.
  - Verify: `pnpm dev:reseed -- --yes` finishes against the split databases and `pnpm dev:verify-seed` checks all services separately.

- [x] Task 7: Cut runtime services over to dedicated databases.
  - Set local `.env` and `.env.example` to the target database names.
  - Update Docker/app compose examples so each service receives its own database env.
  - Keep BFF, Kitchen, and Authorizer without TypeORM/Mongoose business DB providers.
  - Verify: starting the stack shows each service health check connected to its own target datastore.

- [x] Task 8: Add regression checks for service ownership.
  - Add a script or test that fails when a service registers entities outside its ownership map.
  - Add a database smoke check that fails if target databases are missing expected tables or contain foreign service tables.
  - Add doc-anchor verification if docs/config paths are added.
  - Verify: CI or local `pnpm` command reports ownership checks cleanly.

## Suggested Implementation Order

1. Configuration and env names first.
2. Local database provisioning second.
3. Per-service migration targets third.
4. Seed tooling split fourth.
5. Runtime cutover fifth.
6. Cleanup shared fallback last.

This ordering keeps the project runnable while the split is in progress.

## Cutover Strategy

Development cutover:

1. Stop app services.
2. Backup current `qrtable` and `qrtable_payment` databases if needed.
3. Create target databases.
4. Run per-service migrations.
5. Run split seed scripts.
6. Start services with dedicated env names.
7. Run health checks, seed verification, and key E2E smoke flows.

Staging/production cutover later:

1. Use a data copy from a recent backup.
2. Run migrations on the copied target databases.
3. Compare row counts and tenant samples.
4. Deploy services with dedicated database env.
5. Monitor health, logs, and domain smoke flows.
6. Keep old shared database read-only until rollback window closes.

## Verification Matrix

| Check                    | Expected result                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `codegraph status .`     | Index is up to date before architecture audit.                                                          |
| PostgreSQL database list | `qrtable_catalog`, `qrtable_order`, `qrtable_saas`, `qrtable_payment` exist.                            |
| MongoDB database list    | `qrtable_auth` exists and contains `user` and `role`.                                                   |
| Catalog DB tables        | Only Catalog tables exist.                                                                              |
| Order DB tables          | Only Order tables and Order outbox exist.                                                               |
| SaaS DB tables           | Only SaaS tables and SaaS outbox exist.                                                                 |
| Payment DB tables        | Only Payment tables and Payment outbox exist.                                                           |
| BFF module scan          | No business TypeORM/Mongoose provider.                                                                  |
| Kitchen module scan      | Redis/Kafka only, no business database provider.                                                        |
| Seed verification        | Checks every service datastore separately.                                                              |
| Smoke flows              | Menu/table, order submit/confirm, payment completion, SaaS onboarding, and User-Access sync still pass. |

## Implementation Evidence

- A fresh CodeGraph index of the implemented worktree completed with 1,191 source files, 15,568 nodes, and 31,401 edges.
- `pnpm dev:reseed -- --yes` completed the PostgreSQL reset, all four migrations, split PostgreSQL seeds, MongoDB `qrtable_auth` seed, and dashboard fixtures.
- `pnpm db:migration:show` reported one applied initial migration for Catalog, Order, Payment, and SaaS.
- `pnpm db:verify:ownership` passed against the four local target databases.
- `pnpm dev:verify-seed` passed for PostgreSQL, MongoDB, Redis, and Keycloak.
- Catalog, Order, Payment, SaaS, and User-Access test targets passed with 328 tests; environment-gated integration tests remained skipped by their existing test conditions.
- Catalog, Order, Payment, SaaS, and User-Access production builds passed.
- Lint passed for all changed database-owning service code. User-Access still reports three pre-existing warnings and no errors.
- `pnpm db:test`, `pnpm verify:doc-anchors`, Prettier checks, shell syntax checks, Node syntax checks, and `git diff --check` passed.
- Catalog, Order, Payment, SaaS, and User-Access returned HTTP 200 with dependency status `UP` from their readiness endpoints while using dedicated datastore env values.
- The pre-split local Payment database was backed up before destructive dev reset. The legacy shared `qrtable` database was not deleted.

## Rollback Plan

- Keep `TYPEORM_DATABASE=qrtable` and `MONGO_DB_NAME=qrtable` as explicit development fallback until split verification passes.
- Do not delete legacy `qrtable` tables during the same change that cuts services over.
- For local dev, rollback by restoring `.env` to shared database fallback and restarting services.
- For staging/production, rollback by redeploying previous env values and previous app image while keeping old shared database untouched.
- Remove fallback only after the split databases pass repeated local and staging smoke runs.

## Decisions Applied

- Dedicated databases are the development default. Shared fallback requires `DATABASE_SHARED_FALLBACK_ENABLED=true`.
- Per-service database users are deferred to a later hardening pass.
- User-Access runtime and seed tooling use `qrtable_auth`; legacy Mongo env remains only as an explicit transition fallback.
- Legacy `qrtable` is retained for rollback and is not deleted by the split workflow.
- Local development uses migrations with `TYPEORM_SYNCHRONIZE=false`.

## Initial Audit Snapshot

Patterns observed before implementation and preserved:

- DTOs, constants, guards, providers, and shared entities are imported from shared libs.
- Controllers mostly delegate to services.
- Cross-service flows already use TCP/Kafka rather than direct repository access.
- Payment and Order already started the service-specific database env pattern.
- Seed scripts already suggested ownership folders, which were completed as separate database clients and owner modules.

Quality scan at the start of implementation:

- Resolved blocker: runtime local was not database-per-service for SaaS, Catalog, Order, or User-Access.
- Resolved blocker: the shared `outbox_events` table name was unsafe while service schemas shared one database.
- Resolved debt: seed/demo tooling performed cross-domain writes through one database connection.
- Solid: module-level entity registration mostly respects service boundaries.
