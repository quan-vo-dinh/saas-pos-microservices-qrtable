# Script thuyết trình kiến trúc hệ thống QRTable

> Tài liệu này là script đọc khi thuyết trình kiến trúc cho đề tài: **Nghiên cứu và xây dựng nền tảng SaaS POS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices**.
>
> Đối tượng nghe chính: thầy hướng dẫn hoặc hội đồng không đi quá sâu vào triển khai microservices, nhưng cần hiểu rõ hệ thống được chia tầng như thế nào, service nào làm gì, dữ liệu và request đi qua đâu, vì sao chọn các công nghệ như BFF, TCP, gRPC, Kafka, Redis, Keycloak, SePay, Cloudinary.

---

## 1. Cách sử dụng script này

Script được viết theo dạng có thể đọc trực tiếp. Khi trình bày, không cần đọc hết từng chữ nếu thời gian ngắn; có thể dùng các đoạn **Ý chính cần nói** để tóm tắt, còn phần **Script đọc** dùng khi cần giải thích rõ hơn.

Một cách trình bày hợp lý:

1. Mở đầu bằng bối cảnh và mục tiêu hệ thống.
2. Giải thích kiến trúc tổng thể theo từng layer.
3. Đi qua từng nhóm service và cách chúng giao tiếp.
4. Trình bày các luồng nghiệp vụ cốt lõi: đăng nhập, quét QR, đặt món, bếp xử lý, thanh toán.
5. Kết lại bằng các cơ chế nền: multi-tenancy, RBAC, Redis, Kafka, reliability.

---

## 2. Mở đầu bài trình bày

### Ý chính cần nói

- QRTable là một nền tảng SaaS cho nhà hàng, quán cà phê, hoặc mô hình F&B.
- Hệ thống cho phép nhiều nhà hàng dùng chung một nền tảng, nhưng dữ liệu vẫn được tách biệt theo từng tenant.
- Khách hàng quét QR tại bàn để xem menu, đặt món, gọi phục vụ và thanh toán.
- Nhân viên dùng Management App để quản lý POS, bếp, menu, bàn, đơn hàng và thanh toán.
- Kiến trúc chính là microservices, kết hợp giao tiếp đồng bộ và bất đồng bộ.

### Script đọc

Trong phần này, em sẽ trình bày kiến trúc tổng thể của hệ thống QRTable. Đây là một nền tảng SaaS POS dành cho ngành F&B, nghĩa là nhiều nhà hàng có thể cùng sử dụng một hệ thống phần mềm, nhưng dữ liệu và quyền vận hành của từng nhà hàng vẫn được cô lập.

Điểm cốt lõi của hệ thống là số hóa quy trình phục vụ tại bàn. Khách hàng không cần tải app riêng, chỉ cần quét mã QR trên bàn để mở Customer PWA, xem menu, thêm món vào giỏ, gửi đơn xuống bếp, theo dõi trạng thái và yêu cầu thanh toán. Ở phía nhà hàng, nhân viên và quản lý sử dụng Management App để xác nhận đơn, theo dõi bếp, cập nhật trạng thái món, xử lý thanh toán, quản lý bàn, thực đơn và nhân sự.

Về mặt kỹ thuật, hệ thống không được xây dựng như một backend nguyên khối duy nhất. Em chọn kiến trúc microservices để tách các nghiệp vụ lớn thành các service độc lập như Catalog, Order, Kitchen, Payment, SaaS, User Access và Authorizer. Mỗi service có trách nhiệm rõ ràng, sở hữu dữ liệu của mình, và giao tiếp với service khác thông qua các cơ chế chuẩn như TCP, gRPC, Kafka và WebSocket.

Mục tiêu của kiến trúc này không phải là làm hệ thống phức tạp hơn, mà là để hệ thống dễ mở rộng, dễ bảo trì, dễ cô lập lỗi và phù hợp với bài toán SaaS nhiều tenant.

---

## 3. Các khái niệm nền cần giải thích trước

### Ý chính cần nói

- Tenant: một nhà hàng hoặc một cửa hàng trên nền tảng.
- Session: một lượt khách ngồi tại một bàn sau khi quét QR.
- BFF: Backend for Frontend, là cổng vào duy nhất cho frontend.
- Service: một backend nhỏ chịu trách nhiệm cho một miền nghiệp vụ.
- Provider: hệ thống bên ngoài như Keycloak, SePay, Cloudinary.
- Sync vs Async: gọi trực tiếp để lấy kết quả ngay, hoặc phát event để xử lý sau.

### Script đọc

Trước khi đi vào sơ đồ, em xin giải thích nhanh một số khái niệm sẽ xuất hiện xuyên suốt bài trình bày.

Thứ nhất là **tenant**. Trong hệ thống này, một tenant có thể hiểu đơn giản là một nhà hàng hoặc một quán đang sử dụng nền tảng QRTable. Vì đây là hệ thống SaaS, nhiều tenant cùng chạy trên một hạ tầng, nhưng dữ liệu của nhà hàng A không được lẫn với nhà hàng B.

Thứ hai là **session**. Session là một phiên phục vụ của khách tại một bàn. Khi khách quét QR ở bàn số 5 của một nhà hàng, hệ thống tạo hoặc khôi phục session của bàn đó. Từ session này, hệ thống biết khách đang gọi món cho bàn nào, thuộc tenant nào, và đơn hàng nào đang gắn với phiên đó.

Thứ ba là **BFF**, viết tắt của Backend for Frontend. BFF là lớp backend đứng trước toàn bộ các microservice. Frontend không gọi trực tiếp Order Service hay Payment Service, mà luôn đi qua BFF. Cách này giúp frontend đơn giản hơn, đồng thời hệ thống có một điểm tập trung để xử lý xác thực, phân quyền, tenant context, routing và realtime.

Thứ tư là **service**. Mỗi service chịu trách nhiệm cho một miền nghiệp vụ riêng. Ví dụ Catalog Service quản lý menu và bàn, Order Service quản lý phiên gọi món và bill, Kitchen Service quản lý màn hình bếp, Payment Service xử lý thanh toán.

Thứ năm là **provider**, tức hệ thống bên ngoài. QRTable tích hợp Keycloak để đăng nhập và quản lý định danh, SePay để nhận thanh toán VietQR qua webhook, và Cloudinary để lưu trữ hình ảnh món ăn.

Cuối cùng là hai kiểu giao tiếp: **đồng bộ** và **bất đồng bộ**. Giao tiếp đồng bộ là khi service gọi service khác và cần kết quả ngay, ví dụ BFF hỏi Order Service để lấy chi tiết bill. Giao tiếp bất đồng bộ là khi một service phát event lên Kafka, service khác xử lý sau, ví dụ Order Service phát event `order.confirmed` và Kitchen Service tự nhận event đó để tạo ticket bếp.

---

## 4. Kiến trúc tổng thể theo layer

### Ý chính cần nói

Hệ thống được chia thành các layer chính:

| Layer                        | Thành phần                                                      | Vai trò                                               |
| ---------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| User and Provider Layer      | Customer, Staff, Manager, Platform Admin, SePay                 | Người dùng và hệ thống bên ngoài tác động vào QRTable |
| Client Application Layer     | Customer PWA, Management App                                    | Giao diện tương tác                                   |
| API Gateway Layer            | BFF API, BFF Realtime Gateway                                   | Cổng vào REST và WebSocket                            |
| Microservice Layer           | Authorizer, User Access, SaaS, Catalog, Order, Kitchen, Payment | Xử lý nghiệp vụ                                       |
| Runtime Infrastructure Layer | PostgreSQL, MongoDB, Redis, Kafka                               | Lưu trữ, cache, event streaming                       |
| External Provider Layer      | Keycloak, Cloudinary, SePay VietQR                              | Dịch vụ bên thứ ba                                    |

### Script đọc

Nếu nhìn tổng thể, em chia hệ thống thành sáu layer chính.

Layer đầu tiên là **User and Provider Layer**. Đây là nơi xuất phát các hành động. Customer là khách hàng quét QR và đặt món. Staff là nhân viên như phục vụ, đầu bếp, barista. Manager hoặc Owner là người quản lý nhà hàng. Platform Admin là người quản trị nền tảng SaaS. Ngoài ra còn có SePay Banking Network, là hệ thống bên ngoài gửi webhook về khi có giao dịch chuyển khoản.

Layer thứ hai là **Client Application Layer**. Ở đây có hai ứng dụng frontend chính. Customer PWA dành cho khách hàng, chạy trực tiếp trên trình duyệt sau khi quét QR. Management App dành cho nhân viên và quản lý, dùng để vận hành nhà hàng: POS, KDS, quản lý menu, bàn, thanh toán và người dùng.

Layer thứ ba là **API Gateway Layer**. Đây là lớp BFF. BFF có hai vai trò lớn. Một là nhận request REST từ frontend qua HTTP ở port 3300. Hai là duy trì realtime gateway bằng Socket.IO ở namespace `/orders`, để đẩy các thay đổi như đơn mới, ticket bếp, cảnh báo SLA, thanh toán thành công về giao diện gần như tức thời.

Layer thứ tư là **Microservice Layer**. Đây là phần xử lý nghiệp vụ chính. Hệ thống hiện có các service: Authorizer, User Access, SaaS, Catalog, Order, Kitchen và Payment. Mỗi service có một vai trò riêng, port riêng, và giao tiếp chủ yếu với BFF hoặc service khác bằng TCP hoặc gRPC.

Layer thứ năm là **Runtime Infrastructure Layer**. Đây là tầng hạ tầng chạy phía sau: PostgreSQL lưu dữ liệu nghiệp vụ chính, MongoDB lưu user/role/permission, Redis dùng cho session, cart, cache, KDS queue và realtime pubsub, còn Kafka dùng để truyền event bất đồng bộ giữa các service.

Layer cuối cùng là **External Provider Layer**. Keycloak quản lý đăng nhập và token, Cloudinary lưu ảnh món ăn, còn SePay/VietQR hỗ trợ luồng thanh toán chuyển khoản ngân hàng.

Điểm quan trọng là: frontend không nói chuyện trực tiếp với database và cũng không gọi trực tiếp từng service. Tất cả đều đi qua BFF. Còn các service phía sau được tách theo miền nghiệp vụ, giao tiếp với nhau bằng protocol phù hợp với từng tình huống.

---

## 5. Bảng giao tiếp chính trong hệ thống

### Ý chính cần nói

| Từ             | Đến          | Giao thức                                     | Mục đích                               |
| -------------- | ------------ | --------------------------------------------- | -------------------------------------- |
| Customer PWA   | BFF          | HTTP REST 3300                                | Menu, cart, order, bill, payment       |
| Management App | BFF          | HTTP REST 3300                                | POS, KDS, quản trị                     |
| Frontend       | BFF Realtime | Socket.IO `/orders`                           | Nhận cập nhật realtime                 |
| BFF            | Authorizer   | gRPC 5100, TCP 3204                           | Xác thực token, auth policy            |
| BFF            | User Access  | TCP 3203                                      | User, role, permission                 |
| BFF            | SaaS         | TCP 3206                                      | Tenant, slug, cấu hình tenant          |
| BFF            | Catalog      | TCP 3205                                      | Menu, category, table, QR              |
| BFF            | Order        | TCP 3201                                      | Session, cart, order, bill             |
| BFF            | Kitchen      | TCP 3207                                      | KDS queue, ticket action               |
| BFF            | Payment      | TCP 3208                                      | QR payment, webhook, cash, refund      |
| Order          | Kafka        | Topic `order.confirmed`                       | Báo đơn đã xác nhận cho bếp            |
| Kitchen        | Kafka        | Topic `kitchen.sla_warning`                   | Báo ticket quá thời gian               |
| Payment        | Kafka        | Topic `payment.completed`, `payment.refunded` | Báo thanh toán hoàn tất hoặc hoàn tiền |
| SePay          | BFF          | HTTP webhook                                  | Báo giao dịch chuyển khoản             |

### Script đọc

Để dễ hình dung, em tóm tắt các đường giao tiếp quan trọng nhất của hệ thống.

Từ frontend vào backend, cả Customer PWA và Management App đều gọi BFF qua HTTP REST ở port 3300, với global prefix `api/v1`. Ví dụ Customer PWA gọi API để lấy menu, cập nhật giỏ hàng, gửi đơn, xem bill hoặc tạo QR thanh toán. Management App gọi API để quản lý menu, bàn, xác nhận đơn, thao tác KDS và xử lý thanh toán.

Song song với HTTP, cả hai frontend còn kết nối Socket.IO tới BFF Realtime Gateway ở namespace `/orders`. Đây là kênh dùng để nhận cập nhật realtime. Ví dụ khi khách gửi đơn, màn hình POS của nhân viên có thể nhận thông báo. Khi bếp cập nhật món đã sẵn sàng, customer hoặc nhân viên cũng có thể thấy trạng thái mới.

Từ BFF xuống các service, hệ thống dùng NestJS TCP transport là chính. BFF gọi Order Service qua TCP port 3201, Catalog qua 3205, Kitchen qua 3207, Payment qua 3208, SaaS qua 3206, User Access qua 3203. Riêng luồng xác thực token cần hợp đồng rõ và thường được gọi nhiều, nên BFF dùng gRPC tới Authorizer ở port 5100.

Giữa các service, hệ thống không gọi trực tiếp cho mọi thứ. Với các nghiệp vụ cần phản hồi ngay, ví dụ Payment cần lấy snapshot bill từ Order, service có thể gọi TCP. Nhưng với các side-effect xảy ra sau, hệ thống dùng Kafka. Ví dụ Order Service xác nhận đơn xong thì phát event `order.confirmed`, Kitchen Service tự consume event đó để tạo ticket bếp. Payment Service thanh toán xong thì phát `payment.completed`, Order Service có thể consume để đánh dấu bill đã thanh toán, BFF cũng consume để đẩy realtime.

Cách chia này giúp hệ thống vừa có phản hồi nhanh cho người dùng, vừa giảm phụ thuộc trực tiếp giữa các service khi xử lý nghiệp vụ nền.

---

## 6. Lý do chọn BFF làm cổng vào duy nhất

### Ý chính cần nói

- Frontend chỉ cần biết một backend endpoint.
- BFF gom xác thực, phân quyền, tenant context và routing.
- BFF che giấu độ phức tạp của microservices phía sau.
- BFF là nơi phù hợp để xử lý realtime room cho customer, staff, KDS và manager.

### Script đọc

Trong kiến trúc này, BFF đóng vai trò rất quan trọng. Nếu không có BFF, Customer PWA và Management App sẽ phải biết từng service phía sau. Ví dụ frontend phải tự gọi Catalog Service để lấy menu, Order Service để gửi đơn, Payment Service để thanh toán, Authorizer để xác thực. Điều này làm frontend phụ thuộc mạnh vào backend và khó thay đổi kiến trúc phía sau.

Vì vậy, em chọn BFF làm điểm vào duy nhất. Frontend chỉ biết một địa chỉ API chính: BFF ở port 3300. Khi request đi vào, BFF sẽ xác định request đó thuộc tenant nào, người dùng là ai, session nào, có quyền gì, sau đó route đến service phù hợp.

BFF cũng là nơi phù hợp để xử lý realtime. Vì BFF là lớp gần client nhất, nó có thể duy trì WebSocket với frontend và quản lý các room như room của customer session, room của staff trong cùng tenant, room của bếp, room của bar, hoặc room của manager. Khi các service phía sau phát event hoặc publish Redis pubsub, BFF nhận thông tin đó và đẩy về đúng nhóm người dùng.

Nói ngắn gọn, BFF làm cho frontend đơn giản hơn, làm cho microservices phía sau được ẩn đi, và giúp hệ thống có một điểm điều phối thống nhất cho API và realtime.

---

## 7. Frontend layer: Customer PWA và Management App

### Ý chính cần nói

- Customer PWA dành cho khách, không yêu cầu đăng nhập tài khoản.
- Management App dành cho nhân viên, quản lý và admin, có đăng nhập qua Keycloak.
- Hai frontend có trải nghiệm khác nhau nhưng dùng chung BFF.

### Script đọc

Ở phía frontend, hệ thống có hai ứng dụng chính.

Ứng dụng thứ nhất là **Customer PWA**. Đây là giao diện dành cho khách hàng tại bàn. Khách không cần tạo tài khoản. Điểm vào của khách là mã QR. Khi quét QR, ứng dụng mở ra trong trình duyệt, hệ thống biết khách đang ở tenant nào, bàn nào, và session nào. Từ đó khách có thể xem menu, thêm món vào giỏ, gửi order, gọi phục vụ và yêu cầu thanh toán.

Ứng dụng thứ hai là **Management App**. Đây là giao diện dành cho phía nhà hàng và platform. Nhân viên phục vụ dùng để xem đơn, xác nhận đơn, xử lý thanh toán hoặc chuyển bàn. Bếp và barista dùng KDS để xem ticket theo station. Quản lý dùng để quản lý menu, bàn, nhân sự và theo dõi vận hành. Platform admin dùng cho các nghiệp vụ cấp nền tảng như quản lý tenant.

Điểm khác biệt lớn là Customer PWA hoạt động theo session QR, còn Management App hoạt động theo tài khoản đăng nhập. Management App đăng nhập qua Keycloak và nhận JWT. Sau đó mỗi request gửi lên BFF sẽ kèm Bearer token để hệ thống xác định role và permission.

---

## 8. Identity, RBAC và phân quyền

### Ý chính cần nói

- Keycloak quản lý định danh: đăng nhập, JWT, realm, client.
- User Access quản lý dữ liệu nội bộ: user, role, permission.
- Authorizer đứng giữa để verify token và lấy permission context.
- RBAC gồm các role: SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF, BARISTA.
- CUSTOMER không có role trong database; khách được kiểm soát bằng QR session.

### Script đọc

Về xác thực và phân quyền, hệ thống tách thành hai phần: định danh và quyền nghiệp vụ.

Phần định danh được giao cho Keycloak. Keycloak chịu trách nhiệm đăng nhập, phát hành JWT, quản lý realm `qrtable` và client `qrtable-bff`. Khi nhân viên hoặc quản lý đăng nhập trong Management App, họ được chuyển hướng sang Keycloak. Sau khi đăng nhập thành công, frontend nhận được token và dùng token đó khi gọi API.

Tuy nhiên, token chỉ cho biết người dùng là ai và có role gì ở mức identity. Hệ thống vẫn cần biết role đó trong QRTable có những quyền cụ thể nào. Phần này do User Access Service quản lý. User Access lưu user, role và permission trong MongoDB. Ví dụ OWNER có nhiều quyền vận hành trong tenant; MANAGER gần giống OWNER nhưng không có một số quyền nhạy cảm như xóa user; WAITER có quyền xác nhận đơn, xử lý yêu cầu phục vụ, thanh toán tiền mặt; CHEF và BARISTA tập trung vào KDS.

Authorizer Service là lớp kết nối giữa BFF, Keycloak và User Access. Khi BFF cần xác thực token, BFF gọi Authorizer qua gRPC ở port 5100. Authorizer có thể kiểm tra token với Keycloak, sau đó lấy thông tin user, role, permission từ User Access. Nhờ đó BFF biết request này có hợp lệ không, thuộc tenant nào và có đủ quyền gọi endpoint không.

Đối với customer, hệ thống không bắt khách tạo tài khoản. CUSTOMER là actor đặc biệt, không có role trong `role.json`. Khách được kiểm soát bằng QR token, tenant id, table id và session id. Nói cách khác, khách không có quyền quản trị; khách chỉ được thao tác trong phạm vi session của chính bàn đang dùng.

Khi trình bày với thầy, có thể hiểu RBAC như một lớp kiểm soát cửa. Người dùng đăng nhập xong chưa chắc được làm mọi thứ. Hệ thống còn kiểm tra người đó thuộc tenant nào và có permission nào, ví dụ có được cập nhật menu không, có được xác nhận thanh toán không, có được thao tác ticket bếp không.

---

## 9. Multi-tenancy và cách cô lập dữ liệu

### Ý chính cần nói

- Tenant là nhà hàng/cửa hàng trên nền tảng.
- Mỗi request đều cần tenant context.
- Hệ thống dùng mô hình database per service kết hợp `tenant_id`.
- Service không đọc trực tiếp database của service khác.
- SUPER_ADMIN có scope cross-tenant; các role còn lại bị giới hạn trong tenant.

### Script đọc

Vì QRTable là nền tảng SaaS, bài toán multi-tenancy là một phần rất quan trọng. Một tenant là một nhà hàng sử dụng hệ thống. Mỗi tenant có menu riêng, bàn riêng, đơn hàng riêng, nhân viên riêng và cấu hình vận hành riêng.

Hệ thống áp dụng mô hình kết hợp giữa **database per service** và **tenant discriminator**. Database per service nghĩa là mỗi service sở hữu dữ liệu thuộc miền nghiệp vụ của nó. Catalog Service sở hữu dữ liệu menu và bàn. Order Service sở hữu dữ liệu session, order, bill. Payment Service sở hữu dữ liệu payment, refund, audit. User Access sở hữu user, role, permission trong MongoDB.

Bên trong từng service, dữ liệu nghiệp vụ được gắn với `tenant_id`. Khi một request đi vào, hệ thống xác định tenant context từ token đăng nhập hoặc từ QR/session của khách. Sau đó service chỉ xử lý dữ liệu trong tenant đó.

Điểm quan trọng là service không tự ý đọc database của service khác. Ví dụ Order Service không đọc trực tiếp bảng menu của Catalog Service. Nếu cần kiểm tra table hoặc menu item, Order Service gọi Catalog Service qua TCP. Cách này giúp giữ boundary rõ ràng: Catalog là nơi duy nhất hiểu và quản lý dữ liệu catalog; Order chỉ sử dụng thông tin catalog thông qua interface.

Về phân quyền, SUPER_ADMIN là role đặc biệt có phạm vi cross-tenant để quản lý nền tảng. Còn OWNER, MANAGER, WAITER, CHEF và BARISTA đều bị giới hạn trong tenant của nhà hàng mà họ thuộc về. Điều này giúp tránh trường hợp nhân viên nhà hàng này nhìn thấy dữ liệu của nhà hàng khác.

---

## 10. Microservice layer: vai trò từng service

### Ý chính cần nói

| Service     | Port chính                     | Vai trò                                      |
| ----------- | ------------------------------ | -------------------------------------------- |
| Authorizer  | HTTP 3304, TCP 3204, gRPC 5100 | Xác thực token, policy, Keycloak integration |
| User Access | HTTP 3303, TCP 3203, gRPC 5200 | User, role, permission                       |
| SaaS        | HTTP 3306, TCP 3206            | Tenant, slug, subscription metadata          |
| Catalog     | HTTP 3305, TCP 3205            | Menu, category, area, table, QR metadata     |
| Order       | HTTP 3301, TCP 3201            | Session, cart, order, bill, service request  |
| Kitchen     | HTTP 3307, TCP 3207            | KDS queue, ticket, station, SLA              |
| Payment     | HTTP 3308, TCP 3208            | VietQR, webhook, cash payment, refund        |

### Script đọc

Ở tầng microservices, mỗi service được thiết kế theo một miền nghiệp vụ riêng.

**Authorizer Service** phụ trách xác thực và chính sách truy cập. Service này làm việc với Keycloak để kiểm tra JWT và làm việc với User Access để biết người dùng có role và permission gì. Đây là service dùng gRPC ở port 5100 cho luồng verify token vì luồng này cần contract rõ ràng và được gọi thường xuyên.

**User Access Service** quản lý user, role và permission. Dữ liệu của service này được lưu trong MongoDB. Đây là nguồn dữ liệu chính cho RBAC của hệ thống. Khi cần biết một user có quyền `order.confirm` hay `payment.refund` không, hệ thống truy về thông tin role/permission từ đây.

**SaaS Service** quản lý tenant. Service này lưu thông tin nhà hàng, slug, trạng thái hoạt động và metadata liên quan tới subscription. Trong mô hình SaaS, service này giúp hệ thống biết nhà hàng nào đang active, tenant nào bị suspend, hoặc tenant nào có cấu hình vận hành riêng.

**Catalog Service** quản lý menu, category, area, table và QR metadata. Đây là service phụ trách dữ liệu mà khách nhìn thấy khi mở menu, và dữ liệu mà nhà hàng quản lý khi cập nhật món, ảnh món, trạng thái còn hàng, sơ đồ bàn.

**Order Service** là trung tâm của quy trình đặt món. Service này quản lý session, cart, order, order item, bill và service request. Khi khách gửi đơn, Order Service lưu đơn hàng. Khi nhân viên xác nhận đơn, Order Service phát event để Kitchen Service xử lý.

**Kitchen Service** phụ trách KDS. Khi nhận event `order.confirmed`, service này tạo ticket theo station, ví dụ món ăn vào bếp, đồ uống vào bar. Kitchen lưu queue trong Redis để xử lý nhanh và đẩy thông tin realtime ra màn hình KDS.

**Payment Service** phụ trách thanh toán. Service này tạo thông tin VietQR, xử lý webhook SePay, ghi nhận thanh toán tiền mặt, hoàn tiền và phát event thanh toán hoàn tất.

Một điểm cần nhấn mạnh là các HTTP port 3301 đến 3308 giúp từng service vẫn có thể chạy và debug độc lập, nhưng về kiến trúc client không gọi trực tiếp các service này. Client đi qua BFF, BFF route xuống service bằng TCP hoặc gRPC.

---

## 11. Runtime infrastructure: PostgreSQL, MongoDB, Redis, Kafka

### Ý chính cần nói

- PostgreSQL: lưu dữ liệu nghiệp vụ quan hệ và cần transaction.
- MongoDB: lưu user, role, permission linh hoạt hơn.
- Redis: session, cart, cache, KDS queue, pubsub, Socket.IO adapter.
- Kafka: event streaming giữa các service.

### Script đọc

Ở tầng hạ tầng runtime, hệ thống dùng bốn thành phần chính.

**PostgreSQL** là database chính cho các nghiệp vụ có tính quan hệ và cần transaction. Ví dụ Catalog lưu menu, category, table; Order lưu session, order, bill; Payment lưu payment, refund, audit; SaaS lưu tenant. Những dữ liệu này có quan hệ rõ và cần tính nhất quán cao, nên PostgreSQL phù hợp.

**MongoDB** được dùng cho User Access, cụ thể là user, role và permission. Phần này phù hợp với document model vì role có thể chứa danh sách permissions và có thể thay đổi theo thời gian.

**Redis** được dùng cho dữ liệu nóng và realtime. Ví dụ session của khách, cart theo session, cache token, rate limit, KDS queue, Redis pubsub và Socket.IO adapter. Redis phù hợp vì tốc độ rất nhanh, giúp các thao tác như cập nhật giỏ hàng hoặc cập nhật KDS không phải lúc nào cũng đụng database nặng.

**Kafka** được dùng để truyền event bất đồng bộ. Khi một service hoàn thành một sự kiện nghiệp vụ quan trọng, nó publish event lên Kafka. Service khác có thể consume event đó để xử lý phần việc của mình mà không làm service phát event phải chờ. Ví dụ Order phát `order.confirmed`, Kitchen nhận để tạo ticket. Payment phát `payment.completed`, Order nhận để cập nhật bill và BFF nhận để đẩy realtime.

Trong môi trường phát triển, các hạ tầng này được dựng bằng Docker Compose: PostgreSQL ở port 5432, MongoDB ở 27017, Redis ở 6379, Kafka có internal listener 9092 và host listener 29092, Keycloak chạy ở 8180.

---

## 12. External providers: Keycloak, Cloudinary, SePay

### Ý chính cần nói

- Keycloak xử lý đăng nhập và JWT.
- Cloudinary lưu ảnh menu.
- SePay/VietQR xử lý thanh toán chuyển khoản qua QR và webhook.

### Script đọc

Hệ thống cũng tích hợp một số provider bên ngoài.

Provider đầu tiên là **Keycloak**. Đây là hệ thống IAM dùng để quản lý đăng nhập, user identity, JWT, realm và client. QRTable không tự viết toàn bộ cơ chế đăng nhập từ đầu mà dùng Keycloak để đảm bảo chuẩn OAuth2/OIDC và dễ mở rộng.

Provider thứ hai là **Cloudinary**. Khi quản lý nhà hàng upload ảnh món ăn, BFF sẽ xử lý upload lên Cloudinary. Catalog Service lưu URL ảnh, còn frontend sử dụng URL này để hiển thị ảnh menu. Cách này giúp backend không phải tự lưu file ảnh trong server, đồng thời tận dụng CDN và image delivery của Cloudinary.

Provider thứ ba là **SePay/VietQR**. Payment Service tạo URL ảnh QR theo thông tin tài khoản ngân hàng, số tiền và mã tham chiếu bill. Frontend hiển thị QR này cho khách hoặc nhân viên. Khi khách chuyển khoản, SePay phát hiện giao dịch và gửi webhook về BFF. BFF kiểm tra webhook auth theo route đang dùng, sau đó chuyển payload sang Payment Service để xác nhận bill tương ứng.

Ba provider này giúp hệ thống tập trung vào nghiệp vụ chính, còn những phần chuẩn như identity, image storage và bank webhook được giao cho dịch vụ chuyên dụng.

---

## 13. Luồng đăng nhập và phân quyền nhân viên

### Ý chính cần nói

Luồng chính:

1. Nhân viên mở Management App.
2. App redirect sang Keycloak để đăng nhập.
3. Keycloak trả JWT về Management App.
4. Management App gọi BFF kèm Bearer token.
5. BFF gọi Authorizer gRPC để verify token.
6. Authorizer kiểm tra Keycloak và lấy role/permission từ User Access.
7. BFF cho phép hoặc từ chối request theo tenant và permission.

### Script đọc

Luồng đăng nhập của nhân viên bắt đầu từ Management App. Khi nhân viên mở app và cần vào màn hình quản trị, frontend chuyển hướng người dùng sang Keycloak để đăng nhập.

Sau khi đăng nhập thành công, Keycloak trả về JWT cho Management App. Từ thời điểm đó, mỗi request gửi lên BFF sẽ kèm Bearer token trong header Authorization.

Khi BFF nhận request, BFF không tin token một cách mù quáng. BFF gọi Authorizer Service qua gRPC ở port 5100 để verify token và lấy auth context. Authorizer kiểm tra token với Keycloak, sau đó có thể gọi User Access Service để lấy user profile, role và danh sách permission tương ứng.

Sau khi có auth context, BFF mới quyết định request có được đi tiếp hay không. Ví dụ nếu user là WAITER thì được xác nhận đơn hoặc xử lý thanh toán tiền mặt, nhưng không được xóa user. Nếu user là CHEF thì có quyền xem và cập nhật ticket bếp, nhưng không quản lý menu hay thanh toán. Nếu là OWNER hoặc MANAGER thì có quyền vận hành rộng hơn trong tenant. Nếu là SUPER_ADMIN thì có phạm vi nền tảng.

Điểm quan trọng ở đây là hệ thống kiểm tra cả hai chiều: người dùng là ai và người đó thuộc tenant nào. Nhờ vậy, một nhân viên của nhà hàng A không thể truy cập dữ liệu của nhà hàng B.

---

## 14. Luồng khách quét QR và tạo session

### Ý chính cần nói

Luồng chính:

1. Khách quét QR trên bàn.
2. Customer PWA mở URL chứa thông tin tenant/table/token.
3. BFF kiểm tra QR/session context.
4. Hệ thống tạo hoặc khôi phục session cho bàn.
5. Redis lưu/cache session để xử lý nhanh.
6. Catalog cung cấp thông tin bàn và menu.

### Script đọc

Luồng của khách bắt đầu khi khách quét QR trên bàn. Mã QR không chỉ là một đường link đơn giản; nó mang thông tin để hệ thống biết đây là bàn nào, thuộc nhà hàng nào, và token có hợp lệ hay không.

Sau khi Customer PWA mở lên, frontend gọi BFF để khởi tạo hoặc khôi phục session. BFF sẽ xử lý tenant context và session context. Về mặt nghiệp vụ, hệ thống cần đảm bảo QR này thuộc đúng tenant, đúng bàn, và session hiện tại có được phép thao tác hay không.

Nếu bàn chưa có phiên hoạt động, hệ thống tạo session mới. Session này đại diện cho lượt khách hiện tại tại bàn đó. Nếu bàn đã có session, hệ thống có thể khôi phục session để khách tiếp tục thao tác.

Redis đóng vai trò quan trọng ở bước này. Session và cart là những dữ liệu được truy cập thường xuyên, nên lưu/cache trong Redis giúp hệ thống phản hồi nhanh. PostgreSQL vẫn lưu dữ liệu nghiệp vụ bền vững, nhưng Redis giúp giảm tải và hỗ trợ các thao tác real-time hơn.

Sau khi session sẵn sàng, frontend gọi API để lấy menu. BFF route request sang Catalog Service qua TCP 3205. Catalog Service đọc dữ liệu menu, category, table từ PostgreSQL rồi trả về cho BFF, BFF trả về Customer PWA.

Nói đơn giản, QR scan là bước biến một khách anonymous thành một session có phạm vi rõ ràng: tenant nào, bàn nào, được thao tác trên dữ liệu nào.

---

## 15. Luồng xem menu và quản lý catalog

### Ý chính cần nói

- Catalog Service sở hữu menu, category, area, table.
- Customer đọc menu qua BFF.
- Manager cập nhật menu qua Management App.
- Ảnh món ăn được upload lên Cloudinary, URL lưu về Catalog.

### Script đọc

Catalog Service là service quản lý toàn bộ dữ liệu thực đơn và bàn. Khi khách xem menu, Customer PWA gọi BFF, BFF gọi Catalog Service qua TCP. Catalog đọc dữ liệu từ PostgreSQL và trả về danh sách category, menu item, giá, trạng thái còn hàng và URL hình ảnh.

Khi quản lý nhà hàng cập nhật menu, luồng cũng đi qua Management App và BFF. Ví dụ manager thêm món mới, sửa giá, cập nhật trạng thái hết hàng, tạo category hoặc cập nhật bàn. BFF route request sang Catalog Service. Catalog Service là nơi duy nhất ghi dữ liệu catalog vào PostgreSQL.

Riêng ảnh món ăn được xử lý qua Cloudinary. Khi upload ảnh, BFF gửi file lên Cloudinary. Cloudinary trả về URL ảnh. URL này được lưu vào dữ liệu menu item trong Catalog. Nhờ vậy, hệ thống không phải tự quản lý file ảnh trong database hoặc filesystem của server.

Một điểm quan trọng là Order Service không tự đọc database của Catalog. Khi cần kiểm tra món hoặc bàn, Order Service gọi Catalog qua TCP. Cách này đảm bảo Catalog vẫn là nguồn sự thật của menu và table.

---

## 16. Luồng đặt món từ khách đến nhân viên

### Ý chính cần nói

Luồng chính:

1. Khách thêm món vào cart.
2. Cart/session được quản lý theo tenant và session.
3. Khách submit order.
4. BFF gọi Order Service qua TCP 3201.
5. Order Service validate session, table, menu snapshot.
6. Order Service lưu order/bill vào PostgreSQL.
7. BFF đẩy realtime để staff biết có đơn mới.

### Script đọc

Sau khi xem menu, khách có thể thêm món vào giỏ hàng. Giỏ hàng này gắn với tenant và session. Về mặt kỹ thuật, dữ liệu cart là loại dữ liệu thay đổi nhanh, nên Redis là nơi phù hợp để lưu snapshot hoặc trạng thái cart trong quá trình khách thao tác.

Khi khách bấm gửi đơn, Customer PWA gọi BFF. BFF gọi Order Service qua TCP port 3201. Order Service là nơi chịu trách nhiệm chính cho nghiệp vụ đặt món.

Order Service cần kiểm tra session có hợp lệ không, bàn có còn trong trạng thái cho phép order không, cart có dữ liệu không, món trong cart có thuộc menu hiện tại không. Khi cần thông tin table hoặc menu snapshot, Order Service gọi Catalog Service qua TCP 3205. Đây là ví dụ của giao tiếp đồng bộ giữa service, vì Order cần kết quả ngay để quyết định có tạo đơn hay không.

Sau khi validate thành công, Order Service lưu order, order item và bill vào PostgreSQL. Nếu đây là đơn đầu tiên trong session, hệ thống có thể tạo bill tương ứng cho cả phiên bàn.

Sau khi đơn được tạo, BFF có thể đẩy realtime về Management App để nhân viên thấy có đơn mới. Đây là realtime phục vụ giao diện, không nhất thiết phải đi qua Kafka nếu chỉ là thông báo UI tức thời. Kafka sẽ quan trọng hơn ở bước đơn được nhân viên xác nhận và cần kích hoạt xử lý ở bếp.

---

## 17. Luồng nhân viên xác nhận đơn và đưa xuống bếp

### Ý chính cần nói

Luồng chính:

1. Staff xem đơn mới trên Management App.
2. Staff xác nhận hoặc từ chối đơn.
3. BFF gọi Order Service.
4. Order Service cập nhật trạng thái đơn.
5. Order Service publish event `order.confirmed` lên Kafka.
6. Kitchen Service consume event để tạo KDS ticket.

### Script đọc

Sau khi khách gửi đơn, đơn thường ở trạng thái chờ xác nhận. Nhân viên phục vụ nhìn thấy đơn mới trên POS trong Management App. Nếu đơn hợp lệ, nhân viên xác nhận. Nếu có vấn đề, ví dụ món hết hoặc khách yêu cầu sai, nhân viên có thể từ chối hoặc hủy đơn pending tùy quyền.

Khi nhân viên xác nhận đơn, Management App gọi BFF, BFF gọi Order Service qua TCP. Order Service cập nhật trạng thái đơn trong PostgreSQL.

Tại thời điểm đơn đã được xác nhận, nghiệp vụ tiếp theo không còn thuộc riêng Order Service nữa. Bếp cần biết đơn này để làm món. Nếu Order Service gọi trực tiếp Kitchen Service và chờ Kitchen xử lý xong, hai service sẽ bị phụ thuộc thời gian. Nếu Kitchen chậm hoặc tạm lỗi, Order cũng bị ảnh hưởng.

Vì vậy, Order Service publish event `order.confirmed` lên Kafka. Event này nói rằng: đơn hàng đã được xác nhận, đây là tenant, order id và danh sách item cần xử lý. Kitchen Service là consumer của topic này. Khi nhận event, Kitchen tự tạo ticket KDS.

Đây là một ví dụ điển hình của event-driven microservices. Order chỉ phát sự kiện nghiệp vụ, còn Kitchen tự xử lý nghiệp vụ bếp. Order không cần biết Kitchen lưu queue thế nào, chia station thế nào, hay hiển thị ra màn hình KDS ra sao.

---

## 18. Luồng Kitchen/KDS và realtime cho bếp

### Ý chính cần nói

- Kitchen consume `order.confirmed`.
- Tạo ticket theo station như kitchen/bar.
- Lưu queue trong Redis.
- Publish Redis pubsub để BFF realtime đẩy về KDS.
- SLA warning publish Kafka topic `kitchen.sla_warning`.

### Script đọc

Kitchen Service chịu trách nhiệm cho KDS, tức màn hình hiển thị ticket cho bếp hoặc bar. Khi Kitchen Service nhận event `order.confirmed` từ Kafka, nó đọc danh sách item trong order và tạo các ticket tương ứng.

Một điểm quan trọng là không phải item nào cũng đi cùng một station. Món ăn có thể đi vào bếp, đồ uống có thể đi vào quầy bar. Kitchen Service có thể route ticket theo station để CHEF chỉ thấy ticket bếp, BARISTA chỉ thấy ticket đồ uống.

Trạng thái queue của KDS được lưu trong Redis. Redis phù hợp ở đây vì KDS cần cập nhật nhanh, sắp xếp theo thời gian, thao tác trạng thái liên tục như pending, processing, ready, served. Redis cũng hỗ trợ pubsub để báo rằng queue đã thay đổi.

Khi queue thay đổi, Kitchen có thể publish thông tin qua Redis pubsub. BFF Realtime Gateway lắng nghe kênh này và đẩy cập nhật qua Socket.IO về Management App. Nhờ vậy màn hình bếp có thể cập nhật gần như tức thời mà không cần người dùng refresh.

Ngoài ra, Kitchen Service có SLA worker. Nếu một ticket vượt quá thời gian xử lý cho phép, service publish event `kitchen.sla_warning` lên Kafka. BFF Kafka Bridge consume event này và đẩy realtime về màn hình manager hoặc station liên quan. Cơ chế này giúp quản lý phát hiện món bị trễ.

---

## 19. Luồng cập nhật trạng thái món

### Ý chính cần nói

Luồng chính:

1. CHEF hoặc BARISTA thao tác ticket trên KDS.
2. Management App gọi BFF.
3. BFF gọi Kitchen Service qua TCP 3207.
4. Kitchen cập nhật ticket trong Redis.
5. Kitchen gọi hoặc đồng bộ về Order Service khi cần cập nhật trạng thái order item.
6. BFF realtime đẩy trạng thái mới cho staff/customer.

### Script đọc

Khi đầu bếp hoặc barista thao tác trên KDS, ví dụ chuyển ticket từ pending sang processing, hoặc từ processing sang ready, request đi từ Management App đến BFF, sau đó BFF gọi Kitchen Service qua TCP 3207.

Kitchen Service cập nhật trạng thái ticket trong Redis, vì Redis là nơi giữ queue KDS. Nếu trạng thái này có ảnh hưởng đến order item, Kitchen có thể đồng bộ về Order Service qua TCP 3201 để Order Service cập nhật trạng thái nghiệp vụ của item.

Sau khi trạng thái thay đổi, BFF Realtime Gateway đẩy cập nhật về các room liên quan. Staff có thể thấy món đã sẵn sàng để phục vụ. Customer cũng có thể thấy trạng thái đơn được cập nhật nếu hệ thống hiển thị cho khách.

Điểm cần giải thích ở đây là KDS không chỉ là một màn hình hiển thị tĩnh. Nó là một phần của workflow vận hành: nhận ticket, phân station, cập nhật trạng thái, cảnh báo trễ và đẩy realtime cho các vai trò liên quan.

---

## 20. Luồng thanh toán VietQR qua SePay

### Ý chính cần nói

Luồng chính:

1. Customer hoặc staff yêu cầu thanh toán.
2. BFF gọi Payment Service.
3. Payment lấy snapshot bill từ Order Service.
4. Payment tạo URL VietQR theo account, bank, amount, description.
5. Client hiển thị ảnh QR từ SePay.
6. Khách chuyển khoản.
7. SePay gửi webhook về BFF.
8. BFF kiểm tra webhook auth, forward sang Payment.
9. Payment match bill ref, ghi payment, gọi Order mark paid, publish `payment.completed`.

### Script đọc

Luồng thanh toán online được thiết kế xoay quanh VietQR và webhook SePay.

Khi khách hoặc nhân viên yêu cầu thanh toán, frontend gọi BFF. BFF gọi Payment Service qua TCP 3208. Payment Service cần biết bill hiện tại là bao nhiêu, nên service này gọi Order Service qua TCP 3201 để lấy snapshot bill.

Sau khi có bill snapshot, Payment Service tạo URL ảnh VietQR. URL này chứa thông tin tài khoản nhận tiền, ngân hàng, số tiền và nội dung chuyển khoản. Nội dung chuyển khoản có mã tham chiếu bill, ví dụ prefix `QRTBL`, để khi webhook trả về hệ thống có thể biết giao dịch này thuộc bill nào.

Frontend nhận URL và hiển thị ảnh QR cho khách quét bằng app ngân hàng. Lưu ý ở đây hệ thống không nhất thiết gọi API để tạo một payment session phức tạp như cổng thanh toán online. Với mô hình VietQR này, QR là ảnh chuyển khoản ngân hàng có số tiền và nội dung cụ thể.

Sau khi khách chuyển khoản, SePay phát hiện giao dịch tiền vào tài khoản ngân hàng và gửi webhook về endpoint của BFF: `/api/v1/payment/sepay/webhook`. Direct route hiện dùng HMAC raw-body, còn route tenant/platform sau Phase 4B dùng `x-secret-key` path riêng. BFF kiểm tra auth này để đảm bảo request thật sự đến từ endpoint đã cấu hình.

Sau khi xác thực webhook, BFF forward payload sang Payment Service qua TCP 3208. Payment Service kiểm tra giao dịch là tiền vào, khớp mã bill từ field `code` hoặc nội dung chuyển khoản, kiểm tra số tiền đã đủ chưa, xử lý chống duplicate, ghi payment và audit vào PostgreSQL.

Payment Service sau đó có hai hướng cập nhật Order. Hướng nhanh là gọi Order Service qua TCP để mark bill paid ngay. Hướng bền vững là publish event `payment.completed` lên Kafka qua outbox. Order Service consume event này như một đường recovery hoặc đồng bộ bất đồng bộ. BFF cũng có thể consume event để đẩy realtime cho customer và staff biết thanh toán đã hoàn tất.

Luồng này giúp việc thanh toán vừa thân thiện với người dùng Việt Nam, vừa có cơ chế webhook tự động để không cần nhân viên xác nhận thủ công từng giao dịch chuyển khoản.

---

## 21. Luồng thanh toán tiền mặt và hoàn tiền

### Ý chính cần nói

- Cash payment do staff thực hiện trên Management App.
- Payment Service vẫn là nơi ghi nhận payment.
- Refund yêu cầu quyền cao hơn, thường OWNER/MANAGER.
- Payment history giúp staff tra cứu bill.

### Script đọc

Ngoài VietQR, hệ thống còn hỗ trợ thanh toán tiền mặt. Trong luồng này, nhân viên thao tác trên Management App, request đi qua BFF rồi đến Payment Service. Payment Service ghi nhận phương thức thanh toán, trạng thái payment và audit tương ứng.

Điểm quan trọng là dù thanh toán bằng QR hay tiền mặt, Payment Service vẫn là service sở hữu dữ liệu payment. Order Service không tự ghi payment, mà chỉ nhận kết quả cuối cùng để cập nhật trạng thái bill.

Đối với hoàn tiền, hệ thống yêu cầu quyền cao hơn. Theo permission matrix, các quyền như `payment.refund` thường thuộc OWNER, MANAGER hoặc SUPER_ADMIN, không cấp cho mọi nhân viên. Điều này hợp lý vì refund là thao tác nhạy cảm về tài chính.

Staff có thể có quyền xem lịch sử payment để hỗ trợ khách hoặc tra cứu bill. Nhưng những thao tác có rủi ro cao được giới hạn bằng RBAC.

---

## 22. Luồng trạng thái bàn và chuyển bàn

### Ý chính cần nói

Vòng đời bàn:

1. Available: bàn sẵn sàng.
2. Occupied: khách đã quét QR và có session.
3. Billing: khách yêu cầu thanh toán.
4. Cleaning: thanh toán xong, chờ dọn bàn.
5. Available: nhân viên đánh dấu bàn đã sẵn sàng lại.

Chuyển bàn cần phối hợp Order, Catalog và Redis.

### Script đọc

Trong hệ thống nhà hàng, bàn không chỉ là dữ liệu tĩnh. Bàn có vòng đời trạng thái.

Ban đầu bàn ở trạng thái Available. Khi khách quét QR và bắt đầu session, bàn chuyển sang Occupied. Khi khách yêu cầu thanh toán, bàn có thể chuyển sang Billing để khóa hoặc hạn chế việc gọi món thêm. Sau khi thanh toán xong, bàn chuyển sang Cleaning. Khi nhân viên dọn xong và đánh dấu sẵn sàng, bàn quay lại Available.

Vì dữ liệu bàn thuộc Catalog Service, còn session và order thuộc Order Service, các thao tác như chuyển bàn cần phối hợp nhiều service. Khi chuyển bàn, hệ thống phải cập nhật session/order ở Order Service, cập nhật trạng thái hoặc binding bàn ở Catalog Service, và cập nhật metadata session/cart trong Redis.

Đây là ví dụ cho thấy không phải nghiệp vụ nào cũng nằm gọn trong một database transaction duy nhất. Với microservices, khi nghiệp vụ liên quan nhiều service, hệ thống cần thiết kế theo hướng saga hoặc compensation. Nghĩa là nếu một bước ở giữa thất bại, hệ thống có cơ chế bù trừ hoặc rollback logic để tránh trạng thái lệch.

Ở mức thuyết trình, có thể giải thích đơn giản: chuyển bàn là một nghiệp vụ phân tán, vì nó ảnh hưởng cả bàn, session, order và cache. Do đó hệ thống không cho các service tự sửa database của nhau, mà phối hợp qua API/service call rõ ràng.

---

## 23. Realtime: WebSocket, Kafka bridge và Redis pubsub

### Ý chính cần nói

- WebSocket dùng để đẩy thông tin từ server về client.
- BFF là nơi giữ kết nối Socket.IO.
- Kafka dùng cho event nghiệp vụ giữa service.
- Redis pubsub dùng cho KDS queue changed và Socket.IO adapter.
- Room giúp gửi đúng người: customer session, staff tenant, KDS station, manager.

### Script đọc

Realtime là một phần quan trọng của QRTable vì nhà hàng cần thấy thay đổi ngay: đơn mới, món sẵn sàng, ticket bếp quá SLA, thanh toán thành công.

Hệ thống dùng Socket.IO ở BFF Realtime Gateway. Client kết nối vào namespace `/orders`. BFF chia người dùng vào các room. Customer nằm trong room theo session. Staff nằm trong room theo tenant. KDS có room theo station như kitchen hoặc bar. Manager có room để nhận cảnh báo tổng quan.

Tuy nhiên, không phải event realtime nào cũng sinh ra trực tiếp từ HTTP request. Một số event sinh ra từ Kafka, ví dụ `payment.completed` hoặc `kitchen.sla_warning`. Vì vậy BFF có Kafka bridge để consume các event này rồi emit qua Socket.IO.

Một số event KDS lại đi qua Redis pubsub. Ví dụ Kitchen cập nhật queue trong Redis và publish tín hiệu queue changed. BFF lắng nghe tín hiệu đó rồi emit về màn hình KDS.

Nói cách khác, Kafka là xương sống cho event nghiệp vụ giữa service, Redis pubsub hỗ trợ cập nhật nhanh trong runtime, còn Socket.IO là kênh cuối cùng để đẩy dữ liệu về trình duyệt người dùng.

---

## 24. Vì sao vừa dùng TCP, vừa dùng gRPC, vừa dùng Kafka

### Ý chính cần nói

- HTTP REST: client gọi BFF.
- TCP: BFF/service gọi service nội bộ khi cần kết quả ngay.
- gRPC: xác thực/auth contract rõ ràng, gọi nhiều, cần schema chặt hơn.
- Kafka: event bất đồng bộ, giảm coupling, fan-out, xử lý sau.
- WebSocket: server push về frontend.

### Script đọc

Một câu hỏi thường gặp là tại sao hệ thống dùng nhiều cơ chế giao tiếp như vậy thay vì dùng một loại duy nhất.

Câu trả lời là mỗi cơ chế phục vụ một mục đích khác nhau.

HTTP REST được dùng ở biên hệ thống, giữa frontend và BFF. Đây là cách phổ biến, dễ debug, dễ tích hợp với trình duyệt và tài liệu Swagger.

TCP được dùng cho giao tiếp nội bộ giữa BFF và các microservice. Với NestJS microservices, TCP transport giúp gọi service nội bộ gọn hơn so với việc mỗi service phải public REST API cho nhau. Các request như lấy menu, gửi order, tạo payment đều cần kết quả ngay, nên TCP phù hợp.

gRPC được dùng cho auth, cụ thể là Authorizer và User Access, vì luồng xác thực cần contract rõ ràng, có proto schema và thường được gọi nhiều. gRPC giúp định nghĩa interface chặt hơn cho các hàm như verify token hoặc lấy user access context.

Kafka được dùng cho event bất đồng bộ. Khi Order xác nhận đơn, nó không nên chờ Kitchen xử lý xong. Khi Payment hoàn tất, nó không nên gọi cứng nhiều service khác nhau. Thay vào đó, service publish event và các consumer xử lý độc lập. Cách này giảm coupling và hỗ trợ mở rộng sau này, ví dụ thêm Notification hoặc Analytics chỉ cần subscribe event.

WebSocket dùng để đẩy dữ liệu từ server về frontend. Nếu chỉ có HTTP REST, frontend phải liên tục polling để biết có đơn mới hay ticket mới. WebSocket giúp hệ thống phản hồi tự nhiên hơn trong môi trường nhà hàng.

---

## 25. Kafka và Outbox Pattern

### Ý chính cần nói

- Kafka topic chính: `order.confirmed`, `kitchen.sla_warning`, `payment.completed`, `payment.refunded`.
- Kafka dùng at-least-once, consumer cần idempotent.
- Outbox giúp tránh mất event khi database commit thành công nhưng publish Kafka lỗi.

### Script đọc

Kafka trong hệ thống không dùng cho mọi thứ, mà dùng cho những sự kiện nghiệp vụ cần tách service hoặc cần nhiều consumer.

Ví dụ `order.confirmed` là event quan trọng. Khi Order Service xác nhận đơn, Kitchen Service cần tạo ticket. Sau này Notification Service cũng có thể gửi thông báo. Nếu dùng Kafka, Order Service chỉ cần publish một event, còn service nào quan tâm thì subscribe.

Một event khác là `payment.completed`. Khi thanh toán hoàn tất, Order Service cần cập nhật bill, BFF cần đẩy realtime, tương lai Notification Service có thể gửi biên nhận. Đây là fan-out, tức một event có thể có nhiều consumer độc lập.

Kafka thường đảm bảo theo hướng at-least-once, nghĩa là message có thể được xử lý hơn một lần trong một số tình huống lỗi. Vì vậy consumer phải idempotent. Idempotent nghĩa là xử lý cùng một event hai lần vẫn không làm sai dữ liệu. Ví dụ Kitchen nhận trùng `order.confirmed` thì không được tạo hai ticket giống nhau cho cùng một order.

Để tăng độ tin cậy, hệ thống dùng ý tưởng Outbox Pattern. Khi service ghi dữ liệu nghiệp vụ vào database, nó cũng ghi một outbox row trong cùng transaction. Sau đó một publisher đọc outbox và publish Kafka. Cách này giảm rủi ro trường hợp database đã commit nhưng event chưa publish do service crash hoặc network lỗi.

Giải thích đơn giản: outbox giống như một danh sách việc cần gửi đi. Service ghi nhận việc đã xảy ra trước, rồi tiến trình nền gửi event ra Kafka sau. Nếu gửi lỗi thì có thể retry.

---

## 26. Redis trong hệ thống

### Ý chính cần nói

Redis được dùng cho:

- Session/cache của khách.
- Cart state theo tenant và session.
- Token/auth cache.
- Rate limit.
- KDS queue và ticket state.
- Redis pubsub cho realtime.
- Socket.IO adapter khi có nhiều instance BFF.

### Script đọc

Redis được dùng ở nhiều điểm vì hệ thống nhà hàng có nhiều dữ liệu cần đọc/ghi nhanh.

Đầu tiên là session và cart của khách. Khi khách thêm món, sửa số lượng, xóa món, những thao tác này xảy ra liên tục. Nếu mỗi lần đều ghi nặng vào database, hệ thống sẽ chậm và tốn tài nguyên. Redis giúp lưu snapshot hoặc state tạm thời nhanh hơn.

Thứ hai là cache. Một số dữ liệu như token verification, session lookup hoặc menu có thể được cache để giảm số lần gọi database hoặc service khác.

Thứ ba là KDS queue. Màn hình bếp cần queue nhanh, có thứ tự, cập nhật trạng thái liên tục. Redis phù hợp với kiểu dữ liệu này, đặc biệt khi cần sorted set hoặc hash.

Thứ tư là pubsub và Socket.IO adapter. Khi có nhiều instance BFF, Socket.IO cần Redis adapter để đảm bảo event emit từ một instance vẫn đến được client đang kết nối ở instance khác. Redis pubsub cũng giúp BFF nhận tín hiệu queue changed từ Kitchen.

Vì vậy Redis không chỉ là cache đơn giản, mà là một thành phần runtime quan trọng cho session, cart, realtime và KDS.

---

## 27. Cơ chế nhất quán dữ liệu và xử lý lỗi

### Ý chính cần nói

- Không có một transaction duy nhất xuyên qua mọi service.
- Mỗi service đảm bảo transaction trong database của mình.
- Cross-service dùng event, outbox, idempotency, retry và compensation.
- Hệ thống chấp nhận eventual consistency ở một số luồng.

### Script đọc

Trong kiến trúc microservices, một điểm cần giải thích rõ là hệ thống không dùng một database transaction duy nhất bao phủ tất cả service. Ví dụ khi thanh toán thành công, Payment Service cập nhật payment database, Order Service cập nhật bill, BFF realtime thông báo cho frontend. Những việc này không nằm trong một transaction ACID duy nhất.

Thay vào đó, mỗi service đảm bảo tính nhất quán trong phạm vi dữ liệu của mình. Payment Service đảm bảo payment và audit của nó đúng. Order Service đảm bảo order và bill của nó đúng. Khi cần đồng bộ giữa các service, hệ thống dùng TCP cho đường nhanh và Kafka event cho đường bền vững.

Vì Kafka có thể gửi lại message, các consumer cần idempotent. Vì service hoặc network có thể lỗi, các thao tác quan trọng cần timeout, retry hoặc outbox. Với một số nghiệp vụ như chuyển bàn, nếu nhiều service cùng bị ảnh hưởng, hệ thống cần compensation để tránh dữ liệu lệch.

Khái niệm quan trọng ở đây là **eventual consistency**. Nghĩa là dữ liệu giữa các service có thể không đồng bộ tuyệt đối trong vài mili giây hoặc vài giây, nhưng cuối cùng sẽ đạt trạng thái đúng thông qua event và retry. Đây là trade-off phổ biến trong microservices để đổi lấy khả năng mở rộng và giảm phụ thuộc giữa service.

---

## 28. Bảo mật và kiểm soát truy cập

### Ý chính cần nói

- Staff dùng JWT từ Keycloak.
- Customer dùng QR/session scope.
- Tenant context bắt buộc trong request.
- Permission kiểm soát hành động cụ thể.
- Webhook SePay dùng auth theo route: direct HMAC hoặc tenant/platform `x-secret-key`.

### Script đọc

Bảo mật trong hệ thống được chia theo từng loại actor.

Với staff, manager và admin, hệ thống dùng JWT từ Keycloak. Mỗi request gửi lên BFF phải kèm token. BFF kiểm tra token, tenant và permission trước khi cho phép thao tác.

Với customer, hệ thống không bắt đăng nhập. Thay vào đó, customer được giới hạn trong QR/session. Khách chỉ thao tác được với session của bàn mà họ đang dùng. Ví dụ khách không thể xem bill của bàn khác hoặc tenant khác nếu không có session hợp lệ.

Với multi-tenancy, tenant context là bắt buộc. Mọi dữ liệu nghiệp vụ quan trọng đều gắn với tenant. Đây là lớp bảo vệ để dữ liệu các nhà hàng không bị trộn.

Với thanh toán SePay, webhook từ bên ngoài phải pass auth theo route đang dùng: direct HMAC hoặc tenant/platform `x-secret-key`. BFF kiểm tra auth trước khi chuyển payload sang Payment Service. Nhờ vậy, người ngoài không thể giả lập webhook thanh toán thành công nếu không biết secret đã cấu hình.

Nhìn tổng thể, hệ thống không chỉ bảo vệ ở một điểm đăng nhập, mà kiểm soát theo nhiều lớp: identity, tenant, permission, session và provider secret.

---

## 29. Tóm tắt các luồng giao tiếp quan trọng

### Script đọc ngắn gọn

Nếu cần tóm tắt toàn bộ luồng giao tiếp trong một đoạn, em có thể nói như sau:

Người dùng tương tác với Customer PWA hoặc Management App. Hai ứng dụng này gọi BFF bằng HTTP REST và nhận realtime bằng Socket.IO. BFF là cổng vào duy nhất, chịu trách nhiệm xác thực, phân quyền, xác định tenant và điều phối request xuống microservices. BFF gọi các service nội bộ chủ yếu bằng TCP: Catalog cho menu và bàn, Order cho session/order/bill, Kitchen cho KDS, Payment cho thanh toán, SaaS cho tenant, User Access cho user/role/permission. Riêng xác thực token đi qua Authorizer bằng gRPC.

Các service sở hữu dữ liệu riêng: Catalog, Order, Payment và SaaS dùng PostgreSQL; User Access dùng MongoDB; Redis dùng cho session, cart, cache, KDS và realtime pubsub. Với các nghiệp vụ cần xử lý bất đồng bộ, service phát event lên Kafka: Order phát `order.confirmed`, Kitchen phát `kitchen.sla_warning`, Payment phát `payment.completed` và `payment.refunded`. BFF consume một số event để đẩy realtime về frontend. Các provider bên ngoài gồm Keycloak cho đăng nhập, Cloudinary cho ảnh menu và SePay cho VietQR/webhook thanh toán.

---

## 30. Phần đã triển khai và phần định hướng

### Ý chính cần nói

- Đã triển khai các service core: BFF, Authorizer, User Access, SaaS, Catalog, Order, Kitchen, Payment.
- Đã có hạ tầng provider local: PostgreSQL, MongoDB, Redis, Kafka, Keycloak.
- Đã có các flow chính: catalog, order, kitchen/KDS, realtime, payment phase 3.
- Notification và observability là hướng mở rộng/hardening.

### Script đọc

Về trạng thái triển khai, hệ thống hiện đã có các service chính: BFF, Authorizer, User Access, SaaS, Catalog, Order, Kitchen và Payment. Các service này có HTTP port riêng để chạy độc lập và TCP/gRPC port để giao tiếp nội bộ.

Hạ tầng local được dựng bằng Docker Compose gồm PostgreSQL, MongoDB, Redis, Kafka và Keycloak. Đây là các thành phần quan trọng để mô phỏng môi trường microservices trong quá trình phát triển.

Các luồng nghiệp vụ chính đã được thiết kế và triển khai theo từng phase: Catalog cho menu và bàn; Order cho session, cart, order và bill; Kitchen/KDS cho xử lý bếp và realtime; Payment phase 3 cho VietQR, webhook, cash payment và refund.

Một số phần thuộc hướng mở rộng hoặc hardening, ví dụ Notification Service, observability stack như Prometheus, Grafana, Loki, Tempo, hoặc các cơ chế saga/outbox nâng cao hơn cho production. Khi trình bày, em nên nói rõ đây là hướng phát triển tiếp theo, để không làm hội đồng hiểu nhầm rằng mọi phần roadmap đều đã hoàn thiện ở mức production.

---

## 31. Câu kết cho phần kiến trúc

### Script đọc

Tổng kết lại, kiến trúc QRTable được thiết kế xoay quanh ba mục tiêu chính.

Mục tiêu thứ nhất là phù hợp với bài toán SaaS nhiều tenant. Hệ thống cần phục vụ nhiều nhà hàng trên cùng một nền tảng, nhưng vẫn đảm bảo dữ liệu, quyền và cấu hình của từng tenant được tách biệt.

Mục tiêu thứ hai là tách nghiệp vụ theo microservices. Mỗi service phụ trách một miền rõ ràng: Catalog quản lý menu và bàn, Order quản lý đặt món và bill, Kitchen quản lý bếp, Payment quản lý thanh toán, User Access và Authorizer quản lý người dùng và phân quyền, SaaS quản lý tenant. Điều này giúp hệ thống dễ mở rộng, dễ bảo trì và giảm ảnh hưởng khi một phần thay đổi.

Mục tiêu thứ ba là chọn cơ chế giao tiếp phù hợp cho từng loại bài toán. HTTP REST dùng cho frontend, TCP dùng cho request nội bộ cần phản hồi ngay, gRPC dùng cho xác thực có contract rõ, Kafka dùng cho event bất đồng bộ giữa service, Redis dùng cho dữ liệu nóng và realtime, Socket.IO dùng để đẩy cập nhật về client.

Nhờ cách thiết kế này, QRTable không chỉ là một ứng dụng đặt món bằng QR, mà là một nền tảng vận hành nhà hàng có kiến trúc rõ ràng, có khả năng mở rộng và có nền tảng kỹ thuật phù hợp với một hệ thống SaaS hiện đại.

---

## 32. Câu hỏi hội đồng có thể hỏi và gợi ý trả lời

### 32.1 Vì sao không làm một backend monolith cho đơn giản?

**Gợi ý trả lời:**

Nếu chỉ làm demo nhỏ thì monolith đơn giản hơn. Nhưng đề tài tập trung vào kiến trúc microservices cho nền tảng SaaS. Hệ thống có nhiều miền nghiệp vụ khá độc lập như Catalog, Order, Kitchen, Payment, User Access. Nếu để chung một backend lớn, các phần dễ phụ thuộc lẫn nhau, khó mở rộng và khó giải thích boundary. Microservices giúp tách trách nhiệm, mỗi service sở hữu dữ liệu riêng và giao tiếp qua contract rõ ràng. Đổi lại hệ thống phức tạp hơn, nên em dùng BFF, Kafka, Redis và Docker Compose để quản lý độ phức tạp đó.

### 32.2 Vì sao frontend không gọi trực tiếp từng microservice?

**Gợi ý trả lời:**

Nếu frontend gọi trực tiếp từng service, frontend phải biết quá nhiều chi tiết backend: service nào port nào, service nào xử lý nghiệp vụ nào, auth thế nào. Điều đó làm frontend bị coupling với microservices. BFF giải quyết vấn đề này bằng cách làm một cổng vào duy nhất. Frontend chỉ gọi BFF, còn BFF route xuống service phù hợp, kiểm tra auth, tenant, permission và realtime.

### 32.3 Vì sao vừa dùng TCP vừa dùng Kafka?

**Gợi ý trả lời:**

TCP dùng cho request cần kết quả ngay, ví dụ BFF hỏi Order Service để tạo order hoặc Payment hỏi Order để lấy bill snapshot. Kafka dùng cho event không cần chờ ngay và có thể có nhiều consumer, ví dụ `order.confirmed` để Kitchen tạo ticket, hoặc `payment.completed` để Order cập nhật bill và BFF đẩy realtime. Hai cơ chế phục vụ hai kiểu giao tiếp khác nhau.

### 32.4 Vì sao dùng Redis?

**Gợi ý trả lời:**

Redis được dùng cho dữ liệu nóng và realtime: session, cart, cache, KDS queue, pubsub và Socket.IO adapter. Các dữ liệu này cần truy cập nhanh và thay đổi liên tục. Nếu tất cả đều đi qua PostgreSQL thì hệ thống sẽ nặng hơn và phản hồi chậm hơn.

### 32.5 Vì sao dùng Keycloak thay vì tự viết login?

**Gợi ý trả lời:**

Keycloak là hệ thống IAM chuẩn, hỗ trợ OAuth2/OIDC, JWT, realm, client và admin API. Tự viết login sẽ mất nhiều công sức và dễ thiếu các phần bảo mật chuẩn. Trong đề tài này, em tập trung vào nghiệp vụ POS/QR ordering và kiến trúc microservices, nên dùng Keycloak cho identity là lựa chọn hợp lý.

### 32.6 Dữ liệu các nhà hàng có bị lẫn nhau không?

**Gợi ý trả lời:**

Không. Hệ thống dùng tenant context và `tenant_id` trên dữ liệu nghiệp vụ. Mỗi request đều được xác định tenant từ JWT hoặc QR/session. Các role thông thường như OWNER, MANAGER, WAITER, CHEF, BARISTA chỉ thao tác trong tenant của mình. SUPER_ADMIN mới có phạm vi cross-tenant để quản trị nền tảng.

### 32.7 Nếu Kafka gửi trùng event thì sao?

**Gợi ý trả lời:**

Hệ thống thiết kế theo hướng at-least-once, nghĩa là ưu tiên không mất event, nhưng có thể nhận trùng trong một số trường hợp lỗi. Vì vậy consumer cần idempotent. Ví dụ Kitchen nhận trùng `order.confirmed` thì phải kiểm tra để không tạo hai ticket cho cùng một order. Đây là trade-off phổ biến trong hệ thống event-driven.

### 32.8 Nếu SePay gửi webhook giả thì sao?

**Gợi ý trả lời:**

Webhook SePay phải pass auth theo route đang dùng: direct HMAC hoặc tenant/platform `x-secret-key`. BFF kiểm tra auth này trước khi chuyển payload vào Payment Service. Payment Service còn kiểm tra giao dịch là tiền vào, mã bill có khớp không, số tiền có đủ không và có bị duplicate không.

---

## 33. Bản script rút gọn trong 3 phút

Nếu cần trình bày rất ngắn, có thể đọc đoạn sau:

QRTable là nền tảng SaaS POS cho nhà hàng, cho phép khách quét QR tại bàn để xem menu, đặt món, theo dõi trạng thái và thanh toán. Nhà hàng dùng Management App để vận hành POS, KDS, quản lý menu, bàn, nhân viên và thanh toán.

Về kiến trúc, hệ thống dùng microservices và có BFF làm cổng vào duy nhất. Frontend chỉ gọi BFF qua HTTP REST và nhận realtime qua Socket.IO. BFF chịu trách nhiệm xác thực, phân quyền, xác định tenant và điều phối request xuống các service phía sau.

Các service chính gồm Catalog quản lý menu và bàn, Order quản lý session, cart, order và bill, Kitchen quản lý KDS, Payment xử lý VietQR/webhook/cash/refund, SaaS quản lý tenant, User Access quản lý user-role-permission, Authorizer xác thực token với Keycloak. BFF gọi các service chủ yếu bằng TCP, riêng auth dùng gRPC. Các event nghiệp vụ như `order.confirmed`, `kitchen.sla_warning`, `payment.completed` đi qua Kafka. Redis dùng cho session, cart, cache, KDS queue và realtime pubsub.

Luồng chính là: khách quét QR để tạo session; BFF lấy menu từ Catalog; khách gửi order qua Order Service; nhân viên xác nhận đơn; Order phát event `order.confirmed`; Kitchen nhận event để tạo ticket KDS; các cập nhật được đẩy realtime qua BFF. Khi thanh toán, Payment tạo VietQR, SePay gửi webhook về BFF, Payment xác nhận giao dịch, cập nhật bill và phát `payment.completed`.

Điểm quan trọng của kiến trúc là hệ thống tách rõ các miền nghiệp vụ, dữ liệu được cô lập theo tenant, phân quyền bằng RBAC, giao tiếp được chọn theo đúng mục đích: REST cho client, TCP/gRPC cho nội bộ cần phản hồi ngay, Kafka cho event bất đồng bộ, Redis cho dữ liệu nóng và WebSocket cho realtime. Nhờ vậy, hệ thống phù hợp với một nền tảng SaaS có khả năng mở rộng và dễ bảo trì.
