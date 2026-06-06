# Plan - Draft Chương 1 Mở đầu QRTable

> **For agentic workers:** REQUIRED SUB-SKILL: dùng `zoom-out` để đặt Chương 1 trong toàn mạch khóa luận, dùng `grill-with-docs` để kiểm tra claim/phạm vi/citation, và dùng `doc-coauthoring` nếu cần tinh chỉnh cấu trúc văn bản. Steps dùng checkbox (`- [ ]`) để tracking.

**Goal:** Viết Chương 1 hoàn chỉnh bằng tiếng Việt học thuật, trong đó mục `Đối tượng và phạm vi nghiên cứu` trở thành điểm neo chính thức cho phạm vi đề tài, giúp các chương sau không phải lặp các câu giới hạn rải rác.

**Architecture:** Chương 1 không đi sâu implementation. Chương này nối bối cảnh F&B, POS, QR ordering, SaaS, VietQR/SePay và microservices thành bài toán khóa luận; sau đó chốt mục tiêu, phạm vi, phương pháp và đóng góp. Phase 7 deployment được xem là bước chắc chắn sẽ triển khai và thu artifact sau đó; Chương 1 chỉ không viết như đã hoàn tất trước khi artifact thật được bổ sung. Nội dung phải đủ mạnh để mở khóa luận, nhưng không claim production-ready, benchmark, high availability hoặc superior product nếu chưa có bằng chứng.

**Tech Stack / Writing Stack:** LaTeX, `biblatex`/IEEE, XeLaTeX, tài liệu nguồn trong `docs/graduation-thesis-resources/`, citation thật trong `thesis-report/references.bib`.

---

## 1. Lý do thực hiện ngay

Chương 1 hiện mới có skeleton section, trong khi các chương sau đã có nhiều chỗ tự giới hạn phạm vi để tránh overclaim. Điều này làm mạch khóa luận bị lệch: phần mở đầu chưa xác lập phạm vi, còn Chương 3 và Chương 5 lại phải tự phòng thủ bằng nhiều câu như "không thuộc phạm vi", "chưa khẳng định", "giới hạn của luồng".

Vì vậy Chương 1 nên được viết trước khi refactor Chương 3/5/7. Sau khi Chương 1 có mục phạm vi rõ, các chương kỹ thuật có thể tập trung vào phân tích, thiết kế, triển khai và đánh giá thay vì lặp lại danh sách loại trừ.

## 2. Files

**Modify chính:**

- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`

**Modify bắt buộc cuối session:**

- `docs/graduation-thesis-resources/thesis-workflow-plan.md`

**Read-only context bắt buộc:**

- `AGENTS.md`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`
- `docs/graduation-thesis-resources/thesis-official-outline.md`
- `docs/graduation-thesis-resources/thesis-source-backbone.md`
- `docs/graduation-thesis-resources/thesis-evidence-map.md`
- `docs/graduation-thesis-resources/thesis-report/references.bib`
- `docs/graduation-thesis-resources/thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`

**Optional, chỉ sửa nếu thật sự cần artifact mới:**

- `docs/graduation-thesis-resources/thesis-artifact-backlog.md`
- `docs/graduation-thesis-resources/thesis-report/references.bib`

Không sửa `references.bib` nếu chỉ dùng các nguồn đã có. Nếu cần nguồn mới, phải kiểm chứng URL/DOI/metadata bằng nguồn chính thức hoặc web trước khi thêm.

## 3. Preflight bắt buộc

- [ ] Chạy CodeGraph trước khi đọc/sửa sâu:

```bash
/Users/vodinhquan/.local/bin/codegraph status .
```

Expected: index up-to-date. Nếu CodeGraph không phủ `.tex/.md`, ghi nhận ngắn trong workflow plan và tiếp tục bằng `rg`/đọc file trực tiếp.

- [ ] Đọc workflow và outline:

```bash
sed -n '1,220p' docs/graduation-thesis-resources/thesis-official-outline.md
sed -n '1,280p' docs/graduation-thesis-resources/thesis-source-backbone.md
sed -n '580,680p' docs/graduation-thesis-resources/thesis-workflow-plan.md
```

Expected: nắm đúng vai trò Chương 1, page budget 8-10 trang, citation source matrix và policy không overclaim.

- [ ] Inventory citation keys dùng cho Chương 1:

```bash
rg -n "ipos-nestle-fnb-report-2025|baochinhphu-fnb-growth-2025|napas-fastfund-vietqr|kiotviet-qr-order-doc|sapo-fnb-restaurant-pos|ipos-o2o-qr-order" docs/graduation-thesis-resources/thesis-report/references.bib
```

Expected: toàn bộ keys đã tồn tại trong `references.bib`. Nếu thiếu key, không tự tạo citation đoán; kiểm chứng nguồn trước.

- [ ] Đọc Chương 2-7 để không lặp hoặc mâu thuẫn:

```bash
rg -n "\\\\chapter|\\\\section|\\\\subsection|production|benchmark|SePay|Saga|tenant|Dashboard|giới hạn|phạm vi" docs/graduation-thesis-resources/thesis-report/chapters
```

Expected: nhận diện các điểm Chương 1 cần neo: scope, objectives, evidence levels, limitations/future work.

## 4. Chính sách giọng văn

Chương 1 cần viết như một phần mở đầu học thuật, không phải nhật ký triển khai.

Hard constraints mới từ người viết:

- Phase 7 deployment là chắc chắn sẽ triển khai; trong kế hoạch viết không diễn đạt deployment/pilot như một khả năng tùy chọn.
- Technical Phase 6/observability không đưa vào nội dung khóa luận, kể cả dưới dạng mục riêng, mục ngoài phạm vi hoặc hướng phát triển.

Giữ:

- `POS`, `SaaS`, `microservices`, `service boundary`, `event-driven`, `Kafka`, `Redis`, `WebSocket`, `Keycloak`, `SePay`, `VietQR`, `BFF`, `KDS`, `idempotency`, `tenant isolation`, `RBAC`.
- Cách diễn đạt: "trong phạm vi đề tài", "kết quả chính của khóa luận", "hướng phát triển", "mức kiểm chứng", "bằng chứng triển khai".

Tránh:

- "hiện tại chỉ", "chưa làm", "chưa có", "deferred", "implementation-gap", "Phase", "production-ready", "stress test", "đã sẵn sàng vận hành thực tế".
- Các câu khiến người đọc cảm giác đề tài tự hạ thấp trước khi trình bày đóng góp.
- Claim thương mại kiểu QRTable tốt hơn iPOS/KiotViet/Sapo nếu không có benchmark hoặc khảo sát người dùng.

## 5. Cấu trúc Chương 1 cần viết

### 1.1. Bối cảnh chuyển đổi số trong lĩnh vực F&B

Mục tiêu: đặt vấn đề từ ngành F&B và nhu cầu số hóa vận hành.

Nội dung cần có:

- 1 đoạn mở về đặc thù F&B: tốc độ phục vụ, biến động nhu cầu, đồng bộ giữa bàn, nhân viên, bếp và thanh toán.
- 1-2 đoạn về vai trò POS trong việc nối order, thanh toán, báo cáo và quản trị vận hành.
- 1 đoạn về QR ordering và thanh toán QR/VietQR trong bối cảnh Việt Nam.
- 1 đoạn chuyển sang nhu cầu SaaS: triển khai nhanh, nhiều tenant, quản lý gói thuê bao, nhưng cần tenant isolation và kiểm soát quyền.

Citation gợi ý:

- `ipos-nestle-fnb-report-2025`
- `baochinhphu-fnb-growth-2025`
- `napas-fastfund-vietqr`

Không dùng phần này để nói microservices là bắt buộc cho toàn ngành. Chỉ nói đây là một hướng tiếp cận phù hợp với bài toán QRTable.

### 1.2. Lý do chọn đề tài

Mục tiêu: giải thích vì sao đề tài có ý nghĩa phần mềm và phù hợp khóa luận.

Nội dung cần có:

- POS truyền thống và quy trình gọi món thủ công dễ phát sinh độ trễ, sai sót truyền thông tin và thiếu đồng bộ trạng thái.
- QR ordering có giá trị nhưng nếu tách rời POS/KDS/payment thì không giải quyết trọn vòng đời phục vụ.
- SaaS POS cho F&B đòi hỏi quản lý tenant, gói thuê bao, phân quyền, dữ liệu vận hành và thanh toán trong một hệ thống thống nhất.
- Microservices được chọn để phân tách ownership giữa Catalog, Order, Kitchen, Payment, SaaS, User-Access và Authorizer; không dùng như claim hiệu năng.

Citation gợi ý:

- `kiotviet-qr-order-doc`
- `sapo-fnb-restaurant-pos`
- `ipos-o2o-qr-order`

### 1.3. Phát biểu bài toán

Mục tiêu: biến bối cảnh thành bài toán rõ ràng.

Nội dung lõi:

- Xây dựng nền tảng SaaS POS cho F&B.
- Hỗ trợ khách quét QR tại bàn, xem thực đơn, tạo giỏ chung, gửi đơn và theo dõi trạng thái.
- Hỗ trợ staff/manager xác nhận đơn, điều phối bếp, quyết toán thanh toán và quản trị tenant.
- Hỗ trợ platform admin quản lý tenant, gói thuê bao và phân tích nền tảng ở mức phù hợp.
- Thiết kế theo service boundary, event-driven có chọn lọc và data ownership để giảm coupling.

Artifact khuyến nghị: Bảng 1.1 "Tóm tắt vấn đề và hướng giải quyết của QRTable".

Nếu thêm bảng, dùng cấu trúc:

| Nhóm vấn đề             | Biểu hiện trong vận hành F&B                         | Hướng giải quyết trong QRTable                                   |
| ----------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| Gọi món tại bàn         | Khách phụ thuộc nhân viên, dễ trễ trong giờ cao điểm | QR session, menu theo tenant, giỏ chung, order lifecycle         |
| Điều phối bếp           | Thông tin từ order sang bếp dễ đứt đoạn              | KDS, phiếu bếp, trạng thái dòng món, realtime hint               |
| Thanh toán              | Đối soát tiền mặt/QR cần idempotency                 | Bill/payment lifecycle, VietQR/SePay webhook, duplicate handling |
| Quản trị nhiều nhà hàng | Dữ liệu nhiều tenant dễ trộn nếu không kiểm soát     | Tenant isolation, RBAC, plan entitlement                         |

### 1.4. Mục tiêu nghiên cứu và mục tiêu xây dựng hệ thống

Tách rõ ba nhóm mục tiêu:

1. Mục tiêu nghiên cứu:
   - Tổng hợp cơ sở lý thuyết về POS F&B, QR ordering, SaaS/multi-tenancy, microservices, event-driven, consistency/idempotency và security.
   - Phân tích cách các khái niệm đó áp dụng vào một hệ thống SaaS POS trong bối cảnh Việt Nam.

2. Mục tiêu xây dựng:
   - Hiện thực các luồng cốt lõi: tenant onboarding, catalog/table/QR, customer session/cart/order, staff confirmation, KDS, payment, dashboard/reporting MVP và quản trị gói thuê bao.
   - Thiết kế backend/frontend trong Nx monorepo với ranh giới service rõ.

3. Mục tiêu đánh giá:
   - Kiểm chứng traceability giữa yêu cầu, thiết kế, implementation, test/demo evidence.
   - Đánh giá tenant isolation, RBAC, idempotency, service ownership, consistency, Saga đại diện và khả năng mở rộng ở mức kiến trúc.
   - Phân biệt claim đã kiểm chứng tự động, claim được hỗ trợ bởi thiết kế, claim deployment/pilot sẽ được bổ sung bằng artifact Phase 7 và hướng phát triển cần thêm evidence.

### 1.5. Đối tượng và phạm vi nghiên cứu

Đây là mục neo quan trọng nhất của lượt viết.

Đối tượng nghiên cứu:

- Nền tảng SaaS POS cho nhà hàng/quán F&B.
- Quy trình đặt món qua QR tại bàn kết hợp POS, KDS và payment.
- Kiến trúc microservices/event-driven có chọn lọc cho hệ thống nhiều tenant.

Phạm vi trong khóa luận:

- Tenant lifecycle, plan/subscription, quota/entitlement ở mức phục vụ SaaS POS.
- Catalog/menu/category/table/area/QR token.
- Customer session, cart, order lifecycle.
- Staff/owner/manager/admin access theo RBAC và tenant isolation.
- Kitchen Display System và trạng thái phiếu bếp/dòng món.
- Payment bằng cash, VietQR/SePay webhook, idempotency và đối soát cơ bản.
- Dashboard/reporting MVP cho tenant và platform admin.
- Hai Saga đại diện: Order Confirm Saga và SaaS Onboarding Mini-Saga.
- Đánh giá bằng mã nguồn, tests, diagrams, traceability, build, demo/screenshot và production/pilot artifacts sau Phase 7.

Ngoài phạm vi kết quả chính:

- Benchmark tải lớn, p95/p99 latency, throughput, stress/load test so sánh với monolith.
- Production-grade high availability hoặc chaos engineering vận hành thật.
- Native mobile app cho iOS/Android.
- BI/AI analytics nâng cao, OLAP/data warehouse, dự báo, anomaly detection.
- CRM/loyalty, HRM/payroll/shift scheduling/time attendance.
- Inventory/BOM nâng cao, thuế/kế toán, tích hợp kế toán bên thứ ba.
- Full offline write queue, background sync và conflict resolver cho mọi thao tác.
- Email/SMS/push notification đầy đủ.
- Nhiều ngân hàng thanh toán đồng thời, refund/partial refund phức tạp.
- Tích hợp sâu với nền tảng giao đồ ăn bên thứ ba.
- Chứng nhận đạt ASVS/SRE/production readiness nếu chưa có đánh giá chính thức.

Cách viết: liệt kê phạm vi bằng giọng trung tính, không viết như xin lỗi. Các mục ngoài phạm vi nên được giới thiệu là ranh giới để đảm bảo đánh giá đúng bằng chứng.

### 1.6. Phương pháp thực hiện

Nội dung cần có:

- Khảo sát tài liệu học thuật/chính thức và nguồn thị trường đủ tin cậy.
- Phân tích yêu cầu từ actor/use case/NFR/state machine.
- Thiết kế kiến trúc theo bounded context, service boundary, data ownership và giao tiếp sync/async.
- Triển khai trong Nx monorepo với NestJS/Next.js/React, Redis, Kafka, Keycloak, PostgreSQL/MongoDB.
- Kiểm chứng bằng unit/integration/contract test, diagrams, traceability matrix, LaTeX build, demo evidence và artifact triển khai Phase 7 sau khi thu thập.
- Bàn luận kết quả theo mức bằng chứng thay vì claim tuyệt đối.

### 1.7. Đóng góp của đề tài

Đóng góp nên gồm 5 điểm:

1. Mô hình hóa bài toán SaaS POS tích hợp QR ordering cho F&B.
2. Thiết kế kiến trúc microservices với service ownership rõ cho các miền Catalog, Order, Kitchen, Payment, SaaS, User-Access và Authorizer.
3. Hiện thực các luồng vận hành cốt lõi từ quét QR đến order, KDS và payment.
4. Áp dụng tenant isolation, RBAC, idempotency và Saga đại diện vào một hệ thống phần mềm hoàn chỉnh.
5. Xây dựng bộ tài liệu, diagram, evidence và quy trình đánh giá giúp truy vết từ yêu cầu đến implementation.

Không gọi đây là đóng góp nghiên cứu mới về QR code hoặc microservices nếu không có phần nghiên cứu tương ứng.

### 1.8. Cấu trúc khóa luận

Viết ngắn, mỗi chương 1 đoạn hoặc 1-2 câu:

- Chương 2: cơ sở lý thuyết và công trình liên quan.
- Chương 3: phân tích yêu cầu từ vận hành F&B.
- Chương 4: thiết kế kiến trúc và quyết định công nghệ.
- Chương 5: hiện thực các luồng vận hành cốt lõi.
- Chương 6: kiểm chứng và đánh giá.
- Chương 7: kết luận, hạn chế và hướng phát triển.

## 6. Execution checklist

- [ ] Kiểm tra branch/worktree dirty state trước khi sửa:

```bash
git status --short
```

Expected: có thể dirty; không revert thay đổi không do mình tạo.

- [ ] Mở file Chương 1:

```bash
sed -n '1,120p' docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
```

Expected: xác nhận các section skeleton vẫn đúng tên.

- [ ] Draft từng section theo thứ tự 1.1 đến 1.8 trong `01-mo-dau.tex`.

Expected: mỗi section có nội dung thật, không để section rỗng.

- [ ] Nếu thêm Bảng 1.1, đặt ngay sau mục 1.3 hoặc cuối mục 1.3, dùng caption rõ:

```latex
\caption{Tóm tắt vấn đề và hướng giải quyết của QRTable}
```

Expected: bảng có label `tab:chapter1-problem-solution` và được refer trong prose trước hoặc sau bảng.

- [ ] Không thêm Hình 1.1 trong cùng lượt nếu chưa có diagram nguồn/render pipeline. Nếu cần hình, ghi vào `thesis-artifact-backlog.md` và làm bằng plan riêng.

- [ ] Scan cụm từ không nên có trong Chương 1:

```bash
rg -n "deferred|implementation-gap|Phase|production-ready|stress test|chưa làm|hiện tại chỉ|sẵn sàng vận hành thực tế|vượt trội" docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
```

Expected: không có hit, trừ khi cụm nằm trong ngữ cảnh phủ định rất có chủ đích và không thể diễn đạt tốt hơn. Không thêm `Phase 6`, `observability` hoặc `SLO` vào Chương 1.

- [ ] Scan citations trong Chương 1:

```bash
rg -n "\\\\cite\\{" docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
```

Expected: chỉ dùng keys có thật trong `references.bib`.

- [ ] Build LaTeX:

```bash
python3 /Users/vodinhquan/.codex/plugins/cache/openai-bundled/latex/0.2.2/scripts/compile_latex.py docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex --compiler texlive --engine xelatex --json
```

Expected: exit code 0, PDF build thành công.

- [ ] Kiểm tra text PDF:

```bash
pdftotext docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.pdf - | rg -n "Mở đầu|Đối tượng và phạm vi nghiên cứu|Đóng góp của đề tài|Cấu trúc khóa luận"
```

Expected: các heading Chương 1 xuất hiện trong PDF.

- [ ] Cập nhật `thesis-workflow-plan.md`:

Expected: ghi đã draft Chương 1, build status, citation changes nếu có, và next step là refactor Chương 3/5/7 theo plan riêng.

## 7. Acceptance criteria

- Chương 1 dài đủ vai trò mở đầu, mục tiêu 8-10 trang nhưng không kéo dài bằng lặp ý.
- Tất cả section 1.1-1.8 có nội dung thật.
- Mục 1.5 là điểm neo phạm vi chính thức cho toàn khóa luận.
- Phần ngoài phạm vi được viết trung tính, không phòng thủ.
- Citation dùng nguồn thật đã có trong `references.bib`; không thêm citation giả.
- Không claim production-ready, benchmark tải lớn, high availability, ASVS/SRE đạt chuẩn hoặc SePay live verification trước khi có bằng chứng. Phase 7 deployment là bước chắc chắn sẽ làm, nhưng claim kết quả chỉ được mạnh lên sau khi artifact thật được bổ sung.
- Chương 1 không mâu thuẫn với Chương 2-7 hiện tại.
- LaTeX build pass.
- `thesis-workflow-plan.md` được cập nhật cuối session.

## 8. Reviewer-style questions

Trước khi coi Chương 1 là ổn, tự hỏi:

- Người đọc có hiểu QRTable giải quyết bài toán gì trong 2 trang đầu không?
- Phạm vi trong mục 1.5 có đủ rõ để Chương 5 không cần lặp disclaimer theo từng luồng không?
- Cách nói về microservices có dựa trên domain ownership/maintainability thay vì hiệu năng chưa đo không?
- Cách nói về QR ordering có tránh claim novelty ở bản thân QR code không?
- Các nguồn product như KiotViet/Sapo/iPOS có được dùng đúng vai trò related system/context, không dùng như bằng chứng học thuật chính không?
- Có câu nào làm đề tài nghe như chưa hoàn thành thay vì có phạm vi đánh giá rõ không?

## 9. Negative scope cho lượt viết Chương 1

Không làm trong lượt này:

- Không refactor Chương 3/5/7 cùng lúc nếu chưa đọc plan refactor riêng.
- Không thêm diagram mới nếu chưa có asset/render pipeline.
- Không thêm benchmark hoặc số liệu performance tự tạo.
- Không đưa Technical Phase 6/observability vào Chương 1 như mục tiêu, phạm vi, đóng góp hoặc hướng phát triển.
- Không thêm nguồn mới vào `references.bib` nếu chưa verify metadata.
- Không sửa Chương 4/6 chỉ vì phát hiện câu có thể polish; ghi lại trong workflow nếu cần.
