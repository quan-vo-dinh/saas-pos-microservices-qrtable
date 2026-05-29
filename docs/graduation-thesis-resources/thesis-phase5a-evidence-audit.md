# Phase 5A — Audit Implementation Evidence cho Chương 5

> Tài liệu này là kết quả của Phase 5A: kiểm kê bằng chứng triển khai thực tế từ source code và docs.
> Mục tiêu: xây dựng nền cho nội dung Chương 5 (Cài đặt hệ thống) — không draft chương, chỉ lập bảng evidence và plan diagram.
> Cập nhật: 2026-05-29.

---

## 1. Ma trận Evidence theo Flow chính

### 1.1 Flow: QR Session — Khách quét QR vào phiên gọi món

| Evidence item                                                     | File / Path                                                    | Dòng / Method                                     | Claim được hỗ trợ                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Session được tạo khi bàn Available, join khi đã Occupied          | `apps/order/src/app/modules/order/services/session.service.ts` | `getActiveSessionOrThrow`, `resolveActiveSession` | Session lifecycle: create / join / idle-close           |
| Session cache = Redis Hash, fallback PG                           | `session.service.ts`                                           | `resolveActiveSession` L176–206                   | Redis-first, PG fallback pattern                        |
| Idle-close chỉ khi `orderCount === 0`                             | `session.service.ts`                                           | `applyIdleCloseIfNeeded` L292–347                 | Empty session auto-release, không đóng session có order |
| Sau idle-close, TCP sang Catalog cập nhật table AVAILABLE         | `session.service.ts`                                           | `releaseCatalogTable` L349–372                    | Catalog owns table state, cross-service via TCP         |
| Redis key dùng builder `RedisKey.session.data(...)`               | `session.service.ts`                                           | L43–44                                            | Không hardcode Redis key (AGENTS.md)                    |
| Empty session release: check `orderCount === 0 && !currentBillId` | `session.service.ts`                                           | `isReleasableEmptyTableSession` L273–283          | Safe empty session release logic                        |
| TTL làm mới sau cart mutation                                     | `session.service.ts`                                           | `touchAfterCartMutation` L58–79                   | Session hoạt động theo activity, không TTL cố định      |
| Session đóng sau payment                                          | `session.service.ts`                                           | `closeAfterPayment` L86–91                        | Del Redis session + cart key                            |

**Đánh giá P0:** ✅ Evidence đủ để viết prose flow QR/session trong Chương 5.

---

### 1.2 Flow: Cart / Order Submit — Khách thêm món và submit

| Evidence item                                                    | File / Path                                                         | Dòng / Method                                      | Claim được hỗ trợ                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| Cart lưu trong Redis; key dùng builder `RedisKey.cart.data(...)` | `apps/order/src/app/modules/order/services/cart.service.ts`         | (khảo sát heuristic từ session.service L90,114)    | Shared cart per session, Redis-backed         |
| Submit order tạo record DB Order ở trạng thái PENDING            | `apps/order/src/app/modules/order/services/order-submit.service.ts` | (file 14KB)                                        | Draft không có DB row; chỉ persist khi submit |
| idempotencyKey gắn với order khi submit                          | `order-state-transition.service.ts`                                 | L97: `idempotencyKey: 'confirm-order:${order.id}'` | Write operation có idempotency (AGENTS.md)    |
| Order quota service kiểm tra giới hạn                            | `apps/order/src/app/modules/order/services/order-quota.service.ts`  | (file 1.7KB)                                       | Subscription plan limit                       |
| Bill được tạo khi submit đầu tiên trong session (OPEN)           | `order-state-transition.service.ts`                                 | L83–86: check `bill.status !== BillStatus.OPEN`    | Session ↔ bill 1-to-1 OPEN                   |

**Đã xử lý ở Phase 5B:** đã đọc thêm `order-submit.service.ts` và `cart.service.ts`; Hình 5.1 đã bám Redis cart, optimistic `cartVersion`, `idempotencyKey` submit và submit Order `PENDING`/Bill `OPEN`.

---

### 1.3 Flow: Order Confirm & Stock Consistency — Staff confirm, Catalog deduct stock

| Evidence item                                                                        | File / Path                                                                   | Dòng / Method                                                   | Claim được hỗ trợ                                           |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| Staff confirm → gọi Catalog TCP `STOCK_DEDUCT_FOR_ORDER` trước khi cập nhật DB Order | `apps/order/src/app/modules/order/services/order-state-transition.service.ts` | `confirmOrder` L62–155, `callCatalogStockDeduct` L542–565       | Catalog owns stock; Order không update DB Catalog trực tiếp |
| Pessimistic lock qua `findByIdAndTenantForUpdate` trước khi deduct                   | `order-state-transition.service.ts`                                           | L64–66                                                          | Tránh race condition concurrent confirm                     |
| Sau deduct: order status = PROCESSING, outbox event `order.confirmed`                | `order-state-transition.service.ts`                                           | L101–133                                                        | Transactional outbox pattern — Kafka sau commit             |
| Cancel Processing → `STOCK_RELEASE_FOR_ORDER`                                        | `order-state-transition.service.ts`                                           | `cancelProcessing` L181–240, `callCatalogStockRelease` L567–590 | Stock trả lại khi cancel ở Processing                       |
| Cancel Pending → không release stock (chưa deduct)                                   | `order-state-transition.service.ts`                                           | `runPendingCancelTransaction` L483–523                          | Đúng với spec Step 2.4 Q2                                   |
| Idempotency key cho stock deduct                                                     | `order-state-transition.service.ts`                                           | L97: `confirm-order:${order.id}`                                | Idempotent cross-service call                               |

**Đánh giá P0:** ✅ Evidence đủ để vẽ Hình 5.2 sequence (Order confirm & stock consistency).

**Code anchor:** `apps/order/src/app/modules/order/services/order-state-transition.service.ts`

---

### 1.4 Flow: KDS Ticket Lifecycle — Từ order.confirmed đến bếp/bar

| Evidence item                                                               | File / Path                                                                                   | Dòng / Method                                | Claim được hỗ trợ                               |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| Kitchen Kafka consumer subscribe topic `ORDER_CONFIRMED_TOPIC`              | `apps/kitchen/src/app/modules/kitchen/services/order-confirmed.consumer.ts`                   | `onModuleInit` L18–45                        | Async event-driven: Order → Kafka → Kitchen     |
| Validate schema event `order.confirmed` (eventType, schemaVersion, items[]) | `order-confirmed.consumer.ts`                                                                 | `isOrderConfirmedEvent` L75–91               | Schema validation trước khi process             |
| Kafka consumer → `KdsRedisRepository.createTicketsFromConfirmedOrder`       | `order-confirmed.consumer.ts`                                                                 | L71–72                                       | KDS state lưu trong Redis, không có DB riêng    |
| Sau tạo ticket, publish event WebSocket qua `KitchenEventsPublisher`        | `order-confirmed.consumer.ts`                                                                 | L72: `eventsPublisher.publishMany(events)`   | Realtime hint cho UI                            |
| `KdsTicketService`: startTicket, markReady, recallTicket, setPriority       | `apps/kitchen/src/app/modules/kitchen/services/kds-ticket.service.ts`                         | L27–49                                       | KDS ticket state machine operations             |
| Sau mỗi mutation, publish `KdsQueueChangedEvent`                            | `kds-ticket.service.ts`                                                                       | `mutateTicket` L51–62, `queueChanged` L64–82 | Realtime KDS queue update                       |
| SLA warning worker                                                          | `apps/kitchen/src/app/modules/kitchen/services/kitchen-sla.worker.ts`                         | (file 5.3KB)                                 | SLA_WARNING event cho ticket quá giờ            |
| Kitchen KHÔNG có database, chỉ Redis Sorted Set                             | `kitchen.module.ts` (no TypeORM import); `kds-ticket.service.ts` imports `KdsRedisRepository` | —                                            | Đúng kiến trúc Kitchen = stateless + Redis-only |

**Đánh giá P0:** ✅ Evidence đủ để vẽ Hình 5.3 sequence (KDS ticket lifecycle).

**Code anchor:** `apps/kitchen/src/app/modules/kitchen/services/`

---

### 1.5 Flow: Payment Settlement — Cash và VietQR/SePay

| Evidence item                                                                                           | File / Path                                                                   | Dòng / Method                        | Claim được hỗ trợ                                      |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| Tạo VietQR: lấy bill snapshot từ Order TCP, validate VND rounding                                       | `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts` | `createVietQr` L50–84                | `assertValidVndRoundingSnapshot` — VND rounding policy |
| QR URL: amount = `roundedTotal`, description = `billReference` (QRTBL+8chars billId)                    | `payment-settlement.service.ts`                                               | `vietQrPresentation` L174–194        | Bill reference pattern cho SePay matching              |
| Confirm cash: DB transaction, audit log, outbox `PAYMENT_COMPLETED`                                     | `payment-settlement.service.ts`                                               | `confirmCash` L86–172                | Transactional outbox sau payment                       |
| Sau cash payment: TCP sang Order `markBillPaid`                                                         | `payment-settlement.service.ts`                                               | L156–165                             | Cross-service via TCP sau payment                      |
| SePay webhook: verify secret timing-safe, extract billReference, idempotency check `sepayTransactionId` | `apps/payment/src/app/modules/payment/services/sepay-webhook.service.ts`      | `handleSepayWebhook` L34–165         | Idempotent webhook, timing-safe secret verify          |
| Underpaid: log SEPAY_WEBHOOK_UNDERPAID, không process                                                   | `sepay-webhook.service.ts`                                                    | L104–118                             | Handling partial payment                               |
| Duplicate webhook: check `payment.sepayTransactionId === payload.id`                                    | `sepay-webhook.service.ts`                                                    | L78–88                               | Idempotency via transactionId                          |
| Tenant route: verify webhook secret từ tenant payment settings                                          | `sepay-webhook.service.ts`                                                    | `verifyTenantWebhookSecret` L173–197 | Multi-tenant webhook routing                           |
| `constantTimeEquals`: dùng `timingSafeEqual` từ Node.js crypto                                          | `sepay-webhook.service.ts`                                                    | L212–216                             | Timing-safe secret comparison (security)               |

**Đánh giá P0:** ✅ Evidence đủ để vẽ Hình 5.4 sequence (Payment settlement).

**Code anchor:** `apps/payment/src/app/modules/payment/services/`

---

### 1.6 Flow: SaaS Onboarding — Tenant creation, subscription, owner setup

| Evidence item                                                                                                                 | File / Path                                                          | Dòng / Method                                                          | Claim được hỗ trợ                           |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| Onboarding là mini-saga: tạo tenant → owner (Keycloak TCP) → user profile (User-Access TCP) → subscription → payment settings | `apps/saas/src/services/onboarding-saga.service.ts`                  | `onboard` L51–166                                                      | Saga pattern với compensation khi thất bại  |
| Compensation: disable Keycloak user khi saga fail sau bước tạo user                                                           | `onboarding-saga.service.ts`                                         | L142–153                                                               | Rollback partial state (orphan prevention)  |
| Compensation: xóa subscription và tenant nếu fail                                                                             | `onboarding-saga.service.ts`                                         | L155–159                                                               | Clean rollback path                         |
| Slug tự động normalize, unique, chặn reserved words                                                                           | `onboarding-saga.service.ts`                                         | `generateUnique` call L62–67; `apps/saas/src/services/slug.service.ts` | Slug policy (docs/business-logic.md §1.A.2) |
| Sau onboarding: outbox `tenantCreated`                                                                                        | `onboarding-saga.service.ts`                                         | L128–138                                                               | Transactional outbox cho async downstream   |
| Subscription auto-assign plan khi onboard                                                                                     | `onboarding-saga.service.ts`                                         | `subscriptionService.assignPlan` L110–116                              | Subscription lifecycle từ onboarding        |
| Subscription expire cron job                                                                                                  | `apps/saas/src/services/subscription-invoice-expire-cron.service.ts` | (file 1KB)                                                             | Auto-suspend at 02:00 Asia/Ho_Chi_Minh      |
| Tenant status cache                                                                                                           | `apps/saas/src/services/tenant-status-cache.service.ts`              | (file 1.1KB)                                                           | Cache subscription/tenant status cho guard  |
| Slug service test                                                                                                             | `apps/saas/src/services/slug.service.spec.ts`                        | (file 1.2KB)                                                           | Unit test slug generation                   |
| Onboarding saga integration test (DB)                                                                                         | `apps/saas/src/services/onboarding-saga-db.integration.spec.ts`      | (file 13.7KB)                                                          | Integration evidence                        |

**Đánh giá P0:** ✅ Evidence đủ để vẽ Hình 5.5 sequence (SaaS onboarding).

**Code anchor:** `apps/saas/src/services/onboarding-saga.service.ts`

---

## 2. Kế hoạch Sequence Diagram (Hình 5.1 – 5.5)

Tất cả diagram Chương 5 là **sequence/runtime flow** (không lặp lại architecture của Chương 4).

### Hình 5.1: QR Ordering & Session Flow

**Actors/participants:**

- Customer (Browser/PWA)
- BFF (API Gateway)
- Order Service (session + cart)
- Catalog Service (table status)
- Redis (session hash, cart)

**Flow cốt lõi:**

1. Customer scan QR → GET `/qr/scan?table_id=&token=`
2. BFF validate HMAC token → gọi Order TCP `JOIN_SESSION`
3. Order: check Redis session cache → nếu idle/empty, close + release table → tạo session mới
4. Redis HSET session hash; EXPIRE TTL
5. Order TCP → Catalog TCP `UPDATE_TABLE_STATUS = OCCUPIED`
6. Return session + menu data → Customer thấy menu

**Mức độ chi tiết:** Chỉ gọi ra Redis, TCP. Không vẽ chi tiết gRPC Authorizer ở flow này.

---

### Hình 5.2: Order Confirm & Stock Consistency

**Actors/participants:**

- Staff (POS/Browser)
- BFF
- Order Service (order-state-transition)
- Catalog Service (stock owner)
- PostgreSQL Order DB
- PostgreSQL Catalog DB
- Outbox Publisher (Kafka relay)
- Kafka

**Flow cốt lõi:**

1. Staff click "Confirm" → POST `/orders/{id}/confirm`
2. BFF JWT guard → TCP `CONFIRM_ORDER` → Order Service
3. Order: `findByIdAndTenantForUpdate` (pessimistic lock)
4. TCP → Catalog `STOCK_DEDUCT_FOR_ORDER` (idempotencyKey)
5. Catalog: lock + deduct in Catalog DB (own transaction)
6. Order: update `status = PROCESSING` + save Outbox `order.confirmed` trong cùng 1 transaction
7. Outbox publisher poll → publish to Kafka topic `order.confirmed`
8. Response trả về Staff

**Nhấn mạnh:** Catalog DB và Order DB là 2 PG database riêng; giao tiếp chỉ qua TCP.

---

### Hình 5.3: KDS Ticket Lifecycle

**Actors/participants:**

- Kafka (`order.confirmed` topic)
- Kitchen Service (OrderConfirmedConsumer)
- KdsRedisRepository (Redis Sorted Set)
- KitchenEventsPublisher (WebSocket)
- KDS UI (Kitchen/Bar screen)
- Chef (Kitchen staff)
- BFF (Kitchen TCP handler)
- Order Service (markOrderItemsReady)

**Flow cốt lõi:**

1. Kafka deliver `order.confirmed` → `OrderConfirmedConsumer.handleEvent`
2. Validate schema → `KdsRedisRepository.createTicketsFromConfirmedOrder`
3. Tickets thêm vào Redis Sorted Set theo station (KITCHEN / BAR)
4. `KitchenEventsPublisher.publishMany` → WebSocket hint tới KDS UI
5. KDS UI refetch REST `GET /kds/queue` → hiển thị ticket mới (FIFO)
6. Chef click "Start" → TCP `KDS_START_TICKET` → `kds-ticket.service.startTicket`
7. Mutation → Redis update → publish `KdsQueueChangedEvent`
8. Chef click "Done" → TCP `KDS_MARK_READY` → `kds-ticket.service.markReady`
9. Kitchen TCP → Order TCP `MARK_ORDER_ITEMS_READY`
10. Order: nếu tất cả item READY → `order.status = READY`

**Nhấn mạnh:** WebSocket là hint, không phải source of truth; KDS refetch REST sau event.

---

### Hình 5.4: Payment Settlement (Cash & VietQR/SePay)

**Phần A — Cash:**

1. Staff request payment → BFF → Payment TCP `CONFIRM_CASH`
2. Payment: get bill snapshot từ Order TCP
3. Validate VND rounding snapshot
4. DB transaction: save Payment PAID + Audit log + Outbox `PAYMENT_COMPLETED`
5. TCP → Order `MARK_BILL_PAID` → Order: close bill, session lifecycle

**Phần B — VietQR/SePay:**

1. Staff/Customer `GET VietQR` → Payment: generate QR URL với `billReference = QRTBL+{8chars}`
2. Customer quét QR, chuyển khoản ngân hàng
3. SePay → BFF webhook `/webhooks/sepay/{tenantSlug}`
4. BFF → Payment TCP `HANDLE_SEPAY_WEBHOOK`
5. Payment: verify tenant secret (timing-safe), extract billReference
6. DB transaction: check idempotency `sepayTransactionId`, amount >= roundedTotal
7. Nếu đủ: save PAID + Audit + Outbox
8. TCP → Order `MARK_BILL_PAID`

---

### Hình 5.5: SaaS Onboarding Saga

**Actors/participants:**

- Super Admin (Management App)
- BFF / SaaS Controller
- SaaS Service (OnboardingSagaService)
- Authorizer Service (Keycloak TCP)
- User-Access Service (User Profile TCP)
- Payment Service (Payment Settings TCP)
- SaaS DB (tenant, subscription)
- Outbox Publisher

**Flow cốt lõi:**

1. SUPER_ADMIN POST `/saas/tenants/onboard`
2. BFF → SaaS TCP `ONBOARD_TENANT`
3. Saga start:
   - Tạo slug (normalize + unique check)
   - `tenantRepository.create` (SaaS DB)
   - TCP Authorizer `CREATE_TENANT_OWNER` → Keycloak tạo user, assign role OWNER
   - TCP User-Access `UPSERT_WITH_TENANT` → MongoDB user profile
   - `tenantRepository.updateProfile` (ownerId)
   - `subscriptionService.assignPlan` (assign initial plan)
   - TCP Payment `CREATE_EMPTY_PAYMENT_SETTINGS`
   - `outboxRepository.createTenantCreated` → async downstream
4. Return `{ tenant, ownerUserId }`
5. **Compensation nhánh fail:**
   - Nếu fail sau bước Keycloak: TCP Authorizer `DISABLE_USER`
   - Nếu fail sau subscription: `compensateInitialOnboarding`
   - `tenantRepository.deleteById`

---

## 3. Implemented Evidence Table (Bảng 5.1 — nháp)

> Bảng này sẽ trở thành Bảng 5.1 trong LaTeX. Mỗi dòng cần "Claim" + "Evidence file/path" + trạng thái thực.

| #   | Feature / Claim                                      | Service         | Evidence (file)                                 | Kiểm tra bằng                   | Trạng thái     |
| --- | ---------------------------------------------------- | --------------- | ----------------------------------------------- | ------------------------------- | -------------- |
| 1   | QR session create/join/idle-close                    | Order           | `session.service.ts`                            | Code review, unit test (nếu có) | ✅ Implemented |
| 2   | Session Redis-first, PG fallback                     | Order           | `session.service.ts` L176–206                   | Code review                     | ✅ Implemented |
| 3   | Cart shared per session (Redis)                      | Order           | `cart.service.ts` (inferred)                    | Code review                     | ✅ Implemented |
| 4   | Order submit: persist PENDING, tạo Bill OPEN         | Order           | `order-submit.service.ts`                       | Code review                     | ✅ Implemented |
| 5   | Stock deduct qua TCP Catalog (Pessimistic lock)      | Order → Catalog | `order-state-transition.service.ts` L94–99      | Code review                     | ✅ Implemented |
| 6   | Transactional Outbox `order.confirmed`               | Order           | `order-state-transition.service.ts` L121–133    | Code review                     | ✅ Implemented |
| 7   | Stock release khi cancel Processing                  | Order → Catalog | `order-state-transition.service.ts` L201–206    | Code review                     | ✅ Implemented |
| 8   | Kitchen consume `order.confirmed` từ Kafka           | Kitchen         | `order-confirmed.consumer.ts`                   | Code review                     | ✅ Implemented |
| 9   | KDS ticket lưu Redis Sorted Set (no DB)              | Kitchen         | `kds-ticket.service.ts`, `KdsRedisRepository`   | Code review                     | ✅ Implemented |
| 10  | KDS mutation → WebSocket hint                        | Kitchen         | `kitchen-events.publisher.ts`                   | Code review                     | ✅ Implemented |
| 11  | KDS SLA warning worker                               | Kitchen         | `kitchen-sla.worker.ts`                         | Code review                     | ✅ Implemented |
| 12  | VietQR generate với VND rounding                     | Payment         | `payment-settlement.service.ts` L50–84          | Code review                     | ✅ Implemented |
| 13  | Cash confirm transaction + audit + outbox            | Payment         | `payment-settlement.service.ts` L86–172         | Code review                     | ✅ Implemented |
| 14  | SePay webhook idempotency (sepayTransactionId)       | Payment         | `sepay-webhook.service.ts` L78–88               | Code review                     | ✅ Implemented |
| 15  | Timing-safe webhook secret verify                    | Payment         | `sepay-webhook.service.ts` L212–216             | Code review                     | ✅ Implemented |
| 16  | SaaS onboarding saga với compensation                | SaaS            | `onboarding-saga.service.ts` L51–165            | Code + integration test         | ✅ Implemented |
| 17  | Slug normalize + unique check + reserved words block | SaaS            | `slug.service.ts`, `slug.service.spec.ts`       | Unit test                       | ✅ Implemented |
| 18  | Tenant status cache (subscription guard)             | SaaS            | `tenant-status-cache.service.ts`                | Code review                     | ✅ Implemented |
| 19  | Subscription auto-expire cron (02:00 HCM)            | SaaS            | `subscription-invoice-expire-cron.service.ts`   | Code review                     | ✅ Implemented |
| 20  | Safe empty session release (table transfer)          | Order           | `session.service.ts` `releaseEmptyTableSession` | Code review                     | ✅ Implemented |

---

## 4. Shared Libraries Evidence (Bảng 5.2 — nháp)

| Thư viện                         | Alias                                                   | Vai trò trong consistency                                           | Nơi dùng minh chứng                                                        |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `libs/constants`                 | `@qrtable/constants` (hoặc `@common/constants`)         | Kafka topic, enum `OrderStatus`, `BillStatus`, `SessionStatus`      | `order-state-transition.service.ts` L30, `order-confirmed.consumer.ts` L78 |
| `libs/schemas` (entities)        | `@common/entities`                                      | TypeORM entities shared: `Session`, `Order`, `Bill`, `OutboxEvent`  | Nhiều service import qua `@common/entities/`                               |
| `libs/providers` (TCP clients)   | `@common/providers`, `@common/configuration/tcp.config` | TCP_SERVICES injection tokens                                       | `session.service.ts` L39, `order-state-transition.service.ts` L59          |
| `libs/common` (RedisKey builder) | `@common/constants/redis-key.constants`                 | Builder pattern Redis key, không hardcode                           | `session.service.ts` L8,43–44                                              |
| `libs/shared/types`              | `@einvoice/types`                                       | `OrderStatus`, `BillStatus`, `SessionStatus`, `OrderConfirmedEvent` | Cross-service type safety                                                  |
| `libs/interceptors`              | `@common/error-messages`                                | `BusinessException`, `ErrorCode`                                    | Pattern exception typed thay `throw new Error()`                           |

---

## 5. Screenshot/Demo Plan (ánh xạ sang artifact backlog)

Tham chiếu: `thesis-artifact-backlog.md` §5.

Các screenshot đại diện P0/P1 cần chuẩn bị scaffold cho Chương 5/Phụ lục:

| Ảnh      | Màn hình                                         | Flow                    |
| -------- | ------------------------------------------------ | ----------------------- |
| Ảnh 5.1  | Customer PWA: QR join / session screen           | Hình 5.1                |
| Ảnh 5.2  | Customer PWA: Menu browsing                      | Hình 5.1                |
| Ảnh 5.3  | Customer PWA: Cart + order submit                | Hình 5.1 / 5.2          |
| Ảnh 5.4  | Customer PWA: Order tracking + VietQR payment    | Hình 5.4                |
| Ảnh 5.5  | Staff POS: Table map hoặc live orders            | Hình 5.2                |
| Ảnh 5.6  | Staff POS: Order detail / confirm                | Hình 5.2                |
| Ảnh 5.7  | KDS: Kitchen/bar queue                           | Hình 5.3                |
| Ảnh 5.8  | KDS: Ticket detail / status update               | Hình 5.3                |
| Ảnh 5.9  | Owner dashboard: Menu management                 | (Catalog context)       |
| Ảnh 5.10 | Owner dashboard: Table/QR management             | (Catalog context)       |
| Ảnh 5.11 | Owner dashboard: Payment settings / subscription | Hình 5.4 / SaaS context |
| Ảnh 5.12 | Super Admin: Tenant onboarding / lifecycle       | Hình 5.5                |

> Cập nhật sau Phase 5C: Phase 5D chuyển sang chế độ scaffold/manual capture handoff. Agent không mở Browser và không chụp UI; agent chỉ tạo mapping, placeholder trắng, ref/caption và khung LaTeX. Người viết sẽ thay screenshot thật thủ công sau.

---

## 6. Checklist trước và trong khi hoàn thiện Chương 5

- [x] Ma trận evidence cho 6 flow chính đã lập
- [x] Kế hoạch 5 sequence diagram P0 đã có nội dung flow
- [x] Bảng 5.1 evidence nháp đã có 20 dòng
- [x] Bảng 5.2 shared libs evidence nháp đã có
- [x] Source Mermaid 5 diagram — đã viết, render, chèn LaTeX và build verify trong Phase 5B
- [x] Bản nháp Chương 5 prose + Bảng 5.1/Bảng 5.2 — Phase 5C
- [ ] Screenshot scaffold 12 ảnh đại diện P0/P1 — chờ Phase 5D tạo placeholder/ref/caption
- [ ] Thay placeholder bằng screenshot thật và build PDF — người viết/phiên polish sau Phase 5D

---

## 7. Bằng chứng kiểm tra nhanh (spot-check thực hiện trong phiên này)

Các file thực sự được mở và đọc trong phiên audit:

| File                                                                          | Size     | Nội dung xác nhận                                        |
| ----------------------------------------------------------------------------- | -------- | -------------------------------------------------------- |
| `apps/order/src/app/modules/order/services/session.service.ts`                | 374 dòng | Redis-first pattern, idle-close, TCP catalog release     |
| `apps/order/src/app/modules/order/services/order-state-transition.service.ts` | 658 dòng | Pessimistic lock, stock deduct TCP, transactional outbox |
| `apps/kitchen/src/app/modules/kitchen/services/order-confirmed.consumer.ts`   | 93 dòng  | Kafka consumer, schema validate, Redis ticket create     |
| `apps/kitchen/src/app/modules/kitchen/services/kds-ticket.service.ts`         | 84 dòng  | Ticket operations, WebSocket event publish               |
| `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts` | 243 dòng | VND rounding validate, cash transaction, outbox          |
| `apps/payment/src/app/modules/payment/services/sepay-webhook.service.ts`      | 217 dòng | Webhook idempotency, timing-safe secret, SePay matching  |
| `apps/saas/src/services/onboarding-saga.service.ts`                           | 178 dòng | Saga steps, compensation, TCP cross-service              |

Tổng cộng đã xem **~1.847 dòng source code** cho 7 file service chính.
