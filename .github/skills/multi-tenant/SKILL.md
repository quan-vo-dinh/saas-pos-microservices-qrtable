---
name: multi-tenant
description: Multi-tenancy patterns for QRTable SaaS platform. Use when implementing tenant isolation, working with tenant middleware, designing tenant-scoped queries, or handling cross-tenant scenarios.
---

# Multi-Tenant Architecture — QRTable

## Strategy: Database-per-Service + tenant_id Discriminator

Each microservice owns its own database. Within each database, tenant data lives in shared tables. Isolation enforced by filtering on `tenant_id` in every query.

```
Service: Catalog → DB: qrtable_catalog
  Tenant A ─┐
  Tenant B ─┤──→ categories, menu_items, areas, tables
  Tenant C ─┘       ↑ always filtered by tenant_id

Service: Order → DB: qrtable_order
  Tenant A ─┐
  Tenant B ─┤──→ orders, order_items, sessions
  Tenant C ─┘       ↑ always filtered by tenant_id

Cross-service data (e.g., order needs menu_item price):
  → Order Service calls Catalog Service via TCP
  → NEVER direct DB query across service boundaries
```

## Tenant Resolution Flow

```
HTTP Request
  → TenantMiddleware (resolves tenantId from header/subdomain/JWT)
  → TenantGuard (injects tenantId into request context)
  → Controller (@CurrentTenant() decorator)
  → Service (passes tenantId to all repo calls)
  → Repository (WHERE tenant_id = :tenantId)
```

## Resolution Priority (TenantMiddleware)

1. `X-Tenant-ID` header (explicit, for API clients)
2. Subdomain (`tenant-slug.qrtable.com`)
3. JWT claim (`tenant_id` in Keycloak token)

## Code Patterns

### Controller

```typescript
@Controller('products')
@UseGuards(UserGuard, TenantGuard)
export class ProductController {
  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.productService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.productService.findById(id, tenantId);
  }
}
```

### Service (Always pass tenantId through)

```typescript
async findAll(tenantId: string): Promise<ProductEntity[]> {
  return this.productRepo.findAll(tenantId);
}

async update(id: string, dto: UpdateProductDto, tenantId: string): Promise<ProductEntity> {
  const product = await this.productRepo.findById(id, tenantId);
  if (!product) throw new NotFoundException(`Product not found in this tenant`);
  return this.productRepo.update(id, dto, tenantId);
}
```

### Repository (Always filter by tenantId)

```typescript
// TypeORM
async findAll(tenantId: string): Promise<ProductEntity[]> {
  return this.repo.find({ where: { tenant_id: tenantId } });
}

async findById(id: string, tenantId: string): Promise<ProductEntity | null> {
  return this.repo.findOne({ where: { id, tenant_id: tenantId } });
  // ✅ Both id AND tenant_id — prevents cross-tenant access
}

// Mongoose
async findById(id: string, tenantId: string): Promise<UserDocument | null> {
  return this.model.findOne({ _id: id, tenant_id: tenantId }).exec();
}
```

## Critical Security Rules

1. **NEVER** query by `id` alone — always include `tenant_id`
2. **NEVER** pass tenant resolution to the frontend
3. Tenant admin cannot access data of another tenant — ever
4. Super-admin operations (SaaS service) are separate endpoints with different guards

## SaaS Service (Tenant Management)

Manages the tenants themselves (create, suspend, billing). Uses `@SuperAdminGuard` not `TenantGuard`.
