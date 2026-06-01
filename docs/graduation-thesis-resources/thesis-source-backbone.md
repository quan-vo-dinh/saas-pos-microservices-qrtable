# Source backbone cho Chương 1 và Chương 2

> Phase 2B - Source Backbone & Initial References.
> Cập nhật: 2026-05-29. Addendum note: 2026-06-01.
> Phạm vi: chỉ chuẩn bị nguồn và ma trận citation cho Chương 1-2; chưa viết nội dung dài vào LaTeX.

## 1. Mục tiêu và phạm vi âm

Tài liệu này là xương sống nguồn ngoài cho hai chương nền của khóa luận QRTable:

- Chương 1: bối cảnh F&B, POS, QR ordering, thanh toán QR/VietQR, lý do chọn đề tài và phạm vi nghiên cứu.
- Chương 2: cơ sở lý thuyết về SaaS, multi-tenancy, microservices, event-driven architecture, consistency/idempotency, WebSocket/realtime và security.

Addendum 2026-06-01: technical Phase 4D Dashboard & Reporting là nguồn nội bộ cho Chương 3-6, không làm thay đổi source backbone học thuật cho Chương 1-2. Nếu Chương 1/2 nhắc reporting/analytics ở mức bối cảnh thị trường, chỉ dùng nguồn sản phẩm/thị trường đã kiểm chứng; chi tiết QRTable dashboard/reporting phải lấy từ `docs/phases/phase-4d-dashboard-reporting.md` và các canonical technical docs khi backfill report.

Không làm trong Phase 2B:

- Không viết Chương 1 hoặc Chương 2 dài trong `thesis-report/chapters/`.
- Không thêm citation giả hoặc nguồn chỉ để làm đầy bibliography.
- Không dùng blog phổ thông làm nguồn chính nếu có chuẩn, RFC, sách, paper hoặc documentation chính thức tốt hơn.
- Không dùng survey nội bộ như nguồn citation cuối cùng khi survey chỉ tổng hợp từ nguồn khác.

## 2. Read-the-room và source policy

Observed trong workflow hiện tại:

- LaTeX citation pipeline dùng `biblatex`, `style=ieee`, `backend=bibtex`, nguồn duy nhất là `thesis-report/references.bib`.
- Tài liệu tiếng Việt phải có `language = {vietnamese}` và `keywords = {vietnamese,...}` để render vào nhóm tài liệu tiếng Việt.
- `thesis-evidence-map.md` yêu cầu không overclaim: các claim về performance, scalability, observability, production readiness chỉ được viết khi có bằng chứng thật.
- Research survey hiện có hữu ích để tìm hướng và candidate link, nhưng nhiều đoạn dùng blog/Medium/Reddit/Scribd/Slideshare hoặc diễn đạt quá mạnh; vì vậy chỉ dùng như secondary notes.

Chính sách chọn nguồn cho Chương 1-2:

| Mức ưu tiên      | Loại nguồn                                                                                  | Cách dùng                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| P0               | Chuẩn/RFC/NIST/ISO/OWASP/OpenID/Apache docs, sách/paper uy tín                              | Là nguồn định nghĩa và nền tảng học thuật chính.                              |
| P1               | Tài liệu chính thức của nhà cung cấp/cloud/product, báo cáo thị trường có đơn vị công bố rõ | Dùng cho bối cảnh thực tiễn, related systems, ví dụ thị trường.               |
| P2               | Bài báo/tin tức đáng tin cậy trích lại báo cáo gốc                                          | Chỉ dùng để bổ trợ khi cần bối cảnh Việt Nam, không làm nguồn kỹ thuật chính. |
| Không dùng chính | Blog phổ thông, Medium, Reddit, Scribd, slide không có provenance rõ                        | Có thể giữ ở backlog candidate, không đưa vào `.bib` ban đầu.                 |

Ghi chú Context7: đã kiểm tra Context7 cho `/apache/kafka`; kết quả trùng với documentation chính thức của Apache Kafka về event streaming, topic, producer, consumer, consumer group và partition. Nguồn citation cuối cùng vẫn dùng URL chính thức `https://kafka.apache.org/documentation/`.

## 3. Source matrix cho Chương 1

| Citation key                  | Loại nguồn                                                     | Ngôn ngữ   | Độ tin cậy            | Mục dùng      | Claim hỗ trợ                                                                                                                                        | Link/DOI                                                                                                                              | Trạng thái        |
| ----------------------------- | -------------------------------------------------------------- | ---------- | --------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `ipos-nestle-fnb-report-2025` | Báo cáo/thông cáo thị trường từ iPOS.vn và Nestlé Professional | Tiếng Việt | Trung bình-cao        | 1.1, 1.2      | Bối cảnh thị trường F&B Việt Nam, xu hướng vận hành và nhu cầu chuyển đổi số. Chỉ dùng số liệu khi đối chiếu được với báo cáo gốc.                  | https://ipos.vn/thong-cao-bao-chi-ipos-vn-va-nestle-professional-cong-bo-bao-cao-thi-truong-kinh-doanh-am-thuc-tai-viet-nam-nam-2025/ | Đã đưa vào `.bib` |
| `baochinhphu-fnb-growth-2025` | Bài báo chính thống trích bối cảnh ngành                       | Tiếng Việt | Trung bình-cao        | 1.1           | Dùng bổ trợ cho claim ngành F&B tiếp tục tăng trưởng và nhu cầu tối ưu vận hành năm 2025; không dùng thay cho báo cáo gốc khi cần số liệu chi tiết. | https://baochinhphu.vn/nganh-fb-tai-viet-nam-se-tiep-tuc-tang-truong-96-trong-nam-2025-102250319131429058.htm                         | Đã đưa vào `.bib` |
| `napas-fastfund-vietqr`       | Tài liệu dịch vụ chính thức                                    | Tiếng Anh  | Cao cho mô tả dịch vụ | 1.1, 1.2, 2.8 | VietQR là hạ tầng QR/chuyển tiền nhanh phổ biến trong bối cảnh thanh toán nội địa; chỉ dùng để mô tả capability, không tự suy luận adoption rate.   | https://en.napas.com.vn/napas-fastfund-247-with-vietqr-code-service                                                                   | Đã đưa vào `.bib` |
| `kiotviet-qr-order-doc`       | Hướng dẫn sản phẩm chính thức                                  | Tiếng Việt | Trung bình-cao        | 1.2, 2.9      | Các nền tảng POS Việt Nam đã có flow gọi món qua QR; dùng như related system/product evidence, không dùng làm chuẩn học thuật.                      | https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/fnb-thuc-don-dien-tu/goi-mon-qua-ma-qr/                                            | Đã đưa vào `.bib` |
| `sapo-fnb-restaurant-pos`     | Trang sản phẩm chính thức                                      | Tiếng Việt | Trung bình            | 1.2, 2.9      | SaaS/POS trong F&B thường kết hợp quản lý nhà hàng, order, thanh toán và báo cáo; chỉ dùng như ví dụ thị trường.                                    | https://www.sapo.vn/phan-mem-quan-ly-nha-hang.html                                                                                    | Đã đưa vào `.bib` |
| `ipos-o2o-qr-order`           | Bài/trang sản phẩm chính thức                                  | Tiếng Việt | Trung bình            | 1.2, 2.9      | QR ordering/O2O là một hướng sản phẩm thực tế trong POS F&B Việt Nam; dùng để đối chiếu related systems.                                            | https://ipos.vn/toi-uu-chi-phi-van-hanh-order-nhanh-chong-voi-giai-phap-o2o/                                                          | Đã đưa vào `.bib` |

Gợi ý khi viết Chương 1:

- Có thể dùng số liệu thị trường để nói “nhu cầu tối ưu vận hành tăng”, nhưng không được kết luận rằng toàn ngành bắt buộc phải dùng microservices.
- Các nguồn sản phẩm như KiotViet/Sapo/iPOS chỉ chứng minh thị trường có QR ordering/POS SaaS; không chứng minh QRTable vượt trội hơn các hệ thống đó.
- Claim “QRTable phù hợp bối cảnh Việt Nam” phải nối với phạm vi đề tài, không biến thành tuyên bố thương mại.

## 4. Source matrix cho Chương 2

| Citation key                              | Loại nguồn                                 | Ngôn ngữ   | Độ tin cậy              | Mục dùng                   | Claim hỗ trợ                                                                                                                                            | Link/DOI                                                                                       | Trạng thái        |
| ----------------------------------------- | ------------------------------------------ | ---------- | ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------- |
| `nist-sp800145-2011`                      | NIST Special Publication                   | Tiếng Anh  | Cao                     | 2.3                        | Định nghĩa cloud computing/SaaS và các đặc tính như on-demand self-service, broad network access, resource pooling, rapid elasticity, measured service. | https://doi.org/10.6028/NIST.SP.800-145                                                        | Đã đưa vào `.bib` |
| `microsoft-multitenant-storage-data-2026` | Cloud architecture guidance                | Tiếng Anh  | Cao                     | 2.3                        | Các hướng tiếp cận lưu trữ/data isolation trong multitenant solutions; dùng để so sánh shared, isolated và hybrid data models.                          | https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data | Đã đưa vào `.bib` |
| `iso-iec-25010-2023`                      | Chuẩn ISO/IEC                              | Tiếng Anh  | Cao                     | 2.8, Chương 6 sau này      | Quality model cho software/system, làm nền cho maintainability, reliability, security, performance efficiency ở mức khái niệm.                          | https://www.iso.org/standard/78176.html                                                        | Đã đưa vào `.bib` |
| `iso-iec-18004-2024`                      | Chuẩn ISO/IEC                              | Tiếng Anh  | Cao                     | 2.2                        | QR Code là symbology chuẩn hóa; dùng khi giải thích QR code ở mức kỹ thuật nền, không dùng để claim security của QRTable.                               | https://www.iso.org/standard/83389.html                                                        | Đã đưa vào `.bib` |
| `lewis-fowler-microservices-2014`         | Bài nền tảng của Martin Fowler/James Lewis | Tiếng Anh  | Cao                     | 2.4                        | Định nghĩa microservices và các đặc trưng như independently deployable services, decentralized data management và automation.                           | https://martinfowler.com/articles/microservices.html                                           | Đã đưa vào `.bib` |
| `newman-building-microservices-2021`      | Sách kỹ thuật uy tín                       | Tiếng Anh  | Cao                     | 2.4                        | Service boundary, coupling, database ownership, trade-off khi chia nhỏ hệ thống.                                                                        | https://www.oreilly.com/library/view/building-microservices-2nd/9781492034018/                 | Đã đưa vào `.bib` |
| `richardson-microservices-patterns-2018`  | Sách kỹ thuật uy tín                       | Tiếng Anh  | Cao                     | 2.4, 2.6                   | Microservices patterns, database-per-service, saga, transactional messaging/outbox ở mức khái niệm.                                                     | https://www.manning.com/books/microservices-patterns                                           | Đã đưa vào `.bib` |
| `garcia-molina-sagas-1987`                | Paper ACM SIGMOD                           | Tiếng Anh  | Cao                     | 2.6                        | Nền tảng khái niệm saga cho long-lived transactions và compensating transactions.                                                                       | https://doi.org/10.1145/38713.38742                                                            | Đã đưa vào `.bib` |
| `apache-kafka-docs-2026`                  | Documentation chính thức                   | Tiếng Anh  | Cao                     | 2.5                        | Kafka là distributed event streaming platform; khái niệm event/record, topic, producer, consumer, partition, consumer group.                            | https://kafka.apache.org/documentation/                                                        | Đã đưa vào `.bib` |
| `fette-websocket-rfc6455-2011`            | RFC                                        | Tiếng Anh  | Cao                     | 2.7                        | WebSocket protocol cho full-duplex communication trên một TCP connection; dùng làm nền cho realtime notification.                                       | https://doi.org/10.17487/RFC6455                                                               | Đã đưa vào `.bib` |
| `jones-jwt-rfc7519-2015`                  | RFC                                        | Tiếng Anh  | Cao                     | 2.8                        | JWT là format token dùng để truyền claims; dùng khi giải thích authentication token ở mức nền.                                                          | https://doi.org/10.17487/RFC7519                                                               | Đã đưa vào `.bib` |
| `openid-connect-core-2023`                | Specification chính thức                   | Tiếng Anh  | Cao                     | 2.8                        | OIDC là identity layer trên OAuth 2.0; dùng khi giải thích Keycloak/JWT/OIDC ở mức conceptual.                                                          | https://openid.net/specs/openid-connect-core-1_0.html                                          | Đã đưa vào `.bib` |
| `owasp-asvs-2026`                         | Security verification standard             | Tiếng Anh  | Cao                     | 2.8                        | Authentication, access control, validation và security verification categories; dùng làm nền security, không claim QRTable đạt ASVS nếu chưa đánh giá.  | https://owasp.org/www-project-application-security-verification-standard/                      | Đã đưa vào `.bib` |
| `beyer-sre-book-2016`                     | Sách online chính thức của Google/O'Reilly | Tiếng Anh  | Cao                     | 2.4, 2.7, Chương 6 sau này | Reliability/monitoring/SLO concepts ở mức tham chiếu; dùng rất cẩn trọng vì QRTable chưa claim production SRE.                                          | https://sre.google/sre-book/table-of-contents/                                                 | Đã đưa vào `.bib` |
| `napas-fastfund-vietqr`                   | Tài liệu dịch vụ chính thức                | Tiếng Anh  | Cao cho payment context | 2.8, 2.9                   | Bối cảnh thanh toán QR/VietQR nội địa khi bàn đến QRTable payment; không thay cho tài liệu SePay/implementation ở Chương 4-5.                           | https://en.napas.com.vn/napas-fastfund-247-with-vietqr-code-service                            | Đã đưa vào `.bib` |
| `kiotviet-qr-order-doc`                   | Hướng dẫn sản phẩm chính thức              | Tiếng Việt | Trung bình-cao          | 2.9                        | Related system: POS Việt Nam có QR ordering workflow.                                                                                                   | https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/fnb-thuc-don-dien-tu/goi-mon-qua-ma-qr/     | Đã đưa vào `.bib` |
| `sapo-fnb-restaurant-pos`                 | Trang sản phẩm chính thức                  | Tiếng Việt | Trung bình              | 2.9                        | Related system: POS/FnB SaaS có nhiều module vận hành nhà hàng.                                                                                         | https://www.sapo.vn/phan-mem-quan-ly-nha-hang.html                                             | Đã đưa vào `.bib` |
| `ipos-o2o-qr-order`                       | Bài/trang sản phẩm chính thức              | Tiếng Việt | Trung bình              | 2.9                        | Related system: iPOS có giải pháp O2O/QR ordering trong F&B.                                                                                            | https://ipos.vn/toi-uu-chi-phi-van-hanh-order-nhanh-chong-voi-giai-phap-o2o/                   | Đã đưa vào `.bib` |

Candidate tốt nhưng chưa đưa vào `.bib` ban đầu:

| Proposed key         | Nguồn                                | Lý do chưa thêm                                                                                                                           |
| -------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `aws-saas-lens-*`    | AWS Well-Architected SaaS Lens       | Hữu ích cho SaaS/multi-tenancy, nhưng nguồn Microsoft + NIST đã đủ cho Phase 2B; thêm khi Chương 2 cần so sánh sâu hơn.                   |
| `fielding-rest-2000` | Luận án REST của Roy Fielding        | Có thể dùng nếu Chương 2/4 cần lý thuyết REST/API; Phase 2B chưa cần vì trọng tâm Chương 2 là SaaS/microservices/event/realtime/security. |
| `emvco-qr-spec-*`    | EMVCo QR Code payment specifications | Hữu ích nếu viết sâu payment QR; Phase 2B tạm dùng NAPAS/VietQR và ISO QR, còn payment implementation sẽ audit ở Chương 4-5.              |
| `nist-sp80063-*`     | NIST Digital Identity Guidelines     | Có thể bổ sung nếu phần auth/security cần sâu hơn OIDC/JWT/ASVS.                                                                          |

## 5. Research survey audit

Các file trong `research-survey/` đã được đọc để lấy hướng tìm nguồn:

- `Khảo sát Chuyển đổi số F&B Việt Nam.md`
- `Nghiên cứu SaaS Multi-tenancy Việt Nam.md`
- `Phân tích POS Việt Nam, tìm lỗ hổng.md`
- `Tổng quan nghiên cứu kiến trúc Microservices.md`

Giữ lại như internal notes:

- Gợi ý chủ đề Chương 1: áp lực chi phí F&B, chuyển đổi số, POS SaaS, QR ordering, thanh toán QR/VietQR.
- Gợi ý chủ đề Chương 2: SaaS multi-tenancy, service boundary, Kafka/event-driven, WebSocket, security/RBAC.
- Gợi ý nguồn sản phẩm Việt Nam: iPOS, KiotViet, Sapo, NAPAS/VietQR.

Không đưa nguyên văn vào khóa luận:

- Các câu khẳng định tuyệt đối như “microservices là định hướng duy nhất”, “khả năng mở rộng vô hạn”, “Kafka hấp thụ toàn bộ cú sốc” hoặc “gRPC nhanh hơn REST 10-100 lần” nếu không có nguồn đo lường phù hợp.
- Các claim mô tả competitor bị lỗi/lag/sập nếu chỉ dựa trên blog hỗ trợ, diễn đàn, Reddit, Medium hoặc nội dung không có provenance rõ.
- Các số liệu thị trường từ nguồn repost khi chưa đối chiếu với báo cáo gốc.

## 6. Reviewer-style questions cần giữ khi viết Chương 1-2

| Câu hỏi phản biện                                                          | Câu trả lời khuyến nghị                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vì sao dùng microservices, trong khi khóa luận không benchmark quy mô lớn? | Trình bày microservices như quyết định kiến trúc để tách domain, ownership và maintainability; không claim hiệu năng vượt trội nếu chưa đo.                                                             |
| QR ordering có phải novelty học thuật không?                               | Không claim novelty ở QR code đơn lẻ. Đóng góp nằm ở việc tích hợp QR ordering với SaaS POS, KDS, payment, tenant isolation và kiến trúc microservices trong một hệ thống phần mềm hoàn chỉnh.          |
| Kafka có thay thế transaction/database consistency không?                  | Không. Kafka hỗ trợ event streaming và async side effects; consistency nghiệp vụ của QRTable phải giải thích bằng service ownership, transaction boundary, idempotency và evidence nội bộ ở Chương 4-6. |
| WebSocket có phải source of truth không?                                   | Không. WebSocket chỉ là realtime notification/hint; REST/service state/database vẫn là nguồn trạng thái chính.                                                                                          |
| Có thể nói hệ thống đạt ASVS/SRE/production-grade không?                   | Không, trừ khi có đánh giá thật. ASVS/SRE chỉ là nền lý thuyết và checklist tham chiếu cho security/reliability.                                                                                        |
| Các nguồn product của KiotViet/Sapo/iPOS có đủ học thuật không?            | Chỉ đủ làm related systems và bối cảnh thị trường; định nghĩa học thuật phải dùng NIST/ISO/RFC/sách/paper/official docs.                                                                                |

## 7. Mapping sang artifact và chapter draft sau này

| Chương/mục                                           | Nguồn chính                                                                                                       | Artifact liên quan                                              |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1.1 Bối cảnh chuyển đổi số F&B                       | `ipos-nestle-fnb-report-2025`, `baochinhphu-fnb-growth-2025`, `napas-fastfund-vietqr`                             | Bảng 1.1, Hình 1.1                                              |
| 1.2 Lý do chọn đề tài                                | Nguồn Chương 1 + survey nội bộ đã kiểm chứng lại                                                                  | Bảng 1.1                                                        |
| 2.2 QR code ordering                                 | `iso-iec-18004-2024`, `kiotviet-qr-order-doc`, `ipos-o2o-qr-order`                                                | Bảng 2.1                                                        |
| 2.3 SaaS và multi-tenancy                            | `nist-sp800145-2011`, `microsoft-multitenant-storage-data-2026`                                                   | Bảng 2.2, Hình 2.1                                              |
| 2.4 Microservices                                    | `lewis-fowler-microservices-2014`, `newman-building-microservices-2021`, `richardson-microservices-patterns-2018` | Bảng 2.3                                                        |
| 2.5 Event-driven architecture và Kafka               | `apache-kafka-docs-2026`, `richardson-microservices-patterns-2018`                                                | Bảng 2.4, Hình 2.2 nếu cần                                      |
| 2.6 Consistency/idempotency/distributed transactions | `garcia-molina-sagas-1987`, `richardson-microservices-patterns-2018`                                              | Bảng 2.4                                                        |
| 2.7 Realtime communication                           | `fette-websocket-rfc6455-2011`                                                                                    | Hình 2.2 hoặc giải thích nền                                    |
| 2.8 Auth/security                                    | `jones-jwt-rfc7519-2015`, `openid-connect-core-2023`, `owasp-asvs-2026`                                           | Bảng security/NFR nếu cần                                       |
| 2.9 Related systems                                  | `kiotviet-qr-order-doc`, `sapo-fnb-restaurant-pos`, `ipos-o2o-qr-order`                                           | Bảng related systems, không so sánh hơn/thua khi thiếu evidence |

## 8. Trạng thái Phase 2B

- `references.bib` đã có nhóm nguồn thật đầu tiên cho Chương 1-2.
- Các nguồn yếu trong survey đã được tách khỏi bibliography ban đầu.
- Chưa thêm `\cite{...}` vào Chương 1/2 vì phase này chưa viết nội dung dài.
- Đã build main LaTeX bằng Tectonic và build tạm ngoài repo với `\nocite{*}` để kiểm tra BibTeX parse được toàn bộ `references.bib`.
