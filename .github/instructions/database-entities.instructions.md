---
applyTo: 'libs/entities/**,libs/schemas/**'
---

# Database — TypeORM Entities & Mongoose Schemas

## TypeORM Entities (PostgreSQL — libs/entities/)

### Multi-Tenant Column (REQUIRED on all tenant-scoped entities)

```typescript
@Column({ name: 'tenant_id' })
tenant_id: string;
```

Every entity that belongs to a tenant MUST have `tenant_id`. Never query without filtering by it.

### Base Entity Pattern

```typescript
@Entity('table_name')
export class MyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenant_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
```

### TypeORM Config

- `synchronize: true` in dev only — NEVER in production
- Connection config in `libs/configuration/src/lib/database.config.ts`
- Entities registered in each service's `TypeOrmModule.forFeature([...])`

### Relations

```typescript
@ManyToOne(() => Category, { eager: false })
@JoinColumn({ name: 'category_id' })
category: Category;

@Column({ name: 'category_id' })
category_id: string;
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
- Entity class names: `PascalCase` singular (`ProductCategory`)
- TypeScript properties: `camelCase` mapped via `@Column({ name: 'snake_case' })`
