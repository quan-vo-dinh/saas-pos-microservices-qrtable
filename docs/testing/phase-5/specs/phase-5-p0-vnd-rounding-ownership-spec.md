# Phase 5 P0 — VND Rounding Ownership Spec

> **Status:** Canonical mini-spec for Phase 5 before Step 5.2.
> **Rule ID:** `P0-PAY-ROUNDING-VND`.
> **Scope:** Bill snapshot totals and Payment persistence for restaurant bills.

---

## 1. Problem

Canonical project docs require VND amounts to round up to the nearest thousand and to persist `rawTotal`, `roundedTotal`, and `roundingDelta`. Current tests assert example values in several places, but Phase 5 inventory did not find one canonical policy helper or ownership contract proving where the rounding rule lives and how Payment consumes it.

Without this decision, tests could pass while Order and Payment silently compute totals differently.

---

## 2. Decision

1. Order owns the restaurant bill snapshot.
2. The bill snapshot is the source of truth for:
   - `rawTotal`
   - `roundedTotal`
   - `roundingDelta`
3. The canonical formula is:

   ```ts
   roundedTotal = Math.ceil(rawTotal / 1000) * 1000;
   roundingDelta = roundedTotal - rawTotal;
   ```

4. `rawTotal` must be a non-negative integer VND amount. Negative or non-integer money inputs are invalid at the policy boundary.
5. Payment must persist the totals from the Order bill snapshot. Payment must not recalculate totals from menu items, cart items, or frontend payloads.
6. Payment may validate snapshot consistency and reject an impossible snapshot, but it must not become the owner of restaurant bill rounding.
7. All restaurant bill payment surfaces use `roundedTotal` as the payable amount:
   - VietQR `amount`.
   - Cash minimum `amountReceived >= roundedTotal`.
   - Underpaid webhook comparison.
   - Full refund fallback when `paidAmount` is missing.

---

## 3. Rounding Examples

| `rawTotal` | `roundedTotal` | `roundingDelta` |
| ---------- | -------------- | --------------- |
| 0          | 0              | 0               |
| 1          | 1000           | 999             |
| 999        | 1000           | 1               |
| 1000       | 1000           | 0               |
| 1001       | 2000           | 999             |
| 127500     | 128000         | 500             |

---

## 4. Test Contract

Required fast tests:

- A single unit-contract test suite covers the rounding policy examples above.
- Bill creation or bill snapshot tests prove Order applies the policy before exposing the snapshot.
- Payment `createVietQr` persists `rawTotal`, `roundedTotal`, and `roundingDelta` from the Order snapshot.
- Payment QR URL uses `roundedTotal`.
- Cash confirmation rejects `amountReceived < roundedTotal`.
- SePay webhook underpayment compares against `roundedTotal`.
- Refund fallback uses `paidAmount ?? roundedTotal`.

Required negative tests:

- Negative `rawTotal` is rejected by the rounding policy boundary.
- An inconsistent snapshot such as `rawTotal=127500`, `roundedTotal=127500`, `roundingDelta=0` is rejected or fails a contract test before Payment can silently persist it.

---

## 5. Out of Scope

- Tax, service charge, discounts, and promotion math beyond the existing bill snapshot.
- Multi-currency support.
- Subscription invoice amount rounding. Subscription invoices use their own plan price amount in VND.

---

## 6. Acceptance Criteria

- `P0-PAY-ROUNDING-VND` can move from `implementation-gap` to `covered` only when the rounding policy has a single testable contract and Payment is proven to consume the Order snapshot totals.
- UI-only formatting tests do not satisfy this rule unless the backend policy is already covered.
