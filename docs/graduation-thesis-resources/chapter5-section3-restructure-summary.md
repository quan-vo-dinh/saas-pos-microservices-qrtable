# Chapter 5 Section 5.3 Restructuring Summary

**Date**: 2026-06-24
**Task**: Restructure Section 5.3 "Phiên đặt món qua mã QR và giỏ đặt món dùng chung" to follow the improved pattern from Sections 5.4 (Order Confirm Saga) and 5.5 (KDS)

## Objective

Transform Section 5.3 from a single long continuous paragraph format into a structured multi-subsection format with:

- Clear invariants listed as bullet points
- One overview diagram + multiple sub-diagrams addressing specific technical questions
- Improved readability with structured content organization

## What Was Done

### 1. Text Restructuring

**Before**:

- Single section with 2-3 long paragraphs
- Narrative style mixing multiple concerns
- Hard to identify key technical questions and invariants

**After**:

- Overview paragraph stating business goal
- **5 key invariants** listed as bullet points
- **4 subsections**, each answering a specific technical question:
  1. Khởi tạo phiên từ mã QR (Session initialization)
  2. Quản lý giỏ đặt món dùng chung với phiên bản lạc quan (Shared cart with optimistic version control)
  3. Đồng bộ Redis và PostgreSQL cho phiên (Redis-PostgreSQL synchronization)
  4. Gửi đơn từ giỏ chung (Cart submit to order)
- Each subsection has a dedicated diagram and structured bullet-point explanation

### 2. Diagram Structure Updates

**Overview Diagram**:

- File: `chapter5-qr-ordering-session.pdf` (existing, re-rendered)
- Label updated from `fig:chapter5-qr-ordering-session` to `fig:chapter5-qr-ordering-overview`
- Caption updated to reflect "tổng quan" (overview) nature
- Comment added: "Overview only. The focused diagrams next to this figure show each technical question separately."

**Sub-Diagrams Created and Rendered** (4 new diagrams):

1. ✅ `fig:chapter5-qr-session-init` - Session initialization flow (73K PDF)
2. ✅ `fig:chapter5-shared-cart-version` - Cart version control mechanism (88K PDF)
3. ✅ `fig:chapter5-session-redis-postgres-sync` - Dual-layer storage sync (70K PDF)
4. ✅ `fig:chapter5-cart-submit-order` - Order creation from cart (73K PDF)

All diagrams:

- Created as Mermaid sequence diagrams (.mmd sources)
- Rendered to PDF and PNG using `tools/render-chapter5-diagrams.sh`
- Follow the same visual style as Order Confirm Saga diagrams (sections 5.4-5.5)
- Include clear notes explaining key invariants and design decisions

### 3. Label Reference Updates

Updated all references from old label to new label:

- Chapter 5, Table 5.1: Evidence table reference
- Chapter 7: Cross-reference in conclusion section

### 4. LaTeX Build Status

✅ **Build Successful with Real Diagrams**

- No undefined references
- No missing files errors
- All 5 diagrams (1 overview + 4 focused) render correctly in PDF
- PDF compiles correctly
- Page count: ~174 pages
- All sequence diagrams display with proper formatting and theming
- Diagram quality verified visually (proper size, readable text, correct layout)

## Files Modified

1. `/docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`
   - Section 5.3 completely restructured
   - Added 4 new subsections
   - Added 4 new figure references
   - Updated bullet-point structure for invariants

2. `/docs/graduation-thesis-resources/thesis-report/chapters/07-ket-luan-va-huong-phat-trien.tex`
   - Updated figure reference in contribution summary

3. `/docs/graduation-thesis-resources/thesis-report/assets/figures/`
   - Re-rendered `chapter5-qr-ordering-session.pdf` (95K) - Overview diagram
   - Generated `chapter5-qr-session-init.pdf` (73K) - New focused diagram
   - Generated `chapter5-shared-cart-version.pdf` (88K) - New focused diagram
   - Generated `chapter5-session-redis-postgres-sync.pdf` (70K) - New focused diagram
   - Generated `chapter5-cart-submit-order.pdf` (73K) - New focused diagram
   - All with corresponding PNG files for web/preview use

## Files Created

1. `/docs/graduation-thesis-resources/chapter5-section3-diagram-requirements.md`
   - Detailed requirements for the 4 new diagrams
   - Design guidelines based on sections 5.4-5.5 pattern
   - Technical questions each diagram should answer
   - Key flows to illustrate

2. `/docs/graduation-thesis-resources/chapter5-section3-restructure-summary.md`
   - This file - summary of all changes

3. `/docs/graduation-thesis-resources/thesis-report/tools/render-chapter5-diagrams.sh`
   - Rendering script for all Chapter 5 Mermaid diagrams
   - Follows the pattern from `render-chapter4-diagrams.sh`
   - Generates both PDF and PNG outputs

4. **Mermaid Diagram Sources** (in `/docs/graduation-thesis-resources/thesis-report/assets/diagrams/`):
   - `chapter5-qr-session-init.mmd` - Session initialization with tenant validation
   - `chapter5-shared-cart-version.mmd` - Optimistic version control for concurrent updates
   - `chapter5-session-redis-postgres-sync.mmd` - Dual-layer storage synchronization strategy
   - `chapter5-cart-submit-order.mmd` - Order creation and bill association flow

## Completed Work (2025-06-25)

### ✅ All Diagrams Created and Rendered

1. **4 Mermaid Source Diagrams Created**:
   - `chapter5-qr-session-init.mmd` - Session initialization flow with tenant validation
   - `chapter5-shared-cart-version.mmd` - Optimistic version control for shared cart
   - `chapter5-session-redis-postgres-sync.mmd` - Dual-layer storage synchronization
   - `chapter5-cart-submit-order.mmd` - Order creation from cart

2. **Render Script Created**:
   - Created `tools/render-chapter5-diagrams.sh` following the pattern from Chapter 4
   - Script successfully renders all Chapter 5 Mermaid diagrams to PDF and PNG
   - All diagrams rendered with proper dimensions (1800x1200)

3. **All PDFs Generated**:
   - `chapter5-qr-session-init.pdf` (73K) - Real diagram, not placeholder
   - `chapter5-shared-cart-version.pdf` (88K) - Real diagram, not placeholder
   - `chapter5-session-redis-postgres-sync.pdf` (70K) - Real diagram, not placeholder
   - `chapter5-cart-submit-order.pdf` (73K) - Real diagram, not placeholder
   - `chapter5-qr-ordering-session.pdf` (95K) - Overview diagram, re-rendered

4. **LaTeX Build Verified**:
   - LaTeX compiles successfully with all new diagrams
   - PDF output: 174 pages
   - All figure references resolved correctly
   - No undefined references or missing file errors

### Diagram Quality Verification

Each diagram meets the requirements:

- ✅ Answers ONE specific technical question
- ✅ Shows service boundaries (BFF, Order, Catalog, Redis, PostgreSQL)
- ✅ Shows storage layers explicitly
- ✅ Includes both success and conflict paths (especially cart-version diagram)
- ✅ Matches existing Chapter 5 style (sequence diagrams with consistent theming)
- ✅ Has clear note sections explaining key invariants

### Next Steps (Optional Enhancements)

1. **Evidence Table Update** (if needed):
   - Verify Table 5.1 references all 5 QR ordering diagrams correctly
   - Update evidence description to match new structure if changes were made

2. **Cross-Check with Chapter 6**:
   - Ensure all claims in 5.3 have corresponding evidence in Chapter 6
   - Verify test references match the new subsection structure

3. **Consider Similar Patterns**:
   - Review other Chapter 5 sections to see if they would benefit from similar restructuring
   - Document this pattern for future sections

## Key Improvements

1. **Better Readability**: Readers can now quickly identify:
   - What business problem the flow solves
   - What invariants must be maintained
   - What specific technical questions are addressed

2. **Clearer Structure**: Each subsection focuses on ONE technical question with ONE diagram

3. **Consistent with Existing Sections**: Matches the successful pattern from Sections 5.4 (Order Confirm Saga) and 5.5 (KDS)

4. **Academic Quality**: More suitable for thesis defense:
   - Structured argumentation
   - Clear evidence presentation
   - Easy to reference specific aspects

## Technical Details Preserved

All technical accuracy maintained:

- Service ownership (Order owns session/cart, Catalog owns table/menu)
- Redis as hot path, PostgreSQL as source of truth
- Optimistic version control for shared cart
- Session recovery mechanism
- Stock NOT deducted at cart submit (deferred to Order Confirm Saga)

## Compatibility

- ✅ LaTeX compiles successfully
- ✅ All cross-references resolved
- ✅ No breaking changes to other chapters
- ✅ Screenshot references (Figure 5.2) unchanged
- ✅ Evidence table reference maintained
- ✅ Follows thesis language policy (§3.2) for Vietnamese-English terminology
