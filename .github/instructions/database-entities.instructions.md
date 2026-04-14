---
applyTo: 'libs/entities/**,libs/schemas/**'
---

# Database — TypeORM Entities & Mongoose Schemas

## TypeORM Entities (PostgreSQL — libs/entities/)

### Multi-Tenant Column (REQUIRED on all tenant-scoped entities)

```typescript
@Column({ name: 'tenant_id', type: 'varchar', length: 64 })
tenantId: string;
```

Every entity that belongs to a tenant MUST have `tenantId`. Never query without filtering by it.

### Base Entity Pattern

```typescript
@Entity({ name: 'table_name' })
export class MyEntity extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;
}
```

`BaseEntity` (in `libs/entities/src/lib/base.entity.ts`) provides `id`, `createdAt`, `updatedAt` automatically.

### Property Naming Convention

- TypeScript properties: **camelCase** (`tenantId`, `createdAt`, `sortOrder`)
- Database columns: **snake_case** via `@Column({ name: 'snake_case' })`
- Always use explicit `name` mapping for multi-word columns

### TypeORM Config

- `synchronize: true` in dev only — NEVER in production
- Connection config in `libs/configuration/src/lib/database.config.ts`
- Entities registered in each service's `TypeOrmModule.forFeature([...])`

### Relations

```typescript
@ManyToOne(() => Category, { eager: false })
@JoinColumn({ name: 'category_id' })
category: Category;

@Column({ name: 'category_id', type: 'uuid' })
categoryId: string;
```

Always store FK column explicitly alongside the relation.

## Mongoose Schemas (MongoDB — libs/schemas/)

### Schema Pattern

```typescript
@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true })
  tenant_id: string;

  @Prop({ required: true, unique: true })
  email: string;
}
export const UserSchema = SchemaFactory.createForClass(User);
// Add compound index for tenant isolation
UserSchema.index({ tenant_id: 1, email: 1 }, { unique: true });
```

### Query Pattern

Always filter by tenant_id:

```typescript
this.model.find({ tenant_id: tenantId, ...otherFilters });
```

## Naming Conventions

- Table names: `snake_case` plural (`product_categories`, `order_items`)
- Column names: `snake_case` (`created_at`, `tenant_id`, `product_id`)
- Entity class names: `PascalCase` singular (`Product`, `Category`, `MenuItem`)
- TypeScript properties: `camelCase` with `@Column({ name: 'snake_case' })` mapping
- Status fields: use centralized enums from `@common/constants/enum/` (e.g., `CATEGORY_STATUS`)
