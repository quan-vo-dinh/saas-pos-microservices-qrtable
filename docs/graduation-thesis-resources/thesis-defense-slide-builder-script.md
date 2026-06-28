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
| `thesis-report/assets/figures/chapter2-fnb-pos-lifecycle.png`         | UML activity diagram vòng đời POS F&B từ bàn, order, bếp đến thanh toán.  | Slide 3 nếu muốn mở bài bằng bối cảnh vận hành.    |
| `thesis-report/assets/figures/chapter2-qr-ordering-flow.png`          | UML sequence diagram luồng QR/session/giỏ/submit idempotent.              | Slide 4 hoặc slide demo.                           |
| `thesis-report/assets/figures/chapter2-saas-multitenancy.png`         | Component/deployment-style diagram SaaS đa tenant và ranh giới cô lập.    | Slide 10 hoặc 19 nếu cần giải thích tenant.        |
| `thesis-report/assets/figures/chapter2-monolith-vs-microservices.png` | UML component diagram so sánh monolith và microservices.                  | Slide 11.                                          |
| `thesis-report/assets/figures/chapter2-kafka-event-flow.png`          | Component/topology diagram topic, partition, consumer group.              | Slide 15 nếu cần minh họa giao tiếp bất đồng bộ.   |
| `thesis-report/assets/figures/chapter2-outbox-saga-overview.png`      | UML sequence diagram Outbox và Saga ở mức khái niệm.                      | Slide 19 hoặc 21.                                  |
| `thesis-report/assets/figures/chapter2-websocket-hint-refetch.png`    | UML sequence diagram WebSocket hint và API snapshot.                      | Slide 16 hoặc 25.                                  |
| `thesis-report/assets/figures/chapter2-oidc-rbac-saas-pos.png`        | Component diagram tách OIDC/JWT/RBAC và QR session.                       | Slide 17.                                          |

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

## 3. Mạch nội dung theo slide thực tế hiện tại

> Cập nhật theo bản slide thực tế mới sau buổi góp ý GVHD. File này **không xóa** các kịch bản thuyết trình chi tiết đã viết ở các mục bên dưới. Khi luyện theo bản slide mới, dùng bảng mapping này để nối slide thực tế với phần lời kế thừa tương ứng, rồi chỉ bổ sung những đoạn slide mới phát sinh.

Mạch kể chuyện hiện tại:

1. Luôn bám tên đề tài: **SaaS POS + QR ordering + Microservices**.
2. Mở bằng bài toán POS dùng chung cho nhiều nhà hàng, nhiều tác nhân và nhiều mốc bàn giao trạng thái; không mở như một app POS thông thường.
3. Làm rõ điểm khác biệt của QRTable: độ khó nằm ở multi-tenancy, service ownership, tenant isolation, distributed consistency, KDS runtime và bằng chứng kiểm chứng.
4. Quyết định Microservices được trình bày như một lựa chọn có đánh đổi: tách ownership nhưng chấp nhận chi phí giao tiếp phân tán.
5. Các vấn đề phân tán được giải theo thứ tự: access/tenant scope -> communication -> local transaction/consistency -> Saga orchestration -> KDS projection/realtime.
6. Phần kết quả chứng minh hệ thống bằng nhiều lớp: sản phẩm, kiến trúc, kiểm thử, trạng thái vận hành và công cụ quan sát hiện vật như Allure, Kafkio, Redis Insight.

### Mapping nhanh từ slide thực tế sang kịch bản kế thừa

| Slide thực tế    | Tiêu đề / vai trò trên slide mới                         | Dùng kịch bản kế thừa từ mục | Điểm cần nhấn thêm theo góp ý GVHD                                                                        |
| ---------------- | -------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1                | Bìa đề tài chính thức                                    | Slide 1                      | Đọc đủ trục đề tài: POS, SaaS, QR, Microservices; không chỉ gọi là app POS.                               |
| 2                | Nội dung trình bày 5 phần                                | Slide 2                      | Roadmap mới đã gộp các phần cũ, mỗi cột phải trả lời bài toán của đề tài.                                 |
| 3                | Divider Phần 1: Bài toán POS SaaS QR                     | Slide 3-6                    | Đây là section framing, nói ngắn để người nghe hiểu vì sao phần 1 xuất hiện.                              |
| 4                | Điểm khác biệt của QRTable                               | Slide 5-6 và notes Slide 4   | Nhấn độ khó kỹ thuật phía sau một giao diện POS quen thuộc.                                               |
| 5                | Luồng từ quét QR đến thanh toán                          | Slide 4                      | Không đọc hết từng bước; dùng flow làm trục nối QR ordering với POS/KDS/payment.                          |
| 6                | Mục tiêu và phạm vi khóa luận                            | Slide 7 và Slide 9           | Phân biệt nghiên cứu, xây dựng, kiểm chứng; tránh nói như danh sách tính năng.                            |
| 7                | Divider Phần 2: Quyết định Microservices                 | Slide 10-12                  | Chuyển từ bài toán sang quyết định kiến trúc có đánh đổi.                                                 |
| 8                | Lựa chọn kiến trúc Microservices                         | Slide 10-12                  | Nói rõ động lực và chi phí phân tán tương ứng, không nói microservices luôn tốt hơn.                      |
| 9                | Kiến trúc tổng thể QRTable                               | Slide 13                     | Sơ đồ trả lời service nào giải quyết thách thức nào, không chỉ liệt kê stack.                             |
| 10               | Ranh giới service và quyền sở hữu dữ liệu                | Slide 14                     | Đây là bằng chứng trực tiếp cho Microservices: owner, data boundary, không cross-DB.                      |
| 11               | Divider Phần 3: Cô lập tenant và kiểm soát truy cập      | Slide 17-18                  | Đặt câu hỏi: nhiều nhà hàng dùng chung nền tảng thì scope/truy cập được giữ bằng gì.                      |
| 12               | Mô hình tác nhân và truy cập                             | Slide 8 và Slide 17          | Tách staff/admin theo danh tính, customer theo phiên QR và webhook provider.                              |
| 13-14            | Xác thực, phân quyền và Tenant Isolation                 | Slide 17-18                  | Phân biệt authentication, tenant/session scope, RBAC, plan entitlement và data ownership.                 |
| 15               | Divider Phần 4: Phối hợp service và bài toán phân tán    | Slide 15-16                  | Chuyển từ access control sang câu hỏi hệ thống phối hợp thế nào khi DB đã tách.                           |
| 16               | Mô hình giao tiếp giữa service và ứng dụng               | Slide 15-16                  | Bắt đầu từ tiêu chí chọn kênh, sau đó mới nói TCP/gRPC/Kafka/WebSocket/webhook.                           |
| 17               | Nhất quán dữ liệu trên nhiều local transaction           | Slide 19-20                  | Phân biệt ACID cục bộ, eventual consistency, idempotency, outbox và deduplication.                        |
| 18               | Saga pattern trong transaction phân tán                  | Slide 21                     | Nói Saga là chuỗi local transaction + compensation, không phải rollback ACID toàn hệ thống.               |
| 19               | Áp dụng Orchestration Saga trong xác nhận đơn            | Slide 22                     | Đây là case study chính: Order orchestrator, Catalog owner stock, Kitchen sau event.                      |
| 20               | Nhánh lỗi và compensation của Saga                       | Slide 23                     | Dùng bảng lỗi để trả lời khi bị hỏi sâu; không đọc toàn bộ như checklist.                                 |
| 21               | Realtime/KDS trên hệ thống phân tán                      | Slide 24                     | Redis projection + Pub/Sub/WebSocket chỉ là hint/refetch, Order vẫn là source of truth.                   |
| 22               | Divider Phần 5: Kết quả kiểm chứng                       | Slide 25                     | Mở phần kết quả bằng câu hỏi: kiểm chứng bằng lớp evidence nào.                                           |
| 23               | Các lớp kiểm chứng kỹ thuật                              | Slide 25-26                  | Bằng chứng không chỉ là demo UI: còn kiến trúc, test, DB/Redis/Kafka state.                               |
| 24-30            | Các kết quả kiểm thử Orchestration Saga                  | Slide 22-23 và notes mới     | Mỗi slide chỉ nói một invariant: race, lost response, stale release, duplicate, rollback, commit failure. |
| 31               | Kiểm thử Order Service & trực quan hóa qua Allure Report | Slide 25-26                  | Dùng như evidence test automation; số lượng test phải khớp report Allure trước khi freeze.                |
| 32               | Kiểm thử SaaS Service & trực quan hóa qua Allure Report  | Slide 25-26                  | Chỉ dùng như lớp kiểm thử dịch vụ nền tảng, không kéo SaaS onboarding thành case study chính.             |
| 33               | Kafkio theo dõi Kafka Cluster                            | Slide 25-26                  | Gọi là minh chứng vận hành/event visibility, không claim observability production-grade.                  |
| 34               | Redis Insight theo dõi Redis                             | Slide 24-26                  | Chứng minh KDS/QR session/projection state; không gọi Redis là database nguồn của nghiệp vụ order.        |
| 35               | Kết luận và hướng phát triển                             | Slide 27                     | Kết luận quay lại đúng trục đề tài; hướng phát triển là load/live payment/Saga hardening.                 |
| Demo / Thank you | Demo sản phẩm và kết thúc                                | Mục 4 demo riêng             | Demo nằm sau phần trình bày; nếu lỗi dùng screenshot/state/log/test fallback.                             |

### Nhãn phần cố định theo slide 2

Mỗi slide nên có nhãn nhỏ ở góc trên phải để người nghe biết đang ở phần nào của lộ trình. Với style slide hiện tại, góc trái đã dành cho logo và tên trường, vì vậy marker nên đặt ở **góc trên phải**, cùng hàng với header trường hoặc ngay dưới header nếu slide nhiều chữ.

Quy ước visual:

- Font 11-14 pt, uppercase vừa phải, không làm nổi hơn title.
- Dạng text nhỏ hoặc pill mảnh; không dùng card lớn.
- Dùng đúng 5 nhãn của lộ trình trình bày để tạo liên kết thị giác xuyên suốt deck.
- Bìa và nội dung trình bày dùng marker `00`; các phần nội dung chính dùng marker `01` đến `05`.

| Marker                                                    | Tên phần trên slide thực tế                                                     | Áp dụng            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------ |
| `00 · BÌA / NỘI DUNG TRÌNH BÀY`                           | Bìa và roadmap                                                                  | Slide 1-2          |
| `01 · BÀI TOÁN POS SAAS TÍCH HỢP ĐẶT MÓN QUA QR`          | Khác biệt QRTable, QR-to-Payment, mục tiêu/phạm vi                              | Slide 3-6          |
| `02 · QUYẾT ĐỊNH KIẾN TRÚC MICROSERVICES`                 | Lựa chọn microservices, kiến trúc tổng thể, service/data ownership              | Slide 7-10         |
| `03 · CÔ LẬP TENANT VÀ KIỂM SOÁT TRUY CẬP`                | Actor/access model, authentication, RBAC, tenant isolation                      | Slide 11-14        |
| `04 · PHỐI HỢP GIỮA CÁC SERVICE VÀ CÁC BÀI TOÁN PHÂN TÁN` | Communication, local transaction, consistency, Saga, compensation, KDS realtime | Slide 15-21        |
| `05 · KẾT QUẢ KIỂM CHỨNG VÀ HƯỚNG PHÁT TRIỂN`             | Evidence layers, Saga tests, Allure, Kafkio, Redis Insight, conclusion/demo     | Slide 22-35 + demo |

Các mục slide chi tiết bên dưới là **kịch bản kế thừa theo cụm**. Khi title hoặc số slide bên dưới khác bản slide thực tế, không xóa kịch bản cũ; ưu tiên dùng mapping ở trên để lấy lời nói tương ứng rồi bổ sung phần mới phát sinh.

### Canonical nội dung slide thực tế hiện tại

> Đây là checklist nội dung slide mới đang dùng. Khi nội dung ở các mục kịch bản kế thừa bên dưới khác bảng này, **bảng này thắng**. Các mục cũ chỉ dùng để lấy lời thuyết trình chi tiết, Q&A và giới hạn phát biểu.

| Slide     | Title / vai trò thực tế                                                                    | Nội dung trực tiếp trên slide                                                                                                                                                                                                                                                                              | Ý chính bắt buộc khi nói                                                                                         |
| --------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1         | Khóa luận tốt nghiệp                                                                       | `NGHIÊN CỨU VÀ XÂY DỰNG NỀN TẢNG POS THEO MÔ HÌNH SAAS TÍCH HỢP ĐẶT MÓN QUA MÃ QR DỰA TRÊN KIẾN TRÚC MICROSERVICES`; Võ Đình Minh Quân - 22521193; GVHD TS. Nguyễn Thanh Bình; ĐHQG-HCM, UIT, Khoa Hệ thống Thông tin.                                                                                     | Định vị đủ bốn keyword của tên đề tài: POS, SaaS, QR ordering, Microservices.                                    |
| 2         | Nội dung trình bày                                                                         | 01 Bài toán POS theo mô hình SaaS tích hợp đặt món qua QR; 02 Quyết định kiến trúc Microservices; 03 Cô lập tenant và kiểm soát truy cập; 04 Phối hợp giữa các service và các bài toán phân tán; 05 Kết quả kiểm chứng và hướng phát triển.                                                                | Roadmap không phải mục lục module; mỗi phần trả lời một vấn đề của đề tài.                                       |
| 3         | Phần 1 - Bài toán POS theo mô hình SaaS tích hợp đặt món qua QR                            | Section divider: xác định thách thức khi vận hành luồng POS đa tác nhân và ngăn ngừa rủi ro dữ liệu trên nền tảng dùng chung cho nhiều nhà hàng độc lập.                                                                                                                                                   | Mở phần bằng câu hỏi: vì sao đây không chỉ là app POS thông thường.                                              |
| 4         | Điểm khác biệt của QRTable                                                                 | Một giao diện POS có thể quen thuộc; độ khó nằm ở việc nhiều nhà hàng và nhiều tác nhân cùng tham gia một luồng trạng thái. Bốn điểm: nền tảng phục vụ nhiều nhà hàng; nhiều khách cùng gọi món tại một bàn; giỏ món/order/bếp/thanh toán có mốc bàn giao rõ; retry/lỗi giữa chừng không tạo kết quả sai.  | Nhấn "độ khó nằm phía sau UI", đưa người nghe vào multi-tenant + shared state + distributed state.               |
| 5         | Luồng nghiệp vụ từ quét QR đến thanh toán                                                  | 01 QR Session; 02 Shared Cart; 03 Submit Order; 04 Staff Confirm; 05 KDS Ticket; 06 Payment.                                                                                                                                                                                                               | Không đọc từng box quá lâu; dùng flow làm xương sống demo và evidence.                                           |
| 6         | Mục tiêu và phạm vi khóa luận                                                              | Nghiên cứu: POS F&B, mô hình dùng chung, ranh giới trách nhiệm/rủi ro trạng thái. Xây dựng: phiên QR, giỏ món, đơn hàng, KDS, thanh toán, luồng phục vụ xuyên suốt. Kiểm chứng: hành vi, thiết kế, kiểm thử, trạng thái hệ thống và mức kết luận tương ứng.                                                | Tách rõ nghiên cứu - xây dựng - kiểm chứng; không biến thành danh sách tính năng.                                |
| 7         | Phần 2 - Quyết định kiến trúc Microservices                                                | Section divider: phân rã hệ thống thành microservices độc lập theo ranh giới nghiệp vụ và quyền sở hữu dữ liệu, chấp nhận chi phí giao tiếp phân tán.                                                                                                                                                      | Chuyển từ bài toán sang quyết định có đánh đổi.                                                                  |
| 8         | Lựa chọn kiến trúc Microservices                                                           | Bảng động lực/đánh đổi: nhiều miền nghiệp vụ -> chia ranh giới/giao tiếp; SaaS nhiều nhà hàng -> tenant isolation; nhiều tác nhân -> tránh nhầm ngữ cảnh/quyền; nhiều màn hình realtime -> đồng bộ trạng thái; scale độc lập -> chấp nhận eventual consistency.                                            | Không nói microservices luôn tốt; nói "vì bài toán này có các driver này nên chọn và chấp nhận các chi phí này". |
| 9         | Kiến trúc tổng thể của QRTable                                                             | Tầng Client: Management App & Customer PWA. Tầng Gateway: BFF kiểm soát truy cập/trung chuyển. Tầng Nghiệp vụ: 7 dịch vụ miền độc lập sở hữu dữ liệu riêng. Tầng Hạ tầng: kho dữ liệu chuyên biệt cùng Kafka, Redis, Keycloak.                                                                             | Sơ đồ trả lời boundary và vai trò từng tầng, không liệt kê stack như inventory.                                  |
| 10        | Ranh giới service và quyền sở hữu dữ liệu                                                  | Catalog sở hữu menu/category/table/area/QR/stock; Order sở hữu session/cart/order/bill; Kitchen sở hữu KDS Redis projection; Payment sở hữu payment record/audit/config/outbox; SaaS sở hữu tenant/plan/subscription; User-Access sở hữu profile/roles/permissions; Authorizer xác thực JWT/OIDC qua gRPC. | Đây là bằng chứng trọng tâm cho Microservices thật: service owner + data owner + không cross-service DB.         |
| 11        | Phần 3 - Cô lập tenant và kiểm soát truy cập                                               | Section divider: Tenant Isolation & RBAC từ xác thực, context propagation đến database.                                                                                                                                                                                                                    | Câu hỏi dẫn: nhiều nhà hàng dùng chung nền tảng thì làm sao không lẫn dữ liệu/quyền.                             |
| 12        | Mô hình tác nhân và truy cập trong nền tảng POS                                            | Tác nhân có tài khoản: staff/manager/owner qua Keycloak JWT/OIDC. Tác nhân theo phiên: customer tại bàn qua QR token/session. Hệ thống bên ngoài: SePay/VietQR webhook/callback.                                                                                                                           | Phân biệt "ai đang gọi" trước khi nói "được làm gì".                                                             |
| 13        | Xác thực & phân quyền trong mô hình SaaS                                                   | 5 lớp: authentication xác định tác nhân; tenant/session scope giới hạn dữ liệu; RBAC kiểm tra quyền hành động; plan entitlement kiểm tra tính năng; data ownership service quyết định thao tác hợp lệ. Ví dụ Owner xem báo cáo qua 5 lớp.                                                                  | Không gộp mọi thứ thành authorization; mỗi lớp chặn một loại rủi ro khác nhau.                                   |
| 14        | Cơ chế cô lập tenant trong QRTable                                                         | Database theo service, tenant dùng chung bảng qua `tenant_id`; 1 ràng buộc ngữ cảnh tenant; 2 xác thực tại BFF; 3 lan truyền qua TCP/gRPC contract và event; 4 áp dụng tại database, Redis key, WebSocket room.                                                                                            | Tenant isolation không chỉ là cột `tenant_id`; đó là đường đi context end-to-end.                                |
| 15        | Phần 4 - Phối hợp giữa các service và các bài toán phân tán                                | Section divider: eventual consistency qua Saga orchestration, transactional outbox, idempotency và KDS projection trên Redis.                                                                                                                                                                              | Nêu vấn đề: khi đã tách DB/service, phối hợp trạng thái là trọng tâm kỹ thuật.                                   |
| 16        | Mô hình giao tiếp giữa các service và ứng dụng                                             | TCP/gRPC cho phản hồi ngay; Kafka cho event sau commit; WebSocket + Redis Pub/Sub cho cập nhật realtime; webhook qua BFF cho callback ngoài hệ thống. Ví dụ Order-Catalog, BFF-Authorizer, Order-Kitchen, Kitchen-BFF.                                                                                     | Trình bày theo tiêu chí chọn kênh trước, công nghệ sau.                                                          |
| 17        | Nhất quán dữ liệu phân tán trên nhiều local transaction                                    | So sánh một giao dịch cục bộ với nhiều giao dịch cục bộ; ba cơ chế nền tảng: idempotency, transactional outbox, deduplication. Bảng flow/risk/solution cho cart, submit, KDS, payment, confirm order.                                                                                                      | Phân biệt ACID cục bộ, eventual consistency và các primitive; dẫn tới Saga.                                      |
| 18        | Giải pháp Saga pattern trong transaction phân tán                                          | Saga là chuỗi local transaction; compensation là giao dịch nghiệp vụ mới. So sánh choreography và orchestration.                                                                                                                                                                                           | Saga không phải rollback ACID toàn hệ thống; orchestration được chọn để giữ luồng confirm rõ.                    |
| 19        | Áp dụng Orchestration Saga trong luồng xác nhận đơn                                        | Cụ thể hóa luồng xác nhận đơn bằng sequence diagram rút gọn; bảo vệ bất biến tồn kho tại mốc xác nhận đơn.                                                                                                                                                                                                 | Đây là case study chính: Order orchestrator, Catalog owner stock, Kitchen sau `order.confirmed`.                 |
| 20        | Cơ chế bù trừ của Orchestration Saga trong nhánh lỗi                                       | Bảng lỗi: order/bill invalid; Catalog business error; Catalog deduct thành công nhưng Order commit/outbox lỗi; compensation fail; lost response retry; release lặp/trễ trả `REPLAYED`/`STALE`.                                                                                                             | Không đọc hết bảng; chọn các nhánh chứng minh compensation + idempotency + versioning.                           |
| 21        | Quản lý dữ liệu realtime trên hệ thống phân tán                                            | Order -> Kafka -> Kitchen; Redis lưu KDS projection bằng Hash/Set/Sorted Set; Redis Pub/Sub + WebSocket phát hint để client refetch.                                                                                                                                                                       | WebSocket chỉ hint/refetch, Redis là KDS projection runtime, Order vẫn là source of truth nghiệp vụ.             |
| 22        | Phần 5 - Kết quả kiểm chứng và hướng phát triển                                            | Section divider: traceability matrix, unit/contract/integration, giới hạn kỹ thuật và hướng phát triển load test/live payment/Saga hardening.                                                                                                                                                              | Chuyển từ cơ chế sang bằng chứng đa lớp.                                                                         |
| 23        | Các lớp kiểm chứng kỹ thuật                                                                | Lớp sản phẩm: PWA/POS/KDS/payment. Lớp kiến trúc: sơ đồ/boundary/source ownership. Lớp kiểm thử: unit/contract/integration cho consistency/retry/compensation. Lớp trạng thái/vận hành: PostgreSQL/MongoDB, Redis Insight, Kafkio.                                                                         | Nhấn: demo UI không đủ, cần architecture + tests + runtime state.                                                |
| 24        | Một số kết quả kiểm thử quan trọng của Orchestration Saga - Race Condition                 | Hai khách đặt phần ăn cuối cùng đồng thời; kết quả đúng một order PROCESSING, order còn lại bị thiếu kho, stock về 0 và chỉ tạo đúng một event.                                                                                                                                                            | Invariant: không âm kho khi cạnh tranh liên service.                                                             |
| 25        | Một số kết quả kiểm thử quan trọng của Orchestration Saga - Lost Response Recovery         | Catalog deduct thành công nhưng mất phản hồi; retry thành công nhưng Catalog chỉ trừ kho đúng một lần.                                                                                                                                                                                                     | Invariant: retry/lost response không tạo side effect lặp.                                                        |
| 26        | Một số kết quả kiểm thử quan trọng của Orchestration Saga - Stale Release Prevention       | Release version cũ đến trễ sau reservation mới; Catalog đánh dấu STALE để không release nhầm.                                                                                                                                                                                                              | Invariant: compensation trễ không phá trạng thái hiện hành.                                                      |
| 27        | Một số kết quả kiểm thử quan trọng của Orchestration Saga - Idempotency                    | Payload trùng lặp trả `REPLAYED`, bảo toàn stock chỉ biến động một lần.                                                                                                                                                                                                                                    | Invariant: duplicate request không tạo kết quả nghiệp vụ ngoài ý muốn.                                           |
| 28        | Một số kết quả kiểm thử quan trọng của Orchestration Saga - Rollback khi lỗi ghi DB nội bộ | Catalog đã trừ kho, Order ghi state/outbox lỗi; Saga kích hoạt compensating transaction để release stock.                                                                                                                                                                                                  | Phân biệt rollback cục bộ và compensation liên service.                                                          |
| 29        | Một số kết quả kiểm thử quan trọng của Orchestration Saga - Commit failure compensation    | Lỗi ở bước commit cuối của transaction DB; hệ thống kích hoạt bồi hoàn/hủy thay đổi bên Catalog.                                                                                                                                                                                                           | Nói như biến thể commit-boundary của compensation; không claim tự phục hồi tuyệt đối.                            |
| 30        | Một số kết quả kiểm thử quan trọng của Orchestration Saga - Commit failure compensation    | Nội dung đang trùng Slide 29 trong bản paste.                                                                                                                                                                                                                                                              | Trước freeze nên gộp hoặc đổi thành evidence visual/test detail, tránh đọc lặp.                                  |
| 31        | Kiểm thử Order Service & trực quan hóa qua Allure Report                                   | 12 test Saga/concurrency; 53 Cart/Session/Submit; 28 Bill/Payment events; 17 Order State/KDS; 26 Business/Utils.                                                                                                                                                                                           | Chỉ dùng số sau khi đã reconcile Allure artifact; nhấn phân nhóm test theo rủi ro.                               |
| 32        | Kiểm thử SaaS Service & trực quan hóa qua Allure Report                                    | 16 Tenant Onboarding Saga; 18 Subscription/Pricing; 12 Tenant Lifecycle/Suspend; 10 Invoice/Payment Webhook; 4 Config/Outbox publisher.                                                                                                                                                                    | SaaS có evidence riêng nhưng không kéo SaaS onboarding thành case study chính.                                   |
| 33        | Vận hành và theo dõi Kafka Sluster qua Kafkio                                              | Giám sát dòng event streaming của Kafka Cluster bằng Kafkio.                                                                                                                                                                                                                                               | Bản PDF hiện ghi `SLUSTER`; nên sửa typo thành `CLUSTER` trước khi freeze deck cuối.                             |
| 34        | Vận hành và theo dõi Redis qua Redis Insight                                               | Trực quan hóa in-memory state cho KDS, QR session và tenant-scoped Redis data.                                                                                                                                                                                                                             | Redis Insight chứng minh projection/session state; không gọi Redis là source of truth nghiệp vụ.                 |
| Demo      | Demo sản phẩm                                                                              | Demo riêng sau phần trình bày.                                                                                                                                                                                                                                                                             | Bám `QR -> Cart -> Order -> KDS -> Payment`; có fallback screenshot/state/log/test.                              |
| 35        | Kết luận và hướng phát triển của QRTable                                                   | Kết quả đạt được: luồng SaaS POS QR-to-payment, service/data ownership + tenant isolation/access control, consistency/Saga/KDS realtime/payment/evidence. Hướng phát triển: performance/load/availability, full production deployment evidence, Saga recovery/fault injection/reconciliation/alerting.     | Kết luận quay lại tên đề tài, không kết thúc bằng backlog sản phẩm.                                              |
| Thank you | Thank You                                                                                  | Thông tin liên hệ: Vo Dinh Minh Quan, phone/email/website.                                                                                                                                                                                                                                                 | Không thêm claim kỹ thuật mới; chuyển sang Q&A.                                                                  |

---

## Kịch bản chi tiết theo cụm

> Các mục `Slide X` bên dưới nối tiếp mạch slide thực tế hiện tại nhưng vẫn giữ lại một số đoạn diễn giải sâu từ bản trước. Khi title hoặc số slide chi tiết khác bảng canonical ở trên, ưu tiên bảng canonical và dùng đoạn tương ứng như lời thuyết trình/Q&A, không xem đó là một phần bổ sung tách rời.

## Kịch bản chi tiết theo cụm

## Slide 1. Khóa luận tốt nghiệp

### Dán lên slide

**Nhãn phần (góc trên phải):** `00 · BÌA`

**Tiêu đề:** Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices

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

---

## Slide 2. Nội dung trình bày

### Dán lên slide

**Nhãn phần (góc trên phải):** `00 · NỘI DUNG TRÌNH BÀY`

**Tiêu đề:** Nội dung trình bày

**Lộ trình 5 phần:**

1. **Bài toán POS theo mô hình SaaS tích hợp đặt món qua QR**
   Xác định thách thức khi vận hành luồng POS đa tác nhân và ngăn ngừa rủi ro dữ liệu trên nền tảng dùng chung cho nhiều nhà hàng độc lập.
2. **Quyết định kiến trúc Microservices**
   Phân rã hệ thống theo ranh giới nghiệp vụ và quyền sở hữu dữ liệu, đồng thời chấp nhận chi phí giao tiếp phân tán để làm rõ trách nhiệm service.
3. **Cô lập tenant và kiểm soát truy cập**
   Thiết lập ranh giới cô lập dữ liệu và kiểm soát truy cập từ xác thực, lan truyền ngữ cảnh đến mức database.
4. **Phối hợp giữa các service và các bài toán phân tán**
   Đảm bảo consistency qua Saga orchestration, transactional outbox, idempotency và KDS runtime projection trên Redis.
5. **Kết quả kiểm chứng và hướng phát triển**
   Đối chiếu tính đúng đắn bằng bộ bằng chứng đa lớp và xác định giới hạn kỹ thuật làm cơ sở phát triển.

### Bố cục / hình ảnh

- Vẽ timeline ngang 5 cột.
- Mỗi cột chỉ 1 cụm từ chính, icon nhỏ.
- Không đặt nhiều paragraph trên slide.
- Giữ đúng 5 nhãn `01` đến `05` như nguồn cho section marker ở các phần tiếp theo.

### Logic cần hiểu

Lộ trình giúp người nghe biết trước bài nói không đi theo danh sách màn hình UI, mà đi theo lập luận: vấn đề -> thiết kế -> cơ chế -> bằng chứng.

### Kịch bản thuyết trình chi tiết

"Bố cục bài trình bày gồm năm phần và đều quay quanh tên đề tài: một nền tảng POS theo mô hình SaaS, có đặt món qua QR, được xây dựng trên kiến trúc Microservices. Phần đầu tiên trả lời câu hỏi vì sao bài toán này không chỉ là một giao diện POS quen thuộc. Khi có nhiều nhà hàng, nhiều tác nhân và một luồng từ QR đến thanh toán, hệ thống phải bảo vệ đúng tenant, đúng phiên, đúng trạng thái đơn hàng và đúng điểm bàn giao giữa khách, nhân viên, bếp và thanh toán.

Phần thứ hai trình bày quyết định kiến trúc Microservices. Ở đây em không trình bày Microservices như một lựa chọn luôn tốt hơn, mà như một quyết định có đánh đổi: đổi lại ranh giới trách nhiệm và quyền sở hữu dữ liệu rõ hơn, hệ thống phải xử lý chi phí giao tiếp phân tán. Phần thứ ba đi sâu vào hệ quả trực tiếp của mô hình SaaS: nhiều nhà hàng dùng chung nền tảng nên access control và tenant isolation phải được giữ xuyên suốt từ xác thực, request context đến database và Redis key.

Phần thứ tư là phần kỹ thuật trọng tâm: khi các service sở hữu dữ liệu riêng, hệ thống phối hợp bằng kênh giao tiếp nào, giữ consistency bằng cơ chế nào, xử lý retry/duplicate ra sao, và dùng Saga orchestration như thế nào ở luồng xác nhận đơn. Phần cuối cùng là phần kiểm chứng: thay vì chỉ demo UI, em đối chiếu hệ thống qua sản phẩm, kiến trúc, kiểm thử tự động, trạng thái vận hành và các công cụ như Allure, Kafkio, Redis Insight. Như vậy, bài trình bày đi theo mạch vấn đề -> quyết định thiết kế -> cơ chế -> bằng chứng."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-defense-deck-methodology-plan.md`
- `docs/graduation-thesis-resources/thesis-defense-slide-content-guide.md`

### Không nói quá

- Không biến roadmap thành danh sách tính năng marketing.

---

---

## Slide 3. Bài toán POS theo mô hình SaaS tích hợp đặt món qua QR

### Dán lên slide

**Nhãn phần (góc trên phải):** `01 · BÀI TOÁN POS THEO MÔ HÌNH SAAS TÍCH HỢP ĐẶT MÓN QUA QR`

**Tiêu đề:** Phần 1 - Bài toán POS theo mô hình SaaS tích hợp đặt món qua QR

**Nội dung trực tiếp trên slide:**

Xác định thách thức khi vận hành luồng POS đa tác nhân và ngăn ngừa rủi ro dữ liệu trên nền tảng dùng chung (SaaS) cho nhiều nhà hàng độc lập.

### Bố cục / hình ảnh

- Nền tối học thuật, chữ "PHẦN 1" lớn ở trung tâm.

### Logic cần hiểu

Chuyển tiếp giới thiệu Phần 1, nói ngắn gọn để người nghe hiểu bối cảnh và bài toán nghiệp vụ F&B.

### Kịch bản thuyết trình chi tiết

"Kính thưa Hội đồng, phần đầu tiên của bài báo cáo sẽ đi vào làm rõ bối cảnh nghiệp vụ F&B và bài toán đặt món qua QR trong mô hình SaaS. Đây là cơ sở thực tế giúp nhóm xác định các thách thức vận hành đa tác nhân và thiết lập các bất biến an toàn dữ liệu trên một nền tảng dùng chung cho nhiều nhà hàng độc lập."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`

---

## Slide 4. Điểm khác biệt của QRTable

### Dán lên slide

**Nhãn phần (góc trên phải):** `01 · BÀI TOÁN POS THEO MÔ HÌNH SAAS TÍCH HỢP ĐẶT MÓN QUA QR`

**Tiêu đề:** Điểm khác biệt của QRTable

**Luận điểm chính trên slide:**

Một giao diện POS có thể quen thuộc; độ khó nằm ở việc nhiều nhà hàng và nhiều tác nhân cùng tham gia một luồng trạng thái.

**Bốn điểm khác biệt:**

1. Một nền tảng phục vụ nhiều nhà hàng.
2. Nhiều khách cùng gọi món tại một bàn.
3. Giỏ món, đơn hàng, bếp và thanh toán có các mốc bàn giao rõ ràng.
4. Yêu cầu gửi lại hoặc lỗi giữa chừng không được tạo kết quả sai.

### Bố cục / hình ảnh

- Giữ đúng tinh thần slide PDF: một câu luận điểm lớn và bốn cụm ngắn.
- Có thể minh họa bằng bốn icon nhỏ: tenant/restaurant, shared table, handoff/status, retry/error safety.
- Không biến slide này thành bảng kỹ thuật dài; phần invariant và cơ chế sẽ được giải thích ở các slide sau.

### Logic cần hiểu

Slide này là cầu nối từ section divider sang luồng nghiệp vụ. Điểm cần nhấn không phải QRTable có POS UI, mà là POS UI này nằm trong nền tảng SaaS nhiều nhà hàng, nhiều người cùng bàn và nhiều mốc chuyển trạng thái. Vì vậy, retry, duplicate request hoặc lỗi giữa chừng không được làm sai dữ liệu.

### Kịch bản thuyết trình chi tiết

"Điểm khác biệt của QRTable không nằm ở việc có một giao diện POS nhìn quen thuộc. Độ khó kỹ thuật nằm ở phía sau giao diện đó: cùng một nền tảng phục vụ nhiều nhà hàng độc lập, nhiều khách có thể cùng thao tác trong một phiên bàn, và trạng thái đơn hàng phải đi qua các mốc rõ ràng từ giỏ món, xác nhận đơn, bếp cho đến thanh toán.

Nếu các mốc này không được kiểm soát, hệ thống có thể gặp các lỗi rất thực tế: khách gửi lại request, nhân viên xác nhận lại do mất phản hồi, hoặc một bước giữa chừng đã ghi dữ liệu nhưng bước sau thất bại. Vì vậy, QRTable phải bảo vệ đúng tenant, đúng phiên, đúng trạng thái và không tạo thêm kết quả nghiệp vụ ngoài ý muốn khi có retry hoặc lỗi tạm thời.

Từ điểm khác biệt này, slide tiếp theo trình bày luồng nghiệp vụ từ quét QR đến thanh toán để thấy các mốc bàn giao trạng thái cụ thể."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
- `docs/testing/phase-5/traceability-matrix.md`

### Không nói quá

- Không nói QRTable khác biệt vì UI POS mới lạ.
- Không đi sâu Saga/Outbox/Redis ở slide này; chỉ đặt vấn đề để dẫn tới phần kiến trúc.

---

---

## Slide 5. Luồng nghiệp vụ từ quét QR đến thanh toán

### Dán lên slide

**Nhãn phần (góc trên phải):** `01 · BỐI CẢNH F&B & QR-TO-PAYMENT`

**Tiêu đề:** Luồng nghiệp vụ từ quét QR đến thanh toán

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

---

## Slide 6. Mục tiêu và phạm vi khóa luận

### Dán lên slide

**Nhãn phần (góc trên phải):** `02 · MỤC TIÊU, PHẠM VI, TÁC NHÂN & TRƯỜNG HỢP SỬ DỤNG`

**Tiêu đề:** Mục tiêu và phạm vi khóa luận

**Lời nói bổ trợ:**

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

---

## Slide 7. Quyết định kiến trúc Microservices

### Dán lên slide

**Nhãn phần (góc trên phải):** `02 · QUYẾT ĐỊNH KIẾN TRÚC MICROSERVICES`

**Tiêu đề:** Quyết định kiến trúc Microservices

**Nội dung trực tiếp trên slide:**

Phân rã hệ thống thành các microservices độc lập theo ranh giới nghiệp vụ và quyền sở hữu dữ liệu, chấp nhận chi phí giao tiếp phân tán để làm rõ trách nhiệm service.

### Bố cục / hình ảnh

- Đây là section divider của Phần 2, không phải slide giải thích chi tiết.
- Giữ ít chữ, dùng đúng câu mô tả trên PDF.
- Dùng slide này để chuyển từ bài toán POS SaaS QR sang quyết định kiến trúc.

### Kịch bản thuyết trình chi tiết

"Sau khi đã xác định bài toán và phạm vi, phần tiếp theo trình bày quyết định kiến trúc trọng tâm của QRTable. Hệ thống được phân rã thành các microservices độc lập theo ranh giới nghiệp vụ và quyền sở hữu dữ liệu.

Điểm quan trọng là đây không phải lựa chọn công nghệ cho đẹp. QRTable chấp nhận chi phí giao tiếp phân tán để đổi lại trách nhiệm service rõ hơn: service nào sở hữu dữ liệu nào, service nào được phép quyết định trạng thái nào, và khi có lỗi giữa chừng thì ranh giới xử lý nằm ở đâu."

### Không nói quá

- Không nói Microservices luôn tốt hơn Monolith trong mọi bối cảnh.

---

---

## Slide 8. Lựa chọn kiến trúc Microservices

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`

**Tiêu đề:** Lựa chọn kiến trúc Microservices

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

---

## Slide 9. Kiến trúc tổng thể của QRTable

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`

**Tiêu đề:** Kiến trúc tổng thể của QRTable

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

---

## Slide 10. Ranh giới service và quyền sở hữu dữ liệu

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · KIẾN TRÚC QRTABLE VÀ RANH GIỚI DỊCH VỤ`

**Tiêu đề:** Ranh giới service và quyền sở hữu dữ liệu

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

---

## Slide 11. Cô lập tenant và kiểm soát truy cập

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · CÔ LẬP TENANT VÀ KIỂM SOÁT TRUY CẬP`

**Tiêu đề:** Phần 3 - Cô lập tenant và kiểm soát truy cập

**Nội dung trực tiếp trên slide:**

Thiết lập ranh giới cô lập dữ liệu và kiểm soát truy cập (Tenant Isolation & RBAC) từ khâu xác thực, lan truyền ngữ cảnh (Context Propagation) đến mức database.

### Bố cục / hình ảnh

- Đây là section divider của Phần 3, không chứa hình ảnh phức tạp.
- Nền tối học thuật, chữ "PHẦN 3" lớn ở trung tâm.

### Logic cần hiểu

Chuyển tiếp từ quyết định ranh giới service sang cách cô lập tenant và phân quyền truy cập khi nhiều nhà hàng dùng chung một hệ thống microservices.

### Kịch bản thuyết trình chi tiết

"Sau khi đã làm rõ ranh giới các dịch vụ miền nghiệp vụ, phần thứ ba sẽ đi vào giải thích cơ chế cô lập đơn vị thuê bao và kiểm soát truy cập trong hệ thống. Nhiều nhà hàng độc lập cùng dùng chung một cơ sở hạ tầng SaaS, do đó việc cô lập dữ liệu là một bất biến an toàn cực kỳ quan trọng của hệ thống. Chúng em tiếp cận cơ chế này từ khâu xác thực tại lớp biên, lan truyền ngữ cảnh tin cậy, cho đến việc thực thi truy vấn an toàn ở mức database."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

### Không nói quá

- Không nói đã kiểm chứng toàn bộ các trường hợp truy cập chéo tenant trên môi trường production.

---

## Slide 12. Mô hình tác nhân và truy cập trong nền tảng POS

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · CÔ LẬP TENANT VÀ KIỂM SOÁT TRUY CẬP`

**Tiêu đề:** Mô hình tác nhân và truy cập trong nền tảng POS

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

---

## Slide 13. Xác thực & phân quyền trong mô hình SaaS

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · CÔ LẬP TENANT VÀ KIỂM SOÁT TRUY CẬP`

**Tiêu đề:** Xác thực & phân quyền trong mô hình SaaS

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

---

## Slide 14. Xác thực & phân quyền trong mô hình SaaS (Sơ đồ)

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · CÔ LẬP TENANT VÀ KIỂM SOÁT TRUY CẬP`

**Tiêu đề:** Sơ đồ luồng xác thực & phân quyền trong mô hình SaaS

**Nội dung trực tiếp trên slide:**

(Sơ đồ biểu diễn luồng xác thực Staff/Admin qua Keycloak JWT/OIDC và Customer qua phiên QR token, hội tụ tại BFF và truyền ngữ cảnh nội bộ sang các dịch vụ miền).

### Bố cục / hình ảnh

- Trực quan hóa hình `chapter4-security-auth-flow.png` được rút gọn.
- Chỉ hiển thị các actor chính, BFF Gateway, và các domain service nội bộ.

### Logic cần hiểu

Client không bao giờ gọi trực tiếp dịch vụ miền; BFF là chốt chặn xác thực tập trung thiết lập ngữ cảnh tin cậy (`RequestContext`).

### Kịch bản thuyết trình chi tiết

"Kính thưa hội đồng, đây là sơ đồ trực quan hóa luồng xác thực và phân quyền của QRTable. Phía bên trái sơ đồ, chúng em tách biệt rõ ràng hai luồng đăng nhập: nhân viên nhà hàng đi qua cổng Keycloak JWT/OIDC để lấy token định danh dài hạn, trong khi khách tại bàn đi qua QR token động để khởi tạo phiên phục vụ ngắn hạn. Cả hai luồng này đều phải hội tụ tại BFF ở biên hệ thống. BFF đóng vai trò là API Gateway, thực thi các guard kiểm tra tính hợp lệ của token và phiên, sau đó đóng gói danh tính và ngữ cảnh tenant vào RequestContext nội bộ để truyền qua giao thức gRPC hoặc TCP sang các domain service phía sau."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-security-auth-flow.png`
- `libs/guards/src/lib/user.guard.ts`

### Không nói quá

- Không nói hệ thống đã áp dụng mTLS giữa mọi service nội bộ.

---

## Slide 15. Cơ chế cô lập tenant trong QRTable

### Dán lên slide

**Nhãn phần (góc trên phải):** `03 · CÔ LẬP TENANT VÀ KIỂM SOÁT TRUY CẬP`

**Tiêu đề:** Cơ chế cô lập tenant trong QRTable

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

---

## Slide 16. Phối hợp giữa các service và các bài toán phân tán

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · PHỐI HỢP GIỮA CÁC SERVICE VÀ CÁC BÀI TOÁN PHÂN TÁN`

**Tiêu đề:** Phần 4 - Phối hợp giữa các service và các bài toán phân tán

**Nội dung trực tiếp trên slide:**

Đảm bảo nhất quán dữ liệu phân tán (Eventual Consistency) qua cơ chế Saga Orchestration, Transactional Outbox, Idempotency và bản chiếu vận hành KDS trên Redis.

### Bố cục / hình ảnh

- Nền tối học thuật, chữ "PHẦN 4" lớn ở trung tâm.

### Logic cần hiểu

Chuyển sang phần giải thích cơ chế phối hợp dữ liệu liên dịch vụ khi không có cơ sở dữ liệu dùng chung và giao dịch ACID toàn cục.

### Kịch bản thuyết trình chi tiết

"Kính thưa Hội đồng, sau khi đã thiết lập được cơ chế cô lập dữ liệu người dùng và kiểm soát truy cập đa thuê bao ở Phần 3, câu hỏi tiếp theo đặt ra là: _Làm thế nào để phối hợp nghiệp vụ giữa các vi dịch vụ độc lập này một cách trơn tru?_ Ở Phần 4, em xin trình bày về các giải pháp kỹ thuật giải quyết bài toán giao tiếp và đảm bảo tính nhất quán dữ liệu phân tán (distributed consistency) cho nền tảng SaaS POS của chúng em. Khi cơ sở dữ liệu đã phân rã theo từng dịch vụ riêng biệt, chúng em không còn giao dịch ACID toàn cục nữa. Do đó, hệ thống bắt buộc phải áp dụng các mẫu thiết kế phân tán như Saga Orchestration, Transactional Outbox để duy trì bất biến nghiệp vụ khi khách đặt món qua QR, nhân viên xác nhận đơn hàng và bếp chế biến theo thời gian thực."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`

### Không nói quá

- Không nói hệ thống đã tối ưu hóa hiệu năng phân tán.

---

## Slide 17. Mô hình giao tiếp giữa các service và ứng dụng

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Mô hình giao tiếp giữa các service và ứng dụng

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

---

## Slide 18. Mô hình giao tiếp giữa các service và ứng dụng (Sơ đồ)

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · PHỐI HỢP GIỮA CÁC SERVICE VÀ CÁC BÀI TOÁN PHÂN TÁN`

**Tiêu đề:** Sơ đồ giao tiếp giữa các service và ứng dụng

**Nội dung trực tiếp trên slide:**

(Sơ đồ topology giao tiếp liên dịch vụ: HTTP REST từ Client, WebSocket/Socket.IO phát hint, TCP/gRPC gọi đồng bộ nội bộ, Kafka phát sự kiện miền bất đồng bộ, Redis lưu trữ cache/projection).

### Bố cục / hình ảnh

- Trực quan hóa hình `chapter4-communication-topology.png` được rút gọn.
- Làm nổi bật 3 kênh chính: TCP gọi Catalog stock, Kafka phát `order.confirmed` sang Kitchen, WebSocket gửi tín hiệu realtime.

### Logic cần hiểu

Mô hình hóa các liên kết để chứng minh ranh giới dịch vụ được giữ vững qua hợp đồng API rõ ràng.

### Kịch bản thuyết trình chi tiết

"Sơ đồ topology trên slide là minh chứng trực quan cho luồng đi của dữ liệu mà em vừa trình bày. Hội đồng có thể thấy rõ ranh giới cơ sở dữ liệu của từng service được giữ vững: chúng em không hề có bất kỳ kết nối chéo database nào. Khi khách hàng quét QR gửi đơn, request đi từ client qua lớp BFF Auth Guards bảo mật, truyền qua giao thức TCP đồng bộ để Order Service hỏi Catalog Service về tồn kho. Sau khi Order Service hoàn tất giao dịch ghi nhận đơn, sự kiện được đưa vào bảng Outbox rồi đẩy qua Apache Kafka đến Kitchen Service để đưa vào hàng đợi Redis KDS. Toàn bộ sơ đồ này thể hiện một luồng nghiệp vụ khép kín từ lúc khách quét mã gọi món cho đến khi bếp nhận được thông tin, đảm bảo tính phân tách trách nhiệm tối đa."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-communication-topology.png`

### Không nói quá

- Không nói WebSocket dùng để đẩy trực tiếp payload trạng thái nghiệp vụ cồng kềnh.

---

## Slide 19. Nhất quán dữ liệu phân tán trên nhiều local transaction - ba cơ chế nền tảng

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Nhất quán dữ liệu phân tán trên nhiều local transaction

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

"Để hiện thực hóa nền tảng SaaS POS này trên môi trường phân tán, chúng em phải đối mặt với hàng loạt rủi ro về tính bất nhất dữ liệu. Trên slide là ma trận các rủi ro cụ thể của QRTable và cách chúng em giải quyết ở tầng thiết kế.

Với giỏ món dùng chung (shared cart) của nhóm khách tại bàn, chúng em sử dụng `cartVersion` để kiểm soát truy cập đồng thời lạc quan (optimistic concurrency control), ngăn chặn việc ghi đè giỏ món cũ. Với luồng gửi đơn, chúng em sử dụng khóa lũy đẳng (idempotency key) để nhận diện các yêu cầu gửi trùng do lỗi mạng. Tại bếp KDS, kỹ thuật khử trùng lặp (deduplication) giúp ngăn việc tạo phiếu bếp lặp lại khi nhận sự kiện từ Kafka. Với Payment, hệ thống dùng row-level locking, kiểm tra trạng thái hiện tại và ghi Outbox event `payment.completed` để bảo toàn bất biến tiền tệ.

Đặc biệt ở luồng xác nhận đơn hàng và trừ kho, chúng em thiết kế cơ chế giữ chỗ tồn kho bền vững (persistent reservation). Tuy nhiên, cơ chế này chỉ bảo vệ thao tác retry của client chứ không thể tự động xử lý kịch bản Catalog đã trừ kho nhưng Order lưu thất bại. Đây chính là điểm gãy liên dịch vụ (partial failure) đòi hỏi một cơ chế phối hợp mạnh mẽ hơn mà chúng em sẽ phân tích ngay sau đây."

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

---

## Slide 20. Nhất quán dữ liệu phân tán trên nhiều local transaction

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Nhất quán dữ liệu phân tán trên nhiều local transaction

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

"Để Hội đồng dễ hình dung về mặt lý thuyết, trong kiến trúc nguyên khối (Monolith), tính toàn vẹn dữ liệu được đảm bảo hoàn toàn bởi giao dịch ACID cục bộ trên một database duy nhất. Tuy nhiên, khi chuyển sang kiến trúc vi dịch vụ (Microservices), tính toàn vẹn này bị phá vỡ vì mỗi dịch vụ (như Order, Catalog, Payment) sở hữu một cơ sở dữ liệu riêng. Khi một quy trình nghiệp vụ đi qua nhiều dịch vụ, chúng ta sẽ có nhiều giao dịch cục bộ riêng biệt chạy độc lập và không thể dùng chung một giao dịch ACID.

Để hỗ trợ việc xử lý phân tán, QRTable sử dụng ba vũ khí nền tảng:
Thứ nhất là tính lũy đẳng (Idempotency) giúp đảm bảo gửi lại yêu cầu nhiều lần không sinh ra tác dụng phụ trùng lặp.
Thứ hai là mẫu thiết kế Transactional Outbox giúp lưu trữ event cần phát vào cùng giao dịch với dữ liệu nghiệp vụ, loại bỏ rủi ro mất sự kiện khi mạng lỗi.
Thứ ba là cơ chế khử trùng lặp (Deduplication) ở phía tiêu thụ sự kiện.

Mặc dù ba công cụ này kiểm soát tốt các thao tác gửi lại, chúng vẫn chưa thể giải quyết triệt để kịch bản lỗi từng phần (partial failure) khi một dịch vụ đã thực hiện thành công nhưng dịch vụ tiếp theo bị sập. Đó là lúc chúng em cần áp dụng Saga Pattern."

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

---

## Slide 21. Giải pháp Saga Pattern trong transaction phân tán

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Giải pháp Saga Pattern trong transaction phân tán

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

---

## Slide 22. Áp dụng Orchestration Saga trong luồng xác nhận đơn

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Áp dụng Orchestration Saga trong luồng xác nhận đơn

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

"Để hiện thực hóa quyết định điều phối trên, đây là biểu đồ tuần tự (Sequence Diagram) rút gọn của luồng Xác nhận đơn hàng thành công. Quy trình chạy qua 3 khối xử lý chính:

**Đầu tiên là giai đoạn mở đầu tại Order Service:** Khi nhân viên xác nhận đơn tại POS, request đi qua BFF để gán ngữ cảnh tenant và quyền hạn. Order Service lập tức mở giao dịch cục bộ, thực hiện khóa dòng đơn hàng (Order Lock) để chống tranh chấp đồng thời, đồng thời xác thực trạng thái đơn hàng.

**Thứ hai là giai đoạn giữ chỗ tồn kho tại Catalog Service:** Nếu đơn hàng hợp lệ, Order gọi Catalog Service qua TCP kèm theo một reservation key duy nhất. Catalog Service sẽ tự mở giao dịch của riêng mình, khóa và tạo bản ghi giữ chỗ (`stock_reservations`) kèm theo trạng thái tồn kho thực tế, sau đó commit và trả về mã trạng thái `APPLIED` cùng số phiên bản `reservationVersion`.

**Cuối cùng là giai đoạn cam kết và phát sự kiện:** Khi nhận được phiên bản giữ kho thành công, Order Service mới thực hiện lưu version này vào đơn hàng, chuyển trạng thái đơn sang `PROCESSING`, ghi nhận sự kiện `order.confirmed` vào bảng Outbox và commit giao dịch tại Order DB. Lúc này, luồng đồng bộ kết thúc và trả về kết quả thành công cho POS. Tiếp theo đó, tiến trình bất đồng bộ Outbox Relay mới quét sự kiện này đẩy qua Kafka để Kitchen Service tiêu thụ và dựng hàng đợi bếp KDS.

Cơ chế này đảm bảo: Tồn kho chỉ được trừ khi Catalog xác nhận, và bếp chỉ làm việc khi Order đã lưu trữ thành công. Slide tiếp theo sẽ trình bày cách hệ thống tự khôi phục khi gặp sự cố tại các điểm gãy trong chu kỳ này."

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

---

## Slide 23. Cơ chế bù trừ của Orchestration Saga trong việc xử lý các nhánh lỗi

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Cơ chế bù trừ của Orchestration Saga trong việc xử lý các nhánh lỗi

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

"Như em đã đề cập, giá trị thực sự của Saga nằm ở khả năng kiểm soát các nhánh lỗi để bảo vệ tính toàn vẹn của dữ liệu kho hàng. Trong QRTable, chúng em xử lý 3 kịch bản lỗi chính dựa trên bảng đối chiếu này:

**Một là lỗi ở bước xác thực sớm (Early Validation):** Nếu đơn hàng hoặc hóa đơn không hợp lệ, hệ thống từ chối ngay trước khi gọi Catalog, hoàn toàn không phát sinh tác dụng phụ.

**Hai là lỗi nghiệp vụ từ Catalog:** Nếu món ăn hết hàng, Catalog rollback giao dịch giữ chỗ và trả lỗi về, Order cũng hủy giao dịch của mình mà không cần thực hiện hành động bù trừ.

**Ba là lỗi cam kết cục bộ (Local Commit Failure) - đây là điểm gãy nguy hiểm nhất:** Khi Catalog đã trừ kho thành công và trả về `reservationVersion`, nhưng giao dịch tại Order DB lại bị lỗi (ví dụ nghẽn mạng DB hoặc sập nguồn). Để khắc phục, Order Service lập tức kích hoạt hành động bù trừ (compensation): gọi API hủy giữ chỗ (`releaseForOrder`) kèm đúng `reservationVersion` để Catalog tự động hoàn trả tồn kho về trạng thái cũ.

Để chống lại hiện tượng lỗi mạng làm mất gói tin phản hồi TCP khiến client gửi lại yêu cầu, Catalog áp dụng cơ chế xử lý lũy đẳng (Idempotency Key) trả về `REPLAYED` thay vì trừ kho lần hai. Mọi yêu cầu bù trừ trễ hạn hoặc gửi lặp đều được so khớp phiên bản qua `reservationVersion` để tránh xung đột dữ liệu kho."

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

---

## Slide 24. Quản lý dữ liệu realtime trên hệ thống phân tán

### Dán lên slide

**Nhãn phần (góc trên phải):** `04 · BÀI TOÁN PHÂN TÁN & CƠ CHẾ XỬ LÝ`

**Tiêu đề:** Quản lý dữ liệu realtime trên hệ thống phân tán

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

"Sau khi sự kiện `order.confirmed` được cam kết thành công và phát đi qua Apache Kafka, Kitchen Service sẽ tiêu thụ sự kiện này để cập nhật màn hình bếp KDS thời gian thực.

Để màn hình bếp KDS đạt tốc độ phản hồi cực nhanh dưới 1 mili-giây, chúng em thiết kế bộ nhớ đệm trạng thái (runtime projection) hoàn toàn trong **Redis** thay vì lưu vào cơ sở dữ liệu quan hệ. Chúng em tổ chức dữ liệu bếp một cách khoa học bằng cách kết hợp các cấu trúc dữ liệu của Redis: dùng **Hash** để lưu chi tiết món ăn, **Set** làm chỉ mục tìm nhanh, và đặc biệt là **Sorted Set (ZSet)** để quản lý hàng đợi chế biến theo thứ tự vào trước - ra trước (FIFO) hoặc sắp xếp độ ưu tiên theo thời gian phục vụ (SLA).

Khi trạng thái KDS thay đổi, Kitchen phát sự kiện qua kênh Redis Pub/Sub nội bộ. Lớp BFF nhận tín hiệu này và đẩy một thông báo WebSocket siêu nhẹ (realtime hint) tới các client của nhà hàng. Client khi nhận được hint sẽ tự động gọi API kéo dữ liệu chuẩn (refetch API snapshot). Mô hình 'Hint/Refetch' này giúp hệ thống của chúng em tiết kiệm tối đa băng thông mạng, tránh đẩy các gói tin dữ liệu cồng kềnh qua WebSocket và loại bỏ hoàn toàn rủi ro sai lệch dữ liệu khi mạng chập chờn."

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

---

## Slide 25. Kết quả kiểm chứng và hướng phát triển

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** Phần 5 - Kết quả kiểm chứng và hướng phát triển

**Nội dung trực tiếp trên slide:**

Đánh giá mức độ hoàn thiện của hệ thống thông qua ma trận truy vết yêu cầu kỹ thuật (Traceability Matrix).
Đối chiếu kết quả kiểm thử tự động nhiều lớp (Unit, Contract, Integration) trực tiếp trên codebase.
Xác định giới hạn kỹ thuật hiện tại và vạch rõ hướng nghiên cứu tiếp theo (Load test, Live payment, Saga hardening).

### Bố cục / hình ảnh

- Nền tối học thuật, chữ "PHẦN 5" lớn ở trung tâm.

### Logic cần hiểu

Chuyển tiếp giới thiệu Phần 5 về các kết quả kiểm chứng kỹ thuật của hệ thống.

### Kịch bản thuyết trình chi tiết

"Kính thưa Hội đồng, sau khi đi qua các quyết định kiến trúc và cơ chế xử lý ở các phần trước, phần thứ năm và cũng là phần cuối cùng sẽ trình bày các kết quả kiểm chứng kỹ thuật. Chúng em thực hiện đối chiếu hệ thống qua ma trận truy vết yêu cầu, kiểm thử tự động nhiều lớp từ unit đến integration, trạng thái dữ liệu lưu trữ thực tế, và xác định rõ các ranh giới đánh giá cùng hướng phát triển tiếp theo."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`

---

## Slide 26. Các lớp kiểm chứng kỹ thuật

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** Các lớp kiểm chứng kỹ thuật

**Nội dung trực tiếp trên slide:**

| Lớp kiểm chứng                     | Thành phần hệ thống                                                       | Phương thức xác minh                               |
| :--------------------------------- | :------------------------------------------------------------------------ | :------------------------------------------------- |
| **Sản phẩm**                       | Customer PWA, POS, KDS và luồng thanh toán                                | Hành vi người dùng quan sát được                   |
| **Kiến trúc**                      | Sơ đồ, ranh giới service và mã nguồn thể hiện ownership                   | Trách nhiệm và nguồn trạng thái theo miền          |
| **Kiểm thử**                       | Kiểm thử đơn vị, hợp đồng và tích hợp                                     | Consistency, yêu cầu lặp và bù trừ                 |
| **Trạng thái hệ thống & vận hành** | Bản ghi PostgreSQL (order, bill, outbox), MongoDB & Key-Value trong Redis | Theo dõi trạng thái Cluster Kafka thông qua Kafkio |

### Bố cục / hình ảnh

- Bảng so sánh 3 cột phân chia rõ ràng các lớp kiểm chứng.
- Có thể trực quan hóa thành sơ đồ 4 tầng từ Product -> Architecture -> Testing -> Storage/Operation.

### Logic cần hiểu

Để đánh giá một hệ thống phân tán phức tạp như QRTable, việc kiểm chứng phải được thực hiện đa tầng, từ trải nghiệm bên ngoài đến tính đúng đắn của dữ liệu lưu trữ bên trong cơ sở dữ liệu.

### Kịch bản thuyết trình chi tiết

"Kính thưa Hội đồng, để kiểm chứng hệ thống QRTable, chúng em không chỉ dừng lại ở việc chạy demo giao diện, mà thiết lập một khung đánh giá đa lớp:

- Lớp sản phẩm: Xác minh hành vi nghiệp vụ thông qua các ứng dụng Customer PWA, POS, KDS và luồng thanh toán thực tế.
- Lớp kiến trúc: Đảm bảo ranh giới dịch vụ và quyền sở hữu dữ liệu được tuân thủ nghiêm ngặt trong mã nguồn, không vi phạm import chéo.
- Lớp kiểm thử: Chạy các kịch bản kiểm thử đơn vị, hợp đồng và tích hợp để bảo toàn tính nhất quán (consistency), xử lý yêu cầu lặp và bù trừ (compensation) khi có lỗi.
- Lớp trạng thái hệ thống: Đối chiếu trực tiếp dữ liệu lưu trữ vật lý trong PostgreSQL, MongoDB và Redis, kết hợp theo dõi dòng sự kiện trong Kafka qua Kafkio."

### Nguồn / bằng chứng

- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`

---

## Slide 27. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 1. Race Condition

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** 1. Xử lý Tranh chấp đồng thời món ăn cuối cùng (Race Condition)

**Bài toán (Microservices Concurrency):**

Khi 2 khách hàng đặt món qua QR tại cùng một thời điểm cho 1 phần ăn cuối cùng. Do Order Service và Catalog Service nằm ở 2 DB riêng biệt, làm sao đảm bảo không bị âm kho?

**Mô tả:**

Giả lập 2 yêu cầu gửi đồng thời.

**Kết quả:**

Hệ thống xử lý thành công đúng 1 đơn hàng chuyển sang PROCESSING, đơn hàng thứ 2 bị từ chối với lỗi thiếu kho (CATALOG_STOCK_INSUFFICIENT), kho thực tế về đúng 0 và chỉ tạo đúng 1 bản tin sự kiện.

### Bố cục / hình ảnh

- Trực quan hóa kịch bản chạy song song của 2 yêu cầu, một bên thành công và một bên nhận lỗi thiếu kho.
- Có thể đặt ảnh chụp màn hình code test case race condition ở phụ lục.

### Logic cần hiểu

Race condition ở mức liên dịch vụ được giải quyết bằng lock ở Catalog DB + status check của Order.

### Kịch bản thuyết trình chi tiết

"Kịch bản kiểm thử đầu tiên là xử lý tranh chấp đồng thời cho món ăn cuối cùng. Trong môi trường microservices với 2 database riêng, nếu có hai yêu cầu xác nhận đơn gửi đồng thời cho một phần ăn cuối cùng, nguy cơ là Catalog trừ kho hai lần làm âm kho. Chúng em giả lập kịch bản này bằng cách gửi hai yêu cầu đồng thời. Kết quả là hệ thống xử lý thành công đúng một đơn hàng và chuyển trạng thái sang PROCESSING. Đơn thứ hai lập tức bị từ chối với mã lỗi CATALOG_STOCK_INSUFFICIENT do Catalog kiểm tra và lock dòng tồn kho. Số lượng kho thực tế về đúng 0 và hệ thống chỉ phát duy nhất một outbox event."

### Nguồn / bằng chứng

- `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`

### Không nói quá

- Không claim load tests hoặc high performance concurrency.

---

## Slide 28. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 2. Lost Response Recovery

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** 2. Khôi phục trạng thái khi bị mất phản hồi mạng (Lost Response Recovery)

**Bài toán (Network Fault Tolerance):**

Trong mô hình Microservices, khi Order Service gửi yêu cầu trừ kho sang Catalog Service thành công nhưng phản hồi mạng chiều về bị mất. Khi nhân viên nhấn xác nhận lại (Retry), hệ thống làm sao tránh trừ kho lần 2?

**Mô tả:**

Giả lập đứt mạng đột ngột chiều về.

**Kết quả:**

Lượt gọi lại thứ 2 (retry) của Saga xác nhận đơn hàng thành công mà kho của Catalog chỉ bị trừ đúng 1 lần duy nhất (đảm bảo tính ổn định - Idempotency).

### Bố cục / hình ảnh

- Vẽ sơ đồ có đứt gãy chiều về từ Catalog đến Order, sau đó caller retry, Catalog nhận diện idempotency key và trả về REPLAYED.

### Logic cần hiểu

Idempotency ở Catalog (dùng persistent reservation) giải quyết lost response.

### Kịch bản thuyết trình chi tiết

"Kịch bản thứ hai giải quyết sự cố mất phản hồi mạng ở chiều về. Khi Order gửi yêu cầu trừ kho sang Catalog thành công, nhưng phản hồi chiều về bị mất do sự cố mạng, Order sẽ rollback transaction nội bộ và giữ đơn ở trạng thái PENDING. Khi nhân viên nhấn gửi lại (retry), Order gửi lại đúng yêu cầu đó kèm theo idempotency key ban đầu. Catalog nhận diện key trùng lặp, đọc bản ghi giữ chỗ đã có và trả về trạng thái REPLAYED cùng kết quả cũ mà không trừ kho lần thứ hai. Nhờ đó, Order có thể hoàn tất commit của mình mà kho chỉ bị trừ đúng một lần."

### Nguồn / bằng chứng

- `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`

### Không nói quá

- Không nói exactly-once ở network layer.

---

## Slide 29. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 3. Stale Release Prevention

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** 3. Tăng phiên bản và chặn giải phóng kho trễ (Stale Release Prevention)

**Bài toán (Out-of-order Message Handling):**

Trong kiến trúc hướng sự kiện, gói tin giải phóng kho (release) của phiên bản cũ bị đến trễ sau khi đã có một phiên bản giữ kho mới. Làm sao tránh giải phóng nhầm kho?

**Mô tả:**

Catalog Service tự động phát hiện và đánh dấu STALE (lỗi thời) đối với các gói tin release phiên bản cũ, bảo vệ tính nhất quán dữ liệu tồn kho hiện hành.

### Bố cục / hình ảnh

- Minh họa versioning của reservation, release version cũ bị Catalog từ chối (STALE) khi reservation version hiện tại đã tăng lên.

### Logic cần hiểu

reservationVersion bảo vệ Catalog khỏi các event out-of-order.

### Kịch bản thuyết trình chi tiết

"Kịch bản thứ ba là phòng ngừa các gói tin giải phóng kho cũ bị đến trễ. Khi một đơn hàng bị hủy hoặc bồi hoàn, Order sẽ gửi lệnh release sang Catalog. Nếu lệnh release của một phiên bản cũ bị trễ mạng và đến sau khi Catalog đã xử lý một yêu cầu giữ kho mới hơn, Catalog phải phát hiện được yêu cầu release này đã lỗi thời. Nhờ cơ chế lưu trữ `reservationVersion`, Catalog so khớp version của yêu cầu release với version hiện hành trong DB. Nếu version release nhỏ hơn, Catalog lập tức từ chối và trả về lỗi STALE, ngăn chặn việc giải phóng nhầm kho của phiên bản mới hơn."

### Nguồn / bằng chứng

- `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`

### Không nói quá

- Không claim time-travel hoặc event ordering hoàn hảo ở Kafka.

---

## Slide 30. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 4. Idempotency

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** 4. Đảm bảo chỉ trừ kho một lần duy nhất khi trùng lặp yêu cầu (Idempotency)

**Bài toán (SaaS POS Reliability):**

Đảm bảo an toàn giao dịch cho nhiều nhà hàng (multi-tenant). Khi hạ tầng gửi trùng lặp payload do lỗi mạng truyền thông.

**Mô tả:**

Trả về trạng thái REPLAYED cho lượt gọi trùng lặp, bảo toàn số lượng kho trong DB Catalog chỉ bị biến động 1 lần theo đúng số lượng đơn hàng.

### Bố cục / hình ảnh

- Minh họa request gửi lặp (duplicate payload), Catalog trả về REPLAYED ngay lập tức mà không chạy lại logic deduct.

### Logic cần hiểu

Idempotency đảm bảo an toàn giao dịch đa tenant.

### Kịch bản thuyết trình chi tiết

"Kịch bản thứ tư là đảm bảo tính lũy đẳng tuyệt đối khi nhận yêu cầu trùng lặp. Trong hệ thống multi-tenant, nếu hạ tầng mạng hoặc client gửi trùng lặp yêu cầu trừ kho (do double click hoặc TCP retry), Catalog phải đảm bảo chỉ trừ kho đúng một lần duy nhất. Chúng em giả lập việc gửi trùng lặp payload liên tục. Catalog kiểm tra khóa lũy đẳng, thấy yêu cầu đã được áp dụng và trả về trạng thái REPLAYED cho các lượt gọi sau, đảm bảo số lượng tồn kho trong database chỉ biến động một lần duy nhất theo đúng số lượng thực tế của đơn hàng."

### Nguồn / bằng chứng

- `apps/catalog/src/app/modules/menu-item/tests/stock-reservation.service.spec.ts`

### Không nói quá

- Không claim distributed lock hoàn hảo toàn nền tảng.

---

## Slide 31. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 5. Rollback khi lỗi ghi DB nội bộ

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** 5. Cơ chế bồi hoàn kho (Rollback) khi lỗi ghi DB nội bộ

**Bài toán (Distributed Transaction Failure):**

Saga đã trừ kho bên Catalog thành công, nhưng ghi nhận trạng thái đơn hàng và Outbox Event xuống DB Order bị lỗi (lỗi DB commit).

**Mô tả:**

Saga tự động kích hoạt giao dịch bù đắp (Compensating Transaction) gọi Catalog giải phóng kho đã khóa, đưa hệ thống về trạng thái nhất quán.

### Bố cục / hình ảnh

- Minh họa flow: Catalog deduct -> Order save (FAIL) -> Order calls Catalog release stock (Compensate).

### Logic cần hiểu

Phục hồi trạng thái qua compensating transaction khi local transaction của orchestrator bị fail.

### Kịch bản thuyết trình chi tiết

"Kịch bản thứ năm là kích hoạt cơ chế bù trừ khi xảy ra lỗi cam kết tại Order. Đây là trường hợp Catalog đã trừ kho thành công và trả về version giữ chỗ, nhưng khi quay lại Order Service, việc lưu trạng thái đơn hàng PROCESSING hoặc ghi Outbox Event xuống Order DB bị lỗi (ví dụ do sập nguồn hoặc khóa DB). Lúc này transaction của Order sẽ rollback. Để giải phóng số kho đã bị khóa oan ở Catalog, Order kích hoạt giao dịch bù đắp (compensating transaction) gọi sang Catalog yêu cầu giải phóng kho đã giữ, đưa toàn bộ hệ thống trở về trạng thái nhất quán ban đầu."

### Nguồn / bằng chứng

- `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`

### Không nói quá

- Không claim automatic self-healing trong mọi kịch bản phần cứng sập hoàn toàn.

---

## Slide 32. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 6. Bồi hoàn kho khi Transaction bị từ chối lúc Commit

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** 6. Bồi hoàn kho khi Transaction bị từ chối lúc Commit

**Bài toán (TypeORM Transaction Security):**

Đảm bảo dữ liệu nhất quán ngay cả khi lỗi phát sinh ở bước Commit cuối cùng của Transaction Database.

**Mô tả:**

Hệ thống tự động kích hoạt bồi hoàn và hủy bỏ các thay đổi dữ liệu đã thực hiện trên Catalog.

### Bố cục / hình ảnh

- Sơ đồ khối: Catalog trừ kho -> Order commit transaction bị từ chối -> kích hoạt API release giải phóng kho đã giữ ở Catalog.

### Logic cần hiểu

Đảm bảo dữ liệu nhất quán ở commit step.

### Kịch bản thuyết trình chi tiết

"Kịch bản thứ sáu chứng minh tính an toàn khi giao dịch bị từ chối ở bước cam kết cuối cùng của database. Trong TypeORM, lỗi có thể phát sinh ở khoảnh khắc commit cuối cùng (ví dụ như vi phạm ràng buộc khóa ngoại hoặc mất kết nối DB đột ngột). Mặc dù các kiểm tra trước đó đều hợp lệ, giao dịch của Order vẫn thất bại ở commit step. Hệ thống của chúng em được thiết kế để bắt đúng ngoại lệ này, tự động kích hoạt bồi hoàn trên Catalog Service để giải phóng kho đã giữ, bảo vệ tính nhất quán dữ liệu tồn kho."

### Nguồn / bằng chứng

- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`

### Không nói quá

- Không nói transaction chéo database được đảm bảo bằng 2PC.

---

## Slide 33. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 6. Bồi hoàn kho khi Transaction bị từ chối lúc Commit (Duplicate)

### Dán lên slide

**Nhãn phần (góc trên phải):** `05 · KẾT QUẢ KIỂM CHỨNG & HƯỚNG PHÁT TRIỂN`

**Tiêu đề:** 6. Bồi hoàn kho khi Transaction bị từ chối lúc Commit (Duplicate)

**Bài toán (TypeORM Transaction Security):**

Đảm bảo dữ liệu nhất quán ngay cả khi lỗi phát sinh ở bước Commit cuối cùng của Transaction Database.

**Mô tả:**

Hệ thống tự động kích hoạt bồi hoàn và hủy bỏ các thay đổi dữ liệu đã thực hiện trên Catalog.

### Bố cục / hình ảnh

- (Giữ nguyên cấu trúc giống Slide 32 để đồng bộ với slide PPTX thực tế).

### Logic cần hiểu

Trang duplicate cấu trúc trong slide PDF, nội dung và kịch bản thuyết trình bám sát slide 32.

### Kịch bản thuyết trình chi tiết

"Như đã trình bày ở slide trước, việc bồi hoàn khi lỗi commit transaction cuối được chứng minh qua test case TypeORM. Thiết kế này giúp đóng kín cửa sổ lỗi giữa hai hệ quản trị cơ sở dữ liệu riêng biệt, đảm bảo dữ liệu luôn được bồi hoàn chính xác kể cả khi gặp lỗi ở chặng cam kết cuối cùng."

### Nguồn / bằng chứng

- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`

### Không nói quá

- Giữ nguyên giới hạn kiểm chứng, không claim 2PC.

---

## Slide 34. Kiểm thử Order Service & trực quan hóa qua Allure Report

**Kịch bản thuyết trình:**

"Sau khi trình bày các test case Saga đại diện, slide này cho thấy Order service được kiểm thử theo nhiều nhóm hành vi. Order là service trung tâm của luồng QR-to-Payment: nó quản lý session, cart, submit order, confirm order, bill và bridge với Payment/KDS. Vì vậy các test không chỉ nằm ở happy path, mà còn bao gồm giao dịch phân tán, consistency, state machine và liên dịch vụ.

Khi nhìn Allure Report, điều em muốn Hội đồng thấy không phải là số lượng test để gây ấn tượng, mà là cách test được phân nhóm theo rủi ro kỹ thuật: Saga/concurrency, cart/session/submit, payment event, order state và KDS. Các nhóm này tương ứng với các claim đã trình bày ở phần trước. Trước bản final, số lượng test trên slide cần khớp đúng artifact Allure đang dùng."

---

## Slide 35. Kiểm thử SaaS Service & trực quan hóa qua Allure Report

**Kịch bản thuyết trình:**

"Bên cạnh Order, hệ thống còn có lớp SaaS phục vụ vòng đời tenant, gói dịch vụ, subscription, invoice và outbox. Slide này cho thấy phần nền tảng SaaS cũng có lớp kiểm thử riêng, nhưng em không dùng SaaS onboarding làm case study Saga chính trong phần trình bày. Case study sâu vẫn là Order Confirm Saga, vì nó nối trực tiếp QR ordering, POS, Catalog stock và KDS.

Vai trò của slide này là chứng minh QRTable không chỉ là một POS UI đơn lẻ. Hệ thống có service quản lý nền tảng, kiểm thử tenant lifecycle và subscription/payment webhook ở mức đại diện. Nếu thời gian trình bày ngắn, chỉ nói một câu như vậy rồi chuyển sang evidence vận hành."

---

## Slide 36. Vận hành và theo dõi Kafka Cluster qua Kafkio

**Kịch bản thuyết trình:**

"Các cơ chế event-driven như `order.confirmed`, `payment.completed` hoặc `tenant.created` không chỉ nằm trên sơ đồ. Khi hệ thống chạy, Kafka cluster và topic có thể được quan sát qua Kafkio. Slide này bổ sung lớp hiện vật vận hành: event streaming có trạng thái cluster/topic/consumer có thể kiểm tra được.

Tuy nhiên, em không gọi đây là monitoring production-grade. Kafkio ở đây là bằng chứng hỗ trợ cho luồng event bất đồng bộ trong môi trường demo hoặc kiểm chứng. Nó giúp nối phần kiến trúc với trạng thái hệ thống đang chạy, còn các kết luận về observability đầy đủ, cảnh báo vận hành hoặc SLO cần một phase hardening riêng."

**QA trước freeze:** bản PDF hiện đang ghi `KAFKA SLUSTER`; nên sửa typo thành `KAFKA CLUSTER` trước khi freeze deck cuối.

---

## Slide 37. Vận hành và theo dõi dữ liệu Redis qua Redis Insight

**Kịch bản thuyết trình:**

"Redis Insight giúp trực quan hóa lớp trạng thái khi vận hành của QRTable. Với KDS, Redis lưu projection hàng đợi bằng các cấu trúc như Hash, Set, Sorted Set, deduplication key và revision; với QR session/cart, Redis hỗ trợ hot state theo tenant/table/session. Điều này cho thấy phần realtime không chỉ là giao diện cập nhật nhanh, mà có cấu trúc dữ liệu cụ thể phía sau.

Điểm cần nói rõ là Redis không thay thế database bền vững của service owner. Order vẫn sở hữu vòng đời order/bill/session nghiệp vụ; Catalog vẫn sở hữu stock; Payment sở hữu payment record. Redis phục vụ projection, cache, session hoặc signaling tùy use case. Vì vậy slide này là bằng chứng trạng thái vận hành, không phải tuyên bố Redis là source of truth chung."

---

## Slide 38. Demo sản phẩm

Demo nên được dẫn bằng một câu ngắn: "Sau phần trình bày kỹ thuật, em sẽ minh họa luồng cốt lõi QR -> Cart -> Order -> KDS -> Payment." Nếu demo lỗi, chuyển sang fallback đã chuẩn bị, không debug trực tiếp trên sân khấu.

---

## Slide 39. Kết luận và hướng phát triển của QRTable

**Kịch bản thuyết trình theo slide thực tế:**

"Từ toàn bộ phần trình bày, em rút lại ba kết quả chính. Thứ nhất, QRTable đã hiện thực luồng POS theo mô hình SaaS từ QR đến thanh toán, trong đó QR không chỉ mở menu mà xác lập tenant, bàn và phiên phục vụ. Thứ hai, hệ thống đã xác lập ranh giới service, quyền sở hữu dữ liệu, cô lập tenant và kiểm soát truy cập để không biến microservices thành nhiều module gọi chéo database. Thứ ba, các cơ chế trọng tâm như consistency, Saga, KDS realtime, payment và kiểm chứng đa lớp đã được hiện thực ở mức phù hợp với phạm vi khóa luận.

Hướng phát triển cũng đi trực tiếp từ giới hạn bằng chứng. Hệ thống cần đo hiệu năng, tải và availability bằng số liệu định lượng; cần hoàn thiện triển khai thực tế và live payment evidence; đồng thời cần hardening cho Saga recovery, fault injection toàn hệ thống, reconciliation và alerting. Em không dùng các hướng này để phủ định kết quả hiện tại, mà xem đó là các bước tiếp theo để đưa prototype/case study kỹ thuật tiến gần hơn tới môi trường vận hành thực tế."

---

## Slide 40. Thank You

Slide Thank You chỉ dùng để kết thúc và nhận câu hỏi; không thêm claim kỹ thuật mới ở slide cuối.

---

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

---

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

---

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
