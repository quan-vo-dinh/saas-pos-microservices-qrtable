# Next.js App Router — Simple Interview Answers / Câu Trả Lời Phỏng Vấn Dễ Nói

> Mục tiêu của file này là **nói được**, không phải học thuộc một bài viết. Khi thiếu thời gian, hãy nhớ câu đầu tiên và hai ý chính. Các từ như `Server Component`, `hydration`, `cache`, `query` là technical terms nên giữ nguyên.
>
> QRTable Management App đang dùng Next.js 16.1.x và chưa bật Cache Components. Khi nói về caching, cần phân biệt tính năng chung của Next.js với những gì QRTable thật sự đang dùng.

## 1. What Is the App Router? [P0]

**Simple English answer**

> Basically, the App Router lets Next.js create routes from the `app` folder. When I add `app/dashboard/page.tsx`, Next.js creates the `/dashboard` page. A `layout.tsx` file can keep shared UI, like a sidebar, while the user moves between pages. It also gives me Server Components, loading UI, error UI, and server-side data fetching near the route.

**Câu hỏi tiếng Việt:** App Router là gì?

**Câu trả lời tiếng Việt**

> Về cơ bản, App Router cho Next.js tạo route từ thư mục `app`. Khi tôi thêm `app/dashboard/page.tsx`, Next.js tạo page `/dashboard`. File `layout.tsx` có thể giữ UI dùng chung, như sidebar, khi user chuyển giữa các page. Nó cũng cho tôi Server Component, loading UI, error UI và server-side data fetching gần route đó.

## 2. What Is the Difference Between Server and Client Components? [P0]

**Simple English answer**

> A Server Component runs on the server. It is useful for reading data and keeping the client JavaScript smaller. A Client Component is needed for state, effects, click events, and browser APIs. I normally start with Server Components and add Client Components where needed.

**Câu hỏi tiếng Việt:** Server Component và Client Component khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Server Component chạy ở server, phù hợp để đọc dữ liệu và giúp giảm JavaScript gửi xuống browser. Client Component cần thiết khi có state, effect, sự kiện click hoặc browser API. Tôi thường bắt đầu bằng Server Component rồi chỉ thêm Client Component ở nơi cần tương tác.

## 3. What Does `'use client'` Mean? [P0]

**Simple English answer**

> `'use client'` tells Next.js that this file starts a client-side part of the UI. I need it when the component uses state, effects, event handlers, or browser APIs. I place it as low as possible because a high client boundary can send more JavaScript to the browser.

**Câu hỏi tiếng Việt:** `'use client'` có nghĩa là gì?

**Câu trả lời tiếng Việt**

> `'use client'` cho Next.js biết file này bắt đầu một phần UI chạy phía client. Tôi dùng nó khi component cần state, effect, event handler hoặc browser API. Tôi đặt nó càng gần phần tương tác càng tốt để tránh gửi quá nhiều JavaScript xuống browser.

## 4. Can a Server Component Render a Client Component? [P0]

**Simple English answer**

> A Server Component can render a Client Component. For example, it can fetch a list of restaurant tables and render a Client Component that handles filters and click events. It passes the table data through serializable props. However, the Client Component should not directly import a Server Component as a normal client dependency.

**Câu hỏi tiếng Việt:** Server Component có thể render Client Component không?

**Câu trả lời tiếng Việt**

> Server Component có thể render một Client Component. Ví dụ, nó có thể fetch danh sách bàn rồi render một Client Component xử lý filter và click event. Nó truyền table data qua các prop có thể serialize. Tuy nhiên, Client Component không nên import trực tiếp Server Component như một dependency phía client.

## 5. Why Must Props Be Serializable? [P0]

**Simple English answer**

> Data must move from the server to the browser, so React needs a format that it can send and rebuild. Strings, numbers, arrays, and plain objects are usually fine. Functions, database connections, and many class objects cannot be passed as normal props.

**Câu hỏi tiếng Việt:** Vì sao props truyền từ server sang client phải serializable?

**Câu trả lời tiếng Việt**

> Vì dữ liệu phải được gửi từ server xuống browser nên React cần một định dạng có thể truyền và tạo lại được. String, number, array và object thông thường thường dùng được. Function, kết nối database và nhiều class object thì không thể truyền như props bình thường.

## 6. How Do You Choose a Server or Client Component? [P0]

**Simple English answer**

> I first ask whether the component needs state, effects, click events, or browser APIs. If not, I keep it as a Server Component. If yes, I make only that interactive part a Client Component. Data access and security checks should stay on the server when possible.

**Câu hỏi tiếng Việt:** Bạn chọn Server Component hay Client Component như thế nào?

**Câu trả lời tiếng Việt**

> Trước tiên, tôi xem component có cần state, effect, sự kiện click hoặc browser API không. Nếu không, tôi giữ nó là Server Component. Nếu có, tôi chỉ chuyển phần tương tác đó thành Client Component. Việc lấy dữ liệu và kiểm tra bảo mật nên ở server khi có thể.

## 7. What Are SSR, SSG, ISR, and CSR? [P0]

**Simple English answer**

> I usually compare them by asking where and when the page is created. With SSR, the server creates it for each request. With SSG, the page is created before a request and reused later. ISR also reuses a saved page, but it refreshes the page after some time. With CSR, the browser waits for JavaScript and creates the main UI there. Next.js can mix these approaches.

**Câu hỏi tiếng Việt:** SSR, SSG, ISR và CSR là gì?

**Câu trả lời tiếng Việt**

> Tôi thường so sánh chúng bằng cách hỏi page được tạo ở đâu và khi nào. Với SSR, server tạo page cho từng request. Với SSG, page được tạo trước khi có request rồi được sử dụng lại. ISR cũng dùng lại một page đã lưu, nhưng có thể refresh page sau một khoảng thời gian. Với CSR, browser đợi JavaScript rồi tạo phần UI chính ở đó. Next.js có thể kết hợp các cách này.

## 8. What Is Streaming? [P0]

**Simple English answer**

> With streaming, I do not need to wait for the slowest part of the page. The server can send the header and sidebar first, while a slow report still shows a Suspense fallback. This lets the user see and use the ready part of the UI earlier.

**Câu hỏi tiếng Việt:** Streaming là gì?

**Câu trả lời tiếng Việt**

> Với streaming, tôi không cần đợi phần chậm nhất của page. Server có thể gửi header và sidebar trước, trong khi report tải chậm vẫn hiện Suspense fallback. Nhờ vậy user có thể nhìn thấy và dùng phần UI đã sẵn sàng sớm hơn.

## 9. What Is Hydration? [P0]

**Simple English answer**

> Hydration is the process where React takes the HTML created on the server and makes it interactive in the browser. The server HTML lets the user see the page early. When JavaScript loads, React attaches event handlers, so buttons, forms, and other interactions can work.

**Câu hỏi tiếng Việt:** Hydration là gì?

**Câu trả lời tiếng Việt**

> Hydration là quá trình React lấy HTML được tạo trên server và làm cho nó có thể tương tác trong browser. HTML từ server giúp người dùng nhìn thấy trang sớm. Khi JavaScript được tải, React gắn các event handler để button, form và những tương tác khác có thể hoạt động.

## 10. How Do You Fix a Hydration Mismatch? [P0]

**Simple English answer**

> A hydration mismatch means the server HTML and the browser’s first render are different. I find the first different part and make both sides produce the same initial UI. For example, I move browser-only code into `useEffect`, use CSS for responsive UI, or pass the same initial value from the server.

**Câu hỏi tiếng Việt:** Bạn sửa hydration mismatch như thế nào?

**Câu trả lời tiếng Việt**

> Hydration mismatch nghĩa là server HTML và lần render đầu tiên trong browser khác nhau. Tôi tìm phần khác nhau đầu tiên rồi làm cho hai bên tạo ra cùng một initial UI. Ví dụ, tôi chuyển browser-only code vào `useEffect`, dùng CSS cho responsive UI hoặc truyền cùng một initial value từ server.

## 11. How Does Caching Work in QRTable’s Next.js Version? [P0]

**Simple English answer**

> For QRTable, I think about caching like this. By default, a `fetch` result is not reused for later requests because Cache Components is off. If public data changes slowly, I can choose `force-cache` or a revalidation time. So I first decide how fresh the data needs to be, and then I choose the cache policy.

**Câu hỏi tiếng Việt:** Caching hoạt động thế nào trong phiên bản Next.js của QRTable?

**Câu trả lời tiếng Việt**

> Với QRTable, tôi nghĩ về caching theo cách này. Mặc định, kết quả từ `fetch` không được dùng lại cho các request sau vì Cache Components đang tắt. Nếu public data ít thay đổi, tôi có thể chọn `force-cache` hoặc đặt thời gian revalidation. Vì vậy, trước tiên tôi xác định dữ liệu cần mới đến mức nào rồi mới chọn cache policy.

## 12. What Are Cache Components? [P1]

**Simple English answer**

> Cache Components are optional in newer Next.js versions. The idea is simple: with `use cache`, one part of a page can be reused while another part is created for each request. It also works with Partial Prerendering. QRTable does not enable it yet, so I can explain the idea, but I would not say that I implemented it.

**Câu hỏi tiếng Việt:** Cache Components là gì?

**Câu trả lời tiếng Việt**

> Cache Components là tính năng tùy chọn trong các phiên bản Next.js mới. Ý tưởng rất đơn giản: với `use cache`, một phần của page có thể được sử dụng lại còn phần khác vẫn được tạo theo từng request. Nó cũng hoạt động cùng Partial Prerendering. QRTable chưa bật tính năng này nên tôi có thể giải thích ý tưởng, nhưng không nói rằng mình đã triển khai nó.

## 13. What Is Revalidation? [P0]

**Simple English answer**

> I use revalidation when cached data needs to become fresh again. For example, a public plan list can be reused for five minutes, or a mutation can refresh it immediately after the data changes. I choose the method based on how fresh the business data needs to be.

**Câu hỏi tiếng Việt:** Revalidation là gì?

**Câu trả lời tiếng Việt**

> Tôi dùng revalidation khi dữ liệu đã cache cần mới lại. Ví dụ, public plan list có thể được sử dụng lại trong năm phút, hoặc một mutation có thể refresh nó ngay sau khi dữ liệu thay đổi. Tôi chọn cách làm dựa trên mức độ mới mà business data cần có.

## 14. What Is the Difference Between a Layout and a Template? [P1]

**Simple English answer**

> The main difference is how they handle state.
>
> A layout stays mounted during navigation. It does not re-render its parent structure, so the state and DOM are kept.
>
> - **Example:** In QRTable, we use layouts for the main dashboard sidebar and navigation topbar. When a user goes from "Tenants" to "Plans", the sidebar stays the same, and the search input value is not lost.
>
> A template creates a new instance on every navigation. It resets its state and runs `useEffect` again.
>
> - **Example:** We use templates when we need page transition animations, or when we want to log page view events every time the user enters a page. It is also useful for multi-step forms where we want the state to reset when navigating away.

**Câu hỏi tiếng Việt:** Layout và template khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Điểm khác biệt lớn nhất là cách chúng quản lý trạng thái (state).
>
> Layout được giữ nguyên (stay mounted) khi chuyển trang. Nó không render lại cấu trúc cha, giúp giữ nguyên state và DOM.
>
> - **Ví dụ (Case study):** Trong QRTable, layout dùng cho sidebar và topbar của dashboard. Khi chuyển từ trang "Tenants" sang "Plans", sidebar không bị nhấp nháy, và nội dung ô tìm kiếm (search input) không bị mất.
>
> Template tạo ra một instance hoàn toàn mới mỗi khi chuyển trang. Nó sẽ reset lại state và chạy lại các `useEffect`.
>
> - **Ví dụ (Case study):** Ta dùng template khi muốn làm hiệu ứng chuyển trang (page transition animations), hoặc cần ghi nhận lượt xem trang (log page view) mỗi khi người dùng click vào trang mới. Nó cũng hữu ích cho các biểu mẫu nhiều bước (multi-step form) khi bạn muốn dữ liệu tự động reset nếu người dùng chuyển trang khác.

## 15. What Are Route Groups? [P0]

**Simple English answer**

> A route group is a folder name inside parentheses, such as `(admin)`. It helps organize routes or give different areas different layouts. The group name does not appear in the URL. QRTable uses route groups for areas such as auth, POS, KDS, and admin.

**Câu hỏi tiếng Việt:** Route group là gì?

**Câu trả lời tiếng Việt**

> Route group là folder có tên nằm trong dấu ngoặc đơn, ví dụ `(admin)`. Nó giúp sắp xếp route hoặc dùng layout khác nhau cho từng khu vực. Tên group không xuất hiện trên URL. QRTable dùng route group cho auth, POS, KDS và admin.

## 16. What Do `loading.tsx`, `error.tsx`, and `not-found.tsx` Do? [P0]

**Simple English answer**

> `loading.tsx` shows UI while a route is loading. `error.tsx` catches an error for that route area and can provide a retry action. `not-found.tsx` shows the not-found UI. These files keep loading and error behavior close to the route.

**Câu hỏi tiếng Việt:** `loading.tsx`, `error.tsx` và `not-found.tsx` dùng để làm gì?

**Câu trả lời tiếng Việt**

> `loading.tsx` hiện giao diện trong lúc route đang tải. `error.tsx` bắt lỗi trong khu vực route đó và có thể cho phép thử lại. `not-found.tsx` hiện giao diện không tìm thấy. Các file này giúp đặt cách xử lý loading và error gần với route.

## 17. What Is the Difference Between a Route Handler and a Server Component? [P0]

**Simple English answer**

> A Server Component runs on the server to build HTML and UI, while a Route Handler acts like a mini backend controller in Next.js, creating API endpoints to return raw data like JSON or files. I use Server Components to display layouts and pages, and I use Route Handlers for custom callbacks, external webhooks, or file downloads. Because Server Components already run on the server, they should call databases or services directly instead of fetching from internal Route Handlers, which avoids slow and unnecessary HTTP requests.

**Câu hỏi tiếng Việt:** Route Handler và Server Component khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Server Component chạy trên server để tạo ra mã HTML và giao diện hiển thị, còn Route Handler hoạt động giống như một trình xử lý backend thu nhỏ của Next.js, tạo ra các API endpoint để trả về dữ liệu thuần như JSON hoặc file tải xuống. Tôi dùng Server Component để dựng các trang giao diện, và dùng Route Handler để nhận webhook từ bên thứ ba, callback hoặc xuất file Excel. Vì Server Component vốn dĩ đã chạy trên server, nó nên gọi trực tiếp database hoặc service nội bộ thay vì gửi request HTTP qua API của chính nó để tránh làm chậm hệ thống không đáng có.

## 18. When Would You Use a Server Action? [P1]

**Simple English answer**

> A Server Action lets a React form or component run a mutation on the server. It can make simple form flows easier. However, I still validate the input and check authentication and permission. QRTable already has a NestJS BFF, so I would use Server Actions only where they clearly help.

**Câu hỏi tiếng Việt:** Khi nào bạn dùng Server Action?

**Câu trả lời tiếng Việt**

> Server Action cho phép React form hoặc component chạy mutation ở server. Nó có thể làm các flow form đơn giản gọn hơn. Tuy nhiên, tôi vẫn phải validate input và kiểm tra đăng nhập, quyền truy cập. QRTable đã có NestJS BFF nên tôi chỉ dùng Server Action ở nơi nó thật sự có lợi.

## 19. How Do You Handle Authentication and Authorization in the App Router? [P0]

**Simple English answer**

> For staff authentication in QRTable, the flow starts with Keycloak and NextAuth. They confirm who the user is. Before the BFF returns private data or changes data, it checks the token, tenant, role, and permission. The route layer can redirect early, and the UI can hide unavailable actions, but the final authorization check stays on the server.

**Câu hỏi tiếng Việt:** Bạn xử lý authentication và authorization trong App Router như thế nào?

**Câu trả lời tiếng Việt**

> Với staff authentication trong QRTable, flow bắt đầu bằng Keycloak và NextAuth. Chúng xác nhận user là ai. Trước khi BFF trả private data hoặc thay đổi dữ liệu, nó kiểm tra token, tenant, role và permission. Route layer có thể redirect sớm và UI có thể ẩn action không được phép, nhưng authorization check cuối cùng vẫn nằm ở server.

## 20. What Is Proxy in Next.js 16 Good For? [P1]

**Simple English answer**

> In our current project, `proxy.ts` is mainly a small route guard. It runs before Next.js continues to the matched page. QRTable uses it to redirect users without a session and send each staff role to the correct area. I keep it lightweight, so I do not put business logic or the final permission check there. Older Next.js versions called this file Middleware.

**Câu hỏi tiếng Việt:** Proxy trong Next.js 16 phù hợp cho việc gì?

**Câu trả lời tiếng Việt**

> Trong project hiện tại, `proxy.ts` chủ yếu là một route guard nhỏ. Nó chạy trước khi Next.js tiếp tục xử lý page phù hợp. QRTable dùng nó để redirect user chưa có session và đưa từng staff role đến đúng khu vực. Tôi giữ Proxy nhẹ nên không đặt business logic hoặc permission check cuối cùng ở đó. Các phiên bản Next.js cũ gọi file này là Middleware.

## 21. How Do You Avoid Data-Fetching Waterfalls? [P0]

**Simple English answer**

> I first look at whether one request depends on another. If two requests are independent, I start them together with `Promise.all` instead of waiting for one and then starting the other. If request B needs the result of request A, only B should wait. I also fetch on the server when it removes an extra request from the browser.

**Câu hỏi tiếng Việt:** Bạn tránh data-fetching waterfall như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên, tôi xem một request có phụ thuộc request khác không. Nếu hai request độc lập, tôi bắt đầu chúng cùng lúc bằng `Promise.all` thay vì đợi request này xong mới chạy request kia. Nếu request B cần kết quả của request A thì chỉ B phải đợi. Tôi cũng fetch trên server khi cách đó loại bỏ được một request thừa từ browser.

## 22. How Do You Use Next.js with TanStack Query? [P0]

**Simple English answer**

> For a read-heavy page, I can use a Server Component to fetch the first data before the UI reaches the browser. If the client later needs refetching, mutations, or realtime updates, I can hydrate that data into TanStack Query and continue there. QRTable does not use this pattern widely, so I describe it as an improvement.

**Câu hỏi tiếng Việt:** Bạn kết hợp Next.js với TanStack Query như thế nào?

**Câu trả lời tiếng Việt**

> Với page chủ yếu đọc dữ liệu, tôi có thể dùng Server Component để fetch dữ liệu đầu tiên trước khi UI được gửi đến browser. Nếu client sau đó cần refetch, mutation hoặc realtime update, tôi có thể hydrate dữ liệu đó vào TanStack Query rồi tiếp tục ở client. QRTable chưa dùng rộng rãi pattern này nên tôi mô tả nó như một hướng cải thiện.

## 23. How Do You Reduce the Client Bundle? [P0]

**Simple English answer**

> When I reduce the client bundle, I first ask which code the browser really needs. I keep data work and static layout in Server Components, and I make only the interactive part a Client Component. I lazy-load heavy charts or editors when they are not needed immediately. Then I check the bundle report instead of guessing.

**Câu hỏi tiếng Việt:** Bạn giảm client bundle như thế nào?

**Câu trả lời tiếng Việt**

> Khi giảm client bundle, đầu tiên tôi xem browser thật sự cần phần code nào. Tôi giữ data work và static layout trong Server Component, rồi chỉ chuyển phần tương tác thành Client Component. Tôi lazy-load chart hoặc editor nặng nếu chưa cần dùng ngay. Sau đó, tôi kiểm tra bundle report thay vì đoán.

## 24. How Do You Handle SEO and Metadata? [P1]

**Simple English answer**

> For a public page, I add a clear title, description, semantic headings, and content that search engines can read. Next.js supports static and generated metadata. Private POS and admin pages are not SEO targets, so I focus more on speed, accessibility, and correct access.

**Câu hỏi tiếng Việt:** Bạn xử lý SEO và metadata như thế nào?

**Câu trả lời tiếng Việt**

> Với public page, tôi thêm title, description, heading có ý nghĩa và nội dung mà search engine có thể đọc. Next.js hỗ trợ metadata tĩnh hoặc tạo động. Các page POS và admin riêng tư không phải mục tiêu SEO nên tôi tập trung hơn vào tốc độ, accessibility và quyền truy cập.

## 25. How Do You Protect Server-Only Code? [P0]

**Simple English answer**

> I keep secrets, private environment variables, and database clients in server-only files. I never send them through props or expose them to browser code. I also validate every server mutation and check permission on the server. A hidden button is not security.

**Câu hỏi tiếng Việt:** Bạn bảo vệ server-only code như thế nào?

**Câu trả lời tiếng Việt**

> Tôi giữ secret, biến môi trường riêng tư và database client trong các file chỉ chạy ở server. Tôi không truyền chúng qua props hoặc để code browser truy cập. Tôi cũng validate mọi server mutation và kiểm tra quyền ở server. Ẩn button không phải là bảo mật.

## 26. Why Can a Provider Add Too Much Client JavaScript? [P1]

**Simple English answer**

> With providers, I try not to place one at the root if only one feature needs it. Otherwise, its JavaScript loads for a much larger part of the app. I place it close to the routes that use it. Server-rendered children can still pass through the provider, so it does not automatically make the whole app CSR.

**Câu hỏi tiếng Việt:** Vì sao provider có thể làm app dùng quá nhiều JavaScript phía client?

**Câu trả lời tiếng Việt**

> Với provider, tôi cố không đặt nó ở root nếu chỉ một feature cần nó. Nếu đặt ở root, JavaScript của nó phải load cho một phần app lớn hơn nhiều. Tôi đặt provider gần những route thật sự sử dụng nó. Server-rendered children vẫn có thể đi qua provider nên nó không tự động biến toàn bộ app thành CSR.

## 27. How Would You Improve QRTable’s App Router Usage? [P0]

**Simple English answer**

> I would measure the current pages first. Then I would add better route-level loading and error UI, review large client boundaries, and use server prefetch for suitable read-heavy pages. POS and KDS are realtime screens, so they will still need a lot of client-side logic.

**Câu hỏi tiếng Việt:** Bạn sẽ cải thiện cách QRTable dùng App Router như thế nào?

**Câu trả lời tiếng Việt**

> Tôi sẽ đo các page hiện tại trước. Sau đó, tôi sẽ cải thiện loading và error UI ở mức route, kiểm tra các client boundary lớn và dùng server prefetch cho những page chủ yếu đọc dữ liệu. POS và KDS là màn hình realtime nên vẫn cần khá nhiều logic phía client.

## React and Next.js Comparison / So Sánh React và Next.js

### 28. What Is the Difference Between React and Next.js? [P0]

**Simple English answer**

> React is a library for building user interfaces with components. Next.js is a framework built on React. It adds routing, server rendering, Server Components, backend endpoints, caching tools, and production setup. Next.js does not replace React. We still need to understand React first.

**Câu hỏi tiếng Việt:** React và Next.js khác nhau như thế nào?

**Câu trả lời tiếng Việt**

> React là library để xây dựng giao diện bằng component. Next.js là framework được xây trên React. Nó bổ sung routing, server rendering, Server Components, backend endpoint, công cụ caching và cấu hình production. Next.js không thay thế React; ta vẫn cần hiểu React trước.

### 29. Why Is React a Library and Next.js a Framework? [P0]

**Simple English answer**

> React mainly solves the UI problem. We normally choose other tools for routing, building, and server features. Next.js gives us a full structure and clear rules for these parts. That is why React is usually called a library and Next.js is called a framework.

**Câu hỏi tiếng Việt:** Vì sao React là library còn Next.js là framework?

**Câu trả lời tiếng Việt**

> React chủ yếu giải quyết phần UI. Ta thường tự chọn thêm công cụ cho routing, build và tính năng server. Next.js cung cấp một cấu trúc đầy đủ và các quy tắc rõ ràng cho những phần này. Vì vậy React thường được gọi là library còn Next.js là framework.

### 30. Can You Use React Without Next.js, and Next.js Without React? [P0]

**Simple English answer**

> We can use React without Next.js, for example with Vite. However, we cannot use Next.js without React because Next.js is built on React. A Next.js developer still needs to understand React state, effects, rendering, and component design.

**Câu hỏi tiếng Việt:** Có thể dùng React không cần Next.js và dùng Next.js không cần React không?

**Câu trả lời tiếng Việt**

> Chúng ta có thể dùng React mà không cần Next.js, ví dụ dùng React với Vite. Tuy nhiên, chúng ta không thể dùng Next.js mà không có React vì Next.js được xây trên React. Developer Next.js vẫn phải hiểu state, effect, rendering và cách thiết kế component trong React.

### 31. When Would You Choose React with Vite Instead of Next.js? [P0]

**Simple English answer**

> I choose React with Vite for a client-heavy app that already has a separate backend and does not need public SEO or server rendering. It is simpler for that case. I choose Next.js when the product needs its routing, server rendering, metadata, or server features.

**Câu hỏi tiếng Việt:** Khi nào bạn chọn React với Vite thay vì Next.js?

**Câu trả lời tiếng Việt**

> Tôi chọn React với Vite cho app thiên về client, đã có backend riêng và không cần public SEO hoặc server rendering. Cách này đơn giản hơn trong trường hợp đó. Tôi chọn Next.js khi sản phẩm cần routing, server rendering, metadata hoặc các tính năng server của nó.

### 32. How Is Routing Different in React/Vite and Next.js? [P0]

**Simple English answer**

> React itself does not include a router. In a Vite app, we normally add a library such as React Router and define routes in code. Next.js has built-in file-based routing. Folders and special files create routes, layouts, loading UI, and error UI.

**Câu hỏi tiếng Việt:** Routing trong React/Vite và Next.js khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Bản thân React không có router. Trong app Vite, ta thường thêm library như React Router và khai báo route bằng code. Next.js có sẵn file-based routing. Folder và các file đặc biệt tạo route, layout, loading UI và error UI.

### 33. How Is Data Fetching Different? [P0]

**Simple English answer**

> In a normal React/Vite SPA, the browser usually fetches the first data from an API. In Next.js, a Server Component can fetch data before sending the UI to the browser. We can still use TanStack Query on the client for updates, mutations, and refetching.

**Câu hỏi tiếng Việt:** Data fetching trong React/Vite và Next.js khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Trong React/Vite SPA thông thường, browser thường gọi API để lấy dữ liệu ban đầu. Trong Next.js, Server Component có thể lấy dữ liệu trước khi gửi UI xuống browser. Ta vẫn có thể dùng TanStack Query ở client cho update, mutation và refetch.

### 34. How Are Rendering and SEO Different? [P0]

**Simple English answer**

> A normal Vite SPA often sends a small HTML file and renders the main content after JavaScript loads. Next.js has built-in server rendering and static generation, so public content can be available earlier. This can help SEO, but good SEO still needs useful content, semantic HTML, and good performance.

**Câu hỏi tiếng Việt:** Rendering và SEO trong React/Vite và Next.js khác nhau thế nào?

**Câu trả lời tiếng Việt**

> Vite SPA thông thường gửi một HTML nhỏ rồi render nội dung chính sau khi JavaScript tải xong. Next.js có sẵn server rendering và static generation nên public content có thể xuất hiện sớm hơn. Điều này có thể giúp SEO, nhưng SEO tốt vẫn cần nội dung hữu ích, semantic HTML và performance tốt.

### 35. Does Next.js Replace a Backend? [P0]

**Simple English answer**

> Next.js can handle some backend work, but it does not replace a full backend in every system. It can create API endpoints, Server Actions, and simple server logic, which may be enough for a small product. A large system can still need separate services for business logic, background jobs, and scaling. QRTable uses NestJS services for those backend responsibilities.

**Câu hỏi tiếng Việt:** Next.js có thay thế backend không?

**Câu trả lời tiếng Việt**

> Next.js có thể xử lý một phần backend work, nhưng nó không thay thế full backend trong mọi hệ thống. Nó có thể tạo API endpoint, Server Action và server logic đơn giản; như vậy có thể đủ cho sản phẩm nhỏ. Hệ thống lớn vẫn có thể cần service riêng cho business logic, background job và scaling. QRTable dùng các service NestJS cho những trách nhiệm backend đó.

### 36. Is Next.js Always Faster Than React/Vite? [P0]

**Simple English answer**

> Next.js is not always faster than React with Vite. Speed depends on the product and the code. A small client app may be faster and simpler with Vite, while a public page may benefit from Next.js server rendering and less client JavaScript. I compare real loading time, bundle size, network requests, and server time.

**Câu hỏi tiếng Việt:** Next.js có luôn nhanh hơn React/Vite không?

**Câu trả lời tiếng Việt**

> Next.js không phải lúc nào cũng nhanh hơn React với Vite. Tốc độ phụ thuộc vào sản phẩm và cách viết code. Một client app nhỏ có thể nhanh và đơn giản hơn với Vite, trong khi public page có thể hưởng lợi từ server rendering và ít JavaScript phía client hơn trong Next.js. Tôi so sánh thời gian tải thật, bundle size, network request và thời gian server.

### 37. What Are the Disadvantages of Next.js? [P1]

**Simple English answer**

> Next.js adds more things to learn, such as server and client boundaries, caching rules, deployment, and version changes. This is useful when the product needs these features. For a simple internal SPA, the extra complexity may not be worth it.

**Câu hỏi tiếng Việt:** Nhược điểm của Next.js là gì?

**Câu trả lời tiếng Việt**

> Next.js có nhiều thứ phải học hơn, như ranh giới giữa server và client, quy tắc caching, deployment và thay đổi giữa các phiên bản. Những phần này có ích khi sản phẩm cần chúng. Với một internal SPA đơn giản, độ phức tạp thêm vào có thể không đáng.

### 38. Why Does QRTable Use Both Next.js and React/Vite? [P0]

**Simple English answer**

> The Management App has many layouts, admin areas, public content, and server features, so Next.js is a good fit. The Customer App is a focused mobile ordering flow with a separate backend. React with Vite keeps that app smaller and simpler. We chose the tool based on each product’s needs.

**Câu hỏi tiếng Việt:** Vì sao QRTable dùng cả Next.js và React/Vite?

**Câu trả lời tiếng Việt**

> Management App có nhiều layout, khu vực admin, public content và tính năng server nên Next.js phù hợp. Customer App tập trung vào flow đặt món trên mobile và đã có backend riêng. React với Vite giúp app đó nhỏ và đơn giản hơn. Chúng tôi chọn công cụ theo nhu cầu của từng sản phẩm.

## Build Time and Runtime Performance / Thời Gian Build và Hiệu Năng Runtime

### 39. What Is the Difference Between Build Time and Runtime Performance? [FRIDAY CORE]

**Simple English answer**

> Build time is the time the toolchain needs to compile and prepare the application before it runs. Runtime performance is what happens when the server handles a request or when the user opens and interacts with the page. A slow build and a slow page can have different causes. Before I optimize, I ask which problem we are discussing and measure that part.

**Câu hỏi tiếng Việt:** Build time khác runtime performance như thế nào?

**Câu trả lời tiếng Việt**

> Build time là thời gian toolchain cần để compile và chuẩn bị application trước khi nó chạy. Runtime performance là những gì xảy ra khi server xử lý request hoặc khi user mở và tương tác với page. Build chậm và page chậm có thể đến từ những nguyên nhân khác nhau. Trước khi tối ưu, tôi hỏi rõ đang nói về vấn đề nào rồi đo đúng phần đó.

**Useful clarification**

> Do you mean development and build time, or runtime performance in the browser?

### 40. How Would You Improve Development and Build Time in Next.js? [FRIDAY CORE]

**Simple English answer**

> I start by reproducing the slow build and measuring which step takes time. For a Next.js project, I check whether Turbopack and build caches are being used correctly. I restore the `.next/cache` folder in CI, avoid expensive barrel imports, keep Tailwind scanning focused, and transpile only the packages that need it. In an Nx monorepo, I also use task caching and build only affected projects when possible. I change the measured bottleneck instead of enabling many options without evidence.

**Câu hỏi tiếng Việt:** Bạn sẽ cải thiện development và build time trong Next.js như thế nào?

**Câu trả lời tiếng Việt**

> Tôi bắt đầu bằng việc tái hiện build chậm và đo bước nào đang tốn thời gian. Với Next.js project, tôi kiểm tra Turbopack và build cache đã được dùng đúng chưa. Tôi khôi phục folder `.next/cache` trong CI, tránh barrel import tốn kém, giới hạn phạm vi Tailwind scan và chỉ transpile package thật sự cần. Trong Nx monorepo, tôi cũng tận dụng task cache và chỉ build affected project khi có thể. Tôi thay đổi bottleneck đã đo được thay vì bật nhiều option mà chưa có bằng chứng.

**QRTable reality check**

> The Management App is configured for Turbopack inside the Nx workspace and has an explicit `transpilePackages` list. I can explain the optimization options, but I would measure the current build and verify cache behavior before claiming that every option is already implemented.

> Management App đã cấu hình Turbopack trong Nx workspace và có danh sách `transpilePackages` rõ ràng. Tôi có thể giải thích các hướng tối ưu, nhưng sẽ đo build hiện tại và kiểm tra cache behavior trước khi claim rằng mọi option đã được triển khai.

## Applied in QRTable / Cách Tôi Áp Dụng Next.js Trong QRTable [PROJECT FOLLOW-UP]

> Không cần học thuộc cả section này. Khi interviewer hỏi thêm “How did you use it in your project?”, hãy chọn đúng câu liên quan rồi trình bày theo thứ tự **decision → implementation → reason**.

### A. How Did You Organize the Management App with the App Router?

**Simple English answer**

> In QRTable, I organized the Management App with route groups such as `(auth)`, `(dashboard)`, `(pos)`, `(kds)`, and `(admin)`. These groups separate different work areas without adding the group names to the URL. Each group layout provides the correct application shell, while each `page.tsx` stays small and renders a feature component. For example, the POS page renders `LiveOrdersTable`, and the kitchen page renders `KdsBoard`. The detailed components, hooks, and services stay inside `src/features`. I used this structure to keep routing and layout code separate from business UI logic.

**Câu hỏi tiếng Việt:** Bạn đã tổ chức Management App bằng App Router như thế nào?

**Câu trả lời tiếng Việt**

> Trong QRTable, tôi tổ chức Management App bằng các route group như `(auth)`, `(dashboard)`, `(pos)`, `(kds)` và `(admin)`. Các group này tách từng khu vực làm việc nhưng không làm tên group xuất hiện trên URL. Layout của mỗi group cung cấp application shell phù hợp, còn mỗi file `page.tsx` được giữ nhỏ và chỉ render feature component. Ví dụ, trang POS render `LiveOrdersTable`, còn trang bếp render `KdsBoard`. Component, hook và service chi tiết được đặt trong `src/features`. Tôi chọn cấu trúc này để tách routing và layout khỏi business UI logic.

**Flow to remember / Luồng cần nhớ:** `URL → route group → layout shell → page → feature component`

**Code evidence / Code thực tế:** [root route](../../apps/management-app/src/app/page.tsx), [POS route](<../../apps/management-app/src/app/(pos)/pos/page.tsx>), [KDS route](<../../apps/management-app/src/app/(kds)/kds/kitchen/page.tsx>)

### B. How Did You Choose Server and Client Component Boundaries?

**Simple English answer**

> I kept the route and layout files as Server Components by default. On the public landing page, the server fetches pricing plans and landing information before it renders the page. For highly interactive areas such as POS and KDS, the server page stays thin and renders a Client Component that owns hooks, events, and realtime behavior. The root `Providers` component is also a Client Component because session, theme, TanStack Query, and auth hydration need React context and client-side hooks. I did not mark the whole application as client-side; I moved the client boundary only to the interactive part.

**Câu hỏi tiếng Việt:** Bạn đã chọn ranh giới giữa Server Component và Client Component như thế nào?

**Câu trả lời tiếng Việt**

> Tôi giữ các file route và layout là Server Component theo mặc định. Ở public landing page, server fetch pricing plan và landing information trước khi render page. Với các khu vực tương tác nhiều như POS và KDS, server page được giữ mỏng rồi render một Client Component chịu trách nhiệm cho hook, event và realtime behavior. Root `Providers` cũng là Client Component vì session, theme, TanStack Query và auth hydration cần React context cùng client-side hook. Tôi không biến toàn bộ application thành client-side; tôi chỉ đặt client boundary ở phần thật sự cần tương tác.

**Flow to remember / Luồng cần nhớ:** `Server page fetches or composes → serializable props → interactive Client Component`

**Code evidence / Code thực tế:** [landing Server Component](../../apps/management-app/src/app/page.tsx), [client providers](../../apps/management-app/src/app/providers.tsx)

### C. How Does Authentication and API Data Flow Through the Next.js App?

**Simple English answer**

> For staff users, Auth.js works with Keycloak to create the session. `AuthSessionHydrator` reads that session and stores the access token and user profile in a small Zustand auth store. A TanStack Query hook waits until this hydration is ready. Then its feature service calls `authApiClient`, which adds the access token and tenant ID before sending the request to the BFF. The Next.js proxy redirects unauthenticated users or users on the wrong work area, but I do not treat that redirect as the final security layer. The BFF and backend guards still verify authentication, roles, permissions, and tenant access.

**Câu hỏi tiếng Việt:** Authentication và API data đi qua Next.js app theo flow nào?

**Câu trả lời tiếng Việt**

> Với staff user, Auth.js làm việc với Keycloak để tạo session. `AuthSessionHydrator` đọc session đó rồi lưu access token và user profile vào một Zustand auth store nhỏ. TanStack Query hook sẽ đợi quá trình hydration này sẵn sàng. Sau đó, feature service gọi `authApiClient`; client này gắn access token và tenant ID trước khi gửi request đến BFF. Next.js proxy redirect user chưa đăng nhập hoặc đi vào sai khu vực làm việc, nhưng tôi không xem redirect đó là security layer cuối cùng. BFF và backend guard vẫn phải kiểm tra authentication, role, permission và tenant access.

**Flow to remember / Luồng cần nhớ:** `Keycloak session → AuthSessionHydrator → auth store → enabled query → feature service → authenticated client → BFF → backend service`

**Code evidence / Code thực tế:** [auth hydrator](../../apps/management-app/src/components/auth/auth-session-hydrator.tsx), [authenticated API client](../../apps/management-app/src/lib/api/authenticated-client.ts), [Next.js proxy](../../apps/management-app/src/proxy.ts)

### D. What Build-Time Decisions Are Already Used in the Management App?

**Simple English answer**

> The current Next.js configuration sets the Turbopack root to the Nx workspace, transpiles the internal workspace packages used by the app, and creates a standalone production output. These settings help the monorepo resolve shared packages and produce a deployable build, but I would not say that they automatically make every build fast. If the build becomes slow, I first compare cold and warm builds, check Nx and `.next` cache behavior, inspect expensive imports, and measure again after one change. This helps me optimize the real bottleneck instead of guessing.

**Câu hỏi tiếng Việt:** Management App hiện đã áp dụng những quyết định nào liên quan đến build time?

**Câu trả lời tiếng Việt**

> Next.js configuration hiện tại đặt Turbopack root ở Nx workspace, transpile các internal workspace package mà app sử dụng và tạo standalone production output. Các setting này giúp monorepo resolve shared package và tạo build có thể deploy, nhưng tôi không nói rằng chúng tự động làm mọi build nhanh. Nếu build chậm, trước tiên tôi so sánh cold build với warm build, kiểm tra cache của Nx và `.next`, xem lại import tốn chi phí rồi đo lại sau từng thay đổi. Cách này giúp tôi tối ưu bottleneck thật thay vì đoán.

**Flow to remember / Luồng cần nhớ:** `reproduce → measure → check cache and imports → change one cause → compare again`

**Code evidence / Code thực tế:** [Management App Next.js configuration](../../apps/management-app/next.config.ts)

## Rapid Scenario Questions / Câu Hỏi Tình Huống Nhanh

### A dashboard needs user data and interactive filters. What would you do?

> I would load the user and initial data on the server when it helps. Then I would put the interactive filters in a small Client Component. If the filters should survive a page refresh or be shared with another user, I would keep them in the URL.

**Câu hỏi tiếng Việt:** Dashboard cần dữ liệu người dùng và bộ lọc tương tác; bạn sẽ làm gì?

> Tôi sẽ load user và initial data trên server khi cách đó có lợi. Sau đó, tôi đặt interactive filter trong một Client Component nhỏ. Nếu filter cần được giữ lại sau khi refresh page hoặc cần chia sẻ cho user khác, tôi lưu chúng trong URL.

### A component reads `window.innerWidth` during render and causes a mismatch. What would you do?

> I would avoid reading `window` in the first render. I would use CSS for responsive layout when possible. If JavaScript is required, I would read the browser value after the component mounts.

**Câu hỏi tiếng Việt:** Component đọc `window.innerWidth` khi render và gây mismatch; bạn sẽ làm gì?

> Tôi sẽ không đọc `window` trong lần render đầu tiên. Tôi ưu tiên dùng CSS cho responsive layout. Nếu bắt buộc cần JavaScript, tôi đọc giá trị từ browser sau khi component đã mount.

### Public content changes every five minutes. What would you do?

> If a five-minute delay is acceptable, I would use a five-minute revalidation time. If an important edit must appear immediately, I would also add on-demand revalidation after the edit.

**Câu hỏi tiếng Việt:** Public content thay đổi mỗi năm phút; bạn sẽ làm gì?

> Nếu chậm tối đa năm phút là chấp nhận được, tôi đặt thời gian revalidation là năm phút. Nếu một thay đổi quan trọng phải xuất hiện ngay, tôi bổ sung on-demand revalidation sau khi chỉnh sửa.

## How to Study This File Tonight / Cách Học File Này Tối Nay

1. Hoàn thành [Friday Onsite Core Pack](11-friday-onsite-core-pack.md) trước; không học tuần tự toàn bộ file này.
2. Chỉ mở đúng câu liên quan khi một core answer còn yếu.
3. Những nhóm dễ cần tra cứu là Server/Client Components, App Router, API fetching, React versus Next.js và câu 39–40 về build time.
4. Tạm bỏ qua Cache Components, streaming, Server Actions, SEO, Proxy và caching edge cases nếu thời gian ngắn.
5. Khi luyện, hãy nhớ **direct answer + main reason + one QRTable example**, không học thuộc nguyên paragraph.

## Sources / Nguồn

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components)
- [Next.js Cache Components](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js local development performance](https://nextjs.org/docs/app/guides/local-development)
- [Next.js CI build caching](https://nextjs.org/docs/app/guides/ci-build-caching)
