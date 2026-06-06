# Plan - Refactor giọng phạm vi/giới hạn Chương 3, 5 và 7

> **For agentic workers:** REQUIRED SUB-SKILL: dùng `zoom-out` để giữ đúng vai trò từng chương, dùng `grill-with-docs` để audit contradiction/overclaim, và dùng `doc-coauthoring` nếu cần polish giọng văn. Steps dùng checkbox (`- [ ]`) để tracking.

**Goal:** Điều chỉnh Chương 3, Chương 5 và Chương 7 để các giới hạn của đề tài được gom đúng chỗ, giảm giọng văn phòng thủ trong phần phân tích/triển khai, nhưng vẫn giữ claim policy học thuật và không phóng đại kết quả.

**Architecture:** Chương 1 là nơi neo phạm vi đề tài; Chương 3 chỉ giữ ranh giới yêu cầu cần thiết; Chương 5 trình bày implementation evidence theo luồng mà không lặp disclaimer; Chương 7 tổng kết hạn chế còn lại và hướng phát triển. Chương 6 vẫn là nơi đánh giá mức bằng chứng, nhưng không thuộc phạm vi chỉnh chính của plan này trừ khi người viết phê duyệt follow-up riêng.

**Tech Stack / Writing Stack:** LaTeX, Vietnamese academic prose, `rg` audit, XeLaTeX build, internal evidence docs và current chapter `.tex`.

---

## 1. Dependency bắt buộc

Plan này nên chạy sau khi `chapter-01-opening-draft-plan.md` đã được thực thi, hoặc ít nhất sau khi mục `1.5. Đối tượng và phạm vi nghiên cứu` đã có bản draft đủ rõ.

Lý do: nếu Chương 1 chưa có điểm neo phạm vi, việc rút các câu "giới hạn", "chưa khẳng định", "không thuộc phạm vi" khỏi Chương 3/5 sẽ làm khóa luận mất hàng rào claim. Ngược lại, khi Chương 1 đã chốt phạm vi, Chương 3/5 có thể viết tự tin hơn mà vẫn an toàn học thuật.

Hard constraints mới từ người viết:

- Phase 7 deployment là chắc chắn sẽ triển khai; không viết deployment/pilot như một khả năng tùy chọn hoặc một hạn chế mặc định.
- Technical Phase 6/observability không đưa vào Chương 3, Chương 5 hoặc Chương 7, kể cả dưới dạng mục ngoài phạm vi hoặc hướng phát triển.

## 2. Policy phân bổ nội dung phạm vi

| Vị trí   | Vai trò sau refactor                            | Giữ gì                                                                                  | Rút bớt gì                                                                    |
| -------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Chương 1 | Đối tượng và phạm vi nghiên cứu của toàn đề tài | In-scope, out-of-scope, mục tiêu đánh giá                                               | Chi tiết implementation-level                                                 |
| Chương 3 | Phân tích yêu cầu và ranh giới nghiệp vụ        | Actor, use case, FR/NFR, state machine, requirement boundary                            | Danh sách loại trừ dài, claim policy giống chương đánh giá                    |
| Chương 5 | Hiện thực luồng vận hành cốt lõi                | Mục tiêu luồng, bất biến, service owner, code/test/diagram evidence, trade-off kỹ thuật | Câu "giới hạn của luồng", "chưa khẳng định", "Chương 6 không được..." lặp lại |
| Chương 6 | Kiểm chứng và đánh giá                          | Claim levels, evaluation limitations, evidence classification                           | Không chỉnh trong plan này nếu không có yêu cầu riêng                         |
| Chương 7 | Kết luận, hạn chế, hướng phát triển             | Hạn chế còn lại, future work, production/pilot artifacts sau Phase 7                    | Lặp lại quá chi tiết các disclaimer đã có ở Chương 1/6                        |

Nguyên tắc: không xóa giới hạn học thuật; chỉ chuyển nó về đúng tầng trình bày.

## 2.1. Second-pass semantic tone audit

Plan này không chỉ xử lý các cụm nổi bật như `Giới hạn của luồng`, `chưa khẳng định` hoặc `ở mức thiết kế`. Sau khi patch lần đầu, agent phải đọc lại toàn bộ Chương 3, Chương 5 và Chương 7 để tìm các biến thể cùng giọng văn phòng thủ, kể cả khi chúng không trùng regex ban đầu.

Các pattern cần phân loại thủ công:

| Pattern                                                           | Rủi ro                                                      | Cách xử lý                                                                                                                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chỉ ... mức`, `chỉ đặt ra`, `chỉ kết luận`, `chỉ đóng vai trò`   | Làm câu giống lời tự hạ thấp kết quả                        | Chỉ giữ khi cần phân biệt vai trò kỹ thuật; còn lại đổi sang giọng chủ động như `xác định`, `làm cơ sở`, `được dùng để`, `được đánh giá bằng`.         |
| `ở mức thiết kế`, `mức yêu cầu`, `mức phù hợp`, `mức mô hình đọc` | Dễ biến claim thành disclaimer mơ hồ                        | Viết rõ loại bằng chứng: `dựa trên ranh giới kiến trúc`, `bằng kiểm thử nội bộ`, `bằng artifact Phase 7`, `bằng mô hình đọc vận hành`.                 |
| `chưa`, `chưa đủ`, `chưa có`                                      | Hợp lệ ở Chương 7/hạn chế, nhưng yếu ở Chương 3/5           | Chương 3/5 ưu tiên câu tích cực + ranh giới đánh giá; Chương 7 được giữ nếu là hạn chế tổng hợp.                                                       |
| `nếu có`, `khi có`, `trước khi có`, `sau khi có`                  | Làm Phase 7/deployment nghe như tùy chọn                    | Với deployment/pilot, viết là artifact Phase 7 chắc chắn sẽ thu; chỉ dùng điều kiện để phân biệt `đã có hiện vật` và `chưa backfill vào bản hiện tại`. |
| `có thể`, `cần được`, `sẽ được đánh giá ở Chương 6`               | Giọng meta, giống ghi chú nội bộ cho agent                  | Trong prose chính, đổi sang mạch trực tiếp: `Chương 6 sử dụng...`, `Bảng ... phân loại...`, hoặc bỏ nếu Chương 5 đã đủ rõ.                             |
| `không được`, `không thay thế`, `không phải`                      | Có thể cần cho invariant, nhưng lạm dụng sẽ thành phòng thủ | Giữ khi là bất biến kỹ thuật; rewrite khi đang nói về giới hạn thesis hoặc tự biện hộ.                                                                 |

Yêu cầu quan trọng: audit này là semantic review, không phải zero-hit regex máy móc. Một hit trong Chương 7 có thể hợp lệ vì đây là chương kết luận/hạn chế; một hit tương tự ở Chương 5 có thể là debt vì Chương 5 phải đọc như implementation evidence. Agent phải ghi nhận trong final/workflow những hit còn giữ lại là intentional.

## 3. Files

**Modify chính:**

- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`

**Modify bắt buộc cuối session:**

- `docs/graduation-thesis-resources/thesis-workflow-plan.md`

**Read-only context bắt buộc:**

- `docs/graduation-thesis-resources/chapter-01-opening-draft-plan.md`
- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/graduation-thesis-resources/thesis-official-outline.md`
- `docs/graduation-thesis-resources/thesis-evidence-map.md`
- `docs/graduation-thesis-resources/thesis-source-backbone.md`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`

**Không sửa mặc định:**

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/graduation-thesis-resources/thesis-report/references.bib`

Ghi chú về Chương 6: trước đó có concern về cụm "ở mức thiết kế". Plan này chỉ cross-check để không mâu thuẫn với Chương 6. Nếu muốn đổi title/câu trong Chương 6, tạo mini-plan hoặc checkpoint riêng sau khi người viết đồng ý.

## 4. Preflight bắt buộc

- [ ] Chạy CodeGraph trước khi sửa:

```bash
/Users/vodinhquan/.local/bin/codegraph status .
```

Expected: index up-to-date. Nếu CodeGraph không phủ thesis `.tex`, ghi nhận và dùng `rg`/đọc file trực tiếp.

- [ ] Xác nhận Chương 1 đã có mục phạm vi:

```bash
sed -n '1,220p' docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
```

Expected: `\section{Đối tượng và phạm vi nghiên cứu}` có nội dung thật. Nếu section vẫn rỗng, dừng refactor sâu và thực thi plan Chương 1 trước.

- [ ] Audit các cụm giọng phòng thủ:

```bash
rg -n "Giới hạn|giới hạn|chưa khẳng định|không thuộc phạm vi|không bao gồm|chỉ .*mức|ở mức thiết kế|không được viết|không kết luận|Ranh giới phạm vi" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Expected: có hit ở Chương 3, Chương 5 và Chương 7. Dùng danh sách này làm baseline trước/sau.

- [ ] Đọc Chương 6 để không làm mất claim policy:

```bash
rg -n "\\\\section|giới hạn|bằng chứng|kiểm chứng|thiết kế|hiệu năng|khả năng mở rộng|SePay|Saga|production" docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex
```

Expected: xác định Chương 6 đang giữ vai trò đánh giá, không duplicate vào Chương 5. Không dùng audit này để mở thêm nội dung Technical Phase 6/observability trong thesis.

## 5. Refactor Chương 3

### 5.1. Mục tiêu

Chương 3 phải trả lời: hệ thống cần phục vụ actor nào, use case nào, yêu cầu chức năng/phi chức năng nào và state machine nào. Chương này có thể có một mục ranh giới ngắn, nhưng không nên biến thành danh sách "không làm" dài.

### 5.2. Target hiện tại

Các điểm cần xử lý:

- Section hiện tại: `\section{Ranh giới phạm vi và giới hạn của các khẳng định đánh giá}`
- Đoạn dài liệt kê performance, Technical Phase 6/observability, offline, notification, HRM, CRM, native mobile, delivery integration, BI/AI, SePay provider verification.
- Một số câu trong NFR table dùng giọng "chỉ phân tích ở mức thiết kế" và "không khẳng định" giống Chương 6.

### 5.3. Proposed rewrite

Đổi section title sang một title ít phòng thủ hơn:

```latex
\section{Phạm vi yêu cầu của QRTable}
```

Nội dung section sau refactor nên gồm 3 đoạn:

1. Đoạn in-scope: nhắc lại QRTable tập trung POS SaaS F&B, QR session/cart/order, KDS, payment, tenant/subscription, RBAC, dashboard/reporting MVP.
2. Đoạn boundary: các yêu cầu nâng cao như HRM, CRM, BI/AI, native mobile, offline queue đầy đủ và tích hợp giao đồ ăn được xem là ngoài phạm vi yêu cầu chính, đã được neo ở Chương 1 và sẽ quay lại ở Chương 7 nếu cần.
3. Đoạn handoff: Chương 4-6 sẽ thiết kế, hiện thực và đánh giá theo yêu cầu đã chốt, còn mức bằng chứng chi tiết thuộc Chương 6.

Mẫu giọng văn:

```latex
Phạm vi yêu cầu của QRTable tập trung vào các năng lực cần thiết để một tenant F\&B vận hành quy trình đặt món tại bàn: quản lý tenant và gói thuê bao, thực đơn, bàn và mã QR, phiên khách, giỏ món, đơn hàng, KDS, thanh toán, phân quyền và báo cáo vận hành mức MVP. Các yêu cầu này là cơ sở để Chương 4 thiết kế ranh giới dịch vụ, Chương 5 trình bày các luồng triển khai và Chương 6 đánh giá mức đáp ứng.

Các năng lực mở rộng như quản trị nhân sự nâng cao, CRM/loyalty, kho dữ liệu phân tích, BI/AI, ứng dụng di động gốc, hàng đợi thao tác ngoại tuyến đầy đủ hoặc tích hợp sâu với nền tảng giao đồ ăn không nằm trong kết quả chính của khóa luận. Việc đặt ranh giới này giúp phần đánh giá tập trung vào các luồng cốt lõi thay vì mở rộng sang những miền sản phẩm cần thời gian triển khai và kiểm chứng riêng.
```

Không nhất thiết copy nguyên văn mẫu; dùng nó làm chuẩn tone.

### 5.4. NFR table cleanup

Trong bảng NFR, giữ claim cẩn trọng nhưng đổi giọng:

- `Khả mở rộng ở mức thiết kế` có thể giữ nếu đó là tên thuộc tính, nhưng cột tiêu chí nên viết:
  - Từ: "Chỉ phân tích ở mức thiết kế nếu chưa có đo lường tải lớn; không tự khẳng định..."
  - Sang: "Đánh giá bằng lập luận kiến trúc và bằng chứng ranh giới dịch vụ; phép đo tải lớn được xếp vào hướng phát triển nếu chưa có số liệu thực nghiệm."

- `Khả năng quan sát vận hành`:
  - Technical Phase 6/observability không đưa vào nội dung khóa luận. Nếu Chương 3 đang có dòng NFR riêng về quan sát vận hành, rút dòng đó khỏi nhóm yêu cầu đánh giá chính hoặc gộp rất ngắn vào ghi chú nội bộ/workflow, không viết thành mục thesis.

## 6. Refactor Chương 5

### 6.1. Mục tiêu

Chương 5 phải đọc như bằng chứng implementation, không như danh sách tự biện hộ. Các đoạn vẫn cần nói ranh giới kỹ thuật, nhưng bằng ngôn ngữ "trade-off", "mức chứng minh", "handoff sang đánh giá/hướng phát triển" thay vì "giới hạn cần nhấn mạnh".

### 6.2. Target hiện tại và hướng sửa

#### Intro Chương 5

Current pattern:

```text
... bằng chứng triển khai và giới hạn cần diễn đạt thận trọng.
```

Rewrite hướng đề xuất:

```text
... bằng chứng triển khai và ranh giới kỹ thuật cần dùng khi đánh giá kết quả.
```

#### Luồng QR session/cart/order

Current pattern:

```text
Giới hạn của luồng là hàng đợi thao tác ngoại tuyến đầy đủ...
```

Rewrite hướng đề xuất:

```text
Luồng này tập trung vào phiên/giỏ trực tuyến có kiểm soát phiên bản và cơ chế kết nối lại. Hàng đợi thao tác ngoại tuyến đầy đủ được xếp vào hướng phát triển vì cần thêm đồng bộ nền và xử lý xung đột cho nhiều thiết bị.
```

#### Order confirmation / Saga

Current pattern:

```text
Giới hạn cần giữ trong diễn đạt là QRTable áp dụng Saga có kiểm soát...
```

Rewrite hướng đề xuất:

```text
Trong phạm vi triển khai, Order Confirm Saga là luồng đại diện để chứng minh cách QRTable phối hợp transaction cục bộ, outbox event và compensation khi xác nhận đơn. Các cơ chế hardening như durable saga state, CDC hoặc exactly-once delivery được bàn như hướng phát triển thay vì là điều kiện để luồng đại diện có giá trị.
```

#### KDS

Current pattern:

```text
Giới hạn của luồng là bản chiếu KDS khi vận hành chưa thay thế được lịch sử nghiệp vụ dài hạn...
```

Rewrite hướng đề xuất:

```text
KDS trong Chương 5 được trình bày như bản chiếu vận hành thời gian gần thực cho bếp/bar. Lịch sử bếp dài hạn hoặc phân tích chuyên sâu phù hợp hơn với bản chiếu bền vững/kho phân tích trong hướng phát triển.
```

#### Payment / SePay

Current pattern:

```text
Giới hạn cần nhấn mạnh là ... Chương 6 không được khẳng định...
```

Rewrite hướng đề xuất:

```text
Phần triển khai payment chứng minh đường cơ sở xử lý tiền mặt, VietQR/SePay webhook, duplicate webhook và thanh toán thiếu bằng mã nguồn/kiểm thử nội bộ. Phase 7 chắc chắn triển khai môi trường thật để thu callback public, credential hợp lệ và dữ liệu giao dịch thật; trước khi artifact đó được backfill, không viết như đã kiểm chứng với nhà cung cấp thật.
```

#### Dashboard/reporting

Current pattern:

```text
Giới hạn của phần này là báo cáo hiện là mô hình đọc tối thiểu trực tiếp...
```

Rewrite hướng đề xuất:

```text
Dashboard/reporting trong Chương 5 được chứng minh ở mức mô hình đọc vận hành và entitlement theo gói. Các năng lực phân tích nâng cao như forecasting, staff performance analytics, realtime revenue stream hoặc data warehouse được giữ cho hướng phát triển.
```

#### Deployment/pilot Phase 7

Current pattern:

```text
Trước khi có các minh chứng đó, khóa luận chỉ kết luận...
```

Rewrite hướng đề xuất:

```text
Phần đóng gói triển khai là cầu nối trực tiếp sang Phase 7, bước chắc chắn sẽ triển khai hệ thống và thu minh chứng bằng URL/domain, HTTPS, health check, smoke test, callback public và log rút gọn. Khi refactor Chương 5, viết phần này như một nhánh công việc chắc chắn có artifact sẽ được backfill; không dùng giọng "nếu có môi trường thật". Những thuộc tính như high availability hoặc rollback tự động không phải kết quả chính nếu chưa có hiện vật riêng; không mở Technical Phase 6/observability trong khóa luận.
```

#### Bảng 5.1

Đổi cột:

- Từ: `Giới hạn`
- Sang một trong hai:
  - `Ranh giới đánh giá`
  - `Ghi chú đánh giá`

Khuyến nghị: `Ranh giới đánh giá`, vì rõ hơn và vẫn giữ tính học thuật.

Đổi prose trước bảng:

- Từ: "bằng chứng và giới hạn"
- Sang: "bằng chứng và ranh giới đánh giá".

### 6.3. Guardrail khi sửa Chương 5

Không được xóa các thông tin sau:

- Cart version/conflict behavior.
- Stock trừ ở staff confirmation, không trừ lúc customer submit.
- Outbox `order.confirmed` và async KDS.
- WebSocket chỉ là hint/refetch, không phải source of truth.
- Payment idempotency và duplicate/underpayment handling.
- SePay live/provider evidence cần phân loại ở Chương 6 nếu chưa có artifact thật.
- Dashboard entitlement `report.read_own`, `report.read_any`, `analytics_basic`.
- Production/pilot là artifact chắc chắn sẽ thu trong Phase 7; chỉ claim kết quả đã kiểm chứng sau khi hiện vật thật được backfill.

## 7. Refactor Chương 7

### 7.1. Mục tiêu

Chương 7 được phép có phần hạn chế, vì đây là kết luận và hướng phát triển. Tuy nhiên phần này nên là tổng hợp ngắn, không lặp lại chi tiết disclaimer từng luồng đã rút khỏi Chương 5.

### 7.2. Target hiện tại

Các đoạn cần polish:

- Mở đầu Chương 7 có thể giữ vì đã nói đúng vai trò kết luận.
- Đoạn về production/pilot ở phần kết luận nên viết như kết quả/artifact Phase 7 sau khi đã backfill; trước thời điểm đó chỉ để wording trung tính, không biến thành hạn chế mặc định.
- Section `Hạn chế còn lại` hiện hợp lý về vị trí, nhưng một số câu dùng "chưa" nhiều và có thể viết cân bằng hơn.
- Hướng phát triển hiện khá tốt; chỉ cần align với Chương 1 scope sau khi refactor.

### 7.3. Proposed rewrite direction

Giữ section `\section{Hạn chế còn lại}` hoặc đổi nhẹ thành:

```latex
\section{Hạn chế của đề tài}
```

Nếu giữ title hiện tại, vẫn chấp nhận được.

Các hạn chế nên gom thành 4 nhóm, không đưa deployment/pilot vào hạn chế mặc định vì Phase 7 chắc chắn sẽ triển khai và backfill artifact:

1. Chưa có đo lường runtime tải lớn bằng số liệu thực nghiệm.
2. High availability hoặc rollback tự động là hướng hardening vận hành nếu chưa có hiện vật riêng.
3. SaaS onboarding và payment provider live cần thêm kiểm chứng end-to-end trên môi trường thật nếu artifact Phase 7 chưa phủ đủ trường hợp đó.
4. Các miền sản phẩm nâng cao như BI/AI, HRM, CRM, offline queue, native mobile không thuộc kết quả chính.

Mẫu giọng văn:

```latex
Hạn chế đầu tiên nằm ở lớp đo lường thực nghiệm. Khóa luận đã phân tích cơ sở kiến trúc cho khả năng mở rộng thông qua ranh giới dịch vụ, cache, hàng đợi và WebSocket, nhưng chưa có bộ benchmark tải lớn với môi trường, dữ liệu và cấu hình được công bố đầy đủ. Vì vậy các kết luận về hiệu năng nên được hiểu là phân tích kiến trúc và định hướng kiểm chứng tiếp theo.
```

Mẫu trên tránh "chỉ đánh giá ... ở mức thiết kế" nhưng vẫn không overclaim.

### 7.4. Hướng phát triển

Hướng phát triển nên follow trực tiếp các hạn chế, không mở quá rộng. Không đưa việc backfill production/pilot evidence vào hướng phát triển của thesis; đó là việc chắc chắn thực hiện trong Phase 7 và phải được cập nhật vào kết quả khi artifact đã có.

- Load/performance benchmark.
- High availability hoặc rollback hardening nếu cần sau bản nộp; không mở hướng observability/SLO.
- Full Saga hardening và integration tests end-to-end.
- Analytics/reporting nâng cao.
- Offline support và mobile app nếu muốn mở rộng sản phẩm.

## 8. Execution checklist

- [ ] Check dirty state:

```bash
git status --short
```

Expected: worktree có thể dirty; không revert thay đổi không thuộc lượt này.

- [ ] Xác nhận Chương 1 scope tồn tại:

```bash
rg -n "\\\\section\\{Đối tượng và phạm vi nghiên cứu\\}|ngoài phạm vi|trong phạm vi|Đối tượng nghiên cứu" docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
```

Expected: có nội dung scope. Nếu chưa có, dừng.

- [ ] Baseline audit trước sửa:

```bash
rg -n "Giới hạn|giới hạn|chưa khẳng định|không thuộc phạm vi|không bao gồm|chỉ .*mức|ở mức thiết kế|không được viết|không kết luận|Ranh giới phạm vi" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Expected: lưu mental note số lượng và vị trí hit.

- [ ] Baseline semantic tone audit:

```bash
rg -n "chỉ .*mức|chỉ đặt ra|chỉ kết luận|chỉ đóng vai trò|ở mức|mức yêu cầu|mức phù hợp|mức mô hình đọc|chưa|nếu có|khi có|trước khi có|sau khi có|có thể|cần được|sẽ được đánh giá|không được|không thay thế|không phải" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Expected: không sửa máy móc mọi hit. Phân loại từng hit theo vai trò chương: Chương 3/5 ưu tiên rewrite nếu câu giống disclaimer; Chương 7 được giữ hạn chế thật nhưng phải gom nhóm và viết cân bằng.

- [ ] Patch Chương 3:

Expected:

- Section scope đổi title hoặc nội dung sang `Phạm vi yêu cầu của QRTable`.
- Danh sách loại trừ dài được rút còn 2-3 đoạn.
- Các dòng NFR không dùng giọng lệnh cấm quá mạnh.

- [ ] Patch Chương 5:

Expected:

- Không còn cụm `Giới hạn của luồng`.
- Không còn cụm `Giới hạn cần nhấn mạnh`.
- Bảng 5.1 dùng `Ranh giới đánh giá` hoặc `Ghi chú đánh giá`.
- Các đoạn SePay, Saga, KDS, dashboard vẫn giữ claim boundary nhưng tone tự tin hơn.

- [ ] Patch Chương 7:

Expected:

- Section hạn chế vẫn tồn tại.
- Hạn chế được gom nhóm, không lặp chi tiết từ Chương 5.
- Future work khớp với Chương 1 scope và Chương 6 evidence levels.

- [ ] Audit sau sửa:

```bash
rg -n "Giới hạn của luồng|Giới hạn cần nhấn mạnh|chưa khẳng định|không được viết|không kết luận|ở mức thiết kế" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Expected: zero hit hoặc chỉ còn ở Chương 7/đánh giá với ngữ cảnh thật sự cần thiết.

- [ ] Audit semantic sau sửa:

```bash
rg -n "chỉ .*mức|chỉ đặt ra|chỉ kết luận|chỉ đóng vai trò|ở mức|mức yêu cầu|mức phù hợp|mức mô hình đọc|chưa|nếu có|khi có|trước khi có|sau khi có|có thể|cần được|sẽ được đánh giá|không được|không thay thế|không phải" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Expected: các hit còn lại phải được đọc bằng mắt và phân loại. Không được kết thúc plan chỉ vì exact regex cũ đã sạch; final response/workflow phải nêu rõ các hit còn giữ là intentional hay còn là follow-up.

- [ ] Audit không làm mất technical terms:

```bash
rg -n "tenant isolation|RBAC|idempotency|Saga|SePay|VietQR|KDS|WebSocket|Kafka|Redis|report.read_own|report.read_any|analytics_basic" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Expected: các thuật ngữ/claim cốt lõi vẫn còn khi cần.

- [ ] Build LaTeX:

```bash
python3 /Users/vodinhquan/.codex/plugins/cache/openai-bundled/latex/0.2.2/scripts/compile_latex.py docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex --compiler texlive --engine xelatex --json
```

Expected: exit code 0.

- [ ] Kiểm tra text PDF:

```bash
pdftotext docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.pdf - | rg -n "Phạm vi yêu cầu|Ranh giới đánh giá|Hạn chế|hướng phát triển"
```

Expected: heading/table text xuất hiện đúng.

- [ ] Cập nhật `thesis-workflow-plan.md`:

Expected: ghi rõ đã refactor Chương 3/5/7, còn Chương 6 title/polish có cần follow-up hay không, build status.

## 9. Acceptance criteria

- Chương 3 không còn một section dài đóng vai "phòng thủ" cho toàn khóa luận; chỉ còn phạm vi yêu cầu vừa đủ.
- Chương 5 đọc như implementation evidence, không như danh sách hạn chế theo từng luồng.
- Chương 5 không còn cụm `Giới hạn của luồng` hoặc `Giới hạn cần nhấn mạnh`.
- Các biến thể semantic như `chỉ đặt ra`, `mức yêu cầu`, `mức phù hợp`, `khi có`, `có thể`, `cần được`, `sẽ được đánh giá ở Chương 6` đã được đọc lại và phân loại; Chương 3/5 không còn câu nào mang giọng xin lỗi/phòng thủ thay cho mô tả bằng chứng.
- Bảng 5.1 dùng header tích cực hơn như `Ranh giới đánh giá`.
- Chương 7 vẫn có hạn chế/hướng phát triển, nhưng được gom nhóm và không lặp quá nhiều câu từ của Chương 5.
- Các claim về SePay live, production/pilot, high availability, benchmark, exactly-once và durable Saga vẫn không bị phóng đại. Technical Phase 6/observability không xuất hiện như nội dung thesis.
- Không thêm citation mới nếu không cần.
- LaTeX build pass.
- `thesis-workflow-plan.md` được cập nhật cuối session.

## 10. Reviewer-style questions

Trước khi kết thúc, tự hỏi:

- Nếu đọc riêng Chương 5, người đọc có thấy hệ thống đã được triển khai rõ không, hay vẫn cảm giác tác giả đang xin lỗi?
- Nếu đọc toàn khóa luận, người đọc có tìm được phạm vi đề tài ở Chương 1 không?
- Chương 3 còn làm đúng vai trò phân tích yêu cầu không, hay đang chuyển thành chương đánh giá?
- Chương 7 có đủ trung thực về hạn chế mà không làm suy yếu phần kết luận không?
- Có câu nào vừa bị rewrite khiến thesis claim mạnh hơn evidence thật không?
- Có xóa mất ranh giới quan trọng về SePay provider, Saga hardening hoặc benchmark không? Production/pilot phải được giữ như artifact chắc chắn của Phase 7, không như việc "có thể có".

## 11. Negative scope cho plan này

Không làm trong plan này:

- Không viết Chương 1 từ đầu; đó là plan riêng.
- Không sửa Chương 6 nếu người viết chưa chốt follow-up.
- Không thêm benchmark, số liệu performance hoặc citation mới.
- Không đưa Technical Phase 6/observability vào Chương 3, Chương 5 hoặc Chương 7.
- Không thay đổi service boundary, diagram hoặc technical claim ở Chương 4.
- Không thay screenshot/demo artifact.
- Không đổi nội dung kỹ thuật để đẹp câu chữ; chỉ đổi tầng trình bày và giọng văn.
