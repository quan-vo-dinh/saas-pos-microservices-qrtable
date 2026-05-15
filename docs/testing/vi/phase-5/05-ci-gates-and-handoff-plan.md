# Kế hoạch Phase 5 — 05 CI gate và handoff

## Mục tiêu

Tài liệu hóa và nối các lệnh giúp Phase 5 lặp lại được: kiểm tra PR nhanh, unit/contract đầy đủ, integration phụ thuộc stack, E2E trình duyệt, và dry run trước demo.

## Đầu vào

- `docs/testing/phase-5/traceability-matrix.md`
- Lệnh test đã chứng minh qua Kế hoạch 02, 03, và 04
- `.github/workflows/ci.yml`
- `package.json`
- `playwright.config.ts`
- `[specs/phase-5-sepay-local-mock-testing-policy.md](specs/phase-5-sepay-local-mock-testing-policy.md)`

## Mô hình gate

| Gate               | Tần suất dự kiến                   | Stack bắt buộc                                                | Ý nghĩa khi fail                                            |
| ------------------ | ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| PR quick gate      | Mỗi PR/push                        | Chỉ Node                                                      | Code đổi làm hỏng lint/unit/build                           |
| Full unit/contract | Trước merge Phase 5                | Chỉ Node                                                      | Contract cấp project bị hồi quy                             |
| Integration gate   | Pre-demo/nightly/manual            | Postgres/Redis/Kafka/Auth tùy nhu cầu                         | Ranh giới thật hoặc seed bị hỏng                            |
| Browser E2E smoke  | Pre-demo/manual, sau này CI        | Full app stack + seed                                         | Luồng demo hoặc tích hợp FE/BE hồi quy                      |
| Provider checks    | Manual opt-in trước demo công khai | `RUN_LIVE_SEPAY=1` + public app/API URL + credential provider | Giả định SePay/OAuth/live webhook thật chưa được chứng nhận |

## Việc cần làm

- [ ] Chỉ thêm script package sau khi lệnh nền đã chứng minh trên máy local.
- [ ] Cập nhật CI chỉ cho gate deterministic trước. Không thêm Playwright vào PR CI cho đến khi stack và credential deterministic.
- [ ] Tài liệu hóa lệnh phụ thuộc stack trong hướng dẫn kiểm thử Phase 5 hoặc thư mục này.
- [ ] Giữ check SePay thật ngoài PR/local gate mặc định; tài liệu hóa thành live smoke opt-in với guard `RUN_LIVE_SEPAY=1`.
- [ ] Đảm bảo test skip in lý do hành động được, ví dụ thiếu BFF health, thiếu Keycloak credential, hoặc thiếu tenant suspended seed.
- [ ] Tạo checklist handoff Phase 5 cuối cùng tóm tắt dòng `covered`, `partial`, `missing`, `security-gap`, và `deferred`.
- [ ] Chạy lệnh verify cuối cùng và ghi lại kết quả.

## Đầu ra

- `package.json` script đã cập nhật nếu cần.
- Cập nhật `.github/workflows/ci.yml` tùy chọn nếu team chọn thêm gate deterministic.
- Ghi chú handoff cuối trong `docs/testing/phase-5/phase-5-handoff.md` (hoặc bản tiếng Việt nếu tạo song song).
- Ma trận traceability không còn dòng P0/P1 chưa phân loại.

## Lệnh xác minh

Dùng tập lệnh cuối cùng thống nhất trong lúc triển khai, dự kiến gồm:

```bash
pnpm exec nx run-many -t lint test build
pnpm exec nx run-many -t test
pnpm exec playwright test tests/e2e
```

Lệnh phụ thuộc stack phải được tài liệu kèm prerequisite thay vì im lặng coi là yêu cầu PR phổ quát.

## Ghi chú phiên sau

- Giữ PR CI đơn điệu và deterministic. Độ tin cậy full-stack có thể pre-demo/nightly cho đến khi infra ổn định.
- CI mặc định phải dùng mock SePay hoặc skip provider check. Live SePay smoke là gate manual riêng với env guard rõ ràng.
- Không đánh dấu Phase 5 hoàn thành nếu còn dòng P0 chưa phân loại.
- Test skip chỉ chấp nhận được khi ma trận nói vì sao và lệnh in vì sao.
- Handoff cuối nên liệt kê lệnh đã chạy chính xác, lệnh đã skip chính xác, và lý do mỗi lần skip.
