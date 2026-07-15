# VILIHA Interview Master Plan and JD Analysis / Kế Hoạch Tổng Thể và Phân Tích JD VILIHA

> Status: Answer banks complete; ready for rehearsal / Đã hoàn thành answer banks; sẵn sàng luyện tập  
> Target role: Front-End Developer (Next.js)  
> Timebox: 24–48 hours before the interview / 24–48 giờ trước phỏng vấn  
> Candidate: Võ Đình Minh Quân  
> Last reviewed against the repository: 2026-07-15

This is the master plan for a complete interview answer bank, not the answer bank itself and not a product or architecture source of truth. Use the [interview preparation index](README.md) to open the ready-to-speak study materials. English appears first because the interview is conducted in English; Vietnamese explains the intent, trade-offs, and practice method.

Đây là master plan dùng để xây dựng toàn bộ kho câu trả lời phỏng vấn, không phải answer bank để học trực tiếp và cũng không phải source of truth về sản phẩm hoặc kiến trúc. Mở [mục lục ôn phỏng vấn](README.md) để truy cập các tài liệu ready-to-speak. Tiếng Anh được đặt trước vì buổi phỏng vấn diễn ra bằng tiếng Anh; tiếng Việt giải thích mục tiêu, trade-off và cách luyện tập.

## 1. Outcome / Kết Quả Cần Đạt

**English:** Demonstrate that Quân can own a modern Next.js frontend, explain architectural decisions in clear English, translate business requirements into reliable UI, and review AI-generated code rather than merely produce syntax.

**Tiếng Việt:** Chứng minh Quân có thể làm chủ một frontend Next.js hiện đại, giải thích quyết định kiến trúc bằng tiếng Anh rõ ràng, chuyển business requirement thành UI đáng tin cậy, và kiểm soát code do AI sinh thay vì chỉ biết viết cú pháp.

The target is not native-level fluency. The target is structured technical communication:

- Give a direct answer first.
- Explain the reason and trade-off.
- Connect the answer to real QRTable code.
- State limitations honestly and propose a reasonable improvement.

Mục tiêu không phải nói như người bản xứ. Mục tiêu là giao tiếp kỹ thuật có cấu trúc:

- Trả lời trực tiếp trước.
- Giải thích lý do và trade-off.
- Liên hệ với code thật trong QRTable.
- Nói trung thực về giới hạn và đề xuất cải tiến hợp lý.

## 2. Inputs and Assumptions / Đầu Vào và Giả Định

The plan uses:

- The VILIHA job description supplied by the candidate.
- Insider context: the interviewer is the CEO with a strong backend background; the team uses AI-assisted development; frontend ownership is urgent.
- The current QRTable repository, especially the Management App and Customer PWA.
- Current official documentation for Next.js 16, TanStack Query v5, TanStack Table v8, Tailwind CSS v4, and shadcn/ui.

Plan sử dụng:

- JD VILIHA do ứng viên cung cấp.
- Thông tin nội bộ: CEO có background backend mạnh; team dùng AI-assisted development; frontend đang cần người ownership gấp.
- Codebase QRTable hiện tại, tập trung vào Management App và Customer PWA.
- Tài liệu chính thức hiện hành của Next.js 16, TanStack Query v5, TanStack Table v8, Tailwind CSS v4 và shadcn/ui.

If the exact interview format remains unknown, use the conservative assumption: a 45–60 minute onsite English interview with behavioral questions, deep technical follow-ups, architecture/debugging scenarios, and possible live reasoning or coding.

Nếu chưa biết format chính xác, dùng giả định khó hơn: phỏng vấn onsite 45–60 phút bằng tiếng Anh, gồm behavioral questions, technical follow-up sâu, tình huống architecture/debugging và có thể có live reasoning hoặc coding.

## 3. Deep JD Analysis / Phân Tích Sâu JD

### 3.1 Hiring signals / Tín hiệu tuyển dụng

| JD signal                                                     | Interview interpretation                                                                                                                              | Diễn giải tiếng Việt                                                                                                                      | Priority |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| “0+ years” together with “mastery”, “advanced”, and “expert”  | Years are flexible, but evidence and reasoning standards are high. This is not a typical junior interview.                                            | Số năm kinh nghiệm có thể linh hoạt, nhưng tiêu chuẩn chứng minh năng lực và reasoning cao. Đây không phải phỏng vấn junior thông thường. | P0       |
| Immediate joiner, initial six-month contract                  | The company has delivery pressure and will test availability, commitment, adaptability, and early productivity.                                       | Công ty có áp lực delivery; sẽ kiểm tra khả năng đi làm ngay, cam kết, thích nghi và tạo giá trị sớm.                                     | P0       |
| English communication is a must                               | English is a working tool for requirement clarification, status reporting, code review, and disagreement—not only self-introduction.                  | Tiếng Anh dùng để làm việc: hỏi requirement, báo cáo, review code và trao đổi bất đồng; không chỉ để giới thiệu bản thân.                 | P0       |
| Next.js App Router and Server Components                      | Expect architecture questions about boundaries, rendering, caching, hydration, streaming, and data ownership.                                         | Có khả năng hỏi sâu về boundary, rendering, caching, hydration, streaming và data ownership.                                              | P0       |
| TanStack Query and TanStack Table                             | Expect implementation and trade-off questions, not definitions alone.                                                                                 | Không chỉ hỏi định nghĩa mà sẽ hỏi query keys, invalidation, optimistic update, controlled state, pagination và performance.              | P0       |
| Tailwind CSS and shadcn/ui                                    | The candidate must understand tokens, composition, responsive behavior, accessibility, and how open-code components are maintained.                   | Phải hiểu design token, composition, responsive, accessibility và cách bảo trì open-code components.                                      | P0       |
| Pixel-perfect Figma execution                                 | Visual accuracy, semantic HTML, responsive behavior, UI states, and collaboration with designers are likely evaluation points.                        | Có thể đánh giá độ chính xác giao diện, semantic HTML, responsive, UI states và cách làm việc với designer.                               | P0       |
| Clean Design and DRY                                          | The interviewer may ask the candidate to review AI-generated code or refactor a component under time pressure.                                        | Có thể yêu cầu review code AI sinh hoặc refactor component trong thời gian ngắn.                                                          | P0       |
| Designing, testing, and debugging                             | Testing and debugging are core responsibilities even though the detailed technical list does not emphasize them.                                      | Testing và debugging là trách nhiệm chính dù phần core requirements không nhắc lại nhiều.                                                 | P1       |
| “Web and mobile applications” using JavaScript, HTML, and CSS | Most likely responsive/mobile web rather than native mobile, but this should be confirmed.                                                            | Nhiều khả năng là responsive/mobile web thay vì React Native, nhưng cần xác minh.                                                         | P1       |
| Object-oriented JavaScript applications                       | Could be generic JD wording, but prepare JavaScript object model, classes/prototypes, SOLID, and why React commonly favors composition and functions. | Có thể là wording chung; vẫn cần ôn object model, class/prototype, SOLID và lý do React ưu tiên composition/function.                     | P1       |
| Scrum/Agile familiarity                                       | Expect questions about unclear requirements, estimation, pull requests, feedback, and team communication.                                             | Có thể hỏi cách xử lý requirement chưa rõ, estimate, pull request, feedback và giao tiếp nhóm.                                            | P1       |

### 3.2 Inferred interview scorecard / Scorecard phỏng vấn suy luận

This weighting is an inference from the JD and insider context, not an official VILIHA rubric.

Đây là suy luận từ JD và thông tin nội bộ, không phải rubric chính thức của VILIHA.

| Competency                                    | Suggested weight | What must be demonstrated / Điều cần chứng minh                                                            |
| --------------------------------------------- | ---------------: | ---------------------------------------------------------------------------------------------------------- |
| Next.js and React architecture                |              25% | Correct mental model, React–Next.js comparison, Server/Client boundary, rendering and hydration trade-offs |
| Data and state management                     |              20% | TanStack Query/Table, state ownership, mutation and consistency strategy                                   |
| QRTable evidence and ownership                |              20% | Concrete implementation details, decisions, failures, and improvements                                     |
| UI execution                                  |              15% | Tailwind, shadcn, Figma workflow, responsive and semantic UI                                               |
| English and collaboration                     |              10% | Short structured answers, clarification, disagreement, status communication                                |
| Code integrity, testing, debugging, AI review |              10% | Maintainability, verification, debugging process, control of generated code                                |

### 3.3 Contract and work-model questions to clarify / Điểm cần xác minh

Do not lead the interview with these questions. Ask them after demonstrating fit, or confirm with the referrer/recruiter beforehand.

Không nên mở đầu buổi phỏng vấn bằng các câu này. Hỏi sau khi đã chứng minh năng lực, hoặc xác minh trước với người giới thiệu/recruiter.

1. How many onsite days are required? The JD says both “Hybrid” and “the candidate must work from the office.”  
   Chính xác cần onsite bao nhiêu ngày? JD vừa ghi Hybrid vừa ghi bắt buộc làm tại văn phòng.
2. What performance criteria determine extension after the initial six months?  
   Tiêu chí nào quyết định gia hạn sau sáu tháng đầu?
3. Is the role dedicated to one client product or shared across projects?  
   Vai trò làm cố định một sản phẩm hay luân chuyển nhiều dự án?
4. Does “mobile applications” mean responsive web/PWA or native mobile development?  
   “Mobile applications” nghĩa là responsive web/PWA hay native mobile?
5. What are the first 30-day deliverables and current frontend pain points?  
   Deliverable trong 30 ngày đầu và pain point frontend hiện tại là gì?

## 4. Candidate-to-JD Evidence Matrix / Ma Trận Bằng Chứng Ứng Viên–JD

Evidence levels:

- **Strong:** multiple production-style implementations and tests exist.
- **Moderate:** implemented, but the depth or breadth is narrower than the JD wording.
- **Gap:** limited direct evidence; prepare the concept and an honest improvement plan.
- **Risk:** do not claim more than the repository or experience can support.

Mức bằng chứng:

- **Strong:** có nhiều implementation theo hướng production và có test.
- **Moderate:** đã làm nhưng độ sâu hoặc độ rộng chưa bằng wording của JD.
- **Gap:** ít bằng chứng trực tiếp; cần ôn concept và cách cải tiến trung thực.
- **Risk:** không được claim quá những gì repository hoặc kinh nghiệm chứng minh.

| JD competency                | Evidence in QRTable                                                                                                                                                                                                                                                                                                                                                                                      | Level    | Preparation action / Hành động ôn luyện                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js App Router           | Route groups for auth, dashboard, POS, KDS, and admin; Server Component route wrappers; async landing fetch; NextAuth route handlers and proxy. See [`app/`](../../apps/management-app/src/app), [`app/page.tsx`](../../apps/management-app/src/app/page.tsx), and [`proxy.ts`](../../apps/management-app/src/proxy.ts).                                                                                 | Moderate | Explain actual boundaries, then study missing depth: route-level loading/error/not-found, server prefetch/hydration, Cache Components, and streaming.                                             |
| Server/Client Components     | Server route wrappers render client feature leaves; provider boundary contains Query, session, theme, and auth hydration. See [`providers.tsx`](../../apps/management-app/src/app/providers.tsx) and [`(pos)/pos/page.tsx`](<../../apps/management-app/src/app/(pos)/pos/page.tsx>).                                                                                                                     | Moderate | Be precise: operational screens are client-heavy because of realtime state and mutations. Do not claim a fully server-first operational architecture.                                             |
| TanStack Query               | Hierarchical keys, auth-gated queries, mutation invalidation, cache patches, polling fallback, optimistic update and rollback. See [`use-order-query.ts`](../../apps/management-app/src/features/order/hooks/use-order-query.ts) and [`use-cart-query.ts`](../../apps/customer-pwa/src/features/order/hooks/use-cart-query.ts).                                                                          | Strong   | Prepare deep answers on `staleTime`, `gcTime`, query keys, enabled queries, cancellation, invalidation scope, race conditions, and mutation lifecycle.                                            |
| TanStack Table               | Controlled sorting/filtering/visibility, reusable table controls, and virtualization for live order rows. See [`menu-items-table.tsx`](../../apps/management-app/src/features/menu/components/menu-items-table.tsx) and [`live-orders-table.tsx`](../../apps/management-app/src/features/pos/components/live-orders-table.tsx).                                                                          | Strong   | Explain headless architecture, controlled state, client vs server operations, pagination vs virtualization, stable columns, and accessibility.                                                    |
| State ownership              | TanStack Query for server state, scoped Zustand stores for auth/UI state, React Context for customer session. See [`auth-store.ts`](../../apps/management-app/src/lib/auth/auth-store.ts), [`use-order-ui-state.ts`](../../apps/management-app/src/features/order/hooks/use-order-ui-state.ts), and [`session-provider.tsx`](../../apps/customer-pwa/src/features/session/context/session-provider.tsx). | Strong   | Defend why each state belongs in Query, Zustand, Context, local state, URL, or server session.                                                                                                    |
| Realtime consistency         | Tenant/session-scoped event filtering, targeted invalidation, cleanup, reconnect states, polling/online/focus recovery. See [`use-staff-order-realtime.ts`](../../apps/management-app/src/features/order/hooks/use-staff-order-realtime.ts) and [`use-customer-order-realtime.ts`](../../apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts).                                     | Strong   | Prepare duplicate/out-of-order event, reconnect, stale cache, listener cleanup, and fallback scenarios.                                                                                           |
| Tailwind CSS and shadcn/ui   | Tailwind v4 `@theme`, OKLCH tokens, two shadcn configs (`rsc: true/false`), semantic components, responsive utilities, and shared frontend UI. See [`globals.css`](../../apps/management-app/src/app/globals.css), [`index.css`](../../apps/customer-pwa/src/index.css), and [`libs/frontend/ui`](../../libs/frontend/ui).                                                                               | Strong   | Explain token strategy, composition, CVA, `cn`, open-code ownership, responsive/mobile-first design, and accessibility.                                                                           |
| Pixel-perfect Figma delivery | Responsive components and design tokens exist; professional Figma-to-React evidence is strongest in the GEEK Up internship rather than a Figma file stored in this repository.                                                                                                                                                                                                                           | Moderate | Prepare one complete Figma workflow story: inspect, token map, layout, states, breakpoints, semantic markup, visual comparison, and designer feedback.                                            |
| Reusable code and DRY        | Feature-level services/hooks/components, centralized query keys, shared UI/types/constants/utils, and typed API clients.                                                                                                                                                                                                                                                                                 | Strong   | Explain when to extract and when not to; show one real reuse example and one duplication that should be improved.                                                                                 |
| Testing and debugging        | At audit time, 37 Management App and 15 Customer PWA spec files exist, plus repository E2E flows. Realtime, queries, optimistic cart, auth hydration, services, and UI policies are tested.                                                                                                                                                                                                              | Strong   | Prepare testing pyramid, query-hook test, component integration test, Socket cleanup test, and a systematic debugging story.                                                                      |
| Performance                  | Parallel landing fetch, client caching, virtualization above 50 live rows, lazy image behavior, and selective memoization exist.                                                                                                                                                                                                                                                                         | Moderate | No strong repository evidence of measured Core Web Vitals or bundle analysis. Answer with “measure first,” then waterfall, bundle, server/client boundary, render, and virtualization priorities. |
| Responsive/mobile web        | Customer surface is mobile-first; Management App contains responsive grids, shells, tables, and overflow handling.                                                                                                                                                                                                                                                                                       | Strong   | Prepare 375/768/1280 validation, touch target, overflow, safe-area, keyboard, and reduced-motion checks.                                                                                          |
| Installable/offline PWA      | The Customer PWA name and mobile surface exist, but no manifest, service worker, Workbox, or install prompt was found in the audit.                                                                                                                                                                                                                                                                      | Risk     | Call it the “customer-facing React/Vite ordering app” unless PWA semantics are challenged. State that offline/installability was not implemented.                                                 |
| JavaScript OOP               | TypeScript interfaces and ErrorBoundary classes exist, but the React codebase primarily uses functional composition.                                                                                                                                                                                                                                                                                     | Gap      | Review objects, prototypes, classes, `this`, encapsulation, SOLID, and explain composition-over-inheritance in React.                                                                             |
| English communication        | Technical English appears in code and docs; spoken fluency is the candidate’s stated risk.                                                                                                                                                                                                                                                                                                               | Gap      | Every preparation task must end with an English spoken answer, not only written notes.                                                                                                            |

## 5. Codebase Reality Check / Kiểm Tra Thực Tế Codebase

### Observed patterns / Patterns quan sát được

```text
Management App
├── Routing: Next.js App Router with domain route groups
├── Data access: feature service → typed API client → BFF
├── Server state: TanStack Query with feature query-key factories
├── Client/UI state: scoped Zustand stores and local state
├── Realtime: Socket.io hooks → scoped cache invalidation
├── Tables: TanStack Table; TanStack Virtual for dense POS rows
└── Testing: colocated Jest/Testing Library specifications

Customer App
├── Runtime: React/Vite + React Router
├── Session state: Context + localStorage hydration
├── Server state: TanStack Query scoped by tenant/session
├── Consistency: cartVersion + optimistic rollback + invalidation
├── Realtime: Socket.io + browser recovery events
└── UI: mobile-first Tailwind/shadcn composition
```

### Quick quality scan / Quét chất lượng nhanh

**Solid / Điểm vững**

- Feature separation is visible through services, hooks, components, query keys, and shared libraries.
- Tenant/session context is included in customer query keys and event filters.
- Realtime hooks remove listeners and disconnect during cleanup.
- Operational mutations invalidate targeted caches; the customer cart also handles version conflicts and rollback.
- The POS live orders table demonstrates controlled data, derived state, responsive overflow, and conditional virtualization.

**Debt flags / Điểm yếu không chặn**

- No route-level `loading.tsx`, `error.tsx`, or `not-found.tsx` was found in the Management App.
- Operational App Router pages are mostly thin Server Component wrappers around large Client Components.
- Server-side TanStack Query prefetch/dehydrate/hydration was not found.
- Cache Components are not enabled; the project uses the previous Next.js caching model with explicit revalidation only for public landing data.
- Some large UI components create useful refactoring and SRP discussion material.
- Theme tokens are partly duplicated between the two apps.
- Measured Web Vitals and bundle-analysis evidence is limited.

These are not reasons to apologize. They are high-value interview material: explain why the current choice worked, what limitation remains, and what would be improved next.

Đây không phải lý do để xin lỗi. Đây là material tốt cho phỏng vấn: giải thích vì sao lựa chọn hiện tại phù hợp, giới hạn còn lại và bước cải tiến tiếp theo.

## 6. Positioning Narrative / Thông Điệp Định Vị

### Core message / Thông điệp chính

> I am a frontend-focused TypeScript developer with a strong full-stack and system-thinking background. I have built Next.js and React products that handle role-based workflows, server state, realtime events, and complex operational UI. My near-term goal is to deepen my frontend ownership, while my backend knowledge helps me design reliable API and data boundaries.

> Tôi là TypeScript developer tập trung vào frontend, có nền tảng full-stack và system thinking mạnh. Tôi đã xây dựng sản phẩm Next.js và React có role-based workflow, server state, realtime events và operational UI phức tạp. Mục tiêu gần là đào sâu frontend ownership; kiến thức backend giúp tôi thiết kế API và data boundary đáng tin cậy.

### Do not say / Không nên nói

- “I actually prefer backend, but I am applying for frontend.”
- “AI writes most of my code.”
- “I mastered Server Components” without explaining the client-heavy operational design in QRTable.
- “The Customer PWA works offline” unless that capability is implemented and verified.
- “I optimized performance” without naming a measurement or concrete mechanism.

### Better framing / Cách nói tốt hơn

- “My long-term direction is full-stack, but my immediate goal is to own and deepen production frontend work.”
- “I use AI to accelerate exploration and implementation, but I own architecture, review, testing, and verification.”
- “QRTable uses Server Component route shells and client-heavy operational features. I can explain why, and I also see opportunities for deeper server-first rendering.”
- “The customer app is mobile-first. Offline installability was outside the implemented scope.”

## 7. Preparation Deliverables / Bộ Tài Liệu Đã Hoàn Thành

| Deliverable                                                                            | Material / Tài liệu                                                                              | Status                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Personal, career, self-introduction, and CEO questions                                 | [Personal and career answer bank](01-personal-career-answer-bank.md)                             | Complete                                                     |
| English rescue phrases and communication patterns                                      | [English survival kit](02-english-survival-kit.md)                                               | Complete                                                     |
| JavaScript and React fundamentals                                                      | [JavaScript and React fundamentals](03-javascript-react-fundamentals.md)                         | Complete                                                     |
| Next.js App Router, React comparison, Server/Client Components, caching, and hydration | [Next.js App Router deep dive](04-nextjs-app-router-deep-dive.md)                                | Complete                                                     |
| TanStack Query, TanStack Table, Zustand, and state ownership                           | [State, Query, and Table answer bank](05-state-query-table-answer-bank.md)                       | Complete                                                     |
| Tailwind, shadcn/ui, Figma, responsive, and accessibility                              | [Tailwind, shadcn, and Figma UI](06-tailwind-shadcn-figma-ui.md)                                 | Complete                                                     |
| Project-specific code defense                                                          | [QRTable frontend defense](07-qrtable-frontend-defense.md)                                       | Complete                                                     |
| Code integrity, testing, debugging, AI, and STAR-L answers                             | [Quality, testing, debugging, AI, and behavioral](08-quality-testing-debugging-ai-behavioral.md) | Complete; five personal stories still require exact memories |
| Diagnostic/final mock and last-minute review                                           | [Mock interviews and last-minute sheet](09-mock-interviews-and-last-minute-sheet.md)             | Complete; rehearsal pending                                  |

## 8. Curriculum Tracks / Các Track Ôn Luyện

### Track A — Personal, career, and English / Cá nhân, nghề nghiệp và tiếng Anh

Prepare these in English and Vietnamese, but rehearse only the English delivery:

Chuẩn bị nội dung bằng cả tiếng Anh và tiếng Việt, nhưng khi luyện phải nói tiếng Anh:

1. Tell me about yourself. / Hãy giới thiệu về bạn.
2. Walk me through your background. / Hãy tóm tắt background của bạn.
3. Why frontend now? / Vì sao chọn frontend ở thời điểm này?
4. Do you prefer frontend or backend? / Bạn thích frontend hay backend hơn?
5. Why VILIHA and why this contract? / Vì sao VILIHA và vì sao hợp đồng này?
6. What are your short-term and long-term goals? / Mục tiêu ngắn và dài hạn?
7. What are your strengths and current improvement areas? / Điểm mạnh và điểm đang cải thiện?
8. Why did the freelance engagement end? / Vì sao công việc freelance kết thúc?
9. What did you learn at GEEK Up? / Bạn học được gì tại GEEK Up?
10. Tell me about a disagreement or difficult requirement. / Kể về bất đồng hoặc requirement khó.
11. How do you work under a short deadline? / Bạn làm việc dưới deadline gấp thế nào?
12. How do you communicate when your English is not perfect? / Bạn giao tiếp thế nào khi tiếng Anh chưa hoàn hảo?
13. How do you use AI in development? / Bạn dùng AI trong development thế nào?
14. When can you start and can you work onsite? / Khi nào có thể bắt đầu và có thể onsite không?
15. What are your salary expectations? / Kỳ vọng lương?

### Track B — Frontend fundamentals / Kiến thức frontend nền tảng

**P0: React and browser mental model**

- Rendering, reconciliation, keys, state snapshots, batching, derived state, controlled inputs.
- `useEffect` as synchronization with external systems, cleanup, stale closures, dependency reasoning.
- `useMemo`, `useCallback`, `memo`, React Compiler awareness, and why premature memoization is harmful.
- Event loop, promises, microtasks, closures, DOM events, browser storage, HTTP and CORS basics.
- Hydration, hydration mismatch, and client-only browser APIs.

**P0: Next.js App Router**

- Route groups, layouts, pages, route handlers, proxy, dynamic params, metadata.
- Server vs Client Components and module-graph boundaries.
- Static vs dynamic rendering, streaming, Suspense, loading/error/not-found conventions.
- Previous caching model vs Next.js 16 Cache Components; state which model QRTable currently uses.
- Server Actions vs client mutations; auth, tenant, and revalidation implications.
- Waterfalls, parallel fetch, bundle boundaries, image/font optimization, and measured performance.

**P0: State and data**

- Server state vs client/UI state vs URL state vs form state vs server session.
- TanStack Query defaults, `staleTime`, `gcTime`, retry, refetch triggers, query cancellation.
- Query-key design, invalidation scope, mutation response updates, optimistic update and rollback.
- TanStack Table headless model, controlled state, row-model pipeline, client/server operations, virtualization.
- Zustand selectors, store scope, persistence risks, and comparison with Context or Query.

**P1: UI engineering**

- Mobile-first CSS, flex/grid, overflow, intrinsic sizing, `min-w-0`, container queries.
- Semantic HTML, keyboard navigation, focus management, ARIA, contrast, reduced motion.
- shadcn open-code model, Radix primitives, CVA, `cn`, design tokens, theme ownership.
- Figma inspection and pixel-accurate implementation workflow.
- Forms, validation, async states, error recovery, empty states, and destructive action confirmation.

**P1: JavaScript object model and architecture**

- Objects, prototypes, classes, `this`, closures, modules, composition vs inheritance.
- SOLID as a design lens rather than class-heavy React code.
- DRY vs premature abstraction; separation of concerns and feature boundaries.

### Track C — QRTable frontend technical defense / Bảo vệ kỹ thuật frontend QRTable

#### Architecture and Next.js / Kiến trúc và Next.js

| English interview question                                                                           | Câu hỏi tiếng Việt                                                                           | Evidence anchor                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why did you choose Next.js for the Management App but React/Vite for the customer app?               | Vì sao Management App dùng Next.js còn customer app dùng React/Vite?                         | [`management app`](../../apps/management-app), [`customer app`](../../apps/customer-pwa)                                                                         |
| How do route groups represent business surfaces without changing URLs?                               | Route groups biểu diễn business surface mà không đổi URL thế nào?                            | [`app/`](../../apps/management-app/src/app)                                                                                                                      |
| Where are the Server/Client boundaries, and why are POS/KDS client-heavy?                            | Boundary Server/Client nằm ở đâu, vì sao POS/KDS thiên về client?                            | [`pos/page.tsx`](<../../apps/management-app/src/app/(pos)/pos/page.tsx>), [`kds-board.tsx`](../../apps/management-app/src/features/kds/components/kds-board.tsx) |
| What does the root provider boundary cost in client JavaScript? How would you push providers deeper? | Root provider boundary làm tăng client JS thế nào? Có thể đẩy provider xuống sâu hơn ra sao? | [`providers.tsx`](../../apps/management-app/src/app/providers.tsx)                                                                                               |
| How is public landing data fetched and cached?                                                       | Public landing data được fetch/cache thế nào?                                                | [`landing-api.ts`](../../apps/management-app/src/features/landing/landing-api.ts), [`app/page.tsx`](../../apps/management-app/src/app/page.tsx)                  |
| What App Router capabilities are not yet used, and where would they help?                            | Những khả năng App Router nào chưa dùng và nên áp dụng ở đâu?                                | Missing route loading/error/not-found; no server Query hydration                                                                                                 |

#### State, cache, and consistency / State, cache và consistency

| English interview question                                                    | Câu hỏi tiếng Việt                                              | Evidence anchor                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why is TanStack Query used for orders and Zustand for selected UI state?      | Vì sao orders dùng Query còn selected UI state dùng Zustand?    | [`use-order-query.ts`](../../apps/management-app/src/features/order/hooks/use-order-query.ts), [`use-order-ui-state.ts`](../../apps/management-app/src/features/order/hooks/use-order-ui-state.ts) |
| How are query keys organized, and which keys require tenant/session scope?    | Query keys tổ chức thế nào và key nào cần tenant/session scope? | [`order-keys.ts`](../../apps/management-app/src/features/order/order-keys.ts), [`order-query-keys.ts`](../../apps/customer-pwa/src/features/order/hooks/order-query-keys.ts)                       |
| Why are queries disabled until authentication or session hydration completes? | Vì sao query bị disable đến khi auth/session hydrate xong?      | [`use-auth-ready.ts`](../../apps/management-app/src/lib/auth/use-auth-ready.ts), [`session-provider.tsx`](../../apps/customer-pwa/src/features/session/context/session-provider.tsx)               |
| How do realtime events become targeted query invalidations?                   | Realtime event được chuyển thành targeted invalidation thế nào? | Staff/customer realtime hooks                                                                                                                                                                      |
| Why keep polling when WebSocket exists?                                       | Vì sao vẫn polling khi đã có WebSocket?                         | [`use-order-query.ts`](../../apps/management-app/src/features/order/hooks/use-order-query.ts)                                                                                                      |
| How does the cart optimistic update avoid overwriting newer server state?     | Optimistic cart tránh ghi đè server state mới hơn thế nào?      | [`use-cart-query.ts`](../../apps/customer-pwa/src/features/order/hooks/use-cart-query.ts), [`cart-optimistic.ts`](../../apps/customer-pwa/src/features/order/hooks/cart-optimistic.ts)             |
| What happens when two cart mutations conflict?                                | Điều gì xảy ra khi hai cart mutation conflict?                  | `expectedCartVersion`, rollback, conflict invalidation                                                                                                                                             |
| How do online, focus, visibility, and reconnect events repair stale state?    | Online/focus/visibility/reconnect giúp sửa stale state thế nào? | [`use-customer-order-realtime.ts`](../../apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts)                                                                                |

#### Tables and performance / Bảng dữ liệu và hiệu năng

| English interview question                                           | Câu hỏi tiếng Việt                                                    | Evidence anchor                                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Why is TanStack Table a headless library, and what does QRTable own? | Vì sao TanStack Table là headless và QRTable phải tự sở hữu phần nào? | [`menu-items-table.tsx`](../../apps/management-app/src/features/menu/components/menu-items-table.tsx)  |
| Which table state is controlled, and why?                            | Table state nào được control và vì sao?                               | Sorting, filtering, visibility in menu tables                                                          |
| When should sorting/filtering/pagination move to the server?         | Khi nào nên chuyển sorting/filtering/pagination lên server?           | Compare admin datasets with current client row models                                                  |
| Why virtualize live orders only above a threshold?                   | Vì sao chỉ virtualize live orders khi vượt threshold?                 | [`live-orders-table.tsx`](../../apps/management-app/src/features/pos/components/live-orders-table.tsx) |
| What are the trade-offs between pagination and virtualization?       | Trade-off giữa pagination và virtualization?                          | TanStack Table/Virtual mental model                                                                    |
| How would you measure whether memoization or virtualization helps?   | Đo hiệu quả memoization/virtualization thế nào?                       | React Profiler, browser performance, DOM size, Web Vitals                                              |

#### Auth, tenant, and realtime / Auth, tenant và realtime

| English interview question                                                                | Câu hỏi tiếng Việt                                          | Evidence anchor                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| How does NextAuth session data reach the client API layer?                                | NextAuth session data đi tới client API layer thế nào?      | [`auth.ts`](../../apps/management-app/src/auth.ts), [`auth-session-hydrator.tsx`](../../apps/management-app/src/components/auth/auth-session-hydrator.tsx)   |
| What protection is enforced by the proxy, and what must still be enforced by the backend? | Proxy bảo vệ gì và backend vẫn phải enforce gì?             | [`proxy.ts`](../../apps/management-app/src/proxy.ts)                                                                                                         |
| How are tenant and customer session headers attached?                                     | Tenant và customer session header được gắn thế nào?         | [`authenticated-client.ts`](../../apps/management-app/src/lib/api/authenticated-client.ts), [`api-client.ts`](../../apps/customer-pwa/src/lib/api-client.ts) |
| Why do event handlers re-check tenant/session IDs even after joining a room?              | Vì sao handler vẫn kiểm tra tenant/session dù đã join room? | Defense in depth in realtime hooks                                                                                                                           |
| How are Socket listeners cleaned up and duplicate subscriptions prevented?                | Cleanup Socket listener và tránh subscribe trùng thế nào?   | Realtime hook cleanup blocks and tests                                                                                                                       |
| How would you handle duplicate or out-of-order events?                                    | Xử lý event trùng hoặc sai thứ tự thế nào?                  | Invalidation + authoritative refetch; discuss event/version metadata                                                                                         |

#### UI system, testing, and maintainability / UI system, testing và maintainability

| English interview question                                                         | Câu hỏi tiếng Việt                                               | Evidence anchor                                                        |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| How do Tailwind tokens and shadcn components stay consistent across two apps?      | Token Tailwind và shadcn giữ nhất quán giữa hai app thế nào?     | Both global CSS files and [`libs/frontend/ui`](../../libs/frontend/ui) |
| Why use semantic tokens instead of hardcoded colors?                               | Vì sao dùng semantic token thay vì hardcoded color?              | Theme/dark-mode support                                                |
| How do the two shadcn configurations differ for RSC and Vite?                      | Hai cấu hình shadcn khác nhau thế nào giữa RSC và Vite?          | Both `components.json` files                                           |
| How do you translate a Figma frame into responsive semantic components?            | Chuyển Figma frame thành responsive semantic components thế nào? | GEEK Up story + project responsive code                                |
| Which frontend tests give the highest confidence for realtime ordering?            | Test frontend nào tạo confidence cao nhất cho realtime ordering? | Query, realtime, optimistic cart, auth, and component specs            |
| Identify one current component that should be decomposed and explain the boundary. | Chọn một component nên tách nhỏ và giải thích boundary.          | POS live table or complex admin pages                                  |
| How do you decide whether shared code belongs in `libs/`?                          | Quyết định code nào nên đưa vào `libs/` thế nào?                 | Shared types/constants/UI/hooks/utils usage                            |

### Track D — Pixel-perfect and UI execution / Pixel-perfect và thực thi UI

Use one 45-minute practice exercise. Start from a Figma frame or a screenshot with desktop and mobile states.

Dùng một bài tập 45 phút. Bắt đầu từ Figma frame hoặc screenshot có desktop và mobile states.

1. Inspect layout, spacing, typography, colors, assets, variants, and interaction states.  
   Inspect layout, spacing, typography, màu, asset, variant và interaction state.
2. Map repeated values to semantic tokens before writing scattered utilities.  
   Map giá trị lặp lại thành semantic token trước khi viết utility rải rác.
3. Build semantic structure and mobile-first layout.  
   Dựng semantic structure và layout mobile-first.
4. Reuse or compose shadcn primitives; do not copy an entire bespoke component unnecessarily.  
   Tái sử dụng hoặc compose shadcn primitive; không copy nguyên component custom nếu không cần.
5. Implement loading, empty, error, disabled, focus, hover, and destructive states.  
   Làm đủ loading, empty, error, disabled, focus, hover và destructive state.
6. Compare at 375px, 768px, and 1280px; check overflow and keyboard behavior.  
   So sánh ở 375px, 768px và 1280px; kiểm tra overflow và keyboard.
7. Explain any deliberate deviation from Figma.  
   Giải thích mọi deviation có chủ đích so với Figma.

### Track E — Code integrity, debugging, testing, and AI / Chất lượng code, debug, test và AI

Prepare a repeatable AI-control answer:

Chuẩn bị một câu trả lời lặp lại được về kiểm soát AI:

```text
Clarify the requirement and constraints
→ Ask AI for a small scoped change
→ Inspect architecture and state ownership
→ Review types, security, accessibility, and performance
→ Run lint/tests and exercise the real user flow
→ Refactor or reject generated code when evidence is weak
```

Practice two review scenarios:

1. AI puts fetched order data into Zustand, fetches again in `useEffect`, and forgets cleanup.  
   AI đưa order data vào Zustand, fetch lại bằng `useEffect` và quên cleanup.
2. AI creates a large client page with hardcoded colors, repeated markup, missing keyboard behavior, and broad cache invalidation.  
   AI tạo client page lớn với hardcoded color, markup lặp, thiếu keyboard behavior và invalidation quá rộng.

For each scenario, identify:

- Correctness and race conditions.
- State ownership.
- Server/Client boundary.
- Accessibility and responsive behavior.
- Performance and bundle impact.
- DRY/SRP problems.
- Tests required before acceptance.

## 9. Answer and Speaking Protocol / Công Thức Trả Lời và Luyện Nói

### ARET structure

Use **Answer → Reason → Example → Trade-off**.

Dùng **Trả lời trực tiếp → Lý do → Ví dụ → Trade-off**.

Example prompt: “Why TanStack Query instead of Zustand for API data?”

1. **Answer:** “I use TanStack Query for server state and Zustand for shared client UI state.”
2. **Reason:** “Server state needs caching, synchronization, retry, and invalidation.”
3. **Example:** “In QRTable, order and cart data use Query, while selected order and view filters use Zustand.”
4. **Trade-off:** “Copying query data into Zustand would create two sources of truth.”

### Rehearsal loop / Vòng luyện tập

For every question:

1. Read the prompt for 10 seconds. / Đọc câu hỏi 10 giây.
2. Write no more than four keywords. / Ghi tối đa bốn keyword.
3. Answer aloud for 60–90 seconds. / Trả lời thành tiếng 60–90 giây.
4. Review one technical issue and one language issue only. / Chỉ sửa một lỗi kỹ thuật và một lỗi ngôn ngữ.
5. Answer again in 45–75 seconds. / Trả lời lại trong 45–75 giây.
6. Add one follow-up challenge. / Thêm một câu hỏi đào sâu.

Do not memorize full paragraphs. Memorize the answer structure, key nouns, and project evidence.

Không học thuộc nguyên đoạn. Học khung trả lời, technical nouns và bằng chứng project.

### English rescue phrases / Câu chữa cháy tiếng Anh

1. “Let me take a moment to structure my answer.”  
   Cho tôi một chút thời gian để sắp xếp câu trả lời.
2. “If I understand correctly, you are asking about…”  
   Nếu tôi hiểu đúng, ông đang hỏi về…
3. “Could you please repeat or rephrase the last part?”  
   Ông có thể lặp lại hoặc diễn đạt lại phần cuối không?
4. “I have not implemented that exact case, but I would approach it by…”  
   Tôi chưa triển khai đúng trường hợp đó, nhưng tôi sẽ tiếp cận bằng cách…
5. “The short answer is…, and the main trade-off is…”  
   Câu trả lời ngắn là…, và trade-off chính là…
6. “In QRTable, a concrete example is…”  
   Trong QRTable, một ví dụ cụ thể là…
7. “I would verify that assumption before changing the architecture.”  
   Tôi sẽ kiểm chứng giả định đó trước khi đổi kiến trúc.
8. “May I sketch the data flow or use pseudocode?”  
   Tôi có thể vẽ data flow hoặc dùng pseudocode không?
9. “I do not know the exact API from memory, but I understand the underlying behavior.”  
   Tôi không nhớ chính xác API, nhưng hiểu behavior bên dưới.
10. “Here is what I would measure before optimizing it.”  
    Đây là những gì tôi sẽ đo trước khi tối ưu.

## 10. Forty-Eight-Hour Plan / Lịch 48 Giờ

Use 50-minute focus blocks followed by 10-minute breaks. Every knowledge block ends with spoken English retrieval.

Dùng block tập trung 50 phút và nghỉ 10 phút. Mỗi block kiến thức phải kết thúc bằng việc tự nói lại bằng tiếng Anh.

### Day 1 — Build the answer system / Ngày 1 — Xây hệ thống câu trả lời

| Block | Task / Nhiệm vụ                                                                                                     | Verification / Kiểm chứng                                                 |
| ----: | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
|     1 | Diagnostic mock: 5 personal + 10 technical questions. / Mock chẩn đoán: 5 câu cá nhân + 10 câu kỹ thuật.            | Record without notes; mark knowledge, vocabulary, or delivery failure.    |
|     2 | Build 30/90/180-second self-introductions and career narrative. / Viết ba phiên bản giới thiệu và career narrative. | Deliver each twice without reading.                                       |
|     3 | Prepare motivation, goals, strengths, weakness, availability, contract, onsite, and salary answers.                 | No answer contradicts the frontend positioning or immediate availability. |
|     4 | React mental model: rendering, state, effects, closures, memoization, hydration.                                    | Answer 10 P0 prompts in English.                                          |
|     5 | App Router: route groups, RSC/client boundaries, hydration, layouts, route handlers, proxy.                         | Explain QRTable architecture on one diagram in under 3 minutes.           |
|     6 | Rendering/caching: static/dynamic, streaming, previous model, Cache Components, revalidation.                       | Correctly state which model QRTable uses and what is not implemented.     |
|     7 | QRTable architecture defense: Next.js Management App vs React/Vite customer app.                                    | Produce 10 project answers with one evidence anchor each.                 |
|     8 | STAR stories: GEEK Up, freelance, QRTable decision, bug, disagreement, deadline, learning, AI review.               | Eight story cards with keywords and measurable/observable outcomes.       |
|     9 | Spoken recap and gap log. / Tóm tắt thành tiếng và ghi gap.                                                         | Identify the five highest-risk questions for Day 2.                       |

Stop heavy study early enough to sleep at least 6.5–7 hours.

Dừng học nặng đủ sớm để ngủ tối thiểu 6.5–7 giờ.

### Day 2 — Deep evidence and simulation / Ngày 2 — Đào sâu bằng chứng và mô phỏng

| Block | Task / Nhiệm vụ                                                                       | Verification / Kiểm chứng                                                    |
| ----: | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
|     1 | Retrieval review without notes. / Ôn truy xuất không nhìn tài liệu.                   | Re-answer Day 1’s five weakest questions.                                    |
|     2 | TanStack Query: keys, defaults, mutation, invalidation, optimistic rollback, polling. | Explain QRTable cart and order consistency flows.                            |
|     3 | TanStack Table + Virtual: controlled state, row models, client/server operations.     | Defend menu table and live order table choices.                              |
|     4 | Zustand/Context/URL/local state decision matrix.                                      | Classify 12 example states and justify ownership.                            |
|     5 | Tailwind/shadcn/Figma drill.                                                          | Complete the 45-minute UI workflow and explain it in English.                |
|     6 | Realtime/auth/tenant scenarios.                                                       | Solve reconnect, stale cache, duplicate event, and tenant mismatch cases.    |
|     7 | Clean code, testing, debugging, and AI review.                                        | Review two bad snippets and name required tests.                             |
|     8 | Full technical mock, including interruption and follow-ups.                           | Score at least 3/4 in correctness, structure, evidence, and English clarity. |
|     9 | Targeted repair only. / Chỉ sửa đúng gap.                                             | Re-answer failed questions; do not open new broad topics.                    |
|    10 | Final behavioral + CEO conversation mock.                                             | Finish with 2–3 strong questions for the CEO.                                |
|    11 | Final rehearsal and logistics.                                                        | CV, route, device, clothing, water, arrival time, and sleep are ready.       |

## 11. Emergency Twenty-Four-Hour Plan / Lịch Khẩn Cấp 24 Giờ

If only one day remains, do not attempt full framework coverage. Use this order:

Nếu chỉ còn một ngày, không cố học toàn framework. Dùng thứ tự sau:

|    Time | Focus / Trọng tâm               | Required output / Đầu ra bắt buộc                       |
| ------: | ------------------------------- | ------------------------------------------------------- |
|  30 min | Diagnostic mock                 | Top five weaknesses                                     |
|  60 min | Personal/career English         | Self-introduction + 10 behavioral answers               |
| 120 min | Next.js P0                      | RSC/client, hydration, rendering, caching, route groups |
|  90 min | Query/Table/Zustand P0          | State ownership + QRTable examples                      |
| 120 min | QRTable technical defense       | 20 strongest project questions                          |
|  60 min | Tailwind/shadcn/Figma           | One complete workflow explanation                       |
|  45 min | Clean code/testing/debugging/AI | One review and one debugging scenario                   |
|  45 min | Behavioral mock                 | Recorded, no notes                                      |
|  60 min | Technical mock + repair         | Re-answer all failed P0 questions                       |
|  30 min | CEO questions + logistics       | Final checklist complete                                |

Protect sleep. Removing sleep to add passive reading will reduce recall, listening comprehension, and spoken English performance.

Phải bảo vệ giấc ngủ. Cắt ngủ để đọc thụ động sẽ làm giảm khả năng nhớ, nghe hiểu và phản xạ tiếng Anh.

## 12. Mock Interview Design / Thiết Kế Mock Interview

### Mock 1 — Diagnostic / Chẩn đoán

- 10 minutes behavioral.
- 20 minutes fundamentals.
- 15 minutes QRTable deep dive.
- 10 minutes scenario/debugging.
- 5 minutes candidate questions.

The interviewer must interrupt, ask “why,” challenge assumptions, and request a shorter answer at least once.

Người mock phải ngắt lời, hỏi “why”, challenge assumption và yêu cầu rút ngắn câu trả lời ít nhất một lần.

### Mock 2 — Final / Tổng duyệt

Score every answer from 0–4:

| Dimension                         | 0                  | 2                          | 4                                       |
| --------------------------------- | ------------------ | -------------------------- | --------------------------------------- |
| Correctness / Độ đúng             | Incorrect          | Partly correct             | Correct with boundaries                 |
| Structure / Cấu trúc              | Rambling           | Understandable             | Direct ARET answer                      |
| Evidence / Bằng chứng             | Generic            | Mentions QRTable           | Concrete implementation + trade-off     |
| English clarity / Độ rõ tiếng Anh | Not understandable | Understandable with effort | Short, clear, controlled                |
| Ownership / Ownership             | Passive/team-only  | Describes contribution     | Owns decision, verification, and lesson |

Ready threshold: no P0 answer below 2; average at least 3; self-introduction and project overview at least 3.5.

Ngưỡng sẵn sàng: không câu P0 nào dưới 2; trung bình ít nhất 3; phần giới thiệu và project overview ít nhất 3.5.

## 13. Questions to Ask the CEO / Câu Hỏi Dành Cho CEO

Select two or three, not all five.

Chọn hai hoặc ba câu, không hỏi cả năm.

1. “What are the most urgent frontend problems you expect this person to solve in the first month?”  
   Vấn đề frontend cấp bách nhất cần người mới giải quyết trong tháng đầu là gì?
2. “How do you currently review and validate code produced with Claude Code or other AI tools?”  
   Team hiện review và validate code từ Claude Code hoặc AI tool như thế nào?
3. “How are frontend architecture decisions shared between the CEO, backend engineers, designers, and the frontend owner?”  
   Quyết định frontend architecture được phối hợp giữa CEO, backend, designer và frontend owner ra sao?
4. “What does strong performance look like at the end of the initial six-month contract?”  
   Performance tốt ở cuối sáu tháng đầu được đánh giá thế nào?
5. “What is the current balance between new feature delivery, visual fidelity, testing, and technical debt?”  
   Hiện team cân bằng feature delivery, visual fidelity, testing và technical debt thế nào?

## 14. Truth and Claim Guardrails / Ranh Giới Trung Thực

Before using any answer, classify it:

Trước khi dùng câu trả lời, phân loại nó:

| Label        | Meaning                                           | Allowed wording / Cách nói                               |
| ------------ | ------------------------------------------------- | -------------------------------------------------------- |
| Implemented  | Directly present and understood in the codebase   | “I implemented…” / “In QRTable, we use…”                 |
| Collaborated | Shared work; exact personal contribution is known | “I collaborated on…” then state the exact part owned     |
| Studied      | Understood but not implemented in this project    | “I have studied…” / “I would apply it by…”               |
| Proposed     | Reasonable next improvement                       | “A next improvement would be…”                           |
| Unknown      | Not known or not remembered                       | “I do not know the exact API, but my approach would be…” |

Never convert “studied” or “proposed” into “implemented.” The CEO’s technical depth makes exaggerated claims more dangerous than admitting a bounded gap.

Không biến “đã học” hoặc “đề xuất” thành “đã triển khai”. Với CEO có technical depth mạnh, claim phóng đại nguy hiểm hơn việc thừa nhận một gap có giới hạn.

## 15. Official and Local Study Sources / Nguồn Ôn Chính Thức và Nội Bộ

### Official sources / Nguồn chính thức

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Next.js Cache Components](https://nextjs.org/docs/app/getting-started/caching)
- [TanStack Query important defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- [TanStack Query optimistic updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [TanStack Table v8](https://tanstack.com/table/v8)
- [TanStack Table pagination](https://tanstack.com/table/v8/docs/guide/pagination)
- [Tailwind CSS responsive design](https://tailwindcss.com/docs/responsive-design)
- [shadcn/ui introduction](https://ui.shadcn.com/docs)

### QRTable sources / Nguồn QRTable

- [React and Next.js practical guide](../guides/react-nextjs-qrtable.md)
- [Frontend domain display guide](../guides/frontend-domain-display.md)
- [Technical architecture](../technical-architecture.md)
- [Management App README](../../apps/management-app/README.md)
- [Customer App README](../../apps/customer-pwa/README.md)
- [Management realtime notes](../../apps/management-app/REALTIME.md)

Use official sources for framework behavior. Use current code and tests for claims about QRTable.

Dùng nguồn chính thức cho behavior của framework. Dùng code và test hiện tại cho claim về QRTable.

## 16. Definition of Ready / Định Nghĩa “Sẵn Sàng Phỏng Vấn”

- [ ] Deliver 30-, 90-, and 180-second introductions without reading.
- [ ] Explain why this frontend role fits the long-term full-stack direction without sounding temporary.
- [ ] Answer all P0 Next.js, Query, Table, state, Tailwind, and shadcn questions at score 2 or higher.
- [ ] Explain QRTable frontend architecture in 3 minutes and 8 minutes.
- [ ] Defend at least 20 project-specific frontend questions with real evidence.
- [ ] State the current Next.js and PWA limitations honestly.
- [ ] Complete one Figma-to-code workflow explanation.
- [ ] Review one AI-generated component and propose verification.
- [ ] Complete one behavioral and one technical mock.
- [ ] Use rescue phrases without apologizing for English.
- [ ] Prepare two or three questions for the CEO.
- [ ] Confirm interview logistics, onsite location, arrival time, and availability.
- [ ] Sleep at least 6.5–7 hours before the interview.

Vietnamese checklist:

- [ ] Nói được ba phiên bản giới thiệu 30, 90 và 180 giây mà không đọc.
- [ ] Giải thích vai trò frontend phù hợp với định hướng full-stack mà không tạo cảm giác chỉ làm tạm thời.
- [ ] Mọi câu P0 về Next.js, Query, Table, state, Tailwind và shadcn đạt ít nhất 2 điểm.
- [ ] Trình bày frontend architecture của QRTable trong phiên bản 3 phút và 8 phút.
- [ ] Bảo vệ ít nhất 20 câu hỏi frontend bám code thật.
- [ ] Nói trung thực về giới hạn Next.js và PWA hiện tại.
- [ ] Hoàn thành một bài giải thích workflow Figma-to-code.
- [ ] Review một component do AI sinh và đưa ra cách verify.
- [ ] Hoàn thành một mock behavioral và một mock technical.
- [ ] Dùng câu chữa cháy mà không xin lỗi vì tiếng Anh.
- [ ] Chuẩn bị hai hoặc ba câu hỏi dành cho CEO.
- [ ] Xác nhận logistics, địa điểm onsite, giờ đến và availability.
- [ ] Ngủ ít nhất 6.5–7 giờ trước phỏng vấn.

## 17. Rehearsal Order / Thứ Tự Luyện Tập Tiếp Theo

1. Read the [study hub](README.md) and record the first diagnostic mock without preparation. / Mở mục lục và ghi âm mock chẩn đoán đầu tiên mà không chuẩn bị trước.
2. Repair personal introduction, motivation, English rescue, and any P0 score of 0. / Sửa phần giới thiệu, động lực, English rescue và mọi câu P0 bị 0 điểm.
3. Rehearse Next.js, Query/state, and QRTable defense with keyword-only notes. / Luyện Next.js, Query/state và QRTable chỉ bằng keyword.
4. Personalize the five STAR-L stories with exact memories and no invented metrics. / Cá nhân hóa năm câu chuyện STAR-L bằng dữ kiện thật, không bịa số liệu.
5. Run the UI/Figma and AI-review practical drills. / Làm bài thực hành UI/Figma và AI review.
6. Run the final mock, repair only failed areas, review the last-minute sheet, and stop adding new topics. / Mock tổng duyệt, chỉ sửa phần fail, xem tờ ôn cuối và dừng mở chủ đề mới.
