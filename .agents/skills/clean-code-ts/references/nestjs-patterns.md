# NestJS Patterns Reference

## Dependency Injection — Constructor Injection Only

```typescript
// ❌ Property injection (hard to test, hides dependencies)
@Injectable()
class UserService {
  @Inject() private repo: UserRepository;
}

// ✅ Constructor injection — explicit, testable
@Injectable()
class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly config: ConfigService<AppConfig>,
    private readonly logger: Logger,
  ) {}
}
```

## DTO Validation — Always Typed, Always Validated

```typescript
// ✅ Every external input MUST go through a validated DTO
export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt limit
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;
}

// ✅ Response DTOs prevent accidental field leaks
export class UserResponseDto {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  // ❌ No: password, passwordResetToken, internalFlags
}

// ✅ Use plainToInstance to safely map entity → response DTO
return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
```

## Repository Pattern — Isolate DB Logic

```typescript
// ✅ Custom repository with typed methods
@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findActiveWithPagination(page: number, limit: number): Promise<[UserEntity[], number]> {
    return this.repo.findAndCount({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
```

## Guards & Interceptors — Declarative, Not Inline

```typescript
// ❌ Bad — auth check inside service
async getProfile(userId: string, requesterId: string) {
  if (userId !== requesterId) throw new ForbiddenException();
  // ...
}

// ✅ Good — guard handles cross-cutting concern
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Get(':id')
getProfile(@Param('id') id: string) { ... }
```

## Logging — Structured, Not console.log

```typescript
// ❌ Never
console.log('User created:', user);

// ✅ NestJS Logger with context
private readonly logger = new Logger(UserService.name);

this.logger.log(`User created successfully`, { userId: user.id });
this.logger.warn(`Rate limit approaching`, { userId, attempts });
this.logger.error(`Failed to send welcome email`, { userId, error: err.message });
```

## Event-Driven (Kafka/EventEmitter) — Decoupled Side Effects

```typescript
// ✅ Emit event after core operation, don't chain side effects inline
async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
  const user = await this.userRepo.save(this.userRepo.create(dto));

  // Emit — listener handles email, analytics, etc.
  this.eventEmitter.emit(UserEvents.CREATED, new UserCreatedEvent(user));

  return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
}

// ✅ Separate listener
@OnEvent(UserEvents.CREATED)
async handleUserCreated(event: UserCreatedEvent): Promise<void> {
  await this.mailerService.sendWelcomeEmail(event.user);
}
```

## Module Boundaries — No Cross-Module Direct Injection

```typescript
// ❌ UserService directly injecting OrderRepository (cross-module)
// ✅ OrderModule exports OrderService; UserModule imports OrderModule
@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity])],
  providers: [OrderService, OrderRepository],
  exports: [OrderService], // only export the service, not repository
})
export class OrderModule {}
```

## Exception Hierarchy — Custom Domain Exceptions

```typescript
// ✅ Create domain-specific exceptions for business rules
export class InsufficientBalanceException extends BadRequestException {
  constructor(required: number, available: number) {
    super(`Insufficient balance: required ${required}, available ${available}`);
  }
}

export class UserAlreadyVerifiedException extends ConflictException {
  constructor(userId: string) {
    super(`User ${userId} is already verified`);
  }
}
```
