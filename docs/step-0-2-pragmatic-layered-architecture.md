# Step 0.2 - Áp dụng Pragmatic Layered Architecture cho Catalog & SaaS (Ngày 2-3)

## Goal

Chuẩn hóa `catalog` và `saas` theo kiến trúc Pragmatic Layered (Controllers -> Services -> Repositories -> Entities -> DTOs), giữ đúng tinh thần KISS/YAGNI, đồng thời mở rộng BFF để gọi được 2 service mới qua TCP.

## Decision (ADR ngắn)

- Vấn đề: Cần kiến trúc nhất quán, dễ nhân rộng cho 8 services, không over-engineering.
- Lựa chọn A: Clean Architecture đầy đủ (domain/application/infrastructure/presentation).
- Lựa chọn B: Pragmatic Layered (N-tier) theo pattern NestJS hiện có trong codebase.
- Chọn: Lựa chọn B.

### Rationale

1. Tăng tốc triển khai phase 0-2, copy pattern trực tiếp từ template `product`/`user-access`.
2. Phù hợp năng lực và hạ tầng hiện tại của monorepo Nx + NestJS.
3. Tránh boilerplate interface/mapper không cần thiết ở giai đoạn hiện tại.

### Trade-off chấp nhận

- Ít abstraction hơn Clean Architecture, đổi lại velocity cao hơn.
- Cần kỷ luật trong service/repository để không trôi thành "fat service".

### Revisit Trigger

- Khi số use-case phức tạp tăng mạnh (Saga sâu, policy engine, nhiều bounded context), cân nhắc tách domain layer rõ hơn ở phase sau.

## Phạm vi Step 0.2

### In Scope

1. Chuẩn hóa cấu trúc source của `catalog` và `saas` theo Pragmatic Layered.
2. Bổ sung DTO/interface còn thiếu để typed contract rõ ràng.
3. Hoàn thiện CRUD message patterns cho TCP ở cả 2 service.
4. Tích hợp BFF module/controller cho `catalog` và `saas`.
5. Verify build + serve + smoke test end-to-end qua BFF.

### Out of Scope

1. Không làm UI/frontend trong Step 0.2.
2. Không triển khai Redis cache/menu optimization.
3. Không triển khai Saga/Kafka flow.
4. Không đổi sâu auth model (chỉ giữ tương thích guard hiện tại).

## Target Structure

Mỗi service tuân thủ cấu trúc này:

```text
apps/{service}/src/
├── main.ts
├── configuration/
│   └── index.ts
├── app.module.ts
├── controllers/
│   └── {service}.controller.ts
├── services/
│   └── {service}.service.ts
├── repositories/
│   └── {service}.repository.ts
├── entities/
│   └── {service}.entity.ts
└── dtos/
    ├── create-{service}.dto.ts
    ├── update-{service}.dto.ts
    └── {service}-response.dto.ts
```

Ghi chú:

- `entities` tại app-level sẽ tái-export hoặc map trực tiếp từ `libs/entities` để không duplicate schema.
- Không tạo mapper layer riêng ở Step 0.2.

## Current State Snapshot

1. `apps/catalog` và `apps/saas` đang ở dạng `app/modules/...` (chưa đúng target root-layer).
2. CRUD TCP mới có `CREATE` và `GET_LIST`, thiếu `GET_BY_ID`, `UPDATE`, `DELETE`.
3. BFF chưa có module/controller cho `catalog` và `saas`.
4. `libs/configuration/src/lib/tcp.config.ts` và `libs/constants/src/lib/enum/tcp-request-message.ts` đã có enum cần thiết.
5. `.env.example` đã có port/host cho 2 service mới.

## Kế hoạch triển khai chi tiết

## Task 1 - Chuẩn bị và dọn scaffold thừa

Mục tiêu: loại bỏ file Nx boilerplate không cần thiết, giảm nhiễu kiến trúc.

Thao tác:

1. Xóa:
   - `apps/catalog/src/app/app.controller.ts`
   - `apps/catalog/src/app/app.service.ts`
   - `apps/saas/src/app/app.controller.ts`
   - `apps/saas/src/app/app.service.ts`
2. Đảm bảo entrypoint module không phụ thuộc các file bị xóa.

Verify:

- `nx build catalog`
- `nx build saas`

## Task 2 - Tái cấu trúc folder cho catalog về root-layer

Mục tiêu: chuyển từ `app/modules/catalog/*` sang `src/controllers|services|repositories|entities|dtos`.

Thao tác:

1. Tạo `apps/catalog/src/controllers/catalog.controller.ts`.
2. Tạo `apps/catalog/src/services/catalog.service.ts`.
3. Tạo `apps/catalog/src/repositories/catalog.repository.ts`.
4. Tạo `apps/catalog/src/entities/catalog.entity.ts` (re-export từ `@common/entities/catalog.entity`).
5. Tạo `apps/catalog/src/dtos/*` gồm:
   - `create-catalog.dto.ts`
   - `update-catalog.dto.ts`
   - `catalog-response.dto.ts`
6. Tạo `apps/catalog/src/app.module.ts` (root module mới) import TypeORM + bind controller/provider.
7. Cập nhật `apps/catalog/src/main.ts` trỏ đúng `AppModule` mới.

Verify:

- Build pass, không lỗi import path.
- `nx serve catalog` start thành công.

## Task 3 - Hoàn thiện CRUD + typed contract cho catalog

Mục tiêu: đồng bộ đủ CRUD theo enum message.

Thao tác:

1. Controller hỗ trợ:
   - `CATALOG.CREATE`
   - `CATALOG.GET_LIST`
   - `CATALOG.GET_BY_ID`
   - `CATALOG.UPDATE`
   - `CATALOG.DELETE`
2. Service thêm logic:
   - validate input (guard clause)
   - check duplicate theo `(tenantId, name)`
   - not-found handling
3. Repository thêm method:
   - `findById`
   - `updateById`
   - `deleteById`

Verify:

- Unit smoke qua TCP call nội bộ (manual hoặc test nhanh).
- Không dùng `Partial<Entity>` ở API boundary, thay bằng DTO.

## Task 4 - Tái cấu trúc folder cho saas về root-layer

Mục tiêu: cùng pattern với catalog để đảm bảo nhất quán.

Thao tác:

1. Tạo `apps/saas/src/controllers/saas.controller.ts`.
2. Tạo `apps/saas/src/services/saas.service.ts`.
3. Tạo `apps/saas/src/repositories/saas.repository.ts`.
4. Tạo `apps/saas/src/entities/tenant.entity.ts` (re-export từ `@common/entities/tenant.entity`).
5. Tạo `apps/saas/src/dtos/*` gồm:
   - `create-tenant.dto.ts`
   - `update-tenant.dto.ts`
   - `tenant-response.dto.ts`
6. Tạo `apps/saas/src/app.module.ts` (root module mới), cập nhật `main.ts`.

Verify:

- `nx build saas`
- `nx serve saas`

## Task 5 - Hoàn thiện CRUD + typed contract cho saas

Mục tiêu: đủ CRUD và rule slug rõ ràng.

Thao tác:

1. Controller hỗ trợ đủ message patterns:
   - `SAAS.CREATE`, `SAAS.GET_LIST`, `SAAS.GET_BY_ID`, `SAAS.UPDATE`, `SAAS.DELETE`
2. Service rules:
   - `name` bắt buộc
   - `slug` auto-generate nếu thiếu
   - unique slug check
3. Repository:
   - `findById`, `findBySlug`, `updateById`, `deleteById`, `existsBySlug`

Verify:

- Trường hợp trùng slug trả lỗi nhất quán.
- Trường hợp not-found trả lỗi rõ ràng.

## Task 6 - Mở rộng BFF để route Catalog/SaaS

Mục tiêu: client gọi HTTP qua BFF để truy cập service mới.

Thao tác:

1. Tạo module mới:
   - `apps/bff/src/app/modules/catalog/catalog.module.ts`
   - `apps/bff/src/app/modules/saas/saas.module.ts`
2. Tạo controller tương ứng trong BFF:
   - map REST -> TCP `.send(...)` theo pattern `product.controller.ts`
3. Cập nhật `apps/bff/src/app/app.module.ts` để import 2 module mới.

Verify:

- `nx build bff`
- `nx serve bff`
- gọi thử endpoint BFF tới catalog/saas thành công.

## Task 7 - Chuẩn hóa interfaces dùng chung (nếu cần)

Mục tiêu: đồng bộ kiểu dữ liệu giữa gateway và TCP.

Thao tác:

1. Tạo interface/DTO mới tại `libs/interfaces` theo pattern `product`:
   - `libs/interfaces/src/lib/tcp/catalog/*`
   - `libs/interfaces/src/lib/tcp/saas/*`
   - `libs/interfaces/src/lib/gateway/catalog/*`
   - `libs/interfaces/src/lib/gateway/saas/*`
2. Export qua các file `index.ts` liên quan.

Verify:

- Build toàn workspace không lỗi circular/import.

## Task 8 - Verify tổng Step 0.2

Mục tiêu: xác nhận hoàn tất kỹ thuật và sẵn sàng sang bước tiếp.

Lệnh verify bắt buộc:

```bash
pnpm nx build catalog
pnpm nx build saas
pnpm nx build bff

pnpm nx serve catalog
pnpm nx serve saas
pnpm nx serve bff
```

Smoke test:

1. Catalog:
   - create
   - get list
   - get by id
   - update
   - delete
2. SaaS:
   - create tenant
   - get list
   - get by id
   - update
   - delete
3. BFF:
   - HTTP route chuyển tiếp đúng sang TCP service.

## Risk & Mitigation

1. Rủi ro: đổi cấu trúc folder gây vỡ import.
   - Mitigation: migrate theo từng service, build ngay sau mỗi task.
2. Rủi ro: thiếu đồng bộ enum message giữa BFF và service.
   - Mitigation: chỉ dùng hằng số từ `TCP_REQUEST_MESSAGE`, không hard-code.
3. Rủi ro: controller dùng type quá lỏng (`Partial<Entity>`).
   - Mitigation: bắt buộc DTO ở boundary.
4. Rủi ro: tenant isolation chưa chặt.
   - Mitigation: trong Step 0.2 enforce tối thiểu ở service/repository bằng `tenantId`.

## Done When

- [ ] `catalog` và `saas` đã ở cấu trúc Pragmatic Layered root-level.
- [ ] Hai service có đủ CRUD message handlers.
- [ ] BFF đã có module/controller cho catalog và saas.
- [ ] Build + serve cả 3 service ổn định.
- [ ] Smoke test HTTP -> TCP pass cho các đường chính.
- [ ] Không thêm abstraction dư thừa ngoài KISS/YAGNI.
