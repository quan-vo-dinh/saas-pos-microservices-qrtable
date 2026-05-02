# Thiết kế: Reseed dev sạch với tenant chuẩn (canonical tenant)

**Ngày:** 2026-05-02

## Bối cảnh

Môi trường dev hiện đang lệch định danh tenant. Dữ liệu seed cũ và một số test
dùng `tenant_a` như placeholder tùy ý, trong khi Step 2.5 Batch 6 đã bổ sung
phân giải tenant động qua bảng SaaS `tenants` và slug tenant công khai. Kiến
trúc mục tiêu của dự án là Database-per-Service cùng cột phân tách theo tenant
(`tenant_id`) trong từng database thuộc service. Triển khai hiện tại vẫn chạy các
service PostgreSQL trên một database local duy nhất `qrtable`, nên reseed cần
cải thiện tính nhất quán ngay bây giờ mà không bắt buộc tách vật lý DB trong
cùng một đợt.

Tài liệu này định nghĩa quy trình reseed dev sạch: loại bỏ `tenant_a`, dùng UUID
tenant nội bộ thật, giữ slug công khai cho URL QR/PWA, và tổ chức file seed
theo ranh giới service để sau này migrate Database-per-Service thuận tiện.

## Mục tiêu

- Xây dựng lại dữ liệu dev từ quy trình seed lặp lại được thay vì chỉnh DB từng
  lần.
- Thay việc dùng `tenant_a` tùy ý bằng UUID tenant nội bộ chuẩn (canonical).
- Giữ route tenant công khai dễ đọc qua slug.
- Reset Keycloak, MongoDB, PostgreSQL và Redis về baseline dev nhất quán.
- Cấu trúc file seed theo ownership service dù hiện vẫn trỏ vào một PostgreSQL
  dùng chung.
- Tránh triển khai tách vật lý Database-per-Service trong đợt reseed này.

## Ngoài phạm vi

- Không tách PostgreSQL thành `qrtable_saas`, `qrtable_catalog`, `qrtable_order`
  trong đợt này.
- Không đưa công cụ migration thay thế cấu hình TypeORM `synchronize: true`
  hiện tại.
- Không bảo toàn dữ liệu dev có sẵn.
- Không lấy reset Docker volume làm luồng chính.
- Không seed dữ liệu production/staging.

## Tenant dev chuẩn (canonical)

Dùng các hằng sau nhất quán trong toàn bộ dữ liệu seed dev:

```txt
TENANT_ID   = 023772bb-391b-401c-936a-ed7034b69cec
TENANT_SLUG = pho-viet
TENANT_NAME = Nhà hàng Phở Việt
```

Ý nghĩa theo ngữ cảnh:

| Ngữ cảnh                                 | Giá trị                                |
| ---------------------------------------- | -------------------------------------- |
| SaaS `tenants.id`                        | `023772bb-391b-401c-936a-ed7034b69cec` |
| SaaS `tenants.slug`                      | `pho-viet`                             |
| Claim JWT staff `tenant_id`              | `023772bb-391b-401c-936a-ed7034b69cec` |
| Header BFF `x-tenant-id`                 | `023772bb-391b-401c-936a-ed7034b69cec` |
| Cột `tenant_id` (bảng theo tenant)       | `023772bb-391b-401c-936a-ed7034b69cec` |
| Tham số tenant trên URL QR/PWA công khai | `pho-viet`                             |

`platform` vẫn là claim tenant dev cho `SUPER_ADMIN`, vì super admin là
cross-tenant và trong mô hình guard hiện tại bỏ qua yêu cầu tenant thông
thường.

## Sở hữu dữ liệu

Dù PostgreSQL vẫn dùng một database local `qrtable`, file seed phải được tổ chức
theo ranh giới service:

```txt
tools/dev-seed/
  README.md
  constants.js
  keycloak/
  mongo/
  postgres/
    saas/
    catalog/
    order/
  verify/
```

Quy tắc ownership:

| Owner       | Dữ liệu                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| SaaS        | `tenants`                                                                         |
| Catalog     | `areas`, `categories`, `menu_items`, `tables`                                     |
| Order       | `sessions`, `orders`, `order_items`, `bills`, `service_requests`, `outbox_events` |
| User-Access | Mongo `role`, Mongo `user`                                                        |
| Keycloak    | Realm, clients, roles, protocol mappers, users                                    |
| Redis       | Dữ liệu cache/session runtime                                                     |
| Kafka       | Chỉ dọn topic dev (tùy chọn)                                                      |

Bố cục này cố ý tương thích với việc tách vật lý sau này:

```txt
postgres/saas    -> qrtable_saas
postgres/catalog -> qrtable_catalog
postgres/order   -> qrtable_order
```

Triển khai reseed nên dùng module seed thuộc từng service ngay bây giờ, rồi
truyền một kết nối PostgreSQL dùng chung. Sau này runner có thể truyền kết nối
riêng mà không phải viết lại nội dung seed.

## Luồng reset

Lệnh điều phối nên rõ ràng và có chốt an toàn:

```bash
pnpm dev:reseed -- --yes
```

Kiểm tra an toàn bắt buộc:

- Bắt buộc có `--yes`.
- Bắt buộc `NODE_ENV` không có hoặc là `development`.
- Bắt buộc host PostgreSQL là `localhost` hoặc `127.0.0.1`.
- Bắt buộc URI MongoDB trỏ localhost.
- Bắt buộc host Keycloak trỏ localhost.
- In ra các provider mục tiêu trước khi thay đổi.

Thứ tự thực thi:

1. Reset realm Keycloak `qrtable`.
2. Reset collection Mongo `role` và `user`.
3. Reset các bảng PostgreSQL theo ownership service.
4. Flush Redis (DB dev).
5. Seed tenant SaaS.
6. Seed dữ liệu nền Catalog.
7. Để các bảng runtime Order trống.
8. Seed role Mongo.
9. Đồng bộ user Mongo từ Keycloak / user bootstrap.
10. Kiểm tra trạng thái cuối.

Reset Keycloak nên xóa realm `qrtable` và tạo lại. Đây là hành vi dev sạch
nhất và chấp nhận được vì người dùng chủ động không cần giữ dữ liệu dev.

## Yêu cầu Keycloak

Bootstrap sạch phải tạo cả hai client:

- `qrtable-bff`
- `management-app`

Cả hai client phải có protocol mapper:

- thuộc tính user `tenant_id` -> claim `tenant_id`
- thuộc tính user `sub_role` -> claim `sub_role`

`tools/keycloak-bootstrap.sh` hiện tại tạo client đã cấu hình và chỉ thêm mapper
cho `management-app` nếu client đó đã tồn tại. Công việc reseed phải làm việc
tạo `management-app` rõ ràng, nếu không reset realm sạch có thể làm hỏng đăng
nhập Management App.

User bootstrap nên giữ ID và credential ổn định từ
`tools/auth-bootstrap-users.json`, nhưng user theo tenant phải dùng UUID chuẩn
làm `tenantId`. `SUPER_ADMIN` giữ `platform`.

## Yêu cầu PostgreSQL

Reset nên dọn bảng theo thứ tự phụ thuộc an toàn. TypeORM `synchronize: true`
hiện tạo schema, nên reseed không nên drop schema hay database. Nên xóa/truncate
dữ liệu và insert hàng seed xác định.

Bảng Order/runtime bắt đầu trống:

- `order_items`
- `orders`
- `bills`
- `service_requests`
- `sessions`
- `outbox_events`

Bảng Catalog nên seed đủ cho:

- Management `/dashboard/tables`
- Landing menu Customer PWA
- Demo tạo và validate QR

Hình dạng seed tối thiểu:

- 2–3 khu vực (areas)
- category đang active
- menu item available có station/status
- bảng có ID ổn định, trạng thái available, và token QR lưu trữ trông giống ngẫu
  nhiên

Mọi dòng Catalog phải dùng `TENANT_ID` chuẩn.

Seed SaaS phải insert một tenant active:

```txt
id        = 023772bb-391b-401c-936a-ed7034b69cec
slug      = pho-viet
name      = Nhà hàng Phở Việt
is_active = true
```

## Mặc định frontend

Gỡ `tenant_a` khỏi mặc định frontend và test.

- Fallback internal tenant ID của Customer PWA nên là UUID chuẩn.
- Builder URL QR công khai và resolver landing nên dùng slug `pho-viet`.
- Test assert `x-tenant-id` nên assert UUID chuẩn trừ khi cố ý test hành vi
  legacy.

Tương thích legacy Step 2.5 Batch 6 có thể giữ trong code resolver backend để
phòng thủ, nhưng seed và dữ liệu mặc định không còn phụ thuộc `tenant_a`.

## Xác minh

Script xác minh nên kiểm tra:

- PostgreSQL `tenants.id = TENANT_ID`.
- PostgreSQL `tenants.slug = TENANT_SLUG`.
- Mọi dòng Catalog theo tenant đều dùng `TENANT_ID`.
- Sau reseed, bảng runtime Order trống.
- Mongo có đúng sáu role chuẩn.
- Mongo có user cho các tài khoản staff bootstrap.
- Realm Keycloak `qrtable` tồn tại.
- Client Keycloak `qrtable-bff` và `management-app` tồn tại.
- Password grant cho owner trả token có `tenant_id = TENANT_ID`.
- Redis không còn key session/cache cũ chứa `tenant_a`.

Xác minh tùy chọn sau khi restart service:

- `GET /api/v1/admin/tenant/current` trả metadata tenant chuẩn cho staff.
- `GET /api/v1/public/tenants/pho-viet` phân giải tenant công khai.
- `/dashboard/tables` hiển thị dữ liệu bàn và URL QR có `tenant=pho-viet`.

## Ghi chú nợ kỹ thuật

- Tách vật lý Database-per-Service vẫn là kế hoạch migration riêng. Runner reseed
  nên làm bước sau dễ hơn bằng cách giữ ranh giới ownership seed rõ ràng.
- TypeORM `synchronize: true` tiện cho dev nhưng không nên là mô hình migration
  production.
- Validate tenant Cloudinary trước đây kỳ vọng UUID trong khi dữ liệu dev cũ dùng
  `tenant_a`. Chuyển `tenant_id` dev sang UUID giảm lệch này.
- Mọi tham chiếu `tenant_a` còn sót sau công việc này nên coi là nợ test/docs
  legacy trừ khi test rõ ràng kiểm tra tương thích ngược.
