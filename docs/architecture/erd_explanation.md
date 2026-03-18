# TÀI LIỆU GIẢI THÍCH CHI TIẾT SƠ ĐỒ CƠ SỞ DỮ LIỆU (ERD)

> **Dự án:** QRTable SaaS POS
> **Tham chiếu:** Dựa trên `erd.dbml`, `erd.mmd` và `business-logic.md` > **Mục đích:** Tài liệu này giải thích chi tiết ý nghĩa và luồng liên kết giữa các bảng (tables) trong hệ thống, phục vụ cho việc báo cáo luận văn và hiểu biết chung của team lập trình.

---

## 🏗️ TỔNG QUAN KIẾN TRÚC DỮ LIỆU

Hệ thống QRTable áp dụng mô hình dữ liệu **Multi-Tenant (Đa khách thuê)** với kiến trúc chia theo **Cụm Dữ Liệu (Data Domains)**. Mỗi dữ liệu (ngoại trừ Pricing Plans) đều bắt buộc phải gắn với một `tenant_id` để đảm bảo tính cô lập và bảo mật tuyệt đối giữa các nhà hàng khác nhau.

Toàn bộ ERD có thể được chia làm **5 Cụm Dữ liệu Cốt lõi** sau:

---

## 1. CỤM SAAS & ĐA KHÁCH THUÊ (MULTI-TENANCY)

_Nền tảng của hệ thống, quản lý doanh nghiệp và giới hạn dịch vụ._

### Bảng `tenants` (Khách thuê / Nhà hàng)

- Bảng gốc rễ tạo nên định danh của mỗi nhà hàng trên hệ thống.
- **Fields quan trọng:**
  - `slug`: Dùng để tạo subdomain định danh trên Internet (vd: `the-coffee-house`).
  - `status`: Quản lý vòng đời hoạt động của nhà hàng (`active`, `suspended`, `closed`).
  - `default_currency` & `default_locale`: Thiết lập ngôn ngữ và tiền tệ mặc định (VND, vi-VN).
- **Mối quan hệ:** Quan hệ 1-n (One-to-Many) với GẦN NHƯ TẤT CẢ các bảng khác trong hệ thống.

### Bảng `pricing_plans` & `subscriptions` (Gói cước & Đăng ký)

- **`pricing_plans`**: Định nghĩa các gói dịch vụ (Ví dụ: Miễn phí, Cơ bản, Nâng cao). Chứa các quota giới hạn như `max_tables` và `max_staff`. Đây là bảng cấp Platform (không có `tenant_id`).
- **`subscriptions`**: Bảng cầu nối. Ghi nhận việc Tenant X mua Gói Y, bắt đầu từ ngày nào (`starts_at`) đến ngày nào (`expires_at`).

---

## 2. CỤM THỰC ĐƠN & DANH MỤC (CATALOG DOMAIN)

_Quản lý danh sách món ăn hiển thị trên Menu điện tử._

### Bảng `categories` (Danh mục)

- Phân nhóm món ăn (Khai vị, Món chính, Đồ uống...).
- **Fields quan trọng:**
  - `time_start`, `time_end`: Cho phép cấu hình hiển thị theo khung giờ (Vd: Menu ăn sáng).
  - `sort_order`: Cho phép chủ quán kéo thả thứ tự hiển thị ưu tiên trên màn hình khách.

### Bảng `menu_items` (Món ăn / Đồ uống)

- Chứa chi tiết món ăn được gán vào 1 Category.
- **Fields quan trọng:**
  - `price_vnd`: Giá bán bằng VND (lưu dạng số nguyên `bigint` để tránh sai số thập phân).
  - `stock_qty`: Số lượng tồn kho. Sẽ bị trừ đi (Pessimistic Locking) trong quá trình đặt đơn.
  - `status`: Có thể chuyển sang `out_of_stock` (hết hàng) để tự động ẩn khỏi giỏ hàng.

---

## 3. CỤM KHÔNG GIAN BÀN & QUẢN LÝ PHIÊN (TABLE & SESSION)

_Kết nối khách hàng vật lý với hệ thống qua mã QR._

### Bảng `areas` & `tables` (Khu vực & Bàn)

- **`areas`**: Theo dõi mặt bằng (Tầng trệt, Tầng 2, Sân vườn).
- **`tables`**: Bàn cụ thể thuộc một Khu vực.
- **Fields quan trọng của Bàn:**
  - `status`: Vòng đời khép kín của bàn (`available` -> `occupied` -> `billing` -> `cleaning`). Cản trở/cho phép khách quét QR tùy trạng thái.
  - `qr_token`: Mã băm HMAC để bảo mật mã QR, ngăn chặn giả mạo URL.

### Bảng `sessions` (Phiên làm việc - Vô cùng quan trọng)

- Đây là **Bảng Trung Tâm** liên kết Người Dùng (Khách quét QR) với Đơn Hàng. Khách hàng thường không có Account đăng nhập, nên họ được định danh qua `Session`.
- Cứ mỗi lần quét QR vào một bàn `available`, một Session mới được tạo. Mọi Order do bàn đó đặt trong khoảng thời gian này đều nhét chung vào một Session này (Shared Cart).
- **Fields quan trọng:**
  - `status`: Phiên đang mở hay đã đóng (active, closed).
  - `last_activity_at`: Dùng để tự động đóng Session (auto timeout) nếu khách rời đi không thông báo.

---

## 4. CỤM ĐƠN HÀNG & CHẾ BIẾN (ORDERING & KDS)

_Xử lý luồng đặt món và bếp._

### Bảng `orders` & `order_items`

- Khách không tạo 1 Order cho cả bữa ăn. Khách có thể **gọi nhiều lần** (Ví dụ: Order 1: Món chính. Order 2: Gọi thêm bia). Tất cả đính chung vào `session_id`.
- **`orders`**:
  - `idempotency_key`: Chặn double-submit nếu bấm nút "Đặt món" hai lần.
  - `status`: Từ `pending` (chờ duyệt) -> `processing` (vào bếp) -> `ready` (Bếp làm xong) -> `served` (Đã lên bàn) -> `completed`.
- **`order_items`**:
  - Lưu chi tiết từng món.
  - `unit_price_vnd`: Phải sao chép giá từ `menu_items` tại thời điểm đặt (vì giá gốc trên menu có thể bị đổi sau đó).
  - Trạng thái món (`status`): Hỗ trợ màn hình KDS (bếp) báo xong từng món riêng biệt.

### Bảng `service_requests` (Yêu cầu phục vụ)

- Lưu trữ các tín hiệu "Gọi nhân viên", "Lấy hóa đơn". Giúp quản lý theo dõi tốc độ phản hồi SLAs của nhân viên.

---

## 5. CỤM THANH TOÁN (BILLING & PAYMENTS)

_Quy chuẩn hóa doanh thu và dòng tiền._

### Bảng `bills` (Hóa đơn tổng)

- Khi khách gọi tính tiền (Session đóng lại), mọi `orders` trong `session_id` đó sẽ được gom (aggregate) lại thành **một `bill` duy nhất**. Quan hệ 1-1 với Session.
- **Fields quan trọng:**
  - `total_vnd`: Tổng tiền gốc.
  - `rounding_delta_vnd`: Sai số làm tròn. (Ví dụ: Hệ thống làm tròn 127.500đ thành 128.000đ thì delta là 500đ).

### Bảng `payments` & `refunds` (Thanh toán & Hoàn tiền)

- **`payments`**: 1 Hóa đơn có thể thanh toán nhiều lần hoặc qua nhiều hình thức (chia tiền).
  - `method`: Tiền mặt (`cash`), Chuyển khoản (`bank_transfer`), Stripe (`stripe`).
  - `stripe_session_id`: Map với Webhook trả về từ Stripe. Đảm bảo tính nhất quán.
- **`refunds`**: Trong trường hợp khách khiếu nại hoặc hủy món sau khi đã thanh toán (`status = paid`), hệ thống thiết kế Dòng Hoàn Tiền riêng biệt để dấu vết kiểm toán (Audit Trail) không bị mất mát.

---

## 🔄 TÓM TẮT LUỒNG DỮ LIỆU ĐIỂN HÌNH (DATA FLOW)

1. Nhà hàng khởi tạo (Tạo bản ghi trong `tenants`, `subscriptions`).
2. Chủ quán set up Menu (Tạo `categories`, `menu_items`) và Bàn ghế (Tạo `areas`, `tables`).
3. Khách hàng tới quán, quét QR trên `table`. Hệ thống chuyển `table_status` thành `occupied` và sinh ra 1 bản ghi `sessions`.
4. Khách chọn món, bấm "Gửi". Hệ thống sinh ra bản ghi `orders` (và nhiều `order_items`), trừ `stock_qty` của `menu_items`. Gắn vào `session_id` đó.
5. Nhân viên Bếp tương tác thay đổi trạng thái của `orders` (Pending -> Processing -> Ready -> Served).
6. Khách ăn xong, gọi tính tiền. Cập nhật `table_status` thành `billing`. Hệ thống tổng hợp các `orders` sinh ra 1 bản ghi `bills`.
7. Nhân viên thu tiền (Cash/Chuyển khoản). Sinh ra bản ghi `payments`.
8. Thanh toán xong: Cập nhật `bills` -> closed, `sessions` -> closed, `table_status` -> `cleaning`.
9. Dọn bàn xong: Bàn quay về `available`, sẵn sàng đón khách tiếp theo đón chu kỳ mới.
