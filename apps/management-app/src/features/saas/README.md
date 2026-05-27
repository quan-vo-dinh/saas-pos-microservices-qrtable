# SaaS feature (management-app)

Phân lớp theo Nx monorepo — **không trộn** label contract với UI component.

| Lớp                       | Vị trí                                               | Trách nhiệm                                            |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| Wire enum SaaS            | `@einvoice/shared-constants` (`saas-wire-types.ts`)  | Khớp `libs/constants/saas.constants.ts`                |
| Nhãn tiếng Việt           | `@einvoice/shared-constants` (`vi-domain-labels.ts`) | Map giá trị API/DB → chuỗi hiển thị                    |
| Format locale (tiền, giờ) | `formatters.ts`                                      | `formatVnd`, `formatDateTime` cho màn SaaS của app này |
| Badge trạng thái SaaS     | `components/badges/`                                 | Chỉ UI (màu + Badge); gọi `*Vi()` từ shared-constants  |
| Màn hình theo subdomain   | `admin-*`, `subscription/`, `payment-settings/`      | Table, dialog, page — import badge/label đúng lớp      |

**Quy tắc import**

- Cần chữ tiếng Việt thuần → `import { billingPeriodVi } from '@einvoice/shared-constants'`
- Cần badge → `import { SubscriptionStatusBadge } from '@/features/saas/components/badges'`
- Không tạo barrel re-export lại shared-constants (tránh `display/` kiểu facade lẫn lộn).

Khi customer-pwa cũng cần cùng badge → chuyển `components/badges` sang `libs/frontend/ui` (lúc đó mới đủ 2 consumer).
