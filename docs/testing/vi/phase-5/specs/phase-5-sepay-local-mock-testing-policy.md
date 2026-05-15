# Phase 5 — Chính sách kiểm thử SePay local và mock

> **Trạng thái:** Testing policy chuẩn cho Phase 5.
> **Phạm vi:** SePay OAuth Connect, tenant payment settings, routing webhook VietQR, và live-provider smoke check.

---

## 1. Vấn đề

SePay OAuth app hiện có redirect URI đã đăng ký trỏ về domain Vercel tạm thời:

```text
https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback
```

Trong khi đó môi trường dev vẫn chạy `localhost` và có thể cần đổi cấu hình Keycloak client cộng với public tunnel để provider gọi callback/webhook. Nếu automated test phụ thuộc SePay thật, domain preview Vercel, cấu hình redirect public của Keycloak, hoặc tunnel local, Phase 5 sẽ kiểm tra wiring môi trường thay vì hành vi của QRTable.

---

## 2. Quyết định

1. Automated test mặc định của Phase 5 không được gọi SePay live.
2. Automated test mặc định của Phase 5 không được yêu cầu Vercel, ngrok, cloudflared, hoặc public tunnel.
3. Hành vi hướng ra SePay được kiểm thử bằng unit mock hoặc mock SePay provider local.
4. Live SePay check là manual hoặc opt-in smoke check cho demo public, không phải PR gate hoặc gate local mặc định.
5. Test vẫn phải chứng minh hành vi do QRTable sở hữu:
   - Tạo OAuth state, TTL, consume, và từ chối replay.
   - Forward callback và hợp đồng token exchange.
   - Mã hóa token và webhook secret.
   - Normalize bank list và chọn bank.
   - Sinh webhook URL từ `PUBLIC_API_BASE_URL`.
   - Routing webhook `QRTBL` và `QRSUB`, verify secret, idempotency, underpaid, và paid transition.

---

## 3. Các chế độ test

| Chế độ            | Mục đích                                                                                          | Phụ thuộc provider                              | Gate mặc định                |
| ----------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------- |
| Unit/contract     | Policy thuần, DTO, service behavior, URL generation, token encryption                             | Chỉ mock class/function                         | PR/unit                      |
| Local integration | Ranh giới BFF/Payment/SaaS với response giống provider                                            | Mock SePay server local                         | Manual hoặc integration gate |
| Browser E2E       | Hành trình payment settings/callback nhìn thấy được                                               | Mock callback/token/bank/webhook response local | Pre-demo/manual              |
| Live SePay smoke  | Verify credential provider thật, redirect URI đã đăng ký, và public callback/webhook reachability | SePay thật + public app/API URL                 | Chỉ manual opt-in            |

---

## 4. Môi trường automated mặc định

Automated local hoặc CI-like test có đụng SePay OAuth phải dùng mock provider local:

```env
SEPAY_OAUTH_BASE_URL=http://127.0.0.1:<mock-sepay-port>
SEPAY_OAUTH_CLIENT_ID=test-client-id
SEPAY_OAUTH_CLIENT_SECRET=test-client-secret
SEPAY_OAUTH_REDIRECT_URI=http://localhost:3001/dashboard/payment-settings/sepay-callback
PUBLIC_API_BASE_URL=http://localhost:3300
RUN_LIVE_SEPAY=
```

Mock provider chỉ cần hỗ trợ hợp đồng tối thiểu mà QRTable dùng:

- `GET /oauth/authorize` hoặc helper trả authorize URL deterministic.
- `POST /oauth/token`.
- `GET /api/v1/bank-accounts`.
- `GET /api/v1/bank-accounts/:uuid`.
- `POST /api/v1/webhooks`.

Mock phải trả bank account và webhook secret deterministic. Mock không được yêu cầu credential SePay thật.

---

## 5. Hợp đồng Browser E2E

Playwright test không automate login SePay thật.

Với flow payment settings:

1. Owner bấm "Connect SePay" trong QRTable.
2. QRTable tạo OAuth state và trả authorize URL trỏ tới mock provider.
3. Test hoàn tất callback với seeded valid state và fake code.
4. Payment exchange fake code với mock provider.
5. QRTable hiển thị bank account mock.
6. Owner chọn một bank mock.
7. Payment gọi mock webhook upsert và lưu token/webhook settings đã mã hóa.

Test invalid-state E2E có thể đi thẳng tới:

```text
/dashboard/payment-settings/sepay-callback?code=fake-code&state=invalid-state
```

và assert page không trắng, hiển thị trạng thái lỗi kỳ vọng.

---

## 6. Hợp đồng kiểm thử webhook

Webhook test không cần SePay gọi vào public URL. Test nên POST payload có shape giống provider trực tiếp vào BFF route:

- `POST /api/v1/payment/sepay/webhook/:tenantSlug`
- `POST /api/v1/payment/sepay/webhook/platform`

Assertion bắt buộc nằm trong QRTable:

- Route split: `QRTBL` vào Payment, `QRSUB` vào SaaS.
- Verify stored secret value từ chối secret sai.
- Underpaid transfer không mutate terminal state.
- Duplicate delivery không double-settle.
- Delivery thành công cập nhật đúng state Payment hoặc SubscriptionInvoice.

---

## 7. Live SePay smoke

Live SePay smoke chỉ được chạy khi opt-in rõ ràng:

```env
RUN_LIVE_SEPAY=1
SEPAY_OAUTH_BASE_URL=https://my.sepay.vn
SEPAY_OAUTH_REDIRECT_URI=https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback
PUBLIC_API_BASE_URL=https://<stable-public-api-or-tunnel>
```

Live smoke phải được tài liệu hóa là manual/pre-demo verification. Test bị skip nếu thiếu bất kỳ env live bắt buộc nào hoặc `RUN_LIVE_SEPAY` khác `1`.

Live smoke có thể verify:

- Redirect URI đã đăng ký khớp callback page deployed.
- Token exchange thành công với credential provider thật.
- Đọc được bank list từ SePay.
- Webhook setup thành công với public API URL.
- Provider webhook được trigger thủ công tới được public BFF route.

Live smoke không được là yêu cầu cho PR, local mặc định, hoặc deterministic CI gate.

---

## 8. Tiêu chí chấp nhận

- Tài liệu và test Phase 5 phân biệt rõ default mock-provider coverage với live SePay smoke.
- Không có automated test mặc định nào yêu cầu domain Vercel tạm hoặc tunnel local.
- Mọi live-provider test đều có env guard opt-in rõ và skip reason dễ hiểu.
- Các dòng traceability cho SePay OAuth, payment settings, và webhook routing tham chiếu policy này khi có dính provider behavior.
