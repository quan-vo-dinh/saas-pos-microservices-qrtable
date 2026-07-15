# Tài nguyên hình ảnh cho khóa luận

Thư mục này lưu các tài nguyên ổn định phục vụ khóa luận QRTable.

- `figures/`: hình và sơ đồ xuất ra dạng ảnh.
- `screenshots/`: ảnh chụp giao diện và minh chứng giao diện.
- `diagrams/`: source diagram có thể chỉnh sửa.
- `tables/`: bảng dữ liệu hoặc tài nguyên trung gian phục vụ LaTeX.

Mỗi tài nguyên đưa vào khóa luận cần có caption, số hiệu theo chương và nguồn.

## Ảnh chụp giao diện

Thư mục `screenshots/` lưu ảnh giữ chỗ và ảnh chụp thực tế theo cùng một filename để các liên kết trong LaTeX ổn định. Ảnh giữ chỗ cần được thay bằng ảnh chụp thực tế trước khi sử dụng như minh chứng trong khóa luận.

Quy tắc:

- Ảnh giữ chỗ nền trắng chỉ dùng để bảo đảm LaTeX build được, không phải minh chứng giao diện.
- Không đổi filename khi thay ảnh thật, để các `\includegraphics` và `\label` trong LaTeX không phải sửa lại.
- Mapping chi tiết: `../../chapter-05-ui-gallery-scaffold-plan.md`; checklist ngắn: `../../thesis-phase5d-screenshot-scaffold.md`.
- Tạo ảnh giữ chỗ: `bash thesis-report/tools/generate-screenshot-placeholders.sh` hoặc `python3 thesis-report/tools/generate-screenshot-placeholders.py`.
- Trạng thái theo dõi đúng cho ảnh giữ chỗ là `placeholder`; chỉ dùng `captured`/`verified` sau khi thay ảnh thật và build kiểm tra.

## Chương 3 — UML diagrams (PlantUML)

- Source chính:
  - `diagrams/chapter3-actor-use-case-overview.puml` — UML use case diagram.
  - `diagrams/chapter3-business-flow.puml` — UML activity diagram.
- Render: `bash tools/render-chapter3-use-case.sh` (cần Java, Graphviz `dot`, `rsvg-convert`).
- Output: `figures/chapter3-*.pdf` cho LaTeX; `.svg` và `.png` dùng để preview.

Ghi chú: `plantuml.jar` trong repo không bundle Batik nên không dùng trực tiếp `-tpdf`; pipeline render SVG rồi `rsvg-convert` sang PDF.

## Chương 2 — Academic diagrams (PlantUML)

- Source chính: `diagrams/chapter2-*.puml`.
- Hình cho LaTeX Chương 2: `figures/chapter2-*.pdf`; `.svg` và `.png` cùng tên dùng để preview nhanh.
- Các file `.mmd` cũ chỉ là con trỏ deprecated sang `.puml`.
- Các file `.excalidraw` và thư mục icon là artifact cũ, không còn là source canonical cho Chương 2.

Render:

```bash
bash thesis-report/tools/render-chapter2-diagrams.sh
```

Pipeline: PlantUML `.puml` → SVG → PDF/PNG bằng `rsvg-convert`.

## Chương 4 — PlantUML source

- Source chính: `diagrams/chapter4-*.puml`.
- Hình cho LaTeX: `figures/chapter4-*.pdf`; PNG cùng tên dùng để preview nhanh.
- Hình 4.1 `chapter4-technology-integration-map.puml` trình bày các thành phần và công nghệ theo từng lớp kiến trúc.
- Các diagram chuyên đề Chương 4 chỉ gắn nhãn công nghệ đại diện cho trách nhiệm của mục đó, ví dụ: Nx cho ranh giới monorepo, PostgreSQL/Redis/Kafka/Socket.IO cho tenant isolation, Redis cho key ownership, Kafka cho decision flow, Keycloak cho auth và SePay cho payment. Không lặp lại toàn bộ tech stack từ Hình 4.1 trong từng hình.
- Pipeline render dùng PlantUML và Graphviz để tạo SVG, sau đó dùng `rsvg-convert` để sinh PDF/PNG. LaTeX chỉ dùng các artifact đã render trong repo.
- Node SePay dùng image node trỏ tới `diagrams/icons/sepay-placeholder.png`. Đây là ảnh placeholder nhỏ, không phải logo chính thức; khi có logo đúng, thay file PNG cùng đường dẫn, giữ kích thước file gọn rồi render lại.
- `render-chapter4-diagrams.sh` tự nhúng các image path dạng `assets/...` thành data URI trong file Mermaid tạm để PDF/PNG không bị mất ảnh khi Mermaid CLI export.

Render một hình:

```bash
bash thesis-report/tools/render-chapter4-diagrams.sh chapter4-technology-integration-map
```

Render toàn bộ Mermaid Chương 4:

```bash
bash thesis-report/tools/render-chapter4-diagrams.sh
```

Quy tắc: sửa `.mmd` trước, render lại PDF/PNG, rồi build LaTeX. Không sửa trực tiếp file PDF.

## Chương 4 — DBML database/schema per service

**Chính sách cố định:** xem `figures/CHAPTER4-DB-SCHEMA-SVG.md`.

| Vai trò                              | Đường dẫn                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Hình trong PDF khóa luận (canonical) | `figures/chapter4-db-*-schema.svg` — export từ **dbdiagram.io**, commit vào repo         |
| Đối chiếu schema / import web        | `diagrams/dbml/chapter4-*-schema.dbml` — từ mã nguồn QRTable, **không** tự ghi đè `.svg` |
| Preview IDE                          | `.pdf`/`.png` cùng tên — sinh từ `.svg` bằng script, không dùng trong LaTeX              |

- Chương 4: `\includesvg{chapter4-db-...-schema.svg}`; cache build: `svg-inkscape/`.
- Script mặc định **chỉ** đọc `.svg` web → cập nhật preview; **không** gọi `dbml-renderer` trừ khi `ALLOW_DBML_SVG_OVERWRITE=1 ... --from-dbml`.

Sau khi export SVG từ web:

```bash
bash thesis-report/tools/render-chapter4-dbml.sh
latexmk -xelatex undergraduate-theses-report.tex   # trong thesis-report/
```

Một service:

```bash
bash thesis-report/tools/render-chapter4-dbml.sh chapter4-db-order-schema
```
