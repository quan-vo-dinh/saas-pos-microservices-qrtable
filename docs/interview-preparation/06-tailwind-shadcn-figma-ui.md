# Tailwind, shadcn/ui, Figma, and Pixel-Perfect Delivery

> Pixel-perfect means faithful, responsive, accessible, and maintainable—not copying coordinates from one screenshot.

## 1. How Do You Translate a Figma Design into Code? [P0]

**Core answer**

> I first understand the user flow and inspect the design system: typography, colors, spacing, breakpoints, components, variants, and interaction states. Then I identify reusable structure, build the semantic layout, implement responsive behavior, and connect real data states. Finally, I compare against Figma at target widths and verify loading, empty, error, long-content, keyboard, and focus behavior. I ask the designer when the design is ambiguous instead of guessing silently.

**Keywords:** flow · tokens · components · responsive · states · visual QA

**Câu hỏi tiếng Việt:** Bạn chuyển thiết kế Figma thành code thế nào?

**Trả lời tiếng Việt**

> Tôi hiểu user flow và audit typography, colors, spacing, breakpoints, components, variants, interaction states. Sau đó xác định reusable structure, dựng semantic responsive layout, nối data states và so sánh với Figma ở target widths, gồm loading, empty, error, long content, keyboard và focus.

## 2. What Does Pixel-Perfect Mean to You? [P0]

**Core answer**

> Pixel-perfect means the implementation preserves the design’s visual hierarchy, spacing, typography, alignment, and interaction intent across supported sizes. It is not a one-width screenshot copy. If exact pixels conflict with accessibility, dynamic content, or responsive behavior, I discuss the trade-off and preserve the product intent.

**Câu hỏi tiếng Việt:** Pixel-perfect có nghĩa gì với bạn?

**Trả lời tiếng Việt**

> Là giữ visual hierarchy, spacing, typography, alignment và interaction intent ở các kích thước hỗ trợ, không phải copy một screenshot. Nếu exact pixel xung đột accessibility, dynamic content hoặc responsive behavior, tôi thảo luận trade-off và giữ product intent.

## 3. What Do You Inspect in Figma Before Coding? [P0]

**Core answer**

> I inspect frame constraints, auto layout, spacing, typography styles, color variables, component variants, icons, assets, breakpoints, prototypes, and all visible states. I also look for missing cases such as long text, validation, permissions, and loading. Those questions affect architecture more than the final CSS syntax.

**Câu hỏi tiếng Việt:** Bạn kiểm tra gì trong Figma trước khi code?

**Trả lời tiếng Việt**

> Frame constraints, auto layout, spacing, typography styles, color variables, component variants, icons, assets, breakpoints, prototype và các case bị thiếu như long text, validation, permission, loading.

## 4. How Do You Validate Visual Accuracy? [P0]

**Core answer**

> I render the page at the same viewport as the design, compare screenshots or an overlay, and check large structural differences before small details. Then I test the supported responsive widths, content extremes, zoom, and browser behavior. I prefer repeatable visual checks over adjusting values from memory.

**Câu hỏi tiếng Việt:** Bạn kiểm tra visual accuracy thế nào?

**Trả lời tiếng Việt**

> Render cùng viewport với design, dùng screenshot/overlay, sửa structural differences trước detail nhỏ, rồi test supported widths, extreme content, zoom và browser behavior. Tôi ưu tiên repeatable visual checks hơn chỉnh bằng trí nhớ.

## 5. How Do You Handle an Ambiguous Design? [P0]

**Core answer**

> I identify the ambiguity and connect it to user impact. Then I ask a concrete question with options—for example whether a table should scroll, collapse, or switch to cards on mobile. If delivery cannot wait, I state the assumption, choose the most consistent existing pattern, and keep the implementation easy to adjust.

**Câu hỏi tiếng Việt:** Bạn xử lý thiết kế mơ hồ thế nào?

**Trả lời tiếng Việt**

> Xác định ambiguity và user impact, hỏi bằng options cụ thể như table sẽ scroll, collapse hay thành card. Nếu không thể chờ, tôi ghi assumption, chọn existing pattern nhất quán và giữ implementation dễ chỉnh.

## 6. Mobile-First Responsive Design [P0]

**Core answer**

> I start with the smallest supported layout and add complexity when space becomes available. Breakpoints should respond to content and product behavior, not arbitrary device names. I prefer flexible grid, flexbox, intrinsic sizing, and CSS media or container queries before JavaScript measurements.

**Câu hỏi tiếng Việt:** Mobile-first responsive design là gì?

**Trả lời tiếng Việt**

> Bắt đầu bằng layout nhỏ nhất rồi thêm complexity khi có space. Breakpoint theo content/product behavior, không chỉ device name. Ưu tiên grid, flex, intrinsic sizing, media/container queries trước JavaScript measurement.

## 7. What Makes a Responsive Table Difficult? [P1]

**Core answer**

> Tables contain relationships across columns, so simply stacking cells can destroy meaning. Depending on user tasks, I may preserve horizontal scrolling with sticky priority columns, hide optional columns, provide a card view, or move secondary data into expansion. The decision should preserve comparison and keyboard access.

**Câu hỏi tiếng Việt:** Vì sao responsive table khó?

**Trả lời tiếng Việt**

> Table thể hiện quan hệ giữa columns nên stack tùy tiện có thể mất meaning. Tùy task, tôi giữ horizontal scroll/sticky priority columns, ẩn optional columns, dùng card view hoặc expansion, đồng thời bảo vệ comparison và keyboard access.

## 8. Why Tailwind CSS? [P0]

**Core answer**

> Tailwind provides constrained utility primitives close to the component, which makes responsive variants, state styles, and design-token usage fast and consistent. It reduces arbitrary naming and stylesheet drift, but it does not design the system for us. I still extract repeated components, use tokens, and avoid unreadable duplicated class combinations.

**Câu hỏi tiếng Việt:** Vì sao dùng Tailwind CSS?

**Trả lời tiếng Việt**

> Tailwind cung cấp constrained utility gần component, giúp responsive/state/token nhanh và nhất quán, giảm arbitrary naming và stylesheet drift. Nhưng nó không tự thiết kế system; vẫn phải extract component, dùng token và tránh duplicate class khó đọc.

## 9. How Do You Keep Tailwind Code Maintainable? [P0]

**Core answer**

> I use semantic design tokens, consistent responsive patterns, component variants, and a class-merging utility. I extract a component when behavior or a visual contract repeats, not merely to shorten one class string. I avoid arbitrary values when an existing token expresses the design and keep conditional classes close to the state they represent.

**Câu hỏi tiếng Việt:** Bạn giữ Tailwind maintainable thế nào?

**Trả lời tiếng Việt**

> Dùng semantic design tokens, responsive patterns nhất quán, component variants và class-merging utility. Extract khi behavior/visual contract lặp lại, không chỉ để rút ngắn một string; tránh arbitrary value nếu token đã diễn đạt được.

## 10. Tailwind v4 Theme Tokens [P1]

**Core answer**

> Tailwind v4 supports CSS-first theme configuration, so design tokens can live as CSS variables and theme declarations rather than only a JavaScript config. In QRTable, global styles define semantic color and radius tokens, including light and dark values. Components consume semantic roles instead of hardcoded product colors.

**Câu hỏi tiếng Việt:** Theme tokens trong Tailwind v4 là gì?

**Trả lời tiếng Việt**

> Tailwind v4 hỗ trợ CSS-first configuration nên design tokens có thể nằm trong CSS variables/theme declarations. QRTable định nghĩa semantic color/radius tokens cho light/dark, component dùng semantic roles thay vì hardcoded product colors.

## 11. Why shadcn/ui? [P0]

**Core answer**

> shadcn/ui provides accessible component patterns as source code owned by the application rather than an opaque package API. That makes customization and composition easier, especially with Tailwind and Radix primitives. The trade-off is that we are responsible for updates, consistency, and reviewing local modifications.

**Câu hỏi tiếng Việt:** Vì sao dùng shadcn/ui?

**Trả lời tiếng Việt**

> shadcn cung cấp accessible component patterns dưới dạng source code app sở hữu, thuận lợi customize/composition với Tailwind/Radix. Đổi lại team chịu trách nhiệm update, consistency và review local modifications.

## 12. How Is shadcn Different from a Traditional Component Library? [P0]

**Core answer**

> With a traditional library, the application consumes versioned components from a dependency. With shadcn, selected component code is added to the codebase and becomes ours to maintain. That gives control over markup and styling but can create drift or duplicated variants if the team lacks conventions.

**Câu hỏi tiếng Việt:** shadcn khác component library truyền thống thế nào?

**Trả lời tiếng Việt**

> Library truyền thống cung cấp versioned components từ dependency. shadcn thêm code đã chọn vào repo để team sở hữu markup/style. Điều này linh hoạt hơn nhưng dễ drift hoặc duplicate variants nếu thiếu conventions.

## 13. How Do You Customize a shadcn Component Safely? [P0]

**Core answer**

> I preserve the accessible primitive behavior, ref forwarding where required, keyboard interactions, and composable API. I use semantic variants and tokens instead of feature-specific hardcoding in the shared primitive. Product behavior belongs in a feature wrapper; the base component should remain reusable and predictable.

**Câu hỏi tiếng Việt:** Bạn customize shadcn component an toàn thế nào?

**Trả lời tiếng Việt**

> Giữ accessible primitive behavior, ref forwarding khi cần, keyboard interactions và composable API. Dùng semantic variants/tokens, không hardcode feature logic trong shared primitive; product behavior để ở feature wrapper.

## 14. What Is Component Composition? [P0]

**Core answer**

> Composition builds complex UI from focused pieces with clear contracts. I prefer children, slots, and explicit subcomponents over one component with many booleans such as `isCompact`, `hasFooter`, and `isAdmin`. Composition keeps responsibilities visible and allows product-specific arrangement without duplicating low-level behavior.

**Câu hỏi tiếng Việt:** Component composition là gì?

**Trả lời tiếng Việt**

> Xây complex UI từ focused pieces có contract rõ. Tôi ưu tiên children, slots, explicit subcomponents hơn một component đầy boolean props. Composition làm responsibility nhìn thấy và cho phép arrangement riêng mà không duplicate low-level behavior.

## 15. When Should You Create a Shared Component? [P0]

**Core answer**

> I share a component when multiple consumers need the same semantic behavior and can agree on a stable contract. Two elements that only look similar may not belong together. In a monorepo, a shared library also increases coordination cost, so feature-specific components stay local until reuse is real.

**Câu hỏi tiếng Việt:** Khi nào tạo shared component?

**Trả lời tiếng Việt**

> Khi nhiều consumer cần cùng semantic behavior và thống nhất stable contract. Hai element chỉ nhìn giống nhau chưa chắc nên share. Trong monorepo, shared library có coordination cost nên feature component giữ local cho đến khi reuse thật.

## 16. Semantic HTML [P0]

**Core answer**

> Semantic HTML communicates structure and behavior to browsers and assistive technology. I prefer real buttons, links, headings, lists, forms, labels, and tables before adding ARIA to generic elements. Correct semantics improve keyboard behavior, accessibility, SEO, and test reliability with less custom code.

**Câu hỏi tiếng Việt:** Semantic HTML là gì?

**Trả lời tiếng Việt**

> Dùng button, link, heading, list, form, label, table đúng semantics trước khi thêm ARIA vào generic elements. Semantics đúng cải thiện keyboard, accessibility, SEO và test reliability với ít custom code.

## 17. Accessibility Checklist [P0]

**Core answer**

> I check keyboard reachability, visible focus, semantic names, form labels and errors, heading order, color contrast, reduced motion, target size, screen-reader announcements for important dynamic changes, and whether meaning depends only on color. I test actual interaction rather than treating an automated score as complete proof.

**Câu hỏi tiếng Việt:** Accessibility checklist của bạn gồm gì?

**Trả lời tiếng Việt**

> Keyboard reachability, visible focus, semantic name, label/error, heading order, contrast, reduced motion, target size, announcement cho dynamic change và không dùng màu làm meaning duy nhất. Automated score không thay interaction test.

## 18. ARIA: When Should You Use It? [P0]

**Core answer**

> I use native semantics first. ARIA is appropriate when a custom interaction has no sufficient native element or needs additional state and relationships. Incorrect ARIA can make accessibility worse, so custom widgets should follow established patterns and be keyboard-tested.

**Câu hỏi tiếng Việt:** Khi nào dùng ARIA?

**Trả lời tiếng Việt**

> Native semantics trước. Dùng ARIA khi custom interaction không có native element đủ hoặc cần state/relationship bổ sung. ARIA sai có thể làm accessibility tệ hơn nên custom widget phải theo established patterns và test keyboard.

## 19. How Do You Handle Loading, Empty, Error, and Success States? [P0]

**Core answer**

> I design them as product states from the beginning. Loading should preserve layout and communicate progress; empty state should explain what the user can do; errors should be actionable and preserve recoverable input; success should confirm the result without blocking the next task. Permission and stale-data states may also need separate treatment.

**Câu hỏi tiếng Việt:** Bạn thiết kế loading, empty, error và success states thế nào?

**Trả lời tiếng Việt**

> Loading giữ layout và báo progress; empty giải thích user có thể làm gì; error phải actionable và giữ recoverable input; success xác nhận mà không chặn task tiếp theo. Permission và stale-data có thể là state riêng.

## 20. Skeleton Versus Spinner [P1]

**Core answer**

> A skeleton is useful when the layout is predictable and helps reduce perceived waiting and layout shift. A spinner fits a compact action or unknown shape. Neither should hide an indefinite wait; slow operations need context, cancellation, or recovery.

**Câu hỏi tiếng Việt:** Skeleton và spinner dùng khi nào?

**Trả lời tiếng Việt**

> Skeleton phù hợp khi layout biết trước, giúp perceived wait và giảm layout shift. Spinner phù hợp action nhỏ hoặc shape chưa biết. Cả hai không được che indefinite wait; operation chậm cần context, cancel hoặc recovery.

## 21. How Do You Prevent Layout Shift? [P1]

**Core answer**

> I reserve dimensions for images and known async regions, use stable skeleton geometry, avoid inserting content above the current viewport unexpectedly, and load fonts and assets carefully. I verify with performance tools because visual stability is measurable, not only subjective.

**Câu hỏi tiếng Việt:** Bạn ngăn layout shift thế nào?

**Trả lời tiếng Việt**

> Reserve dimensions cho image/async region, dùng stable skeleton geometry, tránh chèn content bất ngờ phía trên viewport, quản lý font/assets và verify bằng performance tools.

## 22. How Do You Optimize Images and Fonts in Next.js? [P1]

**Core answer**

> I use responsive image sizing, modern formats through the framework pipeline, explicit dimensions, and priority only for true above-the-fold assets. For fonts, I use the framework’s font optimization, limited weights, and sensible fallbacks. The goal is to reduce transfer, layout shift, and render delay without degrading quality.

**Câu hỏi tiếng Việt:** Bạn tối ưu images và fonts trong Next.js thế nào?

**Trả lời tiếng Việt**

> Dùng responsive image sizing, modern formats qua framework, explicit dimensions và priority chỉ cho true above-the-fold. Với font, dùng framework optimization, ít weights và fallback hợp lý để giảm transfer, shift và render delay.

## 23. Dark Mode and Design Tokens [P1]

**Core answer**

> Components should consume semantic tokens such as background, foreground, muted, destructive, and border rather than hardcoded light-mode colors. The theme maps those roles to actual values. I verify contrast in both modes and avoid creating two unrelated style systems.

**Câu hỏi tiếng Việt:** Bạn thiết kế dark mode và token thế nào?

**Trả lời tiếng Việt**

> Component dùng semantic token như background, foreground, muted, destructive, border thay hardcoded light colors. Theme map roles thành values; kiểm tra contrast cả hai mode và không tạo hai style systems tách rời.

## 24. How Do You Build Forms? [P0]

**Core answer**

> I begin with semantic fields, labels, keyboard flow, and a typed validation contract. Client validation gives fast feedback, while the server validates again for trust. Errors should be associated with fields and preserve entered data. I separate reusable form controls from domain-specific submission behavior.

**Câu hỏi tiếng Việt:** Bạn xây form thế nào?

**Trả lời tiếng Việt**

> Bắt đầu semantic fields, labels, keyboard flow và typed validation contract. Client validation phản hồi nhanh; server validate lại vì trust. Errors gắn đúng field và giữ input; reusable controls tách khỏi domain submission.

## 25. How Would You Review a Figma-to-Code Pull Request? [P0]

**Core answer**

> I review requirement coverage and interaction states first, then semantic structure, responsive behavior, design-token usage, component boundaries, accessibility, data states, and visual comparison. I check whether the implementation introduced one-off primitives or duplicated an existing component. A screenshot alone is not enough; I interact with the page.

**Câu hỏi tiếng Việt:** Bạn review pull request Figma-to-code thế nào?

**Trả lời tiếng Việt**

> Review requirement và interaction states trước, sau đó semantic structure, responsive, tokens, component boundary, accessibility, data states và visual comparison. Kiểm tra có duplicate primitive hay không và trực tiếp interact với page, không chỉ xem screenshot.

## QRTable UI Evidence / Bằng Chứng QRTable

- Both applications use Tailwind v4 and shadcn-style component systems.
- The Management App config is RSC-aware; the Vite customer app is client-rendered.
- Shared UI primitives live in `libs/frontend/ui` while domain components stay within features.
- Global CSS defines semantic OKLCH-based tokens and theme values.
- POS and customer flows include responsive layouts and domain-specific loading/error states.

**Honest limitation:** The repository demonstrates production-oriented UI structure, but Quân should not claim measured pixel-perfect accuracy against every Figma screen or a formal visual-regression suite unless he can show that evidence.

## Three-Minute Figma Workflow / Bài Nói Ba Phút

> First, I read the user story and prototype so I understand what the screen must achieve. Then I audit Figma for tokens, repeated components, variants, auto layout, responsive constraints, and missing states. I map those patterns to existing application primitives before creating anything new.
>
> I build the semantic structure and smallest responsive layout first. Then I add larger breakpoints, interactions, and real API states. I keep data logic in feature hooks or services and make the visual component easy to review. For shadcn primitives, I preserve accessibility and place product-specific behavior in wrappers.
>
> Finally, I compare the implementation at matching viewports, test keyboard and content extremes, and verify loading, empty, error, and permission states. If the design does not define an important behavior, I ask a focused question and record the assumption instead of silently inventing it.

## Sources / Nguồn

- [Tailwind responsive design](https://tailwindcss.com/docs/responsive-design)
- [Tailwind theme variables](https://tailwindcss.com/docs/theme)
- [shadcn/ui documentation](https://ui.shadcn.com/docs)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
