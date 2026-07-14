# Customer PWA Server-State Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Customer PWA server-state ownership explicit and consistent: split the Order React Query module by aggregate, give Payment its own mutation hook, and remove superseded local-cart code.

**Architecture:** React Query remains the single client-side cache for server-owned cart, order, bill, and payment-command state. `SessionProvider` remains the sole owner of persisted customer-session UI state. The Order feature exposes query keys from a dependency-light module so Socket.IO invalidation can share the same cache addresses without importing query/mutation implementations.

**Tech Stack:** React 19, TypeScript, TanStack React Query v5, Socket.IO client, Jest + Testing Library, Nx, ESLint, Vite.

---

## Scope and non-goals

In scope:

- Split `features/order/hooks/use-order-query.ts` by cart, order, bill, and shared query-key responsibilities without changing API contracts or user-visible behavior.
- Preserve cart optimistic update, rollback on cart conflict, cart-version handling, idempotency, current-bill polling, and Socket.IO invalidation behavior.
- Add a Payment feature mutation hook for VietQR creation.
- Remove the unmounted, mock-era `CartProvider` and its unused menu component tree.
- Document the PWA state-ownership rule in the codebase reading map.

Out of scope:

- Changing BFF, Order, Payment, Redis, database, or Socket.IO contracts.
- Introducing a global state library, changing React Query defaults, or changing retry/refetch policy.
- Moving business rules from backend to frontend.
- Refactoring unrelated Management App hooks.

## Reference context and invariants

- Current source of truth: `apps/customer-pwa/src/features/order/services/order.service.ts` calls customer BFF endpoints; server owns cart versions, orders, bills, and all payment settlement state.
- Client cart writes must send the last server `cartVersion`; a 409 / `CART_VERSION_CONFLICT` must restore the previous cache and refetch the cart.
- Order submit must preserve `createAndPersistIdempotencyKey()` and must not send cart item data in the request.
- Current-bill polling remains exactly 3 seconds only while bill is `PENDING_PAYMENT` or cart is `LOCKED`.
- Socket.IO keeps invalidating the exact same tenant/session query keys after reconnect and matching events.
- Do not reintroduce `CartProvider`; it would create a second client-side source of truth for a Redis-backed cart.
- Do not delete the legacy files until static-import checks and the Customer PWA test/build gate pass.

## Target file structure

### Order feature

- Create `apps/customer-pwa/src/features/order/hooks/order-query-keys.ts`
  - Owns `cartKeys`, `orderKeys`, and `billKeys` only.
- Create `apps/customer-pwa/src/features/order/hooks/cart-optimistic.ts`
  - Owns the pure `PatchVars`, note normalization, and optimistic cart transformation.
- Create `apps/customer-pwa/src/features/order/hooks/use-cart-query.ts`
  - Owns `useCustomerCartQuery()` and `useCartMutations()`.
- Create `apps/customer-pwa/src/features/order/hooks/use-bill-query.ts`
  - Owns `CurrentBillQueryData`, current-bill polling, `useCurrentBillQuery()`, and `useRequestBillMutation()`.
- Modify `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
  - Retains only order list/detail and submit/cancel/service-request hooks.
- Modify `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts`
  - Imports keys from `order-query-keys.ts`, not an implementation hook.

### Payment feature

- Create `apps/customer-pwa/src/features/payment/hooks/use-create-vietqr-mutation.ts`
  - Wraps `paymentService.createVietQrForCurrentBill()` with `useMutation`.
- Modify `apps/customer-pwa/src/features/payment/services/payment.service.ts`
  - Removes unused duplicate `requestBill()`; `requestBill()` remains an Order/Bill state transition.
- Modify `apps/customer-pwa/src/pages/request-payment-page.tsx`
  - Consumes the Payment mutation hook and retains local `vietQr` presentation state.

### Consumers and tests

- Modify `apps/customer-pwa/src/pages/menu-page.tsx`
- Modify `apps/customer-pwa/src/components/menu/cart-pill.tsx`
- Modify `apps/customer-pwa/src/pages/cart/cart-drawer.tsx`
- Modify `apps/customer-pwa/src/pages/order-tracking-page.tsx`
- Modify `apps/customer-pwa/src/pages/service-request-drawer.tsx`
- Modify the corresponding page and hook specs listed per task.

### Legacy removal and documentation

- Delete `apps/customer-pwa/src/features/cart/context/cart-provider.tsx`.
- Delete unused mock-era components:
  - `apps/customer-pwa/src/features/menu/components/cart-drawer.tsx`
  - `apps/customer-pwa/src/features/menu/components/cart-floating-button.tsx`
  - `apps/customer-pwa/src/features/menu/components/category-tabs.tsx`
  - `apps/customer-pwa/src/features/menu/components/menu-item-card.tsx`
  - `apps/customer-pwa/src/features/menu/components/menu-item-detail-drawer.tsx`
  - `apps/customer-pwa/src/features/menu/components/menu-items-grid.tsx`
- Modify `docs/guides/codebase-reading-map.md`.

## Task 1: Establish dependency-light query keys

**Files:**

- Create: `apps/customer-pwa/src/features/order/hooks/order-query-keys.ts`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.spec.tsx`

- [ ] **Step 1: Write a regression assertion that realtime invalidates the canonical session keys.**

  In `use-customer-order-realtime.spec.tsx`, import `cartKeys`, `billKeys`, and `orderKeys` from `./order-query-keys`. For its matching-session cart and payment event tests, assert the invalidation spy received the exact keys, including tenant and session:

  ```ts
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: cartKeys.snapshot('tenant-1', 'session-1'),
  });
  expect(invalidateSpy).toHaveBeenCalledWith({
    queryKey: billKeys.current('tenant-1', 'session-1'),
  });
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: orderKeys.all });
  ```

- [ ] **Step 2: Run the focused realtime test and verify the new import fails.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.spec.tsx --runInBand
  ```

  Expected: the suite fails because `./order-query-keys` does not exist.

- [ ] **Step 3: Create the canonical key module.**

  Add the following complete content to `order-query-keys.ts`:

  ```ts
  export const cartKeys = {
    all: ['customer-cart'] as const,
    snapshot: (tenantId: string, sessionId: string) => [...cartKeys.all, tenantId, sessionId] as const,
  };

  export const orderKeys = {
    all: ['customer-orders'] as const,
    list: (tenantId: string, sessionId: string) => [...orderKeys.all, 'list', tenantId, sessionId] as const,
    detail: (tenantId: string, sessionId: string, orderId: string) =>
      [...orderKeys.all, 'detail', tenantId, sessionId, orderId] as const,
  };

  export const billKeys = {
    all: ['customer-bill'] as const,
    current: (tenantId: string, sessionId: string) => [...billKeys.all, 'current', tenantId, sessionId] as const,
  };
  ```

  Remove the three key exports from `use-order-query.ts`, update `use-customer-order-realtime.ts` to import from `./order-query-keys`, and update all consumers in later tasks to import keys only from this module.

- [ ] **Step 4: Run the focused realtime regression test.**

  Run the command from Step 2.

  Expected: PASS; matching events still invalidate cart, current bill, and order list using tenant/session-scoped keys.

- [ ] **Step 5: Commit the isolated key extraction.**

  ```bash
  git add apps/customer-pwa/src/features/order/hooks/order-query-keys.ts \
    apps/customer-pwa/src/features/order/hooks/use-order-query.ts \
    apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts \
    apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.spec.tsx
  git commit -m "refactor(customer-pwa): extract order query keys"
  ```

## Task 2: Isolate and test the optimistic cart transformation

**Files:**

- Create: `apps/customer-pwa/src/features/order/hooks/cart-optimistic.ts`
- Create: `apps/customer-pwa/src/features/order/hooks/cart-optimistic.spec.ts`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`

- [ ] **Step 1: Add failing pure-function tests for the cart cases currently embedded in the hook.**

  Cover these behavior-preserving cases in `cart-optimistic.spec.ts`:

  ```ts
  it('merges ADD_ITEM into a matching menu item and normalized note', () => {
    const next = optimisticPatch(existingCart, {
      operation: 'ADD_ITEM',
      menuItemId: menuItem.id,
      menuItem,
      quantity: 2,
      note: '  Không cay  ',
    });

    expect(next.items).toHaveLength(1);
    expect(next.items[0]).toMatchObject({ quantity: 3, note: 'Không cay', lineVersion: 2 });
  });

  it('removes a line when SET_QUANTITY is zero', () => {
    expect(
      optimisticPatch(existingCart, { operation: 'SET_QUANTITY', cartLineId: 'line-1', quantity: 0 }).items,
    ).toEqual([]);
  });
  ```

  Also test ADD_ITEM with a different note creates a new optimistic line, UPDATE_NOTE trims and caps the note at 255 characters, REMOVE_LINE removes only its requested line, and CLEAR empties the cart.

- [ ] **Step 2: Run the new pure-function suite and verify it fails.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs apps/customer-pwa/src/features/order/hooks/cart-optimistic.spec.ts --runInBand
  ```

  Expected: FAIL because `cart-optimistic.ts` has not been created.

- [ ] **Step 3: Extract the pure logic without changing its behavior.**

  Move the code currently at `use-order-query.ts` lines 119–226 (`PatchVars`, `normalizeCartNote`, and `optimisticPatch`) into `cart-optimistic.ts`. Its exported input contract is:

  ```ts
  export type PatchVars = {
    operation: CartMutateOperation;
    menuItemId?: string;
    cartLineId?: string;
    quantity?: number;
    note?: string;
    menuItem?: PublicMenuItem;
  };
  ```

  Export `optimisticPatch(prev: CartSnapshot, vars: PatchVars): CartSnapshot`. Preserve every branch from the source: `ADD_ITEM`, `SET_QUANTITY`, `UPDATE_NOTE`, `REMOVE_LINE`, and `CLEAR`; preserve the `optimistic-${crypto.randomUUID() ?? Date.now()}` ID construction, `lineVersion` increments, 255-character note cap, and `updatedAt` writes. Import the two exports into `use-order-query.ts` temporarily. Do not change API payloads or the optimistic ID format in this task.

- [ ] **Step 4: Run the new suite plus the existing hook suite.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs \
    apps/customer-pwa/src/features/order/hooks/cart-optimistic.spec.ts \
    apps/customer-pwa/src/features/order/hooks/use-order-query.spec.tsx \
    --runInBand
  ```

  Expected: PASS; all previous cart optimistic tests remain green.

- [ ] **Step 5: Commit the pure cart logic extraction.**

  ```bash
  git add apps/customer-pwa/src/features/order/hooks/cart-optimistic.ts \
    apps/customer-pwa/src/features/order/hooks/cart-optimistic.spec.ts \
    apps/customer-pwa/src/features/order/hooks/use-order-query.ts
  git commit -m "refactor(customer-pwa): isolate optimistic cart state"
  ```

## Task 3: Split cart server-state hooks from Order hooks

**Files:**

- Create: `apps/customer-pwa/src/features/order/hooks/use-cart-query.ts`
- Create: `apps/customer-pwa/src/features/order/hooks/use-cart-query.spec.tsx`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
- Modify: `apps/customer-pwa/src/pages/menu-page.tsx`
- Modify: `apps/customer-pwa/src/components/menu/cart-pill.tsx`
- Modify: `apps/customer-pwa/src/pages/cart/cart-drawer.tsx`
- Modify: `apps/customer-pwa/src/pages/cart/cart-drawer.spec.tsx`

- [ ] **Step 1: Move the cart-only regression tests before moving implementation.**

  Create `use-cart-query.spec.tsx` by moving these existing tests from `use-order-query.spec.tsx` without weakening assertions:
  - loads cart snapshot before `ADD_ITEM` when cache is empty;
  - sends the pre-mutation server `cartVersion` after optimistic `ADD_ITEM`;
  - preserves image URL in optimistic cart line;
  - merges matching cart lines.

  Update imports to `./use-cart-query`; retain the same `QueryClientProvider` wrapper and mocked `orderService`.

- [ ] **Step 2: Run the moved test suite and verify it fails.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs apps/customer-pwa/src/features/order/hooks/use-cart-query.spec.tsx --runInBand
  ```

  Expected: FAIL because `use-cart-query.ts` does not exist.

- [ ] **Step 3: Create the cart hook module.**

  Move these responsibilities from `use-order-query.ts` to `use-cart-query.ts`:
  - `useCustomerCartQuery()`;
  - `ensureCartSnapshot()`;
  - `isCartConflict()`;
  - `useCartMutations()`;
  - imports from `cart-optimistic.ts` and `order-query-keys.ts`.

  Preserve the public API exactly: `useCustomerCartQuery()` plus `useCartMutations()` returning `addItem(menuItem, quantity?, note?)`, `setQuantity(cartLineId, quantity)`, `updateNote(cartLineId, note)`, `removeLine(cartLineId)`, `clearCart()`, and `isUpdating`.

  `useCartMutations()` must cancel the cart query before optimistic writes, restore `ctx.prev` on error, invalidate the cart key only for a cart-version conflict, and replace the optimistic cache with the server response on success.

- [ ] **Step 4: Update active consumers and their mocks.**

  Update each import to use the aggregate it consumes:

  ```ts
  // menu-page.tsx
  import { useCartMutations, useCustomerCartQuery } from '@/features/order/hooks/use-cart-query';

  // cart-pill.tsx
  import { useCustomerCartQuery } from '@/features/order/hooks/use-cart-query';

  // cart-drawer.tsx
  import { useCartMutations, useCustomerCartQuery } from '@/features/order/hooks/use-cart-query';
  ```

  Update `cart-drawer.spec.tsx` to mock `use-cart-query` for cart hooks and continue mocking `useSubmitOrderMutation` from `use-order-query`.

- [ ] **Step 5: Run cart and affected page tests.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs \
    apps/customer-pwa/src/features/order/hooks/use-cart-query.spec.tsx \
    apps/customer-pwa/src/pages/cart/cart-drawer.spec.tsx \
    --runInBand
  ```

  Expected: PASS; cart rendering, cart edits, and order submission remain available through their new imports.

- [ ] **Step 6: Commit the cart aggregate split.**

  ```bash
  git add apps/customer-pwa/src/features/order/hooks/use-cart-query.ts \
    apps/customer-pwa/src/features/order/hooks/use-cart-query.spec.tsx \
    apps/customer-pwa/src/features/order/hooks/use-order-query.ts \
    apps/customer-pwa/src/pages/menu-page.tsx \
    apps/customer-pwa/src/components/menu/cart-pill.tsx \
    apps/customer-pwa/src/pages/cart/cart-drawer.tsx \
    apps/customer-pwa/src/pages/cart/cart-drawer.spec.tsx
  git commit -m "refactor(customer-pwa): separate cart query hooks"
  ```

## Task 4: Split Bill state and preserve its polling contract

**Files:**

- Create: `apps/customer-pwa/src/features/order/hooks/use-bill-query.ts`
- Create: `apps/customer-pwa/src/features/order/hooks/use-bill-query.spec.tsx`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
- Modify: `apps/customer-pwa/src/pages/menu-page.tsx`
- Modify: `apps/customer-pwa/src/pages/request-payment-page.tsx`
- Modify: `apps/customer-pwa/src/pages/request-payment-page.spec.tsx`

- [ ] **Step 1: Move polling tests into a bill-focused test file.**

  Move the current `resolveCurrentBillPollingInterval` tests into `use-bill-query.spec.tsx`, importing the function from `./use-bill-query`. Keep all three assertions:

  ```ts
  expect(resolveCurrentBillPollingInterval({ bill: pendingBill, cart: activeCart })).toBe(3000);
  expect(resolveCurrentBillPollingInterval({ bill: null, cart: lockedCart })).toBe(3000);
  expect(resolveCurrentBillPollingInterval({ bill: paidBill, cart: activeCart })).toBe(false);
  ```

- [ ] **Step 2: Run the bill test and verify it fails.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs apps/customer-pwa/src/features/order/hooks/use-bill-query.spec.tsx --runInBand
  ```

  Expected: FAIL because `use-bill-query.ts` does not exist.

- [ ] **Step 3: Create the bill aggregate hook.**

  Move `CurrentBillQueryData`, `resolveCurrentBillPollingInterval`, `useCurrentBillQuery()`, and `useRequestBillMutation()` into `use-bill-query.ts`.

  Keep the current `refetchInterval` contract exactly:

  ```ts
  refetchInterval: (query) =>
    resolveCurrentBillPollingInterval(query.state.data as CurrentBillQueryData | undefined),
  ```

  Keep successful request-bill cache writes for both `cartKeys.snapshot(tenantId, sessionId)` and `billKeys.current(tenantId, sessionId)`, then invalidate the Order domain keys. Put the shared invalidation helper in `order-query-keys.ts` only if it depends solely on keys; otherwise create a small `order-query-cache.ts` module. Do not import a React hook from that helper module.

- [ ] **Step 4: Update consumers and request-payment mocks.**

  ```ts
  // menu-page.tsx
  import { useCurrentBillQuery } from '@/features/order/hooks/use-bill-query';

  // request-payment-page.tsx
  import { useCurrentBillQuery, useRequestBillMutation } from '@/features/order/hooks/use-bill-query';
  ```

  Update `request-payment-page.spec.tsx` to mock `use-bill-query` instead of `use-order-query` for these two exports.

- [ ] **Step 5: Run bill and payment-page tests.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs \
    apps/customer-pwa/src/features/order/hooks/use-bill-query.spec.tsx \
    apps/customer-pwa/src/pages/request-payment-page.spec.tsx \
    --runInBand
  ```

  Expected: PASS; a pending bill or locked cart still polls every three seconds and the page can still request a bill.

- [ ] **Step 6: Commit the bill aggregate split.**

  ```bash
  git add apps/customer-pwa/src/features/order/hooks/use-bill-query.ts \
    apps/customer-pwa/src/features/order/hooks/use-bill-query.spec.tsx \
    apps/customer-pwa/src/features/order/hooks/use-order-query.ts \
    apps/customer-pwa/src/pages/menu-page.tsx \
    apps/customer-pwa/src/pages/request-payment-page.tsx \
    apps/customer-pwa/src/pages/request-payment-page.spec.tsx
  git commit -m "refactor(customer-pwa): separate bill query hooks"
  ```

## Task 5: Leave Order hooks focused on order lifecycle

**Files:**

- Modify: `apps/customer-pwa/src/features/order/hooks/use-order-query.ts`
- Modify: `apps/customer-pwa/src/features/order/hooks/use-order-query.spec.tsx`
- Modify: `apps/customer-pwa/src/pages/order-tracking-page.tsx`
- Modify: `apps/customer-pwa/src/pages/order-tracking-page.spec.tsx`
- Modify: `apps/customer-pwa/src/pages/cart/cart-drawer.tsx`
- Modify: `apps/customer-pwa/src/pages/service-request-drawer.tsx`
- Modify: `apps/customer-pwa/src/pages/service-request-drawer.spec.tsx`

- [ ] **Step 1: Reduce the module to its documented public API.**

  After Tasks 1–4, `use-order-query.ts` must export only `useOrderDetailQuery(orderId?)`, `useCustomerOrdersQuery()`, `useSubmitOrderMutation()`, `useCancelCustomerOrderMutation()`, and `useCreateServiceRequestMutation()`.

  It may import keys and the domain cache invalidation helper, but it must not contain cart optimistic transformations, cart query definitions, or bill polling definitions.

- [ ] **Step 2: Keep existing behavior tests in the remaining Order test file.**

  Retain the current tests that submit the expected cart version and idempotency key, plus the tenant/session-scoped order list test. Add an assertion that submit success seeds all three aggregate keys before invalidation:

  ```ts
  expect(queryClient.getQueryData(cartKeys.snapshot('tenant-1', 'session-1'))).toEqual(response.cart);
  expect(queryClient.getQueryData(orderKeys.detail('tenant-1', 'session-1', response.order.id))).toEqual(
    response.order,
  );
  expect(queryClient.getQueryData(billKeys.current('tenant-1', 'session-1'))).toEqual({
    bill: response.bill,
    cart: response.cart,
  });
  ```

- [ ] **Step 3: Run focused Order tests and page tests.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs \
    apps/customer-pwa/src/features/order/hooks/use-order-query.spec.tsx \
    apps/customer-pwa/src/pages/order-tracking-page.spec.tsx \
    apps/customer-pwa/src/pages/service-request-drawer.spec.tsx \
    apps/customer-pwa/src/pages/cart/cart-drawer.spec.tsx \
    --runInBand
  ```

  Expected: PASS; importing the smaller aggregate modules does not change public page behavior.

- [ ] **Step 4: Commit the Order lifecycle boundary.**

  ```bash
  git add apps/customer-pwa/src/features/order/hooks/use-order-query.ts \
    apps/customer-pwa/src/features/order/hooks/use-order-query.spec.tsx \
    apps/customer-pwa/src/pages/order-tracking-page.tsx \
    apps/customer-pwa/src/pages/order-tracking-page.spec.tsx \
    apps/customer-pwa/src/pages/cart/cart-drawer.tsx \
    apps/customer-pwa/src/pages/service-request-drawer.tsx \
    apps/customer-pwa/src/pages/service-request-drawer.spec.tsx
  git commit -m "refactor(customer-pwa): focus order lifecycle hooks"
  ```

## Task 6: Give Payment a dedicated VietQR mutation hook

**Files:**

- Create: `apps/customer-pwa/src/features/payment/hooks/use-create-vietqr-mutation.ts`
- Create: `apps/customer-pwa/src/features/payment/hooks/use-create-vietqr-mutation.spec.tsx`
- Modify: `apps/customer-pwa/src/features/payment/services/payment.service.ts`
- Modify: `apps/customer-pwa/src/pages/request-payment-page.tsx`
- Modify: `apps/customer-pwa/src/pages/request-payment-page.spec.tsx`

- [ ] **Step 1: Write a failing hook test.**

  Mock `paymentService.createVietQrForCurrentBill` and render the hook with `QueryClientProvider`. Verify it calls the service once when mutated and exposes the returned `CustomerVietQrResponse`:

  ```tsx
  await act(async () => {
    await result.current.mutateAsync();
  });

  expect(createVietQrMock).toHaveBeenCalledTimes(1);
  expect(result.current.data).toEqual(vietQrResponse);
  ```

- [ ] **Step 2: Run the new hook test and verify it fails.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs apps/customer-pwa/src/features/payment/hooks/use-create-vietqr-mutation.spec.tsx --runInBand
  ```

  Expected: FAIL because the hook module does not exist.

- [ ] **Step 3: Create the mutation hook and remove the duplicate Bill endpoint method.**

  Add this implementation:

  ```ts
  import { useMutation } from '@tanstack/react-query';
  import { paymentService } from '../services/payment.service';

  export function useCreateVietQrMutation() {
    return useMutation({
      mutationFn: () => paymentService.createVietQrForCurrentBill(),
    });
  }
  ```

  Remove `paymentService.requestBill`. Do not move `useRequestBillMutation()` into Payment: requesting a bill changes the Order-owned bill/cart lifecycle and remains in `use-bill-query.ts`.

- [ ] **Step 4: Replace the imperative service call in the payment page.**

  In `RequestPaymentPage`, replace `vietQrBusy` with the hook's `isPending` and call the mutation:

  ```ts
  const createVietQr = useCreateVietQrMutation();

  const onCreateVietQr = async (): Promise<void> => {
    if (!billPending || createVietQr.isPending) return;
    try {
      const response = await createVietQr.mutateAsync();
      setVietQr(response);
      toast.success('Đã tạo mã VietQR');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể tạo mã VietQR.');
    }
  };
  ```

  Update the button's disabled state and label to use `createVietQr.isPending`. Update the page spec to mock the hook instead of `paymentService`.

- [ ] **Step 5: Run Payment tests.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs \
    apps/customer-pwa/src/features/payment/hooks/use-create-vietqr-mutation.spec.tsx \
    apps/customer-pwa/src/pages/request-payment-page.spec.tsx \
    --runInBand
  ```

  Expected: PASS; the page still renders the returned VietQR details and prevents duplicate creation while pending.

- [ ] **Step 6: Commit Payment convention alignment.**

  ```bash
  git add apps/customer-pwa/src/features/payment/hooks/use-create-vietqr-mutation.ts \
    apps/customer-pwa/src/features/payment/hooks/use-create-vietqr-mutation.spec.tsx \
    apps/customer-pwa/src/features/payment/services/payment.service.ts \
    apps/customer-pwa/src/pages/request-payment-page.tsx \
    apps/customer-pwa/src/pages/request-payment-page.spec.tsx
  git commit -m "refactor(customer-pwa): add VietQR mutation hook"
  ```

## Task 7: Remove unreachable local-cart implementation

**Files:**

- Delete: `apps/customer-pwa/src/features/cart/context/cart-provider.tsx`
- Delete: `apps/customer-pwa/src/features/menu/components/cart-drawer.tsx`
- Delete: `apps/customer-pwa/src/features/menu/components/cart-floating-button.tsx`
- Delete: `apps/customer-pwa/src/features/menu/components/category-tabs.tsx`
- Delete: `apps/customer-pwa/src/features/menu/components/menu-item-card.tsx`
- Delete: `apps/customer-pwa/src/features/menu/components/menu-item-detail-drawer.tsx`
- Delete: `apps/customer-pwa/src/features/menu/components/menu-items-grid.tsx`
- Modify: any active file revealed by the pre-delete import check; otherwise no active source modification is expected.

- [ ] **Step 1: Prove the files are not active imports.**

  Run:

  ```bash
  rg -n "features/cart/context/cart-provider|features/menu/components/(cart-drawer|cart-floating-button|category-tabs|menu-item-card|menu-item-detail-drawer|menu-items-grid)|CartProvider|useCart\\(" apps/customer-pwa/src
  ```

  Expected before deletion: occurrences are confined to the legacy files themselves. If an active route/page/component imports any of these paths, stop and amend the plan with a migration task rather than deleting the file.

- [ ] **Step 2: Delete only the confirmed legacy files.**

  Use `apply_patch` deletions. Do not delete the active replacement components in `apps/customer-pwa/src/components/menu/` or the active cart drawer in `apps/customer-pwa/src/pages/cart/cart-drawer.tsx`.

- [ ] **Step 3: Repeat the import check.**

  Run the command from Step 1.

  Expected: no output.

- [ ] **Step 4: Run the PWA's complete unit suite, lint, and production build.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs --runInBand
  pnpm nx lint customer-pwa --skip-nx-cache
  pnpm nx build customer-pwa --skip-nx-cache
  ```

  Expected: all commands exit 0. The build is the final protection against a missed static import.

- [ ] **Step 5: Commit legacy cleanup.**

  ```bash
  git add -u apps/customer-pwa/src/features/cart apps/customer-pwa/src/features/menu
  git commit -m "chore(customer-pwa): remove obsolete local cart"
  ```

## Task 8: Document the state-ownership convention and run final verification

**Files:**

- Modify: `docs/guides/codebase-reading-map.md`

- [ ] **Step 1: Add the Customer PWA state-ownership rule beside the existing Customer PWA Reading Order section.**

  Add a concise subsection with these normative rules:

  ```md
  ### Customer PWA State Ownership

  - `SessionProvider` owns persisted browser/session identity only: session ID, tenant ID, table metadata, and tenant lifecycle presentation state.
  - TanStack React Query owns data returned by BFF: menu, Redis-backed cart snapshots, orders, bills, and Payment command state.
  - Each feature exposes BFF calls through `services/` and consumes them through hooks in `hooks/`; pages/components do not call feature services directly.
  - `order-query-keys.ts` is the only source for customer cart/order/bill cache keys. Socket.IO invalidates those keys; it is not a second source of truth.
  - Do not add a local cart Context, Zustand store, or duplicate cart reducer while server cart is authoritative.
  ```

  Replace the single old `use-order-query.ts` reading-map entry with the new hook set: `order-query-keys.ts`, `use-cart-query.ts`, `use-order-query.ts`, and `use-bill-query.ts`. Add the Payment VietQR mutation hook to the payment flow's Customer UI file list.

- [ ] **Step 2: Verify every documented path exists.**

  Run:

  ```bash
  pnpm verify:doc-anchors
  ```

  Expected: exit 0. If that script does not cover this guide's paths, additionally run:

  ```bash
  for file in \
    apps/customer-pwa/src/features/order/hooks/order-query-keys.ts \
    apps/customer-pwa/src/features/order/hooks/use-cart-query.ts \
    apps/customer-pwa/src/features/order/hooks/use-order-query.ts \
    apps/customer-pwa/src/features/order/hooks/use-bill-query.ts \
    apps/customer-pwa/src/features/payment/hooks/use-create-vietqr-mutation.ts; do
    test -f "$file" || exit 1
  done
  ```

- [ ] **Step 3: Run final targeted and application-level verification.**

  Run:

  ```bash
  pnpm jest --config apps/customer-pwa/jest.config.cjs --runInBand
  pnpm nx lint customer-pwa --skip-nx-cache
  pnpm nx build customer-pwa --skip-nx-cache
  pnpm verify:doc-anchors
  git diff --check
  ```

  Expected: all commands exit 0 with no whitespace errors. Inspect `git status --short` and stage only files named in this plan; the workspace has unrelated user changes that must not be staged or modified.

- [ ] **Step 4: Commit documentation and final verification record.**

  ```bash
  git add docs/guides/codebase-reading-map.md
  git commit -m "docs(customer-pwa): define server state ownership"
  ```

## Completion criteria

- [ ] No active Customer PWA page/component imports a feature `service` directly.
- [ ] No active Customer PWA source imports `CartProvider` or `useCart`.
- [ ] Cart/order/bill keys have one canonical owner and realtime imports only that owner.
- [ ] Cart optimistic behavior, conflict rollback, and submit idempotency retain regression coverage.
- [ ] Current-bill polling remains conditional and uses the existing three-second interval.
- [ ] Payment VietQR creation uses a feature mutation hook; bill request remains Order/Bill-owned.
- [ ] Customer PWA Jest suite, lint, build, documentation anchors, and `git diff --check` pass.
