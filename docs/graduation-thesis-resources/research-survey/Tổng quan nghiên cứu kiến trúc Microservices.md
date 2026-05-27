# **Phân tích hệ thống SaaS POS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices và Event-Driven Architecture: Tổng quan nghiên cứu và thực tiễn triển khai tại Việt Nam**

Sự phát triển của nền kinh tế số và sự thay đổi trong hành vi tiêu dùng sau đại dịch đã thúc đẩy nhu cầu chuyển đổi số mạnh mẽ trong ngành dịch vụ ăn uống (F\&B) và bán lẻ. Các hệ thống quản lý bán hàng (Point of Sale \- POS) truyền thống đang dần được thay thế bởi các nền tảng Phần mềm dưới dạng dịch vụ (Software as a Service \- SaaS) hiện đại. Những nền tảng này không chỉ dừng lại ở việc tính tiền mà còn tích hợp các giải pháp tự động hóa như đặt món qua mã QR (QR Ordering), thanh toán điện tử và quản trị dữ liệu tập trung. Để đáp ứng yêu cầu về khả năng mở rộng, tính sẵn sàng cao và khả năng xử lý giao dịch phức tạp, kiến trúc Microservices kết hợp với mô hình hướng sự kiện (Event-Driven Architecture \- EDA) đã trở thành tiêu chuẩn vàng trong thiết kế hệ thống.1

## **Tiến trình nghiên cứu học thuật về Microservices và SaaS tại các đại học kỹ thuật Việt Nam**

Trong ba năm gần đây, các đại học kỹ thuật hàng đầu tại Việt Nam như Đại học Công nghệ Thông tin (UIT), Đại học Bách khoa Hà Nội (HUST) và Đại học Công nghệ – Đại học Quốc gia Hà Nội (VNU-UET) đã ghi nhận sự gia tăng mạnh mẽ các nghiên cứu liên quan đến kiến trúc phần mềm hiện đại. Các đề tài này không chỉ mang tính lý thuyết mà còn tập trung vào việc giải quyết các bài toán thực tế của doanh nghiệp Việt Nam trong quá trình chuyển đổi số.

### **Hoạt động nghiên cứu và tiêu chuẩn học thuật tại UIT và VNU-UET**

Tại Trường Đại học Công nghệ Thông tin (UIT), đặc biệt là Khoa Công nghệ Phần mềm, các khóa luận tốt nghiệp trong giai đoạn 2023-2024 đã đặt ra những tiêu chuẩn khắt khe về quy trình phát triển và báo cáo. Ví dụ, lớp SE505.O11.PMCL yêu cầu sinh viên phải tuân thủ nghiêm ngặt các mẫu trình bày và quy trình xác nhận từ giảng viên hướng dẫn trước khi ra bảo vệ.3 Các nghiên cứu tại đây thường tập trung vào việc tối ưu hóa quy trình triển khai phần mềm (CI/CD) và khả năng bảo trì của hệ thống Microservices.

Tại Trường Đại học Công nghệ (VNU-UET), lễ bảo vệ đồ án/khóa luận tốt nghiệp đợt 1 năm 2024 cho sinh viên khóa QH-2020-I/CQ đã cho thấy sự kết nối sâu sắc giữa nhà trường và doanh nghiệp.4 Các đề tài nhận được sự quan tâm lớn từ các chuyên gia như TS. Nguyễn Việt Cường, Tổng Giám đốc Công ty TNHH Tích hợp thông minh, người đánh giá cao việc sinh viên tiếp cận các kiến trúc hệ thống tính toán hiệu năng cao và các mô hình AI phục vụ ứng dụng thực tế.4 Điều này minh chứng rằng các nghiên cứu về Microservices không còn nằm trong phạm vi phát triển web đơn thuần mà đã mở rộng sang các hệ thống tích hợp phức tạp.

| Tiêu chí xét duyệt khóa luận (VNU-UET 2024-2025) | Yêu cầu chi tiết                                                                   |
| :----------------------------------------------- | :--------------------------------------------------------------------------------- |
| Điểm trung bình chung tích lũy (TBC)             | Phải đạt từ 3.0 trở lên.5                                                          |
| Tổng số tín chỉ tích lũy (STCTL)                 | Phải đạt tối thiểu 90 tín chỉ.5                                                    |
| Kết nối doanh nghiệp                             | Thúc đẩy sự tham gia của các chuyên gia từ ngành công nghiệp vào hội đồng bảo vệ.4 |

Nguồn: 4

### **Xu hướng nghiên cứu về Microservices và Event-Driven Architecture**

Các nghiên cứu tại Việt Nam trong giai đoạn này phản ánh xu hướng toàn cầu về việc chia nhỏ các hệ thống nguyên khối thành các dịch vụ độc lập. Kiến trúc Microservices được định nghĩa là một phương pháp phát triển ứng dụng thông qua việc chia nhỏ thành các thành phần độc lập, mang lại tính linh hoạt, mở rộng và dễ dàng quản lý.6 Việc định nghĩa rõ ràng các chức năng, đầu vào và đầu ra của mỗi dịch vụ giúp đảm bảo sự mạch lạc trong cả phát triển và vận hành.2

Một trong những trọng tâm nghiên cứu là khả năng chịu lỗi (Fault Tolerance). Trong kiến trúc Microservices, khi một thành phần bị lỗi, hệ thống có thể thay thế bằng các thành phần dự phòng mà không làm gián đoạn hoạt động của toàn bộ hệ thống.7 Điều này đặc biệt quan trọng đối với các nền tảng SaaS POS, nơi một sự cố nhỏ trong dịch vụ in bếp không được phép làm tê liệt dịch vụ thanh toán hoặc đặt món tại bàn.

## **Kiến trúc Microservices trong bối cảnh nền tảng SaaS POS**

Hệ thống SaaS POS hiện đại đòi hỏi sự kết hợp giữa tính linh hoạt của Microservices và khả năng phục vụ đa người dùng của mô hình SaaS. Việc chuyển dịch từ kiến trúc Monolithic sang Microservices không chỉ là một thay đổi kỹ thuật mà còn là sự thay đổi trong tư duy quản lý sản phẩm.

### **Đặc trưng cốt lõi của Microservices trong hệ thống bán hàng**

Kiến trúc Microservices cho phép mỗi module như quản lý kho, đặt món qua QR, thanh toán, và quản lý khách hàng (CRM) hoạt động như các dịch vụ riêng biệt.1 Các đặc trưng này bao gồm:

1. **Tính chuyên biệt (Specialization)**: Mỗi dịch vụ đại diện cho một phân khúc chức năng trong chuỗi giá trị doanh nghiệp. Ví dụ, một Microservice chịu trách nhiệm riêng cho việc xử lý mã QR sẽ chỉ tập trung vào việc giải mã định danh bàn và nhà hàng, sau đó kích hoạt các sự kiện liên quan.2
2. **Linh hoạt công nghệ**: Do các dịch vụ độc lập với nhau, đội ngũ phát triển có thể sử dụng các ngôn ngữ khác nhau (Java, Go, Node.js) tùy thuộc vào yêu cầu hiệu năng của từng dịch vụ.2
3. **Quản lý đơn giản với đội ngũ nhỏ**: Thay vì một đội ngũ khổng lồ làm việc trên một mã nguồn duy nhất, các nhóm nhỏ có thể sở hữu toàn bộ vòng đời của một dịch vụ, từ phát triển đến triển khai.2

### **Thách thức về tính nhất quán dữ liệu**

Thách thức lớn nhất khi áp dụng Microservices cho POS là việc duy trì tính nhất quán dữ liệu trên các cơ sở dữ liệu phân tán. Do mỗi dịch vụ có cơ sở dữ liệu riêng, các giao dịch truyền thống không thể thực thi. Đây là lúc các mô hình như Saga Pattern và Event-Driven Architecture trở nên thiết yếu.8

## **Phân tích chuyên sâu về Saga Pattern và Apache Kafka trong giao dịch phân tán**

Trong các hệ thống giao dịch tài chính và đơn hàng tại Việt Nam, Saga Pattern đã trở thành giải pháp tiêu chuẩn để quản lý các quy trình nghiệp vụ kéo dài qua nhiều dịch vụ.

### **Cơ chế Saga: Choreography và Orchestration**

Saga là một chuỗi các giao dịch cục bộ, trong đó mỗi giao dịch cập nhật cơ sở dữ liệu của một dịch vụ và phát ra một sự kiện để kích hoạt giao dịch tiếp theo.8

- **Choreography-based Saga**: Trong mô hình này, các dịch vụ tự trao đổi sự kiện với nhau mà không cần bộ điều phối trung tâm. Đây là phương pháp phổ biến cho các sàn giao dịch thương mại điện tử tại Việt Nam. Ví dụ, khi nhận yêu cầu đặt món qua QR, dịch vụ Đơn hàng tạo trạng thái PENDING và phát sự kiện OrderCreated. Dịch vụ Thanh toán lắng nghe sự kiện này để thực hiện trừ tiền.8
- **Orchestration-based Saga**: Một bộ điều phối (Orchestrator) sẽ gửi lệnh đến các dịch vụ và xử lý các phản hồi. Mô hình này giúp giảm bớt sự phức tạp của luồng sự kiện khi quy trình nghiệp vụ trở nên quá rắc rối.8

### **Vai trò của Apache Kafka trong hệ sinh thái Microservices**

Kafka không chỉ đơn thuần là một hàng đợi thông điệp mà là một nền tảng dòng sự kiện (event streaming platform) mạnh mẽ. Kafka cho phép các dịch vụ liên lạc bất đồng bộ, giúp tách biệt các dịch vụ và tăng cường khả năng mở rộng.10

| Thành phần Kafka   | Đặc tính kỹ thuật                                 | Ứng dụng trong giao dịch POS                                                                   |
| :----------------- | :------------------------------------------------ | :--------------------------------------------------------------------------------------------- |
| Topic & Partition  | Chia nhỏ luồng dữ liệu để xử lý song song.12      | Xử lý đồng thời hàng nghìn đơn hàng QR từ nhiều nhà hàng khác nhau.                            |
| Replication Factor | Đảm bảo tính dư thừa và an toàn dữ liệu.12        | Bảo vệ dữ liệu giao dịch tài chính ngay cả khi một máy chủ Kafka (Broker) gặp sự cố.           |
| Log Compaction     | Lưu giữ trạng thái mới nhất của một khóa dữ liệu. | Duy trì trạng thái đơn hàng hiện tại mà không cần lưu trữ toàn bộ lịch sử nếu không cần thiết. |
| Retention Policy   | Kiểm soát thời gian lưu trữ dữ liệu trên đĩa.12   | Lưu trữ lịch sử giao dịch trong một khoảng thời gian nhất định để đối soát.                    |

Kafka đảm bảo rằng các thông điệp không bị mất nhờ hệ thống lưu trữ bền vững. Điều này cực kỳ quan trọng đối với các Saga, vì nó cho phép hệ thống khôi phục trạng thái của các giao dịch đang diễn ra sau khi gặp sự cố.10 Ngoài ra, việc sử dụng Kafka cho Event Sourcing cho phép tái cấu trúc lại trạng thái của ứng dụng tại bất kỳ thời điểm nào bằng cách phát lại các sự kiện đã lưu trữ.10

### **Giao dịch bù (Compensating Transactions) trong thực tế**

Khi một bước trong chuỗi Saga thất bại (ví dụ: khách hàng không đủ số dư trong ví điện tử MoMo), Saga phải thực hiện các giao dịch bù để hoàn tác các bước trước đó.8 Trong quy trình POS, nếu món ăn đã được xác nhận ở bếp nhưng thanh toán thất bại, hệ thống sẽ tự động phát sự kiện CancelOrder, kích hoạt dịch vụ Bếp để hủy đơn và dịch vụ Kho để hoàn trả nguyên liệu.

## **Chiến lược đa thuê (Multi-tenancy) cho nền tảng SaaS POS**

Đối với một nền tảng SaaS, khả năng phục vụ nhiều khách hàng (tenants) trên một phiên bản phần mềm duy nhất là yếu tố cốt lõi để đạt được hiệu quả kinh tế theo quy mô.13

### **Các mô hình cô lập dữ liệu**

Việc lựa chọn kiến trúc cơ sở dữ liệu ảnh hưởng trực tiếp đến khả năng mở rộng, bảo mật và chi phí vận hành.

1. **Shared Database, Shared Schema (Silo qua Discriminator Column)**:
   - Tất cả dữ liệu của các nhà hàng nằm trong cùng một bảng, phân biệt bởi cột tenant_id.14
   - Đây là mô hình phổ biến cho các startup giai đoạn đầu nhờ chi phí hạ tầng thấp và dễ quản lý.17
   - Thách thức lớn nhất là rủi ro rò rỉ dữ liệu nếu các câu truy vấn không được lọc đúng cách.15
2. **Shared Database, Separate Schemas**:
   - Mỗi nhà hàng có một schema riêng nhưng dùng chung một cơ sở dữ liệu vật lý.15
   - Cung cấp sự cân bằng giữa khả năng cô lập và chi phí, nhưng có thể gặp giới hạn về số lượng schema trên một DB server.15
3. **Database per Tenant**:
   - Mỗi khách hàng có một cơ sở dữ liệu riêng biệt. Đây là lựa chọn tối ưu cho các chuỗi nhà hàng lớn yêu cầu bảo mật tuyệt đối và hiệu năng ổn định, không bị ảnh hưởng bởi các "hàng xóm ồn ào" (noisy neighbors).17
   - Mô hình này cho phép sao lưu và khôi phục dữ liệu cho từng khách hàng một cách độc lập.15

| So sánh chỉ số hiệu năng (Dựa trên nghiên cứu thực tế) | Trước tối ưu hóa                       | Sau tối ưu hóa (Shared Schema \+ Caching) |
| :----------------------------------------------------- | :------------------------------------- | :---------------------------------------- |
| Sử dụng tài nguyên CPU của Database                    | Cao (do truy vấn thiếu chỉ mục tenant) | Giảm 40%.13                               |
| Thời gian phản hồi API trung bình                      | 400ms                                  | 120ms.13                                  |
| Hiệu quả báo cáo tuân thủ (Compliance)                 | Chậm, tốn nhân lực                     | Tăng 60% tốc độ báo cáo.13                |

Nguồn: 13

### **Triển khai kỹ thuật với Discriminator Column**

Trong các framework như Hibernate, việc sử dụng annotation @TenantId cho phép hệ thống tự động chèn bộ lọc vào mọi câu lệnh SELECT, đảm bảo người dùng chỉ thấy dữ liệu thuộc về tenant của mình.18 Tuy nhiên, các phương thức truy cập trực tiếp bằng ID như findById thường bỏ qua các bộ lọc này, đòi hỏi các biện pháp bảo mật bổ sung như Entity Listeners để kiểm tra quyền sở hữu dữ liệu trước khi thực hiện bất kỳ thay đổi nào.18

Việc quản lý ngữ cảnh người thuê (Tenant Context) phải được thực hiện từ tầng API. Mỗi yêu cầu từ khách hàng quét mã QR phải mang theo thông tin nhận diện (JWT token chứa tenant claim hoặc subdomain), từ đó dịch vụ sẽ xác định được không gian dữ liệu cần truy cập.13

## **Phân tích thực tiễn tại các doanh nghiệp POS hàng đầu Việt Nam**

Các doanh nghiệp như KiotViet, Sapo và iPOS.vn đã triển khai những giải pháp công nghệ đặc thù để xử lý hàng triệu giao dịch mỗi ngày.

### **Sapo: Ứng dụng Spring Boot và Netflix OSS**

Sapo đã chia sẻ kinh nghiệm triển khai Microservices sử dụng hệ sinh thái Spring Boot. Kiến trúc của họ nhấn mạnh vào:

- **Service Discovery (Eureka)**: Tự động phát hiện và quản lý các instance của dịch vụ.22
- **API Gateway (Zuul)**: Điểm vào duy nhất cho mọi yêu cầu, xử lý xác thực và điều phối luồng.22
- **Xác thực tập trung (OAuth2)**: Đảm bảo bảo mật trên toàn hệ thống phân tán.22
- **Domain Driven Design (DDD)**: Phân ranh giới dịch vụ dựa trên các nghiệp vụ thực tế, giúp hệ thống không bị biến thành "distributed monolith".22

### **iPOS.vn: Hệ sinh thái đặt món và thanh toán QR**

iPOS.vn đã ra mắt giải pháp QR đa năng tích hợp với MoMo vào tháng 9/2023, mang lại đặc quyền miễn phí phí dịch vụ và phí giao dịch cho hàng trăm ngàn khách hàng.23 Về mặt kỹ thuật, hệ thống này yêu cầu sự đồng bộ chặt chẽ giữa ứng dụng khách hàng và máy POS tại cửa hàng. Các cài đặt món ăn được phân cấp rõ ràng (món cha, món con, món kèm) để phục vụ các yêu cầu phức tạp như chọn mức đường, đá trong trà sữa hoặc món phụ trong combo.24

### **KiotViet: Tối ưu hóa cho quy mô lớn**

Với vị thế là nền tảng phổ biến nhất, KiotViet áp dụng Microservices để chia nhỏ bài toán quản lý bán hàng vốn rất cồng kềnh. Việc tách biệt dữ liệu giúp họ dễ dàng mở rộng cho các cửa hàng mới mà không ảnh hưởng đến hiệu năng của các cửa hàng hiện có.1 Các blog kỹ thuật nhấn mạnh tính độc lập và khả năng phòng chống lỗi là yếu tố then chốt giúp KiotViet duy trì sự ổn định trong các dịp cao điểm như lễ tết.2

## **Tích hợp đặt món qua mã QR: Quy trình và Công nghệ**

Đặt món qua mã QR (QR Ordering) không chỉ là việc hiển thị thực đơn mà là một quy trình khép kín từ nhận diện đến thanh toán và phục vụ.

### **Cơ chế định danh và điều phối**

Khi khách hàng quét mã QR tại bàn, hệ thống phải thực hiện "Tenant Discovery" để xác định bàn đó thuộc nhà hàng nào và trạng thái hiện tại của bàn (có đang có khách hay không).14 Thông tin này thường được nhúng trong mã QR dưới dạng một định danh duy nhất (UUID).

Quy trình xử lý đơn hàng điển hình:

1. **Khởi tạo**: Khách hàng chọn món, dịch vụ Đơn hàng tạo bản ghi với trạng thái PENDING.
2. **Sự kiện**: Đơn hàng phát sự kiện OrderSubmitted vào Kafka.8
3. **Thanh toán**: Dịch vụ Thanh toán nhận sự kiện, gọi API ví điện tử (MoMo/ZaloPay). Nếu thành công, phát sự kiện PaymentConfirmed.
4. **Thông báo**: Dịch vụ Bếp lắng nghe PaymentConfirmed, in hóa đơn bếp và hiển thị trên màn hình điều phối của đầu bếp.

### **Tối ưu hóa trải nghiệm người dùng qua Microservices**

Sử dụng Redis để cache thông tin thực đơn giúp giảm tải cho database chính, đảm bảo tốc độ phản hồi cực nhanh khi khách hàng quét mã.13 Ngoài ra, việc sử dụng WebSocket cho phép cập nhật trạng thái đơn hàng (ví dụ: "Món ăn đang được chế biến", "Món ăn đã sẵn sàng") theo thời gian thực đến điện thoại của khách hàng mà không cần tải lại trang.

## **Các khía cạnh bảo mật trong hệ thống SaaS POS phân tán**

Bảo mật dữ liệu trong kiến trúc Microservices và đa thuê là một bài toán phức tạp đòi hỏi sự phối hợp của nhiều tầng.

### **Xác thực và Ủy quyền (AuthN & AuthZ)**

Mô hình bảo mật hiện đại tách biệt giữa danh tính toàn cầu (Global Identity) và quyền hạn trong một tenant cụ thể. Một người dùng có thể đăng nhập bằng một email duy nhất nhưng có vai trò khác nhau tại các chi nhánh hoặc nhà hàng khác nhau.14

- **Xác thực**: Thực hiện ở cấp độ toàn cục để xác định "Bạn là ai".
- **Ủy quyền**: Thực hiện trong ngữ cảnh của một tenant để xác định "Bạn được làm gì trong nhà hàng này".14

### **Bảo mật dòng dữ liệu Kafka**

Với vai trò là nơi lưu chuyển các giao dịch tài chính, cụm Kafka cần được bảo mật bằng cơ chế SASL/SSL để mã hóa dữ liệu trên đường truyền và xác thực các dịch vụ kết nối vào chủ đề (topic).12 Việc ghi lại mọi hoạt động của tenant vào các nhật ký kiểm soát (audit logs) bất biến là yêu cầu bắt buộc để tuân thủ các tiêu chuẩn như HIPAA hay SOC2 trong các ngành nhạy cảm.13

## **Phân tích tác động kinh tế và hiệu quả vận hành của nền tảng SaaS**

Việc triển khai Microservices không chỉ là một quyết định kỹ thuật mà còn mang lại những lợi ích kinh tế rõ rệt cho doanh nghiệp SaaS và các nhà hàng sử dụng dịch vụ.

1. **Giảm chi phí hạ tầng**: Thông qua việc chia sẻ tài nguyên (Resource Pooling) trong mô hình đa thuê, chi phí cho mỗi khách hàng (cost-per-tenant) giảm đáng kể so với mô hình cài đặt riêng lẻ.25
2. **Cập nhật liên tục (Seamless Upgrades)**: Kiến trúc Microservices cho phép triển khai các tính năng mới cho hàng ngàn khách hàng cùng lúc mà không gây gián đoạn dịch vụ.25
3. **Khả năng mở rộng linh hoạt**: Khi một nhà hàng phát triển từ một quán nhỏ thành chuỗi, hệ thống có thể dễ dàng chuyển đổi từ mô hình Shared Database sang Dedicated Database mà không cần thay đổi quá nhiều mã nguồn ứng dụng.17

| Lợi ích kinh tế                      | Giải thích chi tiết                                         | Tác động dài hạn                                                    |
| :----------------------------------- | :---------------------------------------------------------- | :------------------------------------------------------------------ |
| Kinh tế quy mô (Economies of Scale)  | Một instance ứng dụng phục vụ nhiều khách hàng.             | Giảm Tổng chi phí sở hữu (TCO) cho nhà cung cấp.26                  |
| Tốc độ đổi mới (Innovation Velocity) | Các đội ngũ nhỏ phát triển và triển khai tính năng độc lập. | Giúp doanh nghiệp phản ứng nhanh với các thay đổi của thị trường.13 |
| Độ tin cậy (Reliability)             | Tự động hóa việc sao lưu và dự phòng cho toàn bộ tenant.    | Tăng uy tín thương hiệu và giảm thiểu rủi ro pháp lý.25             |

## **Kết luận và hướng nghiên cứu tương lai**

Tổng quan các nghiên cứu học thuật và thực tiễn doanh nghiệp tại Việt Nam cho thấy kiến trúc Microservices kết hợp với Event-Driven Architecture là sự lựa chọn tối ưu cho việc xây dựng nền tảng SaaS POS tích hợp đặt món qua mã QR. Việc áp dụng các mẫu thiết kế như Saga Pattern và sử dụng các nền tảng như Apache Kafka giúp giải quyết triệt để bài toán nhất quán dữ liệu trong hệ thống phân tán.

Các nghiên cứu tại UIT, HUST và VNU đã đặt nền móng lý thuyết vững chắc, trong khi các doanh nghiệp như Sapo hay iPOS.vn đã chứng minh tính hiệu quả của các công nghệ này trong thực tế. Hướng nghiên cứu tiếp theo có thể tập trung vào việc ứng dụng trí tuệ nhân tạo để dự báo nhu cầu nguyên liệu dựa trên dữ liệu đặt món thời gian thực, hoặc tối ưu hóa chi phí điện toán đám mây thông qua các kiến trúc Serverless Microservices.

Sự kết hợp giữa học thuật và thực tiễn sẽ tiếp tục thúc đẩy các giải pháp SaaS POS tại Việt Nam đạt được những tiêu chuẩn cao hơn về bảo mật, hiệu năng và khả năng phục vụ đa dạng các nhu cầu của ngành F\&B trong kỷ nguyên số. Việc nắm vững các nguyên lý về cô lập dữ liệu đa thuê và quản lý sự kiện sẽ là chìa khóa để các kỹ sư phần mềm Việt Nam xây dựng những hệ thống có khả năng cạnh tranh không chỉ trong nước mà còn trên thị trường quốc tế.

#### **Nguồn trích dẫn**

1. Tổng quan về Microservices (Phần 1\) \- Saigon Technology Careers, truy cập vào tháng 2 13, 2026, [https://careers.saigontechnology.com/blog-detail/tong-quan-ve-microservices-phan-1](https://careers.saigontechnology.com/blog-detail/tong-quan-ve-microservices-phan-1)
2. Chuyển đổi số thông minh với Microservices: Tối ưu hóa tính linh hoạt và tăng trưởng, truy cập vào tháng 2 13, 2026, [https://tacasoft.vn/blog/microservices](https://tacasoft.vn/blog/microservices)
3. Thông báo nộp báo cáo Khóa luận tốt nghiệp đợt 1 năm học 2023 \- 2024 \- UIT, truy cập vào tháng 2 13, 2026, [https://www.uit.edu.vn/thong-bao-nop-bao-cao-khoa-luan-tot-nghiep-dot-1-nam-hoc-2023-2024](https://www.uit.edu.vn/thong-bao-nop-bao-cao-khoa-luan-tot-nghiep-dot-1-nam-hoc-2023-2024)
4. Trường Đại học Công nghệ tổ chức thành công Lễ bảo vệ đồ án/khóa luận tốt nghiệp đợt 1 năm 2024, truy cập vào tháng 2 13, 2026, [https://uet.edu.vn/truong-dai-hoc-cong-nghe-chuc-thanh-cong-le-bao-ve-ankhoa-luan-tot-nghiep-dot-1-nam-2024/](https://uet.edu.vn/truong-dai-hoc-cong-nghe-chuc-thanh-cong-le-bao-ve-ankhoa-luan-tot-nghiep-dot-1-nam-2024/)
5. ĐĂNG KÝ ĐỀ TÀI, CÁN BỘ HƯỚNG DẪN KLTN BẢO VỆ ĐỢT 1 NĂM 2025 \- VNU-UET, truy cập vào tháng 2 13, 2026, [https://uet.vnu.edu.vn/dang-ky-de-tai-can-bo-huong-dan-kltn-bao-ve-dot-1-nam-2025/](https://uet.vnu.edu.vn/dang-ky-de-tai-can-bo-huong-dan-kltn-bao-ve-dot-1-nam-2025/)
6. Learn about Microservice in 5 minutes / Kien Le TV \- YouTube, truy cập vào tháng 2 13, 2026, [https://www.youtube.com/watch?v=RIskLUHXljs](https://www.youtube.com/watch?v=RIskLUHXljs)
7. Phát Triển Phần Mềm Theo Kiến Trúc Microservice Và Kiến Trúc Nguyên Khối (Monolithic), truy cập vào tháng 2 13, 2026, [https://www.dantrisoft.com/2021/04/phat-trien-phan-mem-theo-kien-truc-microservices-va-nguyen-khoi.html](https://www.dantrisoft.com/2021/04/phat-trien-phan-mem-theo-kien-truc-microservices-va-nguyen-khoi.html)
8. SAGA Pattern trong Microservices \- TopDev, truy cập vào tháng 2 13, 2026, [https://topdev.vn/blog/saga-pattern-trong-microservices/](https://topdev.vn/blog/saga-pattern-trong-microservices/)
9. Giải quyết bài toán giao dịch phân tán trong Microservices với Saga Pattern \- Viblo, truy cập vào tháng 2 13, 2026, [https://viblo.asia/p/giai-quyet-bai-toan-giao-dich-phan-tan-trong-microservices-voi-saga-pattern-5OXLA3884Gr](https://viblo.asia/p/giai-quyet-bai-toan-giao-dich-phan-tan-trong-microservices-voi-saga-pattern-5OXLA3884Gr)
10. Kafka with SAGA Design Pattern. Each HTTP request occurs network… | by Dushan Senadheera | Medium, truy cập vào tháng 2 13, 2026, [https://medium.com/@dcsenadheera777/kafka-with-saga-design-pattern-2db86bc5a41e](https://medium.com/@dcsenadheera777/kafka-with-saga-design-pattern-2db86bc5a41e)
11. Kafka in the Microservice Architecture: How It Can Help You, truy cập vào tháng 2 13, 2026, [https://kafkaide.com/learn/kafka-in-the-microservice-architecture/](https://kafkaide.com/learn/kafka-in-the-microservice-architecture/)
12. Kafka và Microservices: Tổng quan \- ProHoster, truy cập vào tháng 2 13, 2026, [https://prohoster.info/vi/blog/administrirovanie/kafka-i-mikroservisy-obzor](https://prohoster.info/vi/blog/administrirovanie/kafka-i-mikroservisy-obzor)
13. Multi-Tenant SaaS Architecture: Scaling for Growth \- Telliant – Intelligent Software Delivered, truy cập vào tháng 2 13, 2026, [https://www.telliant.com/multi-tenant-saas-architecture-scaling-for-growth/](https://www.telliant.com/multi-tenant-saas-architecture-scaling-for-growth/)
14. The developer's guide to SaaS multi-tenant architecture \- WorkOS, truy cập vào tháng 2 13, 2026, [https://workos.com/blog/developers-guide-saas-multi-tenant-architecture](https://workos.com/blog/developers-guide-saas-multi-tenant-architecture)
15. Multi-Tenant Database Architecture Patterns Explained \- Bytebase, truy cập vào tháng 2 13, 2026, [https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/](https://www.bytebase.com/blog/multi-tenant-database-architecture-patterns-explained/)
16. Single Database Multi-Tenancy \- Discriminator Column | Grails Guides, truy cập vào tháng 2 13, 2026, [https://guides.grails.org/discriminator-per-tenant/guide/index.html](https://guides.grails.org/discriminator-per-tenant/guide/index.html)
17. Multi-Tenant SaaS: A Deep Dive into Database Design Approaches | by Manu Venugopalan, truy cập vào tháng 2 13, 2026, [https://medium.com/@manu.venugopalan_55726/multi-tenant-saas-a-deep-dive-into-database-design-approaches-3a01fe0c083b](https://medium.com/@manu.venugopalan_55726/multi-tenant-saas-a-deep-dive-into-database-design-approaches-3a01fe0c083b)
18. Implementing Multi-Tenancy using a discriminator column with Spring and Hibernate, truy cập vào tháng 2 13, 2026, [https://eltonk.com.br/implementing-multi-tenancy-using-a-discriminator-column-with-spring-and-hibernate-778334ea009d](https://eltonk.com.br/implementing-multi-tenancy-using-a-discriminator-column-with-spring-and-hibernate-778334ea009d)
19. Building A Multi-Tenant SaaS \- Kestra, truy cập vào tháng 2 13, 2026, [https://kestra.io/blogs/2024-03-08-building-multi-tenant-saas](https://kestra.io/blogs/2024-03-08-building-multi-tenant-saas)
20. The Multi-Tenancy: Why a Database Per Tenant Model is the New Standard for SaaS \- VE3, truy cập vào tháng 2 13, 2026, [https://www.ve3.global/the-multi-tenancy-why-a-database-per-tenant-model-is-the-new-standard-for-saas/](https://www.ve3.global/the-multi-tenancy-why-a-database-per-tenant-model-is-the-new-standard-for-saas/)
21. Multi-Tenant with shared database and discriminator column \- Stack Overflow, truy cập vào tháng 2 13, 2026, [https://stackoverflow.com/questions/66253842/multi-tenant-with-shared-database-and-discriminator-column](https://stackoverflow.com/questions/66253842/multi-tenant-with-shared-database-and-discriminator-column)
22. Sapo Microservices Architecture | PDF \- Slideshare, truy cập vào tháng 2 13, 2026, [https://www.slideshare.net/slideshow/sapo-microservices-architecture/85162560](https://www.slideshare.net/slideshow/sapo-microservices-architecture/85162560)
23. Giải pháp thanh toán bằng mã QR đa năng MoMo dành cho khách hàng iPOS.vn: Tiền về liền tay \- Ngăn rủi ro ngay\!, truy cập vào tháng 2 13, 2026, [https://ipos.vn/qr-da-nang-momo-danh-cho-khach-hang-ipos-vn/](https://ipos.vn/qr-da-nang-momo-danh-cho-khach-hang-ipos-vn/)
24. Cài đặt món \- Hướng dẫn từ iPOS, truy cập vào tháng 2 13, 2026, [https://huongdan.ipos.vn/docs/huong-dan-su-dung-ipos-crm/cai-dat-nha-hang-mon-an/mon/](https://huongdan.ipos.vn/docs/huong-dan-su-dung-ipos-crm/cai-dat-nha-hang-mon-an/mon/)
25. Multi-tenant Vs. Single-tenant Architecture (SaaS) \- SAP Community, truy cập vào tháng 2 13, 2026, [https://community.sap.com/t5/technology-blog-posts-by-members/multi-tenant-vs-single-tenant-architecture-saas/ba-p/13154806](https://community.sap.com/t5/technology-blog-posts-by-members/multi-tenant-vs-single-tenant-architecture-saas/ba-p/13154806)
26. Schema Flexibility and Data Sharing in Multi-Tenant Databases \- mediaTUM, truy cập vào tháng 2 13, 2026, [https://mediatum.ub.tum.de/doc/1075044](https://mediatum.ub.tum.de/doc/1075044)
