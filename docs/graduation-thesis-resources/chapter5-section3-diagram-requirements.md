# Diagram Requirements for Section 5.3 Restructure

> Created: 2026-06-24
> Context: Restructuring Section 5.3 to follow the improved pattern from Sections 5.4 and 5.5

## Overview

Section 5.3 "Phiên đặt món qua mã QR và giỏ đặt món dùng chung" has been restructured from a single long paragraph format into a structured multi-subsection format with:

- One overview diagram
- Four sub-diagrams addressing specific technical questions
- Clear bullet-point structure for invariants and processes

## Current State

The LaTeX has been updated but requires **4 new sequence diagrams** to be created from the existing overview diagram.

## Diagram Requirements

### 1. Overview Diagram (Already Exists - Needs Renaming)

**File**: `chapter5-qr-ordering-session.pdf` → should be referenced as `fig:chapter5-qr-ordering-overview`
**Caption**: "Tổng quan luồng quản lý phiên đặt món qua mã QR."
**Status**: Source exists but label reference needs update
**Priority**: P0
**Action Required**: Verify the existing diagram covers the full flow appropriately as an overview

### 2. Session Initialization Diagram (NEW)

**Reference**: `fig:chapter5-qr-session-init`
**File**: `chapter5-qr-session-init.pdf`
**Caption**: "Khởi tạo phiên đặt món từ mã QR với kiểm tra ngữ cảnh đơn vị thuê bao."
**Status**: Needs to be created
**Priority**: P0
**Technical Question Addressed**: "Hệ thống đảm bảo khách chỉ mở phiên hợp lệ theo đơn vị thuê bao và bàn bằng cách nào?"

**Scope**:

- Customer scans QR with tenantId, tableId, signature
- BFF validates signature and tenant context
- Order service checks with Catalog via TCP
- Session creation in PostgreSQL + Redis
- Table status update in Catalog

**Key Flows**:

1. QR token validation at BFF
2. Catalog TCP call to verify table
3. Check for existing active session
4. Create new session if needed
5. Update table status to OCCUPIED

### 3. Shared Cart Version Control Diagram (NEW)

**Reference**: `fig:chapter5-shared-cart-version`
**File**: `chapter5-shared-cart-version.pdf`
**Caption**: "Kiểm soát giỏ chung qua phiên bản lạc quan và phát hiện xung đột cập nhật."
**Status**: Needs to be created
**Priority**: P0
**Technical Question Addressed**: "Nhiều thiết bị cập nhật cùng lúc thì hệ thống phát hiện xung đột bằng cách nào?"

**Scope**:

- Multiple devices accessing shared cart
- Optimistic version control mechanism
- Conflict detection and resolution
- Redis-based cart storage with version number

**Key Flows**:

1. Client sends cart update with current version
2. Order checks version in Redis
3. Version match → apply change, increment version
4. Version mismatch → return conflict, client refetches
5. Client retries with updated version

### 4. Redis-PostgreSQL Synchronization Diagram (NEW)

**Reference**: `fig:chapter5-session-redis-postgres-sync`
**File**: `chapter5-session-redis-postgres-sync.pdf`
**Caption**: "Đồng bộ phiên giữa Redis và PostgreSQL để bảo toàn trạng thái bền vững."
**Status**: Needs to be created
**Priority**: P0
**Technical Question Addressed**: "Nếu Redis mất dữ liệu thì phiên và giỏ có bị mất không?"

**Scope**:

- Dual-layer storage strategy
- PostgreSQL as durable source of truth
- Redis as operational cache
- Recovery mechanism when Redis expires/fails

**Key Flows**:

1. Session creation → write to both PostgreSQL + Redis
2. Cart updates → write to Redis (fast path)
3. Critical operations (submit order, close session) → commit to PostgreSQL
4. Redis expiry/failure → check PostgreSQL
5. Recovery → restore Redis snapshot from PostgreSQL

### 5. Cart Submit to Order Diagram (NEW)

**Reference**: `fig:chapter5-cart-submit-order`
**File**: `chapter5-cart-submit-order.pdf`
**Caption**: "Chuyển giỏ đặt món thành đơn chờ xác nhận và liên kết hóa đơn mở."
**Status**: Needs to be created
**Priority**: P0
**Technical Question Addressed**: "Khi khách gửi đơn, Order xử lý giỏ và tạo đơn như thế nào?"

**Scope**:

- Submit order from cart
- Version check before processing
- Order creation with PENDING status
- Bill association (create new or link to existing open bill)
- Cart deletion after successful commit
- Stock NOT deducted at this stage (deferred to Order Confirm Saga)

**Key Flows**:

1. Customer submits order
2. Lock session by sessionId + tenantId
3. Verify cart version from client matches Redis
4. Create order with PENDING status
5. Create order line items from cart
6. Find or create open bill, link order to bill
7. Commit to PostgreSQL
8. Delete cart from Redis after success

## Design Guidelines for New Diagrams

Based on the successful pattern from Sections 5.4 (Order Confirm Saga) and 5.5 (KDS):

1. **Start with overview, then decompose**: Each diagram should answer ONE specific technical question
2. **Show boundaries clearly**: Highlight commit boundaries, service boundaries, storage boundaries
3. **Label invariants**: Show what must remain true (e.g., "no duplicate session", "version mismatch detected")
4. **Show both success and conflict paths** where relevant (e.g., version mismatch in diagram 3)
5. **Include storage layer**: Show Redis and PostgreSQL interactions explicitly
6. **Match existing style**: Use sequence diagram format consistent with figures 5.4-5.7, 5.11-5.14

## Implementation Steps

1. **Create Mermaid/Excalidraw source** for each of the 4 new diagrams
2. **Store sources** in `thesis-report/assets/diagrams/` with appropriate names
3. **Generate PDFs** and place in `thesis-report/assets/figures/`
4. **Verify LaTeX references** match the generated files
5. **Build PDF** and check all diagrams render correctly
6. **Update thesis-artifact-backlog.md** with the new diagram entries

## Cross-References

These diagrams support the narrative structure now present in section 5.3:

- Subsection 5.3.1: Uses diagram 2 (session init)
- Subsection 5.3.2: Uses diagram 3 (cart version control)
- Subsection 5.3.3: Uses diagram 4 (Redis-PostgreSQL sync)
- Subsection 5.3.4: Uses diagram 5 (cart submit to order)

The overview diagram (currently `chapter5-qr-ordering-session.pdf`) should show the entire flow at a high level, similar to how `chapter5-order-confirm-stock.pdf` serves as the overview for section 5.4.

## Integration with Existing Content

The screenshots (Figure 5.2: `chapter5-01`, `chapter5-02`, `chapter5-03`) remain unchanged and still serve as visual evidence of the implementation.

The evidence table (Table 5.1) reference is maintained and should include entries for all 5 sequence diagrams in the QR ordering flow.
