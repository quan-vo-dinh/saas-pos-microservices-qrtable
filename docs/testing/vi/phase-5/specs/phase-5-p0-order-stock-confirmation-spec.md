# Phase 5 P0 — Spec Xác Nhận Order Và Trừ Stock

> **Trạng thái:** Mini-spec chuẩn cho Phase 5 trước Step 5.3.
> **Rule ID:** `P0-ORD-STATE-STOCK`.
> **Phạm vi:** Staff xác nhận order, Catalog trừ stock, và tạo outbox `order.confirmed`.

---

## 1. Vấn Đề

Inventory Phase 5 đã thấy coverage mock cho xác nhận order và lỗi stock từ Catalog, nhưng rule P0 về tiền còn phụ thuộc vào quyền sở hữu stock an toàn khi có race. Hệ thống không được cho hai lần xác nhận staff cùng tiêu thụ món cuối cùng, và test phải tách rõ coverage unit-contract nhanh với integration thật qua PostgreSQL/Catalog TCP.

---

## 2. Quyết Định

1. Customer submit order tạo order `PENDING` và không trừ stock món.
2. Staff confirm là đường duy nhất trừ stock menu nhà hàng cho order.
3. Order Service sở hữu chuyển trạng thái order:
   - Lock dòng order.
   - Yêu cầu `PENDING` trước lần confirm đầu tiên.
   - Load bill đang mở có chứa order.
   - Gọi Catalog `MENU_ITEM.STOCK_DEDUCT_FOR_ORDER` trước khi persist `PROCESSING`.
   - Persist order và order items là `PROCESSING`.
   - Persist một outbox event `order.confirmed`.
4. Catalog Service sở hữu mutation stock:
   - Gộp các dòng trùng menu item trước khi mutate.
   - Lock mỗi menu item một lần theo thứ tự id ổn định.
   - Dùng transaction PostgreSQL và row lock `pessimistic_write` cho stock rows.
   - Reject thiếu stock bằng `CATALOG_STOCK_INSUFFICIENT`.
   - Không bao giờ để stock âm.
5. Lỗi stock từ Catalog phải chặn confirm trước khi Order persist state transition hoặc outbox.
6. Replay confirm cho order đã `PROCESSING` không được trừ stock lần nữa hoặc tạo thêm outbox event.

---

## 3. Contract Đồng Thời

Với case race chuẩn:

- Stock ban đầu: `menuItem.stock = 1`.
- Hai lần confirm cùng tiêu thụ quantity `1` cho cùng tenant và menu item.
- Kết quả kỳ vọng:
  - đúng một confirm thành công;
  - đúng một confirm nhận lỗi có cấu trúc `CATALOG_STOCK_INSUFFICIENT`;
  - stock cuối là `0`;
  - stock cuối không bao giờ âm;
  - chỉ order thành công chuyển sang `PROCESSING` và emit `order.confirmed`.

---

## 4. Contract Test

Test unit-contract nhanh bắt buộc:

- Order confirmation gọi Catalog stock deduct với idempotency key `confirm-order:{orderId}`.
- Confirm thành công chuyển order sang `PROCESSING` và persist một outbox event `order.confirmed`.
- Replay ở trạng thái processing không gọi Catalog stock deduct và không persist thêm outbox event.
- Catalog stock deduction gộp dòng trùng và lock danh sách menu item id duy nhất đã sort.
- Catalog repository dùng `pessimistic_write` và thứ tự ổn định `menuItem.id ASC` cho stock locks.
- Simulation concurrent stock=1 của Catalog có một success, một `CATALOG_STOCK_INSUFFICIENT`, và stock cuối `0`.
- Lỗi stock từ Catalog qua TCP ngăn Order persist.

Integration external-stack Step 5.3 bắt buộc:

- Dùng PostgreSQL và boundary Catalog TCP hoặc outbox harness tương đương production.
- Seed tenant cô lập, một category, một menu item `stock=1`, hai pending orders, và open bill path.
- Chạy hai confirm đồng thời.
- Assert final Order rows, Catalog stock row, và outbox rows, không chỉ assert số lần gọi mock.

---

## 5. Ngoài Phạm Vi

- Payment settlement và chuyển bàn sang cleaning sau khi bill paid.
- Kitchen station ticket generation sau khi consume Kafka.
- Xóa menu item khi đang có active order.

---

## 6. Tiêu Chí Chấp Nhận

- Step 5.2 có thể tính phần unit-contract là đã harden khi các fast tests ở trên pass.
- `P0-ORD-STATE-STOCK` vẫn nên giữ `partial` cho đến khi integration external-stack Step 5.3 chứng minh concurrency contract trên PostgreSQL/Catalog TCP hoặc harness tương đương.
