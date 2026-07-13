# Phase 0 — Foundation & Architecture Preparation

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Nx monorepo foundations, the BFF and Authorizer edge services, Catalog and SaaS service baselines, and the Customer PWA and Management App shells.
- Shared backend/frontend libraries, local provider infrastructure, Keycloak identity integration, tenant resolution, and the initial ERD.

## Accepted Decisions

- Course services remain as living implementation references; QRTable services own new product behavior.
- NestJS uses pragmatic Controller → Service → Repository layering rather than a full clean-architecture rewrite.
- Keycloak owns staff identity; User-Access owns the internal profile, tenant mapping, and role representation.
- The two frontend applications are deliberately separate: Customer PWA is mobile-first and Management App is role-oriented.

## Final Business Behavior

- Staff authentication and role-based access are established before protected management workflows are available.
- Tenant context is resolved before tenant-scoped operations, and customers can enter the QR journey through the public edge.

## Final Technical Behavior

- BFF is the HTTP/WebSocket edge and delegates domain work to owning services; Authorizer verifies staff identity through its established transport.
- Shared `@common/*` and `@einvoice/*` libraries provide the cross-service and cross-application contracts used by subsequent phases.
- Local Docker infrastructure supports PostgreSQL, MongoDB, Redis, Kafka, and Keycloak for the system baseline.

## Acceptance Evidence

- Nx applications and shared libraries exist in the repository; BFF, Catalog, SaaS, Customer PWA, and Management App project configuration is present.
- Guard, middleware, Keycloak, and User-Access implementations establish the authenticated tenant/role boundary used by later phases.
- `docs/architecture/erd.png` and the architecture documentation retain the initial system model.

## Deferred Work

- Production provisioning, public deployment evidence, and advanced operational hardening are recorded in later phase records.
