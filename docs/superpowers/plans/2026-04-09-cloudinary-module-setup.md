# Step 1.45 — CloudinaryModule Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a shared CloudinaryModule in `libs/providers/cloudinary/` that any NestJS microservice can import for tenant-isolated image upload, deletion, and optimized URL generation.

**Architecture:** NestJS DynamicModule (`forRoot`/`forRootAsync`) wrapping the Cloudinary Node.js SDK v2. File validation (5MB, image types) and tenant folder routing are built into the service. URL generation is pure string construction with zero API calls.

**Tech Stack:** NestJS 10, Cloudinary SDK v2, Jest (unit tests with mocked SDK), class-validator, uuid

**Design Spec:** `docs/superpowers/specs/2026-04-09-cloudinary-module-setup-design.md`

---

## File Map

### Files to Create

| File                                                                            | Responsibility                                |
| ------------------------------------------------------------------------------- | --------------------------------------------- |
| `libs/providers/cloudinary/project.json`                                        | Nx project config                             |
| `libs/providers/cloudinary/tsconfig.json`                                       | Base TS config                                |
| `libs/providers/cloudinary/tsconfig.lib.json`                                   | Lib compilation config                        |
| `libs/providers/cloudinary/tsconfig.spec.json`                                  | Test compilation config                       |
| `libs/providers/cloudinary/jest.config.cts`                                     | Jest config                                   |
| `libs/providers/cloudinary/eslint.config.mjs`                                   | ESLint config                                 |
| `libs/providers/cloudinary/src/index.ts`                                        | Public barrel exports                         |
| `libs/providers/cloudinary/src/lib/cloudinary.constants.ts`                     | Injection tokens, folder enum, size limits    |
| `libs/providers/cloudinary/src/lib/interfaces/cloudinary-options.interface.ts`  | Module config + upload options interfaces     |
| `libs/providers/cloudinary/src/lib/interfaces/cloudinary-response.interface.ts` | Upload response + responsive URLs types       |
| `libs/providers/cloudinary/src/lib/cloudinary.config.ts`                        | Configuration class (env validation)          |
| `libs/providers/cloudinary/src/lib/cloudinary.provider.ts`                      | Cloudinary SDK instance factory provider      |
| `libs/providers/cloudinary/src/lib/cloudinary.service.ts`                       | Upload, delete, URL generation business logic |
| `libs/providers/cloudinary/src/lib/cloudinary.module.ts`                        | NestJS DynamicModule (forRoot/forRootAsync)   |
| `libs/providers/cloudinary/src/lib/__tests__/cloudinary.service.spec.ts`        | 11 unit tests                                 |

### Files to Modify

| File                 | Change                                                                     |
| -------------------- | -------------------------------------------------------------------------- |
| `tsconfig.base.json` | Add `@common/providers/cloudinary/*` path alias                            |
| `.env.example`       | Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| `package.json`       | Add `cloudinary` dependency                                                |

---

## Task 1: Install Cloudinary dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install cloudinary SDK**

```bash
cd /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order
pnpm add cloudinary
```

- [ ] **Step 2: Verify installation**

```bash
node -e "const c = require('cloudinary'); console.log('cloudinary version:', c.v2 ? 'v2 OK' : 'FAIL')"
```

Expected: `cloudinary version: v2 OK`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add cloudinary SDK dependency"
```

---

## Task 2: Scaffold Nx lib structure + config files

**Files:**

- Create: `libs/providers/cloudinary/project.json`
- Create: `libs/providers/cloudinary/tsconfig.json`
- Create: `libs/providers/cloudinary/tsconfig.lib.json`
- Create: `libs/providers/cloudinary/tsconfig.spec.json`
- Create: `libs/providers/cloudinary/jest.config.cts`
- Create: `libs/providers/cloudinary/eslint.config.mjs`
- Create: `libs/providers/cloudinary/src/index.ts` (placeholder)
- Modify: `tsconfig.base.json`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p libs/providers/cloudinary/src/lib/interfaces
mkdir -p libs/providers/cloudinary/src/lib/__tests__
```

- [ ] **Step 2: Create project.json**

Create `libs/providers/cloudinary/project.json`:

```json
{
  "name": "providers-cloudinary",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/providers/cloudinary/src",
  "projectType": "library",
  "tags": ["scope:shared", "type:provider"],
  "// targets": "to see all targets run: nx show project providers-cloudinary --web",
  "targets": {
    "test": {
      "options": {
        "passWithNoTests": true
      }
    }
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

Create `libs/providers/cloudinary/tsconfig.json`:

```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "importHelpers": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  },
  "files": [],
  "include": [],
  "references": [
    {
      "path": "./tsconfig.lib.json"
    },
    {
      "path": "./tsconfig.spec.json"
    }
  ]
}
```

- [ ] **Step 4: Create tsconfig.lib.json**

Create `libs/providers/cloudinary/tsconfig.lib.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "types": ["node"],
    "target": "es2021",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["jest.config.ts", "jest.config.cts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

- [ ] **Step 5: Create tsconfig.spec.json**

Create `libs/providers/cloudinary/tsconfig.spec.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "module": "commonjs",
    "moduleResolution": "node10",
    "types": ["jest", "node"]
  },
  "include": ["jest.config.ts", "jest.config.cts", "src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

- [ ] **Step 6: Create jest.config.cts**

Create `libs/providers/cloudinary/jest.config.cts`:

```javascript
module.exports = {
  displayName: 'providers-cloudinary',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../coverage/libs/providers/cloudinary',
};
```

- [ ] **Step 7: Create eslint.config.mjs**

Create `libs/providers/cloudinary/eslint.config.mjs`:

```javascript
import baseConfig from '../../../eslint.config.mjs';

export default [...baseConfig];
```

- [ ] **Step 8: Create placeholder index.ts**

Create `libs/providers/cloudinary/src/index.ts`:

```typescript
// CloudinaryModule public API — populated in Task 8
```

- [ ] **Step 9: Add path alias to tsconfig.base.json**

Add this entry to `tsconfig.base.json` in `compilerOptions.paths`:

```json
"@common/providers/cloudinary/*": ["libs/providers/cloudinary/src/lib/*"]
```

Place it after the `@common/guards/*` entry.

- [ ] **Step 10: Verify Nx sees the project**

```bash
npx nx show project providers-cloudinary
```

Expected: Shows project config without error.

- [ ] **Step 11: Verify lint and test pass**

```bash
npx nx lint providers-cloudinary --fix && npx nx test providers-cloudinary
```

Expected: Both pass (test passes with no tests).

- [ ] **Step 12: Commit**

```bash
git add libs/providers/ tsconfig.base.json
git commit -m "chore: scaffold providers-cloudinary Nx lib structure"
```

---

## Task 3: Constants + Interfaces (foundation types)

**Files:**

- Create: `libs/providers/cloudinary/src/lib/cloudinary.constants.ts`
- Create: `libs/providers/cloudinary/src/lib/interfaces/cloudinary-options.interface.ts`
- Create: `libs/providers/cloudinary/src/lib/interfaces/cloudinary-response.interface.ts`

- [ ] **Step 1: Create cloudinary.constants.ts**

Create `libs/providers/cloudinary/src/lib/cloudinary.constants.ts`:

```typescript
export const CLOUDINARY_INJECTION_TOKEN = 'CLOUDINARY';
export const CLOUDINARY_MODULE_OPTIONS = 'CLOUDINARY_MODULE_OPTIONS';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const BASE_FOLDER = 'qrtable';

export const DEFAULT_THUMBNAIL_WIDTH = 200;
export const DEFAULT_MEDIUM_WIDTH = 400;
export const DEFAULT_LARGE_WIDTH = 800;

export enum CloudinaryFolder {
  MENU = 'menu',
  BRANDING = 'branding',
  QR_EXPORTS = 'qr-exports',
}
```

- [ ] **Step 2: Create cloudinary-options.interface.ts**

Create `libs/providers/cloudinary/src/lib/interfaces/cloudinary-options.interface.ts`:

```typescript
import { ModuleMetadata } from '@nestjs/common';
import { CloudinaryFolder } from '../cloudinary.constants';

export interface CloudinaryModuleOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<CloudinaryModuleOptions> | CloudinaryModuleOptions;
}

export interface UploadImageOptions {
  tenantId: string;
  folder: CloudinaryFolder;
  fileName?: string;
  mimetype: string;
}

export interface UrlTransformOptions {
  thumbnailWidth?: number;
  mediumWidth?: number;
  largeWidth?: number;
}
```

- [ ] **Step 3: Create cloudinary-response.interface.ts**

Create `libs/providers/cloudinary/src/lib/interfaces/cloudinary-response.interface.ts`:

```typescript
export interface CloudinaryUploadResponse {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface ResponsiveUrls {
  thumbnail: string;
  medium: string;
  large: string;
  original: string;
}
```

- [ ] **Step 4: Verify lint passes**

```bash
npx nx lint providers-cloudinary --fix
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add libs/providers/cloudinary/src/lib/cloudinary.constants.ts libs/providers/cloudinary/src/lib/interfaces/
git commit -m "feat(providers-cloudinary): add constants and interface definitions"
```

---

## Task 4: CloudinaryConfig + CloudinaryProvider (SDK factory)

**Files:**

- Create: `libs/providers/cloudinary/src/lib/cloudinary.config.ts`
- Create: `libs/providers/cloudinary/src/lib/cloudinary.provider.ts`

- [ ] **Step 1: Create cloudinary.config.ts**

Create `libs/providers/cloudinary/src/lib/cloudinary.config.ts`:

```typescript
import { IsNotEmpty, IsString } from 'class-validator';

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

  constructor(data?: Partial<CloudinaryConfiguration>) {
    this.CLOUD_NAME = data?.CLOUD_NAME || process.env['CLOUDINARY_CLOUD_NAME'] || '';
    this.API_KEY = data?.API_KEY || process.env['CLOUDINARY_API_KEY'] || '';
    this.API_SECRET = data?.API_SECRET || process.env['CLOUDINARY_API_SECRET'] || '';
  }
}
```

- [ ] **Step 2: Create cloudinary.provider.ts**

Create `libs/providers/cloudinary/src/lib/cloudinary.provider.ts`:

```typescript
import { Provider } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_INJECTION_TOKEN, CLOUDINARY_MODULE_OPTIONS } from './cloudinary.constants';
import { CloudinaryModuleOptions } from './interfaces/cloudinary-options.interface';

export const CloudinaryProvider: Provider = {
  provide: CLOUDINARY_INJECTION_TOKEN,
  useFactory: (options: CloudinaryModuleOptions) => {
    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
    });
    return cloudinary;
  },
  inject: [CLOUDINARY_MODULE_OPTIONS],
};
```

- [ ] **Step 3: Verify lint passes**

```bash
npx nx lint providers-cloudinary --fix
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add libs/providers/cloudinary/src/lib/cloudinary.config.ts libs/providers/cloudinary/src/lib/cloudinary.provider.ts
git commit -m "feat(providers-cloudinary): add configuration class and SDK provider factory"
```

---

## Task 5: CloudinaryService — write failing tests first

**Files:**

- Create: `libs/providers/cloudinary/src/lib/__tests__/cloudinary.service.spec.ts`

This task writes ALL 9 service test cases first (TDD red phase). The tests will fail because `CloudinaryService` does not exist yet.

- [ ] **Step 1: Write the complete test file**

Create `libs/providers/cloudinary/src/lib/__tests__/cloudinary.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CloudinaryService } from '../cloudinary.service';
import { CLOUDINARY_INJECTION_TOKEN } from '../cloudinary.constants';
import { CloudinaryFolder } from '../cloudinary.constants';
import { UploadImageOptions } from '../interfaces/cloudinary-options.interface';
import { Readable } from 'stream';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let mockCloudinary: {
    uploader: {
      upload_stream: jest.Mock;
      destroy: jest.Mock;
    };
    url: jest.Mock;
  };

  const mockUploadResult = {
    public_id: 'qrtable/tenant-abc/menu/test-image',
    secure_url: 'https://res.cloudinary.com/demo/image/upload/qrtable/tenant-abc/menu/test-image.jpg',
    width: 800,
    height: 600,
    format: 'jpg',
    bytes: 102400,
  };

  beforeEach(async () => {
    mockCloudinary = {
      uploader: {
        upload_stream: jest.fn(),
        destroy: jest.fn(),
      },
      url: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: CLOUDINARY_INJECTION_TOKEN,
          useValue: mockCloudinary,
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  describe('uploadImage', () => {
    const validOptions: UploadImageOptions = {
      tenantId: 'tenant-abc',
      folder: CloudinaryFolder.MENU,
      mimetype: 'image/jpeg',
    };

    it('should upload successfully and return CloudinaryUploadResponse', async () => {
      const fileBuffer = Buffer.alloc(1024, 'a');

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (_options: unknown, callback: (error: Error | null, result: typeof mockUploadResult) => void) => {
          callback(null, mockUploadResult);
          const writable = new Readable();
          writable.push(null);
          return writable;
        },
      );

      const result = await service.uploadImage(fileBuffer, validOptions);

      expect(result).toEqual({
        publicId: 'qrtable/tenant-abc/menu/test-image',
        secureUrl: 'https://res.cloudinary.com/demo/image/upload/qrtable/tenant-abc/menu/test-image.jpg',
        width: 800,
        height: 600,
        format: 'jpg',
        bytes: 102400,
      });
    });

    it('should throw BadRequestException when file exceeds 5MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

      await expect(service.uploadImage(largeBuffer, validOptions)).rejects.toThrow(BadRequestException);

      await expect(service.uploadImage(largeBuffer, validOptions)).rejects.toThrow('File size exceeds 5MB limit');
    });

    it('should throw BadRequestException for invalid MIME type', async () => {
      const fileBuffer = Buffer.alloc(1024, 'a');
      const invalidOptions: UploadImageOptions = {
        ...validOptions,
        mimetype: 'application/pdf',
      };

      await expect(service.uploadImage(fileBuffer, invalidOptions)).rejects.toThrow(BadRequestException);

      await expect(service.uploadImage(fileBuffer, invalidOptions)).rejects.toThrow(
        'Invalid file type. Allowed: jpeg, png, webp',
      );
    });

    it('should upload to the correct tenant folder path', async () => {
      const fileBuffer = Buffer.alloc(1024, 'a');

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (_options: unknown, callback: (error: Error | null, result: typeof mockUploadResult) => void) => {
          callback(null, mockUploadResult);
          const writable = new Readable();
          writable.push(null);
          return writable;
        },
      );

      await service.uploadImage(fileBuffer, validOptions);

      const uploadCallOptions = mockCloudinary.uploader.upload_stream.mock.calls[0][0];
      expect(uploadCallOptions.folder).toBe('qrtable/tenant-abc/menu');
    });

    it('should throw InternalServerErrorException when Cloudinary SDK fails', async () => {
      const fileBuffer = Buffer.alloc(1024, 'a');

      mockCloudinary.uploader.upload_stream.mockImplementation(
        (_options: unknown, callback: (error: Error | null, result: null) => void) => {
          callback(new Error('Cloudinary SDK error'), null);
          const writable = new Readable();
          writable.push(null);
          return writable;
        },
      );

      await expect(service.uploadImage(fileBuffer, validOptions)).rejects.toThrow(InternalServerErrorException);

      await expect(service.uploadImage(fileBuffer, validOptions)).rejects.toThrow('Image upload failed');
    });
  });

  describe('deleteImage', () => {
    it('should delete successfully', async () => {
      mockCloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      await expect(service.deleteImage('qrtable/tenant-abc/menu/test-image')).resolves.toBeUndefined();

      expect(mockCloudinary.uploader.destroy).toHaveBeenCalledWith('qrtable/tenant-abc/menu/test-image');
    });

    it('should not throw when image does not exist (idempotent)', async () => {
      mockCloudinary.uploader.destroy.mockResolvedValue({ result: 'not found' });

      await expect(service.deleteImage('qrtable/tenant-abc/menu/nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('getOptimizedUrl', () => {
    it('should return 4 responsive URL strings', () => {
      mockCloudinary.url.mockImplementation((publicId: string, options: Record<string, unknown>) => {
        const parts = [`https://res.cloudinary.com/demo/image/upload`];
        if (options['width']) parts.push(`w_${options['width']}`);
        if (options['crop']) parts.push(`c_${options['crop']}`);
        parts.push(`f_auto,q_auto`);
        parts.push(publicId);
        return parts.join('/');
      });

      const result = service.getOptimizedUrl('qrtable/tenant-abc/menu/test-image');

      expect(result).toHaveProperty('thumbnail');
      expect(result).toHaveProperty('medium');
      expect(result).toHaveProperty('large');
      expect(result).toHaveProperty('original');
      expect(typeof result.thumbnail).toBe('string');
      expect(typeof result.medium).toBe('string');
      expect(typeof result.large).toBe('string');
      expect(typeof result.original).toBe('string');
    });

    it('should generate URLs with correct transformation parameters', () => {
      mockCloudinary.url.mockImplementation((publicId: string, options: Record<string, unknown>) => {
        return JSON.stringify({ publicId, ...options });
      });

      service.getOptimizedUrl('qrtable/tenant-abc/menu/test-image');

      // Verify thumbnail: w_200, c_fill
      const thumbnailCall = mockCloudinary.url.mock.calls[0];
      expect(thumbnailCall[1]).toMatchObject({
        width: 200,
        crop: 'fill',
        fetch_format: 'auto',
        quality: 'auto',
      });

      // Verify large: w_800, c_limit
      const largeCall = mockCloudinary.url.mock.calls[2];
      expect(largeCall[1]).toMatchObject({
        width: 800,
        crop: 'limit',
        fetch_format: 'auto',
        quality: 'auto',
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx nx test providers-cloudinary
```

Expected: FAIL — `Cannot find module '../cloudinary.service'`

- [ ] **Step 3: Commit**

```bash
git add libs/providers/cloudinary/src/lib/__tests__/
git commit -m "test(providers-cloudinary): add 9 failing unit tests for CloudinaryService (TDD red)"
```

---

## Task 6: CloudinaryService — implement to make tests pass

**Files:**

- Create: `libs/providers/cloudinary/src/lib/cloudinary.service.ts`

- [ ] **Step 1: Write CloudinaryService implementation**

Create `libs/providers/cloudinary/src/lib/cloudinary.service.ts`:

```typescript
import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinaryType } from 'cloudinary';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import {
  ALLOWED_MIME_TYPES,
  BASE_FOLDER,
  CLOUDINARY_INJECTION_TOKEN,
  DEFAULT_LARGE_WIDTH,
  DEFAULT_MEDIUM_WIDTH,
  DEFAULT_THUMBNAIL_WIDTH,
  MAX_FILE_SIZE,
} from './cloudinary.constants';
import { UploadImageOptions, UrlTransformOptions } from './interfaces/cloudinary-options.interface';
import { CloudinaryUploadResponse, ResponsiveUrls } from './interfaces/cloudinary-response.interface';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject(CLOUDINARY_INJECTION_TOKEN)
    private readonly cloudinary: typeof cloudinaryType,
  ) {}

  async uploadImage(file: Buffer, options: UploadImageOptions): Promise<CloudinaryUploadResponse> {
    this.validateFile(file, options.mimetype);

    const folder = `${BASE_FOLDER}/${options.tenantId}/${options.folder}`;
    const publicId = options.fileName || uuidv4();

    try {
      const result = await this.uploadToCloudinary(file, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        format: 'auto',
        quality: 'auto',
        transformation: [{ width: DEFAULT_LARGE_WIDTH, crop: 'limit' }],
      });

      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Upload failed: ${(error as Error).message}`);
      throw new InternalServerErrorException('Image upload failed');
    }
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await this.cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.warn(`Unexpected delete result for ${publicId}: ${result.result}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete image ${publicId}: ${(error as Error).message}`);
    }
  }

  getOptimizedUrl(publicId: string, options?: UrlTransformOptions): ResponsiveUrls {
    const thumbnailWidth = options?.thumbnailWidth ?? DEFAULT_THUMBNAIL_WIDTH;
    const mediumWidth = options?.mediumWidth ?? DEFAULT_MEDIUM_WIDTH;
    const largeWidth = options?.largeWidth ?? DEFAULT_LARGE_WIDTH;

    return {
      thumbnail: this.cloudinary.url(publicId, {
        width: thumbnailWidth,
        crop: 'fill',
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      }),
      medium: this.cloudinary.url(publicId, {
        width: mediumWidth,
        crop: 'limit',
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      }),
      large: this.cloudinary.url(publicId, {
        width: largeWidth,
        crop: 'limit',
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      }),
      original: this.cloudinary.url(publicId, {
        fetch_format: 'auto',
        quality: 'auto',
        secure: true,
      }),
    };
  }

  private validateFile(buffer: Buffer, mimetype: string): void {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    if (!ALLOWED_MIME_TYPES.includes(mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new BadRequestException('Invalid file type. Allowed: jpeg, png, webp');
    }
  }

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
      const uploadStream = this.cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) {
          reject(new InternalServerErrorException('Image upload failed'));
        } else if (result) {
          resolve(result);
        } else {
          reject(new InternalServerErrorException('Image upload failed'));
        }
      });

      const readableStream = Readable.from(buffer);
      readableStream.pipe(uploadStream);
    });
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx nx test providers-cloudinary
```

Expected: 9 tests PASS.

- [ ] **Step 3: Run lint**

```bash
npx nx lint providers-cloudinary --fix
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add libs/providers/cloudinary/src/lib/cloudinary.service.ts
git commit -m "feat(providers-cloudinary): implement CloudinaryService (TDD green)"
```

---

## Task 7: CloudinaryModule (DynamicModule)

**Files:**

- Create: `libs/providers/cloudinary/src/lib/cloudinary.module.ts`

- [ ] **Step 1: Write CloudinaryModule**

Create `libs/providers/cloudinary/src/lib/cloudinary.module.ts`:

```typescript
import { DynamicModule, Module } from '@nestjs/common';
import { CLOUDINARY_MODULE_OPTIONS } from './cloudinary.constants';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryModuleAsyncOptions, CloudinaryModuleOptions } from './interfaces/cloudinary-options.interface';

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

- [ ] **Step 2: Add module integration tests to the existing test file**

Append to `libs/providers/cloudinary/src/lib/__tests__/cloudinary.service.spec.ts`, after the last `describe` block but still inside the file:

Add a new describe block at the end of the file (before the final closing brace of the outer describe, or as a separate top-level describe):

Create a new test file `libs/providers/cloudinary/src/lib/__tests__/cloudinary.module.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { CloudinaryModule } from '../cloudinary.module';
import { CloudinaryService } from '../cloudinary.service';

describe('CloudinaryModule', () => {
  it('should provide CloudinaryService via forRoot()', async () => {
    const module = await Test.createTestingModule({
      imports: [
        CloudinaryModule.forRoot({
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        }),
      ],
    }).compile();

    const service = module.get<CloudinaryService>(CloudinaryService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CloudinaryService);
  });

  it('should provide CloudinaryService via forRootAsync()', async () => {
    const module = await Test.createTestingModule({
      imports: [
        CloudinaryModule.forRootAsync({
          useFactory: () => ({
            cloudName: 'test-cloud',
            apiKey: 'test-key',
            apiSecret: 'test-secret',
          }),
        }),
      ],
    }).compile();

    const service = module.get<CloudinaryService>(CloudinaryService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(CloudinaryService);
  });
});
```

- [ ] **Step 3: Run all tests**

```bash
npx nx test providers-cloudinary
```

Expected: 11 tests PASS (9 service + 2 module).

- [ ] **Step 4: Run lint**

```bash
npx nx lint providers-cloudinary --fix
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add libs/providers/cloudinary/src/lib/cloudinary.module.ts libs/providers/cloudinary/src/lib/__tests__/cloudinary.module.spec.ts
git commit -m "feat(providers-cloudinary): implement CloudinaryModule with forRoot/forRootAsync"
```

---

## Task 8: Barrel exports + env vars

**Files:**

- Modify: `libs/providers/cloudinary/src/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Update barrel exports**

Replace `libs/providers/cloudinary/src/index.ts` with:

```typescript
export { CloudinaryModule } from './lib/cloudinary.module';
export { CloudinaryService } from './lib/cloudinary.service';
export { CloudinaryConfiguration } from './lib/cloudinary.config';
export {
  CloudinaryFolder,
  CLOUDINARY_INJECTION_TOKEN,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  BASE_FOLDER,
} from './lib/cloudinary.constants';
export type {
  CloudinaryModuleOptions,
  CloudinaryModuleAsyncOptions,
  UploadImageOptions,
  UrlTransformOptions,
} from './lib/interfaces/cloudinary-options.interface';
export type { CloudinaryUploadResponse, ResponsiveUrls } from './lib/interfaces/cloudinary-response.interface';
```

- [ ] **Step 2: Update .env.example**

Append these lines to `.env.example`:

```env

# Cloudinary (image upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- [ ] **Step 3: Verify import works**

```bash
node -e "
const ts = require('typescript');
const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.base.json');
console.log(configPath ? 'tsconfig OK' : 'tsconfig NOT FOUND');
const config = JSON.parse(require('fs').readFileSync('tsconfig.base.json', 'utf-8'));
const alias = config.compilerOptions.paths['@common/providers/cloudinary/*'];
console.log('Path alias:', alias ? alias[0] : 'NOT FOUND');
"
```

Expected: `tsconfig OK` and `Path alias: libs/providers/cloudinary/src/lib/*`

- [ ] **Step 4: Run lint and test**

```bash
npx nx lint providers-cloudinary --fix && npx nx test providers-cloudinary
```

Expected: Both pass.

- [ ] **Step 5: Commit**

```bash
git add libs/providers/cloudinary/src/index.ts .env.example
git commit -m "feat(providers-cloudinary): add barrel exports and env var template"
```

---

## Task 9: Final verification + cleanup

- [ ] **Step 1: Run lint across the full lib**

```bash
npx nx lint providers-cloudinary --fix
```

Expected: No errors.

- [ ] **Step 2: Run all tests with coverage**

```bash
npx nx test providers-cloudinary --coverage
```

Expected: 11 tests pass. Check coverage report for any untested branches.

- [ ] **Step 3: Verify no impact on other projects**

```bash
npx nx run-many -t lint --projects=bff,catalog,configuration --parallel=3
```

Expected: All pass — adding the new lib doesn't break anything.

- [ ] **Step 4: Final commit (if any fixups needed)**

```bash
git add -A
git commit -m "chore(providers-cloudinary): final cleanup and verification"
```

Only commit if there are staged changes. If nothing changed, skip this step.

- [ ] **Step 5: Verify git status is clean**

```bash
git --no-pager status
git --no-pager log --oneline -8
```

Expected: Working tree clean. Commits show the progression:

1. `chore: add cloudinary SDK dependency`
2. `chore: scaffold providers-cloudinary Nx lib structure`
3. `feat(providers-cloudinary): add constants and interface definitions`
4. `feat(providers-cloudinary): add configuration class and SDK provider factory`
5. `test(providers-cloudinary): add 9 failing unit tests for CloudinaryService (TDD red)`
6. `feat(providers-cloudinary): implement CloudinaryService (TDD green)`
7. `feat(providers-cloudinary): implement CloudinaryModule with forRoot/forRootAsync`
8. `feat(providers-cloudinary): add barrel exports and env var template`
