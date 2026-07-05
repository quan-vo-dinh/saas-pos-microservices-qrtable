# QRTable — Kịch Bản Thuyết Trình Bảo Vệ Khóa Luận (Trích xuất từ v2)

_Tài liệu trích xuất tự động toàn bộ lời thoại thuyết trình và câu chuyển slide theo thứ tự từ slide chính đến phụ lục của bản Refactor v2._

---

## Slide 1. Bìa

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, em xin phép trình bày khóa luận tốt nghiệp với đề tài: **'Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices'**.
>
> Tên đề tài này phản ánh sự giao thoa chặt chẽ giữa hai yếu tố: Một là **Case study thực tiễn** — bài toán POS SaaS và đặt món QR đa nhà hàng; hai là **Giải pháp kỹ thuật** — thiết kế kiến trúc Microservices để giải quyết và kiểm chứng các bài toán phân tán cốt lõi phát sinh từ bối cảnh đó. Trọng tâm của đề tài là phần 'Nghiên cứu' — nghĩa là chứng minh các bất biến nghiệp vụ bằng thực nghiệm chứ không chỉ dừng lại ở việc cài đặt ứng dụng thương mại.
>
> Bài trình bày hôm nay của em sẽ lần lượt đi từ các thách thức nghiệp vụ, quyết định kiến trúc, giải pháp chi tiết và cuối cùng là bằng chứng kiểm thử."

---

## Slide 2. PHẦN I — Đặt Vấn Đề & Mục Tiêu Nghiên Cứu

### 🗣️ Lời thuyết trình:

> "Sau đây, em xin phép bắt đầu buổi báo cáo với Phần I: Đặt vấn đề và Mục tiêu nghiên cứu của đề tài. Trước hết là góc nhìn thực tế đằng sau một lần quét mã QR đặt món."

### 🔄 Câu chuyển slide:

> "Dạ, kính mời Hội đồng cùng nhìn vào trải nghiệm thực tế ở slide tiếp theo."

---

## Slide 3. Hiện trạng quy trình đặt món qua mã QR và thách thức phân tán

### 🗣️ Lời thuyết trình:

> "Nhìn từ phía khách hàng, quét QR và gọi món tại bàn là thao tác rất đơn giản. Và trên thực tế, nếu chỉ xây dựng một ứng dụng đơn lẻ chạy trên kiến trúc Monolith thông thường với một database duy nhất, việc hiện thực cũng cực kỳ đơn giản nhờ sự bảo trợ của các giao dịch database ACID cục bộ và in-memory events.
>
> Tuy nhiên, khi hệ thống được phát triển thành một **nền tảng vận hành nhà hàng SaaS ở quy mô platform**, phục vụ hàng ngàn nhà hàng độc lập, chúng ta buộc phải tách biệt ranh giới dữ liệu và dịch vụ. Sự chia tách này làm chúng ta mất đi các transaction ACID và in-memory đó, phát sinh ra 5 thách thức kỹ thuật lớn: cô lập dữ liệu nhà hàng chéo, tranh chấp giỏ hàng chung của bàn gần realtime, giao dịch nhất quán phân tán để trừ kho khi gửi đơn, đồng bộ sự kiện bếp và đối soát thanh toán bất đồng bộ.
>
> Việc giải quyết các thách thức phân tán này ở quy mô platform chính là bài toán cốt lõi của đề tài."

### 🔄 Câu chuyển slide:

> "Vậy tại sao chúng em chọn bối cảnh F&B và đặt món qua QR để thực hiện nghiên cứu này?"

---

## Slide 4. Động cơ nghiên cứu và xu thế số hóa ngành F&B

### 🗣️ Lời thuyết trình:

> "Dạ, trước khi đi sâu vào giải pháp, em xin làm rõ mạch tư duy thiết kế của đề tài: với một ứng dụng đặt món thông thường cho một nhà hàng nhỏ, kiến trúc Monolith rõ ràng là tối ưu nhất.
>
> Tuy nhiên, khi xây dựng một **nền tảng SaaS POS toàn diện** hoạt động ở quy mô lớn, chúng em đã mô hình hóa các đặc thù nghiệp vụ F&B/QR thành ba nhóm thách thức kiến trúc phân tán lớn:
>
> Thứ nhất là nhóm **Cô lập tài nguyên và Phân quyền chéo mạng**: phát sinh từ yêu cầu vận hành đa thuê theo chuẩn NIST SP 800-145 và kiểm soát truy cập phân tầng cho nhiều nhóm tác nhân. Thứ hai là nhóm **Nhất quán dữ liệu phân tán và Kiểm soát xung đột**: giải quyết tranh chấp giỏ hàng đồng thời tại bàn bằng cơ chế OCC, và duy trì tính nhất quán khi Catalog và Order là hai service độc lập bằng mô hình Saga. Thứ ba là nhóm **Đồng bộ sự kiện thời gian thực và Tích hợp lỏng**: nhằm đẩy phiếu xuống bếp KDS gần realtime mà không gây quá tải database, đồng thời tích hợp bất đồng bộ với các webhook thanh toán bên ngoài qua Kafka.
>
> Ba nhóm thách thức này chính là cơ sở khoa học để chúng em đề xuất các giải pháp kỹ thuật cụ thể trong phần tiếp theo của khóa luận."

### 🔄 Câu chuyển slide:

> "Với bối cảnh và phạm vi nghiên cứu được phân nhóm rõ ràng như vậy, đây là bản đồ phương pháp luận và các bằng chứng thực nghiệm tương ứng của đề tài."

---

## Slide 5. Mục tiêu & Phạm vi nghiên cứu

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, để giải quyết các thách thức vận hành phân tán của mô hình SaaS POS dưới góc nhìn khoa học, khóa luận của em đặt ra hai **Mục tiêu cốt lõi**: Một là xây dựng kiến trúc tham chiếu cho nền tảng SaaS POS đa thuê; Hai là kết hợp các thiết kế chuẩn để giải quyết triệt để các chi phí phân tán phát sinh.
>
> Phương pháp thực hiện của đề tài được tổ chức chặt chẽ theo mạch liên kết từ **Cơ sở lý thuyết đến Bằng chứng kiểm chứng**:
>
> Cụ thể, đối với bài toán cô lập tenant, cơ sở thiết kế là NIST SP 800-145 và được chứng minh bằng suite kiểm thử cô lập tự động. Về kiểm soát truy cập, chúng em dựa trên chuẩn bảo mật OWASP ASVS để thiết lập bộ lọc phân tầng. Với giao dịch phân tán, chúng em áp dụng lý thuyết Saga của Garcia-Molina và kiểm chứng thành công bằng bộ test suite phủ 6 invariants cốt lõi. Luồng realtime của bếp áp dụng Event Notification của Fowler và kiểm chứng qua KDS Redis projection. Cuối cùng, luồng đối soát thanh toán áp dụng Outbox của Richardson và kiểm chứng qua tích hợp SePay webhook.
>
> Chúng em cũng xác định rõ giới hạn phạm vi đề tài: đây là nghiên cứu thực nghiệm về mặt thiết kế kỹ thuật, không đánh giá mô hình lợi nhuận kinh doanh, và tập trung phân tích sâu cơ chế Saga ở luồng xác nhận đơn hàng."

### 🔄 Câu chuyển slide:

> "Với định vị mục tiêu và phạm vi nghiên cứu như vậy, sau đây em xin trình bày về quyết định kiến trúc cốt lõi của hệ thống: Tại sao chúng em quyết định chọn Microservices và chấp nhận các chi phí phân tán này?"

---

## Slide 6. Cơ sở lý thuyết và các Tiêu chuẩn thiết kế quy chuẩn

### 🗣️ Lời thuyết trình:

> "Dạ thưa Hội đồng, để đảm bảo thiết kế tham chiếu của đề tài là đúng đắn và quy chuẩn, chúng em tuân thủ nghiêm ngặt các quy chuẩn kỹ thuật quốc tế và các mẫu thiết kế đã được chứng minh khoa học.
>
> Cụ thể, về mô hình SaaS, chúng em dựa trên tiêu chuẩn NIST SP 800-145 và hướng dẫn của Microsoft Azure để cô lập tenant. Về Microservices, ranh giới dịch vụ tuân thủ nguyên lý Bounded Context của Sam Newman và Database-per-service của Richardson. Luồng nhất quán chéo dịch vụ áp dụng lý thuyết Saga của Garcia-Molina năm 1987 và Outbox pattern. Giao tiếp thời gian thực tuân thủ RFC 6455 và JWT RFC 7519, phân quyền theo OWASP ASVS. Mọi thiết kế này đều vượt qua ma trận kiểm thử tự động, đạt tỷ lệ lỗi 0.00% dưới tải thực tế của k6 và được phân vết qua Prometheus, Grafana và Tempo."

### 🔄 Câu chuyển slide:

> "Với cơ sở khoa học và quy chuẩn vững chắc làm nền tảng, em xin phép trình bày chi tiết về phần giải pháp thiết kế kiến trúc hệ thống và cơ chế cô lập dữ liệu đa thuê ở phần tiếp theo."

---

## Slide 7. PHẦN II — Kiến Trúc Tổng Thể & Cơ Chế Cô Lập Đa Thuê

### 🗣️ Lời thuyết trình:

> "Tiếp theo, em xin phép trình bày Phần II của khóa luận: Thiết kế kiến trúc tổng thể và các cơ chế cô lập dữ liệu đa thuê trong hệ thống QRTable."

### 🔄 Câu chuyển slide:

> "Trước hết, em xin giải thích lý do vì sao đề tài quyết định lựa chọn mô hình kiến trúc Microservices ở slide tiếp theo."

---

## Slide 8. Phân tích lựa chọn mô hình kiến trúc Microservices

### 🗣️ Lời thuyết trình:

> "Quyết định dùng microservices xuất phát từ đặc điểm nghiệp vụ, không phải xu hướng. Lewis và Fowler (2014) định nghĩa microservices là kiến trúc phân rã theo business capability — mỗi service chịu trách nhiệm một miền nghiệp vụ rõ ràng. QRTable có 7 miền như vậy, với nhịp thay đổi và quy tắc khác nhau: thực đơn/bàn thay đổi ít, đơn hàng thay đổi thường xuyên, KDS cần throughput cao, thanh toán cần audit trail chặt. Gom chung các miền này vào monolith không sai, nhưng sẽ làm mờ ranh giới trách nhiệm và khó scale từng phần độc lập.
>
> Quan trọng hơn, NIST SP 800-145 định nghĩa multi-tenant SaaS yêu cầu cô lập tài nguyên giữa các tenant. Trong monolith, cô lập này phải được thực thi hoàn toàn bằng code — dễ vi phạm khi team lớn. Microservices giúp ranh giới đó rõ ràng hơn về mặt tổ chức code.
>
> Tuy nhiên, quyết định này không miễn phí. Mỗi ranh giới service tạo ra chi phí: không có ACID chung, tenant context phải propagate, consistency phải xử lý từng luồng. Đó là lý do ACT 3 của bài trình bày sẽ đi vào từng cơ chế giải quyết."

---

## Slide 9. Mô hình kiến trúc tổng thể của hệ thống

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, để hiện thực hóa các mục tiêu đã đề ra, đây là sơ đồ kiến trúc tổng thể của nền tảng QRTable được thiết kế phân tầng theo mô hình 4 lớp độc lập.
>
> Tầng trên cùng là các Client ứng dụng phục vụ nhân viên quản lý và khách hàng quét QR tại bàn. Mọi giao tiếp từ Client bắt buộc phải đi qua tầng BFF Gateway. BFF đóng vai trò là chốt chặn bảo mật duy nhất tại biên, chịu trách nhiệm xác thực, phân quyền và điều phối yêu cầu. Một điểm mấu chốt ở đây là BFF hoàn toàn không sở hữu database nghiệp vụ và không chứa business logic phức tạp; nó chỉ chuyển giao các yêu cầu thông qua kết nối TCP hoặc gRPC vào tầng thứ ba là Domain Services gồm 7 dịch vụ độc lập.
>
> Mỗi dịch vụ tại tầng này là một 'Bounded Context' khép kín, tự sở hữu hoàn toàn cơ sở dữ liệu PostgreSQL hoặc MongoDB tương ứng của nó ở tầng Hạ tầng phía dưới. Thiết kế phân tầng này đảm bảo tính đóng gói dữ liệu và là cơ sở để thực thi ranh giới trách nhiệm giữa các dịch vụ."

---

## Slide 10. Ranh giới dịch vụ và Quyền sở hữu dữ liệu

### 🗣️ Lời thuyết trình:

> "Sau khi xác định kiến trúc tổng thể, câu hỏi tiếp theo là làm thế nào để bảo vệ tính toàn vẹn của dữ liệu chéo dịch vụ? Ranh giới dịch vụ và quyền sở hữu dữ liệu chính là câu trả lời.
>
> Để tránh việc các dịch vụ gọi chéo database của nhau - vốn là lỗi thiết kế phổ biến nhất khiến hệ phân tán biến thành một 'khối hỗn hợp phân tán' (distributed monolith) - chúng em áp dụng nguyên lý Database-per-service một cách triệt để. Mỗi dịch vụ chỉ quản lý một miền dữ liệu duy nhất và chịu trách nhiệm tuyệt đối về miền dữ liệu đó.
>
> Cụ thể, Catalog là dịch vụ duy nhất có quyền ghi nhận tồn kho món ăn; Order kiểm soát toàn bộ vòng đời đơn hàng và giỏ đặt món. Dịch vụ Kitchen hoàn toàn không có cơ sở dữ liệu bền vững để tăng tốc độ ghi đọc KDS, trạng thái bếp chỉ là một bản chiếu runtime được dựng trên Redis. Và Payment quản lý các bản ghi thanh toán độc lập. Chúng em áp dụng một quy tắc bất biến xuyên suốt thiết kế: không một dịch vụ nào được phép đọc hoặc ghi trực tiếp vào cơ sở dữ liệu của dịch vụ khác. Mọi trao đổi dữ liệu bắt buộc phải đi qua ranh giới API được định nghĩa rõ ràng."

---

## Slide 11. Mô hình giao tiếp hỗn hợp và phân tầng

### 🗣️ Lời thuyết trình:

> "Khi dữ liệu đã được cô lập hoàn hảo trong từng dịch vụ, việc kết nối chúng lại với nhau đòi hỏi một giải pháp đồng bộ và phi đồng bộ có chọn lọc. Quyết định của đề tài là xây dựng **Mô hình giao tiếp hỗn hợp và phân tầng (Hybrid & Layered Communication Model)**.
>
> Chúng em không áp dụng duy nhất một giao thức cho toàn bộ hệ thống, mà lựa chọn kênh giao tiếp dựa trên đặc thù nghiệp vụ. Đối với các tương tác trực tiếp yêu cầu kết quả tức thời, hệ thống sử dụng HTTP REST tại biên và TCP NestJS nội bộ để đạt độ trễ thấp nhất. gRPC được ưu tiên riêng cho Authorizer Service nhằm phục vụ xác thực tập trung với hợp đồng dữ liệu chặt chẽ (strongly-typed).
>
> Ngược lại, đối với các tác vụ xử lý bất đồng bộ sau khi giao dịch gốc đã commit thành công, hệ thống chuyển sang giao tiếp phi tập trung qua Kafka Message Broker bằng các Domain Events. Về phía client, để cập nhật trạng thái bếp realtime, chúng em dùng cơ chế WebSocket hint-and-refetch, chỉ phát đi một tín hiệu gợi ý nhỏ để client tự gọi API lấy dữ liệu mới, giúp giảm tải tối đa băng thông đường truyền. Nguyên tắc xuyên suốt là: không một kênh giao tiếp nào được phép phá vỡ ranh giới sở hữu dữ liệu đã thiết lập."

---

## Slide 12. Multi-Tenant Isolation — Lựa chọn mô hình & Cơ chế thực thi

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, đối với bài toán cô lập dữ liệu đa thuê trong mô hình SaaS theo chuẩn NIST SP 800-145, trên thế giới có ba mô hình phổ biến là Silo, Bridge và Pool.
>
> Với QRTable, chúng em quyết định lựa chọn mô hình **Pool Model** - tức là dùng chung cơ sở dữ liệu và bảng biểu, phân tách bằng cột `tenant_id`. Quyết định này giúp tối ưu hóa chi phí vận hành hạ tầng và đơn giản hóa quá trình đồng bộ hóa schema cho 7 dịch vụ vi dịch vụ.
>
> Tuy nhiên, điểm yếu cốt lõi của Pool Model là rủi ro rò rỉ dữ liệu chéo giữa các nhà hàng do sai sót khi viết code. Để triệt tiêu rủi ro này, chúng em xây dựng cơ chế thực thi cô lập tự động qua 4 lớp: Thứ nhất, xác định tenant ngay tại biên từ danh tính JWT hoặc phiên quét QR, không nhận qua body request. Thứ hai, đối chiếu chéo tại BFF Gateway để chặn yêu cầu sai lệch. Thứ ba, tự động truyền dẫn tenant_id vào header TCP nội bộ và Kafka event. Và thứ tư, tự động áp dụng bộ lọc SQL thông qua database subscriber và phân vùng key tại Redis/WebSocket. Cơ chế này đảm bảo dữ liệu của các nhà hàng luôn được cô lập an toàn mà không phụ thuộc vào việc lập trình viên có nhớ viết câu lệnh lọc hay không."

---

## Slide 13. Mô hình xác thực — Keycloak JWT và Phiên đặt món QR

### 🗣️ Lời thuyết trình:

> "Đối với luồng xác thực và phân quyền, hệ thống thiết kế hai tuyến bảo mật song song hội tụ tại BFF:
>
> Tuyến thứ nhất dành cho nhân viên và quản trị viên, được bảo vệ bởi giải pháp quản lý định danh tập trung **Keycloak Server** tuân thủ tiêu chuẩn OAuth 2.0 và OpenID Connect. Khi đăng nhập thành công, Keycloak sẽ cấp phát mã thông báo **JWT** đã ký số hóa chứa các thuộc tính phân quyền RBAC và nhãn đơn vị thuê `tenant_id`.
>
> Tuyến thứ hai dành cho khách hàng tại bàn để tối ưu hóa trải nghiệm. Khách hàng hoàn toàn stateless, không cần đăng ký tài khoản, quyền truy cập được cấp phát tạm thời qua mã **QR Token** và được đối chiếu trực tiếp với Session lưu trữ trong bộ đệm Redis.
>
> BFF Gateway sẽ tiếp nhận và trích xuất hai luồng token này để thiết lập ngữ cảnh tin cậy, sau đó định tuyến qua 5 lớp kiểm soát nghiêm ngặt trước khi đến với các dịch vụ lõi bên trong."

### 🔄 Câu chuyển slide:

> "Thiết lập phân quyền biên bảo vệ ranh giới bảo mật cho từng tenant. Tiếp theo, em xin giới thiệu Phần III của khóa luận, đi sâu vào thiết kế giao dịch phân tán và cơ chế thời gian thực tại bếp."

---

## Slide 14. PHẦN III — Giao Dịch Phân Tán & Truyền Tải Thời Gian Thực

### 🗣️ Lời thuyết trình:

> "Sau khi đã thiết lập nền tảng kiến trúc và xác thực, em xin phép chuyển sang Phần III: Thiết kế chi tiết các giao dịch phân tán và cơ chế truyền tải thời gian thực bếp."

### 🔄 Câu chuyển slide:

> "Để bảo vệ tính toàn vẹn dữ liệu trước khi đi vào các giao dịch phức tạp, chúng em thiết lập 3 cơ chế cơ sở như trình bày ở slide tiếp theo."

---

## Slide 15. Các Primitive bảo vệ tính nhất quán phân tán

### 🗣️ Lời thuyết trình:

> "Trong monolith, ta không bao giờ cần bận tâm đến các cơ chế xử lý trùng lặp hay xung đột phức tạp vì database local và memory tập trung lo hết. Nhưng trong microservices, do ranh giới database per-service và hệ thống được scale-out nhiều instance, chúng em phải tự tay thiết lập 4 primitive để bảo vệ dữ liệu.
>
> Thứ nhất, Idempotency tại Catalog: Catalog gắn mỗi lệnh trừ kho với một key duy nhất — nếu mạng chập chờn và Order gọi lại, Catalog trả kết quả đã lưu thay vì trừ kho lần hai. Thứ hai, Deduplication tại Kitchen: Kitchen lưu eventId đã xử lý vào Redis, nhận event trùng thì bỏ qua. Thứ ba, Transactional Outbox tại Order: Order ghi trạng thái đơn hàng và event vào DB trong cùng một transaction local, đảm bảo trạng thái đổi thì event chắc chắn được phát.
>
> Và thứ tư, Optimistic Concurrency Control (OCC) cho giỏ hàng dùng chung tại bàn: thay vì dùng khóa phân tán (distributed lock) gây nghẽn, Order Service sử dụng thuộc tính `cartVersion` trong Redis. Khi thiết bị gửi yêu cầu cập nhật giỏ, hệ thống so khớp version hiện tại; nếu phát hiện mismatch (do thiết bị khác đã sửa trước), yêu cầu sẽ bị từ chối và buộc client phải refetch dữ liệu mới nhất.
>
> Tuy nhiên, 4 primitive này mới chỉ giải quyết vấn đề ở từng service đơn lẻ. Chúng không giải quyết được kịch bản lỗi một phần (partial failure): Catalog trừ kho xong, nhưng mạng đứt và Order commit thất bại. Đó là lúc chúng ta phải bước vào thế giới của Saga."

---

## Slide 16. Thiết kế giao dịch phân tán — Lựa chọn mô hình Saga

### 🗣️ Lời thuyết trình:

> "Như đã phân tích, 3 cơ chế nền tảng trước chỉ bảo vệ từng dịch vụ đơn lẻ. Khi có lỗi chéo database, chúng ta cần đến mô hình giao dịch phân tán Saga.
>
> Về mặt thiết kế, thế giới có hai mô hình chính: Choreography (phi tập trung) và Orchestration (tập trung). Với Choreography, các dịch vụ tự phát và lắng nghe sự kiện của nhau. Mô hình này tuy đơn giản ban đầu nhưng khi luồng nghiệp vụ phình to, nó sẽ tạo ra sự phụ thuộc vòng chéo nhau và cực kỳ khó debug.
>
> Để khắc phục, đề tài lựa chọn mô hình **Orchestration (Điều phối tập trung)**. Chúng em thiết lập một bộ điều phối Orchestrator nằm tại Order Service để kiểm soát toàn bộ máy trạng thái của đơn hàng. Cách tiếp cận này giúp cô lập logic nghiệp vụ, dễ dàng giám sát trạng thái đơn hàng thời gian thực và quản lý các giao dịch bù khi có lỗi.
>
> Ngay sau đây, em xin phép trình bày chi tiết luồng xử lý thành công của bộ điều phối này."

### 🔄 Câu chuyển slide:

> "Chúng ta hãy cùng đi vào chi tiết luồng điều phối thành công của Order Confirm Saga qua sơ đồ sequence diagram sau."

---

## Slide 17. Giao dịch phân tán — Quy trình xác nhận đơn hàng thành công

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, để giải quyết bài toán giao dịch phân tán giữa Order, Catalog và Kitchen Service mà không dùng ACID database truyền thống, đề tài áp dụng mô hình **Saga Orchestration** kết hợp cơ chế bù trừ.
>
> Ý tưởng cốt lõi là phân rã giao dịch thành 3 giao dịch cục bộ độc lập: $T_1$ tại Order để khóa dòng đơn hàng, $T_2$ tại Catalog để giữ kho, và $T_3$ tại Kitchen để đẩy bếp. Chúng em áp dụng một kiến trúc lai (Hybrid): chặng từ Order sang Catalog ($T_1 \rightarrow T_2$) chạy đồng bộ qua TCP để kiểm tra kho tức thời, tránh overselling, trong khi chặng đẩy sang bếp chạy bất đồng bộ qua Kafka để giải phóng tài nguyên.
>
> Đặc biệt, cơ chế bù trừ được thiết kế tự động. Nếu chặng sau thất bại hoặc khách hàng không thanh toán, Orchestrator sẽ gửi lệnh bù $C_2$ sang Catalog để giải phóng kho. Cơ chế này được bảo vệ bằng Idempotency chống trùng lệnh và bộ đếm thời gian TTL tự hủy để tránh rò rỉ tài nguyên."

---

## Slide 18. Thiết kế giao dịch bù (Compensating Transactions) cho các nhánh lỗi

### 🗣️ Lời thuyết trình:

> "Như đã đặt vấn đề ở slide trước, giá trị thực sự của Saga không phải ở luồng thành công, mà nằm ở tính chịu lỗi và khả năng tự động hoàn trả trạng thái thông qua các compensating transaction.
>
> Trong monolith, khi một bước lỗi, database engine tự động rollback vật lý về trạng thái ban đầu. Nhưng trong microservices, khi Catalog đã trừ kho xong mà Order commit tại database cục bộ thất bại, ta không thể rollback vật lý Catalog. Chúng em bắt buộc phải tự kích hoạt giao dịch bù ở tầng ứng dụng — cụ thể là Order gọi Catalog giải phóng lượng tồn kho đã giữ với đúng reservationVersion.
>
> Có ba trường hợp lỗi chính được thiết kế: Đơn không hợp lệ $\rightarrow$ từ chối sớm không side effect; Catalog báo hết kho $\rightarrow$ Order tự rollback local, không cần bù; và phức tạp nhất là Catalog trừ kho xong nhưng Order commit lỗi $\rightarrow$ Order gọi compensating transaction giải phóng kho. Cơ chế versioning bảo đảm các lệnh release cũ đến trễ sẽ bị từ chối để tránh tranh chấp dữ liệu."

### 🔄 Câu chuyển slide:

> "Đó là cách hệ thống xử lý lỗi và hoàn trả trạng thái cho luồng giao dịch xác nhận đơn hàng. Bên cạnh đó, đề tài còn thiết kế một quy trình Saga thứ hai dành riêng cho việc khởi tạo nhà hàng mới. Em xin giới thiệu ngắn gọn ở slide tiếp theo."

---

## Slide 19. Giao dịch phân tán — Quy trình cấp phát tài nguyên đa thuê tự động

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, bên cạnh chuỗi giao dịch xác nhận đơn hàng, đề tài còn thiết kế và hiện thực hóa quy trình **SaaS Onboarding Saga** để điều phối cấp phát tài nguyên tự động cho một nhà hàng mới.
>
> Bộ điều phối tập trung tại SaaS Service sẽ kiểm soát 4 bước chéo qua các dịch vụ SaaS, phân quyền User-Access, cấu hình Keycloak OIDC, và liên kết cổng thanh toán SePay. Quy trình hỗ trợ đầy đủ 3 luồng xử lý: thành công kích hoạt trạng thái, chặn yêu cầu lặp bằng Idempotency Key, từ chối sớm dữ liệu sai tại BFF, cùng với giao dịch bù khi có lỗi.
>
> Tuy nhiên, do giới hạn về mặt thời gian, em xin phép được lướt nhanh qua sơ đồ này và di chuyển trực tiếp đến cơ chế thời gian thực tại bếp."

### 🔄 Câu chuyển slide:

> "Sau đây em xin chuyển sang cơ chế hiển thị bếp realtime (KDS) ngay sau khi đơn hàng được xác nhận nhất quán."

---

## Slide 20. Cơ chế đồng bộ trạng thái bếp thời gian thực (KDS Runtime Projection)

### 🗣️ Lời thuyết trình:

> "Dạ, như đã chuyển mạch ở slide trước, ngay sau khi đơn hàng được xác nhận thành công và ghi nhận nhất quán chéo dịch vụ, sự kiện `order.confirmed` được phát qua Kafka.
>
> Tại đây, Kitchen consumer tiếp nhận và tiến hành khởi tạo bản chiếu trạng thái bếp (KDS projection) trong bộ nhớ đệm Redis: bao gồm Hash để lưu thông tin chi tiết ticket, Sorted Set xếp hàng đợi FIFO theo SLA, và dedupe key để lọc các gói tin trùng lặp. Khi dữ liệu KDS thay đổi, hệ thống phát đi tín hiệu qua Redis Pub/Sub, BFF tiếp nhận và gửi một thông điệp WebSocket hint cực nhẹ tới room KDS.
>
> Client KDS nhận hint và tự gọi ngược lại REST API để refetch snapshot dữ liệu mới nhất. Cơ chế 'hint-and-refetch' này giúp hệ thống đạt cập nhật realtime cực kỳ tối ưu về mặt băng thông và tài nguyên, đồng thời giữ vững nguyên tắc: Order Service luôn là nguồn trạng thái đúng duy nhất (source of truth).
>
> Đây cũng là nội dung khép lại 3 nhóm giải pháp phân tán chính của đề tài. Để chứng minh tính đúng đắn của các giải pháp thiết kế này, chúng em đã xây dựng hệ thống kiểm chứng thực nghiệm đa lớp, em xin trình bày chi tiết ở chương kiểm chứng sau đây."

### 🔄 Câu chuyển slide:

> "Đó là toàn bộ 3 nhóm giải pháp phân tán chính của hệ thống. Để chứng minh tính đúng đắn và khả năng chịu tải của các giải pháp này, đề tài xây dựng hệ thống kiểm chứng thực nghiệm đa lớp. Em xin trình bày chi tiết ở chương kiểm chứng sau đây."

---

## Slide 21. PHẦN IV — Kiểm Chứng Thực Nghiệm Đa Lớp

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, để chứng minh các giải pháp thiết kế trên hoạt động đúng đắn và chịu tải tốt, em xin trình bày Phần IV: Kiểm chứng thực nghiệm đa lớp."

### 🔄 Câu chuyển slide:

> "Trước tiên là triết lý thiết lập hệ thống kiểm chứng qua mô hình kim tự tháp 4 lớp ở slide tiếp theo."

---

## Slide 22. Phương pháp luận kiểm chứng — Mô hình bốn lớp bằng chứng

### 🗣️ Lời thuyết trình:

> "Kiểm chứng hệ thống phân tán không thể chỉ dừng ở demo UI. Chúng em sử dụng 4 lớp bằng chứng: hành vi người dùng quan sát được, thiết kế kiến trúc và ownership từ source code, test suite có thể chạy lặp lại, và trạng thái runtime từ PostgreSQL, Redis và Kafka."

---

## Slide 23. Kết quả kiểm chứng Saga — Bảo toàn 6 bất biến nghiệp vụ

### 🗣️ Lời thuyết trình:

> "Saga không chỉ được thiết kế đẹp trên sơ đồ — còn phải có bằng chứng từ test suite. 6 test case kiểm chứng 6 invariant khác nhau.
>
> Race condition: hai người xác nhận cùng lúc cho phần ăn cuối — chỉ một thành công, stock về đúng 0. Lost response: Catalog đã trừ kho nhưng mạng mất gói phản hồi — retry trả REPLAYED, stock không bị trừ lần hai. Stale release: lệnh giải phóng kho cũ đến sau reservation mới — Catalog từ chối với STALE. Rollback: Catalog trừ kho xong, Order save thất bại — compensation giải phóng kho về trạng thái trước. Tất cả 6 invariant có bằng chứng từ test."

---

## Slide 24. Kiểm thử liên kết luồng nghiệp vụ cuối-đến-cuối (E2E Integration Testing)

### 🗣️ Lời thuyết trình:

> "Ngoài Saga tests, hệ thống còn được kiểm chứng theo luồng E2E hoàn chỉnh. Với mỗi bước từ QR đến thanh toán, đều có trạng thái vật lý tương ứng có thể xác minh — từ Redis session, PostgreSQL order state, stock reservation, đến Kafka event và Redis KDS projection.
>
> Ba công cụ observability bổ sung bằng chứng vận hành: Allure Report trực quan hóa kết quả test automation; Kafkio cho thấy event stream thực tế trong Kafka cluster; Redis Insight cho thấy trạng thái projection và session. Những công cụ này chứng minh cơ chế hoạt động trong môi trường tích hợp."

### 🔄 Câu chuyển slide:

> "Đó là cách chúng em kiểm chứng tính đúng đắn của luồng nghiệp vụ E2E trên một dòng chảy tích hợp. Tuy nhiên, đối với một hệ thống SaaS đa thuê như QRTable, chúng em còn cần phải chứng minh khả năng mở rộng ngang Active-Active của BFF và Order Service khi vận hành đa thực thể. Em xin trình bày chi tiết ở slide tiếp theo."

---

## Slide 25. Kiểm chứng khả năng mở rộng ngang (Functional Scale-Out)

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, để chứng minh thiết kế hệ thống hỗ trợ khả năng mở rộng ngang Active-Active mà không gặp rủi ro bất nhất dữ liệu, đề tài thực hiện kịch bản kiểm chứng khả năng mở rộng ngang (Functional Scale-Out).
>
> Chúng em kiểm thử qua hai kịch bản trừu tượng hóa các bài toán kinh điển của hệ thống phân tán:
>
> Kịch bản thứ nhất là **Đồng bộ hóa phiên kết nối thời gian thực chéo thực thể**. Khi client của khách hàng và bếp kết nối tới các thực thể BFF khác nhau, hệ thống sử dụng trục truyền tin Pub/Sub để định tuyến chính xác các gói tin WebSocket chéo thực thể mà không làm đứt gãy luồng realtime.
>
> Kịch bản thứ hai là **Kiểm soát tương tranh phân tán**. Khi nhiều thực thể dịch vụ xử lý cùng lúc các yêu cầu ghi chéo database, đề tài áp dụng cơ chế khóa dòng bi quan (Pessimistic Locking) tại cơ sở dữ liệu để đảm bảo các yêu cầu được tuần tự hóa, triệt tiêu hoàn toàn race condition và tránh thất thoát tài nguyên tồn kho.
>
> Kết quả kiểm chứng tự động đều ghi nhận trạng thái PASS hoàn toàn trên cả hai kịch bản mở rộng này."

### 🔄 Câu chuyển slide:

> "Sau khi đã kiểm chứng tính đúng đắn về mặt chức năng của mô hình đa thực thể, đề tài tiếp tục đo lường hiệu năng tải thực tế bằng công cụ K6 ở slide tiếp theo."

---

## Slide 26. Thực nghiệm đo lường hiệu năng cơ sở bằng công cụ K6

### 🗣️ Lời thuyết trình:

> "Dạ, để hoàn thiện kim tự tháp bằng chứng, chúng em tiến hành thực nghiệm đo lường hiệu năng cơ sở của hệ thống bằng công cụ K6 trên 3 kịch bản tải mô phỏng nghiệp vụ thực tế:
>
> Kịch bản thứ nhất là **Đọc nền (read-baseline)**: giả lập tải tăng dần từ 5 lên 15 người dùng đồng thời trong 2 phút, thực hiện các tác vụ đọc tần suất cao gồm: kiểm tra sẵn sàng, định danh tenant, truy xuất thực đơn và quét mã QR lỗi. Kết quả hệ thống xử lý thành công **4.336 yêu cầu** với thông lượng **26,14 RPS**, độ trễ p95 đạt mức cực thấp là **24,10 ms** nhờ tối ưu hóa bộ đệm Redis cho luồng đọc.
>
> Kịch bản thứ hai là luồng **Khách đặt món (customer-ordering)**: giả lập hành trình hoàn chỉnh của khách hàng gồm quét mã tham gia phiên bàn, xem menu, cập nhật giỏ hàng và gửi đơn. Kịch bản này đi qua chuỗi API nghiệp vụ phức tạp chéo dịch vụ và đạt độ trễ p95 là **47,37 ms**.
>
> Kịch bản thứ ba là luồng **Xác nhận đơn và bếp KDS (confirm-kds-pulse)**: mô phỏng hành vi nhân viên và nhà bếp gồm tạo đơn hàng mẫu, xác nhận đơn để kích hoạt luồng Saga, và nhà bếp đọc hàng đợi chế biến KDS. Kịch bản ghi nhận độ trễ p95 rất tốt, chỉ **32,98 ms**.
>
> Toàn bộ các thực nghiệm đều đạt tỷ lệ lỗi **0,00%**, đáp ứng 100% điều kiện kiểm chứng. Từ kết quả trên, đề tài rút ra hai kết luận hiệu năng quan trọng: Một là bộ đệm Redis đã cô lập và xử lý rất tốt luồng đọc mà không ảnh hưởng database lõi. Hai là các giao dịch phân tán (Saga) chéo dịch vụ đều đạt thời gian phản hồi xuất sắc dưới 50ms, chứng minh thiết kế kiến trúc hoàn toàn không gây nút thắt cổ chai hiệu năng."

### 🔄 Câu chuyển slide:

> "Trong suốt quá trình đo tải bằng K6, làm thế nào chúng em quan sát và phân tích được hành vi của hệ thống? Đó chính là nhờ hạ tầng giám sát toàn diện dựa trên 3 trụ cột Observability mà em xin trình bày chặng đầu tiên về đo lường hiệu năng hệ thống."

---

## Slide 27. Giám sát hiệu năng hệ thống qua Grafana Dashboard

### 🗣️ Lời thuyết trình:

> "Để giám sát toàn diện hệ thống khi vận hành dưới tải, chúng em đã thiết lập bộ ba công cụ giám sát Prometheus, Loki và Tempo, trực quan hóa trên **Grafana**.
>
> Trên slide là ảnh chụp thực tế bảng điều khiển **Grafana System Overview** ghi nhận đúng vào thời điểm chạy kịch bản Đọc nền của K6. Bảng trạng thái phía trên cho thấy cả 4 vi dịch vụ gồm BFF, Authorizer, SaaS và Kitchen đều ở trạng thái `UP`.
>
> Biểu đồ **HTTP Request Rate** ghi nhận tải thực tế tăng dần và đi ngang ổn định ở mức sát **30 req/s** (đạt khoảng 28 req/s tại đỉnh khi chạy đủ 15 VUs), hoàn toàn khớp với con số thông lượng trung bình 26,03 RPS trên toàn phiên đo của K6. Đặc biệt, ô **HTTP Error Ratio** hiển thị trạng thái **'No data'**, tức là tỷ lệ lỗi bằng 0%. Biểu đồ **HTTP Latency P95** bên dưới cho thấy thời gian xử lý phía server rất thấp, dao động ổn định từ **7 ms đến 8 ms**."

### 🔄 Câu chuyển slide:

> "Bên cạnh các chỉ số tài nguyên phần cứng, hệ thống còn tự động xuất ra các chỉ số nghiệp vụ đặc thù của POS, được theo dõi chi tiết ở slide tiếp theo."

---

## Slide 28. Giám sát chỉ số nghiệp vụ ứng dụng qua Prometheus

### 🗣️ Lời thuyết trình:

> "Không chỉ đo tải phần cứng, chúng em còn kiểm chứng tính đúng đắn nghiệp vụ thông qua các bộ đếm trên **Prometheus** khi các kịch bản đặt món và xác nhận đơn bếp ở Slide 26 chạy.
>
> Nhìn vào giao diện truy vấn Prometheus trên slide, chúng em chạy hàm `increase` trong khoảng thời gian 5 phút cho 3 chỉ số nghiệp vụ:
>
> - Đầu tiên, bộ đếm đơn hàng gửi lên `qrtable_orders_submitted_total` ghi nhận giá trị tăng thêm **~6,3**.
> - Bộ đếm đơn hàng xác nhận thành công `qrtable_orders_confirmed_total` tăng **~1,05**.
> - Bộ đếm vé bếp tạo ra `qrtable_kds_tickets_created_total` cũng tăng chính xác **~1,05**.
>
> Các con số này thực chất biểu thị có **6 đơn hàng được gửi lên, 1 đơn được xác nhận và 1 vé bếp được khởi tạo** trong phiên test (các giá trị lẻ là do thuật toán nội suy của Prometheus trên chu kỳ 5 phút). Bằng chứng này khẳng định luồng nghiệp vụ phân tán đã chạy thông suốt từ Order Service sang Kitchen Service chéo database."

### 🔄 Câu chuyển slide:

> "Tuy nhiên, để thực sự hiểu rõ đường đi của một request chéo qua nhiều dịch vụ và định vị lỗi phân tán, chúng em sử dụng giải pháp tối tân nhất là Distributed Tracing."

---

## Slide 29. Phân vết giao dịch phân tán qua Tempo Distributed Tracing

### 🗣️ Lời thuyết trình:

> "Cuối cùng, đối với các trường hợp lỗi nghiệp vụ có kiểm soát phát sinh trong phiên đo tải ở Slide 26 — cụ thể là kịch bản quét mã QR không hợp lệ bị từ chối sớm — chúng em sử dụng **Grafana Tempo** để phân vết cuộc gọi distributed tracing.
>
> Sơ đồ phân vết trên slide hiển thị trực quan cuộc gọi validate QR bị từ chối với mã lỗi màu đỏ. Tổng thời gian xử lý của request chỉ mất vỏn vẹn **6,09 ms**:
>
> - Giai đoạn xử lý tại controller là **5,62 ms**. Trong đó, gọi Redis cực nhanh chỉ mất khoảng **500 đến 600 micro-giây** cho mỗi lệnh GET.
> - Lời gọi TCP sang SaaS Service để định danh tenant mất **559 micro-giây** (với câu lệnh SQL chỉ mất **420 micro-giây**).
> - Lời gọi TCP sang Catalog Service để kiểm tra mã QR mất **922 micro-giây** (với câu lệnh SQL chỉ mất **743 micro-giây**).
>
> Biểu đồ span latency chi tiết đến mức micro-giây này chứng minh biên bảo mật và các service định tuyến cực kỳ nhanh chóng mà không gây nghẽn cổ chai cho các dịch vụ lõi phía sau."

### 🔄 Câu chuyển slide:

> "Sự kết hợp giữa kiểm chứng tự động và giám sát runtime đã mang lại bằng chứng thực nghiệm rõ ràng nhất cho đề tài. Sau đây, em xin phép bước sang Phần V: Tổng kết và hướng phát triển."

---

## Slide 30. PHẦN V — Tổng Kết & Hướng Phát Triển

### 🗣️ Lời thuyết trình:

> "Cuối cùng, em xin chuyển sang Phần V: Tổng kết các kết quả đạt được của đề tài và định hướng phát triển trong tương lai."

### 🔄 Câu chuyển slide:

> "Em xin tóm lược các đóng góp cốt lõi của khóa luận ở slide tiếp theo."

---

## Slide 31. Đóng góp kỹ thuật và Hạn chế của đề tài

### 🗣️ Lời thuyết trình:

> "Kính thưa Hội đồng, trải qua quá trình nghiên cứu và thực nghiệm, đề tài rút ra ba đóng góp kỹ thuật cốt lõi:
>
> Thứ nhất, chúng em đã thực hiện hóa một kiến trúc tham chiếu F&B SaaS multi-tenant hoàn chỉnh dưới dạng Microservices, giải quyết triệt để bài toán cô lập tài nguyên đa thuê. Thứ hai, đề tài thiết kế mô hình giao dịch phân tán Saga tích hợp Idempotency bảo đảm tính toàn vẹn nghiệp vụ dưới các kịch bản lỗi mạng. Thứ ba, chúng em đề xuất một phương pháp luận kiểm chứng thực nghiệm đa lớp có tính tái tạo cao thông qua kiểm thử tự động kết hợp hạ tầng quan sát runtime.
>
> Bên cạnh đó, đề tài cũng thẳng thắn nhìn nhận hai hạn chế kỹ thuật: việc đo lường mới dừng lại ở môi trường sandbox cục bộ và toàn bộ backend stack chưa được triển khai thực tế trên production cloud do giới hạn tài nguyên. Định hướng tiếp theo của đề tài là di chuyển hệ thống lên Kubernetes để triển khai đám mây và thực hiện kiểm thử đo lường chịu tải tối đa bằng K6."

---

## Slide 32. Tổng kết báo cáo và Trình diễn hệ thống (Demo)

### 🗣️ Lời thuyết trình:

```
① Customer PWA: QR scan → session context hiển thị (tenant + table)
② Shared cart: nhiều khách thêm món, demo cartVersion prevent ghi đè
③ Submit order → PENDING state visible tại POS
④ POS confirm → stock_reservations tạo + order PROCESSING (PostgreSQL)
⑤ KDS ticket → Redis ZSet visible qua Redis Insight
⑥ Payment (tiền mặt hoặc QR) → bill PAID, session closed
```

**Fallback nếu lỗi:**

- Screenshot E2E golden flow
- DB state (PostgreSQL direct query)
- Redis Insight snapshot
- Allure test evidence
- Kafkio topic screenshot

---

## Appendix F. Sơ đồ: Cây quyết định lựa chọn phương thức giao tiếp (Kafka vs BFF Direct vs TCP)

### 🗣️ Lời thuyết trình:

> "Dạ, sơ đồ này mô tả cây quyết định lựa chọn tích hợp Kafka của đề tài dựa trên khung 4P: bao gồm phản ứng chéo miền nghiệp vụ, tách biệt ràng buộc thời gian, phân phát sự kiện dạng fan-out tới nhiều dịch vụ, và bảo vệ tính nguyên tử của giao dịch qua Outbox."

---

## Appendix L. Sơ đồ: Tổng quan mẫu Transactional Outbox và Saga

### 🗣️ Lời thuyết trình:

> "Dạ, sơ đồ này minh họa mối quan hệ kiến trúc tổng quát giữa bộ điều phối Saga và mẫu thiết kế Transactional Outbox. Ý tưởng cốt lõi là giải quyết bài toán Dual-Write (ghi database và gửi message broker bất đồng bộ). Bằng cách gom hành động ghi dữ liệu nghiệp vụ và ghi sự kiện vào Outbox Table trong cùng một transaction của database cục bộ, chúng em đảm bảo rằng sự kiện nghiệp vụ chắc chắn sẽ được phát hành thành công sang Kafka qua tiến trình Outbox Relay, thiết lập cơ sở cho sự nhất quán cuối cùng của Saga."

---

## Appendix M. Sơ đồ: Biên commit và xử lý outbox (Order Confirm Saga)

### 🗣️ Lời thuyết trình:

> "Dạ, đây là sơ đồ chi tiết về biên commit giao dịch trong luồng xác nhận đơn. Sơ đồ mô tả thời điểm ranh giới mà Order Service đóng băng transaction cục bộ để cam kết dữ liệu xuống đĩa cùng với bản ghi Outbox. Chỉ khi biên này hoàn tất thành công, Outbox Relay mới quét và phát tán sự kiện đi. Thiết kế này giúp cô lập hoàn toàn giao dịch cục bộ và bảo vệ hệ thống khỏi sự bất nhất nếu mạng bị ngắt quãng giữa chừng."

---

## Appendix N. Sơ đồ: Luồng giao dịch bù trừ (Order Confirm Compensation)

### 🗣️ Lời thuyết trình:

> "Dạ, sơ đồ này mô tả chi tiết nhánh lỗi và quy trình bù trừ khi xác nhận đơn hàng thất bại. Khi Catalog Service phản hồi không đủ hàng hoặc xảy ra lỗi kết nối, Order Service với tư cách là Orchestrator sẽ kích hoạt giao dịch bù, gửi lệnh hủy giữ kho cục bộ tại Catalog Service. Việc này giúp thu hồi chính xác số lượng món ăn đã tạm khóa và khôi phục trạng thái nhất quán ban đầu của hệ thống."

---

## Appendix O. Sơ đồ: Xử lý trùng lặp & Idempotency (Order Confirm Saga)

### 🗣️ Lời thuyết trình:

> "Dạ, đây là cơ chế xử lý trùng lặp và chính sách thử lại chéo dịch vụ. Trong hệ thống phân tán, do mạng không ổn định, một thông điệp có thể được gửi đi nhiều lần. Sơ đồ minh họa cách Catalog Service sử dụng bảng phiên bản giữ kho (Reservation Version) để nhận diện các yêu cầu bị trùng lặp dựa trên Order ID. Nếu nhận được yêu cầu trùng, hệ thống chỉ trả về kết quả đã xử lý mà không thực thi lại, đảm bảo tính Idempotency tuyệt đối."

---

## Appendix P. Sơ đồ: Tích hợp Outbox sang KDS Kitchen

### 🗣️ Lời thuyết trình:

> "Dạ, sơ đồ này thể hiện chi tiết hành trình vận chuyển thông điệp từ bảng Outbox ở Order DB qua Kafka Broker và đi vào Kitchen Service để đẩy lên màn hình KDS. Sơ đồ chứng minh cơ chế tích hợp bất đồng bộ hoàn toàn (Loosely Coupled), giúp Kitchen Service tự cô lập xử lý và cập nhật trạng thái hiển thị bếp thời gian thực thông qua kết nối WebSocket mà không gây ảnh hưởng đến hiệu năng ghi đơn của Order Service."

---

## Appendix Q. Sơ đồ: Luồng chính khởi tạo tài nguyên đa thuê (SaaS Tenant Provisioning)

### 🗣️ Lời thuyết trình:

> "Dạ, sơ đồ này minh họa quy trình cấp phát tài nguyên phân tán (SaaS Tenant Provisioning) chéo qua 3 miền hệ thống: Miền quản lý trạng thái thuê bao (SaaS Service), Miền lưu trữ dữ liệu biệt lập (PostgreSQL Dynamic Database Provisioning), và Miền kiểm soát định danh (Keycloak Identity Provider). Saga Orchestrator đóng vai trò là một điều phối viên trung tâm, đảm bảo các nguồn tài nguyên rời rạc được cấu hình đồng bộ và chính xác cho doanh nghiệp mới mà không làm phá vỡ biên an toàn cô lập đa thuê."

---

## Appendix R. Sơ đồ: Luồng giao dịch bù trừ khi khởi tạo lỗi (SaaS Provisioning Compensation)

### 🗣️ Lời thuyết trình:

> "Dạ, đây là cơ chế rollback hạ tầng tự động khi có sự cố trong chuỗi onboarding. Do quy trình này tương tác trực tiếp với các tài nguyên hệ thống thực tế (như tạo cơ sở dữ liệu vật lý và tài khoản bảo mật), bất kỳ lỗi nào xảy ra ở bước sau cũng sẽ làm rò rỉ tài nguyên. Saga Orchestrator sẽ kích hoạt luồng bù trừ theo thứ tự đảo ngược, thực hiện giải phóng tài nguyên vật lý và khôi phục trạng thái hệ thống về điểm an toàn trước khi thực hiện, đảm bảo tính toàn vẹn và sạch sẽ của hạ tầng đa thuê."

---

## Appendix S. Cơ sở Lý thuyết & Tài liệu tham chiếu gốc (Theoretical Foundations & Citations)

### 🗣️ Lời thuyết trình:

> "Dạ thưa Hội đồng, để chứng minh thiết kế tham chiếu của đề tài là quy chuẩn và khoa học, chúng em đã tuân thủ nghiêm ngặt các tiêu chuẩn quốc tế và nghiên cứu khoa học gốc. Cụ thể, mô hình SaaS dựa trên NIST SP 800-145; thiết kế dịch vụ và DB độc lập tuân thủ nguyên lý Bounded Context của Sam Newman và Chris Richardson; luồng giao dịch phân tán dựa trên nghiên cứu Saga gốc năm 1987 của Garcia-Molina và Transactional Outbox; và các giao tiếp realtime, bảo mật đều đạt chuẩn RFC và khung OWASP ASVS."

---
