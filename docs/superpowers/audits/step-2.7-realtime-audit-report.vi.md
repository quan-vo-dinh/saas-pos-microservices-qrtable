# Báo Cáo Audit Realtime FE<->BE Step 2.7

> Phạm vi: chỉ phân tích Business Logic / Architecture. Bản refresh này **không** bao gồm implementation plan.
>
> Ngày refresh: 2026-05-07. Giả định đầu vào từ project owner: toàn bộ 6 batch của Step 2.6 đã triển khai xong.
>
> Cơ sở đọc: `docs/phases/phase-2b-kitchen-websocket.md`, `docs/specs/business-logic-step-2.6-spec.vi.md`, `docs/superpowers/plans/2026-05-07-step-2.6-kitchen-websocket.md`, `docs/architecture/permission-matrix.md` và kết quả dò code có chọn lọc trong `apps/` và `libs/`.

## 1. Trạng thái hiện tại

### 1.1 Kết quả từ Context7 dùng trong bản refresh này

- Tài liệu Socket.IO Client từ Context7 (`/websites/socket_io_v4_client-api`) xác nhận:
  - `io(".../namespace", { auth: { token } })` là pattern chính thống để connect namespace kèm dữ liệu auth.
  - `connect` được bắn ở lần kết nối đầu và cả sau khi reconnect thành công.
  - Không nên đăng ký listener khác bên trong `connect`, vì reconnect có thể tạo listener trùng.
  - `socket.off(eventName, listener)` dùng để gỡ listener.
- Tài liệu TanStack Query từ Context7 (`/tanstack/query`) xác nhận:
  - `queryClient.invalidateQueries(...)` đánh dấu query match là invalid và mặc định refetch các query active.
  - `refetchType` mặc định là `active`.
  - `refetchInterval` là polling fallback khi query còn active observer, độc lập với stale state.

### 1.2 Contract realtime backend hiện có trong code

- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
  - Namespace là `/orders`.
  - `handleConnection()` validate handshake qua `RealtimeAuthService` và chỉ join room do server suy ra.
  - Legacy `join.session` và `join.staff` vẫn còn như compatibility handlers, nhưng chỉ emit `events.authError`; không join room client gửi lên.
  - `subscribe.kds` chỉ cho SUPER_ADMIN/OWNER/MANAGER opt-in station.
- `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
  - Token staff đọc từ `socket.handshake.auth.token` hoặc `Authorization: Bearer`.
  - Room staff suy từ JWT roles: `tenant:{tid}:staff`, room station KDS cho CHEF/BARISTA, và `tenant:{tid}:management` cho SUPER_ADMIN/OWNER/MANAGER.
  - Customer socket hiện yêu cầu `x-tenant-id` và `x-session-id` trong handshake headers; service validate session cache trước khi join `session:{sid}:customer`.
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
  - Emit direct events Step 2.4: `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, `events.billRequested`, `events.tableTransferred`.
  - Emit KDS events Step 2.6: `events.kdsQueueChanged`, `events.kitchenItemReady`, `events.kitchenSlaWarning`.
- `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts`
  - Subscribe Redis pattern `realtime:kds:*` và forward payload `kds.queue_changed` sang `events.kdsQueueChanged`.
- `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`
  - Consume `kitchen.sla_warning` và forward sang `events.kitchenSlaWarning`.
  - Vẫn chưa bridge `order.confirmed` cho customer tracking hoặc `payment.completed` tương lai.
- `apps/bff/src/main.ts`
  - Đăng ký `RedisIoAdapter` trước `app.listen`, khớp contract Redis Adapter của Step 2.6.
- `apps/bff/src/app/modules/kitchen/controllers/kitchen.controller.ts`
  - Có endpoint KDS REST cho queue snapshot, start, done, recall, priority.
  - `done` gọi Kitchen trước, rồi Order `MARK_ITEMS_READY`, sau đó mới emit `events.kitchenItemReady` khi Order thành công.
- `libs/shared/types/src/lib/kds.types.ts`
  - Có canonical KDS types cho `KdsQueueSnapshot`, `KdsQueueChangedEvent`, `KitchenItemReadyEvent`, `KitchenSlaWarningEvent`.

### 1.3 Trạng thái realtime frontend hiện tại

- Customer PWA:
  - `apps/customer-pwa/src/components/layout/mobile-shell.tsx` mount `useCustomerOrderRealtime()`.
  - `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts` tạo Socket.IO client trực tiếp trong hook.
  - Connect `/orders` nhưng không gửi `auth` payload và không gửi tenant/session trong handshake.
  - Khi `connect` thì emit legacy `join.session`; BFF hiện tại reject event này.
  - Lắng nghe `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.billRequested`, `events.tableTransferred`.
  - Không lắng nghe `events.kitchenItemReady`, menu events, disconnect/reconnect events, hoặc `events.authError`.
- Management App POS:
  - `apps/management-app/src/components/pos/pos-app-shell.tsx` mount `useStaffOrderRealtime()`.
  - `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts` tạo Socket.IO client trực tiếp trong hook.
  - Connect `/orders` nhưng không gửi `auth.token`, `Authorization`, hoặc `x-tenant-id`.
  - Khi `connect` thì emit legacy `join.staff`; BFF hiện tại reject event này.
  - Lắng nghe `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, `events.tableTransferred`.
  - Không lắng nghe `events.kitchenItemReady`, menu events, disconnect/reconnect events, hoặc `events.authError`.
- Management App KDS:
  - `apps/management-app/src/components/kds/kds-board.tsx` đã có real KDS mode khi `NEXT_PUBLIC_KDS_MOCK !== '1'`.
  - Real mode dùng `useKdsQueue(station)` cho BFF REST snapshot và `useKdsRealtime(station)` cho Socket.IO invalidation.
  - `apps/management-app/src/features/kds/services/kds.service.ts` gọi BFF KDS REST endpoints cho queue/start/done/recall/priority.
  - `apps/management-app/src/features/kds/hooks/use-kds-realtime.ts` gửi staff token qua Socket.IO `auth.token`, lắng nghe KDS events và invalidate `kdsKeys.queue(tenantId, station)`.
  - KDS mutations trong `KdsBoard` đang strict refetch-after-mutation: start/done/recall invalidate queue khi success; failure hiển thị toast lỗi.
  - Mock mode vẫn tồn tại qua `useFakeRealtime(enabled)`, `useMockStore`, và `NEXT_PUBLIC_KDS_MOCK`.

### 1.4 Query / polling hiện tại

- Management orders:
  - `apps/management-app/src/features/order/hooks/use-order-query.ts`
  - Danh sách order polling 3s cho pending/unfiltered và 5s cho trường hợp còn lại.
  - Chi tiết order polling 4s cho tới terminal statuses.
- Management service requests:
  - `apps/management-app/src/features/service-requests/hooks/use-service-request-query.ts`
  - Danh sách service request polling 3s.
- Management KDS:
  - `apps/management-app/src/features/kds/hooks/use-kds-queue.ts`
  - Query key KDS là `kdsKeys.queue(tenantId, station)`.
  - `staleTime` là `0`; chưa có `refetchInterval` fallback.
  - `useKdsRealtime()` invalidate khi `connect`, `events.kdsQueueChanged`, `events.kitchenItemReady`, `events.kitchenSlaWarning`.
- Customer order domain:
  - `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
  - Không polling; dựa vào mutation và realtime invalidation.
- Customer menu:
  - `apps/customer-pwa/src/features/menu/hooks/use-menu-query.ts`
  - Public menu key là `customerMenuKeys.fullMenu(tenantId)`, `staleTime = 5 minutes`, chưa có realtime listener.
- Management menu:
  - `apps/management-app/src/features/menu/hooks/use-menu-query.ts`
  - Keys gồm `menuKeys.categories()`, `menuKeys.items(categoryId)`, `menuKeys.item(id)`, chưa có realtime listener.

### 1.5 Mock / fake realtime còn tồn tại

- `apps/management-app/src/mocks/use-fake-realtime.ts`
  - Hiện nhận `enabled = true`; KDS live mode truyền `false`.
  - Vẫn synthesize order/service/status events khi mock mode bật.
- `apps/customer-pwa/src/mocks/use-fake-realtime.ts`
  - Vẫn synthesize order status changes và local `MenuItemStockChangedEvent`.
  - File ghi rõ local menu stock push chưa đồng bộ contract BFF Direct WebSocket.
- `apps/management-app/src/components/kds/kds-batching-panel.tsx`
  - Vẫn gom tickets theo `menuItemName`, label panel là "Batching", và đang được render cả trong mock lẫn live KDS vì `KdsBoard` truyền live `tickets={kdsTickets}`.
  - Đây là mismatch lớn nhất còn lại với chính sách no-batching của Step 2.6.

## 2. Audit contract sự kiện realtime

Legend:

- A = Backend hiện emit trong code.
- B = Spec/plan Step 2.6 nói nên emit.
- C = Phase doc có đề cập nhưng contract chưa chốt đủ.
- D = FE hiện mock/fake/suy diễn.
- F = FE có listener/invalidation thật.
- E = Không tìm thấy dấu vết đáng kể.

| Event                                        | Phân loại  | Ghi chú / bằng chứng                                                                                                                                                                                                               |
| -------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events.cartUpdated`                         | A, B, F    | BFF emit trong `RealtimeEventsService`; order controllers có gọi. Customer PWA listen và invalidate cart/bill/order queries. Management POS chưa listen trực tiếp.                                                                 |
| `events.orderCreated`                        | A, B, D, F | BFF emit trong customer submit flow. Customer PWA và Management POS listen. Management mock realtime vẫn synthesize order-created khi mock mode bật.                                                                               |
| `events.orderStatusChanged`                  | A, B, D, F | BFF emit trong order controller flows và KDS done sync path. Customer PWA và Management POS listen. Mock realtime PWA/Management vẫn synthesize status movement trong mock paths.                                                  |
| `events.serviceRequested`                    | A, B, D, F | BFF emit trong service request paths. Management POS listen. Management mock realtime vẫn synthesize service requests.                                                                                                             |
| `events.billRequested`                       | A, B, F    | BFF emit; Customer PWA listen. Management POS bill surfaces chưa có WS listener cho event này.                                                                                                                                     |
| `events.tableTransferred`                    | A, B, F    | BFF emit sau staff transfer flow. Customer PWA và Management POS listen và invalidate rộng state theo session/POS.                                                                                                                 |
| `events.kdsQueueChanged`                     | A, B, D, F | Kitchen Redis Pub/Sub -> BFF -> WS đã có. Management KDS real hook listen và invalidate `kdsKeys.queue(...)`. Mock mode vẫn tự suy thay đổi KDS local khi bật.                                                                     |
| `events.kitchenItemReady`                    | A, B, D, F | BFF chỉ emit sau khi Kitchen ready và Order readiness update thành công. Management KDS real hook listen và invalidate KDS queue, nhưng Customer PWA và Management POS chưa listen trực tiếp. Mock status flows vẫn suy readiness. |
| `events.kitchenSlaWarning`                   | A, B, D, F | Kafka `kitchen.sla_warning` -> BFF Kafka bridge -> WS đã có. Management KDS real hook listen và invalidate KDS queue. KDS UI vẫn tính SLA watch local trong `KdsBatchingPanel`.                                                    |
| `events.menuUpdated` / `events.menu.updated` | C, D, E    | Phase doc có nhắc `menu.updated`, nhưng search code chưa thấy backend emitter, shared type hoặc FE listener. PWA mock local `MenuItemStockChangedEvent` không phải backend contract.                                               |

## 3. Xung đột và điểm mù

### 3.1 Customer PWA và Management POS vẫn xung đột với BFF handshake đã harden

- BFF room assignment hiện là server-managed.
- Customer PWA vẫn emit `join.session` sau `connect`.
- Management POS vẫn emit `join.staff` sau `connect`.
- Gateway BFF hiện reject cả hai legacy join events bằng `events.authError`.
- Kết quả: socket POS/PWA có thể connect nhưng không join được room hữu ích dưới gateway đã harden.

### 3.2 KDS realtime handshake đã đi trước POS/PWA, nhưng vẫn chưa đủ

- `useKdsRealtime()` đã truyền staff token qua `auth.token`, khớp docs Socket.IO từ Context7 và code auth hiện tại của BFF.
- Hook không gửi `x-tenant-id`; hiện BFF có thể suy tenant từ JWT nên chấp nhận được nếu mọi staff JWT đều có `tenant_id`.
- Hook chưa listen `events.authError`, `disconnect`, `reconnect_error`, hoặc manager-level `socket.io.on('reconnect')`.
- Hook invalidate khi `connect`, mà Socket.IO docs xác nhận `connect` chạy lại sau reconnect, nhưng chưa expose reconnect UI state.

### 3.3 Filter event KDS còn quá rộng với traffic multi-station / management-room

- `useKdsRealtime()` filter `events.kdsQueueChanged` theo `tenantId`, nhưng chưa filter theo `station`.
- Hook không filter `events.kitchenItemReady` hoặc `events.kitchenSlaWarning` theo tenant/station.
- Vì BFF emit KDS queue changes tới `tenant:{tid}:management`, trang KDS của OWNER/MANAGER có thể nhận hint của cả KITCHEN và BAR rồi invalidate station hiện tại không cần thiết.
- Vì mọi staff socket cũng join `tenant:{tid}:staff`, KDS socket có thể nhận staff-wide `events.kitchenItemReady` và invalidate dù event không thuộc station hiện tại.
- Đây không phải lỗi data isolation nếu REST snapshot vẫn được guard, nhưng gây refetch ồn và không đúng ngữ nghĩa station.

### 3.4 KDS live path vẫn render UI batching

- Step 2.6 cấm rõ batching/gom cùng món giữa các bàn.
- `KdsBatchingPanel` gom active tickets theo `menuItemName`, hiển thị tổng quantity và số bàn, và đang render với dữ liệu REST live.
- Vấn đề này không còn chỉ là mock-only; nó là rủi ro acceptance của Step 2.7.

### 3.5 Snapshot KDS đã có, nhưng revision policy chưa có

- `useKdsQueue()` fetch REST snapshot và `useKdsRealtime()` invalidate snapshot đó.
- `KdsQueueChangedEvent` có `revision`; `KdsQueueSnapshot` có `revision` và `serverTime`.
- FE chưa track last revision hoặc phát hiện revision gap.
- Hiện vẫn an toàn vì mọi event đều invalidate snapshot, nhưng spec cuối cần chốt có cần revision-gap detection ở Step 2.7 hay chỉ "always refetch on hint" là đủ.

### 3.6 UX action KDS đang strict refetch-after-mutation

- `KdsBoard` dùng mutations cho start/done/recall và invalidate queue khi success.
- Live mode không optimistic move toàn bộ queue.
- Điều này khớp nguyên tắc an toàn của Step 2.6: REST snapshot là source of truth, nhất là `done` phụ thuộc cả Kitchen + Order success.
- Gap UX còn lại: pending state của button/drag chưa được chốt rõ trong audit/spec.

### 3.7 `menu.updated` vẫn mơ hồ và chưa triển khai

- Phase doc có nói menu realtime refresh.
- Bảng event Step 2.6 chưa finalize menu WS event.
- BFF catalog controllers hiện chỉ invalidate cache key như `menu:{tenantId}`, chưa emit realtime event.
- Không có FE menu hook nào listen menu events.

### 3.8 Kafka bridge BFF vẫn hẹp hơn wording trong phase doc

- Phase doc nhắc `order.confirmed -> session:{sid}:customer`, `kitchen.sla_warning -> management`, và tương lai `payment.completed`.
- Code bridge BFF hiện chỉ consume `kitchen.sla_warning`.
- Step 2.7 nên xem customer order tracking là BFF Direct + REST snapshot invalidation, trừ khi thêm bridge khác rõ ràng sau này.

### 3.9 Polling reduction cần theo từng domain

- KDS live mode hiện chưa có polling fallback.
- POS orders và service requests vẫn polling mạnh.
- Customer PWA không polling và hiện chưa join được hardened socket room.
- Giảm polling trước khi fix handshake POS/PWA sẽ tăng rủi ro stale UI.

## 4. Kiến trúc realtime FE đề xuất sau refresh

### 4.1 Vị trí socket client / factory

Đề xuất cho spec Step 2.7:

- Giữ socket factory/hook riêng theo app trong Step 2.7:
  - Customer PWA và Management App có nguồn credential khác nhau.
  - Management KDS đã có domain hook; POS nên align theo cùng auth pattern.
- Management App:
  - Reuse KDS handshake pattern (`auth.token`) cho `useStaffOrderRealtime()`.
  - Dừng dùng `join.staff`.
  - Thêm xử lý chung cho `events.authError`, disconnect/reconnect state và manager-level reconnect events.
- Customer PWA:
  - Dừng dùng `join.session`.
  - Chốt customer identity dùng Socket.IO `auth: { tenantId, sessionId }`, headers, hoặc transition hỗ trợ cả hai.
  - BFF hiện hỗ trợ headers, chưa hỗ trợ `auth` cho customer session.
- KDS:
  - Giữ `useKdsQueue()` và `useKdsRealtime()` làm boundary thật theo station.
  - Thêm filter station/tenant trước khi invalidate.
  - Chốt có cần slow active polling fallback cho KDS không.

### 4.2 Ma trận event -> query invalidation

| Event                                        | App / trang                  | Query key hoặc domain                                                              | Code hiện tại                                                        | Hành động Step 2.7 đề xuất                                                            |
| -------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `events.cartUpdated`                         | Customer PWA                 | `cartKeys.snapshot(tenantId, sessionId)`, `billKeys.current(...)`, `orderKeys.all` | Có listener nhưng socket join hỏng dưới BFF harden.                  | Fix handshake, rồi invalidate active queries ngay.                                    |
| `events.orderCreated`                        | Customer PWA                 | `orderKeys.list(...)`, `orderKeys.detail(..., orderId)`, cart/bill scope           | Có listener nhưng socket join hỏng.                                  | Fix handshake; detail/list invalidation vẫn đúng.                                     |
| `events.orderCreated`                        | Management POS               | `orderKeys.lists()`, `orderKeys.details()`, `tableKeys.all`                        | Có listener nhưng socket join hỏng. Polling vẫn bù.                  | Fix staff auth handshake; giữ polling fallback lúc đầu.                               |
| `events.orderStatusChanged`                  | Customer PWA                 | `orderKeys.detail(...)`, `orderKeys.list(...)`, có thể `billKeys.current(...)`     | Có listener nhưng socket join hỏng.                                  | Fix handshake; invalidate snapshot, chỉ patch nhẹ status chip nếu cần.                |
| `events.orderStatusChanged`                  | Management POS               | `orderKeys.lists()`, `orderKeys.detail(orderId)`, `tableKeys.all`                  | Có listener nhưng socket join hỏng. Polling vẫn bù.                  | Fix staff auth handshake; invalidate active queries.                                  |
| `events.serviceRequested`                    | Management POS/service inbox | `serviceRequestKeys.lists()`                                                       | Có listener nhưng socket join hỏng. Query riêng vẫn polling 3s.      | Fix staff auth handshake; giảm polling sau khi WS smoke pass.                         |
| `events.billRequested`                       | Customer PWA                 | `billKeys.current(...)`, `cartKeys.snapshot(...)`, `orderKeys.all`                 | Có listener nhưng socket join hỏng.                                  | Fix handshake; invalidate ngay.                                                       |
| `events.tableTransferred`                    | Customer PWA                 | Session-scoped order/cart/bill keys                                                | Có listener nhưng socket join hỏng.                                  | Fix handshake; snapshot vẫn là source of truth cho table labels.                      |
| `events.tableTransferred`                    | Management POS/table map     | `orderKeys.lists()`, `serviceRequestKeys.lists()`, `tableKeys.all`                 | Có listener nhưng socket join hỏng.                                  | Fix handshake; invalidate ngay.                                                       |
| `events.kdsQueueChanged`                     | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                 | Có real listener và invalidate queue.                                | Giữ REST snapshot refetch; thêm station filter và debounce nếu cần.                   |
| `events.kitchenItemReady`                    | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                 | Có real listener nhưng chưa xét tenant/station.                      | Filter trước khi invalidate hoặc bỏ listener nếu `events.kdsQueueChanged` đã đủ.      |
| `events.kitchenItemReady`                    | Customer PWA                 | `orderKeys.detail(...)`, `orderKeys.list(...)`                                     | Chưa listener. Customer có thể vẫn nhận `events.orderStatusChanged`. | Thêm listener nếu UX cần item-ready; nếu không, dựa vào order status event + refetch. |
| `events.kitchenItemReady`                    | Management POS               | `orderKeys.lists()`, `orderKeys.detail(orderId)`                                   | Chưa listener.                                                       | Chỉ thêm nếu POS cần freshness món-ready ngoài `events.orderStatusChanged`.           |
| `events.kitchenSlaWarning`                   | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                 | Có real listener nhưng chưa filter.                                  | Filter theo tenant/station; snapshot `warningLevel` vẫn là source of truth.           |
| `events.menuUpdated` / `events.menu.updated` | Customer menu                | `customerMenuKeys.fullMenu(tenantId)`                                              | Chưa có backend/FE event.                                            | Giữ là open question; không claim menu realtime khi chưa có backend emitter.          |
| `events.menuUpdated` / `events.menu.updated` | Management menu admin        | `menuKeys.all`                                                                     | Chưa có backend/FE event.                                            | Tương tự.                                                                             |

### 4.3 Chính sách reconnect và đồng bộ state

Đề xuất:

- Reconnect phải trigger snapshot refetch cho domain đang active.
- Với KDS, listener `connect` hiện tại đã invalidate sau reconnect vì Socket.IO bắn lại `connect`.
- Tuy vậy spec cuối vẫn nên thêm manager-level reconnect/error handling cho UI state:
  - `socket.io.on('reconnect')`: refetch active domain.
  - `socket.io.on('reconnect_error')`: đánh dấu degraded, tránh spam toast.
  - `socket.on('disconnect')`: hiển thị indicator nhỏ.
  - `events.authError`: dừng retry âm thầm và hiển thị recovery auth/session.
- Không dựa vào packet replay từ Socket.IO Redis Adapter; Step 2.6 không có durable WS replay.
- REST snapshots là source of truth:
  - Customer: order/cart/bill snapshots.
  - POS: orders/tables/service-request snapshots.
  - KDS: station queue snapshot.

### 4.4 Chính sách polling fallback

- POS orders: giữ 3s/5s hiện tại tới khi `useStaffOrderRealtime()` chuyển sang server-managed auth; sau đó giảm về 10-15s active-route fallback.
- Service requests: giữ 3s tới khi `events.serviceRequested` smoke pass với hardened staff socket; sau đó giảm 10-15s.
- KDS queue: live mode hiện chưa có polling fallback. Cần chốt có thêm active fallback 10-15s trong giai đoạn production-like đầu tiên không.
- Customer PWA: hiện không polling. Không thêm high-frequency polling; fix socket handshake trước và chỉ cân nhắc slow active tracking fallback nếu cần.
- Menu: không thêm polling để giả lập `menu.updated`; hoặc implement backend event, hoặc giữ cache/staleTime hiện tại.

### 4.5 RBAC / room / tenant isolation

- BFF đã implement server-derived room assignment và nên giữ là source of truth.
- FE route/sidebar RBAC vẫn chỉ là UX.
- CHEF/BARISTA station access được enforce lại ở BFF REST qua `KdsStationAccessService`.
- OWNER/MANAGER nhận management room và có thể request station room qua `subscribe.kds`.
- Customer socket không được join tenant/staff/KDS/management rooms.
- FE Step 2.7 chỉ gửi identity/auth material, không gửi room names.

### 4.6 Quy tắc UX state

- KDS live actions nên tiếp tục strict refetch-after-mutation cho done/recall/priority.
- Start có thể strict như hiện tại; có thể thêm pending affordance, nhưng không biến optimistic movement thành source of truth.
- Khi API fail, giữ snapshot cũ, show một lỗi có ngữ cảnh, và cho retry.
- Animation ticket slide-in KDS nên dựa trên snapshot diff theo `ticketId`, không dựa vào WS payload đơn lẻ.
- SLA warning state nên lấy từ snapshot `warningLevel`; WS warning chỉ là hint invalidate/alert nhanh.
- Nếu thêm toast item-ready/SLA thì dedupe theo `eventId` hoặc mutation `requestId`.

### 4.7 No batching / no routing hardcode

- FE không được batch, group, aggregate KDS tickets như một workflow concept.
- FE không được suy KITCHEN/BAR routing từ item name/category.
- KDS display phải dùng `station` và ticket data backend trả về.
- `KdsBatchingPanel` hiện tại cần bị gỡ khỏi live mode, đổi thành panel SLA/watchlist không gom món, hoặc chỉ chạy khi `NEXT_PUBLIC_KDS_MOCK=1` trước khi Step 2.7 được xem là aligned.

## 5. Open Questions

### Q1. Có implement `menu.updated` trong Step 2.7 hay defer?

- Option A: Implement backend menu event ngay.
  - Trade-off: Khớp phase wording, nhưng cần thêm Catalog/BFF event work.
- Option B: Defer backend event và chỉ document future-ready FE hook contract.
  - Trade-off: Trung thực với code hiện tại, nhưng Step 2.7 không thể claim instant menu refresh.
- Option C: Giữ cache/mutation-only behavior hiện tại.
  - Trade-off: Ít rủi ro nhất, nhưng không realtime.

Recommendation: Option B trừ khi backend Catalog event emission được đưa rõ vào scope ngay bây giờ.

### Q2. POS live orders có giữ polling fallback không?

- Option A: Giữ 3s/5s hiện tại tới khi staff socket auth được fix.
- Option B: Giảm về 10-15s sau khi realtime smoke pass.
- Option C: Tắt polling khi socket connected.

Recommendation: Option A hiện tại, sau đó Option B khi `useStaffOrderRealtime()` bỏ `join.staff`.

### Q3. Có chấp nhận policy KDS strict refetch-after-mutation hiện tại không?

- Option A: Chấp nhận strict policy cho start/done/recall/priority.
- Option B: Thêm optimistic start only.
- Option C: Optimistic board movement toàn phần.

Recommendation: Option A cho Step 2.7; revisit optimistic start sau.

### Q4. KDS có giữ `KdsBatchingPanel` trong live mode không?

- Option A: Gỡ khỏi live mode.
- Option B: Rework thành panel SLA/watchlist không gom nhóm.
- Option C: Chỉ giữ khi `NEXT_PUBLIC_KDS_MOCK=1`.

Recommendation: Option B nếu right rail còn hữu ích; nếu không thì Option C. Không giữ same-item aggregation trong live mode.

### Q5. KDS realtime có cần filter theo station trước khi invalidate không?

- Option A: Filter mọi KDS event theo tenant và station.
- Option B: Giữ invalidate rộng vì REST snapshot đã guard.
- Option C: Chỉ filter `events.kdsQueueChanged`, còn SLA/ready invalidate rộng.

Recommendation: Option A. Giảm refetch ồn và khớp ngữ nghĩa station-room.

### Q6. Customer socket handshake nên dùng gì?

- Option A: Browser Socket.IO extra headers (`x-tenant-id`, `x-session-id`) only.
- Option B: Socket.IO `auth: { tenantId, sessionId }` only.
- Option C: BFF hỗ trợ cả hai trong giai đoạn transition, sau đó chuẩn hoá sang `auth`.

Recommendation: Option C, vì BFF hiện hỗ trợ headers còn `auth` là pattern client sạch hơn theo Context7.

### Q7. Reconnect thì refetch current route hay toàn bộ active domain?

- Option A: Current route only.
- Option B: Active domain đang mounted trong app shell.
- Option C: Active + inactive cached domain queries.

Recommendation: Option B; dùng default active refetch của TanStack Query và tránh `refetchType: all` nếu không thật sự cần.

### Q8. Có cần Playwright E2E thật không?

- Option A: Full E2E từ PWA -> POS -> KDS -> PWA ready.
- Option B: Unit/integration tests + manual smoke.
- Option C: Một Playwright golden path mỏng + hook/unit tests + manual Redis/Kafka smoke.

Recommendation: Option C, nhất là scenario disconnect 10s -> reconnect -> refetch snapshot.
