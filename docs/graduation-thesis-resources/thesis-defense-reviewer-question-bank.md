# QRTable Defense Reviewer Question Bank

> Ngân hàng câu hỏi luyện phản biện 60 phút.  
> Phong cách trả lời ưu tiên: nghiệp vụ trước, kiến trúc sau, bằng chứng cuối.  
> Không cần học thuộc nguyên văn; hãy học logic trả lời.

## 1. Công thức trả lời nhanh

Khi gặp câu hỏi khó, trả lời theo 5 nhịp:

```text
1. Về nghiệp vụ...
2. Về kiến trúc...
3. Trong QRTable...
4. Bằng chứng hiện tại...
5. Giới hạn/đánh đổi là...
```

Không bắt đầu bằng tên class hoặc code path, trừ khi thầy hỏi trực tiếp "trong code em làm ở đâu".

Quy tắc dùng thuật ngữ khi nói:

- Nói tiếng Việt trước, thuật ngữ tiếng Anh để trong ngoặc lần đầu: `tính lũy đẳng (idempotency)`, `bảng sự kiện chờ phát (transactional outbox)`, `nguồn trạng thái chính (source of truth)`.
- Gắn câu trả lời vào QRTable: khách quét QR, nhân viên xác nhận đơn, bếp nhận món, thanh toán SePay/VietQR, nhiều nhà hàng dùng chung nền tảng.
- Không trả lời như đang đọc code. Chỉ nhắc tên service hoặc file khi thầy hỏi sâu.

## 2. Nghiệp vụ, điểm mới và phạm vi đề tài

### Q1. POS và QR ordering đã có nhiều rồi, đề tài của em mới ở đâu?

**Trả lời ngắn:**  
Đề tài không nói rằng POS hay đặt món bằng mã QR là mới. Điểm chính của QRTable là lấy bài toán nhà hàng làm một tình huống đủ phức tạp để thiết kế nền tảng POS dạng SaaS theo kiến trúc vi dịch vụ (microservices): khách quét QR gọi món, nhân viên xác nhận, bếp nhận món, thanh toán và quản trị nhiều nhà hàng trên cùng nền tảng. Phần mới của khóa luận nằm ở cách tách ranh giới dịch vụ, sở hữu dữ liệu, xử lý nhất quán dữ liệu và kiểm chứng các luồng quan trọng.

**Nếu thầy hỏi sâu:**  
Các sản phẩm thương mại cho thấy nhu cầu thực tế, nhưng tài liệu công khai thường không nói rõ bên trong họ tách dịch vụ thế nào, dữ liệu thuộc về ai, khi thanh toán hoặc tồn kho lỗi thì xử lý ra sao. Vì vậy khóa luận tập trung vào phần thiết kế và kiểm chứng hệ thống phần mềm, không phải chứng minh một mô hình kinh doanh mới.

### Q2. Nếu thầy thích business, em nên định vị QRTable thế nào?

**Trả lời:**  
Em sẽ định vị QRTable từ quy trình nhà hàng trước: khách ngồi bàn quét QR gọi món, nhân viên xác nhận, bếp nhận danh sách món cần làm, khách thanh toán và chủ quán theo dõi vận hành. Điểm kinh doanh là giảm đứt gãy giữa các bước này. Còn phần khóa luận đánh giá ở góc kỹ thuật: hệ thống phải giữ đúng nhà hàng/đơn vị thuê bao (tenant), đúng đơn hàng, đúng tồn kho, đúng thanh toán và cập nhật gần thời gian thực (realtime) cho POS/KDS.

### Q3. Đề tài có chứng minh mô hình kinh doanh khả thi không?

**Trả lời:**  
Không theo nghĩa doanh thu, thị phần hay chiến lược cạnh tranh. Đề tài dùng bối cảnh F&B và SaaS để đặt bài toán kỹ thuật. Tính khả thi trong khóa luận được hiểu là: các luồng chính chạy được, ranh giới dữ liệu rõ, có kiểm thử và có demo minh họa, chứ không phải chứng minh mô hình kinh doanh đã sinh lời.

### Q4. Vì sao chọn F&B thay vì một domain khác?

**Trả lời:**  
F&B có đủ nhiều vai trò và trạng thái tự nhiên: khách, nhân viên, bếp, quản lý, thanh toán; có phiên bàn, giỏ món, vòng đời đơn hàng, màn hình bếp KDS và callback thanh toán từ ngoài hệ thống. Những yếu tố này tạo ra bài toán vừa gần thực tế vừa đủ độ khó để nghiên cứu vi dịch vụ (microservices), cập nhật gần thời gian thực (realtime) và nhất quán dữ liệu phân tán (distributed consistency).

### Q5. Đóng góp chính của khóa luận là gì?

**Trả lời:**  
Có ba lớp đóng góp. Thứ nhất là mô hình hóa bài toán SaaS POS có đặt món qua mã QR theo tác nhân, trường hợp sử dụng và trạng thái đơn hàng. Thứ hai là thiết kế kiến trúc vi dịch vụ với ranh giới dịch vụ (service boundary), sở hữu dữ liệu (data ownership), cô lập dữ liệu theo đơn vị thuê bao (tenant isolation) và chiến lược giao tiếp giữa các dịch vụ. Thứ ba là triển khai và kiểm chứng các luồng đại diện của QRTable như đặt món bằng QR, xác nhận đơn và giữ tồn kho, hàng đợi bếp KDS và thanh toán.

## 3. Vi dịch vụ và kiến trúc tổng thể

### Q6. Vì sao không làm modular monolith cho đơn giản?

**Trả lời:**  
Kiến trúc nguyên khối có chia module (modular monolith) là phương án hợp lý nếu mục tiêu chỉ là làm sản phẩm nhỏ nhanh hơn. Nhưng đề tài của em muốn nghiên cứu cách tổ chức một nền tảng SaaS POS theo vi dịch vụ (microservices), nên QRTable tách các miền như Catalog, Order, Kitchen, Payment, SaaS và User-Access. Đổi lại, hệ thống phải xử lý chi phí phân tán: lỗi mạng, gọi lặp an toàn nhờ tính lũy đẳng (idempotency), bảng sự kiện chờ phát (outbox), Saga và kiểm thử tích hợp.

### Q7. Nếu vi dịch vụ phức tạp hơn, lợi ích thực tế là gì?

**Trả lời:**  
Lợi ích chính em không trình bày theo hướng "nhanh hơn", vì chưa có đo đạc so sánh như vậy. Lợi ích là tách rõ trách nhiệm: Catalog quyết định menu và tồn kho, Order quyết định phiên gọi món/đơn/hóa đơn, Payment quyết định giao dịch thanh toán, Kitchen giữ trạng thái phục vụ màn hình bếp KDS. Khi có lỗi hoặc cần kiểm chứng, mình biết bất biến nghiệp vụ nào thuộc service nào. Đánh đổi là phải thiết kế hợp đồng giao tiếp (contract) và cơ chế nhất quán dữ liệu giữa các service.

### Q8. Làm sao chứng minh đây không phải distributed monolith?

**Trả lời:**  
Em chứng minh bằng ranh giới sở hữu. QRTable không để Order ghi trực tiếp tồn kho của Catalog, không để Payment sở hữu hóa đơn của Order, và Kitchen chỉ dựng danh sách bếp sau khi Order đã xác nhận đơn. Các service giao tiếp qua hợp đồng rõ ràng thay vì truy cập database chéo. Như vậy đây không chỉ là "tách source code ra nhiều service", mà có phân quyền quyết định trạng thái theo miền nghiệp vụ.

### Q9. BFF có business logic không?

**Trả lời:**  
BFF là lớp cổng vào cho frontend: nhận HTTP/WebSocket, kiểm tra xác thực/phân quyền, gắn ngữ cảnh tenant/session rồi chuyển tiếp đến service phù hợp. Luật nghiệp vụ chính vẫn nằm ở service sở hữu miền đó. Ví dụ BFF không tự trừ tồn kho, không tự đóng hóa đơn và không tự quyết định thanh toán; các phần đó thuộc Catalog, Order hoặc Payment.

### Q10. Service nào là quan trọng nhất?

**Trả lời:**  
Không có một service quan trọng nhất cho toàn hệ thống; tùy luồng mà trọng tâm khác nhau. Với luồng khách gọi món, Order là trung tâm vì quản lý phiên, đơn và hóa đơn. Với tồn kho, Catalog là chủ sở hữu. Với bếp, Kitchen giữ bản sao trạng thái phục vụ vận hành KDS. Với thanh toán, Payment sở hữu giao dịch, nhưng Order vẫn sở hữu hóa đơn và phiên bàn.

## 4. Giao tiếp liên dịch vụ

### Q11. Tại sao dùng cả TCP, gRPC, Kafka và WebSocket?

**Trả lời:**  
Vì trong QRTable có nhiều kiểu giao tiếp khác nhau. Những thao tác cần trả lời ngay, như nhân viên xác nhận đơn và Order cần hỏi Catalog còn tồn kho không, thì dùng gọi đồng bộ nội bộ qua TCP. Việc xác thực JWT đi qua Authorizer bằng gRPC. Những việc xảy ra sau khi trạng thái đã lưu bền, như Kitchen nhận `order.confirmed`, thì dùng Kafka. Còn WebSocket chỉ để báo cho POS/KDS/customer rằng có thay đổi gần thời gian thực. Nếu dùng một kênh cho tất cả thì hoặc khó trả lỗi ngay, hoặc quá phụ thuộc, hoặc làm hệ thống khó vận hành.

### Q12. Tại sao không dùng Kafka cho tất cả?

**Trả lời:**  
Kafka phù hợp cho sự kiện bất đồng bộ (asynchronous event), nhưng không phù hợp cho mọi câu hỏi cần câu trả lời ngay. Ví dụ nhân viên bấm xác nhận đơn thì POS phải biết ngay món còn hay hết để phản hồi. Nếu tất cả đi qua Kafka, phản hồi cho nhân viên sẽ bị vòng vèo và khó kiểm soát lỗi. Vì vậy QRTable dùng Kafka sau khi quyết định nghiệp vụ đã được lưu, ví dụ Order đã chuyển đơn sang chế biến rồi mới phát `order.confirmed` cho Kitchen.

### Q13. Khi nào dùng Kafka?

**Trả lời:**  
QRTable dùng Kafka khi một service đã hoàn tất quyết định nghiệp vụ và service khác chỉ cần phản ứng sau đó. Ví dụ Order đã xác nhận đơn, lưu trạng thái `PROCESSING` và tạo sự kiện `order.confirmed`; Kitchen đọc sự kiện này để tạo ticket trên KDS. Như vậy Kitchen không tham gia quyết định đơn có hợp lệ hay không, mà chỉ nhận kết quả sau commit.

### Q14. WebSocket có phải nguồn sự thật không?

**Trả lời:**  
Không. WebSocket chỉ là kênh báo tin nhanh cho giao diện. Nguồn trạng thái chính (source of truth) vẫn nằm ở service sở hữu dữ liệu, ví dụ Order với đơn hàng, Payment với thanh toán, Kitchen với trạng thái KDS trong Redis. Nếu WebSocket bị mất kết nối, client có thể kết nối lại và tải lại trạng thái từ API. Vì vậy mất WebSocket làm giao diện chậm cập nhật hơn, nhưng không làm sai nghiệp vụ.

### Q15. Nếu Kafka bị trễ, hệ thống có sai không?

**Trả lời:**  
Không nhất thiết sai. Nếu Order đã lưu thành công trạng thái xác nhận đơn thì về nghiệp vụ đơn đã được chấp nhận. KDS có thể nhận chậm hơn một chút vì đó là phần cập nhật bất đồng bộ sau commit. Đây là nhất quán cuối cùng (eventual consistency): hệ thống chấp nhận một độ trễ nhỏ, nhưng consumer phải xử lý lặp an toàn và client có thể tải lại trạng thái.

## 5. Tính lũy đẳng, outbox và nhất quán dữ liệu

### Q16. Tính lũy đẳng là gì, nói đơn giản?

**Trả lời:**  
Tính lũy đẳng (idempotency) nghĩa là cùng một thao tác nếu bị gửi lại nhiều lần thì vẫn chỉ tạo một kết quả nghiệp vụ. Trong QRTable, nếu nhân viên bấm xác nhận cùng một đơn hai lần thì không được trừ tồn kho hai lần. Nếu SePay gửi webhook lặp thì không được đóng hóa đơn hai lần.

### Q17. Tính lũy đẳng khác gửi lại request thế nào?

**Trả lời:**  
Gửi lại (retry) là hành vi của bên gọi khi không chắc lần trước đã thành công hay chưa. Tính lũy đẳng (idempotency) là cách phía server nhận ra đây là cùng một thao tác cũ, thường bằng khóa lũy đẳng (idempotency key) hoặc trạng thái hiện tại, để trả kết quả ổn định thay vì tạo tác dụng phụ mới.

### Q18. Outbox giải quyết vấn đề gì?

**Trả lời:**  
Bảng sự kiện chờ phát (transactional outbox) giải quyết khoảng hở giữa "đã lưu database" và "đã phát Kafka". Ví dụ Order đã chuyển đơn sang `PROCESSING` nhưng lúc phát `order.confirmed` bị lỗi, thì sự kiện vẫn còn trong bảng outbox để tiến trình phát lại. QRTable ghi trạng thái Order và outbox trong cùng giao dịch cục bộ, rồi mới phát Kafka sau khi commit.

### Q19. Outbox có bảo đảm exactly-once không?

**Trả lời:**  
Không. Outbox giúp giảm rủi ro mất sự kiện giữa database và Kafka, nhưng không bảo đảm toàn hệ thống xử lý đúng một lần tuyệt đối (exactly-once). Kafka hoặc consumer vẫn có thể gặp lặp. Vì vậy Kitchen vẫn phải chống lặp (dedupe) khi tạo ticket KDS.

### Q20. Vì sao không dùng distributed transaction hoặc two-phase commit?

**Trả lời:**  
Giao dịch phân tán hai pha (two-phase commit/2PC) làm các service và database bị khóa chặt với nhau, khó vận hành và không hợp với hướng sự kiện của đề tài. QRTable chọn giao dịch cục bộ tại service sở hữu dữ liệu, dùng Saga cho các bước liên dịch vụ, dùng bù trừ nghiệp vụ (compensation) khi cần, và dùng outbox cho sự kiện sau commit. Đánh đổi là phải chấp nhận nhất quán cuối cùng và thiết kế retry/dedupe rõ.

## 6. Saga và Order Confirm Saga

### Q21. Saga trong đề tài là gì?

**Trả lời:**  
Saga là cách chia một quy trình nghiệp vụ lớn thành nhiều giao dịch cục bộ (local transaction) ở các service khác nhau. Nếu bước sau lỗi, hệ thống dùng hành động bù trừ (compensation) cho bước đã làm trước đó. Trong QRTable, Saga đại diện chính là Order Confirm Saga: Order điều phối việc kiểm/trừ tồn kho ở Catalog, sau đó mới lưu trạng thái đơn và phát sự kiện cho Kitchen.

### Q22. Tại sao chọn orchestration Saga thay vì choreography Saga?

**Trả lời:**  
Với luồng xác nhận đơn, có một điểm quyết định nghiệp vụ rất rõ: nhân viên bấm xác nhận. Order là service sở hữu vòng đời đơn hàng nên phù hợp làm bên điều phối (orchestrator). Nếu dùng kiểu các service tự phản ứng với sự kiện (choreography), luồng sẽ khó giải thích hơn và khó kiểm soát nhánh lỗi như Catalog đã trừ tồn kho nhưng Order lưu trạng thái thất bại.

### Q23. Order Confirm Saga chạy thế nào?

**Trả lời:**  
Nhân viên xác nhận đơn trên POS. Request đi qua BFF để kiểm người dùng, tenant và quyền. Order khóa/kiểm tra đơn và hóa đơn, rồi gọi Catalog trừ tồn kho bằng khóa lũy đẳng. Nếu Catalog xử lý được, Order lưu trạng thái đơn sang `PROCESSING`, lưu thông tin món và tạo outbox `order.confirmed`. Sau đó publisher phát Kafka, Kitchen nhận sự kiện và tạo ticket trên KDS.

### Q24. Nếu Catalog đã trừ stock nhưng Order commit fail thì sao?

**Trả lời:**  
Nếu Catalog đã trừ tồn kho nhưng Order lưu trạng thái thất bại, Order gọi lại Catalog để nhả tồn kho bằng hành động bù trừ (compensation). QRTable truyền kèm tenant, order, danh sách món và phiên bản giữ chỗ tồn kho để Catalog biết đúng phần cần nhả. Nếu bù trừ cũng lỗi thì hệ thống ghi log lỗi; đây là điểm cần củng cố thêm nếu triển khai vận hành thật.

### Q25. Nếu staff bấm confirm hai lần?

**Trả lời:**  
Luồng xác nhận có tính lũy đẳng. Nếu đơn đã chuyển sang `PROCESSING`, Order trả lại trạng thái hiện tại thay vì gọi Catalog trừ tồn kho lần nữa hoặc tạo thêm event mới. Phía Catalog cũng dùng thông tin giữ chỗ/idempotency để tránh trừ cùng một đơn nhiều lần.

### Q26. Tại sao stock không trừ ngay lúc khách submit order?

**Trả lời:**  
Trong nghiệp vụ này, submit chỉ là khách gửi yêu cầu. Staff confirm mới là mốc nhà hàng chấp nhận phục vụ và kiểm tra tồn kho. Nếu trừ stock ngay lúc submit, khách có thể giữ hàng trong giỏ/order pending quá sớm và làm sai vận hành bếp.

### Q27. Bằng chứng cho Saga hiện tại mạnh đến đâu?

**Trả lời:**  
Phần này có bằng chứng ở nhiều mức: kiểm thử đơn vị và kiểm thử hợp đồng cho nhánh thành công, gọi lặp, lỗi Catalog, bù trừ và outbox; có kiểm thử tích hợp tùy chọn cho Order/Catalog về tồn kho và xử lý đồng thời. Nhưng em không nói đây là Saga hoàn thiện ở mức production: chưa claim có bộ lưu trạng thái Saga bền vững, worker tự phục hồi đầy đủ hoặc xử lý đúng một lần tuyệt đối.

## 7. KDS, Redis và realtime

### Q28. Vì sao Kitchen dùng Redis mà không dùng database riêng?

**Trả lời:**  
Trong QRTable, KDS là màn hình vận hành tức thời của bếp, cần cập nhật nhanh theo khu vực chế biến, độ ưu tiên và cảnh báo SLA. Redis phù hợp để giữ bản sao trạng thái phục vụ vận hành (runtime projection) vì thao tác nhanh với hàng đợi, tập hợp và dữ liệu tạm. Nếu sau này cần lịch sử bếp dài hạn hoặc phân tích sâu, có thể bổ sung cơ sở dữ liệu bền vững riêng.

### Q29. Redis có phải nguồn trạng thái chính không?

**Trả lời:**  
Không thể nói Redis là nguồn sự thật của toàn hệ thống. Với KDS, Redis là nơi Kitchen giữ trạng thái vận hành hiện tại của màn hình bếp. Nhưng vòng đời đơn hàng vẫn thuộc Order, tồn kho vẫn thuộc Catalog và thanh toán vẫn thuộc Payment. Nói cách khác, Redis giúp chạy nhanh phần vận hành, nhưng không thay thế ownership nghiệp vụ của các service.

### Q30. Nếu event `order.confirmed` bị consume lặp, KDS có tạo ticket lặp không?

**Trả lời:**  
KDS có cơ chế chống lặp (dedupe) theo sự kiện, đơn hàng và khu vực bếp trong Redis. Nếu cùng một `order.confirmed` bị nhận lại, Kitchen nhận ra đã xử lý rồi và không tạo ticket lặp. Vì vậy em không nói Kafka bảo đảm không lặp; em nói QRTable thiết kế consumer chịu được việc bị gửi lại.

### Q31. Nếu WebSocket mất kết nối thì sao?

**Trả lời:**  
Client có thể kết nối lại và tải lại ảnh chụp trạng thái hiện tại (snapshot) từ API. WebSocket chỉ giúp báo nhanh rằng có thay đổi; trạng thái cuối cùng vẫn lấy từ server hoặc projection do service sở hữu. Vì vậy mất WebSocket làm giảm độ "nhanh" của cập nhật, nhưng không làm sai đơn hàng hay thanh toán.

## 8. Xác thực, cô lập tenant và bảo mật

### Q32. Customer có dùng Keycloak không?

**Trả lời:**  
Không. Khách hàng vào bằng mã QR và phiên bàn vì bối cảnh nhà hàng cần thao tác nhanh, không bắt khách tạo tài khoản. Nhân viên, chủ quán, quản lý và super admin mới dùng Keycloak với JWT/OIDC. Khách bị giới hạn bởi tenant, bàn và phiên gọi món, chứ không có vai trò RBAC trong Keycloak.

### Q33. Phân quyền vai trò khác cô lập tenant thế nào?

**Trả lời:**  
Phân quyền theo vai trò (RBAC) trả lời câu hỏi "người này có được làm hành động này không". Cô lập theo đơn vị thuê bao (tenant isolation) trả lời câu hỏi "dữ liệu này thuộc nhà hàng nào". Một nhân viên có quyền xem đơn hàng vẫn không được xem đơn của nhà hàng khác.

### Q34. Quyền theo gói dịch vụ khác phân quyền vai trò thế nào?

**Trả lời:**  
Quyền theo gói dịch vụ (entitlement) là quyền của nhà hàng/tenant theo gói đăng ký, ví dụ có được dùng báo cáo nâng cao hay không. RBAC là quyền của từng người dùng trong tenant đó. Vì vậy một owner có quyền xem báo cáo nhưng tenant không mua tính năng tương ứng thì vẫn bị chặn ở PlanFeatureGuard.

### Q35. Super Admin có phá tenant isolation không?

**Trả lời:**  
Super Admin là ngoại lệ có kiểm soát cho các thao tác cấp nền tảng, ví dụ quản trị tenant. Điều đó không có nghĩa là bỏ cô lập dữ liệu. Những route xem hoặc quản lý xuyên tenant phải có quyền nền tảng rõ ràng và mục đích quản trị rõ, không phải staff bình thường có thể truy cập tùy ý.

### Q36. QR token bảo vệ cái gì?

**Trả lời:**  
QR token giúp hệ thống biết khách đang ở tenant nào và bàn nào, từ đó mở đúng phiên gọi món. Nó không biến khách thành user có tài khoản hay role. Nó chỉ tạo ngữ cảnh hợp lệ để khách thao tác trong phạm vi bàn và nhà hàng đó.

## 9. Payment, VietQR và SePay

### Q37. Payment service sở hữu gì?

**Trả lời:**  
Payment sở hữu bản ghi thanh toán, audit thanh toán, cấu hình thanh toán của tenant và logic quyết toán. Order vẫn sở hữu hóa đơn, phiên bàn và vòng đời đơn hàng. Khi thanh toán đủ điều kiện, Payment phối hợp với Order để đánh dấu hóa đơn đã trả, chứ Payment không tự sở hữu bill.

### Q38. `QRTBL` và `QRSUB` khác nhau thế nào?

**Trả lời:**  
`QRTBL` là mã tham chiếu cho khách thanh toán hóa đơn tại nhà hàng, thuộc luồng Payment. `QRSUB` là mã tham chiếu cho nhà hàng thanh toán gói SaaS của nền tảng, thuộc luồng SaaS. Tách hai dòng tiền này giúp không nhầm giữa tiền của nhà hàng và tiền subscription của nền tảng.

### Q39. Nếu SePay webhook gửi lặp?

**Trả lời:**  
Payment phải xử lý lũy đẳng: đối chiếu mã tham chiếu, kiểm tra trạng thái payment hiện tại, ghi audit nếu webhook bị gửi lặp và không đánh dấu hóa đơn đã trả nhiều lần. Trong tích hợp với hệ thống ngoài như SePay, webhook bị gửi lặp là tình huống bình thường phải chịu được.

### Q40. Nếu chuyển thiếu tiền?

**Trả lời:**  
Payment so sánh số tiền nhận được với tổng tiền hóa đơn đã làm tròn theo quy tắc VND. Nếu khách chuyển thiếu, hệ thống không hoàn tất hóa đơn và không báo Order chuyển sang đã thanh toán. Đây là điểm quan trọng vì thanh toán là luồng liên quan tiền thật.

## 10. Demo và bằng chứng

### Q41. Demo UI chứng minh được gì?

**Trả lời:**  
Demo giao diện chứng minh luồng người dùng nhìn thấy: khách quét QR, thêm món, nhân viên xác nhận, bếp thấy ticket KDS và thanh toán. Nhưng demo giao diện không tự chứng minh các nhánh lỗi như bù trừ Saga, webhook lặp hoặc Kafka duplicate. Những phần đó phải dựa vào kiểm thử tự động, trạng thái DB/outbox/Kafka/Redis và ma trận truy vết.

### Q42. Khi demo, vì sao chuyển sang Kafkio/RedisInsight?

**Trả lời:**  
Vì em muốn nối hành vi trên giao diện với trạng thái phía sau hệ thống. Sau khi nhân viên xác nhận đơn trên POS, Kafkio cho thấy sự kiện `order.confirmed` đã được phát sau commit; RedisInsight cho thấy Kitchen đã tạo trạng thái KDS. Như vậy demo không chỉ là bấm màn hình, mà có bằng chứng backend đi kèm.

### Q43. Nếu demo live lỗi thì nói sao?

**Trả lời:**  
Nói bình tĩnh: "Luồng live đang gặp vấn đề môi trường, em chuyển sang bộ minh chứng đã chuẩn bị để trình bày cùng luồng." Sau đó mở screenshot/video/state/log/test output theo đúng thứ tự demo. Không cố sửa live quá lâu trước hội đồng vì sẽ mất kiểm soát thời gian.

### Q44. Nếu Kafka message chưa xuất hiện trong demo?

**Trả lời:**  
Không bấm xác nhận lại nhiều lần. Refresh Kafkio một lần; nếu KDS đã có ticket thì giải thích rằng Kitchen có thể đã xử lý sự kiện nhưng giao diện Kafka đang tải lại. Nếu cả Kafka và KDS đều chưa thấy, chuyển sang bộ minh chứng dự phòng.

### Q45. Có nên mở code khi phản biện?

**Trả lời:**  
Chỉ mở code nếu thầy hỏi rất cụ thể "em làm ở đâu trong code". Bình thường nên ưu tiên sơ đồ, bằng chứng, test output hoặc trạng thái DB/Redis/Kafka đã chuẩn bị. Mở code quá sớm dễ làm câu trả lời bị thấp tầng và mất thời gian.

## 11. Đánh giá, giới hạn và hướng phát triển

### Q46. Hệ thống đã production-ready chưa?

**Trả lời:**  
Chưa. Em không nói QRTable đã sẵn sàng vận hành production toàn diện. Hệ thống đã có nền tảng triển khai và bằng chứng cho các luồng cốt lõi, nhưng để gọi là sẵn sàng production cần thêm nhiều phần: triển khai công khai ổn định, backup/rollback, giám sát vận hành, rà soát bảo mật, kiểm thử tải và runbook vận hành.

### Q47. Có đo đạc hiệu năng so sánh không?

**Trả lời:**  
Chưa có đo đạc hiệu năng so sánh (benchmark) giữa microservices và monolith, nên em không dùng kết luận kiểu "microservices nhanh hơn". Đánh giá hiện tại tập trung vào kiểm chứng chức năng, truy vết yêu cầu, bằng chứng kiến trúc, Saga/tính lũy đẳng và demo trạng thái. Nếu sau này đo p95 hay throughput thì phải nói rõ môi trường và dữ liệu đo.

### Q48. Hạn chế lớn nhất của đề tài là gì?

**Trả lời:**  
Hạn chế lớn nhất là mức bằng chứng vận hành thật còn giới hạn. Hệ thống đã chứng minh được các luồng đại diện, nhưng chưa có kiểm thử tải/stress đầy đủ, một số tích hợp với provider thật cần kiểm chứng sâu hơn, và Saga chưa có cơ chế phục hồi bền vững đầy đủ. Đây là hướng củng cố tiếp, không phủ nhận giá trị của thiết kế và triển khai hiện tại.

### Q49. Nếu làm tiếp, ưu tiên gì?

**Trả lời:**  
Em sẽ ưu tiên theo rủi ro vận hành: củng cố Saga/outbox/retry, bổ sung giám sát lỗi, kiểm thử sâu hơn về bảo mật và cô lập tenant, kiểm chứng thanh toán với provider thật, bổ sung lịch sử/phân tích KDS nếu cần, và hoàn thiện khả năng quan sát vận hành (observability).

### Q50. Nếu thầy hỏi "SaaS này mở rộng về business thế nào?"

**Trả lời:**  
Ở góc kinh doanh, SaaS giúp nhiều nhà hàng dùng chung một nền tảng và được quản lý theo gói dịch vụ. Ở góc kỹ thuật, muốn scale thì hệ thống phải biết request thuộc tenant nào, gói đó được dùng tính năng gì, có giới hạn quota ra sao và service nào chịu trách nhiệm xử lý. Khóa luận chưa chứng minh doanh thu hay chiến lược tăng trưởng, mà xây nền kỹ thuật để mô hình nhiều tenant có thể vận hành.

## 12. Mở rộng hệ thống, Redis Pub/Sub và WebSocket

### Q51. Nếu số tenant tăng, QRTable scale theo hướng nào?

**Trả lời:**  
Em không trả lời bằng một con số chịu tải vì chưa có kiểm thử tải thật. Em trả lời theo thiết kế: mỗi request của QRTable đều gắn với tenant, dữ liệu có `tenant_id`, tính năng đi qua quyền theo gói dịch vụ (entitlement) và các service được tách theo miền như Order, Catalog, Payment, Kitchen. Khi số nhà hàng tăng, có thể mở rộng từng lớp: tăng instance BFF/service, tối ưu database của service nóng, đặt quota theo tenant và theo dõi tải theo từng tenant.

### Q52. Service nào dễ thành bottleneck nhất?

**Trả lời:**  
Trong luồng demo chính, điểm nóng dễ nằm ở Order và Catalog khi nhân viên xác nhận đơn vì phải kiểm trạng thái đơn và tồn kho. Redis KDS có thể nóng nếu nhiều bếp/station cập nhật liên tục. BFF/WebSocket có thể nóng nếu nhiều client cùng kết nối. Database của từng service cũng có thể thành bottleneck nếu index hoặc query chưa tốt. Vì vậy em không nói microservices tự động nhanh hơn; em nói ranh giới service giúp biết nghẽn ở đâu để tối ưu đúng chỗ.

### Q53. WebSocket scale nhiều BFF instance như thế nào?

**Trả lời:**  
Nếu chỉ lưu room WebSocket trong bộ nhớ của một instance BFF, instance A sẽ không biết client đang nối ở instance B. QRTable dùng Socket.io Redis adapter qua `RedisIoAdapter` để các instance BFF cùng phát sự kiện tới đúng room, ví dụ room nhân viên, room khách hoặc room KDS theo station. Đây là nền tảng để mở rộng realtime nhiều instance; còn để khẳng định chịu tải bao nhiêu thì vẫn cần kiểm thử tải.

### Q54. Redis Pub/Sub khác Kafka ở điểm nào?

**Trả lời:**  
Kafka là nhật ký sự kiện bền vững hơn cho sự kiện nghiệp vụ sau commit, ví dụ `order.confirmed`. Redis Pub/Sub trong QRTable chỉ là kênh phát tín hiệu nội bộ gần thời gian thực, ví dụ channel `realtime:kds:*` với payload `kds.queue_changed`. Pub/Sub nhẹ và nhanh để báo UI cập nhật, nhưng không có cơ chế phát lại bền vững như Kafka, nên không dùng làm nguồn trạng thái nghiệp vụ.

### Q55. Vì sao `kds.queue_changed` không đưa vào Kafka topic lõi?

**Trả lời:**  
Vì `kds.queue_changed` không phải sự kiện nghiệp vụ gốc kiểu "đơn đã được xác nhận". Nó chỉ là tín hiệu vận hành báo rằng trạng thái KDS đã thay đổi để BFF đẩy WebSocket cho UI. Sự kiện nghiệp vụ bền vững là `order.confirmed`. Kitchen đọc `order.confirmed`, dựng trạng thái KDS, rồi mới phát `kds.queue_changed` như tín hiệu cập nhật giao diện. Tách như vậy giúp Kafka không bị trộn với quá nhiều tín hiệu UI ngắn hạn.

### Q56. Nếu Redis Pub/Sub message bị mất thì có sai nghiệp vụ không?

**Trả lời:**  
Không làm sai nghiệp vụ, vì Pub/Sub chỉ là tín hiệu báo nhanh. Nếu tín hiệu bị mất, client vẫn có thể kết nối lại và tải trạng thái KDS từ API. Trạng thái vận hành KDS vẫn nằm trong Redis của Kitchen, còn vòng đời đơn hàng vẫn thuộc Order. Mất tín hiệu chỉ làm UI cập nhật chậm hơn, không làm đơn hàng tự đổi sai trạng thái.

### Q57. Nếu Redis KDS đầy bộ nhớ hoặc một tenant quá nhiều ticket thì sao?

**Trả lời:**  
Đó là rủi ro vận hành thật. Hướng xử lý là đặt giới hạn/quota, dọn dữ liệu cũ, theo dõi bộ nhớ Redis và nếu cần thì tách Redis hoặc dùng Redis Cluster. Trong phạm vi khóa luận, Redis được dùng vì KDS cần cập nhật nhanh theo station, SLA và chống lặp. Em không nói đã giải quyết đầy đủ mọi bài toán capacity; em nói đây là hướng củng cố khi triển khai lớn hơn.

### Q58. Có cần Redis Cluster không?

**Trả lời:**  
Ở quy mô khóa luận và demo, một Redis instance đủ để minh họa cơ chế KDS/realtime. Redis Cluster chỉ cần khi tải, bộ nhớ hoặc yêu cầu sẵn sàng cao vượt ngưỡng. Nếu triển khai thật, nên đo trước tenant nào nóng, station nào nóng, key nào nóng rồi mới quyết định cluster, chia keyspace hoặc tách Redis theo miền.

### Q59. Kafka consumer group giúp scale Kitchen như thế nào?

**Trả lời:**  
Nhóm tiêu thụ Kafka (consumer group) cho phép nhiều instance Kitchen chia nhau đọc các partition của topic. Nếu lượng `order.confirmed` tăng, có thể tăng số consumer/partition tương ứng. Nhưng mở rộng consumer không loại bỏ yêu cầu chống lặp: sự kiện vẫn có thể bị gửi lại, nên Kitchen vẫn phải dedupe theo event/order/station để không tạo ticket KDS lặp.

### Q60. Database per-service scale thế nào khi tenant tăng?

**Trả lời:**  
Cơ sở dữ liệu theo từng service giúp mỗi miền tối ưu theo nhu cầu riêng: Order tối ưu đơn/phiên/hóa đơn, Catalog tối ưu menu/tồn kho, Payment tối ưu thanh toán/audit. Khi số tenant tăng, có thể tối ưu index, dùng read replica, partition theo tenant/thời gian hoặc tách hạ tầng cho service nóng. Không join database chéo giúp việc tối ưu ít kéo theo service khác.

### Q61. Vì sao không dùng Kafka luôn cho WebSocket fan-out?

**Trả lời:**  
Kafka phù hợp cho sự kiện nghiệp vụ bền vững và xử lý bất đồng bộ, nhưng phát tín hiệu UI gần thời gian thực cần nhẹ và ngắn hạn hơn. Nếu mọi tín hiệu UI đều đưa vào Kafka, topic sẽ lẫn giữa sự kiện nghiệp vụ quan trọng và tín hiệu giao diện. QRTable giữ Kafka cho sự kiện sau commit như `order.confirmed`, còn Redis Pub/Sub và WebSocket dùng để báo UI cập nhật nhanh.

### Q62. Nếu thầy hỏi "SaaS scale có bị noisy neighbor không?"

**Trả lời:**  
Có thể có. Đây là hiện tượng một tenant tạo tải quá lớn làm ảnh hưởng tenant khác, gọi là "hàng xóm ồn ào" (noisy neighbor). QRTable có nền tảng để kiểm soát bằng tenant context, quota, quyền theo gói dịch vụ và ranh giới service rõ. Nhưng khóa luận chưa nói đã giải quyết đầy đủ bài toán này; hướng phát triển là rate limit theo tenant, metric theo tenant và tách hạ tầng cho tenant lớn nếu cần.

## 13. Câu trả lời nên tránh

Không nói:

- "Kafka đảm bảo không bao giờ duplicate."
- "Redis là database chính."
- "WebSocket update là trạng thái cuối cùng."
- "Redis Pub/Sub thay thế Kafka."
- "WebSocket scale tự động, không cần thiết kế thêm."
- "Microservices chắc chắn nhanh hơn monolith."
- "Em đã kiểm thử mọi trường hợp."
- "Payment Complete là Saga chính."
- "Customer đăng nhập bằng Keycloak."
- "Tenant isolation chỉ là RBAC."
- "Hệ thống production-ready."
- "Em dùng microservices vì xu hướng hiện nay."

Nói thay thế:

- "QRTable xử lý gọi lặp bằng tính lũy đẳng và chống lặp ở ranh giới service."
- "Redis là cache hoặc bản sao trạng thái vận hành tùy miền."
- "WebSocket là tín hiệu báo cập nhật, client vẫn có thể tải lại trạng thái."
- "Redis Pub/Sub là kênh phát tín hiệu realtime nội bộ; Kafka là nhật ký sự kiện nghiệp vụ."
- "Vi dịch vụ là lựa chọn có đánh đổi để tách trách nhiệm và sở hữu dữ liệu."
- "Bằng chứng hiện tại chứng minh các luồng đại diện; một số phần củng cố vận hành là hướng phát triển."
