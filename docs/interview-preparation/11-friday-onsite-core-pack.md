# Friday Onsite Core Pack — React, Next.js, Project, and Team Fit

> Đây là **tài liệu học chính** cho vòng onsite tại VILIHA. Hãy hoàn thành file này trước khi mở các answer bank khác.
>
> Trọng tâm đã được cập nhật theo thông tin từ anh Quý: React/Next.js fundamentals, component design, code organization, API calls, state management, build optimization, Figma–shadcn workflow, kinh nghiệm thật trong QRTable và team fit.

## How to Use This File / Cách Học File Này

Bạn không cần học thuộc từng paragraph. Hãy luyện theo ba vòng:

1. Đọc bản tiếng Việt để hiểu logic.
2. Nhìn phần **Keywords** rồi tự nói lại bằng English.
3. Đổi cách hỏi và trả lời lại bằng những câu ngắn khác.

Mỗi câu technical nên dài khoảng 30–60 giây. Khung trả lời đơn giản nhất là:

```text
Direct answer → Main reason → QRTable example → Stop
```

Nói `I` cho phần bạn trực tiếp làm, `we` cho quyết định của team và `I would` cho hướng cải thiện chưa triển khai. Word-by-word được chấp nhận, nhưng mỗi câu vẫn nên có chủ ngữ và động từ.

---

# Part A — Self-Introduction

## Tell Me About Yourself

**Simple English answer**

> Hello, my name is Vo Dinh Minh Quan, and you can call me Minh. I am a final-year Information Systems student at UIT, and I recently completed my graduation thesis defense. My thesis project is QRTable, a SaaS POS and QR ordering platform with a NestJS microservices backend and two frontend applications. I worked on both frontend and backend, but I focused more on the frontend, including component structure, API integration, state management, complex tables, and realtime updates. I am looking for a frontend-focused full-time role, and I can start immediately.

**Câu hỏi tiếng Việt:** Bạn có thể giới thiệu ngắn gọn về bản thân không?

**Câu trả lời tiếng Việt**

> Tôi tên là Võ Đình Minh Quân và mọi người có thể gọi tôi là Minh. Tôi là sinh viên năm cuối ngành Hệ thống Thông tin tại UIT và vừa hoàn thành bảo vệ khóa luận tốt nghiệp. Dự án khóa luận của tôi là QRTable, một nền tảng SaaS POS và đặt món bằng QR với backend Microservices bằng NestJS cùng hai frontend application. Tôi làm cả Frontend và Backend nhưng tập trung nhiều hơn vào Frontend, gồm component structure, API integration, state management, complex table và realtime update. Tôi đang tìm một vị trí full-time tập trung Frontend và có thể bắt đầu ngay.

**Keywords:** `final-year UIT` → `thesis defense` → `QRTable` → `microservices` → `two frontend apps` → `frontend-focused`

---

# Part B — 12 Core Technical Questions

## 1. What Is the Difference Between React and Next.js, and Why Does QRTable Use Both?

**Simple English answer**

> React is a library for building user interfaces and components. Next.js is a framework built on React, so it adds a project structure and features such as file-based routing, layouts, Server Components, and server rendering. We use Next.js for the Management App because it has many product areas, routes, layouts, and roles. We use React with Vite for the Customer App because it is a smaller mobile ordering flow. We chose each tool based on the product, not because one tool is always better.

**Câu hỏi tiếng Việt:** React khác Next.js như thế nào và vì sao QRTable sử dụng cả hai?

**Câu trả lời tiếng Việt**

> React là library để xây dựng user interface và component. Next.js là framework được xây trên React nên bổ sung project structure cùng các tính năng như file-based routing, layout, Server Component và server rendering. Chúng tôi dùng Next.js cho Management App vì app này có nhiều product area, route, layout và role. Customer App dùng React với Vite vì đây là mobile ordering flow nhỏ và tập trung hơn. Chúng tôi chọn công nghệ dựa trên nhu cầu của từng product, không phải vì một công nghệ luôn tốt hơn công nghệ còn lại.

**Keywords:** `library` → `framework` → `Management App` → `Customer App` → `choose by product`

## 2. How Do You Create a Good Reusable React Component?

**Simple English answer**

> When I create a component, I start with one clear responsibility. I define typed props and decide whether the component or its parent should own the state. I also handle important states such as loading, empty, error, disabled, and success. I prefer composition, and I reuse shadcn primitives when they fit the design. I extract a shared component only when it has a clear reusable purpose, because making everything generic too early can make the code harder to understand.

**Câu hỏi tiếng Việt:** Bạn tạo một React component tốt và có thể tái sử dụng như thế nào?

**Câu trả lời tiếng Việt**

> Khi tạo component, đầu tiên tôi xác định một responsibility rõ ràng cho nó. Tôi định nghĩa typed props và quyết định component hay parent sẽ sở hữu state. Tôi cũng xử lý các trạng thái quan trọng như loading, empty, error, disabled và success. Tôi ưu tiên composition và tái sử dụng shadcn primitive khi phù hợp với design. Tôi chỉ extract shared component khi nó có mục đích tái sử dụng rõ ràng, vì generic hóa mọi thứ quá sớm có thể làm code khó hiểu hơn.

**QRTable example:** Table primitive và dialog primitive có thể dùng chung; column, status badge và row action mang business rule thì nằm trong feature.

## 3. What Causes a React Component to Render, and How Do You Avoid Unnecessary Work?

**Simple English answer**

> A component can render when its state changes, when it receives new props or context, or when its parent renders. I keep state close to the component that needs it, and I do not store values that I can calculate from existing data. I use `useEffect` to synchronize with an external system, not for every calculation. If a screen is slow, I measure it first. Then I can split a large component, use stable keys, or memoize expensive work when there is a real benefit.

**Câu hỏi tiếng Việt:** Điều gì làm React component render và bạn tránh công việc không cần thiết như thế nào?

**Câu trả lời tiếng Việt**

> Component có thể render khi state thay đổi, khi nhận props hoặc context mới, hoặc khi parent render. Tôi giữ state gần component thật sự cần nó và không lưu những value có thể tính từ dữ liệu hiện có. Tôi dùng `useEffect` để đồng bộ với external system, không dùng nó cho mọi phép tính. Nếu một screen chậm, tôi đo trước. Sau đó tôi mới tách component lớn, dùng key ổn định hoặc memoize phần tính toán nặng khi thật sự có lợi.

**Mindset:** `measure first` → `state ownership` → `remove derived state` → `optimize the real bottleneck`

## 4. How Do You Organize a Frontend Feature from Route to API?

**Simple English answer**

> We mainly organize the frontend by business feature. A route or page chooses the feature screen. The feature component owns the user flow and visual composition. A query or state hook owns data behavior, a key factory identifies cached data, and a typed service calls the API. A shared API client handles common headers and errors. Not every feature needs every folder; I add a layer only when it has a clear responsibility.

**Câu hỏi tiếng Việt:** Bạn tổ chức một frontend feature từ route đến API như thế nào?

**Câu trả lời tiếng Việt**

> Chúng tôi chủ yếu tổ chức frontend theo business feature. Route hoặc page quyết định feature screen nào được hiển thị. Feature component sở hữu user flow và visual composition. Query hoặc state hook sở hữu data behavior, key factory định danh dữ liệu cache và typed service gọi API. Shared API client xử lý header và error dùng chung. Không phải feature nào cũng cần mọi folder; tôi chỉ thêm một layer khi nó có responsibility rõ ràng.

**QRTable flow**

```text
route/page
  → feature screen
  → component
  → query or state hook
  → query keys + typed service
  → shared API client
  → BFF
```

## 5. Explain Server Components, Client Components, and `'use client'`

**Simple English answer**

> A Server Component runs on the server and is useful for reading data, rendering static content, and reducing client JavaScript. A Client Component is needed for state, effects, event handlers, and browser APIs. The `'use client'` directive starts a client boundary, so I place it close to the interactive part instead of putting it on every file. In QRTable, the public landing page can fetch and render on the server. POS and KDS are client-heavy because they use sockets, mutations, timers, filters, and user actions.

**Câu hỏi tiếng Việt:** Hãy giải thích Server Component, Client Component và `'use client'`.

**Câu trả lời tiếng Việt**

> Server Component chạy ở server, phù hợp để đọc dữ liệu, render static content và giảm JavaScript gửi xuống client. Client Component cần thiết cho state, effect, event handler và browser API. Directive `'use client'` bắt đầu một client boundary nên tôi đặt nó gần phần có tương tác thay vì thêm vào mọi file. Trong QRTable, public landing page có thể fetch và render ở server. POS và KDS thiên về client vì dùng socket, mutation, timer, filter và user action.

**Honest limit:** QRTable chưa dùng rộng rãi TanStack Query server prefetch/hydration cho các operational screen.

## 6. When Do You Fetch on the Server, and When Do You Use TanStack Query?

**Simple English answer**

> I first ask when the user needs the data and how often the data changes. I fetch on the server when the data is useful for the initial HTML, public content, or a read-heavy page. I use TanStack Query when the client needs caching, refetching, mutations, filters, or realtime recovery. In QRTable, the landing page fetches public data on the server, while POS, KDS, menu, and order screens use TanStack Query. The component calls a hook, the hook calls a typed service, and the service calls the BFF.

**Câu hỏi tiếng Việt:** Khi nào bạn fetch data ở server và khi nào dùng TanStack Query?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi xác định khi nào user cần dữ liệu và dữ liệu thay đổi thường xuyên đến mức nào. Tôi fetch ở server khi dữ liệu hữu ích cho initial HTML, public content hoặc page chủ yếu dùng để đọc. Tôi dùng TanStack Query khi client cần cache, refetch, mutation, filter hoặc realtime recovery. Trong QRTable, landing page fetch public data ở server, còn POS, KDS, menu và order screen dùng TanStack Query. Component gọi hook, hook gọi typed service và service gọi BFF.

**Keywords:** `initial HTML` → `interactive data` → `Query lifecycle` → `hook` → `service` → `BFF`

## 7. How Do You Decide Where Frontend State Should Live?

**Simple English answer**

> I start by asking who owns the state and what the source of truth is. TanStack Query owns API data. Local state owns one small interaction, and URL state is useful for filters or pages that users may share or bookmark. Context is enough for simple state shared inside one subtree, while Zustand is useful for small client-owned state used by separate components. In QRTable, the Customer App uses `SessionProvider` for the customer session, TanStack Query for cart, order, and bill data, and the Management App uses Zustand for selected UI state. I avoid copying the same API data into another store.

**Câu hỏi tiếng Việt:** Bạn quyết định frontend state nên nằm ở đâu như thế nào?

**Câu trả lời tiếng Việt**

> Tôi bắt đầu bằng việc xác định ai sở hữu state và source of truth nằm ở đâu. TanStack Query sở hữu API data. Local state sở hữu một interaction nhỏ, còn URL state phù hợp với filter hoặc page cần chia sẻ hay bookmark. Context đủ dùng cho state đơn giản trong một subtree, còn Zustand phù hợp với client-owned state nhỏ được nhiều component tách biệt sử dụng. Trong QRTable, Customer App dùng `SessionProvider` cho customer session, TanStack Query cho cart, order và bill; Management App dùng Zustand cho một số selected UI state. Tôi tránh copy cùng API data sang một store khác.

**Rule:** `server data ≠ global client store`

## 8. How Did You Set Up and Use TanStack Query in QRTable?

**Simple English answer**

> Each frontend app creates one `QueryClient` near its root and provides it to feature hooks. Our shared default `staleTime` is sixty seconds, and window-focus refetch is off by default. Each feature uses a query-key factory, a typed service, and query or mutation hooks. Protected staff queries wait until authentication is ready. After a mutation, we update a known cache value or invalidate the smallest related query. This gives the UI one place for data, loading, error, and refresh behavior.

**Câu hỏi tiếng Việt:** Bạn setup và sử dụng TanStack Query trong QRTable như thế nào?

**Câu trả lời tiếng Việt**

> Mỗi frontend app tạo một `QueryClient` gần root rồi cung cấp nó cho các feature hook. Default `staleTime` dùng chung là 60 giây và mặc định không refetch khi window focus. Mỗi feature dùng query-key factory, typed service và query hoặc mutation hook. Protected staff query đợi authentication sẵn sàng. Sau mutation, chúng tôi update cache khi biết chắc dữ liệu mới hoặc invalidate query liên quan nhỏ nhất. Nhờ vậy UI có một nơi quản lý data, loading, error và refresh behavior.

**Honest limit:** Một số staff key hiện giả định một active tenant; nếu hỗ trợ tenant switching trong cùng session, cache scope cần được kiểm tra lại.

## 9. How Did You Build Complex Tables with TanStack Table and shadcn/ui?

**Simple English answer**

> TanStack Table is the headless behavior layer, and shadcn Table is the visual layer. TanStack Query provides the server data. I pass typed data and typed column definitions to `useReactTable`, and controlled state manages sorting, filters, column visibility, and pagination. Then `flexRender` renders the headers and cells into semantic table components. Business cells and row actions stay inside the feature. For a very large dataset, I would move sorting, filtering, and pagination to the server.

**Câu hỏi tiếng Việt:** Bạn xây complex table bằng TanStack Table và shadcn/ui như thế nào?

**Câu trả lời tiếng Việt**

> TanStack Table là headless behavior layer, còn shadcn Table là visual layer. TanStack Query cung cấp server data. Tôi truyền typed data và typed column definition vào `useReactTable`; controlled state quản lý sorting, filter, column visibility và pagination. Sau đó `flexRender` render header và cell vào semantic table component. Business cell và row action nằm trong feature. Với dataset rất lớn, tôi sẽ chuyển sorting, filtering và pagination sang server.

**Trade-off:** TanStack Table phù hợp với data interaction phức tạp; một static table nhỏ không cần nhiều setup như vậy.

## 10. How Do You Translate a Figma Design into Tailwind and shadcn/ui Code?

**Simple English answer**

> First, I inspect the user flow, layout, spacing, colors, typography, reusable components, breakpoints, and UI states in Figma. Then I map repeated values to design tokens and build the structure with semantic elements, Tailwind utilities, and suitable shadcn primitives. I keep business-specific behavior in a feature component instead of changing a shared primitive for one screen. I compare the result at important viewport sizes and test loading, empty, error, and long-content states. At GEEK Up, I used this process to translate Figma designs into responsive React interfaces.

**Câu hỏi tiếng Việt:** Bạn chuyển một Figma design thành code bằng Tailwind và shadcn/ui như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi xem user flow, layout, spacing, color, typography, reusable component, breakpoint và UI state trong Figma. Sau đó tôi map những value lặp lại thành design token rồi xây structure bằng semantic element, Tailwind utility và shadcn primitive phù hợp. Tôi giữ behavior theo business trong feature component thay vì sửa shared primitive chỉ để phục vụ một screen. Tôi so sánh kết quả ở các viewport quan trọng và kiểm tra loading, empty, error cùng long-content state. Tại GEEK Up, tôi đã dùng quy trình này để chuyển Figma design thành responsive React interface.

**Keywords:** `inspect` → `tokens` → `compose` → `responsive` → `compare`

## 11. How Do You Optimize Next.js Build Time and Runtime Performance?

**Simple English answer**

> First, I confirm whether the problem is development or build time, or runtime performance in the browser. For build time, I measure the slow step, use Turbopack, reuse Next.js and Nx caches, avoid expensive barrel imports, keep Tailwind scanning narrow, and transpile only the packages that need it. For runtime, I check the Server and Client Component boundary, client bundle size, network requests, React rendering, and heavy code that can load later. QRTable already uses an Nx workspace and configures Turbopack for the Management App. I would measure the current build and verify the cache before claiming that one change makes it faster.

**Câu hỏi tiếng Việt:** Bạn tối ưu Next.js build time và runtime performance như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi xác nhận vấn đề nằm ở development/build time hay runtime performance trong browser. Với build time, tôi đo bước đang chậm, dùng Turbopack, tái sử dụng Next.js và Nx cache, tránh barrel import tốn kém, giới hạn phạm vi Tailwind scan và chỉ transpile package thật sự cần. Với runtime, tôi kiểm tra Server/Client Component boundary, client bundle size, network request, React rendering và phần code nặng có thể load sau. QRTable đã dùng Nx workspace và cấu hình Turbopack cho Management App. Tôi sẽ đo build hiện tại và kiểm tra cache trước khi claim rằng một thay đổi làm nó nhanh hơn.

**Useful clarification:** “Do you mean development and build time, or runtime performance in the browser?”

## 12. Can You Walk Me Through One Complete QRTable Frontend Flow?

**Simple English answer**

> A user action starts inside a feature component and calls a query mutation hook. The hook calls a typed service, and the service uses the shared API client to send the token, tenant, or customer session to the BFF. The BFF checks the request and routes it to the correct NestJS microservice. The response updates or invalidates the TanStack Query cache, and React renders the new state. If another actor changes the data later, Socket.io sends a scoped event, the client checks the related IDs, and the correct query refetches. The browser never needs to know the address of every microservice.

**Câu hỏi tiếng Việt:** Bạn có thể mô tả một frontend flow hoàn chỉnh trong QRTable không?

**Câu trả lời tiếng Việt**

> User action bắt đầu trong feature component rồi gọi query mutation hook. Hook gọi typed service và service dùng shared API client để gửi token, tenant hoặc customer session đến BFF. BFF kiểm tra request rồi route nó đến NestJS microservice phù hợp. Response update hoặc invalidate TanStack Query cache và React render state mới. Nếu một actor khác thay đổi dữ liệu sau đó, Socket.io gửi scoped event, client kiểm tra các ID liên quan rồi đúng query sẽ refetch. Browser không cần biết địa chỉ của từng microservice.

**Flow**

```text
User action
  → Feature component
  → Query mutation hook
  → Typed service
  → Shared API client
  → BFF
  → NestJS microservice
  → Response
  → Query cache
  → UI

Later change
  → Socket.io event
  → Scope check
  → Query invalidation
  → REST refetch
  → Fresh UI
```

---

# Part C — Five Short Follow-Ups

> Chỉ học phần này sau 12 câu core. Mỗi answer chỉ cần khoảng 15–30 giây.

## 1. What Is Hydration?

**Simple English answer**

> Hydration is the process where React takes the HTML generated by the server and connects it with JavaScript in the browser. The server HTML lets the user see the page early. After JavaScript loads, React attaches event handlers and restores interactive state, so buttons and forms can work.

**Câu hỏi tiếng Việt:** Hydration là gì?

**Câu trả lời tiếng Việt**

> Hydration là quá trình React lấy HTML được tạo từ server và kết nối nó với JavaScript trong browser. HTML từ server giúp user nhìn thấy page sớm. Sau khi JavaScript tải xong, React gắn event handler và khôi phục interactive state để button, form cùng các tương tác khác hoạt động.

## 2. How Do You Choose Between SSR, SSG, ISR, and CSR?

**Simple English answer**

> I choose based on data freshness, SEO, user-specific data, and interaction. SSR renders for a request, SSG builds reusable static output, ISR refreshes static output later, and CSR renders the main data in the browser. I do not choose one strategy for every page.

**Câu hỏi tiếng Việt:** Bạn chọn SSR, SSG, ISR và CSR như thế nào?

**Câu trả lời tiếng Việt**

> Tôi chọn dựa trên độ mới của dữ liệu, SEO, dữ liệu riêng theo user và mức độ tương tác. SSR render theo request, SSG build static output có thể tái sử dụng, ISR cập nhật lại static output sau đó, còn CSR render dữ liệu chính trong browser. Tôi không dùng một strategy cho mọi page.

## 3. What Are Query Keys, `staleTime`, and Invalidation?

**Simple English answer**

> A query key identifies cached data and includes the values that change the result. `staleTime` says how long the data is considered fresh. Invalidation marks matching data as stale so an active query can fetch the latest server result.

**Câu hỏi tiếng Việt:** Query key, `staleTime` và invalidation là gì?

**Câu trả lời tiếng Việt**

> Query key định danh dữ liệu trong cache và chứa các value làm thay đổi kết quả. `staleTime` cho biết dữ liệu được xem là fresh trong bao lâu. Invalidation đánh dấu dữ liệu phù hợp là stale để active query có thể lấy kết quả mới từ server.

## 4. How Do Socket.io and TanStack Query Work Together?

**Simple English answer**

> REST gives the client the main data, and Socket.io tells the client that the data may have changed. The event handler checks its scope and invalidates the related query. TanStack Query then refetches the latest server state.

**Câu hỏi tiếng Việt:** Socket.io và TanStack Query phối hợp như thế nào?

**Câu trả lời tiếng Việt**

> REST cung cấp dữ liệu chính cho client, còn Socket.io báo rằng dữ liệu có thể đã thay đổi. Event handler kiểm tra scope rồi invalidate query liên quan. TanStack Query sau đó refetch server state mới nhất.

## 5. What Does Clean and Maintainable Frontend Code Mean to You?

**Simple English answer**

> Clean frontend code has clear responsibilities, predictable data flow, useful types, and consistent names. I remove duplication when the shared meaning is stable, but I do not create a generic abstraction after the first similar line. I also keep API details away from presentational components and make important UI states explicit.

**Câu hỏi tiếng Việt:** Clean và maintainable frontend code có ý nghĩa gì với bạn?

**Câu trả lời tiếng Việt**

> Clean frontend code có responsibility rõ ràng, data flow dễ dự đoán, type hữu ích và naming nhất quán. Tôi loại bỏ duplication khi phần meaning dùng chung đã ổn định, nhưng không tạo generic abstraction ngay sau một đoạn code giống nhau đầu tiên. Tôi cũng tách API detail khỏi presentational component và thể hiện rõ các UI state quan trọng.

---

# Part D — Four Team-Fit Questions

## 1. How Do You Learn a New Technology?

**Simple English answer**

> I start with the official documentation because I want to understand the core idea and the correct API. Then I build a small example and use the technology in a real feature. When I get stuck, I search for the relevant documentation or a focused example. I can use AI to speed up research at work, but I do not depend on it. I check the source, run the code, and keep only the result that I can explain.

**Câu hỏi tiếng Việt:** Bạn học một công nghệ mới như thế nào?

**Câu trả lời tiếng Việt**

> Tôi bắt đầu bằng official documentation vì muốn hiểu core idea và API chính xác. Sau đó tôi làm một example nhỏ rồi áp dụng công nghệ vào feature thật. Khi bị vướng, tôi tìm documentation hoặc example tập trung vào đúng vấn đề. Tôi có thể dùng AI để tăng tốc research trong công việc nhưng không phụ thuộc hoàn toàn vào nó. Tôi kiểm tra source, chạy code và chỉ giữ kết quả mà mình có thể giải thích.

## 2. What Do You Do When You Are Blocked or a Requirement Changes?

**Simple English answer**

> First, I identify the exact blocker instead of saying that the whole feature does not work. I read the error, inspect the related code, check the documentation, and make a small reproduction when useful. If I still need help, I explain what I tried and ask one clear question. When a requirement changes, I confirm the new goal and tell the team which flow, API, state, and delivery time may change.

**Câu hỏi tiếng Việt:** Bạn làm gì khi bị blocked hoặc requirement thay đổi?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi xác định blocker chính xác thay vì chỉ nói cả feature không hoạt động. Tôi đọc error, kiểm tra code liên quan, xem documentation và tạo một reproduction nhỏ khi cần. Nếu vẫn cần trợ giúp, tôi nói rõ mình đã thử gì rồi đặt một câu hỏi cụ thể. Khi requirement thay đổi, tôi xác nhận goal mới và báo team flow, API, state cùng delivery time nào có thể bị ảnh hưởng.

## 3. Why Do You Want to Work in a Startup Team?

**Simple English answer**

> I like working close to the product and seeing how my work affects users. I understand that a startup can change quickly and may need me to learn unfamiliar tools. I do not expect to receive only tasks that I already know. I am willing to ask questions, share progress, and take responsibility for a complete feature. I see this environment as a good place to contribute and grow.

**Câu hỏi tiếng Việt:** Vì sao bạn muốn làm việc trong startup team?

**Câu trả lời tiếng Việt**

> Tôi thích làm việc gần product và thấy công việc của mình ảnh hưởng đến user như thế nào. Tôi hiểu startup có thể thay đổi nhanh và đôi lúc cần tôi học tool chưa quen. Tôi không kỳ vọng chỉ nhận những task mình đã biết. Tôi sẵn sàng đặt câu hỏi, chia sẻ progress và chịu trách nhiệm cho một feature hoàn chỉnh. Tôi xem đây là môi trường tốt để vừa đóng góp vừa phát triển.

## 4. How Do You Work with a Team and Receive Feedback?

**Simple English answer**

> I share progress and blockers early, especially when another person depends on my work. When I receive feedback, I first understand the problem behind the comment. Then I update the work and check whether the same issue appears in another place. If I have a different opinion, I explain my reason and ask about the requirement. After the team decides, I support the decision and help move the work forward.

**Câu hỏi tiếng Việt:** Bạn làm việc với team và tiếp nhận feedback như thế nào?

**Câu trả lời tiếng Việt**

> Tôi chia sẻ progress và blocker sớm, đặc biệt khi người khác phụ thuộc vào phần việc của tôi. Khi nhận feedback, đầu tiên tôi hiểu vấn đề phía sau comment. Sau đó tôi cập nhật công việc và kiểm tra xem lỗi tương tự có xuất hiện ở nơi khác không. Nếu có quan điểm khác, tôi giải thích lý do rồi hỏi lại requirement. Khi team đã quyết định, tôi ủng hộ quyết định và giúp công việc tiếp tục.

---

# Part E — Personal Ownership Guardrail

QRTable là dự án hai người. Hãy điền bảng này trước khi luyện Mock 1:

| Area                                   | I implemented directly | We designed together | I integrated or reviewed |
| -------------------------------------- | ---------------------- | -------------------- | ------------------------ |
| Management App routes and screens      |                        |                      |                          |
| Component and UI system                |                        |                      |                          |
| TanStack Query and API integration     |                        |                      |                          |
| TanStack Table screens                 |                        |                      |                          |
| Customer ordering flow                 |                        |                      |                          |
| Socket.io integration                  |                        |                      |                          |
| NestJS microservices, Kafka, and Redis |                        |                      |                          |

**Safe English pattern**

> This was a two-person project. I directly worked on […]. We designed […] together. My teammate mainly handled […], but I reviewed or integrated that part and understand how it connects to the system.

**Cách nói tiếng Việt**

> Đây là dự án hai người. Tôi trực tiếp làm […]. Chúng tôi cùng thiết kế […]. Teammate của tôi phụ trách chính […], nhưng tôi có review hoặc tích hợp phần đó và hiểu cách nó kết nối với hệ thống.

---

# Part F — Final Review

## Twelve Keyword Chains

| Question | Keywords                                                             |
| -------: | -------------------------------------------------------------------- |
|        1 | `React library` → `Next framework` → `two product needs`             |
|        2 | `one responsibility` → `typed props` → `state owner` → `composition` |
|        3 | `render causes` → `effect for synchronization` → `measure first`     |
|        4 | `route` → `feature` → `hook` → `keys/service` → `BFF`                |
|        5 | `server` → `client interaction` → `use client boundary`              |
|        6 | `server initial data` → `Query interactive data` → `typed service`   |
|        7 | `source of truth` → `Query/local/URL/Context/Zustand`                |
|        8 | `QueryClient` → `keys` → `service` → `enabled` → `invalidate`        |
|        9 | `headless behavior` → `typed columns` → `shadcn visual`              |
|       10 | `inspect Figma` → `tokens` → `compose` → `compare`                   |
|       11 | `clarify build/runtime` → `measure` → `cache/imports/boundaries`     |
|       12 | `component` → `mutation` → `service` → `BFF` → `cache`               |

## Quick Facts to Keep Consistent

- Preferred name: chọn một tên và dùng xuyên suốt; bản hiện tại dùng `Minh`.
- Graduation thesis: QRTable — SaaS POS and QR ordering platform.
- Experience framing: hơn một năm hands-on; khoảng bảy tháng internship và freelance.
- Expected salary: `16M VND gross`.
- Interview location: Cobi Tower 1, tầng 2, Quận 7.
- Availability: chỉ xác nhận đi làm thứ Hai nếu điều đó vẫn đúng với tình trạng thực tế.

## Stop Studying Until This File Is Ready

- JavaScript prototype, `this`, closure và browser trivia.
- HTML/CSS theory questions riêng lẻ.
- Cache Components, PPR, Server Actions và streaming chuyên sâu.
- TanStack Query edge cases, optimistic cart internals và testing hooks.
- Authentication, tenant isolation và Socket.io edge cases chuyên sâu.
- PWA offline strategy, deployment internals và Pressure Mock.

## Definition of Ready / Khi Nào Được Xem Là Sẵn Sàng

- [ ] Nói được self-introduction trong 45–60 giây.
- [ ] Nói được 12 core answers mà không đọc paragraph.
- [ ] Mỗi core answer có direct answer và ít nhất một reason hoặc QRTable example.
- [ ] Nói được bốn team-fit answers bằng simple English.
- [ ] Điền xong Personal Ownership Guardrail.
- [ ] Biết dùng: “Could you repeat the question more slowly?”
- [ ] Biết dùng: “Please give me a few seconds to think.”
- [ ] Biết dùng: “Do you mean build time or runtime performance?”
- [ ] Hoàn thành Mock 1 và không có core question nào bằng 0 điểm.
