# 📘 Bộ Tài Liệu Đọc Hiểu `customer-pwa` — Chuẩn Bị Phỏng Vấn

> **Tác giả:** Võ Đình Minh Quân — QRTable Graduation Thesis  
> **Mục tiêu:** Vừa là lộ trình đọc code theo thứ tự logic, vừa là bộ ôn tập nhanh các công nghệ sử dụng (TanStack Query, React Router DOM, Context API, Socket.IO, Axios) — gắn thẳng vào code thực tế trong dự án.

---

## 🏗️ TỔNG QUAN KIẾN TRÚC `customer-pwa`

```
apps/customer-pwa/src/
├── main.tsx                    ← Khởi động app, setup QueryClient
├── App.tsx                     ← Routing + Provider wrapper
├── constants/
│   ├── routes.ts               ← Toàn bộ đường dẫn trang (single source of truth)
│   └── api.ts                  ← URL cấu hình API
├── lib/
│   ├── api-client.ts           ← HTTP client tập trung (interceptor session/tenant)
│   └── idempotency.ts          ← Tạo & lưu Idempotency Key
├── features/
│   ├── session/context/        ← Context API: quản lý phiên đặt món
│   ├── landing/                ← Xác thực QR + Join Session
│   ├── menu/                   ← Thực đơn món ăn
│   ├── order/                  ← Giỏ hàng + Đặt đơn + Realtime
│   ├── payment/                ← VietQR thanh toán
│   └── tenant/                 ← Trạng thái nhà hàng (mở/đóng)
└── pages/
    ├── landing-page.tsx        ← Trang xác thực QR
    ├── menu-page.tsx           ← Trang chọn món
    ├── order-tracking-page.tsx ← Trang theo dõi đơn
    └── request-payment-page.tsx← Trang thanh toán
```

**Luồng người dùng end-to-end:**

```
Quét QR bàn → /landing
  → Xác thực token QR → Lấy tenantSlug → Join Session (nhận sessionId)
  → /menu
  → Xem menu → Thêm món vào giỏ → Gửi đơn
  → /order-tracking
  → Bếp nấu (Realtime Socket) → Nhận thông báo món đã xong
  → /request-payment
  → Xuất VietQR → Quét chuyển khoản → Thanh toán xong
```

---

## 📚 VÒNG 1 — KHUNG XƯƠNG APP (Đọc trước, hiểu trước)

---

### Bước 1 — `main.tsx` — Khởi động App

📁 [`main.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/main.tsx)

```tsx
// Toàn bộ file chỉ làm 2 việc:
// 1. Tạo QueryClient (bộ não của TanStack Query)
// 2. Bọc app vào QueryClientProvider để mọi nơi trong app dùng được

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CONFIG.STALE_TIME, // Cache dữ liệu bao lâu trước khi coi là "cũ"
      refetchOnWindowFocus: QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS, // Có refetch khi focus tab không?
    },
  },
});
```

**📖 Giải thích công nghệ: TanStack Query — Setup**

TanStack Query cần được setup ở cấp cao nhất của app (root level):

| Khái niệm              | Ý nghĩa thực tế                                                                             |
| :--------------------- | :------------------------------------------------------------------------------------------ |
| `QueryClient`          | Bộ não trung tâm — lưu toàn bộ cache dữ liệu server trong RAM                               |
| `QueryClientProvider`  | "Ổ điện" cung cấp QueryClient cho toàn bộ component tree bên dưới                           |
| `staleTime`            | Dữ liệu được coi là "tươi" trong X ms — không refetch trong khoảng đó (tiết kiệm API calls) |
| `refetchOnWindowFocus` | Tự động refetch khi người dùng click vào tab (tắt đi = tiết kiệm request)                   |

**Quy tắc setup:**

```tsx
// ❌ Sai — Tạo QueryClient bên trong component → Mất cache mỗi lần render
function App() {
  const queryClient = new QueryClient(); // Tạo lại mỗi lần render!
}

// ✅ Đúng — Tạo NGOÀI component, 1 lần duy nhất trong vòng đời app
const queryClient = new QueryClient({ ... });
function App() { ... }
```

---

### Bước 2 — `App.tsx` — Routing & Provider

📁 [`App.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/App.tsx)

```tsx
function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        {' '}
        {/* ← Context API: Phiên đặt món */}
        <BrowserRouter>
          {' '}
          {/* ← React Router DOM */}
          <Routes>
            <Route element={<MobileShell />}>
              {' '}
              {/* ← Layout bọc tất cả */}
              <Route path="/" element={<RedirectRootToLanding />} />
              <Route path={ROUTES.LANDING} element={<LandingPage />} />
              <Route path={ROUTES.MENU} element={<MenuPage />} />
              <Route path={ROUTES.ORDER_TRACKING} element={<OrderTrackingPage />} />
              <Route path={ROUTES.REQUEST_PAYMENT} element={<RequestPaymentPage />} />
            </Route>
            <Route path="*" element={<Navigate to={ROUTES.LANDING} replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
      <Toaster position="top-center" />
    </ErrorBoundary>
  );
}
```

---

### Bước 3 — `constants/routes.ts` — Quản Lý Route Tập Trung

📁 [`constants/routes.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/constants/routes.ts)

```ts
export const ROUTES = {
  LANDING: '/landing',
  MENU: '/menu',
  ORDER_TRACKING: '/order-tracking',
  ORDER_TRACKING_WITH_ID: '/order-tracking/:orderId', // Path pattern cho <Route>
  ORDER_TRACKING_DETAIL: (
    orderId: string, // Helper function để navigate
  ) => `/order-tracking/${encodeURIComponent(orderId)}`,
  REQUEST_PAYMENT: '/request-payment',
} as const;
```

**Quy tắc "Single Source of Truth" cho Routes:**

- Toàn bộ đường dẫn khai báo tại 1 file duy nhất.
- Không bao giờ hardcode chuỗi `'/menu'` rải rác trong component.
- Khi đổi URL, chỉ sửa 1 nơi → toàn bộ app cập nhật.

---

**📖 Giải thích công nghệ: React Router DOM v6**

**Các thành phần cốt lõi:**

```tsx
// 1. BrowserRouter — Bọc ngoài cùng, bật tính năng routing
<BrowserRouter>...</BrowserRouter>

// 2. Routes — Container chứa danh sách Route
<Routes>...</Routes>

// 3. Route — Khai báo 1 tuyến đường
<Route path="/menu" element={<MenuPage />} />

// 4. Nested Routes — Route lồng nhau (dùng MobileShell làm Layout)
<Route element={<MobileShell />}>       // ← Layout wrapper (không có path)
  <Route path="/menu" element={<MenuPage />} />  // ← Trang con
</Route>
// MobileShell phải render <Outlet /> để hiển thị trang con bên trong

// 5. Navigate — Redirect
<Route path="*" element={<Navigate to="/landing" replace />} />

// 6. useNavigate — Chuyển trang bằng code
const navigate = useNavigate();
navigate(ROUTES.ORDER_TRACKING_DETAIL(data.order.id)); // Chuyển trang có ID

// 7. useLocation — Lấy thông tin URL hiện tại
const { search, pathname } = useLocation();
// search = "?table=A1&token=abc123" (query params từ QR URL)

// 8. useParams — Lấy dynamic segment từ URL
// Route: /order-tracking/:orderId
const { orderId } = useParams<{ orderId: string }>();

// 9. useSearchParams — Đọc query string (?key=value)
const [searchParams] = useSearchParams();
const token = searchParams.get('token');
```

**Pattern Nested Route (Layout)** — cách dùng trong dự án:

```tsx
// App.tsx
<Route element={<MobileShell />}>
  {' '}
  // MobileShell = Layout (header/footer/navbar)
  <Route path="/menu" element={<MenuPage />} />
</Route>;

// MobileShell.tsx — phải có <Outlet /> để render trang con
function MobileShell() {
  return (
    <div className="mobile-container">
      <TopNav />
      <Outlet /> {/* ← MenuPage được render vào đây */}
      <BottomNav />
    </div>
  );
}
```

---

## 📚 VÒNG 2 — PHÂN TÍCH CÔNG NGHỆ THEO TẦNG

---

### Bước 4 — Context API — `session-provider.tsx`

📁 [`features/session/context/session-provider.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/features/session/context/session-provider.tsx)

**Context API giải quyết vấn đề gì?**

Khi `sessionId` cần được dùng ở: `LandingPage`, `MenuPage`, `CartDrawer`, `OrderTrackingPage`, `RealtimeHook`... — nếu dùng Props thì phải "truyền chuỗi" (Props Drilling) qua nhiều tầng component rất phức tạp. Context API tạo một "kho lưu trữ chung" mà bất kỳ component nào cũng lấy được trực tiếp.

**Giải phẫu `session-provider.tsx`:**

```tsx
// ── BƯỚC 1: Định nghĩa kiểu dữ liệu ──
type SessionInfo = {
  sessionId: string;
  tenantId: string;
  tableId: string;
  tableName: string;
  tenantStatus?: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  // ...
};

type SessionContextValue = {
  session: SessionInfo | null;
  isActive: boolean;
  hydrated: boolean; // ← true khi đã đọc xong localStorage (tránh flash)
  startSession: (info: SessionInfo) => void;
  endSession: () => void;
};

// ── BƯỚC 2: Tạo Context (hộp chứa dữ liệu) ──
const SessionContext = createContext<SessionContextValue | null>(null);
// null = chưa có Provider bọc bên ngoài

// ── BƯỚC 3: Tạo Provider (bơm dữ liệu vào hộp) ──
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Khôi phục session từ localStorage khi mở lại app (F5)
  useEffect(() => {
    const raw = localStorage.getItem(PWA_SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SessionInfo;
      if (parsed?.sessionId) {
        setSession(parsed);
        setCustomerSessionId(parsed.sessionId); // Đồng bộ sang api-client
        setCustomerTenantId(parsed.tenantId);
      }
    }
    setHydrated(true);
  }, []);

  // Lắng nghe sự kiện "Session hết hạn" từ api-client (HTTP 410)
  useEffect(() => {
    const handleExpired = () => {
      setSession(null);
      persistSession(null);
    };
    window.addEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(CUSTOMER_SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  // useMemo để tránh tạo object mới mỗi lần render → tránh re-render không cần thiết
  const value = useMemo(
    () => ({
      session,
      isActive: session !== null,
      hydrated,
      startSession,
      endSession,
      patchTenantLifecycle,
    }),
    [session, hydrated, startSession, endSession, patchTenantLifecycle],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// ── BƯỚC 4: Custom Hook để đọc Context (dùng ở bất cứ component nào) ──
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
    // ← Guard này cực kỳ quan trọng, giúp debug dễ khi quên bọc Provider
  }
  return context;
}
```

**Cách dùng trong component:**

```tsx
// Ở bất kỳ component con nào bên dưới SessionProvider:
const { session, startSession, endSession } = useSession();
const sessionId = session?.sessionId;
```

**Khi nào dùng Context, khi nào dùng TanStack Query?**

| Tiêu chí          | Context API                        | TanStack Query           |
| :---------------- | :--------------------------------- | :----------------------- |
| Nguồn dữ liệu     | Client-side (không cần fetch)      | Server (cần gọi API)     |
| Ví dụ trong dự án | `sessionId`, `tenantId`, `tableId` | Menu, Đơn hàng, Giỏ hàng |
| Cache / Loading   | Không cần                          | Tự động                  |
| Thay đổi          | Ít (chỉ đổi khi join/end session)  | Thường xuyên             |

---

### Bước 5 — API Client — `lib/api-client.ts`

📁 [`lib/api-client.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/lib/api-client.ts)

Đây là **tầng giao tiếp HTTP trung tâm** của toàn bộ app. Mọi request HTTP đều đi qua hàm `customerApi<T>()` này.

```typescript
// Pattern: Module-level variables (không dùng useState vì không cần render)
let activeSessionId: string | null = null;
let activeTenantId: string | null = null;

// Setter — được gọi từ SessionProvider khi session thay đổi
export function setCustomerSessionId(id: string | null) {
  activeSessionId = id;
}
export function setCustomerTenantId(id: string | null) {
  activeTenantId = id;
}

// Hàm gọi API tập trung — tự động inject header
export async function customerApi<T>(path: string, options?: CustomerApiOptions): Promise<T> {
  const headers: Record<string, string> = {};

  // Tự động thêm x-tenant-id vào mọi request
  if (tenantId) headers['x-tenant-id'] = tenantId;

  // Tự động thêm x-session-id vào mọi request (trừ khi omitSessionHeader = true)
  if (activeSessionId && !options?.omitSessionHeader) {
    headers['x-session-id'] = activeSessionId;
  }

  try {
    return await apiClient<T>(path, { baseUrl: API_CONFIG.DEFAULT_BASE_URL, headers, ...rest });
  } catch (error) {
    // Xử lý đặc biệt: Server trả 410 (Session đã đóng) → Xóa session
    if (isSessionClosedError(error)) {
      clearCustomerSessionState(); // Dispatch event → SessionProvider reset
    }
    throw error; // Ném lại để TanStack Query bắt và hiển thị lỗi
  }
}
```

**Kỹ thuật hay cần nắm:**

- **Module-level variable** (không phải State): `activeSessionId` thay đổi không cần re-render, chỉ cần gán vào header mỗi khi gọi API.
- **Custom Event**: Khi server trả 410, `api-client` dispatch một `CustomEvent` (`qrtable:customer-session-expired`). `SessionProvider` đang lắng nghe event đó và tự động reset.
- **Generic Type `<T>`**: `customerApi<MenuResponse>(...)` — TypeScript tự suy luận kiểu dữ liệu trả về.

---

### Bước 6 — TanStack Query — Tầng Query & Mutation

**📖 Giải thích công nghệ: TanStack Query sâu hơn**

**`useQuery` — Đọc dữ liệu từ server:**

```tsx
// Cú pháp đầy đủ
const { data, isLoading, isError, error, refetch } = useQuery({
  queryKey: ['menu', tenantId], // ← "Địa chỉ" cache — bộ nhớ dùng key này để lưu & tìm data
  queryFn: () => menuService.getFullMenu(), // ← Hàm gọi API thực sự
  enabled: !!tenantId, // ← Chỉ gọi API khi tenantId đã có
  staleTime: 5 * 60 * 1000, // ← Cache tươi trong 5 phút
});
```

**Quy tắc `queryKey`** — Quan trọng nhất khi dùng TanStack Query:

```tsx
// ❌ Sai — Key quá chung chung, nhiều user dùng cùng cache
queryKey: ['cart'];

// ✅ Đúng — Key cụ thể theo từng tenant + session
queryKey: ['cart', tenantId, sessionId];

// Pattern trong dự án: Centralize key tại file riêng
// features/order/hooks/order-query-keys.ts
export const cartKeys = {
  snapshot: (tenantId: string, sessionId: string) => ['cart', tenantId, sessionId, 'snapshot'] as const,
};
// Dùng: queryKey: cartKeys.snapshot(tenantId, sessionId)
```

**Tại sao `queryKey` lại quan trọng?**

- Khi bạn gọi `queryClient.invalidateQueries({ queryKey: cartKeys.snapshot(t, s) })` — TanStack Query sẽ mark cache đó là "cũ" và refetch ngay.
- Khi bạn gọi `queryClient.setQueryData(key, newData)` — Cập nhật cache trực tiếp mà không cần gọi API (dùng sau khi submit đơn để UI cập nhật ngay lập tức).

---

**`useMutation` — Ghi dữ liệu lên server:**

```tsx
// Cú pháp đầy đủ
const mutation = useMutation({
  mutationFn: (variables) => orderService.submitOrder(variables), // ← Hàm gọi API
  onMutate: async (variables) => {
    // Chạy TRƯỚC khi API call — dùng để Optimistic Update
    await queryClient.cancelQueries({ queryKey: cartKey }); // Hủy request đang chờ
    const previous = queryClient.getQueryData(cartKey); // Lưu data cũ để rollback
    queryClient.setQueryData(cartKey, optimisticData); // Cập nhật UI ngay
    return { previous }; // Trả về để onError dùng
  },
  onError: (error, variables, context) => {
    // API lỗi → Rollback UI về trạng thái cũ
    if (context?.previous) queryClient.setQueryData(cartKey, context.previous);
  },
  onSuccess: (data) => {
    // API thành công → Cập nhật cache với data mới nhất từ server
    queryClient.setQueryData(cartKey, data.cart);
    queryClient.invalidateQueries({ queryKey: orderKeys.all });
  },
});

// Gọi mutation:
mutation.mutate({ idempotencyKey: '...' }); // Không cần await
await mutation.mutateAsync({ idempotencyKey: '...' }); // Có thể await để bắt lỗi

// Kiểm tra trạng thái:
mutation.isPending; // Đang gọi API
mutation.isSuccess; // Đã thành công
mutation.isError; // Đã thất bại
```

---

**Optimistic Update trong `use-cart-query.ts`:**

```tsx
// Khi người dùng bấm tăng số lượng món (setQuantity):
onMutate: async (vars) => {
  // 1. Hủy request đang chờ (tránh race condition)
  await queryClient.cancelQueries({ queryKey: key });

  // 2. Lưu data cũ để rollback nếu lỗi
  const previous = queryClient.getQueryData<CartSnapshot>(key);

  // 3. Cập nhật UI NGAY LẬP TỨC (trước khi API xong)
  queryClient.setQueryData(key, optimisticPatch(previous, vars));

  return { previous }; // Context để onError dùng
},
onError: (_err, _vars, context) => {
  // API lỗi (mạng đứt, server lỗi) → Restore UI về trạng thái cũ
  if (context?.previous) queryClient.setQueryData(key, context.previous);
},
onSuccess: (data) => {
  // API thành công → Ghi đè bằng data chính xác từ server
  queryClient.setQueryData(key, data);
},
```

---

### Bước 7 — Socket.IO — `use-customer-order-realtime.ts`

📁 [`features/order/hooks/use-customer-order-realtime.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts)

**📖 Giải thích công nghệ: Socket.IO Client**

WebSocket là giao thức **hai chiều** — khác với HTTP (một chiều: client gửi → server trả). Socket.IO là thư viện xây dựng trên WebSocket, có thêm: tự động reconnect, fallback về HTTP polling, Room system.

```typescript
// Pattern trong dự án: Kết nối + lắng nghe trong useEffect

useEffect(() => {
  if (!tenantId || !sessionId) return; // Guard — chỉ kết nối khi đã có session

  // 1. MỞ KẾT NỐI
  const socket = io('http://localhost:3300/orders', {
    auth: { tenantId, sessionId },  // ← Server dùng để xác minh và xếp vào đúng Room
    reconnection: true,             // ← Tự động reconnect khi mất mạng
    timeout: 10_000,
  });

  // 2. LẮNG NGHE CÁC SỰ KIỆN
  socket.on('connect', () => {
    setStatus('connected');
    // Khi vừa kết nối, invalidate tất cả query để đồng bộ dữ liệu mới nhất
    queryClient.invalidateQueries({ queryKey: cartKeys.snapshot(tenantId, sessionId) });
  });

  socket.on('events.kitchenItemReady', (event: KitchenItemReadyEvent) => {
    if (event.tenantId !== tenantId) return; // ← Lọc đúng tenant (bảo mật)
    // Đơn hàng của bàn này vừa xong → invalidate cache đơn → UI tự update
    queryClient.invalidateQueries({ queryKey: orderKeys.detail(...) });
  });

  socket.on('events.orderStatusChanged', (event) => {
    queryClient.invalidateQueries({ queryKey: orderKeys.detail(...) });
  });

  // Cũng lắng nghe sự kiện tenant bị suspend/close để cập nhật session context
  socket.on('tenant.suspended', (event) => {
    patchTenantLifecycle({ tenantStatus: 'SUSPENDED' }); // ← Context API update
  });

  // 3. DỌN DẸP — cực kỳ quan trọng, tránh memory leak
  return () => {
    socket.off('connect', onConnect);       // ← Gỡ từng listener
    socket.off('events.kitchenItemReady', onKitchenItemReady);
    // ... gỡ tất cả listeners
    socket.disconnect();                    // ← Đóng kết nối
  };

  // Dependencies: khi session/tenant thay đổi → disconnect cũ, connect mới
}, [tenantId, sessionId, queryClient, patchTenantLifecycle]);
```

**Kiến trúc tích hợp Socket.IO + TanStack Query:**

```
Server push event
      ↓
  socket.on('events.xxx', handler)
      ↓
  queryClient.invalidateQueries(key)   ← Không tự vẽ UI, chỉ báo "data cũ rồi"
      ↓
  TanStack Query tự động refetch API
      ↓
  Component re-render với data mới
```

---

### Bước 8 — Idempotency Key

📁 [`lib/idempotency.ts`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/lib/idempotency.ts)

```typescript
export function createAndPersistIdempotencyKey(): string {
  // Tạo UUID ngẫu nhiên dùng Web Crypto API (chuẩn, bảo mật)
  const key = globalThis.crypto?.randomUUID() ?? `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // Lưu vào localStorage (để khi F5 vẫn biết đang gửi request nào)
  localStorage.setItem(STORAGE_KEY, key);
  return key;
}
```

**Cách dùng trong `cart-drawer.tsx`:**

```tsx
const handleSubmitOrder = async () => {
  submitInFlightRef.current = true; // ← Chặn click đúp ở Client
  try {
    await submitOrder.mutateAsync({
      idempotencyKey: createAndPersistIdempotencyKey(), // ← Key duy nhất cho lần gửi này
    });
  } finally {
    submitInFlightRef.current = false;
  }
};
```

**Hai lớp bảo vệ chống trùng đơn:**

- **Lớp 1 — Client:** `submitInFlightRef` (`useRef`) chặn click đúp trong cùng 1 render cycle.
- **Lớp 2 — Server:** Backend nhận cùng 1 `idempotencyKey` từ 2 request → chỉ xử lý 1 lần, request sau trả ngay kết quả của request trước.

---

## 📚 VÒNG 3 — HÀNH TRÌNH NGƯỜI DÙNG END-TO-END

---

### Bước 9 — Landing Page & QR Verification

📁 [`pages/landing-page.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/pages/landing-page.tsx)  
📁 `features/landing/components/qr-landing-card.tsx`  
📁 `features/landing/hooks/use-verify-qr.ts` → `use-resolve-tenant.ts` → `use-join-session.ts`

**Luồng xác thực 3 bước:**

```
URL: /landing?tableId=xxx&token=yyy&slug=abc
         ↓
[use-verify-qr]       → POST /qr/verify?tableId=xxx&token=yyy
                         ← { valid: true }
         ↓
[use-resolve-tenant]  → GET /tenant/resolve?slug=abc
                         ← { tenantId: 'uuid', name: 'Nhà hàng ABC' }
         ↓
[use-join-session]    → POST /order/session/join
                         ← { session: { id, tenantId, tableId, ... } }
         ↓
[startSession(info)]  → Lưu sessionId vào Context API + localStorage
         ↓
navigate(ROUTES.MENU) → Chuyển sang trang menu
```

**Pattern `verifyOnceRef` — React 18 StrictMode:**

```tsx
const verifyOnceRef = useRef(false); // ← Cờ "đã chạy rồi"

useEffect(() => {
  if (verifyOnceRef.current) return; // ← Nếu đã chạy → bỏ qua
  verifyOnceRef.current = true; // ← Đánh dấu "đã chạy"
  verifyQr(); // ← Chỉ gọi API 1 lần duy nhất
}, []);

// Lý do: React 18 StrictMode mount → unmount → mount component 2 lần (chỉ khi dev)
// Nếu không có cờ này, API sẽ bị gọi 2 lần khi development
```

---

### Bước 10 — Menu Page

📁 [`pages/menu-page.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/pages/menu-page.tsx)  
📁 `features/menu/hooks/use-menu-query.ts`

```tsx
// use-menu-query.ts — Pattern Query Key Factory
export const customerMenuKeys = {
  all: ['customer-menu'] as const,
  fullMenu: (tenantId: string) => [...customerMenuKeys.all, tenantId, 'full'] as const,
};

export function useFullMenuQuery(tenantId: string | undefined) {
  return useQuery({
    queryKey: customerMenuKeys.fullMenu(tenantId ?? ''),
    queryFn: async () => {
      const response = await menuService.getFullMenu();
      return response.categories;
    },
    enabled: !!tenantId,        // ← Chỉ fetch khi có tenantId (sau khi join session)
    staleTime: 5 * 60 * 1000,  // ← Cache menu 5 phút (ít khi thay đổi)
  });
}

// Hàm pure để transform data (không phải hook, dễ test)
export function extractCategories(menu: PublicMenuCategory[]): CustomerCategoryTab[] { ... }
export function extractItems(menu: PublicMenuCategory[], categoryId?: string): PublicMenuItem[] { ... }
```

**Cách dùng trong component:**

```tsx
function MenuPage() {
  const { session } = useSession();
  const { data: menu, isLoading, isError } = useFullMenuQuery(session?.tenantId);
  const categories = menu ? extractCategories(menu) : [];

  if (isLoading) return <Skeleton />;
  if (isError)   return <ErrorMessage />;
  return <MenuList categories={categories} items={...} />;
}
```

---

### Bước 11 — Order Tracking + Realtime

📁 [`pages/order-tracking-page.tsx`](file:///Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order/apps/customer-pwa/src/pages/order-tracking-page.tsx)

Trang này kết hợp **2 nguồn cập nhật** cho cùng 1 dữ liệu đơn hàng:

1. **Polling từ TanStack Query**: Mỗi X giây tự refetch để đảm bảo.
2. **Push từ Socket.IO**: Khi server có sự kiện mới, invalidate query ngay lập tức → TanStack Query refetch.

```tsx
function OrderTrackingPage() {
  const { orderId } = useParams();

  // TanStack Query: Cache + loading + error state
  const { data: order } = useOrderDetailQuery(orderId);

  // Socket.IO: Push realtime updates → trigger TanStack Query refetch
  const realtimeStatus = useCustomerOrderRealtime();

  return (
    <div>
      {realtimeStatus === 'degraded' && <OfflineBanner />}
      <OrderStatusTimeline order={order} />
    </div>
  );
}
```

---

## 💬 CÂU HỎI PHỎNG VẤN & TRẢ LỜI MẪU

---

### Q1: "Phân biệt `useQuery` và `useMutation`?"

> `useQuery` dùng để **đọc** dữ liệu từ server — tự động gọi API khi component mount, cache kết quả, tự refetch. `useMutation` dùng để **ghi** dữ liệu lên server (POST/PUT/DELETE) — chỉ chạy khi ta gọi `mutation.mutate(...)`. Trong dự án, `useFullMenuQuery` dùng `useQuery` để lấy menu, còn `useCartMutations` dùng `useMutation` để thêm/xóa/sửa món.

### Q2: "Optimistic Update là gì? Tại sao dùng?"

> Optimistic Update là kỹ thuật cập nhật UI **ngay lập tức** trước khi API trả về, tạo cảm giác app phản hồi nhanh. Trong `use-cart-query.ts`, khi người dùng bấm tăng số lượng món: UI đổi ngay lập tức trong `onMutate`, nếu API lỗi thì `onError` rollback về trạng thái cũ, nếu thành công thì `onSuccess` ghi đè bằng data chính xác từ server.

### Q3: "Context API dùng ở đâu trong project?"

> Dùng trong `SessionProvider` để lưu `sessionId`, `tenantId`, `tableId` — dữ liệu phiên đặt món của khách. Chọn Context API vì: dữ liệu này có trên Client (không cần fetch server), ít thay đổi (chỉ khi join/end session), và cần truy cập ở nhiều tầng component khác nhau như `CartDrawer`, `MenuPage`, các Hooks realtime.

### Q4: "Socket.IO trong project làm gì?"

> Sau khi khách join phiên đặt món, `useCustomerOrderRealtime` mở một WebSocket connection lên namespace `/orders`, gửi `tenantId` và `sessionId` để server xác minh và xếp vào đúng Room. Khi bếp hoàn thành món (`events.kitchenItemReady`) hoặc đổi trạng thái đơn (`events.orderStatusChanged`), hook nhận event và gọi `queryClient.invalidateQueries(...)` — TanStack Query tự refetch và cập nhật UI mà không cần F5.

### Q5: "Khi API bị lỗi 401/410, xử lý thế nào?"

> Trong `lib/api-client.ts`, mọi request đi qua hàm `customerApi<T>()`. Khi server trả 410 (Session Closed), hàm này tự động dispatch một `CustomEvent` (`qrtable:customer-session-expired`). `SessionProvider` đang lắng nghe event đó và reset toàn bộ session context, đồng thời xóa localStorage.

### Q6: "Tại sao `queryKey` phải bao gồm `tenantId` và `sessionId`?"

> Để đảm bảo **Tenant Isolation** — cache của bàn A không bị lẫn với bàn B. Nếu không có `sessionId` trong key, 2 khách quét QR khác nhau có thể nhìn thấy giỏ hàng của nhau. Key factory pattern (`cartKeys.snapshot(tenantId, sessionId)`) đảm bảo tính nhất quán — khi invalidate ở hook này, component khác cũng nhận được dữ liệu mới.

---

## 📋 CHECKLIST TỰ KIỂM TRA TRƯỚC PHỎNG VẤN

- [ ] Vẽ được sơ đồ luồng: **Quét QR → Xác thực → Menu → Đặt món → Theo dõi → Thanh toán**
- [ ] Giải thích được tại sao `SessionProvider` nằm ngoài `BrowserRouter` trong `App.tsx`
- [ ] Giải thích được `queryKey` là gì và tại sao phải bao gồm `tenantId` + `sessionId`
- [ ] Phân biệt được khi nào dùng `useQuery` vs `useMutation`
- [ ] Mô tả được Optimistic Update bằng 3 bước: `onMutate` → `onError` (rollback) → `onSuccess` (confirm)
- [ ] Giải thích được Socket.IO + TanStack Query phối hợp thế nào (event → invalidate → refetch)
- [ ] Giải thích được `submitInFlightRef` + Idempotency Key = 2 lớp chống trùng đơn
- [ ] Giải thích được `api-client.ts` tự inject `x-session-id` và `x-tenant-id` vào header thế nào
- [ ] Demo được code `useSession()` — đây là ví dụ hoàn chỉnh của Context API pattern

---

## 🗂️ THỨ TỰ ĐỌC FILE (13 bước)

```
VÒNG 1 — Khung Xương:
  [1] main.tsx              → Setup QueryClient + Provider
  [2] App.tsx               → Routing + SessionProvider wrapper
  [3] constants/routes.ts   → Single source of truth cho đường dẫn

VÒNG 2 — Phân Tích Công Nghệ:
  [4] features/session/context/session-provider.tsx    → Context API
  [5] lib/api-client.ts                                → HTTP Client tập trung
  [6] features/menu/hooks/use-menu-query.ts            → useQuery + queryKey pattern
  [7] features/order/hooks/use-cart-query.ts           → useMutation + Optimistic Update
  [8] features/order/hooks/use-order-query.ts          → useSubmitOrderMutation
  [9] lib/idempotency.ts                               → Idempotency Key

VÒNG 3 — Hành Trình Người Dùng:
  [10] features/landing/hooks/ (3 files)               → QR Verify → Resolve → Join
  [11] pages/menu-page.tsx                             → Hiển thị menu
  [12] pages/cart/cart-drawer.tsx                      → Tổng hợp tất cả kỹ thuật
  [13] features/order/hooks/use-customer-order-realtime.ts → Socket.IO
```
