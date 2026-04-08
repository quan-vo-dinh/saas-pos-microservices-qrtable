# Phase 4B — SaaS Onboarding & Subscription (POS)

> **Mục tiêu:** Cho phép QRTable vận hành đa tenant an toàn — tạo nhà hàng, gán gói dịch vụ, giới hạn tài nguyên theo plan, và onboarding Owner — để mỗi tenant có ranh giới dữ liệu rõ ràng và vận hành có thể tự động hóa (suspend, seed catalog, thông báo).
> **Ước lượng:** ~1 tuần
> **Trạng thái:** ⬜ TODO

## Prerequisites

- Phase 3 hoàn thành — [phase-3-payment.md](phase-3-payment.md) (thanh toán / hóa đơn đã ổn định theo kế hoạch phase 3)
- Có thể chạy **song song** với Phase 4A nếu không phụ thuộc chéo vào cùng một milestone merge (tránh xung đột schema hoặc BFF route trùng tên)

## Tham Chiếu

| Tài liệu                  | Section liên quan                     |
| ------------------------- | ------------------------------------- |
| technical-architecture.md | §6.2.3 SaaS Service, §5 Multi-tenancy |
| business-logic.md         | §1 Onboarding                         |

## Tổng Quan

Phase 4B đặt **SaaS Service** làm trung tâm cho **đời sống tenant** và **subscription**: mọi giới hạn kinh doanh (bàn, nhân sự, đơn/ngày) phải thể hiện ở một lớp có thể kiểm tra nhất quán trước khi lệnh tốn tài nguyên được chấp nhận — tránh tenant vượt gói mà không có phản hồi rõ ràng cho client. Onboarding MVP ưu tiên **admin-assisted** (một API tạo tenant end-to-end) vì giảm ma sát go-live và đảm bảo Keycloak + seed dữ liệu tối thiểu đồng bộ; self-service wizard là mở rộng sau khi luồng API và gating đã chứng minh ổn định.

Sự kiện domain (`tenant.created`, v.v.) tồn tại để **Notification** và **Catalog** phản ứng không đồng bộ — SaaS không nên gọi trực tiếp từng dịch vụ nặng trong một transaction HTTP dài. Ngược lại, **suspend** cần tác động nhanh tới lớp chặn request (Redis flag) mà không bắt buộc toàn bộ pipeline Kafka — vì mục tiêu là dừng truy cập kịp thời.

## Steps

### Step 4.3 — SaaS Service + Tenant Onboarding (4-5 ngày)

**Mục tiêu:** Có nguồn sự thật tenant + subscription trong SaaS Service, vòng đời trạng thái rõ ràng, và onboarding tạo tenant sẵn sàng vận hành (Owner, seed tối thiểu, plan mặc định).

**Phạm vi nghiệp vụ:**

- **Tenant CRUD + định danh công khai (slug / subdomain):** Sinh slug tự động từ tên nhà hàng (ví dụ chuẩn hóa Unicode → dạng URL-safe), kiểm tra trùng, và chặn **từ khóa reserved** để tránh xung đột route, subdomain hệ thống, hoặc brand nội bộ.
- **Vòng đời trạng thái tenant:** `Active` → `Suspended` → `Closed` — phản ánh khả năng vận hành (thanh toán, vi phạm, hoặc kết thúc hợp đồng) và cho phép policy “đọc-only” hoặc “không truy cập” ở các lớp sau.
- **Sự kiện Kafka:**
  - `tenant.created` (ưu tiên P1 + P3): để **Notification** chào mừng / hướng dẫn và **Catalog** seed dữ liệu khởi đầu theo tenant — tách biệt với request HTTP tạo tenant.
  - `tenant.suspended`: **không** bắt buộc Kafka; thay vào đó **cờ Redis** (ví dụ AP1) để các guard kiểm tra nhanh và chặn sớm — vì suspend thường cần hiệu lực tức thì.
- **Subscription:** CRUD **Plan** (Free, Basic, Premium), gán plan cho tenant, theo dõi **start/end**, và **cron auto-suspend** khi hết hạn hoặc vi phạm điều kiện gói — để vận hành không phụ thuộc can thiệp thủ công cho từng tenant nhỏ.
- **Feature gating:** `TenantPlanGuard` (hoặc tương đương) áp giới hạn theo plan: `max_tables`, `max_staff`, `max_orders_per_day`; khi vượt → phản hồi **402** (hoặc semantic “payment / plan required” đã thống nhất API) để client và support hiểu đây là giới hạn gói, không phải lỗi auth ngẫu nhiên.
- **Tenant Onboarding (MVP admin-assisted):** `POST /api/v1/saas/tenants/onboard` tạo tenant **và** provision **Keycloak Owner**, seed mặc định (ví dụ **1 area**, **VND**), gán **Free plan** — một lần gọi đủ để tenant có thể đăng nhập và bắt đầu cấu hình.
- **Nice-to-have:** Wizard self-service (`/register/restaurant`, form nhiều bước) — giảm tải admin nhưng chỉ sau khi API onboarding và gating đã ổn.

  ```
  [NICE-TO-HAVE] Self-service Registration Wizard:
    Route: /register/restaurant
    Step 1: Thông tin nhà hàng (tên, loại, địa chỉ)
    Step 2: Thông tin Owner (email, password)
    Step 3: Chọn gói dịch vụ
    Step 4: Xác nhận & Tạo
  ```

**Verify:** Tenant mới xuất hiện với slug hợp lệ và duy nhất; suspend chặn request qua cờ Redis; `tenant.created` kích hoạt seed/notification theo contract; vượt giới hạn plan trả 402.

### Step 4.4 — UI + Integration (3-4 ngày)

**Mục tiêu:** SUPER_ADMIN quản lý tenant và plan từ UI; tenant Owner/Manager xem subscription; kiểm thử E2E xác nhận gating thực sự chặn ở biên API/UI.

**Phạm vi nghiệp vụ:**

- **`/dashboard/subscription`:** Hiển thị plan hiện tại, kỳ hạn, trạng thái (active / sắp hết hạn / suspended nếu policy cho phép đọc) — để chủ quán hiểu vì sao bị chặn tính năng.
- **`/admin/tenants` (SUPER_ADMIN):** Danh sách tenant, trạng thái vòng đời, thao tác vận hành cấp cao (suspend/assign plan theo policy đã chốt) — tập trung quyền lực SaaS, không trộn vào app nhà hàng thường.
- **`/admin/plans` (SUPER_ADMIN):** Quản lý định nghĩa plan và giới hạn — nguồn sự thật hiển thị phải khớp backend để tránh “UI cho phép nhưng API 402”.
- **E2E feature gating:** Kịch bản ví dụ Free plan giới hạn 10 bàn — bàn thứ 11 bị từ chối với 402 (và thông điệp/UX thống nhất).

**Verify:** Role SUPER_ADMIN thấy và thao tác được admin routes; user thường không; E2E pass cho bàn 11 blocked.

## Acceptance Criteria

- [ ] Feature gating: plan Free → tối đa 10 bàn → tạo/chỉnh bàn thứ 11 bị chặn với **402**
- [ ] Tenant onboarding API: `POST /api/v1/saas/tenants/onboard` tạo tenant + Owner Keycloak + seed mặc định + gán Free plan thành công theo contract
- [ ] Slug generation: ví dụ `"Phở Hà Nội"` → `"pho-ha-noi"` (chuẩn hóa + unique trong hệ thống)
- [ ] Subscription lifecycle: gán plan → theo dõi kỳ hạn → auto-suspend qua cron khi điều kiện kích hoạt
- [ ] Admin UI: `/admin/tenants` và `/admin/plans` chỉ **SUPER_ADMIN**; `/dashboard/subscription` phục vụ chủ quán theo policy quyền đã chốt

## Outputs

- SaaS Service là nguồn sự thật cho tenant, plan, subscription lifecycle và cờ suspend nhanh (Redis) — sẵn sàng gắn thêm billing nâng cao hoặc self-service đăng ký sau
- Contract sự kiện: `tenant.created` (P1+P3) cho Notification + Catalog seed; suspend không phụ thuộc Kafka cho mục tiêu chặn tức thì
- Guard/feature gating thống nhất (`max_tables`, `max_staff`, `max_orders_per_day`) với phản hồi 402 có ý nghĩa cho client
- UI: subscription dashboard + admin tenants/plans cho vận hành SaaS
