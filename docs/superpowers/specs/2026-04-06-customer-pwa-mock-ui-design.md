# Step 1.3 — Customer PWA Mock UI Design Spec

> Build complete mock UI for the customer-facing PWA with 4 pages, using shared mock data and mobile-first (app-like) design.

## Scope

Replace all 4 FeaturePlaceholder pages in `apps/customer-pwa/` with fully interactive mock UI:

1. **Landing Page** — QR session initialization flow
2. **Menu Page** — Category browsing, item detail bottom sheet, cart management
3. **Order Tracking Page** — Order status timeline, item list
4. **Request Payment Page** — Payment method selection, confirmation

**Out of scope:** Real API integration (uses mock data), camera-based QR scanning, PWA install prompt, real-time WebSocket updates.

## Prerequisites

- Step 1.45 (shared UI library refactor) — ✅ completed
- Step 1.4 (shared types) — ✅ completed
- `@einvoice/frontend-ui` has 20 shadcn primitives + 2 composites

## Design Decisions

| Decision              | Choice                                  | Rationale                                          |
| --------------------- | --------------------------------------- | -------------------------------------------------- |
| Design style          | Pure mobile, app-like (max-w-sm)        | Target device is customer's phone scanning QR      |
| Item detail UX        | Bottom sheet (Drawer)                   | Native mobile feel, swipe-to-close                 |
| Mock data source      | Shared `@einvoice/mock-data` lib        | Both apps reuse same data, single source of truth  |
| New shadcn components | Drawer (vaul-based) added to shared lib | Bottom sheet pattern used in multiple pages        |
| Mock strategy         | Direct import, no API calls             | Swap to hooks when backend ready (Step 1.6)        |
| Approach              | Bottom-Up Component-First               | Build reusable components, then compose into pages |

---

## Section 1: Shared Mock Data Library

### New library: `libs/shared/mock-data/`

Move existing mock data from management-app and add new mock entities.

**Structure:**

```
libs/shared/mock-data/
├── package.json             # @einvoice/mock-data
├── src/
│   ├── index.ts             # barrel exports
│   └── lib/
│       ├── categories.ts    # 5 categories (moved from mgmt-app)
│       ├── menu-items.ts    # 20 items (moved from mgmt-app)
│       ├── areas.ts         # 4 areas (moved from mgmt-app)
│       ├── tables.ts        # 17 tables (moved from mgmt-app)
│       ├── orders.ts        # NEW: 5-6 mock orders (various statuses)
│       ├── sessions.ts      # NEW: 2-3 mock sessions
│       └── helpers.ts       # Query helper functions
```

**tsconfig.base.json path alias:** `@einvoice/mock-data` → `libs/shared/mock-data/src/index.ts`

**Helper functions:**

```typescript
getMenuByCategory(): (Category & { items: MenuItem[] })[]
getTableByQrToken(token: string): Table | undefined
getOrdersBySession(sessionId: string): Order[]
getMockSession(tableId: string): SessionInfo
```

**Migration:** Management-app updates imports from `./data/*` to `@einvoice/mock-data`. Existing schema files (`schema.ts`) in management-app remain local (they define Zod schemas for forms, not shared types).

---

## Section 2: New Shared UI Components

### Drawer component added to `@einvoice/frontend-ui`

Install from shadcn registry: `npx shadcn add drawer` (inside `libs/frontend/ui/`).

This adds `vaul` as a dependency. The Drawer component provides:

- Swipe-to-close gesture
- Snap points
- Overlay backdrop
- Mobile-optimized animations

Export from `libs/frontend/ui/src/index.ts` as part of primitives.

No other new shared components needed. App-specific compositions (e.g., `CartDrawer`) use `Drawer` internally but live in customer-pwa.

---

## Section 3: Page Designs

### Page 1: Landing Page (`/landing`)

**Route:** `/landing?table={tableId}&token={hmacToken}`

**Flow:**

1. Parse URL search params (`table`, `token`)
2. If params missing → show "Scan QR" instruction card with illustration
3. If params present → mock verify: lookup table by qrToken in mock data
4. Show loading spinner (1.5s simulated delay)
5. Display confirmation card: restaurant name, table name, area, capacity
6. User taps "Vào Menu" → `startSession()` → navigate to `/menu`

**Components:**

```
features/landing/components/
└── qr-landing-card.tsx    # Handles full flow: parse → verify → display → redirect
```

**QrLandingCard states:**

- `scanning` — loading spinner + "Đang xác nhận..."
- `confirmed` — table info card + "Vào Menu" button
- `error` — "Mã QR không hợp lệ" + retry instruction
- `no-params` — "Quét mã QR tại bàn để bắt đầu" instruction

---

### Page 2: Menu Page (`/menu`)

**Layout (top to bottom):**

1. Sticky category tabs (horizontal scroll)
2. Scrollable menu items grid (2 columns)
3. Floating cart FAB (bottom-right, shows count + total)

**Components:**

```
features/menu/components/
├── category-tabs.tsx           # Horizontal scrollable category filter
├── menu-items-grid.tsx         # 2-col grid, handles empty/loading states
├── menu-item-card.tsx          # Image, name, desc (2-line), price, "Hết hàng" badge, add button
├── menu-item-detail-drawer.tsx # Bottom sheet: large image, full desc, qty picker, note input, add to cart
├── cart-floating-button.tsx    # FAB: cart icon + item count badge + total price
└── cart-drawer.tsx             # Bottom sheet: cart items list, qty edit, remove, total, "Đặt món" button
```

**CategoryTabs behavior:**

- "Tất cả" tab as default (shows all items)
- Tap category → filter items
- Active tab highlighted with primary color
- Horizontal scroll with touch/swipe

**MenuItemCard details:**

- Image: 1:1 aspect ratio, placeholder gradient if `imageUrl` is null
- Name: font-semibold, single line truncate
- Description: text-muted-foreground, 2-line clamp
- Price: `formatCurrency(price)` (e.g., "45.000 ₫")
- Out-of-stock: overlay "Hết hàng" Badge, disabled add button
- Tap card body → open detail drawer
- Tap add button → add 1 to cart (quick add)

**MenuItemDetailDrawer:**

- Large image at top (16:9 or placeholder)
- Full name + full description
- Quantity picker: "−" `[count]` "+" (min 1, max 99)
- Optional note input (textarea, placeholder: "Ghi chú cho món này...")
- "Thêm vào giỏ" button with total for this item
- Uses shared `Drawer` from `@einvoice/frontend-ui`

**CartDrawer:**

- List of cart items: name, qty (+/- controls), unit price, line total
- Swipe-to-delete or tap trash icon
- Total section: items count + total price
- "Đặt món" button → creates mock order → clear cart → navigate to `/order-tracking`
- Empty state: "Giỏ hàng trống" with illustration

**Cart integration:**

- Uses `useCart()` context (already implemented)
- `addItem(menuItem, quantity, note)`, `removeItem(id)`, `updateQuantity(id, qty)`
- Cart state persists across page navigations (context provider in App.tsx)

---

### Page 3: Order Tracking Page (`/order-tracking`)

**Layout:**

1. Header: "Đơn hàng #XXX" + current status badge
2. Status timeline (vertical)
3. Ordered items list
4. Total summary
5. Action button: "Yêu cầu thanh toán" → navigate to `/request-payment`

**Components:**

```
features/order/components/
├── order-status-timeline.tsx   # Vertical timeline with 6 steps
├── order-items-list.tsx        # Ordered items with qty and price
└── order-summary-card.tsx      # Total items, total price, status
```

**OrderStatusTimeline steps:**

1. 🕐 Chờ xác nhận (pending)
2. ✅ Đã xác nhận (confirmed)
3. 👨‍🍳 Đang chế biến (preparing)
4. 🍽️ Sẵn sàng phục vụ (ready)
5. ✅ Đã phục vụ (served)
6. ❌ Đã hủy (cancelled) — only shown if applicable

Each step shows: icon, label, timestamp (if reached), active/done/pending visual state.

**Mock behavior:** Display 1-2 mock orders from `@einvoice/mock-data`. One "preparing" and one "served" to demonstrate different states.

---

### Page 4: Request Payment Page (`/request-payment`)

**Layout:**

1. Order summary card (items + total)
2. Payment method selector
3. Confirm button
4. Success screen (after confirm)

**Components:**

```
features/payment/components/
├── payment-summary-card.tsx      # Items count, subtotal, VAT info, total
├── payment-method-selector.tsx   # Radio group: cash, card, momo, zalopay, bank_transfer
├── payment-confirm-button.tsx    # "Yêu cầu thanh toán" → mock submit
└── payment-success-card.tsx      # Check animation, "Nhân viên sẽ đến", back button
```

**PaymentMethodSelector options:**

- Tiền mặt (cash) — default
- Thẻ ngân hàng (card)
- MoMo
- ZaloPay
- Chuyển khoản (bank_transfer)

Uses constants from `@einvoice/shared-constants` (`PAYMENT_METHODS`).

**Mock flow:** Tap confirm → 1s delay → show success card → "Nhân viên sẽ đến trong giây lát" message → option to go back to menu.

---

## Section 4: File Structure & Data Flow

### Complete customer-pwa file structure (new files):

```
src/
├── features/
│   ├── landing/
│   │   └── components/
│   │       └── qr-landing-card.tsx          # NEW
│   ├── menu/
│   │   ├── components/
│   │   │   ├── category-tabs.tsx            # NEW
│   │   │   ├── menu-item-card.tsx           # NEW
│   │   │   ├── menu-item-detail-drawer.tsx  # NEW
│   │   │   ├── menu-items-grid.tsx          # NEW
│   │   │   ├── cart-floating-button.tsx     # NEW
│   │   │   └── cart-drawer.tsx              # NEW
│   │   ├── hooks/use-menu-query.ts          # EXISTS
│   │   └── services/menu.service.ts         # EXISTS
│   ├── order/
│   │   ├── components/
│   │   │   ├── order-status-timeline.tsx    # NEW
│   │   │   ├── order-items-list.tsx         # NEW
│   │   │   └── order-summary-card.tsx       # NEW
│   │   ├── hooks/use-order-query.ts         # EXISTS
│   │   └── services/order.service.ts        # EXISTS
│   └── payment/
│       ├── components/
│       │   ├── payment-summary-card.tsx      # NEW
│       │   ├── payment-method-selector.tsx   # NEW
│       │   ├── payment-confirm-button.tsx    # NEW
│       │   └── payment-success-card.tsx      # NEW
│       └── services/payment.service.ts      # EXISTS
├── pages/
│   ├── landing-page.tsx                     # REWRITE
│   ├── menu-page.tsx                        # REWRITE
│   ├── order-tracking-page.tsx              # REWRITE
│   └── request-payment-page.tsx             # REWRITE
```

### Data flow per page:

1. **Landing** → parse URL params → `getTableByQrToken()` from `@einvoice/mock-data` → `useSession().startSession()` → navigate `/menu`
2. **Menu** → `getMenuByCategory()` from `@einvoice/mock-data` → render grid → `useCart()` for add/remove → "Đặt món" creates mock order → navigate `/order-tracking`
3. **Order Tracking** → mock orders from `@einvoice/mock-data` + cart items from `useCart()` → render timeline → "Yêu cầu thanh toán" → navigate `/request-payment`
4. **Payment** → cart total from `useCart()` → select method → mock confirm → success screen → option to navigate back to `/menu`

### Mock data bypass strategy:

Pages import mock data directly from `@einvoice/mock-data` instead of using API hooks. When backend is ready (Step 1.6), replace:

```typescript
// Before (mock):
import { getMenuByCategory } from '@einvoice/mock-data';
const menu = getMenuByCategory();

// After (real):
const { data: menu } = useMenuQuery(tenantId);
```

Component props remain the same — only data source changes.

---

## Section 5: Verification & Risks

### Verification:

- `npx nx lint customer-pwa --fix` must pass
- `npx nx lint frontend-ui --fix` must pass (after adding Drawer)
- `npx nx lint management-app --fix` must pass (after mock data migration)
- Visual browser check: all 4 pages render correctly at 375px width
- Cart flow: add items → edit quantity → remove → verify totals correct
- Navigation: Landing → Menu → Order Tracking → Payment → back to Menu

### Risks:

| Risk                                                         | Mitigation                                               |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| Drawer component may need `vaul` dependency not in workspace | `pnpm add vaul` at root if needed                        |
| Mock data move may break management-app imports              | Update imports + lint verify                             |
| Cart state lost on page refresh                              | Acceptable for mock — add localStorage persistence later |
| No loading/error states for mock                             | Use simulated delays (setTimeout) for realistic UX       |

### Dependencies (external packages that may be needed):

- `vaul` — for Drawer component (auto-installed by shadcn)
- No other new dependencies expected
