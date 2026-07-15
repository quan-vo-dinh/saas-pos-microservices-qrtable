# Quality, Testing, Debugging, AI, and Behavioral Answer Bank

## Code Integrity and Architecture

### 1. What Does Clean Design Mean to You? [P0]

**Core answer**

> Clean Design means responsibilities and dependencies are visible and changes remain local. Components focus on rendering and interaction, hooks coordinate state lifecycle, services own transport details, and domain rules are not hidden inside generic UI. Names express intent, data has one source of truth, and tests protect important behavior. Clean code is not the maximum number of layers; it is the minimum structure that keeps change safe.

**Câu hỏi tiếng Việt:** Clean Design có nghĩa gì với bạn?

**Trả lời tiếng Việt**

> Clean Design nghĩa là responsibilities và dependencies nhìn thấy rõ, change giữ được cục bộ. Component tập trung render/interaction, hook phối hợp state lifecycle, service sở hữu transport, domain rule không ẩn trong generic UI. Clean code không phải nhiều layer nhất mà là structure tối thiểu giúp thay đổi an toàn.

### 2. How Do You Apply DRY? [P0]

**Core answer**

> DRY means avoiding duplicated knowledge, not eliminating every repeated line. I extract when multiple places must change together because they represent the same rule or contract. I do not force two visually similar features into one abstraction if their behavior is evolving differently. A premature abstraction can be harder to maintain than small duplication.

**Câu hỏi tiếng Việt:** Bạn áp dụng DRY thế nào?

**Trả lời tiếng Việt**

> DRY là tránh duplicated knowledge, không phải xóa mọi dòng lặp. Tôi extract khi nhiều nơi phải đổi cùng nhau vì cùng một rule/contract. Không ép hai feature chỉ nhìn giống nhau vào abstraction khi behavior đang phát triển khác nhau.

### 3. What Makes a Component Too Large? [P0]

**Core answer**

> Size alone is a signal, but mixed reasons to change are the real problem. If one component fetches data, owns multiple workflows, defines complex table columns, handles several dialogs, and renders the entire page, I separate orchestration, domain hooks, and focused visual components. I keep related code together when splitting would only create indirection.

**Câu hỏi tiếng Việt:** Khi nào một component được xem là quá lớn?

**Trả lời tiếng Việt**

> Số dòng chỉ là signal; vấn đề thật là nhiều reasons to change. Nếu một component vừa fetch, sở hữu nhiều workflow, định nghĩa table columns, quản lý dialogs và render toàn page, tôi tách orchestration, domain hooks và focused UI. Không tách nếu chỉ tạo indirection.

### 4. How Do You Avoid Prop Drilling? [P1]

**Core answer**

> First I check whether the state is owned too high. Component composition or colocating state may remove the drilling. Context fits a coherent subtree dependency, and a store fits independent cross-tree subscriptions. I do not move state global only to avoid passing two or three clear props.

**Câu hỏi tiếng Việt:** Bạn tránh prop drilling thế nào?

**Trả lời tiếng Việt**

> Trước hết xem state có được đặt quá cao không. Composition hoặc colocation có thể giải quyết; Context hợp coherent subtree dependency, store hợp cross-tree subscriptions. Tôi không globalize state chỉ để tránh truyền hai ba props rõ ràng.

### 5. How Do SOLID Principles Apply to React? [P1]

**Core answer**

> I apply the intent rather than forcing class patterns. A component or hook should have one reason to change. Feature code depends on stable service or hook contracts rather than transport details. Composition and small interfaces support extension without modifying one giant conditional component. I avoid abstractions that exist only to mention SOLID.

**Câu hỏi tiếng Việt:** SOLID áp dụng vào React thế nào?

**Trả lời tiếng Việt**

> Tôi dùng intent chứ không ép class pattern: component/hook có một reason to change, feature phụ thuộc stable contracts thay transport details, composition và interface nhỏ hỗ trợ mở rộng. Không tạo abstraction chỉ để nói đã dùng SOLID.

### 6. How Do You Enforce Type Safety? [P0]

**Core answer**

> I define types at real boundaries, reuse shared wire contracts, validate external data when runtime trust is required, and keep transformations explicit. I prefer `unknown` plus narrowing over `any`, use discriminated unions for state or events, and avoid unsafe assertions that merely silence the compiler. TypeScript reduces classes of bugs but does not replace runtime validation.

**Câu hỏi tiếng Việt:** Bạn bảo đảm type safety thế nào?

**Trả lời tiếng Việt**

> Định nghĩa type ở boundaries thật, reuse shared wire contracts, runtime-validate external data khi cần, dùng `unknown` + narrowing thay `any`, discriminated union cho state/event và tránh assertion chỉ để im compiler. TypeScript không thay runtime validation.

### 7. How Do You Review a Pull Request? [P0]

**Core answer**

> I review from risk to detail: requirement and user behavior, security and data scope, architecture and state ownership, error and loading paths, accessibility and performance, tests, then naming and duplication. I run or interact with high-risk behavior instead of relying only on the diff. Review comments explain impact and distinguish blockers from optional suggestions.

**Câu hỏi tiếng Việt:** Bạn review pull request thế nào?

**Trả lời tiếng Việt**

> Review từ risk đến detail: requirement/user behavior, security/data scope, architecture/state ownership, loading/error, accessibility/performance, tests rồi naming/duplication. Tôi chạy high-risk behavior thay vì chỉ đọc diff và phân biệt blocker với optional suggestion.

### 8. When Would You Refactor? [P0]

**Core answer**

> I refactor when the current structure makes the requested change unsafe, repeated, or difficult to test, and I keep the scope near the feature being changed. For a broader refactor, I need evidence such as recurring defects, slow delivery, or measurable performance cost. I preserve behavior with tests and avoid combining an unbounded rewrite with an urgent feature.

**Câu hỏi tiếng Việt:** Khi nào bạn refactor?

**Trả lời tiếng Việt**

> Khi structure hiện tại làm change unsafe, lặp hoặc khó test; giữ scope gần feature đang sửa. Refactor lớn cần evidence như defect lặp, delivery chậm hoặc performance cost. Dùng test bảo vệ behavior và tránh ghép rewrite vô hạn với feature gấp.

## Testing

### 9. What Is Your Frontend Testing Strategy? [P0]

**Core answer**

> I test important behavior at the cheapest reliable boundary. Pure transformations get unit tests. Hooks and components get integration tests around user-visible state, API contracts, cache changes, and permissions. A small E2E suite protects critical journeys such as login, ordering, and payment. Static types, linting, and accessibility checks support the suite but do not replace runtime tests.

**Câu hỏi tiếng Việt:** Testing strategy frontend của bạn là gì?

**Trả lời tiếng Việt**

> Test behavior quan trọng ở boundary rẻ và đáng tin nhất. Pure transformation dùng unit; hook/component dùng integration quanh UI state, API/cache/permission; một số ít E2E bảo vệ login, ordering, payment. Type/lint/a11y checks hỗ trợ nhưng không thay runtime tests.

### 10. Unit, Integration, and E2E Tests [P0]

**Core answer**

> Unit tests isolate a small function or rule and give fast diagnosis. Integration tests verify several real pieces together, such as a component with Query state and mocked network behavior. E2E tests verify the deployed user path through browser and backend boundaries. I use more unit and integration tests, with fewer high-value E2E tests because they cost more to run and maintain.

**Câu hỏi tiếng Việt:** Unit, integration và E2E test khác nhau thế nào?

**Trả lời tiếng Việt**

> Unit isolate function/rule nhỏ, chạy nhanh và dễ chẩn đoán. Integration kiểm tra nhiều phần thật cùng nhau, như component + Query + mocked network. E2E kiểm tra deployed user path qua browser/backend nhưng tốn thời gian và maintenance nên chỉ giữ critical journeys.

### 11. What Should You Test in a TanStack Query Mutation? [P0]

**Core answer**

> I test the request inputs, pending behavior, success cache update or invalidation, expected user feedback, error message, optimistic snapshot, rollback, and conflict reconciliation. I isolate the QueryClient and control retries. The assertion should focus on observable behavior and cache contract rather than implementation call order unless that order is the behavior.

**Câu hỏi tiếng Việt:** Cần test gì trong TanStack Query mutation?

**Trả lời tiếng Việt**

> Request inputs, pending behavior, success cache update/invalidation, user feedback, error, optimistic snapshot, rollback và conflict reconciliation. QueryClient phải cô lập và retry được kiểm soát; assert observable behavior hơn internal call order.

### 12. How Do You Test Realtime Behavior? [P0]

**Core answer**

> I use a controllable socket mock, mount the hook with a scoped QueryClient, emit matching and non-matching events, and assert targeted invalidation. I also test reconnect, auth error, cleanup, and that old listeners do not remain after unmount or identity change. Cross-tenant events must not update the current view.

**Câu hỏi tiếng Việt:** Bạn test realtime behavior thế nào?

**Trả lời tiếng Việt**

> Dùng controllable socket mock, mount hook với scoped QueryClient, emit matching/non-matching events và assert targeted invalidation. Test reconnect, auth error, cleanup, old listeners sau unmount/identity change và bảo đảm cross-tenant event không update view.

### 13. What Makes a Test Brittle? [P1]

**Core answer**

> A test is brittle when it depends on implementation details that users and contracts do not care about—for example internal state shape, exact hook call order, arbitrary timing, or fragile selectors. I prefer roles, accessible names, stable contracts, controlled time, and explicit async waiting. Some low-level unit tests can inspect implementation when that implementation is itself the contract.

**Câu hỏi tiếng Việt:** Điều gì làm test brittle?

**Trả lời tiếng Việt**

> Phụ thuộc implementation details user/contract không quan tâm: internal state, exact hook order, arbitrary timing, fragile selectors. Tôi ưu tiên roles, accessible names, stable contracts, controlled time và explicit async waits.

### 14. How Much Coverage Is Enough? [P1]

**Core answer**

> Coverage is a signal, not the goal. I prioritize financial actions, authorization, tenant scope, state transitions, error recovery, and code that changes frequently. A high percentage can still miss the main user risk. I use coverage reports to find untested branches, then decide from impact.

**Câu hỏi tiếng Việt:** Coverage bao nhiêu là đủ?

**Trả lời tiếng Việt**

> Coverage là signal chứ không phải mục tiêu. Tôi ưu tiên financial action, authorization, tenant scope, state transitions, recovery và code hay đổi. Percentage cao vẫn có thể bỏ sót risk chính; report dùng để tìm branch rồi đánh giá theo impact.

## Debugging

### 15. Describe Your Debugging Process [P0]

**Core answer**

> I first make the symptom reproducible and record the exact inputs and environment. Then I divide the path into UI event, component state, query cache, network request, and backend response. I inspect evidence at each boundary, form one hypothesis, and run the smallest experiment that can disprove it. After fixing the root cause, I add a regression check and verify related flows.

**Câu hỏi tiếng Việt:** Hãy mô tả quy trình debug của bạn

**Trả lời tiếng Việt**

> Làm symptom reproduce được và ghi input/environment. Chia path thành UI event, component state, query cache, network, backend response; xem evidence từng boundary, đưa một hypothesis và experiment nhỏ để bác bỏ. Sửa root cause, thêm regression check và verify related flows.

### 16. A Page Renders Too Often. What Do You Do? [P0]

**Core answer**

> I use React DevTools Profiler or focused logging to identify which component renders, why it renders, and whether the cost is meaningful. Then I check broad Context or store subscriptions, state placed too high, unstable props, effects that update state, and expensive calculations. I fix ownership first and memoize only a measured boundary.

**Câu hỏi tiếng Việt:** Page render quá nhiều; bạn làm gì?

**Trả lời tiếng Việt**

> Dùng React Profiler/log tập trung để biết component nào render, vì sao và cost có đáng kể không. Kiểm tra broad Context/store subscriptions, state quá cao, unstable props, effect update state và expensive calculation. Sửa ownership trước, memoize sau khi đo.

### 17. A Page Is Slow. How Do You Diagnose It? [P0]

**Core answer**

> I separate network, server response, bundle loading, JavaScript execution, React rendering, layout, and asset cost. Browser performance and network tools show where the time goes. Then I optimize the largest bottleneck—for example parallelizing requests, reducing client code, virtualizing a large list, or fixing repeated rendering—and measure again.

**Câu hỏi tiếng Việt:** Page chậm; bạn chẩn đoán thế nào?

**Trả lời tiếng Việt**

> Tách network, server response, bundle, JavaScript execution, React render, layout và assets. Browser tools cho biết bottleneck; sau đó tối ưu phần lớn nhất như parallel requests, giảm client code, virtualize list hoặc sửa rerender rồi đo lại.

### 18. The UI Shows Stale Data after a Mutation. What Do You Check? [P0]

**Core answer**

> I check whether the mutation response is canonical, whether the correct query family was updated or invalidated, whether the key includes all filters and scope, and whether another event or optimistic update overwrote the result. I inspect Query Devtools and network timing. The fix should restore one source of truth, not add an arbitrary timeout.

**Câu hỏi tiếng Việt:** UI stale sau mutation; bạn kiểm tra gì?

**Trả lời tiếng Việt**

> Kiểm tra mutation response có canonical không, đúng query family đã update/invalidate chưa, key đủ filter/scope chưa và event/optimistic update khác có overwrite không. Dùng Query Devtools/network timing; sửa source of truth, không thêm timeout tùy tiện.

### 19. A Socket Event Fires Twice. What Do You Check? [P0]

**Core answer**

> I check whether the component mounted twice in development, whether cleanup removes the exact handler reference, whether multiple sockets exist, and whether the server emitted duplicate events. I distinguish duplicate delivery from duplicate side effects. Event handling should be safe under retries where practical, but I still remove the duplicate source.

**Câu hỏi tiếng Việt:** Socket event chạy hai lần; bạn kiểm tra gì?

**Trả lời tiếng Việt**

> Kiểm tra development double mount, cleanup có remove đúng handler reference, có nhiều socket không và server có emit duplicate không. Phân biệt duplicate delivery với duplicate side effects; làm handler an toàn trước retry nhưng vẫn loại nguyên nhân trùng.

### 20. An Issue Happens Only in Production. What Do You Do? [P1]

**Core answer**

> I compare environment, build mode, data volume, permissions, cache, network, and feature flags. I use production-safe logs, traces, error reports, and request correlation rather than adding sensitive console output. I reproduce the closest safe conditions locally or in staging, reduce the difference, deploy the smallest fix with a rollback path, and monitor the result.

**Câu hỏi tiếng Việt:** Lỗi chỉ xảy ra production; bạn làm gì?

**Trả lời tiếng Việt**

> So sánh environment, build mode, data volume, permission, cache, network và feature flags. Dùng production-safe logs/traces/error reports, không log sensitive data. Reproduce môi trường gần nhất, deploy fix nhỏ có rollback và monitor kết quả.

## AI-Assisted Development

### 21. How Do You Use Claude Code or Cursor? [P0]

**Core answer**

> I use AI for repository exploration, a first implementation draft, test generation, refactoring options, and documentation. I provide the requirement, relevant architecture, constraints, examples, and acceptance checks. I ask for small diffs, inspect every change, run verification, and keep responsibility for the final behavior. The tool accelerates work; it does not decide the product or architecture by itself.

**Câu hỏi tiếng Việt:** Bạn dùng Claude Code hoặc Cursor thế nào?

**Trả lời tiếng Việt**

> Dùng để explore repo, tạo first draft, test, refactor options và docs. Tôi cung cấp requirement, architecture, constraints, examples, acceptance checks, yêu cầu diff nhỏ, inspect mọi change, chạy verification và chịu trách nhiệm final behavior.

### 22. How Do You Prompt AI for a Frontend Feature? [P0]

**Core answer**

> I include the user outcome, current component and data flow, design-system primitives, state ownership, API contract, responsive and accessibility requirements, edge states, files in scope, and verification criteria. I ask it to inspect existing patterns before creating new abstractions. A good prompt narrows the decision space but still requires review.

**Câu hỏi tiếng Việt:** Bạn prompt AI cho frontend feature thế nào?

**Trả lời tiếng Việt**

> Cung cấp user outcome, current component/data flow, design primitives, state ownership, API contract, responsive/a11y requirements, edge states, file scope và verification criteria. Yêu cầu AI inspect existing patterns trước khi tạo abstraction mới.

### 23. What AI-Generated Mistakes Do You Expect? [P0]

**Core answer**

> Common mistakes are inventing APIs, using stale framework behavior, duplicating existing utilities, putting server state in local state, broad `'use client'` boundaries, missing loading or error states, inaccessible custom controls, fake performance optimization, and tests that only confirm the mock. AI code can look confident, so I verify assumptions in code and official documentation.

**Câu hỏi tiếng Việt:** Bạn dự đoán AI-generated code hay sai gì?

**Trả lời tiếng Việt**

> Bịa API, dùng framework behavior cũ, duplicate utility, cho server state vào local state, mở `'use client'` quá rộng, thiếu loading/error, custom control không accessible, tối ưu giả và test chỉ chứng minh mock. Phải verify assumptions bằng code và official docs.

### 24. How Do You Review AI-Generated Code? [P0]

**Core answer**

> First I confirm it solves the actual requirement. Then I review file placement, responsibilities, types, data and tenant scope, state ownership, effects and cleanup, accessibility, performance, and failure states. I compare with existing project patterns, remove unnecessary abstractions, run targeted tests and static checks, and manually exercise the workflow. I accept only code I can explain.

**Câu hỏi tiếng Việt:** Bạn review AI-generated code thế nào?

**Trả lời tiếng Việt**

> Xác nhận nó giải đúng requirement, rồi review placement, responsibility, types, tenant/data scope, state ownership, effect cleanup, accessibility, performance và failure states. So với project patterns, xóa abstraction thừa, chạy tests/static checks và exercise workflow. Chỉ nhận code tôi giải thích được.

### 25. What If AI Produces Working but Ugly Code? [P0]

**Core answer**

> Passing the happy path is only the first checkpoint. I identify duplicated knowledge, mixed responsibilities, unclear state ownership, and untested edge cases. I refactor within the feature scope while preserving behavior, then verify again. I do not keep poor structure merely because generation was fast; maintenance cost belongs to the team.

**Câu hỏi tiếng Việt:** Nếu AI tạo code chạy được nhưng xấu thì sao?

**Trả lời tiếng Việt**

> Happy path pass chỉ là checkpoint đầu. Tôi tìm duplicated knowledge, mixed responsibility, unclear state ownership và untested edges, refactor trong feature scope, giữ behavior rồi verify lại. Generation nhanh không chuyển maintenance cost khỏi team.

### 26. Can AI Replace Frontend Fundamentals? [P0]

**Core answer**

> No. AI can produce syntax quickly, but someone must decide component boundaries, source of truth, rendering strategy, accessibility, performance trade-offs, and whether generated code matches the actual framework version. Strong fundamentals make AI useful because they allow fast rejection and correction of plausible mistakes.

**Câu hỏi tiếng Việt:** AI có thay thế frontend fundamentals không?

**Trả lời tiếng Việt**

> Không. AI sinh syntax nhanh nhưng vẫn cần người quyết định component boundary, source of truth, rendering, accessibility, performance trade-offs và framework version. Fundamentals mạnh giúp reject/correct plausible mistakes nhanh.

## Behavioral and Situational Questions

Use **STAR-L**: Situation, Task, Action, Result, Learning. Keep Situation short; spend most time on Action.

### 27. Tell Me About a Technical Challenge [P0]

**Core answer**

> One challenge in QRTable was keeping customer cart interactions fast while preventing stale clients from overwriting newer state. The UI applies an optimistic patch so quantity changes feel immediate, but every request includes the expected cart version. We snapshot the previous cache, roll back on failure, and refetch on a version conflict. The result is responsive interaction with an explicit recovery path. The lesson was that visual optimism and data consistency must be designed together.

**Ownership note:** Say “I implemented” only if Quân directly owned this hook; otherwise keep “we designed” or “the project uses”.

**Câu hỏi tiếng Việt:** Hãy kể một technical challenge

**Trả lời tiếng Việt**

> Một challenge của QRTable là làm cart interaction nhanh mà không để stale client overwrite state mới. UI optimistic patch ngay, request gửi expected cart version; previous cache được snapshot để rollback và conflict sẽ refetch. Bài học là visual optimism và data consistency phải thiết kế cùng nhau. Chỉ nói “tôi implement” nếu đúng ownership.

### 28. Tell Me About a Bug You Solved [P0]

**Repository-grounded answer**

> A frontend integration risk we addressed was authenticated queries running before the client had hydrated the access token. The visible symptom was an avoidable unauthorized request even though the user had a valid session. We separated NextAuth session resolution from BFF readiness and gated feature queries until the token and profile were available. We added tests around auth readiness. The lesson was to model authentication as a lifecycle state, not a simple boolean.

**Personalize:** Confirm this matches a bug Quân actually investigated before presenting it as personal ownership.

**Câu hỏi tiếng Việt:** Hãy kể một bug bạn đã giải quyết

**Trả lời tiếng Việt**

> Một integration risk là query chạy trước khi access token hydrate, tạo unauthorized request dù session hợp lệ. Chúng tôi tách NextAuth resolution khỏi BFF readiness và gate queries đến khi token/profile sẵn sàng, kèm test. Bài học là auth là lifecycle state, không chỉ boolean. Cần cá nhân hóa nếu Quân trực tiếp debug.

### 29. Tell Me About a Time Requirements Were Unclear [P0]

**Core answer**

> In the freelance payroll project, rules around salary records, allowances, deductions, and payroll periods affected both the interface and API behavior. Instead of implementing from labels alone, I listed the state transitions and edge cases, discussed them with the team, and separated confirmed rules from assumptions. That reduced rework and made manual testing more focused. I learned to ask questions in terms of business outcomes and examples, not only technical fields.

**Câu hỏi tiếng Việt:** Hãy kể khi requirement không rõ

**Trả lời tiếng Việt**

> Trong freelance payroll, rules về salary, allowance, deduction, period ảnh hưởng cả UI/API. Tôi liệt kê transitions/edge cases, trao đổi với team và tách confirmed rules khỏi assumptions. Điều này giảm rework và tập trung manual test; câu hỏi nên dựa vào business outcomes/examples.

### 30. Tell Me About Working under a Tight Deadline [P0]

**Core answer**

> Under a tight deadline, I first separate the critical user journey from optional polish, identify external dependencies, and make risks visible early. I deliver a vertical slice that can be reviewed, then add edge states and polish in priority order. I do not hide missing requirements until the end. My goal is a smaller verified result rather than a larger unreviewed change.

**Personalize:** Add one real deadline from GEEK Up, freelance work, or the thesis defense.

**Câu hỏi tiếng Việt:** Hãy kể khi làm dưới deadline gấp

**Trả lời tiếng Việt**

> Tôi tách critical user journey khỏi optional polish, xác định dependency và báo risk sớm. Tôi giao vertical slice reviewable trước rồi thêm edge states/polish theo priority. Mục tiêu là kết quả nhỏ nhưng verified thay vì change lớn chưa review. Cần gắn một deadline thật.

### 31. Tell Me About Receiving Critical Feedback [P0]

**Core answer**

> During my frontend internship, merge-request feedback taught me to separate personal effort from code quality. I first made sure I understood the risk behind the comment, then changed the implementation and checked similar code. If I disagreed, I asked about the requirement and explained the trade-off with evidence. The important result was not only resolving one comment but improving how I prepared later changes for review.

**Personalize:** Add the exact feedback if remembered. Do not invent a specific comment.

**Câu hỏi tiếng Việt:** Hãy kể khi nhận feedback khó

**Trả lời tiếng Việt**

> Trong internship, merge-request feedback dạy tôi tách effort cá nhân khỏi code quality. Tôi hiểu risk phía sau comment, sửa implementation, kiểm tra code tương tự; nếu disagree thì hỏi requirement và nêu trade-off bằng evidence. Cần thêm exact feedback thật nếu nhớ.

### 32. Tell Me About a Mistake or Failure [P0]

**Core answer**

> Earlier in project work, I sometimes started implementation before making all data and failure states explicit. That could create rework when the API contract or business rule changed. I improved by writing the user flow, source of truth, states, and acceptance checks before coding, especially for order and payment flows. I still value speed, but now I spend a short amount of time reducing uncertainty first.

**Câu hỏi tiếng Việt:** Hãy kể một sai lầm hoặc thất bại

**Trả lời tiếng Việt**

> Trước đây tôi đôi khi code trước khi explicit data/failure states nên phải rework khi contract đổi. Tôi cải thiện bằng cách viết user flow, source of truth, states và acceptance checks trước, nhất là order/payment. Bài học là giảm uncertainty lớn trước khi code, không phải over-plan.

### 33. Tell Me About a Disagreement [P1]

**Core answer**

> When I disagree, I try to move the conversation from preference to constraints. I restate the shared goal, compare options by delivery time, correctness, maintainability, and user impact, and suggest a small experiment when evidence is missing. Once the team decides, I support the decision and document the trade-off. I do not treat a technical disagreement as a personal conflict.

**Câu hỏi tiếng Việt:** Hãy kể một lần bất đồng

**Trả lời tiếng Việt**

> Tôi đưa tranh luận từ preference về constraints: restate shared goal, so options theo delivery, correctness, maintainability, user impact và đề xuất experiment nhỏ khi thiếu evidence. Khi team quyết, tôi support và document trade-off. Cần thay bằng câu chuyện thật trước phỏng vấn.

### 34. How Do You Prioritize Multiple Tasks? [P0]

**Core answer**

> I prioritize by user or business impact, deadline, dependency, risk, and reversibility. A blocker for another developer or a production issue comes before isolated polish. I clarify competing priorities with the owner instead of silently choosing, then communicate what will not fit. I keep one main task in progress and break large work into reviewable outcomes.

**Câu hỏi tiếng Việt:** Bạn ưu tiên nhiều task thế nào?

**Trả lời tiếng Việt**

> Theo user/business impact, deadline, dependency, risk và reversibility. Production issue hoặc blocker cho người khác trước isolated polish. Khi priority xung đột, tôi hỏi owner, nói rõ phần không fit và giữ một main task in progress.

### 35. What Do You Do When You Are Blocked? [P0]

**Core answer**

> I first define the exact blocker and try bounded investigation using code, documentation, logs, or a small reproduction. If I still need another person or decision, I report what I tried, the evidence, the impact, and a specific question. I continue any independent work that remains safe. I avoid spending hours silently stuck or asking for help without context.

**Câu hỏi tiếng Việt:** Bạn làm gì khi bị block?

**Trả lời tiếng Việt**

> Xác định blocker chính xác, điều tra có giới hạn qua code/docs/log/reproduction. Nếu vẫn cần người/decision, tôi báo những gì đã thử, evidence, impact và câu hỏi cụ thể; tiếp tục phần independent an toàn. Không im lặng stuck nhiều giờ.

### 36. How Do You Estimate a Frontend Task? [P1]

**Core answer**

> I break the task into requirement clarification, design and states, data contract, implementation, tests, review, and integration risk. I identify unknowns separately from known work and give a range when uncertainty is meaningful. After discovering new information, I update the estimate early rather than defend an outdated number.

**Câu hỏi tiếng Việt:** Bạn estimate frontend task thế nào?

**Trả lời tiếng Việt**

> Chia thành requirement clarification, design/states, data contract, implementation, tests, review và integration risk. Tách unknown khỏi known work, đưa range khi uncertainty lớn và update estimate sớm khi có thông tin mới.

### 37. How Do You Work in Scrum or Agile? [P0]

**Core answer**

> For me, Agile means short feedback loops and visible risk, not only ceremonies. I clarify acceptance criteria, keep work reviewable, report blockers in daily communication, use merge requests for feedback, and demonstrate working behavior. Retrospectives should produce a concrete improvement. At GEEK Up, I experienced Scrum and GitLab merge-request workflows in a product team.

**Câu hỏi tiếng Việt:** Bạn làm việc theo Scrum/Agile thế nào?

**Trả lời tiếng Việt**

> Agile với tôi là short feedback loops và visible risk, không chỉ ceremonies. Tôi làm rõ acceptance, giữ work reviewable, báo blocker, dùng merge request feedback và demo behavior chạy được; retrospective phải tạo concrete improvement.

### 38. How Do You Balance Speed and Quality? [P0]

**Core answer**

> I protect non-negotiable quality such as security, data integrity, accessibility of critical actions, and recoverable errors. For lower-risk polish, I can reduce scope or schedule follow-up work. I use existing patterns, small diffs, automation, and AI to increase speed without skipping verification. The trade-off should be explicit, not hidden inside rushed code.

**Câu hỏi tiếng Việt:** Bạn cân bằng tốc độ và chất lượng thế nào?

**Trả lời tiếng Việt**

> Bảo vệ non-negotiable quality như security, data integrity, critical accessibility và recoverable errors. Với low-risk polish, có thể giảm scope/follow-up. Dùng existing patterns, small diffs, automation, AI để nhanh nhưng không bỏ verification; trade-off phải explicit.

### 39. How Do You Communicate with Backend Engineers? [P0]

**Core answer**

> I discuss the API as a contract: inputs, identity and tenant context, success shape, error codes, idempotency, state transitions, and realtime events. I provide a failing request or example payload when there is a problem. My backend experience helps me ask feasible questions, but I still represent frontend needs such as stable errors and user-visible consistency.

**Câu hỏi tiếng Việt:** Bạn giao tiếp với backend engineers thế nào?

**Trả lời tiếng Việt**

> Thảo luận API như contract: input, identity/tenant, success shape, error codes, idempotency, transitions, realtime events. Khi có lỗi, đưa failing request/payload. Backend experience giúp tôi hỏi khả thi nhưng vẫn đại diện frontend needs như stable errors và visible consistency.

### 40. How Do You Communicate with Designers? [P0]

**Core answer**

> I ask about user priority, responsive behavior, content extremes, component variants, and missing states rather than only requesting pixel measurements. I reuse the design system, share an early interactive version, and report technical constraints with alternatives. If implementation must differ, the decision should preserve intent and be visible to the designer.

**Câu hỏi tiếng Việt:** Bạn giao tiếp với designers thế nào?

**Trả lời tiếng Việt**

> Hỏi user priority, responsive behavior, content extremes, variants và missing states thay vì chỉ pixel. Reuse design system, chia sẻ interactive version sớm và nêu technical constraints cùng alternatives. Nếu khác design, quyết định phải giữ intent và designer nhìn thấy.

## Story Preparation Checklist / Checklist Cá Nhân Hóa Câu Chuyện

The answers above are safe structures, but Quân must add real details for these five stories:

- [ ] One exact GEEK Up code-review comment.
- [ ] One exact freelance payroll requirement ambiguity.
- [ ] One QRTable frontend bug Quân personally diagnosed.
- [ ] One disagreement with the thesis teammate and how it ended.
- [ ] One deadline where Quân changed scope or priority.

For each story, write only five lines: Situation, Task, Action, Result, Learning. If an exact metric does not exist, describe the verified result without inventing a percentage.
