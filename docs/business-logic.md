# TÀI LIỆU NGHIỆP VỤ HỆ THỐNG QUẢN LÝ NHÀ HÀNG

> **PHÂN TÍCH DỰA TRÊN QRTABLE.IO LÀM TÔN CHỈ**
> **Current Status:** Living business overview, last aligned with implemented Phase 4B on 2026-05-13.

Tài liệu này mô tả chi tiết các luồng nghiệp vụ cốt lõi, từ thiết lập ban đầu đến vận hành nhà hàng hàng ngày, tập trung vào mô hình đặt món tại bàn sử dụng mã QR (QR-based table ordering).

Khi có mâu thuẫn, ưu tiên theo thứ tự: code/tests hiện tại, accepted specs trong `docs/specs/`, phase records trong `docs/phases/`, rồi tài liệu overview này. Ma trận RBAC chi tiết nằm ở `docs/architecture/permission-matrix.md`.

---

## 1. LUỒNG KHỞI TẠO VÀ THIẾT LẬP NHÀ HÀNG (ONBOARDING & MULTI-TENANCY)

> **LƯU Ý:** Hệ thống là một **SaaS Platform** với mô hình Multi-Tenant. Quy trình này do **Super Admin** quản lý ở tầng Platform.

Đây là quá trình tạo một tenant nhà hàng trên nền tảng, gắn Owner, subscription, cấu hình thanh toán ban đầu và trạng thái vận hành độc lập. Trạng thái hiện tại sau Phase 4B là **admin-assisted onboarding**; self-service registration wizard được để lại cho phase sau.

### A. Các bước thiết lập

1.  **Onboard tenant bởi Super Admin:**
    - `SUPER_ADMIN` tạo tenant qua platform admin, khai báo tên quán, loại hình, địa chỉ, thông tin owner và gói ban đầu.
    - Hệ thống tạo tenant, Owner user, subscription mặc định và payment settings row ban đầu trong cùng quy trình onboarding.
    - Onboarding Phase 4B là một mini-saga trong SaaS Service: nếu bước tạo user/profile/payment settings thất bại, hệ thống rollback dữ liệu đã tạo trong DB và có cleanup path cho orphan Keycloak users.
    - Phase 4B dùng cơ chế `SUPER_ADMIN` nhập password thủ công cho Owner; gửi email reset/required action được chuyển sang Phase 4C sau khi có SMTP/Notification.

2.  **Khởi tạo Định danh Nhà hàng (Tenant Identity):**
    - **Logic Cốt lõi:** Hệ thống tự động sinh ra một Slug/Subdomain duy nhất (ví dụ: `the-coffee-house.qrtable.io`) làm định danh thương hiệu trên Internet.
    - Slug phải normalize tiếng Việt, unique toàn platform và chặn reserved words như `admin`, `api`, `www`, `app` để không xung đột route hoặc brand nội bộ.

3.  **Lựa chọn Gói Dịch vụ (Subscription):**
    - Super Admin quản lý pricing plans; Owner có thể xem gói và tạo checkout subscription cho tenant của mình; Manager chỉ có quyền xem subscription/plan.
    - **Quy tắc:** Gói cước giới hạn tính năng và quy mô (ví dụ: Gói Miễn phí chỉ cho phép tối đa 10 bàn, không có báo cáo nâng cao). Ghi nhận ngày bắt đầu và kết thúc gói.
    - Mỗi tenant chỉ có một subscription `ACTIVE` tại một thời điểm. Subscription mới có thể supersede subscription cũ và phải invalidate cache/guard liên quan.
    - Auto-suspend subscription hết hạn chạy theo giờ Việt Nam: daily `02:00 Asia/Ho_Chi_Minh`, grace period 24h (`expires_at + 1 day < now()`).
    - Counter `max_orders_per_day` dùng timezone `Asia/Ho_Chi_Minh` cho thị trường Việt Nam.
    - Tenant thanh toán platform bằng subscription invoice `QRSUB*`; `SUPER_ADMIN` có manual confirm fallback khi webhook lỗi nhưng đã đối soát được tiền.

4.  **Thiết lập Thanh toán Tenant:**
    - Owner kết nối SePay OAuth2 trong `/dashboard/payment-settings` để tiền bill khách hàng về tài khoản ngân hàng của tenant.
    - Payment Service sở hữu `tenant_payment_settings`; SaaS Service chỉ sở hữu tenant/subscription/invoice platform billing.
    - Thanh toán hai tầng dùng prefix tách biệt: `QRTBL*` cho customer bill payment vào tài khoản tenant, `QRSUB*` cho subscription invoice tenant trả platform.
    - Phase 4B hỗ trợ một SePay account / một active bank account cho mỗi tenant; multi-bank active, proration và partial subscription refund được defer.

5.  **Thiết lập Cấu hình Vận hành:**
    - **Mặc định Việt Nam:** Hệ thống tự động cấu hình đơn vị tiền tệ VND, ngôn ngữ Tiếng Việt.
    - **Chế độ hoạt động:** Khách hàng có thể vừa đặt món trực tiếp (Instant Order) vừa xem Menu điện tử (Digital Menu).

### B. Quy tắc Nghiệp vụ Chủ yếu (Business Rules)

- **Cô lập Dữ liệu (Tenant Isolation):** Đảm bảo dữ liệu (đơn hàng, doanh thu, khách hàng) của cửa hàng này hoàn toàn tách biệt và không hiển thị cho cửa hàng khác.
- **Trạng thái Hoạt động:** Cửa hàng có các trạng thái `ACTIVE`, `SUSPENDED`, `CLOSED`. `SUSPENDED` chuyển tenant sang read-only cho các thao tác vận hành mới, nhưng vẫn cho phép thanh toán bill đang chờ.
  - **Actor:** Super Admin có quyền suspend/activate/close tenant khi vi phạm chính sách hoặc hết hạn subscription.
  - `isActive` chỉ là field tương thích DTO cũ; hành vi vận hành lấy từ `status`.
  - Khi tenant bị `SUSPENDED`, SePay webhook cho bill đã tạo vẫn được xử lý idempotent; order đang `PROCESSING` vẫn được kitchen hoàn tất tới served; UI hiển thị banner cảnh báo thay vì force-disconnect.
  - `CLOSED` là trạng thái kết thúc hợp đồng trong Phase 4B, soft-flag tenant và disable owner khi cần. Hard-delete/retention/data erasure policy được defer.
- **Phân quyền Ban đầu:** Tenant được onboard với **Restaurant Owner** trong phạm vi tenant; Owner quản lý nhân sự, Manager vận hành nhưng không có quyền xóa user, checkout subscription, hoặc cập nhật payment settings.
- **Migration tenant cũ:** Legacy tenants được backfill plan `FREE` không hết hạn; `isActive=false` map sang `SUSPENDED`; currency/locale mặc định là `VND` / `vi-VN`.

---

## 2. LUỒNG QUẢN LÝ THỰC ĐƠN (CATALOG & MENU MANAGEMENT)

Mô tả quá trình số hóa thực đơn giấy của nhà hàng thành Menu điện tử trên hệ thống.

### A. Cấu trúc Phân cấp Menu

Hệ thống tuân thủ cấu trúc 2 tầng đơn giản:

1.  **Danh mục (Category):**
    - Dùng để nhóm các món ăn/đồ uống (Ví dụ: Khai vị, Món chính, Đồ uống, Tráng miệng).
    - **Logic hiển thị:** Có thể cài đặt khung giờ hiển thị cho danh mục (Ví dụ: "Điểm tâm" chỉ hiển thị 6h - 10h sáng).
    - **Trạng thái:** `Active` (Hiển thị) hoặc `Inactive` (Ẩn).

2.  **Món ăn/Đồ uống (Menu Item):**
    - **Thông tin cơ bản:** Tên món, Hình ảnh, Mô tả ngắn, Giá bán cố định.
    - **Trạng thái:** `Available` (Còn hàng) hoặc `Out of Stock` (Hết hàng). Khi hết hàng, nút "Đặt món" trên giao diện khách hàng sẽ bị vô hiệu hóa ngay lập tức.
    - **Giá đơn giản:** Mỗi món có một mức giá cố định, không có biến thể (size, topping).

### B. Quy tắc Nghiệp vụ Chủ yếu

- **Tính giá đơn giản:** Giá cuối cùng = Giá món × Số lượng. Không có phụ phí, thuế, hay giảm giá.
- **Hiển thị:** Chỉ hiển thị món ăn thuộc danh mục `Active` và có trạng thái `Available`.
- **Sắp xếp tùy chỉnh:** Chủ quán có quyền sắp xếp thứ tự hiển thị của Danh mục và Món ăn (drag & drop).
- **Đồng bộ menu hiện tại:** Menu mutation invalidate cache/query hiện có; hệ thống hiện không có Kafka/WS `menu.updated`. Customer/POS hội tụ bằng refetch theo vòng đời query hoặc explicit invalidation sau mutation.
- **Ràng buộc xóa:** Không được xóa món ăn đang có trong đơn hàng `Pending` hoặc `Processing`.

---

## 3. LUỒNG QUẢN LÝ SƠ ĐỒ BÀN & MÃ QR (TABLE & QR LOGIC)

Chịu trách nhiệm số hóa mặt bằng nhà hàng và tạo ra các "cổng vào" (Entry Points) cho khách hàng.

### A. Cấu trúc Tổ chức Không gian

- **Khu vực (Areas/Zones):**
  - Chia quán thành các khu vực quản lý (Tầng trệt, Sân thượng, Phòng VIP).
  - **Nghiệp vụ:** Giúp phân công phục vụ dễ dàng và báo cáo doanh thu theo khu vực.
- **Bàn (Tables):**
  - Mỗi bàn thuộc một Khu vực. Thông tin cơ bản: Tên/Số bàn, Sức chứa.
  - **Định danh:** Mỗi bàn có một ID duy nhất trong phạm vi cửa hàng.

### B. Logic Định danh và Sinh mã QR

- **Cơ chế Ánh xạ (Mapping):**
  - Mỗi bàn được tạo ra sẽ gắn với một Token định danh duy nhất.
  - Mã QR là một URL chứa tham số: `https://ten-quan.qrtable.io?table_id=xyz&token=abc`.

- **Bảo mật QR (Security Rules):**

  ```
  Token Generation:
    token = HMAC_SHA256(table_id + store_id + secret_key)

  Token Validation:
    IF HMAC_verify(table_id, token, secret_key) == false
    THEN return 403 "Invalid QR code"

  Rate Limiting (Chống spam):
    max_scans_per_table = 10 scans per 5 minutes
    max_orders_per_session = 20 items

    IF rate_limit_exceeded
    THEN return 429 "Too many requests, please wait"

  Session Timeout:
    IF last_activity > 30 minutes AND order_count == 0
    THEN auto_close_session()
  ```

- **Xuất bản QR:** Cho phép xuất file ảnh/PDF các bộ mã QR theo template để in ấn đồng bộ.

### C. Logic Quản lý Trạng thái Bàn (Table State Management)

**State Machine - Vòng đời trạng thái bàn:**

```
┌─────────────┐
│  Available  │ (Sẵn sàng đón khách)
└──────┬──────┘
       │ QR Scan → Create Session
       ▼
┌─────────────┐
│  Occupied   │ (Đang có khách)
└──────┬──────┘
       │ Customer request payment → Lock ordering
       ▼
┌─────────────┐
│   Billing   │ (Chờ thanh toán)
└──────┬──────┘
       │ Payment completed
       ▼
┌─────────────┐
│  Cleaning   │ (Cần dọn dẹp)
└──────┬──────┘
       │ Staff mark as clean
       ▼
┌─────────────┐
│  Available  │ (Quay lại trạng thái ban đầu)
└─────────────┘
```

**Business Rules cho State Transitions:**

```yaml
Available → Occupied:
  Trigger: Khách quét QR lần đầu
  Condition: table_status == "Available"
  Action:
    - Tạo Session mới
    - Set table_status = "Occupied"
    - Set session_started_at = current_timestamp

Occupied → Billing:
  Trigger: Khách nhấn "Yêu cầu thanh toán"
  Condition:
    - table_status == "Occupied"
    - EXISTS (order_items WHERE status == "Ready")
  Action:
    - Set table_status = "Billing"
    - Disable QR ordering (return "Bàn đang thanh toán")
    - Notify staff

Billing → Occupied (Rollback):
  Trigger: Khách hủy yêu cầu thanh toán
  Condition:
    - table_status == "Billing"
    - payment_status != "Paid"
  Action:
    - Set table_status = "Occupied"
    - Re-enable QR ordering

Billing → Cleaning:
  Trigger: Thanh toán hoàn tất
  Condition:
    - table_status == "Billing"
    - payment_status == "Paid"
  Action:
    - Set table_status = "Cleaning"
    - Close session
    - Archive order data

Cleaning → Available:
  Trigger: Nhân viên đánh dấu "Đã dọn xong"
  Action:
    - Set table_status = "Available"
    - Clear session_id
    - Ready for next customer
```

### D. Quy tắc Nghiệp vụ Chủ yếu

- **Duy nhất:** Mỗi cửa hàng không có hai bàn trùng tên hoặc ID.
- **Ràng buộc Xóa:** Không được xóa bàn nếu bàn đang có đơn hàng `Pending`/`Active`.
- **Chuyển bàn (Merge/Switch):** Cho phép nhân viên chuyển toàn bộ giỏ hàng/đơn hàng từ bàn cũ sang bàn mới và giải phóng bàn cũ.

  ```
  Transfer Table Logic:
    Validate: destination table Available (Catalog); active session có orders/bill (Order).

    Luồng Step 2.4 (saga + transfer lock — không một transaction ACID xuyên Order PG + Catalog PG + Redis):
      - Khóa transfer + cập nhật orders/session trong Order DB
      - Catalog TCP: cập nhật `tables.status` và binding bàn
      - Redis: session/cart metadata (`table_id` / hiển thị)
      - Compensation nếu bước giữa fail; realtime qua BFF Direct (không topic Kafka rename bàn)
  ```

- **Giới hạn Gói cước:** Số lượng bàn tối đa được tạo bị giới hạn theo gói dịch vụ đã mua.

---

## 4. LUỒNG ĐẶT MÓN TẠI BÀN (CUSTOMER ORDERING FLOW)

Quy trình từ lúc khách quét QR đến khi đơn hàng được gửi đến bếp.

### A. Quy trình Nghiệp vụ Chi tiết

1.  **Khởi tạo Phiên (Session Initiation):**
    - Khách quét mã QR, giao diện Menu mở ra (Progressive Web App).
    - Hệ thống nhận diện `Store_ID`, `Table_ID`, và xác thực `Token`.
    - **Logic Phiên (Session Management):**

      ```
      IF table_status == "Available" OR last_session_closed > 15 phút
      THEN tạo Session mới với Session_ID duy nhất

      IF table_status == "Occupied" AND billing_status != "Billing"
      THEN join Session hiện tại (Shared Cart - cùng giỏ hàng)

      IF table_status == "Billing"
      THEN chặn QR scan, hiển thị "Bàn đang thanh toán, vui lòng chờ"
      ```

    - **Shared Cart Logic:** Tất cả khách quét QR vào cùng một bàn (trong cùng Session) sẽ thấy chung một giỏ hàng và có thể cùng thêm món.

2.  **Lựa chọn Món (Item Selection):**
    - Duyệt Menu theo danh mục, kiểm tra trạng thái `Available`/`Out of Stock` Real-time.
    - Nhấn vào món → Hiển thị chi tiết (Hình ảnh lớn, Mô tả, Giá).
    - Chọn số lượng → Nhấn "Thêm vào giỏ".

3.  **Quản lý Giỏ hàng (Cart Management):**
    - Xem danh sách món đã chọn, hiển thị: Tên món, Số lượng, Giá, Tổng cộng.
    - **Chỉnh sửa:** Tăng/giảm số lượng, xóa món, thêm Ghi chú món (Ví dụ: "Không cay", "Ít muối").
    - **Tính tổng tiền:** Tổng tiền = Σ(Giá món × Số lượng).

4.  **Gửi Đơn hàng (Order Submission):**
    - Khách nhấn "Đặt món". Đơn hàng chuyển trạng thái `Pending` (Chờ xác nhận).
    - Hệ thống gửi Thông báo Tức thời (âm thanh/rung) đến thiết bị của nhân viên tại quầy/POS.

5.  **Xác nhận và Điều phối (Confirmation & Routing):**
    - Nhân viên kiểm tra và nhấn "Xác nhận".
    - Đơn hàng chuyển sang `Processing` (Đang xử lý).
    - **Điều phối Bếp:** Hệ thống tự động tách đơn: Món ăn -> Màn hình Bếp; Đồ uống -> Màn hình Bar.
    - Tự động in Kitchen Order Ticket (KOT) nếu có máy in.

6.  **Theo dõi Tiến độ (Order Tracking):**
    - Giao diện khách hàng cập nhật trạng thái: "Đã gửi đơn" -> "Đang chế biến" -> "Đã lên món".
    - Khách có thể đặt thêm món mới (Order bổ sung) mà không ảnh hưởng đến đơn cũ.

### B. Quy tắc Nghiệp vụ Chủ yếu

- **Khóa Đặt món (Ordering Lock):**

  ```
  IF table_status == "Billing"
  THEN disable "Thêm món" button
  AND show message "Bàn đang thanh toán, không thể đặt thêm món"
  ```

- **Xử lý Tồn kho Concurrent (Race Condition):**

  ```
  Submit (customer): chỉ kiểm tra snapshot availability — KHÔNG trừ tồn kho.

  Confirm (staff, PENDING → PROCESSING):
    Catalog Service (sở hữu menu_items): pessimistic lock + deduct trong transaction Catalog
      (qua lệnh TCP transactional — Order Service không UPDATE trực tiếp DB Catalog)
    Order Service: cập nhật order status + phát Kafka order.confirmed sau commit (+ simplified outbox)

    Nếu không đủ tồn → lỗi có cấu trúc cho nhân viên (khách đã submit trước đó chỉ là pending)

  Stock/menu visibility: Catalog/BFF invalidate cache/query theo write path; không claim menu realtime WS.
  ```

  **Timestamp:** Sử dụng `server_timestamp` (UTC), KHÔNG dùng `client_timestamp`.

- **Cộng dồn Đơn:** Các đơn đặt bổ sung trong cùng Session sẽ merge vào một Bill duy nhất khi thanh toán.

- **Bắt buộc Xác nhận:** Mọi đơn hàng phải qua trạng thái `Pending` → Nhân viên xác nhận → `Processing`, nhằm chống spam/đơn ảo.

- **Hủy đơn bởi khách:**

  ```
  IF order_status == "Pending" AND confirmed == false
  THEN allow customer to cancel (Soft delete, keep log)

  IF order_status IN ["Processing", "Ready"]
  THEN disable cancel button for customer
  AND require staff/manager approval to cancel
  ```

---

## 5. LUỒNG XỬ LÝ ĐƠN HÀNG & NHÀ BẾP (KITCHEN/KDS FLOW)

Bắt đầu khi nhân viên xác nhận đơn và kết thúc khi món ăn sẵn sàng.

### A. Quy trình Nghiệp vụ Chi tiết

1.  **Tiếp nhận và Phân loại (Ticket Routing):**
    - Tách đơn tự động: Phân chia món ăn và đồ uống về Màn hình Bếp và Màn hình Bar riêng biệt.
    - Mỗi đơn xuất hiện dưới dạng một "Ticket" điện tử, hiển thị: số bàn, tên món, ghi chú và thời gian chờ.

2.  **Tiếp nhận Chế biến (Acknowledging):**
    - **Trạng thái Chờ (Pending):** Thẻ mới có màu nổi bật (Đỏ/Vàng).
    - **Bắt đầu làm (Processing):** Đầu bếp nhấn vào thẻ để xác nhận "Đang làm món này", giúp tránh làm trùng.

3.  **Xử lý theo Yêu cầu:**
    - Đầu bếp xem chính xác yêu cầu Modifiers và Ghi chú của khách.
    - **Không batching/gộp món:** KDS hiển thị ticket/item theo snapshot backend; không có batch queue, tổng cùng món xuyên bàn, hay API/UI contract cho gộp món. Cart trước submit vẫn có thể gộp cùng món/cùng ghi chú trong cùng session.

4.  **Hoàn thành Chế biến (Ready to Serve):**
    - Đầu bếp nhấn "Hoàn thành" (Done/Ready). Thẻ biến mất khỏi màn hình bếp.
    - **Kích hoạt Thông báo (Ping):** Hệ thống gửi thông báo ngay lập tức đến nhân viên phục vụ: "Bàn 05 - Món Phở bò đã xong".

5.  **Thu hồi/Sửa lỗi (Recall Logic):**
    - Cho phép đầu bếp thu hồi lại thẻ đã lỡ tay nhấn "Hoàn thành" để quay lại trạng thái đang chế biến.

### B. Quy tắc Nghiệp vụ Chủ yếu

- **FIFO (First In - First Out):** Đơn hàng vào trước phải hiển thị trước.
- **Cảnh báo Trễ (SLA Warning):** Thẻ món quá X phút chưa hoàn thành phải đổi màu/nhấp nháy để cảnh báo quá tải/quên đơn.
- **Đồng bộ Trạng thái:** WebSocket là hint realtime; KDS/PWA/POS phải refetch REST snapshot sau mutation, reconnect hoặc missed event. Order Service vẫn là source of truth cho trạng thái customer-visible.
- **Ưu tiên Món (Priority):** Cho phép đánh dấu bàn/món "Ưu tiên" để đưa lên đầu danh sách KDS.

---

## 6. LUỒNG THANH TOÁN & ĐỐI SOÁT (PAYMENT & RECONCILIATION)

Đảm bảo mọi dịch vụ được chuyển đổi thành doanh thu chính xác và được ghi nhận.

### A. Quy trình Nghiệp vụ Chi tiết

1.  **Yêu cầu Thanh toán (Payment Request):**
    - Khách nhấn nút "Thanh toán" trên Web-app -> Hệ thống gửi Alert đến POS/Tablet của nhân viên.
    - **Khóa Đơn hàng (Order Locking):** Bàn chuyển sang trạng thái `Billing`, khách không thể đặt thêm món.

2.  **Kiểm tra & Tổng hợp Hóa đơn (Final Review):**
    - Nhân viên kiểm tra danh sách món, số lượng, tổng tiền.
    - **Công thức tính tiền đơn giản:**
      ```
      Subtotal = Σ(Giá món × Số lượng)
      Total = Subtotal
      ```
    - **Ràng buộc trạng thái:** Chỉ cho phép chuyển sang Billing khi tất cả món đã `Ready` (Hoàn thành chế biến).

3.  **Thực hiện Thanh toán (Payment Execution):**
    - **Thanh toán Tiền mặt (Cash):**
      ```
      Staff nhập số tiền khách đưa
      Hệ thống tính tiền thừa = Tiền nhận - Total
      Staff xác nhận "Đã thu tiền"
      → payment_status = "Paid", payment_method = "Cash"
      ```
    - **Thanh toán Chuyển khoản (Bank Transfer — SePay / VietQR):**

      ```
      Hệ thống sinh QR VietQR (SePay) với:
        - Tham số amount = bill.roundedTotal (VND đã làm tròn theo policy làm tròn nghìn)
        - Nội dung chuyển khoản (des / CK content) chứa billReference cố định:
          "QRTBL" + 8 ký tự đầu tiên của billId sau khi bỏ dấu gạch (UUID)

      Khách quét QR và chuyển khoản

      Webhook SePay → BFF → Payment khớp billReference (code hoặc regex trên content)
        - Nếu số tiền < roundedTotal: giữ payment PENDING, ghi audit SEPAY_WEBHOOK_UNDERPAID
        - Nếu số tiền >= roundedTotal: payment_status = "Paid"; lưu paidAmount = số tiền thực nhận
          (chấp nhận overpaid; hoàn tiền full dùng paidAmount ?? roundedTotal)
      ```

      > **Lưu ý kiến trúc (2026-05):** Thanh toán chuyển khoản được xử lý thông qua **SePay + VietQR động** — QR code nhúng inline trong POS/PWA (không redirect). Route webhook trực tiếp Phase 3 hiện verify HMAC raw-body; route tenant/platform Phase 4B dùng `x-secret-key` path riêng và cần hardening value verification trước production. Xem `technical-architecture.md` §6.2.7 và phase record `docs/phases/phase-3-payment.md`.

4.  **In Hóa đơn & Giải phóng Bàn (Closing):**
    - In hóa đơn giấy.
    - **Sau thanh toán thành công:** Theo state machine bàn, bàn chuyển `Billing` → `Cleaning`; nhân viên sau đó đánh dấu `Cleaning` → `Available` khi dọn xong. Không mô tả “nhảy thẳng Available” ngay khi thanh toán.

5.  **Đối soát Tài chính (Reconciliation):**
    - Cuối ngày/tháng, hệ thống tổng hợp nguồn thu theo phương thức (Tiền mặt, Chuyển khoản...).
    - Chủ quán khớp dữ liệu số dư ngân hàng/két tiền với báo cáo trên QRTable.

### B. Quy tắc Nghiệp vụ Chủ yếu

- **Bất biến (Immutability):**

  ```
  IF bill_status == "Completed" AND payment_status == "Paid"
  THEN disable all edit operations
  AND require Refund flow for any adjustment
  ```

- **Làm tròn tiền:** Làm tròn đến hàng nghìn (VND). Ví dụ: 127.500đ → 128.000đ.

- **Audit Log bắt buộc:**

  ```
  IF bill_status changed to "Canceled" AND any_item.status IN ["Processing", "Ready"]
  THEN require:
    - canceled_by (user_id)
    - cancel_reason (text)
    - canceled_at (timestamp)
  AND log to audit_trail table
  ```

- **Chặn thanh toán khi món chưa xong:**
  ```
  IF EXISTS (order_item WHERE status IN ["Pending", "Processing"])
  THEN disable "Yêu cầu thanh toán" button
  AND show tooltip "Còn món chưa hoàn thành"
  ```

---

## 7. XỬ LÝ OFFLINE & NETWORK RESILIENCE

Hệ thống phải hoạt động ổn định trong điều kiện mạng không ổn định.

### A. Kịch bản Offline - Phía Khách hàng

```yaml
Scenario 1: Khách quét QR khi offline
  Detection: navigator.onLine == false
  Behavior:
    - Show toast "Không có kết nối mạng"
    - Load cached menu (nếu đã từng truy cập)
    - Disable "Thêm vào giỏ" button
    - Show "Chỉ xem, không thể đặt món khi offline"

Scenario 2: Mất mạng giữa chừng khi đang duyệt menu
  Detection: WebSocket disconnect event
  Behavior:
    - Show warning banner "Mất kết nối, đang thử kết nối lại..."
    - Retry connection với exponential backoff (2s, 4s, 8s...)
    - Giữ giỏ hàng trong localStorage
    - Disable submit order button

Scenario 3: Mất mạng khi đang submit order
  Detection: HTTP request timeout hoặc network error
  Behavior:
    - Show error "Không thể gửi đơn hàng, vui lòng kiểm tra kết nối"
    - Queue order trong IndexedDB
    - Khi có mạng trở lại → Auto retry submit
    - Show sync indicator: "Đang đồng bộ đơn hàng..."
```

### B. Kịch bản Offline - Phía Nhân viên (POS/KDS)

```yaml
Scenario 1: POS mất kết nối khi xác nhận đơn
  Behavior:
    - Queue confirmation action
    - Show "Offline - Thao tác sẽ được đồng bộ khi có mạng"
    - Save to local queue with timestamp
    - Auto sync khi reconnect
    - Prevent duplicate submission (use idempotency key)

Scenario 2: KDS mất kết nối
  Behavior:
    - Continue showing existing orders from cache
    - Queue status updates (mark as Processing/Ready)
    - Show offline indicator
    - Auto sync all queued actions when reconnect
    - Resolve conflicts: Server state wins

Scenario 3: Payment terminal offline
  Behavior:
    - Allow cash payment only
    - Disable bank transfer QR generation
    - Queue payment record
    - Manual reconciliation khi có mạng
```

### C. Sync Strategy

```typescript
Conflict Resolution Rules:
  IF local_timestamp < server_timestamp THEN
    server_state_wins()
    discard_local_changes()
    notify_user("Dữ liệu đã được cập nhật từ server")

  IF action == "order_submission" THEN
    use_idempotency_key(order_id + session_id)
    prevent_duplicate_order()

Retry Policy:
  max_retries = 3
  backoff = exponential (2^n seconds)

  IF retry_count > max_retries THEN
    show_error("Không thể đồng bộ, vui lòng liên hệ quản lý")
    log_to_error_tracking()
```

---

## 8. STATE MACHINE - VÒNG ĐỜI ĐƠN HÀNG

Quản lý trạng thái đơn hàng từ lúc tạo đến hoàn thành.

> **Đặc tả Step 2.4 (canonical Q1–Q12):** [`business-logic-step-2.4-spec.vi.md`](specs/business-logic-step-2.4-spec.vi.md) — bổ sung ownership service, bill request explicit, transfer saga, RBAC cancel tách quyền. Mục §8 giữ vai trò tổng quan; khi lệch, ưu tiên đặc tả Step 2.4.

> **Enum casing convention:** Diagram + rules dưới đây dùng **Title Case** (`Draft`, `Pending`, `Processing`, `Ready`, `Served`, `Completed`, `Canceled`) cho readability. Enum values canonical là **UPPERCASE** (`DRAFT`, `PENDING`, ...) — xem `libs/shared/types/src/lib/order.types.ts` và `docs/phases/phase-2a-order-kafka.md` Step 2.3. Ánh xạ 1-1 (`Draft` ↔ `DRAFT`, v.v.).

### A. Order State Diagram

```
┌──────────┐
│  Draft   │ (Khách đang thêm món vào giỏ, chưa submit)
└────┬─────┘
     │ Submit Order
     ▼
┌──────────┐
│ Pending  │ (Chờ nhân viên xác nhận)
└────┬─────┘
     │ Staff confirm
     ├─────────────── Cancel (if not confirmed) → Canceled
     ▼
┌────────────┐
│ Processing │ (Đã vào bếp, đang chế biến)
└─────┬──────┘
      │ Kitchen mark as done
      ├────────────── Cancel (require manager approval) → Canceled
      ▼
┌──────────┐
│  Ready   │ (Món đã xong, chờ lên bàn)
└────┬─────┘
     │ Serve to table
     ▼
┌──────────┐
│ Served   │ (Đã lên bàn)
└────┬─────┘
     │ Payment completed
     ▼
┌────────────┐
│ Completed  │ (Hoàn tất, không thể sửa)
└────────────┘
```

### B. State Transition Rules

```yaml
Draft → Pending:
  Trigger: Khách nhấn "Đặt món"
  Validation:
    - cart_items.length > 0
    - all_items.status == "Available"
  Action:
    - Create order record (persist từ PENDING — Draft không có DB row)
    - Lần submit đầu tiên trong session: tạo bill OPEN nếu chưa có (Step 2.4)
    - Notify staff (sound + push notification)
    - Clear cart sau submit thành công

Draft → Canceled:
  Trigger: Customer đóng trình duyệt / bỏ cart / explicit clear
  Actor: Customer (self, implicit)
  Condition:
    - cart chưa submit (order chưa tồn tại như record)
  Action:
    - Release Redis cart key (TTL expiry hoặc explicit DEL)
    - KHÔNG tạo order record (nothing to cancel formally)
  Note: Transition này KHÔNG persist vì Draft chưa tạo DB row; code-level check trong ALLOWED_ORDER_TRANSITIONS cho FE disable "Submit" + cho BE reject replay nếu cart đã clear.

Pending → Processing:
  Trigger: Staff nhấn "Xác nhận"
  Actor: Staff, Manager (RBAC chi tiết: permission-matrix §6 / §6.1)
  Validation:
    - order_status == "Pending"
    - Catalog TCP: đủ tồn kho tại thời điểm confirm
  Action:
    - Catalog deduct stock (trong DB Catalog)
    - Update order_status = "Processing"
    - Route to KDS (Kafka order.confirmed + station từ `MenuItem.station`)
    - Print KOT if printer connected

Pending → Canceled:
  Trigger: Customer or Staff cancel
  Actor: Customer (self), Staff (reject pending — `order.cancel_pending`), Manager
  Condition:
    - order_status == "Pending"
    - confirmed == false
  Action:
    - Soft delete (set deleted_at, keep audit)
    - Log cancellation reason
    - Không restore stock (chưa deduct khi pending — đặc tả Step 2.4 Q2)
    - Notify customer

Processing → Canceled:
  Trigger: Manager cancel (+ Owner); optional policy restore stock qua Catalog
  Actor: Manager / Owner (`order.cancel_processing`)
  Condition:
    - order_status == "Processing"
    - Require cancellation reason
  Action:
    - Update order_status = "Canceled"
    - Log audit trail (who, when, why)
    - Notify kitchen to stop
    - Restore/adjust stock qua Catalog (đã deduct lúc confirm)
    - Flag for revenue report exclusion

Processing → Ready:
  Trigger: Kitchen marks as done
  Actor: Kitchen staff
  Action:
    - Update order_status = "Ready"
    - Notify service staff (ping)
    - Show on "Ready to serve" screen

Ready → Served:
  Trigger: Service staff confirms served
  Actor: Service staff
  Action:
    - Update order_status = "Served"
    - Remove from kitchen display
    - Enable payment request

Served → Completed:
  Trigger: Payment completed (Phase 3)
  Condition:
    - payment_status == "Paid"
    - bill canonical: `BillStatus` **PAID** (văn prose "Closed/Completed" = đã kết thúc thanh toán)
  Action:
    - Update order_status = "Completed"
    - Archive to read-only storage
    - Generate revenue record
```

---

## 9. PHÂN QUYỀN & ACTOR PERMISSIONS

Định nghĩa rõ ràng quyền hạn của từng vai trò trong hệ thống SaaS Multi-Tenant.

> **Kiến trúc Actor:** Mô tả theo **nhóm vai (business language)**; ma trận RBAC thực tế (6 roles × 66 permissions) là canonical tại [`docs/architecture/permission-matrix.md`](architecture/permission-matrix.md) §6.

> **Điều hướng ứng dụng quản trị:** `management-app` (Phase 2.x) dùng **role → tab/route** cho UX; **BFF** vẫn enforce **permission** từng endpoint. Xem [`docs/architecture/permission-matrix.md`](architecture/permission-matrix.md) §9 (nguyên tắc đồng bộ + tech debt).

### A. Actor Hierarchy & Roles

#### **1. Super Admin (Platform Administrator)**

**Phạm vi:** Toàn bộ nền tảng QRTable (Cross-Tenant)

- **Vai trò:** Quản trị viên hệ thống SaaS
- **Quyền hạn chính:**
  - Quản lý Tenants: Phê duyệt/Tạm khóa/Xóa nhà hàng
  - Quản lý Subscription Plans: Tạo/Sửa gói cước (Lite, Pro, Enterprise)
  - Theo dõi Revenue Platform: Doanh thu từ subscription fees
  - Cấu hình hệ thống: Payment gateways, System settings
  - Xem tất cả dữ liệu (cho mục đích support/debug)

**Microservice tương ứng:** Authorizer Service, User-Access Service, SaaS Service

---

#### **2. Restaurant Owner (Merchant Admin)**

**Phạm vi:** Tenant mà họ sở hữu

- **Vai trò:** Chủ nhà hàng — toàn quyền vận hành + HR (bao gồm xóa nhân viên)
- **Keycloak role:** `OWNER`
- **Permissions:** full operational (CRUD menu, tables, orders, payment, KDS), HR delete (`user.delete`), own-tenant SaaS visibility/checkout (`subscription.checkout`) và update payment settings (`payment_settings.update_own`).

**Microservice tương ứng:** User-Access Service, Catalog Service, Order Service, Payment Service, SaaS Service

---

#### **3. Manager (Operational Lead)**

**Phạm vi:** Tenant mà họ được phân công

- **Vai trò:** Quản lý vận hành ca làm việc — gần giống OWNER ở nghiệp vụ vận hành nhưng không có quyền tài chính/HR nhạy cảm.
- **Keycloak role:** `MANAGER`
- **Khác với OWNER:** không được xóa user, tạo/cancel subscription checkout, hoặc cập nhật SePay/payment settings; được xem tenant/subscription/plan/payment settings phục vụ vận hành.

**Microservice tương ứng:** Same as OWNER cho vận hành, cộng quyền xem SaaS/Payment settings trong phạm vi tenant

---

#### **4. Staff (Restaurant Employees)**

**Phạm vi:** Tenant mà họ được thuê

- **Vai trò:** Nhân viên nhà hàng
- **Sub-roles:**
  - **Waiter/Server (Phục vụ)**: Xác nhận đơn, xử lý thanh toán, chuyển bàn
  - **Chef (Bếp trưởng)**: Xem & cập nhật KDS món ăn
  - **Barista/Bartender (Pha chế)**: Xem & cập nhật KDS đồ uống

- **Quyền hạn chính:**
  - Xác nhận đơn hàng từ Customer
  - Cập nhật trạng thái món (Pending → Processing → Ready)
  - Xử lý thanh toán (Cash/Bank Transfer)
  - Chuyển bàn (Table transfer)
  - Đánh dấu bàn sạch (Cleaning → Available)
  - Hủy đơn chưa xác nhận (Pending only)
  - **KHÔNG có quyền:** Quản lý menu, xem báo cáo doanh thu, quản lý nhân viên

**Microservice tương ứng:** Order Service, Kitchen Service, Payment Service

---

#### **5. Customer (End User - Diner)**

**Phạm vi:** Chỉ Session/Table của chính họ

- **Vai trò:** Khách hàng đến nhà hàng
- **Đặc điểm:** Thường KHÔNG cần đăng nhập (Guest checkout để tối ưu UX)

- **Quyền hạn chính:**
  - Quét QR code để vào Menu
  - Xem menu điện tử (Digital Menu)
  - Đặt món qua QR (Add to cart, Submit order)
  - Xem trạng thái đơn hàng real-time
  - Thêm ghi chú món ("Không cay", "Ít muối")
  - Yêu cầu thanh toán (Request bill)
  - Hủy đơn chưa xác nhận (self-cancel)
  - **KHÔNG có quyền:** Xem đơn của bàn khác, xem giá nhập, xem báo cáo

**Microservice tương ứng:** Order Service, Menu Service

---

### B. Permission Matrix (Business-Language Summary)

> **Canonical source:** Chi tiết đầy đủ 6 roles × 66 permissions xem [`docs/architecture/permission-matrix.md`](architecture/permission-matrix.md#6-canonical-permission-matrix-6-roles--66-permissions). Bảng dưới đây là **tóm lược business-language** cho 5 nhóm actor, KHÔNG phải source of truth cho RBAC guard check.

| Tính năng                       | Super Admin | Restaurant Owner | Staff (Waiter) | Staff (Chef/Bar) | Customer |
| ------------------------------- | ----------- | ---------------- | -------------- | ---------------- | -------- |
| **Platform Management**         |             |                  |                |                  |          |
| Quản lý Tenants (Approve/Lock)  | ✅          | ❌               | ❌             | ❌               | ❌       |
| Tạo Subscription Plans          | ✅          | ❌               | ❌             | ❌               | ❌       |
| Xem tất cả Tenants              | ✅          | ❌               | ❌             | ❌               | ❌       |
| Cấu hình Payment Gateway        | ✅          | ❌               | ❌             | ❌               | ❌       |
| Checkout subscription tenant    | ❌          | ✅ (Owner only)  | ❌             | ❌               | ❌       |
| Xem gói/subscription tenant     | ✅          | ✅               | ❌             | ❌               | ❌       |
| Cập nhật SePay tenant           | ❌          | ✅ (Owner only)  | ❌             | ❌               | ❌       |
| **Restaurant Management**       |             |                  |                |                  |          |
| Quản lý Menu (CRUD)             | ✅ (Debug)  | ✅               | ❌             | ❌               | ❌       |
| Quản lý Tables & QR             | ❌          | ✅               | ⚠️ (View only) | ❌               | ❌       |
| Quản lý Staff                   | ❌          | ✅               | ❌             | ❌               | ❌       |
| Xem Analytics/Revenue           | ✅ (All)    | ✅ (Own only)    | ❌             | ❌               | ❌       |
| Cấu hình Restaurant Settings    | ❌          | ✅               | ❌             | ❌               | ❌       |
| **Order Operations**            |             |                  |                |                  |          |
| Quét QR & Xem Menu              | ❌          | ✅               | ✅             | ❌               | ✅       |
| Đặt món qua QR                  | ❌          | ❌               | ❌             | ❌               | ✅       |
| Xác nhận đơn (Pending → Proc.)  | ❌          | ✅               | ✅             | ❌               | ❌       |
| Hủy đơn chưa xác nhận           | ❌          | ✅               | ✅             | ❌               | ✅ (Own) |
| Hủy đơn đã vào bếp              | ❌          | ✅ (Manager)     | ❌             | ❌               | ❌       |
| Cập nhật KDS (Ready/Processing) | ❌          | ✅               | ❌             | ✅               | ❌       |
| Xem trạng thái đơn hàng         | ✅ (Debug)  | ✅ (All orders)  | ✅ (All)       | ✅ (KDS only)    | ✅ (Own) |
| **Table & Payment**             |             |                  |                |                  |          |
| Chuyển bàn (Table Transfer)     | ❌          | ✅               | ✅             | ❌               | ❌       |
| Xử lý thanh toán                | ❌          | ✅               | ✅             | ❌               | ❌       |
| Yêu cầu thanh toán              | ❌          | ❌               | ❌             | ❌               | ✅       |
| Đánh dấu bàn sạch               | ❌          | ✅               | ✅             | ❌               | ❌       |

---

### C. Authorization Logic & Business Rules

```yaml
Multi-Tenant Authorization Middleware:

  STEP 1: Identify Actor Type
    IF request.path.startsWith('/admin/platform') THEN
      required_actor = "Super Admin"
    ELSE IF request.path.startsWith('/restaurant') THEN
      required_actor IN ["Restaurant Owner", "Manager", "Staff"]
    ELSE IF request.path.startsWith('/menu') THEN
      required_actor = "Customer" OR "Staff"

  STEP 2: Verify Authentication
    IF required_actor != "Customer" THEN
      token = request.headers.authorization
      IF !token OR !verify_jwt(token) THEN
        RETURN 401 Unauthorized

      user = decode_jwt(token)
    ELSE
      # Customer có thể anonymous hoặc có session_id
      session = request.cookies.session_id OR generate_guest_session()

  STEP 3: Check Actor Permissions
    IF required_actor == "Super Admin" THEN
      IF user.role != "SUPER_ADMIN" THEN
        RETURN 403 Forbidden
      # Super Admin bypass tenant check
      PROCEED

    IF required_actor IN ["Restaurant Owner", "Manager"] THEN
      IF user.role NOT IN ["OWNER", "MANAGER"] THEN
        RETURN 403 Forbidden
      # Check tenant ownership
      IF user.tenant_id != requested_resource.tenant_id THEN
        RETURN 403 Forbidden "Cannot access other restaurant's data"

    IF required_actor == "Staff" THEN
      IF user.role NOT IN ["STAFF", "WAITER", "CHEF", "BARISTA"] THEN
        RETURN 403 Forbidden
      # Check staff assignment
      IF user.tenant_id != requested_resource.tenant_id THEN
        RETURN 403 Forbidden

    IF required_actor == "Customer" THEN
      # Customer chỉ thấy dữ liệu của session/table của mình
      IF session.table_id != requested_resource.table_id THEN
        RETURN 403 Forbidden "Cannot view other table's orders"

  STEP 4: Action-Level Authorization
    # Ví dụ: Hủy đơn đã vào bếp
    IF action == "cancel_order" AND order.status == "Processing" THEN
      IF user.role NOT IN ["OWNER", "MANAGER"] THEN
        RETURN 403 Forbidden "Only Manager can cancel processing orders"

      # Require cancellation reason
      IF !request.body.cancel_reason THEN
        RETURN 400 Bad Request "Cancellation reason required"

      # Log audit trail
      audit_log.create({
        actor: user.id,
        action: "cancel_order",
        resource: order.id,
        reason: request.body.cancel_reason,
        timestamp: now()
      })
```

---

### D. Tenant Isolation Rules (CRITICAL for SaaS)

```yaml
Database Level Isolation:
  # Mọi query phải filter theo tenant_id
  SELECT * FROM orders WHERE tenant_id = :current_tenant_id

  # Global Index phải bao gồm tenant_id
  CREATE INDEX idx_orders_tenant ON orders(tenant_id, created_at)

  # Foreign Keys phải trong cùng tenant
  CONSTRAINT fk_order_table
    FOREIGN KEY (table_id)
    REFERENCES tables(id)
    WHERE tables.tenant_id = orders.tenant_id

API Level Isolation:
  # Middleware tự động inject tenant_id
  IF user.role == "SUPER_ADMIN" THEN
    # Super Admin có thể query cross-tenant bằng query param
    tenant_id = request.query.tenant_id OR NULL
  ELSE
    # Tất cả actors khác chỉ thấy tenant của mình
    tenant_id = user.tenant_id

  # Override mọi filter từ client
  query.where('tenant_id', tenant_id)

Session/Cache Isolation:
  # Cache key phải bao gồm tenant_id
  cache_key = "menu:#{tenant_id}:#{category_id}"

  # Session storage phải isolated
  redis.setex("session:#{tenant_id}:#{session_id}", data)

File Storage Isolation:
  # Upload files vào folder riêng theo tenant
  file_path = "uploads/#{tenant_id}/menu_images/#{file_name}"

  # Presigned URL phải verify tenant ownership
  IF file.tenant_id != user.tenant_id THEN
    RETURN 403 Forbidden
```

---

### E. Special Authorization Cases

#### **Case 1: Manager Override Staff Actions**

```yaml
Scenario: Manager muốn hủy đơn mà Staff đã xác nhận

  IF user.role == "MANAGER" AND action == "override_staff_action" THEN
    original_action = audit_log.find(action_id)

    # Manager chỉ override được trong cùng tenant
    IF original_action.tenant_id != user.tenant_id THEN
      RETURN 403 Forbidden

    # Log override action
    audit_log.create({
      actor: user.id,
      action: "override",
      original_action: action_id,
      reason: request.body.reason
    })

    # Thực hiện action mới
    PROCEED with requested change
```

#### **Case 2: Super Admin Debug Mode**

```yaml
Scenario: Super Admin cần xem dữ liệu của một tenant để support

  IF user.role == "SUPER_ADMIN" AND request.query.debug_mode == true THEN
    tenant_id = request.query.tenant_id

    # Log debug access (for compliance)
    admin_audit_log.create({
      admin_id: user.id,
      action: "debug_access",
      tenant_id: tenant_id,
      reason: request.query.reason,
      ip_address: request.ip
    })

    # Temporary impersonation
    context.set_tenant(tenant_id)
    context.set_actor("SUPER_ADMIN_DEBUG")

    PROCEED with READ-ONLY access
```

#### **Case 3: Customer Self-Service Cancellation**

```yaml
Scenario: Khách hủy đơn mình vừa đặt

  IF user.actor_type == "Customer" AND action == "cancel_order" THEN
    order = Order.find(order_id)

    # Verify ownership via session
    IF order.session_id != customer.session_id THEN
      RETURN 403 Forbidden "Not your order"

    # Chỉ được hủy khi chưa xác nhận
    IF order.status != "Pending" OR order.confirmed == true THEN
      RETURN 400 Bad Request "Cannot cancel confirmed order. Please ask staff for help."

    # Soft cancel only; no stock restore because pending orders have not deducted stock
    order.update(status: "Canceled", canceled_by: "Customer", canceled_at: now())
```

---

### F. Actor Mapping to Microservices

| Actor                | Primary Microservices                               | Authentication Method |
| -------------------- | --------------------------------------------------- | --------------------- |
| **Super Admin**      | Authorizer, User-Access, SaaS, BFF                  | JWT (Session-based)   |
| **Restaurant Owner** | Catalog, User-Access, Order, Kitchen, Payment, SaaS | JWT (Session-based)   |
| **Staff**            | Catalog, Order, Kitchen, Payment                    | JWT (Session-based)   |
| **Customer**         | Catalog/Menu, Order, Payment                        | Session ID (Guest)    |
| **External System**  | Payment Gateway, Printing, Delivery Integration     | API Key + Webhook     |

---

## III. CÁC QUY TRÌNH PHỤ VÀ MỞ RỘNG (EXTENDED FEATURES)

- **Quản lý Nhân sự:** Thiết lập hệ thống phân quyền chi tiết (Admin, Quản lý, Phục vụ, Bếp).
- **Quản lý yêu cầu phục vụ** Khách có thể gửi yêu cầu thêm (Gọi thêm món, Gọi tính tiền) hoặc yêu cầu hỗ trợ từ nhân viên phục vụ qua Web-app.
- **Báo cáo Doanh thu (Analytics):** Thống kê chi tiết theo thời gian, món bán chạy, giờ cao điểm.
- **Quản lý Kho Đơn giản (Inventory):** Thiết lập định lượng nguyên liệu cho món ăn (Ví dụ: 1 bát phở hết 200g thịt), tự động trừ kho khi phát sinh đơn hàng.
