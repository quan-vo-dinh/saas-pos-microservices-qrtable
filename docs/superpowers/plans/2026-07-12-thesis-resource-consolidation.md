# QRTable – Kế hoạch triển khai chuẩn hóa tài nguyên khóa luận

> **Dành cho agentic workers:** BẮT BUỘC dùng sub-skill **subagent-driven-development** (khuyến nghị) hoặc **executing-plans** để thực hiện từng task. Mọi bước dùng checkbox để theo dõi.

**Mục tiêu:** Cô đọng tài nguyên khóa luận thành một bộ LaTeX, evidence, institutional sources và defense materials có thẩm quyền rõ ràng; sửa các drift đã xác nhận với code và xóa plans/prompts/assets cũ sau kiểm chứng.

**Kiến trúc:** Plan này chạy sau canonical technical-docs plan. LaTeX source và rendered figures là hồ sơ nộp chính; code/entities/migrations là authority cho implementation facts; benchmark/source files là evidence có manifest; plans/prompts/audits là temporary artifacts. Các thao tác xóa chỉ thực hiện sau reference scan, render/build thành công và xác nhận nguồn thay thế.

**Công nghệ/công cụ:** XeLaTeX/latexmk, BibLaTeX/BibTeX, DBML/dbdiagram.io export, PlantUML, Mermaid CLI, Bash, Git, CodeGraph.

**Prompt thực thi:** [2026-07-12-execute-thesis-resource-consolidation.md](../prompts/2026-07-12-execute-thesis-resource-consolidation.md)

---

## Phạm vi và non-goals

Trong phạm vi:

- Tạo index cho thesis resources, workflow hiện hành, artifact register và benchmark manifest.
- Sửa drift giữa code/entity/migration với LaTeX/DBML.
- Loại bỏ red editing marker ở English title và làm rõ scope staff management nâng cao.
- Chuẩn hóa source/render registry, appendix filenames, Mermaid/placeholder/generated assets.
- Tách official institutional sources, evidence và temporary writing artifacts.
- Chốt đã hủy mục tiêu rút gọn dưới 170 trang vì report 200 trang hiện là bản hoàn chỉnh đã build; không đặt lại page target khi không có yêu cầu học vụ.

Ngoài phạm vi:

- Không thay đổi business implementation hoặc database schema.
- Không thực hiện Phase 7 public deployment; thesis chỉ ghi nhận deployment artifacts, Vercel frontend evidence và giới hạn public backend deployment.
- Không cập nhật nội dung docs/guides/.
- Không tạo/xóa final defense deck khi source PPTX/PDF/deck directory chưa có trong worktree.
- Không sửa hoặc khôi phục presentation PPTX đang nằm trong dirty worktree của người dùng.

## Quyết định đã chốt từ audit, code và report source

| Quyết định                                       | Evidence                                                                                     | Cách thực hiện                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Public deployment chưa hoàn tất                  | Chapter 6/7 đã mô tả trung thực Docker packaging + Vercel frontend và backend public pending | Giữ wording này; link Phase 7 status, không overclaim production readiness                                   |
| Stock reservation phải xuất hiện ở schema figure | StockReservation entity/migration tồn tại; Order có stock_reservation_version                | Sửa hai DBML source và export lại SVG canonical                                                              |
| English title không có màu đỏ                    | \thesisenglishtitle chỉ đang dùng red editing marker                                         | Bỏ \textcolor{red}{...}, không đổi wording title                                                             |
| Council page chưa có dữ liệu chính thức          | council.tex có số quyết định/ngày để trống                                                   | Không input vào PDF; ghi rõ là institutional template chờ dữ liệu thật                                       |
| Staff Management thuộc scope đã triển khai       | Chapter 1/3 mô tả quản lý staff; chỉ advanced HRM là out of scope                            | Sửa mọi claim “quản trị nhân sự” chung chung thành “quản trị nhân sự nâng cao (HRM)” khi nói về out-of-scope |
| Page-condensation target đã lỗi thời             | PDF build hiện tại 200 trang; người dùng xác nhận chỉ cần chỉnh heading report là hoàn tất   | Đánh dấu condensation plan cancelled/superseded, hấp thụ lý do vào workflow rồi xóa                          |
| Defense source không hiện diện                   | Working notes tham chiếu deck path/PPTX không còn trong worktree                             | Giữ working notes; tạo defense index chỉ rõ block, không destructive cleanup                                 |

## Dirty-worktree guard

Trước mỗi task, chạy:

    git status --short

Không chạm Customer PWA/KDS changes, docs/guides/codebase-reading-map.md, Customer PWA plan, hoặc deleted PPTX. Stage theo pathspec của task; trước khi commit, kiểm tra:

    git diff --cached --name-only
    git diff --cached --check

## Cấu trúc file đích

- Create: docs/graduation-thesis-resources/README.md
  - Bản đồ report, workflow, evidence, sources, defense và generated-file policy.
- Create: docs/graduation-thesis-resources/thesis-workflow.md
  - Trạng thái hiện hành ngắn gọn thay append-only log.
- Create: docs/graduation-thesis-resources/thesis-artifact-register.md
  - Chỉ chứa artifact được trích dẫn/duy trì.
- Create: docs/graduation-thesis-resources/benchmark-results/README.md
  - Manifest các run được giữ và run được dùng trong report.
- Create: docs/graduation-thesis-resources/sources/institutional/README.md
  - Registry nguồn quy định/đề cương chính thức.
- Create: docs/graduation-thesis-resources/defense/README.md
  - Status/gate của deck source và minimal defense set.
- Modify: thesis-report/undergraduate-theses-report.tex
  - Title marker, appendix input names; council page vẫn excluded.
- Modify: thesis-report/chapters/01-mo-dau.tex
  - Out-of-scope wording cho advanced HRM.
- Modify: thesis-report/assets/diagrams/dbml/chapter4-catalog-schema.dbml
  - Stock reservation table.
- Modify: thesis-report/assets/diagrams/dbml/chapter4-order-schema.dbml
  - Order stock reservation version.
- Modify: thesis-report/assets/README.md
  - Current source/render registry.

## Task 1: Tạo thesis resource map, workflow và artifact register

**Files:**

- Create: docs/graduation-thesis-resources/README.md
- Create: docs/graduation-thesis-resources/thesis-workflow.md
- Create: docs/graduation-thesis-resources/thesis-artifact-register.md
- Modify: docs/graduation-thesis-resources/thesis-official-outline.md
- Modify: docs/graduation-thesis-resources/thesis-evidence-map.md
- Preserve until Task 6: docs/graduation-thesis-resources/thesis-workflow-plan.md
- Preserve until Task 6: docs/graduation-thesis-resources/thesis-artifact-backlog.md

- [ ] **Bước 1: Viết README.md làm entry point duy nhất.**

  README phải có năm section: Report source, Current workflow, Evidence and benchmarks, Official sources and citations, Defense material. Trong mỗi section nêu exact canonical path và authority. Ghi rõ report source là thesis-report/, sources chính là references.bib và official DOCX/PDF, còn plans/prompts/audits là temporary.

- [ ] **Bước 2: Viết thesis-workflow.md thay append-only log.**

  Chỉ giữ: current report status, PDF build command, evidence update rule, Phase 7 wording rule, defense blocker và next action. Ghi rõ product scope hoàn tất; public backend deployment là deferred Phase 7 work; target rút gọn dưới 170 trang đã cancelled/superseded.

- [ ] **Bước 3: Viết thesis-artifact-register.md.**

  Registry có các cột: Artifact, canonical source, rendered/cited output, status, verification command. Chỉ liệt kê figures/tables/screenshots/benchmarks còn được LaTeX tham chiếu hoặc được giữ làm provenance.

- [ ] **Bước 4: Refresh official outline và evidence map.**

  Đồng bộ trạng thái theo PDF hiện tại có bảy chương, các appendices hiện hữu, stock reservation evidence và partial deployment wording. Không để lại trạng thái pending cũ cho Chương 1/2/3/4/5/6/7.

- [ ] **Bước 5: Kiểm tra inbound references trước khi xóa hai file cũ.**

  Chạy:

  rg -n 'thesis-workflow-plan|thesis-artifact-backlog' docs/graduation-thesis-resources -g '\*.md'

  Kỳ vọng: mọi reference sống đã đổi sang thesis-workflow.md hoặc thesis-artifact-register.md; các plans/prompt chuẩn bị xóa chỉ còn là candidates của Task 6.

- [ ] **Bước 6: Commit thesis navigation.**

  Chạy:

  git add docs/graduation-thesis-resources/README.md docs/graduation-thesis-resources/thesis-workflow.md docs/graduation-thesis-resources/thesis-artifact-register.md docs/graduation-thesis-resources/thesis-official-outline.md docs/graduation-thesis-resources/thesis-evidence-map.md
  git diff --cached --check
  git commit -m "docs(thesis): add canonical resource map"

## Task 2: Reconcile LaTeX facts and institutional-template policy

**Files:**

- Modify: docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex
- Modify: docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
- Modify: docs/graduation-thesis-resources/thesis-workflow.md
- Modify: docs/graduation-thesis-resources/README.md
- Preserve without input: docs/graduation-thesis-resources/thesis-report/frontmatter/council.tex

- [ ] **Bước 1: Bỏ red editing marker khỏi English title.**

  Thay định nghĩa thesisenglishtitle từ \textcolor{red}{Research on the Development of a SaaS-Based POS Platform Integrating QR Code Ordering under a Microservices Architecture} thành chính title text đó, không bọc màu và không đổi wording.

- [ ] **Bước 2: Thu hẹp claim ngoài phạm vi tại Chapter 1.**

  Ở đoạn out-of-scope trong chapters/01-mo-dau.tex, thay “quản trị nhân sự” bằng “quản trị nhân sự nâng cao (HRM), như bảng lương, chấm công và lập ca”. Không sửa các đoạn mô tả Staff Management/RBAC đã triển khai.

- [ ] **Bước 3: Chốt council page là external template.**

  Giữ council.tex không được \input trong main report vì số quyết định/ngày còn để trống. Ghi vào README và thesis-workflow.md: file chỉ được input sau khi trường cung cấp đầy đủ thông tin hội đồng; không dùng placeholder để tạo trang nộp chính thức.

- [ ] **Bước 4: Chạy build kiểm tra thay đổi source.**

  Chạy từ thesis-report:

  latexmk -xelatex -interaction=nonstopmode -halt-on-error undergraduate-theses-report.tex
  pdfinfo undergraduate-theses-report.pdf

  Kỳ vọng: build exit 0, PDF tồn tại; không có undefined reference/citation mới.

- [ ] **Bước 5: Commit factual/source-policy corrections.**

  Chạy:

  git add docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex docs/graduation-thesis-resources/thesis-workflow.md docs/graduation-thesis-resources/README.md
  git diff --cached --check
  git commit -m "docs(thesis): reconcile title and scope wording"

## Task 3: Đồng bộ DBML và schema figures với code

**Files:**

- Modify: docs/graduation-thesis-resources/thesis-report/assets/diagrams/dbml/chapter4-catalog-schema.dbml
- Modify: docs/graduation-thesis-resources/thesis-report/assets/diagrams/dbml/chapter4-order-schema.dbml
- Modify by export: docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-db-catalog-schema.svg
- Modify by export: docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-db-order-schema.svg
- Modify by render: corresponding DBML preview PDF/PNG files if the render script creates them

- [ ] **Bước 1: Thêm stock_reservations table vào Catalog DBML.**

  Table phải có các columns từ StockReservation entity: id, tenant_id, order_id, reservation_key, request_hash, version, state, deduct_result, release_result, last_release_key, released_at, created_at và updated_at.

  Thêm unique indexes cho (tenant_id, order_id) và (tenant_id, reservation_key). Không tạo cross-service foreign key tới Order; ghi rõ order_id là external Order reference.

- [ ] **Bước 2: Thêm version vào Order DBML.**

  Thêm stock_reservation_version int nullable vào table orders. Sửa Note của orders để mô tả version này liên kết logic với reservation do Catalog sở hữu qua TCP, không phải database foreign key.

- [ ] **Bước 3: Đối chiếu DBML với entity/migration trước export.**

  Chạy:

  rg -n 'stock_reservation_version' libs/entities/src/lib/order.entity.ts apps/order/src/database/migrations
  rg -n 'reservation_key|request_hash|deduct_result|release_result|last_release_key|released_at' libs/entities/src/lib/stock-reservation.entity.ts

  Kỳ vọng: mọi column DBML mới có evidence từ entity hoặc migration.

- [ ] **Bước 4: Export SVG canonical từ dbdiagram.io.**

  Import từng DBML source vào dbdiagram.io, kiểm tra table/index/note, export SVG và ghi đè đúng hai file chapter4-db-catalog-schema.svg và chapter4-db-order-schema.svg. Không dùng render tự động từ DBML để ghi đè SVG canonical nếu chưa có approval cho ALLOW_DBML_SVG_OVERWRITE.

- [ ] **Bước 5: Render preview và build LaTeX.**

  Chạy từ docs/graduation-thesis-resources:

  bash thesis-report/tools/render-chapter4-dbml.sh
  cd thesis-report && latexmk -xelatex -interaction=nonstopmode -halt-on-error undergraduate-theses-report.tex

  Kỳ vọng: SVG/PDF figures hiển thị table mới; LaTeX build pass.

- [ ] **Bước 6: Commit schema evidence.**

  Chạy:

  git add docs/graduation-thesis-resources/thesis-report/assets/diagrams/dbml docs/graduation-thesis-resources/thesis-report/assets/figures
  git diff --cached --check
  git commit -m "docs(thesis): align schema diagrams with stock reservations"

## Task 4: Chuẩn hóa source registry, Mermaid và appendix source names

**Files:**

- Modify: docs/graduation-thesis-resources/thesis-report/assets/README.md
- Move: docs/graduation-thesis-resources/thesis-report/appendices/d-test-evidence.tex to appendices/a-test-evidence.tex
- Move: docs/graduation-thesis-resources/thesis-report/appendices/e-extended-diagrams.tex to appendices/b-extended-diagrams.tex
- Move: docs/graduation-thesis-resources/thesis-report/appendices/f-benchmark-observability-evidence.tex to appendices/c-benchmark-observability-evidence.tex
- Modify: docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex
- Delete after render/reference check: thesis-report/assets/diagrams/chapter2-fnb-pos-lifecycle.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter2-kafka-event-flow.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter2-monolith-vs-microservices.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter2-oidc-rbac-saas-pos.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter2-outbox-saga-overview.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter2-qr-ordering-flow.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter2-saas-multitenancy.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter2-websocket-hint-refetch.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter3-actor-use-case-overview.mmd
- Delete after render/reference check: thesis-report/assets/diagrams/chapter3-business-flow.mmd
- Move after reference check: thesis-report/assets/diagrams/chapter5-order-confirm-stock-slide22.mmd to docs/graduation-thesis-resources/defense/assets/

- [ ] **Bước 1: Viết lại assets/README.md thành source registry.**

  Với mỗi chapter, registry phải nêu canonical source format, source path, rendered path, render command và generated-output policy. Registry phải nói rõ: không sửa trực tiếp rendered PDFs/SVGs; Chapter 2/3 dùng PlantUML canonical source; Chapter 5 report diagrams dùng Mermaid; Chapter 4 DBML SVG là web-exported canonical figure theo chính sách hiện có.

- [ ] **Bước 2: Rename appendix sources cho khớp output A/B/C.**

  Dùng git mv cho ba file appendix và đổi ba lệnh input trong undergraduate-theses-report.tex sang a-test-evidence, b-extended-diagrams và c-benchmark-observability-evidence. Không đổi label hoặc \appendix behavior.

- [ ] **Bước 3: Kiểm tra reference trước khi dọn Mermaid cũ.**

  Chạy:

  rg -n 'chapter2-.\*\.mmd|chapter3-actor-use-case-overview\.mmd|chapter3-business-flow\.mmd|chapter5-order-confirm-stock-slide22\.mmd' docs/graduation-thesis-resources/thesis-report

  Kỳ vọng: không có LaTeX/active-script reference tới 10 deprecated sources; slide22 không được report tham chiếu.

- [ ] **Bước 4: Render trước và sau cleanup.**

  Chạy từ docs/graduation-thesis-resources:

  bash thesis-report/tools/render-chapter2-diagrams.sh
  bash thesis-report/tools/render-chapter3-use-case.sh
  bash thesis-report/tools/render-chapter5-diagrams.sh

  Kỳ vọng: canonical diagrams render thành công. Chỉ sau đó xóa 10 source deprecated và chuyển slide22 vào defense/assets.

- [ ] **Bước 5: Build report và commit asset cleanup.**

  Chạy:

  cd docs/graduation-thesis-resources/thesis-report && latexmk -xelatex -interaction=nonstopmode -halt-on-error undergraduate-theses-report.tex
  git add docs/graduation-thesis-resources/thesis-report docs/graduation-thesis-resources/defense
  git diff --cached --check
  git commit -m "docs(thesis): normalize diagram sources and appendices"

## Task 5: Chuẩn hóa evidence, benchmarks và institutional sources

**Files:**

- Create: docs/graduation-thesis-resources/benchmark-results/README.md
- Create: docs/graduation-thesis-resources/sources/institutional/README.md
- Move: docs/graduation-thesis-resources/thesis-proposal-vodinhminhquan-v1.docx to sources/institutional/
- Move: docs/graduation-thesis-resources/phuluc2_hinhthuctrinhbay.docx to sources/institutional/
- Move: docs/graduation-thesis-resources/phuluc2_hinhthuctrinhbay.pdf to sources/institutional/
- Preserve until Task 6 after source-rule capture: Thesis-Proposal-VoDinhMinhQuan-v1.docx.md
- Preserve until Task 6 after source-rule capture: \_MConverter.eu_mau_de_cuong_chi_tiet_CTTT.md
- Preserve until Task 6 after source-rule capture: phu_luc_de_cuong_chi_tiet.md
- Preserve until Task 6 after source-rule capture: presentation-format-graduation-thesis.md
- Preserve until Task 6 after citation verification: four files under research-survey/

- [ ] **Bước 1: Viết benchmark-results/README.md làm manifest.**

  Liệt kê bốn run: 2026-06-26, 2026-06-27, 2026-06-30 và 2026-07-01. Với mỗi run, nêu scenario files, summary JSON/Markdown, screenshot availability, local-only status và việc run đó có/không được thesis trích dẫn. Chỉ định 2026-06-26 là candidate evidence khi report đang dùng screenshots của run đó; xác nhận lại label/caption trước khi gọi là cited.

- [ ] **Bước 2: Tạo institutional source registry và move binary source.**

  README phải phân biệt proposal provenance với quy định trình bày chính thức. Dùng git mv ba binary source vào sources/institutional/ chỉ sau khi rg scan không tìm thấy hardcoded root path. Cập nhật thesis README và workflow tới path mới.

- [ ] **Bước 3: Trích unique rules từ converted Markdown.**

  Chuyển các rule định dạng còn giá trị vào institutional README hoặc thesis report style checklist. Không giữ broken converted Markdown làm authority.

- [ ] **Bước 4: Kiểm chứng citation trước khi xóa research surveys.**

  So sánh mọi claim từ bốn survey với references.bib. Chỉ giữ source có citation key/primary source phù hợp; không dùng survey để tạo claim mới. Khi report không còn reference tới survey paths, xóa cả bốn files.

- [ ] **Bước 5: Xác nhận source move và commit, chưa xóa temporary source candidates.**

  Chạy:

  rg -n 'file:///Users/|Thesis-Proposal-VoDinhMinhQuan-v1\.docx\.md|\_MConverter\.eu_mau_de_cuong_chi_tiet_CTTT|phu_luc_de_cuong_chi_tiet|presentation-format-graduation-thesis' docs/graduation-thesis-resources
  git add docs/graduation-thesis-resources
  git diff --cached --check
  git commit -m "docs(thesis): organize sources and benchmark evidence"

  Kỳ vọng: binary institutional source đã ở sources/institutional/; canonical README không dùng absolute local-file link; converted-source paths chỉ còn trong candidates sẽ bị xóa cùng Task 6.

## Task 6: Retire completed writing artifacts, giữ defense có điều kiện

**Files:**

- Delete after absorption: chapter-01-opening-draft-plan.md
- Delete after absorption: chapter-03-05-07-scope-tone-refactor-plan.md
- Delete after absorption: chapter-03-05-07-scope-tone-refactor-prompt.md
- Delete after absorption: chapter-03-requirement-evidence.md
- Delete after absorption: chapter-03-requirement-sync-prompt.md
- Delete after absorption: chapter-04-05-content-refactor-plan.md
- Delete after absorption: chapter-04-architecture-evidence.md
- Delete after absorption: chapter-04-architecture-polish-plan.md
- Delete after absorption: chapter-04-architecture-polish-spec.md
- Delete after absorption: chapter-04-database-dbdiagram-plan.md
- Delete after absorption: chapter-04-kafka-redis-deepening-plan.md
- Delete after absorption: chapter-04-security-auth-rbac-deepening-plan.md
- Delete after absorption: chapter-05-07-content-refactor-plan.md
- Delete after absorption: chapter-05-ui-gallery-scaffold-plan.md
- Delete after absorption: chapter-06-07-evaluation-conclusion-refactor-plan.md
- Delete after absorption: chapter-06-evaluation-evidence.md
- Delete after absorption: chapter-06-visual-evidence-enrichment-plan.md
- Delete after absorption: chapter5-section3-completion-report.md
- Delete after absorption: chapter5-section3-diagram-requirements.md
- Delete after absorption: chapter5-section3-restructure-summary.md
- Delete after absorption: k6-observability-benchmark-plan.md
- Delete after absorption: k6-observability-report-writing-plan.md
- Delete after absorption: k6-observability-test.md
- Delete after absorption: scale-out-testing-detailed-explanation.vi.md
- Delete after absorption: thesis-agent-prompt-bank.md
- Delete after absorption: thesis-appendix-refactor-plan.md
- Delete after absorption: thesis-language-style-audit-report.md
- Delete after absorption: thesis-phase5a-evidence-audit.md
- Delete after absorption: thesis-phase5d-screenshot-scaffold.md
- Delete after absorption: thesis-source-backbone.md
- Delete after absorption: thesis-workflow-plan.md
- Delete after absorption: thesis-artifact-backlog.md
- Delete after cancellation note: thesis-report-condensation-plan.md
- Delete after source-rule capture: Thesis-Proposal-VoDinhMinhQuan-v1.docx.md
- Delete after source-rule capture: \_MConverter.eu_mau_de_cuong_chi_tiet_CTTT.md
- Delete after source-rule capture: phu_luc_de_cuong_chi_tiet.md
- Delete after source-rule capture: presentation-format-graduation-thesis.md
- Delete after citation verification: research-survey/Khảo sát Chuyển đổi số F&B Việt Nam.md
- Delete after citation verification: research-survey/Nghiên cứu SaaS Multi-tenancy Việt Nam.md
- Delete after citation verification: research-survey/Phân tích POS Việt Nam, tìm lỗ hổng.md
- Delete after citation verification: research-survey/Tổng quan nghiên cứu kiến trúc Microservices.md
- Create: docs/graduation-thesis-resources/defense/README.md
- Preserve pending deck recovery: all thesis-defense-\*.md working files

- [ ] **Bước 1: Hấp thụ unique facts của writing artifacts.**

  Chỉ chuyển nội dung còn đúng vào canonical README, workflow, artifact register, evidence map, assets README hoặc report source. Không copy process log, prompt wording, historical checklist hay stale status.

- [ ] **Bước 2: Chốt cancellation của condensation plan.**

  Trong thesis-workflow.md ghi rõ: built report 200 trang là baseline đã chấp nhận; mục tiêu dưới 170 trang là plan cũ cancelled/superseded, không phải acceptance criterion. Sau đó xóa thesis-report-condensation-plan.md.

- [ ] **Bước 3: Tạo defense/README.md không phá hủy.**

  File phải nêu rõ chưa có deck source/export canonical trong worktree; không được xóa thesis-defense-\*.md cho tới khi có source deck, exported PPTX/PDF, speaker notes, demo playbook và Q&A được chọn. Ghi các file hiện tại là working material, không phải report authority.

- [ ] **Bước 4: Reference scan trước khi xóa writing artifacts.**

  Chạy:

  rg -n 'chapter-01-opening-draft-plan|chapter-03-05-07|chapter-04-05|chapter-05-07|chapter-06-07|chapter5-section3|thesis-source-backbone|thesis-report-condensation-plan' docs/graduation-thesis-resources -g '\*.md'

  Kỳ vọng: không còn reference từ canonical map/workflow/evidence/LaTeX tới candidates.

- [ ] **Bước 5: Xóa candidates, kiểm tra staged diff và commit.**

  Chạy:

  git add -A docs/graduation-thesis-resources
  git diff --cached --check
  git diff --cached --name-status
  git commit -m "docs(thesis): retire absorbed writing artifacts"

## Task 7: Xóa generated clutter và kiểm chứng report cuối

**Files:**

- Delete after reference check: 49 identical unused Appendix A placeholder PNGs.
- Delete after reference check: unused temporary screenshots, old appendix-d-01/02 screenshots và text files.
- Delete after reference check: tracked thesis-report/tools/**pycache**/\*.pyc.
- Modify if needed: .gitignore.
- Modify if needed: thesis-report/assets/README.md and thesis-artifact-register.md.

- [ ] **Bước 1: Kiểm tra mọi artifact trước khi xóa.**

  Chạy:

  rg -n 'appendix-d-01|appendix-d-02|screenshots/temp|**pycache**|a-ui-gallery' docs/graduation-thesis-resources/thesis-report -g '_.tex' -g '_.md' -g '_.sh' -g '_.py'

  Kỳ vọng: không có active LaTeX/script reference tới candidate đã xác định trong audit.

- [ ] **Bước 2: Xóa generated artifacts và thêm ignore rule.**

  Giữ only source assets được registry liệt kê. Thêm ignore cho Python bytecode và temporary thesis output nếu chưa được ignore; không ignore canonical SVG/PDF/PNG figures mà LaTeX cần.

- [ ] **Bước 3: Render retained diagrams.**

  Chạy từ docs/graduation-thesis-resources:

  bash thesis-report/tools/render-chapter2-diagrams.sh
  bash thesis-report/tools/render-chapter3-use-case.sh
  bash thesis-report/tools/render-chapter4-diagrams.sh
  bash thesis-report/tools/render-chapter5-diagrams.sh

  Kỳ vọng: mọi source còn canonical render thành công.

- [ ] **Bước 4: Build PDF từ clean output directory.**

  Chạy:

  outdir="$(mktemp -d /tmp/qrtable-thesis-final.XXXXXX)"
  cd docs/graduation-thesis-resources/thesis-report && latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir="$outdir" undergraduate-theses-report.tex
  pdfinfo "$outdir/undergraduate-theses-report.pdf"

  Kỳ vọng: exit 0; PDF có page count; không có undefined reference/citation hoặc LaTeX Error.

- [ ] **Bước 5: Kiểm tra link, citations, Git scope và commit cuối.**

  Chạy:

  rg -n 'file:///Users/' docs/graduation-thesis-resources
  if rg -n 'undefined reference|LaTeX Error|Citation .{1,} undefined' "$outdir/undergraduate-theses-report.log"; then exit 1; fi
  git status --short

  Kỳ vọng: không có absolute local links hoặc unresolved reference/citation; worktree chỉ thay đổi thesis docs/assets của plan và user changes giữ nguyên.

  Sau khi review staged diff:

  git add -A docs/graduation-thesis-resources .gitignore
  git diff --cached --check
  git commit -m "docs(thesis): finalize canonical thesis resources"

## Checklist tự review trước khi thực thi

- Mỗi fact về tenant/session/stock reservation được đối chiếu với code/entity/migration, không chỉ với plan cũ.
- Phase 7 chỉ được mô tả là public deployment pending; Docker/Vercel evidence không bị gọi nhầm là full production deployment.
- Council placeholder không được render như dữ liệu hội đồng thật.
- Không có artifact nào bị xóa khi còn LaTeX/Markdown/script reference.
- Temporary plans/reports không được archive dưới tên mới.
- docs/guides/ và user worktree ngoài scope không bị chạm.
