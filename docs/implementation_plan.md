# KẾ HOẠCH TRIỂN KHAI — QRTable SaaS POS

> **Nguyên tắc Frontend & UI/UX:** Sử dụng tối đa hệ sinh thái Shadcn UI (Lucide icons, React Hook Form, Zod, Radix UI, Recharts). Tuân thủ các conventions trong `.github/instructions/`.
>
> **Nguyên tắc Backend:** Pragmatic Layered Architecture (Controller → Service → Repository). Multi-tenant isolation bằng `tenant_id`. Guard chain: **UserGuard** (staff/JWT) hoặc **SessionGuard** (khách) → **TenantGuard** → **PermissionGuard** (xem §8.2 technical-architecture).
>
> **Tham chiếu:** [Technical Architecture](technical-architecture.md) | [Business Logic](business-logic.md) | [Auth Reference](references/auth-system-reference.md)

---

## Các Quyết Định Kiến Trúc Đã Thống Nhất

| #   | Quyết định         | Tóm tắt                                                                                                                                                                                                                                                                                                                                    | Tham chiếu                            |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| 1   | Kafka 4P+2AP       | 5 topics: order.confirmed, payment.completed, payment.refunded, kitchen.sla_warning, tenant.created. 6 events dùng BFF Direct.                                                                                                                                                                                                             | [§7.2-7.4](technical-architecture.md) |
| 2   | Bills Ownership    | Bills thuộc Order Service, Payment chỉ nhận billId                                                                                                                                                                                                                                                                                         | [§6.2.5](technical-architecture.md)   |
| 3   | Cloudinary Upload  | CloudinaryModule shared trong `libs/providers/cloudinary/`, path: qrtable/{tenant_id}/{folder}/. Chọn `libs/providers/` thay vì `libs/configuration/` vì Cloudinary có business logic (upload, validation, URL generation), không chỉ config. `libs/providers/` là category cho external service integrations (Cloudinary, Payment, SMTP). | [§6.2.4](technical-architecture.md)   |
| 4   | Simplified Outbox  | outbox_events table + cron poll. Full CDC (Debezium) = post-thesis                                                                                                                                                                                                                                                                         | [§12](technical-architecture.md)      |
| 5   | BFF Direct Pattern | BFF emit WebSocket + invalidate cache sau TCP response cho UI-layer events                                                                                                                                                                                                                                                                 | [§7.3](technical-architecture.md)     |
| 6   | Template-First     | Services khóa học giữ nguyên làm living templates, không sửa                                                                                                                                                                                                                                                                               | Phase 0 strategy                      |
| 7   | Step 2.4 business  | Đặc tả nghiệp vụ đã chốt (stock Catalog TCP, deduct khi confirm, bill submit đầu tiên, transfer saga, session PG+Redis, RBAC cancel, WS/event scope, `MenuItem.station`, ranh giới thanh toán) — [`business-logic-step-2.4-spec.vi.md`](specs/business-logic-step-2.4-spec.vi.md)                                                          | Audit Q1–Q12 → spec                   |

---

## Tổng Quan Lộ Trình

Cột **Trọng số** = phần trăm đóng góp ước lượng của phase vào **toàn bộ khối lượng dự án** (100%), dựa trên phạm vi nghiệp vụ, số lớp hệ thống chạm tới, rủi ro kỹ thuật và độ phụ thuộc luồng demo luận văn — **không** tính bằng cách chia đều theo số tuần ghi trong từng file phase.

Cột **% phase** = mức hoàn thành nội bộ của phase đó (0–100%), độc lập với trọng số.

Cột **Phạm vi tích lũy (P0→Pn @100%)** = tổng trọng số từ **Phase 0** đến **hết phase ở hàng đó**, **giả định** mọi phase trong đoạn đó đạt **100%** hoàn thành. Đây là **trần phần trăm khối lượng toàn dự án** đã được “bao phủ” khi chạm milestone đó — **không** phải tiến độ thực tế hiện tại (tiến độ thực tế vẫn lấy theo `Σ (Trọng số × % phase)` ở dưới).

| Phase     | Nội dung                         | Ước lượng   | Trọng số | % phase  | Phạm vi tích lũy (P0→Pn @100%) | Trạng thái      | File chi tiết                                     |
| --------- | -------------------------------- | ----------- | -------- | -------- | ------------------------------ | --------------- | ------------------------------------------------- |
| Phase 0   | Nền tảng & Kiến trúc             | ~1 tuần     | **7%**   | **100%** | **7%**                         | ✅ Hoàn thành   | [phase-0](phases/phase-0-foundation.md)           |
| Phase 1   | Catalog + Menu + Table           | ~2-3 tuần   | **20%**  | **100%** | **27%**                        | ✅ Hoàn thành   | [phase-1](phases/phase-1-catalog.md)              |
| Phase 2A  | Permissions + Order + Kafka      | ~2-2.5 tuần | **18%**  | **100%** | **45%**                        | ✅ Hoàn thành   | [phase-2a](phases/phase-2a-order-kafka.md)        |
| Phase 2B  | Kitchen/KDS + WebSocket          | ~1-1.5 tuần | **10%**  | **100%** | **55%**                        | ✅ Hoàn thành   | [phase-2b](phases/phase-2b-kitchen-websocket.md)  |
| Phase 3   | Payment (SePay/VietQR + Cash)    | ~1-2 tuần   | **10%**  | **100%** | **65%**                        | ✅ Hoàn thành   | [phase-3](phases/phase-3-payment.md)              |
| Phase 4A  | Saga + Hardening                 | ~1 tuần     | **8%**   | **0%**   | **73%**                        | ⏸ Deferred     | [phase-4a](phases/phase-4a-saga-hardening.md)     |
| Phase 4B  | SaaS + Tenant Onboarding         | ~1 tuần     | **7%**   | **100%** | **80%**                        | ✅ Hoàn thành   | [phase-4b](phases/phase-4b-saas-onboarding.md)    |
| Phase 4C  | Notification + Staff Mgmt        | ~1 tuần     | **6%**   | **0%**   | **86%**                        | ⬜ Chưa bắt đầu | [phase-4c](phases/phase-4c-notification-staff.md) |
| Phase 5-7 | Testing + Observability + Deploy | ~3-5 tuần   | **14%**  | **0%**   | **100%**                       | ⬜ Chưa bắt đầu | [phase-5-7](phases/phase-5-7-finalization.md)     |
| **Σ**     |                                  |             | **100%** |          | —                              |                 |                                                   |

**Tiến độ tổng dự án (có trọng số):** `Σ (Trọng số × % phase)` = **72,0%** (Phase 0, 1, 2A, 2B, 3 và 4B đã hoàn thành; Phase 4A deferred; Phase 4C và Phase 5-7 chưa bắt đầu) — cập nhật đồng bộ ngày 2026-05-13.

**Ghi chú Phase 1 (✅):** Các bước 1.1–1.6 và acceptance trong `phase-1-catalog.md` đã đóng theo phạm vi Phase 1. Việc cải tiến không chặn phase (ví dụ export QR PDF, tenant resolve động trên Customer PWA) ghi nhận là backlog hoặc phase sau.

**Ghi chú sau Phase 4B (2026-05-13):** Bảng này phản ánh trạng thái triển khai hiện tại sau khi Phase 4B hoàn tất và sau đợt canonical hóa Phase 2A/2B/3/4B. Các phase tương lai hoặc historical supporting docs vẫn phải áp dụng thứ tự nguồn sự thật trong [`docs/README.md`](README.md).

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
          │   PARALLEL TRACK (trạng thái hiện tại sau Phase 4B)
          │
          ├──────────────────────────────► Phase 4A
          │                                (deferred)
          │
          └──────────────────────────────► Phase 4B
                                           (đã hoàn thành)
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

**Parallel Track:** Phase 4B đã hoàn thành sau Phase 3. Phase 4A hiện deferred; Phase 4C phụ thuộc Phase 4B và vẫn chưa bắt đầu.

---

## Mapping Bài Học Khóa Học → Phase

| Bài     | Nội dung                                    | Phase       |
| ------- | ------------------------------------------- | ----------- |
| 1-104   | Foundation (Nx, TCP, gRPC, Keycloak, Redis) | ✅ Done     |
| 105-110 | TCP Service mới + Cloudinary upload         | ✅ Done     |
| 115-123 | Kafka + Event-Driven                        | Phase 2A/2B |
| 111-113 | SePay VietQR + Webhook (thay Stripe)        | Phase 3     |
| 124-129 | Saga Pattern + Compensation                 | Phase 4A    |
| 130-135 | Testing (Unit + Integration + E2E)          | Phase 5     |
| 136-151 | Observability (PLG + Prometheus + Tempo)    | Phase 6     |
| 152-155 | Docker Deploy                               | Phase 7     |

---

## Tài Liệu Liên Quan

| Tài liệu                                                                       | Mô tả                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| [technical-architecture.md](technical-architecture.md)                         | Kiến trúc tổng thể, microservices, Kafka, WebSocket, Auth, Payment              |
| [business-logic.md](business-logic.md)                                         | Business rules, state machines, tenant isolation                                |
| [business-logic-step-2.4-spec.vi.md](specs/business-logic-step-2.4-spec.vi.md) | Đặc tả Step 2.4 đã chốt (Q1–Q12); xung đột với tài liệu khác → ưu tiên file này |
| [references/auth-system-reference.md](references/auth-system-reference.md)     | Chi tiết hệ thống auth đã triển khai                                            |
| [.github/copilot-instructions.md](../.github/copilot-instructions.md)          | Project guidelines, conventions, tech stack                                     |

---

## Tiến Độ Tổng Quan

| Phase     | Trọng số | % hoàn thành phase | Đóng góp vào tổng dự án | Phạm vi tích lũy (P0→Pn @100%) | Ngày cập nhật | Ghi chú                                                                                                                                                                             |
| --------- | -------- | ------------------ | ----------------------- | ------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0   | 7%       | 100%               | 7,0%                    | **7%**                         | 2026-04-17    | Nền tảng, auth, monorepo, 2 app skeleton                                                                                                                                            |
| Phase 1   | 20%      | 100%               | 20,0%                   | **27%**                        | 2026-04-17    | Catalog + BFF + Cloudinary + CRUD + hooks + FE↔BE; Phase 1 đóng                                                                                                                    |
| Phase 2A  | 18%      | 100%               | 18,0%                   | **45%**                        | 2026-05-13    | Permissions, Order Service, Redis cart/session, Kafka `order.confirmed`, BFF Direct và FE↔BE integration đã triển khai; phase doc đã canonical hóa thành final phase record.       |
| Phase 2B  | 10%      | 100%               | 10,0%                   | **55%**                        | 2026-05-13    | Kitchen Service, KDS, WebSocket Gateway và realtime FE↔BE đã triển khai; phase doc đã canonical hóa thành final phase record.                                                      |
| Phase 3   | 10%      | 100%               | 10,0%                   | **65%**                        | 2026-05-09    | Payment service + POS `/pos/bills` + Dashboard refund real API + post-payment bill/session/table finalization; email/receipt durable notification được defer sang Phase 4C.         |
| Phase 4A  | 8%       | 0%                 | 0%                      | **73%**                        | 2026-05-13    | Deferred: saga/hardening toàn diện chưa được đóng như một phase riêng; một số pattern outbox/guard hardening đã xuất hiện trong Phase 3/4B nhưng không tính là hoàn thành Phase 4A. |
| Phase 4B  | 7%       | 100%               | 7,0%                    | **80%**                        | 2026-05-13    | SaaS onboarding, tenant lifecycle, subscription/plan, two-tier payment, tenant payment settings, landing/admin/dashboard/customer suspend behavior và verification đã hoàn tất.     |
| Phase 4C  | 6%       | 0%                 | 0%                      | **86%**                        | —             | Notification + staff                                                                                                                                                                |
| Phase 5-7 | 14%      | 0%                 | 0%                      | **100%**                       | —             | Test + PLG stack + deploy demo                                                                                                                                                      |
| **Tổng**  | **100%** | —                  | **72,0%**               | —                              | 2026-05-13    | Công thức tiến độ thực: `Σ (trọng số × % phase / 100)`                                                                                                                              |

> **4 highlight demo ấn tượng nhất:** Phase 1 (QR + Menu), Phase 2 (Real-time Ordering), Phase 3 (Payment), Phase 6 (Grafana Tracing).

### Cách đọc trọng số (tóm tắt lý do)

- **Phạm vi tích lũy (P0→Pn @100%):** Ví dụ khi **hoàn tất tuyệt đối** đến hết Phase 2A, bạn đã “đăng ký” làm **45%** khối lượng có trọng số của cả dự án (7+20+18); cột này giúp so sánh milestone với nhau, tách biệt với **tiến độ thực** (hàng phụ thuộc `% phase` thực tế từng phase).
- **Phase 0 (7%):** Ít bước hơn các phase domain nhưng là điều kiện tiên quyết (auth, repo layout, apps) — trọng số vừa phải.
- **Phase 1 (20%):** Hai frontend, toàn bộ domain catalog (4 aggregate), BFF, TCP, Redis menu cache, Cloudinary, multi-tenant — **khối lượng lớn nhất** trong các phase “một domain” — **✅ đã hoàn thành**.
- **Phase 2A (18%):** Order + Kafka + inventory locking + mở rộng permission — **độ phức tạp và rủi ro tích hợp cao**, gần tương đương Phase 1 về nỗ lực kỹ thuật.
- **Phase 2B (10%) / Phase 3 (10%):** Mỗi phase một trục lớn (real-time / tiền tệ) nhưng phạm vi hẹp hơn 2A nếu tách gọn.
- **Phase 4A–4C (8% + 7% + 6%):** Nghiệp vụ nền tảng SaaS và thông báo — quan trọng nhưng thường ít surface area hơn luồng đặt món–bếp–thanh toán.
- **Phase 5–7 (14%):** Theo lịch ~3–5 tuần nhưng là **chứng minh chất lượng luận văn** (test + quan sát + tái lập demo) — trọng số đáng kể dù không ghi nhiều “feature” mới.
