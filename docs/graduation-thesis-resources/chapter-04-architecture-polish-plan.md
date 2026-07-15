# Kế hoạch triển khai cập nhật Chương 4

> Tài liệu phục vụ khóa luận, tạo ngày 2026-06-04. Plan này dành cho session/AI triển khai polish Chương 4 theo `chapter-04-architecture-polish-spec.md`; không đặt trong `docs/superpowers/` vì đây là workflow viết khóa luận.

## Goal

Cập nhật Chương 4 để trình bày QRTable như một tập hợp quyết định kiến trúc và quyết định công nghệ có bằng chứng, có diagram trực quan, chuyên nghiệp và không overclaim.

## Scope

- Làm: Chương 4 LaTeX, diagram Chương 4, artifact backlog, outline/evidence/workflow liên quan.
- Không làm: Chương 3, implementation code, screenshot/demo evidence Chương 5, plan/spec kỹ thuật trong `docs/superpowers/`.

## Tasks

- [x] Task 1: Read the room bằng CodeGraph và tài liệu nền.
      Verify: `codegraph status .` pass; agent ghi lại services/core boundaries hiện tại từ `chapter-04-architecture-evidence.md`, `docs/technical-architecture.md`, source tree `apps/`, `libs/`.

- [x] Task 2: Chốt outline Chương 4 trước khi viết.
      Verify: mapping tên mục mới được ghi vào nháp nội bộ hoặc cập nhật trực tiếp trong `.tex`; không còn mục quá chung chung nếu có tên tốt hơn trong spec.

- [x] Task 3: Audit technology choices bằng evidence.
      Verify: tạo bảng technology -> QRTable component -> architecture driver -> trade-off/limit; mọi claim về framework/library/API/cloud đã dùng `ctx7` hoặc nguồn chính thức nếu cần.

- [x] Task 4: Thiết kế Hình 4.x "Các thành phần và công nghệ trong kiến trúc QRTable".
      Verify: source diagram nằm trong `thesis-report/assets/diagrams/`; hình thể hiện client, BFF, services, data/runtime, external providers và các luồng chính; không chỉ là logo gallery.

- [x] Task 5: Render và chèn hình các thành phần và công nghệ vào LaTeX.
      Verify: rendered PDF/PNG nằm trong `thesis-report/assets/figures/`; `.tex` có `\includegraphics`, caption/source/label; build LaTeX không lỗi.

- [x] Task 6: Cập nhật hoặc bổ sung diagram con theo mức cần thiết.
      Verify: ưu tiên theo thứ tự: Nx monorepo/module boundary, communication topology, security/auth flow, SePay/VietQR payment flow, Redis ownership. Chỉ thêm diagram đã render được và có source.

- [x] Task 7: Rewrite prose Chương 4.
      Verify: chương giải thích "vì sao chọn" và "trade-off là gì"; giữ đúng guardrails: 5 Kafka topics, WebSocket hint/refetch, no Notification Service, no customer Keycloak, no production-grade overclaim.

- [x] Task 8: Đồng bộ tài liệu khóa luận.
      Verify: cập nhật `chapter-04-architecture-evidence.md`, `thesis-official-outline.md`, `thesis-artifact-backlog.md`, `thesis-agent-prompt-bank.md` nếu cần, và luôn cập nhật `thesis-workflow-plan.md`.

- [x] Task 9: Verification cuối.
      Verify: build LaTeX bằng XeLaTeX/TeX Live; kiểm tra danh mục hình/bảng nếu có artifact mới; `rg` không còn lỗi known như `Kafka<br/>6 approved domain topics` trong diagram source Chương 4.

- [x] Task 10: Final handoff.
      Verify: báo cáo ngắn các file đã sửa, artifact đã thêm, build result, phần còn lại nếu có; không claim hoàn tất nếu chưa build pass.

## Suggested Implementation Order

1. Tạo/cập nhật diagram trước, vì cấu trúc prose nên bám vào hình.
2. Viết phần lựa chọn công nghệ ngay sau architecture drivers để người đọc hiểu stack trước khi vào chi tiết service boundary.
3. Giữ overall/C4 diagram hiện có làm góc nhìn tổng thể; dùng hình các thành phần và công nghệ để giải thích vị trí sử dụng và luồng kết nối.
4. Chỉ thêm nhiều diagram con nếu chúng thật sự giảm tải chữ trong chương; nếu không, ưu tiên một hình tốt và một bảng technology decision tốt.

## Done When

- [x] Chương 4 đã có tên chương/tên mục đã polish.
- [x] Có technology decision table hoặc nội dung tương đương.
- [x] Có hình các thành phần và công nghệ đã render và chèn vào PDF.
- [x] Artifact backlog và workflow plan phản ánh trạng thái thật.
- [x] LaTeX build pass.
- [x] Không có citation/source/topic/service/claim tự bịa.

## Implementation Note

Đã triển khai ngày 2026-06-04. Phạm vi thực hiện đã mở rộng từ P0 sang nhóm P1 đã chốt trong thảo luận: rewrite Chương 4, thêm Bảng 4.1 quyết định công nghệ, thêm Hình 4.1 về các thành phần và công nghệ, sửa Hình 4.2 overall architecture còn 5 Kafka topic được chấp nhận, bổ sung Hình 4.4 Nx module boundary, Hình 4.6 communication topology, Hình 4.8 Redis ownership, Hình 4.9 security/auth flow và Hình 4.10 SePay/VietQR payment architecture. Source PlantUML của các sơ đồ đã lưu trong `thesis-report/assets/diagrams/`; PDF/PNG đã lưu trong `thesis-report/assets/figures/`; LaTeX build pass bằng XeLaTeX/TeX Live.
