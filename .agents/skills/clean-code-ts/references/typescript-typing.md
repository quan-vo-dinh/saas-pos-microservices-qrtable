# TypeScript Typing Reference

## Never Use `any` — Use These Instead

```typescript
// unknown — safe alternative when type is truly unknown
function processWebhook(payload: unknown): OrderEvent {
  if (!isOrderEvent(payload)) throw new BadRequestException('Invalid payload');
  return payload;
}

// Type guards — runtime + compile-time safety
function isOrderEvent(val: unknown): val is OrderEvent {
  return (
    typeof val === 'object' && val !== null &&
    'orderId' in val && typeof (val as any).orderId === 'string'
  );
}

// Generic constraints — flexible but typed
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}

// Readonly — prevents mutation bugs
function processConfig(config: Readonly<AppConfig>): void { ... }
```

## Utility Types — Use These, Don't Re-invent

```typescript
// Partial — all fields optional (useful for updates)
type UpdateUserInput = Partial<Pick<User, 'displayName' | 'bio' | 'avatarUrl'>>;

// Required — enforce non-optional
type CompleteOrder = Required<Order>;

// Pick — select specific fields
type UserSummary = Pick<User, 'id' | 'email' | 'displayName'>;

// Omit — exclude sensitive fields
type PublicUser = Omit<User, 'password' | 'passwordResetToken'>;

// Record — typed map
type StatusMessages = Record<OrderStatus, string>;
const ORDER_STATUS_MESSAGES: StatusMessages = {
  [OrderStatus.PENDING]: 'Order is pending',
  [OrderStatus.COMPLETED]: 'Order completed',
  // ...
};

// ReturnType — derive type from function
type ApiResponse = ReturnType<typeof userApi.getProfile>;

// Awaited — unwrap Promise type
type UserData = Awaited<ReturnType<typeof fetchUser>>;
```

## Discriminated Unions — Safe State Modeling

```typescript
// ❌ Ambiguous state
interface State {
  loading: boolean;
  error?: string;
  data?: User;
}

// ✅ Discriminated union — impossible states are unrepresentable
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Exhaustive switch — compiler catches missing cases
function render(state: AsyncState<User>): string {
  switch (state.status) {
    case 'idle':
      return 'Waiting...';
    case 'loading':
      return 'Loading...';
    case 'success':
      return state.data.displayName;
    case 'error':
      return `Error: ${state.error}`;
    default: {
      const _exhaustive: never = state; // compile error if case missing
      return _exhaustive;
    }
  }
}
```

## Branded Types — Prevent ID Mix-ups

```typescript
// Without branding: easy to pass wrong ID type
function getOrder(userId: string, orderId: string) { ... }
getOrder(orderId, userId); // ❌ silently wrong, compiles fine

// With branded types:
type UserId = string & { readonly _brand: 'UserId' };
type OrderId = string & { readonly _brand: 'OrderId' };

function createUserId(id: string): UserId { return id as UserId; }
function createOrderId(id: string): OrderId { return id as OrderId; }

function getOrder(userId: UserId, orderId: OrderId) { ... }
getOrder(orderId, userId); // ✅ compile error
```

## Strict tsconfig — Non-negotiable Settings

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```
