# DOCUMENT DETAILED EXPLANATION OF DATABASE DIAGRAM (ERD)

> **Project:** QRTable SaaS POS
> **Reference:** Based on `erd.dbml`, `erd.mmd` and `business-logic.md` > **Purpose:** This document explains in detail the meaning and flow of links between tables in the system, serving thesis reporting and general understanding of the programming team.

---

## 🏗️ OVERVIEW OF DATA ARCHITECTURE

The QRTable system applies a combined data model:

- **Database-per-service** (Microservice pattern): Each microservice owns its own database, does not directly access other database services. Cross-service data access via TCP or Kafka events.
- **Multi-tenant — Discriminator Column** (SaaS pattern): In each database, all tenants share the same tables, isolated by column `tenant_id`.

### Database Boundaries

| Database                       | service         | Tables                                            |
| ------------------------------ | --------------- | ------------------------------------------------- |
| `qrtable_saas` (PostgreSQL)    | SaaS Management | tenants, pricing_plans, subscriptions             |
| `qrtable_catalog` (PostgreSQL) | Catalog         | categories, menu_items, areas, tables             |
| `qrtable_order` (PostgreSQL)   | Order           | sessions, orders, order_items, service_requests   |
| `qrtable_payment` (PostgreSQL) | Payment         | bills, payments                                   |
| `qrtable_auth` (MongoDB)       | User-Access     | users, roles                                      |
| Redis only                     | Kitchen         | KDS queues (Sorted Set, has no persistent tables) |

**Important note:** References between tables in different databases (eg `orders.table_id → tables.id`) are **logical FK** — not enforced by DB foreign key constraints. Data integrity is guaranteed at the application level.

The entire ERD can be divided into the following **5 Core Data Clusters**:

---

## 1. SAAS CLUSTER & MULTI-TENANCY (MULTI-TENANCY)

_System foundation, business management and service limitations._

### Table `tenants` (tenant / Restaurant)

- The root table creates the identity of each restaurant on the system.
- **Important Fields:**
  - `slug`: Used to create subdomain names on the Internet (eg: `the-coffee-house`).
  - `status`: Manage the restaurant's operational life cycle (`active`, `suspended`, `closed`).
  - `default_currency` & `default_locale`: Set default language and currency (VND, vi-VN).
- **Relationship:** 1-n (One-to-Many) relationship with ALMOST ALL other tables in the system.

### Table `pricing_plans` & `subscriptions` (Plans & Subscriptions)

- **`pricing_plans`**: Definition of service packages (Example: Free, Basic, Advanced). Contains limited quotas such as `max_tables` and `max_staff`. This is a Platform level table (without `tenant_id`).
- **`subscriptions`**: Bridge table. Record the purchase of Package Y by tenant

---

## 2. MENU CLUSTER & LIST (CATALOG DOMAIN)

_Manage the list of dishes displayed on the electronic Menu._

### Table `categories` (Category)

- Grouping dishes (Appetizers, Main dishes, Drinks...).
- **Important Fields:**
  - `time_start`, `time_end`: Allows configuration of display according to time frame (Ex: Breakfast menu).
  - `sort_order`: Allows the shop Owner to drag and drop the priority display order on the guest screen.

### Table `menu_items` (Food / Drink)

- Contains details of dishes assigned to a Category.
- **Important Fields:**
  - `price_vnd`: Selling price in VND (stored as integer `bigint` to avoid decimal errors).
  - `stock_qty`: Inventory quantity. Pessimistic Locking will be deducted during the ordering process.
  - `status`: Can be switched to `out_of_stock` (out of stock) to automatically hide from the cart.

---

## 3. TABLE SPACE CLUSTER & SESSION MANAGEMENT (TABLE & SESSION)

_Connect physical customers to the system via QR code._

### Tables `areas` & `tables` (Areas & Tables)

- **`areas`**: Monitor premises (Ground Floor, 2nd Floor, Garden).
- **`tables`**: The specific table belongs to a Region.
- **Important Fields of the Table:**
  - `status`: The closed life cycle of the table (`available` -> `occupied` -> `billing` -> `cleaning`). Obstruct/allow guests to scan QR depending on status.
  - `qr_token`: HMAC hash code to secure QR codes, prevent URL spoofing.

### Table `sessions` (Session - Extremely important)

- This is the **Central Table** that links Users (Customer scans QR) with Orders. Customers usually do not have a logged in Account, so they are identified via `Session`.
- Every time a QR is scanned into a table `available`, a new Session is created. All Orders placed by that table during this time period are put together in this one Session (Shared Cart).
- **Important Fields:**
  - `status`: Session is open or closed (active, closed).
  - `last_activity_at`: Used to automatically close the Session (auto timeout) if the guest leaves without notice.

---

## 4. ORDERING & PROCESSING (ORDERING & KDS)

_Handle the ordering and kitchen flow._

### Table `orders` & `order_items`

- Guests do not create 1 Order for the entire meal. Customers can **order multiple times** (Example: Order 1: Main dish. Order 2: Order more beer). All attached to `session_id`.
- **`orders`**:
  - `idempotency_key`: Block double-submit if the "Order" button is pressed twice.
  - `status`: From `pending` (waiting for approval) -> `processing` (go to the kitchen) -> `ready` (Kitchen finished) -> `served` (On the table) -> `completed`.
- **`order_items`**:
  - Save details of each item.
  - `unit_price_vnd`: Prices from `menu_items` must be copied at the time of booking (because the original price on the menu may be changed later).
  - Dish status (`status`): Supports the KDS screen (kitchen) to notify each individual dish of completion.

### Table `service_requests` (service Request)

- Store the signals "Call staff", "Get invoice". Helps managers monitor employees' SLAs response speed.

---

## 5. BILLING & PAYMENTS

_Standardize revenue and cash flow._

### Table `bills` (Total Invoice)

- When the customer calls to pay (Session closes), all `orders` in that `session_id` will be aggregated into **a single `bill`**. 1-1 relationship with Session.
- **Important Fields:**
  - `total_vnd`: Total principal amount.
  - `rounding_delta_vnd`: Rounding error. (For example: The system rounds 127,500 VND to 128,000 VND, then the delta is 500 VND).

### Table `payments` (Payments)

- **`payments`**: 1 Invoice can be paid multiple times or through multiple forms (split money).
  - `method`: Cash (`CASH`), VietQR Transfer (`VIETQR`).
  - `sepay_transaction_id`: Map with Webhook returned from SePay. Ensure consistency (idempotency key).

---

## 🔄 TYPICAL DATA FLOW SUMMARY (DATA FLOW)

1. Restaurant initialization (Create record in `tenants`, `subscriptions`).
2. The shop Owner sets up the Menu (Create `categories`, `menu_items`) and Tables and Chairs (Create `areas`, `tables`).
3. Customers come to the shop, scan the QR on `table`. The system converts `table_status` to `occupied` and generates a record `sessions`.
4. Customer chooses the dish, click "Send". The system generates `orders` (and multiple `order_items`) records, excluding `stock_qty` from `menu_items`. Attach that `session_id`.
5. Kitchen staff interactively changes the status of `orders` (PENDING → PROCESSING → READY → SERVED) — UPPERCASE values ​​per Step 2.3 ADR.
6. When the customer finishes eating, they call to pay. Update `table_status` to `billing`. The system synthesizes `orders` and generates 1 record `bills`.
7. Collection staff (Cash/Transfer). Generates record `payments`.
8. Payment completed: Update `bills` -> closed, `sessions` -> closed, `table_status` -> `cleaning`.
9. Finished cleaning the table: The table returns to `available`, ready to welcome the next customer to welcome the new cycle.
