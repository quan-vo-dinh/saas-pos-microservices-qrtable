# Prompt cho session mới - Thực thi Plan 2 scope/tone refactor Chương 3, 5 và 7

> Mục đích: copy toàn bộ prompt trong file này vào một session AI mới để thực thi `docs/graduation-thesis-resources/chapter-03-05-07-scope-tone-refactor-plan.md` một cách an toàn, không làm mất claim guardrail và không đưa nhầm Technical Phase 6/observability vào khóa luận.
>
> Cập nhật: 2026-06-05.

---

## Prompt để dán vào session mới

````md
Bạn đang làm trong repo QRTable tại:

`/Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order`

Nhiệm vụ duy nhất của session này là thực thi Plan 2:

`docs/graduation-thesis-resources/chapter-03-05-07-scope-tone-refactor-plan.md`

Mục tiêu là refactor giọng phạm vi/giới hạn ở Chương 3, Chương 5 và Chương 7 sau khi Chương 1 đã có scope anchor. Không viết lại Chương 1. Không sửa Chương 4 hoặc Chương 6 trừ khi tôi yêu cầu riêng. Không thêm citation/source mới. Không sửa code.

## 0. Yêu cầu vận hành bắt buộc

- Trả lời và viết bằng tiếng Việt học thuật.
- Dùng `apply_patch` khi sửa file thủ công.
- Không revert thay đổi không do bạn tạo. Worktree đang có nhiều thay đổi khác, cứ bỏ qua nếu không thuộc task.
- Không dùng Python để đọc/ghi file khi `rg`, `sed`, `pdftotext`, `apply_patch` đủ dùng.
- Luôn chạy verification cuối session và cập nhật `docs/graduation-thesis-resources/thesis-workflow-plan.md`.
- Nếu gặp contradiction làm không thể sửa an toàn, dừng và hỏi tôi. Còn lại hãy tự xử lý.

## 1. Skill strategy

Trước khi sửa, đọc các skills sau:

```bash
npx openskills read zoom-out
npx openskills read grill-with-docs
npx openskills read doc-coauthoring
```
````

Cách dùng:

- `zoom-out`: dùng để giữ đúng vai trò từng chương:
  - Chương 1 = phạm vi đề tài.
  - Chương 3 = yêu cầu hệ thống.
  - Chương 5 = bằng chứng triển khai.
  - Chương 6 = đánh giá mức bằng chứng.
  - Chương 7 = kết luận, hạn chế còn lại, hướng phát triển.
- `grill-with-docs`: dùng như checklist tự audit contradiction/overclaim. Không cần hỏi tôi từng câu trừ khi có blocker thật.
- `doc-coauthoring`: dùng để polish giọng văn section-by-section, đặc biệt khi đổi câu phòng thủ sang câu học thuật tự tin hơn.

## 2. CodeGraph, Context7, browser và tra cứu tài liệu

### CodeGraph

Chạy CodeGraph trước khi sửa:

```bash
/Users/vodinhquan/.local/bin/codegraph status .
```

Expected: index up-to-date. CodeGraph chủ yếu phủ TypeScript/TSX/Python, không phủ đầy đủ `.tex/.md`, nên với nội dung khóa luận hãy dùng `rg` và đọc trực tiếp. Nếu cần kiểm chứng claim kỹ thuật từ code, dùng CodeGraph hoặc `rg` trên source thật, không suy đoán.

### Context7

Không dùng Context7 mặc định cho task này, vì đây là refactor văn bản nội bộ và không thêm claim framework/library mới. Chỉ dùng Context7 nếu bạn định viết claim mới về API/framework/library hiện tại, ví dụ NestJS, Next.js, Kafka client, Keycloak/OIDC library. Nếu dùng Context7, phải ưu tiên docs chính thức và ghi rõ lý do trong workflow. Dự kiến task này không cần Context7.

### Browser / web search

Không browse mặc định. Không thêm nguồn ngoài, số liệu, citation hoặc claim thị trường mới trong task này. Browser chỉ dùng nếu tôi yêu cầu kiểm chứng nguồn mới hoặc nếu bạn bắt buộc phải xác minh một fact hiện đại có rủi ro sai cao. Nếu phải browse:

- Chỉ dùng nguồn chính thức/primary source khi có thể.
- Không dùng blog/forum làm nguồn chính.
- Không thêm `references.bib` nếu chưa thật sự cần và chưa verify metadata.
- Với OpenAI/tool/API docs, chỉ dùng official docs.

### Tra cứu tài liệu nội bộ

Nguồn chính của task này là nội bộ repo:

- Plan phải thực thi:
  - `docs/graduation-thesis-resources/chapter-03-05-07-scope-tone-refactor-plan.md`
- Scope anchor đã có:
  - `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- Các chương cần sửa:
  - `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
  - `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
  - `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`
- Chương chỉ đọc để giữ claim policy:
  - `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- Handoff/current state:
  - `docs/graduation-thesis-resources/thesis-workflow-plan.md`
- Context nền:
  - `docs/graduation-thesis-resources/thesis-official-outline.md`
  - `docs/graduation-thesis-resources/thesis-evidence-map.md`
  - `docs/graduation-thesis-resources/thesis-source-backbone.md`

## 3. Bối cảnh hiện tại cần nhớ

Chương 1 đã được draft xong. Mục `Đối tượng và phạm vi nghiên cứu` hiện là scope anchor chính thức cho toàn khóa luận. Trong Chương 1:

- Phase 7 deployment/pilot được viết như nhánh chắc chắn sẽ triển khai và thu hiện vật.
- Technical Phase 6/observability không xuất hiện trong nội dung Chương 1.
- Chương 1 có Bảng 1.1 `Tóm tắt vấn đề và hướng giải quyết của QRTable`.
- Chương 1 dùng 6 citation đã có trong `references.bib`, không cần thêm nguồn mới.

Hard constraints mới từ người viết:

- Phase 7 deployment là chắc chắn sẽ triển khai hệ thống. Không viết deployment/pilot như "nếu có", "có thể", "hướng phát triển gần nhất" hoặc "hạn chế mặc định".
- Technical Phase 6/observability không đưa vào Chương 3, Chương 5 hoặc Chương 7, kể cả dưới dạng mục ngoài phạm vi hoặc hướng phát triển.
- Chương 6 vẫn là nơi đánh giá claim levels, nhưng không sửa Chương 6 trong plan này.
- Scope/tone refactor phải làm cho Chương 5 đọc như implementation evidence, không như danh sách xin lỗi/phòng thủ.
- Không chỉ sửa exact phrases. Sau patch đầu tiên, phải làm semantic tone audit để bắt các biến thể như `chỉ đặt ra`, `mức yêu cầu`, `mức phù hợp`, `khi có`, `nếu có`, `trước khi có`, `có thể`, `cần được`, `sẽ được đánh giá ở Chương 6`, `không thay thế`, `không phải`. Một hit ở Chương 7 có thể hợp lệ; hit tương tự ở Chương 5 có thể vẫn là giọng phòng thủ.

## 4. Preflight bắt buộc

Đọc plan và context:

```bash
sed -n '1,480p' docs/graduation-thesis-resources/chapter-03-05-07-scope-tone-refactor-plan.md
sed -n '1,180p' docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
sed -n '580,635p' docs/graduation-thesis-resources/thesis-workflow-plan.md
```

Xác nhận Chương 1 có scope anchor:

```bash
rg -n "\\\\section\\{Đối tượng và phạm vi nghiên cứu\\}|triển khai môi trường công khai|Technical Phase 6|observability|SLO" docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex
```

Expected:

- Có mục `Đối tượng và phạm vi nghiên cứu`.
- Không có `Technical Phase 6`, `observability`, `SLO`.

Baseline audit trước sửa:

```bash
rg -n "Giới hạn|giới hạn|chưa khẳng định|không thuộc phạm vi|không bao gồm|chỉ .*mức|ở mức thiết kế|không được viết|không kết luận|Ranh giới phạm vi|khả năng quan sát|observability|SLO|triển khai\\s+(thử|tạm)|sẵn sàng vận hành" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Semantic tone audit trước sửa:

```bash
rg -n "chỉ .*mức|chỉ đặt ra|chỉ kết luận|chỉ đóng vai trò|ở mức|mức yêu cầu|mức phù hợp|mức mô hình đọc|chưa|nếu có|khi có|trước khi có|sau khi có|có thể|cần được|sẽ được đánh giá|không được|không thay thế|không phải" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Không sửa máy móc mọi hit. Hãy phân loại theo vai trò chương:

- Chương 3: ưu tiên yêu cầu và phạm vi nghiệp vụ, tránh câu giống policy đánh giá.
- Chương 5: ưu tiên bằng chứng triển khai, trade-off và ranh giới kỹ thuật; hạn chế không được đọc như lời xin lỗi.
- Chương 7: được giữ hạn chế/hướng phát triển, nhưng phải gom nhóm và không lặp disclaimer từng luồng.

Đọc Chương 6 chỉ để không mâu thuẫn:

```bash
rg -n "\\\\section|giới hạn|bằng chứng|kiểm chứng|thiết kế|hiệu năng|khả năng mở rộng|SePay|Saga|triển khai" docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex
```

## 5. Phạm vi sửa cụ thể

### 5.1. Chương 3

File:

`docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`

Mục tiêu:

- Chương 3 phải là phân tích yêu cầu, không phải chương đánh giá/giới hạn.
- Đổi section cuối `Ranh giới phạm vi và giới hạn của các khẳng định đánh giá` thành `Phạm vi yêu cầu của QRTable`.
- Rút đoạn loại trừ dài còn 2-3 đoạn gọn.
- Không đưa Technical Phase 6/observability vào thesis. Nếu bảng NFR đang có dòng `Khả năng quan sát vận hành`, hãy rút dòng đó khỏi nhóm yêu cầu đánh giá chính hoặc gộp thành ghi chú rất ngắn không dùng từ observability/quan sát vận hành như một năng lực thesis. Ưu tiên xóa dòng khỏi bảng NFR nếu không phá mạch.
- Câu trong bảng NFR về `Khả mở rộng ở mức thiết kế` nên đổi giọng:
  - Tránh: "Chỉ phân tích ở mức thiết kế..."
  - Nên: "Đánh giá bằng lập luận kiến trúc và bằng chứng ranh giới dịch vụ; phép đo tải lớn thuộc hướng kiểm chứng mở rộng nếu có số liệu thực nghiệm."
- Đọc lại cả prose sau bảng NFR và section `Phạm vi yêu cầu của QRTable`. Nếu còn câu như `Chương 3 chỉ đặt ra tiêu chí ở mức yêu cầu`, hãy đổi sang giọng chủ động hơn, ví dụ: `Chương 3 xác định tiêu chí yêu cầu để Chương 4-6 lần lượt thiết kế, hiện thực và đánh giá bằng chứng tương ứng.`

Giữ:

- Actor/use case, FR/NFR cốt lõi, state machines.
- Tenant isolation, RBAC, idempotency, SePay/VietQR, dashboard/reporting MVP.
- `iso-iec-25010-2023` citation nếu vẫn phù hợp.

### 5.2. Chương 5

File:

`docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`

Mục tiêu:

- Chương 5 phải đọc như bằng chứng triển khai.
- Loại bỏ hoặc rewrite các cụm:
  - `Giới hạn của luồng`
  - `Giới hạn cần giữ`
  - `Giới hạn cần nhấn mạnh`
  - `chưa khẳng định`
  - `Chương 6 không được...`
- Đổi cột Bảng 5.1 từ `Giới hạn` sang `Ranh giới đánh giá`.
- Đổi prose trước bảng từ `bằng chứng và giới hạn` sang `bằng chứng và ranh giới đánh giá`.
- Phần deployment/pilot phải viết như cầu nối sang Phase 7 chắc chắn triển khai và thu hiện vật. Không dùng giọng "nếu có môi trường thật", "trước khi có thì chỉ kết luận..." theo kiểu phòng thủ. Nhưng vẫn không claim đã kiểm chứng nếu artifact chưa backfill.
- Xóa mọi nhắc tới khả năng quan sát/observability như nội dung thesis.

Giữ các bất biến kỹ thuật:

- Cart version/conflict behavior.
- Tồn kho không trừ khi khách submit; chỉ xử lý ở staff confirmation.
- Outbox `order.confirmed` và async KDS.
- WebSocket chỉ là hint/refetch, không phải source of truth.
- Payment idempotency và duplicate/underpayment handling.
- SePay live/provider evidence cần artifact Phase 7/provider thật trước khi kết luận mạnh.
- Dashboard entitlement: `report.read_own`, `report.read_any`, `analytics_basic`.
- Hai Saga đại diện: Order Confirm Saga và SaaS Onboarding Mini-Saga.

### 5.3. Chương 7

File:

`docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`

Mục tiêu:

- Chương 7 được phép có hạn chế/hướng phát triển, nhưng không lặp disclaimer từng luồng từ Chương 5.
- Không đưa deployment/pilot thành hạn chế hoặc hướng phát triển, vì Phase 7 chắc chắn triển khai và artifact sẽ được backfill như kết quả.
- Không đưa Technical Phase 6/observability/bảng điều khiển quan sát/truy vết phân tán/SLO vào hạn chế hoặc hướng phát triển thesis.
- Hạn chế nên gom còn các nhóm:
  - Chưa có đo kiểm tải lớn/hiệu năng định lượng.
  - High availability/rollback tự động nếu chưa có hiện vật riêng.
  - SePay provider live và SaaS onboarding full end-to-end nếu artifact Phase 7 chưa phủ đủ.
  - Miền sản phẩm nâng cao: BI/AI, HRM, CRM, offline queue, native mobile, loyalty, KDS history.
- Hướng phát triển nên là sản phẩm/kỹ thuật mở rộng sau phạm vi khóa luận, không phải "hoàn tất Phase 7".

Giữ:

- Kết luận về luồng QR, POS/KDS, Payment, SaaS, RBAC, tenant isolation, Saga đại diện.
- Không biến hạn chế thành phủ nhận kết quả đã đạt.

## 6. Context7/browser decision table

| Tình huống                                                     | Dùng gì                          | Lý do                                    |
| -------------------------------------------------------------- | -------------------------------- | ---------------------------------------- |
| Chỉ rewrite LaTeX/prose dựa trên docs nội bộ                   | Không Context7, không browser    | Task không cần nguồn ngoài               |
| Cần xác minh câu về NestJS/Next.js/Kafka/Keycloak API hiện tại | Context7 trước                   | Ưu tiên docs library/framework hiện hành |
| Cần thêm citation/source mới                                   | Browser, primary/official source | Nhưng task này mặc định không thêm nguồn |
| Cần kiểm chứng code claim đã tồn tại                           | CodeGraph + `rg`                 | Source truth là codebase hiện tại        |
| Cần kiểm tra PDF/text output                                   | Local shell: LaTeX + `pdftotext` | Không dùng browser                       |

## 7. Commands nên dùng khi sửa

Check dirty state:

```bash
git status --short
```

Read exact targets:

```bash
sed -n '140,250p' docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex
sed -n '1,230p' docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex
sed -n '1,90p' docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Audit after patch:

```bash
rg -n "Giới hạn của luồng|Giới hạn cần|chưa khẳng định|không được viết|không kết luận|ở mức thiết kế|khả năng quan sát|observability|SLO|hướng phát triển gần nhất là hoàn tất môi trường|trước khi có các minh chứng" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Semantic audit after patch:

```bash
rg -n "chỉ .*mức|chỉ đặt ra|chỉ kết luận|chỉ đóng vai trò|ở mức|mức yêu cầu|mức phù hợp|mức mô hình đọc|chưa|nếu có|khi có|trước khi có|sau khi có|có thể|cần được|sẽ được đánh giá|không được|không thay thế|không phải" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Expected: không cần zero hit. Nhưng mọi hit còn lại phải được đọc bằng mắt và phân loại. Không kết thúc task nếu Chương 3/5 còn câu mang giọng phòng thủ tương tự exact phrase ban đầu.

Audit giữ technical terms:

```bash
rg -n "tenant isolation|RBAC|idempotency|Saga|SePay|VietQR|KDS|WebSocket|Kafka|Redis|report.read_own|report.read_any|analytics_basic|order.confirmed|tenant.created" docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex
```

Build:

```bash
python3 /Users/vodinhquan/.codex/plugins/cache/openai-bundled/latex/0.2.2/scripts/compile_latex.py docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex --compiler texlive --engine xelatex --json
```

PDF text check:

```bash
pdftotext docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.pdf - | rg -n "Phạm vi yêu cầu|Ranh giới đánh giá|Hạn chế|Hướng phát triển|Đóng gói triển khai"
```

## 8. Expected output

Modify:

- `docs/graduation-thesis-resources/thesis-report/chapters/03-phan-tich-yeu-cau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`

Do not modify by default:

- `docs/graduation-thesis-resources/thesis-report/chapters/01-mo-dau.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/graduation-thesis-resources/thesis-report/references.bib`
- Code files, screenshot assets, diagrams.

## 9. Acceptance criteria

- Chương 3 có section `Phạm vi yêu cầu của QRTable`, không còn section dài kiểu phòng thủ.
- Chương 3 không còn dòng/mục về Technical Phase 6/observability/khả năng quan sát vận hành như nội dung thesis.
- Chương 5 không còn `Giới hạn của luồng`, `Giới hạn cần nhấn mạnh`, `chưa khẳng định` trong các đoạn implementation.
- Bảng 5.1 đổi header `Giới hạn` thành `Ranh giới đánh giá`.
- Các biến thể semantic như `chỉ đặt ra`, `mức yêu cầu`, `mức phù hợp`, `khi có`, `có thể`, `cần được`, `sẽ được đánh giá ở Chương 6` đã được audit bằng mắt; Chương 3/5 không còn câu nào dùng các cụm này theo giọng xin lỗi/phòng thủ.
- Deployment/pilot trong Chương 5/7 được viết như artifact chắc chắn của Phase 7, không như việc "có thể có" hoặc hướng phát triển.
- Chương 7 vẫn trung thực về hạn chế, nhưng không lặp disclaimer của Chương 5 và không đưa observability/SLO vào thesis.
- Không thêm citation mới.
- Không sửa Chương 6.
- LaTeX build pass.
- Workflow plan được cập nhật với status thật và next step mới.

## 10. Final response mong muốn

Khi xong, trả lời ngắn gọn:

- Đã sửa file nào.
- Tóm tắt 3 thay đổi chính.
- Kết quả build/verification.
- Warning còn lại nếu có, phân biệt rõ warning cũ ngoài phạm vi hay lỗi mới.

```

---

## Ghi chú cho người dùng

Prompt trên cố ý không yêu cầu AI dùng browser hoặc Context7 mặc định. Plan 2 là refactor tài liệu dựa trên bằng chứng nội bộ, nên việc tra cứu ngoài dễ tạo thêm citation/claim không cần thiết. Browser/Context7 chỉ là chiến lược dự phòng khi session mới định viết thêm claim kỹ thuật hoặc nguồn mới, còn default path là đọc repo bằng `rg`, CodeGraph và các file `.tex/.md` hiện có.
```
