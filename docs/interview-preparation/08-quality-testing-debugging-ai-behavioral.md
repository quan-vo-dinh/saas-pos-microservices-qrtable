# Quality, Testing, Debugging, AI, and Behavioral — Simple Answers

> Với behavioral question, đừng học một câu chuyện không phải của mình. Dùng answer trong file làm khung rồi thêm chi tiết thật trước khi phỏng vấn.

## Clean Code and Architecture / Code Sạch và Kiến Trúc

### 1. What Does Clean Design Mean to You? [P0]

**Simple English answer**

> Clean design means each part has a clear job. Components handle UI, hooks manage state behavior, and services call APIs. Data should have one source of truth. The code should be easy to change and test. Clean design does not mean creating many layers for a simple feature.

**Câu hỏi tiếng Việt:** Clean Design có nghĩa gì với bạn?

**Câu trả lời tiếng Việt**

> Clean Design nghĩa là mỗi phần có một nhiệm vụ rõ ràng. Component xử lý UI, hook quản lý behavior của state và service gọi API. Dữ liệu nên có một source of truth. Code phải dễ thay đổi và test. Clean Design không có nghĩa tạo nhiều layer cho một feature đơn giản.

### 2. How Do You Apply DRY? [P0]

**Simple English answer**

> DRY means I do not repeat the same business rule or knowledge in many places. I extract shared code when those places must always change together. I do not remove every repeated line. Sometimes small duplication is clearer than one abstraction that tries to support unrelated features.

**Câu hỏi tiếng Việt:** Bạn áp dụng DRY như thế nào?

**Câu trả lời tiếng Việt**

> DRY nghĩa là không lặp cùng một business rule hoặc knowledge ở nhiều nơi. Tôi tách shared code khi các nơi đó luôn phải thay đổi cùng nhau. Tôi không xóa mọi dòng lặp; đôi khi một chút duplication rõ hơn một abstraction cố hỗ trợ các feature không liên quan.

### 3. What Makes a Component Too Large? [P0]

**Simple English answer**

> A component is too large when it has too many jobs. For example, it fetches data, manages several dialogs, defines a large table, handles business rules, and renders the whole page. I separate data and actions into hooks and split the UI into smaller parts with clear names.

**Câu hỏi tiếng Việt:** Khi nào một component quá lớn?

**Câu trả lời tiếng Việt**

> Component quá lớn khi nó có quá nhiều nhiệm vụ. Ví dụ, nó vừa fetch data, quản lý nhiều dialog, định nghĩa table lớn, xử lý business rule và render toàn page. Tôi tách data/action vào hook rồi chia UI thành các phần nhỏ có tên rõ ràng.

### 4. How Do You Avoid Prop Drilling? [P1]

**Simple English answer**

> First, I check whether the state is placed too high. Sometimes moving it closer or using component composition solves the problem. I use Context for one shared subtree and Zustand for state needed by separate components. I do not make state global only to avoid two simple props.

**Câu hỏi tiếng Việt:** Bạn tránh prop drilling như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi kiểm tra state có được đặt quá cao không. Đôi khi đưa state lại gần hoặc dùng component composition đã giải quyết được. Tôi dùng Context cho một subtree và Zustand cho state cần bởi nhiều component tách biệt. Tôi không biến state thành global chỉ để tránh hai prop đơn giản.

### 5. How Do SOLID Principles Apply to React? [P1]

**Simple English answer**

> I use the main ideas, not class patterns. A component or hook should have one clear reason to change. Feature code should depend on a clear service or hook API, not low-level transport details. Composition helps us add behavior without making one component full of conditions.

**Câu hỏi tiếng Việt:** SOLID được áp dụng vào React như thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng ý chính của SOLID chứ không ép class pattern. Component hoặc hook nên có một lý do thay đổi rõ ràng. Feature code nên phụ thuộc vào service/hook API rõ, không phụ thuộc transport detail. Composition giúp thêm behavior mà không làm một component chứa quá nhiều condition.

### 6. How Do You Enforce Type Safety? [P0]

**Simple English answer**

> I define types at API and component boundaries and reuse shared contracts. I prefer `unknown` with a type check instead of `any`. I avoid type assertions only used to silence an error. TypeScript checks compile-time code, but external API data may still need runtime validation.

**Câu hỏi tiếng Việt:** Bạn bảo đảm type safety như thế nào?

**Câu trả lời tiếng Việt**

> Tôi định nghĩa type tại API và component boundary rồi reuse shared contract. Tôi ưu tiên `unknown` kèm type check thay cho `any`. Tôi tránh type assertion chỉ để làm mất error. TypeScript kiểm tra lúc compile nhưng dữ liệu API bên ngoài vẫn có thể cần runtime validation.

### 7. How Do You Review a Pull Request? [P0]

**Simple English answer**

> I first check whether the change solves the correct requirement. Then I review security, data scope, state ownership, loading and error states, accessibility, performance, tests, and finally code style. For important behavior, I run the feature instead of only reading the diff. I explain why a problem matters.

**Câu hỏi tiếng Việt:** Bạn review pull request như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi kiểm tra change có giải đúng requirement không. Sau đó tôi review security, data scope, state ownership, loading/error state, accessibility, performance, test rồi mới đến code style. Với behavior quan trọng, tôi chạy feature thay vì chỉ đọc diff. Tôi giải thích vì sao một vấn đề quan trọng.

### 8. When Would You Refactor? [P0]

**Simple English answer**

> I refactor when the current code makes a needed change risky, repeated, or hard to test. I keep the refactor close to the feature I am changing. A large refactor needs clear evidence, such as repeated bugs or slow delivery. I use tests to keep the old behavior safe.

**Câu hỏi tiếng Việt:** Khi nào bạn refactor?

**Câu trả lời tiếng Việt**

> Tôi refactor khi code hiện tại làm change cần thiết trở nên rủi ro, lặp lại hoặc khó test. Tôi giữ refactor gần feature đang thay đổi. Refactor lớn cần evidence rõ như bug lặp hoặc delivery chậm. Tôi dùng test để bảo vệ behavior cũ.

## Testing / Kiểm Thử

### 9. What Is Your Frontend Testing Strategy? [P0]

**Simple English answer**

> I use unit tests for small functions and business rules. I use integration tests for components, hooks, API states, and user actions. I use a smaller number of E2E tests for critical flows such as login, ordering, and payment. I focus on risky behavior, not only a coverage number.

**Câu hỏi tiếng Việt:** Testing strategy frontend của bạn là gì?

**Câu trả lời tiếng Việt**

> Tôi dùng unit test cho function nhỏ và business rule. Tôi dùng integration test cho component, hook, API state và user action. Tôi dùng ít E2E test hơn cho critical flow như login, ordering và payment. Tôi tập trung vào behavior rủi ro chứ không chỉ coverage number.

### 10. What Is the Difference Between Unit, Integration, and E2E Tests? [P0]

**Simple English answer**

> A unit test checks one small function or rule. An integration test checks several parts working together, for example a component with TanStack Query and a mocked API. An E2E test uses the browser to check a complete user flow. E2E tests give confidence but cost more to maintain.

**Câu hỏi tiếng Việt:** Unit, integration và E2E test khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Unit test kiểm tra một function hoặc rule nhỏ. Integration test kiểm tra nhiều phần hoạt động cùng nhau, ví dụ component với TanStack Query và mocked API. E2E test dùng browser để kiểm tra user flow hoàn chỉnh. E2E cho confidence cao nhưng tốn công maintain hơn.

### 11. What Should You Test in a TanStack Query Mutation? [P0]

**Simple English answer**

> I test the request data, pending UI, successful cache update or invalidation, and user feedback. I also test errors. If the mutation is optimistic, I test the old snapshot, the temporary update, rollback, and final refetch. Each test uses its own QueryClient.

**Câu hỏi tiếng Việt:** Cần test gì trong TanStack Query mutation?

**Câu trả lời tiếng Việt**

> Tôi test request data, pending UI, cache update hoặc invalidation khi thành công và user feedback. Tôi cũng test error. Nếu mutation là optimistic, tôi test old snapshot, temporary update, rollback và final refetch. Mỗi test dùng QueryClient riêng.

### 12. How Do You Test Realtime Behavior? [P0]

**Simple English answer**

> I use a socket mock that I can control. I send matching and non-matching events and check that only the correct query changes. I also test reconnect, auth errors, cleanup after unmount, and identity changes. An event from another tenant must not update the current screen.

**Câu hỏi tiếng Việt:** Bạn test realtime behavior như thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng socket mock có thể điều khiển. Tôi gửi event matching và non-matching rồi kiểm tra chỉ đúng query thay đổi. Tôi cũng test reconnect, auth error, cleanup sau unmount và identity change. Event từ tenant khác không được update current screen.

### 13. What Makes a Test Brittle? [P1]

**Simple English answer**

> A test is brittle when it depends on internal details that users do not care about. Examples are exact hook call order, private state shape, fixed delays, or weak CSS selectors. I prefer user-visible behavior, accessible names, stable contracts, and proper waiting for async results.

**Câu hỏi tiếng Việt:** Điều gì làm một test dễ vỡ?

**Câu trả lời tiếng Việt**

> Test dễ vỡ khi phụ thuộc internal detail mà user không quan tâm. Ví dụ là exact hook call order, private state shape, fixed delay hoặc CSS selector yếu. Tôi ưu tiên user-visible behavior, accessible name, stable contract và cách đợi async result đúng.

### 14. How Much Test Coverage Is Enough? [P1]

**Simple English answer**

> Coverage is useful, but there is no perfect number for every project. I first cover payments, permissions, tenant scope, state changes, error recovery, and code that changes often. A high percentage can still miss the most important user risk.

**Câu hỏi tiếng Việt:** Test coverage bao nhiêu là đủ?

**Câu trả lời tiếng Việt**

> Coverage hữu ích nhưng không có một con số hoàn hảo cho mọi dự án. Tôi ưu tiên payment, permission, tenant scope, state change, error recovery và code hay thay đổi. Percentage cao vẫn có thể bỏ sót user risk quan trọng nhất.

## Debugging / Tìm và Sửa Lỗi

### 15. Describe Your Debugging Process [P0]

**Simple English answer**

> First, I reproduce the bug and record the exact steps. Then I check the UI event, component state, query cache, network request, and backend response. I form one idea about the cause and test it with a small experiment. After the fix, I test the original flow and related cases.

**Câu hỏi tiếng Việt:** Hãy mô tả quy trình debug của bạn.

**Câu trả lời tiếng Việt**

> Đầu tiên tôi reproduce bug và ghi lại exact steps. Sau đó tôi kiểm tra UI event, component state, query cache, network request và backend response. Tôi đưa ra một giả thuyết về nguyên nhân rồi test bằng experiment nhỏ. Sau khi sửa, tôi test flow ban đầu và các case liên quan.

### 16. A Page Renders Too Often. What Do You Do? [P0]

**Simple English answer**

> I use React DevTools Profiler to find which component renders and why. Then I check state placed too high, broad Context or store subscriptions, unstable props, and effects that update state. I fix the state ownership first. I add memoization only when measurement shows it helps.

**Câu hỏi tiếng Việt:** Page render quá nhiều; bạn làm gì?

**Câu trả lời tiếng Việt**

> Tôi dùng React DevTools Profiler để tìm component nào render và vì sao. Sau đó tôi kiểm tra state đặt quá cao, Context/store subscription quá rộng, unstable prop và effect update state. Tôi sửa state ownership trước và chỉ memoize khi kết quả đo cho thấy có ích.

### 17. A Page Is Slow. How Do You Diagnose It? [P0]

**Simple English answer**

> I separate the problem into network time, server time, bundle loading, JavaScript work, React rendering, layout, and images. Browser Network and Performance tools show where most time is spent. I fix the largest bottleneck first and measure again after the change.

**Câu hỏi tiếng Việt:** Page chậm; bạn chẩn đoán như thế nào?

**Câu trả lời tiếng Việt**

> Tôi tách vấn đề thành network time, server time, bundle loading, JavaScript work, React rendering, layout và image. Browser Network và Performance tool cho biết phần nào tốn nhiều thời gian nhất. Tôi sửa bottleneck lớn nhất trước rồi đo lại sau thay đổi.

### 18. The UI Shows Stale Data after a Mutation. What Do You Check? [P0]

**Simple English answer**

> I check whether the correct query key was updated or invalidated. I check that the key contains all filters and tenant scope. I also look for an old response, socket event, or optimistic update that may overwrite new data. I use Query Devtools and the Network panel instead of adding a timeout.

**Câu hỏi tiếng Việt:** UI hiện stale data sau mutation; bạn kiểm tra gì?

**Câu trả lời tiếng Việt**

> Tôi kiểm tra đúng query key đã được update hoặc invalidate chưa. Tôi kiểm tra key có đủ filter và tenant scope không. Tôi cũng tìm old response, socket event hoặc optimistic update có thể ghi đè dữ liệu mới. Tôi dùng Query Devtools và Network panel thay vì thêm timeout.

### 19. A Socket Event Fires Twice. What Do You Check? [P0]

**Simple English answer**

> I check whether two sockets exist, whether the component mounted twice in development, and whether cleanup removes the same handler that was added. I also check if the server sent the event twice. The handler should be safe for retries, but I still remove the duplicate source.

**Câu hỏi tiếng Việt:** Socket event chạy hai lần; bạn kiểm tra gì?

**Câu trả lời tiếng Việt**

> Tôi kiểm tra có hai socket không, component có mount hai lần trong development không và cleanup có remove đúng handler đã add không. Tôi cũng kiểm tra server có gửi event hai lần không. Handler nên an toàn khi retry nhưng tôi vẫn loại bỏ nguồn gây duplicate.

### 20. An Issue Happens Only in Production. What Do You Do? [P1]

**Simple English answer**

> I compare production with local and staging: environment variables, build mode, data size, permissions, cache, network, and feature flags. I use safe logs and error reports without private data. I reproduce the closest safe case, make the smallest fix, keep a rollback plan, and monitor the result.

**Câu hỏi tiếng Việt:** Lỗi chỉ xảy ra ở production; bạn làm gì?

**Câu trả lời tiếng Việt**

> Tôi so sánh production với local/staging về environment variable, build mode, data size, permission, cache, network và feature flag. Tôi dùng safe log và error report không chứa private data. Tôi reproduce case gần nhất, tạo fix nhỏ, có rollback plan rồi monitor kết quả.

## AI-Assisted Development / Làm Việc Với AI

### 21. How Do You Use Claude Code or Cursor? [P0]

**Simple English answer**

> I use AI to explore the repository, create a first draft, suggest tests, explain unfamiliar code, and compare solutions. I give it the requirement, project rules, relevant files, and acceptance checks. I ask for small changes, review every line, run tests, and keep responsibility for the result.

**Câu hỏi tiếng Việt:** Bạn dùng Claude Code hoặc Cursor như thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng AI để explore repository, tạo first draft, gợi ý test, giải thích code lạ và so sánh solution. Tôi cung cấp requirement, project rule, relevant file và acceptance check. Tôi yêu cầu change nhỏ, review từng phần, chạy test và chịu trách nhiệm cho kết quả.

### 22. How Do You Prompt AI for a Frontend Feature? [P0]

**Simple English answer**

> I explain the user goal, current code flow, API contract, state owner, design components, responsive behavior, accessibility, loading, errors, and files in scope. I ask AI to inspect existing patterns before writing code. I also give clear checks that must pass.

**Câu hỏi tiếng Việt:** Bạn prompt AI cho frontend feature như thế nào?

**Câu trả lời tiếng Việt**

> Tôi giải thích user goal, current code flow, API contract, state owner, design component, responsive behavior, accessibility, loading, error và file trong scope. Tôi yêu cầu AI kiểm tra existing pattern trước khi viết code và cung cấp các check rõ ràng phải pass.

### 23. What AI-Generated Mistakes Do You Expect? [P0]

**Simple English answer**

> AI may invent an API, use an old framework rule, duplicate an existing utility, put API data in local state, or add `'use client'` too high. It may also miss loading, errors, accessibility, cleanup, and edge cases. The code can look confident, so I verify it.

**Câu hỏi tiếng Việt:** AI-generated code thường có thể sai gì?

**Câu trả lời tiếng Việt**

> AI có thể bịa API, dùng framework rule cũ, duplicate utility đã có, đưa API data vào local state hoặc đặt `'use client'` quá cao. Nó cũng có thể thiếu loading, error, accessibility, cleanup và edge case. Code có thể nhìn rất tự tin nên tôi luôn verify.

### 24. How Do You Review AI-Generated Code? [P0]

**Simple English answer**

> First, I check that it solves the correct problem. Then I check file placement, types, state ownership, tenant scope, effects, cleanup, accessibility, performance, errors, and tests. I compare it with current project patterns and remove unnecessary code. I keep only code that I can explain.

**Câu hỏi tiếng Việt:** Bạn review AI-generated code như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi kiểm tra nó có giải đúng vấn đề không. Sau đó tôi kiểm tra file placement, type, state ownership, tenant scope, effect, cleanup, accessibility, performance, error và test. Tôi so với pattern hiện tại và xóa code không cần thiết. Tôi chỉ giữ code mình có thể giải thích.

### 25. What If AI Produces Working but Ugly Code? [P0]

**Simple English answer**

> A working happy path is only the first step. I look for repeated logic, mixed responsibilities, unclear state, missing error states, and missing tests. I refactor the feature in small steps and test again. The team still has to maintain the code after AI creates it.

**Câu hỏi tiếng Việt:** Nếu AI tạo code chạy được nhưng xấu thì sao?

**Câu trả lời tiếng Việt**

> Happy path chạy được chỉ là bước đầu. Tôi tìm logic lặp, mixed responsibility, state không rõ, error state thiếu và test thiếu. Tôi refactor feature theo các bước nhỏ rồi test lại. Team vẫn phải maintain code sau khi AI tạo ra nó.

### 26. Can AI Replace Frontend Fundamentals? [P0]

**Simple English answer**

> No. AI can write syntax quickly, but a developer must still choose the component structure, source of truth, Server and Client boundaries, accessibility, and performance trade-offs. Fundamentals help me see when generated code looks correct but is actually wrong.

**Câu hỏi tiếng Việt:** AI có thể thay thế frontend fundamentals không?

**Câu trả lời tiếng Việt**

> Không. AI có thể viết syntax nhanh nhưng developer vẫn phải chọn component structure, source of truth, Server/Client boundary, accessibility và performance trade-off. Fundamentals giúp tôi nhận ra khi generated code nhìn đúng nhưng thật ra sai.

## Behavioral Questions / Câu Hỏi Hành Vi

> Dùng khung đơn giản: **Situation → What I did → Result → What I learned**. Phần “What I did” phải dài nhất.

### 27. Tell Me About a Technical Challenge [P0]

**Simple English answer**

> One challenge in QRTable was making cart updates feel fast without overwriting newer data. We updated the UI before the API finished, but every request also included the cart version. If the request failed, we restored the old cart. If the version was old, we fetched the latest data. I learned that speed and data safety must work together.

**Câu hỏi tiếng Việt:** Hãy kể một technical challenge.

**Câu trả lời tiếng Việt**

> Một challenge trong QRTable là làm cart update nhanh nhưng không ghi đè dữ liệu mới hơn. Chúng tôi update UI trước khi API xong nhưng mỗi request còn gửi cart version. Nếu request lỗi, chúng tôi khôi phục cart cũ. Nếu version cũ, chúng tôi fetch dữ liệu mới nhất. Tôi học được rằng tốc độ và data safety phải đi cùng nhau.

**Ownership check:** Chỉ nói “I implemented” nếu Quân trực tiếp làm hook này; nếu không, dùng “we designed” hoặc “the project uses”.

### 28. Tell Me About a Bug You Solved [P0]

**Safe project-based answer**

> One problem was that an API query could start before the client had prepared the access token. The user had a valid session, but the request could still get a 401 error. We made the query wait until the token and profile were ready and added tests for that state. I learned that authentication has several loading steps.

**Câu hỏi tiếng Việt:** Hãy kể một bug bạn đã giải quyết.

**Câu trả lời tiếng Việt**

> Một vấn đề là API query có thể chạy trước khi client chuẩn bị xong access token. User có session hợp lệ nhưng request vẫn có thể nhận lỗi 401. Chúng tôi cho query đợi đến khi token và profile sẵn sàng rồi thêm test cho state đó. Tôi học được rằng authentication có nhiều bước loading.

**Ownership check:** Xác nhận Quân thật sự tham gia debug phần này trước khi kể là câu chuyện cá nhân.

### 29. Tell Me About a Time Requirements Were Unclear [P0]

**Simple English answer**

> In the freelance payroll project, some rules for salary, allowances, deductions, and payroll periods were not clear. I listed examples and edge cases and discussed them with the team before changing the UI and API. We separated confirmed rules from assumptions. This reduced rework and made testing clearer.

**Câu hỏi tiếng Việt:** Hãy kể khi requirement không rõ.

**Câu trả lời tiếng Việt**

> Trong freelance payroll, một số rule về salary, allowance, deduction và payroll period chưa rõ. Tôi liệt kê example và edge case rồi trao đổi với team trước khi thay đổi UI và API. Chúng tôi tách confirmed rule khỏi assumption. Điều này giảm rework và giúp testing rõ hơn.

### 30. Tell Me About Working under a Tight Deadline [P0]

**Simple English answer**

> Under a tight deadline, I first choose the most important user flow. I separate required work from optional polish and report risks early. I deliver one small complete flow for review, then add error states and visual polish in order. I prefer a smaller tested result to a large unfinished change.

**Câu hỏi tiếng Việt:** Hãy kể khi làm việc dưới deadline gấp.

**Câu trả lời tiếng Việt**

> Khi deadline gấp, đầu tiên tôi chọn user flow quan trọng nhất. Tôi tách required work khỏi optional polish và báo risk sớm. Tôi giao một flow nhỏ nhưng hoàn chỉnh để review rồi thêm error state và visual polish theo thứ tự. Tôi ưu tiên kết quả nhỏ đã test hơn change lớn chưa hoàn thành.

**Personalize:** Thêm một deadline thật từ GEEK Up, freelance hoặc thesis defense.

### 31. Tell Me About Receiving Critical Feedback [P0]

**Simple English answer**

> During my internship, I received feedback through GitLab merge requests. I first tried to understand the problem behind the comment, then changed the code and checked similar places. If I did not agree, I asked about the requirement and explained my reason. I learned to treat feedback as a way to improve the result, not as a personal attack.

**Câu hỏi tiếng Việt:** Hãy kể khi bạn nhận feedback khó.

**Câu trả lời tiếng Việt**

> Trong kỳ thực tập, tôi nhận feedback qua GitLab merge request. Đầu tiên tôi cố hiểu vấn đề phía sau comment, sau đó sửa code và kiểm tra các nơi tương tự. Nếu chưa đồng ý, tôi hỏi về requirement và giải thích lý do. Tôi học cách xem feedback là cách cải thiện kết quả chứ không phải công kích cá nhân.

**Personalize:** Thêm một review comment thật nếu còn nhớ; không tự bịa.

### 32. Tell Me About a Mistake or Failure [P0]

**Simple English answer**

> Earlier, I sometimes started coding before the API data and error states were clear. When the contract changed, I had to redo part of the UI. Now I write the user flow, source of truth, important states, and acceptance checks first. I still move quickly, but I remove important uncertainty before coding.

**Câu hỏi tiếng Việt:** Hãy kể một sai lầm hoặc thất bại.

**Câu trả lời tiếng Việt**

> Trước đây, đôi khi tôi bắt đầu code khi API data và error state chưa rõ. Khi contract thay đổi, tôi phải làm lại một phần UI. Hiện tại tôi viết user flow, source of truth, state quan trọng và acceptance check trước. Tôi vẫn làm nhanh nhưng loại bỏ uncertainty quan trọng trước khi code.

### 33. Tell Me About a Disagreement [P1]

**Simple English answer framework**

> We disagreed about […]. First, I restated our shared goal. Then we compared the options by delivery time, correctness, and maintenance cost. We chose […] because […]. After the decision, I supported it and documented the reason. I learned to discuss requirements and risks, not personal preference.

**Câu hỏi tiếng Việt:** Hãy kể một lần bạn bất đồng với teammate.

**Khung trả lời tiếng Việt**

> Chúng tôi bất đồng về […]. Đầu tiên, tôi nhắc lại mục tiêu chung. Sau đó, chúng tôi so sánh các option theo thời gian delivery, correctness và maintenance cost. Chúng tôi chọn […] vì […]. Sau khi quyết định, tôi ủng hộ và ghi lại lý do. Tôi học cách thảo luận requirement và risk thay vì sở thích cá nhân.

**Must personalize:** Điền một câu chuyện thật trước phỏng vấn.

### 34. How Do You Prioritize Multiple Tasks? [P0]

**Simple English answer**

> I look at user impact, deadline, dependencies, and risk. A production problem or a task blocking another developer comes before small visual polish. If two tasks have the same priority, I ask the owner instead of guessing. I also say clearly what cannot fit in the current time.

**Câu hỏi tiếng Việt:** Bạn ưu tiên nhiều task như thế nào?

**Câu trả lời tiếng Việt**

> Tôi xem user impact, deadline, dependency và risk. Production problem hoặc task đang block developer khác được ưu tiên trước visual polish nhỏ. Nếu hai task cùng priority, tôi hỏi owner thay vì tự đoán. Tôi cũng nói rõ phần nào không thể hoàn thành trong thời gian hiện tại.

### 35. What Do You Do When You Are Blocked? [P0]

**Simple English answer**

> I first define the exact blocker. I check the code, documentation, logs, and a small reproduction for a limited time. If I still need help, I explain what I tried, what I found, the impact, and one clear question. I continue other safe work when possible.

**Câu hỏi tiếng Việt:** Bạn làm gì khi bị block?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi xác định blocker chính xác. Tôi kiểm tra code, documentation, log và small reproduction trong thời gian giới hạn. Nếu vẫn cần giúp, tôi nói đã thử gì, tìm thấy gì, ảnh hưởng ra sao và đưa một câu hỏi rõ ràng. Tôi tiếp tục phần khác an toàn khi có thể.

### 36. How Do You Estimate a Frontend Task? [P1]

**Simple English answer**

> I split the task into requirement questions, UI states, API work, implementation, tests, review, and integration. I separate work I understand from unknown parts. If there is real uncertainty, I give a range. When new information appears, I update the estimate early.

**Câu hỏi tiếng Việt:** Bạn estimate frontend task như thế nào?

**Câu trả lời tiếng Việt**

> Tôi chia task thành requirement question, UI state, API work, implementation, test, review và integration. Tôi tách phần đã hiểu khỏi phần chưa rõ. Nếu có uncertainty thật, tôi đưa một khoảng thời gian. Khi có thông tin mới, tôi update estimate sớm.

### 37. How Do You Work in Scrum or Agile? [P0]

**Simple English answer**

> For me, Agile means getting feedback early and making problems visible. I clarify acceptance criteria, keep changes small enough to review, report blockers, and show working features. At GEEK Up, I worked with Scrum, daily communication, and GitLab merge requests.

**Câu hỏi tiếng Việt:** Bạn làm việc theo Scrum hoặc Agile như thế nào?

**Câu trả lời tiếng Việt**

> Với tôi, Agile nghĩa là nhận feedback sớm và làm problem visible. Tôi làm rõ acceptance criteria, giữ change đủ nhỏ để review, báo blocker và demo feature chạy được. Tại GEEK Up, tôi làm việc với Scrum, daily communication và GitLab merge request.

### 38. How Do You Balance Speed and Quality? [P0]

**Simple English answer**

> I never skip security, data correctness, important accessibility, or recoverable errors. For lower-risk visual polish, I can reduce scope or do it later. I use existing patterns, small changes, tools, and AI to move faster, but I still review and test the result.

**Câu hỏi tiếng Việt:** Bạn cân bằng tốc độ và chất lượng như thế nào?

**Câu trả lời tiếng Việt**

> Tôi không bỏ qua security, data correctness, accessibility quan trọng hoặc recoverable error. Với visual polish ít rủi ro hơn, tôi có thể giảm scope hoặc làm sau. Tôi dùng existing pattern, change nhỏ, tool và AI để nhanh hơn nhưng vẫn review và test kết quả.

### 39. How Do You Communicate with Backend Engineers? [P0]

**Simple English answer**

> I discuss the API as a clear contract: request data, user and tenant context, success response, error codes, state changes, and realtime events. When there is a problem, I share the real request and response. My backend knowledge helps me ask practical questions while still explaining frontend needs.

**Câu hỏi tiếng Việt:** Bạn giao tiếp với backend engineer như thế nào?

**Câu trả lời tiếng Việt**

> Tôi thảo luận API như một contract rõ ràng: request data, user/tenant context, success response, error code, state change và realtime event. Khi có vấn đề, tôi chia sẻ request và response thật. Kiến thức backend giúp tôi đặt câu hỏi thực tế trong khi vẫn giải thích frontend need.

### 40. How Do You Communicate with Designers? [P0]

**Simple English answer**

> I ask about the user goal, responsive behavior, long or empty content, component variants, and missing states. I share an early working version instead of waiting until the end. If a technical limit requires a change, I explain the problem and suggest options that keep the design goal.

**Câu hỏi tiếng Việt:** Bạn giao tiếp với designer như thế nào?

**Câu trả lời tiếng Việt**

> Tôi hỏi về user goal, responsive behavior, content dài hoặc rỗng, component variant và missing state. Tôi chia sẻ working version sớm thay vì đợi đến cuối. Nếu technical limit yêu cầu thay đổi, tôi giải thích vấn đề và đề xuất option vẫn giữ design goal.

## Story Preparation Checklist / Checklist Cá Nhân Hóa

- [ ] Một code-review comment thật tại GEEK Up.
- [ ] Một payroll requirement thật từng bị mơ hồ.
- [ ] Một frontend bug Quân trực tiếp debug trong QRTable.
- [ ] Một lần bất đồng thật với thesis teammate.
- [ ] Một deadline thật khiến Quân phải đổi scope hoặc priority.

Mỗi câu chuyện chỉ cần năm dòng: **Situation → Task → Action → Result → Learning**. Không có metric thật thì không tự tạo percentage.
