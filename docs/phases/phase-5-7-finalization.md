# Phase 5–7 — Hoàn Thiện: Kiểm Thử, Quan Sát & Triển Khai Demo

> **Mục tiêu:** Khóa chất lượng hệ thống QRTable SaaS POS bằng kiểm thử tự động đa tầng, làm hệ phân tán **quan sát được** (sức khỏe dịch vụ, log, metric, trace), và đóng gói **triển khai + dữ liệu mẫu + kịch bản demo** để luận văn và review có thể tái lập end-to-end — giảm rủi ro hồi quy nghiệp vụ (đơn, tiền, đa tenant, bếp) và chứng minh luồng QR → bếp → thanh toán trước hội đồng.
> **Ước lượng:** ~3–5 tuần (tổng Phase 5 + 6 + 7)
> **Trạng thái:** ⬜ TODO

## Prerequisites

- Hoàn thành toàn bộ các phase lõi **0–4** (nền tảng, catalog, đơn/Kafka, bếp WebSocket, thanh toán) — vì finalization chỉ có ý nghĩa khi domain flows và contract giữa dịch vụ đã ổn định đủ để làm mục tiêu kiểm thử và quan sát.

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

**Vì sao:** State machine đơn/bàn, làm tròn VND, token QR và cô lập đa tenant là những chỗ **lỗi một lần là lỗi tiền hoặc lộ dữ liệu**; kiểm thử tự động là bằng chứng hồi quy cho luận văn và cho vận hành sau này.

### Steps

#### Step 5.1 — Học phạm vi + Viết kiểm thử (bài 130–135)

**Mục tiêu:** Bao phủ có chủ đích các rủi ro nghiệp vụ/kỹ thuật đã cam kết trong kiến trúc — không nhắm mục tiêu "số đẹp" mà nhắm **chỗ dễ gãy**.

**Phạm vi (WHAT, không chi tiết HOW):**

- **Unit (Jest):** Chuyển trạng thái **Order State Machine**; quy tắc **làm tròn VND**; **HMAC-SHA256** cho token/QR theo contract đã thống nhất; **Table State Machine** — vì đây là logic thuần, dễ test nhanh và dễ hồi quy.

- **Kịch bản Unit cụ thể:**
  - **Order State Machine:** Validate cả valid transitions (Pending → Processing → Ready → Served) **lẫn** invalid transitions (Ready → Pending phải reject) — đảm bảo state machine không cho phép bước lùi trái phép.
  - **VND rounding edge cases:** 0đ → 0đ; 999đ → 1.000đ; 1.000đ → 1.000đ (đã tròn); 127.500đ → 128.000đ — xác nhận công thức `Math.ceil(raw / 1000) * 1000` đúng ở biên.
  - **HMAC-SHA256 QR token:** Generate token → validate thành công; tampered token → reject; expired token (nếu có TTL) → reject.
  - **Table State Machine:** Available → Occupied → Billing → Cleaning → Available; reject invalid transitions (Cleaning → Billing phải fail).

- **Integration (Jest + Testcontainers):**
  - **Catalog CRUD + multi-tenant isolation (PostgreSQL container):** Tạo data cho tenant A → verify tenant B query **không thấy** data tenant A — chứng minh `tenant_id` filter hoạt động ở tầng persistence.
  - **Order creation + concurrent stock locking:** 2 requests **cùng lúc** cho cùng món cuối cùng (stock = 1) → chỉ 1 thành công, 1 nhận lỗi hết hàng — vì cần chứng minh race/isolation ở tầng persistence và service.

- **E2E (Supertest):** Ba luồng đại diện nghiệp vụ:
  - **Flow 1:** QR scan → validate token → menu load → add to cart → submit order → staff confirm — luồng đặt món cơ bản end-to-end.
  - **Flow 2:** Payment cash → staff confirm → bill lock (immutable) → close session → bàn chuyển Cleaning — luồng thanh toán tiền mặt đầy đủ.
  - **Flow 3:** Tenant onboarding → Owner login → Dashboard hoạt động (có thể tạo category, menu item) — luồng SaaS onboarding.

**Verify:** Mỗi lớp test có mục đích rõ (unit = invariant, integration = DB/tenant, E2E = journey); không trùng lặp vô ích giữa các lớp.

**Test command:** `nx run-many --target=test --all`

### Acceptance Criteria — Phase 5

- [ ] **Unit:** Độ phủ **> 60%** trên phạm vi **Order + Payment** (theo công cụ đo trong monorepo) — vì hai bounded context này gánh rủi ro tiền và vòng đời đơn.
- [ ] **Integration:** Có ít nhất một kịch bản chứng minh **cô lập multi-tenant** trên Catalog (hoặc luồng tương đương đã thống nhất) — để không thể "nhìn thấy" dữ liệu tenant khác.
- [ ] **E2E:** Cả **3 luồng** (QR→order→confirm; cash payment→close session; tenant onboarding) **pass** ổn định trên CI hoặc môi trường chuẩn hóa — vì đây là bằng chứng end-to-end cho đề tài.

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
  - **Tab 2 (Management):** Staff confirm đơn → KDS hiển thị ticket → Chef/Barista xử lý → Payment (cash hoặc Stripe) → bill close.
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

**Trạng thái tài liệu:** DONE

## Lưu ý Roadmap

- **Critical Path:** Phase 0 → 1 → 2A → 2B → 3 → 5-7 (Demo)
- **Parallel Track:** Phase 4A/4B/4C (sau Phase 3, tùy thời gian)
- **4 highlight demo ấn tượng nhất:** Phase 1 (QR + Menu), Phase 2 (Real-time Ordering), Phase 3 (Payment), Phase 6 (Grafana Tracing)
