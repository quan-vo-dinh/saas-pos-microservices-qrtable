---
name: design-patterns
description: Design patterns reference for QRTable NestJS microservices and React frontends. Use when designing new features, refactoring existing code, or when a pattern like Repository, Strategy, Factory, Observer, or Adapter would improve the solution.
---

# Design Patterns — QRTable Implementation Guide

Patterns already in use and patterns to apply when extending the codebase.

---

## Backend Patterns (NestJS)

### Repository Pattern ✅ (Required)

Isolates DB access from business logic. Already partially implemented — must be consistent.

```typescript
// libs/interfaces/src/lib/repositories/product-repository.interface.ts
export interface IProductRepository {
  findAll(tenantId: string, filters?: ProductFilters): Promise<ProductEntity[]>;
  findById(id: string, tenantId: string): Promise<ProductEntity | null>;
  create(data: Partial<ProductEntity>): Promise<ProductEntity>;
  update(id: string, data: Partial<ProductEntity>, tenantId: string): Promise<ProductEntity>;
  softDelete(id: string, tenantId: string): Promise<void>;
}

// apps/product/src/product/product.repository.ts
@Injectable()
export class ProductRepository implements IProductRepository {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly repo: Repository<ProductEntity>,
  ) {}

  async findAll(tenantId: string, filters?: ProductFilters): Promise<ProductEntity[]> {
    const qb = this.repo.createQueryBuilder('product').where('product.tenant_id = :tenantId', { tenantId });

    if (filters?.categoryId) {
      qb.andWhere('product.category_id = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters?.isActive !== undefined) {
      qb.andWhere('product.is_active = :isActive', { isActive: filters.isActive });
    }
    return qb.getMany();
  }
}
```

---

### Strategy Pattern

For behaviors that vary by context (payment methods, notification channels, export formats).

```typescript
// Define interface
export interface IPaymentStrategy {
  process(amount: number, orderId: string, tenantId: string): Promise<PaymentResult>;
  refund(transactionId: string, amount: number): Promise<void>;
}

// Implementations
@Injectable()
export class StripeStrategy implements IPaymentStrategy { ... }

@Injectable()
export class VnPayStrategy implements IPaymentStrategy { ... }

// Service uses strategy, doesn't know concrete type
@Injectable()
export class PaymentService {
  constructor(
    @Inject(PAYMENT_STRATEGY_TOKEN) private strategy: IPaymentStrategy,
  ) {}

  async processPayment(amount: number, orderId: string, tenantId: string) {
    return this.strategy.process(amount, orderId, tenantId);
  }
}

// Module: select strategy based on config
providers: [
  {
    provide: PAYMENT_STRATEGY_TOKEN,
    useFactory: (config: ConfigService) =>
      config.get('PAYMENT_PROVIDER') === 'stripe'
        ? new StripeStrategy()
        : new VnPayStrategy(),
    inject: [ConfigService],
  },
]
```

---

### Factory Pattern

For complex object creation with conditional logic.

```typescript
// Order creation with different types
export class OrderFactory {
  static createDineIn(dto: CreateDineInOrderDto, tenantId: string): Partial<OrderEntity> {
    return {
      type: OrderType.DINE_IN,
      tenant_id: tenantId,
      table_id: dto.tableId,
      status: OrderStatus.PENDING,
      ...this.buildCommonFields(dto),
    };
  }

  static createTakeaway(dto: CreateTakeawayOrderDto, tenantId: string): Partial<OrderEntity> {
    return {
      type: OrderType.TAKEAWAY,
      tenant_id: tenantId,
      pickup_time: dto.pickupTime,
      status: OrderStatus.PENDING,
      ...this.buildCommonFields(dto),
    };
  }

  private static buildCommonFields(dto: BaseOrderDto) {
    return { items: dto.items, note: dto.note, created_at: new Date() };
  }
}

// Usage in service
const order = OrderFactory.createDineIn(dto, tenantId);
await this.orderRepo.create(order);
```

---

### Observer / Event-Driven Pattern

For decoupled side effects (notifications, audit logs, cache invalidation).

```typescript
// Define event
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly tenantId: string,
    public readonly customerId: string,
    public readonly total: number,
  ) {}
}

// Emit in service
@Injectable()
export class OrderService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async createOrder(dto: CreateOrderDto, tenantId: string) {
    const order = await this.orderRepo.create(dto, tenantId);
    this.eventEmitter.emit('order.created', new OrderCreatedEvent(order.id, tenantId, dto.customerId, order.total));
    return order;
  }
}

// Handle in separate classes (decoupled)
@Injectable()
export class OrderNotificationListener {
  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    await this.notificationService.sendOrderConfirmation(event);
  }
}

@Injectable()
export class OrderAuditListener {
  @OnEvent('order.created')
  async logOrderCreated(event: OrderCreatedEvent) {
    await this.auditRepo.log('ORDER_CREATED', event);
  }
}
```

---

### Adapter Pattern

For wrapping external services (Keycloak, payment gateways, SMS providers).

```typescript
// Adapter interface
export interface IAuthAdapter {
  validateToken(token: string): Promise<TokenPayload>;
  getUserInfo(userId: string): Promise<UserInfo>;
  invalidateSession(sessionId: string): Promise<void>;
}

// Keycloak adapter (wraps complexity)
@Injectable()
export class KeycloakAdapter implements IAuthAdapter {
  constructor(private readonly keycloakClient: KeycloakConnectClient) {}

  async validateToken(token: string): Promise<TokenPayload> {
    try {
      const introspect = await this.keycloakClient.introspect(token);
      if (!introspect.active) throw new UnauthorizedException('Token expired');
      return this.mapToTokenPayload(introspect);
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private mapToTokenPayload(raw: KeycloakIntrospectResponse): TokenPayload {
    return { userId: raw.sub, email: raw.email, roles: raw.realm_access.roles };
  }
}
```

---

## Frontend Patterns (React)

### Container / Presenter Pattern

Server component = container (data), Client component = presenter (UI).

```typescript
// Container: Server Component (fetches, no interactivity)
// app/(dashboard)/products/page.tsx
export default async function ProductsPage() {
  const session = await auth();
  const products = await fetchProducts(session.user.tenantId);
  const categories = await fetchCategories(session.user.tenantId);
  return <ProductsContainer products={products} categories={categories} />;
}

// Presenter: Client Component (renders, handles events)
// components/products/ProductsContainer.tsx
"use client"
export function ProductsContainer({ products, categories }: Props) {
  const [filter, setFilter] = useState('');
  const filtered = products.filter(p => p.name.includes(filter));
  return (
    <div>
      <SearchInput value={filter} onChange={setFilter} />
      <ProductGrid products={filtered} categories={categories} />
    </div>
  );
}
```

### Custom Hook Pattern

Extract stateful logic from components.

```typescript
// hooks/useCart.ts
export function useCart(tenantId: string) {
  const queryClient = useQueryClient();

  const { data: cart } = useQuery({
    queryKey: ['cart', tenantId],
    queryFn: () => cartApi.getCart(tenantId),
  });

  const addItem = useMutation({
    mutationFn: (item: CartItem) => cartApi.addItem(tenantId, item),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart', tenantId] }),
    onError: (err) => toast.error('Failed to add item'),
  });

  const total = cart?.items.reduce((sum, item) => sum + item.price * item.qty, 0) ?? 0;

  return { cart, total, addItem: addItem.mutate, isAdding: addItem.isPending };
}

// Component is now simple
function CartButton({ item }: Props) {
  const { addItem, isAdding } = useCart(tenantId);
  return <button onClick={() => addItem(item)} disabled={isAdding}>Add to Cart</button>;
}
```

### Compound Component Pattern

For complex UI components with shared state.

```typescript
// Instead of a massive prop list:
// ❌ <Tabs activeTab={tab} onTabChange={setTab} tabs={[...]} content={[...]} />

// ✅ Compound:
<Tabs defaultValue="menu">
  <TabsList>
    <TabsTrigger value="menu">Menu</TabsTrigger>
    <TabsTrigger value="orders">Orders</TabsTrigger>
  </TabsList>
  <TabsContent value="menu"><MenuPanel /></TabsContent>
  <TabsContent value="orders"><OrdersPanel /></TabsContent>
</Tabs>
```

---

## Anti-Patterns to Avoid

| Anti-Pattern        | What It Looks Like                 | Fix                       |
| ------------------- | ---------------------------------- | ------------------------- |
| God class           | Service with 20+ methods           | Split by domain           |
| Anemic domain model | Entity has only getters/setters    | Add domain methods        |
| Service locator     | `app.get(ServiceClass)` in code    | Use constructor injection |
| Prop drilling       | Props passed 4+ levels             | Zustand store or Context  |
| God component       | 300-line component                 | Split by responsibility   |
| Callback hell       | Nested `.then().then().then()`     | `async/await` + extract   |
| Magic container     | Module that wires unrelated things | One module per domain     |
