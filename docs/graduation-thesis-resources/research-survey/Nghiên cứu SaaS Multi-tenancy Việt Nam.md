# **Nghiên cứu mô hình SaaS Multi-tenancy và giải pháp cô lập dữ liệu tại thị trường POS Việt Nam**

Sự phát triển của nền kinh tế số tại Việt Nam đã đặt ra những yêu cầu cấp thiết về việc tối ưu hóa quy trình quản trị doanh nghiệp, đặc biệt trong lĩnh vực dịch vụ ăn uống (F\&B) và bán lẻ. Mô hình Phần mềm dưới dạng Dịch vụ (SaaS) với kiến trúc Multi-tenancy (đa bên thuê) đã trở thành xương sống cho các nền tảng quản lý bán hàng (POS) hiện đại. Nghiên cứu này tập trung vào việc phân tích chuyên sâu các phương pháp thích nghi kiến trúc, cơ chế cô lập dữ liệu và những thách thức về hạ tầng mà các doanh nghiệp đầu ngành như KiotViet, Sapo và iPOS.vn đang đối mặt. Thông qua việc đánh giá các mô hình kỹ thuật từ góc độ chuyên gia, báo cáo cung cấp một nền tảng tri thức quan trọng cho việc xây dựng hệ thống QRTable – một nền tảng SaaS POS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices.

## **Phân tích thị trường F\&B Việt Nam và nhu cầu chuyển đổi số**

Thị trường F\&B Việt Nam năm 2024 và dự báo cho năm 2025 cho thấy một bức tranh đầy biến động với sự đan xen giữa tăng trưởng doanh thu và sự thu hẹp số lượng điểm bán. Theo báo cáo từ iPOS.vn, tổng số cửa hàng dịch vụ ẩm thực tại Việt Nam đạt mốc 323.010 cửa hàng, chỉ tăng trưởng 1,8% so với năm trước, thấp hơn đáng kể so với mức tăng trưởng 3,1% của năm 2023\.1 Tuy nhiên, doanh thu toàn ngành lại ghi nhận sự gia tăng ấn tượng lên tới 16,6%, đạt khoảng 688,8 nghìn tỷ đồng.1 Điều này cho thấy sự tập trung hóa của thị trường, nơi các đơn vị có năng lực quản trị tốt và ứng dụng công nghệ hiệu quả đang chiếm lĩnh thị phần từ các hộ kinh doanh nhỏ lẻ kém thích nghi.

Sự chuyển dịch trong hành vi tiêu dùng là một yếu tố then chốt thúc đẩy nhu cầu về SaaS POS. Có tới 52,3% người Việt lựa chọn chi tiêu dưới 35.000 VND cho một đơn vị đồ uống, phản ánh xu hướng tối giản và thắt chặt chi tiêu trong bối cảnh kinh tế khó khăn.1 Các chủ nhà hàng buộc phải tìm kiếm những giải pháp phần mềm không chỉ giúp bán hàng mà còn phải tối ưu hóa chi phí vận hành, giảm thiểu thất thoát và tăng cường trải nghiệm khách hàng thông qua các hình thức như đặt món tại bàn qua mã QR.

Trong sáu tháng đầu năm 2024, thị trường chứng kiến sự đóng cửa của ít nhất 30.000 cửa hàng F\&B.4 Nghịch lý này tạo ra áp lực đào thải lớn, buộc các nhà cung cấp giải pháp POS phải thay đổi phương thức tiếp cận. Thay vì chỉ cung cấp một công cụ tính tiền đơn thuần, các doanh nghiệp như KiotViet, Sapo và iPOS.vn đang chuyển mình thành những hệ sinh thái số toàn diện, hỗ trợ từ quản lý kho, nhân sự đến kết nối các sàn thương mại điện tử và ứng dụng giao hàng.6

| Chỉ số kinh tế ngành F\&B Việt Nam 2024       | Giá trị | Tăng trưởng so với 2023 | Nguồn |
| :-------------------------------------------- | :------ | :---------------------- | :---- |
| Số lượng cửa hàng dịch vụ ẩm thực             | 323.010 | 1,8%                    | 1     |
| Tổng doanh thu ngành (nghìn tỷ đồng)          | 688,8   | 16,6%                   | 3     |
| Số lượng cửa hàng đóng cửa (6 tháng đầu năm)  | 30.000  | \-                      | 5     |
| Doanh thu 6 tháng đầu năm (nghìn tỷ đồng)     | 403,9   | \-                      | 2     |
| Tỷ lệ người dân tin tưởng vào tương lai ngành | 79,6%   | \-                      | 8     |

## **Bản chất của kiến trúc SaaS Multi-tenancy trong lĩnh vực POS**

Kiến trúc Multi-tenancy là mô hình trong đó một thực thể phần mềm duy nhất phục vụ nhiều khách hàng (tenants). Mỗi khách hàng chia sẻ các tài nguyên tính toán, bộ nhớ và hạ tầng mạng chung nhưng dữ liệu của họ phải được tách biệt hoàn toàn về mặt logic hoặc vật lý.9 Đối với các hệ thống POS dành cho hàng nghìn nhà hàng nhỏ lẻ, Multi-tenancy không chỉ là một lựa chọn kỹ thuật mà là một yêu cầu kinh tế để duy trì mức giá dịch vụ thấp.

Một trong những nguyên tắc cốt lõi của Multi-tenancy là khả năng mở rộng (scalability) và hiệu quả tài nguyên. Thay vì triển khai một instance riêng cho mỗi nhà hàng (Single-tenant), nhà cung cấp SaaS chỉ duy trì một nền tảng duy nhất, giúp giảm chi phí bảo trì và nâng cấp.11 Khi có một bản cập nhật tính năng mới hoặc vá lỗi bảo mật, nó sẽ được áp dụng đồng thời cho toàn bộ hàng nghìn khách hàng, đảm bảo tính nhất quán của dịch vụ.13

Tuy nhiên, Multi-tenancy cũng mang lại những thách thức đáng kể về bảo mật và hiệu năng. Nguy cơ lớn nhất là hiện tượng "hàng xóm ồn ào" (noisy neighbor), nơi một khách hàng sử dụng quá nhiều tài nguyên gây ảnh hưởng đến các khách hàng khác.15 Ngoài ra, việc rò rỉ dữ liệu giữa các tenant là một thảm họa về niềm tin mà không một doanh nghiệp SaaS nào muốn đối mặt.9 Do đó, việc thiết kế cơ chế cô lập dữ liệu và quản lý định danh là nhiệm vụ hàng đầu của các kiến trúc sư phần mềm.

## **Phương pháp Sửa đổi và Thích nghi (Adaptation) cho phần mềm SaaS**

Tại thị trường Việt Nam, việc triển khai một giải pháp SaaS POS "nguyên bản" từ các mô hình quốc tế thường gặp khó khăn do đặc thù văn hóa kinh doanh, hạ tầng mạng và yêu cầu về tính tức thời. Các doanh nghiệp nội địa đã phát triển những phương pháp thích nghi (Adaptation) đặc thù để tồn tại và phát triển.

### **Thích nghi với hạ tầng mạng: Chiến lược Offline-first**

Một trong những đặc điểm nổi bật nhất của các phần mềm như iPOS.vn và KiotViet là khả năng hoạt động ngay cả khi không có kết nối internet. iPOS FABi và FABiBox được thiết kế với kiến trúc cho phép lưu trữ dữ liệu tạm thời tại thiết bị đầu cuối (máy POS, điện thoại) và thực hiện đồng bộ hóa ngay khi kết nối được phục lập.1 Điều này cực kỳ quan trọng đối với các nhà hàng tại Việt Nam, nơi sự ổn định của Wifi hoặc 4G không phải lúc nào cũng được đảm bảo trong các giờ cao điểm hoặc ở các khu vực đông đúc.

Cơ chế thích nghi này đòi hỏi một hệ thống xử lý xung đột dữ liệu tinh vi. Khi dữ liệu được đồng bộ từ hàng nghìn điểm bán lên server Multi-tenant, hệ thống phải đảm bảo các mã hóa đơn, lượt đặt món và trạng thái kho được cập nhật chính xác theo trình tự thời gian, tránh tình trạng trùng lặp hoặc mất mát dữ liệu do độ trễ đồng bộ.1

### **Thích nghi với nghiệp vụ đa dạng: Feature Flags và Cấu hình động**

Thị trường F\&B Việt Nam rất đa dạng, từ các quán vỉa hè, xe đẩy đến các chuỗi nhà hàng cao cấp. Một hệ thống SaaS POS phải đủ linh hoạt để phục vụ tất cả các mô hình này mà không cần thay đổi code base cho từng khách hàng. Các doanh nghiệp áp dụng cơ chế Feature Flags (Cờ tính năng) để cho phép khách hàng tự bật/tắt các phân hệ chức năng phù hợp với nhu cầu.17

- **Nhóm khách hàng nhỏ lẻ:** Chỉ cần các tính năng cơ bản như order, in hóa đơn và báo cáo doanh thu.7
- **Nhóm chuỗi nhà hàng:** Yêu cầu các tính năng nâng cao như quản lý kho định lượng (Inventory Recipe), quản lý nhân sự (HRM), và chăm sóc khách hàng tập trung (CRM).1
- **Thích nghi với QR Order:** Đối với dự án QRTable, việc tích hợp đặt món qua mã QR yêu cầu hệ thống phải thích nghi với luồng dữ liệu mới từ thực khách, chuyển đổi từ mô hình nhân viên ghi nhận sang mô hình khách hàng tự thao tác nhưng vẫn đảm bảo sự kiểm soát của quản lý.1

### **Thích nghi với hệ sinh thái bản địa: Tích hợp đa nền tảng**

Các doanh nghiệp SaaS POS Việt Nam đã thích nghi bằng cách trở thành các "hub" kết nối. Sapo FnB và iPOS.vn đều hỗ trợ kết nối đồng bộ với các ứng dụng giao đồ ăn lớn như GrabFood và ShopeeFood qua các giải pháp như iPOS FoodHub.1 Điều này giúp nhà hàng quản lý tất cả đơn hàng từ nhiều nguồn trên một màn hình duy nhất, giảm thiểu sai sót và tối ưu hóa nhân sự. Việc tích hợp với các đơn vị hóa đơn điện tử và các ví điện tử nội địa (MoMo, VNPAY, ZaloPay) cũng là một phần không thể thiếu trong chiến lược thích nghi để phù hợp với quy định pháp luật và thói quen thanh toán mới của người Việt.1

## **Nghiên cứu chuyên sâu về các phương pháp cô lập dữ liệu (Data Isolation)**

Cô lập dữ liệu là rào cản kỹ thuật quan trọng nhất trong kiến trúc Multi-tenancy. Tùy thuộc vào quy mô và yêu cầu bảo mật, các công ty phần mềm Việt Nam đang áp dụng ba mô hình chính: Discriminator Column, Schema-per-tenant và Database-per-tenant.

### **Mô hình Discriminator Column (Shared Database, Shared Schema)**

Đây là mô hình phổ biến nhất cho các giai đoạn khởi đầu hoặc các gói dịch vụ giá rẻ dành cho hộ kinh doanh cá thể. Trong mô hình này, tất cả dữ liệu của hàng nghìn khách hàng được lưu trữ trong cùng một tập hợp các bảng database. Sự khác biệt duy nhất là mỗi hàng dữ liệu sẽ có thêm một cột tenant_id để xác định chủ sở hữu.9

- **Ưu điểm kỹ thuật:**
  - **Tối ưu chi phí:** Chỉ cần duy trì một instance database duy nhất, giúp giảm đáng kể chi phí hạ tầng Cloud.12
  - **Dễ dàng bảo trì:** Các thay đổi về cấu trúc bảng (schema changes) chỉ cần thực hiện một lần cho toàn bộ hệ thống.21
  - **Tốc độ triển khai:** Việc đăng ký một khách hàng mới chỉ đơn giản là tạo ra một ID mới trong hệ thống mà không cần can thiệp vào hạ tầng.12
- **Thách thức và giải pháp:**
  - Rủi ro rò rỉ dữ liệu là cực lớn nếu câu lệnh truy vấn bị thiếu điều kiện lọc theo tenant_id. Để khắc phục, các nền tảng như KiotViet hay Sapo thường áp dụng cơ chế Row-Level Security (RLS) ở mức database để tự động hóa việc lọc dữ liệu, hoặc sử dụng các thư viện ORM (Object-Relational Mapping) có hỗ trợ Global Query Filters.21

### **Mô hình Database-per-tenant (Mỗi khách hàng một cơ sở dữ liệu)**

Ngược lại với mô hình trên, Database-per-tenant cung cấp mức độ bảo mật và cô lập cao nhất. Mỗi nhà hàng sẽ được cấp phát một database instance riêng biệt.9

- **Ưu điểm kỹ thuật:**
  - **Bảo mật tuyệt đối:** Dữ liệu được tách biệt vật lý, loại bỏ hoàn toàn khả năng truy cập trái phép xuyên tenant do lỗi code.21
  - **Hiệu năng ổn định:** Tránh được hiện tượng Noisy Neighbor vì tài nguyên của mỗi database là độc lập.11
  - **Khả năng tùy biến:** Cho phép thực hiện các cấu hình database đặc thù cho những khách hàng lớn mà không ảnh hưởng đến phần còn lại của platform.16
- **Thách thức:**
  - Chi phí duy trì cực kỳ tốn kém khi số lượng khách hàng lên tới hàng nghìn. Ngoài ra, việc sao lưu và nâng cấp hàng nghìn database đồng thời là một cơn ác mộng về mặt vận hành (DevOps).14

### **Mô hình Hybrid (Hỗn hợp) và Schema-per-tenant**

Nhiều doanh nghiệp SaaS tại Việt Nam đang hướng tới mô hình Hybrid để cân bằng giữa chi phí và bảo mật. Các khách hàng nhỏ sẽ dùng chung database (Shared Schema), trong khi các chuỗi nhà hàng lớn sẽ được chuyển sang Database hoặc Schema riêng (Dedicated Resources).9 Mô hình Schema-per-tenant là một giải pháp trung gian, nơi các khách hàng dùng chung một database server nhưng mỗi người có một không gian tên (namespace) riêng, giúp cô lập dữ liệu tốt hơn Shared Schema mà vẫn tiết kiệm chi phí hơn Database-per-tenant.9

| Tiêu chí so sánh          | Discriminator Column | Schema-per-tenant        | Database-per-tenant        |
| :------------------------ | :------------------- | :----------------------- | :------------------------- |
| **Mức độ cô lập**         | Thấp (Logic)         | Trung bình (Logic)       | Cao (Vật lý)               |
| **Chi phí hạ tầng**       | Rất thấp             | Trung bình               | Rất cao                    |
| **Độ phức tạp quản lý**   | Thấp                 | Trung bình               | Rất cao                    |
| **Hiệu năng (Isolation)** | Thấp                 | Trung bình               | Cao                        |
| **Khả năng mở rộng**      | Rất cao              | Trung bình               | Thấp                       |
| **Đối tượng áp dụng**     | Quán ăn nhỏ, Startup | Chuỗi cửa hàng tầm trung | Khách hàng Enterprise, VIP |

## **Thách thức trong quản lý tài nguyên và tối ưu hóa chi phí hạ tầng**

Triển khai SaaS cho hàng nghìn nhà hàng nhỏ lẻ tại Việt Nam đặt ra những bài toán hóc búa về mặt kinh tế kỹ thuật. Với mức giá dịch vụ thường chỉ vài trăm nghìn đồng mỗi tháng, các nhà cung cấp như KiotViet, Sapo hay iPOS.vn phải tìm mọi cách để tối ưu hóa hóa đơn từ các nhà cung cấp Cloud như VNG Cloud, Bizfly Cloud hay các Global Cloud.

### **Quản lý hiện tượng "Noisy Neighbor" (Hàng xóm ồn ào)**

Trong kiến trúc Multi-tenant, một khách hàng chạy một báo cáo thống kê phức tạp hoặc có lượng đơn hàng đột biến có thể làm cạn kiệt CPU/RAM của server chung, khiến các khách hàng khác bị chậm hoặc treo hệ thống.11 Để giải quyết vấn đề này, các doanh nghiệp áp dụng các kỹ thuật:

- **Rate Limiting tại API Gateway:** Giới hạn số lượng yêu cầu mỗi giây cho mỗi tenant để ngăn chặn việc spam request.15
- **Tiered Compute:** Sử dụng Kubernetes (K8s) để phân chia các nhóm tenant vào các node pool khác nhau. Các khách hàng quan trọng (VIP) được ưu tiên tài nguyên trên các node có hiệu năng cao.15
- **Cơ chế Quotas:** Thiết lập giới hạn bộ nhớ và CPU cho từng container xử lý request của tenant để đảm bảo một memory leak không làm sụp đổ toàn bộ node.15

### **Tối ưu hóa chi phí lưu trữ và băng thông**

Dữ liệu lịch sử đơn hàng và hình ảnh món ăn của hàng nghìn nhà hàng có thể phình to rất nhanh. Các doanh nghiệp thích nghi bằng cách sử dụng các giải pháp lưu trữ đa tầng:

- **Hot Data:** Các đơn hàng trong ngày và thông tin bàn đang sử dụng được lưu trữ trong Redis hoặc database tốc độ cao để truy xuất tức thì.9
- **Warm Data:** Dữ liệu của vài tháng gần nhất được lưu trong các database thông thường.26
- **Cold Data:** Các báo cáo cũ, log hệ thống và hình ảnh cũ được chuyển sang Object Storage (như vStorage) với mức phí rẻ hơn nhiều so với Block Storage của database.26

Theo số liệu từ VNG Cloud, việc chuyển dịch từ hạ tầng on-premises sang Cloud với mô hình Pay-as-you-go đã giúp nhiều doanh nghiệp Việt Nam giảm tới 30% chi phí vận hành và tăng tốc độ triển khai lên nhiều lần.26 Đối với các doanh nghiệp SaaS, việc kiểm soát chi phí này là yếu tố quyết định đến sự sống còn của mô hình kinh doanh giá rẻ.

## **Phân tích kỹ thuật các doanh nghiệp tiêu biểu: KiotViet, Sapo, iPOS.vn**

Mỗi doanh nghiệp đầu ngành tại Việt Nam đều có những lựa chọn kiến trúc phản ánh chiến lược kinh doanh và tập khách hàng mục tiêu của mình.

### **iPOS.vn: Hệ sinh thái chuyên biệt và tính ổn định**

iPOS.vn không chỉ cung cấp phần mềm mà là một hệ sinh thái đồng bộ từ phần cứng đến phần mềm. Với hơn 100.000 khách hàng, iPOS tập trung vào tính chuyên biệt cho ngành F\&B.7 Kiến trúc của iPOS.vn được thiết kế theo mô hình 4 khối chính: Văn phòng, Bán hàng Online, Bán hàng Offline và Kết nối đối tác.1

Sự khác biệt của iPOS.vn nằm ở khả năng tích hợp phần cứng sâu. Hệ thống iPOS FABi tương thích hoàn toàn với các thiết bị ngoại vi như máy in hóa đơn iTP76, máy POS iAP302 và các két tiền tự động.1 Việc tích hợp này trong môi trường Multi-tenant đòi hỏi các driver và giao thức kết nối phải được chuẩn hóa để có thể quản lý tập trung từ xa thông qua ứng dụng iPOS Manager trên điện thoại.1

### **Sapo: Đa kênh và Xử lý thời gian thực**

Sapo (đặc biệt là Sapo FnB) nổi bật với khả năng xử lý đơn hàng đa kênh. Trong một kiến trúc SaaS, việc đồng bộ tồn kho và trạng thái đơn hàng từ Facebook, Zalo, Website và điểm bán trực tiếp yêu cầu một hệ thống Message Broker mạnh mẽ. Các kỹ sư tại Sapo thường sử dụng Apache Kafka kết hợp với WebSocket để đẩy thông báo đơn hàng mới xuống thiết bị cầm tay của nhân viên phục vụ trong thời gian thực.27

Việc sử dụng Kafka trong môi trường Multi-tenant tại Sapo giúp đảm bảo rằng các sự kiện từ một nhà hàng không bị lẫn lộn sang nhà hàng khác thông qua việc phân vùng (partitioning) dựa trên ID khách hàng.9 Điều này cũng cho phép hệ thống mở rộng theo chiều ngang một cách dễ dàng khi số lượng tenant tăng lên.

### **KiotViet: Quy mô lớn và mật độ tenant cao**

KiotViet là ví dụ điển hình cho việc phục vụ đại trà với mật độ tenant cực cao trên một đơn vị hạ tầng. Để duy trì hiệu năng cho hàng trăm nghìn cửa hàng, KiotViet áp dụng triệt để mô hình Shared Database với các chiến lược Sharding dữ liệu phức tạp. Dữ liệu của khách hàng không nằm trong một database duy nhất mà được phân tán qua hàng trăm shard khác nhau dựa trên vị trí địa lý hoặc gói dịch vụ.9 Điều này giúp KiotViet tối ưu hóa chi phí bản quyền và tận dụng tối đa sức mạnh phần cứng của các server tầm trung.

## **Định hướng kiến trúc cho nền tảng QRTable (Microservices & QR Integration)**

Dựa trên các nghiên cứu về thị trường và kỹ thuật tại Việt Nam, dự án QRTable cần được xây dựng trên một nền tảng vững chắc để có thể cạnh tranh và mở rộng.

### **Kiến trúc Microservices cho tính linh hoạt và mở rộng**

Sử dụng Microservices cho QRTable giúp tách biệt các nghiệp vụ có tính chất tải khác nhau 28:

- **Order Service:** Chịu tải cao nhất khi khách hàng quét mã QR đặt món đồng loạt. Dịch vụ này cần được scale độc lập và sử dụng các công nghệ xử lý bất đồng bộ.31
- **Menu Service:** Chủ yếu phục vụ các yêu cầu đọc (read-heavy), có thể tận dụng CDN và Caching lớp trên để giảm tải cho database chính.9
- **Notification Service:** Chuyên trách việc đẩy thông báo xuống bếp và máy POS thông qua WebSocket, đảm bảo tính tức thời của đơn hàng QR.27

### **Kiến trúc hướng sự kiện (Event-Driven Architecture \- EDA)**

Trong mô hình QRTable, khi một khách hàng quét mã QR và xác nhận đơn hàng, một chuỗi các sự kiện sẽ được kích hoạt 31:

1. **Sự kiện "OrderCreated":** Được phát ra bởi Order Service.
2. **Notification Service** nhận sự kiện và gửi tin nhắn WebSocket đến máy tính tiền của nhà hàng.
3. **Inventory Service** nhận sự kiện và tạm giữ (reserve) các nguyên liệu trong kho để tránh tình trạng bán vượt mức.31
4. **Loyalty Service** ghi nhận điểm thưởng cho khách hàng nếu họ đã đăng ký thành viên qua QR.1

Việc sử dụng kiến trúc EDA giúp hệ thống QRTable có khả năng chịu lỗi cao hơn. Nếu dịch vụ Loyalty gặp sự cố, quy trình đặt món vẫn hoàn tất bình thường và các điểm thưởng sẽ được xử lý bù sau khi dịch vụ phục hồi.31

![][image1]  
Trong đó, việc giảm thiểu thời gian ![][image2] thông qua các database NoSQL hoặc cơ chế ghi bất đồng bộ sẽ giúp nâng cao trải nghiệm khách hàng tại bàn.

### **Chiến lược cô lập dữ liệu cho QRTable**

Đối với một dự án khóa luận tốt nghiệp và có tiềm năng khởi nghiệp như QRTable, đề xuất sử dụng mô hình **Shared Database với Row-Level Security (RLS) trên PostgreSQL**. Đây là phương pháp giúp:

- Tiết kiệm chi phí hạ tầng trong giai đoạn thử nghiệm (MVP).
- Đảm bảo tính an toàn dữ liệu ở mức độ database (không chỉ phụ thuộc vào logic code ở tầng ứng dụng).23
- Dễ dàng nâng cấp lên các mô hình phức tạp hơn (như Sharding hoặc Schema-per-tenant) khi quy mô khách hàng tăng trưởng.

## **Bảo mật và Tuân thủ trong mô hình SaaS POS Việt Nam**

Vấn đề bảo mật không chỉ dừng lại ở việc cô lập database mà còn bao gồm bảo vệ danh tính và tuân thủ các quy định pháp luật.

### **Quản lý định danh (Identity Isolation)**

Trong hệ thống Multi-tenant, việc người dùng đăng nhập vào đúng không gian của mình là tối quan trọng. Các doanh nghiệp như iPOS.vn sử dụng cơ chế JWT (JSON Web Token) có chứa tenant_id bên trong payload.9 Mọi request từ client lên server đều phải mang theo token này và tầng trung gian (middleware) sẽ thực hiện kiểm tra tính hợp lệ của token cũng như quyền truy cập vào tài nguyên tương ứng.24

Để tăng cường bảo mật, dự án QRTable nên cân nhắc việc sử dụng các khóa ký JWT riêng biệt cho mỗi tenant (Per-tenant signing keys).15 Điều này đảm bảo rằng nếu một khóa của một nhà hàng bị lộ, hacker cũng không thể tạo ra các token giả mạo cho các nhà hàng khác trong hệ thống.

### **Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân**

Mọi nền tảng SaaS hoạt động tại Việt Nam hiện nay đều phải tuân thủ nghiêm ngặt các quy định về lưu trữ dữ liệu người dùng trong nước. Việc sử dụng hạ tầng của các đơn vị nội địa như VNG Cloud không chỉ đảm bảo độ trễ thấp mà còn đáp ứng các tiêu chuẩn bảo mật quốc tế như PCI-DSS cho thanh toán thẻ và ISO 27017/18 cho an toàn thông tin đám mây.26

Dữ liệu của khách hàng quét mã QR (số điện thoại, lịch sử ăn uống) được coi là dữ liệu cá nhân nhạy cảm. Do đó, hệ thống QRTable cần tích hợp các cơ chế mã hóa dữ liệu tại chỗ (Encryption at rest) và che dấu dữ liệu (Data masking) khi hiển thị báo cáo cho nhân viên nhà hàng để tránh lộ lọt thông tin.23

## **Kết luận và khuyến nghị cho Khóa luận tốt nghiệp**

Nghiên cứu về mô hình SaaS Multi-tenancy tại thị trường POS Việt Nam cho thấy đây là một lĩnh vực đầy thách thức nhưng cũng cực kỳ tiềm năng. Sự thành công của các doanh nghiệp đi trước như KiotViet, Sapo hay iPOS.vn đã chứng minh rằng một kiến trúc phần mềm tốt phải đi đôi với khả năng thích nghi linh hoạt với đặc thù thị trường.

Đối với đề tài nghiên cứu và xây dựng nền tảng QRTable, các khuyến nghị cốt lõi bao gồm:

1. **Lựa chọn kiến trúc Microservices:** Giúp hệ thống linh hoạt và dễ dàng bảo trì. Tập trung vào việc xử lý bất đồng bộ cho các luồng đặt món QR để tối ưu hóa trải nghiệm khách hàng.
2. **Áp dụng cơ chế cô lập dữ liệu Shared Database với RLS:** Đây là giải pháp cân bằng nhất cho một hệ thống khởi nghiệp, đảm bảo tính bảo mật mà không gây gánh nặng về chi phí hạ tầng.
3. **Thiết kế hệ thống đồng bộ Offline-first:** Học hỏi từ mô hình của iPOS.vn để đảm bảo nhà hàng vẫn vận hành được khi gặp sự cố internet, một vấn đề thực tế thường trực tại Việt Nam.
4. **Tận dụng hạ tầng Cloud nội địa:** Sử dụng các dịch vụ như vServer và vStorage của VNG Cloud để đảm bảo tính tuân thủ pháp lý và tối ưu hóa chi phí thông qua mô hình Pay-as-you-go.
5. **Xây dựng hệ sinh thái mở:** Thiết kế các API chuẩn để dễ dàng tích hợp với các đối tác giao hàng, thanh toán và quản trị sau này, giúp QRTable không chỉ là một công cụ đặt món mà là một phần không thể thiếu trong quy trình vận hành của nhà hàng.

Việc nắm vững các nguyên lý về Multi-tenancy và Data Isolation sẽ là chìa khóa để xây dựng một nền tảng QRTable bền vững, có khả năng phục vụ hàng nghìn nhà hàng với hiệu quả cao nhất và chi phí thấp nhất. Báo cáo này cung cấp cái nhìn tổng quan và chi tiết, phục vụ đắc lực cho việc lập luận và thiết kế hệ thống trong khuôn khổ khóa luận tốt nghiệp chuyên ngành công nghệ phần mềm.

#### **Nguồn trích dẫn**

1. BÁO CÁO NGÀNH FNB 2024 \- iPOS, truy cập vào tháng 2 13, 2026, [https://ipos.vn/bao-cao-nganh-fnb-2024/](https://ipos.vn/bao-cao-nganh-fnb-2024/)
2. Báo cáo thị trường ngành F\&B Việt Nam năm 2024, xu hướng 2025 \- RIGHT TIME Solutions, truy cập vào tháng 2 13, 2026, [https://righttime-solutions.com/bao-cao-thi-truong-nganh-fb-viet-nam-nam-2024-xu-huong-2025](https://righttime-solutions.com/bao-cao-thi-truong-nganh-fb-viet-nam-nam-2024-xu-huong-2025)
3. Bức tranh toàn cảnh & xu hướng kinh doanh F\&B năm 2025 \- 2026\. Doanh nghiệp bị “vỡ mộng” hay khai phá hướng đi riêng? \- iPOS.vn, truy cập vào tháng 2 13, 2026, [https://ipos.vn/buc-tranh-toan-canh-xu-huong-fb-2025-2026\_\_trashed/](https://ipos.vn/buc-tranh-toan-canh-xu-huong-fb-2025-2026__trashed/)
4. Tính toán của iPOS.vn trong cơn khủng hoảng ngành F\&B \- TheLEADER, truy cập vào tháng 2 13, 2026, [https://theleader.vn/tinh-toan-cua-iposvn-trong-con-khung-hoang-nganh-fb-d38408.html](https://theleader.vn/tinh-toan-cua-iposvn-trong-con-khung-hoang-nganh-fb-d38408.html)
5. iPOS.vn: Báo cáo ngành F\&B Việt Nam 6 tháng đầu năm 2024 | Brands Vietnam, truy cập vào tháng 2 13, 2026, [https://www.brandsvietnam.com/library/doc/66ebec5751386-ipos-vn-bao-cao-nganh-f-b-viet-nam-6-thang-dau-nam-2024](https://www.brandsvietnam.com/library/doc/66ebec5751386-ipos-vn-bao-cao-nganh-f-b-viet-nam-6-thang-dau-nam-2024)
6. Top 6 Phần mềm quản lý bán hàng tốt nhất hiện nay \- iPOS.vn, truy cập vào tháng 2 13, 2026, [https://ipos.vn/top-phan-mem-quan-ly-ban-hang/](https://ipos.vn/top-phan-mem-quan-ly-ban-hang/)
7. iPOS: Trang chủ, truy cập vào tháng 2 13, 2026, [https://ipos.vn/](https://ipos.vn/)
8. BÁO CÁO NGÀNH FOOD & BEVERAGE VIỆT NAM \- Vietstock, truy cập vào tháng 2 13, 2026, [https://static1.vietstock.vn/edocs/13715/BAO_CAO_NGANH_FB_1\_.pdf](https://static1.vietstock.vn/edocs/13715/BAO_CAO_NGANH_FB_1_.pdf)
9. Data Isolation in Multi-Tenant Software as a Service (SaaS) \- Redis, truy cập vào tháng 2 13, 2026, [https://redis.io/en/blog/data-isolation-multi-tenant-saas/](https://redis.io/en/blog/data-isolation-multi-tenant-saas/)
10. What is Multi-Tenant Data Management and Why do you need it? (1) | by Li Shen | Medium, truy cập vào tháng 2 13, 2026, [https://medium.com/@shenli3514/what-is-multi-tenant-data-management-and-why-do-you-need-it-1-b424b81c0498](https://medium.com/@shenli3514/what-is-multi-tenant-data-management-and-why-do-you-need-it-1-b424b81c0498)
11. Multi-Tenant Architecture: How It Works, Pros, and Cons | Frontegg, truy cập vào tháng 2 13, 2026, [https://frontegg.com/guides/multi-tenant-architecture](https://frontegg.com/guides/multi-tenant-architecture)
12. Multi-Tenant là gì? Cách hoạt động và ưu nhược điểm \- Bizfly Cloud, truy cập vào tháng 2 13, 2026, [https://bizflycloud.vn/tin-tuc/multi-tenant-la-gi-20241023092359939.htm](https://bizflycloud.vn/tin-tuc/multi-tenant-la-gi-20241023092359939.htm)
13. Multi-tenancy là gì? Cách thức hoạt động, và Lợi ích và thách thức khi triển khai Multi-tenancy \- ZoneCloud, truy cập vào tháng 2 13, 2026, [https://zonecloud.vn/blog/multi-tenancy/](https://zonecloud.vn/blog/multi-tenancy/)
14. Single-tenant vs multi-tenant: which is best for your SaaS app? \- WorkOS, truy cập vào tháng 2 13, 2026, [https://workos.com/blog/singletenant-vs-multitenant](https://workos.com/blog/singletenant-vs-multitenant)
15. Tenant Isolation Strategies: Infrastructure Patterns for Multi-Tenant SaaS | SSOJet \- Enterprise SSO & Identity Solutions, truy cập vào tháng 2 13, 2026, [https://ssojet.com/blog/tenant-isolation-strategies-infrastructure-patterns-multi-tenant-saas](https://ssojet.com/blog/tenant-isolation-strategies-infrastructure-patterns-multi-tenant-saas)
16. Designing Databases for Multi-Tenant Systems: Shared vs. Isolated Databases, truy cập vào tháng 2 13, 2026, [https://dev.to/vinaykumarbu/designing-databases-for-multi-tenant-systems-shared-vs-isolated-databases-4h9e](https://dev.to/vinaykumarbu/designing-databases-for-multi-tenant-systems-shared-vs-isolated-databases-4h9e)
17. How to Target Features by Tenants with Feature Flags | ConfigCat Blog, truy cập vào tháng 2 13, 2026, [https://configcat.com/blog/2022/07/22/how-to-target-features-by-tenants/](https://configcat.com/blog/2022/07/22/how-to-target-features-by-tenants/)
18. How to Handle Per-Tenant Feature Flags \- System Design Interview Guide | bugfree.ai, truy cập vào tháng 2 13, 2026, [https://bugfree.ai/knowledge-hub/handle-per-tenant-feature-flags-multi-tenant-saas-architecture](https://bugfree.ai/knowledge-hub/handle-per-tenant-feature-flags-multi-tenant-saas-architecture)
19. Top 5 phần mềm POS tốt nhất dành cho nhà hàng, quán cafe \- iPOS.vn, truy cập vào tháng 2 13, 2026, [https://ipos.vn/top5-phan-mem-pos/](https://ipos.vn/top5-phan-mem-pos/)
20. Ultimate guide to multi-tenant SaaS data modeling \- Flightcontrol, truy cập vào tháng 2 13, 2026, [https://www.flightcontrol.dev/blog/ultimate-guide-to-multi-tenant-saas-data-modeling](https://www.flightcontrol.dev/blog/ultimate-guide-to-multi-tenant-saas-data-modeling)
21. Multi-Tenant: Database Per Tenant or Shared? \- CodeOpinion, truy cập vào tháng 2 13, 2026, [https://codeopinion.com/multi-tenant-database-per-tenant-or-shared/](https://codeopinion.com/multi-tenant-database-per-tenant-or-shared/)
22. Multi-Tenant SaaS: A Deep Dive into Database Design Approaches | by Manu Venugopalan, truy cập vào tháng 2 13, 2026, [https://medium.com/@manu.venugopalan_55726/multi-tenant-saas-a-deep-dive-into-database-design-approaches-3a01fe0c083b](https://medium.com/@manu.venugopalan_55726/multi-tenant-saas-a-deep-dive-into-database-design-approaches-3a01fe0c083b)
23. Data Isolation Strategies in Multi-Tenancy Azure Architecture \- NashTech Blog, truy cập vào tháng 2 13, 2026, [https://blog.nashtechglobal.com/data-isolation-strategies-in-multi-tenancy-azure-architecture/](https://blog.nashtechglobal.com/data-isolation-strategies-in-multi-tenancy-azure-architecture/)
24. How to Design a Multi-Tenant SaaS Architecture \- Clerk, truy cập vào tháng 2 13, 2026, [https://clerk.com/blog/how-to-design-multitenant-saas-architecture](https://clerk.com/blog/how-to-design-multitenant-saas-architecture)
25. Tenant isolation in multi-tenant systems: What you need to know \- WorkOS, truy cập vào tháng 2 13, 2026, [https://workos.com/blog/tenant-isolation-in-multi-tenant-systems](https://workos.com/blog/tenant-isolation-in-multi-tenant-systems)
26. Kiến trúc đám mây Single-Tenant và Multi-Tenant: Giải pháp nào ..., truy cập vào tháng 2 13, 2026, [https://vngcloud.vn/vi/blog/single-tenant-or-multi-tenant-cloud-which-one-fits-your-needs](https://vngcloud.vn/vi/blog/single-tenant-or-multi-tenant-cloud-which-one-fits-your-needs)
27. Kafka and WebSocket Integration: Building Efficient Real-Time Applications with Seamless Communication, truy cập vào tháng 2 13, 2026, [https://callmezydd.medium.com/kafka-and-websocket-integration-building-efficient-real-time-applications-with-seamless-4b1e88342478](https://callmezydd.medium.com/kafka-and-websocket-integration-building-efficient-real-time-applications-with-seamless-4b1e88342478)
28. Nghiên cứu về kiến trúc MicroService trong chuyển đổi số, truy cập vào tháng 2 13, 2026, [https://khoahockythuat.ninhbinh.gov.vn/nghien-cuu-trien-khai/nghien-cuu-ve-kien-truc-microservice-trong-chuyen-doi-so-2111.html](https://khoahockythuat.ninhbinh.gov.vn/nghien-cuu-trien-khai/nghien-cuu-ve-kien-truc-microservice-trong-chuyen-doi-so-2111.html)
29. Chuyển đổi số thông minh với Microservices: Tối ưu hóa tính linh hoạt và tăng trưởng, truy cập vào tháng 2 13, 2026, [https://tacasoft.vn/blog/microservices](https://tacasoft.vn/blog/microservices)
30. Giới thiệu về Microservices (Phần 1\) Điạ ngục kiến trúc một khối | \- Codeaholicguy, truy cập vào tháng 2 13, 2026, [https://codeaholicguy.com/2015/11/13/gioi-thieu-ve-microservices-phan-1-dia-nguc-kien-truc-mot-khoi/](https://codeaholicguy.com/2015/11/13/gioi-thieu-ve-microservices-phan-1-dia-nguc-kien-truc-mot-khoi/)
31. Giới thiệu kiến trúc Event-Driven trong hệ thống Microservices | N.Đ. Anh Khôi, truy cập vào tháng 2 13, 2026, [https://khoinda.io.vn/blog/2024/04/06/gioi-thieu-kien-truc-eventdriven-trong-he-thong-microservices/](https://khoinda.io.vn/blog/2024/04/06/gioi-thieu-kien-truc-eventdriven-trong-he-thong-microservices/)
32. Giới thiệu sơ lược về kiến trúc Event-Driven Microservices \- Software Design, truy cập vào tháng 2 13, 2026, [https://softwaredesign.vn/events-trong-microservices](https://softwaredesign.vn/events-trong-microservices)
33. Giới thiệu kiến trúc Event-Driven trong hệ thống Microservices \- Viblo, truy cập vào tháng 2 13, 2026, [https://viblo.asia/p/gioi-thieu-kien-truc-event-driven-trong-he-thong-microservices-x7Z4DnBoLnX](https://viblo.asia/p/gioi-thieu-kien-truc-event-driven-trong-he-thong-microservices-x7Z4DnBoLnX)

[image1]: data:image/png;base64,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
[image2]: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAZCAYAAACmRqkJAAADM0lEQVR4Xu2YWahOURTHl8zzkDlDJCTkQRQeLlKmUMQDZXgg85DMFJIphSJJZEhIHiQyloRCyvQg4r7wIFEUIfH/W2s751v3+66j75bh7l/9uuesfc7+zrf23uvs74pEIpFIpCv89htu19sigXXwDuxs5w3hV/gRNgsXgVbwBZyTilV6usNTLrZDdKatd3FyTXKTWulZBktc7K5oAge7OLnhA5GyMHmfYE3fEMkGE3jRByPZYQLX+GAkO0xgiQ8WwT44ywf/V7iF+QBr+QbHIdFEH4RNYS/42mIPRd/ugZ2wvR33gb3teDl8DyfbeRq2MfGeqnAuXCK6Hz0DO+VckY2N8A1c6xuKZRQ874MFYLKm23EHuNr+lscR0aRVgXVFX1btcq4QGQevwi4u3g/ed7GJ8Bms5+JZeAIH+WCxbIMrfLAAt+Et2AAegNVym2W46Ia8BlwsmvD68Lq1j4CP7DjNGNGZlqaF6CZ+qotXF/2MCS7+K7gKOJAVvtPgF+IXz8I0SZZxE9cW+Gx/24peu8qOCZfgbjsmXLbp2c92Jp6clPx7UM489jtTdFZz838ZLhTtq0dy6Y/nPQc3wdOiy59w1ey3+GHYU8r2xZWT7usndUR/svEhvByh8mDt43V7fUOKkEAuU16bHnEO1lg75izlrHgryewrFd3MNxbth0nysOSw3xI4EA6Bx8wvorWZLBCd+aHvx3CpHfNnbEs75oCNl7J9tZGkrwpji+iM4gCEB/AUSiBHnW2hdrEeboC77LybtXOAmUTeyy/luQTviS7l1qID8UpyaxvLxjvRxBB+Fpd9Xzu/AufBRZIMaKG+KoxGor+Jm4t+Ub4V81EogTPgBTsOPJXkYedLspnnPzl47zA7DwwV7X9AKsa3PHcRTGigv+j9ocywn1JY22J8aeUjX19FwVnBmvUSPrcYP4QvEj7gWTjS4oEpcA+cJHpN2A/OFq1H6Q37VtFadFx0hqRHnjOc/T+AN0XrbsdUe4C1ijXLw5XC/zpxhrMWnhB9Lr74eM9meFT0eVn/SKG+/lpCkR4tWn+5fCO/AWcJR59Ld6Vri2SARZy/cP6pZROJ/Dm+A9dEs4kRCfvPAAAAAElFTkSuQmCC
