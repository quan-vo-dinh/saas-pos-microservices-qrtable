# Phase 3 Post-Payment Verification

**Report date:** 2026-05-10  
**Scope:** Hậu thanh toán (bill PAID, đóng session, bàn `billing → cleaning`) đã triển khai trong Order + đồng bộ Payment; **email/receipt qua Notification Service vẫn Phase 4C** (không có trong Phase 3).

---

## Commands (reference)

Backend bundle (typical local demo):

```bash
pnpm dev:bff-payment
```

Frontends (separate terminals):

```bash
npx nx serve customer-pwa
npx nx serve management-app
```

Automated regression (post-payment path, Cluster F — implementation agents):

```bash
npx nx run-many -t test -p payment,order --runInBand
```

---

## Automated regression result

**Status:** PASS (theo handoff Cluster F)

**Evidence (summary):**

- Payment: `confirmCash` vẫn persist PAID + outbox khi fast path Order lỗi; SePay success gọi Order `BILL_MARK_PAID` với payload đầy đủ `{ tenantId, billId, paymentId, method, ... }`; consumer map Kafka → `markPaid({ tenantId, billId, paymentId, method, paidAt, processId })`.
- Lệnh đã xác nhận PASS: `npx nx run-many -t test -p payment,order --runInBand` (phiên docs 2026-05-10).

---

## Cash flow result (manual script — plan §10 Task 9 Step 3)

**Status:** NOT RUN (không chạy trong phiên docs-only)

**Evidence:** Thực hiện theo checklist trong plan: khách join → order → bill PENDING → cash confirm → bill PAID, session đóng, bàn `cleaning`, PWA “Thanh toán thành công”, staff `cleaning → available`.

---

## VietQR flow result (manual script — plan §10 Task 9 Step 4)

**Status:** NOT RUN

**Evidence:** Webhook SePay + VietQR path đã có coverage qua test Payment; E2E tay cần SePay sandbox / webhook secret.

---

## Underpaid flow result (plan §10 Task 9 Step 5)

**Status:** NOT RUN (manual)

**Evidence:** Logic underpaid + audit được mô tả trong `phase-3-payment.md`; kiểm chứng tay: Payment PENDING, bill `PENDING_PAYMENT`, bàn vẫn billing.

---

## Reopen protection result (plan §10 Task 9 Step 6)

**Status:** NOT RUN (manual HTTP)

**Evidence:** BFF `reopenBill` + kiểm tra Payment history có test controller (plan Task 3); xác nhận HTTP 409 cần chạy stack đầy đủ.

---

## Doc / architecture alignment

| Topic                                                                                                 | Status                                 |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Order sở hữu bill/session lifecycle; `BILL_MARK_PAID` khép session + gọi Catalog `billing → cleaning` | Documented                             |
| Catalog sở hữu trạng thái bàn                                                                         | Documented                             |
| Payment sở hữu payment + outbox `payment.completed`                                                   | Documented                             |
| POS/PWA correctness: **polling/refetch baseline**; Kafka→BFF→WS chỉ **hint invalidate**               | Documented                             |
| Email receipt / durable notification pipeline                                                         | **Phase 4C — không implement Phase 3** |

---

## Residual risks

- Kafka bridge là hint; **polling/refetch vẫn là baseline đúng trạng thái**.
- Hoàn tất cross-service có thể cần **Phase 4A** (saga/compensation) nếu mở rộng ngoài happy path.
- **Manual demo chưa chạy:** báo cáo này không thay thế walkthrough đầy đủ trên môi trường integrator.
