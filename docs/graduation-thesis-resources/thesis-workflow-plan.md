# Kế hoạch điều phối viết khóa luận QRTable

> Tài liệu sống dùng để chống mất ngữ cảnh khi thread bị compact hoặc khi một AI agent khác tiếp tục công việc.
> Cập nhật gần nhất: 2026-05-29.

## 1. Mục tiêu

Xây dựng bản khóa luận tốt nghiệp tiếng Việt cho đề tài:

- Tên tiếng Việt: Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR dựa trên kiến trúc vi dịch vụ.
- Tên tiếng Anh: Research on the Development of a SaaS-Based POS Platform Integrating QR Code Ordering under a Microservices Architecture.

Bản khóa luận cần có dáng của một công trình software engineering: có bối cảnh, cơ sở lý thuyết, phân tích yêu cầu, thiết kế kiến trúc, triển khai hệ thống, đánh giá có kiểm soát claim, kết luận và hướng phát triển. Không viết như README sản phẩm hoặc nhật ký implementation.

## 2. Agent Start Checklist

Trước khi làm tiếp bất kỳ phần nào của khóa luận, agent phải đọc theo thứ tự:

1. `AGENTS.md` ở root repo để nắm quy ước làm việc.
2. `docs/graduation-thesis-resources/thesis-workflow-plan.md` để biết trạng thái hiện tại và bước tiếp theo.
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
- `docs/guides/sepay-configuration-guide-phase3.md`

## 3. Nguyên tắc không được quên

1. Viết tài liệu khóa luận bằng tiếng Việt học thuật, rõ ràng, không quảng cáo.
2. Giữ thuật ngữ kỹ thuật tiếng Anh khi cần: `SaaS`, `POS`, `microservices`, `service boundary`, `Kafka`, `WebSocket`, `tenant isolation`, `idempotency`, `BFF`, `RBAC`.
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

## 4. Trạng thái hiện tại

| Hạng mục            | Trạng thái                                                        | Ghi chú                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence map        | Đã có bản nền                                                     | `thesis-evidence-map.md` đã chứa claim policy và source priority.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Official outline    | Đã có bản nền                                                     | `thesis-official-outline.md` đã có 7 chương, page budget 105-130 trang và artifact plan phân tầng.                                                                                                                                                                                                                                                                                                                                                                          |
| Format requirements | Đã chuyển thành Markdown                                          | `presentation-format-graduation-thesis.md` là nguồn yêu cầu hình thức.                                                                                                                                                                                                                                                                                                                                                                                                      |
| LaTeX template      | Đã có bản preflight compile được                                  | LaTeX project nằm trong `thesis-report/`; main file là `thesis-report/undergraduate-theses-report.tex`.                                                                                                                                                                                                                                                                                                                                                                     |
| LaTeX compile       | Đã pass bằng `latexmk -xelatex`                                   | Lệnh kiểm chứng gần nhất chạy qua LaTeX compile wrapper với engine `xelatex`; các phiên trước cũng đã pass bằng `tectonic`.                                                                                                                                                                                                                                                                                                                                                 |
| Citation pipeline   | Đã nối kỹ thuật                                                   | Main LaTeX dùng `biblatex` `style=ieee`, `backend=bibtex`, render từ `thesis-report/references.bib` và tách nhóm bằng keyword `vietnamese`; không bật `defernumbers` vì pipeline BibTeX/split bibliography đã sinh citation `[0]` khi Chương 2 bắt đầu dùng nhiều nguồn mới.                                                                                                                                                                                                |
| Source backbone     | Đã có bản nền                                                     | `thesis-source-backbone.md` chứa source matrix cho Chương 1-2 và policy loại nguồn yếu khỏi bibliography ban đầu.                                                                                                                                                                                                                                                                                                                                                           |
| Chapter 3 audit     | Đã hoàn tất Phase 3A                                              | `chapter-03-requirement-evidence.md` chứa actor/domain/use case, FR/NFR evidence matrix, điểm cần kiểm chứng và gợi ý artifact P0.                                                                                                                                                                                                                                                                                                                                          |
| Artifact backlog    | Đã có bản nền                                                     | `thesis-artifact-backlog.md` quản lý diagram, bảng, screenshot và phụ lục.                                                                                                                                                                                                                                                                                                                                                                                                  |
| Prompt bank         | Đã có bản nền                                                     | `thesis-agent-prompt-bank.md` chứa prompt mẫu theo từng phase con để không phụ thuộc vào trí nhớ của một thread chat.                                                                                                                                                                                                                                                                                                                                                       |
| Nội dung chương     | Chương 2, Chương 3, Chương 4, Chương 5 và Chương 6 đã có bản nháp | `thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`, `03-phan-tich-yeu-cau.tex`, `04-thiet-ke-va-kien-truc-he-thong.tex`, `05-trien-khai-he-thong.tex` và `06-danh-gia.tex` đã có nội dung bản nháp. Chương 2 đã có Bảng 2.1-Bảng 2.5 và citation IEEE render đúng số; Chương 3 đã có Hình 3.1/Hình 3.2 và Bảng 3.1-3.4 được verify; Chương 5 đã có Hình 5.1-Hình 5.5 và Bảng 5.1-Bảng 5.2 được verify; Chương 6 đã có Bảng 6.1-Bảng 6.5 và build pass. |

## 5. Lộ trình tổng thể

| Phase    | Mục tiêu                                   | Output chính                                                                                                                         | Trạng thái             |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Phase 0  | Khóa workflow và handoff context           | `thesis-workflow-plan.md`, `thesis-artifact-backlog.md`                                                                              | Hoàn tất bản nền       |
| Phase 1  | Ổn định hạ tầng LaTeX                      | Main `.tex` compile được trong `thesis-report/`, có cấu trúc `frontmatter/`, `chapters/`, `appendices/`, `assets/`, `references.bib` | Hoàn tất preflight nền |
| Phase 2A | Citation infrastructure và build hygiene   | `biblatex`/IEEE/BibTeX pipeline, `.gitignore` cho LaTeX artifacts, `citation-pipeline.md`                                            | Hoàn tất nền kỹ thuật  |
| Phase 2B | Source backbone và initial references      | `thesis-source-backbone.md`, nguồn thật đầu tiên trong `thesis-report/references.bib`                                                | Hoàn tất bản nền       |
| Phase 3A | Audit source/docs cho Chương 3             | Requirement evidence matrix, nguồn nội bộ cần dùng cho Chương 3                                                                      | Hoàn tất audit         |
| Phase 3B | Draft Chương 3                             | Nội dung Chương 3 trong LaTeX, bám yêu cầu và evidence                                                                               | Hoàn tất bản nháp      |
| Phase 4A | Audit architecture evidence cho Chương 4   | Architecture claim/evidence matrix, diagram plan P0                                                                                  | Hoàn tất audit         |
| Phase 4B | Tạo diagram P0 cho Chương 4                | Overall architecture, C4/container, ownership, communication, multi-tenancy, Kafka decision flow                                     | Hoàn tất artifact P0   |
| Phase 4C | Draft Chương 4                             | Nội dung Chương 4 trong LaTeX, bám diagram/evidence                                                                                  | Hoàn tất bản nháp      |
| Phase 4D | Artifact coverage bổ sung cho Chương 3     | Hình 3.1 actor/use-case overview, Hình 3.2 business flow, cập nhật backlog và build verify                                           | Hoàn tất artifact P0   |
| Phase 5A | Audit implementation evidence cho Chương 5 | Implemented evidence table, flow evidence, sequence diagram plan, screenshot plan                                                    | Hoàn tất audit         |
| Phase 5B | Tạo diagram P0 cho Chương 5                | 5 sequence diagram Mermaid source, render PDF, chèn vào LaTeX, build verify                                                          | Hoàn tất artifact P0   |
| Phase 5C | Draft Chương 5                             | Nội dung Chương 5 trong LaTeX, bám diagram/evidence Phase 5A–5B, không biến thành user manual                                        | Hoàn tất bản nháp      |
| Phase 5D | Screenshot/demo scaffold                   | Xác định screenshot cần có, tạo mapping/ref/placeholder trắng, chèn khung vào LaTeX để người viết thay ảnh thủ công                  | Chưa triển khai        |
| Phase 6A | Build evaluation tables/claim policy       | Traceability summary, NFR evidence table, limitation table                                                                           | Hoàn tất audit         |
| Phase 6B | Draft Chương 6                             | Nội dung Chương 6, đánh giá trung thực và không overclaim                                                                            | Hoàn tất bản nháp      |
| Phase 7A | Draft Chương 2                             | Cơ sở lý thuyết và related work dựa trên source backbone                                                                             | Hoàn tất bản nháp      |
| Phase 7B | Draft Chương 1                             | Mở đầu, bối cảnh, mục tiêu, phạm vi, đóng góp                                                                                        | Chưa làm               |
| Phase 7C | Draft Chương 7, Abstract và phụ lục        | Kết luận, hướng phát triển, tóm tắt, phụ lục cần thiết                                                                               | Chưa làm               |
| Phase 8A | Build/format/citation audit                | PDF build, format, citation, figure/table numbering                                                                                  | Chưa làm               |
| Phase 8B | Reader/reviewer/overclaim audit            | Audit mạch lập luận, overclaim, blind spots và checklist phản biện                                                                   | Chưa làm               |

## 6. Bước tiếp theo cụ thể

Phase 7A đã hoàn tất sau Phase 6B. Theo yêu cầu phiên 2026-05-29, workflow đã **thực hiện Phase 6A và Phase 6B trước Phase 5D**, sau đó tiếp tục Phase 7A. Phase 5D vẫn chưa triển khai và còn là scaffold/manual capture handoff nếu người viết muốn bổ sung screenshot placeholder sau. Bước tiếp theo hiện tại là **Phase 7B**: draft Chương 1 dựa trên `thesis-source-backbone.md`, proposal định hướng, bối cảnh F\&B/POS/QR/VietQR và kết quả Chương 2-6 đã có.

Phase 5 của Chương 5 được tách thành 4 phase con theo precedent của Chương 4 (4A audit → 4B diagram → 4C draft → 4D patch):

- **Phase 5A** (hoàn tất): audit implementation evidence, lập ma trận evidence, kế hoạch sequence diagram và screenshot plan.
- **Phase 5B** (hoàn tất): tạo Mermaid source cho 5 sequence diagram, render PDF, chèn vào LaTeX, build verify — **không viết prose chương dài**.
- **Phase 5C** (hoàn tất): viết bản nháp prose Chương 5 vào `05-trien-khai-he-thong.tex`, giữ nguyên diagram đã verify, chèn Bảng 5.1 implemented evidence và Bảng 5.2 shared libraries.
- **Phase 5D** (chưa triển khai): dựng khung screenshot/demo artifact, tạo placeholder file trong `assets/screenshots/`, chèn ref/caption vào Chương 5 hoặc Phụ lục A, cập nhật backlog sang `placeholder`; **không dùng Browser để capture UI**.
- **Phase 6A** (hoàn tất): tạo `chapter-06-evaluation-evidence.md` với requirement traceability summary, NFR/architecture evidence status, evaluation claim policy, limitation/future work table và danh sách claim được phép/không được phép viết.
- **Phase 6B** (hoàn tất): viết bản nháp Chương 6 vào `06-danh-gia.tex`, chèn Bảng 6.1-Bảng 6.5 về claim policy, traceability, functional validation, NFR/architecture evidence và limitation/future work; build LaTeX pass.
- **Phase 7A** (hoàn tất): viết bản nháp Chương 2 vào `02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`, chèn Bảng 2.1-Bảng 2.5, dùng citation thật từ `references.bib`, phân biệt nguồn học thuật/chính thống với nguồn sản phẩm/thị trường và build LaTeX pass.

Lý do tách 5B (diagram) khỏi 5C (prose): LaTeX không tự hiểu Mermaid source; diagram phải được tạo, render và verify trước khi viết prose chèn `\includegraphics`. Gộp hai bước này vào một session dễ gây out-of-scope, giống như Chương 4 đã phải tách 4B và 4C.

### 6.1. Quy trình Phase 5D cho screenshot/demo scaffold

Phase 5D không phải là phiên capture UI tự động. Output chuẩn của phase này là một scaffold có thể build được để người viết thay ảnh thật thủ công:

1. Đọc `thesis-phase5a-evidence-audit.md` §4, `thesis-artifact-backlog.md` §5, `thesis-report/chapters/05-trien-khai-he-thong.tex` và `thesis-report/appendices/a-ui-gallery.tex`.
2. Xác định danh sách screenshot đại diện cần có dựa trên flow Chương 5: Customer PWA, Staff POS, KDS, Owner dashboard và Super Admin.
3. Tạo hoặc cập nhật file mapping nội bộ `docs/graduation-thesis-resources/thesis-phase5d-screenshot-scaffold.md` với các cột: ID artifact, filename, LaTeX label, vị trí chèn, caption dự kiến, source/evidence liên quan và ghi chú thay ảnh thủ công.
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

Kết quả Phase 4B ngày 2026-05-29: source Mermaid đã lưu trong `thesis-report/assets/diagrams/chapter4-*.mmd`; PDF render đã lưu trong `thesis-report/assets/figures/chapter4-*.pdf`; Hình 4.1-4.4 và Bảng 4.1-4.3 đã được chèn vào Chương 4 với caption/source/label; build LaTeX pass bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; `.lof`, `.lot`, `pdftotext` và preview PNG từ trang PDF xác nhận artifact đã render, có số hiệu và không bị trắng.

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

1. Đã tạo source Mermaid cho Hình 4.1 overall architecture, Hình 4.2 C4/container, Hình 4.3 multi-tenancy isolation và Hình 4.4 Kafka decision flow trong `docs/graduation-thesis-resources/thesis-report/assets/diagrams/`.
2. Đã render bốn diagram sang PDF trong `docs/graduation-thesis-resources/thesis-report/assets/figures/` bằng Mermaid CLI `mmdc --pdfFit` với Chrome local qua `PUPPETEER_EXECUTABLE_PATH`.
3. Đã chèn Hình 4.1-4.4 và Bảng 4.1-4.3 vào `thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex` ở mức artifact-first, chưa draft prose dài của Chương 4.
4. Bảng 4.1 service ownership/data ownership, Bảng 4.2 communication matrix và Bảng 4.3 Kafka topic registry bám theo `chapter-04-architecture-evidence.md`; không thêm topic hoặc service ngoài evidence.
5. Đã cập nhật `thesis-artifact-backlog.md`: các artifact Chương 4 P0/P1 đã xử lý trong Phase 4B chuyển sang `verified`.
6. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; build pass, có chạy BibTeX và sinh PDF. Còn cảnh báo font Times New Roman theo đường dẫn hệ thống macOS, cảnh báo `Object @page. already defined` và cảnh báo tagged PDF từ PDF diagram; không có LaTeX error hoặc `Overfull \hbox` sau khi polish bảng.
7. Đã kiểm tra `.lof`, `.lot`, `pdftotext` và render preview PNG các trang chứa Hình 4.1-4.4; hình/bảng có caption, số hiệu và không bị trắng.

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
4. Giữ nguyên Hình 4.1-4.4 và Bảng 4.1-4.3 đã verify ở Phase 4B; chỉ bổ sung prose và ràng buộc chiều cao Hình 4.4 để tránh float quá khổ.
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
3. Chương 5 đã trình bày các phần chính: tổng quan môi trường triển khai, backend services, frontend, QR session/shared cart, order confirmation/stock consistency, KDS realtime, payment settlement, SaaS onboarding/tenant lifecycle, shared libraries/contracts và implementation evidence.
4. Đã giữ nguyên Hình 5.1-Hình 5.5; không tạo diagram mới.
5. Đã chèn Bảng 5.1 implemented evidence và Bảng 5.2 shared libraries vào Chương 5, cập nhật `thesis-artifact-backlog.md` sang `verified` sau khi build và kiểm tra `.lot`.
6. Không thêm citation mới vào `references.bib`; Chương 5 dùng source code/docs/tests nội bộ làm evidence.
7. Đã build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`; build pass, có chạy BibTeX và sinh PDF. Log không có LaTeX error hoặc overfull từ Chương 5 sau khi polish bảng/prose. Còn các cảnh báo đã biết: font Times New Roman theo đường dẫn hệ thống macOS, `Object @page. already defined`, PDF diagram version/tagged PDF warning.
8. Đã kiểm tra `.lof`, `.lot`, `pdfinfo` và `pdftotext`: Hình 5.1-Hình 5.5, Bảng 5.1 và Bảng 5.2 có số hiệu/caption trong PDF.

Done criteria Phase 5C:

- Đạt: Chương 5 đã có nội dung prose dài trong LaTeX, không còn là artifact-first placeholder.
- Đạt: Nội dung chứng minh implementation bằng code/docs/tests/evidence, không biến thành README hoặc user manual.
- Đạt: Giữ đúng guardrail: không claim production-ready, không claim live SePay validation nếu chưa có provider evidence, không biến WebSocket thành source of truth, không invent service/topic/endpoint.
- Đạt: Bảng 5.1 và Bảng 5.2 đã chèn vào LaTeX và được kiểm tra trong `.lot`.
- Đạt: Build LaTeX pass sau khi chạm Chương 5 và các tài liệu workflow/backlog.

Phase 6B đã hoàn tất:

1. Đã viết bản nháp Chương 6 vào `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`.
2. Nội dung bám prompt Phase 6B trong `thesis-agent-prompt-bank.md`, `chapter-06-evaluation-evidence.md`, `thesis-evidence-map.md`, `thesis-official-outline.md`, traceability matrix và testing handoff.
3. Chương 6 đã trình bày các phần chính: chiến lược đánh giá, evaluation claim policy, requirement traceability, functional validation, architecture validation, non-functional evaluation, demo/artifact validation, giới hạn đánh giá và thảo luận kết quả.
4. Đã chèn Bảng 6.1-Bảng 6.5: claim policy, traceability summary, functional validation result, architecture/NFR evidence status và limitation/future work.
5. Không thêm nguồn mới vào `references.bib`; Chương 6 chỉ dùng citation ISO/IEC 25010 đã có sẵn cho khung NFR.
6. Đã giữ đúng guardrail: không tạo benchmark số, không claim production-ready, không claim live SePay validation tự động, không dùng screenshot placeholder làm demo evidence, không viết rằng toàn bộ P0 đã covered vì còn bốn P0 chưa phủ đầy đủ.
7. Đã build LaTeX bằng `python3 scripts/compile_latex.py /absolute/path/to/undergraduate-theses-report.tex --compiler texlive --engine xelatex --json`; build pass và sinh PDF 81 trang. Lần chạy wrapper auto không chỉ định engine bị chặn bởi template vì dùng `pdflatex`; khi ép `xelatex` thì pass đúng yêu cầu template.
8. Log build cuối không còn overfull hbox từ Chương 6 sau khi polish. Còn các warning nền đã biết: `biblatex` fallback BibTeX backend, bibliography tiếng Việt đang rỗng, font size substitution, `Object @page. already defined` và warning PDF diagram tagged.

Done criteria Phase 6B:

- Đạt: Chương 6 đã có nội dung prose dài trong LaTeX, không còn là skeleton.
- Đạt: Nội dung phân biệt rõ claim đã kiểm chứng, claim hỗ trợ bởi thiết kế/code và hướng phát triển.
- Đạt: Bảng 6.1-Bảng 6.5 đã chèn vào LaTeX và build pass.
- Đạt: Không thêm citation giả, không thêm nguồn mới không dùng thật vào `references.bib`.
- Đạt: Build LaTeX pass sau khi chạm Chương 6 và workflow plan.

Phase 7A đã hoàn tất:

1. Đã viết bản nháp Chương 2 vào `docs/graduation-thesis-resources/thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`.
2. Nội dung bám prompt Phase 7A trong `thesis-agent-prompt-bank.md`, `thesis-source-backbone.md`, `references.bib`, `thesis-official-outline.md`, `thesis-evidence-map.md` và các chương 3-6 đã có.
3. Chương 2 đã trình bày các phần chính: POS trong F\&B, QR ordering, SaaS/multi-tenancy, microservices, event-driven architecture/Kafka, consistency/idempotency/saga/outbox, WebSocket/realtime, auth/RBAC/security và related systems.
4. Đã chèn Bảng 2.1-Bảng 2.5: so sánh POS truyền thống với SaaS POS tích hợp QR ordering, mô hình multi-tenancy, giao tiếp đồng bộ/bất đồng bộ, hệ thống liên quan và mapping cơ sở lý thuyết sang QRTable.
5. Không thêm nguồn mới vào `references.bib`; Chương 2 chỉ dùng nguồn thật đã có trong bibliography/source backbone. Đã kiểm chứng thêm nguồn nền qua Context7 cho Apache Kafka và web/official pages cho một số nguồn chính thức như NIST, ISO/IEC, Microsoft, RFC.
6. Đã giữ đúng guardrail: không dùng docs QRTable để định nghĩa khái niệm phổ quát, không dùng nguồn sản phẩm như nguồn học thuật, không claim QRTable vượt trội hơn sản phẩm thương mại, không overclaim performance/scalability/production readiness.
7. Đã sửa hygiene citation pipeline trong `undergraduate-theses-report.tex`: bỏ `defernumbers=true` vì backend BibTeX + split bibliography sinh citation `[0]` cho các nguồn mới của Chương 2; giữ tách nhóm tài liệu bằng keyword `vietnamese` và tắt warning split bibliography theo cách package gợi ý.
8. Đã build LaTeX bằng LaTeX compile wrapper với `latexmk -xelatex`; build pass và sinh PDF 97 trang. Kiểm tra `.lot` xác nhận Bảng 2.1-Bảng 2.5; `pdftotext` xác nhận citation trong Chương 2 và References không còn `[0]`.

Done criteria Phase 7A:

- Đạt: Chương 2 đã có nội dung prose dài trong LaTeX, không còn là skeleton.
- Đạt: Nội dung phân biệt rõ nguồn học thuật/chính thống với nguồn thị trường/sản phẩm.
- Đạt: Bảng 2.1-Bảng 2.5 đã chèn vào LaTeX và được kiểm tra trong `.lot`.
- Đạt: Không thêm citation giả hoặc nguồn mới chưa kiểm chứng vào `references.bib`.
- Đạt: Citation IEEE render đúng số, không còn `[0]`, và build LaTeX pass sau khi chạm Chương 2, main `.tex` và workflow plan.

## 7. Thứ tự viết khuyến nghị

Không nên viết tuần tự từ Chương 1 ngay từ đầu. Thứ tự nên làm:

1. Chương 3. Phân tích yêu cầu.
2. Chương 4. Thiết kế và kiến trúc hệ thống.
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

Phase 1, Phase 2A, Phase 2B, Phase 3A, Phase 3B, Phase 4A, Phase 4B, Phase 4C, Phase 4D, Phase 5A, Phase 5B, **Phase 5C**, **Phase 6A**, **Phase 6B** và **Phase 7A** đã hoàn tất. LaTeX project đã tách vào `docs/graduation-thesis-resources/thesis-report/`, main `.tex` compile được, citation pipeline và source backbone cho Chương 1-2 đã sẵn sàng. Phase 3A đã tạo `docs/graduation-thesis-resources/chapter-03-requirement-evidence.md`; Phase 3B đã viết bản nháp Chương 3 vào `thesis-report/chapters/03-phan-tich-yeu-cau.tex`; Phase 4D đã bổ sung Hình 3.1 actor/use-case overview, Hình 3.2 business flow và xác nhận Bảng 3.1-3.4 trong PDF. Phase 4A đã tạo `docs/graduation-thesis-resources/chapter-04-architecture-evidence.md` với architecture claim/evidence matrix và diagram plan P0. Phase 4B đã tạo/render/chèn/verify Hình 4.1-4.4 và Bảng 4.1-4.3 trong Chương 4. Phase 4C đã viết bản nháp Chương 4 vào `thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`, giữ diagram/table đã verify và bổ sung prose/trade-off kiến trúc. Phase 5A đã tạo `docs/graduation-thesis-resources/thesis-phase5a-evidence-audit.md`; Phase 5B đã tạo/render/chèn/verify Hình 5.1-Hình 5.5; Phase 5C đã viết bản nháp prose Chương 5 vào `thesis-report/chapters/05-trien-khai-he-thong.tex`, chèn và verify Bảng 5.1 implemented evidence + Bảng 5.2 shared libraries. Phase 6A đã tạo `docs/graduation-thesis-resources/chapter-06-evaluation-evidence.md` với traceability summary, NFR/architecture evidence status, evaluation claim policy, limitation/future work table và danh sách claim được phép/không được phép viết. Phase 6B đã viết bản nháp Chương 6 vào `thesis-report/chapters/06-danh-gia.tex`, chèn Bảng 6.1-Bảng 6.5. Phase 7A đã viết bản nháp Chương 2 vào `thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`, chèn Bảng 2.1-Bảng 2.5 và build pass bằng `latexmk -xelatex` qua LaTeX compile wrapper. Phase 5D chưa triển khai theo yêu cầu phiên 2026-05-29.

### Next Concrete Step

Thực hiện **Phase 7B**: viết bản nháp Chương 1 vào `thesis-report/chapters/01-mo-dau.tex` dựa trên `thesis-source-backbone.md`, proposal định hướng, nguồn bối cảnh F\&B/POS/QR/VietQR đã có và kết quả Chương 2-6. Chương 1 cần nêu bối cảnh, lý do chọn đề tài, phát biểu bài toán, mục tiêu, phạm vi, phương pháp, đóng góp và cấu trúc khóa luận; không viết như quảng cáo sản phẩm và không overclaim kết quả chưa đánh giá.

### Open Questions

- Cần bổ sung thông tin cá nhân trên bìa: MSSV, khoa, ngành, giảng viên hướng dẫn và năm nộp nếu khác 2026.
- Cần quyết định công cụ build chính cho bản nộp: local `tectonic` đang pass, nhưng Overleaf/XeLaTeX có thể cần kiểm tra lại font Times New Roman hoặc fallback TeX Gyre Termes.
- Cần kiểm tra lại với giảng viên nếu danh mục tài liệu tham khảo phải đánh số liên tục qua cả hai nhóm hay được phép chia số theo nhóm tiếng Việt/tiếng Anh.
- Khi draft Chương 1, chỉ cite subset nguồn thật sự được bàn luận trong chương; không cần đưa toàn bộ `references.bib` vào nội dung nếu không dùng trực tiếp.
- Chương 4 hiện đã có bản nháp; nếu cần polish hình Chương 4 về sau, ưu tiên sửa Mermaid source rồi render lại PDF bằng `mmdc --pdfFit`; không sửa trực tiếp file PDF.
- Cần quyết định thời điểm quay lại Phase 5D screenshot/demo scaffold sau khi Chương 6 và Chương 2 đã có draft; theo prompt bank hiện tại, next step vẫn là Phase 7B.

### Risks / Do Not Forget

- Khi viết Phase 7B, ưu tiên nguồn thật đã có trong `references.bib` và `thesis-source-backbone.md`; nếu cần nguồn mới, phải kiểm chứng metadata/link/DOI trước khi thêm vào bibliography.
- Phase 5D hiện vẫn chưa triển khai và là scaffold/manual capture handoff, không phụ thuộc demo data hay Browser; không dùng ảnh placeholder như demo evidence.
- Nếu cần sửa diagram Chương 5, phải sửa `.mmd`, render lại PDF, build lại LaTeX và cập nhật trạng thái thật trong backlog.
- Khi tiếp tục Phase 5D hoặc polish Chương 5, không biến Chương 5 thành README/user manual; chỉ chọn screenshot phục vụ flow chính và giữ nguyên Hình 5.1-Hình 5.5 đã verify từ Phase 5B.
- Trong Phase 5D, file placeholder trắng không phải demo evidence. Không ghi `captured`/`verified` cho đến khi người viết thay ảnh thật và build kiểm tra trong PDF.
- Không sửa trực tiếp PDF render của diagram; sửa `.mmd`, render lại PDF, build lại LaTeX và kiểm tra `.lof`/`.lot` nếu có thay đổi artifact.
- Không sửa lại Chương 3 thành implementation walkthrough khi đang audit kiến trúc; Chương 3 hiện chỉ giữ vai trò phân tích yêu cầu.
- Không đổi các điểm `Một phần` hoặc `Giới hạn/Hướng phát triển` trong audit thành claim đã kiểm chứng ở Chương 4/6.
- Khi tạo diagram Chương 4, dùng đúng service names hiện tại: Authorizer, User-Access, SaaS, Catalog, Order, Kitchen, Payment; không ghi chung `Auth Service` và không thêm `Notification Service` vào core diagram.
- Kafka diagram/table chỉ dùng 6 topic approved: `order.confirmed`, `order.status_changed`, `payment.completed`, `payment.refunded`, `kitchen.sla_warning`, `tenant.created`.
- WebSocket trong diagram phải thể hiện là hint/refetch, không phải source of truth.
- Không quay lại mục lục/danh mục hình/bảng thủ công; hiện đã sinh tự động.
- Không xóa/sửa magic comments TeXstudio/MacTeX ở đầu main `.tex` nếu không có lý do rõ ràng.
- Không commit LaTeX build artifacts phụ trợ; chỉ cân nhắc commit PDF khi đó là artifact nộp/xem nhanh có chủ đích.
- Không claim benchmark/performance/production-grade nếu chưa có evidence.
- Không dùng screenshot thay cho đánh giá kiến trúc; screenshot chỉ là UI/demo evidence.
- Không thêm citation giả hoặc nguồn chưa được dùng thật chỉ để làm đầy `references.bib`.
- Không dùng các claim mạnh trong research survey như “khả năng mở rộng vô hạn”, “Kafka xử lý mọi consistency” hoặc “microservices là hướng duy nhất”; `thesis-source-backbone.md` đã ghi policy loại bỏ các overclaim này.
