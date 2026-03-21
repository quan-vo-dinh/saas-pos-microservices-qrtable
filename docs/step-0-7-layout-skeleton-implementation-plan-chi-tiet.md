# STEP 0.7 - KẾ HOẠCH TRIỂN KHAI CHI TIẾT

## Dựng Layout Skeleton cho 2 Frontend Apps (Ngày 6-7)

Phiên bản: 1.0  
Ngày cập nhật: 2026-03-21  
Trạng thái: Ready for Execution

---

## 1) Mục tiêu Step 0.7

Step 0.7 tập trung dựng khung giao diện chuẩn cho 2 app frontend, chưa đi sâu business feature hoàn chỉnh:

1. Management App (Next.js):

- Dựng Layout chung: Sidebar + Top Bar + Content Area.
- Thiết lập Design System nền tảng (tokens màu, typography, spacing).
- Thiết kế điều hướng theo vai trò sau đăng nhập (middleware role-based redirect).
- Tạo placeholder pages cho các nhóm route: /dashboard, /pos, /kds, /admin.

2. Customer PWA (React + Vite):

- Dựng layout tối giản, mobile-first: Header + Content.
- Dùng chung tokens thiết kế với Management App.

3. Verify:

- Đăng nhập Keycloak và redirect đúng route theo role.

---

## 2) Cơ sở tài liệu và nguồn chuẩn kỹ thuật

Kế hoạch này được xây dựng từ 4 tài liệu lõi của dự án:

- docs/business-logic.md
- docs/technical-architecture.md
- docs/implementation_plan.md
- docs/step-0-6b-authentication-authorization-chi-tiet.md

Và đã đối chiếu với code hiện trạng trong workspace:

- apps/management-app
- apps/customer-pwa
- libs/guards, libs/middlewares, libs/decorators
- apps/bff/src/app/app.module.ts

Ngoài ra, kế hoạch đã tham chiếu thực hành cập nhật từ Context7:

- Next.js middleware redirect, matcher, cookie/session access
- Tailwind CSS v4 @theme và chiến lược chia sẻ design tokens giữa nhiều app trong monorepo

---

## 3) Hiện trạng code (As-Is) trước khi triển khai

## 3.1 Management App

Hiện trạng:

- Đã có root layout cơ bản và trang home placeholder.
- Đã có globals.css theo hướng Tailwind v4 + css variables.
- Chưa có route groups cho dashboard/pos/kds/admin.
- Chưa có middleware.ts cho role-based redirect.
- Chưa có shell layout Sidebar/TopBar/Content.

Kết luận:

- Nền móng tốt để bắt đầu Step 0.7.
- Cần tổ chức lại cấu trúc App Router theo nhóm route và tách layout theo miền chức năng.

## 3.2 Customer PWA

Hiện trạng:

- Có App.tsx đơn giản.
- Có index.css với token CSS variables.
- Chưa có tách route màn hình skeleton (landing/menu/order-tracking/payment-request).
- Chưa có shell mobile layout (header + content) rõ ràng.

Kết luận:

- Có thể triển khai nhanh Step 0.7 bằng cách tách thành khung trang chuẩn mobile-first.

## 3.3 Shared libs frontend

Hiện trạng:

- Đã có libs/frontend/ui, libs/frontend/hooks, libs/frontend/utils (mức scaffold).
- Chưa có bộ tokens dùng chung đúng nghĩa cho 2 app.

Kết luận:

- Step 0.7 cần bổ sung một nguồn token thống nhất và cơ chế import dùng chung.

## 3.4 Auth chain backend (đã sẵn sàng để frontend bám)

Guard order trong BFF đang đúng kiến trúc:

1. UserGuard
2. SessionGuard
3. TenantGuard
4. PermissionGuard
5. ThrottlerGuard

Đây là điểm quan trọng để frontend thiết kế flow điều hướng đúng:

- Route nội bộ secured dựa trên JWT + permissions.
- Route guest/customer dựa trên session.

---

## 4) Nguyên tắc triển khai Step 0.7

1. Bám đúng kiến trúc 2-app:

- Management App: authenticated actors.
- Customer PWA: guest/customer session flow.

2. Không triển khai logic nghiệp vụ sâu trong Step 0.7:

- Chỉ dựng skeleton, placeholder pages, navigation khung.

3. Design System nhất quán, dùng chung token:

- Một nguồn tokens chuẩn, import cho cả 2 app.

4. Role-based redirect theo ma trận auth tài liệu 0.6B:

- SUPER_ADMIN -> /admin
- OWNER, MANAGER -> /dashboard
- WAITER -> /pos
- CHEF -> /kds/kitchen
- BARISTA -> /kds/bar

5. Tối ưu mở rộng giai đoạn sau:

- Route group và layout phân lớp từ đầu.
- Tránh viết lại cấu trúc khi vào Phase 1-2.

---

## 5) Thiết kế mục tiêu (To-Be) cho Management App

## 5.1 Cấu trúc route và layout đề xuất

Đề xuất theo App Router route groups:

- src/app/(auth)/login/page.tsx
- src/app/(auth)/callback/page.tsx

- src/app/(dashboard)/layout.tsx
- src/app/(dashboard)/page.tsx
- src/app/(dashboard)/menu/page.tsx
- src/app/(dashboard)/tables/page.tsx
- src/app/(dashboard)/staff/page.tsx
- src/app/(dashboard)/orders/page.tsx
- src/app/(dashboard)/subscription/page.tsx

- src/app/(pos)/layout.tsx
- src/app/(pos)/page.tsx
- src/app/(pos)/tables/page.tsx
- src/app/(pos)/payment/page.tsx

- src/app/(kds)/layout.tsx
- src/app/(kds)/kitchen/page.tsx
- src/app/(kds)/bar/page.tsx

- src/app/(admin)/layout.tsx
- src/app/(admin)/page.tsx
- src/app/(admin)/tenants/page.tsx
- src/app/(admin)/plans/page.tsx
- src/app/(admin)/analytics/page.tsx

Ghi chú:

- Mỗi route nhóm có layout riêng để tối ưu UX theo vai trò.
- Placeholder pages cần hiển thị rõ: module name, role scope, trạng thái phát triển.

## 5.2 Shell Layout chuẩn cho nhóm dashboard

Mục tiêu UI shell:

- Sidebar trái: menu điều hướng chính.
- Top bar: tenant context, user profile, breadcrumbs, quick actions.
- Content area: nơi render page con.

Component hoá tối thiểu:

- components/layout/app-sidebar.tsx
- components/layout/app-topbar.tsx
- components/layout/app-shell.tsx

Yêu cầu kỹ thuật:

- Responsive: mobile dùng drawer thay sidebar cố định.
- Sidebar và topbar dùng token màu, spacing đồng bộ.
- Tránh hard-code màu tại component.

## 5.3 Middleware role-based redirect (Next.js)

## Mục tiêu

- Sau login callback, tự điều hướng người dùng về khu vực đúng role.
- Chặn truy cập sai role vào route không phù hợp.

## Cấu trúc file

- middleware.ts
- Có thể thêm lib/auth/role-routing.ts để tách mapping.

## Nguồn dữ liệu role

Ưu tiên theo thứ tự:

1. JWT claims trong cookie/session (nếu đã decode an toàn phía server edge).
2. Fallback gọi endpoint profile (ví dụ /authorizer/me) qua BFF nếu cần.

## Mapping route theo role

- SUPER_ADMIN: /admin
- OWNER, MANAGER: /dashboard
- WAITER: /pos
- CHEF: /kds/kitchen
- BARISTA: /kds/bar

## Matcher khuyến nghị

Theo best practice Next.js (Context7):

- Bỏ qua static assets và API nội bộ.
- Chỉ bắt các route app cần kiểm soát.

Ví dụ định hướng matcher:

- /(dashboard|pos|kds|admin)/:path\*
- /login
- /

## Luồng middleware

1. Xác định path hiện tại.
2. Nếu path public cho auth (login/callback), cho đi tiếp hoặc redirect nếu đã có session hợp lệ.
3. Nếu path protected mà không có session -> redirect /login.
4. Nếu có session nhưng role không phù hợp path -> redirect đến home route theo role.
5. Nếu đúng role -> NextResponse.next().

## Chính sách lỗi

- Không xác định được role: redirect /login và clear phiên nếu cần.
- Role ngoài danh sách hỗ trợ: redirect route fallback an toàn, log cảnh báo.

---

## 6) Thiết kế mục tiêu (To-Be) cho Customer PWA

## 6.1 Layout tối giản mobile-first

Khung đề xuất:

- Header cố định đơn giản: tên quán, trạng thái session/bàn.
- Main content: menu hoặc thông tin tương ứng màn hình.
- Bottom safe-area spacing cho thiết bị tai thỏ.

Màn hình skeleton tối thiểu cho Step 0.7:

- landing (QR entry)
- menu
- order-tracking
- request-payment

## 6.2 Kiến trúc component cơ bản

Đề xuất:

- components/layout/mobile-header.tsx
- components/layout/mobile-shell.tsx
- components/placeholders/feature-placeholder.tsx

Yêu cầu:

- Tối ưu viewport nhỏ trước, rồi mở rộng tablet.
- Tất cả typography/spacing lấy từ token chung.

---

## 7) Chiến lược Design System dùng chung

## 7.1 Vấn đề hiện tại

Hiện 2 app đều có CSS variables riêng, nguy cơ lệch khi mở rộng.

## 7.2 Mục tiêu

Tạo một nguồn token dùng chung cho cả 2 app, tránh duplicate.

## 7.3 Hướng triển khai đề xuất

Phương án A (khuyến nghị cho Tailwind v4):

1. Tạo file token chung tại libs/frontend/ui/src/styles/theme.css.
2. Định nghĩa toàn bộ @theme + css variables tại đây.
3. Mỗi app import file này vào global css riêng.

Phương án B (fallback):

- Trích xuất token thành package preset nội bộ và import qua CSS entry.

## 7.4 Bộ token tối thiểu cần có ở Step 0.7

1. Color tokens

- background, foreground, card, border
- primary, secondary, accent, muted
- semantic: success, warning, destructive, info

2. Typography tokens

- font sans chính
- scale cỡ chữ cơ bản: xs, sm, base, lg, xl, 2xl, 3xl
- line-height chuẩn body và heading

3. Spacing tokens

- bước theo thang 8-point
- khoảng cách chuẩn cho padding/margin layout shell

4. Radius và shadow tokens

- radius cho card/button/input
- shadow tầng 1-2 để phân lớp giao diện

## 7.5 Nguyên tắc màu cho Step 0.7

Theo guideline frontend-design của workspace:

- Tránh phong cách generic tím/indigo mặc định.
- Chọn palette trung tính + accent có chủ đích, dễ đọc và dễ mở rộng đa module.
- Ưu tiên tương phản tốt để đảm bảo accessibility.

---

## 8) Mapping Role -> Route chính thức cho Step 0.7

Bảng routing sau login:

- SUPER_ADMIN -> /admin
- OWNER -> /dashboard
- MANAGER -> /dashboard
- WAITER -> /pos
- CHEF -> /kds/kitchen
- BARISTA -> /kds/bar

Bảng route access policy:

1. /admin/\*

- Cho phép: SUPER_ADMIN
- Chặn: OWNER, MANAGER, WAITER, CHEF, BARISTA

2. /dashboard/\*

- Cho phép: OWNER, MANAGER
- Chặn: WAITER, CHEF, BARISTA (trừ khi có quyết định mở rộng sau)

3. /pos/\*

- Cho phép: WAITER, MANAGER, OWNER
- Chặn: CHEF, BARISTA cho các màn hình không liên quan POS

4. /kds/kitchen

- Cho phép: CHEF, MANAGER, OWNER

5. /kds/bar

- Cho phép: BARISTA, MANAGER, OWNER

Ghi chú triển khai:

- Vai trò MANAGER và OWNER có thể được phép vào POS/KDS theo chính sách vận hành.
- Nếu muốn strict ngay ở Step 0.7, có thể giới hạn cứng đúng role chính, rồi mở rộng ở Phase 1.

---

## 9) Kế hoạch triển khai chi tiết theo mốc ngày (Ngày 6-7)

## Ngày 6 - Buổi sáng

1. Chuẩn hóa cấu trúc app routes Management App.
2. Tạo route groups và placeholder pages.
3. Tạo shell components Sidebar/TopBar/Content.

Đầu ra:

- Route tree đầy đủ cho /dashboard, /pos, /kds, /admin.
- Có thể chạy và điều hướng cơ bản.

## Ngày 6 - Buổi chiều

1. Tạo token CSS chung trong libs/frontend/ui.
2. Refactor global styles 2 app để import token chung.
3. Chuẩn hóa typography/spacing/radius giữa 2 app.

Đầu ra:

- Hai app hiển thị đồng nhất hệ token.
- Không còn copy-paste token block lớn ở mỗi app.

## Ngày 7 - Buổi sáng

1. Triển khai middleware.ts cho Management App.
2. Viết mapping role-route và path guard.
3. Tạo fallback và xử lý trường hợp role không hợp lệ.

Đầu ra:

- Redirect đúng role sau login.
- Chặn truy cập route trái vai trò.

## Ngày 7 - Buổi chiều

1. Dựng skeleton Customer PWA mobile-first.
2. Tạo các màn hình placeholder chính.
3. Chạy verify end-to-end bằng checklist.

Đầu ra:

- Customer PWA có layout khung sẵn sàng cho Phase 1.
- Hoàn thành tiêu chí verify Step 0.7.

---

## 10) Chi tiết task breakdown (WBS)

## 10.1 Management App

A. Routing + Layout

- Tạo route groups theo miền chức năng.
- Tạo layout riêng cho dashboard/pos/kds/admin.
- Tạo component shared shell.

B. Placeholder pages

- Dashboard home và các module con.
- POS home/tables/payment.
- KDS kitchen/bar.
- Admin home/tenants/plans/analytics.

C. Middleware role redirect

- Tạo bảng ROLE_HOME_ROUTE.
- Tạo bảng PATH_ACCESS_POLICY.
- Viết logic kiểm tra path và redirect.
- Thêm matcher để tránh bắt static/internal.

## 10.2 Customer PWA

A. Mobile shell

- Header cơ bản.
- Content container với spacing chuẩn.

B. Placeholder pages

- Landing QR.
- Menu.
- Order tracking.
- Request payment.

C. Session-aware UI scaffold

- Slot hiển thị x-session-id và table context (placeholder).

## 10.3 Shared Design Tokens

A. Tạo token file dùng chung.
B. Import vào Management App globals.css.
C. Import vào Customer PWA index.css.
D. Kiểm tra class utility và css variable hoạt động đúng trên cả Next.js + Vite.

---

## 11) Tiêu chí hoàn thành (Definition of Done)

## 11.1 Bắt buộc

1. Management App:

- Có layout shell Sidebar + TopBar + Content hoạt động.
- Có đầy đủ placeholder route groups: /dashboard, /pos, /kds, /admin.
- Middleware redirect đúng role sau login.

2. Customer PWA:

- Có layout tối giản mobile-first.
- Có placeholder pages chính cho flow QR ordering.

3. Design system:

- Token dùng chung thật sự giữa 2 app.
- Không còn định nghĩa token lõi rời rạc mỗi app.

4. Verify auth redirect:

- Login với mỗi role mẫu phải vào đúng route mục tiêu.

## 11.2 Khuyến nghị thêm

- Có test tối thiểu cho mapping role-route.
- Có checklist manual test ghi nhận pass/fail từng role.

---

## 12) Kịch bản verify chi tiết

## 12.1 Verify kỹ thuật cục bộ

1. Khởi chạy app:

- nx serve management-app
- nx serve customer-pwa

2. Kiểm tra route skeleton:

- Truy cập trực tiếp từng route group và xác nhận render placeholder.

3. Kiểm tra style tokens:

- Đổi một token chính và xác nhận cả 2 app đổi đồng nhất.

## 12.2 Verify login redirect theo role

Tối thiểu các case:

1. SUPER_ADMIN login -> /admin
2. OWNER login -> /dashboard
3. MANAGER login -> /dashboard
4. WAITER login -> /pos
5. CHEF login -> /kds/kitchen
6. BARISTA login -> /kds/bar

Case âm:

1. Role WAITER cố truy cập /admin -> bị redirect về /pos
2. Không có session truy cập /dashboard -> redirect /login
3. Token lỗi/hết hạn -> về /login

---

## 13) Rủi ro và phương án giảm thiểu

1. Rủi ro: Role mapping chưa đồng bộ giữa Keycloak và internal profile.

- Giảm thiểu: dùng endpoint profile chuẩn sau login để xác nhận roles hiệu lực.

2. Rủi ro: Middleware edge không lấy đủ thông tin role.

- Giảm thiểu: fallback gọi API profile nội bộ, hoặc lưu role snapshot vào session cookie an toàn.

3. Rủi ro: Token CSS bị trùng hoặc ghi đè ngoài ý muốn.

- Giảm thiểu: namespace rõ ràng cho semantic tokens và audit style import order.

4. Rủi ro: Lệch UX giữa 2 app do custom component riêng lẻ.

- Giảm thiểu: dùng chung primitives từ libs/frontend/ui cho shell blocks.

---

## 14) Phạm vi không làm trong Step 0.7 (Out of Scope)

1. Không triển khai CRUD thật cho menu/order/table.
2. Không triển khai websocket realtime hoàn chỉnh.
3. Không triển khai offline queue đầy đủ cho PWA.
4. Không hoàn thiện toàn bộ phân quyền fine-grained theo permission cho mọi màn hình.

---

## 15) Phụ lục A - Pseudocode middleware role redirect

Input:

- pathname
- session/cookie
- roles

Output:

- next
- redirect

Luồng:

1. Nếu pathname thuộc static/internal -> next.
2. Nếu pathname là login/callback:

- Nếu chưa auth -> next.
- Nếu đã auth -> redirect home theo role.

3. Nếu pathname protected mà chưa auth -> redirect /login.
4. Nếu đã auth:

- Tìm role home route.
- Nếu pathname không thuộc vùng được phép -> redirect role home.
- Ngược lại -> next.

---

## 16) Phụ lục B - Khuyến nghị cấu trúc import token chung

Gợi ý tổ chức:

- libs/frontend/ui/src/styles/theme.css

Management App:

- src/app/globals.css import theme.css trước lớp base app-specific.

Customer PWA:

- src/index.css import theme.css trước lớp base app-specific.

Nguyên tắc:

- Token lõi ở shared.
- Chỉ override cục bộ tại app khi thật sự cần.

---

## 17) Kết luận

Step 0.7 là bước khóa nền tảng frontend cho toàn bộ các phase sau. Trọng tâm không phải là số lượng màn hình, mà là:

1. Khung layout đúng kiến trúc vai trò.
2. Cơ chế redirect auth đúng role ngay từ đầu.
3. Design tokens dùng chung và ổn định cho 2 app.

Nếu thực hiện đúng kế hoạch này trong 2 ngày, dự án sẽ có nền UI/UX và routing đủ chắc để đi tiếp Phase 1 (Catalog/Menu/Table) mà không phải refactor lớn cấu trúc frontend.
