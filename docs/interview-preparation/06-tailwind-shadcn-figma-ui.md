# Figma, Tailwind, shadcn/ui, and Responsive UI — Simple Answers

> Cách nhớ phần này: **understand the design → reuse the system → build mobile first → compare → test all states**.

## Figma and Responsive UI / Figma và Giao Diện Responsive

## 1. How Do You Translate a Figma Design into Code? [P0]

**Simple English answer**

> First, I understand the user flow and inspect spacing, colors, typography, components, and responsive behavior in Figma. Then I reuse existing design tokens and UI components. I build the small-screen structure first, add interactions and data states, and finally compare the result with Figma at the same screen sizes.

**Câu hỏi tiếng Việt:** Bạn chuyển thiết kế Figma thành code như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên, tôi hiểu user flow rồi kiểm tra spacing, color, typography, component và responsive behavior trong Figma. Sau đó, tôi tái sử dụng design token và UI component hiện có. Tôi xây cấu trúc màn hình nhỏ trước, thêm interaction và data state, rồi so sánh kết quả với Figma ở cùng kích thước màn hình.

## 2. What Does Pixel-Perfect Mean to You? [P0]

**Simple English answer**

> Pixel-perfect means the implementation follows the design closely in spacing, size, color, typography, and interaction. It must also work with real content and different screen sizes. I do not force one fixed screenshot onto every device. The design intent and responsive behavior are more important.

**Câu hỏi tiếng Việt:** Pixel-perfect có nghĩa gì với bạn?

**Câu trả lời tiếng Việt**

> Pixel-perfect nghĩa là implementation bám sát thiết kế về spacing, size, color, typography và interaction. Nó cũng phải hoạt động với content thật và nhiều kích thước màn hình. Tôi không ép một screenshot cố định lên mọi device; design intent và responsive behavior quan trọng hơn.

## 3. What Do You Inspect in Figma Before Coding? [P0]

**Simple English answer**

> I check the layout grid, auto layout, spacing, text styles, colors, reusable components, variants, breakpoints, and assets. I also check the prototype and look for loading, empty, error, disabled, hover, and focus states. Missing states become questions for the designer or product owner.

**Câu hỏi tiếng Việt:** Bạn kiểm tra gì trong Figma trước khi code?

**Câu trả lời tiếng Việt**

> Tôi kiểm tra layout grid, auto layout, spacing, text style, color, reusable component, variant, breakpoint và asset. Tôi cũng xem prototype và tìm các state loading, empty, error, disabled, hover, focus. State còn thiếu sẽ trở thành câu hỏi cho designer hoặc product owner.

## 4. How Do You Validate Visual Accuracy? [P0]

**Simple English answer**

> I open the implementation and Figma at the same viewport size and compare them side by side. I check the large layout first, then spacing, fonts, colors, and small details. I also test other screen sizes, long content, keyboard use, and real loading or error states.

**Câu hỏi tiếng Việt:** Bạn kiểm tra độ chính xác của UI như thế nào?

**Câu trả lời tiếng Việt**

> Tôi mở implementation và Figma ở cùng viewport rồi so sánh cạnh nhau. Tôi kiểm tra layout lớn trước, sau đó spacing, font, color và chi tiết nhỏ. Tôi cũng test kích thước màn hình khác, content dài, keyboard và loading hoặc error state thật.

## 5. How Do You Handle an Ambiguous Design? [P0]

**Simple English answer**

> I ask a focused question with two clear options and explain the effect of each option. If the answer cannot come in time, I choose the safest option that is easy to change and record the assumption. I do not silently invent important business behavior.

**Câu hỏi tiếng Việt:** Bạn xử lý thiết kế chưa rõ ràng như thế nào?

**Câu trả lời tiếng Việt**

> Tôi đặt một câu hỏi cụ thể với hai lựa chọn rõ ràng và giải thích ảnh hưởng của mỗi lựa chọn. Nếu chưa thể nhận câu trả lời kịp thời, tôi chọn phương án an toàn, dễ thay đổi và ghi lại assumption. Tôi không tự ý tạo behavior nghiệp vụ quan trọng.

## 6. Explain Mobile-First Responsive Design [P0]

**Simple English answer**

> Mobile-first means I start with the smallest useful layout as the default. Then I add larger layouts with responsive breakpoints. This makes me decide what content is most important before adding more space. I test real device widths, not only the exact Figma frames.

**Câu hỏi tiếng Việt:** Mobile-first responsive design là gì?

**Câu trả lời tiếng Việt**

> Mobile-first nghĩa là tôi bắt đầu bằng layout nhỏ nhất nhưng vẫn sử dụng tốt làm mặc định. Sau đó tôi thêm layout lớn hơn bằng responsive breakpoint. Cách này buộc tôi xác định content nào quan trọng nhất trước khi có thêm không gian. Tôi test nhiều device width thật, không chỉ đúng frame trong Figma.

## 7. What Makes a Responsive Table Difficult? [P1]

**Simple English answer**

> A desktop table may have too many columns for a phone. I decide which columns are most important, then choose horizontal scrolling, hidden secondary columns, or a card layout. Important actions must still be easy to reach. I also keep headers and keyboard behavior accessible.

**Câu hỏi tiếng Việt:** Vì sao responsive table khó làm?

**Câu trả lời tiếng Việt**

> Desktop table có thể có quá nhiều column cho điện thoại. Tôi xác định column quan trọng rồi chọn horizontal scroll, ẩn column phụ hoặc chuyển thành card layout. Action quan trọng vẫn phải dễ sử dụng. Tôi cũng giữ header và keyboard behavior accessible.

## Tailwind CSS / Styling System

## 8. Why Tailwind CSS? [P0]

**Simple English answer**

> Tailwind helps me build UI quickly with a shared set of spacing, color, and responsive utilities. The styles stay close to the component, so I can see what affects it. It works best when the project also has clear design tokens and reusable component variants.

**Câu hỏi tiếng Việt:** Vì sao bạn dùng Tailwind CSS?

**Câu trả lời tiếng Việt**

> Tailwind giúp tôi xây UI nhanh với bộ utility thống nhất cho spacing, color và responsive. Style nằm gần component nên dễ thấy thứ gì đang ảnh hưởng nó. Tailwind hoạt động tốt nhất khi dự án còn có design token và reusable component variant rõ ràng.

## 9. How Do You Keep Tailwind Code Maintainable? [P0]

**Simple English answer**

> I use design tokens instead of random values, keep class order consistent, and use helpers such as `cn` for conditional classes. Repeated UI behavior becomes a component or variant. I do not extract every small class list too early because that can make the code harder to follow.

**Câu hỏi tiếng Việt:** Bạn giữ Tailwind code dễ bảo trì như thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng design token thay vì random value, giữ thứ tự class nhất quán và dùng helper như `cn` cho conditional class. UI behavior lặp lại được chuyển thành component hoặc variant. Tôi không tách mọi class list nhỏ quá sớm vì có thể làm code khó theo dõi hơn.

## 10. What Are Tailwind v4 Theme Tokens? [P1]

**Simple English answer**

> Tailwind v4 can define theme values through CSS theme variables. These values create shared utilities for colors, fonts, spacing, and breakpoints. I use semantic names such as `background`, `primary`, or `danger` so components do not depend on one hard-coded color.

**Câu hỏi tiếng Việt:** Theme token trong Tailwind v4 là gì?

**Câu trả lời tiếng Việt**

> Tailwind v4 có thể định nghĩa theme value bằng CSS theme variable. Các value này tạo utility dùng chung cho color, font, spacing và breakpoint. Tôi dùng tên có ý nghĩa như `background`, `primary`, `danger` để component không phụ thuộc một hard-coded color cụ thể.

## shadcn/ui and Component Design / Thiết Kế Component

## 11. Why shadcn/ui? [P0]

**Simple English answer**

> shadcn/ui gives us accessible component code that we own inside the project. It is easy to style with Tailwind and adjust for the product. I use it as a good starting point, not as a finished design system. I still review behavior, accessibility, and product requirements.

**Câu hỏi tiếng Việt:** Vì sao bạn dùng shadcn/ui?

**Câu trả lời tiếng Việt**

> shadcn/ui cung cấp component code có accessibility mà dự án trực tiếp sở hữu. Nó dễ style bằng Tailwind và điều chỉnh theo sản phẩm. Tôi dùng nó làm điểm bắt đầu tốt chứ không xem là design system hoàn chỉnh. Tôi vẫn review behavior, accessibility và product requirement.

## 12. How Is shadcn Different from a Traditional Component Library? [P0]

**Simple English answer**

> A traditional library usually stays inside `node_modules`, and we use its public props. With shadcn, the component source is added to our project, so we can change it directly. This gives more control, but we also become responsible for keeping the component clean and accessible.

**Câu hỏi tiếng Việt:** shadcn khác traditional component library như thế nào?

**Câu trả lời tiếng Việt**

> Traditional library thường nằm trong `node_modules` và ta sử dụng public props của nó. Với shadcn, source code của component được thêm vào dự án nên có thể sửa trực tiếp. Cách này cho nhiều quyền kiểm soát hơn nhưng team cũng phải chịu trách nhiệm giữ component sạch và accessible.

## 13. How Do You Customize a shadcn Component Safely? [P0]

**Simple English answer**

> I first understand the primitive behavior and accessibility. Then I change styles through tokens and clear variants instead of breaking the internal behavior. After the change, I test keyboard use, focus, disabled state, screen sizes, and the important product states.

**Câu hỏi tiếng Việt:** Bạn customize shadcn component an toàn như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi hiểu behavior và accessibility của primitive. Sau đó tôi thay đổi style bằng token và variant rõ ràng thay vì phá internal behavior. Sau khi sửa, tôi test keyboard, focus, disabled state, screen size và các product state quan trọng.

## 14. What Is Component Composition? [P0]

**Simple English answer**

> Composition means building a larger UI from small components with clear jobs. For example, a dialog can receive a trigger, content, and actions as children. This is often easier to extend than one component with many boolean props.

**Câu hỏi tiếng Việt:** Component composition là gì?

**Câu trả lời tiếng Việt**

> Composition là xây một UI lớn từ các component nhỏ có nhiệm vụ rõ ràng. Ví dụ, dialog có thể nhận trigger, content và action qua children. Cách này thường dễ mở rộng hơn một component có quá nhiều boolean prop.

## 15. When Should You Create a Shared Component? [P0]

**Simple English answer**

> I create a shared component when the same UI pattern appears in several places and its behavior is stable. A button or form field is a good example. If the pattern is used only once or the requirements are still changing, I keep it inside the feature first.

**Câu hỏi tiếng Việt:** Khi nào nên tạo shared component?

**Câu trả lời tiếng Việt**

> Tôi tạo shared component khi cùng một UI pattern xuất hiện ở nhiều nơi và behavior đã ổn định. Button hoặc form field là ví dụ tốt. Nếu pattern chỉ dùng một lần hoặc requirement còn thay đổi, tôi giữ nó trong feature trước.

## Accessibility and UI States / Accessibility và Trạng Thái UI

## 16. What Is Semantic HTML? [P0]

**Simple English answer**

> Semantic HTML means using elements that describe their real purpose, such as `button`, `nav`, `main`, `form`, and `table`. It helps browsers, screen readers, keyboard users, and search engines understand the page. I do not use a clickable `div` when a button is correct.

**Câu hỏi tiếng Việt:** Semantic HTML là gì?

**Câu trả lời tiếng Việt**

> Semantic HTML là dùng element mô tả đúng mục đích như `button`, `nav`, `main`, `form`, `table`. Nó giúp browser, screen reader, keyboard user và search engine hiểu page. Tôi không dùng clickable `div` khi `button` mới là element đúng.

## 17. What Is Your Accessibility Checklist? [P0]

**Simple English answer**

> I check semantic HTML, keyboard access, visible focus, labels, error messages, color contrast, heading order, and image alt text. I also make sure status is not shown by color alone. For important flows, I test with only the keyboard and basic screen-reader tools.

**Câu hỏi tiếng Việt:** Accessibility checklist của bạn gồm những gì?

**Câu trả lời tiếng Việt**

> Tôi kiểm tra semantic HTML, keyboard access, focus nhìn thấy được, label, error message, color contrast, thứ tự heading và alt text của image. Tôi cũng bảo đảm status không chỉ được thể hiện bằng màu. Với flow quan trọng, tôi test chỉ bằng keyboard và screen-reader tool cơ bản.

## 18. When Should You Use ARIA? [P0]

**Simple English answer**

> I use native HTML first because it already has useful behavior and meaning. I add ARIA when a custom component needs information that native HTML cannot provide. ARIA does not add keyboard behavior by itself, so I still implement and test the interaction.

**Câu hỏi tiếng Việt:** Khi nào nên dùng ARIA?

**Câu trả lời tiếng Việt**

> Tôi dùng native HTML trước vì nó đã có behavior và meaning hữu ích. Tôi thêm ARIA khi custom component cần thông tin mà native HTML không cung cấp. ARIA không tự thêm keyboard behavior nên tôi vẫn phải implement và test interaction.

## 19. How Do You Handle Loading, Empty, Error, and Success States? [P0]

**Simple English answer**

> I design these states as part of the feature, not after the happy path. Loading should show what is happening. Empty state should explain the next action. Error state should help recovery. Success should update the right UI and give feedback without blocking the user.

**Câu hỏi tiếng Việt:** Bạn xử lý loading, empty, error và success state thế nào?

**Câu trả lời tiếng Việt**

> Tôi thiết kế các state này như một phần của feature, không đợi làm xong happy path mới thêm. Loading phải cho biết chuyện gì đang xảy ra. Empty state nên chỉ bước tiếp theo. Error state nên giúp recovery. Success phải update đúng UI và phản hồi mà không làm gián đoạn người dùng.

## 20. Skeleton Versus Spinner [P1]

**Simple English answer**

> I use a skeleton when I know the shape of the content and want to keep the layout stable. I use a spinner for a short action or when the final shape is not known. For a button mutation, I usually show loading inside the button instead of blocking the whole page.

**Câu hỏi tiếng Việt:** Khi nào dùng skeleton và spinner?

**Câu trả lời tiếng Việt**

> Tôi dùng skeleton khi biết hình dạng content và muốn giữ layout ổn định. Tôi dùng spinner cho action ngắn hoặc khi chưa biết hình dạng kết quả. Với button mutation, tôi thường hiện loading bên trong button thay vì block toàn page.

## 21. How Do You Prevent Layout Shift? [P1]

**Simple English answer**

> I reserve space for images, media, and loading content. I give images a known size and use skeletons that match the final layout. I also avoid adding content above the user’s current position after the page has loaded.

**Câu hỏi tiếng Việt:** Bạn tránh layout shift như thế nào?

**Câu trả lời tiếng Việt**

> Tôi giữ sẵn không gian cho image, media và loading content. Tôi đặt size rõ ràng cho image và dùng skeleton gần giống final layout. Tôi cũng tránh thêm content phía trên vị trí hiện tại của người dùng sau khi page đã load.

## 22. How Do You Optimize Images and Fonts in Next.js? [P1]

**Simple English answer**

> I use `next/image` with correct sizes so the browser downloads a suitable image. I use `next/font` or well-configured local fonts to reduce layout shift. I only preload important assets and check the real network result instead of assuming the framework solved everything.

**Câu hỏi tiếng Việt:** Bạn tối ưu image và font trong Next.js như thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng `next/image` với size đúng để browser tải image phù hợp. Tôi dùng `next/font` hoặc local font được cấu hình tốt để giảm layout shift. Tôi chỉ preload asset quan trọng và kiểm tra network thật thay vì cho rằng framework đã tự giải quyết mọi thứ.

## 23. How Do You Implement Dark Mode? [P1]

**Simple English answer**

> I use semantic color tokens with CSS variables, for example background, text, border, and primary. Dark mode changes the token values instead of changing every component. I also check contrast, system preference, saved user choice, and the first page load to avoid a theme flash.

**Câu hỏi tiếng Việt:** Bạn triển khai dark mode như thế nào?

**Câu trả lời tiếng Việt**

> Tôi dùng semantic color token với CSS variable, ví dụ background, text, border và primary. Dark mode thay đổi value của token thay vì sửa từng component. Tôi cũng kiểm tra contrast, system preference, lựa chọn đã lưu và first page load để tránh theme flash.

## 24. How Do You Build Forms? [P0]

**Simple English answer**

> I start with clear labels, the correct input types, and a simple data model. I validate near the field for user feedback and validate again on the server for security. I show useful errors, keep entered data after failure, prevent accidental duplicate submit, and support keyboard use.

**Câu hỏi tiếng Việt:** Bạn xây form như thế nào?

**Câu trả lời tiếng Việt**

> Tôi bắt đầu bằng label rõ ràng, input type đúng và data model đơn giản. Tôi validate gần field để phản hồi cho user và validate lại ở server cho security. Tôi hiện error hữu ích, giữ dữ liệu đã nhập khi lỗi, tránh submit trùng và hỗ trợ keyboard.

## 25. How Would You Review a Figma-to-Code Pull Request? [P0]

**Simple English answer**

> I first check the user flow and all required states. Then I review semantic HTML, responsive behavior, design tokens, component reuse, accessibility, and data handling. Finally, I open the page, compare it with Figma, and test it at different sizes. A screenshot alone is not enough.

**Câu hỏi tiếng Việt:** Bạn review một Figma-to-code pull request như thế nào?

**Câu trả lời tiếng Việt**

> Đầu tiên tôi kiểm tra user flow và mọi state cần thiết. Sau đó tôi review semantic HTML, responsive behavior, design token, component reuse, accessibility và data handling. Cuối cùng, tôi mở page, so sánh với Figma và test ở nhiều size. Chỉ xem screenshot là chưa đủ.

## Applied in QRTable / Cách Tôi Áp Dụng UI Trong QRTable [PROJECT FOLLOW-UP]

> Khi nói về UI, bạn nên mô tả cả cách tổ chức component lẫn lý do phía sau. Đừng chỉ liệt kê “Tailwind, shadcn, responsive”.

### A. How Did You Set Up Tailwind and shadcn/ui for Two Different Frontend Apps?

**Simple English answer**

> QRTable has separate shadcn configuration for the two frontend apps because their runtimes are different. The Management App uses `rsc: true` because it runs on the Next.js App Router, while the Customer App uses `rsc: false` because it is a React/Vite SPA. Both apps use Tailwind v4, CSS variables, the same Radix Nova style, and Lucide icons. Each configuration points to the correct global CSS file and import aliases. The global CSS maps semantic tokens such as `background`, `foreground`, `primary`, `border`, and `destructive` to Tailwind utilities. This lets components use product meaning instead of repeating hard-coded colors, and it also makes light and dark themes easier to maintain.

**Câu hỏi tiếng Việt:** Bạn đã setup Tailwind và shadcn/ui cho hai frontend app khác nhau như thế nào?

**Câu trả lời tiếng Việt**

> QRTable có shadcn configuration riêng cho hai frontend app vì runtime của chúng khác nhau. Management App dùng `rsc: true` vì chạy trên Next.js App Router, còn Customer App dùng `rsc: false` vì là React/Vite SPA. Cả hai app dùng Tailwind v4, CSS variable, style Radix Nova và Lucide icon. Mỗi configuration trỏ đến đúng global CSS file và import alias của app. Global CSS map các semantic token như `background`, `foreground`, `primary`, `border` và `destructive` thành Tailwind utility. Nhờ vậy, component dùng ý nghĩa của sản phẩm thay vì lặp lại hard-coded color, đồng thời light và dark theme cũng dễ bảo trì hơn.

**Flow to remember / Luồng cần nhớ:** `components.json → global CSS variables → Tailwind semantic utilities → shadcn primitive → product component`

**Code evidence / Code thực tế:** [Management shadcn config](../../apps/management-app/components.json), [Customer shadcn config](../../apps/customer-pwa/components.json), [Management theme tokens](../../apps/management-app/src/app/globals.css), [Customer theme tokens](../../apps/customer-pwa/src/index.css)

### B. How Did You Decide What Should Be a Primitive, a Shared Component, or a Feature Component?

**Simple English answer**

> I used three levels. A primitive such as `Button`, `Badge`, or `Dialog` handles basic visual behavior and accessibility. If a primitive or a stable composition is useful across both apps, it can live in `@einvoice/frontend-ui`; for example, the shared `Button` has typed variants, and `ConfirmDialog` combines the alert-dialog parts into one reusable confirmation flow. A feature component stays inside its business feature when it contains domain meaning. For example, `TableStatusBadge` uses the shared `Badge`, but it maps a table status to the correct Vietnamese label and style inside the table feature. This structure gives us reuse without turning the shared library into a place for every one-off component.

**Câu hỏi tiếng Việt:** Bạn quyết định primitive, shared component và feature component như thế nào?

**Câu trả lời tiếng Việt**

> Tôi chia component thành ba level. Primitive như `Button`, `Badge` hoặc `Dialog` xử lý visual behavior và accessibility cơ bản. Nếu một primitive hoặc composition ổn định có ích cho cả hai app, nó có thể nằm trong `@einvoice/frontend-ui`; ví dụ, shared `Button` có typed variant, còn `ConfirmDialog` kết hợp các phần của alert dialog thành một confirmation flow dùng lại được. Feature component vẫn nằm trong business feature khi nó chứa ý nghĩa domain. Ví dụ, `TableStatusBadge` dùng shared `Badge`, nhưng nó map table status sang đúng label tiếng Việt và style ngay trong feature quản lý bàn. Cấu trúc này tạo reuse nhưng không biến shared library thành nơi chứa mọi component chỉ dùng một lần.

**Flow to remember / Luồng cần nhớ:** `accessible primitive → stable shared composition → domain-specific feature component → page`

**Code evidence / Code thực tế:** [shared UI exports](../../libs/frontend/ui/src/index.ts), [shared Button](../../libs/frontend/ui/src/components/ui/button.tsx), [shared ConfirmDialog](../../libs/frontend/ui/src/components/composites/confirm-dialog.tsx), [feature status badge](../../apps/management-app/src/features/tables/components/table-status-badge.tsx)

### C. How Did You Apply a Figma-to-Code Workflow in Real Work?

**Simple English answer**

> In my frontend internship, I translated Figma designs into responsive React screens, so I learned to begin with the user flow instead of copying isolated pixels. I inspect the layout, reusable patterns, typography, spacing, colors, assets, and missing states. Then I map the design to existing tokens and components, build the semantic structure, connect real data states, and compare the result with Figma at the same viewport sizes. I used the same implementation mindset in QRTable when building POS, management, and customer flows, although I should not claim that every QRTable screen came from a formal Figma file. If a design is unclear, I ask about the intended behavior instead of inventing a business rule.

**Câu hỏi tiếng Việt:** Bạn đã áp dụng Figma-to-code workflow trong công việc thực tế như thế nào?

**Câu trả lời tiếng Việt**

> Trong kỳ frontend internship, tôi đã chuyển Figma design thành các responsive React screen nên tôi học được cách bắt đầu từ user flow thay vì copy từng pixel rời rạc. Tôi kiểm tra layout, reusable pattern, typography, spacing, color, asset và những state còn thiếu. Sau đó, tôi map design vào token và component hiện có, xây semantic structure, kết nối data state thật rồi so sánh kết quả với Figma ở cùng viewport. Tôi dùng cùng implementation mindset đó khi xây các flow POS, management và customer trong QRTable, dù tôi không nên claim rằng mọi màn hình QRTable đều đến từ một Figma file chính thức. Nếu design chưa rõ, tôi hỏi về intended behavior thay vì tự tạo business rule.

**Flow to remember / Luồng cần nhớ:** `understand flow → inspect design → map tokens and components → build states → compare viewports → fix differences`

### D. How Did You Handle Responsive Layouts and Real UI States in QRTable?

**Simple English answer**

> I designed the two products for different working contexts. The Customer App uses a narrow mobile shell, safe bottom spacing, horizontally scrollable category filters, a two-column menu grid, and drawers for details and the cart. The Management App uses larger workspace shells, resizable panels, tables, and floor-plan views for staff. I also treat loading, error, empty, disabled, locked, and realtime connection states as part of the screen. For example, the menu page waits for session hydration, shows a retry action when the menu request fails, and disables ordering while a bill is being paid. This is more useful than making only the happy-path screenshot look correct.

**Câu hỏi tiếng Việt:** Bạn xử lý responsive layout và các UI state thực tế trong QRTable như thế nào?

**Câu trả lời tiếng Việt**

> Tôi thiết kế hai product theo hai bối cảnh sử dụng khác nhau. Customer App dùng mobile shell hẹp, chừa safe bottom spacing, category filter có thể scroll ngang, menu grid hai cột và drawer cho detail cùng cart. Management App dùng workspace shell lớn hơn, resizable panel, table và floor-plan view cho staff. Tôi cũng xem loading, error, empty, disabled, locked và realtime connection state là một phần của screen. Ví dụ, menu page đợi session hydrate, hiện action thử lại khi request menu lỗi và disable việc đặt món khi bill đang thanh toán. Cách làm này hữu ích hơn việc chỉ khiến happy-path screenshot trông đúng.

**Flow to remember / Luồng cần nhớ:** `usage context → responsive structure → real data states → accessible interaction → verify on several widths`

**Code evidence / Code thực tế:** [customer mobile shell](../../apps/customer-pwa/src/components/layout/mobile-shell.tsx), [customer menu states](../../apps/customer-pwa/src/pages/menu-page.tsx), [management table workspace](../../apps/management-app/src/features/tables/index.tsx)

**Honest boundary / Giới hạn cần nói thật:** Do not claim formal visual-regression testing or perfect Figma accuracy for QRTable unless you can show that evidence. You can confidently describe the workflow, responsive implementation, reusable UI system, and real data states that exist in the code.

## Sources / Nguồn

- [Tailwind responsive design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind theme variables](https://tailwindcss.com/docs/theme)
- [shadcn/ui documentation](https://ui.shadcn.com/docs)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
