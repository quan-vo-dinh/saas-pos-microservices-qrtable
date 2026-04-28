# UI/UX Blueprint — Step 2.2 Mock UI: Cart, POS, KDS

> **Status:** ✅ Implemented (đồng bộ phase doc 2026-04-26) · **Owner:** PM/UI-UX Architect · **Blueprint dated:** 2026-04-24
> **Phase ref:** `[docs/phases/phase-2a-order-kafka.md](phases/phase-2a-order-kafka.md)` §Step 2.2
> **Business ref:** `[docs/business-logic.md](business-logic.md)` §3 (Table state), §4 (Customer ordering), §5 (KDS), §6 (Payment), §8 (Order lifecycle), §III (Service requests)
> **Shared types ref:** `libs/shared/types/src/lib/{order,bill,session,service-request,realtime-events}.types.ts` (Step 2.3 ✅ Done)

> **RBAC / navigation ref:** Trong Phase 2.x, `management-app` dùng **role → route + sidebar** (thô, UX); BFF vẫn là **permission từng API**. Không dùng matrix §6 để ẩn từng nút cho đến khi có work item riêng — xem [`docs/architecture/permission-matrix.md`](architecture/permission-matrix.md) §9.

Tài liệu này là blueprint kim chỉ nam cho việc viết code thực thi (Step 2 trong workflow 2-bước). Mọi quyết định component, layout, density và copywriting bám sát Nx monorepo (`apps/customer-pwa` Vite-React, `apps/management-app` Next.js App Router), shadcn/ui đã setup, và shared types đã khoá ở Step 2.3. **Tên app:** blueprint có thể nhắc `client-app`; trong repo thực tế là **`customer-pwa`** (PWA khách) + **`management-app`** (staff/owner/admin).

---

## 0. Decisions đã chốt (ADR cho Step 2.2)

| #   | Quyết định                                                                                                                                                           | Lý do                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Tách 3 personality** cho 3 surface (PWA editorial-warm / POS dashboard-dense / KDS industrial-contrast), share design tokens (radius, motion curve, spacing scale) | Mỗi surface dùng trong ngữ cảnh khác nhau (mobile khách / desktop quầy / màn hình bếp 24"+). Đồng nhất visual = giảm UX.                                                  |
| D2  | **POS full scope** — mock đủ Live Orders + Table Map + Bill/Cash drawer + Service Request inbox                                                                      | Tránh rework Step 2.5; Step 2.4 BE: bill đến `PENDING_PAYMENT` + explicit bill-request; **xác nhận tiền mặt → Phase 3**; acknowledge/resolve service request theo matrix. |
| D3  | \*\*KDSTicket mock thêm field `station: 'KITCHEN'                                                                                                                    | 'BAR'`** + log tech-debt bổ sung` MenuItem.station` ở Catalog Service trong Step 2.4                                                                                      |
| D4  | **4 density layers**: mini charts (POS), presence + activity feed (PWA Cart), ticket detail sheet (KDS), global ⌘K palette (POS)                                     | Thoả "information density dày đặc, đa dạng component" + tận dụng shared types có sẵn.                                                                                     |
| D5  | **Mock data sống trong `apps/<app>/src/mocks/`** — Zustand store + faker seeded; fake WebSocket bằng `setInterval` trong custom hook `useFakeRealtime()`             | Tách rõ ranh giới mock/real, dễ swap sang TanStack Query + WebSocket thật ở Step 2.5.                                                                                     |
| D6  | **RBAC UI tạm theo role (tab / route)** — đồng bộ với `role-routing` + sidebar; enforcement chi tiết ở BFF theo §9 matrix                                            | Tránh block Step 2.2 mock; tinh chỉnh permission-per-control sau.                                                                                                         |

> **Tech-debt log (xử lý ở Step 2.4):**
>
> - Bổ sung `MenuItem.station: 'KITCHEN' \| 'BAR'` (Catalog Service) — KDS routing.
> - Bổ sung `Order.priority: number` (0 = normal, 1 = priority) — business-logic §5B "Ưu tiên Món".
> - Bổ sung `OrderItem.servedAt?: Date` để KDS đo SLA "ready → served gap".

---

## 1. Design Tokens (shared 3 surface)

```css
/* libs/shared/ui-tokens/src/tokens.css — sẽ tạo ở Step 2.5 */
:root {
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --motion-spring: cubic-bezier(0.32, 0.72, 0, 1);
  --motion-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --space-unit: 4px; /* 4-8-12-16-24-32-48-64 */
  --shadow-card: 0 1px 0 rgba(0, 0, 0, 0.04), 0 8px 24px -12px rgba(0, 0, 0, 0.12);
}
```

| Token        | PWA (Customer)                                               | POS (Staff)                                          | KDS (Kitchen/Bar)                                                                     |
| ------------ | ------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Theme        | Light, warm cream `#FBF7F0` bg, espresso `#1E1611` ink       | Dark slate `#0B0E14` bg, near-white `#E8ECF4` ink    | Near-black `#000` bg, lime `#C6F600` accent (high-contrast OLED-friendly)             |
| Display font | **Fraunces** (serif, optical 9–144) — F&B editorial cảm giác | **Geist Sans** + **Geist Mono** (số liệu)            | **Space Grotesk** _(Avoid theo skill — thay)_ → **JetBrains Mono** + **General Sans** |
| Body font    | **Inter Tight** (đã có trong Vite app)                       | **Geist Sans**                                       | **General Sans** (medium 500 mặc định để xa đọc)                                      |
| Accent       | Saffron `#E89B2F` + Olive `#5B6E3A`                          | Cyan `#06B6D4` + Magenta `#F43F8E`                   | Lime `#C6F600` (ready) + Hot pink `#FF2D87` (recall) + Amber `#FFB300` (SLA warn)     |
| Density      | Cosy (mobile-first, 16px base, 48dp tap target)              | Dense (14px base, 32dp row height, hover affordance) | High (18px base — đọc cách 1.5m, no hover, touch + click)                             |
| Motion       | Spring 320ms (Add to cart, page transition)                  | Ease 180ms (subtle row hover, sheet slide)           | Snap 120ms (status change), pulse 2s loop (SLA over)                                  |

---

## 2. Customer PWA — Cart & Ordering

### 2.1 Layout (Mobile-first, 360–430px)

```
┌─────────────────────────────────────────┐
│  [≡] Bàn 12 · Tầng trệt   [⏱ 24m]  [👥3]│  ← Sticky top: TableBadge + SessionTimer + PresenceCount
├─────────────────────────────────────────┤
│  Hero: tên quán + tagline + scroll-snap │
│  category chips (Khai vị · Chính ...)   │
├─────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐     │
│  │ MenuItemCard │ │ MenuItemCard │     │  ← Grid 2 cột; large thumb 1:1
│  │ ảnh · tên    │ │ ảnh · tên    │     │     badge "Hết món" overlay khi out of stock
│  │ giá · [+]    │ │ giá · [+]    │     │     hover/focus → reveal "Xem chi tiết"
│  └──────────────┘ └──────────────┘     │
│   ...                                   │
├─────────────────────────────────────────┤
│  [Floating CartPill] 3 món · 184.000đ ▲│  ← FAB bottom; tap → mở Sheet (Cart drawer)
└─────────────────────────────────────────┘
```

> **Wireframe vs code:** Ký tự trong khung ASCII (`≡`, `⏱`, `👥`, …) chỉ mô tả **vị trí**. Trong implementation dùng **icon component** theo §5.6 — không nhúng Unicode emoji làm affordance UI (nút, badge trạng thái, station header).

### 2.2 Component mapping

| Logic nghiệp vụ (BL ref)                             | Component shadcn / Radix                                                                                                           | Ghi chú implementation                                                                                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §4.A.1 Khởi tạo phiên (Table badge, timer, presence) | `Badge` + custom `SessionTimer` (countdown) + `AvatarGroup` placeholder                                                            | Presence: `Avatar` + chữ cái đầu / màu nền deterministic (mock "Khách 1"…); **không** dùng emoji làm avatar. Timer badge: icon `Timer` hoặc `Clock` từ `lucide-react` (§5.6). |
| §4.A.2 Lựa chọn món                                  | Custom `MenuItemCard` + `Dialog` (chi tiết món, image carousel `Carousel`)                                                         | Dialog có `Tabs`: Mô tả · Topping (disabled, tooltip "Phase sau") · Đánh giá mock                                                                                             |
| §4.A.3 Quản lý giỏ                                   | `Sheet` side="bottom" (Cart drawer) + `ScrollArea` cho list + `Stepper` custom cho qty                                             | Mỗi item có `Popover` "Ghi chú" (textarea + chip suggestions: "Không cay", "Ít muối", "Không hành")                                                                           |
| Shared cart presence (D4)                            | `HoverCard` trên avatar nhỏ trong Cart header                                                                                      | Hover → "Quan • thêm Phở bò × 1 lúc 14:32" — activity feed 5 dòng gần nhất                                                                                                    |
| §4.A.4 Submit                                        | `Button` "Đặt món" với inline `Spinner` → success animation (Motion `AnimatePresence` confetti chip)                               | Idempotency key = `crypto.randomUUID()` lưu vào Zustand, persist localStorage                                                                                                 |
| §4.A.6 Order tracking                                | `pages/order-tracking-page.tsx` — `Stepper` custom horizontal mobile (DRAFT → PENDING → PROCESSING → READY → SERVED)               | Mỗi step có timestamp + estimated next; status PROCESSING có pulsing dot                                                                                                      |
| §III Service request                                 | Bottom sheet `Drawer` (Vaul) trigger từ floating action: 3 button lớn `CALL_STAFF`, `REQUEST_BILL`, `GENERAL_HELP` + textarea note | Sau submit → toast `Sonner` "Đã gọi nhân viên · sẽ đến trong ~2 phút"                                                                                                         |
| §6.A Yêu cầu thanh toán (lock cart)                  | `Alert` variant="warning" sticky top khi `BillStatus === PENDING_PAYMENT`                                                          | Disable cart `+`, message "Bàn đang thanh toán — không thể đặt thêm"                                                                                                          |

### 2.3 Information density — bấm vào đâu hiển thị gì?

| Element                         | Tap/long-press | Hiển thị thêm                                                                                                                                      |
| ------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MenuItemCard`                  | Tap thumb      | Dialog chi tiết: ảnh full-bleed, mô tả 2-3 câu, calo mock, dị ứng tag (`Badge`: Gluten · Đậu phộng), 5 sao trung bình mock, "12 người đặt hôm nay" |
| Card price                      | Long-press     | Tooltip "Đã giảm 10k so với menu giấy" (mock promo flag)                                                                                           |
| Cart row                        | Tap            | Inline expand: ghi chú đã nhập, lịch sử thay đổi (ai sửa lúc nào)                                                                                  |
| Cart row swipe-left             | —              | Reveal `Trash` action                                                                                                                              |
| Avatar group                    | Tap            | `Sheet` "Khách cùng bàn" — danh sách 3 người, ai đang gõ ghi chú real-time                                                                         |
| Session timer                   | Tap            | `Popover` "Phiên bắt đầu 14:08 · tự đóng nếu không hoạt động 30 phút"                                                                              |
| Status pill trên Order Tracking | Tap            | `Sheet` "Hành trình đơn hàng" — timeline `Order.confirmedAt`, `OrderItem.status` riêng từng món, ai trong bếp đang xử lý (mock)                    |

### 2.4 Key states & micro-interactions

- **Empty state (chưa có món)**: illustration cốc cà phê line-art + CTA "Khám phá menu" cuộn smooth tới category đầu.
- **Out-of-stock real-time**: card xám hoá + ribbon `"Hết món"` + haptic vibration (50ms) khi server push `menu.item.stock_changed`.
- **Successful order submit**: 1.2s sequence — button morph thành check, confetti 12 mảnh saffron+olive, redirect tracking page với shared `layoutId` motion.
- **Conflict cart version (optimistic lock)**: `Toast` "Người cùng bàn vừa đổi giỏ — đã đồng bộ" + highlight diff 2s.

---

## 3. Staff POS — `apps/management-app/src/app/(pos)/`

### 3.1 Layout (Desktop ≥1280px, dense)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Sidebar(sidebar.tsx)│ Top bar: Search ⌘K · TenantSwitcher · Bell+Badge(3) · Avatar │
│ ┌───────────────┐  ├─────────────────────────────────────────────────────────┤
│ │ Live Orders ●│  │  Tabs: [Live Orders 7] [Tables] [Service Requests 2] [Bills] │
│ │ Tables       │  ├─────────────────────────────────────────────────────────┤
│ │ Service ▲2   │  │  ╔═══════════ Resizable Pane Group (vertical) ═════════╗ │
│ │ Bills        │  │  ║ Left 60%: DataTable (Live Orders / Tables grid)    ║ │
│ │ Reports      │  │  ╠══════════════════════════════════════════════════════╣ │
│ │ ─────────    │  │  ║ Right 40%: Detail panel (selected row)              ║ │
│ │ Today ▼      │  │  ║   - Order detail: items, notes, customer activity   ║ │
│ │  Revenue     │  │  ║   - Table detail: session timeline, transfer button │ │
│ │  Top 5       │  │  ║   - Service request: ack/resolve buttons            ║ │
│ │  Heatmap     │  │  ╚══════════════════════════════════════════════════════╝ │
│ │ Mini charts  │  │  Sticky bottom strip: KPI tiles (Pending · Avg ticket time) │
│ └───────────────┘  └─────────────────────────────────────────────────────────┘
```

### 3.2 Component mapping

| Tab / Region                  | Component                                                                                                                                                                                                        | Notes                                                                                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar                       | `Sidebar` (shadcn block) + `Collapsible` cho "Today"                                                                                                                                                             | Footer sidebar = mini Recharts (3 stacks)                                                                                                                                                                                                 |
| Top search                    | `Command` `Dialog` (⌘K)                                                                                                                                                                                          | Index: tables, orders by ID/last 4 digits, customers (mock), actions ("Confirm latest order", "Switch to KDS")                                                                                                                            |
| TenantSwitcher                | `Popover` + `Command` filter                                                                                                                                                                                     | Mock 3 tenant: "Phở Tầm Anh", "Highland Demo", "Bar Saigon"                                                                                                                                                                               |
| Notifications                 | `Popover` + `ScrollArea` + `Tabs` (All / Order / Service)                                                                                                                                                        | Mỗi item có `HoverCard` preview                                                                                                                                                                                                           |
| **Live Orders table**         | `DataTable` (TanStack Table v8) với columns: `OrderID short`, `TableBadge`, `Items count`, `Total`, `Status` (`Badge` color by enum), `Wait time` (live tick), `Customer notes` (`HoverCard` preview), `Actions` | Row click → mở right pane Sheet (in-place). Header có filter chips (`Toggle` group) cho status.                                                                                                                                           |
| **Order detail** (right pane) | `Tabs`: [Items] [Activity] [Customer]                                                                                                                                                                            | Items: `Table` từng row với checkbox per item (tích để serve riêng); Activity: `Timeline` (custom) gồm WS events `OrderCreatedEvent`, `OrderStatusChangedEvent`; Customer: avatar + session info + "12 đơn từ trước đến giờ" mock loyalty |
| Confirm/Cancel                | `Button` primary + `AlertDialog` cho cancel (require reason `Textarea`)                                                                                                                                          | Cancel → `Select` lý do mặc định: Hết hàng / Khách đổi ý / Lỗi nhập                                                                                                                                                                       |
| **Tables tab**                | `ToggleGroup` view: [Grid] [Map]. Grid = `Card` matrix; Map = SVG floor plan (mock, drag pan)                                                                                                                    | Mỗi card hiển thị: số bàn, status `Badge` (color-coded — green Available / amber Occupied / red Billing / blue Cleaning), người đang ngồi (avatar group), tổng tab hiện tại, idle time                                                    |
| Table card hover              | `HoverCard` 320px                                                                                                                                                                                                | Header: bàn + sức chứa; Body: mini timeline 5 events gần nhất + button quick "Chuyển bàn" mở `Dialog` chọn bàn đích                                                                                                                       |
| Transfer table                | `Dialog` + `Command` chọn bàn đích                                                                                                                                                                               | Validation inline: "Bàn 8 đang Cleaning" disabled                                                                                                                                                                                         |
| **Service Requests inbox**    | `DataTable` + `Tabs`: [PENDING] [ACKNOWLEDGED] [RESOLVED]                                                                                                                                                        | Row: icon `lucide-react` theo type — `CALL_STAFF` → `UserRound` hoặc `HandHelping`; `REQUEST_BILL` → `Receipt`; `GENERAL_HELP` → `CircleHelp`. Waiter: `Avatar`.                                                                          |
| Service request action        | `Button` "Acknowledge" → `Button` "Resolve" inline                                                                                                                                                               | Confirm bằng `Toast` undo 5s                                                                                                                                                                                                              |
| **Bills (cash)**              | Right pane khi chọn table có `BillStatus === PENDING_PAYMENT`                                                                                                                                                    | Form: Tổng tiền (read-only, monospace lớn), Tiền nhận (`Input` numeric với suggested chips 100k/200k/500k), Tiền thừa auto-calc, button "Đã thu — đóng phiên"                                                                             |
| Sticky KPI strip              | 4 tiles: Đơn chờ xác nhận / TB phục vụ / Đơn quá SLA / Bàn occupied %                                                                                                                                            | Tile click → filter table tương ứng                                                                                                                                                                                                       |
| Today panel (sidebar)         | 3 mini charts dùng `Recharts`                                                                                                                                                                                    | LineChart "Doanh thu 6h-22h" / BarChart "Top 5 món" / DonutChart "Trạng thái bàn" — tất cả mock seeded faker                                                                                                                              |

### 3.3 Information density — bấm vào đâu hiển thị gì?

| Element                | Action                   | Reveal                                                                                                                                       |
| ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| OrderID cell           | Tap                      | Right pane Order detail (3 tab)                                                                                                              |
| OrderID cell           | Long-press / right-click | `ContextMenu`: Copy ID · Print KOT · Mark priority · Force-cancel (Manager only — disabled với role badge tooltip)                           |
| Items count badge      | Hover                    | `HoverCard` list 5 món + `Badge` per item status (PROCESSING / READY)                                                                        |
| Customer notes icon    | Hover                    | Ô cột dùng `<StickyNote />` hoặc `<MessageSquareText />` + `aria-label` phù hợp; `HoverCard` full note: "Phở: không hành, Trà sữa: ít đường" |
| Wait time cell         | —                        | Bg-color gradient theo SLA: 0–8' xanh, 8–15' amber, >15' đỏ + pulse                                                                          |
| Table card             | Tap                      | Right pane Table detail: occupant timeline, total bill running, all current orders, transfer + close session                                 |
| Table card             | Long-press               | `ContextMenu`: Đánh dấu sạch · Khoá bàn · Gắn note "VIP"                                                                                     |
| Service request row    | Hover                    | `HoverCard`: full note khách viết + thời gian, "Đã ngồi 47 phút"                                                                             |
| KPI tile "Đơn quá SLA" | Tap                      | Filter table + scroll-to first overdue                                                                                                       |
| ⌘K palette             | Type "Bàn 12"            | Show 3 results: bàn 12 (jump), Order #84A1 (ở bàn 12), confirm latest order ở bàn 12                                                         |
| Notification bell      | Tap                      | `Popover` 480px với 3 tab; mỗi item có `Avatar` source + 1-line preview + "2 phút trước"                                                     |
| Avatar (top-right)     | Tap                      | `DropdownMenu` Profile · Switch role (mock) · Theme · Logout                                                                                 |

### 3.4 Realtime / animation

- New order arrives: row slides in from top (Motion `layout` prop), `Badge` "NEW" pulses 3s; **âm thanh** bell ngắn (Web Audio / mock) — UI trigger dùng `<Bell />` + `Badge`, không dùng emoji chuông trong copy cố định.
- Status change: row's `Status` badge morphs colour with `AnimatePresence`.
- Sheet detail: slide from right 280ms, content stagger reveal.
- Confirm action: button → check icon → row removes from PENDING filter (`AnimatePresence exit`).

---

## 4. KDS — Kitchen & Bar (`/kds/kitchen`, `/kds/bar`)

### 4.1 Layout (Large display 1920×1080+, no hover, touch + click)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Header: ChefHat+KITCHEN · clock · stats · Recall log · Settings (xem §5.6) │
├─────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────────────┐ │
│ │ CHỜ (3)    │ │ ĐANG LÀM(2)│ │ HOÀN THÀNH │ │ BATCHING — gom theo món  │ │
│ │            │ │            │ │  (kéo về)  │ │                          │ │
│ │ ┌────────┐ │ │ ┌────────┐ │ │  scroll    │ │ Phở bò: ▮▮▮▮ 4 (2 bàn)  │ │
│ │ │ Ticket │ │ │ │ Ticket │ │ │            │ │ Bún chả: ▮▮ 2           │ │
│ │ │  #084  │ │ │ │  #082  │ │ │            │ │ Cơm tấm: ▮ 1            │ │
│ │ │ Bàn 12 │ │ │ │ Bàn 03 │ │ │            │ │                          │ │
│ │ │ ...    │ │ │ │ ...    │ │ │            │ │ ───────────────────────  │ │
│ │ └────────┘ │ │ └────────┘ │ │            │ │ SLA Watch                │ │
│ │            │ │            │ │            │ │ #079 · 16:22 · 12m SLA    │ │
│ └────────────┘ └────────────┘ └────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

SLA Watch row: severity = màu token + icon Lucide (`AlertCircle` / `AlertTriangle`) + text — không dùng emoji trạng thái.

### 4.2 Component mapping

| Block                     | Component                                                                | Notes                                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header                    | Custom flex with `Badge` clock + `Tabs` (KITCHEN / BAR — switch route)   | Trạng thái station: `<ChefHat />` + label KITCHEN / `<Wine />` + label BAR (đổi glyph nếu PM chốt khác — vẫn trong Lucide). "Recall log" / settings: `ScrollText` hoặc `History`, `<Settings />`. Sheet recall full audit 24h |
| Column container          | 3 columns flex 1, 4th column fixed 360px                                 | Drag-and-drop bằng `@dnd-kit` (mock visual only) — kéo ticket giữa cột tương ứng status update                                                                                                                                |
| Ticket card (`KDSTicket`) | Custom card 220×260, large 24px ticket #, bàn 36px font, items list 18px | Color band trái theo SLA (lime → amber → hot pink). Footer: hai button to "Bắt đầu" / "Xong" (44dp tap target) hoặc "Recall" khi ở cột Hoàn thành                                                                             |
| Ticket items              | `Checkbox` per item (chéo qua khi xong từng món riêng)                   | Note inline italic font Mono                                                                                                                                                                                                  |
| Batching panel            | List `Progress`-style bars + counter                                     | Tap → highlight các ticket cùng món bằng outline lime                                                                                                                                                                         |
| SLA Watch panel           | Live list ordered by `createdAt` desc, color-coded                       | Tap → focus ticket trong cột tương ứng (scroll + flash)                                                                                                                                                                       |

### 4.3 Ticket card detail (D4 — click ticket)

Click ticket → `Sheet` side="right" 480px:

| Section       | Component                     | Content                                                                                           |
| ------------- | ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Header        | Big number + `Badge` station  | `#084 · Bàn 12 · Tầng trệt`                                                                       |
| Items detail  | `Table` mỗi item              | name, qty, note, individual status `Select` (PROCESSING / READY / CANCELED)                       |
| Timeline      | Custom vertical `Timeline`    | createdAt → confirmedAt (by waiter X) → started (by chef Y) → ready → served. Mỗi event có avatar |
| SLA gauge     | Recharts `RadialBarChart` đơn | "8m 14s / SLA 10m" — màu theo %                                                                   |
| Actions       | `Button` group                | "Đánh dấu Ready", "Recall (back to PROCESSING)", "Báo hết hàng từng món" → `AlertDialog`          |
| Linked orders | `HoverCard` mini              | "Bàn 12 đang có 2 ticket khác" — link nhảy ngang                                                  |

### 4.4 Information density & micro-interactions

| Element        | Action            | Reveal                                                                                                                                     |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Ticket         | Tap title bar     | `Sheet` chi tiết (4.3)                                                                                                                     |
| Ticket         | Tap "Bắt đầu"     | Card slide CHỜ → ĐANG LÀM, color band shifts                                                                                               |
| Ticket footer  | Long-press "Xong" | Confirm halo 600ms (chống miss-tap) — chỉ commit nếu giữ 600ms                                                                             |
| Batching bar   | Tap               | Outline tất cả tickets cùng món + scroll-into-view                                                                                         |
| SLA red ticket | —                 | Whole card pulse 2s loop; badge severity dùng `<AlertCircle className="text-[var(--pink)]" />` + text "Quá SLA" (không dùng chấm đỏ emoji) |
| Recall log     | Tap               | `Sheet` data table: timestamp · ticket # · who · reason · resolved                                                                         |
| Header clock   | Tap               | `Popover` station settings: SLA threshold (slider 5–20m), font size, sound on/off                                                          |

### 4.5 Audio / haptic

- New ticket: short bell chime (KITCHEN: `kitchen-bell.mp3`, BAR: `bar-tap.mp3`).
- SLA crossed amber: 1 beep; SLA crossed red: 2 beep + repeated every 60s until resolved.
- All audio mockable via `useFakeRealtime()` event emitter.

---

## 5. Cross-cutting concerns

### 5.1 Mock data architecture

```
apps/customer-pwa/src/mocks/
  ├── seed.ts              ← faker.seed(42); export fixtures (menu, tables, sessions)
  ├── store.ts             ← Zustand: cart, session, presence
  └── use-fake-realtime.ts ← setInterval emitting OrderStatusChangedEvent every 8–15s

apps/management-app/src/mocks/
  ├── seed.ts              ← 24 tables · 7 live orders · 2 service requests · 18 historical bills
  ├── store.ts             ← Zustand: liveOrders, tables, requests, selectedRowId
  └── use-fake-realtime.ts ← emits OrderCreatedEvent, ServiceRequestedEvent, OrderStatusChangedEvent
```

`useFakeRealtime()` MUST emit events shaped exactly như `OrderCreatedEvent / OrderStatusChangedEvent / ServiceRequestedEvent` từ `realtime-events.types.ts` để swap sang BFF Direct Step 2.5 chỉ là thay nguồn.

### 5.2 Routing

| App            | Route                                           | Notes                               |
| -------------- | ----------------------------------------------- | ----------------------------------- |
| customer-pwa   | `/t/:tableId` (landing → menu)                  | Đã có `landing-page.tsx`            |
| customer-pwa   | `/menu`                                         | Đã có `menu-page.tsx` — sẽ refactor |
| customer-pwa   | `/cart` (overlay sheet, không phải route riêng) | —                                   |
| customer-pwa   | `/order/:orderId`                               | Đã có `order-tracking-page.tsx`     |
| customer-pwa   | `/payment`                                      | Đã có `request-payment-page.tsx`    |
| management-app | `/(pos)/pos` (landing live orders)              | Nx route group đã tồn tại           |
| management-app | `/(pos)/pos/tables`                             | new                                 |
| management-app | `/(pos)/pos/service-requests`                   | new                                 |
| management-app | `/(pos)/pos/bills`                              | new                                 |
| management-app | `/(kds)/kds/kitchen`                            | refactor existing                   |
| management-app | `/(kds)/kds/bar`                                | refactor existing                   |

### 5.3 shadcn components cần install (chưa có trong repo)

| App            | Components mới                                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| customer-pwa   | `sheet`, `drawer` (vaul), `dialog`, `tabs`, `carousel`, `hover-card`, `popover`, `toast` (sonner), `badge`, `tooltip`                                                                                                |
| management-app | `data-table` template (đã có folder), `tabs`, `hover-card`, `context-menu`, `dropdown-menu`, `dialog`, `alert-dialog`, `popover`, `toggle-group`, `progress`, `separator`, `avatar`, `tooltip`, `select`, `textarea` |

→ Dùng `pnpm dlx shadcn@latest add <comp>` per app (giữ separate registry).

### 5.4 Accessibility

- Cart drawer: focus trap (Radix native), ESC close.
- KDS: keyboard shortcuts `1` (start), `2` (done), `3` (recall) khi ticket focused; visible focus ring 3px lime.
- Color không phải affordance duy nhất: SLA kèm **glyph Lucide** (ví dụ `<Circle className="fill-emerald-500" />` / `<AlertTriangle className="text-amber-400" />` / `<AlertCircle className="text-pink-500" />`) **và** text đo thời gian ("12m", "Quá hạn") — không dùng emoji 🟢🟡🔴 làm icon trạng thái.
- WCAG AA contrast trên cả 3 theme (đã chọn palette với pairs ≥ 4.5:1).

### 5.5 Performance budget (mock phase)

| Surface                     | Target                                               |
| --------------------------- | ---------------------------------------------------- |
| PWA Menu render 60 items    | LCP < 2.5s, CLS < 0.05                               |
| POS DataTable 500 mock rows | TTI < 1.5s, virtualize via `@tanstack/react-virtual` |
| KDS 50 tickets render       | 60fps, no layout thrash khi drag                     |

### 5.6 Icon stack & quy tắc cho agent implement

**Nguồn chuẩn (Step 2.2):** `lucide-react` — import **named** từng icon (`import { Bell, Timer } from 'lucide-react'`). Mỗi icon là SVG inline; tùy chỉnh qua props `size`, `color`, `strokeWidth` và các thuộc tính SVG hợp lệ (theo tài liệu Lucide; Context7: `/lucide-icons/lucide`). Có thể dùng `LucideProvider` để set mặc định `size`/`strokeWidth`/`color` cho subtree (override từng icon khi cần). Mặc định icon mang tính trang trí (`aria-hidden`); **bổ sung `aria-label`** (hoặc text visible bên cạnh) khi icon một mình diễn đạt hành ý (cột ghi chú, nút icon-only).

**Tra cứu glyph:** [lucide.dev/icons](https://lucide.dev/icons) trước khi thêm dependency mới.

**Đồng bộ monorepo:** `apps/customer-pwa`, `apps/management-app`, `libs/frontend/ui` đều đã khai báo `lucide-react` — ưu tiên bộ stroke này cho toàn bộ mock UI Step 2.2 để khớp shadcn/ui.

**@einvoice/frontend-ui:** Nếu lib export pattern/icon wrapper đã dùng trong app, **ưu tiên** tái sử dụng để đồng nhất theme; không nhân đôi cùng một ý nghĩa bằng hai bộ icon khác họ.

**Cấm trong UI production (Step 2.2):** Unicode emoji làm icon hoặc trạng thái (🍳, 🔔, ⏱, 🟢, 🔴, 👥, …) trong JSX / label cố định. Wireframe ASCII trong blueprint chỉ minh họa — map sang bảng dưới đây.

**Thư viện khác (chỉ sau ADR / design review):** `@tabler/icons-react` hoặc `@phosphor-icons/react` nếu thiếu glyph đặc thù; `@mui/icons-material` (filled Material) **không** khuyến nghị trộn cùng hàng toolbar shadcn outline trừ khi toàn surface chuyển Material.

**Bảng map nhanh (ý / wireframe → Lucide):**

| Ý / vùng UI                 | Gợi ý `lucide-react`                                                        |
| --------------------------- | --------------------------------------------------------------------------- |
| Mở menu / sidebar           | `PanelLeft`, `Menu`                                                         |
| Đếm phiên / thời gian phiên | `Timer`, `Clock`                                                            |
| Khách cùng bàn / count      | `Users`                                                                     |
| Thông báo                   | `Bell` (+ `Badge` số)                                                       |
| Ghi chú khách (cell / nút)  | `StickyNote`, `MessageSquareText`                                           |
| Kitchen                     | `ChefHat` (thay `UtensilsCrossed` nếu cần)                                  |
| Bar                         | `Wine`, `GlassWater`                                                        |
| Cài đặt                     | `Settings`                                                                  |
| Trợ giúp chung              | `CircleHelp`                                                                |
| SLA nhẹ / cảnh báo / breach | `Circle` (fill + màu token), `AlertTriangle`, `AlertCircle` — luôn kèm text |
| Service types               | `UserRound` / `HandHelping`, `Receipt`, `CircleHelp`                        |
| Xoá / giỏ                   | `Trash2`, `ShoppingCart`                                                    |
| Chi tiết / mở rộng          | `ChevronRight`, `ExternalLink`                                              |

---

## 6. Verification checklist (Step 2.2 done = all green)

- PWA: Khách thêm 3 món → cart drawer hiện đúng tổng → submit → animation success → tracking page chạy timeline.
- PWA: Service request 3 button hoạt động → toast confirmation.
- PWA: Out-of-stock real-time push (mock 10s) → card disable + toast.
- POS: New order slide-in animation từ fake WS event.
- POS: ⌘K palette tìm bàn / order, jump đúng.
- POS: Confirm/Cancel chuyển trạng thái optimistic + rollback nếu mock-fail.
- POS: Transfer table dialog validate bàn đích status.
- POS: Cash bill panel tính tiền thừa đúng.
- POS: Service request inbox 3 tabs + acknowledge/resolve.
- KDS: 3-column kanban + drag giữa cột cập nhật status.
- KDS: SLA color shift đúng threshold; pulse khi quá hạn.
- KDS: Batching panel highlight tickets cùng món.
- KDS: Recall log sheet hiển thị audit.
- KDS: Ticket detail sheet với timeline + radial SLA.
- All: Mock realtime events tuân `realtime-events.types.ts` payload schema.
- All: Light/dark/contrast themes đạt WCAG AA.
- All: Icon policy §5.6 — affordance UI dùng `lucide-react` (và re-export `@einvoice/frontend-ui` nếu có); không dùng Unicode emoji làm icon/avatar/status dot trong JSX.

---

## 7. Outputs cho Step 2.5 (FE↔BE integration)

- Component library + design tokens stable → Step 2.5 chỉ cần thay `useFakeRealtime` bằng WebSocket client thật + thay Zustand mock bằng TanStack Query hooks (`useOrders`, `useCart`, `useTables`, `useServiceRequests`).
- Route map đã đặt sẵn → BFF endpoint mapping 1-1.
- Density layers (mini charts, presence, ticket sheet, ⌘K) đã absorbed UX → tránh cycle "UI nhỏ rồi đập đi" khi Step 2.6 (analytics) đến.

---

## 8. Open questions / clarification needed (chưa critical, có thể defer)

1. **Multi-station priority routing**: Một món "Cocktail kèm topping bánh" thuộc Bar hay Kitchen? → Đề xuất `MenuItem.station[]` (array) ở Step 2.4, mock blueprint giả định 1-1.
2. **Customer authentication trong cart presence**: Khách guest có hiển thị tên không? → Mock dùng "Khách 1, Khách 2" (anonymous), Step 2.5 quyết.
3. **SLA threshold per category**: Cocktail 5m vs Phở 12m? → Mock hard-code `slaSeconds` đã có trong `KDSTicket`; Step 2.4 BE trả về.
4. **Bill split Phase 2A?**: business-logic §6 không đề cập — Phase 2B/3. Mock không hiển thị nút split.
