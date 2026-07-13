# QRTable Documentation

## Source Of Truth

This file is the canonical documentation map for QRTable. When docs conflict, resolve the source of truth in this order:

1. Current code and tests on `main`.
2. Accepted latest specs.
3. Final phase records in `docs/phases/`.
4. Older root/supporting docs after verification.

If current code and an accepted spec disagree, verify the behavior in code first, then decide whether the mismatch is an implementation gap or an intentional behavior change. Do not automatically rewrite docs to match code without checking the accepted product and architecture decision.

## Canonical Docs

| Doc                                 | Role                                                                                                 |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `business-logic.md`                 | Current cross-phase business logic and domain rules.                                                 |
| `technical-architecture.md`         | Current architecture, service ownership, data ownership, Redis/Kafka/TCP/auth/frontend architecture. |
| `project-status.md`                 | Current evidence-based project status, roadmap, and deferred work.                                   |
| `phases/`                           | Final phase records after implementation and audit.                                                  |
| `architecture/permission-matrix.md` | RBAC source of truth after verification with code.                                                   |

## Supporting Docs

| Folder                                      | Role                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture/`                             | Permission matrix and derived architecture artifacts. `architecture/permission-matrix.md` is canonical for RBAC only after verification with code.                                                                                                                              |
| `guides/`                                   | Setup and operation guides that are still useful for development, deployment, or maintenance. Includes [frontend domain display](guides/frontend-domain-display.md) and [SePay / VietQR / OAuth](guides/sepay-configuration-guide-phase3.md) (three webhook routes + Tier 1/2). |
| `guides/docker-deployment-cicd-qrtable.md`  | Phase 7 deployment guide and operator notes for Docker images, Compose layers, bootstrap, backup, rollback, and DigitalOcean deployment.                                                                                                                                        |
| `guides/production-deployment-runbook.md`   | Task 11 production provisioning, preflight, startup, HTTPS verification, rollback, and troubleshooting procedure.                                                                                                                                                               |
| `guides/production-deployment-checklist.md` | Short human approval checklist and redacted handoff template for the production deployment session.                                                                                                                                                                             |
| `references/`                               | Long-form references that are too detailed for core docs but still current and linked from canonical docs when relevant.                                                                                                                                                        |
| `testing/`                                  | Durable [testing evidence](testing/README.md), traceability, and representative Saga validation.                                                                                                                                                                                |
| `presentations/`                            | Thesis and presentation assets; not an engineering source of truth.                                                                                                                                                                                                             |

Guides remain operational references; update one only when a canonical behavior or route it documents changes.

## English Writing Standard

All long-lived documentation in this repository should be written in clear English. Prefer short sentences, direct verbs, and stable technical terms such as tenant, guard, outbox, idempotency, permission, subscription, and WebSocket room. When a concept is useful for Vietnamese developers learning English, explain it in simple English instead of adding Vietnamese translations.

Use Vietnamese business examples only when the example itself needs local context, such as a restaurant name, bank transfer content, or VietQR-specific scenario. Explanations, headings, tables, diagrams, UI copy, and code comments in documentation should stay English-first.

## Execution Artifacts Policy

`docs/superpowers/` contains only temporary execution artifacts. It is not a canonical documentation store and must not become the place readers use to understand current product behavior, architecture, roadmap, or status.

Prompts, batch handoffs, old plans, old audits, and old reports should be deleted after their valuable decisions are absorbed into the core docs, phase docs, or long-lived supporting docs. Do not archive old prompts or handoffs inside the repo.

Plans, audits, reports, and handoffs can be used as evidence while refactoring docs. After absorption, remove them from the repo. They are not the final source of truth and must not override current code, accepted specs, or verified canonical docs.

## Phase Docs Contract

Each file in `docs/phases/*.md` should act as the final record for that phase and keep these sections concise:

- Status
- Final Scope
- Accepted Decisions
- Final Business Behavior
- Final Technical Behavior
- Acceptance Evidence
- Handoff / Deferred Work

Phase docs should capture phase-specific final behavior and link back to `business-logic.md`, `technical-architecture.md`, `project-status.md`, and `architecture/permission-matrix.md` instead of duplicating large shared sections.

## Update Rule

After each audit, spec, plan, or implementation pass, update the matching phase doc first.

If a rule affects cross-phase business behavior, update `business-logic.md`.

If a rule affects architecture, service ownership, data ownership, Redis, Kafka, TCP, auth, or frontend architecture, update `technical-architecture.md`.

If roadmap, status, sequencing, or deferred work changes, update `project-status.md`.

If permissions or roles change, update `architecture/permission-matrix.md` and verify the change against code.

If SePay webhook routes, OAuth env, or payment connection behavior changes, update `guides/sepay-configuration-guide-phase3.md` and verify against `apps/bff` (`sepay-webhook.controller.ts`, `payment.controller.ts`).

If frontend display enums or SaaS badge layout changes, update `guides/frontend-domain-display.md` and `libs/shared/constants` (`vi-domain-labels.ts`, `saas-wire-types.ts` must stay aligned with `libs/constants/saas.constants.ts`).
