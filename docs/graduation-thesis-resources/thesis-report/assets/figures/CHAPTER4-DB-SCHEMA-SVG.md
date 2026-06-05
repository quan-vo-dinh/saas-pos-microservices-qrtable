# Sơ đồ database Chương 4 — nguồn SVG cố định

**Nguồn hình trong PDF khóa luận (canonical):** các file sau, xuất từ [dbdiagram.io](https://dbdiagram.io) (hoặc công cụ web tương đương), **không** sinh bằng `dbml-renderer` CLI:

- `chapter4-db-catalog-schema.svg`
- `chapter4-db-order-schema.svg`
- `chapter4-db-payment-schema.svg`
- `chapter4-db-saas-schema.svg`
- `chapter4-db-user-access-schema.svg`

LaTeX Chương 4 gọi trực tiếp các file này qua `\includesvg{...}`.

**DBML** tại `assets/diagrams/dbml/` chỉ dùng để audit schema từ codebase và import vào dbdiagram khi cần chỉnh sơ đồ — **không** được script render mặc định ghi đè `.svg` trong thư mục này.

## Cập nhật sơ đồ

1. Chỉnh layout trên dbdiagram.io (có thể import DBML làm điểm xuất phát).
2. Export SVG → ghi đè đúng tên file trong `assets/figures/`.
3. `bash thesis-report/tools/render-chapter4-dbml.sh` — chỉ tạo lại `.pdf`/`.png` preview, **không** đụng `.svg`.
4. `latexmk -xelatex` trong `thesis-report/` (`.latexmkrc` bật `-shell-escape`).

## Tái sinh SVG từ DBML (chỉ khi cố ý)

```bash
ALLOW_DBML_SVG_OVERWRITE=1 bash thesis-report/tools/render-chapter4-dbml.sh --from-dbml
```

Lệnh này ghi đè bản SVG web — tránh dùng trong workflow khóa luận thông thường.
