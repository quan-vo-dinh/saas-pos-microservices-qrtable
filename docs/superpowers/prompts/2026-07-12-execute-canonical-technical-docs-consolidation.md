# Prompt thực thi Plan A — Chuẩn hóa tài liệu kỹ thuật QRTable

Bạn là agent thực thi tài liệu cho repository QRTable tại:

    /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order

Mục tiêu của phiên này là thực thi đầy đủ:

    docs/superpowers/plans/2026-07-12-canonical-technical-docs-consolidation.md

Không tự phát minh scope mới. Plan B về thesis resources chỉ được chạy sau khi Plan A hoàn tất và pass deletion/verification gate.

## 1. Sub-skill và thứ tự bắt buộc

Trước khi chỉnh sửa:

1. Dùng executing-plans hoặc subagent-driven-development theo môi trường hiện tại.
2. Đọc đầy đủ AGENTS.md.
3. Đọc đầy đủ plan A ở path nêu trên.
4. Đọc docs/README.md, docs/documentation-canonicalization-audit-report.md và các canonical docs được plan tham chiếu.
5. Chạy CodeGraph trước khi đọc sâu source:

   /Users/vodinhquan/.local/bin/codegraph sync .
   /Users/vodinhquan/.local/bin/codegraph status .

6. Ghi lại CodeGraph file/node/edge counts và trạng thái index trong execution log.

Nếu CodeGraph không chạy được, không được tự suy đoán về code. Ghi blocker, tiếp tục chỉ với document-only task không phụ thuộc code hoặc dừng task cần source evidence.

## 2. Quyết định nghiệp vụ đã chốt

Dùng các quyết định sau làm authority khi tài liệu cũ mâu thuẫn:

- Accepted QRTable thesis/product scope đã triển khai và gần hoàn tất.
- Phase 7 public deployment là hạng mục duy nhất còn mở ở cấp dự án.
- Docker/Compose/Caddy/deployment artifacts có thể là IMPLEMENTED; public deployment chỉ là DEPLOYED khi có URL/host, ngày, git SHA/image tag, migration, smoke, backup và rollback evidence.
- TenantMiddleware/guards/context xác lập tenant; repository/query áp dụng explicit tenant predicates. Không khẳng định TypeORM subscriber/global query filter.
- Customer PWA dùng x-session-id và x-tenant-id; không mô tả cookie session hoặc offline IndexedDB queue là behavior hiện tại.
- Catalog sở hữu stock và stock reservation; Order lưu stock_reservation_version.
- Staff Management đã nằm trong accepted scope; chỉ advanced HRM như payroll, scheduling và attendance là ngoài scope.
- Technical canonical docs dài hạn giữ English-first theo docs/README.md; audit report và execution prompt này dùng tiếng Việt.
- docs/guides/ là out of scope. Không sửa nội dung hoặc format các file trong docs/guides/.
- Không chạm Customer PWA server-state changes, KDS changes, docs/guides/codebase-reading-map.md, docs/guides/websocket-socketio-qrtable.md hoặc deleted PPTX của người dùng.

## 3. Dirty-worktree protocol

Ngay trước mỗi task, chạy:

    git status --short

Giữ nguyên mọi thay đổi không thuộc task hiện tại. Không dùng git reset --hard, git checkout --, git clean, hoặc lệnh restore hàng loạt. Chỉ stage path của task sau khi kiểm tra diff.

Trước mỗi commit:

    git diff --cached --name-only
    git diff --cached --check

Nếu staged list chứa user file ngoài task, unstage path đó và không sửa nội dung của nó.

## 4. Cách thực thi từng task

Thực thi Task 1 đến Task 8 đúng thứ tự trong plan. Với mỗi task:

1. Đọc toàn bộ Files và acceptance steps của task.
2. Chạy source/reference check trước khi edit.
3. Dùng apply_patch cho chỉnh sửa Markdown/AGENTS/README/phase docs; không dùng cat hoặc shell redirection để viết file.
4. Không sửa application code trong Plan A.
5. Chạy verification command của task và đọc exit code/output đầy đủ.
6. Chỉ đánh dấu checkbox khi command và expected outcome thực sự đạt.
7. Tạo một checkpoint commit theo message trong plan, sau khi dirty-worktree gate pass.
8. Ghi changed files, deleted files, verification output và unresolved issue vào execution log.

### Task-specific rules

- Task 1 chỉ chỉnh heading audit report và thêm kết luận Q1 đã chốt; không thay đổi findings, IDs, evidence hoặc deletion matrix.
- Task 2 phải tạo docs/project-status.md và retire docs/implementation_plan.md sau khi facts cần thiết đã được hấp thụ. Sửa stale anchor POS path thành apps/management-app/src/features/pos/components/table-detail-panel.tsx.
- Task 3 phải viết lại README.md và AGENTS.md theo alias/library thật trong tsconfig.base.json. Không tạo alias @qrtable/\* nếu code không expose alias đó.
- Task 4 phải sửa business-logic.md và technical-architecture.md về session, tenant, stock, bill ownership, Kitchen Redis-only, port và deployment status. Chỉ giữ Redis facts còn đúng.
- Task 5 phải tạo final records Phase 5 Testing, Phase 6 Observability và Phase 7 Deployment; Phase 4A được ghi complete cho accepted representative scope với hardening deferred; Phase 4C được ghi implemented/verified.
- Task 6 phải giữ Phase 7 English execution plan, Phase 7 Vietnamese plan cho tới khi unique-content gate kết thúc, và giữ current Customer PWA server-state plan. Không xóa các plan này.
- Task 7 chỉ xóa architecture/analysis artifacts sau unique-content và reference gate. Không tạo archive folder.
- Task 8 phải kiểm tra links ngoài docs/guides/ và chạy anchors. Không coi một failure trong docs/guides/ là lý do để mở rộng scope.

## 5. Điều kiện không được tự động xóa

Dừng deletion của một candidate nếu một trong các điều kiện sau chưa đạt:

- canonical target chưa chứa unique fact;
- còn Markdown/LaTeX/script/build reference đang active;
- evidence chưa có artifact thay thế/provenance;
- source diagram chưa có render command và output kiểm chứng;
- candidate có thay đổi của user trong dirty worktree;
- deletion làm Phase 7 execution plan hoặc Customer PWA plan mất khỏi repository.

Nếu phát hiện tài liệu có claim mâu thuẫn nhưng chưa đủ source evidence, giữ tài liệu, gắn status cần review trong execution log và không xóa im lặng.

## 6. Verification cuối Plan A

Chạy đầy đủ, không dùng partial output:

    pnpm exec prettier --check README.md AGENTS.md docs/README.md docs/DOC-CODE-ANCHORS.md docs/project-status.md docs/business-logic.md docs/technical-architecture.md docs/architecture docs/phases docs/testing docs/documentation-canonicalization-audit-report.md
    pnpm verify:doc-anchors
    rg -n 'file:///Users/' README.md AGENTS.md docs --glob '!docs/guides/**'
    rg -n 'phase-5-7-finalization|phase-6-observability-plan|implementation_plan.md' README.md AGENTS.md docs --glob '!docs/guides/**'
    rg -n 'EntitySubscriberInterface|@EventSubscriber|Global Query Filter|TypeORM Subscriber' apps libs docs --glob '!docs/guides/**'
    rg -n 'StockReservation|stock_reservation_version' libs/entities apps/catalog apps/order docs --glob '!docs/guides/**'
    git status --short

Expected:

- Prettier pass cho files nằm trong scope.
- verify:doc-anchors pass.
- Không còn absolute local-file links trong technical docs ngoài guides.
- Không còn canonical claim về automatic TypeORM filter.
- Stock reservation/version evidence tồn tại.
- Phase 7 public deployment vẫn được ghi pending, không bị overclaim.
- User changes ngoài docs/superpowers plan vẫn nguyên trạng.

Nếu một command fail, không ghi “completed”. Ghi rõ command, exit code, output ngắn và task đang block.

## 7. Completion report bắt buộc

Khi Plan A hoàn tất, trả về:

1. CodeGraph baseline trước execution.
2. Danh sách canonical files đã tạo/sửa.
3. Danh sách files đã xóa, kèm source-to-target absorption.
4. Phase 7 status và phần còn pending.
5. Các verification commands với PASS/FAIL/WARN thực tế.
6. Các blocker hoặc manual follow-up cho Plan B.
7. Xác nhận docs/guides/ và unrelated dirty-worktree changes không bị sửa.

Chỉ sau completion report và deletion gate pass mới chuyển sang:

    docs/superpowers/prompts/2026-07-12-execute-thesis-resource-consolidation.md
