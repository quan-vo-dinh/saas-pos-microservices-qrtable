# Báo cáo rà soát ngôn ngữ khóa luận QRTable

> Ngày rà soát: 2026-06-23
> Phạm vi chính: `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex`, các chương đang được include, frontmatter, Appendix D và các appendix/source ảnh liên quan.
> CodeGraph preflight: `codegraph status .` xác nhận index hiện tại đang up to date với 1.232 file, 15.901 node và 31.817 edge; CodeGraph hỗ trợ hiểu nền codebase nhưng không index trực tiếp `.tex/.md`, nên phần rà soát ngôn ngữ được thực hiện bằng đọc LaTeX/source tài liệu.
> Mục tiêu: phát hiện các tiêu đề, chú thích bảng/hình và đoạn văn còn mang sắc thái "văn nói", ghi chú triển khai nội bộ hoặc chưa phù hợp văn phong học thuật của khóa luận.

## 0. Trạng thái thực thi

- 2026-06-23: đã áp dụng Giai đoạn A cho toàn bộ nhóm LNG-P0 trong các file LaTeX chính: tiêu đề Chương 1/3/4/5, mục 3.2/5.3/6.3, caption Bảng 4.1, caption Hình 4.12, caption Hình 5.1, caption Bảng 5.1 và phần mô tả cấu trúc khóa luận ở Chương 1.
- Build XeLaTeX/TeX Live pass sau khi sửa; `.toc`, `.lof`, `.lot` đã xác nhận các tiêu đề/caption mới và không còn các cụm P0 cũ trong mục lục, danh mục hình, danh mục bảng.
- 2026-06-23: đã áp dụng Giai đoạn B cho các file LaTeX chính đang được include: chuẩn hóa có kiểm soát các cụm `tenant`, "cốt lõi/lõi", "hiện thực", "quyết định", `production`, `dashboard/reporting`, `snapshot`, `runtime` trong frontmatter, Chương 1-7 và Phụ lục D. Các hit còn lại sau quét là identifier/label/citation/tên file hoặc tên class cần giữ như `tenantId`, `tenant_id`, `tenant.created`, `TenantGuard`, `chapter4-rbac-tenant-entitlement`, `microsoft-multitenant-storage-data-2026` và "Quyết định số" ở trang hội đồng.
- Build `latexmk -xelatex -interaction=nonstopmode -halt-on-error undergraduate-theses-report.tex` pass sau Giai đoạn B, PDF 156 trang. `.toc`, `.lof`, `.lot` đã xác nhận các tiêu đề mới như `SaaS và mô hình nhiều đơn vị thuê bao`, `RBAC, cô lập dữ liệu theo đơn vị thuê bao và quyền theo gói`, `Đóng gói triển khai và minh chứng vận hành công khai`, `Kiểm chứng triển khai trên môi trường công khai`. Warning còn lại là overfull/underfull layout cũ ở caption dài/danh mục hình và bảng phụ lục, không phải lỗi build.
- 2026-06-23: đã hoàn tất Giai đoạn C trên Chương 1-7. Nội dung được biên tập theo vai trò học thuật của từng chương: Chương 1 tập trung vào vấn đề và mục tiêu; Chương 2 trình bày cơ sở lý thuyết bằng câu trần thuật; Chương 3 tổ chức yêu cầu theo tác nhân, trường hợp sử dụng và ràng buộc nghiệp vụ; Chương 4 trình bày kiến trúc như một thiết kế hệ thống; Chương 5 mô tả các luồng đã triển khai; Chương 6 chuyển giọng audit nội bộ thành nhận định đánh giá; Chương 7 tập trung vào đóng góp và hướng phát triển.
- Các caption dài ở Chương 5 đã được rút gọn để tránh tràn danh mục hình. Sơ đồ Hình 4.16 cũng được sửa nguồn Mermaid để loại lỗi `Maximum text size in diagram exceeded` và hiển thị đầy đủ hai luồng thanh toán trong PDF.
- Build XeLaTeX/TeX Live sau Giai đoạn C pass, PDF 150 trang. Mục lục, danh mục hình và danh mục bảng đã được kiểm tra; không còn các cụm mục tiêu của Giai đoạn B trong nội dung hiển thị, không có tham chiếu hoặc citation không xác định, và không còn cảnh báo overfull trong các chương hoặc danh mục hình. Cảnh báo bố cục còn lại khi đó là underfull ở bảng hẹp của Phụ lục D.
- 2026-06-23: đã hoàn tất Giai đoạn D. Build XeLaTeX bằng `latexmk -norc -g -xelatex -interaction=nonstopmode -halt-on-error -synctex=1 undergraduate-theses-report.tex` pass, PDF 150 trang. Đã kiểm tra trực quan mục lục, danh mục hình, danh mục bảng, caption dài ở Chương 5 và Bảng D.1; rút gọn caption Hình 5.2 trong danh mục hình, thêm caption ngắn cho Hình D.1 và chỉnh bảng Phụ lục D để hết underfull. Log cuối không còn overfull/underfull, không có citation hoặc reference không xác định; `references.bib` không thay đổi.
- Các bảng LNG-P0/LNG-P1 bên dưới được giữ như baseline audit. Giai đoạn A-D đã hoàn tất; bước tiếp theo là đọc rà soát cuối theo vai trò người phản biện hoặc tiếp tục thay asset/screenshot thật nếu cần cho bản nộp cuối.

## 1. Kết luận nhanh

Các ví dụ giảng viên đã gạch đỏ không phải lỗi đơn lẻ. Chúng cùng thuộc một nhóm vấn đề:

- Tiêu đề đang dùng từ của quá trình làm phần mềm hơn là từ của báo cáo học thuật, ví dụ: "hiện thực", "quyết định".
- Một số tiêu đề mô tả hành động theo kiểu hướng dẫn sử dụng, ví dụ: "Khách quét QR, tạo phiên...".
- Từ "cốt lõi/lõi" xuất hiện nhiều và tạo cảm giác nhấn mạnh khẩu ngữ; trong báo cáo nên ưu tiên "chính", "trọng yếu" hoặc bỏ nếu không cần.
- Một số cụm tiếng Anh bị trộn trực tiếp vào câu tiếng Việt dù không phải tên riêng, thuật ngữ bắt buộc hoặc định danh code.
- Một số đoạn dùng ngôn ngữ audit nội bộ như "khung minh chứng", "giới hạn khẳng định", "P0/P1", "artifact", "claim"; các cụm này phù hợp với tài liệu làm việc nhưng cần chuyển sang cách diễn đạt của báo cáo.

Ưu tiên chỉnh sửa nên đi theo thứ tự: tiêu đề chương/mục, caption bảng/hình, bảng thuật ngữ hiển thị, sau đó mới đến prose chi tiết.

## 2. Quy tắc sửa chung

| Nhóm vấn đề                                                                   | Cách sửa đề xuất                                                                                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| "Mở đầu"                                                                      | Dùng "Giới thiệu" theo góp ý trực tiếp của giảng viên.                                                                                |
| "quyết định" trong tiêu đề/caption                                            | Đổi thành "lựa chọn", "cơ sở lựa chọn", "thiết kế" hoặc "định hướng thiết kế" tùy ngữ cảnh.                                           |
| "hiện thực"                                                                   | Đổi thành "triển khai", "xây dựng", "được triển khai" hoặc bỏ khỏi tiêu đề nếu tiêu đề vẫn rõ nghĩa.                                  |
| "cốt lõi/lõi"                                                                 | Đổi thành "chính", "trọng yếu", "trung tâm" hoặc bỏ nếu chỉ dùng để nhấn mạnh.                                                        |
| Tiêu đề kiểu actor + hành động                                                | Chuyển thành danh từ học thuật, ví dụ "Phiên đặt món qua mã QR và giỏ dùng chung".                                                    |
| `tenant` trong văn xuôi                                                       | Dùng "đơn vị thuê bao"; giữ `tenant_id`, `tenantId` hoặc tên biến/schema khi nói về code.                                             |
| `dashboard/reporting`                                                         | Dùng "bảng điều khiển và báo cáo" trong văn xuôi/caption.                                                                             |
| `production`                                                                  | Dùng "môi trường triển khai công khai", "môi trường vận hành" hoặc định nghĩa một lần rồi dùng nhất quán.                             |
| `snapshot`, `runtime`, `client`, `cache` trong văn xuôi                       | Ưu tiên "trạng thái mới nhất/bản chụp trạng thái", "khi vận hành", "ứng dụng/client" theo ngữ cảnh, "bộ nhớ đệm".                     |
| Từ audit nội bộ: `claim`, `evidence`, `artifact`, `P0/P1`, "khung minh chứng" | Chỉ giữ trong tài liệu làm việc; trong báo cáo đổi thành "kết luận", "bằng chứng", "hiện vật triển khai", "nhóm yêu cầu ưu tiên cao". |

## 3. Các điểm cần sửa ưu tiên cao

| ID        | Vị trí                                               | Nội dung hiện tại                                                                 | Vấn đề                                                                                      | Đề xuất chỉnh sửa                                                                                                                         |
| --------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| LNG-P0-01 | `chapters/01-mo-dau.tex:1`                           | `\chapter{Mở đầu}`                                                                | Đã được giảng viên sửa trực tiếp; tiêu đề phổ biến nhưng chưa theo yêu cầu mới.             | `\chapter{Giới thiệu}`                                                                                                                    |
| LNG-P0-02 | `chapters/03-phan-tich-yeu-cau.tex:1`                | `\chapter{Từ vận hành F\&B đến yêu cầu hệ thống QRTable}`                         | Câu tiêu đề dài, mang sắc thái kể chuyện; bị gạch toàn bộ.                                  | `\chapter{Phân tích yêu cầu hệ thống QRTable trong bối cảnh vận hành F\&B}` hoặc ngắn hơn: `\chapter{Phân tích yêu cầu hệ thống QRTable}` |
| LNG-P0-03 | `chapters/03-phan-tich-yeu-cau.tex:27`               | `trường hợp sử dụng cốt lõi`                                                      | "cốt lõi" đang là từ bị góp ý lặp lại.                                                      | `trường hợp sử dụng chính`                                                                                                                |
| LNG-P0-04 | `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:1`   | `\chapter{Thiết kế kiến trúc và quyết định công nghệ cho QRTable}`                | "quyết định" bị gạch; tiêu đề giống ghi chú quyết định kỹ thuật.                            | `\chapter{Thiết kế kiến trúc và lựa chọn công nghệ cho QRTable}`                                                                          |
| LNG-P0-05 | `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:30`  | `Quyết định công nghệ chính và vai trò trong QRTable.`                            | "Quyết định" bị gạch trong caption bảng.                                                    | `Các công nghệ sử dụng trong QRTable và vai trò tương ứng.`                                                                               |
| LNG-P0-06 | `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:300` | `Luồng quyết định chọn TCP/gRPC, Kafka hay Socket.IO...`                          | "Luồng quyết định" chưa tự nhiên trong caption học thuật.                                   | `Quy trình lựa chọn kênh giao tiếp TCP/gRPC, Kafka hoặc Socket.IO...`                                                                     |
| LNG-P0-07 | `chapters/05-trien-khai-he-thong.tex:1`              | `\chapter{Hiện thực các luồng vận hành cốt lõi của QRTable}`                      | Đã bị gạch "Hiện thực" và "cốt lõi".                                                        | `\chapter{Các luồng vận hành chính của QRTable}` hoặc `\chapter{Triển khai các luồng vận hành chính của QRTable}`                         |
| LNG-P0-08 | `chapters/05-trien-khai-he-thong.tex:23`             | `\section{Khách quét QR, tạo phiên và giỏ món dùng chung}`                        | Tiêu đề giống mô tả thao tác người dùng; bị khoanh vùng toàn bộ.                            | `\section{Phiên đặt món qua mã QR và giỏ dùng chung}`                                                                                     |
| LNG-P0-09 | `chapters/05-trien-khai-he-thong.tex:30`             | `Luồng khách quét QR, mở phiên và cập nhật giỏ dùng chung.`                       | Caption cũng dùng kiểu actor + hành động.                                                   | `Luồng quản lý phiên đặt món qua mã QR và giỏ dùng chung.`                                                                                |
| LNG-P0-10 | `chapters/05-trien-khai-he-thong.tex:168`            | `Tổng hợp bằng chứng triển khai các luồng cốt lõi.`                               | "cốt lõi" và "bằng chứng" hơi giống tài liệu audit.                                         | `Tổng hợp kết quả triển khai các luồng chính.`                                                                                            |
| LNG-P0-11 | `chapters/06-danh-gia.tex:84`                        | `Kiểm chứng các luồng nghiệp vụ cốt lõi`                                          | Nên đồng bộ với quy tắc thay "cốt lõi".                                                     | `Kiểm chứng các luồng nghiệp vụ chính`                                                                                                    |
| LNG-P0-12 | `chapters/01-mo-dau.tex:132-134`                     | Tóm tắt các chương dùng lại "quyết định công nghệ", "hiện thực", "luồng cốt lõi". | Nếu chỉ sửa tiêu đề chương mà không sửa phần dẫn nhập, mục lục nội dung sẽ không nhất quán. | Đồng bộ mô tả Chương 4, Chương 5 theo tiêu đề mới.                                                                                        |

## 4. Các điểm cần sửa ưu tiên trung bình theo chương

### Frontmatter và tóm tắt

| Vị trí                        | Vấn đề                                                                            | Đề xuất                                                           |
| ----------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `frontmatter/abstract.tex:8`  | Cụm "luồng vận hành cốt lõi", "giỏ món dùng chung" lặp lại phong cách bị góp ý.   | Dùng "luồng vận hành chính" và "giỏ đặt món dùng chung".          |
| `frontmatter/abstract.tex:12` | "đã được mô tả, hiện thực..." dùng "hiện thực".                                   | Đổi thành "đã được mô tả và triển khai...".                       |
| `frontmatter/abstract.tex:14` | Câu phủ định dài: "không khẳng định... chưa đưa ra..." dễ tạo cảm giác phòng thủ. | Rút gọn thành một câu về phạm vi kiểm chứng và giới hạn đánh giá. |

### Chương 1

| Vị trí                           | Vấn đề                                                                                                                           | Đề xuất                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `chapters/01-mo-dau.tex:23`      | "Điểm đáng nghiên cứu nằm ở..." và chuỗi "khách quét QR", "giỏ dùng chung", `tenant` còn khẩu ngữ/kỹ thuật lẫn nhau.             | Viết lại theo cấu trúc học thuật: "Vấn đề nghiên cứu tập trung vào..."                                         |
| `chapters/01-mo-dau.tex:35`      | "khách quét mã QR... thao tác giỏ món dùng chung" thiên về thao tác.                                                             | "quản lý phiên đặt món qua mã QR và giỏ đặt món dùng chung".                                                   |
| `chapters/01-mo-dau.tex:39-41`   | `tenant`, `tenant isolation`, `idempotency`, `data ownership`, `consistency` xuất hiện dày.                                      | Dịch các thuật ngữ không bắt buộc: "đơn vị thuê bao", "cô lập dữ liệu theo đơn vị thuê bao", "tính nhất quán". |
| `chapters/01-mo-dau.tex:60`      | Bảng dùng câu "dễ bị chậm hoặc nhập thiếu", "gọi thêm món" hơi đời thường.                                                       | "có nguy cơ chậm trễ hoặc sai sót khi nhập liệu"; "bổ sung món".                                               |
| `chapters/01-mo-dau.tex:66`      | "Nhiều tenant..." không hợp chính sách thuật ngữ.                                                                                | "Nhiều đơn vị thuê bao..."                                                                                     |
| `chapters/01-mo-dau.tex:74-76`   | Nhiều cụm tiếng Anh và "hiện thực các luồng vận hành cốt lõi".                                                                   | Tách câu; chuyển "cốt lõi" thành "chính"; dịch thuật ngữ không phải tên pattern.                               |
| `chapters/01-mo-dau.tex:86-90`   | `event-driven architecture`, `service boundary`, `data ownership`, `observability`, `deployment` xuất hiện như danh sách nội bộ. | Giữ thuật ngữ chính nếu đã định nghĩa, nhưng thêm diễn giải tiếng Việt hoặc giảm mật độ tiếng Anh.             |
| `chapters/01-mo-dau.tex:116-118` | "Đóng góp thứ ba là hiện thực..." và "production".                                                                               | "Đóng góp thứ ba là triển khai..." và "môi trường triển khai công khai" nếu phù hợp.                           |

### Chương 2

| Vị trí                                                        | Vấn đề                                              | Đề xuất                                                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex:3`   | "mô hình đa tenant".                                | "mô hình nhiều đơn vị thuê bao" hoặc "multi-tenancy (mô hình nhiều đơn vị thuê bao)" khi định nghĩa lần đầu.                   |
| `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex:7`   | "yêu cầu cốt lõi".                                  | "yêu cầu chính" hoặc "yêu cầu trọng yếu".                                                                                      |
| `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex:84`  | `\section{SaaS và mô hình đa tenant}`.              | `\section{SaaS và mô hình nhiều đơn vị thuê bao}`                                                                              |
| `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex:126` | "khóa luận không nên..." giống ghi chú cho tác giả. | Viết lại thành nhận định trực tiếp: "Vì vậy, mô hình nhiều đơn vị thuê bao cần được trình bày như một lựa chọn có đánh đổi..." |
| `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex:332` | Caption "hệ thống/sản phẩm" dùng dấu gạch chéo.     | "Tổng hợp các hệ thống và sản phẩm liên quan..."                                                                               |
| `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex:360` | "Chương 5 trình bày hiện thực".                     | "Chương 5 trình bày cách triển khai..." hoặc "Chương 5 trình bày các luồng vận hành chính..."                                  |
| `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex:381` | "SaaS / đa tenant" trong bảng.                      | "SaaS và nhiều đơn vị thuê bao".                                                                                               |

### Chương 3

| Vị trí                                      | Vấn đề                                                                                                                                 | Đề xuất                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `chapters/03-phan-tich-yeu-cau.tex:5-24`    | `tenant` xuất hiện dày trong văn xuôi.                                                                                                 | Thay bằng "đơn vị thuê bao" trừ khi đang nói về `tenant_id` hoặc tên kỹ thuật. |
| `chapters/03-phan-tich-yeu-cau.tex:22`      | "Quyết toán thanh toán" chưa thật chuẩn nghĩa.                                                                                         | "Ghi nhận và đối soát thanh toán".                                             |
| `chapters/03-phan-tich-yeu-cau.tex:31`      | Nhắc "PlantUML" dù source song song hiện có cả Mermaid `.mmd` và PlantUML `.puml`; tên công cụ không cần xuất hiện trong câu luận văn. | Bỏ tên công cụ hoặc dùng "sơ đồ trường hợp sử dụng".                           |
| `chapters/03-phan-tich-yeu-cau.tex:51-63`   | Bảng tác nhân dùng nhiều `tenant`, `role`, `session`.                                                                                  | Dịch các mô tả hiển thị; giữ role nếu đó là định danh code và cần ghi rõ.      |
| `chapters/03-phan-tich-yeu-cau.tex:90-122`  | Các use case như "Đưa tenant vào hệ thống", "Báo cáo tenant".                                                                          | "Đưa đơn vị thuê bao vào hệ thống", "Báo cáo theo đơn vị thuê bao".            |
| `chapters/03-phan-tich-yeu-cau.tex:100`     | "client phải lấy lại ảnh chụp trạng thái" chưa tự nhiên.                                                                               | "client cần lấy lại trạng thái mới nhất từ máy chủ".                           |
| `chapters/03-phan-tich-yeu-cau.tex:126`     | "không nên tiếp nhận thao tác mới tùy tiện" mang văn nói.                                                                              | "không tiếp nhận thao tác tạo mới ngoài chính sách đã định".                   |
| `chapters/03-phan-tich-yeu-cau.tex:155`     | "Cách đánh giá an toàn" hơi giống checklist nội bộ.                                                                                    | "Phương pháp đánh giá".                                                        |
| `chapters/03-phan-tich-yeu-cau.tex:174`     | "Khả kiểm thử" chưa tự nhiên.                                                                                                          | "Khả năng kiểm thử".                                                           |
| `chapters/03-phan-tich-yeu-cau.tex:225-229` | "giỏ món dùng chung", "các luồng cốt lõi", "hiện thực".                                                                                | Đồng bộ thành "giỏ đặt món dùng chung", "các luồng chính", "triển khai".       |

### Chương 4

| Vị trí                                                   | Vấn đề                                                                       | Đề xuất                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:9-15`    | "Các quyết định kiến trúc", "Quyết định này..." lặp lại từ bị góp ý.         | Dùng "lựa chọn kiến trúc", "cách tổ chức này".                                         |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:13`      | "yêu cầu thiết kế cốt lõi".                                                  | "yêu cầu thiết kế trọng yếu".                                                          |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:58`      | "luồng quyết định" trong prose.                                              | "quy trình lựa chọn".                                                                  |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:67`      | "đọc nhanh" mang sắc thái nói.                                               | "cung cấp cái nhìn tổng quan".                                                         |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:337-344` | "kỷ luật phát sự kiện" hơi cứng và không tự nhiên trong caption.             | "quy tắc phát sự kiện" hoặc "nguyên tắc phát sự kiện".                                 |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:374`     | "Giới hạn thiết kế và các khẳng định không mở rộng" giống tài liệu audit.    | "Phạm vi áp dụng của thiết kế hướng sự kiện".                                          |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:437`     | "Ghi chú consistency".                                                       | "Ghi chú về tính nhất quán".                                                           |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:524-526` | Subsection và câu văn dùng `Request context`, `method`.                      | "Ngữ cảnh yêu cầu và chuỗi kiểm soát tại BFF"; "phương thức".                          |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:541-546` | Bảng dùng `actor`, `staff/admin`, `customer session`.                        | "tác nhân", "nhân viên/quản trị", "phiên khách hàng".                                  |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:553-573` | `tenant isolation`, `Plan entitlement`, `Platform permission` trong bảng.    | Dịch phần mô tả hiển thị; giữ tên policy/permission nếu là định danh code.             |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:586-588` | "phạm vi khẳng định" và nhiều thuật ngữ tiếng Anh dày đặc.                   | "Phạm vi kiểm chứng của thiết kế bảo mật"; giảm mật độ tiếng Anh.                      |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex:607-621` | "Thiết kế triển khai và giới hạn khẳng định"; các dòng "Quyết định dùng...". | "Thiết kế triển khai và phạm vi kiểm chứng"; dùng "Việc sử dụng..." hoặc "Lựa chọn..." |

### Chương 5

| Vị trí                                        | Vấn đề                                                                          | Đề xuất                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `chapters/05-trien-khai-he-thong.tex:3-5`     | "được hiện thực", "khách quét QR", "giỏ món chung".                             | "được triển khai", "phiên đặt món qua mã QR", "giỏ đặt món dùng chung".                                     |
| `chapters/05-trien-khai-he-thong.tex:34-38`   | "giỏ món dùng chung" và "ghi đè lẫn nhau một cách âm thầm".                     | "giỏ đặt món dùng chung"; "ghi đè mà không được phát hiện".                                                 |
| `chapters/05-trien-khai-he-thong.tex:43`      | Caption dùng "trái→phải" và "giỏ món".                                          | "từ trái sang phải"; "giỏ đặt món".                                                                         |
| `chapters/05-trien-khai-he-thong.tex:63`      | `hardening`, `exactly-once` chen vào câu.                                       | Dùng "củng cố vận hành" cho `hardening`; giữ `exactly-once` nếu đang nói về đúng khái niệm đảm bảo.         |
| `chapters/05-trien-khai-he-thong.tex:70`      | "Điều phối bếp/KDS..." dùng gạch chéo.                                          | "Điều phối KDS cho bếp và cập nhật thời gian thực".                                                         |
| `chapters/05-trien-khai-he-thong.tex:90`      | Caption dùng `snapshot`.                                                        | "bản chụp trạng thái" hoặc "trạng thái mới nhất".                                                           |
| `chapters/05-trien-khai-he-thong.tex:136-153` | Caption ảnh dùng nhiều `Management App`, `Owner`, `Super Admin`, `entitlement`. | Dùng "client quản trị", "chủ quán", "quản trị hệ thống", "quyền theo gói" nếu không cần giữ định danh code. |
| `chapters/05-trien-khai-he-thong.tex:155`     | "Đóng gói triển khai và khung minh chứng production".                           | "Đóng gói triển khai và minh chứng vận hành trên môi trường công khai".                                     |
| `chapters/05-trien-khai-he-thong.tex:171-181` | Header có dấu gạch chéo; `offline queue`, `durable saga state`, `hardening`.    | "Bất biến và ranh giới"; "hàng đợi thao tác ngoại tuyến"; "trạng thái Saga bền vững".                       |
| `chapters/05-trien-khai-he-thong.tex:190-198` | `orchestration`, `contract`, `compensation`, "Điểm commit".                     | "điều phối", "hợp đồng", "bù trừ"; cân nhắc "điểm ghi nhận" nếu không cần giữ `commit`.                     |
| `chapters/05-trien-khai-he-thong.tex:212`     | "vượt khỏi bản mô tả kiến trúc" hơi tu từ.                                      | "không chỉ dừng ở mô tả kiến trúc".                                                                         |

### Chương 6

| Vị trí                             | Vấn đề                                                       | Đề xuất                                                                                           |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `chapters/06-danh-gia.tex:4-12`    | "lõi", "cốt lõi", `production`.                              | "chính"; định nghĩa/cố định cách gọi môi trường production.                                       |
| `chapters/06-danh-gia.tex:25`      | Caption "Chính sách diễn đạt kết luận..." giống rule nội bộ. | "Nguyên tắc phân loại kết luận theo loại bằng chứng".                                             |
| `chapters/06-danh-gia.tex:49-57`   | `P0/P1` và dấu gạch chéo trong header.                       | "nhóm yêu cầu ưu tiên cao"; "Giới hạn và phạm vi mở rộng".                                        |
| `chapters/06-danh-gia.tex:78-80`   | Câu dài, nhiều "chưa"; `workspace`.                          | Rút gọn và dùng "kho mã nguồn".                                                                   |
| `chapters/06-danh-gia.tex:86`      | "khách không quan tâm..." hơi khẩu ngữ.                      | "Ở góc nhìn người dùng cuối..."                                                                   |
| `chapters/06-danh-gia.tex:181`     | "Chỉ gọi đã minh họa..." chưa tự nhiên.                      | "Chỉ kết luận đã được minh họa trên trình duyệt khi có ảnh chụp hoặc kết quả kiểm thử khói thật." |
| `chapters/06-danh-gia.tex:201-226` | Phần giới hạn có nhiều câu phủ định liên tiếp.               | Giữ tính trung thực nhưng nhóm lại theo loại giới hạn để giảm cảm giác phòng thủ.                 |
| `chapters/06-danh-gia.tex:238`     | "đã đạt mức hoàn thiện đáng kể" hơi chủ quan.                | "đáp ứng phần lớn các mục tiêu chính trong phạm vi đề tài".                                       |

### Chương 7

| Vị trí                                               | Vấn đề                                                              | Đề xuất                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `chapters/07-ket-luan-va-huong-phat-trien.tex:9-17`  | "hiện thực", "lõi", "cốt lõi", `provider live`, `production`.       | "triển khai", "chính"; "kiểm chứng với nhà cung cấp thực"; "môi trường triển khai công khai".    |
| `chapters/07-ket-luan-va-huong-phat-trien.tex:19`    | `Owner`, `Manager`, `Super Admin` trong văn xuôi.                   | "chủ quán", "quản lý", "quản trị hệ thống", trừ khi đang liệt kê role code.                      |
| `chapters/07-ket-luan-va-huong-phat-trien.tex:21-23` | `P0/P1`, `production` là ngôn ngữ tài liệu nội bộ.                  | "nhóm yêu cầu ưu tiên cao"; "môi trường triển khai công khai".                                   |
| `chapters/07-ket-luan-va-huong-phat-trien.tex:27`    | "giỏ món dùng chung".                                               | "giỏ đặt món dùng chung".                                                                        |
| `chapters/07-ket-luan-va-huong-phat-trien.tex:31-41` | `exactly-once`, `hardening`, `rollback`, `benchmark` xuất hiện dày. | Giữ thuật ngữ thật sự cần thiết, nhưng thêm diễn giải tiếng Việt và giảm mật độ trong cùng đoạn. |
| `chapters/07-ket-luan-va-huong-phat-trien.tex:45-59` | Danh sách hướng phát triển dùng nhiều dấu gạch chéo và tiếng Anh.   | Chuyển thành cụm tiếng Việt rõ nghĩa; giữ tên miền như CRM/mobile nếu cần.                       |

### Phụ lục đang được include

| Vị trí                                 | Vấn đề                                                            | Đề xuất                                                                            |
| -------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `appendices/d-test-evidence.tex:8`     | `runtime` trong văn xuôi.                                         | "cấu hình khi vận hành".                                                           |
| `appendices/d-test-evidence.tex:25`    | Caption "Catalog stock gateway" tiếng Anh.                        | "hợp đồng trừ và hoàn tồn kho của Catalog".                                        |
| `appendices/d-test-evidence.tex:29`    | `commit/outbox`, `deduct/release`, `stock gateway` trong câu.     | Dịch phần mô tả: "ghi nhận Order/outbox", "trừ/hoàn tồn kho"; giữ tên hàm nếu cần. |
| `appendices/d-test-evidence.tex:72-73` | `Order/Catalog gateway`, `TCP deduct/release` trong caption/bảng. | "gateway giữa Order và Catalog"; "TCP trừ/hoàn tồn kho".                           |

### Phụ lục/source chưa được include trong bản main

Các file `appendices/a-ui-gallery.tex`, `appendices/b-setup-demo.tex`, `appendices/c-source-release.tex`, `appendices/e-extended-diagrams.tex` hiện chưa được include trong `undergraduate-theses-report.tex`, nhưng vẫn nên chuẩn hóa nếu dự kiến đưa vào bản cuối.

| Vị trí                              | Vấn đề                                                                      | Đề xuất                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `appendices/a-ui-gallery.tex:1-5`   | Tiêu đề/section còn pha `client`, `POS`, `Auth`.                            | "Minh họa các client của hệ thống QRTable"; "Client POS cho nhân viên"; "Đăng nhập và phân quyền".       |
| `appendices/a-ui-gallery.tex:20-91` | Caption ảnh dùng `Owner`, `billing`, `staff/owner/admin`, `callback OAuth`. | Dịch vai trò hiển thị; dùng "thanh toán định kỳ/gói dịch vụ" theo ngữ cảnh; "đường gọi lại OAuth SePay". |

## 5. Câu hỏi phản biện để dùng khi chỉnh sửa

Khi sửa từng tiêu đề/caption/đoạn văn, nên tự hỏi nhanh:

1. Cụm này là tiêu đề học thuật hay giống ghi chú triển khai nội bộ?
2. Nếu bỏ "cốt lõi", câu có mất nghĩa không? Nếu không mất, bỏ hoặc thay bằng "chính".
3. Từ "quyết định" đang chỉ một quyết định nghiên cứu thật sự hay chỉ là lựa chọn công nghệ? Nếu là lựa chọn, dùng "lựa chọn".
4. "Hiện thực" có cần xuất hiện trong tiêu đề không? Nếu không, dùng "triển khai" trong câu văn hoặc bỏ khỏi tiêu đề.
5. Thuật ngữ tiếng Anh này có phải tên riêng, pattern, tên thư viện, tên role/code không? Nếu không, dịch sang tiếng Việt.
6. Câu này có đang nói như checklist audit không? Nếu có, chuyển thành nhận định trong báo cáo.
7. Tiêu đề có đang bắt đầu bằng actor và động từ thao tác không? Nếu có, chuyển thành danh từ chỉ quy trình hoặc thành phần hệ thống.

## 6. Kế hoạch chỉnh sửa đề xuất

### Giai đoạn A: sửa tiêu đề và caption

Ưu tiên toàn bộ mục LNG-P0. Đây là phần giảng viên dễ nhìn thấy nhất qua mục lục, danh mục bảng và danh mục hình. Sau khi sửa, cần build lại PDF để kiểm tra mục lục, danh mục hình, danh mục bảng.

### Giai đoạn B: chuẩn hóa thuật ngữ toàn báo cáo

Chạy một lượt tìm và thay có kiểm soát cho các cụm: "tenant", "cốt lõi", "lõi", "hiện thực", "quyết định", "production", "dashboard/reporting", "snapshot", "runtime". Không thay tự động toàn bộ vì nhiều trường hợp là tên code, tên biến hoặc thuật ngữ cần giữ.

Trạng thái 2026-06-23: đã thực hiện trên frontmatter, Chương 1-7 và Phụ lục D đang được include. Kết quả kiểm tra lại chỉ còn các hit được giữ có chủ đích trong identifier, label, citation key, tên file/hình hoặc văn bản hành chính.

### Giai đoạn C: làm mượt văn phong từng chương

Sau khi ổn định tiêu đề và thuật ngữ, đọc lại từng chương theo flow học thuật:

- Chương 1: giảm ngôn ngữ marketing/triển khai, nhấn vào vấn đề và mục tiêu.
- Chương 2: giữ vai trò cơ sở lý thuyết, tránh câu hướng dẫn tác giả.
- Chương 3: diễn đạt yêu cầu theo actor, use case và ràng buộc nghiệp vụ; tránh giống user manual.
- Chương 4: trình bày kiến trúc như thiết kế hệ thống, không như biên bản quyết định kỹ thuật.
- Chương 5: trình bày các luồng vận hành đã triển khai, tránh từ "hiện thực" trong tiêu đề.
- Chương 6: giữ tính trung thực về giới hạn nhưng giảm ngôn ngữ audit nội bộ.
- Chương 7: kết luận bằng đóng góp và hướng phát triển, tránh gom quá nhiều thuật ngữ tiếng Anh trong cùng câu.

Trạng thái 2026-06-23: đã hoàn tất trên Chương 1-7. Lượt kiểm tra có kiểm soát xác nhận không còn các cụm mục tiêu `cốt lõi`, `lõi`, `hiện thực`, `production`, `dashboard/reporting`, `snapshot` và `runtime` trong văn xuôi các chương; các thuật ngữ kỹ thuật và identifier cần thiết vẫn được giữ theo chính sách song ngữ của báo cáo.

### Giai đoạn D: kiểm tra sau chỉnh sửa

- Build LaTeX bằng XeLaTeX.
- Kiểm tra mục lục, danh mục bảng, danh mục hình.
- Kiểm tra caption dài có bị tràn dòng hoặc thiếu dấu câu.
- Kiểm tra không phát sinh citation giả; phiên rà soát này không yêu cầu thêm nguồn mới.

Trạng thái 2026-06-23: đã hoàn tất. Build ép lại bằng XeLaTeX/TeX Live pass, PDF 150 trang; `.toc`, `.lof`, `.lot` và các trang render liên quan đã được kiểm tra. Caption Hình 5.2 và Hình D.1 đã được rút gọn ở danh mục hình; Bảng D.1 dùng cột căn trái để tránh warning underfull và vẫn đọc rõ trên PDF. Không thêm citation mới và không sửa `references.bib`.
