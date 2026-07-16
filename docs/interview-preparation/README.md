# VILIHA Interview Preparation Hub / Kho Ôn Phỏng Vấn VILIHA

> Candidate: Võ Đình Minh Quân
>
> Role: Front-End Developer (Next.js)
>
> Interview style: React/Next.js fundamentals, practical experience, project discussion and team fit
>
> Language: Simple spoken English with natural Vietnamese explanations

Thư mục có nhiều answer bank để tra cứu, nhưng **không phải mọi file đều là curriculum bắt buộc**. Trước vòng onsite, Quân chỉ cần học một Core Pack, luyện một Mock và dùng các file còn lại để sửa đúng phần đang yếu.

## Start Here / Bắt Đầu Từ Đây

Thực hiện đúng ba bước:

1. Học [Friday Onsite Core Pack](11-friday-onsite-core-pack.md).
2. Đọc nhanh [English Survival Kit](02-english-survival-kit.md).
3. Đóng tài liệu và chạy [Mock 1](09-mock-interviews-and-last-minute-sheet.md).

Nếu một câu Mock chưa đạt, chỉ mở answer bank liên quan. Không đọc tuần tự từ file `00` đến `11`.

## Document Tiers / Ba Nhóm Tài Liệu

### Tier 1 — Required Before Friday / Bắt Buộc

| Document                                                                  | Use / Cách dùng                                                                                      |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Friday Onsite Core Pack](11-friday-onsite-core-pack.md)                  | Một self-introduction, 12 technical answers, 5 follow-ups, 4 team-fit answers và ownership guardrail |
| [English Survival Kit](02-english-survival-kit.md)                        | Luyện xin nhắc lại, xin thời gian suy nghĩ, xác nhận câu hỏi và giải thích flow bằng câu ngắn        |
| [Mock and Last-Minute Sheet](09-mock-interviews-and-last-minute-sheet.md) | Tự kiểm tra phản xạ; Mock 2 chỉ là optional pressure appendix                                        |

### Tier 2 — Lookup Only / Chỉ Mở Khi Cần

| Weak area / Phần đang yếu                                      | Open / Mở file                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Background, career direction, availability, salary             | [Personal and Career Answer Bank](01-personal-career-answer-bank.md)                                                                  |
| React components, rendering, state and effects                 | [JavaScript and React Fundamentals](03-javascript-react-fundamentals.md) — ưu tiên React Q16–Q30; không học JavaScript Q1–Q15 lúc này |
| App Router, Server/Client Components, rendering and build time | [Next.js App Router Deep Dive](04-nextjs-app-router-deep-dive.md)                                                                     |
| TanStack Query, Zustand and TanStack Table                     | [State, Query and Table Answer Bank](05-state-query-table-answer-bank.md)                                                             |
| Figma, Tailwind, shadcn/ui and responsive UI                   | [Tailwind, shadcn and Figma UI](06-tailwind-shadcn-figma-ui.md)                                                                       |
| QRTable decisions, architecture and code evidence              | [QRTable Frontend Defense](07-qrtable-frontend-defense.md)                                                                            |
| Clean code, debugging, AI and behavioral follow-ups            | [Quality and Behavioral Answer Bank](08-quality-testing-debugging-ai-behavioral.md)                                                   |

### Tier 3 — Reference Only / Không Cần Học Trước Onsite

| Document                                                         | Reason / Lý do                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [Master Plan and JD Analysis](00-master-plan-and-jd-analysis.md) | Giữ lại phân tích JD và evidence matrix; không phải spoken-answer curriculum |
| [Phone Screening Script](10-viliha-phone-screening-script.md)    | Vòng phone screening đã hoàn thành                                           |

## Current Interview Focus / Trọng Tâm Hiện Tại

Theo thông tin trực tiếp từ anh Quý, hãy ưu tiên:

1. React component design và rendering mindset.
2. Next.js App Router cùng Server/Client Component boundaries.
3. Cách tổ chức code theo feature và responsibility.
4. Cách gọi API và phân chia server state/client state.
5. TanStack Query, TanStack Table và Zustand trong thực tế.
6. Figma → Tailwind → shadcn/ui → responsive interface.
7. Development/build time khác runtime performance như thế nào.
8. Kinh nghiệm thật trong hai QRTable frontend apps.
9. Friendly, active, eager learner, communication và ownership.

Tạm thời không ưu tiên JavaScript/HTML/CSS trivia, testing theory, PWA internals, deep Microservices defense hoặc Next.js experimental features.

## Answer Format / Cấu Trúc Câu Trả Lời

Question banks đặt nội dung theo thứ tự:

1. English question.
2. Simple English answer bằng câu đầy đủ.
3. Câu hỏi tiếng Việt.
4. Câu trả lời tiếng Việt diễn đạt cùng ý.
5. Keywords, QRTable evidence hoặc honest limit khi cần.

Không học thuộc từng chữ. Hãy hiểu bản tiếng Việt, nhớ 3–5 English keywords rồi tự nói lại. Ưu tiên chủ thể rõ ràng như `I`, `we`, `the component`, `the app`, hoặc `the server`.

Khung nói mặc định:

```text
Direct answer → Main reason → Project example → Stop
```

## Emergency Study Order / Lịch Ôn Khi Chỉ Còn Vài Giờ

1. Nói self-introduction trong Core Pack ba lần.
2. Học 12 keyword chains rồi tự trả lời 12 technical questions.
3. Học bốn team-fit answers và điền Personal Ownership Guardrail.
4. Luyện ba English rescue lines trong file `02`.
5. Chạy Mock 1 trong file `09`.
6. Chỉ mở `03`–`08` cho câu có điểm 0 hoặc 1.
7. Chạy lại những câu yếu; không cần lặp toàn bộ Mock nếu thời gian ngắn.

## Stop Studying These for Now / Tạm Bỏ Khỏi Lịch Ôn

- JavaScript Q1–Q15, prototype, `this`, closure và browser lifecycle.
- HTML/CSS definition questions riêng lẻ.
- Cache Components, PPR, streaming và Server Actions chuyên sâu.
- TanStack Query race-condition/testing edge cases.
- Authentication, tenant isolation, Socket.io và optimistic cart internals.
- Detailed testing strategy, offline PWA và deployment internals.
- Mock 2 trước khi Mock 1 đạt điểm trung bình 2.

## Truth Guardrail / Ranh Giới Claim

Always separate:

- **I implemented:** phần Quân trực tiếp làm.
- **We designed:** quyết định của team hai người.
- **I integrated or reviewed:** phần Quân hiểu và kết nối nhưng không làm chính.
- **I would improve:** đề xuất chưa triển khai.

QRTable có bằng chứng mạnh về client-side data orchestration, state ownership, complex tables, responsive component composition, REST/Socket.io integration và Microservices integration. Không claim rằng mọi operational screen đều server-first, TanStack Query server hydration đã dùng rộng rãi, mọi build optimization đã được triển khai, hoặc Customer App đã là offline/installable PWA hoàn chỉnh.

## Definition of Ready / Khi Nào Dừng Học Nội Dung Mới

- [ ] Self-introduction dài không quá 60 giây.
- [ ] 12 technical answers không có câu nào bằng 0 điểm.
- [ ] Mỗi answer có direct answer và reason hoặc project example.
- [ ] Bốn team-fit answers có thể nói bằng simple English.
- [ ] Personal ownership đã được điền trung thực.
- [ ] Phân biệt được build time và runtime performance.
- [ ] Mock 1 đạt điểm trung bình ít nhất là 2.
- [ ] Salary `16M gross`, location và availability được nói nhất quán.
