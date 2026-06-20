# Order Confirm Stock Idempotency Implementation Plan

> **Execution status:** Implemented and verified on 2026-06-20. The detailed unchecked boxes below preserve the original TDD execution sequence; they are not the current progress indicator.
> **AI/slide handoff:** The earlier audit saying Catalog ignored the key is superseded. Read `Implementation Completion Record` before deriving slide claims.
> **Do not re-execute:** The remaining unchecked task steps are historical sequencing detail. Use the checked completion criteria and current code/tests as the implementation status.

**Goal:** Make Order Confirm stock deduction, compensation, and processing-order cancellation idempotent across the Order-Catalog TCP boundary.

**Architecture:** Catalog owns a PostgreSQL `stock_reservations` state record per tenant/order. Deduct is an idempotent `ensure RESERVED` command; release is versioned so duplicate or stale compensation cannot mutate stock. Order stores the successful reservation version in the same transaction as `PROCESSING` and `order.confirmed` outbox.

**Tech Stack:** Nx monorepo, NestJS, TypeScript, TypeORM, PostgreSQL, Nest TCP microservices, RxJS, Jest.

---

## Implementation Completion Record

| Area                                        | Status              | Current evidence                                                                                           |
| ------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| Shared state, TCP contracts, and error code | Complete            | `StockReservationState`, operation envelope, versioned release request, `CATALOG_STOCK_OPERATION_CONFLICT` |
| Catalog and Order migrations                | Complete            | `1781971200000-AddStockReservations.ts`, `1781971201000-AddOrderStockReservationVersion.ts`                |
| Catalog durable reservation state machine   | Complete            | applied, replayed, stale, conflict, reconfirm, and legacy transitions                                      |
| Catalog controller/module wiring            | Complete            | stock commands delegate to `StockReservationService`                                                       |
| Order Catalog gateway                       | Complete            | typed response validation and bounded first-response timeout                                               |
| Order Confirm Saga                          | Complete            | returned version persisted with `PROCESSING` and outbox; versioned compensation                            |
| Processing cancellation                     | Complete            | versioned release plus null-version legacy compatibility                                                   |
| Unit/contract verification                  | Complete            | Catalog 88 tests; Order 120 tests                                                                          |
| PostgreSQL/Catalog TCP fault injection      | Complete            | lost response/retry and version/stale-release integration: 3 tests                                         |
| Stock concurrency integration               | Complete            | one success, one stock failure, one outbox: 1 test                                                         |
| Canonical docs and Slide 22-23              | Complete            | Phase 4A, Saga validation, architecture, business logic, doc anchors, slide builder                        |
| Final commit/merge                          | Outside this record | Working tree contains unrelated thesis/deck changes; stage only task-owned files                           |

### Current claim for slide generation

Use this statement:

> Catalog persists the reservation key, immutable payload hash, stored result, state, and version in the same PostgreSQL transaction as the stock mutation. Active replay does not deduct twice; versioned release makes duplicate compensation idempotent and stale compensation harmless.

Do not reuse this superseded pre-implementation statement:

> The request carries an operation key, but Catalog-side deduplication by key is not implemented.

Remaining boundary:

- ambiguous-response recovery is retry-driven;
- without a caller retry, an abandoned reservation is not recovered automatically;
- no autonomous Saga worker or exactly-once delivery guarantee is claimed.

### Verification Snapshot

Verified on 2026-06-20:

```text
Catalog unit suite:                    13 suites / 88 tests passed
Order unit suite:                      19 active suites / 120 tests passed
Order Confirm idempotency integration: 1 suite / 3 tests passed
Stock concurrency integration:         1 suite / 1 test passed
Catalog and Order lint:                passed
shared-types/entities/Catalog/Order:   build passed
interfaces Nx build target:            not configured; covered by consuming builds
Documentation anchors:                 55 verified
```

Implementation added one focused controller spec and updated database-ownership verification in addition to the original target list. These are intentional verification improvements, not scope expansion.

---

## Reference Context

- Design spec: `docs/superpowers/specs/2026-06-20-order-confirm-stock-idempotency-design.md`
- Canonical phase record: `docs/phases/phase-4a-saga-hardening.md`
- Saga evidence guide: `docs/testing/phase-5/saga-validation-strategy.md`
- Order orchestrator: `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- Order Catalog gateway: `apps/order/src/app/modules/order/services/catalog-stock-gateway.service.ts`
- Processing cancellation: `apps/order/src/app/modules/order/services/order-state-transition.service.ts`
- Catalog stock implementation: `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`
- Shared TCP contracts: `libs/interfaces/src/lib/tcp/catalog/`

## Start-Of-Session Protocol

- [ ] Read `AGENTS.md`, the design spec, and this plan.
- [ ] Run CodeGraph before direct edits:

```bash
codegraph status .
codegraph context "Implement Order Confirm stock reservation idempotency across Order and Catalog"
codegraph impact StockMutationResult
codegraph callers releaseForOrder
```

- [ ] Inspect `git status --short`; do not stage, overwrite, or revert unrelated thesis/deck changes.
- [ ] Follow TDD for each behavior: failing focused test, minimal implementation, passing focused test.
- [ ] Keep all stock writes inside Catalog. Do not import Catalog repositories/entities into Order.
- [ ] Keep tenant scope in every reservation read, lock, unique constraint, and mutation.
- [ ] Do not add a Saga framework, background worker, Redis lock, CDC, or generic idempotency library.

## Target File Structure

### Shared libraries

- Modify `libs/constants/src/lib/enum/catalog.enum.ts`
- Modify `libs/error-messages/src/lib/error-code.enum.ts`
- Modify `libs/error-messages/src/lib/error-messages.en.ts`
- Modify `libs/error-messages/src/lib/error-messages.vi.ts`
- Modify `libs/interfaces/src/lib/tcp/catalog/menu-item-request.interface.ts`
- Modify `libs/interfaces/src/lib/tcp/catalog/menu-item-response.interface.ts`
- Modify `libs/shared/types/src/lib/menu.types.ts`
- Modify `libs/shared/types/src/index.ts`
- Create `libs/entities/src/lib/stock-reservation.entity.ts`
- Modify `libs/entities/src/lib/order.entity.ts`
- Modify `libs/entities/src/index.ts`

### Catalog

- Create `apps/catalog/src/database/migrations/1781971200000-AddStockReservations.ts`
- Modify `apps/catalog/src/database/catalog.data-source.ts`
- Modify `apps/catalog/src/database/catalog.data-source.spec.ts`
- Modify `apps/catalog/src/app/app.module.ts`
- Modify `apps/catalog/src/app/modules/menu-item/menu-item.module.ts`
- Create `apps/catalog/src/app/modules/menu-item/utils/stock-mutation.util.ts`
- Create `apps/catalog/src/app/modules/menu-item/tests/stock-mutation.util.spec.ts`
- Create `apps/catalog/src/app/modules/menu-item/repositories/stock-reservation.repository.ts`
- Create `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`
- Create `apps/catalog/src/app/modules/menu-item/tests/stock-reservation.service.spec.ts`
- Modify `apps/catalog/src/app/modules/menu-item/controllers/menu-item.controller.ts`
- Modify `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`
- Modify `apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts`

### Order

- Create `apps/order/src/database/migrations/1781971201000-AddOrderStockReservationVersion.ts`
- Modify `apps/order/src/app/modules/order/services/catalog-stock-gateway.service.ts`
- Modify `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- Modify `apps/order/src/app/modules/order/services/order-state-transition.service.ts`
- Modify `apps/order/src/app/modules/order/tests/catalog-stock-gateway.service.spec.ts`
- Modify `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`
- Modify `apps/order/src/app/modules/order/tests/order-state-transition.service.spec.ts`
- Modify `apps/order/src/app/modules/order/tests/order-stock-concurrency.integration.spec.ts`
- Create `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`

### Documentation

- Modify `docs/phases/phase-4a-saga-hardening.md`
- Modify `docs/testing/phase-5/saga-validation-strategy.md`
- Modify `docs/technical-architecture.md`
- Modify `docs/business-logic.md`
- Modify `docs/DOC-CODE-ANCHORS.md`
- Modify `docs/graduation-thesis-resources/thesis-defense-slide-builder-script.md`

## Task 1: Add Shared State, Contract, And Error Types

**Files:**

- Modify `libs/constants/src/lib/enum/catalog.enum.ts`
- Modify `libs/error-messages/src/lib/error-code.enum.ts`
- Modify `libs/error-messages/src/lib/error-messages.en.ts`
- Modify `libs/error-messages/src/lib/error-messages.vi.ts`
- Modify `libs/interfaces/src/lib/tcp/catalog/menu-item-request.interface.ts`
- Modify `libs/interfaces/src/lib/tcp/catalog/menu-item-response.interface.ts`
- Modify `libs/shared/types/src/lib/menu.types.ts`
- Modify `libs/shared/types/src/index.ts`
- Test `libs/error-messages/src/lib/__tests__/error-messages.registry.spec.ts`

- [ ] **Step 1: Add a failing registry test for the new conflict code**

Add this assertion to the existing registry spec:

```typescript
expect(getErrorMessage(ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT, 'en')).toBe(
  'Stock reservation conflicts with an existing operation',
);
expect(getErrorMessage(ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT, 'vi')).toBe(
  'Thao tác giữ tồn kho xung đột với yêu cầu đã xử lý',
);
```

- [ ] **Step 2: Run the focused test and verify it fails at compile time**

```bash
pnpm nx test error-messages --testPathPatterns=error-messages.registry.spec.ts --runInBand --skip-nx-cache
```

Expected: FAIL because `CATALOG_STOCK_OPERATION_CONFLICT` does not exist.

- [ ] **Step 3: Add the shared state and error definitions**

Add to `catalog.enum.ts`:

```typescript
export enum StockReservationState {
  Reserved = 'RESERVED',
  Released = 'RELEASED',
}
```

Add to `ErrorCode` and both message maps:

```typescript
CATALOG_STOCK_OPERATION_CONFLICT = 'CATALOG_STOCK_OPERATION_CONFLICT',
```

- [ ] **Step 4: Move the reusable stock result shape into shared types and add the operation envelope**

Add to `libs/shared/types/src/lib/menu.types.ts` and export it from the shared-types index:

```typescript
export type StockMutationResult = {
  menuItemId: string;
  menuItemName: string;
  requestedQuantity: number;
  remainingStock: number;
  status: MenuItemStatus;
};
```

Import and re-export that type from the Catalog TCP response interface, then add:

```typescript
export type StockMutationOutcome = 'APPLIED' | 'REPLAYED' | 'STALE';

export type StockMutationOperationResult = {
  reservationVersion: number;
  outcome: StockMutationOutcome;
  items: StockMutationResult[];
};
```

Add `reservationVersion` to release requests:

```typescript
export type StockReleaseForOrderTcpRequest = {
  tenantId: string;
  orderId: string;
  idempotencyKey: string;
  reservationVersion: number | null;
  items: ValidateOrderableItemInput[];
};
```

- [ ] **Step 5: Run focused tests and typecheck shared libraries**

```bash
pnpm nx test error-messages --testPathPatterns=error-messages.registry.spec.ts --runInBand --skip-nx-cache
pnpm nx build shared-types --skip-nx-cache
pnpm nx build interfaces --skip-nx-cache
pnpm nx build entities --skip-nx-cache
```

Expected: registry test passes; interfaces build may expose the callers that Task 5 and Task 6 will update.

- [ ] **Step 6: Commit the shared contract checkpoint**

```bash
git add libs/constants/src/lib/enum/catalog.enum.ts libs/error-messages/src/lib libs/interfaces/src/lib/tcp/catalog libs/shared/types/src
git commit -m "feat(catalog): define versioned stock reservation contract"
```

## Task 2: Add Catalog Reservation And Order Version Persistence

**Files:**

- Create `libs/entities/src/lib/stock-reservation.entity.ts`
- Modify `libs/entities/src/lib/order.entity.ts`
- Modify `libs/entities/src/index.ts`
- Create `apps/catalog/src/database/migrations/1781971200000-AddStockReservations.ts`
- Create `apps/order/src/database/migrations/1781971201000-AddOrderStockReservationVersion.ts`
- Modify `apps/catalog/src/database/catalog.data-source.ts`
- Modify `apps/catalog/src/database/catalog.data-source.spec.ts`
- Modify `apps/catalog/src/app/app.module.ts`
- Modify `apps/catalog/src/app/modules/menu-item/menu-item.module.ts`

- [ ] **Step 1: Update the Catalog DataSource test first**

Change the expected Catalog entities to:

```typescript
expect(entityNames).toEqual(['Area', 'Category', 'MenuItem', 'StockReservation', 'Table']);
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
pnpm nx test catalog --testPathPatterns=catalog.data-source.spec.ts --runInBand --skip-nx-cache
```

Expected: FAIL because `StockReservation` is not registered.

- [ ] **Step 3: Create the Catalog-owned entity**

Use this shape:

```typescript
import { StockReservationState } from '@common/constants/enum/catalog.enum';
import type { StockMutationResult } from '@einvoice/types';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'stock_reservations' })
@Index('uq_stock_reservations_tenant_order', ['tenantId', 'orderId'], { unique: true })
@Index('uq_stock_reservations_tenant_key', ['tenantId', 'reservationKey'], { unique: true })
export class StockReservation extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'reservation_key', type: 'varchar', length: 128 })
  reservationKey: string;

  @Column({ name: 'request_hash', type: 'char', length: 64 })
  requestHash: string;

  @Column({ type: 'int', default: 0 })
  version: number;

  @Column({ type: 'varchar', length: 20, default: StockReservationState.Released })
  state: StockReservationState;

  @Column({ name: 'deduct_result', type: 'jsonb', nullable: true })
  deductResult: StockMutationResult[] | null;

  @Column({ name: 'release_result', type: 'jsonb', nullable: true })
  releaseResult: StockMutationResult[] | null;

  @Column({ name: 'last_release_key', type: 'varchar', length: 128, nullable: true })
  lastReleaseKey: string | null;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt: Date | null;
}
```

- [ ] **Step 4: Add the Order field**

Add to `Order`:

```typescript
@Column({ name: 'stock_reservation_version', type: 'int', nullable: true })
stockReservationVersion: number | null;
```

- [ ] **Step 5: Create additive migrations**

Catalog migration `up` must create the table, check constraint, and unique indexes:

```sql
CREATE TABLE "stock_reservations" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  "tenant_id" character varying(64) NOT NULL,
  "order_id" uuid NOT NULL,
  "reservation_key" character varying(128) NOT NULL,
  "request_hash" character(64) NOT NULL,
  "version" integer NOT NULL DEFAULT 0,
  "state" character varying(20) NOT NULL DEFAULT 'RELEASED',
  "deduct_result" jsonb,
  "release_result" jsonb,
  "last_release_key" character varying(128),
  "released_at" TIMESTAMP,
  CONSTRAINT "CHK_stock_reservations_version" CHECK ("version" >= 0),
  CONSTRAINT "PK_stock_reservations" PRIMARY KEY ("id")
)
```

Order migration `up`:

```sql
ALTER TABLE "orders" ADD "stock_reservation_version" integer
```

Each `down` reverses only its additive schema change.

- [ ] **Step 6: Register the entity only in Catalog**

Add `StockReservation` to:

- Catalog migration DataSource entities;
- Catalog `createTypeOrmProvider` entities;
- `TypeOrmModule.forFeature` in `MenuItemModule`;
- `libs/entities/src/index.ts` exports.

Do not register it in Order.

- [ ] **Step 7: Verify entity ownership and builds**

```bash
pnpm nx test catalog --testPathPatterns=catalog.data-source.spec.ts --runInBand --skip-nx-cache
pnpm nx test order --testPathPatterns=order.data-source.spec.ts --runInBand --skip-nx-cache
pnpm nx build entities --skip-nx-cache
```

Expected: Catalog includes `StockReservation`; Order entity inventory remains unchanged except for the new `Order` column mapping.

- [ ] **Step 8: Commit the persistence checkpoint**

```bash
git add libs/entities apps/catalog/src/database apps/order/src/database apps/catalog/src/app/app.module.ts apps/catalog/src/app/modules/menu-item/menu-item.module.ts
git commit -m "feat(catalog): persist stock reservation state"
```

## Task 3: Add Deterministic Stock Payload Normalization

**Files:**

- Create `apps/catalog/src/app/modules/menu-item/utils/stock-mutation.util.ts`
- Create `apps/catalog/src/app/modules/menu-item/tests/stock-mutation.util.spec.ts`

- [ ] **Step 1: Write failing utility tests**

Cover aggregation, sorting, invalid quantity, and stable hash:

```typescript
it('aggregates duplicate item ids and returns deterministic sorted entries', () => {
  expect(
    normalizeStockItems([
      { menuItemId: 'b', quantity: 1 },
      { menuItemId: 'a', quantity: 2 },
      { menuItemId: 'b', quantity: 3 },
    ]),
  ).toEqual([
    { menuItemId: 'a', quantity: 2 },
    { menuItemId: 'b', quantity: 4 },
  ]);
});

it('hashes equivalent payloads identically regardless of input order', () => {
  expect(
    hashStockItems([
      { menuItemId: 'b', quantity: 1 },
      { menuItemId: 'a', quantity: 2 },
    ]),
  ).toBe(
    hashStockItems([
      { menuItemId: 'a', quantity: 2 },
      { menuItemId: 'b', quantity: 1 },
    ]),
  );
});
```

- [ ] **Step 2: Run the utility spec and verify it fails**

```bash
pnpm nx test catalog --testPathPatterns=stock-mutation.util.spec.ts --runInBand --skip-nx-cache
```

- [ ] **Step 3: Implement the utility**

The implementation must:

```typescript
export function normalizeStockItems(items: ValidateOrderableItemInput[]): ValidateOrderableItemInput[];
export function hashStockItems(items: ValidateOrderableItemInput[]): string;
```

- aggregate quantities with a `Map<string, number>`;
- reject non-finite or `< 1` totals with `COMMON_VALIDATION_FAILED`;
- sort by `menuItemId`;
- hash `menuItemId:quantity` pairs joined with `|` using `createHash('sha256')`.

- [ ] **Step 4: Run the utility spec**

```bash
pnpm nx test catalog --testPathPatterns=stock-mutation.util.spec.ts --runInBand --skip-nx-cache
```

Expected: PASS.

## Task 4: Implement Catalog Reservation State Machine With TDD

**Files:**

- Create `apps/catalog/src/app/modules/menu-item/repositories/stock-reservation.repository.ts`
- Create `apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts`
- Create `apps/catalog/src/app/modules/menu-item/tests/stock-reservation.service.spec.ts`
- Modify `apps/catalog/src/app/modules/menu-item/repositories/menu-item.repository.ts`

- [ ] **Step 1: Create typed repository mocks and write the first failing deduct test**

The first test must assert:

```typescript
await expect(service.deductForOrder(request)).resolves.toEqual({
  reservationVersion: 1,
  outcome: 'APPLIED',
  items: [expect.objectContaining({ menuItemId: 'item-1', remainingStock: 8 })],
});
expect(inventory.stock).toBe(8);
expect(reservation).toMatchObject({
  state: StockReservationState.Reserved,
  version: 1,
  reservationKey: request.idempotencyKey,
});
```

- [ ] **Step 2: Run the spec and verify failure**

```bash
pnpm nx test catalog --testPathPatterns=stock-reservation.service.spec.ts --runInBand --skip-nx-cache
```

- [ ] **Step 3: Implement focused reservation locking methods**

Use these signatures:

```typescript
claimDeductForUpdate(
  tenantId: string,
  orderId: string,
  reservationKey: string,
  requestHash: string,
  manager: EntityManager,
): Promise<StockReservation>;

findByOrderForUpdate(
  tenantId: string,
  orderId: string,
  manager: EntityManager,
): Promise<StockReservation | null>;

claimLegacyReleaseForUpdate(
  tenantId: string,
  orderId: string,
  releaseKey: string,
  requestHash: string,
  manager: EntityManager,
): Promise<StockReservation>;
```

Implementation requirements:

1. Use the transaction manager repository in all methods.
2. Deduct claim inserts a version-0 released row with the deduct reservation key and `.orIgnore()`.
3. Legacy release claim inserts a version-0 released row with a deterministic `legacy-release:{orderId}` reservation key and `.orIgnore()`.
4. Select by `{ tenantId, orderId }` with `pessimistic_write`.
5. Throw `COMMON_INTERNAL_ERROR` when a claim method cannot reload its row.

- [ ] **Step 4: Implement first deduct and active replay**

`deductForOrder` must:

```typescript
async deductForOrder(data: StockDeductForOrderTcpRequest): Promise<StockMutationOperationResult>
```

Inside one Catalog transaction:

1. Normalize items and compute hash.
2. Claim and lock reservation.
3. Reject different key/hash with `CATALOG_STOCK_OPERATION_CONFLICT`.
4. If state is `RESERVED`, return stored deduct result with `REPLAYED`.
5. Otherwise lock menu rows in sorted order and validate all stock before any save.
6. Deduct, save rows, increment version, set `RESERVED`, clear release fields, save reservation.
7. Return `APPLIED` with the new version.

- [ ] **Step 5: Add failing tests for all remaining transitions**

Add separate tests for:

- active duplicate deduct does not call `manager.save(MenuItem, ...)`;
- payload mismatch returns `CATALOG_STOCK_OPERATION_CONFLICT`;
- insufficient stock saves neither item nor reservation transition;
- matching release applies once;
- duplicate matching release returns `REPLAYED`;
- deduct after release increments version;
- old release returns `STALE` without saving menu items;
- future release version returns conflict;
- legacy null-version release with no prior row applies once;
- duplicate legacy release returns `REPLAYED`.

- [ ] **Step 6: Implement versioned release**

`releaseForOrder` must:

```typescript
async releaseForOrder(data: StockReleaseForOrderTcpRequest): Promise<StockMutationOperationResult>
```

Rules:

- validate the immutable request hash;
- treat the release `idempotencyKey` as the release audit key and persist it in `lastReleaseKey`; do not compare it with the deduct `reservationKey`;
- for `reservationVersion < current`, return `{ outcome: 'STALE', items: [] }`;
- for `reservationVersion > current`, throw operation conflict;
- for matching already released version, return stored release result as `REPLAYED`;
- for matching reserved version, lock items, restore stock, set `RELEASED`, persist release result/key/time, return `APPLIED`;
- accept null version only for the documented version-0 legacy claim path.

- [ ] **Step 7: Run state-machine and existing menu tests**

```bash
pnpm nx test catalog --testPathPatterns='stock-reservation.service.spec.ts|menu-item.service.spec.ts|stock-mutation.util.spec.ts' --runInBand --skip-nx-cache
```

Expected: all transition tests pass; existing Catalog CRUD behavior remains unchanged.

- [ ] **Step 8: Commit the Catalog domain checkpoint**

```bash
git add apps/catalog/src/app/modules/menu-item
git commit -m "feat(catalog): make stock reservations idempotent"
```

## Task 5: Wire Catalog Controller And Module

**Files:**

- Modify `apps/catalog/src/app/modules/menu-item/controllers/menu-item.controller.ts`
- Modify `apps/catalog/src/app/modules/menu-item/menu-item.module.ts`
- Modify `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`
- Modify `apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts`

- [ ] **Step 1: Update controller contract tests or add focused expectations**

Assert both message handlers delegate to `StockReservationService` and return:

```typescript
Response.success<StockMutationOperationResult>(operationResult);
```

- [ ] **Step 2: Move stock ownership out of `MenuItemService`**

- remove `deductForOrder`, `releaseForOrder`, `aggregateQuantities`, and `ensurePositiveQuantities` from `MenuItemService`;
- move stock-specific tests from `menu-item.service.spec.ts` to `stock-reservation.service.spec.ts`;
- inject `StockReservationService` into `MenuItemController`;
- register `StockReservationService` and `StockReservationRepository` in `MenuItemModule`.

- [ ] **Step 3: Run Catalog tests and lint**

```bash
pnpm nx test catalog --runInBand --skip-nx-cache
pnpm nx lint catalog --skip-nx-cache
```

Expected: Catalog test suite and lint pass.

## Task 6: Update Order Catalog Gateway And Timeout Contract

**Files:**

- Modify `apps/order/src/app/modules/order/services/catalog-stock-gateway.service.ts`
- Modify `apps/order/src/app/modules/order/tests/catalog-stock-gateway.service.spec.ts`

- [ ] **Step 1: Update tests to expect the operation envelope**

Use fixtures such as:

```typescript
const operationResult: StockMutationOperationResult = {
  reservationVersion: 1,
  outcome: 'APPLIED',
  items: [
    {
      menuItemId: 'm1',
      menuItemName: 'Pho',
      requestedQuantity: 2,
      remainingStock: 8,
      status: MENU_ITEM_STATUS.AVAILABLE,
    },
  ],
};
```

Assert `deductForOrder` and `releaseForOrder` return this object without unwrapping its `items` array.

- [ ] **Step 2: Add a fake-timer timeout test**

Use a never-emitting Observable and assert the gateway rejects with `COMMON_INTERNAL_ERROR`/`BAD_GATEWAY` after the named timeout.

- [ ] **Step 3: Implement the new return type and bounded timeout**

Add a named constant:

```typescript
const STOCK_MUTATION_TCP_TIMEOUT_MS = 5_000;
```

Apply:

```typescript
.pipe(timeout({ first: STOCK_MUTATION_TCP_TIMEOUT_MS }))
```

Return only a structurally valid `StockMutationOperationResult`; an absent/malformed result maps to the existing gateway internal error instead of silently returning `[]`.

- [ ] **Step 4: Run focused gateway tests**

```bash
pnpm nx test order --testPathPatterns=catalog-stock-gateway.service.spec.ts --runInBand --skip-nx-cache
```

Expected: payload, business-error, envelope, and timeout tests pass.

## Task 7: Persist Reservation Version In Order Confirm Saga

**Files:**

- Modify `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- Modify `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`

- [ ] **Step 1: Update the success test first**

Catalog deduct must resolve:

```typescript
{
  reservationVersion: 1,
  outcome: 'APPLIED',
  items: [stockResult],
}
```

Assert the saved Order contains:

```typescript
expect.objectContaining({
  status: OrderStatus.PROCESSING,
  stockReservationVersion: 1,
});
```

- [ ] **Step 2: Update compensation tests**

Assert release receives:

```typescript
{
  tenantId: 't1',
  orderId: 'o1',
  idempotencyKey: 'confirm-order-compensation:o1:1',
  reservationVersion: 1,
  items: [{ menuItemId: 'm1', quantity: 2 }],
}
```

Add tests for:

- deduct transport failure before an acknowledged result does not compensate;
- replayed deduct result still commits Order with its returned version;
- compensation log contains `reservationVersion=1`;
- replay of an already `PROCESSING` order does not call Catalog.

- [ ] **Step 3: Implement the minimal Saga changes**

- capture `StockMutationOperationResult` from deduct;
- set `stockDeducted = true` only after a valid result;
- add `reservationVersion` to `StockCompensationPayload`;
- set `order.stockReservationVersion` before saving Order;
- include version in the compensation key and release request;
- keep the original error when compensation fails.

For errors raised while saving Order/items/outbox inside the transaction callback, attempt compensation before rethrowing so the order row remains locked during the normal compensation path. Keep the outer compensation guard for transaction commit rejection, relying on Catalog release idempotency.

- [ ] **Step 4: Run the focused Saga tests**

```bash
pnpm nx test order --testPathPatterns=order-confirm-saga.service.spec.ts --runInBand --skip-nx-cache
```

Expected: success, Order replay, Catalog error, compensation, compensation failure, and returned-version replay all pass.

## Task 8: Keep Processing Cancellation Idempotent

**Files:**

- Modify `apps/order/src/app/modules/order/services/order-state-transition.service.ts`
- Modify `apps/order/src/app/modules/order/tests/order-state-transition.service.spec.ts`

- [ ] **Step 1: Update cancellation tests first**

For a new confirmed order fixture set:

```typescript
stockReservationVersion: 2,
```

Assert release receives:

```typescript
expect(catalogStockGateway.releaseForOrder).toHaveBeenCalledWith({
  tenantId: 't1',
  orderId: 'o1',
  idempotencyKey: 'cancel-processing:o1:2',
  reservationVersion: 2,
  items: [{ menuItemId: 'm1', quantity: 2 }],
});
```

Add a legacy fixture with `stockReservationVersion: null` and assert the request carries `reservationVersion: null` and a `cancel-processing:o1:legacy` key.

- [ ] **Step 2: Implement cancellation request changes**

Build the key from the stored version:

```typescript
const reservationVersion = ord.stockReservationVersion;
const releaseKey =
  reservationVersion === null
    ? `cancel-processing:${ord.id}:legacy`
    : `cancel-processing:${ord.id}:${reservationVersion}`;
```

Pass `reservationVersion` to Catalog. Do not directly inspect Catalog state from Order.

- [ ] **Step 3: Run state transition and Saga tests together**

```bash
pnpm nx test order --testPathPatterns='order-state-transition.service.spec.ts|order-confirm-saga.service.spec.ts' --runInBand --skip-nx-cache
```

Expected: cancellation and confirmation stock paths pass with versioned requests.

- [ ] **Step 4: Commit the Order integration checkpoint**

```bash
git add apps/order libs/entities/src/lib/order.entity.ts
git commit -m "feat(order): persist Catalog stock reservation version"
```

## Task 9: Add Real PostgreSQL Idempotency And Fault-Injection Evidence

**Files:**

- Modify `apps/order/src/app/modules/order/tests/order-stock-concurrency.integration.spec.ts`
- Create `apps/order/src/app/modules/order/tests/order-confirm-stock-idempotency.integration.spec.ts`

- [ ] **Step 1: Extend integration DataSources and cleanup**

- add `StockReservation` to the Catalog integration DataSource entity list;
- delete reservation rows before menu items during tenant cleanup;
- seed `stockReservationVersion: null` on PENDING orders;
- keep the existing opt-in environment variable `RUN_PHASE5_STOCK_INTEGRATION=1`.

- [ ] **Step 2: Add real duplicate-deduct test**

Send the same Catalog deduct command twice with the same tenant/order/key/items. Assert:

```typescript
expect(first.outcome).toBe('APPLIED');
expect(second.outcome).toBe('REPLAYED');
expect(second.reservationVersion).toBe(first.reservationVersion);
expect(finalMenuItem.stock).toBe(initialStock - requestedQuantity);
```

- [ ] **Step 3: Add lost-response fault injection without a production test hook**

In the new integration spec, instantiate `OrderConfirmSagaService` with the real Order DataSource/repositories and a test-local gateway wrapper around the real Catalog TCP gateway. The wrapper calls real Catalog once, discards the successful response, and throws a synthetic transport error. It delegates normally on the second call.

Exercise this sequence:

1. call real Catalog deduct and capture that it committed;
2. throw a synthetic transport error instead of returning the first response to Order;
3. assert Order remains `PENDING` and stock reflects one reservation;
4. retry confirm through the real Catalog command;
5. assert Order becomes `PROCESSING`, stock is still deducted once, and exactly one `order.confirmed` outbox exists.

Do not modify the production gateway with a fault-injection flag, special environment variable, or test-only branch.

- [ ] **Step 4: Add compensate-and-reconfirm version test**

Prove this sequence against real Catalog PostgreSQL:

```text
deduct v1 -> release v1 -> deduct v2 -> stale release v1
```

Assert final state is `RESERVED` version `2` and final stock has one net deduction.

- [ ] **Step 5: Preserve the existing stock contention test**

Run the existing two-orders/stock-one scenario and keep expectations: one `PROCESSING`, one `PENDING`, stock `0`, one outbox.

- [ ] **Step 6: Run opt-in integration**

```bash
RUN_PHASE5_STOCK_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-stock-concurrency.integration.spec.ts --runInBand --skip-nx-cache
RUN_PHASE5_STOCK_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-confirm-stock-idempotency.integration.spec.ts --runInBand --skip-nx-cache
```

Expected: all idempotency, compensation-version, and contention cases pass with real service databases/TCP prerequisites.

## Task 10: Update Canonical Docs And Defense Slides

**Files:**

- Modify `docs/phases/phase-4a-saga-hardening.md`
- Modify `docs/testing/phase-5/saga-validation-strategy.md`
- Modify `docs/technical-architecture.md`
- Modify `docs/business-logic.md`
- Modify `docs/DOC-CODE-ANCHORS.md`
- Modify `docs/graduation-thesis-resources/thesis-defense-slide-builder-script.md`

- [ ] **Step 1: Update implementation claims only after tests pass**

Document these verified properties:

- Catalog persists a tenant/order stock reservation with payload hash and version;
- active deduct replay does not mutate stock;
- matching release replay does not mutate stock;
- compensation followed by reconfirm creates the next version;
- stale compensation cannot release the current reservation;
- no claim of automatic recovery without retry or exactly-once delivery.

- [ ] **Step 2: Correct Slide 22**

Replace the provisional limitation wording with verified behavior:

```text
Catalog persists the reservation key and version in the same transaction as the stock mutation. Repeating the active reservation returns the stored result instead of deducting stock again.
```

- [ ] **Step 3: Strengthen Slide 23 evidence**

Add the lost-response/retry scenario and cite the new integration test. Keep the boundary that automatic recovery without a retry remains future hardening.

- [ ] **Step 4: Add doc-code anchors**

Anchor at least:

- `StockReservationService`;
- `StockReservation` entity;
- focused stock reservation tests;
- Order-Catalog idempotency integration test.

- [ ] **Step 5: Verify documentation**

```bash
pnpm verify:doc-anchors
```

Expected: all anchors resolve.

## Task 11: Full Verification And Review

- [ ] **Step 1: Run focused suites without cache**

```bash
pnpm nx test catalog --runInBand --skip-nx-cache
pnpm nx test order --runInBand --skip-nx-cache
pnpm nx test error-messages --runInBand --skip-nx-cache
```

- [ ] **Step 2: Run builds and lint**

```bash
pnpm nx build entities --skip-nx-cache
pnpm nx build interfaces --skip-nx-cache
pnpm nx build catalog --skip-nx-cache
pnpm nx build order --skip-nx-cache
pnpm nx lint catalog --skip-nx-cache
pnpm nx lint order --skip-nx-cache
```

- [ ] **Step 3: Run migration/ownership verification available in the repo**

```bash
pnpm nx test catalog --testPathPatterns=catalog.data-source.spec.ts --runInBand --skip-nx-cache
pnpm nx test order --testPathPatterns=order.data-source.spec.ts --runInBand --skip-nx-cache
pnpm verify:doc-anchors
```

- [ ] **Step 4: Inspect affected graph and diff**

```bash
codegraph sync .
codegraph affected apps/catalog/src/app/modules/menu-item/services/stock-reservation.service.ts apps/order/src/app/modules/order/services/order-confirm-saga.service.ts
git diff --check
git status --short
```

- [ ] **Step 5: Perform the five-axis code review**

Confirm:

- correctness: every transition in the design table has a test;
- readability: reservation logic is outside Menu CRUD service;
- architecture: no cross-service database access;
- security/isolation: every reservation query includes tenant and order;
- performance: deterministic locks and indexed unique lookups prevent scans/deadlock-prone ordering.

- [ ] **Step 6: Commit only task-owned files**

```bash
git add libs/constants/src/lib/enum/catalog.enum.ts libs/error-messages/src/lib libs/interfaces/src/lib/tcp/catalog libs/shared/types/src/lib/menu.types.ts libs/shared/types/src/index.ts libs/entities/src/lib/stock-reservation.entity.ts libs/entities/src/lib/order.entity.ts libs/entities/src/index.ts apps/catalog apps/order docs/phases/phase-4a-saga-hardening.md docs/testing/phase-5/saga-validation-strategy.md docs/technical-architecture.md docs/business-logic.md docs/DOC-CODE-ANCHORS.md docs/graduation-thesis-resources/thesis-defense-slide-builder-script.md
git commit -m "feat: complete Order Confirm stock idempotency"
```

Do not stage unrelated pre-existing thesis, presentation, image, or generated-file changes.

## Completion Criteria

- [x] One active order reservation produces one net stock deduction under retry.
- [x] Duplicate release produces one net stock restoration.
- [x] Compensation followed by reconfirm increments the reservation version.
- [x] Stale release does not mutate a newer reservation.
- [x] Order confirmation stores reservation version with state/outbox atomically.
- [x] Processing cancellation uses the stored version, including documented legacy compatibility.
- [x] Catalog and Order unit/contract suites pass.
- [x] Real PostgreSQL lost-response fault injection passes when integration prerequisites are available.
- [x] Builds, lint, DataSource ownership tests, doc anchors, and `git diff --check` pass.
- [x] Slide 22-23 claims match the verified implementation and do not claim autonomous recovery or exactly-once delivery.
