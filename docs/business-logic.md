# TÀI LIỆU NGHIỆP VỤ HỆ THỐNG QUẢN LÝ NHÀ HÀNG

> **PHÂN TÍCH DỰA TRÊN QRTABLE.IO LÀM TÔN CHỈ**

Tài liệu này mô tả chi tiết các luồng nghiệp vụ cốt lõi, từ thiết lập ban đầu đến vận hành nhà hàng hàng ngày, tập trung vào mô hình đặt món tại bàn sử dụng mã QR (QR-based table ordering).

---

## 1. LUỒNG KHỞI TẠO VÀ THIẾT LẬP NHÀ HÀNG (ONBOARDING & MULTI-TENANCY)

> **LƯU Ý:** Hệ thống là một **SaaS Platform** với mô hình Multi-Tenant. Quy trình này do **Super Admin** quản lý ở tầng Platform.

Đây là quá trình chuyển đổi một người dùng thông thường thành một Chủ nhà hàng (Merchant/Restaurant Owner/Tenant) trên nền tảng, cho phép họ sở hữu một thực thể kinh doanh độc lập.

### A. Các bước thiết lập

1.  **Đăng ký Định danh:**
    - Người dùng cung cấp thông tin cơ bản (Email/SĐT, mật khẩu).
    - Hệ thống thực hiện xác thực (OTP/Email Verification). Ở bước này, người dùng chỉ là tài khoản cá nhân, chưa phải chủ cửa hàng.

2.  **Khởi tạo Thực thể Nhà hàng (Tenant Creation):**
    - Khai báo thông tin doanh nghiệp: Tên quán, Loại hình (Café, Nhà hàng, Pub...), Địa chỉ.
    - **Logic Cốt lõi:** Hệ thống tự động sinh ra một Slug/Subdomain duy nhất (ví dụ: `the-coffee-house.qrtable.io`) làm định danh thương hiệu trên Internet.

3.  **Lựa chọn Gói Dịch vụ (Subscription):**
    - Chủ quán chọn gói cước (Miễn phí, Cơ bản, Cao cấp).
    - **Quy tắc:** Gói cước giới hạn tính năng và quy mô (ví dụ: Gói Miễn phí chỉ cho phép tối đa 10 bàn, không có báo cáo nâng cao). Ghi nhận ngày bắt đầu và kết thúc gói.
    - **Actor quản lý:** Super Admin thiết lập Pricing Plans, Restaurant Owner chọn gói phù hợp.

4.  **Thiết lập Cấu hình Vận hành:**
    - **Mặc định Việt Nam:** Hệ thống tự động cấu hình đơn vị tiền tệ VND, ngôn ngữ Tiếng Việt.
    - **Chế độ hoạt động:** Khách hàng có thể vừa đặt món trực tiếp (Instant Order) vừa xem Menu điện tử (Digital Menu).

### B. Quy tắc Nghiệp vụ Chủ yếu (Business Rules)

- **Cô lập Dữ liệu (Tenant Isolation):** Đảm bảo dữ liệu (đơn hàng, doanh thu, khách hàng) của cửa hàng này hoàn toàn tách biệt và không hiển thị cho cửa hàng khác.
- **Trạng thái Hoạt động:** Cửa hàng có các trạng thái: `Active` (Hoạt động), `Suspended` (Tạm khóa do hết hạn gói cước), `Closed` (Đóng cửa tạm thời).
  - **Actor:** Super Admin có quyền Suspend/Active tenant khi vi phạm chính sách hoặc hết hạn subscription.
- **Phân quyền Ban đầu:** Người tạo cửa hàng mặc định là **Restaurant Owner** (Toàn quyền trong phạm vi Tenant) và có quyền mời thêm Staff vào làm việc.

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
- **Đồng bộ Real-time:** Mọi thay đổi về giá hoặc trạng thái `Out of Stock` phải được cập nhật tức thì trên giao diện khách hàng (WebSocket/Server-Sent Events).
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
    Validate: new_table_status == "Available"

    BEGIN TRANSACTION
      UPDATE orders SET table_id = new_table_id WHERE table_id = old_table_id
      UPDATE sessions SET table_id = new_table_id WHERE table_id = old_table_id

      UPDATE tables SET status = "Available" WHERE id = old_table_id
      UPDATE tables SET status = "Occupied" WHERE id = new_table_id

      Notify KDS: "Bàn [old] → Bàn [new]"
    COMMIT
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
  BEGIN TRANSACTION (Pessimistic Locking)
    SELECT stock FROM menu_items WHERE id = X FOR UPDATE
    IF stock >= requested_quantity THEN
      UPDATE stock = stock - requested_quantity
      CREATE order_item
      COMMIT
    ELSE
      ROLLBACK
      RETURN error "Món đã hết, vui lòng chọn món khác"
  END TRANSACTION

  Broadcast real-time stock update to all active clients
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
    - **Logic Gộp đơn (Batching):** KDS hiển thị tổng số lượng của cùng một món đang chờ từ nhiều bàn (Ví dụ: "Tổng: 5 bát Phở bò"), giúp tối ưu hiệu suất nấu nướng.

4.  **Hoàn thành Chế biến (Ready to Serve):**
    - Đầu bếp nhấn "Hoàn thành" (Done/Ready). Thẻ biến mất khỏi màn hình bếp.
    - **Kích hoạt Thông báo (Ping):** Hệ thống gửi thông báo ngay lập tức đến nhân viên phục vụ: "Bàn 05 - Món Phở bò đã xong".

5.  **Thu hồi/Sửa lỗi (Recall Logic):**
    - Cho phép đầu bếp thu hồi lại thẻ đã lỡ tay nhấn "Hoàn thành" để quay lại trạng thái đang chế biến.

### B. Quy tắc Nghiệp vụ Chủ yếu

- **FIFO (First In - First Out):** Đơn hàng vào trước phải hiển thị trước.
- **Cảnh báo Trễ (SLA Warning):** Thẻ món quá X phút chưa hoàn thành phải đổi màu/nhấp nháy để cảnh báo quá tải/quên đơn.
- **Đồng bộ Trạng thái:** Trạng thái trên KDS phải đồng bộ tuyệt đối với trạng thái khách hàng thấy trên điện thoại.
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
    - **Thanh toán Chuyển khoản (Bank Transfer):**

      ```
      Hệ thống sinh QR VietQR động với:
        - Số tiền chính xác (Total)
        - Nội dung: "[TenQuan] Ban [SoBan] [BillID]"

      Khách quét QR và chuyển khoản

      Webhook từ ngân hàng → Auto verify
      IF transaction.amount == bill.total AND transaction.content == bill.reference
      THEN payment_status = "Paid", payment_method = "Bank Transfer"
      ```

      > **Lưu ý kiến trúc (2026-04):** Thanh toán chuyển khoản được xử lý thông qua Stripe Payment Methods (hỗ trợ PromptPay và các phương thức local), không tích hợp VietQR API riêng biệt. Xem `technical-architecture.md` §6.2.7 — Payment Service.

4.  **In Hóa đơn & Giải phóng Bàn (Closing):**
    - In hóa đơn giấy.
    - **Đóng phiên (Close Session):** Ghi nhận doanh thu, cập nhật trạng thái bàn về `Available` (Trống).

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
    - Create order record
    - Notify staff (sound + push notification)
    - Lock cart (prevent editing)

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
  Actor: Staff, Manager
  Validation:
    - order_status == "Pending"
    - all_items still Available (check stock)
  Action:
    - Update order_status = "Processing"
    - Route to KDS (Kitchen/Bar)
    - Print KOT if printer connected
    - Deduct stock quantity

Pending → Canceled:
  Trigger: Customer or Staff cancel
  Actor: Customer (self), Staff, Manager
  Condition:
    - order_status == "Pending"
    - confirmed == false
  Action:
    - Soft delete (set deleted_at, keep audit)
    - Log cancellation reason
    - Restore stock
    - Notify customer

Processing → Canceled:
  Trigger: Manager cancel
  Actor: Manager only
  Condition:
    - order_status == "Processing"
    - Require cancellation reason
  Action:
    - Update order_status = "Canceled"
    - Log audit trail (who, when, why)
    - Notify kitchen to stop
    - Restore stock
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
  Trigger: Payment completed and bill closed
  Condition:
    - payment_status == "Paid"
    - bill_status == "Closed"
  Action:
    - Update order_status = "Completed"
    - Archive to read-only storage
    - Generate revenue record
```

---

## 9. PHÂN QUYỀN & ACTOR PERMISSIONS

Định nghĩa rõ ràng quyền hạn của từng vai trò trong hệ thống SaaS Multi-Tenant.

> **Kiến trúc Actor:** Mô tả theo **nhóm vai (business language)**; ma trận RBAC thực tế (6 roles × 51 permissions) là canonical tại [`docs/architecture/permission-matrix.md`](architecture/permission-matrix.md) §6.

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

**Microservice tương ứng:** Identity Service, SaaS Management Service

---

#### **2. Restaurant Owner (Merchant Admin)**

**Phạm vi:** Tenant mà họ sở hữu

- **Vai trò:** Chủ nhà hàng — toàn quyền vận hành + HR (bao gồm xóa nhân viên)
- **Keycloak role:** `OWNER`
- **Permissions:** full operational (CRUD menu, tables, orders, payment, KDS) + `USER_DELETE` (phân biệt duy nhất với MANAGER)

**Microservice tương ứng:** User-Access Service, Catalog Service, Order Service

---

#### **3. Manager (Operational Lead)**

**Phạm vi:** Tenant mà họ được phân công

- **Vai trò:** Quản lý vận hành ca làm việc — same as OWNER trừ `USER_DELETE`
- **Keycloak role:** `MANAGER`
- **Khác với OWNER:** không được xóa user (HR action giữ cho OWNER)

**Microservice tương ứng:** Same as OWNER (User-Access, Catalog, Order)

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

> **Canonical source:** Chi tiết đầy đủ 6 roles × 51 permissions xem [`docs/architecture/permission-matrix.md`](architecture/permission-matrix.md#6-canonical-permission-matrix-6--51). Bảng dưới đây là **tóm lược business-language** cho 5 nhóm actor, KHÔNG phải source of truth cho RBAC guard check.

| Tính năng                       | Super Admin | Restaurant Owner | Staff (Waiter) | Staff (Chef/Bar) | Customer |
| ------------------------------- | ----------- | ---------------- | -------------- | ---------------- | -------- |
| **Platform Management**         |             |                  |                |                  |          |
| Quản lý Tenants (Approve/Lock)  | ✅          | ❌               | ❌             | ❌               | ❌       |
| Tạo Subscription Plans          | ✅          | ❌               | ❌             | ❌               | ❌       |
| Xem tất cả Tenants              | ✅          | ❌               | ❌             | ❌               | ❌       |
| Cấu hình Payment Gateway        | ✅          | ❌               | ❌             | ❌               | ❌       |
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

    # Soft delete & restore stock
    order.update(status: "Canceled", canceled_by: "Customer", canceled_at: now())
    inventory.restore_stock(order.items)
```

---

### F. Actor Mapping to Microservices

| Actor                | Primary Microservices                           | Authentication Method |
| -------------------- | ----------------------------------------------- | --------------------- |
| **Super Admin**      | Identity, SaaS Management, Analytics            | JWT (Long-lived)      |
| **Restaurant Owner** | Restaurant, Catalog, Staff Management           | JWT (Session-based)   |
| **Staff**            | Order, Kitchen, Payment, Notification           | JWT (Session-based)   |
| **Customer**         | Menu, Order                                     | Session ID (Guest)    |
| **External System**  | Payment Gateway, Printing, Delivery Integration | API Key + Webhook     |

---

## III. CÁC QUY TRÌNH PHỤ VÀ MỞ RỘNG (EXTENDED FEATURES)

- **Quản lý Nhân sự:** Thiết lập hệ thống phân quyền chi tiết (Admin, Quản lý, Phục vụ, Bếp).
- **Quản lý yêu cầu phục vụ** Khách có thể gửi yêu cầu thêm (Gọi thêm món, Gọi tính tiền) hoặc yêu cầu hỗ trợ từ nhân viên phục vụ qua Web-app.
- **Báo cáo Doanh thu (Analytics):** Thống kê chi tiết theo thời gian, món bán chạy, giờ cao điểm.
- **Quản lý Kho Đơn giản (Inventory):** Thiết lập định lượng nguyên liệu cho món ăn (Ví dụ: 1 bát phở hết 200g thịt), tự động trừ kho khi phát sinh đơn hàng.
