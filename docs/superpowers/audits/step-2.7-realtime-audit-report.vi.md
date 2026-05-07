# Báo Cáo Audit Realtime FE↔BE Step 2.7

> Phạm vi: chỉ phân tích Business Logic / Architecture. Tài liệu này chủ đích **không** bao gồm implementation plan.
>
> Cơ sở đọc: `docs/phases/phase-2b-kitchen-websocket.md`, `docs/specs/business-logic-step-2.6-spec.vi.md`, `docs/superpowers/plans/2026-05-07-step-2.6-kitchen-websocket.md`, `docs/architecture/permission-matrix.md` và kết quả dò code có chọn lọc trong `apps/` và `libs/`.
>
> Lưu ý quan trọng: Step 2.6 có vẻ đang được triển khai dở trong working tree. Cụm "code hiện tại đang có" bên dưới nghĩa là trạng thái file local tại thời điểm audit, **không** phải baseline Step 2.6 đã hoàn tất/merge.

## 1. Trạng thái hiện tại

### 1.1 Kết quả từ tài liệu Context7 dùng trong audit này

- Tài liệu Socket.IO Client từ Context7 (`/websites/socket_io_v4_client-api`) xác nhận:
  - `io(".../namespace", { auth: { token } })` là pattern chính thống để connect namespace kèm dữ liệu auth.
  - `connect` được bắn ở lần kết nối đầu và cả sau khi reconnect thành công.
  - Các sự kiện reconnect ở manager-level như `reconnect`, `reconnect_attempt`, `reconnect_error` cần lắng nghe qua `socket.io.on(...)`.
  - `socket.off(eventName, listener)` dùng để gỡ listener.
  - Docs cảnh báo không đăng ký listener khác bên trong `connect`, vì `connect` sẽ chạy lại sau reconnect và dễ tạo listener trùng.
- Tài liệu TanStack Query từ Context7 (`/tanstack/query`) xác nhận:
  - `queryClient.invalidateQueries(...)` sẽ đánh dấu query invalid và mặc định refetch các query active ở nền.
  - `refetchType` có thể là `active`, `inactive`, `all`, `none`; mặc định là `active`.
  - `refetchInterval` sẽ polling theo timer cố định khi query còn active observer, độc lập với `staleTime`.

### 1.2 Contract realtime backend hiện có trong code

- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
  - Namespace: `/orders`.
  - `handleConnection()` hiện uỷ quyền validate handshake cho `RealtimeAuthService` và chỉ join room do server suy ra.
  - Legacy `join.session` và `join.staff` vẫn còn, nhưng chỉ emit `events.authError`; không còn join room theo client gửi lên.
  - `subscribe.kds` chỉ dành cho OWNER/MANAGER/SUPER_ADMIN để opt-in station.
- `apps/bff/src/app/modules/realtime/services/realtime-auth.service.ts`
  - Token staff đọc từ `socket.handshake.auth.token` hoặc `Authorization: Bearer`.
  - Room staff suy từ JWT roles: `tenant:{tid}:staff`, room station KDS cho CHEF/BARISTA, và `tenant:{tid}:management` cho SUPER_ADMIN/OWNER/MANAGER.
  - Customer hiện yêu cầu `x-tenant-id` và `x-session-id` trong handshake headers, rồi validate session cache trước khi join `session:{sid}:customer`.
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
  - Emit direct events Step 2.4: `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, `events.billRequested`, `events.tableTransferred`.
  - Emit KDS events Step 2.6: `events.kdsQueueChanged`, `events.kitchenItemReady`, `events.kitchenSlaWarning`.
- `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts`
  - Subscribe Redis pattern `realtime:kds:*` và forward payload `kds.queue_changed` sang `events.kdsQueueChanged`.
- `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`
  - Chỉ consume `kitchen.sla_warning` và forward sang `events.kitchenSlaWarning`.
  - Hiện chưa bridge `order.confirmed` cho customer tracking hoặc `payment.completed` trong tương lai.
- `apps/bff/src/main.ts`
  - Đăng ký `RedisIoAdapter` trước `app.listen`, đúng hướng Redis Adapter của Step 2.6.
- `apps/bff/src/app/modules/kitchen/controllers/kitchen.controller.ts`
  - Có endpoint KDS REST cho queue snapshot, start, done, recall, priority.
  - `done` gọi Kitchen trước, rồi Order `MARK_ITEMS_READY`, sau đó mới emit `events.kitchenItemReady` khi Order thành công.
- `libs/shared/types/src/lib/kds.types.ts`
  - Đã có canonical KDS types cho `KdsQueueSnapshot`, `KdsQueueChangedEvent`, `KitchenItemReadyEvent`, `KitchenSlaWarningEvent`.

### 1.3 Trạng thái realtime frontend hiện tại

- Customer PWA:
  - `apps/customer-pwa/src/components/layout/mobile-shell.tsx` mount `useCustomerOrderRealtime()`.
  - `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts` tạo Socket.IO client trực tiếp trong hook.
  - Connect `/orders` nhưng không gửi `auth` payload và cũng không gửi dữ liệu tenant/session trong handshake.
  - Khi `connect` thì emit legacy `join.session`; BFF hiện tại sẽ reject.
  - Lắng nghe `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.billRequested`, `events.tableTransferred`.
  - Không lắng nghe `events.kitchenItemReady`, `events.menuUpdated`, `events.menu.updated`, `disconnect`, `reconnect`, `reconnect_error`, `events.authError`.
- Management App POS:
  - `apps/management-app/src/components/pos/pos-app-shell.tsx` mount `useStaffOrderRealtime()`.
  - `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts` tạo Socket.IO client trực tiếp trong hook.
  - Connect `/orders` nhưng không gửi `auth.token`, `Authorization`, hay `x-tenant-id`.
  - Khi `connect` thì emit legacy `join.staff`; BFF hiện tại sẽ reject.
  - Lắng nghe `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, `events.tableTransferred`.
  - Không lắng nghe `events.kdsQueueChanged`, `events.kitchenItemReady`, `events.kitchenSlaWarning`, menu events, reconnect events, auth errors.
- Management App KDS:
  - `apps/management-app/src/app/(kds)/kds/kitchen/page.tsx` và `/bar/page.tsx` render `KdsBoard`.
  - `apps/management-app/src/components/kds/kds-board.tsx` đang dùng `useMockStore` và `useFakeRealtime`; chưa gọi BFF KDS REST, chưa dùng invalidation qua Socket.IO.
  - `apps/management-app/src/components/kds/kds-batching-panel.tsx` đang gom ticket active theo `menuItemName`, hiển thị "Batching", tổng quantity và số bàn. Đây là mock UI nhưng xung đột với chính sách no-batching của Step 2.6 nếu bê nguyên vào bản thật.

### 1.4 Query / polling hiện tại

- Management orders:
  - `apps/management-app/src/features/order/hooks/use-order-query.ts`
  - Danh sách order polling 3s cho pending/unfiltered và 5s cho trường hợp còn lại.
  - Chi tiết order polling 4s cho đến khi tới terminal statuses.
- Management service requests:
  - `apps/management-app/src/features/service-requests/hooks/use-service-request-query.ts`
  - Danh sách service request polling 3s.
- Customer order domain:
  - `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
  - Không polling; dựa vào query invalidation và mutation.
- Customer menu:
  - `apps/customer-pwa/src/features/menu/hooks/use-menu-query.ts`
  - Key menu public là `customerMenuKeys.fullMenu(tenantId)`, `staleTime = 5 minutes`, chưa có realtime listener.
- Management menu:
  - `apps/management-app/src/features/menu/hooks/use-menu-query.ts`
  - Keys gồm `menuKeys.categories()`, `menuKeys.items(categoryId)`, `menuKeys.item(id)`, chưa có realtime listener.

### 1.5 Phần mock / fake realtime còn tồn tại

- `apps/management-app/src/mocks/use-fake-realtime.ts`
  - Tự tạo `OrderCreatedEvent`, `ServiceRequestedEvent`, `OrderStatusChangedEvent` bằng timer.
- `apps/customer-pwa/src/mocks/use-fake-realtime.ts`
  - Tự tạo thay đổi order status và `MenuItemStockChangedEvent` local.
  - File ghi rõ đây là local-only cho push stock mock, không đồng bộ với contract BFF Direct WebSocket.
- `apps/management-app/src/components/kds/kds-board.tsx`
  - Có gọi `useFakeRealtime()` và đọc toàn bộ state KDS từ `useMockStore`.
- `apps/management-app/src/components/kds/kds-batching-panel.tsx`
  - Chứa logic gom nhóm batching mock; không được trở thành hành vi Step 2.7.

## 2. Audit contract sự kiện realtime

Legend:

- A = Backend hiện đang emit trong code.
- B = Spec/plan Step 2.6 nói là nên emit.
- C = Phase doc có đề cập nhưng contract chưa chốt đủ.
- D = FE hiện mock/fake/suy diễn sự kiện.
- E = Không tìm thấy dấu vết đáng kể.

| Event                                        | Phân loại | Ghi chú / bằng chứng                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events.cartUpdated`                         | A, B      | BFF emit trong `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`; controller gọi trong flow order customer/staff. Step 2.6 liệt kê là direct event có sẵn. Customer PWA có listen; Management POS chưa listen trực tiếp.                                                    |
| `events.orderCreated`                        | A, B, D   | BFF emit trong `RealtimeEventsService`; flow submit phía customer có gọi. Customer PWA và Management POS đều listen. Fake realtime Management cũng tự synthesize hành vi order-created trong `apps/management-app/src/mocks/use-fake-realtime.ts`.                                                |
| `events.orderStatusChanged`                  | A, B, D   | BFF emit trong flow order controller và nhánh sync KDS done. Customer PWA và Management POS đều listen. Cả PWA và Management mock realtime đều tự sinh chuyển trạng thái.                                                                                                                         |
| `events.serviceRequested`                    | A, B, D   | BFF emit trong flow service request. Management POS có listen. Fake realtime Management tự tạo service request.                                                                                                                                                                                   |
| `events.billRequested`                       | A, B      | BFF có emit; Customer PWA có listen. Management POS có màn bill mock nhưng chưa có WS listener cho event này.                                                                                                                                                                                     |
| `events.tableTransferred`                    | A, B      | BFF emit sau flow staff transfer. Customer PWA và Management POS đều listen và invalidate state rộng theo session/POS.                                                                                                                                                                            |
| `events.kdsQueueChanged`                     | A, B, D   | Spec Step 2.6 nói Redis Pub/Sub nội bộ Kitchen `kds.queue_changed` thành WS `events.kdsQueueChanged`. Code đã có `KdsInternalEventsSubscriber` và `RealtimeEventsService.emitKdsQueueChanged`. KDS Management vẫn dùng mock store/fake realtime thay vì event này.                                |
| `events.kitchenItemReady`                    | A, B, D   | Spec Step 2.6 yêu cầu chỉ emit sau khi Kitchen ready và Order readiness update cùng thành công. Code đang làm vậy trong `apps/bff/src/app/modules/kitchen/controllers/kitchen.controller.ts`. FE chưa listen trực tiếp; mock realtime đang suy theo kiểu `events.orderStatusChanged` local state. |
| `events.kitchenSlaWarning`                   | A, B, D   | Spec Step 2.6 map Kafka `kitchen.sla_warning` sang WS `events.kitchenSlaWarning`. Code có Kafka bridge và WS emitter. FE chưa listen; KDS mock suy cảnh báo SLA từ timer/snapshot cục bộ.                                                                                                         |
| `events.menuUpdated` / `events.menu.updated` | C, D, E   | Phase doc nói `menu.updated` nên broadcast tenant-wide. Bảng event tên trong Step 2.6 §7.6 chưa chốt menu event canonical. Search chưa thấy backend emitter, shared type, FE listener. PWA mock có `MenuItemStockChangedEvent` local nhưng không phải backend contract.                           |

## 3. Xung đột và điểm mù

### 3.1 Flow join FE đang xung đột với handshake BFF đã harden

- Contract dự kiến Step 2.6 và code BFF hiện tại đã chuyển room assignment sang server-managed.
- FE hiện vẫn emit `join.session` và `join.staff` sau `connect`.
- Ở gateway BFF hiện tại, các message legacy này chỉ trả `events.authError`, không join room.
- Kết quả: hook realtime của Customer PWA và Management POS có thể connect nhưng không subscribe được room hữu ích khi gateway harden chạy thật.

### 3.2 FE không gửi dữ liệu auth/session trong handshake Socket.IO

- Context7 xác nhận Socket.IO Client hỗ trợ option `auth` cho namespace connection.
- BFF hiện hỗ trợ staff token qua `socket.handshake.auth.token`.
- Management App đã lưu `accessToken` và `tenantId` ở `apps/management-app/src/lib/auth/auth-store.ts`, nhưng `useStaffOrderRealtime()` chưa đọc/truyền `accessToken`.
- Customer PWA có `sessionId` và `tenantId` trong `SessionProvider`, nhưng `useCustomerOrderRealtime()` chưa truyền lúc handshake.
- Customer auth phía BFF hiện đọc `x-tenant-id` và `x-session-id`; Step 2.7 cần chốt browser FE sẽ gửi qua `auth`, headers hay cả hai.

### 3.3 Vòng đời listener tạm ổn theo từng instance, nhưng reconnect handling còn thiếu

- Cả hai hook FE tạo socket mới khi mount và disconnect khi cleanup, nên rủi ro listener trùng do remount React phần lớn được chặn.
- Hai hook chưa gọi `socket.off(...)` cho listener đặt tên, nhưng vì socket bị disconnect toàn bộ nên rủi ro duplicate hiện khá thấp.
- Cảnh báo Context7 vẫn quan trọng: không đăng ký listener trong `connect`. Code hiện chỉ emit legacy join trong `connect`, nên tránh duplicate listener, nhưng cũng chưa có reconnect snapshot refetch.
- Chưa hook FE nào lắng nghe `socket.io.on('reconnect')`, `socket.io.on('reconnect_error')`, `disconnect`, hoặc `events.authError`.

### 3.4 Step 2.6 coi WS event là "hint"; FE có nơi invalidate rộng, nhưng KDS chưa có snapshot hook

- Hook customer/staff đang invalidate React Query khi nhận event trực tiếp, phù hợp nguyên tắc "hint, không phải source of truth".
- KDS vẫn mock-only và chưa có `useKdsQueue` / `useKdsRealtime`.
- Snapshot KDS Step 2.6 có `revision` và `serverTime`, nhưng FE chưa có logic phát hiện revision gap.

### 3.5 KDS mock UI xung đột chính sách no-batching

- Spec Step 2.6 cấm batch queue, batch item group, grouped KDS row và gom nhóm cùng món.
- `apps/management-app/src/components/kds/kds-batching-panel.tsx` đang gom ticket theo `menuItemName`, hiển thị quantity và số bàn, gắn nhãn "Batching".
- Dù là mock UI, đây là điểm mù Step 2.7 vì có thể vô tình giữ khái niệm batching trên giao diện.

### 3.6 Routing/RBAC FE ở mức coarse, không thay thế được authorize ở API/WS

- `docs/architecture/permission-matrix.md` nêu rõ BFF là source of truth với chuỗi `UserGuard -> TenantGuard -> PermissionGuard`.
- RBAC route/sidebar phía Management chỉ là UX theo role-prefix.
- `apps/management-app/src/lib/auth/role-routing.ts` route CHEF tới `/kds/kitchen`, BARISTA tới `/kds/bar`, OWNER/MANAGER tới dashboard có KDS.
- BFF station access chặt hơn ở `apps/bff/src/app/modules/kitchen/services/kds-station-access.service.ts`, đây là đúng. FE không được xem station permission như security boundary.

### 3.7 `menu.updated` đang mơ hồ

- Phase doc nói `menu.updated` nên broadcast đến mọi tenant rooms.
- Bảng event trong spec Step 2.6 chưa chốt `events.menuUpdated` hay `events.menu.updated`.
- Code hiện chưa có backend emitter/listener/type cho cả hai cách đặt tên.
- Convention naming đang dùng: Socket.IO event `events.camelCase` và payload `eventType` dạng domain dot-case cho KDS events mới. Spec cuối cần chốt mapping này rõ nếu menu refresh thuộc Step 2.7.

### 3.8 Độ phủ Kafka bridge của BFF hẹp hơn phase doc

- Phase doc nói Kafka bridge xử lý `order.confirmed -> session:{sid}:customer`, `kitchen.sla_warning -> management`, và tương lai `payment.completed -> customer`.
- Code hiện chỉ consume `kitchen.sla_warning`.
- Điều này có thể chấp nhận được khi Step 2.6 chưa xong, nhưng Step 2.7 không nên mặc định có Kafka fan-out `order.confirmed` nếu chưa verify.

### 3.9 Hạ tầng realtime có thể thành hard dependency lúc boot

- `apps/bff/src/main.ts` đang `await` kết nối Redis adapter trước khi listen.
- `RealtimeKafkaBridgeService.onModuleInit()` `await` Kafka consumer connect/run.
- Cách này đúng theo hướng platform realtime, nhưng chưa có degraded mode được ghi rõ nếu Redis/Kafka không sẵn sàng. FE vẫn phải xử lý trạng thái disconnected/reconnecting mượt.

## 4. Kiến trúc realtime FE đề xuất

### 4.1 Vị trí socket client / factory

Đề xuất cho spec Step 2.7:

- Giai đoạn đầu dùng socket factory riêng cho từng app, chưa đưa vào shared Nx lib.
  - Customer PWA và Management App có nguồn auth/session khác nhau.
  - Chia sẻ ở mức constants/types sự kiện sau khi contract ổn định là đủ.
- Customer PWA factory:
  - Connect `${BFF_ORIGIN}/orders`.
  - Gửi nhận diện tenant/session trong handshake theo contract chốt cuối.
  - Handle `connect`, `disconnect`, `events.authError` và manager-level reconnect events.
- Management App factory:
  - Connect `${BFF_ORIGIN}/orders`.
  - Gửi staff token qua `auth.token` và tenant context theo form đã chốt.
  - Hỗ trợ `subscribe.kds` chỉ cho OWNER/MANAGER/SUPER_ADMIN opt-in station.
- Ranh giới hook:
  - `useCustomerOrderRealtime`: invalidation cho customer session/order/cart/bill/menu.
  - `useStaffOrderRealtime`: invalidation cho POS live order, service request, table/bill.
  - `useKdsRealtime`: invalidation queue theo station và reconnect snapshot refetch.
  - Không tạo nhiều socket cho widget không liên quan trong cùng app shell trừ khi chủ đích lifecycle riêng.

### 4.2 Ma trận event -> query invalidation

| Event                                           | App / trang                                      | Query key hoặc domain                                                              | Hành động                                                                                                                           |
| ----------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `events.cartUpdated`                            | Customer PWA cart/menu/order shell               | `cartKeys.snapshot(tenantId, sessionId)`, `billKeys.current(...)`, `orderKeys.all` | Invalidate ngay các query active. Chỉ nên cache update trực tiếp cho cart snapshot nếu payload còn đủ dữ liệu.                      |
| `events.orderCreated`                           | Customer PWA order tracking                      | `orderKeys.list(...)`, `orderKeys.detail(..., orderId)`, scope cart/bill           | Invalidate ngay. Có thể fetch detail trực tiếp nếu route cần.                                                                       |
| `events.orderCreated`                           | Management POS `/pos`                            | `orderKeys.lists()`, `orderKeys.details()`, `tableKeys.all`                        | Invalidate ngay. UI "slide in" nên suy từ snapshot diff, không dựa payload event đơn lẻ. Giữ polling fallback ở giai đoạn đầu.      |
| `events.orderStatusChanged`                     | Customer order tracking                          | `orderKeys.detail(...)`, `orderKeys.list(...)`, có thể `billKeys.current(...)`     | Invalidate ngay. Cache patch nhẹ chỉ cho status chip đang nhìn thấy trong lúc chờ refetch.                                          |
| `events.orderStatusChanged`                     | Management POS                                   | `orderKeys.lists()`, `orderKeys.detail(orderId)`, `tableKeys.all`                  | Invalidate ngay. Không dùng event như nguồn đầy đủ của order.                                                                       |
| `events.serviceRequested`                       | Management service inbox / POS panel             | `serviceRequestKeys.lists()`                                                       | Invalidate ngay. Polling fallback có thể giảm nhịp sau khi WS ổn định.                                                              |
| `events.billRequested`                          | Customer current bill / cart lock                | `billKeys.current(...)`, `cartKeys.snapshot(...)`, `orderKeys.all`                 | Invalidate ngay.                                                                                                                    |
| `events.billRequested`                          | Management POS bill/payment nếu đã có query thật | Query keys của bill/current-payment domain                                         | Giữ dưới dạng mapping tương lai, không giả lập nếu chưa có query thật.                                                              |
| `events.tableTransferred`                       | Customer PWA                                     | Session-scoped order/cart/bill keys                                                | Invalidate ngay; snapshot là nguồn thật cho table labels.                                                                           |
| `events.tableTransferred`                       | Management POS/table map                         | `orderKeys.lists()`, `serviceRequestKeys.lists()`, `tableKeys.all`                 | Invalidate ngay.                                                                                                                    |
| `events.kdsQueueChanged`                        | Management KDS station page                      | Đề xuất `kdsQueueKeys.queue(station)`                                              | Bắt buộc refetch snapshot. Debounce 250-500ms khi burst. Dùng `revision` gap để force refetch.                                      |
| `events.kitchenItemReady`                       | Customer order tracking                          | `orderKeys.detail(...)`, `orderKeys.list(...)`, có thể `billKeys.current(...)`     | Invalidate ngay. Toast chỉ một lần theo `eventId`.                                                                                  |
| `events.kitchenItemReady`                       | Management POS                                   | `orderKeys.lists()`, `orderKeys.detail(orderId)`                                   | Invalidate ngay. KDS queue đã nên refresh qua `events.kdsQueueChanged`; không mark ready cục bộ cho KDS từ event này.               |
| `events.kitchenSlaWarning`                      | Management KDS / management overview             | `kdsQueueKeys.queue(station)`                                                      | Refetch snapshot, có thể hiển thị alert dedupe theo payload. Snapshot `warningLevel` vẫn là source of truth.                        |
| `events.menuUpdated` hoặc `events.menu.updated` | Customer public menu                             | `customerMenuKeys.fullMenu(tenantId)`                                              | Nếu event được implement thì invalidate menu query active ngay. Không mutate menu cache từ event partial.                           |
| `events.menuUpdated` hoặc `events.menu.updated` | Management menu admin                            | `menuKeys.all`                                                                     | Nếu event được implement thì invalidate categories/items/detail keys. Invalidation từ local mutation vẫn giữ cho thao tác cùng tab. |

### 4.3 Chính sách reconnect và đồng bộ state

Đề xuất:

- Mọi reconnect sau disconnect, tab sleep, VPN chập chờn hoặc app thức dậy nền đều phải trigger snapshot refetch cho domain đang active.
- Vì Socket.IO `connect` bắn lại sau reconnect, socket layer có thể set state "connected" ở đây; tuy nhiên với reconnect-specific refetch thì `socket.io.on('reconnect')` rõ ràng hơn.
- Không dựa vào replay packet từ Socket.IO Redis Adapter; Step 2.6 nêu rõ không có durable WS packet replay.
- Dùng `revision` event chỉ để phát hiện gap KDS; thấy gap thì refetch snapshot KDS.
- Tách trạng thái reconnect UI khỏi data:
  - connected: bình thường.
  - disconnected/reconnecting: hiển thị indicator nhỏ, không chặn thao tác.
  - auth error: hiển thị trạng thái recovery và dừng retry âm thầm nếu server đã từ chối credentials.
- Khi reconnect:
  - Customer order route: refetch order detail/list, current cart, current bill.
  - Customer menu route: refetch menu chỉ khi menu event đã chốt hoặc route active và stale.
  - Staff POS: refetch orders, selected order hiện tại, tables, service requests, và query bill/payment nếu đang mount.
  - KDS: refetch queue snapshot của station hiện tại và thay thế local queue state.

### 4.4 Chính sách polling fallback

- Giữ polling trong lúc contract Step 2.6/2.7 còn đang tích hợp.
- Không tắt polling cho một domain cho tới khi verify cả backend emit event lẫn handshake/listener FE.
- Gợi ý chuyển tiếp:
  - POS order list: giữ 3s/5s đến khi WS auth fix xong; sau đó giảm về 10-15s hoặc chỉ active route.
  - POS order detail: giữ 4s khi panel chi tiết mở; sau này giảm hoặc dùng event invalidation + reconnect refetch.
  - Service requests: giữ 3s đến khi `events.serviceRequested` được verify; sau đó giảm 10-15s.
  - KDS queue: khi có real query, dùng WS invalidation + fallback 10-15s active cho tới khi Redis Pub/Sub KDS chứng minh ổn định.
  - Customer PWA order tracking: có thể không cần polling nếu socket auth/reconnect snapshot đáng tin cậy; cân nhắc fallback chậm cho route tracking active nếu vận hành nhà hàng cần.
  - Menu: không thêm polling chỉ để bù `menu.updated`; hoặc implement backend event, hoặc giữ `staleTime` hiện tại và invalidation theo mutation.

### 4.5 RBAC / room / tenant isolation

- Server phải là bên quyết định room.
- FE không được gửi `tenantId`, `sessionId`, station room như room name tin cậy.
- `subscribe.kds` chỉ chấp nhận là request xin xem station cho management; server vẫn validate OWNER/MANAGER/SUPER_ADMIN.
- CHEF và BARISTA chỉ nhận room station do role suy ra từ server.
- OWNER/MANAGER nhận management room và có thể opt-in station rooms.
- Customer socket chỉ được join `session:{sid}:customer` sau session validation, và tuyệt đối không nhận `tenant:{tid}:staff`, KDS, hoặc management rooms.
- Route/sidebar role routing của FE cần cho UX, nhưng authorize API/WS vẫn phải là source of truth.

### 4.6 Quy tắc trạng thái UX

- KDS start/done/recall/priority phải xem REST snapshot là nguồn thật.
- Optimistic UI chỉ nên giới hạn ở disabled buttons, pending spinner và affordance local khi mutation đang chạy.
- Done phải strict: nếu sync readiness với Order fail, backend sẽ compensate recall; FE phải refetch thay vì tự giả định là ready.
- Khi API fail:
  - giữ snapshot trước đó;
  - hiển thị một contextual error;
  - refetch snapshot active sau lỗi nếu state server có thể đã đổi.
- Khi offline/reconnecting:
  - hiển thị indicator nhỏ;
  - không spam toast mỗi lần reconnect attempt;
  - dedupe toast thao tác/event theo `eventId`, `revision` hoặc mutation `requestId`.
- Animation KDS "slide in" nên dựa trên snapshot diff theo `ticketId`, không dựa payload WS event đơn lẻ.
- Visual state SLA warning lấy từ snapshot `warningLevel`; cảnh báo WS chỉ là tín hiệu invalidation/alert nhanh.

### 4.7 Chính sách `menu.updated`

- Backend hiện chưa có menu WS event đã chốt.
- Nếu Step 2.7 có menu refresh, spec cuối nên map:
  - domain event / payload `eventType`: `menu.updated`;
  - Socket.IO event name: ưu tiên `events.menuUpdated` để nhất quán convention `events.camelCase`.
- Nếu backend event bị dời, FE có thể mô tả listener shape "future-ready", nhưng không nên tuyên bố realtime menu refresh đã hoàn tất.

### 4.8 No batching / không hardcode routing

- FE không được batch/gom nhóm/aggregate ticket KDS thành khái niệm batch kiểu backend.
- FE không được route food/drink theo category/name.
- Màn hình KDS station phải dùng `station` và ticket data do backend cung cấp.
- `KdsBatchingPanel` hiện tại không được tồn tại như hành vi KDS thật của Step 2.7 dưới bất kỳ tên nào ngụ ý gom món cùng loại qua nhiều bàn.

## 5. Câu hỏi mở

### Q1. Nên implement `menu.updated` trong Step 2.7 hay defer?

- Option A: Implement event menu backend-to-FE thật ngay bây giờ.
  - Trade-off: đáp ứng wording của Step 2.7, nhưng cần thêm việc ở nguồn event Catalog/BFF ngoài các hook FE hiện tại.
  - Nên chọn nếu backend team cam kết đưa vào phạm vi Step 2.7.
- Option B: Hoãn WS menu thật, chỉ viết contract FE sẵn sàng cho tương lai.
  - Trade-off: tránh giả định event backend chưa tồn tại, nhưng Step 2.7 không thể claim "menu phản ánh tức thời".
  - Nên chọn nếu Step 2.6 còn chưa ổn định.
- Option C: Dùng invalidation local theo mutation cho Management và giữ `staleTime` 5 phút cho PWA.
  - Trade-off: rủi ro thấp nhất, nhưng không phải realtime.

Khuyến nghị: chỉ chọn Option A nếu backend emitter nằm rõ trong scope; nếu không thì Option B và ghi chú rõ "backend event deferred".

### Q2. POS live orders có nên giữ polling fallback, và ở interval nào?

- Option A: Giữ polling 3s/5s như hiện tại.
  - Trade-off: an toàn nhất khi đang tích hợp, nhưng giữ tải không cần thiết sau khi WS chạy ổn.
- Option B: Giảm về fallback 10-15s active-route sau khi WS auth/listeners pass smoke test.
  - Trade-off: cân bằng tốt giữa phục hồi khi miss event và tải backend.
- Option C: Tắt polling khi WS đã connected.
  - Trade-off: tải thấp nhất, nhưng rủi ro UI stale cao hơn khi miss event.

Khuyến nghị: Option B sau khi handshake harden đã chạy ổn; trước đó giữ Option A.

### Q3. KDS actions nên optimistic hay strict refetch-after-mutation?

- Option A: Strict refetch sau mọi KDS mutation.
  - Trade-off: nhất quán cao nhất với snapshot source of truth của Step 2.6; cảm giác kém tức thời hơn.
- Option B: Optimistic full movement giữa các cột có rollback.
  - Trade-off: mượt hơn, nhưng rủi ro cho done/recall vì backend có thể reject hoặc compensate.
- Option C: Hybrid: chỉ pending visual cho done/recall/priority, có thể optimistic nhẹ cho "start".
  - Trade-off: thao tác start vẫn responsive mà không "nói dối" trạng thái readiness.

Khuyến nghị: Option C, với "done" luôn strict vì phụ thuộc Kitchen + Order cùng thành công.

### Q4. Socket client nên là factory riêng theo app hay shared Nx lib?

- Option A: Factory riêng theo app (`customer-pwa`, `management-app`) và dùng chung event types.
  - Trade-off: hơi trùng lặp, nhưng phân biệt auth/session rõ ràng.
- Option B: Shared Nx realtime client lib.
  - Trade-off: đẹp về dài hạn nhưng hơi sớm khi handshake contract còn biến động.
- Option C: Mỗi domain một hook không qua factory.
  - Trade-off: nhanh cho local nhưng lặp logic connect/reconnect.

Khuyến nghị: Option A cho Step 2.7; chỉ tách shared lib khi contract đã ổn định.

### Q5. Khi reconnect, FE nên refetch current route/query hay toàn bộ active domain?

- Option A: Chỉ current route.
  - Trade-off: ít request nhất nhưng panel nền đang mount có thể stale.
- Option B: Toàn bộ active domain của app shell đang mount.
  - Trade-off: nhiều request hơn nhưng đúng kỳ vọng realtime và khớp hành vi active-query của TanStack.
- Option C: Cả active và inactive domain queries.
  - Trade-off: fresh cache mạnh nhất nhưng dễ tăng tải không cần thiết.

Khuyến nghị: Option B; tận dụng mặc định invalidate active queries của TanStack, tránh `refetchType: all` trừ khi route cần thật.

### Q6. Có bắt buộc Playwright E2E thật hay unit/integration + manual smoke là đủ?

- Option A: Full Playwright E2E toàn flow customer -> POS -> KDS -> customer-ready.
  - Trade-off: coverage regression tốt nhất, chi phí setup cao nhất.
- Option B: Unit/integration + manual smoke.
  - Trade-off: nhanh hơn nhưng dễ sót lifecycle socket trong browser và lỗi tab sleep/reconnect.
- Option C: Hybrid: một Playwright golden path mỏng + hook/unit tests + manual Redis/Kafka smoke.
  - Trade-off: coverage thực dụng mà không phải tự động hoá mọi workflow nhà hàng.

Khuyến nghị: Option C, đặc biệt cho kịch bản disconnect 10s -> reconnect -> snapshot refetch.

### Q7. Danh tính socket customer nên gửi qua headers, `auth`, hay cả hai?

- Option A: Giữ `x-tenant-id` và `x-session-id` bằng headers.
  - Trade-off: khớp code BFF hiện tại, nhưng cần verify kỹ hành vi header của Socket.IO trên browser.
- Option B: Chỉ dùng Socket.IO `auth: { tenantId, sessionId }`.
  - Trade-off: khớp option `auth` đã xác nhận từ Context7, nhưng cần cập nhật BFF customer auth.
- Option C: Hỗ trợ cả hai trong giai đoạn chuyển tiếp, rồi chốt một form chuẩn.
  - Trade-off: server parse rộng hơn một chút, đổi dần mượt hơn.

Khuyến nghị: Option C cho Step 2.7, rồi chốt rõ canonical form trong spec cuối.
