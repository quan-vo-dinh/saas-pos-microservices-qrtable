# Invoice Service Removal Notice

> **Date:** 2026-04-22 · **Status:** COMPLETED · **Scope:** `invoice` + `invoice-e2e` removed entirely

## What Was Removed

Legacy template services from the course codebase — no QRTable business logic depended on them.

### Deleted Directories

- `apps/invoice/` — NestJS microservice (MongoDB/TCP)
- `apps/invoice-e2e/` — E2E tests
- `apps/bff/src/app/modules/invoice/` — BFF controller+module
- `libs/interfaces/src/lib/gateway/invoice/` — Gateway DTOs
- `libs/interfaces/src/lib/tcp/invoice/` — TCP interfaces

### Deleted Files

- `libs/constants/src/lib/enum/invoice.enum.ts` — `INVOICE_STATUS`
- `libs/schemas/src/lib/invoice.schema.ts` — Mongoose schema

### Modified Files (invoice references removed)

| File                                                 | Change                                                                     |
| ---------------------------------------------------- | -------------------------------------------------------------------------- |
| `libs/constants/src/lib/enum/role.enum.ts`           | 6 `INVOICE_*` permissions removed                                          |
| `libs/constants/src/lib/enum/tcp-request-message.ts` | `INVOICE` enum + export removed                                            |
| `libs/configuration/src/lib/tcp.config.ts`           | `INVOICE_SERVICE` enum + config field removed                              |
| `apps/bff/src/app/app.module.ts`                     | `InvoiceModules` import removed                                            |
| `apps/bff/src/app/guards/permission.guard.spec.ts`   | `INVOICE_*` from OWNER/WAITER perms removed                                |
| `apps/user-access/src/seeder/role.json`              | `invoice.*` permissions removed from all 4 affected roles                  |
| `apps/user-access/src/seeder/role.spec.ts`           | Expected matrix + SUPER_ADMIN count (51→45) updated                        |
| `.env` / `.env.example`                              | `INVOICE_PORT`, `INVOICE_SERVICE_HOST`, `TCP_INVOICE_SERVICE_PORT` removed |
| `package.json`                                       | `dev:bff-invoice` script removed                                           |
| `nx.json`                                            | `apps/invoice-e2e/**/*` jest exclude removed                               |
| `apps/authorizer/src/main.ts`                        | Stale comment fixed                                                        |

## Impact on Your Work

1. **PERMISSION enum** no longer contains `INVOICE_*` — do NOT reference them
2. **TCP_SERVICES** no longer contains `INVOICE_SERVICE` — do NOT register invoice TCP client
3. **TCP_REQUEST_MESSAGE** no longer contains `INVOICE` — do NOT use `invoice.*` message patterns
4. **MongoDB roles re-seeded** — `invoice.*` permissions purged from all 6 role documents
5. **Port 3301 (HTTP) / 3201 (TCP)** freed — available for Order Service if needed
6. **`@einvoice/*`** scope naming is UNRELATED and still in use (it's the project-wide package scope)

## Context

Phase 2A spec confirms: _"Bills thuộc Order Service (PostgreSQL) — INVOICE\__ là legacy template không có endpoint thật trong QRTable."\* The `Bill` entity lives in Order Service domain, not a separate invoice service.
