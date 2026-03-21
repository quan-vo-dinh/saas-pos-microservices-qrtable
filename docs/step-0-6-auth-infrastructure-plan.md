# Step 0.6 - Kế Hoạch Triển Khai Chi Tiết Hạ Tầng Auth

## 1. Mục tiêu

Triển khai đầy đủ Step 0.6 theo roadmap trong [docs/implementation_plan.md](docs/implementation_plan.md):

1. Cập nhật hạ tầng provider để đảm bảo PostgreSQL, Redis, Keycloak, MongoDB vận hành ổn định.
2. Thiết lập Keycloak realm `qrtable`, client và role cho hệ thống QRTable.
3. Bổ sung `SessionGuard` cho customer anonymous auth.
4. Bổ sung `TenantGuard` để enforce tenant isolation mặc định.
5. Bổ sung `TenantMiddleware` để trích xuất tenant từ subdomain/header.
6. Verify kết nối BFF -> Catalog TCP và BFF -> SaaS TCP.

## 2. Phạm vi

### In scope

1. Hạ tầng auth và tenant context cho backend.
2. Guard/middleware tại BFF và shared libs.
3. Keycloak realm/client/roles/claims phục vụ actor của QRTable.
4. Health check và smoke test connectivity giữa service.

### Out of scope

1. UI login/redirect ở frontend (thuộc Step 0.7+).
2. Saga/Kafka/ordering/payment logic.
3. Refactor lớn kiến trúc hiện hữu ngoài phạm vi auth nền tảng.

## 3. Baseline hiện tại (đã khảo sát)

1. Compose provider đã có Postgres/Redis/Keycloak/Mongo tại [docker-compose.provider.yaml](docker-compose.provider.yaml), nhưng chưa có healthcheck đầy đủ.
2. BFF hiện dùng global guard `UserGuard`, `PermissionGuard`, `ThrottlerGuard` tại [apps/bff/src/app/app.module.ts](apps/bff/src/app/app.module.ts).
3. Shared guard hiện mới có [libs/guards/src/lib/user.guard.ts](libs/guards/src/lib/user.guard.ts) và [libs/guards/src/lib/permission.guard.ts](libs/guards/src/lib/permission.guard.ts).
4. Chưa có `TenantGuard`, `SessionGuard`, `TenantMiddleware`.
5. Keycloak config đã chuyển sang realm `qrtable` tại [.env.example](.env.example) và [libs/configuration/src/lib/keycloak.config.ts](libs/configuration/src/lib/keycloak.config.ts).
6. BFF đã có module Catalog/SaaS và gọi TCP qua `processId`, nhưng chưa truyền tenant context rõ ràng tại:

- [apps/bff/src/app/modules/catalog/controllers/catalog.controller.ts](apps/bff/src/app/modules/catalog/controllers/catalog.controller.ts)
- [apps/bff/src/app/modules/saas/controllers/saas.controller.ts](apps/bff/src/app/modules/saas/controllers/saas.controller.ts)

## 4. Nguyên tắc triển khai

1. KISS/YAGNI: chỉ thêm đủ phần phục vụ Step 0.6.
2. Tenant isolation by default: mọi request nghiệp vụ phải có tenant context.
3. Customer flow là session-based anonymous theo business doc.
4. Không phá pattern đang dùng trong monorepo (BFF gateway + TCP microservices).
5. Ưu tiên thay đổi có thể verify tự động bằng command cụ thể.

## 5. Thiết kế mục tiêu sau triển khai

## 5.1 Request lifecycle tại BFF

1. `TenantMiddleware` chạy sớm để resolve tenant từ host/header.
2. `UserGuard` dùng cho flow JWT (staff/owner/admin).
3. `SessionGuard` dùng cho flow customer anonymous.
4. `TenantGuard` enforce tenant hợp lệ và nhất quán với identity/session.
5. `PermissionGuard` xử lý authorization theo permission.

## 5.2 Tenant context chuẩn hóa

Context tối thiểu cho request nội bộ:

- `processId`
- `tenantId`
- `userId` (nếu có JWT)
- `sessionId` (nếu customer flow)

## 5.3 Keycloak mục tiêu

1. Realm: `qrtable`.
2. Roles: `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`.
3. Client cho backend gateway và app client cho frontend.
4. Token claims có `tenant_id` (và `sub_role` nếu cần) qua protocol mapper.

## 6. Danh sách thay đổi theo hạng mục

## 6.1 Infra & environment

### Files chính

1. [docker-compose.provider.yaml](docker-compose.provider.yaml)
2. [.env.example](.env.example)

### Việc cần làm

1. Bổ sung healthcheck cho postgres, redis, keycloak, mongodb.
2. Chuẩn hóa biến môi trường Keycloak sang realm/client của QRTable.
3. Tách rõ config dev mẫu để onboarding không nhầm realm cũ.

### Kết quả mong đợi

1. `docker compose ... up -d` lên đầy đủ.
2. `docker compose ... ps` hiển thị health status ổn định.

## 6.2 Keycloak realm bootstrap

### Việc cần làm

1. Tạo realm `qrtable`.
2. Tạo clients cần thiết.
3. Tạo realm roles theo actor của hệ thống.
4. Tạo protocol mapper cho `tenant_id`.
5. Tạo test users theo role để smoke test.

### Gợi ý endpoint quản trị (theo Context7)

1. `POST /admin/realms/{realm}/clients`
2. `POST /admin/realms/{realm}/roles`
3. `POST /admin/realms/{realm}/clients/{client-uuid}/protocol-mappers/models`

## 6.3 Shared metadata và middleware

### Files chính

1. [libs/constants/src/lib/common.constant.ts](libs/constants/src/lib/common.constant.ts)
2. [libs/middlewares/src/lib/logger.middleware.ts](libs/middlewares/src/lib/logger.middleware.ts)
3. File mới: `libs/middlewares/src/lib/tenant.middleware.ts`
4. File export index tương ứng trong `libs/middlewares`.

### Việc cần làm

1. Thêm metadata key cho `TENANT_ID`, `SESSION_ID`.
2. Tạo `TenantMiddleware`:

- Ưu tiên đọc `x-tenant-id`.
- Fallback parse từ host/subdomain.
- Gắn vào request context.

3. Đăng ký middleware tại BFF module.

## 6.4 Guards cho tenant/session

### Files chính

1. File mới: `libs/guards/src/lib/session.guard.ts`
2. File mới: `libs/guards/src/lib/tenant.guard.ts`
3. [apps/bff/src/app/app.module.ts](apps/bff/src/app/app.module.ts)
4. File export index tương ứng trong `libs/guards`.

### Việc cần làm

1. `SessionGuard`:

- Đọc session từ cookie/header.
- Tạo session anonymous nếu policy cho phép.
- Validate session TTL với Redis.
- Inject `sessionId` vào request.

2. `TenantGuard`:

- Kiểm tra tenant có trong context.
- So khớp tenant với JWT claim hoặc session mapping.
- Cho phép case đặc biệt super admin theo policy.

3. Đăng ký guard theo thứ tự phù hợp trong BFF.

## 6.5 TCP request context + health check

### Files chính

1. [libs/interfaces/src/lib/tcp/common/request.interface.ts](libs/interfaces/src/lib/tcp/common/request.interface.ts)
2. [libs/constants/src/lib/enum/tcp-request-message.ts](libs/constants/src/lib/enum/tcp-request-message.ts)
3. [apps/bff/src/app/modules/catalog/controllers/catalog.controller.ts](apps/bff/src/app/modules/catalog/controllers/catalog.controller.ts)
4. [apps/bff/src/app/modules/saas/controllers/saas.controller.ts](apps/bff/src/app/modules/saas/controllers/saas.controller.ts)
5. Catalog/SaaS controller TCP handlers để thêm message health.
6. Module health ở BFF (nếu tách module mới).

### Việc cần làm

1. Mở rộng request envelope có `tenantId`, `userId`, `sessionId`.
2. BFF gửi tenant context trong call TCP đến Catalog/SaaS.
3. Thêm message pattern health cho Catalog/SaaS.
4. Thêm endpoint health ở BFF tổng hợp trạng thái downstream.

## 7. Kế hoạch thực thi theo thời gian (2 ngày)

## Ngày 5

### Block A (Sáng) - Infra readiness

1. Update compose healthcheck.
2. Update env mẫu keycloak.
3. Chạy provider stack.

### Block B (Trưa) - Keycloak bootstrap

1. Tạo realm/client/roles.
2. Tạo mapper claim tenant.
3. Tạo user test role-based.

### Block C (Chiều) - Middleware + metadata

1. Implement `TenantMiddleware`.
2. Bổ sung metadata keys.
3. Wiring vào BFF.

## Ngày 6

### Block D (Sáng) - Guards

1. Implement `TenantGuard`.
2. Implement `SessionGuard`.
3. Đăng ký global/route guards phù hợp.

### Block E (Trưa) - TCP context + health

1. Mở rộng TCP request interface.
2. Cập nhật BFF catalog/saas controllers.
3. Thêm handlers health ở catalog/saas.
4. Thêm health endpoint ở BFF.

### Block F (Chiều) - Verify end-to-end

1. Build/serve các project liên quan.
2. Smoke test auth, tenant isolation, tcp health.
3. Chốt báo cáo pass/fail theo acceptance criteria.

## 8. Verification plan

## 8.1 Build/serve

```bash
pnpm nx run-many -t build -p authorizer,bff,catalog,saas
pnpm nx serve authorizer
pnpm nx serve catalog
pnpm nx serve saas
pnpm nx serve bff
```

## 8.2 Infra health

```bash
docker compose -f docker-compose.provider.yaml up -d
docker compose -f docker-compose.provider.yaml ps
```

## 8.3 Auth/tenant smoke tests

1. Login lấy token realm `qrtable` thành công.
2. Request có tenant hợp lệ đi qua.
3. Request cross-tenant bị chặn.
4. Customer không JWT vẫn có session flow hợp lệ.

## 8.4 Connectivity health

1. BFF health endpoint trả trạng thái `UP`.
2. Có trạng thái downstream cho catalog và saas đều `UP`.

## 9. Acceptance criteria (Definition of Done)

1. Provider stack gồm PG/Redis/Keycloak/Mongo chạy ổn định với healthcheck.
2. Realm `qrtable` + roles `OWNER, MANAGER, WAITER, CHEF, BARISTA` đã có.
3. `SessionGuard`, `TenantGuard`, `TenantMiddleware` đã implement và wiring thành công.
4. BFF truyền tenant context trong call TCP đến Catalog/SaaS.
5. Verify BFF -> Catalog TCP và BFF -> SaaS TCP pass.
6. Không gây regression cho flow auth hiện tại.

## 10. Rủi ro và phương án giảm thiểu

1. Sai thứ tự guard gây deny nhầm.

- Giải pháp: test matrix theo route public/protected.

2. Parse tenant từ host sai ở local.

- Giải pháp: ưu tiên `x-tenant-id` khi dev/test.

3. Cache token stale sau đổi role.

- Giải pháp: giảm TTL hoặc thêm cơ chế invalidate theo phase sau.

4. Nhầm client-id và client-uuid khi dùng Keycloak Admin API.

- Giải pháp: lấy danh sách clients trước, map đúng `id` nội bộ cho endpoint mapper/roles.

## 11. Checklist triển khai nhanh

- [ ] Compose healthcheck đã thêm
- [ ] Env keycloak đã chuyển qrtable
- [ ] Realm/client/roles/mappers đã tạo
- [ ] Tenant metadata keys đã bổ sung
- [ ] TenantMiddleware đã chạy trong BFF
- [ ] TenantGuard đã enforce isolation
- [ ] SessionGuard đã hỗ trợ customer anonymous
- [ ] TCP request envelope đã có tenant/user/session
- [ ] Health endpoint BFF + TCP health handlers đã hoạt động
- [ ] Smoke test pass toàn bộ

## 12. Gợi ý bước tiếp theo sau Step 0.6

1. Bắt đầu Step 0.7 với role-based route mapping frontend dựa trên role Keycloak mới.
2. Chuẩn hóa permission matrix theo actor trong [docs/business-logic.md](docs/business-logic.md).
3. Bổ sung integration tests cho guard chain (tenant/session/auth) trước Phase 1 backend mở rộng.
