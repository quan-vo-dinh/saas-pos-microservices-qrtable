# Kế hoạch Phase 5D — UI gallery và screenshot scaffold cho khóa luận QRTable

> Ngày lập: 2026-06-05.
> Phạm vi: triển khai **Phase 5D** — phân tầng minh họa client (Chương 5 đại diện + Phụ lục A catalog đầy đủ), mapping filename/label LaTeX, placeholder PNG, khung `figure`, hướng dẫn capture thủ công.
> Quan hệ: bổ sung sau thảo luận ngày 2026-06-05; thay thế vai trò “plan thực thi” của `thesis-phase5d-screenshot-scaffold.md` (file cũ giữ làm mapping ngắn + checklist nhanh).
> Không thay thế: Hình 5.1–5.5 (sequence diagram) đã verify ở Phase 5B.

## 0. Protocol bắt buộc khi thực thi plan

- Viết tài liệu và caption bằng **tiếng Việt học thuật**; tuân **§3.2** trong `thesis-workflow-plan.md` (dùng `client` khi ý là app phía người dùng, không dùng `giao diện` trong prose kiến trúc).
- Trước khi chỉnh LaTeX, chạy CodeGraph: `codegraph status .` và truy vấn `ROUTES`, `management-app`, `customer-pwa`.
- **Agent Phase 5D không** mở Browser, không chụp UI, không yêu cầu stack demo đang chạy để hoàn tất scaffold.
- Không invent route, claim production-ready, benchmark, hoặc nguồn citation giả.
- Placeholder trắng **không** được ghi `captured`/`verified` trong backlog; caption/đoạn dẫn phải ghi rõ “khung bản nháp” cho đến khi thay ảnh thật.
- Compensation của Saga **không** chứng minh bằng screenshot; dùng Phụ lục D (test/log/DB snapshot) theo `docs/testing/saga-validation-strategy.md`.
- Cuối session thực thi scaffold: build LaTeX từ `thesis-report/`, cập nhật `thesis-artifact-backlog.md` và `thesis-workflow-plan.md`.

Skills gợi ý: `Writing Plans`, `Grill with Docs` (audit overclaim), `Zoom Out` (giữ Chương 5 là luồng, không user manual).

## 1. Mục tiêu

1. Đưa **toàn bộ màn hình có ý nghĩa** của hai client (`customer-pwa`, `management-app`) vào khóa luận theo mô hình **2 tầng** đã chốt:
   - **Chương 5:** 12–14 screenshot đại diện, gắn luồng vận hành cốt lõi (sau Hình 5.1–5.5 sequence).
   - **Phụ lục A:** catalog đầy đủ (~45–55 màn hình/overlay), có chỉ mục con và giải thích ngắn từng màn hình.
2. Tạo **contract ổn định** giữa filename PNG, LaTeX label, vị trí chèn, route code và actor — để người viết chỉ việc chụp ảnh thật thay file, không sửa ref.
3. Scaffold build được: placeholder + khung `figure` + `.lof` không gãy.

## 2. Chiến lược phân tầng nội dung

| Tầng       | Vị trí                              | Số lượng gợi ý                               | Vai trò                                                           |
| ---------- | ----------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| Tầng 1     | Chương 5 — sau mỗi `\section` luồng | 12–14 hình (**Hình 5.6–5.19** nếu đủ 14 ảnh) | Minh họa claim “đã hiện thực”; tham chiếu Hình 5.1–5.5 / Bảng 5.1 |
| Tầng 2     | Phụ lục A                           | ~45–55 hình (**Hình A.1–A.xx**)              | Bằng chứng UI đầy đủ khi demo domain không còn                    |
| Không dùng | Chương 3, 4                         | 0 gallery                                    | Chương 3 = yêu cầu; Chương 4 = kiến trúc                          |
| Tùy chọn   | Chương 6                            | 0–1 hình test/health                         | Chỉ khi có artifact thật, không placeholder                       |

### 2.1. Quy ước số hiệu (quan trọng)

| Loại artifact        | Số hiệu LaTeX hiện tại | Ghi chú                                                          |
| -------------------- | ---------------------- | ---------------------------------------------------------------- |
| Sequence diagram     | **Hình 5.1–5.5**       | Giữ nguyên — Phase 5B                                            |
| Screenshot Chương 5  | **Hình 5.6 trở đi**    | Không dùng “Ảnh 5.1” trong backlog cũ cho screenshot             |
| Screenshot Phụ lục A | **Hình A.1, A.2, …**   | Đánh số liên tục trong phụ lục                                   |
| ID nội bộ plan       | `SC-C5-xx`, `SC-A-xx`  | Chỉ dùng trong mapping/backlog, tránh nhầm với Hình 5.1 sequence |

### 2.2. Bố cục ảnh Chương 5 (2026-06-05, cập nhật layout)

| Client             | Bố cục                                                                                                                                        | Macro                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Management App** | **Một ảnh / một `figure`**, full `\textwidth`, `height=0.62\textheight`                                                                       | `\screenshotfiguremgmt`                                |
| **Customer PWA**   | Nhóm 2 ảnh: 2 cột/hàng. Nhóm 3 ảnh: **3 cột/một hàng**, khe `0.5pt`, ô `(\linewidth-4pt)/3`, cao `0.78\textheight`, `\clearpage` trước figure | `\screenshotpwafiguretwo`, `\screenshotpwafigurethree` |

Không gom 3–4 cột trên một hàng. PWA nhóm 2–3 màn vẫn **một caption chung** cho cả `figure`; Management mỗi màn **caption riêng**.

**Vị trí:** gắn trong từng `\section` luồng Chương 5. Phụ lục A UI gallery đã bỏ khỏi báo cáo.

### 2.4. Ghi chú tạm khi chụp ảnh (2026-06-05)

Trước mỗi cụm `figure` lưới trong Chương 5 và Phụ lục A có môi trường `screenshotcapturenotes` (bảng: **ô lưới → tên file → màn hình/route cần chụp**). Chỉ in khi `\screenshotplaceholdertrue`. Sau khi thay ảnh: `\screenshotplaceholderfalse` → ghi chú và tiền tố `[Khung bản nháp]` tự ẩn.

### 2.3. Mẫu đoạn văn quanh mỗi screenshot (Chương 5)

Mỗi hình Chương 5 kèm **3–5 câu** (không bullet dài):

1. Mục đích màn hình trong luồng F&B.
2. Actor (khách / nhân viên / owner / super admin).
3. Một điểm kỹ thuật (session, RBAC, entitlement, WebSocket hint) nếu có.
4. Tham chiếu `Hình~\ref{...}` sequence hoặc `Bảng~\ref{tab:chapter5-implemented-evidence}`.
5. Giới hạn (môi trường demo, không thay test/architecture evidence).

Phụ lục A: **2–4 câu** + route; không lặp lại toàn bộ lập luận Chương 5.

## 3. Nguồn sự thật (routes / pages)

### 3.1. Customer PWA

Nguồn: `apps/customer-pwa/src/constants/routes.ts`, `App.tsx`.

| Route                      | Page / overlay     | Ghi chú capture                  |
| -------------------------- | ------------------ | -------------------------------- |
| `/` → `/landing`           | Landing + QR query | Cần URL có `tenant`/`table` demo |
| `/menu`                    | Menu               | Có category tabs                 |
| (overlay)                  | Chi tiết món       | `menu-item-detail-drawer`        |
| (overlay)                  | Giỏ hàng           | `cart-drawer`                    |
| (overlay)                  | Yêu cầu phục vụ    | `service-request-drawer`         |
| `/order-tracking`          | Theo dõi đơn       | Trạng thái tổng hợp              |
| `/order-tracking/:orderId` | Chi tiết đơn       | Stepper / timeline               |
| `/request-payment`         | Yêu cầu thanh toán | VietQR nếu bật                   |

### 3.2. Management App

Nguồn: `apps/management-app/src/constants/routes.ts`, `app/**/page.tsx`.

| Nhóm        | Route                                                                                                                                                                                                                           | Mục đích                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Auth        | `/login`, `/auth/callback`                                                                                                                                                                                                      | Keycloak / OAuth                                     |
| Owner       | `/dashboard`, `/dashboard/menu`, `/dashboard/tables`, `/dashboard/orders`, `/dashboard/staff`, `/dashboard/subscription`, `/dashboard/billing/:id`, `/dashboard/payment-settings`, `/dashboard/payment-settings/sepay-callback` | Quản trị tenant                                      |
| POS         | `/pos`, `/pos/tables`, `/pos/service-requests`, `/pos/bills`                                                                                                                                                                    | Vận hành nhân viên (`/pos/payment` redirect → bills) |
| KDS         | `/kds/kitchen`, `/kds/bar`                                                                                                                                                                                                      | Bếp / bar                                            |
| Super Admin | `/admin`, `/admin/tenants`, `/admin/tenants/:id`, `/admin/plans`, `/admin/billing`, `/admin/analytics`                                                                                                                          | SaaS nền tảng                                        |

## 4. Mapping Chương 5 — screenshot đại diện (SC-C5)

Chèn sau sequence diagram của từng section; dùng `[htbp]` hoặc `[H]` tùy page budget (ưu tiên không trôi section nếu giảng viên chấp nhận khoảng trắng).

| ID        | Hình LaTeX | Filename                                    | Label                                               | Section Chương 5                         | Sequence ref                    | Actor         |
| --------- | ---------- | ------------------------------------------- | --------------------------------------------------- | ---------------------------------------- | ------------------------------- | ------------- |
| SC-C5-01  | Hình 5.6   | `chapter5-01-customer-qr-session.png`       | `fig:chapter5-screenshot-customer-qr-session`       | Khách quét QR…                           | Hình 5.1                        | Khách         |
| SC-C5-02  | Hình 5.7   | `chapter5-02-customer-menu-browsing.png`    | `fig:chapter5-screenshot-customer-menu`             | (cùng section)                           | Hình 5.1                        | Khách         |
| SC-C5-03  | Hình 5.8   | `chapter5-03-customer-cart-submit.png`      | `fig:chapter5-screenshot-customer-cart-submit`      | (cùng section)                           | Hình 5.1                        | Khách         |
| SC-C5-04a | Hình 5.8   | `chapter5-04-customer-order-tracking.png`   | `fig:chapter5-screenshot-customer-order-tracking`   | Ghi nhận thanh toán… (nhánh khách)       | Hình 5.7                        | Khách         |
| SC-C5-04b | Hình 5.8   | `chapter5-04-customer-request-payment.png`  | `fig:chapter5-screenshot-customer-request-payment`  | (cùng cụm hình, cột 2)                   | Hình 5.7                        | Khách         |
| SC-C5-05  | Hình 5.10  | `chapter5-05-staff-pos-table-map.png`       | `fig:chapter5-screenshot-staff-table-map`           | Xác nhận đơn…                            | Hình 5.2                        | Nhân viên     |
| SC-C5-06  | Hình 5.11  | `chapter5-06-staff-order-confirm.png`       | `fig:chapter5-screenshot-staff-order-confirm`       | (cùng section)                           | Hình 5.2; Order Confirm Saga UI | Nhân viên     |
| SC-C5-07  | Hình 5.12  | `chapter5-07-kds-queue.png`                 | `fig:chapter5-screenshot-kds-queue`                 | Điều phối bếp/KDS…                       | Hình 5.3; `order.confirmed`     | Bếp/bar       |
| SC-C5-08  | Hình 5.13  | `chapter5-08-kds-ticket-status.png`         | `fig:chapter5-screenshot-kds-ticket-status`         | (cùng section)                           | Hình 5.3                        | Bếp/bar       |
| SC-C5-09  | Hình 5.14  | `chapter5-09-owner-menu-management.png`     | `fig:chapter5-screenshot-owner-menu-management`     | (owner — có thể gộp catalog)             | Catalog                         | Owner         |
| SC-C5-10  | Hình 5.15  | `chapter5-10-owner-table-qr-management.png` | `fig:chapter5-screenshot-owner-table-qr`            | (cùng)                                   | Catalog/QR                      | Owner         |
| SC-C5-11a | Hình 5.10  | `chapter5-11-owner-payment-settings.png`    | `fig:chapter5-screenshot-owner-payment-settings`    | Khởi tạo đơn vị thuê bao… (owner, cột 2) | Hình 5.9; SaaS Mini-Saga        | Owner         |
| SC-C5-11b | Hình 5.10  | `chapter5-11-owner-subscription.png`        | `fig:chapter5-screenshot-owner-subscription`        | (cùng cụm, cột 3)                        | Hình 5.9                        | Owner         |
| SC-C5-12  | Hình 5.17  | `chapter5-12-admin-tenant-onboarding.png`   | `fig:chapter5-screenshot-admin-tenant-onboarding`   | Khởi tạo đơn vị thuê bao…                | Hình 5.5; SaaS Mini-Saga        | Super Admin   |
| SC-C5-13  | Hình 5.18  | `chapter5-13-owner-dashboard-reporting.png` | `fig:chapter5-screenshot-owner-dashboard-reporting` | Bảng điều khiển và báo cáo…              | Phase 4D; entitlement           | Owner/Manager |
| SC-C5-14  | Hình 5.19  | `chapter5-14-admin-platform-analytics.png`  | `fig:chapter5-screenshot-admin-platform-analytics`  | (cùng section)                           | Phase 4D; `report.read_any`     | Super Admin   |

**Caption mẫu (ảnh thật):**

```text
Hình 5.11. Màn hình xác nhận đơn trên client POS của nhân viên; thao tác này kích hoạt luồng bảo toàn tồn kho mô tả ở Hình 5.2.
```

**Caption mẫu (placeholder):**

```text
[Khung bản nháp] Hình 5.11. … Cần thay bằng screenshot demo thật trước khi nộp.
```

## 5. Mapping Phụ lục A — catalog rút gọn (SC-A, 2026-06-05)

Phụ lục A **không** lặp luồng đã có ở Chương~5 (PWA, POS core, KDS, owner catalog/báo cáo, SaaS onboarding). Chỉ còn **8 ảnh** trong `appendices/a-ui-gallery.tex`:

| Filename                                 | Route / màn hình                      |
| ---------------------------------------- | ------------------------------------- |
| `appendix-a-15-pos-service-requests.png` | `/pos/service-requests`               |
| `appendix-a-16-pos-bills.png`            | `/pos/bills`                          |
| `appendix-a-35-owner-staff.png`          | `/dashboard/staff`                    |
| `appendix-a-39-owner-sepay-callback.png` | `.../payment-settings/sepay-callback` |
| `appendix-a-46-admin-tenants.png`        | `/admin/tenants`                      |
| `appendix-a-47-admin-tenant-detail.png`  | `/admin/tenants/:id`                  |
| `appendix-a-49-admin-billing.png`        | `/admin/billing`                      |
| `appendix-a-53-auth-login.png`           | `/login` (Keycloak)                   |

Các SC-A-01–14, 17–28, 31–34, 36–38, 40–42, 45, 48, 50–52, 54–55 đã **loại** (trùng Chương~5 hoặc không cần).

<details><summary>Catalog đầy đủ cũ (tham khảo archive)</summary>

Cấu trúc LaTeX trước khi rút gọn:

```text
\chapter{Minh họa client hệ thống QRTable}
\section{Customer PWA}
\section{Client POS (nhân viên)}
\section{Client KDS (bếp và bar)}
\section{Client quản trị chủ quán}
\section{Client quản trị nền tảng}
\section{Auth và phân quyền}
```

</details>

### 5.1. Customer PWA (SC-A-01 – SC-A-12)

| ID      | Hình | Filename                                      | Route / màn hình      | Mô tả ngắn (caption)                          |
| ------- | ---- | --------------------------------------------- | --------------------- | --------------------------------------------- |
| SC-A-01 | A.1  | `appendix-a-01-pwa-landing.png`               | `/landing`            | Khách vào phiên từ QR/bàn                     |
| SC-A-02 | A.2  | `appendix-a-02-pwa-menu.png`                  | `/menu`               | Danh sách món theo danh mục                   |
| SC-A-03 | A.3  | `appendix-a-03-pwa-menu-item-detail.png`      | overlay               | Chi tiết món, số lượng, ghi chú               |
| SC-A-04 | A.4  | `appendix-a-04-pwa-cart-drawer.png`           | overlay               | Giỏ chung, phiên bản giỏ                      |
| SC-A-05 | A.5  | `appendix-a-05-pwa-service-request.png`       | overlay               | Gọi nhân viên / yêu cầu phục vụ               |
| SC-A-06 | A.6  | `appendix-a-06-pwa-order-tracking.png`        | `/order-tracking`     | Tổng quan trạng thái đơn                      |
| SC-A-07 | A.7  | `appendix-a-07-pwa-order-tracking-detail.png` | `/order-tracking/:id` | Timeline/stepper theo đơn                     |
| SC-A-08 | A.8  | `appendix-a-08-pwa-request-payment.png`       | `/request-payment`    | Yêu cầu thanh toán / VietQR                   |
| SC-A-09 | A.9  | `appendix-a-09-pwa-realtime-status.png`       | component             | Trạng thái kết nối realtime (nếu hiển thị)    |
| SC-A-10 | A.10 | `appendix-a-10-pwa-tenant-banner.png`         | banner                | Cảnh báo trạng thái đơn vị thuê bao (nếu có)  |
| SC-A-11 | A.11 | `appendix-a-11-pwa-session-presence.png`      | component             | Avatars / phiên nhiều thiết bị (nếu có)       |
| SC-A-12 | A.12 | `appendix-a-12-pwa-empty-error-state.png`     | —                     | Empty/error có kiểm soát (chỉ nếu có UI thật) |

### 5.2. Client POS (SC-A-13 – SC-A-22)

| ID      | Hình | Filename                                    | Route                     |
| ------- | ---- | ------------------------------------------- | ------------------------- |
| SC-A-13 | A.13 | `appendix-a-13-pos-home.png`                | `/pos`                    |
| SC-A-14 | A.14 | `appendix-a-14-pos-tables.png`              | `/pos/tables`             |
| SC-A-15 | A.15 | `appendix-a-15-pos-service-requests.png`    | `/pos/service-requests`   |
| SC-A-16 | A.16 | `appendix-a-16-pos-bills.png`               | `/pos/bills`              |
| SC-A-17 | A.17 | `appendix-a-17-pos-order-detail.png`        | (modal/page trong POS)    |
| SC-A-18 | A.18 | `appendix-a-18-pos-confirm-dialog.png`      | confirm action            |
| SC-A-19 | A.19 | `appendix-a-19-pos-payment-settlement.png`  | bill paid / settlement UI |
| SC-A-20 | A.20 | `appendix-a-20-pos-table-session-state.png` | table occupied / session  |

### 5.3. Client KDS (SC-A-23 – SC-A-30)

| ID      | Hình | Filename                              | Route                   |
| ------- | ---- | ------------------------------------- | ----------------------- |
| SC-A-23 | A.23 | `appendix-a-23-kds-kitchen-queue.png` | `/kds/kitchen`          |
| SC-A-24 | A.24 | `appendix-a-24-kds-bar-queue.png`     | `/kds/bar`              |
| SC-A-25 | A.25 | `appendix-a-25-kds-ticket-detail.png` | ticket expand           |
| SC-A-26 | A.26 | `appendix-a-26-kds-status-update.png` | start/ready/bump        |
| SC-A-27 | A.27 | `appendix-a-27-kds-empty-queue.png`   | empty state             |
| SC-A-28 | A.28 | `appendix-a-28-kds-sla-hint.png`      | SLA warning UI (nếu có) |

### 5.4. Owner dashboard (SC-A-31 – SC-A-44)

| ID      | Hình | Filename                                     | Route                                |
| ------- | ---- | -------------------------------------------- | ------------------------------------ |
| SC-A-31 | A.31 | `appendix-a-31-owner-dashboard-home.png`     | `/dashboard`                         |
| SC-A-32 | A.32 | `appendix-a-32-owner-menu.png`               | `/dashboard/menu`                    |
| SC-A-33 | A.33 | `appendix-a-33-owner-tables.png`             | `/dashboard/tables`                  |
| SC-A-34 | A.34 | `appendix-a-34-owner-orders.png`             | `/dashboard/orders`                  |
| SC-A-35 | A.35 | `appendix-a-35-owner-staff.png`              | `/dashboard/staff`                   |
| SC-A-36 | A.36 | `appendix-a-36-owner-subscription.png`       | `/dashboard/subscription`            |
| SC-A-37 | A.37 | `appendix-a-37-owner-billing-invoice.png`    | `/dashboard/billing/:id`             |
| SC-A-38 | A.38 | `appendix-a-38-owner-payment-settings.png`   | `/dashboard/payment-settings`        |
| SC-A-39 | A.39 | `appendix-a-39-owner-sepay-callback.png`     | sepay-callback                       |
| SC-A-40 | A.40 | `appendix-a-40-owner-reporting-locked.png`   | reporting entitlement locked         |
| SC-A-41 | A.41 | `appendix-a-41-owner-reporting-basic.png`    | reporting basic/full                 |
| SC-A-42 | A.42 | `appendix-a-42-owner-reporting-advanced.png` | advanced insights (nếu gói cho phép) |

### 5.5. Super Admin (SC-A-45 – SC-A-52)

| ID      | Hình | Filename                                   | Route                        |
| ------- | ---- | ------------------------------------------ | ---------------------------- |
| SC-A-45 | A.45 | `appendix-a-45-admin-home.png`             | `/admin`                     |
| SC-A-46 | A.46 | `appendix-a-46-admin-tenants.png`          | `/admin/tenants`             |
| SC-A-47 | A.47 | `appendix-a-47-admin-tenant-detail.png`    | `/admin/tenants/:id`         |
| SC-A-48 | A.48 | `appendix-a-48-admin-plans.png`            | `/admin/plans`               |
| SC-A-49 | A.49 | `appendix-a-49-admin-billing.png`          | `/admin/billing`             |
| SC-A-50 | A.50 | `appendix-a-50-admin-analytics.png`        | `/admin/analytics`           |
| SC-A-51 | A.51 | `appendix-a-51-admin-tenant-create.png`    | wizard create tenant         |
| SC-A-52 | A.52 | `appendix-a-52-admin-tenant-lifecycle.png` | suspend/activate (nếu có UI) |

### 5.6. Auth / security (SC-A-53 – SC-A-55, P2)

| ID      | Hình | Filename                                  | Ghi chú                  |
| ------- | ---- | ----------------------------------------- | ------------------------ |
| SC-A-53 | A.53 | `appendix-a-53-auth-login.png`            | Keycloak login           |
| SC-A-54 | A.54 | `appendix-a-54-auth-forbidden.png`        | route blocked theo role  |
| SC-A-55 | A.55 | `appendix-a-55-auth-tenant-suspended.png` | chỉ nếu có màn hình thật |

**Tổng Phụ lục A (P0+P1):** ~52 hình; có thể rút SC-A-09–12, 27–28, 39, 52 nếu thiếu thời gian — ghi `deferred` trong backlog.

## 6. Vị trí file và công cụ placeholder

### 6.1. Thư mục

```text
docs/graduation-thesis-resources/thesis-report/assets/screenshots/
  chapter5-01-customer-qr-session.png
  ...
  appendix-a-01-pwa-landing.png
  ...
```

LaTeX `\includegraphics` từ `assets/screenshots/` (theo cấu hình hiện tại của `assets/README.md`).

### 6.2. Tạo placeholder (ImageMagick hoặc Python)

```bash
cd docs/graduation-thesis-resources/thesis-report/assets/screenshots
# Ví dụ 1 ảnh trắng 1280x720
magick -size 1280x720 xc:white -quality 95 chapter5-01-customer-qr-session.png
```

Hoặc script một lần đọc danh sách từ §4–§5 (task thực thi).

Kích thước khuyến nghị capture thật: **1280×720** (16:9) hoặc viewport mobile PWA **390×844** — thống nhất một chuẩn trong toàn bộ khóa luận.

## 7. Khung LaTeX

### 7.1. Macro gợi ý (tùy chọn, trong `undergraduate-theses-report.tex` hoặc `chapters/05-*.tex` preamble local)

```tex
% true = đang dùng placeholder; false = ảnh thật
\newif\ifscreenshotplaceholder
\screenshotplaceholdertrue

\newcommand{\screenshotinclude}[2]{%
  \includegraphics[width=\textwidth,height=0.72\textheight,keepaspectratio]{#1}%
}
\newcommand{\screenshotcaption}[2]{%
  \ifscreenshotplaceholder
    [Khung bản nháp] #2 Cần thay bằng screenshot demo thật trước khi nộp.
  \else
    #2 Nguồn: ảnh chụp màn hình client QRTable trong môi trường demo.
  \fi
}
```

### 7.2. Ví dụ figure Chương 5

```tex
\begin{figure}[htbp]
  \centering
  \screenshotinclude{chapter5-06-staff-order-confirm.png}
  \caption{\screenshotcaption{Màn hình xác nhận đơn trên client POS của nhân viên; thao tác này kích hoạt luồng bảo toàn tồn kho ở Hình~\ref{fig:chapter5-order-confirm-stock}.}}
  \label{fig:chapter5-screenshot-staff-order-confirm}
\end{figure}
```

### 7.3. Phụ lục A — figure nhỏ hơn

Dùng `width=0.85\textwidth` hoặc `height=0.55\textheight` để nhiều hình/trang; có thể 2 cột chỉ khi template hỗ trợ và không làm chữ quá nhỏ.

## 8. Hướng dẫn capture thủ công (người viết)

### 8.1. Chuẩn bị demo

1. Một **tenant demo** cố định cho toàn bộ bộ ảnh (tên nhà hàng, menu, bàn B01…).
2. Seed data: ít nhất 1 phiên QR active, 1 đơn chờ confirm, 1 ticket KDS, 1 tenant mới onboard, 2 gói reporting (locked vs full).
3. Ghi `commit hash` + ngày chụp vào `thesis-phase5d-screenshot-scaffold.md` hoặc Phụ lục C.

### 8.2. Quy tắc chụp

- Ẩn thanh devtools, bookmark, extension.
- Cùng theme sáng/tối (khuyến nghị sáng cho in ấn).
- Cùng ngôn ngữ UI (tiếng Việt wire labels qua `*Vi()` trên Management App).
- Không che dữ liệu nhạy cảm (số điện thoại thật, API key).
- Với entitlement: chụp **cả** locked và unlocked nếu có thể.

### 8.3. Thứ tự capture đề xuất (happy path một lần đi)

1. Super Admin tạo tenant → Owner login → payment settings.
2. Owner: menu, bàn, QR in/screenshot URL.
3. Customer: landing → menu → cart → submit.
4. POS confirm → KDS refresh.
5. Payment flow (cash hoặc VietQR demo).
6. Owner reporting + Admin analytics.

## 9. Phạm vi thực thi plan

### 9.1. Làm trong plan này

- [x] Tạo/cập nhật `thesis-phase5d-screenshot-scaffold.md` (link plan này).
- [x] Tạo placeholder PNG cho toàn bộ SC-C5 và SC-A (63 file).
- [x] Chèn figure Chương 5 (SC-C5) vào `05-trien-khai-he-thong.tex` đúng section.
- [x] Viết đầy đủ `appendices/a-ui-gallery.tex` (49 figure, 6 section).
- [ ] (Tùy chọn) Bảng chỉ mục nhanh Phụ lục A 1 trang.
- [x] Cập nhật `thesis-artifact-backlog.md` §5: trạng thái `placeholder`, số hiệu Hình 5.6+ / A.x.
- [x] Build LaTeX; kiểm tra `.lof` (XeLaTeX pass, PDF ~176 trang).
- [x] Cập nhật `thesis-workflow-plan.md`.

### 9.2. Không làm trong plan này

- Không chụp screenshot thật (người viết).
- Không sửa business logic.
- Không viết lại toàn bộ prose Chương 5 (chỉ thêm đoạn dẫn quanh figure).
- Không thêm citation mới / không sửa `references.bib` trừ khi được yêu cầu.
- Không claim production/pilot trừ khi có URL/artifact thật (Phase 7).
- Không đưa observability Grafana vào Phụ lục A nếu chưa có ảnh thật.

## 10. Task breakdown (thứ tự agent)

| Task | Mô tả                                                                                               | Verify                     |
| ---- | --------------------------------------------------------------------------------------------------- | -------------------------- |
| T1   | `codegraph status .` + đọc routes                                                                   | Log index up-to-date       |
| T2   | Tạo thư mục `assets/screenshots/` nếu thiếu                                                         | `ls`                       |
| T3   | Script/generate placeholder SC-C5 (14) + SC-A P0 (~45)                                              | File count                 |
| T4   | Chèn LaTeX Chương 5                                                                                 | Build pass                 |
| T5   | Viết `a-ui-gallery.tex` đầy đủ SC-A P0                                                              | Build pass, `.lof` có A.1… |
| T6   | Cập nhật backlog + workflow plan                                                                    | Trạng thái `placeholder`   |
| T7   | (Sau này) Người viết thay ảnh → `\screenshotplaceholderfalse` → đổi caption → `captured`/`verified` | PDF visual check           |

## 11. Tiêu chí hoàn tất Phase 5D (scaffold)

Coi Phase 5D scaffold **hoàn tất** khi:

1. Tất cả file SC-C5 có placeholder và figure trong Chương 5 build không lỗi.
2. Phụ lục A có ≥ 40 figure P0 với label liên tục.
3. `thesis-artifact-backlog.md` phản ánh đúng `placeholder` và số hiệu Hình 5.6+ / A.x.
4. PDF build pass; không undefined reference trên label screenshot.
5. Không có caption nào gọi placeholder là “minh chứng đã kiểm chứng”.

**Phase 5D+ (session sau):** thay ảnh thật, bỏ cờ placeholder, polish caption, cập nhật Chương 6 nếu có demo checklist.

## 12. Câu hỏi mở — chốt với giảng viên / người viết

| #   | Câu hỏi                                                | Ảnh hưởng            |
| --- | ------------------------------------------------------ | -------------------- |
| Q1  | Phụ lục A có bắt buộc in kèm bản nộp không?            | Page count           |
| Q2  | Có cần đủ 52 hình Phụ lục A hay rút còn ~35?           | Effort capture       |
| Q3  | Reporting: bắt buộc cả locked + basic + advanced?      | SC-A-40–42, SC-C5-13 |
| Q4  | PWA chụp desktop browser hay mobile viewport?          | Kích thước figure    |
| Q5  | Có cần bảng map FR (Chương 3) ↔ màn hình (Phụ lục A)? | Scope tăng ~1 bảng   |

## 13. Tham chiếu chéo

| Tài liệu                                      | Vai trò                         |
| --------------------------------------------- | ------------------------------- |
| `thesis-workflow-plan.md` §6.1                | Quy trình Phase 5D              |
| `thesis-artifact-backlog.md` §5               | Backlog trạng thái              |
| `thesis-phase5d-screenshot-scaffold.md`       | Mapping ngắn + checklist        |
| `thesis-phase5a-evidence-audit.md`            | Evidence luồng Chương 5         |
| `thesis-official-outline.md` §7.3             | Nguyên tắc phân tầng UI         |
| `docs/testing/saga-validation-strategy.md`    | Giới hạn UI vs test evidence    |
| `docs/phases/phase-4d-dashboard-reporting.md` | Reporting / entitlement screens |
