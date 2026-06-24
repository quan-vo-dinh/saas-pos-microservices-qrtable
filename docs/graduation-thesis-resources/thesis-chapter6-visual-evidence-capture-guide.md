# Hướng dẫn chụp minh chứng trực quan Chương 6

> Trạng thái: scaffold/placeholder.
> Cập nhật: 2026-06-24.
> Phạm vi: hướng dẫn thay các file ảnh đang được Chương 6 tham chiếu trong `thesis-report/assets/screenshots/` bằng ảnh thật do người viết chụp thủ công.

## 1. Quy tắc chung

Các ảnh hiện tại là placeholder có nhãn `C6-EV-*`. Không dùng chúng như evidence thật khi nộp bản cuối. Khi đã chụp được ảnh thật, thay đúng filename trong:

```text
docs/graduation-thesis-resources/thesis-report/assets/screenshots/
```

Sau mỗi lượt thay ảnh:

1. Kiểm tra ảnh không lộ token, secret, password, client secret, email cá nhân, domain private hoặc QR/session token nhạy cảm.
2. Giữ cùng filename để không phải sửa LaTeX.
3. Build lại LaTeX từ `thesis-report/`.
4. Kiểm tra trang chứa ảnh, caption, danh mục hình và số hiệu.
5. Chỉ cập nhật backlog từ `placeholder` sang `captured` hoặc `verified` sau khi ảnh thật đã render ổn trong PDF.

## 2. Danh sách ảnh đang được Chương 6 tham chiếu

| ID         | Filename                                           | Cần chụp gì                                        | Cách chụp gợi ý                                                                                                 | Lưu ý                                                                                                                    |
| ---------- | -------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| C6-EV-01   | `chapter6-01-allure-overview.png`                  | Allure overview/test summary                       | Chạy hoặc mở `allure-report`; chụp màn Overview thấy tổng số test, pass rate và thời gian chạy.                 | Nếu report chỉ là một E2E representative flow, caption phải nói rõ là report đại diện, không phải full regression suite. |
| C6-EV-02   | `chapter6-02-allure-critical-suites.png`           | Allure suites/categories quan trọng                | Chụp tab Suites/Categories thể hiện nhóm E2E hoặc nhóm test trọng tâm.                                          | Không đưa suite không liên quan chỉ để tăng số lượng ảnh.                                                                |
| C6-EV-04   | `chapter6-04-e2e-playwright-overview.png`          | Allure detail tổng quan của luồng E2E QR--POS--KDS | Chụp phần đầu detail page: tên luồng, trạng thái `Passed`, project/browser, duration và cây bước kiểm thử.      | Đây là representative E2E flow, không claim full acceptance coverage.                                                    |
| C6-EV-05   | `chapter6-05-e2e-customer-tracking.png`            | Lát Allure cho chặng khách đặt món                 | Chụp cùng detail page, đoạn log khách mở QR, vào menu, gửi đơn và ảnh đính kèm customer tracking.               | Che QR/session token nếu URL hiển thị.                                                                                   |
| C6-EV-06   | `chapter6-06-e2e-pos-live-order-accepted.png`      | Lát Allure cho chặng POS nhận đơn                  | Chụp cùng detail page, đoạn log nhân viên đăng nhập POS, nhận đơn và ảnh đính kèm POS live orders.              | Tránh lộ email/tenant nhạy cảm.                                                                                          |
| C6-EV-07   | `chapter6-07-e2e-kds-ticket-finished.png`          | Lát Allure cho chặng KDS/POS phục vụ               | Chụp cùng detail page, đoạn log bếp xử lý phiếu, POS đánh dấu phục vụ và các ảnh đính kèm liên quan.            | Không dùng ảnh từ lần chạy khác.                                                                                         |
| C6-EV-08   | `chapter6-08-e2e-customer-served-after-reload.png` | Lát Allure cho chặng khách thấy `SERVED`           | Chụp cùng detail page, đoạn log khách kết nối lại/tải lại và ảnh đính kèm trạng thái đã phục vụ.                | Ảnh này chứng minh luồng đại diện, không thay thế kiểm thử tải.                                                          |
| C6-EV-09   | `chapter6-09-order-saga-tests.png`                 | Kiểm thử Order Confirm Saga                        | Chụp terminal/Allure của nhóm kiểm thử điều phối xác nhận đơn, tồn kho, phát lại và bù trừ.                     | Caption phải nói đây là unit/contract evidence, không phải full chaos test.                                              |
| C6-EV-10   | `chapter6-10-saas-onboarding-saga-tests.png`       | Kiểm thử SaaS Onboarding Mini-Saga                 | Chụp terminal/Allure của nhóm kiểm thử khởi tạo đơn vị thuê bao, bù trừ và tích hợp có điều kiện nếu chạy được. | Không claim full live Keycloak/User-Access/Payment/Kafka nếu chỉ dùng doubles.                                           |
| C6-SAGA-01 | `chapter6-saga-test-compensation.png`              | Nhật ký kiểm thử bù trừ giao dịch                  | Chụp đoạn kết quả kiểm thử thể hiện nhánh lỗi được bù trừ đúng.                                                 | Không cần hiển thị tên file test trong ảnh nếu có thể crop sạch.                                                         |
| C6-SAGA-02 | `chapter6-saga-test-concurrency.png`               | Nhật ký kiểm thử tương tranh tồn kho               | Chụp đoạn kết quả kiểm thử thể hiện yêu cầu đồng thời không làm sai tồn kho.                                    | Ưu tiên phần kết quả và tên kịch bản nghiệp vụ dễ đọc.                                                                   |
| C6-SAGA-03 | `chapter6-saga-test-lost-response.png`             | Nhật ký kiểm thử mất phản hồi mạng                 | Chụp đoạn kết quả kiểm thử thể hiện hệ thống khôi phục đúng khi phản hồi bị mất.                                | Tránh ghi rộng thành bảo đảm exactly-once.                                                                               |
| C6-SAGA-04 | `chapter6-saga-test-stale-release.png`             | Nhật ký kiểm thử bỏ qua yêu cầu lỗi thời           | Chụp đoạn kết quả kiểm thử thể hiện yêu cầu giải phóng lỗi thời không làm sai trạng thái.                       | Giữ mô tả theo ràng buộc nghiệp vụ.                                                                                      |
| C6-EV-17   | `chapter6-17-kafkio-topic-event.png`               | Kafka topic/event runtime                          | Chụp topic/event gắn với E2E/Saga flow.                                                                         | Không chụp list topic chung nếu không gắn luận điểm.                                                                     |
| C6-EV-18   | `chapter6-18-redisinsight-kds-projection.png`      | Redis KDS/session projection                       | Chụp Redis Insight key KDS/session/cart liên quan flow.                                                         | Che session token/QR token nếu key/value có dữ liệu nhạy cảm.                                                            |
| C6-EV-20   | `chapter6-20-nx-project-graph.png`                 | Nx project graph                                   | Chụp `nx graph` hoặc export project graph showing apps/libs.                                                    | Dùng để chứng minh maintainability/code organization, không phải runtime microservices.                                  |
| C6-EV-22   | `chapter6-22-docker-image-or-compose-build.png`    | Docker image/build/Compose evidence                | Chụp build/compose evidence nếu có.                                                                             | Chỉ gọi là packaging baseline. Không claim full production deploy.                                                       |
| C6-EV-23A  | `chapter6-23a-vercel-customer-pwa.png`             | Vercel deployment của Customer PWA                 | Chụp dashboard/deployment nếu có thật.                                                                          | Chỉ dùng cho partial frontend deployment; không thay thế full-stack deployment evidence.                                 |
| C6-EV-23B  | `chapter6-23b-vercel-management-app.png`           | Vercel deployment của Management App               | Chụp dashboard/deployment nếu có thật.                                                                          | Chỉ dùng cho partial frontend deployment; không thay thế full-stack deployment evidence.                                 |

Các file `chapter6-13-keycloak-role-mapping.png`, `chapter6-14-permission-smoke-terminal.png`, `chapter6-15-ui-blocked-low-role.png` và `chapter6-16-ui-full-access-correct-role.png` hiện không còn được Chương 6 tham chiếu vì mục riêng “Cô lập đơn vị thuê bao, RBAC và quyền theo gói” đã được lược bỏ. Không cần chụp lại các ảnh này trừ khi mục đó được đưa trở lại báo cáo.

## 3. Lệnh gợi ý

Allure/Playwright:

```bash
pnpm e2e:step2.7
pnpm allure:generate
pnpm allure:open
```

Nx project graph:

```bash
pnpm exec nx graph
```

LaTeX build sau khi thay ảnh:

```bash
cd docs/graduation-thesis-resources/thesis-report
latexmk -norc -g -xelatex -interaction=nonstopmode -halt-on-error -synctex=1 undergraduate-theses-report.tex
```

## 4. Không được dùng làm bằng chứng

- Ảnh placeholder hiện tại.
- Ảnh trắng hoặc ảnh tự vẽ giống UI.
- Screenshot công cụ không gắn với luận điểm cụ thể.
- Grafana/Loki/Tempo nếu chưa có dashboard/trace/log thật của QRTable.
- Public deployment/HTTPS/production health nếu chưa deploy full stack.
