# KẾ HOẠCH TRIỂN KHAI — QRTable SaaS POS

> **Nguyên tắc Frontend & UI/UX:** Sử dụng tối đa hệ sinh thái Shadcn UI (Lucide icons, React Hook Form, Zod, Radix UI, Recharts). Tuân thủ các conventions trong `.github/instructions/`.
>
> **Nguyên tắc Backend:** Pragmatic Layered Architecture (Controller → Service → Repository). Multi-tenant isolation bằng `tenant_id`. Guard chain: UserGuard → SessionGuard → TenantGuard → PermissionGuard.
>
> **Tham chiếu:** [Technical Architecture](technical-architecture.md) | [Business Logic](business-logic.md) | [Auth Reference](references/auth-system-reference.md)

---

## Các Quyết Định Kiến Trúc Đã Thống Nhất

| #   | Quyết định         | Tóm tắt                                                                                                                        | Tham chiếu                            |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| 1   | Kafka 4P+2AP       | 5 topics: order.confirmed, payment.completed, payment.refunded, kitchen.sla_warning, tenant.created. 6 events dùng BFF Direct. | [§7.2-7.4](technical-architecture.md) |
| 2   | Bills Ownership    | Bills thuộc Order Service, Payment chỉ nhận billId                                                                             | [§6.2.5](technical-architecture.md)   |
| 3   | Cloudinary Upload  | CloudinaryModule shared, path: qrtable/{tenant_id}/{folder}/                                                                   | [§6.2.4](technical-architecture.md)   |
| 4   | Simplified Outbox  | outbox_events table + cron poll. Full CDC (Debezium) = post-thesis                                                             | [§12](technical-architecture.md)      |
| 5   | BFF Direct Pattern | BFF emit WebSocket + invalidate cache sau TCP response cho UI-layer events                                                     | [§7.3](technical-architecture.md)     |
| 6   | Template-First     | Services khóa học giữ nguyên làm living templates, không sửa                                                                   | Phase 0 strategy                      |

---

## Tổng Quan Lộ Trình

| Phase     | Nội dung                         | Ước lượng   | Trạng thái       | File chi tiết                                     |
| --------- | -------------------------------- | ----------- | ---------------- | ------------------------------------------------- |
| Phase 0   | Nền tảng & Kiến trúc             | ~1 tuần     | ✅ DONE          | [phase-0](phases/phase-0-foundation.md)           |
| Phase 1   | Catalog + Menu + Table           | ~2-3 tuần   | 🔶 Step 1.4 done | [phase-1](phases/phase-1-catalog.md)              |
| Phase 2A  | Permissions + Order + Kafka      | ~2-2.5 tuần | ⬜ TODO          | [phase-2a](phases/phase-2a-order-kafka.md)        |
| Phase 2B  | Kitchen/KDS + WebSocket          | ~1-1.5 tuần | ⬜ TODO          | [phase-2b](phases/phase-2b-kitchen-websocket.md)  |
| Phase 3   | Payment (Stripe + Cash)          | ~1-2 tuần   | ⬜ TODO          | [phase-3](phases/phase-3-payment.md)              |
| Phase 4A  | Saga + Hardening                 | ~1 tuần     | ⬜ TODO          | [phase-4a](phases/phase-4a-saga-hardening.md)     |
| Phase 4B  | SaaS + Tenant Onboarding         | ~1 tuần     | ⬜ TODO          | [phase-4b](phases/phase-4b-saas-onboarding.md)    |
| Phase 4C  | Notification + Staff Mgmt        | ~1 tuần     | ⬜ TODO          | [phase-4c](phases/phase-4c-notification-staff.md) |
| Phase 5-7 | Testing + Observability + Deploy | ~3-5 tuần   | ⬜ TODO          | [phase-5-7](phases/phase-5-7-finalization.md)     |

---

## Dependency Graph

```
  CRITICAL PATH (demo / luồng chính)
  ══════════════════════════════════

      Phase 0
          │
          ▼
      Phase 1
          │
          ▼
      Phase 2A
          │
          ▼
      Phase 2B
          │
          ▼
      Phase 3 ────────────────────────────────────────────────► Phase 5-7
          │                    (Testing + Observability + Deploy)
          │
          │   PARALLEL TRACK (sau Phase 3, tùy thời gian)
          │
          ├──────────────────────────────► Phase 4A
          │                                (song song hoặc sau Phase 3)
          │
          └──────────────────────────────► Phase 4B
                                           (song song hoặc sau Phase 3)
                                                 │
                                                 ▼
                                            Phase 4C
                                         (bắt buộc sau Phase 4B)


  Ký hiệu
  ───────
    │ ▼ ──►   thứ tự phụ thuộc / luồng triển khai
    Phase 5-7 = Phase 5 (Testing) + Phase 6 (Observability) + Phase 7 (Deploy)
```

**Critical Path:** Phase 0 → 1 → 2A → 2B → 3 → 5-7 (Demo)

**Parallel Track:** Phase 4A và Phase 4B có thể chạy song song hoặc ngay sau Phase 3; Phase 4C phụ thuộc Phase 4B.

---

## Mapping Bài Học Khóa Học → Phase

|   Bài   | Nội dung                                    |    Phase    |
| :-----: | ------------------------------------------- | :---------: |
|  1-104  | Foundation (Nx, TCP, gRPC, Keycloak, Redis) |   ✅ Done   |
| 105-110 | TCP Service mới + Cloudinary upload         |   Phase 1   |
| 115-123 | Kafka + Event-Driven                        | Phase 2A/2B |
| 111-113 | Stripe Checkout + Webhook                   |   Phase 3   |
| 124-129 | Saga Pattern + Compensation                 |  Phase 4A   |
| 130-135 | Testing (Unit + Integration + E2E)          |   Phase 5   |
| 136-151 | Observability (PLG + Prometheus + Tempo)    |   Phase 6   |
| 152-155 | Docker Deploy                               |   Phase 7   |

---

## Tài Liệu Liên Quan

| Tài liệu                                                                   | Mô tả                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [technical-architecture.md](technical-architecture.md)                     | Kiến trúc tổng thể, microservices, Kafka, WebSocket, Auth, Payment |
| [business-logic.md](business-logic.md)                                     | Business rules, state machines, tenant isolation                   |
| [references/auth-system-reference.md](references/auth-system-reference.md) | Chi tiết hệ thống auth đã triển khai                               |
| [.github/copilot-instructions.md](../.github/copilot-instructions.md)      | Project guidelines, conventions, tech stack                        |

---

## Tiến Độ Tổng Quan

| Phase     | Ngày bắt đầu | Ngày hoàn thành    | Ghi chú                   |
| --------- | ------------ | ------------------ | ------------------------- |
| Phase 0   | —            | ✅ Đã xong         | Foundation complete       |
| Phase 1   | —            | 🔶 Đang triển khai | Step 1.4 done, next: 1.45 |
| Phase 2A  | —            | —                  |                           |
| Phase 2B  | —            | —                  |                           |
| Phase 3   | —            | —                  |                           |
| Phase 4A  | —            | —                  |                           |
| Phase 4B  | —            | —                  |                           |
| Phase 4C  | —            | —                  |                           |
| Phase 5-7 | —            | —                  |                           |

> **4 highlight demo ấn tượng nhất:** Phase 1 (QR + Menu), Phase 2 (Real-time Ordering), Phase 3 (Payment), Phase 6 (Grafana Tracing).
