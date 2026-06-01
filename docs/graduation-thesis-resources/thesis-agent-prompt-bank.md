# Prompt bank cho AI agent viết khóa luận QRTable

> Tài liệu sống chứa prompt mẫu để khởi động các session mới mà không phụ thuộc vào trí nhớ của thread chat hiện tại.
> Cập nhật gần nhất: 2026-06-01.

## 1. Mục đích

File này giúp người dùng mở một session AI mới và giao đúng phase con mà không cần viết lại toàn bộ bối cảnh. Mỗi prompt dưới đây cố tình ngắn hơn các prompt trao đổi ban đầu, vì agent mới phải đọc `thesis-workflow-plan.md` và các tài liệu liên quan trong repo để lấy context chi tiết.

Ghi chú 2026-06-01: prompt bank có "Phase 4D" thuộc workflow khóa luận, nghĩa là artifact coverage cho Chương 3. Không nhầm với **technical Phase 4D Dashboard & Reporting** trong `docs/phases/phase-4d-dashboard-reporting.md`. Khi cần backfill dashboard/reporting vào report, tạo session riêng dựa trên note trong `thesis-workflow-plan.md`, không dùng prompt Phase 4D Chương 3 bên dưới.

Nguyên tắc:

1. Mỗi session chỉ làm một phase con và một output chính.
2. Luôn bắt đầu bằng `Agent Start Checklist` trong `thesis-workflow-plan.md`.
3. Nếu phase con liên quan đến code/architecture/evaluation, agent tự đọc thêm canonical docs được liệt kê trong workflow plan.
4. Không viết nội dung dài nếu phase hiện tại chỉ là audit, source backbone, citation, diagram hoặc setup.
5. Cuối session phải cập nhật `Current Status`, `Next Concrete Step`, `Open Questions`, `Risks / Do Not Forget` trong `thesis-workflow-plan.md`.

## 2. Prompt nền dùng cho mọi session

```md
Tôi muốn tiếp tục workflow viết khóa luận QRTable trong repo hiện tại.

Trước khi làm, hãy đọc `docs/graduation-thesis-resources/thesis-workflow-plan.md` và làm theo `Agent Start Checklist`. Sau đó chỉ đọc thêm những tài liệu thật sự cần cho phase con hiện tại.

Yêu cầu chung:

- Trả lời và viết tài liệu bằng tiếng Việt.
- Không overclaim performance, scalability, observability, deployment hoặc production readiness.
- Không viết phần “implementation thay đổi so với proposal”.
- Không invent nguồn, số liệu, service, endpoint, database table, Kafka topic hoặc security claim.
- Không revert thay đổi không do bạn tạo.
- Nếu cần tài liệu framework/library/API/cloud hiện tại, dùng Context7/ctx7 trước.
- Nếu cần kiểm tra UI/screenshot/local app, dùng Browser, trừ Phase 5D scaffold/manual capture handoff vì phase đó cố ý không chụp UI tự động.
- Nếu phase chạm Saga, consistency hoặc Chương 5/6, đọc `docs/testing/phase-5/saga-validation-strategy.md` và không claim full production-grade Saga hardening.
- Cuối session, chạy verification phù hợp và cập nhật `thesis-workflow-plan.md`.
```

## 3. Prompt Phase 2B: Source backbone và initial references

````md
Tiếp tục Phase 2B: Source Backbone & Initial References.

Mục tiêu duy nhất của session này là tạo `docs/graduation-thesis-resources/thesis-source-backbone.md`, chọn nguồn uy tín cho Chương 1 và Chương 2, và chỉ thêm nguồn thật đủ chắc vào `docs/graduation-thesis-resources/thesis-report/references.bib`.

Trước khi làm, đọc `thesis-workflow-plan.md`, `thesis-official-outline.md`, `thesis-evidence-map.md`, `presentation-format-graduation-thesis.md`, `thesis-report/citation-pipeline.md`, `thesis-report/references.bib` và các file trong `research-survey/`.

Yêu cầu:

1. Kiểm tra nhanh Phase 2A: citation pipeline đang dùng `biblatex`/IEEE/BibTeX backend và LaTeX build không gãy.
2. Tạo source matrix cho Chương 1 và Chương 2 với: citation key, loại nguồn, ngôn ngữ, độ tin cậy, mục dùng, claim hỗ trợ, link/DOI, trạng thái.
3. Ưu tiên nguồn chuẩn/chính thức: NIST, ISO/IEC, SEI/CMU, RFC, OWASP, Apache Kafka docs, cloud architecture docs, Google SRE, paper/sách uy tín, báo cáo thị trường đáng tin cậy.
4. Không dùng blog phổ thông làm nguồn chính nếu có nguồn tốt hơn.
5. Không viết Chương 1 hoặc Chương 2 dài trong phase này.
6. Build LaTeX sau khi cập nhật citation/reference.

Verification:

```bash
cd docs/graduation-thesis-resources/thesis-report
tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex
```
````

Cuối session, cập nhật `thesis-workflow-plan.md` để Phase tiếp theo là Phase 3A.

````

## 4. Prompt Phase 3A: Audit source/docs cho Chương 3

```md
Tiếp tục Phase 3A: Audit source/docs cho Chương 3 - Phân tích yêu cầu.

Mục tiêu duy nhất là tạo requirement evidence matrix cho Chương 3, chưa viết nội dung chương dài.

Đọc workflow plan trước, sau đó đọc tối thiểu: `thesis-official-outline.md`, `thesis-evidence-map.md`, `docs/business-logic.md`, `docs/architecture/permission-matrix.md`, `docs/testing/phase-5/traceability-matrix.md`, và các specs/phase docs liên quan nếu cần.

Output mong muốn:
- Một section hoặc file audit ngắn cho Chương 3, ví dụ `docs/graduation-thesis-resources/chapter-03-requirement-evidence.md`.
- Ma trận actor/use case/domain requirement/NFR/evidence/source/status.
- Danh sách điểm cần kiểm chứng trước khi viết Chương 3.
- Gợi ý bảng/diagram P0 cho Chương 3 dựa trên `thesis-artifact-backlog.md`.

Không làm:
- Không draft Chương 3 vào LaTeX.
- Không thêm claim implementation nếu chưa có source.
- Không sửa architecture hoặc code.

Cuối session, cập nhật `thesis-workflow-plan.md`; next step là Phase 3B.
````

## 5. Prompt Phase 3B: Draft Chương 3

```md
Tiếp tục Phase 3B: Draft Chương 3 - Phân tích yêu cầu.

Mục tiêu duy nhất là viết bản nháp Chương 3 vào `thesis-report/chapters/03-phan-tich-yeu-cau.tex` dựa trên audit Phase 3A và outline.

Đọc workflow plan, official outline, evidence map, Chương 3 evidence matrix/audit, `docs/business-logic.md`, permission matrix và traceability matrix nếu cần.

Yêu cầu:

- Viết bằng tiếng Việt học thuật, rõ ràng.
- Tập trung phân tích yêu cầu, actor, functional requirements, NFR, state machines, phạm vi/giới hạn đánh giá.
- Không biến Chương 3 thành implementation walkthrough.
- Nếu thiếu bằng chứng, ghi chú nội bộ hoặc để TODO có kiểm soát trong tài liệu audit, không đưa TODO thô vào bản khóa luận.
- Chưa cần hoàn thiện mọi bảng/diagram nếu artifact chưa được tạo, nhưng phải để placeholder LaTeX an toàn nếu cần.

Verification: build LaTeX từ `thesis-report/` và kiểm tra không lỗi.

Cuối session, cập nhật workflow plan; next step là Phase 4A.
```

## 6. Prompt Phase 4A: Audit architecture evidence cho Chương 4

```md
Tiếp tục Phase 4A: Audit architecture evidence cho Chương 4.

Mục tiêu duy nhất là chốt claim/evidence kiến trúc và diagram plan P0 cho Chương 4, chưa viết Chương 4 dài.

Đọc workflow plan, official outline, evidence map, `docs/technical-architecture.md`, `docs/DOC-CODE-ANCHORS.md`, `docs/README.md`, source tree `apps/` và `libs/` ở mức cần thiết.

Output mong muốn:

- Architecture claim/evidence matrix.
- Service ownership/data ownership draft table.
- Communication matrix draft.
- Kafka topic registry draft, không invent topic.
- Diagram plan P0 cho Chương 4.
- Danh sách rủi ro overclaim về scalability/deployment/observability.

Không làm:

- Không draft Chương 4 dài.
- Không tạo toàn bộ diagram nếu chưa đủ evidence.
- Không claim production-grade observability/deployment.

Cuối session, cập nhật workflow plan; next step là Phase 4B.
```

## 7. Prompt Phase 4B: Tạo diagram P0 cho Chương 4

```md
Tiếp tục Phase 4B: Tạo diagram P0 cho Chương 4.

Mục tiêu duy nhất là tạo các diagram/table source P0 cho Chương 4 dựa trên audit Phase 4A và `thesis-artifact-backlog.md`.

Ưu tiên artifact:

- Overall architecture.
- C4/container diagram.
- Service ownership/data ownership.
- Communication matrix.
- Multi-tenancy isolation.
- Kafka decision flow.

Yêu cầu:

- Dùng Mermaid làm default nếu diễn đạt được; chỉ dùng PlantUML/draw.io/LaTeX-native khi Mermaid không phù hợp.
- Lưu source diagram vào `thesis-report/assets/diagrams/`.
- Render source sang PDF/PNG trong `thesis-report/assets/figures/` trước khi chèn vào LaTeX; LaTeX không tự hiểu Mermaid source.
- Nếu renderer Mermaid có sẵn (`mmdc`, `npx @mermaid-js/mermaid-cli` hoặc tool tương đương), agent được phép render trực tiếp nhưng không commit tool cache/dependency ngoài chủ đích.
- Nếu renderer không chạy, chỉ giữ source `.mmd`, ghi command render thủ công và không đánh dấu artifact là `inserted`/`verified`.
- Chèn artifact đã render vào LaTeX với caption/source/label, sau đó cập nhật `thesis-artifact-backlog.md` đúng trạng thái thật.

Verification: nếu có chèn artifact vào LaTeX, build PDF và kiểm tra `.lof`/`.lot`; nếu chỉ tạo source diagram, kiểm tra syntax/render theo công cụ phù hợp.

Cuối session, cập nhật workflow plan; next step là Phase 4C.
```

## 8. Prompt Phase 4C: Draft Chương 4

```md
Tiếp tục Phase 4C: Draft Chương 4 - Thiết kế và kiến trúc hệ thống.

Mục tiêu duy nhất là viết bản nháp Chương 4 vào `thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex` dựa trên audit Phase 4A và diagram Phase 4B.

Yêu cầu:

- Giải thích quyết định kiến trúc theo lý do/trade-off, không chỉ mô tả tồn tại.
- Trình bày microservices có chọn lọc sync/async: TCP/gRPC cho command/query cần phản hồi, Kafka cho domain event/side effect bất đồng bộ.
- WebSocket là realtime hint/refetch, không phải source of truth.
- Không overclaim scalability/deployment/observability.
- Gắn caption/source cho artifact nếu chèn vào LaTeX.

Verification: build LaTeX từ `thesis-report/`.

Cuối session, cập nhật workflow plan; next step là Phase 4D.
```

## 9. Prompt Phase 4D: Artifact coverage bổ sung cho Chương 3

````md
Tiếp tục Phase 4D: Artifact coverage bổ sung cho Chương 3 - Phân tích yêu cầu.

Bối cảnh: Phase 3B đã viết bản nháp Chương 3 và có các bảng yêu cầu; Phase 4C đã hoàn tất Chương 4. Tuy nhiên Chương 3 còn thiếu hai diagram P0 trong artifact backlog.

Mục tiêu duy nhất của session này là tạo/render/chèn Hình 3.1 actor/use-case overview và Hình 3.2 business flow vào Chương 3, cập nhật backlog và build verify.

Đọc workflow plan trước, sau đó đọc tối thiểu: `thesis-artifact-backlog.md`, `chapter-03-requirement-evidence.md`, `thesis-report/chapters/03-phan-tich-yeu-cau.tex`, `docs/business-logic.md`, `docs/architecture/permission-matrix.md` và traceability matrix nếu cần.

Output mong muốn:

- Source Mermaid trong `thesis-report/assets/diagrams/`:
  - `chapter3-actor-use-case-overview.mmd`
  - `chapter3-business-flow.mmd`
- File render PDF/PNG tương ứng trong `thesis-report/assets/figures/`.
- Hình 3.1 và Hình 3.2 được chèn vào Chương 3 bằng `\includegraphics`, có caption/source/label.
- Prose dẫn nhập tối thiểu quanh hai hình, đủ để nối với phần yêu cầu hiện có.
- `thesis-artifact-backlog.md` cập nhật trạng thái thật cho Hình 3.1/Hình 3.2 và Bảng 3.1-3.4.

Yêu cầu:

- Dùng Mermaid CLI nếu môi trường có `mmdc` hoặc `npx @mermaid-js/mermaid-cli`; nếu renderer không chạy, chỉ để lại source `.mmd` và không đánh dấu `inserted`/`verified`.
- Hình 3.1 phải ở mức actor/use-case, tách Customer session actor khỏi RBAC staff/admin roles.
- Hình 3.2 phải ở mức business flow: QR -> session/cart -> submit order -> staff confirm -> KDS -> bill/payment -> table cleaning.
- Không thêm Notification/email/offline queue hoặc state chưa có evidence.
- Không rewrite toàn bộ Chương 3.
- Không dùng sequence diagram chi tiết giữa service cho Chương 3; sequence/runtime diagram để Chương 5.
- Không bắt đầu audit/draft Chương 5 trong phase này.

Verification:

```bash
cd docs/graduation-thesis-resources/thesis-report
tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex
```

Sau build, kiểm tra `.lof`, `.lot` và nếu có thể preview trang PDF chứa Hình 3.1/Hình 3.2 để đảm bảo hình không bị trắng, caption/source/số hiệu đúng.

Cuối session, cập nhật workflow plan; next step là Phase 5A.
````

## 10. Prompt Phase 5A: Audit implementation evidence cho Chương 5

```md
Tiếp tục Phase 5A: Audit implementation evidence cho Chương 5.

Mục tiêu duy nhất là tạo implemented evidence table, runtime flow evidence, sequence diagram plan và screenshot/demo artifact plan cho Chương 5, chưa viết chương dài.

Đọc workflow plan, evidence map, official outline, `docs/DOC-CODE-ANCHORS.md`, `docs/business-logic.md`, `docs/technical-architecture.md`, `docs/testing/phase-5/saga-validation-strategy.md`, source code liên quan trong `apps/` và `libs/`.

Output mong muốn:

- Implemented evidence table: feature/flow -> source path -> docs/tests -> artifact/screenshot cần có.
- Flow evidence cho QR session/cart/order, Order Confirm Saga/stock consistency, KDS, payment settlement và SaaS Onboarding Mini-Saga.
- Sequence diagram plan P0:
  - Hình 5.1 QR ordering sequence.
  - Hình 5.2 Order confirm và stock consistency sequence.
  - Hình 5.3 KDS ticket lifecycle sequence.
  - Hình 5.4 Payment settlement sequence.
  - Hình 5.5 SaaS onboarding sequence.
- Sequence/runtime diagram P1 nếu đủ evidence: shared cart mutation/version/idempotency, table transfer/safe release, subscription checkout, tenant suspend/activate behavior.
- Danh sách screenshot đại diện cần scaffold/capture thủ công cho Chương 5.
- Quy tắc chọn artifact Chương 5: dùng sequence diagram cho runtime interaction, table cho evidence/coverage, screenshot cho UI/demo thật; không lặp lại architecture diagram của Chương 4.
- Danh sách nội dung không đủ evidence hoặc chỉ được viết như thiết kế/hướng phát triển.

Không làm:

- Không draft Chương 5 dài.
- Không chạy/chụp UI trong Phase 5A; Phase 5D sẽ dựng scaffold và người viết thay screenshot thật thủ công.
- Không invent endpoint/table/topic.

Cuối session, cập nhật workflow plan; next step là Phase 5B.
```

## 11. Prompt Phase 5B: Tạo diagram P0 cho Chương 5

````md
Tiếp tục Phase 5B: Tạo diagram P0 cho Chương 5 — 5 sequence diagram Mermaid.

Mục tiêu duy nhất là tạo Mermaid source cho 5 sequence diagram P0 (Hình 5.1–5.5), render PDF, chèn vào LaTeX và build verify. **Không viết prose Chương 5 dài trong phase này.**

Đọc workflow plan, `thesis-phase5a-evidence-audit.md` (toàn bộ §2 kế hoạch diagram), `thesis-artifact-backlog.md` và `thesis-official-outline.md` trước khi vẽ.

Diễn giải từng diagram:

- **Hình 5.1**: QR ordering & session flow (Customer, BFF, Order, Catalog, Redis).
- **Hình 5.2**: Order Confirm Saga & stock consistency (Staff, BFF, Order, Catalog, PG Order DB, PG Catalog DB, Outbox, Kafka), có nhánh compensation release stock ở mức đại diện.
- **Hình 5.3**: KDS ticket lifecycle (Kafka, Kitchen, Redis Sorted Set, WebSocket, KDS UI, Chef, Order).
- **Hình 5.4**: Payment settlement — cả 2 nhánh cash và VietQR/SePay.
- **Hình 5.5**: SaaS Onboarding Mini-Saga với compensation (Super Admin, SaaS, Authorizer, User-Access, Payment, Outbox).

Yêu cầu:

- Dùng Mermaid `sequenceDiagram` cho tất cả 5 hình.
- Lưu source vào `thesis-report/assets/diagrams/chapter5-*.mmd`.
- Render sang PDF bằng `mmdc --pdfFit` hoặc `npx @mermaid-js/mermaid-cli`; lưu vào `thesis-report/assets/figures/`.
- Nếu renderer không chạy, chỉ để lại source `.mmd`, ghi command render thủ công và không đánh dấu `inserted`/`verified`.
- Chèn vào `thesis-report/chapters/05-trien-khai-he-thong.tex` bằng `\includegraphics` với caption/source/label; placeholder prose tối thiểu đủ để LaTeX build không gãy.
- Cập nhật `thesis-artifact-backlog.md` đúng trạng thái thật (`drafted` / `inserted` / `verified`).
- Service names: Authorizer, User-Access, SaaS, Catalog, Order, Kitchen, Payment — không ghi `Auth Service`, không thêm `Notification Service`.
- Kafka chỉ dùng 5 topic approved; WebSocket là hint/refetch.
- Không lặp lại architecture diagram của Chương 4; sequence diagram Chương 5 là runtime/interaction flow.

Verification:

```bash
cd docs/graduation-thesis-resources/thesis-report
tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex
```
````

Sau build, kiểm tra `.lof` chứa Hình 5.1–5.5; preview PNG trang chứa hình để đảm bảo không bị trắng, caption/source/số hiệu đúng.

Cuối session, cập nhật workflow plan; next step là Phase 5C (draft prose Chương 5).

````

## 12. Prompt Phase 5C: Draft Chương 5

```md
Tiếp tục Phase 5C: Draft Chương 5 - Triển khai hệ thống.

Mục tiêu duy nhất là viết bản nháp Chương 5 vào `thesis-report/chapters/05-trien-khai-he-thong.tex` dựa trên audit Phase 5A và diagram Phase 5B. **Không tạo diagram mới trong phase này.**

Yêu cầu:

- Chứng minh hệ thống được hiện thực hóa bằng code/docs/tests/evidence (không chỉ mô tả cấu trúc).
- Khi viết Saga, dùng `docs/testing/phase-5/saga-validation-strategy.md`: chỉ claim hai luồng đại diện Order Confirm Saga và SaaS Onboarding Mini-Saga, không claim durable saga state/CDC/exactly-once/full hardening.
- Không biến Chương 5 thành README hoặc user manual.
- Chỉ đưa implementation detail khi phục vụ claim kỹ thuật.
- Giữ nguyên Hình 5.1–5.5 đã chèn từ Phase 5B; chỉ bổ sung prose giải thích và bảng evidence.
- Screenshot chỉ dùng đại diện; UI gallery đầy đủ hoặc placeholder scaffold để phụ lục/Phase 5D xử lý.
- Không claim phần chưa có evidence là đã kiểm chứng.
- Ghi đúng caption/source cho artifact nếu chèn vào LaTeX.

Verification: build LaTeX từ `thesis-report/`.

Cuối session, cập nhật workflow plan; next step là Phase 5D screenshot/demo scaffold.
````

## 13. Prompt Phase 5D: Screenshot/demo scaffold

````md
Tiếp tục Phase 5D: Screenshot/demo scaffold và manual capture handoff.

Mục tiêu duy nhất là dựng khung screenshot/demo artifact cho Chương 5 và Phụ lục A: xác định ảnh cần có từ tài liệu dự án/source code, tạo mapping/ref/caption, tạo file ảnh placeholder trắng đúng tên/vị trí, chèn khung vào LaTeX và build verify. Không chụp UI tự động trong phase này.

Đọc workflow plan trước, sau đó đọc tối thiểu: `thesis-artifact-backlog.md` §5, `thesis-phase5a-evidence-audit.md` §4, `docs/testing/phase-5/saga-validation-strategy.md`, `thesis-report/chapters/05-trien-khai-he-thong.tex`, `thesis-report/appendices/a-ui-gallery.tex`, `docs/business-logic.md` và source path cần thiết để hiểu màn hình tương ứng.

Output mong muốn:

- `docs/graduation-thesis-resources/thesis-phase5d-screenshot-scaffold.md` với mapping: artifact ID, filename, LaTeX label, vị trí chèn, caption dự kiến, flow liên quan và ghi chú thay ảnh thủ công.
- Checklist Phụ lục D cho bằng chứng Saga: output test, snapshot DB/outbox và log rút gọn. Không cần tạo artifact thật nếu phase chỉ dựng scaffold.
- File placeholder trắng trong `thesis-report/assets/screenshots/`, tên ổn định theo mẫu `chapter5-01-customer-qr-session.png`.
- Khung `figure`/refs trong Chương 5 hoặc Phụ lục A, dùng `\includegraphics`, `\caption{...}` và `\label{...}`.
- `thesis-artifact-backlog.md` cập nhật trạng thái `placeholder` cho ảnh đã có file placeholder và đã chèn khung.

Yêu cầu:

- Không dùng Browser, không mở local app, không yêu cầu demo data chạy ổn.
- Placeholder trắng không phải screenshot thật; không đánh dấu `captured` hoặc `verified`.
- Caption/đoạn dẫn trong bản nháp phải tránh làm người đọc hiểu nhầm ảnh trắng là evidence thật. Ghi rõ đây là placeholder bản nháp cần thay bằng screenshot demo thật trước khi nộp.
- Chỉ chọn screenshot phục vụ flow chính: Customer PWA, Staff POS, KDS, Owner dashboard, Super Admin.
- Với Saga, ưu tiên Ảnh 5.6 staff confirm, Ảnh 5.7 KDS queue sau `order.confirmed`, Ảnh 5.11 payment/subscription và Ảnh 5.12 tenant onboarding. Compensation không được chứng minh bằng screenshot UI, mà bằng test/log/DB evidence.
- Không tạo screenshot observability/deployment giả.
- Không sửa nội dung prose dài của Chương 5 ngoài các câu nối cần thiết cho refs.
- Không thay đổi Hình 5.1-Hình 5.5 hoặc Bảng 5.1-Bảng 5.2 đã verify.

Verification:

```bash
cd docs/graduation-thesis-resources/thesis-report
tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex
```
````

Sau build, kiểm tra `.lof` và PDF text để xác nhận label/caption/placeholder không gãy. Không cần kiểm tra UI bằng Browser.

Cuối session, cập nhật workflow plan; next step là Phase 6A.

````

## 14. Prompt Phase 6A: Build evaluation tables/claim policy

```md
Tiếp tục Phase 6A: Build evaluation tables/claim policy.

Mục tiêu duy nhất là chuẩn bị bảng/ma trận đánh giá cho Chương 6, chưa viết Chương 6 dài.

Đọc workflow plan, evidence map, traceability matrix, phase-5 handoff, `docs/testing/phase-5/saga-validation-strategy.md`, tests/docs cần thiết.

Output mong muốn:

- Requirement traceability summary.
- Architecture/NFR evidence status.
- Saga validation summary cho Order Confirm Saga và SaaS Onboarding Mini-Saga.
- Evaluation claim policy table.
- Limitation vs future work table.
- Danh sách claim được phép/không được phép viết.

Không làm:

- Không tạo benchmark số nếu chưa chạy thật.
- Không claim scalability đã được chứng minh bằng load test.
- Không claim production-grade observability/deployment.

Cuối session, cập nhật workflow plan; next step là Phase 6B.
````

## 15. Prompt Phase 6B: Draft Chương 6

```md
Tiếp tục Phase 6B: Draft Chương 6 - Đánh giá.

Mục tiêu duy nhất là viết bản nháp Chương 6 vào `thesis-report/chapters/06-danh-gia.tex` dựa trên Phase 6A.

Yêu cầu:

- Đánh giá functional validation, architecture validation và NFR bằng evidence phù hợp.
- Đánh giá Saga bằng nhiều lớp evidence: unit/contract, integration opt-in, fault injection ở service layer, UI happy path và DB/outbox evidence; không gọi là full production-grade Saga hardening.
- Performance/scalability/maintainability/observability phải diễn đạt trung thực.
- Với scalability: viết “hỗ trợ ở mức thiết kế/kiến trúc”, không viết “đã chứng minh dưới tải lớn” nếu chưa benchmark.
- Với maintainability: dùng service ownership, shared contracts, Nx, scenario analysis.
- Với observability/deployment: chỉ claim demo-limited nếu có artifact thật.

Verification: build LaTeX.

Cuối session, cập nhật workflow plan; next step là Phase 7A.
```

## 16. Prompt Phase 7A: Draft Chương 2

```md
Tiếp tục Phase 7A: Draft Chương 2 - Cơ sở lý thuyết và công trình liên quan.

Mục tiêu duy nhất là viết bản nháp Chương 2 vào `thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex` dựa trên `thesis-source-backbone.md`.

Yêu cầu:

- Dùng citation thật từ `references.bib`.
- Phân biệt nguồn học thuật/chính thống với nguồn thị trường/sản phẩm.
- Không dùng QRTable docs để định nghĩa khái niệm phổ quát.
- Không viết lan sang implementation của Chương 4/5, chỉ liên hệ vừa đủ.

Verification: build LaTeX, kiểm tra citation/bibliography render.

Cuối session, cập nhật workflow plan; next step là Phase 7B.
```

## 17. Prompt Phase 7B: Draft Chương 1

```md
Tiếp tục Phase 7B: Draft Chương 1 - Mở đầu.

Mục tiêu duy nhất là viết bản nháp Chương 1 vào `thesis-report/chapters/01-mo-dau.tex`.

Yêu cầu:

- Dựa trên source backbone, proposal định hướng, research survey đã kiểm chứng và kết quả Chương 3-6.
- Nêu bối cảnh, lý do chọn đề tài, bài toán, mục tiêu, phạm vi, phương pháp, đóng góp và cấu trúc khóa luận.
- Nếu nêu đóng góp về Saga, diễn đạt là áp dụng Saga đại diện cho hai luồng nghiệp vụ, không viết như toàn bộ hệ thống đã có distributed transaction framework hoàn chỉnh.
- Không viết như quảng cáo sản phẩm.
- Không overclaim kết quả chưa đánh giá.

Verification: build LaTeX.

Cuối session, cập nhật workflow plan; next step là Phase 7C.
```

## 18. Prompt Phase 7C: Draft Chương 7, Abstract và phụ lục

```md
Tiếp tục Phase 7C: Draft Chương 7, Abstract và phụ lục nền.

Mục tiêu là viết phần kết luận/hướng phát triển, tóm tắt khóa luận và cập nhật phụ lục cần thiết ở mức bản nháp.

Yêu cầu:

- Chương 7 ngắn gọn, không thêm bàn luận lan man.
- Abstract/Tóm tắt dài khoảng 1-2 trang, viết sau khi đã có nội dung Chương 1-6.
- Phụ lục chỉ chứa artifact hỗ trợ, không làm loãng chương chính.
- Hạn chế/hướng phát triển phải trung thực với evidence.

Verification: build LaTeX.

Cuối session, cập nhật workflow plan; next step là Phase 8A.
```

## 19. Prompt Phase 8A: Build/format/citation audit

```md
Tiếp tục Phase 8A: Build/format/citation audit.

Mục tiêu duy nhất là kiểm tra kỹ thuật bản LaTeX/PDF.

Yêu cầu:

- Build PDF sạch.
- Kiểm tra format theo `presentation-format-graduation-thesis.md`.
- Kiểm tra mục lục, danh mục hình, danh mục bảng, danh mục từ viết tắt.
- Kiểm tra citation/bibliography, tách nguồn tiếng Việt/tiếng Anh, caption/source hình bảng.
- Kiểm tra không commit build artifacts ngoài chủ đích.

Không rewrite nội dung lớn trong phase này; chỉ sửa lỗi format/citation nhỏ.

Cuối session, cập nhật workflow plan; next step là Phase 8B.
```

## 20. Prompt Phase 8B: Reader/reviewer/overclaim audit

```md
Tiếp tục Phase 8B: Reader/reviewer/overclaim audit.

Mục tiêu duy nhất là đọc khóa luận như hội đồng phản biện và tìm vấn đề về mạch lập luận, overclaim, thiếu nguồn, thiếu evidence hoặc chỗ dễ bị hỏi.

Yêu cầu:

- Findings ưu tiên theo mức độ nghiêm trọng.
- Chỉ rõ chương/mục/file nếu có thể.
- Tách: overclaim, thiếu citation, thiếu evidence, mạch lập luận yếu, format/presentation issue.
- Đề xuất patch nhỏ hoặc danh sách việc sửa, không đại tu nếu chưa cần.

Cuối session, cập nhật workflow plan với danh sách việc còn lại.
```
