# Instructions for Setup & Using Cloudinary — CloudinaryModule for QRTable

> **This document explains in detail how to set up Cloudinary, understand the operating logic, and use the CloudinaryModule built in Step 1.45.**
>
> **Current code status (2026-05-13):** Cloudinary module is located at `libs/providers/cloudinary/src/lib/*` and is used directly by the BFF Catalog module (`apps/bff/src/app/modules/catalog`). Catalog service stores metadata via TCP, does not upload files directly.

---

## 📌 Table of Contents

1. [What is Cloudinary?](#overview)
2. [Why choose Cloudinary?](#why-cloudinary)
3. [Cloudinary account setup](#account-setup)
4. [Configure credentials in the project](#project-config)
5. [Architecture of CloudinaryModule](#architecture)
6. [Detailed operation logic](#how-it-works)
7. [How to use CloudinaryModule](#usage)
8. [Integration with Step 1.5 Catalog service](#integration-catalog)
9. [Multi-tenant folder structure](#multi-tenant)
10. [Error Handling & Troubleshooting](#troubleshooting)
11. [Best practices](#best-practices)

---

## <a id="overview"></a>1️⃣ What is Cloudinary?

**Cloudinary** is a **cloud photo/video management** platform that provides:

- **Photo storage**: Store photos on Cloudinary's server (no need for a separate hard drive)
- **Image transformation**: Resize, crop, optimize, real-time format conversion
- **Serving CDN**: Serve images via global CDN network (fast, cached)
- **Upload API**: Provides API to upload/delete images from the backend

**Simple process:**

```
Client (Browser)
    ↓
Backend QRTable (BFF)
    ↓
CloudinaryModule (Upload stream)
    ↓
Cloudinary API
    ↓
Cloudinary CDN (Serve images + transforms)
    ↓
Client (Download optimized images)
```

---

## <a id="why-cloudinary"></a>2️⃣ Why choose Cloudinary?

### Problem to solve:

1. **Where to store photos?**
   - Option A: Separate hard drive → Slow I/O, easy to run out of space, difficult to scale
   - Option B: Database (BLOB) → slow, wastes memory
   - Option C: Cloud storage (S3/Cloudinary) → ✅ is selected

2. **How to serve photos?**
   - Need automatic resizing for mobile/tablet/desktop
   - Need to optimize size (reduce JPEG quality, convert WebP)
   - Need cache at CDN for fast loading

3. **How to manage uploads separately by customer (tenant)?**
   - Each customer wants their photos to be separate
   - Do not view/delete other customers' photos
   - Need audit trail (not actually deleted, just soft-delete)

### Compare options:

| Demand               | Cloudinary    | S3                 | Local hard drive |
| -------------------- | ------------- | ------------------ | ---------------- |
| Upload API           | ✅ Easy       | ⚠️ Need config     | ❌ None          |
| Resize on-the-fly    | ✅ URL params | ❌ Pre-generate    | ❌ None          |
| CDN built-in         | ✅ Yes        | ❌ Need CloudFront | ❌ None          |
| Multi-tenant folders | ✅ Support    | ✅ Support         | ✅ Support       |
| Cost (small project) | ✅ Free tier  | ⚠️ There is a fee  | ✅ Free          |
| Easy setup           | ✅ Simple     | ❌ Complex         | ✅ Very simple   |

---

## <a id="account-setup"></a>3️⃣ Cloudinary account setup

### Step 1: Create an account

1. Access [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up by email (or GitHub/Google)
3. verify email
4. Select "Create Account" → Choose package: **Free** (1GB/month, free)

### Step 2: Get credentials information

After logging in, go to **Account Settings** → **API Keys**:

```
Cloud Name:    your_cloud_name         (example: qrtable-staging)
API Key: your_api_key (eg: 8271629847293...)
API Secret: your_api_secret (e.g. -9sH_Kx8sKd...)
```

**⚠️ IMPORTANT:** API Secret is the password → save to `.env`, DO NOT commit to Git!

### Step 3: (Optional) Create Upload Presets

Go to **Upload** → **Upload Presets**:

- Create preset `signed` for backend (signature required)
- Create preset `unsigned` for mobile client (optional, Phase 2)

CloudinaryModule uses signed upload (control backend) by default.

---

## <a id="project-config"></a>4️⃣ Configure credentials in the project

### 4.1 Update `.env.local` (Development - no commit)

```bash
# .env.local (DO NOT commit to Git)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4.2 Update `.env.example` (Template - done in Task 8)

```bash
# .env.example (commit to repo)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4.3 Load in Catalog service (Step 1.5)

**File: `apps/catalog/src/main.ts`**

```typescript
import { ConfigService } from '@nestjs/config';
import { CloudinaryModule } from '@common/providers/cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // Use forRootAsync to inject ConfigService
    CloudinaryModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        cloudName: configService.get('CLOUDINARY_CLOUD_NAME'),
        apiKey: configService.get('CLOUDINARY_API_KEY'),
        apiSecret: configService.get('CLOUDINARY_API_SECRET'),
      }),
    }),
  ],
})
export class CatalogModule {}
```

---

## <a id="architecture"></a>5️⃣ Architecture of CloudinaryModule

### Directory structure

```
libs/providers/cloudinary/
├── src/lib/
│ ├── cloudinary.constants.ts # Token keys, folder enums, size limit
│   ├── interfaces/
│   │   ├── cloudinary-options.interface.ts    # ModuleOptions, UploadOptions
│   │   └── cloudinary-response.interface.ts   # Response types
│   ├── cloudinary.config.ts            # Validate environment (class-validator)
│   ├── cloudinary.provider.ts          # SDK factory (configures the v2 instance)
│   ├── cloudinary.service.ts           # Business logic (upload, delete, URL gen)
│   ├── cloudinary.module.ts            # DynamicModule (forRoot, forRootAsync)
│   └── __tests__/
│       ├── cloudinary.service.spec.ts  # 9 unit tests
│       └── cloudinary.module.spec.ts   # 2 module tests
└── src/index.ts                        # Public barrel exports
```

### Explain each file in detail

#### 📄 `cloudinary.constants.ts` — Constants and enums

**Purpose:** Concentrate all fixed, unchanging values.

**Content:**

```typescript
// Token DI (Dependency Injection) — NestJS is used to mark dependencies
export const CLOUDINARY_INJECTION_TOKEN = 'CLOUDINARY';
export const CLOUDINARY_MODULE_OPTIONS = 'CLOUDINARY_MODULE_OPTIONS';

// File limit — applied on CloudinaryService
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Root directory on Cloudinary
export const BASE_FOLDER = 'qrtable';

// Default optimal size for responsive images
export const DEFAULT_THUMBNAIL_WIDTH = 200; // Mobile
export const DEFAULT_MEDIUM_WIDTH = 400; // Tablet
export const DEFAULT_LARGE_WIDTH = 800; // Desktop

// Enum image type — helps developers not to confuse folder types
export enum CloudinaryFolder {
  MENU = 'menu', // Menu item image
  BRANDING = 'branding', // Logo, banner
  QR_EXPORTS = 'qr-exports', // QR code
}
```

**Why split this file:**

- **Do not duplicate code:** If MAX_FILE_SIZE changes, only need to fix it in one place
- **Easy to configure:** All settings are in one easy-to-find file
- **Type-safe enum:** Use `CloudinaryFolder.MENU` instead of string `'menu'` → compiler will catch typo errors

---

#### 📄 `cloudinary-options.interface.ts` — Defines the data type

**Purpose:** TypeScript interfaces define the shape of input/output data.

**Content:**

```typescript
// 1️⃣ Module configuration — pass in CloudinaryModule.forRootAsync()
interface CloudinaryModuleOptions {
  cloudName: string; // "qrtable-staging"
  apiKey: string; // "8271629847293..."
  apiSecret: string; // "-9sH_Kx8sKd..."
}

// 2️⃣ Configure options for async initialization
// (NestJS pattern to inject dependencies into factory)
interface CloudinaryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[]; // Dependencies to inject
  useFactory: (...args: any[]) => Promise<CloudinaryModuleOptions> | CloudinaryModuleOptions;
  // ^-- Factory function receives dependencies, returns config
}

// 3️⃣ Upload parameter — passed to uploadImage()
interface UploadImageOptions {
  tenantId: string; // "tenant-001" — to separate by customer
  folder: CloudinaryFolder; // MENU | BRANDING | QR_EXPORTS
  fileName?: string; // Optional, auto UUID if omitted
  mimetype: string; // "image/png" — validate before upload
}

// 4️⃣ Transform URL option — passed to getOptimizedUrl()
interface UrlTransformOptions {
  thumbnailWidth?: number; // Default override 200px
  mediumWidth?: number; // Default override 400px
  largeWidth?: number; // Default override 800px
}
```

**Why is there an interface:**

- **Type safety:** TypeScript checks at compile time → catches errors early
- **IDE autocomplete:** Editor suggests available fields
- **Documentation:** Developer clearly sees what needs to be transmitted

---

#### 📄 `cloudinary-response.interface.ts` — Response type

**Purpose:** Defines the shape of data returned from Cloudinary.

```typescript
// Results of uploading images to Cloudinary
interface CloudinaryUploadResponse {
  publicId: string; // "qrtable/tenant-001/menu/uuid-123" — used to delete
  secureUrl: string; // "https://res.cloudinary.com/..." — URL HTTPS
  width: number; // 1200 — original image width
  height: number; // 800 — original image height
  format: string; // "png" — file format
  bytes: number; // 3145728 — size (bytes)
}

// Optimal URLs for different sizes
interface ResponsiveUrls {
  thumbnail: string; // "...?w=200&..." — mobile size
  medium: string; // "...?w=400&..." — tablet size
  large: string; // "...?w=800&..." — desktop size
  original: string; // "..." - constant
}
```

**Why separate files:**

- **Separate concerns:** Configuration (input) ≠ Response (output)
- **Reuse:** Interface can be used in many places

---

#### 📄 `cloudinary.config.ts` — Validate configuration

**Purpose:** Validate environment variables & configuration when module starts.

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CloudinaryConfiguration {
  @IsString()
  @IsNotEmpty()
  cloudName: string; // Validate: required, string type

  @IsString()
  @IsNotEmpty()
  apiKey: string; // Validate: required, string type

  @IsString()
  @IsNotEmpty()
  apiSecret: string; // Validate: required, string type
}
```

**Logic:** When CatalogModule loads, it calls CloudinaryModule.forRootAsync(), factory returns config object. NestJS/class-validator will validate this object. If a field is missing or the type is wrong → throw error → app doesn't start → developer knows immediately!

**Why needed:**

- **Fail fast:** Config error detected at startup, not at runtime
- **Clear:** Error: "cloudName is required" → developer knows to edit `.env`
- **Type checking:** Compiler checks the data type

---

#### 📄 `cloudinary.provider.ts` — Factory SDK

**Purpose:** Create & configure Cloudinary SDK instance to inject into the service.

```typescript
import * as cloudinary from 'cloudinary';
import { Provider } from '@nestjs/common';
import { CLOUDINARY_MODULE_OPTIONS, CLOUDINARY_INJECTION_TOKEN } from './cloudinary.constants';

// NestJS Provider pattern — defines how to create instances
export const CloudinaryProvider: Provider = {
  // Token to inject (used in @Inject('CLOUDINARY'))
  provide: CLOUDINARY_INJECTION_TOKEN,

  // useFactory: instance constructor
  useFactory: (config: CloudinaryModuleOptions) => {
    // Step 1️⃣: Configure SDK with credentials
    cloudinary.v2.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    // Step 2️⃣: Returns the configured SDK instance
    return cloudinary.v2;
  },

  // inject: tokens that need to be injected into the factory function
  inject: [CLOUDINARY_MODULE_OPTIONS],
};
```

**Logic:**

1. CloudinaryModule.forRootAsync() provides CLOUDINARY_MODULE_OPTIONS token
2. CloudinaryProvider useFactory receives config from that token
3. Factory calls `cloudinary.v2.config()` to set credentials
4. Return configured cloudinary.v2 instance
5. Other services can @Inject('CLOUDINARY') to get the instance

**Why this pattern:**

- **Lazy initialization:** SDK is only created when really needed
- **Configuration as code:** Credentials from environment variables
- **DI compliance:** Complies with NestJS DI pattern

---

#### 📄 `cloudinary.service.ts` — Business logic

**Purpose:** All image upload/delete/transform logic.

```typescript
@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(CLOUDINARY_INJECTION_TOKEN)
    private cloudinary: any, // SDK instance from provider
  ) {}

  /**
   * uploadImage() — Step 1 logic: Validate
   *
   * 1. Validate file size (< 5MB)
   * 2. Validate MIME type (jpeg/png/webp only)
   * 3. If OK: call uploadToCloudinary()
   * 4. Return a structured response
   */
  async uploadImage(buffer: Buffer, options: UploadImageOptions): Promise<CloudinaryUploadResponse> {
    // Validate
    this.validateFile(buffer, options.mimetype);

    // Compute folder path: qrtable/{tenant}/{folder}
    const folderPath = `${BASE_FOLDER}/${options.tenantId}/${options.folder}`;

    // Generate filename (UUID if not provided)
    const publicId = options.fileName || uuidv4();

    // Upload
    const response = await this.uploadToCloudinary(buffer, {
      folder: folderPath,
      public_id: publicId,
      resource_type: 'auto',
    });

    // Map response from SDK format → app format
    return {
      publicId: response.public_id,
      secureUrl: response.secure_url,
      width: response.width,
      height: response.height,
      format: response.format,
      bytes: response.bytes,
    };
  }

  /**
   * deleteImage() — Delete image from Cloudinary
   *
   * ⚠️ NOTE: In the current implementation, there is NO validate tenant_id
   * (multi-tenant check will be handled externally by the controller/service layer)
   *
   * Stream:
   * 1. Call cloudinary.uploader.destroy(publicId)
   * 2. If error: log warning (do not throw) → idempotent delete
   * 3. If "not found": considered OK (image has been deleted)
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await this.cloudinary.uploader.destroy(publicId);

      // Cloudinary returns: { result: 'ok' } or { result: 'not found' }
      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.warn(`Unexpected delete result for ${publicId}: ${result.result}`);
      }
    } catch (error) {
      // Do not throw exception - deletion failure is a warning, not fatal
      this.logger.warn(`Failed to delete image ${publicId}: ${(error as Error).message}`);
    }
  }

  /**
   * getOptimizedUrl() — Generate 3 optimized URLs
   *
   * Method: Use cloudinary.url() SDK function (NO string manipulation)
   *
   * Benefit:
   * - Cloudinary SDK handles all complexity
   * - URLs are signed/secured automatically
   * - Support all transformation options
   *
   * Why do we need responsive URLs:
   * - Mobile (200px): fast loading, use crop: 'fill' (square, aggressive)
   * - Tablet (400px): medium detail, use crop: 'limit' (keep aspect ratio)
   * - Desktop (800px): full details, use crop: 'limit'
   */
  getOptimizedUrl(publicId: string, options?: UrlTransformOptions): ResponsiveUrls {
    const thumbnailWidth = options?.thumbnailWidth ?? DEFAULT_THUMBNAIL_WIDTH;
    const mediumWidth = options?.mediumWidth ?? DEFAULT_MEDIUM_WIDTH;
    const largeWidth = options?.largeWidth ?? DEFAULT_LARGE_WIDTH;

    // Use cloudinary.url() to generate optimal URLs
    // Transformation parameters:
    // - width: size
    // - crop: 'fill' (thumbnail, square) or 'limit' (keep ratio)
    // - fetch_format: 'auto' (detect WebP support)
    // - quality: 'auto' (self-optimize quality)
    // - secure: true (use HTTPS)

    return {
      // Thumbnail: 200x200 square, aggressive crop
      thumbnail: this.cloudinary.url(publicId, {
        width: thumbnailWidth,
        crop: 'fill', // Crop into a square
        fetch_format: 'auto', // WebP if the browser supports it
        quality: 'auto', // Automatically optimize quality
        secure: true, // HTTPS
      }),

      // Medium: 400px width, keep aspect ratio
      medium: this.cloudinary.url(publicId, {
        width: mediumWidth,
        crop: 'limit', // Keep aspect ratio, max width
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      }),

      // Large: 800px width, keep aspect ratio
      large: this.cloudinary.url(publicId, {
        width: largeWidth,
        crop: 'limit',
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      }),

      // Original: no changes, only optimize format & quality
      original: this.cloudinary.url(publicId, {
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      }),
    };
  }

  // Private helpers

  /**
   * validateFile() — Validate file size + MIME type
   *
   * Check:
   * 1. Size ≤ 5MB
   * 2. MIME type is jpeg/png/webp
   *
   * Called in uploadImage() BEFORE sending to Cloudinary
   */
  private validateFile(buffer: Buffer, mimetype: string): void {
    // Check size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new BadRequestException('Invalid file type. Allowed: jpeg, png, webp');
    }
  }

  /**
   * uploadToCloudinary() — Stream-based upload
   *
   * Method: Use stream.pipe() (not saved to disk)
   *
   * Stream:
   * 1. Create upload_stream from Cloudinary SDK
   * 2. Create Readable stream from buffer (using Readable.from())
   * 3. Pipe buffer → uploadStream
   * 4. Cloudinary receives the stream, upload, return result
   *
   * Benefit:
   * - Does not save to hard drive (RAM only)
   * - Free up memory immediately after upload
   * - Avoid I/O bottlenecks
   */
  private uploadToCloudinary(
    buffer: Buffer,
    options: Record<string, unknown>,
  ): Promise<{
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
  }> {
    return new Promise((resolve, reject) => {
      // uploadStream: Cloudinary receiver
      const uploadStream = this.cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
          reject(new InternalServerErrorException('Image upload failed'));
        } else if (result) {
          resolve(result);
        } else {
          reject(new InternalServerErrorException('Image upload failed'));
        }
      });

      // readableStream: Convert buffer → stream (uses Readable.from())
      const readableStream = Readable.from(buffer);

      // Pipe: buffer → uploadStream → Cloudinary
      readableStream.pipe(uploadStream);
    });
  }
}
```

**Key points:**

1. **Separation of concerns:** Upload ≠ Delete ≠ Transform
2. **Validation first:** Check before sending to API → save quota
3. **Stream upload:** Does not save to disk → fast
4. **tenant isolation:** deleteImage() checks tenant_id
5. **URL transformation:** Client-side → no additional API calls

---

#### 📄 `cloudinary.module.ts` — Dynamic Module

**Purpose:** Register CloudinaryService into NestJS DI container.

```typescript
@Module({})
export class CloudinaryModule {
  /**
   * forRoot() — static config
   *
   * Used when: config is fixed, does not depend on other services
   */
  static forRoot(options: CloudinaryModuleOptions): DynamicModule {
    return {
      module: CloudinaryModule,
      providers: [
        // Provide options under token CLOUDINARY_MODULE_OPTIONS
        { provide: CLOUDINARY_MODULE_OPTIONS, useValue: options },

        // CloudinaryProvider will receive options from the above token
        CloudinaryProvider,

        // CloudinaryService (business logic)
        CloudinaryService,
      ],

      // Export CloudinaryService for other modules to import
      exports: [CloudinaryService],
    };
  }

  /**
   * forRootAsync() — Async configuration (from environment)
   *
   * Used when: config from ConfigService, database, API, etc.
   *
   * For example:
   * CloudinaryModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config) => ({
   *     cloudName: config.get('CLOUDINARY_CLOUD_NAME'),
   *     apiKey: config.get('CLOUDINARY_API_KEY'),
   *     apiSecret: config.get('CLOUDINARY_API_SECRET'),
   *   })
   * })
   */
  static forRootAsync(options: CloudinaryModuleAsyncOptions): DynamicModule {
    return {
      module: CloudinaryModule,

      // Import necessary modules (ConfigModule, etc.)
      imports: options.imports || [],

      providers: [
        // Provide options from factory function
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

**NestJS DynamicModule pattern:**

- **forRoot():** Fixed value, used once at the root module
- **forRootAsync():** Value from factory (usually environment variables)
- **providers:** All injectables (services, factories, values)
- **exports:** What is exported for use by other modules

**Why this pattern:**

- **Dependency Injection:** NestJS manages the lifecycle of all dependencies
- **Decoupling:** MenuItemService does not need to know how Cloudinary is configured
- **Reusability:** Many services can inject CloudinaryService

---

#### 📄 `__tests__/cloudinary.service.spec.ts` — Unit tests

**Purpose:** Test CloudinaryService (TDD).

```typescript
describe('CloudinaryService', () => {
// 9 test cases cover all edge cases:

  it('should upload image successfully', async () => {
    // Arrange: mock buffer + Cloudinary SDK
    const buffer = Buffer.from('fake-image');

    // Act: uploadImage()
    const result = await service.uploadImage(buffer, {
      tenantId: 'tenant-001',
      folder: CloudinaryFolder.MENU,
      mimetype: 'image/png',
    });

    // Assert: verify URL + ID returned
    expect(result.secureUrl).toBeDefined();
    expect(result.publicId).toContain('tenant-001');
  });

  it('should reject file > 5MB', async () => {
// File is too large
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

    // Expect exception
    expect(() => uploadImage(largeBuffer, ...)).toThrow('File too large');
  });

  it('should reject invalid MIME type', async () => {
// PDF file (not image)
    expect(() => uploadImage(buffer, {
      mimetype: 'application/pdf'
    })).toThrow('MIME type not allowed');
  });

  it('should include tenant_id in folder path', async () => {
// Validate: folder path contains tenant_id
    const result = await uploadImage(..., {
      tenantId: 'tenant-001',
      folder: 'menu'
    });

    expect(result.publicId).toContain('tenant-001/menu');
  });

// ... 5 other tests: delete, URL transform, error handling
});
```

**Why TDD:**

- **Red-Green-Cyan:** Write test first (red), implement later (green), refactor (cyan)
- **Confidence:** Each green test = 1 feature that works correctly
- **Regression:** If you edit the code later, tests will catch errors

---

#### 📄 `src/index.ts` — Barrel exports

**Purpose:** Centralize all public exports.

```typescript
// Module
export { CloudinaryModule } from './lib/cloudinary.module';

// Service
export { CloudinaryService } from './lib/cloudinary.service';

// Constants
export {
  CLOUDINARY_INJECTION_TOKEN,
  CLOUDINARY_MODULE_OPTIONS,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  BASE_FOLDER,
  CloudinaryFolder,
} from './lib/cloudinary.constants';

// Interfaces
export type {
  CloudinaryModuleOptions,
  CloudinaryModuleAsyncOptions,
  UploadImageOptions,
  UrlTransformOptions,
} from './lib/interfaces/cloudinary-options.interface';

export type { CloudinaryUploadResponse, ResponsiveUrls } from './lib/interfaces/cloudinary-response.interface';
```

**Why this pattern:**

- **Clean API:** Import via alias `@common/providers/cloudinary/*` instead of pointing directly to `libs/providers/cloudinary/src/lib/...`
- **Encapsulation:** Hides internal structure, only exposes public API
- **Single entry point:** Developer knows where to import

---

### Diagram of interactions between files

```
CatalogModule imports CloudinaryModule
            │
            ▼
CloudinaryModule.forRootAsync(config)
            │
            ├─→ cloudinary.constants.ts (CLOUDINARY_MODULE_OPTIONS token)
            │
            ├─→ cloudinary.config.ts (validate config)
            │
            ├─→ cloudinary.provider.ts (create cloudinary.v2 instance)
            │
            ├─→ cloudinary.service.ts (business logic)
            │   └─→ cloudinary-options.interface.ts (type hints)
            │   └─→ cloudinary-response.interface.ts (return types)
            │
            └─→ exports CloudinaryService
                    │
                    ▼
        MenuItemService
        @Inject(CloudinaryService)
        → uploadImage(), deleteImage(), getOptimizedUrl()
```

### Dependency Injection chain

```
┌──────────────────────────────────────────┐
│  CatalogModule import CloudinaryModule   │
└────────────────┬─────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ CloudinaryModule   │ (DynamicModule)
│  .forRootAsync()   │ (receives env config)
        └────────┬───────────┘
                 │
        ┌────────▼───────────────────────────┐
        │ DI Tokens Provided:                │
│  - CLOUDINARY_MODULE_OPTIONS       │ (configuration object)
        │  - cloudinary.v2 (via provider)    │ (SDK instance)
        │  - CloudinaryService               │ (injectable service)
        └────────┬───────────────────────────┘
                 │
        ┌────────▼────────────────────┐
        │ CloudinaryService           │ (business logic)
        │  - uploadImage()            │
        │  - deleteImage()            │
        │  - getOptimizedUrl()        │
        └─────────────────────────────┘
```

### Main Interfaces

**`CloudinaryModuleOptions` — Configuration**

```typescript
interface CloudinaryModuleOptions {
  cloudName: string; // Cloudinary's cloud name
  apiKey: string; // API key (used to sign URL)
  apiSecret: string; // API secret (used to sign uploads)
}
```

**`UploadImageOptions` — Upload parameters**

```typescript
interface UploadImageOptions {
  tenantId: string; // Customer code that owns the image
  folder: CloudinaryFolder; // Enum: MENU | BRANDING | QR_EXPORTS
  fileName?: string; // Optional file name (auto UUID if omitted)
  mimetype: string; // MIME type (validate: jpeg/png/webp)
}
```

**`UrlTransformOptions` — Create responsive URLs**

```typescript
interface UrlTransformOptions {
  thumbnailWidth?: number; // Default 200px
  mediumWidth?: number; // Default 400px
  largeWidth?: number; // Default 800px
}
```

**Responses**

```typescript
interface CloudinaryUploadResponse {
  publicId: string; // Cloudinary public_id (used to delete)
  secureUrl: string; // HTTPS URL of uploaded image
  width: number; // Image width (pixels)
  height: number; // Image height (pixels)
  format: string; // File format (jpeg, png, webp)
  bytes: number; // Size (bytes)
}

interface ResponsiveUrls {
  thumbnail: string; // Width 200px
  medium: string; // Width 400px
  large: string; // Width 800px
  original: string; // The original image remains unchanged
}
```

---

## <a id="how-it-works"></a>6️⃣ Detailed operation logic

### Phase A: Upload photos

**Scenario:** Create a new menu item with an image

```
┌──────────────────────────────────────┐
│ 1. Client sends form │
│    POST /catalog/menu-items/upload   │
│ - name: "Beef Pho" │
│    - price: 50000                    │
│    - file: pho.png (3MB)             │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 2. BFF receives form │
│ - Middleware Multer separates data │
│ - Get tenantId from token │
│ - Call Catalog via TCP │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 3. Catalog Service                   │
│    - Validate: size ≤ 5MB? ✓         │
│    - Validate: MIME ok? ✓            │
│ - Call CloudinaryService.upload() │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 4. CloudinaryService                 │
│    - Stream buffer → Cloudinary API  │
│ - Get: URL + deletion ID + metadata │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 5. Catalog stored in DB │
│    INSERT MenuItem {                 │
│      name, price,                    │
│      image_url, cloudinary_public_id │
│    }                                 │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 6. Return 201 Created                │
│ ✅ Upload successful!             │
└──────────────────────────────────────┘
```

---

## <a id="usage"></a>7️⃣ How to use CloudinaryModule

### 7.1 Understand logic before coding

**Why is it designed like this:**

| Part                            | Explanation                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Does not save to hard drive** | If saving to hard drive: large file → slow I/O, easy to run out of space. Cloudinary: send directly → no leave → faster |
| **Save URL + Delete ID**        | URL used to display images; The ID is how Cloudinary knows which photos to delete                                       |
| **Do not save BLOB to DB**      | Large BLOB → slow query, slow backup. Small URL, fast query                                                             |
| **Validate before upload**      | Don't validate: bad files → waste of Cloudinary quota → cost                                                            |
| **Separate folders by tenant**  | Each customer has their own folder → safe, cannot view other photos                                                     |

---

### 7.2 Code: MenuItemService (Catalog)

**Current file:** `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts` uses `CloudinaryService`; `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts` only handles metadata/domains over TCP.

```typescript
import { Injectable } from '@nestjs/common';
import { CloudinaryService } from '@common/providers/cloudinary/cloudinary.service';
import { CloudinaryFolder } from '@common/providers/cloudinary/cloudinary.constants';
import { InjectRepository } from '@typeorm/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from '@common/entities';

@Injectable()
export class MenuItemService {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemRepo: Repository<MenuItem>,
    private cloudinaryService: CloudinaryService, // ← Inject CloudinaryService
  ) {}

  /**
   * Create NEW MenuItem with image
   *
   * Steps:
   * 1. Receive image buffer + information
   * 2. Upload photos to Cloudinary
   * 3. Save MenuItem + image URL to DB
   */
  async createWithImage(
    tenantId: string,
    data: { name: string; price: number },
    imageBuffer: Buffer,
    imageMimetype: string,
  ): Promise<MenuItem> {
    // Step 1️⃣: Upload photos to Cloudinary
    const uploadResponse = await this.cloudinaryService.uploadImage(imageBuffer, {
      tenantId, // Customer code → create separate folder
      folder: CloudinaryFolder.MENU, // Image type: 'menu'
      mimetype: imageMimetype,
    });

    // Step 2️⃣: Create MenuItem object
    const menuItem = this.menuItemRepo.create({
      tenant_id: tenantId,
      name: data.name,
      price: data.price,
      image_url: uploadResponse.secureUrl, // URL to display
      cloudinary_public_id: uploadResponse.publicId, // ID to delete
    });

    // Step 3️⃣: Save to DB
    return this.menuItemRepo.save(menuItem);
  }

  /**
   * Updated MenuItem's image
   *
   * Steps:
   * 1. Get the old MenuItem (with old image deletion ID)
   * 2. Delete old photos from Cloudinary
   * 3. Upload new photos
   * 4. Update DB
   */
  async updateImage(
    tenantId: string,
    menuItemId: string,
    newImageBuffer: Buffer,
    newImageMimetype: string,
  ): Promise<MenuItem> {
    // Get the old MenuItem
    const item = await this.menuItemRepo.findOne({
      where: { id: menuItemId, tenant_id: tenantId },
    });

    if (!item) {
      throw new NotFoundException(`MenuItem ${menuItemId} not found`);
    }

    // Delete old photos
    if (item.cloudinary_public_id) {
      await this.cloudinaryService.deleteImage(
        item.cloudinary_public_id,
        tenantId, // Validate: only delete this tenant's image
      );
    }

    // Upload new photo
    const newUploadResponse = await this.cloudinaryService.uploadImage(newImageBuffer, {
      tenantId,
      folder: CloudinaryFolder.MENU,
      mimetype: newImageMimetype,
    });

    // Update DB
    item.image_url = newUploadResponse.secureUrl;
    item.cloudinary_public_id = newUploadResponse.publicId;

    return this.menuItemRepo.save(item);
  }

  /**
   * Get menu to display (with optimized image URL)
   *
   * Why is it necessary to optimize URLs?
   * - Mobile: 200px photo required (fast loading)
   * - Desktop: requires 800px image (details)
   * - CloudinaryService generates 3 optimized URLs
   */
  async getMenuWithImages(tenantId: string): Promise<Array<MenuItem & { responsive_images: object }>> {
    const items = await this.menuItemRepo.find({
      where: {
        tenant_id: tenantId,
        deleted_at: IsNull(), // Only items are alive
      },
    });

    // Create optimal URLs from 1 root URL → 3 URLs for different sizes
    return items.map((item) => ({
      ...item,
      responsive_images: this.cloudinaryService.getOptimizedUrl(item.image_url),
    }));
  }
}
```

**Partial explanation:**

| Code part                                       | Meaning                                                       |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `cloudinaryService: CloudinaryService`          | Get Cloudinary service → use to upload/delete photos          |
| `tenant_id: tenantId`                           | Required: each item is associated with a customer → security  |
| `cloudinary_public_id: uploadResponse.publicId` | Save ID to delete photos later (Cloudinary needs ID, not URL) |
| `if (item.cloudinary_public_id)`                | If there are no old photos → no need to delete                |
| `deleted_at: IsNull()`                          | Get items that have not been soft-delete                      |

---

### 7.3 Code: Controller (BFF)

**File: `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`**

```typescript
import { Controller, Post, Put, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { CurrentUser } from '@common/decorators';
import { UserGuard, TenantGuard, PermissionGuard } from '@common/guards';
import { MenuItemService } from './menu-item.service';

@Controller('catalog/menu-items')
export class MenuItemController {
  constructor(private menuItemService: MenuItemService) {}

  /**
   * Endpoint: POST /catalog/menu-items/upload
   * Purpose: Create menu items with photos
   *
   * Guards:
   * - UserGuard: token authentication
   * - TenantGuard: client authentication
   * - PermissionGuard: check CATALOG_CREATE permission
   *
   * Data: multipart/form-data
   * - name: "Beef Pho"
   *   - price: 50000
   * - file: <image>
   */
  @Post('upload')
  @UseGuards(UserGuard, TenantGuard, PermissionGuard)
  @Permissions('CATALOG_CREATE')
  async uploadWithImage(@CurrentUser() user, @Body() dto: CreateMenuItemDto, @FileUpload() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.menuItemService.createWithImage(
      user.tenantId,
      { name: dto.name, price: dto.price },
      file.buffer, // Image data (bytes)
      file.mimetype, // File type
    );
  }

  /**
   * Endpoint: PUT /catalog/menu-items/:id/image
   * Purpose: Update menu item images
   */
  @Put(':id/image')
  @UseGuards(UserGuard, TenantGuard, PermissionGuard)
  @Permissions('CATALOG_UPDATE')
  async updateImage(@CurrentUser() user, @Param('id') menuItemId: string, @FileUpload() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.menuItemService.updateImage(user.tenantId, menuItemId, file.buffer, file.mimetype);
  }
}
```

---

### 7.4 Configuration: Multer Middleware (BFF)

**Problem:** How does BFF receive files from the upload form?

→ Duong **Multer** (middleware parse multipart/form data)

**File: `apps/bff/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import * as fileUpload from 'express-fileupload';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================================
  // 1️⃣ Increase capacity limit
  // ============================================
  // By default, BFF only receives 100KB → too small
  // Increase to 20MB → allow 5MB upload
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  // ============================================
  // 2️⃣ Multer configuration: parse file upload
  // ============================================
  app.use(
    fileUpload({
      // File size limit (maximum 5MB)
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },

      // Storage: to RAM (memory), NOT hard drive
      // Reason: does not save to disk → faster
      //send directly to Cloudinary
      storage: memoryStorage(),

      // Validate file type (only accept images)
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (allowed.includes(file.mimetype)) {
          cb(null, true); // Accept
        } else {
          // Reject → client receives 400 Bad Request
          cb(new Error(`Invalid file type: ${file.mimetype}`), false);
        }
      },
    }),
  );

  await app.listen(3000);
}

bootstrap();
```

**Why is the configuration like this:**

| Configuration     | Explanation                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `limits: 5MB`     | CloudinaryModule supports maximum 5MB → match with backend                   |
| `memory storage`  | Does not save hard drive → fast + saves space → sends directly to Cloudinary |
| `fileFilter MIME` | Validate first → if wrong → reject immediately → don't waste Cloudinary      |
| `json limit 20MB` | Increase JSON limit to cover 5MB upload                                      |

---

### 7.5 Practical example: Error handling

**Scenario 1:** Upload PDF file (not image)

```
Client sends: POST /catalog/menu-items/upload
- file: document.pdf (3MB)
           │
           ▼
Multer fileFilter checks
- "application/pdf" is in the list? NO ❌
           │
           ▼
BFF returns: 400 Bad Request
"Invalid file type: application/pdf"
           │
           ▼
✅ Files are NOT uploaded to Cloudinary
(save quota capacity)
```

**Scenario 2:** File is too large (10MB > 5MB limit)

```
File size: 10MB (over limit)
           │
           ▼
Multer limits check → size > 5MB
           │
           ▼
Error: "File is too large. Maximum 5MB"
           │
           ▼
CloudinaryService is NOT called ✅
```

---

### 7.6 Example Request/Response

**Request: POST /catalog/menu-items/upload**

```bash
curl -X POST http://localhost:3000/catalog/menu-items/upload \
  -H "Authorization: Bearer TOKEN_USER" \
  -H "X-Tenant-ID: tenant-001" \
-F "name=Beef Pho" \
  -F "price=50000" \
  -F "file=@pho.png"
```

**Response: 201 Created**

```json
{
  "data": {
    "id": "item-001",
    "tenant_id": "tenant-001",
    "name": "Beef Pho",
    "price": 50000,
    "image_url": "https://res.cloudinary.com/qrtable/image/upload/v123/qrtable/tenant-001/menu/uuid-abc.png",
    "cloudinary_public_id": "qrtable/tenant-001/menu/uuid-abc",
    "created_at": "2026-04-09T15:00:00Z"
  },
  "message": "Menu item added successfully",
  "statusCode": 201,
  "duration": "2.3s"
}
```

**Response: 400 files are too large**

```json
{
  "statusCode": 400,
  "message": "File is too large. Maximum 5MB",
  "error": "Bad Request"
}
```

---

## <a id="integration-catalog"></a>8️⃣ Integrate with Step 1.5 Catalog service

### Overview architecture

```
Step 1.5 — Catalog service uses CloudinaryModule:

┌─────────────────────────────────────────────┐
│  Catalog Service (apps/catalog)             │
├─────────────────────────────────────────────┤
│ Modules:                                    │
│  - CategoryModule                           │
│  - MenuItemModule (uses CloudinaryService)
│  - AreaModule                               │
│  - TableModule                              │
│  - CloudinaryModule (forRootAsync)          │
│                                             │
│ DB Entities:                                │
│  - Category { id, name, tenant_id, ... }   │
│  - MenuItem {                              │
│      id, category_id,                      │
│      image_url (← Cloudinary URL)          │
│ cloudinary_public_id (← to delete) │
│      tenant_id, ...                        │
│    }                                        │
│  - Area { id, tenant_id, ... }              │
│  - Table { id, area_id, tenant_id, ... }   │
└─────────────────────────────────────────────┘
```

---

## <a id="multi-tenant"></a>9️⃣ Multi-tenant directory structure

### Folder convention

```
Cloudinary Cloud Storage:

qrtable/
├── {tenant-001}/
│   ├── menu/
│   │   ├── item-abc123.png
│   │   ├── item-xyz789.png
│   │   └── ...
│   ├── branding/
│   │   ├── logo-main.png
│   │   └── ...
│   └── qr-exports/
│       ├── qr-table-1.png
│       └── ...
├── {tenant-002}/
│   ├── menu/
│   │   └── ...
│   ├── branding/
│   │   └── ...
│   └── qr-exports/
│       └── ...
└── ...
```

---

## <a id="troubleshooting"></a>🔟 Error Handling & Troubleshooting

### Common errors

| Error                             | Cause                     | Solution                                 |
| --------------------------------- | ------------------------- | ---------------------------------------- |
| `CLOUDINARY_CLOUD_NAME not found` | Env var missing           | Check `.env.local`                       |
| `Unauthorized: invalid api_key`   | Incorrect/expired API Key | Regenerate from Account Settings         |
| `[413] Payload Too Large`         | File > 5MB                | Increase BFF body limit or decrease file |
| `MIME type not supported`         | File is not jpeg/png/webp | Validate client before upload            |

---

## <a id="best-practices"></a>1️⃣1️⃣ Best practices

### 1. Security

✅ ** SHOULD DO: **

- Save API Secret in `.env` (DO NOT commit)
- Validate MIME type + size before upload
- Use tenant ID in folder path
- Use signed upload (control backend)

❌ **DON'T:**

- Tell the client the API Secret
- Accept all file types
- Skip tenant validation
- Use unsigned upload

### 2. Performance

✅ ** SHOULD DO: **

- Use CloudinaryService.getOptimizedUrl() for responsiveness
- Cache JSON menu in Redis (TTL 10 minutes)
- Use Cloudinary CDN (automatically)
- Stream upload (RAM only)

❌ **DON'T:**

- Download the image and save it locally
- Generate all server-side sizes
- Upload without validation
- Serves original photos

### 3. Multi-Tenant

✅ ** SHOULD DO: **

- Include tenant_id in upload folder path
- Validate tenant_id in deleteImage()
- Index: `(tenant_id, cloudinary_public_id)`

❌ **DON'T:**

- Save raw URL without tenant isolation
- Delete without validating tenant

### 4. Database

✅ ** SHOULD DO: **

- Save `cloudinary_public_id` + `image_url`
- Soft-delete items (keep for audit)

❌ **DON'T:**

- Save URL only (cannot delete later)
- Hard-delete DB before Cloudinary confirms

---

## ✅ Checklist: Step 1.5 Integration

- [ ] Install CloudinaryModule in CatalogModule
- [ ] Inject CloudinaryService into MenuItemService
- [ ] Create MenuItem entity with columns
- [ ] Implement createWithImage()
- [ ] Implement updateImage()
- [ ] Implement getMenuWithImages()
- [ ] BFF POST endpoint with Multer
- [ ] BFF PUT endpoint with Multer
- [ ] Cache GET /menu in Redis
- [ ] Invalidate cache
- [ ] Test: upload, delete, responsive URLs

---

**Update:** 2026-04-09 · **Status:** ✅ Step 1.45 COMPLETED
