# Kế hoạch điều phối viết khóa luận QRTable

> Tài liệu sống dùng để chống mất ngữ cảnh khi thread bị compact hoặc khi một AI agent khác tiếp tục công việc.
> Cập nhật gần nhất: 2026-06-05 (chốt phương án phân tầng UI gallery/screenshot; Chương 4 đã audit theo policy song ngữ §3.2).

## 1. Mục tiêu

Xây dựng bản khóa luận tốt nghiệp tiếng Việt cho đề tài:

- Tên tiếng Việt: Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR dựa trên kiến trúc vi dịch vụ.
- Tên tiếng Anh: Research on the Development of a SaaS-Based POS Platform Integrating QR Code Ordering under a Microservices Architecture.

Bản khóa luận cần có dáng của một công trình software engineering: có bối cảnh, cơ sở lý thuyết, phân tích yêu cầu, thiết kế kiến trúc, triển khai hệ thống, đánh giá có kiểm soát claim, kết luận và hướng phát triển. Không viết như README sản phẩm hoặc nhật ký implementation.

## 2. Agent Start Checklist

Trước khi làm tiếp bất kỳ phần nào của khóa luận, agent phải đọc theo thứ tự:

1. `AGENTS.md` ở root repo để nắm quy ước làm việc.
2. `docs/graduation-thesis-resources/thesis-workflow-plan.md` để biết trạng thái hiện tại và bước tiếp theo — **đặc biệt §3.2** nếu công việc liên quan biên tập ngôn ngữ các chương `.tex`.
3. `docs/graduation-thesis-resources/thesis-official-outline.md` để biết cấu trúc chương, page budget và artifact plan.
4. `docs/graduation-thesis-resources/thesis-evidence-map.md` để kiểm soát evidence, implementation state và overclaim.
5. `docs/graduation-thesis-resources/presentation-format-graduation-thesis.md` để tuân thủ hình thức trình bày.
6. `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex` nếu công việc liên quan đến LaTeX.
7. `docs/graduation-thesis-resources/thesis-artifact-backlog.md` nếu công việc liên quan đến diagram, bảng, screenshot hoặc phụ lục.
8. `docs/graduation-thesis-resources/thesis-agent-prompt-bank.md` nếu cần prompt mẫu cho session mới hoặc phase con tiếp theo.

Nếu công việc liên quan đến implementation, architecture hoặc evaluation, đọc thêm:

- `docs/README.md`
- `docs/DOC-CODE-ANCHORS.md`
- `docs/technical-architecture.md`
- `docs/business-logic.md`
- `docs/architecture/permission-matrix.md`
- `docs/testing/phase-5/traceability-matrix.md`
- `docs/testing/phase-5/phase-5-handoff.md`
- `docs/testing/phase-5/saga-validation-strategy.md` nếu công việc chạm đến Saga, consistency hoặc Chương 5/6.
- `docs/guides/sepay-configuration-guide-phase3.md`

## 3. Nguyên tắc không được quên

1. Viết tài liệu khóa luận bằng tiếng Việt học thuật, rõ ràng, không quảng cáo.
2. Khóa luận viết bằng **tiếng Việt học thuật** làm ngôn ngữ chính; thuật ngữ tiếng Anh chỉ dùng khi đúng nghĩa kỹ thuật hoặc đã là chuẩn ngành. Chi tiết bắt buộc đọc **§3.2 Chính sách song ngữ tiếng Việt – tiếng Anh** trước khi biên tập bất kỳ chương `.tex` nào.
3. Thesis proposal chỉ là định hướng ban đầu. Khi viết về hệ thống thực tế, ưu tiên source code, tests và canonical docs.
4. Không viết phần “điều chỉnh implementation so với proposal ban đầu” trong khóa luận gửi giảng viên.
5. Không đưa nguyên văn `TODO`, `implementation-gap`, `deferred`, `Phase X chưa làm` vào bản gửi giảng viên; các ghi chú đó chỉ nằm ở tài liệu nội bộ.
6. Không tự tạo service name, endpoint, database table, Kafka topic, benchmark number, performance claim hoặc security claim nếu chưa có bằng chứng.
7. Chương 6 phải phân biệt claim đã kiểm chứng bằng test/demo, claim được hỗ trợ bởi thiết kế/kiến trúc, và hướng phát triển.
8. Với server demo nhỏ, không claim stress test, high availability, production-ready, chaos engineering hoặc observability production-grade.
9. Diagram/bảng trong chương chính phải phục vụ lập luận; screenshot đầy đủ nên đưa vào phụ lục.
10. Mỗi hình, bảng, sơ đồ, screenshot phải có caption, số hiệu theo chương và nguồn.

## 3.1. Nguyên tắc chia nhỏ session

Để tránh tràn context window và tránh agent làm quá rộng, mỗi session chỉ nên có một output chính. Nếu một phase có nhiều loại việc khác nhau như audit, thiết kế pipeline, tìm nguồn, viết nội dung, tạo diagram hoặc build PDF, phải tách thành các phase con.

Quy tắc thực hành:

1. Mỗi session bắt đầu bằng việc đọc `Agent Start Checklist`, sau đó chỉ đọc thêm tài liệu thật sự cần cho phase con hiện tại.
2. Mỗi session cần có phạm vi âm rõ ràng: ghi rõ những việc không làm trong session đó.
3. Không trộn việc “chuẩn bị hạ tầng” với “viết nội dung dài”.
4. Không trộn việc “tìm nguồn/citation” với “draft chương” nếu source backbone chưa ổn.
5. Không trộn việc “audit implementation evidence” với “viết chương” nếu chưa chốt claim/evidence.
6. Cuối mỗi session phải cập nhật `Current Status`, `Next Concrete Step`, `Open Questions`, `Risks / Do Not Forget` trong file này.

## 3.2. Chính sách song ngữ tiếng Việt – tiếng Anh

> Mục này ghi lại thỏa thuận giữa người viết và agent sau nhiều vòng audit Chương 4. Mục đích: tránh hai cực đoan — **Việt hóa quá tay** các thuật ngữ IT chuẩn, hoặc **lạm dụng tiếng Anh** trong prose mô tả khi tiếng Việt đã đủ rõ. Chương 4 (`04-thiet-ke-va-kien-truc-he-thong.tex`) là **mẫu tham chiếu** sau phiên cân bằng 2026-06-05.

### 3.2.1. Nguyên tắc tổng quát

1. **Prose (đoạn văn) mặc định là tiếng Việt.** Câu phải đọc trôi chảy cho độc giả Việt (giảng viên, hội đồng), không đọc như bản dịch máy xen lẫn tiếng Anh không cần thiết.
2. **Giữ nguyên tiếng Anh** khi từ đó là tên công nghệ, tên vai trò trong mã nguồn, pattern name, hoặc thuật ngữ IT mà dịch sang tiếng Việt làm **mất nghĩa kỹ thuật** hoặc **không còn là thuật ngữ chuẩn** trong sách giáo trình/ngành.
3. **Việt hóa** khi từ tiếng Anh chỉ mô tả **tính chất, vai trò, hành vi** trong hệ thống mà tiếng Việt diễn đạt được rõ và tự nhiên hơn.
4. **Song ngữ lần đầu** khi còn phân vân: chọn một trong hai làm từ chính, mở ngoặc bản còn lại **một lần** trong cùng chương hoặc đoạn giới thiệu khái niệm; các lần sau chỉ dùng từ chính, không lặp ngoặc.
5. **Không lạm dụng ngoặc.** Chỉ dùng khi thuật ngữ mới, dễ hiểu nhầm, hoặc cần đối chiếu với tài liệu/mã nguồn tiếng Anh. Không ghi `(tiếng Anh)` sau mọi từ kỹ thuật.
6. **Mã nguồn và identifier** luôn giữ nguyên trong `\texttt{...}`: tên topic Kafka, khóa Redis, enum wire, tên bảng/cột, route webhook, v.v.
7. **Prose nghiệp vụ** ưu tiên `đơn vị thuê bao` thay `tenant`; không Việt hóa tên dịch vụ/stack (`Order`, `Catalog`, `BFF`, `Kafka`, `Redis`, `Keycloak`, …).
8. **Giọng luận văn, không giọng audit nội bộ.** Khóa luận mô tả **thiết kế và quyết định kiến trúc** như kết quả có chủ đích của đề tài, không viết như biên bản đối chiếu codebase. **Cấm** các cụm: `theo trạng thái mã nguồn hiện tại`, `được hiểu như`, `cần được trình bày như`, `theo audit`, `module registration`, `trong audit hiện tại`, `không thay thế mã nguồn làm nguồn sự thật`. Thay bằng: `được thiết kế`, `QRTable áp dụng`, `trong kiến trúc này`, `theo thiết kế entity/schema`, `mô hình đọc tổng hợp`.

### 3.2.2. Ba lớp từ — cách xử lý

| Lớp                          | Định nghĩa                                                                                | Cách viết                                                                   | Ví dụ                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Giữ tiếng Anh**        | Thuật ngữ IT/pattern name đã là chuẩn; tên công nghệ; vai trò lập trình                   | Giữ EN; có thể song ngữ lần đầu nếu độc giả Việt có thể chưa quen           | `repository`, `interface`, `controller`, `service`, `module`, `guard`, `DTO`, `commit`, `contract`, `payload`, `snapshot`, `consistency`, `idempotency`, `retry`, `aggregate`, `transactional outbox`, `saga pattern`, `Mini-saga`, `frontend`, `backend`, `client`, `Producer`, `Consumer`, `WebSocket`, `BFF`, `RBAC`, `outbox`                                                                             |
| **B — Việt hóa trong prose** | Mô tả tính chất, vai trò hệ thống, luồng nghiệp vụ; từ “văn xuôi” không phải pattern name | Dùng tiếng Việt; chỉ thêm EN trong ngoặc lần đầu nếu cần đối chiếu tài liệu | `nguồn sự thật`, `chủ sở hữu` / `dịch vụ sở hữu`, `bộ nhớ đệm`, `khi vận hành`, `bền vững`, `tiêu thụ` / `xuất bản` (sự kiện), `làm mất hiệu lực`, `khử trùng`, `vòng đời`, `đường xử lý tần suất cao`, `luồng`, `bằng chứng kiểm chứng`, `hiện thực`                                                                                                                                                         |
| **C — Song ngữ lần đầu**     | Thuật ngữ vừa là chuẩn IT vừa cần giải thích cho độc giả Việt                             | `Thuật ngữ chính (bản dịch/gốc)` lần đầu; sau đó chỉ dùng thuật ngữ chính   | `idempotency (tính lũy đẳng)`, `nguồn sự thật (source of truth)`, `bên phát (Producer)`, `bên tiêu thụ (Consumer)`, `nhất quán cuối cùng (eventual consistency)`, `tác dụng phụ (side effect)`, `hợp đồng (contract)`, `khóa ngoại (foreign key)`, `tham chiếu bên ngoài (external reference)`, `khởi tạo đơn vị thuê bao (onboarding)`, `quyền lợi gói (entitlement)`, `đường xử lý tần suất cao (hot path)` |

**Quy tắc chọn từ chính trong lớp C:** nếu từ là pattern name hoặc thuật ngữ hay gặp trong tài liệu kỹ thuật tiếng Anh → từ chính là tiếng Anh, ngoặc tiếng Việt. Nếu khái niệm mô tả nghiệp vụ dễ hiểu hơn bằng tiếng Việt → từ chính là tiếng Việt, ngoặc tiếng Anh (ví dụ `nguồn sự thật (source of truth)`).

### 3.2.3. Các cặp từ dễ sai — bắt buộc tuân thủ

Đây là các phản hồi trực tiếp từ người viết; agent **không được** tự ý đảo ngược.

| Sai / tránh                                                 | Đúng                                                                      | Ghi chú                                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `giao diện` khi ý là app phía người dùng                    | `client`                                                                  | Ví dụ: `client khách`, `client quản trị`, `làm mới client`, `phía client`. **Client** là thuật ngữ kiến trúc (ứng dụng/actor gọi API), không đồng nghĩa “giao diện đồ họa”. |
| `Giao diện chính` (cột bảng dịch vụ) khi ý là HTTP/TCP/gRPC | `Kênh giao tiếp chính`                                                    | Tránh nhầm với UI.                                                                                                                                                          |
| `repository` → “kho dữ liệu”                                | `repository`                                                              | Giữ EN; có thể “lớp repository” nếu cần.                                                                                                                                    |
| `consistency` → chỉ “tính nhất quán” mọi chỗ                | `consistency` hoặc `nhất quán (consistency)` lần đầu                      | Pattern name; không Việt hóa hoàn toàn trong ngữ cảnh phân tán.                                                                                                             |
| `Owner`, `source of truth` rải rác trong prose              | `chủ sở hữu`, `dịch vụ sở hữu`, `nguồn sự thật`                           | Có thể `nguồn sự thật (source of truth)` lần đầu.                                                                                                                           |
| `durable`, `durable database`                               | `bền vững`, `CSDL bền vững`                                               | Không dùng `durable` trong prose tiếng Việt.                                                                                                                                |
| `runtime`, `runtime state` trong prose                      | `khi vận hành`, `trạng thái khi vận hành`                                 | Giữ `runtime` chỉ khi là tên kỹ thuật cố định trong code/config.                                                                                                            |
| `cache` trong prose mô tả                                   | `bộ nhớ đệm`                                                              | Giữ `cache` trong tên khóa Redis hoặc khi nói về pattern cache.                                                                                                             |
| `consume` / `publish` trong prose                           | `tiêu thụ` / `xuất bản`                                                   | Giữ `Producer`/`Consumer` khi nói vai trò Kafka; prose dùng `bên phát`/`bên tiêu thụ` hoặc song ngữ lần đầu.                                                                |
| `invalidate` trong prose                                    | `làm mất hiệu lực`                                                        |                                                                                                                                                                             |
| `Public menu cache`, `Session runtime` (nhãn bảng)          | `Bộ nhớ đệm thực đơn công khai`, `Phiên khi vận hành`                     | Header bảng ưu tiên tiếng Việt + giữ thuật ngữ kỹ thuật khi cần (`Payload`, `idempotency`).                                                                                 |
| `Case study KDS` (tiêu đề mục)                              | `Ví dụ minh họa KDS` hoặc tương đương tiếng Việt                          | `KDS` giữ nguyên vì là tên module.                                                                                                                                          |
| `tenant` trong prose mô tả                                  | `đơn vị thuê bao`                                                         | Giữ `tenantId` / `tenant_id` trong mã.                                                                                                                                      |
| `payment record` trong prose                                | `bản ghi thanh toán`                                                      |                                                                                                                                                                             |
| `database ownership` trong prose                            | `quyền sở hữu cơ sở dữ liệu`                                              | Giữ `service boundary` hoặc `ranh giới dịch vụ` tùy ngữ cảnh.                                                                                                               |
| `Theo trạng thái mã nguồn hiện tại, … được hiểu như`        | `… được thiết kế theo …` / `QRTable áp dụng mô hình …`                    | Luận văn nói về **thiết kế**, không phải snapshot audit repo.                                                                                                               |
| `Điểm này cần được trình bày như`                           | Viết trực tiếp (ví dụ `Thiết kế này nằm ở lớp BFF, guard và mô hình đọc`) | Câu meta hướng dẫn viết — chỉ thuộc plan nội bộ, không vào `.tex`.                                                                                                          |
| `theo audit từ module registration`                         | `theo thiết kế entity/schema của từng dịch vụ`                            |                                                                                                                                                                             |
| `trong audit hiện tại`                                      | `trong kiến trúc này` / `trong phạm vi thiết kế`                          |                                                                                                                                                                             |

### 3.2.4. Bảng, tiêu đề mục và caption

1. **Tiêu đề `\section`/`\subsection`:** ưu tiên tiếng Việt; chỉ giữ tiếng Anh cho tên riêng không dịch (`Kafka`, `Redis`, `KDS`, `SePay`, `Nx monorepo` có thể `Tổ chức Nx monorepo`).
2. **Header bảng:** tiếng Việt cho cột mô tả (`Chủ sở hữu`, `Mẫu khóa`, `Nguồn sự thật`, `Bên phát`, `Bên tiêu thụ`); giữ EN cho trường kỹ thuật quen thuộc (`Payload`, `Topic`, `consistency`, `idempotency`) hoặc song ngữ gọn (`Độ tin cậy / idempotency`).
3. **Caption hình:** tiếng Việt; tên công nghệ/dịch vụ giữ EN.
4. **Không** Việt hóa tên pattern trong lập luận kiến trúc: `transactional outbox`, `Mini-saga`, `saga pattern` — có thể thêm giải thích tiếng Việt bên cạnh lần đầu.

### 3.2.5. Hai lỗi đã xảy ra — agent phải tránh lặp lại

| Lỗi                    | Biểu hiện                                                                                                                                                | Hướng sửa                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Việt hóa quá tay**   | `repository` → kho dữ liệu; `Producer` → bên phát (xóa hẳn EN); `consistency` → chỉ “tính nhất quán”; header bảng toàn tiếng Việt không còn thuật ngữ IT | Khôi phục thuật ngữ lớp A; chỉ Việt hóa lớp B |
| **Lạm dụng tiếng Anh** | `durable`, `Owner`, `source of truth`, `Public menu cache`, `consume`/`publish`, `Case study`, `invalidate`, `lifecycle` đơn lẻ trong prose              | Việt hóa lớp B; song ngữ lớp C lần đầu        |
| **Dịch sai nghĩa**     | `client` → `giao diện`; `Giao diện chính` cho cột protocol                                                                                               | Dùng `client`, `kênh giao tiếp chính`         |

### 3.2.6. Checklist nhanh trước khi merge chỉnh ngôn ngữ

- Đoạn văn đọc được như khóa luận tiếng Việt, không như README tiếng Anh?
- Các pattern name (`idempotency`, `consistency`, `transactional outbox`, `Mini-saga`, `repository`, `contract`, …) còn đúng nghĩa kỹ thuật?
- Không còn `giao diện` khi ý là `client`?
- Prose không còn `durable`, `Owner`, `invalidate`, `consume`/`publish` thuần EN khi đã có bản Việt ở §3.2.3?
- Ngoặc song ngữ chỉ xuất hiện lần đầu, không lặp mỗi câu?
- `\texttt{...}` và tên topic/khóa/enum vẫn khớp mã nguồn?
- `đơn vị thuê bao` thay `tenant` ở prose; `tenantId` giữ trong mã?
- Build LaTeX pass sau khi sửa?

### 3.2.7. Phạm vi áp dụng và thứ tự audit đề xuất

- **Đã audit theo policy này:** Chương 4 (`04-thiet-ke-va-kien-truc-he-thong.tex`), 2026-06-05.
- **Cần audit lại theo policy này:** Chương 5–7 (các phiên trước có thể Việt hóa quá tay hoặc chưa đồng bộ với Chương 4).
- **Khi session mới chỉ sửa ngôn ngữ:** đọc §3.2 trước; đối chiếu mẫu Chương 4; không đổi mức claim kỹ thuật, không thêm citation, không sửa `references.bib` trừ khi được yêu cầu.

## 4. Trạng thái hiện tại

| Hạng mục                    | Trạng thái                                                                                 | Ghi chú                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence map                | Đã có bản nền                                                                              | `thesis-evidence-map.md` đã chứa claim policy và source priority.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Official outline            | Đã có bản nền                                                                              | `thesis-official-outline.md` đã có 7 chương, page budget 105-130 trang và artifact plan phân tầng.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Format requirements         | Đã chuyển thành Markdown                                                                   | `presentation-format-graduation-thesis.md` là nguồn yêu cầu hình thức.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| LaTeX template              | Đã có bản preflight compile được                                                           | LaTeX project nằm trong `thesis-report/`; main file là `thesis-report/undergraduate-theses-report.tex`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| LaTeX compile               | Đã pass bằng XeLaTeX/TeX Live                                                              | Phiên 2026-06-05 thảo luận UI gallery: `xelatex` pass, PDF 132 trang; chưa chèn screenshot mới. Phiên security/auth/RBAC: `compile_latex.py --compiler texlive --engine xelatex --json` pass, PDF 131 trang; `.lot` xác nhận thêm Bảng 4.9-Bảng 4.11, Hình 4.15 security/auth giữ nguyên. Phiên trước: Kafka/Redis deepening — Hình 4.1-Hình 4.16, Bảng 4.1-Bảng 4.8. Log hiện chỉ còn overfull nhỏ quanh `kds.queue_changed`/`realtime:kds:*` ở phần Kafka/Redis cũ. `latexmk` có thể báo lỗi log corrupt; nếu gặp, xóa `undergraduate-theses-report.log` rồi chạy `xelatex` trực tiếp.                                                                                                                |
| Citation pipeline           | Đã nối kỹ thuật                                                                            | Main LaTeX dùng `biblatex` `style=ieee`, `backend=bibtex`, render từ `thesis-report/references.bib` và tách nhóm bằng keyword `vietnamese`; không bật `defernumbers` vì pipeline BibTeX/split bibliography đã sinh citation `[0]` khi Chương 2 bắt đầu dùng nhiều nguồn mới.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Source backbone             | Đã có bản nền                                                                              | `thesis-source-backbone.md` chứa source matrix cho Chương 1-2 và policy loại nguồn yếu khỏi bibliography ban đầu.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Chapter 3 audit             | Đã hoàn tất Phase 3A                                                                       | `chapter-03-requirement-evidence.md` chứa actor/domain/use case, FR/NFR evidence matrix, điểm cần kiểm chứng và gợi ý artifact P0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Artifact backlog            | Đã có bản nền                                                                              | `thesis-artifact-backlog.md` quản lý diagram, bảng, screenshot và phụ lục.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Prompt bank                 | Đã có bản nền                                                                              | `thesis-agent-prompt-bank.md` chứa prompt mẫu theo từng phase con để không phụ thuộc vào trí nhớ của một thread chat.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Nội dung chương             | Chương 2-7 đã có bản nháp nội dung được verify gần nhất; Chương 1/Abstract/phụ lục còn lại | `thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`, `03-phan-tich-yeu-cau.tex`, `04-thiet-ke-va-kien-truc-he-thong.tex`, `05-trien-khai-he-thong.tex`, `06-danh-gia.tex` và `07-ket-luan-va-huong-phat-trien.tex` đang có nội dung trong worktree. Chương 2 đã có Bảng 2.1-Bảng 2.6 và citation IEEE render đúng số; Chương 3 đã có Hình 3.1/Hình 3.2 và Bảng 3.1-Bảng 3.4 được verify; Chương 4 có Hình 4.1-Hình 4.16 (Hình 4.5-4.9 là schema DB per-service, Hình 4.14 là KDS Redis data structures), Bảng 4.1-Bảng 4.11; Phụ lục E không còn lặp schema. Chương 5 đã refactor theo Plan A, có Hình 5.1-Hình 5.5 và Bảng 5.1. Chương 6-7 đã audit/rerun theo Plan B, build pass. |
| Plan security/auth Chương 4 | Đã triển khai                                                                              | `chapter-04-security-auth-rbac-deepening-plan.md` đã được thực thi: section bảo mật/xác thực/phân quyền ở Chương 4 được chia thành các subsection về trust boundary, hai luồng xác thực, request context, RBAC--tenant isolation--plan entitlement, WebSocket/webhook và giới hạn claim; thêm Bảng 4.9-Bảng 4.11; giữ Hình 4.15 vì Mermaid hiện tại vẫn khớp. Chương 6 được gắn cross-reference ngắn tới các bảng mới, không mở rộng thành phần đánh giá dài.                                                                                                                                                                                                                                           |
| Technical Phase 4D sync     | Chương 3-7 đã backfill ở mức nội dung chính; screenshot/pilot artifact còn lại             | Ngày 2026-06-04, Chương 3 đã đồng bộ Dashboard/Reporting, staff management, Hình 3.1 và scope exclusion theo technical Phase 4D; Chương 4 đã bổ sung reporting ở mức BFF/guard/mô hình đọc, data ownership và các diagram kiến trúc/công nghệ liên quan; Chương 5 đã bổ sung dashboard/reporting theo gói, khung pilot và evidence table ngắn hơn. Plan B đã audit Chương 6-7 sau Plan A: Chương 6 phản ánh dashboard/reporting, entitlement, khung production/pilot và output Plan A; Chương 7 kết luận theo đúng mức evidence. Screenshot/demo thật và production/pilot artifact vẫn cần thu thập riêng nếu muốn dùng làm minh chứng cuối.                                                            |

## 5. Lộ trình tổng thể

| Phase    | Mục tiêu                                   | Output chính                                                                                                                         | Trạng thái                                                    |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Phase 0  | Khóa workflow và handoff context           | `thesis-workflow-plan.md`, `thesis-artifact-backlog.md`                                                                              | Hoàn tất bản nền                                              |
| Phase 1  | Ổn định hạ tầng LaTeX                      | Main `.tex` compile được trong `thesis-report/`, có cấu trúc `frontmatter/`, `chapters/`, `appendices/`, `assets/`, `references.bib` | Hoàn tất preflight nền                                        |
| Phase 2A | Citation infrastructure và build hygiene   | `biblatex`/IEEE/BibTeX pipeline, `.gitignore` cho LaTeX artifacts, `citation-pipeline.md`                                            | Hoàn tất nền kỹ thuật                                         |
| Phase 2B | Source backbone và initial references      | `thesis-source-backbone.md`, nguồn thật đầu tiên trong `thesis-report/references.bib`                                                | Hoàn tất bản nền                                              |
| Phase 3A | Audit source/docs cho Chương 3             | Requirement evidence matrix, nguồn nội bộ cần dùng cho Chương 3                                                                      | Hoàn tất audit                                                |
| Phase 3B | Draft Chương 3                             | Nội dung Chương 3 trong LaTeX, bám yêu cầu và evidence                                                                               | Hoàn tất bản nháp                                             |
| Phase 4A | Audit architecture evidence cho Chương 4   | Architecture claim/evidence matrix, diagram plan P0                                                                                  | Hoàn tất audit                                                |
| Phase 4B | Tạo diagram P0 cho Chương 4                | Overall architecture, C4/container, ownership, communication, multi-tenancy, Kafka decision flow                                     | Hoàn tất artifact P0                                          |
| Phase 4C | Draft Chương 4                             | Nội dung Chương 4 trong LaTeX, bám diagram/evidence                                                                                  | Hoàn tất bản nháp                                             |
| Phase 4D | Artifact coverage bổ sung cho Chương 3     | Hình 3.1 actor/use-case overview, Hình 3.2 business flow, cập nhật backlog và build verify                                           | Hoàn tất artifact P0                                          |
| Phase 4E | Polish Chương 4 theo quyết định công nghệ  | Đổi tên chương, thêm technology decision table, technology map và diagram con Nx/communication/Redis/security/payment                | Hoàn tất polish                                               |
| Phase 5A | Audit implementation evidence cho Chương 5 | Implemented evidence table, flow evidence, sequence diagram plan, screenshot plan                                                    | Hoàn tất audit                                                |
| Phase 5B | Tạo diagram P0 cho Chương 5                | 5 sequence diagram Mermaid source, render PDF, chèn vào LaTeX, build verify                                                          | Hoàn tất artifact P0                                          |
| Phase 5C | Draft Chương 5                             | Nội dung Chương 5 trong LaTeX, bám diagram/evidence Phase 5A–5B, không biến thành user manual                                        | Hoàn tất bản nháp                                             |
| Phase 5D | Screenshot/demo scaffold                   | Xác định screenshot cần có, tạo mapping/ref/placeholder trắng, chèn khung vào LaTeX để người viết thay ảnh thủ công                  | Chưa triển khai                                               |
| Phase 6A | Build evaluation tables/claim policy       | Traceability summary, NFR evidence table, limitation table                                                                           | Hoàn tất audit                                                |
| Phase 6B | Draft Chương 6                             | Nội dung Chương 6, đánh giá trung thực và không overclaim                                                                            | Hoàn tất bản nháp                                             |
| Phase 7A | Draft Chương 2                             | Cơ sở lý thuyết và related work dựa trên source backbone                                                                             | Hoàn tất bản nháp                                             |
| Phase 7B | Draft Chương 1                             | Mở đầu, bối cảnh, mục tiêu, phạm vi, đóng góp                                                                                        | Chưa làm                                                      |
| Phase 7C | Draft Chương 7, Abstract và phụ lục        | Kết luận, hướng phát triển, tóm tắt, phụ lục cần thiết                                                                               | Chương 7 đã audit/draft theo Plan B; Abstract/phụ lục còn lại |
| Phase 8A | Build/format/citation audit                | PDF build, format, citation, figure/table numbering                                                                                  | Chưa làm                                                      |
| Phase 8B | Reader/reviewer/overclaim audit            | Audit mạch lập luận, overclaim, blind spots và checklist phản biện                                                                   | Chưa làm                                                      |

## 6. Bước tiếp theo cụ thể

Ngày 2026-06-05, plan P1 cho phần security/auth/RBAC tại `docs/graduation-thesis-resources/chapter-04-security-auth-rbac-deepening-plan.md` đã được triển khai. Chương 4 hiện trình bày bảo mật ở mức kiến trúc/trust boundary, không viết thành walkthrough method TypeScript hoặc chi tiết framework NestJS; section đã có bảng actor/auth model, bảng request context/control layers và bảng phân biệt RBAC--tenant isolation--plan entitlement. Nếu ưu tiên hoàn tất khung khóa luận trước, bước tiếp theo là Phase 7B Chương 1 hoặc Phase 5D screenshot scaffold.

Phase 7A đã hoàn tất sau Phase 6B. Theo yêu cầu phiên 2026-05-29, workflow đã **thực hiện Phase 6A và Phase 6B trước Phase 5D**, sau đó tiếp tục Phase 7A. Phase 5D vẫn chưa triển khai và còn là scaffold/manual capture handoff nếu người viết muốn bổ sung screenshot placeholder sau. Ngày 2026-06-04, Plan A đã hoàn tất cho Chương 4-5. Sau đó Plan B đã được audit/rerun trên nền output Plan A: phần partial Chương 6-7 từ session song song được đọc lại, giữ phần khớp plan, bổ sung tham chiếu tới Bảng 4.3/4.4/4.5, Hình 5.1-Hình 5.5 và Bảng 5.1, rồi build XeLaTeX/TeX Live pass. Bước tiếp theo đúng là Phase 7B Chương 1, hoặc Phase 5D screenshot scaffold nếu người viết muốn chuẩn bị ảnh minh họa trước.

Ngày 2026-05-31, bộ tài liệu hỗ trợ viết luận văn đã bổ sung chiến lược kiểm chứng Saga tại `docs/testing/phase-5/saga-validation-strategy.md` và đồng bộ các tài liệu Chương 5/6 theo hướng: QRTable chứng minh Saga bằng hai luồng đại diện là Order Confirm Saga và SaaS Onboarding Mini-Saga. Khi viết khóa luận, không gọi đây là full production-grade Saga hardening; chỉ trình bày bằng chứng theo các lớp unit/contract, integration opt-in, fault injection ở service layer, UI happy path, log và snapshot DB/outbox.

Ngày 2026-06-01, technical docs đã bổ sung Phase 4D kỹ thuật về Dashboard & Reporting và Phase 4D.1 về dashboard entitlement/UI polish. Ngày 2026-06-04, Chương 3 đã được backfill ở mức yêu cầu: đổi tên chương/mục, bổ sung Owner/Manager dashboard reporting, Super Admin analytics, `report.read_own`, `report.read_any`, `analytics_basic`, staff management, scope exclusion mới và render lại Hình 3.1. Cùng ngày, Chương 4 đã backfill ở mức kiến trúc: BFF/guard/mô hình đọc reporting, technology decision table và diagram con cho Nx, giao tiếp, Redis, bảo mật và thanh toán. Plan A sau đó đã refactor Chương 5 theo luồng vận hành cốt lõi và rút gọn 5 diagram Chương 5. Plan B sau đó đã audit/rerun Chương 6-7, đồng bộ Dashboard/Reporting, entitlement, production/pilot claim policy và output Plan A. Trước Phase 8 polish/nộp bản cuối vẫn còn screenshot/demo thật, production/pilot artifact nếu có, Chương 1, Abstract/phụ lục và audit toàn PDF.

Phase 5 của Chương 5 được tách thành 4 phase con theo precedent của Chương 4 (4A audit → 4B diagram → 4C draft → 4D patch):

- **Phase 5A** (hoàn tất): audit implementation evidence, lập ma trận evidence, kế hoạch sequence diagram và screenshot plan.
- **Phase 5B** (hoàn tất): tạo Mermaid source cho 5 sequence diagram, render PDF, chèn vào LaTeX, build verify — **không viết prose chương dài**.
- **Phase 5C** (hoàn tất, đã được Plan A refactor thay thế một phần): viết bản nháp prose Chương 5 vào `05-trien-khai-he-thong.tex`; bản cũ từng có Bảng 5.1 implemented evidence và Bảng 5.2 shared libraries, nhưng Plan A đã gộp lại thành Bảng 5.1 theo luồng cốt lõi.
- **Phase 5D** (chưa triển khai): dựng khung screenshot/demo artifact, tạo placeholder file trong `assets/screenshots/`, chèn ref/caption vào Chương 5 hoặc Phụ lục A, cập nhật backlog sang `placeholder`; ưu tiên screenshot minh họa Order Confirm Saga happy path, KDS sau `order.confirmed`, SaaS onboarding và owner/payment settings; **không dùng Browser để capture UI**.
- **Phase 6A** (hoàn tất): tạo `chapter-06-evaluation-evidence.md` với requirement traceability summary, NFR/architecture evidence status, evaluation claim policy, limitation/future work table và danh sách claim được phép/không được phép viết.
- **Phase 6B** (hoàn tất): viết bản nháp Chương 6 vào `06-danh-gia.tex`, chèn Bảng 6.1-Bảng 6.5 về claim policy, traceability, functional validation, NFR/architecture evidence và limitation/future work; build LaTeX pass.
- **Phase 7A** (hoàn tất): viết bản nháp Chương 2 vào `02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`, chèn Bảng 2.1-Bảng 2.6, dùng citation thật từ `references.bib`, phân biệt nguồn học thuật/chính thống với nguồn sản phẩm/thị trường và build LaTeX pass.

Lý do tách 5B (diagram) khỏi 5C (prose): LaTeX không tự hiểu Mermaid source; diagram phải được tạo, render và verify trước khi viết prose chèn `\includegraphics`. Gộp hai bước này vào một session dễ gây out-of-scope, giống như Chương 4 đã phải tách 4B và 4C.

### 6.1. Quy trình Phase 5D cho screenshot/demo scaffold

Phase 5D không phải là phiên capture UI tự động. Output chuẩn của phase này là một scaffold có thể build được để người viết thay ảnh thật thủ công:

1. Đọc `thesis-phase5a-evidence-audit.md` §4, `thesis-artifact-backlog.md` §5, `thesis-report/chapters/05-trien-khai-he-thong.tex` và `thesis-report/appendices/a-ui-gallery.tex`.
2. Xác định danh sách screenshot đại diện cần có dựa trên flow Chương 5: Customer PWA, Staff POS, KDS, Owner dashboard và Super Admin; với Saga, screenshot chỉ minh họa happy path, còn compensation phải được chứng minh bằng test/log/DB evidence.
3. Tạo hoặc cập nhật file mapping nội bộ `docs/graduation-thesis-resources/thesis-phase5d-screenshot-scaffold.md` với các cột: ID artifact, filename, LaTeX label, vị trí chèn, caption dự kiến, source/evidence liên quan và ghi chú thay ảnh thủ công; đồng thời ghi danh sách artifact Phụ lục D cần thu thập cho Saga như terminal output và snapshot DB/outbox.
4. Tạo file placeholder trắng đúng định dạng trong `thesis-report/assets/screenshots/`, dùng tên ổn định như `chapter5-01-customer-qr-session.png`. Placeholder chỉ là khung kỹ thuật để LaTeX build được, không phải screenshot thật.
5. Chèn khung `figure` vào Chương 5 hoặc Phụ lục A bằng `\includegraphics`, kèm `\caption{...}` và `\label{...}`. Nếu ảnh còn là placeholder, phần caption hoặc đoạn dẫn phải thể hiện đây là bản nháp cần thay bằng screenshot demo thật trước khi nộp.
6. Cập nhật `thesis-artifact-backlog.md` sang trạng thái `placeholder`, không dùng `captured` hoặc `verified` cho ảnh trắng.
7. Không mở local app, không dùng Browser, không yêu cầu demo data chạy ổn và không giả lập UI bằng screenshot tự vẽ như evidence thật.
8. Build LaTeX từ `thesis-report/` để kiểm tra file placeholder, đường dẫn, caption, label và danh mục hình không gãy.

Sau khi người viết thay ảnh thật vào đúng filename, một phiên polish ngắn có thể đổi trạng thái từ `placeholder` sang `captured`/`verified` nếu build PDF và kiểm tra ảnh thật đạt.

### 6.2. Quy trình Phase 4D cho artifact coverage Chương 3

Phase 4D là phase phụ sau Phase 4C, dùng để vá khoảng trống artifact của Chương 3 trước khi đi sâu sang implementation Chương 5. Output chuẩn:

1. Đọc `chapter-03-requirement-evidence.md`, `thesis-artifact-backlog.md` và `thesis-report/chapters/03-phan-tich-yeu-cau.tex`.
2. Kiểm tra các bảng Chương 3 đã có trong LaTeX: actor/use case, functional requirements, non-functional requirements và state machines. Chỉ đổi trạng thái backlog sang `verified` nếu build và kiểm tra caption/số hiệu/render thành công.
3. Tạo source Mermaid cho `chapter3-actor-use-case-overview.mmd` và `chapter3-business-flow.mmd` trong `thesis-report/assets/diagrams/`.
4. Render diagram sang PDF trong `thesis-report/assets/figures/`; ưu tiên Mermaid CLI nếu môi trường có `mmdc` hoặc `npx @mermaid-js/mermaid-cli`.
5. Chèn Hình 3.1 và Hình 3.2 vào Chương 3 bằng `\includegraphics`, có `\caption{...}` và `\label{...}`, caption ghi nguồn là tác giả tổng hợp từ tài liệu nghiệp vụ, permission matrix và traceability của QRTable.
6. Bổ sung prose dẫn nhập tối thiểu quanh hai hình để người đọc hiểu vai trò của artifact; không rewrite Chương 3 thành implementation walkthrough.
7. Cập nhật `thesis-artifact-backlog.md`: Hình 3.1/Hình 3.2 và các bảng Chương 3 phản ánh đúng trạng thái thật.
8. Build LaTeX từ `thesis-report/` bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`.
9. Kiểm tra `.lof`, `.lot` và nếu có thể preview trang PDF chứa Hình 3.1/Hình 3.2; không gọi phase hoàn tất nếu hình bị trắng, caption thiếu nguồn hoặc số hiệu sai.

Không thêm diagram chỉ để “đa dạng”. Diagram Chương 3 phải phục vụ analysis-level argument: actor/scope, use case và business flow. Sequence diagram chi tiết giữa service nên để Chương 5; architecture diagram để Chương 4; evaluation/traceability table để Chương 6.

### 6.3. Quy trình kỹ thuật Phase 4B cho diagram/table

Phase 4B không chỉ dừng ở việc viết Mermaid code trong chat. Output chuẩn của phase này phải là artifact có thể build trong LaTeX:

1. Đọc `chapter-04-architecture-evidence.md` và `thesis-artifact-backlog.md` để chọn đúng artifact P0/P1 cho Chương 4.
2. Dùng Mermaid làm format mặc định cho diagram source vì dễ review bằng text diff và phù hợp architecture diagram. Chỉ dùng PlantUML/draw.io/LaTeX-native nếu Mermaid không diễn đạt tốt hoặc renderer Mermaid không chạy được.
3. Lưu source diagram vào `docs/graduation-thesis-resources/thesis-report/assets/diagrams/` với tên ổn định, ví dụ `chapter4-overall-architecture.mmd`.
4. Render source thành file ảnh/vector để LaTeX chèn được. Ưu tiên `.pdf` cho bản nộp; dùng `.png` fallback nếu PDF render lỗi; giữ `.svg` như artifact phụ nếu renderer sinh ra nhưng không chèn trực tiếp vào LaTeX trừ khi template đã hỗ trợ rõ.
5. Nếu renderer Mermaid có sẵn trong môi trường (`mmdc`, `npx @mermaid-js/mermaid-cli`, hoặc tool tương đương), agent được phép render trực tiếp và không commit dependency/tool cache. Nếu không có renderer hoặc môi trường thiếu browser/font, agent phải để lại `.mmd`, ghi rõ command render thủ công và không đánh dấu artifact là `inserted`/`verified`.
6. Với bảng Chương 4, ưu tiên tạo trực tiếp bằng LaTeX `longtable`/`tabularx` trong `chapters/04-thiet-ke-va-kien-truc-he-thong.tex` hoặc chuẩn bị source Markdown nội bộ trước khi chèn, tùy độ rộng bảng.
7. Chèn artifact đã render vào Chương 4 bằng `\includegraphics`, kèm `\caption{...}` và `\label{...}`. Caption phải ghi nguồn là tác giả tổng hợp từ tài liệu/code QRTable khi diagram được dựng từ audit nội bộ.
8. Cập nhật `thesis-artifact-backlog.md` theo trạng thái thật: `drafted` khi mới có source, `inserted` khi đã chèn vào LaTeX, `verified` chỉ sau khi build PDF và kiểm tra render/caption/số hiệu.
9. Chạy build từ `docs/graduation-thesis-resources/thesis-report/` bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex` sau khi chèn LaTeX.
10. Nếu build pass nhưng có cảnh báo layout do bảng/hình quá rộng, ghi lại warning và ưu tiên polish trong cùng phase nếu phạm vi nhỏ; không gọi phase hoàn tất khi hình bị vỡ, thiếu caption, thiếu source hoặc không render trong PDF.

LaTeX không tự hiểu Mermaid source. Mermaid là source diagram; LaTeX chỉ nhận file đã render như `.pdf` hoặc `.png`. Vì vậy, Phase 4B phải luôn phân biệt ba trạng thái: source đã tạo, hình đã render, và hình đã được LaTeX build/verify.

Kết quả Phase 4B ngày 2026-05-29: source Mermaid đã lưu trong `thesis-report/assets/diagrams/chapter4-*.mmd`; PDF render đã lưu trong `thesis-report/assets/figures/chapter4-*.pdf`; nhóm Hình 4.1-4.4 và Bảng 4.1-4.3 theo số hiệu lúc đó đã được chèn vào Chương 4 với caption/source/label; build LaTeX pass bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; `.lof`, `.lot`, `pdftotext` và preview PNG từ trang PDF xác nhận artifact đã render, có số hiệu và không bị trắng.

Kết quả polish Chương 4 ngày 2026-06-04 trước Plan C: thêm source Mermaid cho `chapter4-technology-integration-map`, `chapter4-nx-module-boundary`, `chapter4-communication-topology`, `chapter4-redis-ownership`, `chapter4-security-auth-flow`, `chapter4-sepay-payment-architecture`; render PDF/PNG vào `thesis-report/assets/figures/`; Chương 4 khi đó có Hình 4.1-Hình 4.10 và Bảng 4.1-Bảng 4.5; build LaTeX pass bằng XeLaTeX/TeX Live. Sau Plan C, số hiệu hiện tại là Hình 4.1-Hình 4.12 trong Chương 4 và Hình E.1-Hình E.5 trong Phụ lục E.

Cập nhật 2026-06-04 trước Plan C: theo yêu cầu thống nhất lại format hình, Hình 4.1, 4.4, 4.6, 4.8, 4.9 và 4.10 theo số hiệu lúc đó đã chuyển source từ SVG sang Mermaid `.mmd`; các file PDF/PNG cùng tên đã render lại để LaTeX không đổi đường dẫn `\includegraphics`; build lại `undergraduate-theses-report.tex` bằng XeLaTeX/TeX Live pass và `.lof` xác nhận số hiệu hình không đổi.

Cập nhật 2026-06-04 về Mermaid icon: Hình 4.1 `chapter4-technology-integration-map.mmd` đã dùng Mermaid flowchart icon shape, render bằng Mermaid CLI 11.15.0 với `--iconPacks @iconify-json/logos @iconify-json/simple-icons @iconify-json/mdi`. Pipeline render Chương 4 nằm tại `thesis-report/tools/render-chapter4-diagrams.sh`; không thêm dependency Iconify vào repo vì CLI tải icon pack từ unpkg lúc render. PDF/PNG đã render vẫn được giữ để LaTeX build không phụ thuộc mạng.

Cập nhật 2026-06-04 bổ sung: Hình 4.1 đã chỉnh lại node Next.js sang image node trỏ `assets/diagrams/icons/nextjs-black.png` để giữ đúng logo màu đen. Các diagram chuyên đề Chương 4 chỉ gắn logo công nghệ đại diện cho trách nhiệm của mục đó: Nx ở module boundary, PostgreSQL/Redis/Kafka/Socket.IO ở tenant isolation, Redis ở ownership, Kafka ở decision flow/payment event, Keycloak ở auth và SePay ở payment/communication. Node Keycloak dùng class `identityProvider` để Simple Icons monochrome không bị áp màu của nhóm external provider. Node SePay chuyển từ icon `mdi:bank-transfer` sang image node trỏ `assets/diagrams/icons/sepay-placeholder.png`; đây là placeholder nhỏ để thay bằng logo đúng sau. Render script Chương 4 tự embed local image path `assets/...` thành data URI trong file Mermaid tạm trước khi gọi `mmdc`, vì Mermaid CLI export PDF/PNG có thể làm mất ảnh nếu để external/local href thô.

Phase 1, Phase 2A và Phase 2B đã hoàn tất ở mức nền:

1. `thesis-report/undergraduate-theses-report.tex` compile được bằng `tectonic` trong local environment.
2. Mục lục, danh mục hình và danh mục bảng đã chuyển sang `\tableofcontents`, `\listoffigures`, `\listoftables`.
3. Nội dung đã tách thành `thesis-report/frontmatter/`, `thesis-report/chapters/`, `thesis-report/appendices/`.
4. Đã thêm `thesis-report/references.bib` làm nơi quản lý nguồn BibTeX theo IEEE.
5. Đã tạo skeleton 7 chương theo `thesis-official-outline.md`, chưa viết nội dung dài.
6. Đã tạo `thesis-report/assets/figures/`, `thesis-report/assets/screenshots/`, `thesis-report/assets/diagrams/`, `thesis-report/assets/tables/` cho artifact khóa luận.
7. Đã nối citation pipeline bằng `biblatex`, `style=ieee`, `backend=bibtex`, render hai nhóm tài liệu tiếng Việt/tiếng Anh dựa trên keyword `vietnamese`.
8. Đã có `thesis-report/citation-pipeline.md` mô tả quy tắc citation và build.
9. Đã có `thesis-agent-prompt-bank.md` để dùng cho các session mới mà không cần hỏi lại prompt chi tiết trong thread hiện tại.
10. Đã tạo `thesis-source-backbone.md` với source matrix cho Chương 1-2, reviewer questions và danh sách nguồn candidate chưa đưa vào `.bib`.
11. Đã nhập nhóm nguồn thật đầu tiên vào `thesis-report/references.bib`, gồm nguồn tiếng Việt cho bối cảnh F&B/POS/QR và nguồn chuẩn/official/paper/sách cho SaaS, multi-tenancy, microservices, Kafka, WebSocket, JWT/OIDC và security.

Build command đã kiểm chứng:

```bash
cd docs/graduation-thesis-resources/thesis-report
tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex
```

Kết quả gần nhất ngày 2026-05-29: build pass bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`, Tectonic có chạy BibTeX trên `undergraduate-theses-report.aux` và sinh `undergraduate-theses-report.pdf`. Log không có LaTeX error hoặc `Undefined control sequence`. Tectonic có cảnh báo về việc dùng font Times New Roman từ đường dẫn hệ thống macOS; không phải lỗi compile, nhưng cần lưu ý nếu chuyển sang môi trường build khác. Vì Chương 1-2 chưa được draft và chưa có `\cite{...}` trong chapter skeleton, bibliography của main PDF vẫn rỗng là trạng thái chấp nhận được sau Phase 2B. Agent đã chạy thêm một build tạm ngoài repo với `\nocite{*}` để ép BibTeX parse toàn bộ `references.bib`; kết quả pass, chỉ có cảnh báo overfull URL trong bibliography tạm.

Build artifacts LaTeX như `.aux`, `.toc`, `.lof`, `.lot`, `.out`, `.log`, `.bbl`, `.blg`, `.run.xml`, `*-blx.bib`, `.synctex.gz`, `.xdv` và PDF preview trong `thesis-report/` đã được ignore trong `.gitignore` và không nên commit trừ khi có chủ đích nộp artifact PDF.

Ghi chú LaTeX editor: phần magic comments ở đầu `thesis-report/undergraduate-theses-report.tex` như `% !TeX document-id`, `% !TeX program = xelatex`, `% !TeX encoding = UTF-8` và dòng build bằng `xelatex` là chủ đích để hỗ trợ TeXstudio/MacTeX trên macOS. Agent không được tự ý xóa hoặc đổi các dòng này chỉ vì local verification đang dùng `tectonic`.

Phase 2B đã hoàn tất:

1. Đã tạo `docs/graduation-thesis-resources/thesis-source-backbone.md`.
2. Đã đọc các research survey hiện có và quay lại nguồn gốc/nguồn chính thức khi chọn citation.
3. Đã lập source matrix cho Chương 1 và Chương 2: citation key, loại nguồn, ngôn ngữ, độ tin cậy, mục dùng, claim hỗ trợ, link/DOI, trạng thái.
4. Đã thêm nguồn thật, đủ tin cậy và có khả năng dùng thật vào `thesis-report/references.bib`.
5. Chưa viết Chương 1 hoặc Chương 2 dài, đúng phạm vi Phase 2B.
6. Đã build lại LaTeX và build tạm `\nocite{*}` để kiểm tra `references.bib` parse được.

Done criteria Phase 2B:

- Đạt: Có `thesis-source-backbone.md` với source matrix đủ dùng để bắt đầu viết Chương 1-2 sau này.
- Đạt: `references.bib` có nhóm nguồn thật đầu tiên và `thesis-source-backbone.md` ghi rõ nguồn candidate chưa đưa vào `.bib`.
- Đạt: Build LaTeX không lỗi; build tạm bibliography parse check cũng pass.
- Đạt: `git status` không hiện build artifacts LaTeX chưa được ignore.

Phase 3A đã hoàn tất:

1. Đã tạo/cập nhật `docs/graduation-thesis-resources/chapter-03-requirement-evidence.md`.
2. Đã audit actor/use case/domain requirement/NFR dựa trên `docs/business-logic.md`, `docs/architecture/permission-matrix.md`, `docs/testing/phase-5/traceability-matrix.md`, phase records và specs liên quan.
3. Đã phân biệt các mức evidence: `Mạnh`, `Một phần`, `Giới hạn/Hướng phát triển`.
4. Đã ghi rõ các điểm không được overclaim trước khi viết Chương 3: Manager không checkout subscription/update payment settings, Customer không dùng Keycloak, WebSocket không là source of truth, SePay live provider validation còn manual/opt-in, offline queue/Notification/observability production-grade là giới hạn hoặc hướng phát triển.
5. Đã gợi ý artifact P0 cho Chương 3 theo `thesis-artifact-backlog.md`: actor/use-case overview, functional requirement table, NFR table, business flow, actor-permission table.
6. Chưa draft nội dung Chương 3 vào `thesis-report/chapters/03-phan-tich-yeu-cau.tex`, đúng phạm vi Phase 3A.

Done criteria Phase 3A:

- Đạt: Có requirement evidence matrix cho Chương 3 tại `chapter-03-requirement-evidence.md`.
- Đạt: Có danh sách điểm cần kiểm chứng trước Phase 3B.
- Đạt: Có gợi ý bảng/diagram P0 cho Chương 3.
- Đạt: Không chạm LaTeX chapter và không cần build PDF trong phase này.

Phase 3B đã hoàn tất:

1. Đã viết bản nháp Chương 3 vào `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`.
2. Nội dung bám `chapter-03-requirement-evidence.md`, `thesis-official-outline.md`, `thesis-evidence-map.md`, `docs/business-logic.md`, `docs/architecture/permission-matrix.md` và traceability matrix.
3. Đã trình bày các phần chính: tổng quan nghiệp vụ, actor/use case, functional requirements theo domain, non-functional requirements, business state machines, phạm vi loại trừ và giới hạn đánh giá.
4. Đã đưa vào LaTeX bốn bảng nội dung: actor/use case, functional requirements, non-functional requirements và state machines. Chưa tạo diagram Hình 3.1/Hình 3.2; backlog artifact vẫn cần xử lý ở phiên diagram/artifact sau.
5. Không thêm nguồn mới vào `references.bib`; Chương 3 chỉ dùng citation ISO/IEC 25010 đã có sẵn trong bibliography cho phần NFR.
6. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex` trong `thesis-report/`; build pass, có chạy BibTeX và sinh PDF. Còn cảnh báo font Times New Roman theo đường dẫn hệ thống macOS và cảnh báo `Object @page. already defined`, không có LaTeX error.

Done criteria Phase 3B:

- Đạt: Chương 3 đã có nội dung dài trong LaTeX, không còn là skeleton.
- Đạt: Nội dung không biến thành implementation walkthrough và không mở rộng sang Chương 4.
- Đạt: Các điểm cần tránh overclaim từ Phase 3A đã được giữ: Customer không dùng Keycloak, WebSocket chỉ là hint/refetch, SePay live provider validation không được claim là đã kiểm chứng production, offline queue/observability/deployment production-grade chỉ viết như giới hạn hoặc hướng phát triển.
- Đạt: Build LaTeX pass sau khi chạm chapter.

Phase 4A đã hoàn tất:

1. Đã tạo `docs/graduation-thesis-resources/chapter-04-architecture-evidence.md`.
2. Đã audit architecture claims dựa trên `docs/technical-architecture.md`, `docs/DOC-CODE-ANCHORS.md`, `docs/README.md`, source tree `apps/` và `libs/`, Kafka/Redis constants, realtime bridge, Order/Kitchen/Payment/SaaS source code và traceability matrix.
3. Đã lập architecture claim/evidence matrix cho Chương 4, gồm Nx monorepo, BFF single entry, service/data ownership, database-per-service + `tenant_id`, selective TCP/gRPC/Kafka/WebSocket, Redis access policy, dual auth model, two-tier payment architecture và outbox/idempotency baseline.
4. Đã lập service ownership/data ownership draft, communication matrix draft, Kafka topic registry draft và Redis/cache/session/KDS ownership draft.
5. Đã chốt diagram plan P0 cho Chương 4: overall architecture, C4/container, service ownership/data ownership, communication matrix, Kafka topic registry, multi-tenancy isolation và Kafka decision flow.
6. Đã ghi rõ reviewer-style questions và rủi ro overclaim: không invent Kafka topic, không đưa Notification Service vào core architecture, không claim WebSocket là source of truth, không claim full saga hardening/CDC/observability/deployment production-grade.
7. Không draft Chương 4 dài và không tạo diagram trong Phase 4A, đúng phạm vi audit.
8. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex` trong `thesis-report/`; build pass, có chạy BibTeX và sinh PDF. Còn cảnh báo font Times New Roman theo đường dẫn hệ thống macOS và cảnh báo `Object @page. already defined`, không có LaTeX error.

Done criteria Phase 4A:

- Đạt: Có architecture evidence matrix cho Chương 4 tại `chapter-04-architecture-evidence.md`.
- Đạt: Có service/data ownership draft, communication matrix draft và Kafka topic registry draft.
- Đạt: Có diagram plan P0 cho Phase 4B.
- Đạt: Không thêm nguồn/citation mới và không chạm nội dung LaTeX của Chương 4.
- Đạt: Build LaTeX pass cuối session.

Phase 4B đã hoàn tất:

1. Đã tạo source Mermaid nền cho overall architecture, C4/container, multi-tenancy isolation và Kafka decision flow trong `docs/graduation-thesis-resources/thesis-report/assets/diagrams/` theo số hiệu lúc Phase 4B.
2. Đã render bốn diagram sang PDF trong `docs/graduation-thesis-resources/thesis-report/assets/figures/` bằng Mermaid CLI `mmdc --pdfFit` với Chrome local qua `PUPPETEER_EXECUTABLE_PATH`.
3. Đã chèn nhóm hình/bảng nền của Chương 4 vào `thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex` ở mức artifact-first, chưa draft prose dài của Chương 4.
4. Các bảng service ownership/data ownership, communication matrix và Kafka topic registry bám theo `chapter-04-architecture-evidence.md`; không thêm topic hoặc service ngoài evidence.
5. Đã cập nhật `thesis-artifact-backlog.md`: các artifact Chương 4 P0/P1 đã xử lý trong Phase 4B chuyển sang `verified`.
6. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; build pass, có chạy BibTeX và sinh PDF. Còn cảnh báo font Times New Roman theo đường dẫn hệ thống macOS, cảnh báo `Object @page. already defined` và cảnh báo tagged PDF từ PDF diagram; không có LaTeX error hoặc `Overfull \hbox` sau khi polish bảng.
7. Đã kiểm tra `.lof`, `.lot`, `pdftotext` và render preview PNG các trang chứa artifact nền; hình/bảng có caption, số hiệu và không bị trắng.

Done criteria Phase 4B:

- Đạt: Có source diagram ổn định trong `thesis-report/assets/diagrams/`.
- Đạt: Có PDF render trong `thesis-report/assets/figures/`.
- Đạt: Artifact đã chèn vào LaTeX với caption/source/label.
- Đạt: Bảng ownership, communication matrix và Kafka topic registry đã có trong Chương 4.
- Đạt: Build LaTeX pass và artifact đã được kiểm tra trong PDF.
- Đạt: Không draft Chương 4 dài, không thêm citation mới, không invent service/topic/claim.

Phase 4C đã hoàn tất:

1. Đã viết bản nháp Chương 4 vào `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`.
2. Nội dung bám prompt Phase 4C trong `thesis-agent-prompt-bank.md`, `chapter-04-architecture-evidence.md`, `thesis-official-outline.md`, `thesis-evidence-map.md`, `docs/technical-architecture.md`, `docs/DOC-CODE-ANCHORS.md`, `docs/business-logic.md`, permission matrix và SePay guide.
3. Chương 4 đã giải thích các phần chính: nguyên tắc thiết kế kiến trúc, overall architecture, Nx monorepo, service boundaries/data ownership, multi-tenancy, inter-service communication, Kafka decision framework/topic registry, Redis/cache/session/KDS strategy, security/auth/RBAC, SePay/VietQR payment architecture, deployment/observability design và trade-off kiến trúc.
4. Giữ nguyên nhóm artifact nền đã verify ở Phase 4B; chỉ bổ sung prose và ràng buộc chiều cao hình để tránh float quá khổ.
5. Không thêm nguồn mới vào `references.bib`; Chương 4 chỉ dùng các citation thật đã có sẵn cho microservices, SaaS/cloud, Kafka, WebSocket và JWT.
6. Đã thêm hygiene nhỏ cho bibliography trong `undergraduate-theses-report.tex`: `xurl`, `biburl*penalty` và `emergencystretch` scoped cho References để tránh overfull URL khi bắt đầu cite nguồn thật.
7. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; build pass, có chạy BibTeX và sinh PDF. Log không còn LaTeX error, `Undefined control sequence`, overfull ở Chương 4 hoặc float quá khổ. Còn cảnh báo font Times New Roman theo đường dẫn hệ thống macOS, cảnh báo `Object @page. already defined`, cảnh báo tagged PDF từ PDF diagram và cảnh báo bibliography tiếng Việt đang rỗng vì các citation hiện dùng trong Chương 3-4 là nguồn tiếng Anh.

Done criteria Phase 4C:

- Đạt: Chương 4 đã có nội dung dài trong LaTeX, không còn là skeleton/artifact-only.
- Đạt: Nội dung giải thích quyết định kiến trúc theo lý do/trade-off, không chỉ mô tả thành phần tồn tại.
- Đạt: Giữ đúng guardrail: selective TCP/gRPC/Kafka, WebSocket là hint/refetch, không claim Kafka-everything, không đưa Notification Service vào core architecture, không claim production-grade deployment/observability hoặc full saga hardening.
- Đạt: Build LaTeX pass sau khi chạm Chương 4 và main `.tex`.

Phase 4D đã hoàn tất:

1. Đã tạo source Mermaid cho Hình 3.1 actor/use-case overview tại `docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter3-actor-use-case-overview.mmd`.
2. Đã tạo source Mermaid cho Hình 3.2 business flow tại `docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter3-business-flow.mmd`.
3. Đã render hai diagram sang PDF bằng Mermaid CLI qua `npx @mermaid-js/mermaid-cli --pdfFit` với Chrome local, lưu tại `thesis-report/assets/figures/chapter3-actor-use-case-overview.pdf` và `thesis-report/assets/figures/chapter3-business-flow.pdf`.
4. Đã chèn Hình 3.1 và Hình 3.2 vào `thesis-report/chapters/03-phan-tich-yeu-cau.tex` bằng `\includegraphics`, có caption/source/label và prose dẫn nhập tối thiểu.
5. Hình 3.1 tách Customer theo QR session khỏi các actor RBAC; Hình 3.2 giữ đúng mức business flow: QR -> session/cart -> submit order -> staff confirm -> KDS -> bill/payment -> table cleaning.
6. Đã cập nhật `thesis-artifact-backlog.md`: Hình 3.1/Hình 3.2 và Bảng 3.1-3.4 chuyển sang `verified` sau khi build/kiểm tra.
7. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; build pass, có chạy BibTeX và sinh PDF. Còn cảnh báo font Times New Roman theo đường dẫn hệ thống macOS, cảnh báo `Object @page. already defined`, cảnh báo tagged PDF từ PDF diagram và cảnh báo bibliography tiếng Việt đang rỗng vì các citation hiện dùng trong Chương 3-4 là nguồn tiếng Anh.
8. Đã kiểm tra `.lof`, `.lot`, `pdftotext` và preview PNG các trang chứa Hình 3.1/Hình 3.2; hình/bảng có caption, số hiệu và không bị trắng.

Done criteria Phase 4D:

- Đạt: Có source diagram ổn định trong `thesis-report/assets/diagrams/`.
- Đạt: Có PDF render trong `thesis-report/assets/figures/`.
- Đạt: Hình 3.1/Hình 3.2 đã chèn vào Chương 3 với caption/source/label.
- Đạt: Bảng 3.1-3.4 được xác nhận trong `.lot` và chuyển trạng thái `verified`.
- Đạt: Build LaTeX pass và artifact đã được kiểm tra trong PDF.
- Đạt: Không rewrite toàn bộ Chương 3, không thêm citation mới và không bắt đầu Phase 5A trong phase này.

Phase 5B đã hoàn tất:

1. Đã đọc `thesis-phase5a-evidence-audit.md` §2, `thesis-artifact-backlog.md`, `thesis-official-outline.md` và kiểm tra thêm source code cho các điểm dễ sai của Hình 5.1: `cart.service.ts`, `order-submit.service.ts`, `session.service.ts`, `order.service.ts`.
2. Đã tạo source Mermaid cho 5 sequence diagram P0 trong `docs/graduation-thesis-resources/thesis-report/assets/diagrams/`:

- `chapter5-qr-ordering-session.mmd`
- `chapter5-order-confirm-stock.mmd`
- `chapter5-kds-ticket-lifecycle.mmd`
- `chapter5-payment-settlement.mmd`
- `chapter5-saas-onboarding-saga.mmd`

3. Đã render 5 diagram sang PDF bằng Mermaid CLI `pnpm exec mmdc --pdfFit` với Google Chrome local qua `PUPPETEER_EXECUTABLE_PATH`, lưu tại `thesis-report/assets/figures/chapter5-*.pdf`.
4. Đã chèn Hình 5.1-Hình 5.5 vào `thesis-report/chapters/05-trien-khai-he-thong.tex` với caption/source/label và prose dẫn nhập tối thiểu. Tại thời điểm Phase 5B, phần prose dài của Chương 5 được để lại cho Phase 5C.
5. Hình 5.1 xử lý điểm `P0-needs-detail` bằng cách bám cartVersion/idempotency, Redis cart/session, Catalog `VALIDATE_ORDERABLE` và Order submit PENDING/Bill OPEN theo source code hiện tại.
6. Đã cập nhật `thesis-artifact-backlog.md`: Hình 5.1-Hình 5.5 chuyển sang `verified`.
7. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; build pass, có chạy BibTeX và sinh PDF. Còn cảnh báo font Times New Roman theo đường dẫn hệ thống macOS, cảnh báo `Object @page. already defined`, cảnh báo tagged PDF từ PDF diagram và cảnh báo PDF input version mới hơn output setting; không có LaTeX error.
8. Đã kiểm tra `pdfinfo`/`pdftotext` cho 5 PDF diagram và `.lof` của main PDF để xác nhận Hình 5.1-Hình 5.5 có số hiệu/caption và không bị trắng.

Done criteria Phase 5B:

- Đạt: Có source Mermaid ổn định trong `thesis-report/assets/diagrams/`.
- Đạt: Có PDF render trong `thesis-report/assets/figures/`.
- Đạt: Hình 5.1-Hình 5.5 đã chèn vào Chương 5 với caption/source/label.
- Đạt: Build LaTeX pass và artifact đã được kiểm tra ở mức metadata/text extraction + `.lof`.
- Đạt: Trong Phase 5B chỉ chèn diagram và prose dẫn nhập, không tạo diagram ngoài P0, không invent service/topic/endpoint.

Phase 5C đã hoàn tất:

1. Đã viết bản nháp prose Chương 5 vào `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`.
2. Nội dung bám prompt Phase 5C trong `thesis-agent-prompt-bank.md`, audit Phase 5A, Hình 5.1-Hình 5.5 đã verify ở Phase 5B, `docs/technical-architecture.md`, `docs/business-logic.md`, traceability matrix và source code liên quan.
3. Bản Phase 5C cũ đã trình bày các phần chính: tổng quan môi trường triển khai, backend services, frontend, QR session/shared cart, order confirmation/stock consistency, KDS realtime, payment settlement, SaaS onboarding/tenant lifecycle, shared libraries/contracts và implementation evidence. Plan A ngày 2026-06-04 đã refactor lại Chương 5 theo luồng vận hành cốt lõi và giảm các cụm tiếng Anh không cần thiết.
4. Hình 5.1-Hình 5.5 vẫn là nhóm diagram P0; Plan A đã rút gọn source Mermaid và render lại PDF từ các source này.
5. Bản Phase 5C cũ từng chèn Bảng 5.1 implemented evidence và Bảng 5.2 shared libraries. Plan A đã bỏ Bảng 5.2 độc lập, gộp evidence thành Bảng 5.1 theo luồng cốt lõi và cập nhật `thesis-artifact-backlog.md` sau khi build/kiểm tra `.lot`.
6. Không thêm citation mới vào `references.bib`; Chương 5 dùng source code/docs/tests nội bộ làm evidence.
7. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; build pass, có chạy BibTeX và sinh PDF. Log không có LaTeX error hoặc overfull từ Chương 5 sau khi polish bảng/prose. Còn các cảnh báo đã biết: font Times New Roman theo đường dẫn hệ thống macOS, `Object @page. already defined`, PDF diagram version/tagged PDF warning.
8. Sau Plan A, đã kiểm tra `.lof`, `.lot`, `pdfinfo` và log build: Hình 5.1-Hình 5.5 có số hiệu/caption trong PDF; `.lot` xác nhận Chương 5 chỉ còn Bảng 5.1.

Done criteria Phase 5C:

- Đạt: Chương 5 đã có nội dung prose dài trong LaTeX, không còn là artifact-first placeholder.
- Đạt: Nội dung chứng minh implementation bằng code/docs/tests/evidence, không biến thành README hoặc user manual.
- Đạt: Giữ đúng guardrail: không claim production-ready, không claim live SePay validation nếu chưa có provider evidence, không biến WebSocket thành source of truth, không invent service/topic/endpoint.
- Đạt sau Plan A: Bảng 5.1 đã chèn vào LaTeX và được kiểm tra trong `.lot`; Bảng 5.2 shared libraries không còn là artifact độc lập của Chương 5.
- Đạt: Build LaTeX pass sau khi chạm Chương 5 và các tài liệu workflow/backlog.

Phase 6B đã hoàn tất:

1. Đã viết bản nháp Chương 6 vào `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`.
2. Nội dung bám prompt Phase 6B trong `thesis-agent-prompt-bank.md`, `chapter-06-evaluation-evidence.md`, `thesis-evidence-map.md`, `thesis-official-outline.md`, traceability matrix và testing handoff.
3. Chương 6 đã trình bày các phần chính: chiến lược đánh giá, evaluation claim policy, requirement traceability, functional validation, kiểm chứng Saga đại diện, architecture validation, non-functional evaluation, demo/artifact validation, giới hạn đánh giá và thảo luận kết quả.
4. Đã chèn Bảng 6.1-Bảng 6.5: claim policy, traceability summary, functional validation result, architecture/NFR evidence status và limitation/future work.
5. Không thêm nguồn mới vào `references.bib`; Chương 6 chỉ dùng citation ISO/IEC 25010 đã có sẵn cho khung NFR.
6. Đã giữ đúng guardrail: không tạo benchmark số, không claim production-ready, không claim live SePay validation tự động, không dùng screenshot placeholder làm demo evidence, không viết rằng toàn bộ P0 đã covered vì còn năm P0 partial và một dòng refund deferred.
7. Sau cập nhật Saga ngày 2026-05-31, đã build LaTeX bằng `python3 /Users/vodinhquan/.codex/plugins/cache/openai-bundled/latex/0.2.0/scripts/compile_latex.py /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex --compiler texlive --engine xelatex --json`; build pass và sinh PDF 102 trang.
8. Log build cuối không có LaTeX error; các overfull còn lại nằm ở phần Chương 3/4 cũ, không phát sinh từ đoạn Saga mới ở Chương 5/6. Còn các warning nền đã biết: `biblatex` fallback BibTeX backend, font size substitution, `Object @page. already defined` và warning PDF diagram tagged.

Done criteria Phase 6B:

- Đạt: Chương 6 đã có nội dung prose dài trong LaTeX, không còn là skeleton.
- Đạt: Nội dung phân biệt rõ claim đã kiểm chứng, claim hỗ trợ bởi thiết kế/code và hướng phát triển.
- Đạt: Bảng 6.1-Bảng 6.5 đã chèn vào LaTeX và build pass.
- Đạt: Không thêm citation giả, không thêm nguồn mới không dùng thật vào `references.bib`.
- Đạt: Build LaTeX pass sau khi chạm Chương 6 và workflow plan.

Phase 7A đã hoàn tất:

1. Đã viết bản nháp Chương 2 vào `docs/graduation-thesis-resources/thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`.
2. Nội dung bám prompt Phase 7A trong `thesis-agent-prompt-bank.md`, `thesis-source-backbone.md`, `references.bib`, `thesis-official-outline.md`, `thesis-evidence-map.md` và các chương 3-6 đã có.
3. Chương 2 đã trình bày các phần chính: POS trong FB, QR ordering, SaaS/multi-tenancy, microservices, event-driven architecture/Kafka, consistency/idempotency/saga/outbox, WebSocket/realtime, auth/RBAC/security và related systems.
4. Đã chèn Bảng 2.1-Bảng 2.6: so sánh POS truyền thống với SaaS POS tích hợp QR ordering, mô hình multi-tenancy, giao tiếp đồng bộ/bất đồng bộ, hệ thống liên quan và mapping cơ sở lý thuyết sang QRTable.
5. Không thêm nguồn mới vào `references.bib`; Chương 2 chỉ dùng nguồn thật đã có trong bibliography/source backbone. Đã kiểm chứng thêm nguồn nền qua Context7 cho Apache Kafka và web/official pages cho một số nguồn chính thức như NIST, ISO/IEC, Microsoft, RFC.
6. Đã giữ đúng guardrail: không dùng docs QRTable để định nghĩa khái niệm phổ quát, không dùng nguồn sản phẩm như nguồn học thuật, không claim QRTable vượt trội hơn sản phẩm thương mại, không overclaim performance/scalability/production readiness.
7. Đã sửa hygiene citation pipeline trong `undergraduate-theses-report.tex`: bỏ `defernumbers=true` vì backend BibTeX + split bibliography sinh citation `[0]` cho các nguồn mới của Chương 2; giữ tách nhóm tài liệu bằng keyword `vietnamese` và tắt warning split bibliography theo cách package gợi ý.
8. Đã build LaTeX bằng LaTeX compile wrapper với `latexmk -xelatex`; build pass và sinh PDF 97 trang ở thời điểm Phase 7A. Kiểm tra `.lot` xác nhận Bảng 2.1-Bảng 2.6 trong bản hiện tại; `pdftotext` xác nhận citation trong Chương 2 và References không còn `[0]`.

Done criteria Phase 7A:

- Đạt: Chương 2 đã có nội dung prose dài trong LaTeX, không còn là skeleton.
- Đạt: Nội dung phân biệt rõ nguồn học thuật/chính thống với nguồn thị trường/sản phẩm.
- Đạt: Bảng 2.1-Bảng 2.6 đã chèn vào LaTeX và được kiểm tra trong `.lot`.
- Đạt: Không thêm citation giả hoặc nguồn mới chưa kiểm chứng vào `references.bib`.
- Đạt: Citation IEEE render đúng số, không còn `[0]`, và build LaTeX pass sau khi chạm Chương 2, main `.tex` và workflow plan.

## 7. Thứ tự viết khuyến nghị

Không nên viết tuần tự từ Chương 1 ngay từ đầu. Thứ tự nên làm:

1. Chương 3. Từ vận hành F&B đến yêu cầu hệ thống QRTable.
2. Chương 4. Thiết kế kiến trúc và quyết định công nghệ cho QRTable.
3. Chương 5. Triển khai hệ thống.
4. Chương 6. Đánh giá.
5. Chương 2. Cơ sở lý thuyết và công trình liên quan.
6. Chương 1. Mở đầu.
7. Chương 7. Kết luận và hướng phát triển.
8. Tóm tắt khóa luận/Abstract.

Lý do: Chương 3-6 là xương sống bám vào hệ thống thực tế. Khi phần này rõ, Chương 1-2 sẽ dễ viết đúng trọng tâm hơn và ít bị chung chung.

## 8. Quy tắc dùng công cụ và nguồn ngoài

- Dùng `Context7`/`ctx7` khi cần tra tài liệu hiện tại của library, framework, SDK, API, CLI tool hoặc cloud service.
- Dùng Browser khi cần kiểm tra giao diện, chụp screenshot, mở local app hoặc xác minh render UI. Riêng Phase 5D hiện dùng scaffold/manual capture handoff nên không dùng Browser.
- Dùng web search khi cần nguồn học thuật, tài liệu chính thức, báo cáo thị trường hoặc nguồn citation mới. Với thông tin có thể thay đổi theo thời gian, phải kiểm chứng trước khi viết.
- Với Chương 2, ưu tiên nguồn uy tín: NIST, ISO/IEC, SEI/CMU, RFC, OWASP, Apache Kafka docs, cloud architecture docs, paper từ Google Scholar/IEEE/ACM/Springer/ScienceDirect.
- Với implementation QRTable, ưu tiên source code, tests và canonical docs nội bộ; không dùng blog để thay thế bằng chứng code.

## 9. End-of-Session Checklist

Cuối mỗi phiên làm việc, agent phải cập nhật bốn mục dưới đây nếu có thay đổi đáng kể:

### Current Status

Phase 1, Phase 2A, Phase 2B, Phase 3A, Phase 3B, Phase 4A, Phase 4B, Phase 4C, Phase 4D, **Phase 4E**, Phase 5A, Phase 5B, **Phase 5C**, **Phase 6A**, **Phase 6B**, **Phase 7A** và phần Chương 7 của **Phase 7C** đã hoàn tất. LaTeX project đã tách vào `docs/graduation-thesis-resources/thesis-report/`, main `.tex` compile được, citation pipeline và source backbone cho Chương 1-2 đã sẵn sàng. Phase 3A đã tạo `docs/graduation-thesis-resources/chapter-03-requirement-evidence.md`; Phase 3B đã viết bản nháp Chương 3 vào `thesis-report/chapters/03-phan-tich-yeu-cau.tex`; Phase 4D đã bổ sung Hình 3.1 actor/use-case overview, Hình 3.2 business flow và xác nhận Bảng 3.1-3.4 trong PDF. Phase 4A đã tạo `docs/graduation-thesis-resources/chapter-04-architecture-evidence.md` với architecture claim/evidence matrix và diagram plan P0. Phase 4B đã tạo/render/chèn/verify nhóm artifact nền Chương 4; Phase 4C đã viết bản nháp Chương 4 vào `thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`. Phase 4E ngày 2026-06-04 đã polish Chương 4 theo `chapter-04-architecture-polish-spec.md` và `chapter-04-architecture-polish-plan.md`: đổi tên chương thành `Thiết kế kiến trúc và quyết định công nghệ cho QRTable`, thêm Bảng 4.1 quyết định công nghệ, thêm Hình 4.1 bản đồ tích hợp công nghệ, sửa Hình 4.2 overall architecture còn 5 Kafka topic, bổ sung Hình 4.4 Nx module boundary, Hình 4.6 communication topology, Hình 4.8 Redis ownership, Hình 4.9 security/auth flow, Hình 4.10 SePay/VietQR payment architecture theo số hiệu trước Plan C, backfill Dashboard/Reporting ở mức BFF/guard/mô hình đọc, đồng bộ outline/evidence/backlog và build LaTeX pass bằng XeLaTeX/TeX Live. Phase 5A đã tạo `docs/graduation-thesis-resources/thesis-phase5a-evidence-audit.md`; Phase 5B đã tạo/render/chèn/verify Hình 5.1-Hình 5.5; Phase 5C đã viết bản nháp prose Chương 5 vào `thesis-report/chapters/05-trien-khai-he-thong.tex`. Plan A ngày 2026-06-04 đã bổ sung Bảng 4.3 database/schema ownership, refactor Chương 5 thành `Hiện thực các luồng vận hành cốt lõi của QRTable`, render lại Hình 5.1-Hình 5.5 và xác nhận Chương 5 chỉ còn Bảng 5.1 evidence theo luồng. Plan B ngày 2026-06-04 đã audit/rerun partial Chương 6-7 sau session song song bị dừng, cập nhật `chapter-06-07-evaluation-conclusion-refactor-plan.md`, giữ nội dung khớp plan, bổ sung tham chiếu tới output Plan A trong Chương 6-7 và build XeLaTeX/TeX Live pass với Bảng 6.1-Bảng 6.5. Phiên tiếp tục Plan B sau đó đã đồng bộ `chapter-06-evaluation-evidence.md` để không còn ghi Dashboard/Reporting là phần chưa backfill; evidence doc hiện khớp số hiệu Bảng 6.1-Bảng 6.5 và vẫn giữ production/pilot artifact ở trạng thái cần thu thập thật. Phiên triển khai Plan B tiếp theo đã polish ngôn ngữ Chương 6-7, thay các cụm tiếng Anh không cần thiết như `Architecture validation`, `source tree`, `evidence/claim` trong văn cảnh mô tả bằng cách diễn đạt tiếng Việt, không đổi mức kết luận kỹ thuật. Phase 7A đã viết bản nháp Chương 2 vào `thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`, chèn Bảng 2.1-Bảng 2.6. Phase 5D chưa triển khai theo yêu cầu phiên 2026-05-29; screenshot/demo thật và production/pilot evidence vẫn cần thu thập riêng nếu muốn dùng làm minh chứng trong bản nộp cuối.

Ngày 2026-06-04, phiên audit Chương 4 đã dùng CodeGraph trước khi chỉnh sửa để đối chiếu trạng thái codebase, guard/báo cáo, danh sách Kafka topic và ranh giới dịch vụ hiện tại. Chương 4 đã được biên tập lại về mạch viết, giảm lạm dụng thuật ngữ tiếng Anh, đổi các cụm có thể dịch sang tiếng Việt như `tenant` -> `đơn vị thuê bao`, `workspace` -> `không gian làm việc`, `logic` -> `quy tắc xử lý`, `demo` -> `minh họa/trình diễn`; chỉ giữ thuật ngữ tiếng Anh khi là tên công nghệ, vai trò mã nguồn hoặc thuật ngữ chuyên ngành cần thiết. Sau Plan A, Chương 4 lúc đó có Hình 4.1-Hình 4.10 và Bảng 4.1-Bảng 4.5 đã được xác nhận qua `.lof`/`.lot`; sau Plan C, số hiệu hiện tại là Hình 4.1-Hình 4.12 và Phụ lục E có Hình E.1-Hình E.5. Không thêm nguồn trích dẫn mới và không sửa `references.bib` trong phiên audit ngôn ngữ này.

Cùng ngày 2026-06-04, main LaTeX đã được chỉnh phần in tài liệu tham khảo để dùng `\raggedright` trong group bibliography, xử lý cảnh báo `Underfull \hbox` còn lại ở entry Apache Kafka. Build lại bằng XeLaTeX/TeX Live pass và log không còn `Underfull`, `Overfull`, undefined citation/reference hoặc LaTeX Warning.

Cùng ngày, phiên chỉnh **danh mục hình và mục 4.11 thanh toán** theo số hiệu trước Plan C: đổi mục 4.11 thành `Thiết kế tích hợp thanh toán SePay/VietQR` và Hình 4.10 khi đó thành `Luồng thanh toán SePay/VietQR...`. Theo yêu cầu tiếp theo, đã **gỡ toàn bộ dòng `Nguồn: ...`** khỏi chú thích hình/bảng (xóa `\chapterfoursource` ở Chương 4; Chương 3 bỏ nguồn inline); build pass.

Cùng ngày, phiên riêng **chỉnh vị trí hình Chương 4** sau khi đọc lại PDF: đã bổ sung `float` + `placeins` (`section`) trong `undergraduate-theses-report.tex`; toàn bộ hình Chương 4 dùng `[H]` để không trôi sang section khác; sắp xếp lại mục kiến trúc tổng thể (mô tả lớp trước Hình 4.2-4.3); đưa bảng ma trận giao tiếp theo số hiệu lúc đó lên trước Hình 4.6; thêm câu dẫn trước sổ đăng ký Kafka. Sau Plan A, số hiệu hiện tại là Bảng 4.3 cho database/schema ownership, Bảng 4.4 cho ma trận giao tiếp và Bảng 4.5 cho Kafka topic registry. Build `latexmk -xelatex` pass; người viết nên đọc lại PDF in thử quanh các ngắt trang lớn (ba hình đầu section 4.3, bảng+hình giao tiếp) để chấp nhận khoảng trắng do `[H]`.

Ngày 2026-06-04, phiên audit cấu trúc Chương 5-7 đã dùng CodeGraph trước khi đọc LaTeX/docs. CodeGraph (`codegraph status .`: 1.196 file, index up-to-date) và source tree cho thấy technical Phase 6 Observability **đã có baseline code/config thật**: `libs/observability` (health, `/metrics`, structured logging, OpenTelemetry, TCP/Kafka trace propagation), `docker-compose.monitoring.yaml`, provisioning Grafana/Loki/Promtail/Prometheus/Tempo và dashboard JSON. Điều này mâu thuẫn với một số tài liệu còn ghi Phase 6/7 TODO hoặc observability chỉ là thiết kế, gồm `docs/phases/phase-5-7-finalization.vi.md` (header “Phase 6/7 vẫn TODO”), phần “Hiện trạng” đầu `phase-6-observability-plan.vi.md` (ghi repo chưa có `/metrics`/compose — đã lỗi thời), `thesis-evidence-map.md` (deployment/observability vẫn “trung bình–thấp, thiết kế”), `chapter-06-evaluation-evidence.md` và Chương 5–6 LaTeX. Sau trao đổi tiếp theo, quyết định nội dung là: technical Phase 4D Dashboard/Reporting cần backfill vào Chương 5-6; technical Phase 6 chỉ nhắc nhẹ như nền hỗ trợ/hướng hardening, không đưa thành trụ cột đánh giá.

Phiên audit Phase 6/7 (cùng ngày, sau CodeGraph): **phân tách tên phase** — workflow khóa luận Phase 6A/6B/7A/7B là phase _viết luận_, không trùng technical Phase 6 Observability / Phase 7 Deployment; khi viết hoặc tái cấu trúc `docs/phases/`, nên giữ technical phase trong `docs/phases/` và thesis phase trong `thesis-workflow-plan.md` / prompt bank, tránh agent nhầm. Trước Plan A, **Chương 4** đã có reporting ở mức BFF/guard/mô hình đọc; **Chương 5** nhắc dashboard ở prose nhưng Bảng 5.1 **chưa** có dòng Dashboard/Reporting; **Chương 6** cần đánh giá thêm reporting/entitlement. **Phase 6** không nên mở thêm mảng observability nếu mục tiêu là chứng minh microservices cốt lõi. **Phase 7** chắc chắn sẽ triển khai production/pilot trong vài ngày tới, nên Chương 5-6 cần có khung ngắn chờ bổ sung artifact. Build LaTeX phiên này: `latexmk -xelatex` pass (PDF up-to-date).

Audit ngôn ngữ Chương 5-7 cũng xác nhận các tiêu đề/mục hiện tại còn lạm dụng tiếng Anh ở mức không cần thiết: `backend services`, `frontend`, `flow`, `runtime`, `implementation evidence`, `artifact demo`, `Evaluation claim policy`, `Functional validation`, `Architecture validation`, `Non-functional evaluation`, `Observability/deployment`. Hướng biên tập khuyến nghị: giữ nguyên tên công nghệ và thuật ngữ khó dịch như `SaaS`, `POS`, `BFF`, `Kafka`, `Redis`, `WebSocket`, `OpenTelemetry`, `Prometheus`, `Loki`, `Tempo`, `Grafana`, `Saga`, `idempotency`, `tenant isolation`; còn các cụm mô tả thông thường nên dùng tiếng Việt hoặc song ngữ lần đầu, ví dụ `luồng`, `khi vận hành`, `hiện thực`, `bằng chứng triển khai`, `minh chứng`, `chính sách diễn đạt kết luận`, `kiểm chứng chức năng`, `kiểm chứng kiến trúc`, `khả năng quan sát hệ thống (observability)`, `đóng gói triển khai (deployment)`, `bảng điều khiển/báo cáo`, `giỏ món dùng chung`, `nhất quán tồn kho`, `ghi nhận thanh toán`, `vòng đời đơn vị thuê bao`.

Đề xuất cấu trúc sau audit trước khi thực thi plan: Chương 5 nên đổi từ tên chung `Triển khai hệ thống` sang hướng cụ thể hơn như `Hiện thực các luồng vận hành cốt lõi của QRTable`, bổ sung mục riêng cho dashboard/reporting theo gói dịch vụ, và thêm khung ngắn production/pilot để cập nhật sau Phase 7. Chương 6 nên đổi từ `Đánh giá` sang `Kiểm chứng và đánh giá hệ thống QRTable`, nâng Saga từ tiểu mục nhỏ lên một cụm đánh giá rõ hơn, thêm phần đánh giá dashboard/reporting entitlement và khung kiểm chứng production/pilot chờ evidence. Chương 7 có thể giữ tên `Kết luận và hướng phát triển`, nhưng chỉ chốt sau khi Plan B được audit/rerun trên nền Plan A đã hoàn tất.

Cùng ngày 2026-06-04, phiên audit nội dung sâu Chương 5-7 đã tạo plan refactor tổng hợp, sau đó tách để tránh agent tràn ngữ cảnh: `docs/graduation-thesis-resources/chapter-05-07-content-refactor-plan.md` hiện chỉ là index/handoff mỏng; plan thực thi được chia thành `chapter-04-05-content-refactor-plan.md` và `chapter-06-07-evaluation-conclusion-refactor-plan.md`. Nội dung tổng hợp các điểm người viết đã nêu: Chương 5 đang đi quá sâu vào code/framework/internal logic, đặc biệt mục 5.9 shared libraries; ngôn ngữ Chương 5-6 còn lạm dụng tiếng Anh; cấu trúc mục còn theo hướng backend/frontend/source evidence thay vì luồng vận hành; diagram Chương 5 có giá trị nhưng quá chi tiết ở class/repository/Redis key; Chương 6 cần sync Dashboard/Reporting; Phase 6 không nên lấn trọng tâm; Phase 7 chắc chắn triển khai nên viết khung ngắn trước và bổ sung evidence sau; Chương 7 hiện còn skeleton và phải viết sau khi Chương 5-6 ổn định.

Cập nhật tiếp trong cùng ngày: Plan A và Plan B đã được bổ sung mục `Protocol bắt buộc khi thực thi plan`. Mỗi plan giờ tự nhắc agent viết tiếng Việt, dùng web/browser để kiểm chứng nguồn học thuật/metadata khi cần, dùng Context7/`ctx7` cho tài liệu library/framework/cloud service theo `AGENTS.md`, không invent citation, chỉ thêm nguồn thật vào `references.bib`, dùng các skill phù hợp như Zoom Out, Grill with Docs, Writing Plans, Doc Coauthoring khi cần, và cuối session phải build LaTeX/cập nhật workflow plan.

Cập nhật tiếp trong cùng ngày sau trao đổi với người viết: hai plan tách riêng đều giữ định hướng Phase 6/Phase 7 và diagram. **Technical Phase 6 Observability không còn là trụ cột nội dung Chương 5-6** vì không trực tiếp chứng minh mục tiêu cốt lõi về microservices; nếu nhắc đến, chỉ nhắc ngắn như nền hỗ trợ/hướng hardening. **Technical Phase 7 Production Deployment chắc chắn sẽ triển khai trong vài ngày tới**, nên viết khung ngắn trong Chương 5-6 trước, rồi bổ sung artifact thật sau khi deploy. Không claim production-ready/high availability/stress test nếu chưa có artifact tương ứng. Với diagram Chương 5, định hướng là **bổ sung diagram phụ trợ riêng theo vấn đề/mục con**, không phân rã diagram tổng quát hiện có thành nhiều diagram nhỏ thay thế.

Cập nhật thêm về chiến lược kiểm chứng luận điểm microservices: **không dùng benchmark so sánh với monolith làm bằng chứng chính** trừ khi có baseline monolith tương đương về business rule, database, caching, auth, payment, KDS và deployment resource. Luận điểm chính nên được chứng minh bằng service boundary, data ownership, flow xuyên dịch vụ, consistency/idempotency/Saga, tenant/RBAC/entitlement và production/pilot evidence sau Phase 7. Nếu có số đo như p95 API, thời gian staff confirm -> KDS hoặc webhook -> bill paid, chỉ dùng như số đo vận hành thử nghiệm/pilot evidence, không claim microservices nhanh hơn monolith.

Cập nhật thêm về khoảng trống database/schema: người viết phát hiện Chương 4 chưa trình bày đủ thiết kế cơ sở dữ liệu theo service. Quyết định mới là bổ sung một mục riêng cho Chương 4 về `Thiết kế cơ sở dữ liệu theo ranh giới dịch vụ`, vì database ownership là bằng chứng trực tiếp cho service boundary trong đề tài microservices. Nguồn sự thật phải là codebase hiện tại: `TypeOrmModule.forFeature(...)`, `MongooseModule.forFeature(...)`, TypeORM entity, Mongoose schema, repository/module registration và nếu cần thì runtime introspection đã đối chiếu. Không dùng các file DBML/ERD cũ như `docs/architecture/erd.dbml`, `erd.mmd`, `erd_explanation.md` hoặc `erd.png` làm nguồn chính vì có thể đã lỗi thời. Cách trình bày được thống nhất: chia theo service là hợp lý, nhưng không tách từng table thành section riêng trong chương chính; ưu tiên bảng tổng hợp service/storage/table hoặc collection/data ownership/design note, sau đó giải thích ngắn theo service. Chương 5 chỉ nhắc lại database/schema như bằng chứng cho flow và boundary, không lặp lại toàn bộ thiết kế schema.

Cập nhật tiếp theo yêu cầu của người viết: ngoài bảng ownership tổng hợp đã có trong Plan A, cần bổ sung sơ đồ database/schema cụ thể theo từng service và lấy ảnh render/export từ dbdiagram.io. Đã tạo `docs/graduation-thesis-resources/chapter-04-database-dbdiagram-plan.md` làm **Plan C**. Plan C yêu cầu tạo DBML source per-service từ codebase hiện tại, import/render/export bằng dbdiagram.io, lưu ảnh vào `thesis-report/assets/figures/`, và chèn vào Chương 4 hoặc phụ lục tùy page budget. Plan C giữ guardrail: DBML/ảnh dbdiagram chỉ là artifact minh họa sinh từ code audit, không phải source of truth; không vẽ foreign key xuyên service; không dùng DBML/ERD cũ; không chạm Chương 6-7 trừ khi cần cập nhật một câu evidence sau khi Plan B chốt.

Phiên audit ngày 2026-06-04 (câu hỏi vị trí diagram Plan C): Plan C **không bắt buộc** Phụ lục E; ưu tiên cả năm sơ đồ trong Chương 4. **Đã refactor:** `04-thiet-ke-va-kien-truc-he-thong.tex` chèn Hình 4.5-4.9 (Catalog, Order, Payment, SaaS, User-Access); `e-extended-diagrams.tex` gỡ lặp, chỉ dẫn sang Chương 4. Số hiệu kiến trúc sau schema: Hình 4.10 multi-tenancy … Hình 4.15 SePay. Build `latexmk -xelatex` pass.

Cùng ngày 2026-06-04, **Plan C đã được triển khai**: audit schema từ `TypeOrmModule.forFeature(...)`, `MongooseModule.forFeature(...)`, TypeORM entity, Mongoose schema và module registration thật; loại `Product` khỏi phạm vi core thesis vì nằm ở `apps/product` legacy/template, không thuộc boundary chính Chương 4. Đã tạo DBML per-service tại `thesis-report/assets/diagrams/dbml/chapter4-*-schema.dbml` cho Catalog, Order, Payment, SaaS và User-Access; render ra `thesis-report/assets/figures/chapter4-db-*-schema.{svg,pdf,png}` bằng `thesis-report/tools/render-chapter4-dbml.sh`; thêm hướng dẫn render vào `thesis-report/assets/README.md`. Chương 4 chèn hai hình đại diện Order/Payment ngay sau bảng ownership, còn Phụ lục E chèn đầy đủ năm sơ đồ để tránh chương chính quá tải. User-Access được ghi rõ là MongoDB document model mô phỏng bằng DBML dạng collection/table-like; các external reference như `table_id`, `menu_item_id`, `bill_id`, `tenant_id` không được vẽ thành foreign key xuyên service.

Phiên audit ngôn ngữ Chương 5-7 (cùng ngày 2026-06-04): đã chạy `codegraph status .` (1.196 file, index up-to-date) và `codegraph context` trước khi sửa. Đã Việt hóa prose/tiêu đề mục/bảng/caption trong `05-trien-khai-he-thong.tex`, `06-danh-gia.tex` và `07-ket-luan-va-huong-phat-trien.tex` theo cùng hướng Chương 4: giảm cụm tiếng Anh không cần thiết (`service boundary`, `data ownership`, `overclaim`, `evidence`, `artifact`, `claim`, `hot path`, `snapshot`, `hint/refetch`, `dashboard/reporting`, `production-ready`, v.v.); giữ tên công nghệ, mã nguồn (`\texttt{...}`) và thuật ngữ chuyên ngành; dùng `đơn vị thuê bao` thay `tenant` ở prose; song ngữ lần đầu cho thuật ngữ khó dịch như `idempotency`, `entitlement`, `observability`, `deployment`. Không đổi mức kết luận kỹ thuật, không thêm citation, không sửa `references.bib`. Build `latexmk -xelatex` pass (PDF ~122 trang); log không có undefined reference/citation.

Ngày 2026-06-05, phiên thảo luận làm rõ mục Chương 4 về Kafka/Redis đã dùng CodeGraph trước khi đọc sâu code/docs. `codegraph status .` xác nhận index up-to-date với 1.196 files, 15.534 nodes và 30.489 edges; CodeGraph query chỉ ra các điểm cần audit gồm `RedisKey`, `WsRoom`, `KdsRedisRepository`, `OutboxEvent`/`OutboxPublisherService`. Audit code/docs xác nhận Chương 4 hiện đã đúng nguyên tắc nhưng mục Kafka và Redis còn ở mức macro: Kafka cần làm rõ hơn topic contract, payload chính, message key, outbox và ranh giới với BFF Direct/WebSocket; Redis cần chia nhỏ theo nhóm cấu trúc dữ liệu, trong đó KDS là case study sâu nhất với Hash/Set/Sorted Set/String/List/PubSub, còn menu/session/cart/SaaS/Payment nên trình bày vừa đủ theo ownership. Chưa sửa Chương 4 trong phiên này; đây là checkpoint thảo luận để chốt chỉ mục chi tiết trước khi draft LaTeX, render diagram mới và cập nhật backlog.

Cùng ngày 2026-06-05, đã thực thi `docs/graduation-thesis-resources/chapter-04-kafka-redis-deepening-plan.md`. Phiên này dùng CodeGraph trước khi sửa (`codegraph status .`: 1.196 files, 15.534 nodes, 30.489 edges, index up-to-date; query `RedisKey`, `KdsRedisRepository`, `OutboxEvent`, `Kafka`) rồi đối chiếu source code/docs quanh Redis/KDS/outbox/Kafka. Chương 4 đã giữ Kafka và Redis là hai section lớn nhưng bổ sung subsection chi tiết, mở rộng Bảng 4.5 thành Kafka topic contract registry, thêm Bảng 4.6 outbox discipline, Bảng 4.7 Redis ownership/data structures và Bảng 4.8 KDS Redis data structures. Đã tạo/render/chèn `chapter4-kds-redis-data-structures.mmd` thành Hình 4.14; do đó security/auth là Hình 4.15 và SePay/VietQR là Hình 4.16. Không thêm citation mới và không sửa `references.bib`. Build LaTeX bằng `compile_latex.py --compiler texlive --engine xelatex --json` pass, `.lof/.lot` xác nhận Hình 4.14 và Bảng 4.5-Bảng 4.8; log chỉ còn một overfull nhỏ ở Chương 5 cũ ngoài phạm vi plan.

Ngày 2026-06-05, phiên thảo luận **đưa toàn bộ màn hình hai client vào khóa luận** đã dùng CodeGraph (`codegraph status .`: 1.196 files, 15.534 nodes, 30.489 edges, index up-to-date; query `ROUTES`, `management-app`, `customer-pwa`) và đối chiếu `apps/management-app/src/constants/routes.ts`, `apps/customer-pwa/src/constants/routes.ts`, `thesis-official-outline.md` §7.3, `thesis-artifact-backlog.md` §5, `appendices/a-ui-gallery.tex` (skeleton), `05-trien-khai-he-thong.tex` (chưa có screenshot). **Chốt phương án phân tầng:** (1) Chương 3 — không gallery đầy đủ, chỉ actor/use-case + business flow; (2) Chương 4 — không screenshot UI; (3) Chương 5 — 8–12 ảnh đại diện gắn luồng (Hình 5.6 trở đi, vì Hình 5.1–5.5 là sequence diagram); mỗi ảnh = 1 đoạn ngắn (mục đích, actor, trạng thái demo, liên kết Hình 5.x/Bảng 5.1); (4) Phụ lục A — catalog đầy đủ ~40–55 màn hình theo 5 nhóm client (Customer PWA 5 route + overlay; Management App: Auth, Owner dashboard, POS, KDS, Super Admin); (5) Chương 6 — tối đa 1–2 ảnh test/health nếu có artifact thật; compensation Saga không chứng minh bằng UI. **Không** đưa toàn bộ ảnh vào Chương 5 (tránh user manual, tránh nhồi page budget). **Phase 5D** là bước triển khai: mapping filename/label, placeholder LaTeX, capture thủ công — agent Phase 5D không chụp UI. Thuật ngữ: dùng `client` trong prose kiến trúc, không dùng `giao diện` khi ý là app phía người dùng (§3.2). Chưa sửa LaTeX screenshot trong phiên thảo luận; chỉ build verify PDF hiện trạng.

Phiên audit ngôn ngữ toàn Chương 4 (cùng ngày 2026-06-04, sau plan làm sâu Kafka/Redis) đã Việt hóa quá mức một số thuật ngữ IT; người viết phản hồi cần **khôi phục** các pattern name chuẩn. Phiên rà soát lại cùng ngày đã revert một phần nhưng sau đó lại lạm dụng tiếng Anh ở prose (`durable`, `Owner`, `Public menu cache`, `Case study KDS`, `consume`/`publish`, v.v.) và dùng sai `giao diện` thay `client`. Phiên cân bằng cuối (2026-06-05) đã rà lại toàn `04-thiet-ke-va-kien-truc-he-thong.tex`: giữ `repository`, `interface`, `contract`, `payload`, `snapshot`, `consistency`, `idempotency`, `aggregate`, `transactional outbox`, `Mini-saga`, `Producer`/`Consumer` (song ngữ lần đầu), `client`, `frontend`/`backend`; Việt hóa prose mô tả (`nguồn sự thật`, `chủ sở hữu`, `bộ nhớ đệm`, `khi vận hành`, `bền vững`, `kênh giao tiếp chính`); Bảng 4.5-Bảng 4.8 dùng header tiếng Việt có chọn lọc (`Bên phát`, `Khóa phân vùng`, `Chủ sở hữu`, `Mẫu khóa`, `Nguồn sự thật`, `Ví dụ minh họa KDS`) nhưng vẫn giữ `Payload`, `consistency`, `idempotency` khi là thuật ngữ kỹ thuật. Không đổi mức kết luận kỹ thuật, không thêm citation. Build `latexmk -xelatex` pass.

Cùng ngày 2026-06-05, đã thực thi `docs/graduation-thesis-resources/chapter-04-security-auth-rbac-deepening-plan.md`. Phiên này dùng CodeGraph trước khi sửa (`codegraph status .`: 1.196 files, 15.534 nodes, 30.489 edges, index up-to-date; query `Authorizer`, `User-Access`, `UserGuard`, `SessionGuard`, `TenantGuard`, `PermissionGuard`, `PlanFeatureGuard`, `Keycloak`, `RBAC`) rồi đối chiếu guards, realtime auth, permission matrix, technical architecture và SePay guide. Chương 4 đã chia section bảo mật thành các subsection, thêm Bảng 4.9 actor/auth model, Bảng 4.10 control layers tại BFF và Bảng 4.11 phân biệt RBAC, tenant isolation, plan entitlement và platform permission. Hình 4.15 security/auth flow được giữ nguyên vì vẫn thể hiện đúng hai lane staff/admin và customer QR/session; Chương 6 thêm cross-reference ngắn tới các bảng mới. Không thêm citation mới và không sửa `references.bib`. Build LaTeX bằng `compile_latex.py --compiler texlive --engine xelatex --json` pass; log chỉ còn overfull cũ quanh `kds.queue_changed`/`realtime:kds:*`.

### Next Concrete Step

Bước tiếp theo khuyến nghị sau khi đã triển khai Plan A, audit/rerun Plan B, triển khai Plan C, hoàn tất plan làm sâu Kafka/Redis và hoàn tất plan security/auth/RBAC Chương 4:

1. **Phase 5D:** triển khai scaffold UI gallery theo phương án đã chốt — tạo `thesis-phase5d-screenshot-scaffold.md`, placeholder `assets/screenshots/`, khung figure Chương 5 (Hình 5.6+) và cấu trúc Phụ lục A có chỉ mục con; người viết capture ảnh thật sau.
2. **Phase 7B:** draft Chương 1 dựa trên `thesis-source-backbone.md`, `references.bib` và mạch Chương 2-7 đã ổn định.
3. **Phase 7C còn lại:** polish Abstract, tóm tắt và phụ lục cần thiết.
4. **Production/Pilot evidence:** sau khi deploy thật, cập nhật Chương 5-6 và phụ lục bằng URL/domain, HTTPS, health check, smoke test, log rút gọn và webhook callback nếu có.
5. **Phase 8A/8B:** build/format/citation audit toàn PDF, rồi reader/reviewer audit về mạch lập luận và overclaim.

### Open Questions

- Cần bổ sung thông tin cá nhân trên bìa: MSSV, khoa, ngành, giảng viên hướng dẫn và năm nộp nếu khác 2026.
- Cần quyết định công cụ build chính cho bản nộp: local `tectonic` đang pass, nhưng Overleaf/XeLaTeX có thể cần kiểm tra lại font Times New Roman hoặc fallback TeX Gyre Termes.
- Cần kiểm tra lại với giảng viên nếu danh mục tài liệu tham khảo phải đánh số liên tục qua cả hai nhóm hay được phép chia số theo nhóm tiếng Việt/tiếng Anh.
- Khi draft Chương 1, chỉ cite subset nguồn thật sự được bàn luận trong chương; không cần đưa toàn bộ `references.bib` vào nội dung nếu không dùng trực tiếp.
- Chương 4: Hình 4.5–4.9 là schema DB per-service; Hình 4.4 Nx boundary; Hình 4.10–4.16 là multi-tenancy, communication, Kafka decision flow, Redis ownership, KDS Redis data structures, security và SePay.
- Không còn câu hỏi mở chặn riêng cho nội dung Chương 4 sau phiên audit thuật ngữ/nội dung; vấn đề còn lại của Chương 4 chủ yếu là thay logo SePay placeholder nếu muốn asset sát thực tế hơn.
- Hình Chương 4 dùng `[H]` có thể tạo khoảng trắng lớn ở cuối trang; đó là đánh đổi có chủ đích để hình không trôi sang section khác. Nếu giảng viên không chấp nhận khoảng trắng, cân nhắc chỉ `[H]` cho hình full-page và giữ `[htbp]` + `\FloatBarrier` cho hình nhỏ hơn.
- Mermaid icon trong Hình 4.1 cần network khi render lại vì `mmdc --iconPacks` tải Iconify packs từ unpkg; nếu render ở môi trường offline, giữ PDF/PNG đã commit hoặc dùng pipeline icon nội bộ khác sau khi có quyết định rõ.
- SePay trong các hình Chương 4 hiện là placeholder tại `thesis-report/assets/diagrams/icons/sepay-placeholder.png`; trước bản nộp cuối cần thay bằng logo/ảnh đúng, giữ file PNG đủ gọn rồi chạy `bash thesis-report/tools/render-chapter4-diagrams.sh` và build LaTeX lại.
- **UI gallery (đã thảo luận 2026-06-05):** xác nhận với giảng viên có bắt buộc Phụ lục A in kèm bản nộp hay chỉ nộp online; chọn độ phân giải/chuẩn chụp ảnh (1920px, ẩn thanh devtools); có chụp cả trạng thái `locked` entitlement dashboard và Super Admin analytics hay chỉ happy path; numbering screenshot: Hình 5.6+ trong chương, Hình A.x trong Phụ lục A.
- Phase 5D là bước triển khai tiếp theo sau khi chốt phương án phân tầng; không còn blocker cho Chương 1, nhưng cần hoàn tất trước bản nộp nếu muốn PDF tự chứa minh họa UI.
- Prompt backfill Chương 3 sau technical Phase 4D tại `docs/graduation-thesis-resources/chapter-03-requirement-sync-prompt.md` đã được thực thi ngày 2026-06-04; giữ lại file này như record/handoff tham khảo.
- Spec/plan polish Chương 4 tại `docs/graduation-thesis-resources/chapter-04-architecture-polish-spec.md` và `docs/graduation-thesis-resources/chapter-04-architecture-polish-plan.md` đã được thực thi; giữ lại như record/handoff.
- Technical Phase 4D Dashboard & Reporting đã được backfill vào Chương 3-6 ở mức nội dung chính; demo/screenshot thật vẫn cần artifact riêng nếu muốn minh họa UI.
- Plan C (đã chốt vị trí): cả năm sơ đồ schema ở Chương 4 Hình 4.5–4.9 trong mục `Thiết kế cơ sở dữ liệu theo ranh giới dịch vụ`; Phụ lục E không lặp hình. Nếu PDF quá dài hoặc khoảng trắng `[H]` quá nhiều khi in, cân nhắc giảm `height` schema hoặc rút gọn một hình (chỉ khi giảng viên yêu cầu).
- Mức chia nhỏ Kafka/Redis đã chốt ngày 2026-06-05: giữ mỗi công nghệ một section lớn với nhiều `\subsection`; KDS là case study sâu trong section Redis, không tách thành section ngang hàng riêng.
- Khi chuẩn bị artifact Saga cho bản nộp, cần quyết định sẽ lưu terminal output, snapshot DB/outbox và screenshot UI vào phụ lục D dưới dạng ảnh, text log rút gọn hay đường dẫn repository/release.
- Technical Phase 6 đã được quyết định là không nằm trong trọng tâm Chương 5-6; chỉ nhắc ngắn như nền hỗ trợ/hướng hardening nếu cần, không mở mảng observability lý thuyết hoặc citation riêng trừ khi giảng viên yêu cầu.
- Phase 7 sẽ triển khai production/pilot trong vài ngày tới; cần thu thập URL/domain, HTTPS, health check, smoke test luồng lõi, log rút gọn, webhook callback và release/config checklist để cập nhật khung Chương 5-6 sau khi deploy.
- Tên Chương 5 đã đổi theo hướng `Hiện thực các luồng vận hành cốt lõi của QRTable`. Tên Chương 6 `Kiểm chứng và đánh giá hệ thống QRTable` đã được audit/rerun theo Plan B và build pass.

### Risks / Do Not Forget

- Khi viết Phase 7B, ưu tiên nguồn thật đã có trong `references.bib` và `thesis-source-backbone.md`; nếu cần nguồn mới, phải kiểm chứng metadata/link/DOI trước khi thêm vào bibliography.
- Phase 5D hiện vẫn chưa triển khai và là scaffold/manual capture handoff, không phụ thuộc demo data hay Browser; không dùng ảnh placeholder như demo evidence.
- Technical Phase 4D Dashboard & Reporting đã được phản ánh ở Chương 3, Chương 4 mức kiến trúc/BFF/guard/mô hình đọc, Chương 5 mức implementation và Chương 6 mức evaluation. Chỉ claim browser/demo evidence khi có screenshot hoặc smoke output thật.
- Technical Phase 6 Observability đã có dấu vết code/config trong repo hiện tại, nhưng không phải trọng tâm để chứng minh đề tài. Khi polish Chương 5-6, không thêm mục Observability baseline riêng; chỉ nhắc ngắn nếu cần và không claim production-grade monitoring.
- Technical Phase 7 Production Deployment có khung ngắn trong Chương 5-6 ngay từ bản refactor vì chắc chắn triển khai trong vài ngày tới. Không dùng local dev screenshot hoặc ý định deploy để claim đã kiểm chứng; chỉ đổi sang kết quả đã đạt khi có artifact production/pilot thật.
- Khi sửa diagram Chương 5, giữ diagram overview hiện có và bổ sung diagram phụ trợ theo vấn đề/mục con; không phân rã diagram tổng quát thành nhiều diagram nhỏ thay thế.
- Không tạo benchmark so sánh microservices với monolith nếu không có baseline monolith tương đương. Chương 6 nên chứng minh tính hợp lý kiến trúc bằng boundary/ownership/flow/consistency/Saga/tenant/RBAC/deployment evidence; số đo runtime nếu có chỉ là pilot evidence có giới hạn.
- Khi bổ sung phần database/schema, không dùng `docs/architecture/erd.dbml`, `erd.mmd`, `erd_explanation.md`, `erd.png` hoặc DBML/ERD cũ làm nguồn sự thật. Audit phải đi từ `TypeOrmModule.forFeature`, `MongooseModule.forFeature`, entity/schema, module registration và nếu cần runtime introspection đã đối chiếu code.
- Chia database theo service là hợp lý trong Chương 4, nhưng không biến từng table thành một section riêng trong chương chính. Ưu tiên bảng tổng hợp service/storage/table hoặc collection/data ownership/design note và đoạn giải thích ngắn theo service; chi tiết cột/constraint/index để phụ lục nếu cần.
- Khi thực thi Plan C, tạo DBML per-service và ảnh render/export từ dbdiagram.io như artifact minh họa. Không vẽ relationship/foreign key xuyên service; external references như `bill_id` hoặc `tenant_id` phải được giải thích bằng note/contract thay vì cross-service DB join.
- **SVG schema Chương 4 (cố định):** nguồn hình trong PDF là `thesis-report/assets/figures/chapter4-db-*-schema.svg` xuất từ dbdiagram.io; `render-chapter4-dbml.sh` mặc định **không** ghi đè `.svg` (chỉ sync preview PDF/PNG). Không chạy `dbml-renderer` trừ khi `ALLOW_DBML_SVG_OVERWRITE=1` và `--from-dbml`. Xem `assets/figures/CHAPTER4-DB-SCHEMA-SVG.md`.
- Không âm thầm thêm service ngoài boundary cốt lõi vào bảng database ownership. Nếu code có `Product` hoặc module phụ không nằm trong service boundary chính, phải quyết định rõ là ngoài phạm vi thesis core hoặc cập nhật boundary một cách có chủ đích.
- Khi agent thực thi plan mới, phải đọc mục protocol trong chính file plan đó; không dựa vào trí nhớ từ prompt cũ về skill/web/citation/build. Plan A và Plan B đã hoàn tất/audit theo thứ tự; nếu sau này sửa lại Chương 6-7, vẫn phải đối chiếu output Plan A và không overclaim production/pilot khi chưa có artifact thật.
- Chính sách song ngữ: xem **§3.2** (bảng lớp A/B/C, cặp từ dễ sai, checklist). Không Việt hóa pattern name chuẩn; không lạm dụng tiếng Anh trong prose; **không** dùng `giao diện` khi ý là `client`.
- Khi viết hoặc polish phần Saga, chỉ claim QRTable áp dụng Saga ở hai luồng đại diện: Order confirmation và SaaS onboarding. Không claim full saga hardening, durable saga state, CDC/Debezium, exactly-once delivery hoặc Payment Complete Saga đầy đủ.
- Bằng chứng compensation của Saga không nên dựa vào screenshot UI. Dùng unit/contract, opt-in integration, fault injection ở service layer, log và snapshot DB/outbox; UI chỉ minh họa happy path.
- Nếu cần sửa diagram Chương 5, phải sửa `.mmd`, render lại PDF, build lại LaTeX và cập nhật trạng thái thật trong backlog.
- Khi tiếp tục Phase 5D hoặc polish Chương 5, không biến Chương 5 thành README/user manual; chỉ chọn screenshot phục vụ flow chính và giữ nguyên Hình 5.1-Hình 5.5 đã verify từ Phase 5B.
- Trong Phase 5D, file placeholder trắng không phải demo evidence. Không ghi `captured`/`verified` cho đến khi người viết thay ảnh thật và build kiểm tra trong PDF.
- Không sửa trực tiếp PDF render của diagram; sửa `.mmd`, render lại PDF, build lại LaTeX và kiểm tra `.lof`/`.lot` nếu có thay đổi artifact.
- Không sửa lại Chương 3 thành implementation walkthrough khi đang audit kiến trúc; Chương 3 hiện chỉ giữ vai trò phân tích yêu cầu.
- Không đổi các điểm `Một phần` hoặc `Giới hạn/Hướng phát triển` trong audit thành claim đã kiểm chứng ở Chương 4/6.
- Khi sửa diagram Chương 4, dùng đúng service names hiện tại: Authorizer, User-Access, SaaS, Catalog, Order, Kitchen, Payment; không ghi chung `Auth Service` và không thêm `Notification Service` vào core diagram.
- Khi sửa Hình 4.1 hoặc các diagram con Chương 4, không biến chúng thành logo gallery; mỗi icon/nhãn phải gắn với QRTable component, architecture driver hoặc luồng giao tiếp cụ thể. Diagram chuyên đề chỉ nên dùng logo công nghệ cốt lõi của chính mục đó.
- Khi sửa tiếp mục Kafka/Redis trong Chương 4, không invent Kafka topic ngoài 5 topic approved (`order.confirmed`, `order.status_changed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`). Không viết `kds.queue_changed` là Kafka topic lõi; đó là Redis Pub/Sub/WebSocket hint nội bộ. Không biến Redis thành nguồn sự thật chung; mỗi key/data structure phải gắn owner rõ ràng.
- Nếu thay logo SePay, ưu tiên thay đúng file PNG cùng đường dẫn `thesis-report/assets/diagrams/icons/sepay-placeholder.png`; nếu chỉ có SVG, render ra PNG trước hoặc cập nhật `.mmd` có chủ đích rồi kiểm tra PDF/PNG không bị mất ảnh. Không để PNG quá lớn vì render script sẽ embed ảnh thành data URI trong file Mermaid tạm.
- Khi polish Chương 4, không sửa Chương 3 trong cùng session; prompt/spec Chương 3 đã tách riêng.
- Kafka diagram/table chỉ dùng 5 topic approved: `order.confirmed`, `order.status_changed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`; Bảng 4.5 hiện là topic contract registry, Bảng 4.6 là outbox discipline.
- WebSocket trong diagram phải thể hiện là hint/refetch, không phải source of truth.
- Không quay lại mục lục/danh mục hình/bảng thủ công; hiện đã sinh tự động.
- Main LaTeX đã có `\usepackage{float}` và `\usepackage[section]{placeins}`; khi chỉnh hình các chương khác, ưu tiên giữ hình trong đúng `\section` và đặt bảng trước hình minh họa nếu văn bản tham chiếu bảng trước.
- Không xóa/sửa magic comments TeXstudio/MacTeX ở đầu main `.tex` nếu không có lý do rõ ràng.
- Không commit LaTeX build artifacts phụ trợ; chỉ cân nhắc commit PDF khi đó là artifact nộp/xem nhanh có chủ đích.
- Không claim benchmark/performance/production-grade nếu chưa có evidence.
- Không dùng screenshot thay cho đánh giá kiến trúc; screenshot chỉ là UI/demo evidence.
- Không thêm citation giả hoặc nguồn chưa được dùng thật chỉ để làm đầy `references.bib`.
- Không dùng các claim mạnh trong research survey như “khả năng mở rộng vô hạn”, “Kafka xử lý mọi consistency” hoặc “microservices là hướng duy nhất”; `thesis-source-backbone.md` đã ghi policy loại bỏ các overclaim này.
- Khi polish các chương tiếng Việt tiếp theo: tuân **§3.2**; Chương 4 là mẫu tham chiếu; Chương 5–7 cần audit lại cho đồng bộ.
