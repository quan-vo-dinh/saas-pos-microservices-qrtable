# Phase 5 P0 — Spec verify giá trị secret webhook

> **Trạng thái:** Mini-spec chuẩn cho Phase 5 trước Bước 5.2.
> **Rule ID:** `P0-PAY-X-SECRET-VALUE`.
> **Phạm vi:** Hardening webhook SePay tenant và platform Phase 4B.

---

## 1. Vấn đề

Phase 4B thêm hai route webhook:

- Tier 1 thanh toán bill tenant: `POST /payment/sepay/webhook/:tenantSlug`, prefix reference `QRTBL`.
- Tier 2 thanh toán hóa đơn subscription: `POST /payment/sepay/webhook/platform`, prefix reference `QRSUB`.

Hình dạng route BFF hiện chỉ kiểm tra `x-secret-key` tồn tại, rồi forward giá trị sang Payment hoặc SaaS. Chỉ kiểm tra presence không phải authentication. Trước khi Phase 5 đánh dấu đường này `covered`, giá trị secret phải được verify với secret lưu server-side trước mọi mutation invoice, payment, outbox, audit-completion, hoặc Order finalization.

---

## 2. Quyết định

1. Check presence `x-secret-key` ở BFF vẫn là edge validation nhanh, nhưng không đủ.
2. Verifier có thẩm quyền phải là service sở hữu secret và state mutation:
   - Webhook tenant (`QRTBL`) được Payment Service verify với `tenant_payment_settings.webhook_secret_encrypted` cho `tenantSlug` route hoặc tenant đã resolve.
   - Webhook platform (`QRSUB`) được SaaS Service verify với cấu hình server-side hiện tại `SEPAY_PLATFORM_WEBHOOK_SECRET`. Lưu trữ platform settings vẫn là hướng phát triển sau.
3. So sánh secret phải dùng constant-time equality sau decrypt hoặc load secret đã lưu.
4. Webhook thiếu, không hợp lệ, không khớp, hoặc chưa cấu hình secret phải trả unauthorized/forbidden và không được mutate domain state.
5. Request body không được tin cho identity tenant. Identity tenant đến từ slug route tenant và lookup server-side.
6. Prefix billing reference vẫn là routing guard độc lập:
   - `QRTBL*` chỉ thuộc route Payment tenant.
   - `QRSUB*` chỉ thuộc route SaaS platform.
7. Secret thô không được xuất hiện trong response, audit payload, log, hoặc test snapshot.

---

## 3. Hành vi bắt buộc

### 3.1 Webhook tenant

Với `POST /payment/sepay/webhook/:tenantSlug`:

- BFF từ chối thiếu `x-secret-key` trước khi forward.
- BFF forward `tenantSlug`, `x-secret-key`, payload, và `processId` sang Payment.
- Payment resolve tenant payment settings theo `tenantSlug` hoặc lookup tenant tin cậy gắn với slug đó.
- Payment decrypt `webhook_secret_encrypted` qua `PaymentSecretsService`.
- Nếu secret lưu thiếu, không hợp lệ, hoặc không khớp, Payment từ chối webhook và không settle payment.
- Secret hợp lệ vẫn cần match reference `QRTBL` bình thường, loại chuyển khoản đến, idempotency, và check amount.

### 3.2 Webhook platform

Với `POST /payment/sepay/webhook/platform`:

- BFF từ chối thiếu `x-secret-key` trước khi forward.
- BFF forward `x-secret-key`, payload, và `processId` sang SaaS.
- SaaS verify giá trị với `SEPAY_PLATFORM_WEBHOOK_SECRET` trước khi gọi subscription invoice matching.
- Nếu secret thiếu, không hợp lệ, không khớp, hoặc chưa cấu hình, SaaS từ chối webhook và không đánh dấu invoice paid.
- Secret hợp lệ vẫn cần match reference `QRSUB` bình thường, trạng thái invoice pending, idempotency, và check amount.

---

## 4. Contract kiểm thử

Bước 5.2 Phase 5 chỉ thêm test sau khi hành vi verifier đã tồn tại.

Provider delivery, public callback reachability, và cấu hình tunnel/Vercel không thuộc default test contract này; dùng `phase-5-sepay-local-mock-testing-policy.md` để tách mock-vs-live.

Test nhanh bắt buộc:

- BFF controller: thiếu `x-secret-key` từ chối cho cả hai route.
- BFF controller: secret có mặt forward context route đúng service mà không log hoặc trả secret.
- Payment tenant verifier: secret tenant hợp lệ cho phép settle `QRTBL` bình thường.
- Payment tenant verifier: secret tenant không hợp lệ trả unauthorized/forbidden và không lưu thay đổi payment, dòng outbox, hoặc gọi Order `markBillPaid`.
- Payment tenant verifier: secret hợp lệ cho tenant A không thể settle tenant B qua `tenantSlug` không khớp.
- SaaS platform verifier: secret platform hợp lệ cho phép thanh toán invoice `QRSUB` bình thường.
- SaaS platform verifier: secret platform không hợp lệ không đánh dấu invoice paid hoặc gán subscription.
- Prefix isolation: `QRTBL` gửi platform route và `QRSUB` gửi tenant route không mutate state.

Test integration tùy chọn:

- Ranh giới BFF đến service-owner với một tenant secret seed và một `SEPAY_PLATFORM_WEBHOOK_SECRET` đã cấu hình, chứng minh request secret không hợp lệ fail trước domain mutation.

---

## 5. Ngoài phạm vi

- UI xoay secret đầy đủ.
- Chứng nhận provider hoặc replay webhook SePay live.
- Public tunnel hoặc verify redirect Vercel tạm trong automated test mặc định.
- Thay thế route webhook Phase 3 direct HMAC.
- Quản lý webhook platform đa ngân hàng.

---

## 6. Tiêu chí chấp nhận

- `P0-PAY-X-SECRET-VALUE` chỉ chuyển từ `security-gap` sang `covered` khi giá trị secret tenant và platform được verify với lưu trữ server-side và đã test.
- Test hiện chỉ assert presence route hoặc presence secret là chưa đủ.
- Webhook secret không hợp lệ để nguyên trạng Payment, SubscriptionInvoice, Subscription, outbox, và Order.
