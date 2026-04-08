# Design Spec: Phân Rã Implementation Plan

> **Ngày:** 2026-04-08
> **Trạng thái:** Approved (brainstorming complete)
> **Scope:** Phân rã `docs/implementation_plan.md` (1119 dòng) thành các tài liệu con theo phase

---

## 1. Bối Cảnh & Mục Tiêu

### Vấn đề

`docs/implementation_plan.md` hiện tại chứa 1119 dòng — toàn bộ kế hoạch triển khai từ Phase 0 đến Phase 7 trong một file duy nhất. Điều này gây khó khăn cho:

- Review chi tiết từng phase
- Giảm context window khi làm việc với AI
- Track progress rõ ràng
- Verify độc lập từng phase

### Mục tiêu

Phân rã thành các tài liệu con, mỗi file đại diện cho 1 phase có thể verify/review/execute độc lập, đồng thời đảm bảo nhất quán với `technical-architecture.md` và `business-logic.md`.

### Tiến độ dự án hiện tại

- **Phase 0:** ✅ Hoàn thành (Step 0.1 → 0.7)
- **Phase 1:** 🔶 Đang triển khai — đã xong đến Step 1.4 (Shared Types)
- **Phase 2+:** Chưa bắt đầu

---

## 2. Quyết Định Đã Thống Nhất

| #   | Quyết định                      | Kết quả                                                                                       |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Workflow audit vs decomposition | Hybrid: Quick scan audit → design → audit fixes inline khi phân rã                            |
| 2   | Mức độ chi tiết phase files     | Plan-level, intent-driven (WHAT + WHY), không prescriptive (không có HOW cụ thể)              |
| 3   | Bills entity ownership          | Bills thuộc Order Service. Payment Service chỉ nhận billId + amount                           |
| 4   | Decomposition approach          | Smart Merge: 9 phase files + master index + 1 reference doc                                   |
| 5   | Pre-Phase 2                     | Merge vào Phase 2A (blocking prerequisite, chỉ 0.5-1 ngày)                                    |
| 6   | Phase 4A/4B/4C                  | Giữ riêng (distinct domains: Saga, SaaS, Notification+Staff)                                  |
| 7   | Phase 5+6+7                     | Gộp thành `phase-5-7-finalization.md` (đều là finishing activities, mỗi phase ~30-40 dòng)    |
| 8   | File `step-0-6b-...`            | Move → `docs/references/auth-system-reference.md` (reference doc, không phải plan)            |
| 9   | `implementation_plan.md`        | Rewrite thành master index (~120-150 dòng)                                                    |
| 10  | Template style                  | Mô tả intent + constraints, để AI/developer tự quyết implementation dựa trên codebase context |

---

## 3. Quick Scan Audit — Findings

| #   | Finding                                    | Severity | Vị trí sửa                                       | Mô tả fix                                                                                                                                                                     |
| --- | ------------------------------------------ | -------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `bills` entity ownership mâu thuẫn         | Critical | `technical-architecture.md` §5.1, §6.2.5, §6.2.7 | Move `bills` từ Payment DB sang Order DB. Cập nhật entity list ở cả 2 service sections.                                                                                       |
| 2   | Guard chain naming không nhất quán         | Warning  | `technical-architecture.md` §8.2                 | Đổi `RoleGuard → SubRoleGuard` thành `PermissionGuard` (khớp code thực tế).                                                                                                   |
| 3   | Notification Kafka subscriptions mâu thuẫn | Warning  | `technical-architecture.md` §6.2.8               | Xóa `order.canceled` (vi phạm AP1). Giữ 3 topics: `tenant.created`, `payment.completed`, `payment.refunded`.                                                                  |
| 4   | Step 2.4 wording gây hiểu nhầm             | Warning  | `phase-2a-order-kafka.md`                        | Sửa "tham khảo template invoice/ cho TCP + MongoDB pattern" → "tham khảo template product/ cho TCP + PostgreSQL pattern" (Order Service dùng PostgreSQL, không phải MongoDB). |
| 5   | Cloudinary root path không nhất quán       | Info     | `technical-architecture.md` §6.2.4               | Thống nhất path format.                                                                                                                                                       |
| 6   | Bank Transfer trong business-logic.md      | Info     | `business-logic.md` §6.A                         | Thêm note: chuyển khoản qua Stripe Payment Methods, không VietQR riêng.                                                                                                       |
| 7   | `deleted_at` thiếu trong architecture      | Info     | `technical-architecture.md` §6.2.4, §6.2.5       | Thêm `deleted_at` vào entities có soft delete.                                                                                                                                |
| 8   | Phase 0 completion status mơ hồ            | Info     | `phase-0-foundation.md` + master index           | Đánh dấu AC đã hoàn thành.                                                                                                                                                    |

---

## 4. Cấu Trúc Thư Mục Cuối Cùng

```
docs/
├── implementation_plan.md               # REWRITE → master index (~120-150 dòng)
├── technical-architecture.md            # FIX NỘI DUNG — audit findings #1,2,3,5,7
├── business-logic.md                    # FIX NHỎ — finding #6
├── phases/                              # MỚI — các file plan con
│   ├── phase-0-foundation.md
│   ├── phase-1-catalog.md
│   ├── phase-2a-order-kafka.md          # Bao gồm Pre-Phase 2 (merged)
│   ├── phase-2b-kitchen-websocket.md
│   ├── phase-3-payment.md
│   ├── phase-4a-saga-hardening.md
│   ├── phase-4b-saas-onboarding.md
│   ├── phase-4c-notification-staff.md
│   └── phase-5-7-finalization.md
├── references/                          # MỚI — tài liệu tham chiếu kỹ thuật
│   └── auth-system-reference.md         # MOVED + RENAMED từ step-0-6b-...
└── architecture/                        # Giữ nguyên hoặc tạo mới
    ├── erd.png
    └── permission-matrix.md
```

### Naming Convention

- Phase files: `docs/phases/phase-{id}-{domain}.md`
- Reference docs: `docs/references/{domain}-reference.md`
- Architecture artifacts: `docs/architecture/{artifact-name}.{ext}`

---

## 5. Master Index Design (`implementation_plan.md` mới)

File rewrite từ 1119 dòng → ~120-150 dòng. Cấu trúc:

```
# KẾ HOẠCH TRIỂN KHAI — QRTable SaaS POS

## Nguyên tắc Chung
   Frontend/UI principles, Backend conventions, Multi-tenancy
   (tóm tắt + links tới .github/ và technical-architecture.md)

## Các Quyết Định Kiến Trúc Đã Thống Nhất
   Bảng 5-6 quyết định: Kafka 4P+2AP, Bills → Order, Cloudinary,
   Simplified Outbox, BFF Direct, Template-First

## Tổng Quan Lộ Trình
   Bảng phases: tên, ước lượng, trạng thái, link tới file chi tiết

## Dependency Graph
   ASCII diagram: phase dependencies + critical path + parallel tracks

## Tài Liệu Liên Quan
   Links tới architecture, business-logic, auth reference
   Mapping bài học khóa học → phases

## Tiến Độ Tổng Quan
   Bảng tracking: phase → status → ngày hoàn thành
```

Nguyên tắc: navigation hub, single source of truth cho tiến độ, không duplicate nội dung phase files.

---

## 6. Phase File Template

Mỗi phase file tuân theo template thống nhất:

```markdown
# Phase {ID} — {TÊN PHASE}

> **Mục tiêu:** {1-2 câu}
> **Ước lượng:** {thời gian}
> **Trạng thái:** {✅ DONE | 🔶 IN PROGRESS (Step X) | ⬜ TODO}

## Prerequisites

{Phase/step/infra cần hoàn thành trước + links}

## Tham Chiếu

{Bảng links tới technical-architecture.md, business-logic.md sections}

## Tổng Quan

{2-5 câu mô tả scope — standalone readable}

## Steps

### Step {X.Y} — {Tên} ({ước lượng})

**Mục tiêu:** {Deliverable — WHAT, không phải HOW}
**Yêu cầu chính:**

- {Requirements ở mức intent}
  **Lưu ý quan trọng:**
- {Constraints, architecture decisions, cross-references}
  **Verify:** {Cách kiểm tra — 1-2 dòng}

## Acceptance Criteria

- [ ] {Measurable, verifiable criteria}

## Outputs cho Phase tiếp theo

{Phase tiếp theo cần gì từ phase này}
```

### Nguyên tắc viết Steps

| Nên viết (WHAT + WHY)                                                             | Không nên viết (HOW cụ thể)                                                |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| "Tạo TypeORM entities cho categories, menu_items — tuân thủ multi-tenant pattern" | ~~"Tạo file apps/catalog/src/entities/category.entity.ts với các cột..."~~ |
| "Implement Category CRUD với sort ordering và time-based visibility"              | ~~"Trong catalog.service.ts, viết method createCategory()..."~~            |
| "BFF REST endpoints với appropriate guard chain"                                  | ~~"POST /api/v1/admin/categories với @Authorization({ secured: true })"~~  |

Lý do: AI/developer khi triển khai sẽ đọc codebase thực tế — plan mô tả intent + constraints, code context quyết định implementation.

### Những gì VẪN giữ cụ thể trong plan

- Kafka topic names (contract, không phải code)
- State machine transitions (business rule)
- Redis key patterns (convention)
- Guard/permission requirements (security contract)
- Quyết định kiến trúc đã chốt

---

## 7. Phân Bổ Nội Dung

| Nội dung gốc                  | Dòng      | File đích                        | Ghi chú                     |
| ----------------------------- | --------- | -------------------------------- | --------------------------- |
| Header + nguyên tắc           | 1-13      | Master index                     | Rút gọn                     |
| Tổng quan lộ trình            | 14-31     | Master index                     | Thêm links, cập nhật status |
| Phase 0 (Steps 0.1-0.7 + AC)  | 35-214    | `phase-0-foundation.md`          | ✅ DONE                     |
| Phase 1 (Steps 1.1-1.6 + AC)  | 217-465   | `phase-1-catalog.md`             | 🔶 IN PROGRESS              |
| Pre-Phase 2 (Step 2.0 + AC)   | 468-518   | `phase-2a-order-kafka.md`        | Merge đầu file              |
| Phase 2A (Steps 2.1-2.5 + AC) | 521-653   | `phase-2a-order-kafka.md`        | Fix #4                      |
| Phase 2B (Steps 2.6-2.7 + AC) | 657-743   | `phase-2b-kitchen-websocket.md`  |                             |
| Phase 3 (Steps 3.1-3.5 + AC)  | 747-803   | `phase-3-payment.md`             | Phản ánh bills → Order      |
| Phase 4A (Steps 4.1-4.2 + AC) | 806-854   | `phase-4a-saga-hardening.md`     |                             |
| Phase 4B (Steps 4.3-4.4 + AC) | 857-920   | `phase-4b-saas-onboarding.md`    |                             |
| Phase 4C (Steps 4.5-4.7 + AC) | 923-999   | `phase-4c-notification-staff.md` | Fix Notification subs       |
| Phase 5 (Step 5.1 + AC)       | 1002-1032 | `phase-5-7-finalization.md`      | Section "Phase 5"           |
| Phase 6 (Steps 6.1-6.2 + AC)  | 1035-1062 | `phase-5-7-finalization.md`      | Section "Phase 6"           |
| Phase 7 (Steps 7.1-7.2 + AC)  | 1065-1096 | `phase-5-7-finalization.md`      | Section "Phase 7"           |
| Mapping + Critical Path       | 1099-1119 | Master index                     | Di chuyển nguyên vẹn        |

Nguyên tắc chuyển đổi:

- Nội dung được **rewrite** theo template Section 6 (intent-driven)
- Architecture decisions và business rules **giữ nguyên**
- Code examples và file paths cụ thể **loại bỏ**
- Audit fixes **áp dụng inline**

---

## 8. Phase Files — Outline

**`phase-0-foundation.md`** (~80-100 dòng)

- ✅ DONE — historical record
- 7 steps: Tổ chức codebase, Pragmatic Layered, ERD, 2 Frontend apps, Shared libs, Auth setup, Layout skeleton

**`phase-1-catalog.md`** (~120-150 dòng)

- 🔶 IN PROGRESS — Step 1.4 done, next: Step 1.45
- 8 steps: Học (1.1), Mock UI Dashboard (1.2), Auth Frontend + Keycloakify (1.25), Mock UI Customer (1.3), Shared Types (1.4), Cloudinary (1.45), Catalog Backend (1.5), FE↔BE (1.6)
- Key: Cloudinary module, BFF Direct (chưa có Kafka), Table State Machine

**`phase-2a-order-kafka.md`** (~150-180 dòng)

- Pre-Phase 2 (Permission extension) merged vào đầu
- 6 steps: Permissions, Học Kafka, Mock UI, Shared Types, Order Service + Kafka, FE↔BE
- Key: Bills thuộc Order Service, Kafka setup, Stock locking, Session/Cart (Redis)

**`phase-2b-kitchen-websocket.md`** (~100-120 dòng)

- 2 steps: Kitchen Service + WebSocket Gateway, FE↔BE Real-time
- Key: Kitchen = Redis only, WebSocket rooms per role, Kafka bridge (3 topics) + BFF Direct (5 events)

**`phase-3-payment.md`** (~80-100 dòng)

- 4 steps: Học Stripe, Mock UI, Types + Backend, FE↔BE
- Key: Payment nhận billId, VND rounding, Stripe Checkout + Webhook, Cash, Refund

**`phase-4a-saga-hardening.md`** (~70-90 dòng)

- 2 steps: Học Saga, Implementation
- Key: Order Confirm Saga, Payment Complete Saga, Simplified Outbox, Idempotency, Delete constraints

**`phase-4b-saas-onboarding.md`** (~80-100 dòng)

- 2 steps: SaaS Service + Onboarding, UI + Integration
- Key: Tenant lifecycle, Feature gating, Kafka `tenant.created`, Self-service wizard = nice-to-have

**`phase-4c-notification-staff.md`** (~80-100 dòng)

- 3 steps: Notification Service, Staff Backend, Staff UI
- Key: 3 Kafka subscriptions (fixed), Staff management mở rộng user-access, Keycloak Admin API

**`phase-5-7-finalization.md`** (~100-120 dòng)

- 3 sections: Testing (Phase 5), Observability (Phase 6), Deploy + Demo (Phase 7)
- Mỗi section có steps + AC riêng

---

## 9. Thứ Tự Triển Khai

```
Bước 1 ──→ Bước 2 ──→ Bước 3 ──→ Bước 4 ──→ Bước 5
 Audit      Tạo        Phân rã    Rewrite     Cleanup
 Fixes      cấu trúc   nội dung   master      & verify
```

**Bước 1 — Fix audit findings** (~15-20 phút)

1. `technical-architecture.md`: Fix #1 (bills), #2 (guard), #3 (notification), #5 (cloudinary), #7 (deleted_at)
2. `business-logic.md`: Fix #6 (bank transfer)

**Bước 2 — Tạo cấu trúc thư mục** (~2 phút)

- `mkdir -p docs/phases docs/references`

**Bước 3 — Phân rã nội dung vào 9 phase files** (~60-90 phút)

- Rewrite theo template, áp dụng audit fixes inline
- Thứ tự: phase-0 → phase-1 → ... → phase-5-7

**Bước 4 — Rewrite master index** (~20-30 phút)

- `implementation_plan.md` → roadmap + links + decisions + dependency graph

**Bước 5 — Cleanup & Move** (~5 phút)

- Move `step-0-6b-...` → `docs/references/auth-system-reference.md`
- Xóa file gốc
- Verify links

---

## 10. Validation Checklist

- [ ] **V1 — Completeness:** 27 steps gốc đều xuất hiện trong phase files
- [ ] **V2 — Consistency:** Kafka topics (5), BFF Direct events (6), entity ownership, guard chain — tất cả khớp với architecture doc (đã fix)
- [ ] **V3 — Standalone:** Random pick 2-3 phase files → đọc hiểu được mà không mở file khác
- [ ] **V4 — Links:** Tất cả cross-references trong master index và phase files → file/section đích tồn tại
