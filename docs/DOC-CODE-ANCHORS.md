# Doc-Code Anchors

This file maps long-lived documentation references to source paths that must exist.
Run `pnpm verify:doc-anchors` after changing docs, routes, enum display labels, or SaaS frontend layout.

## Canonical Anchors

| Area                        | Required path                                                               | Reason                                                  |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| Documentation map           | `docs/README.md`                                                            | Source-of-truth order and update rules.                 |
| Doc-code anchor inventory   | `docs/DOC-CODE-ANCHORS.md`                                                  | This verification inventory.                            |
| Anchor verifier             | `tools/verify-doc-anchors.sh`                                               | Deterministic local check for required paths.           |
| Agent standards             | `AGENTS.md`                                                                 | QRTable engineering standards and forbidden patterns.   |
| Frontend enum display guide | `docs/guides/frontend-domain-display.md`                                    | Wire enum to UI label rules.                            |
| SePay configuration guide   | `docs/guides/sepay-configuration-guide-phase3.md`                           | Three BFF webhook routes and OAuth behavior.            |
| Phase 2A order record       | `docs/phases/phase-2a-order-kafka.md`                                       | Final QR order/session behavior.                        |
| Phase 4B SaaS record        | `docs/phases/phase-4b-saas-onboarding.md`                                   | Final SaaS onboarding behavior.                         |
| Order session service       | `apps/order/src/app/modules/order/services/session.service.ts`              | Session cache/recovery and empty release behavior.      |
| Order facade service        | `apps/order/src/app/modules/order/services/order.service.ts`                | TCP-facing order/session command validation.            |
| BFF staff order controller  | `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`      | Staff POS order/table routes.                           |
| POS table detail panel      | `apps/management-app/src/components/pos/table-detail-panel.tsx`             | Staff table transfer and empty-session release surface. |
| SaaS feature README         | `apps/management-app/src/features/saas/README.md`                           | Frontend SaaS layering notes.                           |
| SaaS FE types               | `apps/management-app/src/features/saas/types.ts`                            | App-facing SaaS contracts re-export shared wire enums.  |
| SaaS badges                 | `apps/management-app/src/features/saas/components/badges`                   | App-specific badge presentation.                        |
| SaaS plan comparison        | `apps/management-app/src/features/saas/subscription/plan-compare-table.tsx` | Subscription plan comparison UI.                        |
| SaaS label map              | `libs/shared/constants/src/lib/vi-domain-labels.ts`                         | Shared Vietnamese labels for UI display.                |
| SaaS label tests            | `libs/shared/constants/src/lib/vi-domain-labels.spec.ts`                    | Regression coverage for label mappings.                 |
| SaaS wire types             | `libs/shared/constants/src/lib/saas-wire-types.ts`                          | Frontend-safe SaaS wire enum constants.                 |
| Backend SaaS constants      | `libs/constants/src/lib/saas.constants.ts`                                  | Backend source constants to keep wire values aligned.   |
