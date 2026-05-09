# Step 1.5 — Catalog Service Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Catalog Service Backend — 4 domain entities (Category, Area, MenuItem, Table), CRUD services, Table State Machine, QR Token security, BFF REST endpoints with Redis menu cache, Cloudinary image upload integration, and ~32 unit tests.

**Architecture:** NestJS hybrid microservice (HTTP:3305 + TCP:3205) with TypeORM/PostgreSQL (`qrtable_catalog` database). BFF acts as API Gateway — admin endpoints with JWT guard chain, public menu endpoint with session guard. BFF manages Redis cache centrally (Catalog Service has NO Redis). Image upload flows through BFF → Cloudinary → TCP to Catalog.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, Redis (@keyv/redis at BFF), Cloudinary (via @common/providers/cloudinary), Jest, HMAC-SHA256 (Node.js crypto)

**Design Spec:** `docs/superpowers/specs/2026-04-11-catalog-service-backend-design.md`

---

## File Structure

### Files to DELETE

| File                                                                 | Reason                                                |
| -------------------------------------------------------------------- | ----------------------------------------------------- |
| `libs/entities/src/lib/catalog.entity.ts`                            | Replace generic Catalog entity with 4 domain entities |
| `apps/catalog/src/entities/catalog.entity.ts`                        | Local entity copy — removing                          |
| `apps/catalog/src/controllers/catalog.controller.ts`                 | Replace with 5 domain controllers                     |
| `apps/catalog/src/services/catalog.service.ts`                       | Replace with 5 domain services                        |
| `apps/catalog/src/repositories/catalog.repository.ts`                | Replace with 4 domain repositories                    |
| `apps/catalog/src/dtos/create-catalog.dto.ts`                        | Old generic DTOs                                      |
| `apps/catalog/src/dtos/update-catalog.dto.ts`                        | Old generic DTOs                                      |
| `apps/catalog/src/dtos/catalog-response.dto.ts`                      | Old generic DTOs                                      |
| `apps/bff/src/app/modules/catalog/controllers/catalog.controller.ts` | Replace with admin + public controllers               |
| `libs/interfaces/src/lib/tcp/catalog/catalog-request.interface.ts`   | Replace with domain-specific interfaces               |
| `libs/interfaces/src/lib/tcp/catalog/catalog-response.interface.ts`  | Replace with domain-specific interfaces               |
| `libs/interfaces/src/lib/tcp/catalog/index.ts`                       | Rewrite barrel                                        |
| `libs/interfaces/src/lib/gateway/catalog/catalog-request.dto.ts`     | Replace with domain-specific DTOs                     |
| `libs/interfaces/src/lib/gateway/catalog/catalog-response.dto.ts`    | Replace with domain-specific DTOs                     |
| `libs/interfaces/src/lib/gateway/catalog/index.ts`                   | Rewrite barrel                                        |

### Files to CREATE — Shared Libs

| File                                                         | Responsibility                         |
| ------------------------------------------------------------ | -------------------------------------- |
| `libs/entities/src/lib/category.entity.ts`                   | CategoryEntity — TypeORM entity        |
| `libs/entities/src/lib/menu-item.entity.ts`                  | MenuItemEntity — TypeORM entity        |
| `libs/entities/src/lib/area.entity.ts`                       | AreaEntity — TypeORM entity            |
| `libs/entities/src/lib/table.entity.ts`                      | TableEntity — TypeORM entity           |
| `libs/interfaces/src/lib/tcp/catalog/category.interface.ts`  | Category TCP request/response types    |
| `libs/interfaces/src/lib/tcp/catalog/menu-item.interface.ts` | MenuItem TCP request/response types    |
| `libs/interfaces/src/lib/tcp/catalog/area.interface.ts`      | Area TCP request/response types        |
| `libs/interfaces/src/lib/tcp/catalog/table.interface.ts`     | Table TCP request/response types       |
| `libs/interfaces/src/lib/tcp/catalog/menu.interface.ts`      | Public menu TCP types                  |
| `libs/interfaces/src/lib/gateway/catalog/category.dto.ts`    | Category gateway request/response DTOs |
| `libs/interfaces/src/lib/gateway/catalog/menu-item.dto.ts`   | MenuItem gateway DTOs                  |
| `libs/interfaces/src/lib/gateway/catalog/area.dto.ts`        | Area gateway DTOs                      |
| `libs/interfaces/src/lib/gateway/catalog/table.dto.ts`       | Table gateway DTOs                     |
| `libs/interfaces/src/lib/gateway/catalog/menu.dto.ts`        | Public menu response DTO               |

### Files to CREATE — Catalog Service

| File                                                   | Responsibility                       |
| ------------------------------------------------------ | ------------------------------------ |
| `apps/catalog/src/category/category.module.ts`         | Category NestJS module               |
| `apps/catalog/src/category/category.controller.ts`     | Category TCP message handlers        |
| `apps/catalog/src/category/category.service.ts`        | Category business logic              |
| `apps/catalog/src/category/category.repository.ts`     | Category TypeORM queries             |
| `apps/catalog/src/category/category.service.spec.ts`   | Category unit tests                  |
| `apps/catalog/src/area/area.module.ts`                 | Area NestJS module                   |
| `apps/catalog/src/area/area.controller.ts`             | Area TCP message handlers            |
| `apps/catalog/src/area/area.service.ts`                | Area business logic                  |
| `apps/catalog/src/area/area.repository.ts`             | Area TypeORM queries                 |
| `apps/catalog/src/area/area.service.spec.ts`           | Area unit tests                      |
| `apps/catalog/src/menu-item/menu-item.module.ts`       | MenuItem NestJS module               |
| `apps/catalog/src/menu-item/menu-item.controller.ts`   | MenuItem TCP message handlers        |
| `apps/catalog/src/menu-item/menu-item.service.ts`      | MenuItem business logic              |
| `apps/catalog/src/menu-item/menu-item.repository.ts`   | MenuItem TypeORM queries             |
| `apps/catalog/src/menu-item/menu-item.service.spec.ts` | MenuItem unit tests                  |
| `apps/catalog/src/table/table.module.ts`               | Table NestJS module                  |
| `apps/catalog/src/table/table.controller.ts`           | Table TCP message handlers           |
| `apps/catalog/src/table/table.service.ts`              | Table business logic + state machine |
| `apps/catalog/src/table/table.repository.ts`           | Table TypeORM queries                |
| `apps/catalog/src/table/table.service.spec.ts`         | Table unit tests                     |
| `apps/catalog/src/menu/menu.module.ts`                 | Public menu NestJS module            |
| `apps/catalog/src/menu/menu.controller.ts`             | Menu TCP message handler             |
| `apps/catalog/src/menu/menu.service.ts`                | Menu aggregation service             |
| `apps/catalog/src/menu/menu.service.spec.ts`           | Menu aggregation unit tests          |

### Files to CREATE — BFF

| File                                                                   | Responsibility                               |
| ---------------------------------------------------------------------- | -------------------------------------------- |
| `apps/bff/src/app/modules/catalog/controllers/category.controller.ts`  | Admin Category REST endpoints                |
| `apps/bff/src/app/modules/catalog/controllers/area.controller.ts`      | Admin Area REST endpoints                    |
| `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts` | Admin MenuItem REST endpoints + image upload |
| `apps/bff/src/app/modules/catalog/controllers/table.controller.ts`     | Admin Table REST endpoints + status + QR     |
| `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`      | Public Menu REST endpoint with cache         |

### Files to MODIFY

| File                                                 | Change                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `libs/constants/src/lib/enum/tcp-request-message.ts` | Remove old CATALOG enum, add CATEGORY, MENU_ITEM, AREA, TABLE, MENU enums |
| `apps/catalog/src/app.module.ts`                     | Replace with 5 domain modules, 4 entities                                 |
| `apps/catalog/src/main.ts`                           | No change needed — hybrid pattern already correct                         |
| `apps/bff/src/app/modules/catalog/catalog.module.ts` | Import CloudinaryModule, register all 5 controllers                       |
| `libs/shared/types/src/lib/menu.types.ts`            | Remove timeStart/timeEnd from Category type                               |

---

## Task Breakdown

### Task 1: TCP Message Patterns + Permission Constants

**Files:**

- Modify: `libs/constants/src/lib/enum/tcp-request-message.ts`

- [ ] **Step 1: Update TCP message patterns**

Replace the old `CATALOG` enum with 5 new domain-specific enums. Keep all other enums unchanged.

```typescript
// libs/constants/src/lib/enum/tcp-request-message.ts

enum INVOICE {
  CREATE = 'invoice.create',
  GET_BY_ID = 'invoice.get_by_id',
  GET_LIST = 'invoice.get_list',
  UPDATE = 'invoice.update',
  DELETE = 'invoice.delete',
}

enum PRODUCT {
  CREATE = 'product.create',
  GET_BY_ID = 'product.get_by_id',
  GET_LIST = 'product.get_list',
  UPDATE = 'product.update',
  DELETE = 'product.delete',
}

enum USER {
  CREATE = 'user_access.create',
  GET_BY_ID = 'user_access.get_by_id',
  GET_LIST = 'user_access.get_list',
  UPDATE = 'user_access.update',
  DELETE = 'user_access.delete',
  GET_BY_USER_ID = 'user_access.get_by_user_id',
}

enum KEYCLOAK {
  CREATE_USER = 'keycloak.create_user',
  GET_USER_BY_ID = 'keycloak.get_user_by_id',
  GET_USERS = 'keycloak.get_users',
  UPDATE_USER = 'keycloak.update_user',
  DELETE_USER = 'keycloak.delete_user',
}

enum AUTHORIZER {
  LOGIN = 'authorizer.login',
  VERIFY_USER_TOKEN = 'authorizer.verify_user_token',
}

enum CATEGORY {
  CREATE = 'category.create',
  GET_LIST = 'category.get_list',
  GET_BY_ID = 'category.get_by_id',
  UPDATE = 'category.update',
  DELETE = 'category.delete',
  REORDER = 'category.reorder',
}

enum MENU_ITEM {
  CREATE = 'menu_item.create',
  GET_LIST = 'menu_item.get_list',
  GET_BY_ID = 'menu_item.get_by_id',
  UPDATE = 'menu_item.update',
  SOFT_DELETE = 'menu_item.soft_delete',
  UPDATE_IMAGE = 'menu_item.update_image',
}

enum AREA {
  CREATE = 'area.create',
  GET_LIST = 'area.get_list',
  GET_BY_ID = 'area.get_by_id',
  UPDATE = 'area.update',
  DELETE = 'area.delete',
  REORDER = 'area.reorder',
}

enum TABLE {
  CREATE = 'table.create',
  GET_LIST = 'table.get_list',
  GET_BY_ID = 'table.get_by_id',
  UPDATE = 'table.update',
  DELETE = 'table.delete',
  UPDATE_STATUS = 'table.update_status',
  VALIDATE_QR_TOKEN = 'table.validate_qr_token',
  REGENERATE_QR_TOKEN = 'table.regenerate_qr_token',
}

enum MENU {
  GET_PUBLIC_MENU = 'menu.get_public_menu',
}

enum SAAS {
  CREATE = 'saas.create',
  GET_BY_ID = 'saas.get_by_id',
  GET_LIST = 'saas.get_list',
  UPDATE = 'saas.update',
  DELETE = 'saas.delete',
  HEALTH = 'saas.health',
}

export const TCP_REQUEST_MESSAGE = {
  INVOICE,
  PRODUCT,
  USER,
  KEYCLOAK,
  AUTHORIZER,
  CATEGORY,
  MENU_ITEM,
  AREA,
  TABLE,
  MENU,
  SAAS,
};
```

- [ ] **Step 2: Verify no compile errors from removal of old CATALOG**

Run: `cd /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order && npx nx lint constants --fix`
Expected: PASS (the old CATALOG references are in files we'll also delete/replace)

Note: The BFF catalog controller and catalog service still reference `TCP_REQUEST_MESSAGE.CATALOG.*` — they will be deleted in Task 3. This is expected to cause temporary compile errors until Task 3 completes.

- [ ] **Step 3: Commit**

```bash
git add libs/constants/src/lib/enum/tcp-request-message.ts
git commit -m "feat(constants): replace generic CATALOG TCP patterns with domain-specific enums

Add CATEGORY, MENU_ITEM, AREA, TABLE, MENU enums.
Remove old generic CATALOG enum."
```

---

### Task 2: Entity Definitions (All 4 Entities)

**Files:**

- Create: `libs/entities/src/lib/category.entity.ts`
- Create: `libs/entities/src/lib/menu-item.entity.ts`
- Create: `libs/entities/src/lib/area.entity.ts`
- Create: `libs/entities/src/lib/table.entity.ts`
- Delete: `libs/entities/src/lib/catalog.entity.ts`

- [ ] **Step 1: Create CategoryEntity**

```typescript
// libs/entities/src/lib/category.entity.ts
import { BaseEntity } from './base.entity';
import { Column, Entity, Index, Unique } from 'typeorm';

export type CategoryStatus = 'active' | 'inactive';

@Entity({ name: 'categories' })
@Unique(['tenantId', 'name'])
@Index(['tenantId', 'sortOrder'])
export class Category extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: CategoryStatus;
}
```

- [ ] **Step 2: Create AreaEntity**

```typescript
// libs/entities/src/lib/area.entity.ts
import { BaseEntity } from './base.entity';
import { Column, Entity, Index, Unique } from 'typeorm';

@Entity({ name: 'areas' })
@Unique(['tenantId', 'name'])
@Index(['tenantId', 'sortOrder'])
export class Area extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
```

- [ ] **Step 3: Create MenuItemEntity**

```typescript
// libs/entities/src/lib/menu-item.entity.ts
import { BaseEntity } from './base.entity';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Category } from './category.entity';

export type MenuItemStatus = 'available' | 'out_of_stock';

@Entity({ name: 'menu_items' })
@Index(['tenantId', 'categoryId'])
@Index(['tenantId', 'status'])
export class MenuItem extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { eager: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'image_public_id', type: 'varchar', length: 255, nullable: true })
  imagePublicId: string | null;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'varchar', length: 20, default: 'available' })
  status: MenuItemStatus;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;
}
```

- [ ] **Step 4: Create TableEntity**

```typescript
// libs/entities/src/lib/table.entity.ts
import { BaseEntity } from './base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Area } from './area.entity';

export type TableStatus = 'available' | 'occupied' | 'billing' | 'cleaning';

@Entity({ name: 'tables' })
@Unique(['tenantId', 'name'])
@Unique(['tenantId', 'qrToken'])
@Index(['tenantId', 'areaId'])
@Index(['tenantId', 'status'])
export class Table extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'area_id', type: 'uuid' })
  areaId: string;

  @ManyToOne(() => Area, { eager: false })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'int', default: 1 })
  capacity: number;

  @Column({ type: 'varchar', length: 20, default: 'available' })
  status: TableStatus;

  @Column({ name: 'qr_token', type: 'varchar', length: 255 })
  qrToken: string;

  @Column({ name: 'session_id', type: 'varchar', length: 255, nullable: true })
  sessionId: string | null;
}
```

- [ ] **Step 5: Delete old Catalog entity**

Delete file: `libs/entities/src/lib/catalog.entity.ts`

- [ ] **Step 6: Commit**

```bash
git add libs/entities/src/lib/
git commit -m "feat(entities): add Category, MenuItem, Area, Table entities

Replace generic Catalog entity with 4 domain-specific TypeORM entities
for qrtable_catalog database. Each has tenant_id column, proper indexes,
and unique constraints per design spec."
```

---

### Task 3: TCP Interfaces + Gateway DTOs

**Files:**

- Create: `libs/interfaces/src/lib/tcp/catalog/category.interface.ts`
- Create: `libs/interfaces/src/lib/tcp/catalog/area.interface.ts`
- Create: `libs/interfaces/src/lib/tcp/catalog/menu-item.interface.ts`
- Create: `libs/interfaces/src/lib/tcp/catalog/table.interface.ts`
- Create: `libs/interfaces/src/lib/tcp/catalog/menu.interface.ts`
- Modify: `libs/interfaces/src/lib/tcp/catalog/index.ts`
- Create: `libs/interfaces/src/lib/gateway/catalog/category.dto.ts`
- Create: `libs/interfaces/src/lib/gateway/catalog/area.dto.ts`
- Create: `libs/interfaces/src/lib/gateway/catalog/menu-item.dto.ts`
- Create: `libs/interfaces/src/lib/gateway/catalog/table.dto.ts`
- Create: `libs/interfaces/src/lib/gateway/catalog/menu.dto.ts`
- Modify: `libs/interfaces/src/lib/gateway/catalog/index.ts`
- Delete: `libs/interfaces/src/lib/tcp/catalog/catalog-request.interface.ts`
- Delete: `libs/interfaces/src/lib/tcp/catalog/catalog-response.interface.ts`
- Delete: `libs/interfaces/src/lib/gateway/catalog/catalog-request.dto.ts`
- Delete: `libs/interfaces/src/lib/gateway/catalog/catalog-response.dto.ts`

- [ ] **Step 1: Create Category TCP interfaces**

```typescript
// libs/interfaces/src/lib/tcp/catalog/category.interface.ts
import { Category } from '@common/entities/category.entity';

export type CreateCategoryTcpRequest = {
  tenantId: string;
  name: string;
  sortOrder?: number;
  status?: string;
};

export type GetCategoryListTcpRequest = {
  tenantId: string;
};

export type GetCategoryByIdTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateCategoryTcpRequest = {
  id: string;
  tenantId: string;
  name?: string;
  sortOrder?: number;
  status?: string;
};

export type DeleteCategoryTcpRequest = {
  id: string;
  tenantId: string;
};

export type ReorderCategoryTcpRequest = {
  tenantId: string;
  items: Array<{ id: string; sortOrder: number }>;
};

export type CategoryTcpResponse = Category;
```

- [ ] **Step 2: Create Area TCP interfaces**

```typescript
// libs/interfaces/src/lib/tcp/catalog/area.interface.ts
import { Area } from '@common/entities/area.entity';

export type CreateAreaTcpRequest = {
  tenantId: string;
  name: string;
  sortOrder?: number;
};

export type GetAreaListTcpRequest = {
  tenantId: string;
};

export type GetAreaByIdTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateAreaTcpRequest = {
  id: string;
  tenantId: string;
  name?: string;
  sortOrder?: number;
};

export type DeleteAreaTcpRequest = {
  id: string;
  tenantId: string;
};

export type ReorderAreaTcpRequest = {
  tenantId: string;
  items: Array<{ id: string; sortOrder: number }>;
};

export type AreaTcpResponse = Area;
```

- [ ] **Step 3: Create MenuItem TCP interfaces**

```typescript
// libs/interfaces/src/lib/tcp/catalog/menu-item.interface.ts
import { MenuItem } from '@common/entities/menu-item.entity';

export type CreateMenuItemTcpRequest = {
  tenantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  sortOrder?: number;
};

export type GetMenuItemListTcpRequest = {
  tenantId: string;
  categoryId?: string;
};

export type GetMenuItemByIdTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateMenuItemTcpRequest = {
  id: string;
  tenantId: string;
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  sortOrder?: number;
  status?: string;
};

export type SoftDeleteMenuItemTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateMenuItemImageTcpRequest = {
  id: string;
  tenantId: string;
  imageUrl: string;
  imagePublicId: string;
};

export type MenuItemTcpResponse = MenuItem;
```

- [ ] **Step 4: Create Table TCP interfaces**

```typescript
// libs/interfaces/src/lib/tcp/catalog/table.interface.ts
import { Table } from '@common/entities/table.entity';

export type CreateTableTcpRequest = {
  tenantId: string;
  areaId: string;
  name: string;
  capacity?: number;
};

export type GetTableListTcpRequest = {
  tenantId: string;
  areaId?: string;
  status?: string;
};

export type GetTableByIdTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateTableTcpRequest = {
  id: string;
  tenantId: string;
  name?: string;
  capacity?: number;
  areaId?: string;
};

export type DeleteTableTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateTableStatusTcpRequest = {
  id: string;
  tenantId: string;
  status: string;
  sessionId?: string;
};

export type ValidateQrTokenTcpRequest = {
  tableId: string;
  token: string;
  tenantId: string;
};

export type RegenerateQrTokenTcpRequest = {
  id: string;
  tenantId: string;
};

export type TableTcpResponse = Table;
```

- [ ] **Step 5: Create Menu TCP interfaces**

```typescript
// libs/interfaces/src/lib/tcp/catalog/menu.interface.ts
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';

export type GetPublicMenuTcpRequest = {
  tenantId: string;
};

export type PublicMenuCategoryResponse = {
  id: string;
  name: string;
  sortOrder: number;
  items: PublicMenuItemResponse[];
};

export type PublicMenuItemResponse = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: string;
};

export type PublicMenuTcpResponse = {
  categories: PublicMenuCategoryResponse[];
};
```

- [ ] **Step 6: Update TCP catalog barrel export**

Delete old files first, then rewrite `index.ts`:

```typescript
// libs/interfaces/src/lib/tcp/catalog/index.ts
export * from './category.interface';
export * from './area.interface';
export * from './menu-item.interface';
export * from './table.interface';
export * from './menu.interface';
```

- [ ] **Step 7: Create Category Gateway DTOs**

```typescript
// libs/interfaces/src/lib/gateway/catalog/category.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseResponseDto } from '../common/base-response.dto';

export class CreateCategoryRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;
}

export class UpdateCategoryRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;
}

class ReorderItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderCategoryRequestDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

export class CategoryResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  status: string;
}
```

- [ ] **Step 8: Create Area Gateway DTOs**

```typescript
// libs/interfaces/src/lib/gateway/catalog/area.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseResponseDto } from '../common/base-response.dto';

export class CreateAreaRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateAreaRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

class ReorderItemDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  sortOrder: number;
}

export class ReorderAreaRequestDto {
  @ApiProperty({ type: [ReorderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}

export class AreaResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;
}
```

- [ ] **Step 9: Create MenuItem Gateway DTOs**

```typescript
// libs/interfaces/src/lib/gateway/catalog/menu-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BaseResponseDto } from '../common/base-response.dto';

export class CreateMenuItemRequestDto {
  @ApiProperty()
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateMenuItemRequestDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ enum: ['available', 'out_of_stock'] })
  @IsEnum(['available', 'out_of_stock'])
  @IsOptional()
  status?: string;
}

export class MenuItemResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  imageUrl: string | null;

  @ApiPropertyOptional()
  imagePublicId: string | null;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  status: string;
}
```

- [ ] **Step 10: Create Table Gateway DTOs**

```typescript
// libs/interfaces/src/lib/gateway/catalog/table.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { BaseResponseDto } from '../common/base-response.dto';

export class CreateTableRequestDto {
  @ApiProperty()
  @IsUUID()
  areaId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}

export class UpdateTableRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  areaId?: string;
}

export class UpdateTableStatusRequestDto {
  @ApiProperty({ enum: ['available', 'occupied', 'billing', 'cleaning'] })
  @IsEnum(['available', 'occupied', 'billing', 'cleaning'])
  status: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sessionId?: string;
}

export class ValidateQrTokenRequestDto {
  @ApiProperty()
  @IsUUID()
  tableId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class TableResponseDto extends BaseResponseDto {
  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  areaId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  capacity: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  qrToken: string;

  @ApiPropertyOptional()
  sessionId: string | null;
}
```

- [ ] **Step 11: Create Menu Gateway DTOs**

```typescript
// libs/interfaces/src/lib/gateway/catalog/menu.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicMenuItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  imageUrl: string | null;

  @ApiProperty()
  status: string;
}

export class PublicMenuCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ type: [PublicMenuItemDto] })
  items: PublicMenuItemDto[];
}

export class PublicMenuResponseDto {
  @ApiProperty({ type: [PublicMenuCategoryDto] })
  categories: PublicMenuCategoryDto[];
}
```

- [ ] **Step 12: Update Gateway catalog barrel export**

Delete old files first, then rewrite `index.ts`:

```typescript
// libs/interfaces/src/lib/gateway/catalog/index.ts
export * from './category.dto';
export * from './area.dto';
export * from './menu-item.dto';
export * from './table.dto';
export * from './menu.dto';
```

- [ ] **Step 13: Commit**

```bash
git add libs/interfaces/src/lib/tcp/catalog/ libs/interfaces/src/lib/gateway/catalog/
git commit -m "feat(interfaces): add domain-specific TCP interfaces and gateway DTOs

Add Category, Area, MenuItem, Table, Menu TCP request/response types.
Add corresponding gateway DTOs with class-validator decorations.
Remove old generic Catalog interfaces and DTOs."
```

---

### Task 4: Catalog Service — Category Domain

**Files:**

- Create: `apps/catalog/src/category/category.repository.ts`
- Create: `apps/catalog/src/category/category.service.ts`
- Create: `apps/catalog/src/category/category.controller.ts`
- Create: `apps/catalog/src/category/category.module.ts`

- [ ] **Step 1: Create CategoryRepository**

```typescript
// apps/catalog/src/category/category.repository.ts
import { Category } from '@common/entities/category.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class CategoryRepository {
  constructor(@InjectRepository(Category) private readonly repo: Repository<Category>) {}

  create(data: Partial<Category>): Promise<Category> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAllByTenant(tenantId: string): Promise<Category[]> {
    return this.repo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<Category | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async existsByName(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<Category>): Promise<Category | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }

  async batchUpdateSortOrder(tenantId: string, items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      for (const item of items) {
        await manager.update(Category, { id: item.id, tenantId }, { sortOrder: item.sortOrder });
      }
    });
  }
}
```

- [ ] **Step 2: Create CategoryService**

```typescript
// apps/catalog/src/category/category.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from './category.repository';
import { Category } from '@common/entities/category.entity';
import {
  CreateCategoryTcpRequest,
  GetCategoryListTcpRequest,
  GetCategoryByIdTcpRequest,
  UpdateCategoryTcpRequest,
  DeleteCategoryTcpRequest,
  ReorderCategoryTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { MenuItem } from '@common/entities/menu-item.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async create(data: CreateCategoryTcpRequest): Promise<Category> {
    const exists = await this.categoryRepository.existsByName(data.tenantId, data.name.trim());
    if (exists) {
      throw new BadRequestException('Category name already exists');
    }

    return this.categoryRepository.create({
      tenantId: data.tenantId,
      name: data.name.trim(),
      sortOrder: data.sortOrder ?? 0,
      status: (data.status as Category['status']) ?? 'active',
    });
  }

  async getList(data: GetCategoryListTcpRequest): Promise<Category[]> {
    return this.categoryRepository.findAllByTenant(data.tenantId);
  }

  async getById(data: GetCategoryByIdTcpRequest): Promise<Category> {
    const category = await this.categoryRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(data: UpdateCategoryTcpRequest): Promise<Category> {
    const current = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.name && data.name.trim() !== current.name) {
      const exists = await this.categoryRepository.existsByName(data.tenantId, data.name.trim());
      if (exists) {
        throw new BadRequestException('Category name already exists');
      }
    }

    const updatePayload: Partial<Category> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;
    if (data.status !== undefined) updatePayload.status = data.status as Category['status'];

    const updated = await this.categoryRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Category not found');
    }
    return updated;
  }

  async delete(data: DeleteCategoryTcpRequest): Promise<void> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const menuItemCount = await this.menuItemRepo.count({
      where: { categoryId: data.id, tenantId: data.tenantId, deletedAt: IsNull() },
    });
    if (menuItemCount > 0) {
      throw new BadRequestException('Cannot delete category with active menu items');
    }

    await this.categoryRepository.deleteByIdAndTenant(data.id, data.tenantId);
  }

  async reorder(data: ReorderCategoryTcpRequest): Promise<Category[]> {
    await this.categoryRepository.batchUpdateSortOrder(data.tenantId, data.items);
    return this.categoryRepository.findAllByTenant(data.tenantId);
  }
}
```

- [ ] **Step 3: Create CategoryController (TCP)**

```typescript
// apps/catalog/src/category/category.controller.ts
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  CategoryTcpResponse,
  CreateCategoryTcpRequest,
  DeleteCategoryTcpRequest,
  GetCategoryByIdTcpRequest,
  GetCategoryListTcpRequest,
  ReorderCategoryTcpRequest,
  UpdateCategoryTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { CategoryService } from './category.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.CREATE)
  async create(@RequestParams() body: CreateCategoryTcpRequest): Promise<Response<CategoryTcpResponse>> {
    const result = await this.categoryService.create(body);
    return Response.success<CategoryTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.GET_LIST)
  async getList(@RequestParams() body: GetCategoryListTcpRequest): Promise<Response<CategoryTcpResponse[]>> {
    const result = await this.categoryService.getList(body);
    return Response.success<CategoryTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.GET_BY_ID)
  async getById(@RequestParams() body: GetCategoryByIdTcpRequest): Promise<Response<CategoryTcpResponse>> {
    const result = await this.categoryService.getById(body);
    return Response.success<CategoryTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.UPDATE)
  async update(@RequestParams() body: UpdateCategoryTcpRequest): Promise<Response<CategoryTcpResponse>> {
    const result = await this.categoryService.update(body);
    return Response.success<CategoryTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.DELETE)
  async remove(@RequestParams() body: DeleteCategoryTcpRequest): Promise<Response<boolean>> {
    await this.categoryService.delete(body);
    return Response.success<boolean>(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.CATEGORY.REORDER)
  async reorder(@RequestParams() body: ReorderCategoryTcpRequest): Promise<Response<CategoryTcpResponse[]>> {
    const result = await this.categoryService.reorder(body);
    return Response.success<CategoryTcpResponse[]>(result);
  }
}
```

- [ ] **Step 4: Create CategoryModule**

```typescript
// apps/catalog/src/category/category.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Category, MenuItem])],
  controllers: [CategoryController],
  providers: [CategoryService, CategoryRepository],
  exports: [CategoryService],
})
export class CategoryModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/catalog/src/category/
git commit -m "feat(catalog): implement Category domain (repository, service, TCP controller)

CRUD operations + unique name constraint + delete with menu items check
+ batch reorder in transaction."
```

---

### Task 5: Catalog Service — Area Domain

**Files:**

- Create: `apps/catalog/src/area/area.repository.ts`
- Create: `apps/catalog/src/area/area.service.ts`
- Create: `apps/catalog/src/area/area.controller.ts`
- Create: `apps/catalog/src/area/area.module.ts`

- [ ] **Step 1: Create AreaRepository**

```typescript
// apps/catalog/src/area/area.repository.ts
import { Area } from '@common/entities/area.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AreaRepository {
  constructor(@InjectRepository(Area) private readonly repo: Repository<Area>) {}

  create(data: Partial<Area>): Promise<Area> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAllByTenant(tenantId: string): Promise<Area[]> {
    return this.repo.find({
      where: { tenantId },
      order: { sortOrder: 'ASC' },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<Area | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async existsByName(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<Area>): Promise<Area | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }

  async batchUpdateSortOrder(tenantId: string, items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      for (const item of items) {
        await manager.update(Area, { id: item.id, tenantId }, { sortOrder: item.sortOrder });
      }
    });
  }
}
```

- [ ] **Step 2: Create AreaService**

```typescript
// apps/catalog/src/area/area.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AreaRepository } from './area.repository';
import { Area } from '@common/entities/area.entity';
import {
  CreateAreaTcpRequest,
  GetAreaListTcpRequest,
  GetAreaByIdTcpRequest,
  UpdateAreaTcpRequest,
  DeleteAreaTcpRequest,
  ReorderAreaTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Table } from '@common/entities/table.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AreaService {
  constructor(
    private readonly areaRepository: AreaRepository,
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
  ) {}

  async create(data: CreateAreaTcpRequest): Promise<Area> {
    const exists = await this.areaRepository.existsByName(data.tenantId, data.name.trim());
    if (exists) {
      throw new BadRequestException('Area name already exists');
    }

    return this.areaRepository.create({
      tenantId: data.tenantId,
      name: data.name.trim(),
      sortOrder: data.sortOrder ?? 0,
    });
  }

  async getList(data: GetAreaListTcpRequest): Promise<Area[]> {
    return this.areaRepository.findAllByTenant(data.tenantId);
  }

  async getById(data: GetAreaByIdTcpRequest): Promise<Area> {
    const area = await this.areaRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!area) {
      throw new NotFoundException('Area not found');
    }
    return area;
  }

  async update(data: UpdateAreaTcpRequest): Promise<Area> {
    const current = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.name && data.name.trim() !== current.name) {
      const exists = await this.areaRepository.existsByName(data.tenantId, data.name.trim());
      if (exists) {
        throw new BadRequestException('Area name already exists');
      }
    }

    const updatePayload: Partial<Area> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;

    const updated = await this.areaRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Area not found');
    }
    return updated;
  }

  async delete(data: DeleteAreaTcpRequest): Promise<void> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const tableCount = await this.tableRepo.count({
      where: { areaId: data.id, tenantId: data.tenantId },
    });
    if (tableCount > 0) {
      throw new BadRequestException('Cannot delete area with tables');
    }

    await this.areaRepository.deleteByIdAndTenant(data.id, data.tenantId);
  }

  async reorder(data: ReorderAreaTcpRequest): Promise<Area[]> {
    await this.areaRepository.batchUpdateSortOrder(data.tenantId, data.items);
    return this.areaRepository.findAllByTenant(data.tenantId);
  }
}
```

- [ ] **Step 3: Create AreaController (TCP)**

```typescript
// apps/catalog/src/area/area.controller.ts
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  AreaTcpResponse,
  CreateAreaTcpRequest,
  DeleteAreaTcpRequest,
  GetAreaByIdTcpRequest,
  GetAreaListTcpRequest,
  ReorderAreaTcpRequest,
  UpdateAreaTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AreaService } from './area.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.CREATE)
  async create(@RequestParams() body: CreateAreaTcpRequest): Promise<Response<AreaTcpResponse>> {
    const result = await this.areaService.create(body);
    return Response.success<AreaTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.GET_LIST)
  async getList(@RequestParams() body: GetAreaListTcpRequest): Promise<Response<AreaTcpResponse[]>> {
    const result = await this.areaService.getList(body);
    return Response.success<AreaTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.GET_BY_ID)
  async getById(@RequestParams() body: GetAreaByIdTcpRequest): Promise<Response<AreaTcpResponse>> {
    const result = await this.areaService.getById(body);
    return Response.success<AreaTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.UPDATE)
  async update(@RequestParams() body: UpdateAreaTcpRequest): Promise<Response<AreaTcpResponse>> {
    const result = await this.areaService.update(body);
    return Response.success<AreaTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.DELETE)
  async remove(@RequestParams() body: DeleteAreaTcpRequest): Promise<Response<boolean>> {
    await this.areaService.delete(body);
    return Response.success<boolean>(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.AREA.REORDER)
  async reorder(@RequestParams() body: ReorderAreaTcpRequest): Promise<Response<AreaTcpResponse[]>> {
    const result = await this.areaService.reorder(body);
    return Response.success<AreaTcpResponse[]>(result);
  }
}
```

- [ ] **Step 4: Create AreaModule**

```typescript
// apps/catalog/src/area/area.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from '@common/entities/area.entity';
import { Table } from '@common/entities/table.entity';
import { AreaController } from './area.controller';
import { AreaService } from './area.service';
import { AreaRepository } from './area.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Area, Table])],
  controllers: [AreaController],
  providers: [AreaService, AreaRepository],
  exports: [AreaService],
})
export class AreaModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/catalog/src/area/
git commit -m "feat(catalog): implement Area domain (repository, service, TCP controller)

CRUD operations + unique name constraint + delete with tables check
+ batch reorder in transaction."
```

---

### Task 6: Catalog Service — MenuItem Domain

**Files:**

- Create: `apps/catalog/src/menu-item/menu-item.repository.ts`
- Create: `apps/catalog/src/menu-item/menu-item.service.ts`
- Create: `apps/catalog/src/menu-item/menu-item.controller.ts`
- Create: `apps/catalog/src/menu-item/menu-item.module.ts`

- [ ] **Step 1: Create MenuItemRepository**

```typescript
// apps/catalog/src/menu-item/menu-item.repository.ts
import { MenuItem } from '@common/entities/menu-item.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class MenuItemRepository {
  constructor(@InjectRepository(MenuItem) private readonly repo: Repository<MenuItem>) {}

  create(data: Partial<MenuItem>): Promise<MenuItem> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAllByTenant(tenantId: string, categoryId?: string): Promise<MenuItem[]> {
    const where: Record<string, unknown> = { tenantId, deletedAt: IsNull() };
    if (categoryId) {
      where.categoryId = categoryId;
    }
    return this.repo.find({
      where,
      order: { sortOrder: 'ASC' },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<MenuItem | null> {
    return this.repo.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<MenuItem>): Promise<MenuItem | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.softDelete({ id, tenantId });
  }
}
```

- [ ] **Step 2: Create MenuItemService**

```typescript
// apps/catalog/src/menu-item/menu-item.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MenuItemRepository } from './menu-item.repository';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Category } from '@common/entities/category.entity';
import {
  CreateMenuItemTcpRequest,
  GetMenuItemListTcpRequest,
  GetMenuItemByIdTcpRequest,
  UpdateMenuItemTcpRequest,
  SoftDeleteMenuItemTcpRequest,
  UpdateMenuItemImageTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class MenuItemService {
  constructor(
    private readonly menuItemRepository: MenuItemRepository,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(data: CreateMenuItemTcpRequest): Promise<MenuItem> {
    const category = await this.categoryRepo.findOne({
      where: { id: data.categoryId, tenantId: data.tenantId },
    });
    if (!category) {
      throw new BadRequestException('Category not found in this tenant');
    }

    return this.menuItemRepository.create({
      tenantId: data.tenantId,
      categoryId: data.categoryId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      stock: data.stock ?? 0,
      sortOrder: data.sortOrder ?? 0,
    });
  }

  async getList(data: GetMenuItemListTcpRequest): Promise<MenuItem[]> {
    return this.menuItemRepository.findAllByTenant(data.tenantId, data.categoryId);
  }

  async getById(data: GetMenuItemByIdTcpRequest): Promise<MenuItem> {
    const item = await this.menuItemRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  async update(data: UpdateMenuItemTcpRequest): Promise<MenuItem> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: data.categoryId, tenantId: data.tenantId },
      });
      if (!category) {
        throw new BadRequestException('Category not found in this tenant');
      }
    }

    const updatePayload: Partial<MenuItem> = {};
    if (data.categoryId !== undefined) updatePayload.categoryId = data.categoryId;
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.description !== undefined) updatePayload.description = data.description?.trim() || null;
    if (data.price !== undefined) updatePayload.price = data.price;
    if (data.stock !== undefined) updatePayload.stock = data.stock;
    if (data.sortOrder !== undefined) updatePayload.sortOrder = data.sortOrder;
    if (data.status !== undefined) updatePayload.status = data.status as MenuItem['status'];

    const updated = await this.menuItemRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Menu item not found');
    }
    return updated;
  }

  async softDelete(data: SoftDeleteMenuItemTcpRequest): Promise<void> {
    await this.getById({ id: data.id, tenantId: data.tenantId });
    await this.menuItemRepository.softDelete(data.id, data.tenantId);
  }

  async updateImage(data: UpdateMenuItemImageTcpRequest): Promise<MenuItem> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const updated = await this.menuItemRepository.updateByIdAndTenant(data.id, data.tenantId, {
      imageUrl: data.imageUrl,
      imagePublicId: data.imagePublicId,
    });
    if (!updated) {
      throw new NotFoundException('Menu item not found');
    }
    return updated;
  }
}
```

- [ ] **Step 3: Create MenuItemController (TCP)**

```typescript
// apps/catalog/src/menu-item/menu-item.controller.ts
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  MenuItemTcpResponse,
  CreateMenuItemTcpRequest,
  GetMenuItemListTcpRequest,
  GetMenuItemByIdTcpRequest,
  UpdateMenuItemTcpRequest,
  SoftDeleteMenuItemTcpRequest,
  UpdateMenuItemImageTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MenuItemService } from './menu-item.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.CREATE)
  async create(@RequestParams() body: CreateMenuItemTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.create(body);
    return Response.success<MenuItemTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.GET_LIST)
  async getList(@RequestParams() body: GetMenuItemListTcpRequest): Promise<Response<MenuItemTcpResponse[]>> {
    const result = await this.menuItemService.getList(body);
    return Response.success<MenuItemTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.GET_BY_ID)
  async getById(@RequestParams() body: GetMenuItemByIdTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.getById(body);
    return Response.success<MenuItemTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.UPDATE)
  async update(@RequestParams() body: UpdateMenuItemTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.update(body);
    return Response.success<MenuItemTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.SOFT_DELETE)
  async softDelete(@RequestParams() body: SoftDeleteMenuItemTcpRequest): Promise<Response<boolean>> {
    await this.menuItemService.softDelete(body);
    return Response.success<boolean>(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.UPDATE_IMAGE)
  async updateImage(@RequestParams() body: UpdateMenuItemImageTcpRequest): Promise<Response<MenuItemTcpResponse>> {
    const result = await this.menuItemService.updateImage(body);
    return Response.success<MenuItemTcpResponse>(result);
  }
}
```

- [ ] **Step 4: Create MenuItemModule**

```typescript
// apps/catalog/src/menu-item/menu-item.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Category } from '@common/entities/category.entity';
import { MenuItemController } from './menu-item.controller';
import { MenuItemService } from './menu-item.service';
import { MenuItemRepository } from './menu-item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem, Category])],
  controllers: [MenuItemController],
  providers: [MenuItemService, MenuItemRepository],
  exports: [MenuItemService],
})
export class MenuItemModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/catalog/src/menu-item/
git commit -m "feat(catalog): implement MenuItem domain (repository, service, TCP controller)

CRUD + soft delete + image URL update + category validation.
Phase 2A will add cross-service active order check."
```

---

### Task 7: Catalog Service — Table Domain + State Machine + QR Token

**Files:**

- Create: `apps/catalog/src/table/table.repository.ts`
- Create: `apps/catalog/src/table/table.service.ts`
- Create: `apps/catalog/src/table/table.controller.ts`
- Create: `apps/catalog/src/table/table.module.ts`

- [ ] **Step 1: Create TableRepository**

```typescript
// apps/catalog/src/table/table.repository.ts
import { Table } from '@common/entities/table.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class TableRepository {
  constructor(@InjectRepository(Table) private readonly repo: Repository<Table>) {}

  create(data: Partial<Table>): Promise<Table> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  findAllByTenant(tenantId: string, areaId?: string, status?: string): Promise<Table[]> {
    const where: Record<string, unknown> = { tenantId };
    if (areaId) where.areaId = areaId;
    if (status) where.status = status;
    return this.repo.find({
      where,
      order: { areaId: 'ASC', name: 'ASC' },
    });
  }

  findByIdAndTenant(id: string, tenantId: string): Promise<Table | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async existsByName(tenantId: string, name: string): Promise<boolean> {
    const count = await this.repo.count({ where: { tenantId, name } });
    return count > 0;
  }

  async updateByIdAndTenant(id: string, tenantId: string, data: Partial<Table>): Promise<Table | null> {
    await this.repo.update({ id, tenantId }, data);
    return this.findByIdAndTenant(id, tenantId);
  }

  async deleteByIdAndTenant(id: string, tenantId: string): Promise<void> {
    await this.repo.delete({ id, tenantId });
  }

  findByQrToken(tenantId: string, qrToken: string): Promise<Table | null> {
    return this.repo.findOne({ where: { tenantId, qrToken } });
  }
}
```

- [ ] **Step 2: Create TableService with State Machine + QR Token**

```typescript
// apps/catalog/src/table/table.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { TableRepository } from './table.repository';
import { Table, TableStatus } from '@common/entities/table.entity';
import { Area } from '@common/entities/area.entity';
import {
  CreateTableTcpRequest,
  GetTableListTcpRequest,
  GetTableByIdTcpRequest,
  UpdateTableTcpRequest,
  DeleteTableTcpRequest,
  UpdateTableStatusTcpRequest,
  ValidateQrTokenTcpRequest,
  RegenerateQrTokenTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const VALID_TRANSITIONS: Record<TableStatus, TableStatus[]> = {
  available: ['occupied'],
  occupied: ['billing'],
  billing: ['occupied', 'cleaning'],
  cleaning: ['available'],
};

@Injectable()
export class TableService {
  private readonly qrTokenSecret: string;

  constructor(
    private readonly tableRepository: TableRepository,
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
    private readonly configService: ConfigService,
  ) {
    this.qrTokenSecret = this.configService.get<string>('QR_TOKEN_SECRET', 'default-secret-change-me');
  }

  private generateQrToken(tableId: string, tenantId: string): string {
    return createHmac('sha256', this.qrTokenSecret).update(`${tableId}${tenantId}`).digest('hex');
  }

  async create(data: CreateTableTcpRequest): Promise<Table> {
    const area = await this.areaRepo.findOne({
      where: { id: data.areaId, tenantId: data.tenantId },
    });
    if (!area) {
      throw new BadRequestException('Area not found in this tenant');
    }

    const nameExists = await this.tableRepository.existsByName(data.tenantId, data.name.trim());
    if (nameExists) {
      throw new BadRequestException('Table name already exists');
    }

    const table = await this.tableRepository.create({
      tenantId: data.tenantId,
      areaId: data.areaId,
      name: data.name.trim(),
      capacity: data.capacity ?? 1,
      status: 'available' as TableStatus,
      qrToken: 'temp',
      sessionId: null,
    });

    // Generate QR token with actual table ID
    const qrToken = this.generateQrToken(table.id, data.tenantId);
    const updated = await this.tableRepository.updateByIdAndTenant(table.id, data.tenantId, { qrToken });
    return updated!;
  }

  async getList(data: GetTableListTcpRequest): Promise<Table[]> {
    return this.tableRepository.findAllByTenant(data.tenantId, data.areaId, data.status);
  }

  async getById(data: GetTableByIdTcpRequest): Promise<Table> {
    const table = await this.tableRepository.findByIdAndTenant(data.id, data.tenantId);
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  async update(data: UpdateTableTcpRequest): Promise<Table> {
    const current = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (data.name && data.name.trim() !== current.name) {
      const nameExists = await this.tableRepository.existsByName(data.tenantId, data.name.trim());
      if (nameExists) {
        throw new BadRequestException('Table name already exists');
      }
    }

    if (data.areaId) {
      const area = await this.areaRepo.findOne({
        where: { id: data.areaId, tenantId: data.tenantId },
      });
      if (!area) {
        throw new BadRequestException('Area not found in this tenant');
      }
    }

    const updatePayload: Partial<Table> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.capacity !== undefined) updatePayload.capacity = data.capacity;
    if (data.areaId !== undefined) updatePayload.areaId = data.areaId;

    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Table not found');
    }
    return updated;
  }

  async delete(data: DeleteTableTcpRequest): Promise<void> {
    const table = await this.getById({ id: data.id, tenantId: data.tenantId });

    if (table.sessionId || table.status !== 'available') {
      throw new BadRequestException('Cannot delete active table');
    }

    await this.tableRepository.deleteByIdAndTenant(data.id, data.tenantId);
  }

  async updateStatus(data: UpdateTableStatusTcpRequest): Promise<Table> {
    const table = await this.getById({ id: data.id, tenantId: data.tenantId });
    const newStatus = data.status as TableStatus;

    const allowedTransitions = VALID_TRANSITIONS[table.status as TableStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition: ${table.status} → ${newStatus}. Allowed: ${allowedTransitions?.join(', ') || 'none'}`,
      );
    }

    const updatePayload: Partial<Table> = { status: newStatus };

    if (newStatus === 'available') {
      updatePayload.sessionId = null;
    }
    if (newStatus === 'occupied' && data.sessionId) {
      updatePayload.sessionId = data.sessionId;
    }

    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, updatePayload);
    if (!updated) {
      throw new NotFoundException('Table not found');
    }
    return updated;
  }

  async validateQrToken(data: ValidateQrTokenTcpRequest): Promise<Table> {
    const expectedToken = this.generateQrToken(data.tableId, data.tenantId);

    const tokenBuffer = Buffer.from(data.token, 'hex');
    const expectedBuffer = Buffer.from(expectedToken, 'hex');

    if (tokenBuffer.length !== expectedBuffer.length || !timingSafeEqual(tokenBuffer, expectedBuffer)) {
      throw new BadRequestException('Invalid QR token');
    }

    const table = await this.tableRepository.findByIdAndTenant(data.tableId, data.tenantId);
    if (!table) {
      throw new NotFoundException('Table not found');
    }
    return table;
  }

  async regenerateQrToken(data: RegenerateQrTokenTcpRequest): Promise<Table> {
    await this.getById({ id: data.id, tenantId: data.tenantId });

    const newToken = this.generateQrToken(data.id, data.tenantId);
    const updated = await this.tableRepository.updateByIdAndTenant(data.id, data.tenantId, { qrToken: newToken });
    if (!updated) {
      throw new NotFoundException('Table not found');
    }
    return updated;
  }
}
```

- [ ] **Step 3: Create TableController (TCP)**

```typescript
// apps/catalog/src/table/table.controller.ts
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  TableTcpResponse,
  CreateTableTcpRequest,
  GetTableListTcpRequest,
  GetTableByIdTcpRequest,
  UpdateTableTcpRequest,
  DeleteTableTcpRequest,
  UpdateTableStatusTcpRequest,
  ValidateQrTokenTcpRequest,
  RegenerateQrTokenTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { TableService } from './table.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class TableController {
  constructor(private readonly tableService: TableService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.CREATE)
  async create(@RequestParams() body: CreateTableTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.create(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.GET_LIST)
  async getList(@RequestParams() body: GetTableListTcpRequest): Promise<Response<TableTcpResponse[]>> {
    const result = await this.tableService.getList(body);
    return Response.success<TableTcpResponse[]>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.GET_BY_ID)
  async getById(@RequestParams() body: GetTableByIdTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.getById(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.UPDATE)
  async update(@RequestParams() body: UpdateTableTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.update(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.DELETE)
  async remove(@RequestParams() body: DeleteTableTcpRequest): Promise<Response<boolean>> {
    await this.tableService.delete(body);
    return Response.success<boolean>(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS)
  async updateStatus(@RequestParams() body: UpdateTableStatusTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.updateStatus(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN)
  async validateQrToken(@RequestParams() body: ValidateQrTokenTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.validateQrToken(body);
    return Response.success<TableTcpResponse>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.TABLE.REGENERATE_QR_TOKEN)
  async regenerateQrToken(@RequestParams() body: RegenerateQrTokenTcpRequest): Promise<Response<TableTcpResponse>> {
    const result = await this.tableService.regenerateQrToken(body);
    return Response.success<TableTcpResponse>(result);
  }
}
```

- [ ] **Step 4: Create TableModule**

```typescript
// apps/catalog/src/table/table.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from '@common/entities/table.entity';
import { Area } from '@common/entities/area.entity';
import { TableController } from './table.controller';
import { TableService } from './table.service';
import { TableRepository } from './table.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Table, Area])],
  controllers: [TableController],
  providers: [TableService, TableRepository],
  exports: [TableService],
})
export class TableModule {}
```

- [ ] **Step 5: Commit**

```bash
git add apps/catalog/src/table/
git commit -m "feat(catalog): implement Table domain with state machine + QR token

CRUD + 5 state transitions with validation + HMAC-SHA256 QR token
generate/validate. Phase 2+ can wire triggers to existing endpoints."
```

---

### Task 8: Catalog Service — Menu Aggregation + App Module Update

**Files:**

- Create: `apps/catalog/src/menu/menu.service.ts`
- Create: `apps/catalog/src/menu/menu.controller.ts`
- Create: `apps/catalog/src/menu/menu.module.ts`
- Modify: `apps/catalog/src/app.module.ts`
- Delete: `apps/catalog/src/controllers/catalog.controller.ts`
- Delete: `apps/catalog/src/services/catalog.service.ts`
- Delete: `apps/catalog/src/repositories/catalog.repository.ts`
- Delete: `apps/catalog/src/entities/catalog.entity.ts`
- Delete: `apps/catalog/src/dtos/` (all files)

- [ ] **Step 1: Create MenuService (aggregation)**

```typescript
// apps/catalog/src/menu/menu.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { GetPublicMenuTcpRequest, PublicMenuTcpResponse } from '@common/interfaces/tcp/catalog';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
  ) {}

  async getPublicMenu(data: GetPublicMenuTcpRequest): Promise<PublicMenuTcpResponse> {
    const categories = await this.categoryRepo.find({
      where: { tenantId: data.tenantId, status: 'active' },
      order: { sortOrder: 'ASC' },
    });

    const result = await Promise.all(
      categories.map(async (category) => {
        const items = await this.menuItemRepo.find({
          where: {
            tenantId: data.tenantId,
            categoryId: category.id,
            status: 'available',
            deletedAt: IsNull(),
          },
          order: { sortOrder: 'ASC' },
        });

        return {
          id: category.id,
          name: category.name,
          sortOrder: category.sortOrder,
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            imageUrl: item.imageUrl,
            status: item.status,
          })),
        };
      }),
    );

    return { categories: result };
  }
}
```

- [ ] **Step 2: Create MenuController (TCP)**

```typescript
// apps/catalog/src/menu/menu.controller.ts
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import { GetPublicMenuTcpRequest, PublicMenuTcpResponse } from '@common/interfaces/tcp/catalog';
import { Controller, UseInterceptors } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { MenuService } from './menu.service';

@UseInterceptors(TcpLoggingInterceptor)
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.MENU.GET_PUBLIC_MENU)
  async getPublicMenu(@RequestParams() body: GetPublicMenuTcpRequest): Promise<Response<PublicMenuTcpResponse>> {
    const result = await this.menuService.getPublicMenu(body);
    return Response.success<PublicMenuTcpResponse>(result);
  }
}
```

- [ ] **Step 3: Create MenuModule**

```typescript
// apps/catalog/src/menu/menu.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, MenuItem])],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule {}
```

- [ ] **Step 4: Delete old catalog files**

Delete these files:

- `apps/catalog/src/controllers/catalog.controller.ts`
- `apps/catalog/src/services/catalog.service.ts`
- `apps/catalog/src/repositories/catalog.repository.ts`
- `apps/catalog/src/entities/catalog.entity.ts`
- `apps/catalog/src/dtos/create-catalog.dto.ts`
- `apps/catalog/src/dtos/update-catalog.dto.ts`
- `apps/catalog/src/dtos/catalog-response.dto.ts`

Then delete the empty directories: `apps/catalog/src/controllers/`, `apps/catalog/src/services/`, `apps/catalog/src/repositories/`, `apps/catalog/src/entities/`, `apps/catalog/src/dtos/`

- [ ] **Step 5: Update AppModule**

```typescript
// apps/catalog/src/app.module.ts
import { TypeOrmProvider } from '@common/configuration/type-orm.config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CONFIGURATION, TConfiguration } from './configuration';
import { CategoryModule } from './category/category.module';
import { AreaModule } from './area/area.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { TableModule } from './table/table.module';
import { MenuModule } from './menu/menu.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    TypeOrmProvider,
    CategoryModule,
    AreaModule,
    MenuItemModule,
    TableModule,
    MenuModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
```

- [ ] **Step 6: Verify Catalog Service compiles**

Run: `npx nx lint catalog --fix`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/catalog/src/
git commit -m "feat(catalog): add Menu aggregation + rewire AppModule

Replace old generic catalog files with 5 domain modules.
Menu aggregation returns categories with available items."
```

---

### Task 9: BFF — Admin + Public Controllers + Cache + Image Upload

**Files:**

- Create: `apps/bff/src/app/modules/catalog/controllers/category.controller.ts`
- Create: `apps/bff/src/app/modules/catalog/controllers/area.controller.ts`
- Create: `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`
- Create: `apps/bff/src/app/modules/catalog/controllers/table.controller.ts`
- Create: `apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`
- Delete: `apps/bff/src/app/modules/catalog/controllers/catalog.controller.ts`
- Modify: `apps/bff/src/app/modules/catalog/catalog.module.ts`

- [ ] **Step 1: Create BFF CategoryController**

```typescript
// apps/bff/src/app/modules/catalog/controllers/category.controller.ts
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { MetadataKey } from '@common/constants/common.constant';
import { Authorization } from '@common/decorators/authorizer.decorator';
import { Permissions } from '@common/decorators/permission.decorator';
import { ProcessId } from '@common/decorators/processId.decorator';
import { PERMISSION } from '@common/constants/enum/role.enum';
import {
  CreateCategoryRequestDto,
  UpdateCategoryRequestDto,
  ReorderCategoryRequestDto,
  CategoryResponseDto,
} from '@common/interfaces/gateway/catalog';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import {
  CategoryTcpResponse,
  CreateCategoryTcpRequest,
  DeleteCategoryTcpRequest,
  GetCategoryByIdTcpRequest,
  GetCategoryListTcpRequest,
  ReorderCategoryTcpRequest,
  UpdateCategoryTcpRequest,
} from '@common/interfaces/tcp/catalog';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';

@ApiTags('Admin - Categories')
@Controller('admin/categories')
export class CategoryAdminController {
  constructor(
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private async invalidateMenuCache(req: Request): Promise<void> {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    if (tenantId) {
      await this.cacheManager.del(`menu:${tenantId}`);
    }
  }

  @Post()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_CREATE])
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto> })
  @ApiOperation({ summary: 'Create a new category' })
  async create(@Body() body: CreateCategoryRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    const result = await firstValueFrom(
      this.catalogClient
        .send<CategoryTcpResponse, CreateCategoryTcpRequest>(
          TCP_REQUEST_MESSAGE.CATEGORY.CREATE,
          buildTcpRequestContext<CreateCategoryTcpRequest>(req, processId, {
            tenantId: req[MetadataKey.TENANT_ID] as string,
            ...body,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<CategoryTcpResponse>({
                data: response.data,
                statusCode: response.statusCode,
                message: response.code as HTTP_MESSAGE,
              }),
          ),
        ),
    );
    await this.invalidateMenuCache(req);
    return result;
  }

  @Get()
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_GET_LIST])
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto[]> })
  @ApiOperation({ summary: 'Get all categories' })
  findAll(@ProcessId() processId: string, @Req() req: Request) {
    return this.catalogClient
      .send<CategoryTcpResponse[], GetCategoryListTcpRequest>(
        TCP_REQUEST_MESSAGE.CATEGORY.GET_LIST,
        buildTcpRequestContext<GetCategoryListTcpRequest>(req, processId, {
          tenantId: req[MetadataKey.TENANT_ID] as string,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<CategoryTcpResponse[]>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Get(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_GET_BY_ID])
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto> })
  @ApiOperation({ summary: 'Get category by id' })
  findById(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    return this.catalogClient
      .send<CategoryTcpResponse, GetCategoryByIdTcpRequest>(
        TCP_REQUEST_MESSAGE.CATEGORY.GET_BY_ID,
        buildTcpRequestContext<GetCategoryByIdTcpRequest>(req, processId, {
          id,
          tenantId: req[MetadataKey.TENANT_ID] as string,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<CategoryTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }

  @Patch('reorder')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto[]> })
  @ApiOperation({ summary: 'Reorder categories' })
  async reorder(@Body() body: ReorderCategoryRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    const result = await firstValueFrom(
      this.catalogClient
        .send<CategoryTcpResponse[], ReorderCategoryTcpRequest>(
          TCP_REQUEST_MESSAGE.CATEGORY.REORDER,
          buildTcpRequestContext<ReorderCategoryTcpRequest>(req, processId, {
            tenantId: req[MetadataKey.TENANT_ID] as string,
            ...body,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<CategoryTcpResponse[]>({
                data: response.data,
                statusCode: response.statusCode,
                message: response.code as HTTP_MESSAGE,
              }),
          ),
        ),
    );
    await this.invalidateMenuCache(req);
    return result;
  }

  @Patch(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_UPDATE])
  @ApiOkResponse({ type: ResponseDto<CategoryResponseDto> })
  @ApiOperation({ summary: 'Update category by id' })
  async update(
    @Param('id') id: string,
    @Body() body: UpdateCategoryRequestDto,
    @ProcessId() processId: string,
    @Req() req: Request,
  ) {
    const result = await firstValueFrom(
      this.catalogClient
        .send<CategoryTcpResponse, UpdateCategoryTcpRequest>(
          TCP_REQUEST_MESSAGE.CATEGORY.UPDATE,
          buildTcpRequestContext<UpdateCategoryTcpRequest>(req, processId, {
            id,
            tenantId: req[MetadataKey.TENANT_ID] as string,
            ...body,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<CategoryTcpResponse>({
                data: response.data,
                statusCode: response.statusCode,
                message: response.code as HTTP_MESSAGE,
              }),
          ),
        ),
    );
    await this.invalidateMenuCache(req);
    return result;
  }

  @Delete(':id')
  @Authorization({ secured: true })
  @Permissions([PERMISSION.CATALOG_DELETE])
  @ApiOkResponse({ type: ResponseDto<boolean> })
  @ApiOperation({ summary: 'Delete category by id' })
  async remove(@Param('id') id: string, @ProcessId() processId: string, @Req() req: Request) {
    const result = await firstValueFrom(
      this.catalogClient
        .send<boolean, DeleteCategoryTcpRequest>(
          TCP_REQUEST_MESSAGE.CATEGORY.DELETE,
          buildTcpRequestContext<DeleteCategoryTcpRequest>(req, processId, {
            id,
            tenantId: req[MetadataKey.TENANT_ID] as string,
          }),
        )
        .pipe(
          map(
            (response) =>
              new ResponseDto<boolean>({
                data: response.data,
                statusCode: response.statusCode,
                message: response.code as HTTP_MESSAGE,
              }),
          ),
        ),
    );
    await this.invalidateMenuCache(req);
    return result;
  }
}
```

- [ ] **Step 2: Create BFF AreaController**

Same pattern as CategoryAdminController but for Area endpoints. Path: `admin/areas`.
Use `TCP_REQUEST_MESSAGE.AREA.*` patterns. Invalidate menu cache on create/update/delete/reorder is NOT needed (areas don't affect public menu). Skip `invalidateMenuCache` calls.

File: `apps/bff/src/app/modules/catalog/controllers/area.controller.ts`

Follow the exact same pattern as `category.controller.ts` but:

- Replace all `Category` types with `Area` types
- Use `TCP_REQUEST_MESSAGE.AREA.*`
- Controller path: `admin/areas`
- Class name: `AreaAdminController`
- No cache invalidation (areas don't appear in public menu)

- [ ] **Step 3: Create BFF MenuItemController with image upload**

File: `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`

Follow the same TCP proxy pattern but add image upload endpoint:

```typescript
// Key additions compared to category controller:
// 1. Import FileInterceptor from @nestjs/platform-express
// 2. Import CloudinaryService from @common/providers/cloudinary/cloudinary.service
// 3. Add POST :id/image endpoint with @UseInterceptors(FileInterceptor('image'))

// Image upload endpoint logic:
@Post(':id/image')
@Authorization({ secured: true })
@Permissions([PERMISSION.CATALOG_UPDATE])
@UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
@ApiOperation({ summary: 'Upload menu item image' })
async uploadImage(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
  @ProcessId() processId: string,
  @Req() req: Request,
) {
  if (!file) {
    throw new BadRequestException('Image file is required');
  }

  const tenantId = req[MetadataKey.TENANT_ID] as string;

  // 1. Get current menu item to check for existing image
  const currentItem = await firstValueFrom(
    this.catalogClient
      .send<MenuItemTcpResponse, GetMenuItemByIdTcpRequest>(
        TCP_REQUEST_MESSAGE.MENU_ITEM.GET_BY_ID,
        buildTcpRequestContext<GetMenuItemByIdTcpRequest>(req, processId, { id, tenantId }),
      )
      .pipe(map((r) => r.data)),
  );

  // 2. Upload new image to Cloudinary
  const uploadResult = await this.cloudinaryService.uploadImage(file.buffer, {
    tenantId,
    folder: 'menu',
    mimetype: file.mimetype,
    fileName: file.originalname,
  });

  // 3. Delete old image if exists
  if (currentItem?.imagePublicId) {
    await this.cloudinaryService.deleteImage(currentItem.imagePublicId);
  }

  // 4. Update menu item via TCP
  const result = await firstValueFrom(
    this.catalogClient
      .send<MenuItemTcpResponse, UpdateMenuItemImageTcpRequest>(
        TCP_REQUEST_MESSAGE.MENU_ITEM.UPDATE_IMAGE,
        buildTcpRequestContext<UpdateMenuItemImageTcpRequest>(req, processId, {
          id,
          tenantId,
          imageUrl: uploadResult.secureUrl,
          imagePublicId: uploadResult.publicId,
        }),
      )
      .pipe(map((response) => new ResponseDto<MenuItemTcpResponse>({ data: response.data, statusCode: response.statusCode, message: response.code as HTTP_MESSAGE }))),
  );

  // 5. Invalidate menu cache
  await this.invalidateMenuCache(req);
  return result;
}
```

Standard CRUD endpoints follow the same TCP proxy pattern. All create/update/delete/softDelete/uploadImage invalidate menu cache.

- [ ] **Step 4: Create BFF TableController**

File: `apps/bff/src/app/modules/catalog/controllers/table.controller.ts`

Same TCP proxy pattern. Additional endpoints:

- `PATCH :id/status` → `TABLE.UPDATE_STATUS`
- `POST :id/regenerate-qr` → `TABLE.REGENERATE_QR_TOKEN`

No menu cache invalidation needed (tables don't affect public menu).

- [ ] **Step 5: Create BFF MenuController (public, with cache)**

```typescript
// apps/bff/src/app/modules/catalog/controllers/menu.controller.ts
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { MetadataKey } from '@common/constants/common.constant';
import { ProcessId } from '@common/decorators/processId.decorator';
import { PublicMenuResponseDto, PublicMenuCategoryDto } from '@common/interfaces/gateway/catalog';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { GetPublicMenuTcpRequest, PublicMenuTcpResponse } from '@common/interfaces/tcp/catalog';
import { ValidateQrTokenRequestDto } from '@common/interfaces/gateway/catalog';
import { ValidateQrTokenTcpRequest, TableTcpResponse } from '@common/interfaces/tcp/catalog';
import { buildTcpRequestContext } from '@common/utils/request.util';
import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { firstValueFrom, map } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';

@ApiTags('Public Menu')
@Controller('menu')
export class MenuPublicController {
  private static readonly MENU_CACHE_TTL = 600; // 10 minutes in seconds

  constructor(
    @Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get()
  @ApiOkResponse({ type: ResponseDto<PublicMenuResponseDto> })
  @ApiOperation({ summary: 'Get public menu (cached)' })
  async getMenu(@ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;
    const cacheKey = `menu:${tenantId}`;

    // Check cache first
    const cached = await this.cacheManager.get<PublicMenuTcpResponse>(cacheKey);
    if (cached) {
      return new ResponseDto<PublicMenuTcpResponse>({ data: cached, statusCode: 200, message: HTTP_MESSAGE.OK });
    }

    // Cache miss → TCP call
    const result = await firstValueFrom(
      this.catalogClient
        .send<
          PublicMenuTcpResponse,
          GetPublicMenuTcpRequest
        >(TCP_REQUEST_MESSAGE.MENU.GET_PUBLIC_MENU, buildTcpRequestContext<GetPublicMenuTcpRequest>(req, processId, { tenantId }))
        .pipe(map((response) => response.data)),
    );

    // Store in cache
    if (result) {
      await this.cacheManager.set(cacheKey, result, MenuPublicController.MENU_CACHE_TTL * 1000);
    }

    return new ResponseDto<PublicMenuTcpResponse>({ data: result, statusCode: 200, message: HTTP_MESSAGE.OK });
  }

  @Post('validate-qr')
  @ApiOkResponse({ type: ResponseDto })
  @ApiOperation({ summary: 'Validate QR token' })
  validateQr(@Body() body: ValidateQrTokenRequestDto, @ProcessId() processId: string, @Req() req: Request) {
    const tenantId = req[MetadataKey.TENANT_ID] as string;

    return this.catalogClient
      .send<TableTcpResponse, ValidateQrTokenTcpRequest>(
        TCP_REQUEST_MESSAGE.TABLE.VALIDATE_QR_TOKEN,
        buildTcpRequestContext<ValidateQrTokenTcpRequest>(req, processId, {
          ...body,
          tenantId,
        }),
      )
      .pipe(
        map(
          (response) =>
            new ResponseDto<TableTcpResponse>({
              data: response.data,
              statusCode: response.statusCode,
              message: response.code as HTTP_MESSAGE,
            }),
        ),
      );
  }
}
```

- [ ] **Step 6: Delete old BFF catalog controller**

Delete: `apps/bff/src/app/modules/catalog/controllers/catalog.controller.ts`

- [ ] **Step 7: Update BFF CatalogModule**

```typescript
// apps/bff/src/app/modules/catalog/catalog.module.ts
import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { CategoryAdminController } from './controllers/category.controller';
import { AreaAdminController } from './controllers/area.controller';
import { MenuItemAdminController } from './controllers/menu-item.controller';
import { TableAdminController } from './controllers/table.controller';
import { MenuPublicController } from './controllers/menu.controller';
import { CloudinaryModule } from '@common/providers/cloudinary/cloudinary.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.CATALOG_SERVICE)]),
    CloudinaryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        cloudName: configService.get<string>('CLOUDINARY_CLOUD_NAME', ''),
        apiKey: configService.get<string>('CLOUDINARY_API_KEY', ''),
        apiSecret: configService.get<string>('CLOUDINARY_API_SECRET', ''),
      }),
    }),
  ],
  controllers: [
    CategoryAdminController,
    AreaAdminController,
    MenuItemAdminController,
    TableAdminController,
    MenuPublicController,
  ],
  providers: [],
})
export class CatalogModule {}
```

- [ ] **Step 8: Verify BFF compiles**

Run: `npx nx lint bff --fix`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/bff/src/app/modules/catalog/
git commit -m "feat(bff): add admin + public catalog controllers with cache + image upload

Admin: Category, Area, MenuItem, Table CRUD with guard chain.
Public: Menu with Redis cache (TTL 10min) + QR token validation.
MenuItem image upload via BFF → Cloudinary → TCP → Catalog."
```

---

### Task 10: Unit Tests — CategoryService

**Files:**

- Create: `apps/catalog/src/category/category.service.spec.ts`

- [ ] **Step 1: Write CategoryService tests**

```typescript
// apps/catalog/src/category/category.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { CategoryRepository } from './category.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MenuItem } from '@common/entities/menu-item.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: jest.Mocked<CategoryRepository>;
  let menuItemRepo: { count: jest.Mock };

  const mockCategory = {
    id: 'cat-1',
    tenantId: 'tenant-1',
    name: 'Appetizers',
    sortOrder: 0,
    status: 'active' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockCategoryRepository = {
      create: jest.fn(),
      findAllByTenant: jest.fn(),
      findByIdAndTenant: jest.fn(),
      existsByName: jest.fn(),
      updateByIdAndTenant: jest.fn(),
      deleteByIdAndTenant: jest.fn(),
      batchUpdateSortOrder: jest.fn(),
    };

    menuItemRepo = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: CategoryRepository, useValue: mockCategoryRepository },
        { provide: getRepositoryToken(MenuItem), useValue: menuItemRepo },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get(CategoryRepository);
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockCategory);

      const result = await service.create({ tenantId: 'tenant-1', name: 'Appetizers' });
      expect(result).toEqual(mockCategory);
      expect(repository.existsByName).toHaveBeenCalledWith('tenant-1', 'Appetizers');
    });

    it('should throw BadRequestException for duplicate name', async () => {
      repository.existsByName.mockResolvedValue(true);

      await expect(service.create({ tenantId: 'tenant-1', name: 'Appetizers' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('should return category when found', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockCategory);

      const result = await service.getById({ id: 'cat-1', tenantId: 'tenant-1' });
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findByIdAndTenant.mockResolvedValue(null);

      await expect(service.getById({ id: 'cat-999', tenantId: 'tenant-1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete when no menu items exist', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockCategory);
      menuItemRepo.count.mockResolvedValue(0);

      await service.delete({ id: 'cat-1', tenantId: 'tenant-1' });
      expect(repository.deleteByIdAndTenant).toHaveBeenCalledWith('cat-1', 'tenant-1');
    });

    it('should throw BadRequestException when category has active menu items', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockCategory);
      menuItemRepo.count.mockResolvedValue(3);

      await expect(service.delete({ id: 'cat-1', tenantId: 'tenant-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorder', () => {
    it('should batch update sort orders and return updated list', async () => {
      const items = [
        { id: 'cat-1', sortOrder: 1 },
        { id: 'cat-2', sortOrder: 0 },
      ];
      repository.batchUpdateSortOrder.mockResolvedValue(undefined);
      repository.findAllByTenant.mockResolvedValue([mockCategory]);

      const result = await service.reorder({ tenantId: 'tenant-1', items });
      expect(repository.batchUpdateSortOrder).toHaveBeenCalledWith('tenant-1', items);
      expect(result).toEqual([mockCategory]);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx nx test catalog --testPathPattern=category`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/catalog/src/category/category.service.spec.ts
git commit -m "test(catalog): add CategoryService unit tests (6 cases)"
```

---

### Task 11: Unit Tests — AreaService

**Files:**

- Create: `apps/catalog/src/area/area.service.spec.ts`

- [ ] **Step 1: Write AreaService tests**

Same pattern as CategoryService tests but:

- Mock `TableRepository` instead of `MenuItemRepository`
- Test delete rejection when area has tables
- Test unique name constraint
- Test reorder

5 test cases: create success, create duplicate name, getById not found, delete with tables rejection, reorder success.

- [ ] **Step 2: Run tests**

Run: `npx nx test catalog --testPathPattern=area`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/catalog/src/area/area.service.spec.ts
git commit -m "test(catalog): add AreaService unit tests (5 cases)"
```

---

### Task 12: Unit Tests — MenuItemService

**Files:**

- Create: `apps/catalog/src/menu-item/menu-item.service.spec.ts`

- [ ] **Step 1: Write MenuItemService tests**

8 test cases:

1. Create success (validates category exists in tenant)
2. Create with invalid category → BadRequestException
3. GetList with categoryId filter
4. GetById not found → NotFoundException
5. Update success (partial update)
6. Update with invalid categoryId → BadRequestException
7. SoftDelete success
8. UpdateImage success (sets imageUrl + imagePublicId)

Mock `CategoryRepo` and `MenuItemRepository`. Use same testing module pattern.

- [ ] **Step 2: Run tests**

Run: `npx nx test catalog --testPathPattern=menu-item`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/catalog/src/menu-item/menu-item.service.spec.ts
git commit -m "test(catalog): add MenuItemService unit tests (8 cases)"
```

---

### Task 13: Unit Tests — TableService (State Machine + QR Token)

**Files:**

- Create: `apps/catalog/src/table/table.service.spec.ts`

- [ ] **Step 1: Write TableService tests**

10 test cases:

1. Create success (auto-generates QR token, validates area)
2. Create with invalid area → BadRequestException
3. Create duplicate name → BadRequestException
4. Delete available table → success
5. Delete occupied table → BadRequestException
6. UpdateStatus: available → occupied (valid)
7. UpdateStatus: occupied → billing (valid)
8. UpdateStatus: available → cleaning (INVALID → BadRequestException)
9. UpdateStatus: billing → available (INVALID → BadRequestException)
10. ValidateQrToken with correct token → returns table
11. ValidateQrToken with wrong token → BadRequestException

Mock `TableRepository`, `AreaRepo`, `ConfigService` (for QR_TOKEN_SECRET).

- [ ] **Step 2: Run tests**

Run: `npx nx test catalog --testPathPattern=table`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/catalog/src/table/table.service.spec.ts
git commit -m "test(catalog): add TableService unit tests (10+ cases)

Covers CRUD, all valid/invalid state transitions,
QR token generate/validate."
```

---

### Task 14: Unit Tests — MenuService

**Files:**

- Create: `apps/catalog/src/menu/menu.service.spec.ts`

- [ ] **Step 1: Write MenuService tests**

3 test cases:

1. GetPublicMenu returns categories with available items (happy path)
2. GetPublicMenu returns empty categories array when no active categories
3. GetPublicMenu filters out soft-deleted and out_of_stock items

Mock `CategoryRepo` and `MenuItemRepo`.

- [ ] **Step 2: Run tests**

Run: `npx nx test catalog --testPathPattern=menu`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/catalog/src/menu/menu.service.spec.ts
git commit -m "test(catalog): add MenuService unit tests (3 cases)"
```

---

### Task 15: Lint + Full Test Run

- [ ] **Step 1: Lint Catalog Service**

Run: `npx nx lint catalog --fix`
Expected: PASS (0 errors)

- [ ] **Step 2: Run all Catalog tests**

Run: `npx nx test catalog`
Expected: All ~32 tests PASS

- [ ] **Step 3: Lint BFF**

Run: `npx nx lint bff --fix`
Expected: PASS

- [ ] **Step 4: Run BFF tests (existing)**

Run: `npx nx test bff`
Expected: Existing guard tests still PASS

---

### Task 16: Shared Types Update + Documentation

**Files:**

- Modify: `libs/shared/types/src/lib/menu.types.ts`

- [ ] **Step 1: Remove timeStart/timeEnd from Category shared type**

Update `libs/shared/types/src/lib/menu.types.ts`:

```typescript
export type CategoryStatus = 'active' | 'inactive';

export type MenuItemStatus = 'available' | 'out_of_stock';

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  status: CategoryStatus;
  itemCount: number;
  createdAt: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  sortOrder: number;
  status: MenuItemStatus;
  createdAt: string;
};
```

- [ ] **Step 2: Commit all**

```bash
git add libs/shared/types/src/lib/menu.types.ts
git commit -m "refactor(shared): remove timeStart/timeEnd from Category type

Per design decision: time-based category display deferred.
Adding nullable columns later = zero breaking change."
```

---

### Task 17: Final Verification + Summary Commit

- [ ] **Step 1: Full lint**

```bash
npx nx lint catalog --fix && npx nx lint bff --fix
```

- [ ] **Step 2: Full test**

```bash
npx nx test catalog && npx nx test bff
```

- [ ] **Step 3: Verify no leftover references to old CATALOG pattern**

```bash
grep -r "TCP_REQUEST_MESSAGE.CATALOG\." apps/ libs/ --include="*.ts" | grep -v node_modules
```

Expected: 0 results (all old references replaced)

- [ ] **Step 4: Final commit if any fixups**

```bash
git add -A
git commit -m "chore(catalog): final cleanup after Step 1.5 implementation"
```
