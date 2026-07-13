# Phase 4B — SaaS Onboarding & Subscription

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Tenant onboarding/lifecycle, subscription and pricing-plan behavior, plan features, tenant payment settings, OAuth state handling, and customer suspension behavior.
- Admin-assisted provisioning and the accepted onboarding mini-saga boundary with Authorizer/User-Access.

## Accepted Decisions

- SaaS owns tenant lifecycle, subscription, plan, feature, and tenant payment-setting truth; it does not own staff identity/profile data.
- Lifecycle uses `ACTIVE`, `SUSPENDED`, and `CLOSED` states with guards/caches applied at the established edge.
- SaaS subscription payments use `QRSUB`, separate from restaurant payments using `QRTBL`.
- UI display maps wire enums through shared Vietnamese labels rather than rendering raw enum values.

## Final Business Behavior

- Authorized administration can provision and manage a tenant, subscription, plan features, and payment settings.
- Suspended or closed tenant behavior is blocked/read-only according to the accepted customer and management boundaries.
- Subscription and plan data controls feature availability without changing the owning domain service boundaries.

## Final Technical Behavior

- SaaS uses its own PostgreSQL data, Redis lifecycle/subscription cache where wired, typed contracts, and outbox/event baseline.
- BFF guards obtain the subscription/tenant context before protected feature routes; frontend feature/status presentation uses shared wire types and labels.
- OAuth/payment-setting flows preserve tenant context and validate their state boundaries.

## Acceptance Evidence

- SaaS entities, services, controllers/contracts, guards, BFF routes, Management App onboarding/settings surfaces, Customer PWA suspension behavior, and focused tests are present.
- Phase 5 traceability and saga-validation artifacts cover lifecycle, plan/feature gating, payment-reference separation, and the accepted onboarding evidence.

## Deferred Work

- Advanced billing automation, production provider validation, notification/email flows, and enterprise subscription operations are deferred.
