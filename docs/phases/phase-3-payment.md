# Phase 3 - Payment

> **Status:** Done
> **Canonical Role:** Final phase record after implementation/audit.
> **Last Updated:** 2026-05-13

## Final Scope

Phase 3 completed the restaurant bill payment layer for QRTable: cash settlement, VietQR/SePay settlement, payment history, manual full refund, payment audit trail, and post-payment synchronization back to Order.

The final scope includes:

- Payment Service ownership of `payments`, `refunds`, `audit_payments`, payment outbox events, cash confirmation, VietQR creation, SePay webhook settlement, payment history, and manual refund state.
- Order Service ownership of bill/session lifecycle: bill request, `PENDING_PAYMENT`, final `PAID`, session close, and table transition through Catalog.
- BFF HTTP surfaces for staff payment actions, Customer PWA payment actions, and SePay webhook routing.
- UI surfaces in Customer PWA `/request-payment`, POS `/pos/bills`, POS legacy `/pos/payment` redirect, and Dashboard `/dashboard/orders` refund controls.
- Kafka contracts `payment.completed` and `payment.refunded` for downstream synchronization and realtime hints.

This phase record complements [business-logic.md](../business-logic.md), [technical-architecture.md](../technical-architecture.md), [implementation_plan.md](../implementation_plan.md), and [permission-matrix.md](../architecture/permission-matrix.md). When behavior conflicts, current code and tests on `main` are the source of truth.

## Accepted Decisions

- Phase 3 payment methods are `CASH` and `VIETQR`. Other gateways are out of scope.
- Bill lifecycle remains in Order. Payment Service stores payment/refund facts and calls Order through `BILL_MARK_PAID`; Order marks the bill `PAID`, closes the active session, and requests Catalog table status `CLEANING`.
- Payment totals come from the Order bill snapshot. Payment persists `rawTotal`, `roundedTotal`, and `roundingDelta`; the rounding rule is represented on the bill snapshot and reused by Payment.
- VietQR references use `QRTBL` plus the first eight non-dash characters of `billId`, uppercased. On unique collision, Payment retries with the next eight characters.
- Creating a VietQR payment is idempotent for a pending bill: an existing `PENDING` payment is reused instead of creating a second row.
- Cash settlement is staff-confirmed. Staff must provide `amountReceived >= roundedTotal`; Payment stores the received amount, change, method `CASH`, status `PAID`, and completion audit.
- VietQR settlement is webhook-confirmed. Underpaid transfers keep payment `PENDING` and record `SEPAY_WEBHOOK_UNDERPAID`; sufficient or overpaid transfers mark `PAID`, store actual `paidAmount`, and do not create an automatic refund for the difference.
- Duplicate SePay transaction IDs, webhook events after payment is already terminal, and unmatched/non-incoming payloads do not create a second settlement. Matched duplicates/after-paid cases are audited; unmatched/non-incoming cases are application logs only.
- Refund is manual full refund only. A paid payment can have at most one active or confirmed refund; request moves payment to `REFUND_PENDING`, staff confirmation moves refund to `CONFIRMED` and payment to `REFUNDED`.
- Realtime payment events are hints for UI invalidation/refetch. Polling and canonical BFF/Order/Payment reads remain the source of truth.

## Final Business Behavior

Customer payment starts from the current table session. The Customer PWA can request the bill only after the cart is empty and non-canceled bill orders are served. Order moves the bill from `OPEN` to `PENDING_PAYMENT`, locks the cart, creates the service request, and moves the table to billing. While the bill is pending payment, the customer cannot place more orders from that session.

For VietQR, Customer PWA or staff creates/reuses a pending payment for the bill. The UI shows the bank account, bank name, bill reference, rounded amount, and SePay QR image URL. The customer transfers with the `QRTBL...` reference; the payment remains `PENDING` until a matching webhook with enough money is processed.

For cash, staff uses the POS bill settlement panel, enters received VND, sees change calculated client-side, and confirms. Payment marks the payment paid and emits completion; Order then finalizes the bill/session/table. If Order finalization is temporarily unavailable, Payment still persists `PAID` and writes the outbox event so the Order consumer can apply `payment.completed`.

When a payment completes by cash or VietQR, the bill is treated as immutable. Order records `paymentId`, `paymentMethod`, and `paidAt`; the session closes; the table moves to cleaning. Customer PWA and POS/Dashboard observe the result by refetching bill/payment state, with websocket events only accelerating the refresh.

Refunds do not reopen the bill and do not transfer money automatically. Owner/Manager creates a refund request with a reason and optional customer bank details, performs the external transfer manually, then confirms the refund in the Dashboard. Payment records audit entries and emits `payment.refunded`.

## Final Technical Behavior

Service boundaries after Phase 3:

- BFF owns HTTP routing, request validation, auth/permission guards, customer session scoping, raw webhook response shape, and forwarding to TCP services.
- Payment Service owns payment persistence, SePay reference extraction, QR URL creation, cash/VietQR settlement transactions, duplicate handling, audit rows, refund rows, payment history, and payment outbox publishing.
- Order Service owns bill snapshots, bill request rules, `BILL_MARK_PAID`, idempotent paid-bill handling, session close, and Catalog table status updates.
- Catalog owns final table state; BFF realtime owns websocket emission and query invalidation hints.

Implemented HTTP surfaces include:

- Staff BFF: `POST /payment/vietqr/create-qr`, `POST /payment/cash/confirm`, `GET /payment/history`, `POST /payment/refund/request`, `POST /payment/refund/confirm`.
- Customer BFF: `POST /customer/bill/request`, `GET /customer/bill/current`, `POST /customer/payment/vietqr/create-qr`.
- SePay webhook routes (BFF global prefix `api/v1`): direct Phase 3 `POST /api/v1/payment/sepay/webhook` (HMAC raw body, raw `{ "success": true }` response); Phase 4B tenant `POST /api/v1/payment/sepay/webhook/:tenantSlug` (Tier 1 `QRTBL`, secret per tenant); platform `POST /api/v1/payment/sepay/webhook/platform` (Tier 2 `QRSUB`). See [sepay-configuration-guide-phase3.md](../guides/sepay-configuration-guide-phase3.md) §0.

Implemented TCP/event contracts include:

- Payment TCP: `CREATE_VIETQR`, `CONFIRM_CASH`, `HANDLE_SEPAY_WEBHOOK`, `REFUND_REQUEST`, `REFUND_CONFIRM`, `GET_HISTORY`, `GET_STATUS`.
- Order TCP: `BILL_GET_PAYMENT_SNAPSHOT` and `BILL_MARK_PAID`.
- Kafka: Payment outbox publishes `payment.completed` and `payment.refunded`; Order consumes `payment.completed` and maps it back to `BILL_MARK_PAID`; BFF realtime consumes `payment.completed`, enriches with session data from Order, and emits `events.paymentCompleted`.

Persistence and idempotency behavior:

- `payments` has unique tenant/bill protection, unique bill reference protection, and unique non-null SePay transaction ID protection.
- Payment settlement uses database transactions and row-level locking around cash confirmation and webhook settlement.
- `createVietQr` reuses an existing pending payment; webhook duplicates do not settle again; `BillService.markPaid` is idempotent for already-paid bills.
- Payment records audit actions for payment creation, cash confirmation, webhook received/duplicate/underpaid/after-paid, payment completed, refund requested, and refund confirmed.

UI behavior implemented:

- Customer PWA `/request-payment` renders bill state, blocks ordering when the bill is `PENDING_PAYMENT`, creates VietQR for the current session bill, displays QR/reference/amount, and shows the paid state after refetch.
- POS `/pos/bills` lists `PENDING_PAYMENT` bills and shows the settlement panel with cash and VietQR tabs; `/pos/payment` redirects to `/pos/bills`.
- Dashboard `/dashboard/orders` shows recent paid payments and exposes manual refund request/confirm actions.

## Acceptance Evidence

Implementation and stabilization evidence for Phase 3 includes:

- Payment service tests cover VietQR creation/reuse, tenant payment settings fallback, bill reference extraction/collision fallback, underpaid webhook behavior, duplicate webhook behavior, after-paid webhook behavior, overpaid settlement, cash settlement, and persistence when Order finalization is temporarily unavailable.
- Refund service tests cover full refund amount selection, duplicate refund prevention, request transition to `REFUND_PENDING`, confirm transition to `REFUNDED`, audit, and `payment.refunded` outbox creation.
- BFF payment tests cover SePay webhook DTO validation, raw success response, HMAC verification helper behavior, and bounded Payment TCP timeout.
- Order payment consumer tests cover parsing `payment.completed`, validating method/amount, and mapping Kafka events back to `BillService.markPaid`.
- BFF realtime bridge tests cover consuming `payment.completed`, loading the Order bill snapshot for `sessionId`, and emitting the customer/staff payment completion event.
- Customer PWA and management-app component/service tests cover request-payment UI, VietQR display, POS cash/VietQR settlement panel behavior, payment history calls, and refund controls.
- Optional Playwright smoke exists for Customer PWA payment screen, POS cash/VietQR tabs, and Dashboard refund visibility when the local dev stack and credentials are available.
- Recorded post-payment verification confirmed the payment/order regression path with `payment` and `order` test projects and documented that email receipt/notification delivery is outside Phase 3.

## Handoff / Deferred Work

- Live SePay provider validation still requires public BFF URLs, registered webhook settings, real/sandbox banking credentials, and a final decision on whether production Tier 1 webhooks use the direct HMAC route or the tenant-scoped `x-secret-key` route.
- Email receipt delivery, durable customer/staff notifications, and notification-service integration are deferred to Phase 4C.
- Split bill, partial refund, automated refund payout, daily bank reconciliation, webhook replay dashboard, and multi-gateway routing are out of Phase 3 scope.
- Siner saga/compensation for rare cases where Payment is `PAID` but Order finalization repeatedly fails belongs to later hardening. The implemented baseline is Payment outbox plus Order consumer/idempotent `BILL_MARK_PAID`.
- Tenant payment settings, SePay OAuth Connect, and two-tier platform subscription payment behavior are recorded in the Phase 4B SaaS onboarding record, not this Phase 3 record.
