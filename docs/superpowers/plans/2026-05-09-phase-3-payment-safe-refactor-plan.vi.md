# Phase 3 Payment Safe Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Phase 3 Payment safely after the code-quality audit, locking the ambiguous business and architecture decisions before changing production behavior.

**Architecture:** Keep Payment as the owner of `payments`, `refunds`, `audit_payments`, and its local outbox. Keep Order as the owner of `bills`; Payment may call Order through TCP only as a documented settlement fast path, while Kafka/outbox remains the recovery and fan-out channel for `payment.completed` and `payment.refunded`.

**Tech Stack:** Nx, NestJS TCP microservices, NestJS guards/DTO validation, TypeORM/PostgreSQL, KafkaJS, Jest, React/Next.js management UI.

---

## 0. Scope and Current Verdict

This plan is based on:

- `docs/superpowers/audits/2026-05-09-phase-3-payment-code-quality-audit.vi.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/implementation_plan.md`
- `docs/superpowers/handoffs/step-2.4/2026-04-29-step-2.4-batch-3-handoff.md`
- `docs/superpowers/plans/2026-05-08-phase-3-payment-implementation-plan.md`
- Current code under `apps/payment`, `apps/bff/src/app/modules/payment`, `apps/order/src/app/modules/order`, `libs/interfaces`, `libs/shared/types`, and `libs/entities`

Context7 source used:

- `npx ctx7@latest library "NestJS" "Plan a safe refactor for a NestJS Nx microservices payment service using TCP ClientProxy send MessagePattern handlers ConfigModule environment validation DTO validation guards provider organization and Kafka/outbox integration"`
- `npx ctx7@latest docs /nestjs/docs.nestjs.com "NestJS microservices TCP transport ClientProxy send MessagePattern handlers ConfigModule environment validation DTO validation guard organization and provider/module structure best practices for auditing and planning a payment microservice refactor"`
- Relevant official docs returned: NestJS microservices TCP basics, `ClientProxy.send()` / `@MessagePattern()`, microservice guards, and DTO validation with `class-validator`.

Verdict: the audit is clear enough to drive refactor. It needs one addendum: the base business and architecture docs introduce a few contradictions that must be resolved in a decision-lock task before implementation.

## 1. Contradiction Addendum

| ID  | Conflict                                                                                                                                                        | Evidence                                                                                                                                | Refactor decision                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Business logic says VietQR requires exact amount, but Phase 3 plan accepts overpaid transfers.                                                                  | `docs/business-logic.md:368-377`; `docs/superpowers/plans/2026-05-08-phase-3-payment-implementation-plan.md:19-21`; audit P3-A02.       | Keep overpaid accepted and store actual `paidAmount`. Full refund should refund actual received amount: `payment.paidAmount ?? payment.roundedTotal`.                                                        |
| C2  | Phase 3 plan describes event/outbox as the Payment -> Order path, but current code and technical sequence use both direct TCP and Kafka.                        | `docs/superpowers/plans/2026-05-08-phase-3-payment-implementation-plan.md:7`; `docs/technical-architecture.md:1185-1189`; audit P3-A01. | Keep sync fast path plus Kafka recovery/fan-out because it matches current behavior and POS latency needs. Document it explicitly and test duplicate/idempotent paths.                                       |
| C3  | Closing docs say table becomes `Available`, while table state machine says `Billing -> Cleaning -> Available`.                                                  | `docs/business-logic.md:174-184`; `docs/business-logic.md:382-384`; `docs/technical-architecture.md:1197-1202`.                         | Canonical table transition is `Billing -> Cleaning`; immediate `Available` is outdated prose. Do not implement session/table close inside this refactor unless a separate Order settlement task is approved. |
| C4  | Technical architecture lists `payment.completed` and `payment.refunded` as Kafka -> BFF real-time events, but current UI uses polling and BFF bridge is absent. | `docs/technical-architecture.md:1132-1145`; audit P3-A11.                                                                               | Keep polling as Phase 3 refactor baseline. Record Kafka -> BFF bridge as a separate real-time task after payment correctness is stable.                                                                      |
| C5  | QR content examples differ between business logic and Phase 3 implementation.                                                                                   | `docs/business-logic.md:368-377`; `docs/technical-architecture.md:1228`; `PaymentReferenceService` current behavior.                    | Canonical bill reference remains `QRTBL` + first 8 non-dash chars of `billId`, with fallback collision reference. Update prose examples to point to the canonical reference contract.                        |
| C6  | Target architecture says database-per-service, but Order/Payment config still falls back to shared `qrtable`.                                                   | `docs/implementation_plan.md:15-18`; `apps/payment/src/configuration/index.ts`; audit P3-A08.                                           | Allow dev/demo fallback only. Production/staging must require `PAYMENT_TYPEORM_DATABASE`.                                                                                                                    |

## 2. File Responsibility Map

Decision and docs:

- Create: `docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md` — decision lock for C1-C6.
- Modify: `docs/business-logic.md` — align exact amount, QR reference, and table close prose.
- Modify: `docs/technical-architecture.md` — document sync-fast-path plus Kafka recovery and the polling baseline.
- Modify: `docs/phases/phase-3-payment.md` — mark refactor scope and remaining real-time/close-session follow-up.
- Modify: `docs/guides/sepay-configuration-guide-phase3.vi.md` — add DB/env and webhook validation notes.

Shared contracts and interfaces:

- Create: `libs/shared/types/src/lib/payment.types.ts` — source of truth for payment/refund/audit statuses and payment event payloads.
- Modify: `libs/shared/types/src/index.ts` — export payment contracts.
- Modify: `libs/shared/types/src/lib/__tests__/enum-completeness.spec.ts` — assert payment enum completeness.
- Modify: `libs/interfaces/src/lib/tcp/payment/payment-request.interface.ts` — consume shared event/status types.
- Modify: `libs/interfaces/src/lib/tcp/payment/payment-response.interface.ts` — remove duplicate status unions.
- Modify: `libs/interfaces/src/lib/gateway/payment/payment-request.dto.ts` — add runtime `SepayWebhookRequestDto`.
- Modify: `libs/interfaces/src/lib/gateway/payment/payment-response.dto.ts` — type statuses from shared contracts.
- Modify: `libs/shared/constants/src/lib/status.ts` — fix outdated comment about Payment statuses.

BFF:

- Create: `apps/bff/src/app/modules/payment/guards/sepay-webhook-secret.guard.ts` — validate SePay secret before body DTO validation.
- Modify: `apps/bff/src/app/modules/payment/controllers/payment.controller.ts` — use `SepayWebhookRequestDto` and guard.
- Modify: `apps/bff/src/app/modules/payment/payment.module.ts` — add `SepayWebhookSecretGuard` to providers.
- Modify: `apps/bff/src/app/modules/payment/tests/payment.controller.spec.ts` — cover guard and DTO behavior.

Payment service:

- Modify: `apps/payment/src/app/modules/payment/entities/payment.entity.ts` — import shared `PaymentStatus`; add DB checks.
- Modify: `apps/payment/src/app/modules/payment/entities/refund.entity.ts` — import shared `RefundStatus`; add DB checks.
- Modify: `apps/payment/src/app/modules/payment/entities/audit-payment.entity.ts` — import shared audit types; add DB checks.
- Create: `apps/payment/src/app/modules/payment/services/payment-order.gateway.ts` — TCP calls to Order only.
- Create: `apps/payment/src/app/modules/payment/services/payment.mapper.ts` — entity to TCP response mapping.
- Create: `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts` — cash settlement and common paid transition rules.
- Create: `apps/payment/src/app/modules/payment/services/sepay-webhook.service.ts` — SePay webhook parsing, matching, and settlement application.
- Create: `apps/payment/src/app/modules/payment/services/payment-query.service.ts` — history/status reads.
- Modify: `apps/payment/src/app/modules/payment/services/payment.service.ts` — reduce to a facade or remove after controller wiring.
- Modify: `apps/payment/src/app/modules/payment/services/refund.service.ts` — refund actual paid amount.
- Modify: `apps/payment/src/app/modules/payment/services/payment-event-builder.ts` — use shared event payload types.
- Modify: `apps/payment/src/app/modules/payment/services/payment-outbox-publisher.service.ts` — prevent overlapping polls and retry startup failure.
- Modify: `apps/payment/src/app/modules/payment/repositories/payment-outbox.repository.ts` — document the Phase 3 single-instance outbox assumption next to `findPendingRows()`.
- Modify: `apps/payment/src/app/modules/payment/payment.module.ts` — wire new services.
- Modify: `apps/payment/src/configuration/index.ts` — require dedicated DB in staging/production.
- Modify: `apps/payment/src/configuration/index.spec.ts` — cover DB validation.
- Modify: `apps/payment/src/app/modules/payment/tests/payment.service.spec.ts` — behavior tests before refactor.
- Modify: `apps/payment/src/app/modules/payment/tests/refund.service.spec.ts` — real `RefundService` tests.
- Modify: `apps/payment/src/app/modules/payment/tests/payment-entity.spec.ts` — DB/status metadata checks.

Order service:

- Modify: `libs/entities/src/lib/bill.entity.ts` — add nullable `payment_id`.
- Modify: `apps/order/src/app/modules/order/services/bill.service.ts` — set and return `paymentId`.
- Modify: `apps/order/src/app/modules/order/tests/bill.service.spec.ts` — verify `paymentId` persistence and idempotent duplicate payment.
- Modify: `apps/order/src/app/modules/order/services/payment-events-consumer.service.ts` — import shared `PaymentCompletedEvent` once available.
- Modify: `apps/order/src/app/modules/order/tests/payment-events-consumer.service.spec.ts` — duplicate/invalid event coverage.

Frontend and Nx:

- Modify: `apps/management-app/src/features/payment/services/payment.service.ts` — consume shared payment types.
- Modify: `apps/payment/project.json`, `apps/management-app/project.json`, `apps/customer-pwa/project.json` — add Nx tags; add `management-app:test` using the existing Jest config.
- Modify: `.env.example` — uncomment/add `PAYMENT_TYPEORM_DATABASE=qrtable_payment`.

## 3. Task Sequence

### Task 1: Decision Lock and Doc Alignment

**Files:**

- Create: `docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md`
- Modify: `docs/business-logic.md`
- Modify: `docs/technical-architecture.md`
- Modify: `docs/phases/phase-3-payment.md`
- Modify: `docs/guides/sepay-configuration-guide-phase3.vi.md`

- [ ] **Step 1: Write decision lock doc**

Create `docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md` with these exact decisions:

```markdown
# Phase 3 Payment Refactor Decisions

**Date:** 2026-05-09
**Status:** Accepted for safe refactor

## D1. Payment -> Order Settlement

Payment remains the source of truth for Payment aggregates. Order remains the source of truth for Bill aggregates.

When a payment is completed, Payment writes the payment mutation and a `payment.completed` outbox row in one DB transaction. After commit, Payment may call Order through `BILL_MARK_PAID` as a sync fast path for POS latency. Kafka `payment.completed` remains the recovery and fan-out path. Order `markPaid()` must be idempotent when the bill is already `PAID`.

## D2. VietQR Overpaid and Refund Amount

Underpaid SePay webhook keeps the payment `PENDING` and records `SEPAY_WEBHOOK_UNDERPAID`.
Overpaid SePay webhook is accepted as `PAID` and stores the actual received value in `paidAmount`.
Full refund means refunding the actual received value: `payment.paidAmount ?? payment.roundedTotal`.

## D3. Bill Payment Reference

Bill is owned by Order, but it stores the Payment aggregate id as nullable `payment_id` after payment completion. This is a reference, not ownership transfer.

## D4. Table Close Semantics

Canonical table state after successful payment is `Billing -> Cleaning`. Staff later marks the table `Available`.
This safe refactor only fixes Payment correctness and Bill payment reference consistency. Session close and table transition implementation requires a separate Order settlement task.

## D5. Phase 3 Realtime Baseline

Phase 3 safe refactor accepts polling on POS payment screens. Kafka -> BFF bridge for `payment.completed` and `payment.refunded` is a separate real-time task.

## D6. Payment Database Configuration

Development may fall back to `TYPEORM_DATABASE` for demo speed. Staging and production must set `PAYMENT_TYPEORM_DATABASE`.
```

- [ ] **Step 2: Align docs with the decision lock**

Update the docs so these searches produce no stale contradictory prose:

```bash
rg -n "transaction.amount == bill.total|\\[TenQuan\\] Ban|Available \\(Trống\\)|Payment done.*Kafka → BFF" docs/business-logic.md docs/technical-architecture.md docs/phases/phase-3-payment.md
```

Expected after edits:

- Exact amount prose says SePay QR requests `roundedTotal`, underpaid is rejected-by-policy as pending, overpaid is accepted and audited.
- QR reference prose points to `QRTBL` + first 8 chars of `billId`.
- Close-session prose says `Billing -> Cleaning`, not immediate `Available`.
- Realtime table marks payment bridge as follow-up if not implemented.

- [ ] **Step 3: Verify docs**

Run:

```bash
npx prettier --check docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md docs/business-logic.md docs/technical-architecture.md docs/phases/phase-3-payment.md docs/guides/sepay-configuration-guide-phase3.vi.md
```

Expected: Prettier reports all checked docs are formatted.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-05-09-phase-3-payment-refactor-decisions.md docs/business-logic.md docs/technical-architecture.md docs/phases/phase-3-payment.md docs/guides/sepay-configuration-guide-phase3.vi.md
git commit -m "docs(payment): lock phase 3 refactor decisions"
```

### Task 2: Shared Payment Contracts

**Files:**

- Create: `libs/shared/types/src/lib/payment.types.ts`
- Modify: `libs/shared/types/src/index.ts`
- Modify: `libs/shared/types/src/lib/__tests__/enum-completeness.spec.ts`
- Modify: `libs/interfaces/src/lib/tcp/payment/payment-response.interface.ts`
- Modify: `libs/interfaces/src/lib/gateway/payment/payment-response.dto.ts`
- Modify: `apps/payment/src/app/modules/payment/entities/payment.entity.ts`
- Modify: `apps/payment/src/app/modules/payment/entities/refund.entity.ts`
- Modify: `apps/payment/src/app/modules/payment/entities/audit-payment.entity.ts`
- Modify: `apps/management-app/src/features/payment/services/payment.service.ts`
- Modify: `libs/shared/constants/src/lib/status.ts`

- [ ] **Step 1: Write failing shared enum test**

Add to `libs/shared/types/src/lib/__tests__/enum-completeness.spec.ts`:

```ts
import { PaymentActorType, PaymentAuditAction, PaymentStatus, RefundStatus } from '../payment.types';

it('PaymentStatus has exactly the Phase 3 values', () => {
  expect(Object.values(PaymentStatus).sort()).toEqual(
    ['FAILED', 'PAID', 'PENDING', 'REFUNDED', 'REFUND_PENDING'].sort(),
  );
});

it('RefundStatus has exactly the Phase 3 values', () => {
  expect(Object.values(RefundStatus).sort()).toEqual(['CANCELED', 'CONFIRMED', 'PENDING_STAFF_ACTION'].sort());
});

it('Payment audit contracts have exactly the Phase 3 values', () => {
  expect(Object.values(PaymentAuditAction).sort()).toEqual(
    [
      'CASH_CONFIRMED',
      'PAYMENT_COMPLETED',
      'PAYMENT_CREATED',
      'REFUND_CANCELED',
      'REFUND_CONFIRMED',
      'REFUND_REQUESTED',
      'SEPAY_WEBHOOK_AFTER_PAID',
      'SEPAY_WEBHOOK_DUPLICATE',
      'SEPAY_WEBHOOK_RECEIVED',
      'SEPAY_WEBHOOK_UNDERPAID',
    ].sort(),
  );
  expect(Object.values(PaymentActorType).sort()).toEqual(['SEPAY', 'SYSTEM', 'USER'].sort());
});
```

Run:

```bash
npx nx test shared-types --testFile=libs/shared/types/src/lib/__tests__/enum-completeness.spec.ts
```

Expected: FAIL because `payment.types.ts` does not exist yet.

- [ ] **Step 2: Add shared payment contract**

Create `libs/shared/types/src/lib/payment.types.ts`:

```ts
import type { PaymentMethod } from './bill.types';

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  REFUND_PENDING: 'REFUND_PENDING',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const RefundStatus = {
  PENDING_STAFF_ACTION: 'PENDING_STAFF_ACTION',
  CONFIRMED: 'CONFIRMED',
  CANCELED: 'CANCELED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const PaymentAuditAction = {
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  CASH_CONFIRMED: 'CASH_CONFIRMED',
  SEPAY_WEBHOOK_RECEIVED: 'SEPAY_WEBHOOK_RECEIVED',
  SEPAY_WEBHOOK_DUPLICATE: 'SEPAY_WEBHOOK_DUPLICATE',
  SEPAY_WEBHOOK_UNDERPAID: 'SEPAY_WEBHOOK_UNDERPAID',
  SEPAY_WEBHOOK_AFTER_PAID: 'SEPAY_WEBHOOK_AFTER_PAID',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  REFUND_REQUESTED: 'REFUND_REQUESTED',
  REFUND_CONFIRMED: 'REFUND_CONFIRMED',
  REFUND_CANCELED: 'REFUND_CANCELED',
} as const;
export type PaymentAuditAction = (typeof PaymentAuditAction)[keyof typeof PaymentAuditAction];

export const PaymentActorType = {
  USER: 'USER',
  SEPAY: 'SEPAY',
  SYSTEM: 'SYSTEM',
} as const;
export type PaymentActorType = (typeof PaymentActorType)[keyof typeof PaymentActorType];

export type PaymentCompletedEvent = {
  eventId: string;
  eventType: 'payment.completed';
  tenantId: string;
  billId: string;
  paymentId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  correlationId?: string;
};

export type PaymentRefundedEvent = {
  eventId: string;
  eventType: 'payment.refunded';
  tenantId: string;
  billId: string;
  paymentId: string;
  refundId: string;
  amount: number;
  confirmedByUserId: string | null;
  confirmedAt: string;
  correlationId?: string;
};
```

- [ ] **Step 3: Export shared contract**

Add to `libs/shared/types/src/index.ts`:

```ts
// ─── Payment (Phase 3) ─────────────────────────────
export type { PaymentCompletedEvent, PaymentRefundedEvent } from './lib/payment.types';
export { PaymentActorType, PaymentAuditAction, PaymentStatus, RefundStatus } from './lib/payment.types';
export type {
  PaymentActorType as PaymentActorTypeValue,
  PaymentAuditAction as PaymentAuditActionValue,
  PaymentStatus as PaymentStatusValue,
  RefundStatus as RefundStatusValue,
} from './lib/payment.types';
```

- [ ] **Step 4: Replace duplicate unions**

Replace local `PaymentStatus`, `RefundStatus`, `AuditPaymentAction`, and `AuditActorType` definitions in:

- `apps/payment/src/app/modules/payment/entities/payment.entity.ts`
- `apps/payment/src/app/modules/payment/entities/refund.entity.ts`
- `apps/payment/src/app/modules/payment/entities/audit-payment.entity.ts`
- `libs/interfaces/src/lib/tcp/payment/payment-response.interface.ts`
- `apps/management-app/src/features/payment/services/payment.service.ts`

Use imports from `@einvoice/types`, for example:

```ts
import type { PaymentStatusValue } from '@einvoice/types';

@Column({ type: 'varchar', length: 30, default: 'PENDING' })
status!: PaymentStatusValue;
```

For runtime values, use `PaymentStatus.PENDING`, `RefundStatus.PENDING_STAFF_ACTION`, and `PaymentAuditAction.PAYMENT_COMPLETED`.

- [ ] **Step 5: Tighten gateway response DTO typing**

In `libs/interfaces/src/lib/gateway/payment/payment-response.dto.ts`, replace generic status strings:

```ts
import type { PaymentMethod, PaymentStatusValue, RefundStatusValue } from '@einvoice/types';

export class PaymentResponseDto {
  method!: PaymentMethod | null;
  status!: PaymentStatusValue;
}

export class RefundResponseDto {
  status!: RefundStatusValue;
}
```

Update `method` and `status` declarations as shown; leave the rest of the existing response properties unchanged.

- [ ] **Step 6: Verify**

Run:

```bash
rg -n "export type PaymentStatus|export type RefundStatus|export type AuditPaymentAction|export type AuditActorType" apps libs
npx nx test shared-types --testFile=libs/shared/types/src/lib/__tests__/enum-completeness.spec.ts
npx nx test payment
npx nx build payment --configuration=development --skip-nx-cache
npx nx build management-app --skip-nx-cache
```

Expected:

- `rg` only reports `libs/shared/types/src/lib/payment.types.ts`.
- Tests and builds pass.

- [ ] **Step 7: Commit**

```bash
git add libs/shared/types libs/interfaces/src/lib/tcp/payment libs/interfaces/src/lib/gateway/payment apps/payment/src/app/modules/payment apps/management-app/src/features/payment/services/payment.service.ts libs/shared/constants/src/lib/status.ts
git commit -m "refactor(payment): centralize phase 3 payment contracts"
```

### Task 3: SePay Webhook Runtime Boundary

**Files:**

- Modify: `libs/interfaces/src/lib/gateway/payment/payment-request.dto.ts`
- Create: `apps/bff/src/app/modules/payment/guards/sepay-webhook-secret.guard.ts`
- Modify: `apps/bff/src/app/modules/payment/controllers/payment.controller.ts`
- Modify: `apps/bff/src/app/modules/payment/payment.module.ts`
- Modify: `apps/bff/src/app/modules/payment/tests/payment.controller.spec.ts`

- [ ] **Step 1: Add DTO validation test**

Add a DTO-focused test to `apps/bff/src/app/modules/payment/tests/payment.controller.spec.ts`:

```ts
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SepayWebhookRequestDto } from '@common/interfaces/gateway/payment';

it('rejects malformed SePay webhook payloads before TCP forwarding', async () => {
  const dto = plainToInstance(SepayWebhookRequestDto, {
    id: 'not-a-number',
    gateway: '',
    transactionDate: '',
    accountNumber: '',
    code: null,
    content: '',
    transferType: 'sideways',
    transferAmount: -1,
    accumulated: 0,
    subAccount: null,
    referenceCode: '',
    description: '',
  });

  const errors = await validate(dto);

  expect(errors.length).toBeGreaterThan(0);
});
```

Run:

```bash
npx nx test bff --testFile=apps/bff/src/app/modules/payment/tests/payment.controller.spec.ts
```

Expected: FAIL because `SepayWebhookRequestDto` is missing.

- [ ] **Step 2: Add SePay webhook DTO**

In `libs/interfaces/src/lib/gateway/payment/payment-request.dto.ts`, add:

```ts
import { IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class SepayWebhookRequestDto {
  @IsInt()
  @Min(1)
  id!: number;

  @IsString()
  @MaxLength(80)
  gateway!: string;

  @IsString()
  @MaxLength(40)
  transactionDate!: string;

  @IsString()
  @MaxLength(64)
  accountNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  code!: string | null;

  @IsString()
  @MaxLength(500)
  content!: string;

  @IsIn(['in', 'out'])
  transferType!: 'in' | 'out';

  @IsNumber()
  @Min(1)
  transferAmount!: number;

  @IsNumber()
  accumulated!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  subAccount!: string | null;

  @IsString()
  @MaxLength(120)
  referenceCode!: string;

  @IsString()
  @MaxLength(500)
  description!: string;
}
```

- [ ] **Step 3: Move secret check into a guard**

Create `apps/bff/src/app/modules/payment/guards/sepay-webhook-secret.guard.ts`:

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { assertSepayWebhookSecret } from '../verify-sepay-webhook-secret';

@Injectable()
export class SepayWebhookSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-secret-key'];
    const secretKey = Array.isArray(provided) ? provided[0] : provided;
    const expected =
      this.configService.get<string>('SEPAY_WEBHOOK_SECRET') || process.env['SEPAY_WEBHOOK_SECRET'] || '';

    assertSepayWebhookSecret(secretKey, expected);
    return true;
  }
}
```

This preserves the existing timing-safe compare while making the secret validation run before body pipes.

- [ ] **Step 4: Use DTO and guard in controller**

In `apps/bff/src/app/modules/payment/controllers/payment.controller.ts`:

```ts
import { UseGuards } from '@nestjs/common';
import { SepayWebhookRequestDto } from '@common/interfaces/gateway/payment';
import { SepayWebhookSecretGuard } from '../guards/sepay-webhook-secret.guard';

@Post('sepay/webhook')
@Authorization({ secured: false })
@UseGuards(SepayWebhookSecretGuard)
@RawResponse()
@ApiOperation({ summary: 'SePay bank transfer webhook' })
async sepayWebhook(
  @Body() payload: SepayWebhookRequestDto,
  @ProcessId() processId: string,
): Promise<{ success: true }> {
  const tcpData: HandleSepayWebhookTcpRequest = { payload, processId };
  await this.sendPaymentTcp<SepayWebhookTcpResponse, HandleSepayWebhookTcpRequest>(
    TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK,
    { data: tcpData, processId },
  );
  return { success: true };
}
```

Remove the inline `@Headers('x-secret-key')` parameter and inline `assertSepayWebhookSecret()` call from this method.

- [ ] **Step 5: Wire guard provider**

In `apps/bff/src/app/modules/payment/payment.module.ts`, add `SepayWebhookSecretGuard` to providers if it is not already auto-resolved by module metadata:

```ts
providers: [SepayWebhookSecretGuard],
```

- [ ] **Step 6: Verify**

Run:

```bash
npx nx test bff --testFile=apps/bff/src/app/modules/payment/tests/payment.controller.spec.ts
npx nx lint bff --skip-nx-cache
```

Expected:

- Invalid payload test passes.
- Invalid/missing secret tests still assert 401.
- Lint has no new errors.

- [ ] **Step 7: Commit**

```bash
git add libs/interfaces/src/lib/gateway/payment/payment-request.dto.ts apps/bff/src/app/modules/payment
git commit -m "fix(payment): validate sepay webhook boundary"
```

### Task 4: Behavior Tests Before Service Refactor

**Files:**

- Modify: `apps/payment/src/app/modules/payment/tests/payment.service.spec.ts`
- Modify: `apps/payment/src/app/modules/payment/tests/refund.service.spec.ts`
- Modify: `apps/order/src/app/modules/order/tests/payment-events-consumer.service.spec.ts`

- [ ] **Step 1: Add PaymentService behavior tests**

Add concrete tests for these business cases before changing service structure. Use the existing `makePayment()` helper in `payment.service.spec.ts`, and use these exact fixture values:

| Test name                                                                             | Fixture                                                                                                                                                                                                                                                                                                                                                   | Required assertions                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keeps matched underpaid SePay webhook pending and writes underpaid audit`            | `makePayment({ roundedTotal: 128_000, status: 'PENDING' })`; webhook `{ id: 10, transferType: 'in', transferAmount: 100_000, code: 'QRTBL11111111', content: 'QRTBL11111111', gateway: 'VCB', accountNumber: '001', referenceCode: 'SEPAY10', transactionDate: '2026-05-09 10:00:00', accumulated: 100_000, subAccount: null, description: 'underpaid' }` | `payment.status` remains `PENDING`; `outboxRepo.createCompleted` is not called; `auditRepo.createPaymentAudit` is called with `SEPAY_WEBHOOK_UNDERPAID`.                                                        |
| `accepts overpaid SePay webhook and stores actual paidAmount`                         | same pending payment; webhook `transferAmount: 130_000` and `id: 11`                                                                                                                                                                                                                                                                                      | `payment.status` becomes `PAID`; `payment.paidAmount` is `130_000`; `outboxRepo.createCompleted` is called once inside the transaction; `orderClient.send` receives `TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID`. |
| `does not fail the payment transaction when direct BILL_MARK_PAID fails after commit` | `confirmCash()` with bill snapshot `PENDING_PAYMENT`, `amountReceived: 130_000`, and `orderClient.send` throwing from the second call only                                                                                                                                                                                                                | response status is `PAID`; `outboxRepo.createCompleted` is called; the returned payment id matches the saved payment.                                                                                           |
| `ignores duplicate SePay webhook id for the same payment`                             | `makePayment({ status: 'PAID', sepayTransactionId: 12 })`; webhook `id: 12`                                                                                                                                                                                                                                                                               | `outboxRepo.createCompleted` is not called; `auditRepo.createPaymentAudit` is called with `SEPAY_WEBHOOK_DUPLICATE`.                                                                                            |
| `ignores SePay webhook after payment is already paid`                                 | `makePayment({ status: 'PAID', sepayTransactionId: 12 })`; webhook `id: 13`                                                                                                                                                                                                                                                                               | `outboxRepo.createCompleted` is not called; `auditRepo.createPaymentAudit` is called with `SEPAY_WEBHOOK_AFTER_PAID`.                                                                                           |

For transaction mocks, use:

```ts
const manager = {
  save: jest.fn(async (_entity, value) => value),
  create: jest.fn((_entity, value) => value),
};
const dataSource = {
  transaction: jest.fn(async (callback: (manager: typeof manager) => Promise<unknown>) => callback(manager)),
};
```

Run:

```bash
npx nx test payment --testFile=apps/payment/src/app/modules/payment/tests/payment.service.spec.ts
```

Expected: tests fail only where the current implementation is wrong or untested.

- [ ] **Step 2: Replace literal refund tests with real service tests**

In `apps/payment/src/app/modules/payment/tests/refund.service.spec.ts`, instantiate `RefundService` with mocked `DataSource.transaction`, `paymentRepo`, `refundRepo`, `auditRepo`, and `outboxRepo`. Add these concrete cases:

| Test name                                                                       | Fixture                                                                                                                                                                   | Required assertions                                                                                                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `uses actual paid amount for full refund when VietQR was overpaid`              | payment `{ id: 'payment-1', tenantId: 'tenant-1', status: 'PAID', roundedTotal: 128_000, paidAmount: 130_000 }`; `refundRepo.findBlockingRefundForPayment` returns `null` | manager creates `RefundEntity` with `amount: 130_000`; response amount is `130_000`.                                                      |
| `blocks duplicate active refund for the same payment`                           | same paid payment; `refundRepo.findBlockingRefundForPayment` returns `{ id: 'refund-1' }`                                                                                 | `requestRefund()` rejects with `ConflictException`; manager does not save a new `RefundEntity`.                                           |
| `confirms refund and emits payment.refunded outbox row in the same transaction` | refund `{ id: 'refund-1', status: 'PENDING_STAFF_ACTION', paymentId: 'payment-1' }`; payment `{ id: 'payment-1', status: 'REFUND_PENDING' }`                              | refund status becomes `CONFIRMED`; payment status becomes `REFUNDED`; `outboxRepo.createRefunded` is called with the transaction manager. |

Run:

```bash
npx nx test payment --testFile=apps/payment/src/app/modules/payment/tests/refund.service.spec.ts
```

Expected: the overpaid refund test fails until Task 5 changes `RefundService`.

- [ ] **Step 3: Add Order idempotency tests**

In `apps/order/src/app/modules/order/tests/payment-events-consumer.service.spec.ts`, add:

```ts
it('maps duplicate payment.completed event to idempotent markPaid request', () => {
  const event = parsePaymentCompletedEvent(
    JSON.stringify({
      eventId: 'event-1',
      eventType: 'payment.completed',
      tenantId: 'tenant-1',
      billId: 'bill-1',
      paymentId: 'payment-1',
      amount: 128000,
      method: 'VIETQR',
      paidAt: '2026-05-09T00:00:00.000Z',
      correlationId: 'process-1',
    }),
  );

  expect(event).not.toBeNull();
  expect(paymentCompletedToMarkPaidRequest(event!)).toEqual({
    tenantId: 'tenant-1',
    billId: 'bill-1',
    paymentId: 'payment-1',
    method: 'VIETQR',
    paidAt: '2026-05-09T00:00:00.000Z',
    processId: 'process-1',
  });
});
```

Add a `BillService.markPaid()` test in `apps/order/src/app/modules/order/tests/bill.service.spec.ts`:

| Test name                                                                                    | Fixture                                                                                                                                                                                                             | Required assertions                                                                                          |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `returns the paid bill unchanged when markPaid receives a duplicate payment.completed event` | bill `{ id: 'bill-1', tenantId: 'tenant-1', status: BillStatus.PAID, paymentId: 'payment-1', paymentMethod: PaymentMethod.VIETQR, paidAt: new Date('2026-05-09T00:00:00.000Z') }`; request has the same `paymentId` | `billRepository.save` is not called; response bill status is `PAID`; response bill paymentId is `payment-1`. |

- [ ] **Step 4: Commit test harness**

```bash
git add apps/payment/src/app/modules/payment/tests apps/order/src/app/modules/order/tests
git commit -m "test(payment): lock settlement behavior before refactor"
```

### Task 5: Correctness Fixes With Minimal Structural Change

**Files:**

- Modify: `apps/payment/src/app/modules/payment/services/refund.service.ts`
- Modify: `libs/entities/src/lib/bill.entity.ts`
- Modify: `apps/order/src/app/modules/order/services/bill.service.ts`
- Modify: `apps/order/src/app/modules/order/tests/bill.service.spec.ts`
- Modify: `apps/payment/src/app/modules/payment/entities/payment.entity.ts`
- Modify: `apps/payment/src/app/modules/payment/entities/refund.entity.ts`
- Modify: `apps/payment/src/app/modules/payment/entities/audit-payment.entity.ts`
- Modify: `apps/payment/src/app/modules/payment/tests/payment-entity.spec.ts`

- [ ] **Step 1: Fix refund amount policy**

In `apps/payment/src/app/modules/payment/services/refund.service.ts`, replace:

```ts
amount: payment.roundedTotal,
```

with:

```ts
amount: payment.paidAmount ?? payment.roundedTotal,
```

Run:

```bash
npx nx test payment --testFile=apps/payment/src/app/modules/payment/tests/refund.service.spec.ts
```

Expected: overpaid refund test passes.

- [ ] **Step 2: Persist Bill payment reference**

In `libs/entities/src/lib/bill.entity.ts`, add:

```ts
@Column({ name: 'payment_id', type: 'uuid', nullable: true })
paymentId: string | null;
```

In `apps/order/src/app/modules/order/services/bill.service.ts`, add to `markPaid()` before `paidAt`:

```ts
bill.paymentId = dto.paymentId;
```

Add to `toBillDto()`:

```ts
paymentId: entity.paymentId ?? undefined,
```

Run:

```bash
npx nx test order --testFile=apps/order/src/app/modules/order/tests/bill.service.spec.ts
```

Expected: Bill DTO includes `paymentId` after markPaid.

- [ ] **Step 3: Add entity DB checks**

In `apps/payment/src/app/modules/payment/entities/payment.entity.ts`, import `Check` from TypeORM and add class decorators:

```ts
@Check(`"status" IN ('PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'FAILED')`)
@Check(`"method" IS NULL OR "method" IN ('CASH', 'VIETQR')`)
@Check(`"raw_total" >= 0`)
@Check(`"rounded_total" >= 0`)
@Check(`"paid_amount" IS NULL OR "paid_amount" >= 0`)
@Check(`"amount_received" IS NULL OR "amount_received" >= 0`)
@Check(`"change_amount" IS NULL OR "change_amount" >= 0`)
```

In `apps/payment/src/app/modules/payment/entities/refund.entity.ts`, add:

```ts
@Check(`"status" IN ('PENDING_STAFF_ACTION', 'CONFIRMED', 'CANCELED')`)
@Check(`"amount" >= 0`)
```

In `apps/payment/src/app/modules/payment/entities/audit-payment.entity.ts`, add:

```ts
@Check(`"action" IN ('PAYMENT_CREATED', 'CASH_CONFIRMED', 'SEPAY_WEBHOOK_RECEIVED', 'SEPAY_WEBHOOK_DUPLICATE', 'SEPAY_WEBHOOK_UNDERPAID', 'SEPAY_WEBHOOK_AFTER_PAID', 'PAYMENT_COMPLETED', 'REFUND_REQUESTED', 'REFUND_CONFIRMED', 'REFUND_CANCELED')`)
@Check(`"actor_type" IN ('USER', 'SEPAY', 'SYSTEM')`)
```

- [ ] **Step 4: Verify correctness fixes**

Run:

```bash
npx nx test payment
npx nx test order --testFile=apps/order/src/app/modules/order/tests/bill.service.spec.ts
npx nx build entities --skip-nx-cache
npx nx build payment --configuration=development --skip-nx-cache
npx nx build order --configuration=development --skip-nx-cache
```

Expected: all pass. If TypeORM check metadata changes break tests, update only the metadata expectations, not business behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/payment/src/app/modules/payment libs/entities/src/lib/bill.entity.ts apps/order/src/app/modules/order
git commit -m "fix(payment): align refund and bill references"
```

### Task 6: Split Payment Service Responsibilities

**Files:**

- Create: `apps/payment/src/app/modules/payment/services/payment-order.gateway.ts`
- Create: `apps/payment/src/app/modules/payment/services/payment.mapper.ts`
- Create: `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
- Create: `apps/payment/src/app/modules/payment/services/sepay-webhook.service.ts`
- Create: `apps/payment/src/app/modules/payment/services/payment-query.service.ts`
- Modify: `apps/payment/src/app/modules/payment/services/payment.service.ts`
- Modify: `apps/payment/src/app/modules/payment/controllers/payment.controller.ts`
- Modify: `apps/payment/src/app/modules/payment/payment.module.ts`
- Modify: `apps/payment/src/app/modules/payment/tests/payment.service.spec.ts`

- [ ] **Step 1: Extract Order TCP gateway**

Create `payment-order.gateway.ts`:

```ts
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { RequestType } from '@common/interfaces/tcp/common/request.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  BillMarkPaidTcpRequest,
  BillPaymentSnapshotTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  BillMarkedPaidTcpResponse,
  BillPaymentSnapshotTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, map, timeout } from 'rxjs';
import { CONFIGURATION } from '../../../../configuration';

@Injectable()
export class PaymentOrderGateway {
  private readonly logger = new Logger(PaymentOrderGateway.name);

  constructor(@Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient) {}

  async getBillPaymentSnapshot(
    tenantId: string,
    billId: string,
    processId?: string,
  ): Promise<BillPaymentSnapshotTcpResponse> {
    const req: RequestType<BillPaymentSnapshotTcpRequest> = {
      tenantId,
      processId,
      data: { tenantId, billId },
    };
    const wrapped = await firstValueFrom(
      this.orderClient
        .send<
          BillPaymentSnapshotTcpResponse,
          BillPaymentSnapshotTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT, req)
        .pipe(
          timeout({ first: CONFIGURATION.PAYMENT_INTEGRATION_CONFIG.ORDER_TCP_TIMEOUT_MS }),
          map((r) => r),
        ),
    );
    if (!wrapped?.data) {
      throw new ConflictException('Unable to load bill snapshot');
    }
    return wrapped.data;
  }

  async markBillPaid(params: BillMarkPaidTcpRequest): Promise<void> {
    const req: RequestType<BillMarkPaidTcpRequest> = {
      tenantId: params.tenantId,
      processId: params.processId,
      data: params,
    };
    try {
      await firstValueFrom(
        this.orderClient
          .send<BillMarkedPaidTcpResponse, BillMarkPaidTcpRequest>(TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID, req)
          .pipe(
            timeout({ first: CONFIGURATION.PAYMENT_INTEGRATION_CONFIG.ORDER_TCP_TIMEOUT_MS }),
            map((r) => r),
          ),
      );
    } catch (error) {
      this.logger.warn(`BILL_MARK_PAID failed for bill ${params.billId}: ${(error as Error).message}`);
    }
  }
}
```

Run `npx nx test payment` after replacing the old private methods with gateway calls.

- [ ] **Step 2: Extract response mapper**

Create `payment.mapper.ts`:

```ts
import type { PaymentTcpResponse } from '@common/interfaces/tcp/payment';
import { Injectable } from '@nestjs/common';
import { PaymentEntity } from '../entities/payment.entity';

@Injectable()
export class PaymentMapper {
  toPaymentResponse(payment: PaymentEntity): PaymentTcpResponse {
    return {
      id: payment.id,
      tenantId: payment.tenantId,
      billId: payment.billId,
      billReference: payment.billReference,
      method: payment.method,
      status: payment.status,
      rawTotal: payment.rawTotal,
      roundedTotal: payment.roundedTotal,
      roundingDelta: payment.roundingDelta,
      paidAmount: payment.paidAmount ?? undefined,
      amountReceived: payment.amountReceived ?? undefined,
      changeAmount: payment.changeAmount ?? undefined,
      paidAt: payment.paidAt?.toISOString(),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 3: Extract query service**

Create `payment-query.service.ts`:

```ts
import type {
  PaymentHistoryTcpRequest,
  PaymentHistoryTcpResponse,
  PaymentStatusTcpRequest,
  PaymentTcpResponse,
} from '@common/interfaces/tcp/payment';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentMapper } from './payment.mapper';

@Injectable()
export class PaymentQueryService {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly mapper: PaymentMapper,
  ) {}

  async getHistory(dto: PaymentHistoryTcpRequest): Promise<PaymentHistoryTcpResponse> {
    const rows = await this.paymentRepo.findByTenantOrdered(dto.tenantId, {
      billId: dto.billId,
      status: dto.status,
      limit: dto.limit,
      offset: dto.offset,
    });
    return rows.map((payment) => this.mapper.toPaymentResponse(payment));
  }

  async getStatus(dto: PaymentStatusTcpRequest): Promise<PaymentTcpResponse> {
    const payment = await this.paymentRepo.findByTenantAndId(dto.tenantId, dto.paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.mapper.toPaymentResponse(payment);
  }
}
```

- [ ] **Step 4: Extract settlement and SePay services**

Move `confirmCash()` into `PaymentSettlementService` and `handleSepayWebhook()` into `SepayWebhookService`. Preserve method signatures:

```ts
async confirmCash(dto: ConfirmCashTcpRequest): Promise<PaymentTcpResponse>
async handleSepayWebhook(dto: HandleSepayWebhookTcpRequest): Promise<SepayWebhookTcpResponse>
```

Keep the transaction order unchanged:

1. Lock/find payment.
2. Validate status and amount.
3. Save payment mutation.
4. Write audit rows.
5. Write outbox row.
6. Commit transaction.
7. Call `PaymentOrderGateway.markBillPaid()` as best-effort sync fast path.

- [ ] **Step 5: Make PaymentService a thin facade**

In `payment.service.ts`, keep only orchestration methods that delegate:

```ts
@Injectable()
export class PaymentService {
  constructor(
    private readonly settlement: PaymentSettlementService,
    private readonly sepayWebhook: SepayWebhookService,
    private readonly query: PaymentQueryService,
  ) {}

  createVietQr(dto: CreateVietQrTcpRequest): Promise<CreateVietQrTcpResponse> {
    return this.settlement.createVietQr(dto);
  }

  confirmCash(dto: ConfirmCashTcpRequest): Promise<PaymentTcpResponse> {
    return this.settlement.confirmCash(dto);
  }

  handleSepayWebhook(dto: HandleSepayWebhookTcpRequest): Promise<SepayWebhookTcpResponse> {
    return this.sepayWebhook.handleSepayWebhook(dto);
  }

  getHistory(dto: PaymentHistoryTcpRequest): Promise<PaymentHistoryTcpResponse> {
    return this.query.getHistory(dto);
  }

  getStatus(dto: PaymentStatusTcpRequest): Promise<PaymentTcpResponse> {
    return this.query.getStatus(dto);
  }
}
```

- [ ] **Step 6: Wire module**

In `payment.module.ts`, add providers:

```ts
PaymentMapper,
PaymentOrderGateway,
PaymentQueryService,
PaymentSettlementService,
SepayWebhookService,
```

- [ ] **Step 7: Verify refactor**

Run:

```bash
npx nx test payment
npx nx build payment --configuration=development --skip-nx-cache
npx nx lint payment --skip-nx-cache
```

Expected: all behavior tests from Task 4 still pass. The diff should move code, not change settlement behavior.

- [ ] **Step 8: Commit**

```bash
git add apps/payment/src/app/modules/payment
git commit -m "refactor(payment): split settlement service responsibilities"
```

### Task 7: Outbox and Kafka Resilience

**Files:**

- Modify: `apps/payment/src/app/modules/payment/services/payment-outbox-publisher.service.ts`
- Modify: `apps/payment/src/app/modules/payment/repositories/payment-outbox.repository.ts`
- Modify: `apps/order/src/app/modules/order/services/payment-events-consumer.service.ts`
- Modify: `apps/payment/src/app/modules/payment/tests/payment.service.spec.ts`
- Modify: `apps/order/src/app/modules/order/tests/payment-events-consumer.service.spec.ts`

- [ ] **Step 1: Prevent overlapping outbox polls**

In `PaymentOutboxPublisherService`, add:

```ts
private publishing = false;
```

Update `publishBatchSafe()`:

```ts
private async publishBatchSafe(): Promise<void> {
  if (this.publishing) {
    return;
  }
  this.publishing = true;
  try {
    await this.publishBatch();
  } catch (e) {
    this.logger.warn(`Payment outbox poll error: ${(e as Error).message}`);
  } finally {
    this.publishing = false;
  }
}
```

- [ ] **Step 2: Add startup retry policy**

Add a retry timer that reconnects when initial Kafka producer connect fails:

```ts
private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

private scheduleProducerReconnect(): void {
  if (this.reconnectTimer) {
    return;
  }
  this.reconnectTimer = setTimeout(() => {
    this.reconnectTimer = null;
    void this.onModuleInit();
  }, 5000);
}
```

Call `this.scheduleProducerReconnect()` in the producer connect catch block.

Clear `reconnectTimer` in `onModuleDestroy()`.

- [ ] **Step 3: Document multi-instance behavior**

If Phase 3 remains single-instance, add a comment above `findPendingRows()`:

```ts
// Phase 3 demo assumes a single Payment instance. Multi-instance deployment must replace
// this read with a DB claim/lock step such as FOR UPDATE SKIP LOCKED or PROCESSING rows.
```

This plan does not enable multi-instance Payment workers. Multi-instance deployment stays blocked until a transaction-based claim method replaces `findPendingRows()`.

- [ ] **Step 4: Verify duplicate event safety**

Run:

```bash
npx nx test order --testFile=apps/order/src/app/modules/order/tests/payment-events-consumer.service.spec.ts
npx nx test payment
```

Expected: duplicate `payment.completed` does not corrupt the Bill, and producer reconnect logic is covered by unit tests or documented as degraded behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/payment/src/app/modules/payment/services/payment-outbox-publisher.service.ts apps/payment/src/app/modules/payment/repositories/payment-outbox.repository.ts apps/order/src/app/modules/order
git commit -m "fix(payment): harden payment outbox publishing"
```

### Task 8: Payment Config and Nx Hygiene

**Files:**

- Modify: `apps/payment/src/configuration/index.ts`
- Modify: `apps/payment/src/configuration/index.spec.ts`
- Modify: `.env.example`
- Modify: `apps/payment/project.json`
- Modify: `apps/management-app/project.json`
- Modify: `apps/customer-pwa/project.json`
- Modify: `apps/management-app/package.json` if adding test script is necessary.

- [ ] **Step 1: Add production DB validation test**

In `apps/payment/src/configuration/index.spec.ts`, preserve original env values and add:

```ts
it('requires PAYMENT_TYPEORM_DATABASE in production', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.PAYMENT_TYPEORM_DATABASE;
  process.env.TYPEORM_DATABASE = 'qrtable';
  jest.resetModules();

  await expect(import('./index')).rejects.toThrow('PAYMENT_TYPEORM_DATABASE is required');
});
```

Expected: FAIL before config is updated.

- [ ] **Step 2: Require dedicated DB in staging/production**

In `apps/payment/src/configuration/index.ts`, update `PaymentTypeOrmConfiguration`:

```ts
class PaymentTypeOrmConfiguration extends TypeOrmConfiguration {
  constructor() {
    const dedicatedDatabase = process.env['PAYMENT_TYPEORM_DATABASE'];
    const nodeEnv = process.env['NODE_ENV'] || 'development';
    if ((nodeEnv === 'production' || nodeEnv === 'staging') && !dedicatedDatabase) {
      throw new Error('PAYMENT_TYPEORM_DATABASE is required for payment service in staging/production');
    }
    super({
      DATABASE: dedicatedDatabase || process.env['TYPEORM_DATABASE'] || DEFAULT_PAYMENT_DATABASE,
    });
  }
}
```

- [ ] **Step 3: Update env example**

In `.env.example`, change:

```dotenv
# PAYMENT_TYPEORM_DATABASE=qrtable_payment
```

to:

```dotenv
PAYMENT_TYPEORM_DATABASE=qrtable_payment
```

- [ ] **Step 4: Add Nx tags**

Update project tags:

```json
// apps/payment/project.json
"tags": ["type:app", "scope:payment"]

// apps/management-app/project.json
"tags": ["type:app", "scope:management"]

// apps/customer-pwa/project.json
"tags": ["type:app", "scope:customer"]
```

- [ ] **Step 5: Decide management app test target**

Because `apps/management-app/jest.config.cjs` and many `*.spec.ts(x)` files already exist, add this target:

```json
"test": {
  "executor": "@nx/jest:jest",
  "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
  "options": {
    "jestConfig": "apps/management-app/jest.config.cjs",
    "passWithNoTests": true
  }
}
```

Do not add a new test framework and do not modify `apps/management-app/package.json` for this target.

- [ ] **Step 6: Verify config and Nx**

Run:

```bash
npx nx test payment --testFile=apps/payment/src/configuration/index.spec.ts
npx nx show project payment --json
npx nx lint payment --skip-nx-cache
npx nx lint management-app --skip-nx-cache
npx nx build payment --configuration=development --skip-nx-cache
npx nx build management-app --skip-nx-cache
```

Expected:

- Payment config tests pass.
- `nx show project payment --json` includes `["type:app","scope:payment"]`.
- No new lint/build errors.

- [ ] **Step 7: Commit**

```bash
git add apps/payment/src/configuration apps/payment/project.json apps/management-app/project.json apps/customer-pwa/project.json .env.example
git commit -m "chore(payment): align config and nx metadata"
```

## 4. Verification Gate Before Calling Refactor Complete

Run all commands below without relying on Nx cache for builds/lints:

```bash
npx nx test shared-types
npx nx test payment
npx nx test order --testFile=apps/order/src/app/modules/order/tests/payment-events-consumer.service.spec.ts
npx nx test bff --testFile=apps/bff/src/app/modules/payment/tests/payment.controller.spec.ts
npx nx lint payment --skip-nx-cache
npx nx lint order --skip-nx-cache
npx nx lint bff --skip-nx-cache
npx nx lint management-app --skip-nx-cache
npx nx build entities --skip-nx-cache
npx nx build payment --configuration=development --skip-nx-cache
npx nx build order --configuration=development --skip-nx-cache
npx nx build management-app --skip-nx-cache
```

Expected:

- Payment, Order, BFF, shared-types tests pass.
- No new lint errors.
- Builds pass.
- Any pre-existing warnings are listed in the final implementation report and not mixed with new warnings.

## 5. Deferred Work After This Refactor

These items should not be folded into the safe refactor unless explicitly approved:

- Implement Kafka -> BFF WebSocket bridge for `payment.completed` and `payment.refunded`.
- Implement Order settlement side effects that close session and transition table `Billing -> Cleaning`.
- Add multi-instance `FOR UPDATE SKIP LOCKED` outbox claiming.
- Replace `synchronize: true` with explicit migrations for Payment and Order.
- Clean unrelated BFF guard-spec `any` warnings and management UI warnings.

## 6. Self-Review

- Spec coverage: P3-A01 through P3-A12 are covered by Tasks 1-8. C1-C6 add contradictions found in base docs.
- Placeholder scan: no unresolved placeholder decisions remain; deferred items are explicitly listed out of scope.
- Type consistency: shared `PaymentStatusValue`/`RefundStatusValue` are the planned type aliases; runtime const objects remain `PaymentStatus` and `RefundStatus`.
- Risk control: business behavior tests are added before structural service split.
- Architecture control: no Payment Redis dependency is introduced; Payment remains DB/outbox based.
