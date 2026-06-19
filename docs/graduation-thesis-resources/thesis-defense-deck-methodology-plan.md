# Kế hoạch tạo slide bảo vệ hoàn chỉnh — QRTable

> **Dành cho agent:** Đây là tài liệu thực thi đã chốt để tạo bộ slide bảo vệ khóa luận tốt nghiệp chính thức của QRTable. Đầu ra phải là PPTX bản chính và PDF bản dự phòng, hoàn chỉnh về nội dung, bố cục, theme, speaker notes, appendix và vị trí visual; file plan này không phải nội dung để trình chiếu. Với diagram/ảnh tùy biến phức tạp do người dùng sẽ tự vẽ hoặc tự thay, dùng placeholder có cấu trúc và gắn sẵn link nguồn/brief thay vì tự vẽ. Không tự sửa LaTeX report, thêm citation hoặc chỉnh `references.bib` nếu chưa có yêu cầu và nguồn kiểm chứng.

## 1. Mục tiêu của plan

Plan này là execution plan đã chốt để tạo bộ slide bảo vệ QRTable hoàn chỉnh, không còn là tài liệu tiếp tục hỏi lại narrative hoặc phác thảo cấu trúc.

Mục tiêu chính:

- Tạo deck PowerPoint chính thức cho buổi bảo vệ, không còn ở giai đoạn hỏi lại narrative nền.
- Thiết kế lại mạch slide bảo vệ khóa luận theo hướng lập luận kỹ thuật rõ ràng, tập trung vào thiết kế hệ thống, mẫu thiết kế và đánh đổi kiến trúc.
- Chuyển từ cấu trúc slide chỉ liệt kê kiến trúc sang cấu trúc: bài toán → thách thức kiến trúc → bất biến cần bảo vệ → quyết định thiết kế → cách hiện thực → bằng chứng kiểm chứng.
- Giữ slide chính trong khoảng **20-25 phút trình bày**, nhưng **demo không nằm trong 20-25 phút**.
- Mục tiêu là **30 slide chính**; được phép tinh chỉnh trong khoảng **26-30 slide** nếu việc gộp nội dung làm mạch trình bày rõ hơn và không làm mất cụm cơ chế trọng yếu.
- Triển khai PowerPoint (`.pptx`) làm bản chính và PDF làm bản dự phòng.
- Mọi slide phải hoàn chỉnh về luận điểm, nội dung trình bày, bố cục, style và speaker notes. Placeholder chỉ thay thế visual tùy biến phức tạp, không thay thế nội dung hoặc lập luận.

## 2. Trạng thái hiện tại

Đã thống nhất các điểm sau:

- Không nên cố nhét toàn bộ kiến trúc QRTable vào 18 slide.
- Số slide chính mục tiêu: **30 slide** cho phần trình bày 20-25 phút; khoảng được chấp nhận là **26-30 slide**, không được làm mất cụm cơ chế trọng yếu.
- Demo tách khỏi thời lượng trình bày 20-25 phút.
- Demo đã chốt là **một demo chính theo golden flow** `QR → Cart → Order → KDS → Payment`, dự kiến khoảng **5-7 phút** sau phần trình bày. Chuẩn bị fallback bằng screenshot/video/state/log nếu demo live lỗi.
- Evidence trong slide chính dùng ma trận rút gọn; chi tiết test output, database state, log/trace và bảng kỹ thuật để appendix.
- Appendix đã chốt là **có**, không tính vào 20-25 phút.
- Deck được sinh bằng mã nguồn thành PowerPoint (`.pptx`), sau đó xuất PDF dự phòng; không dùng LaTeX Beamer làm source slide chính.
- Visual direction đã chốt lại sau vòng duyệt ngày 2026-06-16: **Manus-like Academic Dark**, dùng bộ preview tại `docs/presentations/qrtable-defense-deck-preview/` làm chuẩn bắt buộc về bố cục, typography, khoảng trắng, mật độ chữ và cách trình bày placeholder.
- Slide không chỉ đi theo kiểu “hệ thống có gì”, mà nên đi theo kiểu “vì sao bài toán này khó, QRTable giải quyết từng thách thức như thế nào, và bằng chứng nào cho thấy đã triển khai được”.
- Cần có một phần trung gian giải thích cách phân tích quyết định thiết kế trước khi vào phần “QRTable giải quyết từng thách thức”.
- Phần “QRTable giải quyết từng thách thức” vẫn là trọng tâm, nhưng mỗi thách thức nên trình bày theo một mẫu nhất quán.
- Deck là một bài bảo vệ kỹ thuật phần mềm, không mô phỏng cách trình bày của một công trình AI hoặc tự gọi các quyết định kiến trúc là thuật toán/phương pháp nghiên cứu.
- Mỗi cụm kỹ thuật phải giải thích nguyên lý, logic hoạt động và đánh đổi của cơ chế ngay trước hoặc ngay trong cụm áp dụng vào QRTable; không chỉ nêu tên công nghệ hoặc mẫu thiết kế.
- Không đưa luồng SaaS onboarding vào slide chính hoặc appendix. SaaS service vẫn xuất hiện trong sơ đồ kiến trúc tổng thể vì là một ranh giới dịch vụ thật của hệ thống.
- Phần Saga chỉ đào sâu một trường hợp chính là **Order Confirm Saga**. Có thể giới thiệu Saga như một mẫu xử lý giao dịch phân tán, sau đó đi sâu vào luồng Order–Catalog, nhánh bù trừ và mức bằng chứng hiện có.
- AI được phép tạo visual đơn giản bằng shape PowerPoint như flow 3-5 bước, bảng so sánh, callout, đường nối và sơ đồ khái niệm nhỏ.
- AI không tự vẽ lại diagram kiến trúc nhiều service, sequence/state diagram có nhiều nhánh, failure/compensation flow chi tiết hoặc illustration riêng. Với các visual này, dùng placeholder `user-replacement` và đính link tới diagram/ảnh/source tham chiếu để người dùng tự vẽ hoặc thay vào.
- Placeholder trên vùng trình chiếu phải sạch và hòa vào bố cục: chỉ hiển thị caption, mục đích visual và lời mô tả ngắn. Asset ID, path dài, trạng thái nội bộ và hướng dẫn thay chi tiết phải nằm trong speaker notes hoặc asset registry.
- Slide master phải có hai thành phần độc lập ở góc dưới: placeholder logo trường và dòng chữ `TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN`. Không gộp hai phần thành một ảnh.
- Deck phải có asset ảnh nền toàn cục cho bìa và các section/conclusion slide phù hợp. Khi chưa có ảnh final, dùng ảnh prototype có kiểm soát hoặc placeholder ảnh nền; không để ảnh nền cạnh tranh với chữ.

Các cơ chế bắt buộc phải chứng minh trong deck:

- Giao tiếp liên dịch vụ: HTTP/WebSocket ở client edge, TCP nội bộ, gRPC Authorizer, Kafka cho tác dụng phụ bất đồng bộ.
- Xác thực và thiết lập request context: staff/admin qua Keycloak JWT, customer qua QR/session.
- Phân quyền nhiều lớp: RBAC, cô lập tenant, quyền lợi theo gói và quyền quản trị nền tảng.
- Cô lập tenant: request của tenant A không đọc/ghi dữ liệu tenant B.
- Tính nhất quán và tính lũy đẳng: local transaction, idempotency, deduplication, outbox/event theo phạm vi có evidence.
- Giao dịch phân tán: mẫu Saga và case study Order Confirm Saga.
- KDS projection và realtime: Redis projection, event-driven update, WebSocket hint/refetch.
- Payment finalization và Order/Payment bridge ở mức integration proof/evidence matrix hoặc appendix, không cần tách thành một cụm lý thuyết riêng nếu 30 slide bị chật.

Dependency còn lại trước bản trình chiếu cuối cùng:

- Logo chính thức của Trường Đại học Công nghệ Thông tin. Nếu chưa có khi bắt đầu triển khai, dùng structured placeholder `GLOBAL_SCHOOL_LOGO`; dòng tên trường là thành phần text riêng `GLOBAL_SCHOOL_NAME_TEXT`.
- Ảnh nền chính thức hoặc ảnh người dùng lựa chọn cho các slide cover/section. Trước khi có asset final, dùng `GLOBAL_COVER_BACKGROUND` ở trạng thái `prototype` hoặc `user-replacement`.
- Visual tùy biến phức tạp do người dùng sở hữu bước thay thế cuối. Deck AI bàn giao vẫn phải hoàn chỉnh và có placeholder `user-replacement` đúng kích thước, link nguồn, caption, brief và hướng dẫn thay.
- Evidence thật cho screenshot, database state, log/trace hoặc test output. Nếu chưa có, dùng placeholder có cấu trúc và link tới route/query/test/source liên quan; không được biến placeholder thành một claim đã kiểm chứng.
- Reconcile số liệu traceability/permission/Phase 7 trước khi freeze các slide bằng chứng.

## 3. Chiến lược đọc tài liệu và đối chiếu codebase

Agent session mới không nên đọc toàn bộ report hoặc toàn bộ repo ngay từ đầu. Cấu trúc slide không đi tuần tự theo Chương 1 đến Chương 7, mà đi theo mạch lập luận đã chốt trong plan này.

### 3.1. Nguồn điều khiển mạch slide

Ba file sau là bắt buộc đọc trước:

1. `AGENTS.md`
   - Nắm chuẩn làm việc của QRTable.
   - Đặc biệt chú ý: dùng tiếng Việt là chính, giữ thuật ngữ kỹ thuật quan trọng bằng tiếng Anh khi cần.

2. `docs/graduation-thesis-resources/thesis-workflow-plan.md`
   - Nắm workflow hiện tại của khóa luận.
   - Chú ý Phase 8C và các ghi chú mới về defense deck.

3. `docs/graduation-thesis-resources/thesis-defense-deck-methodology-plan.md`
   - Chính là file này.
   - Dùng làm nguồn chính để quyết định narrative, thứ tự slide, trọng tâm và các câu hỏi còn mở.

Không dùng mục lục hoặc thứ tự chương trong report làm outline mặc định cho slide.

Sau ba file trên, agent triển khai deck chính thức bắt buộc đọc:

1. `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex`
   - Nguồn canonical cho tên đề tài tiếng Việt/tiếng Anh, sinh viên, MSSV, khoa, ngành, giảng viên hướng dẫn và năm.
   - Không lấy các thông tin này từ slide prototype hoặc tự điền theo trí nhớ.

2. `docs/graduation-thesis-resources/thesis-report/frontmatter/cover.tex`
   - Đối chiếu cách tên trường, khoa, loại khóa luận, sinh viên và giảng viên hướng dẫn được trình bày chính thức.

3. `docs/graduation-thesis-resources/thesis-report/frontmatter/abstract.tex`
   - Nắm bản tóm tắt chính thức nếu nội dung đã hoàn thiện; nếu còn placeholder hoặc chưa đồng bộ thì phải ghi nhận, không tự suy diễn.

4. `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
   - Nắm bối cảnh, bài toán, mục tiêu, phạm vi và đóng góp chính thức.

5. `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`
   - Nắm đóng góp, hạn chế và hướng phát triển đã được phát biểu chính thức.

Không cần đọc tuyến tính toàn bộ report ngay từ đầu. Các Chương 3-6 được đọc theo cụm slide kỹ thuật đang triển khai, theo chiến lược ở §3.3.

### 3.2. Nguồn xác minh hệ thống thực tế

Khi một slide đưa ra claim về kiến trúc, implementation hoặc evidence, phải đối chiếu theo nhu cầu với codebase hiện tại.

Quy trình đọc có chọn lọc:

1. Dùng CodeGraph để tìm service, class, guard, flow, test hoặc dependency liên quan.
2. Đọc `docs/README.md` và `docs/DOC-CODE-ANCHORS.md` nếu cần xác định canonical doc hoặc code path cho chủ đề.
3. Chỉ đọc source code, test, config và canonical technical docs trực tiếp liên quan đến claim đang xem xét.
4. Không audit toàn bộ service hoặc toàn bộ repo nếu slide chỉ cần xác minh một cơ chế cụ thể.

Nguồn ưu tiên theo loại câu hỏi:

| Câu hỏi cần trả lời                        | Nguồn ưu tiên                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Hệ thống hiện thực sự làm gì?              | Source code, tests, runtime/config hiện tại                                                         |
| Service nào sở hữu dữ liệu hoặc hành vi?   | Module registration, entity/schema, repository, provider, service code, canonical architecture docs |
| Claim đã có bằng chứng đến đâu?            | Test output, traceability matrix, Saga validation docs, deployment artifact                         |
| Cách diễn đạt học thuật và phạm vi đề tài? | LaTeX report, thesis workflow, evidence map                                                         |
| Thứ tự và mạch kể của slide?               | Plan defense deck hiện tại và quyết định mới từ trao đổi với người dùng                             |

Các tài liệu evidence đọc khi slide chạm đúng chủ đề:

- `docs/testing/phase-5/traceability-matrix.md`
  - Dùng khi đánh giá mức cover hoặc thiết kế slide bằng chứng.
  - Không tự suy diễn rằng mọi phần đều đã cover.

- `docs/testing/phase-5/saga-validation-strategy.md`
  - Dùng khi thảo luận Saga, compensation, consistency hoặc failure path.

- `docs/phases/phase-5-7-finalization.md`
  - Dùng khi cần hiểu trạng thái hoàn thiện, implementation gap hoặc deferred scope.

### 3.3. Vai trò của LaTeX report

Report là nguồn quan trọng nhưng không phải kịch bản tuyến tính của slide.

Chỉ đọc chương liên quan khi cần:

- lấy nội dung học thuật, định nghĩa, citation hoặc cách diễn đạt đã được kiểm soát;
- đối chiếu phạm vi và đóng góp đã tuyên bố trong khóa luận;
- tái sử dụng bảng, diagram hoặc visual asset;
- kiểm tra slide không mâu thuẫn với report chính thức.

Không đọc toàn bộ các chương chỉ để quyết định thứ tự slide. Các chương có thể đối chiếu theo nhu cầu:

- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`

Nếu code/test hiện tại và report có khác biệt, không được âm thầm chọn một bên:

- dùng code/test hiện tại để xác định trạng thái implementation;
- dùng report để xác định claim chính thức đang được viết;
- chỉ ra contradiction hoặc drift cần xử lý trước khi freeze slide;
- không tự sửa report nếu session chỉ đang thảo luận plan.

### 3.4. Artifact slide cũ

Các artifact slide cũ có thể giúp hiểu hướng ban đầu, nhưng không được xem là cấu trúc cuối:

- `docs/presentations/qrtable-thesis-architecture.pptx`
- `docs/presentations/qrtable-thesis-deck-source.mjs`
- `docs/presentations/qrtable-thesis-slide-brief.md`

Lý do: các artifact cũ thuộc hướng 17-18 slide / Phase 2A, không còn khớp với hướng mới khoảng 30 slide và demo tách riêng.

## 4. Skill dùng khi thực thi

Agent thực thi nên dùng skill theo nhu cầu, không dùng hình thức.

- Dùng **CodeGraph trước** để hiểu trạng thái codebase trước khi audit hoặc đề xuất dựa trên code.
- Dùng `$zoom-out` khi cần nhìn hệ thống ở mức actor, domain, use case, hoặc architecture driver.
- Dùng `$grill-with-docs` để kiểm tra claim có mâu thuẫn với tài liệu, code, hoặc bằng chứng kiểm thử không.
- Dùng `$writing-plans` để tạo implementation plan ngắn trước khi dựng source deck/PPTX/PDF.
- Dùng `$pptx` khi bắt đầu tạo, đọc, sửa, hoặc QA file PowerPoint.
- Dùng `$doc-coauthoring` nếu cần refine cấu trúc tài liệu, nhưng không dùng để viết chương dài.
- Dùng `Context7` / `ctx7` chỉ khi cần tài liệu hiện hành của thư viện, framework, SDK, API, CLI tool, hoặc cloud service.
- Nếu đụng đến LaTeX, dùng skill LaTeX và build lại report trước khi kết thúc.

## 5. Hướng narrative đã chốt

Mạch trình bày nên đi theo hướng:

1. **Từ nghiệp vụ đến bài toán kiến trúc**
   - Không bắt đầu bằng microservices ngay.
   - Bắt đầu từ vận hành nhà hàng, QR ordering, thanh toán, bếp, nhân viên, quản lý.

2. **Từ yêu cầu đến quyết định kiến trúc**
   - Chỉ ra vì sao bài toán này không đơn giản là CRUD.
   - Dẫn tới các architecture drivers như multi-tenant, realtime, consistency, authorization, payment, resilience.

3. **Từ quyết định kiến trúc đến thách thức cần giải quyết**
   - Microservices được chọn vì phù hợp với service boundary và khả năng mở rộng theo domain.
   - Nhưng microservices tạo ra nhiều vấn đề mới: giao tiếp liên dịch vụ, xác thực, phân quyền, transaction phân tán, consistency, duplicate message, tenant isolation.

4. **Cách phân tích quyết định thiết kế và kiểm chứng**
   - Đây là phần nối giữa bản đồ thách thức và các cơ chế cụ thể của QRTable.
   - Trình bày một cấu trúc lập luận nhất quán:
     - Thách thức cần giải quyết.
     - Bất biến hệ thống cần bảo vệ.
     - Nguyên lý hoặc mẫu thiết kế được lựa chọn.
     - Logic hoạt động và đánh đổi.
     - Nơi hiện thực trong QRTable.
     - Bằng chứng kiểm chứng.

5. **QRTable giải quyết từng thách thức**
   - Mỗi thách thức không trình bày rời rạc.
   - Mỗi slide hoặc cụm slide nên đi theo cùng mẫu: bài toán chung → nguyên lý/cơ chế → logic hoạt động → QRTable áp dụng → bằng chứng.
   - Phần lý thuyết được đưa vào đúng lúc trước cơ chế tương ứng, không tách thành một chương lý thuyết dài và không biến thành danh sách định nghĩa.

6. **Chứng minh triển khai và tích hợp**
   - Không chỉ demo giao diện.
   - Kết hợp UI flow, database state, logs/traces, test result, và traceability matrix.

7. **Kết luận**
   - Nêu đóng góp đã đạt được.
   - Nêu giới hạn trung thực.
   - Nêu hướng phát triển tiếp theo.

## 6. Cấu trúc slide đề xuất hiện tại

Target hiện tại: **30 slide chính** cho phần trình bày 20-25 phút; được phép tinh chỉnh trong khoảng **26-30 slide** sau khi QA bố cục và thời lượng. Demo tách riêng.

### Phần 1 — Từ nghiệp vụ đến bài toán kiến trúc

1. **Bìa**
   - Tên đề tài, sinh viên, giảng viên hướng dẫn.

2. **Nội dung trình bày**
   - Roadmap 5-6 phần chính.

3. **Bối cảnh vận hành F&B**
   - Nhà hàng có khách hàng, nhân viên phục vụ, bếp, quản lý, thanh toán.
   - Nên dùng sơ đồ actor/context thay vì bullet dày.

4. **Quy trình từ QR đến thanh toán**
   - QR scan → menu → cart → order → kitchen → bill/payment → dashboard.
   - Đây là “golden flow” ở mức nghiệp vụ.

5. **Các vấn đề trong quy trình hiện tại**
   - Sai order, chậm đồng bộ bếp, khó kiểm soát trạng thái, khó phân quyền, khó mở rộng nhiều chi nhánh/tenant.

6. **Bài toán hệ thống đặt ra**
   - Xây dựng nền tảng QR ordering/POS multi-tenant có khả năng tích hợp ordering, kitchen, payment, realtime, authorization, và reporting.

7. **Mục tiêu và phạm vi**
   - Nêu rõ làm gì và không làm gì.
   - Tránh claim quá rộng như “production ready toàn diện” nếu chưa có bằng chứng.

8. **Tác nhân và ca sử dụng**
   - Customer, Staff, Kitchen, Manager/Owner, Platform Admin, external payment provider.

9. **Đóng góp của đề tài**
   - Nền tảng SaaS POS theo microservices.
   - Luồng order-payment-kitchen tích hợp.
   - Cơ chế auth/authorization/tenant isolation.
   - Kiểm chứng qua test evidence và traceability.

### Phần 2 — Từ yêu cầu đến quyết định kiến trúc

10. **Các động lực kiến trúc của QRTable**
    - Đa đơn vị thuê bao, quyền tự chủ dịch vụ, realtime, tích hợp thanh toán, tính nhất quán và độ tin cậy.

11. **Vì sao chọn microservices**
    - Không trình bày như “microservices luôn tốt”.
    - Trình bày như một quyết định có đánh đổi, phù hợp với ranh giới dịch vụ của QRTable.

12. **Các thách thức phát sinh từ microservices**
    - Đây là slide bản đồ vấn đề, giúp hội đồng biết phần sau sẽ lần lượt giải quyết điều gì.
    - Gồm giao tiếp liên dịch vụ, xác thực, phân quyền, cô lập tenant, tính nhất quán, giao dịch phân tán, thông điệp trùng lặp, realtime và lỗi từng phần.

13. **Kiến trúc tổng thể**
    - BFF, Authorizer, Catalog, Order, Kitchen, Payment, SaaS, User-Access, Redis, Kafka, PostgreSQL/MongoDB, WebSocket.
    - Sơ đồ này trả lời các thách thức được phân bổ vào ranh giới nào, không chỉ liệt kê thành phần.

14. **Ranh giới dịch vụ và quyền sở hữu dữ liệu**
    - Mỗi service sở hữu dữ liệu riêng.
    - Không cross-service database access.

### Phần 3 — Cách phân tích thiết kế và kiểm chứng

15. **Bản đồ phân tích quyết định thiết kế**
    - Dùng một cấu trúc thống nhất: thách thức → bất biến → quyết định thiết kế → hiện thực → bằng chứng.
    - Ví dụ:
      - Thách thức: giao dịch phân tán.
      - Bất biến: không xác nhận đơn nếu không xử lý tồn kho thành công.
      - Quyết định: Saga điều phối, bù trừ và tính lũy đẳng.
      - Hiện thực: Order điều phối, Catalog sở hữu tồn kho.
      - Bằng chứng: unit/contract test, trạng thái dữ liệu và log nhánh lỗi nếu có.

16. **Các lớp bằng chứng kiểm chứng**
    - Chia bằng chứng thành nhiều lớp:
      - Demo UI: chứng minh hành vi người dùng nhìn thấy.
      - Trạng thái database/Redis: chứng minh dữ liệu thật đã chuyển trạng thái.
      - Log/trace: chứng minh đường đi liên dịch vụ và nhánh lỗi.
      - Kiểm thử tự động: chứng minh bất biến có thể kiểm tra lặp lại.
      - Ma trận truy vết: nối yêu cầu với bằng chứng.

### Phần 4 — QRTable giải quyết từng thách thức

17. **Giao tiếp liên dịch vụ: nguyên lý và đánh đổi**
    - Phân biệt giao tiếp đồng bộ và bất đồng bộ theo nhu cầu phản hồi, mức ghép nối và cách xử lý lỗi.
    - Không trình bày giao thức như danh sách công nghệ; phải giải thích tiêu chí lựa chọn.

18. **Mô hình giao tiếp của QRTable**
    - BFF dùng HTTP/WebSocket cho client.
    - TCP nội bộ cho lời gọi đồng bộ giữa các service.
    - gRPC cho Authorizer.
    - Kafka cho tác dụng phụ bất đồng bộ.
    - WebSocket là tín hiệu cập nhật realtime, không phải nguồn dữ liệu đúng cuối cùng.

19. **Xác thực và thiết lập ngữ cảnh yêu cầu**
    - Giải thích mục tiêu của xác thực: xác định chủ thể và tạo ngữ cảnh tin cậy cho các lớp kiểm soát phía sau.
    - Staff/admin: Keycloak JWT → BFF → Authorizer gRPC → request context.
    - Customer: QR token → customer session → Redis session context.

20. **Phân quyền nhiều lớp**
    - Phân biệt quyền theo vai trò, cô lập tenant, quyền lợi theo gói và quyền quản trị nền tảng; không gộp tất cả thành “authorization”.
    - RBAC, cô lập tenant, quyền lợi theo gói và quyền quản trị nền tảng.
    - Nên có sơ đồ guard chain thay vì bullet nhiều chữ.

21. **Cô lập tenant**
    - Giải thích tenant context được thiết lập và truyền qua request như thế nào.
    - TenantGuard, request context, tenant-scoped query.
    - Cần nhấn mạnh invariant: request của tenant A không đọc/ghi dữ liệu tenant B.

22. **Tính nhất quán và tính lũy đẳng**
    - Phân biệt tính nhất quán mạnh trong một service với tính nhất quán cuối cùng giữa các service.
    - Giải thích vì sao retry hoặc thông điệp trùng lặp đòi hỏi tính lũy đẳng (idempotency) và loại trùng (deduplication).

23. **Cơ chế nhất quán trong QRTable**
    - Kết hợp giao dịch cục bộ, tính lũy đẳng, loại trùng, outbox/event và nguồn dữ liệu đúng cuối cùng theo từng luồng.
    - Không claim exactly-once; chỉ mô tả tính lũy đẳng và loại trùng theo đúng phạm vi đã có evidence.

24. **Giao dịch phân tán và mẫu Saga**
    - Vì mỗi service sở hữu database riêng, không dùng một transaction ACID duy nhất cho toàn hệ thống.
    - Giải thích chuỗi giao dịch cục bộ, điều phối, bù trừ, biên tính lũy đẳng và đánh đổi của Saga.

25. **Order Confirm Saga trong QRTable**
    - Catalog reserve/giảm stock.
    - Order commit.
    - Nếu thất bại thì Catalog compensation.
    - Cần trình bày bằng sequence diagram hoặc state diagram.

26. **Nhánh lỗi, bù trừ và bằng chứng Saga**
    - Làm rõ bất biến cần giữ khi Catalog hoặc Order thất bại.
    - Đối chiếu nhánh thành công, nhánh bù trừ, hành vi retry và giới hạn evidence hiện tại.
    - Bằng chứng chính: kiểm thử đơn vị/hợp đồng; log, trace, snapshot database/outbox hoặc fault injection chỉ dùng khi đã thu thật.

27. **Event, KDS projection và realtime**
    - Order event cập nhật KDS projection trong Redis; cần giải thích quyền sở hữu dữ liệu và cơ chế deduplication.
    - WebSocket gửi hint để client refetch hoặc cập nhật view.
    - Không nói WebSocket là nguồn dữ liệu đúng cuối cùng.

### Phần 5 — Chứng minh triển khai và tích hợp

28. **Chứng minh tích hợp theo golden flow**
    - QR → Cart → Order → KDS → Payment.
    - Nối UI flow với trạng thái Order, KDS, Bill/Payment và event liên quan.
    - Demo UI chính nên bám vào flow này, còn cơ chế nội bộ dùng thêm database/state, log hoặc test evidence.

29. **Ma trận bằng chứng, kiểm thử và hạn chế**
    - Tóm tắt cơ chế trọng yếu theo các cột: claim, UI/state/log/test evidence và mức kết luận.
    - Nêu kết quả kiểm thử và traceability theo số liệu đã reconcile.
    - Nêu hạn chế trung thực: load/performance, live fault injection, full production deployment evidence, hoặc phần nào còn partial.

30. **Đóng góp đạt được và kết luận**
    - Tóm lại QRTable đã giải quyết bài toán gì.
    - Nêu ý nghĩa kỹ thuật và hướng phát triển.

## 7. Nguyên tắc trình bày mỗi cụm kỹ thuật

Các slide ở Phần 4 không nên chỉ là danh sách cơ chế. Mỗi cụm kỹ thuật phải trả lời 6 câu hỏi:

1. **Bài toán chung là gì?**
   - Ví dụ: trong microservices, một order confirmation liên quan nhiều service nên không thể dùng một transaction database duy nhất.

2. **Bất biến cần giữ là gì?**
   - Ví dụ: không tạo confirmed order nếu stock reservation thất bại.

3. **Nguyên lý hoặc mẫu thiết kế nào phù hợp?**
   - Ví dụ: Saga điều phối, bù trừ và tính lũy đẳng.

4. **Logic hoạt động và đánh đổi là gì?**
   - Giải thích luồng thành công, nhánh lỗi, điều kiện retry, giới hạn và chi phí của lựa chọn.

5. **QRTable áp dụng ở đâu?**
   - Ví dụ: Order service điều phối, Catalog service sở hữu stock, Kafka/Outbox cho side effect.

6. **Bằng chứng là gì?**
   - Ví dụ: test case, database state, log/trace, UI flow, hoặc traceability matrix.

Không bắt buộc mỗi câu hỏi tương ứng với một slide riêng. Chủ đề đơn giản có thể gộp nguyên lý và cách áp dụng trong một slide; chủ đề trọng tâm như Order Confirm Saga được phép dùng nhiều slide. Phần giải thích cơ chế phải xuất hiện đúng lúc trước khi người nghe cần dùng nó để hiểu QRTable.

## 8. Chiến lược chứng minh và demo

Quan điểm đã chốt: **demo giao diện không đủ để chứng minh toàn bộ cơ chế hệ thống**.

Demo UI chỉ chứng minh phần người dùng nhìn thấy. Các cơ chế như idempotency, consistency, Saga compensation, tenant isolation, retry, duplicate handling thường cần thêm bằng chứng khác.

Nên chia bằng chứng thành 4 lớp:

1. **UI demo**
   - Dùng để chứng minh luồng nghiệp vụ hoàn chỉnh.
   - Ví dụ: khách scan QR, đặt món, bếp nhận order, thanh toán, dashboard cập nhật.

2. **Database/state evidence**
   - Dùng để chứng minh dữ liệu thật đã chuyển trạng thái.
   - Ví dụ: order status, bill/payment status, stock quantity, KDS queue state, tenant_id.

3. **Logs/traces**
   - Dùng để chứng minh service path, event path, retry, compensation, hoặc failure handling.
   - Ví dụ: request đi qua BFF → Order → Catalog, hoặc Payment event → Order bridge.

4. **Automated tests và traceability**
   - Dùng để chứng minh invariant có thể kiểm tra lặp lại được.
   - Đặc biệt quan trọng với idempotency, authorization, tenant isolation, consistency.

## 9. Những gì hiện có thể chứng minh tương đối tốt

Theo trạng thái evidence đã thảo luận trước đó, QRTable có thể trình bày mạnh ở các nhóm sau, nhưng agent mới vẫn phải đối chiếu lại tài liệu/test trước khi viết claim cuối:

- Luồng submit order có idempotency ở mức đại diện.
- Cart/version consistency có evidence.
- KDS queue/projection có cơ chế dedupe bằng Redis ở mức đại diện.
- Payment finalization và Payment → Order bridge có evidence.
- RBAC, tenant isolation, guard chain có evidence đại diện.
- Golden flow QR → Cart → Order → KDS → Payment có thể dùng làm trục demo chính.

## 10. Những phần không nên overclaim

Không được nói quá mức nếu chưa có bằng chứng mới:

- Không claim “toàn bộ P0 đã cover đầy đủ” nếu traceability vẫn còn partial/gap/deferred.
- Không claim hệ thống đã production-ready hoàn chỉnh.
- Không claim đã benchmark performance/load đầy đủ nếu chưa có kết quả.
- Không claim exactly-once messaging; nên nói idempotency/deduplication theo phạm vi đã hiện thực.
- Không claim WebSocket là source of truth.
- Không claim Saga đã cover mọi failure path live nếu chỉ có test hoặc design document.
- Không claim public deployment hoàn chỉnh nếu deployment evidence vẫn là foundation/chưa đầy đủ.

## 11. Quyết định triển khai đã chốt

Agent mới không cần hỏi lại các quyết định nền dưới đây trước khi dựng deck:

1. **Số slide chính**
   - Mục tiêu 30 slide chính cho 20-25 phút; cho phép 26-30 slide sau QA.
   - Có thể điều chỉnh nhỏ khi layout thực tế cần, nhưng phải giữ đủ các cụm cơ chế bắt buộc.

2. **Gói demo**
   - Một demo chính theo golden flow `QR → Cart → Order → KDS → Payment`.
   - Demo không tính vào 20-25 phút trình bày; mục tiêu khoảng 5-7 phút.
   - Chuẩn bị fallback bằng screenshot/video và evidence state/log/test.

3. **Slide bằng chứng**
   - Slide chính dùng ma trận evidence rút gọn.
   - Test output, database row/state, log/trace và bảng dài để appendix hoặc speaker backup.

4. **Appendix**
   - Có appendix.
   - Appendix gồm permission matrix, Order Confirm Saga sequence, DB ownership, Kafka topics, Redis keys, payment flow, deployment topology, test/traceability matrix.
   - Không đưa SaaS onboarding vào appendix.

5. **Logo và asset**
   - Dùng logo UIT chính thức khi có.
   - Nếu chưa có lúc triển khai, tạo placeholder có cấu trúc trong asset registry; trước bản final phải thay bằng asset thật hoặc xin người dùng cung cấp.

6. **Cách bắt đầu tạo slide**
   - Agent phải đọc ba file bắt buộc, dùng CodeGraph trước, rồi tạo implementation plan ngắn cho deck source/PPTX/PDF.
   - Sau implementation plan, agent bắt đầu dựng deck theo plan này nếu không phát hiện blocker.

## 12. Quyết định định dạng và visual system

### 12.1. Pipeline tạo slide

Source of truth của deck là mã nguồn, không phải thao tác thủ công trực tiếp trên PowerPoint:

```text
Mã nguồn deck
  → sinh PPTX có thể chỉnh sửa
  → render/QA từng slide
  → xuất PDF dự phòng
```

Hướng triển khai khi người dùng cho phép thực thi:

- Ưu tiên dùng toolchain sinh PPTX bằng JavaScript hiện có trong repo, theo pattern của `docs/presentations/qrtable-thesis-deck-source.mjs`.
- Không dùng artifact Phase 2A làm source final; tạo source mới hoặc refactor có chủ đích sau khi audit.
- PPTX là artifact trình bày chính.
- PDF được export từ chính PPTX đã QA, không generate một deck PDF riêng bằng LaTeX.
- Deck AI bàn giao phải đủ 30 slide chính, appendix, speaker notes và nội dung hoàn chỉnh; không bàn giao wireframe, storyboard rỗng hoặc các slide chỉ có tiêu đề.
- Placeholder `user-replacement` cho visual phức tạp là một phần có chủ đích của deck bàn giao, không có nghĩa slide chưa hoàn thành.
- Mọi thay đổi chính phải thực hiện trong source code deck; chỉnh tay trong PowerPoint chỉ dùng như phương án khẩn cấp sát giờ bảo vệ.

### 12.2. Visual direction đã chốt

Người dùng đã duyệt **Manus-like Academic Dark** ngày 2026-06-16. Bộ preview chính thức dùng làm visual target:

- `docs/presentations/qrtable-defense-deck-preview/src/qrtable-defense-deck-preview.mjs`
- `docs/presentations/qrtable-defense-deck-preview/output/qrtable-defense-deck-preview.pptx`
- `docs/presentations/qrtable-defense-deck-preview/output/qa/contact-sheet.png`

Deck toàn bộ phải học theo các đặc điểm đã được duyệt:

- nền tối phẳng, tương phản cao;
- lề lớn và khoảng trắng rõ;
- tiêu đề lớn, câu dẫn đầy đủ, body text đọc được trên máy chiếu;
- mỗi slide tập trung vào một luận điểm hoặc một câu hỏi;
- tối đa khoảng 3-4 khối nội dung chính trên một slide, trừ bảng/diagram có lý do rõ ràng;
- icon lớn và màu accent có vai trò phân loại, không dùng để trang trí;
- cyan, emerald, amber và rose lần lượt biểu diễn đường chính, trạng thái thành công, đánh đổi/cảnh báo và lỗi/rủi ro;
- card phẳng, góc vuông, viền mảnh; không dùng glow, bento grid, glassmorphism hoặc texture dày;
- placeholder visual phức tạp phải nhìn như một vùng nội dung hoàn chỉnh, không giống debug frame;
- typography sans hiện đại kết hợp mono cho nhãn phần và metadata.

Không sao chép nguyên HTML hoặc nội dung do Manus sinh. Chỉ học hệ thống bố cục và nhịp thị giác; toàn bộ claim, thuật ngữ và cách diễn đạt phải được kiểm soát theo code/test/docs QRTable.

### 12.3. Nguồn visual canonical từ Management App

Khi triển khai deck, agent phải đọc có chọn lọc các file sau để trích design tokens và motif:

- `apps/management-app/src/app/landing-fonts.ts`
- `apps/management-app/src/features/landing/landing.module.css`
- `apps/management-app/src/features/landing/hero-section.tsx`
- `apps/management-app/src/features/landing/hero-saas-qr-emblem.tsx`
- `apps/management-app/src/features/landing/data-flow-section.tsx`
- `apps/management-app/src/features/landing/workflow-section.tsx`
- `apps/management-app/src/features/landing/metrics-section.tsx`
- `apps/management-app/src/features/landing/payment-section.tsx`

Asset có thể tái sử dụng khi phù hợp:

- `apps/management-app/public/landing-hero-ambient.png`
- `apps/management-app/public/landing-qr-payment-flow-bg.png`
- `apps/management-app/public/landing-pwa-customer-menu.png`
- `apps/management-app/public/landing-dashboard-pos-live-orders.png`

Không bắt buộc dùng mọi asset. Mỗi asset chỉ được dùng nếu phục vụ luận điểm của slide.
Trước khi đưa ảnh nền/ảnh marketing vào deck final, cần kiểm tra lại nguồn và quyền sử dụng đã được ghi nhận trong repo hoặc bổ sung credit phù hợp.

### 12.4. Design tokens nền

Các token sau được trích từ landing page và dùng làm baseline:

| Vai trò         | Giá trị gợi ý           |
| --------------- | ----------------------- |
| Nền chính       | Zinc 950 — `#09090B`    |
| Surface/card    | Zinc 900 — `#18181B`    |
| Border          | Zinc 800 — `#27272A`    |
| Chữ chính       | Zinc 50 — `#FAFAFA`     |
| Chữ phụ         | Zinc 400 — `#A1A1AA`    |
| Chữ muted       | Zinc 500 — `#71717A`    |
| Accent chính    | Cyan 400 — `#22D3EE`    |
| Accent phụ      | Emerald 400 — `#34D399` |
| Accent gradient | `#22D3EE` → `#34D399`   |

Typography:

- Heading/body ưu tiên **Plus Jakarta Sans** hoặc font tương đương có hỗ trợ tiếng Việt và render ổn định. Bộ preview dùng `Avenir Next` làm fallback đã được duyệt về cảm giác thị giác.
- Nhãn kỹ thuật, số bước, topic/event, slide metadata ưu tiên **IBM Plex Mono** hoặc `Menlo` làm fallback.
- Trước khi freeze deck phải kiểm tra font embedding hoặc chuẩn bị fallback tương thích máy trình chiếu.
- Không dùng font mono cho đoạn văn dài.

### 12.5. Slide master và logo trường

Deck cần có slide master hoặc helper dùng chung:

- Tỉ lệ `16:9`.
- Safe margin tối thiểu khoảng `0.5 inch`.
- Placeholder logo trường là một phần nhỏ độc lập ở góc dưới.
- Dòng text `TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN` là phần nhỏ độc lập đặt cạnh logo.
- Slide number kín đáo.
- Cover và section slide có thể dùng ảnh nền toàn khung với overlay tối; ảnh nền là asset riêng, không chứa logo và tên trường.
- Các slide nội dung dùng logo + tên trường ở footer, không đặt logo trên góc trên để tránh cạnh tranh với tiêu đề.

Quy tắc logo:

- Chỉ dùng asset logo chính thức đã được người dùng cung cấp hoặc được kiểm chứng từ nguồn chính thức.
- Không tự vẽ lại logo, không dùng chữ `UIT` như logo final, không tự đổi màu trái guideline thương hiệu.
- Nếu logo màu không đủ tương phản trên nền tối, đặt trong một ô nền sáng/trung tính nhỏ thay vì chỉnh sai màu logo.
- Tại thời điểm viết plan, repo chưa có asset logo trường được xác nhận; đây là dependency cần bổ sung trước khi build deck final.
- Text tên trường được render trực tiếp bằng text box để luôn sắc nét và dễ chỉnh sửa; không nhúng chung vào ảnh logo.
- Khi logo chưa có, placeholder chỉ nên là một ô nhỏ có biểu trưng trung tính; không hiện `GLOBAL_SCHOOL_LOGO`, `ASSET_ID` hoặc trạng thái nội bộ trên slide.

### 12.6. Hệ layout đề xuất

Deck Manus-like Academic Dark không có nghĩa mọi slide dùng cùng một grid card. Nên có khoảng 7-9 layout tái sử dụng:

1. Cover có ảnh F&B full-bleed hoặc ảnh nền prototype, dark overlay và typography lớn.
2. Section divider nền tối, một luận điểm lớn, ít chữ.
3. Problem/context slide với ảnh hoặc actor flow.
4. Four-step flow lấy cảm hứng từ `DataFlowSection`.
5. Architecture canvas cho system/service diagram.
6. Thách thức → bất biến → quyết định thiết kế → hiện thực → bằng chứng.
7. Sequence/Saga slide với diagram là visual chính.
8. Slide bằng chứng kết hợp screenshot, state/log và test result.
9. Conclusion slide quay lại ảnh nền và thông điệp kết luận lớn.

### 12.7. Quy tắc chuyển hóa sang slide kỹ thuật

Giữ:

- màu sắc và typography đã duyệt trong preview;
- nhãn phần/metadata bằng mono;
- cyan cho primary path;
- emerald cho successful/committed state;
- amber cho đánh đổi/cảnh báo;
- rose cho failure/risk;
- card phẳng và đường nối khi nội dung thực sự cần.

Giảm hoặc loại bỏ:

- CTA kiểu “Xem bảng giá”, “Đăng nhập”;
- pricing-card hoặc marketing copy;
- mọi loại glow và texture không phục vụ thông tin;
- hiệu ứng phụ thuộc animation mới hiểu được nội dung;
- text quá nhỏ theo tỷ lệ web;
- quá nhiều card khiến slide giống dashboard;
- câu cụt kiểu nhãn nội bộ, khẩu hiệu quảng cáo hoặc lời nhận xét hời hợt.

Slide kỹ thuật vẫn phải đọc được trên máy chiếu:

- diagram là visual chính, không bị nhốt trong card quá nhỏ;
- body text đủ lớn;
- dùng nền phẳng hơn phía sau bảng, code, log và screenshot;
- màu trạng thái có thêm label/icon, không chỉ dựa vào màu;
- ảnh/screenshot phải crop đúng luận điểm và có annotation.
- câu dẫn phải là câu hoàn chỉnh, trung lập và phù hợp với bài bảo vệ khóa luận.

### 12.8. Structured placeholder và asset registry

Deck được phép giữ placeholder có chủ đích cho diagram/ảnh tùy biến phức tạp mà người dùng sẽ tự vẽ hoặc tự thay. Placeholder phải là **hợp đồng nội dung có cấu trúc (structured content contract)**, không phải một ô trống chỉ ghi “đặt ảnh ở đây”.

Phân loại visual:

- **AI tự dựng:** shape đơn giản, flow ngắn, bảng, callout, timeline, relationship nhỏ và visual không cần illustration riêng.
- **Tái sử dụng asset có sẵn:** ảnh/diagram trong repo đã được kiểm chứng và phù hợp trực tiếp với luận điểm.
- **Người dùng tự thay:** kiến trúc nhiều service, sequence/state diagram nhiều nhánh, Saga failure/compensation chi tiết, flow nghiệp vụ phức tạp, ảnh minh họa bên ngoài hoặc visual cần phong cách vẽ riêng.

Với nhóm người dùng tự thay, AI không cố tự vẽ cho đủ. AI phải tạo đúng vùng đặt visual, giữ layout hoàn chỉnh và gắn link tham chiếu ngay trên placeholder hoặc trong speaker notes.

Mỗi asset nên được quản lý trong một registry từ mã nguồn deck với tối thiểu các trường:

| Trường                    | Ý nghĩa                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `id`                      | Mã ổn định, ví dụ `SLIDE_ORDER_CONFIRM_SAGA`                                                   |
| `type`                    | `logo`, `diagram`, `screenshot`, `database-state`, `log`, `test-output`, `photo`              |
| `path`                    | Đường dẫn asset thật hoặc vị trí file người dùng sẽ thay                                       |
| `status`                  | `placeholder`, `user-replacement`, `ready`, `verified`                                         |
| `purpose`                 | Luận điểm hoặc invariant mà asset cần chứng minh                                                |
| `requiredContent`         | Node, actor, state, row, log line hoặc annotation bắt buộc phải xuất hiện                       |
| `sourceLinks`             | Danh sách URL hoặc repo-relative path tới ảnh, diagram source, code, test hoặc tài liệu liên quan |
| `replacementOwner`        | `agent` hoặc `user`                                                                            |
| `replacementInstructions` | Brief ngắn để người thay asset biết phải vẽ/chụp gì và giữ những thành phần nào                 |
| `aspectRatio`             | Tỉ lệ khung mong muốn để thay asset không làm vỡ layout                                         |
| `caption`                 | Caption hoặc thông điệp đọc nhanh trên slide                                                    |

Ví dụ về mô tả logic:

```js
const assets = {
  schoolLogo: {
    id: 'GLOBAL_SCHOOL_LOGO',
    type: 'logo',
    path: null,
    status: 'user-replacement',
    purpose: 'Nhận diện đơn vị đào tạo trên slide master',
    requiredContent: ['Logo chính thức của Trường Đại học Công nghệ Thông tin'],
    sourceLinks: ['Asset chính thức do người dùng cung cấp hoặc nguồn trường đã kiểm chứng'],
    replacementOwner: 'user',
    replacementInstructions:
      'Cung cấp logo UIT chính thức có nền trong suốt hoặc bản guideline cho nền tối.',
    aspectRatio: 'preserve',
  },
  schoolNameText: {
    id: 'GLOBAL_SCHOOL_NAME_TEXT',
    type: 'text',
    status: 'ready',
    purpose: 'Hiển thị tên trường như một thành phần text độc lập cạnh logo ở footer',
    requiredContent: ['TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN'],
    replacementOwner: 'agent',
    replacementInstructions:
      'Render bằng text box, không gộp vào ảnh logo; giữ kích thước nhỏ và tương phản vừa đủ.',
    aspectRatio: 'inline',
  },
  coverBackground: {
    id: 'GLOBAL_COVER_BACKGROUND',
    type: 'photo',
    path: 'apps/management-app/public/landing-hero-ambient.png',
    status: 'prototype',
    purpose: 'Ảnh nền cho bìa và section/conclusion slide',
    sourceLinks: ['Asset nội bộ QRTable hoặc ảnh khác do người dùng thay'],
    replacementOwner: 'user',
    replacementInstructions:
      'Có thể thay bằng ảnh F&B hoặc ảnh sản phẩm phù hợp; giữ tỉ lệ 16:9, vùng tối đủ cho chữ và kiểm tra quyền sử dụng.',
    aspectRatio: '16:9-cover',
  },
  orderConfirmSaga: {
    id: 'SLIDE_ORDER_CONFIRM_SAGA',
    type: 'diagram',
    path: null,
    status: 'user-replacement',
    purpose: 'Chứng minh invariant: không giữ confirmed order khi stock reservation/commit thất bại',
    requiredContent: [
      'Order gọi Catalog reserve stock',
      'Order commit',
      'Failure path',
      'Catalog compensation',
      'Idempotency boundary',
    ],
    sourceLinks: [
      'docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter5-order-confirm-stock.mmd',
      'docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-order-confirm-stock.pdf',
      'docs/graduation-thesis-resources/thesis-report/assets/test-evidence/appendix-d-order-saga-tests.txt',
      'docs/testing/phase-5/saga-validation-strategy.md',
    ],
    replacementOwner: 'user',
    replacementInstructions:
      'Tự vẽ sequence/state diagram theo Manus-like Academic Dark, giữ đủ happy path, failure path, compensation và idempotency boundary.',
    aspectRatio: '16:9-wide',
    caption: 'Order Confirm Saga và nhánh bù trừ khi xác nhận thất bại',
  },
};
```

Khi `path` chưa tồn tại hoặc `status` là `placeholder`/`user-replacement`, generator phải render một placeholder theo đúng theme đã duyệt. Vùng trình chiếu chỉ hiển thị:

- caption hoặc tên visual;
- một câu mô tả visual cuối cần chứng minh điều gì;
- các nhãn nội dung chính nếu cần để giữ bố cục;
- một link ngắn như `Mở nguồn sơ đồ` khi PowerPoint hỗ trợ hyperlink.

Asset ID, path đầy đủ, người thay asset, trạng thái và hướng dẫn chi tiết phải nằm trong speaker notes và `asset-registry.json`, không hiển thị như nội dung chính trên slide.

Placeholder phải đủ rõ để người dùng hoặc agent khác biết chính xác:

- cần chụp màn hình nào;
- cần vẽ diagram gì;
- cần query database table/row/state nào;
- cần giữ đoạn log hoặc test output nào;
- cần đánh dấu/annotation điểm gì trên hình.
- cần mở file/URL tham chiếu nào.

Quy tắc link:

- Nếu có URL ổn định, đặt hyperlink với nhãn ngắn như `Mở ảnh tham chiếu` hoặc `Mở tài liệu nguồn`; không in URL dài lên slide.
- Nếu nguồn nằm trong repo, lưu repo-relative path trong asset registry và hiển thị nhãn/path rút gọn trên placeholder hoặc speaker notes.
- Nếu có nhiều nguồn, ưu tiên link tới diagram source hiện có, hình render trong report, code/test xác minh và canonical technical doc.
- Không tải rồi nhúng ảnh bên ngoài chưa rõ quyền sử dụng chỉ để lấp placeholder.

Quy trình thay asset:

1. Người dùng chuẩn bị file thật theo brief và link tham chiếu của registry.
2. Đặt file vào đúng `path` hoặc thư mục asset ổn định đã quy định.
3. Cập nhật `path` và chuyển trạng thái sang `ready`.
4. Generate lại PPTX/PDF.
5. Sau visual/content QA, chuyển trạng thái sang `verified`.

Không mở PPTX để thay ảnh thủ công như workflow chính. Việc sửa tay trong PowerPoint chỉ là phương án khẩn cấp và phải được backfill vào source nếu deck còn được generate lại.

Quy tắc riêng:

- Logo trường là asset toàn cục: thay một `path` phải cập nhật toàn bộ slide master.
- Logo trường và text tên trường là hai phần độc lập trong footer; thay logo không được làm mất hoặc rasterize dòng tên trường.
- Ảnh nền cover/section là asset toàn cục riêng. Nếu đang dùng ảnh prototype, registry phải ghi `prototype`; ảnh này không được xem là evidence của hệ thống.
- Không tự vẽ diagram phức tạp chỉ để xóa placeholder. Diagram người dùng tự thay phải có source links và brief đủ chi tiết.
- Nếu diagram có source reviewable như `.mmd`, `.svg`, `.excalidraw` hoặc PDF render trong report, phải link tới source/artifact đó.
- Screenshot UI phải ghi rõ route, actor, demo state, vùng crop và annotation.
- Database evidence phải ghi rõ database/service owner, table/collection, row/state cần thấy và dữ liệu nhạy cảm phải che.
- Log/test evidence phải ghi rõ command, test case/invariant và dòng output cần giữ; không dùng log dài không có điểm nhấn.
- Placeholder chung chung không được xuất hiện trong deck bàn giao.
- Placeholder `user-replacement` có brief/link đầy đủ được phép xuất hiện trong deck AI bàn giao, nhưng không được tính là evidence thật. Người dùng sẽ thay visual trước bản trình chiếu cuối cùng.

### 12.9. Quy trình QA bắt buộc khi thực thi

1. Generate PPTX từ source.
2. Extract text để kiểm tra thiếu nội dung, typo và slide order.
3. Kiểm tra asset registry: không còn placeholder chung chung hoặc thiếu link/brief. `user-replacement` được phép còn lại nếu đúng chủ đích và có đủ metadata.
4. Export PPTX sang PDF.
5. Render từng slide thành ảnh.
6. Kiểm tra overflow, overlap, margin, contrast, font fallback, logo, diagram readability và projector readability.
7. Thực hiện ít nhất một vòng fix-and-rerender.
8. Chỉ sau QA mới freeze PDF dự phòng.

## 13. Appendix deck đề xuất

Các slide appendix không tính vào 20-25 phút, nhưng nên có để trả lời câu hỏi phản biện.

Gợi ý appendix:

- Service boundary chi tiết.
- Database ownership per service.
- Permission/RBAC matrix.
- Tenant isolation flow.
- Order Confirm Saga sequence chi tiết.
- Kafka topic/event map.
- Redis usage map.
- Payment/VietQR/SePay flow.
- Traceability matrix rút gọn.
- Limitations và future work chi tiết.

## 14. Prompt thực thi nếu cần mở lại phiên tạo slide

Copy prompt dưới đây khi cần mở lại phiên tạo slide hoặc generate lại artifact từ source:

```text
Bạn đang làm việc trong repo QRTable. Trước khi trả lời hoặc chỉnh sửa, hãy dùng CodeGraph trước để nắm trạng thái codebase hiện tại.

Mục tiêu của session này là triển khai defense deck cho khóa luận tốt nghiệp QRTable theo plan đã chốt. Deck gồm PPTX bản chính, PDF bản dự phòng, mục tiêu 30 slide chính và cho phép 26-30 slide sau QA cho 20-25 phút trình bày. Demo không nằm trong 20-25 phút.

Trước khi dựng deck, hãy tạo implementation plan ngắn cho source deck/PPTX/PDF, asset registry, appendix và QA. Sau đó triển khai theo plan nếu không phát hiện blocker.

Đầu ra phải là deck hoàn chỉnh về nội dung, bố cục, theme, speaker notes và appendix; không bàn giao wireframe/storyboard rỗng. Với diagram/ảnh tùy biến phức tạp mà người dùng sẽ tự vẽ hoặc tự thay, không tự vẽ. Hãy tạo placeholder `user-replacement` đúng kích thước, có caption, brief, source links và hyperlink/path tham chiếu.

Quyết định định dạng và visual đã chốt:
- Source of truth là mã nguồn sinh PPTX; PPTX là bản trình bày chính và PDF được export từ PPTX làm bản dự phòng.
- Không dùng LaTeX Beamer làm source slide chính.
- Visual direction: Manus-like Academic Dark theo bộ preview đã duyệt.
- Theme dùng nền zinc tối, cyan #22D3EE, emerald #34D399, amber/rose cho cảnh báo và lỗi, lề lớn, typography lớn, card phẳng và khoảng trắng rõ.
- Typography ưu tiên Plus Jakarta Sans + IBM Plex Mono, có kiểm tra font/fallback.
- Logo Trường Đại học Công nghệ Thông tin xuất hiện qua slide master, nhưng chỉ dùng asset chính thức đã được cung cấp hoặc kiểm chứng; không tự tạo logo giả.
- Asset chưa có phải dùng structured placeholder trong source code, không thay ảnh thủ công trong PPTX như workflow chính.
- Mỗi placeholder phải ghi asset ID, loại, mục đích cần chứng minh, nội dung bắt buộc, source links, người thay asset, hướng dẫn thay, tỉ lệ khung, caption và trạng thái `placeholder/user-replacement/ready/verified`.
- Khi asset thật có sẵn, cập nhật path/status trong asset registry rồi generate lại PPTX/PDF; placeholder không được xem là evidence thật.
- AI chỉ tự dựng visual đơn giản bằng shape PowerPoint. Kiến trúc nhiều service, sequence/state diagram nhiều nhánh, Saga failure/compensation chi tiết, flow phức tạp hoặc ảnh minh họa riêng phải dùng `user-replacement` để người dùng tự vẽ/thay.

Quyết định nội dung đã chốt:
- Mục tiêu 30 slide chính; cho phép 26-30 slide sau QA cho 20-25 phút.
- Demo riêng khoảng 5-7 phút, một golden flow chính: QR → Cart → Order → KDS → Payment.
- Có appendix để trả lời phản biện; appendix không tính vào thời lượng chính.
- Không đưa SaaS onboarding vào slide chính hoặc appendix.
- Saga chỉ đào sâu Order Confirm Saga.
- Slide chính dùng evidence matrix rút gọn; chi tiết test output, DB state, log/trace và bảng kỹ thuật đưa vào appendix hoặc backup.
- Nếu thiếu logo UIT chính thức hoặc evidence asset thật khi dựng deck, dùng structured placeholder trong source; không xem placeholder là asset final.

Hãy đọc theo thứ tự:
1. AGENTS.md
2. docs/graduation-thesis-resources/thesis-workflow-plan.md
3. docs/graduation-thesis-resources/thesis-defense-deck-methodology-plan.md

Không dùng cấu trúc Chương 1 đến Chương 7 của report làm thứ tự slide mặc định. Slide phải đi theo narrative đã thảo luận trong plan defense deck.

Sau ba file trên, bắt buộc đọc nhóm metadata và phạm vi chính thức:
- docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex
- docs/graduation-thesis-resources/thesis-report/frontmatter/cover.tex
- docs/graduation-thesis-resources/thesis-report/frontmatter/abstract.tex
- docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
- docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex

`undergraduate-theses-report.tex` là nguồn canonical cho tên đề tài, tên tiếng Anh, sinh viên, MSSV, khoa, ngành, giảng viên hướng dẫn và năm. Không lấy metadata từ slide prototype hoặc tự điền theo trí nhớ. Không cần đọc tuyến tính toàn bộ report ngay từ đầu; đọc Chương 3-6 theo cụm slide kỹ thuật đang triển khai.

Sau ba file bắt buộc, chỉ đọc thêm theo câu hỏi đang xử lý:

- Khi cần biết hệ thống thực sự hiện thực như thế nào:
  1. Dùng CodeGraph để định vị service, flow, guard, test hoặc dependency liên quan.
  2. Dùng docs/README.md và docs/DOC-CODE-ANCHORS.md để tìm canonical doc/code path.
  3. Chỉ đọc source code, tests, config và technical docs trực tiếp liên quan; không audit toàn bộ repo.

- Khi refine visual system hoặc chuẩn bị implementation plan cho deck, đọc:
  - apps/management-app/src/app/landing-fonts.ts
  - apps/management-app/src/features/landing/landing.module.css
  - apps/management-app/src/features/landing/hero-section.tsx
  - apps/management-app/src/features/landing/hero-saas-qr-emblem.tsx
  - apps/management-app/src/features/landing/data-flow-section.tsx
  - apps/management-app/src/features/landing/workflow-section.tsx
  - apps/management-app/src/features/landing/metrics-section.tsx
  - apps/management-app/src/features/landing/payment-section.tsx

- Khi cần đánh giá mức bằng chứng:
  - docs/testing/phase-5/traceability-matrix.md
  - docs/testing/phase-5/saga-validation-strategy.md nếu liên quan Saga/consistency/failure.
  - docs/phases/phase-5-7-finalization.md nếu liên quan implementation gap, deferred scope hoặc trạng thái Phase 5-7.

- Khi cần nội dung học thuật, citation, phạm vi hoặc visual đã có trong report, chỉ đọc chương LaTeX liên quan:
  - docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
  - docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex
  - docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex
  - docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex
  - docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex
  - docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex

Vai trò của từng nguồn:
- Plan defense deck quyết định narrative và thứ tự slide.
- Code, tests và runtime/config xác minh hệ thống thực sự làm gì.
- Canonical technical docs giải thích boundary, contract và quyết định kiến trúc.
- Report cung cấp nội dung học thuật, citation, phạm vi chính thức và asset; report không phải kịch bản slide.

Nếu report mâu thuẫn với code/test:
- Không âm thầm chọn một bên.
- Ghi rõ contradiction hoặc document drift.
- Dùng code/test để xác định implementation hiện tại.
- Không sửa report trong session này nếu người dùng chưa yêu cầu.

Các artifact slide cũ trong docs/presentations chỉ để tham khảo, không xem là final.

Hãy dùng các skill khi phù hợp:
- $zoom-out để nhìn hệ thống ở mức actor/domain/use case.
- $grill-with-docs để audit assumption, contradiction, reviewer-style questions.
- $writing-plans để tạo implementation plan ngắn trước khi dựng source deck/PPTX/PDF.
- $pptx khi bắt đầu tạo/sửa/QA PowerPoint.
- $doc-coauthoring nếu cần refine cấu trúc tài liệu.
- Context7/ctx7 chỉ khi cần docs hiện hành của library/framework/API/CLI/cloud service.

Yêu cầu phong cách:
- Trả lời chủ yếu bằng tiếng Việt.
- Khi dùng thuật ngữ kỹ thuật, ưu tiên dạng tiếng Việt kèm tiếng Anh trong ngoặc, ví dụ: “tính nhất quán cuối cùng (eventual consistency)”, “bất biến hệ thống (system invariant)”.
- Không invent citation, không thêm nguồn giả, không sửa references.bib nếu chưa kiểm chứng nguồn.
- Không overclaim các phần chưa có evidence, đặc biệt Saga live fault injection, performance/load test, production readiness, exactly-once messaging.

Hướng narrative cần giữ:
1. Từ nghiệp vụ đến bài toán kiến trúc.
2. Từ yêu cầu đến quyết định kiến trúc.
3. Dùng cấu trúc lập luận kỹ thuật: thách thức → bất biến → quyết định thiết kế → logic hoạt động → hiện thực → bằng chứng.
4. QRTable giải quyết từng thách thức microservices.
5. Chứng minh triển khai và tích hợp bằng UI demo + database/state + logs/traces + automated tests + traceability.
6. Kết luận trung thực về đóng góp và hạn chế.

Quyết định nội dung đã chốt:
- Đây là defense deck kỹ thuật phần mềm, tập trung vào thiết kế hệ thống, mẫu kiến trúc, mẫu thiết kế và đánh đổi; không nghiên cứu hóa cách diễn đạt.
- Mỗi cụm kỹ thuật phải giải thích nguyên lý/cơ chế và logic hoạt động ngay trước hoặc ngay trong phần QRTable áp dụng cơ chế đó.
- Không đưa SaaS onboarding vào slide chính hoặc appendix.
- Saga chỉ đào sâu một trường hợp chính là Order Confirm Saga, gồm cơ sở giao dịch phân tán, logic điều phối/bù trừ và evidence hiện có.

Nhiệm vụ trong session mới:
- Tạo implementation plan ngắn trước khi dựng deck.
- Dựng source deck sinh PPTX theo outline mục tiêu 30 slide trong `thesis-defense-deck-methodology-plan.md`; cho phép 26-30 slide sau QA.
- Hoàn thiện nội dung, bố cục, theme, speaker notes và appendix cho toàn bộ deck; không dừng ở storyboard/wireframe.
- Tạo/duy trì asset registry và structured placeholder cho logo, diagram, screenshot, DB state, log và test output.
- Với visual phức tạp do người dùng tự thay, tạo placeholder `user-replacement` có hyperlink/source path, brief, kích thước và caption; không tự vẽ.
- Generate PPTX bản chính và PDF bản dự phòng.
- Tạo appendix/backup slides theo plan, không tính vào 20-25 phút.
- QA text order, overflow, font, contrast, asset placeholder và PDF export.
- Không biến outline thành bản tóm tắt tuần tự của report.
- Với mỗi claim kỹ thuật quan trọng chưa được reconcile rõ, đối chiếu code/test/docs thực tế và chỉ đọc đúng phạm vi cần thiết.
- Khi triển khai visual, bám bộ preview Manus-like Academic Dark; kiểm tra deck không biến thành product pitch hoặc dashboard: không CTA, không pricing pattern, không glow và không card density quá cao.
```

## 15. Trạng thái thực thi

Plan đã được triển khai thành artifact slide chính thức ngày 2026-06-16:

- Số slide chính đã chốt: 30.
- Appendix đã triển khai: 10 slide, không tính vào thời lượng trình bày chính.
- Demo riêng đã chốt: một golden flow khoảng 5-7 phút, không tính vào 20-25 phút.
- Danh sách cơ chế bắt buộc đã chốt ở §2.
- Visual direction đã chốt: Manus-like Academic Dark theo bộ preview đã duyệt ngày 2026-06-16.
- Slide master đã chốt ba asset toàn cục: logo trường, text tên trường độc lập ở góc dưới và ảnh nền cho cover/section.
- SaaS onboarding bị loại khỏi deck chính và appendix.
- Order Confirm Saga là Saga chính để đào sâu.
- Source of truth: `docs/presentations/qrtable-defense-deck/src/qrtable-defense-deck-source.mjs`.
- PPTX chính: `docs/presentations/qrtable-defense-deck/output/qrtable-defense-deck.pptx`.
- PDF dự phòng: `docs/presentations/qrtable-defense-deck/output/qrtable-defense-deck.pdf`.
- Asset registry: `docs/presentations/qrtable-defense-deck/output/asset-registry.json`.
- QA đã xác nhận 40 slide, 40 speaker notes, PDF 40 trang và PPTX không lỗi cấu trúc.

Các việc còn lại là thay hiện vật thật, không phải dựng lại deck:

- Thu hoặc thay logo UIT chính thức trước bản final; dùng structured placeholder nếu chưa có.
- Có thể thay ảnh nền prototype bằng ảnh F&B/QRTable phù hợp trước bản final; phải giữ overlay tối và kiểm tra quyền sử dụng.
- Reconcile traceability/permission/Phase 7 wording trước khi freeze slide evidence.
- Deck AI bàn giao được phép giữ placeholder `user-replacement` cho visual phức tạp nếu có đủ link/brief; người dùng sẽ tự vẽ và thay trước bản trình chiếu cuối cùng.
- Placeholder cho screenshot, database state, log/trace và test output không được dùng như bằng chứng final cho đến khi đã thay bằng asset thật.
- Export PDF từ PPTX đã QA; không tạo deck PDF riêng bằng LaTeX.

Khi thay asset, phải cập nhật source/registry rồi generate lại PPTX/PDF và rerun QA; không chỉnh tay PPTX như source chính.
