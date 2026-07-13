# QRTable Thesis Defense — Giải thích nội bộ và cẩm nang phản biện

> File companion của [`thesis-defense-slide-builder-script.md`](./thesis-defense-slide-builder-script.md). Nội dung ở đây là speaker notes ẩn dùng để hiểu sâu và trả lời Hội đồng; không dán lên slide và không mặc định đọc trong phần trình bày chính.
>
> Cập nhật theo bản slide thực tế mới: deck hiện đi theo 5 phần lớn, có cụm kiểm chứng Saga/Allure/Kafkio/Redis Insight mở rộng ở phần 5. Các giới hạn phát biểu (`Không nói quá`) vẫn được giữ trong builder để nằm cạnh claim, evidence và kịch bản chính.

## Cách dùng

- Trước khi luyện một slide, đọc `Kịch bản thuyết trình chính` trong builder script.
- Sau đó dùng phần `Giải thích chi tiết nội bộ` tương ứng trong file này để hiểu cơ chế, ranh giới và nhánh lỗi.
- Khi luyện phản biện, chỉ dùng `Cẩm nang phản biện` ở những slide đã có câu hỏi cụ thể; không đọc nguyên văn speaker notes trên sân khấu.
- Mọi claim vẫn phải đối chiếu code, test và tài liệu canonical trước khi freeze deck.

## Bản đồ slide thực tế hiện tại

| Slide | Nội dung thực tế                                                                    | Ghi chú dùng notes                                                                                            |
| ----- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1-6   | Bìa, roadmap, bài toán POS SaaS QR, điểm khác biệt, QR-to-Payment, mục tiêu/phạm vi | Dùng notes Slide 1-6.                                                                                         |
| 7-10  | Quyết định Microservices, lựa chọn kiến trúc, kiến trúc tổng thể, service ownership | Dùng notes Slide 7-10.                                                                                        |
| 11-15 | Cô lập tenant và kiểm soát truy cập                                                 | Dùng notes Slide 11-15.                                                                                       |
| 16-24 | Giao tiếp, local transaction, consistency, Saga, compensation, KDS realtime         | Dùng notes Slide 16-24.                                                                                       |
| 25-26 | Kết quả kiểm chứng, các lớp minh chứng kỹ thuật                                     | Dùng notes Slide 25-26.                                                                                       |
| 27-33 | 7 kết quả kiểm thử Orchestration Saga                                               | Dùng notes Slide 27-33, mỗi slide nói một invariant.                                                          |
| 34-37 | Kiểm thử Order Service & SaaS Service qua Allure Report, Kafkio, Redis Insight      | Dùng notes Slide 34-37.                                                                                       |
| 38    | Demo sản phẩm                                                                       | Demo không phải thay thế phần kiểm chứng kỹ thuật; dùng fallback screenshot/state/log/test nếu live demo lỗi. |
| 39    | Kết luận và hướng phát triển của QRTable                                            | Dùng notes Slide 39.                                                                                          |
| 40    | Thank You                                                                           | Kết thúc và nhận câu hỏi.                                                                                     |

## Slide 1. Khóa luận tốt nghiệp

### Giải thích chi tiết nội bộ

- Không chủ động mở đầu bằng lời phủ định về mô hình kinh doanh.
- Nếu hội đồng hỏi, giải thích F&B là tình huống nghiên cứu kỹ thuật, không phải nghiên cứu doanh thu hoặc chiến lược thị trường.
- Không nói hệ thống đã sẵn sàng thương mại hoặc vận hành production đầy đủ.

---

---

## Slide 2. Nội dung trình bày

### Giải thích chi tiết nội bộ

- Roadmap chỉ tạo bản đồ nhận thức; không đọc lại toàn bộ nội dung.
- Giữ tên năm phần nhất quán với section marker xuyên suốt deck.

---

---

## Slide 3. Bài toán POS theo mô hình SaaS tích hợp đặt món qua QR

### Giải thích chi tiết nội bộ

- Slide divider đánh dấu bắt đầu Phần 1.
- Không chứa nội dung Q&A, chỉ đóng vai trò chuyển tiếp thuyết trình.

---

## Slide 4. Điểm khác biệt của QRTable

### Giải thích chi tiết nội bộ

#### 1. Từ rủi ro vận hành đến bất biến hệ thống

Script cũ không chỉ nói QRTable có nhiều thành phần. Nó xác định sáu nhóm sai lệch có thể xảy ra trong luồng: khách vào nhầm nhà hàng/bàn/phiên; nhiều khách cập nhật shared cart từ phiên bản cũ; submit hoặc confirm bị gửi lặp; tồn kho và trạng thái KDS không khớp; một bill bị ghi nhận thanh toán nhiều lần; giao diện hiển thị trạng thái không còn hiện hành. Mỗi rủi ro tương ứng với một bất biến cần giữ, nên đây là cầu nối từ bối cảnh POS sang bài toán kiến trúc.

Với SaaS, sai tenant không chỉ là lỗi chức năng mà có thể trở thành rò rỉ dữ liệu giữa đơn vị thuê bao. Với shared cart, vấn đề không chỉ là nhiều người cùng bấm mà là một thay đổi cũ ghi đè trạng thái mới. Với retry, nguyên nhân có thể đến từ double-click, timeout hoặc caller không biết request trước đã thành công hay chưa. Với KDS, ticket chỉ hợp lệ sau mốc xác nhận đơn và xử lý tồn kho. Với payment, một hóa đơn chỉ được chuyển sang đã thanh toán một lần về mặt nghiệp vụ. Với realtime UI, tín hiệu nhanh không được thay nguồn trạng thái có thẩm quyền.

#### 2. Phát biểu bài toán hệ thống

Từ các bất biến trên, script cũ phát biểu bài toán: xây dựng một nền tảng SaaS POS trong đó QR ordering, POS, KDS và Payment được tổ chức theo các miền trách nhiệm rõ nhưng vẫn tạo thành một luồng phục vụ liền mạch. Các miền không được cập nhật trạng thái thay nhau tùy ý. Catalog quyết định tồn kho; Order quyết định vòng đời order/bill/session; Kitchen duy trì projection vận hành; Payment sở hữu payment record.

Bài toán còn có ba ràng buộc xuyên suốt. Thứ nhất, mọi thao tác phải đặt trong đúng tenant. Thứ hai, ứng dụng người dùng cần một điểm vào thống nhất nhưng BFF không được trở thành nơi sở hữu nghiệp vụ. Thứ ba, phải phân biệt command/query cần kết quả ngay với tác dụng phụ sau commit, đồng thời phân biệt nguồn trạng thái nghiệp vụ với projection hoặc tín hiệu realtime.

#### 3. Vì sao đây là case study kỹ thuật

F&B và QR ordering tạo bối cảnh có nhiều actor, shared state, state transition, external callback và nhiều điểm bàn giao trách nhiệm. Khóa luận dùng những đặc điểm đó để nghiên cứu multi-tenancy, service ownership và distributed consistency. Nó không nhằm chứng minh QRTable là mô hình kinh doanh mới, có lợi nhuận tốt hơn hoặc vượt trội hơn sản phẩm POS thương mại.

### Cẩm nang phản biện

- **Hỏi: POS và QR ordering đã phổ biến, điểm mới của khóa luận là gì?**
  - **Trả lời:** Đề tài không tuyên bố phát minh lại POS hay QR menu. Đóng góp nằm ở việc dùng luồng này làm case study có thể kiểm chứng cho SaaS đa tenant, ranh giới service/data, consistency, Saga, KDS projection và payment coordination.
- **Hỏi: Vì sao không làm một monolith đơn giản hơn?**
  - **Trả lời:** Monolith có thể phù hợp với phạm vi nhỏ hơn. QRTable chủ động chọn microservices để nghiên cứu ownership theo domain và các vấn đề phân tán phát sinh; giá trị phải được chứng minh bằng cách xử lý các chi phí đó, không phải chỉ bằng số lượng service.
- **Hỏi: Đề tài có đánh giá tính khả thi kinh doanh không?**
  - **Trả lời:** Không theo nghĩa doanh thu, thị trường hoặc chiến lược cạnh tranh. Tính khả thi được xem xét ở mức kỹ thuật: hiện thực luồng cốt lõi, ranh giới dữ liệu và bằng chứng kiểm thử/vận hành tương ứng.

---

---

## Slide 5. Luồng nghiệp vụ từ quét QR đến thanh toán

### Giải thích chi tiết nội bộ

#### 1. Các tác nhân và điểm bàn giao trách nhiệm

Một order trong F&B không phải thao tác của một user duy nhất. Customer khởi tạo nhu cầu trong phiên tại bàn; Staff/POS quyết định mốc xác nhận và xử lý yêu cầu phục vụ; Kitchen/Bar nhận công việc chế biến; provider thanh toán là tác nhân hệ thống bên ngoài gửi callback thay vì đăng nhập như user. Ý nghĩa của sơ đồ không nằm ở số actor mà ở việc trách nhiệm được chuyển giao tại các mốc rõ ràng.

Customer gửi yêu cầu đặt món cho Staff/POS dưới trạng thái chờ. Staff/POS xác nhận mới chuyển trách nhiệm chế biến sang Kitchen/Bar. Tiến độ bếp được phản hồi lại cho các màn hình vận hành. Với thanh toán điện tử, provider gửi thông tin giao dịch cho Payment để xác minh và đối chiếu với bill. Phân tích danh tính, permission và webhook security được để ở các slide kỹ thuật tương ứng; slide này chỉ giữ ngữ nghĩa nghiệp vụ.

#### 2. Sáu mốc của luồng QR-to-Payment

Mốc một là QR hợp lệ xác định tenant và table để mở hoặc nối tiếp session. Mốc hai là các khách cùng session xem menu và thao tác shared cart. Mốc ba là submit: Order tạo order `PENDING` và duy trì bill `OPEN`; bước này chưa trừ tồn kho và chưa tạo KDS ticket.

Mốc bốn là Staff/POS confirm. Order kiểm tra trạng thái, Catalog xử lý tồn kho theo ownership, sau đó order mới chuyển sang `PROCESSING`. Mốc năm là Kitchen nhận `order.confirmed`, tạo ticket theo station và cập nhật tiến độ. Mốc sáu là cash hoặc VietQR/SePay được Payment ghi nhận; Order hoàn tất bill/session và Catalog chuyển bàn sang `CLEANING`.

#### 3. Hai nhầm lẫn phải tránh khi thuyết trình

Thứ nhất, submit không đồng nghĩa confirm. Nếu nói submit đã trừ kho hoặc gửi bếp, toàn bộ lý do tồn tại của Order Confirm Saga sẽ bị mâu thuẫn. Thứ hai, KDS không phải nguồn quyết định order hợp lệ; nó chỉ phản ứng sau khi Order đã commit. Các primitive như Redis, Kafka, outbox và Saga chưa cần xuất hiện trên visual nghiệp vụ vì chúng là lời giải cho chuỗi trạng thái này, không phải chính chuỗi nghiệp vụ.

Luồng sáu mốc cũng là trục demo và đối chiếu evidence: mỗi mốc có thể liên kết hành vi UI với state ở service owner, event/projection và test tương ứng.

### Cẩm nang phản biện

- **Hỏi: Vì sao phải có bước nhân viên xác nhận, khách gửi đơn thẳng xuống bếp không được sao?**
  - **Trả lời:** Trong phạm vi nghiệp vụ được mô hình hóa, confirm là mốc nhà hàng kiểm tra khả năng phục vụ và tồn kho trước khi Kitchen nhận việc. Đây là quyết định của case study, không phải khẳng định mọi nhà hàng đều vận hành giống nhau.
- **Hỏi: Tồn kho được xử lý khi nào?**
  - **Trả lời:** Ở bước Staff/POS confirm, không phải lúc thao tác cart hay submit. Catalog là service duy nhất thay đổi tồn kho.
- **Hỏi: QR đóng vai trò gì ngoài mở menu?**
  - **Trả lời:** QR là điểm vào ngữ cảnh tenant–table–session, từ đó Customer tham gia shared cart, submit order và theo dõi luồng phục vụ mà không cần tài khoản nhân sự.

---

---

## Slide 6. Mục tiêu và phạm vi khóa luận

### Giải thích chi tiết nội bộ

- Không dành quá nhiều thời gian nói về phần chưa làm.
- Dashboard, subscription và administration tồn tại trong hệ thống nhưng không phải case study sâu của main deck.
- SaaS onboarding không xuất hiện trong main deck hoặc appendix theo phạm vi đã chốt.

---

---

## Slide 7. Quyết định kiến trúc Microservices

### Giải thích chi tiết nội bộ

- Divider chuyển từ bài toán sang quyết định thiết kế.
- Không dùng visual monolith-versus-microservices như một cuộc thi hơn kém.

---

---

## Slide 8. Lựa chọn kiến trúc Microservices

### Giải thích chi tiết nội bộ

#### 1. Đặc điểm nghiệp vụ trở thành yêu cầu kiến trúc

Script cũ bắt đầu từ năm đặc điểm, không bắt đầu từ công nghệ. QRTable có nhiều miền với quy tắc khác nhau; nhiều nhà hàng dùng chung nền tảng; nhiều nhóm actor có phạm vi khác nhau; nhiều màn hình cùng theo dõi vận hành; và một luồng nhiều bước có thể bị gửi lại hoặc thất bại giữa chừng. Các đặc điểm này tạo ra yêu cầu tương ứng: trách nhiệm/data ownership rõ, tenant isolation xuyên suốt, actor/scope được xác định đúng, realtime không làm mất source of truth, và state transition chịu được retry/partial failure.

Điểm quan trọng là không suy luận ngược kiểu “đã chọn microservices nên mọi vấn đề đều cần Kafka/Redis/Saga”. Yêu cầu nghiệp vụ phải xuất hiện trước, rồi mới đánh giá boundary và mechanism phù hợp.

#### 2. Cơ sở lựa chọn Microservices

QRTable bao phủ menu/table/stock, session/cart/order/bill, Kitchen, Payment, tenant/subscription và user access. Các nhóm này có invariant và nhịp thay đổi khác nhau. Tách service cho phép mỗi miền có owner, contract và data boundary riêng. Điều đó phù hợp với mục tiêu nghiên cứu service boundary và data ownership của khóa luận.

Tuy nhiên, monolith hoặc modular monolith không tự động là phương án kém. Với đội nhỏ, lưu lượng thấp hoặc phạm vi nghiệp vụ hẹp, chúng có thể đơn giản và kinh tế hơn. QRTable chọn Microservices như một quyết định nghiên cứu có chủ đích; vì thế phải chứng minh boundary thực sự tồn tại ở data ownership và contract, chứ không chỉ là nhiều process hoặc folder.

#### 3. Chi phí phân tán được chấp nhận

Sau khi tách service, hệ thống phải trả lời sáu nhóm câu hỏi từ script cũ. Giao tiếp nào cần phản hồi tức thời và giao tiếp nào chỉ xảy ra sau commit? Staff/Admin và Customer session được xác thực, phân quyền khác nhau ra sao? Tenant context đi qua API, contract, database, Redis và WebSocket thế nào? Retry, duplicate và eventual consistency được kiểm soát bằng gì? Order phối hợp Catalog stock ra sao khi không có transaction chung? KDS cập nhật gần thời gian thực mà vẫn giữ Order là nguồn trạng thái bằng cách nào?

Các câu hỏi này chính là cấu trúc của các phần sau: kiến trúc tổng thể và ownership; actor/access/tenant isolation; giao tiếp liên dịch vụ; local versus distributed consistency; Saga; KDS; Payment. Vì vậy Slide 8 phải đóng vai trò lập luận “quyết định → đánh đổi → chương trình kiểm chứng”, không phải một slide lý thuyết so sánh monolith và microservices.

### Cẩm nang phản biện

- **Hỏi: Vì sao cần tách Kitchen khỏi Order khi Kitchen chỉ là màn hình hàng đợi?**
  - **Trả lời:** Kitchen có access pattern, vòng đời projection và yêu cầu realtime riêng; Order vẫn sở hữu order state. Việc tách giúp giữ hai trách nhiệm khác nhau, nhưng Kitchen chỉ có giá trị khi event/dedup/recovery được xử lý đúng.
- **Hỏi: Microservices mang lại lợi ích hiệu năng nào cho QRTable?**
  - **Trả lời:** Khóa luận chưa có baseline monolith và benchmark tương đương để kết luận lợi thế hiệu năng. Lý do lựa chọn chính là boundary và ownership; performance cần được đo riêng.
- **Hỏi: Làm sao chứng minh đây là microservices thật chứ không phải distributed monolith?**
  - **Trả lời:** Kiểm tra data ownership theo service, không truy cập DB chéo, contract giao tiếp rõ, state/invariant do service owner quyết định và các cơ chế partial failure được xử lý tại boundary.
- **Hỏi: Chi phí lớn nhất của lựa chọn này là gì?**
  - **Trả lời:** Không còn atomic transaction xuyên miền; hệ thống phải quản lý temporal coupling, retry/duplicate, eventual consistency, observability và kiểm thử tích hợp phức tạp hơn.

---

---

## Slide 9. Kiến trúc tổng thể của QRTable

### Giải thích chi tiết nội bộ

- BFF không chứa business logic chính.
- Authorizer xác minh JWT qua gRPC; User-Access sở hữu hồ sơ và quyền ứng dụng.
- SaaS service vẫn xuất hiện trong kiến trúc dù SaaS onboarding không phải nội dung main deck.

---

---

## Slide 10. Ranh giới service và quyền sở hữu dữ liệu

### Giải thích chi tiết nội bộ

- Database được chia theo service, không phải theo tenant.
- Kitchen không có database lịch sử bền vững riêng trong phạm vi hiện tại.
- Redis KDS projection không thay thế Order là nguồn trạng thái nghiệp vụ.

### Cẩm nang phản biện

- **Hỏi: Tại sao các service lại sử dụng các loại cơ sở dữ liệu khác nhau (SQL, NoSQL, Redis)? Giải thích lý do?**
  - **Trả lời:** QRTable lựa chọn cơ sở dữ liệu tối ưu cho từng loại mô hình dữ liệu và đặc thù nghiệp vụ (Polyglot Persistence):
    - **PostgreSQL (SQL)**: Dành cho Catalog (quản lý tồn kho), Order, Payment, và SaaS. Các miền này đòi hỏi tính toàn vẹn dữ liệu cực cao, quan hệ chặt chẽ và giao dịch ACID nghiêm ngặt. Catalog cần cơ chế khóa bi quan (pessimistic locking) để tránh bán lặp (overselling) khi trừ kho; Order và Payment cần transaction cục bộ để tránh mất hóa đơn/tiền và đồng bộ outbox event nhằm tránh lỗi ghi kép (dual-write).
    - **MongoDB (NoSQL)**: Dành cho User-Access. Hồ sơ nhân viên, tuỳ chọn cấu hình, và siêu dữ liệu (metadata) của từng nhà hàng (tenant) có cấu trúc phi đồng nhất, dễ thay đổi. MongoDB giúp lưu trữ dạng tài liệu (document) linh hoạt mà không cần migrate database phức tạp, đồng thời tối ưu hiệu năng đọc cho luồng xác thực và kiểm tra quyền hạn (RBAC) trên mỗi request.
    - **Redis (In-Memory)**: Kitchen dùng Redis làm database chính cho KDS để quản lý hàng đợi chế biến live (Sorted Set) với tốc độ phản hồi sub-millisecond, sắp xếp theo độ ưu tiên SLA và chống trùng lặp sự kiện Kafka. Các service khác dùng Redis làm Cache (Menu, User Session, Rate Limiter) để giảm tải cho database chính.

---

---

## Slide 11. Cô lập tenant và kiểm soát truy cập

### Giải thích chi tiết nội bộ

- Slide divider đánh dấu bắt đầu Phần 3.
- Không chứa nội dung Q&A, chỉ đóng vai trò chuyển tiếp thuyết trình.

---

## Slide 12. Mô hình tác nhân và truy cập trong nền tảng POS

### Giải thích chi tiết nội bộ

- Slide này trả lời `ai đang gọi`, chưa trả lời `được làm gì`.
- Customer session không phải role seed.
- Provider webhook không đi qua cơ chế đăng nhập của người dùng.

---

---

## Slide 13. Xác thực & phân quyền trong mô hình SaaS

### Giải thích chi tiết nội bộ

- `UserGuard`, `TenantGuard`, `PermissionGuard` và `PlanFeatureGuard` để trong notes hoặc appendix.
- Không nói mọi domain service tự xác minh JWT.
- Không claim mTLS hoặc service identity đầy đủ.

### Cẩm nang phản biện

- **Hỏi: OIDC và Keycloak đóng vai trò gì? Lý do chọn và lợi ích của việc sử dụng nó?**
  - **Trả lời:** QRTable dùng Keycloak làm giải pháp định danh tập trung (SSO) sử dụng giao thức OIDC (OpenID Connect) cho nhân viên/chủ quán (staff/owner). Khách hàng (customer) thì không dùng Keycloak để tránh ma sát khi quét QR (zero-friction UX).
  - _Ý nghĩa/Lợi ích:_
    1. **Bảo mật chuẩn doanh nghiệp**: Giao việc lưu mật khẩu, hash, session management cho Keycloak (một enterprise IAM) để tránh lỗ hổng bảo mật tự viết.
    2. **Mã thông báo tự chứa (Self-contained JWT)**: Nhờ OIDC cấp token JWT được ký số, domain services có thể tự kiểm tra token mà không cần hỏi lại Keycloak qua mạng.
    3. **Tích hợp cô lập tenant**: Nhúng `tenant_id` trực tiếp vào token bằng Custom Claim (Protocol Mapper) để BFF Guard có thể tự xác định tenant mà không cần gọi DB.
    4. **Tối ưu hóa gRPC Authorizer**: Authorizer verification dùng gRPC và cache vào Redis (TTL 30 phút) giúp giảm độ trễ tối đa, các service xác thực chỉ mất <1ms.

---

---

## Slide 14. Xác thực & phân quyền trong mô hình SaaS (Sơ đồ)

### Giải thích chi tiết nội bộ

- Trực quan hóa luồng xác thực bằng diagram.
- Nhấn mạnh BFF là nơi thực thi guards và tạo RequestContext nội bộ.
- Chuẩn bị trả lời nếu hội đồng hỏi về Keycloak và session management.

---

## Slide 15. Cơ chế cô lập tenant trong QRTable

### Giải thích chi tiết nội bộ

- Không claim database-per-tenant.
- Không claim PostgreSQL Row-Level Security hoặc global query filter nếu code đang lọc tenant tường minh.
- Super Admin và public/excluded routes là ngoại lệ có kiểm soát.
- Permission count chi tiết để appendix và chỉ dùng sau khi đồng bộ tài liệu.

### Cẩm nang phản biện

- **Hỏi: Có những mô hình cô lập tenant nào trong SaaS, và tại sao em lại lựa chọn mô hình hiện tại cho QRTable?**
  - **Trả lời:** Có 3 mô hình cô lập dữ liệu: **Silo** (Database-per-tenant), **Bridge** (Schema-per-tenant), và **Pool** (Shared Database, Shared Schema + `tenant_id` cột phân biệt).
  - _Tại sao chọn Pool cho QRTable:_
    1. **Tối ưu tài nguyên/chi phí**: POS F&B chủ yếu phục vụ quán vừa và nhỏ (SMBs) có chi phí thuê bao thấp, mô hình Pool giúp chia sẻ tài nguyên phần cứng tốt nhất để tiết kiệm chi phí hạ tầng.
    2. **Độ phức tạp vận hành**: Với 5 microservices có DB riêng, nếu nhân thêm số lượng tenant theo mô hình Silo thì số database tăng vọt ($N \text{ tenants} \times 5 \text{ DBs}$), gây quá tải cho việc chạy migrations. Mô hình Pool giúp chúng em chỉ chạy migration trên đúng 5 DB của 5 service.
    3. **Độ tin cậy bảo mật**: Giảm rủi ro rò rỉ dữ liệu bằng **BFF TenantGuard** và invariant ở service owner: mọi repository/query tenant-scoped phải nhận `tenantId` và áp dụng explicit predicate. Điều này giúp review/test phát hiện query thiếu tenant scope.

---

---

## Slide 16. Phối hợp giữa các service và các bài toán phân tán

### Giải thích chi tiết nội bộ

- Slide divider đánh dấu bắt đầu Phần 4.
- Chuyển từ bảo mật và tenant isolation sang phối hợp dữ liệu liên dịch vụ.

---

## Slide 17. Mô hình giao tiếp giữa các service và ứng dụng

### Giải thích chi tiết nội bộ

#### 1. Tiêu chí đồng bộ và bất đồng bộ ở mức kiến trúc

Script cũ nhấn mạnh rằng “đồng bộ” ở đây nói về phụ thuộc thời gian (temporal coupling) của nghiệp vụ, không phải cách runtime thực hiện I/O. Một lời gọi TCP/gRPC có thể dùng non-blocking I/O và `async/await`, nhưng nếu Order không thể ra quyết định trước khi Catalog trả kết quả thì đây vẫn là một synchronous dependency ở mức kiến trúc.

Command/query cần kết quả ngay nằm trên đường quyết định của người dùng. Khi Staff confirm order, POS phải biết stock có đủ hay không; nếu Catalog từ chối, Order không được chuyển sang `PROCESSING`. BFF cũng phải nhận kết quả verify JWT từ Authorizer trước khi cho request đi tiếp. Vì thế Order → Catalog dùng TCP và BFF → Authorizer dùng gRPC.

Ngược lại, khi trạng thái nghiệp vụ đã commit và service khác chỉ cần phản ứng sau đó, Kafka phù hợp hơn. `order.confirmed` cho Kitchen tạo KDS projection là ví dụ chính. POS không phải chờ Kitchen tạo ticket để coi confirm đã hoàn tất. Điều này làm các service hội tụ theo eventual consistency, nhưng consumer phải chịu được delay, retry và duplicate.

#### 2. Vai trò của từng kênh trong topology QRTable

HTTP REST là bề mặt command/query giữa Management App hoặc Customer PWA với BFF, đồng thời là đường lấy API snapshot. BFF thống nhất guard chain, tenant context và contract ngoài hệ thống; nó không trở thành owner của state nghiệp vụ.

TCP/gRPC là contract nội bộ cần phản hồi. TCP phục vụ phần lớn command/query giữa BFF hoặc các domain service; gRPC được dùng cho Authorizer. Việc đi qua RPC không cho phép service bỏ qua ownership: Catalog vẫn tự kiểm tra và ghi stock; Order không được import repository của Catalog.

Kafka là event channel sau commit. Nó không phải UI transport, không thay thế mọi command và không tự bảo đảm consistency. Transactional outbox hoặc producer path quyết định event intent được hình thành thế nào; consumer vẫn cần validation và deduplication.

Redis có nhiều vai trò theo owner: session/cart/cache/projection và Pub/Sub nội bộ. Redis không phải database chung để service tùy ý đọc state của nhau. Với KDS, Kitchen ghi projection và phát `kds.queue_changed`; BFF chỉ chuyển tín hiệu realtime.

WebSocket/Socket.IO là lớp signaling. Room được xác lập theo tenant/session sau khi kiểm tra auth; payload hint báo dữ liệu đã thay đổi. Client refetch HTTP API snapshot thay vì dùng chuỗi WebSocket event làm canonical state. Đây là lý do “realtime” và “source of truth” không được đồng nhất.

Webhook là đường callback từ provider ngoài vào public route của BFF. “Public” chỉ có nghĩa không dùng user JWT như route staff; request vẫn phải được validate/xác minh theo cơ chế provider rồi mới chuyển vào Payment, service sở hữu payment record.

#### 3. Điều slide gộp phải giúp trả lời

Hai script cũ cùng trả lời một câu hỏi nhưng ở hai mức: Slide cũ 15 giải thích **vì sao chọn kênh**, còn Slide cũ 16 giải thích **kênh nằm ở đâu và chịu trách nhiệm gì**. Khi trả lời Hội đồng, phải bắt đầu từ nhu cầu nghiệp vụ rồi mới chỉ vào topology; không trả lời bằng cách liệt kê HTTP, Kafka, Redis và WebSocket như danh sách công nghệ.

### Cẩm nang phản biện

- **Hỏi: Vì sao không dùng Kafka cho toàn bộ giao tiếp giữa các service?**
  - **Trả lời:** Một số quyết định cần kết quả ngay trên đường xử lý, như kiểm tra và giữ tồn kho trước khi xác nhận đơn. Dùng Kafka cho mọi command sẽ buộc hệ thống bổ sung correlation, timeout và state machine chờ kết quả, làm luồng POS phức tạp hơn mà không tạo lợi ích tương xứng.
- **Hỏi: WebSocket có phải nguồn dữ liệu mới nhất của KDS không?**
  - **Trả lời:** Không. WebSocket chỉ là tín hiệu thay đổi. Client refetch API snapshot có revision hiện hành; cách này tránh phụ thuộc vào việc mọi thông báo WebSocket đều được giao đầy đủ và đúng thứ tự.
- **Hỏi: Dùng TCP có làm hệ thống không còn là microservices?**
  - **Trả lời:** Không. Microservices được xác định bởi ranh giới triển khai và quyền sở hữu domain/data, không phải bởi việc cấm giao tiếp đồng bộ. Vấn đề là chỉ dùng đồng bộ ở nơi nghiệp vụ thực sự cần phản hồi tức thời.
- **Hỏi: Redis có phải một message bus thứ hai bên cạnh Kafka không?**
  - **Trả lời:** Không theo cùng vai trò. Kafka mang domain event cần consumer xử lý sau commit; Redis Pub/Sub trong luồng KDS chỉ chuyển tín hiệu realtime nội bộ và không bền vững. Redis còn lưu projection/cache/session theo ownership cụ thể.

---

---

## Slide 18. Mô hình giao tiếp giữa các service và ứng dụng (Sơ đồ)

### Giải thích chi tiết nội bộ

- Trực quan hóa các kênh giao tiếp bằng diagram `chapter4-communication-topology.png`.
- Nhấn mạnh tính tách biệt trách nhiệm: HTTP REST cho user request/API snapshot, gRPC/TCP cho internal RPC, Kafka cho async events, Redis cho projection/cache.

---

## Slide 19. Nhất quán dữ liệu phân tán trên nhiều local transaction - ba cơ chế nền tảng

### Giải thích chi tiết nội bộ

#### 1. ACID vẫn tồn tại, nhưng bị giới hạn bởi service boundary

Script cũ phân biệt rõ một local transaction với một distributed workflow. Trong Order DB, service có thể khóa order/bill và cùng commit state với outbox. Trong Catalog DB, reservation và thay đổi stock có thể cùng commit hoặc rollback. Trong Payment DB, payment record, audit và outbox có thể nằm trong cùng transaction. ACID không biến mất khi dùng microservices; nó bảo vệ invariant trong database mà service sở hữu.

Điểm khó là use case QR-to-Payment đi qua nhiều database và cả Redis projection. Catalog không thể tham gia transaction của Order như một repository nội bộ. Payment commit payment record trước khi Order hoàn tất bill. Kitchen nhận event sau commit và xây projection ở thời điểm khác. Không có một transaction chung làm tất cả cùng thành công hoặc cùng rollback.

Chữ “consistency” trong ACID là việc transaction cục bộ chuyển database giữa các trạng thái thỏa invariant. Tính nhất quán cuối cùng (eventual consistency) nói về nhiều service cập nhật ở thời điểm khác nhau nhưng tiến dần tới trạng thái hội tụ. Không được dùng hai khái niệm như đồng nghĩa, và eventual consistency không có nghĩa cho phép trạng thái trung gian tùy ý hoặc vi phạm invariant.

#### 2. Ba cấu phần có vai trò khác nhau

Idempotency là thuộc tính hành vi: cùng một ý định nghiệp vụ được thực hiện lại không tạo thêm kết quả ngoài ý muốn. Nó có thể dựa trên idempotency key, aggregate state hoặc persistent reservation. Ví dụ, submit không tạo order thứ hai; confirm retry không trừ stock lần hai; payment không ghi nhận bill lần hai.

Transactional outbox là mẫu ghi state change và event intent trong cùng local transaction. Nó đóng cửa sổ lỗi “state đã commit nhưng event row chưa tồn tại”. Outbox không tự bảo đảm event chỉ được publish một lần và không tự deduplicate consumer.

Deduplication là kỹ thuật phía nhận: dùng event/message identifier hoặc processing key để nhận diện phần việc đã xử lý. Kitchen đặt dedupe key theo event và ticket; consumer hoặc command handler khác có thể dựa trên aggregate state. Dedupe không tự hoàn tác tác dụng phụ ở service khác.

Ba cấu phần bổ sung nhau nhưng không biến nhiều database thành một ACID transaction và không tạo exactly-once end-to-end.

#### 3. Ánh xạ các cơ chế vào từng luồng QRTable

- **Shared cart:** `cartVersion` phát hiện stale update theo optimistic concurrency control. Đây là kiểm soát cạnh tranh trên shared state, không phải event deduplication.
- **Submit order:** idempotency key/aggregate state giúp cùng một lần submit không tạo thêm order hoặc bill ngoài ý muốn.
- **KDS:** dedupe theo event và order–station ngăn cùng event tạo ticket lặp; Redis projection và revision phục vụ snapshot vận hành.
- **Payment:** row-level locking, current-state check, unique constraint và outbox bảo vệ payment record; Order `markPaid` chịu replay để bridge có thể hội tụ.
- **Order confirm:** persistent reservation với key, payload hash và version ngăn deduct lặp khi lost response; nhưng reservation không tự hoàn kho nếu Order commit thất bại.

#### 4. Điểm giới hạn dẫn tới Saga

Trường hợp quan trọng nhất là Catalog đã commit stock mutation và trả `APPLIED`, nhưng Order lỗi trước khi commit state/outbox. Idempotency bảo vệ retry, song không đảo ngược stock đã thay đổi. Outbox của Order cũng chưa tồn tại vì Order transaction rollback. Deduplication ở Kitchen không liên quan vì event chưa được phát. Đây là partial failure cần một hành động nghiệp vụ bù trừ có đúng participant và đúng reservation version.

Như vậy, Slide 17 gộp hai tầng lập luận của bản cũ: trước hết giải thích giới hạn local transaction và ba primitive; sau đó ánh xạ chúng vào QRTable để chỉ ra chính xác phần nào đã được kiểm soát và phần nào còn cần Saga.

### Cẩm nang phản biện

- **Hỏi: Eventual consistency có phải dữ liệu sai trong một khoảng thời gian không?**
  - **Trả lời:** Không nên hiểu như vậy. Hệ thống có thể ở trạng thái trung gian chưa đồng bộ hoàn toàn, nhưng mỗi trạng thái phải có ý nghĩa và bất biến cục bộ vẫn được bảo vệ. Ví dụ, Kitchen chưa có ticket ngay sau commit Order là độ trễ hội tụ; còn trừ kho hai lần là vi phạm bất biến và phải được ngăn chặn.
- **Hỏi: Transactional outbox giải quyết toàn bộ bài toán phát event chưa?**
  - **Trả lời:** Outbox gắn state change với event intent trong cùng local transaction. Relay vẫn có thể retry và consumer vẫn phải deduplicate; do đó outbox không tạo exactly-once end-to-end.
- **Hỏi: Vì sao không dùng distributed transaction hoặc two-phase commit?**
  - **Trả lời:** Phạm vi hệ thống ưu tiên ownership độc lập và khả năng chịu lỗi của từng service. Hai-phase commit sẽ ghép thời gian sống và khả dụng của nhiều service/database; QRTable chọn local transaction kết hợp Saga/outbox cho các luồng trọng tâm.
- **Hỏi: Idempotency và deduplication có phải cùng một cơ chế không?**
  - **Trả lời:** Chúng cùng xử lý thao tác lặp nhưng ở hai góc khác nhau. Idempotency mô tả hành vi của operation khi gọi lại; deduplication là kỹ thuật nhận diện message/command đã xử lý ở phía nhận. Một implementation có thể dùng dedupe key để đạt hành vi idempotent, nhưng không nên đồng nhất hai khái niệm.
- **Hỏi: Persistent reservation đã đủ thay Saga chưa?**
  - **Trả lời:** Reservation giải quyết lost-response retry và ngăn deduct lặp. Nó không tự release stock khi Catalog đã commit còn Order commit thất bại; nhánh đó vẫn cần compensation do orchestrator kích hoạt.

---

---

## Slide 20. Nhất quán dữ liệu phân tán trên nhiều local transaction

### Giải thích chi tiết nội bộ

#### 1. ACID vẫn tồn tại, nhưng bị giới hạn bởi service boundary

Script cũ phân biệt rõ một local transaction với một distributed workflow. Trong Order DB, service có thể khóa order/bill và cùng commit state với outbox. Trong Catalog DB, reservation và thay đổi stock có thể cùng commit hoặc rollback. Trong Payment DB, payment record, audit và outbox có thể nằm trong cùng transaction. ACID không biến mất khi dùng microservices; nó bảo vệ invariant trong database mà service sở hữu.

Điểm khó là use case QR-to-Payment đi qua nhiều database và cả Redis projection. Catalog không thể tham gia transaction của Order như một repository nội bộ. Payment commit payment record trước khi Order hoàn tất bill. Kitchen nhận event sau commit và xây projection ở thời điểm khác. Không có một transaction chung làm tất cả cùng thành công hoặc cùng rollback.

Chữ “consistency” trong ACID là việc transaction cục bộ chuyển database giữa các trạng thái thỏa invariant. Tính nhất quán cuối cùng (eventual consistency) nói về nhiều service cập nhật ở thời điểm khác nhau nhưng tiến dần tới trạng thái hội tụ. Không được dùng hai khái niệm như đồng nghĩa, và eventual consistency không có nghĩa cho phép trạng thái trung gian tùy ý hoặc vi phạm invariant.

#### 2. Ba cấu phần có vai trò khác nhau

Idempotency là thuộc tính hành vi: cùng một ý định nghiệp vụ được thực hiện lại không tạo thêm kết quả ngoài ý muốn. Nó có thể dựa trên idempotency key, aggregate state hoặc persistent reservation. Ví dụ, submit không tạo order thứ hai; confirm retry không trừ stock lần hai; payment không ghi nhận bill lần hai.

Transactional outbox là mẫu ghi state change và event intent trong cùng local transaction. Nó đóng cửa sổ lỗi “state đã commit nhưng event row chưa tồn tại”. Outbox không tự bảo đảm event chỉ được publish một lần và không tự deduplicate consumer.

Deduplication là kỹ thuật phía nhận: dùng event/message identifier hoặc processing key để nhận diện phần việc đã xử lý. Kitchen đặt dedupe key theo event và ticket; consumer hoặc command handler khác có thể dựa trên aggregate state. Dedupe không tự hoàn tác tác dụng phụ ở service khác.

Ba cấu phần bổ sung nhau nhưng không biến nhiều database thành một ACID transaction và không tạo exactly-once end-to-end.

#### 3. Ánh xạ các cơ chế vào từng luồng QRTable

- **Shared cart:** `cartVersion` phát hiện stale update theo optimistic concurrency control. Đây là kiểm soát cạnh tranh trên shared state, không phải event deduplication.
- **Submit order:** idempotency key/aggregate state giúp cùng một lần submit không tạo thêm order hoặc bill ngoài ý muốn.
- **KDS:** dedupe theo event và order–station ngăn cùng event tạo ticket lặp; Redis projection và revision phục vụ snapshot vận hành.
- **Payment:** row-level locking, current-state check, unique constraint và outbox bảo vệ payment record; Order `markPaid` chịu replay để bridge có thể hội tụ.
- **Order confirm:** persistent reservation với key, payload hash và version ngăn deduct lặp khi lost response; nhưng reservation không tự hoàn kho nếu Order commit thất bại.

#### 4. Điểm giới hạn dẫn tới Saga

Trường hợp quan trọng nhất là Catalog đã commit stock mutation và trả `APPLIED`, nhưng Order lỗi trước khi commit state/outbox. Idempotency bảo vệ retry, song không đảo ngược stock đã thay đổi. Outbox của Order cũng chưa tồn tại vì Order transaction rollback. Deduplication ở Kitchen không liên quan vì event chưa được phát. Đây là partial failure cần một hành động nghiệp vụ bù trừ có đúng participant và đúng reservation version.

Như vậy, Slide 17 gộp hai tầng lập luận của bản cũ: trước hết giải thích giới hạn local transaction và ba primitive; sau đó ánh xạ chúng vào QRTable để chỉ ra chính xác phần nào đã được kiểm soát và phần nào còn cần Saga.

### Cẩm nang phản biện

- **Hỏi: Eventual consistency có phải dữ liệu sai trong một khoảng thời gian không?**
  - **Trả lời:** Không nên hiểu như vậy. Hệ thống có thể ở trạng thái trung gian chưa đồng bộ hoàn toàn, nhưng mỗi trạng thái phải có ý nghĩa và bất biến cục bộ vẫn được bảo vệ. Ví dụ, Kitchen chưa có ticket ngay sau commit Order là độ trễ hội tụ; còn trừ kho hai lần là vi phạm bất biến và phải được ngăn chặn.
- **Hỏi: Transactional outbox giải quyết toàn bộ bài toán phát event chưa?**
  - **Trả lời:** Outbox gắn state change với event intent trong cùng local transaction. Relay vẫn có thể retry và consumer vẫn phải deduplicate; do đó outbox không tạo exactly-once end-to-end.
- **Hỏi: Vì sao không dùng distributed transaction hoặc two-phase commit?**
  - **Trả lời:** Phạm vi hệ thống ưu tiên ownership độc lập và khả năng chịu lỗi của từng service. Hai-phase commit sẽ ghép thời gian sống và khả dụng của nhiều service/database; QRTable chọn local transaction kết hợp Saga/outbox cho các luồng trọng tâm.
- **Hỏi: Idempotency và deduplication có phải cùng một cơ chế không?**
  - **Trả lời:** Chúng cùng xử lý thao tác lặp nhưng ở hai góc khác nhau. Idempotency mô tả hành vi của operation khi gọi lại; deduplication là kỹ thuật nhận diện message/command đã xử lý ở phía nhận. Một implementation có thể dùng dedupe key để đạt hành vi idempotent, nhưng không nên đồng nhất hai khái niệm.
- **Hỏi: Persistent reservation đã đủ thay Saga chưa?**
  - **Trả lời:** Reservation giải quyết lost-response retry và ngăn deduct lặp. Nó không tự release stock khi Catalog đã commit còn Order commit thất bại; nhánh đó vẫn cần compensation do orchestrator kích hoạt.

---

---

## Slide 21. Giải pháp Saga Pattern trong transaction phân tán

### Giải thích chi tiết nội bộ

Saga là một chuỗi giao dịch cục bộ (local transactions) có quy tắc tiếp tục hoặc bù trừ; nó không biến nhiều database thành một global ACID transaction. Với choreography, mỗi service phản ứng với event và tự quyết định bước tiếp theo. Cách đó giảm một điều phối viên trung tâm nhưng khiến luồng và nhánh lỗi phân tán qua nhiều consumer. Với orchestration, một thành phần giữ tri thức về trình tự, gọi participant và kích hoạt compensation khi cần.

Trong Order Confirm, Order là ứng viên tự nhiên cho vai trò orchestrator vì chính Order sở hữu trạng thái `PENDING → PROCESSING`, biết bill có đang `OPEN` hay không, và chỉ nó mới quyết định confirm đã hoàn tất. Catalog vẫn sở hữu toàn bộ logic tồn kho: Order chỉ yêu cầu deduct/release, không truy cập Catalog DB. Kitchen không phải participant của giao dịch bù trừ tồn kho; nó chỉ nhận `order.confirmed` sau khi Order đã commit.

Điểm đánh đổi là Order hiểu trình tự của use case và có thêm trách nhiệm điều phối. Nếu use case có nhiều participant hơn, kéo dài lâu hơn hoặc cần phục hồi tự động sau restart, có thể cần lưu Saga state bền vững và retry worker chuyên dụng. Hiện trạng QRTable chưa chứng minh đầy đủ lớp phục hồi đó, nên slide chỉ khẳng định orchestration và compensation trực tiếp trong phạm vi Order Confirm.

### Cẩm nang phản biện

- **Hỏi: Vì sao Order là orchestrator mà không phải BFF?**
  - **Trả lời:** BFF chỉ xử lý transport và cross-cutting concerns; nó không sở hữu trạng thái Order hay bất biến confirm. Đặt orchestration ở Order giữ business rule trong domain service đúng ownership.
- **Hỏi: Tại sao Kitchen không nằm trong Saga?**
  - **Trả lời:** Kitchen chỉ tạo projection sau event đã commit. Nếu Order chưa commit, không có `order.confirmed` hợp lệ để Kitchen xử lý. Compensation tồn kho vì thế chỉ liên quan Order và Catalog trong use case này.
- **Hỏi: Saga có bảo đảm rollback giống transaction database không?**
  - **Trả lời:** Không. Compensation là một hành động nghiệp vụ mới và bản thân nó cũng có thể thất bại. Hệ thống cần idempotency, versioning, log/monitoring và chiến lược phục hồi phù hợp.

---

---

## Slide 22. Áp dụng Orchestration Saga trong luồng xác nhận đơn

### Giải thích chi tiết nội bộ

#### 1. Cách đọc sequence diagram

Sơ đồ chính nên giữ năm lane để đọc được trên màn chiếu: Staff/POS, BFF, Order, Catalog và Outbox/Kafka/Kitchen. Đây là phép gộp về trình bày, không phải gộp runtime hoặc database. Lane Order đại diện cho Order service và transaction trên Order DB; lane Catalog đại diện cho Catalog service, Catalog DB và bản ghi `stock_reservations`; lane cuối gộp các bước bất đồng bộ sau commit.

#### 2. Kiểm tra và khóa ở Order

Request xác nhận đi qua guard chain ở BFF rồi vào Order. `OrderConfirmSagaService` mở local transaction và dùng `findByIdAndTenantForUpdate`, vì vậy hai confirm đồng thời không cùng ra quyết định trên một trạng thái cũ. Nếu order đã `PROCESSING`, service trả kết quả replay hiện hành và không gọi Catalog. Nếu order không còn `PENDING`, hoặc bill không còn `OPEN`, yêu cầu bị từ chối trước khi tạo tác dụng phụ ở Catalog.

Order đọc các order item và tạo stock mutation theo `tenantId`, `orderId`, `menuItemId`, `quantity`. Khóa lũy đẳng dùng mẫu `confirm-order:{orderId}`. Order không sửa tồn kho trực tiếp; nó gọi `CatalogStockGatewayService`, nhờ đó ranh giới ownership vẫn được giữ.

#### 3. Persistent reservation ở Catalog

Catalog chuẩn hóa danh sách item, tạo hash của payload và mở transaction riêng. Service claim/lock reservation theo tenant, order, idempotency key và request hash. Nếu cùng key nhưng payload khác, Catalog trả conflict thay vì đoán ý định caller. Nếu reservation đang ở trạng thái `Reserved`, Catalog trả `REPLAYED` với kết quả và version đã lưu, không trừ lại kho.

Với thao tác mới, Catalog khóa các menu item theo thứ tự chuẩn hóa, kiểm tra tất cả item tồn tại và đủ số lượng rồi mới thay đổi. Tồn kho, trạng thái món và reservation được lưu trong cùng Catalog transaction. Reservation chuyển sang `Reserved`, tăng version và giữ kết quả deduct. Kết quả `APPLIED` nghĩa là lần gọi này đã áp dụng thay đổi; `REPLAYED` nghĩa là thay đổi tương ứng đã tồn tại. Cả hai chưa đồng nghĩa toàn bộ Saga đã hoàn tất.

#### 4. Commit trạng thái và outbox ở Order

Khi nhận `reservationVersion`, Order lưu version vào order, chuyển order và order item sang `PROCESSING`, đồng thời tạo outbox `order.confirmed` với trạng thái `PENDING`. Các thay đổi này cùng nằm trong Order transaction: nếu việc save state hoặc outbox thất bại, transaction Order rollback. Sau khi commit, relay mới có thể phát event sang Kafka; Kitchen tiêu thụ event và tạo ticket. Vì vậy POS không phải chờ Kitchen, nhưng Kitchen cũng không được đi trước trạng thái đã commit của Order.

#### 5. Hai nhánh lỗi quan trọng

Nếu Catalog đã commit nhưng phản hồi TCP bị mất, Order transaction không hoàn tất và order vẫn `PENDING`. Khi caller retry với cùng key và payload, Catalog trả `REPLAYED`; Order có thể tiếp tục commit mà kho không giảm lần hai.

Nếu Catalog trả thành công nhưng Order lỗi khi lưu state/outbox, `OrderConfirmSagaService` gọi `releaseForOrder` với idempotency key bù trừ và đúng `reservationVersion`. Catalog chỉ release reservation hiện hành. Cùng version đã release trả `REPLAYED`; version cũ hơn trả `STALE`; version lớn hơn hiện hành hoặc payload không khớp trả conflict. Cơ chế này ngăn một compensation đến trễ hoàn nhầm lượt reservation mới hơn.

Nếu chính compensation thất bại, code hiện ghi log đầy đủ tenant, order, version, lỗi gốc và lỗi compensation, rồi vẫn giữ lỗi gốc của confirm. Đây là giới hạn vận hành quan trọng: không được diễn đạt thành hệ thống tự phục hồi bền vững 100% khi chưa có durable Saga state/retry worker.

#### 6. Ma trận nhánh lỗi kế thừa từ slide cũ

| Điểm lỗi                                            | Trạng thái đã commit                                   | Cách QRTable phản ứng                                 | Điều cần nhớ khi trả lời                        |
| --------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------- |
| Order/bill không hợp lệ                             | Chưa có tác dụng phụ Catalog                           | Từ chối trước khi deduct                              | Không cần compensation                          |
| Catalog báo item thiếu/hết stock                    | Catalog transaction rollback                           | Order transaction không chuyển state                  | Đây là lỗi nghiệp vụ, không phải partial commit |
| Catalog commit nhưng response TCP bị mất            | Reservation/stock đã commit; Order chưa commit         | Caller retry cùng key/payload; Catalog trả `REPLAYED` | Retry tiếp tục Saga mà không deduct lần hai     |
| Catalog trả thành công, Order save state/outbox lỗi | Catalog đã commit; Order rollback                      | Order gọi `releaseForOrder` đúng version              | Đây là nhánh compensation chính                 |
| Release cùng version được gửi lại                   | Reservation đã `Released`                              | Catalog trả `REPLAYED`                                | Compensation cũng phải idempotent               |
| Release version cũ đến trễ                          | Có reservation version mới hơn                         | Catalog trả `STALE`                                   | Không hoàn nhầm stock của lượt mới              |
| Release version lớn hơn hoặc payload khác           | Request không khớp reservation hiện hành               | Catalog trả conflict                                  | Không đoán hoặc tự sửa dữ liệu                  |
| Compensation call thất bại                          | Catalog side effect có thể còn tồn tại; Order rollback | Ghi log cả lỗi gốc và lỗi compensation                | Chưa có durable automatic recovery              |

Ma trận này là kiến thức ẩn để trả lời Q&A, không nên đưa toàn bộ lên main slide. Main slide chỉ giữ sequence thành công và ba annotation; khi Hội đồng hỏi “nếu lỗi ở bước X thì sao?”, người trình bày chọn đúng dòng tương ứng để trả lời.

#### 7. Phạm vi bằng chứng

Unit/contract tests xác minh các nhánh replay, invalid state, Catalog error và compensation khi Order save thất bại. Integration tests đại diện kiểm tra persistent reservation, retry/lost-response behavior và stock idempotency trong phạm vi harness tương ứng. Trước khi nói “fault injection”, phải chỉ ra test thực sự tiêm lỗi ở boundary nào; không nâng unit mock hoặc opt-in integration thành live fault injection toàn stack.

### Cẩm nang phản biện

- **Hỏi: Tại sao cần `reservationVersion`, dùng `orderId` không đủ sao?**
  - **Trả lời:** `orderId` nhận diện aggregate nhưng không nhận diện chính xác lượt reservation hiện hành. Một release của lượt cũ có thể đến sau một lần reserve mới. Version cho phép Catalog trả `STALE` và không hoàn nhầm tồn kho của lượt mới.
- **Hỏi: `APPLIED` và `REPLAYED` khác nhau thế nào?**
  - **Trả lời:** `APPLIED` cho biết Catalog vừa thực hiện thay đổi; `REPLAYED` cho biết cùng ý định đã được thực hiện và Catalog trả lại kết quả lưu trước đó. Với Order, cả hai đều có thể tiếp tục nếu payload/version hợp lệ, nhưng không được trừ kho thêm.
- **Hỏi: Điều gì xảy ra khi Catalog hết hàng?**
  - **Trả lời:** Catalog kiểm tra toàn bộ item trong local transaction trước khi lưu thay đổi. Nó trả lỗi nghiệp vụ, Catalog transaction rollback và Order không chuyển sang `PROCESSING`; do chưa có deduct thành công nên không cần compensation.
- **Hỏi: Compensation có bảo đảm thành công 100% không?**
  - **Trả lời:** Không. Hiện tại Order thử gọi release và ghi log nếu release thất bại. Đó là cơ chế phát hiện nhưng chưa phải phục hồi tự động bền vững; hướng hoàn thiện là persistent recovery state, retry policy và cảnh báo vận hành.
- **Hỏi: Outbox có ngăn Kitchen nhận trùng event không?**
  - **Trả lời:** Outbox ngăn state commit mà không có event intent. Relay có thể phát lại, nên Kitchen vẫn phải deduplicate theo event/ticket. Hai lớp xử lý hai cửa sổ lỗi khác nhau.

---

---

## Slide 23. Cơ chế bù trừ của Orchestration Saga trong việc xử lý các nhánh lỗi

### Giải thích chi tiết nội bộ

Slide thực tế dùng bảng nhánh lỗi để trả lời câu hỏi phản biện quan trọng nhất của Saga: nếu một bước đã commit nhưng bước sau thất bại thì hệ thống xử lý thế nào. Không nên đọc toàn bộ bảng như checklist. Chọn 3 dòng đại diện để nói: lỗi trước Catalog thì chưa có tác dụng phụ; Catalog lỗi nghiệp vụ thì rollback cục bộ; Catalog đã trừ kho nhưng Order commit/outbox thất bại thì phải gọi compensation.

Hai dòng cuối về retry/release đến trễ dùng khi Hội đồng hỏi sâu. Mất phản hồi TCP từ Catalog được xử lý bằng `REPLAYED`, tránh trừ kho lần hai. Release trễ hoặc lặp được kiểm soát bằng version: cùng version có thể replay, version cũ trả `STALE`. Điểm này chứng minh compensation cũng cần idempotency và versioning, không chỉ luồng confirm thành công.

Nếu bị hỏi “compensation có chắc chắn thành công không?”, không trả lời tuyệt đối. Nói đúng phạm vi: QRTable có cơ chế gọi bù trừ và test đại diện; để hardening vận hành cần durable Saga state, retry worker, reconciliation và alerting.

---

---

## Slide 24. Quản lý dữ liệu realtime trên hệ thống phân tán

### Giải thích chi tiết nội bộ

KDS không bắt đầu từ lúc khách thêm món vào cart hoặc submit order. Nó bắt đầu khi Kitchen nhận được `order.confirmed`, tức là sau khi Order đã commit trạng thái `PROCESSING` và outbox event. Đây là ranh giới quan trọng: Kitchen không tự quyết định đơn đã hợp lệ hay tồn kho đã được giữ.

Consumer xác thực payload rồi phân chia các order item theo `PreparationStation`, chẳng hạn kitchen hoặc bar. Trước khi tạo dữ liệu, repository dùng khóa `SET ... NX` theo event và theo cặp order–station. Nếu event hoặc ticket đã được claim, lần xử lý lặp trả về không có thay đổi. Dedupe có TTL nên đây là cơ chế thực dụng cho projection, không phải bằng chứng exactly-once vô hạn.

Redis được dùng theo vai trò cụ thể. Hash lưu metadata của ticket, item và SLA. Set tạo index từ order, session, source event hoặc ticket sang các ticket/item liên quan. Sorted Set giữ active/ready queue theo score, đồng thời lập lịch các mốc warning và breach của SLA. String được dùng cho dedupe lock và revision counter; List có thể phục vụ các hàng đợi lỗi/phụ trợ trong phạm vi KDS. Các thao tác tạo ticket liên quan được gom bằng Redis `multi`, sau đó station revision tăng lên để snapshot có mốc phiên bản.

Sau mutation, Kitchen phát `kds.queue_changed` qua Redis Pub/Sub; BFF chuyển tín hiệu tới room WebSocket đúng tenant/station. Pub/Sub và WebSocket đều không phải kho trạng thái bền vững, nên payload realtime không được xem là toàn bộ queue. Client nhận hint rồi gọi API lấy `KdsQueueSnapshot`, gồm revision, server time và danh sách ticket hiện hành. Mẫu hint/refetch làm UI có thể phục hồi khi mất thông báo hoặc reconnect.

Order vẫn là nguồn trạng thái bền vững của order và order item. Kitchen hiện lưu runtime projection chủ yếu trong Redis và có cơ chế rebuild từ active order snapshots, nhưng chưa nên trình bày như một persistent history database đầy đủ. Nếu Redis mất dữ liệu hoặc Pub/Sub gián đoạn, khả năng phục hồi và độ trễ hội tụ phải được đánh giá đúng theo cơ chế rebuild/reconnect thực tế.

### Cẩm nang phản biện

- **Hỏi: Vì sao không gửi toàn bộ KDS state qua WebSocket?**
  - **Trả lời:** Full state trong từng event làm payload lớn và khó xử lý mất gói, trùng hoặc sai thứ tự. Hint + refetch dùng API snapshot và revision làm điểm hội tụ đáng tin cậy hơn cho client.
- **Hỏi: Vì sao dùng Redis thay vì database quan hệ?**
  - **Trả lời:** KDS cần thao tác queue theo station, priority/time score, index nhanh và cập nhật revision thường xuyên. Hash/Set/Sorted Set khớp trực tiếp với mô hình truy cập đó. Đây là quyết định thiết kế theo access pattern, không phải tuyên bố Redis luôn tốt hơn PostgreSQL.
- **Hỏi: Redis có phải source of truth không?**
  - **Trả lời:** Với vòng đời nghiệp vụ order, không. Order service là nguồn bền vững. Redis giữ KDS runtime projection để vận hành hàng đợi; cơ chế recovery có thể dựng lại ticket còn thiếu từ active order snapshots.
- **Hỏi: Nếu cùng Kafka event đến hai lần thì sao?**
  - **Trả lời:** Kitchen claim dedupe key theo event và ticket bằng `SET NX`; lần lặp không tạo ticket mới. Tuy nhiên vẫn không gọi đó là exactly-once end-to-end.

---

---

## Slide 25. Kết quả kiểm chứng và hướng phát triển

### Giải thích chi tiết nội bộ

- Slide divider đánh dấu bắt đầu Phần 5.
- Không chứa nội dung Q&A, chỉ đóng vai trò chuyển tiếp thuyết trình.

---

## Slide 26. Các lớp kiểm chứng kỹ thuật

### Giải thích chi tiết nội bộ

- Cung cấp cái nhìn đa lớp để củng cố độ tin cậy của kết quả thực nghiệm.
- Trả lời nếu Hội đồng chất vấn vì sao không chạy load test/stress test: Hệ thống tập trung kiểm chứng tính đúng đắn chức năng và bất biến phân tán ở quy mô lab-test.

### Cẩm nang phản biện

- **Hỏi: Lớp kiểm chứng nào là quan trọng nhất đối với backend?**
  - **Trả lời:** Lớp trạng thái hệ thống (Storage & Operation) và Lớp kiểm thử (Testing) là quan trọng nhất, vì chúng cung cấp bằng chứng trực tiếp về tính nhất quán dữ liệu, tính lũy đẳng và khả năng bù trừ giao dịch trong môi trường phân tán.

---

## Slide 27. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 1. Race Condition

### Giải thích chi tiết nội bộ

- Test case giả lập 2 yêu cầu gửi song song.
- Catalog DB dùng row-level locking (`SELECT ... FOR UPDATE` hoặc tương đương) để ngăn chặn race condition.
- Order Service đón nhận lỗi từ Catalog để rollback transaction cục bộ.

---

## Slide 28. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 2. Lost Response Recovery

### Giải thích chi tiết nội bộ

- Giải quyết lỗi temporal coupling khi network bị đứt gãy giữa chừng.
- Catalog dựa vào idempotency key lưu trữ trong bảng `stock_reservations` để xác minh trạng thái yêu cầu trước đó.
- Trả về REPLAYED để báo hiệu cho Orchestrator tiếp tục luồng bình thường.

---

## Slide 29. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 3. Stale Release Prevention

### Giải thích chi tiết nội bộ

- Giải quyết bài toán out-of-order messages trong môi trường mạng bất định.
- Mỗi lần reservation thay đổi, `reservationVersion` sẽ được tăng lên.
- Catalog kiểm tra phiên bản và chặn đứng các yêu cầu release có phiên bản lỗi thời (stale versions).

---

## Slide 30. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 4. Idempotency

### Giải thích chi tiết nội bộ

- Đảm bảo an toàn dữ liệu đa tenant (multi-tenant isolation & data safety).
- Khóa lũy đẳng được tạo dựa trên ID của đơn hàng và hash của nội dung món ăn.
- Catalog không chạy lại logic trừ kho khi phát hiện key đã tồn tại ở trạng thái Reserved.

---

## Slide 31. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 5. Rollback khi lỗi ghi DB nội bộ

### Giải thích chi tiết nội bộ

- Nhánh xử lý ngoại lệ quan trọng nhất của Saga Orchestration.
- Trình điều phối (Orchestrator) chịu trách nhiệm kích hoạt compensation.
- Kiểm thử unit test mock DB connection của Order để kích hoạt khối try/catch gọi release API của Catalog.

---

## Slide 32. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 6. Bồi hoàn kho khi Transaction bị từ chối lúc Commit

### Giải thích chi tiết nội bộ

- Xử lý lỗi ở chặng cam kết cuối cùng.
- Khi database commit bị lỗi, exception filter bắt ngoại lệ và trigger compensating call.

---

## Slide 33. Một số kết quả kiểm thử quan trọng của Orchestration Saga - 6. Bồi hoàn kho khi Transaction bị từ chối lúc Commit (Duplicate)

### Giải thích chi tiết nội bộ

- Slide duplicate từ Slide 32 theo đúng bản trình chiếu thực tế.
- Giữ nguyên lời giải thích và củng cố thêm tính an toàn của chốt chặn giao dịch.

---

## Slide 34. Kiểm thử Order Service & trực quan hóa qua Allure Report

### Giải thích chi tiết nội bộ

Slide này dùng để chứng minh Order service có test coverage theo các nhóm hành vi cốt lõi: Saga/stock consistency, cart/session/submit, payment bridge, order state/KDS và utility/business rules. Không cần đọc hết từng con số nếu thời gian ngắn; chỉ cần nói Order là service trung tâm nên được kiểm thử theo cả business flow lẫn failure path.

Nếu đọc số lượng test trên slide, cần bảo đảm số từ Allure hiện tại đã được reconcile với artifact thật. Không nói “toàn bộ hệ thống đã được kiểm thử đầy đủ” chỉ vì Order có nhiều test. Đây là bằng chứng mạnh cho service trọng tâm, không phải kết luận tuyệt đối cho toàn bộ API surface.

---

---

## Slide 35. Kiểm thử SaaS Service & trực quan hóa qua Allure Report

### Giải thích chi tiết nội bộ

Slide này cho thấy lớp nền tảng SaaS cũng có kiểm thử: tenant onboarding, subscription/pricing plan, tenant lifecycle, invoice/payment webhook và outbox publisher. Tuy nhiên, theo scope deck hiện tại, SaaS onboarding không phải case study Saga chính. Nếu nói quá sâu ở slide này, bài sẽ lệch khỏi trục Order Confirm Saga và QR-to-Payment.

Cách nói nên là: “Ngoài Order service, em cũng có bằng chứng kiểm thử cho service quản lý nền tảng SaaS. Em không đào sâu luồng này trong phần chính, nhưng nó giúp chứng minh hệ thống không chỉ dừng ở POS UI mà có lớp quản lý tenant/subscription đi kèm.”

---

---

## Slide 36. Vận hành và theo dõi Kafka Cluster qua Kafkio

### Giải thích chi tiết nội bộ

Slide này là runtime/evidence layer, không phải slide lý thuyết Kafka. Dùng Kafkio để cho thấy event streaming có cluster/topic/consumer state có thể quan sát trong môi trường chạy. Bản PDF hiện đang ghi `KAFKA SLUSTER`; trước khi freeze, nên sửa typo thành `KAFKA CLUSTER`.

Không claim “observability đầy đủ” hoặc “production monitoring” từ một màn hình Kafkio. Nói vừa đủ: đây là hiện vật giúp kiểm tra Kafka cluster và luồng event bất đồng bộ trong demo/evidence, bổ sung cho test và architecture diagram.

---

---

## Slide 37. Vận hành và theo dõi dữ liệu Redis qua Redis Insight

### Giải thích chi tiết nội bộ

Slide này chứng minh Redis có trạng thái thật cho session/cart/KDS projection hoặc các key runtime tương ứng. Khi nói KDS, nhấn mạnh Redis tổ chức hàng đợi vận hành bằng Hash/Set/Sorted Set/dedupe/revision; khi nói QR session, nhấn mạnh scope tenant/table/session.

Không gọi Redis là database nguồn cho vòng đời order. Order service vẫn là nguồn trạng thái bền vững của order/bill/session nghiệp vụ; Redis phục vụ hot state, projection hoặc signaling tùy owner. Nếu slide dùng cụm “In-memory DB”, nên giải thích bằng lời là dữ liệu khi vận hành/bộ nhớ trong, không thay thế PostgreSQL/MongoDB của service owner.

---

---

## Slide 38. Demo sản phẩm

### Giải thích chi tiết nội bộ

Demo đi sau phần kiểm chứng chính và không thay thế các bằng chứng kỹ thuật. Flow nên bám đúng trục `QR -> Cart -> Order -> KDS -> Payment`: mở phiên QR, thêm món, submit, POS confirm, KDS nhận ticket, thanh toán và quan sát trạng thái sau settlement.

Nếu demo live lỗi, không hoảng và không cố debug trên sân khấu. Chuyển sang fallback đã chuẩn bị: screenshot flow, Allure/test evidence, state PostgreSQL/Redis/Kafka hoặc video ngắn. Điều quan trọng là demo minh họa hành vi, còn kết luận kỹ thuật đã có lớp evidence trước đó.

---

---

## Slide 39. Kết luận và hướng phát triển của QRTable

### Giải thích chi tiết nội bộ

#### 1. Phân biệt mục tiêu, kết quả và đóng góp

Mục tiêu là điều khóa luận đặt ra; kết quả là những gì hệ thống và quá trình đánh giá thực tế tạo được; đóng góp là giá trị có thể trình bày từ các kết quả đó. Khi Hội đồng hỏi “đóng góp là gì?”, không nên chỉ trả lời “em đã làm app QRTable”. Câu trả lời cần bao gồm mô hình yêu cầu, quyết định kiến trúc, hệ thống hiện thực và bộ bằng chứng kiểm chứng.

#### 2. Ba kết quả đạt được trên slide mới

1. **Luồng POS SaaS từ QR đến thanh toán:** QR là điểm vào tenant/table/session, nối tiếp shared cart, order, KDS và payment.
2. **Ranh giới Microservices rõ:** service ownership, data ownership, tenant isolation và access control được cụ thể hóa bằng kiến trúc, contract và mã nguồn.
3. **Cơ chế trọng tâm có bằng chứng:** consistency, Saga, KDS realtime, payment và bộ bằng chứng đa lớp từ UI, architecture, tests, DB/Redis/Kafka state.

Ba kết quả này phải được nói như ba lớp của cùng một đề tài, không phải ba nhóm tính năng rời rạc.

#### 3. Ba hướng phát triển ưu tiên

- **Đo lường định lượng:** bổ sung load/performance, latency/throughput và availability measurement vì deck hiện chưa có benchmark đủ để kết luận.
- **Triển khai và kiểm chứng thực tế đầy đủ hơn:** public deployment, live payment/provider callback, external smoke và backup/rollback proof trước khi nói production readiness.
- **Củng cố recovery:** durable Saga state, stateful retry, fault injection toàn hệ thống, reconciliation và alerting cho compensation hoặc bridge thất bại.

Hướng phát triển phải được trình bày như bước tiếp theo có cơ sở từ giới hạn đánh giá, không phải danh sách backlog sản phẩm hoặc lời thú nhận hệ thống “chưa làm được gì”.

#### 4. Câu kết quay lại luận đề

Một giao diện POS có thể quen thuộc, nhưng khi đặt trong một nền tảng SaaS đa tenant, có đặt món qua QR và chia theo Microservices, luồng đó tạo ra các bài toán về ownership, access scope, temporal coupling, consistency và recovery. Đó là lý do QRTable có giá trị như một technical case study. Đây là ý cuối cùng cần để Hội đồng nhớ.

### Cẩm nang phản biện

- **Hỏi: Đóng góp nào mang tính nghiên cứu, đóng góp nào mang tính xây dựng?**
  - **Trả lời:** Phân tích actor/state/invariant và thiết kế boundary/cơ chế là phần nghiên cứu–thiết kế; hệ thống QRTable là artifact xây dựng; traceability, tests và state evidence là phần đánh giá. Khóa luận kết hợp cả ba thay vì chỉ bàn lý thuyết hoặc chỉ demo sản phẩm.
- **Hỏi: Kết quả quan trọng nhất là gì?**
  - **Trả lời:** Không phải một màn hình riêng lẻ, mà là việc luồng QR-to-Payment được tổ chức qua các service owner và có cơ chế kiểm soát các điểm rủi ro đại diện như tenant scope, retry, stock compensation, KDS projection và payment replay.
- **Hỏi: Các slide Allure/Kafkio/Redis Insight có đủ để gọi là vận hành production chưa?**
  - **Trả lời:** Chưa. Đây là hiện vật kiểm chứng và quan sát trong phạm vi demo/evidence, bổ sung cho test và architecture. Production readiness cần thêm public deployment, security hardening, monitoring/alerting, backup/rollback và kiểm thử tải.
- **Hỏi: Nếu chưa có benchmark và production hardening thì kết luận có yếu không?**
  - **Trả lời:** Kết luận được giới hạn ở thiết kế, hiện thực và bằng chứng chức năng/kiến trúc trong phạm vi nghiên cứu. Performance/HA/production recovery là hướng đánh giá tiếp theo, không được dùng để phủ nhận các kết quả đã có hoặc để nâng claim vượt bằng chứng.
- **Hỏi: QRTable có phải sản phẩm sẵn sàng thương mại không?**
  - **Trả lời:** Khóa luận không đưa ra kết luận đó. QRTable là prototype/case study kỹ thuật đã hiện thực luồng và cơ chế trọng tâm; thương mại hóa cần thêm benchmark, security hardening, operational recovery và đánh giá sản phẩm/thị trường.

---

## Slide 40. Thank You

### Giải thích chi tiết nội bộ

- Slide kết thúc buổi thuyết trình.
- Cảm ơn Hội đồng và chuẩn bị nhận câu hỏi phản biện.

---

## Backup Q&A. Hoàn tất thanh toán và phiên phục vụ

### Giải thích chi tiết nội bộ

Payment không tự tính lại tổng tiền từ cart hoặc order item. Trước khi tạo VietQR hoặc xác nhận cash, nó gọi Order lấy bill payment snapshot gồm trạng thái, raw total, rounded total và rounding delta, rồi kiểm tra quy tắc làm tròn VND. Điều này giữ Order là nơi sở hữu bill và Payment chỉ chấp nhận một snapshot hợp lệ ở trạng thái `PENDING_PAYMENT`.

Với cash, `PaymentSettlementService` mở transaction, khóa payment theo tenant và bill. Nếu chưa có record, service tạo record; unique constraint và fallback read bảo vệ tình huống hai request đồng thời. Payment chỉ tiếp tục khi record còn `PENDING` và số tiền nhận đủ. Nó cập nhật `PAID`, ghi audit `CASH_CONFIRMED`/`PAYMENT_COMPLETED` và tạo outbox trong cùng transaction. VietQR có bước tạo payment pending và trình bày mã thanh toán; việc xác nhận thực tế đi qua callback/provider flow tương ứng, vì vậy không được nói live SePay đã được kiểm chứng nếu không có bằng chứng provider thật.

Sau khi local transaction Payment commit, service gọi `PaymentOrderGateway.markBillPaid` qua TCP. Nếu lời gọi này lỗi hoặc timeout, gateway ghi warning thay vì rollback payment đã commit. Đây là lý do outbox `payment.completed` và consumer phía Order đóng vai trò đường hội tụ: event hợp lệ được map về cùng command `markPaid`.

Tại Order, `BillService.markPaid` kiểm tra bill thuộc tenant và chỉ chấp nhận `PENDING_PAYMENT` hoặc replay `PAID`. Trong transaction, service khóa bill; nếu đã `PAID`, nó trả trạng thái hiện hành, còn nếu chưa thì lưu payment id, method và paidAt. Sau đó Order đóng durable session, xóa session/cart keys trong Redis và gọi Catalog cập nhật bàn. Luồng ưu tiên chuyển `BILLING → CLEANING`; code có nhánh phục hồi khi bàn vẫn `OCCUPIED` đúng session bằng cách đưa qua `BILLING` rồi `CLEANING`.

Cần diễn đạt chính xác giới hạn giao dịch: Payment record và outbox commit cùng nhau trong Payment DB; bill commit trong Order DB; session cleanup và table update là các bước tiếp theo. Đây không phải một global transaction. Sự an toàn dựa trên local invariants, replay-safe `markPaid`, đường TCP nhanh và Kafka convergence, chứ không phải atomicity xuyên ba service.

#### 1. Vì sao slide này được tổng hợp từ nhiều phần cũ

Bản cũ không dành một main slide riêng cho payment finalization, nhưng logic bị phân tán ở business flow, bảng consistency, phương pháp kiểm chứng, demo và appendix. Khi deck mới rút luồng kỹ thuật thành “từ quét QR đến thanh toán”, payment cần một slide riêng để không làm tiêu đề phần 4 hứa nhiều hơn nội dung thực tế. Vì vậy phần nội bộ phải gom lại toàn bộ tri thức liên quan, không chỉ viết một đoạn bridge ngắn.

#### 2. Hai đường vào, một settlement boundary

Cash và VietQR khác nhau ở cách tạo bằng chứng thanh toán. Cash do staff xác nhận và phải kiểm tra số tiền nhận; VietQR tạo payment pending và mã QR, còn trạng thái hoàn tất phụ thuộc callback/provider flow. Cả hai đều phải đối chiếu với bill snapshot do Order cung cấp và cùng bảo vệ invariant “một bill không có hai payment hoàn tất”. Không được suy luận rằng việc tạo được QR đồng nghĩa provider đã xác nhận giao dịch.

#### 3. Trạng thái sau settlement

Payment chỉ commit payment record, audit và outbox thuộc Payment DB. Order nhận kết quả qua TCP hoặc `payment.completed`, khóa bill và áp dụng replay-safe `markPaid`. Sau đó Order đóng session bền vững, xóa session/cart hot state trong Redis và yêu cầu Catalog chuyển table qua state machine tới `CLEANING`. Các bước sau local bill transaction vẫn có thể lỗi riêng, nên bằng chứng integration phải được dùng để nói đúng mức hội tụ đã kiểm tra.

#### 4. Bằng chứng nên chuẩn bị khi bị hỏi

Có thể trả lời theo bốn lớp: code của `PaymentSettlementService` và `PaymentOrderGateway`; outbox/payment row trong Payment DB; bill/session state ở Order và table state ở Catalog; integration tests của Payment–Order bridge và payment finalization. Demo cash/local evidence là fallback hợp lệ nếu provider thật không sẵn. Chỉ dùng webhook log hoặc live callback làm bằng chứng SePay khi chính lần chạy đó đã được xác minh.

### Cẩm nang phản biện

- **Hỏi: Nếu Payment đã `PAID` nhưng gọi Order bị timeout thì bill có kẹt không?**
  - **Trả lời:** Lời gọi TCP là đường cập nhật nhanh. Payment đồng thời có outbox `payment.completed`; consumer phía Order áp dụng lại `markPaid`. `markPaid` chịu replay, nên event đến sau vẫn có thể đưa bill về trạng thái hội tụ mà không thanh toán lần hai.
- **Hỏi: Điều gì ngăn hai request cash trả cùng một bill?**
  - **Trả lời:** Payment khóa record theo tenant/bill trong transaction, kiểm tra trạng thái `PENDING`, đồng thời có ràng buộc duy nhất ở tầng lưu trữ. Request sau thấy `PAID` và bị từ chối hoặc đi vào replay ở miền Order, không tạo payment thành công thứ hai.
- **Hỏi: Tại sao Payment không cập nhật trực tiếp bill?**
  - **Trả lời:** Bill và state machine của bill thuộc Order. Payment chỉ sở hữu payment record và phát/kích hoạt kết quả thanh toán qua contract; truy cập trực tiếp Order DB sẽ phá service ownership.
- **Hỏi: Khi nào được nói tích hợp SePay đã hoạt động?**
  - **Trả lời:** Chỉ khi có bằng chứng callback thực từ provider, cấu hình xác minh đúng và trace/test tương ứng. Nếu chỉ kiểm thử local/contract, phải nói đúng phạm vi đó.

---
