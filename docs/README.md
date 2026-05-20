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
| `implementation_plan.md`            | Current roadmap/status after Phase 4B.                                                               |
| `phases/`                           | Final phase records after implementation and audit.                                                  |
| `architecture/permission-matrix.md` | RBAC source of truth after verification with code.                                                   |

## Supporting Docs

| Folder           | Role                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `architecture/`  | ERD, diagrams, permission matrix, and derived architecture artifacts. `architecture/permission-matrix.md` is canonical for RBAC only after verification with code. |
| `guides/`        | Setup and operation guides that are still useful for development, deployment, or maintenance.                                                                      |
| `references/`    | Long-form references that are too detailed for core docs but still current and linked from canonical docs when relevant.                                           |
| `specs/`         | Accepted specs that still add detail not yet absorbed into phase or core docs.                                                                                     |
| `testing/`       | Testing execution plans, traceability matrices, and handoff notes derived from canonical phase/testing strategy.                                                   |
| `presentations/` | Thesis and presentation assets; not an engineering source of truth.                                                                                                |

## English Writing Standard

All long-lived documentation in this repository should be written in clear English. Prefer short sentences, direct verbs, and stable technical terms such as tenant, guard, outbox, idempotency, permission, subscription, and WebSocket room. When a concept is useful for Vietnamese developers learning English, explain it in simple English instead of adding Vietnamese translations.

Use Vietnamese business examples only when the example itself needs local context, such as a restaurant name, bank transfer content, or VietQR-specific scenario. Explanations, headings, tables, diagrams, UI copy, and code comments in documentation should stay English-first.

## Execution Artifacts Policy

`docs/superpowers/` is not a canonical documentation store. If temporary execution artifacts are generated there during future work, they must not become the place readers use to understand current product behavior, architecture, or roadmap.

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

Phase docs should capture phase-specific final behavior and link back to `business-logic.md`, `technical-architecture.md`, `implementation_plan.md`, and `architecture/permission-matrix.md` instead of duplicating large shared sections.

## Update Rule

After each audit, spec, plan, or implementation pass, update the matching phase doc first.

If a rule affects cross-phase business behavior, update `business-logic.md`.

If a rule affects architecture, service ownership, data ownership, Redis, Kafka, TCP, auth, or frontend architecture, update `technical-architecture.md`.

If roadmap, status, sequencing, or deferred work changes, update `implementation_plan.md`.

If permissions or roles change, update `architecture/permission-matrix.md` and verify the change against code.
