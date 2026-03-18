# Step 0.3 - Phac thao ERD he thong tong the (Ngay 3)

## Goal

Tao bo tai lieu ERD tong the de phuc vu bao cao luan van va dinh huong thiet ke CSDL cho 8 microservices.

## Scope

- In scope: ERD dinh huong cho domain chinh `Tenant`, `Category`, `MenuItem`, `Table`, `Order`, `Bill`, `Payment` va cac bang ho tro lien quan.
- In scope: file nguon de chinh sua lap (`DBML`, `Mermaid`) va file anh export `docs/architecture/erd.png`.
- Out of scope: migration TypeORM chi tiet, toi uu hieu nang cuoi cung, validation schema san xuat.

## Baseline tu code hien tai

- Da co entity that trong code: `tenants`, `catalogs`.
- Cac domain `order`, `bill`, `payment` chua hien thuc full schema o codebase.
- Vi vay ERD Step 0.3 duoc xac dinh la **ban dinh huong** (conceptual + logical), khong phai schema cuoi cung.

## Deliverables

1. `docs/architecture/erd.dbml`:
   - Nguon chuan de dung voi dbdiagram/dbdocs.
   - Chua enum, index, unique, foreign keys, notes.
2. `docs/architecture/erd.mmd`:
   - Nguon Mermaid de render nhanh trong IDE va CI docs.
3. `docs/architecture/erd.png`:
   - Anh ERD phuc vu chen vao bao cao.
4. `docs/architecture/README.md`:
   - Cach tai tao anh ERD va quy uoc cap nhat.

## Data model strategy

### Muc tieu mo hinh

- Toan bo bang business co `tenant_id` de dam bao tenant isolation.
- Tach ro boundary theo service:
  - SaaS: `tenants`, `pricing_plans`, `subscriptions`
  - Catalog: `categories`, `menu_items`, `areas`, `tables`
  - Order: `sessions`, `orders`, `order_items`, `bills`, `service_requests`
  - Payment: `payments`, `refunds`
  - Kitchen va Notification su dung Redis/Mongo va event stream, khong can bang Postgres cot loi trong Step 0.3.

### Quan he cot loi can the hien

- `tenants 1 - n categories`
- `categories 1 - n menu_items`
- `tenants 1 - n areas`
- `areas 1 - n tables`
- `tables 1 - n sessions`
- `sessions 1 - n orders`
- `orders 1 - n order_items`
- `sessions 1 - 1 bills` (logical one active bill per session)
- `bills 1 - n payments`
- `payments 1 - n refunds`

### Rang buoc quan trong can ve

- Unique:
  - `(tenant_id, slug)` cho tenant namespace.
  - `(tenant_id, category_name)`.
  - `(tenant_id, table_name)`.
  - `orders.idempotency_key`.
- Composite index:
  - `(tenant_id, created_at)` cho cac bang ghi nhieu.
  - `(tenant_id, table_id)` cho don hang.
- Soft delete:
  - Dat truong `deleted_at` cho bang can lich su.

## Execution plan (day-3)

1. Tong hop rang buoc nghiep vu tu `business-logic.md` va `technical-architecture.md`.
2. Mapping service boundaries -> bang du lieu.
3. Dung `erd.dbml` cho logical schema.
4. Tao `erd.mmd` de render nhanh va review trong pull request.
5. Export anh `erd.png` vao `docs/architecture`.
6. Review chong xung dot voi code hien tai (`Tenant`, `Catalog`) va danh dau truong nao la du kien.

## Acceptance criteria

- Co du 3 file `erd.dbml`, `erd.mmd`, `erd.png` trong `docs/architecture`.
- ERD the hien du quan he giua 7 entity focus: `Tenant`, `Category`, `MenuItem`, `Table`, `Order`, `Bill`, `Payment`.
- Co notes ro rang: ban dinh huong, schema se iterate theo cac phase sau.
- Nguoi doc co the tai tao lai `erd.png` tu file nguon.

## Risks va giam thieu

1. Risk: ERD chi dua tren tai lieu, chua map het voi code.
   - Mitigation: ghi ro nhan "orientation only" va lien ket voi phase tiep theo.
2. Risk: kho xuat PNG do thieu cong cu.
   - Mitigation: uu tien Mermaid CLI; fallback tao PNG placeholder kem huong dan export tay.
3. Risk: over-modeling som.
   - Mitigation: giu schema o muc can thiet cho reporting + architecture communication.

## Done when

- [ ] Plan file hoan tat
- [ ] ERD source hoan tat
- [ ] PNG da co trong `docs/architecture/erd.png`
- [ ] Co huong dan cap nhat/tai tao ERD
