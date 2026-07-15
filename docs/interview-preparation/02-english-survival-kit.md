# English Survival Kit / Bộ Phản Xạ Tiếng Anh Phỏng Vấn

> Goal: stay in control when vocabulary or response speed is limited.  
> Mục tiêu: giữ quyền kiểm soát câu trả lời khi phản xạ hoặc từ vựng chưa đủ nhanh.

Good interview English is not complicated English. Use short sentences, technical keywords, and visible structure.

Tiếng Anh phỏng vấn tốt không đồng nghĩa dùng câu phức tạp. Ưu tiên câu ngắn, đúng technical keyword và có cấu trúc.

## 1. The Default Answer Shape / Khung Trả Lời Mặc Định

Use **ARET**:

1. **Answer:** give the conclusion first.
2. **Reason:** explain why.
3. **Example:** connect to QRTable or previous work.
4. **Trade-off:** state a limitation or alternative.

**Example**

> I would keep remote order data in TanStack Query. The reason is that it has server-state lifecycle such as fetching, caching, invalidation, and retries. In QRTable, a Socket.io event can invalidate only the affected order query. The trade-off is that query keys and event mapping must be designed carefully, or the UI can become stale.

Khi bí, chỉ cần nói được bốn câu theo ARET. Không cố tạo một đoạn văn hoàn hảo.

## 2. Buying Thinking Time / Xin Thời Gian Suy Nghĩ

- “Let me think for a moment and structure the answer.”
- “That is a good question. I would break it into two parts.”
- “My first thought is…, but let me check the trade-off.”
- “I have not answered this exact scenario before. Let me reason through it.”

Avoid filler loops such as “uhm… actually… maybe…”. One explicit thinking sentence sounds more confident.

## 3. Confirming the Question / Xác Nhận Câu Hỏi

- “If I understand correctly, you are asking about the boundary between server state and UI state. Is that right?”
- “Do you mean the initial page render or updates after the page becomes interactive?”
- “Are we assuming the data is user-specific or public?”
- “Should I answer based on the current QRTable implementation or design an ideal solution?”
- “When you say mobile application, do you mean responsive web/PWA or native mobile?”

**Coaching tiếng Việt:** Clarifying question là dấu hiệu reasoning, không phải dấu hiệu yếu tiếng Anh.

## 4. Asking the Interviewer to Repeat or Slow Down / Xin Nhắc Lại

- “Could you please repeat the last part a little more slowly?”
- “I understood the first part, but I missed the condition after ‘when’. Could you repeat that condition?”
- “Could you rephrase the question? I want to make sure I answer the correct problem.”
- “I know the concept, but I may have missed one word. Are you asking about hydration?”

Ask specifically what was missed. Do not repeatedly say only “Pardon?”.

## 5. When You Know the Concept but Forget a Word / Biết Ý Nhưng Quên Từ

- “I do not remember the exact term, but I mean the process where React attaches behavior to server-rendered HTML.”
- “I may not use the precise word, so I will describe the data flow.”
- “Let me draw the components and arrows; that will make the idea clearer.”
- “The exact API name is not coming to me, but the responsibility belongs at this boundary.”

**Rule:** Describe responsibility and flow. Technical understanding matters more than recalling one API name.

## 6. When You Do Not Know / Khi Không Biết

Use three steps: admit → reason → verify.

> I have not implemented that feature directly, so I do not want to guess. My current understanding is that it works by […]. I would verify the exact behavior in the official documentation and with a small reproduction before using it in production.

> I do not know the exact answer. I would first check whether the problem is caused by rendering, network state, or cache state, then narrow it down with the browser tools and a minimal test.

Never end at “I don’t know.” Show the next responsible action.

## 7. Correcting Yourself / Tự Sửa Câu Trả Lời

- “Let me correct one part of my previous answer.”
- “I said server state, but in that example it is actually local UI state.”
- “That statement was too broad. A more accurate answer is…”
- “I need to distinguish the framework behavior from what QRTable currently implements.”

Self-correction increases trust when done quickly and precisely.

## 8. Moving from Theory to Evidence / Chuyển Sang Ví Dụ Thật

- “Let me connect that to QRTable.”
- “A concrete example is the customer cart flow.”
- “In the current codebase, the boundary is visible in…”
- “We made a similar trade-off in the POS screen.”
- “The current implementation does X; an improvement would be Y.”

This is the safest way to move the conversation toward Quân’s strength.

## 9. Explaining an Architecture / Trình Bày Kiến Trúc

Use this sequence:

> I will explain it from the user action to the final UI update. First, […]. Then, the frontend sends […]. The backend responds or publishes […]. The client validates the scope and updates […]. The main failure cases are […]. The trade-off is […].

Useful connectors:

- first / then / after that / finally
- because / therefore / however
- on the client / on the server
- the source of truth is…
- the responsibility belongs to…

## 10. Comparing Two Options / So Sánh Hai Phương Án

> Both options are valid, but they optimize for different things. Option A is better when […], while option B is better when […]. In this case, I would choose A because […]. The cost is […], and I would reconsider if […].

**Example opener:**

> React Context and Zustand can both share client state, but Context is often enough for low-frequency scoped state, while Zustand is convenient for independent subscriptions and actions.

## 11. Explaining a Bug / Giải Thích Bug

> The user-visible symptom was […]. I reproduced it under […]. Then I separated possible causes into UI state, network behavior, and backend data. The root cause was […]. I fixed it by […], and I verified it with […]. To prevent regression, I added or would add […].

Keywords: symptom · reproduction · hypothesis · root cause · fix · regression

## 12. Giving a Status Update / Báo Cáo Tiến Độ

> The UI and API integration are complete. I am currently verifying the error and responsive states. The main risk is that the API contract for […] is still unclear. I need confirmation by 2 PM to keep the delivery date; otherwise, I can complete the rest and isolate that part behind a temporary adapter.

Do not say only “I am still working on it.” State completed work, current work, risk, and request.

## 13. Reporting a Blocker / Báo Blocker

> I am blocked by the missing response contract for the payment status. I checked the existing documentation and current endpoint, but they disagree. I can continue the layout and local states, but I need the backend owner to confirm the source of truth before I implement the final mapping.

This demonstrates progress without silently guessing.

## 14. Disagreeing Respectfully / Phản Biện Lịch Sự

- “I see the benefit of that approach. My concern is…”
- “I may be missing some context, but this could create…”
- “Could we compare it against the requirement for…?”
- “I would prefer the smaller change first because it is easier to verify and roll back.”
- “If the priority is delivery speed, I agree. If long-term reuse is the priority, I would suggest…”

Disagree about risks and requirements, not about people.

## 15. Reviewing AI-Generated Code / Review Code AI Sinh

> I would not review AI-generated code differently from human code in terms of quality. I would first check whether it solves the correct requirement, then inspect architecture, types, state ownership, accessibility, security, performance, and tests. I pay special attention to confident-looking duplicated logic, unnecessary abstractions, stale APIs, and missing edge states. I accept only changes I can explain and verify.

## 16. Asking to Draw or Write / Xin Vẽ Sơ Đồ hoặc Code

- “Would it be okay if I draw a small data-flow diagram?”
- “I can explain this more clearly with a short example. May I write it down?”
- “Let me sketch the query key and event flow.”
- “I will use pseudocode so we can focus on the decision rather than syntax.”

## 17. Handling an Interruption / Khi Bị Ngắt Lời

- “Sure. The short answer is…”
- “Yes, I will focus on that part.”
- “Understood. The key trade-off is…”
- “I will stop there. Would you like the implementation detail or the reason?”

Do not restart the entire answer after interruption.

## 18. When the Interviewer Challenges Your Claim / Khi CEO Bắt Bẻ

> You are right that my first answer was too general. In the current QRTable implementation, […]. What I described after that is an improvement I would propose, not something already implemented.

> That is a fair concern. My assumption was […]. If that assumption is false, I would change the design by […].

This protects credibility. Do not defend an inaccurate claim just to appear confident.

## 19. Closing an Answer / Kết Thúc Câu Trả Lời

- “That is why I would choose this boundary.”
- “The main trade-off is consistency versus additional complexity.”
- “That is the current implementation; the next improvement would be…”
- “I can go deeper into the code path if that would be useful.”

A clear closing prevents rambling.

## 20. Technical Vocabulary Pack / Bộ Từ Vựng Kỹ Thuật

| Intent                     | Useful English          |
| -------------------------- | ----------------------- |
| nguồn dữ liệu chuẩn        | source of truth         |
| ranh giới trách nhiệm      | responsibility boundary |
| dữ liệu lỗi thời           | stale data              |
| làm mới đúng mục tiêu      | targeted invalidation   |
| cập nhật lạc quan          | optimistic update       |
| hoàn tác                   | rollback                |
| trạng thái dẫn xuất        | derived state           |
| trạng thái tạm thời của UI | ephemeral UI state      |
| đánh đổi                   | trade-off               |
| trường hợp biên            | edge case               |
| tái hiện lỗi               | reproduce the issue     |
| nguyên nhân gốc            | root cause              |
| ngăn lỗi quay lại          | prevent regression      |
| làm rõ yêu cầu             | clarify the requirement |
| hợp đồng API               | API contract            |
| tương thích ngược          | backward compatible     |
| tách biệt tenant           | tenant isolation        |
| nhất quán cuối cùng        | eventual consistency    |
| giảm dần chức năng an toàn | graceful degradation    |
| có thể bảo trì             | maintainable            |

## 21. Ten Lines to Make Automatic / Mười Câu Phải Thành Phản Xạ

1. “If I understand correctly, you are asking about…”
2. “Let me think for a moment and structure the answer.”
3. “The short answer is yes, because…”
4. “I would separate this into server state and UI state.”
5. “Let me connect that to QRTable.”
6. “The current implementation does X; an improvement would be Y.”
7. “I have not implemented that directly, so I do not want to guess.”
8. “Both options are valid, but they optimize for different things.”
9. “The main trade-off is…”
10. “Could you rephrase the last condition so I answer the correct problem?”

Practice these until they require no translation from Vietnamese.
