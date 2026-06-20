# PROFESSIONAL DOCUMENTS OF RESTAURANT MANAGEMENT SYSTEM

> **ANALYSIS BASED ON QRTABLE.IO AS A PRINCIPAL**
> **Current Status:** Living business overview, last aligned with implemented Phase 4D.1 dashboard reporting, entitlement gating, and UI polish on 2026-06-01.

This document describes in detail the core business flows, from initial setup to daily restaurant operations, focusing on the QR-based table ordering (QR-based table ordering) model.

When there are conflicts, prioritize in this order: current code/tests, accepted specs in `docs/specs/`, phase records in `docs/phases/`, then this overview document. The detailed RBAC matrix is ​​located at `docs/architecture/permission-matrix.md`.

---

## 1. RESTAURANT INITIALIZATION AND SETUP FLOW (ONBOARDING & MULTI-TENANCY)

> **NOTE:** The system is a **SaaS Platform** with Multi-tenant model. This process is managed by **Super Admin** at the Platform layer.

This is the process of creating a restaurant tenant on the platform, attaching Owner, subscription, initial payment configuration and independent operating status. The current status after Phase 4B is **admin-assisted onboarding**; The self-service registration wizard is left for the next phase.

### A. Setup steps

1. **Onboard tenant by Super Admin:**
   - `SUPER_ADMIN` creates tenant through platform admin, declares shop name, type, address, Owner information and initial package.
   - The system creates tenant, Owner user, default subscription and initial payment settings row in the same onboarding process.
   - Onboarding Phase 4B is a mini-saga in SaaS service: if the step of creating user/profile/payment settings fails, the system rolls back the created data in the DB and has a cleanup path for orphan Keycloak users.
   - Phase 4B uses the `SUPER_ADMIN` mechanism to manually enter the password for the Owner; email reset/required action is outside the current implementation scope.

2. **Initialize Restaurant Identity (tenant Identity):**
   - **Core Logic:** The system automatically generates a unique Slug/Subdomain (for example: `the-coffee-house.qrtable.io`) as a brand identifier on the Internet.
   - Slug must normalize Vietnamese, unique throughout the platform and block reserved words such as `admin`, `api`, `www`, `app` to not conflict with internal routes or brands.

3. **Select service Package (Subscription):**
   - Super Admin manages pricing plans; Owners can view plans and create checkout subscriptions for their tenants; Manager only has permission to view subscription/plan.
   - **Rules:** Plans limit features and size (e.g. Free Plan only allows up to 10 tables, no advanced reporting). Record the start and end dates of the package.
   - Current canonical package features:
     - `FREE`: `basic_pos`
     - `BASIC`: `basic_pos`, `analytics_basic`
     - `PREMIUM`: `basic_pos`, `analytics_basic`, `analytics_advanced`, `priority_support`
   - Dashboard reports are package-aware. The dashboard shell and usage quotas are visible to Owner/Manager users with report access, but tenant report API data requires an active subscription and the relevant plan feature.
   - Each tenant can only have one `ACTIVE` subscription at a time. New subscriptions may supersede old subscriptions and must invalidate the associated cache/guard.
   - Auto-suspend subscription expires according to Vietnamese time: daily `02:00 Asia/Ho_Chi_Minh`, grace period 24h (`expires_at + 1 day < now()`).
   - Counter `max_orders_per_day` uses timezone `Asia/Ho_Chi_Minh` for the Vietnamese market.
   - Current-plan usage counters are live service counts: tables from Catalog, staff from User-Access, and today's orders from Order using the Ho Chi Minh day boundary.
   - tenant pays the platform using subscription invoice `QRSUB*`; `SUPER_ADMIN` has a manual confirm fallback when the webhook fails but the money has been checked.

4. **Set up tenant Payments:**
   - Owner connects SePay OAuth2 in `/dashboard/payment-settings` to send customer bill money to tenant's bank account.
   - Payment service owns `tenant_payment_settings`; SaaS service only owns the tenant/subscription/invoice billing platform.
   - Two-tier payment uses separate prefix: `QRTBL*` for customer bill payment to tenant account, `QRSUB*` for subscription invoice tenant to pay platform.
   - Phase 4B supports one SePay account / one active bank account per tenant; multi-bank active, provision and partial subscription refund are defer.

5. **Set Up Operational Configuration:**
   - **Default Vietnam:** The system automatically configures currency unit VND and language Vietnamese.
   - **Operating mode:** Customers can both order directly (Instant Order) and view the electronic Menu (Digital Menu).

### B. Business Rules

- **Data Isolation (tenant Isolation):** Make sure the data (orders, revenue, customers) of this store is completely separate and not visible to other stores.
- **Active Status:** Store has statuses `ACTIVE`, `SUSPENDED`, `CLOSED`. `SUSPENDED` converts the tenant to read-only for new operations, but still allows pending bill payments.
  - **Actor:** Super Admin has the right to suspend/activate/close tenant when violating policy or subscription expires.
  - `isActive` is just an old DTO compatible field; Operational behavior taken from `status`.
  - When the tenant is `SUSPENDED`, the SePay webhook for the created bill is still processed idempotent; order is `PROCESSING` being processed by the kitchen until served; UI shows warning banner instead of force-disconnect.
  - `CLOSED` is the contract end state in Phase 4B, soft-flag tenant and disable Owner when needed. Hard-delete/retention/data erasure policy is deferred.
- **Initial Decentralization:** tenant is onboarded with **Restaurant Owner** within the tenant scope; Owner manages personnel, Manager operates but does not have the right to delete users, checkout subscription, or update payment settings.
- **Migration of old tenants:** Legacy tenants have backfill plan `FREE` that does not expire; `isActive=false` map to `SUSPENDED`; The default currency/locale is `VND` / `vi-VN`.

---

## 2. MENU MANAGEMENT FLOW (CATALOG & MENU MANAGEMENT)

Describe the process of digitizing a restaurant's paper menu into an electronic menu on the system.

### A. Menu Hierarchy

The system adheres to a simple 2-tier structure:

1. **Category:**
   - Used to group dishes/drinks (For example: Appetizers, Main dishes, Drinks, Desserts).
   - **Display logic:** Can set display time frame for categories (For example: "Breakfast" only displays 6am - 10am).
   - **Status:** `Active` (Visible) or `Inactive` (Hidden).

2. **Food/Drinks (Menu Item):**
   - **Basic information:** Item name, Image, Short description, Fixed price.
   - **Status:** `Available` (In stock) or `Out of Stock` (Out of stock). When out of stock, the "Order" button on the customer interface will be disabled immediately.
   - **Simple price:** Each item has a fixed price, no variations (size, topping).

### B. Key Business Rules

- **Simple price calculation:** Final price = Item price × Quantity. There are no surcharges, taxes, or discounts.
- **Display:** Only shows dishes belonging to category `Active` and with status `Available`.
- **Custom arrangement:** The Owner has the right to arrange the display order of Categories and Dishes (drag & drop).
- **Synchronize current menu:** Mutation menu invalidate existing cache/query; the system currently does not have Kafka/WS `menu.updated`. Customer/POS convergence by refetching according to the query lifecycle or explicit invalidation after mutation.
- **Deletion constraint:** Do not delete existing dishes in order `Pending` or `Processing`.

---

## 3. TABLE & QR CODE MANAGEMENT FLOW (TABLE & QR LOGIC)

Responsible for digitizing the restaurant premises and creating "Entry Points" for customers.

### A. Spatial Organization Structure

- **Areas/Zones:**
  - Divide the shop into management areas (Ground Floor, Terrace, VIP Room).
  - **Professions:** Helps assign services easily and report revenue by region.
- **Tables:**
  - Each table belongs to an Area. Basic information: Name/Table number, Capacity.
  - **Identifier:** Each table has a unique ID within the store.

### B. Identification Logic and QR Code Generation

- **Mapping Mechanism:**
  - Each created table will be associated with a unique identification Token.
  - A QR code is a URL containing parameters: `https://ten-quan.qrtable.io?table_id=xyz&token=abc`.

- **QR Security (Security Rules):**

  ```
  Token Generation:
    token = HMAC_SHA256(table_id + store_id + secret_key)

  Token Validation:
    IF HMAC_verify(table_id, token, secret_key) == false
    THEN return 403 "Invalid QR code"
  ```

Rate Limiting (Anti-spam):
max_scans_per_table = 10 scans per 5 minutes
current_order_quota = tenant plan daily order quota (`max_orders_per_day`)
future_hardening = optional per-session order cap

    IF rate_limit_exceeded
    THEN return 429 "Too many requests, please wait"

Session Timeout:
IF last_activity > 30 minutes AND order_count == 0
THEN auto_close_session()

```

- **QR Publishing:** Allows exporting image/PDF files of QR codes according to templates for synchronous printing.

### C. Table State Management Logic

**State Machine - Table state lifecycle:**

```

┌─────────────┐
│ Available │ (Ready to welcome guests)
└──────┬──────┘
│ QR Scan → Create Session
▼
┌─────────────┐
│ Occupied │ (There are guests)
└──────┬──────┘
│ Customer request payment → Lock ordering
▼
┌─────────────┐
│ Billing │ (Waiting for payment)
└──────┬──────┘
│ Payment completed
▼
┌─────────────┐
│ Cleaning │ (Needs cleaning)
└──────┬──────┘
│ Staff mark as clean
▼
┌─────────────┐
│ Available │ (Return to original state)
└─────────────┘

````

**Business Rules for State Transitions:**

```yaml
Available → Occupied:
Trigger: Customer scans QR for the first time
  Condition: table_status == "Available"
  Action:
- Create new Session
    - Set table_status = "Occupied"
    - Set session_started_at = current_timestamp

Occupied → Available (Safe Empty Session Release):
Trigger: Staff releases an empty/stuck table session, or Order recovers a stale empty session on join
  Condition:
    - table_status == "Occupied"
    - session_id matches the Order session
    - order_count == 0
    - no bill and no persisted orders exist for that session
  Action:
    - Close the empty Order session if it is still active
    - Delete Redis session/cart keys
    - Set table_status = "Available"
    - Clear session_id

Occupied → Billing:
Trigger: Customer clicks "Request payment"
  Condition:
    - table_status == "Occupied"
    - EXISTS (order_items WHERE status == "Ready")
  Action:
    - Set table_status = "Billing"
- Disable QR ordering (return "Table currently paying")
    - Notify staff

Billing → Occupied (Rollback):
Trigger: Customer cancels payment request
  Condition:
    - table_status == "Billing"
    - payment_status != "Paid"
  Action:
    - Set table_status = "Occupied"
    - Re-enable QR ordering

Billing → Cleaning:
Trigger: Payment completed
  Condition:
    - table_status == "Billing"
    - payment_status == "Paid"
  Action:
    - Set table_status = "Cleaning"
    - Close session
    - Archive order data

Cleaning → Available:
Trigger: Staff marks "Completed cleaning"
  Action:
    - Set table_status = "Available"
    - Clear session_id
    - Ready for next customer
````

### D. Key Business Rules

- **Unique:** Each store cannot have two tables with the same name or ID.
- **Delete Constraint:** Do not delete a table if it has orders `Pending`/`Active`.
- **Move table (Merge/Switch):** Allows staff to transfer the entire shopping cart/order from the old table to the new table and release the old table.
- **Safe Empty Session Release:** Staff can release an occupied table only when Order proves the bound session is empty: same tenant/table/session, `orderCount == 0`, no bill and no persisted orders. This is not a generic force-unlock.

  ```
  Transfer Table Logic:
  Validate: destination table Available (Catalog); active session has orders/bill (Order).
  ```

Step 2.4 flow (saga-style transfer lock — no ACID transaction across Order PG + Catalog PG + Redis):

- Transfer key + update orders/session in Order DB
- TCP Catalog: updated `tables.status` and binding table
- Redis: session/cart metadata (`table_id`/display)
- Compensation if the middle step fails; realtime via BFF Direct (no Kafka topic rename table)

  ```

  ```

- **Package Limits:** The maximum number of tables created is limited according to the purchased service package.

---

## 4. CUSTOMER ORDERING FLOW

The process from the moment the customer scans the QR until the order is sent to the kitchen.

### A. Detailed Business Processes

1. **Session Initiation:**
   - Customers scan the QR code, the Menu interface opens (Progressive Web App).
   - The system identifies `Store_ID`, `Table_ID`, and authenticates `Token`.
   - **Session Management:**

     ```txt
     IF table_status == "Available"
     THEN create a new Session, bind table.session_id, and mark the table Occupied

     IF table_status == "Occupied" AND active empty session is stale or already closed
     THEN Order safely releases the empty session/table and creates a fresh Session

     IF table_status == "Occupied" AND active session is valid
     THEN join current Session (Shared Cart - same cart)

     IF table_status == "Billing" OR table_status == "Cleaning"
     THEN block ordering and show the appropriate waiting message
     ```

- **Shared Cart Logic:** All guests who scan QR at the same table (in the same Session) will see the same shopping cart and can add items together.

2. **Item Selection:**
   - Browse Menu by category, check `Available`/`Out of Stock` Real-time status.
   - Click on the item → Show details (Large image, Description, Price).
   - Select quantity → Click "Add to cart".

3. **Cart Management:**
   - View the list of selected items, displaying: Item name, Quantity, Price, Total.
   - **Edit:** Increase/decrease quantity, delete dishes, add dish notes (Example: "Not spicy", "Low salt").
   - **Calculate total amount:** Total amount = Σ(Price × Quantity).

4. **Order Submission:**
   - Customer clicks "Order". Order status changes to `Pending` (Waiting for confirmation).
   - The system sends Instant Notifications (sound/vibration) to the employee's device at the counter/POS.

5. **Confirmation & Routing:**
   - Staff checks and clicks "Confirm".
   - Order moved to `Processing` (Processing).
   - **Kitchen Coordination:** Automatic ordering system: Dishes -> Kitchen screen; Drinks -> Bar Screen.
   - Automatically print Kitchen Order Ticket (KOT) if there is a printer.

6. **Order Tracking:**
   - Customer interface status updates: "Order sent" -> "Processing" -> "Delivery ready".
   - Customers can order new items (Additional Order) without affecting the old order.

### B. Key Business Rules

- **Ordering Lock:**

  ```
  IF table_status == "Billing"
  THEN disable "Add item" button
  AND show message "Table is paying, cannot order more dishes"
  ```

- **Concurrent Inventory Handling / Order Confirm Saga:**

  ```
  Submit (customer): only checks snapshot availability — DOES NOT deduct inventory.

  Confirm (staff, PENDING → PROCESSING):
  OrderConfirmSagaService orchestrates the flow.
  Catalog service (owns menu_items and stock_reservations): lock reservation + menu rows,
  persist the request hash/result/version, and deduct in one Catalog transaction
  (via TCP transactional command — Order service does not directly UPDATE DB Catalog)
  Repeating the active tenant/order/key/payload returns the stored result without another deduction.
  Order service: persist the returned reservation version with order status/items and `order.confirmed` outbox.
  If acknowledged Catalog deduct succeeds but Order commit/outbox fails, Order releases that exact version.
  Reconfirm after a completed release creates the next version; an older release is stale and changes no stock.
  ```

If the Catalog response is lost after its commit, Order remains `PENDING`. Retrying the same confirm recovers through the stored Catalog reservation. No automatic recovery occurs when no caller retries.

If not enough inventory → structured error for staff (previously submitted customer is only pending)

Stock/menu visibility: Catalog/BFF invalidate cache/query theo write path; not claim menu realtime WS.

```

**Timestamp:** Use `server_timestamp` (UTC), NOT `client_timestamp`.

- **Cumulative Orders:** Additional orders in the same Session will be merged into a single Bill when paying.

- **Required Confirmation:** All orders must go through status `Pending` → Confirmation staff → `Processing`, to prevent spam/virtual orders.

- **Cancellation by customer:**

```

IF order_status == "Pending" AND confirmed == false
THEN allow customer to cancel (Soft delete, keep log)

IF order_status IN ["Processing", "Ready"]
THEN disable cancel button for customer
AND require staff/manager approval to cancel

````

---

## 5. ORDER PROCESSING FLOW & KITCHEN (KITCHEN/KDS FLOW)

Starts when the staff confirms the order and ends when the food is ready.

### A. Detailed Business Processes

1. **Receiving and Sorting (Ticket Routing):**
  - Automatic order separation: Divide dishes and drinks to separate Kitchen Screen and Bar Screen.
  - Each order appears as an electronic "Ticket", displaying: table number, dish name, notes and waiting time.

2. **Acknowledging:**
  - **Pending Status:** New card has a prominent color (Red/Yellow).
  - **Processing:** The chef clicks on the card to confirm "Processing this dish", helping to avoid duplicates.

3. **Request Processing:**
  - Chefs view exact Modifiers and Guest Notes requests.
  - **No batching/merging of items:** KDS displays tickets/items according to the backend snapshot; There is no batch queue, cross-table totals, or API/UI contract for combining orders. Cart before submitting can still combine the same item/note in the same session.

4. **Completed Processing (Ready to Serve):**
  - The chef presses "Done/Ready". The card disappears from the kitchen screen.
  - **Activate Notification (Ping):** The system sends an immediate notification to the waiter: "Table 05 - Beef Pho is finished".

5. **Recall/Error Correction (Recall Logic):**
  - Allows chefs to recall cards that accidentally click "Done" to return to the processing state.

### B. Key Business Rules

- **FIFO (First In - First Out):** Orders that come in first must be displayed first.
- **Late Warning (SLA Warning):** Order cards that have not been completed for more than X minutes must change color/flashing to warn of overload/forgotten orders.
- **Synchronize State:** WebSocket is realtime hint; KDS/PWA/POS must refetch REST snapshot after mutation, reconnect or missed event. Order service is still the source of truth for customer-visible status.
- **Priority:** Allows you to mark tables/dishes as "Priority" to put them at the top of the KDS list.

---

## 6. PAYMENT FLOW & CONTROL (PAYMENT & RECONCILIATION)

Ensure every service is converted into revenue accurately and recorded.

### A. Detailed Business Processes

1. **Payment Request:**
  - The customer presses the "Pay" button on the Web-app -> The system sends an Alert to the employee's POS/Tablet.
  - **Order Locking:** The table changes to `Billing` status, customers cannot order more dishes.

2. **Check & Summarize Invoices (Final Review):**
  - Staff checks the list of items, quantity, and total amount.
  - **Simple payment formula:**
    ```
Subtotal = Σ(Item price × Quantity)
    Total = Subtotal
    ```
- **Status constraints:** Only allow switching to Billing when all dishes have `Ready` (Completed processing).

3. **Payment Execution:**
  - **Cash Payment:**
    ```
Staff enters the amount of money given by the customer
The system calculates excess money = Money received - Total
Staff confirmed "Money collected"
    → payment_status = "Paid", payment_method = "Cash"
    ```
- **Bank Transfer — SePay / VietQR):**

    ```
VietQR QR generation system (SePay) with:
- Parameter amount = bill.roundedTotal (VND rounded according to the thousand rounding policy)
- Transfer content (des / CK content) contains fixed billReference:
"QRTBL" + first 8 characters of billId after removing the hyphen (UUID)

Customers scan QR and transfer money

Webhook SePay → BFF → Payment matches billReference (code or regex on content)
- If amount < roundedTotal: keep payment PENDING, record audit SEPAY_WEBHOOK_UNDERPAID
- If amount >= roundedTotal: payment_status = "Paid"; saved paidAmount = actual amount received
(overpaid accepted; no automatic payout of the difference)
    ```

> **Architecture note (2026-05):** Transfer payments are processed via **SePay + Dynamic VietQR** — QR code embedded inline in POS/PWA (no redirect). The Phase 3 direct webhook route now verifies HMAC raw-body; The Phase 4B tenant/platform route uses its own `x-secret-key` path and needs hardening value verification before production. See `technical-architecture.md` §6.2.7 and phase record `docs/phases/phase-3-payment.md`.

4. **Print Invoice & Clear Desk (Closing):**
  - Print paper invoices.
  - **After successful payment:** According to the table state machine, the table moves `Billing` → `Cleaning`; The employee then marks `Cleaning` → `Available` when finished cleaning. Do not describe “jump straight Available” immediately upon checkout.

5. **Financial Reconciliation:**
  - At the end of the day/month, the system summarizes revenue by method (Cash, Transfer...).
  - The shop Owner matches the bank balance/cash box data with the report on QRTable.

6. **Dashboard & Reporting:**
  - Owner and Manager use `/dashboard` for tenant-scoped reporting when they have `report.read_own`.
  - Tenant report API access also requires the current subscription to be `ACTIVE` and to include `analytics_basic`.
  - `FREE` tenants still see the dashboard shell, current package, quota usage, and upgrade prompts, but analytics widgets are locked.
  - `BASIC` tenants see basic revenue/order/table analytics. Advanced dashboard widgets are visually locked.
  - `PREMIUM` tenants see the full dashboard including advanced insights such as top items and payment-method breakdown.
  - Super Admin uses `/admin/analytics` for platform subscription analytics and explicit tenant drilldown through `report.read_any`. Super Admin report access is not blocked by the selected tenant's package, but the UI shows the tenant's plan/features for audit context.

### B. Key Business Rules

- **Immutability:**

````

IF bill_status == "Completed" AND payment_status == "Paid"
THEN disable all edit operations
(Post-payment adjustments / refund are out of scope for the current thesis build.)

```

- **Round money:** Round to thousands (VND). For example: 127,500 VND → 128,000 VND.

- **Audit Log required:**

```

IF bill_status changed to "Canceled" AND any_item.status IN ["Processing", "Ready"]
THEN require: - canceled_by (user_id) - cancel_reason (text) - canceled_at (timestamp)
AND log to audit_trail table

```

- **Block payment when the order is not completed:**
```

IF EXISTS (order_item WHERE status IN ["Pending", "Processing"])
THEN disable "Request payment" button
AND show tooltip "Unfinished items"

````

---

## 7. OFFLINE HANDLING & NETWORK RESILIENCE

The system must operate stably in unstable network conditions.

### A. Offline Scenario - Client Side

```yaml
Scenario 1: Customers scan QR when offline
Detection: navigator.onLine == false
Behavior:
- Show toast "No network connection"
- Load cached menu (if ever accessed)
- Disable "Add to cart" button
- Show "Watch only, can't order offline"

Scenario 2: Lost your life midway while browsing the menu
Detection: WebSocket disconnect event
Behavior:
- Show warning banner "Connection lost, trying to reconnect..."
- Retry connection with exponential backoff (2s, 4s, 8s...)
- Keep cart in localStorage
  - Disable submit order button

Scenario 3: Loss of life while submitting order
Detection: HTTP request timeout or network error
Behavior:
- Show error "Unable to send order, please check connection"
- Queue order in IndexedDB
- When the network comes back → Auto retry submit
- Show sync indicator: "Synchronizing orders..."
````

### B. Offline Scenario - Employee Side (POS/KDS)

```yaml
Scenario 1: POS loses connection when confirming order
  Behavior:
    - Queue confirmation action
- Show "Offline - Operations will be synchronized when the network is available"
    - Save to local queue with timestamp
- Auto sync when reconnect
    - Prevent duplicate submission (use idempotency key)

Scenario 2: KDS lost connection
  Behavior:
    - Continue showing existing orders from cache
    - Queue status updates (mark as Processing/Ready)
    - Show offline indicator
    - Auto sync all queued actions when reconnect
    - Resolve conflicts: Server state wins

Scenario 3: Payment terminal offline
  Behavior:
    - Allow cash payment only
    - Disable bank transfer QR generation
    - Queue payment record
- Manual reconciliation when online
```

### C. Sync Strategy

```typescript
Conflict Resolution Rules:
  IF local_timestamp < server_timestamp THEN
    server_state_wins()
    discard_local_changes()
notify_user("Data has been updated from the server")

  IF action == "order_submission" THEN
    use_idempotency_key(order_id + session_id)
    prevent_duplicate_order()

Retry Policy:
  max_retries = 3
  backoff = exponential (2^n seconds)

  IF retry_count > max_retries THEN
show_error("Unable to synchronize, please contact administrator")
    log_to_error_tracking()
```

---

## 8. STATE MACHINE - ORDER LIFE CYCLE

Manage order status from creation to completion.

> **Step 2.4 specification (canonical Q1–Q12):** [Step 2.4 business specification](specs/business-logic-step-2.4-spec.md) — additional ownership service, bill request explicit, transfer saga, RBAC cancel permission separation. Section §8 serves as an overview; When deviating, prioritize Step 2.4 specification.

> **Enum casing convention:** The diagram + rules below use **Title Case** (`Draft`, `Pending`, `Processing`, `Ready`, `Served`, `Completed`, `Canceled`) for readability. Enum values ​​canonical are **UPPERCASE** (`DRAFT`, `PENDING`, ...) — see `libs/shared/types/src/lib/order.types.ts` and `docs/phases/phase-2a-order-kafka.md` Step 2.3. One-to-one mapping (`Draft` ↔ `DRAFT`, etc.).

### A. Order State Diagram

```
┌──────────┐
│ Draft │ (Customers are adding items to cart, not submitted yet)
└────┬─────┘
     │ Submit Order
     ▼
┌──────────┐
│ Pending │ (Waiting for staff confirmation)
└────┬─────┘
     │ Staff confirm
     ├─────────────── Cancel (if not confirmed) → Canceled
     ▼
┌────────────┐
│ Processing │ (Already in the kitchen, processing)
└─────┬──────┘
      │ Kitchen mark as done
      ├────────────── Cancel (require manager approval) → Canceled
      ▼
┌──────────┐
│ Ready │ (The dish is ready, waiting for the table)
└────┬─────┘
     │ Serve to table
     ▼
┌──────────┐
│ Served │ (Already on the table)
└────┬─────┘
     │ Payment completed
     ▼
┌────────────┐
│ Completed │ (Completed, cannot be edited)
└────────────┘
```

### B. State Transition Rules

```yaml
Draft → Pending:
Trigger: Customer clicks "Order"
  Validation:
    - cart_items.length > 0
    - all_items.status == "Available"
  Action:
- Create order record (persist from PENDING — Draft without DB row)
- First submission in session: create OPEN bill if there is no one (Step 2.4)
    - Notify staff (sound + push notification)
- Clear cart after successful submission

Draft → Canceled:
Trigger: Customer closes browser / removes cart / explicit clear
  Actor: Customer (self, implicit)
  Condition:
- cart has not been submitted (order does not exist as record)
  Action:
- Release Redis cart key (TTL expiry or explicit DEL)
- DO NOT create order record (nothing to cancel formally)
Note: This transition will NOT persist because Draft has not created a DB row; code-level check in ALLOWED_ORDER_TRANSITIONS for FE disable "Submit" + for BE reject replay if cart is clear.

Pending → Processing:
Trigger: Staff clicks "Confirm"
Actor: Staff, Manager (RBAC details: permission-matrix §6 / §6.1)
  Validation:
    - order_status == "Pending"
- TCP Catalog: enough inventory at the time of confirmation
  Action:
- Catalog deduct stock (in DB Catalog)
    - Persist Catalog reservation version on the order
    - Update order_status = "Processing"
- Route to KDS (Kafka order.confirmed + station from `MenuItem.station`)
    - Print KOT if printer connected
  Compensation:
    - If Catalog acknowledged stock deduction but Order commit/outbox fails, release the matching reservation version

Pending → Canceled:
  Trigger: Customer or Staff cancel
  Actor: Customer (self), Staff (reject pending — `order.cancel_pending`), Manager
  Condition:
    - order_status == "Pending"
    - confirmed == false
  Action:
    - Update order_status = "Canceled"
    - Store cancellation reason/actor/timestamp on the order row
- Do not restore stock (not deducted when pending — specification Step 2.4 Q2)
    - Notify customer

Processing → Canceled:
  Trigger: Manager cancel (+ Owner); optional policy restore stock qua Catalog
  Actor: Manager / Owner (`order.cancel_processing`)
  Condition:
    - order_status == "Processing"
    - Require cancellation reason
  Action:
    - Update order_status = "Canceled"
    - Store cancellation reason/actor/timestamp on the order row
    - Notify kitchen to stop
- Restore/adjust stock through Catalog using `stock_reservation_version` (legacy pre-migration orders use the null-version compatibility path once)
    - Write simplified outbox `order.status_changed` for durable status projection/audit
    - Flag for revenue report exclusion

Processing → Ready:
  Trigger: Kitchen marks as done
  Actor: Kitchen staff
  Action:
    - Update order_status = "Ready"
    - Notify service staff (ping)
    - Show on "Ready to serve" screen

Ready → Served:
  Trigger: Service staff confirms served
  Actor: Service staff
  Action:
    - Update order_status = "Served"
    - Remove from kitchen display
    - Enable payment request

Served → Completed:
  Trigger: Payment completed (Phase 3)
  Condition:
    - payment_status == "Paid"
- bill canonical: `BillStatus` **PAID** (prose "Closed/Completed" = payment ended)
  Action:
    - Update order_status = "Completed"
    - Archive to read-only storage
    - Generate revenue record
```

---

## 9. DEGREE OF AUTHORITY & ACTOR PERMISSIONS

Clearly define the authority of each role in the SaaS Multi-tenant system.

> **Actor Architecture:** Described by **role group (business language)**; The actual RBAC matrix (6 roles × 62 permissions) is canonical at [permission matrix](architecture/permission-matrix.md) §6.

> **Admin app navigation:** `management-app` (Phase 2.x) uses **role → tab/route** for UX; **BFF** still enforces **permission** for each endpoint. See [permission matrix](architecture/permission-matrix.md) §9 (synchronization principle + tech debt).

### A. Actor Hierarchy & Roles

#### **1. Super Admin (Platform Administrator)**

**Scope:** Entire QRTable platform (Cross-tenant)

- **Role:** SaaS system administrator
- **Main powers:**
  - Tenants management: Approve/Temporarily lock/Delete restaurants
  - Manage Subscription Plans: Create/Edit plans (Lite, Pro, Enterprise)
  - Monitor platform analytics: subscription revenue, tenant status, plan distribution, and invoice status
  - Inspect explicit tenant report drilldown for support/audit context
  - System configuration: Payment gateways, System settings
  - View all data (for support/debug purposes)

**Microservice mapping:** Authorizer service, User-Access service, SaaS service

---

#### **2. Restaurant Owner (Merchant Admin)**

**Scope:** Tenants they own

- **Role:** Restaurant Owner — full operational authority + HR (including deleting employees)
- **Keycloak role:** `Owner`
- **Permissions:** full operational (CRUD menu, tables, orders, payment, KDS), HR delete (`user.delete`), own-tenant SaaS visibility/checkout (`subscription.checkout`), update payment settings (`payment_settings.update_own`), and own tenant reporting (`report.read_own`, gated by package features).

**Microservice mapping:** User-Access service, Catalog service, Order service, Payment service, SaaS service

---

#### **3. Manager (Operational Lead)**

**Scope:** tenant to which they are assigned

- **Role:** Shift operations manager — similar to Owner in operations but without the sensitive financial/HR rights.
- **Keycloak role:** `MANAGER`
- **Different from Owner:** cannot delete users, create/cancel subscription checkout, or update SePay/payment settings; can view tenant subscription/plan/payment settings and own tenant reporting (`report.read_own`, gated by package features).

**Corresponding microservice:** Same as Owner for operations, plus permission to view SaaS/Payment settings within the tenant

---

#### **4. Staff (Restaurant Employees)**

**Scope:** tenant for whom they are hired

- **Role:** Restaurant staff
- **Sub-roles:**
  - **Waiter/Server**: Confirm orders, process payments, transfer tables
  - **Chef**: View & update dish KDS
  - **Barista/Bartender**: View & update beverage KDS

- **Main powers:**
  - Order confirmation from Customer
  - Update dish status (Pending → Processing → Ready)
  - Payment processing (Cash/Bank Transfer)
  - Table transfer
  - Mark clean table (Cleaning → Available)
  - Cancel unconfirmed orders (Pending only)
  - **NO permissions:** Manage menus, view sales reports, manage staff

**Microservice mapping:** Order service, Kitchen service, Payment service

---

#### **5. Customer (End User - Diner)**

**Scope:** Only their own Session/Table

- **Role:** Customers come to the restaurant
- **Features:** Usually NO login required (Guest checkout to optimize UX)

- **Main powers:**
  - Scan the QR code to enter the Menu
  - View electronic menu (Digital Menu)
  - Order via QR (Add to cart, Submit order)
  - View real-time order status
  - Add dish notes ("Not spicy", "Low salt")
  - Request payment (Request bill)
  - Cancel unconfirmed orders (self-cancel)
  - **NO rights:** View orders from other tables, view input prices, view reports

**Corresponding microservices:** Order service, Menu service

---

### B. Permission Matrix (Business-Language Summary)

> **Canonical source:** Full details of 6 roles × 62 permissions see [permission matrix](architecture/permission-matrix.md#6-canonical-permission-matrix-6-roles--62-permissions). The table below is the **business-language summary** for the 5 actor groups, NOT the source of truth for the RBAC guard check.

| Features                             | Super Admin               | Restaurant Owner             | Staff (Waiter) | Staff (Chef/Bar) | Customers |
| ------------------------------------ | ------------------------- | ---------------------------- | -------------- | ---------------- | --------- |
| **Platform Management**              |                           |                              |                |                  |           |
| Tenants Management (Approve/Lock)    | ✅                        | ❌                           | ❌             | ❌               | ❌        |
| Create Subscription Plans            | ✅                        | ❌                           | ❌             | ❌               | ❌        |
| View all Tenants                     | ✅                        | ❌                           | ❌             | ❌               | ❌        |
| Configure Payment Gateway            | ✅                        | ❌                           | ❌             | ❌               | ❌        |
| Checkout subscription tenant         | ❌                        | ✅ (Owner only)              | ❌             | ❌               | ❌        |
| View tenant packages/subscriptions   | ✅                        | ✅                           | ❌             | ❌               | ❌        |
| Update SePay tenant                  | ❌                        | ✅ (Owner only)              | ❌             | ❌               | ❌        |
| **Restaurant Management**            |                           |                              |                |                  |           |
| Menu Management (CRUD)               | ✅ (Debug)                | ✅                           | ❌             | ❌               | ❌        |
| Manage Tables & QR                   | ❌                        | ✅                           | ⚠️ (View only) | ❌               | ❌        |
| Staff Management                     | ❌                        | ✅                           | ❌             | ❌               | ❌        |
| See Analytics/Revenue                | ✅ (Platform + drilldown) | ✅ (Own only, package-gated) | ❌             | ❌               | ❌        |
| Configure Restaurant Settings        | ❌                        | ✅                           | ❌             | ❌               | ❌        |
| **Order Operations**                 |                           |                              |                |                  |           |
| Scan QR & View Menu                  | ❌                        | ✅                           | ✅             | ❌               | ✅        |
| Order via QR                         | ❌                        | ❌                           | ❌             | ❌               | ✅        |
| Order confirmation (Pending → Proc.) | ❌                        | ✅                           | ✅             | ❌               | ❌        |
| Cancel unconfirmed order             | ❌                        | ✅                           | ✅             | ❌               | ✅ (Own)  |
| Cancel order already in the kitchen  | ❌                        | ✅ (Manager)                 | ❌             | ❌               | ❌        |
| KDS Update (Ready/Processing)        | ❌                        | ✅                           | ❌             | ✅               | ❌        |
| View order status                    | ✅ (Debug)                | ✅ (All orders)              | ✅ (All)       | ✅ (KDS only)    | ✅ (Own)  |
| **Table & Payment**                  |                           |                              |                |                  |           |
| Table Transfer                       | ❌                        | ✅                           | ✅             | ❌               | ❌        |
| Payment Processing                   | ❌                        | ✅                           | ✅             | ❌               | ❌        |
| Request payment                      | ❌                        | ❌                           | ❌             | ❌               | ✅        |
| Mark clean desk                      | ❌                        | ✅                           | ✅             | ❌               | ❌        |

---

### C. Authorization Logic & Business Rules

```yaml
Multi-Tenant Authorization Middleware:

  STEP 1: Identify Actor Type
    IF request.path.startsWith('/admin/platform') THEN
      required_actor = "Super Admin"
    ELSE IF request.path.startsWith('/restaurant') THEN
      required_actor IN ["Restaurant Owner", "Manager", "Staff"]
    ELSE IF request.path.startsWith('/menu') THEN
      required_actor = "Customer" OR "Staff"

  STEP 2: Verify Authentication
    IF required_actor != "Customer" THEN
      token = request.headers.authorization
      IF !token OR !verify_jwt(token) THEN
        RETURN 401 Unauthorized

      user = decode_jwt(token)
    ELSE
# Customer can be anonymous or have session_id
      session = request.cookies.session_id OR generate_guest_session()

  STEP 3: Check Actor Permissions
    IF required_actor == "Super Admin" THEN
      IF user.role != "SUPER_ADMIN" THEN
        RETURN 403 Forbidden
      # Super Admin bypass tenant check
      PROCEED

    IF required_actor IN ["Restaurant Owner", "Manager"] THEN
      IF user.role NOT IN ["OWNER", "MANAGER"] THEN
        RETURN 403 Forbidden
      # Check tenant ownership
      IF user.tenant_id != requested_resource.tenant_id THEN
        RETURN 403 Forbidden "Cannot access other restaurant's data"

    IF required_actor == "Staff" THEN
      IF user.role NOT IN ["STAFF", "WAITER", "CHEF", "BARISTA"] THEN
        RETURN 403 Forbidden
      # Check staff assignment
      IF user.tenant_id != requested_resource.tenant_id THEN
        RETURN 403 Forbidden

    IF required_actor == "Customer" THEN
# Customer only sees his/her session/table data
      IF session.table_id != requested_resource.table_id THEN
        RETURN 403 Forbidden "Cannot view other table's orders"

  STEP 4: Action-Level Authorization
# Example: Cancel order already in the kitchen
    IF action == "cancel_order" AND order.status == "Processing" THEN
      IF user.role NOT IN ["OWNER", "MANAGER"] THEN
        RETURN 403 Forbidden "Only Manager can cancel processing orders"

      # Require cancellation reason
      IF !request.body.cancel_reason THEN
        RETURN 400 Bad Request "Cancellation reason required"

      # Log audit trail
      audit_log.create({
        actor: user.id,
        action: "cancel_order",
        resource: order.id,
        reason: request.body.cancel_reason,
        timestamp: now()
      })
```

---

### D. Tenant Isolation Rules (CRITICAL for SaaS)

```yaml
Database Level Isolation:
# All queries must filter by tenant_id
  SELECT * FROM orders WHERE tenant_id = :current_tenant_id

# Global Index must include tenant_id
  CREATE INDEX idx_orders_tenant ON orders(tenant_id, created_at)

# Foreign Keys must be in the same tenant
  CONSTRAINT fk_order_table
    FOREIGN KEY (table_id)
    REFERENCES tables(id)
    WHERE tables.tenant_id = orders.tenant_id

API Level Isolation:
# Middleware automatically injects tenant_id
  IF user.role == "SUPER_ADMIN" THEN
# Super Admin can query cross-tenant using query param
    tenant_id = request.query.tenant_id OR NULL
  ELSE
# All other actors only see their tenant
    tenant_id = user.tenant_id

# Override all filters from the client
  query.where('tenant_id', tenant_id)

Session/Cache Isolation:
# Cache key must include tenant_id
  cache_key = "menu:#{tenant_id}:#{category_id}"

# Session storage must isolated
  redis.setex("session:#{tenant_id}:#{session_id}", data)

File Storage Isolation:
# Upload files to separate folders by tenant
  file_path = "uploads/#{tenant_id}/menu_images/#{file_name}"

# Presigned URL must verify tenant ownership
  IF file.tenant_id != user.tenant_id THEN
    RETURN 403 Forbidden
```

---

### E. Special Authorization Cases

#### **Case 1: Manager Override Staff Actions**

```yaml
Scenario: Manager wants to cancel the order that Staff has confirmed

  IF user.role == "MANAGER" AND action == "override_staff_action" THEN
    original_action = audit_log.find(action_id)

# Manager can only override within the same tenant
    IF original_action.tenant_id != user.tenant_id THEN
      RETURN 403 Forbidden

    # Log override action
    audit_log.create({
      actor: user.id,
      action: "override",
      original_action: action_id,
      reason: request.body.reason
    })

# Perform new action
    PROCEED with requested change
```

#### **Case 2: Super Admin Debug Mode**

```yaml
Scenario: Super Admin needs to see a tenant's data for support

  IF user.role == "SUPER_ADMIN" AND request.query.debug_mode == true THEN
    tenant_id = request.query.tenant_id

    # Log debug access (for compliance)
    admin_audit_log.create({
      admin_id: user.id,
      action: "debug_access",
      tenant_id: tenant_id,
      reason: request.query.reason,
      ip_address: request.ip
    })

    # Temporary impersonation
    context.set_tenant(tenant_id)
    context.set_actor("SUPER_ADMIN_DEBUG")

    PROCEED with READ-ONLY access
```

#### **Case 3: Customer Self-Service Cancellation**

```yaml
Scenario: Customer cancels the order he just placed

  IF user.actor_type == "Customer" AND action == "cancel_order" THEN
    order = Order.find(order_id)

    # Verify ownership via session
    IF order.session_id != customer.session_id THEN
      RETURN 403 Forbidden "Not your order"

# Can only be canceled without confirmation
    IF order.status != "Pending" OR order.confirmed == true THEN
      RETURN 400 Bad Request "Cannot cancel confirmed order. Please ask staff for help."

    # Soft cancel only; no stock restore because pending orders have not deducted stock
    order.update(status: "Canceled", canceled_by: "Customer", canceled_at: now())
```

---

### F. Actor Mapping to Microservices

| Actor                | Primary Microservices                               | Authentication Method |
| -------------------- | --------------------------------------------------- | --------------------- |
| **Super Admin**      | Authorizer, User-Access, SaaS, BFF                  | JWT (Session-based)   |
| **Restaurant Owner** | Catalog, User-Access, Order, Kitchen, Payment, SaaS | JWT (Session-based)   |
| **Staff**            | Catalog, Order, Kitchen, Payment                    | JWT (Session-based)   |
| **Customer**         | Catalog/Menu, Order, Payment                        | Session ID (Guest)    |
| **External System**  | Payment Gateway, Printing, Delivery Integration     | API Key + Webhook     |

---

##III. EXTENDED FEATURES

- **Human Resources Management:** Set up a detailed decentralization system (Admin, Management, service, Kitchen).
- **Manage service requests** Customers can send additional requests (Order additional dishes, Call for payment) or request assistance from service staff via Web-app.
- **Revenue Report (Analytics):** Detailed statistics by time, best-selling items, peak hours.
- **Simple Inventory Management (Inventory):** Set the quantity of ingredients for the dish (For example: 1 bowl of pho contains 200g of meat), automatically deduct inventory when an order is generated.
