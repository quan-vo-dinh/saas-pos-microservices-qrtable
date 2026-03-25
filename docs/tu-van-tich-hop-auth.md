# ĐÁNH GIÁ HIỆN TRẠNG VÀ TƯ VẤN CHIẾN LƯỢC TÍCH HỢP AUTHENTICATION & AUTHORIZATION

Tài liệu này được tạo ra dựa trên việc nghiên cứu 4 tài liệu cốt lõi của dự án hệ thống SaaS POS QRTable để giải đáp hiện trạng của toàn bộ quá trình phân quyền, xác thực (Auth) tại cả Frontend và Backend, trong bối cảnh bạn đã hoàn thành **Step 1.2** (Mock UI Dashboard).

---

## 1. TRẢ LỜI NGẮN GỌN (EXECUTIVE SUMMARY)

**Câu hỏi 1: Ở phía Frontend (2 app), đã được tích hợp hoàn thiện đầy đủ phần auth, role, permission và có login/register hoàn thiện để tích hợp với Backend hay chưa?**
👉 **Trả lời:** **ĐÃ HOÀN THIỆN XONG VỀ MẶT CƠ CHẾ VÀ LUỒNG (FLOW)**. Hệ thống phân tách 2 app:

- **Customer PWA** hoàn toàn KHÔNG CẦN form login/register (xác thực ẩn danh bằng Guest Session ID qua Redis).
- **Management App** dùng OAuth2 qua Keycloak SSO. Ứng dụng sẽ chuyển hướng (redirect) về màn hình đăng nhập chuẩn của Keycloak thay vì phải code lại Form Login/Register trên Frontend. Middleware Next.js xử lý rẽ nhánh theo Role (Owner, Staff) cũng đã được thiết kế sẵn sàng từ Phase 0 (Step 0.7).

**Câu hỏi 2: Backend đã phân quyền, roles, permission, authen, author,... hoàn thiện hết để Frontend sẵn sàng integrate chưa?**
👉 **Trả lời:** **SẴN SÀNG 100% ĐỂ TÍCH HỢP**. Hệ thống Backend tại Phase 0 (Step 0.6 và Step 0.6A) đã xử lý 4 lớp Guard an ninh vô cùng chặt chẽ tại **BFF Gateway** bao gồm `UserGuard` (JWT), `SessionGuard` (Guest), `TenantGuard` (Cô lập dữ liệu Multi-Tenant) và `PermissionGuard` (Chặn theo quyền API). Hệ thống đồng bộ (Mapping) Role giữa Keycloak và Database MongoDB cũng đã hoàn thành.

---

## 2. ĐÁNH GIÁ CHUYÊN SÂU: FRONTEND (2 APPS)

Kiến trúc UI (2-App Architecture) trong Nx Monorepo được phân lớp Auth cực kỳ thông minh:

### A. Customer PWA (App khách hàng)

- **Authentication**: Xác thực ẩn danh qua Session ID ở Redis (Anonymous Session).
- **Tình trạng Login/Register**: Chủ đích thiết kế **không yêu cầu đăng nhập** để tối ưu UX cho khách quét mã tại bàn. Khách quét mã QR chứa `table_id` và HMAC `token` qua URL, hệ thống trả về phiên (Session) làm định danh duy nhất.
- **Tích hợp**: PWA không cần quản lý Auth Token (JWT), chỉ cần lưu `x-session-id` ở Header/Cookie mỗi khi gọi API.

### B. Management App (App nhân viên/chủ quán)

- **Luồng Đăng nhập (Keycloak SSO)**: App này tuân thủ Single Sign-On (SSO). Bạn **không cần xây dựng giao diện form Login hay Register trên Next.js**. Frontend chỉ cần giao diện redirect đến Keycloak OIDC. Keycloak sẽ là nơi xử lý Account/Password và trả JWT Token về lại Next.js.
- **Rule & Permission Rendering**: Theo tài liệu (Step 0.7), Next.js `middleware.ts` đã phân luồng dựa vào JWT payload:
  - Middleware bóc tách Token ra được Role (Ví dụ: `WAITER`, `CHEF`, `OWNER`).
  - Middleware tự động điều phối `WAITER` về route `/pos`, `CHEF` về `/kds`, `OWNER` về `/dashboard`.
- **Tích hợp hiện tại (Sau step 1.2)**: Token JWT cần được Context/Zustand quản lý để đính kèm lên HTTP Header khi axios/fetch gọi BFF. Các nền tảng UI này đã có sẵn.

---

## 3. ĐÁNH GIÁ CHUYÊN SÂU: BACKEND

Các tài liệu kỹ thuật (`step-0-6b-authentication-authorization-chi-tiet`, `implementation_plan`, `technical-architecture`, `business-logic`) minh chứng rõ Backend sở hữu bức tường phòng thủ cực kì kiên cố:

- **BFF (API Gateway) làm thủ môn duy nhất**: Quản lý trung tâm cho mọi truy cập. Lớp microservice phía sau hoàn toàn không phải bận tâm kiểm tra Token lại.
- **Cấu trúc 4 Lớp Guards tự động**:
  1. `UserGuard`: Đọc JWT Token, kiểm tra CACHE từ Redis, đối chiếu với Authorizer (gRPC Service), và ánh xạ Role từ Keycloak sang DB Profile một cách tinh xảo.
  2. `SessionGuard`: Khắc phục thiếu Token (Dành cho Customer App) bằng cơ chế cấp UUID Phiên ảo trên Redis có TTL (Time-To-Live).
  3. `TenantGuard`: Chặn triệt để tấn công Cross-tenant (chống việc chủ quán 1 xem dữ liệu chủ quán 2 bằng cách check field `tenant_id` từ Token/Session payload với header truy vấn).
  4. `PermissionGuard`: Quản lý Permission Matrix (5 Roles lớn) cực kì chi tiết bằng các Decorator như `@Permissions([PERMISSION.CATALOG_CREATE])`.

---

## 4. TƯ VẤN CHIẾN LƯỢC TÍCH HỢP CHO PHA TIẾP THEO (SAU STEP 1.2)

Hiện tại bạn đã dựng xong phần Mock UI cho Menu & Table (Step 1.2). Để vượt qua trơn tru Step 1.5 (Backend Catalog) và Step 1.6 (Tích hợp Frontend Catalog API), bạn thực thi chiến lược sau:

### Trọng Tâm Frontend (React/Next.js)

1. **Quản lý Context & Phân quyền UI (UI Authorization)**:
   - Dùng State Manager (Zustand hoặc React Context) lưu lại Payload của Token.
   - Khi có `userData.permissions`, bạn viết một Hook, ví dụ: `const canEdit = useHasPermission('CATALOG_UPDATE');`. Nếu Hook trả `false`, Frontend sẽ giấu/disable nút "Sửa Món ăn" theo chuẩn UI Role-Based.
   - Bám sát Matrix ở tài liệu `business-logic.md` (Phần B. Permission Matrix) để ẩn/hiện Sidebar cho đúng Role.

2. **Chặn Fetch API Lỗi bằng Interceptor**:
   - Viết 1 Axios Interceptor hoặc Custom fetch hook dùng chung.
   - Tự động đính `Authorization: Bearer <TKN>` vào Header và đính `x-tenant-id` (phân lập dữ liệu multi-tenant).
   - Bắt các lỗi HTTP 401 Unauthorized (khi Hết hạn Token) hoặc 403 Forbidden (Thiếu quyền) từ API Backend để bật Pop-up làm mới Token hoặc redirect về trang Login Auth.

### Trọng Tâm Backend (Phát triển Catalog / Orders Service)

1. **Tuyệt đối tin tưởng cơ chế Guards (Do Not Reinvent the Wheel)**:
   - Khi viết Controller mới ở Service Catalog (Tạo Món, Tạo Bàn), **KHÔNG CẦN viết if-else kiểm tra Role hay Tenant trong ruột Logic**.
   - Chỉ cần gắn Decorator của bộ thư viện chung:
     ```typescript
     @Post('item')
     @Authorization({ secured: true })
     @Permissions([PERMISSION.CATALOG_CREATE])
     async createMenuItem(...) { ... }
     ```
   - Lọt được vào API là Request đã sạch 100%.

2. **Context Propagation (Truyền Ngữ cảnh Xuống Microservice)**:
   - BFF nhận API REST đã auth, bạn KHÔNG THIẾT KẾ Service tự kiểm tra DatabaseAuth lần 2.
   - BFF phải gói `tenantId`, `userId`, `processId` chuyển vào các gói tin TCP Payload gửi xuống Catalog Service hoặc Order Service.
   - Đảm bảo Repository Layer tại microservice sử dụng Global Filter `WHERE tenantId = ?` thay vì phải code lại từng câu Query.

### 5. LỜI KẾT & ĐỀ XUẤT THỰC THI

**Hạ tầng Auth của bạn xây ở Phase 0 cực kì đồ sộ và thông minh.** Bài toán định danh, bảo mật đa khách hàng, Role mapping và Guest Session đã được hóa giải tận gốc.

- Bạn hãy tự tin bắt đầu triển khai ngay **Step 1.4 (Chia sẻ Type FE/BE)** của Implementation Plan.
- Sau đó thẳng tiến vào **Step 1.5 (Xây dựng API Thực cho Catalog)**.
- Mọi logic Auth đã tự động vận hành trôi chảy, việc tích hợp của Frontend tới Backend sẽ vô cùng mượt mà. Đừng thêm bất kỳ code thừa (code logic check Auth lặp lại) nào ở các logic Service phía sau!
