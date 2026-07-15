# VILIHA Interview Preparation Hub / Kho Ôn Phỏng Vấn VILIHA

> Candidate: Võ Đình Minh Quân  
> Role: Front-End Developer (Next.js)  
> Language: English answers with Vietnamese coaching notes  
> Status: Ready for rehearsal

This directory is the actual study system for the VILIHA interview. The English blocks are designed to be spoken, not read like essays. Vietnamese notes explain the reasoning, guardrails, and likely follow-ups.

Thư mục này là kho tài liệu ôn luyện thực tế cho buổi phỏng vấn VILIHA. Phần tiếng Anh được viết để nói thành lời, không phải để đọc như bài luận. Ghi chú tiếng Việt giải thích tư duy, giới hạn claim và các hướng CEO có thể hỏi sâu.

## Study Map / Bản Đồ Tài Liệu

| Order | Document                                                                                        | Purpose / Mục đích                                                                                            | Priority  |
| ----: | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------- |
|     0 | [Master plan and JD analysis](00-master-plan-and-jd-analysis.md)                                | Scope, JD signals, evidence matrix, 24/48-hour schedule / Phạm vi, tín hiệu JD, ma trận bằng chứng và lịch ôn | Reference |
|     1 | [Personal and career answer bank](01-personal-career-answer-bank.md)                            | Self-introduction, motivation, career, availability, salary and background                                    | P0        |
|     2 | [English survival kit](02-english-survival-kit.md)                                              | Clarification, thinking time, recovery, disagreement and technical communication                              | P0        |
|     3 | [JavaScript and React fundamentals](03-javascript-react-fundamentals.md)                        | Browser, JavaScript, React mental models and performance                                                      | P0        |
|     4 | [Next.js App Router deep dive](04-nextjs-app-router-deep-dive.md)                               | Server/Client Components, rendering, caching, hydration, architecture, and React comparison                   | P0        |
|     5 | [State, Query and Table answer bank](05-state-query-table-answer-bank.md)                       | TanStack Query, TanStack Table, Zustand and state ownership                                                   | P0        |
|     6 | [Tailwind, shadcn and Figma UI](06-tailwind-shadcn-figma-ui.md)                                 | Pixel-perfect workflow, responsive UI, accessibility and component systems                                    | P0        |
|     7 | [QRTable frontend defense](07-qrtable-frontend-defense.md)                                      | Project-specific questions backed by current code                                                             | P0        |
|     8 | [Quality, testing, debugging, AI and behavioral](08-quality-testing-debugging-ai-behavioral.md) | Clean Design, DRY, verification, AI review and situational answers                                            | P0/P1     |
|     9 | [Mock interviews and last-minute sheet](09-mock-interviews-and-last-minute-sheet.md)            | Two full mock scripts, scoring and final review                                                               | Final     |

## Answer Format / Cấu Trúc Mỗi Câu

Most question banks use these layers:

1. **English question and Core answer:** the version used during the interview.
2. **Vietnamese question and answer:** the corresponding full translation using the same number.
3. **Deepening points:** optional details for follow-up questions.
4. **Evidence or coaching:** QRTable reference, risks, wording, or likely challenge.

Phần nên học thuộc là **Core answer** và 3–5 keywords. Trong mỗi answer bank, câu hỏi và câu trả lời tiếng Việt nằm ngay sau English Q&A tương ứng để có thể đọc song ngữ liên tục. Không học thuộc toàn bộ đoạn dài theo từng chữ; mục tiêu là giữ cấu trúc để vẫn nói được khi CEO đổi cách hỏi.

## Priority Rules / Quy Tắc Ưu Tiên

- **P0:** must answer clearly before the interview / bắt buộc trả lời rõ.
- **P1:** likely follow-up or differentiation / câu đào sâu hoặc tạo khác biệt.
- **P2:** useful only if time remains / chỉ học khi còn thời gian.
- A truthful partial answer is better than an invented implementation.
- Always separate **implemented**, **collaborated**, **studied**, and **proposed**.

## Recommended Rehearsal Loop / Vòng Luyện Tập

For each P0 question:

1. Read the Vietnamese coaching once.
2. Highlight five English keywords.
3. Speak the core answer without looking.
4. Record the answer; target 30–60 seconds.
5. Repeat with a differently worded question.
6. Add one concrete QRTable example when relevant.

Đạt yêu cầu khi câu trả lời có mở đầu trực tiếp, có reason hoặc trade-off, không overclaim và không cần dịch từng câu từ tiếng Việt trong đầu.

## Completion Checklist / Theo Dõi Tiến Độ

- [ ] Personal and career P0 answers can be delivered without notes.
- [ ] Ten English recovery phrases feel automatic.
- [ ] JavaScript/React P0 score is at least 80%.
- [ ] Next.js P0 score is at least 80%.
- [ ] Query/Table/state P0 score is at least 80%.
- [ ] UI/Figma workflow can be explained in three minutes.
- [ ] QRTable architecture can be explained in three and eight minutes.
- [ ] One behavioral mock and one technical mock are completed.
- [ ] Last-minute sheet is reviewed, then study stops.

## Truth Guardrail / Ranh Giới Claim

The current repository supports strong claims about client-side data orchestration, realtime updates, state ownership, responsive component composition, and integration testing. It does **not** support claiming that every operational screen is server-first, that Server Component hydration with TanStack Query is already implemented, or that the Customer App currently has verified offline/installable PWA behavior.

Codebase hiện tại cho phép claim mạnh về data orchestration phía client, realtime update, state ownership, responsive component composition và integration testing. Không claim rằng mọi màn hình vận hành đều server-first, đã có TanStack Query server hydration, hoặc Customer App đã có offline/installable PWA hoàn chỉnh.
