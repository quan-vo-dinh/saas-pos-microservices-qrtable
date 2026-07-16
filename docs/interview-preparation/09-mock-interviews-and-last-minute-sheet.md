# Mock Interview and Last-Minute Sheet — Friday Onsite

> File này dùng để kiểm tra phản xạ sau khi học [Friday Onsite Core Pack](11-friday-onsite-core-pack.md). Mỗi câu vẫn có Q&A song ngữ đặt cạnh nhau, nhưng model answer được rút ngắn để tránh lặp lại toàn bộ Core Pack.
>
> Tạm thời không luyện live coding trong file này.

## How to Run the Mock / Cách Chạy Mock

1. Che phần answer hoặc nhờ người khác đọc question.
2. Trả lời technical question trong 30–60 giây và team-fit question trong 30–45 giây.
3. Sau đó mới so sánh với short answer và Core Pack.
4. Chỉ mở answer bank khác cho câu có điểm 0 hoặc 1.

| Score | Meaning / Ý nghĩa                                             |
| ----: | ------------------------------------------------------------- |
|     0 | Không hiểu hoặc không thể bắt đầu                             |
|     1 | Có ý đúng nhưng rời rạc, thiếu reason hoặc example            |
|     2 | Trả lời trực tiếp, đúng bản chất và có reason hoặc example    |
|     3 | Trả lời tự nhiên, có project evidence và xử lý được follow-up |

Mục tiêu: không có core question nào bằng 0 và điểm trung bình ít nhất là 2.

---

# Mock 1 — Core Onsite Interview

## Round 1 — Background

### 1. Tell Me About Yourself

**English question:** Could you tell us about yourself and your recent experience?

**Simple English answer**

> My name is Minh Quan, and you can call me Minh. I am a final-year Information Systems student at UIT, and I recently completed my thesis defense. My QRTable thesis has a NestJS microservices backend and two frontend apps; I worked on both sides but focused more on frontend work.

**Câu hỏi tiếng Việt:** Bạn có thể giới thiệu về bản thân và kinh nghiệm gần đây không?

**Câu trả lời tiếng Việt**

> Tôi là Minh Quân, sinh viên năm cuối ngành Hệ thống Thông tin tại UIT và vừa hoàn thành bảo vệ khóa luận. QRTable có backend Microservices bằng NestJS cùng hai frontend app; tôi làm cả hai phía nhưng tập trung nhiều hơn vào Frontend.

**Review:** Core Pack — Part A.

### Follow-Up: Why Frontend If Your Thesis Is Backend-Heavy?

**English question:** Your thesis sounds backend-heavy. Why are you applying for a frontend role?

**Simple English answer**

> QRTable also has two real frontend applications, and I worked on components, API integration, state, tables, and realtime updates. My backend knowledge helps me understand contracts and data flow, but I want to focus on frontend delivery in this role.

**Câu hỏi tiếng Việt:** Khóa luận của bạn nghe có vẻ nặng Backend. Vì sao bạn ứng tuyển vị trí Frontend?

**Câu trả lời tiếng Việt**

> QRTable cũng có hai frontend application thật và tôi đã làm component, API integration, state, table cùng realtime update. Kiến thức Backend giúp tôi hiểu contract và data flow, nhưng ở vị trí này tôi muốn tập trung vào frontend delivery.

---

## Round 2 — React, Next.js, and Frontend Practice

### 2. React Versus Next.js

**English question:** What is the difference between React and Next.js, and why did QRTable use both?

**Simple English answer**

> React is a UI library, while Next.js is a React framework with routing, layouts, Server Components, and server rendering. QRTable uses Next.js for the larger Management App and React with Vite for the focused Customer App.

**Câu hỏi tiếng Việt:** React khác Next.js như thế nào và vì sao QRTable dùng cả hai?

**Câu trả lời tiếng Việt**

> React là UI library, còn Next.js là React framework có routing, layout, Server Component và server rendering. QRTable dùng Next.js cho Management App lớn hơn và React với Vite cho Customer App tập trung hơn.

**Review:** Core Pack — Technical Question 1.

### 3. Reusable Component Design

**English question:** How do you create a reusable component without making it too generic?

**Simple English answer**

> I give the component one responsibility, define typed props, decide who owns its state, and handle important UI states. I prefer composition and extract a shared component only when its reusable purpose is clear.

**Câu hỏi tiếng Việt:** Bạn tạo reusable component như thế nào mà không generic hóa nó quá mức?

**Câu trả lời tiếng Việt**

> Tôi cho component một responsibility, định nghĩa typed props, xác định ai sở hữu state và xử lý các UI state quan trọng. Tôi ưu tiên composition và chỉ extract shared component khi mục đích tái sử dụng đã rõ.

**Review:** Core Pack — Technical Question 2.

### 4. Rendering and `useEffect`

**English question:** What causes a React component to render, and when should you use `useEffect`?

**Simple English answer**

> A component can render when state, props, or context changes, or when its parent renders. I use `useEffect` to synchronize with an external system and measure a real problem before adding memoization.

**Câu hỏi tiếng Việt:** Điều gì làm React component render và khi nào bạn nên dùng `useEffect`?

**Câu trả lời tiếng Việt**

> Component có thể render khi state, props hoặc context thay đổi, hoặc khi parent render. Tôi dùng `useEffect` để đồng bộ với external system và đo vấn đề thật trước khi thêm memoization.

**Review:** Core Pack — Technical Question 3.

### 5. Feature Organization

**English question:** How do you organize a frontend feature in a Next.js project?

**Simple English answer**

> We organize most code by business feature: the route composes the screen, the component owns the flow, the hook owns state or cache behavior, and the typed service calls the API. I add a layer only when it has a clear responsibility.

**Câu hỏi tiếng Việt:** Bạn tổ chức một frontend feature trong Next.js project như thế nào?

**Câu trả lời tiếng Việt**

> Chúng tôi tổ chức phần lớn code theo business feature: route compose screen, component sở hữu flow, hook sở hữu state hoặc cache behavior và typed service gọi API. Tôi chỉ thêm layer khi nó có responsibility rõ ràng.

**Review:** Core Pack — Technical Question 4.

### 6. Server and Client Components

**English question:** How do you choose between a Server Component and a Client Component? What does `'use client'` do?

**Simple English answer**

> I use a Server Component for suitable server data and static content, and a Client Component for state, effects, events, or browser APIs. `'use client'` starts the client boundary, so I keep it close to the interactive part.

**Câu hỏi tiếng Việt:** Bạn chọn Server Component hay Client Component như thế nào? `'use client'` làm gì?

**Câu trả lời tiếng Việt**

> Tôi dùng Server Component cho server data và static content phù hợp, còn Client Component dành cho state, effect, event hoặc browser API. `'use client'` bắt đầu client boundary nên tôi giữ nó gần phần tương tác.

**Review:** Core Pack — Technical Question 5.

### 7. API Calls in Next.js

**English question:** When would you fetch data on the server, and when would you use TanStack Query?

**Simple English answer**

> I fetch on the server for useful initial HTML or public, read-heavy content. I use TanStack Query when the client needs caching, refetching, mutations, or realtime recovery through feature hooks and typed services.

**Câu hỏi tiếng Việt:** Khi nào bạn fetch data ở server và khi nào dùng TanStack Query?

**Câu trả lời tiếng Việt**

> Tôi fetch ở server cho initial HTML hữu ích hoặc public content chủ yếu để đọc. Tôi dùng TanStack Query khi client cần cache, refetch, mutation hoặc realtime recovery thông qua feature hook và typed service.

**Review:** Core Pack — Technical Question 6.

### 8. State Ownership

**English question:** How do you decide between local state, URL state, Context, Zustand, and TanStack Query?

**Simple English answer**

> I start from the source of truth: API data belongs in Query, small interactions in local state, shareable filters in the URL, simple subtree state in Context, and shared client state in Zustand. I avoid storing the same data twice.

**Câu hỏi tiếng Việt:** Bạn quyết định giữa local state, URL state, Context, Zustand và TanStack Query như thế nào?

**Câu trả lời tiếng Việt**

> Tôi bắt đầu từ source of truth: API data thuộc Query, interaction nhỏ thuộc local state, filter cần chia sẻ thuộc URL, subtree state đơn giản thuộc Context và shared client state thuộc Zustand. Tôi tránh lưu cùng dữ liệu hai lần.

**Review:** Core Pack — Technical Question 7.

### 9. TanStack Query in Practice

**English question:** How did you set up and use TanStack Query in QRTable?

**Simple English answer**

> Each app has one QueryClient, while each feature has query keys, a typed service, and query or mutation hooks. Protected queries wait for authentication, and successful mutations update known data or invalidate the smallest related query.

**Câu hỏi tiếng Việt:** Bạn setup và sử dụng TanStack Query trong QRTable như thế nào?

**Câu trả lời tiếng Việt**

> Mỗi app có một QueryClient, còn mỗi feature có query key, typed service và query hoặc mutation hook. Protected query đợi authentication và mutation thành công sẽ update dữ liệu đã biết hoặc invalidate query liên quan nhỏ nhất.

**Review:** Core Pack — Technical Question 8.

### 10. TanStack Table in Practice

**English question:** How did you use TanStack Table and shadcn/ui for complex data screens?

**Simple English answer**

> TanStack Query provides the data, TanStack Table manages headless behavior, and shadcn provides the visual table components. I use typed columns and controlled state, then move sorting or pagination to the server when the dataset becomes large.

**Câu hỏi tiếng Việt:** Bạn dùng TanStack Table và shadcn/ui cho complex data screen như thế nào?

**Câu trả lời tiếng Việt**

> TanStack Query cung cấp data, TanStack Table quản lý headless behavior và shadcn cung cấp visual table component. Tôi dùng typed column cùng controlled state rồi chuyển sorting hoặc pagination sang server khi dataset lớn.

**Review:** Core Pack — Technical Question 9.

### 11. Figma to Production UI

**English question:** How do you translate a Figma design into a responsive and maintainable interface?

**Simple English answer**

> I inspect the flow, layout, tokens, breakpoints, reusable components, and UI states before coding. Then I compose Tailwind and shadcn components, keep business behavior in the feature, and compare the result at important viewport sizes.

**Câu hỏi tiếng Việt:** Bạn chuyển Figma design thành responsive và maintainable interface như thế nào?

**Câu trả lời tiếng Việt**

> Tôi xem flow, layout, token, breakpoint, reusable component và UI state trước khi code. Sau đó tôi compose Tailwind cùng shadcn component, giữ business behavior trong feature và so sánh kết quả ở các viewport quan trọng.

**Review:** Core Pack — Technical Question 10.

### 12. Build Time and Runtime Performance

**English question:** How would you optimize a slow Next.js project?

**Simple English answer**

> First, I ask whether the problem is build time or browser runtime. I measure before checking build tools and caches, imports, Tailwind scanning, Server/Client boundaries, bundles, network requests, or React rendering.

**Câu hỏi tiếng Việt:** Bạn sẽ tối ưu một Next.js project đang chậm như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi hỏi vấn đề nằm ở build time hay browser runtime. Tôi đo trước khi kiểm tra build tool và cache, import, Tailwind scanning, Server/Client boundary, bundle, network request hoặc React rendering.

**Required clarification:** “Do you mean development and build time, or runtime performance in the browser?”

**Review:** Core Pack — Technical Question 11.

### 13. Complete QRTable Flow

**English question:** Can you walk us through one complete flow from the frontend to the backend and back to the UI?

**Simple English answer**

> A feature component calls a mutation hook, which calls a typed service and sends the request through the BFF to the correct NestJS microservice. The response updates Query data, and a later Socket.io event can invalidate the related query.

**Câu hỏi tiếng Việt:** Bạn có thể trình bày một flow hoàn chỉnh từ Frontend đến Backend rồi quay lại UI không?

**Câu trả lời tiếng Việt**

> Feature component gọi mutation hook; hook gọi typed service rồi gửi request qua BFF đến NestJS microservice phù hợp. Response update Query data và Socket.io event sau đó có thể invalidate query liên quan.

**Review:** Core Pack — Technical Question 12.

### 14. Personal Contribution

**English question:** What did you personally implement, and what did you design with your teammate?

**Simple English answer framework**

> This was a two-person project. I directly worked on […], and we designed […] together. My teammate mainly handled […], but I integrated or reviewed that part and understand how it connects.

**Câu hỏi tiếng Việt:** Bạn trực tiếp implement phần nào và phần nào được thiết kế cùng teammate?

**Khung trả lời tiếng Việt**

> Đây là dự án hai người. Tôi trực tiếp làm […] và chúng tôi cùng thiết kế […]. Teammate của tôi phụ trách chính […], nhưng tôi có tích hợp hoặc review phần đó và hiểu cách nó kết nối.

---

## Round 3 — Team Fit

### 15. Learning a New Technology

**English question:** How do you learn a new technology, especially when you cannot use AI?

**Simple English answer**

> I read official documentation, build a small example, and apply the technology to a real feature. AI can speed up research at work, but I can still use requirements, existing code, search, and documentation, and I verify the result myself.

**Câu hỏi tiếng Việt:** Bạn học công nghệ mới như thế nào, đặc biệt khi không thể dùng AI?

**Câu trả lời tiếng Việt**

> Tôi đọc official documentation, làm example nhỏ rồi áp dụng công nghệ vào feature thật. AI có thể tăng tốc research trong công việc, nhưng tôi vẫn có thể dùng requirement, existing code, search và documentation rồi tự kiểm tra kết quả.

### 16. Blockers and Changing Requirements

**English question:** What do you do when you are blocked or when a requirement changes?

**Simple English answer**

> I identify the exact blocker, inspect the error and code, and check the documentation before asking one clear question. When a requirement changes, I confirm the new goal and communicate the affected flow, state, API, and delivery time early.

**Câu hỏi tiếng Việt:** Bạn làm gì khi bị blocked hoặc requirement thay đổi?

**Câu trả lời tiếng Việt**

> Tôi xác định blocker chính xác, kiểm tra error và code rồi xem documentation trước khi đặt một câu hỏi rõ ràng. Khi requirement thay đổi, tôi xác nhận goal mới và báo sớm flow, state, API cùng delivery time bị ảnh hưởng.

### 17. Startup Fit and Feedback

**English question:** Why do you fit a startup team, and how do you respond to feedback?

**Simple English answer**

> I like working close to the product, learning unfamiliar tools, sharing progress, and owning a complete feature. I understand the problem behind feedback, discuss different opinions respectfully, and support the final team decision.

**Câu hỏi tiếng Việt:** Vì sao bạn phù hợp startup team và bạn phản hồi feedback như thế nào?

**Câu trả lời tiếng Việt**

> Tôi thích làm việc gần product, học tool chưa quen, chia sẻ progress và chịu ownership cho một feature hoàn chỉnh. Tôi hiểu vấn đề phía sau feedback, trao đổi quan điểm khác một cách tôn trọng và ủng hộ quyết định cuối cùng của team.

### 18. Questions for the Team

**English question:** Do you have any questions for us?

**Simple English answer**

> Yes. What result matters most for the new frontend developer in the first six to eight weeks? Also, what are the biggest frontend problems that the team wants this person to solve?

**Câu hỏi tiếng Việt:** Bạn có câu hỏi nào dành cho team không?

**Câu trả lời tiếng Việt**

> Có. Kết quả nào là quan trọng nhất với Frontend Developer mới trong sáu đến tám tuần đầu? Ngoài ra, những vấn đề Frontend lớn nhất mà team muốn người này giải quyết là gì?

---

## Mock 1 Review

- [ ] Introduction không dài hơn 60 giây.
- [ ] Mỗi answer có direct answer trước explanation.
- [ ] Có ít nhất sáu QRTable hoặc GEEK Up examples.
- [ ] Nói được component design và feature organization.
- [ ] Phân biệt được server data với client-owned state.
- [ ] Phân biệt được build time với runtime performance.
- [ ] Nói đúng phần trực tiếp implement trong dự án hai người.
- [ ] Thể hiện friendly, active và eager learner.
- [ ] Không có core question nào bằng 0; điểm trung bình ít nhất là 2.

---

# Mock 2 — Optional Pressure Follow-Ups

> Không học phần này trước khi Mock 1 đạt yêu cầu.

## 1. Your POS Is Client-Heavy. Are You Really Using Next.js Well?

**Simple English answer**

> POS needs sockets, mutations, timers, filters, and user interaction, so its main UI needs client code. I would measure and move suitable static work to the server, but I would not move interactive state only to increase the Server Component count.

**Câu hỏi tiếng Việt:** POS thiên về client; bạn có thật sự dùng Next.js tốt không?

**Câu trả lời tiếng Việt**

> POS cần socket, mutation, timer, filter và user interaction nên UI chính cần client code. Tôi sẽ đo rồi chuyển phần static phù hợp lên server, nhưng không chuyển interactive state chỉ để tăng số Server Component.

## 2. Why Not Store API Data in Zustand?

**Simple English answer**

> TanStack Query already owns loading, errors, caching, and refetching for API data. Copying it to Zustand creates two sources of truth, so Zustand should keep client-owned state instead.

**Câu hỏi tiếng Việt:** Vì sao không lưu API data trong Zustand?

**Câu trả lời tiếng Việt**

> TanStack Query đã sở hữu loading, error, caching và refetching cho API data. Copy nó sang Zustand tạo hai source of truth nên Zustand chỉ nên giữ client-owned state.

## 3. Why Not Put Everything in a Shared Component Library?

**Simple English answer**

> I share a component when its meaning and behavior are stable across products. Business-specific components stay inside their features so the shared API does not become too generic.

**Câu hỏi tiếng Việt:** Vì sao không đưa mọi component vào shared library?

**Câu trả lời tiếng Việt**

> Tôi share component khi meaning và behavior ổn định giữa các product. Business-specific component nằm trong feature để shared API không trở nên quá generic.

## 4. Your Build Is Slow. What Will You Change First?

**Simple English answer**

> I do not change a configuration first. I reproduce and measure the build, find whether compilation, types, dependencies, or cache is slow, change that bottleneck, and measure again.

**Câu hỏi tiếng Việt:** Build chậm; bạn sẽ thay đổi gì đầu tiên?

**Câu trả lời tiếng Việt**

> Tôi không thay configuration ngay. Tôi tái hiện và đo build, tìm xem compile, type, dependency hay cache đang chậm, thay đổi bottleneck đó rồi đo lại.

## 5. What If You Cannot Use AI?

**Simple English answer**

> I read the requirement, inspect existing code, search official documentation, build the smallest correct part, and verify it. AI can make work faster, but I still need to understand and explain the code myself.

**Câu hỏi tiếng Việt:** Bạn làm gì nếu không được dùng AI?

**Câu trả lời tiếng Việt**

> Tôi đọc requirement, kiểm tra existing code, tìm official documentation, xây phần đúng nhỏ nhất rồi verify. AI có thể giúp làm nhanh hơn, nhưng tôi vẫn phải tự hiểu và giải thích code.

## 6. Why Should We Choose You over a Pure Frontend Candidate?

**Simple English answer**

> I would not claim that I am stronger than every pure frontend candidate. I can show real React and Next.js work, while my backend knowledge helps me understand API contracts, data flow, and failure cases; I also learn quickly and own the final result.

**Câu hỏi tiếng Việt:** Vì sao nên chọn bạn thay vì một ứng viên Frontend thuần?

**Câu trả lời tiếng Việt**

> Tôi không claim mình mạnh hơn mọi ứng viên Frontend thuần. Tôi có thể chứng minh kinh nghiệm React và Next.js thật, còn kiến thức Backend giúp tôi hiểu API contract, data flow và failure case; tôi cũng học nhanh và chịu ownership cho kết quả cuối cùng.

---

# Last-Minute Sheet / Tờ Ôn Trước Khi Đi Phỏng Vấn

## Positioning Sentence

> I am a frontend-focused TypeScript developer. I have worked with React, Next.js, TanStack Query, TanStack Table, Tailwind, and shadcn/ui. My backend knowledge helps me understand API contracts and data flow.

## Five Stories to Remember

1. Vì sao QRTable tách Management App và Customer App.
2. Route → feature → hook → service → BFF.
3. Query, Zustand, Context và local state có ownership khác nhau.
4. TanStack Table behavior kết hợp shadcn visual components.
5. GEEK Up: Figma → responsive React UI → API states → review.

## Easy English Rescue Lines

1. “Could you repeat the question a little more slowly?”
2. “Please give me a few seconds to think.”
3. “Do you mean A or B?”
4. “The main reason is…”
5. “I can give an example from QRTable.”
6. “I have not used that directly, so I do not want to guess.”
7. “Sorry, let me say that again.”

## Facts to Keep Consistent

- Preferred name in the current script: Minh.
- Expected salary: `16M VND gross`.
- Location: Cobi Tower 1, floor 2, District 7.
- Confirm Monday availability only if it remains true.
- QRTable was a two-person project.

## Stop Rule / Quy Tắc Dừng Ôn

Hai giờ trước phỏng vấn:

- Không mở topic mới hoặc Mock 2.
- Xem lại Core Pack keywords, Personal Ownership và năm stories.
- Nói lại introduction, build-time answer và team-fit answers một lần.
- Kiểm tra đường đi, laptop, charger, nước và notebook.
- Nói chậm, trả lời trực tiếp, đưa một reason hoặc example rồi dừng.
