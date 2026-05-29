# Thesis Assets

Thư mục này lưu artifact ổn định cho khóa luận QRTable.

- `figures/`: hình và sơ đồ xuất ra dạng ảnh.
- `screenshots/`: ảnh chụp giao diện và demo evidence.
- `diagrams/`: source diagram có thể chỉnh sửa.
- `tables/`: bảng dữ liệu hoặc artifact trung gian phục vụ LaTeX.

Mỗi artifact đưa vào khóa luận cần có caption, số hiệu theo chương và nguồn.

## Screenshot placeholders - Phase 5D

Phase 5D dùng `screenshots/` để lưu placeholder trắng và screenshot thật theo cùng một filename. Agent không chụp UI tự động trong phase này; người viết sẽ thay file placeholder bằng screenshot thật sau.

Quy tắc:

- Placeholder trắng chỉ là scaffold để LaTeX build được, không phải demo evidence.
- Không đổi filename khi thay ảnh thật, để các `\includegraphics` và `\label` trong LaTeX không phải sửa lại.
- Mapping chính nằm tại `../../thesis-phase5d-screenshot-scaffold.md`.
- Trạng thái backlog đúng cho placeholder là `placeholder`; chỉ dùng `captured`/`verified` sau khi thay ảnh thật và build kiểm tra.

## Hình 3.1 — use case UML (PlantUML)

- Source: `diagrams/chapter3-actor-use-case-overview.puml`
- Render: `bash tools/render-chapter3-use-case.sh` (cần Java, Graphviz `dot`, `rsvg-convert` cho PDF)
- Output: `figures/chapter3-actor-use-case-overview.pdf` (LaTeX chèn file này)

Ghi chú: `plantuml.jar` trong repo không bundle Batik nên không dùng trực tiếp `-tpdf`; pipeline render SVG rồi `rsvg-convert` sang PDF.
