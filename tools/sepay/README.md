# Kiểm thử SePay OAuth2 (Client ID / Secret) trước khi chốt Phase 4B

Tham chiếu nội bộ: `docs/superpowers/audits/phase-4b-audit-report.md` (§19.2 Tier 1, Q25 scopes).  
Tài liệu SePay (đã đối chiếu Context7): [Bắt đầu nhanh OAuth2](https://developer.sepay.vn/vi/sepay-oauth2/bat-dau-nhanh), [Luồng xác thực](https://developer.sepay.vn/vi/sepay-oauth2/luong-xac-thuc).

## Điều kiện

- `redirect_uri` dùng trong bước 1 **trùng ký tự** với URI đã đăng ký trên SePay (ví dụ URL Vercel + path callback).
- `client_id` / `client_secret` do support cấp; **không** commit secret, **không** gọi `oauth/token` từ trình duyệt (chỉ server-side).

## Bước 1 — Tạo URL authorize (mở trình duyệt)

Mẫu (thay placeholder; `scope` và `redirect_uri` phải **URL-encode** khi dán vào thanh địa chỉ):

```text
https://my.sepay.vn/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=bank-account:read%20transaction:read%20webhook:read%20webhook:write%20webhook:delete%20profile&state=RANDOM_STATE
```

- `state`: chuỗi ngẫu nhiên (ghi lại để đối chiếu ở bước 2).
- Scopes: theo Q25 audit; có thể rút gọn tối thiểu `bank-account:read%20transaction:read%20profile` nếu SePay app của bạn chưa bật đủ scope.

Đăng nhập SePay (tài khoản tenant thử nghiệm) → đồng ý cấp quyền → trình duyệt redirect về `redirect_uri?code=...&state=...`.

**Pass:** thấy `code=` trong query.  
**Fail:** lỗi redirect / `error=` từ SePay → kiểm tra URI đăng ký, client_id, scope.

## Bước 2 — Đổi `code` lấy token (chỉ trên máy bạn / server)

Endpoint: `POST https://my.sepay.vn/oauth/token`  
Body: `application/x-www-form-urlencoded` (theo [Luồng xác thực](https://developer.sepay.vn/vi/sepay-oauth2/luong-xac-thuc)):

```bash
curl -sS -X POST 'https://my.sepay.vn/oauth/token' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=AUTHORIZATION_CODE' \
  --data-urlencode 'redirect_uri=YOUR_REDIRECT_URI' \
  --data-urlencode 'client_id=YOUR_CLIENT_ID' \
  --data-urlencode 'client_secret=YOUR_CLIENT_SECRET'
```

**Pass:** JSON có `access_token`, `refresh_token`, `expires_in` (thường ~3600s).  
**Fail:** `invalid_grant` / `redirect_uri_mismatch` → `redirect_uri` hoặc `code` không khớp bước 1 (code one-time, hết hạn nhanh).

## Bước 3 — Gọi API thật bằng Bearer token

```bash
curl -sS -H 'Authorization: Bearer ACCESS_TOKEN' \
  'https://my.sepay.vn/api/v1/bank-accounts'
```

**Pass:** HTTP 200, body có danh sách tài khoản (hoặc mảng rỗng nếu chưa link bank — vẫn chứng minh token + scope hợp lệ).  
**Fail:** 401/403 → scope hoặc tài khoản SePay chưa đủ quyền / chưa link bank.

## Bước 4 (tuỳ chọn) — Refresh token

Sau khi có `refresh_token`, POST lại `https://my.sepay.vn/oauth/token` với `grant_type=refresh_token` + `client_id` + `client_secret` (cùng tài liệu SePay).

## Ghi nhận cho audit (Q23 = α)


| Tiêu chí               | Cách chứng minh                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Client SePay hoạt động | Bước 1–2 thành công                                                                                                               |
| Scope đủ cho Tier 1    | Bước 3 `bank-accounts` OK; sau này thử `webhook` API nếu cần chứng minh Q25                                                       |
| Khớp kiến trúc §19.2   | Issuer/host `my.sepay.vn`, token exchange server-side, BFF/DB lưu token = việc Phase 4B (chưa bắt buộc để pass test thủ công này) |


## Lưu ý

- Base URL production trong audit: `https://my.sepay.vn` — nếu SePay cấp môi trường sandbox OAuth khác, đổi host theo email support.
- Phase 4B mới có route `/dashboard/payment-settings/sepay-callback` + lưu token; test thủ công trên không thay thế E2E trong app nhưng **đủ** để quyết định “credential + redirect + scope” trước khi chốt audit.

