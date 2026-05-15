# Phase 5–7 — Hoàn Thiện: Kiểm Thử, Quan Sát & Triển Khai Demo

> **Mục tiêu:** Khóa chất lượng hệ thống QRTable SaaS POS bằng kiểm thử tự động đa tầng, làm hệ phân tán **quan sát được** (sức khỏe dịch vụ, log, metric, trace), và đóng gói **triển khai + dữ liệu mẫu + kịch bản demo** để luận văn và review có thể tái lập end-to-end — giảm rủi ro hồi quy nghiệp vụ (đơn, tiền, đa tenant, bếp) và chứng minh luồng QR → bếp → thanh toán trước hội đồng.
> **Ước lượng:** ~3–5 tuần (tổng Phase 5 + 6 + 7)
> **Trạng thái:** ⬜ TODO

## Prerequisites

- Hoàn thành các phase lõi đã đóng trên critical/demo path: **0, 1, 2A, 2B, 3** và phần SaaS đã hoàn tất ở **4B**. Phase 4A đang deferred và Phase 4C chưa bắt đầu; chúng không chặn Phase 5-7 trừ khi demo yêu cầu saga-hardening hoặc notification/staff management.

## Tham Chiếu

| Tài liệu                  | Section liên quan                                                                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| technical-architecture.md | §13 Observability — nguyên tắc log/metric/trace và vai trò trong hệ vi dịch vụ                                                                             |
| technical-architecture.md | §14 Deployment — triển khai, compose, môi trường                                                                                                           |
| business-logic.md         | Toàn bộ — kiểm thử tự động nhằm **xác nhận** các quy tắc nghiệp vụ đã mô tả (state machine, tiền, token, cô lập tenant), không thay thế tài liệu nghiệp vụ |

## Tổng Quan

Ba mảng này được gộp một tài liệu vì cùng một "cổng hoàn thiện" trước bàn giao: **Testing** đảm bảo hành vi đúng theo business-logic và kiến trúc đã chọn; **Observability** đảm bảo khi hệ chạy nhiều tiến trình và message bus, vẫn trả lời được _đang lỗi ở đâu, ai bị ảnh hưởng, nghiệp vụ có đạt SLA không_; **Docker + Demo** đảm bảo người chấm và đồng nghiệp có thể nhắc lại cùng một kịch bản mà không phụ thuộc máy dev cá nhân. Thứ tự gợi ý: ưu tiên nền test song song với chỉnh observability tối thiểu (health/log), sau đó hoàn thiện dashboard/alert và cuối cùng đóng gói compose + seed + script bảo vệ.

---

## Phase 5 — Testing (~1–2 tuần)

**Vì sao:** Sau Phase 4B, hệ thống không còn chỉ là QR ordering demo đơn lẻ mà đã là SaaS POS đa tenant với Order, Kitchen, Payment, SaaS lifecycle, subscription gating, tenant payment settings và nhiều kênh realtime/cache. State machine đơn/bàn, tiền, QR/session, Redis/Kafka/WebSocket và tenant isolation là những chỗ **lỗi một lần là lỗi tiền, lộ dữ liệu hoặc gãy demo**. Phase 5 phải khóa các hành vi đã triển khai bằng test có chủ đích, không chạy theo số coverage đẹp.

### Rà soát sau Phase 4B

Các điểm cần chỉnh so với bản Phase 5 cũ:

- **Prerequisite cũ "hoàn thành Phase 0-4" không còn đúng.** Trạng thái hiện tại là Phase 0, 1, 2A, 2B, 3 và **4B** đã hoàn thành; **4A deferred**, **4C TODO**. Test Phase 5 phải xác minh các hành vi đã có và chỉ ghi nhận test gap cho saga-hardening/notification/staff management nếu chúng là deferred scope.
- **Phạm vi cũ thiếu Phase 4B.** Cần thêm tenant lifecycle `ACTIVE/SUSPENDED/CLOSED`, subscription/pricing plan, feature gating, tenant payment settings, two-tier payment references `QRTBL`/`QRSUB`, admin-assisted onboarding và Customer PWA suspended/read-only behavior.
- **Phạm vi cũ gọi E2E là Supertest chưa khớp repo.** Hiện E2E browser dùng Playwright trong `tests/e2e`; Supertest phù hợp hơn nếu sau này thêm API e2e cho BFF/Nest. Phase 5 nên tách rõ `API integration/contract` và `browser E2E`.
- **Phạm vi cũ chưa phản ánh kiến trúc snapshot + realtime hint.** WebSocket/Kafka/Redis events không phải source of truth cho UI; tests phải kiểm chứng clients refetch REST snapshots sau hint/reconnect, không assert UI tự build state từ packet.
- **Phạm vi cũ chưa đủ cho Redis/Kafka boundaries.** Cần test idempotency/outbox baseline, KDS Redis-only queue, OAuth state cache, suspended/subscription cache, Kafka topic registry 4P+2AP và "không có menu.updated" để tránh hồi quy kiến trúc.
- **Phạm vi cũ chưa có CI/gate strategy.** Repo hiện có nhiều Jest tests và một số Playwright smoke; Phase 5 cần chuẩn hóa lệnh nhanh cho PR, lệnh đầy đủ cho pre-demo/nightly, seed fixture và skip policy rõ ràng cho test cần stack thật.
- **Phạm vi cũ chưa phân biệt test gap, implementation gap và deferred scope.** Phase 5 không được âm thầm đổi product behavior để "cho test pass"; mọi rule chưa có code phải được phân loại là `missing`, `implementation-gap`, `security-gap` hoặc `deferred-by-phase`.

### Chiến lược kiểm thử

Nguyên tắc chính:

- **Risk-based, contract-first:** Ưu tiên hành vi có rủi ro tiền, tenant isolation, state transition, auth/RBAC, realtime consistency và demo path.
- **Test đúng tầng:** Unit khóa invariant/policy; integration khóa DB/Redis/TCP/Kafka boundary; browser E2E khóa journey người dùng. Không nhân bản cùng một assertion ở mọi tầng.
- **Current-code first:** Khi phase docs cũ lệch `business-logic.md`, `technical-architecture.md` hoặc tests/code hiện tại, test theo hành vi đã triển khai/canonical mới nhất.
- **Snapshot là source of truth:** Realtime events chỉ là hint để invalidate/refetch; E2E không được phụ thuộc vào packet payload như state canonical.
- **Deferred rõ ràng:** Không tính thiếu test cho Phase 4A/4C là lỗi Phase 5, trừ khi tài liệu Phase 5 vô tình yêu cầu behavior chưa triển khai.

### Canonical Scope Sau Phase 4B

Phase 5 canonical hóa test cho **hành vi đã triển khai hoặc đã chốt là current contract**. Nếu phát hiện lệch giữa docs và code, áp dụng thứ tự nguồn sự thật trong `docs/README.md`: code/tests hiện tại -> accepted specs -> final phase records -> overview docs. Kết quả rà soát không chỉ là thêm test, mà còn là phân loại chính xác trạng thái của từng rule.

| Loại scope           | Cách xử lý trong Phase 5                                                                             | Ví dụ cụ thể                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `covered`            | Giữ test hiện có, gắn vào traceability matrix                                                        | Shared transition tests, BFF guards, Payment duplicate webhook, SaaS subscription invoice tests                        |
| `partial`            | Bổ sung test ở tầng thấp nhất đủ chứng minh rule                                                     | Payment UI smoke có nhưng chưa chứng minh full close-session; permission unit có nhưng live Keycloak smoke chưa ổn     |
| `missing`            | Thêm test nếu behavior đã có trong code và thuộc Phase 0/1/2A/2B/3/4B                                | Catalog QR invalid token/rate limit; table/menu delete constraints; suspended tenant browser route fixture             |
| `implementation-gap` | Không sửa behavior trong Phase 5; ghi rõ cần phase/PR riêng nếu rule canonical chưa có code          | Offline queue IndexedDB, full staff invite UI, production webhook replay dashboard                                     |
| `security-gap`       | Test current contract nếu có, đồng thời đánh dấu blocker trước go-live/demo thật nếu thiếu hardening | Phase 4B tenant/platform `x-secret-key` route hiện cần value verification với secret đã lưu, không chỉ presence check  |
| `deferred-by-phase`  | Không tính fail Phase 5; giữ trong backlog Phase 4A/4C hoặc post-thesis                              | Full saga/CDC/Debezium, notification email receipt/welcome/suspend, reset-password email, Notification Service runtime |

### Priority Bands

| Band | Rule chọn test                                                                                  | Bắt buộc trong Phase 5                                                                     |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| P0   | Lỗi gây mất tiền, lộ cross-tenant data, phá state machine, bypass auth/RBAC hoặc gãy demo chính | Phải có test cụ thể hoặc gap được ghi rõ trước khi Phase 5 được coi là đạt                 |
| P1   | Lỗi gây sai UX vận hành, mất realtime hint, cache stale, thiếu visibility cho staff/owner       | Có unit/contract hoặc integration smoke tùy blast radius                                   |
| P2   | UI smoke, route không blank, regression nhỏ, docs/tooling                                       | Có thể gom vào pre-demo smoke hoặc checklist thủ công nếu tự động hóa tốn nhiều hơn rủi ro |

### Test Matrix Mục Tiêu

| Vùng rủi ro             | Unit / contract                                                                                              | Integration                                                                                            | Browser E2E / smoke                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Tenant isolation + RBAC | Permission matrix, guards, route permission metadata, role seed counts                                       | Tenant-scoped queries không trả dữ liệu cross-tenant; SUPER_ADMIN exception có kiểm soát               | OWNER/MANAGER/WAITER/CHEF/BARISTA route visibility và 403/redirect chính                                      |
| Catalog + QR/table/menu | QR HMAC/token helpers, slug/table route constants, upload validators, delete constraints, plan table quota   | Catalog tenant isolation; QR validate/join; menu/table CRUD filter tenant; Cloudinary path validation  | Customer QR landing/menu load; owner can manage minimum category/item/table without leaking cross-tenant data |
| QR session + cart       | QR/token helpers, cart version conflict, session status policy                                               | Redis cart/session TTL, idempotency key, request bill lock                                             | Customer scan QR, join session, cart mutation, submit, reload/reconnect                                       |
| Order + table state     | Shared transition matrices, cancel policy, transfer request id, bill request policy                          | Order confirm với Catalog stock deduct/release; table transfer consistency; bill aggregates            | QR -> order -> POS confirm -> KDS -> served                                                                   |
| Kitchen + realtime      | KDS queue scoring, station access, SLA worker, gateway room derivation                                       | Kafka `order.confirmed` -> Kitchen Redis ticket -> BFF `kds.queue_changed` hint                        | KDS station flow, reconnect/refetch snapshot, waiter sees ready/served                                        |
| Payment + refund        | VND rounding, payment reference, cash/VIETQR policy, webhook duplicate/underpaid/after-paid, refund state    | Payment transaction + Order `BILL_MARK_PAID`; outbox `payment.completed`; payment history tenant scope | POS cash/VietQR panels, Customer payment screen, paid bill immutability/refund visibility                     |
| SaaS Phase 4B           | Slug, onboarding saga, tenant lifecycle, subscription invoice, payment settings, OAuth state, feature gating | SaaS onboarding cross-service compensation; Redis suspend/subscription cache; `QRSUB` invoice matching | Public landing, SUPER_ADMIN tenant/plan/billing, OWNER subscription/payment settings, suspended Customer PWA  |
| Architecture invariants | Kafka topic registry, Redis access policy, no `menu.updated`, BFF route constants, TCP pattern exposure      | Allowed Redis/Kafka access checks; topic/env defaults match canonical 5-topic registry                 | Browser checks observe final UI snapshots and refetch behavior, not hidden event internals                    |

### Steps

#### Step 5.1 — Inventory + Traceability Matrix (1-2 ngày)

**Mục tiêu:** Biết chính xác business rule nào đã có test, test nằm ở tầng nào, và gap nào là hợp lệ do Phase 4A/4C chưa làm.

**Phạm vi:**

- Lập bảng traceability từ `business-logic.md`, `technical-architecture.md`, `docs/phases/phase-2a-order-kafka.md`, `phase-2b-kitchen-websocket.md`, `phase-3-payment.md`, `phase-4b-saas-onboarding.md` sang test hiện có.
- Gắn mỗi rule vào một trong sáu trạng thái: `covered`, `partial`, `missing`, `implementation-gap`, `security-gap`, `deferred-by-phase`.
- Đánh dấu test cần stack thật: PostgreSQL/Redis/Kafka/Keycloak/frontend servers.
- Xác nhận baseline hiện tại: nhiều Jest tests đã tồn tại cho BFF, management-app, customer-pwa, saas, order, payment, catalog, kitchen; E2E top-level hiện mới là Playwright smoke/journey hạn chế.

**Format tối thiểu của traceability matrix:**

| Cột                    | Ý nghĩa                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `rule_id`              | ID ổn định, ví dụ `P0-PAY-WEBHOOK-DUP`, `P0-SaaS-SUSPEND-CUSTOMER`, `P1-KDS-REFETCH`                 |
| `source`               | File/section nguồn: business logic, architecture, phase record, accepted spec                        |
| `business_rule`        | Rule cần bảo vệ bằng test hoặc gap record                                                            |
| `risk`                 | `money`, `tenant-isolation`, `rbac`, `state-machine`, `realtime`, `demo`, `security`, `architecture` |
| `priority`             | `P0`, `P1`, `P2`                                                                                     |
| `current_test`         | File test hiện có hoặc `none`                                                                        |
| `target_layer`         | `unit-contract`, `integration`, `browser-e2e`, `manual-provider`, `deferred`                         |
| `status`               | `covered`, `partial`, `missing`, `implementation-gap`, `security-gap`, `deferred-by-phase`           |
| `notes_or_next_action` | Lý do phân loại và bước tiếp theo cụ thể                                                             |

**Anchor phải có trong matrix:**

- Phase 1/Catalog: QR/token, public menu, CRUD tenant isolation, table status/delete constraints, Cloudinary validation/path.
- Phase 2A: session/cart/idempotency, order/bill/service request transitions, stock deduct on confirm, table transfer.
- Phase 2B: KDS Redis queue, duplicate `order.confirmed`, station access, snapshot-refetch after realtime hint.
- Phase 3: VND rounding, `QRTBL`, cash/VietQR settlement, webhook duplicate/underpaid/after-paid, refund full-only, payment completion -> Order finalization.
- Phase 4B: tenant lifecycle, subscription/plan, `QRSUB`, OAuth state, payment settings, feature gating, suspended/closed customer behavior.
- Architecture: Kafka 5-topic registry, Redis access policy, no `menu.updated`, BFF Direct vs Kafka boundaries, permission matrix counts.

**Verify:** Có thể nhìn bảng và trả lời "rule này được bảo vệ bởi test nào" hoặc "vì sao chưa test trong Phase 5".

#### Step 5.2 — Unit + Contract Hardening (2-3 ngày)

**Mục tiêu:** Khóa các invariant thuần và hợp đồng service/UI nhanh, chạy ổn định trong PR.

**Phạm vi ưu tiên:**

- **Order/Bill/Table:** valid/invalid transitions, `DRAFT` không persist DB row, `PENDING -> PROCESSING -> READY -> SERVED -> COMPLETED`, bill `OPEN -> PENDING_PAYMENT -> PAID`, table `AVAILABLE/OCCUPIED/BILLING/CLEANING`, cancel pending/processing policy.
- **Catalog/QR/Menu/Table:** QR token tamper/invalid path, menu visibility contract, delete constraints, table status transition helpers, table quota guard inputs, upload validator/tenant folder contract.
- **Payment:** VND rounding edge cases, `QRTBL` reference generation/collision fallback, cash `amountReceived >= roundedTotal`, VIETQR pending reuse, underpaid/duplicate/after-paid webhook, refund full-only policy.
- **SaaS Phase 4B:** slug/reserved collision, tenant status semantics, feature quotas (`max_tables`, `max_staff`, `max_orders_per_day`), `QRSUB` invoice matching, one active subscription, OAuth state/token secrecy, payment settings permissions.
- **BFF/auth:** `UserGuard -> TenantGuard -> PermissionGuard`, customer lifecycle guard, tenant plan/status guards, route permission metadata for SaaS/payment/order/kitchen surfaces.
- **Frontend components/hooks:** disabled controls for suspended tenant, payment exception for pending bills, POS/KDS realtime refetch hooks, dashboard auth readiness, role-based navigation.
- **Static architecture tests:** route constants unique, TCP message patterns exposed, permission enum/seed/matrix counts, Kafka topics restricted to registry, no accidental `menu.updated` event contract.

**RBAC note:** `permission-matrix.md` hiện đã static-verified 66 permissions và role seed counts, nhưng live smoke còn phụ thuộc seed/credential cho `SUPER_ADMIN` và `MANAGER`. Phase 5 phải ghi trạng thái này là `partial` cho đến khi live seeded login smoke hoặc API-level auth integration tương đương ổn định.

**Verify:** `pnpm nx affected -t test` hoặc project-specific `pnpm nx test <project>` pass cho các project đã chạm; coverage report được dùng như tín hiệu phụ, không thay thế traceability.

#### Step 5.3 — Integration Tests Cho Boundary Thật (3-5 ngày)

**Mục tiêu:** Chứng minh những thứ mock không chứng minh được: tenant isolation, transaction/locking, Redis semantics, Kafka/outbox, TCP contract và cache invalidation.

**Phạm vi ưu tiên:**

- **Catalog tenant isolation:** Tenant A/B có category/menu/table riêng; public menu và admin CRUD luôn filter tenant; request thiếu tenant bị reject.
- **Concurrent stock locking:** Hai confirm cùng lúc cho item stock = 1 thì chỉ một order thành công; order còn lại nhận lỗi có cấu trúc; stock không âm.
- **Order/session/cart Redis:** Cart version conflict, cart lock khi bill `PENDING_PAYMENT`, session cache TTL, idempotency key chống submit lặp.
- **KDS path:** `order.confirmed` -> Kitchen Redis ticket theo station -> internal `kds.queue_changed`; duplicate Kafka event không tạo duplicate ticket.
- **Payment finalization:** Cash/VietQR PAID ghi payment + audit + outbox; Order `BILL_MARK_PAID` idempotent; table chuyển `BILLING -> CLEANING`; duplicate webhook không double-settle.
- **SaaS lifecycle:** Onboarding tạo tenant/owner/subscription/payment settings/outbox; failure sau tạo owner có compensation như code hiện tại; suspend/activate ghi/xóa Redis flag; subscription cache TTL đúng policy.
- **Webhook routing:** Direct Phase 3 HMAC route và Phase 4B tenant/platform `x-secret-key` route không bị trộn contract; `QRTBL` vào Payment, `QRSUB` vào SaaS invoice.

**Test harness contract:**

| Chủ đề           | Quy tắc Phase 5                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data reset       | Integration tests phải có seed/reset idempotent; không dùng dữ liệu cá nhân hoặc trạng thái còn sót trên máy dev                                      |
| External stack   | Test cần PostgreSQL/Redis/Kafka/Keycloak phải check readiness rõ ràng và skip có message giải thích, hoặc chạy trong compose/test profile chính thức  |
| Skip policy      | Skip chỉ hợp lệ cho provider thật hoặc stack chưa bật; không skip silently trong PR gate cho unit/contract                                            |
| Auth credentials | Seed credentials dùng trong Playwright và integration phải nằm trong dev seed hoặc env documented, không hardcode secret thật                         |
| Determinism      | Tests dùng timestamp/server time có thể kiểm soát hoặc assert theo khoảng; không phụ thuộc giờ chạy trừ các rule cố ý như timezone `Asia/Ho_Chi_Minh` |
| Concurrency      | Stock/idempotency/payment duplicate tests phải assert final state trong DB/service response, không chỉ assert mock call count                         |
| External SePay   | Automated Phase 5 mặc định dùng unit mock hoặc mock SePay provider local; không yêu cầu Vercel redirect, public tunnel, hoặc SePay live               |

**Security gap bắt buộc ghi nhận:** Phase 4B tenant/platform `x-secret-key` webhook route split là contract hiện tại; value verification với stored tenant/platform secret là hardening trước production. Nếu chưa có implementation, Phase 5 phải ghi `security-gap` thay vì coi test route-presence là đủ.

**SePay local/mock policy:** Các test OAuth/payment settings/webhook phải tuân theo `docs/testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md` và bản VI tương ứng trong `docs/testing/vi/phase-5/specs/`. Local dev có thể dùng `localhost` cho Keycloak/BFF/frontend; automated test không phụ thuộc redirect URI Vercel đã đăng ký hoặc tunnel. Live SePay chỉ là smoke check manual/opt-in trước demo public.

**Verify:** Integration suite có seed/reset rõ ràng, không phụ thuộc dữ liệu cá nhân trên máy dev. Nếu dùng local compose thay vì Testcontainers, tài liệu hóa lệnh chuẩn và skip policy.

#### Step 5.4 — Browser E2E Cho Demo Path (3-4 ngày)

**Mục tiêu:** Có bằng chứng end-to-end giống người dùng thật cho các flow quan trọng nhất trước Phase 6/7 demo.

**Phạm vi Playwright bắt buộc:**

- **Flow A — QR ordering realtime:** Customer landing bằng QR -> menu -> cart -> submit -> WAITER confirm -> CHEF/BARISTA xử lý KDS -> WAITER served -> Customer tracking cập nhật sau reconnect/reload.
- **Flow B — Payment close session:** Customer/staff request bill -> POS cash hoặc VietQR route -> payment paid -> bill immutable -> session close -> table sang `Cleaning`.
- **Flow C — SaaS onboarding:** SUPER_ADMIN onboard tenant -> Owner login -> Owner xem subscription/payment settings -> tạo hoặc xem được resource tenant-scoped tối thiểu.
- **Flow D — Suspended tenant:** Tenant suspended -> Customer PWA vẫn đọc được menu/trạng thái cần thiết, không tạo order/cart mutation mới, nhưng pending bill payment route vẫn hoạt động.
- **Flow E — Admin/dashboard smoke:** Public landing, `/admin/tenants`, `/admin/plans`, `/admin/billing`, `/dashboard/subscription`, `/dashboard/payment-settings`, OAuth invalid-state page không blank/401/500 với seed đúng role.

**SePay/OAuth trong E2E:** Flow payment settings không automate login SePay thật. Test mặc định seed OAuth state hợp lệ, dùng fake code, exchange qua mock SePay provider, hiển thị bank mock, chọn bank mock, và verify settings đã lưu. Invalid-state có thể điều hướng trực tiếp tới callback page với state sai để assert UI lỗi. Live provider login/webhook thật tách sang checklist manual.

**Hiện trạng E2E cần phản ánh trong matrix:**

| File hiện có                          | Đang chứng minh                                                                | Gap còn lại                                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/step-2.7-realtime.spec.ts` | QR -> cart -> order -> POS confirm -> KDS -> served, reconnect/reload snapshot | Chưa cover payment close-session và SaaS/suspended tenant                                                              |
| `tests/e2e/phase-3-payment.spec.ts`   | Payment screen/POS tab/dashboard refund smoke khi dev stack/auth có sẵn        | Chưa chứng minh full payment finalization, webhook settlement, bill immutable, session close/table cleaning end-to-end |
| Chưa có dedicated Phase 4B Playwright | —                                                                              | Tenant onboarding, admin billing, owner subscription/payment settings, suspended tenant browser fixture                |

**Verify:** E2E chạy serial với seed fixture idempotent. Test không kiểm tra chi tiết nội bộ Kafka/Redis; test kiểm tra UI cuối cùng và snapshot sau refetch.

#### Step 5.5 — CI, Coverage Và Quy Tắc Chạy (1-2 ngày)

**Mục tiêu:** Test suite đủ nhanh cho PR nhưng vẫn có một đường full-stack đáng tin cho pre-demo/nightly.

**Quality gates đề xuất:**

| Gate                    | Lệnh                                                                                                                                                     | Mục đích                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Current CI baseline     | `pnpm exec nx run-many -t lint test build`                                                                                                               | Lệnh hiện có trong GitHub Actions; Phase 5 phải không làm baseline này flaky            |
| PR quick gate           | `pnpm exec nx affected -t lint test build`                                                                                                               | Bắt lỗi thường gặp trên code thay đổi, tối ưu thời gian khi CI được chỉnh sang affected |
| Full unit/contract      | `pnpm exec nx run-many -t test`                                                                                                                          | Chạy toàn bộ Jest/Nx test projects                                                      |
| Focused domain gate     | `pnpm nx test bff`, `pnpm nx test catalog`, `pnpm nx test order`, `pnpm nx test kitchen`, `pnpm nx test payment`, `pnpm nx test saas`                    | Chạy nhanh các bounded context P0/P1 khi đang harden test                               |
| Integration gate        | `pnpm nx test frontend-utils`, `pnpm nx test saas`, `pnpm nx test payment`, `pnpm nx test order` hoặc suite compose/test chuyên biệt khi được tách riêng | Chạy DB/Redis/Kafka boundary tests; cần readiness/seed policy rõ                        |
| Browser E2E smoke       | `pnpm e2e:step2.7` và `pnpm exec playwright test tests/e2e/phase-3-payment.spec.ts`                                                                      | Chạy các smoke hiện có trên dev stack                                                   |
| Browser E2E full target | `pnpm exec playwright test tests/e2e`                                                                                                                    | Chạy journey demo sau khi có seed/dev stack chuẩn hóa                                   |
| Pre-demo dry run        | `pnpm dev:reseed -- --yes` + app/backend serve scripts + Playwright selected flows                                                                       | Xác nhận stack thật trước Phase 7                                                       |

**CI/documentation updates required by Phase 5:**

- Nếu giữ CI hiện tại, Phase 5 phải ghi rõ Playwright/integration là pre-demo hoặc nightly/manual gate, không phải PR gate.
- Nếu đưa Playwright vào CI, phải thêm service stack hoặc dùng preview/dev stack có seed ổn định; không bật E2E trong CI khi credentials/Keycloak chưa deterministic.
- Thêm script package rõ ràng cho các E2E mới, ví dụ `e2e:phase3`, `e2e:phase4b`, hoặc một script `e2e:demo` chạy selected flows theo thứ tự.
- Coverage report là artifact phụ; traceability matrix mới là acceptance chính.

**Coverage policy:**

- Dùng coverage để phát hiện vùng rỗng, không làm mục tiêu duy nhất.
- Ngưỡng Phase 5 tối thiểu: **Order + Payment >= 60%** trên unit/contract như roadmap cũ, nhưng các rule P0 trong traceability phải có test dù coverage đã đạt.
- SaaS Phase 4B, BFF guards, Catalog, Kitchen cần đạt coverage theo rule P0/P1 trong matrix; không đặt cùng một ngưỡng phần trăm máy móc cho mọi project vì blast radius và loại test khác nhau.

### Ngoài phạm vi Phase 5 hiện tại

- **Không yêu cầu pass test cho Phase 4A full saga-hardening** như durable compensation toàn diện, full CDC/Debezium hoặc audit framework mới nếu chưa triển khai. Phase 5 chỉ test baseline outbox/idempotency/compensation cục bộ đã có.
- **Không yêu cầu notification/staff management của Phase 4C** như email receipt, welcome/suspend email, staff invite UI, reset-password email hoặc notification logs nếu service chưa tồn tại.
- **Không yêu cầu offline queue đầy đủ** như IndexedDB action queue, auto-sync POS/KDS/customer khi mất mạng dài hạn, hoặc conflict resolver đầy đủ nếu code hiện tại chưa triển khai. Phase 5 chỉ test reconnect/refetch/snapshot behavior đã có.
- **Không thay thế live provider certification.** SePay/OAuth/webhook provider thật cần manual/live validation riêng khi có public BFF URL và credential hợp lệ; automated Phase 5 chỉ khóa contract nội bộ và route behavior bằng mock/provider local. Không dùng domain Vercel tạm hoặc tunnel local làm điều kiện pass mặc định.
- **Không thêm business behavior mới chỉ để test.** Nếu test phát hiện docs yêu cầu một hành vi chưa có, ghi thành `implementation gap` hoặc `deferred scope`, không âm thầm đổi product contract.

### Acceptance Criteria — Phase 5

- [ ] Có traceability matrix cho các rule P0/P1 trong `business-logic.md`, `technical-architecture.md`, Phase 1/2A/2B/3/4B và permission matrix, với trạng thái `covered/partial/missing/implementation-gap/security-gap/deferred-by-phase`.
- [ ] **Unit/contract:** Order + Payment đạt tối thiểu **60%** coverage theo công cụ trong monorepo và mọi invariant P0 về state/money/idempotency/webhook có test cụ thể.
- [ ] **Catalog/QR:** Có test cho QR token/invalid token, public menu tenant isolation, CRUD tenant filter, table/menu delete constraints và upload validation/path nếu behavior đã có.
- [ ] **SaaS Phase 4B:** Có test cho onboarding, tenant lifecycle, subscription/plan, payment settings/OAuth state, `QRSUB` invoice matching, feature gating và suspended/closed customer behavior.
- [ ] **SePay testing policy:** Default automated tests dùng mock SePay hoặc unit mock; mọi live SePay check có `RUN_LIVE_SEPAY=1`, public URL hợp lệ, skip reason rõ, và không nằm trong PR gate mặc định.
- [ ] **Integration:** Có ít nhất các kịch bản tenant isolation, concurrent stock locking, payment finalization, Redis suspend/subscription cache, live/auth permission representative smoke và webhook route split `QRTBL`/`QRSUB`.
- [ ] **Security gap visibility:** Phase 4B `x-secret-key` route value verification được test nếu đã implement; nếu chưa, được ghi là `security-gap` blocker trước go-live/demo public.
- [ ] **E2E Playwright:** Các flow QR ordering realtime, payment close session, tenant onboarding và suspended tenant pass ổn định trên seed/dev stack chuẩn hóa, hoặc được đánh dấu `missing` với fixture/credential cần bổ sung.
- [ ] **CI/gates:** Current CI baseline, PR quick gate, full unit/contract gate, integration gate và browser E2E command được tài liệu hóa; tests phụ thuộc local stack có skip policy minh bạch thay vì fail ngẫu nhiên.
- [ ] **Deferred clarity:** Các hành vi thuộc Phase 4A/4C chưa triển khai được đánh dấu rõ là deferred/test gap hợp lệ, không bị lẫn vào acceptance của Phase 5.

---

## Phase 6 — Observability (~1–2 tuần)

**Vì sao:** Hệ có BFF, nhiều microservice, Kafka và WebSocket; không có health + log + metric + trace thì **thời gian sửa lỗi** và **độ tin cậy demo** giảm mạnh, và khó chứng minh luồng "một đơn đi qua nhiều hop".

### Steps

#### Step 6.1 — Học + Thiết lập nền quan sát (bài 136–151)

**Mục tiêu:** Mọi dịch vụ có tín hiệu tối thiểu để vận hành và debug — và trace có thể **nối mạch** qua các hop nội bộ.

**Course-to-lesson mapping:**

| Bài     | Nội dung                                          |
| ------- | ------------------------------------------------- |
| 136–138 | Health Check                                      |
| 139–144 | PLG Stack (Promtail + Loki + Grafana + Pino)      |
| 145–146 | Prometheus + custom metrics                       |
| 147–151 | Tempo + OTel (auto-instrumentation + propagation) |

**Phạm vi (WHAT):**

- **Health check** trên toàn bộ dịch vụ — vì đây là điều kiện tiên quyết cho orchestrator, alert và demo "hệ còn sống".
- **Stack PLG** (Promtail + Loki + Grafana) cùng **logger có cấu trúc** (Pino) — vì log tập trung giúp truy vết theo `app`/tenant/request mà không SSH từng container.
- **Prometheus + metric tùy chỉnh + dashboard** — vì cần nhìn **tải, lỗi, độ trễ** theo thời gian thực, không chỉ "có log".
- **Tempo + OpenTelemetry (auto-instrumentation)** và **lan truyền context** qua **TCP/Kafka** — vì một đơn có thể đi BFF → Order → Kitchen; không nối trace thì không chứng minh được phân tán.

**Verify:** Từ một request đại diện, có thể trả lời: log ở đâu, metric nào liên quan, trace id đi qua những service nào.

#### Step 6.2 — Grafana Dashboards (2–3 ngày)

**Mục tiêu:** Chuyển dữ liệu thô thành **câu chuyện vận hành và nghiệp vụ** — phục vụ demo và phòng ngừa sự cố.

**Phạm vi (WHAT):**

- **System Overview** — tổng thể sức khỏe và tải.
- **Business Metrics** — ví dụ đơn/phút, doanh thu (theo định nghĩa đã thống nhất), thời chờ KDS trung bình — vì hội đồng và chủ quán quan tâm **nghiệp vụ**, không chỉ CPU.
- **Per-Service** — request rate, error rate, P95 — vì định vị nhanh service đang nghẽn hoặc lỗi.
- **Alerting** — ví dụ dịch vụ down, error rate > 5%, vi phạm SLA KDS — vì cần tín hiệu chủ động, không chỉ xem dashboard sau sự cố.

**Verify:** Có thể chỉ trên dashboard và giải thích được ý nghĩa từng panel chính trong < 5 phút.

### Acceptance Criteria — Phase 6

- [ ] **Grafana** truy cập được tại **`localhost:3001`** với stack chạy local.
- [ ] **Loki:** Truy vấn dạng `{app="order"}` (hoặc label tương đương đã chuẩn hóa) **thấy log** ứng với traffic thật hoặc script tạo tải.
- [ ] **Tempo:** **Một trace một đơn** (hoặc một luồng đặt món đại diện) đi qua **BFF → Order → Kitchen** — chứng minh context propagation đã khớp kiến trúc.
- [ ] **Prometheus:** Metric hiển thị **real-time** (làm mới dashboard thấy thay đổi theo hành vi hệ thống).
- [ ] **Alert:** Khi **dừng có chủ đích** một dịch vụ quan trọng, có **cảnh báo kích hoạt** theo rule đã định nghĩa — vì AC này xác nhận vòng "phát hiện → tín hiệu" hoạt động.

---

## Phase 7 — Docker Deploy + Demo (~1 tuần)

**Vì sao:** Luận văn và review cần **một lệnh (hoặc một chuỗi compose rõ ràng)** để lên full stack; seed và script demo giảm rủi ro "trên máy em chạy được".

### Steps

#### Step 7.1 — Dockerfiles & Compose & Seed (bài 152–155)

**Mục tiêu:** Hình ảnh chạy **nhỏ, nhất quán, tái lập được**; tách infra/app/monitoring để người mới bật đúng lớp họ cần.

**Phạm vi (WHAT):**

- **Multi-stage** mỗi dịch vụ (builder → runner) — để artifact chạy tách khỏi toolchain build, phù hợp deploy và thesis artifact.
- **docker-compose.app.yaml** — **8 backend + 2 frontend** (theo kiến trúc đã chốt).
- **docker-compose.infra.yaml** — data plane: **PG, Redis, Mongo, Keycloak, Kafka** (theo technical-architecture).
- **docker-compose.monitoring.yaml** — quan sát (khớp Phase 6).
- **Seed:** **1 tenant, 5 categories, 20 items, 8 tables** — đủ để demo đa bàn, menu có chiều sâu, không tốn thời gian nhập tay.

**Verify:** `docker compose up` (hoặc bộ lệnh tương đương đã ghi trong README phase) dựng được full stack; seed chạy idempotent hoặc có chiến lược reset rõ ràng.

#### Step 7.2 — Demo prep (2–3 ngày)

**Mục tiêu:** **15–20 phút** bảo vệ chạy trơn, không phụ thuộc ad-hoc — vì thời gian hội đồng cố định và stress cao.

**Phạm vi (WHAT):**

- **Demo script** (kịch bản 15–20 phút cho bảo vệ luận văn):
  - **Tab 1 (Customer):** QR scan → menu hiển thị → chọn món + thêm giỏ hàng → submit đơn hàng.
  - **Tab 2 (Management):** Staff confirm đơn → KDS hiển thị ticket → Chef/Barista xử lý → Payment (cash hoặc VietQR/SePay) → bill close.
  - **Tab 3 (Monitoring):** Grafana trace xuyên suốt — chỉ trace ID đi từ BFF → Order → Kitchen → Payment, chứng minh phân tán.
- **Full stack dry run** ít nhất một lần end-to-end trước ngày bảo vệ — vì phát hiện lỗi compose/network/sớm hơn slide.
- **Backup plan:** Seed data script chạy nhanh nếu cần reset giữa các lần diễn tập — đưa hệ thống về trạng thái sạch trong < 2 phút.

**Verify:** Một người chưa tham gia code có thể đi theo script và đạt cùng kết quả quan sát được (UI + trace).

### Acceptance Criteria — Phase 7

- [ ] **`docker compose up`** (theo tài liệu triển khai) → **full system hoạt động** (đăng nhập/QR/luồng chính không gãy).
- [ ] **Kịch bản demo E2E** chạy **mượt** trong khung thời gian đã định — không bước "chờ may mắn".
- [ ] **Grafana trace** hiển thị **đủ đường đi** (BFF → các service liên quan → kitchen) cho một tương tác demo tiêu biểu.
- [ ] **Seed data** sẵn sàng theo đúng quy mô đã nêu — không phải thủ công trước giờ G.

---

## Outputs (chung)

- Bộ **kiểm thử** (unit + integration + E2E) neo vào `business-logic.md` và các contract giữa dịch vụ — làm tài sản tái sử dụng sau luận văn.
- Nền **quan sát** (health, log, metric, trace, dashboard, alert) **chạy được local** và tài liệu hóa cổng Grafana/Prometheus — giảm thời gian debug và tăng độ tin cậy demo.
- **Artifact triển khai** (Dockerfile multi-stage, compose tách lớp, seed, script demo) — cho phép tái lập hệ QRTable POS trong môi trường chuẩn mà không phụ thuộc cấu hình máy cá nhân.

**Trạng thái tài liệu:** roadmap/spec đã canonical hóa; bản thân Phase 5-7 vẫn **TODO** theo trạng thái phase.

## Lưu ý Roadmap

- **Critical Path:** Phase 0 → 1 → 2A → 2B → 3 → 5-7 (Demo)
- **Parallel Track:** Phase 4B đã hoàn thành; Phase 4A deferred; Phase 4C chưa bắt đầu và phụ thuộc Phase 4B.
- **4 highlight demo ấn tượng nhất:** Phase 1 (QR + Menu), Phase 2 (Real-time Ordering), Phase 3 (Payment), Phase 6 (Grafana Tracing)
