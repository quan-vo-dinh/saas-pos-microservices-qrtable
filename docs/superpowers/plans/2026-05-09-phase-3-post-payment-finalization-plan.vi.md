# Phase 3 Post-Payment Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khép kín "hậu thanh toán" cho QRTable: tiền mặt/VietQR PAID phải đồng bộ thành Bill PAID, session đóng, table sang Cleaning, PWA/POS/management-app nhìn thấy trạng thái đúng bằng polling baseline và có realtime hint an toàn.

**Architecture:** Payment Service vẫn là source of truth cho payment records và outbox `payment.completed`; Order Service vẫn sở hữu bill/session và là nơi finalization nghiệp vụ. Catalog Service vẫn sở hữu trạng thái bàn; Order gọi Catalog TCP để chuyển `billing -> cleaning`. Frontend lấy correctness từ refetch/polling; WebSocket chỉ là hint để invalidate query, không là nguồn dữ liệu chuẩn.

**Tech Stack:** Nx monorepo, NestJS TCP/Kafka, TypeORM/PostgreSQL, Redis cart/session cache, React Query, Socket.io, Jest.

---

## 0. Phạm Vi Và Quyết Định Nghiệp Vụ

### In scope

- Payment completion finalizes Order domain:
  - `BillStatus.PENDING_PAYMENT -> PAID`
  - `SessionStatus.ACTIVE -> CLOSED`
  - Catalog table status `billing -> cleaning`
  - active Redis session/cart không còn nhận mutation
- Customer PWA:
  - create/reuse VietQR for the session-owned pending bill
  - render VietQR image plus copyable transfer details on the customer's phone: bank, account, amount, bill reference
  - poll current bill while waiting payment
  - render clear paid/success state
  - keep read-only bill view working after backend closes session
- Management app:
  - payment panel invalidates bills, payment history, tables
  - table map can show `cleaning`
  - staff can mark `cleaning -> available`
- Realtime hint:
  - BFF consumes `payment.completed`
  - enriches with Order bill snapshot
  - emits `events.paymentCompleted` to customer session and tenant staff rooms
- Guard against reopen/payment race:
  - staff cannot reopen a bill once a Payment row for that bill is `PENDING`, `PAID`, `REFUND_PENDING`, or `REFUNDED`

### Out of scope

- Notification email receipt. That remains Phase 4C.
- Durable notification pipeline for customer/staff (SMTP, retry, audit log, Notification Service database). Phase 3 only handles in-app state feedback via polling/realtime hints.
- Distributed saga compensation beyond local idempotency. Phase 4A can harden this after the happy path is correct.
- Auto-mark `cleaning -> available`. Staff action remains required.
- Split bill, partial payment, external refund automation.

### Canonical State After This Plan

```txt
Customer request bill:
  Bill OPEN -> PENDING_PAYMENT
  Cart ACTIVE -> LOCKED
  Table occupied -> billing

Cash or VietQR completed:
  Payment PENDING/none -> PAID
  Bill PENDING_PAYMENT -> PAID
  Session ACTIVE -> CLOSED
  Table billing -> cleaning
  Cart/session mutations rejected

Staff cleans table:
  Table cleaning -> available
```

---

## 1. File Structure

### Backend: Order Service

- Modify `apps/order/src/app/modules/order/services/bill.service.ts`
  - Turn `markPaid()` into the single post-payment finalization command.
  - Add transaction lock for bill/session.
  - Call `SessionService.closeAfterPayment()`.
  - Call Catalog `TABLE.UPDATE_STATUS` with `TABLE_STATUS.CLEANING`.

- Modify `apps/order/src/app/modules/order/services/session.service.ts`
  - Add durable close method that marks session closed and removes Redis active session/cart keys.
  - Add read-only resolver for closed sessions so bill view can still load after payment.

- Modify `apps/order/src/app/modules/order/services/cart.service.ts`
  - Add read-only snapshot method that does not require active session.
  - Return an empty `LOCKED` cart for closed sessions if Redis cart is already gone.

- Modify `apps/order/src/app/modules/order/repositories/session.repository.ts`
  - Add `findByIdAndTenantForUpdate()`.

- Test `apps/order/src/app/modules/order/tests/bill.service.spec.ts`
  - Cover paid finalization, idempotency, closed-session bill read.

### Backend: BFF

- Modify `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
  - Add `emitPaymentCompleted()`.

- Modify `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`
  - Subscribe to `payment.completed`.
  - Enrich event with Order `BILL_GET_PAYMENT_SNAPSHOT`.
  - Emit to session customer room and tenant staff room.

- Modify `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`
  - Before `reopenBill`, load current bill and check Payment history.
  - Reject reopen when a payment attempt exists in active/terminal financial states.

- Modify `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`
  - Add a customer/session-scoped VietQR endpoint that resolves the current bill from Order before calling Payment.
  - Verify the bill belongs to the active customer session and is `PENDING_PAYMENT`.

- Test `apps/bff/src/app/modules/realtime/tests/realtime-kafka-bridge.service.spec.ts`
  - Cover bridge parsing/enrichment/emission for `payment.completed`.

- Test `apps/bff/src/app/modules/order/controllers/staff-order.controller.spec.ts`
  - Cover reopen rejection when Payment history has PENDING or PAID payment.

### Backend: Payment Service Contracts

- Modify `libs/interfaces/src/lib/tcp/payment/payment-response.interface.ts`
  - Extend `CreateVietQrTcpResponse` with `bankAccount` and `bankName`.

- Modify `libs/interfaces/src/lib/gateway/payment/payment-response.dto.ts`
  - Mirror `bankAccount` and `bankName` for HTTP response typing.

- Modify `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
  - Include configured SePay bank/account in `createVietQr()` response.

### Shared Types

- Modify `libs/shared/types/src/lib/realtime-events.types.ts`
  - Add `PaymentCompletedRealtimeEvent`.
  - Export it from the package barrel if needed.

### Customer PWA

- Modify `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
  - Poll current bill every 3s while bill is `PENDING_PAYMENT` or cart is `LOCKED`.
  - Stop polling when bill is `PAID`.

- Modify `apps/customer-pwa/src/features/payment/services/payment.service.ts`
  - Add `createVietQrForCurrentBill()` for the customer endpoint.

- Modify `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts`
  - Listen for `events.paymentCompleted` and invalidate bill/order scope.

- Modify `apps/customer-pwa/src/pages/request-payment-page.tsx`
  - Show a "Thanh toán bằng VietQR" action after bill enters `PENDING_PAYMENT`.
  - Render QR image, amount, and bill reference in the customer PWA.
  - Render clear "Thanh toán thành công" UI for `BillStatus.PAID`.
  - Keep a user-controlled "Rời phiên" action instead of auto-clearing session immediately.

- Test `apps/customer-pwa/src/features/order/hooks/use-order-query.spec.tsx`
  - Cover refetch interval behavior.

- Test `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.spec.tsx`
  - Cover payment completed event invalidation.

- Test `apps/customer-pwa/src/pages/request-payment-page.spec.tsx`
  - Cover paid success rendering.

### Management App

- Modify `apps/management-app/src/features/payment/components/bill-settlement-panel.tsx`
  - Invalidate bill list, payment history, and table list after cash confirmation.
  - When history turns PAID for the selected bill, invalidate bills and tables once.

- Modify `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts`
  - Listen for `events.paymentCompleted`; invalidate orders, bills, tables, payment history.

- Modify `apps/management-app/src/features/order/hooks/use-bill-query.ts`
  - Keep existing 10s fallback polling.
  - Do not reduce interval until realtime bridge is verified.

- Test `apps/management-app/src/features/payment/components/__tests__/bill-settlement-panel.spec.tsx`
  - Cover invalidation on cash and on history PAID.

- Test `apps/management-app/src/features/order/hooks/use-staff-order-realtime.spec.tsx`
  - Cover payment completed invalidation.

### Docs

- Modify `docs/phases/phase-3-payment.md`
  - Update safe-refactor note: post-payment finalization now implemented.
  - Keep Kafka->BFF realtime described as hint/fallback, not source of truth.

- Modify `docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md`
  - Update D4 from "separate Order settlement task" to "implemented by this follow-up plan".

---

## 2. Task 1: Order Domain Finalization Tests

**Files:**

- Modify: `apps/order/src/app/modules/order/tests/bill.service.spec.ts`
- Modify: `apps/order/src/app/modules/order/tests/session.service.spec.ts`

- [ ] **Step 1: Add BillService finalization test fixtures**

Add these mock methods to the BillService test setup:

```ts
const sessionRepository = {
  findActiveByIdAndTenant: jest.fn(),
  findByIdAndTenant: jest.fn(),
  findByIdAndTenantForUpdate: jest.fn(),
  markClosed: jest.fn(),
};

const sessionService = {
  getActiveSessionOrThrow: jest.fn(),
  closeAfterPayment: jest.fn(),
  getSessionForReadOnlyBill: jest.fn(),
};
```

Ensure the existing `catalogClient.send` mock still returns a successful response for `TABLE.UPDATE_STATUS`:

```ts
catalogClient.send.mockReturnValue(of({ statusCode: 200, data: { id: 'table-1', status: 'cleaning' } }));
```

- [ ] **Step 2: Add failing test for `markPaid()` finalizing bill/session/table**

Add to `describe('markPaid')`:

```ts
it('marks bill PAID, closes session, and moves table billing -> cleaning', async () => {
  const now = new Date('2026-05-08T11:00:00.000Z');
  const pending = {
    id: 'bill-1',
    tenantId: 't1',
    sessionId: 'sess-1',
    orderIds: ['order-1'],
    status: BillStatus.PENDING_PAYMENT,
    subtotal: 100_000,
    total: 100_000,
    roundingAmount: 0,
    paymentMethod: null,
    paymentId: null,
    closedAt: now,
    paidAt: null,
    createdAt: now,
    updatedAt: now,
  } as Bill;
  const session = {
    id: 'sess-1',
    tenantId: 't1',
    tableId: 'table-1',
    tableName: 'Bàn 1',
    status: SessionStatus.ACTIVE,
    currentBillId: 'bill-1',
  } as Session;

  billRepository.findByIdAndTenant.mockResolvedValue(pending);
  dataSource.transaction.mockImplementation(async (fn: (manager: EntityManager) => Promise<unknown>) =>
    fn(manager as EntityManager),
  );
  billRepository.findByIdAndTenantForUpdate.mockResolvedValue(pending);
  sessionRepository.findByIdAndTenantForUpdate.mockResolvedValue(session);
  billRepository.save.mockImplementation(async (b: Bill) => b);
  sessionService.closeAfterPayment.mockResolvedValue(undefined);

  const result = await service.markPaid({
    tenantId: 't1',
    billId: 'bill-1',
    paymentId: 'pay-1',
    method: 'VIETQR',
    paidAt: '2026-05-08T12:00:00.000Z',
    processId: 'proc-1',
  });

  expect(result.bill.status).toBe(BillStatus.PAID);
  expect(result.bill.paymentId).toBe('pay-1');
  expect(sessionService.closeAfterPayment).toHaveBeenCalledWith('t1', 'sess-1', expect.any(Date));
  expect(catalogClient.send).toHaveBeenCalledWith(
    TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS,
    expect.objectContaining({
      tenantId: 't1',
      data: expect.objectContaining({
        id: 'table-1',
        tenantId: 't1',
        status: TABLE_STATUS.CLEANING,
        sessionId: 'sess-1',
      }),
    }),
  );
});
```

Expected failure before implementation: `sessionRepository.findByIdAndTenantForUpdate is not a function` or `closeAfterPayment` not called.

- [ ] **Step 3: Add failing test for idempotent duplicate paid event**

Update the existing duplicate PAID test to assert no session close or Catalog call:

```ts
expect(sessionService.closeAfterPayment).not.toHaveBeenCalled();
expect(catalogClient.send).not.toHaveBeenCalled();
```

Expected: this should continue to pass after implementation.

- [ ] **Step 4: Add failing SessionService test for `closeAfterPayment()`**

Add to `apps/order/src/app/modules/order/tests/session.service.spec.ts`:

```ts
it('closes durable session and removes active Redis session/cart keys after payment', async () => {
  await service.closeAfterPayment('t1', 'sess-1', new Date('2026-05-08T12:00:00.000Z'));

  expect(sessionRepo.markClosed).toHaveBeenCalledWith('sess-1', 't1', new Date('2026-05-08T12:00:00.000Z'));
  expect(redis.del).toHaveBeenCalledWith('session:t1:sess-1');
  expect(redis.del).toHaveBeenCalledWith('cart:t1:sess-1');
});
```

- [ ] **Step 5: Run failing backend tests**

Run:

```bash
npx nx test order --runInBand --testFile=apps/order/src/app/modules/order/tests/bill.service.spec.ts
npx nx test order --runInBand --testFile=apps/order/src/app/modules/order/tests/session.service.spec.ts
```

Expected: new tests fail for missing finalization methods/calls.

---

## 3. Task 2: Implement Order Finalization

**Files:**

- Modify: `apps/order/src/app/modules/order/repositories/session.repository.ts`
- Modify: `apps/order/src/app/modules/order/services/session.service.ts`
- Modify: `apps/order/src/app/modules/order/services/cart.service.ts`
- Modify: `apps/order/src/app/modules/order/services/bill.service.ts`

- [ ] **Step 1: Add `findByIdAndTenantForUpdate()` to SessionRepository**

Add:

```ts
findByIdAndTenantForUpdate(id: string, tenantId: string, manager: EntityManager): Promise<Session | null> {
  return manager
    .getRepository(Session)
    .createQueryBuilder('s')
    .setLock('pessimistic_write')
    .where('s.id = :id', { id })
    .andWhere('s.tenantId = :tenantId', { tenantId })
    .getOne();
}
```

Import `EntityManager` from `typeorm`.

- [ ] **Step 2: Add SessionService close/read-only methods**

Add public methods:

```ts
async closeAfterPayment(tenantId: string, sessionId: string, closedAt: Date): Promise<void> {
  await this.sessionRepository.markClosed(sessionId, tenantId, closedAt);
  const redis = this.redisClient.getClient();
  await redis.del(this.sessionKey(tenantId, sessionId));
  await redis.del(`cart:${tenantId}:${sessionId}`);
}

async getSessionForReadOnlyBill(tenantId: string, sessionId: string): Promise<Session> {
  const session =
    (await this.sessionRepository.findActiveByIdAndTenant(sessionId, tenantId)) ??
    (await this.sessionRepository.findByIdAndTenant(sessionId, tenantId));
  if (!session) {
    throw new BusinessException(ErrorCode.SESSION_CLOSED, HttpStatus.GONE);
  }
  return session;
}
```

- [ ] **Step 3: Add CartService read-only snapshot**

Add:

```ts
async getReadOnlySnapshot(tenantId: string, sessionId: string): Promise<CartSnapshot> {
  const redis = this.redisClient.getClient();
  const snapshot = await this.loadSnapshot(redis, tenantId, sessionId);
  return {
    ...snapshot,
    status: snapshot.status === 'ACTIVE' ? 'LOCKED' : snapshot.status,
  };
}
```

This method intentionally skips `getActiveSessionOrThrow()` so customer bill view can still render after payment closes the session.

- [ ] **Step 4: Rewrite `BillService.getCurrentBill()` to allow read-only paid bill**

Replace the active-only first lines with:

```ts
const session = await this.sessionService.getSessionForReadOnlyBill(dto.tenantId, dto.sessionId);
const cart =
  session.status === SessionStatus.ACTIVE
    ? await this.cartService.getSnapshot(dto.tenantId, dto.sessionId)
    : await this.cartService.getReadOnlySnapshot(dto.tenantId, dto.sessionId);
if (!session.currentBillId) {
  return { bill: null, cart };
}
const bill = await this.billRepository.findByIdAndTenant(session.currentBillId, dto.tenantId);
return { bill: bill ? this.toBillDto(bill) : null, cart };
```

Import `SessionStatus` from `@einvoice/types`.

- [ ] **Step 5: Rewrite `BillService.markPaid()`**

Replace current method body with:

```ts
const existing = await this.billRepository.findByIdAndTenant(dto.billId, dto.tenantId);
if (!existing) {
  throw new BusinessException(ErrorCode.BILL_NOT_FOUND, HttpStatus.NOT_FOUND);
}
if (existing.status === BillStatus.PAID) {
  return { bill: this.toBillDto(existing) };
}
if (existing.status !== BillStatus.PENDING_PAYMENT) {
  throw new BusinessException(ErrorCode.BILL_NOT_PENDING_PAYMENT, HttpStatus.CONFLICT);
}

const paidAt = new Date(dto.paidAt);
const { bill, session } = await this.dataSource.transaction(async (manager) => {
  const lockedBill = await this.billRepository.findByIdAndTenantForUpdate(dto.billId, dto.tenantId, manager);
  if (!lockedBill) {
    throw new BusinessException(ErrorCode.BILL_NOT_FOUND, HttpStatus.NOT_FOUND);
  }
  if (lockedBill.status === BillStatus.PAID) {
    const paidSession = await this.sessionRepository.findByIdAndTenant(lockedBill.sessionId, dto.tenantId);
    return { bill: lockedBill, session: paidSession };
  }
  if (lockedBill.status !== BillStatus.PENDING_PAYMENT) {
    throw new BusinessException(ErrorCode.BILL_NOT_PENDING_PAYMENT, HttpStatus.CONFLICT);
  }

  const lockedSession = await this.sessionRepository.findByIdAndTenantForUpdate(
    lockedBill.sessionId,
    dto.tenantId,
    manager,
  );
  if (!lockedSession) {
    throw new BusinessException(ErrorCode.SESSION_CLOSED, HttpStatus.GONE);
  }

  lockedBill.status = BillStatus.PAID;
  lockedBill.paymentId = dto.paymentId;
  lockedBill.paymentMethod = dto.method as PaymentMethod;
  lockedBill.paidAt = paidAt;
  await manager.save(Bill, lockedBill);

  return { bill: lockedBill, session: lockedSession };
});

if (session?.status === SessionStatus.ACTIVE) {
  await this.sessionService.closeAfterPayment(dto.tenantId, session.id, paidAt);
}

if (session) {
  await this.callCatalogUpdateTableStatus({
    id: session.tableId,
    tenantId: dto.tenantId,
    status: TABLE_STATUS.CLEANING,
    sessionId: session.id,
  });
}

return { bill: this.toBillDto(bill) };
```

Add imports:

```ts
import { SessionStatus } from '@einvoice/types';
```

- [ ] **Step 6: Run backend tests**

Run:

```bash
npx nx test order --runInBand --testFile=apps/order/src/app/modules/order/tests/bill.service.spec.ts
npx nx test order --runInBand --testFile=apps/order/src/app/modules/order/tests/session.service.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit backend finalization**

Run:

```bash
git add apps/order/src/app/modules/order
git commit -m "feat(order): finalize bill after payment"
```

---

## 4. Task 3: Protect Reopen Bill From Payment Race

**Files:**

- Modify: `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`
- Modify: `apps/bff/src/app/modules/order/controllers/staff-order.controller.spec.ts`

- [ ] **Step 1: Inject Payment TCP client into StaffOrderController**

Add constructor dependency:

```ts
@Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient,
```

- [ ] **Step 2: Add private helper to load current bill**

Add:

```ts
private async getCurrentBillForSession(req: Request, processId: string, tenantId: string, sessionId: string) {
  const tcp = await firstValueFrom(
    this.orderClient
      .send<BillCurrentTcpResponse, BillSessionTcpRequest>(
        TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT,
        buildTcpRequestContext<BillSessionTcpRequest>(req, processId, { tenantId, sessionId }),
      )
      .pipe(map((r) => r)),
  );
  return tcp.data?.bill ?? null;
}
```

Import `BillCurrentTcpResponse`.

- [ ] **Step 3: Add private helper to detect active payment attempt**

Add:

```ts
private async billHasBlockingPayment(req: Request, processId: string, tenantId: string, billId: string) {
  const tcp = await firstValueFrom(
    this.paymentClient
      .send<PaymentHistoryTcpResponse, PaymentHistoryTcpRequest>(
        TCP_REQUEST_MESSAGE.PAYMENT.GET_HISTORY,
        buildTcpRequestContext<PaymentHistoryTcpRequest>(req, processId, { tenantId, billId }),
      )
      .pipe(map((r) => r)),
  );
  return (tcp.data ?? []).some((p) =>
    ['PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED'].includes(String(p.status)),
  );
}
```

Import `PaymentHistoryTcpRequest` and `PaymentHistoryTcpResponse`.

- [ ] **Step 4: Reject reopen when payment attempt exists**

At the top of `reopenBill()` after `tenantId` and `userId` are resolved:

```ts
const currentBill = await this.getCurrentBillForSession(req, processId, tenantId, sessionId);
if (currentBill && (await this.billHasBlockingPayment(req, processId, tenantId, currentBill.id))) {
  throw new ConflictException('Bill already has an active payment attempt');
}
```

Import `ConflictException` from `@nestjs/common`.

- [ ] **Step 5: Add controller tests**

Add one test with Payment history PENDING:

```ts
it('rejects reopen when bill has pending payment attempt', async () => {
  orderClient.send.mockImplementation((pattern: string) => {
    if (pattern === TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT) {
      return of({ statusCode: 200, data: { bill: { id: 'bill-1', status: BillStatus.PENDING_PAYMENT } } });
    }
    return of({ statusCode: 200, data: {} });
  });
  paymentClient.send.mockReturnValue(
    of({ statusCode: 200, data: [{ id: 'pay-1', billId: 'bill-1', status: 'PENDING' }] }),
  );

  await expect(controller.reopenBill('sess-1', 'proc-1', req)).rejects.toBeInstanceOf(ConflictException);
});
```

Add another with empty history and assert Order `BILL_REOPEN` is called.

- [ ] **Step 6: Run BFF order controller tests**

Run:

```bash
npx nx test bff --runInBand --testFile=apps/bff/src/app/modules/order/controllers/staff-order.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit reopen protection**

Run:

```bash
git add apps/bff/src/app/modules/order/controllers/staff-order.controller.ts apps/bff/src/app/modules/order/controllers/staff-order.controller.spec.ts
git commit -m "fix(payment): prevent reopening bills with payment attempts"
```

---

## 5. Task 4: Shared Realtime Payment Event Contract

**Files:**

- Modify: `libs/shared/types/src/lib/realtime-events.types.ts`
- Modify: package barrel if exports require it, usually `libs/shared/types/src/index.ts`

- [ ] **Step 1: Add event type**

Add under BFF Direct events:

```ts
export type PaymentCompletedRealtimeEvent = {
  eventId: string;
  eventType: 'payment.completed';
  tenantId: string;
  sessionId: string;
  billId: string;
  paymentId: string;
  method: 'CASH' | 'VIETQR';
  status: 'PAID';
  paidAt: string;
  amount: number;
  correlationId?: string;
};
```

- [ ] **Step 2: Update header comment**

Add `PaymentCompletedRealtimeEvent` to the BFF/Kafka bridge description:

```ts
 *   - PaymentCompletedRealtimeEvent -> Kafka bridge hint after Payment outbox event
```

- [ ] **Step 3: Type-check shared types**

Run:

```bash
npx nx test shared-types --runInBand
```

If the project name differs, run:

```bash
npx nx show projects | rg "shared.*types|types"
```

Then run the matching test/build target.

- [ ] **Step 4: Commit shared contract**

Run:

```bash
git add libs/shared/types/src
git commit -m "feat(types): add payment completed realtime event"
```

---

## 6. Task 5: BFF Kafka Bridge For `payment.completed`

**Files:**

- Modify: `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- Modify: `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts`
- Modify: `apps/bff/src/app/modules/realtime/tests/realtime-kafka-bridge.service.spec.ts`

- [ ] **Step 1: Add emit method**

In `RealtimeEventsService`, import `PaymentCompletedRealtimeEvent` and add:

```ts
emitPaymentCompleted(event: PaymentCompletedRealtimeEvent): void {
  this.gateway.emitToRoom(`session:${event.sessionId}:customer`, 'events.paymentCompleted', event);
  this.gateway.emitToRoom(`tenant:${event.tenantId}:staff`, 'events.paymentCompleted', event);
}
```

- [ ] **Step 2: Inject Order TCP client into bridge**

Add constructor:

```ts
constructor(
  private readonly realtime: RealtimeEventsService,
  @Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient,
) {}
```

Add imports:

```ts
import { Inject } from '@nestjs/common';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { BillPaymentSnapshotTcpRequest } from '@common/interfaces/tcp/order/order-request.interface';
import type { BillPaymentSnapshotTcpResponse } from '@common/interfaces/tcp/order/order-response.interface';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import { firstValueFrom } from 'rxjs';
```

- [ ] **Step 3: Subscribe to both Kafka topics**

Replace single subscribe:

```ts
await consumer.subscribe({ topic: kafkaConfig.KITCHEN_SLA_WARNING_TOPIC, fromBeginning: false });
```

with:

```ts
await consumer.subscribe({ topic: kafkaConfig.KITCHEN_SLA_WARNING_TOPIC, fromBeginning: false });
await consumer.subscribe({ topic: kafkaConfig.PAYMENT_COMPLETED_TOPIC, fromBeginning: false });
```

- [ ] **Step 4: Route messages by event type**

Inside `eachMessage`, after JSON parse:

```ts
if (event.eventType === 'kitchen.sla_warning') {
  this.realtime.emitKitchenSlaWarning(event as KitchenSlaWarningEvent);
  return;
}

if (event.eventType === 'payment.completed') {
  await this.emitPaymentCompleted(
    event as {
      eventId: string;
      tenantId: string;
      billId: string;
      paymentId: string;
      method: 'CASH' | 'VIETQR';
      amount: number;
      paidAt: string;
      correlationId?: string;
    },
  );
}
```

- [ ] **Step 5: Add bridge enrichment helper**

Add method:

```ts
private async emitPaymentCompleted(event: {
  eventId: string;
  tenantId: string;
  billId: string;
  paymentId: string;
  method: 'CASH' | 'VIETQR';
  amount: number;
  paidAt: string;
  correlationId?: string;
}): Promise<void> {
  const snapshot = await firstValueFrom(
    this.orderClient.send<BillPaymentSnapshotTcpResponse, BillPaymentSnapshotTcpRequest>(
      TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT,
      new Request<BillPaymentSnapshotTcpRequest>({
        tenantId: event.tenantId,
        processId: event.correlationId,
        data: { tenantId: event.tenantId, billId: event.billId },
      }),
    ),
  );
  const sessionId = snapshot.data?.sessionId;
  if (!sessionId) {
    this.logger.warn(`payment.completed bridge missing sessionId billId=${event.billId}`);
    return;
  }
  this.realtime.emitPaymentCompleted({
    eventId: event.eventId,
    eventType: 'payment.completed',
    tenantId: event.tenantId,
    sessionId,
    billId: event.billId,
    paymentId: event.paymentId,
    method: event.method,
    status: 'PAID',
    paidAt: event.paidAt,
    amount: event.amount,
    correlationId: event.correlationId,
  });
}
```

- [ ] **Step 6: Add bridge tests**

Mock Kafka message with payload:

```ts
{
  eventId: 'event-1',
  eventType: 'payment.completed',
  tenantId: 't1',
  billId: 'bill-1',
  paymentId: 'pay-1',
  method: 'VIETQR',
  amount: 128000,
  paidAt: '2026-05-08T12:00:00.000Z',
  correlationId: 'proc-1'
}
```

Mock Order TCP response:

```ts
of({
  statusCode: 200,
  data: {
    billId: 'bill-1',
    tenantId: 't1',
    sessionId: 'sess-1',
    status: 'PAID',
    rawTotal: 127500,
    roundedTotal: 128000,
    roundingDelta: 500,
  },
});
```

Assert:

```ts
expect(realtime.emitPaymentCompleted).toHaveBeenCalledWith(
  expect.objectContaining({
    tenantId: 't1',
    sessionId: 'sess-1',
    billId: 'bill-1',
    paymentId: 'pay-1',
    status: 'PAID',
  }),
);
```

- [ ] **Step 7: Run realtime tests**

Run:

```bash
npx nx test bff --runInBand --testFile=apps/bff/src/app/modules/realtime/tests/realtime-kafka-bridge.service.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit bridge**

Run:

```bash
git add apps/bff/src/app/modules/realtime libs/shared/types/src
git commit -m "feat(realtime): bridge payment completed events"
```

---

## 7. Task 6: Customer PWA Payment Sync UX

**Files:**

- Modify: `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`
- Modify: `apps/bff/src/app/modules/order/controllers/customer-order.controller.spec.ts`
- Modify: `apps/customer-pwa/src/features/payment/services/payment.service.ts`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts`
- Modify: `apps/customer-pwa/src/pages/request-payment-page.tsx`
- Modify/Create tests in `apps/customer-pwa/src/features/order/hooks/` and `apps/customer-pwa/src/pages/`

- [ ] **Step 1: Add customer-scoped BFF endpoint to create/reuse VietQR**

In `CustomerOrderController`, inject Payment TCP client:

```ts
@Inject(TCP_SERVICES.PAYMENT_SERVICE) private readonly paymentClient: TcpClient,
```

Add endpoint:

```ts
@Post('payment/vietqr/create-qr')
@ApiOkResponse({ type: ResponseDto })
@ApiOperation({ summary: 'Create or reuse VietQR for current session bill' })
async createCustomerVietQr(
  @ProcessId() processId: string,
  @Req() req: Request,
): Promise<ResponseDto<CreateVietQrTcpResponse>> {
  const tenantId = req[MetadataKey.TENANT_ID] as string;
  const sessionId = req[MetadataKey.SESSION_ID] as string;
  const currentBill = await firstValueFrom(
    this.orderClient
      .send<BillCurrentTcpResponse, BillSessionTcpRequest>(
        TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT,
        buildTcpRequestContext<BillSessionTcpRequest>(req, processId, { tenantId, sessionId }),
      )
      .pipe(map((r) => r)),
  );
  const bill = currentBill.data?.bill;
  if (!bill || bill.status !== BillStatus.PENDING_PAYMENT) {
    throw new ConflictException('Current bill is not pending payment');
  }

  const payload: CreateVietQrTcpRequest = {
    tenantId,
    billId: bill.id,
    userId: `customer-session:${sessionId}`,
    processId,
  };
  const tcp = await firstValueFrom(
    this.paymentClient
      .send<CreateVietQrTcpResponse, CreateVietQrTcpRequest>(
        TCP_REQUEST_MESSAGE.PAYMENT.CREATE_VIETQR,
        buildTcpRequestContext<CreateVietQrTcpRequest>(req, processId, payload),
      )
      .pipe(map((r) => r)),
  );
  return new ResponseDto<CreateVietQrTcpResponse>({
    data: tcp.data,
    statusCode: tcp.statusCode,
    message: tcp.code as HTTP_MESSAGE,
    processID: processId,
  });
}
```

Add imports:

```ts
import { ConflictException } from '@nestjs/common';
import { BillStatus } from '@einvoice/types';
import type { CreateVietQrTcpRequest, CreateVietQrTcpResponse } from '@common/interfaces/tcp/payment';
```

This keeps staff endpoint unchanged and avoids letting a customer submit arbitrary `billId`.

- [ ] **Step 2: Add BFF tests for customer VietQR endpoint**

In `customer-order.controller.spec.ts`, add:

```ts
it('creates VietQR only for current session pending bill', async () => {
  orderClient.send.mockImplementation((pattern: string) => {
    if (pattern === TCP_REQUEST_MESSAGE.ORDER.BILL_GET_CURRENT) {
      return of({
        statusCode: 200,
        data: {
          bill: { id: 'bill-1', tenantId: 't1', sessionId: 'sess-1', status: BillStatus.PENDING_PAYMENT },
          cart: {
            tenantId: 't1',
            sessionId: 'sess-1',
            status: 'LOCKED',
            cartVersion: 1,
            items: [],
            updatedAt: '2026-05-08T12:00:00.000Z',
          },
        },
      });
    }
    return of({ statusCode: 200, data: {} });
  });
  paymentClient.send.mockReturnValue(
    of({ statusCode: 200, data: { billId: 'bill-1', qrUrl: 'https://qr.sepay.vn/img?...' } }),
  );

  const result = await controller.createCustomerVietQr('proc-1', req);

  expect(result.data?.qrUrl).toContain('qr.sepay.vn');
  expect(paymentClient.send).toHaveBeenCalledWith(
    TCP_REQUEST_MESSAGE.PAYMENT.CREATE_VIETQR,
    expect.objectContaining({
      data: expect.objectContaining({ tenantId: 't1', billId: 'bill-1', userId: 'customer-session:sess-1' }),
    }),
  );
});

it('rejects customer VietQR when current bill is not pending payment', async () => {
  orderClient.send.mockReturnValue(
    of({ statusCode: 200, data: { bill: { id: 'bill-1', status: BillStatus.OPEN }, cart: null } }),
  );
  await expect(controller.createCustomerVietQr('proc-1', req)).rejects.toBeInstanceOf(ConflictException);
  expect(paymentClient.send).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Extend VietQR response with copyable transfer details**

In `libs/interfaces/src/lib/tcp/payment/payment-response.interface.ts`, change:

```ts
export type CreateVietQrTcpResponse = PaymentTcpResponse & {
  qrUrl: string;
};
```

to:

```ts
export type CreateVietQrTcpResponse = PaymentTcpResponse & {
  qrUrl: string;
  bankAccount: string;
  bankName: string;
};
```

In `libs/interfaces/src/lib/gateway/payment/payment-response.dto.ts`, add to `CreateVietQrResponseDto`:

```ts
bankAccount!: string;
bankName!: string;
```

In `PaymentSettlementService.createVietQr()`, return the QR config alongside `qrUrl`:

```ts
const qrConfig = this.getSepayQrConfig();
return {
  ...this.mapper.toPaymentResponse(persisted.payment),
  qrUrl: this.buildQrUrl(persisted.payment),
  bankAccount: qrConfig.account,
  bankName: qrConfig.bank,
};
```

For the existing PENDING reuse branch, use the same shape:

```ts
const qrConfig = this.getSepayQrConfig();
return {
  ...this.mapper.toPaymentResponse(existing),
  qrUrl: this.buildQrUrl(existing),
  bankAccount: qrConfig.account,
  bankName: qrConfig.bank,
};
```

- [ ] **Step 4: Add customer payment API client**

In `apps/customer-pwa/src/features/payment/services/payment.service.ts`, replace the current minimal service with:

```ts
import type { CreateVietQrPaymentResponse } from '@einvoice/types';
import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

export const paymentService = {
  requestBill: () =>
    customerApi<unknown>(API_CONFIG.ENDPOINTS.BILL_REQUEST, {
      method: 'POST',
    }),

  createVietQrForCurrentBill: () =>
    customerApi<CreateVietQrPaymentResponse>('/customer/payment/vietqr/create-qr', {
      method: 'POST',
    }),
};
```

If `CreateVietQrPaymentResponse` is not exported in shared types, define a local type:

```ts
export type CustomerVietQrResponse = {
  id: string;
  billId: string;
  billReference: string;
  qrUrl: string;
  bankAccount: string;
  bankName: string;
  roundedTotal: number;
  rawTotal: number;
  roundingDelta: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
};
```

- [ ] **Step 5: Add current bill polling while waiting**

In `useCurrentBillQuery()`, add:

```ts
refetchInterval: (query) => {
  const bill = query.state.data?.bill;
  const cart = query.state.data?.cart;
  if (bill?.status === BillStatus.PENDING_PAYMENT || cart?.status === 'LOCKED') {
    return 3000;
  }
  return false;
},
```

Import `BillStatus` from `@einvoice/types`.

- [ ] **Step 6: Listen for payment realtime hint**

In `useCustomerOrderRealtime()`, import `PaymentCompletedRealtimeEvent` and add handler:

```ts
const onPaymentCompleted = (event: PaymentCompletedRealtimeEvent): void => {
  if (event.tenantId !== tenantId || event.sessionId !== sessionId) return;
  invalidateSessionScope();
};
```

Register and cleanup:

```ts
socket.on('events.paymentCompleted', onPaymentCompleted);
socket.off('events.paymentCompleted', onPaymentCompleted);
```

- [ ] **Step 7: Render VietQR and paid success states**

In `RequestPaymentPage`, import customer payment service:

```ts
import { paymentService, type CustomerVietQrResponse } from '@/features/payment/services/payment.service';
```

Add local state:

```ts
const [vietQr, setVietQr] = useState<CustomerVietQrResponse | null>(null);
const [vietQrBusy, setVietQrBusy] = useState(false);
```

Add handler:

```ts
const onCreateVietQr = async (): Promise<void> => {
  if (!billPending || vietQrBusy) return;
  setVietQrBusy(true);
  try {
    const res = await paymentService.createVietQrForCurrentBill();
    setVietQr(res);
    toast.success('Đã tạo mã VietQR');
  } catch (err) {
    toast.error((err as Error).message || 'Không thể tạo mã VietQR.');
  } finally {
    setVietQrBusy(false);
  }
};
```

When `billPending`, render copyable transfer details and QR:

```tsx
<Button className="w-full" variant="secondary" onClick={() => void onCreateVietQr()} disabled={vietQrBusy}>
  {vietQrBusy ? 'Đang tạo mã…' : vietQr ? 'Làm mới mã VietQR' : 'Thanh toán bằng VietQR'}
</Button>;
{
  vietQr ? (
    <div className="rounded-lg border border-border/80 p-4">
      <p className="text-sm font-medium">Quét mã để chuyển khoản</p>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Ngân hàng</dt>
          <dd className="font-medium">{vietQr.bankName}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Số tài khoản</dt>
          <dd className="font-mono font-medium">{vietQr.bankAccount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Nội dung</dt>
          <dd className="font-mono font-medium">{vietQr.billReference}</dd>
        </div>
      </dl>
      <p className="mt-2 font-mono text-xl font-semibold tabular-nums">
        {new Intl.NumberFormat('vi-VN').format(vietQr.roundedTotal)} đ
      </p>
      <img src={vietQr.qrUrl} alt="VietQR" className="mt-3 max-h-72 w-full object-contain" />
      <p className="mt-2 text-xs text-muted-foreground">
        Nếu app ngân hàng không quét được QR trên cùng điện thoại, hãy nhập/copy đúng số tiền và nội dung chuyển khoản ở
        trên.
      </p>
    </div>
  ) : null;
}
```

Then derive:

In `RequestPaymentPage`, derive:

```ts
const billPaid = bill?.status === BillStatus.PAID;
```

Before regular return content, add paid UI:

```tsx
if (billPaid) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 p-4">
        <p className="text-sm font-medium text-emerald-700">Thanh toán thành công</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Hóa đơn đã được ghi nhận. Nhân viên sẽ dọn bàn và chuẩn bị cho lượt khách tiếp theo.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Tổng đã thanh toán</p>
        <p className="text-2xl font-bold tabular-nums">{new Intl.NumberFormat('vi-VN').format(total)} đ</p>
      </div>
      <Button variant="outline" onClick={() => navigate(ROUTES.LANDING)}>
        Kết thúc phiên
      </Button>
    </div>
  );
}
```

Do not call `endSession()` automatically; the customer may need the receipt view for a moment.

- [ ] **Step 8: Add PWA tests**

Add test for `useCurrentBillQuery` config:

```ts
it('polls current bill every 3s while pending payment', () => {
  const config = captureUseQueryConfigFromUseCurrentBillQuery();
  expect(
    config.refetchInterval({
      state: { data: { bill: { status: BillStatus.PENDING_PAYMENT }, cart: { status: 'LOCKED' } } },
    }),
  ).toBe(3000);
});
```

Add request page test:

```ts
it('renders paid success state', () => {
  mockUseCurrentBillQuery({
    bill: { status: BillStatus.PAID, total: 128000 },
    cart: { items: [], status: 'LOCKED' },
  });
  render(<RequestPaymentPage />);
  expect(screen.getByText('Thanh toán thành công')).toBeInTheDocument();
  expect(screen.getByText(/128.000/)).toBeInTheDocument();
});
```

Add QR rendering test:

```ts
it('creates and renders VietQR for pending bill', async () => {
  mockUseCurrentBillQuery({
    bill: { id: 'bill-1', status: BillStatus.PENDING_PAYMENT, total: 128000 },
    cart: { items: [], status: 'LOCKED' },
  });
  vi.spyOn(paymentService, 'createVietQrForCurrentBill').mockResolvedValue({
    id: 'pay-1',
    billId: 'bill-1',
    billReference: 'QRTBLB1A2C3D4',
    qrUrl: 'https://qr.sepay.vn/img?acc=1&amount=128000&des=QRTBLB1A2C3D4',
    bankAccount: '0010000000355',
    bankName: 'Vietcombank',
    roundedTotal: 128000,
    rawTotal: 127500,
    roundingDelta: 500,
    status: 'PENDING',
  });
  render(<RequestPaymentPage />);
  await userEvent.click(screen.getByRole('button', { name: /Thanh toán bằng VietQR/i }));
  expect(await screen.findByText(/QRTBLB1A2C3D4/)).toBeInTheDocument();
  expect(screen.getByText('0010000000355')).toBeInTheDocument();
  expect(screen.getByAltText('VietQR')).toHaveAttribute('src', expect.stringContaining('qr.sepay.vn'));
});
```

- [ ] **Step 9: Run PWA/BFF/payment tests/build**

Run:

```bash
npx nx test bff --runInBand --testFile=apps/bff/src/app/modules/order/controllers/customer-order.controller.spec.ts
npx nx test payment --runInBand --testFile=apps/payment/src/app/modules/payment/tests/payment.service.spec.ts
pnpm --dir apps/customer-pwa test -- --run
npx nx build customer-pwa
```

If the app has no `test` script, run:

```bash
npx nx build customer-pwa
```

Expected: PASS/build succeeds.

- [ ] **Step 10: Commit PWA sync**

Run:

```bash
git add libs/interfaces/src/lib/tcp/payment libs/interfaces/src/lib/gateway/payment apps/payment/src/app/modules/payment apps/bff/src/app/modules/order apps/customer-pwa/src
git commit -m "feat(customer-pwa): show VietQR payment flow"
```

---

## 8. Task 7: Management App Payment/Table Sync

**Files:**

- Modify: `apps/management-app/src/features/payment/components/bill-settlement-panel.tsx`
- Modify: `apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts`
- Modify: related tests

- [ ] **Step 1: Invalidate tables after cash confirmation**

Import:

```ts
import { tableKeys } from '@/features/tables/hooks/use-tables-query';
```

In the cash success `Promise.all`, include:

```ts
queryClient.invalidateQueries({ queryKey: tableKeys.all }),
```

Expected invalidations after cash:

```ts
await Promise.all([
  queryClient.invalidateQueries({ queryKey: billKeys.lists() }),
  queryClient.invalidateQueries({ queryKey: paymentQueryKeys.history(bill.id) }),
  queryClient.invalidateQueries({ queryKey: tableKeys.all }),
]);
```

- [ ] **Step 2: Invalidate bills/tables when selected bill history becomes PAID**

Add effect:

```ts
useEffect(() => {
  if (!paidFromHistory) return;
  void queryClient.invalidateQueries({ queryKey: billKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: tableKeys.all });
}, [paidFromHistory, queryClient]);
```

- [ ] **Step 3: Staff realtime listens for payment completed**

In `useStaffOrderRealtime()`, import:

```ts
import type { PaymentCompletedRealtimeEvent } from '@einvoice/types';
import { billKeys } from '@/features/order/hooks/use-bill-query';
import { paymentQueryKeys } from '@/features/payment/hooks/use-payment';
```

Add invalidation helper:

```ts
const invalidatePaymentState = (billId?: string): void => {
  void queryClient.invalidateQueries({ queryKey: billKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: tableKeys.all });
  void queryClient.invalidateQueries({ queryKey: paymentQueryKeys.history(billId) });
};
```

Add handler:

```ts
const onPaymentCompleted = (event: PaymentCompletedRealtimeEvent): void => {
  if (event.tenantId !== tenantId) return;
  invalidateOrders();
  invalidatePaymentState(event.billId);
};
```

Register and cleanup `events.paymentCompleted`.

- [ ] **Step 4: Add management tests**

In `bill-settlement-panel.spec.tsx`, assert cash success invalidates table keys:

```ts
expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: tableKeys.all });
```

In `use-staff-order-realtime.spec.tsx`, emit `events.paymentCompleted` from mocked socket and assert invalidations for:

```ts
billKeys.lists();
tableKeys.all;
paymentQueryKeys.history('bill-1');
```

- [ ] **Step 5: Run management tests/build**

Run:

```bash
npx nx test management-app --runInBand --testFile=apps/management-app/src/features/payment/components/__tests__/bill-settlement-panel.spec.tsx
npx nx test management-app --runInBand --testFile=apps/management-app/src/features/order/hooks/use-staff-order-realtime.spec.tsx
npx nx build management-app
```

Expected: PASS/build succeeds.

- [ ] **Step 6: Commit management sync**

Run:

```bash
git add apps/management-app/src
git commit -m "feat(management): sync post-payment table state"
```

---

## 9. Task 8: Backend Integration Verification

**Files:**

- Modify/Create: `apps/payment/src/app/modules/payment/tests/payment.service.spec.ts`
- Modify/Create: `apps/order/src/app/modules/order/tests/bill.service.spec.ts`

- [ ] **Step 1: Assert cash still persists payment if Order fast path fails**

Keep the existing test that confirms `confirmCash` persists PAID when `BILL_MARK_PAID` fails. Add assertion that outbox row exists:

```ts
expect(outboxRepo.createCompleted).toHaveBeenCalledWith(
  expect.anything(),
  expect.objectContaining({ status: 'PAID' }),
  expect.any(String),
);
```

- [ ] **Step 2: Assert SePay completion still calls Order**

Ensure existing SePay success test asserts:

```ts
expect(orderClient.send).toHaveBeenCalledWith(
  TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID,
  expect.objectContaining({
    data: expect.objectContaining({
      tenantId: 'tenant-1',
      billId: 'bill-1',
      paymentId: expect.any(String),
      method: 'VIETQR',
    }),
  }),
);
```

- [ ] **Step 3: Add Order payment consumer test for finalization path**

Mock `BillService.markPaid` in `PaymentEventsConsumerService` integration helper and assert it receives event mapped from Kafka:

```ts
expect(billService.markPaid).toHaveBeenCalledWith({
  tenantId: 't1',
  billId: 'b1',
  paymentId: 'p1',
  method: 'VIETQR',
  paidAt: '2026-05-08T12:00:00.000Z',
  processId: 'corr-1',
});
```

- [ ] **Step 4: Run payment and order suites**

Run:

```bash
npx nx test payment --runInBand
npx nx test order --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit verification tests**

Run:

```bash
git add apps/payment/src/app/modules/payment/tests apps/order/src/app/modules/order/tests
git commit -m "test(payment): cover post-payment finalization"
```

---

## 10. Task 9: End-To-End Manual Demo Script

**Files:**

- Modify/Create: `docs/superpowers/reports/2026-05-09-phase-3-post-payment-verification.md`

- [ ] **Step 1: Start backend services**

Run:

```bash
pnpm dev:bff-payment
```

Expected:

```txt
bff, payment, order, catalog serve targets running
```

- [ ] **Step 2: Start frontend apps**

In separate terminals:

```bash
npx nx serve customer-pwa
npx nx serve management-app
```

Expected:

```txt
customer-pwa on http://localhost:5173
management-app on http://localhost:3000
```

- [ ] **Step 3: Verify cash flow**

Manual script:

1. Customer scans/join table.
2. Customer submits order.
3. Staff confirms order.
4. KDS marks items ready; staff marks served.
5. Customer requests bill.
6. POS `/pos/bills` shows bill PENDING.
7. Staff confirms cash with amount >= total.
8. Expected:
   - Payment history row status `PAID`.
   - Bill leaves PENDING list.
   - Table map shows `cleaning`.
   - Customer PWA payment page shows "Thanh toán thành công".
   - QR scan for same table is blocked with cleaning message.
9. Staff marks table clean.
10. Expected:
    - Table status `available`.
    - New QR scan creates a new session.

- [ ] **Step 4: Verify VietQR webhook flow**

Manual script:

1. Customer requests bill.
2. Staff creates VietQR.
3. Simulate SePay webhook with valid `X-Secret-Key` and matching `QRTBL...` reference.
4. Expected:
   - Payment row `PAID`.
   - Bill `PAID`.
   - Table `cleaning`.
   - PWA shows paid success within 3s polling or realtime hint.
   - POS bill panel shows paid and pending list refreshes.

- [ ] **Step 5: Verify underpaid flow**

Simulate SePay webhook with `transferAmount < roundedTotal`.

Expected:

```txt
Payment remains PENDING
Audit includes SEPAY_WEBHOOK_UNDERPAID
Bill remains PENDING_PAYMENT
Table remains billing
PWA remains waiting
POS remains waiting
```

- [ ] **Step 6: Verify reopen protection**

Manual script:

1. Customer requests bill.
2. Staff creates VietQR.
3. Staff tries reopen bill.

Expected:

```txt
HTTP 409
Message indicates active payment attempt
Bill remains PENDING_PAYMENT
Table remains billing
```

- [ ] **Step 7: Write verification report**

Create report with this structure:

```md
# Phase 3 Post-Payment Verification

Date: 2026-05-09

## Commands

- pnpm dev:bff-payment
- npx nx serve customer-pwa
- npx nx serve management-app

## Cash Flow Result

PASS/FAIL:
Evidence:

## VietQR Flow Result

PASS/FAIL:
Evidence:

## Underpaid Flow Result

PASS/FAIL:
Evidence:

## Reopen Protection Result

PASS/FAIL:
Evidence:

## Residual Risks

- Kafka bridge is a hint; polling remains correctness baseline.
- Cross-service finalization can still need Phase 4A saga hardening for compensation.
```

- [ ] **Step 8: Commit verification report**

Run:

```bash
git add docs/superpowers/reports/2026-05-09-phase-3-post-payment-verification.md
git commit -m "docs(payment): add post-payment verification report"
```

---

## 11. Task 10: Documentation Sync

**Files:**

- Modify: `docs/phases/phase-3-payment.md`
- Modify: `docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md`
- Optional: `docs/implementation_plan.md`

- [ ] **Step 1: Update Phase 3 safe-refactor note**

In `docs/phases/phase-3-payment.md`, change the safe-refactor note to state:

```md
> **Post-payment finalization (2026-05-09):** Payment completion now finalizes the Order domain through `BILL_MARK_PAID`: bill `PAID`, session closed, and Catalog table `billing -> cleaning`. POS/Customer correctness still uses polling/refetch; Kafka -> BFF WebSocket emits invalidation hints only.
```

- [ ] **Step 2: Update D4 in decisions doc**

Replace the sentence:

```md
This safe refactor only fixes Payment correctness and Bill payment reference consistency. Session close and table transition implementation requires a separate Order settlement task.
```

with:

```md
The follow-up post-payment finalization task implements this transition in Order Service: `BILL_MARK_PAID` marks the bill paid, closes the session, and commands Catalog to move the table from `billing` to `cleaning`. Staff still marks `cleaning -> available`.
```

- [ ] **Step 3: Update implementation progress after verification passes**

Only after Tasks 1-9 pass, update `docs/implementation_plan.md` Phase 3 note from:

```md
Payment service + POS `/pos/bills` + Dashboard refund real API; E2E/customer final verification pending
```

to:

```md
Payment service + POS `/pos/bills` + Dashboard refund real API + post-payment bill/session/table finalization; E2E/customer final verification completed
```

Do not change `% phase` until the verification report is PASS.

- [ ] **Step 4: Run docs grep sanity**

Run:

```bash
rg -n "session close and table transition implementation requires|final verification pending|không implement chuyển bàn hay đóng session" docs/phases/phase-3-payment.md docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md docs/implementation_plan.md
```

Expected:

```txt
No stale lines remain, except implementation_plan.md if verification has not passed yet.
```

- [ ] **Step 5: Commit docs**

Run:

```bash
git add docs/phases/phase-3-payment.md docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md docs/implementation_plan.md
git commit -m "docs(payment): sync post-payment finalization status"
```

---

## 12. Final Verification Checklist

Run all before claiming the work complete:

```bash
npx nx test order --runInBand
npx nx test payment --runInBand
npx nx test bff --runInBand
npx nx test management-app --runInBand
npx nx build customer-pwa
npx nx build management-app
```

If customer-pwa has a test script:

```bash
pnpm --dir apps/customer-pwa test -- --run
```

Manual demo checks:

- [ ] Cash paid closes bill/session and table becomes cleaning.
- [ ] VietQR webhook paid closes bill/session and table becomes cleaning.
- [ ] Underpaid webhook keeps payment pending and table billing.
- [ ] Reopen is blocked after VietQR PENDING exists.
- [ ] PWA shows paid success without page reload.
- [ ] Management bills list/table map converge by polling even if WebSocket is off.
- [ ] Staff can mark cleaning table available.

---

## 13. Rollback Plan

If post-payment finalization causes demo instability:

1. Keep Payment PAID persistence and outbox unchanged.
2. Temporarily disable only Catalog table update in `BillService.markPaid()` by feature flag:

```ts
if (process.env['ORDER_FINALIZE_TABLE_ON_PAYMENT'] !== 'false') {
  await this.callCatalogUpdateTableStatus(...);
}
```

3. Keep session close disabled only if PWA read-only bill endpoint is broken:

```ts
if (process.env['ORDER_CLOSE_SESSION_ON_PAYMENT'] !== 'false') {
  await this.sessionService.closeAfterPayment(...);
}
```

4. Document any disabled flag in verification report.

Default values should finalize normally; flags are emergency rollback levers for local demo only.

---

## 14. Self-Review

### Spec coverage

- `Payment completed -> Bill PAID`: Task 2.
- `Billing -> Cleaning`: Task 2.
- Session close: Task 2.
- Customer PWA sync: Task 6.
- Management app sync: Task 7.
- WebSocket hint: Tasks 4-5.
- Reopen/payment race: Task 3.
- Docs and verification: Tasks 9-10.

### Placeholder scan

No task depends on unspecified files or vague "add tests" language. Each implementation task names target files, method signatures, commands, and expected results.

### Type consistency

- `PaymentCompletedRealtimeEvent` uses `method: 'CASH' | 'VIETQR'`, matching current payment completed Kafka parser.
- Bill finalization keeps `PaymentMethod` assignment in Order's `Bill` entity.
- Table status uses existing `TABLE_STATUS.CLEANING`.
- Read-only bill view keeps existing `BillCurrentTcpResponse` shape `{ bill, cart }`.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-09-phase-3-post-payment-finalization-plan.vi.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - dispatch a fresh worker per task, review between tasks, faster and safer for backend/frontend split.
2. **Inline Execution** - execute tasks in this session with checkpoints after backend, PWA, management, docs.
