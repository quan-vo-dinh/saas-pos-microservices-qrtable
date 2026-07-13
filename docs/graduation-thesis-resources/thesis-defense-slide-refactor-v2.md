# QRTable — Slide Bảo Vệ Khóa Luận (REFACTOR v2)

> **Phiên bản:** v2 — Refactor toàn bộ theo narrative 5-ACT
> **Tạo từ:** `thesis-defense-slide-builder-script.md` (bản gốc vẫn được giữ nguyên)
> **Thời lượng mục tiêu:** 10 phút thuyết trình + 5 phút demo (tổng 15 phút)
> **Số slide chính:** 32 slide + Appendix A–S

---

## Nguyên tắc narrative

Mạch dẫn dắt xuyên suốt:

```
Bài toán khó → Tại sao domain này? → 5 bài toán cần giải
→ Quyết định kiến trúc → Giải từng bài toán → Kiểm chứng → Kết luận
```

Mỗi slide phải xuất phát từ câu hỏi của slide trước. Không có slide nào "đứng riêng".

**Giọng điệu:** "Chúng em nghiên cứu bài toán X bằng case study Y và đây là bằng chứng" — không phải "chúng em xây dựng app A với feature B."

---

## Định vị tính mới và đóng góp (đọc trước — không dán lên slide)

> **Hội đồng SẼ hỏi:** "Tính mới của đề tài là gì?" / "Đóng góp chính là gì?" / "Có overengineering không?" / "Ngoài thị trường đã có Sapo, Haravan, iPOS rồi thì đề tài này có gì khác?"

**Cách trả lời đúng — không nói "tôi phát minh thuật toán mới":**

Khóa luận này là **engineering research** — không phải algorithm research. Tính mới nằm ở:

1. **Tính mới về bối cảnh (Contextual novelty):** F&B SaaS multi-tenant với QR-to-payment tại Việt Nam là bối cảnh chưa có kiến trúc tham chiếu đã được kiểm chứng thực nghiệm và công bố công khai. Các sản phẩm như Sapo, Haravan, iPOS là _sản phẩm thương mại_ — không công bố thiết kế kiến trúc nội bộ, ranh giới service, cơ chế consistency hay bằng chứng kiểm thử.

2. **Tính mới về tổ hợp (Combinatorial novelty):** Không phải Saga mới, không phải Outbox mới, không phải Redis KDS mới. Điểm mới là **cách 6 pattern được kết hợp có hệ thống** để giải quyết đồng thời 5 bài toán phân tán trong một case study duy nhất: Bounded Context + Database-per-service (NIST SP 800-145) + Saga Orchestration (Garcia-Molina 1987, Richardson 2018) + Transactional Outbox + Idempotency + Event Notification Pattern (Martin Fowler 2017) + Optimistic Concurrency Control.

3. **Đóng góp về kiến trúc tham chiếu (Reference architecture contribution):** Kết quả của khóa luận là một **thiết kế kiến trúc tham chiếu đã được kiểm chứng thực nghiệm** — có thể được nhóm phát triển khác tái sử dụng, mở rộng hoặc so sánh khi thiết kế hệ thống tương tự.

4. **Đóng góp về phương pháp đánh giá (Evaluation methodology):** Chương 6 xây dựng ma trận đối chiếu yêu cầu kỹ thuật theo chuẩn ISO/IEC 25010:2023, kết hợp kiểm thử tự động đa lớp (unit/contract/integration/E2E) và kiểm thử tải đại diện bằng k6 — tạo ra bộ bằng chứng định lượng và định tính có thể tái tạo.

**Về câu hỏi "overengineering":** Mọi quyết định kiến trúc trong QRTable đều có lý do nghiệp vụ cụ thể _trước_ khi có lý do kỹ thuật. Xem Slide 5 để thấy ánh xạ đầy đủ.

---

## Chuẩn kịch bản thuyết trình

- **Thời lượng mỗi slide:** trung bình 25–30s
- **Không đọc slide:** kịch bản là dàn ý nói, không phải văn bản đọc nguyên văn
- **Câu chuyển:** mỗi kịch bản kết bằng một câu dẫn sang slide tiếp theo
- **Giới hạn phát biểu:** không nói bất kỳ điều nào trong phần "Không nói quá"

---

## Nhãn phần (Section Marker)

| Marker            | Tên phần                            | Slides |
| ----------------- | ----------------------------------- | ------ |
| `00 · BÌA`        | Bìa                                 | 1      |
| `01 · BÀI TOÁN`   | Thiết lập vấn đề & Mục tiêu         | 2–6    |
| `02 · KIẾN TRÚC`  | Kiến trúc tổng thể & Cô lập đa thuê | 7–13   |
| `03 · GIẢI QUYẾT` | Giao dịch phân tán & Realtime KDS   | 14–20  |
| `04 · KIỂM CHỨNG` | Kiểm chứng thực nghiệm đa lớp       | 21–29  |
| `05 · KẾT LUẬN`   | Tổng kết và Hướng phát triển        | 30–32  |

---

---

## Slide 1. Bìa

**Nhãn phần:** `00 · BÌA`

### Dán lên slide

**Tiêu đề:**

> NGHIÊN CỨU VÀ XÂY DỰNG NỀN TẢNG POS THEO MÔ HÌNH SAAS
> TÍCH HỢP ĐẶT MÓN QUA MÃ QR DỰA TRÊN KIẾN TRÚC MICROSERVICES

**Phân rã ý nghĩa đề tài (Visual trên slide):**

- **[Nghiên cứu & Xây dựng]** $\rightarrow$ Nghiên cứu lý thuyết hệ phân tán + Xây dựng prototype kiểm chứng thực nghiệm.
- **[POS SaaS + Đặt món QR]** $\rightarrow$ Case study nghiệp vụ thực tiễn với các bài toán cô lập đa thuê, tranh chấp đồng thời & realtime.
- **[Kiến trúc Microservices]** $\rightarrow$ Giải pháp kiến trúc phân tán được lựa chọn và chứng minh sự đánh đổi.

**Metadata:**

- Võ Đình Minh Quân — 22521193
- GVHD: TS. Nguyễn Thanh Bình
- Khoa Hệ thống Thông tin — Trường Đại học Công nghệ Thông tin — ĐHQG-HCM
- 2026

### Bố cục / hình ảnh

- Nền tối học thuật (dark academic), logo trường góc dưới trái.
- Visual trung tâm: Trực quan hóa 3 khối từ khóa giao thoa bằng sơ đồ Venn hoặc khối liên kết (SaaS POS QR $\leftr\rightarrow$ Microservices $\leftr\rightarrow$ Empirical Research).

### Kịch bản thuyết trình (~35s)

> "Kính thưa Hội đồng, em xin phép trình bày khóa luận tốt nghiệp với đề tài: **'Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices'**.
>
> Tên đề tài này phản ánh sự giao thoa chặt chẽ giữa hai yếu tố: Một là **Case study thực tiễn** — bài toán POS SaaS và đặt món QR đa nhà hàng; hai là **Giải pháp kỹ thuật** — thiết kế kiến trúc Microservices để giải quyết và kiểm chứng các bài toán phân tán cốt lõi phát sinh từ bối cảnh đó. Trọng tâm của đề tài là phần 'Nghiên cứu' — nghĩa là chứng minh các bất biến nghiệp vụ bằng thực nghiệm chứ không chỉ dừng lại ở việc cài đặt ứng dụng thương mại.
>
> Bài trình bày hôm nay của em sẽ lần lượt đi từ các thách thức nghiệp vụ, quyết định kiến trúc, giải pháp chi tiết và cuối cùng là bằng chứng kiểm thử."

### Nguồn

- `thesis-report/frontmatter/cover.tex`

---

## Slide 2. PHẦN I — Đặt Vấn Đề & Mục Tiêu Nghiên Cứu

**Nhãn phần:** `01 · MỞ ĐẦU`

> ⭐ **Slide chuyển phần I.** Đặt nền móng cho động cơ nghiên cứu, tính cấp thiết và phạm vi đề tài.

### Dán lên slide

- **PHẦN I: ĐẶT VẤN ĐỀ & MỤC TIÊU NGHIÊN CỨU**
- **Nội dung chính:**
  1. Trải nghiệm thực tế khi quét mã QR đặt món.
  2. Sự dịch chuyển công nghệ ngành F&B và lý do lựa chọn đề tài.
  3. Xác định mục tiêu thiết kế và phạm vi nghiên cứu của khóa luận.

### Kịch bản thuyết trình (~10s)

> "Sau đây, em xin phép bắt đầu buổi báo cáo với Phần I: Đặt vấn đề và Mục tiêu nghiên cứu của đề tài. Trước hết là góc nhìn thực tế đằng sau một lần quét mã QR đặt món."

### Câu chuyển sang Slide 3

> "Dạ, kính mời Hội đồng cùng nhìn vào trải nghiệm thực tế ở slide tiếp theo."

---

## Slide 3. Hiện trạng quy trình đặt món qua mã QR và thách thức phân tán

**Nhãn phần:** `01 · BÀI TOÁN`

> ⭐ **Slide quan trọng nhất của ACT 1.** Mục tiêu: tạo ngay từ đầu cảm giác "bài toán này phức tạp và thú vị hơn mình nghĩ."

### Dán lên slide

**Tiêu đề:** Phía sau một lần quét QR

**Visual chính — flow 5 bước:**

```
QR Scan
   │
   ▼ [Thách thức ①: Cô lập dữ liệu]
Session + Bàn + Tenant (nhiều nhà hàng trên cùng cloud)
   │
   ▼ [Thách thức ②: Trạng thái chia sẻ đồng thời]
Giỏ hàng chung (nhiều khách cùng bàn cùng thêm món)
   │
   ▼ [Thách thức ③: Nhất quán giao dịch]
Gửi đơn → Trừ kho Catalog → Đẩy bếp (KDS)
   │
   ▼ [Thách thức ④: Đồng bộ realtime]
Màn hình bếp KDS (cập nhật trạng thái tức thời)
   │
   ▼ [Thách thức ⑤: Kết nối dịch vụ ngoài bất đồng bộ]
Đối soát thanh toán (async webhook SePay/VietQR)
```

**Câu hỏi kiến trúc đặt ra:**

> "Nếu xây dựng ứng dụng này bằng kiến trúc Monolith thông thường, chúng ta chỉ cần dùng các giao dịch ACID cục bộ rất đơn giản.
> Nhưng khi nâng tầm thành một **nền tảng vận hành nhà hàng SaaS lớn**, làm sao để thiết kế một hệ thống đáp ứng trọn vẹn 5 thách thức này một cách bền vững ở quy mô platform?"

### Bố cục / hình ảnh

- Flow ngang hoặc dọc 5 bước, mỗi bước có nhãn thách thức nghiệp vụ bằng màu nhấn.
- Chỉ nêu bài toán nghiệp vụ thực tế; đối chiếu nhẹ với sự đơn giản của Monolith.

### Logic cần hiểu

Slide này nêu lên các thách thức nghiệp vụ của một hệ thống đặt món QR SaaS thực tế. Chúng ta đối chiếu ngay: Nếu làm app Monolith đơn lẻ, mọi thứ rất dễ dàng với database duy nhất. Nhưng ở quy mô platform SaaS lớn, khi buộc phải phân tách thành các dịch vụ độc lập, chúng ta mất đi lợi thế transaction ACID và in-memory. 5 thách thức này chính là điểm khởi đầu cho việc đánh đổi kiến trúc.

### Kịch bản thuyết trình (~45s)

> "Nhìn từ phía khách hàng, quét QR và gọi món tại bàn là thao tác rất đơn giản. Và trên thực tế, nếu chỉ xây dựng một ứng dụng đơn lẻ chạy trên kiến trúc Monolith thông thường với một database duy nhất, việc hiện thực cũng cực kỳ đơn giản nhờ sự bảo trợ của các giao dịch database ACID cục bộ và in-memory events.
>
> Tuy nhiên, khi hệ thống được phát triển thành một **nền tảng vận hành nhà hàng SaaS ở quy mô platform**, phục vụ hàng ngàn nhà hàng độc lập, chúng ta buộc phải tách biệt ranh giới dữ liệu và dịch vụ. Sự chia tách này làm chúng ta mất đi các transaction ACID và in-memory đó, phát sinh ra 5 thách thức kỹ thuật lớn: cô lập dữ liệu nhà hàng chéo, tranh chấp giỏ hàng chung của bàn gần realtime, giao dịch nhất quán phân tán để trừ kho khi gửi đơn, đồng bộ sự kiện bếp và đối soát thanh toán bất đồng bộ.
>
> Việc giải quyết các thách thức phân tán này ở quy mô platform chính là bài toán cốt lõi của đề tài."

### Câu chuyển sang Slide 4

> "Vậy tại sao chúng em chọn bối cảnh F&B và đặt món qua QR để thực hiện nghiên cứu này?"

### Nguồn / bằng chứng

- `thesis-report/chapters/01-mo-dau.tex`
- `thesis-report/chapters/03-phan-tich-yeu-cau.tex`

### Không nói quá

- Không nói "bắt buộc phải dùng Microservices để chạy app QR Order thông thường".
- Không nhắc tên công nghệ (Kafka, Redis, Saga) tại slide này.

---

## Slide 4. Động cơ nghiên cứu và xu thế số hóa ngành F&B

**Nhãn phần:** `01 · BÀI TOÁN`

> ⭐ **Slide quan trọng thứ hai — trả lời trước câu hỏi "tính mới ở đâu?" và "tại sao không làm Monolith?"**. Phải thuyết phục hội đồng rằng F&B/QR là một case study kỹ thuật rất giá trị cho hệ phân tán.

### Dán lên slide

**Tiêu đề:** F&B + QR Ordering — Mô hình hóa nghiệp vụ thành 3 trụ cột kỹ thuật phân tán

**Bảng đối chiếu (Đặc thù nghiệp vụ POS SaaS → Thách thức kiến trúc phân tán):**

| Đặc thù nghiệp vụ POS SaaS                                                        | Thách thức kiến trúc phân tán                       | Mô hình giải pháp / Pattern đề xuất                                                    |
| --------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Vận hành đa thuê & Đa tác nhân** (Multi-tenant & Multi-actor)                   | **Cô lập tài nguyên & Phân quyền chéo network**     | NIST SP 800-145 (4-layer context propagation) + Keycloak (gRPC) & Redis Session Guard  |
| **Giao dịch kéo dài & Tranh chấp đồng thời** (Long-running Tx & Cart Concurrency) | **Nhất quán dữ liệu phân tán & Kiểm soát xung đột** | Saga Orchestration (Garcia-Molina) + Outbox + Redis OCC (`cartVersion`) & Idempotency  |
| **Phản hồi tức thời & Tích hợp bất đồng bộ** (Real-time KDS & Payments)           | **Đồng bộ sự kiện thời gian thực & Tích hợp lỏng**  | Event-Driven Architecture (Kafka) + Event Notification Pattern (Fowler WebSocket hint) |

**Thừa nhận khách quan (dán rõ lên slide):**

> "Với một ứng dụng đặt món QR đơn lẻ quy mô nhỏ, Monolith là lựa chọn tối ưu nhất.
> Khóa luận hướng tới mô hình **SaaS POS Platform ở quy mô lớn**, nơi tính độc lập triển khai, cô lập lỗi và phân tách ranh giới dữ liệu buộc chúng ta phải giải quyết các chi phí phân tán."

### Logic cần hiểu

Slide này giúp khái quát hóa (abstract) bối cảnh nghiệp vụ của POS SaaS thành 3 nhóm thách thức kỹ thuật phân tán lớn. Thay vì liệt kê vụn vặt từng tính năng, việc nhóm lại thành 3 trụ cột (SaaS/Security, Transactions/Consistency, Real-time/Events) giúp Hội đồng thấy được tư duy hệ thống và cách chúng ta phân nhóm bài toán khoa học trước khi đi vào giải pháp cụ thể.

### Kịch bản thuyết trình (~50s)

> "Dạ, trước khi đi sâu vào giải pháp, em xin làm rõ mạch tư duy thiết kế của đề tài: với một ứng dụng đặt món thông thường cho một nhà hàng nhỏ, kiến trúc Monolith rõ ràng là tối ưu nhất.
>
> Tuy nhiên, khi xây dựng một **nền tảng SaaS POS toàn diện** hoạt động ở quy mô lớn, chúng em đã mô hình hóa các đặc thù nghiệp vụ F&B/QR thành ba nhóm thách thức kiến trúc phân tán lớn:
>
> Thứ nhất là nhóm **Cô lập tài nguyên và Phân quyền chéo mạng**: phát sinh từ yêu cầu vận hành đa thuê theo chuẩn NIST SP 800-145 và kiểm soát truy cập phân tầng cho nhiều nhóm tác nhân. Thứ hai là nhóm **Nhất quán dữ liệu phân tán và Kiểm soát xung đột**: giải quyết tranh chấp giỏ hàng đồng thời tại bàn bằng cơ chế OCC, và duy trì tính nhất quán khi Catalog và Order là hai service độc lập bằng mô hình Saga. Thứ ba là nhóm **Đồng bộ sự kiện thời gian thực và Tích hợp lỏng**: nhằm đẩy phiếu xuống bếp KDS gần realtime mà không gây quá tải database, đồng thời tích hợp bất đồng bộ với các webhook thanh toán bên ngoài qua Kafka.
>
> Ba nhóm thách thức này chính là cơ sở khoa học để chúng em đề xuất các giải pháp kỹ thuật cụ thể trong phần tiếp theo của khóa luận."

### Câu chuyển sang Slide 5

> "Với bối cảnh và phạm vi nghiên cứu được phân nhóm rõ ràng như vậy, đây là bản đồ phương pháp luận và các bằng chứng thực nghiệm tương ứng của đề tài."

### Nguồn học thuật (nói khi được hỏi)

- **NIST SP 800-145** (Mell & Grance, 2011): định nghĩa multi-tenant SaaS.
- **Garcia-Molina & Salem (1987)**: "Sagas" — ACM SIGMOD.
- **Richardson (2018)** "Microservices Patterns": Transactional Outbox, Saga Orchestration.
- **Fowler (2017)** "What do you mean by Event-Driven?": Event Notification Pattern.

### Không nói quá

- Không nói "chỉ có microservices mới chạy được QR Order".
- Không claim các sản phẩm thương mại hiện tại (Sapo, iPOS) chạy dở vì dùng monolith (họ chạy rất tốt, chỉ là họ không công bố tài liệu thiết kế nội bộ để nghiên cứu học thuật).

### Q&A phản biện

**Q: "Nếu monolith làm được QR Order tốt hơn, tại sao em cố tình làm khó bằng Microservices?"**

> "Dạ đúng, với một nhà hàng đơn lẻ, monolith giúp tránh toàn bộ phức tạp của hệ phân tán. Nhưng ở góc độ nghiên cứu học thuật, khóa luận muốn xây dựng một **kiến trúc tham chiếu đã được kiểm chứng thực nghiệm** cho các hệ thống SaaS POS quy mô platform. Ở quy mô này, các module như KDS hay thanh toán cần được deploy độc lập, cô lập lỗi (nếu thanh toán sập thì khách vẫn xem được thực đơn), và phân tách ownership dữ liệu giữa các team. Do đó, việc áp dụng Microservices ở đây là một quyết định nghiên cứu có chủ ý nhằm đối mặt và giải quyết các chi phí phân tán."

**Q: "Tại sao lại chọn F&B và đặt món qua QR để làm case study nghiên cứu hệ phân tán mà không phải là E-commerce, Bán lẻ (Retail), hay các lĩnh vực khác?"**

> "Dạ, có ba lý do kỹ thuật chính để chọn F&B/QR làm case study nghiên cứu hệ phân tán:
>
> 1. **Tính chất đồng thời tại bàn (Shared Cart Concurrency):** Khác với retail hay e-commerce (nơi mỗi người dùng có một giỏ hàng cá nhân độc lập), F&B/QR yêu cầu nhiều khách ngồi cùng bàn cùng thao tác trên một giỏ hàng chung gần realtime. Đây là bối cảnh lý tưởng để nghiên cứu race condition và cơ chế Optimistic Concurrency Control ở tầng ứng dụng.
> 2. **Luồng nghiệp vụ phân tán dài và rõ rệt:** Quy trình từ Order -> Catalog (Stock) -> Kitchen (KDS) -> Payment là một chuỗi ranh giới dịch vụ (Bounded Contexts) độc lập về dữ liệu nhưng liên kết chặt chẽ về vận hành. Sự tách biệt này tự nhiên sinh ra bài toán Saga Transaction, Outbox và Eventual Consistency một cách rõ ràng nhất mà không cần cố tình bẻ cong nghiệp vụ.
> 3. **Yêu cầu realtime KDS cực đoan:** Bếp nhà hàng hoạt động theo thời gian thực và chịu áp lực thời gian ra món (SLA). Nó yêu cầu cơ chế đồng bộ realtime cực nhẹ (WebSocket hint/refetch) để tránh quá tải database do polling ở giờ cao điểm - một đặc thù rất ít thấy ở retail thông thường."

---

## Slide 5. Mục tiêu & Phạm vi nghiên cứu

**Nhãn phần:** `01 · BÀI TOÁN`

> ⭐ **Slide "bản đồ khoa học" cốt lõi của ACT 1.** Định hình rõ mục tiêu nghiên cứu và giới hạn phạm vi đề tài theo đúng chuẩn học thuật, đồng thời ánh xạ trực tiếp từ lý thuyết đến thực nghiệm.

### Dán lên slide

**Tiêu đề:** Mục tiêu & Phạm vi nghiên cứu đề tài

**1. Mục tiêu cốt lõi (Research Objectives):**

- Xây dựng và thực nghiệm **kiến trúc tham chiếu** cho nền tảng SaaS POS đa thuê dựa trên Microservices.
- Kết hợp có hệ thống các pattern để giải quyết tối ưu các chi phí phân tán phát sinh.

**2. Ánh xạ từ Cơ sở lý thuyết đến Bằng chứng kiểm chứng:**

| Bài toán nghiệp vụ       | Cơ sở lý thuyết áp dụng                    | Bằng chứng thực nghiệm (Evidence)                                |
| ------------------------ | ------------------------------------------ | ---------------------------------------------------------------- |
| **Cô lập tenant**        | NIST SP 800-145 (Multi-tenancy)            | Suite kiểm thử cô lập & `TenantGuard`                            |
| **Kiểm soát truy cập**   | OWASP ASVS & RFC 7519 (JWT)                | Phân tầng danh tính Staff (RBAC) vs. Customer (Session)          |
| **Nhất quán chéo DB**    | Saga (Garcia-Molina) & Outbox (Richardson) | 6 Invariants test suite (race condition, rollback, compensation) |
| **Đồng bộ Bếp realtime** | Event Notification Pattern (Fowler 2017)   | Runtime KDS projection (Redis Sorted Set) & WebSocket hint       |
| **Đối soát thanh toán**  | Transactional Outbox (Richardson 2018)     | Integration test tích hợp SePay webhook với Order lifecycle      |

**3. Giới hạn phạm vi (Scope & Limitations):**

- **Nghiên cứu kỹ thuật:** Tập trung nghiên cứu thực nghiệm thiết kế hệ thống; không đánh giá mô hình kinh doanh.
- **Môi trường thực nghiệm:** Kiểm chứng tính đúng đắn của giải pháp thiết kế; chưa thương mại hóa trên môi trường thực tế.
- **Trọng tâm phân tích:** Saga phân tích sâu tại luồng xác nhận đơn hàng; các luồng khác kiểm chứng ở mức tích hợp.

### Bố cục / hình ảnh

- Chia slide làm hai phần rõ rệt: Phần trên là bảng Ánh xạ (Mục tiêu -> Cơ sở -> Bằng chứng), phần dưới là hộp cảnh báo (Callout box) nổi bật nêu rõ "Giới hạn phạm vi" để chặn trước các câu hỏi phản biện ngoài phạm vi kỹ thuật.
- Sử dụng các biểu tượng khoa học: Chìa khóa (Cơ sở), Kính hiển vi (Bằng chứng), Vạch ranh giới (Giới hạn).

### Logic cần hiểu

Slide này giúp Hội đồng thấy ngay lập tức tính chuẩn mực học thuật của khóa luận thông qua việc xác định rõ **Mục tiêu & Phạm vi** ngay ở Act 1. Bằng cách trình bày theo mô hình **Mục tiêu — Cơ sở — Bằng chứng**, chúng ta trực tiếp chỉ ra: mọi mục tiêu đề xuất đều có cơ sở lý thuyết đi trước và có bằng chứng code/test thực nghiệm đi sau, không nói suông. Đồng thời, việc tự đặt ra "Giới hạn phạm vi" giúp khoanh vùng câu hỏi phản biện của thầy cô vào đúng chuyên môn kỹ thuật phần mềm.

### Kịch bản thuyết trình (~45s)

> "Kính thưa Hội đồng, để giải quyết các thách thức vận hành phân tán của mô hình SaaS POS dưới góc nhìn khoa học, khóa luận của em đặt ra hai **Mục tiêu cốt lõi**: Một là xây dựng kiến trúc tham chiếu cho nền tảng SaaS POS đa thuê; Hai là kết hợp các thiết kế chuẩn để giải quyết triệt để các chi phí phân tán phát sinh.
>
> Phương pháp thực hiện của đề tài được tổ chức chặt chẽ theo mạch liên kết từ **Cơ sở lý thuyết đến Bằng chứng kiểm chứng**:
>
> Cụ thể, đối với bài toán cô lập tenant, cơ sở thiết kế là NIST SP 800-145 và được chứng minh bằng suite kiểm thử cô lập tự động. Về kiểm soát truy cập, chúng em dựa trên chuẩn bảo mật OWASP ASVS để thiết lập bộ lọc phân tầng. Với giao dịch phân tán, chúng em áp dụng lý thuyết Saga của Garcia-Molina và kiểm chứng thành công bằng bộ test suite phủ 6 invariants cốt lõi. Luồng realtime của bếp áp dụng Event Notification của Fowler và kiểm chứng qua KDS Redis projection. Cuối cùng, luồng đối soát thanh toán áp dụng Outbox của Richardson và kiểm chứng qua tích hợp SePay webhook.
>
> Chúng em cũng xác định rõ giới hạn phạm vi đề tài: đây là nghiên cứu thực nghiệm về mặt thiết kế kỹ thuật, không đánh giá mô hình lợi nhuận kinh doanh, và tập trung phân tích sâu cơ chế Saga ở luồng xác nhận đơn hàng."

### Câu chuyển sang Slide 6

> "Với định vị mục tiêu và phạm vi nghiên cứu như vậy, sau đây em xin trình bày về quyết định kiến trúc cốt lõi của hệ thống: Tại sao chúng em quyết định chọn Microservices và chấp nhận các chi phí phân tán này?"

### Nguồn

- `thesis-report/chapters/01-mo-dau.tex`
- `docs/testing/traceability-matrix.md`
- References: NIST SP 800-145, RFC 7519, OWASP ASVS, Garcia-Molina 1987, Fowler 2017, Richardson 2018

---

## Slide 6. Cơ sở lý thuyết và các Tiêu chuẩn thiết kế quy chuẩn

**Nhãn phần:** `01 · BÀI TOÁN`

> ⭐ **Slide nền tảng khoa học.** Định vị rõ ràng các cơ sở lý thuyết, bài báo khoa học và tiêu chuẩn kỹ thuật quốc tế làm nền tảng chứng minh tính đúng đắn và quy chuẩn của thiết kế tham chiếu.

### Dán lên slide

- **Mô hình định nghĩa SaaS Cloud:**
  - Tiêu chuẩn **NIST SP 800-145** (Mell & Grance, 2011) định nghĩa thuộc tính phân phối dịch vụ đám mây.
  - Tài liệu của **Microsoft Azure Architecture Center** về chiến lược cô lập dữ liệu đa thuê (Tenant Isolation).
- **Kiến trúc Microservices:**
  - Nguyên lý ranh giới ngữ cảnh giới hạn (Bounded Context) theo **Sam Newman (2021)** & **Martin Fowler**.
  - Mẫu hình **Database-per-service** theo **Chris Richardson (2018)**.
- **Nhất quán phân tán & An toàn:**
  - **Saga Pattern** theo nghiên cứu của **Garcia-Molina & Salem (1987)**.
  - Mẫu thiết kế **Transactional Outbox** (Chris Richardson, 2018) triệt tiêu lỗi ghi kép (dual-write).
- **Giao tiếp & Bảo mật hệ thống:**
  - Giao thức WebSocket tuân thủ tiêu chuẩn **RFC 6455**.
  - Cơ chế xác thực JSON Web Token tuân thủ **RFC 7519**.
  - Phân quyền truy cập (RBAC) thiết kế dựa trên khung bảo mật **OWASP ASVS**.
- **Bằng chứng thực nghiệm:** Được kiểm chứng qua Allure E2E (lỗi 0.00% dưới tải k6) và được đo lường, phân vết qua ma trận giám sát (Prometheus, Grafana, OpenTelemetry Tempo).

### Kịch bản thuyết trình (~45s)

> "Dạ thưa Hội đồng, để đảm bảo thiết kế tham chiếu của đề tài là đúng đắn và quy chuẩn, chúng em tuân thủ nghiêm ngặt các quy chuẩn kỹ thuật quốc tế và các mẫu thiết kế đã được chứng minh khoa học.
>
> Cụ thể, về mô hình SaaS, chúng em dựa trên tiêu chuẩn NIST SP 800-145 và hướng dẫn của Microsoft Azure để cô lập tenant. Về Microservices, ranh giới dịch vụ tuân thủ nguyên lý Bounded Context của Sam Newman và Database-per-service của Richardson. Luồng nhất quán chéo dịch vụ áp dụng lý thuyết Saga của Garcia-Molina năm 1987 và Outbox pattern. Giao tiếp thời gian thực tuân thủ RFC 6455 và JWT RFC 7519, phân quyền theo OWASP ASVS. Mọi thiết kế này đều vượt qua ma trận kiểm thử tự động, đạt tỷ lệ lỗi 0.00% dưới tải thực tế của k6 và được phân vết qua Prometheus, Grafana và Tempo."

### Câu chuyển sang Slide 7

> "Với cơ sở khoa học và quy chuẩn vững chắc làm nền tảng, em xin phép trình bày chi tiết về phần giải pháp thiết kế kiến trúc hệ thống và cơ chế cô lập dữ liệu đa thuê ở phần tiếp theo."

---

# ACT 2 — QUYẾT ĐỊNH KIẾN TRÚC

---

## Slide 7. PHẦN II — Kiến Trúc Tổng Thể & Cơ Chế Cô Lập Đa Thuê

**Nhãn phần:** `02 · THIẾT KẾ`

> ⭐ **Slide chuyển phần II.** Bắt đầu chương giải pháp thiết kế kiến trúc hệ thống và cơ chế an toàn dữ liệu đa đơn vị thuê.

### Dán lên slide

- **PHẦN II: KIẾN TRÚC TỔNG THỂ & CƠ CHẾ CÔ LẬP ĐA THUÊ**
- **Nội dung chính:**
  1. Lý do đánh đổi Monolith lấy kiến trúc Microservices.
  2. Ranh giới dịch vụ và mô hình giao tiếp phân tầng trong hệ thống.
  3. Giải pháp truyền dẫn ngữ cảnh 4 lớp cô lập dữ liệu (Tenant Isolation).
  4. Cơ chế xác thực tích hợp Keycloak JWT và Session đặt món.

### Kịch bản thuyết trình (~10s)

> "Tiếp theo, em xin phép trình bày Phần II của khóa luận: Thiết kế kiến trúc tổng thể và các cơ chế cô lập dữ liệu đa thuê trong hệ thống QRTable."

### Câu chuyển sang Slide 8

> "Trước hết, em xin giải thích lý do vì sao đề tài quyết định lựa chọn mô hình kiến trúc Microservices ở slide tiếp theo."

---

## Slide 8. Phân tích lựa chọn mô hình kiến trúc Microservices

**Nhãn phần:** `02 · KIẾN TRÚC`

### Dán lên slide

**Tiêu đề:** Lựa chọn Microservices — Quyết định dựa trên đặc điểm nghiệp vụ, không phải hype

**Luồng lập luận (4 khối — phải thể hiện rõ trên slide):**

```
Đặc điểm nghiệp vụ POS SaaS: 7 domain, nhịp thay đổi khác nhau
   (Lewis & Fowler 2014: "Microservices: decompose around business capabilities")
        ↓
Yêu cầu tách ranh giới trách nhiệm và data ownership
   (Richardson 2018: "Database per service pattern")
        ↓
Kiến trúc Microservices (7 service, Nx monorepo)
        ↓
Chi phí phân tán → phải giải bằng 5 cơ chế (ACT 3)
```

**Bảng đánh đổi — LÝ DO NGHIỆP VỤ trước, lý do kỹ thuật sau:**

| Đặc điểm nghiệp vụ (lý do chọn)                               | Chi phí kỹ thuật (phải xử lý)                |
| ------------------------------------------------------------- | -------------------------------------------- |
| Thực đơn, đơn hàng, bếp có quy tắc thay đổi riêng             | Giao tiếp qua hợp đồng, không shared DB      |
| Nhiều nhà hàng — cô lập dữ liệu là bắt buộc (NIST SP 800-145) | Tenant context phải propagate end-to-end     |
| KDS và ordering có SLA và tốc độ đọc/ghi khác nhau            | Eventual consistency — không dùng ACID chung |
| Thanh toán có quy trình đối soát riêng                        | Saga + Outbox để phối hợp cross-service      |

**Câu kết (đặt to trên slide):**

> "Monolith đơn giản hơn khi bắt đầu. Microservices phù hợp hơn khi bài toán có nhiều domain với trách nhiệm và nhịp thay đổi khác nhau — và khi tính cô lập tenant là yêu cầu bắt buộc."

### Logic cần hiểu

Đây là slide trả lời câu hỏi "Tại sao không dùng Monolith?" một cách có học thuật. Mỗi lý do đều có căn cứ nghiệp vụ _trước_, sau đó mới kéo theo lý do kỹ thuật. Không bao giờ nói "vì microservices là hot" hay "để học công nghệ".

### Kịch bản thuyết trình (~45s)

> "Quyết định dùng microservices xuất phát từ đặc điểm nghiệp vụ, không phải xu hướng. Lewis và Fowler (2014) định nghĩa microservices là kiến trúc phân rã theo business capability — mỗi service chịu trách nhiệm một miền nghiệp vụ rõ ràng. QRTable có 7 miền như vậy, với nhịp thay đổi và quy tắc khác nhau: thực đơn/bàn thay đổi ít, đơn hàng thay đổi thường xuyên, KDS cần throughput cao, thanh toán cần audit trail chặt. Gom chung các miền này vào monolith không sai, nhưng sẽ làm mờ ranh giới trách nhiệm và khó scale từng phần độc lập.
>
> Quan trọng hơn, NIST SP 800-145 định nghĩa multi-tenant SaaS yêu cầu cô lập tài nguyên giữa các tenant. Trong monolith, cô lập này phải được thực thi hoàn toàn bằng code — dễ vi phạm khi team lớn. Microservices giúp ranh giới đó rõ ràng hơn về mặt tổ chức code.
>
> Tuy nhiên, quyết định này không miễn phí. Mỗi ranh giới service tạo ra chi phí: không có ACID chung, tenant context phải propagate, consistency phải xử lý từng luồng. Đó là lý do ACT 3 của bài trình bày sẽ đi vào từng cơ chế giải quyết."

### Nguồn học thuật (nói khi được hỏi)

- **Lewis & Fowler (2014)** "Microservices" — martinfowler.com: business capability decomposition
- **Newman (2021)** "Building Microservices" (2nd ed.): data ownership principles
- **Richardson (2018)** "Microservices Patterns": Database-per-service pattern
- **NIST SP 800-145**: multi-tenant resource isolation
- **ISO/IEC 25010:2023**: maintainability + modifiability — quality attributes hỗ trợ quyết định

### Không nói quá

- Không khẳng định microservices luôn tốt hơn monolith trong mọi bối cảnh
- Không claim performance benchmark nếu chưa có số đo so sánh

### Q&A phản biện — câu hỏi khó nhất

**Q: "Em có đang overengineering không? Monolith đơn giản hơn tại sao không dùng?"**

> "Dạ, monolith đơn giản hơn khi bắt đầu — và nếu chỉ có một nhà hàng, monolith là lựa chọn tốt hơn. Nhưng QRTable có hai ràng buộc làm cho microservices phù hợp hơn: thứ nhất là multi-tenant SaaS — nhiều nhà hàng độc lập trên cùng nền tảng, cô lập dữ liệu là yêu cầu bắt buộc; thứ hai là 7 miền nghiệp vụ có nhịp thay đổi và SLA khác nhau — Catalog, Kitchen và Payment cần được scale và deploy độc lập. Lựa chọn microservices không phải để tạo ra thêm vấn đề — mà để làm rõ ranh giới trách nhiệm và hỗ trợ cô lập tenant theo thiết kế."

**Q: "Tại sao không dùng modular monolith thay vì microservices?"**

> "Modular monolith là lựa chọn tốt khi team nhỏ và chưa chắc về ranh giới domain. QRTable chọn microservices vì: (1) ranh giới domain đã được xác định rõ theo Bounded Context; (2) cô lập tenant phải được enforce từ infrastructure, không chỉ từ code structure; (3) mục tiêu nghiên cứu của khóa luận là kiểm chứng cơ chế phân tán — modular monolith sẽ không tạo ra đủ bài toán để nghiên cứu Saga, Outbox hay Event Notification Pattern."

---

## Slide 9. Mô hình kiến trúc tổng thể của hệ thống

**Nhãn phần:** `02 · KIẾN TRÚC`

### Dán lên slide

**Tiêu đề:** Kiến trúc tổng thể QRTable — 4 tầng, 7 domain services

**Bảng tầng:**

| Tầng                | Thành phần                                                            |
| ------------------- | --------------------------------------------------------------------- |
| **Client**          | Management App (staff/owner/admin) · Customer PWA (khách tại bàn)     |
| **BFF/API Gateway** | HTTP REST · WebSocket · Guard chain · TCP/gRPC clients                |
| **Domain Services** | Catalog · Order · Kitchen · Payment · SaaS · User-Access · Authorizer |
| **Infrastructure**  | PostgreSQL/MongoDB (per-service) · Redis · Kafka · Keycloak · SePay   |

**Luận điểm chính:** BFF không sở hữu database nghiệp vụ. Trạng thái thuộc service owner.

### Kịch bản thuyết trình (~45s)

> "Kính thưa Hội đồng, để hiện thực hóa các mục tiêu đã đề ra, đây là sơ đồ kiến trúc tổng thể của nền tảng QRTable được thiết kế phân tầng theo mô hình 4 lớp độc lập.
>
> Tầng trên cùng là các Client ứng dụng phục vụ nhân viên quản lý và khách hàng quét QR tại bàn. Mọi giao tiếp từ Client bắt buộc phải đi qua tầng BFF Gateway. BFF đóng vai trò là chốt chặn bảo mật duy nhất tại biên, chịu trách nhiệm xác thực, phân quyền và điều phối yêu cầu. Một điểm mấu chốt ở đây là BFF hoàn toàn không sở hữu database nghiệp vụ và không chứa business logic phức tạp; nó chỉ chuyển giao các yêu cầu thông qua kết nối TCP hoặc gRPC vào tầng thứ ba là Domain Services gồm 7 dịch vụ độc lập.
>
> Mỗi dịch vụ tại tầng này là một 'Bounded Context' khép kín, tự sở hữu hoàn toàn cơ sở dữ liệu PostgreSQL hoặc MongoDB tương ứng của nó ở tầng Hạ tầng phía dưới. Thiết kế phân tầng này đảm bảo tính đóng gói dữ liệu và là cơ sở để thực thi ranh giới trách nhiệm giữa các dịch vụ."

### Bố cục / hình ảnh

- Dùng `thesis-report/assets/figures/chapter4-overall-architecture.png` hoặc vẽ 4-layer diagram
- Highlight 7 domain services
- Mũi tên solid = command/query; dashed = event/hint

### Nguồn

- `thesis-report/assets/figures/chapter4-overall-architecture.png`
- `AGENTS.md`

---

## Slide 10. Ranh giới dịch vụ và Quyền sở hữu dữ liệu

**Nhãn phần:** `02 · KIẾN TRÚC`

### Dán lên slide

**Tiêu đề:** Ranh giới dịch vụ và quyền sở hữu dữ liệu

| Service         | Dữ liệu sở hữu                       | Trách nhiệm kiến trúc                       |
| --------------- | ------------------------------------ | ------------------------------------------- |
| **Catalog**     | Menu · Category · Table · QR · Stock | Service DUY NHẤT ghi tồn kho                |
| **Order**       | Session · Cart · Order · Bill        | Chủ vòng đời đơn hàng end-to-end            |
| **Kitchen**     | KDS runtime projection (Redis)       | Không có DB bền vững trong phạm vi hiện tại |
| **Payment**     | Payment record · Audit log · Outbox  | Chủ trạng thái đối soát thanh toán          |
| **SaaS**        | Tenant · Plan · Subscription         | Chủ vòng đời tenant                         |
| **User-Access** | Profile · Roles · Permissions        | Chủ dữ liệu phân quyền                      |
| **Authorizer**  | Kiểm tra JWT/OIDC                    | Xác thực tập trung qua gRPC                 |

**Quy tắc bất biến:** `Không import entity/repository của service khác để đọc/ghi DB trực tiếp.`

### Kịch bản thuyết trình (~45s)

> "Sau khi xác định kiến trúc tổng thể, câu hỏi tiếp theo là làm thế nào để bảo vệ tính toàn vẹn của dữ liệu chéo dịch vụ? Ranh giới dịch vụ và quyền sở hữu dữ liệu chính là câu trả lời.
>
> Để tránh việc các dịch vụ gọi chéo database của nhau - vốn là lỗi thiết kế phổ biến nhất khiến hệ phân tán biến thành một 'khối hỗn hợp phân tán' (distributed monolith) - chúng em áp dụng nguyên lý Database-per-service một cách triệt để. Mỗi dịch vụ chỉ quản lý một miền dữ liệu duy nhất và chịu trách nhiệm tuyệt đối về miền dữ liệu đó.
>
> Cụ thể, Catalog là dịch vụ duy nhất có quyền ghi nhận tồn kho món ăn; Order kiểm soát toàn bộ vòng đời đơn hàng và giỏ đặt món. Dịch vụ Kitchen hoàn toàn không có cơ sở dữ liệu bền vững để tăng tốc độ ghi đọc KDS, trạng thái bếp chỉ là một bản chiếu runtime được dựng trên Redis. Và Payment quản lý các bản ghi thanh toán độc lập. Chúng em áp dụng một quy tắc bất biến xuyên suốt thiết kế: không một dịch vụ nào được phép đọc hoặc ghi trực tiếp vào cơ sở dữ liệu của dịch vụ khác. Mọi trao đổi dữ liệu bắt buộc phải đi qua ranh giới API được định nghĩa rõ ràng."

### Nguồn

- `AGENTS.md`
- `thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

### Không nói quá

- Không nói Kitchen có database bền vững
- Không nói database-per-tenant; hiện tại là DB per-service + `tenant_id`

---

## Slide 11. Mô hình giao tiếp hỗn hợp và phân tầng

**Nhãn phần:** `02 · KIẾN TRÚC`

### Dán lên slide

**Tiêu đề:** Mô hình giao tiếp hỗn hợp và phân tầng (Hybrid & Layered Communication)

| Phân tầng / Kênh         | Vai trò kỹ thuật                               | Minh họa công nghệ trong QRTable                              |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------- |
| **HTTP REST**            | Đồng bộ trực tiếp từ client tại biên           | Client PWA / Management App ↔ BFF                            |
| **TCP (NestJS)**         | Gọi đồng bộ nội bộ, độ trễ thấp                | BFF Gateway $\rightarrow$ Order / Catalog Services            |
| **gRPC**                 | Xác thực tập trung với contract chặt chẽ       | BFF Gateway $\rightarrow$ Authorizer Service                  |
| **Kafka (Event-driven)** | Domain Event bất đồng bộ sau commit            | Order (outbox) $\rightarrow$ Kitchen (KDS ticket)             |
| **WebSocket Pub/Sub**    | Truyền tín hiệu gợi ý cập nhật realtime (Hint) | BFF $\rightarrow$ Client KDS (Hint/Refetch API snapshot)      |
| **Webhook (HMAC)**       | Nhận tích hợp callback từ bên thứ ba           | SePay Gateway $\rightarrow$ BFF $\rightarrow$ Payment Service |

**Luận điểm cốt lõi:**

> "Hệ thống không dùng duy nhất một giao thức, mà phân chia kênh giao tiếp theo đặc thù nghiệp vụ để bảo vệ ranh giới sở hữu dữ liệu (service ownership)."

### Kịch bản thuyết trình (~45s)

> "Khi dữ liệu đã được cô lập hoàn hảo trong từng dịch vụ, việc kết nối chúng lại với nhau đòi hỏi một giải pháp đồng bộ và phi đồng bộ có chọn lọc. Quyết định của đề tài là xây dựng **Mô hình giao tiếp hỗn hợp và phân tầng (Hybrid & Layered Communication Model)**.
>
> Chúng em không áp dụng duy nhất một giao thức cho toàn bộ hệ thống, mà lựa chọn kênh giao tiếp dựa trên đặc thù nghiệp vụ. Đối với các tương tác trực tiếp yêu cầu kết quả tức thời, hệ thống sử dụng HTTP REST tại biên và TCP NestJS nội bộ để đạt độ trễ thấp nhất. gRPC được ưu tiên riêng cho Authorizer Service nhằm phục vụ xác thực tập trung với hợp đồng dữ liệu chặt chẽ (strongly-typed).
>
> Ngược lại, đối với các tác vụ xử lý bất đồng bộ sau khi giao dịch gốc đã commit thành công, hệ thống chuyển sang giao tiếp phi tập trung qua Kafka Message Broker bằng các Domain Events. Về phía client, để cập nhật trạng thái bếp realtime, chúng em dùng cơ chế WebSocket hint-and-refetch, chỉ phát đi một tín hiệu gợi ý nhỏ để client tự gọi API lấy dữ liệu mới, giúp giảm tải tối đa băng thông đường truyền. Nguyên tắc xuyên suốt là: không một kênh giao tiếp nào được phép phá vỡ ranh giới sở hữu dữ liệu đã thiết lập."

### Nguồn

- `thesis-report/assets/figures/chapter4-communication-topology.png`
- `thesis-report/chapters/01-mo-dau.tex` (Đóng góp thứ ba)
- `thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex` (Đóng góp thứ ba)

### Không nói quá

- Không nói WebSocket là nguồn trạng thái đúng
- Không nói Kafka thay thế TCP cho mọi giao tiếp nội bộ

---

# ACT 3 — GIẢI QUYẾT 3 NHÓM BÀI TOÁN PHÂN TÁN

---

## NHÓM A: TENANT ISOLATION & ACCESS CONTROL

---

## Slide 12. Multi-Tenant Isolation — Lựa chọn mô hình & Cơ chế thực thi

**Nhãn phần:** `03 · GIẢI QUYẾT`

### Dán lên slide

**Tiêu đề:** Cô lập đa thuê (Multi-tenancy Isolation) — Lựa chọn mô hình & Cơ chế thực thi

**1. Đối chiếu 3 mô hình cô lập dữ liệu SaaS:**

- **Silo Model (Database-per-tenant):** Mỗi tenant sở hữu database riêng. Cô lập vật lý tuyệt đối nhưng chi phí tài nguyên và bảo trì schema tăng tuyến tính.
- **Bridge Model (Schema-per-tenant):** Chung database instance, phân tách bằng logic schema riêng.
- **Pool Model (Shared-database, Shared-schema):** Chung database và bảng biểu, phân tách dòng dữ liệu bằng cột `tenant_id`.
  - _Lựa chọn của QRTable:_ **Pool Model** để tối ưu hóa tài nguyên phần cứng và quản lý schema tập trung cho 7 microservices.

**2. Cơ chế thực thi cô lập 4 lớp (4-layer context propagation):**

```
① Biên hệ thống: Xác định danh tính tự động (JWT cho Staff / Session cho Customer).
                  Tuyệt đối KHÔNG tin cậy tenant_id truyền lên từ body/query request.
② BFF Gateway: Đối chiếu chéo thông tin danh tính với metadata của phiên gọi món để chặn đứng
               yêu cầu sai lệch tenant ngay tại biên.
③ Mạng nội bộ: Tự động inject tenant_id đã được làm sạch vào header TCP / Kafka event payload.
④ Điểm sử dụng: Repository/service của domain owner áp dụng explicit tenant_id predicate
                cho mọi query tenant-scoped, đồng thời Redis/WebSocket room được phân vùng theo tenant.
```

### Bố cục / hình ảnh

- Bảng so sánh nhanh 3 mô hình (Silo, Bridge, Pool) với nhãn tick chọn Pool Model cho QRTable.
- Sơ đồ dòng chảy truyền dẫn tenant context qua 4 bước (BFF -> Domain Service -> Database/Redis).

### Logic cần hiểu

QRTable không tự phát minh ra phương pháp cô lập mới mà lựa chọn mô hình **Pool Model** vì tính kinh tế và khả năng vận hành trong microservices. Tuy nhiên, điểm yếu lớn nhất của Pool Model là nguy cơ rò rỉ chéo dữ liệu (cross-tenant data leak) ở tầng ứng dụng. Để khắc phục triệt để, hệ thống hiện thực cơ chế truyền dẫn ngữ cảnh tự động qua 4 lớp, đảm bảo lập trình viên không cần viết thủ công `WHERE tenant_id` trong code nghiệp vụ, tránh sai sót con người.

### Kịch bản thuyết trình (~45s)

> "Kính thưa Hội đồng, đối với bài toán cô lập dữ liệu đa thuê trong mô hình SaaS theo chuẩn NIST SP 800-145, trên thế giới có ba mô hình phổ biến là Silo, Bridge và Pool.
>
> Với QRTable, chúng em quyết định lựa chọn mô hình **Pool Model** - tức là dùng chung cơ sở dữ liệu và bảng biểu, phân tách bằng cột `tenant_id`. Quyết định này giúp tối ưu hóa chi phí vận hành hạ tầng và đơn giản hóa quá trình đồng bộ hóa schema cho 7 dịch vụ vi dịch vụ.
>
> Tuy nhiên, điểm yếu cốt lõi của Pool Model là rủi ro rò rỉ dữ liệu chéo giữa các nhà hàng do sai sót khi viết code. Để triệt tiêu rủi ro này, chúng em xây dựng cơ chế thực thi cô lập tự động qua 4 lớp: Thứ nhất, xác định tenant ngay tại biên từ danh tính JWT hoặc phiên quét QR, không nhận qua body request. Thứ hai, đối chiếu chéo tại BFF Gateway để chặn yêu cầu sai lệch. Thứ ba, tự động truyền dẫn tenant_id vào header TCP nội bộ và Kafka event. Và thứ tư, tự động áp dụng bộ lọc SQL thông qua database subscriber và phân vùng key tại Redis/WebSocket. Cơ chế này đảm bảo dữ liệu của các nhà hàng luôn được cô lập an toàn mà không phụ thuộc vào việc lập trình viên có nhớ viết câu lệnh lọc hay không."

### Nguồn học thuật (nói khi được hỏi)

- **NIST SP 800-145** (Mell & Grance, 2011): định nghĩa multi-tenant SaaS.
- **Microsoft Azure — Multitenant storage and data (2026)**: so sánh Silo vs. Pool models.
- **AWS SaaS Factory (2025)**: Tenant isolation patterns on AWS.

### Nguồn code

- `libs/guards/src/lib/tenant.guard.ts`
- `libs/middlewares/src/lib/tenant.middleware.ts`
- `thesis-report/assets/figures/chapter4-multi-tenancy-isolation.png`

### Không nói quá

- Không nói database-per-tenant.
- Không nói toàn bộ API bề mặt đã được kiểm chứng chống cross-tenant trên hệ thống production.

### Q&A phản biện

**Q: "Tại sao không dùng database-per-tenant để cô lập vật lý?"**

> "Dạ, database-per-tenant cho cô lập vật lý tốt nhất nhưng chi phí vận hành tăng tuyến tính theo số tenant — mỗi tenant cần một database của riêng mình. Với QRTable ở giai đoạn bảo luận, shared-table với 4-layer application-level enforcement là đánh đổi hợp lý: đơn giản hóa quản lý schema và migration nhưng vẫn bảo đảm cô lập tại tầng ứng dụng. Microsoft Azure nhấn mạnh shared-table là lựa chọn phổ biến cho SaaS giai đoạn đầu."

---

## Slide 13. Mô hình xác thực — Keycloak JWT và Phiên đặt món QR

**Nhãn phần:** `03 · GIẢI QUYẾT`

> ⭐ **Slide giải trình kiến trúc bảo mật biên.** Làm rõ sự kết hợp giữa giải pháp quản lý định danh chuẩn nghiệp (Keycloak IAM) và cơ chế phiên đặt món ẩn danh tối ưu của khách hàng.

### Dán lên slide

**Tiêu đề:** Mô hình xác thực & phân quyền trong SaaS POS

**1. Hai luồng xác thực song song:**

- **Nhân viên & Quản trị (Staff/Admin Path):**
  - Tích hợp **Keycloak (IAM)** làm trung tâm quản lý định danh.
  - Xác thực qua chuẩn **OAuth 2.0 & OpenID Connect (OIDC)**.
  - Keycloak cấp phát **JWT (JSON Web Token)** đã ký số, chứa quyền hạn (Roles/RBAC) và nhãn đơn vị thuê (`tenant_id`).
- **Khách hàng tại bàn (Customer Path):**
  - Không tạo tài khoản (Stateless) — Xác thực bằng **QR Token** gắn liền với bàn.
  - Phiên làm việc liên kết trực tiếp với **Redis Session Store**.

**2. 5 lớp kiểm soát an toàn theo chiều sâu:**

```
① Authentication (JWT / QR Token) ──→ ② Tenant/Session scope ──→ ③ RBAC (Staff) ──→ ④ Plan Entitlement ──→ ⑤ Data Ownership (Service Core)
```

### Bố cục / hình ảnh

- Trình bày sơ đồ luồng xác thực song song (Staff qua Keycloak, Customer qua QR Token) cùng hội tụ tại BFF Gateway để tạo "Ngữ cảnh tin cậy".
- Minh họa 5 lớp kiểm soát theo mô hình bậc thang đi xuống.

### Logic cần hiểu

Keycloak giải quyết bài toán bảo mật tài khoản cho nhân viên/chủ nhà hàng theo chuẩn an toàn quốc tế (OIDC), giảm thiểu rủi ro tự thiết kế hệ thống bảo mật. Trong khi đó, khách đặt món cần nhanh chóng nên được cấp Token phiên ngắn hạn (Redis session) tránh việc bắt buộc đăng ký tài khoản phiền hà.

### Kịch bản thuyết trình (~45s)

> "Đối với luồng xác thực và phân quyền, hệ thống thiết kế hai tuyến bảo mật song song hội tụ tại BFF:
>
> Tuyến thứ nhất dành cho nhân viên và quản trị viên, được bảo vệ bởi giải pháp quản lý định danh tập trung **Keycloak Server** tuân thủ tiêu chuẩn OAuth 2.0 và OpenID Connect. Khi đăng nhập thành công, Keycloak sẽ cấp phát mã thông báo **JWT** đã ký số hóa chứa các thuộc tính phân quyền RBAC và nhãn đơn vị thuê `tenant_id`.
>
> Tuyến thứ hai dành cho khách hàng tại bàn để tối ưu hóa trải nghiệm. Khách hàng hoàn toàn stateless, không cần đăng ký tài khoản, quyền truy cập được cấp phát tạm thời qua mã **QR Token** và được đối chiếu trực tiếp với Session lưu trữ trong bộ đệm Redis.
>
> BFF Gateway sẽ tiếp nhận và trích xuất hai luồng token này để thiết lập ngữ cảnh tin cậy, sau đó định tuyến qua 5 lớp kiểm soát nghiêm ngặt trước khi đến với các dịch vụ lõi bên trong."

### Nguồn

- `libs/guards/src/lib/user.guard.ts`
- `libs/guards/src/lib/session.guard.ts`
- `docs/architecture/permission-matrix.md`

### Q&A phản biện

**Q: "Tại sao đề tài lại lựa chọn tích hợp giải pháp Keycloak thay vì tự viết mã nguồn xác thực (custom authentication)?"**

> "Dạ, tự thiết kế hệ thống xác thực rất dễ gặp phải các lỗ hổng bảo mật nghiêm trọng liên quan đến hashing, quản lý session và an toàn mã khóa. Keycloak là hệ thống Quản lý định danh (IAM) mã nguồn mở đạt chuẩn công nghiệp, cung cấp sẵn các cơ chế bảo mật tối tân và tuân thủ tuyệt đối các chuẩn OIDC / OAuth 2.0. Việc sử dụng Keycloak giúp hệ thống POS SaaS của đề tài có khả năng cô lập tài khoản theo Realm cực kỳ an toàn mà không cần tốn chi phí phát triển lại bánh xe lịch sử."

**Q: "Khi client gửi Keycloak JWT liên tục lên hệ thống, việc xác thực có gây nghẽn cho Keycloak Server hay không?"**

> "Dạ không. JWT là mã thông báo tự chứa (self-contained). Khi request đi qua BFF Gateway, BFF sử dụng thuật toán ký mã hóa bất đối xứng để xác thực chữ ký của JWT bằng Public Keys lấy từ Keycloak. BFF thực hiện caching các khóa công khai này (JWKS) cục bộ, do đó việc xác thực JWT diễn ra hoàn toàn tức thời tại BFF mà không cần phải thực hiện lời gọi mạng ngược lại Keycloak Server cho mỗi request, giúp tối ưu hóa hiệu năng tối đa."

### Câu chuyển sang Slide 14

> "Thiết lập phân quyền biên bảo vệ ranh giới bảo mật cho từng tenant. Tiếp theo, em xin giới thiệu Phần III của khóa luận, đi sâu vào thiết kế giao dịch phân tán và cơ chế thời gian thực tại bếp."

## Slide 14. PHẦN III — Giao Dịch Phân Tán & Truyền Tải Thời Gian Thực

**Nhãn phần:** `03 · GIẢI QUYẾT`

> ⭐ **Slide chuyển phần III.** Đi sâu vào các giải pháp giải quyết thách thức cốt lõi của hệ phân tán: Nhất quán dữ liệu và Real-time.

### Dán lên slide

- **PHẦN III: GIAO DỊCH PHÂN TÁN & TRUYỀN TẢI THỜI GIAN THỰC**
- **Nội dung chính:**
  1. Các cơ chế nền tảng bảo vệ tính toàn vẹn (Idempotency, Outbox, Deduplication).
  2. Lựa chọn mô hình giao dịch phân tán Saga Orchestration.
  3. Chi tiết luồng thành công và kịch bản bù lỗi (Compensation) của đơn hàng.
  4. Quy trình khởi tạo tài nguyên thuê bao tự động (SaaS Onboarding Saga).
  5. Giải pháp KDS Realtime hiệu năng cao với cơ chế Hint-and-Refetch.

### Kịch bản thuyết trình (~10s)

> "Sau khi đã thiết lập nền tảng kiến trúc và xác thực, em xin phép chuyển sang Phần III: Thiết kế chi tiết các giao dịch phân tán và cơ chế truyền tải thời gian thực bếp."

### Câu chuyển sang Slide 15

> "Để bảo vệ tính toàn vẹn dữ liệu trước khi đi vào các giao dịch phức tạp, chúng em thiết lập 3 cơ chế cơ sở như trình bày ở slide tiếp theo."

---

## Slide 15. Các Primitive bảo vệ tính nhất quán phân tán

**Nhãn phần:** `03 · GIẢI QUYẾT`

### Dán lên slide

**Tiêu đề:** Nhất quán phân tán — 4 primitive nền tảng trước Saga

**Bối cảnh đối chiếu:**

- **Trong Monolith:** Giao dịch chỉ cần 1 database transaction. Concurrency control trên giỏ hàng và retry mạng cực kỳ đơn giản vì mọi trạng thái đều tập trung tại một tiến trình và một database duy nhất.
- **Trong Microservices:** Tách DB làm mất tính ACID chung, đồng thời hệ thống được scale-out (nhiều instance chạy song song). Buộc hệ thống phải tự xây dựng 4 primitive nền tảng để bảo toàn dữ liệu:

| Primitive                        | Tại sao bắt buộc (Microservices / Phân tán)                                  | Áp dụng trong QRTable                                 |
| -------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------- |
| **Idempotency**                  | Tránh trừ kho hai lần khi client retry do đứt kết nối mạng                   | Key `confirm-order:{orderId}` tại Catalog             |
| **Deduplication**                | Tránh chế biến trùng khi Kafka consumer nhận event lặp                       | Kitchen dedup event bằng eventId trong Redis          |
| **Transactional Outbox**         | Đảm bảo lưu trạng thái Order và phát event cùng lúc thành bại                | Order ghi `order.confirmed` cùng lúc commit DB        |
| **Optimistic Concurrency (OCC)** | Tránh ghi đè giỏ hàng chéo (lost update) khi nhiều thiết bị cùng bàn sửa giỏ | Kiểm soát qua `cartVersion` tại Redis (Order Service) |

**Câu chuyển sang Slide 16:**

> "4 primitive này giải quyết các rủi ro về trùng lặp, retry và tranh chấp trạng thái cục bộ, nhưng không tự giải quyết được lỗi một phần (Partial Failure) giữa các DB độc lập. Đó là bài toán của Saga."

### Kịch bản thuyết trình (~45s)

> "Trong monolith, ta không bao giờ cần bận tâm đến các cơ chế xử lý trùng lặp hay xung đột phức tạp vì database local và memory tập trung lo hết. Nhưng trong microservices, do ranh giới database per-service và hệ thống được scale-out nhiều instance, chúng em phải tự tay thiết lập 4 primitive để bảo vệ dữ liệu.
>
> Thứ nhất, Idempotency tại Catalog: Catalog gắn mỗi lệnh trừ kho với một key duy nhất — nếu mạng chập chờn và Order gọi lại, Catalog trả kết quả đã lưu thay vì trừ kho lần hai. Thứ hai, Deduplication tại Kitchen: Kitchen lưu eventId đã xử lý vào Redis, nhận event trùng thì bỏ qua. Thứ ba, Transactional Outbox tại Order: Order ghi trạng thái đơn hàng và event vào DB trong cùng một transaction local, đảm bảo trạng thái đổi thì event chắc chắn được phát.
>
> Và thứ tư, Optimistic Concurrency Control (OCC) cho giỏ hàng dùng chung tại bàn: thay vì dùng khóa phân tán (distributed lock) gây nghẽn, Order Service sử dụng thuộc tính `cartVersion` trong Redis. Khi thiết bị gửi yêu cầu cập nhật giỏ, hệ thống so khớp version hiện tại; nếu phát hiện mismatch (do thiết bị khác đã sửa trước), yêu cầu sẽ bị từ chối và buộc client phải refetch dữ liệu mới nhất.
>
> Tuy nhiên, 4 primitive này mới chỉ giải quyết vấn đề ở từng service đơn lẻ. Chúng không giải quyết được kịch bản lỗi một phần (partial failure): Catalog trừ kho xong, nhưng mạng đứt và Order commit thất bại. Đó là lúc chúng ta phải bước vào thế giới của Saga."

### Nguồn học thuật (nói khi được hỏi)

- **Garcia-Molina & Salem (1987)**: "Sagas" — ACM SIGMOD Record.
- **Richardson (2018)** "Microservices Patterns": Ch. 4 — Saga pattern; Ch. 3 — Transactional Outbox.
- **Apache Kafka Docs (2026)**: consumer idempotency và delivery semantics.

### Nguồn code

- `apps/order/src/app/modules/order/services/order-submit.service.ts`
- `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- `apps/order/src/app/modules/order/services/cart.service.ts`

---

## Slide 16. Thiết kế giao dịch phân tán — Lựa chọn mô hình Saga

**Nhãn phần:** `03 · GIẢI QUYẾT`

> ⭐ **Mục tiêu của slide:** Trình bày lý thuyết tổng quát về Saga, phân biệt hai mô hình triển khai (Choreography vs Orchestration) và bảo vệ lựa chọn Orchestration của đề tài trước Hội đồng.

### Dán lên slide

**Tiêu đề:** Thiết kế giao dịch phân tán — Lựa chọn mô hình Saga

**1. Khái niệm Saga (Garcia-Molina 1987):**

- Phân rã một giao dịch phân tán chéo database thành chuỗi các **giao dịch cục bộ (Local Transactions)** độc lập.
- Nếu một bước trong chuỗi thất bại, hệ thống phải tự kích hoạt các **giao dịch bù (Compensating Transactions)** để hoàn trả trạng thái.

**2. Đối chiếu hai mô hình Saga:**

| Tiêu chí       | Choreography (Event-driven)                                     | Orchestration (Điều phối tập trung) — _QRTable chọn_       |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| **Cơ chế**     | Các dịch vụ tự phản ứng chéo qua Event Broker.                  | Một dịch vụ (Orchestrator) kiểm soát state machine.        |
| **Ưu điểm**    | Phù hợp cho luồng ngắn (2-3 bước), không cần service trung tâm. | Tập trung hóa logic, dễ giám sát trạng thái, cô lập luồng. |
| **Nhược điểm** | Dễ gây liên kết vòng (Cyclic Dependency), cực kỳ khó debug.     | Phát sinh chi phí quản lý Orchestrator và state.           |

**Quyết định kiến trúc:** Chọn **Orchestration** (chạy tại Order Service và SaaS Service) vì luồng nghiệp vụ phức tạp (Order - Catalog - Kitchen - Payment), cần quản lý trạng thái tập trung và xử lý lỗi bù tin cậy.

### Bố cục / hình ảnh

- Trình bày dạng so sánh song song giữa sơ đồ luồng phi tập trung (Choreography) và sơ đồ luồng tập trung (Orchestration).
- Đánh dấu sao vàng highlight vào cột Orchestration làm quyết định lựa chọn.

### Logic cần hiểu

Slide này bắc cầu lý thuyết từ 3 cơ chế nền tảng hạ tầng lên giải pháp Saga thực tế của QRTable. Hội đồng sẽ đánh giá cao việc bạn có phân tích so sánh trước khi làm, thay vì mặc định code Orchestration ngay từ đầu. Bạn đưa ra lý do khách quan: F&B platform có luồng nghiệp vụ dài (4+ dịch vụ tham gia), nếu dùng Choreography sẽ tạo ra một mạng lưới event chồng chéo Dependency vòng tròn cực kỳ khó kiểm soát.

### Kịch bản thuyết trình (~45s)

> "Như đã phân tích, 3 cơ chế nền tảng trước chỉ bảo vệ từng dịch vụ đơn lẻ. Khi có lỗi chéo database, chúng ta cần đến mô hình giao dịch phân tán Saga.
>
> Về mặt thiết kế, thế giới có hai mô hình chính: Choreography (phi tập trung) và Orchestration (tập trung). Với Choreography, các dịch vụ tự phát và lắng nghe sự kiện của nhau. Mô hình này tuy đơn giản ban đầu nhưng khi luồng nghiệp vụ phình to, nó sẽ tạo ra sự phụ thuộc vòng chéo nhau và cực kỳ khó debug.
>
> Để khắc phục, đề tài lựa chọn mô hình **Orchestration (Điều phối tập trung)**. Chúng em thiết lập một bộ điều phối Orchestrator nằm tại Order Service để kiểm soát toàn bộ máy trạng thái của đơn hàng. Cách tiếp cận này giúp cô lập logic nghiệp vụ, dễ dàng giám sát trạng thái đơn hàng thời gian thực và quản lý các giao dịch bù khi có lỗi.
>
> Ngay sau đây, em xin phép trình bày chi tiết luồng xử lý thành công của bộ điều phối này."

### Câu chuyển sang Slide 20

> "Chúng ta hãy cùng đi vào chi tiết luồng điều phối thành công của Order Confirm Saga qua sơ đồ sequence diagram sau."

---

## Slide 17. Giao dịch phân tán — Quy trình xác nhận đơn hàng thành công

**Nhãn phần:** `03 · GIẢI QUYẾT`

> ⭐ **Slide nguyên lý Saga.** Trình bày trừu tượng, khái quát hóa ý tưởng phân rã giao dịch, cách phối hợp đồng bộ/bất đồng bộ và cơ chế bù trừ cốt lõi trước khi đi vào chi tiết kỹ thuật.

### Dán lên slide

**Tiêu đề:** Nguyên lý điều phối Order Confirm Saga & Cơ chế bù trừ

- **Ý tưởng phân rã giao dịch (Local Transactions):**
  - **$T_1$ (Order Service):** Khóa dòng ghi nhận đơn hàng và gán trạng thái `PENDING`.
  - **$T_2$ (Catalog Service):** Thực hiện tạm giữ tồn kho (Stock Reservation) cục bộ.
  - **$T_3$ (Kitchen Service):** Khởi tạo phiếu chế biến tại màn hình KDS bếp.
- **Mô hình áp dụng (Sync/Async Hybrid):**
  - **Đồng bộ ($T_1 \rightarrow T_2$):** Lời gọi TCP trực tiếp từ Order sang Catalog để khóa kho tức thời, tránh bán vượt mức (overselling).
  - **Bất đồng bộ ($T_2 \rightarrow T_3$):** Trực quan hóa qua Kafka Event, tách rời luồng hiển thị bếp để tối ưu hiệu năng.
- **Cơ chế bù trạng thái (Compensating & Rollback):**
  - **Giao dịch bù ($C_2$):** Tự động kích hoạt hoàn kho tại Catalog Service nếu các bước tiếp theo thất bại hoặc thanh toán quá hạn.
  - **Cơ chế bảo vệ kép:** Kết hợp **Idempotency** (chống trùng lặp lệnh bù) và **TTL Reservation** (tự động giải phóng kho nếu sập mạng).

### Bố cục / hình ảnh

- Sử dụng sơ đồ sequence diagram khái quát luồng ($T_1 \rightarrow T_2 \rightarrow T_3$) kết hợp đường nét đứt biểu diễn giao dịch bù ($C_2$).
- Nổi bật sự kết hợp giữa hai luồng: Đồng bộ (Sync - TCP) cho việc giữ kho và Bất đồng bộ (Async - Kafka) cho việc đẩy bếp.

### Logic cần hiểu

Bản chất của Saga không phải là phân tán ACID truyền thống mà là thiết lập Eventual Consistency. Việc chọn cơ chế Lai (Hybrid) — đồng bộ chặng đầu (Catalog) để đảm bảo không bị quá tải kho (overselling) và bất đồng bộ chặng sau (Kitchen KDS) để giải phóng thread xử lý là một thiết kế thông minh, thực tế, giải quyết được bài toán thắt nút cổ chai hiệu năng của F&B.

### Kịch bản thuyết trình (~45s)

> "Kính thưa Hội đồng, để giải quyết bài toán giao dịch phân tán giữa Order, Catalog và Kitchen Service mà không dùng ACID database truyền thống, đề tài áp dụng mô hình **Saga Orchestration** kết hợp cơ chế bù trừ.
>
> Ý tưởng cốt lõi là phân rã giao dịch thành 3 giao dịch cục bộ độc lập: $T_1$ tại Order để khóa dòng đơn hàng, $T_2$ tại Catalog để giữ kho, và $T_3$ tại Kitchen để đẩy bếp. Chúng em áp dụng một kiến trúc lai (Hybrid): chặng từ Order sang Catalog ($T_1 \rightarrow T_2$) chạy đồng bộ qua TCP để kiểm tra kho tức thời, tránh overselling, trong khi chặng đẩy sang bếp chạy bất đồng bộ qua Kafka để giải phóng tài nguyên.
>
> Đặc biệt, cơ chế bù trừ được thiết kế tự động. Nếu chặng sau thất bại hoặc khách hàng không thanh toán, Orchestrator sẽ gửi lệnh bù $C_2$ sang Catalog để giải phóng kho. Cơ chế này được bảo vệ bằng Idempotency chống trùng lệnh và bộ đếm thời gian TTL tự hủy để tránh rò rỉ tài nguyên."

### Nguồn học thuật (nói khi được hỏi)

- **Garcia-Molina & Salem (1987)**: "Sagas" — ACM SIGMOD, đặt nền móng cho distributed saga.
- **Richardson (2018)** "Microservices Patterns": Saga Orchestration & Database-per-service consistency.

### Nguồn code

- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`
- `thesis-report/assets/figures/chapter5-order-confirm-stock-slide22.pdf`

### Q&A phản biện

**Q: "Vì sao chọn Saga Orchestration (điều phối tập trung) thay vì Choreography (phản ứng sự kiện)?"**

> "Dạ, Choreography đơn giản cho luồng ngắn (2 service), nhưng khi luồng dài hơn và liên quan đến nhiều bước (Order, Catalog, Kitchen, Payment), Choreography sẽ gây ra cyclic dependency và rất khó theo dõi trạng thái hệ thống. Orchestration tập trung toàn bộ state machine tại Order Service giúp dễ debug, dễ giám sát trạng thái đơn hàng (PENDING, PROCESSING, FAILED) và kiểm soát chính xác khi nào kích hoạt compensating transaction."

**Q: "Nếu Orchestrator (Order Service) bị sập ngay trước khi gửi event hoặc khi đang chạy Saga thì sao?"**

> "Dạ, đây là lý do chúng em kết hợp Transactional Outbox. Bản ghi Saga state và outbox event được ghi trong cùng một database transaction. Nếu Order Service bị sập trước khi commit, database rollback, Catalog sẽ tự giải phóng kho sau thời gian timeout (TTL reservation). Nếu sập sau khi commit, outbox relay sẽ quét lại bản ghi chưa gửi trong DB để gửi lại, đảm bảo eventual consistency."

## Slide 18. Thiết kế giao dịch bù (Compensating Transactions) cho các nhánh lỗi

**Nhãn phần:** `03 · GIẢI QUYẾT`

### Dán lên slide

**Tiêu đề:** Thiết kế giao dịch bù (Compensating Transactions) của Order Confirm Saga

**Bối cảnh đối chiếu:**

- **Trong Monolith:** Khi lỗi xảy ra, DB engine tự động thực hiện `ROLLBACK` vật lý ở mức lưu trữ (low-level).
- **Trong Microservices:** Không có ROLLBACK vật lý chéo DB. Hệ thống bắt buộc phải tự kích hoạt **Compensating Transaction** ở tầng ứng dụng (application-level) để hoàn trả trạng thái trước đó của service khác.

| Tình huống lỗi                             | Phản ứng kiến trúc                   | Cơ chế                                        |
| ------------------------------------------ | ------------------------------------ | --------------------------------------------- |
| Đơn/hóa đơn không hợp lệ                   | Từ chối trước khi gọi Catalog        | Validation sớm — không có side effect         |
| Catalog báo hết kho                        | Order rollback local transaction     | Không cần compensation — Catalog không commit |
| **Catalog trừ kho xong, Order commit lỗi** | **Order gọi Catalog giải phóng kho** | **Compensating Transaction**                  |
| Lost response $\rightarrow$ retry          | Catalog trả REPLAYED + version       | Idempotency key                               |
| Stale release (lệnh cũ đến trễ)            | Catalog từ chối release cũ           | Versioned reservation                         |

### Kịch bản thuyết trình (~45s)

> "Như đã đặt vấn đề ở slide trước, giá trị thực sự của Saga không phải ở luồng thành công, mà nằm ở tính chịu lỗi và khả năng tự động hoàn trả trạng thái thông qua các compensating transaction.
>
> Trong monolith, khi một bước lỗi, database engine tự động rollback vật lý về trạng thái ban đầu. Nhưng trong microservices, khi Catalog đã trừ kho xong mà Order commit tại database cục bộ thất bại, ta không thể rollback vật lý Catalog. Chúng em bắt buộc phải tự kích hoạt giao dịch bù ở tầng ứng dụng — cụ thể là Order gọi Catalog giải phóng lượng tồn kho đã giữ với đúng reservationVersion.
>
> Có ba trường hợp lỗi chính được thiết kế: Đơn không hợp lệ $\rightarrow$ từ chối sớm không side effect; Catalog báo hết kho $\rightarrow$ Order tự rollback local, không cần bù; và phức tạp nhất là Catalog trừ kho xong nhưng Order commit lỗi $\rightarrow$ Order gọi compensating transaction giải phóng kho. Cơ chế versioning bảo đảm các lệnh release cũ đến trễ sẽ bị từ chối để tránh tranh chấp dữ liệu."

### Câu chuyển sang Slide 20

> "Đó là cách hệ thống xử lý lỗi và hoàn trả trạng thái cho luồng giao dịch xác nhận đơn hàng. Bên cạnh đó, đề tài còn thiết kế một quy trình Saga thứ hai dành riêng cho việc khởi tạo nhà hàng mới. Em xin giới thiệu ngắn gọn ở slide tiếp theo."

### Nguồn học thuật (nói khi được hỏi)

- **Garcia-Molina & Salem (1987)**: Định nghĩa "Compensating Transactions" như là phương thức hoàn trả trạng thái ban đầu của hệ thống khi một phần transaction phân tán thất bại.
- **Fowler (2015)**: Cơ chế Eventual Consistency và Saga error handling.

### Nguồn code

- `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`
- `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`

### Q&A phản biện

**Q: "Làm thế nào để compensating transaction (hành động bù) là idempotent?"**

> "Dạ, khi gọi Catalog để giải phóng tồn kho (release stock), Order truyền kèm `reservationVersion` thu được từ bước reserve trước đó. Catalog Service kiểm tra: (1) Nếu reservation đã tồn tại và chưa bị giải phóng -> thực hiện cộng lại kho và đánh dấu đã release; (2) Nếu nhận được lệnh release trùng lặp hoặc cũ hơn version hiện tại -> Catalog từ chối bằng mã `STALE` hoặc trả về kết quả thành công giả (no-op) để tránh cộng trùng kho. Cơ chế versioning này bảo đảm tính idempotent cho lệnh release."

**Q: "Nếu mạng bị mất gói tin khi gọi compensating transaction thì sao?"**

> "Dạ, Orchestrator (Order Service) sẽ thực hiện retry định kỳ qua cơ chế Outbox / background task cho đến khi nhận được phản hồi thành công từ Catalog, hoặc ghi nhận lỗi nghiêm trọng vào DLQ (Dead Letter Queue) để nhân viên vận hành can thiệp thủ công. Do lệnh release stock là idempotent, việc retry nhiều lần là hoàn toàn an toàn."

---

---

## Slide 19. Giao dịch phân tán — Quy trình cấp phát tài nguyên đa thuê tự động

**Nhãn phần:** `03 · GIẢI QUYẾT`

> ⭐ **Slide bổ sung cho Saga thứ hai.** Trình bày đầy đủ kiến trúc nghiệp vụ nhưng kịch bản thuyết trình được thiết kế báo cáo nhanh và lướt qua do giới hạn thời gian.

### Dán lên slide

**Tiêu đề:** Quy trình cấp phát tài nguyên đa thuê (SaaS Onboarding Saga)

**Bản chiếu 2 cột:**

- **Cột 1: Sơ đồ trình tự (Sequence Diagram)**
  - _(Hình ảnh chapter5-saas-onboarding-saga.png)_
- **Cột 2: Cơ chế kỹ thuật**
  - **Điều phối (Saga Orchestration):** Quản lý tập trung tại SaaS Service.
  - **Luồng thành công:** SaaS (Pending) $\rightarrow$ User-Access (Staff Admin) $\rightarrow$ Keycloak (OIDC Client) $\rightarrow$ Payment (SePay Webhook) $\rightarrow$ SaaS (Active).
  - **Xử lý lặp:** Trùng yêu cầu $\rightarrow$ Trả `REPLAYED` lập tức qua Idempotency Key.
  - **Từ chối sớm:** Lỗi dữ liệu $\rightarrow$ Chặn sớm tại biên (BFF Gateway).
  - **Giao dịch bù (Compensate):** Lỗi bước sau $\rightarrow$ Tự động rollback các bước trước (Staff Admin, Keycloak Client, SePay Connection), cập nhật Tenant sang `FAILED`.

### Bố cục / hình ảnh

- Trình bày dạng 2 cột tương tự Slide 17: Cột trái chiếm 55% diện tích hiển thị hình ảnh sơ đồ trình tự (`chapter5-saas-onboarding-saga.png`); Cột phải chiếm 45% diện tích tóm tắt các cơ chế kỹ thuật cốt lõi và 3 luồng xử lý phân tán.
- Nổi bật các mũi tên rollback màu đỏ tương ứng với luồng compensating transaction khi gặp sự cố tại Keycloak hoặc SePay.

### Logic cần hiểu

Slide này hoàn thiện bức tranh về Saga của khóa luận (Order Saga đại diện cho mức runtime giao dịch, SaaS Saga đại diện cho mức khởi tạo tài nguyên). Việc chuẩn hóa cấu trúc 2 cột giống Slide 17 giúp slide deck có sự nhất quán thị giác (visual consistency) cao, thể hiện sự chỉn chu tuyệt đối của hệ thống.

### Kịch bản thuyết trình (~25s)

> "Kính thưa Hội đồng, bên cạnh chuỗi giao dịch xác nhận đơn hàng, đề tài còn thiết kế và hiện thực hóa quy trình **SaaS Onboarding Saga** để điều phối cấp phát tài nguyên tự động cho một nhà hàng mới.
>
> Bộ điều phối tập trung tại SaaS Service sẽ kiểm soát 4 bước chéo qua các dịch vụ SaaS, phân quyền User-Access, cấu hình Keycloak OIDC, và liên kết cổng thanh toán SePay. Quy trình hỗ trợ đầy đủ 3 luồng xử lý: thành công kích hoạt trạng thái, chặn yêu cầu lặp bằng Idempotency Key, từ chối sớm dữ liệu sai tại BFF, cùng với giao dịch bù khi có lỗi.
>
> Tuy nhiên, do giới hạn về mặt thời gian, em xin phép được lướt nhanh qua sơ đồ này và di chuyển trực tiếp đến cơ chế thời gian thực tại bếp."

### Câu chuyển sang Slide 20

> "Sau đây em xin chuyển sang cơ chế hiển thị bếp realtime (KDS) ngay sau khi đơn hàng được xác nhận nhất quán."

### Nguồn học thuật

- **Garcia-Molina & Salem (1987)**: "Sagas" — ACM SIGMOD.
- **Richardson (2018)**: "Microservices Patterns".

### Nguồn code

- `apps/saas/src/services/onboarding-saga.service.ts`
- `apps/saas/src/services/onboarding-saga-db.integration.spec.ts`
- `docs/phases/phase-4b-saas-onboarding.md`

### Q&A phản biện

**Q: "Cơ chế compensating transaction của SaaS Onboarding Saga hoạt động như thế nào khi Keycloak bị lỗi giữa chừng?"**

> "Dạ, khi SaaS Onboarding Saga thực hiện đến bước 3 (đăng ký OIDC Client trên Keycloak) mà gặp sự cố lỗi kết nối hoặc phản hồi thất bại, Saga Orchestrator tại SaaS Service sẽ bắt được ngoại lệ này. Nó lập tức chuyển máy trạng thái của tenant sang `ROLLBACKING` và kích hoạt các giao dịch bù đảo ngược thứ tự trước đó: gọi gRPC sang User-Access Service để xóa tài khoản Staff Admin vừa tạo, sau đó cập nhật bản ghi Tenant trong SaaS DB sang trạng thái `FAILED`. Điều này giúp dọn dẹp sạch tài nguyên rác và đảm bảo an toàn dữ liệu chéo hệ thống."

## Slide 20. Cơ chế đồng bộ trạng thái bếp thời gian thực (KDS Runtime Projection)

**Nhãn phần:** `03 · GIẢI QUYẾT`

### Dán lên slide

**Tiêu đề:** Realtime KDS — Event-driven với Redis projection và WebSocket hint

**Luồng:**

```
Order (outbox commit)
    │
    ▼ [Kafka: order.confirmed]
Kitchen consumer → xác thực contract event
    │
    ▼
Redis KDS projection:
  Hash: chi tiết ticket          Set: station index
  Sorted Set: hàng đợi FIFO/SLA  Dedupe key: {tid}:dedupe:{eventId}
    │
    ▼ [Redis Pub/Sub: kds.queue_changed]
BFF → WebSocket HINT tới KDS room
    │
    ▼
Client → Refetch API snapshot
```

**Hai bất biến:**

- Kitchen KHÔNG thay thế Order là source of truth của đơn hàng
- Redis là KDS runtime projection — không phải database nghiệp vụ bền vững

### Kịch bản thuyết trình (~45s)

> "Dạ, như đã chuyển mạch ở slide trước, ngay sau khi đơn hàng được xác nhận thành công và ghi nhận nhất quán chéo dịch vụ, sự kiện `order.confirmed` được phát qua Kafka.
>
> Tại đây, Kitchen consumer tiếp nhận và tiến hành khởi tạo bản chiếu trạng thái bếp (KDS projection) trong bộ nhớ đệm Redis: bao gồm Hash để lưu thông tin chi tiết ticket, Sorted Set xếp hàng đợi FIFO theo SLA, và dedupe key để lọc các gói tin trùng lặp. Khi dữ liệu KDS thay đổi, hệ thống phát đi tín hiệu qua Redis Pub/Sub, BFF tiếp nhận và gửi một thông điệp WebSocket hint cực nhẹ tới room KDS.
>
> Client KDS nhận hint và tự gọi ngược lại REST API để refetch snapshot dữ liệu mới nhất. Cơ chế 'hint-and-refetch' này giúp hệ thống đạt cập nhật realtime cực kỳ tối ưu về mặt băng thông và tài nguyên, đồng thời giữ vững nguyên tắc: Order Service luôn là nguồn trạng thái đúng duy nhất (source of truth).
>
> Đây cũng là nội dung khép lại 3 nhóm giải pháp phân tán chính của đề tài. Để chứng minh tính đúng đắn của các giải pháp thiết kế này, chúng em đã xây dựng hệ thống kiểm chứng thực nghiệm đa lớp, em xin trình bày chi tiết ở chương kiểm chứng sau đây."

### Nguồn

- `apps/kitchen/src/app/modules/kitchen/services/order-confirmed.consumer.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- `thesis-report/assets/figures/chapter5-kds-ticket-lifecycle.pdf`

### Không nói quá

- Không nói Redis Pub/Sub bền vững
- Không nói Kitchen có database bền vững
- Không nói WebSocket là nguồn trạng thái đúng

### Câu chuyển sang Slide 21

> "Đó là toàn bộ 3 nhóm giải pháp phân tán chính của hệ thống. Để chứng minh tính đúng đắn và khả năng chịu tải của các giải pháp này, đề tài xây dựng hệ thống kiểm chứng thực nghiệm đa lớp. Em xin trình bày chi tiết ở chương kiểm chứng sau đây."

---

## Slide 21. PHẦN IV — Kiểm Chứng Thực Nghiệm Đa Lớp

**Nhãn phần:** `04 · KIỂM CHỨNG`

> ⭐ **Slide chuyển phần IV.** Giới thiệu chương kiểm chứng thực tế nhằm đánh giá độ tin cậy và hiệu năng của hệ thống.

### Dán lên slide

- **PHẦN IV: KIỂM CHỨNG THỰC NGHIỆM ĐA LỚP**
- **Nội dung chính:**
  1. Mô hình Kim tự tháp bằng chứng (Pyramid of Proofs) 4 cấp độ.
  2. Kết quả kiểm thử tự động bảo toàn 6 bất biến nghiệp vụ.
  3. Kết quả kiểm thử liên kết luồng E2E hoàn chỉnh.
  4. Thực nghiệm khả năng mở rộng ngang (Functional Scale-out).
  5. Đo lường hiệu năng và giới hạn endpoints bằng công cụ K6.

### Kịch bản thuyết trình (~10s)

> "Kính thưa Hội đồng, để chứng minh các giải pháp thiết kế trên hoạt động đúng đắn và chịu tải tốt, em xin trình bày Phần IV: Kiểm chứng thực nghiệm đa lớp."

### Câu chuyển sang Slide 22

> "Trước tiên là triết lý thiết lập hệ thống kiểm chứng qua mô hình kim tự tháp 4 lớp ở slide tiếp theo."

---

## Slide 22. Phương pháp luận kiểm chứng — Mô hình bốn lớp bằng chứng

**Nhãn phần:** `04 · KIỂM CHỨNG`

> ⭐ **Slide setup cho toàn bộ ACT 4.** Hội đồng hiểu bằng chứng không chỉ là demo UI.

### Dán lên slide

**Tiêu đề:** Kiểm chứng kỹ thuật — 4 lớp bằng chứng

**Pyramid (từ top xuống bottom):**

```
        ┌─────────────────────────────┐
        │   Lớp 1: Sản phẩm           │  Customer PWA · POS · KDS · Payment
        │   (hành vi người dùng)      │
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │  Lớp 2: Kiến trúc           │  Sơ đồ · Service boundary
        │  (design correctness)       │  Source code ownership
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │  Lớp 3: Test suite          │  Unit · Contract · Integration
        │  (cơ chế lặp lại được)     │  Saga · Idempotency · Compensation
        └──────────────┬──────────────┘
                       │
        ┌──────────────┴──────────────┐
        │  Lớp 4: Runtime state       │  PostgreSQL · Redis Insight
        │  & observability            │  Kafkio · Allure Report
        └─────────────────────────────┘
```

### Kịch bản thuyết trình (~20s)

> "Kiểm chứng hệ thống phân tán không thể chỉ dừng ở demo UI. Chúng em sử dụng 4 lớp bằng chứng: hành vi người dùng quan sát được, thiết kế kiến trúc và ownership từ source code, test suite có thể chạy lặp lại, và trạng thái runtime từ PostgreSQL, Redis và Kafka."

---

## Slide 23. Kết quả kiểm chứng Saga — Bảo toàn 6 bất biến nghiệp vụ

**Nhãn phần:** `04 · KIỂM CHỨNG`

### Dán lên slide

**Tiêu đề:** Order Confirm Saga — 6 invariants được kiểm chứng bằng test

| #   | Test case                              | Invariant được bảo vệ                                    | Loại        |
| --- | -------------------------------------- | -------------------------------------------------------- | ----------- |
| 1   | **Race Condition**                     | 2 request đồng thời → chỉ 1 thành công, stock về đúng 0  | Integration |
| 2   | **Lost Response Recovery**             | Mất phản hồi TCP → retry → REPLAYED, stock chỉ trừ 1 lần | Integration |
| 3   | **Stale Release Prevention**           | Release version cũ đến trễ → Catalog từ chối STALE       | Integration |
| 4   | **Duplicate Payload**                  | Payload trùng → REPLAYED, stock không biến động thêm     | Unit        |
| 5   | **Rollback khi Order commit thất bại** | Catalog trừ kho → compensation → stock hoàn              | Unit        |
| 6   | **Commit failure compensation**        | Lỗi commit cuối → compensation kích hoạt đúng            | Unit        |

**Phạm vi:** Unit/Contract (4, 5, 6) và Integration/Fault Injection (1, 2, 3)

### Bố cục / hình ảnh

- Bảng 6 dòng với highlight dòng 2 (Lost Response) và dòng 5 (Rollback)
- Có thể đặt thumbnail `appendix-d-01-order-saga-tests.png` góc dưới

### Kịch bản thuyết trình (~40s)

> "Saga không chỉ được thiết kế đẹp trên sơ đồ — còn phải có bằng chứng từ test suite. 6 test case kiểm chứng 6 invariant khác nhau.
>
> Race condition: hai người xác nhận cùng lúc cho phần ăn cuối — chỉ một thành công, stock về đúng 0. Lost response: Catalog đã trừ kho nhưng mạng mất gói phản hồi — retry trả REPLAYED, stock không bị trừ lần hai. Stale release: lệnh giải phóng kho cũ đến sau reservation mới — Catalog từ chối với STALE. Rollback: Catalog trừ kho xong, Order save thất bại — compensation giải phóng kho về trạng thái trước. Tất cả 6 invariant có bằng chứng từ test."

### Nguồn học thuật (nói khi được hỏi)

- **ISO/IEC 25010:2023**: Chất lượng phần mềm - Đặc tính chức năng (Functional Correctness & Robustness).
- **Meszaros (2007)** "xUnit Test Patterns": Test Double & Fault Injection patterns.

### Nguồn code

- `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`
- `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`
- `apps/catalog/src/app/modules/menu-item/tests/stock-reservation.service.spec.ts`

### Không nói quá

- Không claim Saga được kiểm chứng toàn bộ fault injection trên môi trường production
- Không claim durable saga state hoặc distributed lock hoàn hảo

### Q&A phản biện

**Q: "Làm thế nào em giả lập các lỗi mạng hoặc lỗi hệ thống như 'Lost Response' hay 'Commit Failure' để test trong môi trường cục bộ?"**

> "Dạ, chúng em sử dụng kỹ thuật Fault Injection (tiêm lỗi) kết hợp với các Test Double (như Mock/Spy) thông qua Jest và NestJS testing utilities. Ví dụ, để test 'Lost Response Recovery', chúng em giả lập catalog gateway ném ra một Timeout Exception hoặc ngắt kết nối mạng giả lập sau khi Catalog Service đã ghi database thành công. Để test 'Commit Failure', chúng em can thiệp vào Order Service Repository, ép hàm `save()` ném ra lỗi sau khi Catalog Service đã phản hồi thành công, từ đó kiểm chứng xem Orchestrator có gọi đúng compensating transaction sang Catalog hay không."

**Q: "Có thực sự cần thiết phải kiểm chứng cả 6 invariant này bằng kiểm thử tự động không, hay chỉ cần chạy thử bằng tay là đủ?"**

> "Dạ, hệ thống phân tán có tính bất định (non-deterministic) rất cao do độ trễ mạng và thứ tự thực thi của các tiến trình. Kiểm thử bằng tay chỉ kiểm chứng được luồng thành công chính (golden path) tại một thời điểm, rất khó tái tạo các race condition hay lost response ở miliseconds chênh lệch. Việc tự động hóa 6 test case này với Jest và TypeORM transaction kiểm soát chặt chẽ là cách duy nhất đảm bảo các bất biến (invariants) này luôn được duy trì qua các phiên bản cập nhật code (regression testing)."

---

## Slide 24. Kiểm thử liên kết luồng nghiệp vụ cuối-đến-cuối (E2E Integration Testing)

**Nhãn phần:** `04 · KIỂM CHỨNG`

### Dán lên slide

**Tiêu đề:** Tích hợp E2E và bằng chứng vận hành

**E2E Golden Flow — State cross-reference:**

| Bước        | PostgreSQL                              | Redis                            | Kafka               |
| ----------- | --------------------------------------- | -------------------------------- | ------------------- |
| QR Session  | —                                       | `session:{tid}:{tableId}`        | —                   |
| Cart update | —                                       | `cart:{tid}:{sid}` (cartVersion) | —                   |
| Submit      | orders: PENDING · bills: OPEN           | —                                | —                   |
| Confirm     | orders: PROCESSING · stock_reservations | —                                | `order.confirmed`   |
| KDS ticket  | —                                       | `kds:{tid}:{station}` ZSet       | —                   |
| Payment     | payment records · bills: PAID           | —                                | `payment.completed` |

**Observability tools:**

- **Allure Report:** Test automation results theo nhóm rủi ro
- **Kafkio:** Kafka cluster event visibility — topic `order.confirmed`, `payment.completed`
- **Redis Insight:** KDS projection state, QR session keys, cart versioning

### Kịch bản thuyết trình (~30s)

> "Ngoài Saga tests, hệ thống còn được kiểm chứng theo luồng E2E hoàn chỉnh. Với mỗi bước từ QR đến thanh toán, đều có trạng thái vật lý tương ứng có thể xác minh — từ Redis session, PostgreSQL order state, stock reservation, đến Kafka event và Redis KDS projection.
>
> Ba công cụ observability bổ sung bằng chứng vận hành: Allure Report trực quan hóa kết quả test automation; Kafkio cho thấy event stream thực tế trong Kafka cluster; Redis Insight cho thấy trạng thái projection và session. Những công cụ này chứng minh cơ chế hoạt động trong môi trường tích hợp."

### Nguồn học thuật (nói khi được hỏi)

- **ISO/IEC 25010:2023**: Chất lượng phần mềm - Tính tương tác và tương thích (Interoperability & Co-existence).
- **Martin Fowler (2017)**: Event-Driven Architecture Observability.

### Không nói quá

- Không nói Kafkio là monitoring production-grade
- Không nói Redis là source of truth nghiệp vụ

### Q&A phản biện

**Q: "Tại sao em cần đối chiếu trạng thái (State Cross-Reference) giữa PostgreSQL, Redis và Kafka trong một luồng E2E?"**

> "Dạ, trong kiến trúc Microservices và Event-Driven, không có một database trung tâm để kiểm tra trạng thái tức thời. Một giao dịch đặt món đi qua nhiều bước bất đồng bộ. Việc lập ra bảng State Cross-Reference giúp kiểm chứng tính nhất quán cuối cùng (eventual consistency): khi đơn hàng chuyển sang PROCESSING trong Postgres, event tương ứng phải có mặt trên Kafka, và KDS ticket phải xuất hiện trong Redis. Nếu trạng thái ở một nơi đổi mà nơi khác không đổi sau thời gian trễ cho phép, điều đó chứng tỏ có bug trong việc tích hợp giữa các service. Bảng này cung cấp hướng dẫn rõ ràng cho việc debug và kiểm thử E2E."

**Q: "Allure Report đóng vai trò gì ở đây, nó có khác gì test report thông thường không?"**

> "Dạ, Allure Report thu thập siêu dữ liệu (metadata) từ các test suite chạy trên CI/CD, phân nhóm test cases theo các tính năng nghiệp vụ và mức độ rủi ro (ví dụ: nhóm bảo vệ dữ liệu, nhóm compensation). Nó cung cấp biểu đồ trực quan giúp đánh giá nhanh độ phủ kiểm thử (test coverage) và lịch sử chạy test, giúp hội đồng thấy rõ kết quả kiểm thử tự động một cách minh bạch mà không cần mở code ra chạy trực tiếp."

---

### Câu chuyển sang Slide 25

> "Đó là cách chúng em kiểm chứng tính đúng đắn của luồng nghiệp vụ E2E trên một dòng chảy tích hợp. Tuy nhiên, đối với một hệ thống SaaS đa thuê như QRTable, chúng em còn cần phải chứng minh khả năng mở rộng ngang Active-Active của BFF và Order Service khi vận hành đa thực thể. Em xin trình bày chi tiết ở slide tiếp theo."

---

## Slide 25. Kiểm chứng khả năng mở rộng ngang (Functional Scale-Out)

**Nhãn phần:** `04 · KIỂM CHỨNG`

> ⭐ **Slide chứng minh tính đúng đắn của thiết kế stateless.** Kiểm thử khả năng mở rộng ngang đa thực thể để xác thực hệ thống không bị bất nhất trạng thái hoặc race condition khi chạy Active-Active.

### Dán lên slide

**Tiêu đề:** Thực nghiệm khả năng mở rộng ngang (Functional Scale-Out)

- **Mục tiêu kiểm chứng:**
  - Xác thực tính phi trạng thái (Stateless) của tầng xử lý ứng dụng (BFF, Order Service).
  - Chứng minh độ tin cậy kết nối và an toàn dữ liệu dưới kiến trúc đa thực thể Active-Active.
- **Kịch bản 1: Đồng bộ hóa phiên kết nối thời gian thực chéo thực thể (Real-time Session Sync)**
  - _Bài toán:_ Phân tán kết nối thời gian thực khi Client (khách) và Server (bếp) duy trì kết nối WebSocket trên các thực thể ứng dụng khác nhau.
  - _Giải pháp:_ Sử dụng mô hình lan truyền Pub/Sub để phát tán sự kiện chéo thực thể, đảm bảo định tuyến thông tin thời gian thực thông suốt.
- **Kịch bản 2: Kiểm soát tương tranh phân tán dưới tải đồng thời (Distributed Concurrency Control)**
  - _Bài toán:_ Nhiều thực thể xử lý đồng thời yêu cầu ghi dữ liệu chéo (giữ kho, xác nhận đơn) lên cùng tài nguyên dùng chung.
  - _Giải pháp:_ Áp dụng khóa bi quan (Pessimistic Row-Level Lock) ở tầng lưu trữ để tuần tự hóa xử lý, triệt tiêu race condition.

### Bố cục / hình ảnh

- Trình bày sơ đồ luồng đa instance: BFF-A/BFF-B kết nối qua Redis Pub/Sub; Order-A/Order-B kết nối qua Postgres locks.
- Tối giản hóa hình vẽ, tập trung vào mô tả mối quan hệ vật lý giữa các thực thể và cơ chế điều khiển tương tranh dùng chung.

### Logic cần hiểu

Slide này chứng minh tính đúng đắn về chức năng của thiết kế stateless (Active-Active). Việc chạy nhiều instance không đơn thuần là tăng server, mà là rủi ro mất đồng bộ WebSocket và race condition database. Bản test này chứng minh Redis Pub/Sub và row-level lock đã triệt tiêu hoàn toàn rủi ro này ở mức chức năng.

### Kịch bản thuyết trình (~45s)

> "Kính thưa Hội đồng, để chứng minh thiết kế hệ thống hỗ trợ khả năng mở rộng ngang Active-Active mà không gặp rủi ro bất nhất dữ liệu, đề tài thực hiện kịch bản kiểm chứng khả năng mở rộng ngang (Functional Scale-Out).
>
> Chúng em kiểm thử qua hai kịch bản trừu tượng hóa các bài toán kinh điển của hệ thống phân tán:
>
> Kịch bản thứ nhất là **Đồng bộ hóa phiên kết nối thời gian thực chéo thực thể**. Khi client của khách hàng và bếp kết nối tới các thực thể BFF khác nhau, hệ thống sử dụng trục truyền tin Pub/Sub để định tuyến chính xác các gói tin WebSocket chéo thực thể mà không làm đứt gãy luồng realtime.
>
> Kịch bản thứ hai là **Kiểm soát tương tranh phân tán**. Khi nhiều thực thể dịch vụ xử lý cùng lúc các yêu cầu ghi chéo database, đề tài áp dụng cơ chế khóa dòng bi quan (Pessimistic Locking) tại cơ sở dữ liệu để đảm bảo các yêu cầu được tuần tự hóa, triệt tiêu hoàn toàn race condition và tránh thất thoát tài nguyên tồn kho.
>
> Kết quả kiểm chứng tự động đều ghi nhận trạng thái PASS hoàn toàn trên cả hai kịch bản mở rộng này."

### Q&A phản biện

**Q: "Tại sao đề tài lại lựa chọn duy nhất hai dịch vụ BFF và Order Service để thực hiện kiểm chứng khả năng mở rộng ngang (Functional Scale-Out)?"**

> "Dạ, BFF và Order Service là hai dịch vụ cốt lõi, đại diện cho hai thách thức lớn nhất về trạng thái (stateful challenges) khi mở rộng hệ thống phân tán Active-Active:
>
> 1. **BFF đại diện cho trạng thái kết nối thời gian thực (WebSocket):** Khi khách hàng kết nối vào BFF-A nhưng nhân viên bếp lại kết nối vào BFF-B, nếu không đồng bộ chéo node, các thông điệp realtime sẽ bị thất lạc. Chúng em chọn BFF để chứng minh cơ chế **Redis Pub/Sub** đã đồng bộ hóa thành công các sự kiện WebSocket realtime chéo thực thể.
> 2. **Order Service đại diện cho trạng thái nghiệp vụ và giao dịch cốt lõi:** Khi nhiều instance Order chạy song song cùng nhận lệnh xác nhận đơn hàng đồng thời cho cùng một sản phẩm/bàn, nguy cơ race condition và trừ lố tồn kho cực kỳ lớn. Chúng em chọn Order để chứng minh cơ chế khóa dòng **PostgreSQL (row-level lock)** bảo đảm tuyệt đối tính toàn vẹn giao dịch bất kể request được định tuyến tới instance nào.
>
> Các dịch vụ còn lại như Kitchen hay Catalog hoạt động theo dạng pure stateless (chỉ ghi/đọc cache Redis tập trung) hoặc local transaction đơn lẻ nên tính rủi ro thấp hơn và không mang tính đại diện cho bài toán kiến trúc phân tán bằng hai dịch vụ này."

### Câu chuyển sang Slide 26

> "Sau khi đã kiểm chứng tính đúng đắn về mặt chức năng của mô hình đa thực thể, đề tài tiếp tục đo lường hiệu năng tải thực tế bằng công cụ K6 ở slide tiếp theo."

## Slide 26. Thực nghiệm đo lường hiệu năng cơ sở bằng công cụ K6

**Nhãn phần:** `04 · KIỂM CHỨNG`

> ⭐ **Slide đánh giá chỉ số hiệu năng cơ sở (Performance Baseline).** Chứng minh bằng các số liệu đo trễ và tỷ lệ lỗi thực tế từ K6 để xác thực tính ổn định của các endpoints lõi.

### Dán lên slide

**Tiêu đề:** Đo lường hiệu năng cơ sở — K6 Benchmarking

**Bảng kết quả đo lường hiệu năng cơ sở:**

| Kịch bản đo tải                              | Cấu hình tải                   | Số yêu cầu |  RPS  |  Độ trễ p95  | Tỷ lệ lỗi |    Kết quả     |
| :------------------------------------------- | :----------------------------- | :--------: | :---: | :----------: | :-------: | :------------: |
| **01. Đọc nền** (`read-baseline`)            | VU 5 $\rightarrow$ 15 (2 phút) |   4.336    | 26,14 | **24,10 ms** |   0,00%   | **ĐẠT (100%)** |
| **02. Khách đặt món** (`customer-ordering`)  | 1 VU, 5 vòng lặp               |     30     | 3,41  | **47,37 ms** |   0,00%   | **ĐẠT (100%)** |
| **03. Xác nhận & KDS** (`confirm-kds-pulse`) | 1 VU, 1 vòng lặp               |     6      | 2,84  | **32,98 ms** |   0,00%   | **ĐẠT (100%)** |

- **Điều kiện kiểm chứng đạt:** 100% các cuộc gọi (HTTP Status 200/201) và xác thực tính đúng đắn dữ liệu đều thành công.

**Đúc kết thực nghiệm (Performance Takeaway):**

- **Hiệu quả bộ đệm:** Độ trễ luồng đọc cực thấp (~24 ms) chứng minh đệm Redis giải quyết tốt bài toán phân giải tenant và truy xuất thực đơn mà không cần truy vấn DB chính.
- **Thời gian phản hồi giao dịch:** Toàn bộ các luồng ghi giao dịch phân tán (Saga) chéo dịch vụ đều đạt thời gian phản hồi dưới **50 ms**, chứng minh kiến trúc microservices và cơ chế outbox không tạo ra nút thắt cổ chai về mặt hiệu năng.

### Bố cục / hình ảnh

- Trình bày bảng so sánh tóm tắt kết quả K6 ở trung tâm slide.
- Sử dụng màu xanh lá nhạt cho cột "Tỷ lệ lỗi (0,00%)" và "Kết quả (ĐẠT)" để tạo điểm nhấn thị giác tích cực.
- Đính kèm một góc ảnh chụp màn hình Allure Report hoặc console log K6 hiển thị kết quả đo tải.

### Logic cần hiểu

Các con số thực nghiệm này cho thấy độ trễ đáp ứng (p95 latency) cực kỳ nhỏ đối với luồng đọc nền (24,10 ms) và luồng nghiệp vụ phức tạp chéo dịch vụ như xác nhận đơn (32,98 ms) hay gửi đơn (47,37 ms). Đây là bằng chứng định lượng chứng minh tính hiệu quả của thiết kế stateless và cơ chế đệm Redis/Outbox mà hệ thống áp dụng.

### Kịch bản thuyết trình (~45s)

> "Dạ, để hoàn thiện kim tự tháp bằng chứng, chúng em tiến hành thực nghiệm đo lường hiệu năng cơ sở của hệ thống bằng công cụ K6 trên 3 kịch bản tải mô phỏng nghiệp vụ thực tế:
>
> Kịch bản thứ nhất là **Đọc nền (read-baseline)**: giả lập tải tăng dần từ 5 lên 15 người dùng đồng thời trong 2 phút, thực hiện các tác vụ đọc tần suất cao gồm: kiểm tra sẵn sàng, định danh tenant, truy xuất thực đơn và quét mã QR lỗi. Kết quả hệ thống xử lý thành công **4.336 yêu cầu** với thông lượng **26,14 RPS**, độ trễ p95 đạt mức cực thấp là **24,10 ms** nhờ tối ưu hóa bộ đệm Redis cho luồng đọc.
>
> Kịch bản thứ hai là luồng **Khách đặt món (customer-ordering)**: giả lập hành trình hoàn chỉnh của khách hàng gồm quét mã tham gia phiên bàn, xem menu, cập nhật giỏ hàng và gửi đơn. Kịch bản này đi qua chuỗi API nghiệp vụ phức tạp chéo dịch vụ và đạt độ trễ p95 là **47,37 ms**.
>
> Kịch bản thứ ba là luồng **Xác nhận đơn và bếp KDS (confirm-kds-pulse)**: mô phỏng hành vi nhân viên và nhà bếp gồm tạo đơn hàng mẫu, xác nhận đơn để kích hoạt luồng Saga, và nhà bếp đọc hàng đợi chế biến KDS. Kịch bản ghi nhận độ trễ p95 rất tốt, chỉ **32,98 ms**.
>
> Toàn bộ các thực nghiệm đều đạt tỷ lệ lỗi **0,00%**, đáp ứng 100% điều kiện kiểm chứng. Từ kết quả trên, đề tài rút ra hai kết luận hiệu năng quan trọng: Một là bộ đệm Redis đã cô lập và xử lý rất tốt luồng đọc mà không ảnh hưởng database lõi. Hai là các giao dịch phân tán (Saga) chéo dịch vụ đều đạt thời gian phản hồi xuất sắc dưới 50ms, chứng minh thiết kế kiến trúc hoàn toàn không gây nút thắt cổ chai hiệu năng."

### Nguồn

- `tools/scale-test/k6/`
- `docs/graduation-thesis-resources/k6-observability-test.md`
- `docs/graduation-thesis-resources/benchmark-results/`

### Q&A phản biện

**Q: "Tại sao đề tài chỉ chạy K6 với số lượng VUs nhỏ (15 VUs cho baseline, 1 VU cho ordering) mà không đẩy lên hàng nghìn VUs?"**

> "Dạ, vì kịch bản đo tải được thực thi trên môi trường sandbox cục bộ (Local Development Stack). Đối với luồng ghi nghiệp vụ (`02-customer-ordering` và `03-confirm-kds-pulse`), việc đẩy số VUs lên cao trên cùng một tài nguyên bàn/giỏ hàng (shared session) sẽ tạo ra xung đột dữ liệu giả lập không thực tế. Do đó, mục tiêu của đợt đo lường này là **Performance Benchmarking** (thiết lập chỉ số hiệu năng cơ sở của API) để xác thực các hàm xử lý hoạt động trơn tru không có blockages, chứ không phải là stress-test phá hủy hệ thống trên cloud thương mại."

**Q: "Tại sao lại chọn K6 thay vì các công cụ truyền thống như Apache JMeter?"**

> "Dạ, JMeter chạy trên nền JVM (Java Virtual Machine), mỗi virtual user tương ứng với một thread vật lý nên tiêu tốn rất nhiều tài nguyên RAM/CPU của máy test cục bộ. Trong khi đó, K6 được viết bằng Go, sử dụng mô hình asynchronous I/O nhẹ hơn rất nhiều, cho phép viết kịch bản test bằng JavaScript dễ dàng quản lý phiên bản cùng mã nguồn hệ thống và tích hợp tự động vào luồng CI/CD."

### Câu chuyển sang Slide 27

> "Trong suốt quá trình đo tải bằng K6, làm thế nào chúng em quan sát và phân tích được hành vi của hệ thống? Đó chính là nhờ hạ tầng giám sát toàn diện dựa trên 3 trụ cột Observability mà em xin trình bày chặng đầu tiên về đo lường hiệu năng hệ thống."

---

## Slide 27. Giám sát hiệu năng hệ thống qua Grafana Dashboard

**Nhãn phần:** `04 · KIỂM CHỨNG`

> ⭐ **Slide giám sát hạ tầng.** Minh chứng thực tế từ Grafana hiển thị trạng thái các vi dịch vụ hoạt động ở chế độ Active, cùng với các biểu đồ tải HTTP, độ trễ p95 và thông lượng nghiệp vụ trong phiên đo tải K6.

### Dán lên slide

**Tiêu đề:** Giám sát hiệu năng hệ thống (System Metrics Dashboard)

**Bản chiếu 2 cột:**

- **Cột 1: Minh chứng thực nghiệm (Screenshot)**
  - **Grafana System Overview:** Trực quan hóa các chỉ số hoạt động của các dịch vụ ở runtime.
  - _(Hình ảnh: chapter6-k6-grafana-system-overview-after-fix.png)_
- **Cột 2: Các chỉ số hiển thị thực tế trên ảnh**
  - **Trạng thái dịch vụ (Target Status):** Cả 4 dịch vụ lõi (`bff`, `authorizer`, `saas`, `kitchen`) đều hiển thị trạng thái `UP`.
  - **Thông lượng tải (HTTP Request Rate):** Đạt đỉnh ở mức **~28 req/s** trong giai đoạn giữ tải ổn định (trung bình toàn phiên đạt 26,03 RPS, tiệm cận mốc 30 req/s trên trục đồ thị Grafana).
  - **Tỷ lệ lỗi (HTTP Error Ratio):** Hiển thị trạng thái **"No data"** (không có lỗi, tương ứng với tỷ lệ lỗi 0,00%).
  - **Độ trễ xử lý (HTTP Latency P95):** Dao động cực thấp **từ 7 ms đến 8 ms** (thời gian xử lý thực tế tại server, chưa tính trễ mạng).

### Bố cục / hình ảnh

- Cột trái (60%): Ảnh chụp Grafana dashboard (`chapter6-k6-grafana-system-overview-after-fix.png`).
- Cột phải (40%): Danh sách tóm tắt 4 chỉ số hiển thị thực tế trên ảnh đối chiếu với K6.

### Logic cần hiểu

Trong buổi bảo vệ, khi chiếu ảnh này, cần làm rõ sự khác biệt giữa độ trễ p95 đo ở client (K6 là 27,27 ms) và độ trễ đo ở server (Grafana hiển thị ~7.5 ms). Phần chênh lệch khoảng 20 ms là trễ mạng vật lý (network round-trip) trong môi trường Docker, chứng minh thời gian xử lý mã nguồn tại BFF là cực kỳ nhanh (< 8 ms).

### Kịch bản thuyết trình (~30s)

> "Để giám sát toàn diện hệ thống khi vận hành dưới tải, chúng em đã thiết lập bộ ba công cụ giám sát Prometheus, Loki và Tempo, trực quan hóa trên **Grafana**.
>
> Trên slide là ảnh chụp thực tế bảng điều khiển **Grafana System Overview** ghi nhận đúng vào thời điểm chạy kịch bản Đọc nền của K6. Bảng trạng thái phía trên cho thấy cả 4 vi dịch vụ gồm BFF, Authorizer, SaaS và Kitchen đều ở trạng thái `UP`.
>
> Biểu đồ **HTTP Request Rate** ghi nhận tải thực tế tăng dần và đi ngang ổn định ở mức sát **30 req/s** (đạt khoảng 28 req/s tại đỉnh khi chạy đủ 15 VUs), hoàn toàn khớp với con số thông lượng trung bình 26,03 RPS trên toàn phiên đo của K6. Đặc biệt, ô **HTTP Error Ratio** hiển thị trạng thái **'No data'**, tức là tỷ lệ lỗi bằng 0%. Biểu đồ **HTTP Latency P95** bên dưới cho thấy thời gian xử lý phía server rất thấp, dao động ổn định từ **7 ms đến 8 ms**."

### Câu chuyển sang Slide 28

> "Bên cạnh các chỉ số tài nguyên phần cứng, hệ thống còn tự động xuất ra các chỉ số nghiệp vụ đặc thù của POS, được theo dõi chi tiết ở slide tiếp theo."

---

## Slide 28. Giám sát chỉ số nghiệp vụ ứng dụng qua Prometheus

**Nhãn phần:** `04 · KIỂM CHỨNG`

> ⭐ **Slide giám sát nghiệp vụ.** Giới thiệu việc tự động thu thập và biểu diễn các chỉ số hoạt động kinh doanh trực tiếp của ứng dụng POS SaaS mà không cần truy vấn database.

### Dán lên slide

**Tiêu đề:** Giám sát chỉ số nghiệp vụ ứng dụng (Business Metrics)

**Bản chiếu 2 cột:**

- **Cột 1: Minh chứng thực nghiệm (Screenshot)**
  - **Prometheus Custom Metrics:** Giao diện truy vấn Prometheus ghi nhận các chỉ số nghiệp vụ.
  - _(Hình ảnh: chapter6-k6-prometheus-business-counters.png)_
- **Cột 2: Chỉ số đối chiếu nghiệp vụ thực tế trên ảnh**
  - **orders_submitted (Đơn hàng gửi lên):** Ghi nhận giá trị tăng thêm **~6,3** trong khoảng 5 phút.
  - **orders_confirmed (Đơn xác nhận):** Ghi nhận giá trị tăng thêm **~1,05**.
  - **kds_tickets_created (Vé bếp khởi tạo):** Ghi nhận giá trị tăng thêm **~1,05**.
  - _(Lưu ý: Các giá trị thập phân là do thuật toán nội suy rate/increase của Prometheus trên chu kỳ 5 phút, tương đương thực tế có 6 đơn được gửi, 1 đơn được xác nhận và tạo ra 1 vé bếp)._

### Bố cục / hình ảnh

- Cột trái (60%): Ảnh chụp truy vấn Prometheus (`chapter6-k6-prometheus-business-counters.png`).
- Cột phải (40%): Danh sách tóm tắt giải thích ý nghĩa các bộ đếm nghiệp vụ thực tế xuất hiện trên ảnh.

### Logic cần hiểu

Business Metrics đại diện cho khả năng quan sát mức ứng dụng. Thay vì chỉ giám sát CPU/RAM chung chung, việc đếm số lượng transaction thành công hay số session bàn hoạt động cung cấp góc nhìn kinh doanh tức thời cho người vận hành, đồng thời hỗ trợ đối soát trạng thái bất nhất chéo dịch vụ.

### Kịch bản thuyết trình (~30s)

> "Không chỉ đo tải phần cứng, chúng em còn kiểm chứng tính đúng đắn nghiệp vụ thông qua các bộ đếm trên **Prometheus** khi các kịch bản đặt món và xác nhận đơn bếp ở Slide 26 chạy.
>
> Nhìn vào giao diện truy vấn Prometheus trên slide, chúng em chạy hàm `increase` trong khoảng thời gian 5 phút cho 3 chỉ số nghiệp vụ:
>
> - Đầu tiên, bộ đếm đơn hàng gửi lên `qrtable_orders_submitted_total` ghi nhận giá trị tăng thêm **~6,3**.
> - Bộ đếm đơn hàng xác nhận thành công `qrtable_orders_confirmed_total` tăng **~1,05**.
> - Bộ đếm vé bếp tạo ra `qrtable_kds_tickets_created_total` cũng tăng chính xác **~1,05**.
>
> Các con số này thực chất biểu thị có **6 đơn hàng được gửi lên, 1 đơn được xác nhận và 1 vé bếp được khởi tạo** trong phiên test (các giá trị lẻ là do thuật toán nội suy của Prometheus trên chu kỳ 5 phút). Bằng chứng này khẳng định luồng nghiệp vụ phân tán đã chạy thông suốt từ Order Service sang Kitchen Service chéo database."

### Câu chuyển sang Slide 29

> "Tuy nhiên, để thực sự hiểu rõ đường đi của một request chéo qua nhiều dịch vụ và định vị lỗi phân tán, chúng em sử dụng giải pháp tối tân nhất là Distributed Tracing."

---

## Slide 29. Phân vết giao dịch phân tán qua Tempo Distributed Tracing

**Nhãn phần:** `04 · KIỂM CHỨNG`

> ⭐ **Slide phân vết cuộc gọi.** Giới thiệu cơ chế distributed tracing sử dụng Grafana Tempo để theo dõi hành trình chi tiết của request qua các microservices.

### Dán lên slide

**Tiêu đề:** Phân vết giao dịch phân tán (Tempo Distributed Tracing)

**Bản chiếu 2 cột:**

- **Cột 1: Minh chứng thực nghiệm (Screenshot)**
  - **Tempo Distributed Tracing:** Sơ đồ phân vết cuộc gọi của yêu cầu validate QR Token.
  - _(Hình ảnh: chapter6-k6-tempo-invalid-qr-trace.png)_
- **Cột 2: Các chỉ số đối chiếu thực tế trên ảnh**
  - **API Endpoint:** Yêu cầu `POST /api/v1/menu/validate-qr` có tổng thời gian xử lý là **6,09 ms** với **34 spans**.
  - **Controller Latency:** Phương thức `validateQr` thực thi hết **5,62 ms**.
  - **Redis Latency:** Ba cuộc gọi Redis (1 SET, 2 GET) cực nhanh chỉ mất lần lượt **1,03 ms**, **528 µs** và **686 µs**.
  - **TCP Inter-service Latency:** Gọi SaaS Service mất **559,38 µs** (SELECT SQL mất **420 µs**); Gọi Catalog Service mất **922,13 µs** (SELECT SQL mất **743 µs**).
  - **Cảnh báo lỗi màu đỏ:** Biểu thị QR Token không hợp lệ được phát hiện và từ chối sớm (lỗi nghiệp vụ có kiểm soát).

### Bố cục / hình ảnh

- Cột trái (60%): Ảnh chụp chi tiết cây phân vết Tempo (`chapter6-k6-tempo-invalid-qr-trace.png`).
- Cột phải (40%): Liệt kê chi tiết thời gian (latency) của từng span cuộc gọi thực tế trên ảnh.

### Logic cần hiểu

Trong hệ thống vi dịch vụ, việc gán mã trace ID liên kết chặt chẽ với log là cách duy nhất để debug hiệu quả. Tempo cho phép từ sơ đồ Trace (đo độ trễ) xem ngay được Log lỗi tương ứng (Loki) của service đó tại đúng milisecond xảy ra sự cố, giảm thời gian debug từ vài giờ xuống vài giây.

### Kịch bản thuyết trình (~35s)

> "Cuối cùng, đối với các trường hợp lỗi nghiệp vụ có kiểm soát phát sinh trong phiên đo tải ở Slide 26 — cụ thể là kịch bản quét mã QR không hợp lệ bị từ chối sớm — chúng em sử dụng **Grafana Tempo** để phân vết cuộc gọi distributed tracing.
>
> Sơ đồ phân vết trên slide hiển thị trực quan cuộc gọi validate QR bị từ chối với mã lỗi màu đỏ. Tổng thời gian xử lý của request chỉ mất vỏn vẹn **6,09 ms**:
>
> - Giai đoạn xử lý tại controller là **5,62 ms**. Trong đó, gọi Redis cực nhanh chỉ mất khoảng **500 đến 600 micro-giây** cho mỗi lệnh GET.
> - Lời gọi TCP sang SaaS Service để định danh tenant mất **559 micro-giây** (với câu lệnh SQL chỉ mất **420 micro-giây**).
> - Lời gọi TCP sang Catalog Service để kiểm tra mã QR mất **922 micro-giây** (với câu lệnh SQL chỉ mất **743 micro-giây**).
>
> Biểu đồ span latency chi tiết đến mức micro-giây này chứng minh biên bảo mật và các service định tuyến cực kỳ nhanh chóng mà không gây nghẽn cổ chai cho các dịch vụ lõi phía sau."

### Nguồn học thuật

- **Martin Fowler (2017)**: Observability in Distributed Systems.
- **OpenTelemetry Standard (2025)**: Industry-standard API for metrics, logs, and traces correlation.

### Nguồn code

- `apps/bff/src/main.ts` (OpenTelemetry SDK initialization)
- `docker/monitoring/prometheus.yml`, `docker-compose.scale-test.yaml`

### Q&A phản biện

**Q: "Tại sao em cần dùng cả Logs và Traces? Logs truyền thống là không đủ hay sao?"**

> "Dạ, trong kiến trúc Monolith, log được ghi tập trung vào một file duy nhất và có tính tuần tự nên rất dễ đọc. Nhưng ở Microservices, một yêu cầu từ khách hàng sẽ kích hoạt nhiều cuộc gọi chéo qua nhiều dịch vụ độc lập và ghi ra nhiều file log khác nhau. Nếu không có Traces (Tempo) để gán một `trace_id` chạy xuyên suốt hành trình, việc tìm lỗi trong hàng triệu dòng log rời rạc của các service là vô cùng khó khăn. Tempo giúp chúng em định vị chính xác service nào bị lỗi hoặc chạy chậm, sau đó Loki sẽ lọc ra đúng dòng log của service đó tại milisecond đó, rút ngắn thời gian xử lý sự cố."

### Câu chuyển sang Slide 30

> "Sự kết hợp giữa kiểm chứng tự động và giám sát runtime đã mang lại bằng chứng thực nghiệm rõ ràng nhất cho đề tài. Sau đây, em xin phép bước sang Phần V: Tổng kết và hướng phát triển."

---

## Slide 30. PHẦN V — Tổng Kết & Hướng Phát Triển

**Nhãn phần:** `05 · KẾT LUẬN`

> ⭐ **Slide chuyển phần V.** Tổng kết toàn bộ đóng góp cốt lõi của đề tài và mở ra các hướng phát triển tương lai.

### Dán lên slide

- **PHẦN V: TỔNG KẾT & HƯỚNG PHÁT TRIỂN**
- **Nội dung chính:**
  1. Tổng kết 3 đóng góp khoa học chính của khóa luận.
  2. Đánh giá khách quan các hạn chế kỹ thuật hiện tại.
  3. Đề xuất định hướng nghiên cứu và nâng cấp tiếp theo.

### Kịch bản thuyết trình (~10s)

> "Cuối cùng, em xin chuyển sang Phần V: Tổng kết các kết quả đạt được của đề tài và định hướng phát triển trong tương lai."

### Câu chuyển sang Slide 32

> "Em xin tóm lược các đóng góp cốt lõi của khóa luận ở slide tiếp theo."

---

## Slide 31. Đóng góp kỹ thuật và Hạn chế của đề tài

**Nhãn phần:** `05 · KẾT LUẬN`

> ⭐ **Slide kết luận học thuật.** Tóm tắt ở mức khái quát, trừu tượng hóa các đóng góp khoa học chính, thẳng thắn nhìn nhận hạn chế thực nghiệm và đề xuất hướng nghiên cứu tiếp theo để thể hiện tư duy học thuật nghiêm túc.

### Dán lên slide

**Tiêu đề:** Đóng góp kỹ thuật và Định hướng phát triển

- **Đóng góp cốt lõi:**
  - **Kiến trúc tham chiếu:** Mô hình kiến trúc Microservices F&B SaaS cô lập đa thuê (Multi-Tenancy).
  - **Nhất quán phân tán:** Quy trình Saga Orchestration + Outbox + Idempotency bảo toàn dữ liệu.
  - **Kiểm chứng đa lớp:** Quy trình đánh giá tích hợp (Unit/E2E), K6 Benchmarking và Observability.
- **Hạn chế kỹ thuật:**
  - **Thực nghiệm sandbox:** Đo đạc hiệu năng trên cụm Docker Compose cục bộ, chưa đo tải lớn trên cloud.
  - **Hạ tầng Backend:** Chỉ deploy frontend lên cloud (Vercel); backend/database vẫn chạy local.
- **Định hướng phát triển:**
  - **Cloud Deployment:** Đóng gói và đưa backend lên đám mây (AWS/GCP) qua cụm Kubernetes (K8s).
  - **Đo tải tối đa (Stress Testing):** Thực hiện kiểm thử chịu tải cực hạn bằng K6 để tìm giới hạn tối đa và điểm gãy của hệ thống.

### Bố cục / hình ảnh

- Chia slide thành 2 phần cân đối: Phần trái (55%) trình bày 3 Đóng góp khoa học chính; Phần phải (45%) chia làm 2 khối nhỏ cho Hạn chế kỹ thuật và Định hướng phát triển.
- Sử dụng font chữ thoáng, trình bày dưới dạng bullet-points khái quát, tránh nhồi nhét quá nhiều từ khóa kỹ thuật thô hoặc tên công cụ cục bộ.

### Logic cần hiểu

Khác với các slide kỹ thuật trước, slide kết luận cần thể hiện tư duy khái quát hóa (generalization) của một kỹ sư. Việc thẳng thắn chỉ ra hạn chế kỹ thuật (như môi trường sandbox, chưa deploy backend lên cloud) không làm giảm giá trị đề tài, trái lại chứng minh bạn hiểu rất rõ hệ thống của mình và có định hướng nghiên cứu nghiêm túc.

### Kịch bản thuyết trình (~40s)

> "Kính thưa Hội đồng, trải qua quá trình nghiên cứu và thực nghiệm, đề tài rút ra ba đóng góp kỹ thuật cốt lõi:
>
> Thứ nhất, chúng em đã thực hiện hóa một kiến trúc tham chiếu F&B SaaS multi-tenant hoàn chỉnh dưới dạng Microservices, giải quyết triệt để bài toán cô lập tài nguyên đa thuê. Thứ hai, đề tài thiết kế mô hình giao dịch phân tán Saga tích hợp Idempotency bảo đảm tính toàn vẹn nghiệp vụ dưới các kịch bản lỗi mạng. Thứ ba, chúng em đề xuất một phương pháp luận kiểm chứng thực nghiệm đa lớp có tính tái tạo cao thông qua kiểm thử tự động kết hợp hạ tầng quan sát runtime.
>
> Bên cạnh đó, đề tài cũng thẳng thắn nhìn nhận hai hạn chế kỹ thuật: việc đo lường mới dừng lại ở môi trường sandbox cục bộ và toàn bộ backend stack chưa được triển khai thực tế trên production cloud do giới hạn tài nguyên. Định hướng tiếp theo của đề tài là di chuyển hệ thống lên Kubernetes để triển khai đám mây và thực hiện kiểm thử đo lường chịu tải tối đa bằng K6."

### Nguồn

- `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`

### Q&A phản biện

**Q: "Em nói kiến trúc này có tính mở rộng và tái sử dụng. Vậy nếu tôi muốn đổi cổng thanh toán từ SePay sang MoMo hay VnPay thì có phải sửa nhiều dịch vụ không?"**

> "Dạ, nhờ vào thiết kế phân định ranh giới dịch vụ (Service Boundaries) và sử dụng các Shared Libraries của đề tài, việc này được thực hiện rất dễ dàng. Toàn bộ logic giao tiếp với cổng thanh toán và SePay được đóng gói cô lập duy nhất bên trong Payment Service, và dịch vụ này giao tiếp với các phần còn lại qua Event Broker (Kafka) hoặc API hợp đồng (TCP). Khi muốn tích hợp cổng mới, chúng em chỉ cần mở rộng mã nguồn bên trong Payment Service mà hoàn toàn không cần chỉnh sửa hay tái cấu trúc các dịch vụ cốt lõi khác như SaaS hay Order, thể hiện tính module hóa và khả năng tái sử dụng rất cao của kiến trúc."

**Q: "Hạn chế về việc quản lý Saga in-memory có thể dẫn đến hậu quả gì khi gặp sự cố, và hướng giải quyết cụ thể ra sao?"**

> "Dạ, trong trường hợp Orchestrator (Order Service) bị sập đột ngột khi đang chạy Saga giữa chừng, do trạng thái Saga nằm ở in-memory nên tiến trình giao dịch đó sẽ bị thất lạc, dẫn đến dữ liệu giữa Catalog (đã giữ kho) và Order (chưa lưu) bị bất nhất vĩnh viễn mà không có giao dịch bù. Hướng giải quyết của đề tài trong tương lai là áp dụng mẫu thiết kế **Durable Saga**: lưu trạng thái máy trạng thái (Saga State) vào một cơ sở dữ liệu bền vững (như Redis persistence hoặc MongoDB) trước và sau mỗi bước chuyển trạng thái. Khi service khởi động lại, nó chỉ cần quét DB này để tiếp tục xử lý các giao dịch Saga còn dang dở hoặc kích hoạt các bước bù trừ tương ứng."

## Slide 32. Tổng kết báo cáo và Trình diễn hệ thống (Demo)

**Nhãn phần:** `05 · KẾT LUẬN`

### Dán lên slide

**Nội dung:**

- "Cảm ơn Hội đồng đã lắng nghe"
- Võ Đình Minh Quân · 22521193
- "Em xin phép chuyển sang phần demo"

### Demo script (5 phút) — Golden Flow

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

### Q&A phản biện

**Q: "Nếu trong lúc demo trực tiếp bị lỗi mạng hoặc sập server thì em sẽ xử lý như thế nào?"**

> "Dạ, chúng em đã chuẩn bị sẵn hai lớp phương án dự phòng (fallback) trong Appendix I. Lớp một: Kiểm tra dữ liệu trực tiếp trong database PostgreSQL và Redis Insight để chứng minh logic hệ thống vẫn chạy đúng dưới nền dù giao diện UI gặp độ trễ. Lớp hai: Sử dụng video ghi hình lại kịch bản Golden Flow chạy ổn định trong môi trường local sandbox với các logs và sự kiện hiển thị trực tiếp để chứng minh hoạt động thực tế của sản phẩm."

---

---

# APPENDIX — Chuẩn bị sẵn cho Q&A

---

## Appendix A. Service Boundaries (Full Table)

Bảng đầy đủ 7 service với dữ liệu sở hữu và quy tắc ranh giới.

**Source:** `AGENTS.md` — Service Boundaries section  
`thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

---

## Appendix B. Permission Matrix (RBAC)

| Role        | Số quyền | Phạm vi                            |
| ----------- | -------- | ---------------------------------- |
| SUPER_ADMIN | 62       | Toàn hệ thống                      |
| OWNER       | 38       | Tenant của mình                    |
| MANAGER     | 35       | Tenant của mình                    |
| WAITER      | 15       | Tenant của mình                    |
| CHEF        | 6        | Tenant của mình                    |
| BARISTA     | 6        | Tenant của mình                    |
| CUSTOMER    | —        | Không có RBAC role — session guard |

**Source:** `docs/architecture/permission-matrix.md`

---

## Appendix C. TenantGuard Implementation

```typescript
// libs/guards/src/lib/tenant.guard.ts
// Reject request nếu:
//   - Thiếu tenantId trong request context
//   - tenantId không khớp với danh tính đã xác thực
// Exception: SUPER_ADMIN và các route được loại trừ rõ ràng
```

**Source:** `libs/guards/src/lib/tenant.guard.ts`

---

## Appendix D. Order Confirm Saga — Full Code + Sequence

4 đoạn code quan trọng:

1. Lock + replay check tại Order (`order-confirm-saga.service.ts`)
2. Persistent reservation tại Catalog (`stock-reservation.service.ts`)
3. Commit version + outbox tại Order
4. Versioned compensation (`catalog-stock-gateway.service.ts`)

**Sequence chi tiết:** `thesis-report/assets/figures/chapter5-order-confirm-stock.pdf`

---

## Appendix E. Kafka Topics

| Topic                  | Phát bởi             | Tiêu thụ bởi |
| ---------------------- | -------------------- | ------------ |
| `order.confirmed`      | Order (via outbox)   | Kitchen      |
| `order.status_changed` | Order                | BFF/Client   |
| `payment.completed`    | Payment (via outbox) | Order        |
| `kitchen.sla_warning`  | Kitchen              | BFF/Alert    |
| `tenant.created`       | SaaS                 | User-Access  |

**Source:** `libs/constants/src/lib/kafka-topic.constants.ts`

---

## Appendix F. Sơ đồ: Cây quyết định lựa chọn phương thức giao tiếp (Kafka vs BFF Direct vs TCP)

> ⭐ **Sơ đồ quyết định kiến trúc.** Trình bày cây quyết định khoa học để lựa chọn tích hợp Kafka dựa trên khung quyết định 4P cốt lõi.

### Nội dung dán slide

- **Tiêu đề:** Khung quyết định 4P lựa chọn tích hợp Kafka
- **4 Tiêu chí lựa chọn (4P):**
  1. **P1 — Phản ứng chéo miền (Cross-Context Reaction):** Kích hoạt xử lý nghiệp vụ thuộc một ngữ cảnh (Bounded Context) độc lập khác.
  2. **P2 — Tách biệt thời gian (Temporal Decoupling):** Giải phóng thời gian chờ của luồng xử lý chính hoặc bắt nguồn từ các tác vụ nền (timers).
  3. **P3 — Gửi đi nhiều nơi (Fan-out):** Một sự kiện đơn lẻ được tiêu thụ song song bởi nhiều dịch vụ độc lập phía sau.
  4. **P4 — Bảo vệ tính nguyên tử (Atomicity Safeguard):** Đảm bảo sự kiện nghiệp vụ được cam kết nguyên tử với dữ liệu ghi cơ sở dữ liệu (Outbox).
- **Hình ảnh minh họa:** `chapter4-kafka-decision-flow.png`

### Kịch bản thuyết trình (~15s)

> "Dạ, sơ đồ này mô tả cây quyết định lựa chọn tích hợp Kafka của đề tài dựa trên khung 4P: bao gồm phản ứng chéo miền nghiệp vụ, tách biệt ràng buộc thời gian, phân phát sự kiện dạng fan-out tới nhiều dịch vụ, và bảo vệ tính nguyên tử của giao dịch qua Outbox."

---

## Appendix G. Redis KDS Key Structure

```
kds:{tenantId}:ticket:{ticketId}          → Hash (chi tiết ticket)
kds:{tenantId}:{station}                   → Sorted Set (hàng đợi FIFO/SLA)
kds:{tenantId}:dedupe:event:{eventId}      → Key deduplication
```

**Source:** `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`

---

## Appendix H. Payment Bridge Architecture

**Flow:**

```
SePay webhook → BFF (verify HMAC signature) → Payment Service
→ payment record + outbox "payment.completed"
→ Order consumer → bill finalization
```

**Source:**

- `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
- `apps/payment/src/app/modules/payment/tests/payment-completed-order-bridge.integration.spec.ts`

---

## Appendix I. Q&A — Góc nhìn kinh doanh

**Q: QRTable có phải nghiên cứu về mô hình kinh doanh không?**

> "Dạ không. Khóa luận dùng bài toán F&B như một technical case study. Chúng em không đánh giá mô hình doanh thu hay chiến lược thị trường. Phần chứng minh là kiến trúc multi-tenant, ranh giới dịch vụ, consistency và realtime."

**Q: Vì sao không dùng một POS có sẵn hoặc monolith?**

> "Dạ, các sản phẩm có sẵn không đủ tài liệu công khai để phân tích ranh giới dịch vụ và cơ chế nhất quán bên trong. Monolith đơn giản hơn ban đầu nhưng khóa luận muốn nghiên cứu cách tách ownership và xử lý chi phí phân tán của microservices."

**Q: Hệ thống có sẵn sàng production không?**

> "Dạ, đây là prototype/case study kỹ thuật. Các cơ chế đã được hiện thực và kiểm chứng phù hợp với phạm vi khóa luận. Production readiness cần thêm load test, live payment evidence và Saga hardening."

---

## Appendix J. E2E State Cross-Reference (Demo Backup)

| Bước        | PostgreSQL                              | Redis                            | Kafka               |
| ----------- | --------------------------------------- | -------------------------------- | ------------------- |
| QR Scan     | —                                       | `session:{tid}:{tableId}`        | —                   |
| Cart update | —                                       | `cart:{tid}:{sid}` (cartVersion) | —                   |
| Submit      | orders: PENDING · bills: OPEN           | —                                | —                   |
| Confirm     | orders: PROCESSING · stock_reservations | —                                | `order.confirmed`   |
| KDS         | —                                       | `kds:{tid}:{station}` ZSet       | —                   |
| Payment     | payment records · bills: PAID           | —                                | `payment.completed` |

---

## Appendix K. Scale-Out / K6 Evidence

**File:** `tools/scale-test/collect-scale-out-evidence.ts`
**Giải thích:** `docs/graduation-thesis-resources/scale-out-testing-detailed-explanation.vi.md`

Nếu có kết quả K6: hiển thị RPS, p95 latency, error rate theo số instance.

---

## Appendix L. Sơ đồ: Tổng quan mẫu Transactional Outbox và Saga

> ⭐ **Sơ đồ lý thuyết nền tảng.** Mô tả mối quan hệ giữa mô hình điều phối Saga và mẫu thiết kế Transactional Outbox để đảm bảo tính nhất quán dữ liệu chéo dịch vụ.

### Nội dung dán slide

- **Tiêu đề:** Tổng quan mô hình Outbox và Distributed Saga
- **Ý nghĩa:**
  - Khái quát hóa cách thức kết hợp giữa mô hình Saga điều phối (Saga Orchestrator) và mẫu thiết kế Transactional Outbox.
  - Minh họa luồng dữ liệu: Service chủ quản thực thi transaction cục bộ $\rightarrow$ ghi bản ghi nghiệp vụ và outbox event vào cùng database $\rightarrow$ Message Broker (Kafka) vận chuyển dữ liệu bất đồng bộ đến các dịch vụ tiêu thụ phía sau $\rightarrow$ đảm bảo tính nhất quán cuối cùng (Eventual Consistency).
- **Hình ảnh minh họa:** `chapter2-outbox-saga-overview.png`

### Kịch bản thuyết trình (~20s)

> "Dạ, sơ đồ này minh họa mối quan hệ kiến trúc tổng quát giữa bộ điều phối Saga và mẫu thiết kế Transactional Outbox. Ý tưởng cốt lõi là giải quyết bài toán Dual-Write (ghi database và gửi message broker bất đồng bộ). Bằng cách gom hành động ghi dữ liệu nghiệp vụ và ghi sự kiện vào Outbox Table trong cùng một transaction của database cục bộ, chúng em đảm bảo rằng sự kiện nghiệp vụ chắc chắn sẽ được phát hành thành công sang Kafka qua tiến trình Outbox Relay, thiết lập cơ sở cho sự nhất quán cuối cùng của Saga."

---

## Appendix M. Sơ đồ: Biên commit và xử lý outbox (Order Confirm Saga)

> ⭐ **Sơ đồ chi tiết biên giao dịch.** Làm rõ ranh giới commit dữ liệu cục bộ và tính nguyên tử khi kích hoạt Outbox Relay.

### Nội dung dán slide

- **Tiêu đề:** Biên Commit và Ghi nhận Outbox (Commit Boundary)
- **Ý nghĩa:**
  - Xác định ranh giới commit của database cục bộ tại Order Service.
  - Bảo đảm ghi nhận đồng thời đơn hàng và thông điệp sự kiện (`order.confirmed`) vào Outbox Table trong cùng một transaction ACID cục bộ.
  - Ngăn ngừa tình trạng ghi nhận đơn hàng thành công nhưng sự kiện đẩy sang bếp bị thất lạc khi sập mạng (Dual-write problem).
- **Hình ảnh minh họa:** `chapter5-order-confirm-commit-boundary.png`

### Kịch bản thuyết trình (~20s)

> "Dạ, đây là sơ đồ chi tiết về biên commit giao dịch trong luồng xác nhận đơn. Sơ đồ mô tả thời điểm ranh giới mà Order Service đóng băng transaction cục bộ để cam kết dữ liệu xuống đĩa cùng với bản ghi Outbox. Chỉ khi biên này hoàn tất thành công, Outbox Relay mới quét và phát tán sự kiện đi. Thiết kế này giúp cô lập hoàn toàn giao dịch cục bộ và bảo vệ hệ thống khỏi sự bất nhất nếu mạng bị ngắt quãng giữa chừng."

---

## Appendix N. Sơ đồ: Luồng giao dịch bù trừ (Order Confirm Compensation)

> ⭐ **Sơ đồ xử lý nhánh lỗi.** Giải thích chi tiết các bước rollback để giải phóng tài nguyên khi giao dịch bị gãy.

### Nội dung dán slide

- **Tiêu đề:** Luồng giao dịch bù trừ (Compensating Transactions)
- **Ý nghĩa:**
  - Mô tả quy trình rollback dữ liệu khi một bước trong chuỗi xác nhận đơn bị lỗi (Catalog Service từ chối, timeout, sập kết nối).
  - Order Service (Orchestrator) tự động phát đi tín hiệu bù chặng `cancel_stock_reservation` sang Catalog Service để giải phóng số lượng món ăn đã giữ.
  - Đảm bảo trả lại trạng thái tồn kho chính xác, tránh rò rỉ tài nguyên.
- **Hình ảnh minh họa:** `chapter5-order-confirm-compensation.png`

### Kịch bản thuyết trình (~20s)

> "Dạ, sơ đồ này mô tả chi tiết nhánh lỗi và quy trình bù trừ khi xác nhận đơn hàng thất bại. Khi Catalog Service phản hồi không đủ hàng hoặc xảy ra lỗi kết nối, Order Service với tư cách là Orchestrator sẽ kích hoạt giao dịch bù, gửi lệnh hủy giữ kho cục bộ tại Catalog Service. Việc này giúp thu hồi chính xác số lượng món ăn đã tạm khóa và khôi phục trạng thái nhất quán ban đầu của hệ thống."

---

## Appendix O. Sơ đồ: Xử lý trùng lặp & Idempotency (Order Confirm Saga)

> ⭐ **Sơ đồ an toàn dữ liệu.** Chứng minh cơ chế xử lý trùng lặp thông điệp và chính sách thử lại chéo dịch vụ.

### Nội dung dán slide

- **Tiêu đề:** Xử lý trùng lặp và Chính sách thử lại (Idempotency & Retry Policy)
- **Ý nghĩa:**
  - Cơ chế deduplication tại Catalog Service khi Order Service gửi lại yêu cầu do lỗi timeout/mất phản hồi mạng.
  - Sử dụng bảng lưu vết `stock_reservation_versions` với khóa duy nhất là `order_id` + `action` làm cơ chế Idempotency Key.
  - Tránh side-effect trừ kho nhiều lần cho cùng một yêu cầu gửi lại.
- **Hình ảnh minh họa:** `chapter5-order-confirm-idempotency-retry.png`

### Kịch bản thuyết trình (~20s)

> "Dạ, đây là cơ chế xử lý trùng lặp và chính sách thử lại chéo dịch vụ. Trong hệ thống phân tán, do mạng không ổn định, một thông điệp có thể được gửi đi nhiều lần. Sơ đồ minh họa cách Catalog Service sử dụng bảng phiên bản giữ kho (Reservation Version) để nhận diện các yêu cầu bị trùng lặp dựa trên Order ID. Nếu nhận được yêu cầu trùng, hệ thống chỉ trả về kết quả đã xử lý mà không thực thi lại, đảm bảo tính Idempotency tuyệt đối."

---

## Appendix P. Sơ đồ: Tích hợp Outbox sang KDS Kitchen

> ⭐ **Sơ đồ tích hợp bất đồng bộ.** Làm rõ hành trình của outbox event đi qua Kafka Broker đến bếp.

### Nội dung dán slide

- **Tiêu đề:** Tích hợp Transactional Outbox sang KDS (Kitchen Ingestion)
- **Ý nghĩa:**
  - Mô tả chi tiết hành trình của bản ghi Outbox được quét bởi Outbox Relay từ database và đẩy sang Kafka topic `order.confirmed`.
  - Kitchen Service lắng nghe event, thực hiện giải mã (deduplication) để đảm bảo không tạo vé bếp trùng lặp.
  - Đẩy trạng thái xuống KDS màn hình bếp qua WebSocket realtime.
- **Hình ảnh minh họa:** `chapter5-order-confirm-outbox-kds.png`

### Kịch bản thuyết trình (~20s)

> "Dạ, sơ đồ này thể hiện chi tiết hành trình vận chuyển thông điệp từ bảng Outbox ở Order DB qua Kafka Broker và đi vào Kitchen Service để đẩy lên màn hình KDS. Sơ đồ chứng minh cơ chế tích hợp bất đồng bộ hoàn toàn (Loosely Coupled), giúp Kitchen Service tự cô lập xử lý và cập nhật trạng thái hiển thị bếp thời gian thực thông qua kết nối WebSocket mà không gây ảnh hưởng đến hiệu năng ghi đơn của Order Service."

---

## Appendix Q. Sơ đồ: Luồng chính khởi tạo tài nguyên đa thuê (SaaS Tenant Provisioning)

> ⭐ **Sơ đồ onboarding đa thuê.** Giải thích chuỗi giao dịch tạo cơ sở dữ liệu biệt lập chéo dịch vụ cho khách hàng mới.

### Nội dung dán slide

- **Tiêu đề:** Khởi tạo tài nguyên đa thuê (SaaS Tenant Provisioning Flow)
- **Ý nghĩa:**
  - Chuỗi giao dịch Saga dài chéo nhiều hệ thống để onboarding một Tenant mới đăng ký.
  - Các bước thực thi: Tạo tài khoản Tenant $\rightarrow$ Tạo database Postgres riêng biệt $\rightarrow$ Đăng ký tài khoản quản trị viên và phân quyền chéo trên Keycloak Server.
- **Hình ảnh minh họa:** `chapter5-saas-onboarding-saga.png`

### Kịch bản thuyết trình (~20s)

> "Dạ, sơ đồ này minh họa quy trình cấp phát tài nguyên phân tán (SaaS Tenant Provisioning) chéo qua 3 miền hệ thống: Miền quản lý trạng thái thuê bao (SaaS Service), Miền lưu trữ dữ liệu biệt lập (PostgreSQL Dynamic Database Provisioning), và Miền kiểm soát định danh (Keycloak Identity Provider). Saga Orchestrator đóng vai trò là một điều phối viên trung tâm, đảm bảo các nguồn tài nguyên rời rạc được cấu hình đồng bộ và chính xác cho doanh nghiệp mới mà không làm phá vỡ biên an toàn cô lập đa thuê."

---

## Appendix R. Sơ đồ: Luồng giao dịch bù trừ khi khởi tạo lỗi (SaaS Provisioning Compensation)

> ⭐ **Sơ đồ rollback hạ tầng đa thuê.** Thể hiện cơ chế thu hồi và dọn dẹp tài nguyên tự động khi gặp sự cố cài đặt.

### Nội dung dán slide

- **Tiêu đề:** Giao dịch bù trừ khởi tạo SaaS (SaaS Provisioning Compensation Flow)
- **Ý nghĩa:**
  - Cơ chế tự động dọn dẹp và thu hồi tài nguyên (Clean-up & Rollback) khi bất kỳ một bước nào trong chuỗi onboarding Tenant mới gặp sự cố (như lỗi kết nối Keycloak).
  - Các bước bù trừ: Xóa database Postgres của tenant vừa khởi tạo $\rightarrow$ Thu hồi tài khoản admin vừa tạo $\rightarrow$ Đưa trạng thái Tenant về `FAILED_TO_PROVISION` để đối soát.
- **Hình ảnh minh họa:** `chapter5-saas-onboarding-compensation.png`

### Kịch bản thuyết trình (~20s)

> "Dạ, đây là cơ chế rollback hạ tầng tự động khi có sự cố trong chuỗi onboarding. Do quy trình này tương tác trực tiếp với các tài nguyên hệ thống thực tế (như tạo cơ sở dữ liệu vật lý và tài khoản bảo mật), bất kỳ lỗi nào xảy ra ở bước sau cũng sẽ làm rò rỉ tài nguyên. Saga Orchestrator sẽ kích hoạt luồng bù trừ theo thứ tự đảo ngược, thực hiện giải phóng tài nguyên vật lý và khôi phục trạng thái hệ thống về điểm an toàn trước khi thực hiện, đảm bảo tính toàn vẹn và sạch sẽ của hạ tầng đa thuê."

---

## Appendix S. Cơ sở Lý thuyết & Tài liệu tham chiếu gốc (Theoretical Foundations & Citations)

> ⭐ **Bằng chứng học thuật gốc.** Hệ thống hóa các bài báo khoa học, RFC quốc tế và tài liệu tham chiếu làm nền tảng lý thuyết chứng minh tính quy chuẩn của thiết kế tham chiếu QRTable.

### Nội dung dán slide

- **Tiêu đề:** Nguồn gốc các Tiêu chuẩn & Tài liệu tham chiếu học thuật
- **Mô hình Cloud SaaS & Multi-Tenant:**
  - _NIST SP 800-145 (Mell & Grance, 2011):_ Định nghĩa chính thống của chính phủ Mỹ về Điện toán đám mây.
  - _Microsoft Azure Architecture Center:_ Hướng dẫn thực tế thiết kế cô lập dữ liệu đa thuê (Tenant Isolation).
- **Kiến trúc Microservices & Boundary:**
  - _Sam Newman (2021) - "Monolith to Microservices":_ Phân rã dựa trên ranh giới ngữ cảnh giới hạn (Bounded Context) từ DDD.
  - _Chris Richardson (2018) - "Microservices Patterns":_ Định nghĩa chuẩn thiết kế _Database-per-service_.
- **Giao dịch phân tán & Nhất quán:**
  - _Garcia-Molina & Salem (1987) - "Sagas":_ Bài báo khoa học gốc định nghĩa mẫu thiết kế Saga cho giao dịch kéo dài (Long-Lived Transactions).
  - _Chris Richardson (2018) - "Transactional Outbox Pattern":_ Giải pháp triệt tiêu rủi ro ghi kép (Dual-Write).
- **Tương tác hướng sự kiện & Bảo mật:**
  - _Martin Fowler (2017) - "Event Notification Pattern":_ Mô hình phát tán sự kiện tối giản kết hợp KDS runtime projection.
  - _RFC 6455 (WebSocket), RFC 7519 (JWT), OWASP ASVS:_ Chuẩn truyền dẫn realtime và khung bảo mật xác thực phân tầng.

### Kịch bản thuyết trình (~20s)

> "Dạ thưa Hội đồng, để chứng minh thiết kế tham chiếu của đề tài là quy chuẩn và khoa học, chúng em đã tuân thủ nghiêm ngặt các tiêu chuẩn quốc tế và nghiên cứu khoa học gốc. Cụ thể, mô hình SaaS dựa trên NIST SP 800-145; thiết kế dịch vụ và DB độc lập tuân thủ nguyên lý Bounded Context của Sam Newman và Chris Richardson; luồng giao dịch phân tán dựa trên nghiên cứu Saga gốc năm 1987 của Garcia-Molina và Transactional Outbox; và các giao tiếp realtime, bảo mật đều đạt chuẩn RFC và khung OWASP ASVS."

---

# Checklist Trước Buổi Bảo Vệ

- [ ] Đọc to toàn bộ 28 slide script → tổng ≤ 10 phút
- [ ] Slide 3 (Hiện trạng quy trình QR) tạo được "wow moment" trong 45 giây đầu
- [ ] Slide 4 (Động cơ nghiên cứu) trả lời được câu hỏi vì sao chọn F&B/QR
- [ ] Slide 5 (Mục tiêu & Phạm vi) phân rã rõ ranh giới nghiên cứu kỹ thuật và giới hạn đề tài
- [ ] Slide 17 (Saga) có sequence diagram rõ ràng với 5 lane
- [ ] Slide 23 (Saga Tests) có bảng 6 invariants với loại test
- [ ] Không slide nào vi phạm "không nói quá"
- [ ] WebSocket = hint/refetch (không phải source of truth)
- [ ] Redis = projection/cache (không phải database nghiệp vụ)
- [ ] Demo có fallback đầy đủ
- [ ] Appendix A–S đã sẵn sàng
- [ ] Số liệu Allure (test count) đã reconcile trước khi freeze slide
- [ ] K6 slide (25): có evidence thì thêm, không có thì dùng Traceability Matrix

---

_Phiên bản v2 — Refactor theo narrative 5-ACT. File gốc tham chiếu: `thesis-defense-slide-builder-script.md`_
