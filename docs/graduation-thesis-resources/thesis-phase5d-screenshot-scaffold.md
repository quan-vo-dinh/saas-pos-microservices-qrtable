# Phase 5D - Screenshot/demo scaffold

> Tài liệu điều phối cho Phase 5D. Mục tiêu là dựng khung screenshot/demo artifact để người viết thay ảnh thật thủ công, không phải capture UI tự động.
> Cập nhật: 2026-06-05.
>
> **Plan chi tiết (canonical):** `chapter-05-ui-gallery-scaffold-plan.md` — mapping đầy đủ Chương 5 (SC-C5, Hình 5.6+) + Phụ lục A (SC-A, Hình A.x), capture guidelines, task breakdown. File này giữ bảng mapping ngắn và checklist nhanh.

## 0. Quy ước số hiệu (2026-06-05)

- **Hình 5.1–5.5** = sequence diagram (Phase 5B) — không đổi.
- **Screenshot Chương 5** = **Hình 5.6 trở đi** (SC-C5-01 … SC-C5-14).
- Cột **ID** trong bảng §2 dưới đây là `SC-C5-xx`; cột **Hình LaTeX** là số hiệu in trong khóa luận. Không dùng “Ảnh 5.1” cho screenshot nếu dễ nhầm với Hình 5.1 sequence.

## 1. Nguyên tắc

Phase 5D không dùng Browser, không mở local app và không yêu cầu demo data đang chạy. Agent chỉ dựa vào tài liệu dự án, Chương 5, source code và backlog để xác định screenshot cần có, sau đó tạo placeholder đúng tên file, label và vị trí chèn.

File placeholder trắng không phải demo evidence. Trạng thái đúng trong `thesis-artifact-backlog.md` là `placeholder`. Chỉ chuyển sang `captured` khi người viết thay bằng screenshot thật; chỉ chuyển sang `verified` sau khi build PDF và kiểm tra ảnh thật render đúng.

Với Saga, Phase 5D chỉ dựng bằng chứng nhìn thấy được của happy path. Các nhánh compensation như Catalog release stock hoặc SaaS rollback không nên chứng minh bằng screenshot UI; phần đó phải dựa vào test output, log và snapshot DB/outbox theo `docs/testing/saga-validation-strategy.md`.

Addendum 2026-06-01: technical Phase 4D Dashboard & Reporting được bổ sung sau khi scaffold 12 ảnh ban đầu được lập. Nếu dùng file này cho bản cuối, cần bổ sung screenshot Owner dashboard reporting theo entitlement và Super Admin platform analytics; placeholder không được tính là demo evidence.

## 2. Mapping screenshot Chương 5

| SC-C5     | Hình | Filename                                    | LaTeX label                                         | Flow/evidence                                |
| --------- | ---- | ------------------------------------------- | --------------------------------------------------- | -------------------------------------------- |
| SC-C5-01  | 5.6  | `chapter5-01-customer-qr-session.png`       | `fig:chapter5-screenshot-customer-qr-session`       | Hình 5.1 seq.; QR session                    |
| SC-C5-02  | 5.7  | `chapter5-02-customer-menu-browsing.png`    | `fig:chapter5-screenshot-customer-menu`             | Hình 5.1 seq.; menu                          |
| SC-C5-03  | 5.8  | `chapter5-03-customer-cart-submit.png`      | `fig:chapter5-screenshot-customer-cart-submit`      | Hình 5.1/5.2 seq.                            |
| SC-C5-04a | 5.9  | `chapter5-04-customer-order-tracking.png`   | `fig:chapter5-screenshot-customer-order-tracking`   | Hình 5.8 seq.; `/order-tracking`             |
| SC-C5-04b | 5.9  | `chapter5-04-customer-request-payment.png`  | `fig:chapter5-screenshot-customer-request-payment`  | Hình 5.8 seq.; `/request-payment`            |
| SC-C5-05  | 5.10 | `chapter5-05-staff-pos-table-map.png`       | `fig:chapter5-screenshot-staff-table-map`           | Hình 5.2 seq.; POS                           |
| SC-C5-06  | 5.11 | `chapter5-06-staff-order-confirm.png`       | `fig:chapter5-screenshot-staff-order-confirm`       | Hình 5.2 seq.; Order Confirm Saga            |
| SC-C5-07  | 5.12 | `chapter5-07-kds-queue.png`                 | `fig:chapter5-screenshot-kds-queue`                 | Hình 5.3 seq.; `order.confirmed`             |
| SC-C5-08  | 5.13 | `chapter5-08-kds-ticket-status.png`         | `fig:chapter5-screenshot-kds-ticket-status`         | Hình 5.3 seq.                                |
| SC-C5-09  | 5.14 | `chapter5-09-owner-menu-management.png`     | `fig:chapter5-screenshot-owner-menu-management`     | Catalog                                      |
| SC-C5-10  | 5.15 | `chapter5-10-owner-table-qr-management.png` | `fig:chapter5-screenshot-owner-table-qr`            | Catalog/QR                                   |
| SC-C5-11a | 5.10 | `chapter5-11-owner-payment-settings.png`    | `fig:chapter5-screenshot-owner-payment-settings`    | Hình 5.9 seq.; `/dashboard/payment-settings` |
| SC-C5-11b | 5.10 | `chapter5-11-owner-subscription.png`        | `fig:chapter5-screenshot-owner-subscription`        | Hình 5.9 seq.; `/dashboard/subscription`     |
| SC-C5-12  | 5.17 | `chapter5-12-admin-tenant-onboarding.png`   | `fig:chapter5-screenshot-admin-tenant-onboarding`   | Hình 5.5 seq.; SaaS Mini-Saga                |
| SC-C5-13  | 5.18 | `chapter5-13-owner-dashboard-reporting.png` | `fig:chapter5-screenshot-owner-dashboard-reporting` | Phase 4D entitlement                         |
| SC-C5-14  | 5.19 | `chapter5-14-admin-platform-analytics.png`  | `fig:chapter5-screenshot-admin-platform-analytics`  | Phase 4D; `report.read_any`                  |

Phụ lục A (8 màn, rút gọn 2026-06-05): xem `chapter-05-ui-gallery-scaffold-plan.md` §5.

## 2.1. Trọng tâm Saga khi thay screenshot thật

- Order Confirm Saga: dùng **Hình 5.11** (SC-C5-06) cho staff xác nhận đơn, **Hình 5.12** (SC-C5-07) cho KDS sau `order.confirmed`.
- SaaS Onboarding Mini-Saga: dùng **Hình 5.10** (SC-C5-12 + SC-C5-11a/b) — Super Admin tạo tenant; owner `/dashboard/payment-settings` và `/dashboard/subscription`.
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

## 4.1. Ghi chú tạm trong PDF (chụp ảnh)

Khi build với placeholder, mỗi cụm UI trong Chương 5 / Phụ lục A có khối **Ghi chú tạm** ngay trên hình: tên file trong `assets/screenshots/` và mô tả màn hình QRTable cần chụp (theo ô lưới trái→phải). Sau khi thay ảnh thật, đặt `\screenshotplaceholderfalse` trong `screenshot-scaffold.tex` hoặc main — khối ghi chú không còn in.

## 5. Checklist Phase 5D

**Scaffold (agent) — hoàn tất 2026-06-05:**

- [x] 63 placeholder PNG (`tools/generate-screenshot-placeholders.py`)
- [x] Macro `include/screenshot-scaffold.tex`
- [x] Chương 5: lưới screenshot theo section; Phụ lục A: 8 figure rút gọn (không trùng Ch.5)
- [x] Backlog `placeholder`; XeLaTeX pass (~176 trang)

**Capture thật (người viết):**

1. Đọc `chapter-05-ui-gallery-scaffold-plan.md` §8 và `docs/testing/saga-validation-strategy.md` trước caption Saga.
2. Chụp ảnh, thay file cùng tên trong `assets/screenshots/` (không đổi filename).
3. Trong `undergraduate-theses-report.tex` hoặc `screenshot-scaffold.tex`: `\screenshotplaceholderfalse`.
4. Cập nhật backlog `captured` → build PDF → `verified`.
5. Kiểm tra `.lof` và caption không còn `[Khung bản nháp]`.
6. Phụ lục D: test/log/DB cho compensation — không dùng screenshot.

## 6. Artifact ngoài UI cho Phụ lục D

Các artifact này không bắt buộc tạo trong Phase 5D scaffold, nhưng nên có trước khi nộp nếu muốn chứng minh Saga thuyết phục hơn:

| ID       | Nội dung artifact                              | Vai trò                                                          |
| -------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| D-SAGA-1 | Output `order-confirm-saga.service.spec.ts`    | Chứng minh orchestration, replay và compensation ở service layer |
| D-SAGA-2 | Output `catalog-stock-gateway.service.spec.ts` | Chứng minh contract TCP deduct/release với Catalog               |
| D-SAGA-3 | Output SaaS onboarding DB integration          | Chứng minh success/rollback và `tenant.created` outbox           |
| D-SAGA-4 | Output SaaS live Payment TCP integration       | Chứng minh Payment settings được tạo qua service thật            |
| D-SAGA-5 | Snapshot DB/outbox rút gọn                     | Chứng minh điểm commit nghiệp vụ của hai Saga                    |
