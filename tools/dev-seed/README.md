# QRTable — Seed dev

Thư mục này chứa script reseed môi trường dev cục bộ (có tính phá hủy).

Tenant dev chuẩn:

| Trường           | Giá trị                                |
| ---------------- | -------------------------------------- |
| Id tenant nội bộ | `023772bb-391b-401c-936a-ed7034b69cec` |
| Slug công khai   | `pho-viet`                             |
| Tên hiển thị     | `Nhà hàng Phở Việt`                    |

Quy tắc:

- Claim JWT `tenant_id` dùng UUID nội bộ.
- Header BFF `x-tenant-id` dùng UUID nội bộ.
- Dòng PostgreSQL theo tenant dùng UUID nội bộ trong cột `tenant_id`.
- URL QR/PWA công khai dùng `tenant=pho-viet`.
- `tenant_a` chỉ là legacy; không được xuất hiện trong mặc định seed dev mới.
- **`tables.qr_token`**: Catalog chỉ chấp nhận token **đúng 64 ký tự hex** (`/^[a-f0-9]{64}$/`) trong `TableService.validateQrToken`. Seed dev dùng SHA-256 hex sinh từ `${DEV_TENANT.id}:${tableKey}:qrtable-dev-qr` — không dùng chuỗi dạng `dev-qr-token-...`.

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
