# TÀI LIỆU NGHIỆP VỤ HỆ THỐNG QUẢN LÝ NHÀ HÀNG

> **PHÂN TÍCH DỰA TRÊN HỆ THỐNG CHỦ ĐẠO QRTABLE.IO**
> **Trạng thái hiện tại:** Tổng quan nghiệp vụ thực tế, được đồng bộ lần cuối với các tính năng đã triển khai của Phase 4D.1 (dashboard reporting, entitlement gating và UI polish) vào ngày 01-06-2026.

Tài liệu này mô tả chi tiết các luồng nghiệp vụ cốt lõi, từ thiết lập ban đầu đến vận hành hàng ngày của nhà hàng, tập trung vào mô hình đặt món tại bàn qua mã QR (QR-based table ordering).

Khi có sự xung đột thông tin, ưu tiên áp dụng theo thứ tự: mã nguồn/test hiện tại, tài liệu business/technical canonical, tài liệu ghi chép phase trong `docs/phases/`, sau đó mới đến bằng chứng hỗ trợ. Ma trận RBAC chi tiết nằm tại [permission-matrix.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/architecture/permission-matrix.md).

---

## 1. LUỒNG KHỞI TẠO VÀ THIẾT LẬP NHÀ HÀNG (ONBOARDING & MULTI-TENANCY)

> **LƯU Ý:** Hệ thống là một **SaaS Platform** với mô hình Multi-tenant. Quy trình này được quản lý bởi **Super Admin** ở tầng Platform.

Đây là quy trình tạo một nhà hàng tenant trên nền tảng, gắn với Owner (chủ nhà hàng), subscription (gói dịch vụ), cấu hình thanh toán ban đầu và trạng thái hoạt động độc lập. Trạng thái hiện tại sau Phase 4B là **onboarding được hỗ trợ bởi admin**; bộ hướng dẫn đăng ký tự phục vụ (self-service registration wizard) được để lại cho phase tiếp theo.

### A. Các bước thiết lập

1. **Onboard tenant bởi Super Admin:**
   - `SUPER_ADMIN` tạo tenant thông qua giao diện quản trị của platform, khai báo tên quán, loại hình, địa chỉ, thông tin Owner và gói dịch vụ ban đầu.
   - Hệ thống tạo tenant, người dùng Owner, subscription mặc định và bản ghi cấu hình thanh toán ban đầu trong cùng một quy trình onboarding.
   - Quy trình Onboarding Phase 4B là một mini-saga trong SaaS service: nếu bước tạo user/profile/cấu hình thanh toán thất bại, hệ thống sẽ rollback dữ liệu đã tạo trong database và có cơ chế dọn dẹp (cleanup path) cho các user Keycloak mồ côi (orphan Keycloak users).
   - Phase 4B sử dụng cơ chế `SUPER_ADMIN` nhập mật khẩu thủ công cho Owner; các hành động yêu cầu đặt lại mật khẩu qua email nằm ngoài phạm vi triển khai hiện tại.

2. **Khởi tạo định danh nhà hàng (tenant Identity):**
   - **Logic cốt lõi:** Hệ thống tự động tạo một Slug/Subdomain duy nhất (ví dụ: `the-coffee-house.qrtable.io`) làm định danh thương hiệu trên Internet.
   - Slug phải được chuẩn hóa tiếng Việt không dấu, duy nhất trên toàn nền tảng và chặn các từ khóa dự phòng (reserved words) như `admin`, `api`, `www`, `app` để không trùng lặp với các route nội bộ hoặc thương hiệu của hệ thống.

3. **Chọn gói dịch vụ (Subscription Plan):**
   - Super Admin quản lý các gói dịch vụ (pricing plans); Owner có thể xem các gói dịch vụ và tạo yêu cầu thanh toán subscription cho tenant của họ; Manager chỉ có quyền xem subscription/plan.
   - **Quy tắc:** Gói dịch vụ giới hạn tính năng và quy mô (Ví dụ: Free Plan chỉ cho phép tối đa 10 bàn, không có báo cáo nâng cao). Ghi nhận ngày bắt đầu và kết thúc của gói dịch vụ.
   - Các tính năng của gói dịch vụ chuẩn hiện tại:
     - `FREE`: `basic_pos`
     - `BASIC`: `basic_pos`, `analytics_basic`
     - `PREMIUM`: `basic_pos`, `analytics_basic`, `analytics_advanced`, `priority_support`
   - Báo cáo trên dashboard nhận biết được gói dịch vụ đang sử dụng. Giao diện dashboard chung và hạn ngạch sử dụng sẽ hiển thị cho người dùng Owner/Manager có quyền truy cập báo cáo, nhưng dữ liệu API báo cáo của tenant yêu cầu phải có một subscription đang hoạt động (`ACTIVE`) và tính năng plan tương ứng được mở khóa.
   - Mỗi tenant chỉ có thể có duy nhất một subscription ở trạng thái `ACTIVE` tại một thời điểm. Subscription mới có thể thay thế subscription cũ và phải thực hiện invalidation cache/guard liên quan.
   - Tự động tạm ngưng hoạt động khi gói dịch vụ hết hạn theo giờ Việt Nam: hàng ngày vào lúc `02:00 Asia/Ho_Chi_Minh`, thời gian ân hạn là 24 giờ (`expires_at + 1 day < now()`).
   - Bộ đếm `max_orders_per_day` sử dụng múi giờ `Asia/Ho_Chi_Minh` cho thị trường Việt Nam.
   - Các bộ đếm giới hạn của gói dịch vụ hiện tại là số lượng dịch vụ thực tế đang chạy: số bàn lấy từ Catalog, nhân viên lấy từ User-Access, và số đơn hàng hôm nay lấy từ Order dựa theo ranh giới ngày của múi giờ Ho Chi Minh.
   - Tenant thanh toán cho platform sử dụng mã hóa đơn subscription với tiền tố `QRSUB*`; hỗ trợ cơ chế xác nhận thủ công (`SUPER_ADMIN` manual confirm fallback) khi webhook thanh toán gặp sự cố nhưng tiền đã vào tài khoản.

4. **Thiết lập thanh toán cho tenant:**
   - Owner kết nối SePay OAuth2 trong màn hình `/dashboard/payment-settings` để chuyển tiền thanh toán hóa đơn của khách hàng trực tiếp về tài khoản ngân hàng của tenant.
   - Payment service sở hữu bảng `tenant_payment_settings`; SaaS service chỉ sở hữu các thông tin thanh toán hóa đơn của tenant/subscription/invoice đối với platform.
   - Hệ thống thanh toán hai tầng sử dụng tiền tố riêng biệt: `QRTBL*` cho thanh toán hóa đơn của khách hàng trả về tài khoản của tenant, và `QRSUB*` cho hóa đơn subscription của tenant trả cho platform.
   - Phase 4B hỗ trợ một tài khoản SePay / một tài khoản ngân hàng hoạt động trên mỗi tenant; việc kích hoạt nhiều ngân hàng cùng lúc, phân bổ quyền và hoàn tiền subscription một phần sẽ tạm hoãn (defer).

5. **Thiết lập cấu hình vận hành:**
   - **Mặc định tại Việt Nam:** Hệ thống tự động cấu hình đơn vị tiền tệ là VND và ngôn ngữ tiếng Việt.
   - **Chế độ vận hành (Operating Mode):** Khách hàng có thể đặt món trực tiếp (Instant Order) hoặc chỉ xem thực đơn điện tử (Digital Menu).

### B. Quy tắc nghiệp vụ (Business Rules)

- **Cô lập dữ liệu (tenant Isolation):** Đảm bảo dữ liệu (orders, doanh thu, khách hàng) của cửa hàng này hoàn toàn độc lập và không thể bị nhìn thấy bởi cửa hàng khác.
- **Trạng thái hoạt động:** Cửa hàng có các trạng thái `ACTIVE`, `SUSPENDED`, `CLOSED`. Trạng thái `SUSPENDED` chuyển tenant sang chế độ chỉ đọc đối với các thao tác mới, nhưng vẫn cho phép thực hiện thanh toán cho các hóa đơn đang chờ xử lý.
  - **Tác nhân:** Super Admin có quyền tạm dừng (suspend)/kích hoạt (activate)/đóng cửa (close) tenant khi vi phạm chính sách hoặc gói dịch vụ hết hạn.
  - Trường `isActive` chỉ là trường tương thích ngược với các DTO cũ; hành vi vận hành thực tế được quyết định bởi trường `status`.
  - Khi tenant bị `SUSPENDED`, SePay webhook cho hóa đơn đã tạo vẫn được xử lý idempotent; đơn hàng ở trạng thái `PROCESSING` vẫn tiếp tục được chế biến trong bếp cho đến khi phục vụ xong; giao diện hiển thị banner cảnh báo thay vì ngắt kết nối bắt buộc (force-disconnect).
  - `CLOSED` là trạng thái kết thúc hợp đồng trong Phase 4B, hệ thống sẽ đánh dấu soft-flag tenant và vô hiệu hóa tài khoản Owner khi cần thiết. Chính sách xóa cứng/lưu trữ dữ liệu/data erasure được hoãn lại.
- **Phân quyền ban đầu:** Tenant được onboard với tài khoản **Restaurant Owner** trong phạm vi tenant; Owner quản lý nhân sự, Manager điều hành nhưng không có quyền xóa người dùng, thanh toán gói dịch vụ hoặc cập nhật cấu hình thanh toán SePay.
- **Chuyển đổi các tenant cũ:** Các tenant cũ (legacy tenants) có kế hoạch backfill tự động chuyển sang gói `FREE` không hết hạn; `isActive=false` được ánh xạ sang trạng thái `SUSPENDED`; tiền tệ và ngôn ngữ mặc định là `VND` / `vi-VN`.

---

## 2. LUỒNG QUẢN LÝ THỰC ĐƠN (CATALOG & MENU MANAGEMENT)

Mô tả quy trình số hóa thực đơn giấy của nhà hàng thành thực đơn điện tử trên hệ thống.

### A. Cấu trúc thực đơn (Menu Hierarchy)

Hệ thống tuân thủ cấu trúc 2 tầng đơn giản:

1. **Danh mục (Category):**
   - Dùng để nhóm các món ăn/đồ uống (Ví dụ: Khai vị, Món chính, Đồ uống, Tráng miệng).
   - **Logic hiển thị:** Có thể thiết lập khung giờ hiển thị cho danh mục (Ví dụ: danh mục "Ăn sáng" chỉ hiển thị từ 6h - 10h sáng).
   - **Trạng thái:** `Active` (Hiển thị) hoặc `Inactive` (Ẩn).

2. **Món ăn/Đồ uống (Menu Item):**
   - **Thông tin cơ bản:** Tên món, Hình ảnh, Mô tả ngắn, Giá cố định.
   - **Trạng thái:** `Available` (Còn món) hoặc `Out of Stock` (Hết món). Khi hết món, nút "Đặt món" trên giao diện khách hàng sẽ bị vô hiệu hóa ngay lập tức.
   - **Tính giá đơn giản:** Mỗi món ăn chỉ có một giá cố định, không có các tùy chọn biến thể (size, topping).

### B. Quy tắc nghiệp vụ cốt lõi

- **Tính toán giá đơn giản:** Tổng tiền = Giá món ăn × Số lượng. Không có phụ phí, thuế, hoặc giảm giá đi kèm.
- **Hiển thị:** Chỉ hiển thị những món ăn thuộc danh mục `Active` và có trạng thái là `Available`.
- **Sắp xếp tùy chỉnh:** Owner có quyền sắp xếp thứ tự hiển thị của các Danh mục và Món ăn (kéo & thả).
- **Đồng bộ thực đơn hiện tại:** Thao tác thay đổi thực đơn sẽ invalidate cache/query hiện tại; hệ thống hiện tại không có cơ chế phát sự kiện Kafka/WS `menu.updated`. Sự hội tụ dữ liệu giữa Khách hàng/POS thực hiện bằng cách refetch theo chu kỳ query hoặc invalidate chủ động sau mutation.
- **Ràng buộc khi xóa:** Không được xóa món ăn đang tồn tại trong các đơn hàng ở trạng thái `Pending` hoặc `Processing`.

---

## 3. LUỒNG QUẢN LÝ BÀN & MÃ QR (TABLE & QR LOGIC)

Chịu trách nhiệm số hóa sơ đồ mặt bằng nhà hàng và tạo các "Điểm truy cập" cho khách hàng.

### A. Cấu trúc tổ chức không gian

- **Khu vực (Areas/Zones):**
  - Chia nhà hàng thành các khu vực quản lý (Tầng trệt, Ban công, Phòng VIP).
  - **Nghiệp vụ:** Giúp phân bổ phục vụ dễ dàng và báo cáo doanh thu theo từng vùng.
- **Bàn (Tables):**
  - Mỗi bàn thuộc về một Khu vực. Thông tin cơ bản: Tên/Số bàn, Sức chứa tối đa.
  - **Định danh:** Mỗi bàn có một ID duy nhất trong phạm vi cửa hàng.

### B. Logic định danh và Tạo mã QR

- **Cơ chế ánh xạ (Mapping):**
  - Mỗi bàn được tạo ra sẽ gắn liền với một mã Token định danh duy nhất.
  - Mã QR thực chất là một đường dẫn URL chứa các tham số: `https://ten-quan.qrtable.io?table_id=xyz&token=abc`.

- **Bảo mật QR (Security Rules):**

  ```
  Tạo Token:
    token = HMAC_SHA256(table_id + store_id + secret_key)

  Xác thực Token:
    IF HMAC_verify(table_id, token, secret_key) == false
    THEN return 403 "Mã QR không hợp lệ"
  ```

Cơ chế giới hạn tần suất (Rate Limiting - Chống spam):
Tối đa = 10 lần quét / bàn / 5 phút.
Hạn ngạch đơn hàng hiện tại = hạn ngạch đơn hàng hàng ngày của gói dịch vụ tenant (`max_orders_per_day`).
Cải tiến tương lai = tùy chọn giới hạn số lượng đơn hàng trên mỗi session.

     IF rate_limit_exceeded
     THEN return 429 "Quá nhiều yêu cầu, vui lòng đợi"

Thời gian chờ của session (Session Timeout):
IF last_activity > 30 phút AND order_count == 0
THEN auto_close_session()

- **Xuất bản QR:** Cho phép xuất tệp hình ảnh/PDF của các mã QR theo mẫu thiết kế để in ấn đồng bộ.

### C. Logic quản lý trạng thái bàn

**State Machine - Vòng đời trạng thái bàn:**

```
┌─────────────┐
│  Available  │ (Sẵn sàng đón khách)
└──────┬──────┘
       │ Khách quét QR → Tạo Session
       ▼
┌─────────────┐
│  Occupied   │ (Đang có khách ngồi)
└──────┬──────┘
       │ Khách yêu cầu thanh toán → Khóa đặt món
       ▼
┌─────────────┐
│   Billing   │ (Đang chờ thanh toán)
└──────┬──────┘
       │ Thanh toán hoàn tất
       ▼
┌─────────────┐
│  Cleaning   │ (Cần dọn dẹp)
└──────┬──────┘
       │ Nhân viên xác nhận dọn xong
       ▼
┌─────────────┐
│  Available  │ (Trở lại trạng thái ban đầu)
└─────────────┘
```

**Quy tắc nghiệp vụ chuyển đổi trạng thái:**

```yaml
Available → Occupied:
  Sự kiện: Khách quét QR lần đầu tiên
  Điều kiện: table_status == "Available"
  Hành động:
    - Tạo Session mới
    - Đặt table_status = "Occupied"
    - Đặt session_started_at = current_timestamp

Occupied → Available (Giải phóng Session trống an toàn):
  Sự kiện: Nhân viên giải phóng bàn có session bị trống/kẹt, hoặc hệ thống tự thu hồi khi khách vào bàn mới
  Điều kiện:
    - table_status == "Occupied"
    - session_id trùng khớp với Order session
    - order_count == 0
    - chưa có bill và chưa có đơn hàng nào được ghi nhận cho session đó
  Hành động:
    - Đóng Order session trống nếu nó đang hoạt động
    - Xóa các key Redis của session/cart liên quan
    - Đặt table_status = "Available"
    - Xóa trường session_id trên bàn

Occupied → Billing:
  Sự kiện: Khách hàng nhấn "Yêu cầu thanh toán"
  Điều kiện:
    - table_status == "Occupied"
    - Tồn tại ít nhất một món ăn có trạng thái: status == "Ready"
  Hành động:
    - Đặt table_status = "Billing"
    - Khóa tính năng gọi món qua QR (trả về lỗi "Bàn đang thanh toán")
    - Gửi thông báo cho nhân viên

Billing → Occupied (Hủy yêu cầu/Rollback):
  Sự kiện: Khách hoặc nhân viên hủy yêu cầu thanh toán
  Điều kiện:
    - table_status == "Billing"
    - payment_status != "Paid"
  Hành động:
    - Đặt table_status = "Occupied"
    - Mở lại tính năng gọi món qua QR

Billing → Cleaning:
  Sự kiện: Thanh toán hóa đơn thành công
  Điều kiện:
    - table_status == "Billing"
    - payment_status == "Paid"
  Hành động:
    - Đặt table_status = "Cleaning"
    - Đóng session
    - Lưu trữ lịch sử đơn hàng (archive)

Cleaning → Available:
  Sự kiện: Nhân viên bấm xác nhận "Đã dọn dẹp xong"
  Hành động:
    - Đặt table_status = "Available"
    - Xóa trường session_id
    - Sẵn sàng phục vụ lượt khách tiếp theo
```

### D. Quy tắc nghiệp vụ cốt lõi

- **Tính duy nhất:** Trong một nhà hàng không được phép có hai bàn trùng tên hoặc trùng ID.
- **Ràng buộc khi xóa:** Không được xóa bàn nếu bàn đó đang có đơn hàng ở trạng thái `Pending` hoặc `Active` (đang xử lý).
- **Chuyển bàn (Merge/Switch):** Cho phép nhân viên chuyển toàn bộ giỏ hàng/đơn hàng từ bàn cũ sang bàn mới và giải phóng trạng thái bàn cũ.
- **Giải phóng Session trống an toàn (Safe Empty Session Release):** Nhân viên chỉ có thể giải phóng bàn đang hoạt động khi Order chứng minh session đó trống: cùng tenant/table/session, số đơn hàng `orderCount == 0`, không có bill và không có đơn hàng nào được tạo. Đây không phải tính năng force-unlock tùy tiện.

  ```
  Logic chuyển bàn:
  Xác thực: Bàn đích phải ở trạng thái Available (Catalog); session hiện tại phải có đơn hàng hoặc bill (Order).
  ```

Luồng xử lý ở Step 2.4 (saga-style transfer lock — không có giao dịch ACID chéo giữa Order PG + Catalog PG + Redis):

- Khóa session + cập nhật đơn hàng/session trong Order DB.
- Gọi TCP Catalog: cập nhật `tables.status` và gán bàn mới.
- Cập nhật Redis: lưu thông tin meta của session/cart (`table_id`/hiển thị).
- Thực hiện cơ chế bù đắp (compensation) nếu bước trung gian thất bại; đồng bộ realtime qua BFF Direct (không cần đổi tên topic Kafka cho bàn).

- **Giới hạn gói dịch vụ:** Số lượng bàn tối đa được tạo bị giới hạn tùy thuộc vào gói dịch vụ đã mua của tenant.

---

## 4. LUỒNG ĐẶT MÓN CỦA KHÁCH HÀNG (CUSTOMER ORDERING FLOW)

Quy trình từ lúc khách hàng quét mã QR cho đến khi đơn đặt món được gửi xuống khu vực chế biến (bếp/bar).

### A. Quy trình nghiệp vụ chi tiết

1. **Khởi tạo Session:**
   - Khách hàng quét mã QR, giao diện Menu mở ra (Progressive Web App - PWA).
   - Hệ thống xác định `Store_ID`, `Table_ID` và kiểm tra tính hợp lệ của mã `Token`.
   - **Quản lý Session:**

     ```txt
     IF table_status == "Available"
     THEN tạo Session mới, liên kết bàn.session_id, và chuyển bàn sang Occupied

     IF table_status == "Occupied" nhưng session trống đã cũ hoặc đã đóng
     THEN Order giải phóng session/bàn trống đó an toàn và tạo một Session mới hoàn toàn

     IF table_status == "Occupied" và session hiện tại vẫn hợp lệ
     THEN cho khách tham gia vào Session hiện tại (Shared Cart - giỏ hàng dùng chung)

     IF table_status == "Billing" hoặc table_status == "Cleaning"
     THEN khóa tính năng đặt món và hiển thị thông báo chờ phù hợp
     ```

   - **Logic Giỏ hàng dùng chung (Shared Cart):** Tất cả khách hàng cùng quét QR tại một bàn (trong cùng một Session) sẽ cùng nhìn thấy một giỏ hàng thời gian thực và có thể cùng thêm/bớt món ăn.

2. **Chọn món:**
   - Khách duyệt thực đơn theo danh mục, kiểm tra trạng thái món ăn `Available`/`Out of Stock` thời gian thực.
   - Bấm chọn món → Hiển thị chi tiết (Ảnh lớn, Mô tả, Giá tiền).
   - Chọn số lượng → Bấm "Thêm vào giỏ".

3. **Quản lý giỏ hàng:**
   - Xem danh sách các món đã chọn: Tên món, số lượng, giá bán, tổng tiền.
   - **Chỉnh sửa:** Tăng/giảm số lượng, xóa món khỏi giỏ, ghi chú thêm cho món (Ví dụ: "Không cay", "Ít muối").
   - **Tính tổng tiền:** Tổng tiền giỏ hàng = Σ(Đơn giá × Số lượng).

4. **Gửi đơn đặt món (Order Submission):**
   - Khách bấm "Đặt món". Trạng thái đơn hàng chuyển sang `Pending` (Chờ xác nhận).
   - Hệ thống phát tín hiệu thông báo (âm thanh/rung) tức thời đến thiết bị của nhân viên tại quầy/POS.

5. **Xác nhận & Điều phối (Confirm & Routing):**
   - Nhân viên kiểm tra đơn hàng trên POS và bấm "Xác nhận".
   - Đơn hàng chuyển sang trạng thái `Processing` (Đang chế biến).
   - **Điều phối bếp/bar:** Hệ thống tự động phân loại món ăn: Món ăn -> chuyển xuống màn hình Bếp; Đồ uống -> chuyển xuống màn hình Quầy pha chế (Bar).
   - Tự động in phiếu chế biến (KOT) nếu có kết nối máy in hóa đơn.

6. **Theo dõi đơn hàng:**
   - Trên giao diện khách hàng, trạng thái được cập nhật trực tiếp: "Đã gửi" -> "Đang chế biến" -> "Món ăn đã sẵn sàng".
   - Khách hàng có thể tiếp tục đặt thêm món mới (Additional Order) mà không ảnh hưởng đến các đơn hàng trước đó.

### B. Quy tắc nghiệp vụ cốt lõi

- **Khóa gọi món:**

  ```
  IF table_status == "Billing"
  THEN vô hiệu hóa nút "Đặt món"
  AND hiển thị thông báo "Bàn đang thanh toán, không thể đặt thêm món"
  ```

- **Xử lý tồn kho đồng thời / Quy trình xác nhận đơn hàng (Order Confirm Saga):**

  ```
  Gửi đơn (Khách hàng): Chỉ kiểm tra nhanh số lượng tồn kho trên cache — CHƯA trừ trực tiếp trong kho.

  Xác nhận đơn (Nhân viên, PENDING → PROCESSING):
  Lớp OrderConfirmSagaService sẽ điều phối luồng này.
  Catalog service (nơi sở hữu danh mục món ăn và lượng tồn kho dự phòng stock_reservations):
  thực hiện lock bản ghi reservation và menu tương ứng, ghi nhận hash/kết quả/phiên bản của yêu cầu,
  sau đó trừ kho trong một transaction của Catalog (giao tiếp qua giao thức TCP — Order service không được tự ý UPDATE DB Catalog trực tiếp).
  Nếu thao tác xác nhận bị lặp lại với cùng tenant/đơn hàng/payload key, hệ thống trả về kết quả đã lưu mà không trừ kho thêm lần nữa.
  Order service: Lưu lại phiên bản reservation đã phản hồi kèm trạng thái đơn hàng/món ăn và kích hoạt outbox event `order.confirmed` gửi lên Kafka.
  Nếu Catalog đã xác nhận trừ kho thành công nhưng bước lưu đơn hàng/outbox của Order thất bại, Order sẽ gửi lệnh giải phóng (release) đúng phiên bản reservation đó.
  Nếu thực hiện reconfirm sau khi đã release, hệ thống sẽ tăng số phiên bản (increment version); các bản release cũ hơn sẽ bị coi là hết hạn (stale) và không thể hoàn lại kho.
  ```

  Nếu phản hồi từ Catalog bị mất sau khi đã commit, đơn hàng trong Order service vẫn giữ trạng thái `PENDING`. Việc thử lại (retry) thao tác xác nhận từ nhân viên sẽ khôi phục thông qua bản ghi Catalog reservation đã lưu. Hệ thống không tự động quét dọn nếu không có yêu cầu thử lại.

  Nếu không đủ số lượng món tồn kho → Trả về lỗi có cấu trúc cho nhân viên (đơn đặt món trước đó của khách vẫn ở trạng thái chờ xác nhận).

  Về hiển thị thực đơn/tồn kho: Catalog/BFF thực hiện giải phóng cache theo luồng ghi (write path); không duy trì đồng bộ menu thời gian thực qua WebSocket.

- **Thời gian hệ thống:** Mọi mốc thời gian phải sử dụng `server_timestamp` (giờ chuẩn UTC của máy chủ), không dùng giờ trên thiết bị của khách hàng (`client_timestamp`).

- **Đơn hàng tích lũy:** Các đơn đặt món thêm trong cùng một Session sẽ được gộp chung vào một Hóa đơn duy nhất khi thanh toán.

- **Yêu cầu nhân viên xác nhận:** Tất cả các đơn hàng bắt buộc phải đi qua trạng thái `Pending` -> có nhân viên bấm xác nhận -> mới chuyển sang `Processing`, nhằm tránh các đơn hàng ảo/spam từ khách hàng quét QR phá hoại.

- **Khách hàng tự hủy đơn:**

  ```
  IF order_status == "Pending" và chưa có nhân viên xác nhận (confirmed == false)
  THEN cho phép khách hàng tự hủy đơn trên giao diện (Soft delete, giữ log phục vụ đối soát)

  IF order_status thuộc nhóm ["Processing", "Ready"]
  THEN ẩn nút hủy món đối với khách hàng
  AND bắt buộc phải có tài khoản Manager/Owner phê duyệt mới được hủy
  ```

---

## 5. LUỒNG CHẾ BIẾN & ĐIỀU PHỐI BẾP (KITCHEN/KDS FLOW)

Bắt đầu từ khi nhân viên xác nhận đơn hàng và kết thúc khi món ăn được chế biến xong.

### A. Quy trình nghiệp vụ chi tiết

1. **Nhận đơn và Phân chia khu vực (Ticket Routing):**
   - Tự động tách đơn: Chia món ăn và đồ uống về hai màn hình chuyên biệt: Bếp (Kitchen Screen) và Pha chế (Bar Screen).
   - Mỗi đơn chế biến hiển thị dưới dạng một thẻ điện tử (Ticket), hiển thị rõ: Số bàn, tên món, ghi chú của khách và thời gian chờ.

2. **Nhận chế biến (Acknowledging):**
   - **Trạng thái chờ:** Thẻ món mới hiển thị màu nổi bật để gây chú ý (Đỏ/Vàng).
   - **Chế biến:** Đầu bếp bấm vào thẻ để xác nhận "Đang làm món này", giúp các đầu bếp khác tránh làm trùng món.

3. **Chế biến theo yêu cầu:**
   - Đầu bếp xem rõ các yêu cầu về gia vị (Modifiers) hoặc Ghi chú của khách hàng.
   - **Không gộp món chế biến (No batching):** KDS hiển thị các thẻ/món ăn theo thứ tự ghi nhận trên database; không tự động gom số lượng món giống nhau của các bàn khác nhau, không có hàng đợi gộp hay API gom đơn. Giỏ hàng trước khi gửi của cùng một bàn vẫn có thể gộp chung dòng nếu cùng món và ghi chú.

4. **Chế biến xong (Ready to Serve):**
   - Đầu bếp bấm xác nhận "Xong/Hoàn tất". Thẻ món ăn biến mất khỏi màn hình bếp.
   - **Kích hoạt thông báo (Ping):** Hệ thống lập tức gửi thông báo đến thiết bị của nhân viên phục vụ: "Bàn 05 - Phở bò đã làm xong".

5. **Thu hồi lệnh sai (Recall Logic):**
   - Cho phép đầu bếp thu hồi lại các thẻ món ăn vừa lỡ tay bấm "Xong" để đưa trở lại hàng đợi chế biến.

### B. Quy tắc nghiệp vụ cốt lõi

- **FIFO (First In - First Out):** Đơn hàng nào được xác nhận trước phải hiển thị trước để chế biến trước.
- **Cảnh báo trễ (SLA Warning):** Các đơn món ăn chưa làm xong quá X phút phải tự động đổi màu/nhấp nháy để cảnh báo quá tải hoặc quên đơn.
- **Đồng bộ trạng thái:** WebSocket đóng vai trò gửi tín hiệu cập nhật tức thời; các màn hình KDS/PWA/POS phải thực hiện refetch lại snapshot REST để đảm bảo tính chính xác sau khi có thay đổi trạng thái, khi kết nối lại hoặc khi mất sự kiện. Order service luôn là nguồn thông tin gốc (source of truth) cho trạng thái hiển thị của khách hàng.
- **Món ưu tiên (Priority):** Cho phép đánh dấu bàn hoặc món ăn ở chế độ "Ưu tiên" để tự động đẩy lên đầu danh sách chế biến của KDS.

---

## 6. LUỒNG THANH TOÁN & ĐỐI SOÁT (PAYMENT & RECONCILIATION)

Đảm bảo mọi dịch vụ được chuyển đổi thành doanh thu chính xác và được ghi nhận đầy đủ.

### A. Quy trình nghiệp vụ chi tiết

1. **Yêu cầu thanh toán:**
   - Khách bấm nút "Thanh toán" trên ứng dụng -> Hệ thống gửi cảnh báo (Alert) đến màn hình POS/Tablet của nhân viên phục vụ.
   - **Khóa bàn:** Bàn chuyển sang trạng thái `Billing`, khách hàng không thể gọi thêm món mới.

2. **Kiểm tra & Gộp hóa đơn (Final Review):**
   - Nhân viên kiểm tra danh sách món ăn, số lượng và tổng tiền.
   - **Công thức tính tiền đơn giản:**
     ```
     Subtotal = Σ(Giá món × Số lượng)
     Total = Subtotal
     ```
   - **Ràng buộc trạng thái:** Chỉ cho phép chuyển sang trạng thái Billing khi tất cả món ăn trong session đã được xử lý xong (trạng thái `Ready` hoặc đã phục vụ).

3. **Thực hiện thanh toán:**
   - **Thanh toán Tiền mặt (Cash):**
     ```
     Nhân viên nhập số tiền khách đưa
     Hệ thống tính tiền thừa = Tiền nhận - Tổng tiền hóa đơn
     Nhân viên bấm xác nhận "Đã thu tiền"
     → payment_status = "Paid", payment_method = "Cash"
     ```
   - **Thanh toán Chuyển khoản (VietQR qua SePay):**

     ```
     Hệ thống tự động tạo mã QR VietQR (qua SePay) với các tham số:
     - Số tiền = bill.roundedTotal (Số tiền VND đã được làm tròn đến hàng nghìn đồng)
     - Nội dung chuyển khoản chứa mã billReference cố định dạng:
       "QRTBL" + 8 ký tự đầu tiên của billId sau khi loại bỏ dấu gạch ngang (UUID)

     Khách quét mã QR và thực hiện chuyển khoản từ ứng dụng ngân hàng

     Webhook SePay truyền tín hiệu về → BFF → Payment service khớp mã billReference (qua mã hoặc regex tìm trong nội dung):
     - Nếu số tiền thanh toán < roundedTotal: giữ nguyên trạng thái PENDING của hóa đơn, ghi nhận nhật ký lỗi SEPAY_WEBHOOK_UNDERPAID
     - Nếu số tiền thanh toán >= roundedTotal: chuyển payment_status = "Paid"; ghi nhận số tiền đã nhận thực tế (paidAmount = số tiền thực tế nhận được)
       (chấp nhận trường hợp chuyển thừa tiền; không tự động trả lại phần tiền thừa)
     ```

   > **Lưu ý kiến trúc (05-2026):** Thanh toán chuyển khoản được xử lý qua **SePay + Dynamic VietQR** — mã QR được hiển thị trực tiếp trên màn hình POS/PWA của khách (không chuyển hướng trang). Luồng webhook trực tiếp của Phase 3 hiện tại thực hiện kiểm tra HMAC trên raw-body headers; luồng phân phối theo tenant/platform của Phase 4B sử dụng khóa bí mật cấu hình riêng `x-secret-key` và cần kiểm tra kỹ giá trị khóa trước khi vận hành thực tế. Xem thêm chi tiết tại [technical-architecture.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/technical-architecture.md) §6.2.7 và tài liệu phase [phase-3-payment.md](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/phases/phase-3-payment.md).

4. **In hóa đơn & Giải phóng bàn (Closing):**
   - In hóa đơn giấy cho khách.
   - **Sau khi thanh toán thành công:** Theo vòng đời trạng thái bàn, bàn chuyển từ `Billing` → `Cleaning`; nhân viên sau đó dọn dẹp xong bấm xác nhận để chuyển `Cleaning` → `Available`. Không chuyển thẳng từ Billing về Available ngay khi tính tiền xong.

5. **Đối soát tài chính:**
   - Cuối ngày hoặc cuối tháng, hệ thống tổng hợp báo cáo doanh thu theo từng phương thức thanh toán (Tiền mặt, Chuyển khoản...).
   - Chủ nhà hàng thực hiện đối chiếu số dư tài khoản ngân hàng/két tiền mặt thực tế với báo cáo ghi nhận trên hệ thống QRTable.

6. **Dashboard & Báo cáo:**
   - Owner và Manager sử dụng màn hình `/dashboard` để xem báo cáo trong phạm vi tenant khi có quyền `report.read_own`.
   - Quyền truy cập API báo cáo của tenant yêu cầu gói subscription hiện tại phải ở trạng thái `ACTIVE` và bao gồm tính năng nâng cao `analytics_basic`.
   - Tenant sử dụng gói `FREE` vẫn nhìn thấy giao diện dashboard chung, thông tin gói dịch vụ, hạn ngạch sử dụng và các nút gợi ý nâng cấp gói, nhưng các phần hiển thị dữ liệu báo cáo/phân tích (analytics widgets) sẽ bị khóa.
   - Tenant sử dụng gói `BASIC` được xem các phân tích cơ bản về doanh thu/đơn hàng/bàn ăn. Các widget báo cáo chuyên sâu sẽ bị khóa giao diện.
   - Tenant sử dụng gói `PREMIUM` được mở khóa toàn bộ tính năng phân tích nâng cao, bao gồm cả thống kê món bán chạy và chi tiết các kênh thanh toán.
   - Super Admin sử dụng màn hình `/admin/analytics` để theo dõi báo cáo doanh thu subscription toàn nền tảng và kiểm tra chi tiết từng tenant thông qua quyền `report.read_any`. Quyền báo cáo của Super Admin không bị giới hạn bởi gói dịch vụ của tenant được chọn, tuy nhiên giao diện vẫn hiển thị thông tin gói hiện tại của tenant đó để hỗ trợ kiểm tra đối soát.

### B. Quy tắc nghiệp vụ cốt lõi

- **Tính bất biến (Immutability):**

  ```
  IF bill_status == "Completed" và payment_status == "Paid"
  THEN khóa toàn bộ tính năng chỉnh sửa hóa đơn hay đơn hàng liên quan
  (Các nghiệp vụ điều chỉnh sau thanh toán hoặc hoàn tiền - refund nằm ngoài phạm vi thực hiện của đồ án này.)
  ```

- **Làm tròn tiền:** Bắt buộc làm tròn số tiền thanh toán lên đến hàng nghìn đồng (VND). Ví dụ: 127,500 VND phải làm tròn thành 128,000 VND.

- **Yêu cầu lưu nhật ký đối soát (Audit Log):**

  ```
  IF bill_status chuyển sang trạng thái "Canceled" (Hủy) mà có bất kỳ món ăn nào đang ở trạng thái ["Processing", "Ready"]
  THEN bắt buộc ghi nhận: - người hủy (user_id) - lý do hủy (text) - thời điểm hủy (timestamp)
  AND lưu trữ thông tin này vào bảng audit_trail để đối soát
  ```

- **Khóa yêu cầu thanh toán khi chưa chế biến xong:**

  ```
  IF tồn tại món ăn trong đơn hàng có trạng thái thuộc nhóm ["Pending", "Processing"]
  THEN vô hiệu hóa nút "Yêu cầu thanh toán" trên màn hình của khách
  AND hiển thị cảnh báo "Còn món ăn chưa làm xong"
  ```

---

## 7. XỬ LÝ KHI MẤT KẾT NỐI & TỰ KHÔI PHỤC (OFFLINE HANDLING)

Đảm bảo hệ thống vận hành ổn định ngay cả trong điều kiện mạng chập chờn.

### A. Kịch bản mất kết nối - Phía khách hàng (Client PWA)

```yaml
Kịch bản 1: Khách hàng quét QR khi thiết bị không có mạng
  Phát hiện: navigator.onLine == false
  Xử lý:
    - Hiển thị thông báo "Không có kết nối mạng"
    - Tải thực đơn từ bộ nhớ đệm (nếu đã từng truy cập trước đó)
    - Vô hiệu hóa nút "Thêm vào giỏ"
    - Hiển thị thông báo "Chế độ xem thực đơn offline, không thể đặt món"

Kịch bản 2: Mất kết nối mạng khi đang xem thực đơn
  Phát hiện: Sự kiện mất kết nối của WebSocket
  Xử lý:
    - Hiển thị banner cảnh báo "Mất kết nối mạng, đang thử kết nối lại..."
    - Thực hiện kết nối lại tự động với thời gian giãn cách tăng dần (2s, 4s, 8s...)
    - Lưu giữ giỏ hàng trong LocalStorage
    - Khóa nút gửi đơn đặt món

Kịch bản 3: Mất mạng đúng lúc đang bấm gửi đơn đặt món
  Phát hiện: Yêu cầu HTTP bị quá thời gian (timeout) hoặc báo lỗi mạng
  Xử lý:
    - Hiển thị lỗi "Không thể gửi đơn hàng, vui lòng kiểm tra lại kết nối"
    - Lưu tạm đơn hàng vào hàng đợi trên IndexedDB
    - Khi có mạng trở lại → Tự động gửi lại đơn hàng từ hàng đợi
    - Hiển thị trạng thái "Đang đồng bộ đơn hàng..."
```

### B. Kịch bản mất kết nối - Phía nhân viên (POS/KDS)

```yaml
Kịch bản 1: POS mất mạng khi nhân viên bấm xác nhận đơn hàng
  Xử lý:
    - Đưa hành động xác nhận vào hàng đợi lưu trữ cục bộ
    - Hiển thị thông báo "Đang ngoại tuyến — Hệ thống sẽ đồng bộ khi có mạng trở lại"
    - Lưu trữ hành động vào hàng đợi nội bộ kèm mốc thời gian
    - Tự động đồng bộ lại khi kết nối lại thành công
    - Sử dụng mã idempotency key để tránh việc xác nhận bị trùng lặp trên server

Kịch bản 2: Màn hình bếp KDS mất kết nối mạng
  Xử lý:
    - Tiếp tục hiển thị danh sách món đang chế biến từ bộ nhớ đệm (cache)
    - Lưu tạm các hành động đổi trạng thái (Đang làm/Xong món) vào hàng đợi cục bộ
    - Hiển thị biểu tượng cảnh báo offline trên màn hình bếp
    - Tự động đồng bộ dữ liệu khi mạng hoạt động trở lại
    - Giải quyết xung đột dữ liệu: Ưu tiên dữ liệu trên Server (Server state wins)

Kịch bản 3: Thiết bị thanh toán bị mất kết nối mạng
  Xử lý:
    - Chỉ cho phép chọn hình thức thanh toán bằng Tiền mặt
    - Khóa tính năng tạo mã chuyển khoản VietQR tự động
    - Lưu tạm thông tin thanh toán vào hàng đợi
    - Nhân viên đối soát thủ công khi thiết bị online trở lại
```

### C. Chiến lược đồng bộ hóa dữ liệu (Sync Strategy)

```typescript
Quy tắc giải quyết xung đột (Conflict Resolution):
  IF local_timestamp < server_timestamp THEN
    server_state_wins()       // Dữ liệu trên server là chuẩn
    discard_local_changes()   // Bỏ dữ liệu tạm ở máy cục bộ
    notify_user("Dữ liệu đã được cập nhật từ máy chủ")

  IF action == "order_submission" THEN
    use_idempotency_key(order_id + session_id) // Sử dụng khóa trùng lặp
    prevent_duplicate_order()                  // Chặn tạo đơn hàng trùng nhau

Chính sách gửi lại (Retry Policy):
  max_retries = 3
  backoff = cơ chế giãn cách số mũ (2^n giây)

  IF retry_count > max_retries THEN
    show_error("Không thể đồng bộ dữ liệu, vui lòng liên hệ quản trị viên")
    log_to_error_tracking()
```

---

## 8. SƠ ĐỒ TRẠNG THÁI - VÒNG ĐỜI ĐƠN HÀNG (ORDER STATE MACHINE)

Quản lý các bước chuyển đổi trạng thái của đơn hàng từ lúc khởi tạo đến khi hoàn tất.

> **Quy tắc canonical:** Phân chia sở hữu dịch vụ, yêu cầu bill tường minh, luồng chuyển bàn và phân quyền hủy đơn trong phần này phải được đối chiếu với `technical-architecture.md`, `architecture/permission-matrix.md`, phase record liên quan và code/test hiện tại. Không có tài liệu spec tách rời nào thay thế các nguồn đó.

> **Quy ước đặt tên Enum:** Sơ đồ và quy tắc dưới đây sử dụng định dạng **Title Case** (`Draft`, `Pending`, `Processing`, `Ready`, `Served`, `Completed`, `Canceled`) để dễ đọc. Các giá trị Enum thực tế trong code (canonical) phải viết chữ **IN HOA** (`DRAFT`, `PENDING`, ...) — xem chi tiết tại `libs/shared/types/src/lib/order.types.ts` và tài liệu phase `docs/phases/phase-2a-order-kafka.md` Step 2.3. Quy đổi tương ứng 1-1 (Ví dụ: `Draft` ↔ `DRAFT`).

### A. Sơ đồ trạng thái đơn hàng (Order State Diagram)

```
┌──────────┐
│  Draft   │ (Khách đang chọn món vào giỏ, chưa bấm gửi đơn)
└────┬─────┘
     │ Khách bấm đặt món (Submit)
     ▼
┌──────────┐
│ Pending  │ (Chờ nhân viên xác nhận)
└────┬─────┘
     │ Nhân viên bấm xác nhận
     ├─────────────── Hủy đơn (nếu chưa xác nhận) → Canceled
     ▼
┌────────────┐
│ Processing │ (Đang chế biến dưới bếp/bar)
└─────┬──────┘
      │ Đầu bếp báo làm xong
      ├────────────── Hủy đơn (yêu cầu quyền quản lý phê duyệt) → Canceled
      ▼
┌──────────┐
│  Ready   │ (Món ăn đã xong, chờ bê ra bàn)
└────┬─────┘
     │ Nhân viên xác nhận đã phục vụ tại bàn
     ▼
┌──────────┐
│  Served  │ (Món ăn đã lên bàn cho khách dùng)
└────┬─────┘
     │ Hóa đơn được thanh toán thành công
     ▼
┌────────────┐
│ Completed  │ (Hóa đơn hoàn tất, đóng băng dữ liệu)
└────────────┘
```

### B. Quy tắc chuyển đổi trạng thái

```yaml
Draft → Pending:
  Sự kiện: Khách hàng nhấn nút "Đặt món"
  Xác thực:
    - Số lượng món trong giỏ (cart_items.length) > 0
    - Tất cả các món ăn phải ở trạng thái "Available" (còn món)
  Hành động:
    - Tạo bản ghi đơn hàng mới (bắt đầu lưu vào DB từ PENDING — trạng thái Draft chỉ nằm trên thiết bị khách, chưa lưu DB)
    - Nếu là lượt đặt đầu tiên của session: tự động tạo một hóa đơn mở (`OPEN` bill) nếu chưa có (Step 2.4)
    - Phát thông báo cho nhân viên phục vụ (âm thanh + push notification)
    - Xóa sạch giỏ hàng tạm sau khi gửi thành công

Draft → Canceled:
  Sự kiện: Khách đóng trình duyệt / xóa giỏ hàng / bấm dọn giỏ hàng chủ động
  Tác nhân: Khách hàng tự thực hiện
  Điều kiện:
    - Giỏ hàng chưa từng được gửi đi (chưa tồn tại bản ghi đơn hàng trên hệ thống)
  Hành động:
    - Xóa key giỏ hàng trên Redis (hết hạn TTL hoặc lệnh DEL chủ động)
    - KHÔNG tạo bản ghi đơn hàng trong DB (không có gì để hủy trên hệ thống)
  Lưu ý: Bước chuyển đổi này không lưu lịch sử vào DB do Draft chưa tạo bản ghi; hệ thống kiểm tra logic qua hàm ALLOWED_ORDER_TRANSITIONS để phía Frontend khóa nút "Đặt" và phía Backend từ chối xử lý lại nếu giỏ hàng trống.

Pending → Processing:
  Sự kiện: Nhân viên bấm nút "Xác nhận" đơn hàng
  Tác nhân: Nhân viên phục vụ (Staff), Quản lý (Manager) (Phân quyền chi tiết xem tại permission-matrix §6 / §6.1)
  Xác thực:
    - Trạng thái đơn hàng hiện tại phải là "Pending"
    - Gọi TCP Catalog: Xác nhận kho Catalog vẫn còn đủ số lượng tại thời điểm bấm duyệt đơn
  Hành động:
    - Catalog thực hiện trừ tồn kho trong DB của Catalog
    - Ghi nhận phiên bản lưu kho (Catalog reservation version) lên đơn hàng
    - Cập nhật trạng thái đơn hàng = "Processing"
    - Đẩy đơn xuống hàng đợi KDS (gửi sự kiện Kafka `order.confirmed` + phân trạm theo cấu hình món `MenuItem.station`)
    - In phiếu chế biến (KOT) nếu có kết nối máy in
  Cơ chế bù đắp (Compensation):
    - Nếu Catalog đã trừ kho thành công nhưng luồng ghi đơn hàng/outbox của Order bị lỗi, hệ thống tự động gọi lệnh hủy để hoàn lại lượng kho của đúng phiên bản reservation đó.

Pending → Canceled:
  Sự kiện: Khách tự hủy đơn hoặc nhân viên từ chối nhận đơn
  Tác nhân: Khách hàng tự hủy, Nhân viên phục vụ từ chối (`order.cancel_pending`), Quản lý
  Điều kiện:
    - Trạng thái đơn hàng phải là "Pending"
    - Đơn hàng chưa được xác nhận (confirmed == false)
  Hành động:
    - Cập nhật trạng thái đơn hàng = "Canceled"
    - Ghi nhận lý do hủy/người thực hiện/thời điểm hủy vào bản ghi đơn hàng
    - Không cần hoàn kho (do đơn hàng chờ xác nhận chưa thực hiện trừ kho thực tế — theo đặc tả Step 2.4 Q2)
    - Gửi thông báo cập nhật cho khách hàng

Processing → Canceled:
  Sự kiện: Quản lý hoặc Chủ nhà hàng bấm hủy đơn khi đang chế biến; có tùy chọn hoàn kho qua Catalog
  Tác nhân: Quản lý hoặc Chủ nhà hàng (`order.cancel_processing`)
  Điều kiện:
    - Trạng thái đơn hàng phải là "Processing"
    - Bắt buộc phải điền lý do hủy
  Hành động:
    - Cập nhật trạng thái đơn hàng = "Canceled"
    - Ghi nhận lý do hủy/người thực hiện/thời điểm hủy vào bản ghi đơn hàng
    - Phát thông báo yêu cầu bếp ngừng chế biến món này
    - Thực hiện hoàn lại kho (restore kho) thông qua Catalog dựa trên mã phiên bản lưu kho `stock_reservation_version` (các đơn hàng cũ trước khi chạy hệ thống phiên bản sẽ dùng luồng tương thích ngược một lần duy nhất với giá trị null)
    - Tạo bản ghi outbox tối giản `order.status_changed` để phục vụ đồng bộ trạng thái/audit bền vững
    - Đánh dấu loại bỏ đơn hàng này khỏi các báo cáo doanh thu

Processing → Ready:
  Sự kiện: Đầu bếp bấm xác nhận đã chế biến xong
  Tác nhân: Nhân viên bếp/bar
  Hành động:
    - Cập nhật trạng thái đơn hàng = "Ready"
    - Gửi tín hiệu thông báo đến nhân viên phục vụ (ping)
    - Hiển thị đơn hàng trên màn hình "Chờ phục vụ"

Ready → Served:
  Sự kiện: Nhân viên phục vụ xác nhận đã mang món ra bàn
  Tác nhân: Nhân viên phục vụ
  Hành động:
    - Cập nhật trạng thái đơn hàng = "Served"
    - Loại bỏ đơn hàng khỏi màn hình hiển thị của bếp
    - Mở quyền yêu cầu thanh toán cho bàn

Served → Completed:
  Sự kiện: Hóa đơn được thanh toán thành công (Phase 3)
  Điều kiện:
    - Trạng thái thanh toán của hóa đơn phải là payment_status == "Paid"
    - Hóa đơn chuẩn: trạng thái hóa đơn `BillStatus` là **PAID** (nghĩa là chu kỳ thanh toán đã kết thúc)
  Hành động:
    - Cập nhật trạng thái đơn hàng = "Completed"
    - Chuyển đơn hàng vào chế độ lưu trữ chỉ đọc (archive)
    - Ghi nhận doanh thu thực tế vào báo cáo
```

---

## 9. CẤP ĐỘ PHÂN QUYỀN & QUYỀN HẠN CỦA CÁC TÁC NHÂN

Định nghĩa rõ ràng vai trò và quyền hạn của từng tài khoản trong hệ thống SaaS Multi-tenant.

> **Kiến trúc phân quyền:** Mô tả theo **nhóm vai trò (ngôn ngữ nghiệp vụ)**; ma trận RBAC kiểm tra trong code (gồm 6 vai trò × 62 quyền hạn cụ thể) được chuẩn hóa tại tài liệu [permission matrix](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/architecture/permission-matrix.md) §6.

> **Điều hướng trên ứng dụng quản trị:** Màn hình `management-app` (Phase 2.x) điều hướng **vai trò → tab/route** để tối ưu trải nghiệm người dùng (UX); tuy nhiên **BFF** vẫn bắt buộc kiểm tra **quyền cụ thể (permission)** trên từng API endpoint. Xem thêm tại [permission matrix](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/architecture/permission-matrix.md) §9 (về nguyên tắc đồng bộ và nợ kỹ thuật).

### A. Danh sách các vai trò và Quyền hạn

#### **1. Super Admin (Quản trị viên toàn hệ thống)**

**Phạm vi:** Toàn bộ nền tảng QRTable (Cross-tenant - Đa nhà hàng)

- **Vai trò:** Quản trị viên cấp cao nhất của hệ thống SaaS
- **Quyền hạn cốt lõi:**
  - Quản lý các nhà hàng tenant: Duyệt mới / Tạm khóa hoạt động / Xóa bỏ thông tin nhà hàng.
  - Quản lý các Gói dịch vụ (Pricing Plans): Tạo mới / Chỉnh sửa các gói dịch vụ (Lite, Pro, Enterprise).
  - Giám sát toàn bộ hoạt động hệ thống: Xem tổng doanh thu subscription, theo dõi số lượng nhà hàng hoạt động, tỷ lệ sử dụng các gói dịch vụ và đối soát hóa đơn subscription.
  - Được quyền truy cập sâu xem chi tiết báo cáo riêng của từng tenant để phục vụ công tác hỗ trợ hoặc thanh tra hệ thống.
  - Cấu hình hệ thống: Thiết lập cổng thanh toán chung, cấu hình các tham số vận hành của nền tảng.
  - Xem toàn bộ dữ liệu hệ thống (phục vụ mục đích debug và hỗ trợ kỹ thuật).

**Ánh xạ microservice:** Authorizer service, User-Access service, SaaS service.

---

#### **2. Restaurant Owner (Chủ nhà hàng / Merchant Admin)**

**Phạm vi:** Chỉ trong phạm vi các nhà hàng (tenant) do mình sở hữu

- **Vai trò:** Người quản lý cao nhất của một nhà hàng — có toàn quyền quyết định về vận hành và nhân sự (bao gồm cả việc xóa nhân viên).
- **Vai trò trong Keycloak:** `Owner`
- **Quyền hạn cụ thể:** Toàn bộ quyền vận hành nhà hàng (thao tác CRUD đối với thực đơn, quản lý bàn, quản lý đơn hàng, thanh toán, màn hình bếp KDS), quản lý nhân sự bao gồm xóa nhân viên (`user.delete`), kiểm tra tình trạng gói dịch vụ và thanh toán hóa đơn với hệ thống (`subscription.checkout`), cập nhật cấu hình cổng thanh toán SePay cá nhân (`payment_settings.update_own`), và xem báo cáo phân tích số liệu của nhà hàng (`report.read_own`, bị giới hạn theo tính năng của gói dịch vụ đã mua).

**Ánh xạ microservice:** User-Access service, Catalog service, Order service, Payment service, SaaS service.

---

#### **3. Manager (Quản lý cửa hàng)**

**Phạm vi:** Chỉ trong phạm vi nhà hàng (tenant) được phân công điều hành

- **Vai trò:** Người quản lý ca làm việc — hỗ trợ điều hành các hoạt động của nhà hàng tương tự như chủ nhà hàng, nhưng không có các quyền hạn nhạy cảm về tài chính hay thay đổi cấu hình hệ thống.
- **Vai trò trong Keycloak:** `MANAGER`
- **Điểm khác biệt so với Owner:** Không thể tự ý xóa tài khoản nhân viên khác, không có quyền đăng ký thanh toán/hủy gói dịch vụ với platform, không thể sửa đổi cấu hình liên kết SePay/tài khoản ngân hàng của cửa hàng; tuy nhiên được phép xem thông tin gói dịch vụ hiện tại, xem cấu hình thanh toán và xem báo cáo doanh thu của nhà hàng (`report.read_own`, bị giới hạn theo tính năng gói dịch vụ).

**Ánh xạ microservice:** Tương tự như Owner đối với các hoạt động vận hành thường nhật, kèm quyền xem cấu hình SaaS/cổng thanh toán trong phạm vi tenant.

---

#### **4. Staff (Nhân viên nhà hàng)**

**Phạm vi:** Chỉ trong phạm vi nhà hàng (tenant) được thuê làm việc

- **Vai trò:** Nhân viên vận hành trực tiếp
- **Các nhóm nhân viên cụ thể:**
  - **Nhân viên phục vụ (Waiter/Server)**: Xác nhận đơn đặt món, hỗ trợ thanh toán cho khách, thực hiện chuyển bàn.
  - **Đầu bếp (Chef)**: Xem danh sách món ăn và cập nhật trạng thái chế biến trên màn hình bếp.
  - **Nhân viên pha chế (Barista/Bartender)**: Xem danh sách đồ uống và cập nhật trạng thái chế biến trên màn hình quầy bar.
- **Quyền hạn cốt lõi:**
  - Xác nhận đơn đặt món mới gửi từ khách hàng.
  - Cập nhật trạng thái chế biến món ăn (Pending → Processing → Ready).
  - Thực hiện thanh toán (Tiền mặt hoặc kiểm tra trạng thái chuyển khoản).
  - Hỗ trợ thao tác chuyển bàn.
  - Xác nhận bàn đã dọn dẹp sạch sẽ (Cleaning → Available).
  - Hủy các đơn hàng chưa xác nhận (chỉ khi đơn ở trạng thái Pending).
  - **KHÔNG ĐƯỢC PHÉP:** Chỉnh sửa thực đơn, xem báo cáo doanh thu bán hàng, quản lý danh sách nhân viên khác.

**Ánh xạ microservice:** Order service, Kitchen service, Payment service.

---

#### **5. Customer (Khách hàng dùng bữa)**

**Phạm vi:** Chỉ trong phạm vi Session hoạt động tại Bàn ăn của mình

- **Vai trò:** Khách hàng trực tiếp sử dụng dịch vụ tại nhà hàng
- **Đặc trưng:** KHÔNG CẦN đăng nhập tài khoản (Guest checkout) để tối ưu hóa trải nghiệm sử dụng (UX).
- **Quyền hạn cốt lõi:**
  - Quét mã QR tại bàn để truy cập vào thực đơn điện tử (Digital Menu).
  - Xem danh sách món ăn, giá tiền, hình ảnh món.
  - Đặt món ăn qua mã QR (Thêm món vào giỏ hàng chung, gửi đơn đặt món).
  - Theo dõi trạng thái đơn hàng thời gian thực.
  - Ghi chú thêm yêu cầu chế biến cho từng món ăn.
  - Gửi yêu cầu thanh toán (yêu cầu xuất hóa đơn).
  - Tự hủy các đơn hàng do mình gửi khi chưa được nhân viên xác nhận.
  - **KHÔNG ĐƯỢC PHÉP:** Xem đơn đặt món của các bàn khác, xem giá nhập/giá gốc của món ăn, xem báo cáo doanh thu cửa hàng.

**Ánh xạ microservice:** Order service, Menu service.

---

### B. Ma Trận Phân Quyền Tóm Tắt (Góc Nhìn Nghiệp Vụ)

> **Nguồn chuẩn hóa:** Chi tiết cụ thể của 6 vai trò × 62 quyền hạn được định nghĩa tại [permission matrix](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/architecture/permission-matrix.md#6-canonical-permission-matrix-6-roles--62-permissions). Bảng dưới đây chỉ là **tóm tắt nghiệp vụ** của 5 nhóm tác nhân chính, không thay thế cho logic kiểm tra phân quyền thực tế trong code (RBAC guard check).

| Tính Năng / Quyền Hạn                   |    Super Admin     |    Restaurant Owner    | Staff (Phục Vụ) | Staff (Bếp/Bar) |  Khách Hàng   |
| :-------------------------------------- | :----------------: | :--------------------: | :-------------: | :-------------: | :-----------: |
| **Quản trị Hệ thống Platform**          |                    |                        |                 |                 |               |
| Quản lý nhà hàng tenant (Duyệt/Khóa)    |         ✅         |           ❌           |       ❌        |       ❌        |      ❌       |
| Thiết lập các Gói dịch vụ hệ thống      |         ✅         |           ❌           |       ❌        |       ❌        |      ❌       |
| Xem danh sách toàn bộ các nhà hàng      |         ✅         |           ❌           |       ❌        |       ❌        |      ❌       |
| Cấu hình cổng thanh toán chung hệ thống |         ✅         |           ❌           |       ❌        |       ❌        |      ❌       |
| Thanh toán mua gói dịch vụ hệ thống     |         ❌         |       ✅ (Owner)       |       ❌        |       ❌        |      ❌       |
| Xem thông tin gói dịch vụ của tenant    |         ✅         |           ✅           |       ❌        |       ❌        |      ❌       |
| Cấu hình tài khoản SePay của tenant     |         ❌         |       ✅ (Owner)       |       ❌        |       ❌        |      ❌       |
| **Vận hành Quản lý Nhà hàng**           |                    |                        |                 |                 |               |
| Quản lý thông tin thực đơn (CRUD)       |     ✅ (Debug)     |           ✅           |       ❌        |       ❌        |      ❌       |
| Quản lý danh sách Bàn & mã QR           |         ❌         |           ✅           |  ⚠️ (Chỉ xem)   |       ❌        |      ❌       |
| Quản lý tài khoản nhân viên             |         ❌         |           ✅           |       ❌        |       ❌        |      ❌       |
| Xem báo cáo phân tích/Doanh thu         | ✅ (Toàn hệ thống) | ✅ (Tenant - theo gói) |       ❌        |       ❌        |      ❌       |
| Thay đổi cấu hình chung nhà hàng        |         ❌         |           ✅           |       ❌        |       ❌        |      ❌       |
| **Nghiệp vụ Đơn Hàng (Order)**          |                    |                        |                 |                 |               |
| Quét QR & Xem Thực đơn                  |         ❌         |           ✅           |       ✅        |       ❌        |      ✅       |
| Gọi món trực tiếp qua QR                |         ❌         |           ❌           |       ❌        |       ❌        |      ✅       |
| Xác nhận đơn hàng mới (Pending → Proc.) |         ❌         |           ✅           |       ✅        |       ❌        |      ❌       |
| Hủy đơn hàng chưa xác nhận              |         ❌         |           ✅           |       ✅        |       ❌        | ✅ (Đơn mình) |
| Hủy đơn hàng đã gửi xuống bếp chế biến  |         ❌         |      ✅ (Manager)      |       ❌        |       ❌        |      ❌       |
| Cập nhật KDS (Chế biến xong/Đang làm)   |         ❌         |           ✅           |       ❌        |       ✅        |      ❌       |
| Theo dõi trạng thái đơn hàng            |     ✅ (Debug)     |    ✅ (Toàn bộ đơn)    |   ✅ (Tất cả)   |  ✅ (Chỉ KDS)   | ✅ (Đơn mình) |
| **Nghiệp vụ Bàn & Thanh toán**          |                    |                        |                 |                 |               |
| Thao tác chuyển bàn cho khách           |         ❌         |           ✅           |       ✅        |       ❌        |      ❌       |
| Xác nhận thanh toán hóa đơn             |         ❌         |           ✅           |       ✅        |       ❌        |      ❌       |
| Nhấn nút gửi yêu cầu thanh toán         |         ❌         |           ❌           |       ❌        |       ❌        |      ✅       |
| Xác nhận bàn dọn dẹp sạch sẽ            |         ❌         |           ✅           |       ✅        |       ❌        |      ❌       |

---

### C. Logic Phân Quyền & Quy tắc nghiệp vụ

```yaml
Luồng xử lý của Middleware phân quyền đa nhà hàng (Multi-Tenant):

  BƯỚC 1: Xác định nhóm tác nhân cần truy cập
    IF request.path.startsWith('/admin/platform') THEN
      required_actor = "Super Admin"
    ELSE IF request.path.startsWith('/restaurant') THEN
      required_actor IN ["Restaurant Owner", "Manager", "Staff"]
    ELSE IF request.path.startsWith('/menu') THEN
      required_actor = "Customer" OR "Staff"

  BƯỚC 2: Kiểm tra trạng thái đăng nhập
    IF required_actor != "Customer" THEN
      token = request.headers.authorization
      IF !token OR !verify_jwt(token) THEN
        RETURN 401 Unauthorized (Chưa đăng nhập)

      user = decode_jwt(token)
    ELSE
      # Khách hàng có thể ẩn danh hoặc nhận diện qua session_id
      session = request.cookies.session_id OR generate_guest_session()

  BƯỚC 3: Kiểm tra quyền hạn của tác nhân
    IF required_actor == "Super Admin" THEN
      IF user.role != "SUPER_ADMIN" THEN
        RETURN 403 Forbidden (Không đủ quyền)
      # Super Admin được phép bỏ qua bộ lọc tenant_id
      PROCEED (Cho phép thực hiện)

    IF required_actor IN ["Restaurant Owner", "Manager"] THEN
      IF user.role NOT IN ["OWNER", "MANAGER"] THEN
        RETURN 403 Forbidden (Không đủ quyền)
      # Kiểm tra quyền sở hữu nhà hàng (tenant_id)
      IF user.tenant_id != requested_resource.tenant_id THEN
        RETURN 403 Forbidden "Không thể truy cập dữ liệu của nhà hàng khác"

    IF required_actor == "Staff" THEN
      IF user.role NOT IN ["STAFF", "WAITER", "CHEF", "BARISTA"] THEN
        RETURN 403 Forbidden
      # Kiểm tra ranh giới hoạt động của nhân viên
      IF user.tenant_id != requested_resource.tenant_id THEN
        RETURN 403 Forbidden

    IF required_actor == "Customer" THEN
      # Khách hàng chỉ được phép tương tác với dữ liệu tại bàn/session của mình
      IF session.table_id != requested_resource.table_id THEN
        RETURN 403 Forbidden "Không thể xem đơn hàng của bàn khác"

  BƯỚC 4: Phân quyền ở mức hành động cụ thể (Action-Level)
    # Ví dụ: Hủy đơn hàng đã được gửi xuống bếp chế biến
    IF action == "cancel_order" AND order.status == "Processing" THEN
      IF user.role NOT IN ["OWNER", "MANAGER"] THEN
        RETURN 403 Forbidden "Chỉ Quản lý hoặc Chủ cửa hàng mới được hủy món đang chế biến"

      # Yêu cầu điền lý do hủy
      IF !request.body.cancel_reason THEN
        RETURN 400 Bad Request "Bắt buộc điền lý do hủy món"

      # Ghi nhật ký audit log để đối soát
      audit_log.create({
        actor: user.id,
        action: "cancel_order",
        resource: order.id,
        reason: request.body.cancel_reason,
        timestamp: now()
      })
```

---

### D. Quy tắc cô lập dữ liệu nhà hàng (CRITICAL - Bắt buộc cho SaaS)

```yaml
Cô lập ở mức Database (Database Level Isolation):
  # Mọi câu truy vấn dữ liệu bắt buộc phải lọc theo tenant_id
  SELECT * FROM orders WHERE tenant_id = :current_tenant_id

  # Các chỉ mục (Global Index) bắt buộc phải kèm trường tenant_id để tối ưu truy vấn
  CREATE INDEX idx_orders_tenant ON orders(tenant_id, created_at)

  # Ràng buộc khóa ngoại bắt buộc phải khớp trong cùng tenant
  CONSTRAINT fk_order_table
    FOREIGN KEY (table_id)
    REFERENCES tables(id)
    WHERE tables.tenant_id = orders.tenant_id

Cô lập ở mức API (API Level Isolation):
  # Middleware tự động bổ sung tham số tenant_id
  IF user.role == "SUPER_ADMIN" THEN
    # Super Admin có thể xem dữ liệu chéo giữa các nhà hàng qua query param
    tenant_id = request.query.tenant_id OR NULL
  ELSE
    # Các tài khoản khác chỉ được thấy dữ liệu của nhà hàng mình đăng ký
    tenant_id = user.tenant_id

  # Ghi đè toàn bộ tham số lọc gửi từ client lên để tránh bị giả mạo
  query.where('tenant_id', tenant_id)

Cô lập ở mức Session & Bộ nhớ đệm (Cache):
  # Mã key lưu cache bắt buộc phải chứa tiền tố tenant_id
  cache_key = "menu:#{tenant_id}:#{category_id}"

  # Lưu trữ session riêng biệt trong Redis
  redis.setex("session:#{tenant_id}:#{session_id}", data)

Cô lập ở mức Lưu trữ file (File Storage):
  # Lưu trữ hình ảnh tải lên theo thư mục riêng biệt của từng tenant
  file_path = "uploads/#{tenant_id}/menu_images/#{file_name}"

  # Kiểm tra quyền sở hữu của tenant trước khi cấp URL tải ảnh
  IF file.tenant_id != user.tenant_id THEN
    RETURN 403 Forbidden
```

---

### E. Một số trường hợp phân quyền đặc biệt

#### **Trường hợp 1: Quản lý ghi đè hành động của nhân viên**

```yaml
Kịch bản: Quản lý muốn hủy một đơn hàng mà nhân viên phục vụ trước đó đã lỡ bấm xác nhận

  IF user.role == "MANAGER" AND action == "override_staff_action" THEN
    original_action = audit_log.find(action_id)

    # Quản lý chỉ được phép ghi đè trong phạm vi nhà hàng (tenant) của mình
    IF original_action.tenant_id != user.tenant_id THEN
      RETURN 403 Forbidden

    # Ghi nhận nhật ký hành động ghi đè
    audit_log.create({
      actor: user.id,
      action: "override",
      original_action: action_id,
      reason: request.body.reason
    })

    # Tiến hành xử lý hành động mới
    PROCEED with requested change
```

#### **Trường hợp 2: Chế độ Debug của Super Admin**

```yaml
Kịch bản: Super Admin cần truy cập dữ liệu của một nhà hàng cụ thể để hỗ trợ kỹ thuật

  IF user.role == "SUPER_ADMIN" AND request.query.debug_mode == true THEN
    tenant_id = request.query.tenant_id

    # Ghi nhận nhật ký truy cập debug (để kiểm toán và tuân thủ bảo mật)
    admin_audit_log.create({
      admin_id: user.id,
      action: "debug_access",
      tenant_id: tenant_id,
      reason: request.query.reason,
      ip_address: request.ip
    })

    # Giả lập quyền truy cập tạm thời vào tenant
    context.set_tenant(tenant_id)
    context.set_actor("SUPER_ADMIN_DEBUG")

    # Cho phép truy cập ở chế độ CHỈ ĐỌC (READ-ONLY) để đảm bảo an toàn dữ liệu
    PROCEED with READ-ONLY access
```

#### **Trường hợp 3: Khách hàng tự hủy đơn đặt món của mình**

```yaml
Kịch bản: Khách hàng muốn hủy đơn món ăn vừa bấm gửi do chọn nhầm món

  IF user.actor_type == "Customer" AND action == "cancel_order" THEN
    order = Order.find(order_id)

    # Xác thực quyền sở hữu đơn thông qua session hoạt động của khách
    IF order.session_id != customer.session_id THEN
      RETURN 403 Forbidden "Không phải đơn hàng của bạn"

    # Chỉ cho phép hủy khi đơn chưa được nhân viên nhà hàng bấm xác nhận
    IF order.status != "Pending" OR order.confirmed == true THEN
      RETURN 400 Bad Request "Không thể hủy đơn hàng đã được xác nhận. Vui lòng gọi phục vụ để được hỗ trợ."

    # Thực hiện hủy đơn (Soft cancel); không hoàn kho do đơn chờ xác nhận chưa trừ kho thực tế
    order.update(status: "Canceled", canceled_by: "Customer", canceled_at: now())
```

---

### F. Bảng ánh xạ vai trò sang các dịch vụ microservice tương ứng

| Tác Nhân / Vai Trò          | Các Microservices Tương Tác Chính                   | Phương thức Xác Thực         |
| :-------------------------- | :-------------------------------------------------- | :--------------------------- |
| **Super Admin**             | Authorizer, User-Access, SaaS, BFF                  | JWT (Theo Session đăng nhập) |
| **Restaurant Owner**        | Catalog, User-Access, Order, Kitchen, Payment, SaaS | JWT (Theo Session đăng nhập) |
| **Staff (Nhân viên)**       | Catalog, Order, Kitchen, Payment                    | JWT (Theo Session đăng nhập) |
| **Customer (Khách)**        | Catalog/Menu, Order, Payment                        | Session ID (Khách vãng lai)  |
| **Hệ thống liên kết ngoài** | Payment Gateway, Hệ thống in, Giao hàng             | API Key + Webhook            |

---

## III. CÁC TÍNH NĂNG MỞ RỘNG

- **Quản lý nguồn nhân lực nâng cao:** Thiết lập hệ thống phân quyền chi tiết cho nhân sự (Admin quản lý, Điều phối ca, Nhân viên chạy bàn, Nhân viên bếp/bar).
- **Quản lý yêu cầu phục vụ:** Khách hàng có thể gửi các yêu cầu trực tiếp (Gọi món thêm, Gọi tính tiền) hoặc yêu cầu hỗ trợ khác từ nhân viên thông qua ứng dụng Web-app.
- **Báo cáo phân tích doanh thu chuyên sâu (Analytics):** Thống kê số liệu chi tiết theo khoảng thời gian, tổng hợp món bán chạy nhất và biểu đồ tần suất khách hàng theo giờ cao điểm.
- **Quản lý kho nguyên vật liệu đơn giản (Inventory):** Thiết lập định mức định lượng nguyên liệu cho món ăn (Ví dụ: 1 bát phở bò cần định mức 200g thịt bò), tự động trừ kho nguyên liệu tương ứng khi có đơn hàng hoàn tất.
