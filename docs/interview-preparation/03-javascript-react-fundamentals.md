# JavaScript and React Fundamentals / Nền Tảng JavaScript và React

> Core answers are intentionally compact. Add the deepening point only when the interviewer follows up.

## JavaScript and Browser

### 1. What Is a Closure? [P0]

**Core answer**

> A closure is a function together with access to the lexical variables from the scope where it was created, even after that outer function has finished. Closures are useful for encapsulation, callbacks, and hooks, but they can also keep stale values if a React dependency is missing.

**Example:** An event handler captures the state from the render that created it.

**Tiếng Việt:** Closure không phải chỉ là “function inside function”; điểm cốt lõi là function giữ được lexical environment.

**Câu hỏi tiếng Việt:** Closure là gì?

**Trả lời tiếng Việt**

> Closure là một function đi cùng khả năng truy cập các biến lexical tại scope nơi nó được tạo, kể cả sau khi outer function đã kết thúc. Closure hữu ích cho encapsulation, callback và hook, nhưng có thể giữ giá trị cũ trong React nếu dependency bị thiếu.

### 2. Explain the JavaScript Event Loop [P0]

**Core answer**

> JavaScript executes synchronous code on the call stack. Asynchronous browser or runtime operations schedule callbacks. Promise callbacks enter the microtask queue, while timers and many events enter task queues. After the current stack is empty, the runtime drains microtasks before moving to the next task, which is why a resolved Promise normally runs before a zero-delay timeout.

**Follow-up:** Too many microtasks can delay rendering or other tasks.

**Giải thích follow-up:** Quá nhiều microtasks có thể trì hoãn browser rendering hoặc các tasks khác.

**Câu hỏi tiếng Việt:** Hãy giải thích JavaScript event loop

**Trả lời tiếng Việt**

> JavaScript chạy code đồng bộ trên call stack. Browser/runtime operation bất đồng bộ sẽ xếp callback; Promise callback vào microtask queue, timer và nhiều event vào task queue. Khi stack trống, microtask được xử lý trước task tiếp theo nên resolved Promise thường chạy trước timeout 0 ms.

### 3. What Is the Difference Between `var`, `let`, and `const`? [P0]

**Core answer**

> `let` and `const` are block-scoped and have a temporal dead zone. `var` is function-scoped and its declaration is hoisted with an initial value of `undefined`. I use `const` by default, `let` when reassignment is required, and avoid `var` in modern code. `const` prevents rebinding; it does not make an object deeply immutable.

**Câu hỏi tiếng Việt:** `var`, `let` và `const` khác nhau thế nào?

**Trả lời tiếng Việt**

> `let` và `const` có block scope và temporal dead zone. `var` có function scope và declaration được hoist với giá trị `undefined`. Tôi dùng `const` mặc định, `let` khi cần gán lại và tránh `var`; `const` không làm object immutable sâu.

### 4. What Is the Difference Between `==` and `===`? [P0]

**Core answer**

> Strict equality compares without implicit type coercion, while loose equality applies coercion rules that can be surprising. I use `===` by default. A rare deliberate exception is checking `value == null` when I explicitly want to match both `null` and `undefined`, but the intent should be clear.

**Câu hỏi tiếng Việt:** `==` và `===` khác nhau thế nào?

**Trả lời tiếng Việt**

> Strict equality so sánh không ép kiểu, còn loose equality áp dụng coercion dễ gây bất ngờ. Tôi dùng `===` mặc định; ngoại lệ hiếm là `value == null` khi cố ý muốn khớp cả `null` và `undefined` và intent phải rõ.

### 5. How Does `this` Work in JavaScript? [P1]

**Core answer**

> For a normal function, `this` depends on how the function is called. Methods receive the object before the dot, and `call`, `apply`, or `bind` can set it explicitly. Arrow functions do not create their own `this`; they capture it lexically. That difference matters when passing methods as callbacks.

**Câu hỏi tiếng Việt:** `this` hoạt động thế nào trong JavaScript?

**Trả lời tiếng Việt**

> Với normal function, `this` phụ thuộc cách function được gọi; method nhận object trước dấu chấm và `call/apply/bind` có thể đặt rõ. Arrow function không có `this` riêng mà bắt từ lexical scope, điều này quan trọng khi truyền callback.

### 6. Classes Versus Prototypes [P1]

**Core answer**

> JavaScript inheritance is prototype-based. The `class` syntax provides a clearer abstraction over prototypes, constructor calls, and inheritance, but it does not introduce a separate class-based runtime model. In React application code I usually favor composition and small functions; classes are still appropriate for some domain models and current React Error Boundaries.

**Câu hỏi tiếng Việt:** Class và prototype khác nhau thế nào?

**Trả lời tiếng Việt**

> JavaScript có inheritance dựa trên prototype. Syntax `class` là abstraction rõ hơn cho prototype, constructor và inheritance chứ không tạo runtime class-based riêng. Trong React tôi thường ưu tiên composition/function; class vẫn phù hợp cho một số domain model và Error Boundary hiện tại.

### 7. Shallow Copy Versus Deep Copy [P0]

**Core answer**

> A shallow copy creates a new top-level object but keeps references to nested objects. Spread syntax is shallow. A deep copy recursively creates independent nested values, but it must respect types and semantics. I avoid blindly deep-cloning state; instead, I update only the changed path immutably.

**Câu hỏi tiếng Việt:** Shallow copy và deep copy khác nhau thế nào?

**Trả lời tiếng Việt**

> Shallow copy tạo object tầng trên mới nhưng giữ reference nested object; spread là shallow. Deep copy tạo nested values độc lập nhưng phải tôn trọng type/semantics. Tôi không deep clone state tùy tiện mà immutable update đúng path thay đổi.

### 8. Why Is Immutability Important in React? [P0]

**Core answer**

> React and state libraries commonly use reference identity to detect changes and optimize subscriptions. Immutable updates create a new reference for changed data while preserving unchanged references. Direct mutation can make updates invisible, break memoization, and make rollback or debugging harder.

**Câu hỏi tiếng Việt:** Vì sao immutability quan trọng trong React?

**Trả lời tiếng Việt**

> React và state library thường dùng reference identity để nhận biết change và tối ưu subscription. Immutable update tạo reference mới cho dữ liệu đổi, giữ reference cũ cho phần không đổi. Mutate trực tiếp có thể làm change bị bỏ qua, phá memoization và khiến rollback/debug khó hơn.

### 9. Promise Versus `async/await` [P0]

**Core answer**

> `async/await` is syntax built on Promises; it does not make asynchronous work synchronous. It usually makes sequential control flow and error handling easier to read. For independent operations, I start them together and use `Promise.all` so I do not create an unnecessary waterfall.

**Câu hỏi tiếng Việt:** Promise và `async/await` khác nhau thế nào?

**Trả lời tiếng Việt**

> `async/await` là syntax xây trên Promise, không biến async thành sync. Nó giúp đọc sequential flow và error handling dễ hơn. Với operation độc lập, tôi khởi chạy cùng lúc và dùng `Promise.all` để tránh waterfall không cần thiết.

### 10. `Promise.all` Versus `Promise.allSettled` [P1]

**Core answer**

> `Promise.all` rejects when any input rejects, so it fits operations that must all succeed. `Promise.allSettled` waits for every operation and reports each outcome, which fits independent results or partial failure. The choice comes from product semantics, not only convenience.

**Câu hỏi tiếng Việt:** `Promise.all` và `Promise.allSettled` khác nhau thế nào?

**Trả lời tiếng Việt**

> `Promise.all` reject khi bất kỳ input reject nên phù hợp khi tất cả phải thành công. `allSettled` đợi mọi operation và trả outcome riêng, phù hợp independent results hoặc partial failure. Chọn theo product semantics.

### 11. Debounce Versus Throttle [P0]

**Core answer**

> Debounce waits until calls stop for a period, so it is useful for search input or validation. Throttle limits execution to at most once per interval, so it is useful for scroll or resize work. Both need cleanup, and a request-producing debounce should also handle stale responses or cancellation.

**Câu hỏi tiếng Việt:** Debounce và throttle khác nhau thế nào?

**Trả lời tiếng Việt**

> Debounce đợi cho đến khi các lần gọi dừng một khoảng, phù hợp search/validation. Throttle giới hạn tối đa một lần mỗi interval, phù hợp scroll/resize. Cả hai cần cleanup; request debounce còn phải xử lý stale response hoặc cancellation.

### 12. What Causes Memory Leaks in Frontend Applications? [P1]

**Core answer**

> Common causes are subscriptions, timers, event listeners, observers, or asynchronous callbacks that outlive the component or retain large references. I prevent them by returning cleanup functions, cancelling obsolete work where possible, and verifying mount–unmount behavior. A leak is about retained resources, not simply high memory at one moment.

**Câu hỏi tiếng Việt:** Điều gì gây memory leak trong frontend?

**Trả lời tiếng Việt**

> Nguyên nhân thường là subscription, timer, listener, observer hoặc async callback sống lâu hơn component hay giữ reference lớn. Tôi ngăn bằng cleanup, cancel obsolete work và kiểm tra mount–unmount. Memory leak là resource bị giữ lại, không chỉ memory cao tại một thời điểm.

### 13. What Is CORS? [P0]

**Core answer**

> CORS is a browser-enforced policy controlling whether a page from one origin may read a response from another origin. The server declares allowed origins, methods, headers, and credentials. It is not an authentication mechanism and does not protect a server from non-browser clients.

**Câu hỏi tiếng Việt:** CORS là gì?

**Trả lời tiếng Việt**

> CORS là policy do browser enforce, kiểm soát trang ở một origin có được đọc response origin khác không. Server công bố origins, methods, headers và credentials được phép. Nó không phải authentication và không bảo vệ server khỏi non-browser clients.

### 14. `localStorage`, `sessionStorage`, Cookies, and Memory [P0]

**Core answer**

> `localStorage` persists across sessions and is synchronous; `sessionStorage` is scoped to a tab session. Both are accessible to JavaScript and should not hold sensitive tokens when an XSS-safe alternative exists. Cookies can be `HttpOnly`, `Secure`, and `SameSite` and are sent with matching requests. In-memory state disappears on reload but reduces persistence risk. The choice depends on security and lifecycle.

**Câu hỏi tiếng Việt:** `localStorage`, `sessionStorage`, cookie và memory khác nhau thế nào?

**Trả lời tiếng Việt**

> `localStorage` tồn tại qua nhiều session và synchronous; `sessionStorage` theo tab. Cả hai đọc được bằng JavaScript nên không nên chứa sensitive token nếu có giải pháp an toàn hơn. Cookie có thể HttpOnly/Secure/SameSite; memory mất khi reload nhưng giảm persistence risk. Chọn theo security và lifecycle.

### 15. What Happens After Entering a URL? [P1]

**Core answer**

> At a high level, the browser resolves the domain, establishes a network connection, sends an HTTP request, receives and parses the response, constructs the DOM and CSSOM, calculates layout, paints, and runs JavaScript. Modern frameworks can stream or hydrate HTML, so network, parsing, rendering, and JavaScript execution may overlap rather than form one strict sequence.

**Câu hỏi tiếng Việt:** Điều gì xảy ra sau khi nhập một URL?

**Trả lời tiếng Việt**

> Browser resolve domain, thiết lập connection, gửi HTTP request, nhận và parse response, tạo DOM/CSSOM, tính layout, paint và chạy JavaScript. Framework hiện đại có thể stream hoặc hydrate nên các bước network, parsing, rendering và execution có thể chồng lấp.

## React Mental Models

### 16. What Causes a React Component to Render? [P0]

**Core answer**

> A component renders initially and when its state, consumed context, or parent render causes React to evaluate it again. A render means React calls the component to calculate the next UI; it does not automatically mean every DOM node changes. React then commits only the required host updates.

**Câu hỏi tiếng Việt:** Điều gì làm React component render?

**Trả lời tiếng Việt**

> Component render lần đầu và khi state, context được dùng hoặc parent render khiến React tính lại nó. Render nghĩa là gọi component để tính UI kế tiếp, không có nghĩa mọi DOM node thay đổi; commit chỉ áp host updates cần thiết.

### 17. Rendering Versus Committing [P0]

**Core answer**

> During render, React calculates what the UI should look like. The render phase must stay pure because React may pause, restart, or repeat it. During commit, React applies changes to the DOM and runs layout-related effects. Keeping side effects out of render makes concurrent rendering safe.

**Câu hỏi tiếng Việt:** Render và commit khác nhau thế nào?

**Trả lời tiếng Việt**

> Trong render phase, React tính UI; phase này phải pure vì có thể pause/restart/repeat. Trong commit phase, React áp thay đổi DOM và chạy layout-related effects. Tách side effect khỏi render giúp concurrent rendering an toàn.

### 18. What Is Reconciliation? [P0]

**Core answer**

> Reconciliation is React’s process for comparing the previous and next element trees to determine which components and DOM nodes can be reused. Element type and key are important signals. It is an implementation strategy for updating the UI efficiently, not a guarantee that a component will never render again.

**Câu hỏi tiếng Việt:** Reconciliation là gì?

**Trả lời tiếng Việt**

> Reconciliation là quá trình React so sánh element tree cũ và mới để quyết định component/DOM nào reuse. Element type và key là tín hiệu quan trọng. Nó là chiến lược update UI hiệu quả, không bảo đảm component sẽ không render lại.

### 19. Why Are Keys Important? [P0]

**Core answer**

> Keys give sibling elements stable identity across renders. React uses them to preserve or reset component state correctly when items move, are added, or are removed. I use a stable domain identifier, not the array index when order can change. A random key forces remounting and loses state.

**Câu hỏi tiếng Việt:** Vì sao key quan trọng?

**Trả lời tiếng Việt**

> Key cho sibling identity ổn định qua render, giúp React giữ/reset state đúng khi item di chuyển, thêm hoặc xóa. Tôi dùng domain ID ổn định, không dùng index nếu order đổi; random key buộc remount và mất state.

### 20. Props Versus State [P0]

**Core answer**

> Props are inputs owned by a parent; state is memory owned by a component or external store. Both should be treated as immutable snapshots. I avoid copying props into state unless I intentionally need an editable draft, because duplicate sources of truth easily diverge.

**Câu hỏi tiếng Việt:** Props và state khác nhau thế nào?

**Trả lời tiếng Việt**

> Props là input do parent sở hữu; state là memory do component hoặc external store sở hữu. Cả hai được xem như immutable snapshots. Tôi tránh copy props vào state trừ khi cố ý tạo editable draft vì hai source có thể lệch nhau.

### 21. Controlled Versus Uncontrolled Components [P0]

**Core answer**

> A controlled input gets its current value from React state and reports changes through a handler. An uncontrolled input lets the DOM keep the current value and is read through a ref or form submission. Controlled inputs give explicit validation and coordination; uncontrolled inputs can reduce wiring for simple forms. Form libraries often combine both ideas.

**Câu hỏi tiếng Việt:** Controlled và uncontrolled component khác nhau thế nào?

**Trả lời tiếng Việt**

> Controlled input lấy value từ React state và báo change qua handler. Uncontrolled input để DOM giữ value và đọc qua ref/submission. Controlled cho validation/coordination rõ; uncontrolled giảm wiring cho form đơn giản; form library thường kết hợp hai cách.

### 22. What Is `useEffect` For? [P0]

**Core answer**

> `useEffect` synchronizes a component with an external system after a commit—for example a subscription, browser API, or non-React widget. It is not the default place for deriving data or handling every user action. If a value can be calculated during render, I calculate it; if work is caused by a click, I usually handle it in that event.

**Câu hỏi tiếng Việt:** `useEffect` dùng để làm gì?

**Trả lời tiếng Việt**

> `useEffect` đồng bộ component với external system sau commit, như subscription, browser API hoặc non-React widget. Nó không phải chỗ mặc định cho derived data hay mọi user action. Giá trị tính được thì tính trong render; work do click thì xử lý trong event.

### 23. How Do Effect Dependencies Work? [P0]

**Core answer**

> Every reactive value read by an effect belongs in its dependency list. The list describes the synchronization contract, not a manual scheduling preference. If adding a dependency causes a loop, I reconsider the effect, move event-specific logic, stabilize an input only when appropriate, or remove duplicated state instead of hiding the dependency.

**Câu hỏi tiếng Việt:** Effect dependencies hoạt động thế nào?

**Trả lời tiếng Việt**

> Mọi reactive value effect đọc phải nằm trong dependency list. List mô tả synchronization contract, không phải lịch chạy tùy ý. Nếu thêm dependency gây loop, cần xem lại effect, event logic, duplicated state hoặc input identity thay vì giấu dependency.

### 24. `useMemo`, `useCallback`, and `React.memo` [P0]

**Core answer**

> They are performance tools, not correctness tools. `useMemo` caches a calculated value, `useCallback` caches a function identity, and `React.memo` can skip a component render when props are equal. I use them after identifying a meaningful render or computation cost, especially when stable identity affects a memoized child or dependency. Overuse adds complexity and may provide no benefit.

**Câu hỏi tiếng Việt:** `useMemo`, `useCallback` và `React.memo` dùng khi nào?

**Trả lời tiếng Việt**

> Đây là performance tools, không phải correctness tools. `useMemo` cache value, `useCallback` cache function identity, `React.memo` có thể skip render khi props bằng nhau. Tôi chỉ dùng khi có cost rõ hoặc identity ảnh hưởng boundary; lạm dụng làm code phức tạp.

### 25. Local State, Context, and External Store [P0]

**Core answer**

> I keep state as close as possible to its owner. Local state fits one component or small subtree. Context fits scoped values needed by many descendants, especially when updates are not extremely frequent. An external store fits cross-tree client state that benefits from selectors and independent subscriptions. Remote server state belongs in a server-state library rather than being copied into a global UI store.

**Câu hỏi tiếng Việt:** Khi nào dùng local state, Context và external store?

**Trả lời tiếng Việt**

> Giữ state gần owner nhất. Local state cho component/subtree nhỏ; Context cho value có scope và update không quá thường xuyên; external store cho cross-tree client state cần selector/subscription độc lập. Remote server state nên ở server-state library.

### 26. Why Avoid Derived State? [P0]

**Core answer**

> If a value can be calculated from existing props or state, storing another copy creates synchronization work and possible contradictions. I derive it during render, memoizing only if the calculation is expensive. State should represent information that cannot be derived from another current source of truth.

**Câu hỏi tiếng Việt:** Vì sao nên tránh derived state dư thừa?

**Trả lời tiếng Việt**

> Nếu giá trị tính được từ props/state hiện có, lưu thêm một bản tạo synchronization work và contradiction. Tôi tính trong render, chỉ memoize nếu calculation đắt. State chỉ nên chứa thông tin không thể derive từ source hiện tại.

### 27. What Is Lifting State Up? [P0]

**Core answer**

> Lifting state means moving shared state to the closest common owner so multiple components receive a consistent value and actions. I do not automatically move it to a global store; the correct owner is the smallest boundary that needs to coordinate it.

**Câu hỏi tiếng Việt:** Lifting state up là gì?

**Trả lời tiếng Việt**

> Là chuyển shared state lên closest common owner để nhiều component nhận cùng value/action. Không có nghĩa đưa lên global store; owner đúng là boundary nhỏ nhất cần phối hợp.

### 28. What Are Error Boundaries? [P1]

**Core answer**

> Error Boundaries catch rendering and lifecycle errors below them and show a fallback instead of losing the entire interface. They do not replace API error handling and do not catch every event-handler or asynchronous error automatically. I place them around meaningful product regions and provide recovery or retry behavior.

**Câu hỏi tiếng Việt:** Error Boundary là gì?

**Trả lời tiếng Việt**

> Error Boundary bắt rendering/lifecycle errors phía dưới và hiển thị fallback thay vì mất toàn giao diện. Nó không thay API error handling và không tự bắt mọi event-handler/async error. Tôi đặt quanh product regions có ý nghĩa và cung cấp recovery/retry.

### 29. How Do You Optimize React Rendering? [P0]

**Core answer**

> I measure or inspect the actual render path first. Then I reduce unnecessary state, colocate it, split large components, subscribe to the smallest store slice, keep list keys stable, virtualize genuinely large lists, and memoize only expensive or identity-sensitive boundaries. Network waterfalls and oversized client bundles can matter more than a small component rerender, so I optimize the whole user path.

**Câu hỏi tiếng Việt:** Bạn tối ưu React rendering thế nào?

**Trả lời tiếng Việt**

> Tôi đo hoặc inspect render path trước. Sau đó giảm state dư, colocate state, chia component lớn, subscribe store slice nhỏ, giữ key ổn định, virtualize list thật sự lớn và memoize boundary có chi phí. Network waterfall và client bundle đôi khi quan trọng hơn rerender nhỏ.

### 30. How Do You Design a Reusable Component? [P0]

**Core answer**

> I start from a repeated semantic behavior, not visual similarity alone. A reusable component should have one clear responsibility, typed inputs, accessible defaults, composable slots or children, and controlled escape hatches. I avoid a large component with many boolean props because it hides multiple components behind one API. I extract only after the repeated contract is understood.

**Câu hỏi tiếng Việt:** Bạn thiết kế reusable component thế nào?

**Trả lời tiếng Việt**

> Tôi bắt đầu từ semantic behavior lặp lại, không chỉ visual giống nhau. Component cần responsibility rõ, typed inputs, accessible defaults, composable slots/children và escape hatch có kiểm soát. Tôi tránh component nhiều boolean props và chỉ extract khi contract lặp đã rõ.

## Quick Drills / Bài Luyện Nhanh

Answer each in one sentence:

1. Why is state a snapshot?  
   Because each render and its closures observe the state values associated with that render.
   **Tiếng Việt:** Vì sao state là snapshot? Vì mỗi render và closure của nó quan sát state values thuộc về render đó.
2. Why not use array index as a key?  
   Reordering can attach existing component state to the wrong item.
   **Tiếng Việt:** Vì sao không dùng array index làm key? Reorder có thể gắn state component cũ vào sai item.
3. Why can an effect loop?  
   It updates a reactive value that changes one of its own dependencies.
   **Tiếng Việt:** Vì sao effect có thể loop? Nó update một reactive value đồng thời làm dependency của chính effect thay đổi.
4. Why not memoize everything?  
   Memoization has comparison, memory, and maintenance cost and may not avoid meaningful work.
   **Tiếng Việt:** Vì sao không memoize mọi thứ? Memoization có chi phí comparison, memory, maintenance và có thể không tránh meaningful work.
5. What is the safest default for state ownership?  
   Keep one source of truth at the closest boundary that needs it.
   **Tiếng Việt:** Mặc định an toàn cho state ownership là gì? Giữ một source of truth tại boundary gần nhất cần sở hữu nó.

## Sources / Nguồn

- [React documentation](https://react.dev/learn)
- [MDN JavaScript guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [MDN event loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
