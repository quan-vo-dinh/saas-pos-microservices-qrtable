# Phase 2B — Kitchen Service + WebSocket

> **Mục tiêu:** Vận hành KDS (hàng đợi bếp/bar) theo đơn đã xác nhận và đồng bộ thời gian thực tới đúng vai trò — staff, bếp, quản lý, khách — mà không lưu trữ persistence trong Kitchen Service.
> **Ước lượng:** ~1-1.5 tuần
> **Trạng thái:** ⬜ TODO

## Prerequisites

- Phase 2A hoàn thành — [phase-2a-order-kafka.md](phase-2a-order-kafka.md) (order flow + Kafka đã ổn định)
- Kafka cluster chạy, topic `order.confirmed` (và các topic liên quan phase 2A) đã được contract hóa
- Order Service xử lý confirm đơn và publish sự kiện đúng payload/tenant

## Tham Chiếu

| Tài liệu                  | Section liên quan                                     |
| ------------------------- | ----------------------------------------------------- |
| technical-architecture.md | §6.2.6 Kitchen Service, §7.3 BFF Direct, §9 WebSocket |
| business-logic.md         | §5 Kitchen/KDS Flow                                   |

## Tổng Quan

Phase 2B tách trách nhiệm: Kitchen Service chỉ đọc/ghi Redis và Kafka để duy trì hàng đợi KDS và SLA, vì tốc độ và đơn giản vận hành — không cần schema DB riêng cho layer này. WebSocket Gateway (Socket.io + Redis Adapter) là điểm hội tụ real-time: bridge từ Kafka và BFF Direct để mỗi vai trò chỉ nhận sự kiện trong phạm vi tenant và phòng (room) của họ. BFF giữ vai trò biên HTTP/TCP và phát side-effects WS sau khi có phản hồi dịch vụ hợp lệ, tránh duplicate domain logic trong gateway.

## Steps

### Step 2.6 — Kitchen Service + WebSocket Gateway (5-7 ngày)

**Mục tiêu:** Có pipeline từ đơn đã confirm tới ticket KDS (FIFO, routing, batching, SLA, ưu tiên) và nền tảng WS đa instance với auth và room theo vai trò.

**Yêu cầu chính:**

- **Kitchen Service (Redis-only, không database):**
  - Consumer Kafka `order.confirmed` → tạo/cập nhật ticket KDS trong Redis
  - Hàng đợi FIFO dùng Redis Sorted Set: `kds:{tenant_id}:kitchen`, `kds:{tenant_id}:bar` (score = thứ tự ưu tiên thời gian / sequence đã thống nhất contract)
  - Routing ticket: **`MenuItem.station`** canonical (`KITCHEN` \| `BAR`) — đặc tả Phase 2A Step 2.4; có thể fallback category chỉ khi migration
  - Batching: gom cùng món từ các order khác nhau — hiển thị tổng số lượng cần chuẩn bị, giảm nhiễu trên màn KDS và phản ánh cách bếp làm thực tế
  - SLA: timer theo ticket; khi vượt ngưỡng (ví dụ 15 phút, configurable per tenant) → emit `kitchen.sla_warning` + cảnh báo UI (đổi màu vàng → đỏ)
  - Producer Kafka `kitchen.sla_warning` (ưu tiên P2): do timer nội bộ Kitchen Service, không block confirm đơn
  - Priority flagging: Owner/Manager có thể đánh dấu ưu tiên ticket → đẩy lên đầu queue, ảnh hưởng thứ tự hiển thị/alert trong Redis contract
  - Recall logic: Chef/Barista lỡ nhấn "Done" → recall để đưa ticket quay lại trạng thái Processing
- **WebSocket Gateway:**
  - Socket.io + Redis Adapter để scale ngang và đồng bộ room giữa các instance
  - Auth handshake: Staff dùng JWT từ Authorization header khi handshake; Customer dùng session identifier (đúng trust boundary PWA vs staff app)
  - Room assignment cố định theo contract:
    - WAITER → `tenant:{tid}:staff`
    - CHEF → `tenant:{tid}:kds:kitchen`
    - BARISTA → `tenant:{tid}:kds:bar`
    - OWNER / MANAGER → `tenant:{tid}:management`
    - CUSTOMER → `session:{sid}:customer`
  - **Kafka Consumer Bridge** (3 topic → WS): `order.confirmed` → room KDS/staff liên quan; `kitchen.sla_warning` → `tenant:{tid}:management`; `payment.completed` → `session:{sid}:customer`
  - **BFF Direct side-effects** (5 sự kiện sau TCP/HTTP thành công):
    - `order.created` → staff room (thông báo đơn mới)
    - `kitchen.item_ready` → staff room + customer session room (món đã xong)
    - `menu.updated` → broadcast tất cả rooms tenant-wide (sync menu + invalidate cache)
    - `table.status_changed` → staff room (cập nhật trạng thái bàn)
    - `service.requested` → staff room (chuông gọi nhân viên)
  - Reconnection: client disconnect → khi kết nối lại auto re-join room đúng role/session → nhận lại pending events; gateway/bridge đảm bảo không mất trạng thái cần thiết cho UI

**Lưu ý quan trọng:**

- Kitchen Service không được phụ thuộc DB — mọi durability ngắn hạn cho KDS nằm ở Redis keys đã đặt tên; nguồn sự thật đơn hàng vẫn là Order Service / event log
- `kitchen.item_ready` phát từ BFF sau phản hồi TCP từ dịch vụ có thẩm quyền — tránh gateway tự suy luận trạng thái món
- Phân tách rõ: topic Kafka (async domain) vs BFF Direct (side-effect đồng bộ sau command)

**BFF REST Endpoints (Kitchen):**

- KDS queue query — Chef/Barista, KITCHEN_GET_QUEUE
- KDS ticket start/done — Chef/Barista, KITCHEN_UPDATE_TICKET
- KDS ticket recall — Chef/Barista, KITCHEN_RECALL
- KDS ticket priority — Owner/Manager only

**Verify:** Integration test hoặc script: publish `order.confirmed` → ticket xuất hiện đúng queue + room WS đúng role; SLA vượt ngưỡng → `kitchen.sla_warning` + management nhận WS; BFF path `kitchen.item_ready` → staff + customer nhận trong cùng scenario

### Step 2.7 — FE↔BE Real-time (2-3 ngày)

**Mục tiêu:** Ứng dụng staff và khách subscribe đúng kênh WS và phản ánh trạng thái đơn/KDS/menu mà không polling thừa.

**Yêu cầu chính:**

- Hooks cho: customer order tracking (subscribe WebSocket room), KDS queue management (WS + REST hybrid), staff live orders (WS room subscribe)
- Customer PWA: Order tracking page cập nhật real-time qua WebSocket theo session (status timeline phản ánh ngay khi trạng thái đơn/món thay đổi). Menu auto-refresh khi nhận `menu.updated` event (hoặc policy invalidate đã chốt với Catalog)
- Management App `/pos/`: WebSocket → live order list auto-update (đơn mới slides in với animation, trạng thái đổi real-time)
- Management App `/kds/`: tickets slide in khi có đơn mới, status updates real-time qua WS. Actions (start, done, recall) → API calls → broadcast kết quả tới rooms liên quan (staff + customer)

**Lưu ý quan trọng:**

- UI chỉ render theo payload đã version/contract; không hard-code logic routing food/drink ở FE — hiển thị theo dữ liệu từ backend/KDS
- Reconnect phải được kiểm thử trên mạng không ổn định (tab background, sleep, VPN)

**Verify:** E2E flow: Khách đặt đơn → Staff thấy ngay trên POS → Staff confirm → KDS thấy ticket ngay → Chef/Barista done → Khách thấy trạng thái Ready. Đổi menu → PWA reflect tức thì. Disconnect WS 10s → reconnect → room và events vẫn đúng

## Acceptance Criteria

- [ ] KDS: FIFO đúng thứ tự và batching theo contract (cùng item qua nhiều bàn)
- [ ] KDS: routing food → kitchen queue (`kds:{tid}:kitchen`), drink → bar queue (`kds:{tid}:bar`)
- [ ] Real-time: từ sự kiện order-domain tới broadcast WS < 2 giây (trong điều kiện hạ tầng dev/staging chuẩn)
- [ ] E2E: order → confirm → KDS → ready → served với cập nhật real-time trên staff + customer
- [ ] WebSocket rooms: mỗi role chỉ nhận sự kiện trong phạm vi room đã định nghĩa (staff / kds:kitchen / kds:bar / management / session customer)
- [ ] SLA: ticket vượt ngưỡng → cảnh báo màu/UI + luồng `kitchen.sla_warning` tới management
- [ ] Reconnection: disconnect → tự join lại room → nhận pending/snapshot theo policy đã chốt

## Outputs cho Phase tiếp theo

- Kitchen Service vận hành trên Redis + Kafka, không persistence riêng — sẵn sàng gắn thêm billing/POS phase mà không đổi contract queue cốt lõi
- WebSocket Gateway có Redis Adapter, map room theo role và session — có thể mở rộng topic/event mới cho thanh toán hoặc thông báo vận hành
- FE hooks real-time (order tracking, KDS queue, live orders) dùng chung cho POS và PWA
- Bảng tra cứu nhanh: topic `order.confirmed`, `kitchen.sla_warning`, `payment.completed`; keys `kds:{tid}:kitchen`, `kds:{tid}:bar`; rooms `tenant:{tid}:staff`, `tenant:{tid}:kds:kitchen`, `tenant:{tid}:kds:bar`, `tenant:{tid}:management`, `session:{sid}:customer`
