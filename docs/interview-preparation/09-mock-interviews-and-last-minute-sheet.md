# Mock Interviews and Last-Minute Sheet / Mock Interview và Tờ Ôn Cuối

## How to Use This File / Cách Sử Dụng

Run each mock aloud without reading the model answer. Record the session. Allow at most five seconds of silent thinking before using an English recovery phrase.

Thực hiện toàn bộ bằng tiếng Anh. Không dừng recording khi trả lời sai. Sau mỗi câu, tự chấm:

| Score | Meaning                                                           |
| ----: | ----------------------------------------------------------------- |
|     0 | No answer, incorrect, or invented claim                           |
|     1 | Partly correct but unstructured or no evidence                    |
|     2 | Correct direct answer with reason or example                      |
|     3 | Correct, concise, evidence-based, and handles trade-off/follow-up |

Pass condition: no P0 question at 0 and an average of at least 2.

---

## Mock 1 — CEO Fit and Fundamentals (50–60 Minutes)

### 1. Tell me about yourself.

**Model answer**

> I am a final-year Information Systems student at UIT and recently completed my thesis defense. I gained frontend experience through GEEK Up, freelance ERP work, and QRTable, a Next.js and React SaaS POS platform. My strength is connecting frontend architecture and user flows with API, realtime, and system constraints. I am applying for a frontend ownership role and can start immediately.

**Follow-up:** “Why frontend if your thesis is backend-heavy?”

> The product includes two substantial frontends, and the backend depth helps me design better API, state, consistency, and failure behavior. My current goal is to deepen production frontend ownership.

**Follow-up tiếng Việt:** “Vì sao chọn frontend khi khóa luận của bạn nặng backend?”

> Sản phẩm có hai frontend lớn, và độ sâu backend giúp tôi thiết kế API, state, consistency và failure behavior tốt hơn. Mục tiêu hiện tại của tôi là đào sâu production frontend ownership.

**Câu hỏi tiếng Việt:** Hãy giới thiệu về bản thân

**Trả lời tiếng Việt**

> Tôi là sinh viên năm cuối ngành Hệ thống Thông tin tại UIT và vừa hoàn thành bảo vệ khóa luận. Tôi có kinh nghiệm frontend từ GEEK Up, ERP freelance và QRTable—một SaaS POS dùng Next.js/React. Điểm mạnh là kết nối frontend architecture/user flow với API, realtime và system constraints. Tôi đang tìm vai trò frontend ownership và có thể bắt đầu ngay.

### 2. Why VILIHA and why this contract?

**Model answer**

> The stack directly matches my recent work, and the role values architecture, state management, UI quality, and AI review rather than syntax alone. I also want an English-speaking production environment with real ownership. I am comfortable with the initial six-month contract and would like to understand the outcomes that lead to extension.

**Câu hỏi tiếng Việt:** Vì sao VILIHA và vì sao hợp đồng này?

**Trả lời tiếng Việt**

> Stack trùng trực tiếp kinh nghiệm gần đây; vai trò coi trọng architecture, state, UI quality và AI review hơn cú pháp. Tôi muốn môi trường production dùng tiếng Anh và có ownership thật. Tôi chấp nhận hợp đồng sáu tháng và muốn hiểu outcomes quyết định gia hạn.

### 3. Explain Server and Client Components.

**Model answer**

> Server Components execute on the server and are suitable for server data access, static structure, and reducing client JavaScript. Client Components are required for state, effects, events, browser APIs, and client-only libraries. I start server-first and place the client boundary around the smallest interactive feature. The boundary is an architectural and bundle decision, not a rule that Client Components are bad.

**Câu hỏi tiếng Việt:** Hãy giải thích Server và Client Components

**Trả lời tiếng Việt**

> Server Components chạy server, phù hợp server data, static structure và giảm client JavaScript. Client Components cần state, effect, event, browser API và client library. Tôi bắt đầu server-first rồi đặt client boundary quanh vùng interactive nhỏ nhất; Client Component không phải điều xấu.

### 4. What does `'use client'` actually do?

**Model answer**

> It marks a client entry boundary, and its client dependency graph becomes eligible for the browser bundle. It does not mean the component cannot contribute server-generated HTML, and every descendant does not need another directive. I place it deliberately because a high boundary can pull unnecessary code client-side.

**Câu hỏi tiếng Việt:** `'use client'` thực sự làm gì?

**Trả lời tiếng Việt**

> Nó đánh dấu client entry boundary và client dependency graph liên quan. Không có nghĩa component chỉ CSR hay mọi child phải có directive. Boundary cao có thể kéo code không cần thiết vào client nên phải đặt có chủ ý.

### 5. Explain hydration and a hydration mismatch.

**Model answer**

> Hydration attaches React behavior to server-generated HTML. A mismatch means the client’s first output differs from the server HTML. I look for time, randomness, locale, browser-only APIs, invalid markup, or changing initial data, then make the first render deterministic rather than hiding the warning.

**Câu hỏi tiếng Việt:** Hãy giải thích hydration và hydration mismatch

**Trả lời tiếng Việt**

> Hydration gắn React behavior vào server HTML. Mismatch nghĩa first client output khác server output. Tôi tìm time, random, locale, browser-only API, invalid markup hoặc changing initial data rồi làm render deterministic, không chỉ suppress warning.

### 6. How would you divide state among TanStack Query, Zustand, Context, and local state?

**Model answer**

> TanStack Query owns remote resources. URL state owns shareable navigation. Local state owns one interaction boundary. Context fits a cohesive subtree dependency, and Zustand fits client-owned cross-tree state that benefits from selectors. I avoid copying remote Query data into Zustand because that creates two sources of truth.

**Câu hỏi tiếng Việt:** Bạn chia state giữa Query, Zustand, Context và local state thế nào?

**Trả lời tiếng Việt**

> TanStack Query cho remote resources; URL cho shareable navigation; local state cho một interaction boundary; Context cho coherent subtree dependency; Zustand cho cross-tree client state cần selectors. Không copy Query data vào Zustand vì tạo hai source of truth.

### 7. Design query keys for a multi-tenant order page.

**Model answer**

> I would use a key factory with resource, tenant, list or detail, and normalized inputs—for example orders, tenant ID, list, and filter object. Every input that changes the result belongs in the key. The hierarchy must support invalidating one detail, all order lists for one tenant, or the complete tenant scope.

**Câu hỏi tiếng Việt:** Hãy thiết kế query keys cho trang order multi-tenant

**Trả lời tiếng Việt**

> Dùng key factory gồm resource, tenant, list/detail và normalized inputs, ví dụ orders–tenantId–list–filters. Mọi input đổi result phải vào key; hierarchy phải invalidate được một detail, mọi list của một tenant hoặc cả tenant scope.

### 8. Explain an optimistic update and its failure behavior.

**Model answer**

> Cancel conflicting reads, snapshot the previous cache, apply an immutable predicted change, send the request, roll back on error, and reconcile from the response or invalidation. In QRTable, cart mutations also send the expected cart version; a conflict restores and refetches authoritative state.

**Câu hỏi tiếng Việt:** Hãy giải thích optimistic update và khi thất bại

**Trả lời tiếng Việt**

> Cancel conflicting reads, snapshot cache cũ, apply immutable predicted change, gửi request, rollback khi error và reconcile bằng response/invalidation. Trong QRTable, cart mutation còn gửi expected version; conflict sẽ restore và refetch server truth.

### 9. How do Socket.io and TanStack Query work together in QRTable?

**Model answer**

> Socket events are scoped change signals, while Query remains the server-state cache. The handler verifies tenant and other available scope, then invalidates the affected query family. On reconnect, focus, or online recovery, the client refetches because events may have been missed. Staff order queries also use polling fallback.

**Câu hỏi tiếng Việt:** Socket.io và TanStack Query phối hợp thế nào trong QRTable?

**Trả lời tiếng Việt**

> Socket event là scoped change signal; Query là server-state cache. Handler kiểm tra tenant/scope rồi invalidate query family liên quan. Reconnect/focus/online sẽ refetch vì có thể miss event; staff order còn polling fallback.

### 10. Why TanStack Table instead of a pre-styled data grid?

**Model answer**

> TanStack Table is a typed headless engine for row models, sorting, filtering, visibility, and pagination, so the UI can follow our shadcn and domain design. The trade-off is that we own markup, accessibility, and server integration. For bounded QRTable admin lists, client row models are sufficient; large remote datasets should use server operations.

**Câu hỏi tiếng Việt:** Vì sao dùng TanStack Table thay data grid có style sẵn?

**Trả lời tiếng Việt**

> Đây là typed headless engine cho row model, sorting, filtering, visibility, pagination nên UI theo đúng shadcn/domain design. Đổi lại team tự chịu markup, accessibility và server integration. Bounded admin list dùng client operations; remote data lớn dùng server operations.

### 11. Walk me through your Figma-to-code process.

**Model answer**

> I understand the user flow, audit tokens and component variants, identify missing responsive and error states, map to existing primitives, and build semantic mobile-first structure. Then I connect real data and compare at matching viewports. I verify keyboard, long content, loading, empty, error, and permission states instead of only matching one screenshot.

**Câu hỏi tiếng Việt:** Hãy trình bày workflow Figma-to-code

**Trả lời tiếng Việt**

> Hiểu user flow, audit tokens/variants, tìm missing responsive/error states, map sang existing primitives và dựng semantic mobile-first structure. Sau khi nối data, tôi so sánh cùng viewport, test keyboard, long content, loading, empty, error và permission.

### 12. How do you keep AI-generated frontend code trustworthy?

**Model answer**

> I provide architecture and acceptance constraints, ask for small diffs, and review requirement, types, state ownership, security scope, effects, accessibility, performance, and edge states. I compare with existing patterns, run tests and static checks, and manually exercise the feature. I accept only code I can explain.

**Câu hỏi tiếng Việt:** Bạn giữ AI-generated frontend code đáng tin thế nào?

**Trả lời tiếng Việt**

> Cung cấp architecture/acceptance constraints, yêu cầu diff nhỏ và review requirement, type, state ownership, scope security, effect, accessibility, performance, edge states. So với project patterns, chạy tests/static checks, exercise feature và chỉ nhận code tôi giải thích được.

### 13. What is a frontend weakness in QRTable?

**Model answer**

> Operational Next.js screens are client-heavy, route-level loading and error conventions are limited, and server-side Query hydration is not broadly used. The Customer App is mobile-first but does not currently show complete offline or installable PWA infrastructure. I would improve these incrementally after measuring rather than rewriting working realtime flows.

**Câu hỏi tiếng Việt:** Một điểm yếu frontend của QRTable là gì?

**Trả lời tiếng Việt**

> Operational Next.js screens client-heavy, route-level loading/error còn hạn chế, Query server hydration chưa dùng rộng. Customer App mobile-first nhưng chưa có offline/installable PWA hoàn chỉnh. Tôi cải thiện từng bước sau khi đo, không rewrite realtime flows đang hoạt động.

### 14. Tell me about a mistake.

**Model answer**

> Earlier, I sometimes implemented before writing all data and failure states, which caused rework when contracts changed. I now define the user flow, source of truth, state transitions, and acceptance checks first. The lesson is not to over-plan, but to remove high-impact uncertainty before coding.

**Câu hỏi tiếng Việt:** Hãy kể một sai lầm

**Trả lời tiếng Việt**

> Trước đây tôi đôi khi implement trước khi explicit data/failure states nên rework khi contract đổi. Giờ tôi định nghĩa flow, source of truth, transitions và acceptance checks trước. Bài học là giảm uncertainty lớn, không phải over-plan.

### 15. What would you ask me?

**Model answer**

> What outcome would make you say this hire was successful after the first six to eight weeks? Also, when the team uses AI-generated frontend code, which architectural or product mistakes are you most concerned about?

**Câu hỏi tiếng Việt:** Bạn muốn hỏi tôi điều gì?

**Trả lời tiếng Việt**

> Outcome nào khiến anh đánh giá người mới thành công sau sáu đến tám tuần? Và khi team dùng AI-generated frontend code, anh lo ngại architectural hoặc product mistakes nào nhất?

### Mock 1 Review

- [ ] Introduction under 90 seconds.
- [ ] No answer longer than two minutes without interviewer request.
- [ ] At least four QRTable examples.
- [ ] At least three explicit trade-offs.
- [ ] No exaggerated RSC, PWA, or personal-ownership claim.
- [ ] At least one clarification question used naturally.

---

## Mock 2 — Technical Pressure and Follow-Ups (55–65 Minutes)

### 1. Your POS page is a thin server wrapper around a Client Component. Are you really using Next.js well?

**Model answer**

> That is a fair challenge. The current operational use of App Router is moderate, not fully server-first. POS needs realtime subscriptions, mutations, timers, filters, and selection, so substantial client code is justified. I would improve the server shell, route boundaries, selective prefetching, and bundle measurement, but I would not move interactive state server-side merely to increase Server Component count.

**Câu hỏi tiếng Việt:** POS page chỉ là server wrapper mỏng quanh Client Component; bạn có thật sự dùng Next.js tốt không?

**Trả lời tiếng Việt**

> Đây là challenge hợp lý. App Router usage hiện tại ở mức vừa, chưa fully server-first. POS cần realtime, mutations, timers, filters, selection nên client code lớn là có lý do. Tôi sẽ cải thiện server shell, route boundaries, selective prefetch và bundle measurement, không chuyển interactive state lên server chỉ để tăng RSC count.

### 2. Why is your Query provider so high in the tree?

**Model answer**

> It gives the operational feature areas one client cache and integrates with session and theme providers. A Client Provider can still receive server-rendered children, so it does not automatically put every child module in the client bundle. The real costs are a long-lived global cache, a root-level client runtime, and broad dependency on that context. I would split or move providers deeper only if measurement shows a benefit without fragmenting shared operational state.

**Câu hỏi tiếng Việt:** Vì sao Query provider nằm cao trong tree?

**Trả lời tiếng Việt**

> Nó cho operational features dùng chung một client cache và tích hợp session/theme. Client Provider vẫn nhận server-rendered children nên không tự kéo mọi child module vào client bundle. Chi phí thật là long-lived global cache, root client runtime và dependency rộng vào context; chỉ split/move khi measurement chứng minh lợi ích.

### 3. Why do some management query keys not contain a tenant ID?

**Model answer**

> Those features currently assume one active tenant during an authenticated client-cache lifetime, and the tenant is attached at the request boundary. That assumption should be explicit. If tenant switching or multiple tenant contexts are supported without a full session reset, tenant ID must become part of all scoped keys and old tenant data must be cleared or isolated.

**Câu hỏi tiếng Việt:** Vì sao một số management query keys không có tenant ID?

**Trả lời tiếng Việt**

> Các feature đó hiện giả định một active tenant trong authenticated cache lifetime và tenant được gắn ở request boundary. Nếu hỗ trợ tenant switching/multiple contexts không reset session, mọi scoped key phải thêm tenant và old data phải clear/isolate.

### 4. An order-status event contains the correct tenant but no session. Is client filtering enough?

**Model answer**

> No. Client filtering is defense in depth, not authorization. The server must authenticate the socket and emit only to appropriate rooms. The client should validate every scope present in the contract and update only a known order key. If session-level isolation is required, the event contract or room design should include that guarantee and tests should verify it.

**Câu hỏi tiếng Việt:** Event order status có đúng tenant nhưng không có session; client filtering đủ chưa?

**Trả lời tiếng Việt**

> Chưa. Client filtering là defense in depth, không phải authorization. Server phải authenticate socket và emit đúng room; client validate mọi scope contract có. Nếu cần session isolation, event contract/room design phải bảo đảm và có tests.

### 5. Why not patch the order cache directly from every event?

**Model answer**

> Many events are not complete resource snapshots and may arrive after related changes. Direct patching could create a partial or out-of-order view. Invalidation costs another request but restores canonical state. I would patch only when the payload is complete, versioned, and the latency benefit matters.

**Câu hỏi tiếng Việt:** Vì sao không patch order cache trực tiếp từ mọi event?

**Trả lời tiếng Việt**

> Nhiều event không phải full resource snapshot và có thể đến sau related changes. Patch trực tiếp có thể tạo partial/out-of-order view. Invalidation tốn request nhưng lấy canonical state; chỉ patch khi payload complete, versioned và latency benefit đáng kể.

### 6. Optimistic cart updates use temporary IDs. What can go wrong?

**Model answer**

> A temporary line ID must be replaced by the authoritative server snapshot, and a second mutation that targets the temporary ID can conflict if the first request has not reconciled. The current success response replaces the cart snapshot, while pending actions are constrained by mutation state. I would test rapid multi-action behavior and consider per-line queues or client IDs if the product permits concurrent edits.

**Câu hỏi tiếng Việt:** Optimistic cart dùng temporary IDs; điều gì có thể sai?

**Trả lời tiếng Việt**

> Temporary ID phải được server snapshot thay thế; mutation thứ hai nhắm temporary ID có thể conflict nếu request đầu chưa reconcile. Success hiện thay toàn cart snapshot và pending actions bị giới hạn. Cần test rapid multi-action, cân nhắc per-line queue/client IDs nếu product cho concurrent edits.

### 7. Why is an idempotency key persisted in local storage?

**Model answer**

> Persistence can allow the same logical order submission to reuse its key across a retry or refresh. However, lifecycle is critical: a new logical order needs a new key, and a completed operation should not accidentally reuse an old key. The backend must scope and expire keys and compare the request meaning; client persistence alone is not the guarantee.

**Câu hỏi tiếng Việt:** Vì sao persist idempotency key trong local storage?

**Trả lời tiếng Việt**

> Để logical submit dùng lại key qua retry/refresh. Nhưng lifecycle rất quan trọng: logical order mới cần key mới và completed operation không được reuse key cũ. Backend phải scope/expire key và so request meaning; client persistence không tự bảo đảm idempotency.

### 8. Your realtime layer also polls. Is that wasteful?

**Model answer**

> It adds request cost, but provides bounded recovery when sockets degrade or events are missed. The interval should reflect operational freshness and backend capacity, and it can adapt to connection status rather than run equally all the time. I would measure socket reliability and request volume before removing the fallback.

**Câu hỏi tiếng Việt:** Realtime layer vừa dùng socket vừa poll có lãng phí không?

**Trả lời tiếng Việt**

> Có thêm request cost nhưng tạo bounded recovery khi socket degrade hoặc miss event. Interval phải theo operational freshness/backend capacity và có thể thay đổi theo connection status. Cần đo reliability/request volume trước khi bỏ fallback.

### 9. Would you use Server Actions for all mutations now?

**Model answer**

> No. The existing applications already have typed BFF services, client Query mutations, and realtime contracts. Server Actions may simplify selected form workflows, but changing every mutation would add migration risk without guaranteed benefit. I would choose them when server ownership, progressive enhancement, and revalidation fit the specific flow.

**Câu hỏi tiếng Việt:** Bạn có chuyển mọi mutation sang Server Actions không?

**Trả lời tiếng Việt**

> Không. App hiện có typed BFF services, Query mutations và realtime contracts. Server Actions có thể đơn giản một số form workflows, nhưng migrate mọi mutation tăng risk không có lợi ích chắc chắn. Chọn khi server ownership, progressive enhancement và revalidation phù hợp flow cụ thể.

### 10. How would you make the Customer App a real PWA?

**Model answer**

> First define the offline product contract. Static shell and safe public assets can be cached, but menu freshness, cart writes, order submission, and payment state need explicit policies. Then add a manifest, service worker strategy, install criteria, update behavior, offline UI, and tests. I would not queue financial or inventory-affecting writes offline without idempotency, conflict handling, and clear user status.

**Câu hỏi tiếng Việt:** Bạn biến Customer App thành PWA thực sự thế nào?

**Trả lời tiếng Việt**

> Định nghĩa offline product contract trước. Cache shell/public assets an toàn; menu freshness, cart write, order submission, payment cần policy rõ. Sau đó thêm manifest, service worker, install/update/offline UI và tests. Không queue financial/inventory writes offline nếu thiếu idempotency/conflict/status rõ.

### 11. Review this generated component: it fetches in `useEffect`, copies the result to Zustand, uses array indexes as keys, and has a clickable `div`. What do you say?

**Model answer**

> I would first confirm the requirement, then replace the duplicated server-data store with the existing Query pattern, use stable domain IDs, and use a semantic button or link with keyboard behavior. I would add loading, empty, error, and retry states, check cancellation or stale responses, and create tests around the user behavior. The problem is not style; it is source of truth, identity, and accessibility.

**Câu hỏi tiếng Việt:** Review component AI fetch trong effect, copy vào Zustand, dùng index key và clickable `div`

**Trả lời tiếng Việt**

> Xác nhận requirement, thay duplicated server store bằng Query pattern, dùng stable domain IDs và semantic button/link. Thêm loading/empty/error/retry, xử lý stale/cancellation và tests user behavior. Lỗi chính là source of truth, identity và accessibility chứ không chỉ style.

### 12. A designer asks for an exact desktop table on a 360-pixel screen. What do you do?

**Model answer**

> I clarify the mobile task: comparison, scanning, or acting on one record. Then I propose options such as horizontal scroll with priority columns, column visibility, expansion, or a card representation. I preserve semantics and show the designer a working prototype. “Pixel-perfect” should preserve intent across constraints, not force an unusable screenshot.

**Câu hỏi tiếng Việt:** Designer yêu cầu desktop table chính xác trên màn hình 360px; bạn làm gì?

**Trả lời tiếng Việt**

> Làm rõ mobile task: comparison, scanning hay action một record. Đề xuất horizontal scroll với priority columns, visibility, expansion hoặc card, giữ semantics và đưa working prototype. Pixel-perfect là giữ intent trong constraints, không ép screenshot unusable.

### 13. Your English is slow. How can you work directly with me?

**Model answer**

> My speaking is slower than my technical reading, but I communicate with structure, confirm requirements, and summarize decisions in writing. I use diagrams and concrete examples when a concept is complex, and I raise blockers rather than hide them. Fluency will improve through daily work; technical clarity and reliability are already habits I can apply.

**Câu hỏi tiếng Việt:** Tiếng Anh của bạn chậm; làm sao làm việc trực tiếp với tôi?

**Trả lời tiếng Việt**

> Speaking của tôi chậm hơn technical reading nhưng tôi giao tiếp có cấu trúc, confirm requirement và summarize decision bằng văn bản. Tôi dùng diagram/example cho concept phức tạp và báo blocker thay vì giấu. Fluency sẽ tăng qua công việc hằng ngày; clarity/reliability là thói quen hiện có.

### 14. What would you do in your first month?

**Model answer**

> I would learn the product, users, repository conventions, release process, and current risks; deliver one small real feature end to end; then take ownership of a meaningful frontend area with predictable communication. I would review AI workflow and quality gates early, but avoid proposing a broad rewrite before understanding delivery constraints.

**Câu hỏi tiếng Việt:** Bạn làm gì trong tháng đầu?

**Trả lời tiếng Việt**

> Học product, users, repo conventions, release process và risks; ship một small real feature end-to-end; sau đó ownership frontend area có ý nghĩa với communication predictable. Review AI workflow/quality gates sớm nhưng không đề xuất rewrite trước khi hiểu delivery constraints.

### 15. Why should I choose you over a stronger pure frontend candidate?

**Model answer**

> A stronger specialist may know more UI details today, and I would not deny that. My value is the combination of the exact stack, practical frontend delivery, and end-to-end system reasoning around API contracts, auth, realtime, consistency, and failure. I can communicate with backend engineers, control AI-generated code, and learn frontend gaps systematically. If the role needs ownership across the complete user-to-system flow, that combination is useful.

**Câu hỏi tiếng Việt:** Vì sao chọn bạn thay vì ứng viên pure frontend mạnh hơn?

**Trả lời tiếng Việt**

> Một specialist có thể biết nhiều UI details hơn hôm nay và tôi không phủ nhận. Giá trị của tôi là exact stack, practical delivery và end-to-end reasoning về API, auth, realtime, consistency, failure. Tôi giao tiếp được với backend, kiểm soát AI code và đóng frontend gaps có hệ thống; combination này phù hợp nếu role cần ownership toàn flow.

### Mock 2 Review

- [ ] Challenges were accepted without becoming defensive.
- [ ] “Current implementation” and “proposed improvement” stayed separate.
- [ ] Each design answer identified a product assumption.
- [ ] At least one answer explicitly protected tenant/security boundaries.
- [ ] English remained short after pressure follow-ups.

---

## Optional Practical Exercises / Bài Thực Hành Có Thể Xuất Hiện

### Exercise A — Component Review (15 Minutes)

Ask for a generated CRUD table and review it in this order:

1. Requirement and user states.
2. Data source and query key.
3. Sorting/filtering/pagination ownership.
4. Component responsibilities.
5. Semantic table and action controls.
6. Pending, empty, error, permission, and long-content behavior.
7. Tests and verification.

### Exercise B — Architecture Whiteboard (10 Minutes)

Draw:

`User action → Client Component → Query mutation → BFF → domain service → response/event → scoped invalidation → authoritative query → UI`

Explain failure at the mutation, event, and reconnect boundaries.

### Exercise C — Figma Screen (20–30 Minutes)

Before coding, say aloud:

> I will identify reusable primitives, layout behavior, responsive assumptions, and all async states first. Then I will implement the smallest semantic structure and validate it at the target viewports.

---

# Last-Minute Sheet / Tờ Ôn Hai Giờ Cuối

## Positioning

> I am a frontend-focused TypeScript developer with full-stack system awareness. I can own user flows, state, API integration, realtime consistency, and AI-assisted code quality. I am available immediately.

## Five Stories

1. GEEK Up: Figma → responsive React → API states → MR feedback.
2. Freelance ERP: ambiguous payroll rules → clarify business behavior.
3. QRTable cart: optimistic UI + cart version + rollback.
4. QRTable auth: session resolved before BFF token hydration → query gating.
5. QRTable realtime: scoped event → targeted invalidation → reconnect recovery.

## Next.js

- React is the UI library; Next.js is a React framework with routing, server rendering, RSC, caching conventions, backend boundaries, and production tooling.
- Choose React/Vite for a focused client-heavy SPA with a separate backend; choose Next.js when its server, routing, metadata, and rendering capabilities solve real requirements.
- Server Component: server execution, data/security/static structure, less client code.
- Client Component: state, effects, handlers, browser APIs, client libraries.
- `'use client'`: client entry boundary, not “CSR only”.
- Hydration: attach behavior to server HTML; first outputs must match.
- App Router: nested layouts, special files, RSC, streaming.
- Current QRTable: public server page; operational client-heavy features.
- No broad Query dehydration; no Cache Components enabled.

## State

- Remote data → TanStack Query.
- Shareable navigation → URL.
- Local interaction → local state.
- Scoped low-frequency dependency → Context.
- Cross-tree client state with selectors → Zustand.
- Never duplicate one source of truth without a deliberate draft boundary.

## Query

- Key contains every result-changing input and scope.
- `staleTime` = freshness; GC time = inactive cache retention.
- Mutation: pending → success/cache or invalidation → error/recovery.
- Optimistic: cancel → snapshot → patch → rollback → reconcile.
- Socket event is a hint; Query snapshot is authoritative.

## Table

- Headless engine; application owns UI and accessibility.
- Bounded full dataset → client operations.
- Large/remote dataset → server pagination, sorting, filtering together.
- Virtualize only after rendering volume becomes a bottleneck.

## UI

- Figma: flow → tokens → components → responsive → states → visual QA.
- Pixel-perfect includes dynamic content and accessibility.
- Native semantics before ARIA.
- Loading, empty, error, permission, long content, keyboard, focus.
- shadcn code is owned by the project; customization requires maintenance.

## QRTable Truths

- Two apps: Next.js Management + React/Vite Customer.
- REST through BFF; Socket.io for realtime hints.
- Customer cart has optimistic patch and expected version.
- KDS queue keyed by tenant/station; events invalidate matching queue.
- POS virtualizes above 50 rows.
- 37 Management and 15 Customer spec files at audit time.
- Do not claim full offline/installable PWA.
- Do not claim all screens are server-first.
- Do not claim personal authorship without checking two-person ownership.

## AI

> Requirement → context and constraints → small draft → architecture review → types/security/a11y/performance → tests/static checks → manual verification.

Red flags: invented API · stale docs · duplicate utility · broad client boundary · wrong state owner · missing cleanup · inaccessible controls · fake tests.

## English Rescue

1. “Let me think for a moment and structure the answer.”
2. “If I understand correctly, you are asking about…”
3. “Do you mean the initial render or later client updates?”
4. “Let me connect that to QRTable.”
5. “The current implementation does X; an improvement would be Y.”
6. “I have not implemented that directly, so I do not want to guess.”
7. “Both options are valid, but they optimize for different things.”
8. “The main trade-off is…”
9. “Could I draw a small data-flow diagram?”
10. “Let me correct one part of my previous answer.”

## Final Questions for the CEO

1. “What outcome matters most in the first six to eight weeks?”
2. “Which frontend mistakes do you most want this hire to prevent when working with AI-generated code?”
3. “How do product, design, frontend, and backend agree that a feature is ready?”

## Stop Rule

Two hours before the interview:

- Do not open a new technical topic.
- Review introduction, five stories, Next/Query/state, QRTable truth, and English rescue.
- Check logistics, water, notebook, laptop, charger, and arrival time.
- Speak slowly. Direct answer first. One example. One trade-off. Stop.
