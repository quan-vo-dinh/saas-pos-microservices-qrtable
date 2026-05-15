# Phase 5 P0 — Spec quyền sở hữu làm tròn VND

> **Trạng thái:** Mini-spec chuẩn cho Phase 5 trước Bước 5.2.
> **Rule ID:** `P0-PAY-ROUNDING-VND`.
> **Phạm vi:** Tổng snapshot hóa đơn nhà hàng và persistence Payment cho bill nhà hàng.

---

## 1. Vấn đề

Tài liệu dự án chuẩn yêu cầu số tiền VND làm tròn lên bội số nghìn gần nhất và lưu `rawTotal`, `roundedTotal`, và `roundingDelta`. Test hiện assert giá trị ví dụ ở nhiều nơi, nhưng inventory Phase 5 không tìm thấy một policy helper chuẩn duy nhất hoặc contract ownership chứng minh rule làm tròn nằm ở đâu và Payment tiêu thụ thế nào.

Không có quyết định này, test có thể pass trong khi Order và Payment âm thầm tính tổng khác nhau.

---

## 2. Quyết định

1. Order sở hữu snapshot hóa đơn nhà hàng (restaurant bill snapshot).
2. Bill snapshot là source of truth cho:
   - `rawTotal`
   - `roundedTotal`
   - `roundingDelta`
3. Công thức chuẩn:

   ```ts
   roundedTotal = Math.ceil(rawTotal / 1000) * 1000;
   roundingDelta = roundedTotal - rawTotal;
   ```

4. `rawTotal` phải là số nguyên VND không âm. Đầu vào tiền âm hoặc không nguyên không hợp lệ tại policy boundary.
5. Payment phải persist các tổng từ Order bill snapshot. Payment không được tính lại tổng từ menu item, cart item, hay payload frontend.
6. Payment có thể validate tính nhất quán snapshot và từ chối snapshot không thể xảy ra, nhưng không được trở thành owner làm tròn bill nhà hàng.
7. Mọi surface thanh toán bill nhà hàng dùng `roundedTotal` làm số phải trả:
   - `amount` VietQR.
   - Cash tối thiểu `amountReceived >= roundedTotal`.
   - So sánh webhook underpaid.
   - Full refund fallback khi thiếu `paidAmount`.

---

## 3. Ví dụ làm tròn

| `rawTotal` | `roundedTotal` | `roundingDelta` |
| ---------- | -------------- | --------------- |
| 0          | 0              | 0               |
| 1          | 1000           | 999             |
| 999        | 1000           | 1               |
| 1000       | 1000           | 0               |
| 1001       | 2000           | 999             |
| 127500     | 128000         | 500             |

---

## 4. Contract kiểm thử

Test nhanh bắt buộc:

- Một suite unit-contract duy nhất bao phủ các ví dụ policy làm tròn trên.
- Test tạo bill hoặc bill snapshot chứng minh Order áp policy trước khi expose snapshot.
- Payment `createVietQr` persist `rawTotal`, `roundedTotal`, và `roundingDelta` từ Order snapshot.
- URL QR Payment dùng `roundedTotal`.
- Xác nhận cash từ chối `amountReceived < roundedTotal`.
- Webhook SePay underpayment so với `roundedTotal`.
- Refund fallback dùng `paidAmount ?? roundedTotal`.

Test âm bắt buộc:

- `rawTotal` âm bị từ chối tại policy boundary làm tròn.
- Snapshot không nhất quán ví dụ `rawTotal=127500`, `roundedTotal=127500`, `roundingDelta=0` bị từ chối hoặc fail contract test trước khi Payment có thể persist âm thầm.

---

## 5. Ngoài phạm vi

- Thuế, phí dịch vụ, giảm giá, và toán promotion vượt quá bill snapshot hiện có.
- Đa tiền tệ (multi-currency).
- Làm tròn số tiền hóa đơn subscription. Hóa đơn subscription dùng giá plan riêng bằng VND.

---

## 6. Tiêu chí chấp nhận

- `P0-PAY-ROUNDING-VND` chỉ chuyển từ `implementation-gap` sang `covered` khi policy làm tròn có một contract có thể test duy nhất và Payment được chứng minh tiêu thụ tổng từ Order snapshot.
- Test chỉ format UI không đủ cho rule này trừ khi policy backend đã được bảo phủ.
