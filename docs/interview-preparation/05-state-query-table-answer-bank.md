# State, TanStack Query, and TanStack Table Answer Bank

> Main principle: state management is first an ownership problem, then a library choice.  
> Nguyên tắc: quản lý state trước hết là bài toán ownership, sau đó mới là chọn library.

## State Ownership

### 1. How Do You Classify Frontend State? [P0]

**Core answer**

> I classify state by source and lifecycle. Remote server state has fetching, caching, invalidation, and concurrency concerns, so I keep it in TanStack Query. Shareable navigation state belongs in the URL. Form drafts belong in the form boundary. Small interaction state stays local, and only cross-tree client state that needs independent subscriptions goes into Zustand or Context.

**Tiếng Việt:** Đây là câu trục chính. Nếu CEO hỏi bất kỳ library nào, quay về source of truth và lifecycle.

**Câu hỏi tiếng Việt:** Bạn phân loại frontend state thế nào?

**Trả lời tiếng Việt**

> Tôi phân loại theo source và lifecycle: remote server state vào TanStack Query; navigation có thể share vào URL; form draft ở form boundary; interaction nhỏ ở local state; cross-tree client state cần independent subscription vào Zustand hoặc Context.

### 2. Why Not Put Everything in Zustand? [P0]

**Core answer**

> Zustand is good for client-owned state, but remote data has a different lifecycle. If I copy API data into Zustand, I must rebuild fetching status, retries, deduplication, freshness, invalidation, and mutation consistency. That creates two sources of truth. I use Zustand for client behavior and TanStack Query for server resources.

**Câu hỏi tiếng Việt:** Vì sao không cho mọi state vào Zustand?

**Trả lời tiếng Việt**

> Zustand tốt cho client-owned state, nhưng nếu copy API data vào đó tôi phải tự xây fetching, retry, deduplication, freshness, invalidation và mutation consistency, đồng thời tạo hai source of truth. Remote resource nên ở Query.

### 3. Context Versus Zustand [P0]

**Core answer**

> Context is a dependency-delivery mechanism and works well for scoped, relatively stable state such as a customer session boundary. Zustand is convenient when unrelated components need selected slices and actions without rerendering every consumer. I choose the smaller tool that matches update frequency and ownership rather than using a global store by default.

**Câu hỏi tiếng Việt:** Context và Zustand khác nhau thế nào?

**Trả lời tiếng Việt**

> Context phù hợp scoped value tương đối ổn định, như customer session. Zustand tiện khi nhiều component độc lập cần subscribe từng slice/action. Tôi chọn tool nhỏ nhất theo update frequency và ownership, không dùng global store mặc định.

### 4. When Should State Live in the URL? [P0]

**Core answer**

> State belongs in the URL when users should be able to refresh, bookmark, share, or use browser navigation while preserving it—for example filters, search, pagination, or a selected tab. Ephemeral state such as an open tooltip usually should not. I also validate URL values because they are external input.

**Câu hỏi tiếng Việt:** Khi nào state nên nằm trong URL?

**Trả lời tiếng Việt**

> Khi user cần refresh, bookmark, share hoặc dùng back/forward mà vẫn giữ state, như filter, search, pagination, selected tab. Tooltip open không cần. URL là external input nên phải validate.

## TanStack Query

### 5. What Problem Does TanStack Query Solve? [P0]

**Core answer**

> TanStack Query manages asynchronous server state: fetching, cache identity, freshness, deduplication, retries, background refetching, mutations, and invalidation. It does not replace all client state. Its value is giving remote data an explicit lifecycle and a consistent source of truth.

**Câu hỏi tiếng Việt:** TanStack Query giải quyết vấn đề gì?

**Trả lời tiếng Việt**

> Nó quản lý asynchronous server state: fetching, cache identity, freshness, deduplication, retry, background refetch, mutation và invalidation. Nó không thay mọi client state; giá trị chính là remote data có lifecycle và source of truth rõ.

### 6. How Do You Design Query Keys? [P0]

**Core answer**

> A query key uniquely describes the resource and every input that changes the result. I use hierarchical key factories such as tenant, resource, list or detail, and normalized filters. Keys must include tenant or session scope when data is scoped. Stable structured keys make targeted invalidation possible and reduce accidental cache collisions.

**Example:** `['orders', tenantId, 'detail', orderId]`.

**Câu hỏi tiếng Việt:** Bạn thiết kế query keys thế nào?

**Trả lời tiếng Việt**

> Query key phải định danh resource và mọi input đổi kết quả. Tôi dùng key factory phân cấp tenant, resource, list/detail và normalized filters. Tenant/session scope phải có trong key khi data scoped để tránh collision và hỗ trợ targeted invalidation.

### 7. What Is `staleTime`? [P0]

**Core answer**

> `staleTime` is how long cached data is considered fresh. Fresh data can be served without the normal background refetch triggers. The default is immediately stale, which is safe but may refetch more than the product needs. I choose it from business freshness—for example, public menu data can tolerate more staleness than a live order queue.

**Câu hỏi tiếng Việt:** `staleTime` là gì?

**Trả lời tiếng Việt**

> Là thời gian cached data được xem là fresh. Mặc định data stale ngay nên có thể refetch nhiều. Tôi chọn theo business freshness: public menu chịu stale lâu hơn live order queue.

### 8. `staleTime` Versus Garbage Collection Time [P0]

**Core answer**

> `staleTime` controls freshness; garbage collection time controls how long an inactive query remains cached before removal. Data can be stale but still cached and displayed while it refetches. Confusing the two leads to unexpected refetching or memory behavior.

**Câu hỏi tiếng Việt:** `staleTime` và garbage collection time khác nhau thế nào?

**Trả lời tiếng Việt**

> `staleTime` quyết định freshness; GC time quyết định inactive query còn giữ trong cache bao lâu. Data có thể stale nhưng vẫn cached và hiển thị trong khi background refetch.

### 9. Invalidation Versus Refetching [P0]

**Core answer**

> Invalidation marks matching queries stale and normally refetches active ones according to library behavior. Refetch directly requests data for a query. I prefer semantic invalidation after mutations because it preserves the dependency model, but I use direct cache updates when the new value is known and immediate consistency improves the experience.

**Câu hỏi tiếng Việt:** Invalidation và refetch khác nhau thế nào?

**Trả lời tiếng Việt**

> Invalidation đánh dấu matching queries stale và thường refetch active queries theo behavior của library; refetch trực tiếp gửi request. Sau mutation tôi ưu tiên semantic invalidation, trừ khi biết chính xác snapshot mới để update cache ngay.

### 10. `setQueryData` Versus `invalidateQueries` [P0]

**Core answer**

> `setQueryData` is appropriate when I have a trustworthy new representation and can update the cache immutably. Invalidation is safer when the mutation affects server-calculated fields or multiple related resources. A common approach is to update a precise detail optimistically or from the response, then invalidate affected aggregates.

**Câu hỏi tiếng Việt:** Khi nào dùng `setQueryData`, khi nào `invalidateQueries`?

**Trả lời tiếng Việt**

> `setQueryData` khi có representation mới đáng tin và có thể immutable update. Invalidate an toàn hơn khi server tính field hoặc nhiều aggregate liên quan. Có thể update detail ngay rồi invalidate aggregates.

### 11. What Is an Optimistic Update? [P0]

**Core answer**

> An optimistic update changes the UI before the server confirms success. The mutation flow is: cancel conflicting queries, snapshot previous data, apply the predicted update, send the request, roll back on error, and reconcile or invalidate when settled. I use it when the action is predictable and the rollback experience is acceptable.

**Câu hỏi tiếng Việt:** Optimistic update là gì?

**Trả lời tiếng Việt**

> Là đổi UI trước khi server xác nhận. Flow: cancel conflicting queries, snapshot data cũ, apply predicted change, gửi request, rollback khi lỗi và reconcile/invalidate khi kết thúc. Chỉ dùng khi action dễ dự đoán và rollback chấp nhận được.

### 12. When Should You Avoid an Optimistic Update? [P0]

**Core answer**

> I avoid it when success is uncertain, the server performs complex calculation, the action has high financial or inventory impact, or rollback would confuse the user. In those cases, a pending state with clear feedback is safer. Optimism is a product decision, not only a speed trick.

**Câu hỏi tiếng Việt:** Khi nào không nên optimistic update?

**Trả lời tiếng Việt**

> Khi success không chắc, server calculation phức tạp, action ảnh hưởng tiền/inventory hoặc rollback làm user hiểu nhầm. Khi đó pending state rõ ràng an toàn hơn. Optimism là product decision, không chỉ speed trick.

### 13. How Do You Prevent Race Conditions? [P0]

**Core answer**

> I design a clear source of truth, cancel or ignore obsolete reads, include all identity inputs in query keys, use server-side versioning or idempotency for important writes, and reconcile mutation responses. For rapid searches, each term has a distinct key and obsolete requests should not overwrite the current view. Client controls reduce races, but the backend must enforce critical consistency.

**Câu hỏi tiếng Việt:** Bạn chống race condition thế nào?

**Trả lời tiếng Việt**

> Xác định source of truth, cancel/ignore obsolete reads, đưa identity inputs vào key, dùng server versioning/idempotency cho write quan trọng và reconcile mutation response. Backend phải enforce critical consistency cuối cùng.

### 14. How Do You Handle Mutation Errors? [P0]

**Core answer**

> I separate validation, authorization, conflict, network, and unexpected errors when the contract allows it. The UI should preserve recoverable user input, show an actionable message, roll back optimistic state, and offer retry only when retry is safe. Logging captures technical context, while the user message remains concise and non-sensitive.

**Câu hỏi tiếng Việt:** Bạn xử lý mutation error thế nào?

**Trả lời tiếng Việt**

> Phân biệt validation, authorization, conflict, network và unexpected error khi contract cho phép. UI giữ recoverable input, đưa actionable message, rollback optimistic state và chỉ retry khi an toàn. Technical context đi vào logging, không lộ ra user.

### 15. How Do You Combine WebSockets with TanStack Query? [P0]

**Core answer**

> The socket delivers a change signal, while TanStack Query remains the cache and server-state source of truth. I validate tenant, session, and entity scope, then either patch a precise query with trusted event data or invalidate the affected query family. On reconnect or browser recovery, I refetch authoritative data because events may have been missed.

**Câu hỏi tiếng Việt:** Bạn kết hợp WebSocket với TanStack Query thế nào?

**Trả lời tiếng Việt**

> Socket mang change signal; Query vẫn là cache/source of truth. Handler validate tenant/session/entity scope rồi patch query chính xác nếu payload đáng tin hoặc invalidate family liên quan. Reconnect/browser recovery phải refetch vì có thể bỏ lỡ event.

### 16. Why Not Store Every Socket Event Directly? [P0]

**Core answer**

> Events may be duplicated, delayed, reordered, or incomplete. Blindly appending them can make the client diverge from server truth. I use events to update only when the payload and ordering contract are sufficient; otherwise, they trigger targeted reconciliation. Important workflows also need idempotency or version information on the server.

**Câu hỏi tiếng Việt:** Vì sao không lưu trực tiếp mọi socket event?

**Trả lời tiếng Việt**

> Event có thể trùng, trễ, đảo thứ tự hoặc thiếu dữ liệu. Blind append có thể làm client lệch server. Chỉ update trực tiếp khi payload và ordering contract đủ; nếu không dùng event để trigger reconciliation.

### 17. How Do You Handle Dependent Queries? [P1]

**Core answer**

> If one query truly requires the result of another, I gate it with `enabled` and include the dependency in its key. But I first ask whether the waterfall can be removed by changing the API, fetching in parallel, or obtaining the identifier earlier. A dependent query should represent a real dependency, not accidental component order.

**Câu hỏi tiếng Việt:** Bạn xử lý dependent queries thế nào?

**Trả lời tiếng Việt**

> Nếu query sau thật sự cần kết quả query trước, tôi gate bằng `enabled` và thêm dependency vào key. Trước đó tôi xem có bỏ waterfall bằng API khác, parallel fetch hoặc lấy identifier sớm hơn không.

### 18. How Do You Prefetch? [P1]

**Core answer**

> I prefetch when the next navigation or interaction is likely and the data cost is reasonable—for example on intentional hover or before opening a detail panel. I reuse the same query key and function as the destination. Excessive prefetching wastes bandwidth, so probability and data size matter.

**Câu hỏi tiếng Việt:** Bạn prefetch thế nào?

**Trả lời tiếng Việt**

> Prefetch khi navigation/interaction tiếp theo có xác suất cao và data cost hợp lý, dùng cùng key và query function với destination. Prefetch quá nhiều lãng phí bandwidth nên phải cân nhắc xác suất và size.

### 19. What Are TanStack Query’s Important Defaults? [P0]

**Core answer**

> Queries are stale immediately by default, stale active queries may refetch on mount, focus, or reconnect, inactive queries are retained for a period before garbage collection, and failed queries are retried by default in the browser. I do not change all defaults globally without a reason; I define product-oriented defaults and override exceptional resources.

**Coaching tiếng Việt:** Nếu hỏi con số chính xác, Query v5 thường có inactive cache khoảng 5 phút và client retry 3 lần, nhưng nói rõ version/config có thể thay đổi.

**Câu hỏi tiếng Việt:** Các defaults quan trọng của TanStack Query là gì?

**Trả lời tiếng Việt**

> Query stale ngay mặc định; stale active query có thể refetch khi mount, focus hoặc reconnect; inactive query được giữ một thời gian rồi GC; failed browser query retry mặc định. Tôi đặt product-oriented defaults và chỉ override resource đặc biệt.

### 20. How Do You Test Query Hooks? [P0]

**Core answer**

> I wrap the hook with an isolated QueryClient, disable or control retries, mock the transport boundary, and assert visible lifecycle behavior or cache changes. Mutation tests should cover success, error, invalidation, optimistic rollback, and conflict handling. I reset the client between tests so cache state does not leak.

**Câu hỏi tiếng Việt:** Bạn test Query hooks thế nào?

**Trả lời tiếng Việt**

> Wrap hook bằng QueryClient cô lập, kiểm soát retry, mock transport và assert lifecycle/cache behavior. Mutation tests cover success, error, invalidation, optimistic rollback và conflict. Reset client giữa tests để cache không leak.

## TanStack Table

### 21. What Problem Does TanStack Table Solve? [P0]

**Core answer**

> TanStack Table is a headless table engine. It models columns, rows, sorting, filtering, pagination, selection, visibility, and expansion while leaving markup and styling to the application. That is useful for product-specific design systems, but accessibility and rendering remain our responsibility.

**Câu hỏi tiếng Việt:** TanStack Table giải quyết vấn đề gì?

**Trả lời tiếng Việt**

> Đây là headless table engine mô hình hóa columns, rows, sorting, filtering, pagination, selection, visibility và expansion, còn markup/style do app sở hữu. Linh hoạt với design system nhưng accessibility/rendering vẫn là trách nhiệm của team.

### 22. Client-Side Versus Server-Side Pagination [P0]

**Core answer**

> Client-side pagination fits a bounded dataset that is already loaded. Server-side pagination is better for large or frequently changing datasets and requires page, size, sorting, and filters in the query key. With server pagination, the table uses manual pagination and the backend becomes the source of truth for row count and ordering.

**Câu hỏi tiếng Việt:** Client-side và server-side pagination khác nhau thế nào?

**Trả lời tiếng Việt**

> Client pagination phù hợp bounded dataset đã tải đầy đủ. Server pagination phù hợp data lớn hoặc đổi thường xuyên; page, size, sort, filters phải vào query key và backend sở hữu row count/order.

### 23. Controlled Versus Uncontrolled Table State [P0]

**Core answer**

> Controlled state is owned by the application and passed to the table with change handlers. It is useful when filters or pagination must sync with the URL, queries, or other controls. Uncontrolled internal state is simpler for isolated tables. I control only the state the surrounding product actually needs.

**Câu hỏi tiếng Việt:** Controlled và uncontrolled table state khác nhau thế nào?

**Trả lời tiếng Việt**

> Controlled state do app sở hữu, truyền vào table cùng change handlers, phù hợp khi sync URL/query/control khác. Internal state đơn giản hơn cho table isolated. Tôi chỉ control phần surrounding product thật sự cần.

### 24. How Do You Make a Complex Table Performant? [P0]

**Core answer**

> I first choose the correct data strategy: server pagination for large remote data or client processing for a bounded set. Then I stabilize column definitions, avoid expensive cell work, limit rerender subscriptions, and virtualize rows only when rendering volume is the real bottleneck. Virtualization improves DOM cost but adds complexity for measurement, focus, and accessibility.

**Câu hỏi tiếng Việt:** Bạn tối ưu complex table thế nào?

**Trả lời tiếng Việt**

> Chọn đúng data strategy trước, ổn định column definitions, tránh cell work đắt, giới hạn rerender subscription và chỉ virtualize khi render volume là bottleneck. Virtualization thêm complexity cho measurement, focus và accessibility.

### 25. Sorting and Filtering: Client or Server? [P0]

**Core answer**

> All related operations should use a consistent dataset. If pagination is server-side, sorting and filtering normally belong on the server too; otherwise, the user sorts only the current page and receives misleading results. Client-side operations are correct when the full intended dataset is loaded.

**Câu hỏi tiếng Việt:** Sorting và filtering nên ở client hay server?

**Trả lời tiếng Việt**

> Mọi operation liên quan phải dùng cùng dataset. Nếu pagination ở server thì sort/filter cũng thường ở server; nếu không user chỉ sort current page và kết quả gây hiểu nhầm. Client operations đúng khi full intended dataset đã tải.

### 26. How Do You Keep Columns Maintainable? [P1]

**Core answer**

> I define typed column metadata near the feature, keep domain formatting in reusable formatters or cells, and avoid embedding unrelated mutations inside render functions. Column IDs must stay stable for visibility and sorting. Generic table primitives handle mechanics, while feature columns own domain meaning.

**Câu hỏi tiếng Việt:** Bạn giữ column definitions maintainable thế nào?

**Trả lời tiếng Việt**

> Định nghĩa typed column metadata gần feature, giữ domain formatting trong formatter/cell tái sử dụng và tránh mutation không liên quan trong render. Column IDs phải ổn định. Generic primitive xử lý mechanics, feature columns giữ domain meaning.

### 27. What Accessibility Work Does a Headless Table Need? [P0]

**Core answer**

> I start with semantic table elements when the content is tabular, provide proper headers and accessible names for controls, preserve keyboard access, expose sort direction, and avoid color-only status. If virtualization changes semantics, I test with keyboard and assistive technology rather than assuming the library solved it.

**Câu hỏi tiếng Việt:** Headless table cần làm gì cho accessibility?

**Trả lời tiếng Việt**

> Dùng semantic table khi data thật sự tabular, header đúng, controls có accessible names, keyboard access, expose sort direction và không dùng color-only status. Nếu virtualize làm thay đổi semantics, phải test bằng keyboard/assistive technology.

## QRTable State Summary / Tóm Tắt State Trong QRTable

> In QRTable, TanStack Query owns remote menus, tables, orders, bills, and related mutations. Zustand is used for focused client-owned state such as auth hydration and some POS interaction state, while the Customer App uses a scoped session provider for its session lifecycle. Socket.io events validate scope and trigger targeted cache updates or invalidation, with recovery refetching when connectivity returns.

**Truth guardrail:** The exact ownership varies by feature. Inspect the current hook before claiming every screen follows one perfect pattern.

## Sources / Nguồn

- [TanStack Query important defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults)
- [TanStack Query optimistic updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [TanStack Table guides](https://tanstack.com/table/v8/docs/guide/introduction)
- [TanStack Table pagination](https://tanstack.com/table/v8/docs/guide/pagination)
