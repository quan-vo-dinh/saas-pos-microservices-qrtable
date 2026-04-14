# Step 1.5 — Catalog Service Backend: Hướng Dẫn Review Code

## Tổng Quan

### Mục tiêu của Step 1.5

Step 1.5 triển khai toàn bộ **Catalog Service Backend** — microservice quản lý danh mục thực đơn nhà hàng. Đây là service trung tâm cho phép quản lý:

- **Category** (Danh mục món ăn): Khai vị, Món chính, Tráng miệng...
- **Area** (Khu vực): Sảnh chính, Tầng 2, Ngoài trời...
- **MenuItem** (Món ăn): Từng món cụ thể với giá, mô tả, hình ảnh
- **Table** (Bàn ăn): Bàn thuộc khu vực, có QR code token, state machine trạng thái
- **Menu** (Thực đơn công khai): Tổng hợp read-only cho khách hàng xem

### Kiến trúc tổng thể

```
┌──────────────────────┐
│   Frontend (PWA)     │
└──────────┬───────────┘
           │ HTTP
┌──────────▼───────────┐
│   BFF Gateway (:3000)│  ← Layer 3: Expose REST API, auth guards, cache
│   /admin/categories  │
│   /admin/areas       │
│   /admin/menu-items  │
│   /admin/tables      │
│   /menu (public)     │
└──────────┬───────────┘
           │ TCP (port 3205)
┌──────────▼───────────┐
│  Catalog Service     │  ← Layer 2: Business logic, DB queries
│  (:3005 HTTP)        │
│  (:3205 TCP)         │
└──────────┬───────────┘
           │ TypeORM
┌──────────▼───────────┐
│  PostgreSQL          │  ← Layer 1: Shared entities, constants
│  (qrtable_catalog)   │
└──────────────────────┘
```

### Thống kê

| Metric                  | Số lượng                                  |
| ----------------------- | ----------------------------------------- |
| Tổng số files           | **52**                                    |
| Shared Libraries        | 18 files                                  |
| Catalog Microservice    | 23 files                                  |
| BFF Gateway Controllers | 6 files                                   |
| Unit Tests              | 5 files                                   |
| Domains                 | 5 (Category, Area, MenuItem, Table, Menu) |
| TCP Message Patterns    | 24 patterns mới                           |
| Entities                | 4 (Category, Area, MenuItem, Table)       |

---

## Cách Đọc & Thứ Tự Review

### Nguyên tắc đọc

Nên đọc theo thứ tự **bottom-up** vì:

1. **Libs** là nền tảng — định nghĩa entities, interfaces, constants mà tất cả layers phía trên đều phụ thuộc
2. **Catalog Service** sử dụng entities và interfaces từ libs để xây dựng business logic
3. **BFF Gateway** gọi Catalog Service qua TCP, sử dụng DTOs từ libs để validate input/output
4. **Unit Tests** kiểm chứng logic trong Catalog Service, cần hiểu service trước mới hiểu test

### Thứ tự đề xuất

```
1. TCP Constants     → Biết tên các message patterns
2. Entities          → Biết cấu trúc DB
3. TCP Interfaces    → Biết request/response types giữa BFF↔Catalog
4. Gateway DTOs      → Biết API input/output cho client
5. Shared Types      → Types dùng chung frontend
6. Catalog bootstrap → main.ts, config, app.module
7. Catalog domains   → Repository → Service → Controller → Module (per domain)
8. BFF Controllers   → HTTP routes, guards, cache
9. Unit Tests        → Verification logic
```

---

## Layer 1: Shared Libraries (`@common/*`)

### 1.1 TCP Message Constants

📄 **`libs/constants/src/lib/enum/tcp-request-message.ts`**

**Vai trò:** Định nghĩa tất cả TCP message pattern constants cho giao tiếp giữa BFF và các microservices.

**Nội dung liên quan Catalog (mới thêm):**

| Enum        | Patterns                                                                                                           | Mô tả                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `CATEGORY`  | `CREATE`, `GET_LIST`, `GET_BY_ID`, `UPDATE`, `DELETE`, `REORDER`                                                   | 6 patterns — CRUD + batch reorder                                              |
| `MENU_ITEM` | `CREATE`, `GET_LIST`, `GET_BY_ID`, `UPDATE`, `SOFT_DELETE`, `UPDATE_IMAGE`                                         | 6 patterns — lưu ý **SOFT_DELETE** thay vì DELETE, thêm **UPDATE_IMAGE** riêng |
| `AREA`      | `CREATE`, `GET_LIST`, `GET_BY_ID`, `UPDATE`, `DELETE`, `REORDER`                                                   | 6 patterns — giống Category, có batch reorder                                  |
| `TABLE`     | `CREATE`, `GET_LIST`, `GET_BY_ID`, `UPDATE`, `DELETE`, `UPDATE_STATUS`, `VALIDATE_QR_TOKEN`, `REGENERATE_QR_TOKEN` | 8 patterns — nhiều nhất, có state machine + QR token ops                       |
| `MENU`      | `GET_PUBLIC_MENU`                                                                                                  | 1 pattern — chỉ read-only                                                      |
| `CATALOG`   | `HEALTH`                                                                                                           | 1 pattern — health check                                                       |

**Tổng cộng:** 28 patterns mới cho Catalog domain.

**Cấu trúc export:** Tất cả enum được gom vào object `TCP_REQUEST_MESSAGE` để truy cập dạng `TCP_REQUEST_MESSAGE.CATEGORY.CREATE`.

**Điểm cần chú ý khi review:**

- Pattern naming convention nhất quán: `{domain}.{action}` (ví dụ: `category.create`, `table.update_status`)
- MenuItem dùng `SOFT_DELETE` thay vì `DELETE` — phản ánh soft delete strategy
- Table có nhiều operations nhất (8) do state machine và QR token management

---

### 1.2 Entities (TypeORM)

#### 1.2.1 Category Entity

📄 **`libs/entities/src/lib/category.entity.ts`**

**Vai trò:** Entity cho bảng `categories` — quản lý danh mục món ăn.

| Column      | Type                                | Đặc biệt                   |
| ----------- | ----------------------------------- | -------------------------- |
| `tenantId`  | `varchar(64)`                       | Multi-tenant discriminator |
| `name`      | `varchar(120)`                      | Tên danh mục               |
| `sortOrder` | `int` (default: 0)                  | Thứ tự hiển thị            |
| `status`    | `varchar(20)` (default: `'active'`) | `'active'` \| `'inactive'` |

**Kế thừa:** `BaseEntity` (cung cấp `id`, `createdAt`, `updatedAt`)

**Type alias:** `CategoryStatus = 'active' | 'inactive'` — export type riêng.

**Constraints:**

- `@Unique(['tenantId', 'name'])` — tên danh mục unique trong cùng tenant
- `@Index(['tenantId', 'sortOrder'])` — tối ưu query sắp xếp theo tenant

**Điểm cần chú ý:** Không có `@DeleteDateColumn` — xóa category là hard delete (nhưng service sẽ check xem có menu items không trước khi cho xóa).

#### 1.2.2 Area Entity

📄 **`libs/entities/src/lib/area.entity.ts`**

**Vai trò:** Entity cho bảng `areas` — quản lý khu vực nhà hàng.

| Column      | Type               | Đặc biệt                   |
| ----------- | ------------------ | -------------------------- |
| `tenantId`  | `varchar(64)`      | Multi-tenant discriminator |
| `name`      | `varchar(120)`     | Tên khu vực                |
| `sortOrder` | `int` (default: 0) | Thứ tự hiển thị            |

**Kế thừa:** `BaseEntity`

**Constraints:**

- `@Unique(['tenantId', 'name'])` — tên khu vực unique trong cùng tenant
- `@Index(['tenantId', 'sortOrder'])` — tối ưu query sắp xếp

**Điểm cần chú ý:** Area không có `status` field — đơn giản hơn Category. Hard delete, nhưng service check bảng tables trước khi xóa.

#### 1.2.3 MenuItem Entity

📄 **`libs/entities/src/lib/menu-item.entity.ts`**

**Vai trò:** Entity cho bảng `menu_items` — thông tin từng món ăn.

| Column          | Type                                   | Đặc biệt                              |
| --------------- | -------------------------------------- | ------------------------------------- |
| `tenantId`      | `varchar(64)`                          | Multi-tenant                          |
| `categoryId`    | `uuid`                                 | FK → categories                       |
| `name`          | `varchar(255)`                         | Tên món                               |
| `description`   | `text`, nullable                       | Mô tả món                             |
| `price`         | `decimal(12,2)`                        | Giá — precision 12, scale 2           |
| `imageUrl`      | `varchar(500)`, nullable               | URL ảnh trên Cloudinary               |
| `imagePublicId` | `varchar(255)`, nullable               | Cloudinary public ID để xóa ảnh cũ    |
| `stock`         | `int` (default: 0)                     | Số lượng tồn kho                      |
| `sortOrder`     | `int` (default: 0)                     | Thứ tự hiển thị                       |
| `status`        | `varchar(20)` (default: `'available'`) | `'available'` \| `'out_of_stock'`     |
| `deletedAt`     | `timestamp`, nullable                  | **Soft delete** — `@DeleteDateColumn` |

**Type alias:** `MenuItemStatus = 'available' | 'out_of_stock'`

**Relations:**

- `@ManyToOne(() => Category)` với `@JoinColumn({ name: 'category_id' })` — lazy loading (`eager: false`)

**Indexes:**

- `['tenantId', 'categoryId']` — query items theo category
- `['tenantId', 'status']` — filter theo status

**Điểm cần chú ý:**

- **Soft delete** via `@DeleteDateColumn` — khi delete sẽ set `deletedAt` timestamp thay vì xóa record. Cho phép phục hồi dữ liệu và giữ history cho reports.
- **Cloudinary fields** (`imageUrl`, `imagePublicId`) — lưu cả URL và public ID. Public ID cần thiết để xóa ảnh cũ khi upload ảnh mới.
- `price` dùng `decimal(12,2)` — tránh floating point issues.

#### 1.2.4 Table Entity

📄 **`libs/entities/src/lib/table.entity.ts`**

**Vai trò:** Entity cho bảng `tables` — quản lý bàn ăn nhà hàng.

| Column      | Type                                   | Đặc biệt                         |
| ----------- | -------------------------------------- | -------------------------------- |
| `tenantId`  | `varchar(64)`                          | Multi-tenant                     |
| `areaId`    | `uuid`                                 | FK → areas                       |
| `name`      | `varchar(120)`                         | Tên bàn                          |
| `capacity`  | `int` (default: 1)                     | Sức chứa                         |
| `status`    | `varchar(20)` (default: `'available'`) | State machine: 4 trạng thái      |
| `qrToken`   | `varchar(255)`                         | Token HMAC-SHA256 cho QR code    |
| `sessionId` | `varchar(255)`, nullable               | Session ID khi bàn đang occupied |

**Type alias:** `TableStatus = 'available' | 'occupied' | 'billing' | 'cleaning'`

**Relations:**

- `@ManyToOne(() => Area)` với `@JoinColumn({ name: 'area_id' })`

**Constraints:**

- `@Unique(['tenantId', 'name'])` — tên bàn unique per tenant
- `@Unique(['tenantId', 'qrToken'])` — QR token unique per tenant

**Indexes:**

- `['tenantId', 'areaId']` — query bàn theo khu vực
- `['tenantId', 'status']` — filter theo status

**Điểm cần chú ý:**

- **State machine** 4 trạng thái: `available → occupied → billing → cleaning → available`
- `qrToken` dùng HMAC-SHA256 — tạo từ `tableId + tenantId` và secret key
- `sessionId` track session khi bàn đang có khách — null khi `available`

---

### 1.3 TCP Interfaces

Các interfaces định nghĩa **request/response types** cho giao tiếp TCP giữa BFF và Catalog Service.

#### 1.3.1 Category TCP Interface

📄 **`libs/interfaces/src/lib/tcp/catalog/category.interface.ts`**

| Type                        | Fields                                             | Mô tả                         |
| --------------------------- | -------------------------------------------------- | ----------------------------- |
| `CreateCategoryTcpRequest`  | `tenantId`, `name`, `sortOrder?`, `status?`        | Tạo danh mục                  |
| `GetCategoryListTcpRequest` | `tenantId`                                         | Lấy danh sách theo tenant     |
| `GetCategoryByIdTcpRequest` | `id`, `tenantId`                                   | Lấy theo ID + tenant          |
| `UpdateCategoryTcpRequest`  | `id`, `tenantId`, `name?`, `sortOrder?`, `status?` | Cập nhật (partial)            |
| `DeleteCategoryTcpRequest`  | `id`, `tenantId`                                   | Xóa                           |
| `ReorderCategoryTcpRequest` | `tenantId`, `items: Array<{id, sortOrder}>`        | Batch reorder                 |
| `CategoryTcpResponse`       | = `Category` entity                                | Response trả về entity đầy đủ |

#### 1.3.2 Area TCP Interface

📄 **`libs/interfaces/src/lib/tcp/catalog/area.interface.ts`**

| Type                    | Fields                                      | Mô tả         |
| ----------------------- | ------------------------------------------- | ------------- |
| `CreateAreaTcpRequest`  | `tenantId`, `name`, `sortOrder?`            | Tạo khu vực   |
| `GetAreaListTcpRequest` | `tenantId`                                  | Lấy danh sách |
| `GetAreaByIdTcpRequest` | `id`, `tenantId`                            | Lấy theo ID   |
| `UpdateAreaTcpRequest`  | `id`, `tenantId`, `name?`, `sortOrder?`     | Cập nhật      |
| `DeleteAreaTcpRequest`  | `id`, `tenantId`                            | Xóa           |
| `ReorderAreaTcpRequest` | `tenantId`, `items: Array<{id, sortOrder}>` | Batch reorder |
| `AreaTcpResponse`       | = `Area` entity                             | Response      |

**Giống Category** nhưng không có `status` field.

#### 1.3.3 MenuItem TCP Interface

📄 **`libs/interfaces/src/lib/tcp/catalog/menu-item.interface.ts`**

| Type                            | Fields                                                                            | Mô tả                              |
| ------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------- |
| `CreateMenuItemTcpRequest`      | `tenantId`, `categoryId`, `name`, `description?`, `price`, `stock?`, `sortOrder?` | Tạo món                            |
| `GetMenuItemListTcpRequest`     | `tenantId`, `categoryId?`                                                         | List — optional filter by category |
| `GetMenuItemByIdTcpRequest`     | `id`, `tenantId`                                                                  | Get by ID                          |
| `UpdateMenuItemTcpRequest`      | `id`, `tenantId` + all optional fields including `status?`                        | Partial update                     |
| `SoftDeleteMenuItemTcpRequest`  | `id`, `tenantId`                                                                  | Soft delete                        |
| `UpdateMenuItemImageTcpRequest` | `id`, `tenantId`, `imageUrl`, `imagePublicId`                                     | Update ảnh riêng                   |
| `MenuItemTcpResponse`           | = `MenuItem` entity                                                               | Response                           |

**Điểm chú ý:**

- Tách riêng `UpdateMenuItemImageTcpRequest` — upload ảnh là flow riêng (qua Cloudinary ở BFF)
- `SoftDeleteMenuItemTcpRequest` thay vì Delete — chỉ set `deletedAt`

#### 1.3.4 Table TCP Interface

📄 **`libs/interfaces/src/lib/tcp/catalog/table.interface.ts`**

| Type                          | Fields                                            | Mô tả                             |
| ----------------------------- | ------------------------------------------------- | --------------------------------- |
| `CreateTableTcpRequest`       | `tenantId`, `areaId`, `name`, `capacity?`         | Tạo bàn                           |
| `GetTableListTcpRequest`      | `tenantId`, `areaId?`, `status?`                  | List — filter by area hoặc status |
| `GetTableByIdTcpRequest`      | `id`, `tenantId`                                  | Get by ID                         |
| `UpdateTableTcpRequest`       | `id`, `tenantId`, `name?`, `capacity?`, `areaId?` | Partial update                    |
| `DeleteTableTcpRequest`       | `id`, `tenantId`                                  | Hard delete                       |
| `UpdateTableStatusTcpRequest` | `id`, `tenantId`, `status`, `sessionId?`          | State transition                  |
| `ValidateQrTokenTcpRequest`   | `tableId`, `token`, `tenantId`                    | Validate QR token                 |
| `RegenerateQrTokenTcpRequest` | `id`, `tenantId`                                  | Tạo lại QR token                  |
| `TableTcpResponse`            | = `Table` entity                                  | Response                          |

**Điểm chú ý:**

- `UpdateTableStatusTcpRequest` có `sessionId?` — gán session khi chuyển sang `occupied`
- `ValidateQrTokenTcpRequest` dùng `tableId` (không phải `id`) — naming khác biệt vì đây là validate từ QR scan

#### 1.3.5 Menu TCP Interface

📄 **`libs/interfaces/src/lib/tcp/catalog/menu.interface.ts`**

| Type                         | Fields                                                     | Mô tả                                                       |
| ---------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| `GetPublicMenuTcpRequest`    | `tenantId`                                                 | Chỉ cần tenant ID                                           |
| `PublicMenuCategoryResponse` | `id`, `name`, `sortOrder`, `items[]`                       | Category + items nested                                     |
| `PublicMenuItemResponse`     | `id`, `name`, `description`, `price`, `imageUrl`, `status` | Subset fields — không có `stock`, `sortOrder`, `categoryId` |
| `PublicMenuTcpResponse`      | `categories: PublicMenuCategoryResponse[]`                 | Aggregated response                                         |

**Điểm chú ý:** Response được **reshape** — không trả về entity trực tiếp mà tạo DTO riêng với chỉ những fields khách hàng cần xem. Ẩn `stock`, `sortOrder`, `imagePublicId`, `tenantId`.

#### 1.3.6 TCP Catalog Index

📄 **`libs/interfaces/src/lib/tcp/catalog/index.ts`**

Barrel export — re-export tất cả 5 interface files:

```
category.interface → area.interface → menu-item.interface → table.interface → menu.interface
```

---

### 1.4 Gateway DTOs (Validation)

Các DTOs sử dụng `class-validator` decorators để validate HTTP request body tại BFF layer.

#### 1.4.1 Category DTOs

📄 **`libs/interfaces/src/lib/gateway/catalog/category.dto.ts`**

| DTO Class                   | Validators                                                                                          | Mô tả                  |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------- |
| `CreateCategoryRequestDto`  | `@IsString @IsNotEmpty name`, `@IsInt @Min(0) sortOrder?`, `@IsEnum(['active','inactive']) status?` | Tạo — name bắt buộc    |
| `UpdateCategoryRequestDto`  | Tất cả optional                                                                                     | Partial update         |
| `ReorderCategoryRequestDto` | `@IsArray @ValidateNested items[]` chứa `ReorderItemDto`                                            | Batch reorder          |
| `ReorderItemDto` (private)  | `@IsUUID id`, `@IsInt @Min(0) sortOrder`                                                            | Nested DTO trong array |
| `CategoryResponseDto`       | extends `BaseResponseDto` + `tenantId`, `name`, `sortOrder`, `status`                               | Swagger response type  |

**Điểm chú ý:**

- Sử dụng `@Type(() => ReorderItemDto)` từ `class-transformer` cho nested validation
- `ReorderItemDto` validate UUID cho id — đảm bảo client gửi đúng format

#### 1.4.2 Area DTOs

📄 **`libs/interfaces/src/lib/gateway/catalog/area.dto.ts`**

| DTO Class               | Mô tả                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| `CreateAreaRequestDto`  | `name` (required), `sortOrder?` — đơn giản hơn Category (không có `status`) |
| `UpdateAreaRequestDto`  | Tất cả optional                                                             |
| `ReorderAreaRequestDto` | Giống Category — `items[]` với `ReorderItemDto`                             |
| `AreaResponseDto`       | `tenantId`, `name`, `sortOrder`                                             |

#### 1.4.3 MenuItem DTOs

📄 **`libs/interfaces/src/lib/gateway/catalog/menu-item.dto.ts`**

| DTO Class                  | Validators đặc biệt                                                    | Mô tả                             |
| -------------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `CreateMenuItemRequestDto` | `@IsUUID categoryId`, `@IsNumber({maxDecimalPlaces: 2}) @Min(0) price` | Tạo — cần `categoryId` và `price` |
| `UpdateMenuItemRequestDto` | `@IsEnum(['available','out_of_stock']) status?`                        | Partial update, có thể đổi status |
| `MenuItemResponseDto`      | Includes `imageUrl`, `imagePublicId`, `stock`, `sortOrder`, `status`   | Full response                     |

**Điểm chú ý:**

- `price` validate `maxDecimalPlaces: 2` — đảm bảo không nhập quá 2 chữ số thập phân
- Không có DTO cho image upload — image được upload qua `multipart/form-data` với `FileInterceptor`

#### 1.4.4 Table DTOs

📄 **`libs/interfaces/src/lib/gateway/catalog/table.dto.ts`**

| DTO Class                     | Validators đặc biệt                                             | Mô tả                                      |
| ----------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| `CreateTableRequestDto`       | `@IsUUID areaId`, `@IsInt @Min(1) capacity?`                    | Tạo bàn — capacity tối thiểu 1             |
| `UpdateTableRequestDto`       | `areaId?` optional UUID                                         | Update                                     |
| `UpdateTableStatusRequestDto` | `@IsEnum(['available','occupied','billing','cleaning']) status` | State transition — bắt buộc chọn đúng enum |
| `ValidateQrTokenRequestDto`   | `@IsUUID tableId`, `@IsString @IsNotEmpty token`                | Validate QR scan                           |
| `TableResponseDto`            | Includes `qrToken`, `sessionId`                                 | Full response                              |

**Điểm chú ý:** `capacity` validate `@Min(1)` (không phải `@Min(0)` như sortOrder) — bàn phải chứa ít nhất 1 người.

#### 1.4.5 Menu DTOs (Public)

📄 **`libs/interfaces/src/lib/gateway/catalog/menu.dto.ts`**

| DTO Class               | Mô tả                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `PublicMenuItemDto`     | `id`, `name`, `description`, `price`, `imageUrl`, `status` — subset cho khách hàng |
| `PublicMenuCategoryDto` | `id`, `name`, `sortOrder`, `items: PublicMenuItemDto[]` — nested                   |
| `PublicMenuResponseDto` | `categories: PublicMenuCategoryDto[]` — top-level wrapper                          |

Chỉ dùng `@ApiProperty` decorators — không có validation vì đây là **response-only** DTOs (không dùng cho input).

#### 1.4.6 Gateway Catalog Index

📄 **`libs/interfaces/src/lib/gateway/catalog/index.ts`**

Barrel export tất cả 5 DTO files.

---

### 1.5 Shared Types (Frontend)

📄 **`libs/shared/types/src/lib/menu.types.ts`**

**Vai trò:** TypeScript types dùng chung cho frontend apps (management-app, customer-pwa).

| Type             | Fields                                                                                                                          | Mô tả                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `CategoryStatus` | `'active' \| 'inactive'`                                                                                                        | Status enum cho Category                |
| `MenuItemStatus` | `'available' \| 'out_of_stock'`                                                                                                 | Status enum cho MenuItem                |
| `Category`       | `id`, `name`, `sortOrder`, `status`, **`itemCount`**, `createdAt`                                                               | Frontend-friendly — thêm `itemCount`    |
| `MenuItem`       | `id`, `categoryId`, **`categoryName`**, `name`, `description`, `price`, `imageUrl`, `stock`, `sortOrder`, `status`, `createdAt` | Frontend-friendly — thêm `categoryName` |

**Điểm chú ý:** Các types frontend có thêm computed fields (`itemCount`, `categoryName`) mà backend entity không có — frontend sẽ cần compute/join khi mapping.

---

## Layer 2: Catalog Microservice

### 2.0 Bootstrap & Configuration

#### main.ts

📄 **`apps/catalog/src/main.ts`**

**Vai trò:** Bootstrap hybrid NestJS app (HTTP + TCP microservice).

**Logic chính:**

1. `NestFactory.create(AppModule)` — tạo HTTP app
2. `app.connectMicroservice<MicroserviceOptions>()` — kết nối TCP transport với host/port từ config (`TCP_CATALOG_SERVICE`)
3. `app.setGlobalPrefix('api')` — prefix cho HTTP endpoints
4. `app.startAllMicroservices()` → `app.listen(3005)` — khởi động cả TCP và HTTP

**Điểm cần chú ý:** HTTP port fallback `3005` nếu không set `CATALOG_PORT` env var. TCP config lấy từ `CONFIGURATION.TCP_SERV.TCP_CATALOG_SERVICE`.

#### Configuration

📄 **`apps/catalog/src/configuration/index.ts`**

**Vai trò:** Configuration class cho Catalog service — validate env vars khi khởi động.

**Kế thừa:** `BaseConfiguration` — cung cấp validation method.

**Nested configs:**

- `AppConfiguration` — general app settings
- `TcpConfiguration` — TCP ports cho tất cả services
- `TypeOrmConfiguration` — PostgreSQL connection settings

**Pattern:** `CONFIGURATION.validate()` được gọi ngay khi import — fail-fast nếu thiếu env vars.

#### AppModule

📄 **`apps/catalog/src/app/app.module.ts`**

**Vai trò:** Root module — wiring tất cả feature modules.

**Imports:**

1. `ConfigModule.forRoot({ isGlobal: true })` — global config, load `CONFIGURATION` object
2. `TypeOrmProvider` — shared TypeORM connection from `@common/configuration`
3. 5 feature modules: `CategoryModule`, `AreaModule`, `MenuItemModule`, `TableModule`, `MenuModule`

**Static property:** `AppModule.CONFIGURATION` — cho phép truy cập config từ `main.ts`.

---

### 2.1 Category Domain

#### Repository

📄 **`apps/catalog/src/app/modules/category/repositories/category.repository.ts`**

**Vai trò:** Data access layer cho `categories` table.

| Method                 | Signature                                          | Logic                                                 |
| ---------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| `create`               | `(data: Partial<Category>) → Promise<Category>`    | `repo.create()` + `repo.save()`                       |
| `findAllByTenant`      | `(tenantId) → Promise<Category[]>`                 | Filter by `tenantId`, order by `sortOrder ASC`        |
| `findByIdAndTenant`    | `(id, tenantId) → Promise<Category \| null>`       | Composite lookup `id` + `tenantId`                    |
| `existsByName`         | `(tenantId, name) → Promise<boolean>`              | Count query → boolean                                 |
| `updateByIdAndTenant`  | `(id, tenantId, data) → Promise<Category \| null>` | `repo.update()` → re-fetch                            |
| `deleteByIdAndTenant`  | `(id, tenantId) → void`                            | Hard `repo.delete()`                                  |
| `batchUpdateSortOrder` | `(tenantId, items[]) → void`                       | **Transaction** — loop update sortOrder cho từng item |

**Điểm chú ý:**

- `batchUpdateSortOrder` dùng `repo.manager.transaction()` — đảm bảo atomicity khi reorder nhiều categories cùng lúc
- Tất cả queries đều filter by `tenantId` — multi-tenant isolation

#### Service

📄 **`apps/catalog/src/app/modules/category/services/category.service.ts`**

**Vai trò:** Business logic cho Category domain.

**Dependencies:** `CategoryRepository`, `Repository<MenuItem>` (inject trực tiếp để check menu items khi delete)

| Method          | Logic chính                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create(data)`  | 1. Check `existsByName` → throw `BadRequestException('Category name already exists')` nếu trùng. 2. Trim name, default sortOrder=0, default status='active'                                                                    |
| `getList(data)` | Delegate to `findAllByTenant`                                                                                                                                                                                                  |
| `getById(data)` | `findByIdAndTenant` → throw `NotFoundException('Category not found')` nếu null                                                                                                                                                 |
| `update(data)`  | 1. `getById` (verify exists). 2. Nếu đổi name → check duplicate. 3. Build partial update payload chỉ với fields có giá trị. 4. `updateByIdAndTenant`                                                                           |
| `delete(data)`  | 1. `getById` (verify exists). 2. **Count active menu items** (`deletedAt: IsNull()`) cho category này. 3. Throw `BadRequestException('Cannot delete category with active menu items')` nếu count > 0. 4. `deleteByIdAndTenant` |
| `reorder(data)` | `batchUpdateSortOrder` → `findAllByTenant` (trả về list mới)                                                                                                                                                                   |

**Điểm chú ý:**

- **Duplicate name validation** xảy ra ở cả `create` và `update` (khi name thay đổi)
- **Referential integrity check** khi delete — đếm menu items chưa bị soft-delete (`deletedAt: IsNull()`)
- Trim name — loại bỏ whitespace thừa

#### Controller

📄 **`apps/catalog/src/app/modules/category/controllers/category.controller.ts`**

**Vai trò:** TCP message handler — nhận messages từ BFF, gọi service, wrap response.

**Interceptor:** `@UseInterceptors(TcpLoggingInterceptor)` — log TCP requests.

| Handler   | Pattern                               | Response Type                     |
| --------- | ------------------------------------- | --------------------------------- |
| `create`  | `TCP_REQUEST_MESSAGE.CATEGORY.CREATE` | `Response<CategoryTcpResponse>`   |
| `getList` | `CATEGORY.GET_LIST`                   | `Response<CategoryTcpResponse[]>` |
| `getById` | `CATEGORY.GET_BY_ID`                  | `Response<CategoryTcpResponse>`   |
| `update`  | `CATEGORY.UPDATE`                     | `Response<CategoryTcpResponse>`   |
| `remove`  | `CATEGORY.DELETE`                     | `Response<boolean>` — trả `true`  |
| `reorder` | `CATEGORY.REORDER`                    | `Response<CategoryTcpResponse[]>` |

**Pattern:** Tất cả handlers đều sử dụng `@RequestParams()` decorator để extract payload, gọi service, wrap với `Response.success<T>()`.

#### Module

📄 **`apps/catalog/src/app/modules/category/category.module.ts`**

**Imports:** `TypeOrmModule.forFeature([Category, MenuItem])` — cần cả `MenuItem` entity vì service check referential integrity khi delete.

**Exports:** `CategoryService` — cho phép modules khác inject nếu cần.

---

### 2.2 Area Domain

#### Repository

📄 **`apps/catalog/src/app/modules/area/repositories/area.repository.ts`**

**Cấu trúc giống hệt CategoryRepository** — cùng 7 methods với Area entity.

| Method                 | Khác biệt so với Category        |
| ---------------------- | -------------------------------- |
| `findAllByTenant`      | Giống — order by `sortOrder ASC` |
| `batchUpdateSortOrder` | Giống — transaction loop update  |

#### Service

📄 **`apps/catalog/src/app/modules/area/services/area.service.ts`**

**Dependencies:** `AreaRepository`, `Repository<Table>` (check tables khi delete)

| Method    | Logic đặc biệt                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `create`  | Check duplicate name per tenant, trim name, default sortOrder=0                                          |
| `update`  | Check duplicate name nếu đổi tên                                                                         |
| `delete`  | **Count tables** thuộc area. Throw `BadRequestException('Cannot delete area with tables')` nếu count > 0 |
| `reorder` | Batch update → return updated list                                                                       |

**So sánh với CategoryService:**

- Không có `status` field → ít fields trong update payload
- Referential integrity check với `Table` entity thay vì `MenuItem`

#### Controller

📄 **`apps/catalog/src/app/modules/area/controllers/area.controller.ts`**

Giống CategoryController — 6 TCP handlers cùng pattern. Message patterns dùng `TCP_REQUEST_MESSAGE.AREA.*`.

#### Module

📄 **`apps/catalog/src/app/modules/area/area.module.ts`**

**Imports:** `TypeOrmModule.forFeature([Area, Table])` — cần `Table` cho referential integrity check.

---

### 2.3 MenuItem Domain

#### Repository

📄 **`apps/catalog/src/app/modules/menu-item/repositories/menu-item.repository.ts`**

| Method                                   | Khác biệt đáng chú ý                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `findAllByTenant(tenantId, categoryId?)` | Filter `deletedAt: IsNull()` — chỉ trả items chưa bị soft-delete. Optional filter by `categoryId`. |
| `findByIdAndTenant`                      | Filter `deletedAt: IsNull()` — không trả deleted items                                             |
| `softDelete(id, tenantId)`               | Dùng `repo.softDelete()` — set `deletedAt` timestamp                                               |

**Không có:** `existsByName`, `deleteByIdAndTenant`, `batchUpdateSortOrder` — MenuItem không check duplicate name, dùng soft delete, không có batch reorder.

#### Service

📄 **`apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`**

**Dependencies:** `MenuItemRepository`, `Repository<Category>` (validate categoryId)

| Method        | Logic đặc biệt                                                                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`      | 1. **Validate category exists** trong cùng tenant → throw `BadRequestException('Category not found in this tenant')`. 2. Trim name và description. 3. Default stock=0, sortOrder=0 |
| `getList`     | Pass optional `categoryId` filter                                                                                                                                                  |
| `update`      | 1. Verify item exists. 2. **Validate categoryId** nếu thay đổi. 3. Build partial update (7 fields). 4. Trim name/description                                                       |
| `softDelete`  | Verify exists → `repository.softDelete()`                                                                                                                                          |
| `updateImage` | Verify exists → update `imageUrl` + `imagePublicId`                                                                                                                                |

**Điểm chú ý:**

- **Cross-entity validation** — luôn verify categoryId belongs to cùng tenant
- `description` handling: `data.description?.trim() || null` — convert empty string thành null
- `updateImage` tách riêng khỏi `update` — vì image upload flow phức tạp hơn (Cloudinary ở BFF)

#### Controller

📄 **`apps/catalog/src/app/modules/menu-item/controllers/menu-item.controller.ts`**

| Handler       | Pattern                  | Đặc biệt                         |
| ------------- | ------------------------ | -------------------------------- |
| `create`      | `MENU_ITEM.CREATE`       | Standard                         |
| `getList`     | `MENU_ITEM.GET_LIST`     | Standard                         |
| `getById`     | `MENU_ITEM.GET_BY_ID`    | Standard                         |
| `update`      | `MENU_ITEM.UPDATE`       | Standard                         |
| `softDelete`  | `MENU_ITEM.SOFT_DELETE`  | Return `Response<boolean>(true)` |
| `updateImage` | `MENU_ITEM.UPDATE_IMAGE` | Return updated item              |

#### Module

📄 **`apps/catalog/src/app/modules/menu-item/menu-item.module.ts`**

**Imports:** `TypeOrmModule.forFeature([MenuItem, Category])` — cần `Category` cho validation.

---

### 2.4 Table Domain

#### Repository

📄 **`apps/catalog/src/app/modules/table/repositories/table.repository.ts`**

| Method                                        | Đặc biệt                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `findAllByTenant(tenantId, areaId?, status?)` | **Multi-filter** — optional `areaId` + `status`. Order by `areaId ASC, name ASC` |
| `findByQrToken(tenantId, qrToken)`            | Lookup bằng QR token — dùng cho validation                                       |

**Không có:** `batchUpdateSortOrder` — tables không có batch reorder.

#### Service

📄 **`apps/catalog/src/app/modules/table/services/table.service.ts`**

**Dependencies:** `TableRepository`, `Repository<Area>`, `ConfigService`

**QR Token Generation:**

```typescript
private generateQrToken(tableId: string, tenantId: string): string {
  return createHmac('sha256', this.qrTokenSecret)
    .update(`${tableId}${tenantId}`)
    .digest('hex');
}
```

- Secret lấy từ env `QR_TOKEN_SECRET` (fallback: `'default-secret-change-me'`)
- Deterministic — cùng input luôn ra cùng output (HMAC, không phải random)

**State Machine:**

```
VALID_TRANSITIONS:
  available → [occupied]
  occupied  → [billing]
  billing   → [occupied, cleaning]  ← có thể quay lại occupied
  cleaning  → [available]
```

| Method              | Logic đặc biệt                                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create`            | 1. **Validate area exists** trong tenant. 2. Check duplicate name. 3. Create với `qrToken: 'temp'`. 4. **Generate QR token** với actual table ID. 5. Update table với real token.  |
| `delete`            | Check `table.sessionId \|\| table.status !== 'available'` → throw `BadRequestException('Cannot delete active table')`                                                              |
| `updateStatus`      | 1. Get current table. 2. **Validate transition** qua `VALID_TRANSITIONS` map. 3. Nếu `→ available`: clear `sessionId = null`. 4. Nếu `→ occupied` + có sessionId: set `sessionId`. |
| `validateQrToken`   | 1. Generate expected token. 2. **`timingSafeEqual`** so sánh token — chống timing attack. 3. Return table nếu valid.                                                               |
| `regenerateQrToken` | Verify exists → generate new token → update                                                                                                                                        |

**Điểm cần chú ý khi review:**

- **Two-step create** — tạo table trước rồi generate QR token vì cần actual table ID
- **`timingSafeEqual`** — security best practice, chống timing-based token guessing
- **State machine validation** — `billing → [occupied, cleaning]` cho phép quay lại `occupied` (ví dụ: khách gọi thêm món)
- `delete` chỉ cho phép khi bàn `available` VÀ không có session

#### Controller

📄 **`apps/catalog/src/app/modules/table/controllers/table.controller.ts`**

8 TCP handlers — nhiều nhất trong các domain:

| Handler             | Pattern                     |
| ------------------- | --------------------------- |
| `create`            | `TABLE.CREATE`              |
| `getList`           | `TABLE.GET_LIST`            |
| `getById`           | `TABLE.GET_BY_ID`           |
| `update`            | `TABLE.UPDATE`              |
| `remove`            | `TABLE.DELETE`              |
| `updateStatus`      | `TABLE.UPDATE_STATUS`       |
| `validateQrToken`   | `TABLE.VALIDATE_QR_TOKEN`   |
| `regenerateQrToken` | `TABLE.REGENERATE_QR_TOKEN` |

#### Module

📄 **`apps/catalog/src/app/modules/table/table.module.ts`**

**Imports:** `TypeOrmModule.forFeature([Table, Area])` — cần `Area` cho validation.

---

### 2.5 Menu Domain (Read-only Aggregation)

#### Repository

📄 **`apps/catalog/src/app/modules/menu/repositories/menu.repository.ts`**

**Vai trò:** Read-only repository — chỉ query, không có create/update/delete.

**Dependencies:** Inject cả `Repository<Category>` và `Repository<MenuItem>`.

| Method                                               | Query                                                                  | Mô tả                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| `findActiveCategories(tenantId)`                     | `status: 'active'`, order by `sortOrder ASC`                           | Chỉ categories đang active                |
| `findAvailableItemsByCategory(tenantId, categoryId)` | `status: 'available'`, `deletedAt: IsNull()`, order by `sortOrder ASC` | Chỉ items available + chưa bị soft-delete |

#### Service

📄 **`apps/catalog/src/app/modules/menu/services/menu.service.ts`**

**Logic `getPublicMenu`:**

1. Fetch active categories
2. `Promise.all()` — parallel fetch items cho mỗi category
3. **Reshape response** — map entity sang `PublicMenuTcpResponse` format:
   - Chỉ lấy `id`, `name`, `description`, `price`, `imageUrl`, `status` cho mỗi item
   - `Number(item.price)` — convert decimal string sang number
4. Return `{ categories: [...] }`

**Điểm chú ý:**

- `Promise.all` — query items song song cho tất cả categories → hiệu suất tốt hơn sequential
- **Data reshaping** — không trả raw entities, ẩn internal fields (`tenantId`, `imagePublicId`, `stock`, `sortOrder`)

#### Controller

📄 **`apps/catalog/src/app/modules/menu/controllers/menu.controller.ts`**

Chỉ có **1 handler**: `@MessagePattern(TCP_REQUEST_MESSAGE.MENU.GET_PUBLIC_MENU)` → `getPublicMenu`.

#### Module

📄 **`apps/catalog/src/app/modules/menu/menu.module.ts`**

**Imports:** `TypeOrmModule.forFeature([Category, MenuItem])` — cần cả hai entities.

**Không export** `MenuService` — module này self-contained, không cần từ bên ngoài.

---

## Layer 3: BFF Gateway

### 3.0 CatalogModule (BFF)

📄 **`apps/bff/src/app/modules/catalog/catalog.module.ts`**

**Vai trò:** Đăng ký TCP client và tất cả admin/public controllers cho Catalog domain.

**Imports:**

1. `ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.CATALOG_SERVICE)])` — TCP client kết nối Catalog service
2. `CloudinaryModule.forRootAsync(...)` — Dynamic config từ env vars (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)

**Controllers (5):**

- `CategoryAdminController`
- `AreaAdminController`
- `MenuItemAdminController`
- `TableAdminController`
- `MenuPublicController`

**Điểm chú ý:** `CloudinaryModule` import ở đây vì MenuItem image upload xảy ra ở BFF layer (upload lên Cloudinary trước khi gửi URL xuống Catalog service).

---

### 3.1 Category Admin Controller (BFF)

📄 **`apps/bff/src/app/modules/catalog/controllers/category.controller.ts`**

**Route prefix:** `admin/categories`

**Dependencies:** `catalogClient: TcpClient`, `cacheManager: Cache`

| Route            | Method     | Guards/Permissions                                  | Logic đặc biệt                        |
| ---------------- | ---------- | --------------------------------------------------- | ------------------------------------- |
| `POST /`         | `create`   | `@Authorization({secured: true})`, `CATALOG_CREATE` | **Invalidate menu cache** sau khi tạo |
| `GET /`          | `findAll`  | `CATALOG_GET_LIST`                                  | Standard TCP forward                  |
| `GET /:id`       | `findById` | `CATALOG_GET_BY_ID`                                 | Standard                              |
| `PATCH /reorder` | `reorder`  | `CATALOG_UPDATE`                                    | Batch reorder + **invalidate cache**  |
| `PATCH /:id`     | `update`   | `CATALOG_UPDATE`                                    | **Invalidate cache**                  |
| `DELETE /:id`    | `remove`   | `CATALOG_DELETE`                                    | **Invalidate cache**                  |

**Cache invalidation pattern:**

```typescript
private async invalidateMenuCache(req: Request): Promise<void> {
  const tenantId = req[MetadataKey.TENANT_ID] as string;
  if (tenantId) {
    await this.cacheManager.del(`menu:${tenantId}`);
  }
}
```

Gọi sau mỗi mutation (create, update, delete, reorder) để public menu cache luôn fresh.

**Pattern chung cho tất cả routes:**

1. Extract `tenantId` từ `req[MetadataKey.TENANT_ID]`
2. Gọi `this.catalogClient.send(TCP_PATTERN, buildTcpRequestContext(req, processId, payload))`
3. Pipe response → `new ResponseDto<T>(...)`

**Điểm chú ý về route ordering:** `PATCH /reorder` phải đặt **TRƯỚC** `PATCH /:id` trong source code, nếu không `:id` sẽ match string `"reorder"`. Hiện tại đã đúng thứ tự.

---

### 3.2 Area Admin Controller (BFF)

📄 **`apps/bff/src/app/modules/catalog/controllers/area.controller.ts`**

**Route prefix:** `admin/areas`

| Route            | Method     | Permissions         |
| ---------------- | ---------- | ------------------- |
| `POST /`         | `create`   | `CATALOG_CREATE`    |
| `GET /`          | `findAll`  | `CATALOG_GET_LIST`  |
| `GET /:id`       | `findById` | `CATALOG_GET_BY_ID` |
| `PATCH /reorder` | `reorder`  | `CATALOG_UPDATE`    |
| `PATCH /:id`     | `update`   | `CATALOG_UPDATE`    |
| `DELETE /:id`    | `remove`   | `CATALOG_DELETE`    |

**So sánh với CategoryAdminController:**

- **Không có cache invalidation** — thay đổi area không ảnh hưởng public menu
- **Không inject `CACHE_MANAGER`** — đơn giản hơn
- Cùng guard chain: `@Authorization({secured: true})` + `@Permissions([...])`

---

### 3.3 MenuItem Admin Controller (BFF)

📄 **`apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`**

**Route prefix:** `admin/menu-items`

**Dependencies:** `catalogClient`, `cacheManager`, `CloudinaryService`

| Route             | Method        | Logic đặc biệt                 |
| ----------------- | ------------- | ------------------------------ |
| `POST /`          | `create`      | Invalidate cache               |
| `GET /`           | `findAll`     | Standard                       |
| `GET /:id`        | `findById`    | Standard                       |
| `PATCH /:id`      | `update`      | Invalidate cache               |
| `DELETE /:id`     | `remove`      | Soft delete + invalidate cache |
| `POST /:id/image` | `uploadImage` | **Complex image upload flow**  |

**Image upload flow (`uploadImage`):**

1. Validate file exists (`BadRequestException` nếu không)
2. `@UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))` — max 5MB
3. **Fetch current item** (để lấy `imagePublicId` nếu có ảnh cũ)
4. **Upload to Cloudinary** via `cloudinaryService.uploadImage()` — sử dụng `CloudinaryFolder.MENU`
5. **Delete old image** nếu `currentItem.imagePublicId` tồn tại
6. **Update item** với `imageUrl` + `imagePublicId` mới qua TCP
7. Invalidate menu cache

**Điểm cần chú ý khi review:**

- Image upload ở BFF layer, không phải Catalog service — vì Cloudinary credentials ở BFF
- File size limit 5MB hardcoded — có thể cần move ra config
- Delete old image **sau khi** upload thành công — đảm bảo có ảnh mới trước khi xóa cũ

---

### 3.4 Table Admin Controller (BFF)

📄 **`apps/bff/src/app/modules/catalog/controllers/table.controller.ts`**

**Route prefix:** `admin/tables`

| Route                     | Method         | Đặc biệt            |
| ------------------------- | -------------- | ------------------- |
| `POST /`                  | `create`       | Standard            |
| `GET /`                   | `findAll`      | Standard            |
| `GET /:id`                | `findById`     | Standard            |
| `PATCH /:id`              | `update`       | Standard            |
| `PATCH /:id/status`       | `updateStatus` | State transition    |
| `POST /:id/regenerate-qr` | `regenerateQr` | Regenerate QR token |
| `DELETE /:id`             | `remove`       | Hard delete         |

**So sánh:** Không có cache invalidation — table operations không ảnh hưởng public menu.

---

### 3.5 Public Menu Controller (BFF)

📄 **`apps/bff/src/app/modules/catalog/controllers/menu.controller.ts`**

**Route prefix:** `menu`

**Dependencies:** `catalogClient`, `cacheManager`

| Route                    | Method       | Auth                        | Mô tả              |
| ------------------------ | ------------ | --------------------------- | ------------------ |
| `GET /menu`              | `getMenu`    | **Không** — public endpoint | Lấy menu công khai |
| `POST /menu/validate-qr` | `validateQr` | **Không** — public endpoint | Validate QR scan   |

**Caching strategy cho `getMenu`:**

```
1. Check cache: cacheManager.get(`menu:${tenantId}`)
2. Nếu có cached → return ngay (không gọi Catalog service)
3. Nếu miss → TCP call GET_PUBLIC_MENU
4. Cache result: cacheManager.set(key, result, TTL * 1000)
   TTL = 600 seconds (10 phút)
5. Return result
```

**Điểm cần chú ý:**

- `MENU_CACHE_TTL = 600` (10 phút) — static readonly, hardcoded
- Cache TTL tính bằng milliseconds khi set (`TTL * 1000`) nhưng khai báo bằng seconds
- **Không có auth** — cả `getMenu` và `validateQr` đều public
- `validateQr` forward trực tiếp qua TCP không cache

---

## Layer 4: Unit Tests

### 4.1 CategoryService Tests

📄 **`apps/catalog/src/app/modules/category/tests/category.service.spec.ts`**

**Số test cases:** 6

| Describe  | Test                                                                 | Kiểm tra                                                 |
| --------- | -------------------------------------------------------------------- | -------------------------------------------------------- |
| `create`  | should create a category successfully                                | Happy path — `existsByName` false, `create` returns mock |
| `create`  | should throw BadRequestException for duplicate name                  | `existsByName` true → `BadRequestException`              |
| `getById` | should return category when found                                    | `findByIdAndTenant` returns mock                         |
| `getById` | should throw NotFoundException when not found                        | `findByIdAndTenant` returns null → `NotFoundException`   |
| `delete`  | should delete when no menu items exist                               | `menuItemRepo.count = 0` → `deleteByIdAndTenant` called  |
| `delete`  | should throw BadRequestException when category has active menu items | `menuItemRepo.count = 3` → `BadRequestException`         |
| `reorder` | should batch update sort orders and return updated list              | `batchUpdateSortOrder` → `findAllByTenant`               |

**Mock setup:** Dùng `jest.Mocked<CategoryRepository>` + `menuItemRepo` mock riêng.

**Coverage highlights:**

- ✅ Duplicate name validation
- ✅ Not found handling
- ✅ Referential integrity (menu items check)
- ✅ Batch reorder
- ❌ Không test `update` (missing)
- ❌ Không test `getList` (đơn giản, delegate only)

### 4.2 AreaService Tests

📄 **`apps/catalog/src/app/modules/area/tests/area.service.spec.ts`**

**Số test cases:** 5

| Describe  | Test            | Kiểm tra                                      |
| --------- | --------------- | --------------------------------------------- |
| `create`  | success         | Happy path                                    |
| `create`  | duplicate name  | `BadRequestException`                         |
| `getById` | not found       | `NotFoundException`                           |
| `delete`  | area has tables | `tableRepo.count = 5` → `BadRequestException` |
| `reorder` | batch update    | Batch update + return list                    |

**So sánh CategoryService tests:** Ít test hơn (5 vs 6). Thiếu test `delete` happy path và `update`.

### 4.3 MenuItemService Tests

📄 **`apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts`**

**Số test cases:** 8

| Describe      | Test                         | Kiểm tra                                            |
| ------------- | ---------------------------- | --------------------------------------------------- |
| `create`      | success                      | Validate category → create                          |
| `create`      | invalid category             | `categoryRepo.findOne` null → `BadRequestException` |
| `getList`     | return items                 | `findAllByTenant` delegation                        |
| `getById`     | not found                    | `NotFoundException`                                 |
| `update`      | success                      | `findByIdAndTenant` + `updateByIdAndTenant`         |
| `update`      | invalid categoryId on update | Cross-entity validation                             |
| `softDelete`  | success                      | `findByIdAndTenant` → `softDelete`                  |
| `updateImage` | success                      | Verify exists → update imageUrl + imagePublicId     |

**Coverage highlights:**

- ✅ Cross-entity validation (category belongs to tenant)
- ✅ Soft delete flow
- ✅ Image update flow
- Tốt nhất trong 5 test suites (8 tests)

### 4.4 TableService Tests

📄 **`apps/catalog/src/app/modules/table/tests/table.service.spec.ts`**

**Số test cases:** 9

| Describe          | Test                    | Kiểm tra                                           |
| ----------------- | ----------------------- | -------------------------------------------------- |
| `create`          | auto-generated QR token | Two-step create → `updateByIdAndTenant`            |
| `create`          | invalid area            | `areaRepo.findOne` null → `BadRequestException`    |
| `create`          | duplicate name          | `existsByName` true → `BadRequestException`        |
| `delete`          | available table         | `status: 'available'`, `sessionId: null` → success |
| `delete`          | occupied table          | `status: 'occupied'` → `BadRequestException`       |
| `updateStatus`    | available → occupied    | Valid transition                                   |
| `updateStatus`    | occupied → billing      | Valid transition                                   |
| `updateStatus`    | available → cleaning    | **Invalid** → `BadRequestException`                |
| `updateStatus`    | billing → available     | **Invalid** → `BadRequestException`                |
| `validateQrToken` | correct token           | HMAC match → return table                          |
| `validateQrToken` | wrong token             | HMAC mismatch → `BadRequestException`              |

**Coverage highlights:**

- ✅ QR token generation/validation (HMAC-SHA256)
- ✅ State machine transitions (2 valid + 2 invalid)
- ✅ Delete protection (active table)
- Nhiều test nhất (9 tests) — phản ánh complexity của TableService

**Test setup đặc biệt:** `ConfigService` mock trả `TEST_SECRET` cho QR token generation.

### 4.5 MenuService Tests

📄 **`apps/catalog/src/app/modules/menu/tests/menu.service.spec.ts`**

**Số test cases:** 3

| Describe        | Test                                     | Kiểm tra                                                                      |
| --------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| `getPublicMenu` | categories with available items          | Happy path — active categories + available items                              |
| `getPublicMenu` | empty categories                         | No active categories → empty array, `findAvailableItemsByCategory` NOT called |
| `getPublicMenu` | active categories but no available items | Category exists but items empty → `items: []`                                 |

**Coverage highlights:**

- ✅ Data aggregation logic
- ✅ Empty state handling
- ✅ Verify `findAvailableItemsByCategory` not called when no categories
- Ít test nhất (3) — phản ánh simplicity của read-only service

---

## Tổng Kết

### Data Flow Diagram

```
Client Request
     │
     ▼
┌─────────────────────────────────────┐
│         BFF Gateway (:3000)         │
│                                     │
│  ┌─ Admin Controllers ───────────┐  │
│  │ @Authorization({secured: true})│  │
│  │ @Permissions([CATALOG_*])     │  │
│  │                               │  │
│  │ CategoryAdminController       │  │
│  │ AreaAdminController           │  │
│  │ MenuItemAdminController       │  │  ← Cloudinary upload ở đây
│  │ TableAdminController          │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌─ Public Controller ───────────┐  │
│  │ MenuPublicController          │  │  ← Redis cache (10 min TTL)
│  │ (No auth required)            │  │
│  └───────────────────────────────┘  │
│                                     │
│  TCP send() ──────────────────────  │
└─────────────────┬───────────────────┘
                  │ TCP (port 3205)
                  ▼
┌─────────────────────────────────────┐
│       Catalog Service (:3005)       │
│                                     │
│  @MessagePattern(TCP_REQUEST_...)   │
│                                     │
│  Controller → Service → Repository  │
│                                     │
│  Business Logic:                    │
│  - Duplicate name checks            │
│  - Referential integrity            │
│  - State machine (Table)            │
│  - HMAC QR token (Table)            │
│  - Soft delete (MenuItem)           │
└─────────────────┬───────────────────┘
                  │ TypeORM
                  ▼
┌─────────────────────────────────────┐
│        PostgreSQL                   │
│  Tables: categories, areas,         │
│          menu_items, tables         │
└─────────────────────────────────────┘
```

### Key Architecture Decisions

| Quyết định                              | Lý do                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Soft delete cho MenuItem**            | Giữ history cho invoice/report. Hard delete cho Category/Area/Table                                 |
| **QR token dùng HMAC-SHA256**           | Deterministic, dễ regenerate, secure with secret. `timingSafeEqual` chống timing attack             |
| **State machine cho Table**             | `available → occupied → billing → cleaning → available`. `billing → occupied` cho phép gọi thêm món |
| **Cache invalidation ở BFF**            | Mỗi mutation (create/update/delete) → xóa cache `menu:{tenantId}`. Public menu cache 10 phút        |
| **Cloudinary upload ở BFF**             | Credentials ở BFF layer. Catalog service chỉ lưu URL/publicId                                       |
| **Batch reorder trong transaction**     | Đảm bảo atomicity khi đổi sortOrder nhiều items                                                     |
| **Referential integrity trong service** | Category check menu items, Area check tables trước khi xóa                                          |
| **TCP message patterns as constants**   | Type-safe, centralized, avoid typo                                                                  |

### Known Limitations / Future Work

1. **Không có pagination** — `getList` trả toàn bộ records. Cần thêm limit/offset cho restaurants lớn
2. **Menu cache TTL hardcoded** — 10 phút, nên move ra env config
3. **File size limit hardcoded** — 5MB cho image upload, nên configurable
4. **Không có image resize** — upload gốc lên Cloudinary, nên optimize kích thước
5. **Table state machine** — chưa có event sourcing/logging cho transitions
6. **Missing unit tests** — `CategoryService.update`, `AreaService.delete` happy path, BFF controllers chưa có test
7. **QR token fallback secret** — `'default-secret-change-me'` trong code — PHẢI set env var trong production
8. **Không có rate limiting** — public endpoints (`/menu`, `/validate-qr`) chưa có rate limit
9. **Promise.all trong MenuService** — nếu có nhiều categories, có thể cần query optimization (JOIN thay vì N+1)
10. **Chưa có search/filter** cho MenuItem theo name — chỉ filter theo categoryId
