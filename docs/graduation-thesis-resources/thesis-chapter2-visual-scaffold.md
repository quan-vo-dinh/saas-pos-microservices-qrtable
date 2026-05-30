# Phase 2B — Khung hình và diagram Chương 2

> Tài liệu điều phối minh họa lý thuyết Chương 2 (cơ sở lý thuyết và công trình liên quan).
> Cập nhật: 2026-05-29.
> Không dùng screenshot UI QRTable trong chương này.

## 1. Nguyên tắc

- Mỗi mục §2.1–§2.8 có **một hình khái niệm** (Hình 2.1–2.8).
- Source chỉnh sửa: `thesis-report/assets/diagrams/chapter2-*.excalidraw`.
- File LaTeX chèn: `thesis-report/assets/figures/chapter2-*.png` (export từ Excalidraw, cùng tên base).
- Diagram do tác giả xây dựng ở mức lý thuyết; không mô tả kiến trúc triển khai QRTable chi tiết (để Chương 4–5).
- Render: `bash thesis-report/tools/render-chapter2-diagrams.sh` (Excalidraw JSON + embedded logos → SVG → PDF). **Không dùng Mermaid.**
- Icons: `thesis-report/assets/diagrams/chapter2-icons/` (SVG thật, nhúng vào `.excalidraw` qua `files` + `type: image`).

## 2. Mapping Hình 2.1–2.8

| ID       | Mục                | Filename PDF                             | Source Excalidraw                               | LaTeX label                              | Owner |
| -------- | ------------------ | ---------------------------------------- | ----------------------------------------------- | ---------------------------------------- | ----- |
| Hình 2.1 | §2.1 POS F&B       | `chapter2-fnb-pos-lifecycle.png`         | `chapter2-fnb-pos-lifecycle.excalidraw`         | `fig:chapter2-fnb-pos-lifecycle`         | Agent |
| Hình 2.2 | §2.2 QR ordering   | `chapter2-qr-ordering-flow.png`          | `chapter2-qr-ordering-flow.excalidraw`          | `fig:chapter2-qr-ordering-flow`          | Agent |
| Hình 2.3 | §2.3 SaaS          | `chapter2-saas-multitenancy.png`         | `chapter2-saas-multitenancy.excalidraw`         | `fig:chapter2-saas-multitenancy`         | Agent |
| Hình 2.4 | §2.4 Microservices | `chapter2-monolith-vs-microservices.png` | `chapter2-monolith-vs-microservices.excalidraw` | `fig:chapter2-monolith-vs-microservices` | Agent |
| Hình 2.5 | §2.5 Kafka         | `chapter2-kafka-event-flow.png`          | `chapter2-kafka-event-flow.excalidraw`          | `fig:chapter2-kafka-event-flow`          | Agent |
| Hình 2.6 | §2.6 Consistency   | `chapter2-outbox-saga-overview.png`      | `chapter2-outbox-saga-overview.excalidraw`      | `fig:chapter2-outbox-saga-overview`      | Agent |
| Hình 2.7 | §2.7 Realtime      | `chapter2-websocket-hint-refetch.png`    | `chapter2-websocket-hint-refetch.excalidraw`    | `fig:chapter2-websocket-hint-refetch`    | Agent |
| Hình 2.8 | §2.8 Security      | `chapter2-oidc-rbac-saas-pos.png`        | `chapter2-oidc-rbac-saas-pos.excalidraw`        | `fig:chapter2-oidc-rbac-saas-pos`        | Agent |

### Caption và nguồn (bản chính thức — không Placeholder)

| Hình | Caption ngắn (danh mục hình)                                          | Nguồn trong caption đầy đủ                                                               |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 2.1  | Vòng đời vận hành POS F&B từ bàn đến thanh toán.                      | Tác giả xây dựng dựa trên tài liệu nghiệp vụ POS F&B và khảo sát thị trường.             |
| 2.2  | Luồng đặt món qua mã QR ở mức khái niệm.                              | Tác giả xây dựng dựa trên ISO/IEC 18004 và tài liệu sản phẩm QR ordering được trích dẫn. |
| 2.3  | Mô hình khái niệm SaaS multi-tenancy và ranh giới cô lập.             | Tác giả xây dựng dựa trên NIST SP 800-145 và Microsoft multitenant storage guidance.     |
| 2.4  | So sánh monolith và microservices theo bounded context.               | Tác giả xây dựng dựa trên Lewis/Fowler, Newman và Richardson.                            |
| 2.5  | Luồng event-driven với topic, partition và consumer group.            | Tác giả xây dựng dựa trên Apache Kafka documentation.                                    |
| 2.6  | Transactional outbox và saga choreography ở mức khái niệm.            | Tác giả xây dựng dựa trên Richardson và Garcia-Molina/Salem.                             |
| 2.7  | WebSocket hint/refetch và nguồn trạng thái có thẩm quyền.             | Tác giả xây dựng dựa trên RFC 6455.                                                      |
| 2.8  | Phân tách xác thực staff (OIDC/JWT/RBAC) và customer theo session QR. | Tác giả xây dựng dựa trên OpenID Connect Core, RFC 7519 và OWASP ASVS.                   |

## 3. Bảng bổ sung

| ID       | Vị trí            | Label                              | Trạng thái |
| -------- | ----------------- | ---------------------------------- | ---------- |
| Bảng 2.3 | §2.4 sau Hình 2.4 | `tab:chapter2-architecture-styles` | inserted   |

## 4. Artifact thủ công (tùy chọn — không trong phase scaffold)

| File                                    | Gợi ý                                                                 | Owner           |
| --------------------------------------- | --------------------------------------------------------------------- | --------------- |
| `chapter2-related-products-logos.png`   | Logo KiotViet, Sapo, iPOS từ trang chính thức; collage ngang cho §2.9 | User (P1)       |
| `chapter2-kafka-official-reference.pdf` | Diagram từ kafka.apache.org nếu muốn song song Hình 2.5               | User (tùy chọn) |

## 5. Vị trí chèn LaTeX

File: `thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`

| Mục  | Vị trí                                              |
| ---- | --------------------------------------------------- |
| §2.1 | Trước Bảng 2.1 (`tab:chapter2-pos-qr-comparison`)   |
| §2.2 | Sau đoạn “mã QR chỉ là điểm vào”                    |
| §2.3 | Trước Bảng 2.2 (`tab:chapter2-multitenancy-models`) |
| §2.4 | Sau bullet trade-off microservices, trước §2.5      |
| §2.5 | Sau đoạn partition/consumer group                   |
| §2.6 | Sau 3 guardrail bullet                              |
| §2.7 | Ngay sau `\label{sec:chapter2-realtime}`            |
| §2.8 | Sau đoạn phân biệt authentication/authorization     |

## 6. Checklist

1. [x] Tạo 8 file `.excalidraw` trong `assets/diagrams/`.
2. [x] Render 8 file PDF vào `assets/figures/`.
3. [x] Chèn `figure` + `\ref` trong Chương 2.
4. [x] Thêm Bảng 2.3.
5. [x] Cập nhật `thesis-artifact-backlog.md`.
6. [x] Build `tectonic`; kiểm tra `.lof` có Hình 2.1–2.8.

## 7. Phase sau (ngoài scope hiện tại)

- Rút gọn văn bản ~15–25% sau khi hình ổn định.
- Logo strip §2.9 (thủ công).
- Chỉnh sửa chi tiết diagram trong Excalidraw desktop nếu cần typography đẹp hơn.
