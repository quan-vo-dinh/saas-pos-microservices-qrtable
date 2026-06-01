# QRTable — Seed dev

Thư mục này chứa script reseed môi trường dev cục bộ (có tính phá hủy).

Tenant dev chuẩn:

| Fixture                | Id tenant nội bộ                       | Slug công khai       | Trạng thái  | Mục đích                       |
| ---------------------- | -------------------------------------- | -------------------- | ----------- | ------------------------------ |
| Active default         | `023772bb-391b-401c-936a-ed7034b69cec` | `pho-viet`           | `ACTIVE`    | Luồng dev/demo chính           |
| Suspended customer E2E | `0f5c8b74-3c4d-47db-9a07-3a8f30f1b5d1` | `pho-viet-suspended` | `SUSPENDED` | Phase 5 Customer PWA read-only |

Quy tắc:

- Claim JWT `tenant_id` dùng UUID nội bộ.
- Header BFF `x-tenant-id` dùng UUID nội bộ.
- Dòng PostgreSQL theo tenant dùng UUID nội bộ trong cột `tenant_id`.
- URL QR/PWA công khai dùng `tenant=pho-viet` cho fixture active, hoặc `tenant=pho-viet-suspended` cho fixture suspended.
- `tenant_a` chỉ là legacy; không được xuất hiện trong mặc định seed dev mới.
- **`tables.qr_token`**: Catalog chỉ chấp nhận token **đúng 64 ký tự hex** (`/^[a-f0-9]{64}$/`) trong `TableService.validateQrToken`. Seed dev dùng SHA-256 hex sinh từ `${tenantId}:${tableKey}:qrtable-dev-qr` — không dùng chuỗi dạng `dev-qr-token-...`.

Suspended tenant QR fixture:

```text
tenant=pho-viet-suspended
table=11111111-ddde-4111-8111-111111111111
table key=S01
```

Playwright smoke:

```bash
pnpm e2e:phase5:suspended
```

## Phase 4D dashboard demo data (Phở Việt)

Sau catalog seed, script `seed-dashboard-demo.js` ghi **dữ liệu cố định** cho tenant `pho-viet`:

- 14 ngày × 2 hóa đơn đã thanh toán (trưa + tối), anchor theo **hôm nay** (`Asia/Ho_Chi_Minh`) → chart 7 ngày mặc định luôn có điểm.
- Mix **CASH** / **VIETQR**, top món nghiêng về phở/bún/gỏi/trà.
- 1 bill `PENDING_PAYMENT`, 1 order `CANCELED`, bàn `occupied` / `billing` / `cleaning`, 1 món `out_of_stock`.
- Subscription invoices platform (admin analytics) với id prefix `d4d0`.

Chạy riêng (PostgreSQL + `phase-4b-saas.sql` đã apply):

```bash
pnpm dev:seed-dashboard
```

Hoặc full dev reset (đã gồm SaaS SQL + dashboard demo):

```bash
pnpm dev:reseed -- --yes
```

Smoke BFF (cần stack + token Owner):

```bash
export BFF_BASE_URL=http://localhost:3300/api/v1
export TENANT_ID=023772bb-391b-401c-936a-ed7034b69cec
export ACCESS_TOKEN="<owner JWT>"
bash tools/demo/phase-4d-dashboard-smoke.sh
```

Ownership seed:

- `postgres/saas`: dòng PostgreSQL thuộc SaaS.
- `postgres/catalog`: dòng PostgreSQL thuộc Catalog.
- `postgres/order`: dọn dẹp PostgreSQL thuộc Order.
- `mongo`: role/user User-Access.
- `keycloak`: realm, clients, roles, mappers, users.

Runtime dev hiện vẫn dùng một database PostgreSQL `qrtable`.
Bố cục thư mục cố ý sẵn sàng cho tách Database-per-Service sau này.

## Phase 4B SaaS Schema Seed

Run after PostgreSQL/MongoDB are up:

```bash
psql "$SAAS_DATABASE_URL" -f tools/dev-seed/postgres/phase-4b-saas.sql
mongosh "$MONGO_URI" tools/dev-seed/mongo/phase-4b-users-tenantid.js
```

The scripts are idempotent and can be rerun during local development.
