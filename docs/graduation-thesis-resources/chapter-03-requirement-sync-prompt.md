# Prompt cập nhật đồng bộ Chương 3 sau technical Phase 4D

> Dùng file này để mở một session riêng cho tác vụ cập nhật Chương 3. Không trộn với Phase 7B viết Chương 1, Phase 5D screenshot scaffold hoặc backfill Chương 4-6.

## 1. Prompt giao việc

````md
Tôi muốn tiếp tục workflow viết khóa luận QRTable trong repo hiện tại.

Tác vụ duy nhất của session này là cập nhật đồng bộ Chương 3 sau khi canonical technical docs đã bổ sung các phần mới, đặc biệt technical Phase 4D Dashboard & Reporting, Phase 4D.1 dashboard entitlement/UI polish, staff management surface trong code, và các ghi chú Saga/consistency mới.

Trước khi chỉnh sửa, bắt buộc:

1. Dùng CodeGraph trước để hiểu state repo hiện tại:
   - `codegraph status .`
   - `codegraph context "Audit QRTable thesis chapter 3 requirements against current technical docs after Phase 4A 4C 4D Dashboard Reporting Staff Management Saga Hardening"`
   - Nếu cần, query thêm: `DashboardReportController`, `AdminAnalyticsController`, `PlanFeatureGuard`, `StaffManagementService`, `REPORT_READ_OWN`, `REPORT_READ_ANY`.
2. Đọc `AGENTS.md` ở root repo.
3. Đọc `docs/graduation-thesis-resources/thesis-workflow-plan.md`.
4. Đọc các tài liệu khóa luận liên quan:
   - `docs/graduation-thesis-resources/thesis-official-outline.md`
   - `docs/graduation-thesis-resources/thesis-evidence-map.md`
   - `docs/graduation-thesis-resources/chapter-03-requirement-evidence.md`
   - `docs/graduation-thesis-resources/thesis-artifact-backlog.md`
   - `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
5. Đọc canonical technical docs để đối chiếu:
   - `docs/business-logic.md`
   - `docs/technical-architecture.md`
   - `docs/architecture/permission-matrix.md`
   - `docs/phases/phase-4a-saga-hardening.md`
   - `docs/phases/phase-4d-dashboard-reporting.md`
   - `docs/guides/sepay-configuration-guide-phase3.md` nếu phần payment/webhook bị chạm.

Yêu cầu viết:

- Viết tài liệu bằng tiếng Việt học thuật, rõ ràng.
- Giữ thuật ngữ kỹ thuật tiếng Anh khi cần: `SaaS`, `POS`, `microservices`, `BFF`, `RBAC`, `tenant isolation`, `idempotency`, `PlanFeatureGuard`, `report.read_own`, `report.read_any`.
- Không biến Chương 3 thành implementation walkthrough. Chương 3 chỉ phân tích yêu cầu, actor, use case, functional requirements, NFR, state/lifecycle và giới hạn đánh giá.
- Không invent citation, endpoint, table, service, Kafka topic, số liệu benchmark, security claim hoặc evidence.
- Không thêm nguồn mới vào `references.bib` trừ khi thật sự cần và đã kiểm chứng metadata/link/DOI. Dự kiến tác vụ này không cần nguồn mới.

## 2. Phạm vi cập nhật chính

### 2.1. Đổi tên chương và tên mục

Cập nhật title Chương 3 theo hướng đã chốt:

- Từ: `\chapter{Phân tích yêu cầu}`
- Thành: `\chapter{Từ vận hành F\&B đến yêu cầu hệ thống QRTable}`

Đổi các section theo hướng rõ hơn, vẫn giữ đúng vai trò phân tích yêu cầu:

| Cũ                                      | Mới khuyến nghị                                         |
| --------------------------------------- | ------------------------------------------------------- |
| `Tổng quan nghiệp vụ QRTable`           | `Bối cảnh vận hành và phạm vi nghiệp vụ của QRTable`    |
| `Tác nhân và trường hợp sử dụng chính`  | `Bản đồ tác nhân, phạm vi truy cập và use case cốt lõi` |
| `Yêu cầu chức năng theo miền nghiệp vụ` | `Năng lực hệ thống theo các miền vận hành`              |
| `Yêu cầu phi chức năng`                 | `Ràng buộc chất lượng và tiêu chí kiểm chứng`           |
| `Máy trạng thái nghiệp vụ`              | `Các vòng đời trạng thái chi phối nghiệp vụ`            |
| `Phạm vi loại trừ và giới hạn đánh giá` | `Ranh giới phạm vi và giới hạn của các claim đánh giá`  |

### 2.2. Backfill Dashboard/Reporting vào Chương 3

Cập nhật nội dung Chương 3 để phản ánh technical Phase 4D:

- Thêm domain `Báo cáo vận hành và analytics nền tảng` vào phần tổng quan nghiệp vụ.
- Trong actor/use case:
  - Super Admin có platform analytics và tenant drilldown qua `report.read_any`.
  - Owner/Manager có tenant dashboard/reporting qua `report.read_own` và còn bị plan feature entitlement.
  - Waiter/Chef/Barista không có quyền xem báo cáo doanh thu/dashboard reporting mặc định.
- Trong bảng functional requirements, thêm tối thiểu:
  - `FR-USER-01`: quản lý nhân sự theo tenant ở mức Owner/Manager, không phụ thuộc Notification Service/email.
  - `FR-DASH-01`: Owner/Manager tenant dashboard/reporting cho revenue/order/table/menu/payment summary, yêu cầu `report.read_own`, subscription `ACTIVE` và plan feature `analytics_basic`.
  - `FR-DASH-02`: Super Admin platform analytics và tenant drilldown qua `report.read_any`, không bị khóa bởi plan của tenant được chọn.
- Bổ sung prose sau bảng để giải thích reporting là read-only read model theo owner service, không phải standalone Analytics service ở mức yêu cầu.
- Đảm bảo phần scope exclusion không nói chung chung rằng mọi analytics/reporting nằm ngoài scope. Chỉ loại trừ advanced BI/AI, warehouse/OLAP, scheduled export, staff performance analytics, forecasting/anomaly, real-time revenue stream nếu chưa có evidence.

### 2.3. Làm rõ staff management

Chương 3 hiện đã nhắc nhân sự, nhưng cần làm rõ ở mức yêu cầu:

- Owner/Manager quản lý staff tenant theo permission hiện có.
- Owner có quyền thao tác nhạy hơn như disable/delete/update role theo permission matrix.
- Manager không được xóa người dùng.
- Staff management hiện tại không phụ thuộc Notification Service hoặc email delivery.
- Không mở rộng thành HRM/payroll/shift scheduling nếu chưa có evidence.

### 2.4. Giữ Saga/consistency đúng mức

Không đưa Saga chi tiết vào Chương 3. Chỉ giữ ở mức yêu cầu:

- `idempotency`
- nguồn trạng thái đáng tin
- xác nhận đơn mới trừ stock
- webhook/payment lặp phải an toàn
- các flow đại diện sẽ được giải thích ở Chương 4-6

Không claim:

- full production-grade Saga hardening
- durable Saga state
- CDC/Debezium
- exactly-once delivery
- full Payment Complete Saga

## 3. Diagram và artifact cần cập nhật

Nếu nội dung actor/use case thay đổi, cập nhật Hình 3.1:

- Source chính: `docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter3-actor-use-case-overview.puml`
- Render PDF: `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter3-actor-use-case-overview.pdf`
- Có thể cập nhật file Mermaid deprecated `chapter3-actor-use-case-overview.mmd` chỉ để ghi chú/đồng bộ text nếu thấy cần, nhưng PDF hiện render từ PlantUML.

Hình 3.1 nên thêm nhóm use case reporting/dashboard nhưng không làm diagram quá rối:

- `Dashboard/reporting tenant`
- `Platform analytics`
- hoặc một use case tổng quát `Báo cáo vận hành và analytics`

Hình 3.2 business flow QR -> KDS -> payment thường không cần đổi, trừ khi prose/caption đang mâu thuẫn với reporting.

Render PlantUML từ thư mục `docs/graduation-thesis-resources/thesis-report`:

```bash
java -jar tools/plantuml.jar -charset UTF-8 -tpdf -o assets/figures assets/diagrams/chapter3-actor-use-case-overview.puml
```
````

## 4. Tài liệu phải đồng bộ sau khi sửa Chương 3

Cập nhật các tài liệu sau theo đúng trạng thái thật:

1. `docs/graduation-thesis-resources/chapter-03-requirement-evidence.md`
   - Gỡ hoặc điều chỉnh ghi chú “cần backfill Dashboard/Reporting” nếu đã hoàn tất.
   - Đảm bảo actor/use case, FR-DASH, staff management và reviewer questions khớp với LaTeX.
2. `docs/graduation-thesis-resources/thesis-official-outline.md`
   - Cập nhật tên Chương 3 và mục con nếu outline còn dùng tên cũ.
   - Giữ note rằng Dashboard/Reporting Phase 4D đã được phản ánh ở Chương 3 nếu tác vụ hoàn tất.
3. `docs/graduation-thesis-resources/thesis-artifact-backlog.md`
   - Nếu Hình 3.1 được render lại, giữ trạng thái `verified` chỉ sau khi build PDF và kiểm tra render/caption/số hiệu.
   - Nếu chỉ patch text mà không verify hình, không đánh dấu artifact là verified mới.
4. `docs/graduation-thesis-resources/thesis-agent-prompt-bank.md`
   - Nếu cần, cập nhật pointer tới prompt riêng này để tránh nhầm với workflow Phase 4D artifact coverage của Chương 3.
5. `docs/graduation-thesis-resources/thesis-workflow-plan.md`
   - Cập nhật `Current Status`, `Next Concrete Step`, `Open Questions`, `Risks / Do Not Forget`.
   - Ghi rõ technical Phase 4D Dashboard/Reporting đã được backfill vào Chương 3 nếu thực sự đã sửa và build pass.

Không cập nhật Chương 4-6 trong session này, trừ khi chỉ thêm một note trong workflow/backlog rằng các chương đó vẫn cần backfill riêng.

## 5. Verification bắt buộc

Sau khi sửa LaTeX hoặc diagram, build PDF:

```bash
cd docs/graduation-thesis-resources/thesis-report
tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex
```

Nếu `tectonic` không phù hợp trong môi trường hiện tại, dùng workflow XeLaTeX hiện có của repo, ví dụ:

```bash
cd docs/graduation-thesis-resources/thesis-report
latexmk -xelatex -interaction=nonstopmode undergraduate-theses-report.tex
```

Sau build, kiểm tra tối thiểu:

- Không có LaTeX error.
- Hình 3.1 không bị trắng nếu đã render lại.
- Caption, label, số hiệu hình/bảng vẫn đúng.
- Không có citation undefined mới.
- Nếu có thể, dùng `pdftotext` hoặc preview trang liên quan để kiểm tra tiêu đề Chương 3 và nội dung mới xuất hiện.

Nếu chỉ tạo prompt hoặc chỉ sửa Markdown ngoài LaTeX, vẫn cập nhật `thesis-workflow-plan.md` và ghi rõ không chạm LaTeX nên build PDF chỉ là baseline verification nếu được chạy.

## 6. Done criteria

Chỉ báo hoàn tất khi:

- Chương 3 đã đổi tên và section names theo hướng mới.
- Chương 3 có Dashboard/Reporting requirement đúng với Phase 4D:
  - Owner/Manager: `report.read_own` + active subscription + `analytics_basic`.
  - Super Admin: `report.read_any`, platform analytics/tenant drilldown, không bị plan-gated bởi tenant được chọn.
- Chương 3 có staff management requirement nhưng không mở rộng thành HRM/email.
- Scope exclusion không còn mâu thuẫn với Dashboard/Reporting MVP hoặc staff management hiện có.
- Hình 3.1 đã cập nhật nếu actor/use case thay đổi.
- Các tài liệu đồng bộ đã được cập nhật: evidence matrix, outline, artifact backlog, workflow plan và prompt bank nếu cần.
- LaTeX build pass hoặc lý do không thể build được ghi rõ.

Kết thúc session bằng tóm tắt ngắn:

- File đã sửa.
- Điểm đồng bộ chính.
- Kết quả build/verification.
- Các phần còn lại cần làm ở Chương 4-6 hoặc screenshot/demo nếu có.

```

## 2. Ghi chú cho người điều phối

Tác vụ này là một session backfill nhỏ nhưng có nhiều điểm dễ nhầm:

- Không nhầm workflow `Phase 4D` của khóa luận, vốn là artifact coverage Chương 3, với technical `Phase 4D Dashboard & Reporting`.
- Không sửa Chương 3 thành mô tả route/API chi tiết. Route, guard chain và service ownership chi tiết hơn thuộc Chương 4-5.
- Không coi placeholder/screenshot chưa capture là evidence thật.
- Nếu phát hiện tài liệu phase cũ ghi `TODO` nhưng source code/canonical docs mới hơn đã có implementation, ưu tiên code + `technical-architecture.md` + `business-logic.md` + permission matrix, đồng thời ghi rõ tài liệu cũ có khả năng stale.
```
