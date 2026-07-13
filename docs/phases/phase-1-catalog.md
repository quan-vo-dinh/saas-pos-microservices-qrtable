# Phase 1 — Catalog, Menu & Table

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Tenant-isolated category, menu-item, area, table, QR-token, and menu-image management.
- Customer menu reading and Management App catalog/table operations, including Cloudinary-backed images and public menu caching.

## Accepted Decisions

- Catalog is the only service that owns menu availability, stock, table status, QR-token validation, and station metadata.
- Public menu data is cached with shared Redis-key builders; writes invalidate the relevant cache.
- Menu and table management use guarded BFF routes; QR validation and public menu reads follow the customer session/tenant boundary.
- Menu realtime is not a Phase 1 contract and no `menu.updated` Kafka topic is introduced.

## Final Business Behavior

- Staff can manage categories, menu items, areas, tables, QR tokens, and menu images for their tenant.
- Customers scanning a valid QR can view the tenant/table menu; unavailable stock is not orderable.
- Table state follows the accepted operational lifecycle: available, occupied, billing, and cleaning.

## Final Technical Behavior

- Catalog persists its own PostgreSQL entities and applies an explicit `tenantId` predicate to tenant-scoped queries.
- Image uploads use the shared Cloudinary provider with tenant-scoped paths and validation.
- The BFF proxies Catalog TCP contracts and provides the frontend REST edge; the frontend uses shared menu/table types.

## Acceptance Evidence

- Catalog controllers, services, repositories, entities, DTOs, tests, BFF routes, and both frontend integrations are present.
- Shared menu/table types and Redis-key constants are used by the catalog and ordering paths.
- The documented QR, CRUD, upload, cache-invalidation, and table-state scenarios are covered by the implemented test and UI surfaces.

## Deferred Work

- Kitchen, payment, and durable realtime behavior are owned by later phases.
- Any future menu realtime contract requires a new product decision and shared event/API update.
