# Phase 2A — QR Order Flow + Order/Kafka

> **Status:** Done
> **Canonical Role:** Final phase record after implementation/audit.
> **Last Updated:** 2026-05-13

## Final Scope

Phase 2A hoàn thành nền tảng đặt món qua QR cho QRTable: khách vào phiên bàn bằng QR, dùng shared cart, gửi order, staff xác nhận/hủy/phục vụ, bill được gom theo session, yêu cầu phục vụ được gửi tới POS, và Order Service publish Kafka `order.confirmed` cho các consumer hậu xử lý.

Phạm vi cuối cùng gồm:

- QR customer session flow: validate QR/table qua Catalog, tạo hoặc join active session, persist session trong Order PostgreSQL và cache active session trong Redis.
- Shared cart theo session: Redis cart, optimistic `cartVersion`, conflict khi client dùng version cũ, lock cart khi bill đang chờ thanh toán.
- Order lifecycle: cart/UI `DRAFT`, DB order bắt đầu từ `PENDING`, staff confirm sang `PROCESSING`, kitchen có thể đưa order/item sang `READY`, staff phục vụ sang `SERVED`, cancel theo state, và `COMPLETED` thuộc payment completion ở phase sau.
- Bill/session lifecycle: một bill hiện hành cho active session, tạo ở lần submit order đầu tiên, aggregate các order chưa bị cancel, `OPEN -> PENDING_PAYMENT` khi customer request bill.
- Order Service ownership cho orders, order items, sessions, bills, service requests, cart/session Redis semantics, và simplified outbox cho Kafka.
- BFF customer/admin REST routes, BFF Direct realtime events, Customer PWA order/cart/bill flows, và Management POS order/service/table surfaces.

## Accepted Decisions

- Order Service là source of truth cho session, cart snapshot, order, order item, bill và service request; Catalog là source of truth cho menu item, stock, table status, QR token và `MenuItem.station`.
- Session là durable entity trong PostgreSQL. Redis key `session:{tenantId}:{sessionId}` là cache active với TTL 2 giờ; idle close sau 30 phút chỉ áp dụng khi `orderCount == 0`.
- Cart nằm trong Redis key `cart:{tenantId}:{sessionId}` với `cartVersion`. REST snapshot là nguồn dữ liệu chuẩn sau reconnect; WebSocket/realtime event chỉ là hint để invalidate/refetch.
- `DRAFT` không tạo DB order row. Submit cart tạo order `PENDING`, clear cart sau khi thành công, và dùng `idempotencyKey` để tránh submit lặp.
- Submit chỉ validate snapshot availability. Stock deduct chỉ xảy ra khi staff confirm `PENDING -> PROCESSING` qua Catalog TCP transactional command (`STOCK_DEDUCT_FOR_ORDER`); cancel processing gọi release/restore qua Catalog policy (`STOCK_RELEASE_FOR_ORDER`).
- Kafka chỉ được dùng cho domain event hậu xác nhận: Order Service ghi outbox `order.confirmed`, publisher gửi topic với partition key `tenantId` và payload có table/session/item/station snapshot.
- UI realtime không đi qua Kafka trong Phase 2A. BFF phát direct events sau TCP success: `events.cartUpdated`, `events.orderCreated`, `events.orderStatusChanged`, `events.serviceRequested`, `events.billRequested`, `events.tableTransferred`.
- Bill request là explicit command. `REQUEST_BILL` service request là side effect thông báo/audit, không thay thế command request bill.
- Bill request yêu cầu cart rỗng và các order không bị cancel đã served; khi hợp lệ bill sang `PENDING_PAYMENT`, cart bị `LOCKED`, table sang `billing`.
- Customer chỉ tự hủy order `PENDING` trong session của mình. Staff cancel tách quyền `order.cancel_pending` và `order.cancel_processing`; cancel processing yêu cầu reason.
- Chuyển bàn dùng saga-style consistency với Redis locks, Order DB update, Catalog table status update và realtime `tableTransferred`; không yêu cầu ACID transaction xuyên mọi store.

## Final Business Behavior

Khách quét QR để join session bàn. Nếu bàn available, hệ thống tạo session mới, set bàn occupied qua Catalog và cache session cho PWA. Nếu bàn occupied có session hợp lệ, khách join lại session đó. Bàn đang billing hoặc cleaning không nhận session đặt món mới.

Khách thêm/sửa/xóa món trong cart theo `expectedCartVersion`; server reject mutation cũ bằng conflict để client refetch snapshot. Cart line có thể gộp cùng món/cùng ghi chú trong cùng session trước submit; đây là hành vi cart, không phải KDS batching.

Khi submit order, Order Service persist order `PENDING`, order items, bill hiện hành nếu chưa có, tăng `orderCount`, clear cart, và BFF emit `events.orderCreated` cùng `events.cartUpdated`. Staff POS đọc order qua BFF admin routes và nhận realtime hint để refetch.

Khi staff confirm, Order Service lock order, deduct stock qua Catalog, chuyển order sang `PROCESSING`, tạo outbox `order.confirmed`, và BFF emit `events.orderStatusChanged`. Kitchen/KDS Phase 2B consume Kafka event này để tạo station tickets.

Customer hoặc staff có thể hủy `PENDING`; Owner/Manager có thể hủy `PROCESSING` kèm reason, Order Service cập nhật bill totals và gọi Catalog release stock. Các order canceled không tham gia tổng bill.

Customer request bill sau khi cart rỗng và món đã served. Bill chuyển `PENDING_PAYMENT`, cart bị lock, table chuyển billing, và staff nhận service/bill realtime hint. Thanh toán, refund, split bill và settlement đầy đủ thuộc các phase sau, dù code hiện tại đã có các điểm mở rộng cho Phase 3+.

Service requests `CALL_STAFF`, `GENERAL_HELP`, `REQUEST_BILL` được lưu trong Order domain; staff acknowledge/resolve qua POS. Table transfer giữ nguyên session id, cập nhật table snapshot trong Order DB, Redis session metadata, Catalog table statuses và realtime hint.

## Final Technical Behavior

Service ownership sau Phase 2A:

- Order Service owns PostgreSQL entities `sessions`, `orders`, `order_items`, `bills`, `service_requests`, `outbox_events`; Redis cart/session semantics; order state transitions; bill request; table transfer; stock-deduct/release orchestration through Catalog; and Kafka `order.confirmed` outbox production.
- Catalog Service owns QR token validation, table status transitions, menu item snapshots, stock and station metadata. Order stores denormalized table/menu/station snapshots for history and display only.
- BFF owns HTTP edge routes, staff permission guards, customer session/tenant context, TCP orchestration, and direct WebSocket emits after successful service responses.
- Customer PWA owns QR session persistence, cart/order/bill API usage, idempotency key creation, optimistic cart UX with server reconciliation, and realtime invalidation/refetch for session-scoped data.
- Management App POS owns staff order list/detail/actions, service-request handling, table transfer surfaces and hybrid polling/realtime invalidation.
- Shared types in `libs/shared/types` define `OrderStatus`, `OrderItemStatus`, `BillStatus`, `SessionStatus`, `ServiceRequestStatus`, transition matrices and event payload contracts shared by FE/BE.

Kafka/event behavior:

- `order.confirmed` payload includes `eventId`, `schemaVersion`, `tenantId`, `orderId`, `sessionId`, `tableId`, `tableName`, items with station snapshots, totals, confirmation metadata and correlation id.
- Outbox publisher sends pending rows to Kafka and marks success/failure; at-least-once delivery is handled by downstream idempotency.
- BFF Direct events are not replay logs. Clients treat them as realtime hints and refetch REST snapshots.

## Acceptance Evidence

Implementation evidence present in the repo on 2026-05-13:

- Order domain services, repositories and tests cover session join/cache, cart version conflicts, submit/confirm/cancel/serve, bill request/reopen/payment hooks, service requests, transfer table and Kafka payload construction.
- BFF customer/admin controllers expose cart, orders, bill, service request, staff order actions and transfer endpoints with tenant/session context and permission guards.
- BFF realtime gateway/service emits cart/order/status/service/bill/transfer hints to session and tenant staff rooms.
- Customer PWA order hooks/services use live BFF APIs for cart, orders, current bill, bill request, idempotency and session-scoped realtime invalidation.
- Management App order/service/table hooks and POS surfaces use live BFF/Catalog APIs with polling plus realtime invalidation.
- Shared type tests cover transition matrices and enum completeness for the Order/Bill/Service Request contracts.

## Handoff / Deferred Work

- Phase 2B owns KDS ticket materialization, station queues, Kitchen Service Redis state, SLA worker, WebSocket hardening and kitchen/customer ready realtime.
- Phase 3+ owns payment execution, cash/VietQR settlement, refund, receipt, payment-driven session close and final bill `PAID -> order COMPLETED` behavior.
- Durable event replay, full CDC/outbox hardening, offline customer/POS queueing, cross-service saga observability and production Kafka/Redis alerting remain operational hardening outside Phase 2A.
- Any future change to order states, bill states, event names or Redis key semantics must update shared types and BFF/customer/management consumers together.
