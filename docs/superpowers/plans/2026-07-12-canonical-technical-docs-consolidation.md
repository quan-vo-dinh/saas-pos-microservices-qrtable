# QRTable – Kế hoạch triển khai chuẩn hóa tài liệu kỹ thuật

> **Dành cho agentic workers:** BẮT BUỘC dùng sub-skill **subagent-driven-development** (khuyến nghị) hoặc **executing-plans** để thực hiện từng task. Mọi bước dùng checkbox để theo dõi.

**Mục tiêu:** Chuẩn hóa bộ tài liệu kỹ thuật QRTable theo code hiện tại, xác nhận phạm vi chức năng đã hoàn tất và chỉ giữ Phase 7 public deployment ở trạng thái đang mở.

**Kiến trúc:** Dùng code, tests và runtime/deployment manifests làm nguồn thẩm quyền; tài liệu canonical chỉ tóm tắt hành vi cuối cùng và liên kết tới evidence. Các plans/specs/reports cũ chỉ được xóa sau khi thông tin duy nhất của chúng đã được hấp thụ, reference scan sạch và canonical docs đã kiểm chứng.

**Công nghệ/công cụ:** Markdown, Nx, TypeScript/NestJS source, CodeGraph, Prettier, Bash, Mermaid, Git.

**Prompt thực thi:** [2026-07-12-execute-canonical-technical-docs-consolidation.md](../prompts/2026-07-12-execute-canonical-technical-docs-consolidation.md)

---

## Phạm vi và non-goals

Trong phạm vi:

- Chỉnh nhẹ các tiêu đề trong audit report để toàn bộ heading tiếng Việt rõ ràng, không sửa kết luận hay evidence.
- Viết lại/cập nhật README, AGENTS, canonical docs, status, phase records, testing index và code anchors.
- Hấp thụ thông tin hợp lệ từ docs/specs, docs/testing, docs/superpowers, Redis analysis và architecture assets.
- Xóa technical temporary artifacts, duplicate và diagram cũ sau deletion gates.
- Ghi Phase 7 là deployment pending; không dùng completion percentage cho product scope.

Ngoài phạm vi:

- Không thực hiện public deployment, DNS, DigitalOcean, Caddy/HTTPS, secret provisioning, migration production, SePay live transfer, backup hoặc rollback thật.
- Không thay đổi code nghiệp vụ, API, schema, Kafka/Redis contracts hay test behavior.
- Không thay đổi nội dung docs/guides/. Đặc biệt không đụng vào docs/guides/codebase-reading-map.md đang có user change.
- Không đụng vào Customer PWA server-state refactor đang dở hoặc plan 2026-07-12-customer-pwa-server-state-consolidation.md.
- Không archive completed documents trong repository; Git history là lịch sử.

## Quyết định đã chốt từ audit, code và yêu cầu người dùng

| Quyết định                                    | Phân tích/evidence                                                                                                                                  | Cách thể hiện trong docs                                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Phạm vi sản phẩm/khóa luận đã cơ bản hoàn tất | Code có Staff Management, stock reservation, Order confirmation saga, observability assets và test coverage; người dùng xác nhận chỉ Phase 7 còn dở | Không còn % tiến độ tổng; trạng thái cho Phase 0–6 là IMPLEMENTED + VERIFIED trong phạm vi thesis |
| Phase 7 là hạng mục duy nhất còn mở           | Docker/Compose/Caddy/Phase 7 plan tồn tại, nhưng chưa có public deployment evidence đầy đủ                                                          | Phase 7 ghi PACKAGED/LOCAL_VERIFIED, DEPLOYED = PENDING                                           |
| Tenant isolation không tự động qua TypeORM    | TenantMiddleware chỉ inject context; repository/query áp dụng explicit tenant predicates; không có subscriber/global filter                         | Bỏ mọi claim automatic filter, ghi rõ guard/context + repository predicate                        |
| Customer session hiện dùng header             | Customer PWA gửi x-tenant-id và x-session-id; tests xác nhận header                                                                                 | Bỏ claim cookie session và offline write queue hiện hành                                          |
| Stock reservation là behavior thật            | Entity, migrations, Catalog service và Order integration tests đều tồn tại                                                                          | Canonical docs và thesis evidence phải nêu Catalog là stock owner                                 |
| Audit report là tiếng Việt                    | Đây là artifact phục vụ người viết khóa luận; người dùng yêu cầu tiếng Việt                                                                         | Chỉ điều chỉnh heading của report, giữ technical terms cần thiết                                  |
| Long-lived technical docs dùng tiếng Anh      | Đây là policy hiện tại trong docs/README.md; tránh hai canonical authority                                                                          | Audit/plan có thể tiếng Việt, canonical technical content vẫn English-first                       |

## Dirty-worktree guard

Trước mỗi task, chạy:

    git status --short

Không stage, restore, move, delete hoặc format bất kỳ file nào ngoài danh sách của task. Các thay đổi hiện có trong Customer PWA, KDS, docs/guides/codebase-reading-map.md và plan Customer PWA là user work ngoài scope.

## Cấu trúc file đích

- Sửa: README.md
  - Entry point của QRTable, app/service map, setup/verification và deployment status.
- Sửa: AGENTS.md
  - Alias/library thực tế, tenant isolation thực tế, canonical-doc rule.
- Sửa: docs/README.md
  - Navigation, lifecycle, canonical status vocabulary.
- Tạo: docs/project-status.md
  - Ma trận IMPLEMENTED/VERIFIED/DEPLOYED duy nhất.
- Sửa: docs/business-logic.md
  - Hành vi domain cuối cùng, session/tenant/offline/audit đúng thực tế.
- Sửa: docs/technical-architecture.md
  - Service/data ownership, ports, transport, observability/deployment status đúng thực tế.
- Sửa: docs/DOC-CODE-ANCHORS.md
  - Evidence path hợp lệ cho mọi canonical claim.
- Sửa hoặc tạo: docs/phases/phase-\*.md
  - Final records ngắn gọn cho Phase 0–7.
- Tạo: docs/testing/README.md
  - Testing strategy và stable evidence map.
- Di chuyển: docs/testing/phase-5/saga-validation-strategy.md tới docs/testing/saga-validation-strategy.md.
- Di chuyển: docs/testing/phase-5/traceability-matrix.md tới docs/testing/traceability-matrix.md.

## Task 1: Chỉnh tiêu đề audit report và xác nhận scope

**Files:**

- Modify: docs/documentation-canonicalization-audit-report.md

- [ ] **Bước 1: Đối chiếu các heading hiện tại với bản dịch thống nhất.**

  Thay các heading sau, chỉ thay heading:

  | Heading hiện tại                                    | Heading thay thế                                   |
  | --------------------------------------------------- | -------------------------------------------------- |
  | Mốc kiểm chứng CodeGraph-first                      | Kiểm chứng mã nguồn bằng CodeGraph                 |
  | Thứ tự ưu tiên source of truth                      | Thứ tự ưu tiên của nguồn đối chiếu                 |
  | Hiện trạng hệ thống ở mức actor, domain và use case | Hiện trạng hệ thống theo actor, domain và use case |
  | Kiểm kê và chẩn đoán vòng đời thông tin             | Kiểm kê tài liệu và vòng đời thông tin             |
  | Danh sách mâu thuẫn và nội dung lỗi thời            | Phát hiện mâu thuẫn và nội dung lỗi thời           |
  | Đề xuất cấu trúc thông tin canonical                | Đề xuất bộ tài liệu canonical                      |
  | Ma trận xử lý tài liệu                              | Kế hoạch xử lý từng nhóm tài liệu                  |
  | Câu hỏi phản biện và quyết định đề xuất             | Các quyết định đã chốt từ audit                    |
  | Chiến lược tạo implementation plan                  | Chiến lược triển khai kế hoạch                     |
  | Các cổng an toàn và điều kiện xóa                   | Điều kiện an toàn trước khi xóa                    |
  | Baseline kiểm chứng được ghi nhận                   | Kết quả kiểm chứng baseline                        |
  | Tiêu chí nghiệm thu cho đợt canonicalization        | Tiêu chí hoàn thành đợt chuẩn hóa                  |
  | Quyết định triển khai đầu tiên được đề xuất         | Quyết định khởi động được đề xuất                  |

- [ ] **Bước 2: Bổ sung kết luận Q1 đã được người dùng chốt.**

  Trong phần kết luận điều hành, thêm một câu sau status statement:

  > Phạm vi chức năng và tài liệu của khóa luận được xem là gần hoàn tất; công việc còn mở duy nhất ở cấp dự án là Phase 7 public deployment.

  Không thay kết luận về việc public deployment chưa hoàn thành.

- [ ] **Bước 3: Kiểm tra cấu trúc và format.**

  Chạy:

  pnpm exec prettier --check docs/documentation-canonicalization-audit-report.md
  rg -n '^#{1,4} ' docs/documentation-canonicalization-audit-report.md

  Kỳ vọng: Prettier pass; 13 section chính còn nguyên; không còn heading tiếng Anh dài.

- [ ] **Bước 4: Commit thay đổi audit riêng biệt.**

  Chạy:

  git add docs/documentation-canonicalization-audit-report.md
  git diff --cached --check
  git diff --cached --name-only
  git commit -m "docs: polish canonicalization audit headings"

  Kỳ vọng: staged file duy nhất là audit report.

## Task 2: Tạo navigation và status canonical

**Files:**

- Modify: docs/README.md
- Create: docs/project-status.md
- Modify: docs/DOC-CODE-ANCHORS.md
- Delete after status migration: docs/implementation_plan.md

- [ ] **Bước 1: Viết docs/project-status.md với mô hình trạng thái cố định.**

  Tạo các section theo đúng thứ tự:
  1. Status vocabulary.
  2. Current project matrix.
  3. Deferred work.
  4. Evidence anchors.

  Định nghĩa:
  - IMPLEMENTED: source code, migrations/configuration hoặc assets cần thiết đã tồn tại.
  - VERIFIED: có tests, build, render hoặc smoke evidence phù hợp.
  - DEPLOYED: có evidence môi trường public được vận hành, gồm URL/host, date, git SHA/image tag, migration và public smoke result.

  Ma trận hiện tại phải ghi Phase 0–6 là IMPLEMENTED và VERIFIED cho accepted thesis scope. Phase 7 phải ghi Docker/Compose/Caddy artifacts là IMPLEMENTED, local packaging/validation là VERIFIED khi có evidence, và public deployment là PENDING.

- [ ] **Bước 2: Cập nhật docs/README.md và retire implementation_plan.md.**

  Trong Canonical Docs:
  - thay implementation_plan.md bằng project-status.md;
  - không giữ implementation_plan.md trong Canonical Docs hoặc Supporting Docs;
  - giữ guides là out of scope của plan này;
  - nêu rõ docs/superpowers chỉ chứa temporary execution artifacts;
  - giữ chính sách English-first cho long-lived technical docs.

- [ ] **Bước 3: Sửa code anchor hỏng và thêm anchor cho status evidence.**

  Trong docs/DOC-CODE-ANCHORS.md:
  - thay apps/management-app/src/components/pos/table-detail-panel.tsx bằng apps/management-app/src/features/pos/components/table-detail-panel.tsx;
  - thêm app/order module, Customer PWA api-client, stock reservation entity/migration và Phase 7 deployment plan làm evidence cho status matrix;
  - không thêm path wildcard.

- [ ] **Bước 4: Chạy anchor verifier.**

  Chạy:

  pnpm verify:doc-anchors

  Kỳ vọng: pass và in số lượng anchors đã verified; không có missing target.

- [ ] **Bước 5: Commit navigation/status.**

  Chạy:

  git add docs/README.md docs/project-status.md docs/DOC-CODE-ANCHORS.md docs/implementation_plan.md
  git diff --cached --check
  git commit -m "docs: add canonical project status"

## Task 3: Đồng bộ root README và AGENTS với code thật

**Files:**

- Modify: README.md
- Modify: AGENTS.md

- [ ] **Bước 1: Viết lại README.md thành QRTable repository entry point.**

  README phải có các section: Product overview, workspace topology, applications/services, local prerequisites, common validation commands, documentation map và deployment status. Không được giữ tên “Einvoice”, invoice app hoặc command không tồn tại.

  Deployment status phải nói rõ: deployment artifacts có trong repository; full public deployment là Phase 7 pending.

- [ ] **Bước 2: Sửa bảng shared libraries/aliases trong AGENTS.md.**

  Đưa alias và library layout về đúng tsconfig.base.json và workspace hiện tại, trong đó dùng @common/_ và @einvoice/_ khi chúng là alias thực. Ghi @einvoice là legacy naming nếu cần, không viết alias @qrtable/\* như một alias có thể import khi code không hỗ trợ.

- [ ] **Bước 3: Sửa section Tenant Isolation trong AGENTS.md.**

  Thay claim TypeORM Subscriber/global query filter bằng invariant sau:
  - TenantMiddleware/guards xác lập tenant context.
  - Tenant-scoped repository/query phải truyền tenantId và áp dụng tenant predicate.
  - Không được bỏ tenant predicate chỉ vì request là “internal”.
  - Không set tenant_id tùy ý ngoài flow/entity convention hiện có.

- [ ] **Bước 4: Kiểm tra không còn claim cơ chế sai.**

  Chạy:

  rg -n 'EntitySubscriberInterface|Global Query Filter|TypeORM Subscriber|@qrtable/' README.md AGENTS.md
  rg -n '@common/|@einvoice/' tsconfig.base.json

  Kỳ vọng: không còn claim automatic tenant filter; aliases được mô tả khớp tsconfig.

- [ ] **Bước 5: Commit root documentation.**

  Chạy:

  git add README.md AGENTS.md
  git diff --cached --check
  git commit -m "docs: align repository guidance with QRTable"

## Task 4: Reconcile business logic, architecture và permissions

**Files:**

- Modify: docs/business-logic.md
- Modify: docs/technical-architecture.md
- Modify: docs/architecture/permission-matrix.md
- Modify: docs/redis-usage-analysis.md

- [ ] **Bước 1: Sửa business-logic.md theo implemented behavior.**

  Ghi đúng:
  - customer session gửi x-session-id/x-tenant-id, không khẳng định cookie-backed session;
  - offline IndexedDB/Background Sync write queue là future work;
  - audit chỉ là bounded audit records hiện có, không có generic audit_trail;
  - staff management thuộc accepted scope; chỉ advanced HRM nằm ngoài scope;
  - Catalog là stock owner và Order confirmation dùng reservation/version behavior.

- [ ] **Bước 2: Sửa technical-architecture.md theo ownership và deployment state.**

  Ghi đúng:
  - explicit tenant predicates thay automatic TypeORM filter;
  - Bill thuộc Order; Kitchen Redis-only;
  - BFF port configurable, 3300 là Compose/env convention, 3000 là default code value nếu còn;
  - observability stack/configuration là implemented; public monitoring deployment không được claim khi Phase 7 chưa có evidence;
  - QR PDF export, table-status Redis cache và offline writes là deferred nếu chưa có code.

- [ ] **Bước 3: Cập nhật permission matrix và Redis registry.**

  Đối chiếu role/permission với code hiện tại. Trong redis-usage-analysis.md, giữ lại chỉ Redis ownership, key/TTL và invalidation facts còn đúng; chuyển các facts đó vào technical-architecture.md rồi đánh dấu file analysis là ready for deletion ở Task 7.

- [ ] **Bước 4: Kiểm tra claim bằng source search.**

  Chạy:

  rg -n 'x-session-id|x-tenant-id' apps/customer-pwa/src/lib/api-client.ts libs/constants/src/lib/request-context.constant.ts
  rg -n 'StockReservation|stock_reservation_version' libs/entities apps/catalog apps/order
  rg -n 'EntitySubscriberInterface|@EventSubscriber' apps libs

  Kỳ vọng: hai header và stock reservation/version được tìm thấy; query TypeORM subscriber không có kết quả.

- [ ] **Bước 5: Commit core canonical facts.**

  Chạy:

  git add docs/business-logic.md docs/technical-architecture.md docs/architecture/permission-matrix.md docs/redis-usage-analysis.md
  git diff --cached --check
  git commit -m "docs: reconcile canonical behavior with implementation"

## Task 5: Chuẩn hóa final records cho Phase 0–7

**Files:**

- Modify: docs/phases/phase-0-foundation.md
- Modify: docs/phases/phase-1-catalog.md
- Modify: docs/phases/phase-2a-order-kafka.md
- Modify: docs/phases/phase-2b-kitchen-websocket.md
- Modify: docs/phases/phase-3-payment.md
- Modify: docs/phases/phase-4a-saga-hardening.md
- Modify: docs/phases/phase-4b-saas-onboarding.md
- Modify: docs/phases/phase-4c-staff-management.md
- Modify: docs/phases/phase-4d-dashboard-reporting.md
- Create: docs/phases/phase-5-testing.md
- Create: docs/phases/phase-6-observability.md
- Create: docs/phases/phase-7-deployment.md
- Delete after absorption: docs/phases/phase-4a-saga-hardening.vi.md
- Delete after absorption: docs/phases/phase-4c-staff-management.vi.md
- Delete after absorption: docs/phases/phase-5-7-finalization.md
- Delete after absorption: docs/phases/phase-5-7-finalization.vi.md
- Delete after absorption: docs/phases/phase-6-observability-plan.md
- Delete after absorption: docs/phases/phase-6-observability-plan.vi.md
- Delete after absorption: docs/phases/code.html

- [ ] **Bước 1: Áp dụng final-record template cho tất cả phase còn giữ.**

  Mỗi file có đúng các section: Status, Final Scope, Accepted Decisions, Final Business Behavior, Final Technical Behavior, Acceptance Evidence, Deferred Work. Không giữ dated task checklist, percentage hoặc prompt.

- [ ] **Bước 2: Chốt status phù hợp từng phase.**
  - Phase 0–3, 4B–4D, 5 và 6: IMPLEMENTED + VERIFIED trong phạm vi thesis.
  - Phase 4A: IMPLEMENTED + VERIFIED cho representative/accepted saga scope; chaos testing và advanced hardening là deferred.
  - Phase 4C: IMPLEMENTED + VERIFIED; liên kết evidence User Access, BFF và Management App.
  - Phase 7: packaging/local validation hiện có; public deployment, HTTPS smoke, public backup/rollback evidence là pending.

- [ ] **Bước 3: Tách Phase 5, 6 và 7.**

  Di chuyển unique final facts từ phase-5-7-finalization.md và phase-6-observability-plan.md vào ba file mới. Phase 7 phải link tới 2026-06-06-phase-7-docker-digitalocean-deployment.md nhưng không copy execution checklist dài vào final record.

- [ ] **Bước 4: Kiểm tra link trước khi xóa source cũ.**

  Chạy:

  rg -n 'phase-5-7-finalization|phase-6-observability-plan|phase-4c-staff-management.vi|phase-4a-saga-hardening.vi' docs README.md AGENTS.md

  Kỳ vọng: mọi inbound link đã được đổi sang phase records mới hoặc bị xóa.

- [ ] **Bước 5: Xóa source phases đã superseded và commit.**

  Chạy:

  git add docs/phases
  git diff --cached --check
  git diff --cached --name-status
  git commit -m "docs: finalize phase records through phase seven"

  Kỳ vọng: Phase 7 execution plan dưới docs/superpowers vẫn còn nguyên.

## Task 6: Cô đọng testing, specs và temporary execution artifacts

**Files:**

- Create: docs/testing/README.md
- Move: docs/testing/phase-5/saga-validation-strategy.md to docs/testing/saga-validation-strategy.md
- Move: docs/testing/phase-5/traceability-matrix.md to docs/testing/traceability-matrix.md
- Delete after absorption: mọi file còn lại trong docs/testing/phase-5/
- Delete after absorption: docs/testing/testing.md
- Delete after absorption: sáu file docs/specs/\*.md
- Delete after absorption: completed plans/specs dưới docs/superpowers/
- Preserve: docs/superpowers/plans/2026-06-06-phase-7-docker-digitalocean-deployment.md
- Preserve: docs/superpowers/plans/2026-07-12-customer-pwa-server-state-consolidation.md
- Preserve until both plans finish: docs/superpowers/plans/2026-07-12-canonical-technical-docs-consolidation.md
- Preserve until both plans finish: docs/superpowers/plans/2026-07-12-thesis-resource-consolidation.md

- [ ] **Bước 1: Viết docs/testing/README.md.**

  File phải chỉ ra test taxonomy hiện tại: unit, contract, integration, Playwright E2E, k6/benchmark và distributed saga validation. Link tới traceability-matrix.md và saga-validation-strategy.md ở root docs/testing.

- [ ] **Bước 2: Di chuyển hai testing documents dài hạn.**

  Dùng git mv cho saga strategy và traceability matrix; cập nhật mọi link trong docs/README.md, phase-5-testing.md và project-status.md tới path mới.

- [ ] **Bước 3: Hấp thụ rồi xóa execution plans/specs.**

  Trước khi xóa từng group, chuyển unique acceptance criteria vào docs/testing/README.md, phase-5-testing.md hoặc saga-validation-strategy.md. Xóa năm Phase 5 execution plans, README/handoff, năm mini-specs, testing.md và sáu docs/specs files chỉ sau reference scan.

- [ ] **Bước 4: Dọn docs/superpowers có chọn lọc.**

  Xóa completed Phase 4C/4D/6, refactor, Vercel demo và order-stock plans/specs sau absorption. Không xóa Phase 7 English plan, Phase 7 Vietnamese translation cho tới khi link/unique-content gate hoàn tất, hoặc current Customer PWA plan.

- [ ] **Bước 5: Chạy reference scan và commit.**

  Chạy:

  rg -n 'docs/testing/phase-5|docs/specs/|2026-06-06-phase-7-docker-digitalocean-deployment|2026-07-12-customer-pwa-server-state-consolidation' docs README.md AGENTS.md
  git add docs/testing docs/specs docs/superpowers docs/README.md docs/phases/phase-5-testing.md docs/project-status.md
  git diff --cached --check
  git commit -m "docs: consolidate testing evidence and execution artifacts"

## Task 7: Xóa architecture/analysis artifacts đã được hấp thụ

**Files:**

- Delete after absorption: database-per-service-split-plan.md
- Delete after absorption: docs/redis-usage-analysis.md
- Delete after absorption: docs/business-logic.vi.md
- Delete after absorption: docs/technical-architecture.vi.md
- Delete after absorption: docs/architecture/architec.mmd
- Delete after absorption: docs/architecture/erd.dbml
- Delete after absorption: docs/architecture/erd.mmd
- Delete after absorption: docs/architecture/erd.png
- Delete after absorption: docs/architecture/erd_explanation.md
- Modify or delete after migration: docs/architecture/README.md

- [ ] **Bước 1: Hoàn tất unique-content gate.**

  Đối chiếu từng candidate với canonical target nêu trong Task 2–5. Nếu candidate còn fact đúng nhưng chưa có ở canonical target, chuyển fact đó trước; không tạo archive copy.

- [ ] **Bước 2: Kiểm tra references và generated-source ownership.**

  Chạy:

  rg -n 'redis-usage-analysis|erd_explanation|architecture/erd|architec.mmd|database-per-service-split-plan|business-logic.vi|technical-architecture.vi' --glob '!docs/guides/\*\*' .

  Kỳ vọng: không còn active reference ngoài Git history.

- [ ] **Bước 3: Xóa artifacts và cập nhật architecture navigation.**

  Nếu docs/architecture/ chỉ còn permission-matrix.md, merge navigation hữu ích vào docs/README.md và xóa architecture/README.md. Nếu có diagram mới được tạo trong execution, architecture/README.md phải chỉ liệt kê source/render command hiện tại.

- [ ] **Bước 4: Commit retirement.**

  Chạy:

  git add -A docs/architecture docs/redis-usage-analysis.md docs/business-logic.vi.md docs/technical-architecture.vi.md database-per-service-split-plan.md docs/README.md
  git diff --cached --check
  git diff --cached --name-status
  git commit -m "docs: retire superseded architecture artifacts"

## Task 8: Kiểm chứng technical canonicalization và handoff

**Files:**

- Modify if needed: docs/README.md
- Modify if needed: docs/DOC-CODE-ANCHORS.md
- No application-code changes.

- [ ] **Bước 1: Chạy format và anchors.**

  Chạy:

  pnpm exec prettier --check README.md AGENTS.md docs/README.md docs/DOC-CODE-ANCHORS.md docs/project-status.md docs/business-logic.md docs/technical-architecture.md docs/architecture docs/phases docs/testing docs/documentation-canonicalization-audit-report.md
  pnpm verify:doc-anchors

  Kỳ vọng: cả hai command pass.

- [ ] **Bước 2: Chạy portable-link scan ngoài guides.**

  Chạy:

  rg -n 'file:///Users/' README.md AGENTS.md docs --glob '!docs/guides/**'
  rg -n 'phase-5-7-finalization|phase-6-observability-plan|implementation_plan.md' README.md AGENTS.md docs --glob '!docs/guides/**'

  Kỳ vọng: không có absolute local-file link; không còn implementation_plan.md hoặc old phase-plan link trong tài liệu active.

- [ ] **Bước 3: Đối chiếu status với code.**

  Chạy:

  rg -n 'StockReservation|stock_reservation_version' libs/entities apps/catalog apps/order
  rg -n 'x-session-id|x-tenant-id' apps/customer-pwa/src/lib/api-client.ts
  rg -n 'TenantMiddleware' apps/bff/src/app/app.module.ts libs/middlewares/src/lib/tenant.middleware.ts

  Kỳ vọng: evidence còn tồn tại và khớp với canonical claims.

- [ ] **Bước 4: Commit verification-only fixes nếu có và chuyển sang Plan B.**

  Chạy:

  git status --short

  Kỳ vọng: không có thay đổi ngoài tài liệu của plan này; mọi user change vẫn còn nguyên.
