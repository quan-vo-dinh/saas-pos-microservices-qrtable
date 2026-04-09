# Step 1.45 — CloudinaryModule Setup — Design Spec

> **Date:** 2026-04-09
> **Phase:** Phase 1 — Catalog + Menu + Table
> **Scope:** Backend NestJS shared module + unit tests only
> **Status:** Draft → Approved

---

## 1. Problem Statement

Step 1.45 cần một shared CloudinaryModule cho phép bất kỳ microservice nào upload, xóa, và generate optimized URLs cho images. Module phải tenant-isolated (mỗi tenant có folder riêng trên Cloudinary) và dùng chung được cho nhiều use cases (menu images Phase 1, branding Phase 4B, QR exports future).

Step 1.5 (Catalog Service Backend) sẽ consume module này để upload ảnh menu items.

## 2. Architecture Decision: `libs/providers/` Category

### Decision

CloudinaryModule đặt tại **`libs/providers/cloudinary/`** với path alias `@common/providers/cloudinary/*`.

### Rationale

Hiện tại, tất cả shared config (Redis, TypeORM, TCP, Keycloak...) nằm chung trong `libs/configuration/`. Chúng chủ yếu là **infrastructure config classes** + **NestJS provider factories** — rất ít business logic.

CloudinaryModule khác biệt vì nó chứa **business logic đáng kể**: file validation, upload logic, URL transformation, tenant folder routing. Nhét vào `libs/configuration/` sẽ vi phạm Single Responsibility — mixing config concerns với service concerns.

**`libs/providers/`** tạo một category rõ ràng cho **external service integrations** — các module wrap SDK bên ngoài với business logic:

| Pattern               | Chứa gì                                                                                    | Ví dụ                                         |
| --------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `libs/configuration/` | Infrastructure config classes + NestJS providers (connection settings, ports, credentials) | Redis, TypeORM, TCP, Keycloak                 |
| `libs/providers/`     | External service integration modules (SDK wrapper + business logic + config)               | Cloudinary, Stripe (Phase 3), SMTP (Phase 4C) |

Approach này:

- **Scalable:** Stripe, SMTP sẽ follow cùng pattern `libs/providers/{service}/`
- **Consistent:** Giống pattern nhóm của `libs/frontend/` (ui, hooks, utils) và `libs/shared/` (types, constants, mock-data)
- **Clear boundaries:** External service integrations tách biệt khỏi internal infrastructure config

### Alternatives Considered

1. **`libs/cloudinary/` (flat):** Simple nhưng `libs/` sẽ cluttered khi thêm nhiều external providers
2. **`libs/configuration/` (extend):** Consistent với hiện tại nhưng vi phạm SRP — CloudinaryModule có business logic, không chỉ config

## 3. Module Structure

```
libs/providers/cloudinary/
├── src/
│   ├── lib/
│   │   ├── cloudinary.module.ts           # DynamicModule (forRoot/forRootAsync)
│   │   ├── cloudinary.service.ts          # Upload, delete, URL generation
│   │   ├── cloudinary.config.ts           # Configuration class (env validation)
│   │   ├── cloudinary.provider.ts         # Cloudinary SDK instance factory
│   │   ├── cloudinary.constants.ts        # Injection tokens, folder enum, limits
│   │   ├── interfaces/
│   │   │   ├── cloudinary-options.interface.ts    # Module config options
│   │   │   └── cloudinary-response.interface.ts   # Upload/URL response types
│   │   └── __tests__/
│   │       └── cloudinary.service.spec.ts         # Unit tests
│   └── index.ts                           # Public barrel exports
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── jest.config.cts
└── eslint.config.mjs
```

**Path alias** in `tsconfig.base.json`:

```json
"@common/providers/cloudinary/*": ["libs/providers/cloudinary/src/lib/*"]
```

**Public API** (`index.ts` exports):

- `CloudinaryModule`
- `CloudinaryService`
- Type exports: `CloudinaryUploadResponse`, `CloudinaryUrlOptions`, `ResponsiveUrls`, `UploadImageOptions`

## 4. Interfaces

### Module Options

```typescript
interface CloudinaryModuleOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

interface CloudinaryModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<CloudinaryModuleOptions> | CloudinaryModuleOptions;
}
```

### Upload Options

```typescript
interface UploadImageOptions {
  tenantId: string;
  folder: CloudinaryFolder;
  fileName?: string; // default: UUID v4
  mimetype: string; // for validation
}
```

### URL Transform Options

```typescript
interface UrlTransformOptions {
  thumbnailWidth?: number; // default: 200
  mediumWidth?: number; // default: 400
  largeWidth?: number; // default: 800
}
```

## 5. Configuration & DI

### Environment Variables

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Added to `.env.example` and `.env`.

### CloudinaryConfiguration Class

```typescript
export class CloudinaryConfiguration {
  @IsString()
  @IsNotEmpty()
  CLOUD_NAME: string;

  @IsString()
  @IsNotEmpty()
  API_KEY: string;

  @IsString()
  @IsNotEmpty()
  API_SECRET: string;

  constructor() {
    this.CLOUD_NAME = process.env['CLOUDINARY_CLOUD_NAME'] || '';
    this.API_KEY = process.env['CLOUDINARY_API_KEY'] || '';
    this.API_SECRET = process.env['CLOUDINARY_API_SECRET'] || '';
  }
}
```

### DynamicModule Pattern (forRoot/forRootAsync)

```typescript
@Module({})
export class CloudinaryModule {
  static forRoot(options: CloudinaryModuleOptions): DynamicModule {
    return {
      module: CloudinaryModule,
      providers: [{ provide: CLOUDINARY_MODULE_OPTIONS, useValue: options }, CloudinaryProvider, CloudinaryService],
      exports: [CloudinaryService],
    };
  }

  static forRootAsync(options: CloudinaryModuleAsyncOptions): DynamicModule {
    return {
      module: CloudinaryModule,
      imports: options.imports || [],
      providers: [
        {
          provide: CLOUDINARY_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        CloudinaryProvider,
        CloudinaryService,
      ],
      exports: [CloudinaryService],
    };
  }
}
```

### Consumer Usage (e.g., Catalog Service)

Each consuming service adds `CloudinaryConfiguration` to its own configuration class and uses `forRootAsync` to wire it:

```typescript
// apps/catalog/src/configuration/index.ts
class Configuration extends BaseConfiguration {
  @ValidateNested()
  @Type(() => CloudinaryConfiguration)
  CLOUDINARY_CONFIG = new CloudinaryConfiguration();
  // ... other configs
}

// apps/catalog/src/app.module.ts
@Module({
  imports: [
    CloudinaryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        cloudName: config.get('CLOUDINARY_CONFIG.CLOUD_NAME'),
        apiKey: config.get('CLOUDINARY_CONFIG.API_KEY'),
        apiSecret: config.get('CLOUDINARY_CONFIG.API_SECRET'),
      }),
    }),
  ],
})
```

## 6. CloudinaryService API

### `uploadImage(file: Buffer, options: UploadImageOptions): Promise<CloudinaryUploadResponse>`

**Input:**

- `file`: Image buffer (from Multer memory storage)
- `options.tenantId`: Tenant identifier for folder isolation
- `options.folder`: `'menu' | 'branding' | 'qr-exports'`
- `options.fileName?`: Optional custom filename (default: UUID)
- `options.mimetype`: MIME type for validation

**Behavior:**

1. Validate file size (max 5MB) and MIME type (jpeg, png, webp)
2. Upload to Cloudinary with path `qrtable/{tenantId}/{folder}/{uuid_or_fileName}`
3. Apply eager transformations: `format: auto, quality: auto, width: 800, crop: limit`
4. Return upload metadata

**Response:**

```typescript
interface CloudinaryUploadResponse {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}
```

**Errors:**

- `BadRequestException('File size exceeds 5MB limit')` if > 5MB
- `BadRequestException('Invalid file type. Allowed: jpeg, png, webp')` if invalid MIME
- `InternalServerErrorException('Image upload failed')` if SDK error

### `deleteImage(publicId: string): Promise<void>`

**Behavior:**

- Delete image by `public_id` on Cloudinary
- Idempotent: no error if image doesn't exist
- Log warning if delete fails for unexpected reason

### `getOptimizedUrl(publicId: string, options?: UrlTransformOptions): ResponsiveUrls`

**Behavior:**

- Generate URL strings using Cloudinary URL transformation syntax
- Zero API calls — pure string generation

**Response:**

```typescript
interface ResponsiveUrls {
  thumbnail: string; // w_200, c_fill, f_auto, q_auto
  medium: string; // w_400, c_limit, f_auto, q_auto
  large: string; // w_800, c_limit, f_auto, q_auto
  original: string; // f_auto, q_auto (no resize)
}
```

### Constants

```typescript
export const CLOUDINARY_INJECTION_TOKEN = 'CLOUDINARY';
export const CLOUDINARY_MODULE_OPTIONS = 'CLOUDINARY_MODULE_OPTIONS';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const BASE_FOLDER = 'qrtable';

export enum CloudinaryFolder {
  MENU = 'menu',
  BRANDING = 'branding',
  QR_EXPORTS = 'qr-exports',
}
```

## 7. Tenant Isolation

Upload path format: `qrtable/{tenant_id}/{folder}/{filename}`

Examples:

- `qrtable/tenant-abc/menu/550e8400-e29b.jpg` (menu item image)
- `qrtable/tenant-abc/branding/logo.png` (Phase 4B)
- `qrtable/tenant-abc/qr-exports/table-5.pdf` (future)

Each tenant's images are isolated by folder prefix. Deletion operations validate the public_id includes the expected tenant prefix.

## 8. Testing

### Unit Tests (11 cases)

**CloudinaryService:**

1. ✅ `uploadImage` — successful upload → returns CloudinaryUploadResponse
2. ✅ `uploadImage` — file > 5MB → throws BadRequestException
3. ✅ `uploadImage` — invalid MIME type (pdf, gif) → throws BadRequestException
4. ✅ `uploadImage` — correct tenant folder path: `qrtable/{tenantId}/menu/`
5. ✅ `uploadImage` — Cloudinary SDK error → throws InternalServerErrorException
6. ✅ `deleteImage` — successful delete → void
7. ✅ `deleteImage` — image not found → no throw (idempotent)
8. ✅ `getOptimizedUrl` — returns 4 responsive URL strings
9. ✅ `getOptimizedUrl` — thumbnail has `w_200,c_fill`, large has `w_800,c_limit`

**CloudinaryModule:** 10. ✅ `forRoot()` — creates correct providers 11. ✅ `forRootAsync()` — injects async config successfully

**Mock strategy:** Mock Cloudinary SDK's `upload_stream` and `destroy` methods. No real API calls in unit tests.

## 9. NPM Dependencies

```
cloudinary (v2.x) — Cloudinary Node.js SDK
```

No other new dependencies required. Multer setup (for BFF) is out of scope for Step 1.45 — that belongs to Step 1.5.

## 10. Scope Boundaries

### In scope (Step 1.45):

- CloudinaryModule shared lib in `libs/providers/cloudinary/`
- CloudinaryService with upload, delete, URL generation
- Configuration class with env validation
- Unit tests with mocked SDK
- Update `.env.example` with Cloudinary env vars
- Update `tsconfig.base.json` with path alias
- Guide to create Cloudinary account

### Out of scope (future steps):

- BFF Multer middleware setup → Step 1.5
- Catalog Service integration → Step 1.5
- Frontend upload UI → Step 1.6
- Stripe provider → Phase 3
- SMTP provider → Phase 4C

## 11. Cloudinary Account Setup Guide

1. Go to https://cloudinary.com/users/register_free
2. Sign up with GitHub or email
3. After login, go to Dashboard → copy Cloud Name, API Key, API Secret
4. Add to `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=<your_cloud_name>
   CLOUDINARY_API_KEY=<your_api_key>
   CLOUDINARY_API_SECRET=<your_api_secret>
   ```
5. Free tier includes: 25 credits/month (~25GB storage or ~25GB bandwidth)
