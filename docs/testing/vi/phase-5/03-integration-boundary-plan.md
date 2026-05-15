# Kế hoạch Phase 5 — 03 Test ranh giới integration

## Mục tiêu

Chứng minh hành vi mà mock không chứng minh được: tenant isolation, bộ lọc persistence thật, ngữ nghĩa Redis, giả định delivery Kafka/outbox, ranh giới TCP service, auth smoke, và thay đổi trạng thái đồng thời.

## Đầu vào

- `docs/testing/phase-5/traceability-matrix.md`
- Script seed dev dưới `tools/dev-seed/**`
- Integration spec hiện có, đặc biệt `libs/frontend/utils/src/lib/__tests__/integration/**`
- Script package và workflow CI hiện tại
- Giả định infra local từ `docs/technical-architecture.md`
- `[specs/phase-5-sepay-local-mock-testing-policy.md](specs/phase-5-sepay-local-mock-testing-policy.md)`

## Nhóm ranh giới

| Nhóm                 | Cần chứng minh                                                                                   | Stack bắt buộc                        |
| -------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| Catalog isolation    | Dữ liệu tenant A/B không rò qua public menu hoặc admin CRUD                                      | Postgres, BFF/Catalog hoặc API client |
| Stock concurrency    | Hai lần confirm vào stock = 1 cho một thành công, một lỗi có cấu trúc, stock không âm            | Postgres, Catalog, Order              |
| Redis semantics      | TTL cart/session, bill lock, idempotency key, cache suspend/subscription                         | Redis, Order/SaaS/BFF                 |
| Kafka/outbox         | Consumer `order.confirmed`, `payment.completed`, `tenant.created` idempotent                     | Kafka hoặc consumer harness trực tiếp |
| Payment finalization | Đường cash/VietQR paid cập nhật Payment, hóa đơn Order, session, và trạng thái bàn idempotent    | Postgres, Order, Payment, Catalog     |
| Auth/RBAC smoke      | Role seed đại diện đăng nhập và nhận permission như kỳ vọng                                      | Keycloak, User-Access, BFF, Mongo     |
| Webhook routing      | Direct HMAC và route Phase 4B `x-secret-key` tách `QRTBL` và `QRSUB` đúng                        | BFF, Payment, SaaS                    |
| Mock provider SePay  | Hợp đồng OAuth token exchange, bank list, bank detail, và webhook upsert mà không gọi SePay live | Mock SePay local, BFF, Payment        |

## Việc cần làm

- [ ] Quyết định kiểu runner integration cho Phase 5: Jest integration spec hiện có kèm readiness check, compose profile, hoặc migration Testcontainers sau này.
- [ ] Tài liệu hóa biến môi trường bắt buộc và credential seed trước khi thêm test mới.
- [ ] Thêm hoặc tài liệu hóa mock SePay provider local cho test integration OAuth/payment-settings; default suite không được yêu cầu Vercel, public tunnel, hoặc SePay live.
- [ ] Thêm readiness check để test phụ thuộc stack skip với lý do rõ khi thiếu infra.
- [ ] Triển khai integration test P0 từng nhóm ranh giới một.
- [ ] Assert trạng thái cuối, không chỉ số lần gọi.
- [ ] Cập nhật ma trận traceability với đường dẫn integration spec chính xác và điều kiện skip.
- [ ] Ghi lại mọi `security-gap`, đặc biệt verify giá trị `x-secret-key` nếu vẫn chưa triển khai.

## Đầu ra

- Integration spec hoặc lệnh suite integration được tài liệu hóa.
- Chính sách seed/reset tái sử dụng cho phiên sau.
- Policy mock-provider SePay và env contract cho local integration.
- Ma trận traceability đã cập nhật yêu cầu stack và chính sách skip.
- Danh sách ngắn các blocker infra chưa giải quyết.

## Lệnh xác minh

Lệnh ban đầu có thể giữ tập trung cho đến khi có suite riêng:

```bash
pnpm nx test frontend-utils
pnpm nx test catalog
pnpm nx test order
pnpm nx test payment
pnpm nx test saas
bash tools/verify-permission-matrix.sh
```

## Ghi chú phiên sau

- Nếu test fail vì stack không chạy, cải thiện readiness/skip message trước khi debug business logic.
- Nếu test fail vì thiếu SePay live, Vercel redirect, hoặc tunnel config, đưa test đó vào live-smoke opt-in hoặc thay bằng mock provider local.
- Không che giấu nondeterminism bằng timeout dài. Ổn định seed, reset dữ liệu, và readiness trước.
- Với auth live, verify credential từ dev seed hoặc env đã tài liệu; không đưa secret thật vào tệp test.
