# State, TanStack Query, and TanStack Table — Simple Answers

> Đây là phần rất sát JD. Khi trả lời, luôn bắt đầu bằng việc xác định **ai sở hữu dữ liệu**: component, URL, client store hay server/API.

## State Management / Quản Lý State

### 1. How Do You Classify Frontend State? [P0]

**Simple English answer**

> I divide state into four main groups. Local UI state belongs to one component. Shared UI state may use Context or Zustand. URL state is for shareable filters or pages. Server state comes from an API and belongs in TanStack Query. This prevents one store from owning everything.

**Câu hỏi tiếng Việt:** Bạn phân loại frontend state như thế nào?

**Câu trả lời tiếng Việt**

> Tôi chia state thành bốn nhóm chính. Local UI state thuộc một component. Shared UI state có thể dùng Context hoặc Zustand. URL state dùng cho filter hoặc page có thể chia sẻ. Server state đến từ API và nên nằm trong TanStack Query. Cách này tránh một store quản lý tất cả mọi thứ.

### 2. Why Not Put Everything in Zustand? [P0]

**Simple English answer**

> Zustand is good for client-owned state, but API data has a different lifecycle. It needs fetching, caching, stale rules, retries, and invalidation. TanStack Query already solves those problems. Copying API data into Zustand creates two sources of truth and can make data stale.

**Câu hỏi tiếng Việt:** Vì sao không đưa tất cả state vào Zustand?

**Câu trả lời tiếng Việt**

> Zustand phù hợp cho state do client sở hữu, nhưng dữ liệu API có lifecycle khác. Nó cần fetching, caching, quy tắc stale, retry và invalidation. TanStack Query đã xử lý các vấn đề đó. Copy dữ liệu API sang Zustand tạo hai source of truth và dễ làm dữ liệu bị cũ.

### 3. Context Versus Zustand [P0]

**Simple English answer**

> I use Context for simple state shared inside one part of the component tree, especially when updates are not frequent. I use Zustand when separate components need the same client state, actions, and smaller subscriptions. I choose based on the problem, not because one tool is always better.

**Câu hỏi tiếng Việt:** Context và Zustand khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng Context cho state đơn giản được chia sẻ trong một phần component tree, nhất là khi không update thường xuyên. Tôi dùng Zustand khi nhiều component tách biệt cần cùng client state, action và subscription nhỏ hơn. Tôi chọn theo bài toán chứ không xem một tool luôn tốt hơn.

### 4. When Should State Live in the URL? [P0]

**Simple English answer**

> State should live in the URL when users may refresh, bookmark, share, or use browser back and forward with it. Common examples are search text, filters, sorting, and pagination. Temporary state, such as an open tooltip, should normally stay local.

**Câu hỏi tiếng Việt:** Khi nào state nên nằm trên URL?

**Câu trả lời tiếng Việt**

> State nên nằm trên URL khi người dùng cần refresh, bookmark, chia sẻ hoặc dùng nút back/forward mà vẫn giữ state. Ví dụ thường gặp là search, filter, sorting và pagination. State tạm thời như tooltip đang mở thường nên để local.

## TanStack Query / Quản Lý Server State

### 5. What Problem Does TanStack Query Solve? [P0]

**Simple English answer**

> TanStack Query manages data that comes from a server. It handles loading, errors, caching, retries, refetching, mutations, and stale data. It does not replace all client state. I still use local state or Zustand for UI state that the server does not own.

**Câu hỏi tiếng Việt:** TanStack Query giải quyết vấn đề gì?

**Câu trả lời tiếng Việt**

> TanStack Query quản lý dữ liệu đến từ server. Nó xử lý loading, error, caching, retry, refetch, mutation và stale data. Nó không thay thế toàn bộ client state. Tôi vẫn dùng local state hoặc Zustand cho UI state không thuộc server.

### 6. How Do You Design Query Keys? [P0]

**Simple English answer**

> A query key should clearly describe the data. I build it from general to specific, for example `['orders', tenantId, filters]`. Every value that changes the result should be in the key. I use shared key factories so invalidation is consistent and easy to find.

**Câu hỏi tiếng Việt:** Bạn thiết kế query key như thế nào?

**Câu trả lời tiếng Việt**

> Query key phải mô tả rõ dữ liệu. Tôi xây từ chung đến cụ thể, ví dụ `['orders', tenantId, filters]`. Mọi value làm kết quả thay đổi phải có trong key. Tôi dùng shared key factory để invalidation nhất quán và dễ tìm.

### 7. What Is `staleTime`? [P0]

**Simple English answer**

> `staleTime` is how long query data is considered fresh. During that time, TanStack Query normally does not need to refetch it just because the component mounts again. I choose the time based on how quickly the business data can change.

**Câu hỏi tiếng Việt:** `staleTime` là gì?

**Câu trả lời tiếng Việt**

> `staleTime` là khoảng thời gian query data được xem là còn mới. Trong thời gian đó, TanStack Query thường không cần refetch chỉ vì component mount lại. Tôi chọn thời gian dựa trên tốc độ thay đổi của dữ liệu nghiệp vụ.

### 8. `staleTime` Versus Garbage Collection Time [P0]

**Simple English answer**

> `staleTime` controls freshness. Garbage collection time controls how long unused query data stays in memory after no component uses it. Data can be stale but still remain in the cache. These settings solve different problems.

**Câu hỏi tiếng Việt:** `staleTime` và garbage collection time khác nhau thế nào?

**Câu trả lời tiếng Việt**

> `staleTime` kiểm soát độ mới của dữ liệu. Garbage collection time kiểm soát dữ liệu query không còn được component sử dụng sẽ ở lại memory bao lâu. Dữ liệu có thể stale nhưng vẫn còn trong cache. Hai setting này giải quyết hai vấn đề khác nhau.

### 9. Invalidation Versus Refetching [P0]

**Simple English answer**

> Invalidation marks matching data as stale and lets active queries refetch when needed. Refetching directly asks a query to fetch now. I often invalidate after a mutation because it says that the old cache is no longer trusted. I use direct refetch when I need an immediate request.

**Câu hỏi tiếng Việt:** Invalidation và refetch khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Invalidation đánh dấu dữ liệu phù hợp là stale và cho active query refetch khi cần. Refetch trực tiếp yêu cầu query fetch ngay. Tôi thường invalidate sau mutation vì cache cũ không còn đáng tin. Tôi dùng direct refetch khi cần request ngay lập tức.

### 10. `setQueryData` Versus `invalidateQueries` [P0]

**Simple English answer**

> I use `setQueryData` when I already know the exact new data and can update the cache safely. I use `invalidateQueries` when the server should return the final correct result. Direct cache updates are fast, but they are risky if the event has only partial data.

**Câu hỏi tiếng Việt:** `setQueryData` và `invalidateQueries` khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng `setQueryData` khi đã biết chính xác dữ liệu mới và có thể update cache an toàn. Tôi dùng `invalidateQueries` khi cần server trả kết quả chính xác cuối cùng. Update cache trực tiếp nhanh nhưng rủi ro nếu event chỉ có dữ liệu một phần.

### 11. What Is an Optimistic Update? [P0]

**Simple English answer**

> An optimistic update changes the UI before the server confirms the mutation. I cancel related queries, save the old cache, show the expected result, and call the API. If it fails, I restore the old data. After it finishes, I refetch or invalidate to confirm the server result.

**Câu hỏi tiếng Việt:** Optimistic update là gì?

**Câu trả lời tiếng Việt**

> Optimistic update thay đổi UI trước khi server xác nhận mutation. Tôi cancel các query liên quan, lưu cache cũ, hiện kết quả dự kiến rồi gọi API. Nếu lỗi, tôi khôi phục dữ liệu cũ. Sau khi hoàn tất, tôi refetch hoặc invalidate để xác nhận kết quả từ server.

### 12. When Should You Avoid an Optimistic Update? [P0]

**Simple English answer**

> I avoid it when failure is common or expensive, or when the server result is hard to predict. Payments, final stock checks, and complex permission rules are examples. In those cases, I show a clear pending state and wait for server confirmation.

**Câu hỏi tiếng Việt:** Khi nào nên tránh optimistic update?

**Câu trả lời tiếng Việt**

> Tôi tránh dùng khi lỗi thường xảy ra hoặc gây hậu quả lớn, hoặc khi khó đoán kết quả từ server. Payment, kiểm tra stock cuối cùng và permission rule phức tạp là các ví dụ. Trong trường hợp đó, tôi hiện pending state rõ ràng và chờ server xác nhận.

### 13. How Do You Prevent Race Conditions? [P0]

**Simple English answer**

> I include every input in the query key, cancel old work when it is no longer needed, and avoid duplicate submissions. For mutations, I use request IDs, versions, or idempotency keys when the operation is important. I also make sure an old response cannot overwrite newer state.

**Câu hỏi tiếng Việt:** Bạn tránh race condition như thế nào?

**Câu trả lời tiếng Việt**

> Tôi đưa mọi input vào query key, cancel công việc cũ khi không còn cần và tránh submit trùng. Với mutation quan trọng, tôi dùng request ID, version hoặc idempotency key. Tôi cũng bảo đảm response cũ không thể ghi đè state mới hơn.

### 14. How Do You Handle Mutation Errors? [P0]

**Simple English answer**

> I show a clear error that helps the user know what to do next. If I changed the UI optimistically, I roll it back. I keep useful error details for debugging, but I do not show private server information to the user. I only retry when the operation is safe to repeat.

**Câu hỏi tiếng Việt:** Bạn xử lý mutation error như thế nào?

**Câu trả lời tiếng Việt**

> Tôi hiện error rõ ràng để người dùng biết cần làm gì tiếp theo. Nếu đã optimistic update UI, tôi rollback. Tôi giữ thông tin hữu ích cho debugging nhưng không hiện dữ liệu server nhạy cảm cho người dùng. Tôi chỉ retry khi operation an toàn để chạy lại.

### 15. How Do You Combine WebSockets with TanStack Query? [P0]

**Simple English answer**

> The socket tells the client that something changed. I first check the tenant and resource ID. If the event contains complete and safe data, I may update the cache directly. Otherwise, I invalidate the related query and let the API return the source of truth.

**Câu hỏi tiếng Việt:** Bạn kết hợp WebSocket với TanStack Query như thế nào?

**Câu trả lời tiếng Việt**

> Socket báo cho client biết có dữ liệu thay đổi. Đầu tiên tôi kiểm tra tenant và resource ID. Nếu event có dữ liệu đầy đủ và an toàn, tôi có thể update cache trực tiếp. Nếu không, tôi invalidate query liên quan và để API trả source of truth.

### 16. Why Not Store Every Socket Event Directly? [P0]

**Simple English answer**

> A socket event may arrive twice, out of order, or with only part of the object. If I save every event as final state, the UI can become wrong. I treat the API or query cache as the main data source and use events mainly to update or refresh the correct data.

**Câu hỏi tiếng Việt:** Vì sao không lưu trực tiếp mọi socket event thành state cuối cùng?

**Câu trả lời tiếng Việt**

> Socket event có thể đến hai lần, sai thứ tự hoặc chỉ chứa một phần object. Nếu lưu mọi event thành final state, UI có thể bị sai. Tôi xem API hoặc query cache là nguồn dữ liệu chính và dùng event chủ yếu để update hoặc refresh đúng dữ liệu.

### 17. How Do You Handle Dependent Queries? [P1]

**Simple English answer**

> A dependent query should start only after the value it needs is ready. For example, an order query may wait for the tenant ID and auth state. I use the `enabled` option and include the dependency in the query key. I also show a clear waiting state.

**Câu hỏi tiếng Việt:** Bạn xử lý dependent query như thế nào?

**Câu trả lời tiếng Việt**

> Dependent query chỉ nên chạy sau khi value nó cần đã sẵn sàng. Ví dụ, order query có thể phải đợi tenant ID và auth state. Tôi dùng option `enabled`, đưa dependency vào query key và hiện waiting state rõ ràng.

### 18. How Do You Prefetch? [P1]

**Simple English answer**

> I prefetch data that the user is likely to need soon, for example when they hover a link or before opening the next step. I use the same query key and query function as the real screen. I do not prefetch everything because that wastes network and memory.

**Câu hỏi tiếng Việt:** Bạn prefetch dữ liệu như thế nào?

**Câu trả lời tiếng Việt**

> Tôi prefetch dữ liệu mà người dùng có khả năng cần sớm, ví dụ khi hover link hoặc trước bước tiếp theo. Tôi dùng cùng query key và query function với màn hình thật. Tôi không prefetch mọi thứ vì sẽ lãng phí network và memory.

### 19. What Are TanStack Query’s Important Defaults? [P0]

**Simple English answer**

> Query data is stale by default, so active screens may refetch on mount, window focus, or reconnect. Failed client queries retry by default, and unused queries are removed later. I review these defaults for each product because realtime or expensive APIs may need different settings.

**Câu hỏi tiếng Việt:** Các default quan trọng của TanStack Query là gì?

**Câu trả lời tiếng Việt**

> Query data mặc định được xem là stale nên active screen có thể refetch khi mount, window focus hoặc reconnect. Client query bị lỗi mặc định có retry và query không dùng sẽ bị xóa sau đó. Tôi xem lại các default theo từng sản phẩm vì realtime hoặc API tốn chi phí có thể cần setting khác.

### 20. How Do You Test Query Hooks? [P0]

**Simple English answer**

> I create a new QueryClient for each test and usually turn retries off. I mock the API, render the hook with its provider, and wait for the result. I test success, loading, error, cache updates, invalidation, and optimistic rollback when the hook uses them.

**Câu hỏi tiếng Việt:** Bạn test query hook như thế nào?

**Câu trả lời tiếng Việt**

> Tôi tạo QueryClient mới cho từng test và thường tắt retry. Tôi mock API, render hook với provider rồi đợi kết quả. Tôi test success, loading, error, cache update, invalidation và optimistic rollback nếu hook có sử dụng chúng.

## TanStack Table / Bảng Dữ Liệu

### 21. What Problem Does TanStack Table Solve? [P0]

**Simple English answer**

> TanStack Table is a headless library for table behavior. It handles row models, sorting, filtering, pagination, selection, and column state, but it does not choose the UI style. This gives us control over Tailwind and shadcn components while keeping table logic organized.

**Câu hỏi tiếng Việt:** TanStack Table giải quyết vấn đề gì?

**Câu trả lời tiếng Việt**

> TanStack Table là headless library cho table behavior. Nó xử lý row model, sorting, filtering, pagination, selection và column state nhưng không quyết định style UI. Nhờ vậy ta kiểm soát Tailwind và shadcn component trong khi table logic vẫn có tổ chức.

### 22. Client-Side Versus Server-Side Pagination [P0]

**Simple English answer**

> Client pagination is good when the full dataset is small and already loaded. Server pagination is better when the dataset is large or changes often. With server pagination, the API receives the page, size, filters, and sorting, and it returns the rows and total count.

**Câu hỏi tiếng Việt:** Client-side và server-side pagination khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Client pagination phù hợp khi toàn bộ dataset nhỏ và đã được tải. Server pagination tốt hơn khi dataset lớn hoặc thay đổi thường xuyên. Với server pagination, API nhận page, size, filter, sorting rồi trả về rows và total count.

### 23. Controlled Versus Uncontrolled Table State [P0]

**Simple English answer**

> I use controlled table state when sorting, filters, or pagination must be stored in the URL, sent to the server, or shared with another component. The parent owns the value and passes it to the table. Uncontrolled state is simpler for a small local table.

**Câu hỏi tiếng Việt:** Controlled và uncontrolled table state khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng controlled table state khi sorting, filter hoặc pagination phải lưu trên URL, gửi đến server hoặc chia sẻ với component khác. Parent sở hữu value và truyền vào table. Uncontrolled state đơn giản hơn cho table nhỏ chỉ dùng local.

### 24. How Do You Make a Complex Table Performant? [P0]

**Simple English answer**

> I use server pagination for large data, keep column definitions stable, and avoid heavy work inside every cell. For many visible rows, I consider virtualization. I also measure first because memoization and virtualization add complexity and are not always needed.

**Câu hỏi tiếng Việt:** Bạn tối ưu performance cho table phức tạp như thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng server pagination cho dữ liệu lớn, giữ column definition ổn định và tránh công việc nặng trong mỗi cell. Khi có nhiều row hiển thị, tôi cân nhắc virtualization. Tôi cũng đo trước vì memoization và virtualization làm code phức tạp hơn và không phải lúc nào cũng cần.

### 25. Sorting and Filtering: Client or Server? [P0]

**Simple English answer**

> Sorting, filtering, and pagination should work on the same dataset. If pagination is on the server, sorting and filtering should normally also be on the server. Otherwise, the user may sort only the current page and see a misleading result.

**Câu hỏi tiếng Việt:** Sorting và filtering nên ở client hay server?

**Câu trả lời tiếng Việt**

> Sorting, filtering và pagination nên hoạt động trên cùng một dataset. Nếu pagination ở server thì sorting và filtering thường cũng nên ở server. Nếu không, người dùng có thể chỉ sort current page và nhìn thấy kết quả gây hiểu nhầm.

### 26. How Do You Keep Columns Maintainable? [P1]

**Simple English answer**

> I keep typed column definitions close to the feature. Repeated formatting goes into small cell components or formatter functions. Column IDs stay stable for sorting and visibility. Generic table components handle table behavior, while feature columns handle business meaning.

**Câu hỏi tiếng Việt:** Bạn giữ column definition dễ bảo trì như thế nào?

**Câu trả lời tiếng Việt**

> Tôi giữ typed column definition gần feature. Formatting lặp lại được đưa vào cell component nhỏ hoặc formatter function. Column ID phải ổn định cho sorting và visibility. Generic table component xử lý table behavior còn feature column xử lý ý nghĩa nghiệp vụ.

### 27. What Accessibility Work Does a Headless Table Need? [P0]

**Simple English answer**

> A headless library does not finish accessibility for us. I use semantic table elements, correct headers, keyboard-accessible controls, and clear sort direction. I do not show status by color alone. If rows are virtualized, I test keyboard and screen-reader behavior.

**Câu hỏi tiếng Việt:** Headless table cần làm gì cho accessibility?

**Câu trả lời tiếng Việt**

> Headless library không hoàn thành accessibility thay cho chúng ta. Tôi dùng semantic table element, header đúng, control dùng được bằng keyboard và sort direction rõ ràng. Tôi không chỉ dùng màu để thể hiện status. Nếu virtualize row, tôi test behavior với keyboard và screen reader.

## Applied in QRTable / Cách Tôi Áp Dụng State, Query và Table [PROJECT FOLLOW-UP]

> Đây là phần dùng khi interviewer hỏi “How did you implement it?”. Bạn hãy nói thành đoạn hoàn chỉnh trước; dòng flow chỉ là gợi ý để nhớ thứ tự.

### A. How Did You Decide Where Each Type of State Should Live?

**Simple English answer**

> I decided the owner of the state before choosing a tool. API data such as areas, tables, menus, carts, orders, and bills belongs to TanStack Query because the server is the source of truth. In the Management App, Zustand keeps the hydrated staff access token and profile because several client features need them. The table-management feature uses a small scoped Context for its selected table and open dialogs. In the Customer App, `SessionContext` keeps the current QR session and persists it to local storage. Temporary values such as an open drawer or selected menu item stay in local component state. This avoids putting unrelated data into one global store.

**Câu hỏi tiếng Việt:** Bạn quyết định từng loại state nên nằm ở đâu như thế nào?

**Câu trả lời tiếng Việt**

> Tôi xác định ai sở hữu state trước khi chọn tool. Dữ liệu API như area, table, menu, cart, order và bill thuộc TanStack Query vì server là source of truth. Trong Management App, Zustand giữ staff access token và profile sau khi hydrate vì nhiều client feature cần dùng chúng. Feature quản lý bàn dùng một Context có scope nhỏ cho selected table và dialog đang mở. Trong Customer App, `SessionContext` giữ QR session hiện tại và persist nó vào local storage. Các value tạm thời như drawer đang mở hoặc menu item đang chọn vẫn nằm trong local component state. Cách phân chia này tránh đưa những dữ liệu không liên quan vào cùng một global store.

**Flow to remember / Luồng cần nhớ:** `API state → TanStack Query | shared auth state → Zustand | feature session/dialog state → Context | temporary UI state → useState`

**Code evidence / Code thực tế:** [staff auth store](../../apps/management-app/src/lib/auth/auth-store.ts), [table feature context](../../apps/management-app/src/features/tables/components/tables-provider.tsx), [customer session context](../../apps/customer-pwa/src/features/session/context/session-provider.tsx)

### B. How Did You Set Up and Use TanStack Query for a Normal API Flow?

**Simple English answer**

> Both frontend apps create one `QueryClient` near the application root and provide it with `QueryClientProvider`. They share a default `staleTime` of sixty seconds and disable refetch on window focus, while an individual query can still override those defaults. In the table feature, the component calls `useTablesQuery`. That hook creates a key with `tableKeys`, waits for staff authentication with `enabled`, and calls `tablesService`. The service uses a typed authenticated client to call the BFF. When a create, update, or delete mutation succeeds, the mutation hook invalidates the related table keys, so active screens fetch the final server data again. The component does not need to manage request status and cache data by itself.

**Câu hỏi tiếng Việt:** Bạn đã setup và dùng TanStack Query cho một API flow thông thường như thế nào?

**Câu trả lời tiếng Việt**

> Cả hai frontend app đều tạo một `QueryClient` gần application root rồi cung cấp nó qua `QueryClientProvider`. Hai app dùng chung `staleTime` mặc định là sáu mươi giây và tắt refetch khi window focus; từng query vẫn có thể override các default này. Trong feature quản lý bàn, component gọi `useTablesQuery`. Hook này tạo key bằng `tableKeys`, dùng `enabled` để đợi staff authentication rồi gọi `tablesService`. Service sử dụng typed authenticated client để gọi BFF. Khi mutation tạo, sửa hoặc xóa thành công, mutation hook invalidate các table key liên quan để active screen lấy lại dữ liệu cuối cùng từ server. Nhờ vậy, component không phải tự quản lý request status và cache data.

**Flow to remember / Luồng cần nhớ:** `component → query hook → key factory → feature service → API client → BFF → query cache → UI`

**Code evidence / Code thực tế:** [Query provider](../../apps/management-app/src/app/providers.tsx), [table query hooks](../../apps/management-app/src/features/tables/hooks/use-tables-query.ts), [table key factory](../../apps/management-app/src/features/tables/table-keys.ts), [table mutations](../../apps/management-app/src/features/tables/hooks/use-tables-mutations.ts)

### C. How Did You Combine Optimistic Updates and Socket.io with the Query Cache?

**Simple English answer**

> I used two different strategies because the risks are different. In the Customer App, cart changes are optimistic. Before the request, the hook cancels the cart query, saves the previous snapshot, and updates the cache so the UI responds immediately. The request also sends `expectedCartVersion`. If the server reports a version conflict, the hook restores or invalidates the cache and gets the current server snapshot. For realtime order, kitchen, bill, and payment events, the socket listener first checks the tenant and session scope. It usually invalidates the related query instead of treating a partial event as the complete object. The socket tells the UI that something changed, while the REST API remains the source of truth.

**Câu hỏi tiếng Việt:** Bạn kết hợp optimistic update và Socket.io với query cache như thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng hai chiến lược khác nhau vì mức rủi ro của chúng khác nhau. Trong Customer App, thay đổi cart được optimistic update. Trước khi gửi request, hook cancel cart query, lưu snapshot cũ rồi update cache để UI phản hồi ngay. Request cũng gửi `expectedCartVersion`. Nếu server báo version conflict, hook khôi phục hoặc invalidate cache rồi lấy snapshot hiện tại từ server. Với realtime event của order, kitchen, bill và payment, socket listener kiểm tra tenant và session scope trước. Listener thường invalidate query liên quan thay vì xem partial event là object hoàn chỉnh. Socket báo cho UI biết dữ liệu đã thay đổi, còn REST API vẫn là source of truth.

**Flow to remember / Luồng cần nhớ:** `user action → optimistic cache → versioned API → confirm or rollback` và `socket event → scope check → invalidate query → REST refetch`

**Code evidence / Code thực tế:** [optimistic cart mutations](../../apps/customer-pwa/src/features/order/hooks/use-cart-query.ts), [customer realtime hook](../../apps/customer-pwa/src/features/order/hooks/use-customer-order-realtime.ts), [order query keys](../../apps/customer-pwa/src/features/order/hooks/order-query-keys.ts)

### D. How Did You Build a Real Table with TanStack Table and shadcn/ui?

**Simple English answer**

> The table-management screen first gets typed area and table data from TanStack Query. It passes the rows to `TablesTable`, where `useReactTable` controls sorting, column filters, and column visibility. I add the core, filtered, sorted, pagination, and faceted row models for the behaviors used by the screen. The render layer loops through header groups and visible cells, then uses `flexRender` to place them inside shadcn `Table` components. Reusable toolbar and pagination components handle common table behavior, while typed `ColumnDef<RestaurantTable>` definitions keep business UI such as the Vietnamese status badge and row actions close to the table feature. The current screen uses client-side operations because it loads a manageable dataset; for a large dataset, I would move pagination, filtering, and sorting to the server together.

**Câu hỏi tiếng Việt:** Bạn đã xây một table thực tế bằng TanStack Table và shadcn/ui như thế nào?

**Câu trả lời tiếng Việt**

> Màn hình quản lý bàn lấy typed area và table data từ TanStack Query trước. Dữ liệu được truyền vào `TablesTable`, nơi `useReactTable` quản lý sorting, column filter và column visibility theo controlled state. Tôi thêm core, filtered, sorted, pagination và faceted row model cho những behavior mà màn hình cần. Ở render layer, component lặp qua header group và visible cell rồi dùng `flexRender` để đặt nội dung vào các shadcn `Table` component. Toolbar và pagination dùng chung xử lý table behavior phổ biến, còn typed `ColumnDef<RestaurantTable>` giữ business UI như status badge tiếng Việt và row action ở gần feature quản lý bàn. Màn hình hiện tại dùng client-side operation vì dataset còn vừa phải; nếu dữ liệu lớn, tôi sẽ chuyển pagination, filtering và sorting lên server cùng nhau.

**Flow to remember / Luồng cần nhớ:** `Query data → typed columns + controlled state → useReactTable row models → flexRender → shadcn Table UI`

**Code evidence / Code thực tế:** [table screen](../../apps/management-app/src/features/tables/index.tsx), [TanStack Table implementation](../../apps/management-app/src/features/tables/components/tables-table.tsx), [typed business columns](../../apps/management-app/src/features/tables/components/tables-columns.tsx)

## Sources / Nguồn

- [TanStack Query important defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- [TanStack Query optimistic updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [TanStack Table guides](https://tanstack.com/table/v8/docs/guide/introduction)
- [TanStack Table pagination](https://tanstack.com/table/v8/docs/guide/pagination)
