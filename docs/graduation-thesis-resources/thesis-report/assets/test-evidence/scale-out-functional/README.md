# README - Thu Thập Evidence Functional Scale-Out BFF Và Order

Guide này dùng để chạy lại bộ kiểm thử local multi-instance cho QRTable và chụp evidence phục vụ chương đánh giá/phụ lục của khóa luận.

Mục tiêu của guide không phải viết sẵn nội dung báo cáo, mà là giúp bạn thu thập đủ ảnh chụp màn hình, terminal output và hiểu từng kết quả test đang chứng minh điều gì.

## 1. Kết Quả Cần Chứng Minh

| Nhóm test                       | Cần chứng minh                                                                 | Bằng chứng cần chụp                                                       |
| ------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Docker multi-instance           | BFF và Order có thể chạy nhân bản local trên nhiều container/process riêng     | `compose ps` hiện `bff-a`, `bff-b`, `order-a`, `order-b` đều healthy      |
| BFF realtime cross-instance     | Client socket nối BFF-B vẫn nhận event do command đi qua BFF-A phát ra         | Output `run-bff.sh` có dòng `BFF-B socket received events.cartUpdated...` |
| BFF customer session continuity | BFF-B đọc được session/cart sau khi BFF-A mutate cart                          | Output `run-bff.sh` có dòng `BFF customer session continuity works...`    |
| Order cart/session continuity   | Order-B đọc/mutate đúng state sau khi Order-A thao tác                         | Output `run-order.sh` có dòng `Order cart/session continuity works...`    |
| Order idempotency/replay        | Submit cùng idempotency key qua Order-A/B không tạo order trùng                | Output `run-order.sh` có dòng `Order idempotency/replay works...`         |
| Order command concurrency       | Hai confirm command đồng thời qua Order-A/B không làm sai stock/business state | Output `run-order.sh` có dòng `Order command concurrency works...`        |

## 2. Điều Kiện Trước Khi Chạy

Cần đứng trong root repo:

```bash
pwd
```

Expected path:

```text
/Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order
```

Cần Docker Desktop đang chạy. Bộ test sẽ dùng:

- Postgres shared: `localhost:15432`
- Redis shared: `localhost:16379`
- Kafka shared: `localhost:19092`
- BFF-A: `http://localhost:3300`
- BFF-B: `http://localhost:3302`
- Order-A TCP: `localhost:3201`
- Order-B TCP: `localhost:3211`

## 3. Setup Lần Đầu

Nếu chưa có file env local:

```bash
cp docker/env/.env.scale-test.example docker/env/.env.scale-test.local
```

Sau đó start stack:

```bash
bash tools/scale-test/up.sh
```

Lệnh này làm 3 việc:

1. Start infra dùng chung: Postgres, Redis, Kafka.
2. Provision database và chạy migration cho `catalog`, `order`, `payment`, `saas`.
3. Start các service cần test: `catalog`, `saas`, `order-a`, `order-b`, `bff-a`, `bff-b`.

Nếu chạy thành công, cuối output sẽ thấy các container có status `healthy`.

## 4. Kiểm Tra Multi-Instance Đang Chạy

Chạy:

```bash
bash tools/scale-test/compose.sh ps
```

Cần thấy tối thiểu các dòng sau:

```text
bff-a      ... healthy ... 3300->3300/tcp
bff-b      ... healthy ... 3302->3300/tcp
order-a    ... healthy ... 3201->3201/tcp
order-b    ... healthy ... 3211->3211/tcp
postgres   ... healthy ... 15432->5432/tcp
redis      ... healthy ... 16379->6379/tcp
kafka      ... healthy ... 19092->9092/tcp
```

Chụp màn hình để làm evidence:

- Tên ảnh gợi ý: `chapter6-27-scale-out-compose-ps.png`
- Nội dung ảnh cần thấy: command `bash tools/scale-test/compose.sh ps` và các service `bff-a`, `bff-b`, `order-a`, `order-b` đều `healthy`.

Ý nghĩa:

- `bff-a` và `bff-b` là hai instance BFF độc lập.
- `order-a` và `order-b` là hai instance Order độc lập.
- Postgres/Redis/Kafka là external shared state/shared broker, nên state không nằm cục bộ trong một instance.

## 5. Chạy Test BFF Scale-Out

Chạy:

```bash
bash tools/scale-test/run-bff.sh
```

Expected output:

```text
PASS Customer Socket.IO client connected to BFF-B /orders namespace
PASS BFF-A accepted customer cart mutation with shared Order/Redis state
PASS BFF-B socket received events.cartUpdated emitted by BFF-A through Redis Adapter
PASS BFF customer session continuity works across BFF-A and BFF-B
INFO Skipping staff auth continuity: set SCALE_TEST_STAFF_TOKEN to enable it
PASS BFF functional scale-out smoke completed
```

Chụp màn hình để làm evidence:

- Tên ảnh gợi ý: `chapter6-28-scale-out-bff-smoke.png`
- Nội dung ảnh cần thấy: toàn bộ các dòng `PASS`, đặc biệt là dòng `BFF-B socket received events.cartUpdated emitted by BFF-A through Redis Adapter`.

Giải thích từng dòng:

- `Customer Socket.IO client connected to BFF-B`: client realtime đang kết nối vào instance BFF-B, không phải BFF-A.
- `BFF-A accepted customer cart mutation`: HTTP command mutate cart đi qua BFF-A và thành công.
- `BFF-B socket received events.cartUpdated emitted by BFF-A through Redis Adapter`: event do BFF-A emit đã được fan-out sang socket client đang nằm trên BFF-B. Đây là bằng chứng chính cho realtime cross-instance.
- `BFF customer session continuity works`: sau khi BFF-A mutate, BFF-B vẫn đọc đúng cart/session. Điều này cho thấy customer state không bị kẹt trong memory của BFF-A.
- `Skipping staff auth continuity`: không phải lỗi. Test staff JWT chỉ chạy khi bạn set `SCALE_TEST_STAFF_TOKEN`.

Kết luận có thể rút ra:

- BFF đáp ứng functional scale-out cho customer realtime và session/cart path.
- Test này chứng minh về mặt functional design, không phải load benchmark hay capacity production.

## 6. Chạy Test Order Scale-Out

Chạy:

```bash
bash tools/scale-test/run-order.sh
```

Expected output:

```text
PASS Order cart/session continuity works across Order-A and Order-B
PASS Order idempotency/replay works across Order-A and Order-B
PASS Order command concurrency works across Order-A and Order-B
PASS Order functional scale-out smoke completed
```

Chụp màn hình để làm evidence:

- Tên ảnh gợi ý: `chapter6-29-scale-out-order-smoke.png`
- Nội dung ảnh cần thấy: 4 dòng `PASS` của Order.

Giải thích từng dòng:

- `Order cart/session continuity`: mutate/read state qua hai instance Order khác nhau vẫn đúng, vì cart/session nằm trong Redis/Postgres shared state.
- `Order idempotency/replay`: submit cùng `idempotencyKey` qua Order-A và Order-B không tạo order trùng. Đây là bằng chứng cho idempotency contract trên write path.
- `Order command concurrency`: hai confirm command đồng thời trên hai Order instance không làm double-confirm và không trừ stock sai. Test này dùng stock = 1, hai pending order, kỳ vọng chỉ một order confirm thành công.
- `Order functional scale-out smoke completed`: toàn bộ nhóm test Order pass.

Kết luận có thể rút ra:

- Order service đáp ứng functional scale-out cho cart/session shared state, idempotent submit, và command concurrency quan trọng.
- Test này không khẳng định throughput tối đa, nhưng chứng minh khi có nhiều instance thì business invariant vẫn được giữ.

## 7. Chạy Full Evidence Một Lần

Sau khi đã chụp riêng BFF và Order, có thể chụp thêm ảnh tổng hợp:

```bash
bash tools/scale-test/run-all.sh
```

Expected output:

```text
PASS Customer Socket.IO client connected to BFF-B /orders namespace
PASS BFF-A accepted customer cart mutation with shared Order/Redis state
PASS BFF-B socket received events.cartUpdated emitted by BFF-A through Redis Adapter
PASS BFF customer session continuity works across BFF-A and BFF-B
INFO Skipping staff auth continuity: set SCALE_TEST_STAFF_TOKEN to enable it
PASS BFF functional scale-out smoke completed
PASS Order cart/session continuity works across Order-A and Order-B
PASS Order idempotency/replay works across Order-A and Order-B
PASS Order command concurrency works across Order-A and Order-B
PASS Order functional scale-out smoke completed
```

Chụp màn hình để làm evidence:

- Tên ảnh gợi ý: `chapter6-30-scale-out-run-all.png`
- Nội dung ảnh cần thấy: cả nhóm BFF và nhóm Order đều pass trong cùng một terminal.

## 8. Lưu Terminal Output Dạng Text

Ngoài ảnh chụp màn hình, nên lưu output text để dễ trích lại trong phụ lục:

```bash
bash tools/scale-test/compose.sh ps | tee docs/graduation-thesis-resources/thesis-report/assets/test-evidence/scale-out-functional/compose-ps.txt
bash tools/scale-test/run-all.sh | tee docs/graduation-thesis-resources/thesis-report/assets/test-evidence/scale-out-functional/run-all.txt
```

Ý nghĩa:

- Ảnh chụp màn hình dùng cho báo cáo PDF.
- File `.txt` dùng làm evidence phụ lục, để đối chiếu khi cần exact terminal output.

## 9. Vị Trí Lưu Ảnh Chụp

Nên lưu screenshot vào:

```text
docs/graduation-thesis-resources/thesis-report/assets/screenshots/
```

Tên file gợi ý:

```text
chapter6-27-scale-out-compose-ps.png
chapter6-28-scale-out-bff-smoke.png
chapter6-29-scale-out-order-smoke.png
chapter6-30-scale-out-run-all.png
```

Khi chụp ảnh terminal, nên đảm bảo ảnh có:

- Command đã chạy.
- Các dòng `PASS` cần thiết.
- Nếu có thể, chạy `date` trước đó để có timestamp local.

Ví dụ:

```bash
date
bash tools/scale-test/run-all.sh
```

## 10. Optional: Staff Auth Continuity

Mặc định BFF smoke sẽ skip staff auth continuity vì cần JWT thật.

Nếu muốn test thêm, set:

```bash
export SCALE_TEST_STAFF_TOKEN='paste_staff_jwt_here'
bash tools/scale-test/run-bff.sh
```

Chỉ đưa vào báo cáo nếu bạn có token hợp lệ và output pass. Nếu không có token, ghi nhận rằng test bắt buộc cho functional scale-out hiện tại là customer realtime/session path, còn staff auth continuity là optional.

## 11. Khi Cần Build Image Từ Code Hiện Tại

Mặc định compose dùng image theo `SCALE_TEST_IMAGE_TAG` trong file env. Nếu muốn build image từ checkout hiện tại:

```bash
SCALE_TEST_IMAGE_TAG=scale-test bash tools/scale-test/build-images.sh
```

Sau đó mở:

```text
docker/env/.env.scale-test.local
```

Và set:

```bash
SCALE_TEST_IMAGE_TAG=scale-test
```

Chạy lại:

```bash
bash tools/scale-test/up.sh
bash tools/scale-test/run-all.sh
```

## 12. Stop Stack Sau Khi Chụp Xong

```bash
bash tools/scale-test/down.sh
```

Lệnh này dừng stack scale-test lại, không xóa volume mặc định.

## 13. Cách Diễn Giải Trong Báo Cáo

Khi viết báo cáo, nên diễn giải theo ý sau:

1. Mô hình thực nghiệm local chạy hai instance BFF và hai instance Order trên Docker Compose.
2. Các instance dùng chung Postgres, Redis và Kafka, tương đương external shared state/shared broker trong thiết kế scale ngang.
3. BFF test cho thấy request vào BFF-A vẫn làm client socket trên BFF-B nhận realtime event, chứng minh realtime fan-out không phụ thuộc memory của một instance.
4. Order test cho thấy state và command path vẫn đúng khi request đi qua hai instance Order khác nhau.
5. Kết quả này chứng minh functional scale-out design, không thay thế cho performance benchmark production.

Cụm từ nên dùng:

```text
functional scale-out design
multi-instance smoke test
shared external state
Socket.IO Redis Adapter cross-instance fan-out
idempotency/replay safety
command concurrency safety
```

Cụm từ nên tránh nói quá:

```text
hệ thống đã scale production hoàn hảo
exactly-once delivery
không thể có duplicate event
đã chứng minh throughput production
```

## 14. Troubleshooting Nhanh

Nếu `compose ps` không thấy service healthy:

```bash
bash tools/scale-test/compose.sh logs --tail=120 bff-a bff-b order-a order-b
```

Nếu Kafka báo lỗi `cluster.id`:

- Kiểm tra `KAFKA_CLUSTER_ID` trong `docker/env/.env.scale-test.local`.
- Giá trị mặc định của repo hiện tại là `replace_with_one_stable_kraft_cluster_id`.
- Không xóa volume nếu chưa chắc, vì volume có thể đang được dùng chung với infra local khác.

Nếu test BFF fail ở socket:

- Kiểm tra `bff-a` và `bff-b` có healthy không.
- Kiểm tra Redis có healthy không, vì Socket.IO Redis Adapter cần Redis để fan-out cross-instance.

Nếu test Order fail ở submit quota:

- Chạy lại `bash tools/scale-test/up.sh` để đảm bảo SaaS migration và seed runtime path đúng.
- Test script đã seed tenant, pricing plan và active subscription riêng cho submit path.

## 15. Tích Hợp Báo Cáo Allure Report Trực Quan (Visual Evidence)

Ngoài việc chạy CLI script thô, dự án hỗ trợ xuất báo cáo HTML trực quan bằng **Allure Report** thông qua **Playwright**. Báo cáo này tích hợp sơ đồ tuần tự (SVG flow diagrams) và dữ liệu trạng thái (JSON attachments) thực tế từ cơ sở dữ liệu.

Đây là bằng chứng trực quan và thuyết phục nhất để đưa vào nội dung báo cáo khóa luận.

### 15.1. Khởi chạy và Tạo Báo cáo

Hãy chạy lệnh sau để chạy E2E Playwright và tự động generate Allure report:

```bash
pnpm scale-test:allure
```

Sau khi chạy xong, Allure report sẽ được tạo tại thư mục `allure-report/`. Để khởi chạy Web Server xem báo cáo:

```bash
pnpm scale-test:allure:open
```

### 15.2. Các Giao Diện Allure Cần Chụp Làm Evidence

Trong giao diện Allure Report, hãy chọn mục **Suites** ở menu bên trái và mở suite **Functional Scale-Out**. Bạn sẽ thấy 3 test case:

1. **Docker topology shows two BFF and two Order instances**
   - **Minh chứng:** Docker Compose process table (`docker-compose-ps.txt` ở dạng text đính kèm) và sơ đồ kiến trúc topology SVG vẽ tự động.
   - **Ảnh chụp gợi ý:** Chụp tổng quan test case này kèm sơ đồ topology SVG hiển thị trực quan cấu hình multi-instance.
   - **Tên ảnh:** `chapter6-31-allure-topology.png`

2. **BFF realtime fan-out is delivered from BFF-A to a client on BFF-B**
   - **Minh chứng:** Step-by-step timeline (bước gửi HTTP PATCH qua BFF-A, bước nhận event qua socket BFF-B) và file đính kèm `bff-scale-out-evidence.json` chứa payload socket event thực tế.
   - **Ảnh chụp gợi ý:** Click vào file `bff-scale-out-evidence.json` để bung dữ liệu JSON trực quan trên giao diện Allure. Chụp lại màn hình này.
   - **Tên ảnh:** `chapter6-32-allure-bff-realtime.png`

3. **Order service preserves idempotency and stock invariants across Order-A and Order-B**
   - **Minh chứng:** Assertions chứng minh tính duy nhất của Order (idempotency) và tính nhất quán của Kho hàng (Catalog stock) sau khi chạy đua đồng thời (concurrency race) qua 2 instance Order-A/B.
   - **Ảnh chụp gợi ý:** Bung các bước kiểm thử chi tiết và mở file `order-confirm-concurrency-final-state.json` để thấy trạng thái database ghi nhận 1 đơn PROCESSING, 1 đơn PENDING, và stock Catalog về đúng 0.
   - **Tên ảnh:** `chapter6-33-allure-order-consistency.png`
