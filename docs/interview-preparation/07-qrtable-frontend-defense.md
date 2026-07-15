# QRTable Frontend Defense / Bộ Câu Hỏi Bảo Vệ Frontend QRTable

> Every answer in this file is grounded in the current repository. Personal contribution still needs honest wording because QRTable was a two-person project.

## Three-Minute Architecture Answer [P0]

> QRTable is a multi-tenant SaaS POS and QR-ordering platform for F&B businesses. We separated the frontend into two applications because the users and interaction models are different. The Management App uses Next.js App Router for owners, managers, POS staff, and kitchen or bar stations. The Customer App uses React and Vite for a mobile-first QR ordering journey.
>
> Both applications use TypeScript, TanStack Query, Tailwind, and shadcn-style components. The Management App also uses TanStack Table for complex operational data and Zustand for focused client UI and hydrated auth state. The Customer App uses a scoped session Context and TanStack Query for menus, cart, orders, and bills.
>
> The frontend does not call individual microservices directly. It communicates through the BFF using REST, while Socket.io provides realtime change signals. TanStack Query remains the server-state source of truth. Socket handlers validate tenant, session, or station scope and then invalidate or update targeted query keys. On reconnect, the client refetches authoritative snapshots because events may have been missed.
>
> Important consistency examples are optimistic cart updates with rollback and cart-version conflict handling, idempotency keys for order submission, and request IDs for KDS actions. The main current limitation is that operational Next.js screens are still client-heavy and the Customer App does not yet have verified offline or installable PWA infrastructure. I would improve route-level boundaries, selective server prefetching, bundle measurement, and PWA behavior based on actual product requirements.

**Keywords:** two frontends · BFF · Query source of truth · scoped realtime · consistency · honest limitations

## Product and Architecture

### 1. Why Did You Build Two Frontend Applications? [P0]

**Core answer**

> The two audiences have different security, device, and workflow requirements. The Management App supports authenticated, information-dense POS, KDS, reporting, and administration workflows. The Customer App starts from a table QR code and needs a focused mobile ordering journey with session persistence. Separating them keeps routing, authentication, UI density, and deployment decisions clearer while shared types and primitives remain in Nx libraries.

**Evidence:** [`apps/management-app`](../../apps/management-app) and [`apps/customer-pwa`](../../apps/customer-pwa).

**Câu hỏi tiếng Việt:** Vì sao bạn xây hai frontend application?

**Trả lời tiếng Việt**

> Hai nhóm user có security, device và workflow khác nhau. Management App phục vụ authenticated POS, KDS, reporting, administration với mật độ thông tin cao. Customer App bắt đầu từ QR tại bàn và tập trung mobile ordering cùng session persistence. Tách app giúp routing, auth, UI density và deployment rõ hơn, còn types/primitives vẫn share qua Nx.

### 2. Why Next.js for Management and Vite for Customer? [P0]

**Core answer**

> The Management App benefits from App Router layouts, server-rendered public content, metadata, and structured product areas. The customer journey is an interactive mobile client entered through a QR session, so a smaller React/Vite application was sufficient for that architecture. This was a product-boundary decision, not a claim that Vite is always faster or Next.js is always better.

**Câu hỏi tiếng Việt:** Vì sao Management dùng Next.js còn Customer dùng Vite?

**Trả lời tiếng Việt**

> Management hưởng lợi từ App Router layouts, public server-rendered content, metadata và product areas có cấu trúc. Customer journey là mobile interactive flow vào từ QR session nên React/Vite nhỏ hơn đã đủ cho kiến trúc đó. Đây là product-boundary decision, không phải Next.js luôn tốt hơn Vite.

### 3. How Does the Frontend Connect to Microservices? [P0]

**Core answer**

> The browser does not know individual service locations. It calls the BFF or gateway through typed service modules. Staff requests attach the access token and active tenant header; customer requests attach tenant and active session headers. The BFF owns routing, guards, and transport details. This reduces frontend coupling to microservice topology and centralizes cross-cutting security behavior.

**Evidence:** [`authenticated-client.ts`](../../apps/management-app/src/lib/api/authenticated-client.ts) and [`customer-pwa/api-client.ts`](../../apps/customer-pwa/src/lib/api-client.ts).

**Câu hỏi tiếng Việt:** Frontend kết nối microservices thế nào?

**Trả lời tiếng Việt**

> Browser không biết location từng service mà gọi BFF/gateway qua typed service modules. Staff request gắn access token và tenant header; customer request gắn tenant/session headers. BFF sở hữu routing, guards và transport details, giúp frontend không coupling trực tiếp microservice topology.

### 4. How Is the Frontend Organized? [P0]

**Core answer**

> The code is organized by feature rather than one global folder for all hooks or components. Each feature can contain services, query hooks, UI components, types, and tests. Application-level routing and providers stay near the app boundary, while cross-application types, constants, UI primitives, hooks, and utilities live in Nx libraries only when they are genuinely shared.

**Trade-off:** Some older or large feature components still need further decomposition; the structure is a direction, not a claim of perfect consistency.

**Câu hỏi tiếng Việt:** Frontend được tổ chức thế nào?

**Trả lời tiếng Việt**

> Code tổ chức theo feature: service, query hook, component, type và test liên quan đặt cùng nhau. App-level routing/provider ở app boundary; cross-app type, constant, primitive, hook, utility chỉ đưa vào Nx library khi reuse thật. Một số component cũ/lớn vẫn cần decomposition nên không claim consistency hoàn hảo.

### 5. What Is Shared Through the Nx Monorepo? [P0]

**Core answer**

> Shared libraries provide cross-platform TypeScript types, realtime event contracts, domain display mappings, query configuration, UI primitives, hooks, utilities, and mock data. This reduces contract drift between the two frontends and backend. I avoid moving a feature into a shared library simply because two files look similar; the shared contract must be stable and used by multiple consumers.

**Câu hỏi tiếng Việt:** Những gì được share qua Nx monorepo?

**Trả lời tiếng Việt**

> Cross-platform types, realtime event contracts, domain display mappings, query configuration, UI primitives, hooks, utilities và mock data. Điều này giảm contract drift. Tôi không đưa feature vào shared lib chỉ vì hai file nhìn giống nhau; contract phải ổn định và có nhiều consumer.

### 6. How Do You Model Role-Specific Workflows? [P0]

**Core answer**

> Role information comes from the authenticated session and server profile, then route and component policies decide which workflow is available. For example, KDS access differs for kitchen, bar, manager, and owner roles. Client checks improve navigation and hide invalid actions, but the BFF and backend still enforce authorization. UI visibility is not a security boundary.

**Câu hỏi tiếng Việt:** Bạn mô hình hóa role-specific workflows thế nào?

**Trả lời tiếng Việt**

> Role đến từ authenticated session và server profile; route/component policies quyết định workflow hiển thị, như access khác nhau của KDS kitchen, bar, manager, owner. Client checks cải thiện UX, nhưng BFF/backend vẫn enforce authorization; ẩn UI không phải security boundary.

## Next.js Decisions in the Project

### 7. Where Are the Server and Client Component Boundaries? [P0]

**Core answer**

> The public landing page is an async Server Component that fetches public plans and landing information in parallel. Operational route pages are usually thin server wrappers around interactive Client Components such as the live POS table or KDS board. The root provider is a Client Component because it hosts NextAuth session, theme, QueryClient, and auth hydration. The current design favors client interaction for realtime screens but leaves room for deeper server shells.

**Evidence:** [`app/page.tsx`](../../apps/management-app/src/app/page.tsx), [`app/providers.tsx`](../../apps/management-app/src/app/providers.tsx), and [`(pos)/pos/page.tsx`](<../../apps/management-app/src/app/(pos)/pos/page.tsx>).

**Câu hỏi tiếng Việt:** Server và Client Component boundaries nằm ở đâu?

**Trả lời tiếng Việt**

> Public landing là async Server Component fetch plans/platform info song song. Operational pages thường là thin server wrapper quanh Client Component như POS/KDS. Root provider là Client Component vì chứa NextAuth session, theme, QueryClient và auth hydration. Thiết kế hiện tại ưu tiên client interaction cho realtime nhưng vẫn có thể cải thiện server shells.

### 8. Why Are POS and KDS Client-Heavy? [P0]

**Core answer**

> They contain live subscriptions, mutations, timers, keyboard shortcuts, drag-and-drop, selection, filters, and browser interaction. Those responsibilities require Client Components. I would still keep static layout and suitable initial data on the server where it produces a measurable benefit, but forcing the complete operational screen into a server-first model would not remove its interactive client runtime.

**Câu hỏi tiếng Việt:** Vì sao POS và KDS client-heavy?

**Trả lời tiếng Việt**

> Chúng có live subscription, mutation, timer, keyboard shortcut, drag-drop, selection, filter và browser interaction nên cần Client Components. Tôi vẫn giữ static layout và suitable initial data trên server nếu có measurable benefit, nhưng không ép interaction state sang server chỉ để tăng số Server Components.

### 9. How Is the Public Landing Page Optimized? [P1]

**Core answer**

> The landing page fetches plans and platform information in parallel on the server, defines route metadata, and gives each public request a time-based revalidation policy. It also provides semantic main content and a skip link. If an API fails, the current data layer returns safe fallback content or an empty plan list rather than failing the whole page.

**Evidence:** [`landing-api.ts`](../../apps/management-app/src/features/landing/landing-api.ts).

**Câu hỏi tiếng Việt:** Public landing page được tối ưu thế nào?

**Trả lời tiếng Việt**

> Fetch plans và platform info song song trên server, định nghĩa metadata, dùng time-based revalidation, semantic main và skip link. Khi API lỗi, data layer trả fallback an toàn/empty plans thay vì làm fail toàn page.

### 10. Is TanStack Query Server Hydration Implemented? [P0]

**Core answer**

> Not broadly in the current operational routes. QueryClient is created in a client provider, and most feature queries start on the client after auth is ready. I understand how server prefetch, dehydration, and HydrationBoundary can improve suitable read-heavy routes, but I would describe that as a proposed improvement, not an existing implementation.

**Câu hỏi tiếng Việt:** TanStack Query server hydration đã được triển khai chưa?

**Trả lời tiếng Việt**

> Chưa được dùng rộng ở operational routes. QueryClient tạo trong client provider và feature queries chạy phía client sau auth ready. Tôi hiểu server prefetch/dehydrate/HydrationBoundary nhưng sẽ gọi đó là proposed improvement, không phải implementation hiện tại.

## State and Data Flow

### 11. What Owns Server State? [P0]

**Core answer**

> TanStack Query owns remote resources such as menus, tables, orders, bills, KDS queues, and mutations. Query-key factories define identity and allow targeted invalidation. UI selection and filters stay in local state, Context, or focused Zustand stores. This prevents duplicating API data in a generic global store.

**Câu hỏi tiếng Việt:** Thành phần nào sở hữu server state?

**Trả lời tiếng Việt**

> TanStack Query sở hữu menu, table, order, bill, KDS queue và mutations. Query-key factories định nghĩa identity/targeted invalidation. UI selection/filter để local, Context hoặc Zustand; tránh duplicate API data trong generic global store.

### 12. How Are Query Keys Designed? [P0]

**Core answer**

> Query keys are hierarchical. Order keys separate list and detail families; table and menu keys include filters; customer keys include tenant and session; KDS keys include tenant and station. This supports invalidating one detail, all lists, or one scoped queue. Some staff feature keys rely on one active tenant for the lifetime of the authenticated client cache, which is a boundary I would review if tenant switching were introduced.

**Evidence:** [`order-keys.ts`](../../apps/management-app/src/features/order/order-keys.ts), [`table-keys.ts`](../../apps/management-app/src/features/tables/table-keys.ts), and [`order-query-keys.ts`](../../apps/customer-pwa/src/features/order/hooks/order-query-keys.ts).

**Câu hỏi tiếng Việt:** Query keys được thiết kế thế nào?

**Trả lời tiếng Việt**

> Keys phân cấp: order list/detail, table/menu filters, customer tenant/session, KDS tenant/station. Nhờ đó có thể invalidate một detail, mọi list hoặc một queue có scope. Một số staff keys giả định chỉ một active tenant trong authenticated cache lifetime; nếu có tenant switching phải bổ sung scope và clear/isolate cache.

### 13. Why Are Queries Gated by Auth Readiness? [P0]

**Core answer**

> NextAuth first resolves the session, then an auth hydrator writes the access token and profile into the client store. If a query fires before that boundary is ready, it can send a request without authorization and create unnecessary 401 errors. Feature hooks therefore use an `enabled` condition based on the hydrated token.

**Evidence:** [`use-auth-ready.ts`](../../apps/management-app/src/lib/auth/use-auth-ready.ts) and [`auth-session-hydrator.tsx`](../../apps/management-app/src/components/auth/auth-session-hydrator.tsx).

**Câu hỏi tiếng Việt:** Vì sao queries phải đợi auth readiness?

**Trả lời tiếng Việt**

> NextAuth resolve session trước, sau đó hydrator viết token/profile vào client store. Nếu query chạy sớm, request thiếu Authorization và tạo 401 không cần thiết. Feature hooks dùng `enabled` dựa trên hydrated token.

### 14. Why Use Zustand? [P0]

**Core answer**

> Zustand is used for small client-owned state that crosses component boundaries, such as the hydrated staff profile, selected POS order, view filter, or selected table. Components subscribe to focused slices. Remote orders and tables remain in TanStack Query, so the stores do not become a second server-data cache.

**Evidence:** [`auth-store.ts`](../../apps/management-app/src/lib/auth/auth-store.ts) and [`use-order-ui-state.ts`](../../apps/management-app/src/features/order/hooks/use-order-ui-state.ts).

**Câu hỏi tiếng Việt:** Vì sao QRTable dùng Zustand?

**Trả lời tiếng Việt**

> Cho client-owned state nhỏ cần đi qua component boundaries như hydrated profile, selected POS order, view filter hoặc selected table. Component subscribe slice tập trung. Remote orders/tables vẫn ở Query nên store không thành server-data cache thứ hai.

### 15. Why Does the Customer App Use Context for Session State? [P0]

**Core answer**

> The active customer session is scoped to the entire customer application and has a small, cohesive API: start, end, hydrate, and patch tenant lifecycle. Context is sufficient for that ownership boundary. The provider restores validated identifiers from local storage and synchronizes the request client. More frequently changing remote data such as cart and orders stays in TanStack Query.

**Evidence:** [`session-provider.tsx`](../../apps/customer-pwa/src/features/session/context/session-provider.tsx).

**Câu hỏi tiếng Việt:** Vì sao Customer App dùng Context cho session?

**Trả lời tiếng Việt**

> Active customer session có scope toàn app và API nhỏ/cohesive: start, end, hydrate, patch tenant lifecycle. Context đủ cho ownership này. Provider restore identifiers từ local storage và sync request client; cart/order thay đổi thường xuyên vẫn ở Query.

### 16. Explain the Optimistic Cart Update [P0]

**Core answer**

> Before a cart mutation, the hook obtains the current snapshot and includes its version in the request. In `onMutate`, it cancels conflicting reads, snapshots the previous cart, and applies an immutable optimistic patch. On error, it restores the snapshot. A version conflict also invalidates the cart so the authoritative server state is loaded. On success, the returned snapshot replaces the cache.

**Evidence:** [`use-cart-query.ts`](../../apps/customer-pwa/src/features/order/hooks/use-cart-query.ts) and [`cart-optimistic.ts`](../../apps/customer-pwa/src/features/order/hooks/cart-optimistic.ts).

**Câu hỏi tiếng Việt:** Hãy giải thích optimistic cart update

**Trả lời tiếng Việt**

> Trước mutation, hook lấy current snapshot và gửi version. `onMutate` cancel conflicting reads, lưu previous cart và apply immutable optimistic patch. Khi lỗi thì rollback; version conflict còn invalidate để tải server truth. Khi success, response snapshot thay cache.

### 17. Why Use a Cart Version? [P0]

**Core answer**

> A cart version detects that the client mutated an older snapshot after another change occurred. The server can reject the stale expected version instead of silently overwriting newer state. The client then rolls back its optimistic view and refetches. This is optimistic concurrency control; it is different from the visual optimistic update, although they work together.

**Câu hỏi tiếng Việt:** Vì sao cart cần version?

**Trả lời tiếng Việt**

> Version phát hiện client đang mutate snapshot cũ sau khi đã có change khác. Server reject expected version cũ thay vì silently overwrite. Client rollback optimistic view và refetch. Đây là optimistic concurrency control, khác nhưng phối hợp với optimistic UI.

### 18. How Do You Prevent Duplicate Order Submission? [P0]

**Core answer**

> The order submission contract includes an idempotency key. The customer generates and persists a key for the logical operation, and the backend must treat repeated requests with that key as the same operation. The button should also expose pending state, but disabling a button alone cannot protect against retries, refreshes, or network duplication.

**Evidence:** [`idempotency.ts`](../../apps/customer-pwa/src/lib/idempotency.ts) and [`order.service.ts`](../../apps/customer-pwa/src/features/order/services/order.service.ts).

**Câu hỏi tiếng Việt:** Bạn chống duplicate order submission thế nào?

**Trả lời tiếng Việt**

> Contract gửi idempotency key cho logical operation; customer tạo/persist key và backend phải xem repeated requests cùng key là một operation. Pending button hỗ trợ UX nhưng không chống được retry, refresh hay network duplication nếu thiếu backend idempotency.

## Realtime and Consistency

### 19. How Does Realtime Update the UI? [P0]

**Core answer**

> REST snapshots remain authoritative. Socket.io events indicate that a scoped resource changed. The handler validates tenant and, where provided, session or station, then invalidates the relevant cart, order, bill, table, service-request, payment, or KDS key. Active queries refetch and components render the new snapshot. This avoids maintaining a separate event-only store.

**Câu hỏi tiếng Việt:** Realtime cập nhật UI thế nào?

**Trả lời tiếng Việt**

> REST snapshot vẫn authoritative. Socket event báo resource có scope thay đổi; handler validate tenant và session/station khi payload có, rồi invalidate cart/order/bill/table/service/payment/KDS key liên quan. Active query refetch và component render snapshot mới, không cần event-only store riêng.

### 20. Why Invalidate Instead of Patching Every Event? [P0]

**Core answer**

> Many events do not contain the complete canonical resource, and distributed events can be duplicated or missed. Invalidation is safer when the final server state contains calculated or related changes. A direct patch is useful only when the payload contract is complete and ordering is understood. The project favors correctness for operational data.

**Câu hỏi tiếng Việt:** Vì sao invalidate thay vì patch mọi event?

**Trả lời tiếng Việt**

> Nhiều event không chứa full canonical resource và distributed events có thể trùng hoặc bị bỏ lỡ. Invalidation tốn request nhưng khôi phục server truth. Chỉ direct patch khi payload complete, versioned và ordering contract rõ.

### 21. What Happens When the Socket Disconnects? [P0]

**Core answer**

> The hook exposes connected, reconnecting, degraded, and auth-error states for the UI. On connect or reconnect, it invalidates the relevant snapshot because events may have been missed. Customer flows also reconcile on browser online, focus, or visibility recovery. Staff order queries include polling fallback, so the system degrades toward eventual refresh rather than silently freezing.

**Evidence:** [`use-customer-order-realtime.ts`](../../apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts), [`use-staff-order-realtime.ts`](../../apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts), and [`use-order-query.ts`](../../apps/management-app/src/features/order/hooks/use-order-query.ts).

**Câu hỏi tiếng Việt:** Điều gì xảy ra khi socket disconnect?

**Trả lời tiếng Việt**

> Hook expose connected, reconnecting, degraded, auth-error. Khi connect/reconnect, nó invalidate snapshot vì có thể đã miss events. Customer còn reconcile khi online/focus/visibility; staff order có polling fallback nên hệ thống degrade sang eventual refresh thay vì đứng im.

### 22. How Do You Protect Tenant Isolation in Realtime? [P0]

**Core answer**

> The server authenticates the connection and assigns scoped rooms; the client does not treat a room name from the browser as authorization. Client handlers then reject events outside the active tenant and use session or station checks when the payload supports them. Query keys also scope customer and KDS data. The backend remains the final security boundary; client filters are defense in depth and consistency protection.

**Câu hỏi tiếng Việt:** Bạn bảo vệ tenant isolation trong realtime thế nào?

**Trả lời tiếng Việt**

> Server authenticate connection và gán scoped rooms; browser-provided room không phải authorization. Client reject event ngoài active tenant và check session/station khi có, query keys cũng scope data. Backend là security boundary cuối; client filtering là defense in depth.

### 23. How Do You Avoid Socket Memory Leaks? [P0]

**Core answer**

> The effect creates one socket for the active identity and registers named handlers. Its cleanup removes every socket and manager listener, disconnects the socket, and the dependency list recreates the connection only when relevant scope or credentials change. I test mount and unmount behavior because duplicate listeners can look like duplicated backend events.

**Câu hỏi tiếng Việt:** Bạn tránh socket memory leak thế nào?

**Trả lời tiếng Việt**

> Effect tạo một socket theo active identity và đăng ký named handlers. Cleanup remove toàn bộ socket/manager listeners, disconnect; dependency chỉ recreate khi scope/credential liên quan đổi. Cần test mount/unmount vì duplicate listener có thể trông như backend emit trùng.

## KDS, Tables, and Operational UI

### 24. How Does the KDS Frontend Work? [P0]

**Core answer**

> KDS loads an authoritative queue snapshot keyed by tenant and preparation station. Socket events for queue changes, ready items, or SLA warnings invalidate only the matching station queue. The board adapter exposes one interface for live and mock modes while following the Rules of Hooks. Mutations such as start, done, recall, and priority include request IDs and refresh the queue after success.

**Evidence:** [`use-kds-queue.ts`](../../apps/management-app/src/features/kds/hooks/use-kds-queue.ts), [`use-kds-realtime.ts`](../../apps/management-app/src/features/kds/hooks/use-kds-realtime.ts), and [`use-kds-board-adapter.ts`](../../apps/management-app/src/features/kds/hooks/use-kds-board-adapter.ts).

**Câu hỏi tiếng Việt:** KDS frontend hoạt động thế nào?

**Trả lời tiếng Việt**

> KDS tải authoritative queue snapshot theo tenant và preparation station. Socket events cho queue change, ready item, SLA warning invalidate đúng station. Board adapter cho một interface live/mock; mutation start/done/recall/priority có request IDs và refresh queue sau success.

### 25. Why Use an Adapter for Mock and Live KDS? [P1]

**Core answer**

> The UI should depend on one board contract instead of branching throughout the component. Both hook layers are called consistently to respect the Rules of Hooks, while the live layer is disabled in mock mode and the adapter selects the returned implementation. This supports development and demonstration without duplicating the entire KDS UI.

**Câu hỏi tiếng Việt:** Vì sao dùng adapter cho mock và live KDS?

**Trả lời tiếng Việt**

> UI phụ thuộc một board contract thay vì branching khắp component. Cả hai hook layers được gọi nhất quán theo Rules of Hooks, live layer disable trong mock và adapter chọn implementation trả về. Nhờ đó demo/dev không duplicate toàn KDS UI.

### 26. How Is TanStack Table Used? [P0]

**Core answer**

> Management tables define typed column data and use TanStack Table as a headless engine. CRUD tables use controlled sorting, filtering, visibility, faceting, and client pagination for currently loaded datasets. The live POS table uses typed columns and a core row model, while domain actions and badges remain feature components. This keeps table mechanics separate from domain meaning.

**Evidence:** [`tables-table.tsx`](../../apps/management-app/src/features/tables/components/tables-table.tsx) and [`live-orders-table.tsx`](../../apps/management-app/src/features/pos/components/live-orders-table.tsx).

**Câu hỏi tiếng Việt:** TanStack Table được dùng thế nào?

**Trả lời tiếng Việt**

> Management tables có typed columns và dùng TanStack Table làm headless engine. CRUD tables control sort/filter/visibility/faceting/client pagination; live POS dùng core row model, domain actions/badges vẫn là feature components. Table mechanics tách khỏi domain meaning.

### 27. Why Virtualize Only Above 50 Rows? [P0]

**Core answer**

> Virtualization has its own complexity for measurement, semantics, and animation. For a small live list, normal rows are simpler and may provide a better interaction. The POS table enables TanStack Virtual only above 50 rows, estimates row size, and uses overscan. The exact threshold is a heuristic and should be validated with profiling on target hardware.

**Câu hỏi tiếng Việt:** Vì sao chỉ virtualize khi trên 50 rows?

**Trả lời tiếng Việt**

> Virtualization thêm complexity về measurement, semantics và animation. Với list nhỏ, normal rows đơn giản hơn. POS bật TanStack Virtual trên 50 rows với estimate size/overscan. Threshold là heuristic cần validate bằng profiling trên target hardware.

### 28. How Are Domain Statuses Displayed? [P1]

**Core answer**

> APIs return stable English wire enums, but the Vietnamese product UI maps them through shared domain label functions and feature badges. The frontend does not render raw statuses such as `PENDING` or `ACTIVE`. This separates transport contracts from localized presentation and keeps wording consistent across screens.

**Câu hỏi tiếng Việt:** Domain statuses được hiển thị thế nào?

**Trả lời tiếng Việt**

> API trả English wire enums ổn định, UI tiếng Việt map qua shared label functions và feature badges, không render raw `PENDING`/`ACTIVE`. Điều này tách transport contract khỏi localized presentation và giữ wording nhất quán.

## Authentication, Sessions, and Failure States

### 29. Explain Staff Authentication [P0]

**Core answer**

> The Management App uses NextAuth with Keycloak and a JWT session strategy. Server callbacks process the access and refresh tokens and enrich the session with user, role, tenant, and permission information. A client hydrator obtains the safe current profile and writes the active access token and identity into a focused store for existing BFF calls. The BFF and services still verify and authorize requests.

**Evidence:** [`auth.ts`](../../apps/management-app/src/auth.ts) and [`auth-session-hydrator.tsx`](../../apps/management-app/src/components/auth/auth-session-hydrator.tsx).

**Câu hỏi tiếng Việt:** Hãy giải thích staff authentication

**Trả lời tiếng Việt**

> Management App dùng NextAuth với Keycloak và JWT session strategy. Server callbacks xử lý access/refresh token, enrich session với user/role/tenant/permission. Client hydrator lấy profile và ghi token/identity vào store cho BFF calls. BFF/services vẫn verify và authorize.

### 30. Is Storing the Staff Access Token in Client State Ideal? [P1]

**Core answer**

> It matches the current browser-to-BFF bearer-token design, but it increases the importance of XSS prevention because client JavaScript can access the token. A stronger BFF-session design could keep credentials in HttpOnly cookies and have the server attach downstream authorization. I would evaluate that migration against the current Keycloak, WebSocket, and deployment constraints rather than describing the present design as risk-free.

**Câu hỏi tiếng Việt:** Lưu staff access token trong client state có lý tưởng không?

**Trả lời tiếng Việt**

> Nó phù hợp bearer-token design hiện tại nhưng tăng tác động XSS vì JavaScript đọc được token. BFF-session design với HttpOnly cookie có thể mạnh hơn, server attach downstream authorization. Cần đánh giá migration theo Keycloak, WebSocket và deployment constraints; không mô tả hiện tại là risk-free.

### 31. How Does the Customer Session Expire? [P0]

**Core answer**

> The customer request client attaches the active session and tenant identifiers. If the API returns the closed-session signal, it clears matching in-memory and local storage state and emits a browser event. The Session Provider receives that event and resets its state, so protected customer routes return to the landing flow instead of repeatedly sending a dead session.

**Câu hỏi tiếng Việt:** Customer session hết hạn thế nào?

**Trả lời tiếng Việt**

> Request client gắn session/tenant IDs. Nếu API trả closed-session signal, nó xóa đúng in-memory/local-storage state và emit browser event. Session Provider reset state, protected routes về landing thay vì tiếp tục gửi dead session.

### 32. How Are Loading and Error States Handled? [P0]

**Core answer**

> Feature components explicitly handle auth hydration, loading, empty, error, permission, disconnected, and retry states. For example, the menu prevents ordering during payment lock or tenant suspension, and KDS distinguishes missing identity, queue loading, queue error, and degraded realtime. A current gap is limited route-level `loading`, `error`, and `not-found` boundaries in the Next.js app.

**Câu hỏi tiếng Việt:** Loading và error states được xử lý thế nào?

**Trả lời tiếng Việt**

> Feature components xử lý auth hydration, loading, empty, error, permission, disconnected và retry. Menu khóa ordering khi payment/tenant suspended; KDS phân biệt missing identity, queue loading/error, degraded realtime. Gap hiện tại là thiếu route-level `loading/error/not-found` ở nhiều route.

## Testing, Limitations, and Improvements

### 33. How Is the Frontend Tested? [P0]

**Core answer**

> The repository has unit and integration-style component or hook tests using isolated query clients and mocked API boundaries. Important examples cover cart optimistic logic, session hydration, realtime event filtering, KDS behavior, role policies, payment flows, tables, services, and shared contract mappings. At the current audit point, there are 37 Management App spec files and 15 Customer App spec files. Test count is evidence of coverage areas, not proof of complete quality.

**Câu hỏi tiếng Việt:** Frontend được test thế nào?

**Trả lời tiếng Việt**

> Repo có unit và integration-style tests cho component/hook với isolated QueryClient và mocked API boundary. Các vùng quan trọng gồm optimistic cart, session hydration, realtime filtering, KDS, role policy, payment, table, service và shared contract. Có 37 Management specs và 15 Customer specs tại thời điểm audit, nhưng số lượng không chứng minh coverage hoàn hảo.

### 34. Is the Customer App a Complete PWA? [P0]

**Core answer**

> It is a mobile-first customer web application and the project name uses PWA, but the current repository does not show a complete manifest, service worker, offline cache strategy, or install prompt. I would not claim verified installability or offline ordering. Before adding them, I would define which data can safely be cached and how stale menus, carts, and payment state behave offline.

**Câu hỏi tiếng Việt:** Customer App có phải PWA hoàn chỉnh không?

**Trả lời tiếng Việt**

> Đây là mobile-first web app và tên project dùng PWA, nhưng repo hiện không cho thấy manifest, service worker, offline cache strategy hoặc install prompt hoàn chỉnh. Tôi không claim installability/offline ordering. Trước khi thêm phải định nghĩa stale menu, cart, payment và offline write behavior.

### 35. What Frontend Decision Would You Improve Today? [P0]

**Core answer**

> I would improve the Next.js operational boundaries incrementally. I would add route-level loading and error behavior, measure the client bundle and rendering cost of large POS and KDS features, and test selective server prefetch with Query hydration on read-heavy pages. I would also split oversized components and define a clearer PWA decision. I would not start with a rewrite because the current realtime client architecture solves real interaction requirements.

**Câu hỏi tiếng Việt:** Bạn sẽ cải thiện quyết định frontend nào hôm nay?

**Trả lời tiếng Việt**

> Tôi cải thiện Next.js operational boundaries từng bước: route-level loading/error, đo client bundle/render của POS/KDS, thử selective server prefetch/Query hydration cho read-heavy pages, chia component lớn và quyết định PWA rõ hơn. Không rewrite vì realtime client architecture đang giải quyết nhu cầu thật.

### 36. What Is the Biggest Frontend Risk? [P1]

**Core answer**

> The biggest risk is inconsistent state across REST responses, realtime events, optimistic interactions, and user roles. A visually correct screen can still show stale or cross-scoped data. The mitigation is explicit query identity, scoped events, authoritative refetch, server-enforced authorization, versioned important writes, and tests around recovery paths.

**Câu hỏi tiếng Việt:** Rủi ro frontend lớn nhất là gì?

**Trả lời tiếng Việt**

> Inconsistent state giữa REST, realtime events, optimistic interactions và roles. UI có thể đẹp nhưng stale hoặc cross-scoped. Giảm rủi ro bằng query identity rõ, scoped events, authoritative refetch, server authorization, versioned writes và recovery tests.

### 37. What Did the Backend Architecture Teach You About Frontend? [P0]

**Core answer**

> It taught me that the frontend must model uncertainty. A command can succeed before every downstream view is updated, events can be delayed, and different services own different data. The UI therefore needs explicit pending states, idempotent actions, stable contracts, and reconciliation. This system awareness helps me build a frontend that behaves correctly beyond the happy path.

**Câu hỏi tiếng Việt:** Backend architecture đã dạy bạn điều gì về frontend?

**Trả lời tiếng Việt**

> Frontend phải mô hình hóa uncertainty: command có thể success trước downstream update, event có thể trễ và services sở hữu data khác nhau. UI cần pending states, idempotent actions, stable contracts và reconciliation. System awareness giúp frontend đúng ngoài happy path.

## Personal Contribution Guardrail / Ranh Giới Đóng Góp Cá Nhân

Before the interview, mark each feature as one of:

- **Implemented directly:** Quân wrote and can navigate the code.
- **Designed together:** both thesis members agreed on the approach.
- **Reviewed or integrated:** teammate wrote the main implementation; Quân understands the contract.
- **Proposed improvement:** not present in current code.

If asked “Did you build this?”, use:

> This was a two-person project. I directly worked on […], and we designed […] together. The current code for […] was mainly implemented by my teammate, but I integrated or reviewed the contract and can explain how it fits the system.

Never convert repository evidence into personal authorship without confirming it.

## Code Evidence Index / Mục Lục Bằng Chứng

| Topic                    | Current evidence                                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root providers           | [`providers.tsx`](../../apps/management-app/src/app/providers.tsx)                                                                                                                     |
| Public server rendering  | [`app/page.tsx`](../../apps/management-app/src/app/page.tsx), [`landing-api.ts`](../../apps/management-app/src/features/landing/landing-api.ts)                                        |
| Staff Query lifecycle    | [`use-order-query.ts`](../../apps/management-app/src/features/order/hooks/use-order-query.ts)                                                                                          |
| Customer optimistic cart | [`use-cart-query.ts`](../../apps/customer-pwa/src/features/order/hooks/use-cart-query.ts), [`cart-optimistic.ts`](../../apps/customer-pwa/src/features/order/hooks/cart-optimistic.ts) |
| Customer session         | [`session-provider.tsx`](../../apps/customer-pwa/src/features/session/context/session-provider.tsx)                                                                                    |
| Staff auth               | [`auth.ts`](../../apps/management-app/src/auth.ts), [`auth-session-hydrator.tsx`](../../apps/management-app/src/components/auth/auth-session-hydrator.tsx)                             |
| Staff realtime           | [`use-staff-order-realtime.ts`](../../apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts)                                                                        |
| Customer realtime        | [`use-customer-order-realtime.ts`](../../apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts)                                                                    |
| KDS realtime             | [`use-kds-realtime.ts`](../../apps/management-app/src/features/kds/hooks/use-kds-realtime.ts)                                                                                          |
| KDS adapter              | [`use-kds-board-adapter.ts`](../../apps/management-app/src/features/kds/hooks/use-kds-board-adapter.ts)                                                                                |
| Table engine             | [`tables-table.tsx`](../../apps/management-app/src/features/tables/components/tables-table.tsx)                                                                                        |
| POS virtualization       | [`live-orders-table.tsx`](../../apps/management-app/src/features/pos/components/live-orders-table.tsx)                                                                                 |
| Customer API scope       | [`api-client.ts`](../../apps/customer-pwa/src/lib/api-client.ts)                                                                                                                       |
| Staff API scope          | [`authenticated-client.ts`](../../apps/management-app/src/lib/api/authenticated-client.ts)                                                                                             |
