# VILIHA Final Interview Pack — Theory, Project, and Team Fit

> Candidate: Võ Đình Minh Quân
>
> Position: Front-End Developer (Next.js)
>
> Purpose: One-file interview preparation based on the latest information from anh Quý
>
> Scope: Spoken technical questions, QRTable project discussion, and team fit. **Live coding is intentionally excluded from this file.**

## Mục lục / Table of Contents

**Cách đọc tag:** `[CORE]` là câu cần học trước; `[PROJECT]` là câu bảo vệ QRTable; `[TEAM FIT]` là câu về cách làm việc; `[FOLLOW-UP]` chỉ học sau khi phần chính đã ổn.

- [Cách dùng file và thứ tự ôn gấp](#how-to-use)
  - [Emergency Study Order: 10 câu trong 60 phút](#emergency-study-order)
- [Part A — Background and Positioning](#part-a)
  - 1. Tell Me About Yourself
  - 2. Why Frontend If Your Thesis Is Backend-Heavy?
  - 3. Describe Your Recent Project and Responsibilities
- [Part B — React, Next.js, Components, API, and State](#part-b)
  - 4. React Versus Next.js, and Why QRTable Uses Both
  - 5. What Is the Next.js App Router?
  - 5A. `loading.tsx`, `error.tsx`, and `not-found.tsx`
  - 6. Server Components, Client Components, and `use client`
  - 7. Reusable Components, Input Design, and Component Splitting
  - 7A. Props, State, and Immutable Updates
  - 7B. Controlled Inputs and Lifting State Up
  - 7C. `useMemo` and `useCallback`
  - 8. Organizing a Frontend Feature from Route to API
  - 8A. Management App Folder Structure in QRTable
  - 9. Calling APIs and Handling UI States
  - 10. Choosing Between `useState`, Context, Zustand, and TanStack Query
  - 11. TanStack Query in QRTable
  - 12. TanStack Table and shadcn/ui in QRTable
  - 13A. Clean and Maintainable Frontend Code
  - 13B. DRY and Reusable Code
  - 13C. SOLID Principles
  - 13D. OOP in Modern React
- [Part C — Tailwind, shadcn/ui, Figma, UI/UX, SEO, and Performance](#part-c)
  - 14. Tailwind CSS, shadcn/ui, and Lucide Icons
  - 15. From Figma Design to Production Code
  - 16. UI/UX Consistency and Design Decisions
  - 17. Explaining QRTable’s UI and Layout Choices
  - 18. How SEO Works and How to Implement It in Next.js
  - 19. Image, Font, Build-Time, and Runtime Optimization
  - 19A. Dynamic Import and Code Splitting
- [Part D — QRTable Practical Defense](#part-d)
  - 20. Walk Through the Frontend Architecture of Both Apps
  - 21. Explain One Real Order Flow in the Management App
  - 22. Personal Contribution and Honest Limitations
- [Part E — Team Fit, Learning, and English Communication](#part-e)
  - 23. Learning a New Technology Without Depending on AI
  - 24. What Do You Do When You Are Blocked?
  - 25. Startup Fit, Teamwork, and Feedback
  - 26. Why Should We Choose You?
  - 27. How Do You Handle English Communication?
- [Part F — Short Follow-Ups](#part-f)
  - 28. What Causes a React Component to Render?
  - 29. What Is `useEffect` For?
  - 30. What Is Hydration?
  - 31. SSR, SSG, ISR, and CSR
  - 32. Query Keys, `staleTime`, and Invalidation
  - 33. Why Not Store Server Data in Zustand?
  - 34. Client-Side Versus Server-Side Table Operations
- [English Rescue Lines](#english-rescue)
- [Last-Minute Keyword Sheet](#keyword-sheet)
- [Truth Guardrails](#truth-guardrails)
- [QRTable Code Evidence](#qrtable-code-evidence)
- [Official Sources](#official-sources)

<a id="how-to-use"></a>

## How to Use This File / Cách Học File Này

Bạn không cần học thuộc từng paragraph. Với mỗi câu:

1. Đọc bản tiếng Việt để hiểu ý.
2. Nhớ 3–5 keywords.
3. Che answer và nói lại bằng English đơn giản.
4. Dừng sau khi đã trả lời trực tiếp, đưa ra lý do và một example.

Mỗi câu `[CORE]` nên nói trong khoảng 30–60 giây. Nếu bị căng thẳng, hãy nói hai câu đầu tiên trước. Hai câu đúng và rõ vẫn tốt hơn một paragraph dài nhưng mất kiểm soát.

```text
Direct answer → Main reason → Real example → Stop
```

<a id="emergency-study-order"></a>

### Emergency Study Order / Thứ Tự Ôn Khẩn Cấp

Nếu chỉ còn **60 phút**, đừng cố học cả file. Hãy học đúng 10 câu theo thứ tự này:

1. Câu 1 — giới thiệu bản thân.
2. Câu 3 — giới thiệu QRTable và phần mình làm.
3. Câu 6 — Server Component và Client Component.
4. Câu 7 — tạo và tách reusable component.
5. Câu 8 — tổ chức code theo page, feature, hook và service.
6. Câu 10 — chọn `useState`, Context, Zustand hay TanStack Query.
7. Câu 11 — setup TanStack Query và call API trong QRTable.
8. Câu 15 — quy trình chuyển Figma thành production UI.
9. Câu 19 — image, build-time và runtime optimization.
10. Câu 21 — kể một data flow có thật trong QRTable.

Nếu còn thêm **20–30 phút**, học Câu 13A–13D, 14, 18 và 25 về clean code, DRY, SOLID, OOP, UI system, SEO và team fit. Sau đó mới mở rộng sang các câu còn lại. Câu 28–34 chỉ là follow-up, không phải phần phải học đầu tiên.

<a id="part-a"></a>

# Part A — Background and Positioning

## 1. Tell Me About Yourself [CORE]

**English question:** Could you tell us about yourself and your recent experience?

**Simple English answer:**

> Hello, I am Vo Dinh Minh Quan, and you can call me Minh Quan. I am a final-year Information Systems student at UIT, and I recently defended my graduation thesis. My thesis project is QRTable, a SaaS POS and QR ordering platform. It has a Next.js app for restaurant staff and a React/Vite app for customers to scan a QR code and order. I worked on both frontend and backend, with more focus on the frontend. I was also a Product Frontend Intern at GEEK Up, where I built responsive React screens from Figma and connected APIs. Later, I worked as a freelance Full-Stack Developer on payroll features for an internal ERP. I am now looking for a frontend-focused full-time role, and I can start immediately.

**Câu hỏi tiếng Việt:** Bạn có thể giới thiệu về bản thân và kinh nghiệm gần đây không?

**Câu trả lời tiếng Việt:**

> Em tên là Võ Đình Minh Quân và mọi người có thể gọi em là Minh Quân. Em là sinh viên năm cuối ngành Hệ thống Thông tin tại UIT và vừa bảo vệ khóa luận tốt nghiệp. Dự án khóa luận của em là QRTable, một nền tảng SaaS POS và đặt món bằng QR. Dự án có một app Next.js cho nhân viên nhà hàng và một app React/Vite để khách scan QR rồi đặt món. Em làm cả Frontend và Backend nhưng tập trung nhiều hơn vào Frontend. Em cũng từng làm Product Frontend Intern tại GEEK Up, nơi em xây responsive React screen từ Figma và kết nối API. Sau đó, em làm freelance Full-Stack Developer cho các payroll feature của một hệ thống ERP nội bộ. Hiện tại, em đang tìm một vị trí full-time tập trung vào Frontend và có thể bắt đầu ngay.

**Keywords:** `UIT` → `thesis defense` → `QRTable and two apps` → `GEEK Up` → `freelance ERP` → `frontend-focused`

**Cách dùng câu này:** Đây chỉ là bản đồ tổng quan về background của bạn. Bạn chỉ nói QRTable trong 2–3 câu để người phỏng vấn biết dự án gần nhất là gì. Bạn chưa cần kể Microservices, TanStack Query, Socket.io hoặc data flow ở đây; những phần đó thuộc Câu 3 và các câu project follow-up.

## 2. Why Frontend If Your Thesis Is Backend-Heavy? [CORE]

**English question:** Your thesis sounds backend-heavy. Why are you applying for a frontend role?

**Simple English answer:**

> The backend is a big part of QRTable, but I also worked directly on its two frontend apps. I used React, Next.js, TanStack Query, tables, and Socket.io. Because I understand the backend, I can understand what an API returns, how authentication works, and when the data can change. For this role, I want to focus on the frontend while using my backend knowledge as an advantage.

**Câu hỏi tiếng Việt:** Khóa luận của bạn nghe có vẻ nặng Backend. Vì sao bạn ứng tuyển vị trí Frontend?

**Câu trả lời tiếng Việt:**

> Backend là một phần lớn của QRTable, nhưng em cũng trực tiếp làm hai frontend app của dự án. Em đã dùng React, Next.js, TanStack Query, table và Socket.io. Vì hiểu Backend nên em dễ hiểu API trả về gì, authentication hoạt động ra sao và khi nào dữ liệu có thể thay đổi. Với vị trí này, em muốn tập trung vào Frontend và dùng kiến thức Backend như một lợi thế.

**Keywords:** `two frontend apps` → `backend helps API and auth` → `focus on frontend`

## 3. Describe Your Recent Project and Responsibilities [CORE]

**English question:** Could you briefly describe a recent project and your main responsibilities?

**Simple English answer:**

> Sure. QRTable is a graduation thesis project I built with one teammate. It is a SaaS POS and QR ordering platform for restaurants. My main frontend work was code organization, API integration, state management, and realtime updates. We built a Next.js Management App for restaurant staff and a React/Vite Customer App for customers to scan a QR code and order. I also worked on the backend.

**If they ask for more architecture detail:**

> The backend uses microservices with NestJS, Kafka, and Redis. The Management App supports POS, KDS, menu, table, and admin work. The Customer App lets customers view the menu, manage the cart, place an order, and track its status.

**If they ask for the frontend tools:**

> I used TanStack Query for server data, TanStack Table for complex tables, Zustand for client state, and Socket.io for realtime updates.

**Câu hỏi tiếng Việt:** Bạn có thể mô tả ngắn gọn dự án gần đây và trách nhiệm chính của mình không?

**Câu trả lời tiếng Việt:**

> QRTable là dự án khóa luận mà em xây cùng một bạn trong nhóm. Đây là nền tảng SaaS POS và đặt món bằng QR cho nhà hàng. Phần Frontend chính của em là tổ chức code, tích hợp API, quản lý state và xử lý realtime update. Bọn em xây một Management App bằng Next.js cho nhân viên nhà hàng và một Customer App bằng React/Vite để khách scan QR rồi đặt món. Em cũng làm một phần Backend.

**Nếu họ hỏi chi tiết hơn về architecture:**

> Backend dùng Microservices với NestJS, Kafka và Redis. Management App hỗ trợ POS, KDS, menu, table và công việc admin. Customer App cho phép khách xem menu, quản lý cart, đặt món và theo dõi trạng thái.

**Nếu họ hỏi các frontend tool:**

> Em dùng TanStack Query cho server data, TanStack Table cho complex table, Zustand cho client state và Socket.io cho realtime update.

**Keywords:** `graduation thesis` → `SaaS POS` → `microservices` → `two frontend apps` → `frontend and backend`

**Cách dùng câu này:** Nếu bạn đã nhắc QRTable trong phần giới thiệu, hãy bắt đầu bằng `Sure. QRTable is...` rồi đi thẳng vào phần bạn làm, hai application và architecture. Không cần giới thiệu lại tên, trường học, internship hoặc mục tiêu nghề nghiệp.

---

<a id="part-b"></a>

# Part B — React, Next.js, Components, API, and State

## 4. React Versus Next.js, and Why QRTable Uses Both [CORE]

**English question:** What is the difference between React and Next.js, and why does QRTable use both?

**Simple English answer:**

> React is a library for building UI components. Next.js is a framework built on React. It adds features such as routing, layouts, Server Components, metadata, and server rendering. We chose Next.js for the Management App because it has many routes, layouts, user roles, and a public landing page. We chose React with Vite for the Customer App because it is a smaller mobile ordering app that mostly runs in the browser. Both apps still call the same BFF.

**Câu hỏi tiếng Việt:** React khác Next.js như thế nào và vì sao QRTable dùng cả hai?

**Câu trả lời tiếng Việt:**

> React là library để xây UI component. Next.js là framework được xây trên React. Nó bổ sung các chức năng như routing, layout, Server Component, metadata và server rendering. Bọn em chọn Next.js cho Management App vì app này có nhiều route, layout, user role và một public landing page. Bọn em chọn React với Vite cho Customer App vì đây là mobile ordering app nhỏ hơn và phần lớn chạy trong browser. Cả hai app vẫn gọi cùng một BFF.

**Keywords:** `React library` → `Next framework` → `Management App` → `Customer App` → `choose by product`

## 5. What Is the Next.js App Router? [CORE]

**English question:** What is the App Router, and how do you use it?

**Simple English answer:**

> App Router is the routing system in Next.js that uses the `app` directory to define pages and layouts. A `page.tsx` file creates a page, while a `layout.tsx` file keeps shared UI around related pages. Route groups help organize different work areas without changing the URL. For example, `app/(kds)/kds/kitchen/page.tsx` creates the `/kds/kitchen` URL. The `(kds)` folder organizes that work area but does not appear in the URL, and its `layout.tsx` provides the shared KDS layout around the kitchen and bar pages.

**Câu hỏi tiếng Việt:** App Router là gì và bạn sử dụng nó như thế nào?

**Câu trả lời tiếng Việt:**

> App Router là cơ chế định tuyến trong Next.js, sử dụng folder `app` để định nghĩa page và layout. File `page.tsx` tạo một page, còn `layout.tsx` giữ UI dùng chung cho các page liên quan. Route group giúp tổ chức các khu vực làm việc khác nhau mà không làm thay đổi URL. Ví dụ, `app/(kds)/kds/kitchen/page.tsx` tạo URL `/kds/kitchen`. Folder `(kds)` giúp tổ chức khu vực KDS nhưng không xuất hiện trong URL, còn `layout.tsx` của nó cung cấp layout dùng chung cho kitchen page và bar page.

**Keywords:** `app folder` → `page` → `layout` → `route group` → `work areas`

## 5A. `loading.tsx`, `error.tsx`, and `not-found.tsx` [FOLLOW-UP]

**English question:** What are `loading.tsx`, `error.tsx`, and `not-found.tsx` used for in the App Router?

**Simple English answer:**

> `loading.tsx` shows a loading UI while a route segment is rendering. `error.tsx` shows a fallback UI when that segment has an unexpected error. `not-found.tsx` shows a not-found page when the application calls `notFound()`. I use them for route-level states. For a client-side API query, I still handle loading, error, empty, and success states in the component.

**Câu hỏi tiếng Việt:** `loading.tsx`, `error.tsx` và `not-found.tsx` được dùng để làm gì trong App Router?

**Câu trả lời tiếng Việt:**

> `loading.tsx` hiển thị loading UI trong khi một route segment đang render. `error.tsx` hiển thị fallback UI khi segment đó gặp lỗi không mong muốn. `not-found.tsx` hiển thị trang không tìm thấy khi application gọi `notFound()`. Em dùng chúng cho các route-level state. Với API query ở client, em vẫn xử lý loading, error, empty và success state ngay trong component.

**Keywords:** `loading while route renders` → `error fallback` → `notFound()` → `route-level state` → `query state stays in component`

## 6. Server Components, Client Components, and `use client` [CORE]

**English question:** How do you decide between a Server Component and a Client Component?

**Simple English answer:**

> If a component only reads data and shows content, I keep it as a Server Component. If it needs state, `useEffect`, or click events, I make it a Client Component. Browser APIs and client hooks also need a Client Component. The purpose is to keep more work on the server and send less JavaScript to the browser. I put `use client` close to the interactive part because a smaller Client Component boundary can reduce the client bundle and hydration work. In QRTable, the public landing page can render on the server. POS and KDS need Client Components because users interact with them and they use timers and sockets.

**Câu hỏi tiếng Việt:** Bạn quyết định dùng Server Component hay Client Component như thế nào?

**Câu trả lời tiếng Việt:**

> Nếu component chỉ đọc dữ liệu và hiển thị nội dung, em giữ nó là Server Component. Nếu component cần state, `useEffect` hoặc click event, em chuyển nó thành Client Component. Browser API và client hook cũng cần Client Component. Mục đích là giữ nhiều công việc hơn ở server và gửi ít JavaScript hơn xuống browser. Em đặt `use client` gần phần cần tương tác vì phạm vi Client Component nhỏ hơn có thể giúp giảm client bundle và lượng công việc hydration. Trong QRTable, public landing page có thể render ở server. POS và KDS cần Client Component vì người dùng tương tác nhiều và các màn hình này dùng timer cùng socket.

**Keywords:** `show data on server` → `interaction needs client` → `less browser JavaScript` → `small client boundary` → `landing` → `POS/KDS`

## 7. Reusable Components, Input Design, and Component Splitting [CORE]

**English question:** How do you design a reusable component, and when do you split it?

**Simple English answer:**

> First, I give the component one clear job and keep its props small and typed. For example, a reusable Input can show its label, value, error, and disabled state. The form still handles validation, submit state, and the API request. I split a large component when it starts doing many unrelated jobs or when one part can clearly be reused. I only move a component to shared UI after more than one feature really needs it.

**Câu hỏi tiếng Việt:** Bạn thiết kế reusable component như thế nào và khi nào bạn tách component?

**Câu trả lời tiếng Việt:**

> Đầu tiên, em cho component một nhiệm vụ rõ ràng và giữ props của nó ít, dễ hiểu và có type. Ví dụ, một Input dùng lại có thể hiển thị label, value, error và disabled state. Form vẫn chịu trách nhiệm validation, submit state và API request. Em tách một component lớn khi nó bắt đầu làm nhiều việc không liên quan hoặc khi một phần bên trong rõ ràng có thể dùng lại. Em chỉ đưa component vào shared UI sau khi thật sự có nhiều feature cần nó.

**Keywords:** `one job` → `typed props` → `state owner` → `split responsibilities` → `stable reuse`

## 7A. Props, State, and Immutable Updates [FOLLOW-UP]

**English question:** What is the difference between props and state, and why should state be updated immutably?

**Simple English answer:**

> Props are inputs that a parent passes to a component. The child reads them and should not change them. State is data that the component owns and can change over time. I do not change an object or array in state directly. I create a new object or array and use the state setter. This makes the update clear and lets React render the new state correctly.

**Câu hỏi tiếng Việt:** Props khác state như thế nào và vì sao state nên được update theo hướng immutable?

**Câu trả lời tiếng Việt:**

> Props là input mà parent truyền vào component. Child đọc props và không nên tự thay đổi chúng. State là dữ liệu component sở hữu và có thể thay đổi theo thời gian. Em không sửa trực tiếp object hoặc array trong state. Em tạo object hoặc array mới rồi dùng state setter. Cách này làm update rõ ràng và giúp React render state mới đúng cách.

**Keywords:** `props from parent` → `state owned by component` → `do not mutate` → `new object or array` → `state setter`

## 7B. Controlled Inputs and Lifting State Up [FOLLOW-UP]

**English question:** What is a controlled input, and when do you lift state up?

**Simple English answer:**

> A controlled input means React keeps the current input value in state. When the user types, `onChange` updates that state, and the new value appears in the input. This makes it easier for the form to validate the value, show an error, reset the input, or prepare data for submission. If two components need the same value, I move that state to their closest parent and pass it down through props. If only one component needs it, I keep the state local.

**Câu hỏi tiếng Việt:** Controlled input là gì và khi nào bạn lift state up?

**Câu trả lời tiếng Việt:**

> Controlled input nghĩa là React giữ giá trị hiện tại của input trong state. Khi user nhập dữ liệu, `onChange` cập nhật state và giá trị mới xuất hiện trong input. Nhờ vậy, form dễ validate dữ liệu, hiển thị error, reset input hoặc chuẩn bị data để submit. Nếu hai component cần cùng một value, em chuyển state đó lên parent gần nhất rồi truyền xuống bằng props. Nếu chỉ một component cần value đó, em giữ state ở local.

**Keywords:** `value from state` → `onChange updates state` → `form controls behavior` → `shared sibling value` → `closest parent`

## 7C. `useMemo` and `useCallback` [FOLLOW-UP]

**English question:** When do you use `useMemo` and `useCallback`?

**Simple English answer:**

> `useMemo` keeps the result of an expensive calculation. `useCallback` keeps the same function reference between renders. I do not use them by default. I use them after I find a real performance problem, for example an expensive calculation or a memoized child that needs a stable callback. Otherwise, they can make the code harder to read without helping much.

**Câu hỏi tiếng Việt:** Khi nào bạn dùng `useMemo` và `useCallback`?

**Câu trả lời tiếng Việt:**

> `useMemo` giữ lại kết quả của một phép tính tốn chi phí. `useCallback` giữ cùng một function reference giữa các lần render. Em không dùng chúng mặc định. Em chỉ dùng sau khi tìm thấy performance problem thật, ví dụ một phép tính tốn chi phí hoặc một memoized child cần callback ổn định. Nếu không, chúng có thể làm code khó đọc hơn mà không giúp được nhiều.

**Keywords:** `expensive calculation` → `stable function reference` → `measure first` → `not by default` → `avoid needless complexity`

## 8. Organizing a Frontend Feature from Route to API [CORE]

**English question:** How do you organize a frontend feature in a Next.js project?

**Simple English answer:**

> I organize most code by feature, such as orders, tables, or menu. The page is the entry point for the route and renders the main feature component. The component shows the screen. The hook handles React state or TanStack Query, and the service calls the API. A shared API client adds common headers and handles common errors. This structure helps the team know where to find and change the code.

**Câu hỏi tiếng Việt:** Bạn tổ chức một frontend feature trong Next.js project như thế nào?

**Câu trả lời tiếng Việt:**

> Em tổ chức phần lớn code theo feature như order, table hoặc menu. Page là điểm bắt đầu của route và render feature component chính. Component hiển thị screen. Hook xử lý React state hoặc TanStack Query, còn service gọi API. Shared API client thêm các header và xử lý error dùng chung. Cấu trúc này giúp mọi người biết cần tìm và sửa code ở đâu.

**QRTable example in English:** In the tables feature, the page renders the table screen, the query hook gets the table list, and the service sends the request to the BFF.

**Ví dụ QRTable:** Trong tables feature, page render table screen, query hook lấy danh sách bàn và service gửi request đến BFF.

**Flow:**

```text
route/page
  → feature component
  → query or state hook
  → query keys + typed service
  → shared API client
  → BFF/API
```

**Keywords:** `business feature` → `page` → `component` → `hook` → `service` → `API client`

## 8A. Management App Folder Structure in QRTable [CORE] [PROJECT]

**English question:** How did you organize the folder structure of the Next.js Management App, and why do you consider it a good structure?

**Simple English answer:**

> In the QRTable Management App, I separate routing from business features. The `app` folder follows the Next.js App Router convention. It contains route groups, layouts, pages, API routes, and global providers. I keep each `page.tsx` small. Its main job is to define the route and render the related feature instead of containing API calls and business logic.
>
> Most business code is organized by domain inside `features`, such as orders, KDS, reports, payment, and SaaS. Each feature keeps its own components, query or UI hooks, API service, query keys, types, and helper functions when needed. Shared shadcn UI primitives are in `components/ui`. Reusable layout and data-table components are in `components/layout` and `components/data-table`. Cross-cutting code, such as the authenticated API client, authentication helpers, navigation helpers, and formatting utilities, is in `lib`. API endpoints and routes are stored in `constants` instead of being repeated in components.
>
> For example, the kitchen route only renders `KdsBoard` and passes the kitchen station to it. The board uses `useKdsQueue` to get its server data. This hook uses `kdsKeys` to identify the cache and calls the KDS service. The service then uses the shared authenticated API client to call the BFF. This structure gives each layer one clear responsibility, keeps related feature code together, and makes it easier to find, test, and change code. I do not think one folder structure is best for every project, but this feature-based structure fits a Management App with many business domains.

**Câu hỏi tiếng Việt:** Bạn đã tổ chức cấu trúc thư mục của Next.js Management App như thế nào và vì sao bạn cho rằng cấu trúc đó hợp lý?

**Câu trả lời tiếng Việt:**

> Trong QRTable Management App, em tách phần routing khỏi business feature. Folder `app` tuân theo convention của Next.js App Router. Nó chứa route group, layout, page, API route và global provider. Em giữ mỗi file `page.tsx` nhỏ. Nhiệm vụ chính của page là định nghĩa route và render feature liên quan, thay vì chứa API call và business logic.
>
> Phần lớn business code được tổ chức theo domain trong folder `features`, ví dụ như order, KDS, report, payment và SaaS. Mỗi feature tự chứa component, query hoặc UI hook, API service, query key, type và helper function khi cần. Các shadcn UI primitive dùng chung nằm trong `components/ui`. Layout và data-table component dùng lại nằm trong `components/layout` và `components/data-table`. Cross-cutting code như authenticated API client, authentication helper, navigation helper và formatting utility nằm trong `lib`. API endpoint và route được đặt trong `constants` thay vì lặp lại trong component.
>
> Ví dụ, kitchen route chỉ render `KdsBoard` và truyền kitchen station vào component này. Board dùng `useKdsQueue` để lấy server data. Hook này dùng `kdsKeys` để xác định cache rồi gọi KDS service. Sau đó, service dùng shared authenticated API client để gọi BFF. Cấu trúc này giúp mỗi layer có một trách nhiệm rõ ràng, giữ code liên quan của cùng feature ở gần nhau và giúp developer dễ tìm, test hoặc thay đổi code. Em không cho rằng có một folder structure tốt nhất cho mọi project, nhưng cấu trúc theo feature này phù hợp với Management App có nhiều business domain.

**Structure to remember / Cấu trúc cần nhớ:**

```text
src/
├── app/                    # route groups, layouts, pages, API routes, providers
├── features/               # business domains: order, KDS, reports, payment...
│   └── <domain>/
│       ├── components/     # UI that belongs to this feature
│       ├── hooks/          # TanStack Query and feature UI logic
│       ├── services/       # typed API calls
│       ├── lib/            # feature-only helpers
│       ├── data/           # schema or local feature data
│       └── <domain>-keys.ts # query key factory
├── components/
│   ├── ui/                 # reusable shadcn UI primitives
│   ├── layout/             # app shell, sidebar, top bar, breadcrumb
│   └── data-table/         # reusable table building blocks
├── lib/                    # API client, auth, navigation, form and format helpers
├── constants/              # API endpoints and route constants
├── styles/                 # app-specific design tokens
└── types/                  # app-level type declarations
```

**KDS example / Ví dụ KDS:**

```text
app/(kds)/kds/kitchen/page.tsx
  → features/kds/components/kds-board.tsx
  → features/kds/hooks/use-kds-queue.ts
  → features/kds/kds-keys.ts + services/kds.service.ts
  → lib/api/authenticated-client.ts
  → BFF
```

**Keywords:** `App Router owns routes` → `thin page` → `feature owns business code` → `shared UI by real reuse` → `lib for cross-cutting code` → `clear dependency flow`

## 9. Calling APIs and Handling UI States [CORE]

**English question:** How do you call an API in Next.js, and how do you handle its UI states?

**Simple English answer:**

> For a public page that mainly shows information, I can fetch the data on the server. For an interactive screen, I normally call the API through a TanStack Query hook. The hook calls a feature service, and the service uses the shared API client. In the component, I use the query result to show loading, error, empty, or success content. For a mutation, I also disable the action while the request is running and show a clear result to the user.

**Câu hỏi tiếng Việt:** Bạn gọi API trong Next.js như thế nào và xử lý các UI state ra sao?

**Câu trả lời tiếng Việt:**

> Với public page chủ yếu hiển thị thông tin, em có thể fetch dữ liệu ở server. Với interactive screen, em thường gọi API qua TanStack Query hook. Hook gọi feature service và service dùng shared API client. Trong component, em dùng kết quả của query để hiển thị loading, error, empty hoặc success content. Với mutation, em cũng disable action trong lúc request đang chạy và thông báo kết quả rõ ràng cho người dùng.

**Keywords:** `choose server or client` → `hook` → `service` → `API client` → `real UI states`

## 10. Choosing Between `useState`, Context, Zustand, and TanStack Query [CORE]

**English question:** How do you decide where frontend state should live?

**Simple English answer:**

> I start with two questions: where does the data come from, and who needs it? If the server owns the data, such as an order list, I use TanStack Query. If it only controls the interface, I choose its scope. A dialog that belongs to one component can use `useState`. A group of related components can use Context, while state needed by separate areas can use Zustand. I put filters or page numbers in the URL when the user may need to share or reopen them. This keeps each state close to its real owner and avoids copying the same API data into Zustand.

**Câu hỏi tiếng Việt:** Bạn quyết định frontend state nên nằm ở đâu như thế nào?

**Câu trả lời tiếng Việt:**

> Em bắt đầu bằng hai câu hỏi: dữ liệu đến từ đâu và những phần nào cần dùng nó? Nếu server sở hữu dữ liệu, ví dụ như order list, em dùng TanStack Query. Nếu dữ liệu chỉ điều khiển giao diện, em chọn công cụ theo phạm vi sử dụng. Một dialog thuộc một component có thể dùng `useState`. Một nhóm component liên quan có thể dùng Context, còn state được nhiều khu vực tách biệt sử dụng có thể dùng Zustand. Em đặt filter hoặc page number trong URL khi user có thể cần chia sẻ hoặc mở lại chúng. Cách này giữ state gần đúng owner của nó và tránh copy cùng API data vào Zustand.

**Keywords:** `server or client` → `Query` → `useState` → `Context` → `Zustand` → `URL`

## 11. TanStack Query in QRTable [CORE]

**English question:** How did you set up and use TanStack Query in QRTable?

**Simple English answer:**

> In each frontend app, we create one `QueryClient` near the root and wrap the app with its provider. Inside a feature, a query key identifies the data, a service calls the API, `useQuery` reads the data, and `useMutation` changes it. Protected queries only run after authentication is ready. After a successful change, we invalidate the related query. This marks the data as stale, and an active query can fetch the latest data again. A Socket.io event can also invalidate a query when the change comes from another user.

**Câu hỏi tiếng Việt:** Bạn setup và sử dụng TanStack Query trong QRTable như thế nào?

**Câu trả lời tiếng Việt:**

> Trong mỗi frontend app, bọn em tạo một `QueryClient` gần root rồi bọc app bằng provider của nó. Bên trong một feature, query key xác định dữ liệu, service gọi API, `useQuery` đọc dữ liệu và `useMutation` thay đổi dữ liệu. Protected query chỉ chạy sau khi authentication đã sẵn sàng. Sau khi thay đổi thành công, bọn em invalidate query liên quan. Việc này đánh dấu data là stale và active query có thể lấy dữ liệu mới nhất lại. Socket.io event cũng có thể invalidate query khi thay đổi đến từ một user khác.

**Flow:** `component → query hook → key → service → BFF → cache → UI`

**Keywords:** `one QueryClient` → `stable keys` → `typed service` → `mutation` → `invalidation`

## 12. TanStack Table and shadcn/ui in QRTable [CORE]

**English question:** How did you use TanStack Table and shadcn/ui together?

**Simple English answer:**

> TanStack Query gets the row data from the server. We define typed columns, TanStack Table manages behavior such as sorting, filtering, and pagination, and shadcn/ui renders the visual table. We define status badges and action buttons inside the related feature because they contain business meaning. If the data becomes large, the server handles sorting, filtering, and pagination.

**Câu hỏi tiếng Việt:** Bạn dùng TanStack Table và shadcn/ui cùng nhau như thế nào?

**Câu trả lời tiếng Việt:**

> TanStack Query lấy row data từ server. Bọn em định nghĩa typed column, TanStack Table quản lý behavior như sorting, filtering và pagination, còn shadcn/ui render phần table nhìn thấy. Bọn em định nghĩa status badge và action button trong feature liên quan vì chúng chứa business meaning. Nếu dữ liệu trở nên lớn, server sẽ xử lý sorting, filtering và pagination.

**Keywords:** `Query gets rows` → `Table handles logic` → `shadcn shows UI` → `server for large data`

## 13A. Clean and Maintainable Frontend Code [CORE]

**English question:** How do you keep your frontend code clean and easy to maintain?

**Simple English answer:**

> I give each part of the code one clear job. The page handles the route, the component shows the UI, the hook handles React or query logic, and the service calls the API. I use clear names, small typed props, and shared code only when it is really shared. If one component starts rendering the whole screen, calling the API, and managing several unrelated states, I move the API logic into a hook and split the visual sections into smaller components. The original component then becomes the place that connects those parts together.

**Câu hỏi tiếng Việt:** Bạn làm thế nào để frontend code sạch và dễ bảo trì?

**Câu trả lời tiếng Việt:**

> Em cho mỗi phần của code một nhiệm vụ rõ ràng. Page xử lý route, component hiển thị UI, hook xử lý React hoặc query logic, còn service gọi API. Em dùng tên dễ hiểu, props nhỏ có type và chỉ chia sẻ code khi nó thật sự được dùng chung. Nếu một component vừa render toàn bộ screen, vừa gọi API và quản lý nhiều state không liên quan, em chuyển API logic vào hook rồi tách các section hiển thị thành component nhỏ hơn. Component ban đầu chỉ còn nhiệm vụ kết nối các phần đó lại.

**Keywords:** `one clear job` → `clear names` → `small typed props` → `split when needed`

## 13B. DRY and Reusable Code [CORE]

**English question:** What is DRY, and can it be overused?

**Simple English answer:**

> For me, DRY means keeping one source for logic that must stay consistent. For example, if several screens use the same status label and color, I keep that mapping in one helper or status component. When the business rule changes, I only need to update one place. However, I do not extract code just because two pieces of JSX look similar. I wait until they have the same meaning and are likely to change for the same reason. Otherwise, the shared component can become full of special cases and harder to maintain.

**Câu hỏi tiếng Việt:** DRY là gì và có thể lạm dụng DRY không?

**Câu trả lời tiếng Việt:**

> Với em, DRY nghĩa là giữ một nguồn duy nhất cho logic cần hoạt động nhất quán. Ví dụ, nếu nhiều screen dùng cùng status label và màu sắc, em đặt phần mapping đó trong một helper hoặc status component dùng chung. Khi business rule thay đổi, em chỉ cần sửa ở một nơi. Tuy nhiên, em không tách code chỉ vì hai đoạn JSX nhìn giống nhau. Em chờ đến khi chúng có cùng ý nghĩa và thường thay đổi vì cùng một lý do. Nếu không, shared component có thể chứa quá nhiều trường hợp đặc biệt và trở nên khó maintain.

**Keywords:** `one source of truth` → `same meaning` → `change in one place` → `do not extract by appearance`

## 13C. SOLID Principles [CORE]

**English question:** What are the SOLID principles, and how are they useful in frontend development?

**Simple English answer:**

> I see SOLID as a set of design guidelines that help code stay easier to change. I do not try to force all five principles into every React component. In frontend work, I use Single Responsibility most often. For example, a page handles routing, a component renders UI, a hook manages state or query logic, and a service handles API calls. I also keep component props small and prefer composition when I need to extend a component. The goal is not to show every SOLID principle in the code. The goal is to prevent one change from affecting many unrelated parts.

**If they ask you to name all five:**

> SOLID stands for Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. Liskov means a replacement should still follow the same contract. Dependency Inversion means high-level logic should depend on a stable abstraction instead of a low-level implementation detail.

**Câu hỏi tiếng Việt:** SOLID gồm những nguyên tắc nào và chúng hữu ích ra sao trong Frontend?

**Câu trả lời tiếng Việt:**

> Em xem SOLID là một nhóm guideline giúp code dễ thay đổi hơn. Em không cố ép cả năm nguyên tắc vào mọi React component. Trong Frontend, nguyên tắc em dùng thường xuyên nhất là Single Responsibility. Ví dụ, page xử lý routing, component render UI, hook quản lý state hoặc query logic, còn service xử lý API call. Em cũng giữ component props nhỏ và ưu tiên composition khi cần mở rộng component. Mục tiêu không phải là cố thể hiện đủ mọi nguyên tắc SOLID trong code. Mục tiêu là tránh để một thay đổi ảnh hưởng đến nhiều phần không liên quan.

**Nếu họ yêu cầu kể tên cả năm nguyên tắc:**

> SOLID gồm Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation và Dependency Inversion. Liskov nghĩa là một phần thay thế vẫn phải tuân theo cùng contract. Dependency Inversion nghĩa là high-level logic nên phụ thuộc vào abstraction ổn định thay vì một low-level implementation cụ thể.

**Keywords:** `guidelines, not a checklist` → `one responsibility` → `small props` → `composition` → `safe change`

## 13D. OOP in Modern React [CORE]

**English question:** What is OOP, and do you use it in a modern React application?

**Simple English answer:**

> OOP is a programming style that groups related data and behavior around objects. Its common ideas are encapsulation, abstraction, inheritance, and polymorphism. However, modern React does not require class-based OOP. In the QRTable Management App, the UI mainly uses function components, hooks, and composition. I still use ideas such as abstraction and encapsulation at the module level. For example, a feature service hides how an HTTP request is built, while the component only uses a clear hook. For UI code, I prefer composition over inheritance and only use OOP when it makes the code clearer.

**Câu hỏi tiếng Việt:** OOP là gì và bạn có dùng nó trong một React application hiện đại không?

**Câu trả lời tiếng Việt:**

> OOP là một programming style tổ chức data và behavior liên quan xung quanh object. Các ý tưởng thường gặp gồm encapsulation, abstraction, inheritance và polymorphism. Tuy nhiên, React hiện đại không bắt buộc dùng class-based OOP. Trong QRTable Management App, phần UI chủ yếu dùng function component, hook và composition. Em vẫn áp dụng các ý tưởng như abstraction và encapsulation ở mức module. Ví dụ, feature service che giấu cách tạo HTTP request, còn component chỉ sử dụng một hook rõ ràng. Với UI code, em ưu tiên composition hơn inheritance và chỉ dùng OOP khi nó thật sự giúp code rõ ràng hơn.

**Keywords:** `programming style` → `React is function-based` → `module abstraction` → `composition over inheritance` → `use only when clearer`

---

<a id="part-c"></a>

# Part C — Tailwind, shadcn/ui, Figma, UI/UX, SEO, and Performance

## 14. Tailwind CSS, shadcn/ui, and Lucide Icons [CORE]

**English question:** How do you use Tailwind CSS, shadcn/ui, and Lucide icons to build a consistent UI?

**Simple English answer:**

> When I need a UI control, I first check whether shadcn/ui already has a suitable primitive. For example, for an icon action button, I start with the shadcn Button and choose an existing size and variant. I use Tailwind to place it in the layout and reuse the project colors and spacing instead of adding random values. Then I add a Lucide icon so its style matches the other icons. Finally, I check the hover and focus states, keyboard use, and mobile size. If the button only shows an icon, I give it an accessible name with `aria-label`.

**Câu hỏi tiếng Việt:** Bạn dùng Tailwind CSS, shadcn/ui và Lucide icon như thế nào để xây UI nhất quán?

**Câu trả lời tiếng Việt:**

> Khi cần một UI control, đầu tiên em kiểm tra xem shadcn/ui đã có primitive phù hợp hay chưa. Ví dụ, với một icon action button, em bắt đầu bằng shadcn Button rồi chọn size và variant đã có. Em dùng Tailwind để đặt button vào layout và dùng lại màu sắc cùng spacing của project thay vì thêm giá trị ngẫu nhiên. Sau đó, em thêm Lucide icon để style của nó giống các icon khác. Cuối cùng, em kiểm tra hover, focus state, keyboard và kích thước trên mobile. Nếu button chỉ có icon, em thêm accessible name bằng `aria-label`.

**QRTable example in English:** The Management App uses a shadcn configuration with `rsc: true`, while the Customer App uses its own configuration with `rsc: false`. Both use CSS variables and Lucide.

**Ví dụ QRTable:** Management App dùng shadcn config với `rsc: true`; Customer App dùng config riêng với `rsc: false`. Cả hai dùng CSS variables và Lucide.

**Keywords:** `check shadcn` → `style with Tailwind` → `reuse values` → `Lucide` → `check accessibility`

## 15. From Figma Design to Production Code [CORE]

**English question:** What do you do when you receive a Figma design from a designer?

**Simple English answer:**

> When I receive a Figma design, I first look at the whole screen and understand what the user needs to do. Then I break the screen into sections, such as the header, filters, form, content area, and actions. I check which parts can reuse existing components, build the page structure, and implement the content inside each section. After the basic UI is clear, I add interactions and responsive behavior. Then I connect the API and handle loading, error, empty, disabled, and success states. Finally, I compare my result with Figma at the same screen size and fix the differences. If any behavior is not clear, I ask the designer or product owner.

**If they ask for more detail:**

> I adjust details such as spacing, colors, and typography after the main layout works. The UI states include loading, error, empty, disabled, and success states. I do not copy every pixel blindly because the screen still needs to work at different sizes.

**Câu hỏi tiếng Việt:** Khi nhận được một Figma design từ designer, bạn sẽ làm như thế nào?

**Câu trả lời tiếng Việt:**

> Khi nhận một thiết kế trên Figma, đầu tiên em xem toàn bộ screen để hiểu user cần làm gì. Sau đó, em chia screen thành các phần như header, filter, form, content area và action. Em kiểm tra phần nào có thể dùng lại component hiện có, xây page structure rồi triển khai nội dung bên trong từng section. Khi phần UI cơ bản đã rõ ràng, em thêm interaction và responsive behavior. Tiếp theo, em kết nối API và xử lý loading, error, empty, disabled cùng success state. Cuối cùng, em mở giao diện và Figma ở cùng kích thước màn hình để so sánh rồi sửa những chỗ chưa giống. Nếu có behavior nào chưa rõ, em hỏi lại designer hoặc product owner.

**Nếu họ hỏi chi tiết hơn:**

> Sau khi layout chính hoạt động, em mới chỉnh các chi tiết như spacing, màu sắc và typography. Các UI state gồm loading, error, empty, disabled và success. Em không copy từng pixel một cách máy móc vì screen vẫn phải hoạt động tốt ở nhiều kích thước khác nhau.

**If they ask for a real example:**

> During my internship at GEEK Up, I turned Figma designs for the Commitment Module into responsive React screens. I followed the existing component patterns, connected the screens to APIs, handled loading, error, and empty states, and checked the result at different screen sizes.

**Nếu họ hỏi ví dụ thực tế:**

> Trong thời gian thực tập tại GEEK Up, em đã chuyển các thiết kế trên Figma của Commitment Module thành các màn hình React responsive. Em làm theo component pattern có sẵn của dự án, kết nối các screen với API, xử lý loading, error và empty state, rồi kiểm tra kết quả ở nhiều kích thước màn hình.

**Honest boundary:** Với QRTable, bạn có thể nói mình áp dụng cùng cách suy nghĩ khi xây UI. Không claim rằng mọi QRTable screen đều được triển khai từ một Figma file chính thức.

**Keywords:** `understand user goal` → `split into sections` → `build layout and content` → `interaction and responsive` → `API states` → `compare with Figma`

## 16. UI/UX Consistency and Design Decisions [CORE]

**English question:** What does good UI/UX consistency mean to you?

**Simple English answer:**

> To me, consistency means that the same action should look and work in the same way across the app. For example, the primary button should keep the same style, and form errors should appear in the same place. Success and warning colors should also keep the same meaning. The Customer App and Management App can use different layouts because their users are different. However, buttons, inputs, icons, and feedback should still feel familiar.

**Câu hỏi tiếng Việt:** UI/UX consistency tốt có ý nghĩa gì với bạn?

**Câu trả lời tiếng Việt:**

> Với em, consistency nghĩa là cùng một action nên nhìn và hoạt động giống nhau trong toàn app. Ví dụ, primary button nên giữ cùng style và form error nên xuất hiện ở cùng một vị trí. Màu success và warning cũng nên giữ cùng ý nghĩa. Customer App và Management App có thể dùng layout khác nhau vì user khác nhau. Tuy nhiên, button, input, icon và feedback vẫn nên tạo cảm giác quen thuộc.

**Keywords:** `same meaning` → `predictable pattern` → `semantic colors` → `user context` → `familiar behavior`

## 17. Explaining QRTable’s UI and Layout Choices [PROJECT]

**English question:** Why did you choose these layouts and UI patterns for QRTable?

**Simple English answer:**

> We chose the layout based on how each user works. Customers normally use a phone after scanning a QR code, so the Customer App is mobile-first, with clear menu categories, large buttons, and an easy-to-find cart. Restaurant staff need to see more data at the same time, so the Management App uses wider layouts, tables, panels, and KDS columns. The two apps can look different, but common buttons, inputs, colors, and icons should still feel familiar.

**Câu hỏi tiếng Việt:** Vì sao bạn chọn các layout và UI pattern này cho QRTable?

**Câu trả lời tiếng Việt:**

> Bọn em chọn layout dựa trên cách từng user sử dụng app. Khách thường dùng điện thoại sau khi scan QR nên Customer App được làm theo hướng mobile-first, với menu category rõ ràng, button lớn và cart dễ tìm. Nhân viên nhà hàng cần xem nhiều dữ liệu cùng lúc nên Management App dùng layout rộng hơn, table, panel và KDS column. Hai app có thể nhìn khác nhau, nhưng button, input, màu sắc và icon dùng chung vẫn nên tạo cảm giác quen thuộc.

**Honest boundary:** Đây là design reasoning dựa trên product flow và UI hiện có. Không claim rằng mọi quyết định đã được user-research hoặc A/B test nếu chưa có bằng chứng.

**Keywords:** `different users` → `mobile customer` → `dense staff workspace` → `shared language` → `app-specific layout`

## 18. How SEO Works and How to Implement It in Next.js [CORE]

**English question:** How does SEO work, and how do you implement it in Next.js?

**Simple English answer:**

> A search engine first discovers a public page through links or a sitemap. It crawls the page, reads its content and metadata, and may add the page to its index. When a user searches, it can show the page if the content is relevant. Because of that, I start with useful content, semantic HTML, clear headings, links that can be followed, and good page speed. In Next.js, I add a clear title and description through static metadata or `generateMetadata`. I can also provide a sitemap, robots rules, and Open Graph information. Private pages such as POS or admin screens do not need public SEO.

**Câu hỏi tiếng Việt:** SEO hoạt động như thế nào và bạn triển khai nó trong Next.js ra sao?

**Câu trả lời tiếng Việt:**

> Đầu tiên, search engine tìm thấy public page thông qua link hoặc sitemap. Nó crawl page, đọc content cùng metadata rồi có thể thêm page vào index. Khi user search, search engine có thể hiển thị page nếu content phù hợp. Vì vậy, em bắt đầu bằng content hữu ích, semantic HTML, heading rõ ràng, link có thể được crawl và page speed tốt. Trong Next.js, em thêm title cùng description bằng static metadata hoặc `generateMetadata`. Em cũng có thể cung cấp sitemap, robots rule và Open Graph information. Các private page như POS hoặc admin screen không cần public SEO.

**QRTable example in English:** The public landing page has a title, description, and Open Graph metadata. Operational screens are not treated as public SEO pages.

**Ví dụ QRTable:** Public landing page đã có title, description và Open Graph metadata; operational screen không được xem là public SEO page.

**Keywords:** `discover` → `understand` → `index` → `metadata plus content` → `public pages only`

## 19. Image, Font, Build-Time, and Runtime Optimization [CORE]

**English question:** How do you optimize images and performance in a Next.js application?

**Simple English answer:**

> I do not start by guessing; I measure the problem first. For images, I use `next/image` with the correct width, height, and `sizes`. If the page is slow, I check how much client JavaScript it sends, how long API requests take, and whether React renders too much. Then I change one cause and measure the same result again. For example, if a bundle report shows that a heavy chart is increasing the first load, I can load that chart later with a dynamic import and compare the first-load JavaScript again. If the build is slow, I find which build step is taking the time before changing the configuration.

**If they ask about slow builds:**

> After I find the slow step, I check the build cache, large imports, Tailwind file scanning, and workspace packages. I change one thing at a time and compare the build time again.

**If they ask for more detail:**

> An image that gives information needs useful alt text, while a decorative image should use an empty alt value. I only preload an important image near the top of the page when it is really needed. I also use `next/font` or a well-configured local font, and I load heavy code later if the first screen does not need it.

**Câu hỏi tiếng Việt:** Bạn tối ưu image và performance trong Next.js application như thế nào?

**Câu trả lời tiếng Việt:**

> Em không bắt đầu bằng việc đoán mà đo vấn đề trước. Với image, em dùng `next/image` cùng width, height và `sizes` đúng. Nếu page chậm, em kiểm tra app gửi xuống bao nhiêu client JavaScript, API request mất bao lâu và React có render quá nhiều hay không. Sau đó, em thay đổi một nguyên nhân rồi đo lại cùng kết quả. Ví dụ, nếu bundle report cho thấy một chart nặng làm tăng first load, em có thể load chart đó trễ hơn bằng dynamic import rồi so sánh lại lượng JavaScript của lần tải đầu. Nếu build chậm, em tìm bước build nào đang tốn thời gian trước khi thay đổi configuration.

**Nếu họ hỏi về build chậm:**

> Sau khi tìm được bước chậm, em kiểm tra build cache, import lớn, phạm vi file Tailwind phải scan và workspace package. Em thay đổi từng thứ một rồi so sánh lại build time.

**Nếu họ hỏi chi tiết hơn:**

> Image cung cấp thông tin cần alt text có ý nghĩa, còn decorative image nên dùng alt rỗng. Em chỉ preload image quan trọng gần đầu page khi thật sự cần. Em cũng dùng `next/font` hoặc local font được cấu hình tốt và load phần code nặng trễ hơn nếu first screen chưa cần nó.

**QRTable example in English:** The Management App sets the Turbopack root for the Nx workspace, transpiles the required internal packages, creates standalone output, and limits remote image hosts. These settings exist in the project, but I still need measurements before saying that the build is fully optimized.

**Ví dụ QRTable:** Management App cấu hình Turbopack root cho Nx workspace, transpile các internal package cần thiết, tạo standalone output và giới hạn remote image host. Đây là configuration thật, nhưng em vẫn phải đo trước khi nói build đã được tối ưu hoàn toàn.

**Keywords:** `clarify build or runtime` → `Image sizes` → `avoid layout shift` → `measure` → `cache/imports/bundle`

## 19A. Dynamic Import and Code Splitting [FOLLOW-UP]

**English question:** When would you use dynamic import or code splitting in Next.js?

**Simple English answer:**

> I use dynamic import when a component is heavy and the first screen does not need it. For example, a chart, rich text editor, large modal, or client-only library can load later. This can reduce the JavaScript needed for the first page load. I do not split every small component because extra network requests also have a cost. I use `ssr: false` only for a component that depends on browser APIs and should run only in a Client Component.

**Câu hỏi tiếng Việt:** Khi nào bạn dùng dynamic import hoặc code splitting trong Next.js?

**Câu trả lời tiếng Việt:**

> Em dùng dynamic import khi component nặng nhưng first screen chưa cần nó. Ví dụ như chart, rich text editor, large modal hoặc client-only library có thể được load sau. Cách này có thể giảm lượng JavaScript cần tải ở lần mở page đầu tiên. Em không tách mọi component nhỏ vì thêm network request cũng có chi phí. Em chỉ dùng `ssr: false` cho component phụ thuộc browser API và chỉ nên chạy trong Client Component.

**Keywords:** `heavy but not first screen` → `load later` → `smaller initial JavaScript` → `do not split everything` → `browser-only component`

---

<a id="part-d"></a>

# Part D — QRTable Practical Defense

## 20. Walk Through the Frontend Architecture of Both Apps [PROJECT]

**English question:** Can you walk us through the frontend architecture of QRTable?

**Simple English answer:**

> QRTable has two frontend apps in one Nx monorepo. The Management App uses Next.js for restaurant staff, and the Customer App uses React with Vite for mobile QR ordering. Each app has its own routes, authentication or session, and feature code. Both apps call the BFF instead of calling each microservice directly. TanStack Query manages API data, and Socket.io tells the app when it should fetch new data.

**If they ask for more detail:**

> The Management App includes POS, KDS, menu, table, report, and administration features. The Customer App lets a customer scan the table QR code, browse the menu, manage the cart, place an order, and track payment. We only share a type, UI component, or helper when both apps really need the same thing. The BFF checks each request and sends it to the correct backend service.

**Câu hỏi tiếng Việt:** Bạn có thể mô tả frontend architecture của QRTable không?

**Câu trả lời tiếng Việt:**

> QRTable có hai frontend app trong cùng một Nx monorepo. Management App dùng Next.js cho nhân viên nhà hàng, còn Customer App dùng React với Vite cho việc đặt món bằng QR trên mobile. Mỗi app có route, authentication hoặc session và feature code riêng. Cả hai app gọi BFF thay vì gọi trực tiếp từng microservice. TanStack Query quản lý API data, còn Socket.io báo cho app biết khi nào cần lấy dữ liệu mới.

**Nếu họ hỏi chi tiết hơn:**

> Management App gồm các feature POS, KDS, menu, table, report và administration. Customer App cho phép khách scan QR của bàn, xem menu, quản lý cart, đặt món và theo dõi payment. Bọn em chỉ chia sẻ type, UI component hoặc helper khi cả hai app thật sự cần cùng một thứ. BFF kiểm tra từng request rồi gửi nó đến backend service phù hợp.

**Flow:**

```text
Management App or Customer App
  → BFF
  → NestJS microservice
  → response
  → TanStack Query cache
  → UI

Later backend change
  → Socket.io event
  → scope check
  → query invalidation
  → REST refetch
```

**Keywords:** `two apps` → `Nx monorepo` → `BFF` → `Query server state` → `Socket invalidation`

## 21. Explain One Real Order Flow in the Management App [PROJECT]

**English question:** Can you explain one real data flow in the Management App?

**Simple English answer:**

> One example is confirming a pending order. The staff clicks Confirm, the component calls a mutation hook, and the hook sends the request through the order service to the BFF. After it succeeds, we invalidate the related queries. This means we mark the cached order data as old and fetch the latest data again. If another client changes the order, a Socket.io event starts the same refresh.

**If they ask for code-level detail:**

> The screen calls `useConfirmOrderMutation`. It calls `orderService.confirmOrder`, which uses `authApiClient` to add the access token and tenant ID before sending a `POST` request. On success, the hook invalidates the order list, all order details, and the current order detail. For an external change, `useStaffOrderRealtime` receives `events.orderStatusChanged`, checks the tenant ID, and invalidates the related order and table queries. REST gives the final data; the socket only tells the app to fetch it again.

**Câu hỏi tiếng Việt:** Bạn có thể giải thích một data flow có thật trong Management App không?

**Câu trả lời tiếng Việt:**

> Một ví dụ là lúc staff xác nhận pending order. Staff nhấn Confirm, component gọi mutation hook và hook gửi request qua order service đến BFF. Sau khi thành công, bọn em invalidate các query liên quan. Điều đó nghĩa là bọn em đánh dấu order data trong cache đã cũ rồi lấy dữ liệu mới nhất lại. Nếu một client khác thay đổi order, Socket.io event cũng bắt đầu cùng quá trình refresh đó.

**Nếu họ hỏi đến mức code:**

> Screen gọi `useConfirmOrderMutation`. Hook này gọi `orderService.confirmOrder`; service dùng `authApiClient` để thêm access token và tenant ID trước khi gửi `POST` request. Khi thành công, hook invalidate order list, toàn bộ order detail và detail của order hiện tại. Với thay đổi từ bên ngoài, `useStaffOrderRealtime` nhận `events.orderStatusChanged`, kiểm tra tenant ID rồi invalidate order query và table query liên quan. REST cung cấp dữ liệu cuối cùng; socket chỉ báo cho app biết cần fetch lại.

**Keywords:** `user action` → `hook` → `service` → `authenticated client` → `BFF` → `cache`

## 22. Personal Contribution and Honest Limitations [PROJECT]

**English question:** What did you personally contribute, and what would you improve?

**Simple English answer:**

> I built this graduation project with one teammate. I worked on both frontend and backend, but I spent more time on the frontend. I organized feature code, connected screens to REST APIs, created query and mutation hooks, built data tables, and handled updates from Socket.io. My teammate and I discussed the main architecture and API contracts together.

**If they ask what you would improve:**

> I would split a few large components, make loading and error handling more consistent, and measure the bundle and build time. I would also review some broad query invalidations and make them more specific where it is safe.

**Câu hỏi tiếng Việt:** Bạn trực tiếp đóng góp phần nào và bạn muốn cải thiện điều gì?

**Câu trả lời tiếng Việt:**

> Em xây dự án tốt nghiệp này cùng một bạn trong nhóm. Em làm cả Frontend và Backend nhưng dành nhiều thời gian hơn cho Frontend. Em tổ chức code theo feature, kết nối screen với REST API, tạo query và mutation hook, xây data table và xử lý update từ Socket.io. Em và bạn cùng nhóm trao đổi với nhau về architecture chính và API contract.

**Nếu họ hỏi bạn muốn cải thiện điều gì:**

> Em sẽ tách một số component lớn, làm loading và error handling nhất quán hơn, đồng thời đo bundle và build time. Em cũng sẽ xem lại một số query invalidation đang khá rộng và làm chúng cụ thể hơn ở những chỗ an toàn.

**Keywords:** `two-person project` → `my direct work` → `shared decisions` → `honest limits` → `specific improvements`

---

<a id="part-e"></a>

# Part E — Team Fit, Learning, and English Communication

## 23. Learning a New Technology Without Depending on AI [TEAM FIT]

**English question:** How do you learn a new technology, especially when AI is not allowed?

**Simple English answer:**

> I start with one small problem instead of learning the whole tool at once. I read the official documentation, try a small example, and then use it in a real feature. For example, I tried `useQuery` and query keys before using TanStack Query in QRTable. Without AI, I can read the docs, search Google, read error messages, and debug step by step. If AI is allowed, I use it to save time, but I still check the answer and test the code myself.

**Câu hỏi tiếng Việt:** Bạn học công nghệ mới như thế nào, đặc biệt khi không được dùng AI?

**Câu trả lời tiếng Việt:**

> Em bắt đầu với một problem nhỏ thay vì học toàn bộ tool cùng lúc. Em đọc official documentation, thử một example nhỏ rồi dùng nó trong feature thật. Ví dụ, em thử `useQuery` và query key trước khi dùng TanStack Query trong QRTable. Nếu không có AI, em có thể đọc docs, search Google, đọc error message và debug từng bước. Nếu được dùng AI, em dùng nó để tiết kiệm thời gian nhưng vẫn tự kiểm tra câu trả lời và test code.

**Keywords:** `small problem` → `official docs` → `focused example` → `verify` → `not dependent on AI`

## 24. What Do You Do When You Are Blocked? [TEAM FIT]

**English question:** What do you do when you do not know how to solve a problem?

**Simple English answer:**

> When I am blocked, I first find the smallest part that is failing. I read the error, check the related code and documentation, and search for the exact error. If needed, I make a small test to separate the problem from the full feature. If I still need help, I tell my teammate what I expected, what actually happened, and what I already tried.

**Câu hỏi tiếng Việt:** Bạn làm gì khi chưa biết cách giải quyết một vấn đề?

**Câu trả lời tiếng Việt:**

> Khi bị kẹt, đầu tiên em tìm phần nhỏ nhất đang bị lỗi. Em đọc error, kiểm tra code và documentation liên quan, rồi search đúng error đó. Nếu cần, em làm một test nhỏ để tách vấn đề ra khỏi toàn bộ feature. Nếu vẫn cần hỗ trợ, em nói với teammate rằng em mong đợi điều gì, thực tế đã xảy ra gì và em đã thử những cách nào.

**Keywords:** `specific blocker` → `inspect` → `docs` → `small reproduction` → `clear question`

## 25. Startup Fit, Teamwork, and Feedback [TEAM FIT]

**English question:** How do you work in a fast startup team and receive feedback?

**Simple English answer:**

> I know that work in a startup can change quickly, so I try to ask about the current priority and report blockers early. At GEEK Up, I worked with Scrum and GitLab merge requests. When I received a review comment, I first made sure that I understood the problem, then I updated the code and replied with the change. If I have a different idea, I explain my reason, but after the team decides, I follow the decision and continue the work.

**Câu hỏi tiếng Việt:** Bạn làm việc trong startup team thay đổi nhanh và tiếp nhận feedback như thế nào?

**Câu trả lời tiếng Việt:**

> Em biết công việc trong startup có thể thay đổi nhanh nên em cố gắng hỏi rõ priority hiện tại và báo blocker sớm. Tại GEEK Up, em đã làm việc theo Scrum và dùng GitLab merge request. Khi nhận review comment, đầu tiên em bảo đảm mình hiểu đúng vấn đề, sau đó em sửa code và phản hồi lại phần đã thay đổi. Nếu có ý kiến khác, em giải thích lý do; nhưng sau khi team quyết định, em làm theo quyết định đó và tiếp tục công việc.

**Keywords:** `learn quickly` → `share early` → `understand feedback` → `explain` → `support decision`

## 26. Why Should We Choose You? [TEAM FIT]

**English question:** Why should we choose you for this frontend role?

**Simple English answer:**

> The main stack of this role matches the tools I used in my internship and graduation project, such as React, Next.js, TypeScript, TanStack Query, Tailwind, and shadcn/ui. My backend experience also helps me understand APIs, authentication, and how data moves through the system. I learn new tools actively, I ask when something is not clear, and I take responsibility for the code that I deliver. I can start immediately and focus on the frontend work that the team needs.

**Câu hỏi tiếng Việt:** Vì sao công ty nên chọn bạn cho vị trí Frontend này?

**Câu trả lời tiếng Việt:**

> Stack chính của vị trí này khớp với những tool em đã dùng trong internship và dự án tốt nghiệp như React, Next.js, TypeScript, TanStack Query, Tailwind và shadcn/ui. Kinh nghiệm Backend cũng giúp em hiểu API, authentication và cách dữ liệu đi qua hệ thống. Em chủ động học tool mới, hỏi lại khi có điều chưa rõ và chịu trách nhiệm với code mình bàn giao. Em có thể bắt đầu ngay và tập trung vào phần Frontend mà team đang cần.

**Keywords:** `matching stack` → `system thinking` → `integration` → `eager learner` → `ownership`

## 27. How Do You Handle English Communication? [TEAM FIT]

**English question:** Are you comfortable working and discussing technical topics in English?

**Simple English answer:**

> Yes, I can discuss technical topics in English using simple words. My speaking fluency is still improving, so if I do not hear a question clearly, I ask the speaker to repeat it or speak more slowly. If a topic is complex, I can explain it with a short flow, a diagram, or code. I am comfortable asking for clarification instead of pretending that I understand.

**Câu hỏi tiếng Việt:** Bạn có thoải mái làm việc và trao đổi kỹ thuật bằng tiếng Anh không?

**Câu trả lời tiếng Việt:**

> Có, em có thể trao đổi technical topic bằng English với những từ đơn giản. Khả năng nói trôi chảy của em vẫn đang cải thiện, nên nếu không nghe rõ câu hỏi, em sẽ nhờ người nói lặp lại hoặc nói chậm hơn. Nếu topic phức tạp, em có thể giải thích bằng một flow ngắn, sơ đồ hoặc code. Em sẵn sàng hỏi lại để làm rõ thay vì giả vờ rằng mình đã hiểu.

**Keywords:** `still improving` → `simple words` → `ask clearly` → `flow or diagram` → `keep practicing`

<a id="part-f"></a>

# Part F — Short Follow-Ups

> Chỉ học phần này sau khi các câu `[CORE]`, `[PROJECT]` và `[TEAM FIT]` đã ổn. Mỗi answer chỉ cần 15–30 giây.

## 28. What Causes a React Component to Render? [FOLLOW-UP]

**English question:** What causes a React component to render, and how do you avoid unnecessary work?

**Simple English answer:**

> A component can render when its state changes, when its props or context change, or when its parent renders. To avoid extra work, I keep state close to the component that needs it and avoid unnecessary effects. I only add memoization after I find a real performance problem. Stable keys help React keep the correct item in a list, but they do not stop every rerender.

**Câu hỏi tiếng Việt:** Điều gì làm React component render và bạn tránh công việc không cần thiết như thế nào?

**Câu trả lời tiếng Việt:**

> Component có thể render khi state thay đổi, khi props hoặc context thay đổi hoặc khi parent render. Để tránh công việc không cần thiết, em giữ state gần component cần nó và tránh effect không cần thiết. Em chỉ thêm memoization sau khi tìm thấy performance problem thật. Key ổn định giúp React giữ đúng item trong list nhưng không ngăn mọi lần rerender.

## 29. What Is `useEffect` For? [FOLLOW-UP]

**English question:** When should you use `useEffect`?

**Simple English answer:**

> I use `useEffect` to synchronize React with an external system, such as a socket connection, browser API, timer, or third-party widget. I do not use an effect for a value that I can calculate during render. When an effect creates a subscription, I return a cleanup function.

**Câu hỏi tiếng Việt:** Khi nào bạn nên dùng `useEffect`?

**Câu trả lời tiếng Việt:**

> Em dùng `useEffect` để đồng bộ React với external system như socket connection, browser API, timer hoặc third-party widget. Em không dùng effect cho một value có thể tính ngay trong lúc render. Khi effect tạo subscription, em return cleanup function.

## 30. What Is Hydration? [FOLLOW-UP]

**English question:** What is hydration?

**Simple English answer:**

> Hydration is the process where React connects JavaScript behavior to HTML that was already generated by the server. The user can see the server HTML first. After JavaScript loads, React attaches event handlers and restores interactivity for buttons, forms, and other client features.

**Câu hỏi tiếng Việt:** Hydration là gì?

**Câu trả lời tiếng Việt:**

> Hydration là quá trình React kết nối JavaScript behavior với HTML đã được server tạo trước đó. User có thể nhìn thấy server HTML trước. Sau khi JavaScript tải xong, React gắn event handler và khôi phục tương tác cho button, form cùng các client feature khác.

## 31. SSR, SSG, ISR, and CSR [FOLLOW-UP]

**English question:** How do you choose between SSR, SSG, ISR, and CSR?

**Simple English answer:**

> I choose the rendering method based on how often the content changes, whether it is different for each request, and how much interaction the page needs. I use SSG for public content that rarely changes. I use ISR when that static content needs to refresh after a period of time. I use SSR when the HTML needs current or request-specific data. I use CSR for highly interactive or user-specific screens that mainly load data in the browser. In QRTable, a public landing page can use static or server rendering for fast content and SEO, while POS is more client-side because it has many user actions and realtime data.

**Câu hỏi tiếng Việt:** Bạn chọn SSR, SSG, ISR và CSR như thế nào?

**Câu trả lời tiếng Việt:**

> Em chọn cách render dựa trên mức độ content thay đổi, dữ liệu có khác nhau theo từng request hay không và page cần tương tác nhiều đến mức nào. Em dùng SSG cho public content ít thay đổi. Em dùng ISR khi static content đó cần được cập nhật lại sau một khoảng thời gian. Em dùng SSR khi HTML cần dữ liệu mới hoặc dữ liệu riêng của từng request. Em dùng CSR cho screen có nhiều tương tác hoặc dữ liệu theo user và chủ yếu tải data trong browser. Trong QRTable, public landing page có thể dùng static hoặc server rendering để content hiển thị nhanh và hỗ trợ SEO, còn POS thiên về client vì có nhiều user action và realtime data.

## 32. Query Keys, `staleTime`, and Invalidation [FOLLOW-UP]

**English question:** What are query keys, `staleTime`, and invalidation?

**Simple English answer:**

> A query key is like the address of data in the TanStack Query cache. It should include values such as an ID, page number, or filter when those values change the result. `staleTime` says how long the data is still fresh. Invalidation marks the matching data as old, so an active query can fetch the latest result again.

**Câu hỏi tiếng Việt:** Query key, `staleTime` và invalidation là gì?

**Câu trả lời tiếng Việt:**

> Query key giống như địa chỉ của dữ liệu trong TanStack Query cache. Nó nên chứa các value như ID, page number hoặc filter nếu những value đó làm thay đổi kết quả. `staleTime` cho biết dữ liệu còn được xem là fresh trong bao lâu. Invalidation đánh dấu matching data đã cũ để active query có thể lấy kết quả mới nhất lại.

## 33. Why Not Store Server Data in Zustand? [FOLLOW-UP]

**English question:** Why should you not copy server data into Zustand?

**Simple English answer:**

> Data from an API belongs to the server. TanStack Query already handles its cache, loading, errors, and refetching. If I copy the same data into Zustand, I now have two copies that can become different. I use Zustand for client state, such as UI state shared by separate components, not as a second cache for the same API response.

**Câu hỏi tiếng Việt:** Vì sao không nên copy server data vào Zustand?

**Câu trả lời tiếng Việt:**

> Dữ liệu từ API thuộc về server. TanStack Query đã xử lý cache, loading, error và refetch cho dữ liệu đó. Nếu em copy cùng data vào Zustand, em sẽ có hai bản dữ liệu có thể bị lệch nhau. Em dùng Zustand cho client state, ví dụ UI state được chia sẻ giữa các component tách biệt, chứ không dùng nó như cache thứ hai cho cùng API response.

## 34. Client-Side Versus Server-Side Table Operations [FOLLOW-UP]

**English question:** When do you use client-side or server-side table pagination, filtering, and sorting?

**Simple English answer:**

> I use client-side operations when the dataset is small and already loaded. I use server-side operations when the dataset is large, changes often, or needs database-level search and sorting. Pagination, filtering, and sorting should move together so the user sees one consistent result.

**Câu hỏi tiếng Việt:** Khi nào bạn dùng pagination, filtering và sorting ở client hoặc server?

**Câu trả lời tiếng Việt:**

> Em dùng client-side operation khi dataset nhỏ và đã được tải. Em dùng server-side operation khi dataset lớn, thay đổi thường xuyên hoặc cần search và sorting ở database. Pagination, filtering và sorting nên được chuyển cùng nhau để user nhìn thấy một kết quả nhất quán.

---

<a id="english-rescue"></a>

# English Rescue Lines / Câu Chữa Cháy

## Khi không nghe rõ

> Sorry, could you repeat the question a little more slowly?

## Khi cần vài giây suy nghĩ

> Let me take a moment to think.

> Let me think about the main idea first.

## Khi cần xác nhận ý câu hỏi

> Do you mean build time, or runtime performance in the browser?

> Do you mean local UI state, or data from the server?

## Khi không nhớ đúng thuật ngữ

> I do not remember the exact English term, but I can explain the idea.

## Khi muốn giải thích bằng flow

> I can explain it with a simple flow.

> The component calls the hook, the hook calls the service, and the service calls the API.

## Khi thật sự chưa biết

> I have not used that part directly yet. My current understanding is [...]. I would confirm it in the official documentation before implementing it.

---

<a id="keyword-sheet"></a>

# Last-Minute Keyword Sheet

| Topic          | Keyword chain                                                            |
| -------------- | ------------------------------------------------------------------------ |
| Component      | `one job → small typed props → split → share when really reused`         |
| Input          | `label → value → error → disabled → accessible markup`                   |
| React basics   | `props from parent → state is local → immutable update → setter`         |
| Form state     | `value + onChange → controlled input → lift only when siblings share`    |
| Organization   | `page → feature → component → hook → service → API client`               |
| Server/Client  | `show data on server → interaction needs client → keep use client close` |
| State          | `server or client → Query/useState/Context/Zustand/URL`                  |
| TanStack Query | `QueryClient → keys → service → mutation → invalidate`                   |
| TanStack Table | `Query gets rows → Table handles logic → shadcn shows UI`                |
| Clean code     | `one job → clear names → small props → split when needed`                |
| UI system      | `check shadcn → Tailwind → reuse values → Lucide → accessibility`        |
| Figma          | `understand → sections → layout + content → interaction → API → compare` |
| UI/UX          | `user context → consistency → semantic colors → clear feedback`          |
| SEO            | `discover → understand → index → metadata + content + performance`       |
| Image          | `dimensions/fill → sizes → alt → avoid layout shift → measure`           |
| Build          | `clarify → measure → cache → imports/packages → compare`                 |
| Lazy loading   | `heavy, not first screen → dynamic import → load later → measure`        |
| QRTable        | `two apps → BFF → microservices → Query cache → Socket invalidation`     |
| Team fit       | `active → friendly → eager learner → share blockers → ownership`         |

---

<a id="truth-guardrails"></a>

# Truth Guardrails / Ranh Giới Nói Trung Thực

- Nói **I implemented** cho phần bạn trực tiếp làm.
- Nói **we designed** cho quyết định của team hai người.
- Nói **I integrated or reviewed** cho phần bạn hiểu và kết nối nhưng không làm chính.
- Nói **I would improve** cho đề xuất chưa được triển khai.
- Không claim mọi Management page đều server-first.
- Không claim TanStack Query server hydration đã được dùng rộng rãi.
- Không claim mọi QRTable screen đều đến từ Figma chính thức.
- Không claim Customer App là một offline/installable PWA hoàn chỉnh nếu chưa có bằng chứng.
- Không claim mọi build optimization đã được triển khai hoặc đo lường đầy đủ.

---

<a id="qrtable-code-evidence"></a>

# QRTable Code Evidence / Code Để Mở Khi Cần Show Project

- [Management App Next.js configuration](../../apps/management-app/next.config.ts)
- [Management App Server-rendered landing page](../../apps/management-app/src/app/page.tsx)
- [Management App providers and QueryClient](../../apps/management-app/src/app/providers.tsx)
- [Management App shadcn configuration](../../apps/management-app/components.json)
- [Customer App shadcn configuration](../../apps/customer-pwa/components.json)
- [Table query hooks](../../apps/management-app/src/features/tables/hooks/use-tables-query.ts)
- [Table mutations and invalidation](../../apps/management-app/src/features/tables/hooks/use-tables-mutations.ts)
- [TanStack Table implementation](../../apps/management-app/src/features/tables/components/tables-table.tsx)
- [Order query and mutation flow](../../apps/management-app/src/features/order/hooks/use-order-query.ts)
- [Staff realtime invalidation flow](../../apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts)
- [Authenticated API client](../../apps/management-app/src/lib/api/authenticated-client.ts)
- [Customer session provider](../../apps/customer-pwa/src/features/session/context/session-provider.tsx)
- [Customer query keys](../../apps/customer-pwa/src/features/order/hooks/order-query-keys.ts)

<a id="official-sources"></a>

# Official Sources / Nguồn Chính Thức

- [React — Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React — Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component)
- [React — Updating Objects in State](https://react.dev/learn/updating-objects-in-state)
- [React — `<input>` Reference](https://react.dev/reference/react-dom/components/input)
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js — Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js — Lazy Loading](https://nextjs.org/docs/app/guides/lazy-loading)
- [Next.js — Metadata and OG Images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js — Image Component](https://nextjs.org/docs/app/api-reference/components/image)
- [Next.js — Local Development Performance](https://nextjs.org/docs/app/guides/local-development)
- [TanStack Query — React Overview](https://tanstack.com/query/latest/docs/framework/react/overview)
- [TanStack Query — Query Invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)
- [TanStack Table — React Guide](https://tanstack.com/table/v8/docs/framework/react/react-table)
- [Tailwind CSS — Theme Variables](https://tailwindcss.com/docs/theme)
- [shadcn/ui — Components](https://ui.shadcn.com/docs/components)
- [Lucide — Accessibility](https://lucide.dev/guide/advanced/accessibility)
