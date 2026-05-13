# Bước 2.7 — Đặc Tả Thời Gian Thực FE↔BE Chính Thức

> **Giai đoạn:** 2B — Kitchen Service + WebSocket Gateway
> **Bước:** 2.7 — Thời gian thực giữa Frontend và Backend
> **Ngày:** 2026-05-07
> **Trạng thái:** Chốt sau audit Step 2.7 và quyết định Q1-Q8 của project owner.
> **Mục đích:** Tài liệu này là đặc tả contract nghiệp vụ/kỹ thuật cho realtime FE↔BE. Đây không phải kế hoạch triển khai và không phân rã thành task code.

---

## 0. Biên Bản Quyết Định

| Câu hỏi | Quyết định       | Nội dung chốt                                                                                                                                                                                         |
| ------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1      | Phương án C      | Không triển khai `menu.updated`, `events.menu.updated`, `events.menuUpdated` hoặc `menuUpdated` trong Bước 2.7. Menu giữ cơ chế cache và invalidate sau mutation hiện tại; không claim realtime menu. |
| Q2      | Theo khuyến nghị | POS live orders giữ polling 3s/5s cho tới khi staff socket auth chạy đúng; sau khi kiểm thử nhanh realtime đạt thì giảm về polling dự phòng 10-15s, không tắt hẳn.                                    |
| Q3      | Theo khuyến nghị | KDS start/done/recall/priority dùng strict refetch-after-mutation. Không dùng optimistic movement làm nguồn sự thật.                                                                                  |
| Q4      | Theo Bước 2.6    | Gỡ bỏ hoàn toàn tính năng gom món/gom đơn/batching cho KDS/order/prep/ticket. Cart trước submit vẫn được tăng `quantity` cho cùng món/cùng ghi chú trong cùng session; đây không phải KDS batching.   |
| Q5      | Theo khuyến nghị | KDS realtime phải lọc mọi KDS event theo `tenantId` và `station` trước khi invalidate.                                                                                                                |
| Q6      | Theo khuyến nghị | Customer socket hỗ trợ chuyển tiếp cả headers và `auth`, sau đó chuẩn hóa về Socket.IO `auth`.                                                                                                        |
| Q7      | Theo khuyến nghị | Reconnect refetch active domain đang mounted trong app shell; mặc định không refetch toàn bộ inactive cache.                                                                                          |
| Q8      | Phương án A      | Kiểm chứng cần E2E đầy đủ: PWA -> POS -> KDS -> PWA ready, bao gồm disconnect/reconnect.                                                                                                              |

### 0.1 Tài Liệu Này Override Điểm Nào?

1. Wording cũ trong phase doc về menu realtime không còn là tiêu chí nghiệm thu của Bước 2.7. `menu.updated` không thuộc phạm vi hiện tại.
2. Mọi cách diễn đạt cũ về batching/gom món/gom đơn bị thay thế bởi Chính Sách Không Gom Món của Bước 2.6 và Bước 2.7 này. Chính sách này áp dụng cho KDS/order/prep/ticket, không cấm gộp dòng giỏ hàng cùng món trước submit.
3. FE không được dùng `join.staff` hoặc `join.session` như cơ chế join room. Room assignment phải do server suy ra.
4. WebSocket event chỉ là gợi ý invalidate. REST snapshot/TanStack Query data mới là nguồn sự thật để render UI sau reconnect hoặc event bị bỏ lỡ.

---

## 1. Cơ Sở Tài Liệu và Context7

### 1.1 Cơ Sở Trong Repo

- `docs/specs/business-logic-step-2.6-spec.vi.md`
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/phases/phase-2b-kitchen-websocket.md`
- `docs/architecture/permission-matrix.md`
- Code hiện tại trong BFF, Customer PWA, Management App POS/KDS.

### 1.2 Kết Quả Context7 Dùng Cho Spec

- Tài liệu Socket.IO Client từ Context7 (`/websites/socket_io_v4_client-api`) xác nhận:
  - Có thể connect namespace bằng `io(".../namespace", { auth: { token } })`.
  - Event `connect` được bắn ở lần connect đầu và sau reconnect thành công.
  - Không đăng ký listener khác bên trong `connect`, vì reconnect có thể tạo duplicate listeners.
  - Dùng `socket.off(eventName, listener)` để cleanup listener cụ thể.
  - Manager events có `reconnect`, `reconnect_error`, `reconnect_failed`.
- Tài liệu TanStack Query từ Context7 (`/tanstack/query`) xác nhận:
  - `queryClient.invalidateQueries(...)` mặc định mark invalid và refetch active matching queries.
  - `refetchType` mặc định là `active`.
  - `refetchInterval` là polling dự phòng khi query còn active observer.
  - Stale queries có thể refetch khi network reconnect theo default behavior, nhưng Bước 2.7 vẫn cần socket reconnect policy riêng.

---

## 2. Phạm Vi và Ngoài Phạm Vi

### 2.1 Trong Phạm Vi Bước 2.7

1. Customer PWA realtime order/cart/bill/table tracking qua namespace `/orders`.
2. Management App POS realtime live orders, service requests, bill requests, table transfer, và kitchen-ready hints qua namespace `/orders`.
3. Management App KDS realtime invalidation + REST snapshot hybrid cho station `KITCHEN` và `BAR`.
4. Socket auth/session contract cho staff và customer.
5. Query invalidation matrix dùng TanStack Query.
6. Quy tắc UX cho reconnect/offline/trạng thái suy giảm.
7. Chính sách polling dự phòng sau khi WS hoạt động đúng.
8. E2E đầy đủ cho flow PWA -> POS -> KDS -> PWA ready.

### 2.2 Ngoài Phạm Vi Bước 2.7

1. Không triển khai `events.menuUpdated`, `events.menu.updated`, hoặc `menuUpdated`.
2. Không thêm backend Catalog realtime bridge cho menu.
3. Không batching/gom món/gom đơn KDS/order/prep/ticket dưới bất kỳ tên gọi nào.
4. Không hard-code routing food/drink ở FE theo name/category.
5. Không tạo WebSocket mutation contract cho KDS; KDS mutate qua REST guarded endpoints.
6. Không thêm durable WebSocket replay, Redis Stream replay, hoặc client-side event log bắt buộc.
7. Không viết lại nguồn sự thật RBAC ở frontend; FE RBAC vẫn chỉ là guard điều hướng/UX.

---

## 3. Socket Namespace, Auth, Rooms

### 3.1 Namespace Chính Thức

Bước 2.7 dùng namespace hiện có:

```txt
/orders
```

Không tạo `/kds` trong Bước 2.7. KDS dùng cùng namespace `/orders`, phân biệt bằng server-derived rooms và event filters.

### 3.2 Staff Socket Contract

Management App staff socket phải gửi JWT qua Socket.IO auth:

```ts
auth: {
  token: accessToken;
}
```

BFF vẫn có thể hỗ trợ `Authorization: Bearer <jwt>` như Bước 2.6, nhưng FE Bước 2.7 dùng `auth.token` làm canonical vì đây là pattern Socket.IO client rõ ràng và phù hợp trình duyệt.

FE không gửi room name. FE không emit `join.staff`.

Server-derived staff rooms:

| Role    | Room                       |
| ------- | -------------------------- |
| WAITER  | `tenant:{tid}:staff`       |
| CHEF    | `tenant:{tid}:kds:kitchen` |
| BARISTA | `tenant:{tid}:kds:bar`     |
| OWNER   | `tenant:{tid}:management`  |
| MANAGER | `tenant:{tid}:management`  |

OWNER/MANAGER có thể opt-in station qua `subscribe.kds`, nhưng event này chỉ dùng để request station subscription đã được server validate. CHEF/BARISTA không được subscribe station còn lại.

### 3.3 Customer Socket Contract

Trong giai đoạn chuyển tiếp của Bước 2.7, BFF phải chấp nhận cả hai dạng:

```ts
auth: {
  (tenantId, sessionId);
}
```

và dạng legacy hiện BFF đang hỗ trợ:

```txt
x-tenant-id
x-session-id
```

FE Customer PWA phải ưu tiên `auth: { tenantId, sessionId }`. Headers chỉ là cơ chế dự phòng tương thích trong giai đoạn chuyển đổi.

FE không emit `join.session`. BFF validate session rồi join:

```txt
session:{sessionId}:customer
```

Nếu session expired/closed/invalid, socket phải nhận `events.authError` hoặc bị disconnect có lý do recoverable. FE không tự tạo session mới trong WebSocket flow.

### 3.4 Vòng Đời Listener

1. Listener được đăng ký một lần trong lifecycle của hook/socket instance.
2. Không đăng ký domain listeners bên trong `connect`.
3. Cleanup phải gọi `socket.off(eventName, listener)` hoặc disconnect socket instance khi unmount.
4. Reconnect không được làm tăng số listener cho cùng event.
5. FE phải listen tối thiểu:
   - `connect`
   - `disconnect`
   - `events.authError`
   - Manager `reconnect`
   - Manager `reconnect_error`
   - Manager `reconnect_failed`

---

## 4. Event Names và Payload Expectations

### 4.1 Event Registry Chính Thức Cho Bước 2.7

| Event                       | Trạng thái trong Bước 2.7 | Nguồn sự thật sau khi nhận                                               |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `events.cartUpdated`        | Dùng                      | Customer/POS cart/bill/order snapshots                                   |
| `events.orderCreated`       | Dùng                      | Customer/POS order snapshots                                             |
| `events.orderStatusChanged` | Dùng                      | Customer/POS order snapshots                                             |
| `events.serviceRequested`   | Dùng                      | Service request snapshots                                                |
| `events.billRequested`      | Dùng                      | Bill/cart/order/POS service snapshots                                    |
| `events.tableTransferred`   | Dùng                      | Session/POS/table snapshots                                              |
| `events.kdsQueueChanged`    | Dùng                      | KDS queue snapshot                                                       |
| `events.kitchenItemReady`   | Dùng                      | Customer/POS order snapshots; KDS queue snapshot nếu event thuộc station |
| `events.kitchenSlaWarning`  | Dùng                      | KDS queue snapshot                                                       |
| `events.menuUpdated`        | Không dùng                | Không thuộc Bước 2.7                                                     |
| `events.menu.updated`       | Không dùng                | Không thuộc Bước 2.7                                                     |
| `menuUpdated`               | Không dùng                | Không thuộc Bước 2.7                                                     |

### 4.2 Payload Expectations Cho Direct Order/Session Events

Direct events giữ type hiện có trong `libs/shared/types/src/lib/realtime-events.types.ts`.

FE chỉ được dựa vào các field sau để filter/invalidate:

| Event                       | Required fields FE cần dùng                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `events.cartUpdated`        | `tenantId`, `sessionId`, `cartVersion`, `status`, `updatedAt`                                   |
| `events.orderCreated`       | `tenantId`, `orderId`, `sessionId`, `tableId`, `tableName`, `items`, `totalAmount`, `timestamp` |
| `events.orderStatusChanged` | `tenantId`, `orderId`, `fromStatus`, `toStatus`, `timestamp`                                    |
| `events.serviceRequested`   | `tenantId`, `requestId`, `sessionId`, `tableId`, `tableName`, `type`, `timestamp`               |
| `events.billRequested`      | `tenantId`, `billId`, `sessionId`, `tableId`, `tableName`, `status`, `total`, `requestedAt`     |
| `events.tableTransferred`   | `tenantId`, `sessionId`, `fromTableId`, `toTableId`, `timestamp`                                |

Filtering rules:

1. Customer PWA phải ignore events có `tenantId` hoặc `sessionId` không khớp QR session hiện tại.
2. Management App phải ignore events có `tenantId` không khớp staff profile hiện tại.
3. FE có thể patch nhẹ một visible status chip nếu payload đủ dữ liệu, nhưng vẫn phải invalidate snapshot liên quan.

### 4.3 Payload Expectations Cho KDS Events

KDS events giữ type hiện có trong `libs/shared/types/src/lib/kds.types.ts`.

#### `events.kdsQueueChanged`

Minimum fields:

```ts
{
  eventId: string;
  eventType: 'kds.queue_changed';
  schemaVersion: 1;
  tenantId: string;
  station: 'KITCHEN' | 'BAR';
  revision: number;
  reason: string;
  ticketId?: string;
  orderId?: string;
  occurredAt: string;
  correlationId?: string;
}
```

FE action:

- Filter by `tenantId` và `station`.
- Invalidate `kdsKeys.queue(tenantId, station)`.
- Không synthesize ticket list từ event này.

#### `events.kitchenItemReady`

Minimum fields:

```ts
{
  eventId: string;
  eventType: 'kitchen.item_ready';
  schemaVersion: 1;
  tenantId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  orderId: string;
  ticketId: string;
  station: 'KITCHEN' | 'BAR';
  readyItems: Array<{
    orderItemId: string;
    menuItemId: string;
    menuItemName: string;
    quantity: number;
    note?: string;
  }>;
  occurredAt: string;
  correlationId?: string;
}
```

FE action:

- Customer PWA: filter by `tenantId` + `sessionId`, invalidate order detail/list và current bill nếu đang hiển thị.
- Management POS: filter by `tenantId`, invalidate order list/detail cho `orderId`.
- Management KDS: filter by `tenantId` + `station`; chỉ invalidate KDS queue nếu khớp station hiện tại.
- Không tạo duplicate toast khi reconnect/refetch.

#### `events.kitchenSlaWarning`

Minimum fields:

```ts
{
  eventId: string;
  eventType: 'kitchen.sla_warning';
  schemaVersion: 1;
  tenantId: string;
  ticketId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  station: 'KITCHEN' | 'BAR';
  level: 'WARNING' | 'BREACH';
  waitTimeSeconds: number;
  thresholdSeconds: number;
  occurredAt: string;
  correlationId?: string;
}
```

FE action:

- Chỉ KDS xử lý: filter by `tenantId` + `station`, sau đó invalidate `kdsKeys.queue(tenantId, station)`.
- Snapshot `warningLevel` vẫn là nguồn sự thật cho hiển thị.
- `events.kitchenSlaWarning` chỉ là hint invalidate/alert nhanh, không phải canonical SLA UI state.

---

## 5. Ma Trận Query Invalidation

TanStack Query invalidation phải dùng default active refetch behavior trừ khi spec này nói khác.

| Event                       | App / page                   | Query key/domain                                                                                                        | Hành động                                                                       |
| --------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `events.cartUpdated`        | Customer PWA                 | `cartKeys.snapshot(tenantId, sessionId)`, `billKeys.current(tenantId, sessionId)`, `orderKeys.all`                      | Invalidate active queries ngay.                                                 |
| `events.cartUpdated`        | Management POS               | `orderKeys.lists()`, `orderKeys.details()` nếu POS có hiển thị open cart                                                | Tùy chọn; chỉ làm nếu POS hiển thị cart state.                                  |
| `events.orderCreated`       | Customer PWA                 | `orderKeys.list(tenantId, sessionId)`, `orderKeys.detail(tenantId, sessionId, orderId)`, cart/bill domain               | Invalidate ngay; animation dựa trên diff của snapshot sau refetch.              |
| `events.orderCreated`       | Management POS               | `orderKeys.lists()`, `orderKeys.details()`, `tableKeys.all`                                                             | Invalidate ngay; new-order visual entry dựa trên diff của list sau refetch.     |
| `events.orderStatusChanged` | Customer PWA                 | `orderKeys.detail(tenantId, sessionId, orderId)`, `orderKeys.list(tenantId, sessionId)`, có thể `billKeys.current(...)` | Invalidate ngay; chỉ patch nhẹ status chip nếu cần.                             |
| `events.orderStatusChanged` | Management POS               | `orderKeys.lists()`, `orderKeys.detail(orderId)`, `tableKeys.all`                                                       | Invalidate active list/detail ngay.                                             |
| `events.serviceRequested`   | Management POS/service inbox | `serviceRequestKeys.lists()`                                                                                            | Invalidate active service request lists ngay.                                   |
| `events.billRequested`      | Customer PWA                 | `billKeys.current(tenantId, sessionId)`, `cartKeys.snapshot(...)`, `orderKeys.all`                                      | Invalidate ngay.                                                                |
| `events.billRequested`      | Management POS               | `serviceRequestKeys.lists()`, bill/payment domain nếu mounted, `orderKeys.lists()`                                      | Invalidate cho bill-request surfaces.                                           |
| `events.tableTransferred`   | Customer PWA                 | Session-scoped cart/order/bill keys                                                                                     | Refetch snapshots ngay; table labels lấy từ snapshot.                           |
| `events.tableTransferred`   | Management POS               | `tableKeys.all`, `orderKeys.lists()`, `serviceRequestKeys.lists()`                                                      | Invalidate ngay.                                                                |
| `events.kdsQueueChanged`    | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                                                      | Filter tenant/station; invalidate queue.                                        |
| `events.kitchenItemReady`   | Customer PWA                 | `orderKeys.detail(...)`, `orderKeys.list(...)`, có thể `billKeys.current(...)`                                          | Filter tenant/session; invalidate order tracking.                               |
| `events.kitchenItemReady`   | Management POS               | `orderKeys.lists()`, `orderKeys.detail(orderId)`                                                                        | Filter tenant; invalidate order snapshots.                                      |
| `events.kitchenItemReady`   | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                                                      | Filter tenant/station; chỉ invalidate station khớp.                             |
| `events.kitchenSlaWarning`  | Management KDS               | `kdsKeys.queue(tenantId, station)`                                                                                      | Filter tenant/station; invalidate queue.                                        |
| Menu mutations              | Customer PWA                 | `customerMenuKeys.fullMenu(tenantId)`                                                                                   | Không có WS. Dựa vào cache/staleTime và explicit mutation invalidation hiện có. |
| Menu mutations              | Management App               | `menuKeys.all`, `menuKeys.categories()`, `menuKeys.items(categoryId)`, `menuKeys.item(id)`                              | Không có WS. Dựa vào mutation invalidation hiện có.                             |

---

## 6. Trách Nhiệm Của Frontend Hooks

### 6.1 Nguyên Tắc Chung

1. Hooks sở hữu socket lifecycle, event binding, cleanup, và query invalidation.
2. Hooks không sở hữu trạng thái render domain ngoài trạng thái kết nối/suy giảm.
3. Hooks không suy diễn backend truth từ event payload.
4. Hooks cung cấp đủ trạng thái cho chỉ báo UI: `connected`, `reconnecting`, `degraded`, `authError`.
5. Hooks dedupe noisy notifications theo `eventId` hoặc local mutation `requestId`.

### 6.2 Boundary Của Customer PWA Hook

`useCustomerOrderRealtime()` responsibilities:

- Connect `/orders` với `auth: { tenantId, sessionId }`.
- Hỗ trợ header dự phòng chỉ trong giai đoạn chuyển tiếp nếu BFF vẫn cần.
- Gỡ `join.session`.
- Listen:
  - `events.cartUpdated`
  - `events.orderCreated`
  - `events.orderStatusChanged`
  - `events.billRequested`
  - `events.tableTransferred`
  - `events.kitchenItemReady`
  - `events.authError`
  - socket/manager connection events
- Filter mọi payload theo `tenantId` và `sessionId` hiện tại.
- Refetch active order/cart/bill domain sau reconnect.

Customer PWA không được listen KDS station queue events.

### 6.3 Boundary Của Management POS Hook

`useStaffOrderRealtime()` responsibilities:

- Connect `/orders` với `auth: { token: accessToken }`.
- Gỡ `join.staff`.
- Listen:
  - `events.cartUpdated`
  - `events.orderCreated`
  - `events.orderStatusChanged`
  - `events.serviceRequested`
  - `events.billRequested`
  - `events.tableTransferred`
  - `events.kitchenItemReady`
  - `events.authError`
  - socket/manager connection events
- Filter mọi payload theo `tenantId` hiện tại.
- Invalidate POS order/table/service/bill domains theo matrix.
- Giữ polling dự phòng theo Section 8.

Management POS không subscribe KDS station rooms nếu không render KDS station view.

### 6.4 Boundary Của Management KDS Hooks

`useKdsQueue(station)` responsibilities:

- Fetch REST snapshot từ BFF KDS endpoint.
- Xem `KdsQueueSnapshot` là nguồn sự thật.
- Bao gồm `tenantId`, `station`, `revision`, `serverTime`, và ticket list.

`useKdsRealtime(station)` responsibilities:

- Connect `/orders` với `auth: { token: accessToken }`.
- Listen:
  - `events.kdsQueueChanged`
  - `events.kitchenItemReady`
  - `events.kitchenSlaWarning`
  - `events.authError`
  - socket/manager connection events
- Filter mọi KDS-related event theo `tenantId` và `station`.
- Invalidate `kdsKeys.queue(tenantId, station)` sau matching hint.
- Khi reconnect, invalidate active KDS queue snapshot.
- OWNER/MANAGER station opt-in qua `subscribe.kds` chỉ được dùng khi server validate station được request.

### 6.5 Vị Trí Socket Factory

Bước 2.7 giữ per-app socket factory/hook boundaries thay vì chuyển ngay sang shared library.

Lý do:

- Customer PWA dùng session identity.
- Management App dùng staff JWT identity.
- KDS cần station filtering và optional manager station subscription.
- Shared lib có thể thêm sau khi cả hai app ổn định auth/error/reconnect semantics.

---

## 7. Reconnection và State Sync

### 7.1 Behavior Bắt Buộc

Khi initial connect và successful reconnect:

1. BFF re-authenticate socket.
2. BFF rejoin server-derived rooms.
3. FE invalidate/refetch active domain mounted trong app shell.
4. FE giữ snapshot cũ trong lúc refetch.
5. FE thay UI state bằng REST snapshot sau khi refetch thành công.

### 7.2 Định Nghĩa Active Domain

Active domain là các queries đang có mounted observers trong shell/page hiện tại:

- Customer PWA shell: active cart/order/bill/session tracking queries.
- Management POS shell: active order/table/service/bill queries.
- Management KDS page: active station queue query.

Mặc định không dùng `refetchType: all`. Inactive cached queries có thể giữ trạng thái invalid cho tới lần mount sau.

### 7.3 Missed Events và Revision

- Socket.IO Redis Adapter không cung cấp replay.
- Mọi reconnect, tab sleep wake, VPN/network flap, hoặc recovery sau `reconnect_error` phải dẫn tới snapshot refetch.
- KDS có thể đọc `revision` trong queue snapshots và queue hints.
- Nếu FE track last KDS revision và phát hiện gap, phải refetch snapshot.
- Với Bước 2.7, always-refetch-on-hint là đủ ngay cả khi chưa có local revision-gap UI.

### 7.4 Degraded State

FE nên hiển thị trạng thái realtime nhỏ, không block UI khi:

- socket disconnected;
- reconnecting quá một grace window ngắn;
- `reconnect_error` lặp lại;
- nhận `events.authError`.

`events.authError` không được tạo toast loop. Nó phải chuyển UI sang trạng thái recoverable auth/session: refresh token, prompt reload, hoặc session expired tùy app.

---

## 8. Polling Fallback Policy

### 8.1 Management POS

Trước khi staff socket auth migration được verify:

- Giữ order list polling 3s/5s hiện tại.
- Giữ order detail polling 4s cho tới terminal statuses.
- Giữ service request polling 3s.

Sau khi staff realtime kiểm thử nhanh đạt:

- Giảm active POS order/service polling về 10-15s dự phòng.
- Chỉ giữ polling ở active route.
- Không tắt polling hoàn toàn trong Bước 2.7.

### 8.2 Management KDS

Primary path:

- WS hint -> invalidate -> REST snapshot.
- Mutation success -> invalidate -> REST snapshot.
- Reconnect -> invalidate -> REST snapshot.

Fallback:

- Không dùng polling dày đặc luôn bật khi socket ổn định.
- Nếu socket ở trạng thái disconnected/degraded quá khoảng chờ reconnect, KDS có thể dùng cơ chế dự phòng active 10-15s cho tới khi reconnect ổn định.
- Manual refresh vẫn phải tồn tại.

### 8.3 Customer PWA

- Không thêm high-frequency polling cho order tracking.
- Dùng WS + REST snapshot invalidation.
- Khi socket degraded, cho refresh thủ công và dựa vào reconnect refetch.
- Nếu kiểm thử tương tự production cho thấy customer tracking bị stale khi mobile sleep, có thể thêm cơ chế dự phòng active chậm sau này, nhưng không phải mặc định của Bước 2.7.

### 8.4 Menu

- Không có WS menu event.
- Không thêm polling để mô phỏng realtime menu.
- Customer menu giữ behavior `customerMenuKeys.fullMenu(tenantId)` cache/staleTime hiện tại.
- Management menu giữ mutation-driven invalidation cho `menuKeys.*`.

---

## 9. UX State Rules

### 9.1 KDS Actions

KDS live actions dùng strict refetch-after-mutation:

- Start ticket.
- Mark done/ready.
- Recall.
- Set/unset priority.

Trong lúc mutation:

- Disable hoặc show pending state chỉ cho ticket/action liên quan.
- Giữ queue snapshot trước đó.
- Khi success, invalidate `kdsKeys.queue(tenantId, station)`.
- Khi fail, giữ snapshot trước đó và show một contextual error.

Không full optimistic board movement trong Bước 2.7.

### 9.2 Animation

- POS new-order slide-in phải dựa trên diff giữa previous và refetched order list, không dựa vào WS payload đơn lẻ.
- KDS ticket slide-in phải dựa trên diff theo `ticketId` từ queue snapshot.
- Hiệu ứng chuyển trạng thái trên customer timeline có thể dùng event hint để nhanh hơn, nhưng snapshot refetch vẫn là nguồn sự thật.

### 9.3 Offline/Reconnecting Indicator

Mỗi app nên hiển thị trạng thái nhỏ, không block UI:

- Connected.
- Reconnecting.
- Degraded/offline.
- Auth/session error.

Indicator này không được block đọc snapshot hiện có. Mutations có thể bị disable khi offline/auth invalid.

### 9.4 Toast Policy

- Không toast mọi invalidation hint.
- Không lặp item-ready/SLA toasts sau reconnect và snapshot refetch.
- Nếu thêm toasts, dedupe theo `eventId`; mutation failures dedupe theo `requestId` khi có.

---

## 10. POS, KDS, PWA Behavior

### 10.1 Customer PWA

Customer thấy:

- Cart/bill/order state update sau session-scoped WS hints.
- Order timeline update sau `events.orderStatusChanged`.
- Item-ready/order-ready refresh sau `events.kitchenItemReady`.
- Table label/state refresh sau `events.tableTransferred`.

Customer không được thấy:

- Staff tenant events ngoài current session.
- KDS station queue events.
- Menu realtime claim.

### 10.2 Management POS

POS thấy:

- New orders từ `events.orderCreated`.
- Status changes từ `events.orderStatusChanged`.
- Service requests từ `events.serviceRequested`.
- Bill requests từ `events.billRequested`.
- Table movement từ `events.tableTransferred`.
- Kitchen item ready từ `events.kitchenItemReady`.

POS phải giữ polling dự phòng cho tới khi realtime kiểm thử nhanh đạt, sau đó giảm còn 10-15s.

### 10.3 Management KDS

KDS thấy:

- Station queue snapshot từ BFF REST.
- Queue invalidation hints từ `events.kdsQueueChanged`.
- Item-ready và SLA hints chỉ khi khớp current station.
- Priority/FIFO/recall state từ snapshot.

KDS không được:

- Gom cùng món giữa nhiều bàn/ticket.
- Hiển thị bất kỳ tổng số gom món/gom đơn nào.
- Tự định tuyến món bằng suy luận theo tên món hoặc category ở frontend.
- Mutate KDS qua WebSocket.

---

## 11. RBAC, Tenant Isolation, No Routing Hardcode

1. BFF vẫn là nguồn sự thật cho protected REST permissions.
2. Frontend route/sidebar RBAC vẫn chỉ ở mức UX.
3. FE gửi identity/auth material, không gửi room names.
4. Tenant isolation đến từ BFF handshake + guarded REST snapshots.
5. Customer sockets không bao giờ join tenant staff, management, hoặc KDS rooms.
6. CHEF chỉ thấy/thao tác station `KITCHEN`.
7. BARISTA chỉ thấy/thao tác station `BAR`.
8. OWNER/MANAGER có thể xem/thao tác cả hai stations và set priority.
9. FE phải render KDS theo backend `station` và ticket payload.

---

## 12. Chính Sách Không Gom Món Cho FE

Bước 2.7 kế thừa hoàn toàn quyết định không gom món của Bước 2.6 cho KDS/order/prep/ticket.

Chính sách này không áp dụng cho Redis cart trước submit. Trong cart của một `sessionId`, `ADD_ITEM` được phép tăng `quantity` trên dòng hiện có khi trùng `menuItemId` và cùng ghi chú/tùy chọn; đây là hành vi giỏ hàng, không phải batching KDS.

Các khái niệm UI/FE sau không được tồn tại:

- Panel `Batching` như một tính năng nghiệp vụ.
- Gom cùng món giữa nhiều ticket/bàn.
- Số lượng gộp xuyên đơn.
- Tổng số gom món/gom đơn.
- Click/focus theo nhóm tên món.
- Bất kỳ KDS decision nào dựa trên grouping theo `menuItemName`.
- Bất kỳ DTO/cache/view-model nào tạo lại dòng dữ liệu gom món/gom đơn.

Được phép:

- Render ticket items đúng như snapshot trả về.
- Sort/filter tickets theo station/FIFO/priority/status từ backend data.
- Show SLA/watchlist nếu dựa theo ticket, không dựa theo same-item aggregation.

---

## 13. Menu Refresh Policy

Quyết định Q1 là Phương án C.

Bước 2.7 không triển khai:

- `events.menuUpdated`
- `events.menu.updated`
- `menuUpdated`
- backend Catalog-to-WS bridge
- menu realtime listener

Customer menu behavior:

- Dùng public menu query và cache/staleTime hiện tại.
- Refresh theo explicit navigation/remount/window focus dựa trên TanStack Query settings hiện có.
- Không hiển thị UI text ám chỉ instant menu realtime sync.

Management menu behavior:

- Dùng mutation invalidation hiện có cho categories/items/images.
- Không tenant-wide menu WS broadcast.

Kiểm chứng không yêu cầu "đổi menu thì phản ánh tức thì qua WS" cho Bước 2.7.

---

## 14. Kịch Bản Kiểm Chứng

Q8 yêu cầu E2E đầy đủ cho realtime order/KDS/customer ready flow.

### 14.1 Luồng Chuẩn E2E Đầy Đủ

1. Customer mở PWA session và connect `/orders` bằng session auth.
2. Staff mở Management POS và connect `/orders` bằng staff JWT auth.
3. Chef/Barista mở KDS station và connect `/orders` bằng staff JWT auth.
4. Customer submit order.
5. POS thấy order xuất hiện mà không cần chờ polling dự phòng.
6. Staff confirm order.
7. Kitchen Service tạo station ticket và BFF emit `events.kdsQueueChanged`.
8. KDS station refetch queue snapshot và hiển thị ticket.
9. Chef/Barista start ticket.
10. Chef/Barista mark done.
11. BFF emit `events.kitchenItemReady` chỉ sau khi Order Service readiness update thành công.
12. Customer PWA refetch order tracking và hiển thị ready state.
13. POS refetch order/detail và thấy item/order readiness.

### 14.2 Luồng Chuẩn Reconnect

1. Giữ PWA/POS/KDS mở với connected sockets.
2. Disconnect WS/network ít nhất 10s.
3. Tạo hoặc update relevant order/KDS state trong lúc disconnected.
4. Reconnect.
5. Socket re-authenticate và rejoin server-derived rooms.
6. FE refetch active domain snapshots.
7. UI hội tụ về current server state mà không cần event replay.
8. Không có duplicate listener effects hoặc duplicate toasts.

### 14.3 Kiểm Chứng RBAC/Room

1. Customer socket không nhận staff/KDS/management events.
2. POS staff không thể self-join arbitrary rooms bằng `join.staff`.
3. Customer không thể self-join arbitrary session bằng `join.session`.
4. CHEF không subscribe được BAR station.
5. BARISTA không subscribe được KITCHEN station.
6. OWNER/MANAGER station subscription thành công chỉ sau server validation.

### 14.4 Kiểm Chứng Không Gom Món

1. Tạo nhiều orders có cùng `menuItemName` ở nhiều bàn khác nhau.
2. KDS hiển thị separate tickets/items theo backend snapshot.
3. UI không có luồng nghiệp vụ "Batching", tổng cùng món, hoặc dòng gom nhiều bàn.
4. FE không compute routing từ item name/category.

### 14.5 Kiểm Chứng Polling Dự Phòng

1. Trước khi staff socket kiểm thử nhanh đạt, POS polling vẫn refresh orders/service requests.
2. Sau khi staff socket kiểm thử nhanh đạt, POS interval dự phòng giảm về 10-15s và không bị disable.
3. KDS khi socket ổn định không cần polling dày đặc.
4. KDS khi socket suy giảm vẫn hội tụ bằng cơ chế dự phòng active hoặc manual refresh.

### 14.6 Kiểm Chứng Menu

1. Menu mutations vẫn invalidate existing management menu queries.
2. Customer public menu vẫn theo cache/staleTime behavior hiện tại.
3. Không có WS menu event được emit, listen, hoặc required.

---

## 15. Tiêu Chí Nghiệm Thu

1. Customer PWA dùng server-validated session socket auth và không còn phụ thuộc `join.session`.
2. Management POS dùng `auth.token` staff socket auth và không còn phụ thuộc `join.staff`.
3. KDS realtime filter mọi KDS event theo `tenantId` và `station`.
4. Reconnect refetch active domain snapshots và hội tụ sau event bị bỏ lỡ.
5. POS polling được giữ tới khi realtime kiểm thử nhanh đạt, sau đó giảm về cơ chế dự phòng 10-15s.
6. KDS actions giữ strict refetch-after-mutation.
7. Không có menu realtime event trong Bước 2.7.
8. Không còn hành vi batching/gom món/gom đơn ở bất kỳ FE nào.
9. FE không bao giờ hard-code KDS routing theo category/name.
10. Full E2E PWA -> POS -> KDS -> PWA ready flow pass, bao gồm disconnect/reconnect.
