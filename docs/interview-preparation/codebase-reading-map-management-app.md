# 📘 Bộ Tài Liệu Đọc Hiểu `management-app` — Chuẩn Bị Phỏng Vấn

> **Tác giả:** Võ Đình Minh Quân — QRTable Graduation Thesis  
> **Lưu ý:** `management-app` phức tạp hơn `customer-pwa` nhiều lần. Tài liệu này **ưu tiên có chủ đích** — tập trung vào những phần bạn thực sự cần nắm để phỏng vấn, bỏ qua các nghiệp vụ đặc thù.

---

## 🧠 VÒNG 0 — NỀN TẢNG NEXT.JS: ĐỌC TRƯỚC KHI VÀO CODE

> Đây là phần **BẮT BUỘC ĐỌC TRƯỚC** nếu bạn vừa từ `customer-pwa` (React + Vite) chuyển sang đọc `management-app` (Next.js App Router). Giải thích từng khái niệm Next.js kèm vị trí file thực tế trong dự án.

---

### A. Sự khác biệt mô hình tư duy: React Vite vs Next.js App Router

Khi viết `customer-pwa`, bạn nghĩ đơn giản: **"Mọi thứ đều chạy ở trình duyệt (Browser-only)"**.

Khi đọc `management-app`, bạn phải chuyển sang tư duy **Hybrid — vừa chạy trên Server, vừa chạy trên Browser**:

```
customer-pwa (React + Vite):          management-app (Next.js App Router):

[Trình duyệt]                         [Server Next.js]       [Trình duyệt]
│                                     │                       │
│ 100% code chạy ở đây                │ Server Component      │ Client Component
│ React quản lý DOM                   │ (render HTML ở Server,│ (chạy ở Browser,
│ React Router quản lý route          │  output HTML thuần)   │ có useState/useEffect)
│ Không có "Server" trong code FE     │                       │
└──────────────────────────────────   └───────────────────────┘
```

**Quy tắc nhận biết Component nào chạy ở đâu trong `management-app`:**

| Dấu hiệu trong code                     | Component chạy ở đâu              | Ví dụ trong dự án                                                                                                                                                      |
| :-------------------------------------- | :-------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File KHÔNG có `'use client'` ở đầu      | **Server Component (mặc định)**   | [`app/layout.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/app/layout.tsx)                             |
| File CÓ `'use client'` ở dòng đầu       | **Client Component**              | [`app/providers.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/app/providers.tsx)                       |
| Dùng `useState`, `useEffect`, `useRef`  | Bắt buộc phải là Client Component | Mọi hook đều cần `'use client'`                                                                                                                                        |
| Dùng `cookies()`, `headers()`, `auth()` | Chỉ chạy được ở Server Component  | [`app/api/internal/me/route.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/app/api/internal/me/route.ts) |

---

### B. Hệ thống File Đặc Biệt — File-based Routing

Khác với `customer-pwa` dùng `<Routes>` và `<Route path="..." element={...} />` trong code JSX, Next.js dùng **tên file và tên folder** để tự động xác định URL:

| Tên file (Quy ước bắt buộc) | Vai trò                                                 | Ví dụ trong dự án                                                                                                                                                      |
| :-------------------------- | :------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout.tsx`                | Layout bọc ngoài, **KHÔNG bị unmount** khi chuyển trang | [`app/layout.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/app/layout.tsx)                             |
| `page.tsx`                  | Nội dung chính của URL cụ thể đó                        | `app/(dashboard)/dashboard/menu/page.tsx`                                                                                                                              |
| `loading.tsx`               | Skeleton hiển thị khi page đang tải (Suspense tự động)  | Kích hoạt tự động khi `page.tsx` là `async`                                                                                                                            |
| `error.tsx`                 | Trang lỗi fallback cho route segment đó                 | Thay thế ErrorBoundary thủ công                                                                                                                                        |
| `not-found.tsx`             | Trang 404 tùy chỉnh                                     | Dùng kèm `notFound()` trong Server Component                                                                                                                           |
| `route.ts`                  | **API Route Handler** — tạo HTTP endpoint trong Next.js | [`app/api/internal/me/route.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/app/api/internal/me/route.ts) |

---

### C. Route Groups — Folder `(tên)` không ảnh hưởng URL

Trong `customer-pwa`, React Router DOM yêu cầu viết tường minh từng `<Route>`.
Trong `management-app`, Next.js dùng **Route Group** — folder đặt tên trong dấu ngoặc đơn `(tên)` — để **nhóm các route dùng chung layout mà KHÔNG thay đổi URL**:

```
app/
├── (auth)/login/page.tsx       → URL: /login        (Không có "/auth/" trong URL!)
├── (dashboard)/dashboard/      → URL: /dashboard
│   ├── layout.tsx              ← Layout riêng: Có Sidebar + Header điều hướng
│   ├── menu/page.tsx           → URL: /dashboard/menu
│   └── tables/page.tsx         → URL: /dashboard/tables
├── (pos)/pos/page.tsx          → URL: /pos
│   └── layout.tsx              ← Layout riêng: Toàn màn hình POS, không Sidebar
└── (kds)/kds/page.tsx          → URL: /kds
    └── layout.tsx              ← Layout riêng: Màn hình Bếp tối giản
```

**Tại sao phải tách thành 3 Route Group khác nhau?**

- `/dashboard` cần layout có **Sidebar + Header điều hướng** đầy đủ cho Chủ quán.
- `/pos` cần layout **toàn màn hình không Sidebar** — Thu ngân cần không gian tối đa.
- `/kds` cần layout **tối giản cực độ** cho màn hình bếp nhỏ và Tablet.

Nếu không dùng Route Group → Cả 3 route bị bọc chung một layout cha → Không thể có 3 giao diện shell riêng biệt.

---

### D. Nested Layout — Hệ thống bố cục lồng nhau

```
[Root Layout: app/layout.tsx]
│   Bọc TOÀN BỘ app: <html><body><Providers>
│
├── [(dashboard)/layout.tsx]  → Bọc /dashboard/* → Thêm ManagementWorkspaceLayout
│       ├── /dashboard/menu/page.tsx
│       └── /dashboard/tables/page.tsx
│
├── [(pos)/layout.tsx]        → Bọc /pos         → Thêm PosAppShell (fullscreen)
│       └── /pos/page.tsx
│
└── [(kds)/layout.tsx]        → Bọc /kds         → Thêm KdsShell
        └── /kds/page.tsx
```

**Điểm khác biệt quan trọng với `customer-pwa`:**
Trong `customer-pwa`, khi chuyển từ `/menu` sang `/order-tracking`, component `<MobileShell>` vẫn sống nhờ `<Outlet>` của React Router DOM.
Trong Next.js, `layout.tsx` đóng vai trò đó — khi điều hướng từ `/dashboard/menu` sang `/dashboard/tables`, component `DashboardLayout` **không bị Unmount và Mount lại** → Socket connection, state, refs đều giữ nguyên!

---

### E. Server Component vs Client Component chi tiết

#### 1. Root Layout: Server Component thuần

📁 [`app/layout.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/app/layout.tsx)

```typescript
// KHÔNG có 'use client' → Server Component (mặc định)
import type { Metadata } from 'next';

// ✅ Metadata API — Chỉ hoạt động trong Server Component
export const metadata: Metadata = {
  title: 'QRTable Management App',
  description: 'Management dashboard shell',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
    {/* suppressHydrationWarning: Tắt cảnh báo khi ThemeProvider đổi class giữa Server và Client */}
      <body>
        <Providers>   {/* ← Providers là Client Component, được import vào Server Component */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

> **Quy tắc quan trọng:** Server Component CÓ THỂ import và render Client Component bên trong. Nhưng Client Component **KHÔNG THỂ** import Server Component vào bên trong nó.

#### 2. Providers.tsx: Client Component — "Ranh giới Client"

📁 [`app/providers.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/app/providers.tsx)

```typescript
'use client'; // ← Khai báo ranh giới: Từ đây trở xuống chạy ở Browser

export default function Providers({ children }) {
  // ❌ SAI (nếu viết ngoài component): const queryClient = new QueryClient()
  //    → Singleton dùng chung giữa tất cả users trong SSR → Lỗ hổng bảo mật!

  // ✅ ĐÚNG: Dùng useState lazy initializer
  //    → Mỗi user request tạo instance riêng biệt, cache không bị lẫn nhau
  const [queryClient] = useState(() => new QueryClient({ ... }));

  return (
    <SessionProvider>           {/* NextAuth cung cấp useSession() cho toàn Client */}
      <QueryClientProvider client={queryClient}>
        <AuthSessionHydrator /> {/* Đồng bộ NextAuth Token → Zustand */}
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

---

### F. Route Handlers (`route.ts`) — API Endpoint trong Next.js

Tính năng **không có tương đương trong React Vite**. Cho phép tạo HTTP endpoint ngay trong project Next.js, chạy hoàn toàn ở Server:

📁 [`app/api/internal/me/route.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/app/api/internal/me/route.ts)

```typescript
// URL: GET /api/internal/me
// Chạy HOÀN TOÀN TRÊN SERVER Next.js — Browser không thấy code này

import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  // ← Tên hàm = HTTP Method: GET, POST, PUT, DELETE...
  const session = await auth(); // Đọc Session từ HttpOnly Cookie — chỉ Server làm được!

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const profile = await fetchAuthorizerMe(session.accessToken, session.user?.tenantId);
  return NextResponse.json(profile);
}
```

**Tại sao cần Route Handler thay vì gọi thẳng Backend từ Browser?**

```
❌ Không dùng Route Handler:
   Browser → Gọi trực tiếp NestJS BFF kèm accessToken
           → Token bị lộ rõ trong Network tab DevTools của bất kỳ ai!

✅ Dùng Route Handler (Secure Proxy):
   Browser → Gọi GET /api/internal/me (nội bộ Next.js)
           → Next.js Server đọc Token từ HttpOnly Cookie (Browser không thấy)
           → Next.js Server gọi NestJS BFF kèm Token
           → Trả profile sạch về cho Browser
```

---

### G. Metadata API — Tiêu đề trang Server-side (Không có trong React Vite)

Trong `customer-pwa` (React + Vite), muốn đặt `<title>` phải dùng thư viện ngoài (`react-helmet`) và chạy ở Client.

Trong Next.js App Router, chỉ cần `export const metadata` từ `layout.tsx` hoặc `page.tsx`:

```typescript
// app/layout.tsx — Server Component
export const metadata: Metadata = {
  title: 'QRTable Management App',
  description: 'Management dashboard for QRTable SaaS POS',
};
// Next.js tự inject vào <head> khi render HTML từ Server
// Search Engine đọc được nội dung ngay lập tức, không cần đợi JS chạy
```

---

### H. Next.js Extended Fetch — `cache` Option Server-side

Khi gọi `fetch` trong Server Component hoặc Route Handler, Next.js mở rộng thêm option `cache` không có trong `window.fetch` bình thường:

📁 [`lib/auth/bff-server.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/lib/auth/bff-server.ts)

```typescript
// Chạy trên Server Next.js — Next.js Extended Fetch
const response = await fetch(`${getBffBaseUrl()}/authorizer/me`, {
  method: 'GET',
  headers,
  cache: 'no-store', // ← Tùy chọn riêng của Next.js!
  //      ↑
  //  'no-store'    → Luôn gọi thẳng Backend, không lưu cache Server
  //                  → Dùng cho dữ liệu auth thay đổi liên tục
  //  'force-cache' → Lưu vào Next.js Data Cache, dùng lại cho request tiếp theo
  //                  → Dùng cho dữ liệu tĩnh (config, danh sách tĩnh)
  //  (mặc định)    → Next.js tự quyết định
});
```

---

### I. `next.config.ts` — Trung tâm cấu hình Next.js

📁 [`apps/management-app/next.config.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/next.config.ts)

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',       // Build ra thư mục độc lập — deploy bằng Docker không cần node_modules
  images: {
    remotePatterns: [...]     // Whitelist domain cho <Image /> component của Next.js (tối ưu ảnh tự động)
  },
  turbopack: { root: workspaceRoot }, // Dùng Turbopack (bundler siêu nhanh) thay Webpack
  transpilePackages: [        // Bắt buộc trong Nx Monorepo: khai báo các thư viện shared
    '@einvoice/types',        // để Next.js biết cần transpile chúng từ ESM → CJS
    '@einvoice/frontend-ui',
    ...
  ],
};
```

> Tương đương với `vite.config.ts` trong `customer-pwa` — nhưng Next.js có nhiều tuỳ chọn đặc thù hơn nhiều.

---

### J. Bảng Tra Cứu Nhanh — "File này làm gì?"

| File / Folder                               |   Chạy ở   | Nhiệm vụ                                       | Tương đương trong `customer-pwa`                   |
| :------------------------------------------ | :--------: | :--------------------------------------------- | :------------------------------------------------- |
| `app/layout.tsx`                            | **Server** | Root HTML shell + inject Providers + Metadata  | `main.tsx` + `App.tsx` kết hợp                     |
| `app/providers.tsx`                         | **Client** | QueryClient + SessionProvider + AuthHydrator   | `main.tsx` (QueryClientProvider)                   |
| `app/(pos)/layout.tsx`                      | **Server** | Layout POS toàn màn hình, không Sidebar        | `<MobileShell>` bọc Routes                         |
| `app/(dashboard)/layout.tsx`                | **Server** | Layout Dashboard có Sidebar đầy đủ             | Không có tương đương trực tiếp                     |
| `app/api/internal/me/route.ts`              | **Server** | Secure Proxy lấy user profile từ BFF           | **Không có** — đặc trưng Next.js                   |
| `auth.ts`                                   | **Server** | Cấu hình NextAuth, JWT callback, Token Refresh | **Không có** — Customer PWA không có Login         |
| `lib/auth/bff-server.ts`                    | **Server** | Gọi `fetch` tới NestJS BFF kèm Bearer Token    | `lib/api-client.ts` (nhưng phía Client)            |
| `lib/auth/auth-store.ts`                    | **Client** | Zustand: lưu Token trong RAM cho API calls     | Biến module-level trong `lib/api-client.ts`        |
| `components/auth/auth-session-hydrator.tsx` | **Client** | Đồng bộ NextAuth Session → Zustand             | `useEffect` hydration trong `session-provider.tsx` |
| `next.config.ts`                            | Build-time | Cấu hình Next.js: output, transpile, images    | `vite.config.ts`                                   |

---

## 💬 CÂU HỎI PHỎNG VẤN VỀ NEXT.JS (Từ Vòng 0)

### Q_N1: "Server Component và Client Component khác nhau chỗ nào? Khi nào dùng cái nào?"

> _"Server Component là component mặc định trong Next.js App Router, code chạy hoàn toàn trên Server và output HTML thuần trước khi gửi về Browser. Không dùng được `useState`, `useEffect` hay Web API như `localStorage`. Client Component khai báo bằng `'use client'`, chạy ở Browser sau khi hydrate, có đầy đủ React hooks và tương tác người dùng. Em dùng Server Component cho layout tĩnh, Metadata API; và Client Component cho tất cả phần interactive: TanStack Query, Zustand, Socket.IO, event handlers."_

### Q_N2: "Route Group trong Next.js là gì? Tại sao dự án có 3 Route Group khác nhau?"

> _"Route Group là folder đặt tên trong dấu ngoặc đơn `(tên)`, cho phép nhóm các route dùng chung layout mà không làm thay đổi cấu trúc URL. Trong dự án em có 3 Route Group: `(dashboard)` layout đầy đủ Sidebar cho Chủ quán, `(pos)` layout toàn màn hình cho Thu ngân, `(kds)` layout tối giản cho màn hình Bếp. Nếu không dùng Route Group, không thể thiết kế 3 giao diện shell hoàn toàn khác nhau cho từng nhóm người dùng này."_

### Q_N3: "Tại sao tạo QueryClient phải dùng `useState(() => new QueryClient())` thay vì tạo ngoài component?"

> _"Đây là yêu cầu bắt buộc trong Next.js App Router. Nếu tạo ngoài component, QueryClient trở thành Singleton được chia sẻ giữa tất cả request từ các user khác nhau trên Server — cache của user A có thể bị user B đọc thấy, là một lỗ hổng bảo mật nghiêm trọng. Dùng `useState(() => new QueryClient())` đảm bảo mỗi lần mount tạo một instance riêng biệt, hoàn toàn cô lập giữa các user."_

### Q_N4: "Route Handler trong Next.js là gì? Tại sao cần `/api/internal/me`?"

> _"Route Handler là file `route.ts` trong thư mục `app/api/...`, cho phép tạo HTTP endpoint chạy ở phía Server trong project Next.js. Em dùng `/api/internal/me` làm Secure Proxy: Browser gọi vào Next.js Server, Server đọc Token từ HttpOnly Cookie an toàn, rồi dùng Token đó gọi sang NestJS BFF. AccessToken không bao giờ xuất hiện ở phía Client hay trong Network tab của DevTools — chống XSS hoàn toàn."_

---

## ⚠️ PHẦN NÀO ƯU TIÊN ĐỌC — PHẦN NÀO CÓ THỂ BỎ QUA

| Feature / Module                              |   Ưu tiên   | Lý do                                                         |
| :-------------------------------------------- | :---------: | :------------------------------------------------------------ |
| Auth (NextAuth + Keycloak)                    | 🔴 PHẢI ĐỌC | Khác hoàn toàn với customer-pwa, câu hỏi phỏng vấn thường gặp |
| App Router (Next.js) + Route Groups           | 🔴 PHẢI ĐỌC | Cấu trúc cốt lõi, điểm đặc trưng                              |
| Zustand (`auth-store`)                        | 🔴 PHẢI ĐỌC | State management thứ 3 trong project                          |
| POS — Màn hình Đơn Hàng (`live-orders-table`) | 🔴 PHẢI ĐỌC | TanStack Table + Virtual Scroll                               |
| KDS — Màn hình Bếp                            | 🟡 NÊN ĐỌC  | Socket.IO + holdTimer pattern                                 |
| Menu Management (CRUD)                        | 🟡 NÊN ĐỌC  | React Hook Form + Mutation hoàn chỉnh                         |
| Tables / QR Code                              | 🟡 NÊN ĐỌC  | useRef Canvas pattern                                         |
| `saas/subscription`                           |  ⚪ BỎ QUA  | Nghiệp vụ SaaS billing phức tạp                               |
| `reports/` (Dashboard charts)                 |  ⚪ BỎ QUA  | Recharts, không cần cho interview                             |
| `staff/` management                           |  ⚪ BỎ QUA  | CRUD đơn giản tương tự menu                                   |
| `(admin)/` route group                        |  ⚪ BỎ QUA  | Super-admin panel                                             |

---

## 🏗️ TỔNG QUAN KIẾN TRÚC

```
apps/management-app/src/
├── app/                        ← Next.js App Router root
│   ├── layout.tsx              ← Root Layout: bọc Providers
│   ├── providers.tsx           ← QueryClient + NextAuth + ThemeProvider
│   ├── (auth)/login/           ← Trang đăng nhập (Route Group)
│   ├── (dashboard)/dashboard/  ← Owner Dashboard (Route Group)
│   │   ├── menu/               ← Quản lý thực đơn
│   │   ├── tables/             ← Quản lý bàn & QR
│   │   └── orders/             ← Xem lịch sử đơn hàng
│   ├── (pos)/pos/              ← Màn hình POS Thu Ngân
│   ├── (kds)/kds/              ← Màn hình Bếp
│   └── api/internal/me/        ← API Route: lấy profile user
├── auth.ts                     ← NextAuth config (Keycloak OIDC)
├── components/auth/auth-session-hydrator.tsx
├── features/
│   ├── menu/                   ← CRUD Menu
│   ├── tables/                 ← CRUD Bàn + QR Code Dialog
│   ├── order/                  ← TanStack Query đơn hàng
│   ├── pos/                    ← Live Orders Table
│   └── kds/                    ← Kitchen Display
└── lib/auth/
    ├── auth-store.ts           ← Zustand store
    ├── role-routing.ts         ← Phân quyền role → redirect
    └── use-auth-ready.ts       ← Hook kiểm tra auth hydrated
```

**Sự khác biệt lớn nhất so với `customer-pwa`:**

| Điểm              | `customer-pwa`              | `management-app`                  |
| :---------------- | :-------------------------- | :-------------------------------- |
| **Framework**     | React + Vite + React Router | **Next.js App Router (React 19)** |
| **Auth**          | Session cookie đơn giản     | **NextAuth v5 + Keycloak OIDC**   |
| **State bổ sung** | Không                       | **Zustand** (auth store)          |
| **Routing**       | Client-side (BrowserRouter) | **Server + Client mix**           |

---

## 📚 VÒNG 1 — NEXT.JS APP ROUTER

### Bước 1 — Kiến trúc App Router

**📖 Giải thích: Next.js App Router**

| File đặc biệt | Vai trò                                               |
| :------------ | :---------------------------------------------------- |
| `layout.tsx`  | Bọc ngoài tất cả trang con — giữ state khi điều hướng |
| `page.tsx`    | Nội dung trang tại URL đó                             |
| `(folder)/`   | **Route Group** — nhóm routes KHÔNG ảnh hưởng URL     |

**Route Groups trong dự án:**

```
app/
├── (auth)/login/page.tsx        → URL: /login
├── (dashboard)/dashboard/menu/  → URL: /dashboard/menu
├── (pos)/pos/page.tsx           → URL: /pos
└── (kds)/kds/page.tsx           → URL: /kds

(auth), (dashboard), (pos), (kds) KHÔNG xuất hiện trong URL
→ Chỉ để nhóm routes có chung layout, sidebar riêng
```

**Server Component vs Client Component:**

```tsx
// Server Component (mặc định) — render trên server, không có hooks
async function DashboardPage() {
  const data = await fetch('/api/...'); // Fetch thẳng trên server
  return <div>{data}</div>;
}

// Client Component — thêm 'use client', mới dùng được hooks
('use client');
import { useState } from 'react';
function InteractiveComponent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

---

### Bước 2 — `app/layout.tsx` + `app/providers.tsx`

```tsx
// layout.tsx — Server Component
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>               {/* Client Component bọc toàn bộ */}
          <ErrorBoundary>
            <TooltipProvider>{children}</TooltipProvider>
          </ErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

// providers.tsx — 'use client'
export default function Providers({ children }) {
  // ⚠️ Dùng useState tạo QueryClient — tránh share cache giữa các user trên server
  const [queryClient] = useState(() => new QueryClient({ ... }));

  return (
    <SessionProvider>           {/* NextAuth Session */}
      <ThemeProvider>           {/* Dark/Light mode */}
        <QueryClientProvider client={queryClient}>
          <AuthSessionHydrator />   {/* Cầu nối NextAuth → Zustand */}
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
```

**Tại sao `useState(() => new QueryClient())` thay vì tạo ngoài component?**

- Nếu tạo ngoài component trong Next.js, tất cả request từ mọi user sẽ dùng chung 1 QueryClient trên server → rò rỉ dữ liệu!
- `useState` đảm bảo mỗi browser tab có QueryClient riêng.

---

## 📚 VÒNG 2 — AUTHENTICATION STACK

### Bước 3 — `auth.ts` — NextAuth + Keycloak

**Luồng xác thực:**

```
Browser → /login → signIn('keycloak') → Keycloak OIDC
      ← redirect với authorization code
Next.js server exchange code → access_token + refresh_token
auth.ts jwt() callback:
  → decodeJwtClaims(access_token)        [lấy tenantId từ JWT]
  → fetchAuthorizerMe(access_token)      [lấy roles từ backend]
  → lưu vào JWT cookie (httpOnly, bảo mật)
```

**Token refresh tự động:**

```typescript
async jwt({ token, account }) {
  // Đăng nhập lần đầu
  if (account?.access_token) { ... return enrichedToken; }

  // Token còn hạn → trả nguyên
  if (Date.now() < token.expiresAt - BUFFER) return token;

  // Token sắp hết/hết hạn → gọi Keycloak refresh endpoint
  return refreshAccessToken(token);
}
```

---

### Bước 4 — Zustand: `lib/auth/auth-store.ts`

**Tại sao cần Zustand khi đã có NextAuth?**

|                 | NextAuth Session                   | Zustand auth-store                                    |
| :-------------- | :--------------------------------- | :---------------------------------------------------- |
| **Lưu ở đâu**   | HttpOnly Cookie (Server)           | RAM Client                                            |
| **Dùng để**     | Xác thực server-side               | Inject token vào API headers, cung cấp profile cho UI |
| **Truy cập từ** | Server + Client qua `useSession()` | Chỉ Client, tức thì                                   |

```typescript
// Zustand — không cần Provider
export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  profile: null,
  hydrated: false, // ← Tránh flash UI khi auth chưa ready
  setAccessToken: (token) => set({ accessToken: token }),
  setProfile: (profile) => set({ profile }),
  setHydrated: (v) => set({ hydrated: v }),
  reset: () => set({ accessToken: null, profile: null, hydrated: false }),
}));

// Dùng với selector — tránh re-render thừa
const accessToken = useAuthStore((state) => state.accessToken); // ✅
const store = useAuthStore(); // ❌ re-render mỗi khi bất kỳ field nào thay đổi
```

---

### Bước 5 — `auth-session-hydrator.tsx` — Cầu Nối

Component không render gì (`return null`), chỉ đồng bộ NextAuth → Zustand:

```tsx
export function AuthSessionHydrator() {
  const { data: session, status } = useSession(); // Đọc từ NextAuth
  const isSigningIn = useRef(false); // Chặn signIn 2 lần (useRef!)
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    if (status === 'unauthenticated') {
      reset();
      return;
    }

    // Token hết hạn, không thể refresh → Force re-login
    if (session?.error === 'RefreshAccessTokenError' && !isSigningIn.current) {
      isSigningIn.current = true;
      signIn('keycloak');
      return;
    }

    // Đăng nhập thành công → Gọi /api/internal/me lấy roles đầy đủ
    fetch('/api/internal/me')
      .then((r) => r.json())
      .then((profile) => {
        setAccessToken(session.accessToken);
        setProfile(profile);
        setHydrated(true);
      });
  }, [session?.accessToken, status]);

  return null;
}
```

---

### Bước 6 — Role-Based Routing

```typescript
// lib/auth/role-routing.ts
// Sau khi đăng nhập → redirect đến trang đúng theo vai trò
// OWNER   → /dashboard
// STAFF   → /pos
// KITCHEN → /kds

// app/page.tsx (Server Component)
export default async function HomePage() {
  const session = await auth(); // Server-side auth check
  if (!session) redirect(ROUTES.LOGIN);
  const route = getDefaultRouteForRoles(session.user.roles);
  redirect(route);
}
```

---

## 📚 VÒNG 3 — CORE FEATURES

### Bước 7 — Menu Management (CRUD hoàn chỉnh)

Pattern 3 tầng chuẩn — đọc 1 lần nắm được toàn bộ app:

```
Service (services/menu.service.ts)       ← Gọi HTTP
    ↓
Hook (hooks/use-menu-mutations.ts)       ← useMutation + cache invalidation
    ↓
Component (menu-item-mutate-drawer.tsx)  ← React Hook Form + Zod + UI
```

**Điểm kỹ thuật trong `menu-item-mutate-drawer.tsx`:**

1. `useForm` + `zodResolver` (validation)
2. `form.reset(currentItem)` khi mở Edit mode
3. `fileInputRef.current?.click()` — trigger file picker ẩn
4. `form.setValue('categoryId', v)` — Shadcn Select không dùng `register` được
5. Upload ảnh Cloudinary trước khi submit form

---

### Bước 8 — QR Code Dialog (useRef Canvas)

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null);

// QRCodeCanvas ẩn — thư viện vẽ QR lên canvas
<QRCodeCanvas ref={canvasRef} value={qrUrl} size={512} className="hidden" />;

// Bấm "Tải PNG" → đọc dữ liệu ảnh từ canvas DOM
const downloadPng = () => {
  const pngUrl = canvasRef.current?.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = pngUrl;
  a.download = `qr-${table.name}.png`;
  a.click();
};
```

---

### Bước 9 — POS Live Orders Table (TanStack Table + Virtual Scroll)

**📖 TanStack Table:**

```tsx
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table';

// 1. Định nghĩa cột
const columns: ColumnDef<Order>[] = [
  {
    id: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => <Badge>{orderStatusVi(row.original.status)}</Badge>,
  },
  { id: 'table', header: 'Bàn', accessorKey: 'tableName' },
];

// 2. Khởi tạo table instance
const table = useReactTable({ data: orders, columns, getCoreRowModel: getCoreRowModel() });

// 3. Render
{
  table.getRowModel().rows.map((row) => (
    <TableRow key={row.id}>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  ));
}
```

**📖 Virtual Scroll:**

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

const scrollParentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: rows.length, // Tổng rows
  getScrollElement: () => scrollParentRef.current,
  estimateSize: () => 56, // Chiều cao ước tính mỗi row
});

// Chỉ render rows trong viewport
{
  virtualizer.getVirtualItems().map((virtualRow) => (
    <div key={virtualRow.key} style={{ position: 'absolute', top: virtualRow.start }}>
      {renderRow(rows[virtualRow.index])}
    </div>
  ));
}
// → 1000 rows nhưng chỉ ~15 được render thực trong DOM
```

---

### Bước 10 — KDS Kitchen Display (holdTimer + SLA)

```tsx
// kds-ticket-card.tsx

// holdTimer — lưu setTimeout ID
const holdTimer = useRef<number | null>(null);

const onPointerDown = () => {
  holdTimer.current = window.setTimeout(() => {
    markAsComplete(ticket.id); // Hoàn thành sau 2 giây nhấn giữ
  }, 2000);
};
const onPointerUp = () => {
  if (holdTimer.current) {
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }
};

// useNowMs — đồng hồ thời gian thực (cập nhật mỗi 10 giây)
const nowMs = useNowMs();
const elapsedMs = nowMs - new Date(ticket.createdAt).getTime();
const isOverdue = elapsedMs > 15 * 60 * 1000; // Quá 15 phút → đổi màu đỏ
```

---

## 💬 CÂU HỎI PHỎNG VẤN & TRẢ LỜI MẪU

### Q1: "Next.js App Router khác gì Pages Router?"

> App Router dùng thư mục `app/`. Khác biệt chính: hỗ trợ **Server Components** (render trên server), **Nested Layouts** (giữ state khi điều hướng), **Route Groups** (nhóm routes không ảnh hưởng URL). Dự án tôi dùng Route Groups `(dashboard)`, `(pos)`, `(kds)` để mỗi nhóm có layout riêng mà không làm xấu cấu trúc URL.

### Q2: "Tại sao dùng cả NextAuth lẫn Zustand?"

> Hai thư viện giải quyết 2 vấn đề khác nhau. **NextAuth** quản lý vòng đời auth: OIDC flow với Keycloak, lưu JWT trong HttpOnly Cookie bảo mật, tự động refresh token. **Zustand** là state phía Client: lưu `accessToken` trong RAM để inject vào API headers, cung cấp `hydrated` flag tránh flash màn hình. `AuthSessionHydrator` là cầu nối đồng bộ từ NextAuth → Zustand.

### Q3: "TanStack Table và Virtual Scroll dùng để làm gì?"

> TanStack Table là headless table library — cung cấp logic mà không ép buộc HTML. Tôi dùng trong màn hình POS với `ColumnDef<Order>[]` type-safe và `flexRender` để render cell tùy chỉnh. Virtual Scroll (`@tanstack/react-virtual`) chỉ render ~15 row đang hiển thị trong viewport thay vì toàn bộ, giúp scroll mượt mà dù có 500+ đơn hàng.

### Q4: "Server Component vs Client Component?"

> Server Component (mặc định): render trên server, không có state/hooks, có thể fetch data trực tiếp. Client Component (`'use client'`): render trên browser, có state, hooks, interactivity. Trong dự án: `layout.tsx`, `page.tsx` là Server Components. Toàn bộ `features/`, `providers.tsx` cần `'use client'` vì dùng `useState`/`useEffect`.

### Q5: "Phân quyền Role-based hoạt động thế nào?"

> `auth.ts` lấy `roles` từ Keycloak JWT và lưu vào NextAuth session. `lib/auth/role-routing.ts` export `getDefaultRouteForRoles(roles)` để tính URL đích. `app/page.tsx` (Server Component) gọi `auth()` server-side → lấy session → tính route → `redirect()` tới `/dashboard`, `/pos`, hoặc `/kds` tương ứng.

### Q6: "Zustand khác Redux Toolkit ở điểm gì?"

> Redux Toolkit nhiều boilerplate hơn (slice, reducer, action). Zustand tối giản: chỉ cần `create<Store>()`, không cần Provider, truy cập bằng hook bình thường. Trong dự án tôi dùng Zustand cho `auth-store` vì store nhỏ (4-5 fields) nhưng cần truy cập ở nhiều nơi mà không muốn phức tạp hóa với Redux.

---

## 📋 CHECKLIST TỰ KIỂM TRA

- [ ] Giải thích được **Route Group** `(dashboard)`, `(pos)`, `(kds)` — tại sao không ảnh hưởng URL
- [ ] Phân biệt **Server Component vs Client Component** — khi nào cần `'use client'`
- [ ] Mô tả luồng auth: **Keycloak → NextAuth → Cookie → AuthSessionHydrator → Zustand**
- [ ] Giải thích tại sao cần cả **NextAuth lẫn Zustand**
- [ ] Mô tả `useReactTable` hoạt động thế nào (`data` + `columns` + `flexRender`)
- [ ] Giải thích **Virtual Scroll**: chỉ render rows trong viewport, dùng `position: absolute`
- [ ] Nói được tại sao dùng `useState(() => new QueryClient())` trong Next.js App Router

---

## 🗂️ THỨ TỰ ĐỌC FILE (10 bước)

```
VÒNG 1 — Khung Xương Next.js:
  [1] app/layout.tsx                      → Root Layout
  [2] app/providers.tsx                   → QueryClient + NextAuth + Zustand

VÒNG 2 — Authentication Stack:
  [3] auth.ts                             → NextAuth + Keycloak config
  [4] lib/auth/auth-store.ts              → Zustand store
  [5] components/auth/auth-session-hydrator.tsx  → Sync NextAuth → Zustand
  [6] lib/auth/role-routing.ts            → Role → redirect URL

VÒNG 3 — Core Features:
  [7] features/menu/components/menu-item-mutate-drawer.tsx  → CRUD Form + Upload
  [8] features/tables/components/qr-code-dialog.tsx         → useRef Canvas download
  [9] features/pos/components/live-orders-table.tsx         → TanStack Table + Virtual
  [10] features/kds/components/kds-ticket-card.tsx          → holdTimer + SLA timer
```

---

## 📚 VÒNG 4 — NGHIỆP VỤ POS (Bổ sung — Quan trọng cho phỏng vấn)

> Phần này trả lời câu hỏi phỏng vấn điển hình nhất: _"Hãy walk me through một feature bạn tự xây dựng trong project."_

---

### Bước 11 — Order State Machine & Mutations

📁 [`features/order/hooks/use-order-query.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/order/hooks/use-order-query.ts)

Đây là file chứa toàn bộ **vòng đời nghiệp vụ đơn hàng** từ góc nhìn nhân viên:

**State Machine đơn hàng:**

```
PENDING (Chờ xác nhận)
    ↓ confirmOrder()
PROCESSING (Đang chế biến ở bếp)
    ↓ markOrderServed() khi bếp hoàn thành + nhân viên bưng ra
COMPLETED (Đã phục vụ)

Nhánh hủy:
PENDING  → cancelPendingOrder()  → CANCELED
PROCESSING → cancelProcessingOrder() → CANCELED  (cần reason)
```

**Các mutations với pattern lỗi + toast chuẩn:**

```typescript
// 1. XÁC NHẬN ĐƠN (PENDING → PROCESSING)
export function useConfirmOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => orderService.confirmOrder(orderId),
    onSuccess: async (_data, orderId) => {
      // Invalidate cả list lẫn detail để UI đồng bộ
      await invalidateOrderQueries(queryClient, orderId);
      toast.success('Đã xác nhận đơn');
    },
    onError: (error: Error) => toast.error(getErrorDisplayMessage(error)),
  });
}

// 2. ĐÁNH DẤU ĐÃ PHỤC VỤ (PROCESSING → COMPLETED)
export function useMarkOrderServedMutation() { ... }

// 3. HỦY ĐƠN — logic phân nhánh theo status hiện tại
export function useCancelOrderMutation() {
  return useMutation({
    mutationFn: ({ orderId, status, reason }: CancelOrderInput) => {
      // ← Business rule: Hủy PENDING vs PROCESSING gọi endpoint khác nhau
      if (status === OrderStatus.PENDING) {
        return orderService.cancelPendingOrder(orderId, { reason });
      }
      if (status !== OrderStatus.PROCESSING) {
        throw new Error('Chỉ hủy được đơn đang chờ hoặc đang xử lý.');
      }
      return orderService.cancelProcessingOrder(orderId, { reason: reason ?? '' });
    },
    onSuccess: async (_data, { orderId }) => {
      await invalidateOrderQueries(queryClient, orderId);
      toast.success('Đã hủy đơn');
    },
    onError: (error) => toast.error(getErrorDisplayMessage(error)),
  });
}

// 4. CHUYỂN BÀN — cập nhật cả orderKeys lẫn tableKeys
export function useTransferTableMutation() {
  return useMutation({
    mutationFn: (payload: TransferTablePayload) => orderService.transferTable(payload),
    onSuccess: async () => {
      await invalidateOrderQueries(queryClient);
      await queryClient.invalidateQueries({ queryKey: tableKeys.all }); // ← Cập nhật sơ đồ bàn
    },
  });
}
```

**Kỹ thuật `refetchInterval` thông minh (Adaptive Polling):**

```typescript
export function useOrderDetailQuery(orderId: string | null | undefined) {
  return useQuery({
    queryKey: orderKeys.detail(orderId ?? ''),
    queryFn: () => orderService.getOrder(orderId!),
    // refetchInterval nhận callback thay vì số cố định
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Đơn đã kết thúc → dừng polling (false = không poll nữa)
      if (status === OrderStatus.CANCELED || status === OrderStatus.COMPLETED) return false;
      // Đơn đang active → poll mỗi 4 giây (backup khi Socket.IO mất kết nối)
      return 4_000;
    },
  });
}
```

> **Insight:** Đây là chiến lược "Socket.IO ưu tiên, polling làm fallback" — Socket.IO cập nhật tức thì, polling đảm bảo data đồng bộ nếu socket mất kết nối.

---

### Bước 12 — `useStaffOrderRealtime` — So sánh với Customer PWA

📁 [`features/order/hooks/use-staff-order-realtime.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts)

**Điểm khác biệt quan trọng so với `useCustomerOrderRealtime`:**

|                      | Customer PWA                    | Management App                                      |
| :------------------- | :------------------------------ | :-------------------------------------------------- |
| **Auth Socket**      | `auth: { tenantId, sessionId }` | `auth: { token: accessToken }` (JWT Bearer)         |
| **Scope Invalidate** | Chỉ data của session khách đó   | **Toàn bộ** orders, tables, service requests, bills |
| **Events lắng nghe** | ~8 events (scope hẹp của khách) | ~10 events (bao gồm cả serviceRequested)            |
| **State nguồn**      | Context API (`useSession`)      | **Zustand** (`useAuthStore`)                        |

```typescript
export function useStaffOrderRealtime(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  // ← Khác: Lấy tenantId + accessToken từ Zustand (không phải Context API)
  const tenantId = useAuthStore((state) => state.profile?.tenantId);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!tenantId || !accessToken) return;

    // ← Khác: Xác thực bằng JWT Bearer thay vì sessionId
    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    // Khi có đơn mới từ BẤT KỲ khách nào → invalidate toàn bộ
    socket.on('events.orderCreated', (event: OrderCreatedEvent) => {
      if (event.tenantId !== tenantId) return; // Lọc đúng tenant
      invalidateOrders(queryClient, event.orderId);
      invalidateTables(queryClient); // ← Cập nhật sơ đồ bàn luôn
    });

    // Lắng nghe thêm: Khách gọi nhân viên
    socket.on('events.serviceRequested', (event: ServiceRequestedEvent) => {
      if (event.tenantId !== tenantId) return;
      invalidateServiceRequests(queryClient); // ← Customer PWA không có event này
    });

    // Thanh toán xong → invalidate cả bill lẫn sơ đồ bàn
    socket.on('events.paymentCompleted', (event) => {
      invalidateOrders(queryClient);
      invalidatePaymentState(queryClient, event.billId);
    });

    return () => {
      socket.disconnect();
    };
  }, [tenantId, accessToken, queryClient]);
}
```

---

### Bước 13 — `useOrderUiState` — Zustand cho UI State

📁 [`features/order/hooks/use-order-ui-state.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/order/hooks/use-order-ui-state.ts)

**Đây là ví dụ thứ 2 về Zustand** — khác với `auth-store`, lần này dùng để quản lý **UI state thuần túy** (không liên quan đến auth hay server data):

```typescript
// Zustand cho UI state — Pattern cực gọn
export type OrderViewFilter = 'all' | 'PENDING' | 'PROCESSING' | 'READY' | 'SERVED' | 'OVERDUE';

export const useOrderUiState = create<OrderUiState>((set) => ({
  selectedOrderId: null, // ← Đơn nào đang được chọn để xem chi tiết
  viewFilter: 'all', // ← Bộ lọc đang chọn trong ToggleGroup
  selectOrder: (id) => set({ selectedOrderId: id }),
  setViewFilter: (filter) => set({ viewFilter: filter }),
  reset: () => set({ selectedOrderId: null, viewFilter: 'all' }),
}));
```

**Cách dùng trong `live-orders-table.tsx`:**

```tsx
// Component A — bảng đơn hàng: đổi filter
const { viewFilter, setViewFilter } = useOrderUiState();
<ToggleGroup onValueChange={(v) => setViewFilter(posFilterChipsToView(v))}>

// Component B — panel chi tiết: đọc selectedOrderId
const { selectedOrderId } = useOrderUiState();
const { data: order } = useOrderDetailQuery(selectedOrderId);
```

> **Tại sao dùng Zustand thay vì `useState` hoặc Context?**
>
> - `useState` — Không chia sẻ được giữa `live-orders-table` và `order-detail-panel` (2 component ngang cấp)
> - Context API — Cần tạo Provider bọc ngoài, thêm boilerplate
> - **Zustand** — Chỉ cần gọi `useOrderUiState()` ở bất cứ đâu, không cần Provider

---

### Bước 14 — `usePosNotifications` — `useMemo` aggregate từ nhiều nguồn

📁 [`features/pos/hooks/use-pos-notifications.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/pos/hooks/use-pos-notifications.ts)

**Tại sao file này quan trọng với phỏng vấn?**

Resume của bạn khai dùng TanStack Query — người phỏng vấn sẽ hỏi: _"Khi có nhiều query cùng lúc, anh/chị aggregate data như thế nào?"_. File này là câu trả lời hoàn hảo:

```typescript
export function usePosNotifications(): PosNotificationItem[] {
  // Gọi 3 query song song (TanStack Query tự parallel fetch)
  const ordersQuery = useOrdersQuery();
  const tablesQuery = useTablesQuery();
  const serviceQuery = useServiceRequestsQuery({ status: 'PENDING', limit: 30 });

  // useMemo — CHỈ tính toán lại khi 1 trong 3 data thay đổi
  return useMemo(() => {
    const tableName = (tableId: string) =>
      tablesQuery.data?.find((t) => t.id === tableId)?.name ?? `Bàn ${tableId.slice(-4)}`;

    const items: PosNotificationItem[] = [];

    // Gom đơn hàng đang active (PENDING hoặc PROCESSING)
    for (const order of ordersQuery.data ?? []) {
      if (order.status !== 'PENDING' && order.status !== 'PROCESSING') continue;
      items.push({
        id: `order-${order.id}`,
        kind: 'order',
        createdAt: new Date(order.createdAt).getTime(),
        preview:
          order.status === 'PENDING'
            ? `Đơn #${order.id.slice(-6)} · chờ xác nhận`
            : `Đơn #${order.id.slice(-6)} · đang chế biến`,
      });
    }

    // Gom yêu cầu khách gọi nhân viên (gọi thêm nước, xin thanh toán...)
    for (const req of serviceQuery.data ?? []) {
      items.push({
        id: `service-${req.id}`,
        kind: 'service',
        createdAt: new Date(req.createdAt).getTime(),
        preview: `Yêu cầu phục vụ · ${tableName(req.tableId)}`,
      });
    }

    // Sắp xếp mới nhất lên đầu, giới hạn 40 items
    return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
  }, [ordersQuery.data, serviceQuery.data, tablesQuery.data]); // ← 3 dependencies
}
```

**`useMemo` — Khi nào nên dùng?**

```typescript
// ❌ KHÔNG dùng useMemo ở đây — logic đơn giản, tính toán < 1ms
const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName]);

// ✅ NÊN dùng useMemo khi:
// 1. Tính toán nặng (sort + filter 100+ items từ 3 nguồn data khác nhau)
// 2. Kết quả là object/array mới mỗi lần render → gây re-render downstream
return useMemo(() =>
  items.sort(...).slice(0, 40),  // ← Sort 100+ items, gộp 3 nguồn
  [ordersQuery.data, serviceQuery.data, tablesQuery.data]
);
```

---

### Bước 15 — `usePaymentHistoryQuery` — Adaptive Polling cho Thanh Toán

📁 [`features/payment/hooks/use-payment.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/management-app/src/features/payment/hooks/use-payment.ts)

```typescript
export function usePaymentHistoryQuery(billId: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.history(billId),
    queryFn: () => paymentService.history(billId),
    // Adaptive polling — chỉ poll khi hóa đơn còn đang chờ thanh toán
    refetchInterval: (query) => {
      if (!billId) return false;
      // Kiểm tra xem bill này có payment nào đang PENDING không
      const hasPending = (query.state.data ?? []).some((r) => r.billId === billId && r.status === 'PENDING');
      return hasPending ? 3000 : false; // 3 giây nếu còn pending, dừng nếu xong
    },
  });
}
```

**Luồng thanh toán POS:**

```
Nhân viên bấm "Xuất hóa đơn" → Tạo bill
    ↓
Khách chọn: Tiền mặt hoặc VietQR
    ↓ (VietQR)
Tạo mã QR ngân hàng → Khách quét chuyển khoản
    ↓
SePay webhook → Backend cập nhật payment status PENDING → COMPLETED
    ↓
usePaymentHistoryQuery đang poll 3 giây → Phát hiện status đổi
    ↓
UI tự cập nhật "Đã thanh toán" — không cần nhân viên F5
```

---

## 💬 CÂU HỎI PHỎNG VẤN BỔ SUNG (Vòng 4)

### Q7: "Walk me through một feature bạn tự build trong project."

> Tôi sẽ nói về **màn hình POS quản lý đơn hàng**. Feature này kết hợp 4 thứ: **TanStack Table** để render bảng đơn hàng type-safe với `ColumnDef<Order>[]`, **Virtual Scroll** để chỉ render rows đang hiển thị (hiệu năng cho 500+ đơn), **Socket.IO realtime** nhận đơn mới từ khách → auto invalidate TanStack Query cache, và **Adaptive Polling** 4 giây làm fallback nếu socket mất kết nối. Phía business logic, đơn đi qua state machine: PENDING → PROCESSING → COMPLETED, mỗi transition gọi một mutation endpoint khác nhau với toast feedback.

### Q8: "Anh/chị dùng `useMemo` khi nào? Cho ví dụ thực tế."

> `useMemo` phù hợp khi cần tránh tính toán nặng chạy lại mỗi render. Trong dự án tôi có `usePosNotifications` — aggregate dữ liệu từ 3 TanStack Query song song (orders + tables + service requests), gộp thành 1 danh sách thông báo, sort theo thời gian. Nếu không có `useMemo`, mỗi lần bất kỳ component cha re-render thì toàn bộ vòng lặp sort 100+ items sẽ chạy lại. Với `useMemo`, chỉ tính lại khi 1 trong 3 data nguồn thực sự thay đổi.

### Q9: "Zustand được dùng cho mấy mục đích trong project của anh/chị?"

> Dùng cho 2 mục đích hoàn toàn khác nhau. **`auth-store`** — lưu `accessToken` và `profile` của staff để inject vào API headers và hiển thị trên UI; cập nhật bởi `AuthSessionHydrator` sau khi NextAuth xác thực xong. **`useOrderUiState`** — lưu UI state thuần túy: đơn hàng nào đang được chọn, bộ lọc nào đang active trong bảng POS; giúp 2 component ngang cấp (bảng + panel chi tiết) chia sẻ state mà không cần Context API hay Props Drilling.

### Q10: "Adaptive Polling là gì? Tại sao không poll cố định?"

> Adaptive Polling là kỹ thuật thay đổi tần suất refetch dựa trên trạng thái dữ liệu hiện tại. Trong `usePaymentHistoryQuery`, `refetchInterval` nhận callback thay vì số cố định: nếu hóa đơn còn `PENDING` → poll mỗi 3 giây để bắt khoảnh khắc thanh toán thành công; nếu không còn pending → trả về `false`, dừng hoàn toàn. Nếu poll cố định 3 giây mãi mãi, những bill đã thanh toán xong từ lâu vẫn tiếp tục gọi API vô ích → lãng phí bandwidth.

---

## 📋 CHECKLIST BỔ SUNG (Vòng 4)

- [ ] Kể được 4 trạng thái đơn hàng: **PENDING → PROCESSING → COMPLETED** (+ nhánh CANCELED)
- [ ] Giải thích được tại sao `useCancelOrderMutation` phải phân nhánh theo `status` hiện tại
- [ ] Phân biệt được `useStaffOrderRealtime` vs `useCustomerOrderRealtime`: auth khác, scope invalidate khác
- [ ] Giải thích được tại sao `useOrderUiState` dùng Zustand thay vì `useState` hoặc Context API
- [ ] Giải thích được `useMemo` trong `usePosNotifications`: khi nào nên dùng, dependencies là gì
- [ ] Mô tả được luồng thanh toán VietQR: tạo bill → QR → SePay webhook → adaptive polling → UI cập nhật
