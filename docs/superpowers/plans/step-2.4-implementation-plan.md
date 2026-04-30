# Kế hoạch triển khai Step 2.4 cho Order Service

> **Dành cho agent tự động:** BẮT BUỘC dùng kỹ năng phụ: `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để triển khai kế hoạch theo từng task. Các bước dùng cú pháp checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** Xây dựng backend Phase 2A Step 2.4: Order Service, Redis cart/session, các lệnh tồn kho do Catalog sở hữu, outbox Kafka `order.confirmed`, và tích hợp REST/WebSocket trực tiếp với BFF.

**Kiến trúc:** Trước hết triển khai ranh giới Database-per-Service ở mức logic: Order Service sở hữu các bảng order/session/bill/request và không truy vấn trực tiếp bảng Catalog; Catalog sở hữu menu/table/stock và cung cấp lệnh TCP. Kafka chỉ dùng cho sự kiện liên ngữ cảnh `order.confirmed`; BFF Direct phát sự kiện UI sau khi nhận TCP response thành công. Việc tách database PostgreSQL vật lý và migration TypeORM được hoãn sang kế hoạch hardening riêng.

**Ngăn xếp công nghệ:** Nx, NestJS, TypeORM, PostgreSQL, cấu hình Redis cache-manager tái sử dụng từ `libs/configuration` kèm Redis command client trực tiếp (`ioredis`) cho cart/lock atomic, Nest TCP microservices, Kafka (`kafkajs`), Nest WebSockets + Socket.IO, Jest.

---

## Các quyết định đã chốt

- Canonical spec: `docs/business-logic-step-2.4-spec.vi.md`.
- Architecture decision note: `docs/superpowers/specs/2026-04-28-step-2.4-architecture-decisions.md`.
- Order ports: HTTP `3301`, TCP `3201`.
- Keep TypeORM `synchronize: true` for this step; write entities with explicit columns/indexes for later migrations.
- Do not implement physical DB split in this plan.
- Do not implement BFF Kafka consumer bridge in this plan.
- Do not commit per task. The repository owner will review and commit at the end.
- Backend module convention for this plan: follow the shared `catalog` /
  `user-access` family pattern
  `apps/<service>/src/app/modules/<bounded-context-or-resource>/{controllers,services,repositories,tests}`.
  Catalog-style per-resource modules remain correct for independent CRUD
  resources; Order uses one bounded-context `OrderModule` because session,
  cart, order, bill, transfer, stock locking, and outbox flows change together.
- Do not copy `apps/saas` as a structure reference for this step; it currently
  mixes legacy top-level folders with module folders.

## Cấu trúc tệp

### Tạo mới

- `apps/order/project.json` — Nx target config for Order Service.
- `apps/order/webpack.config.js` — webpack app build config.
- `apps/order/tsconfig.app.json` — app TypeScript config.
- `apps/order/src/main.ts` — HTTP + TCP bootstrap.
- `apps/order/src/configuration/index.ts` — app config including TypeORM, Redis, TCP, Kafka.
- `apps/order/src/app/app.module.ts` — root module.
- `apps/order/src/app/modules/order/order.module.ts` — Order bounded-context module.
- `apps/order/src/app/modules/order/controllers/order.controller.ts` — TCP message handlers for all Order bounded-context commands.
- `apps/order/src/app/modules/order/services/order.service.ts` — order submit/confirm/cancel/list/detail.
- `apps/order/src/app/modules/order/services/cart.service.ts` — Redis cart/version/locks.
- `apps/order/src/app/modules/order/services/session.service.ts` — durable session + Redis hydration.
- `apps/order/src/app/modules/order/services/bill.service.ts` — bill aggregate and bill request/reopen.
- `apps/order/src/app/modules/order/services/service-request.service.ts` — service request lifecycle.
- `apps/order/src/app/modules/order/services/transfer.service.ts` — table transfer saga.
- `apps/order/src/app/modules/order/services/outbox-publisher.service.ts` — simplified Kafka outbox poller.
- `apps/order/src/app/modules/order/repositories/order.repository.ts` — tenant-scoped order persistence and pessimistic order locks.
- `apps/order/src/app/modules/order/repositories/order-item.repository.ts` — tenant-scoped order item persistence.
- `apps/order/src/app/modules/order/repositories/session.repository.ts` — tenant-scoped durable session persistence.
- `apps/order/src/app/modules/order/repositories/bill.repository.ts` — tenant-scoped bill aggregate persistence.
- `apps/order/src/app/modules/order/repositories/service-request.repository.ts` — tenant-scoped service request persistence.
- `apps/order/src/app/modules/order/repositories/outbox-event.repository.ts` — tenant-scoped Kafka outbox persistence.
- `apps/order/src/app/modules/order/tests/order.service.spec.ts` — submit/confirm/cancel state-flow tests.
- `apps/order/src/app/modules/order/tests/cart.service.spec.ts` — Redis cart/version tests.
- `apps/order/src/app/modules/order/tests/bill.service.spec.ts` — bill request/reopen tests.
- `apps/order/src/app/modules/order/tests/service-request.service.spec.ts` — service request lifecycle tests.
- `apps/order/src/app/modules/order/tests/transfer.service.spec.ts` — table transfer locking tests.
- `libs/entities/src/lib/order.entity.ts`
- `libs/entities/src/lib/order-item.entity.ts`
- `libs/entities/src/lib/bill.entity.ts`
- `libs/entities/src/lib/session.entity.ts`
- `libs/entities/src/lib/service-request.entity.ts`
- `libs/entities/src/lib/outbox-event.entity.ts`
- `libs/configuration/src/lib/kafka.config.ts`
- `libs/providers/redis-client/project.json` — Nx project metadata mirroring provider-lib convention.
- `libs/providers/redis-client/src/index.ts` — public exports.
- `libs/providers/redis-client/src/lib/redis-client.module.ts` — direct Redis command client module.
- `libs/providers/redis-client/src/lib/redis-client.service.ts` — `ioredis` wrapper using existing Redis configuration values.
- `libs/interfaces/src/lib/tcp/order/order-request.interface.ts`
- `libs/interfaces/src/lib/tcp/order/order-response.interface.ts`
- `libs/interfaces/src/lib/tcp/order/index.ts`
- `libs/interfaces/src/lib/gateway/order/order-request.dto.ts`
- `libs/interfaces/src/lib/gateway/order/order-response.dto.ts`
- `libs/interfaces/src/lib/gateway/order/index.ts`
- `apps/bff/src/app/modules/order/order.module.ts`
- `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`
- `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`
- `apps/bff/src/app/modules/realtime/realtime.module.ts`
- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`

### Chỉnh sửa

- `package.json` / `pnpm-lock.yaml` — Kafka/WebSocket/Redis direct dependencies.
- `.env`, `.env.example` — Order ports and Kafka env.
- `nx.json` only if generated app needs explicit target adjustment.
- `tsconfig.base.json` — add `@common/providers/redis-client/*`.
- `libs/constants/src/lib/enum/tcp-request-message.ts` — add `ORDER` TCP patterns.
- `libs/constants/src/lib/enum/catalog.enum.ts` — add preparation station if needed by backend entity.
- `libs/entities/src/lib/menu-item.entity.ts` — add `station`.
- `libs/entities/src/index.ts` if entities lib exports via barrel.
- `libs/interfaces/src/lib/tcp/catalog/menu-item-request.interface.ts` — add station and stock contracts.
- `libs/interfaces/src/lib/tcp/catalog/menu-item-response.interface.ts` — expose station response.
- `libs/interfaces/src/lib/gateway/catalog/menu-item-request.dto.ts` — station admin DTO.
- `libs/interfaces/src/lib/gateway/catalog/menu-item-response.dto.ts` — station response DTO.
- `libs/shared/types/src/lib/session.types.ts` — cart line/snapshot types.
- `libs/shared/types/src/lib/realtime-events.types.ts` — cart + order confirmed payload alignment.
- `libs/shared/types/src/index.ts` — export new cart types.
- `libs/error-messages/src/lib/error-code.enum.ts` — Step 2.4 business errors.
- `libs/error-messages/src/lib/error-messages.en.ts`
- `libs/error-messages/src/lib/error-messages.vi.ts`
- `apps/catalog/src/app/modules/menu-item/controllers/menu-item.controller.ts` — TCP handlers.
- `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts` — validate/deduct/release.
- `apps/catalog/src/app/modules/menu-item/repositories/menu-item.repository.ts` — transaction helpers.
- `apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts` — stock/station tests.
- `apps/bff/src/app/app.module.ts` — import OrderModule and RealtimeModule.
- `apps/bff/src/configuration/index.ts` — add TCP/Kafka config if needed.

---

## Task 1: Cài dependency runtime và biến môi trường

**Tệp liên quan:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.env`
- Modify: `.env.example`
- Modify: `tsconfig.base.json`
- Create: `libs/configuration/src/lib/kafka.config.ts`
- Create: `libs/providers/redis-client/project.json`
- Create: `libs/providers/redis-client/src/index.ts`
- Create: `libs/providers/redis-client/src/lib/redis-client.module.ts`
- Create: `libs/providers/redis-client/src/lib/redis-client.service.ts`
- **Bước 1: Cài dependencies**

Chạy:

```bash
pnpm add kafkajs @nestjs/websockets @nestjs/platform-socket.io socket.io ioredis
```

Kỳ vọng: `package.json` có đủ 5 package và `pnpm-lock.yaml` được cập nhật.

- **Bước 2: Thêm biến môi trường cho Order và Kafka**

Thêm vào `.env` và `.env.example`:

```env
ORDER_PORT=3301
ORDER_SERVICE_HOST=localhost
TCP_ORDER_SERVICE_PORT=3201

KAFKA_BROKERS=localhost:29092
KAFKA_CLIENT_ID=qrtable-order-service
KAFKA_ORDER_CONFIRMED_TOPIC=order.confirmed
```

Kỳ vọng: các biến môi trường của service hiện có không bị thay đổi.

- **Bước 3: Thêm helper cấu hình Kafka**

Create `libs/configuration/src/lib/kafka.config.ts`:

```ts
import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class KafkaConfiguration {
  @IsArray()
  BROKERS: string[];

  @IsString()
  @IsNotEmpty()
  CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  ORDER_CONFIRMED_TOPIC: string;

  constructor(data?: Partial<KafkaConfiguration>) {
    const brokerValue = data?.BROKERS?.join(',') || process.env['KAFKA_BROKERS'] || 'localhost:29092';
    this.BROKERS = brokerValue
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean);
    this.CLIENT_ID = data?.CLIENT_ID || process.env['KAFKA_CLIENT_ID'] || 'qrtable-order-service';
    this.ORDER_CONFIRMED_TOPIC =
      data?.ORDER_CONFIRMED_TOPIC || process.env['KAFKA_ORDER_CONFIRMED_TOPIC'] || 'order.confirmed';
  }
}
```

- **Bước 4: Thêm provider Redis command client trực tiếp**

The repo already has cache-manager Redis wiring in
`libs/configuration/src/lib/redis.config.ts`. Do not replace or duplicate that
config. Add a separate direct client only for Order Service operations that need
Redis commands not exposed cleanly by cache-manager: hash fields, `SET NX PX`,
TTL refresh, and atomic cart version updates.

Create `libs/providers/redis-client/project.json`:

```json
{
  "name": "providers-redis-client",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/providers/redis-client/src",
  "projectType": "library",
  "tags": ["scope:shared", "type:provider"],
  "// targets": "to see all targets run: nx show project providers-redis-client --web",
  "targets": {
    "test": {
      "options": {
        "passWithNoTests": true
      }
    }
  }
}
```

Create `libs/providers/redis-client/src/lib/redis-client.service.ts`:

```ts
import { RedisConfiguration } from '@common/configuration/redis.config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const config = new RedisConfiguration();
    this.client = new Redis({
      host: config.HOST,
      port: config.PORT,
      maxRetriesPerRequest: 3,
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
```

Create `libs/providers/redis-client/src/lib/redis-client.module.ts`:

```ts
import { Global, Module } from '@nestjs/common';
import { RedisClientService } from './redis-client.service';

@Global()
@Module({
  providers: [RedisClientService],
  exports: [RedisClientService],
})
export class RedisClientModule {}
```

Create `libs/providers/redis-client/src/index.ts`:

```ts
export * from './lib/redis-client.module';
export * from './lib/redis-client.service';
```

- **Bước 5: Thêm path alias**

Chỉnh sửa phần `paths` trong `tsconfig.base.json`:

```json
"@common/providers/redis-client/*": ["libs/providers/redis-client/src/lib/*"]
```

- **Bước 6: Kiểm tra cài đặt và đường dẫn TypeScript**

Chạy:

```bash
npx nx build bff --configuration=development
```

Kỳ vọng: PASS. Nếu chỉ lỗi vì provider lib mới thiếu tệp TS config được tạo sẵn,
TS config files, add `libs/providers/redis-client/tsconfig.json`,
`libs/providers/redis-client/tsconfig.lib.json`, and
`libs/providers/redis-client/tsconfig.spec.json` following
`libs/providers/cloudinary`, then rerun.

---

## Task 2: Căn chỉnh Shared Types theo contract Step 2.4

**Tệp liên quan:**

- Modify: `libs/shared/types/src/lib/session.types.ts`
- Modify: `libs/shared/types/src/lib/realtime-events.types.ts`
- Modify: `libs/shared/types/src/index.ts`
- Test: `libs/shared/types/src/lib/__tests__/enum-completeness.spec.ts`
- **Bước 1: Mở rộng kiểu dữ liệu cart**

Modify `libs/shared/types/src/lib/session.types.ts` to add:

```ts
export type CartLine = {
  cartLineId: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  station?: import('./menu.types').PreparationStation;
  lineVersion: number;
};

export type CartSnapshot = {
  tenantId: string;
  sessionId: string;
  cartVersion: number;
  status: 'ACTIVE' | 'LOCKED';
  updatedAt: string;
  items: CartLine[];
};
```

Keep the existing `CartItem` export during transition so Step 2.2 mock UI does not break.

- **Bước 2: Chỉnh payload realtime**

Modify `libs/shared/types/src/lib/realtime-events.types.ts`:

```ts
import type { CartLine } from './session.types';

export type CartUpdatedEvent = {
  tenantId: string;
  sessionId: string;
  cartVersion: number;
  status: 'ACTIVE' | 'LOCKED';
  items: CartLine[];
  updatedAt: string;
  changedBySessionClientId?: string;
};

export type OrderConfirmedEvent = {
  eventId: string;
  eventType: 'order.confirmed';
  schemaVersion: 1;
  tenantId: string;
  orderId: string;
  sessionId: string;
  tableId: string;
  tableName: string;
  items: OrderConfirmedEventItem[];
  totalAmount: number;
  confirmedAt: string;
  confirmedByUserId: string;
  occurredAt: string;
  correlationId?: string;
};
```

- **Bước 3: Export kiểu dữ liệu cart mới**

Modify `libs/shared/types/src/index.ts`:

```ts
export type { Session, CartItem, CartLine, CartSnapshot } from './lib/session.types';
```

- **Bước 4: Thêm regression test cho shared types**

Append to `libs/shared/types/src/lib/__tests__/enum-completeness.spec.ts`:

```ts
import type { CartUpdatedEvent, OrderConfirmedEvent } from '../realtime-events.types';

describe('Step 2.4 realtime contract compile checks', () => {
  it('accepts cart.updated payload with cart line ids', () => {
    const event: CartUpdatedEvent = {
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      cartVersion: 2,
      status: 'ACTIVE',
      updatedAt: '2026-04-28T00:00:00.000Z',
      items: [
        {
          cartLineId: 'line-1',
          menuItemId: 'item-1',
          menuItemName: 'Pho bo',
          quantity: 1,
          unitPrice: 65000,
          lineVersion: 1,
        },
      ],
    };

    expect(event.items[0].cartLineId).toBe('line-1');
  });

  it('accepts canonical order.confirmed event metadata', () => {
    const event: OrderConfirmedEvent = {
      eventId: 'event-1',
      eventType: 'order.confirmed',
      schemaVersion: 1,
      tenantId: 'tenant-1',
      orderId: 'order-1',
      sessionId: 'sess-1',
      tableId: 'table-1',
      tableName: 'Ban 01',
      items: [],
      totalAmount: 0,
      confirmedAt: '2026-04-28T00:00:00.000Z',
      confirmedByUserId: 'user-1',
      occurredAt: '2026-04-28T00:00:00.000Z',
      correlationId: 'process-1',
    };

    expect(event.eventType).toBe('order.confirmed');
  });
});
```

- **Bước 5: Kiểm tra shared types**

Chạy:

```bash
npx nx test shared-types
```

Kỳ vọng: PASS.

---

## Task 3: Thêm trường station cho Catalog và nối Admin DTO

**Tệp liên quan:**

- Modify: `libs/constants/src/lib/enum/catalog.enum.ts`
- Modify: `libs/entities/src/lib/menu-item.entity.ts`
- Modify: `libs/interfaces/src/lib/tcp/catalog/menu-item-request.interface.ts`
- Modify: `libs/interfaces/src/lib/gateway/catalog/menu-item-request.dto.ts`
- Modify: `libs/interfaces/src/lib/gateway/catalog/menu-item-response.dto.ts`
- Modify: `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`
- Test: `apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts`
- **Bước 1: Thêm enum station**

Modify `libs/constants/src/lib/enum/catalog.enum.ts`:

```ts
export enum PREPARATION_STATION {
  KITCHEN = 'KITCHEN',
  BAR = 'BAR',
}
```

- **Bước 2: Thêm cột station**

Modify `libs/entities/src/lib/menu-item.entity.ts`:

```ts
import { MENU_ITEM_STATUS, PREPARATION_STATION } from '@common/constants/enum/catalog.enum';

@Column({ type: 'varchar', length: 20, default: PREPARATION_STATION.KITCHEN })
station: PREPARATION_STATION;
```

Place the column after `status`. Keep default `KITCHEN` so current seed data remains orderable during dev sync.

- **Bước 3: Thêm station vào TCP request interfaces**

Modify `libs/interfaces/src/lib/tcp/catalog/menu-item-request.interface.ts`:

```ts
import { MENU_ITEM_STATUS, PREPARATION_STATION } from '@common/constants/enum/catalog.enum';

export type CreateMenuItemTcpRequest = {
  tenantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  sortOrder?: number;
  station?: PREPARATION_STATION;
};

export type UpdateMenuItemTcpRequest = {
  id: string;
  tenantId: string;
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  sortOrder?: number;
  status?: MENU_ITEM_STATUS;
  station?: PREPARATION_STATION;
};
```

- **Bước 4: Thêm station vào gateway DTO**

Modify `libs/interfaces/src/lib/gateway/catalog/menu-item-request.dto.ts`:

```ts
import { PREPARATION_STATION } from '@common/constants/enum/catalog.enum';
import { IsEnum, IsOptional } from 'class-validator';

@IsOptional()
@IsEnum(PREPARATION_STATION)
station?: PREPARATION_STATION;
```

Add the same optional property to both create and update DTO classes.

Modify `libs/interfaces/src/lib/gateway/catalog/menu-item-response.dto.ts`:

```ts
import { PREPARATION_STATION } from '@common/constants/enum/catalog.enum';

station: PREPARATION_STATION;
```

- **Bước 5: Lưu station trong Catalog service**

Modify `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`:

```ts
station: data.station ?? PREPARATION_STATION.KITCHEN,
```

Add to update payload:

```ts
if (data.station !== undefined) updatePayload.station = data.station;
```

- **Bước 6: Cập nhật test cho Catalog service**

Modify `mockMenuItem` in `apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts`:

```ts
station: 'KITCHEN' as const,
```

Add test:

```ts
it('should persist station when creating a menu item', async () => {
  categoryRepo.findOne.mockResolvedValue(mockCategory);
  repository.create.mockResolvedValue({ ...mockMenuItem, station: 'BAR' } as MenuItem);

  await service.create({
    tenantId: 'tenant-1',
    categoryId: 'cat-1',
    name: 'Iced Tea',
    price: 25000,
    station: 'BAR' as any,
  });

  expect(repository.create).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: 'tenant-1',
      station: 'BAR',
    }),
  );
});
```

- **Bước 7: Kiểm tra station của Catalog**

Chạy:

```bash
npx nx test catalog --testPathPattern=menu-item.service.spec.ts
```

Kỳ vọng: PASS.

---

## Task 4: Triển khai contract TCP cho khả năng đặt món và tồn kho của Catalog

**Tệp liên quan:**

- Modify: `libs/interfaces/src/lib/tcp/catalog/menu-item-request.interface.ts`
- Modify: `apps/catalog/src/app/modules/menu-item/controllers/menu-item.controller.ts`
- Modify: `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`
- Modify: `apps/catalog/src/app/modules/menu-item/repositories/menu-item.repository.ts`
- Test: `apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts`
- **Bước 1: Thêm kiểu request/response TCP**

Append to `libs/interfaces/src/lib/tcp/catalog/menu-item-request.interface.ts`:

```ts
export type ValidateOrderableItemInput = {
  menuItemId: string;
  quantity: number;
};

export type ValidateOrderableTcpRequest = {
  tenantId: string;
  items: ValidateOrderableItemInput[];
};

export type StockDeductForOrderTcpRequest = {
  tenantId: string;
  orderId: string;
  idempotencyKey: string;
  items: ValidateOrderableItemInput[];
};

export type StockReleaseForOrderTcpRequest = {
  tenantId: string;
  orderId: string;
  idempotencyKey: string;
  items: ValidateOrderableItemInput[];
};

export type OrderableMenuItemSnapshot = {
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  status: MENU_ITEM_STATUS;
  stock: number;
  station: PREPARATION_STATION;
};

export type StockMutationResult = {
  menuItemId: string;
  menuItemName: string;
  requestedQuantity: number;
  remainingStock: number;
  status: MENU_ITEM_STATUS;
};
```

- **Bước 2: Thêm helper lock ở repository**

Modify `apps/catalog/src/app/modules/menu-item/repositories/menu-item.repository.ts` to expose:

```ts
async findByIdsForUpdate(tenantId: string, ids: string[], manager: EntityManager): Promise<MenuItem[]> {
  return manager
    .getRepository(MenuItem)
    .createQueryBuilder('menuItem')
    .setLock('pessimistic_write')
    .where('menuItem.tenantId = :tenantId', { tenantId })
    .andWhere('menuItem.id IN (:...ids)', { ids })
    .orderBy('menuItem.id', 'ASC')
    .getMany();
}
```

Import `EntityManager`.

- **Bước 3: Thêm phương thức service**

Add methods to `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`:

```ts
async validateOrderable(data: ValidateOrderableTcpRequest): Promise<OrderableMenuItemSnapshot[]> {
  const ids = data.items.map((item) => item.menuItemId);
  const items = await this.menuItemRepository.findManyByIdsAndTenant(data.tenantId, ids);
  const byId = new Map(items.map((item) => [item.id, item]));

  return data.items.map((input) => {
    const item = byId.get(input.menuItemId);
    if (!item || item.status !== MENU_ITEM_STATUS.AVAILABLE) {
      throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_ORDERABLE, HttpStatus.CONFLICT, {
        menuItemId: input.menuItemId,
      });
    }

    return {
      menuItemId: item.id,
      menuItemName: item.name,
      unitPrice: Number(item.price),
      status: item.status,
      stock: item.stock,
      station: item.station,
    };
  });
}
```

Add `deductForOrder` and `releaseForOrder` using `this.dataSource.transaction(...)`, `findByIdsForUpdate`, sorted item IDs, tenant filtering, and `manager.save(item)`. Deduct must throw `CATALOG_STOCK_INSUFFICIENT` when any requested quantity exceeds stock. Release must increase stock and set status back to `AVAILABLE` when stock becomes positive.

- **Bước 4: Thêm TCP handlers**

Modify `apps/catalog/src/app/modules/menu-item/controllers/menu-item.controller.ts`:

```ts
@MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.VALIDATE_ORDERABLE)
async validateOrderable(@RequestParams() body: ValidateOrderableTcpRequest): Promise<Response<OrderableMenuItemSnapshot[]>> {
  const result = await this.menuItemService.validateOrderable(body);
  return Response.success<OrderableMenuItemSnapshot[]>(result);
}

@MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_DEDUCT_FOR_ORDER)
async deductForOrder(@RequestParams() body: StockDeductForOrderTcpRequest): Promise<Response<StockMutationResult[]>> {
  const result = await this.menuItemService.deductForOrder(body);
  return Response.success<StockMutationResult[]>(result);
}

@MessagePattern(TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_RELEASE_FOR_ORDER)
async releaseForOrder(@RequestParams() body: StockReleaseForOrderTcpRequest): Promise<Response<StockMutationResult[]>> {
  const result = await this.menuItemService.releaseForOrder(body);
  return Response.success<StockMutationResult[]>(result);
}
```

- **Bước 5: Thêm mã lỗi**

Modify `libs/error-messages/src/lib/error-code.enum.ts`:

```ts
CATALOG_MENU_ITEM_NOT_ORDERABLE = 'CATALOG_MENU_ITEM_NOT_ORDERABLE',
CATALOG_STOCK_INSUFFICIENT = 'CATALOG_STOCK_INSUFFICIENT',
CATALOG_STOCK_LOCK_TIMEOUT = 'CATALOG_STOCK_LOCK_TIMEOUT',
```

Add English/Vietnamese messages in `error-messages.en.ts` and `error-messages.vi.ts`.

- **Bước 6: Thêm test tồn kho**

Add tests to `menu-item.service.spec.ts`:

```ts
describe('validateOrderable', () => {
  it('returns snapshots with station', async () => {
    repository.findManyByIdsAndTenant.mockResolvedValue([mockMenuItem]);

    const result = await service.validateOrderable({
      tenantId: 'tenant-1',
      items: [{ menuItemId: 'item-1', quantity: 2 }],
    });

    expect(result[0]).toEqual(
      expect.objectContaining({
        menuItemId: 'item-1',
        menuItemName: 'Spring Rolls',
        station: 'KITCHEN',
      }),
    );
  });
});
```

Add transaction tests with a mocked `DataSource` in a separate describe block for `deductForOrder` and `releaseForOrder`.

- **Bước 7: Kiểm tra contract tồn kho của Catalog**

Chạy:

```bash
npx nx test catalog --testPathPattern=menu-item.service.spec.ts
npx nx build catalog --configuration=development
```

Kỳ vọng: PASS.

---

## Task 5: Thêm hằng số TCP và interface cho Order

**Tệp liên quan:**

- Modify: `libs/constants/src/lib/enum/tcp-request-message.ts`
- Create: `libs/interfaces/src/lib/tcp/order/order-request.interface.ts`
- Create: `libs/interfaces/src/lib/tcp/order/order-response.interface.ts`
- Create: `libs/interfaces/src/lib/tcp/order/index.ts`
- Modify: `libs/interfaces/src/lib/tcp/index.ts` if a barrel exists.
- **Bước 1: Thêm enum TCP cho ORDER**

Modify `libs/constants/src/lib/enum/tcp-request-message.ts`:

```ts
enum ORDER {
  SESSION_JOIN = 'order.session_join',
  CART_GET = 'order.cart_get',
  CART_MUTATE = 'order.cart_mutate',
  CART_CLEAR = 'order.cart_clear',
  SUBMIT = 'order.submit',
  GET_LIST = 'order.get_list',
  GET_BY_ID = 'order.get_by_id',
  CONFIRM = 'order.confirm',
  CANCEL_PENDING = 'order.cancel_pending',
  CANCEL_PROCESSING = 'order.cancel_processing',
  CUSTOMER_CANCEL_PENDING = 'order.customer_cancel_pending',
  SERVICE_REQUEST_CREATE = 'order.service_request_create',
  SERVICE_REQUEST_ACKNOWLEDGE = 'order.service_request_acknowledge',
  SERVICE_REQUEST_RESOLVE = 'order.service_request_resolve',
  BILL_GET_CURRENT = 'order.bill_get_current',
  BILL_REQUEST = 'order.bill_request',
  BILL_REOPEN = 'order.bill_reopen',
  TABLE_TRANSFER = 'order.table_transfer',
}
```

Add `ORDER` to `TCP_REQUEST_MESSAGE`.

- **Bước 2: Thêm request interface**

Create `libs/interfaces/src/lib/tcp/order/order-request.interface.ts` with tenant/session/user-scoped command types:

```ts
import type { ServiceRequestType } from '@einvoice/types';

export type JoinSessionTcpRequest = {
  tenantId: string;
  tableId: string;
  qrToken: string;
};

export type CartMutationOperation = 'ADD_ITEM' | 'SET_QUANTITY' | 'UPDATE_NOTE' | 'REMOVE_LINE' | 'CLEAR';

export type CartMutateTcpRequest = {
  tenantId: string;
  sessionId: string;
  expectedCartVersion: number;
  operation: CartMutationOperation;
  menuItemId?: string;
  cartLineId?: string;
  quantity?: number;
  note?: string;
  sessionClientId?: string;
};

export type SubmitOrderTcpRequest = {
  tenantId: string;
  sessionId: string;
  expectedCartVersion: number;
  idempotencyKey: string;
  notes?: string;
};

export type OrderIdTcpRequest = {
  tenantId: string;
  orderId: string;
};

export type StaffOrderActionTcpRequest = OrderIdTcpRequest & {
  userId: string;
  reason?: string;
  processId?: string;
};

export type ListOrdersTcpRequest = {
  tenantId: string;
  status?: string;
  tableId?: string;
  limit?: number;
  offset?: number;
};

export type CreateServiceRequestTcpRequest = {
  tenantId: string;
  sessionId: string;
  type: ServiceRequestType;
  note?: string;
};

export type ServiceRequestActionTcpRequest = {
  tenantId: string;
  requestId: string;
  userId: string;
};

export type BillSessionTcpRequest = {
  tenantId: string;
  sessionId: string;
  userId?: string;
};

export type TransferTableTcpRequest = {
  tenantId: string;
  sessionId: string;
  fromTableId: string;
  toTableId: string;
  userId: string;
  requestId: string;
};
```

- **Bước 3: Thêm response interface**

Create `libs/interfaces/src/lib/tcp/order/order-response.interface.ts`:

```ts
import type {
  Bill,
  CartSnapshot,
  Order,
  ServiceRequest,
  Session,
  OrderCreatedEvent,
  OrderStatusChangedEvent,
  CartUpdatedEvent,
  ServiceRequestedEvent,
  BillRequestedEvent,
  TableTransferredEvent,
} from '@einvoice/types';

export type OrderTcpResponse = Order;
export type SessionTcpResponse = Session;
export type CartTcpResponse = CartSnapshot;
export type BillTcpResponse = Bill;
export type ServiceRequestTcpResponse = ServiceRequest;

export type SubmitOrderTcpResponse = {
  order: Order;
  bill: Bill;
  cart: CartSnapshot;
  events: {
    cartUpdated: CartUpdatedEvent;
    orderCreated: OrderCreatedEvent;
  };
};

export type OrderActionTcpResponse = {
  order: Order;
  bill?: Bill;
  events: {
    orderStatusChanged: OrderStatusChangedEvent;
  };
};

export type ServiceRequestCreatedTcpResponse = {
  request: ServiceRequest;
  events: {
    serviceRequested: ServiceRequestedEvent;
  };
};

export type BillRequestedTcpResponse = {
  bill: Bill;
  request: ServiceRequest;
  cart: CartSnapshot;
  events: {
    billRequested: BillRequestedEvent;
    serviceRequested: ServiceRequestedEvent;
    cartUpdated: CartUpdatedEvent;
  };
};

export type TableTransferredTcpResponse = {
  session: Session;
  events: {
    tableTransferred: TableTransferredEvent;
  };
};
```

- **Bước 4: Thêm barrel export**

Create `libs/interfaces/src/lib/tcp/order/index.ts`:

```ts
export * from './order-request.interface';
export * from './order-response.interface';
```

- **Bước 5: Kiểm tra biên dịch interface**

Chạy:

```bash
npx nx build interfaces
```

Kỳ vọng: PASS.

---

## Task 6: Khởi tạo khung ứng dụng Order Service

**Tệp liên quan:**

- Create: `apps/order/project.json`
- Create: `apps/order/webpack.config.js`
- Create: `apps/order/tsconfig.app.json`
- Create: `apps/order/src/main.ts`
- Create: `apps/order/src/configuration/index.ts`
- Create: `apps/order/src/app/app.module.ts`
- Modify: `libs/configuration/src/lib/tcp.config.ts`
- Modify: `package.json`
- **Bước 1: Sinh hoặc dựng thủ công khung ứng dụng**

Preferred command:

```bash
npx nx g @nx/nest:app order --directory=apps/order --tags=type:app,scope:order
```

If the generator changes unrelated files excessively, revert only generated noise after review and manually mirror `apps/catalog` structure.

- **Bước 2: Thêm cấu hình TCP service cho Order**

Modify `libs/configuration/src/lib/tcp.config.ts`:

```ts
export enum TCP_SERVICES {
  PRODUCT_SERVICE = 'TCP_PRODUCT_SERVICE',
  USER_ACCESS_SERVICE = 'TCP_USER_ACCESS_SERVICE',
  AUTHORIZER_SERVICE = 'TCP_AUTHORIZER_SERVICE',
  CATALOG_SERVICE = 'TCP_CATALOG_SERVICE',
  SAAS_SERVICE = 'TCP_SAAS_SERVICE',
  ORDER_SERVICE = 'TCP_ORDER_SERVICE',
}
```

The existing constructor should derive `ORDER_SERVICE_HOST` and `TCP_ORDER_SERVICE_PORT`.

- **Bước 3: Thêm cấu hình Order**

Create `apps/order/src/configuration/index.ts`:

```ts
import { AppConfiguration } from '@common/configuration/app.config';
import { BaseConfiguration } from '@common/configuration/base.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { RedisConfiguration } from '@common/configuration/redis.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { TypeOrmConfiguration } from '@common/configuration/type-orm.config';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

class OrderTypeOrmConfiguration extends TypeOrmConfiguration {
  constructor() {
    super({
      DATABASE: process.env['ORDER_TYPEORM_DATABASE'] || process.env['TYPEORM_DATABASE'] || 'qrtable',
    });
  }
}

class Configuration extends BaseConfiguration {
  @ValidateNested()
  @Type(() => AppConfiguration)
  APP_CONFIG = new AppConfiguration({ PORT: Number(process.env['ORDER_PORT'] || 3301) });

  @ValidateNested()
  @Type(() => TcpConfiguration)
  TCP_SERV = new TcpConfiguration();

  @ValidateNested()
  @Type(() => TypeOrmConfiguration)
  TYPEORM_CONFIG = new OrderTypeOrmConfiguration();

  @ValidateNested()
  @Type(() => RedisConfiguration)
  REDIS_CONFIG = new RedisConfiguration();

  @ValidateNested()
  @Type(() => KafkaConfiguration)
  KAFKA_CONFIG = new KafkaConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
```

- **Bước 4: Thêm bootstrap `main`**

Create `apps/order/src/main.ts` mirroring Catalog TCP bootstrap:

```ts
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: AppModule.CONFIGURATION.TCP_SERV.TCP_ORDER_SERVICE.options.host,
      port: AppModule.CONFIGURATION.TCP_SERV.TCP_ORDER_SERVICE.options.port,
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix(AppModule.CONFIGURATION.GLOBAL_PREFIX || 'api/v1');

  await app.startAllMicroservices();
  await app.listen(AppModule.CONFIGURATION.APP_CONFIG.PORT);
  Logger.log(`Order Service running on http://localhost:${AppModule.CONFIGURATION.APP_CONFIG.PORT}`);
}

bootstrap();
```

- **Bước 5: Thêm script trong package**

Modify `package.json` scripts:

```json
"dev:bff-order": "pnpm dev --projects=bff,order,catalog"
```

- **Bước 6: Kiểm tra scaffold**

Chạy:

```bash
npx nx build order --configuration=development
```

Kỳ vọng: PASS.

---

## Task 7: Thêm entity cho miền nghiệp vụ Order

**Tệp liên quan:**

- Create: `libs/entities/src/lib/session.entity.ts`
- Create: `libs/entities/src/lib/order.entity.ts`
- Create: `libs/entities/src/lib/order-item.entity.ts`
- Create: `libs/entities/src/lib/bill.entity.ts`
- Create: `libs/entities/src/lib/service-request.entity.ts`
- Create: `libs/entities/src/lib/outbox-event.entity.ts`
- **Bước 1: Thêm session entity**

Create `libs/entities/src/lib/session.entity.ts`:

```ts
import { BaseEntity } from './base.entity';
import { Column, Entity, Index } from 'typeorm';
import { SessionStatus } from '@einvoice/types';

@Entity({ name: 'sessions' })
@Index(['tenantId', 'tableId', 'status'])
export class Session extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @Column({ name: 'table_name', type: 'varchar', length: 255 })
  tableName: string;

  @Column({ type: 'varchar', length: 20 })
  status: SessionStatus;

  @Column({ name: 'started_at', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'last_activity', type: 'timestamp' })
  lastActivity: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount: number;

  @Column({ name: 'current_bill_id', type: 'uuid', nullable: true })
  currentBillId: string | null;

  @Column({ type: 'int', default: 1 })
  version: number;
}
```

- **Bước 2: Thêm order entity và order item entity**

Create `order.entity.ts` with columns: `tenant_id`, `table_id`, `table_name`, `session_id`, `status`, `total_amount`, `idempotency_key`, `notes`, `confirmed_at`, `confirmed_by_user_id`, `cancelled_at`, `cancelled_by_user_id`, `cancel_reason`. Add unique index on `tenantId`, `sessionId`, `idempotencyKey`.

Create `order-item.entity.ts` with columns: `tenant_id`, `order_id`, `menu_item_id`, `menu_item_name`, `quantity`, `unit_price`, `note`, `status`, `station`.

- **Bước 3: Thêm bill entity**

Create `bill.entity.ts` with columns: `tenant_id`, `session_id`, `order_ids` as `simple-array`, `subtotal`, `total`, `rounding_amount`, `payment_method`, `status`, `closed_at`, `paid_at`. Add unique index on active bill by `tenantId/sessionId/status` as far as TypeORM/Postgres can support in current convention; enforce active-bill uniqueness in service as well.

- **Bước 4: Thêm service request entity**

Create `service-request.entity.ts` with columns: `tenant_id`, `table_id`, `table_name`, `session_id`, `type`, `status`, `note`, `acknowledged_at`, `acknowledged_by_user_id`, `resolved_at`.

- **Bước 5: Thêm outbox entity**

Create `outbox-event.entity.ts`:

```ts
import { BaseEntity } from './base.entity';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: 'outbox_events' })
@Index(['status', 'createdAt'])
export class OutboxEvent extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ type: 'varchar', length: 120 })
  topic: string;

  @Column({ name: 'event_type', type: 'varchar', length: 120 })
  eventType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'partition_key', type: 'varchar', length: 128 })
  partitionKey: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;
}
```

- **Bước 6: Kiểm tra biên dịch entities**

Chạy:

```bash
npx nx build entities
npx nx build order --configuration=development
```

Kỳ vọng: PASS.

---

## Task 8: Triển khai repository và nối module cho Order Service

**Tệp liên quan:**

- Create: `apps/order/src/app/modules/order/order.module.ts`
- Create: `apps/order/src/app/modules/order/repositories/order.repository.ts`
- Create: `apps/order/src/app/modules/order/repositories/order-item.repository.ts`
- Create: `apps/order/src/app/modules/order/repositories/session.repository.ts`
- Create: `apps/order/src/app/modules/order/repositories/bill.repository.ts`
- Create: `apps/order/src/app/modules/order/repositories/service-request.repository.ts`
- Create: `apps/order/src/app/modules/order/repositories/outbox-event.repository.ts`
- Modify: `apps/order/src/app/app.module.ts`
- **Bước 1: Thêm provider cho repository**

Each repository wraps a TypeORM repository and exposes tenant-scoped methods only.
Entity class names should follow the existing shared entity convention
(`MenuItem`, `Category`, `Table`): use `Order`, `OrderItem`, `Session`, `Bill`,
`ServiceRequest`, and `OutboxEvent`, not `OrderEntity` / `SessionEntity`
suffixes. Example for order repository:

```ts
@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  findByIdAndTenant(id: string, tenantId: string): Promise<Order | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  findByIdAndTenantForUpdate(id: string, tenantId: string, manager: EntityManager): Promise<Order | null> {
    return manager
      .getRepository(Order)
      .createQueryBuilder('order')
      .setLock('pessimistic_write')
      .where('order.id = :id', { id })
      .andWhere('order.tenantId = :tenantId', { tenantId })
      .getOne();
  }
}
```

- **Bước 2: Nối Order module**

Create `order.module.ts`:

```ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Order, OrderItem, Bill, ServiceRequest, OutboxEvent]),
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.CATALOG_SERVICE)]),
    RedisClientModule,
  ],
  controllers: [OrderController],
  providers: [
    OrderService,
    SessionService,
    CartService,
    BillService,
    ServiceRequestService,
    TransferService,
    OutboxPublisherService,
    OrderRepository,
    OrderItemRepository,
    SessionRepository,
    BillRepository,
    ServiceRequestRepository,
    OutboxEventRepository,
  ],
})
export class OrderModule {}
```

- **Bước 3: Nối app module**

Modify `apps/order/src/app/app.module.ts`:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => CONFIGURATION] }),
    TypeOrmProvider,
    RedisClientModule,
    OrderModule,
  ],
})
export class AppModule {
  static CONFIGURATION: TConfiguration = CONFIGURATION;
}
```

- **Bước 4: Kiểm tra wiring module**

Chạy:

```bash
npx nx build order --configuration=development
```

Kỳ vọng: PASS.

---

## Task 9: Triển khai service Session và Cart trên Redis

**Tệp liên quan:**

- Create: `apps/order/src/app/modules/order/services/session.service.ts`
- Create: `apps/order/src/app/modules/order/services/cart.service.ts`
- Test: `apps/order/src/app/modules/order/tests/cart.service.spec.ts`
- **Bước 1: Viết test xung đột cart**

Create `cart.service.spec.ts` with a mocked Redis client:

```ts
it('rejects cart mutation when expectedCartVersion does not match', async () => {
  redis.hgetall.mockResolvedValue({
    tenantId: 'tenant-1',
    sessionId: 'sess-1',
    cartVersion: '3',
    status: 'ACTIVE',
    updatedAt: '2026-04-28T00:00:00.000Z',
    items: JSON.stringify([]),
  });

  await expect(
    service.mutate({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      expectedCartVersion: 2,
      operation: 'CLEAR',
    }),
  ).rejects.toMatchObject({ errorCode: ErrorCode.CART_VERSION_CONFLICT });
});
```

- **Bước 2: Triển khai key helper**

In `cart.service.ts`:

```ts
private cartKey(tenantId: string, sessionId: string): string {
  return `cart:${tenantId}:${sessionId}`;
}

private sessionKey(tenantId: string, sessionId: string): string {
  return `session:${tenantId}:${sessionId}`;
}
```

- **Bước 3: Triển khai lưu trữ cart snapshot**

Use Redis Hash fields:

```txt
tenantId
sessionId
cartVersion
status
updatedAt
items
```

`items` is JSON string of `CartLine[]`. Every successful mutation increments global `cartVersion` by 1 and refreshes TTL to `SESSION_POLICY.TTL_MS`.

- **Bước 4: Triển khai ngữ nghĩa mutation**

`CartService.mutate` must:

1. Load snapshot.
2. Reject `LOCKED` cart for mutations other than read.
3. Compare `expectedCartVersion`.
4. For `ADD_ITEM`, call Catalog `VALIDATE_ORDERABLE` and create a new `cartLineId`.
5. For `SET_QUANTITY`, reject negative quantity and remove line when quantity is `0`.
6. For `UPDATE_NOTE`, trim note and limit to 255 chars.
7. For `REMOVE_LINE`, remove by `cartLineId`.
8. For `CLEAR`, empty items.
9. Save snapshot atomically via Redis transaction.
10. Return `CartUpdatedEvent`.

- **Bước 5: Triển khai session hydration**

`SessionService` must:

1. Load active session from Redis.
2. If Redis misses, load PostgreSQL session by `tenantId/sessionId/status=ACTIVE`.
3. Rehydrate Redis key `session:{tenantId}:{sessionId}`.
4. Enforce idle close only when `orderCount === 0`.
5. Preserve active sessions with orders even when idle timeout passed.

- **Bước 6: Kiểm tra service cart/session**

Chạy:

```bash
npx nx test order --testPathPattern=cart.service.spec.ts
```

Kỳ vọng: PASS.

---

## Task 10: Triển khai gửi đơn hàng và tạo hóa đơn

**Tệp liên quan:**

- Create/Modify: `apps/order/src/app/modules/order/services/order.service.ts`
- Create/Modify: `apps/order/src/app/modules/order/services/bill.service.ts`
- Create: `apps/order/src/app/modules/order/controllers/order.controller.ts`
- Test: `apps/order/src/app/modules/order/tests/order.service.spec.ts`
- **Bước 1: Viết test idempotency cho submit**

Create or extend `order.service.spec.ts`:

```ts
it('returns existing order for duplicate idempotency key', async () => {
  orderRepository.findByIdempotencyKey.mockResolvedValue(existingOrder);

  const result = await service.submitOrder({
    tenantId: 'tenant-1',
    sessionId: 'sess-1',
    expectedCartVersion: 1,
    idempotencyKey: 'idem-1',
  });

  expect(result.order.id).toBe(existingOrder.id);
  expect(orderRepository.createWithItems).not.toHaveBeenCalled();
});
```

- **Bước 2: Triển khai điều kiện tiên quyết khi submit**

`OrderService.submitOrder` must reject:

- inactive session,
- empty cart,
- cart version conflict,
- bill/table billing lock,
- missing idempotency key,
- item unavailable / price changed from Catalog validation.

Use error codes:

```ts
CART_VERSION_CONFLICT;
ORDER_CART_EMPTY;
ORDER_ITEM_UNAVAILABLE;
ORDER_PRICE_CHANGED;
ORDER_IDEMPOTENCY_CONFLICT;
SESSION_CLOSED;
BILL_ORDERING_LOCKED;
```

- **Bước 3: Triển khai transaction**

Inside one Order DB transaction:

1. Create bill `OPEN` if `session.currentBillId` is null.
2. Create order `PENDING`.
3. Create order items from cart snapshot with denormalized `menuItemName`, `unitPrice`, `station`, `note`.
4. Append order ID to bill.
5. Recalculate bill subtotal/total with `roundingAmount = 0`.
6. Increment session `orderCount`.
7. Update session `currentBillId`.

- **Bước 4: Xóa cart và tạo sự kiện trực tiếp**

After DB commit:

1. Clear Redis cart.
2. Increment cart version.
3. Return `cart.updated` and `order.created` event payloads.

- **Bước 5: Thêm TCP handler**

In `order.controller.ts`:

```ts
@MessagePattern(TCP_REQUEST_MESSAGE.ORDER.SUBMIT)
async submit(@RequestParams() body: SubmitOrderTcpRequest): Promise<Response<SubmitOrderTcpResponse>> {
  const result = await this.orderService.submitOrder(body);
  return Response.success<SubmitOrderTcpResponse>(result);
}
```

- **Bước 6: Kiểm tra submit**

Chạy:

```bash
npx nx test order --testPathPattern=order.service.spec.ts
npx nx build order --configuration=development
```

Kỳ vọng: PASS.

---

## Task 11: Triển khai xác nhận, trừ tồn kho và publish outbox

**Tệp liên quan:**

- Modify: `apps/order/src/app/modules/order/services/order.service.ts`
- Create/Modify: `apps/order/src/app/modules/order/services/outbox-publisher.service.ts`
- Test: `apps/order/src/app/modules/order/tests/order.service.spec.ts`
- **Bước 1: Viết test confirm khi thiếu tồn kho**

```ts
it('keeps order pending when Catalog deduct reports insufficient stock', async () => {
  catalogClient.send.mockReturnValue(throwError(() => insufficientStockError));

  await expect(
    service.confirmOrder({
      tenantId: 'tenant-1',
      orderId: 'order-1',
      userId: 'staff-1',
      processId: 'process-1',
    }),
  ).rejects.toMatchObject({ errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT });

  expect(orderRepository.save).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'PROCESSING' }));
});
```

- **Bước 2: Triển khai luồng confirm**

`confirmOrder` must:

1. Lock order row in Order DB transaction.
2. Validate `PENDING`.
3. Validate bill `OPEN`.
4. Call Catalog `STOCK_DEDUCT_FOR_ORDER` with `idempotencyKey = confirm-order:{orderId}`.
5. On Catalog failure, rollback local transaction.
6. On success, set order and items to `PROCESSING`.
7. Set `confirmedAt` and `confirmedByUserId`.
8. Create outbox row with `eventType = order.confirmed`.
9. Commit.
10. Return `order.status_changed` event.

- **Bước 3: Xây dựng Kafka payload chuẩn**

Payload must match:

```ts
{
  eventId: randomUUID(),
  eventType: 'order.confirmed',
  schemaVersion: 1,
  tenantId,
  orderId,
  sessionId,
  tableId,
  tableName,
  items,
  totalAmount,
  confirmedAt,
  confirmedByUserId,
  occurredAt,
  correlationId: processId,
}
```

Partition key: `tenantId`.

- **Bước 4: Triển khai outbox publisher**

`OutboxPublisherService` must:

1. Poll `PENDING` outbox rows every 2 seconds using `@Interval(2000)`.
2. Publish each row to Kafka using topic and `partitionKey`.
3. Mark published rows `PUBLISHED`.
4. On error, increment `attemptCount`, set `status = FAILED` after 5 attempts, store `lastError`.

- **Bước 5: Kiểm tra confirm/outbox**

Chạy:

```bash
npx nx test order --testPathPattern=order.service.spec.ts
npx nx build order --configuration=development
```

Kỳ vọng: PASS.

---

## Task 12: Triển khai hủy đơn, yêu cầu phục vụ, yêu cầu hóa đơn và chuyển bàn

**Tệp liên quan:**

- Modify: `apps/order/src/app/modules/order/services/order.service.ts`
- Modify: `apps/order/src/app/modules/order/services/bill.service.ts`
- Modify: `apps/order/src/app/modules/order/services/service-request.service.ts`
- Modify: `apps/order/src/app/modules/order/services/transfer.service.ts`
- Modify: `apps/order/src/app/modules/order/controllers/order.controller.ts`
- Test: `apps/order/src/app/modules/order/tests/order.service.spec.ts`
- Test: `apps/order/src/app/modules/order/tests/bill.service.spec.ts`
- Test: `apps/order/src/app/modules/order/tests/service-request.service.spec.ts`
- Test: `apps/order/src/app/modules/order/tests/transfer.service.spec.ts`
- **Bước 1: Thêm test luồng trạng thái**

Cover these cases:

```ts
it('lets customer cancel only own pending order', async () => {
  orderRepository.findByIdAndTenant.mockResolvedValue({ ...pendingOrder, sessionId: 'sess-1' });

  const result = await service.customerCancelPending({
    tenantId: 'tenant-1',
    sessionId: 'sess-1',
    orderId: 'order-1',
    reason: 'CUSTOMER_REQUESTED',
  });

  expect(result.order.status).toBe(OrderStatus.CANCELED);
  expect(result.events.orderStatusChanged).toEqual(
    expect.objectContaining({
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.CANCELED,
    }),
  );
});

it('rejects customer cancel for another session order', async () => {
  orderRepository.findByIdAndTenant.mockResolvedValue({ ...pendingOrder, sessionId: 'sess-other' });

  await expect(
    service.customerCancelPending({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      orderId: 'order-1',
      reason: 'CUSTOMER_REQUESTED',
    }),
  ).rejects.toMatchObject({ errorCode: ErrorCode.TENANT_MISMATCH_SESSION });
});

it('requires reason for processing cancel', async () => {
  orderRepository.findByIdAndTenant.mockResolvedValue({ ...processingOrder, status: OrderStatus.PROCESSING });

  await expect(
    service.cancelProcessing({
      tenantId: 'tenant-1',
      orderId: 'order-1',
      userId: 'manager-1',
    }),
  ).rejects.toMatchObject({ errorCode: ErrorCode.ORDER_CANCEL_REASON_REQUIRED });
});

it('turns bill OPEN to PENDING_PAYMENT only when all active orders are SERVED', async () => {
  orderRepository.findActiveBySession.mockResolvedValue([{ ...servedOrder, status: OrderStatus.SERVED }]);
  cartService.getSnapshot.mockResolvedValue(emptyCart);

  const result = await billService.requestBill({
    tenantId: 'tenant-1',
    sessionId: 'sess-1',
  });

  expect(result.bill.status).toBe(BillStatus.PENDING_PAYMENT);
  expect(catalogClient.send).toHaveBeenCalledWith(
    TCP_REQUEST_MESSAGE.TABLE.UPDATE_STATUS,
    expect.objectContaining({ data: expect.objectContaining({ status: 'billing' }) }),
  );
});

it('rejects bill request when cart is not empty', async () => {
  cartService.getSnapshot.mockResolvedValue({
    ...emptyCart,
    items: [
      {
        cartLineId: 'line-1',
        menuItemId: 'item-1',
        menuItemName: 'Pho',
        quantity: 1,
        unitPrice: 65000,
        lineVersion: 1,
      },
    ],
  });

  await expect(
    billService.requestBill({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
    }),
  ).rejects.toMatchObject({ errorCode: ErrorCode.BILL_CART_NOT_EMPTY });
});

it('uses transfer locks before changing session table metadata', async () => {
  redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce('OK').mockResolvedValueOnce('OK');

  await transferService.transferTable({
    tenantId: 'tenant-1',
    sessionId: 'sess-1',
    fromTableId: 'table-old',
    toTableId: 'table-new',
    userId: 'waiter-1',
    requestId: 'transfer-1',
  });

  expect(redis.set).toHaveBeenNthCalledWith(
    1,
    'transfer:tenant-1:sess-1',
    'transfer-1',
    'PX',
    expect.any(Number),
    'NX',
  );
  expect(sessionRepository.updateTableSnapshot).toHaveBeenCalledWith(
    expect.objectContaining({
      tenantId: 'tenant-1',
      sessionId: 'sess-1',
      toTableId: 'table-new',
    }),
  );
});
```

- **Bước 2: Triển khai hủy đơn ở trạng thái pending**

Customer/staff pending cancel:

1. Validate order tenant.
2. Validate status `PENDING`.
3. Validate session ownership for customer command.
4. Set `CANCELED`, `cancelledAt`, `cancelReason`.
5. Recalculate bill excluding canceled order.
6. Do not call stock release.
7. Return `order.status_changed`.

- **Bước 3: Triển khai hủy đơn ở trạng thái processing**

Manager/Owner processing cancel:

1. Validate status `PROCESSING`.
2. Require reason.
3. Call Catalog `STOCK_RELEASE_FOR_ORDER`.
4. Set order/items `CANCELED`.
5. Recalculate bill.
6. Return `order.status_changed`.

- **Bước 4: Triển khai vòng đời service request**

`ServiceRequestService`:

- Create `CALL_STAFF` and `GENERAL_HELP` directly.
- Route `REQUEST_BILL` to `BillService.requestBill`.
- Acknowledge only `PENDING -> ACKNOWLEDGED`.
- Resolve only `ACKNOWLEDGED -> RESOLVED`.
- Always scope by `tenantId`.
- **Bước 5: Triển khai bill request tường minh**

`BillService.requestBill`:

1. Validate session active.
2. Validate bill `OPEN`.
3. Validate cart empty.
4. Validate all non-canceled orders are `SERVED`.
5. Set bill `PENDING_PAYMENT`, `closedAt`.
6. Lock cart status to `LOCKED`.
7. Call Catalog `TABLE.UPDATE_STATUS` with `billing`.
8. Create `REQUEST_BILL` service request.
9. Return `bill.requested`, `service.requested`, and `cart.updated`.

- **Bước 6: Triển khai saga chuyển bàn**

`TransferService.transferTable`:

1. Acquire Redis locks:

- `transfer:{tenantId}:{sessionId}`
- `table-transfer:{tenantId}:{fromTableId}`
- `table-transfer:{tenantId}:{toTableId}`

2. Validate destination table through Catalog.
3. Update Order session/orders/service requests table snapshots in DB transaction.
4. Call Catalog old table `available`.
5. Call Catalog new table `occupied` with same session ID.
6. Update Redis session payload.
7. Release locks.
8. Return `table.transferred`.

- **Bước 7: Kiểm tra các luồng trạng thái**

Chạy:

```bash
npx nx test order --testPathPattern=order.service.spec.ts
npx nx test order --testPathPattern=bill.service.spec.ts
npx nx test order --testPathPattern=service-request.service.spec.ts
npx nx test order --testPathPattern=transfer.service.spec.ts
npx nx build order --configuration=development
```

Kỳ vọng: PASS.

---

## Task 13: Thêm DTO Gateway phía BFF, REST Controller và WebSocket Gateway trực tiếp

**Tệp liên quan:**

- Create: `libs/interfaces/src/lib/gateway/order/order-request.dto.ts`
- Create: `libs/interfaces/src/lib/gateway/order/order-response.dto.ts`
- Create: `libs/interfaces/src/lib/gateway/order/index.ts`
- Create: `apps/bff/src/app/modules/realtime/realtime.module.ts`
- Create: `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- Create: `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- Create: `apps/bff/src/app/modules/order/order.module.ts`
- Create: `apps/bff/src/app/modules/order/controllers/customer-order.controller.ts`
- Create: `apps/bff/src/app/modules/order/controllers/staff-order.controller.ts`
- Modify: `apps/bff/src/app/app.module.ts`
- **Bước 1: Thêm gateway DTO**

Create DTOs with class-validator:

```ts
export class SubmitOrderRequestDto {
  @IsNumber()
  expectedCartVersion: number;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CartMutateRequestDto {
  @IsNumber()
  expectedCartVersion: number;

  @IsIn(['ADD_ITEM', 'SET_QUANTITY', 'UPDATE_NOTE', 'REMOVE_LINE', 'CLEAR'])
  operation: CartMutationOperation;

  @IsOptional()
  @IsUUID()
  menuItemId?: string;

  @IsOptional()
  @IsString()
  cartLineId?: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
```

- **Bước 2: Thêm realtime gateway**

Create `order-events.gateway.ts`:

```ts
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/orders' })
export class OrderEventsGateway {
  @WebSocketServer()
  server: Server;

  emitToRoom<T>(room: string, event: string, payload: T): void {
    this.server.to(room).emit(event, payload);
  }

  @SubscribeMessage('join.session')
  joinSession(@ConnectedSocket() socket: Socket, @MessageBody() body: { sessionId: string }) {
    socket.join(`session:${body.sessionId}:customer`);
  }

  @SubscribeMessage('join.staff')
  joinStaff(@ConnectedSocket() socket: Socket, @MessageBody() body: { tenantId: string }) {
    socket.join(`tenant:${body.tenantId}:staff`);
  }
}
```

Create `RealtimeEventsService` with methods:

```ts
emitOrderCreated(event: OrderCreatedEvent): void;
emitOrderStatusChanged(event: OrderStatusChangedEvent): void;
emitCartUpdated(event: CartUpdatedEvent): void;
emitServiceRequested(event: ServiceRequestedEvent): void;
emitBillRequested(event: BillRequestedEvent): void;
emitTableTransferred(event: TableTransferredEvent): void;
```

- **Bước 3: Thêm customer controller**

Routes:

```txt
POST /customer/sessions/join
GET /customer/cart
PATCH /customer/cart
DELETE /customer/cart
POST /customer/orders
GET /customer/orders/:id
DELETE /customer/orders/:id
POST /customer/service-requests
POST /customer/bill/request
GET /customer/bill/current
```

No `@Authorization({ secured: true })`. BFF forwards `tenantId` and `sessionId` from request metadata.

- **Bước 4: Thêm staff controller**

Routes:

```txt
GET /admin/orders
GET /admin/orders/:id
POST /admin/orders/:id/confirm
POST /admin/orders/:id/cancel-pending
POST /admin/orders/:id/cancel-processing
POST /admin/service-requests/:id/acknowledge
POST /admin/service-requests/:id/resolve
POST /admin/bills/:sessionId/reopen
POST /admin/tables/transfer
```

Use:

```ts
@Authorization({ secured: true })
@Permissions([PERMISSION.ORDER_CONFIRM])
```

Map permissions:

- list: `ORDER_GET_LIST`
- detail: `ORDER_GET_BY_ID`
- confirm: `ORDER_CONFIRM`
- cancel pending: `ORDER_CANCEL_PENDING`
- cancel processing: `ORDER_CANCEL_PROCESSING`
- service request acknowledge: `SERVICE_REQUEST_ACKNOWLEDGE`
- service request resolve: `SERVICE_REQUEST_RESOLVE`
- transfer: `TABLE_TRANSFER`
- bill reopen: `TABLE_UPDATE_STATUS`
- **Bước 5: Emit sự kiện trực tiếp sau TCP response**

After successful `SubmitOrderTcpResponse`, call:

```ts
this.realtimeEvents.emitCartUpdated(result.data.events.cartUpdated);
this.realtimeEvents.emitOrderCreated(result.data.events.orderCreated);
```

Apply the same pattern for status change, service request, bill request, and transfer responses.

- **Bước 6: Nối các module**

Modify `apps/bff/src/app/app.module.ts` imports:

```ts
OrderModule,
RealtimeModule,
```

- **Bước 7: Kiểm tra build BFF**

Chạy:

```bash
npx nx build bff --configuration=development
```

Kỳ vọng: PASS.

---

## Task 14: Danh sách kiểm tra xác minh End-to-End

**Tệp liên quan:**

- Modify only when verification exposes compile/runtime gaps.
- **Bước 1: Chạy unit test trọng tâm**

Chạy:

```bash
npx nx test shared-types
npx nx test catalog
npx nx test order
npx nx test bff
```

Kỳ vọng: PASS.

- **Bước 2: Chạy build backend**

Chạy:

```bash
npx nx build catalog --configuration=development
npx nx build order --configuration=development
npx nx build bff --configuration=development
```

Kỳ vọng: PASS.

- **Bước 3: Khởi động hạ tầng**

Chạy:

```bash
docker compose -f docker-compose.provider.yaml up -d postgres redis kafka
```

Kỳ vọng: các container PostgreSQL, Redis, Kafka hoạt động bình thường.

- **Bước 4: Khởi động các service**

Chạy:

```bash
pnpm dev:bff-order
```

Kỳ vọng:

- BFF on `http://localhost:3300/api/v1`
- Catalog on `http://localhost:3005/api/v1`
- Order on `http://localhost:3301/api/v1`
- Catalog TCP on `3205`
- Order TCP on `3201`
- **Bước 5: Luồng thủ công: submit rồi confirm**

Use REST client or Swagger:

1. Join customer session.
2. Add item to cart with `expectedCartVersion`.
3. Submit order with idempotency key.
4. Confirm order from staff endpoint.
5. Verify Catalog stock decreases.
6. Verify order status is `PROCESSING`.
7. Verify outbox row becomes `PUBLISHED`.
8. Verify Kafka topic `order.confirmed` contains enriched event.

- **Bước 6: Luồng thủ công: xung đột cart**

1. Read cart version `N`.
2. Send mutation A with `expectedCartVersion=N`.
3. Send mutation B again with `expectedCartVersion=N`.
4. Verify mutation B returns `409 CART_VERSION_CONFLICT` and latest snapshot.

- **Bước 7: Luồng thủ công: không oversell**

1. Set a menu item stock to `1`.
2. Create two pending orders for quantity `1`.
3. Confirm both concurrently.
4. Verify one succeeds and one returns `CATALOG_STOCK_INSUFFICIENT`.
5. Verify final stock is `0`, never `-1`.

- **Bước 8: Luồng thủ công: yêu cầu hóa đơn**

1. Move active non-canceled orders to `SERVED` using service/test fixture.
2. Ensure cart is empty.
3. Request bill.
4. Verify bill becomes `PENDING_PAYMENT`.
5. Verify cart status becomes `LOCKED`.
6. Verify table status becomes `billing`.
7. Verify no cash payment confirmation exists in Step 2.4.

- **Bước 9: Luồng thủ công: chuyển bàn**

1. Start active session on table A.
2. Transfer to available table B.
3. Verify Order session keeps same session ID.
4. Verify old table is `available`.
5. Verify new table is `occupied`.
6. Verify cart key remains `cart:{tenantId}:{sessionId}`.

---

## Công việc hoãn lại

These are intentionally excluded from Step 2.4:

- Physical PostgreSQL database split per service.
- TypeORM migration replacement for `synchronize: true`.
- BFF Kafka consumer bridge.
- Kitchen Service Kafka consumer and KDS Redis queue.
- Socket.IO Redis Adapter for multi-instance gateway.
- Cash payment confirmation, refunds, split bill, Stripe/bank transfer.

## Danh sách tự rà soát

- Spec coverage:
  - Session PG + Redis active cache: Tasks 7-9.
  - Cart global version/conflict: Task 9.
  - Submit creates `PENDING` and first bill: Task 10.
  - Confirm deducts stock through Catalog TCP: Tasks 4 and 11.
  - Kafka `order.confirmed` via outbox: Task 11.
  - Cancel by state/permission: Tasks 12 and 13.
  - Bill request locks ordering and table billing: Task 12.
  - Transfer saga and locks: Task 12.
  - BFF Direct WebSocket events: Task 13.
- No physical DB split inside Step 2.4.
- No BFF Kafka bridge inside Step 2.4.
- No per-task commits. Repository owner commits after review.
