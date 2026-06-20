# QRTable Thesis Defense Slide Builder Script

> Bản này dùng để tự xây dựng slide bảo vệ khóa luận từ đầu: chuyển nội dung vào slide, vẽ lại luồng hoặc sơ đồ khi cần và luyện kịch bản thuyết trình cho từng slide. Nội dung theo hướng tự tin có kiểm soát: nhấn mạnh kết quả đã đạt được, gắn kết luận với bằng chứng và liên kết trực tiếp với báo cáo, tài liệu kiến trúc, kiểm thử cùng mã nguồn hiện tại.
>
> Không xem bản trình chiếu cũ là mốc tham chiếu. Nếu dựng lại PPTX, hãy dùng file này làm nguồn nội dung chính.

## 0. Cách dùng nhanh

Mỗi slide bên dưới có 6 phần:

- **Dán lên slide:** nội dung nên xuất hiện trực tiếp trên slide.
- **Bố cục / hình ảnh:** vẽ nội dung gì, đặt hình nào, cắt phần nào và nhấn mạnh điểm nào.
- **Logic cần hiểu:** phần giải thích bổ trợ, để không chỉ đọc chữ.
- **Kịch bản thuyết trình chi tiết:** lời nói đề xuất. Có thể học theo ý, không cần đọc nguyên văn.
- **Nguồn / bằng chứng:** tài liệu, hình trong report, code hoặc test liên quan.
- **Không nói quá:** giới hạn diễn đạt nội bộ để tránh kết luận vượt quá bằng chứng; không cần đưa nguyên văn lên slide chính.

Ngôn ngữ nên dùng trên slide: tiếng Việt học thuật, nhưng giữ tên tiếng Anh của pattern, primitive hoặc kỹ thuật đã quen thuộc trong ngành khi bản dịch tiếng Việt gượng hoặc dễ mất nghĩa. Dùng song ngữ ở lần xuất hiện đầu, chẳng hạn "tính nhất quán cuối cùng (eventual consistency)", "tính lũy đẳng (idempotency)", "bản chiếu KDS (runtime projection)"; sau đó dùng nhất quán thuật ngữ ngắn hơn như `idempotency`, `deduplication`, `transactional outbox`, `row-level locking`, `Saga orchestration`, `compensation`, `API snapshot` và `client refetch`.

### Chuẩn kịch bản thuyết trình

Vì file này dùng để luyện thuyết trình, kịch bản của mỗi slide phải đủ chi tiết và tương đối đồng đều. Mỗi kịch bản nên có 3-4 đoạn, khoảng 220-330 từ, và phải trả lời tối thiểu bốn ý:

1. Nội dung đang trả lời câu hỏi nào của hội đồng.
2. Logic hoặc cơ chế kỹ thuật cần giải thích là gì.
3. QRTable hiện thực cơ chế đó ở đâu, bằng service/code/test/doc/diagram nào.
4. Câu kết hoặc câu chuyển tiếp là gì.

Không viết kịch bản theo kiểu gạch đầu dòng rời rạc hoặc chỉ nhắc lại nội dung trên slide. Với slide lý thuyết, phải giải thích vì sao lý thuyết đó cần cho QRTable. Với slide hiện thực, phải chỉ ra ranh giới dịch vụ, trạng thái, sự kiện hoặc bất biến được bảo vệ. Với slide bằng chứng, phải nói rõ mức kết luận được phép và giới hạn của kết luận.

### Nguyên tắc giọng điệu: tự tin có kiểm soát

Slide chính nên ưu tiên cấu trúc: **kết quả đạt được -> cơ chế -> bằng chứng -> hướng mở rộng**. Tránh đặt phần phủ định hoặc giới hạn ở vị trí quá nổi bật, vì dễ tạo cảm giác phòng thủ. Các giới hạn vẫn phải có, nhưng nên trình bày như ranh giới đánh giá hoặc hướng phát triển tiếp theo.

### Chuẩn đặt tiêu đề cho slide

Title nên là một luận điểm học thuật ngắn, có chủ ngữ rõ và dùng thuật ngữ nhất quán. Tránh dùng title kiểu khẩu ngữ, phủ định trực diện hoặc quá cụt như "không phải CRUD", "bấm UI", "biết fail ở đâu". Nếu cần dùng thuật ngữ tiếng Anh, ưu tiên đặt sau cụm tiếng Việt hoặc trong ngoặc ở lần xuất hiện đầu, ví dụ: "tính lũy đẳng (idempotency)" và "bản chiếu KDS (runtime projection)".

Ví dụ:

- Nên viết: "QRTable dùng idempotency và deduplication để xử lý retry/duplicate trong luồng cốt lõi."
- Tránh đưa lên slide chính: "QRTable không đảm bảo exactly-once messaging."
- Nên viết: "Đánh giá tập trung vào luồng cốt lõi và các cơ chế kiến trúc trọng yếu."
- Tránh đưa lên slide chính: "Hệ thống chưa sẵn sàng vận hành thực tế."
- Nên viết: "Load/performance measurement là hướng kiểm chứng tiếp theo."
- Tránh đưa lên slide chính: "Chưa có load benchmark p95/p99."

## 1. Nguyên tắc trình bày kết luận an toàn

### Nên nói

- "Trong phạm vi luồng cốt lõi, cơ chế này đã có bằng chứng từ code/test/tài liệu."
- "WebSocket chỉ phát tín hiệu thay đổi (hint); client refetch API snapshot, là nguồn trạng thái chuẩn (source of truth)."
- "Kafka được dùng có chọn lọc cho domain event sau commit, không thay thế toàn bộ command và query."
- "Cô lập tenant có cơ sở thiết kế và kiểm thử một phần; chưa đủ bằng chứng để kết luận toàn bộ bề mặt API trên hệ thống tích hợp đầy đủ."
- "Order Confirm Saga là Saga đại diện được phân tích sâu trong bài bảo vệ."

### Không nên nói

- "Hệ thống đã sẵn sàng vận hành thực tế", "đã bảo đảm tính sẵn sàng cao", "đã kiểm thử tải", "đã kiểm thử áp lực".
- "Exactly-once messaging được đảm bảo."
- "WebSocket là nguồn trạng thái đúng."
- "Redis là database chung của các service."
- "Microservices luôn tốt hơn monolith."
- "KDS có database bền vững riêng trong phạm vi hiện tại."
- "Saga đã được kiểm chứng đầy đủ bằng tiêm lỗi trực tiếp trên toàn hệ thống."
- "SaaS onboarding là nội dung phân tích sâu của bản trình chiếu." Theo phạm vi hiện tại, SaaS onboarding không xuất hiện trong phần chính hoặc phụ lục.

### Ngữ cảnh góp ý GVHD/GVPB cần phản ánh

Góp ý chuẩn bị phản biện cho thấy cần chủ động xử lý một rủi ro: giảng viên phản biện có thể nhìn đề tài theo góc thương mại điện tử hoặc mô hình kinh doanh. Vì vậy, slide và script phải định vị QRTable thật sớm:

- QRTable **không phải** đề tài nghiên cứu mô hình kinh doanh, doanh thu hay chiến lược thị trường.
- QRTable là **tình huống nghiên cứu kỹ thuật (technical case study)**: nghiệp vụ F&B và đặt món qua QR đủ thực tế, đồng thời đủ phức tạp để kiểm chứng SaaS đa tenant, cập nhật gần thời gian thực, tính nhất quán và kiến trúc vi dịch vụ.
- Khi bị hỏi "vì sao chọn tình huống nghiên cứu này?", câu trả lời nên quay về các đặc điểm kỹ thuật: nhiều tác nhân, giỏ món dùng chung, KDS gần thời gian thực, webhook thanh toán, cô lập tenant, tính lũy đẳng và quyền sở hữu dữ liệu theo dịch vụ.
- Khi bị hỏi về tính khả thi kinh doanh, trả lời ở mức bối cảnh nhu cầu rồi quay về phạm vi khóa luận: "Em dùng bài toán này làm tình huống nghiên cứu kỹ thuật, không đánh giá mô hình lợi nhuận hay cạnh tranh thị trường."
- Khi nhận góp ý, giữ giọng tiếp thu: nếu góp ý đúng thì nhận và chỉnh; nếu góc nhìn khác với thiết kế kỹ thuật, vẫn ghi nhận rồi giải thích bằng invariant/bằng chứng, tránh tranh luận trực diện.

Phần **TÓM TẮT KHÓA LUẬN** trong report đã đi đúng hướng này: báo cáo nói rõ các sản phẩm thương mại chỉ cho thấy nhu cầu thực tế, còn khóa luận không nhằm phát minh lại POS/QR hoặc đánh giá mô hình kinh doanh; thay vào đó dùng SaaS POS + QR ordering như một tình huống nghiên cứu kỹ thuật có thể kiểm chứng.

## 2. Danh mục hình ảnh trong báo cáo cần biết trước khi dựng slide

### Visual nên bổ sung theo góp ý chuẩn bị phản biện

Hai visual này không nhất thiết đã có sẵn trong report asset, nhưng rất nên dựng cho slide hoặc report vì giúp người phản biện thấy bối cảnh thực tế trước khi đi vào kỹ thuật:

| Visual                       | Nội dung nên vẽ                                                                                                                                                            | Vị trí sử dụng                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tổng quan SaaS đa tenant     | Nền tảng QRTable ở giữa; nhiều nhà hàng hoặc chi nhánh kết nối vào cùng hệ thống, mỗi tenant có dữ liệu và cấu hình riêng.                                                 | Slide 1, 6, 10 hoặc 19. Dùng để nói "SaaS phục vụ nhiều đơn vị thuê bao", không phải mô hình kinh doanh. |
| Một nhà hàng áp dụng QRTable | Bàn có QR, khách dùng điện thoại, POS của nhân viên, màn hình KDS ở bếp/bar, thanh toán bằng VietQR hoặc tiền mặt; mũi tên QR -> giỏ món -> đơn hàng -> KDS -> thanh toán. | Slide 3 hoặc 4. Dùng để làm bài toán sinh động và dẫn người nghe vào nghiệp vụ.                          |

Nếu tự vẽ lại, giữ phong cách diagram sạch, không biến thành ảnh marketing. Hai visual này là **context visual**, không phải bằng chứng kiểm thử.

### Chương 2: sơ đồ lý thuyết và nền tảng

| Asset                                                                 | Nội dung                                                                  | Vị trí sử dụng                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| `thesis-report/assets/figures/chapter2-fnb-pos-lifecycle.png`         | Vòng đời vận hành POS F&B từ bàn, order, bếp đến thanh toán.              | Slide 3 nếu muốn mở bài bằng bối cảnh vận hành.    |
| `thesis-report/assets/figures/chapter2-qr-ordering-flow.png`          | Luồng QR ordering mức khái niệm, nhấn mạnh session và chống trùng lặp.    | Slide 4 hoặc slide demo, nhưng nên vẽ lại gọn hơn. |
| `thesis-report/assets/figures/chapter2-saas-multitenancy.png`         | Khái niệm SaaS đa tenant và ranh giới cô lập.                             | Slide 10 hoặc 19 nếu cần giải thích tenant.        |
| `thesis-report/assets/figures/chapter2-monolith-vs-microservices.png` | So sánh monolith và microservices theo bounded context.                   | Slide 11.                                          |
| `thesis-report/assets/figures/chapter2-kafka-event-flow.png`          | Topic, partition, consumer group ở mức lý thuyết.                         | Slide 15 nếu cần minh họa giao tiếp bất đồng bộ.   |
| `thesis-report/assets/figures/chapter2-outbox-saga-overview.png`      | Outbox và Saga ở mức khái niệm.                                           | Slide 19 hoặc 21.                                  |
| `thesis-report/assets/figures/chapter2-websocket-hint-refetch.png`    | WebSocket chỉ phát hint, client refetch API snapshot.                     | Slide 16 hoặc 25.                                  |
| `thesis-report/assets/figures/chapter2-oidc-rbac-saas-pos.png`        | Tách xác thực staff/admin bằng OIDC/JWT/RBAC và customer bằng QR session. | Slide 17.                                          |

### Chương 3: yêu cầu, tác nhân và luồng nghiệp vụ

| Asset                                                               | Nội dung                                                       | Vị trí sử dụng                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `thesis-report/assets/figures/chapter3-actor-use-case-overview.pdf` | Actor/use-case overview, tách Customer session khỏi RBAC user. | Slide 8.                                                               |
| `thesis-report/assets/figures/chapter3-business-flow.pdf`           | Luồng nghiệp vụ từ QR đến KDS, thanh toán và dọn bàn.          | Slide 4 hoặc 27. Dùng để hiểu luồng; khi đưa lên slide nên vẽ lại gọn. |

### Chương 4: các sơ đồ kiến trúc chính

| Asset                                         | Nội dung                                                                                                      | Vị trí sử dụng                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `chapter4-technology-integration-map.pdf/png` | Bản đồ công nghệ chính và vai trò từng công nghệ.                                                             | Slide 10 hoặc phụ lục dự phòng.                                                                                    |
| `chapter4-overall-architecture.pdf/png/svg`   | Kiến trúc tổng thể: phía người dùng, BFF, dịch vụ miền, hệ thống ngoài và hạ tầng dữ liệu/bộ nhớ đệm/sự kiện. | Slide 13. Có thể dùng trực tiếp nhưng nên cắt hoặc vẽ lại vì hình rộng.                                            |
| `chapter4-c4-container.pdf/png`               | C4 container view.                                                                                            | Appendix hoặc slide 13 nếu muốn góc nhìn container.                                                                |
| `chapter4-nx-module-boundary.pdf/png`         | Ranh giới module trong Nx monorepo.                                                                           | Appendix, không cần main trừ khi hội đồng hỏi code organization.                                                   |
| `chapter4-multi-tenancy-isolation.pdf/png`    | Tenant context qua API, service, DB, Redis, Kafka, WebSocket.                                                 | Slide 18. Nên dùng hoặc vẽ lại rõ hơn.                                                                             |
| `chapter4-communication-topology.pdf/png`     | Bản đồ giao tiếp: HTTP, WebSocket, TCP/gRPC, Kafka, Redis, webhook.                                           | Slide 16.                                                                                                          |
| `chapter4-kafka-decision-flow.pdf/png/svg`    | Luồng quyết định chọn TCP/gRPC, Kafka, WebSocket/direct BFF, webhook adapter.                                 | Slide 15.                                                                                                          |
| `chapter4-redis-ownership.pdf/png`            | Redis ownership theo nhóm khóa.                                                                               | Slide 19/24 hoặc appendix.                                                                                         |
| `chapter4-kds-redis-data-structures.pdf/png`  | KDS Redis structures: Hash, Set, Sorted Set, dedupe, Pub/Sub, Socket.IO rooms.                                | Slide 24. Rất phù hợp để giải thích KDS.                                                                           |
| `chapter4-security-auth-flow.pdf/png`         | Hai luồng auth: staff/admin qua Keycloak, customer qua QR/session.                                            | Slide 17.                                                                                                          |
| `chapter4-sepay-payment-architecture.pdf/png` | Hai dòng tiền SePay/VietQR: hóa đơn QRTBL và thuê bao QRSUB.                                                  | Slide 26 hoặc phụ lục thanh toán. Phần chính chỉ dùng hóa đơn QRTBL, không phân tích sâu thanh toán thuê bao SaaS. |
| `chapter4-db-*.png/svg/pdf`                   | Schema theo từng service: Catalog, Order, Payment, SaaS, User-Access.                                         | Appendix, hoặc slide 14 nếu cần chứng minh data ownership.                                                         |

### Chương 5: các sơ đồ tuần tự khi triển khai

| Asset                                      | Nội dung                                                                                                      | Vị trí sử dụng                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `chapter5-qr-ordering-session.pdf`         | Sequence chi tiết: QR session, active session, Redis hot path, cartVersion, submit order.                     | Slide 4 hoặc demo appendix. Main slide nên vẽ lại 6 bước.                 |
| `chapter5-order-confirm-stock.pdf`         | Sequence triển khai chi tiết: Order/Catalog DB, persistent reservation, outbox, Kafka, retry và compensation. | Dùng trong khóa luận hoặc appendix; không đặt nguyên hình lên main slide. |
| `chapter5-order-confirm-stock-slide22.pdf` | Sequence giảng giải 5 lane: Order orchestration, `APPLIED/REPLAYED`, version và outbox/KDS.                   | Visual chính cho Slide 22.                                                |
| `chapter5-kds-ticket-lifecycle.pdf`        | KDS lifecycle từ `order.confirmed` tới Redis, Pub/Sub, WebSocket hint/refetch.                                | Slide 24.                                                                 |
| `chapter5-payment-settlement.pdf`          | Cash và VietQR/SePay settlement, Payment-Order boundary, outbox `payment.completed`.                          | Slide 26 hoặc appendix payment.                                           |
| `chapter5-saas-onboarding-saga.pdf`        | SaaS onboarding mini-saga.                                                                                    | Không dùng trong main/appendix của deck này theo scope hiện tại.          |

### Ảnh chụp trong báo cáo

| Asset group                          | Nội dung                                                                   | Cách dùng                                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `chapter5-01` đến `chapter5-04`      | Customer PWA: phiên QR, thực đơn, gửi giỏ món, theo dõi đơn và thanh toán. | Dùng cho luồng demo hoặc slide 26 nếu cần minh họa giao diện. Không dùng làm bằng chứng mạnh nếu chưa chụp lại. |
| `chapter5-05` đến `chapter5-06`      | POS: sơ đồ bàn và xác nhận đơn.                                            | Dùng cho slide 22 hoặc luồng đối chiếu tích hợp.                                                                |
| `chapter5-07` đến `chapter5-08`      | KDS queue/status.                                                          | Dùng slide 24 hoặc luồng đối chiếu tích hợp.                                                                    |
| `appendix-d-01-order-saga-tests.png` | Kết quả kiểm thử Order Confirm Saga.                                       | Dùng appendix hoặc slide 23 nếu cần minh họa.                                                                   |

Lưu ý: screenshot trong report có giá trị minh họa. Nếu muốn dùng làm demo evidence thật, nên capture lại đúng stack trước ngày bảo vệ.

## 3. Mạch nội dung 28 slide

Mạch kể chuyện:

1. Bài toán vận hành F&B.
2. QRTable không chỉ là QR menu, mà là core POS flow có nhiều mốc xác nhận nghiệp vụ.
3. Kiến trúc microservices được chọn vì service/data ownership.
4. Việc tách service tạo ra các vấn đề phân tán: giao tiếp liên dịch vụ, xác thực/phân quyền, ngữ cảnh tenant, tính nhất quán, giao dịch phân tán và cập nhật gần thời gian thực.
5. Các vấn đề đó được giải lần lượt từ mô hình giao tiếp, kiểm soát truy cập, lan truyền tenant, bảo vệ thao tác lặp, xử lý giao dịch phân tán đến cập nhật gần thời gian thực.
6. Bằng chứng được trình bày theo mức kiểm chứng, từ luồng cốt lõi đã có bằng chứng đến các hướng mở rộng cần đánh giá thêm.

### Nhãn phần cố định theo slide 2

Mỗi slide nên có nhãn nhỏ ở góc trên phải để người nghe biết đang ở phần nào của lộ trình. Với style slide hiện tại, góc trái đã dành cho logo và tên trường, vì vậy marker nên đặt ở **góc trên phải**, cùng hàng với header trường hoặc ngay dưới header nếu slide nhiều chữ.

Quy ước visual:

- Font 11-14 pt, uppercase vừa phải, không làm nổi hơn title.
- Dạng text nhỏ hoặc pill mảnh; không dùng card lớn.
- Dùng đúng 5 nhãn của lộ trình trình bày để tạo liên kết thị giác xuyên suốt deck.
- Bìa và nội dung trình bày dùng marker `00`; các phần nội dung chính dùng marker `01` đến `05`.

| Marker                                                  | Tên phần                                                             | Áp dụng     |
| ------------------------------------------------------- | -------------------------------------------------------------------- | ----------- |
| `00 · BÌA / NỘI DUNG TRÌNH BÀY`                         | Phần mở đầu kỹ thuật của deck                                        | Slide 1-2   |
| `01 · BỐI CẢNH F&B & QR-TO-PAYMENT`                     | Bối cảnh vận hành và luồng nghiệp vụ                                 | Slide 3-5   |
| `02 · MỤC TIÊU, PHẠM VI, TÁC NHÂN & TRƯỜNG HỢP SỬ DỤNG` | Mục tiêu, phạm vi, tác nhân và đóng góp                              | Slide 6-9   |
| `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`           | Động lực kiến trúc, microservices, ranh giới và quyền sở hữu dữ liệu | Slide 10-14 |
| `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`                 | Giao tiếp, xác thực, phân quyền, tenant, tính nhất quán, Saga và KDS | Slide 15-24 |
| `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`            | Phương pháp đánh giá, đối chiếu luồng tích hợp, kết quả và kết luận  | Slide 25-28 |

---

## Slide 1. QRTable: nền tảng SaaS POS tích hợp đặt món qua QR theo kiến trúc vi dịch vụ

### Dán lên slide

**Nhãn phần (góc trên phải):** `00 · BÌA`

**Tiêu đề:** QRTable: nền tảng SaaS POS tích hợp đặt món qua QR theo kiến trúc vi dịch vụ

**Subtitle:** Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS cho ngành F&B

**Metadata:**

- Sinh viên: Võ Đình Minh Quân - 22521193
- GVHD: TS. Nguyễn Thanh Bình
- Khoa Hệ thống Thông tin - Trường Đại học Công nghệ Thông tin
- Năm: 2026

**Định vị một câu:** QRTable xem QR như điểm vào của một chuỗi POS hoàn chỉnh: phiên tại bàn, giỏ món, xác nhận đơn, KDS và thanh toán.

**Định vị phù hợp phản biện:** QRTable là trường hợp nghiên cứu kỹ thuật về POS SaaS ngành F&B: nhiều đơn vị thuê bao, đặt món qua QR, KDS, thanh toán và kiến trúc vi dịch vụ.

### Bố cục / hình ảnh

- Dùng cover sạch, nền tối học thuật.
- Có thể đặt visual nhỏ bên phải: `Multi-tenant SaaS cloud -> Restaurant QR/POS/KDS/Payment`.
- Nếu có thời gian, dùng visual "nhiều nhà hàng kết nối về QRTable cloud" để mở đầu theo góp ý GVHD.
- Không dùng nhiều chữ. Trang bìa chỉ cần tên đề tài, người thực hiện, GVHD và one-line positioning.

### Logic cần hiểu

Nội dung mở đầu chỉ định vị đề tài: QR là điểm vào của một nền tảng SaaS POS, còn giá trị kỹ thuật nằm ở cách hệ thống phối hợp nhiều miền nghiệp vụ trong kiến trúc vi dịch vụ. Trình tự nghiệp vụ cụ thể dành cho Slide 4.

### Kịch bản thuyết trình chi tiết

"Em xin kính chào thầy cô và hội đồng. Em xin trình bày khóa luận với đề tài QRTable, một nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR cho ngành F&B, được thiết kế theo kiến trúc vi dịch vụ.

QR trong đề tài này được xem là điểm vào của một quy trình POS, không phải mục tiêu kỹ thuật đứng riêng. Trọng tâm của khóa luận là cách tổ chức các miền nghiệp vụ, ranh giới dữ liệu và mốc chuyển trạng thái để khách hàng, nhân viên, bếp và thanh toán có thể tham gia cùng một quy trình phục vụ.

Em sử dụng bài toán đặt món qua QR trong F&B như một trường hợp nghiên cứu kỹ thuật vì bối cảnh này có nhiều tác nhân, nhiều vòng đời trạng thái, yêu cầu cập nhật gần thời gian thực, webhook thanh toán và yêu cầu cô lập dữ liệu giữa các đơn vị thuê bao. Khóa luận không đánh giá mô hình lợi nhuận hay chiến lược cạnh tranh của sản phẩm; phần cần chứng minh là thiết kế hệ thống và các cơ chế bảo vệ luồng nghiệp vụ.

Bài trình bày sẽ đi từ bối cảnh vận hành đến bài toán hệ thống, kiến trúc, các cơ chế xử lý và cuối cùng là kết quả kiểm chứng. Trước hết, em xin trình bày lộ trình gồm năm phần chính."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex`
- `docs/graduation-thesis-resources/thesis-report/frontmatter/abstract.tex`
- `docs/graduation-thesis-resources/thesis-report/frontmatter/cover.tex`

### Không nói quá

- Không nói hệ thống đã sẵn sàng vận hành thực tế.
- Không để hội đồng hiểu đây là đề tài tối ưu mô hình kinh doanh hoặc chứng minh lợi nhuận sản phẩm.

---

## Slide 2. Lộ trình trình bày: từ bối cảnh vận hành đến kiểm chứng kỹ thuật

### Dán lên slide

**Nhãn phần (góc trên phải):** `00 · NỘI DUNG TRÌNH BÀY`

**Tiêu đề:** Lộ trình trình bày: từ vận hành F&B đến kiểm chứng kỹ thuật

**Lộ trình 5 phần:**

1. Bối cảnh F&B và luồng QR-to-Payment
2. Mục tiêu, phạm vi, tác nhân và trường hợp sử dụng
3. Kiến trúc QRTable, ranh giới dịch vụ và quyền sở hữu dữ liệu
4. Bài toán phân tán và cơ chế xử lý: giao tiếp, xác thực/phân quyền, ngữ cảnh đơn vị thuê bao (tenant), tính nhất quán, giao dịch phân tán và cập nhật gần thời gian thực
5. Kết quả kiểm chứng và hướng phát triển

### Bố cục / hình ảnh

- Vẽ timeline ngang 5 cột.
- Mỗi cột chỉ 1 cụm từ chính, icon nhỏ.
- Không đặt nhiều paragraph trên slide.
- Giữ đúng 5 nhãn `01` đến `05` như nguồn cho section marker ở các phần tiếp theo.

### Logic cần hiểu

Lộ trình giúp người nghe biết trước bài nói không đi theo danh sách màn hình UI, mà đi theo lập luận: vấn đề -> thiết kế -> cơ chế -> bằng chứng.

### Kịch bản thuyết trình chi tiết

"Phần thứ nhất trình bày bối cảnh vận hành F&B, các điểm bàn giao trách nhiệm và luồng từ QR đến thanh toán. Phần thứ hai xác định bài toán, mục tiêu, phạm vi và mô hình tác nhân, trong đó phân biệt nhân sự hoặc quản trị viên dùng tài khoản với khách hàng tham gia theo phiên QR.

Phần thứ ba là kiến trúc tổng thể và ranh giới sở hữu dữ liệu của QRTable. Từ kiến trúc đó, phần thứ tư phân tích các vấn đề phát sinh khi tách hệ thống thành nhiều miền nghiệp vụ: giao tiếp liên dịch vụ, xác thực và phân quyền, ngữ cảnh đơn vị thuê bao, tính nhất quán, giao dịch phân tán và cập nhật gần thời gian thực. Mỗi cơ chế được đặt sau bài toán tương ứng để làm rõ lý do lựa chọn.

Phần cuối tổng hợp phương pháp đánh giá, kết quả của luồng cốt lõi và hướng phát triển. Các kết luận được đối chiếu bằng kiểm thử tự động, kiểm thử có điều kiện, trạng thái vận hành, demo và ma trận truy vết. Năm phần được liên kết nhất quán theo quan hệ từ bài toán, quyết định thiết kế đến kết quả đánh giá. Điểm xuất phát là vòng đời thực tế của một đơn hàng trong nhà hàng."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-defense-deck-methodology-plan.md`
- `docs/graduation-thesis-resources/thesis-defense-slide-content-guide.md`

### Không nói quá

- Không biến roadmap thành danh sách tính năng marketing.

---

## Slide 3. Vòng đời đơn hàng F&B là chuỗi trạng thái đa tác nhân

### Dán lên slide

**Nhãn phần (góc trên phải):** `01 · BỐI CẢNH F&B & QR-TO-PAYMENT`

**Tiêu đề:** Vòng đời đơn hàng F&B là chuỗi trạng thái đa tác nhân

**Thông điệp chính:** Một đơn hàng đi qua nhiều tác nhân và nhiều điểm bàn giao trách nhiệm trước khi hoàn tất.

**Tác nhân và thao tác chính:**

- Khách tại bàn: quét QR, xem menu, thao tác giỏ chung, gửi đơn, theo dõi đơn.
- Nhân viên/POS: xác nhận đơn, xử lý yêu cầu phục vụ, yêu cầu hoặc ghi nhận thanh toán.
- Bếp/bar: nhận phiếu chế biến, chuyển trạng thái chế biến, báo món sẵn sàng.
- Nhà cung cấp thanh toán: gửi thông báo giao dịch qua webhook.

**Các điểm bàn giao chính:**

- Khách hàng -> nhân viên/POS: gửi yêu cầu đặt món để chờ xác nhận.
- Nhân viên/POS -> bếp/bar: chuyển đơn đã xác nhận thành phiếu chế biến.
- Bếp/bar -> nhân viên/khách hàng: cập nhật tiến độ và trạng thái món.
- Nhà cung cấp thanh toán -> dịch vụ Payment: gửi thông báo giao dịch để hệ thống đối chiếu và ghi nhận.

### Bố cục / hình ảnh

- Dùng sơ đồ swimlane tự vẽ 4 làn: Khách hàng, Nhân viên/POS, Bếp/Bar và Nhà cung cấp thanh toán.
- Nên bổ sung hình minh họa "một nhà hàng áp dụng QRTable": bàn có mã QR, khách dùng điện thoại, nhân viên có POS, bếp có màn hình KDS, thanh toán bằng VietQR hoặc tiền mặt. Hình này giúp người phản biện nắm bối cảnh thực tế trước khi nghe phần kiến trúc.
- Có thể dùng `chapter2-fnb-pos-lifecycle.png` làm nguồn tham khảo, nhưng lên slide nên vẽ lại gọn.
- Nếu dùng trực tiếp hình trong báo cáo: chỉ lấy phần vòng đời nghiệp vụ và đặt chú thích "QR chỉ là điểm vào".

### Logic cần hiểu

Điểm thuyết phục là chuyển góc nhìn từ "ứng dụng đặt món" sang một quy trình có nhiều điểm bàn giao trách nhiệm. Slide này chưa phân tích danh tính, phân quyền hoặc quyền sở hữu dữ liệu; các nội dung đó lần lượt thuộc Slide 8 và phần kiến trúc.

### Kịch bản thuyết trình chi tiết

"Trong F&B, một đơn hàng không phải là thao tác của một người dùng duy nhất. Khách hàng khởi tạo nhu cầu tại bàn, nhân viên/POS xác nhận khả năng phục vụ, bếp hoặc bar tiếp nhận công việc chế biến, còn hệ thống thanh toán bên ngoài có thể gửi thông tin giao dịch về QRTable.

Slide này tập trung vào trách nhiệm vận hành, chưa đi vào cơ chế nhận diện hay phân quyền. Khách hàng gửi yêu cầu đặt món trong phạm vi phiên tại bàn. Nhân viên/POS quyết định mốc xác nhận và xử lý các thao tác phục vụ hoặc thanh toán. Bếp/bar chỉ tiếp nhận công việc sau mốc xác nhận. Nhà cung cấp thanh toán không thao tác như người dùng, mà gửi thông báo giao dịch qua tuyến webhook được xác định trước.

Các điểm bàn giao này tạo thành một chuỗi trách nhiệm. Yêu cầu của khách được chuyển cho nhân viên ở trạng thái chờ xác nhận. Đơn đã xác nhận mới trở thành công việc của bếp/bar. Tiến độ chế biến sau đó được phản hồi cho nhân viên và khách hàng. Khi thanh toán điện tử phát sinh, thông tin giao dịch từ bên ngoài được chuyển vào miền thanh toán để đối chiếu với hóa đơn.

Như vậy, luận điểm của slide này là trách nhiệm được chuyển giao qua nhiều tác nhân. Slide tiếp theo sẽ sắp xếp các điểm bàn giao đó theo trình tự thời gian từ QR đến thanh toán."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter2-fnb-pos-lifecycle.png`

### Không nói quá

- Không nói mọi nhà hàng đều vận hành giống hệt nhau. Đây là luồng đại diện trong phạm vi khóa luận.

---

## Slide 4. Luồng nghiệp vụ trọng tâm của QRTable: QR -> Cart -> Order -> KDS -> Payment

### Dán lên slide

**Nhãn phần (góc trên phải):** `01 · BỐI CẢNH F&B & QR-TO-PAYMENT`

**Tiêu đề:** Luồng nghiệp vụ trọng tâm: QR -> Cart -> Order -> KDS -> Payment

**Nội dung luồng có thể dán trực tiếp:**

1. QR hợp lệ mở hoặc nối tiếp phiên phục vụ theo nhà hàng/bàn.
2. Khách tại bàn cùng xem thực đơn và thao tác giỏ món dùng chung.
3. Gửi đơn tạo đơn chờ xác nhận và hóa đơn đang mở.
4. Nhân viên xác nhận đơn và kiểm tra khả năng phục vụ/tồn kho.
5. Bếp/bar nhận phiếu sau xác nhận và cập nhật tiến độ món.
6. Thanh toán tiền mặt/VietQR kết thúc hóa đơn, đóng phiên và chuyển bàn sang dọn.

**Giới hạn phạm vi:** Chỉ mô tả các mốc nghiệp vụ; chi tiết kiến trúc và cơ chế đảm bảo đúng được phân tích ở các mục kỹ thuật tiếp theo.

### Bố cục / hình ảnh

- Vẽ flow ngang 6 node lớn.
- Dưới mỗi node ghi tác nhân/chức năng, không ghi công nghệ:
  - QR/phiên: Khách hàng
  - Giỏ món: Nhóm khách cùng bàn
  - Xác nhận đơn: Nhân viên/POS
  - Phiếu bếp: Bếp/Bar
  - Thanh toán: Khách hàng + Nhân viên/Nhà cung cấp
- Không dùng nguyên `chapter5-qr-ordering-session.pdf` trên main slide vì quá dày. Dùng nó làm reference hoặc appendix.
- Không đặt icon DB/Redis/Kafka trong nhóm nghiệp vụ QR-to-payment; để các công nghệ đó xuất hiện ở nhóm kiến trúc tổng thể và cơ chế xử lý.

### Logic cần hiểu

Luồng này có hai điểm dễ bị nói sai:

- Gửi đơn chưa đồng nghĩa với bếp bắt đầu xử lý; đơn cần qua bước nhân viên xác nhận.
- KDS xuất hiện sau mốc xác nhận đơn, không phải ngay khi khách thao tác giỏ.
- Không giải thích Redis, Kafka, outbox hoặc Saga tại đây; các cơ chế đó sẽ được dùng sau để giải thích vì sao luồng này được đảm bảo đúng.

### Kịch bản thuyết trình chi tiết

"Từ các điểm bàn giao ở slide trước, luồng QR-to-Payment được sắp xếp thành sáu mốc nghiệp vụ: tham gia phiên bằng QR, thao tác giỏ, gửi đơn, nhân viên xác nhận, bếp tiếp nhận và hóa đơn được thanh toán. Ở đây em chỉ mô tả trình tự vận hành, chưa gắn từng bước với công nghệ hiện thực.

Bước đầu tiên là thiết lập đúng phiên phục vụ. QR hợp lệ xác định nhà hàng và bàn, sau đó khách tại cùng bàn có thể xem thực đơn và thao tác trên giỏ món dùng chung. Sau khi hoàn tất giỏ, khách gửi yêu cầu đặt món; hệ thống tạo đơn ở trạng thái chờ xác nhận và duy trì hóa đơn đang mở cho phiên.

Đơn ở trạng thái chờ chưa đồng nghĩa với việc bếp đã bắt đầu xử lý. Trong mô hình vận hành này, đơn cần qua bước nhân viên xác nhận. Bước xác nhận giúp nhà hàng kiểm tra tình trạng phục vụ, món còn khả dụng hay không và các điều kiện nghiệp vụ khác trước khi bếp/bar nhận phiếu.

Sau khi đơn được xác nhận, bếp hoặc bar nhận phiếu và cập nhật tiến độ món. Cuối cùng, hóa đơn được thanh toán bằng tiền mặt hoặc VietQR, phiên phục vụ kết thúc và bàn chuyển sang trạng thái dọn. Trước khi xác định kiến trúc bảo vệ chuỗi trạng thái này, cần làm rõ những rủi ro vận hành và bất biến không được phép vi phạm."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter3-business-flow.pdf`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-qr-ordering-session.pdf`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-order-confirm-stock.pdf`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-order-confirm-stock-slide22.pdf`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-kds-ticket-lifecycle.pdf`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-payment-settlement.pdf`

### Không nói quá

- Không nói stock bị trừ ngay khi submit.
- Không nói KDS là source of truth của đơn hàng.
- Không đưa Redis, Kafka, outbox hoặc Saga vào luồng nghiệp vụ này; các cơ chế đó bắt đầu từ phần kiến trúc và bài toán phân tán.

---

## Slide 5. Rủi ro vận hành và các bất biến hệ thống cần bảo vệ

### Dán lên slide

**Nhãn phần (góc trên phải):** `01 · BỐI CẢNH F&B & QR-TO-PAYMENT`

**Tiêu đề:** Rủi ro vận hành và các bất biến hệ thống cần bảo vệ

| Rủi ro                         | Bất biến cần giữ                                                   |
| ------------------------------ | ------------------------------------------------------------------ |
| Nhầm nhà hàng/bàn/phiên        | Khách phải vào đúng không gian phục vụ                             |
| Cập nhật giỏ trên phiên bản cũ | Thay đổi hợp lệ mới hơn không bị ghi đè                            |
| Gửi hoặc xác nhận đơn lặp      | Một thao tác lặp không tạo thêm đơn hoặc trừ tồn kho ngoài ý muốn  |
| Tồn kho không khớp             | KDS chỉ nhận phiếu sau khi đơn được xác nhận và tồn kho được xử lý |
| Thanh toán lặp                 | Một hóa đơn chỉ được ghi nhận thanh toán một lần                   |
| Trạng thái hiển thị bị lệch    | Giao diện phải tải lại trạng thái từ nguồn có thẩm quyền           |

**Luận điểm chuyển tiếp:** Các rủi ro này tạo ra yêu cầu kiến trúc cho các mục kỹ thuật tiếp theo.

### Bố cục / hình ảnh

- Dùng bảng 2 cột như trên.
- Mỗi dòng có một biểu tượng nhỏ: đơn vị thuê bao, giỏ món, tồn kho, thanh toán, cập nhật trạng thái.
- Highlight hai dòng quan trọng nhất cho defense: tồn kho và thanh toán lặp.

### Logic cần hiểu

Đây là cầu nối từ bài toán nghiệp vụ sang phát biểu bài toán hệ thống. Slide này chỉ xác định rủi ro và bất biến, chưa suy ra lựa chọn kiến trúc hoặc cơ chế cụ thể.

### Kịch bản thuyết trình chi tiết

"Luồng nghiệp vụ vừa mô tả đặt ra một nhóm rủi ro cần được kiểm soát. Nếu chuỗi QR-to-Payment cho biết hệ thống cần làm gì, các bất biến xác định những điều tuyệt đối không được sai khi chuỗi đó vận hành trên một nền tảng có nhiều nhà hàng và nhiều nhóm tác nhân.

Rủi ro đầu tiên là nhầm ngữ cảnh phục vụ. QRTable là nền tảng SaaS, nên cùng một hệ thống phục vụ nhiều nhà hàng. Khách quét QR phải vào đúng nhà hàng, đúng bàn và đúng phiên. Nhân viên cũng chỉ được thao tác trong phạm vi nhà hàng hoặc vai trò được cấp. Nếu sai ngữ cảnh, hệ thống không chỉ sai nghiệp vụ mà còn có nguy cơ lộ dữ liệu giữa các đơn vị thuê bao.

Rủi ro thứ hai là trạng thái và thao tác lặp. Khi nhiều khách cùng bàn thao tác, một người có thể gửi thay đổi dựa trên bản giỏ không còn mới nhất. Gửi đơn, xác nhận đơn hoặc ghi nhận thanh toán cũng có thể được thực hiện lại do người dùng bấm nhiều lần, trình duyệt gửi lại hoặc kết nối mạng gián đoạn. Nếu không kiểm soát, hệ thống có thể tạo đơn lặp, trừ tồn kho ngoài ý muốn hoặc ghi nhận một hóa đơn đã thanh toán thêm lần nữa.

Rủi ro cuối là trạng thái hiển thị. Nhân viên và bếp cần thấy thay đổi nhanh, nhưng giao diện chỉ có giá trị khi quay về nguồn trạng thái có thẩm quyền. Các rủi ro này dẫn đến một câu hỏi chung: QRTable phải phối hợp các miền nghiệp vụ như thế nào để luồng phục vụ vẫn liền mạch mà các bất biến trên không bị phá vỡ? Slide tiếp theo sẽ phát biểu bài toán hệ thống từ câu hỏi đó."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/testing/phase-5/traceability-matrix.md`

### Không nói quá

- Không nói toàn bộ bất biến đã được kiểm chứng hoàn toàn trên hệ thống tích hợp đầy đủ.

---

## Slide 6. Phát biểu bài toán: phối hợp nhiều miền nghiệp vụ trong một nền tảng POS

### Dán lên slide

**Nhãn phần (góc trên phải):** `02 · MỤC TIÊU, PHẠM VI, TÁC NHÂN & TRƯỜNG HỢP SỬ DỤNG`

**Tiêu đề:** Bài toán hệ thống: phối hợp nhiều miền nghiệp vụ trong một nền tảng POS

**Phát biểu bài toán có thể dán trực tiếp:**

QRTable cần xây dựng một nền tảng SaaS POS cho F&B, trong đó đặt món qua QR, POS, KDS và thanh toán được tổ chức theo các miền trách nhiệm rõ ràng nhưng vẫn tạo thành một luồng nghiệp vụ liền mạch, có thể kiểm soát trạng thái.

**Ranh giới phạm vi:** Bối cảnh F&B tạo ra bài toán thực tế; đóng góp của khóa luận nằm ở kiến trúc hệ thống, ranh giới dịch vụ và các cơ chế bảo vệ bất biến.

**Ràng buộc thiết kế:**

- Nhiều nhà hàng cùng dùng nền tảng nhưng dữ liệu của từng tenant phải tách biệt
- Các ứng dụng người dùng truy cập qua một điểm vào thống nhất
- Mỗi miền nghiệp vụ có trách nhiệm dữ liệu rõ
- Tác vụ cần phản hồi trực tiếp và tác vụ sau điểm xác nhận được phân biệt rõ
- Trạng thái phục vụ đọc nhanh không thay thế nguồn trạng thái nghiệp vụ

### Bố cục / hình ảnh

- Đặt phát biểu bài toán ở trung tâm.
- Xung quanh là 5 ràng buộc dạng chip.
- Có thể đặt hình "nhiều nhà hàng kết nối vào nền tảng đám mây QRTable" ở nền hoặc bên phải để giải thích mô hình đa tenant một cách trực quan.
- Không dùng hình phức tạp.

### Logic cần hiểu

Nên nói ngắn, chắc. Đây là câu trả lời cho "rốt cuộc đề tài giải quyết vấn đề kỹ thuật gì?"

### Kịch bản thuyết trình chi tiết

"Từ các rủi ro vừa nêu, bài toán hệ thống của QRTable được phát biểu như sau: phối hợp nhiều miền nghiệp vụ có trách nhiệm và vòng đời riêng nhưng vẫn tạo thành một luồng phục vụ thống nhất. Thực đơn và bàn, đơn hàng và hóa đơn, bếp/bar, thanh toán và quản trị nhà hàng không thể cập nhật trạng thái thay nhau một cách tùy ý.

Nền tảng đồng thời phục vụ nhiều nhà hàng, nên mọi thao tác phải được đặt trong đúng phạm vi đơn vị thuê bao, gọi là tenant. Khách hàng, nhân viên và quản trị viên có cách tham gia hệ thống khác nhau nhưng các ứng dụng đều cần một điểm truy cập thống nhất. Những tác vụ cần trả kết quả trực tiếp phải được phân biệt với các tác dụng phụ chỉ nên diễn ra sau khi trạng thái nghiệp vụ đã được xác nhận.

Một yêu cầu khác là phân biệt trạng thái nghiệp vụ có thẩm quyền với trạng thái phục vụ đọc nhanh. KDS cần cập nhật gần thời gian thực, nhưng không tự quyết định vòng đời đơn hàng. Thông tin thanh toán cũng phải được đối chiếu với hóa đơn, không thể chỉ dựa vào tín hiệu từ giao diện hoặc một thông báo bên ngoài.

Như vậy, bài toán không chỉ là xây dựng đủ màn hình chức năng, mà là xác định trách nhiệm, phạm vi dữ liệu và các mốc chuyển trạng thái của toàn bộ luồng phục vụ. Từ phát biểu này, khóa luận xác định mục tiêu nghiên cứu, mục tiêu xây dựng và phạm vi đánh giá cụ thể."

**Nếu hội đồng hỏi về mô hình kinh doanh:** "Dạ, em xem F&B là bối cảnh thực tế để hình thành yêu cầu kỹ thuật. Khóa luận không đánh giá thị trường hay doanh thu của QRTable. Phần em tập trung là cách một nền tảng phục vụ nhiều nhà hàng tổ chức ranh giới trách nhiệm, dữ liệu và trạng thái để bảo vệ luồng nghiệp vụ."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/frontmatter/abstract.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

### Không nói quá

- Không nói microservices là mục tiêu tự thân.

---

## Slide 7. Mục tiêu và phạm vi: nghiên cứu, xây dựng và đánh giá luồng cốt lõi

### Dán lên slide

**Nhãn phần (góc trên phải):** `02 · MỤC TIÊU, PHẠM VI, TÁC NHÂN & TRƯỜNG HỢP SỬ DỤNG`

**Tiêu đề:** Mục tiêu và phạm vi: luồng phục vụ cốt lõi được nghiên cứu, xây dựng và đánh giá

**Ba nhóm mục tiêu:**

- Nghiên cứu: quy trình bán hàng F&B, mô hình SaaS đa đơn vị thuê bao, kiến trúc vi dịch vụ, giao tiếp hệ thống, tính nhất quán và bảo mật.
- Xây dựng: phiên QR, giỏ món dùng chung, đơn hàng, màn hình bếp KDS, thanh toán; quản trị nhà hàng/gói dịch vụ/báo cáo ở mức hỗ trợ.
- Đánh giá: đối chiếu kết quả bằng ma trận truy vết, kiểm thử, tài liệu kiến trúc, trạng thái vận hành và nhật ký hệ thống.

**Phạm vi trọng tâm:**

- Phiên QR, giỏ món dùng chung, đơn hàng, màn hình bếp KDS và thanh toán
- Ngữ cảnh đơn vị thuê bao (tenant), phân quyền theo vai trò/quyền và giới hạn tính năng theo gói trong các luồng chính
- Quyền sở hữu dịch vụ/dữ liệu theo miền nghiệp vụ
- Tính nhất quán và thao tác lặp trong luồng đặt món/thanh toán

**Ngoài phạm vi đánh giá chính:**

- Đo hiệu năng/tải định lượng.
- Tính sẵn sàng cao, kiểm thử hỗn loạn (chaos testing) và vận hành cấp doanh nghiệp.
- Hàng đợi ngoại tuyến đầy đủ, bộ giải quyết xung đột và ứng dụng di động riêng.
- Bảo đảm exactly-once ở cấp toàn luồng.

### Bố cục / hình ảnh

- Ba thẻ nhỏ ở trên: "Nghiên cứu", "Xây dựng", "Đánh giá".
- Bên dưới dùng hai cột: "Phạm vi trọng tâm" và "Hướng kiểm chứng/mở rộng sau phạm vi chính".
- Cột hướng mở rộng dùng màu neutral/gray, không dùng màu đỏ.

### Logic cần hiểu

Phạm vi khóa luận cần bám đúng Chương 1: có mục tiêu nghiên cứu, mục tiêu xây dựng và mục tiêu đánh giá. Giọng nói nên là "đây là phạm vi được chọn để chứng minh sâu", còn phần mở rộng được trình bày như lộ trình phát triển tiếp theo.

### Kịch bản thuyết trình chi tiết

"Từ bài toán vừa phát biểu, khóa luận xác định ba nhóm mục tiêu. Nhóm thứ nhất là mục tiêu nghiên cứu: tổng hợp bối cảnh bán hàng trong ngành F&B, mô hình SaaS đa đơn vị thuê bao, kiến trúc vi dịch vụ, giao tiếp giữa các thành phần, tính nhất quán và bảo mật. Các phần lý thuyết này không đứng riêng, mà được dùng để giải thích quyết định thiết kế của QRTable.

Nhóm thứ hai là mục tiêu xây dựng hệ thống. Phần trọng tâm là phiên QR, giỏ món dùng chung, đơn hàng, KDS và thanh toán. Ngữ cảnh đơn vị thuê bao, phân quyền, kiểm soát thao tác lặp và xử lý nhánh lỗi được đưa vào vì chúng trực tiếp bảo vệ luồng này. Các năng lực quản trị nhà hàng, gói dịch vụ và báo cáo đóng vai trò hỗ trợ cho mô hình SaaS, nhưng không phải tất cả đều được phân tích sâu như luồng QR-to-Payment.

Nhóm thứ ba là mục tiêu đánh giá. Khóa luận không chỉ dừng ở giao diện chạy được, mà gắn kết quả với ma trận truy vết, kiểm thử, tài liệu kiến trúc, trạng thái thực thi, nhật ký hệ thống và các hiện vật kiểm chứng. Nhờ đó, các kết luận về quyền sở hữu dịch vụ/dữ liệu, mô hình xác thực và phân quyền, cô lập tenant, xử lý xác nhận đơn, KDS và thanh toán có điểm tựa từ báo cáo, mã nguồn và kiểm thử.

Các nội dung như đo hiệu năng/tải định lượng, tính sẵn sàng cao, kiểm thử hỗn loạn, hàng đợi ngoại tuyến đầy đủ hoặc ứng dụng di động riêng được xem là hướng kiểm chứng/mở rộng sau phạm vi chính. Trong phạm vi đã chọn, mô hình tác nhân phải làm rõ ai tham gia vào luồng cốt lõi và mỗi tác nhân được nhận diện theo cơ chế nào."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/phases/phase-5-7-finalization.md`

### Không nói quá

- Không nói "sẵn sàng triển khai thương mại ngay".

---

## Slide 8. Mô hình tác nhân: nhân sự theo danh tính, khách hàng theo phiên QR

### Dán lên slide

**Nhãn phần (góc trên phải):** `02 · MỤC TIÊU, PHẠM VI, TÁC NHÂN & TRƯỜNG HỢP SỬ DỤNG`

**Tiêu đề:** Mô hình tác nhân: nhân sự theo danh tính, khách hàng theo phiên QR

**Tác nhân:**

- Super Admin: quản trị tenant, gói dịch vụ và phân tích nền tảng
- Owner/Manager: vận hành nhà hàng, thực đơn, nhân sự, bảng điều khiển
- Waiter/POS: xác nhận đơn, bàn, thanh toán, yêu cầu phục vụ
- Chef/Barista: xem và cập nhật KDS theo khu vực bếp/bar
- Customer session: quét QR, xem menu, thao tác giỏ món, gửi đơn, theo dõi thanh toán
- Nhà cung cấp thanh toán: tác nhân hệ thống bên ngoài gửi thông tin giao dịch

**Điểm phân biệt chính:** Customer không có vai trò RBAC; quyền truy cập được giới hạn theo QR, phiên, bàn và tenant. Nhà cung cấp thanh toán không phải người dùng và chỉ tương tác qua webhook.

### Bố cục / hình ảnh

- Dùng `chapter3-actor-use-case-overview.pdf` làm nguồn chính.
- Trên slide nên vẽ lại thành 3 nhóm:
  - Tác nhân định danh (identity actors): Super Admin, Owner, Manager, Waiter, Chef, Barista
  - Tác nhân theo phiên (session actor): Customer
  - Tác nhân hệ thống bên ngoài: Nhà cung cấp thanh toán/webhook
- Đặt note lớn: "Customer là tác nhân theo phiên, không phải tài khoản nhân sự".

### Logic cần hiểu

Sự phân biệt giữa tác nhân định danh, tác nhân theo phiên và tác nhân hệ thống bên ngoài là cơ sở để giải thích các tuyến xác thực và kiểm soát truy cập ở Slide 17.

### Kịch bản thuyết trình chi tiết

"Sau khi xác định phạm vi, slide này làm rõ cách các tác nhân được nhận diện. Với người dùng trực tiếp, QRTable có hai mô hình chính; ngoài ra còn có một tác nhân hệ thống bên ngoài là nhà cung cấp thanh toán.

Nhóm thứ nhất gồm nhân sự nhà hàng và quản trị nền tảng như Waiter, Chef, Barista, Owner, Manager và Super Admin. Đây là các tác nhân định danh, sử dụng tài khoản lâu dài. Ở mức phân tích yêu cầu, điểm cần ghi nhớ là họ được nhận diện theo danh tính và chỉ thao tác trong phạm vi trách nhiệm được cấp; chi tiết JWT/OIDC, vai trò và chuỗi kiểm soát sẽ được giải thích ở phần bảo mật.

Nhóm thứ hai là khách hàng tại bàn. Customer không cần tạo tài khoản để gọi món và không phải một vai trò RBAC tương tự nhân sự. Phạm vi truy cập của khách gắn với QR hợp lệ, bàn, phiên phục vụ và tenant tương ứng. Vì vậy, khi phiên hết hiệu lực hoặc không khớp bàn/tenant, quyền truy cập của khách cũng không còn hợp lệ.

Nhà cung cấp thanh toán là tác nhân hệ thống bên ngoài. Thành phần này không đăng nhập như nhân sự và cũng không tham gia phiên khách; nó gửi thông báo giao dịch qua webhook để QRTable xác minh và đối chiếu. Ba cách tham gia này tạo nền cho mô hình xác thực và phân quyền được trình bày ở Slide 17."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter3-actor-use-case-overview.pdf`
- `docs/architecture/permission-matrix.md`

### Không nói quá

- Không nói khách hàng có tài khoản Keycloak hoặc vai trò RBAC.

---

## Slide 9. Đóng góp của khóa luận

### Dán lên slide

**Nhãn phần (góc trên phải):** `02 · MỤC TIÊU, PHẠM VI, TÁC NHÂN & TRƯỜNG HỢP SỬ DỤNG`

**Tiêu đề:** Đóng góp chính của khóa luận

**5 đóng góp chính:**

1. Bộ mô hình yêu cầu cho POS SaaS F&B: tác nhân, trường hợp sử dụng, vòng đời trạng thái và luồng QR-to-Payment.
2. Kiến trúc vi dịch vụ cùng ranh giới dịch vụ và quyền sở hữu dữ liệu.
3. Hệ thống hiện thực luồng cốt lõi QR -> Cart -> Order -> KDS -> Payment.
4. Các cơ chế bảo vệ phân quyền, cô lập tenant, thao tác lặp và tình huống một bước trong luồng liên dịch vụ thất bại.
5. Bộ bằng chứng truy vết yêu cầu, thiết kế, mã nguồn, kiểm thử và kết quả đánh giá.

### Bố cục / hình ảnh

- 5 thẻ ngang hoặc 5 node dạng staircase.
- Mỗi thẻ tối đa 1 dòng chính + 1 dòng phụ.

### Logic cần hiểu

Phần đóng góp trả lời câu hỏi "khóa luận tạo ra những kết quả nào?" mà không biến thành danh sách tính năng giao diện.

### Kịch bản thuyết trình chi tiết

"Nếu Slide 7 trình bày các mục tiêu được đặt ra, slide này tổng hợp những kết quả và hiện vật mà khóa luận đã tạo ra để đáp ứng các mục tiêu đó.

Đóng góp thứ nhất là bộ mô hình yêu cầu cho bài toán POS SaaS F&B, gồm tác nhân, trường hợp sử dụng, vòng đời trạng thái và luồng QR-to-Payment. Thứ hai là thiết kế kiến trúc vi dịch vụ với ranh giới trách nhiệm, quyền sở hữu dữ liệu và nguyên tắc không truy cập trực tiếp cơ sở dữ liệu của miền khác.

Thứ ba là hệ thống hiện thực luồng cốt lõi từ phiên QR và giỏ món đến xác nhận đơn, KDS và thanh toán. Thứ tư là nhóm cơ chế bảo vệ luồng này trước truy cập sai quyền, sai tenant, thao tác lặp và tình huống một bước trong luồng liên dịch vụ thất bại. Khái niệm lỗi từng phần (partial failure) và các cơ chế liên quan sẽ được giải thích tại đúng bài toán kỹ thuật ở những slide sau, thay vì giả định người nghe đã biết trước.

Đóng góp thứ năm là bộ bằng chứng truy vết nối yêu cầu với thiết kế, mã nguồn, kiểm thử và kết quả đánh giá. Năm nhóm kết quả này là cơ sở để chuyển sang phần tiếp theo: những yêu cầu nào thực sự chi phối kiến trúc QRTable và kiến trúc đã đáp ứng chúng như thế nào."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`
- `docs/testing/phase-5/traceability-matrix.md`

### Không nói quá

- Không bổ sung SaaS onboarding thành nội dung phân tích sâu của bản trình chiếu này.

---

## Slide 10. Đặc điểm nghiệp vụ định hình kiến trúc QRTable

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`

**Tiêu đề:** Đặc điểm nghiệp vụ định hình kiến trúc QRTable

| Đặc điểm bài toán                     | Rủi ro cần kiểm soát                                       | Yêu cầu chi phối kiến trúc                                     |
| ------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| Nhiều miền nghiệp vụ                  | Trách nhiệm và nguồn trạng thái bị nhập nhằng              | Ranh giới trách nhiệm và quyền sở hữu dữ liệu rõ ràng          |
| Nhiều nhà hàng dùng chung nền tảng    | Dữ liệu bị lẫn giữa các nhà hàng                           | Cô lập dữ liệu theo tenant xuyên suốt hệ thống                 |
| Nhiều nhóm tác nhân                   | Tác nhân thực hiện thao tác ngoài phạm vi                  | Xác định đúng tác nhân, tenant và phạm vi quyền                |
| Nhiều màn hình cùng theo dõi vận hành | Trạng thái hiển thị chậm hoặc lệch                         | Cập nhật kịp thời nhưng vẫn giữ source of truth rõ ràng        |
| Luồng nhiều bước có thể bị gửi lại    | Tạo đơn, trừ tồn kho hoặc ghi nhận thanh toán ngoài ý muốn | Giữ đúng trạng thái khi thao tác lặp hoặc một bước bị thất bại |

### Bố cục / hình ảnh

- Dùng bảng 3 cột.
- Có thể đặt `chapter4-technology-integration-map.png` ở phụ lục; không cần đưa vào slide chính nếu bảng đã đủ rõ.

### Logic cần hiểu

Slide này tổng hợp các rủi ro cụ thể ở slide 5 thành yêu cầu cấp kiến trúc. Đây là tiêu chí để lựa chọn kiến trúc, chưa phải nơi giới thiệu công nghệ hoặc cơ chế xử lý.

### Kịch bản thuyết trình chi tiết

"Slide 5 đã nêu các rủi ro cụ thể như nhầm nhà hàng, thao tác lặp, tồn kho không khớp, thanh toán lặp và trạng thái hiển thị bị lệch. Ở đây, em không lặp lại từng tình huống mà tổng hợp chúng thành các yêu cầu có khả năng chi phối cấu trúc của hệ thống.

Yêu cầu thứ nhất đến từ việc QRTable có nhiều miền nghiệp vụ với quy tắc khác nhau. Thực đơn và tồn kho, đơn hàng và hóa đơn, bếp, thanh toán cùng quản trị nhà hàng cần có trách nhiệm rõ ràng để tránh một thành phần tự quyết định trạng thái thuộc miền khác. Yêu cầu thứ hai là cô lập dữ liệu vì nhiều nhà hàng sử dụng chung nền tảng nhưng không được nhìn thấy hoặc thay đổi dữ liệu của nhau.

Yêu cầu thứ ba xuất phát từ sự khác biệt giữa các nhóm tác nhân. Khách hàng theo phiên QR, nhân viên theo tài khoản, quản trị viên và nhà cung cấp thanh toán có phạm vi truy cập khác nhau. Yêu cầu thứ tư là phản hồi vận hành kịp thời: POS, KDS và ứng dụng khách cần thấy thay đổi nhanh, nhưng trạng thái hiển thị vẫn phải quay về nguồn có thẩm quyền.

Yêu cầu cuối cùng là giữ đúng trạng thái trong một luồng nhiều bước. Một thao tác có thể được gửi lại, hoặc một bước đã thành công trong khi bước tiếp theo thất bại. Điều này xuất hiện ở gửi đơn, xác nhận tồn kho và thanh toán, chứ không chỉ riêng miền Payment. Năm yêu cầu trên chưa quyết định sẵn công nghệ; chúng là tiêu chí để slide tiếp theo giải thích vì sao QRTable lựa chọn kiến trúc vi dịch vụ và chấp nhận các chi phí phân tán đi kèm."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-technology-integration-map.png`
- `docs/DOC-CODE-ANCHORS.md`

### Không nói quá

- Không dùng động lực kiến trúc để suy diễn thành kết quả đo hiệu năng chưa có.

---

## Slide 11. Cơ sở lựa chọn kiến trúc vi dịch vụ và chi phí phân tán

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`

**Tiêu đề:** Kiến trúc vi dịch vụ được lựa chọn theo ranh giới nghiệp vụ

**Luận điểm chính:**

QRTable không chỉ cung cấp thực đơn qua QR; hệ thống bao quát một luồng POS SaaS có nhiều trạng thái, tác nhân và điểm xác nhận nghiệp vụ.

**Quan hệ giữa nghiệp vụ và lựa chọn kiến trúc:**

Độ phức tạp nghiệp vụ POS SaaS -> tách ranh giới trách nhiệm -> chọn vi dịch vụ theo miền nghiệp vụ -> chấp nhận chi phí phân tán.

**Ý chính:**

- Thực đơn/bàn/tồn kho, đơn hàng/hóa đơn, KDS, thanh toán và tenant/xác thực có quy tắc khác nhau.
- Nếu gom chung, ranh giới trách nhiệm và nguồn trạng thái đúng dễ bị mờ.
- Vi dịch vụ giúp tách trách nhiệm nhưng tạo ra chi phí phân tán cần xử lý.

### Bố cục / hình ảnh

- Không cần dùng hình `chapter2-monolith-vs-microservices.png` làm hình chính nếu không đủ chỗ.
- Nên tự vẽ luồng 4 khối: "Độ phức tạp nghiệp vụ POS SaaS" -> "Tách ranh giới trách nhiệm" -> "Kiến trúc vi dịch vụ" -> "Chi phí phân tán".
- Nếu vẫn muốn dùng hình monolith-vs-microservices, đưa vào appendix hoặc speaker note.

### Logic cần hiểu

Không nói "microservices tốt hơn monolith". Nói rằng quy mô nghiệp vụ của QRTable tạo nhu cầu tách ranh giới trách nhiệm; microservices là lựa chọn thiết kế để đáp ứng nhu cầu đó, nhưng phải trả giá bằng chi phí phân tán. Phần chi phí chỉ nêu khái quát, vì slide kế tiếp sẽ phân nhóm vấn đề phân tán cụ thể.

### Kịch bản thuyết trình chi tiết

"QRTable lựa chọn kiến trúc vi dịch vụ (microservices) từ đặc điểm của bài toán nghiệp vụ, không phải từ giả định rằng mọi hệ thống đều cần được chia thành nhiều dịch vụ. Nền tảng không chỉ mở thực đơn bằng QR, mà bao phủ một luồng POS gồm thực đơn, bàn, tồn kho, phiên QR, giỏ món, đơn hàng, bếp/bar, thanh toán, tenant và quyền truy cập.

Các nhóm nghiệp vụ có quy tắc thay đổi, nhịp vận hành và mốc xác nhận khác nhau. Nếu gom toàn bộ vào một khối nghiệp vụ chung, triển khai ban đầu có thể đơn giản hơn nhưng ranh giới trách nhiệm dễ bị mờ, làm tăng phụ thuộc giữa các phần vốn có lý do thay đổi khác nhau.

Vì vậy, kiến trúc vi dịch vụ được chọn để tổ chức các miền nghiệp vụ thành những ranh giới triển khai và giao tiếp rõ ràng. Lựa chọn này phù hợp với mục tiêu nghiên cứu ranh giới dịch vụ (service boundary) và quyền sở hữu dữ liệu (data ownership), nhưng không có nghĩa vi dịch vụ luôn tốt hơn kiến trúc nguyên khối (monolith).

Tuy nhiên, lựa chọn này tạo thêm chi phí kỹ thuật. Khi đã tách ranh giới, hệ thống phải xử lý giao tiếp giữa các dịch vụ, việc không còn một giao dịch chung, ngữ cảnh tenant và xác thực đi qua nhiều lớp, thao tác gửi lại và cập nhật gần thời gian thực. Những chi phí đó tạo thành các nhóm vấn đề phân tán mà kiến trúc QRTable phải giải quyết."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter2-monolith-vs-microservices.png`
- `AGENTS.md`

### Không nói quá

- Không khẳng định ưu thế hiệu năng của vi dịch vụ so với kiến trúc nguyên khối khi chưa có phép đo.

---

## Slide 12. Lựa chọn vi dịch vụ làm phát sinh các bài toán phân tán

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`

**Tiêu đề:** Lựa chọn vi dịch vụ làm phát sinh các bài toán phân tán

**Các nhóm vấn đề chính:**

| Nhóm vấn đề                 | Câu hỏi kiến trúc                                                               |
| --------------------------- | ------------------------------------------------------------------------------- |
| Giao tiếp liên dịch vụ      | Tương tác nào cần phản hồi tức thời, tương tác nào nên xử lý sau commit?        |
| Xác thực và phân quyền      | Staff/admin và customer session được nhận diện, giới hạn quyền theo cơ chế nào? |
| Cô lập tenant               | Ngữ cảnh tenant đi qua API, service, dữ liệu và kênh cập nhật như thế nào?      |
| Tính nhất quán              | Retry, thao tác lặp và trạng thái cuối cùng được kiểm soát ra sao?              |
| Giao dịch phân tán          | Order phối hợp với Catalog stock thế nào khi không có giao dịch chung?          |
| Cập nhật gần thời gian thực | KDS cập nhật nhanh nhưng không thay thế nguồn trạng thái đúng bằng cách nào?    |

### Bố cục / hình ảnh

- Vẽ node trung tâm: "Luồng POS cốt lõi trên microservices".
- Xung quanh là 6 nhánh vấn đề như bảng trên.
- Không đưa số slide giải quyết lên slide chính; nếu cần, giữ số slide trong speaker note hoặc tài liệu dựng slide.
- Dùng thuật ngữ trang trọng: "vấn đề phân tán", "bất biến hệ thống", "cơ chế xử lý", không dùng cách diễn đạt kiểu hội thoại.

### Logic cần hiểu

Đây là cầu nối giữa quyết định kiến trúc và phần kỹ thuật. Sau khi nói vì sao chọn microservices, cần nói rõ microservices làm phát sinh vấn đề gì; sau đó phần kỹ thuật không còn là các chủ đề rời rạc, mà là lời giải lần lượt cho từng vấn đề.

### Kịch bản thuyết trình chi tiết

"Khi tách theo các miền nghiệp vụ, QRTable không còn xử lý toàn bộ luồng trong một transaction và một database duy nhất. Vì vậy, hệ thống phải trả lời một nhóm câu hỏi kiến trúc rõ ràng.

Thứ nhất là giao tiếp liên dịch vụ: thao tác nào cần phản hồi ngay cho người dùng, và thao tác nào nên được phát như sự kiện sau khi commit. Thứ hai là xác thực và phân quyền: staff/admin có định danh qua Keycloak, trong khi customer chỉ có QR/session scope. Thứ ba là cô lập tenant: tenant context phải xuất hiện nhất quán từ API đến database, Redis, Kafka và WebSocket room.

Tiếp theo là tính nhất quán. Vì không có giao dịch toàn cục giữa các service, QRTable phải kiểm soát thao tác gửi lại, sự kiện sau commit và trạng thái hiển thị cuối cùng. Với Order confirm, vấn đề còn cụ thể hơn: Order phải phối hợp với Catalog stock mà không ghi trực tiếp Catalog DB. Với KDS, hệ thống cần cập nhật gần thời gian thực nhưng vẫn phải giữ Order là nguồn trạng thái bền vững.

Các nhóm vấn đề này liên kết trực tiếp với nhau. Cách chọn kênh giao tiếp ảnh hưởng đến thời điểm trạng thái trở nên nhất quán; mô hình xác thực và tenant context quyết định phạm vi truy cập; còn giao dịch phân tán và cập nhật gần thời gian thực phải tôn trọng quyền sở hữu dữ liệu. Để thấy các trách nhiệm đó được đặt ở đâu, cần nhìn vào kiến trúc tổng thể từ client, BFF đến các dịch vụ miền và hạ tầng."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-defense-slide-content-guide.md`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

### Không nói quá

- Không nói mọi thách thức đã được củng cố ở mức vận hành production.

---

## Slide 13. Kiến trúc tổng thể: Client -> BFF -> domain services -> infrastructure

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`

**Tiêu đề:** Kiến trúc tổng thể: BFF ở biên, domain services sở hữu trạng thái

**Các tầng kiến trúc:**

- Tầng máy khách (Client layer): Management App, Customer PWA
- Tầng biên BFF/API Gateway: HTTP REST, WebSocket, guard chain, TCP/gRPC clients
- Các dịch vụ miền nghiệp vụ (Domain services): Catalog, Order, Kitchen, Payment, SaaS, User-Access, Authorizer
- Hạ tầng dữ liệu, bộ đệm và sự kiện: PostgreSQL/MongoDB theo service, Redis, Kafka
- Các hệ thống tích hợp bên ngoài (External systems): Keycloak, SePay/VietQR, Cloudinary

**Luận điểm chính:** BFF không sở hữu database nghiệp vụ; trạng thái miền nằm ở service owner.

### Bố cục / hình ảnh

- Dùng `chapter4-overall-architecture.png` hoặc `chapter4-communication-topology.png`.
- Vì `chapter4-overall-architecture.png` rất rộng, nên cắt hoặc vẽ lại thành 4 tầng:
  1. Clients
  2. BFF
  3. Domain services
  4. Infrastructure/external systems
- Dùng mũi tên khác nét:
  - solid: command/query
  - dashed: event/hint

### Logic cần hiểu

BFF là điểm vào cho phía người dùng và chuỗi guard, nhưng không phải nơi chứa logic nghiệp vụ chính. Các dịch vụ miền mới là nơi giữ trạng thái và quy tắc theo miền.

### Kịch bản thuyết trình chi tiết

"Kiến trúc tổng thể tổ chức trách nhiệm qua bốn tầng: client, BFF ở biên hệ thống, các dịch vụ miền và hạ tầng lưu trữ, truyền thông cùng các hệ thống tích hợp.

Tầng đầu tiên là client edge. Management App phục vụ staff, owner, manager và admin; Customer PWA phục vụ khách tại bàn. Cả hai không gọi trực tiếp domain service. Mọi request đi qua BFF để thống nhất API surface, guard chain, tenant context và realtime gateway. Điều này giúp tránh việc client biết quá nhiều về topology nội bộ.

Tầng thứ hai là BFF. BFF nhận HTTP REST, WebSocket và webhook công khai, sau đó gọi dịch vụ nội bộ qua TCP hoặc gRPC. BFF không sở hữu cơ sở dữ liệu nghiệp vụ và không nên chứa quy tắc nghiệp vụ phức tạp; vai trò chính là điều phối tại biên, xác thực, phân quyền, ánh xạ yêu cầu/phản hồi và phát gợi ý thời gian thực.

Tầng thứ ba là domain service: Catalog, Order, Kitchen, Payment, SaaS, User-Access và Authorizer. Mỗi service sở hữu dữ liệu hoặc vai trò riêng. Tầng cuối là hạ tầng: PostgreSQL/MongoDB theo boundary, Redis cho session/cache/projection, Kafka cho domain event, Keycloak cho identity và SePay/VietQR cho payment. Các mũi tên giữa service đi qua contract, không đi qua database chung. Do đó, kiến trúc tổng thể mới chỉ xác định vị trí; bước kế tiếp phải làm rõ chính xác service nào sở hữu dữ liệu và quyết định trạng thái nào."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-overall-architecture.png`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-communication-topology.png`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `AGENTS.md`

### Không nói quá

- Không nói BFF chứa logic nghiệp vụ chính.

---

## Slide 14. Ranh giới dịch vụ và quyền sở hữu dữ liệu

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`

**Tiêu đề:** Ranh giới dịch vụ và quyền sở hữu dữ liệu

**Thông điệp chính:** Mỗi service là nguồn trạng thái đúng cho một nhóm nghiệp vụ riêng.

| Dịch vụ     | Dữ liệu/trạng thái sở hữu                                      | Trách nhiệm kiến trúc                                     |
| ----------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| Catalog     | Menu, danh mục, bàn, khu vực, QR, tồn kho                      | Service duy nhất ghi tồn kho                              |
| Order       | Phiên QR, giỏ món, đơn hàng, bill                              | Chủ vòng đời đơn hàng, bill và session                    |
| Kitchen     | KDS runtime projection trên Redis                              | Không có database lịch sử bền vững trong phạm vi hiện tại |
| Payment     | Bản ghi thanh toán, nhật ký audit, cấu hình thanh toán, outbox | Chủ trạng thái ghi nhận và đối soát thanh toán            |
| SaaS        | Tenant, gói dịch vụ, thuê bao                                  | Chủ vòng đời tenant                                       |
| User-Access | Hồ sơ người dùng, vai trò, quyền                               | Chủ dữ liệu phân quyền ứng dụng                           |
| Authorizer  | Kiểm tra JWT/OIDC                                              | Xác thực tập trung qua gRPC                               |

**Quy tắc ranh giới:** Không import entity/repository của service khác để đọc/ghi DB trực tiếp.

### Bố cục / hình ảnh

- Bảng lớn, dễ đọc.
- Highlight 4 dòng luồng cốt lõi: Catalog, Order, Kitchen, Payment.
- Có thể dùng sơ đồ schema cơ sở dữ liệu ở appendix, không cần chính slide.

### Logic cần hiểu

Đây là slide cần nói rõ vì nó chứng minh microservices không chỉ là chia app thành nhiều thư mục hoặc nhiều tiến trình. Điểm chính là mỗi service có trách nhiệm dữ liệu và bất biến nghiệp vụ riêng.

### Kịch bản thuyết trình chi tiết

"Ranh giới dịch vụ được cụ thể hóa bằng quyền sở hữu dữ liệu. Mỗi service là nơi quyết định trạng thái đúng của một nhóm dữ liệu nhất định; service khác không đọc hoặc ghi trực tiếp database của service đó. Đây là nền cho các cơ chế như tính nhất quán, KDS, outbox và Saga.

Với QRTable, Catalog sở hữu menu, danh mục, bàn, QR token và tồn kho. Vì vậy, khi Order cần xử lý tồn kho trong bước xác nhận đơn, Order phải gọi Catalog qua hợp đồng giao tiếp thay vì tự sửa bảng tồn kho. Order sở hữu phiên QR, giỏ món, đơn hàng và bill; Payment không tự ý đóng bill bằng cách ghi trực tiếp vào database của Order, mà phải phối hợp qua ranh giới đã định nghĩa.

Kitchen cần được diễn đạt cẩn thận. Trong phạm vi hiện tại, Kitchen không có database bền vững riêng cho lịch sử bếp. Kitchen sở hữu KDS runtime projection trên Redis, được tạo từ event `order.confirmed`. Projection này phục vụ hàng đợi bếp/bar gần thời gian thực, nhưng không thay thế Order là source of truth và không phải kho phân tích lịch sử dài hạn.

Payment sở hữu bản ghi thanh toán, nhật ký audit, cấu hình thanh toán và outbox. SaaS sở hữu tenant, gói dịch vụ và thuê bao. User-Access sở hữu hồ sơ người dùng, vai trò và quyền. Quy tắc xuyên suốt là các service không truy cập cơ sở dữ liệu chéo. Vì vậy, câu hỏi đầu tiên khi các ranh giới này cần phối hợp là tương tác nào phải phản hồi ngay và tương tác nào nên diễn ra sau khi trạng thái đã được commit."

### Nguồn / bằng chứng

- `AGENTS.md`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/DOC-CODE-ANCHORS.md`

### Không nói quá

- Không nói Kitchen có database bền vững trong phạm vi hiện tại.
- Không nói database theo từng tenant; hiện tại là database theo service + `tenant_id`.

---

## Slide 15. Tiêu chí lựa chọn giao tiếp đồng bộ và bất đồng bộ

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Giao tiếp đồng bộ/bất đồng bộ: yêu cầu tức thời và sự kiện sau commit

**Quy tắc quyết định:**

- Cần phản hồi ngay cho người dùng hoặc cần kết quả để tiếp tục giao dịch -> TCP/gRPC.
- Sự kiện miền đã commit, dùng cho xử lý sau xác nhận hoặc phát tán sự kiện -> Kafka.
- Cập nhật giao diện gần thời gian thực -> WebSocket báo hiệu (hint) + máy khách lấy lại dữ liệu (client refetch).
- Callback ngoài hệ thống -> bộ chuyển tiếp webhook qua BFF.

**Ví dụ trong QRTable:**

- Order -> Catalog trừ tồn kho (deduct stock): TCP, vì xác nhận (confirm) cần biết tồn kho (stock) đủ hay không.
- BFF -> Authorizer: gRPC, vì yêu cầu (request) cần thông tin định danh (identity) ngay.
- Order -> Kitchen: Kafka `order.confirmed`, vì Kitchen xử lý sau khi đơn đã xác nhận.
- Kitchen -> BFF -> UI: Redis Pub/Sub + WebSocket báo hiệu (hint), máy khách lấy lại dữ liệu (client refetch) ảnh chụp API (API snapshot).

### Bố cục / hình ảnh

- Dùng `chapter4-kafka-decision-flow.png` hoặc tự vẽ decision tree gọn.
- Nếu tự vẽ:
  - "Cần quyết định ngay?" -> TCP/gRPC
  - "Sự kiện miền sau commit?" -> Kafka
  - "UI cần cập nhật?" -> WebSocket hint + client refetch
  - "Callback từ provider ngoài?" -> bộ chuyển tiếp webhook qua BFF

### Logic cần hiểu

Điểm quan trọng là không cực đoan: không dùng Kafka cho mọi thứ, cũng không dùng RPC cho mọi xử lý sau commit.

### Kịch bản thuyết trình chi tiết

"Tiêu chí lựa chọn giao tiếp liên dịch vụ của QRTable được chúng em xem xét ở mức độ kiến trúc và tích hợp nghiệp vụ (tức sự ràng buộc về mặt thời gian - temporal coupling), chứ không đồng nhất với tính đồng bộ hay bất đồng bộ ở tầng truyền tải socket hay lập trình I/O tầng dưới. Tiêu chí cốt lõi là bên gọi có cần kết quả ngay để quyết định tiếp hay không.

Nếu thao tác đang nằm trên đường xử lý lệnh (command path) và hệ thống cần kết quả tức thời để tiếp tục giao dịch, chúng em định nghĩa đó là giao tiếp đồng bộ về mặt kiến trúc. Ví dụ rõ nhất là xác nhận đơn: khi nhân viên xác nhận đơn, Order phải biết Catalog có xử lý tồn kho thành công hay không. Nếu thiếu tồn kho, POS phải nhận lỗi ngay và Order không được chuyển sang `PROCESSING`. Vì vậy, Order gọi Catalog qua hợp đồng TCP; Authorizer cũng được gọi qua gRPC vì BFF cần kết quả xác minh token trước khi cho request đi tiếp. Ở tầng truyền tải, gRPC hay TCP có thể chạy bất đồng bộ để tối ưu I/O, nhưng ở tầng kiến trúc nghiệp vụ, đây là các liên kết đồng bộ có chặn (blocking dependencies).

Ngược lại, nếu trạng thái đã commit và các dịch vụ khác chỉ cần phản ứng sau đó, QRTable dùng giao tiếp bất đồng bộ thông qua Kafka để phát tán sự kiện miền. Khi Order đã xác nhận thành công và phát `order.confirmed`, Kitchen có thể tiêu thụ sự kiện bất đồng bộ để tạo phiếu KDS mà không ảnh hưởng đến giao dịch của Order. Sự tách biệt này giúp hệ thống đạt tính nhất quán cuối cùng (eventual consistency) và tăng khả năng chịu lỗi.

WebSocket là lớp thứ ba, chỉ phát tín hiệu thay đổi (hint) để client refetch API snapshot. API snapshot mới là nguồn trạng thái chuẩn (source of truth). Cách phân loại này giúp tách rõ kênh thông báo gần thời gian thực khỏi nơi cung cấp trạng thái nghiệp vụ đáng tin cậy."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-kafka-decision-flow.png`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `libs/constants/src/lib/kafka-topic.constants.ts`

### Không nói quá

- Không thêm Kafka topic ngoài registry: `order.confirmed`, `order.status_changed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`.

---

## Slide 16. Mô hình giao tiếp: vai trò của từng kênh trong QRTable

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Mô hình giao tiếp QRTable: vai trò của HTTP, TCP/gRPC, Kafka, Redis và WebSocket

**Vai trò các kênh:**

- HTTP REST: client gọi BFF và lấy API snapshot.
- WebSocket/Socket.IO: phát hint tới room, sau đó client refetch dữ liệu.
- TCP/gRPC: command/query nội bộ cần phản hồi.
- Kafka: domain event sau commit.
- Redis: cache, session, cart, KDS runtime projection và Pub/Sub nội bộ.
- Webhook: SePay/VietQR gọi public BFF route, BFF xác thực rồi chuyển vào service sở hữu trạng thái.

**Luận điểm chính:** API snapshot vẫn là nguồn trạng thái chuẩn (source of truth).

### Bố cục / hình ảnh

- Dùng `chapter4-communication-topology.png` làm hình chính hoặc vẽ lại 5 kênh quanh BFF.
- Nếu dùng trực tiếp hình trong báo cáo, chỉ lấy phần trung tâm gồm BFF, các dịch vụ miền và hạ tầng để chữ đủ dễ đọc.
- Dùng legend:
  - Solid arrow: command/query
  - Dashed arrow: event/hint
  - Orange border: external callback

### Logic cần hiểu

Cần nhấn mạnh sự phân tách trách nhiệm giữa giao thức và tính đúng. Giao thức không tự bảo đảm tính đúng; điều đó phụ thuộc service owner và source of truth của từng miền.

### Kịch bản thuyết trình chi tiết

"Trong topology của QRTable, client chỉ giao tiếp với BFF bằng HTTP REST hoặc WebSocket. HTTP REST dùng cho command và query có phản hồi rõ ràng, ví dụ lấy menu, gửi giỏ món, xác nhận đơn hoặc lấy API snapshot của hàng đợi KDS. WebSocket dùng cho cập nhật gần thời gian thực, nhưng chỉ phát hint.

Từ BFF vào nội bộ, các command/query cần kết quả sẽ đi qua TCP hoặc gRPC. BFF gọi Authorizer qua gRPC để xác minh JWT và thiết lập ngữ cảnh người dùng. BFF gọi các domain service bằng TCP khi cần dữ liệu hoặc quyết định nghiệp vụ. Trong các đường này, BFF là lớp biên; trạng thái nghiệp vụ vẫn thuộc service sở hữu trạng thái.

Kafka được dùng cho domain event sau commit. Ví dụ `order.confirmed` cho Kitchen tạo KDS runtime projection, `payment.completed` cho các xử lý liên quan sau khi thanh toán đã commit, hoặc `kitchen.sla_warning` khi KDS cần cảnh báo. Redis hỗ trợ các đường đọc/ghi nhanh như session/cart, menu cache, KDS projection và Pub/Sub nội bộ cho cập nhật gần thời gian thực.

Webhook từ SePay đi vào public route ở BFF, nhưng sau đó vẫn phải được xác thực secret/signature và định tuyến về Payment, là service sở hữu payment record. Mỗi kênh có vai trò riêng; không có kênh nào được dùng để vượt qua quyền sở hữu dịch vụ hoặc thay thế API snapshot. Tuy nhiên, trước khi một yêu cầu được phép đi qua các kênh đó, hệ thống phải thiết lập danh tính hoặc phiên của tác nhân gửi yêu cầu."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-communication-topology.png`
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`

### Không nói quá

- Không nói UI lấy canonical state từ WebSocket payload.

---

## Slide 17. Xác thực và phân quyền qua ranh giới dịch vụ

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Xác thực và phân quyền qua ranh giới dịch vụ

**Dòng phụ:** Keycloak JWT/OIDC cho Staff/Admin · QR session cho Customer

**Sơ đồ chính:**

`Staff/Admin -> Keycloak JWT/OIDC ─┐`

`Customer -> QR session ──────────┴─> BFF -> Ngữ cảnh tin cậy`

`Ngữ cảnh tin cậy: actor · tenant · session`

`Phân quyền: phạm vi -> quyền hành động -> feature entitlement theo gói`

`BFF -> hợp đồng nội bộ -> Domain Services`

**Luận điểm chính:** Client không gọi trực tiếp dịch vụ miền. BFF thiết lập ngữ cảnh tin cậy; phân quyền quyết định yêu cầu nào được đi tiếp qua ranh giới dịch vụ.

### Bố cục / hình ảnh

- Tự vẽ lại diagram rút gọn dựa trên `chapter4-security-auth-flow.png`; không dùng nguyên hình báo cáo.
- Hai đường Staff/Admin và Customer hội tụ vào BFF ở giữa slide.
- Bên dưới BFF đặt một khối "Ngữ cảnh tin cậy" và một dải "Phạm vi -> Quyền -> Feature entitlement theo gói".
- Điểm cuối là nhóm Domain Services; không cần liệt kê toàn bộ service.
- Giữ tối đa 7-8 node lớn để đọc được khi trình chiếu; diagram gốc đặt ở phụ lục hoặc speaker notes.
- Không đưa tên guard, mã quyền hoặc đường dẫn file lên slide chính.

### Logic cần hiểu

Slide này phân biệt hai khái niệm thường bị trộn và đặt chúng vào kiến trúc QRTable. Xác thực tạo ngữ cảnh tin cậy tại lớp biên; phân quyền kiểm tra phạm vi và hành động trước khi yêu cầu đi qua hợp đồng tới dịch vụ miền. Điều này không đồng nghĩa mọi dịch vụ tự xác minh JWT hoặc hệ thống đã triển khai mTLS.

### Kịch bản thuyết trình chi tiết

"Sơ đồ này trình bày xác thực và phân quyền theo đường đi của một yêu cầu qua ranh giới dịch vụ. Xác thực (authentication) xác định người gọi là ai hoặc đang đại diện cho phiên nào. Phân quyền (authorization) được thực hiện sau đó để quyết định yêu cầu được phép thực hiện hành động gì và trên phạm vi dữ liệu nào.

QRTable có hai đường xác thực chính ở phía trái sơ đồ. Nhân viên và quản trị viên đăng nhập qua Keycloak và sử dụng JWT/OIDC. Khách hàng tại bàn không cần tài khoản Keycloak mà đi vào từ mã QR, sau đó mở hoặc nối tiếp phiên phục vụ. Cả hai đường đều hội tụ tại BFF; client không gọi trực tiếp các dịch vụ miền.

Tại lớp biên, BFF kiểm tra danh tính hoặc phiên và thiết lập ngữ cảnh tin cậy gồm tác nhân, tenant và session khi có. Trước khi yêu cầu đi tiếp, phân quyền kiểm tra phạm vi tenant hoặc phiên, quyền thực hiện hành động và feature entitlement theo gói. Ngữ cảnh đã kiểm tra sau đó được chuyển qua hợp đồng nội bộ tới dịch vụ miền; bất biến nghiệp vụ vẫn do dịch vụ sở hữu quyết định.

Ví dụ, chủ nhà hàng đã đăng nhập và có quyền đọc báo cáo vẫn chỉ được đọc dữ liệu của tenant mình; tính năng phân tích cũng phải thuộc gói đang sử dụng. Như vậy, điểm đặc trưng trong kiến trúc này không phải một thuật toán xác thực mới, mà là cách lớp biên thiết lập và chuyển ngữ cảnh tin cậy qua ranh giới dịch vụ. Slide tiếp theo sẽ phân tích các lớp kiểm soát ngăn phạm vi tenant đã xác định bị mất hoặc bị thay đổi sai trong quá trình xử lý."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-security-auth-flow.png`
- `libs/guards/src/lib/user.guard.ts`
- `libs/guards/src/lib/session.guard.ts`
- `libs/guards/src/lib/tenant.guard.ts`
- `docs/architecture/permission-matrix.md`

### Không nói quá

- Không nói customer có RBAC role.
- Không nói mọi dịch vụ tự xác minh JWT hoặc QRTable đã triển khai mTLS/service identity đầy đủ.

---

## Slide 18. Cô lập tenant: duy trì phạm vi dữ liệu xuyên hệ thống

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Cô lập tenant theo chuỗi kiểm soát từ BFF đến dữ liệu

**Dòng phụ:** Phạm vi tenant được ràng buộc tại lớp biên, truyền qua hợp đồng và áp dụng tại mọi điểm sử dụng trạng thái

**Quyết định dữ liệu:** Database theo service · Trong từng database, dữ liệu các tenant dùng chung bảng và được phân biệt bằng `tenant_id`

**Hệ quả thiết kế:** Không có cô lập vật lý; mọi đường xử lý phải áp dụng phạm vi tenant một cách nhất quán

**Bốn điểm kiểm soát đại diện:**

`1. Ràng buộc ngữ cảnh tenant` → JWT claim cho Staff/Admin · QR, bàn và phiên cho Customer

`2. Đối chiếu tại lớp biên` → Thiếu tenant hoặc sai lệch với danh tính/phiên thì từ chối

`3. Tenant context propagation` → TCP request và event mang `tenantId` đã được kiểm tra

`4. Áp dụng tại điểm sử dụng` → Truy vấn, khóa Redis và WebSocket room đều có phạm vi tenant/phiên

**Bất biến trung tâm:** Mọi thao tác đọc, ghi hoặc phát trạng thái phải khớp tenant đã được kiểm tra; chỉ biết mã tài nguyên là chưa đủ.

### Bố cục / hình ảnh

- Dùng một pipeline bốn điểm kiểm soát làm visual chính; mỗi điểm có một icon và một câu mô tả ngắn.
- Đặt "Quyết định dữ liệu" và "Hệ quả thiết kế" trong một callout nhỏ phía trên pipeline; không trình bày ba chiến lược thành bảng so sánh trên slide.
- Trong chuỗi kiểm soát, thêm một nhánh đỏ ngắn: `JWT: tenant A + request: tenant B -> Từ chối` để cơ chế bớt trừu tượng.
- Có thể dùng `chapter4-multi-tenancy-isolation.png` làm cơ sở, nhưng nên vẽ lại thành pipeline ít node; dùng icon danh tính, lá chắn, database/Redis và kênh cập nhật.
- Không liệt kê tên guard hoặc file code trên slide chính; chi tiết này để trong speaker notes hoặc phụ lục.

### Logic cần hiểu

Cô lập tenant không trùng với phân quyền. Phân quyền quyết định tác nhân được làm gì; cô lập tenant giới hạn dữ liệu và trạng thái mà thao tác được phép tác động. Lựa chọn dùng chung bảng với cột phân biệt `tenant_id` làm cho việc cô lập phụ thuộc vào một chuỗi kiểm soát ở tầng ứng dụng. Bốn điểm trên là cách tóm tắt đường thực thi đại diện từ lớp biên đến nơi sử dụng trạng thái, không phải tuyên bố đã liệt kê mọi biện pháp bảo mật của hệ thống.

### Kịch bản thuyết trình chi tiết

"Slide trước đã xác định tenant là một phần của ngữ cảnh tin cậy. Trong SaaS, ba phương án thường gặp là dùng chung bảng với cột phân biệt tenant, schema riêng hoặc database riêng cho từng tenant. QRTable dùng database theo service; bên trong mỗi database, các tenant dùng chung bảng và được phân biệt bằng `tenant_id`. Cách này đơn giản hóa vận hành và migration nhưng không cô lập vật lý.

Vì vậy, `tenant_id` phải đi cùng chuỗi kiểm soát. Điểm thứ nhất là ràng buộc ngữ cảnh tenant. Với nhân viên, tenant trong yêu cầu được đối chiếu với claim JWT. Với khách, QR token được kiểm tra cùng bàn trong phạm vi tenant, còn phiên giữ quan hệ tenant--bàn. Điểm thứ hai nằm tại BFF: yêu cầu thiếu tenant hoặc sai lệch với danh tính/phiên bị từ chối.

Điểm thứ ba là tenant context propagation qua hợp đồng nội bộ. TCP request và event mang `tenantId` để dịch vụ nhận biết phạm vi xử lý. Điểm thứ tư là áp dụng phạm vi tại nơi sử dụng trạng thái: repository truy vấn theo mã tài nguyên và tenant; Redis key chứa tenant; kết nối thời gian thực chỉ tham gia WebSocket room sau khi JWT hoặc phiên được kiểm tra.

Ví dụ, JWT thuộc tenant A nhưng yêu cầu chỉ định tenant B phải dừng tại lớp biên. Ngay cả khi đoán đúng mã món hoặc mã đơn của tenant B, truy vấn vẫn phải khớp tenant A nên không được trả về bản ghi đó. Bất biến cần giữ là mọi thao tác đọc, ghi hoặc phát trạng thái phải khớp tenant đã được kiểm tra. Các guard, repository và namespace Redis/WebSocket đã có kiểm thử đại diện, nhưng chưa đủ để tuyên bố toàn bộ API đã được kiểm chứng tuyệt đối. Slide tiếp theo chuyển sang tính nhất quán giữa nhiều dịch vụ."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-multi-tenancy-isolation.png`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `libs/middlewares/src/lib/tenant.middleware.ts`
- `libs/guards/src/lib/tenant.guard.ts`
- `libs/utils/src/lib/request.util.ts`
- `apps/catalog/src/app/modules/menu-item/repositories/menu-item.repository.ts`
- `libs/constants/src/lib/redis-key.constants.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`

### Không nói quá

- Không nói database-per-tenant. Hiện tại là DB theo service + `tenant_id`.
- Không nói QR token tự suy ra tenant. Tenant đến từ ngữ cảnh request; QR token xác nhận bàn trong đúng phạm vi tenant, sau đó phiên tiếp tục giữ ràng buộc đó.
- Không nói repository có global query filter hoặc PostgreSQL Row-Level Security. Code hiện tại truyền `tenantId` và lọc tường minh trong các repository đại diện.
- Không nói mọi request đều bắt buộc có tenant; các route loại trừ và Super Admin là ngoại lệ có kiểm soát.
- Không khẳng định toàn bộ bề mặt API đã được kiểm chứng chống truy cập chéo tenant; hiện có chuỗi kiểm soát và kiểm thử đại diện.

---

## Slide 19. Ranh giới giao dịch cục bộ làm phát sinh bài toán nhất quán liên dịch vụ

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Ranh giới giao dịch cục bộ làm phát sinh bài toán nhất quán liên dịch vụ

**Một giao dịch cục bộ**

`Một dịch vụ · Một cơ sở dữ liệu`

- Cùng ghi nhận hoặc cùng hoàn tác các thay đổi.
- ACID bảo vệ giao dịch cục bộ.

**Nhiều giao dịch cục bộ**

`Nhiều dịch vụ · Nhiều cơ sở dữ liệu`

- Mỗi dịch vụ ghi nhận thay đổi riêng.
- Có thể xảy ra lỗi từng phần hoặc xử lý lặp.
- Trạng thái giữa các dịch vụ có thể tạm thời chưa đồng bộ.

**Ba cấu phần hỗ trợ tính nhất quán:**

- **Idempotency — thuộc tính hành vi:** thực hiện lại cùng một thao tác không tạo thêm kết quả nghiệp vụ ngoài ý muốn.
- **Transactional outbox — mẫu thiết kế:** trạng thái nghiệp vụ và ý định phát event được ghi trong cùng giao dịch cục bộ.
- **Deduplication — kỹ thuật phía nhận:** nhận diện và bỏ qua message đã được xử lý thành công.

**Luận điểm chính:** ACID bảo vệ giao dịch trong từng dịch vụ; tính đúng của toàn luồng cần cơ chế phối hợp liên dịch vụ.

### Bố cục / hình ảnh

- Dùng hai cột đối chiếu: "Một giao dịch cục bộ" và "Nhiều giao dịch cục bộ".
- Bên dưới tiêu đề cột, dùng nhãn nhỏ "một dịch vụ / một cơ sở dữ liệu" và "nhiều dịch vụ / nhiều cơ sở dữ liệu"; không đưa chú thích dài vào tiêu đề.
- Giữa hai cột đặt mũi tên "tách dịch vụ -> nhiều giao dịch riêng".
- Bên dưới đặt ba cấu phần thành ba thẻ giải thích: idempotency, transactional outbox và deduplication.
- Có thể dùng phần outbox của `chapter2-outbox-saga-overview.png` làm hình lý thuyết nhỏ; chưa đưa nhánh bù trừ vào slide này.
- Không đưa phần ánh xạ Cart/Order/KDS/Payment vào đây; phần áp dụng nằm ở slide 20.

### Logic cần hiểu

Đây là slide cầu nối lý thuyết. Kiến trúc nguyên khối hoặc một dịch vụ dùng một cơ sở dữ liệu thường có thể gom nghiệp vụ vào một giao dịch cục bộ, nhưng kiến trúc triển khai không tự động bảo đảm ACID; ứng dụng vẫn phải dùng giao dịch và ràng buộc dữ liệu đúng cách. Trong QRTable, mỗi dịch vụ vẫn có ACID cục bộ, còn luồng xuyên dịch vụ cần cơ chế phối hợp để các trạng thái được cập nhật dần về trạng thái nhất quán. Chữ "nhất quán" trong ACID nói về việc giữ bất biến trong một giao dịch cục bộ; không đồng nhất với tính nhất quán cuối cùng giữa nhiều dịch vụ. Chưa giới thiệu Saga ở đây vì Slide 20 sẽ chỉ ra giới hạn của ba cấu phần trước khi Slide 21 giải thích Saga orchestration và compensation.

### Kịch bản thuyết trình chi tiết

"Sau khi bảo vệ phạm vi tenant, vấn đề tiếp theo là giữ trạng thái đúng khi nghiệp vụ đi qua nhiều dịch vụ. Khi nghiệp vụ nằm trong một dịch vụ và một cơ sở dữ liệu, các thay đổi liên quan thường có thể được đặt trong cùng giao dịch cục bộ. ACID gồm tính nguyên tử, nhất quán, cô lập và bền vững; trong phạm vi đó, các thay đổi có thể cùng được ghi nhận hoặc cùng bị hoàn tác. Tuy nhiên, kiến trúc nguyên khối hay một dịch vụ duy nhất không tự động tạo ra ACID; ứng dụng vẫn phải sử dụng giao dịch, ràng buộc và mức cô lập phù hợp.

Trong kiến trúc vi dịch vụ, ACID không biến mất. Order, Catalog và Payment vẫn có thể bảo vệ giao dịch trên dữ liệu mình sở hữu. Điểm khó là một nghiệp vụ xuyên dịch vụ gồm nhiều giao dịch cục bộ, không có một giao dịch chung để toàn bộ luồng cùng thành công hoặc cùng được hoàn tác. Catalog có thể đã trừ tồn kho khi Order chưa xác nhận đơn; hoặc Payment đã ghi nhận giao dịch khi bước cập nhật hóa đơn chưa hoàn tất. Lỗi mạng còn có thể làm cùng một yêu cầu hoặc sự kiện được gửi lại. Vì các dịch vụ cập nhật ở thời điểm khác nhau, trạng thái có thể tạm thời chưa đồng bộ; hệ thống phải phối hợp để đạt tính nhất quán cuối cùng. Đây là khái niệm khác với tính nhất quán bên trong một giao dịch ACID.

Ba cấu phần hỗ trợ xử lý những rủi ro đầu tiên. Idempotency là thuộc tính hành vi: thực hiện lại cùng một thao tác không tạo thêm kết quả nghiệp vụ ngoài ý muốn, chẳng hạn không sinh thêm đơn hàng hoặc thanh toán. Transactional outbox là mẫu thiết kế ghi trạng thái nghiệp vụ và ý định phát event trong cùng giao dịch cục bộ, tránh trường hợp dữ liệu đã thay đổi nhưng event cần phát bị mất. Ở phía nhận, deduplication dùng message identifier hoặc processing key để nhận biết command, webhook hay event đã được xử lý thành công và bỏ qua lần lặp lại.

Ba cấu phần này không biến nhiều cơ sở dữ liệu thành một giao dịch ACID chung và cũng chưa tự xử lý mọi lỗi từng phần (partial failure). Chúng giúp mỗi dịch vụ bảo vệ bất biến cục bộ, kiểm soát thao tác gửi lại và giảm khoảng trống giữa thay đổi trạng thái với phát event. Slide tiếp theo sẽ ánh xạ chúng vào giỏ món, gửi đơn, KDS và thanh toán, sau đó chỉ ra giới hạn còn lại khi một service đã tạo tác dụng phụ nhưng bước tiếp theo thất bại."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter2-outbox-saga-overview.png`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `apps/order/src/app/modules/order/services/order-submit.service.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`

### Không nói quá

- Không nói hệ thống bảo đảm phân phối exactly-once.
- Không nói kiến trúc nguyên khối tự động bảo đảm ACID hoặc mọi hệ thống nguyên khối chỉ dùng một cơ sở dữ liệu.
- Không nói vi dịch vụ không có ACID; mỗi dịch vụ vẫn có thể bảo vệ ACID trong giao dịch cục bộ.
- Không đồng nhất chữ "nhất quán" trong ACID với tính nhất quán cuối cùng giữa các dịch vụ.

---

## Slide 20. Giải pháp nhất quán dữ liệu của QRTable và giới hạn kiểm soát liên dịch vụ

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Giải pháp nhất quán dữ liệu của QRTable và giới hạn kiểm soát liên dịch vụ

| Luồng              | Rủi ro                                                 | Giải pháp áp dụng & Giới hạn kiểm soát                                                                 |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Giỏ món dùng chung | Cập nhật trên phiên bản đã cũ                          | `cartVersion` hỗ trợ kiểm soát truy cập đồng thời lạc quan (optimistic concurrency control)            |
| Gửi đơn            | Tạo lặp đơn hàng hoặc hóa đơn                          | Khóa lũy đẳng (Idempotency key) nhận diện cùng một lần gửi                                             |
| KDS                | Xử lý lại cùng một event hoặc command                  | Khử trùng lặp (Deduplication) ngăn tạo phiếu hoặc cập nhật lặp                                         |
| Thanh toán         | Ghi nhận thanh toán nhiều lần                          | Khóa cấp dòng (Row-level locking), kiểm tra trạng thái và Outbox giao dịch (Transactional Outbox)      |
| Xác nhận đơn       | Mất phản hồi sau Catalog commit; Order commit thất bại | Giữ chỗ bền vững (Persistent reservation) chống trừ lặp; lỗi cục bộ (Partial failure) vẫn cần phối hợp |

### Bố cục / hình ảnh

- Bảng 3 cột như trên.
- Có thể dùng nhãn mức bằng chứng A/B/C:
  - KDS: A/B
  - Payment bridge: B/conditional
- Làm nổi dòng "Xác nhận đơn" bằng màu nhấn và nhãn "Điểm gãy liên dịch vụ" để dẫn sang slide 21; chưa ghi tên Saga trên slide này.
- Có thể đặt chú thích nhỏ dưới bảng: "Persistent reservation ngăn trừ kho lặp khi retry; cơ chế này không tự hoàn lại tác dụng phụ nếu bước tiếp theo thất bại."

### Logic cần hiểu

Slide này ánh xạ các khái niệm của slide 19 vào giải pháp cụ thể trong QRTable. Bốn dòng đầu cho thấy rủi ro và biện pháp kiểm soát tương ứng. Ở luồng xác nhận đơn, persistent reservation đã kiểm soát retry qua ranh giới Order--Catalog: cùng reservation và payload trả lại kết quả đã lưu thay vì trừ kho lần hai. Điểm gãy còn lại xuất hiện khi Catalog đã tạo tác dụng phụ nhưng Order không hoàn tất giao dịch của mình; khi đó tính lũy đẳng không tự hoàn lại tồn kho và hệ thống cần cơ chế phối hợp liên dịch vụ.

### Kịch bản thuyết trình chi tiết

"Các cấu phần ở slide trước được áp dụng theo rủi ro của từng luồng QRTable. Với giỏ món dùng chung, `cartVersion` hỗ trợ optimistic concurrency control bằng cách phát hiện khi một khách gửi thay đổi dựa trên phiên bản giỏ không còn mới nhất. Đây là kiểm soát xung đột cập nhật, không phải cơ chế phát event giữa các service.

Với gửi đơn, idempotency key giúp Order nhận biết cùng một lần gửi đã được xử lý, từ đó tránh tạo thêm đơn hàng hoặc hóa đơn. Với KDS, Kitchen có thể nhận lại cùng một event hoặc command; deduplication giúp tránh tạo phiếu hoặc thực hiện thao tác lần thứ hai. Hai trường hợp này minh họa sự khác nhau giữa idempotency ở phía nhận request và deduplication ở phía consumer.

Với Payment, rủi ro là tiền mặt hoặc webhook được ghi nhận nhiều lần cho cùng một hóa đơn. Service dùng row-level locking, kiểm tra trạng thái hiện tại và ghi outbox `payment.completed` trong giao dịch hoàn tất thanh toán. Như vậy, tính đúng của thanh toán là một trường hợp áp dụng các biện pháp kiểm soát tính nhất quán và thao tác lặp, không phải một cơ chế kiến trúc tách biệt.

Với xác nhận đơn, Catalog lưu persistent reservation trong cùng giao dịch cục bộ với thay đổi tồn kho. Nếu Catalog đã commit nhưng phản hồi TCP bị mất, caller gửi lại cùng key và payload; Catalog trả kết quả đã lưu mà không trừ kho lần hai. Cơ chế này bảo vệ thao tác retry, nhưng không tự xử lý trường hợp Catalog đã xác nhận trừ kho còn Order thất bại trước khi commit trạng thái đơn. Đây là partial failure: một phần nghiệp vụ đã thành công trong khi phần tiếp theo không hoàn tất. Slide tiếp theo sẽ so sánh hai cách phối hợp Saga và giải thích vì sao QRTable lựa chọn orchestration để xử lý điểm gãy này."

### Nguồn / bằng chứng

- `docs/testing/phase-5/traceability-matrix.md`
- `apps/order/src/app/modules/order/services/cart.service.ts`
- `apps/order/src/app/modules/order/services/order-submit.service.ts`
- `apps/order/src/app/modules/order/tests/order-submit-cart.integration.spec.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- `apps/payment/src/app/modules/payment/tests/payment-completed-order-bridge.integration.spec.ts`
- `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`
- `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`

### Không nói quá

- Không nói mọi luồng đều có cùng mức bằng chứng end-to-end.
- Không nói reservation tự phục hồi nếu caller không retry.

---

## Slide 21. QRTable lựa chọn Điều phối Saga (Saga Orchestration): kiểm soát trình tự và bù trừ (Compensation)

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** QRTable lựa chọn Điều phối Saga (Saga Orchestration): kiểm soát trình tự và bù trừ (Compensation)

**Câu hỏi từ slide trước:** Nếu Catalog đã trừ tồn kho nhưng Order thất bại, hệ thống xử lý phần tồn kho đã thay đổi như thế nào?

**Khái niệm:** Saga phối hợp một nghiệp vụ qua nhiều giao dịch cục bộ; bù trừ (compensation) xử lý tác dụng phụ đã commit khi bước sau thất bại.

| Cách phối hợp                           | Cách hoạt động                                                                            | Đánh đổi                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Choreography (Phối hợp phân tán)**    | Các service phản ứng với event và phát event cho bước tiếp theo                           | Không cần orchestrator trung tâm, nhưng luồng và compensation bị phân tán |
| **Orchestration (Điều phối trung tâm)** | Một bộ điều phối (orchestrator) quyết định trình tự gọi service và thời điểm compensation | Luồng rõ ràng hơn, nhưng trách nhiệm phối hợp tập trung tại orchestrator  |

**Quyết định của QRTable:** Xác nhận đơn (Order Confirm) dùng điều phối trung tâm (Orchestration), với **Order là bộ điều phối (Orchestrator)**.

**Cơ sở lựa chọn:** Trình tự Order–Catalog có phụ thuộc rõ ràng · POS cần kết quả tồn kho ngay · Compensation phải được kích hoạt tại đúng điểm lỗi.

### Bố cục / hình ảnh

- Trên: một câu định nghĩa Saga và compensation.
- Giữa: hai thẻ hoặc bảng đối chiếu choreography với orchestration; mỗi bên chỉ giữ một câu vận hành và một câu đánh đổi.
- Dưới: dải quyết định làm nổi "Order là orchestrator" cùng ba cơ sở lựa chọn.
- Có thể dùng `chapter2-outbox-saga-overview.png` làm visual lý thuyết nhỏ; sequence cụ thể dành cho slide 22.

### Logic cần hiểu

Đây là lần đầu deck giới thiệu Saga và hai cách phối hợp phổ biến. Không trình bày choreography như phương án kém hơn trong mọi trường hợp; điểm cần chứng minh là orchestration phù hợp hơn với Order Confirm vì có trình tự phụ thuộc, cần phản hồi tồn kho tức thời và có điểm kích hoạt compensation rõ ràng. Kitchen không tham gia compensation tồn kho: Kitchen chỉ tiêu thụ `order.confirmed` sau khi Order commit thành công.

### Kịch bản thuyết trình chi tiết

"Slide trước đã chỉ ra partial failure: Catalog đã commit trừ tồn kho trong khi Order chưa commit trạng thái đơn. Vì mỗi service chỉ xác nhận dữ liệu mình sở hữu, hệ thống không thể rollback toàn bộ luồng bằng một giao dịch cơ sở dữ liệu chung. Saga phối hợp nghiệp vụ này thành nhiều giao dịch cục bộ; nếu bước sau thất bại sau khi bước trước đã tạo tác dụng phụ, compensation được dùng để xử lý tác dụng phụ đó.

Saga có hai cách phối hợp phổ biến. Với choreography, không có orchestrator trung tâm; mỗi service phản ứng với event rồi phát event cho bước tiếp theo. Cách này phân tán phản ứng, nhưng trình tự và compensation nằm rải rác qua nhiều consumer. Với orchestration, một orchestrator quyết định service nào được gọi tiếp theo và khi nào cần compensation. Luồng rõ ràng hơn, đổi lại orchestrator chịu thêm trách nhiệm phối hợp.

QRTable lựa chọn orchestration cho Order Confirm Saga và Order giữ vai trò orchestrator. Luồng này có thứ tự phụ thuộc rõ ràng: Order kiểm tra trạng thái đơn và hóa đơn, Catalog xử lý tồn kho, sau đó Order mới commit trạng thái cùng outbox. POS cũng cần biết ngay tồn kho có được xử lý thành công hay không. Catalog trả về `reservationVersion`, nhờ đó nếu Catalog đã trừ tồn kho nhưng Order commit thất bại, Order có thể yêu cầu hoàn đúng phiên bản reservation bằng compensation với idempotency key riêng.

Lựa chọn này không có nghĩa choreography luôn kém phù hợp hoặc toàn bộ chuỗi đều được điều phối đồng bộ. Kitchen không tham gia nhánh compensation tồn kho; Kitchen chỉ tiêu thụ `order.confirmed` sau khi Order commit thành công. Như vậy, orchestration được dùng cho phần cần quyết định và compensation, còn event-driven propagation được dùng cho xử lý sau commit. Slide tiếp theo sẽ cụ thể hóa quyết định này bằng luồng thành công của Order Confirm Saga."

### Nguồn / bằng chứng

- `docs/testing/phase-5/saga-validation-strategy.md`
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`

### Không nói quá

- Không nói mọi giao dịch phân tán đều là Saga.
- Không nói choreography luôn kém hơn orchestration.
- Không nói Kitchen tham gia compensation tồn kho.

---

## Slide 22. Order Confirm Saga: bảo vệ bất biến tồn kho tại mốc xác nhận đơn

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Order Confirm Saga: bảo vệ bất biến tồn kho tại mốc xác nhận đơn

**Luồng thành công:**

1. Nhân viên/POS gửi yêu cầu xác nhận đơn đang chờ.
2. BFF xác minh JWT, tenant và quyền hạn.
3. Order khóa đơn hàng (lock order) theo tenant.
4. Nếu đơn hàng đã ở trạng thái đang xử lý (PROCESSING), yêu cầu gửi lại sẽ trả về trạng thái hiện tại, không trừ lại tồn kho.
5. Nếu đơn hàng đang chờ (PENDING) và hóa đơn mở (OPEN), Order gọi Catalog với khóa `confirm-order:{orderId}`.
6. Catalog ghi nhận giữ chỗ (reservation) và thay đổi tồn kho trong cùng giao dịch (transaction); trả về APPLIED hoặc REPLAYED kèm phiên bản giữ chỗ (reservationVersion).
7. Order lưu phiên bản (version), cập nhật trạng thái đơn hàng/món ăn sang đang xử lý (PROCESSING) và ghi Outbox event `order.confirmed` trong cùng một giao dịch (transaction).
8. Kitchen chỉ tạo ticket KDS sau khi sự kiện `order.confirmed` được commit.

**Bất biến:** Cùng một active reservation không trừ kho hai lần; Catalog là chủ sở hữu tồn kho; KDS không xử lý trước khi Order commit thành công.

### Bố cục / hình ảnh

- Dùng `chapter5-order-confirm-stock-slide22.pdf` làm visual chính trên slide.
- Giữ `chapter5-order-confirm-stock.pdf` làm sequence triển khai chi tiết cho khóa luận, appendix hoặc phần chuẩn bị trả lời hội đồng; không thu nhỏ toàn bộ hình này vào main slide.
- Trên main slide nên vẽ 5 lane:
  - Staff/POS
  - BFF auth guards
  - Order
  - Catalog
  - Outbox/Kafka/Kitchen
- Highlight 3 điểm:
  - lock order
  - persistent reservation + `APPLIED/REPLAYED` + version
  - outbox `order.confirmed`

### Logic cần hiểu

Slide này cụ thể hóa quyết định orchestration ở slide 21 bằng luồng thành công và hai lớp idempotency. Nếu Order đã `PROCESSING`, Order trả trạng thái hiện tại. Nếu Order còn `PENDING` do phản hồi Catalog trước đó bị mất, Catalog replay persistent reservation và trả lại version đã lưu. Kitchen chỉ phản ứng với event sau khi Order commit thành công.

### Kịch bản thuyết trình chi tiết

"Sau khi xác định Order là orchestrator, slide này cụ thể hóa luồng xác nhận đơn bằng một sequence đã được rút gọn để có thể đọc trên màn hình trình chiếu. Cần lưu ý cách đọc ba lane đã gộp. Lane Order đại diện cho Order service cùng giao dịch trên Order DB. Lane Catalog đại diện cho Catalog service, Catalog DB và bản ghi `stock_reservations`. Lane cuối cùng gộp outbox relay, Kafka và Kitchen. Đây chỉ là phép rút gọn về mặt trình bày; Order và Catalog vẫn sở hữu cơ sở dữ liệu riêng, còn outbox, Kafka và Kitchen vẫn là các bước thực thi tách biệt.

(Các chú thích `Hình: ...` dưới đây chỉ dùng để bám theo sequence diagram, không đọc thành lời.)

(Hình: bước 1–4) Luồng bắt đầu khi nhân viên xác nhận một đơn đang chờ trên POS. Request đi qua guard chain ở BFF để kiểm tra JWT, tenant và quyền thao tác, sau đó mới được chuyển vào Order. Phía sau lane Order, service mở giao dịch cục bộ, khóa dòng order trong phạm vi tenant, đồng thời kiểm tra trạng thái order, bill và các order item liên quan. Khóa này giúp hai thao tác confirm đồng thời không cùng tiến hành trên một trạng thái cũ.

(Hình: nhánh bước 5–6) Nếu order đã ở `PROCESSING`, Order trả lại trạng thái hiện tại qua BFF về POS, không gọi Catalog và không ghi thêm outbox. Đây là lớp replay thứ nhất, được xử lý ngay tại Order.

(Hình: bước 7–8) Nếu order đang `PENDING` và bill đang `OPEN`, Order gửi yêu cầu xử lý tồn kho sang Catalog bằng reservation key ổn định cùng payload món và số lượng. Order không cập nhật trực tiếp tồn kho vì Catalog là service sở hữu dữ liệu này. Phía sau lane Catalog là một giao dịch cục bộ độc lập với giao dịch của Order. Trong giao dịch đó, Catalog khóa bản ghi reservation và các dòng tồn kho cần thiết; việc chuyển trạng thái reservation và thay đổi tồn kho được commit hoặc rollback cùng nhau.

(Hình: nhánh `APPLIED` bước 9–10; nhánh `REPLAYED` bước 11–12) Với reservation mới, hoặc reservation trước đó đã được release và nay được xác nhận lại, Catalog áp dụng thay đổi tồn kho, lưu version mới và trả `APPLIED` kèm `reservationVersion`. Nếu cùng active reservation được gửi lại với cùng key và cùng payload, Catalog đọc kết quả đã lưu rồi trả `REPLAYED` kèm version hiện có, không trừ kho lần thứ hai. Hai nhãn `APPLIED` và `REPLAYED` chỉ mô tả kết quả của thao tác tồn kho tại Catalog; chúng chưa đồng nghĩa toàn bộ Saga đã hoàn tất. Các trường hợp key hoặc payload xung đột, item không hợp lệ hay thiếu tồn kho được lược khỏi hình rút gọn; trong các trường hợp đó Catalog trả lỗi và Order không chuyển đơn sang `PROCESSING`.

(Hình: bước 13) Khi nhận được `reservationVersion`, Order tiếp tục giao dịch cục bộ của mình: lưu version vào order, chuyển order và các item sang `PROCESSING`, đồng thời ghi outbox `order.confirmed`. Các thay đổi này nằm trong cùng một giao dịch Order DB, nên không có trường hợp trạng thái đơn đã commit nhưng bản ghi outbox tương ứng lại không được tạo. Version được lưu để các thao tác về sau, như bù trừ (compensation) hoặc hủy đơn đang xử lý, có thể tham chiếu đúng reservation đã tạo ra lần trừ kho này.

(Hình: bước 14–17) Order trả kết quả xác nhận thành công qua BFF về POS. Phản hồi này cho biết phần quyết định đồng bộ của Order Confirm đã hoàn tất; POS không phải chờ Kitchen tạo phiếu xong. Lane Outbox/Kafka/Kitchen ở cuối hình đang gộp ba thành phần bất đồng bộ. Sau khi giao dịch Order commit, outbox relay đọc bản ghi `PENDING` và phát `order.confirmed` qua Kafka; Kitchen tiêu thụ sự kiện rồi mới tạo KDS ticket. Vì vậy, KDS không thể đi trước điểm commit của Order.

(Hình: ghi chú cuối, không đánh số) Ghi chú cuối hình nêu hai tình huống cần nối sang phần sau. Nếu Catalog đã commit nhưng phản hồi TCP bị mất, giao dịch Order không hoàn tất và order vẫn ở `PENDING`; khi caller gửi lại cùng key và payload, Catalog trả `REPLAYED`, sau đó Order có thể tiếp tục commit mà tồn kho không bị trừ thêm. Nếu Catalog đã trả `APPLIED` nhưng Order thất bại khi ghi trạng thái hoặc outbox, hệ thống phải bù trừ (compensation) đúng `reservationVersion`. Hình rút gọn chỉ đánh dấu hai điểm này để giữ mạch chính; Slide 23 sẽ phân tích riêng các nhánh lỗi, `REPLAYED`, `STALE` và giới hạn phục hồi."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-order-confirm-stock-slide22.pdf`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-order-confirm-stock.pdf` (bản chi tiết cho appendix/đối chiếu)
- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- `apps/order/src/app/modules/order/services/catalog-stock-gateway.service.ts`
- `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`
- `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`
- `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`
- `apps/catalog/src/app/modules/menu-item/tests/stock-reservation.service.spec.ts`
- `libs/entities/src/lib/stock-reservation.entity.ts`
- `libs/constants/src/lib/kafka-topic.constants.ts`

### Không nói quá

- Không nói Kafka hoặc outbox đảm bảo exactly-once end-to-end.

---

## Slide 23. Cơ chế xử lý nhánh lỗi và giao dịch bù trừ Saga

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Cơ chế xử lý nhánh lỗi và giao dịch bù trừ Saga

| Kịch bản lỗi                                        | Quy trình xử lý ngoại lệ                            | Trạng thái / Cơ chế kiểm soát            |
| :-------------------------------------------------- | :-------------------------------------------------- | :--------------------------------------- |
| Hóa đơn hoặc đơn hàng không hợp lệ                  | Từ chối trước khi gọi Catalog                       | Không phát sinh tác dụng phụ             |
| Lỗi nghiệp vụ từ Catalog                            | Không lưu đơn hàng, không hoàn tồn kho              | Rollback giao dịch cục bộ                |
| Catalog trừ kho thành công, Order lỗi commit/outbox | Gọi Catalog bù trừ (compensation) để hoàn tồn kho   | Hoàn trả tồn kho (Compensate)            |
| Hoàn tồn kho thất bại                               | Ghi log lỗi compensation, giữ nguyên lỗi gốc        | Ghi nhận log lỗi & Rollback              |
| Mất phản hồi TCP từ Catalog, client gửi lại (Retry) | Trả `REPLAYED`; tồn kho chỉ giảm một lần            | Xử lý lũy đẳng (Idempotent Deduct)       |
| Yêu cầu bù trừ bị lặp hoặc trễ hạn                  | Cùng version trả `REPLAYED`; version cũ trả `STALE` | Từ chối yêu cầu lỗi thời (Stale Release) |

**Kết luận:** Tiến trình xác nhận đơn đạt tính lũy đẳng đầu-cuối (_End-to-end Idempotency_) cho thao tác kho trong phạm vi nghiên cứu.

**Phạm vi kiểm chứng:** Kiểm thử đơn vị & hợp đồng (_Unit/Contract_) xác minh nhánh bù trừ khi lưu trữ đơn hàng thất bại. Kiểm thử tích hợp (_Integration/Fault Injection_) kiểm chứng khả năng tự hồi phục khi mất phản hồi truyền tải (_Lost-response_) và quản lý phiên bản trừ kho (_Versioned Release_).

### Bố cục / hình ảnh

- Dùng bảng như trên.
- Bên phải vẽ branch nhỏ:
  - Catalog trừ kho [Thành công] ──► Order commit [Thất bại] ──► Gọi hoàn tồn kho (Compensation)
- Có thể đặt thumbnail `appendix-d-01-order-saga-tests.png` ở góc dưới nếu muốn có hình minh họa bằng chứng kiểm thử.

### Logic cần hiểu

Phân tích nhánh lỗi cho thấy Saga không chỉ được hiểu ở luồng thành công; điểm chính là xác định phản ứng của hệ thống tại từng điểm lỗi ngoại lệ.

### Kịch bản thuyết trình chi tiết

"Kính thưa Hội đồng, luồng xử lý thành công chưa phản ánh hết độ phức tạp của kiến trúc Microservices; giá trị thực sự của cơ chế Saga nằm ở cách QRTable kiểm soát các nhánh lỗi ngoại lệ để bảo vệ tính nhất quán của dữ liệu kho. Dựa trên sơ đồ và bảng phân tích trên slide, hệ thống của chúng em xử lý 3 kịch bản lỗi chính như sau:

**Thứ nhất là nhóm lỗi xác thực sớm (Early Validation):**
Trước khi thực hiện bất kỳ kết nối mạng nào tới Catalog Service, Order Service sẽ mở một Database Transaction cục bộ, kiểm tra xem đơn hàng có ở trạng thái `PENDING` hay không, hóa đơn tương ứng có đang `OPEN` hay không. Nếu có bất kỳ vi phạm nào, luồng sẽ bị từ chối ngay lập tức. Vì Catalog chưa từng được gọi, hệ thống hoàn toàn không phát sinh tác dụng phụ và không cần thực hiện bù trừ.

**Thứ hai là kịch bản lỗi nghiệp vụ từ Catalog:**
Khi Order gọi yêu cầu trừ kho (`deductForOrder`), nếu Catalog trả về lỗi nghiệp vụ—ví dụ như món ăn đã hết hàng—Order Service sẽ lập tức rollback transaction cục bộ. Trạng thái đơn hàng không bị thay đổi và chúng em cũng không cần chạy giao dịch bù trừ vì phía Catalog chưa ghi nhận việc trừ kho thành công.

**Thứ ba và quan trọng nhất, là kịch bản lỗi cam kết cục bộ (Local Commit Failure):**
Đây là trường hợp Catalog đã trừ kho thành công và trả về một phiên bản giữ chỗ (`reservationVersion`), nhưng Order Service lại gặp lỗi khi lưu trạng thái hoặc ghi Outbox Event (ví dụ: DB bị nghẽn mạng hoặc lỗi ổ đĩa). Lúc này, để giải quyết tác dụng phụ đã xảy ra ở Catalog, Order Service sẽ kích hoạt cơ chế bù trừ: gọi API `releaseForOrder` kèm theo đúng `reservationVersion` để Catalog hoàn lại tồn kho. Nếu quá trình bù trừ này cũng thất bại, hệ thống sẽ ưu tiên ghi log lỗi compensation để giám sát viên can thiệp, nhưng vẫn ném ra lỗi gốc ban đầu để đảm bảo tính toàn vẹn của nghiệp vụ.

**Về cơ chế kiểm soát lũy đẳng và phiên bản (Idempotency & Versioning):**
Để duy trì tính nhất quán cuối cùng giữa ranh giới giao tiếp, hệ thống áp dụng cơ chế xác minh khóa lũy đẳng (Idempotency Key) ổn định ở cả hai đầu dịch vụ. Khi client thực hiện gửi lại yêu cầu (retry) do mất phản hồi mạng, Catalog nhận diện khóa trùng lặp và trả về trạng thái `REPLAYED` mà không trừ kho lần hai. Ở chiều ngược lại, cơ chế bù trừ (compensation) luôn đi kèm với mã phiên bản `reservationVersion`. Nếu yêu cầu giải phóng kho bị trễ hạn hoặc gửi lặp, Catalog so khớp phiên bản và sẽ từ chối bằng trạng thái `STALE` nếu phiên bản đã cũ, ngăn chặn xung đột dữ liệu tồn kho do thứ tự gói tin đến bị đảo lộn."

### Nguồn / bằng chứng

- `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`
- `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`
- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- `docs/testing/phase-5/saga-validation-strategy.md`
- `docs/testing/phase-5/traceability-matrix.md`
- `docs/graduation-thesis-resources/thesis-report/assets/screenshots/appendix-d-01-order-saga-tests.png`

### Không nói quá

- Không nói Saga đã được củng cố ở mức vận hành production.
- Không nói durable saga state/retry worker/CDC đã có.
- Không nói TCP/Kafka có exactly-once hoặc reservation tự phục hồi khi không có caller retry.

### Cẩm nang phản biện (Q&A Defense)

- **Q1: Tại sao Catalog lại cần trả về `reservationVersion`? Tại sao không chỉ dùng `orderId` để release tồn kho?**
  - **A1:** Nếu chỉ dùng `orderId`, hệ thống dễ gặp lỗi race condition nếu có nhiều luồng trừ kho/bù trừ song song hoặc lặp lại. Nếu yêu cầu giải phóng kho (release) của lần 1 bị trễ mạng và đến Catalog sau khi lần 2 đã trừ kho thành công, Catalog sẽ giải phóng nhầm tồn kho của lần 2. Do đó, việc so khớp đúng `reservationVersion` giúp Catalog từ chối các yêu cầu giải phóng kho lỗi thời bằng trạng thái `STALE`.
- **Q2: Giao dịch bù trừ (Saga Compensation) có đảm bảo thành công 100% không? Nếu bù trừ cũng bị lỗi (như Catalog bị sập) thì xử lý thế nào?**
  - **A2:** Trong hệ thống phân tán, không có cơ chế nào đảm bảo bù trừ thành công 100%. QRTable giải quyết bằng cách: Nếu gọi `releaseForOrder` thất bại, hàm `compensateStock` sẽ bắt lỗi này, ghi nhận vào log hệ thống để giám sát viên can thiệp thủ công hoặc qua các tool monitor. Đồng thời, transaction của Order vẫn rollback và ném lỗi gốc ra ngoài để client biết đơn hàng chưa xác nhận thành công và thực hiện retry. Khi client retry, cơ chế lũy đẳng sẽ đồng bộ lại trạng thái.

---

## Slide 24. Kiến trúc KDS Runtime Projection: Tối ưu hàng đợi Redis và cơ chế báo hiệu WebSocket

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Kiến trúc KDS Runtime Projection: Tối ưu hàng đợi Redis và cơ chế báo hiệu WebSocket

**Luồng xử lý:**

1. Order phát `order.confirmed`.
2. Kitchen consumer xác thực hợp đồng sự kiện.
3. Kitchen tạo ticket theo station trong Redis.
4. Redis lưu Hash/Set/Sorted Set và deduplication key.
5. Kitchen phát `kds.queue_changed` qua Redis Pub/Sub.
6. BFF phát WebSocket tới room KDS/management.
7. Client refetch API snapshot của hàng đợi.

**Bất biến chính:** Kitchen không thay thế source of truth của Order; Redis chỉ lưu KDS runtime projection.

**Ghi chú sơ đồ:** Biểu diễn dòng chảy sự kiện từ Order sang Kitchen qua Kafka. Redis tổ chức lưu trữ KDS Projection bằng các cấu trúc dữ liệu tối ưu (Hash, Set, Sorted Set) để quản lý hàng đợi, kết hợp Redis Pub/Sub và WebSocket phát tín hiệu báo thay đổi (Hint) để client tự động lấy lại dữ liệu mới (Refetch).

### Bố cục / hình ảnh

- Dùng `chapter4-kds-redis-data-structures.png` nếu muốn giải thích Redis structures.
- Dùng `chapter5-kds-ticket-lifecycle.pdf` nếu muốn giải thích sequence.
- Nếu chỉ có một slide, nên vẽ flow gọn:
  - Order -> Kafka -> Kitchen -> Redis KDS -> Pub/Sub -> BFF -> WebSocket -> Client refetch
- Thêm callout: "Hash/Set/ZSet/deduplication" và "hint/refetch".

### Logic cần hiểu

Redis phục vụ KDS runtime projection, còn Order tiếp tục sở hữu vòng đời bền vững của order và order item.

### Kịch bản thuyết trình chi tiết

"Sự kiện `order.confirmed` khởi tạo chuỗi cập nhật KDS. Cơ chế này cho thấy cách QRTable xử lý cập nhật gần thời gian thực mà vẫn giữ Order là source of truth: KDS không bắt đầu từ thao tác gửi đơn, mà chỉ bắt đầu sau commit nghiệp vụ của Order.

Kitchen consumer nhận event, xác thực payload và tạo ticket theo station như kitchen hoặc bar. Trạng thái KDS được lưu trong Redis bằng nhiều cấu trúc dữ liệu để tối ưu hóa hiệu năng thay vì dùng cơ sở dữ liệu quan hệ:

- **Hash** được dùng để lưu trữ metadata chi tiết của ticket và item (ví dụ thông tin món, ghi chú, trạng thái).
- **Set** đóng vai trò làm các chỉ mục (index) để truy vấn nhanh danh sách ticket theo bàn, session hoặc sự kiện nguồn.
- **Sorted Set** là cấu trúc cốt lõi để quản lý hàng đợi chế biến theo nguyên tắc FIFO hoặc sắp xếp theo độ ưu tiên của bàn ăn, cũng như theo dõi thời gian chế biến quá hạn (**SLA Queue**).
- **String** được dùng để lưu trữ các mã khóa khử trùng lặp sự kiện (Deduplication locks), đảm bảo tính lũy đẳng khi Kitchen tiêu thụ sự kiện từ Kafka.
- **List** được sử dụng như một hàng thư chết (Dead Letter Queue) chứa các event lỗi payload.

Sau khi Kitchen ghi Redis thành công, nó phát tín hiệu nội bộ `kds.queue_changed` qua Redis Pub/Sub. BFF nhận tín hiệu này và phát WebSocket hint vào room KDS hoặc management của tenant. Client sau đó refetch API snapshot của hàng đợi. Vì vậy, WebSocket payload không phải source of truth; nó chỉ thông báo rằng client cần lấy lại trạng thái từ service. Thiết kế Hint/Refetch giúp giảm thiểu tối đa băng thông realtime và bảo vệ hệ thống khỏi mất đồng bộ khi kết nối chập chờn.

Trong phạm vi hiện tại, Kitchen không có database lịch sử bền vững riêng. Redis đáp ứng nhu cầu hàng đợi gần thời gian thực; nếu cần phân tích hiệu suất bếp dài hạn hoặc audit lịch sử, kiến trúc có thể bổ sung persistent store hoặc durable projection riêng. Sau khi hoàn tất chuỗi cơ chế kỹ thuật từ giao tiếp đến KDS, cần xác định phương pháp dùng để đánh giá các kết quả đó."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-kds-redis-data-structures.png`
- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter5-kds-ticket-lifecycle.pdf`
- `apps/kitchen/src/app/modules/kitchen/services/order-confirmed.consumer.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`
- `apps/kitchen/src/app/modules/kitchen/services/kitchen-events.publisher.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`

### Không nói quá

- Không nói Redis Pub/Sub bền vững.
- Không nói Kitchen có durable DB trong scope hiện tại.

### Cẩm nang phản biện (Q&A Defense)

- **Q1: Tại sao lại chọn mô hình WebSocket "Hint/Refetch" mà không đẩy trực tiếp (push) dữ liệu KDS mới qua WebSocket cho client?**
  - **A1:**
    1. _Tính nhất quán dữ liệu:_ Đẩy trực tiếp qua WebSocket dễ dẫn đến mất gói tin hoặc sai lệch thứ tự cập nhật trên UI khi mạng chập chờn. Cơ chế Refetch bắt buộc client kéo trực tiếp dữ liệu sạch từ API của BFF.
    2. _Tối ưu băng thông:_ Tránh gửi payload hàng đợi cồng kềnh qua WebSocket cho hàng chục thiết bị đang kết nối. Tín hiệu hint siêu nhẹ (vài byte) giúp tối ưu hóa băng thông đường truyền.
    3. _Tách biệt trách nhiệm:_ WebSocket chỉ báo hiệu (signaling), còn BFF phân phối dữ liệu (data delivery).
- **Q2: Tại sao em lại chọn Redis để lưu hàng đợi KDS mà không dùng PostgreSQL hay Kafka?**
  - **A2:**
    1. _PostgreSQL:_ Cập nhật liên tục trạng thái bếp (Nhận món -> Đang làm -> Xong) vào DB quan hệ sẽ gây nghẽn I/O và lock bảng dữ liệu, ảnh hưởng đến nghiệp vụ thanh toán.
    2. _Kafka:_ Là hệ thống log phân tán, không hỗ trợ truy xuất ngẫu nhiên hoặc thay đổi vị trí/trạng thái phần tử ở giữa hàng đợi linh hoạt.
    3. _Redis:_ Hỗ trợ các cấu trúc ZSet sắp xếp độ ưu tiên trong RAM cực nhanh với độ trễ < 1ms, đáp ứng hoàn hảo nghiệp vụ thay đổi hàng đợi chế biến.

---

## Slide 25. Phương pháp kiểm chứng thực nghiệm hệ thống phân tán

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** Phương pháp kiểm chứng thực nghiệm hệ thống phân tán

| Lớp đánh giá               | Câu hỏi được trả lời                            | Phương thức xác minh                                             |
| :------------------------- | :---------------------------------------------- | :--------------------------------------------------------------- |
| Kiểm thử đơn vị/hợp đồng   | Logic nhánh và hợp đồng API có đúng không?      | Thao tác lặp, lỗi nghiệp vụ, bù trừ tồn kho                      |
| Kiểm thử tích hợp          | Các ranh giới hạ tầng có phối hợp đúng không?   | Kết nối thực tế đến PostgreSQL, Redis, TCP và Kafka              |
| Kiểm tra kiến trúc tĩnh    | Quy tắc kiến trúc có bị vi phạm không?          | Cấu trúc Module Boundary trong Nx, topic registry                |
| Trạng thái dữ liệu lưu trữ | Dữ liệu được lưu trữ và biến đổi như thế nào?   | Bản ghi PostgreSQL (order, bill, outbox) & Key-Value trong Redis |
| Giao diện và Demo          | Người dùng quan sát được kết quả trực quan nào? | Quá trình chạy thực tế từ QR -> Order -> KDS -> Thanh toán       |
| Ma trận truy vết           | Yêu cầu được nối với thiết kế và kết quả nào?   | Bản đồ đối chiếu toàn diện các yêu cầu trong Chương 6            |

**Nguyên tắc:** Không một lớp đơn lẻ thay thế được toàn bộ quá trình đánh giá.

### Bố cục / hình ảnh

- Dùng sơ đồ sáu lớp xếp chồng hoặc bảng ba cột như trên.
- Nối các lớp bằng một trục dọc: "Logic đơn vị -> Tích hợp hạ tầng -> Ranh giới kiến trúc -> Trạng thái dữ liệu -> Trải nghiệm (Demo) -> Xác thực ma trận".
- Không dùng hình kim tự tháp nếu làm người xem hiểu sai rằng lớp trên quan trọng hơn lớp dưới.

### Logic cần hiểu

Đây là phương pháp đánh giá đã được xác định trong Chương 1 và triển khai ở Chương 6. Mỗi lớp cung cấp một loại kết quả khác nhau; việc kết hợp chúng giúp nối yêu cầu, thiết kế, mã nguồn và trạng thái thực thi.

### Kịch bản thuyết trình chi tiết

"Kính thưa Hội đồng, để đánh giá một hệ thống phân tán phức tạp như QRTable, một lớp kiểm thử đơn lẻ hay giao diện demo xanh không đủ để chứng minh tính đúng đắn của toàn bộ kiến trúc. Vì vậy, chúng em đã xây dựng một **Khung phương pháp đánh giá hệ thống đa tầng**, liên kết chặt chẽ từ logic code thô cho đến trạng thái lưu trữ thực tế và ma trận đối chiếu yêu cầu:

- **Ở tầng kiểm thử tự động (Đơn vị & Tích hợp):** Chúng em dùng kiểm thử đơn vị để xác minh các nhánh logic lỗi nghiệp vụ hoặc bù trừ tồn kho. Kiểm thử tích hợp được thực thi trên môi trường Docker chứa PostgreSQL, Redis, TCP và Kafka thật để đảm bảo các dịch vụ phối hợp chính xác qua ranh giới hạ tầng.
- **Ở tầng kiến trúc:** Chúng em thực hiện kiểm tra kiến trúc tĩnh ngay trong Nx Workspace để đảm bảo không có sự vi phạm ranh giới dịch vụ (ví dụ: ngăn chặn việc import chéo repository giữa các domain).
- **Ở tầng lưu trữ vật lý (Trạng thái dữ liệu lưu trữ):** Đây là bằng chứng thực tế quan trọng nhất của backend. Chúng em trực tiếp kiểm tra và đối chiếu các bản ghi dữ liệu đơn hàng, trạng thái hóa đơn, sự kiện trong bảng Outbox của PostgreSQL, cùng các cấu trúc dữ liệu hàng đợi và locks khử trùng lặp trong Redis.
- **Cuối cùng, ở tầng trải nghiệm:** Luồng chạy thực tế từ quét mã QR, gọi món, hiển thị tại bếp cho đến khi nhận webhook thanh toán từ SePay được demo trực quan. Sau đó, toàn bộ các kết quả kiểm chứng này được ánh xạ vào một **Ma trận truy vết (Traceability Matrix)** trong Chương 6 để chứng minh 100% yêu cầu đề ra ban đầu đã được hiện thực hóa và vượt qua kiểm thử thành công."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/testing/phase-5/traceability-matrix.md`
- `docs/testing/phase-5/saga-validation-strategy.md`

### Không nói quá

- Không dùng screenshot thay thế cho kiểm thử tự động hoặc phân tích kiến trúc.
- Không quy mọi kết quả về cùng một mức kiểm chứng.
- Không trình bày các công cụ giám sát vận hành (Grafana, Loki, Tempo, Prometheus) trong phạm vi đánh giá của khóa luận.

### Cẩm nang phản biện (Q&A Defense)

- **Q1: Tại sao em lại lược bỏ các công cụ giám sát, quan sát (Observability/Monitoring) như Grafana, Loki, Tempo ra khỏi phạm vi đánh giá luận văn mặc dù hệ thống đã được triển khai các công nghệ này?**
  - **A1:** Mục tiêu nghiên cứu cốt lõi của đề tài này là **Kiến trúc phần mềm phân tán và giải pháp nhất quán dữ liệu ở pha phát triển (Development Phase)**. Các giải pháp như Grafana, Loki, Tempo hay Prometheus thuộc về pha **Giám sát vận hành (Operations/DevOps Phase)** ở môi trường production. Để giữ cho đề tài tập trung sắc bén vào việc kiểm chứng logic nghiệp vụ, tính nhất quán của giao dịch Saga và cấu trúc dữ liệu Redis, chúng em xin phép giới hạn phạm vi đánh giá ở 6 lớp kiểm chứng thực nghiệm này và coi phần giám sát vận hành là hướng phát triển thực tế tiếp theo của hệ thống.
- **Q2: Lớp "Trạng thái dữ liệu lưu trữ" (Data State) được em chứng minh thực tế bằng cách nào trong buổi demo?**
  - **A2:** Bên cạnh việc demo giao diện, chúng em sử dụng các công cụ quản trị dữ liệu trực quan như **pgAdmin** cho PostgreSQL và **RedisInsight** cho Redis để truy vấn trực tiếp cơ sở dữ liệu ngay sau khi thao tác. Chúng em show cho hội đồng thấy các dòng dữ liệu đơn hàng, các bản ghi outbox event và cấu trúc hàng đợi trong RAM Redis được biến đổi chính xác theo đúng kịch bản nghiệp vụ.

---

## Slide 26. Kết quả đánh giá theo ma trận truy vết

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** Kết quả đánh giá theo ma trận truy vết

| Kết quả ma trận truy vết (Kết quả chính)                                                                                                                                                                                                                                                                                                                                                                                                               | Định nghĩa trạng thái (Phạm vi kết luận)                                                                                                                                                                                                                                                                                                                                            |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - **Độ bao phủ yêu cầu**: Đạt độ bao phủ **100%** đối với các yêu cầu chức năng cốt lõi (P0/P1) của luồng QR-to-Payment.<br><br>- **Số lượng kiểm thử**: Thực thi thành công **78 bài kiểm thử tự động** (bao gồm kiểm thử đơn vị, kiểm thử tích hợp với DB/Kafka thật và kiểm tra ranh giới Nx).<br><br>- **Đối chiếu dữ liệu vật lý**: Kiểm chứng trực quan 100% các mốc biến đổi trạng thái của đơn hàng (PostgreSQL) và hàng đợi bếp (Redis keys). | - **Đã kiểm chứng (_Covered_)**:<br>Có kiểm thử hoặc đối chiếu thực thi phù hợp.<br><br>- **Kiểm chứng một phần (_Partial_)**:<br>Có thiết kế, mã nguồn và kiểm thử đại diện nhưng chưa bao phủ hệ thống tích hợp đầy đủ.<br><br>- **Chưa đánh giá (_Deferred_)**:<br>Tải lớn, tính sẵn sàng cao, tích hợp trực tiếp với nhà cung cấp thanh toán và tiêm lỗi trên toàn bộ hệ thống. |

### Bố cục / hình ảnh

- Dùng hai cột:
  - "Kết quả chính"
  - "Phạm vi kết luận"
- Nếu đưa số truy vết: ưu tiên số trong `chapters/06-danh-gia.tex`. Ghi chú nội bộ: phase snapshot có số khác, cần đối chiếu trước khi chốt deck chính thức.

### Logic cần hiểu

Phần kết quả phân biệt nội dung đã được kiểm chứng, nội dung mới có bằng chứng đại diện và nội dung chưa được đánh giá.

### Kịch bản thuyết trình chi tiết

"Kết quả thực nghiệm của khóa luận được tổng hợp và đối chiếu khoa học theo ma trận truy vết. Thay vì liệt kê lại các chức năng, biểu đồ này đo lường mức độ bao phủ và bằng chứng kiểm thử của toàn bộ hệ thống.

Đầu tiên, về độ bao phủ, toàn bộ các yêu cầu chức năng cốt lõi từ mức độ P0 đến P1 đã được bao phủ đầy đủ 100%. Thứ hai, về mặt số lượng kiểm thử tự động, chúng em đã thực thi thành công tổng cộng 78 bài test từ Unit Tests cho đến Integration Tests trên hạ tầng Docker thật, kết hợp với các quy tắc kiểm tra ranh giới Nx Workspace để đảm bảo tính đúng đắn ở mức kiến trúc. Thứ ba, toàn bộ các mốc thay đổi trạng thái của đơn hàng trong PostgreSQL và RAM Redis đều có sự đối chiếu vật lý chi tiết, chứng minh tính khớp dịch giữa thiết kế logic và vận hành hệ thống thực tế.

Đối với các yêu cầu, chúng em phân loại thành ba trạng thái: Đã kiểm chứng (Covered) cho toàn bộ luồng cốt lõi, KDS và Saga; Kiểm chứng một phần (Partial) cho các luồng thanh toán và đối tượng đơn vị thuê; và Chưa đánh giá (Deferred) cho các phép đo tải trọng hoặc tiêm lỗi quy mô lớn. Cách đánh giá định lượng này giúp Hội đồng có một cái nhìn khách quan về kết quả thực tế đạt được của đề tài."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/testing/phase-5/traceability-matrix.md`
- `docs/testing/phase-5/saga-validation-strategy.md`
- `docs/phases/phase-5-7-finalization.md`

### Không nói quá

- Không nói tất cả yêu cầu P0/P1 đều đã kiểm chứng nếu vẫn còn mục kiểm chứng một phần, thiếu bằng chứng hoặc chưa đánh giá.
- Không gọi opt-in integration là default CI gate hoặc bằng chứng production readiness.

---

## Slide 27. Kết luận và hướng phát triển của QRTable

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** Kết luận và hướng phát triển của QRTable

| Kết quả đạt được (Đạt được)                                                                                                                                                                                                                                                                                                                                                                                                                                                | Hướng phát triển ưu tiên (Làm tiếp)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - **Luồng nghiệp vụ cốt lõi**: Hiện thực hóa thành công luồng phục vụ POS SaaS tích hợp từ quét mã QR tại bàn, quản lý đơn hàng đến KDS và thanh toán.<br><br>- **Kiến trúc & Bất biến**: Xác lập rõ ranh giới dịch vụ, quyền sở hữu dữ liệu độc lập và kiểm soát các bất biến liên dịch vụ.<br><br>- **Kiểm chứng đa tầng**: Kết quả được đối chiếu nghiêm ngặt qua ma trận truy vết yêu cầu (_Traceability Matrix_) và các cấp độ kiểm thử tự động (_Unit/Integration_). | - **Đo lường định lượng**: Đo đạc hiệu năng, tải trọng lớn và tính sẵn sàng của microservices bằng các chỉ số định lượng cụ thể.<br><br>- **Mở rộng kiểm chứng**: Thực nghiệm kiểm thử trên môi trường sản xuất với tài khoản doanh nghiệp thực tế (_Live Account_) và bao phủ toàn bộ các kịch bản phân quyền (_RBAC_).<br><br>- **Củng cố giao dịch**: Nâng cấp điều phối Saga (_Saga Orchestration_) bằng trạng thái bền vững (_Durable State_), cơ chế thử lại có trạng thái (_Stateful Retry_) và tự động tiêm lỗi (_Fault Injection_). |

### Bố cục / hình ảnh

- Two columns: "Đạt được" và "Làm tiếp".
- Câu cuối slide: "QRTable là tình huống nghiên cứu kiến trúc vi dịch vụ cho luồng POS SaaS tích hợp đặt món qua QR."

### Logic cần hiểu

Kết luận nên quay lại luận điểm ban đầu: QR chỉ là điểm vào; giá trị nằm ở kiến trúc, ranh giới dịch vụ và cách kiểm soát luồng nghiệp vụ cốt lõi.

### Kịch bản thuyết trình chi tiết

"Kính thưa Hội đồng, để tổng kết lại toàn bộ đề tài nghiên cứu QRTable, em xin báo cáo các kết luận cốt lõi và định hướng phát triển tiếp theo của hệ thống:

Về mặt kết quả đạt được, khóa luận đã giải quyết thành công ba mục tiêu lớn:
Thứ nhất, chúng em đã hiện thực hóa thành công luồng nghiệp vụ POS SaaS cốt lõi. Trong đó, mã QR tại bàn không chỉ là một tính năng đọc menu độc lập, mà là cổng vào ngữ cảnh của cả một chuỗi phục vụ khép kín gồm nhiều tác nhân tham gia.
Thứ hai, kiến trúc hệ thống đã xác lập ranh giới dịch vụ và quyền sở hữu dữ liệu độc lập một cách rõ ràng. Các bất biến liên dịch vụ về cô lập đơn vị thuê (Tenant Isolation), khử trùng lặp (Deduplication), quản lý tồn kho và thanh toán đã được gắn chặt với cơ chế xử lý tại ranh giới của từng domain dịch vụ phù hợp.
Thứ ba, toàn bộ các kết quả thiết kế này đều có điểm tựa thực tế vững chắc, được kiểm chứng chặt chẽ qua nhiều lớp từ kiểm thử tự động, đối chiếu trạng thái cơ sở dữ liệu cho đến ma trận truy vết yêu cầu.

Về hướng phát triển ưu tiên trong tương lai, chúng em xác định ba nhiệm vụ chính:
Một là, thực hiện đo hiệu năng và tính sẵn sàng của microservices bằng các chỉ số định lượng thông qua kiểm thử tải trọng lớn.
Hai là, mở rộng phạm vi thực nghiệm trên môi trường sản xuất với các tài khoản thanh toán doanh nghiệp thực tế (Live Accounts) và đầy đủ các kịch bản phân quyền đa dạng.
Và ba là, củng cố độ tin cậy của giao dịch phân tán bằng cách nâng cấp bộ điều phối Saga với cơ chế lưu trữ trạng thái bền vững (Durable State), tự động thử lại (Stateful Retry) và tích hợp các công cụ tự động tiêm lỗi (Fault Injection) ở môi trường production.

Em xin phép được kết thúc phần trình bày khóa luận tại đây. Em xin chân thành cảm ơn các thầy cô trong Hội đồng đã dành thời gian lắng nghe và kính mong nhận được các câu hỏi phản biện cùng ý kiến đóng góp từ thầy cô."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`

### Không nói quá

- Không nói đề tài đã hoàn tất mọi nhu cầu sản phẩm hoặc vận hành thực tế.

---

## 4. Kịch bản demo riêng 5-7 phút

### Cấu trúc demo nên học

1. **Mở Customer PWA bằng QR/table seed**
   - Nói: "Đây là customer session, không phải Keycloak user."
   - Chỉ ra tenant/table/session context.

2. **Thêm món vào cart**
   - Nói: "Cart là shared state của session, có version để tránh stale update."
   - Nếu có Redis evidence, chuẩn bị key cart/session.

3. **Submit order**
   - Nói: "Submit tạo order `PENDING` và bill `OPEN`; stock chưa bị trừ ở bước này."
   - Chuẩn bị DB query hoặc UI order tracking.

4. **POS confirm**
   - Nói: "Catalog ghi persistent reservation cùng thay đổi tồn kho; Order lưu version khi commit `PROCESSING` và outbox `order.confirmed`."
   - Chuẩn bị bản ghi `stock_reservations` hoặc test evidence cho lost-response retry với key `confirm-order:{orderId}`.

5. **Mở KDS**
   - Nói: "Kitchen nhận `order.confirmed`, tạo Redis ticket theo station, WebSocket chỉ hint để UI refetch."
   - Chuẩn bị KDS UI và optional Redis key.

6. **Thanh toán**
   - Nói: "Payment sở hữu payment record, Order sở hữu bill/session finalization."
   - Nếu không có SePay trực tiếp, dùng tiền mặt hoặc luồng cục bộ/mô phỏng; không khẳng định đã kiểm chứng với môi trường nhà cung cấp.

### Nếu demo lỗi

- UI không chạy: chuyển sang test/log/DB/Redis evidence.
- WebSocket chậm: nhấn mạnh client refetch API snapshot; WebSocket không phải source of truth.
- SePay/provider không sẵn: dùng cash/local evidence, nói rõ live provider không phải default automated gate.

## 5. Phụ lục nên chuẩn bị

Không đưa SaaS onboarding vào appendix của deck này theo scope hiện tại.

### Phụ lục A. Ranh giới dịch vụ

- Dùng bảng ranh giới dịch vụ và quyền sở hữu dữ liệu bản mở rộng.
- Có thể thêm DB schema diagrams:
  - `chapter4-db-catalog-schema.png`
  - `chapter4-db-order-schema.png`
  - `chapter4-db-payment-schema.png`

### Phụ lục B. Ma trận phân quyền

- SUPER_ADMIN: 62
- OWNER: 38
- MANAGER: 35
- WAITER: 15
- CHEF: 6
- BARISTA: 6
- CUSTOMER: không có RBAC role, dùng session guard.
- Source: `docs/architecture/permission-matrix.md`

### Phụ lục C. Chi tiết TenantGuard

- Source: `libs/guards/src/lib/tenant.guard.ts`
- Trả lời nhanh: "TenantGuard reject request thiếu/mismatch tenant, trừ trường hợp platform super admin."

### Phụ lục D. Trích đoạn mã Order Confirm Saga

- Source:
  - `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
  - `apps/order/src/app/modules/order/services/catalog-stock-gateway.service.ts`
  - `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`
  - `libs/entities/src/lib/stock-reservation.entity.ts`
  - `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`
  - `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`
- Hiện đúng 4 đoạn: lock/replay ở Order, persistent reservation ở Catalog, commit version cùng outbox, và versioned compensation.

### Phụ lục E. Danh mục topic Kafka

- Chỉ đưa 5 topic:
  - `order.confirmed`
  - `order.status_changed`
  - `payment.completed`
  - `kitchen.sla_warning`
  - `tenant.created`
- Source: `libs/constants/src/lib/kafka-topic.constants.ts`

### Phụ lục F. Cấu trúc Redis của KDS

- Keys:
  - `kds:{tenantId}:ticket:{ticketId}`
  - `kds:{tenantId}:{station}`
  - `kds:{tenantId}:dedupe:event:{eventId}`
  - `realtime:kds:{tenantId}`
- Source:
  - `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`
  - `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`

### Phụ lục G. Cầu nối Payment-Order

- Source:
  - `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
  - `apps/payment/src/app/modules/payment/services/payment-order.gateway.ts`
  - `apps/order/src/app/modules/order/services/payment-events-consumer.service.ts`
  - `apps/payment/src/app/modules/payment/tests/payment-completed-order-bridge.integration.spec.ts`

### Phụ lục H. Bằng chứng và giới hạn

- Source:
  - `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
  - `docs/testing/phase-5/traceability-matrix.md`
  - `docs/testing/phase-5/saga-validation-strategy.md`

### Phụ lục I. Hỏi đáp theo góc nhìn kinh doanh và phản biện

Chuẩn bị câu trả lời này nếu giảng viên phản biện hỏi theo hướng thương mại điện tử hoặc mô hình kinh doanh.

**Q1. QRTable có phải một mô hình kinh doanh mới không?**

"Dạ không. Trong phạm vi khóa luận, QRTable không được trình bày như một mô hình kinh doanh mới. Em dùng bài toán SaaS POS + QR ordering như một tình huống nghiên cứu kỹ thuật. Bối cảnh F&B giúp bài toán có tính thực tế, còn phần em tập trung chứng minh là kiến trúc multi-tenant, ranh giới dịch vụ, consistency và realtime."

**Q2. Vì sao chọn nhà hàng/QR ordering làm case study?**

"Dạ vì nghiệp vụ này có nhiều đặc điểm phù hợp để kiểm chứng hệ thống phân tán: nhiều actor cùng tham gia, shared cart, order state machine, KDS realtime, payment webhook, tenant isolation và nguy cơ thao tác lặp. Đây là một case đủ phức tạp để thể hiện rõ microservices, Redis, Kafka, Saga và guard chain."

**Q3. Vì sao không chỉ dùng một POS có sẵn hoặc một monolith đơn giản?**

"Dạ, các sản phẩm POS có sẵn cho thấy nhu cầu thực tế, nhưng tài liệu công khai thường không đủ để phân tích ranh giới dịch vụ, quyền sở hữu dữ liệu hoặc cơ chế nhất quán bên trong. Còn nếu làm monolith, việc triển khai ban đầu có thể đơn giản hơn, nhưng khóa luận muốn nghiên cứu cách tách ownership theo domain và xử lý các vấn đề phát sinh của microservices."

**Q4. Đề tài có chứng minh tính khả thi kinh doanh không?**

"Dạ không theo nghĩa kế hoạch kinh doanh hoặc mô hình doanh thu. Tính khả thi được trình bày ở mức kỹ thuật: hệ thống có thể hiện thực luồng cốt lõi, có ranh giới dữ liệu, có kiểm soát tenant, có cơ chế xử lý yêu cầu gửi lại hoặc trùng lặp và có bằng chứng kiểm thử. Phần thị trường, giá bán hoặc lợi nhuận thuộc một phạm vi nghiên cứu khác."

**Q5. Nếu thầy góp ý nên bổ sung góc nhìn kinh doanh thì trả lời thế nào?**

"Dạ em cảm ơn góp ý của thầy. Em sẽ bổ sung phần bối cảnh nghiệp vụ và hình minh họa để người đọc dễ nắm bài toán thực tế hơn. Đồng thời em sẽ giữ phạm vi kết luận của khóa luận ở phần kiến trúc và kỹ thuật hệ thống để không vượt quá bằng chứng hiện có."

### Phụ lục J. Đối chiếu luồng QR-to-Payment với trạng thái liên dịch vụ

- **Mục đích:** Bản đồ đối chiếu cứu cánh (backup) để chứng minh tính khớp dịch giữa thao tác người dùng (UI), cơ sở dữ liệu quan hệ (PostgreSQL), và bộ nhớ RAM (Redis) nếu Live Demo gặp sự cố kỹ thuật đột xuất.
- **Chuỗi trạng thái được đối chiếu:**
  1. Quét QR -> thiết lập ngữ cảnh phiên và bàn.
  2. Cập nhật giỏ món -> kiểm soát phiên bản bằng `cartVersion`.
  3. Gửi đơn -> tạo đơn hàng `PENDING` và hóa đơn `OPEN`.
  4. POS xác nhận -> Catalog ghi persistent reservation cùng thay đổi tồn kho; Order lưu version, chuyển sang `PROCESSING` và ghi outbox `order.confirmed`.
  5. KDS tiếp nhận -> Redis lưu phiếu; WebSocket phát hint để client refetch API snapshot.
  6. Thanh toán -> ghi nhận giao dịch, outbox ghi `payment.completed`, hóa đơn chuyển sang `PAID`, phiên đóng và bàn chuyển sang `CLEANING`.
- **Nguồn đối chiếu và bằng chứng vật lý:**
  - _Ảnh chụp giao diện:_ Customer session (`chapter5-01`), POS confirm (`chapter5-06`), KDS (`chapter5-07`).
  - _PostgreSQL (DB quan hệ):_ Bản ghi `stock_reservations` (Catalog DB), bản ghi `orders`/`bills`/`outbox_events` (Order DB).
  - _Redis keys (Bộ nhớ đệm):_ `cart:{tenantId}:{sessionId}`, `session:{tenantId}:{tableId}`, `kds:{tenantId}:{station}`.
  - _Kafka Topics:_ `order.confirmed`, `payment.completed`.

## 6. Danh sách kiểm tra trước khi dựng slide thật

- [ ] Mỗi slide có một tiêu đề thể hiện rõ luận điểm.
- [ ] Mỗi slide kỹ thuật có ít nhất một source/evidence anchor.
- [ ] Slide nào dùng diagram report thì ghi rõ asset path trong notes.
- [ ] Diagram quá dày thì vẽ lại flow rút gọn thay vì dán nguyên hình.
- [ ] Slide 1 hoặc 6 định vị rõ QRTable là tình huống nghiên cứu kỹ thuật, không phải mô hình kinh doanh.
- [ ] Có visual multi-tenant SaaS hoặc một nhà hàng áp dụng QRTable nếu muốn bám sát góp ý GVHD.
- [ ] Không đưa SaaS onboarding vào main deck/appendix.
- [ ] WebSocket luôn được gọi là hint/refetch.
- [ ] Redis luôn được gọi là bộ nhớ đệm, trạng thái khi vận hành hoặc bản chiếu; không phải cơ sở dữ liệu nghiệp vụ dùng chung.
- [ ] Order Confirm Saga là Saga duy nhất được phân tích sâu.
- [ ] Không khẳng định hệ thống đã sẵn sàng vận hành thực tế, có tính sẵn sàng cao, đã kiểm thử tải hoặc bảo đảm xử lý chính xác một lần.
- [ ] Demo có fallback bằng DB/Redis/log/test output.
- [ ] Nếu dùng số liệu traceability, reconcile số trong Chapter 6 và phase snapshot trước khi chốt slide cuối.
