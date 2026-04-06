# 📋 BÁO CÁO ĐÁNH GIÁ & TƯ VẤN CHIẾN LƯỢC: IMPLEMENTATION PLAN

> **Ngày đánh giá:** 26/03/2026
> **Ngày cập nhật lần cuối:** 04/04/2026
> **Phiên bản tài liệu:** 1.1
> **Trạng thái hiện tại:** Đã hoàn thành đến Step 1.25 (Auth Frontend + Keycloakify)
> **Cập nhật:** Đã integrate 3 findings quan trọng nhất (3.1, 3.2, 3.3) vào implementation_plan.md. Fix sai sót Session TTL và Redis status.
> **Tài liệu tham chiếu:**
>
> - `docs/implementation_plan.md`
> - `docs/technical-architecture.md`
> - `docs/business-logic.md`
> - `docs/step-0-6b-authentication-authorization-chi-tiet.md`

---

## MỤC LỤC

1. [Tổng Quan Đánh Giá](#1-tổng-quan-đánh-giá)
2. [Điểm Mạnh Của Kế Hoạch Hiện Tại](#2-điểm-mạnh-của-kế-hoạch-hiện-tại)
3. [Các Vấn Đề & Thiếu Sót Phát Hiện](#3-các-vấn-đề--thiếu-sót-phát-hiện)
4. [Cross-Reference Gaps: Business Logic vs Implementation Plan](#4-cross-reference-gaps-business-logic-vs-implementation-plan)
5. [Cross-Reference Gaps: Technical Architecture vs Implementation Plan](#5-cross-reference-gaps-technical-architecture-vs-implementation-plan)
6. [Cross-Reference Gaps: Auth System vs Implementation Plan](#6-cross-reference-gaps-auth-system-vs-implementation-plan)
7. [Đánh Giá Từng Phase Chi Tiết](#7-đánh-giá-từng-phase-chi-tiết)
8. [Phát Hiện Rủi Ro & Bottleneck](#8-phát-hiện-rủi-ro--bottleneck)
9. [Đề Xuất Bổ Sung & Cải Thiện](#9-đề-xuất-bổ-sung--cải-thiện)
10. [Bảng Tổng Hợp Action Items](#10-bảng-tổng-hợp-action-items)
11. [Lộ Trình Đề Xuất Cập Nhật](#11-lộ-trình-đề-xuất-cập-nhật)

---

## 1. Tổng Quan Đánh Giá

### 1.1 Kết Quả Đánh Giá Tổng Thể

| Tiêu chí                         | Điểm (1-5) | Nhận xét                                                              |
| -------------------------------- | :--------: | --------------------------------------------------------------------- |
| **Độ phủ nghiệp vụ**             |    4/5     | Phủ tốt các luồng chính; thiếu một số edge cases và luồng bổ trợ      |
| **Tính nhất quán với kiến trúc** |    4/5     | Phần lớn khớp; có vài chỗ lệch về service decomposition và data flows |
| **Tính khả thi (Luận văn)**      |   3.5/5    | Khối lượng lớn cho 1 người; cần ưu tiên hóa rõ ràng hơn               |
| **Độ chi tiết kỹ thuật**         |   4.5/5    | Rất chi tiết ở Phase 0-2; giảm dần ở Phase 4-7                        |
| **Tính đồng bộ auth**            |   4.5/5    | Auth system tài liệu rất tốt; implementation plan khớp gần hoàn toàn  |

### 1.2 Trạng Thái Thực Tế Codebase (Tính Đến 26/03/2026)

| Thành phần                                        | Kế hoạch | Thực tế | Ghi chú                                                              |
| ------------------------------------------------- | :------: | :-----: | -------------------------------------------------------------------- |
| Template services (invoice, product, user-access) |    ✅    |   ✅    | Giữ nguyên, có README                                                |
| Catalog service                                   |    ✅    |   ✅    | Cấu trúc Pragmatic Layered đúng, chưa implement đầy đủ logic         |
| SaaS service                                      |    ✅    |   ✅    | Tồn tại, cấu trúc chuẩn, logic chưa implement                        |
| BFF service                                       |    ✅    |   ✅    | Hoạt động, guard chain đầy đủ                                        |
| Authorizer service                                |    ✅    |   ✅    | gRPC hoàn chỉnh                                                      |
| Customer PWA                                      |    ✅    |   ✅    | React + Vite, Tailwind, Shadcn configured                            |
| Management App                                    |    ✅    |   ✅    | Next.js App Router, auth middleware ready                            |
| Keycloak Theme                                    |    ✅    |   ✅    | Keycloakify project tồn tại, Storybook setup                         |
| Shared libs (types, constants)                    |    ✅    |   ✅    | Cấu trúc đúng                                                        |
| Frontend libs (ui, hooks, utils)                  |    ✅    |   ⚠️    | Directory tồn tại, content cần populate thêm                         |
| Guards (User, Session, Tenant, Permission)        |    ✅    |   ✅    | Đầy đủ, hoạt động                                                    |
| Redis trong Docker                                |    ✅    |   ✅    | Đã có trong docker-compose.provider.yaml (port 6379) + Redis Insight |
| Kafka                                             |    ❌    |   ❌    | Chưa setup (đúng tiến độ — Phase 2)                                  |
| Order/Kitchen/Payment/Notification services       |    ❌    |   ❌    | Chưa tạo (đúng tiến độ)                                              |

---

## 2. Điểm Mạnh Của Kế Hoạch Hiện Tại

### 2.1 Phương pháp luận UI-First rất phù hợp

Dòng chảy `📚 Học → 🎨 Mock UI → 📝 Shared Types → ⚙️ Backend → 🔗 Tích hợp → ✅ Verify` giúp:

- Phát hiện sớm yêu cầu dữ liệu từ giao diện trước khi code backend
- Tạo Shared Types chính xác hơn vì đã có mock UI làm tham chiếu
- Demo được tiến độ sớm cho giáo viên hướng dẫn

### 2.2 Chiến lược Template-First thông minh

Giữ nguyên services khóa học làm "living templates" giúp:

- Tham khảo patterns đã hoạt động
- Không mất thời gian setup boilerplate từ đầu
- Có sẵn bản so sánh khi troubleshoot

### 2.3 Auth System được thiết kế kỹ lưỡng

Tài liệu `step-0-6b` rất chi tiết về guard chain, request lifecycle, error taxonomy — đây là nền tảng vững chắc cho toàn bộ hệ thống.

### 2.4 Pragmatic Layered Architecture đúng đắn cho scope

Chọn N-Tier thay vì Clean Architecture thuần túy là quyết định hợp lý cho monorepo 8 services do 1 người phát triển.

---

## 3. Các Vấn Đề & Thiếu Sót Phát Hiện

### 3.1 🔴 CRITICAL — Thiếu Step "Staff Management" hoàn toàn

> **✅ ĐÃ INTEGRATE vào implementation_plan.md (04/2026)** — Xem Phase 4C, Step 4.6 (Staff Management Backend) + Step 4.7 (Staff Management UI). Quyết định: mở rộng user-access service thay vì tạo service mới.

**Vấn đề:** Business logic (Section 9) định nghĩa rõ rằng Owner/Manager cần có khả năng **mời/xóa/quản lý nhân viên, phân quyền**. Tuy nhiên, trong `implementation_plan.md`:

- **Không có step nào dành cho Staff Management UI** (`/dashboard/staff`)
- **Không có backend endpoint** cho CRUD staff
- **Không có Keycloak Admin API integration** cho việc tạo user Keycloak từ Management App

**Tác động:** Không có cách nào tạo test users cho các role WAITER, CHEF, BARISTA từ trong app. Hiện tại dựa vào seed script, nhưng demo production cần UI quản lý staff.

**Đề xuất:** Bổ sung **Step 1.7 hoặc Step 4.3b** — Staff Management:

```
1. /dashboard/staff — Danh sách nhân viên (tên, email, role, trạng thái)
2. Invite Staff Form: email, role (WAITER/CHEF/BARISTA) → Gọi Keycloak Admin API tạo user
3. Assign/Remove role
4. BFF endpoints: POST/GET/PUT/DELETE /api/v1/admin/staff (secured: OWNER/MANAGER)
5. user-access service: CRUD user profile + role assignment
```

### 3.2 🔴 CRITICAL — Thiếu Permission Enum cho các domain mới

> **✅ ĐÃ INTEGRATE vào implementation_plan.md (04/2026)** — Xem "PRE-PHASE 2 — PERMISSION & SEED EXTENSION", Step 2.0. PERMISSION enum cần mở rộng với 5 domain mới: ORDER*\*, KITCHEN*_, PAYMENT\__, TABLE*\*, SERVICE_REQUEST*\*.

**Vấn đề:** File `step-0-6b` định nghĩa PERMISSION enum hiện tại chỉ có:

- `saas.*`, `catalog.*`, `invoice.*`, `user.*`, `role.*`, `product.*`

**Thiếu hoàn toàn permissions cho:**

- `order.*` (create, confirm, cancel, get_list, get_by_id)
- `kitchen.*` (get_queue, update_ticket, recall)
- `payment.*` (create_checkout, confirm_cash, refund, get_history)
- `table.*` (create, update, delete, transfer, update_status)
- `session.*` (create, close)
- `service_request.*` (create, acknowledge, resolve)

**Tác động:** Khi build Phase 2-3, sẽ cần bổ sung PERMISSION enum + cập nhật role.json seed data + cập nhật Keycloak provisioning.

**Đề xuất:** Bổ sung vào implementation plan **Step 2.0 — Permission Extension** trước khi bắt đầu code Phase 2:

```
1. Mở rộng PERMISSION enum trong libs/constants/
2. Cập nhật role.json với permissions mới cho mỗi role
3. Re-seed MongoDB roles
4. Document Permission Matrix mới cho Order, Kitchen, Payment domains
```

### 3.3 🟡 IMPORTANT — Thiếu luồng "Tenant Onboarding" trong plan

> **✅ ĐÃ INTEGRATE vào implementation_plan.md (04/2026)** — Xem Phase 4B, Step 4.3 (SaaS + Tenant Onboarding). MVP: Admin-assisted onboard API + auto-provision. Self-service wizard là NICE-TO-HAVE.

**Vấn đề:** Business logic (Section 1) mô tả chi tiết quy trình:

1. Đăng ký định danh → 2. Khởi tạo Tenant → 3. Chọn gói dịch vụ → 4. Cấu hình vận hành

Nhưng `implementation_plan.md` Phase 4 chỉ đề cập SaaS CRUD và Feature Gating, **KHÔNG có step cụ thể** cho:

- **UI Tenant Registration Wizard** (multi-step form cho Owner đăng ký nhà hàng)
- **Backend Tenant Provisioning Flow** (tạo Keycloak realm/user, seed default data, assign subscription)
- **Slug/Subdomain generation & validation logic**
- **SuperAdmin UI approve/reject tenant** request

**Đề xuất:** Bổ sung vào Phase 4 hoặc tách thành Step riêng:

```
Step 4.2b — Tenant Onboarding Flow:
  1. UI: /register/restaurant — Multi-step wizard (Thông tin nhà hàng → Chọn gói → Xác nhận)
  2. Backend: POST /api/v1/saas/tenants — Tenant creation + slug generation
  3. Backend: Auto-provision → Tạo Keycloak user + assign OWNER role + seed default data
  4. UI: /admin/tenants/:id — SuperAdmin approve/suspend/activate
  5. E2E Test: Đăng ký nhà hàng mới → Đăng nhập → Dashboard hoạt động
```

### 3.4 ✅ ĐÃ GIẢI QUYẾT — Session Management TTL đã đúng 2h

> **Cập nhật (04/2026):** Kiểm tra codebase thực tế cho thấy Session TTL **ĐÃ ĐÚNG 2 giờ**, không phải 24h như phiên bản review ban đầu ghi nhận. File `libs/constants/src/lib/request-context.constant.ts` chứa `TTL_MS: 2 * 60 * 60 * 1000` (2h) và `IDLE_TIMEOUT_MS: 30 * 60 * 1000` (30 phút). **Không cần action.**

~~**Vấn đề:** Có sự **mâu thuẫn** giữa các tài liệu:~~

- ~~`technical-architecture.md` (Nguyên tắc 10): "Session lifetime = 2 giờ (max), idle timeout = 30 phút"~~
- ~~`step-0-6b` (SessionGuard code): `SESSION_POLICY.TTL_MS = 24 * 60 * 60 * 1000` (24 giờ)~~
- ~~`business-logic.md`: Không nêu rõ session lifetime~~

**Thực tế codebase (đã verify 04/2026):**

```typescript
// libs/constants/src/lib/request-context.constant.ts
export const SESSION_POLICY = {
  ID_PREFIX: 'sid_',
  CACHE_PREFIX: 'session',
  TTL_MS: 2 * 60 * 60 * 1000, // ✅ 2 giờ — ĐÃ ĐÚNG
  IDLE_TIMEOUT_MS: 30 * 60 * 1000, // ✅ 30 phút — ĐÃ ĐÚNG
  COOKIE_KEY: 'x-session-id',
};
```

**Kết luận:** Tất cả tài liệu và code đã nhất quán. Issue này **KHÔNG TỒN TẠI**.

### 3.5 🟡 IMPORTANT — Thiếu chiến lược Database Migration

**Vấn đề:** Implementation plan nói dùng TypeORM entities nhưng **KHÔNG đề cập**:

- Chiến lược migration (TypeORM migrations vs synchronize)
- Seed data strategy cho development vs demo vs production
- Schema versioning khi nhiều service dùng cùng PostgreSQL instance

**Đề xuất:** Bổ sung Step 0.2b — Database Migration Strategy:

```
1. Sử dụng TypeORM migrations (KHÔNG dùng synchronize:true ngoài dev)
2. Mỗi service quản lý migration riêng trong migrations/ folder
3. Seed data: nx task `seed:dev` → tạo tenant demo, users, menu data
4. Convention: service_name_{timestamp}_{description}.ts
```

### 3.6 🟡 IMPORTANT — Thiếu "Service Request" UI/Backend chi tiết

**Vấn đề:** Business logic (Section 4.A.5) và technical architecture đều đề cập Service Request (gọi nhân viên, yêu cầu thanh toán, hỗ trợ chung). Implementation plan Phase 2 Step 2.2 có nhắc đến "Service Request buttons" nhưng:

- Không có step cụ thể cho backend Service Request entity/service
- Không có Kafka topic `service.requested` trong Phase 2 backend step
- Không có WebSocket room mapping cho service requests

**Đề xuất:** Gộp vào Phase 2 Step 2.4 hoặc bổ sung step riêng:

```
Step 2.4 bổ sung:
  → Entity: service_requests (id, tenant_id, table_id, session_id, type, status, created_at)
  → Types: CALL_STAFF | REQUEST_BILL | GENERAL_HELP
  → Kafka: service.requested → BFF WS → tenant:{tid}:staff room
  → Staff POS: Service Request notification panel
```

### 3.7 🟢 MINOR — Real-time Menu Sync chưa được plan rõ

**Vấn đề:** Business logic yêu cầu "Đồng bộ Real-time: Mọi thay đổi về giá hoặc trạng thái Out of Stock phải được cập nhật tức thì trên giao diện khách hàng". Tuy nhiên:

- Phase 1 Step 1.5 chỉ đề cập Redis cache invalidation, **KHÔNG đề cập WebSocket broadcast** khi menu thay đổi
- WebSocket Gateway chỉ được plan ở Phase 2 cho ordering

**Đề xuất:** Menu real-time sync có thể defer đến Phase 2 khi WebSocket Gateway đã sẵn sàng. Tuy nhiên cần:

- Phase 1: Catalog Service emit Kafka event `menu.updated` khi CRUD thành công
- Phase 2: BFF WebSocket Gateway nhận `menu.updated` → broadcast tới Customer PWA rooms

### 3.8 🟢 MINOR — Thiếu Cloudinary Integration Step cụ thể

**Vấn đề:** Business logic yêu cầu upload hình ảnh cho menu items. Technical architecture liệt kê Cloudinary. Nhưng implementation plan Phase 1 chỉ nói "upload ảnh menu items" mà không có step cụ thể:

- Không có Cloudinary config step
- Không có upload middleware/service
- Không có image optimization pipeline

**Đề xuất:** Bổ sung vào Phase 1 Step 1.5:

```
Step 1.5 bổ sung — Cloudinary Integration:
  → Cấu hình CLOUDINARY_URL trong .env
  → libs/common/ → cloudinary.provider.ts (upload, delete, transform)
  → Catalog Service: uploadMenuItemImage → trả về imageUrl
  → BFF endpoint: POST /api/v1/admin/upload/image (multer + Cloudinary)
  → Frontend: React Hook Form + image preview + upload progress
```

---

## 4. Cross-Reference Gaps: Business Logic vs Implementation Plan

### 4.1 Bảng So Sánh Nghiệp Vụ

| #   | Nghiệp vụ (business-logic.md)                    | Trong Plan?  | Phase | Gap                                            |
| --- | ------------------------------------------------ | :----------: | :---: | ---------------------------------------------- |
| 1   | Tenant Onboarding (Registration Wizard)          |  ⚠️ Sơ sài   |   4   | Thiếu UI wizard, provisioning flow             |
| 2   | Subscription Lifecycle (chọn gói, renew, expire) |      ✅      |   4   | OK nhưng thiếu UI chi tiết                     |
| 3   | Tenant Status (Active/Suspended/Closed)          |      ✅      |   4   | Cần thêm auto-suspend cron job                 |
| 4   | Category Time-based Visibility (6h-10h sáng)     |      ✅      |   1   | Đã có trong Catalog Service spec               |
| 5   | Menu Item Soft Delete Constraints                |      ✅      |   1   | Đã mention                                     |
| 6   | Real-time Menu Sync (giá/stock)                  |  ⚠️ Chưa rõ  |  1→2  | Thiếu WebSocket plan cho menu broadcast        |
| 7   | QR Token HMAC Security                           |      ✅      |   1   | Đã có chi tiết                                 |
| 8   | QR Rate Limiting (10 scans/5min)                 |  ⚠️ Chưa rõ  |   1   | Không thấy trong plan                          |
| 9   | Table State Machine (4 trạng thái)               |      ✅      |   1   | Đầy đủ                                         |
| 10  | Table Transfer Logic                             |      ✅      |   2   | Đã có trong Order Service specification        |
| 11  | Shared Cart (cùng bàn cùng giỏ)                  |      ✅      |   2   | Redis Hash có version field                    |
| 12  | Ordering Lock khi Billing                        |      ✅      |   2   | Đã define                                      |
| 13  | Stock Pessimistic Locking                        |      ✅      |   2   | SELECT ... FOR UPDATE                          |
| 14  | Order cộng dồn (multiple orders → 1 bill)        |      ✅      |   2   | Bill aggregation                               |
| 15  | Staff xác nhận đơn (chống spam)                  |      ✅      |   2   | Pending → Processing                           |
| 16  | Customer tự hủy đơn (Pending only)               |      ✅      |   2   | Có trong state machine                         |
| 17  | Manager hủy đơn Processing                       |      ✅      |   2   | Cần audit log                                  |
| 18  | KDS Ticket Routing (food→kitchen, drink→bar)     |      ✅      |   2   | Đầy đủ                                         |
| 19  | KDS FIFO + Batching + SLA                        |      ✅      |   2   | Redis Sorted Set                               |
| 20  | KDS Recall (undo ready)                          |      ✅      |   2   | Có mention                                     |
| 21  | Cash Payment Flow                                |      ✅      |   3   | Staff confirm flow                             |
| 22  | **Bank Transfer / VietQR**                       | ❌ **THIẾU** |   3   | Business logic nói VietQR, plan chỉ nói Stripe |
| 23  | VND Rounding (Math.ceil)                         |      ✅      |   3   | Đúng convention                                |
| 24  | Bill Immutability                                |      ✅      |   3   | Lock sau Paid                                  |
| 25  | Refund Flow (partial/full)                       |      ✅      |   3   | Có trong plan                                  |
| 26  | Audit Log bắt buộc khi Cancel                    |  ⚠️ Chưa rõ  |   3   | Cần explicit step                              |
| 27  | **Billing Constraint (chặn khi món chưa xong)**  | ⚠️ Implicit  |   3   | Cần thêm validation logic chi tiết             |
| 28  | Service Request (gọi nhân viên)                  |  ⚠️ Sơ sài   |   2   | Thiếu backend entity/logic chi tiết            |
| 29  | **Staff Management (mời/xóa nhân viên)**         | ❌ **THIẾU** |   —   | Không có phase nào cover                       |
| 30  | **Reconciliation/Đối soát**                      | ❌ **THIẾU** |   —   | Business logic có, plan không                  |
| 31  | Offline Resilience (PWA)                         |      ✅      |   7   | Trong tech arch nhưng chưa có step cụ thể      |
| 32  | **KOT Printing (in ticket bếp)**                 | ❌ **THIẾU** |   —   | Business logic mention, plan không có          |

### 4.2 Phân Tích 5 Gaps Quan Trọng Nhất

#### Gap #1: Bank Transfer / VietQR Payment

- **Nghiệp vụ:** Business logic Section 6 mô tả chi tiết VietQR động với auto-verify qua webhook ngân hàng
- **Plan:** Phase 3 chỉ đề cập Stripe + Cash, **không nhắc đến Bank Transfer/VietQR**
- **Ảnh hưởng:** Thiếu phương thức thanh toán phổ biến nhất tại Việt Nam
- **Khuyến nghị:** Bổ sung VietQR (có thể dùng Stripe PromptPay hoặc tích hợp VNPay/MoMo). Đơn giản nhất: **sinh QR code tĩnh** với số tiền + nội dung, staff xác nhận thủ công. Auto-verify qua webhook ngân hàng có thể defer.

#### Gap #2: Staff Management

- Đã phân tích ở Section 3.1

#### Gap #3: Reconciliation/Đối soát cuối ngày

- **Nghiệp vụ:** Business logic Section 6.A.5 mô tả đối soát tài chính cuối ngày/tháng
- **Plan:** Không có step nào cho báo cáo đối soát
- **Khuyến nghị:** Bổ sung vào Phase 3 hoặc Phase 4: Dashboard → /dashboard/reports với báo cáo doanh thu theo ngày/phương thức thanh toán

#### Gap #4: Billing Constraint

- **Nghiệp vụ:** "Chỉ cho phép chuyển sang Billing khi tất cả món đã Ready"
- **Plan:** Không thấy validation rule này được ghi rõ trong backend implementation
- **Khuyến nghị:** Document rõ trong Phase 3 — validation trước khi cho phép yêu cầu thanh toán

#### Gap #5: KOT Printing

- **Nghiệp vụ:** "Tự động in Kitchen Order Ticket (KOT) nếu có máy in"
- **Plan:** Không đề cập
- **Khuyến nghị:** Đây là nice-to-have cho luận văn. Nếu muốn demo: sử dụng ESC/POS protocol qua WebSocket hoặc browser print API. Defer nếu không đủ thời gian.

---

## 5. Cross-Reference Gaps: Technical Architecture vs Implementation Plan

### 5.1 Service Decomposition Mismatch

| Kiến trúc (technical-architecture.md)         | Plan (implementation_plan.md)                                     | Mismatch                                                                                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8 backend services trong architecture diagram | Plan chỉ tạo catalog, saas, order, kitchen, payment, notification | ❌ **user-access** được giữ nguyên là template — nhưng architecture nói cần "Staff Management" service riêng. Cần quyết định: mở rộng user-access hay tạo service mới? |
| Notification Service (Kafka consumer)         | Plan Phase 4 chỉ nói "Kafka consumer → Nodemailer"                | ⚠️ Thiếu chi tiết: Email templates, audit log MongoDB, retry logic                                                                                                     |
| Kitchen Service "không cần PostgreSQL riêng"  | Plan Phase 2 nói "khởi tạo apps/kitchen/" nhưng không clarify DB  | ✅ Architecture nói dùng Redis only — plan cần ghi rõ điều này                                                                                                         |

### 5.2 Kafka Topics trong Architecture nhưng thiếu trong Plan

| Kafka Topic            | Trong Architecture? | Trong Plan? | Gap                                                         |
| ---------------------- | :-----------------: | :---------: | ----------------------------------------------------------- |
| `tenant.created`       |         ✅          | ⚠️ Implied  | Cần step cụ thể: SaaS Service → emit → Notification consume |
| `tenant.suspended`     |         ✅          |     ❌      | Plan Phase 4 không nói rõ suspend flow                      |
| `menu.updated`         |         ✅          | ⚠️ Implied  | Cần gắn vào Phase 1 Step 1.5                                |
| `table.status_changed` |         ✅          | ⚠️ Implied  | Cần gắn vào Phase 1/2                                       |
| `order.created`        |         ✅          |     ✅      | OK                                                          |
| `order.confirmed`      |         ✅          |     ✅      | OK                                                          |
| `kitchen.item_ready`   |         ✅          |     ✅      | OK                                                          |
| `kitchen.sla_warning`  |         ✅          | ⚠️ Implicit | Cần step cụ thể SLA monitoring                              |
| `payment.completed`    |         ✅          |     ✅      | OK                                                          |
| `payment.refunded`     |         ✅          |     ✅      | OK                                                          |
| `service.requested`    |         ✅          |  ⚠️ Sơ sài  | Cần step chi tiết hơn                                       |

### 5.3 WebSocket Rooms trong Architecture nhưng thiếu Plan

Architecture định nghĩa 7 WebSocket rooms nhưng implementation plan chỉ đề cập:

- Phase 2: "Socket.io setup + Redis Adapter" (tổng quát)
- Không có step-by-step cho từng room

**Đề xuất:** Thêm vào Phase 2 Step 2.4:

```
BFF WebSocket Gateway Implementation Steps:
  1. Setup Socket.io + Redis Adapter cho scaling
  2. Connection authentication: JWT handshake (staff) / Session cookie (customer)
  3. Room assignment on connect:
     → WAITER → tenant:{tid}:staff
     → CHEF → tenant:{tid}:kds:kitchen
     → BARISTA → tenant:{tid}:kds:bar
     → OWNER/MANAGER → tenant:{tid}:management
     → CUSTOMER → session:{sid}:customer
  4. Kafka consumer bridge: mỗi topic → map tới room(s)
  5. Reconnection handling + room re-join
```

### 5.4 Infrastructure Gaps

> **Cập nhật (04/2026):** Redis đã confirmed có trong docker-compose. Bổ sung DB-per-service migration step (Step 0.8 trong implementation_plan.md).

| Component      | Architecture | Docker Compose hiện tại | Gap                              | Trạng thái (04/2026) |
| -------------- | :----------: | :---------------------: | -------------------------------- | :------------------: |
| PostgreSQL     |      ✅      |           ✅            | Cần init script tạo multiple DBs |   📋 Plan Step 0.8   |
| MongoDB        |      ✅      |           ✅            | OK                               |          ✅          |
| Redis          |      ✅      |           ✅            | OK (port 6379 + Redis Insight)   |          ✅          |
| Kafka          |      ✅      |           ❌            | Cần thêm Phase 2                 |          ⏳          |
| Keycloak       |      ✅      |           ✅            | Có + bootstrap script            |          ✅          |
| Grafana + Loki |      ✅      |           ❌            | Phase 6 (đúng tiến độ)           |          ⏳          |
| Prometheus     |      ✅      |           ❌            | Phase 6                          |          ⏳          |
| Tempo          |      ✅      |           ❌            | Phase 6                          |          ⏳          |

---

## 6. Cross-Reference Gaps: Auth System vs Implementation Plan

### 6.1 Auth đã hoàn thiện tốt

Nhìn chung, hệ thống auth (step-0-6b) đồng bộ rất tốt với implementation plan. Các thành phần đã match:

- Guard chain order (UserGuard → SessionGuard → TenantGuard → PermissionGuard → ThrottlerGuard) ✅
- Dual authentication (JWT + Session) ✅
- Auto-provisioning on first login ✅
- Role mapping validation ✅
- Error taxonomy (401 invalid_token, 401 user_not_provisioned, 403 permission_denied) ✅

### 6.2 Vấn Đề Cần Giải Quyết

#### 6.2.1 Permission Enum không đủ cho Phase 2+

Đã phân tích ở Section 3.2. Hiện tại PERMISSION enum thiếu:

- `ORDER_*`, `KITCHEN_*`, `PAYMENT_*`, `TABLE_TRANSFER`, `SERVICE_REQUEST_*`

#### 6.2.2 Super Admin chưa có UI trong plan

Auth system define SUPER_ADMIN role rõ ràng, nhưng implementation plan Phase 4 chỉ nói sơ qua `/admin/tenants` và `/admin/plans`. Cần bổ sung:

- `/admin/analytics` — Platform-level metrics
- `/admin/health` — System health monitoring link tới Grafana
- `/admin/support` — Impersonate tenant (debug mode)

#### 6.2.3 Customer Session + Table binding chưa rõ trong plan

Auth system nói "Session binding tới table", nhưng implementation plan Phase 1 chưa rõ cách:

- QR scan → create session → bind session tới table_id
- Second scan cùng bàn → join existing session
- Session close → unlink table

**Đề xuất:** Bổ sung vào Step 1.5 hoặc 1.6 — Session-Table Binding Logic.

---

## 7. Đánh Giá Từng Phase Chi Tiết

### Phase 0 — ✅ HOÀN THÀNH (Đánh giá: 9/10)

**Tốt:**

- Tổ chức codebase rõ ràng
- Pragmatic Layered Architecture phù hợp
- ERD tổng thể phục vụ báo cáo
- Auth infrastructure vững chắc

**Thiếu nhỏ:**

- Database migration strategy chưa document
- Seed data script cho development chưa chuẩn hóa

---

### Phase 1 — 🔄 ĐANG THỰC HIỆN (Đánh giá: 8/10)

**Tốt:**

- Step ordering logic rõ ràng
- Shared Types extraction đúng thời điểm
- BFF REST Controller + Guard chain match với auth docs

**Concerns:**

- Step 1.3 (Customer PWA Mock UI) thiếu **bottom sheet animation spec** — cần clarify UX
- Step 1.5 thiếu Cloudinary integration (Section 3.8)
- Step 1.5 thiếu Kafka event emit `menu.updated` (Section 3.7)
- **Step 1.6 thiếu loading states, error states, empty states** cho UI integration
- Acceptance criteria thiếu: "QR rate limiting hoạt động" (10 scans/5 min)

**Đề xuất bổ sung cho remaining Phase 1 steps:**

```markdown
Step 1.5 — Bổ sung:
→ Cloudinary provider trong libs/common/
→ Emit Kafka event menu.updated khi CRUD thành công (chuẩn bị cho Phase 2 WS)
→ Session-Table binding logic khi QR scan

Step 1.6 — Bổ sung:
→ Loading skeletons cho tất cả data-fetch pages
→ Empty states: "Chưa có danh mục nào", "Chưa có bàn nào"
→ Error boundaries + retry mechanism
→ Optimistic UI updates cho CRUD operations
→ Toast notifications cho actions (tạo/sửa/xóa thành công)
```

---

### Phase 2 — ⏳ SẮP TRIỂN KHAI (Đánh giá: 7.5/10)

**Tốt:**

- Phân chia Mock UI → Types → Backend → Integration rõ ràng
- Kafka consumer/producer pattern defined
- WebSocket Gateway + Redis Adapter

**Concerns:**

1. **Ước lượng thời gian quá lạc quan:**
   - Step 2.4 (Backend: Order + Kitchen + Kafka): "7-10 ngày" cho 1 người phát triển là **rất thách thức**
   - Nội dung gồm: 2 services mới + Kafka setup + Redis session/cart + Order state machine + Stock locking + Bill aggregation + Table transfer + KDS routing + SLA monitoring
   - **Khuyến nghị:** Chia thành 2 sub-phases:
     - Phase 2A (Order Service + Kafka basics): 7-10 ngày
     - Phase 2B (Kitchen Service + WebSocket Gateway + SLA): 5-7 ngày

2. **Thiếu Service Request backend** (Section 3.6)

3. **Shared Cart concurrency** chưa rõ conflict resolution:
   - Plan nói "Redis Hash + version field" nhưng thiếu:
     - Conflict resolution khi 2 devices cùng update cart
     - WebSocket broadcast cart changes tới các device khác
     - **Đề xuất:** Thêm vào Step 2.4: Cart version check, optimistic locking, broadcast changes

4. **KDS priority flagging** chưa rõ UI interaction:
   - Ai flag priority? Owner/Manager? Cách nào flag? Tap and hold? Button?
   - **Đề xuất:** Thêm vào Step 2.2: Priority flag UI spec

---

### Phase 3 — ⏳ (Đánh giá: 7/10)

**Tốt:**

- Stripe integration pattern rõ
- VND rounding logic correct
- Refund flow covered

**Concerns:**

1. **Thiếu Bank Transfer / VietQR** (Section 4.2 Gap #1)

2. **Billing constraint validation** không rõ:
   - Business logic: "Chỉ cho phép Billing khi tất cả món đã Ready"
   - Plan không mention validation này ở đâu

3. **Reconciliation/Đối soát** hoàn toàn thiếu:
   - Cần thêm: `/dashboard/reports` — Daily summary, payment method breakdown
   - Backend: Payment Service aggregation queries

4. **Receipt/Hóa đơn** chưa rõ format:
   - Business logic nói "In hóa đơn giấy"
   - Plan không có thermal printing spec
   - **Đề xuất MVP:** Browser print dialog với styled receipt template (HTML → Print CSS)

**Đề xuất bổ sung Phase 3:**

```markdown
Step 3.2 — Bổ sung:
→ /dashboard/reports — Daily revenue summary, payment method breakdown
→ Receipt template (HTML → Browser Print)
→ Bank Transfer option: Manual confirm by staff (MVP)

Step 3.4 — Bổ sung:
→ Billing validation: check all order items status === 'Ready' || 'Served'
→ Payment Service: getRevenueReport(tenantId, dateRange, groupBy)
→ Audit log cho mọi payment action (create, confirm, refund, cancel)
```

---

### Phase 4 — ⏳ (Đánh giá: 6.5/10)

**Concerns nghiêm trọng:**

1. **Quá tải nội dung**: Phase 4 gộp 4 mảng lớn vào "1-2 tuần":
   - Saga Pattern (complex distributed transactions)
   - SaaS Service (Tenant CRUD, Subscription, Feature Gating)
   - Notification Service (Kafka consumer, email, audit)
   - Hardening (idempotency, rate limits, delete constraints)

2. **Thiếu Tenant Onboarding** (Section 3.3)

3. **Thiếu Staff Management** (Section 3.1)

4. **Feature Gating middleware** chỉ được mention 1 dòng — cần chi tiết hơn:
   - Middleware kiểm tra tenant plan → max_tables, max_staff
   - Response 402/403 khi exceed limit
   - UI upgrade prompt

**Đề xuất chia lại Phase 4:**

```markdown
Phase 4A — Saga + Hardening (~1 tuần):
→ Order Confirm Saga + compensation
→ Payment Complete Saga
→ Idempotency enforcement
→ Delete constraints finalization

Phase 4B — SaaS + Tenant Onboarding (~1 tuần):
→ SaaS Service: Tenant CRUD, Subscription lifecycle
→ Tenant Onboarding UI (wizard)
→ Feature Gating middleware
→ SuperAdmin UI: /admin/tenants, /admin/plans

Phase 4C — Notification + Staff Management (~1 tuần):
→ Notification Service (Kafka → email)
→ Staff Management UI + Backend
→ Permission Enum extension
→ Role.json update + re-seed
```

---

### Phase 5 — Testing (Đánh giá: 7/10)

**Tốt:**

- Test pyramid (Unit > Integration > E2E) đúng
- Testcontainers cho integration tests

**Concerns:**

- "Unit test coverage > 60%" là mục tiêu **thấp** cho Order + Payment — 2 domain quan trọng nhất
- **Thiếu Frontend testing** hoàn toàn (không thấy step nào cho React component tests hoặc E2E frontend)
- **Thiếu Auth/Guard testing** — guard chain là critical path, cần unit tests

**Đề xuất bổ sung:**

```markdown
Step 5.1 bổ sung:
→ Unit Tests cho Guard chain (UserGuard, TenantGuard, SessionGuard, PermissionGuard)
→ Frontend: Component tests cho critical flows (React Testing Library)
→ Frontend E2E: Playwright/Cypress cho QR scan → menu → order → payment flow
→ Target: 70% coverage cho Order, Payment; 80% cho Guards
```

---

### Phase 6 — Observability (Đánh giá: 8/10)

**Nhận xét:** Phase này well-defined, theo đúng bài giảng. Không có gap lớn.

**Bổ sung nhỏ:**

- Thêm Business metrics dashboard: "Revenue per hour", "Average KDS wait time", "Orders per table per session"
- Thêm Alerting cho business: "KDS ticket > 20 min chưa xử lý"

---

### Phase 7 — Docker Deploy + Demo (Đánh giá: 7.5/10)

**Tốt:**

- Demo script idea tốt
- Seed data strategy

**Concerns:**

- **Thiếu SSL/TLS** cho demo — nếu demo trên network, Keycloak cần HTTPS
- **Thiếu environment variables management** — .env.example file
- **Thiếu backup plan chi tiết** — chỉ nói "seed data script chạy nhanh nếu cần reset"
- **Thiếu demo walkthrough cho từng actor**: Script nên cover cả 4 actors (SuperAdmin, Owner, Staff, Customer)

**Đề xuất:**

```markdown
Step 7.1 bổ sung:
→ .env.example với tất cả required variables
→ traefik hoặc nginx reverse proxy cho SSL termination (nếu demo trên mạng)
→ docker-compose.prod.yaml override (resource limits, log rotation)

Step 7.2 bổ sung — Demo Script Chi Tiết:

1. SuperAdmin: Tạo tenant "Phở Hà Nội" + assign Owner
2. Owner: Login → Setup menu (3 categories, 8 items) → Setup bàn (2 areas, 6 tables)
3. Staff (Waiter): Login → Đợi đơn trên POS
4. Customer: Quét QR bàn 01 → Xem menu → Đặt 3 món → Theo dõi
5. Staff: Confirm đơn → KDS nhận ticket → Chef đánh dấu xong
6. Customer: Thấy "Ready" → Nhấn thanh toán
7. Staff: Cash confirm → Bàn chuyển Cleaning → Đánh dấu sạch
8. Owner: Xem dashboard báo cáo
9. Bonus: Grafana trace cho toàn bộ request path
```

---

## 8. Phát Hiện Rủi Ro & Bottleneck

### 8.1 Rủi Ro Cao (High Risk)

| #   | Rủi ro                                     |    Xác suất     |      Ảnh hưởng      | Mitigation                                                                |
| --- | ------------------------------------------ | :-------------: | :-----------------: | ------------------------------------------------------------------------- |
| R1  | **Khối lượng Phase 2 quá lớn cho 1 người** |       Cao       | Trễ toàn bộ tiến độ | Chia Phase 2 thành 2A/2B; ưu tiên Order flow, defer KDS advanced features |
| R2  | **Kafka learning curve**                   |   Trung bình    |   Chặn Phase 2-4    | Bắt đầu học song song khi hoàn thành Phase 1 remaining                    |
| R3  | **WebSocket debugging khó**                |   Trung bình    | Tốn thời gian debug | Dùng Socket.io Admin UI + Postman WS tester                               |
| R4  | **Shared Cart race condition**             |   Trung bình    | UX lỗi cho customer | Implement version-based optimistic locking + test kỹ                      |
| R5  | **Demo day issues**                        | Thấp-Trung bình |      Fail demo      | Seed script + practice nhiều lần + backup screenshots                     |

### 8.2 Bottleneck Kỹ Thuật

| #   | Bottleneck                          | Phase | Giải pháp                                                                              |
| --- | ----------------------------------- | :---: | -------------------------------------------------------------------------------------- |
| B1  | Saga pattern complexity             |   4   | Giữ đơn giản: chỉ cần 2 sagas (Order Confirm + Payment Complete). KHÔNG over-engineer. |
| B2  | Real-time sync nhiều component      |   2   | Implement room-by-room, test từng event type riêng biệt                                |
| B3  | Multi-tenant testing                |   5   | Seed 2 tenants cho mọi integration test, verify isolation                              |
| B4  | Docker compose quá nhiều containers |   7   | Dùng profiles: `docker compose --profile monitoring up`                                |

### 8.3 Technical Debt dự kiến

| #   | Debt                                      | Ở đâu                        |             Priority fix             | Trạng thái (04/2026) |
| --- | ----------------------------------------- | ---------------------------- | :----------------------------------: | :------------------: |
| D1  | TypeORM `synchronize: true` trong dev     | Catalog, SaaS                | Chuyển sang migrations trước Phase 3 |     ⏳ Chưa fix      |
| D2  | Hardcoded mock data trong frontend        | Customer PWA, Management App |  Replace khi integration Phase 1.6   |     ⏳ Chưa fix      |
| D3  | Permission enum thiếu                     | libs/constants               |          Fix trước Phase 2           |   📋 Plan Step 2.0   |
| D4  | ~~Session TTL inconsistency (24h vs 2h)~~ | ~~libs/constants, guards~~   |             ~~Fix ngay~~             |    ✅ Đã đúng 2h     |

---

## 9. Đề Xuất Bổ Sung & Cải Thiện

### 9.1 Bổ Sung Step Mới (Ưu Tiên Cao)

#### Step 2.0 — Permission & Seed Extension (0.5-1 ngày)

> Chạy trước khi bắt đầu Phase 2 code

```
1. Mở rộng PERMISSION enum:
   → ORDER_CREATE, ORDER_CONFIRM, ORDER_CANCEL, ORDER_GET_LIST, ORDER_GET_BY_ID
   → KITCHEN_GET_QUEUE, KITCHEN_UPDATE_TICKET, KITCHEN_RECALL
   → PAYMENT_CREATE, PAYMENT_CONFIRM_CASH, PAYMENT_REFUND, PAYMENT_GET_HISTORY
   → TABLE_CREATE, TABLE_UPDATE, TABLE_DELETE, TABLE_TRANSFER, TABLE_UPDATE_STATUS
   → SERVICE_REQUEST_CREATE, SERVICE_REQUEST_ACKNOWLEDGE, SERVICE_REQUEST_RESOLVE

2. Cập nhật role.json:
   → OWNER: tất cả permissions
   → MANAGER: tất cả trừ SaaS
   → WAITER: ORDER_CONFIRM, ORDER_GET_*, PAYMENT_CONFIRM_CASH, TABLE_TRANSFER, TABLE_UPDATE_STATUS, SERVICE_REQUEST_*
   → CHEF: KITCHEN_*, CATALOG_GET_*
   → BARISTA: KITCHEN_*, CATALOG_GET_*
   → CUSTOMER: hardcoded tại controller level (không cần permission)

3. Re-seed MongoDB → verify auth flow vẫn hoạt động

4. Document Permission Matrix mới
```

#### Step 4.2b — Tenant Onboarding Flow (3-4 ngày)

```
Đã mô tả ở Section 3.3
```

#### Step 4.3b — Staff Management (3-4 ngày)

```
Đã mô tả ở Section 3.1
```

### 9.2 Cải Thiện Steps Hiện Có

#### Phase 1 — Improvements:

- Step 1.5: + Cloudinary integration + Kafka emit `menu.updated`
- Step 1.6: + Loading/Empty/Error states + Toast notifications

#### Phase 2 — Improvements:

- Chia Phase 2 thành 2A (Order) và 2B (Kitchen + WebSocket)
- Step 2.4: + Service Request entity + Cart broadcast + Priority UI spec
- Step 2.5: + WebSocket room implementation chi tiết

#### Phase 3 — Improvements:

- Step 3.2: + Revenue report UI + Receipt template + Bank Transfer option
- Step 3.4: + Billing validation + Audit log + Reconciliation query

#### Phase 4 — Improvements:

- Chia thành 4A/4B/4C (Section 7 Pain 4)
- Thêm Tenant Onboarding + Staff Management

#### Phase 5 — Improvements:

- Thêm Guard unit tests + Frontend E2E tests
- Target coverage 70-80% cho critical paths

#### Phase 7 — Improvements:

- Demo script chi tiết 4 actors
- .env.example + SSL setup

### 9.3 Quick Wins (Trạng thái cập nhật 04/2026)

| #   | Quick Win                                    | Effort  |   Impact   | Trạng thái       |
| --- | -------------------------------------------- | :-----: | :--------: | :--------------- |
| 1   | ~~Fix Session TTL inconsistency (24h → 2h)~~ | 10 phút |    Cao     | ✅ Đã đúng 2h    |
| 2   | Tạo .env.example file                        | 30 phút | Trung bình | ⏳ Chưa làm      |
| 3   | Document Permission Matrix mới (markdown)    |  1 giờ  |    Cao     | 📋 Plan Step 2.0 |
| 4   | Thêm README cho mỗi frontend app             | 30 phút |    Thấp    | ⏳ Chưa làm      |
| 5   | Setup TypeORM migration config               |  1 giờ  | Trung bình | ⏳ Chưa làm      |

---

## 10. Bảng Tổng Hợp Action Items

### 10.1 Phân Loại Theo Mức Độ Ưu Tiên

#### 🔴 P0 — CRITICAL (Phải fix trước khi tiếp tục)

| #   | Action                                            | Phase bị ảnh hưởng | Effort  | Trạng thái (04/2026)  |
| --- | ------------------------------------------------- | :----------------: | :-----: | :-------------------: |
| A1  | ~~Fix Session TTL inconsistency (24h → 2h)~~      |        All         | 10 phút |    ✅ ĐÃ ĐÚNG (2h)    |
| A2  | Mở rộng PERMISSION enum cho Order/Kitchen/Payment |      2, 3, 4       | 2-3 giờ | 📋 Đã plan (Step 2.0) |
| A3  | Cập nhật role.json seed data                      |      2, 3, 4       | 1-2 giờ | 📋 Đã plan (Step 2.0) |
| A4  | ~~Verify Redis có trong docker-compose~~          |        1, 2        | 30 phút |       ✅ ĐÃ CÓ        |

#### 🟡 P1 — IMPORTANT (Nên bổ sung vào plan)

| #   | Action                                   | Phase |    Effort     |     Trạng thái (04/2026)     |
| --- | ---------------------------------------- | :---: | :-----------: | :--------------------------: |
| A5  | Thêm Staff Management step               |   4   |   3-4 ngày    |    📋 Đã plan (Phase 4C)     |
| A6  | Thêm Tenant Onboarding flow              |   4   |   3-4 ngày    |    📋 Đã plan (Phase 4B)     |
| A7  | Thêm Bank Transfer/VietQR payment option |   3   |   2-3 ngày    | ⏳ NICE-TO-HAVE cho luận văn |
| A8  | Thêm Revenue Report / Reconciliation     |   3   |   2-3 ngày    |         ⏳ Chưa plan         |
| A9  | Chia Phase 2 thành 2A/2B                 |   2   |   Plan only   |       ✅ Đã thực hiện        |
| A10 | Chia Phase 4 thành 4A/4B/4C              |   4   |   Plan only   |       ✅ Đã thực hiện        |
| A11 | Cloudinary integration step              |   1   |   1-2 ngày    |    ⏳ Chưa plan chi tiết     |
| A12 | WebSocket rooms implementation guide     |   2   | 1 ngày (plan) |    📋 Đã plan (Phase 2B)     |
| A13 | Service Request backend entity/logic     |   2   |    1 ngày     |    📋 Đã plan (Phase 2A)     |
| A14 | Database migration strategy              |   0   | 1 ngày setup  |         ⏳ Chưa plan         |
| A15 | Frontend testing (Component + E2E)       |   5   |   3-4 ngày    |         ⏳ Chưa plan         |

#### 🟢 P2 — NICE-TO-HAVE (Nếu còn thời gian)

| #   | Action                                       | Phase |  Effort  |
| --- | -------------------------------------------- | :---: | :------: |
| A16 | KOT Printing (browser print)                 |   2   | 1-2 ngày |
| A17 | QR Rate Limiting (10 scans/5min)             |   1   |  1 ngày  |
| A18 | SuperAdmin advanced UI (impersonate, health) |   4   | 2-3 ngày |
| A19 | Demo script chi tiết 4 actors                |   7   |  1 ngày  |
| A20 | SSL/TLS cho demo                             |   7   | 0.5 ngày |

---

## 11. Lộ Trình Đề Xuất Cập Nhật

### 11.1 Phase Remap (Đã áp dụng vào implementation_plan.md — 04/2026)

```
  PHASE           NỘI DUNG CẬP NHẬT                          ƯỚC LƯỢNG
  ─────           ──────────────────                          ─────────
  Phase 1 (còn)   Catalog Backend + Cloudinary + Integration   ~1.5-2 tuần
  Pre-Phase 2     Permission & Seed Extension                  ~0.5-1 ngày
  Phase 2A         Order Service + Kafka + Session Logic        ~1.5-2 tuần
  Phase 2B         Kitchen/KDS + WebSocket Gateway + SLA        ~1-1.5 tuần
  Phase 3          Payment (Stripe+Cash) + Reports (optional)   ~1.5-2 tuần
  Phase 4A         Saga + Hardening                             ~1 tuần
  Phase 4B         SaaS + Tenant Onboarding + Feature Gating    ~1 tuần
  Phase 4C         Notification + Staff Management              ~1 tuần
  Phase 5          Testing (Backend + Frontend + E2E)           ~1-1.5 tuần
  Phase 6          Observability Stack                          ~1 tuần
  Phase 7          Docker Deploy + Demo Prep                     ~1 tuần
```

**Tổng ước lượng:** ~11-14 tuần (so với plan gốc ~10-15 tuần — tương đương nhưng phân bổ hợp lý hơn)

### 11.2 Prioritization cho Luận Văn

Nếu thời gian bị hạn chế, **MVP cần** cho demo luận văn:

```
MUST-HAVE (Demo Core Flow):
  ✅ Phase 1: Menu + Table + QR (Customer thấy menu)
  ✅ Phase 2A: Order flow (Đặt món → Staff confirm)
  ✅ Phase 2B: KDS (Bếp nhận đơn → Ready)
  ✅ Phase 3: Payment (Cash + Stripe — bỏ VietQR nếu thiếu thời gian)
  ✅ Phase 7: Docker demo

SHOULD-HAVE (Nâng điểm):
  ⭐ Phase 4A: Saga (giúp nói về distributed transactions trong luận văn)
  ⭐ Phase 6: Observability (Grafana trace — ấn tượng demo)
  ⭐ Phase 5: Testing (chứng minh software engineering quality)

NICE-TO-HAVE (Bonus):
  🎁 Phase 4B/4C: SaaS + Staff Management + Notification
  🎁 VietQR payment
  🎁 Offline resilience
  🎁 KOT Printing
```

### 11.3 Critical Path

```
Phase 1 remaining → Phase 2A → Phase 2B → Phase 3 → Phase 7 (Demo)
     ↑                                                    ↑
     └── Kafka learning bắt đầu ở đây ──────────────────┘
                                                          ↑
     Phase 4A/6 có thể chạy song song ───────────────────┘
```

---

## KẾT LUẬN

Implementation plan hiện tại có nền tảng vững chắc và phương pháp luận đúng đắn (UI-First, Template-First). Các vấn đề phát hiện chủ yếu thuộc nhóm:

1. **Thiếu sót logic nghiệp vụ** (Staff Management, Tenant Onboarding, VietQR, Reconciliation) — cần bổ sung steps
2. **Inconsistency giữa tài liệu** (Session TTL, Permission enum) — fix nhanh được
3. **Phase quá tải** (Phase 2, Phase 4) — cần chia nhỏ hơn
4. **Thiếu chi tiết ở Phase sau** (4-7) — tự nhiên vì chưa đến, nhưng nên plan trước

**Hành động tiếp theo ngay lập tức:**

1. ~~Fix Session TTL (10 phút)~~ → ✅ Đã đúng 2h, không cần action
2. Mở rộng PERMISSION enum + re-seed (2-3 giờ) → 📋 Đã plan vào Step 2.0 (Pre-Phase 2)
3. ~~Cập nhật implementation plan với các steps bổ sung (1 ngày)~~ → ✅ Đã hoàn thành (04/2026): Phase 2A/2B, Phase 4A/4B/4C, Staff Management, Tenant Onboarding
4. Tiếp tục Phase 1 remaining (Step 1.3 → 1.6)

---

_Tài liệu này được tạo dựa trên phân tích cross-reference 4 file tài liệu chính cùng khảo sát thực tế codebase. Nên được review lại sau mỗi Phase hoàn thành để cập nhật._
