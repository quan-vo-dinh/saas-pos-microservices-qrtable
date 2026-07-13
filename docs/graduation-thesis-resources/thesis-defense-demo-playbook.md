# QRTable — Live & Video Demo Playbook

> **Mục tiêu tài liệu:** Cung cấp kịch bản chi tiết và tối ưu nhất cho hai hình thức demo khóa luận:
>
> 1. **Video Demo 90 giây (Screen Recording & Edit):** Nhịp độ cực nhanh, tập trung cắt bỏ thao tác thừa, zoom vào bằng chứng kỹ thuật (Redis, Kafka, DB).
> 2. **Demo trực tiếp trước Hội đồng (5 phút Live):** Mạch thuyết trình học thuật, kết hợp thao tác giao diện song song với trình chiếu trạng thái hạ tầng thực tế.
>
> **Tài liệu tham chiếu thiết kế:** [thesis-defense-slide-refactor-v2.md](thesis-defense-slide-refactor-v2.md) và [kafka-qrtable.md](../guides/kafka-qrtable.md).

---

## PHẦN I: KỊCH BẢN QUAY & BIÊN TẬP VIDEO DEMO 90 GIÂY

_Mục tiêu của video 90s không phải là giới thiệu tính năng ứng dụng mà là chứng minh sự phối hợp nhịp nhàng giữa **Trải nghiệm người dùng (UI)** và **Kiến trúc phân tán (Redis/Kafka)** dưới áp lực thời gian._

### 1. Phương pháp hiển thị và chuyển tab

Video được quay ở chế độ **toàn màn hình (Full Screen)**. Người quay sử dụng phím tắt chuyển tab liên tiếp (`Cmd + 1...5`) một cách mượt mà và dứt khoát. Biên tập video sử dụng các hiệu ứng phóng to cục bộ (Magnifier Zoom) và chèn nhãn chữ (Overlay Text) để người xem dễ dàng đối chiếu dữ liệu thay đổi trên hạ tầng tương ứng với thao tác trên UI.

---

### 2. Timeline chi tiết từng giây và Lời thuyết minh (Tổng: 90 giây)

| Mốc thời gian         | Tab hiển thị                                  | Thao tác thực tế                                                                                                                                 | Tốc độ phát                | Hiệu ứng & Điểm cần Zoom                                                                                           | Lời thuyết minh (Voiceover Script)                                                                                                                                             |
| :-------------------- | :-------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------- | :----------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0:00 - 0:10** (10s) | PWA (Tab 1)                                   | Quét mã QR bàn ăn $\rightarrow$ Màn hình Menu hiện lên.                                                                                          | x1.5                       | **Zoom cận** thanh địa chỉ URL chứa QR Token và `tableId` để thấy cơ chế định danh bàn.                            | "Khi khách hàng quét mã QR tại bàn, hệ thống tự động nhận diện và thiết lập một phiên đặt món bảo mật liên kết trực tiếp với bàn ăn đó."                                       |
| **0:10 - 0:20** (10s) | PWA (Tab 1)                                   | Chọn 2 món Kitchen $\rightarrow$ Mở giỏ hàng $\rightarrow$ Bấm gửi đơn.                                                                          | x2.0                       | **Tua nhanh** quá trình thêm món. Bấm gửi đơn về trạng thái `PENDING`.                                             | "Sau khi khách chọn món và gửi đơn, thông tin lập tức được ghi nhận dưới trạng thái Chờ xác nhận trong database của Order Service."                                            |
| **0:20 - 0:35** (15s) | POS (Tab 2) $\rightarrow$<br>Kafka UI (Tab 4) | POS bấm **Xác nhận đơn** $\rightarrow$ Chuyển tab lập tức sang Kafka UI show event `order.confirmed` mới nhất.                                   | x1.0                       | **Zoom cận** trường `orderId` và trạng thái sự kiện trong Kafka UI ngay sau khi chuyển tab.                        | "Ngay khi nhân viên bấm xác nhận tại POS, Order Service sẽ commit giao dịch cục bộ đồng thời đẩy sự kiện order.confirmed lên Kafka qua bảng Outbox để đảm bảo tính nguyên tử." |
| **0:35 - 0:50** (15s) | Redis (Tab 5) $\rightarrow$<br>KDS (Tab 3)    | Mở RedisInsight show Sorted Set `kds:{tenantId}:kitchen` $\rightarrow$ Chuyển tab sang KDS Kitchen bấm **Bắt đầu** $\rightarrow$ **Hoàn thành**. | x1.0                       | **Zoom cận** score của Sorted Set (thời gian Order) trong Redis. Trên KDS, click chuyển nhanh trạng thái chế biến. | "Phía sau hậu trường, Kitchen Service tiêu thụ sự kiện này để tạo KDS ticket sắp xếp theo hàng đợi Sorted Set trên Redis, giúp bếp nhận diện đơn và chế biến tức thời."        |
| **0:50 - 1:00** (10s) | POS (Tab 2)                                   | Chuyển tab sang POS bấm **Xác nhận đã phục vụ** đưa đơn về `SERVED`.                                                                             | x1.5                       | Click nút phục vụ trên giao diện quản lý.                                                                          | "Món ăn hoàn tất sẽ kích hoạt nhân viên phục vụ bàn ăn và cập nhật trạng thái đơn hàng để sẵn sàng cho bước thanh toán."                                                       |
| **1:00 - 1:15** (15s) | PWA (Tab 1)                                   | Chuyển tab sang PWA bấm **Yêu cầu bill** $\rightarrow$ Hiện VietQR và quét mã chuyển tiền.                                                       | x3.0 (bước quét ngân hàng) | **Tua nhanh** lúc quét QR trên điện thoại di động.                                                                 | "Khách gửi yêu cầu thanh toán và quét mã VietQR tự động. Hệ thống sẽ khóa giỏ hàng để tránh phát sinh thêm món ăn trong lúc chuyển khoản."                                     |
| **1:15 - 1:25** (10s) | PWA (Tab 1) $\rightarrow$<br>Kafka UI (Tab 4) | PWA nhận tín hiệu WebSocket tự động chuyển sang **Thành công** $\rightarrow$ Chuyển tab sang Kafka UI show event `payment.completed`.            | x1.0                       | Bấm chuyển tab mượt mà. **Zoom cận** payload của topic thanh toán.                                                 | "Giao dịch thành công kích hoạt webhook, Payment Service đối soát và tự động đóng phiên qua WebSocket, đồng thời lưu vết sự kiện thanh toán trên Kafka."                       |
| **1:25 - 1:30** (5s)  | Grafana (Tab 6)                               | Chuyển sang Grafana show Dashboard và Tempo Tracing.                                                                                             | x1.0                       | Trình chiếu giao diện đo lường hiệu năng tổng thể.                                                                 | "Toàn bộ hành trình giao dịch phân tán này đều được chúng em giám sát và phân vết chi tiết qua Grafana và Tempo."                                                              |

---

### 3. Kỹ thuật biên tập (Editing Checklist)

- [ ] **Lọc bỏ thời gian chờ:** Cắt sạch các khoảng trống nhấp nháy chuột, khoảng load trang của mạng.
- [ ] **Chèn text chú thích kỹ thuật (Overlay Labels):** Ở các góc màn hình, ghi rõ:
  - _"Outbox Pattern triggered"_ (khi bấm xác nhận đơn).
  - _"Redis Sorted Set FIFO Queue"_ (khi show Redis KDS).
  - _"Idempotent Event Consumption"_ (khi sự kiện Kafka được Kitchen nhận).
- [ ] **Khớp nối âm thanh:** Giọng nói thuyết minh (voiceover) phải trôi chảy, hào hứng và liên tục, khớp chính xác theo từng chuyển cảnh chuyển tab của video.

---

## PHẦN II: KỊCH BẢN THUYẾT TRÌNH & THAO TÁC DEMO TRỰC TIẾP (5 PHÚT)

_Kịch bản này được thiết kế để bạn vừa tự tin thao tác, vừa trình bày rõ ràng với Hội đồng các primitive phân tán nằm dưới giao diện._

### Thứ tự phím tắt chuyển tab (Mở sẵn trước giờ bảo vệ):

- **Tab 1:** Customer PWA (`Cmd + 1`)
- **Tab 2:** POS Quản lý (`Cmd + 2`)
- **Tab 3:** KDS Bếp (`Cmd + 3`)
- **Tab 4:** Kafka UI / Kafkio (`Cmd + 4`)
- **Tab 5:** RedisInsight (`Cmd + 5`)

---

### Bảng kịch bản hành động & Thuyết minh chi tiết

| Chặng                                          | Thao tác kỹ thuật (Bấm phím nào, click gì)                                                                                                                                                                    | Lời nói thuyết minh (Speaker Script)                                                                                                                                                                                                                                                                                                                                                             | Điểm nhấn kỹ thuật cần nhấn mạnh                                                                                                              |
| :--------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chặng 0: Mở đầu**<br>_(30 giây)_             | Mở **Tab 1** (Customer PWA).                                                                                                                                                                                  | "Kính thưa Hội đồng, sau đây em xin phép tiến hành demo trực tiếp luồng nghiệp vụ của hệ thống QRTable. Demo này sẽ chứng minh sự tương tác đồng bộ chéo dịch vụ và cách hệ thống bảo toàn tính nhất quán dữ liệu thông qua Kafka và Redis. Em bắt đầu bằng giao diện đặt món dành cho khách hàng tại bàn ăn thông qua đường dẫn được mã hóa QR."                                                | - **Không** nói "tạo session mới", nói "nối phiên theo bàn".                                                                                  |
| **Chặng 1: Chọn món**<br>_(30 giây)_           | - Chọn 2 món trên **Tab 1**.<br>- Bấm gửi đơn đặt món.                                                                                                                                                        | "Khách hàng lựa chọn món ăn và tiến hành gửi đơn. Lúc này, đơn hàng được khởi tạo dưới trạng thái `PENDING` trong database cục bộ của Order Service. Tại mốc này, thông tin đơn hàng hoàn toàn chưa xuất hiện tại màn hình KDS của bếp, vì đơn hàng chưa vượt qua ranh giới xác nhận nghiệp vụ."                                                                                                 | - Giải thích trạng thái cô lập tạm thời của đơn hàng `PENDING`.                                                                               |
| **Chặng 2: POS xác nhận**<br>_(45 giây)_       | - Chuyển sang **Tab 2** (POS).<br>- Chọn bàn demo $\rightarrow$ Click **Xác nhận**.                                                                                                                           | "Bây giờ, nhân viên nhà hàng mở màn hình POS và thực hiện xác nhận đơn. Khi em bấm nút **Xác nhận**, Order Service đóng vai trò là Bộ điều phối Saga: nó thực hiện khóa bản ghi Postgres cục bộ, gọi gRPC/TCP đồng bộ sang Catalog để thực hiện giữ kho tạm thời (Stock Reservation), và chỉ ghi nhận sự kiện Outbox `order.confirmed` khi giao dịch cục bộ cam kết thành công."                 | - **TCP đồng bộ chéo service** để giữ kho.<br>- **Outbox commit** đi kèm Postgres transaction.                                                |
| **Chặng 3: Đối chiếu Kafka**<br>_(45 giây)_    | - Chuyển sang **Tab 4** (Kafka UI).<br>- Refresh xem tin nhắn mới nhất trong topic `order.confirmed`.                                                                                                         | "Để chứng minh tính nguyên tử của mẫu Outbox, em chuyển sang màn hình quản lý Kafka. Sự kiện `order.confirmed` đã được Outbox Relay quét và phát tán thành công lên Broker ngay sau khi giao dịch cục bộ hoàn tất. Payload của sự kiện mang theo định danh đơn hàng và phiên bản giữ kho, sẵn sàng phân phát bất đồng bộ đến các bên tiêu thụ."                                                  | - Nhấn mạnh **Outbox Relay** ngăn ngừa lỗi ghi kép (Dual-Write).<br>- Giải thích payload gọn gàng.                                            |
| **Chặng 4: Redis KDS & Bếp**<br>_(1 phút)_     | - Chuyển sang **Tab 5** (RedisInsight).<br>- Show khóa `kds:{tenantId}:kitchen` (Sorted Set).<br>- Chuyển sang **Tab 3** (KDS Kitchen) $\rightarrow$ Bấm **Bắt đầu** $\rightarrow$ **Giữ để hoàn thành món**. | "Kitchen Service tiêu thụ sự kiện này bất đồng bộ và tạo ra một cấu trúc dữ liệu hàng đợi KDS tạm thời trên Redis. Đây là cấu trúc Sorted Set được sắp xếp theo thời gian đặt món để phục vụ nghiệp vụ KDS thời gian thực. Em tiến hành thao tác trên màn hình bếp KDS để chuyển trạng thái món ăn sang đã hoàn thành. Hệ thống sẽ phát tín hiệu WebSocket để POS cập nhật trạng thái đơn hàng." | - Redis chỉ là **Projection cache** cho KDS, không phải database chính.<br>- WebSocket chỉ là **tín hiệu thông báo**, không mang payload lớn. |
| **Chặng 5: Thanh toán VietQR**<br>_(1 phút)_   | - Chuyển sang **Tab 1** (PWA).<br>- Bấm **Thanh toán bằng VietQR**.<br>- Dùng điện thoại thực hiện chuyển tiền thật.                                                                                          | "Khách hàng yêu cầu thanh toán hóa đơn. Hệ thống khóa giỏ hàng và tạo mã thanh toán VietQR chứa đúng số tiền đã làm tròn cùng mã tham chiếu. Em thực hiện quét mã chuyển tiền thật trên ứng dụng ngân hàng. Trạng thái thanh toán của khách hàng hiện tại được giữ ở mức `PENDING_PAYMENT` và không tự ý phán đoán kết quả."                                                                     | - Cơ chế **khóa giỏ hàng** ngăn phát sinh giao dịch mới.<br>- Sử dụng tiền thật để tạo tính thuyết phục cao.                                  |
| **Chặng 6: Webhook & Hoàn tất**<br>_(30 giây)_ | - Chờ webhook SePay bắn về.<br>- Giao diện **Tab 1** tự động chuyển sang **Thanh toán thành công**.<br>- Chuyển sang **Tab 4** (Kafka UI) topic `payment.completed` để đối chiếu.                             | "Khi ngân hàng báo có, SePay đẩy webhook về Payment Service. Service này ghi nhận giao dịch, giải phóng bàn ăn chéo dịch vụ và đẩy sự kiện `payment.completed` lên Kafka. Màn hình khách hàng lập tức cập nhật trạng thái thành công thông qua WebSocket. Sự kiện thanh toán hoàn tất cũng đã được lưu vết bền vững trên Kafka Broker cho các tác vụ hậu thanh toán."                            | - **Event-driven compensation / resolution** kết thúc luồng.<br>- Đối soát giao dịch tự động không cần can thiệp thủ công.                    |

---

## PHẦN III: HƯỚNG DẪN THAO TÁC NHANH VÀ LƯỚT QUA (LÀM SAO ĐỂ TIẾT KIỆM THỜI GIAN?)

### 1. Những phần PHẢI LƯỚT QUA (Không được giải thích dài dòng)

- **Quy trình onboarding tạo tài khoản:** Đừng cố tạo mới một Tenant hay đăng ký tài khoản từ đầu trong demo trực tiếp. Quá trình này tương tác với Keycloak vật lý và Postgres DB provisioning, mất khoảng 30-40 giây. Hãy sử dụng một Tenant có sẵn. Chỉ dùng slide phụ lục để giải thích luồng này khi được hỏi.
- **Màn hình cấu hình thiết lập nhà hàng:** Các tính năng CRUD danh mục món ăn, sơ đồ bàn, phân quyền nhân sự $\rightarrow$ chỉ click lướt qua trong 3 giây để Hội đồng thấy có đầy đủ chức năng quản trị, tuyệt đối không tạo mới hay chỉnh sửa dữ liệu thủ công tại chỗ.
- **Payload JSON thô:** Khi mở Kafka UI, chỉ chỉ chuột vào các key cốt lõi (`tenantId`, `orderId`, `status`). Không cuộn chuột đọc hết cả payload hoặc giải thích ý nghĩa của các trường metadata phụ.

### 2. Những phần PHẢI SHOW KỸ (Điểm ăn điểm công nghệ)

- **Mở RedisInsight và Kafka UI:** Cho Hội đồng thấy dữ liệu thay đổi thực sự trong Redis và Kafka ngay sau các thao tác trên giao diện. Đây là điểm phân biệt giữa một ứng dụng POS thông thường và một hệ thống phân tán được thiết kế đúng chuẩn.
- **Thời gian chuyển đổi trạng thái của KDS:** Nhấn mạnh rằng KDS runtime projection sử dụng **Redis Sorted Set** giúp đạt tốc độ truy xuất cực kỳ nhanh và giảm tải hoàn toàn cho database PostgreSQL nghiệp vụ.
- **Sự đồng bộ trạng thái không reload trang:** Khi bếp hoàn thành món hoặc khi quét QR thanh toán thành công, hãy giơ hai tay lên hoặc giữ yên chuột để Hội đồng thấy PWA tự động cập nhật trạng thái mà không cần người dùng bấm F5 (do hệ thống bắn tín hiệu qua WebSocket).

---

## PHẦN IV: KỊCH BẢN ĐỐI PHÓ SỰ CỐ LIVE (FALLBACK PLAN)

| Sự cố xảy ra                                   | Hành động thao tác lập tức                                                                                  | Lời giải thích với Hội đồng                                                                                                                                                                                                                    |
| :--------------------------------------------- | :---------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mạng chập chờn, Webhook SePay không trả về** | - Chờ tối đa 15 giây.<br>- Không bấm quét QR lại.<br>- Chuyển sang video/screenshot backup đã chuẩn bị sẵn. | _"Dạ do đường truyền mạng sandbox của ngân hàng/SePay đang bị trễ hoặc nghẽn, em xin phép sử dụng kết quả đối soát thực tế được chụp/ghi hình từ cùng luồng nghiệp vụ này trước buổi bảo vệ để Hội đồng tiện theo dõi phần tích hợp sự kiện."_ |
| **KDS không nhận được ticket bếp**             | - Refresh màn hình KDS 1 lần.<br>- Check nhanh tab RedisInsight xem sorted set có tăng key không.           | _"Dạ có thể kết nối WebSocket thông báo thay đổi giữa client và BFF đang bị ngắt quãng tạm thời do mạng. Trạng thái dưới cơ sở dữ liệu và Redis vẫn đồng nhất, em xin phép reload lại trang để đồng bộ snapshot mới nhất."_                    |
| **Kafka UI bị lag không hiển thị message mới** | - Chuyển sang log của terminal chạy console log của service.                                                | _"Dạ do giao diện quản trị Kafka UI đang bị trễ nhịp đọc, em xin phép trình bày log nghiệp vụ thực tế trên màn hình terminal của dịch vụ Order/Kitchen để chứng minh thông điệp sự kiện vẫn được truyền tải bình thường."_                     |
