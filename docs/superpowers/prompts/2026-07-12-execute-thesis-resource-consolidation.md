# Prompt thực thi Plan B — Chuẩn hóa tài nguyên khóa luận QRTable

Bạn là agent thực thi tài liệu và LaTeX cho repository QRTable tại:

    /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order

Mục tiêu của phiên này là thực thi đầy đủ:

    docs/superpowers/plans/2026-07-12-thesis-resource-consolidation.md

Chỉ bắt đầu sau khi Plan A đã hoàn tất, canonical technical docs đã ổn định và Plan A completion report xác nhận deletion/anchor gate pass. Không tự mở rộng phiên này thành public deployment.

## 1. Sub-skill và thứ tự bắt buộc

Trước khi chỉnh sửa:

1. Dùng executing-plans hoặc subagent-driven-development theo môi trường hiện tại.
2. Đọc đầy đủ AGENTS.md.
3. Đọc đầy đủ Plan A và Plan B.
4. Đọc docs/documentation-canonicalization-audit-report.md, docs/project-status.md, docs/README.md, docs/business-logic.md và docs/technical-architecture.md.
5. Chạy CodeGraph trước khi đọc sâu source:

   /Users/vodinhquan/.local/bin/codegraph sync .
   /Users/vodinhquan/.local/bin/codegraph status .

6. Đọc source/entity/migration có liên quan trực tiếp tới claim thesis:

   libs/entities/src/lib/stock-reservation.entity.ts
   libs/entities/src/lib/order.entity.ts
   apps/catalog/src/database/migrations/1781971200000-AddStockReservations.ts
   apps/order/src/database/migrations/1781971201000-AddOrderStockReservationVersion.ts
   apps/customer-pwa/src/lib/api-client.ts
   docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex

Ghi CodeGraph counts, source revision, PDF baseline và dirty-worktree status vào execution log.

## 2. Quyết định khóa luận đã chốt

- Phạm vi chức năng đã gần hoàn tất; Phase 7 public deployment là hạng mục pending duy nhất ở cấp dự án.
- LaTeX report hiện tại khoảng 200 trang và là baseline đã build. Mục tiêu cũ dưới 170 trang được đánh dấu cancelled/superseded, không được âm thầm cắt nội dung.
- English title giữ nguyên wording nhưng bỏ red editing marker.
- Staff Management/RBAC nằm trong scope; chỉ advanced HRM, payroll, scheduling và attendance ngoài scope.
- StockReservation thuộc Catalog; Order chỉ giữ external reference và stock_reservation_version.
- Council page chưa có số quyết định/ngày thật. Không render council.tex trong PDF cho tới khi có dữ liệu chính thức; không điền giá trị giả.
- Docker/Vercel evidence chứng minh packaging và frontend partial deployment; không gọi đó là full public production deployment.
- Thesis report source/figures/references.bib là canonical submission artifacts; plans/prompts/audits/survey notes là temporary hoặc provenance.
- Không sửa docs/guides/, Customer PWA/KDS changes, docs/guides/codebase-reading-map.md, docs/guides/websocket-socketio-qrtable.md, hoặc PPTX deleted bởi user.

## 3. Precondition và dirty-worktree guard

Chạy trước mỗi task:

    git status --short

Xác nhận Plan A đã pass bằng cách kiểm tra:

    test -f docs/project-status.md
    pnpm verify:doc-anchors

Không dùng git reset --hard, git checkout --, git clean hoặc restore hàng loạt. Không stage unrelated user changes. Trước commit:

    git diff --cached --name-only
    git diff --cached --check

Nếu dirty worktree chứa thay đổi trong thesis resources do user thực hiện sau Plan A, dừng task có giao thoa và báo path cụ thể trước khi ghi đè.

## 4. Cách thực thi từng task

Thực thi Task 1 đến Task 7 đúng thứ tự trong Plan B:

1. Đọc toàn bộ Files và acceptance steps.
2. Chạy reference scan trước khi rename/move/delete.
3. Dùng apply_patch cho Markdown/TeX/DBML; dùng git mv cho move path; không dùng shell redirection để viết source.
4. Với render/export, lưu command và output path.
5. Build LaTeX trong thư mục tạm mới tạo bằng mktemp; không xóa output người dùng.
6. Chỉ đánh dấu checkbox sau khi expected outcome thực sự đạt.
7. Commit theo task sau staged diff review.
8. Ghi build page count, warnings, unresolved refs và changed/deleted paths vào execution log.

## 5. Task-specific rules

### Resource map và workflow

- Tạo docs/graduation-thesis-resources/README.md, thesis-workflow.md, thesis-artifact-register.md và benchmark-results/README.md.
- Không giữ append-only workflow log làm authority.
- Hấp thụ current status, evidence policy, source ownership và Phase 7 wording; bỏ historical work log.
- Không xóa thesis-workflow-plan.md hoặc thesis-artifact-backlog.md trước Task 6, vì các working files còn reference tới chúng.

### LaTeX title, scope và council

- Chỉ bỏ \textcolor{red}{...} quanh thesisenglishtitle; không đổi title text.
- Chỉ sửa out-of-scope wording về advanced HRM; không xóa Staff Management requirement/evidence.
- Giữ council.tex như external institutional template và không thêm \input vào main report khi số quyết định/ngày còn trống.
- Sau chỉnh sửa, build main report trước khi commit.

### DBML và figures

Catalog DBML phải phản ánh StockReservation entity với:

    id, tenant_id, order_id, reservation_key, request_hash, version, state,
    deduct_result, release_result, last_release_key, released_at, created_at, updated_at

Giữ unique indexes cho (tenant_id, order_id) và (tenant_id, reservation_key). Không tạo cross-service foreign key tới Order.

Order DBML phải có stock_reservation_version int nullable và Note mô tả logical service contract, không phải database FK.

Nếu cần export SVG từ dbdiagram.io mà môi trường không có browser/session hoặc không thể xác nhận output, không tự tạo SVG giả. Ghi BLOCKER_EXPORT_MANUAL, giữ DBML source, và báo cần user thực hiện export hoặc cung cấp SVG.

### Diagram và appendix cleanup

- Source format trong assets/README.md phải khớp LaTeX references và render scripts thực tế.
- Rename d/e/f appendix source thành a/b/c chỉ trong cùng change với input commands.
- Render canonical Chapter 2/3/5 diagrams trước khi xóa deprecated Mermaid.
- Không xóa Chapter 5 report Mermaid đang được LaTeX tham chiếu.
- Chuyển chapter5-order-confirm-stock-slide22.mmd vào defense/assets/ chỉ sau khi chứng minh không có report reference.

### Evidence và sources

- Tạo benchmark manifest cho bốn runs 2026-06-26, 2026-06-27, 2026-06-30 và 2026-07-01; ghi run nào được report trích dẫn.
- Move proposal/institutional DOCX/PDF vào sources/institutional/ chỉ sau path/reference scan.
- Converted Markdown không phải official authority; chỉ chuyển formatting rules còn đúng rồi mới xóa ở Task 6.
- Research survey chỉ được xóa khi primary source/citation key hợp lệ đã có trong references.bib hoặc report không dùng claim của survey.

### Defense và condensation

- Tạo defense/README.md ghi rõ deck source/export canonical đang thiếu hoặc chưa được xác nhận.
- Không xóa thesis-defense-\*.md working files khi chưa có deck source, exported PPTX/PDF, speaker notes, demo playbook và Q&A set được chọn.
- Đánh dấu thesis-report-condensation-plan.md là cancelled/superseded vì baseline report 200 trang đã được chấp nhận; không tự cắt report để đạt target cũ.

## 6. Deletion gate

Không xóa file nào nếu chưa đạt tất cả điều kiện:

- unique facts đã nằm trong README/workflow/register/evidence/report source;
- không còn LaTeX, Markdown, script hoặc build reference active;
- rendered replacement đã tồn tại và render/build pass;
- official source/provenance vẫn còn ở path canonical;
- deletion không ảnh hưởng user dirty changes hoặc defense recovery;
- staged deletion list đã được review bằng git diff --cached --name-status.

Nếu một candidate có reference từ working plan sẽ bị xóa trong cùng Task 6, có thể giữ tới cùng atomic deletion commit. Không tạo archive copy.

## 7. Verification bắt buộc

### LaTeX build

Chạy:

    outdir="$(mktemp -d /tmp/qrtable-thesis-final.XXXXXX)"
    cd docs/graduation-thesis-resources/thesis-report
    latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir="$outdir" undergraduate-theses-report.tex
    pdfinfo "$outdir/undergraduate-theses-report.pdf"
    if rg -n 'undefined reference|LaTeX Error|Citation .{1,} undefined' "$outdir/undergraduate-theses-report.log"; then exit 1; fi

Expected: exit 0, PDF có page count và không có unresolved reference/citation/error.

### Diagram render

Chạy từ docs/graduation-thesis-resources:

    bash thesis-report/tools/render-chapter2-diagrams.sh
    bash thesis-report/tools/render-chapter3-use-case.sh
    bash thesis-report/tools/render-chapter4-diagrams.sh
    bash thesis-report/tools/render-chapter4-dbml.sh
    bash thesis-report/tools/render-chapter5-diagrams.sh

Expected: mọi canonical source render thành công; không overwrite SVG DBML canonical trái policy.

### Reference/link scan

Chạy:

    rg -n 'file:///Users/' docs/graduation-thesis-resources
    rg -n 'thesis-workflow-plan|thesis-artifact-backlog|thesis-source-backbone|thesis-report-condensation-plan' docs/graduation-thesis-resources
    rg -n 'appendix-d-|appendix-e-|appendix-f-|chapter5-order-confirm-stock-slide22' docs/graduation-thesis-resources/thesis-report
    git status --short

Expected: absolute local links không còn; old paths chỉ còn trong deletion transaction hoặc Git history; appendix/defense references khớp path mới; user changes ngoài plan vẫn nguyên.

## 8. Completion report bắt buộc

Khi Plan B hoàn tất, trả về:

1. CodeGraph baseline và source revision.
2. Danh sách canonical thesis files tạo/sửa/move.
3. DBML/entity/migration reconciliation result.
4. LaTeX PDF page count, build command và warnings.
5. Mermaid/PlantUML/DBML render result.
6. Benchmark/source/defense cleanup result.
7. Danh sách deleted candidates và absorption target.
8. Phase 7 wording còn pending.
9. Manual blocker như DBML web export hoặc missing deck source.
10. Xác nhận docs/guides/ và unrelated dirty-worktree changes không bị sửa.

Không ghi “100% deployed” khi chưa có public deployment evidence. Chỉ ghi tài liệu/thesis canonicalization completed khi toàn bộ deletion và build gates pass.
