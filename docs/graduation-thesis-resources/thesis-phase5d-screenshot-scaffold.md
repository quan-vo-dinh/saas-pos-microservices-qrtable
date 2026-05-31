# Phase 5D - Screenshot/demo scaffold

> Tài liệu điều phối cho Phase 5D. Mục tiêu là dựng khung screenshot/demo artifact để người viết thay ảnh thật thủ công, không phải capture UI tự động.
> Cập nhật: 2026-05-31.

## 1. Nguyên tắc

Phase 5D không dùng Browser, không mở local app và không yêu cầu demo data đang chạy. Agent chỉ dựa vào tài liệu dự án, Chương 5, source code và backlog để xác định screenshot cần có, sau đó tạo placeholder đúng tên file, label và vị trí chèn.

File placeholder trắng không phải demo evidence. Trạng thái đúng trong `thesis-artifact-backlog.md` là `placeholder`. Chỉ chuyển sang `captured` khi người viết thay bằng screenshot thật; chỉ chuyển sang `verified` sau khi build PDF và kiểm tra ảnh thật render đúng.

Với Saga, Phase 5D chỉ dựng bằng chứng nhìn thấy được của happy path. Các nhánh compensation như Catalog release stock hoặc SaaS rollback không nên chứng minh bằng screenshot UI; phần đó phải dựa vào test output, log và snapshot DB/outbox theo `docs/testing/phase-5/saga-validation-strategy.md`.

## 2. Mapping screenshot Chương 5

| ID       | Filename                                     | LaTeX label                                       | Caption dự kiến                                                                       | Flow/evidence liên quan                 |
| -------- | -------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| Ảnh 5.1  | `chapter5-01-customer-qr-session.png`        | `fig:chapter5-screenshot-customer-qr-session`     | Màn hình Customer PWA khi khách vào phiên gọi món từ QR.                              | Hình 5.1; QR session                    |
| Ảnh 5.2  | `chapter5-02-customer-menu-browsing.png`     | `fig:chapter5-screenshot-customer-menu`           | Màn hình Customer PWA hiển thị menu điện tử theo tenant và bàn.                       | Hình 5.1; Catalog/menu                  |
| Ảnh 5.3  | `chapter5-03-customer-cart-submit.png`       | `fig:chapter5-screenshot-customer-cart-submit`    | Màn hình giỏ hàng và thao tác gửi order của Customer PWA.                             | Hình 5.1/5.2; shared cart/order submit  |
| Ảnh 5.4  | `chapter5-04-customer-order-payment.png`     | `fig:chapter5-screenshot-customer-payment`        | Màn hình theo dõi order và yêu cầu thanh toán/VietQR của khách.                       | Hình 5.4; payment settlement            |
| Ảnh 5.5  | `chapter5-05-staff-pos-table-map.png`        | `fig:chapter5-screenshot-staff-table-map`         | Màn hình Staff POS hiển thị sơ đồ bàn hoặc danh sách order đang hoạt động.            | Hình 5.2; staff POS                     |
| Ảnh 5.6  | `chapter5-06-staff-order-confirm.png`        | `fig:chapter5-screenshot-staff-order-confirm`     | Màn hình chi tiết order và thao tác xác nhận order của staff.                         | Hình 5.2; Order Confirm Saga happy path |
| Ảnh 5.7  | `chapter5-07-kds-queue.png`                  | `fig:chapter5-screenshot-kds-queue`               | Màn hình KDS queue sau khi order được xác nhận và phát sinh `order.confirmed`.        | Hình 5.3; KDS queue/outbox              |
| Ảnh 5.8  | `chapter5-08-kds-ticket-status.png`          | `fig:chapter5-screenshot-kds-ticket-status`       | Màn hình chi tiết ticket hoặc thao tác cập nhật trạng thái trong KDS.                 | Hình 5.3; KDS lifecycle                 |
| Ảnh 5.9  | `chapter5-09-owner-menu-management.png`      | `fig:chapter5-screenshot-owner-menu-management`   | Màn hình Owner dashboard quản lý menu/category/menu item.                             | Catalog implementation                  |
| Ảnh 5.10 | `chapter5-10-owner-table-qr-management.png`  | `fig:chapter5-screenshot-owner-table-qr`          | Màn hình Owner dashboard quản lý bàn và QR theo tenant.                               | Catalog/table/QR                        |
| Ảnh 5.11 | `chapter5-11-owner-payment-subscription.png` | `fig:chapter5-screenshot-owner-payment-settings`  | Màn hình Owner dashboard sau onboarding, thể hiện payment settings hoặc subscription. | Hình 5.4/5.5; Payment/SaaS              |
| Ảnh 5.12 | `chapter5-12-admin-tenant-onboarding.png`    | `fig:chapter5-screenshot-admin-tenant-onboarding` | Màn hình Super Admin onboarding hoặc quản lý lifecycle tenant.                        | Hình 5.5; SaaS Onboarding Mini-Saga     |

## 2.1. Trọng tâm Saga khi thay screenshot thật

- Order Confirm Saga: dùng Ảnh 5.6 để minh họa staff xác nhận đơn, và Ảnh 5.7 để minh họa hệ quả bất đồng bộ sang KDS sau `order.confirmed`.
- SaaS Onboarding Mini-Saga: dùng Ảnh 5.12 để minh họa Super Admin khởi tạo tenant, và Ảnh 5.11 để minh họa kết quả payment settings/subscription ở phía owner.
- Không cố chụp màn hình cho compensation. Compensation cần đi kèm output test, log lỗi có kiểm soát hoặc snapshot DB/outbox ở Phụ lục D.

## 3. Vị trí file

Tất cả placeholder và screenshot thật của Phase 5D nằm trong:

```text
docs/graduation-thesis-resources/thesis-report/assets/screenshots/
```

Không đổi filename khi thay ảnh thật. Nếu cần đổi định dạng từ `.png` sang `.jpg` hoặc `.pdf`, phải cập nhật cả mapping, LaTeX include và backlog trong cùng phiên.

## 4. Cách chèn LaTeX

Mỗi screenshot nên dùng một `figure` có caption/source/label. Khi ảnh còn là placeholder trắng, caption hoặc đoạn dẫn cần thể hiện đây là bản nháp để tránh hiểu nhầm là evidence thật.

Ví dụ khung:

```tex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=\textwidth,height=0.72\textheight,keepaspectratio]{chapter5-01-customer-qr-session.png}
  \caption[Placeholder màn hình Customer PWA vào phiên QR]{Placeholder màn hình Customer PWA khi khách vào phiên gọi món từ QR. Ảnh này là khung bản nháp và cần được thay bằng screenshot demo thật trước khi nộp.}
  \label{fig:chapter5-screenshot-customer-qr-session}
\end{figure}
```

Sau khi thay bằng screenshot thật, bỏ chữ `Placeholder` khỏi caption và đổi nguồn thành: `Nguồn: ảnh chụp màn hình hệ thống QRTable trong môi trường demo.`

## 5. Checklist Phase 5D

1. Đọc `docs/testing/phase-5/saga-validation-strategy.md` trước khi đặt caption cho các ảnh liên quan đến Order Confirm Saga hoặc SaaS Onboarding Mini-Saga.
2. Tạo đủ 12 file placeholder trắng theo mapping §2.
3. Chèn refs vào Chương 5 hoặc Phụ lục A theo đúng label.
4. Cập nhật `thesis-artifact-backlog.md` sang `placeholder`, không dùng `captured`.
5. Build LaTeX bằng `tectonic --keep-logs --keep-intermediates undergraduate-theses-report.tex`.
6. Kiểm tra `.lof` và PDF text để đảm bảo label/caption/path không gãy.
7. Nếu đồng thời chuẩn bị Phụ lục D, chỉ lưu test output/log/DB snapshot thật; không tạo artifact giả để thay thế evidence.

## 6. Artifact ngoài UI cho Phụ lục D

Các artifact này không bắt buộc tạo trong Phase 5D scaffold, nhưng nên có trước khi nộp nếu muốn chứng minh Saga thuyết phục hơn:

| ID       | Nội dung artifact                              | Vai trò                                                          |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| D-SAGA-1 | Output `order-confirm-saga.service.spec.ts`    | Chứng minh orchestration, replay và compensation ở service layer |
| D-SAGA-2 | Output `catalog-stock-gateway.service.spec.ts` | Chứng minh contract TCP deduct/release với Catalog               |
| D-SAGA-3 | Output SaaS onboarding DB integration          | Chứng minh success/rollback và `tenant.created` outbox           |
| D-SAGA-4 | Output SaaS live Payment TCP integration       | Chứng minh Payment settings được tạo qua service thật            |
| D-SAGA-5 | Snapshot DB/outbox rút gọn                     | Chứng minh điểm commit nghiệp vụ của hai Saga                    |
