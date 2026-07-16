# QRTable Frontend Defense — Simple Spoken Answers

> Các câu trả lời trong file này dựa trên code hiện tại. QRTable là dự án hai người, vì vậy Quân phải nói rõ phần trực tiếp code, phần thiết kế chung và phần do teammate làm.

## One-Minute Architecture Answer / Bài Nói Kiến Trúc Một Phút [P0]

> QRTable is a SaaS POS and QR ordering platform for restaurants. We built two frontend apps because the users are different. The Management App uses Next.js for owners, staff, POS, and KDS. The Customer App uses React and Vite for mobile QR ordering.
>
> Both apps call one BFF through REST. They do not call each microservice directly. TanStack Query manages API data. Socket.io tells the client when data changes, and the client updates or refreshes the correct query.
>
> Important examples are optimistic cart updates with rollback, cart versions for conflict detection, and idempotency keys for order submission. The main limitations are that many management screens are still client-heavy and the Customer App is not yet a complete offline PWA.

**Bản tiếng Việt**

> QRTable là nền tảng SaaS POS và QR ordering cho nhà hàng. Chúng tôi xây hai frontend app vì hai nhóm người dùng khác nhau. Management App dùng Next.js cho owner, staff, POS và KDS. Customer App dùng React với Vite cho flow đặt món QR trên mobile.
>
> Cả hai app gọi một BFF qua REST, không gọi trực tiếp từng microservice. TanStack Query quản lý dữ liệu API. Socket.io báo khi dữ liệu thay đổi, sau đó client update hoặc refresh đúng query.
>
> Các ví dụ quan trọng là optimistic cart update có rollback, cart version để phát hiện conflict và idempotency key khi gửi order. Giới hạn hiện tại là nhiều management screen vẫn client-heavy và Customer App chưa phải offline PWA hoàn chỉnh.

## Two-App Technology Map / Bản Đồ Công Nghệ Hai Ứng Dụng

| Decision               | Management App                                                                      | Customer App                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Main users             | Owner, manager, admin, POS staff, kitchen and bar staff                             | Customers who scan a table QR code                                                        |
| Framework              | Next.js 16 with App Router                                                          | React 19 with Vite                                                                        |
| Routing                | File-based routes, route groups, layouts                                            | React Router with a small set of client routes                                            |
| Rendering              | Server-rendered public landing; interactive operations on the client                | Client-rendered mobile ordering flow                                                      |
| Authentication/session | NextAuth with Keycloak; JWT session; staff roles and permissions                    | QR/table session; Context plus local storage; tenant and session headers                  |
| Server state           | TanStack Query for staff data and mutations                                         | TanStack Query for menu, cart, orders, bills, and payments                                |
| Client state           | Zustand and local state for selected views, profile, filters, and interactions      | Session Context and local component state; Zustand is not the main production state owner |
| Complex data UI        | TanStack Table, TanStack Virtual, charts, POS and KDS workflows                     | Mobile cards, drawers, order timeline, cart and payment steps                             |
| Realtime               | Socket.io scoped by staff identity and tenant; polling recovery on some order views | Socket.io scoped by tenant and session; reconnect, focus, and online recovery             |
| Styling/components     | Tailwind CSS v4, shadcn-style components, Radix primitives                          | Tailwind CSS v4, shadcn-style components, Radix primitives                                |
| Main limitation        | Operational screens are still client-heavy; Query server hydration is limited       | The app is mobile-first but is not yet a complete offline/installable PWA                 |

**Cách dùng bảng:** Không đọc toàn bộ bảng trong phỏng vấn. Khi CEO hỏi về một app, hãy chọn framework, routing, state, auth và một kỹ thuật nổi bật của app đó.

## Product and Architecture / Sản Phẩm và Kiến Trúc

### 1. Why Did You Build Two Frontend Applications? [P0]

**Simple English answer**

> The users and workflows are very different. Staff need secure, information-heavy screens for POS, KDS, reports, and administration. Customers need a simple mobile flow after scanning a table QR code. Two apps keep routing, authentication, UI, and deployment easier to manage.

**Câu hỏi tiếng Việt:** Vì sao bạn xây hai frontend application?

**Câu trả lời tiếng Việt**

> Hai nhóm user và workflow rất khác nhau. Staff cần các màn hình bảo mật, nhiều thông tin cho POS, KDS, report và administration. Customer cần flow mobile đơn giản sau khi quét QR tại bàn. Tách hai app giúp routing, authentication, UI và deployment dễ quản lý hơn.

### 2. Why Next.js for Management and Vite for Customer? [P0]

**Simple English answer**

> The Management App benefits from Next.js layouts, routing, metadata, public server-rendered content, and clear product areas. The Customer App is a smaller client-heavy ordering flow with a separate backend, so React with Vite is enough and keeps it simple. The choice follows each product’s needs.

**Câu hỏi tiếng Việt:** Vì sao Management App dùng Next.js còn Customer App dùng Vite?

**Câu trả lời tiếng Việt**

> Management App hưởng lợi từ layout, routing, metadata, public content render ở server và các product area rõ ràng của Next.js. Customer App là flow đặt món nhỏ hơn, thiên về client và đã có backend riêng nên React với Vite là đủ và đơn giản hơn. Chúng tôi chọn theo nhu cầu từng sản phẩm.

### 3. How Does the Frontend Connect to Microservices? [P0]

**Simple English answer**

> The browser calls the BFF through REST. It does not need to know each microservice address. Staff requests include the access token and active tenant. Customer requests include the tenant and session. The BFF handles routing and security before calling the correct backend service.

**Câu hỏi tiếng Việt:** Frontend kết nối với microservices như thế nào?

**Câu trả lời tiếng Việt**

> Browser gọi BFF qua REST và không cần biết địa chỉ của từng microservice. Staff request gửi access token và active tenant. Customer request gửi tenant và session. BFF xử lý routing và security trước khi gọi đúng backend service.

### 4. How Is the Frontend Organized? [P0]

**Simple English answer**

> The code is mainly organized by feature. A feature can contain its components, API service, query hooks, types, and tests. Routing and global providers stay near the app. Code moves to a shared Nx library only when both apps really use the same stable behavior.

**Câu hỏi tiếng Việt:** Frontend được tổ chức như thế nào?

**Câu trả lời tiếng Việt**

> Code chủ yếu được tổ chức theo feature. Một feature có thể chứa component, API service, query hook, type và test của nó. Routing và global provider nằm gần app. Code chỉ được đưa vào shared Nx library khi cả hai app thật sự dùng cùng behavior ổn định.

### 5. What Is Shared Through the Nx Monorepo? [P0]

**Simple English answer**

> We share TypeScript types, event contracts, domain labels, query settings, UI primitives, hooks, utilities, and mock data. This reduces differences between the frontend and backend contracts. I do not share a feature only because two files look similar. The shared part must have a stable meaning.

**Câu hỏi tiếng Việt:** Những gì được chia sẻ qua Nx monorepo?

**Câu trả lời tiếng Việt**

> Chúng tôi share TypeScript type, event contract, domain label, query setting, UI primitive, hook, utility và mock data. Điều này giảm khác biệt giữa contract của frontend với backend. Tôi không share một feature chỉ vì hai file nhìn giống nhau; phần shared phải có ý nghĩa ổn định.

### 6. How Do You Handle Different User Roles? [P0]

**Simple English answer**

> The authenticated user profile contains roles and permissions. The frontend uses them to show the correct routes and actions for owner, manager, kitchen, bar, or staff. However, hiding a button is only for user experience. The BFF and backend still check permission for every protected action.

**Câu hỏi tiếng Việt:** Bạn xử lý workflow cho các role khác nhau như thế nào?

**Câu trả lời tiếng Việt**

> Authenticated user profile chứa role và permission. Frontend dùng chúng để hiện đúng route và action cho owner, manager, kitchen, bar hoặc staff. Tuy nhiên, ẩn button chỉ phục vụ user experience. BFF và backend vẫn kiểm tra quyền cho mọi protected action.

## Next.js in QRTable / Next.js Trong Dự Án

### 7. Where Are the Server and Client Component Boundaries? [P0]

**Simple English answer**

> The public landing page is a Server Component and fetches public data on the server. POS and KDS pages are mostly thin server pages around large interactive Client Components. The root provider is also a Client Component because it contains session, theme, QueryClient, and auth hydration.

**Câu hỏi tiếng Việt:** Server và Client Component boundary nằm ở đâu?

**Câu trả lời tiếng Việt**

> Public landing page là Server Component và lấy public data ở server. POS và KDS chủ yếu là server page mỏng bọc quanh Client Component có nhiều tương tác. Root provider cũng là Client Component vì chứa session, theme, QueryClient và auth hydration.

### 8. Why Are POS and KDS Client-Heavy? [P0]

**Simple English answer**

> They use live socket events, mutations, timers, keyboard shortcuts, selection, filters, and browser interaction. These features need client-side JavaScript. I can still keep static layout or useful first data on the server, but the main operational UI will remain interactive on the client.

**Câu hỏi tiếng Việt:** Vì sao POS và KDS thiên về client?

**Câu trả lời tiếng Việt**

> Chúng dùng live socket event, mutation, timer, keyboard shortcut, selection, filter và browser interaction. Các tính năng này cần JavaScript phía client. Tôi vẫn có thể giữ static layout hoặc dữ liệu ban đầu phù hợp ở server, nhưng UI vận hành chính vẫn phải tương tác ở client.

### 9. How Is the Public Landing Page Optimized? [P1]

**Simple English answer**

> It fetches public plans and platform information in parallel on the server. It also has metadata, semantic content, and time-based revalidation. If one public API fails, the data layer returns a safe fallback instead of breaking the whole landing page.

**Câu hỏi tiếng Việt:** Public landing page được tối ưu như thế nào?

**Câu trả lời tiếng Việt**

> Page lấy public plan và platform information song song ở server. Nó cũng có metadata, semantic content và time-based revalidation. Nếu một public API lỗi, data layer trả safe fallback thay vì làm hỏng toàn bộ landing page.

### 10. Is TanStack Query Server Hydration Implemented? [P0]

**Simple English answer**

> Not widely. In the current operational pages, QueryClient is created in a client provider, and most queries start after client auth is ready. I understand server prefetch and hydration, but I would describe them as possible improvements, not features that are already used everywhere.

**Câu hỏi tiếng Việt:** TanStack Query server hydration đã được triển khai chưa?

**Câu trả lời tiếng Việt**

> Chưa được dùng rộng rãi. Trong các operational page hiện tại, QueryClient được tạo trong client provider và hầu hết query bắt đầu sau khi client auth sẵn sàng. Tôi hiểu server prefetch và hydration nhưng sẽ nói đó là hướng cải thiện, không phải feature đã có ở mọi nơi.

## State and Data Flow / State và Luồng Dữ Liệu

### 11. What Owns Server State? [P0]

**Simple English answer**

> TanStack Query owns API data such as menus, tables, orders, bills, and KDS queues. Local state, Context, or Zustand owns UI state such as selection and filters. We do not copy the same API data into a general global store because that would create two sources of truth.

**Câu hỏi tiếng Việt:** Thành phần nào sở hữu server state?

**Câu trả lời tiếng Việt**

> TanStack Query sở hữu dữ liệu API như menu, table, order, bill và KDS queue. Local state, Context hoặc Zustand sở hữu UI state như selection và filter. Chúng tôi không copy cùng dữ liệu API vào global store chung vì sẽ tạo hai source of truth.

### 12. How Are Query Keys Designed? [P0]

**Simple English answer**

> Query keys go from general to specific. Order keys separate lists and details. Customer keys include tenant and session. KDS keys include tenant and station. This lets us refresh one order, all order lists, or only one station queue. Every value that changes the result should be in the key.

**Câu hỏi tiếng Việt:** Query key được thiết kế như thế nào?

**Câu trả lời tiếng Việt**

> Query key đi từ chung đến cụ thể. Order key tách list và detail. Customer key có tenant và session. KDS key có tenant và station. Nhờ vậy có thể refresh một order, mọi order list hoặc chỉ một station queue. Mọi value làm thay đổi kết quả phải có trong key.

**Honest note:** Một số staff key hiện giả định chỉ có một active tenant. Nếu thêm tenant switching, cache phải được scope hoặc clear cẩn thận.

### 13. Why Do Queries Wait for Auth Readiness? [P0]

**Simple English answer**

> NextAuth first loads the session. Then a client hydrator puts the access token and user profile into the auth store. If a query starts before this finishes, it may send a request without a token and receive a 401 error. The query uses `enabled` to wait.

**Câu hỏi tiếng Việt:** Vì sao query phải đợi auth sẵn sàng?

**Câu trả lời tiếng Việt**

> NextAuth tải session trước. Sau đó client hydrator đưa access token và user profile vào auth store. Nếu query chạy trước khi quá trình này xong, request có thể thiếu token và nhận lỗi 401. Query dùng `enabled` để đợi.

### 14. Why Use Zustand? [P0]

**Simple English answer**

> We use Zustand for small shared client state, such as the staff profile, selected POS order, selected table, or view filter. Components can subscribe only to the part they need. API orders and tables stay in TanStack Query, so Zustand does not become another server-data cache.

**Câu hỏi tiếng Việt:** Vì sao QRTable dùng Zustand?

**Câu trả lời tiếng Việt**

> Chúng tôi dùng Zustand cho shared client state nhỏ như staff profile, selected POS order, selected table hoặc view filter. Component có thể subscribe đúng phần nó cần. Order và table từ API vẫn nằm trong TanStack Query nên Zustand không trở thành server-data cache thứ hai.

### 15. Why Does the Customer App Use Context for Session State? [P0]

**Simple English answer**

> The customer session is simple and shared across the whole Customer App. It mainly needs start, restore, update, and end actions. Context is enough for this small API. Cart, menu, and order data change more often, so they stay in TanStack Query.

**Câu hỏi tiếng Việt:** Vì sao Customer App dùng Context cho session state?

**Câu trả lời tiếng Việt**

> Customer session đơn giản và được dùng trong toàn Customer App. Nó chủ yếu cần các action start, restore, update và end. Context đủ cho API nhỏ này. Cart, menu và order thay đổi thường xuyên hơn nên vẫn nằm trong TanStack Query.

### 16. Explain the Optimistic Cart Update [P0]

**Simple English answer**

> Before the API call, we cancel the related cart query and save the old cart. Then we update the UI immediately with the expected change. If the API fails, we restore the old cart. If it succeeds, the server response replaces the cache. We also refetch after a version conflict.

**Câu hỏi tiếng Việt:** Hãy giải thích optimistic cart update.

**Câu trả lời tiếng Việt**

> Trước khi gọi API, chúng tôi cancel cart query liên quan và lưu cart cũ. Sau đó UI được update ngay với thay đổi dự kiến. Nếu API lỗi, chúng tôi khôi phục cart cũ. Nếu thành công, server response thay thế cache. Khi có version conflict, chúng tôi refetch lại.

### 17. Why Does the Cart Have a Version? [P0]

**Simple English answer**

> The version tells the server which cart state the client edited. If another update already changed the cart, the old version is rejected instead of overwriting new data. The client then rolls back and fetches the latest cart. This is optimistic concurrency control.

**Câu hỏi tiếng Việt:** Vì sao cart cần version?

**Câu trả lời tiếng Việt**

> Version cho server biết client đã sửa cart state nào. Nếu một update khác đã thay đổi cart, version cũ bị reject thay vì ghi đè dữ liệu mới. Client sau đó rollback và fetch cart mới nhất. Đây là optimistic concurrency control.

### 18. How Do You Prevent Duplicate Order Submission? [P0]

**Simple English answer**

> The client sends an idempotency key for one logical order submission. If the same request is retried, the backend treats it as the same operation instead of creating another order. We also disable the button while pending, but the button alone cannot stop network retries or page refreshes.

**Câu hỏi tiếng Việt:** Bạn ngăn gửi order trùng như thế nào?

**Câu trả lời tiếng Việt**

> Client gửi một idempotency key cho một lần submit order về mặt nghiệp vụ. Nếu cùng request được retry, backend xem đó là cùng operation thay vì tạo order khác. Chúng tôi cũng disable button khi pending, nhưng button không thể tự chống network retry hoặc page refresh.

## Realtime and Consistency / Realtime và Tính Nhất Quán

### 19. How Does Realtime Update the UI? [P0]

**Simple English answer**

> The API response is the main source of truth. A Socket.io event tells the client that an order or queue changed. The handler checks the tenant and other IDs, then updates or invalidates the matching query. TanStack Query provides the new data and React renders the updated UI.

**Câu hỏi tiếng Việt:** Realtime cập nhật UI như thế nào?

**Câu trả lời tiếng Việt**

> API response là source of truth chính. Socket.io event báo cho client rằng order hoặc queue đã thay đổi. Handler kiểm tra tenant và các ID liên quan rồi update hoặc invalidate đúng query. TanStack Query cung cấp dữ liệu mới và React render UI đã cập nhật.

### 20. Why Invalidate Instead of Patching Every Event? [P0]

**Simple English answer**

> Many events contain only part of an object. If every handler rebuilds the full object, frontend business logic becomes duplicated and may be wrong. Invalidation asks the API for the latest source of truth. I patch directly only when the event data is complete and safe.

**Câu hỏi tiếng Việt:** Vì sao invalidate thay vì patch trực tiếp mọi event?

**Câu trả lời tiếng Việt**

> Nhiều event chỉ chứa một phần object. Nếu mỗi handler tự dựng lại toàn bộ object, business logic bị duplicate ở frontend và có thể sai. Invalidation yêu cầu API trả source of truth mới nhất. Tôi chỉ patch trực tiếp khi event có dữ liệu đầy đủ và an toàn.

### 21. What Happens When the Socket Disconnects? [P0]

**Simple English answer**

> The UI shows a disconnected or reconnecting state. When the socket connects again, the client invalidates important queries because some events may have been missed. Customer screens also refresh on browser focus or online events. Some staff order screens use polling as a fallback.

**Câu hỏi tiếng Việt:** Điều gì xảy ra khi socket disconnect?

**Câu trả lời tiếng Việt**

> UI hiện trạng thái disconnected hoặc reconnecting. Khi socket kết nối lại, client invalidate các query quan trọng vì có thể đã bỏ lỡ event. Customer screen còn refresh khi browser focus hoặc online trở lại. Một số staff order screen dùng polling làm fallback.

### 22. How Do You Protect Tenant Isolation in Realtime? [P0]

**Simple English answer**

> The server authenticates the socket and puts it in the correct tenant room. The client also checks the tenant, session, or station in each event before updating data. Query keys include the same scope. Client checks add safety, but the backend is still the final security layer.

**Câu hỏi tiếng Việt:** Bạn bảo vệ tenant isolation trong realtime như thế nào?

**Câu trả lời tiếng Việt**

> Server authenticate socket rồi đưa connection vào đúng tenant room. Client cũng kiểm tra tenant, session hoặc station trong từng event trước khi update dữ liệu. Query key chứa cùng scope. Client check tăng an toàn nhưng backend vẫn là lớp security cuối cùng.

### 23. How Do You Avoid Socket Memory Leaks? [P0]

**Simple English answer**

> I create the socket and named event handlers inside an effect. In cleanup, I remove every listener and disconnect the socket. I also keep the dependency list correct so the connection is not recreated without a reason. I test mount and unmount because duplicate listeners can look like duplicate server events.

**Câu hỏi tiếng Việt:** Bạn tránh socket memory leak như thế nào?

**Câu trả lời tiếng Việt**

> Tôi tạo socket và named event handler trong effect. Trong cleanup, tôi xóa mọi listener và disconnect socket. Tôi cũng giữ dependency list đúng để connection không bị tạo lại vô lý. Tôi test mount/unmount vì duplicate listener có thể trông giống server gửi event trùng.

## KDS, Tables, and Operational UI

### 24. How Does the KDS Frontend Work? [P0]

**Simple English answer**

> KDS first loads the current queue for one tenant and station. Socket events tell it when the queue, item status, or SLA warning changes. The client refreshes only the matching station queue. Actions such as start, done, recall, and priority include request IDs and refresh the queue after success.

**Câu hỏi tiếng Việt:** KDS frontend hoạt động như thế nào?

**Câu trả lời tiếng Việt**

> KDS đầu tiên tải current queue cho một tenant và station. Socket event báo khi queue, item status hoặc SLA warning thay đổi. Client chỉ refresh đúng station queue. Các action start, done, recall và priority có request ID và refresh queue sau khi thành công.

### 25. Why Use an Adapter for Mock and Live KDS? [P1]

**Simple English answer**

> The KDS UI uses one board interface for both mock and live data. The adapter chooses the correct implementation, so the component does not contain many `if` statements. This also lets us develop or demonstrate the UI without copying the whole KDS screen.

**Câu hỏi tiếng Việt:** Vì sao dùng adapter cho mock và live KDS?

**Câu trả lời tiếng Việt**

> KDS UI dùng một board interface cho cả mock và live data. Adapter chọn implementation đúng nên component không chứa nhiều câu `if`. Cách này cũng giúp develop hoặc demo UI mà không copy toàn bộ KDS screen.

### 26. How Is TanStack Table Used? [P0]

**Simple English answer**

> Management tables use typed column definitions and TanStack Table for sorting, filtering, visibility, pagination, and row models. Tailwind and feature components control the final UI. Domain actions and badges stay inside the feature, so table behavior is separate from business meaning.

**Câu hỏi tiếng Việt:** TanStack Table được dùng như thế nào?

**Câu trả lời tiếng Việt**

> Management table dùng typed column definition và TanStack Table cho sorting, filtering, visibility, pagination và row model. Tailwind cùng feature component kiểm soát UI cuối. Domain action và badge nằm trong feature nên table behavior tách khỏi ý nghĩa nghiệp vụ.

### 27. Why Virtualize Only Above 50 Rows? [P0]

**Simple English answer**

> Virtualization helps large lists, but it also adds code and accessibility complexity. For a small list, normal rows are simpler. The POS table turns virtualization on above 50 rows. This number is only a practical starting point and should be checked with real performance measurements.

**Câu hỏi tiếng Việt:** Vì sao chỉ virtualize khi có hơn 50 row?

**Câu trả lời tiếng Việt**

> Virtualization giúp list lớn nhưng cũng thêm độ phức tạp cho code và accessibility. Với list nhỏ, normal row đơn giản hơn. POS table bật virtualization khi có hơn 50 row. Con số này chỉ là điểm bắt đầu thực tế và nên được kiểm tra bằng performance measurement thật.

### 28. How Are Domain Statuses Displayed? [P1]

**Simple English answer**

> The API returns stable English status values such as `PENDING` or `ACTIVE`. The Vietnamese UI maps them to shared labels and badges before showing them. We do not display raw API values. This keeps the API contract stable and the wording consistent across screens.

**Câu hỏi tiếng Việt:** Domain status được hiển thị như thế nào?

**Câu trả lời tiếng Việt**

> API trả status tiếng Anh ổn định như `PENDING` hoặc `ACTIVE`. UI tiếng Việt map chúng sang shared label và badge trước khi hiển thị. Chúng tôi không hiện raw API value. Cách này giữ API contract ổn định và wording nhất quán giữa các screen.

## Authentication, Sessions, and Failure States

### 29. Explain Staff Authentication [P0]

**Simple English answer**

> The Management App uses NextAuth with Keycloak. Server callbacks handle access and refresh tokens and add user, role, tenant, and permission data to the session. A client hydrator prepares the profile and token for existing BFF calls. The BFF and backend still verify every protected request.

**Câu hỏi tiếng Việt:** Hãy giải thích staff authentication.

**Câu trả lời tiếng Việt**

> Management App dùng NextAuth với Keycloak. Server callback xử lý access/refresh token và thêm user, role, tenant, permission vào session. Client hydrator chuẩn bị profile và token cho các BFF call hiện tại. BFF và backend vẫn verify mọi protected request.

### 30. Is Storing the Staff Access Token in Client State Ideal? [P1]

**Simple English answer**

> It works with the current bearer-token design, but it is not risk-free. Client JavaScript can read the token, so an XSS problem would be more serious. A BFF session with an `HttpOnly` cookie could reduce that risk. I would study the Keycloak and WebSocket flow before changing it.

**Câu hỏi tiếng Việt:** Lưu staff access token trong client state có lý tưởng không?

**Câu trả lời tiếng Việt**

> Nó hoạt động với bearer-token design hiện tại nhưng vẫn có rủi ro. Client JavaScript đọc được token nên XSS sẽ nghiêm trọng hơn. BFF session với `HttpOnly` cookie có thể giảm rủi ro đó. Tôi sẽ xem kỹ Keycloak và WebSocket flow trước khi thay đổi.

### 31. How Does the Customer Session Expire? [P0]

**Simple English answer**

> Customer requests include the active tenant and session IDs. If the API says the session is closed, the request client removes that session from memory and local storage and sends a browser event. The Session Provider resets, and protected pages return the customer to the landing flow.

**Câu hỏi tiếng Việt:** Customer session hết hạn được xử lý như thế nào?

**Câu trả lời tiếng Việt**

> Customer request gửi active tenant và session ID. Nếu API báo session đã đóng, request client xóa session khỏi memory và local storage rồi gửi browser event. Session Provider reset và protected page đưa customer về landing flow.

### 32. How Are Loading and Error States Handled? [P0]

**Simple English answer**

> Features show separate states for auth loading, data loading, empty data, errors, permission problems, disconnected sockets, and retries. For example, KDS shows queue loading and realtime problems separately. One current gap is that many Next.js routes do not yet use route-level `loading.tsx` and `error.tsx`.

**Câu hỏi tiếng Việt:** Loading và error state được xử lý như thế nào?

**Câu trả lời tiếng Việt**

> Feature hiện state riêng cho auth loading, data loading, empty data, error, permission problem, socket disconnected và retry. Ví dụ KDS tách queue loading khỏi realtime problem. Một gap hiện tại là nhiều Next.js route chưa dùng `loading.tsx` và `error.tsx` ở mức route.

## Testing, Limitations, and Improvements

### 33. How Is the Frontend Tested? [P0]

**Simple English answer**

> We have unit and integration-style tests for components, hooks, services, and shared contracts. Important tests cover optimistic cart updates, session restore, realtime event filtering, KDS, role rules, payments, and tables. At the audit time, Management had 37 spec files and Customer had 15. This does not mean coverage is complete.

**Câu hỏi tiếng Việt:** Frontend được test như thế nào?

**Câu trả lời tiếng Việt**

> Chúng tôi có unit test và integration-style test cho component, hook, service và shared contract. Các phần quan trọng gồm optimistic cart update, session restore, realtime event filtering, KDS, role rule, payment và table. Tại thời điểm audit, Management có 37 spec file và Customer có 15. Điều này không có nghĩa coverage đã hoàn chỉnh.

### 34. Is the Customer App a Complete PWA? [P0]

**Simple English answer**

> Not yet. It is a mobile-first web app, but the current code does not show a complete manifest, service worker, offline cache plan, or install flow. I would not claim offline ordering. Before adding it, we must decide how menus, carts, orders, and payments should behave with old or missing data.

**Câu hỏi tiếng Việt:** Customer App có phải PWA hoàn chỉnh không?

**Câu trả lời tiếng Việt**

> Chưa. Đây là mobile-first web app nhưng code hiện tại chưa có manifest, service worker, offline cache plan hoặc install flow hoàn chỉnh. Tôi sẽ không claim offline ordering. Trước khi thêm, team phải quyết định menu, cart, order và payment hoạt động thế nào khi dữ liệu cũ hoặc bị thiếu.

### 35. What Frontend Decision Would You Improve Today? [P0]

**Simple English answer**

> I would improve the Next.js boundaries step by step. I would add route-level loading and error UI, measure the bundle and rendering cost of POS and KDS, and test server prefetch for read-heavy pages. I would also split very large components. I would not start with a full rewrite.

**Câu hỏi tiếng Việt:** Bạn sẽ cải thiện quyết định frontend nào hôm nay?

**Câu trả lời tiếng Việt**

> Tôi sẽ cải thiện Next.js boundary từng bước. Tôi thêm loading và error UI ở mức route, đo bundle và rendering cost của POS/KDS, rồi thử server prefetch cho page chủ yếu đọc dữ liệu. Tôi cũng tách component quá lớn. Tôi sẽ không bắt đầu bằng full rewrite.

### 36. What Is the Biggest Frontend Risk? [P1]

**Simple English answer**

> The biggest risk is showing data that is old, out of order, or from the wrong scope. REST responses, socket events, optimistic updates, and user roles all affect the UI. We reduce the risk with clear query keys, scoped events, server permission checks, versions, refetching, and recovery tests.

**Câu hỏi tiếng Việt:** Rủi ro frontend lớn nhất là gì?

**Câu trả lời tiếng Việt**

> Rủi ro lớn nhất là hiển thị dữ liệu cũ, sai thứ tự hoặc sai scope. REST response, socket event, optimistic update và user role đều ảnh hưởng UI. Chúng tôi giảm rủi ro bằng query key rõ, event có scope, server permission check, version, refetch và recovery test.

### 37. What Did the Backend Architecture Teach You About Frontend? [P0]

**Simple English answer**

> It taught me that data does not always update at the same time. A request may succeed while another screen is still old, and an event may arrive late. The frontend needs clear pending states, safe retry behavior, stable API contracts, and a way to refresh the source of truth.

**Câu hỏi tiếng Việt:** Backend architecture đã dạy bạn điều gì về frontend?

**Câu trả lời tiếng Việt**

> Nó dạy tôi rằng dữ liệu không phải lúc nào cũng update cùng lúc. Một request có thể thành công trong khi screen khác vẫn còn dữ liệu cũ và event có thể đến trễ. Frontend cần pending state rõ, retry an toàn, API contract ổn định và cách refresh source of truth.

## Direct Technology-Decision Questions / Câu Hỏi Trực Tiếp Về Quyết Định Công Nghệ

> **Word-by-word pattern:** “We chose X. This app needs Y. X gives us Z. The downside is…” Mỗi câu có chủ thể và động từ rõ. Bạn có thể dừng sau ba câu nếu CEO đã hiểu.

### 38. Can You Walk Me Through the Management App Technology Stack? [P0]

**Simple English answer**

> We built the Management App with Next.js, React, and TypeScript. We use the App Router for routes and layouts. TanStack Query manages API data, Zustand manages selected client state, and TanStack Table handles complex tables. NextAuth and Keycloak handle staff login. Socket.io provides realtime updates.

**Câu hỏi tiếng Việt:** Bạn có thể trình bày technology stack của Management App không?

**Câu trả lời tiếng Việt**

> Chúng tôi xây Management App bằng Next.js, React và TypeScript. Chúng tôi dùng App Router cho route và layout. TanStack Query quản lý API data, Zustand quản lý một số client state và TanStack Table xử lý table phức tạp. NextAuth với Keycloak xử lý staff login. Socket.io cung cấp realtime update.

### 39. Why Did You Choose Next.js for the Management App? [P0]

**Simple English answer**

> We chose Next.js because the Management App has many product areas, layouts, roles, and public content. The App Router gives us clear route groups and shared layouts. Next.js also supports server rendering and metadata for the public landing page. The operational screens still use Client Components because they are highly interactive.

**Câu hỏi tiếng Việt:** Vì sao bạn chọn Next.js cho Management App?

**Câu trả lời tiếng Việt**

> Chúng tôi chọn Next.js vì Management App có nhiều khu vực sản phẩm, layout, role và public content. App Router cung cấp route group và shared layout rõ ràng. Next.js cũng hỗ trợ server rendering cùng metadata cho public landing page. Các operational screen vẫn dùng Client Component vì có nhiều tương tác.

### 40. Which Next.js Features Did You Actually Use? [P0]

**Simple English answer**

> We use the App Router, nested layouts, route groups, Server Components, Client Components, metadata, and server-side data fetching for the landing page. We also use NextAuth inside the Next.js application. We do not widely use server-side TanStack Query hydration, and we do not enable Cache Components.

**Câu hỏi tiếng Việt:** Bạn đã thật sự áp dụng những tính năng Next.js nào?

**Câu trả lời tiếng Việt**

> Chúng tôi dùng App Router, nested layout, route group, Server Component, Client Component, metadata và server-side data fetching cho landing page. Chúng tôi cũng dùng NextAuth trong Next.js app. Chúng tôi chưa dùng rộng server-side TanStack Query hydration và chưa bật Cache Components.

### 41. Why Does the Management App Use TanStack Query, Zustand, and TanStack Table Together? [P0]

**Simple English answer**

> Each tool has a different job. TanStack Query manages data from the BFF, including loading, caching, mutations, and refetching. Zustand keeps small client-owned state, such as the selected order or view filter. TanStack Table manages table behavior. We do not store the same API data in all three tools.

**Câu hỏi tiếng Việt:** Vì sao Management App dùng TanStack Query, Zustand và TanStack Table cùng nhau?

**Câu trả lời tiếng Việt**

> Mỗi tool có một nhiệm vụ khác nhau. TanStack Query quản lý dữ liệu từ BFF, gồm loading, caching, mutation và refetch. Zustand giữ client-owned state nhỏ như selected order hoặc view filter. TanStack Table quản lý table behavior. Chúng tôi không lưu cùng API data trong cả ba tool.

### 42. Can You Explain the Management App Data Flow? [P0]

**Simple English answer**

> A staff member performs an action in a Client Component. A Query hook calls a typed service, and the service sends the request to the BFF with the access token and tenant. The BFF calls the correct backend service. After the response or socket event, TanStack Query refreshes the affected data.

**Câu hỏi tiếng Việt:** Bạn có thể giải thích data flow của Management App không?

**Câu trả lời tiếng Việt**

> Staff thực hiện một action trong Client Component. Query hook gọi typed service và service gửi request đến BFF với access token cùng tenant. BFF gọi đúng backend service. Sau response hoặc socket event, TanStack Query refresh dữ liệu bị ảnh hưởng.

### 43. Can You Walk Me Through the Customer App Technology Stack? [P0]

**Simple English answer**

> We built the Customer App with React, Vite, and TypeScript. React Router handles the small client route flow. TanStack Query manages menus, carts, orders, bills, and payments. A Session Context manages the active table session. Socket.io provides realtime updates. Tailwind and shadcn-style components build the mobile UI.

**Câu hỏi tiếng Việt:** Bạn có thể trình bày technology stack của Customer App không?

**Câu trả lời tiếng Việt**

> Chúng tôi xây Customer App bằng React, Vite và TypeScript. React Router xử lý client route flow nhỏ. TanStack Query quản lý menu, cart, order, bill và payment. Session Context quản lý active table session. Socket.io cung cấp realtime update. Tailwind và shadcn-style component tạo mobile UI.

### 44. Why Did You Choose React with Vite for the Customer App? [P0]

**Simple English answer**

> We chose React with Vite because the Customer App is a focused client-side ordering flow. The customer enters through a QR link, joins a table session, views the menu, manages the cart, and tracks the order. The app already uses a separate BFF, so it does not need the full Next.js server model.

**Câu hỏi tiếng Việt:** Vì sao bạn chọn React với Vite cho Customer App?

**Câu trả lời tiếng Việt**

> Chúng tôi chọn React với Vite vì Customer App là một client-side ordering flow tập trung. Customer vào từ QR link, tham gia table session, xem menu, quản lý cart và theo dõi order. App đã dùng BFF riêng nên không cần toàn bộ server model của Next.js.

### 45. Why Does the Customer App Use React Router? [P1]

**Simple English answer**

> The Customer App has a small set of client routes, such as landing, menu, order tracking, and payment request. React Router is enough for this flow. It also lets us keep the QR query parameters when we redirect the root path to the landing page. We do not need file-based server routing here.

**Câu hỏi tiếng Việt:** Vì sao Customer App dùng React Router?

**Câu trả lời tiếng Việt**

> Customer App có một nhóm client route nhỏ như landing, menu, order tracking và payment request. React Router đủ cho flow này. Nó cũng giúp giữ QR query parameter khi redirect root path đến landing page. Chúng tôi không cần file-based server routing ở app này.

### 46. Why Does the Customer App Use Context Instead of Zustand for the Main Session? [P0]

**Simple English answer**

> The active customer session has a small API and one clear scope. The Session Provider starts, restores, updates, and ends that session. Context is enough for this job. The app uses local component state for small interactions and TanStack Query for API data. Production session state does not need a large global store.

**Câu hỏi tiếng Việt:** Vì sao Customer App dùng Context thay vì Zustand cho main session?

**Câu trả lời tiếng Việt**

> Active customer session có API nhỏ và một scope rõ ràng. Session Provider start, restore, update và end session đó. Context đủ cho nhiệm vụ này. App dùng local component state cho interaction nhỏ và TanStack Query cho API data. Production session state không cần một global store lớn.

### 47. Which Important Frontend Techniques Did You Apply in the Customer App? [P0]

**Simple English answer**

> We persist the table session in local storage and restore it when the app starts. We use scoped query keys with the tenant and session. We apply optimistic cart updates, roll back errors, and send a cart version for conflict detection. We also use idempotency keys for order submission and reconnect recovery for realtime data.

**Câu hỏi tiếng Việt:** Bạn đã áp dụng những kỹ thuật frontend quan trọng nào trong Customer App?

**Câu trả lời tiếng Việt**

> Chúng tôi lưu table session trong local storage và restore khi app khởi động. Chúng tôi dùng query key có tenant và session. Chúng tôi áp dụng optimistic cart update, rollback khi lỗi và gửi cart version để phát hiện conflict. Chúng tôi còn dùng idempotency key khi submit order và recovery sau realtime reconnect.

### 48. How Is Authentication Different Between the Two Apps? [P0]

**Simple English answer**

> The Management App serves staff, so it uses NextAuth and Keycloak with user identity, roles, permissions, access tokens, and tenant information. The Customer App does not use a normal staff login. The customer joins through a table QR code and receives a session. Customer requests then send the tenant and session IDs.

**Câu hỏi tiếng Việt:** Authentication của hai app khác nhau như thế nào?

**Câu trả lời tiếng Việt**

> Management App phục vụ staff nên dùng NextAuth và Keycloak với user identity, role, permission, access token và tenant information. Customer App không dùng staff login thông thường. Customer tham gia qua table QR code rồi nhận session. Các customer request sau đó gửi tenant ID và session ID.

### 49. How Is Realtime Different Between the Two Apps? [P0]

**Simple English answer**

> Both apps use Socket.io, but they use different scopes. The Management App connects with the staff token and filters events by the active tenant. The Customer App connects with the tenant and table session and checks both values when possible. Both apps refetch important data after reconnecting.

**Câu hỏi tiếng Việt:** Realtime của hai app khác nhau như thế nào?

**Câu trả lời tiếng Việt**

> Cả hai app đều dùng Socket.io nhưng dùng scope khác nhau. Management App kết nối bằng staff token và filter event theo active tenant. Customer App kết nối bằng tenant và table session rồi kiểm tra cả hai value khi có thể. Cả hai app đều refetch dữ liệu quan trọng sau khi reconnect.

### 50. Which Decisions Are Shared, and Which Decisions Are App-Specific? [P0]

**Simple English answer**

> We share TypeScript contracts, TanStack Query, Tailwind, shadcn-style components, Socket.io, and common Nx libraries. We keep routing, authentication, session state, and complex UI choices app-specific. The Management App needs Next.js, staff auth, tables, and KDS. The Customer App needs a simple mobile router, table session, cart, and payment flow.

**Câu hỏi tiếng Việt:** Quyết định nào được dùng chung và quyết định nào riêng cho từng app?

**Câu trả lời tiếng Việt**

> Chúng tôi dùng chung TypeScript contract, TanStack Query, Tailwind, shadcn-style component, Socket.io và common Nx library. Chúng tôi giữ routing, authentication, session state và complex UI choice riêng theo từng app. Management App cần Next.js, staff auth, table và KDS. Customer App cần mobile router đơn giản, table session, cart và payment flow.

## Deep Practical Architecture Walkthrough / Giải Thích Kiến Trúc Thực Tế [SHOW-OFF FOLLOW-UP]

> Phần này dùng khi interviewer hỏi tiếp: “How did you implement it?”, “Can you walk me through the flow?” hoặc “How is it set up in your project?”. Đây không phải phần phải học thuộc trước Core Pack.
>
> Cách học nhanh: nhớ flow bằng mũi tên, nói short answer trước rồi dừng. Chỉ mở rộng khi interviewer hỏi sâu. Với quyết định chung của dự án, dùng “we”. Chỉ dùng “I implemented” cho phần Quân trực tiếp làm.

### Priority / Mức Ưu Tiên

- **Show-off P0:** Câu 51, 53, 55, 56, 57, 59 và 60.
- **Follow-up P1:** Câu 52, 54 và 58.
- **Optional P2:** Câu 61 về build và deployment.

### Four Mental Models / Bốn Sơ Đồ Cần Nhớ

**1. Main frontend data flow / Luồng dữ liệu frontend chính**

    User action
       → Feature component
       → Query or mutation hook
       → Typed service
       → API client with auth or session headers
       → BFF
       → Correct microservice

    Backend change
       → Socket.io event
       → Check tenant, session, or resource ID
       → Update or invalidate the correct query
       → TanStack Query gets fresh data
       → React renders the new UI

**2. Management App startup / Luồng khởi động Management App**

    Next.js RootLayout
       → Client Providers
       → NextAuth SessionProvider
       → ThemeProvider
       → QueryClientProvider
       → AuthSessionHydrator
       → Access token and profile in auth store
       → Protected queries can run

**3. Customer App startup / Luồng khởi động Customer App**

    Vite main.tsx
       → QueryClientProvider
       → App
       → ErrorBoundary
       → Customer SessionProvider
       → BrowserRouter
       → Restore table session from local storage
       → Customer queries can run

**4. UI system / Luồng xây UI**

    Figma and business requirement
       → Design tokens and responsive rules
       → shadcn or Radix primitive
       → Reusable composite
       → Feature component
       → Page or workflow

### 51. Can You Walk Me Through the Frontend Architecture of Both Apps? [SHOW-OFF P0]

**English question:** Can you walk me through the frontend architecture of both apps?

**English answer — say this first**

> Yes. QRTable has two frontend apps in one Nx monorepo. The Management App uses Next.js for staff workflows. The Customer App uses React and Vite for mobile QR ordering. Each app owns its routing, authentication or session, and product UI. Both apps share stable types, constants, UI primitives, hooks, and utilities. The browser only calls the BFF. TanStack Query manages API data, and Socket.io tells the app when related data has changed.

**Câu hỏi tiếng Việt:** Bạn có thể mô tả kiến trúc frontend của cả hai app không?

**Câu trả lời tiếng Việt**

> QRTable có hai frontend app trong cùng một Nx monorepo. Management App dùng Next.js cho workflow của staff. Customer App dùng React và Vite cho flow đặt món QR trên mobile. Mỗi app sở hữu routing, authentication hoặc session và product UI riêng. Hai app chỉ share các type, constant, UI primitive, hook và utility đã ổn định. Browser chỉ gọi BFF. TanStack Query quản lý dữ liệu API, còn Socket.io báo cho app khi dữ liệu liên quan đã thay đổi.

**Deep English follow-up**

- A route or page composes the screen, but it does not need to know every API detail.
- A feature hook owns query or mutation behavior. A typed service owns endpoint calls.
- The API client adds the staff token and tenant, or the customer tenant and session.
- The BFF hides microservice addresses and applies the correct guard chain before it routes the request.
- Shared Nx libraries contain stable cross-app code. Product-specific workflow stays inside the app that owns it.

**Giải thích sâu bằng tiếng Việt**

- Route hoặc page có nhiệm vụ compose màn hình, nhưng không cần biết mọi chi tiết API.
- Feature hook sở hữu query hoặc mutation behavior. Typed service sở hữu việc gọi endpoint.
- API client thêm staff token và tenant, hoặc customer tenant và session.
- BFF che giấu địa chỉ microservice và chạy guard chain phù hợp trước khi route request.
- Shared Nx library chứa code ổn định dùng chéo app. Product workflow riêng vẫn nằm trong app sở hữu nó.

**Flow để hình dung**

    Management user → Next.js route → Management feature → Staff API client ┐
                                                                            ├→ BFF → Microservices
    Customer → React Router page → Customer feature → Session API client ───┘

    Shared contracts and UI primitives support both apps,
    but routing, authentication, and workflow stay app-specific.

**Code evidence**

- [Management root layout](../../apps/management-app/src/app/layout.tsx)
- [Management providers](../../apps/management-app/src/app/providers.tsx)
- [Customer bootstrap](../../apps/customer-pwa/src/main.tsx)
- [Customer routing](../../apps/customer-pwa/src/App.tsx)
- [Shared frontend UI exports](../../libs/frontend/ui/src/index.ts)

**Honest trade-off**

> Two apps create some repeated setup, but they keep very different users and workflows independent. I only move code to a shared library when the behavior is really stable.

**Giới hạn nói thật**

> Hai app sẽ có một phần setup lặp lại, nhưng chúng giúp hai nhóm user và workflow rất khác nhau được độc lập. Tôi chỉ đưa code vào shared library khi behavior của nó thật sự ổn định.

### 52. How Do the Provider Trees Start the Two Applications? [FOLLOW-UP P1]

**English question:** How do the provider trees start the two applications?

**English answer — say this first**

> In the Management App, the Next.js root layout renders a client Providers component. That component creates one QueryClient and wraps the app with NextAuth session, theme, React Query, and auth hydration. In the Customer App, Vite creates one QueryClient in main.tsx. The App component then adds the error boundary, customer session, router, and pages.

**Câu hỏi tiếng Việt:** Provider tree khởi động hai application như thế nào?

**Câu trả lời tiếng Việt**

> Trong Management App, Next.js root layout render một client Providers component. Component này tạo một QueryClient rồi bọc app bằng NextAuth session, theme, React Query và auth hydration. Trong Customer App, Vite tạo một QueryClient ở main.tsx. App component sau đó thêm error boundary, customer session, router và các page.

**Deep English follow-up**

- The Management App creates QueryClient inside useState, so a normal render does not create a new cache.
- SessionProvider must be above AuthSessionHydrator because the hydrator reads the NextAuth session.
- QueryClientProvider must be above feature hooks because those hooks read and write the query cache.
- The Customer App has no NextAuth provider. Its SessionProvider owns only the QR table session.
- A client provider does not automatically make every server child a Client Component. Next.js can pass server-rendered children through it.

**Giải thích sâu bằng tiếng Việt**

- Management App tạo QueryClient bên trong useState nên một lần render bình thường không tạo cache mới.
- SessionProvider phải nằm trên AuthSessionHydrator vì hydrator đọc NextAuth session.
- QueryClientProvider phải nằm trên feature hook vì các hook đọc và ghi query cache.
- Customer App không có NextAuth provider. SessionProvider của nó chỉ sở hữu QR table session.
- Một client provider không tự động biến mọi server child thành Client Component. Next.js vẫn có thể truyền server-rendered child qua provider đó.

**Flow để hình dung**

    Management:
    RootLayout
       → Providers
          → SessionProvider
             → ThemeProvider
                → QueryClientProvider
                   → AuthSessionHydrator
                   → Page content

    Customer:
    main.tsx
       → QueryClientProvider
          → ErrorBoundary
             → SessionProvider
                → BrowserRouter
                   → Page content

**Code evidence**

- [Management root layout](../../apps/management-app/src/app/layout.tsx)
- [Management provider setup](../../apps/management-app/src/app/providers.tsx)
- [Customer QueryClient setup](../../apps/customer-pwa/src/main.tsx)
- [Customer app providers and routes](../../apps/customer-pwa/src/App.tsx)

**Honest trade-off**

> Global providers are convenient, but I do not put feature state into them without a clear reason. A large provider can cause broad updates and unclear ownership.

**Giới hạn nói thật**

> Global provider tiện lợi, nhưng tôi không đưa feature state vào đó nếu không có lý do rõ ràng. Provider quá lớn có thể gây update diện rộng và làm ownership khó hiểu.

### 53. How Did You Set Up shadcn/ui and the UI Architecture? [SHOW-OFF P0]

**English question:** How did you set up shadcn/ui and the UI architecture?

**English answer — say this first**

> We use shadcn as source code, not as a black-box UI package. Each app has its own components.json because the Next.js app supports RSC, while the Vite app does not. Radix gives us accessible behavior, and Tailwind gives us styling. Stable primitives can move to the shared frontend UI library. Feature-specific compositions stay inside each app.

**Câu hỏi tiếng Việt:** Bạn setup shadcn/ui và tổ chức UI architecture như thế nào?

**Câu trả lời tiếng Việt**

> Chúng tôi dùng shadcn theo mô hình sở hữu source code, không xem nó là một UI package hộp đen. Mỗi app có components.json riêng vì Next.js app hỗ trợ RSC, còn Vite app thì không. Radix cung cấp behavior có accessibility, còn Tailwind xử lý styling. Primitive ổn định có thể đưa vào shared frontend UI library. Composition riêng của feature vẫn nằm trong từng app.

**Deep English follow-up**

- The Management config sets rsc to true and points shadcn to the App Router global CSS file.
- The Customer config sets rsc to false and points to the Vite entry CSS file.
- Both apps use the same Nova style, neutral base color, CSS variables, Lucide icons, and path aliases.
- Tailwind v4 scans the shared UI source. This is important because shared component classes must be included in the final CSS.
- CSS variables hold semantic tokens such as background, foreground, primary, border, and radius. Product token files add POS or PWA-specific values.
- We share stable Button, Dialog, Card, Drawer, Tooltip, and similar primitives. We keep app-specific screen compositions local.

**Giải thích sâu bằng tiếng Việt**

- Management config đặt rsc là true và trỏ shadcn đến global CSS của App Router.
- Customer config đặt rsc là false và trỏ đến CSS entry của Vite.
- Cả hai app dùng cùng Nova style, neutral base color, CSS variable, Lucide icon và path alias.
- Tailwind v4 scan source của shared UI. Việc này quan trọng vì class trong shared component phải xuất hiện trong CSS cuối cùng.
- CSS variable giữ semantic token như background, foreground, primary, border và radius. Các product token file bổ sung value riêng cho POS hoặc PWA.
- Chúng tôi share primitive ổn định như Button, Dialog, Card, Drawer và Tooltip. Screen composition riêng của app vẫn để local.

**Flow để hình dung**

    Figma requirement
       → Semantic token
       → shadcn source component
       → Radix behavior plus Tailwind style
       → Shared primitive or local app component
       → Feature screen

**How I would translate Figma / Cách tôi chuyển Figma thành code**

> I first identify layout, spacing, typography, color roles, states, and breakpoints. Then I map repeated values to tokens and repeated interaction to a component. I keep business logic in the feature, not inside a generic Button or Dialog.

> Đầu tiên, tôi xác định layout, spacing, typography, vai trò màu sắc, các state và breakpoint. Sau đó, tôi map value lặp lại thành token và interaction lặp lại thành component. Tôi giữ business logic trong feature, không nhét nó vào Button hoặc Dialog dùng chung.

**Code evidence**

- [Management shadcn config](../../apps/management-app/components.json)
- [Customer shadcn config](../../apps/customer-pwa/components.json)
- [Management Tailwind and theme entry](../../apps/management-app/src/app/globals.css)
- [Customer Tailwind and theme entry](../../apps/customer-pwa/src/index.css)
- [Shared shadcn-based primitives](../../libs/frontend/ui/src/index.ts)

**Honest trade-off**

> Source ownership gives us control, but upgrades are not automatic. We must review local changes when we update a shadcn component.

**Giới hạn nói thật**

> Sở hữu source code giúp chúng tôi kiểm soát component, nhưng việc nâng cấp không tự động. Khi update shadcn component, chúng tôi phải review các chỉnh sửa local.

### 54. How Is a Frontend Feature Organized from Route to API? [FOLLOW-UP P1]

**English question:** How is a frontend feature organized from route to API?

**English answer — say this first**

> We mainly organize code by business feature. For example, the tables feature has query keys, a typed service, query and mutation hooks, table components, data types, and tests. The route composes the feature. The hook owns cache behavior. The service owns endpoint calls. This keeps UI code away from raw URLs and request details.

**Câu hỏi tiếng Việt:** Một frontend feature được tổ chức từ route đến API như thế nào?

**Câu trả lời tiếng Việt**

> Chúng tôi chủ yếu tổ chức code theo business feature. Ví dụ, tables feature có query key, typed service, query và mutation hook, table component, data type và test. Route compose feature. Hook sở hữu cache behavior. Service sở hữu việc gọi endpoint. Cách này giúp UI code không phụ thuộc vào raw URL và chi tiết request.

**Deep English follow-up**

- The route or page decides which feature screen is shown.
- The feature component owns the user workflow and visual composition.
- Query hooks connect the feature to TanStack Query and expose loading, error, data, and mutation state.
- The key factory gives every cache entry a stable identity.
- The service maps typed input and output to the API contract.
- The shared API client handles common transport behavior such as base URL, headers, and error parsing.

**Giải thích sâu bằng tiếng Việt**

- Route hoặc page quyết định feature screen nào được hiển thị.
- Feature component sở hữu user workflow và visual composition.
- Query hook kết nối feature với TanStack Query rồi expose loading, error, data và mutation state.
- Key factory tạo identity ổn định cho từng cache entry.
- Service map typed input và output với API contract.
- Shared API client xử lý transport behavior chung như base URL, header và error parsing.

**Flow để hình dung**

    dashboard/tables route
       → Tables feature screen
       → useTablesQuery or table mutation
       → tableKeys plus tablesService
       → authApiClient
       → BFF tables endpoint

    Response
       → Query cache
       → TablesTable
       → Typed columns
       → shadcn Table markup

**Code evidence**

- [Table query keys](../../apps/management-app/src/features/tables/table-keys.ts)
- [Table query hooks](../../apps/management-app/src/features/tables/hooks/use-tables-query.ts)
- [Table mutation hooks](../../apps/management-app/src/features/tables/hooks/use-tables-mutations.ts)
- [Typed table service](../../apps/management-app/src/features/tables/services/tables.service.ts)
- [Table feature component](../../apps/management-app/src/features/tables/components/tables-table.tsx)

**Honest trade-off**

> Not every feature needs every folder. I add a service, hook, or utility only when that responsibility exists. The goal is clear ownership, not a fixed folder template.

**Giới hạn nói thật**

> Không phải feature nào cũng cần mọi folder. Tôi chỉ thêm service, hook hoặc utility khi responsibility đó thật sự tồn tại. Mục tiêu là ownership rõ ràng, không phải ép mọi feature theo một template cứng.

### 55. How Did You Set Up and Use TanStack Query? [SHOW-OFF P0]

**English question:** How did you set up and use TanStack Query in the project?

**English answer — say this first**

> Each app creates one QueryClient near its root and provides it to feature hooks. Our shared default stale time is sixty seconds, and window focus refetch is off by default. Each feature uses a query-key factory, a typed service, and query or mutation hooks. Protected staff queries wait until auth is ready. Mutations either update the known cache value or invalidate the smallest related query.

**Câu hỏi tiếng Việt:** Bạn setup và sử dụng TanStack Query trong dự án như thế nào?

**Câu trả lời tiếng Việt**

> Mỗi app tạo một QueryClient gần root rồi cung cấp nó cho các feature hook. Default stale time dùng chung là 60 giây và mặc định không refetch khi window focus. Mỗi feature dùng query-key factory, typed service và query hoặc mutation hook. Protected staff query đợi auth sẵn sàng. Mutation sẽ update cache khi biết chắc dữ liệu mới hoặc invalidate query liên quan nhỏ nhất.

**Deep English follow-up**

- QueryClientProvider gives every feature access to one cache for that app.
- A query key includes every value that changes the result, such as area, tenant, session, station, or resource ID.
- The query function calls a typed service. The component does not call fetch directly.
- The enabled option prevents requests before staff auth or customer session is ready.
- A successful mutation invalidates related list or detail keys when the server is the safest source of truth.
- The customer cart uses optimistic updates because the backend has a clear cart version and conflict contract.

**Giải thích sâu bằng tiếng Việt**

- QueryClientProvider cho mọi feature truy cập một cache chung trong app đó.
- Query key chứa mọi value làm thay đổi kết quả như area, tenant, session, station hoặc resource ID.
- Query function gọi typed service. Component không gọi fetch trực tiếp.
- Enabled option ngăn request chạy trước khi staff auth hoặc customer session sẵn sàng.
- Mutation thành công sẽ invalidate list hoặc detail key liên quan khi server là source of truth an toàn nhất.
- Customer cart dùng optimistic update vì backend có cart version và conflict contract rõ ràng.

**Flow để hình dung**

    Component mounts
       → Hook builds query key
       → enabled condition is checked
       → Query cache is checked
       → Service calls API when needed
       → Data enters cache
       → Component renders data

    User submits mutation
       → Mutation calls service
       → Success updates or invalidates related key
       → Related UI receives the new cache state

**Why these defaults / Vì sao dùng default này**

> Sixty seconds reduces repeated reads for data that does not change every second. We turn off global window-focus refetch because operational screens already have realtime or targeted recovery. A feature can still override the default when its data needs a different policy.

> 60 giây giúp giảm repeated read cho dữ liệu không thay đổi từng giây. Chúng tôi tắt global window-focus refetch vì operational screen đã có realtime hoặc targeted recovery. Từng feature vẫn có thể override default khi dữ liệu cần policy khác.

**Code evidence**

- [Shared Query configuration](../../libs/shared/constants/src/lib/config.ts)
- [Management QueryClient](../../apps/management-app/src/app/providers.tsx)
- [Customer QueryClient](../../apps/customer-pwa/src/main.tsx)
- [Table key factory](../../apps/management-app/src/features/tables/table-keys.ts)
- [Auth-aware table queries](../../apps/management-app/src/features/tables/hooks/use-tables-query.ts)
- [Customer scoped query keys](../../apps/customer-pwa/src/features/order/hooks/order-query-keys.ts)

**Honest trade-off**

> Some staff query keys currently assume one active tenant. If we add tenant switching in one browser session, I would include tenantId in those keys or clear tenant-scoped cache during the switch.

**Giới hạn nói thật**

> Một số staff query key hiện giả định chỉ có một active tenant. Nếu sau này hỗ trợ đổi tenant trong cùng browser session, tôi sẽ thêm tenantId vào các key đó hoặc clear tenant-scoped cache khi chuyển tenant.

### 56. How Did You Build a Complex Table with TanStack Table and shadcn? [SHOW-OFF P0]

**English question:** How did you build a complex table with TanStack Table and shadcn?

**English answer — say this first**

> TanStack Table is the headless behavior layer, and shadcn Table is the visual layer. I pass typed data and typed column definitions to useReactTable. The table controls sorting, filters, column visibility, pagination, and row models. Then I use flexRender to render headers and cells into semantic table components. Business cells, status badges, and row actions stay in the feature columns.

**Câu hỏi tiếng Việt:** Bạn xây một complex table bằng TanStack Table và shadcn như thế nào?

**Câu trả lời tiếng Việt**

> TanStack Table là behavior layer dạng headless, còn shadcn Table là visual layer. Tôi truyền typed data và typed column definition vào useReactTable. Table kiểm soát sorting, filter, column visibility, pagination và các row model. Sau đó, tôi dùng flexRender để render header và cell vào semantic table component. Business cell, status badge và row action nằm trong feature column.

**Deep English follow-up**

- The query layer fetches RestaurantTable data. TanStack Table does not own server fetching.
- ColumnDef describes accessors, headers, cells, filters, and row actions with TypeScript types.
- Controlled React state stores sorting, filters, and visible columns.
- Row-model functions create the core, filtered, sorted, paginated, and faceted views.
- Shared toolbar and pagination components receive the table instance and do not know the restaurant business rules.
- The feature keeps status badges and action menus close to the table domain.

**Giải thích sâu bằng tiếng Việt**

- Query layer fetch RestaurantTable data. TanStack Table không sở hữu việc fetch server data.
- ColumnDef mô tả accessor, header, cell, filter và row action bằng TypeScript type.
- Controlled React state lưu sorting, filter và visible column.
- Các row-model function tạo core, filtered, sorted, paginated và faceted view.
- Toolbar và pagination dùng chung nhận table instance nhưng không biết business rule của nhà hàng.
- Feature giữ status badge và action menu gần table domain.

**Flow để hình dung**

    TanStack Query data
       → useReactTable(data, columns, controlled state)
       → Row-model pipeline
          → core
          → filter
          → sort
          → paginate
       → flexRender
       → shadcn TableHeader, TableBody, and TableCell

**Performance detail / Chi tiết performance**

> This table currently uses client-side row models, which is suitable for the current amount of data. For a very large dataset, I would move pagination, filtering, and sorting to the server and put those parameters in the query key. The current table component also isolates TanStack Table from React Compiler with use no memo because of library compatibility.

> Table hiện dùng client-side row model, phù hợp với lượng dữ liệu hiện tại. Với dataset rất lớn, tôi sẽ chuyển pagination, filtering và sorting sang server rồi đưa các parameter đó vào query key. Component hiện tại cũng tách TanStack Table khỏi React Compiler bằng use no memo vì compatibility của library.

**Code evidence**

- [TanStack Table setup and render](../../apps/management-app/src/features/tables/components/tables-table.tsx)
- [Typed table columns](../../apps/management-app/src/features/tables/components/tables-columns.tsx)
- [Table data query](../../apps/management-app/src/features/tables/hooks/use-tables-query.ts)

**Honest trade-off**

> TanStack Table is powerful, but it adds setup code. I use it for real data interaction. I would not use it for a small static table with only a few rows.

**Giới hạn nói thật**

> TanStack Table mạnh nhưng cần nhiều setup code. Tôi dùng nó khi table có data interaction thật. Tôi sẽ không dùng nó cho một static table nhỏ chỉ có vài row.

### 57. Can You Explain Staff Authentication and Authorization End to End? [SHOW-OFF P0]

**English question:** Can you explain staff authentication and authorization end to end?

**English answer — say this first**

> Staff sign in through Keycloak with NextAuth. NextAuth keeps a JWT session with the access token, refresh token, expiry, roles, tenant, and permissions. On the client, an auth hydrator reads the session and stores the token and profile in a small Zustand auth store. Protected queries wait for hydration. The API client then adds the bearer token and tenant header. Route checks improve navigation, but the BFF and backend still make the final authorization decision.

**Câu hỏi tiếng Việt:** Bạn có thể giải thích toàn bộ flow authentication và authorization của staff không?

**Câu trả lời tiếng Việt**

> Staff đăng nhập qua Keycloak với NextAuth. NextAuth giữ JWT session có access token, refresh token, thời gian hết hạn, role, tenant và permission. Ở client, auth hydrator đọc session rồi lưu token và profile vào một Zustand auth store nhỏ. Protected query đợi hydration hoàn tất. API client sau đó thêm bearer token và tenant header. Route check giúp điều hướng đúng, nhưng BFF và backend vẫn đưa ra quyết định authorization cuối cùng.

**Deep English follow-up**

1. The user opens the login page and NextAuth redirects the user to Keycloak.
2. After login, the JWT callback stores token data and gets the current profile from the Authorizer path.
3. Before expiry, NextAuth uses the refresh token to request a new access token.
4. The session callback exposes safe session fields to the application.
5. AuthSessionHydrator reads that session, fetches the internal profile, and fills the client auth store.
6. Feature queries use enabled and wait until the store has a token.
7. authApiClient adds Authorization and x-tenant-id to BFF requests.
8. The UI checks permissions for experience, while the BFF and services enforce security.

**Giải thích sâu bằng tiếng Việt**

1. User mở login page và NextAuth redirect user sang Keycloak.
2. Sau khi login, JWT callback lưu token data và lấy current profile qua Authorizer path.
3. Trước khi token hết hạn, NextAuth dùng refresh token để lấy access token mới.
4. Session callback expose các session field an toàn cho application.
5. AuthSessionHydrator đọc session, fetch internal profile rồi điền client auth store.
6. Feature query dùng enabled và đợi đến khi store có token.
7. authApiClient thêm Authorization và x-tenant-id vào BFF request.
8. UI kiểm tra permission để phục vụ user experience, còn BFF và service mới enforce security.

**Flow để hình dung**

    Staff
       → NextAuth
       → Keycloak login
       → Access and refresh token
       → NextAuth JWT session
       → AuthSessionHydrator
       → Zustand auth store
       → Query becomes enabled
       → authApiClient adds token and tenant
       → BFF guard
       → Backend authorization

**Authentication versus authorization / Phân biệt hai khái niệm**

> Authentication answers who the user is. Authorization answers what that user can do. A hidden button is not authorization. It is only a UI decision.

> Authentication trả lời user là ai. Authorization trả lời user được phép làm gì. Một button bị ẩn không phải là authorization; đó chỉ là quyết định ở UI.

**Code evidence**

- [NextAuth and Keycloak configuration](../../apps/management-app/src/auth.ts)
- [Client auth hydration](../../apps/management-app/src/components/auth/auth-session-hydrator.tsx)
- [Auth readiness guard for queries](../../apps/management-app/src/lib/auth/use-auth-ready.ts)
- [Authenticated BFF client](../../apps/management-app/src/lib/api/authenticated-client.ts)
- [Example permission helpers](../../apps/management-app/src/features/saas/permissions.ts)

**Honest trade-off**

> The current client API path needs the access token in client memory. That is practical for this architecture, but it increases the effect of an XSS issue. A stricter BFF session-cookie design could keep the access token away from browser JavaScript.

**Giới hạn nói thật**

> API path hiện tại cần access token trong client memory. Cách này thực tế với kiến trúc hiện tại, nhưng nó làm tăng ảnh hưởng nếu có lỗi XSS. Một BFF session-cookie design chặt hơn có thể giữ access token khỏi browser JavaScript.

### 58. What Does proxy.ts Do, and Is It the Main Security Layer? [FOLLOW-UP P1]

**English question:** What does proxy.ts do, and is it the main security layer?

**English answer — say this first**

> In the current Next.js project, proxy.ts handles route-level access before a page renders. It redirects signed-in users away from login, sends unauthenticated users to login, and checks whether a staff role can enter a protected route group. It is not the final security layer. API guards and backend permission checks still protect the data and actions.

**Câu hỏi tiếng Việt:** proxy.ts làm gì và nó có phải security layer chính không?

**Câu trả lời tiếng Việt**

> Trong Next.js project hiện tại, proxy.ts xử lý route-level access trước khi page render. Nó redirect user đã đăng nhập khỏi login page, đưa user chưa đăng nhập về login và kiểm tra staff role có được vào protected route group hay không. Nó không phải security layer cuối cùng. API guard và backend permission check vẫn bảo vệ dữ liệu và action.

**Deep English follow-up**

- The root route sends an authenticated role to its correct home area.
- Auth routes remain open for users without a session, but signed-in users are redirected away.
- Protected prefixes require a valid NextAuth session.
- Role-to-path rules stop a kitchen user from opening an admin route, for example.
- The matcher skips API routes, Next.js static files, images, the favicon, and asset files.
- Fine-grained permission checks still belong to the UI for experience and the backend for real security.

**Giải thích sâu bằng tiếng Việt**

- Root route đưa authenticated role về đúng home area.
- Auth route vẫn mở cho user chưa có session, nhưng user đã đăng nhập sẽ được redirect khỏi đó.
- Protected prefix yêu cầu NextAuth session hợp lệ.
- Role-to-path rule ngăn kitchen user mở admin route, chẳng hạn.
- Matcher bỏ qua API route, static file của Next.js, image, favicon và asset file.
- Fine-grained permission check vẫn thuộc UI về mặt experience và backend về mặt security thật.

**Flow để hình dung**

    Incoming page request
       → proxy.ts checks the path
       → Public path? Continue
       → Protected and no session? Redirect to login
       → Protected and wrong role? Redirect to role home
       → Allowed role? Render route
       → Later API request still passes BFF and backend guards

**Terminology note / Lưu ý cách gọi**

> In older Next.js versions, this pattern was commonly called middleware.ts. This project uses proxy.ts, so I would say “route proxy” or “the Next.js proxy layer.”

> Ở Next.js version cũ, pattern này thường được gọi là middleware.ts. Project hiện dùng proxy.ts nên tôi sẽ gọi là “route proxy” hoặc “Next.js proxy layer”.

**Code evidence**

- [Next.js route proxy](../../apps/management-app/src/proxy.ts)
- [Role routing rules](../../apps/management-app/src/lib/auth/role-routing.ts)
- [Route constants](../../apps/management-app/src/constants/routes.ts)

**Honest trade-off**

> Route checks are coarse. They are useful for navigation and early rejection, but they must never replace endpoint authorization.

**Giới hạn nói thật**

> Route check chỉ ở mức coarse-grained. Nó hữu ích cho navigation và reject sớm, nhưng không bao giờ được thay thế endpoint authorization.

### 59. Can You Walk Me Through the Customer QR Session Flow? [SHOW-OFF P0]

**English question:** Can you walk me through the customer QR session flow?

**English answer — say this first**

> The QR URL contains a tenant slug, table ID, and QR token. The app first resolves the tenant and validates the QR code. When the customer enters the menu, the app joins a table session. SessionProvider stores the session in React Context and local storage, and the API client starts sending the tenant and session headers. If the backend says the session is closed, the client clears it and returns to a safe state.

**Câu hỏi tiếng Việt:** Bạn có thể mô tả customer QR session flow không?

**Câu trả lời tiếng Việt**

> QR URL chứa tenant slug, table ID và QR token. App đầu tiên resolve tenant rồi validate QR code. Khi customer vào menu, app join một table session. SessionProvider lưu session trong React Context và local storage, còn API client bắt đầu gửi tenant header và session header. Nếu backend báo session đã đóng, client clear session và quay về safe state.

**Deep English follow-up**

1. React Router keeps the QR query parameters when the root route redirects to the landing page.
2. The landing feature reads tenant, table, and token from the URL.
3. If a tenant slug exists, a public request resolves it to the real tenant ID without sending a stale tenant header.
4. The app validates the table and QR token before it shows the enter-menu action.
5. The join request creates or returns the customer table session.
6. startSession stores sessionId, tenantId, table data, and restaurant data in Context and local storage.
7. The API client sends x-tenant-id and x-session-id for later requests.
8. On reload, SessionProvider restores the session before dependent features continue.
9. A 410 or SESSION_CLOSED response clears storage and dispatches an expiry event.

**Giải thích sâu bằng tiếng Việt**

1. React Router giữ lại QR query parameter khi root route redirect sang landing page.
2. Landing feature đọc tenant, table và token từ URL.
3. Nếu có tenant slug, public request resolve nó thành tenant ID thật mà không gửi stale tenant header.
4. App validate table và QR token trước khi hiển thị action vào menu.
5. Join request tạo hoặc trả về customer table session.
6. startSession lưu sessionId, tenantId, table data và restaurant data trong Context và local storage.
7. API client gửi x-tenant-id và x-session-id cho các request tiếp theo.
8. Khi reload, SessionProvider restore session trước khi các feature phụ thuộc tiếp tục.
9. Response 410 hoặc SESSION_CLOSED sẽ clear storage và phát expiry event.

**Flow để hình dung**

    Scan QR
       → /landing?tenant=...&table=...&token=...
       → Resolve tenant slug
       → Validate QR
       → Join table session
       → Save session in Context and local storage
       → Navigate to menu
       → Send tenant and session headers
       → Order, bill, and payment flows

    Backend returns session closed
       → API client clears stored session
       → Browser event notifies SessionProvider
       → UI returns to a safe no-session state

**Important distinction / Phân biệt quan trọng**

> This is a customer business session, not a staff identity login. The customer does not receive staff roles or permissions.

> Đây là business session của customer, không phải staff identity login. Customer không nhận staff role hoặc permission.

**Code evidence**

- [QR landing flow](../../apps/customer-pwa/src/features/landing/components/qr-landing-card.tsx)
- [Tenant resolver hook](../../apps/customer-pwa/src/features/landing/hooks/use-resolve-tenant.ts)
- [Session API service](../../apps/customer-pwa/src/features/landing/services/session.service.ts)
- [Customer SessionProvider](../../apps/customer-pwa/src/features/session/context/session-provider.tsx)
- [Customer API header and expiry handling](../../apps/customer-pwa/src/lib/api-client.ts)

**Honest trade-off**

> Local storage gives session recovery after reload, but it is browser-managed state. The backend must still validate every session and tenant request. The client headers alone are not proof of permission.

**Giới hạn nói thật**

> Local storage giúp restore session sau khi reload, nhưng đây vẫn là browser-managed state. Backend phải validate mọi session và tenant request. Chỉ có client header không phải bằng chứng về permission.

### 60. Can You Explain One Complete REST and Realtime Data Flow? [SHOW-OFF P0]

**English question:** Can you explain one complete REST and realtime data flow?

**English answer — say this first**

> REST gives us the main data, and Socket.io tells us when that data may be stale. For example, after an order status changes, the backend sends a scoped event. The client checks the tenant, session, or order ID. Then it invalidates the matching TanStack Query key. React Query fetches the latest server state, updates the cache, and React renders the new status.

**Câu hỏi tiếng Việt:** Bạn có thể giải thích một REST và realtime data flow hoàn chỉnh không?

**Câu trả lời tiếng Việt**

> REST cung cấp dữ liệu chính, còn Socket.io báo khi dữ liệu đó có thể đã cũ. Ví dụ, sau khi order status thay đổi, backend gửi một scoped event. Client kiểm tra tenant, session hoặc order ID. Sau đó, nó invalidate TanStack Query key phù hợp. React Query fetch server state mới nhất, update cache và React render status mới.

**Deep English follow-up**

1. The page starts a query and receives an order snapshot through the BFF.
2. TanStack Query stores that snapshot and gives it to the UI.
3. Another actor changes the order, such as kitchen staff marking an item ready.
4. The backend processes the command and the BFF sends a Socket.io event to the related client scope.
5. The event handler rejects events for another tenant or session.
6. The handler invalidates the exact detail or related list key.
7. React Query refetches and replaces stale cache data with the server response.
8. On reconnect, browser focus, or online recovery, important customer queries are invalidated again.
9. The effect cleanup removes socket and browser listeners to prevent duplicate handlers.

**Giải thích sâu bằng tiếng Việt**

1. Page bắt đầu query và nhận order snapshot qua BFF.
2. TanStack Query lưu snapshot rồi cung cấp nó cho UI.
3. Một actor khác thay đổi order, ví dụ kitchen staff đánh dấu món đã sẵn sàng.
4. Backend xử lý command và BFF gửi Socket.io event đến client scope liên quan.
5. Event handler loại event thuộc tenant hoặc session khác.
6. Handler invalidate đúng detail key hoặc list key liên quan.
7. React Query refetch rồi thay stale cache data bằng server response.
8. Khi reconnect, browser focus hoặc online recovery, các customer query quan trọng được invalidate lại.
9. Effect cleanup gỡ socket listener và browser listener để tránh handler bị đăng ký trùng.

**Flow để hình dung**

    Initial read:
    UI → Query hook → REST → BFF → Service → Response → Query cache → UI

    Later change:
    Another actor → Backend state changes → Socket.io event
       → Scope check
       → Query invalidation
       → REST refetch
       → Fresh cache
       → UI rerender

**Why not patch every event / Vì sao không patch mọi event**

> I patch the cache only when the event contains enough trusted data. If the event is only a notification, invalidation is safer because the server remains the source of truth.

> Tôi chỉ patch cache khi event chứa đủ dữ liệu đáng tin cậy. Nếu event chỉ là notification, invalidation an toàn hơn vì server vẫn là source of truth.

**Code evidence**

- [Customer realtime lifecycle](../../apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts)
- [Customer query keys](../../apps/customer-pwa/src/features/order/hooks/order-query-keys.ts)
- [Staff realtime lifecycle](../../apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts)
- [Customer cart query and mutation](../../apps/customer-pwa/src/features/order/hooks/use-cart-query.ts)

**Honest trade-off**

> Realtime can reduce visible delay, but it cannot guarantee that the browser saw every event. The REST refetch and reconnect recovery make the UI converge to the backend state.

**Giới hạn nói thật**

> Realtime giúp giảm độ trễ nhìn thấy, nhưng không thể đảm bảo browser nhận mọi event. REST refetch và reconnect recovery giúp UI cuối cùng hội tụ về backend state.

### 61. How Are the Two Frontend Apps Built and Deployed? [OPTIONAL P2]

**English question:** How are the two frontend apps built and deployed?

**English answer — say this first**

> Nx gives each app its own build target. The Management App builds as a Next.js standalone server and runs with Node. The Customer App builds as static Vite files and is served by Nginx. Both use multi-stage Docker builds, so build dependencies do not stay in the final runtime image. The two apps can be deployed independently even though they share one monorepo.

**Câu hỏi tiếng Việt:** Hai frontend app được build và deploy như thế nào?

**Câu trả lời tiếng Việt**

> Nx cung cấp build target riêng cho từng app. Management App build thành Next.js standalone server và chạy bằng Node. Customer App build thành static file của Vite rồi được Nginx phục vụ. Cả hai dùng multi-stage Docker build nên build dependency không nằm trong runtime image cuối. Hai app có thể deploy độc lập dù cùng nằm trong một monorepo.

**Deep English follow-up**

- Nx keeps serve, build, start, preview, lint, and test commands close to each project.
- The Management image builds Next.js, copies the standalone output and static assets, and runs as a non-root user.
- The Customer image builds the Vite dist folder and copies it into a small Nginx runtime image.
- Next.js needs runtime values for server auth and BFF communication. Public Next and Vite values are also injected at build time where required.
- Docker Compose gives each app a separate service and health check.

**Giải thích sâu bằng tiếng Việt**

- Nx giữ các command serve, build, start, preview, lint và test gần từng project.
- Management image build Next.js, copy standalone output và static asset rồi chạy bằng non-root user.
- Customer image build Vite dist folder rồi copy nó vào Nginx runtime image nhỏ.
- Next.js cần runtime value cho server auth và giao tiếp BFF. Public value của Next và Vite cũng được inject ở build time khi cần.
- Docker Compose tạo service và health check riêng cho từng app.

**Flow để hình dung**

    Nx project target
       → Install shared workspace dependencies
       → Build only the selected frontend app
       → Copy production output into a smaller runtime image

    Management App → Next.js standalone → Node runtime
    Customer App   → Vite dist          → Nginx runtime

**Code evidence**

- [Management Nx targets](../../apps/management-app/project.json)
- [Customer Nx targets](../../apps/customer-pwa/project.json)
- [Management Docker build](../../docker/management-app.Dockerfile)
- [Customer Docker build](../../docker/customer-pwa.Dockerfile)
- [Application Compose services](../../docker-compose.app.yaml)

**Honest trade-off**

> A monorepo makes shared changes easier, but one dependency graph can affect more projects. Nx targets and separate images help keep build and deployment boundaries clear.

**Giới hạn nói thật**

> Monorepo giúp shared change dễ hơn, nhưng một dependency graph có thể ảnh hưởng nhiều project hơn. Nx target và image riêng giúp build và deployment boundary rõ ràng.

## Personal Contribution Guardrail / Cách Nói Đúng Về Đóng Góp Cá Nhân

Trước phỏng vấn, đánh dấu mỗi feature theo một trong bốn nhóm:

- **Implemented directly:** Quân trực tiếp code và có thể mở đúng file.
- **Designed together:** hai thành viên cùng thống nhất cách làm.
- **Reviewed or integrated:** teammate code chính; Quân review hoặc tích hợp contract.
- **Proposed improvement:** ý tưởng cải thiện, chưa có trong code.

**Safe English answer**

> This was a two-person project. I directly worked on […], and we designed […] together. My teammate mainly implemented […], but I reviewed or integrated that part and understand how it works with the system.

**Bản tiếng Việt**

> Đây là dự án hai người. Tôi trực tiếp làm […], và chúng tôi cùng thiết kế […]. Teammate của tôi implement chính phần […], nhưng tôi đã review hoặc tích hợp phần đó và hiểu nó hoạt động với hệ thống thế nào.

## Code Evidence Index / File Dùng Để Ôn Trước Phỏng Vấn

| Topic                    | Current evidence                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Query defaults           | [Shared config](../../libs/shared/constants/src/lib/config.ts), [Customer QueryClient](../../apps/customer-pwa/src/main.tsx)                                                                                                                                 |
| shadcn and Tailwind      | [Management config](../../apps/management-app/components.json), [Customer config](../../apps/customer-pwa/components.json), [Shared frontend UI](../../libs/frontend/ui/src/index.ts)                                                                        |
| Tables feature layers    | [Query keys](../../apps/management-app/src/features/tables/table-keys.ts), [Query hooks](../../apps/management-app/src/features/tables/hooks/use-tables-query.ts), [Typed service](../../apps/management-app/src/features/tables/services/tables.service.ts) |
| Staff route protection   | [Route proxy](../../apps/management-app/src/proxy.ts), [Role routing](../../apps/management-app/src/lib/auth/role-routing.ts)                                                                                                                                |
| Frontend deployment      | [Management Dockerfile](../../docker/management-app.Dockerfile), [Customer Dockerfile](../../docker/customer-pwa.Dockerfile), [Compose services](../../docker-compose.app.yaml)                                                                              |
| App dependencies         | [`management-app/package.json`](../../apps/management-app/package.json), [`customer-pwa/package.json`](../../apps/customer-pwa/package.json)                                                                                                                 |
| Root providers           | [`providers.tsx`](../../apps/management-app/src/app/providers.tsx)                                                                                                                                                                                           |
| Public server rendering  | [`app/page.tsx`](../../apps/management-app/src/app/page.tsx), [`landing-api.ts`](../../apps/management-app/src/features/landing/landing-api.ts)                                                                                                              |
| Customer routing         | [`App.tsx`](../../apps/customer-pwa/src/App.tsx), [`main.tsx`](../../apps/customer-pwa/src/main.tsx)                                                                                                                                                         |
| Staff Query lifecycle    | [`use-order-query.ts`](../../apps/management-app/src/features/order/hooks/use-order-query.ts)                                                                                                                                                                |
| Customer optimistic cart | [`use-cart-query.ts`](../../apps/customer-pwa/src/features/order/hooks/use-cart-query.ts), [`cart-optimistic.ts`](../../apps/customer-pwa/src/features/order/hooks/cart-optimistic.ts)                                                                       |
| Customer session         | [`session-provider.tsx`](../../apps/customer-pwa/src/features/session/context/session-provider.tsx)                                                                                                                                                          |
| Staff auth               | [`auth.ts`](../../apps/management-app/src/auth.ts), [`auth-session-hydrator.tsx`](../../apps/management-app/src/components/auth/auth-session-hydrator.tsx)                                                                                                   |
| Staff realtime           | [`use-staff-order-realtime.ts`](../../apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts)                                                                                                                                              |
| Customer realtime        | [`use-customer-order-realtime.ts`](../../apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts)                                                                                                                                          |
| KDS realtime             | [`use-kds-realtime.ts`](../../apps/management-app/src/features/kds/hooks/use-kds-realtime.ts)                                                                                                                                                                |
| KDS adapter              | [`use-kds-board-adapter.ts`](../../apps/management-app/src/features/kds/hooks/use-kds-board-adapter.ts)                                                                                                                                                      |
| Table engine             | [`tables-table.tsx`](../../apps/management-app/src/features/tables/components/tables-table.tsx)                                                                                                                                                              |
| POS virtualization       | [`live-orders-table.tsx`](../../apps/management-app/src/features/pos/components/live-orders-table.tsx)                                                                                                                                                       |
| Customer API scope       | [`api-client.ts`](../../apps/customer-pwa/src/lib/api-client.ts)                                                                                                                                                                                             |
| Staff API scope          | [`authenticated-client.ts`](../../apps/management-app/src/lib/api/authenticated-client.ts)                                                                                                                                                                   |
