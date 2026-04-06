# Customer PWA Mock UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build complete mock UI for all 4 customer PWA pages with shared mock data library

**Architecture:** Bottom-up component-first approach. First create shared mock data lib, add Drawer to shared UI, then build page components from inner to outer, finally compose into pages. All data is mock (no API calls). Cart and session managed via existing React context providers.

**Tech Stack:** React 19, Vite, React Router v7, TanStack Query, shadcn/ui (radix-nova), Tailwind CSS v4, vaul (Drawer)

**Design Spec:** `docs/superpowers/specs/2026-04-06-customer-pwa-mock-ui-design.md`

---

## Task 1: Create shared mock-data library

**Files:**
- Create: `libs/shared/mock-data/package.json`
- Create: `libs/shared/mock-data/src/index.ts`
- Create: `libs/shared/mock-data/src/lib/categories.ts`
- Create: `libs/shared/mock-data/src/lib/menu-items.ts`
- Create: `libs/shared/mock-data/src/lib/areas.ts`
- Create: `libs/shared/mock-data/src/lib/tables.ts`
- Create: `libs/shared/mock-data/src/lib/orders.ts`
- Create: `libs/shared/mock-data/src/lib/sessions.ts`
- Create: `libs/shared/mock-data/src/lib/helpers.ts`
- Create: `libs/shared/mock-data/tsconfig.json`
- Create: `libs/shared/mock-data/tsconfig.lib.json`
- Create: `libs/shared/mock-data/project.json`
- Modify: `tsconfig.base.json` — add `@einvoice/mock-data` path alias
- Modify: `apps/customer-pwa/tsconfig.json` — add `@einvoice/mock-data` path alias
- Modify: `apps/management-app/src/features/menu/index.tsx` — update data imports
- Modify: `apps/management-app/src/features/tables/index.tsx` — update data imports

### Steps

- [ ] **Step 1: Create directory structure and package.json**

```bash
mkdir -p libs/shared/mock-data/src/lib
```

Create `libs/shared/mock-data/package.json`:
```json
{
  "name": "@einvoice/mock-data",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

Create `libs/shared/mock-data/project.json`:
```json
{
  "name": "mock-data",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/shared/mock-data/src",
  "projectType": "library",
  "tags": []
}
```

Create `libs/shared/mock-data/tsconfig.json`:
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "module": "esnext",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "files": [],
  "include": [],
  "references": [{ "path": "./tsconfig.lib.json" }]
}
```

Create `libs/shared/mock-data/tsconfig.lib.json`:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "types": ["node"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **Step 2: Move categories data**

Create `libs/shared/mock-data/src/lib/categories.ts` — copy from `apps/management-app/src/features/menu/data/categories.ts` but change the type import:

```typescript
import type { Category } from '@einvoice/types';

export const categories: Category[] = [
  {
    id: 'cat-001',
    name: 'Khai vị',
    sortOrder: 1,
    timeStart: null,
    timeEnd: null,
    status: 'active',
    itemCount: 4,
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'cat-002',
    name: 'Món chính',
    sortOrder: 2,
    timeStart: null,
    timeEnd: null,
    status: 'active',
    itemCount: 6,
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'cat-003',
    name: 'Đồ uống',
    sortOrder: 3,
    timeStart: null,
    timeEnd: null,
    status: 'active',
    itemCount: 5,
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'cat-004',
    name: 'Tráng miệng',
    sortOrder: 4,
    timeStart: null,
    timeEnd: null,
    status: 'active',
    itemCount: 3,
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'cat-005',
    name: 'Điểm tâm',
    sortOrder: 5,
    timeStart: '06:00',
    timeEnd: '10:00',
    status: 'active',
    itemCount: 3,
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'cat-006',
    name: 'Combo đặc biệt',
    sortOrder: 6,
    timeStart: null,
    timeEnd: null,
    status: 'inactive',
    itemCount: 0,
    createdAt: '2026-03-15T10:00:00Z',
  },
];
```

- [ ] **Step 3: Move menu-items data**

Create `libs/shared/mock-data/src/lib/menu-items.ts` — copy the FULL content of `apps/management-app/src/features/menu/data/menu-items.ts` (264 lines, 20 items) but change the import line from `import type { MenuItem } from './schema'` to `import type { MenuItem } from '@einvoice/types'`.

The agent implementing this task should: read the full file at `apps/management-app/src/features/menu/data/menu-items.ts`, copy its content, and only change the import line.

- [ ] **Step 4: Move areas data**

Create `libs/shared/mock-data/src/lib/areas.ts`:

```typescript
import type { Area } from '@einvoice/types';

export const areas: Area[] = [
  { id: 'area-001', name: 'Tầng trệt', sortOrder: 1, tableCount: 6 },
  { id: 'area-002', name: 'Lầu 1', sortOrder: 2, tableCount: 5 },
  { id: 'area-003', name: 'Sân vườn', sortOrder: 3, tableCount: 4 },
  { id: 'area-004', name: 'Phòng VIP', sortOrder: 4, tableCount: 2 },
];
```

- [ ] **Step 5: Move tables data**

Create `libs/shared/mock-data/src/lib/tables.ts` — copy the FULL content of `apps/management-app/src/features/tables/data/tables.ts` (181 lines, 17 tables) but change the import from `import type { RestaurantTable } from './schema'` to `import type { RestaurantTable } from '@einvoice/types'`.

The agent implementing this task should: read the full file at `apps/management-app/src/features/tables/data/tables.ts`, copy its content, and only change the import line.

- [ ] **Step 6: Create mock orders data**

Create `libs/shared/mock-data/src/lib/orders.ts`:

```typescript
import type { Order } from '@einvoice/types';

export const orders: Order[] = [
  {
    id: 'order-001',
    tableId: 'tbl-001',
    tableName: 'T1',
    sessionId: 'session-001',
    items: [
      { id: 'oi-001', menuItemId: 'item-001', menuItemName: 'Gỏi cuốn tôm thịt', quantity: 2, unitPrice: 45000, note: null, status: 'preparing' },
      { id: 'oi-002', menuItemId: 'item-005', menuItemName: 'Cơm tấm sườn bì', quantity: 1, unitPrice: 75000, note: 'Thêm trứng ốp la', status: 'preparing' },
      { id: 'oi-003', menuItemId: 'item-011', menuItemName: 'Trà đá', quantity: 3, unitPrice: 10000, note: null, status: 'served' },
    ],
    totalAmount: 195000,
    status: 'preparing',
    paymentMethod: null,
    paymentStatus: 'unpaid',
    createdAt: '2026-04-06T10:30:00Z',
    updatedAt: '2026-04-06T10:35:00Z',
  },
  {
    id: 'order-002',
    tableId: 'tbl-001',
    tableName: 'T1',
    sessionId: 'session-001',
    items: [
      { id: 'oi-004', menuItemId: 'item-015', menuItemName: 'Chè ba màu', quantity: 2, unitPrice: 30000, note: null, status: 'served' },
    ],
    totalAmount: 60000,
    status: 'served',
    paymentMethod: null,
    paymentStatus: 'unpaid',
    createdAt: '2026-04-06T10:45:00Z',
    updatedAt: '2026-04-06T11:00:00Z',
  },
  {
    id: 'order-003',
    tableId: 'tbl-005',
    tableName: 'T5',
    sessionId: 'session-002',
    items: [
      { id: 'oi-005', menuItemId: 'item-007', menuItemName: 'Phở bò tái', quantity: 2, unitPrice: 85000, note: 'Không hành', status: 'confirmed' },
      { id: 'oi-006', menuItemId: 'item-012', menuItemName: 'Cà phê sữa đá', quantity: 2, unitPrice: 29000, note: null, status: 'ready' },
    ],
    totalAmount: 228000,
    status: 'confirmed',
    paymentMethod: null,
    paymentStatus: 'unpaid',
    createdAt: '2026-04-06T11:15:00Z',
    updatedAt: '2026-04-06T11:20:00Z',
  },
  {
    id: 'order-004',
    tableId: 'tbl-008',
    tableName: 'L3',
    sessionId: 'session-003',
    items: [
      { id: 'oi-007', menuItemId: 'item-003', menuItemName: 'Súp hải sản', quantity: 1, unitPrice: 65000, note: null, status: 'served' },
      { id: 'oi-008', menuItemId: 'item-006', menuItemName: 'Bún bò Huế', quantity: 3, unitPrice: 80000, note: null, status: 'served' },
    ],
    totalAmount: 305000,
    status: 'served',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    createdAt: '2026-04-06T09:00:00Z',
    updatedAt: '2026-04-06T09:45:00Z',
  },
];
```

- [ ] **Step 7: Create mock sessions data**

Create `libs/shared/mock-data/src/lib/sessions.ts`:

```typescript
export type MockSession = {
  sessionId: string;
  tableId: string;
  tableName: string;
  areaName: string;
  capacity: number;
  restaurantName: string;
  qrToken: string;
};

export const sessions: MockSession[] = [
  {
    sessionId: 'session-001',
    tableId: 'tbl-001',
    tableName: 'T1',
    areaName: 'Tầng trệt',
    capacity: 4,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_t1_abc123',
  },
  {
    sessionId: 'session-002',
    tableId: 'tbl-005',
    tableName: 'T5',
    areaName: 'Tầng trệt',
    capacity: 6,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_t5_def456',
  },
  {
    sessionId: 'session-003',
    tableId: 'tbl-008',
    tableName: 'L3',
    areaName: 'Lầu 1',
    capacity: 4,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_l3_ghi789',
  },
];
```

- [ ] **Step 8: Create helper functions**

Create `libs/shared/mock-data/src/lib/helpers.ts`:

```typescript
import type { Category, MenuItem, Order } from '@einvoice/types';
import { categories } from './categories';
import { menuItems } from './menu-items';
import { tables } from './tables';
import { orders } from './orders';
import { sessions, type MockSession } from './sessions';

export type CategoryWithItems = Category & { items: MenuItem[] };

export function getMenuByCategory(): CategoryWithItems[] {
  return categories
    .filter((c) => c.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      ...category,
      items: menuItems
        .filter((item) => item.categoryId === category.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

export function getAllMenuItems(): MenuItem[] {
  return menuItems
    .filter((item) => item.status === 'available' || item.status === 'out_of_stock')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getTableByQrToken(token: string) {
  return tables.find((t) => t.qrToken === token);
}

export function getSessionByQrToken(token: string): MockSession | undefined {
  return sessions.find((s) => s.qrToken === token);
}

export function getOrdersBySession(sessionId: string): Order[] {
  return orders.filter((o) => o.sessionId === sessionId);
}

export function getMockSession(tableId: string): MockSession | undefined {
  return sessions.find((s) => s.tableId === tableId);
}
```

- [ ] **Step 9: Create barrel index**

Create `libs/shared/mock-data/src/index.ts`:

```typescript
// Raw data
export { categories } from './lib/categories';
export { menuItems } from './lib/menu-items';
export { areas } from './lib/areas';
export { tables } from './lib/tables';
export { orders } from './lib/orders';
export { sessions, type MockSession } from './lib/sessions';

// Helper functions
export {
  getMenuByCategory,
  getAllMenuItems,
  getTableByQrToken,
  getSessionByQrToken,
  getOrdersBySession,
  getMockSession,
  type CategoryWithItems,
} from './lib/helpers';
```

- [ ] **Step 10: Add tsconfig path aliases**

Add to `tsconfig.base.json` paths:
```
"@einvoice/mock-data": ["libs/shared/mock-data/src/index.ts"]
```

Add to `apps/customer-pwa/tsconfig.json` paths:
```
"@einvoice/mock-data": ["../../libs/shared/mock-data/src/index.ts"]
```

Check if `apps/management-app/tsconfig.json` has a paths section and add the same alias if so (with relative path `../../libs/shared/mock-data/src/index.ts`).

- [ ] **Step 11: Update management-app imports**

In `apps/management-app/src/features/menu/index.tsx`, find and replace:
- `import { categories } from './data/categories'` → `import { categories } from '@einvoice/mock-data'`
- `import { menuItems } from './data/menu-items'` → `import { menuItems } from '@einvoice/mock-data'`

In `apps/management-app/src/features/tables/index.tsx`, find and replace:
- `import { areas } from './data/areas'` → `import { areas } from '@einvoice/mock-data'`
- `import { tables } from './data/tables'` → `import { tables } from '@einvoice/mock-data'`

**NOTE:** Do NOT delete the old data files yet — other management-app components may still import schema types from `../data/schema`. The schema files stay. Only the raw data imports in index.tsx files change.

- [ ] **Step 12: Install and verify**

```bash
pnpm install
npx nx lint management-app --fix
npx nx lint customer-pwa --fix
```

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(mock-data): create shared mock-data library with helpers

- Move categories, menu-items, areas, tables from management-app
- Add mock orders (4 orders with various statuses)
- Add mock sessions (3 sessions with QR tokens)
- Add helper functions: getMenuByCategory, getTableByQrToken, etc.
- Update management-app to import data from @einvoice/mock-data
- Add @einvoice/mock-data path aliases to tsconfig"
```

---

## Task 2: Add Drawer component to shared UI library

**Files:**
- Create: `libs/frontend/ui/src/components/ui/drawer.tsx`
- Modify: `libs/frontend/ui/src/index.ts` — add drawer export
- Modify: `libs/frontend/ui/package.json` — add vaul dependency

### Steps

- [ ] **Step 1: Install vaul dependency**

```bash
cd libs/frontend/ui && pnpm add vaul
```

If pnpm add doesn't work in the lib context, add `"vaul": "^1.1.0"` to `libs/frontend/ui/package.json` dependencies and run `pnpm install` from root.

- [ ] **Step 2: Create drawer component**

Try running shadcn add first:
```bash
cd apps/customer-pwa && npx shadcn add drawer --yes
```

Then move the generated file to the shared lib:
- Copy `apps/customer-pwa/src/components/ui/drawer.tsx` to `libs/frontend/ui/src/components/ui/drawer.tsx`
- Fix the `cn` import: change `from "@/lib/utils"` to `from "../../lib/utils"`
- Delete the local copy: `rm apps/customer-pwa/src/components/ui/drawer.tsx`

If shadcn add doesn't generate the file properly, create `libs/frontend/ui/src/components/ui/drawer.tsx` manually by using the shadcn drawer component source code with the correct relative cn import.

- [ ] **Step 3: Export from barrel**

Add to `libs/frontend/ui/src/index.ts` in the Primitives section:
```typescript
export * from './components/ui/drawer';
```

- [ ] **Step 4: Verify**

```bash
npx nx lint frontend-ui --fix
npx nx lint customer-pwa --fix
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(frontend-ui): add Drawer component from shadcn/vaul"
```

---

## Task 3: Build Landing Page

**Files:**
- Create: `apps/customer-pwa/src/features/landing/components/qr-landing-card.tsx`
- Modify: `apps/customer-pwa/src/pages/landing-page.tsx` — rewrite

### Context

Landing page flow: parse URL params `?table={id}&token={hmac}` → mock verify session → show table info → navigate to menu.

Existing infrastructure:
- `useSession()` from `@/features/session/context/session-provider` — `startSession(info: SessionInfo)` where `SessionInfo = { sessionId, tableId, tableName, restaurantName }`
- `getSessionByQrToken(token)` from `@einvoice/mock-data` — returns `MockSession | undefined` with `{ sessionId, tableId, tableName, areaName, capacity, restaurantName, qrToken }`
- `ROUTES.MENU` from `@/constants/routes`
- `useNavigate`, `useSearchParams` from `react-router-dom`
- `Button`, `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Skeleton` from `@einvoice/frontend-ui`

### Steps

- [ ] **Step 1: Create QrLandingCard component**

Create `apps/customer-pwa/src/features/landing/components/qr-landing-card.tsx`:

This component should:
1. Use `useSearchParams()` to get `table` and `token` params
2. If no params: show instruction card "Quét mã QR tại bàn để bắt đầu" with QrCode icon
3. If params present: call `getSessionByQrToken(token)` to mock-verify
4. Show a loading state for 1.5s (simulated delay with `useEffect` + `setTimeout`)
5. If token valid: show table info card (restaurant name, table name, area, capacity) with "Vào Menu" button
6. If token invalid: show error card "Mã QR không hợp lệ"
7. On "Vào Menu" click: call `startSession()` then `navigate(ROUTES.MENU)`

Component states: `'idle' | 'scanning' | 'confirmed' | 'error'`

Use Card, Button from `@einvoice/frontend-ui`. Use QrCode, CheckCircle2, XCircle, MapPin, Users icons from `lucide-react`.

Style: centered vertically, max-w-sm, card with subtle border, primary button.

- [ ] **Step 2: Rewrite landing-page.tsx**

Replace `apps/customer-pwa/src/pages/landing-page.tsx`:

```typescript
import { QrLandingCard } from '@/features/landing/components/qr-landing-card';

export function LandingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <QrLandingCard />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npx nx lint customer-pwa --fix
```

Test in browser: navigate to `http://localhost:5173/landing?table=tbl-001&token=hmac_t1_abc123` — should show table info after 1.5s loading.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(customer-pwa): build Landing Page with QR session flow"
```

---

## Task 4: Build Menu Page — Core Components

**Files:**
- Create: `apps/customer-pwa/src/features/menu/components/category-tabs.tsx`
- Create: `apps/customer-pwa/src/features/menu/components/menu-item-card.tsx`
- Create: `apps/customer-pwa/src/features/menu/components/menu-items-grid.tsx`

### Context

Menu page shows category tabs at top, grid of menu items below.

Data: `getMenuByCategory()` from `@einvoice/mock-data` returns `CategoryWithItems[]` — array of categories each with `items: MenuItem[]`.

Types: `MenuItem` from `@einvoice/types` has `{ id, categoryId, categoryName, name, description: string|null, price, imageUrl: string|null, stock, sortOrder, status: 'available'|'out_of_stock', createdAt }`.

Utilities: `formatCurrency` from `@einvoice/frontend-utils` formats price as "45.000 ₫".

UI components from `@einvoice/frontend-ui`: Badge, Button, Card, CardContent, Skeleton, ScrollArea.

### Steps

- [ ] **Step 1: Create CategoryTabs component**

Create `apps/customer-pwa/src/features/menu/components/category-tabs.tsx`:

Props: `{ categories: Category[], activeId: string | null, onSelect: (id: string | null) => void }`

Renders a horizontal scrollable row of tab buttons. First tab is "Tất cả" (id=null). Each tab shows category name. Active tab has primary background. Use `overflow-x-auto` with `scrollbar-hide` pattern. Use Button variant="ghost" or variant="outline" for inactive, variant="default" for active.

- [ ] **Step 2: Create MenuItemCard component**

Create `apps/customer-pwa/src/features/menu/components/menu-item-card.tsx`:

Props: `{ item: MenuItem, onTap: () => void, onQuickAdd: () => void }`

Renders a card with:
- 1:1 aspect ratio image area (gradient placeholder if imageUrl is null, e.g. `bg-gradient-to-br from-muted to-muted-foreground/20`)
- "Hết hàng" Badge overlay if stock === 0
- Name (font-medium, line-clamp-1)
- Description (text-muted-foreground, text-xs, line-clamp-2)
- Price row: formatCurrency(price) + small "+" Button for quick add
- Tap card body → onTap(), tap "+" button → onQuickAdd() (stopPropagation)
- Disabled state if out_of_stock

- [ ] **Step 3: Create MenuItemsGrid component**

Create `apps/customer-pwa/src/features/menu/components/menu-items-grid.tsx`:

Props: `{ items: MenuItem[], onItemTap: (item: MenuItem) => void, onQuickAdd: (item: MenuItem) => void }`

Renders a 2-column grid (`grid grid-cols-2 gap-3`) of MenuItemCard components. Empty state if no items: "Không có món ăn" message.

- [ ] **Step 4: Verify**

```bash
npx nx lint customer-pwa --fix
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(customer-pwa): build menu core components (tabs, card, grid)"
```

---

## Task 5: Build Menu Page — Drawers & Cart, compose page

**Files:**
- Create: `apps/customer-pwa/src/features/menu/components/menu-item-detail-drawer.tsx`
- Create: `apps/customer-pwa/src/features/menu/components/cart-floating-button.tsx`
- Create: `apps/customer-pwa/src/features/menu/components/cart-drawer.tsx`
- Modify: `apps/customer-pwa/src/pages/menu-page.tsx` — rewrite

### Context

Drawer from `@einvoice/frontend-ui`: `Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger`.

Cart: `useCart()` from `@/features/cart/context/cart-provider` provides `{ items, totalAmount, totalItems, addItem, removeItem, updateQuantity, updateNote, clear }`.

Navigation: `useNavigate` from `react-router-dom`, `ROUTES.ORDER_TRACKING` from `@/constants/routes`.

### Steps

- [ ] **Step 1: Create MenuItemDetailDrawer**

Create `apps/customer-pwa/src/features/menu/components/menu-item-detail-drawer.tsx`:

Props: `{ item: MenuItem | null, open: boolean, onOpenChange: (open: boolean) => void }`

Content:
- Large image area (16:9 aspect, gradient placeholder)
- Item name (text-lg font-semibold)
- Full description
- Price (text-xl font-bold, formatCurrency)
- Quantity picker: "−" [count] "+" (local useState, min 1, max 99)
- Note textarea (optional, placeholder "Ghi chú cho món này...")
- "Thêm vào giỏ — {formatCurrency(price * qty)}" button
- On add: call `addItem(item, quantity, note)` from useCart(), close drawer, reset state

- [ ] **Step 2: Create CartFloatingButton**

Create `apps/customer-pwa/src/features/menu/components/cart-floating-button.tsx`:

Props: `{ onClick: () => void }`

Fixed position button (bottom-right, above safe area): `fixed bottom-6 right-4 z-30`. Shows cart icon (ShoppingCart from lucide-react) + badge with totalItems count + formatCurrency(totalAmount). Only visible if totalItems > 0. Use Button with rounded-full, shadow-lg, size="lg".

- [ ] **Step 3: Create CartDrawer**

Create `apps/customer-pwa/src/features/menu/components/cart-drawer.tsx`:

Props: `{ open: boolean, onOpenChange: (open: boolean) => void }`

Content:
- Header: "Giỏ hàng" + item count
- List of cart items: each shows name, qty controls (−/+), unit price, line total (qty × price), trash icon to remove
- Separator
- Footer: Total line (totalAmount), "Đặt món" button
- On "Đặt món": close drawer → clear() cart → navigate to ROUTES.ORDER_TRACKING
- Empty state: "Giỏ hàng trống" with shopping bag icon

Uses Drawer components from `@einvoice/frontend-ui`, Button, Separator, Badge.

- [ ] **Step 4: Rewrite menu-page.tsx**

Replace `apps/customer-pwa/src/pages/menu-page.tsx`:

```typescript
import { useState } from 'react';
import type { MenuItem } from '@einvoice/types';
import { getMenuByCategory } from '@einvoice/mock-data';
import { useCart } from '@/features/cart/context/cart-provider';
import { CategoryTabs } from '@/features/menu/components/category-tabs';
import { MenuItemsGrid } from '@/features/menu/components/menu-items-grid';
import { MenuItemDetailDrawer } from '@/features/menu/components/menu-item-detail-drawer';
import { CartFloatingButton } from '@/features/menu/components/cart-floating-button';
import { CartDrawer } from '@/features/menu/components/cart-drawer';

const menuData = getMenuByCategory();

export function MenuPage() {
  const { addItem, totalItems } = useCart();
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const categories = menuData.map(({ items, ...cat }) => cat);
  const filteredItems = activeCategoryId
    ? menuData.find((c) => c.id === activeCategoryId)?.items ?? []
    : menuData.flatMap((c) => c.items);

  const handleItemTap = (item: MenuItem) => {
    setSelectedItem(item);
    setDetailOpen(true);
  };

  const handleQuickAdd = (item: MenuItem) => {
    if (item.status !== 'out_of_stock') {
      addItem(item);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <CategoryTabs
        categories={categories}
        activeId={activeCategoryId}
        onSelect={setActiveCategoryId}
      />
      <MenuItemsGrid
        items={filteredItems}
        onItemTap={handleItemTap}
        onQuickAdd={handleQuickAdd}
      />
      <MenuItemDetailDrawer
        item={selectedItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
      {totalItems > 0 && (
        <CartFloatingButton onClick={() => setCartOpen(true)} />
      )}
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
```

- [ ] **Step 5: Verify**

```bash
npx nx lint customer-pwa --fix
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(customer-pwa): build Menu Page with drawers and cart integration"
```

---

## Task 6: Build Order Tracking Page

**Files:**
- Create: `apps/customer-pwa/src/features/order/components/order-status-timeline.tsx`
- Create: `apps/customer-pwa/src/features/order/components/order-items-list.tsx`
- Create: `apps/customer-pwa/src/features/order/components/order-summary-card.tsx`
- Modify: `apps/customer-pwa/src/pages/order-tracking-page.tsx` — rewrite

### Context

Data: `getOrdersBySession(sessionId)` from `@einvoice/mock-data`. Use session-001 as default mock session.

Types: `Order` from `@einvoice/types` — `{ id, tableId, tableName, sessionId, items: OrderItem[], totalAmount, status: OrderStatus, paymentMethod, paymentStatus, createdAt, updatedAt }`. `OrderItem` — `{ id, menuItemId, menuItemName, quantity, unitPrice, note, status }`. `OrderStatus` = `'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled'`.

Status constants: `ORDER_STATUSES` from `@einvoice/shared-constants`.

Navigation: `useNavigate` from `react-router-dom`, `ROUTES.REQUEST_PAYMENT` from `@/constants/routes`.

Session: `useSession()` from `@/features/session/context/session-provider`.

### Steps

- [ ] **Step 1: Create OrderStatusTimeline**

Create `apps/customer-pwa/src/features/order/components/order-status-timeline.tsx`:

Props: `{ status: OrderStatus, createdAt: string, updatedAt: string }`

Renders a vertical timeline with steps: pending → confirmed → preparing → ready → served. Each step has an icon, Vietnamese label, and visual state (done/active/pending). `cancelled` shown separately if applicable. Use colored circles (green for done, primary ring for active, muted for pending) connected by vertical lines.

Timeline step labels: Chờ xác nhận, Đã xác nhận, Đang chế biến, Sẵn sàng phục vụ, Đã phục vụ.

Icons from lucide-react: Clock, CheckCircle2, ChefHat, UtensilsCrossed, CircleCheck.

- [ ] **Step 2: Create OrderItemsList**

Create `apps/customer-pwa/src/features/order/components/order-items-list.tsx`:

Props: `{ items: OrderItem[] }`

Simple list of order items. Each row: item name, quantity × unit price, line total. Use Separator between items. Use formatCurrency for prices.

- [ ] **Step 3: Create OrderSummaryCard**

Create `apps/customer-pwa/src/features/order/components/order-summary-card.tsx`:

Props: `{ order: Order }`

Card showing: order ID (truncated), status badge, items count, total amount, timestamps (createdAt formatted). Use Card from `@einvoice/frontend-ui`, Badge for status.

Badge variants by status: pending=outline, confirmed=secondary, preparing=default, ready=default (green-ish), served=secondary, cancelled=destructive.

- [ ] **Step 4: Rewrite order-tracking-page.tsx**

Replace `apps/customer-pwa/src/pages/order-tracking-page.tsx`:

Get orders from mock data using the session from `useSession()`. If no session, show "Chưa có phiên" message with link back to landing. Otherwise show list of orders, each with timeline + items + summary. Add "Yêu cầu thanh toán" button at bottom → navigate to ROUTES.REQUEST_PAYMENT.

If session is active but no orders found, use `session-001` as fallback sessionId for demo purposes.

- [ ] **Step 5: Verify**

```bash
npx nx lint customer-pwa --fix
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(customer-pwa): build Order Tracking Page with status timeline"
```

---

## Task 7: Build Request Payment Page

**Files:**
- Create: `apps/customer-pwa/src/features/payment/components/payment-summary-card.tsx`
- Create: `apps/customer-pwa/src/features/payment/components/payment-method-selector.tsx`
- Create: `apps/customer-pwa/src/features/payment/components/payment-confirm-button.tsx`
- Create: `apps/customer-pwa/src/features/payment/components/payment-success-card.tsx`
- Modify: `apps/customer-pwa/src/pages/request-payment-page.tsx` — rewrite

### Context

Payment methods: `PAYMENT_METHODS` from `@einvoice/shared-constants` — `['cash', 'card', 'momo', 'zalopay', 'bank_transfer']`.

Types: `PaymentMethod` from `@einvoice/types`.

Orders data: `getOrdersBySession(sessionId)` from `@einvoice/mock-data` — sum totalAmount across unpaid orders.

Navigation: `useNavigate` from `react-router-dom`, `ROUTES.MENU` from `@/constants/routes`.

### Steps

- [ ] **Step 1: Create PaymentSummaryCard**

Create `apps/customer-pwa/src/features/payment/components/payment-summary-card.tsx`:

Props: `{ orders: Order[] }`

Shows: number of orders, total items across all orders, subtotal, total amount. Use Card, formatCurrency.

- [ ] **Step 2: Create PaymentMethodSelector**

Create `apps/customer-pwa/src/features/payment/components/payment-method-selector.tsx`:

Props: `{ value: PaymentMethod, onChange: (method: PaymentMethod) => void }`

Radio-like selector with 5 payment methods. Each option is a tappable card/button showing:
- Icon (Banknote for cash, CreditCard for card, Smartphone for momo/zalopay, Building2 for bank_transfer)
- Vietnamese label (Tiền mặt, Thẻ ngân hàng, MoMo, ZaloPay, Chuyển khoản)
- Selected state with primary ring/border

Use `PAYMENT_METHODS` from `@einvoice/shared-constants`.

- [ ] **Step 3: Create PaymentConfirmButton**

Create `apps/customer-pwa/src/features/payment/components/payment-confirm-button.tsx`:

Props: `{ totalAmount: number, disabled?: boolean, onConfirm: () => void }`

Full-width button: "Yêu cầu thanh toán — {formatCurrency(totalAmount)}". Shows loading spinner during 1s simulated delay. Calls onConfirm after delay.

- [ ] **Step 4: Create PaymentSuccessCard**

Create `apps/customer-pwa/src/features/payment/components/payment-success-card.tsx`:

Props: `{ totalAmount: number, paymentMethod: string, onBackToMenu: () => void }`

Success screen: large check icon (animated with CSS), "Yêu cầu thanh toán đã được gửi!", "Nhân viên sẽ đến trong giây lát", total amount, payment method, "Quay về Menu" button.

Use Card, Button from `@einvoice/frontend-ui`. CircleCheck from lucide-react with green color.

- [ ] **Step 5: Rewrite request-payment-page.tsx**

Replace `apps/customer-pwa/src/pages/request-payment-page.tsx`:

State: `paymentMethod` (default 'cash'), `isSuccess` (boolean), `isSubmitting` (boolean).

Get orders from mock data. If no session, show redirect message. Otherwise:
- If !isSuccess: show PaymentSummaryCard, PaymentMethodSelector, PaymentConfirmButton
- If isSuccess: show PaymentSuccessCard with "Quay về Menu" → navigate to ROUTES.MENU

- [ ] **Step 6: Verify**

```bash
npx nx lint customer-pwa --fix
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(customer-pwa): build Request Payment Page with method selection"
```

---

## Task 8: Final verification & cleanup

**Files:**
- No new files

### Steps

- [ ] **Step 1: Lint all 3 frontend projects**

```bash
npx nx run-many -t lint -p frontend-ui,management-app,customer-pwa --fix
```

All must pass (management-app may have pre-existing TanStack Table warnings — that's OK).

- [ ] **Step 2: Check for stale imports**

```bash
grep -r "from '@einvoice/frontend-ui'" apps/customer-pwa/src/ | head -20
grep -r "from '@einvoice/mock-data'" apps/customer-pwa/src/ | head -20
grep -r "FeaturePlaceholder" apps/customer-pwa/src/
```

Verify: No remaining FeaturePlaceholder imports in page files (they should all be rewritten).

- [ ] **Step 3: Verify mock-data imports in management-app**

```bash
grep -r "from './data/categories'" apps/management-app/src/features/menu/index.tsx
grep -r "from './data/menu-items'" apps/management-app/src/features/menu/index.tsx
grep -r "from './data/areas'" apps/management-app/src/features/tables/index.tsx
grep -r "from './data/tables'" apps/management-app/src/features/tables/index.tsx
```

These should all return empty (imports should now come from `@einvoice/mock-data`).

- [ ] **Step 4: Visual browser check**

Start customer-pwa dev server:
```bash
npx nx serve customer-pwa
```

Test at http://localhost:5173:
1. Landing: `/landing?table=tbl-001&token=hmac_t1_abc123` → shows table info → "Vào Menu"
2. Menu: category tabs filter, item cards show, tap card opens detail drawer, add to cart works, cart FAB shows
3. Order Tracking: shows mock orders with timeline
4. Payment: select method, confirm, see success card

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "chore(customer-pwa): final cleanup for mock UI pages"
```
