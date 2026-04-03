---
name: nestjs-patterns
description: NestJS-specific patterns for QRTable microservices. Use when creating modules, configuring hybrid apps, setting up TCP communication, implementing guards, or applying NestJS best practices.
---

# NestJS Patterns — QRTable

## Module Structure (One Domain = One Module)

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([ProductEntity, CategoryEntity]),
    ClientsModule.register([
      {
        name: 'CATALOG_TCP_CLIENT',
        transport: Transport.TCP,
        options: { host: 'localhost', port: TCP_PORTS.CATALOG },
      },
    ]),
  ],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService],
})
export class ProductModule {}
```

## Hybrid App Bootstrap (Every Service)

```typescript
// apps/<service>/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // TCP microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: configService.get<number>('TCP_PORT'),
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ExceptionInterceptor());

  await app.startAllMicroservices();
  await app.listen(configService.get<number>('HTTP_PORT'));
}
```

## ConfigService Usage (No Hardcoding)

```typescript
// In module: import ConfigModule
ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig, tcpConfig] })

// In service/controller:
constructor(private config: ConfigService) {}
const port = this.config.get<number>('TCP_CATALOG_PORT');
const dbUrl = this.config.get<string>('DATABASE_URL');
```

## Guards Application

```typescript
// Controller level (recommended for most controllers)
@Controller('products')
@UseGuards(UserGuard, TenantGuard)
export class ProductController { }

// Method level (when only some methods need guards)
@Get(':id')
@UseGuards(UserGuard, TenantGuard, PermissionGuard)
async getProduct() { }

// Public routes (no guard)
@Get('health')
@Public() // custom decorator that skips UserGuard
healthCheck() { return { status: 'ok' }; }
```

## Decorators for Clean Controllers

```typescript
// Custom @CurrentUser() decorator from @common/decorators
@Get('profile')
@UseGuards(UserGuard, TenantGuard)
async getProfile(
  @CurrentUser() user: UserPayload,
  @CurrentTenant() tenantId: string,
) {
  return this.userService.getProfile(user.id, tenantId);
}
```

## TCP Handler Pattern

```typescript
// Handler in target service
@MessagePattern(CatalogTcpMessage.GET_PRODUCTS)
async getProducts(@Payload() data: { tenantId: string; filters?: ProductFilters }) {
  return this.productService.findAll(data.tenantId, data.filters);
}

// Caller in BFF
async getProducts(tenantId: string, filters?: ProductFilters) {
  return firstValueFrom(
    this.catalogClient.send(CatalogTcpMessage.GET_PRODUCTS, { tenantId, filters })
  );
}
```

## Exception Best Practices

```typescript
// Always use typed exceptions
if (!product) throw new NotFoundException(`Product "${id}" not found`);
if (existingEmail) throw new ConflictException(`Email already registered`);
if (!canAccess) throw new ForbiddenException('Insufficient permissions');

// Custom domain exceptions (when needed)
export class InsufficientStockException extends BadRequestException {
  constructor(productId: string, requested: number, available: number) {
    super(`Product "${productId}": requested ${requested}, available ${available}`);
  }
}
```

## Validation Pipe Global Setup

```typescript
// In main.ts — always configure this
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // strip unknown fields
    forbidNonWhitelisted: true, // throw on unknown fields
    transform: true, // auto-transform types (string '1' → number 1)
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

## EventEmitter2 for Side Effects

```typescript
// Install: @nestjs/event-emitter
// Import in AppModule: EventEmitterModule.forRoot()

// Emit
this.eventEmitter.emit('order.created', new OrderCreatedEvent(order));

// Listen
@OnEvent('order.created', { async: true })
async handleOrderCreated(event: OrderCreatedEvent) { }
```
