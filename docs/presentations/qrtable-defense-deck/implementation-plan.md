# QRTable Defense Deck Implementation Plan

**Goal:** Tạo bộ slide bảo vệ khóa luận QRTable hoàn chỉnh: PPTX bản chính, PDF bản dự phòng, 30 slide chính cho 20-25 phút và appendix phản biện.

**Source of truth:** `docs/presentations/qrtable-defense-deck/src/qrtable-defense-deck-source.mjs`.

**Outputs:**

- `docs/presentations/qrtable-defense-deck/output/qrtable-defense-deck.pptx`
- `docs/presentations/qrtable-defense-deck/output/qrtable-defense-deck.pdf`
- `docs/presentations/qrtable-defense-deck/output/qa/` for rendered slide images and QA notes

## Files

- Modify: `docs/graduation-thesis-resources/thesis-defense-deck-methodology-plan.md`
  - Convert handoff wording into execution wording for creating the finished official slide deck.
- Create: `docs/presentations/qrtable-defense-deck/src/qrtable-defense-deck-source.mjs`
  - Defines theme tokens, slide helpers, asset registry, 30 main slides, appendix slides, speaker notes, and PPTX generation.
- Create: `docs/presentations/qrtable-defense-deck/output/qrtable-defense-deck.pptx`
  - Main editable deck.
- Create: `docs/presentations/qrtable-defense-deck/output/qrtable-defense-deck.pdf`
  - Backup PDF exported from the generated PPTX.

## Execution Tasks

- [x] Build the source deck using the approved Manus-like Academic Dark visual system.
- [x] Include official thesis metadata from the LaTeX report: title, author, student ID, faculty, major, supervisor, year.
- [x] Implement 30 main slides following the approved narrative, not the report chapter order.
- [x] Add 10 appendix slides for service boundary, database ownership, guard chain, Kafka/Redis, Order Confirm Saga, payment bridge, traceability, evidence assets, and reviewer questions.
- [x] Add structured `user-replacement` placeholders for complex visuals and missing evidence assets.
- [x] Add a school-logo placeholder, independent school-name text, and a prototype cover background.
- [x] Add speaker notes for every slide.
- [x] Generate PPTX from source.
- [x] Export PDF from the generated PPTX.
- [x] Render PDF to slide images and run repeated QA passes.
- [x] Fix layout and presentation-language issues found by QA, then regenerate PPTX/PDF.

## Verification

- Run the source deck generator.
- Extract PPTX XML text or PDF text to verify slide order and content.
- Export PDF from PPTX with bundled LibreOffice.
- Render slide images with Poppler.
- Check asset registry for generic placeholders; only intentional `user-replacement` placeholders may remain.

**Verified result:** 40 slides, 40 speaker-note files, 40-page PDF, valid PPTX archive, 10-entry asset registry, and three contact sheets covering slides 1-40.
