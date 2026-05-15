# Kế hoạch Phase 5 — 01 Inventory traceability

## Mục tiêu

Tạo ma trận rule-to-test quyết định Phase 5 phải test gì, phần nào đã được bảo phủ, và phần nào là deferred hợp lệ hay khoảng trống triển khai.

## Đầu vào

- `docs/phases/phase-5-7-finalization.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/architecture/permission-matrix.md`
- Bản ghi phase đã hoàn thành: Phase 1, 2A, 2B, 3, 4B
- Test hiện có dưới `apps/**`, `libs/**`, và `tests/e2e/**`

## Việc cần làm

- [ ] Inventory test hiện có bằng `rg --files -g '*.spec.*' -g '*.test.*' -g 'tests/e2e/**'`.
- [ ] Nhóm rule theo miền: Catalog/QR, Order/cart/session, Kitchen/realtime, Payment/refund, SaaS 4B, RBAC/auth, architecture invariants.
- [ ] Tạo `docs/testing/phase-5/traceability-matrix.md` (hoặc bản tiếng Việt tại `docs/testing/vi/phase-5/traceability-matrix.md`) với các cột định nghĩa trong tài liệu Phase 5.
- [ ] Điền `current_test` bằng đường dẫn tệp cụ thể cho rule đã được bảo phủ.
- [ ] Đánh dấu mỗi dòng là `covered`, `partial`, `missing`, `implementation-gap`, `security-gap`, hoặc `deferred-by-phase`.
- [ ] Xác định lô P0 đầu tiên cho worker unit/contract, integration, và E2E.
- [ ] Thêm mục "Top Gaps" sắp xếp theo rủi ro P0/P1 và tầng đích.

## Đầu ra

- `docs/testing/phase-5/traceability-matrix.md` (nguồn chuẩn) và/hoặc bản dịch `docs/testing/vi/phase-5/traceability-matrix.md`
- Backlog ưu tiên ngắn trong ma trận đó:
  - Test P0 cần thêm ngay
  - Test P1 sau P0
  - Khoảng trống bảo mật
  - Mục `deferred-by-phase`

## Xác minh

- Mỗi tiêu chí chấp nhận Phase 5 có ít nhất một dòng ma trận.
- Mỗi dòng P0 có hoặc tệp test cụ thể hoặc hành động tiếp theo cụ thể.
- Hạng mục Phase 4A và 4C không trộn vào chấp nhận Phase 5 trừ khi đã triển khai và nằm trên đường demo hiện tại.

## Ghi chú phiên sau

- Không bắt đầu bằng việc thêm test mù. Bắt đầu bằng cập nhật hoặc đọc ma trận.
- Nếu code và tài liệu mâu thuẫn, phân loại mismatch trước. Không đổi hành vi sản phẩm trong pass traceability.
- Giữ ID dòng ổn định; các kế hoạch sau nên tham chiếu ID như `P0-PAY-WEBHOOK-DUP` hoặc `P0-SAAS-SUSPEND-CUSTOMER`.
