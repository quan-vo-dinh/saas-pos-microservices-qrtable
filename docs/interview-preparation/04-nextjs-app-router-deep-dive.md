# Next.js App Router Deep Dive / Chuyên Sâu Next.js App Router

> QRTable Management App currently uses Next.js 16.1.x without enabling Cache Components. Distinguish general Next.js capability from the current project implementation.

## 1. What Is the App Router? [P0]

**Core answer**

> The App Router is Next.js’s file-system router built around React Server Components, nested layouts, loading and error boundaries, streaming, and server-side data access. Folders define route segments while special files such as `page`, `layout`, `loading`, `error`, and `route` define behavior. The main architecture decision is not the folder syntax; it is where server and client responsibilities belong.

**Câu hỏi tiếng Việt:** App Router là gì?

**Trả lời tiếng Việt**

> App Router là file-system router của Next.js dựa trên React Server Components, nested layouts, loading/error boundaries, streaming và server-side data access. Folder tạo route segment; các file `page`, `layout`, `loading`, `error`, `route` định nghĩa behavior. Quyết định chính là đặt server/client responsibilities ở đâu.

## 2. Server Components Versus Client Components [P0]

**Core answer**

> Server Components execute on the server and can access server-side data without adding their component code to the client bundle. Client Components are required for state, effects, browser APIs, event handlers, and client-only libraries. I keep the client boundary as small as practical and compose interactive client leaves inside server-rendered structure.

**Tiếng Việt:** Không nói Server Component “an toàn tự động”; vẫn phải kiểm soát authorization và dữ liệu trả về client.

**Câu hỏi tiếng Việt:** Server Components và Client Components khác nhau thế nào?

**Trả lời tiếng Việt**

> Server Components chạy trên server, truy cập server data và không đưa component code của chúng vào client bundle. Client Components cần cho state, effect, browser API, event handler và client-only library. Tôi giữ client boundary nhỏ và compose interactive leaves trong server structure.

## 3. What Does `'use client'` Mean? [P0]

**Core answer**

> `'use client'` marks a module as a client entry boundary. Its imports and transitive client dependencies become part of the client module graph. It does not mean that the component can never be pre-rendered to HTML, and it does not need to appear in every descendant file. Because the boundary can expand the bundle, I place it close to the interactive feature.

**Câu hỏi tiếng Việt:** `'use client'` có nghĩa gì?

**Trả lời tiếng Việt**

> `'use client'` đánh dấu module là client entry boundary; imports và transitive client dependencies đi vào client graph. Nó không có nghĩa component không thể được pre-render HTML và không cần ghi lại ở mọi descendant. Boundary càng cao có thể tăng bundle.

## 4. Can a Server Component Render a Client Component? [P0]

**Core answer**

> Yes. A Server Component can render a Client Component and pass serializable props to it. Server-rendered content can also be composed into a Client Component through props such as `children`. However, a Client Component cannot directly import a Server Component as a normal client dependency.

**Câu hỏi tiếng Việt:** Server Component có render Client Component được không?

**Trả lời tiếng Việt**

> Có. Server Component có thể render Client Component và truyền serializable props. Server-rendered content cũng có thể được compose qua `children`. Nhưng Client Component không thể import trực tiếp Server Component như normal client dependency.

## 5. Why Must Props Crossing the Boundary Be Serializable? [P0]

**Core answer**

> Values crossing from server execution to the client must be represented in the React transport payload. Functions, open database connections, and most class instances cannot cross as ordinary props. I pass plain data and keep server-only capabilities behind server functions, Route Handlers, or approved server actions.

**Câu hỏi tiếng Việt:** Vì sao props qua server–client boundary phải serializable?

**Trả lời tiếng Việt**

> Giá trị qua React transport phải biểu diễn được trong payload. Function, open DB connection và đa số class instance không thể truyền như props thường. Tôi truyền plain data và giữ server capabilities sau server function, Route Handler hoặc server action phù hợp.

## 6. How Do You Choose a Server/Client Boundary? [P0]

**Core answer**

> I start server-first for data access, security-sensitive work, static structure, and bundle reduction. I introduce a client boundary at the smallest area that needs interaction, browser state, effects, or a client library. Then I check whether the boundary causes a large subtree or provider to move client-side. The goal is not zero Client Components; it is intentional ownership.

**Câu hỏi tiếng Việt:** Bạn chọn Server/Client boundary thế nào?

**Trả lời tiếng Việt**

> Tôi bắt đầu server-first cho data access, security-sensitive work, static structure và giảm bundle. Tôi mở client boundary tại vùng nhỏ nhất cần interaction, browser state, effect hoặc client library, rồi kiểm tra boundary có kéo subtree/provider quá lớn sang client graph không.

## 7. SSR, SSG, ISR, and CSR [P0]

**Core answer**

> SSR produces route output on the server for a request. Static generation produces reusable output ahead of or independently from each request. Revalidation refreshes cached output or data after a policy interval or explicit invalidation. CSR fetches and renders data after client JavaScript runs. In the App Router these ideas can be mixed within a route, so I describe the actual data and cache behavior instead of forcing the whole page into one label.

**Câu hỏi tiếng Việt:** SSR, SSG, ISR và CSR khác nhau thế nào?

**Trả lời tiếng Việt**

> SSR tạo output server theo request; static generation tạo output có thể reuse; revalidation refresh cached output/data theo policy; CSR fetch/render sau khi client JavaScript chạy. App Router có thể trộn chúng trong một route nên phải mô tả behavior thực tế từng data segment.

## 8. What Is Streaming? [P0]

**Core answer**

> Streaming allows the server to send ready parts of the UI before every asynchronous dependency finishes. Suspense boundaries define meaningful fallbacks and reveal units. It improves perceived performance when slow regions are independent, but too many small boundaries can cause visual instability or a fragmented experience.

**Câu hỏi tiếng Việt:** Streaming là gì?

**Trả lời tiếng Việt**

> Streaming cho server gửi phần UI đã sẵn sàng trước khi mọi dependency hoàn tất. Suspense boundary định nghĩa fallback và reveal unit. Nó cải thiện perceived performance cho vùng độc lập, nhưng quá nhiều boundary nhỏ có thể gây visual instability.

## 9. What Is Hydration? [P0]

**Core answer**

> Hydration is the process where React attaches client behavior to server-generated HTML and reconciles it with the client’s first render. A hydration mismatch occurs when the initial client output differs from the server HTML. Common causes include browser-only values during render, current time, random values, locale differences, invalid HTML, or data that changes between server render and hydration.

**Câu hỏi tiếng Việt:** Hydration là gì?

**Trả lời tiếng Việt**

> Hydration là quá trình React gắn client behavior vào HTML do server tạo và reconcile với first client render. Mismatch xảy ra khi hai output ban đầu khác nhau, thường do browser-only value, time, random, locale, invalid HTML hoặc data đổi giữa hai thời điểm.

## 10. How Do You Fix a Hydration Mismatch? [P0]

**Core answer**

> I reproduce the exact mismatch and identify the first differing node. Then I make the initial render deterministic, move browser-only work to an effect or client-only boundary, pass a stable server value, or fix invalid markup. I use suppression only for a deliberate unavoidable difference, not as a general way to hide the warning.

**Câu hỏi tiếng Việt:** Bạn sửa hydration mismatch thế nào?

**Trả lời tiếng Việt**

> Tôi reproduce và tìm node khác đầu tiên, sau đó làm initial render deterministic, chuyển browser-only work sang effect/client-only boundary, truyền stable server value hoặc sửa markup. Chỉ suppress khi difference thật sự deliberate và không tránh được.

## 11. How Does Caching Work in the Current QRTable Next.js Version? [P0]

**Core answer**

> Caching depends on the Next.js mode and version. QRTable uses Next.js 16 without Cache Components enabled, so I reason with the previous caching model. In that model, `fetch` is not cached by default; a request can opt into data caching with options such as `cache: 'force-cache'` or a revalidation policy. I avoid memorizing one universal rule and verify route and data behavior against the project configuration.

**QRTable evidence:** Public landing fetches opt into revalidation intervals; operational authenticated screens are mostly client-driven.

**Câu hỏi tiếng Việt:** Caching hoạt động thế nào trong version Next.js hiện tại của QRTable?

**Trả lời tiếng Việt**

> Caching phụ thuộc version/mode. QRTable dùng Next.js 16 nhưng không bật Cache Components, nên theo previous caching model: `fetch` không cache mặc định và có thể opt-in bằng `cache: 'force-cache'` hoặc revalidation policy. Tôi luôn kiểm tra config thay vì học một rule universal.

## 12. What Are Cache Components? [P1]

**Core answer**

> Cache Components are an opt-in Next.js model that uses features such as the `use cache` directive and Partial Prerendering to combine static shells, cached work, and request-time content. QRTable does not currently enable that mode, so I can explain it as a framework capability but would not claim it as implemented.

**Câu hỏi tiếng Việt:** Cache Components là gì?

**Trả lời tiếng Việt**

> Đây là mô hình opt-in của Next.js dùng `use cache` và Partial Prerendering để kết hợp static shell, cached work và request-time content. QRTable chưa bật nên tôi chỉ claim hiểu capability, không claim đã implement.

## 13. What Is Revalidation? [P0]

**Core answer**

> Revalidation refreshes cached data or output after it becomes stale or after an explicit invalidation. Time-based revalidation fits data that can be slightly stale. On-demand invalidation fits mutations or external events where a specific tag or path is known. The policy should match business freshness rather than use one interval everywhere.

**Câu hỏi tiếng Việt:** Revalidation là gì?

**Trả lời tiếng Việt**

> Revalidation refresh cached data/output sau khi stale hoặc explicit invalidation. Time-based phù hợp data chịu được trễ; on-demand phù hợp mutation/event biết tag/path. Policy phải theo business freshness.

## 14. Layout Versus Template [P1]

**Core answer**

> A layout wraps route segments and normally preserves its instance and state across navigation within that boundary. A template has similar nesting but creates a new instance on navigation, so child client state and effects reset. I use a layout for persistent navigation or providers and a template only when remounting is intentional.

**Câu hỏi tiếng Việt:** Layout và template khác nhau thế nào?

**Trả lời tiếng Việt**

> Layout wrap route segments và thường giữ instance/state qua navigation trong boundary. Template có nesting tương tự nhưng tạo instance mới nên reset client state/effects. Dùng template khi remount là chủ ý.

## 15. What Are Route Groups? [P0]

**Core answer**

> Parentheses create route groups that organize segments without adding the group name to the URL. They are useful for separate layouts or product areas. QRTable uses groups such as auth, dashboard, POS, KDS, and admin to express different interface shells and responsibilities.

**Câu hỏi tiếng Việt:** Route groups là gì?

**Trả lời tiếng Việt**

> Folder trong ngoặc đơn tổ chức segments mà không thêm tên group vào URL, hữu ích cho layout/product area khác nhau. QRTable dùng groups cho auth, dashboard, POS, KDS và admin.

## 16. `loading.tsx`, `error.tsx`, and `not-found.tsx` [P0]

**Core answer**

> `loading` provides a route-segment Suspense fallback, `error` provides a client error boundary with a reset path, and `not-found` renders the not-found experience for a segment. They turn failure and waiting into architectural states rather than scattered conditions. QRTable currently has component-level loading and error handling but limited route-level special files, which is an improvement opportunity.

**Câu hỏi tiếng Việt:** `loading.tsx`, `error.tsx`, `not-found.tsx` dùng để làm gì?

**Trả lời tiếng Việt**

> `loading` cung cấp Suspense fallback theo segment, `error` tạo client error boundary có reset, `not-found` hiển thị trạng thái không tìm thấy. QRTable có feature-level states nhưng route-level special files còn hạn chế.

## 17. Route Handlers Versus Server Components [P0]

**Core answer**

> A Server Component can read data directly for rendering and does not need to call an internal HTTP endpoint merely to reach the same server. A Route Handler exposes an HTTP boundary and is appropriate for external clients, webhooks, callbacks, downloads, or client-side requests. I avoid unnecessary server-to-self HTTP calls because they add latency and duplicate contracts.

**Câu hỏi tiếng Việt:** Route Handler và Server Component khác nhau thế nào?

**Trả lời tiếng Việt**

> Server Component có thể đọc data trực tiếp để render, không cần gọi HTTP nội bộ đến chính server. Route Handler tạo HTTP boundary cho external client, webhook, callback, download hoặc client-side request. Tránh server tự gọi chính nó nếu không cần.

## 18. Server Actions: When Would You Use Them? [P1]

**Core answer**

> A Server Action can execute a server-side mutation from a React form or client interaction. It can simplify form-oriented workflows and integrate with revalidation. I still treat it as a public mutation boundary: validate input, authenticate, authorize, handle idempotency where needed, and return safe errors. For QRTable’s existing BFF and realtime contracts, I would adopt actions selectively rather than rewrite every mutation.

**Câu hỏi tiếng Việt:** Khi nào dùng Server Actions?

**Trả lời tiếng Việt**

> Server Action thực thi mutation server từ form/client interaction và có thể đơn giản form workflow, revalidation. Nhưng vẫn phải validate, authenticate, authorize và idempotency khi cần. Với QRTable có BFF/realtime contracts, tôi chỉ áp dụng chọn lọc.

## 19. How Do You Handle Authentication in the App Router? [P0]

**Core answer**

> Authentication determines identity; authorization determines whether that identity may perform an action. I enforce security on the server or BFF boundary, not only by hiding client elements. Server-rendered routes can read a server session for early decisions, while client state can improve navigation and UX. Sensitive tokens should not be exposed to client JavaScript when an HttpOnly session flow is available.

**Câu hỏi tiếng Việt:** Bạn xử lý authentication trong App Router thế nào?

**Trả lời tiếng Việt**

> Authentication xác định identity; authorization xác định quyền. Security enforce ở server/BFF, không chỉ ẩn UI. Server routes có thể đọc session sớm; client state hỗ trợ UX. Sensitive token không nên expose cho JavaScript nếu HttpOnly session đáp ứng được.

## 20. Middleware: What Is It Good For? [P1]

**Core answer**

> Middleware is useful for lightweight request-time routing concerns such as redirects, locale selection, or coarse access checks before a route runs. It should not become the only authorization layer or a place for heavy business logic. The final data or mutation boundary must still enforce access.

**Câu hỏi tiếng Việt:** Middleware phù hợp cho việc gì?

**Trả lời tiếng Việt**

> Middleware phù hợp lightweight request routing như redirect, locale hoặc coarse access check. Không nên là authorization layer duy nhất hay nơi chứa heavy business logic; data/mutation boundary cuối vẫn enforce quyền.

## 21. How Do You Avoid Data-Fetching Waterfalls? [P0]

**Core answer**

> I identify independent data requirements and start them in parallel, move fetching to the server when it reduces client round trips, and use Suspense boundaries where independent content can stream. On the client, I avoid mounting a chain of queries whose keys could have been known earlier. I also measure, because a parallel request set can still overload an endpoint or fetch unused data.

**Câu hỏi tiếng Việt:** Bạn tránh data-fetching waterfall thế nào?

**Trả lời tiếng Việt**

> Xác định data độc lập và khởi chạy song song, chuyển fetch lên server khi giảm client round trips, dùng Suspense cho content độc lập. Phía client tránh query chain khi key đã biết sớm, đồng thời đo để không parallel-fetch quá nhiều data không dùng.

## 22. How Would You Combine Next.js with TanStack Query? [P0]

**Core answer**

> I use Server Components for server-owned initial data when that benefits first render, and TanStack Query for client lifecycle such as background refetching, mutations, optimistic updates, and realtime invalidation. If I prefetch on the server, I dehydrate only safe query data and hydrate it at a deliberate client boundary. I also align `staleTime` with the server fetch so the client does not immediately refetch the same data.

**QRTable truth:** This is a design Quân understands; the current operational screens do not broadly implement server-side Query dehydration.

**Câu hỏi tiếng Việt:** Kết hợp Next.js với TanStack Query thế nào?

**Trả lời tiếng Việt**

> Dùng Server Components cho initial server-owned data khi có lợi cho first render; Query quản lý background refetch, mutation, optimistic update và realtime invalidation. Nếu server prefetch thì chỉ dehydrate safe data và align `staleTime` để tránh refetch ngay. QRTable chưa dùng rộng pattern này.

## 23. How Do You Reduce the Client Bundle? [P0]

**Core answer**

> I keep server-capable components outside client boundaries, import packages from focused entry points, dynamically load genuinely optional heavy interactions, remove unused dependencies, and inspect bundle output rather than guessing. I also avoid putting a global client provider above content that does not need it. Bundle size matters together with execution and hydration cost.

**Câu hỏi tiếng Việt:** Bạn giảm client bundle thế nào?

**Trả lời tiếng Việt**

> Giữ server-capable component ngoài client boundary, import package entry nhỏ, dynamic-load interaction tùy chọn, xóa dependency không dùng và đo bundle output. Không đặt global client provider cao hơn mức cần thiết; xem cả execution/hydration cost, không chỉ bytes.

## 24. How Do You Handle SEO and Metadata? [P1]

**Core answer**

> Public routes should provide meaningful titles, descriptions, canonical information where needed, semantic headings, and server-readable content. The App Router supports static or generated metadata. Authenticated POS screens are not SEO targets, so there I prioritize performance, accessibility, and correct access behavior rather than public indexing.

**Câu hỏi tiếng Việt:** Bạn xử lý SEO và metadata thế nào?

**Trả lời tiếng Việt**

> Public route cần title, description, canonical khi cần, semantic headings và server-readable content; App Router hỗ trợ static/generated metadata. POS authenticated không phải SEO target nên ưu tiên performance, accessibility và access correctness.

## 25. How Do You Protect Server-Only Code? [P0]

**Core answer**

> I keep secrets and privileged clients in server-only modules, avoid passing sensitive values through props, validate every server mutation, and prevent server-only modules from entering the client graph. I do not rely on a hidden button for authorization. I also review environment variable exposure because only explicitly public variables should reach the browser.

**Câu hỏi tiếng Việt:** Bạn bảo vệ server-only code thế nào?

**Trả lời tiếng Việt**

> Giữ secret và privileged client trong server-only modules, không truyền sensitive value qua props, validate mọi server mutation và ngăn server module vào client graph. Hidden button không phải authorization. Chỉ biến môi trường public rõ ràng mới được đến browser.

## 26. Why Can a Provider Make Too Much of the App Client-Side? [P1]

**Core answer**

> A provider is a Client Component, so where it is placed defines a client boundary for its imported client subtree and serialized interface. I put providers as deep as practical and separate concerns when only one product area needs them. However, a client provider can still receive server-rendered children, so I reason about the actual module graph rather than assuming the entire document becomes client-rendered.

**Câu hỏi tiếng Việt:** Vì sao provider có thể làm quá nhiều phần app phụ thuộc client runtime?

**Trả lời tiếng Việt**

> Provider là Client Component nên vị trí của nó ảnh hưởng client graph/imports và serialized interface. Tôi đặt provider đủ sâu và tách concern khi chỉ một product area cần. Client provider vẫn có thể nhận server-rendered children nên phải reasoning module graph thực, không kết luận cả document thành CSR.

## 27. How Would You Improve QRTable’s App Router Usage? [P0]

**Core answer**

> I would first measure the operational routes instead of rewriting them. Likely improvements are route-level loading and error boundaries, clearer server shells around client-heavy features, selective server prefetch and Query hydration for suitable read-heavy pages, and bundle analysis for large POS or KDS features. Realtime screens will still require substantial client logic, so the goal is a better boundary, not forcing everything onto the server.

**Câu hỏi tiếng Việt:** Bạn sẽ cải thiện cách QRTable dùng App Router thế nào?

**Trả lời tiếng Việt**

> Tôi đo operational routes trước, rồi thêm route-level loading/error, server shell rõ hơn quanh client-heavy features, selective server prefetch/Query hydration cho read-heavy pages và bundle analysis cho POS/KDS. Realtime screen vẫn cần client logic; mục tiêu là boundary tốt hơn, không ép mọi thứ lên server.

## React and Next.js Comparison / So Sánh React và Next.js

### 28. What Is the Difference Between React and Next.js? [P0]

**English answer**

> React is a library for building component-based user interfaces. It provides the component, state, and rendering model, but it does not prescribe a complete application architecture. Next.js is a React framework that adds routing, server rendering, Server Components, data and cache conventions, backend endpoints, asset optimization, and production build behavior. Next.js uses React; it does not replace React fundamentals.

**Câu hỏi tiếng Việt:** React và Next.js khác nhau như thế nào?

**Trả lời tiếng Việt**

> React là thư viện xây dựng giao diện theo component, cung cấp mô hình component, state và rendering nhưng không quy định toàn bộ kiến trúc ứng dụng. Next.js là framework dựa trên React, bổ sung routing, server rendering, Server Components, quy ước data/cache, backend endpoints, tối ưu asset và production build. Next.js sử dụng React chứ không thay thế kiến thức React.

### 29. Why Is React Called a Library and Next.js a Framework? [P0]

**English answer**

> React focuses on the UI layer and lets the application choose routing, build tooling, rendering, and server architecture. Next.js provides an opinionated application runtime and file conventions, so the framework controls more of the execution flow and the developer fills defined extension points. The distinction is useful, but the practical question is which responsibilities the tool provides.

**Câu hỏi tiếng Việt:** Vì sao React được gọi là library còn Next.js là framework?

**Trả lời tiếng Việt**

> React tập trung vào UI layer và để ứng dụng tự chọn router, build tool, rendering và server architecture. Next.js cung cấp runtime cùng file conventions có định hướng, nên framework kiểm soát nhiều phần của execution flow hơn và developer làm việc trong các extension points đã định nghĩa.

### 30. Can You Use React Without Next.js, and Next.js Without React? [P0]

**English answer**

> React can be used without Next.js through tools such as Vite or another framework. Next.js, however, is built on React, so its component model and rendering behavior still depend on React. A Next.js developer must understand React state, rendering, effects, composition, and performance rather than learning only Next.js file conventions.

**Câu hỏi tiếng Việt:** Có thể dùng React không cần Next.js, và dùng Next.js không cần React không?

**Trả lời tiếng Việt**

> Có thể dùng React mà không cần Next.js, chẳng hạn với Vite hoặc framework khác. Nhưng Next.js được xây trên React nên vẫn phụ thuộc component model và rendering behavior của React. Developer Next.js phải hiểu React chứ không thể chỉ học file conventions.

### 31. When Would You Choose React with Vite Instead of Next.js? [P0]

**English answer**

> I would choose React with Vite for a client-heavy application that does not need server rendering, Server Components, framework-managed backend routes, or public SEO, especially when a separate backend already owns the server boundary. It offers a smaller mental model and flexible deployment. I would choose Next.js when its server rendering, routing, caching, metadata, and full-stack conventions solve real product requirements.

**Câu hỏi tiếng Việt:** Khi nào bạn chọn React với Vite thay vì Next.js?

**Trả lời tiếng Việt**

> Tôi chọn React/Vite cho ứng dụng thiên về client, không cần server rendering, Server Components, backend routes do framework quản lý hoặc public SEO, đặc biệt khi đã có backend riêng. Tôi chọn Next.js khi routing, server rendering, caching, metadata và full-stack conventions của nó giải quyết nhu cầu thật.

### 32. How Is Routing Different in React/Vite and Next.js? [P0]

**English answer**

> React itself does not include an application router, so a Vite application usually adds a client router and defines routes in code. Next.js App Router derives route segments and nested layouts from files and integrates them with Server Components, loading, errors, metadata, and streaming. Client navigation exists in both, but the route execution and rendering model are different.

**Câu hỏi tiếng Việt:** Routing trong React/Vite và Next.js khác nhau thế nào?

**Trả lời tiếng Việt**

> React không có application router tích hợp nên ứng dụng Vite thường thêm client router và khai báo route bằng code. Next.js App Router tạo route segments và nested layouts từ file, đồng thời tích hợp Server Components, loading, error, metadata và streaming.

### 33. How Is Data Fetching Different? [P0]

**English answer**

> In a typical React/Vite SPA, initial data is fetched from the browser through effects or a server-state library. Next.js can fetch data in Server Components near the route, stream server-rendered UI, and then use client libraries for interactive lifecycle and mutations. Neither approach removes the need to design cache identity, freshness, errors, and authorization.

**Câu hỏi tiếng Việt:** Data fetching trong React/Vite và Next.js khác nhau thế nào?

**Trả lời tiếng Việt**

> React/Vite SPA thường fetch initial data từ browser bằng effect hoặc server-state library. Next.js có thể fetch trong Server Component gần route, stream UI từ server rồi dùng client library cho interaction và mutation. Cả hai vẫn phải thiết kế cache, freshness, error và authorization.

### 34. How Do Rendering and SEO Differ? [P0]

**English answer**

> A conventional Vite SPA often sends a small HTML shell and renders the main content after JavaScript loads, although it can be extended with separate SSR tooling. Next.js provides integrated server rendering, static generation, streaming, and metadata, which can improve public content discovery and initial delivery. SEO still depends on content quality, semantics, performance, and crawlability—not the framework name alone.

**Câu hỏi tiếng Việt:** Rendering và SEO giữa React/Vite và Next.js khác nhau thế nào?

**Trả lời tiếng Việt**

> Vite SPA thông thường gửi HTML shell rồi render nội dung chính sau khi JavaScript tải, dù có thể bổ sung SSR bằng tooling khác. Next.js tích hợp server rendering, static generation, streaming và metadata nên thuận lợi hơn cho public content. SEO vẫn phụ thuộc content, semantics, performance và crawlability.

### 35. Does Next.js Replace a Backend? [P0]

**English answer**

> Next.js can implement server-side endpoints, actions, authentication integration, and backend-for-frontend logic, so it may be enough for some products. It does not automatically replace domain services, asynchronous processing, independent scaling, or specialized data ownership. In QRTable, Next.js is the management frontend while the NestJS BFF and microservices own the backend domains.

**Câu hỏi tiếng Việt:** Next.js có thay thế backend không?

**Trả lời tiếng Việt**

> Next.js có thể làm server endpoints, actions, auth integration và BFF logic nên đủ cho một số sản phẩm. Nhưng nó không tự thay thế domain services, async processing, independent scaling hoặc data ownership chuyên biệt. Trong QRTable, NestJS BFF và microservices vẫn sở hữu backend domains.

### 36. Is Next.js Always Faster Than React/Vite? [P0]

**English answer**

> No. Next.js provides more rendering and optimization options, but performance depends on architecture and implementation. A small client application may load faster with Vite, while a public content page may benefit from server rendering and reduced client JavaScript in Next.js. I compare user metrics, bundle cost, network waterfalls, and server latency instead of assuming one tool is always faster.

**Câu hỏi tiếng Việt:** Next.js có luôn nhanh hơn React/Vite không?

**Trả lời tiếng Việt**

> Không. Next.js có nhiều lựa chọn rendering và optimization hơn nhưng performance phụ thuộc kiến trúc và cách triển khai. Một client app nhỏ có thể phù hợp với Vite, còn public content có thể hưởng lợi từ server rendering của Next.js. Phải đo user metrics, bundle, waterfall và server latency.

### 37. What Are the Costs of Choosing Next.js? [P1]

**English answer**

> Next.js adds a server and caching mental model, Server/Client boundaries, framework upgrades, deployment constraints, and the risk of using features without understanding their version-specific behavior. Those costs are justified when the product benefits from its capabilities. For a simple internal SPA, the additional complexity may not provide enough value.

**Câu hỏi tiếng Việt:** Chi phí hoặc nhược điểm khi chọn Next.js là gì?

**Trả lời tiếng Việt**

> Next.js bổ sung mental model về server/cache, Server–Client boundary, framework upgrades và deployment constraints; behavior còn phụ thuộc version. Complexity này hợp lý khi sản phẩm cần các capability đó, nhưng có thể dư thừa với một internal SPA đơn giản.

### 38. Why Does QRTable Use Both Next.js and React/Vite? [P0]

**English answer**

> The Management App has public landing content, multiple authenticated layouts, metadata, and distinct administrative and operational areas, so Next.js provides useful structure and server capability. The Customer App is a focused, mobile-first QR session with a separate backend and mostly client interaction, so React/Vite keeps that surface simpler. The choice follows each product boundary rather than enforcing one frontend stack everywhere.

**Câu hỏi tiếng Việt:** Vì sao QRTable dùng cả Next.js và React/Vite?

**Trả lời tiếng Việt**

> Management App có public landing, nhiều authenticated layouts, metadata và các vùng admin/operation khác nhau nên Next.js đem lại structure và server capability hữu ích. Customer App là QR session mobile-first, backend tách riêng và chủ yếu tương tác client nên React/Vite giữ bề mặt đơn giản hơn.

## Rapid Scenario Questions

### A dashboard needs user-specific data and interactive filters. What would you do?

> Authenticate and fetch stable initial data on the server when practical, render the shell, and put interactive filters and client data lifecycle in a focused Client Component. I would keep authorization at the server boundary and choose URL state for shareable filters.

**Câu hỏi tiếng Việt:** Dashboard cần user-specific data và interactive filters; bạn sẽ làm gì?

**Trả lời tiếng Việt:** Authenticate và fetch stable initial data trên server khi phù hợp, render shell rồi đặt filters và client data lifecycle trong Client Component tập trung. Authorization vẫn ở server; shareable filters nên vào URL.

### A component uses `window.innerWidth` during render and causes a mismatch. What would you do?

> Make the first render independent of `window`, use CSS for responsive layout when possible, or read browser state after mount through a focused hook when JavaScript behavior is required.

**Câu hỏi tiếng Việt:** Component đọc `window.innerWidth` khi render và gây mismatch; bạn làm gì?

**Trả lời tiếng Việt:** Làm first render không phụ thuộc `window`, ưu tiên CSS responsive. Nếu cần JavaScript behavior, đọc browser state sau mount trong hook/client boundary nhỏ.

### Public content changes every five minutes. What would you do?

> Opt into a five-minute revalidation policy if that freshness is acceptable, provide explicit invalidation when edits must appear immediately, and confirm the policy against the project’s current caching mode.

**Câu hỏi tiếng Việt:** Public content thay đổi mỗi năm phút; bạn làm gì?

**Trả lời tiếng Việt:** Dùng revalidation năm phút nếu business chấp nhận freshness đó, bổ sung explicit invalidation khi edit phải hiện ngay và xác nhận policy theo caching mode hiện tại.

## Sources / Nguồn

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Next.js Cache Components](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js App Router](https://nextjs.org/docs/app)
