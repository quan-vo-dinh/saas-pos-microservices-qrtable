# Kịch bản demo trực tiếp QRTable: QR → Cart → Order → KDS → VietQR

## 1. Mục đích và phạm vi

Tài liệu này là kịch bản nội bộ cho phần demo trực tiếp sau bài thuyết trình. Thời lượng mục tiêu là **5–7 phút**. Demo sử dụng một laptop trình chiếu cho toàn bộ giao diện QRTable, RedisInsight và Kafka UI/Kafkio; điện thoại riêng chỉ dùng để thực hiện chuyển khoản ngân hàng.

Trục demo duy nhất:

`QR URL → giỏ món → gửi đơn → POS xác nhận → order.confirmed → KDS → đã phục vụ → VietQR → payment.completed → hóa đơn hoàn tất`

Demo nhằm chứng minh ba lớp:

1. **Hành vi nghiệp vụ trên giao diện:** khách đặt món, nhân viên xác nhận, bếp xử lý và khách thanh toán.
2. **Trạng thái phục vụ nhanh trong Redis:** Kitchen tạo và cập nhật KDS runtime projection.
3. **Sự kiện sau commit trong Kafka:** `order.confirmed` và `payment.completed` xuất hiện sau các mốc nghiệp vụ tương ứng.

Demo không dùng để tuyên bố:

- Kafka hoặc toàn bộ luồng có bảo đảm exactly-once.
- Redis là nguồn sự thật của Order hoặc Payment.
- Một lần chạy thành công chứng minh mọi nhánh lỗi của Saga.
- Hệ thống đã đạt production readiness hoặc đã được kiểm thử tải đầy đủ.

---

## 2. Quy ước sử dụng kịch bản

- Nội dung trong khối trích dẫn `>` là phần có thể nói thành lời.
- Nội dung bắt đầu bằng **Nội bộ** là chỉ dẫn thao tác, không đọc thành lời.
- Không đọc UUID, event ID hoặc toàn bộ payload. Chỉ trỏ vào các trường phục vụ luận điểm.
- Nếu giao diện đã tự cập nhật, không bấm refresh chỉ để tạo cảm giác đang thao tác.
- Nếu phải refresh, giải thích ngắn rằng WebSocket là tín hiệu cập nhật; client vẫn tải lại trạng thái từ nguồn có thẩm quyền.
- Không chuyển tab trong lúc đang nói một luận điểm chưa kết thúc. Nói câu chuyển trước, rồi mới chuyển tab.

---

## 3. Biến demo cần ghi trước buổi bảo vệ

Điền các giá trị này vào bản in hoặc speaker note; không đưa secret vào tài liệu.

| Biến                 | Giá trị chuẩn bị       |
| -------------------- | ---------------------- |
| Tenant demo          | `<DEMO_TENANT_NAME>`   |
| Tenant ID            | `<DEMO_TENANT_ID>`     |
| Tenant slug          | `<DEMO_TENANT_SLUG>`   |
| Bàn demo             | `<DEMO_TABLE_NAME>`    |
| QR URL               | `<DEMO_QR_URL>`        |
| Món thuộc Kitchen    | `<DEMO_KITCHEN_ITEM>`  |
| Số lượng             | `<DEMO_QUANTITY>`      |
| Tài khoản nhân viên  | `<DEMO_STAFF_ACCOUNT>` |
| Redis database/index | `<DEMO_REDIS_DB>`      |

Sau khi gửi đơn, ghi nhanh hoặc copy khi cần:

| Biến phát sinh | Dùng để tìm kiếm                                        |
| -------------- | ------------------------------------------------------- |
| Order ID       | Lọc `order.confirmed`, tìm KDS ticket và chọn đơn ở POS |
| Session ID     | Đối chiếu session scope khi cần                         |
| Event ID       | Đối chiếu deduplication key nếu hội đồng hỏi sâu        |
| Bill reference | Đối chiếu giao dịch SePay và `payment.completed`        |
| Payment ID     | Đối chiếu payload `payment.completed`                   |

---

## 4. Thứ tự tab cố định

Mở sẵn các tab theo đúng thứ tự dưới đây. Dùng `Ctrl/Cmd + số` để chuyển tab nhanh.

| Tab | Nội dung                     | Trạng thái chuẩn bị                                              |
| --: | ---------------------------- | ---------------------------------------------------------------- |
|   1 | Customer PWA                 | QR URL chưa được mở phiên hoặc đang ở trang bắt đầu hợp lệ       |
|   2 | POS                          | Đã đăng nhập; mở màn hình bàn/đơn và sẵn sàng chọn bàn demo      |
|   3 | Kafkio — `order.confirmed`   | Đã mở đúng cluster/topic; sắp xếp message mới nhất trước         |
|   4 | RedisInsight — KDS           | Đã kết nối đúng Redis; ô tìm kiếm chuẩn bị `kds:<tenantId>:*`    |
|   5 | KDS Kitchen                  | Đã đăng nhập; mở `/kds/kitchen`; không có ticket cũ gây nhầm lẫn |
|   6 | Kafkio — `payment.completed` | Đã mở đúng topic; sắp xếp message mới nhất trước                 |

**Nội bộ — bố trí cửa sổ:**

- Zoom trình duyệt khoảng 90–100%, đủ để hội đồng đọc trạng thái và nút chính.
- Tắt thông báo hệ điều hành, ứng dụng chat và trình quản lý mật khẩu.
- Ẩn bookmark hoặc tab chứa thông tin nhạy cảm.
- Không mở DevTools trong luồng chính.
- Điện thoại đã mở sẵn ứng dụng ngân hàng và có mạng ổn định.

---

## 5. Trạng thái phải chuẩn bị trước

### 5.1. Dữ liệu nghiệp vụ

- Tenant demo đang hoạt động.
- Bàn demo ở trạng thái có thể bắt đầu phiên và không còn session cũ.
- Món demo đang hiển thị, có giá hợp lệ, được định tuyến về `KITCHEN` và đủ tồn kho.
- KDS không còn ticket cũ có cùng bàn hoặc order gây nhầm lẫn.
- Tài khoản nhân viên có quyền xem/xác nhận đơn, thao tác POS và truy cập KDS.
- Hóa đơn từ lượt chạy trước đã được hoàn tất hoặc dọn sạch.

### 5.2. Công cụ quan sát

- Kafkio kết nối đúng Kafka cluster.
- Tab 3 mở topic `order.confirmed`.
- Tab 6 mở topic `payment.completed`.
- RedisInsight kết nối đúng Redis database mà Kitchen đang dùng.
- Chuẩn bị các mẫu khóa:
  - `kds:<tenantId>:kitchen` — Sorted Set của hàng đợi Kitchen đang hoạt động.
  - `kds:<tenantId>:order:<orderId>:tickets` — Set ánh xạ order sang ticket.
  - `kds:<tenantId>:ticket:<ticketId>` — Hash chứa trạng thái ticket.
  - `kds:<tenantId>:dedupe:event:<eventId>` — khóa deduplication nếu cần trả lời sâu.

### 5.3. Thanh toán

- Customer PWA tạo được VietQR cho hóa đơn nhà hàng.
- Điện thoại có thể chuyển đúng số tiền và nội dung thanh toán.
- Không đưa tài khoản ngân hàng, secret webhook hoặc token lên màn hình ngoài thông tin vốn được hiển thị trong VietQR.
- Đã chạy thử ít nhất một giao dịch end-to-end trước ngày bảo vệ.

---

## 6. Timeline rút gọn

| Mốc                  | Thời lượng mục tiêu | Nội dung                                        |
| -------------------- | ------------------: | ----------------------------------------------- |
| Mở đầu và QR URL     |         `0:00–0:25` | Giải thích mở trực tiếp URL được mã QR mã hóa   |
| Customer tạo đơn     |         `0:25–1:15` | Chọn món, giỏ món, gửi đơn `PENDING`            |
| POS xác nhận         |         `1:15–2:05` | Xác nhận đơn và xử lý tồn kho                   |
| Backend checkpoint 1 |         `2:05–2:55` | `order.confirmed` và KDS projection trong Redis |
| KDS và phục vụ       |         `2:55–4:00` | Bắt đầu, hoàn thành, POS xác nhận đã phục vụ    |
| VietQR live          |         `4:00–5:35` | Yêu cầu bill, tạo QR, chuyển khoản, chờ webhook |
| Backend checkpoint 2 |         `5:35–6:25` | UI `PAID` và `payment.completed`                |
| Kết luận             |         `6:25–6:45` | Tổng kết quan hệ giữa UI, state và event        |

Mục tiêu kết thúc ở khoảng `6:30`. Khoảng còn lại là buffer cho chuyển tab và webhook.

---

## 7. Kịch bản chi tiết

### Chặng 0 — Mở đầu demo

**Thời gian:** `0:00–0:25`  
**Tab:** 1 — Customer PWA  
**Thao tác:** Mở QR URL đã chuẩn bị.

> “Phần demo sử dụng một luồng xuyên suốt từ khách hàng tại bàn đến POS, KDS và thanh toán. Để toàn bộ thao tác có thể quan sát trên cùng màn hình, em mở trực tiếp đường dẫn được mã QR mã hóa. Trong vận hành thực tế, khách hàng truy cập chính đường dẫn này bằng cách quét QR tại bàn.”

> “Hệ thống xác định tenant, bàn và QR token trước khi tạo hoặc nối tiếp phiên phục vụ. Khách hàng không đăng nhập bằng tài khoản nhân sự; phạm vi truy cập của khách gắn với phiên QR này.”

**Nội bộ — tín hiệu cần thấy:**

- Tên nhà hàng và bàn đúng.
- Customer PWA vào được menu.
- Không xuất hiện cảnh báo tenant bị khóa hoặc session không hợp lệ.

**Nội bộ — nếu URL đã nối session:** Không nói “tạo session mới”. Dùng cụm “tạo hoặc nối tiếp phiên hợp lệ”.

---

### Chặng 1 — Khách chọn món và gửi đơn

**Thời gian:** `0:25–1:15`  
**Tab:** 1 — Customer PWA  
**Thao tác:** Chọn món Kitchen đã chuẩn bị, thêm vào giỏ, thay đổi số lượng một lần và gửi đơn.

> “Khách hàng xem menu trong đúng phạm vi nhà hàng, chọn món và thao tác trên giỏ dùng chung của phiên. Ở đây em thay đổi số lượng một lần để minh họa giỏ không chỉ là trạng thái cục bộ trên trình duyệt.”

> “Khi gửi đơn, hệ thống tạo order ở trạng thái chờ xác nhận. Mốc này chưa đồng nghĩa bếp đã bắt đầu chế biến; KDS chỉ nhận công việc sau khi nhân viên xác nhận đơn.”

**Nội bộ — tín hiệu cần thấy:**

- Toast hoặc trạng thái cho biết gửi đơn thành công.
- Order xuất hiện ở trạng thái `PENDING`/“Chờ xác nhận”.
- Giỏ không còn món chưa gửi.

**Nội bộ — câu chuyển tab:**

> “Tiếp theo em chuyển sang vai trò nhân viên tại POS để thực hiện mốc xác nhận nghiệp vụ.”

---

### Chặng 2 — POS xác nhận đơn

**Thời gian:** `1:15–2:05`  
**Tab:** 2 — POS  
**Thao tác:** Chọn bàn demo, mở order mới nhất và bấm **Xác nhận**.

> “Đơn vừa gửi đã xuất hiện tại POS ở trạng thái chờ xác nhận. Thao tác này thuộc vai trò nhân viên, nên request đi qua kiểm tra danh tính, tenant và quyền trước khi đến Order service.”

> “Khi em bấm xác nhận, Order giữ vai trò orchestrator: khóa và kiểm tra trạng thái đơn, yêu cầu Catalog xử lý tồn kho bằng reservation có idempotency, rồi mới chuyển đơn sang `PROCESSING` và ghi outbox `order.confirmed` trong giao dịch cục bộ của Order.”

**Nội bộ — tín hiệu cần thấy:**

- Nút **Xác nhận** chuyển sang trạng thái đang xử lý rồi hoàn tất.
- Order chuyển từ `PENDING` sang `PROCESSING`.
- Không bấm xác nhận lần hai trong demo chính.

**Nội bộ — không nói:**

- Không nói một giao dịch cơ sở dữ liệu chung bao trùm Order và Catalog.
- Không nói toàn bộ Saga đã hoàn tất ngay khi Catalog trả `APPLIED`.

**Nội bộ — câu chuyển tab:**

> “Giao diện cho thấy đơn đã được xác nhận. Em mở phần backend để chỉ ra sự kiện hậu xác nhận và trạng thái KDS được tạo từ sự kiện đó.”

---

### Chặng 3 — Backend checkpoint 1: `order.confirmed`

**Thời gian:** `2:05–2:30`  
**Tab:** 3 — Kafkio, topic `order.confirmed`  
**Thao tác:** Refresh message list nếu cần; mở message mới nhất và đối chiếu `tenantId`, `orderId`, `eventId`.

> “Đây là event `order.confirmed` tương ứng với order vừa xác nhận. Event chỉ được relay từ outbox sau khi giao dịch Order đã commit, nên Kitchen không nhận công việc từ một trạng thái Order chưa hoàn tất.”

> “Trong payload, em chỉ đối chiếu tenant, order và event ID. Event ID được Kitchen sử dụng cho deduplication; điều này không đồng nghĩa Kafka cung cấp exactly-once cho toàn bộ luồng.”

**Nội bộ — tín hiệu cần thấy:**

- Message có `eventType`/topic đúng `order.confirmed`.
- `tenantId` và `orderId` khớp order đang demo.
- Không dành thời gian đọc toàn bộ payload.

**Nội bộ — nếu message chưa xuất hiện:** Chờ tối đa 5 giây và refresh một lần. Nếu KDS đã có ticket, tiếp tục demo và nói “Kitchen đã tiêu thụ event; giao diện Kafka đang tải lại danh sách message”. Không bấm xác nhận Order lần nữa.

---

### Chặng 4 — Backend checkpoint 1: KDS projection trong Redis

**Thời gian:** `2:30–2:55`  
**Tab:** 4 — RedisInsight  
**Thao tác:** Tìm `kds:<tenantId>:order:<orderId>:tickets`, lấy ticket ID; mở `kds:<tenantId>:ticket:<ticketId>` hoặc hàng đợi `kds:<tenantId>:kitchen`.

> “Kitchen tiêu thụ `order.confirmed` và tạo KDS runtime projection trong Redis. Set này ánh xạ order sang ticket; còn Hash ticket lưu trạng thái phục vụ của phiếu bếp. Sorted Set của Kitchen dùng để tổ chức hàng đợi theo thứ tự vận hành.”

> “Redis ở đây tối ưu cho truy vấn và cập nhật hàng đợi KDS. Nó không thay thế Order làm nguồn trạng thái nghiệp vụ có thẩm quyền.”

**Nội bộ — chỉ trỏ tối đa ba trường:** `orderId`, `status`, `station`.  
**Nội bộ — không mở:** secret, session token hoặc key không liên quan.

**Nội bộ — câu chuyển tab:**

> “Từ trạng thái projection này, màn hình KDS nhận ticket và cho phép bếp cập nhật tiến độ chế biến.”

---

### Chặng 5 — KDS xử lý món

**Thời gian:** `2:55–3:40`  
**Tab:** 5 — KDS Kitchen  
**Thao tác:** Xác nhận ticket đúng bàn/order; bấm **Bắt đầu**; sau đó giữ nút **Giữ để Xong** đến khi ticket chuyển sang hoàn thành.

> “Ticket đã xuất hiện trong hàng đợi Kitchen sau mốc xác nhận đơn. Bếp bắt đầu xử lý, sau đó chuyển món sang trạng thái sẵn sàng. Các thay đổi trên KDS được phát tín hiệu gần thời gian thực để các client liên quan tải lại trạng thái mới.”

> “WebSocket chỉ đóng vai trò báo có thay đổi; client vẫn lấy lại snapshot từ service sở hữu trạng thái tương ứng.”

**Nội bộ — tín hiệu cần thấy:**

- Ticket đúng bàn và món demo.
- Sau **Bắt đầu**, ticket vào cột đang xử lý.
- Sau **Giữ để Xong**, ticket vào cột hoàn thành và Order trở thành `READY`.

**Nội bộ — câu chuyển tab:**

> “Bếp đã hoàn tất món, nhưng hóa đơn chưa thể thanh toán cho đến khi nhân viên xác nhận order đã được phục vụ.”

---

### Chặng 6 — POS xác nhận đã phục vụ

**Thời gian:** `3:40–4:00`  
**Tab:** 2 — POS  
**Thao tác:** Mở lại order và bấm **Xác nhận đã phục vụ**.

> “Order hiện ở trạng thái sẵn sàng. Nhân viên xác nhận đã phục vụ để chuyển order sang `SERVED`. Đây là điều kiện nghiệp vụ trước khi khách được yêu cầu thanh toán; hệ thống không cho đóng bill khi vẫn còn order chưa phục vụ.”

**Nội bộ — tín hiệu cần thấy:** Order chuyển sang `SERVED`/“Đã phục vụ”.

**Nội bộ — câu chuyển tab:**

> “Sau khi mọi order trên hóa đơn đã được phục vụ, khách hàng có thể yêu cầu thanh toán.”

---

### Chặng 7 — Yêu cầu thanh toán và tạo VietQR

**Thời gian:** `4:00–4:35`  
**Tab:** 1 — Customer PWA  
**Thao tác:** Mở trang thanh toán, bấm **Yêu cầu thanh toán**, sau đó bấm **Thanh toán bằng VietQR**.

> “Khách hàng gửi yêu cầu thanh toán. Order kiểm tra giỏ đã trống và các order trên bill đều ở trạng thái `SERVED`, sau đó chuyển bill sang `PENDING_PAYMENT` và khóa giỏ để không phát sinh thêm món trong lúc thanh toán.”

> “VietQR chứa đúng số tiền đã làm tròn và mã tham chiếu của hóa đơn. Việc mã QR xuất hiện chưa có nghĩa hệ thống đã ghi nhận thanh toán.”

**Nội bộ — tín hiệu cần thấy:**

- Bill hiển thị “Đang chờ thanh toán”.
- Cảnh báo không thể đặt thêm món trong thời gian chờ.
- VietQR hiển thị số tiền và bill reference.

**Nội bộ — trước khi dùng điện thoại:** Đọc thầm và kiểm tra số tiền, tài khoản, bill reference. Không phóng to thông tin không cần thiết.

---

### Chặng 8 — Chuyển khoản live và chờ webhook

**Thời gian:** `4:35–5:35`  
**Màn hình trình chiếu:** Giữ Tab 1 ở VietQR  
**Thao tác ngoài màn hình:** Dùng điện thoại quét QR hoặc nhập thông tin và xác nhận chuyển khoản.

> “Trong lúc em thực hiện chuyển khoản, bill vẫn ở trạng thái `PENDING_PAYMENT`. QRTable không dựa vào việc người dùng đã mở ứng dụng ngân hàng hoặc bấm xác nhận trên điện thoại để kết luận thanh toán thành công.”

> “Hệ thống chỉ ghi nhận sau khi SePay gửi webhook về Payment service. Payment đối chiếu tenant, bill reference, chiều giao dịch và số tiền; giao dịch lặp hoặc giao dịch không phù hợp không được ghi nhận thành một lần thanh toán mới.”

> “Sau khi Payment commit bản ghi thanh toán và outbox, Order hoàn tất trạng thái bill và session. Customer PWA đang kiểm tra lại trạng thái định kỳ, nên màn hình sẽ chuyển sang thành công khi backend đã ghi nhận.”

**Nội bộ — câu đệm nếu webhook cần thêm thời gian:**

> “Khoảng chờ này thể hiện một ranh giới quan trọng: trải nghiệm thanh toán là bất đồng bộ với thao tác chuyển khoản, và giao diện không tự suy đoán kết quả trước khi có bằng chứng từ backend.”

**Nội bộ — tín hiệu cần thấy:**

- Customer PWA tự chuyển sang “Thanh toán thành công”.
- Tổng tiền đã thanh toán hiển thị đúng.
- Không bấm tạo lại VietQR trong lúc chờ.

---

### Chặng 9 — Đối chiếu `payment.completed`

**Thời gian:** `5:35–6:25`  
**Tab:** 6 — Kafkio, topic `payment.completed`  
**Thao tác:** Mở message mới nhất và đối chiếu `tenantId`, `billId`, `paymentId`, `amount`, `method`.

> “Payment đã ghi nhận giao dịch VietQR. Đây là event `payment.completed` được phát từ outbox sau commit, mang tenant, bill, payment, số tiền và phương thức thanh toán.”

> “Trong implementation hiện tại, sau khi Payment commit, Payment cũng yêu cầu Order hoàn tất bill; event `payment.completed` cung cấp đường phát tán sau commit và Order xử lý theo hướng idempotent. Vì vậy em không diễn giải rằng giao diện chỉ được cập nhật nhờ riêng Kafka.”

**Nội bộ — chỉ trỏ:** `eventType`, `billId`, `amount`, `method: VIETQR`.  
**Nội bộ — không nói:** “Kafka bảo đảm thanh toán đúng-một-lần”.

**Nội bộ — câu chuyển tab:**

> “Cuối cùng em quay lại góc nhìn khách hàng để kết thúc luồng.”

---

### Chặng 10 — Kết luận demo

**Thời gian:** `6:25–6:45`  
**Tab:** 1 — Customer PWA  
**Thao tác:** Chỉ trạng thái thanh toán thành công; không bắt đầu thêm phiên mới.

> “Demo vừa đi qua một luồng nghiệp vụ hoàn chỉnh: khách tham gia bằng phiên QR, gửi đơn; nhân viên xác nhận; Kitchen nhận event sau commit và tạo KDS projection; bếp hoàn thành món; nhân viên xác nhận đã phục vụ; cuối cùng Payment ghi nhận webhook VietQR và hệ thống hoàn tất hóa đơn.”

> “Điểm chính là luồng người dùng vẫn liền mạch, nhưng mỗi miền giữ trách nhiệm riêng: Order sở hữu vòng đời đơn và hóa đơn, Catalog sở hữu tồn kho, Kitchen sở hữu KDS runtime projection, còn Payment sở hữu bản ghi thanh toán.”

---

## 8. Kịch bản dự phòng

### 8.1. Customer PWA hoặc POS chưa tự cập nhật

1. Chờ tối đa 3–5 giây.
2. Bấm refresh dữ liệu trong giao diện nếu có; chỉ reload trang khi cần.
3. Nói:

> “WebSocket cung cấp tín hiệu thay đổi; client vẫn tải lại trạng thái từ service có thẩm quyền. Em tải lại snapshot để tiếp tục luồng.”

Không nói WebSocket là nguồn sự thật.

### 8.2. `order.confirmed` chưa xuất hiện trong Kafkio

- Refresh danh sách message một lần.
- Nếu KDS đã nhận ticket, tiếp tục luồng; không xác nhận order lần hai.
- Dùng screenshot/message đã chuẩn bị làm bằng chứng dự phòng sau demo nếu cần.

### 8.3. KDS chưa hiện ticket

- Kiểm tra đúng station `KITCHEN` và tenant.
- Refresh KDS snapshot một lần.
- Nếu vẫn không có, không tự tạo ticket thủ công trong Redis. Chuyển sang screenshot/video fallback và nói rõ demo live đang gặp trễ tích hợp.

### 8.4. Webhook thanh toán chậm

- Dùng câu đệm về `PENDING_PAYMENT`, nhưng không kéo dài quá 30–45 giây ngoài buffer.
- Nếu chưa nhận sau giới hạn này, nói:

> “Webhook bên ngoài chưa về trong thời gian demo. Hệ thống vẫn giữ bill ở `PENDING_PAYMENT` thay vì suy đoán thành công. Em chuyển sang hiện vật dự phòng đã thu từ cùng luồng để đối chiếu trạng thái sau khi webhook được xử lý.”

- Mở screenshot/video đã chuẩn bị gồm:
  - Customer PWA ở trạng thái thanh toán thành công.
  - Message `payment.completed` với thông tin nhạy cảm đã che.
  - Nếu cần, bản ghi payment/bill đã được đối chiếu trước.
- Không dùng nút cash hoặc thao tác DB để giả lập rằng giao dịch VietQR live đã thành công.

### 8.5. Kafkio hoặc RedisInsight không truy cập được

- Tiếp tục golden flow trên UI nếu hệ thống nghiệp vụ vẫn chạy.
- Dùng screenshot backend đã chuẩn bị.
- Phân biệt rõ “kết quả live trên UI” và “bằng chứng backend dự phòng”.

---

## 9. Checklist diễn tập

### Trước ngày bảo vệ

- [ ] Chạy trọn luồng ít nhất 3 lần trên đúng môi trường demo.
- [ ] Đo thời gian từng chặng và giữ tổng dưới 6 phút 45 giây.
- [ ] Kiểm tra món demo luôn đi về station `KITCHEN`.
- [ ] Kiểm tra tồn kho đủ cho nhiều lượt diễn tập.
- [ ] Dọn session, bill, order và KDS ticket cũ theo quy trình hợp lệ.
- [ ] Kiểm tra `order.confirmed` và `payment.completed` có thể tìm nhanh theo thời gian/order/bill.
- [ ] Chụp screenshot fallback ở cùng độ phân giải trình chiếu.
- [ ] Quay video fallback ngắn, không chứa secret hoặc dữ liệu ngân hàng nhạy cảm.

### Trước giờ trình bày

- [ ] Đăng nhập sẵn POS và KDS.
- [ ] Mở đúng sáu tab và sắp đúng thứ tự.
- [ ] Xác nhận Kafkio/RedisInsight kết nối đúng môi trường.
- [ ] Tắt notification, auto-update và ứng dụng không liên quan.
- [ ] Điện thoại đủ pin, có mạng và mở sẵn ứng dụng ngân hàng.
- [ ] Bàn demo sẵn sàng, không có session cũ.
- [ ] Món demo đủ tồn kho.
- [ ] Đồng hồ bấm giờ sẵn sàng nhưng không che nội dung demo.

---

## 10. Thẻ nhắc nhanh một trang

1. **QR URL:** tenant + bàn + QR token; customer dùng session scope.
2. **Customer:** chọn món → gửi đơn `PENDING`; KDS chưa nhận.
3. **POS:** xác nhận → Order orchestrator → Catalog stock reservation → `PROCESSING` + outbox.
4. **Kafka:** `order.confirmed` sau Order commit; không claim exactly-once.
5. **Redis:** KDS runtime projection; không phải source of truth của Order.
6. **KDS:** **Bắt đầu** → **Giữ để Xong** → Order `READY`.
7. **POS:** **Xác nhận đã phục vụ** → Order `SERVED`.
8. **Customer:** yêu cầu bill → `PENDING_PAYMENT` → khóa giỏ → tạo VietQR.
9. **Điện thoại:** chuyển khoản; UI không tự kết luận thành công.
10. **Payment:** webhook → đối chiếu → commit payment/outbox → Order hoàn tất bill/session.
11. **Kafka:** `payment.completed` là event sau commit; không nói UI chỉ phụ thuộc Kafka.
12. **Kết:** UI liền mạch, ownership theo miền vẫn tách biệt.
