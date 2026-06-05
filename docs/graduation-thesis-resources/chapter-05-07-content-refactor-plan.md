# Index - Plan refactor Chương 4-7 QRTable

> Ngày tách: 2026-06-04.
> File này chỉ là index/handoff ngắn để tránh agent load một plan quá dài.
> Không dùng file này như plan thực thi chính.
> Trạng thái sync 2026-06-04: Plan A đã hoàn tất và được verify. Plan B sau đó đã audit/rerun phần Chương 6-7 từng bị khởi động dở trong session song song, cập nhật Chương 6-7 theo output Plan A và build XeLaTeX/TeX Live pass.

Plan dài ban đầu đã được tách thành các plan độc lập:

1. [Plan A - Refactor Chương 4-5 QRTable](./chapter-04-05-content-refactor-plan.md)

- Bổ sung thiết kế dữ liệu/database schema cho Chương 4.
- Refactor Chương 5 theo luồng vận hành cốt lõi.
- Rút gọn code-level detail, xử lý diagram Chương 5, thêm Dashboard/Reporting và khung Production/Pilot.

2. [Plan B - Refactor Chương 6-7 QRTable](./chapter-06-07-evaluation-conclusion-refactor-plan.md)

- Refactor Chương 6 theo hướng kiểm chứng/đánh giá.
- Viết Chương 7 kết luận/hướng phát triển.
- Giữ policy không benchmark monolith giả, không overclaim Phase 6/7, chỉ claim production/pilot khi có artifact thật.

3. [Plan C - Sơ đồ database per-service bằng dbdiagram.io](./chapter-04-database-dbdiagram-plan.md)

- Bổ sung DBML source và ảnh render/export từ dbdiagram.io cho từng database/service.
- Dùng codebase hiện tại làm source of truth, không dùng ERD/DBML cũ.
- Chèn hình vào Chương 4 hoặc phụ lục tùy page budget.

Thứ tự khuyến nghị:

1. Plan A đã chạy xong cho Chương 4-5; chỉ quay lại nếu cần polish nhỏ hoặc sửa lỗi build.
2. Plan B đã audit/rerun cho Chương 6-7; chỉ quay lại nếu có artifact production/pilot thật hoặc cần polish reviewer.
3. Chạy Plan C sau Plan A/B hoặc song song có kiểm soát nếu agent chỉ chạm Chương 4/assets; tránh sửa Chương 6-7 trong Plan C.
4. Không trộn toàn bộ ba plan trong một thread nếu muốn tránh tràn ngữ cảnh.

Guardrail chung:

- Dùng CodeGraph trước khi sửa nội dung codebase-derived.
- Khi thực thi từng plan, đọc mục `Protocol bắt buộc khi thực thi plan` trong Plan A, Plan B hoặc Plan C: viết tiếng Việt, dùng web/browser/Context7 khi cần, không invent citation, dùng relevant installed skills khi phù hợp, cuối session build LaTeX và cập nhật workflow plan.
- Không dùng DBML/ERD cũ làm source of truth cho database/schema.
- Không đưa technical Phase 6 Observability thành trụ cột nội dung.
- Phase 7 Production Deployment được viết khung ngắn trước, chỉ chuyển thành kết quả đã kiểm chứng khi có artifact production/pilot thật.
- Build LaTeX và cập nhật `thesis-workflow-plan.md` cuối session.
