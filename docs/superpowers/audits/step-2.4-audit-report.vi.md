# Bước 2.4 — Báo cáo kiểm tra hệ thống và giải pháp

> **Phase:** 2A / Step 2.4 — Backend Order Service, Redis, Kafka, BFF Direct  
> **Ngày:** 2026-04-27  
> **Phạm vi:** Chỉ kiểm tra (audit). Chưa viết business spec cuối cùng, chưa lập implementation plan, chưa code.  
> **Nguồn đã đối chiếu:**
>
> - `docs/phases/phase-2a-order-kafka.md` — spec gốc Step 2.4
> - `docs/business-logic.md` — §3, §4, §5, §6, §7, §8, §9
> - `docs/technical-architecture.md` — §3.2, §6.2.5, §7.2–7.4, §9.2, §12, §15
> - `docs/implementation_plan.md` — các quyết định kiến trúc
> - `docs/architecture/permission-matrix.md`
> - `docs/references/auth-system-reference.md`
> - Handoff Step 2.2: `docs/superpowers/handoffs/2026-04-25-step-2.2-batch-1..5-handoff.md`
> - Kiểu dùng chung Step 2.3: `libs/shared/types/src/lib/`\*, đặc biệt `order.types.ts`, `session.types.ts`, `bill.types.ts`, `service-request.types.ts`, `realtime-events.types.ts`

---

## 0. Tóm tắt điều hành

Step 2.4 là khả thi, nhưng hiện có vài tài liệu đang trộn **ba** mô hình kiến trúc:

1. **Phân quyền sở hữu microservice rõ ràng:** Catalog sở hữu dữ liệu menu/bàn; Order sở hữu order/bill/session; Redis sở hữu session/cart tạm thời (ephemeral).
2. **Khóa PostgreSQL dùng chung:** Order Service trực tiếp khóa `menu_items` bằng `SELECT ... FOR UPDATE`.
3. **Giao dịch “atomic” xuyên service:** chuyển bàn (transfer table) cập nhật Order DB + Catalog DB + Redis trong một giao dịch khái niệm duy nhất.

Rủi ro chính không phải “độ phức tạp code NestJS”; mà là **ranh giới source-of-truth**, **ngữ nghĩa đồng thời (concurrency semantics)**, **đủ hay không của event contract**, và **state machine/RBAC lệch nhau**.

Các quyết định ưu tiên cao trước khi implement:

1. **Chủ thể tồn kho (inventory stock owner):** Order Service có trực tiếp khóa `menu_items` của Catalog, hay Catalog expose endpoint TCP đặt chỗ/trừ tồn kho trong transaction?
2. **Thời điểm trừ tồn:** Trừ tồn khi khách submit (`DRAFT → PENDING`) hay khi nhân viên confirm (`PENDING → PROCESSING`)? Tài liệu hiện không thống nhất.
3. **Thời điểm tạo bill:** Một bill được tạo khi mở session, lần submit order đầu tiên, lần confirm đầu tiên, hay khi yêu cầu thanh toán lần đầu?
4. **Tính nhất quán khi chuyển bàn:** Mức consistency chấp nhận được giữa Order DB + bảng Catalog + Redis cart/session là gì?
5. **Realtime contract:** Mở rộng kiểu event Step 2.3 trước Step 2.4, hay giữ event tối thiểu và chấp nhận đọc thêm/query coupling?
6. **Ranh giới phase WebSocket:** Step 2.4 có gồm BFF WS gateway tối thiểu, hay chỉ emit qua gateway đã có/tương lai ở Step 2.5/2B?

---

## 1. Ma trận xung đột

| ID  | Lĩnh vực                                         | Xung đột / không nhất quán                                                                                                                                                                                                                          | Bằng chứng                                                                                                                                       | Tác động                                                                                                                              | Mức độ   | Hướng khuyến nghị                                                                                                                                               |
| --- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | Sở hữu inventory                                 | Step 2.4 / technical arch nói Order Service thực hiện `SELECT ... FOR UPDATE` trên `menu_items`, nhưng Catalog Service sở hữu persistence menu item và có DB `qrtable_catalog` riêng.                                                               | `technical-architecture.md` có `qrtable_order` và `qrtable_catalog` tách nhau; §6.2.5 nói khóa `menu_items`; ERD đặt `menu_items` thuộc Catalog. | Vi phạm ownership dữ liệu service hoặc cần truy cập cross-DB. Khóa chỉ có hiệu lực nếu mọi writer dùng cùng DB transaction/hàng.      | Critical | Quyết định ownership inventory cho Phase 2A trước khi code. Xem các phương án R01.                                                                              |
| C02 | Thời điểm trừ tồn                                | `technical-architecture.md` §3.2 cho thấy khóa tồn khi “submit order”; business logic §8 và Step 2.4 nói nhân viên confirm mới validate/trừ tồn khi `PENDING → PROCESSING`.                                                                         | Business `Pending → Processing`: trừ tồn; Step 2.4: “khi confirm”; technical §3.2: “submit order → lock stock”.                                  | UX và ngữ nghĩa hủy khác nhau. Nếu trừ khi submit, đơn pending giữ chỗ tồn và hủy hoàn lại. Nếu confirm, đơn pending có thể fail sau. | Critical | Ưu tiên deduct/reserve khi confirm cho luồng business hiện tại, nhưng ghi rõ submit pending chỉ làm snapshot availability.                                      |
| C03 | Persistence Draft                                | Step 2.3 có `OrderStatus.DRAFT`, trong khi business logic nói Draft chỉ là cart và “KHÔNG tạo order record”. Step 2.4 nói persistence cho cả aggregate order.                                                                                       | `order.types.ts` có DRAFT; business §8 nói Draft không persist.                                                                                  | Implementation có thể tạo dòng DB cho draft giỏ hàng, gây mơ hồ cleanup và cancel.                                                    | High     | Coi DRAFT chỉ là state FE/cart; bảng `orders` trong DB bắt đầu từ `PENDING`. Giữ DRAFT trong ma trận chuyển trạng thái dùng chung chỉ cho UI.                   |
| C04 | Từ vựng bill status                              | Business logic dùng `Completed`, `Closed`, `payment_status`, và “bill_status == Closed”; Step 2.3 canonical `BillStatus` là `OPEN → PENDING_PAYMENT → PAID`.                                                                                        | `business-logic.md` §6/§8 so với `bill.types.ts`.                                                                                                | Chuyển trạng thái và tiêu chí chấp nhận rối.                                                                                          | High     | Chuẩn hóa Phase 2A về `OPEN`, `PENDING_PAYMENT`, `PAID`; map “closed/completed” sang `PENDING_PAYMENT` hoặc `PAID` tùy ngữ cảnh.                                |
| C05 | Ranh giới phase bill/thanh toán                  | Step 2.4 nói bill thuộc Order Service, nhưng mock Step 2.2 có UI bill tiền mặt và permission matrix có permission thanh toán. Phase 3 nói Payment Service xử lý cash/Stripe.                                                                        | Yêu cầu Step 2.4, mock Step 2.2 `CashBillPanel`, Phase 3.                                                                                        | Rủi ro implement thanh toán tiền mặt hai lần hoặc quá sớm.                                                                            | High     | Ở Step 2.4, hỗ trợ tổng hợp bill và `REQUEST_BILL → PENDING_PAYMENT`; hoãn hoàn tất thanh toán thực trừ khi scope rõ ràng.                                      |
| C06 | Side effect `REQUEST_BILL`                       | Kiểu service request `REQUEST_BILL` đã có, nhưng yêu cầu Step 2.4 chỉ nói tạo entity/status. Quy tắc business/bàn nói yêu cầu thanh toán khóa đặt món, bàn chuyển `Billing`, bill pending payment.                                                  | `ServiceRequestType.REQUEST_BILL`; business §3/§6; endpoint Step 2.4.                                                                            | Khách có thể request bill nhưng đặt món vẫn mở nếu không xử lý rõ.                                                                    | High     | Định nghĩa `REQUEST_BILL` là compound command: tạo service request + chuyển bill/bàn/khóa cart đủ “atomic”.                                                     |
| C07 | Atomicity chuyển bàn                             | Step 2.4 nói transfer atomic xuyên orders, sessions, cart, bàn cũ/mới. Nhưng bàn thuộc Catalog, cart/session trong Redis. Một ACID transaction không phủ Order DB + Catalog DB/service + Redis.                                                     | Step 2.4; technical §6.2.5; ownership Catalog Phase 1.                                                                                           | Khẳng định atomic sai; lỗi có thể orphan cart/order/table status.                                                                     | Critical | Thay “atomic” bằng mô hình consistency rõ ràng: cùng DB transaction nếu share DB, hoặc saga/compensation với transfer lock. Xem phương án R06.                  |
| C08 | Kênh thông báo chuyển bàn                        | `technical-architecture.md` §6.2.5 nói “Notify KDS qua Kafka: Bàn old → new”, nhưng Kafka registry chỉ cho phép năm topic và Step 2.4 chỉ có producer `order.confirmed`.                                                                            | `technical-architecture.md` §6.2.5 so với §7.2/Step 2.4.                                                                                         | Topic/event Kafka mới không được phép hoặc mất rename bàn cho KDS.                                                                    | Medium   | Không thêm Kafka topic trong Step 2.4. Dùng BFF Direct WS/event table status hoặc đưa snapshot bàn vào derived view KDS.                                        |
| C09 | Danh sách event BFF Direct lệch                  | Step 2.4 nói BFF Direct emit `order.created` và `service.requested`. Step 2.3 còn định nghĩa `OrderStatusChangedEvent`; technical §6.2.5 liệt kê `order.ready`; §9.2 liệt kê `order.confirmed` là nguồn WS.                                         | `realtime-events.types.ts`; technical §9.2; phase doc.                                                                                           | UI tracking/POS có thể thiếu confirm/cancel/cập nhật status nếu chỉ hai event emit.                                                   | High     | Định nghĩa scope BFF Direct Step 2.4 rõ ràng: ít nhất `order.created`, `service.requested`, và có khả năng `order.status_changed`; giữ Kafka cho cross-context. |
| C10 | Kafka `OrderConfirmedEvent` không đủ cho KDS     | `OrderConfirmedEvent` hiện thiếu `tableId`, `tableName`, metadata event, schema version, idempotency key, và route/station món. Shape ticket KDS cần dữ liệu bàn.                                                                                   | `realtime-events.types.ts`: `OrderConfirmedEvent` chỉ có tenantId, orderId, sessionId, items, total, confirmedAt, confirmedByUserId.             | Consumer bếp phải query đồng bộ Order Service để build ticket, tăng coupling và failure mode.                                         | High     | Mở rộng event contract ngay hoặc chấp nhận query-on-consume là trade-off Phase 2B rõ ràng. Xem phương án R09.                                                   |
| C11 | Ngữ nghĩa version cart                           | Step 2.4 nói Redis Hash cart có field `version`; `CartItem` có `version` từng dòng. Cart dùng chung thường cần cart version toàn cục để phát hiện conflict.                                                                                         | `session.types.ts` `CartItem.version`; Step 2.4 “Hash kèm field version”.                                                                        | Conflict version có thể bị bỏ sót khi nhiều món cập nhật đồng thời hoặc báo conflict quá khi chỉ một dòng đổi.                        | High     | Định nghĩa cả `cart.version` toàn cục và version từng dòng tùy chọn, hoặc chọn một. Xem phương án R02.                                                          |
| C12 | Định danh dòng cart                              | Redis key “item_id → {qty,note,price,version}” không biểu diễn cùng một menu item hai lần với note khác nhau. UI cart có note theo dòng.                                                                                                            | Business cart note theo item; mock Step 2.2 có `CartLine = CartItem & { lineId }`.                                                               | Người dùng không thể đặt hai biến thể cùng món note riêng, hoặc cập nhật ghi đè note.                                                 | Medium   | Dùng `cartLineId` hoặc composite `{menuItemId,note}`.                                                                                                           |
| C13 | Thiếu WS event cart                              | Step 2.4 yêu cầu broadcast thay đổi cart tới thiết bị khác trong cùng session, nhưng kiểu event Step 2.4 không có `CartUpdatedEvent`/`CartConflictEvent`.                                                                                           | Step 2.4 so với `realtime-events.types.ts`.                                                                                                      | FE/BE sẽ tự nghĩ payload lệch nhau ở Step 2.5.                                                                                        | High     | Thêm/định nghĩa contract realtime cart trước khi implement hoặc ghi rõ Step 2.4 chỉ dùng REST refresh.                                                          |
| C14 | Format Redis key session xung đột guard hiện tại | Step 2.4 yêu cầu `session:{tenant_id}:{session_id}`; `SessionGuard` hiện lưu `session:{sessionId}` với data `{tenantId, createdAt, lastActivityAt}`.                                                                                                | `libs/guards/src/lib/session.guard.ts`, `request.util.ts`.                                                                                       | Order Service và BFF guard có thể nhìn key khác nhau; tenant isolation yếu hơn ở cấp key.                                             | Critical | Quyết định refactor SessionGuard dùng chung trong Step 2.4 hay namespace session Order riêng.                                                                   |
| C15 | Quy tắc idle session xung đột guard              | Step 2.4/business nói nếu idle >30 phút và `order_count == 0` thì đóng; nếu order_count >0 không auto-close. `SessionGuard` hiện xóa mọi session idle sau 30 phút và không lưu `orderCount`.                                                        | `SessionGuard`; quy tắc session Step 2.4.                                                                                                        | Phiên dùng bữa có đơn có thể bị invalidate sau 30 phút không hoạt động.                                                               | Critical | Refactor mô hình state session trước khi bật đặt hàng thật.                                                                                                     |
| C16 | Mơ hồ persistence session                        | Step 2.3 có domain type `Session`; Step 2.4 nói session trong Redis, trong khi pseudocode transfer cập nhật `sessions` trong transaction. Không có bảng `sessions` trong entity PostgreSQL Step 2.4.                                                | Step 2.3 `Session`; Step 2.4; business transfer logic.                                                                                           | Transfer/bill/thanh toán không query lịch sử session tin cậy nếu Redis hết hạn.                                                       | High     | Quyết định session chỉ Redis hay bảng PostgreSQL session + Redis cache.                                                                                         |
| C17 | RBAC: Waiter pending cancel không khớp           | Business §8 nói `Pending → Canceled` actor Customer, Staff, Manager. Permission matrix từ chối `ORDER_CANCEL` cho WAITER; spec BFF guard nói “WAITER denied ORDER_CANCEL (manager-only)”.                                                           | `business-logic.md`; `permission-matrix.md`; test permission BFF.                                                                                | UI nhân viên “Từ chối” đơn pending từ Step 2.2 có thể fail API thật.                                                                  | High     | Tách permission cancel theo state hoặc cho WAITER pending cancel với guard tầng service.                                                                        |
| C18 | RBAC: `ORDER_CREATE` mơ hồ                       | Permission matrix cấp `ORDER_CREATE` cho OWNER/MANAGER nhưng submit khách dùng `SessionGuard` không `@Permissions`. POS nhân viên tạo đơn không có trong endpoint Step 2.4.                                                                         | `permission-matrix.md` §6/§7; endpoint BFF Step 2.4.                                                                                             | Permission “chết” hoặc endpoint nhân viên chưa lên kế hoạch.                                                                          | Medium   | Hoặc document `ORDER_CREATE` là endpoint POS/staff tương lai, hoặc gỡ khỏi surface Step 2.4.                                                                    |
| C19 | Danh sách endpoint chưa đủ                       | Yêu cầu Step 2.4 gồm transfer table, resolve service request, tổng hợp bill, broadcast cart, nhưng danh sách REST BFF thiếu transfer table, resolve service request, endpoint bill get/request/lock, cart GET, cập nhật status order cho KDS/serve. | Endpoint list Step 2.4 so với yêu cầu và mock UI.                                                                                                | Step 2.5 không thể thay mock đầy đủ.                                                                                                  | High     | Bổ sung inventory endpoint vào spec cuối trước plan.                                                                                                            |
| C20 | Casing/status bàn lệch nguồn                     | `RestaurantTable` dùng status chữ thường (`available`, `occupied`, `billing`, `cleaning`) trong khi business doc dùng Title Case.                                                                                                                   | Handoff Step 2.2 Batch 1; kiểu bàn dùng chung.                                                                                                   | Bug map DTO và kiểm tra transition không hợp lệ.                                                                                      | Medium   | Payload API canonical dùng status bàn chữ thường dùng chung; doc văn xuôi có thể giữ như prose.                                                                 |
| C21 | Thiếu routing station KDS                        | Mock Step 2.2 thêm `KDSTicketMock.station` chỉ ở mock layer. Catalog `MenuItem` thiếu metadata station/route.                                                                                                                                       | Plan/handoff Step 2.2; `menu.types.ts`; `KDSTicket`.                                                                                             | Backend không route đồ ăn vs đồ uống sang `/kds/kitchen` vs `/kds/bar` một cách quyết định được.                                      | High     | Thêm `station`/`preparationStation` trên menu item hoặc suy từ category với contract rõ ràng.                                                                   |
| C22 | Order priority / servedAt lệch                   | Plan Step 2.2 ghi tech debt: `Order.priority`, `OrderItem.servedAt`. Mock KDS hỗ trợ priority; shared types chưa có.                                                                                                                                | Plan Step 2.2, mock store.                                                                                                                       | UI priority POS/KDS không persist. Served timestamp không có cho SLA/analytics.                                                       | Medium   | Quyết định hoãn hay mở rộng shared types trước Step 2.4.                                                                                                        |
| C23 | Quyết định Outbox lệch                           | Technical §7.4 nói event Kafka derive từ DB phải dùng Outbox Pattern; cùng mục ghi outbox đầy đủ sau. Implementation plan nói “Simplified Outbox = bảng outbox_events + cron poll.” Step 2.4 chỉ nói Kafka producer.                                | `technical-architecture.md`; `implementation_plan.md`; Step 2.4.                                                                                 | Rủi ro dual-write: confirm order trong DB nhưng mất message Kafka, hoặc Kafka gửi rồi DB rollback.                                    | High     | Chọn direct producer hay simplified outbox cho Step 2.4. Với thesis/demo, simplified outbox an toàn hơn và đã được document.                                    |
| C24 | Ranh giới phase WebSocket                        | Step 2.4 verify nói UI nhận WS từ `order.created`/`service.requested`; Phase 2B sở hữu WebSocket Gateway + Redis Adapter.                                                                                                                           | Verify Step 2.4 so với scope Phase 2B.                                                                                                           | Step 2.4 có thể phụ thuộc hạ tầng chưa build.                                                                                         | Medium   | Implement emitter WS tối thiểu trong BFF bây giờ hoặc chuyển verify WS sang Step 2.5/2B với envelope event phía BFF đã test.                                    |
| C25 | Điều kiện tiên quyết request payment không khớp  | Business nói request payment chỉ khi mọi món Ready; chuyển trạng thái bàn nói tồn tại `Ready`; shared/order states cho phép `SERVED → COMPLETED`. Cần làm rõ bill có được request khi món Ready hay Served.                                         | Business §3 và §6.                                                                                                                               | Khách có thể request payment quá sớm/muộn.                                                                                            | Medium   | Cho UX nhà hàng, ưu tiên quyết định “mọi món không hủy là `SERVED` hoặc ít nhất `READY`?”                                                                       |

---

## 2. Làm rõ business logic cần đào sâu

### 2.1 Optimistic locking giỏ hàng dùng chung

#### Mơ hồ hiện tại

- Step 2.4 nói Redis Hash `cart:{tenant_id}:{session_id}` có `version`.
- Kiểu dùng chung `CartItem.version` gợi ý version theo món.
- Mock Step 2.2 dùng mở rộng `lineId` cho dòng cart.
- Chưa có payload realtime dùng chung cho cart update/conflict.

#### Luồng canonical khuyến nghị

1. Client lấy snapshot cart:

- `cartVersion`: số nguyên version toàn cục
- `items[]`: mỗi dòng có `cartLineId`, `menuItemId`, `quantity`, `note`, `unitPrice`, tùy chọn `lineVersion`

2. Client gửi lệnh cập nhật:

- `expectedCartVersion`
- operation: `add`, `setQuantity`, `remove`, `updateNote`, `clear`
- target `cartLineId` hoặc dữ liệu dòng mới

3. Backend thực hiện compare-and-swap atomic trên Redis:

- `WATCH cartKey` + đọc version + `MULTI/EXEC`, hoặc Lua script.
- Nếu `version != expectedCartVersion`: từ chối kèm conflict và snapshot hiện tại.
- Nếu khớp: áp mutation, tăng `cartVersion`, refresh TTL, emit cart update.

4. Xử lý conflict phía client:

- Mặc định: server thắng; client refresh snapshot và hiển thị diff/toast.
- Tùy chọn cho thay đổi cộng tính: auto-rebase nếu thao tác không chạm dòng đã đổi.

#### Lựa chọn UX conflict

| Phương án                                | Hành vi                                                                                              | Ưu                              | Nhược                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------- |
| A. Từ chối conflict nghiêm               | Trả `409 CART_VERSION_CONFLICT` kèm cart mới nhất. Client bỏ mutation local pending và user thử lại. | An toàn nhất, dễ suy luận/test. | Ma sát khi nhiều người sửa.                                             |
| B. Server auto-rebase cho phép giao hoán | Nếu client thêm món A và server đổi món B, backend vẫn áp update dù version toàn cục lệch.           | UX tốt hơn.                     | Quy tắc merge phức tạp; phải deterministic.                             |
| C. Last-write-wins                       | Luôn áp lệnh mới nhất.                                                                               | Đơn giản.                       | Ghi đè note/số lượng âm thầm; không chấp nhận được cho cart dùng chung. |

**Khuyến nghị:** Phương án A cho Step 2.4; có thể mở B sau chỉ cho thao tác `add`.

---

### 2.2 Pessimistic locking tồn kho / chống oversell

#### Ràng buộc kiến trúc quan trọng

`SELECT ... FOR UPDATE` chỉ chặn oversell khi:

- hàng bị khóa nằm trong cùng database/transaction PostgreSQL với writer, và
- mọi đường đi thay đổi tồn dùng cùng giao thức khóa.

Nếu Catalog Service sở hữu `menu_items` ở DB/service riêng và Order Service ghi trực tiếp, ranh giới service bị phá. Nếu Order gọi Catalog qua TCP, khóa phải nằm trong transaction của Catalog.

#### Luồng confirm khuyến nghị nếu trừ tồn khi confirm

1. Nhân viên gọi confirm order.
2. Order Service mở DB transaction và khóa hàng `orders`:

- `SELECT ... FROM orders WHERE tenant_id=? AND id=? FOR UPDATE`
- verify status `PENDING` và idempotency.

3. Trừ/đặt chỗ tồn theo mô hình chủ thể tồn đã chọn:

- khóa cùng DB, hoặc
- lệnh TCP Catalog `reserveStock(items, tenantId, orderId)` khóa nội bộ hàng menu.

4. Nếu tồn đủ:

- cập nhật order status `PROCESSING`
- set `confirmedAt`, `confirmedByUserId`
- cập nhật hoặc tạo aggregate bill
- ghi dòng Kafka outbox hoặc publish sau commit, tùy mô hình event

5. Nếu tồn không đủ:

- rollback mọi thay đổi local
- trả lỗi có cấu trúc: id/tên item, requested, available, recoverable=true

6. Timeout khóa/deadlock:

- set `lock_timeout` / statement timeout.
- khóa hàng menu theo thứ tự deterministic sort `(tenantId, menuItemId)`.
- khi timeout/deadlock trả `409/423 STOCK_LOCK_CONFLICT_RETRYABLE` và cho nhân viên retry.

#### Phương án khóa

| Phương án                                           | Mô hình                                                                  | Ưu                                              | Nhược                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A. Order Service truy cập trực tiếp DB/bảng Catalog | Order mở transaction trên `menu_items` và `orders`.                      | Khóa mạnh nhất ngay; stress test đơn giản nhất. | Vi phạm ownership microservice DB; khó evolve.                                                 |
| B. Catalog sở hữu endpoint khóa/trừ tồn             | Order gọi TCP Catalog `reserve/deduct`, Catalog làm `SELECT FOR UPDATE`. | Giữ ownership; mọi ghi tồn tập trung.           | Saga xuyên service; transaction Order không bọc được DB Catalog. Cần compensation/idempotency. |
| C. Chuyển sổ đặt chỗ tồn sang Order Service         | Catalog chỉ hiển thị; Order lưu reservation dùng cho đặt món.            | Order khóa local; ngữ nghĩa domain order sạch.  | Trùng dữ liệu inventory; cần sync/invalidation.                                                |

**Khuyến nghị:** Phương án B nếu ưu tiên kiến trúc microservice; Phương án A chỉ khi scope thesis ưu tiên demo đơn giản hơn ownership nghiêm.

---

### 2.3 Gộp bill theo session

#### Mơ hồ hiện tại

- “Merge nhiều orders thành 1 bill per session” đã thống nhất.
- Chưa rõ bill tạo lúc nào và khi cancel order thì sao.
- `BillStatus` là `OPEN → PENDING_PAYMENT → PAID`, nhưng văn business còn “Closed/Completed”.

#### Phương án

| Phương án                              | Bill tồn tại khi nào                              | Ưu                                         | Nhược                                                     |
| -------------------------------------- | ------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| A. Tạo bill khi mở session             | Luôn có một dòng bill cho session đang hoạt động. | Đơn giản hóa request bill và chi tiết bàn. | Bill rỗng khi session chưa có đơn; cần cleanup.           |
| B. Tạo bill khi submit order đầu tiên  | Bill có khi session có giá trị nghiệp vụ thật.    | POS running bill tốt; tránh bill rỗng.     | Cần xử lý đơn chỉ pending rồi cancel.                     |
| C. Tạo bill khi confirm order đầu tiên | Bill chỉ phản ánh công việc bếp đã confirm.       | Tránh bill các đơn chưa confirm.           | Tổng “pending running” POS cần tính riêng; bill tạo muộn. |
| D. Tạo bill khi request payment        | Persistence tối thiểu nhất.                       | Step 2.4 đơn giản.                         | POS running bill và validate request payment khó hơn.     |

**Khuyến nghị:** Phương án B với tính lại động từ các đơn không bị cancel; nếu mọi đơn cancel trước thanh toán, bill có thể giữ `OPEN` total 0 hoặc soft-cancel/void nếu sau này thêm `VOID`.

#### Hiệu ứng cancel đề xuất

| Trạng thái đơn khi cancel       | Ảnh hưởng tồn                                                                                                            | Ảnh hưởng bill                                   | Ảnh hưởng khách/POS                   |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------- |
| `PENDING` cancel trước confirm  | Không restore tồn nếu không trừ khi submit.                                                                              | Loại khỏi subtotal bill.                         | `order.status_changed` sang CANCELED. |
| `PROCESSING` cancel bởi Manager | Restore tồn chỉ khi business quyết định tồn đã chuẩn bị tái dùng được; nếu không thì không restore nhưng loại doanh thu. | Loại khỏi bill hoặc điều chỉnh âm/audit.         | Thông báo KDS dừng/void.              |
| `READY/SERVED` cancel           | Không trong Step 2.4 trừ khi chấp nhận override Manager.                                                                 | Cần luồng điều chỉnh/hoàn tiền, có thể Phase 3+. | Tránh trừ khi không scope rõ.         |

---

### 2.4 Chuyển bàn (Transfer table)

#### Bất biến bắt buộc

Sau khi chuyển từ bàn A sang bàn B:

- session đang hoạt động tham chiếu B,
- đơn/bill/service request mở hiển thị B,
- key cart theo cùng session và hiển thị B,
- bàn A `available`, bàn B `occupied`,
- không khách dùng QR bàn cũ có thể mutate session đã chuyển trừ khi binding session/bàn được cập nhật an toàn.

#### Phương án atomicity

| Phương án                                                  | Mô hình                                                                                                                                           | Ưu                                        | Nhược                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| A. Một DB transaction bằng cách đồng đặt bàn/session/order | Đưa trạng thái bàn và session order vào cùng transaction Phase 2A.                                                                                | Atomicity thật; dễ test nhất.             | Phá ownership Catalog hoặc cần chuyển schema. |
| B. Saga với transfer lock                                  | Order tạo khóa `transfer_in_progress` trong Redis/DB; cập nhật Order DB; gọi Catalog cập nhật trạng thái bàn; cập nhật Redis; compensate khi lỗi. | Giữ ranh giới; thiết kế phân tán thực tế. | Logic nhiều hơn; cửa sổ eventual consistency. |
| C. Catalog-first với rollback                              | Khóa bàn đích trong Catalog, cập nhật trạng thái bàn, rồi Order/Redis; rollback Catalog nếu Order fail.                                           | Bảo vệ double-booking bàn.                | Vẫn không atomic; compensation có thể fail.   |

**Khuyến nghị:** Phương án B. Ở Step 2.4, gọi rõ là “atomic từ góc nhìn client với transfer lock và compensation”, không phải ACID xuyên mọi store.

#### Ghi chú Redis/session

- Nếu cart key là `cart:{tenantId}:{sessionId}`, transfer không cần đổi tên key cart vì session không đổi.
- Payload session phải cập nhật `tableId/tableName` và có thể `version`.
- Client khách nên nhận `session.table_changed` hoặc cập nhật status chung; nếu không UI cũ vẫn hiển thị bàn cũ.

---

### 2.5 Payload Kafka và WebSocket

#### Payload Step 2.3 hiện có

```ts
OrderCreatedEvent       { tenantId, orderId, tableId, tableName, sessionId, items, totalAmount, timestamp }
OrderStatusChangedEvent { tenantId, orderId, fromStatus, toStatus, changedByUserId?, timestamp }
ServiceRequestedEvent   { tenantId, requestId, tableId, tableName, sessionId, type, note?, timestamp }
OrderConfirmedEvent     { tenantId, orderId, sessionId, items, totalAmount, confirmedAt, confirmedByUserId }
KDSTicket               { ticketId, tenantId, orderId, tableId, tableName, items, priority, createdAt, slaSeconds }
```

#### Vấn đề

- `OrderConfirmedEvent` không build được `KDSTicket` thiếu thông tin bàn.
- Thiếu metadata event: `eventId`, `schemaVersion`, `occurredAt`, `correlationId`/`processId`.
- Không có route/station cho tách KDS.
- Không có cart updated event dù Step 2.4 yêu cầu broadcast cart.

#### Phương án payload

| Phương án                               | Contract                                                                      | Ưu                                           | Nhược                                         |
| --------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------- |
| A. Giữ Step 2.3 tối thiểu               | Không đổi shared type; Kitchen query Order/Catalog cho bàn/station thiếu.     | Tránh churn Step 2.3.                        | Consumer coupling; chậm hơn; nhiều đường lỗi. |
| B. Mở rộng `OrderConfirmedEvent`        | Thêm tableId/tableName, metadata event, có thể snapshot station/category món. | Event Kafka đủ cho consumer; replay tốt hơn. | Cần cập nhật type Step 2.3.                   |
| C. Envelope + domain payload có version | `{ eventId, eventType, version, tenantId, occurredAt, payload: {...} }`.      | Scale tốt cho Kafka topic sau này.           | Việc nhiều hơn bây giờ.                       |

**Khuyến nghị:** Phương án B cho Step 2.4, hoặc C nếu muốn registry Kafka bền cho phase sau.

#### Payload tối thiểu đề xuất cho `order.confirmed` nếu mở rộng

```ts
{
  eventId: string;
  schemaVersion: 1;
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  items: Array<{
    id: string;
    orderId: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    note?: string;
    status: 'PROCESSING';
    station?: 'KITCHEN' | 'BAR';
  }>;
  totalAmount: number;
  confirmedAt: string;
  confirmedByUserId: string;
  occurredAt: string;
  correlationId?: string;
}
```

#### Sự kiện WebSocket đề xuất cho Step 2.4

| Event                             | Room                                                             | Trigger                                      | Nguồn payload tối thiểu                     |
| --------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------- |
| `order.created`                   | `tenant:{tid}:staff`                                             | Submit khách thành công                      | `OrderCreatedEvent` hiện có                 |
| `order.status_changed`            | `tenant:{tid}:staff`, `session:{sid}:customer`                   | confirm/cancel/ready/served                  | `OrderStatusChangedEvent` hiện có           |
| `service.requested`               | `tenant:{tid}:staff`                                             | Service request khách                        | `ServiceRequestedEvent` hiện có             |
| `cart.updated`                    | `session:{sid}:customer`                                         | Cart mutation thành công bởi bất kỳ thiết bị | Cần contract mới                            |
| `cart.conflict` hoặc chỉ REST 409 | client gốc                                                       | Cart version mismatch                        | Cần quyết định                              |
| `table.transferred`               | `tenant:{tid}:staff`, `session:{sid}:customer`, future KDS rooms | Transfer table thành công                    | Cần contract mới hoặc tái dùng status chung |

---

## 3. Điểm mù và rủi ro kèm giải pháp hành động

### R01. Khóa inventory qua ranh giới microservice

**Rủi ro:** Order Service không thể an toàn `SELECT ... FOR UPDATE` `menu_items` thuộc Catalog trừ khi dùng chung physical database/bảng và mọi writer tuân thủ. Ngược lại vẫn có thể oversell hoặc vi phạm ownership.

| Giải pháp                                   | Ưu                                          | Nhược                                                  |
| ------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| A. Phase 2A truy cập DB trực tiếp thực dụng | Nhanh, khóa hàng thật, demo concurrency dễ. | Nợ kiến trúc; Order phụ thuộc schema Catalog.          |
| B. Lệnh tồn transactional của Catalog       | Ownership sạch; mọi ghi tồn tập trung.      | Cần reserve/deduct/release idempotent và xử lý saga.   |
| C. Sổ reservation tồn tại Order             | Order kiểm soát inventory đặt món.          | Độ phức tạp đồng bộ; tồn hiển thị Catalog có thể lệch. |

**Khuyến nghị audit:** Chọn B nếu Step 2.4 hướng production; chỉ chọn A khi có exception scope thesis được document rõ.

---

### R02. Race condition cart dùng chung và Redis CAS

**Rủi ro:** Read-modify-write naive trên Redis Hash mất cập nhật khi hai khách sửa đồng thời. Version theo món một không bảo vệ invariant tổng thể của cart.

| Giải pháp                                   | Ưu                                            | Nhược                             |
| ------------------------------------------- | --------------------------------------------- | --------------------------------- |
| A. `WATCH/MULTI/EXEC` cart version toàn cục | Optimistic locking Redis native; conflict rõ. | Retry khi contention cao.         |
| B. Lua CAS script                           | Atomic, một round-trip, deterministic.        | Khó maintain/test hơn.            |
| C. RedisJSON + JSONPath CAS                 | Mô hình document gọn nếu có RedisJSON.        | Cần module/support không đảm bảo. |

**Khuyến nghị audit:** Dùng Lua CAS hoặc `WATCH/MULTI` với `cartVersion` toàn cục; trả `409` kèm snapshot mới nhất.

---

### R03. Timer idle Redis vs session có đơn

**Rủi ro:** `SessionGuard` hiện xóa session idle sau 30 phút không kiểm `orderCount`. Step 2.4 yêu cầu session có đơn vẫn mở/gia hạn. Có thể kẹt bill/order và chặn theo dõi khách.

| Giải pháp                                                                         | Ưu                                            | Nhược                                      |
| --------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| A. Lưu `orderCount` trong Redis session BFF và cập nhật khi submit                | Thay đổi tối thiểu.                           | Guard BFF phụ thuộc cập nhật domain Order. |
| B. Thêm bảng PostgreSQL `sessions` trong Order Service, Redis làm cache hoạt động | Bền; hỗ trợ bill/thanh toán/lịch sử/transfer. | Schema/work nhiều hơn “chỉ Redis”.         |
| C. Giữ Redis-only nhưng tạo key session Order riêng payload phong phú             | Giảm refactor guard global.                   | Hai nguồn session có thể lệch.             |

**Khuyến nghị audit:** B an toàn nhất cho đúng nghiệp vụ; nếu quá nặng thì C với contract đồng bộ rõ.

---

### R04. Idempotency chưa được đặc tả đầy đủ

**Rủi ro:** Double tap, retry mobile, replay offline có thể tạo đơn hoặc confirm trùng. Types có `idempotencyKey` nhưng Step 2.4 chưa định nghĩa lưu trữ/TTL/ngữ nghĩa lỗi.

| Giải pháp                                                                      | Ưu                               | Nhược                                     |
| ------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------------- |
| A. Unique constraint DB `(tenant_id, session_id, idempotency_key)` trên orders | Mạnh, đơn giản cho submit.       | Chỉ bọc tạo đơn.                          |
| B. Redis `SET NX idem:{tenant}:{session}:{key}` kèm cache response             | Nhanh, xử lý duplicate đang bay. | Vẫn cần constraint DB cho crash recovery. |
| C. Bảng idempotency đầy đủ                                                     | Audit và tái dùng xuyên lệnh.    | Code nhiều hơn.                           |

**Khuyến nghị audit:** Kết hợp A + khóa in-flight Redis ngắn cho submit. Dùng khóa hàng đơn/check status idempotent cho confirm.

---

### R05. Vấn đề dual-write Kafka

**Rủi ro:** Commit DB confirm thành công nhưng publish Kafka fail; KDS không thấy ticket. Hoặc Kafka gửi nhưng DB rollback.

| Giải pháp                             | Ưu                                               | Nhược                                    |
| ------------------------------------- | ------------------------------------------------ | ---------------------------------------- |
| A. Publish trực tiếp sau commit DB    | Đơn giản cho demo.                               | Mất event khi producer lỗi; cần sửa tay. |
| B. Bảng outbox đơn giản + cron/poller | Khớp quyết định implementation plan; đủ tin cậy. | Thêm schema/poller outbox.               |
| C. Outbox transactional đầy đủ / CDC  | Tốt dài hạn.                                     | Ngoài scope thesis hiện tại.             |

**Khuyến nghị audit:** Dùng B nếu được; không thì document A tạm và có đường repair/replay admin.

---

### R06. Consistency chuyển bàn

**Rủi ro:** Cập nhật bàn, session, đơn, bill, service request, cart và view KDS có thể fail một phần.

| Giải pháp                                     | Ưu                             | Nhược                      |
| --------------------------------------------- | ------------------------------ | -------------------------- |
| A. Cùng DB transaction                        | Atomicity thật.                | Cần cùng chủ data/DB.      |
| B. Saga + transfer lock + compensation        | Tiếp cận microservice thực tế. | Edge case nhiều hơn.       |
| C. Hoãn transfer thật sang Step 2.5+ chỉ mock | Giảm scope Step 2.4.           | Mock UI không tích hợp đủ. |

**Khuyến nghị audit:** Implement ngữ nghĩa B trong spec cuối nếu transfer bắt buộc Step 2.4.

---

### R07. Khóa bill/request payment

**Rủi ro:** `REQUEST_BILL` chỉ là service request thường không khóa cart/order, trái business logic. Khách có thể tiếp tục đặt trong lúc billing.

| Giải pháp                                                             | Ưu                                | Nhược                                               |
| --------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| A. `REQUEST_BILL` kích hoạt khóa bill/bàn/cart ngay                   | Khớp UX business.                 | Cần cập nhật trạng thái bàn xuyên service.          |
| B. Nhân viên acknowledge mới khóa                                     | Staff kiểm soát; tránh khóa nhầm. | Khách vẫn đặt sau request bill đến khi staff xử lý. |
| C. Endpoint riêng `POST /bill/request`; service request chỉ thông báo | Ngữ nghĩa lệnh rõ.                | Thêm endpoint và map UI.                            |

**Khuyến nghị audit:** A hoặc C. Ưu tiên C cho rõ ràng: có thể tạo kiểu service request như side effect của bill request.

---

### R08. RBAC và state guard không khớp

**Rủi ro:** `ORDER_CANCEL` manager-only trong matrix/test hiện tại, nhưng business và mock UI cho phép nhân viên/waiter từ chối đơn pending. Permission thô không đủ cho cancel theo state.

| Giải pháp                                                   | Ưu                             | Nhược                                                     |
| ----------------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| A. Cấp WAITER `ORDER_CANCEL`; service giới hạn `PENDING`    | Đơn giản; khớp nút reject POS. | Cùng tên permission bọc cả cancel processing của manager. |
| B. Thêm `ORDER_CANCEL_PENDING` và `ORDER_CANCEL_PROCESSING` | Chính xác.                     | Cần đổi permission Step 2.0/reseed/test.                  |
| C. Giữ WAITER denied; gỡ/disable cancel waiter trên UI      | Không đổi RBAC.                | Lệch business và POS Step 2.2.                            |

**Khuyến nghị audit:** B sạch nhất; A thực dụng nếu tránh churn permission.

---

### R09. Payload event không đủ cho consumer hạ nguồn

**Rủi ro:** KDS/Notification/Analytics consume `order.confirmed` nhưng cần metadata bàn/station/audit không có trong type hiện tại.

| Giải pháp                       | Ưu                    | Nhược                            |
| ------------------------------- | --------------------- | -------------------------------- |
| A. Mở rộng payload event ngay   | Consumer độc lập hơn. | Cần cập nhật type/test Step 2.3. |
| B. Consumer query Order Service | Payload nhỏ.          | Coupling, độ trễ, chuỗi lỗi.     |
| C. Tạo lệnh/event KDS riêng sau | Giữ event order gọn.  | Làm lại Phase 2B.                |

**Khuyến nghị audit:** Mở rộng `OrderConfirmedEvent` với snapshot bàn và metadata event ngay.

---

### R10. Ngắt WebSocket / bỏ lỡ event

**Rủi ro:** PWA/POS/KDS có thể bỏ lỡ `order.created`, `service.requested`, hoặc `order.status_changed` khi mạng giật. Business §7 yêu cầu offline resilience sau cùng; Step 2.4 thiếu chiến lược đối soát.

| Giải pháp                                                   | Ưu                 | Nhược                                      |
| ----------------------------------------------------------- | ------------------ | ------------------------------------------ |
| A. WS chỉ là gợi ý; polling/refetch REST là source of truth | Đơn giản, tin cậy. | Độ trễ nhẹ; nhiều API call.                |
| B. Số thứ tự WS + endpoint replay                           | Real-time mạnh.    | Hạ tầng nhiều hơn.                         |
| C. Replay Kafka-backed cho bridge BFF                       | Mạnh.              | Không justify cho side effect UI theo AP1. |

**Khuyến nghị audit:** Step 2.4/2.5 định nghĩa WS không authoritative; client refetch khi reconnect/focus và POS có thể poll.

---

### R11. Thiếu routing station KDS

**Rủi ro:** Không có `MenuItem.station` hoặc tương đương thì Order/Kitchen không tách đồ ăn/đồ uống.

| Giải pháp                                   | Ưu                                | Nhược                                           |
| ------------------------------------------- | --------------------------------- | ----------------------------------------------- |
| A. Thêm `station` vào MenuItem/Catalog ngay | Trực tiếp, rõ.                    | Migration schema/type Catalog.                  |
| B. Suy station từ Category                  | Ít đổi schema nếu đã có category. | Category có thể trộn đồ ăn/uống; kém linh hoạt. |
| C. Heuristic tên/seed chỉ cho demo          | Nhanh.                            | Không production-grade; “ma thuật” ẩn.          |

**Khuyến nghị audit:** Thêm metadata station rõ ràng ở Catalog/Menu nếu KDS là core demo.

---

### R12. Trạng thái bàn và sở hữu session

**Rủi ro:** Khởi tạo session QR, khóa Billing, transfer và cleanup cần binding bàn/session nhất quán. SessionGuard hiện chỉ tạo session ẩn danh theo header/cookie và tenant; không enforce binding bàn hay quy tắc idle `orderCount`.

| Giải pháp                                                                                      | Ưu                          | Nhược                                                         |
| ---------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------- |
| A. SessionGuard giữ generic; endpoint khách Order/BFF validate bàn/session trong Order Service | Tránh churn guard toàn cục. | Session có thể tồn tại chưa có bàn đến khi endpoint validate. |
| B. Nâng SessionGuard hiểu QR table token và binding bàn                                        | Auth khách tập trung.       | Guard nặng domain.                                            |
| C. Thêm `CustomerSessionGuard` riêng cho route order                                           | Tách biệt sạch.             | Thêm pattern guard.                                           |

**Khuyến nghị audit:** C cho Step 2.4: guard global đơn giản, thêm validation session domain cho route khách.

---

## 4. Khoảng trống UI / shared type từ Step 2.2 và 2.3

| Khoảng trống                                  | Quan sát                               | Ý nghĩa backend Step 2.4                             | Mức độ | Phương án                                                             |
| --------------------------------------------- | -------------------------------------- | ---------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| `KDSTicket.station` chỉ mock                  | Step 2.2 `KDSTicketMock`               | Cần routing station cho KDS kitchen/bar.             | High   | Thêm station vào event/item/catalog hoặc document cách suy query KDS. |
| `MenuItem.station` tech debt                  | Plan Step 2.2 out-of-scope             | Cần để tách đồ ăn/uống.                              | High   | Mở rộng schema/type Catalog hoặc suy từ category.                     |
| `Order.priority` mock/store                   | UI priority KDS Step 2.2               | Priority không persist hoặc emit.                    | Medium | Thêm field hoặc tắt persist priority.                                 |
| `OrderItem.servedAt` tech debt                | Plan Step 2.2                          | Thời điểm serve/SLA/lịch sử hạn chế.                 | Medium | Thêm timestamp tùy chọn hoặc hoãn.                                    |
| Cart `lineId` trong mock PWA                  | Mock Step 2.2 `CartLine`               | Redis hash theo menu item mất note trùng món.        | Medium | Thêm `cartLineId`.                                                    |
| Payload WS cart thiếu                         | Yêu cầu Step 2.4                       | Cart đa thiết bị khó tích hợp gọn.                   | High   | Định nghĩa `CartUpdatedEvent`.                                        |
| `OrderConfirmedEvent` thiếu thông tin bàn     | Shared type Step 2.3                   | Tạo ticket KDS không đứng một mình.                  | High   | Mở rộng event.                                                        |
| Thiếu dữ liệu khóa thanh toán service request | `ServiceRequestedEvent`                | Panel Bills POS cần tổng bill/status/khóa bàn.       | Medium | Endpoint/event bill riêng hoặc làm giàu response.                     |
| Casing status bàn chữ thường                  | Handoff Step 2.2 / kiểu bàn            | DTO API phải map chữ thường.                         | Medium | Document casing canonical API.                                        |
| Thay nguồn realtime                           | Step 2.2 fake events khớp type hiện có | Step 2.4 tự nghĩ tên event mới thì Step 2.5 làm lại. | High   | Giữ đúng tên/payload event hoặc cập nhật shared type trước.           |

---

## 5. Kiểm tra RBAC cho endpoint Step 2.4

### 5.1 Ma trận endpoint → guard đề xuất theo tài liệu hiện tại

| Endpoint / hành động              | Actor                   | Kỳ vọng guard/permission hiện tại                                                   | Kết luận audit                                                               |
| --------------------------------- | ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Khách submit order                | CUSTOMER                | `SessionGuard → TenantGuard`, kiểm ownership                                        | OK, nhưng phải validate session QR/bàn và idempotency.                       |
| Nhân viên confirm order           | OWNER/MANAGER/WAITER    | `UserGuard → TenantGuard → PermissionGuard(ORDER_CONFIRM)`                          | OK. Thêm service-guard status `PENDING`.                                     |
| Khách cancel đơn pending của mình | CUSTOMER                | `SessionGuard → TenantGuard`, `order.sessionId === req.sessionId`, status `PENDING` | OK. Không restore tồn nếu không trừ khi submit.                              |
| Nhân viên cancel pending          | Business cho phép Staff | WAITER hiện thiếu `ORDER_CANCEL`                                                    | Xung đột C17. Quyết định.                                                    |
| Manager cancel processing         | OWNER/MANAGER           | `ORDER_CANCEL` + guard role/state + lý do                                           | OK cho Owner/Manager, nhưng permission một mình không đủ.                    |
| Danh sách đơn nhân viên           | OWNER/MANAGER/WAITER    | `ORDER_GET_LIST`                                                                    | OK. Chef/Barista không nên xem raw orders, chỉ KDS.                          |
| Chi tiết đơn khách                | CUSTOMER                | `SessionGuard → TenantGuard`, ownership                                             | Cần route tách khách khỏi nhân viên để tránh `PermissionGuard`.              |
| Chi tiết đơn nhân viên            | OWNER/MANAGER/WAITER    | `ORDER_GET_BY_ID`                                                                   | OK.                                                                          |
| Cart CRUD                         | CUSTOMER                | `SessionGuard → TenantGuard`                                                        | OK, nhưng cần khóa bàn/billing.                                              |
| Gửi service request               | CUSTOMER                | `SessionGuard → TenantGuard`                                                        | OK; nếu cần staff tạo thì endpoint staff riêng với `SERVICE_REQUEST_CREATE`. |
| Acknowledge service request       | OWNER/MANAGER/WAITER    | `SERVICE_REQUEST_ACKNOWLEDGE`                                                       | OK.                                                                          |
| Resolve service request           | OWNER/MANAGER/WAITER    | `SERVICE_REQUEST_RESOLVE`                                                           | Thiếu trong danh sách endpoint BFF Step 2.4.                                 |
| Transfer table                    | OWNER/MANAGER/WAITER    | `TABLE_TRANSFER`                                                                    | Step 2.4 yêu cầu nhưng thiếu trong danh sách endpoint.                       |
| Cập nhật trạng thái bàn           | OWNER/MANAGER/WAITER    | `TABLE_UPDATE_STATUS`                                                               | Cần cho luồng billing/dọn nhưng thiếu trong danh sách endpoint.              |
| Xem bill / request payment        | CUSTOMER/STAFF          | Chưa rõ                                                                             | Cần cho Bills Step 2.2 và luồng request payment.                             |

### 5.2 Lỗ hổng RBAC / quyết định

1. **Permission cancel quá thô:** Cần ủy quyền cancel có nhận thức state.
2. `**ORDER_CREATE` nhân viên orphan:\*\* Nếu không có endpoint staff tạo đơn, để permission tương lai hoặc document POS manual order hoãn.
3. **SUPER_ADMIN bypass tenant:** Với endpoint order vận hành, nếu Super Admin truy cập, query service vẫn cần tenant context rõ hoặc debug mode. Không cho phép danh sách đơn không scoped.
4. **Ownership khách không phải RBAC:** Mọi route khách phải kiểm ownership session/bàn/đơn; `SessionGuard` một mình không đủ.
5. **Khóa billing cần authorization:** Khách có thể request bill, nhưng chỉ nhân viên acknowledge/resolve và sau này confirm tiền mặt ở Phase 3.

---

## 6. Câu hỏi mở cần quyết định

Vui lòng trả lời hoặc chọn phương án trước business spec Phase 2 cuối cùng.

### Q1. Chủ thể tồn kho / mô hình khóa

Bạn muốn phương án nào cho Step 2.4?

- **Q1-A:** Order Service khóa trực tiếp bảng `menu_items` của Catalog vì đơn giản thesis/demo.
- **Q1-B:** Catalog Service expose lệnh TCP transactional `reserve/deduct/release stock`; Order dùng saga/idempotency.
- **Q1-C:** Order Service sở hữu sổ reservation tồn riêng với tồn hiển thị Catalog.

**Khuyến nghị:** Q1-B cho đúng kiến trúc; Q1-A chỉ khi chấp nhận rõ nợ ranh giới tạm thời.

### Q2. Thời điểm trừ tồn

- **Q2-A:** Trừ khi khách submit order (`DRAFT → PENDING`).
- **Q2-B:** Trừ khi nhân viên confirm (`PENDING → PROCESSING`).
- **Q2-C:** Reserve khi submit, finalize deduct khi confirm, release khi cancel/timeout.

**Khuyến nghị:** Q2-B theo business doc hiện tại; Q2-C nếu muốn khách chắc chắn hơn nhưng phức tạp hơn.

### Q3. Thời điểm tạo bill

- **Q3-A:** Tạo bill khi mở session.
- **Q3-B:** Tạo bill khi submit order đầu tiên.
- **Q3-C:** Tạo bill khi confirm order đầu tiên.
- **Q3-D:** Chỉ tạo bill khi khách request payment.

**Khuyến nghị:** Q3-B.

### Q4. Hành vi `REQUEST_BILL`

- **Q4-A:** Khách `REQUEST_BILL` ngay khóa cart/order và bàn chuyển `billing`.
- **Q4-B:** Chỉ tạo service request; nhân viên acknowledge mới khóa billing.
- **Q4-C:** Thêm lệnh bill request rõ ràng; service request chỉ là side effect thông báo.

**Khuyến nghị:** Q4-C hoặc Q4-A. Tránh chỉ thông báo trừ khi business cố ý cho đặt sau request bill.

### Q5. Mô hình consistency chuyển bàn

- **Q5-A:** ACID thật bằng chia sẻ/đồng đặt ghi bàn/session/order.
- **Q5-B:** Saga với transfer lock và compensation xuyên Order/Catalog/Redis.
- **Q5-C:** Hoãn transfer thật; giữ mock đến sau.

**Khuyến nghị:** Q5-B.

### Q6. Mô hình lưu session

- **Q6-A:** Session chỉ Redis nhưng refactor key/payload SessionGuard gồm tenant/bàn/orderCount.
- **Q6-B:** Bảng PostgreSQL `sessions` trong Order Service + Redis cache hoạt động.
- **Q6-C:** Key session BFF giữ nguyên; Order Service có key session riêng payload giàu hơn.

**Khuyến nghị:** Q6-B nếu đúng thanh toán/lịch sử/transfer quan trọng; Q6-C nếu giảm refactor guard.

### Q7. Chính sách permission cancel

- **Q7-A:** Waiter có thể cancel/reject `PENDING`; Manager/Owner cancel `PROCESSING` có lý do.
- **Q7-B:** Chỉ Manager/Owner cancel mọi đơn đã submit.
- **Q7-C:** Hai permission: pending cancel vs processing cancel.

**Khuyến nghị:** Q7-C nếu sẵn sàng chỉnh RBAC; không thì Q7-A với guard trạng thái tầng service.

### Q8. Cập nhật event contract trước Step 2.4

- **Q8-A:** Giữ kiểu event Step 2.3 và chấp nhận query-on-consume.
- **Q8-B:** Mở rộng `OrderConfirmedEvent` với snapshot bàn + metadata + station route.
- **Q8-C:** Giới thiệu envelope event generic cho Kafka ngay.

**Khuyến nghị:** Q8-B.

### Q9. Contract realtime cart

- **Q9-A:** Thêm `CartUpdatedEvent`/payload snapshot cart dùng chung ngay.
- **Q9-B:** Không dùng WebSocket cho cart Step 2.4; client chỉ refetch sau mutation.
- **Q9-C:** Payload event ad-hoc ở BFF, formalize sau.

**Khuyến nghị:** Q9-A hoặc Q9-B. Tránh Q9-C.

### Q10. Phạm vi WebSocket trong Step 2.4

- **Q10-A:** Implement WebSocket gateway tối thiểu trong BFF ngay cho event direct Step 2.4/2.5.
- **Q10-B:** Step 2.4 chỉ trả envelope event; WS gateway thực vẫn Phase 2B.
- **Q10-C:** Dùng polling Step 2.5 và hoãn mọi WS.

**Khuyến nghị:** Q10-A nếu demo cần realtime sau Step 2.5; Q10-B nếu giữ nghiêm scope Phase 2B.

### Q11. Nguồn station KDS

- **Q11-A:** Thêm `station` vào `MenuItem` Catalog.
- **Q11-B:** Thêm `station` vào Category và kế thừa xuống item.
- **Q11-C:** Suy station trong Kitchen Service theo category/name cho demo.

**Khuyến nghị:** Q11-A.

### Q12. Thanh toán/tiền mặt trong Step 2.4

- **Q12-A:** Step 2.4 dừng ở bill `PENDING_PAYMENT`; không confirm tiền mặt.
- **Q12-B:** Step 2.4 gồm thanh toán tiền mặt cơ bản dù Phase 3.
- **Q12-C:** Step 2.4 chỉ expose endpoint đọc bill; request payment hoãn.

**Khuyến nghị:** Q12-A để tôn ranh giới Phase 3 trong khi vẫn hỗ trợ UX request bill.

---

## 7. Giải pháp đề xuất đưa vào spec cuối sau khi duyệt

Đây chưa phải quyết định cuối; là mặc định khuyến nghị của báo cáo audit:

1. **Dòng Order DB bắt đầu từ `PENDING`; `DRAFT` chỉ Redis cart/UI.**
2. **Trừ tồn khi nhân viên confirm**, không phải submit; submit chỉ validate availability hiện tại.
3. **Catalog sở hữu khóa tồn** qua lệnh TCP idempotent, trừ khi scope thesis chấp nhận nợ khóa DB trực tiếp.
4. **Bill tạo khi submit order đầu tiên** và tính lại từ các đơn không cancel trong session.
5. `**REQUEST_BILL` khóa đặt món\*\* và chuyển bill/bàn sang payment-pending/billing qua lệnh rõ ràng.
6. **Chuyển bàn dùng saga + transfer lock**, không khẳng định ACID xuyên DB + Redis.
7. **Thêm/xác nhận contract thiếu** trước implement Step 2.4:

- snapshot/event cart hoặc chọn chỉ đồng bộ REST cart,
- `OrderConfirmedEvent` làm giàu,
- nguồn routing station,
- chính sách permission cancel có nhận thức state.

8. **Dùng simplified outbox** cho `order.confirmed` nếu trong scope; không thì document direct producer tạm thời.
9. **Sự kiện WebSocket là gợi ý; REST/polling/refetch là source of truth** sau reconnect.
10. **Refactor chiến lược key/payload session** để BFF guard và Order Service không mâu thuẫn.

---

## 8. Điểm dừng

Theo quy trình hai giai đoạn đã yêu cầu, báo cáo này cố ý dừng tại đây. **Không** viết `docs/business-logic-step-2.4-spec.md` ở bước này.

Hành động tiếp theo: người dùng chọn/trả lời các câu hỏi mở ở trên. Sau khi quyết định được xác nhận, đầu ra Phase 2 nên là business logic spec cuối tại:

`docs/business-logic-step-2.4-spec.md`

---

## 9. Trạng thái sau chốt spec (cập nhật 2026-04-28 — không thay đổi nội dung audit gốc phía trên)

Đặc tả `docs/business-logic-step-2.4-spec.vi.md` (Q1–Q12) đã chốt; repo đã **merge prerequisite** sau audit:

| Mã / chủ đề         | Ghi chú ngắn                                                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C01 / R01**       | Code: pattern TCP Catalog `MENU_ITEM.STOCK_*` + `VALIDATE_ORDERABLE`; docs Catalog §3.8 + technical-architecture §6.2.5 — Order không `FOR UPDATE` `menu_items`. |
| **C02**             | Đặc tả + docs: deduct khi confirm, không khi submit.                                                                                                             |
| **C17 / R08**       | Code: `ORDER_CANCEL_PENDING` / `ORDER_CANCEL_PROCESSING` + `role.json` + tests + matrix 52 dòng.                                                                 |
| **C14 / C15**       | Code: `getSessionCacheKey(tenantId, sessionId)`, `SessionData.orderCount`, idle không evict khi có đơn; legacy key fallback một lần.                             |
| **C09 / C13 / R09** | Types: `OrderConfirmedEvent` enrich, `CartUpdatedEvent`, `BillRequestedEvent`, `TableTransferredEvent`; technical-architecture §7.3 có `bill.requested`.         |
| **C12 / R02**       | Types: `PreparationStation`, `station` trên `MenuItem` / `OrderItem`; cart version vẫn theo session types hiện có.                                               |
| **C06 / Q4**        | Chỉ docs + types; endpoint bill request explicit chờ Order/BFF implement.                                                                                        |
| **C07 / R06**       | Docs đã saga; code transfer chờ Order service.                                                                                                                   |

**Chưa làm trong PR prerequisite:** migration PostgreSQL Catalog thêm cột `station`; handler TCP thực thi `STOCK_*`; bảng `sessions` Order DB; consumer Kafka — thuộc implementation Step 2.4 tiếp theo.
