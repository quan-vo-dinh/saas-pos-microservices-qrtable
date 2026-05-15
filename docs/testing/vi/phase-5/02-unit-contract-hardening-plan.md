# Kế hoạch Phase 5 — 02 Củng cố unit và contract

## Mục tiêu

Khép khoảng trống P0/P1 nhanh, deterministic bằng Jest và kiểm tra contract trước khi tốn thời gian cho integration chậm hơn hoặc luồng trình duyệt.

## Đầu vào

- `docs/testing/phase-5/traceability-matrix.md`
- Jest hiện có trong `apps/**` và `libs/**`
- Cấu hình project Nx và Jest
- Tiêu chí chấp nhận Phase 5

## Lát công việc (work slices)

Các lát có thể gán song song sau khi ma trận traceability có bản nháp P0 đầu tiên.

| Lát                | Project/lib chính                                          | Trọng tâm                                                                                  |
| ------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Catalog/QR         | `apps/catalog`, `libs/providers/cloudinary`, BFF catalog   | Đường QR token giả mạo/không hợp lệ, policy CRUD menu/bàn, ràng buộc xóa, đường upload     |
| Order/cart/session | `apps/order`, `libs/shared/types`, BFF order               | Transition, idempotency, cart version, bill request lock, ID yêu cầu chuyển bàn            |
| Kitchen/realtime   | `apps/kitchen`, BFF realtime, hook management/customer     | Idempotency sự kiện trùng, điểm hàng đợi KDS, quyền station, hook refetch                  |
| Payment/refund     | `apps/payment`, BFF payment, order payment consumer        | Làm tròn VND, `QRTBL`, policy cash/VietQR, webhook duplicate/underpaid/after-paid          |
| SaaS 4B            | `apps/saas`, BFF SaaS, payment settings, frontend SaaS     | `QRSUB`, vòng đời subscription, vòng đời tenant, OAuth state, guard payment settings       |
| RBAC/architecture  | `apps/user-access`, `libs/constants`, `libs/configuration` | Số lượng permission, route metadata, default topic Kafka, không có contract `menu.updated` |

## Việc cần làm

- [ ] Chọn một lát P0 từ ma trận traceability.
- [ ] Tìm test hiện có trước khi tạo mới; mở rộng tệp spec hiện có nếu trách nhiệm đã thuộc về đó.
- [ ] Thêm test ở tầng đủ thấp nhất: pure service/unit trước, contract BFF/controller sau, hook/component frontend chỉ cho hành vi UI.
- [ ] Tránh assert chi tiết triển khai thuộc integration test, ví dụ lock DB thật hoặc delivery broker Kafka.
- [ ] Thêm/cập nhật dòng traceability với đường dẫn tệp test mới.
- [ ] Chạy test tập trung cho project đã chạm.

## Đầu ra

- Jest spec đã cập nhật trong project liên quan.
- Dòng ma trận traceability chuyển từ `missing` hoặc `partial` sang `covered` khi phù hợp.
- Ghi chú cho rule P0 không thể test ở tầng unit/contract và phải chuyển sang integration.

## Lệnh xác minh

Chỉ dùng lệnh liên quan project đã chạm, ví dụ:

```bash
pnpm nx test bff
pnpm nx test catalog
pnpm nx test order
pnpm nx test kitchen
pnpm nx test payment
pnpm nx test saas
pnpm nx test user-access
pnpm nx test shared-types
```

## Ghi chú phiên sau

- Giữ unit test nhanh và hermetic. Nếu test cần Postgres/Redis/Kafka/Keycloak, chuyển sang Kế hoạch 03.
- Không dùng E2E để verify độ đầy đủ DTO hay enum.
- Ưu tiên factory và mock helper có sẵn; không giới thiệu abstraction kiểm thử rộng trừ khi hai project trở lên thực sự cần.
