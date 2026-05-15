# Kế hoạch Phase 5 — 04 Luồng demo Playwright E2E

## Mục tiêu

Xây suite Playwright nhỏ, deterministic chứng minh hành trình người dùng quan trọng cho demo mà không trùng assertion unit hoặc integration.

## Đầu vào

- `tests/e2e/step-2.7-realtime.spec.ts`
- `tests/e2e/phase-3-payment.spec.ts`
- `playwright.config.ts`
- Script E2E trong `package.json`
- Dữ liệu seed dev và credential
- `[specs/phase-5-sepay-local-mock-testing-policy.md](specs/phase-5-sepay-local-mock-testing-policy.md)`
- Hướng dẫn `webapp-testing`: reconnaissance-then-action và server helper như hộp đen khi cần

## Triết lý E2E

- Test kết quả nhìn thấy được, không phải packet Kafka/Redis nội bộ.
- Ưu tiên selector role/text và `data-testid` ổn định khi role/text không đủ.
- Tránh `sleep` cố định trừ tương tác cố ý cần giữ; ưu tiên chờ URL, response, và trạng thái hiển thị.
- Giữ luồng serial khi chung seed state.
- Coi sự kiện WebSocket là gợi ý; assert snapshot cuối sau refetch/reload/reconnect.
- Không automate login SePay thật trong E2E mặc định. OAuth payment-settings dùng mock provider hoặc callback path đã seed; SePay live tách thành manual smoke.

## Luồng bắt buộc

| Luồng | Mục tiêu spec                         | Kết quả người dùng cần chứng minh                                                                                                  |
| ----- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| A     | `step-2.7-realtime.spec.ts` hiện có   | QR → menu → cart → order → POS confirm → KDS → served; khách thấy served sau reconnect/reload                                      |
| B     | Payment E2E mới/mở rộng               | Yêu cầu thanh toán → cash hoặc VietQR → hóa đơn immutable → session đóng → bàn chuyển cleaning                                     |
| C     | Onboarding SaaS mới                   | SUPER_ADMIN onboard tenant → Owner đăng nhập → subscription/payment settings hiển thị → tài nguyên tenant dùng được                |
| D     | Tenant suspended mới                  | Tenant suspended vẫn đọc được, chặn mutation cart/order mới, giữ đường thanh toán bill pending                                     |
| E     | Smoke admin/dashboard hoặc nhóm route | Public landing, admin tenants/plans/billing, owner subscription/payment settings, OAuth invalid-state và mock callback không trắng |

## Việc cần làm

- [ ] Inventory selector E2E hiện tại và chờ dễ vỡ.
- [ ] Tạo hoặc cập nhật helper dùng chung cho Keycloak login, tạo URL landing QR, hằng số seed, và readiness route.
- [ ] Thêm script package `e2e:phase3`, `e2e:phase4b`, và `e2e:demo` nếu suite mở rộng.
- [ ] Triển khai Luồng B sau khi integration đã chứng minh ngữ nghĩa payment finalization.
- [ ] Triển khai Luồng C và D sau khi có fixture seed suspended/onboarding.
- [ ] Với OAuth payment-settings, seed OAuth state hợp lệ rồi hoàn tất callback bằng fake code qua mock SePay provider; không phụ thuộc redirect URI Vercel đã đăng ký.
- [ ] Giữ screenshot/trace khi fail bật; không commit artifact báo cáo sinh ra.
- [ ] Cập nhật dòng traceability với đường dẫn spec E2E và biến môi trường bắt buộc.

## Đầu ra

- Playwright spec mới hoặc đã cập nhật dưới `tests/e2e/`.
- Helper E2E dùng chung tùy chọn nếu trùng lặp giữa spec.
- Script package cho các lần chạy E2E được chọn.
- Yêu cầu fixture/seed được tài liệu cho mỗi luồng trình duyệt.

## Lệnh xác minh

```bash
pnpm e2e:step2.7
pnpm exec playwright test tests/e2e/phase-3-payment.spec.ts
pnpm exec playwright test tests/e2e
```

## Ghi chú phiên sau

- Trước khi viết browser test, khởi động app hoặc xác nhận đang chạy, rồi inspect trang render sau `networkidle`.
- Với UI SePay OAuth, chỉ test callback và bank-selection behavior của QRTable bằng dữ liệu mock provider; default suite không đi qua login provider live.
- Nếu dùng helper từ `webapp-testing`, chạy `scripts/with_server.py --help` trước.
- Nếu selector khó nhắm, ưu tiên thêm accessible name ổn định hoặc `data-testid` trong app hơn là dựa cấu trúc CSS.
- Không để E2E assert payload sự kiện nội bộ; dùng trạng thái UI và snapshot nhìn thấy được từ API.
