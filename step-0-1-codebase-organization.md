# Step 0.1 - Đánh dấu và Tổ chức Codebase (Ngày 1-2)

## Goal

Hoàn thành việc đánh dấu template services khóa học, tạo 2 service mới `catalog` và `saas` theo đúng pattern hiện có, giữ nguyên `bff` và `authorizer`, và verify serve thành công cho `bff/catalog/saas`.

## Scope

- Không xóa, không refactor logic của các template service khóa học.
- Chỉ scaffold + wiring tối thiểu để chạy được service mới.
- Chưa mở rộng feature business (chỉ xong nền tảng Step 0.1).

## Baseline đã xác nhận

- Workspace đang dùng Nx 22 + `@nx/nest`.
- Pattern hiện tại cho app service là: HTTP app + `connectMicroservice(Transport.TCP)` + `startAllMicroservices`.
- `product` là template PostgreSQL + TypeORM.
- `user-access` là template service có TCP + gRPC wiring.
- `bff` là API Gateway có `ClientsModule.registerAsync` với `TcpProvider/GrpcProvider`.
- Biến môi trường hiện có chưa có `catalog/saas`.

## Context7 notes cần áp dụng

- Nx: dùng generator `@nx/nest:application` (`@nx/nest:app` alias) để scaffold app mới trong workspace.
- NestJS hybrid app: dùng `app.connectMicroservice(...)` và `await app.startAllMicroservices()` trước `app.listen(...)`.

## Deliverables

1. README đánh dấu template trong 4 folder:
   - `apps/invoice`
   - `apps/invoice-e2e`
   - `apps/product`
   - `apps/user-access`
2. 2 service mới được tạo:
   - `apps/catalog`
   - `apps/saas`
3. Shared config được mở rộng để biết TCP service mới:
   - `libs/configuration/src/lib/tcp.config.ts`
4. Message constants có namespace mới cho `catalog/saas`:
   - `libs/constants/src/lib/enum/tcp-request-message.ts`
5. `.env.example` bổ sung biến cho `catalog/saas`.
6. Verify thành công:
   - `nx serve bff`
   - `nx serve catalog`
   - `nx serve saas`

## Day 1 plan (Template marking + Scaffold)

### Task 1 - Đánh dấu template services (không sửa code)

- Tạo/ghi đè `README.md` cho:
  - `apps/invoice/README.md`
  - `apps/invoice-e2e/README.md`
  - `apps/product/README.md`
  - `apps/user-access/README.md`
- Nội dung chung:
  - `COURSE TEMPLATE - Do not modify`
  - Mô tả ngắn pattern tham khảo (Mongo/TCP, TypeORM/TCP, Keycloak/gRPC, E2E).

Verify:

- Mở từng README và đảm bảo có cảnh báo rõ ràng.
- Không có thay đổi source code logic trong các app template.

### Task 2 - Generate catalog app

Lệnh để dùng:

- `nx generate @nx/nest:app catalog --unitTestRunner=jest --e2eTestRunner=jest`

Nếu muốn generator tối giản (ít file test):

- `nx generate @nx/nest:app catalog --unitTestRunner=none --e2eTestRunner=none`

Sau generate:

- Chỉnh bootstrap của `apps/catalog/src/main.ts` theo pattern `product`:
  - `connectMicroservice` với `TCP_CATALOG_SERVICE`.
  - `globalPrefix` theo config (ưu tiên `APP_CONFIG/GLOBAL_PREFIX` thống nhất với BFF).
  - Port dùng `CATALOG_PORT`.
- Tạo module structure catalog theo product template:
  - `app/modules/catalog/catalog.module.ts`
  - `controllers/catalog.controller.ts`
  - `services/catalog.service.ts`
  - `repositories/catalog.repository.ts`

Verify:

- `nx build catalog` pass.
- Không lỗi import aliases.

### Task 3 - Generate saas app

Lệnh để dùng:

- `nx generate @nx/nest:app saas --unitTestRunner=jest --e2eTestRunner=jest`

Sau generate:

- Chỉnh bootstrap `apps/saas/src/main.ts` theo pattern `product` (TCP service).
- Nếu cần tham khảo `user-access` thì chỉ copy ý tưởng config + wiring, không copy Mongo module.
- Giữ `saas` theo hướng TypeORM/TCP trong Step 0.1 để đơn giản setup ban đầu.

Verify:

- `nx build saas` pass.
- Không lỗi import aliases.

## Day 2 plan (Shared wiring + Verify serve)

### Task 4 - Mở rộng TCP config cho service mới

Cập nhật `libs/configuration/src/lib/tcp.config.ts`:

- Thêm enum:
  - `CATALOG_SERVICE = TCP_CATALOG_SERVICE`
  - `SAAS_SERVICE = TCP_SAAS_SERVICE`
- Thêm properties trong `TcpConfiguration` class:
  - `TCP_CATALOG_SERVICE`
  - `TCP_SAAS_SERVICE`

Verify:

- Tất cả app dùng `TcpProvider` compile không lỗi.

### Task 5 - Mở rộng TCP request message constants

Cập nhật `libs/constants/src/lib/enum/tcp-request-message.ts`:

- Thêm namespace `CATALOG`:
  - `CREATE, GET_BY_ID, GET_LIST, UPDATE, DELETE`
- Thêm namespace `SAAS`:
  - `CREATE, GET_BY_ID, GET_LIST, UPDATE, DELETE`
- Export 2 namespace này trong `TCP_REQUEST_MESSAGE`.

Verify:

- Controller mới có thể `@MessagePattern(TCP_REQUEST_MESSAGE.CATALOG.*)`.

### Task 6 - Bổ sung biến môi trường

Cập nhật `.env.example` (giữ naming convention hiện tại):

- `CATALOG_PORT=3005`
- `SAAS_PORT=3006`
- `CATALOG_SERVICE_HOST=localhost`
- `SAAS_SERVICE_HOST=localhost`
- `TCP_CATALOG_SERVICE_PORT=3205`
- `TCP_SAAS_SERVICE_PORT=3206`

Verify:

- Load config không fail validation.

### Task 7 - Giữ nguyên app hạ tầng đang dùng

- `BFF`: giữ nguyên và cho phép mở rộng controller/module sau Step 0.1.
- `Authorizer`: giữ nguyên hoàn toàn (không sửa flow Keycloak gRPC).

Verify:

- `git diff` cho thấy không có thay đổi logic ở app `authorizer` (nếu có thì rollback thay đổi Step 0.1).

### Task 8 - Verify runtime theo yêu cầu Step 0.1

Chuẩn bị:

- `pnpm install`
- `nx reset`

Chạy từng service:

- `nx serve bff`
- `nx serve catalog`
- `nx serve saas`

Điều kiện đạt:

- 3 lệnh đều start thành công, không crash startup.
- `bff` lên được swagger route theo global prefix.
- `catalog` và `saas` bind TCP port đúng theo env.

## Suggested implementation order (khuyến nghị)

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 6
6. Task 5
7. Task 7
8. Task 8

## Risks và cách xử lý nhanh

- Risk: Generator tạo bootstrap khác pattern hiện tại.
  - Fix: canh theo `main.ts` của `product`, giữ `connectMicroservice + startAllMicroservices`.
- Risk: Sai biến env `TCP_*` => service không kết nối.
  - Fix: đối chiếu tên enum trong `tcp.config.ts` và tên biến `.env.example`.
- Risk: Prefix API giữa app mới và `bff` không đồng bộ.
  - Fix: ưu tiên dùng `GLOBAL_PREFIX` trong configuration.
- Risk: thay đổi lan sang `authorizer/bff` ngoài phạm vi.
  - Fix: giới hạn commit theo scope file danh sách deliverables.

## Done when

- README template đã được tạo cho 4 app khóa học.
- `catalog` và `saas` đã tồn tại, build được, serve được.
- `tcp.config` + `tcp-request-message` + `.env.example` đã bổ sung đầy đủ.
- `bff` và `authorizer` vẫn giữ nguyên theo scope Step 0.1.
