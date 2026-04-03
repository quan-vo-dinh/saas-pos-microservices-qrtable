---
name: clean-code
description: Pragmatic clean code standards for QRTable — NestJS microservices and React/Next.js frontends. Use when writing, reviewing, or refactoring any code. Based on SOLID, DRY, KISS, YAGNI principles.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash
---

# Clean Code — QRTable Standards

> **Nguồn:** Robert C. Martin (_Clean Code_), SOLID principles, Official NestJS/React docs
> **⚠️ These are TARGET standards.** The existing codebase may not follow them yet.
> When you see code that violates these rules — fix it. Never copy a bad pattern because "existing code does it."

---

## Core Principles

| Principle     | Rule                                                       |
| ------------- | ---------------------------------------------------------- |
| **SRP**       | Single Responsibility — each function/class does ONE thing |
| **DRY**       | Don't Repeat Yourself — extract duplicates                 |
| **KISS**      | Simplest solution that works                               |
| **YAGNI**     | Don't build unused features                                |
| **Boy Scout** | Leave code cleaner than you found it                       |

---

## Naming Rules

| Element       | Convention        | Example                                   |
| ------------- | ----------------- | ----------------------------------------- |
| **Variables** | Reveal intent     | `activeOrders` not `arr`                  |
| **Functions** | Verb + noun       | `findProductById()` not `get()`           |
| **Booleans**  | Question form     | `isActive`, `hasPermission`, `canPublish` |
| **Enums**     | PascalCase values | `OrderStatus.PAID` not `'paid'`           |
| **Constants** | SCREAMING_SNAKE   | `MAX_RETRY_COUNT`, `TAX_RATE`             |

> If you need a comment to explain a name — rename it.

---

## Function Rules

| Rule                | Target                              |
| ------------------- | ----------------------------------- |
| **Small**           | Max 20 lines                        |
| **One thing**       | One level of abstraction            |
| **Guard clauses**   | Early return, max nesting depth = 2 |
| **Few args**        | Max 3 — use DTO/object for more     |
| **No side effects** | Don't mutate inputs unexpectedly    |

### Guard Clauses Pattern

```typescript
// ❌ Arrow anti-pattern
async updateOrder(id: string, dto: UpdateOrderDto, tenantId: string) {
  if (id) {
    const order = await this.orderRepo.findById(id, tenantId);
    if (order) {
      if (order.status !== OrderStatus.CANCELLED) {
        return this.orderRepo.update(id, dto, tenantId);
      }
    }
  }
}

// ✅ Guard clauses
async updateOrder(id: string, dto: UpdateOrderDto, tenantId: string) {
  if (!id) throw new BadRequestException('Order ID required');
  const order = await this.orderRepo.findById(id, tenantId);
  if (!order) throw new NotFoundException(`Order "${id}" not found`);
  if (order.status === OrderStatus.CANCELLED) throw new BadRequestException('Cannot update cancelled order');
  return this.orderRepo.update(id, dto, tenantId);
}
```

---

## QRTable Layer Boundary Rules (CRITICAL)

```
Controller → HTTP only. ZERO business logic.
Service    → Business logic only. ZERO DB queries.
Repository → DB operations only. ZERO business logic.
```

**Violation examples:**

```typescript
// ❌ DB query in service
async getProduct(id: string) {
  return this.connection.query(`SELECT * FROM products WHERE id = '${id}'`);
}

// ❌ Business logic in controller
@Get(':id') async getProduct(@Param('id') id: string) {
  const product = await this.productRepo.findById(id, tenantId);
  if (product.stock === 0) product.isAvailable = false; // ❌ logic here
  return product;
}

// ✅ Correct separation
// Controller → delegates to service
@Get(':id') async getProduct(@Param('id') id: string, @CurrentTenant() tenantId: string) {
  return this.productService.findById(id, tenantId);
}
// Service → business logic
async findById(id: string, tenantId: string) {
  const product = await this.productRepo.findById(id, tenantId);
  if (!product) throw new NotFoundException(`Product "${id}" not found`);
  return product;
}
```

---

## Anti-Patterns (DON'T)

| ❌                             | ✅                                      |
| ------------------------------ | --------------------------------------- |
| Hardcoded port `3202`          | `configService.get('TCP_PRODUCT_PORT')` |
| Magic string `'paid'`          | `OrderStatus.PAID`                      |
| `throw new Error('not found')` | `throw new NotFoundException(...)`      |
| `@Body() body: any`            | `@Body() dto: CreateProductDto`         |
| Deep nesting (3+ levels)       | Guard clauses                           |
| Comment every line             | Self-documenting names                  |
| God function 100+ lines        | Extract private methods                 |
| Dead commented-out code        | Delete it                               |
| `let x, y, z`                  | Descriptive names                       |

---

## Before Editing ANY File

| Check                       | Why                       |
| --------------------------- | ------------------------- |
| What imports this file?     | They might break          |
| What does this file import? | Interface changes cascade |
| What tests cover this?      | Tests must stay green     |

> **Rule:** Edit the file + all dependents in the SAME task. Never leave broken imports.

---

## Self-Check Before Completing (MANDATORY)

| ✅  | Check                                                         |
| --- | ------------------------------------------------------------- |
| ☐   | Layer boundaries respected (no logic leaking across layers)   |
| ☐   | No magic strings/numbers — enums/constants used               |
| ☐   | All inputs have typed DTOs with `class-validator`             |
| ☐   | Typed NestJS exceptions used (not `throw new Error`)          |
| ☐   | Every DB query includes `tenant_id` filter                    |
| ☐   | No `any` types                                                |
| ☐   | `npx nx lint <project> --fix && npx nx test <project>` passes |

# Clean Code — QRTable Standards

## The Core Rule: Code Must Read Like Prose

Good code explains _what_ and _why_, not _how_.

---

## Naming Conventions

### Variables & Properties

```typescript
// ❌ Cryptic
const u = await this.ur.find(id);
const f = items.filter((i) => i.s === 1);

// ✅ Descriptive
const user = await this.userRepo.findById(id);
const activeItems = items.filter((item) => item.status === ItemStatus.ACTIVE);
```

### Boolean Naming

```typescript
// ❌ Ambiguous
let active: boolean;
let check: boolean;

// ✅ Readable
let isActive: boolean;
let hasPermission: boolean;
let canPublish: boolean;
let isOrderCompleted: boolean;
```

### Function Naming

```typescript
// ❌ Vague
async get(id: string) { }
async process(data: any) { }
async handle(event: any) { }

// ✅ Intention-revealing
async findProductById(id: string, tenantId: string) { }
async processPaymentRefund(orderId: string, amount: number) { }
async onOrderCreated(event: OrderCreatedEvent) { }
```

### Enum Values (No Magic Values)

```typescript
// ❌
if (order.status === 'paid') {
}
if (user.role === 2) {
}

// ✅ — define in libs/constants/src/lib/enum/
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}
export enum UserRole {
  OWNER = 'owner',
  STAFF = 'staff',
  CUSTOMER = 'customer',
}

if (order.status === OrderStatus.PAID) {
}
if (user.role === UserRole.STAFF) {
}
```

---

## Function Rules

### Single Responsibility

```typescript
// ❌ Too many responsibilities
async createOrder(dto: CreateOrderDto, tenantId: string) {
  // validate stock
  for (const item of dto.items) {
    const product = await this.productRepo.findById(item.productId, tenantId);
    if (!product || product.stock < item.quantity) throw new BadRequestException(...);
  }
  // calculate total
  let total = 0;
  for (const item of dto.items) { total += item.price * item.quantity; }
  // apply discount
  if (dto.couponCode) { /* discount logic... */ }
  // save order
  const order = await this.orderRepo.create({ ...dto, total, tenantId });
  // send notification
  await this.notificationService.send(...);
  return order;
}

// ✅ Each step is its own method
async createOrder(dto: CreateOrderDto, tenantId: string) {
  await this.validateOrderStock(dto.items, tenantId);
  const total = await this.calculateOrderTotal(dto.items, dto.couponCode);
  const order = await this.orderRepo.create({ ...dto, total, tenantId });
  await this.notificationService.notifyOrderCreated(order);
  return order;
}
```

### Guard Clauses (Early Return)

```typescript
// ❌ Deep nesting (arrow anti-pattern)
async updateProduct(id: string, dto: UpdateProductDto, tenantId: string) {
  if (id) {
    const product = await this.productRepo.findById(id, tenantId);
    if (product) {
      if (product.isActive) {
        return this.productRepo.update(id, dto, tenantId);
      }
    }
  }
}

// ✅ Guard clauses
async updateProduct(id: string, dto: UpdateProductDto, tenantId: string) {
  if (!id) throw new BadRequestException('Product ID required');

  const product = await this.productRepo.findById(id, tenantId);
  if (!product) throw new NotFoundException(`Product ${id} not found`);
  if (!product.isActive) throw new BadRequestException('Cannot update inactive product');

  return this.productRepo.update(id, dto, tenantId);
}
```

### Max 20 Lines

If a method exceeds 20 lines, it's doing too much. Extract:

- Validation → `private validate*()` method
- Calculation → `private calculate*()` method
- Side effects → separate service or event

---

## NestJS-Specific Clean Code

### DTO Completeness

```typescript
// Every DTO must have:
export class CreateProductDto {
  @ApiProperty({ description: 'Product name', example: 'Cà phê sữa' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Price in VND', example: 45000 })
  @IsNumber()
  @IsPositive()
  @Min(1000)
  price: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
```

### Exception Messages (Informative)

```typescript
// ❌ Unhelpful
throw new NotFoundException('Not found');
throw new BadRequestException('Bad request');

// ✅ Actionable
throw new NotFoundException(`Product with id "${id}" not found in tenant "${tenantId}"`);
throw new ConflictException(`Email "${email}" is already registered`);
throw new BadRequestException(`Order "${orderId}" cannot be cancelled after it has been paid`);
```

### No `any` Type

```typescript
// ❌
async processPayload(data: any): Promise<any> { }
const result: any = await this.service.get();

// ✅
async processPayload(data: CreateOrderDto): Promise<OrderResponseDto> { }
const result: ProductEntity = await this.productRepo.findById(id, tenantId);
```

---

## React Clean Code

### Component Responsibility

```typescript
// ❌ God component
function ProductPage() {
  // fetching, filtering, sorting, formatting, rendering all in one
}

// ✅ Split by responsibility
function ProductPage() {          // layout + data container
  const { data } = useProducts();
  return <ProductList products={data} />;
}
function ProductList({ products }) { // pure rendering
  return products.map(p => <ProductCard key={p.id} product={p} />);
}
function ProductCard({ product }) { // single item
  return <div>...</div>;
}
```

### Extract Business Logic to Hooks

```typescript
// ❌ Logic in component
function CartButton({ productId }) {
  const [cart, setCart] = useState([]);
  const handleAdd = () => {
    const existing = cart.find(i => i.id === productId);
    if (existing) setCart(cart.map(i => i.id === productId ? {...i, qty: i.qty+1} : i));
    else setCart([...cart, { id: productId, qty: 1 }]);
  };
}

// ✅ Logic in hook
function useCart() {
  // all cart logic here
  return { items, addItem, removeItem, total };
}
function CartButton({ productId }) {
  const { addItem } = useCart();
  return <button onClick={() => addItem(productId)}>Add</button>;
}
```

---

## Code Smell Detection

| Smell               | Detection                                        | Fix                           |
| ------------------- | ------------------------------------------------ | ----------------------------- |
| Long method         | > 20 lines                                       | Extract methods               |
| Long parameter list | > 3 params                                       | Use DTO/object                |
| Feature envy        | Service accesses another service's data directly | Move logic to correct service |
| Primitive obsession | `string` for status/role/type                    | Use enum                      |
| Data clumps         | Same 3+ fields repeated                          | Extract to class/interface    |
| Magic literals      | Inline strings/numbers                           | Extract to constant           |
| Dead code           | Commented code, unused imports                   | Delete it                     |
