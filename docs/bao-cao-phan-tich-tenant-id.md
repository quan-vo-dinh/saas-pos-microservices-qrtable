# Báo cáo phân tích: `tenant_id` và đa tenant (QRTable)

**Ngày:** 2026-04-17  
**Phạm vi:** Logic xác định / truyền / kiểm tra `tenant_id` trên BFF, microservice Catalog (TCP), Management App, Customer PWA — bối cảnh sau khi **Phase 1** đã hoàn thành (theo `docs/phases/phase-1-catalog.md`).  
**Tham chiếu tài liệu:** `docs/phases/phase-1-catalog.md`, `docs/technical-architecture.md` (mục 5 Multi-tenancy, 5.3 Tenant Resolution Flow), `AGENTS.md`.

---

## 1. Tóm tắt điều hành

- **Tenant trong code hiện tại** là một **chuỗi định danh** (DB Catalog: `varchar(64)`; Cloudinary có bước validate UUID v4 nhưng không khớp với dữ liệu dev kiểu `tenant_a`).
- **BFF** gắn tenant vào request qua `TenantMiddleware` (header `x-tenant-id` hoặc subdomain), sau đó `TenantGuard` hợp nhất với claim JWT (nếu có), đồng bộ với **session Redis** (guest).
- **Management App** gửi `x-tenant-id` từ profile đăng nhập (JWT claim `tenant_id` + `/authorizer/me`).
- **Customer PWA** gửi `x-tenant-id` cố định từ biến môi trường (mặc định hardcode dev `tenant_a`) — **không** lấy tenant từ chuỗi QR một cách độc lập trên client ngoài việc bạn cấu hình env.
- **Tài liệu kiến trúc** mô tả thêm Global Query Filter / Entity Subscriber và luồng guest “HMAC → map store → inject tenant”; **code thực tế** khác một phần đáng kể (chi tiết mục 9–10).

---

## 2. Vai trò của `tenant_id` trong nghiệp vụ

- **Phân tách dữ liệu:** Mọi bản ghi tenant-scoped trong Catalog (categories, menu_items, areas, tables) đều có cột `tenant_id`; service layer luôn nhận `tenantId` trong payload TCP và filter theo tenant.
- **Cache Redis:** Ví dụ `menu:{tenant_id}` (public menu), invalidation theo tenant sau CRUD.
- **QR token (HMAC):** `tableId` + `tenantId` tham gia payload HMAC — đổi tenant đổi token hợp lệ.
- **Cloudinary:** Đường dẫn `qrtable/{tenantId}/...` để cô lập file.

---

## 3. Backend — BFF: cách tenant được “resolve”

### 3.1 `TenantMiddleware` (chạy cho mọi route sau logger)

Thứ tự ưu tiên trong `libs/middlewares/src/lib/tenant.middleware.ts`:

1. **Header `x-tenant-id`** — nếu có giá trị sau trim thì dùng trực tiếp.
2. **Subdomain** — lấy segment đầu của `x-forwarded-host` hoặc `host`, bỏ port; nếu số phần tách bằng dấu chấm **≥ `TENANT_POLICY.HOST_MIN_SEGMENTS` (3)** thì coi segment đầu là tenant (ví dụ `tenant.example.com`).

Nếu không suy ra được tenant, middleware **không** gán `MetadataKey.TENANT_ID` (request đi tiếp không có tenant trên context).

### 3.2 Chuỗi guard toàn cục (`apps/bff/src/app/app.module.ts`)

Đăng ký theo thứ tự: `UserGuard` → `SessionGuard` → `TenantGuard` → `PermissionGuard` → `ThrottlerGuard`.  
Theo cơ chế NestJS, **global guards chạy theo thứ tự đăng ký** (global trước, metadata route sau) — `UserGuard` chạy trước `TenantGuard`, nên JWT được xác thực trước khi so khớp claim tenant (quan trọng cho route có `@Authorization({ secured: true })`).

### 3.3 `UserGuard`

- Với route **không** `secured`, bỏ qua xác thực.
- Với route **secured**, gọi Authorizer (gRPC), cache 30 phút, gắn `userData` vào request (chứa JWT đã verify trong metadata).

### 3.4 `SessionGuard`

- Route **secured:** bỏ qua (return true ngay) — session guest không áp dụng.
- Route **public:** đảm bảo có `x-session-id` (header hoặc cookie), tạo/đọc session Redis; gắn `sessionId` lên request; nếu session cũ có `tenantId` và request chưa có tenant thì **bù tenant từ session** (`request[MetadataKey.TENANT_ID] = request[...] || existingSession.tenantId`).

### 3.5 `TenantGuard`

- Đường dẫn khớp `TENANT_POLICY.EXCLUDED_PATH_PREFIXES` (`authorizer`, `health`) thì **bỏ qua** (không bắt buộc tenant).
- `tenantId` hiệu dụng = `request[MetadataKey.TENANT_ID]` (đã set bởi middleware) **hoặc** claim từ JWT: đọc cả `jwt['tenant_id']` và `jwt['tenantId']` (tương thích proto / camelCase).
- **Super admin** (`realm_access.roles` có `SUPER_ADMIN`): **không** bắt buộc có tenant; bỏ qua kiểm tra thiếu tenant và mismatch (cho phép thao tác cross-tenant theo thiết kế tài liệu).
- Người dùng thường: nếu không có `tenantId` → lỗi `TENANT_REQUIRED`.
- Nếu JWT có tenant claim và khác với tenant trên request → `TENANT_MISMATCH_IDENTITY`.
- Nếu có `sessionId` (public flow): session phải tồn tại trong Redis; nếu session đã gắn tenant khác request → `TENANT_MISMATCH_SESSION`; nếu session chưa có tenant thì **ghi tenant hiện tại vào session**.

### 3.6 Truyền sang TCP

`buildTcpRequestContext` (`libs/utils/src/lib/request.util.ts`) đóng gói:

- `data`: DTO nghiệp vụ (BFF thường merge `tenantId` lấy từ `req[MetadataKey.TENANT_ID]` vào đây, ví dụ `CategoryAdminController.create`).
- `tenantId`, `sessionId`, `userId` ở **cấp envelope** (catalog hiện chủ yếu đọc `data.tenantId` qua decorator `@RequestParams`, tức `ctx.switchToRpc().getData().data`).

---

## 4. Catalog Service (TCP)

- Controller TCP dùng `@RequestParams()` → chỉ nhận **`data`** của message, không đọc trực tiếp envelope `tenantId` trong các handler đã rà soát.
- **Tin cậy:** Toàn bộ query nghiệp vụ dựa trên `data.tenantId` do BFF chèn — **ranh giới tin cậy** là mạng nội bộ / chỉ BFF được phép gọi Catalog (đúng kiểu microservice thông thường; không phải lỗi nếu đã niêm yết rõ).

---

## 5. Authorizer & profile `/authorizer/me`

- JWT Keycloak có thể mang custom claim `tenant_id` (map sang object nội bộ có thêm alias `tenantId` trong `AuthorizerService.toProtoJwtPayload`).
- `TenantGuard` đã defensively đọc cả hai khóa.
- **Điểm lệch:** `mapAuthorizedMetadataToAuthProfile` (`apps/bff/src/app/modules/authorizer/mappers/auth-profile.mapper.ts`) chỉ map `tenantId: userData.jwt?.tenant_id` — **không** fallback `jwt.tenantId` và **không** lấy tenant từ `user` trong DB (schema `User` Mongo hiện không có field tenant trong `libs/schemas` — tenant thực tế đang phụ thuộc Keycloak/JWT).

Management App khi đăng nhập dùng `me?.tenantId ?? claims.tenant_id` nên **đa phần vẫn hoạt động** nhờ decode JWT phía NextAuth, nhưng response chính thức của `/authorizer/me` có thể thiếu `tenantId` nếu serialization JWT chỉ còn camelCase.

---

## 6. Management App (Next.js)

- **Session JWT (NextAuth):** callback `jwt` gọi `fetchAuthorizerMe(accessToken, claims.tenant_id)` — BFF `me` nhận Bearer token; `bff-server` có thể gửi thêm header `x-tenant-id` nếu đã biết tenant từ bước trước.
- **Gọi API Catalog:** `authApiClient` / `menu.service` gắn `x-tenant-id` từ `profile.tenantId` trong Zustand store (hydrate từ session).
- **Hạn chế UX/nghiệp vụ:** Nếu user không có `tenant_id` trong JWT và `/me` không trả tenant, request đi BFF **không** có header tenant → `TenantGuard` có thể fallback claim (nếu vẫn không có) → lỗi; ngược lại nếu chỉ có header mà không có claim (JWT không cấu hình tenant) thì nhánh mismatch không chạy — phụ thuộc cấu hình Keycloak đầy đủ.

---

## 7. Customer PWA (Vite + React)

- `apps/customer-pwa/src/lib/api-client.ts` luôn set header `'x-tenant-id': API_CONFIG.TENANT_ID`.
- `apps/customer-pwa/src/constants/api.ts`: `TENANT_ID: import.meta.env.VITE_TENANT_ID ?? 'tenant_a'`.

**Ý nghĩa:** Toàn bộ khách dùng build đó share cùng một tenant trừ khi bạn build/env khác nhau theo nhà hàng. **Không** có bước “đọc tenant từ URL QR” trong client như một resolver động (trái với một phần mô tả tài liệu về slug subdomain + table/token).

Luồng public: `SessionGuard` tạo session; `TenantGuard` khóa session với tenant từ header lần đầu — hợp lý để tránh guest đổi tenant giữa session, nhưng tenant ban đầu vẫn đến từ **client chủ động gửi header**.

---

## 8. Cách các tenant được “phân biệt” trong thực thi

| Lớp                   | Cơ chế                                                       |
| --------------------- | ------------------------------------------------------------ |
| HTTP vào BFF          | Giá trị chuỗi `x-tenant-id` hoặc subdomain đầu tiên          |
| JWT (staff)           | Claim `tenant_id` / `tenantId` — so khớp với header/context  |
| Session Redis (guest) | Lưu `tenantId` sau request đầu hợp lệ; request sau phải khớp |
| PostgreSQL Catalog    | Cột `tenant_id` + repository `findByIdAndTenant`, v.v.       |
| Redis cache menu      | Key theo `tenantId`                                          |
| QR                    | HMAC phụ thuộc `tenantId`                                    |

Không có cơ chế “slug → UUID tenant” trên BFF trong middleware hiện tại: **slug trong subdomain = đúng chuỗi tenant** mà các tầng sau dùng (nếu deploy theo kiểu `tenantSlug.host...`).

---

## 9. So khớp nhanh với `docs/technical-architecture.md`

| Tài liệu (mục 5.2 / 5.3)                                  | Thực tế code (2026-04-17)                                                                                                                                 |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeORM Global Query Filter / Subscriber auto `tenant_id` | **Chưa thấy** — isolation nhờ **service/repository explicit** và tenant do BFF truyền vào TCP `data`.                                                     |
| Guest: HMAC → map store → inject tenant                   | **Một phần:** có validate QR + `tenantId` trên BFF/Catalog, nhưng **tenant context guest chủ yếu từ `x-tenant-id`** (PWA env), session chỉ “khóa” sau đó. |
| Staff: Tenant từ JWT                                      | **Có**, + optional header; mismatch JWT vs header thì reject.                                                                                             |
| Super Admin không tenant                                  | **Có** bypass trong `TenantGuard`.                                                                                                                        |
| `?tenant_id=` debug                                       | **Không thấy** implement trong middleware (chỉ header + host).                                                                                            |

---

## 10. Vấn đề, hạn chế, điểm yếu và mùi code

### 10.1 Bảo mật & mô hình tin cậy

1. **Public menu / validate QR:** Bất kỳ client nào cũng có thể gửi `x-tenant-id` trỏ tới tenant khác để đọc menu public (nếu biết/k đoán được id). Đây là **đặc tính của thiết kế “public + tenant header”**, không phải leak DB trực tiếp nhưng là **enumeration / competitive scraping** — cần rate limit (đã có Throttler), WAF, hoặc tenant obfuscation nếu cần.
2. **Session + tenant:** Session guest gắn chặt tenant sau lần đầu — tốt cho ổn định; nhưng tenant ban đầu vẫn do client gửi (PWA env), không phải từ server-side QR resolve duy nhất.
3. **TCP Catalog:** Chỉ tin `data.tenantId` từ caller — **đúng nếu** chỉ BFF tin cậy được gọi; cần **network policy / mTLS** nếu triển khai thực tế mở rộng.

### 10.2 Nhất quán kiểu dữ liệu & môi trường

4. **Cloudinary** (`libs/providers/cloudinary`): validate UUID v4 cho `tenantId` trong khi Catalog entity dùng `varchar(64)` và dev dùng `tenant_a` — **lệch chuẩn** giữa module; có thể gây cảnh báo / từ chối upload tùy cấu hình validator.
5. **JWT / mapper:** `/authorizer/me` chỉ đọc `jwt.tenant_id`; thiếu đối xứng với `TenantGuard` (thiếu `tenantId`) — **dễ lỗi edge** khi đổi pipeline serialization.

### 10.3 Frontend

6. **Customer PWA:** `tenant_a` mặc định trong source — **hardcode dev**, dễ quên khi demo đa tenant; không phản ánh “một QR một tenant” nếu không pipeline hóa build theo tenant.
7. **Management:** Thiếu `x-tenant-id` khi chưa hydrate profile → lỗi khó hiểu cho user; phụ thuộc thứ tự hydrate (`auth-session-hydrator`).

### 10.4 Tài liệu vs code

8. **AGENTS.md** nói “TenantMiddleware resolves tenant từ header/subdomain/**JWT**” — middleware **không** đọc JWT; JWT do `TenantGuard` sau `UserGuard`. Nên cập nhật mô tả để tránh hiểu nhầm onboarding.
9. **technical-architecture 5.3** mô tả guest chi tiết hơn code hiện tại — nên đánh dấu “target” hoặc cập nhật cho khớp Step 1.x.

### 10.5 Maintainability

10. Comment tiếng Việt trong `TenantMiddleware` (“cách 1 / cách 2”) — nhỏ nhưng trộn ngôn ngữ với phần còn lại của lib (chủ yếu tiếng Anh) — có thể thống nhất.
11. **`(request as any)`** trong `buildTcpRequestContext` — mùi type; có thể typed request.

---

## 11. Kết luận

Hệ thống hiện **có đủ lớp kiểm tra hợp lý cho staff** (JWT claim vs header, session lock cho guest) và **cô lập dữ liệu tốt ở tầng Catalog** khi `tenantId` được BFF truyền đúng. Điểm nóng lớn nhất sau khi hoàn thành Phase 1 là **Customer PWA + public API dựa trên header tenant**, và **khoảng cách so với tài liệu** (global ORM filter, guest resolve từ QR server-side). Khuyến nghị ưu tiên: (1) bỏ default `tenant_a` hoặc fail-fast nếu thiếu `VITE_TENANT_ID` ở staging/prod, (2) align mapper `/me` với `TenantGuard`, (3) thống nhất định dạng tenant (UUID vs slug) giữa Keycloak, DB, Cloudinary, (4) cập nhật docs/AGENTS cho khớp luồng thực tế.

---

## 12. Tham chiếu file (tra cứu nhanh)

| Khu vực           | File                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| Middleware tenant | `libs/middlewares/src/lib/tenant.middleware.ts`                                     |
| Guards            | `libs/guards/src/lib/tenant.guard.ts`, `session.guard.ts`, `user.guard.ts`          |
| Hằng header       | `libs/constants/src/lib/request-context.constant.ts`                                |
| Metadata request  | `libs/constants/src/lib/common.constant.ts`                                         |
| TCP context       | `libs/utils/src/lib/request.util.ts`                                                |
| BFF wiring        | `apps/bff/src/app/app.module.ts`                                                    |
| Profile mapper    | `apps/bff/src/app/modules/authorizer/mappers/auth-profile.mapper.ts`                |
| Customer API      | `apps/customer-pwa/src/lib/api-client.ts`, `apps/customer-pwa/src/constants/api.ts` |
| Management API    | `apps/management-app/src/lib/api/authenticated-client.ts`                           |
| NextAuth tenant   | `apps/management-app/src/auth.ts`                                                   |
