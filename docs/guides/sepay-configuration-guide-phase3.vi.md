# Hướng dẫn cấu hình SePay cho QRTable — Phase 3 (VietQR + Webhook)

Tài liệu này mô tả **từ đầu đến cuối** các bước cần làm **ngoài codebase** (dashboard SePay, tài khoản ngân hàng, URL public, biến môi trường) để luồng **VietQR tĩnh + nhận giao dịch qua Bank Hub** hoạt động cùng BFF/Payment Service theo thiết kế Phase 3.

**Tham chiếu nội bộ:** [phase-3-payment.md](../phases/phase-3-payment.md)  
**Tham chiếu kỹ thuật SePay (Context7 — `developer.sepay.vn`):** webhook Bank Hub, payload JSON, header `X-Secret-Key`, API sandbox.

---

## 1. Bạn đang tích hợp “nhánh” nào của SePay?

SePay có nhiều sản phẩm. **QRTable Phase 3** dùng mô hình:

| Thành phần | Vai trò |
| ---------- | ------- |
| **VietQR (ảnh QR)** | Build URL `https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...` — **không redirect**, nhúng `<img>` trên POS/PWA. |
| **Bank Hub / Webhook giao dịch** | Khi có biến động tiền vào tài khoản đã kết nối, SePay **POST JSON** tới URL webhook bạn cấu hình; xác thực bằng header **`X-Secret-Key`** nếu chọn kiểu **`SECRET_KEY`**. |

**Không nhầm với:** IPN / “Cổng thanh toán” (schema JSON khác, ví dụ có `notification_type`, `order`, `transaction` — xem tài liệu IPN trên [developer.sepay.vn](https://developer.sepay.vn)). Backend Phase 3 của bạn khớp với **payload Bank Hub** có các field kiểu `id`, `transferType`, `transferAmount`, `code`, `content`, … như mục tài liệu [Tích hợp webhook](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook).

---

## 2. Chuẩn bị trước khi mở dashboard

1. **Quyết định môi trường**
   - **Sandbox:** phù hợp dev/demo; có API giả lập giao dịch (xem mục 9).
   - **Production:** cần domain HTTPS thật, tài khoản ngân hàng nhận tiền thật đã liên kết SePay.

2. **Chuẩn bị URL webhook phía QRTable (BFF)**  
   Endpoint đích sau khi triển khai code (theo tài liệu repo):

   ```text
   https://<bff-host>/api/v1/payment/sepay/webhook
   ```

   - `<bff-host>`: hostname public của BFF (local dev thường cần **tunnel** — xem mục 8).
   - **HTTPS** là chuẩn cho production; tài liệu API Bank Hub cũng ghi nhận yêu cầu HTTPS khi vận hành thật.

3. **Chuẩn bị giá trị env khớp SePay**
   - `SEPAY_WEBHOOK_SECRET` — phải **trùng** với `secret_key` bạn đặt khi tạo/cập nhật webhook trên SePay.
   - `PAYMENT_SEPAY_QR_ACCOUNT`, `PAYMENT_SEPAY_QR_BANK` — **đúng** tài khoản nhận tiền dùng trong URL VietQR (`acc`, `bank`).
   - `BILL_REF_PREFIX` — mặc định dự án dùng `QRTBL` (mã tham chiếu bill trong nội dung CK).

---

## 3. Bước 1 — Tài khoản SePay và liên kết ngân hàng

**Mục tiêu:** SePay có quyền đọc biến động sao kê / SMS (tùy cấu hình thực tế) để phát hiện chuyển khoản vào đúng **số tài khoản** bạn dùng trong QR.

1. Đăng ký / đăng nhập [SePay](https://sepay.vn) (hoặc môi trường sandbox theo hướng dẫn SePay).
2. Trong dashboard, thực hiện **kết nối tài khoản ngân hàng** doanh nghiệp (hoặc tài khoản sandbox tương đương).
3. Ghi lại:
   - **Số tài khoản** (`acc` trong URL VietQR).
   - **Tên ngân hàng** đúng định dạng SePay (ví dụ `Vietcombank`) — tham số `bank` trong URL VietQR.

**Giải thích:** VietQR của dự án **không gọi API SePay để “tạo đơn”** trước khi hiển thị QR; chỉ cần URL đúng + SePay nhận được giao dịch vào đúng TK là webhook mới có thể bắn về BFF.

---

## 4. Bước 2 — Cấu hình Webhook (Bank Hub)

**Mục tiêu:** Mỗi khi có giao dịch **tiền vào** (`transferType`: `in`), SePay **POST** JSON tới server của bạn.

### 4.1. Các field quan trọng (theo tài liệu SePay)

- **`webhook_url`:** URL đầy đủ HTTPS của BFF, ví dụ:

  `https://api.yourdomain.com/api/v1/payment/sepay/webhook`

- **`auth_type`:** chọn **`SECRET_KEY`** — SePay sẽ gửi header **`X-Secret-Key`** (chỉ khi bạn cấu hình kiểu này).
- **`secret_key`:** chuỗi bí mật; bạn copy **cùng một giá trị** vào env `SEPAY_WEBHOOK_SECRET` phía BFF.
- **`active`:** bật webhook (ví dụ `1`).
- **`allow_events`:** phụ thuộc UI/API SePay; có thể dùng `["*"]` để nhận đủ sự kiện (theo ví dụ API upsert webhook trong tài liệu Bank Hub). Với Phase 3, luồng chính là **giao dịch tiền vào** — đảm bảo không tắt nhầm loại sự kiện liên quan.

### 4.2. Hai cách tạo/cập nhật (chọn một)

**Cách A — Qua dashboard SePay (phổ biến cho người vận hành)**  
Vào phần quản lý **Webhook / Bank Hub** (tên menu có thể thay đổi theo bản dashboard), điền các field tương ứng mục 4.1.

**Cách B — Qua API (sandbox)**  
Tài liệu SePay mô tả endpoint upsert webhook, ví dụ:

- `POST https://bankhub-api-sandbox.sepay.vn/v1/webhook`
- Body JSON gồm `webhook_url`, `auth_type`, `secret_key`, `active`, `allow_events` (cần **access token** hợp lệ theo hướng dẫn OAuth/API của SePay).

**Lưu ý SSRF / URL:** API có thể từ chối URL không hợp lệ hoặc IP nội bộ — dùng hostname public (tunnel hoặc staging).

---

## 5. Bước 3 — Hiểu payload webhook (để test đúng)

Theo [Tích hợp webhook](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook), body gồm các field tiêu biểu:

| Field | Ý nghĩa ngắn |
| ----- | ------------ |
| `id` | ID giao dịch trên SePay |
| `gateway` | Tên/ngân hàng |
| `transactionDate` | Thời gian |
| `accountNumber` | STK |
| `code` | **Tùy chọn** — mã thanh toán SePay cố gắng nhận diện từ nội dung; có thể `null` |
| `content` | Nội dung chuyển khoản |
| `transferType` | `in` = tiền vào, `out` = tiền ra |
| `transferAmount` | Số tiền (VND, integer) |
| `referenceCode`, `description` | Tham chiếu / SMS raw |

**Phase 3 QRTable** chỉ xử lý **`transferType === "in"`** và khớp mã bill (`QRTBL` + 8 ký tự) qua `code` hoặc regex trên `content` — xem [phase-3-payment.md](../phases/phase-3-payment.md).

---

## 6. Bước 4 — Cấu hình nhận diện “mã thanh toán” (prefix `QRTBL`)

Theo tài liệu SePay, field `code` được điền khi SePay **nhận diện được** pattern trong nội dung — cấu hình nằm tại **Công ty → Cấu hình chung** (dashboard).

**Việc bạn cần làm cho QRTable:**

1. Bật / cấu hình nhận diện mã có prefix **`QRTBL`** (khớp `BILL_REF_PREFIX` trong env).
2. Mục đích: khi khách chuyển khoản với nội dung chứa `QRTBLXXXXXXXX`, webhook có thể có `code` khác `null`, giúp khớp bill nhanh hơn; nếu vẫn `null`, backend vẫn có thể fallback regex trên `content`.

---

## 7. Bước 5 — Đồng bộ biến môi trường ứng dụng

Sau khi đã có giá trị từ SePay và tài khoản ngân hàng, cấu hình phía monorepo (BFF + Payment Service — đúng file `.env` / secret manager của bạn):

| Biến | Nguồn sự thật |
| ---- | ------------- |
| `SEPAY_WEBHOOK_SECRET` | Trùng `secret_key` webhook (header `X-Secret-Key`) |
| `BFF_PAYMENT_TCP_TIMEOUT_MS` | Timeout BFF chờ Payment Service qua TCP; mặc định `5000` |
| `PAYMENT_SEPAY_QR_ACCOUNT` | STK nhận tiền (giống `acc` trong URL VietQR) |
| `PAYMENT_SEPAY_QR_BANK` | Tên ngân hàng SePay chấp nhận (giống `bank` trong URL) |
| `PAYMENT_ORDER_TCP_TIMEOUT_MS` | Timeout Payment Service chờ Order Service qua TCP; mặc định `5000` |
| `BILL_REF_PREFIX` | Thường là `QRTBL` |

**Giải thích xác thực:** SePay gửi header `X-Secret-Key`; BFF so sánh byte-by-byte với `SEPAY_WEBHOOK_SECRET` — **không** dùng HMAC raw body kiểu Stripe (theo phase 3).

**Giải thích phản hồi:** endpoint webhook trả raw body `{"success": true}` sau khi đã chuyển payload sang Payment Service. Không dùng `ResponseDto` wrapper cho riêng callback này, vì tài liệu SePay yêu cầu body thành công đúng dạng `{"success": true}` và hoàn tất trong 30 giây.

---

## 8. Bước 6 — Dev local: làm sao để SePay gọi được máy bạn?

SePay gửi webhook **từ internet** tới `webhook_url`. Máy `localhost` **không** nhận trực tiếp trừ khi bạn dùng:

- **Tunnel HTTPS:** ngrok, Cloudflare Tunnel, localtunnel, …  
- Hoặc deploy BFF lên **staging có HTTPS**.

**Checklist nhanh:**

- [ ] URL trong dashboard SePay **chính xác** path `/api/v1/payment/sepay/webhook`
- [ ] Tunnel trỏ đúng port BFF (thường `3000` theo AGENTS.md)
- [ ] Firewall / security group cho phép inbound (nếu staging)

---

## 9. Bước 7 — Test sandbox bằng API giả lập giao dịch (tùy chọn nhưng nên làm)

Tài liệu SePay mô tả endpoint **chỉ sandbox**:

```http
POST https://bankhub-api-sandbox.sepay.vn/v1/transaction/create
```

Body gồm:

- `bank_account_xid` (UUID tài khoản ngân hàng đã đăng ký trong Bank Hub)
- `transfer_type`: `credit` (tiền vào)
- `amount`: số tiền VND
- `transaction_content`: nên chứa mã `QRTBL...` giống luồng thật

Yêu cầu kèm **access token** OAuth/API (401 nếu sai token). Endpoint này giúp **kiểm tra webhook end-to-end** mà không cần chuyển khoản ngân hàng thật.

---

## 10. Bước 8 — Test thủ công end-to-end (khuyến nghị trước khi demo)

1. Chạy BFF + Payment + dependency (Order, …) theo plan triển khai.
2. Từ POS/PWA, tạo VietQR cho một bill (URL chứa `amount` đã làm tròn và `des` chứa mã `QRTBL...`).
3. Thực hiện chuyển khoản **sandbox hoặc thật** đúng số tiền và nội dung.
4. Quan sát:
   - Log BFF: có request `POST` webhook không? Header `X-Secret-Key` có khớp không?
   - Payment Service: payment chuyển `PAID`, emit Kafka nếu đã nối.

---

## 11. Checklist tóm tắt (in ra và tick)

| # | Việc cần làm | Đã xong |
| - | ------------ | ------- |
| 1 | Có tài khoản SePay + liên kết STK nhận tiền | ☐ |
| 2 | Webhook URL = `https://<bff>/api/v1/payment/sepay/webhook` | ☐ |
| 3 | `auth_type = SECRET_KEY`, đặt `secret_key` | ☐ |
| 4 | Copy `secret_key` → `SEPAY_WEBHOOK_SECRET` | ☐ |
| 5 | `PAYMENT_SEPAY_QR_ACCOUNT` / `PAYMENT_SEPAY_QR_BANK` khớp VietQR | ☐ |
| 6 | Cấu hình nhận diện prefix `QRTBL` (Công ty → Cấu hình chung) | ☐ |
| 7 | BFF public HTTPS (tunnel/staging) cho dev | ☐ |
| 8 | Test sandbox `transaction/create` hoặc CK thật | ☐ |

---

## 12. Xử lý sự cố thường gặp

| Triệu chứng | Hướng xử lý |
| ----------- | ----------- |
| Webhook không tới BFF | Kiểm tra URL SePay, tunnel còn sống, path đúng `/api/v1/payment/sepay/webhook`. |
| 401 Unauthorized | Sai `X-Secret-Key` hoặc env `SEPAY_WEBHOOK_SECRET` lệch ký tự / khoảng trắng. |
| Có webhook nhưng không khớp bill | `content` không chứa `QRTBL...`; hoặc số tiền `< rounded_total`; hoặc `transferType` không phải `in`. |
| `code` luôn `null` | Kiểm tra lại cấu hình nhận diện mã tại SePay; vẫn có thể khớp qua regex `content` nếu nội dung đủ. |

---

## 13. Nguồn tham chiếu (Context7 / SePay)

- **Library ID (Context7):** `/websites/developer_sepay_vn`
- **Webhook Bank Hub:** [Tích hợp webhook](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook), [Bắt đầu nhanh](https://developer.sepay.vn/vi/sepay-webhooks/bat-dau-nhanh)
- **Xác minh `X-Secret-Key`:** [Cập nhật webhook (Bank Hub API)](https://developer.sepay.vn/vi/bankhub/api/api-webhook/cap-nhat-webhook)
- **Giả lập giao dịch sandbox:** [Giả lập giao dịch](https://developer.sepay.vn/vi/bankhub/api/api-giao-dich/gia-lap-giao-dich)
- **IPN / cổng thanh toán (schema khác):** [IPN](https://developer.sepay.vn/vi/cong-thanh-toan/IPN) — dùng khi tích hợp sản phẩm “cổng thanh toán”, **không** thay thế payload Bank Hub của Phase 3 nếu bạn đang theo VietQR + webhook giao dịch như tài liệu phase.

---

*Nếu dashboard SePay thay đổi tên menu, hãy đối chiếu lại mục “Webhook / Bank Hub” và “Công ty → Cấu hình chung” trên tài liệu chính thức mới nhất tại [developer.sepay.vn](https://developer.sepay.vn).*
