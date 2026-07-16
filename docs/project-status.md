# QRTable Project Status

## Status Vocabulary

- **IMPLEMENTED**: Required source code, migrations, configuration, and assets exist for the accepted scope.
- **VERIFIED**: Appropriate test, build, render, or smoke evidence exists for the accepted scope.
- **DEPLOYED**: Operating public-environment evidence exists: URL or host, deployment date, Git SHA or image tag, completed migration, and public smoke result.
- **PENDING**: The required evidence for the stated status has not yet been recorded.

## Current Project Matrix

This matrix reports evidence status rather than a global completion percentage. It does not claim public deployment where the required operating evidence is absent.

| Scope                             | IMPLEMENTED                                 | VERIFIED                                                                | DEPLOYED                                                        |
| --------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| Phases 0–6, accepted thesis scope | Yes                                         | Yes                                                                     | Not assessed by this status record.                             |
| Phase 7                           | Docker, Compose, and Caddy artifacts exist. | Local packaging and validation are verified where evidence is recorded. | **PENDING** — no public-environment evidence has been recorded. |

The Phase 7 artifacts demonstrate deployment configuration only. They do not prove that a public environment is operating.

## Deferred Work

- Record public Phase 7 deployment evidence before using **DEPLOYED**: URL or host, date, Git SHA or image tag, completed migration, and public smoke result.
- Track any work beyond the accepted thesis scope separately, including additional hardening or optional product extensions, and add fresh implementation and verification evidence before changing this status record.

## Evidence Anchors

- [Order application module](../apps/order/src/app/app.module.ts) — Order application status evidence.
- [Customer PWA API client](../apps/customer-pwa/src/lib/api-client.ts) — active tenant and session request-header status evidence.
- [Catalog stock reservation entity](../libs/entities/src/lib/stock-reservation.entity.ts) — durable reservation-state status evidence.
- [Catalog stock reservation migration](../apps/catalog/src/database/migrations/1781971200000-AddStockReservations.ts) — schema-migration status evidence.
- [Doc-code anchor inventory](DOC-CODE-ANCHORS.md) — verified-path inventory for these and related evidence anchors.
