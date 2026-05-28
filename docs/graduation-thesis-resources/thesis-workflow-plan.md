# Kế hoạch điều phối viết khóa luận QRTable

> Tài liệu sống dùng để chống mất ngữ cảnh khi thread bị compact hoặc khi một AI agent khác tiếp tục công việc.
> Cập nhật gần nhất: 2026-05-28.

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

## 4. Trạng thái hiện tại

| Hạng mục            | Trạng thái                       | Ghi chú                                                                                                                                     |
| ------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence map        | Đã có bản nền                    | `thesis-evidence-map.md` đã chứa claim policy và source priority.                                                                           |
| Official outline    | Đã có bản nền                    | `thesis-official-outline.md` đã có 7 chương, page budget 105-130 trang và artifact plan phân tầng.                                          |
| Format requirements | Đã chuyển thành Markdown         | `presentation-format-graduation-thesis.md` là nguồn yêu cầu hình thức.                                                                      |
| LaTeX template      | Đã có bản preflight compile được | LaTeX project nằm trong `thesis-report/`; main file là `thesis-report/undergraduate-theses-report.tex`.                                     |
| LaTeX compile       | Đã pass bằng `tectonic`          | Lệnh kiểm chứng chạy trong `docs/graduation-thesis-resources/thesis-report/`.                                                               |
| Citation pipeline   | Đã nối kỹ thuật                  | Main LaTeX dùng `biblatex` `style=ieee`, `backend=bibtex`, render từ `thesis-report/references.bib` và tách nhóm bằng keyword `vietnamese`. |
| Artifact backlog    | Đã có bản nền                    | `thesis-artifact-backlog.md` quản lý diagram, bảng, screenshot và phụ lục.                                                                  |
| Nội dung chương     | Có skeleton 7 chương             | Chưa viết nội dung dài; các file chương mới chỉ giữ tiêu đề chương/mục theo official outline.                                               |

## 5. Lộ trình tổng thể

| Phase   | Mục tiêu                          | Output chính                                                                                                                         | Trạng thái             |
| ------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| Phase 0 | Khóa workflow và handoff context  | `thesis-workflow-plan.md`, `thesis-artifact-backlog.md`                                                                              | Hoàn tất bản nền       |
| Phase 1 | Ổn định hạ tầng LaTeX             | Main `.tex` compile được trong `thesis-report/`, có cấu trúc `frontmatter/`, `chapters/`, `appendices/`, `assets/`, `references.bib` | Hoàn tất preflight nền |
| Phase 2 | Chuẩn bị citation/source backbone | `thesis-report/references.bib`, source matrix cho Chương 1-2, citation policy                                                        | Chưa nhập nguồn thật   |
| Phase 3 | Viết xương sống hệ thống          | Draft Chương 3, 4, 5 bám vào code/docs/evidence                                                                                      | Chưa làm               |
| Phase 4 | Sản xuất diagram và screenshot    | Mermaid/PlantUML/ảnh/screenshot được tạo, lưu và gắn backlog                                                                         | Chưa làm               |
| Phase 5 | Viết Chương 6 đánh giá            | Traceability, NFR evaluation, limitation, claim policy                                                                               | Chưa làm               |
| Phase 6 | Viết Chương 2 và Chương 1         | Cơ sở lý thuyết, related work, mở đầu                                                                                                | Chưa làm               |
| Phase 7 | Hoàn thiện kết luận và phụ lục    | Chương 7, Abstract, danh mục, phụ lục                                                                                                | Chưa làm               |
| Phase 8 | Audit toàn văn                    | Build PDF, format, citation, overclaim, coherence, reader test                                                                       | Chưa làm               |

## 6. Bước tiếp theo cụ thể

Bước tiếp theo sau Phase 1 là Phase 2: chuẩn bị citation/source backbone.

Phase 1 đã hoàn tất ở mức preflight nền:

1. `thesis-report/undergraduate-theses-report.tex` compile được bằng `tectonic` trong local environment.
2. Mục lục, danh mục hình và danh mục bảng đã chuyển sang `\tableofcontents`, `\listoffigures`, `\listoftables`.
3. Nội dung đã tách thành `thesis-report/frontmatter/`, `thesis-report/chapters/`, `thesis-report/appendices/`.
4. Đã thêm `thesis-report/references.bib` làm nơi quản lý nguồn BibTeX theo IEEE.
5. Đã tạo skeleton 7 chương theo `thesis-official-outline.md`, chưa viết nội dung dài.
6. Đã tạo `thesis-report/assets/figures/`, `thesis-report/assets/screenshots/`, `thesis-report/assets/diagrams/`, `thesis-report/assets/tables/` cho artifact khóa luận.

Build command đã kiểm chứng:

```bash
cd docs/graduation-thesis-resources/thesis-report
tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex
```

Kết quả gần nhất: build pass, sinh `undergraduate-theses-report.pdf` 25 trang. Tectonic có cảnh báo về việc dùng font Times New Roman từ đường dẫn hệ thống macOS; không phải lỗi compile, nhưng cần lưu ý nếu chuyển sang môi trường build khác. Vì `references.bib` chưa có citation thật, log hiện có cảnh báo bibliography rỗng; đây là trạng thái chấp nhận được trước Phase 2.

Build artifacts LaTeX như `.aux`, `.toc`, `.lof`, `.lot`, `.out`, `.log`, `.bbl`, `.blg`, `.run.xml`, `*-blx.bib` và PDF preview trong `thesis-report/` đã được ignore trong `.gitignore` và không nên commit trừ khi có chủ đích nộp artifact PDF.

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
- Dùng Browser khi cần kiểm tra giao diện, chụp screenshot, mở local app hoặc xác minh render UI.
- Dùng web search khi cần nguồn học thuật, tài liệu chính thức, báo cáo thị trường hoặc nguồn citation mới. Với thông tin có thể thay đổi theo thời gian, phải kiểm chứng trước khi viết.
- Với Chương 2, ưu tiên nguồn uy tín: NIST, ISO/IEC, SEI/CMU, RFC, OWASP, Apache Kafka docs, cloud architecture docs, paper từ Google Scholar/IEEE/ACM/Springer/ScienceDirect.
- Với implementation QRTable, ưu tiên source code, tests và canonical docs nội bộ; không dùng blog để thay thế bằng chứng code.

## 9. End-of-Session Checklist

Cuối mỗi phiên làm việc, agent phải cập nhật bốn mục dưới đây nếu có thay đổi đáng kể:

### Current Status

Phase 1 LaTeX preflight đã hoàn tất ở mức nền: LaTeX project đã tách vào `docs/graduation-thesis-resources/thesis-report/`, main `.tex` compile được, mục lục/danh mục hình/danh mục bảng sinh tự động, có cấu trúc `thesis-report/frontmatter/`, `thesis-report/chapters/`, `thesis-report/appendices/`, `thesis-report/assets/` và `thesis-report/references.bib`. Skeleton 7 chương đã được tạo theo official outline, chưa viết nội dung dài. Citation pipeline kỹ thuật đã nối bằng `biblatex`/IEEE/BibTeX backend, nhưng chưa nhập nguồn thật.

### Next Concrete Step

Thực hiện Phase 2: chọn nguồn ngoài uy tín cho Chương 1 và Chương 2, nhập BibTeX thật vào `thesis-report/references.bib`, gắn keyword `vietnamese` cho tài liệu tiếng Việt, và thêm citation vào chapter skeleton khi bắt đầu viết nội dung.

### Open Questions

- Cần bổ sung thông tin cá nhân trên bìa: MSSV, khoa, ngành, giảng viên hướng dẫn và năm nộp nếu khác 2026.
- Cần quyết định công cụ build chính cho bản nộp: local `tectonic` đang pass, nhưng Overleaf/XeLaTeX có thể cần kiểm tra lại font Times New Roman hoặc fallback TeX Gyre Termes.
- Cần kiểm tra lại với giảng viên nếu danh mục tài liệu tham khảo phải đánh số liên tục qua cả hai nhóm hay được phép chia số theo nhóm tiếng Việt/tiếng Anh.

### Risks / Do Not Forget

- Không viết nội dung dài vào LaTeX trước khi citation/source backbone ổn định.
- Không quay lại mục lục/danh mục hình/bảng thủ công; hiện đã sinh tự động.
- Không commit LaTeX build artifacts phụ trợ; chỉ cân nhắc commit PDF khi đó là artifact nộp/xem nhanh có chủ đích.
- Không claim benchmark/performance/production-grade nếu chưa có evidence.
- Không dùng screenshot thay cho đánh giá kiến trúc; screenshot chỉ là UI/demo evidence.
- Không thêm citation giả hoặc nguồn chưa được dùng thật chỉ để làm đầy `references.bib`.
