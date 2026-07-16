# JavaScript and React Fundamentals — Simple Answers / Kiến Thức Nền Tảng Dễ Nói

> Hãy hiểu ví dụ trước rồi mới nhớ định nghĩa. Khi trả lời, nói ý chính trong câu đầu và chỉ giải thích thêm một ví dụ.

## JavaScript Fundamentals / Nền Tảng JavaScript

### 1. What Is a Closure? [P0]

**Simple English answer**

> A closure happens when a function remembers variables from the place where it was created. It can still use those variables after the outer function has finished. Closures are useful for callbacks and private state. In React, they can also cause stale values if dependencies are missing.

**Câu hỏi tiếng Việt:** Closure là gì?

**Câu trả lời tiếng Việt**

> Closure xảy ra khi một function ghi nhớ các biến ở nơi nó được tạo. Function vẫn có thể dùng các biến đó sau khi outer function đã chạy xong. Closure hữu ích cho callback và state riêng, nhưng trong React nó có thể giữ giá trị cũ nếu thiếu dependency.

### 2. Explain the JavaScript Event Loop [P0]

**Simple English answer**

> JavaScript runs normal code on one call stack. Async work, such as a timer or network request, finishes outside that stack and puts a callback in a queue. When the stack is empty, JavaScript runs queued work. Promise callbacks normally run before timer callbacks.

**Câu hỏi tiếng Việt:** Hãy giải thích JavaScript event loop.

**Câu trả lời tiếng Việt**

> JavaScript chạy code thông thường trên một call stack. Công việc async như timer hoặc network request hoàn thành bên ngoài stack rồi đưa callback vào queue. Khi stack trống, JavaScript xử lý công việc trong queue. Callback của Promise thường chạy trước callback của timer.

**Easy follow-up:** Too many Promise microtasks can delay browser rendering.

**Giải thích:** Quá nhiều Promise microtask có thể làm browser chậm render giao diện.

### 3. What Is the Difference Between `var`, `let`, and `const`? [P0]

**Simple English answer**

> `var` is function-scoped and has older hoisting behavior, so it can cause confusing bugs. `let` and `const` are block-scoped. I use `const` by default and `let` when a variable must be assigned again. `const` does not make an object fully immutable.

**Câu hỏi tiếng Việt:** `var`, `let` và `const` khác nhau thế nào?

**Câu trả lời tiếng Việt**

> `var` có function scope và cách hoisting cũ nên dễ gây lỗi khó hiểu. `let` và `const` có block scope. Tôi dùng `const` mặc định và dùng `let` khi cần gán lại biến. `const` không làm cho object trở thành bất biến hoàn toàn.

### 4. What Is the Difference Between `==` and `===`? [P0]

**Simple English answer**

> `==` can change the types before comparing two values. `===` compares both the type and the value without that conversion. I use `===` in normal application code because its behavior is clearer and safer.

**Câu hỏi tiếng Việt:** `==` và `===` khác nhau thế nào?

**Câu trả lời tiếng Việt**

> `==` có thể chuyển đổi type trước khi so sánh hai giá trị. `===` so sánh cả type và value mà không thực hiện chuyển đổi đó. Tôi dùng `===` trong code thông thường vì behavior rõ ràng và an toàn hơn.

### 5. How Does `this` Work in JavaScript? [P1]

**Simple English answer**

> For a normal function, `this` mainly depends on how the function is called. In a method call, it is usually the object before the dot. An arrow function does not create its own `this`; it uses `this` from the outer scope.

**Câu hỏi tiếng Việt:** `this` hoạt động thế nào trong JavaScript?

**Câu trả lời tiếng Việt**

> Với normal function, `this` chủ yếu phụ thuộc vào cách function được gọi. Khi gọi method, nó thường là object đứng trước dấu chấm. Arrow function không tạo `this` riêng mà dùng `this` từ outer scope.

### 6. Classes Versus Prototypes [P1]

**Simple English answer**

> JavaScript uses prototypes for inheritance. The `class` syntax gives us a cleaner way to write the same object model. Methods written in a class are shared through the prototype. I normally use classes when they make the code clearer, but I know the prototype is still underneath.

**Câu hỏi tiếng Việt:** Class và prototype trong JavaScript khác nhau thế nào?

**Câu trả lời tiếng Việt**

> JavaScript dùng prototype cho inheritance. Cú pháp `class` là cách dễ đọc hơn để viết cùng object model đó. Method trong class vẫn được chia sẻ qua prototype. Tôi dùng class khi nó giúp code rõ hơn nhưng hiểu rằng bên dưới vẫn là prototype.

### 7. Shallow Copy Versus Deep Copy [P0]

**Simple English answer**

> A shallow copy creates a new top-level object, but nested objects can still point to the old references. A deep copy also copies the nested data. The spread operator makes only a shallow copy. For supported data, `structuredClone` can make a deep copy.

**Câu hỏi tiếng Việt:** Shallow copy và deep copy khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Shallow copy tạo object mới ở cấp ngoài cùng, nhưng các object bên trong vẫn có thể trỏ đến reference cũ. Deep copy sao chép cả dữ liệu bên trong. Spread operator chỉ tạo shallow copy. Với dữ liệu được hỗ trợ, `structuredClone` có thể tạo deep copy.

### 8. Why Is Immutability Important in React? [P0]

**Simple English answer**

> React often checks whether a reference changed to know that state has new data. If I mutate the old object directly, React or memoized code may not see the change correctly. I create a new object or array when updating state. This also makes updates easier to understand.

**Câu hỏi tiếng Việt:** Vì sao immutability quan trọng trong React?

**Câu trả lời tiếng Việt**

> React thường kiểm tra reference có thay đổi không để biết state có dữ liệu mới. Nếu tôi sửa trực tiếp object cũ, React hoặc code đã memoize có thể không nhận ra thay đổi đúng cách. Vì vậy, khi update state tôi tạo object hoặc array mới. Cách này cũng dễ hiểu hơn.

### 9. Promise Versus `async/await` [P0]

**Simple English answer**

> A Promise represents a result that may arrive later. `async/await` is a cleaner way to write code that uses Promises. It does not make the work synchronous. I use `try/catch` with `await` when I need clear error handling.

**Câu hỏi tiếng Việt:** Promise và `async/await` khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Promise đại diện cho một kết quả có thể có trong tương lai. `async/await` là cách dễ đọc hơn để viết code dùng Promise. Nó không biến công việc thành synchronous. Tôi dùng `try/catch` với `await` khi cần xử lý lỗi rõ ràng.

### 10. `Promise.all` Versus `Promise.allSettled` [P1]

**Simple English answer**

> `Promise.all` runs Promises together but rejects when one of them rejects. I use it when all results are required. `Promise.allSettled` waits for every Promise and tells me which ones passed or failed. I use it when partial results are still useful.

**Câu hỏi tiếng Việt:** `Promise.all` và `Promise.allSettled` khác nhau thế nào?

**Câu trả lời tiếng Việt**

> `Promise.all` chạy các Promise cùng nhau nhưng reject khi một Promise bị lỗi. Tôi dùng nó khi cần đủ tất cả kết quả. `Promise.allSettled` đợi mọi Promise và cho biết cái nào thành công hoặc thất bại. Tôi dùng khi kết quả một phần vẫn có ích.

### 11. Debounce Versus Throttle [P0]

**Simple English answer**

> Debounce waits until events stop for a short time, then runs once. It is useful for a search input. Throttle allows a function to run at most once in a time period. It is useful for scroll or resize events.

**Câu hỏi tiếng Việt:** Debounce và throttle khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Debounce đợi event dừng trong một khoảng ngắn rồi mới chạy một lần, phù hợp cho ô search. Throttle giới hạn function chỉ được chạy tối đa một lần trong mỗi khoảng thời gian, phù hợp cho scroll hoặc resize event.

### 12. What Causes Memory Leaks in Frontend Applications? [P1]

**Simple English answer**

> Common causes are event listeners, timers, socket listeners, or subscriptions that are not cleaned up. Large caches and old object references can also keep memory. In React, I return a cleanup function from `useEffect` and check that I remove the exact listener I added.

**Câu hỏi tiếng Việt:** Điều gì gây memory leak trong frontend application?

**Câu trả lời tiếng Việt**

> Nguyên nhân thường gặp là event listener, timer, socket listener hoặc subscription không được cleanup. Cache lớn và reference cũ cũng có thể giữ memory. Trong React, tôi trả về cleanup function từ `useEffect` và bảo đảm xóa đúng listener đã thêm.

### 13. What Is CORS? [P0]

**Simple English answer**

> CORS is a browser security rule for requests between different origins. The server must return the correct CORS headers to allow the frontend origin. It is mainly a browser rule, so changing frontend code alone usually cannot fix a missing server permission.

**Câu hỏi tiếng Việt:** CORS là gì?

**Câu trả lời tiếng Việt**

> CORS là quy tắc bảo mật của browser cho request giữa các origin khác nhau. Server phải trả đúng CORS header để cho phép frontend origin. Đây chủ yếu là quy tắc của browser nên chỉ sửa frontend thường không thể giải quyết permission bị thiếu ở server.

### 14. Compare `localStorage`, `sessionStorage`, Cookies, and Memory [P0]

**Simple English answer**

> `localStorage` stays after the browser closes. `sessionStorage` normally stays only for one tab session. Cookies can be sent with HTTP requests and can be `HttpOnly`. Memory state disappears after a reload. For sensitive tokens, an `HttpOnly` secure cookie is usually safer than browser storage.

**Câu hỏi tiếng Việt:** `localStorage`, `sessionStorage`, cookie và memory khác nhau thế nào?

**Câu trả lời tiếng Việt**

> `localStorage` vẫn còn sau khi đóng browser. `sessionStorage` thường chỉ tồn tại trong session của một tab. Cookie có thể được gửi cùng HTTP request và có thể đặt `HttpOnly`. State trong memory mất sau khi reload. Với token nhạy cảm, secure cookie `HttpOnly` thường an toàn hơn browser storage.

### 15. What Happens After You Enter a URL? [P1]

**Simple English answer**

> The browser finds the server address with DNS, opens a network connection, and sends an HTTP request. The server returns HTML and other data. The browser reads the HTML, downloads CSS and JavaScript, builds the page, and paints it. React may then hydrate the server HTML.

**Câu hỏi tiếng Việt:** Điều gì xảy ra sau khi bạn nhập một URL?

**Câu trả lời tiếng Việt**

> Browser tìm địa chỉ server qua DNS, mở network connection rồi gửi HTTP request. Server trả HTML và dữ liệu khác. Browser đọc HTML, tải CSS và JavaScript, dựng page rồi vẽ nó lên màn hình. Sau đó React có thể hydrate HTML từ server.

## React Fundamentals / Nền Tảng React

### 16. What Causes a React Component to Render? [P0]

**Simple English answer**

> A component renders when its state changes, its props change, a context it uses changes, or an external store sends an update. It may also render when its parent renders. A render does not always mean the browser DOM will change.

**Câu hỏi tiếng Việt:** Điều gì làm React component render lại?

**Câu trả lời tiếng Việt**

> Component render khi state đổi, props đổi, context nó sử dụng đổi hoặc external store gửi update. Nó cũng có thể render khi parent render. Một lần render không phải lúc nào cũng làm browser DOM thay đổi.

### 17. Rendering Versus Committing [P0]

**Simple English answer**

> During rendering, React calls components and calculates what the UI should look like. During the commit step, React applies the required changes to the DOM. Keeping render logic pure is important because React may run it more than once.

**Câu hỏi tiếng Việt:** Rendering và committing khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Trong bước render, React gọi component và tính UI nên trông thế nào. Trong bước commit, React áp dụng những thay đổi cần thiết vào DOM. Render logic phải pure vì React có thể chạy nó nhiều hơn một lần.

### 18. What Is Reconciliation? [P0]

**Simple English answer**

> Reconciliation is how React compares the new element tree with the previous tree. It uses the element type and key to decide what can stay and what must change. The goal is to update only the necessary parts of the DOM.

**Câu hỏi tiếng Việt:** Reconciliation là gì?

**Câu trả lời tiếng Việt**

> Reconciliation là cách React so sánh element tree mới với tree trước đó. React dùng element type và key để quyết định phần nào được giữ và phần nào phải thay đổi. Mục tiêu là chỉ cập nhật những phần DOM cần thiết.

### 19. Why Are Keys Important? [P0]

**Simple English answer**

> Keys give list items a stable identity between renders. This helps React match the old item with the new item. I use a stable database ID when possible. An array index can cause wrong state or UI when items are added, removed, or reordered.

**Câu hỏi tiếng Việt:** Vì sao key quan trọng trong React?

**Câu trả lời tiếng Việt**

> Key cho mỗi item trong list một identity ổn định giữa các lần render. Nó giúp React ghép đúng item cũ với item mới. Tôi dùng database ID ổn định khi có thể. Dùng array index có thể gây sai state hoặc UI khi thêm, xóa hoặc đổi thứ tự item.

### 20. Props Versus State [P0]

**Simple English answer**

> Props are inputs passed from a parent component. State is data owned and changed by a component or store. Props should not be changed by the child. When several components need the same state, I move it to the closest common owner.

**Câu hỏi tiếng Việt:** Props và state khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Props là input được truyền từ parent component. State là dữ liệu do component hoặc store sở hữu và thay đổi. Child không nên sửa props. Khi nhiều component cần cùng state, tôi chuyển state đến owner chung gần nhất.

### 21. Controlled Versus Uncontrolled Components [P0]

**Simple English answer**

> A controlled input gets its value from React state and updates through a handler. An uncontrolled input keeps its value in the DOM and is usually read with a ref or form submit. Controlled inputs give more control. Uncontrolled inputs can be simpler for basic forms.

**Câu hỏi tiếng Việt:** Controlled và uncontrolled component khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Controlled input lấy value từ React state và update qua handler. Uncontrolled input giữ value trong DOM và thường được đọc bằng ref hoặc lúc submit form. Controlled input cho nhiều quyền kiểm soát hơn; uncontrolled input có thể đơn giản hơn cho form cơ bản.

### 22. What Is `useEffect` For? [P0]

**Simple English answer**

> `useEffect` is for synchronizing a component with something outside React, such as a socket, timer, browser API, or manual subscription. It is not needed for normal calculations from props or state. For API server state, I usually prefer TanStack Query instead of a manual fetch effect.

**Câu hỏi tiếng Việt:** `useEffect` dùng để làm gì?

**Câu trả lời tiếng Việt**

> `useEffect` dùng để đồng bộ component với thứ bên ngoài React như socket, timer, browser API hoặc manual subscription. Không cần dùng nó cho phép tính thông thường từ props hoặc state. Với server state từ API, tôi thường ưu tiên TanStack Query thay vì tự fetch trong effect.

### 23. How Do Effect Dependencies Work? [P0]

**Simple English answer**

> The dependency list contains values used by the effect that can change between renders. When one changes, React runs the effect again. Missing a dependency can make the effect use an old value. I fix the code structure instead of hiding the lint warning.

**Câu hỏi tiếng Việt:** Dependency của effect hoạt động thế nào?

**Câu trả lời tiếng Việt**

> Dependency list chứa những value mà effect sử dụng và có thể thay đổi giữa các lần render. Khi một value đổi, React chạy lại effect. Thiếu dependency có thể làm effect dùng giá trị cũ. Tôi sửa cấu trúc code thay vì ẩn lint warning.

### 24. Explain `useMemo`, `useCallback`, and `React.memo` [P0]

**Simple English answer**

> `useMemo` remembers a calculated value. `useCallback` remembers a function reference. `React.memo` can skip a child render when its props are unchanged. I use them only when there is a measured problem, because unnecessary memoization also makes code harder to read.

**Câu hỏi tiếng Việt:** `useMemo`, `useCallback` và `React.memo` dùng để làm gì?

**Câu trả lời tiếng Việt**

> `useMemo` ghi nhớ một giá trị đã tính. `useCallback` giữ ổn định function reference. `React.memo` có thể bỏ qua child render khi props không đổi. Tôi chỉ dùng chúng khi có vấn đề đã đo được vì memoization không cần thiết cũng làm code khó đọc hơn.

### 25. Local State, Context, and External Store [P0]

**Simple English answer**

> I keep state local when only one small area needs it. I use Context for simple state shared inside one part of the tree. I use an external store such as Zustand when many separate components need the same client state or actions. I use TanStack Query for API data.

**Câu hỏi tiếng Việt:** Khi nào dùng local state, Context và external store?

**Câu trả lời tiếng Việt**

> Tôi giữ state local khi chỉ một khu vực nhỏ cần nó. Tôi dùng Context cho state đơn giản được chia sẻ trong một phần component tree. Tôi dùng external store như Zustand khi nhiều component tách biệt cần cùng client state hoặc action. Tôi dùng TanStack Query cho dữ liệu API.

### 26. Why Should You Avoid Derived State? [P0]

**Simple English answer**

> If a value can be calculated from current props or state, I usually calculate it during render. Saving the same information in another state creates two sources of truth. They can become different and cause bugs. I only store it when there is a real reason.

**Câu hỏi tiếng Việt:** Vì sao nên tránh derived state không cần thiết?

**Câu trả lời tiếng Việt**

> Nếu một value có thể tính từ props hoặc state hiện tại, tôi thường tính nó trong lúc render. Lưu cùng thông tin vào một state khác sẽ tạo hai source of truth. Chúng có thể lệch nhau và gây bug. Tôi chỉ lưu riêng khi có lý do thật sự.

### 27. What Is Lifting State Up? [P0]

**Simple English answer**

> Lifting state up means moving shared state to the closest parent that needs to coordinate its children. The parent owns the value and passes data and handlers down. I do not move state higher than needed because that can cause extra complexity and renders.

**Câu hỏi tiếng Việt:** Lifting state up là gì?

**Câu trả lời tiếng Việt**

> Lifting state up là chuyển shared state lên parent gần nhất cần phối hợp các child. Parent sở hữu value rồi truyền data và handler xuống. Tôi không đưa state lên cao hơn mức cần thiết vì có thể làm code phức tạp và render nhiều hơn.

### 28. What Are Error Boundaries? [P1]

**Simple English answer**

> An Error Boundary catches rendering errors in child components and shows fallback UI instead of breaking the whole screen. It does not catch every error, such as an error inside an event handler. In Next.js App Router, `error.tsx` gives us a route-level error boundary.

**Câu hỏi tiếng Việt:** Error Boundary là gì?

**Câu trả lời tiếng Việt**

> Error Boundary bắt lỗi render trong child component và hiện fallback UI thay vì làm hỏng toàn bộ màn hình. Nó không bắt mọi loại lỗi, ví dụ lỗi bên trong event handler. Trong Next.js App Router, `error.tsx` cung cấp error boundary ở mức route.

### 29. How Do You Optimize React Rendering? [P0]

**Simple English answer**

> I measure first with React DevTools or the browser profiler. Then I keep state close to where it is used, split large components, avoid unnecessary effects, and use stable keys. I add memoization or list virtualization only when the measurement shows that they help.

**Câu hỏi tiếng Việt:** Bạn tối ưu React rendering như thế nào?

**Câu trả lời tiếng Việt**

> Trước tiên tôi đo bằng React DevTools hoặc browser profiler. Sau đó tôi giữ state gần nơi sử dụng, tách component lớn, tránh effect không cần thiết và dùng key ổn định. Tôi chỉ thêm memoization hoặc list virtualization khi kết quả đo cho thấy chúng có ích.

### 30. How Do You Design a Reusable Component? [P0]

**Simple English answer**

> A reusable component should have one clear job and a small, clear API. I prefer composition, such as `children` or small slots, instead of many boolean props. I also support accessibility and the important states. I only extract a shared component when there is real repeated use.

**Câu hỏi tiếng Việt:** Bạn thiết kế reusable component như thế nào?

**Câu trả lời tiếng Việt**

> Reusable component nên có một nhiệm vụ rõ ràng và API nhỏ, dễ hiểu. Tôi ưu tiên composition như `children` hoặc các slot nhỏ thay vì quá nhiều boolean prop. Tôi cũng hỗ trợ accessibility và các state quan trọng. Tôi chỉ tách shared component khi thật sự có nhu cầu dùng lặp lại.

## Quick Drills / Câu Hỏi Nhanh

### Why can using an array index as a key be dangerous?

> If the list order changes, React may connect the old state to the wrong item. I use a stable item ID when possible.

**Tiếng Việt:** Nếu thứ tự list đổi, React có thể gắn state cũ vào sai item. Tôi dùng ID ổn định khi có thể.

### Why can fetching inside `useEffect` be a problem?

> A manual effect needs extra work for loading, errors, race conditions, caching, and refetching. For API state, TanStack Query or server fetching usually handles these problems better.

**Tiếng Việt:** Manual effect cần tự xử lý loading, error, race condition, cache và refetch. Với API state, TanStack Query hoặc server fetching thường xử lý tốt hơn.

### Why should a state update use a new object?

> React often depends on a new reference to detect a change. Mutating the old object can make the update hard to detect and understand.

**Tiếng Việt:** React thường dựa vào reference mới để phát hiện thay đổi. Sửa trực tiếp object cũ có thể làm update khó được nhận ra và khó hiểu.
