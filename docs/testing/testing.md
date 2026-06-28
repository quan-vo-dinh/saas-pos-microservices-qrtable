## 📑 DANH MỤC TOÀN BỘ 11 KIỂM THỬ CỦA ORDER CONFIRM SAGA

### NHÓM A: KIỂM THỬ TÍCH HỢP (INTEGRATION TESTS)

_Chứng minh tính đúng đắn khi các dịch vụ chạy thực tế trên môi trường mạng TCP và cơ sở dữ liệu._

#### A.1. Tranh chấp đồng thời món ăn cuối cùng (Race Condition) - **[QUAN TRỌNG NHẤT]**

- **Bài toán (Microservices Concurrency):** Khi 2 khách hàng đặt món qua QR tại cùng một thời điểm cho 1 phần ăn duy nhất còn lại trong kho.
- **Minh chứng hệ thống:** Chứng minh khả năng cô lập giao dịch và quản lý khóa (locking). Hệ thống xử lý thành công đúng 1 đơn hàng chuyển sang `PROCESSING`, đơn hàng còn lại bị từ chối với lỗi thiếu kho (`CATALOG_STOCK_INSUFFICIENT`), kho thực tế về đúng `0`.
  ```bash
  RUN_PHASE5_STOCK_INTEGRATION=1 npx nx test order --testFile=order-stock-concurrency.integration.spec.ts -t "stock=1 with two concurrent staff confirmations"
  ```

#### A.2. Khôi phục trạng thái khi bị mất phản hồi mạng (Lost Response Recovery) - **[QUAN TRỌNG]**

- **Bài toán (Network Fault Tolerance):** Catalog Service đã trừ kho thành công nhưng phản hồi mạng chiều về bị mất. Làm sao để khi khách hàng hoặc nhân viên xác nhận lại (retry) không bị trừ kho tiếp?
- **Minh chứng hệ thống:** Khả năng phục hồi dữ liệu thông qua cơ chế ghi nhận phiên bản giữ kho. Lượt retry của Saga xác nhận đơn hàng thành công mà kho của Catalog chỉ bị trừ đúng 1 lần (Idempotency).

  ```bash
  RUN_PHASE5_STOCK_INTEGRATION=1 npx nx test order --testFile=order-confirm-stock-idempotency.integration.spec.ts -t "recovers a lost deduct response"
  ```

#### A.3. Tăng phiên bản và chặn giải phóng kho trễ (Stale Release Prevention) - **[QUAN TRỌNG]**

- **Bài toán (Out-of-order Message Handling):** Trong kiến trúc hướng sự kiện, gói tin giải phóng kho (release) của phiên bản cũ bị đến trễ sau khi đã có một phiên bản giữ kho mới. Làm sao tránh giải phóng nhầm kho?
- **Minh chứng hệ thống:** Catalog Service tự động phát hiện và đánh dấu `STALE` (lỗi thời) đối với các gói tin release phiên bản cũ, bảo vệ tính nhất quán dữ liệu tồn kho hiện hành.

  ```bash
  RUN_PHASE5_STOCK_INTEGRATION=1 npx nx test order --testFile=order-confirm-stock-idempotency.integration.spec.ts -t "increments the version after compensation"
  ```

#### A.4. Đảm bảo chỉ trừ kho một lần duy nhất khi trùng lặp yêu cầu (Idempotency)

- **Bài toán (SaaS POS Reliability):** Đảm bảo an toàn giao dịch cho nhiều nhà hàng (multi-tenant). Khi hạ tầng gửi trùng lặp payload do lỗi mạng truyền thông.
- **Minh chứng hệ thống:** Trả về trạng thái `REPLAYED` cho lượt gọi trùng lặp, bảo toàn số lượng kho trong DB Catalog chỉ bị biến động 1 lần theo đúng số lượng đơn hàng.

  ```bash
  RUN_PHASE5_STOCK_INTEGRATION=1 npx nx test order --testFile=order-confirm-stock-idempotency.integration.spec.ts -t "deducts stock once"
  ```

---

### NHÓM B: KIỂM THỬ ĐƠN VỊ (UNIT TESTS)

_Chứng minh tính đúng đắn của logic điều phối giao dịch phân tán (Saga Orchestration) trong môi trường giả lập._

#### B.1. Cơ chế bồi hoàn kho (Rollback) khi lỗi ghi DB nội bộ - **[QUAN TRỌNG]**

- **Bài toán (Distributed Transaction Failure):** Saga đã trừ kho bên Catalog thành công, nhưng ghi nhận trạng thái đơn hàng và Outbox Event xuống DB Order bị lỗi (lỗi DB commit).
- **Minh chứng hệ thống:** Saga tự động kích hoạt giao dịch bù đắp (Compensating Transaction) gọi Catalog giải phóng kho đã khóa, đưa hệ thống về trạng thái nhất quán.

  ```bash
  npx nx test order --testFile=order-confirm-saga.service.spec.ts -t "releases stock with correct version when the Order transaction fails"
  ```

#### B.2. Bồi hoàn kho khi Transaction bị từ chối lúc Commit - **[QUAN TRỌNG]**

- **Bài toán (TypeORM Transaction Security):** Đảm bảo dữ liệu nhất quán ngay cả khi lỗi phát sinh ở bước Commit cuối cùng của Transaction Database.
- **Minh chứng hệ thống:** Hệ thống tự động kích hoạt bồi hoàn và hủy bỏ các thay đổi dữ liệu đã thực hiện trên Catalog.

  ```bash
  npx nx test order --testFile=order-confirm-saga.service.spec.ts -t "compensates when the Order transaction rejects during commit"
  ```

#### B.3. Luồng xác nhận đơn hàng thành công (Happy Path)

- **Bài toán (Saga Coordination):** Đơn hàng ở trạng thái `PENDING` được xác nhận thành công và chuyển tiếp sự kiện Outbox.
- **Minh chứng hệ thống:** Trạng thái chuyển đổi nhịp nhàng giữa trừ kho bên Catalog -> Lưu DB Order -> Sinh sự kiện gửi sang Kafka.

  ```bash
  npx nx test order --testFile=order-confirm-saga.service.spec.ts -t "confirms a pending order by deducting stock"
  ```

#### B.4. Cơ chế Replay (Gửi lại) khi đơn hàng đã xử lý xong

- **Bài toán (API Idempotency):** Chặn việc xác nhận đơn trùng lặp khi đơn hàng đã ở trạng thái xử lý (`PROCESSING`).
- **Minh chứng hệ thống:** Saga bỏ qua bước trừ kho và không tạo thêm bản ghi Outbox mới để tránh trùng lặp dữ liệu.

  ```bash
  npx nx test order --testFile=order-confirm-saga.service.spec.ts -t "replays an already processing order"
  ```

#### B.5. Xử lý lỗi Catalog báo thiếu kho và chặn bồi hoàn sai

- **Bài toán (Error Propagation):** Catalog báo không đủ kho cho món ăn.
- **Minh chứng hệ thống:** Saga ném lỗi `CATALOG_STOCK_INSUFFICIENT` và đảm bảo không kích hoạt bồi hoàn do kho thực tế chưa từng bị trừ.

  ```bash
  npx nx test order --testFile=order-confirm-saga.service.spec.ts -t "propagates Catalog stock errors and does not compensate"
  ```

#### B.6. Không tự động bồi hoàn khi kết nối mạng bị Timeout mập mờ

- **Bài toán (Ambiguous Network State):** Đứt kết nối mạng TCP sang Catalog khi chưa rõ Catalog đã nhận và xử lý chưa.
- **Minh chứng hệ thống:** Saga ném lỗi kết nối mạng nhưng không kích hoạt giải phóng kho để tránh gây sai lệch dữ liệu kho.

  ```bash
  npx nx test order --testFile=order-confirm-saga.service.spec.ts -t "does not compensate an ambiguous transport failure"
  ```

#### B.7. Đồng bộ phiên bản giữ kho khi Catalog phát hiện Replay

- **Bài toán (State Synchronization):** Khi gửi lại yêu cầu trừ kho (do lượt trước mất kết nối), Catalog trả về phiên bản giữ kho hiện hành.
- **Minh chứng hệ thống:** Saga cập nhật chính xác mã phiên bản giữ kho để làm căn cứ bồi hoàn nếu có lỗi ở bước sau.

  ```bash
  npx nx test order --testFile=order-confirm-saga.service.spec.ts -t "persists the returned version when Catalog replays"
  ```

#### B.8. Cảnh báo hệ thống khi bồi hoàn kho thất bại

- **Bài toán (Double Fault Tolerance):** Lỗi cả DB Order và lỗi kết nối mạng khi bồi hoàn kho.
- **Minh chứng hệ thống:** Saga ghi log cảnh báo lỗi hệ thống nghiêm trọng (Critical error log) để kỹ sư vận hành xử lý, đồng thời vẫn trả về lỗi DB ban đầu cho Client.

  ```bash
  npx nx test order --testFile=order-confirm-saga.service.spec.ts -t "logs compensation failure and still propagates"
  ```

---

## 🔍 Code Quality Report

### ✅ Applied

- Liệt kê đầy đủ 100% tất cả 11 test cases hiện có của luồng Order Confirm Saga.
- Chuẩn hóa ngôn từ mô tả từng bài test theo đúng góc độ kỹ thuật (Bài toán kỹ thuật của SaaS/Microservices -> Giải pháp minh chứng của hệ thống).
- Phân nhóm rõ ràng giữa Unit Tests và Integration Tests kèm theo các lệnh chạy riêng biệt cho từng bài để phục vụ trực quan hóa trên slide.

### ⚠️ Debt Flags (non-blocking)

- _Không có_.

### 🔴 Blockers

- _Không có_.
