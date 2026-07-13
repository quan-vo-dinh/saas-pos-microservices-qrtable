# Plan C - Sơ đồ database per-service bằng dbdiagram.io

> Ngày lập: 2026-06-04.
> Phạm vi độc lập: bổ sung sơ đồ database/schema chi tiết theo từng service bằng DBML và ảnh render từ dbdiagram.io.
> Quan hệ với Plan A/B: Plan A đã hoàn tất phần bảng ownership và refactor Chương 4-5; Plan B đang/đã được triển khai riêng cho Chương 6-7. Plan C là phần bổ sung sau Plan A/B, không thay thế Plan A và không chạm Chương 6-7 trừ khi cần cập nhật một câu đánh giá về database evidence.

## 0. Protocol bắt buộc khi thực thi plan

Lưu ý chung:

- Viết tài liệu bằng tiếng Việt. Chỉ giữ tiếng Anh khi là tên công nghệ, tên thành phần, vai trò mã nguồn hoặc thuật ngữ chuyên ngành khó dịch chính xác.
- Có thể dùng web/browser để kiểm chứng nguồn học thuật, nguồn chính thức, DOI/link và metadata khi có phát sinh citation hoặc thông tin có khả năng thay đổi.
- Dùng Context7/`ctx7` khi cần tra tài liệu hiện tại của library, framework, SDK, API, CLI tool hoặc cloud service theo `AGENTS.md`.
- Không invent citation, không thêm nguồn giả vào `references.bib`.
- Chỉ thêm nguồn thật, đủ chắc và có khả năng dùng thật trong nội dung khóa luận.
- Cuối session phải build LaTeX và cập nhật `docs/graduation-thesis-resources/thesis-workflow-plan.md`.

Use relevant installed skills khi cần:

- `Zoom Out`: dùng trước khi vẽ để giữ đúng mức actor/domain/service boundary, không sa vào mọi cột kỹ thuật.
- `Grill with Docs`: dùng để audit mâu thuẫn giữa code, Chương 4, bảng ownership và sơ đồ DBML.
- `Writing Plans`: dùng nếu cần tách tiếp Plan C thành nhiều task nhỏ cho từng service.
- `Doc Coauthoring`: chỉ dùng khi cần refine caption/cách đặt hình hoặc reader testing; không draft chương dài một mạch.

## 1. Mục tiêu

Plan A đã bổ sung bảng tổng hợp database ownership. Tuy nhiên, để phần database đủ trực quan và thuyết phục hơn, Plan C bổ sung các sơ đồ schema cụ thể theo từng service.

Mục tiêu:

- Có DBML source riêng cho từng database/service.
- Có ảnh render/export từ dbdiagram.io để chèn vào khóa luận.
- Mỗi sơ đồ chỉ mô tả schema của service đó, không tạo một ERD toàn hệ thống gây rối và dễ hiểu sai là có cross-service join.
- Chương 4 có thêm minh họa trực quan cho database-per-service và data ownership.
- DBML/ảnh là artifact được sinh từ code audit hiện tại, không phải source of truth.

## 2. Nguồn sự thật và guardrail

Nguồn sự thật bắt buộc:

- `TypeOrmModule.forFeature(...)`.
- `MongooseModule.forFeature(...)`.
- TypeORM entity trong `libs/entities/src/lib/`.
- Entity riêng của Payment trong `apps/payment/src/app/modules/payment/entities/`.
- Mongoose schema trong `libs/schemas/src/lib/`.
- Repository/module registration thật.
- Runtime introspection PostgreSQL/MongoDB nếu cần, nhưng phải đối chiếu lại với code.

Không dùng làm nguồn sự thật:

- Các DBML/ERD legacy đã retire hoặc chưa regenerate từ code.

Nguyên tắc khi vẽ:

- Không tạo quan hệ trực tiếp giữa table của hai service khác nhau.
- Nếu một service tham chiếu dữ liệu service khác qua ID/contract/event, thể hiện bằng note, không vẽ foreign key cross-service.
- Không đưa mọi cột kỹ thuật nếu làm hình quá rối. Ưu tiên primary key, foreign key nội bộ, `tenant_id`, trạng thái chính, timestamp và trường nghiệp vụ chính.
- Các trường audit/outbox có thể rút gọn bằng note nếu ảnh quá dày.
- Với MongoDB User-Access, dùng DBML ở mức collection/document schema gần đúng để minh họa, ghi rõ đây là mô hình tài liệu, không phải relational table.

## 3. Kiểm chứng dbdiagram.io

Thông tin đã kiểm chứng từ nguồn chính thức:

- dbdiagram.io dùng DBML để định nghĩa và vẽ database diagram/ERD.
- Tài liệu dbdiagram.io cho biết toolbar có thể export diagram ra PDF/PNG.
- Trang sản phẩm/pricing hiện cũng nêu khả năng export diagram ra SVG, PDF hoặc PNG.

Nguồn tham khảo:

- https://docs.dbdiagram.io/
- https://docs.dbdiagram.io/basic-editing-experience/
- https://dbml.dbdiagram.io/docs
- https://dbdiagram.io/pricing

Không đưa các link này vào `references.bib` trừ khi Chương 4 thật sự trích dẫn dbdiagram.io như công cụ tạo hình. Nếu chỉ dùng như công cụ render artifact nội bộ, không cần citation học thuật.

## 4. Artifact đề xuất

Tạo source DBML:

- `docs/graduation-thesis-resources/thesis-report/assets/diagrams/dbml/chapter4-catalog-schema.dbml`
- `docs/graduation-thesis-resources/thesis-report/assets/diagrams/dbml/chapter4-order-schema.dbml`
- `docs/graduation-thesis-resources/thesis-report/assets/diagrams/dbml/chapter4-payment-schema.dbml`
- `docs/graduation-thesis-resources/thesis-report/assets/diagrams/dbml/chapter4-saas-schema.dbml`
- `docs/graduation-thesis-resources/thesis-report/assets/diagrams/dbml/chapter4-user-access-schema.dbml`

Lưu **SVG export từ dbdiagram.io** (canonical cho khóa luận — script không được ghi đè mặc định):

- `thesis-report/assets/figures/chapter4-db-catalog-schema.svg`
- `thesis-report/assets/figures/chapter4-db-order-schema.svg`
- `thesis-report/assets/figures/chapter4-db-payment-schema.svg`
- `thesis-report/assets/figures/chapter4-db-saas-schema.svg`
- `thesis-report/assets/figures/chapter4-db-user-access-schema.svg`

Chính sách cố định: `thesis-report/assets/figures/CHAPTER4-DB-SCHEMA-SVG.md`. Script `render-chapter4-dbml.sh` mặc định chỉ sync `.pdf`/`.png` preview từ các SVG web; `dbml-renderer` CLI chỉ khi `ALLOW_DBML_SVG_OVERWRITE=1` và `--from-dbml`.

Không cần sơ đồ dbdiagram riêng cho:

- Kitchen: KDS dùng Redis runtime projection/queue, không có durable relational database chính trong phạm vi audit hiện tại.
- BFF/Authorizer: không sở hữu database nghiệp vụ chính trong Chương 4.

Có thể thêm một hình nhỏ hoặc note cho Kitchen/BFF/Authorizer trong phần ownership table, không dùng dbdiagram.io.

## 5. Phạm vi sơ đồ theo service

### 5.1. Catalog schema

Bảng dự kiến:

- `areas`
- `tables`
- `categories`
- `menu_items`

Nội dung cần thể hiện:

- `tenant_id` ở các bảng tenant-scoped.
- Quan hệ nội bộ area -> table.
- Quan hệ category -> menu item.
- Trường trạng thái/khả dụng/tồn kho chính nếu có trong entity.

Không vẽ quan hệ trực tiếp từ Order sang Catalog. Nếu cần, note rằng Order gọi Catalog qua service contract để kiểm tra/trừ tồn kho.

### 5.2. Order schema

Bảng dự kiến:

- `sessions`
- `orders`
- `order_items`
- `bills`
- `service_requests`
- `outbox_events`

Nội dung cần thể hiện:

- `tenant_id`.
- Session -> Order.
- Order -> OrderItem.
- Order/Bill relationship nếu entity thể hiện rõ.
- Service request gắn với session/table/order nếu entity thể hiện.
- Outbox là event persistence của Order service.

Redis cart/session runtime chỉ ghi bằng note, không vẽ như table relational.

### 5.3. Payment schema

Bảng dự kiến:

- `payments`
- `audit_payments`
- `tenant_payment_settings`
- `outbox_events`

Nội dung cần thể hiện:

- `tenant_id`.
- Payment record và status.
- Tenant payment settings cho SePay/VietQR.
- Audit payment dùng để lưu dấu vết xử lý.
- Outbox thanh toán dùng cho event bất đồng bộ.

Không vẽ foreign key trực tiếp sang `bills` của Order service. Nếu cần, thể hiện `bill_id`/reference bằng note "external reference to Order bill".

### 5.4. SaaS schema

Bảng dự kiến:

- `tenants`
- `pricing_plans`
- `subscriptions`
- `subscription_invoices`
- `outbox_events`

Nội dung cần thể hiện:

- Tenant lifecycle.
- Plan/subscription/invoice relationship.
- Outbox SaaS cho tenant lifecycle/subscription event.
- Entitlement/reporting gắn với plan/subscription ở mức note.

### 5.5. User-Access schema

Collection dự kiến:

- `user`
- `role`

Nội dung cần thể hiện:

- Đây là MongoDB document model, không phải relational schema.
- User profile/staff data.
- Role/permission nghiệp vụ.
- Quan hệ với Keycloak chỉ ghi bằng note, không vẽ như table trong MongoDB.

Nếu DBML không phù hợp để diễn đạt document embedded fields, dùng table-like DBML để minh họa collection và note rõ giới hạn.

## 6. Cách chèn vào Chương 4

**Ưu tiên (khuyến nghị chính):** toàn bộ sơ đồ database/schema phải đứng cùng mục `Thiết kế cơ sở dữ liệu theo ranh giới dịch vụ` trong Chương 4 — ngay sau bảng ownership — vì đây là bằng chứng trực tiếp cho lập luận service boundary, không phải “diagram mở rộng” tách khỏi chương thiết kế.

- Giữ bảng ownership tổng hợp trong Chương 4.
- Sau bảng, thêm 1 đoạn: "Các sơ đồ sau minh họa schema tiêu biểu của từng service; chúng được sinh từ entity/schema hiện tại trong codebase và không thể hiện foreign key xuyên service."
- Chèn 5 hình theo từng service (Catalog, Order, Payment, SaaS, User-Access) nếu bố cục PDF chấp nhận được.

**Chỉ khi Chương 4 quá dài (page budget / figure placement không chấp nhận được):**

- Chèn 1-2 hình đại diện trong Chương 4 (ví dụ Order và Payment).
- Đưa bộ đầy đủ vào Phụ lục E (`Diagram mở rộng`) theo `thesis-official-outline.md`, với câu dẫn rõ trong Chương 4.
- Tránh lặp cùng một hình ở cả Chương 4 và Phụ lục E trừ khi giảng viên yêu cầu “hình đại diện + phụ lục đầy đủ”; nếu lặp, ưu tiên chỉ giữ bản đầy đủ trong chương chính hoặc chỉ tham chiếu phụ lục mà không nhúng lại hai hình trùng nội dung.

Tên caption gợi ý:

- `Sơ đồ dữ liệu Catalog service`
- `Sơ đồ dữ liệu Order service`
- `Sơ đồ dữ liệu Payment service`
- `Sơ đồ dữ liệu SaaS service`
- `Sơ đồ dữ liệu User-Access service`

Caption nên ghi rõ:

- `Nguồn: tổng hợp từ entity/schema trong codebase QRTable, render bằng dbdiagram.io.`

Nếu toàn bộ tài liệu đang tránh dòng "Nguồn:" trong caption, viết trong prose trước/sau hình thay vì thêm trực tiếp vào caption.

## 7. Checkpoints thực thi

### Checkpoint C1 - Audit schema từ code

Việc cần làm:

- Dùng CodeGraph và `rg` để xác định entity/schema/module registration.
- Đối chiếu table/collection thật với Chương 4 hiện tại.
- Ghi lại danh sách table/collection cuối cùng cho từng service.
- Quyết định có đưa `Product` vào hay loại khỏi phạm vi core thesis.

Verification:

- Mọi table/collection có trace về code.
- Không dùng ERD/DBML cũ làm nguồn.

### Checkpoint C2 - Viết DBML per-service

Việc cần làm:

- Tạo thư mục DBML nếu chưa có.
- Viết 5 file DBML tương ứng Catalog, Order, Payment, SaaS, User-Access.
- Chỉ tạo relationship nội bộ trong cùng service.
- Dùng note cho external reference/cross-service contract.

Verification:

- DBML import được vào dbdiagram.io.
- Không có cross-service foreign key.
- Không lộ secret hoặc dữ liệu nhạy cảm.

### Checkpoint C3 - Render/export từ dbdiagram.io

Việc cần làm:

- Import từng file DBML vào dbdiagram.io (layout trên web, không dùng `dbml-renderer` CLI cho hình khóa luận).
- Sắp xếp layout để vừa trang.
- Export **SVG** và ghi đè đúng tên trong `thesis-report/assets/figures/chapter4-db-*-schema.svg`.
- Chạy `bash thesis-report/tools/render-chapter4-dbml.sh` để cập nhật preview PDF/PNG (không ghi đè SVG).

Verification:

- Ảnh không mờ, không bị cắt.
- Tên bảng/trường đọc được khi chèn vào PDF.
- Không dùng link public chứa thông tin nhạy cảm nếu không cần.

### Checkpoint C4 - Chèn vào LaTeX

Việc cần làm:

- Cập nhật `04-thiet-ke-va-kien-truc-he-thong.tex`.
- Chèn hình vào mục thiết kế dữ liệu hoặc phụ lục tùy page budget.
- Thêm prose giải thích giới hạn: schema theo service, không cross-service join, DBML sinh từ code.
- Cập nhật danh mục hình nếu có caption mới.

Verification:

- Hình nằm đúng section, không trôi sai mục.
- Chương 4 không bị quá tải hình.
- Không tạo overclaim rằng DBML là source of truth.

### Checkpoint C5 - Build và reader audit

Việc cần làm:

- Build LaTeX.
- Kiểm tra PDF quanh Chương 4.
- Kiểm tra `.lof` nếu thêm hình.
- Cập nhật `thesis-workflow-plan.md`.

Verification:

- Build pass.
- Hình readable.
- Bố cục không vỡ trang nghiêm trọng.
- Workflow plan ghi rõ Plan C đã chạy hoặc còn pending.

## 8. Done criteria

Plan C hoàn tất khi:

- Có DBML source riêng cho từng schema service chính.
- Có ảnh render/export từ dbdiagram.io lưu trong `assets/figures/`.
- Chương 4 hoặc phụ lục đã chèn hình phù hợp.
- Mỗi hình chỉ thể hiện database của service tương ứng, không vẽ quan hệ DB xuyên service.
- Hình có giải thích rằng DBML được tổng hợp từ codebase hiện tại.
- Không dùng ERD/DBML cũ làm nguồn sự thật.
- LaTeX build pass.
- `thesis-workflow-plan.md` được cập nhật.
