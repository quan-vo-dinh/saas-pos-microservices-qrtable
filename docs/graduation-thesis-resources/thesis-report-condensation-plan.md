# Thesis Report Condensation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` or the project `plan-writing`/`lint-and-validate` skills before executing this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the current QRTable thesis report from 192 rendered PDF pages to below 170 pages, preferably 164-168 pages, without weakening the core technical argument, removing required thesis sections, or deleting valid references.

**Architecture:** Treat condensation as a controlled editorial pipeline: measure the current PDF, reduce low-yield pages first, rebuild after each pass, and stop once the target is reached with enough safety margin. The plan separates text compression, figure/evidence reduction, and layout verification so each edit can be reviewed independently.

**Tech Stack:** LaTeX/XeLaTeX, BibLaTeX/BibTeX, `texcount`, Poppler tools (`pdfinfo`, `pdftotext`), CodeGraph, existing QRTable thesis docs under `docs/graduation-thesis-resources/`.

---

## 0. Current Baseline

Last measured PDF:

- File: `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.pdf`
- Rendered pages: 192
- Main content page starts at `TÓM TẮT KHÓA LUẬN` page 1.
- References start at page 176 according to `undergraduate-theses-report.toc`.

Chapter page distribution from `undergraduate-theses-report.toc`:

| Part | Start page | Approx. pages | Risk level |
| --- | ---: | ---: | --- |
| Abstract | 1 | 2 | Low |
| Chapter 1 | 3 | 9 | Low |
| Chapter 2 | 12 | 23 | High |
| Chapter 3 | 35 | 17 | Medium |
| Chapter 4 | 52 | 37 | Medium |
| Chapter 5 | 89 | 52 | High |
| Chapter 6 | 141 | 30 | High |
| Chapter 7 | 171 | 5 | Low |
| References | 176 | remaining pages | Do not cut manually |

Text/asset density measured with `texcount` and structural scans:

| File | Words | Figures/macros | Tables | Main diagnosis |
| --- | ---: | ---: | ---: | --- |
| `chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex` | ~7,503 | 8 figures | 6 longtables | Too much background and too many conceptual artifacts for reviewer guidance of 8-10 pages. |
| `chapters/04-thiet-ke-va-kien-truc-he-thong.tex` | ~11,176 | 16 figures | 11 longtables | Technically important; reduce lightly and avoid breaking architecture evidence. |
| `chapters/05-trien-khai-he-thong.tex` | ~6,815 | 23 figures | 2 longtables | Long mainly because of many full-height diagrams/screenshots, not prose. |
| `chapters/06-danh-gia.tex` | ~7,132 | 19 evidence figures via macros | 7 longtables | Long because many evidence images occupy 0.72-0.82 text height. |

Target reductions:

| Pass | Area | Target saving | Running target |
| --- | --- | ---: | ---: |
| A | Chapter 2 compression | 10-13 pages | 179-182 pages |
| B | Chapter 5 figure/prose compression | 8-10 pages | 169-174 pages |
| C | Chapter 6 evidence compression | 5-6 pages | 163-169 pages |
| D | Chapter 4 light compression | 3-4 pages if still needed | 159-166 pages |

The intended stopping point is the first build at or below 168 pages with no unresolved references/citations and no obvious visual breakage.

## 1. Non-Negotiable Guardrails

- [ ] Keep all required thesis sections: front matter, abstract, chapters 1-7, references.
- [ ] Do not remove references merely to reduce page count. References should only disappear if the cited content is removed and the citation becomes unused.
- [ ] Do not convert the thesis into a product manual or a source-code walkthrough.
- [ ] Do not weaken validated technical claims: service boundary, data ownership, tenant isolation, idempotency, Saga scope, WebSocket hint/refetch, Kafka selective eventing, SePay/VietQR payment boundary.
- [ ] Do not add unverified claims about production readiness, high availability, stress testing, live provider validation, or production-grade observability.
- [ ] Use Vietnamese academic prose. Keep English terms when they are technology names, source identifiers, standard pattern names, or clearer technical terms.
- [ ] Do not edit unrelated code or technical docs unless a chapter edit changes a canonical route, enum, architecture claim, or artifact mapping.
- [ ] Preserve the user's existing dirty worktree. Read diffs before modifying any already changed file.
- [ ] Use CodeGraph before editing codebase-derived thesis content.

## 2. Files and Responsibilities

Primary files likely to change:

- `docs/graduation-thesis-resources/thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`  
  Compress background theory and related work into a reviewer-friendly foundation.

- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`  
  Reduce figure density and tighten implementation prose around core runtime flows.

- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`  
  Keep evaluation conclusions and representative evidence, reduce full-page evidence images.

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`  
  Lightly compress repeated schema/architecture explanation if the page target is not reached after Chapters 2, 5, and 6.

- `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.tex`  
  Only modify if a layout-level macro or float policy is necessary and safer than repeated local edits.

- `docs/graduation-thesis-resources/thesis-workflow-plan.md`  
  Update after successful condensation with final page count, changed chapters, and remaining risks.

- `docs/graduation-thesis-resources/thesis-artifact-backlog.md`  
  Update only if artifacts are removed from the main thesis, moved to a different status, or no longer inserted.

Read-only reference files:

- `AGENTS.md`
- `docs/graduation-thesis-resources/thesis-official-outline.md`
- `docs/graduation-thesis-resources/presentation-format-graduation-thesis.md`
- `docs/graduation-thesis-resources/thesis-evidence-map.md`
- `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.toc`
- `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.lof`
- `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.lot`

## 3. Execution Strategy

### Phase 0: Preflight and Snapshot

**Purpose:** Establish the current state before any editorial change.

- [ ] Run CodeGraph status:

```bash
codegraph status .
```

Expected: index is up to date.

- [ ] Inspect worktree status:

```bash
git status --short
```

Expected: existing thesis-related changes may be present. Do not revert unrelated changes.

- [ ] Capture current rendered page count:

```bash
pdfinfo docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.pdf | sed -n '1,40p'
```

Expected: current baseline is 192 pages unless the user has rebuilt since this plan was created.

- [ ] Capture current TOC, LOF, and LOT:

```bash
sed -n '1,260p' docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.toc
sed -n '1,260p' docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.lof
sed -n '1,220p' docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.lot
```

Expected: no missing chapter entries; Chapter 7 starts around page 171 and references around page 176 in the current baseline.

- [ ] Measure chapter word counts:

```bash
cd docs/graduation-thesis-resources/thesis-report
for f in chapters/*.tex frontmatter/abstract.tex; do
  echo "== $f =="
  texcount -brief "$f" | sed -n '1,20p'
done
```

Expected: Chapter 4 is the largest by words, while Chapter 5 and Chapter 6 are page-heavy because of figures.

### Phase 1: Compress Chapter 2 First

**Purpose:** Align the theory/related-work chapter with reviewer guidance: enough foundation, less textbook-style explanation.

**Files:**

- Modify: `docs/graduation-thesis-resources/thesis-report/chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex`
- Read: `docs/graduation-thesis-resources/research-survey/*.md`
- Read: `docs/graduation-thesis-resources/thesis-report/references.bib`

**Target:** Reduce Chapter 2 from about 23 pages to 10-12 pages.

- [ ] Keep the following conceptual roles:
  - POS F&B explains table, session, order, kitchen, bill, and payment.
  - QR ordering explains session-based customer access and duplicate-order risk.
  - SaaS/multi-tenancy explains tenant isolation across API, data, cache, events, and realtime rooms.
  - Microservices explains service boundary and data ownership.
  - Kafka/event-driven explains selective asynchronous side effects.
  - Consistency/idempotency/Saga/outbox explains why QRTable needs controlled distributed workflows.
  - WebSocket explains hint/refetch, not source of truth.
  - OIDC/JWT/RBAC explains staff/admin authentication, while customer QR uses session-level access.
  - Related systems establish market relevance and the technical gap.

- [ ] Remove or compress textbook-style definitions that are restated later in Chapters 4-6.

Rewrite pattern:

```tex
% Before: long definition + multiple paragraphs + local example + separate transition.
% After: one definition paragraph + one QRTable implication paragraph.
```

- [ ] Reduce Chapter 2 artifacts to a smaller set. Recommended keep list:
  - Keep `Bảng 2.5` related systems if it remains concise.
  - Keep `Bảng 2.6` theory-to-QRTable mapping because it proves the chapter is not missing necessary foundations.
  - Keep at most 2-3 conceptual figures if they carry more than prose. Preferred candidates are POS F&B lifecycle, SaaS multi-tenancy, and OIDC/RBAC vs QR session.

- [ ] Remove or move out of the main chapter low-yield conceptual figures if their meaning is already covered by later QRTable-specific diagrams:
  - Kafka event flow can be covered by Chapter 4 Kafka topic/decision sections.
  - Outbox/Saga overview can be covered by Chapter 5 Order Confirm/SaaS Onboarding flows.
  - WebSocket hint/refetch can be covered by Chapters 4-5.
  - Monolith vs microservices can be a table paragraph instead of a full figure.

- [ ] Keep citations tied to real statements. After edit, run:

```bash
cd docs/graduation-thesis-resources/thesis-report
rg -n "\\\\cite" chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex
```

Expected: every retained source supports a retained claim.

- [ ] Build and measure:

```bash
cd docs/graduation-thesis-resources/thesis-report
latexmk -xelatex -interaction=nonstopmode undergraduate-theses-report.tex
pdfinfo undergraduate-theses-report.pdf | rg '^Pages:'
```

Expected: at least 8 pages saved; ideal save is 10-13 pages.

### Phase 2: Compress Chapter 5 by Reducing Figure Density

**Purpose:** Keep implemented core flows but avoid turning Chapter 5 into a sequence-diagram gallery or UI manual.

**Files:**

- Modify: `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
- Optional modify: `docs/graduation-thesis-resources/thesis-artifact-backlog.md` if inserted artifact status changes.

**Target:** Reduce Chapter 5 by 8-10 pages.

- [ ] Keep one representative overview diagram per major flow:
  - QR session/shared cart/order submission.
  - Order Confirm Saga and stock consistency.
  - KDS event ingestion/projection/realtime update.
  - Payment settlement.
  - SaaS onboarding/subscription lifecycle.

- [ ] For subsections that currently have one figure plus a bullet list, replace repetitive bullet lists with one compact paragraph that states:
  - actor,
  - service ownership,
  - invariant,
  - evidence boundary.

Preferred paragraph shape:

```tex
Luồng này được triển khai quanh [actor/service]. Điểm bất biến chính là [invariant].
[Service A] vẫn sở hữu [data/state], còn [Service B] chỉ tương tác qua [contract/event].
Minh chứng triển khai được tổng hợp trong Bảng~\ref{...}; phần kiểm chứng được trình bày ở Chương~6.
```

- [ ] Do not keep a separate full-height figure for every retry, compensation, outbox, or sub-step when the overview diagram and prose already show the same claim.

- [ ] Keep screenshots in Chapter 5 only when they illustrate a user-visible core flow. Avoid screenshots whose only value is proving a screen exists.

- [ ] If a figure is removed from the main chapter but still useful for defense, keep the source file under `assets/diagrams/` and note in `thesis-artifact-backlog.md` that it is no longer inserted in the main thesis.

- [ ] Avoid weakening Chapter 5 by deleting the two representative Saga claims:
  - Order Confirm Saga.
  - SaaS Onboarding Mini-Saga.

- [ ] Build and measure:

```bash
cd docs/graduation-thesis-resources/thesis-report
latexmk -xelatex -interaction=nonstopmode undergraduate-theses-report.tex
pdfinfo undergraduate-theses-report.pdf | rg '^Pages:'
```

Expected: at least 6 pages saved; ideal save is 8-10 pages.

### Phase 3: Compress Chapter 6 Evidence

**Purpose:** Keep evaluation reasoning strong while reducing full-page evidence screenshots/log images.

**Files:**

- Modify: `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- Optional modify: `docs/graduation-thesis-resources/thesis-artifact-backlog.md` if evidence artifact status changes.

**Target:** Reduce Chapter 6 by 5-6 pages.

- [ ] Keep the evaluation structure:
  - method and evidence classification,
  - requirement/test traceability,
  - core business flow validation,
  - Saga/idempotency/consistency,
  - runtime state/observability evidence,
  - k6/Grafana/Prometheus/Tempo quantitative evidence,
  - architecture/maintainability,
  - limitations and discussion.

- [ ] Keep representative evidence images only. Preferred keep list:
  - one Allure overview or test summary image,
  - one Saga-related evidence image,
  - one Kafka/Redis runtime-state image if it proves an important distributed-system claim,
  - one Grafana or Prometheus k6 image,
  - one Tempo trace image if the discussion needs tracing evidence.

- [ ] Replace clusters of log screenshots with a compact result table or prose summary.

Preferred prose shape:

```tex
Nhóm kiểm thử này cho thấy [observed result]. Kết quả hỗ trợ kết luận rằng [safe conclusion].
Phạm vi kiểm chứng dừng ở [boundary], nên chưa dùng để khẳng định [overclaim].
```

- [ ] Lower image height only when the visual remains readable. Do not blindly change all `0.82\textheight` to a smaller value.

- [ ] Preserve the claim-policy tone: Chapter 6 must still distinguish verified, partially verified, and design-supported conclusions.

- [ ] Build and measure:

```bash
cd docs/graduation-thesis-resources/thesis-report
latexmk -xelatex -interaction=nonstopmode undergraduate-theses-report.tex
pdfinfo undergraduate-theses-report.pdf | rg '^Pages:'
```

Expected: at least 4 pages saved; ideal save is 5-6 pages.

### Phase 4: Light Compression of Chapter 4 if Needed

**Purpose:** Reduce a few pages without damaging architecture depth.

**Files:**

- Modify: `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`

**Target:** Reduce Chapter 4 by 3-4 pages only if the PDF remains above 168 pages after Phases 1-3.

- [ ] Do not remove the architecture backbone:
  - technology decision matrix,
  - service/data ownership,
  - database/schema ownership,
  - communication matrix,
  - Kafka topic registry,
  - Redis ownership,
  - security/auth/RBAC boundary,
  - SePay/VietQR payment architecture.

- [ ] Compress repeated prose around the five per-service database schema figures. Keep the ownership table as the primary argument.

- [ ] If the five schema figures remain in the main chapter, reduce explanation around each figure to a single sentence that states why the service owns the data.

- [ ] If moving any schema figure out of the main chapter is approved by the user, keep the `Bảng 4.3` ownership summary in Chapter 4 and move detailed schema evidence to appendix/backlog. This is a user decision because schema diagrams currently strengthen the architecture chapter.

- [ ] Build and measure:

```bash
cd docs/graduation-thesis-resources/thesis-report
latexmk -xelatex -interaction=nonstopmode undergraduate-theses-report.tex
pdfinfo undergraduate-theses-report.pdf | rg '^Pages:'
```

Expected: PDF is below 170 pages, ideally below 168 pages.

### Phase 5: Global Polish Pass

**Purpose:** Remove redundant wording and prevent accidental claim weakening after page cuts.

**Files:**

- Modify only chapters touched in earlier phases.

- [ ] Search for repeated defensive/internal wording:

```bash
rg -n "theo trạng thái mã nguồn hiện tại|theo audit|TODO|deferred|placeholder|implementation-gap|production-ready|high availability|stress test|source of truth|giao diện" docs/graduation-thesis-resources/thesis-report/chapters
```

Expected:

- No internal workflow terms appear in final prose.
- `source of truth` appears only when intentionally used as a technical term or translated as `nguồn sự thật`.
- `giao diện` is not used where the intended meaning is architecture-level `client`.

- [ ] Search for figure references to removed figures:

```bash
cd docs/graduation-thesis-resources/thesis-report
rg -n "fig:chapter2|fig:chapter5|fig:chapter6" chapters/*.tex
```

Expected: every retained `\ref{...}` points to an inserted label.

- [ ] Search for orphaned labels around edited areas:

```bash
cd docs/graduation-thesis-resources/thesis-report
rg -n "\\\\label\\{" chapters/02-co-so-ly-thuyet-va-cong-trinh-lien-quan.tex chapters/04-thiet-ke-va-kien-truc-he-thong.tex chapters/05-trien-khai-he-thong.tex chapters/06-danh-gia.tex
```

Expected: labels are still meaningful and match remaining figures/tables.

## 4. Verification Checklist

Run this full verification before considering the condensation complete:

- [ ] Compile from the thesis report directory:

```bash
cd docs/graduation-thesis-resources/thesis-report
latexmk -xelatex -interaction=nonstopmode undergraduate-theses-report.tex
```

Expected: compilation exits successfully.

- [ ] Confirm page count:

```bash
pdfinfo undergraduate-theses-report.pdf | rg '^Pages:'
```

Expected: `Pages:` is less than 170. Preferred: 164-168.

- [ ] Check unresolved references/citations:

```bash
cd docs/graduation-thesis-resources/thesis-report
rg -n "undefined references|Citation .* undefined|There were undefined" undergraduate-theses-report.log
```

Expected: no output.

- [ ] Check generated lists:

```bash
sed -n '1,260p' undergraduate-theses-report.toc
sed -n '1,260p' undergraduate-theses-report.lof
sed -n '1,220p' undergraduate-theses-report.lot
```

Expected:

- Chapters 1-7 remain present.
- Figure/table numbering is continuous enough for the edited artifact set.
- No removed figure/table title remains in the list.

- [ ] Extract text and scan for internal workflow residue:

```bash
pdftotext undergraduate-theses-report.pdf - | rg -n "TODO|deferred|placeholder|implementation-gap|bản nháp|ghi chú tạm|production-ready|stress test|high availability"
```

Expected: no inappropriate workflow residue in the rendered PDF.

- [ ] Read the transition pages around edited sections:

Use the PDF viewer to inspect:

- End of Chapter 1 into Chapter 2.
- End of Chapter 2 into Chapter 3.
- Dense figure sections in Chapter 5.
- Evidence figure sections in Chapter 6.
- End of Chapter 6 into Chapter 7.

Expected: no large unexplained blanks, broken captions, or sections starting with missing context.

## 5. Acceptance Criteria

The plan is complete when:

- [ ] The rendered PDF is below 170 pages.
- [ ] Chapter 2 is no longer a broad textbook-style chapter and reads as a direct foundation for QRTable.
- [ ] Chapter 5 still proves the implemented core flows without becoming a UI/manual gallery.
- [ ] Chapter 6 still supports the evaluation claims with representative evidence and clear limits.
- [ ] No required front matter, chapter, conclusion, or reference section is removed.
- [ ] No new technical claim is introduced without evidence.
- [ ] LaTeX builds without unresolved references or citations.
- [ ] `thesis-workflow-plan.md` records the final page count and the chapters changed.

## 6. Suggested Execution Order

Use one commit-sized pass per chapter:

1. Chapter 2 compression and build.
2. Chapter 5 figure/prose compression and build.
3. Chapter 6 evidence compression and build.
4. Chapter 4 light compression only if page count remains too high.
5. Global polish and final build.
6. Update workflow/backlog docs.

Each pass should end with:

```bash
git diff -- docs/graduation-thesis-resources/thesis-report/chapters/<edited-file>.tex
cd docs/graduation-thesis-resources/thesis-report
latexmk -xelatex -interaction=nonstopmode undergraduate-theses-report.tex
pdfinfo undergraduate-theses-report.pdf | rg '^Pages:'
```

Then record:

- pages before,
- pages after,
- sections edited,
- figures/tables removed or retained,
- remaining risk.

## 7. Recommended First Edit

Start with Chapter 2. It is the clearest high-yield edit because the reviewer explicitly suggested a shorter theory/related-work chapter and because later chapters already provide QRTable-specific architecture, implementation, and evaluation evidence.

First concrete target:

- Rewrite the Chapter 2 opening into one compact orientation paragraph.
- Compress sections 2.1-2.8 so each section answers only:
  - What is the concept?
  - Why does it matter for QRTable?
  - Which later chapter uses it?
- Keep related systems as a short gap analysis.
- Keep one final synthesis table mapping theory to QRTable.

Do not start with layout tricks. Text and artifact selection should carry the reduction; layout tuning is only a final polish tool.
