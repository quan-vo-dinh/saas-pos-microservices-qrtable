# Hướng Dẫn Setup & Sử Dụng Cloudinary — CloudinaryModule cho QRTable

> **Tài liệu này giải thích chi tiết cách setup Cloudinary, hiểu rõ logic hoạt động, và sử dụng CloudinaryModule đã được xây dựng ở Step 1.45.**
>
> **Current code status (2026-05-13):** Cloudinary module nằm tại `libs/providers/cloudinary/src/lib/*` và được BFF Catalog module sử dụng trực tiếp (`apps/bff/src/app/modules/catalog`). Catalog Service lưu metadata qua TCP, không upload file trực tiếp.

---

## 📌 Mục Lục

1. [Cloudinary là gì?](#overview)
2. [Tại sao chọn Cloudinary?](#why-cloudinary)
3. [Setup tài khoản Cloudinary](#account-setup)
4. [Cấu hình credentials trong dự án](#project-config)
5. [Kiến trúc của CloudinaryModule](#architecture)
6. [Logic hoạt động chi tiết](#how-it-works)
7. [Cách sử dụng CloudinaryModule](#usage)
8. [Tích hợp với Step 1.5 Catalog Service](#integration-catalog)
9. [Cấu trúc thư mục multi-tenant](#multi-tenant)
10. [Xử lý lỗi & Gỡ rối](#troubleshooting)
11. [Các best practice](#best-practices)

---

## <a id="overview"></a>1️⃣ Cloudinary là gì?

**Cloudinary** là một nền tảng **quản lý ảnh/video trên cloud** cung cấp:

- **Lưu trữ ảnh**: Lưu ảnh trên server của Cloudinary (không cần ổ cứng riêng)
- **Biến đổi ảnh**: Resize, crop, optimize, chuyển format real-time
- **CDN phục vụ**: Phục vụ ảnh qua mạng CDN toàn cầu (nhanh, được cache)
- **API upload**: Cung cấp API để upload/xóa ảnh từ backend

**Quy trình đơn giản:**

```
Client (Trình duyệt)
    ↓
Backend QRTable (BFF)
    ↓
CloudinaryModule (Upload stream)
    ↓
Cloudinary API
    ↓
Cloudinary CDN (Phục vụ ảnh + biến đổi)
    ↓
Client (Tải ảnh đã tối ưu)
```

---

## <a id="why-cloudinary"></a>2️⃣ Tại sao chọn Cloudinary?

### Vấn đề cần giải quyết:

1. **Lưu trữ ảnh ở đâu?**
   - Phương án A: Ổ cứng riêng → I/O chậm, dễ hết chỗ, khó scale
   - Phương án B: Database (BLOB) → chậm, tốn bộ nhớ
   - Phương án C: Cloud storage (S3/Cloudinary) → ✅ được chọn

2. **Phục vụ ảnh như thế nào?**
   - Cần resize tự động cho mobile/tablet/desktop
   - Cần optimize kích thước (giảm chất lượng JPEG, chuyển WebP)
   - Cần cache tại CDN để load nhanh

3. **Quản lý upload tách biệt theo khách hàng (tenant) thế nào?**
   - Mỗi khách hàng muốn ảnh của mình tách biệt
   - Không được xem/xóa ảnh của khách hàng khác
   - Cần audit trail (không thực sự xóa, chỉ soft-delete)

### So sánh các lựa chọn:

| Nhu cầu              | Cloudinary    | S3                | Ổ cứng local    |
| -------------------- | ------------- | ----------------- | --------------- |
| Upload API           | ✅ Dễ         | ⚠️ Cần config     | ❌ Không có     |
| Resize on-the-fly    | ✅ URL params | ❌ Pre-generate   | ❌ Không có     |
| CDN built-in         | ✅ Có         | ❌ Cần CloudFront | ❌ Không có     |
| Multi-tenant folders | ✅ Hỗ trợ     | ✅ Hỗ trợ         | ✅ Hỗ trợ       |
| Chi phí (dự án nhỏ)  | ✅ Free tier  | ⚠️ Có phí         | ✅ Miễn phí     |
| Dễ setup             | ✅ Đơn giản   | ❌ Phức tạp       | ✅ Rất đơn giản |

---

## <a id="account-setup"></a>3️⃣ Setup tài khoản Cloudinary

### Bước 1: Tạo tài khoản

1. Truy cập [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Đăng ký bằng email (hoặc GitHub/Google)
3. Verify email
4. Chọn "Create Account" → Chọn gói: **Free** (1GB/tháng, miễn phí)

### Bước 2: Lấy thông tin credentials

Sau khi login, vào **Account Settings** → **API Keys**:

```
Cloud Name:    your_cloud_name         (ví dụ: qrtable-staging)
API Key:       your_api_key            (ví dụ: 8271629847293...)
API Secret:    your_api_secret         (ví dụ: -9sH_Kx8sKd...)
```

**⚠️ QUAN TRỌNG:** API Secret là mật khẩu → lưu vào `.env`, KHÔNG commit lên Git!

### Bước 3: (Tùy chọn) Tạo Upload Presets

Vào **Upload** → **Upload Presets**:

- Tạo preset `signed` cho backend (yêu cầu signature)
- Tạo preset `unsigned` cho mobile client (tùy chọn, Phase 2)

CloudinaryModule mặc định dùng signed upload (backend kiểm soát).

---

## <a id="project-config"></a>4️⃣ Cấu hình credentials trong dự án

### 4.1 Cập nhật `.env.local` (Phát triển - không commit)

```bash
# .env.local (KHÔNG commit vào Git)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4.2 Cập nhật `.env.example` (Template - đã làm ở Task 8)

```bash
# .env.example (commit vào repo)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4.3 Load trong Catalog Service (Step 1.5)

**File: `apps/catalog/src/main.ts`**

```typescript
import { ConfigService } from '@nestjs/config';
import { CloudinaryModule } from '@common/providers/cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // Dùng forRootAsync để inject ConfigService
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

## <a id="architecture"></a>5️⃣ Kiến trúc của CloudinaryModule

### Cấu trúc thư mục

```
libs/providers/cloudinary/
├── src/lib/
│   ├── cloudinary.constants.ts         # Token keys, folder enums, giới hạn kích thước
│   ├── interfaces/
│   │   ├── cloudinary-options.interface.ts    # ModuleOptions, UploadOptions
│   │   └── cloudinary-response.interface.ts   # Response types
│   ├── cloudinary.config.ts            # Validate environment (class-validator)
│   ├── cloudinary.provider.ts          # SDK factory (cấu hình v2 instance)
│   ├── cloudinary.service.ts           # Business logic (upload, delete, URL gen)
│   ├── cloudinary.module.ts            # DynamicModule (forRoot, forRootAsync)
│   └── __tests__/
│       ├── cloudinary.service.spec.ts  # 9 unit tests
│       └── cloudinary.module.spec.ts   # 2 module tests
└── src/index.ts                        # Public barrel exports
```

### Giải thích chi tiết từng file

#### 📄 `cloudinary.constants.ts` — Các hằng số và enum

**Mục đích:** Tập trung tất cả các giá trị cố định, không thay đổi.

**Nội dung:**

```typescript
// Token DI (Dependency Injection) — NestJS dùng để đánh dấu các dependencies
export const CLOUDINARY_INJECTION_TOKEN = 'CLOUDINARY';
export const CLOUDINARY_MODULE_OPTIONS = 'CLOUDINARY_MODULE_OPTIONS';

// Giới hạn file — áp dụng trên CloudinaryService
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Thư mục gốc trên Cloudinary
export const BASE_FOLDER = 'qrtable';

// Kích thước tối ưu mặc định cho responsive images
export const DEFAULT_THUMBNAIL_WIDTH = 200; // Mobile
export const DEFAULT_MEDIUM_WIDTH = 400; // Tablet
export const DEFAULT_LARGE_WIDTH = 800; // Desktop

// Enum loại ảnh — giúp developer không bị nhầm lẫn loại thư mục
export enum CloudinaryFolder {
  MENU = 'menu', // Ảnh menu item
  BRANDING = 'branding', // Logo, banner
  QR_EXPORTS = 'qr-exports', // QR code
}
```

**Tại sao tách file này:**

- **Không lặp code:** Nếu MAX_FILE_SIZE thay đổi, chỉ cần sửa ở 1 chỗ
- **Dễ cấu hình:** Tất cả cài đặt ở 1 file dễ tìm
- **Type-safe enum:** Dùng `CloudinaryFolder.MENU` thay vì string `'menu'` → compiler sẽ bắt lỗi typo

---

#### 📄 `cloudinary-options.interface.ts` — Định nghĩa kiểu dữ liệu

**Mục đích:** TypeScript interfaces định nghĩa hình dạng dữ liệu truyền vào/ra.

**Nội dung:**

```typescript
// 1️⃣ Cấu hình module — truyền vào CloudinaryModule.forRootAsync()
interface CloudinaryModuleOptions {
  cloudName: string; // "qrtable-staging"
  apiKey: string; // "8271629847293..."
  apiSecret: string; // "-9sH_Kx8sKd..."
}

// 2️⃣ Cấu hình tùy chọn cho async initialization
// (NestJS pattern để inject dependencies vào factory)
interface CloudinaryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[]; // Dependencies để inject
  useFactory: (...args: any[]) => Promise<CloudinaryModuleOptions> | CloudinaryModuleOptions;
  // ^-- Hàm factory nhận dependencies, trả config
}

// 3️⃣ Tham số upload — truyền vào uploadImage()
interface UploadImageOptions {
  tenantId: string; // "tenant-001" — để tách biệt theo khách hàng
  folder: CloudinaryFolder; // MENU | BRANDING | QR_EXPORTS
  fileName?: string; // Tùy chọn, auto UUID nếu bỏ qua
  mimetype: string; // "image/png" — validate trước upload
}

// 4️⃣ Tùy chọn transform URL — truyền vào getOptimizedUrl()
interface UrlTransformOptions {
  thumbnailWidth?: number; // Override mặc định 200px
  mediumWidth?: number; // Override mặc định 400px
  largeWidth?: number; // Override mặc định 800px
}
```

**Tại sao có interface:**

- **Type safety:** TypeScript kiểm tra ở compile time → bắt lỗi sớm
- **IDE autocomplete:** Editor gợi ý các field khả dụng
- **Documentation:** Developer thấy rõ cần truyền cái gì

---

#### 📄 `cloudinary-response.interface.ts` — Kiểu phản hồi

**Mục đích:** Định nghĩa hình dạng dữ liệu trả về từ Cloudinary.

```typescript
// Kết quả upload ảnh lên Cloudinary
interface CloudinaryUploadResponse {
  publicId: string; // "qrtable/tenant-001/menu/uuid-123" — dùng để xóa
  secureUrl: string; // "https://res.cloudinary.com/..." — URL HTTPS
  width: number; // 1200 — chiều rộng ảnh gốc
  height: number; // 800 — chiều cao ảnh gốc
  format: string; // "png" — định dạng file
  bytes: number; // 3145728 — dung lượng (bytes)
}

// URLs tối ưu cho các kích thước khác nhau
interface ResponsiveUrls {
  thumbnail: string; // "...?w=200&..." — mobile size
  medium: string; // "...?w=400&..." — tablet size
  large: string; // "...?w=800&..." — desktop size
  original: string; // "..." — không thay đổi
}
```

**Tại sao riêng file:**

- **Tách concerns:** Cấu hình (input) ≠ Phản hồi (output)
- **Reuse:** Có thể dùng interface ở many places

---

#### 📄 `cloudinary.config.ts` — Validate cấu hình

**Mục đích:** Validate environment variables & cấu hình khi module khởi động.

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class CloudinaryConfiguration {
  @IsString()
  @IsNotEmpty()
  cloudName: string; // Validate: bắt buộc, kiểu string

  @IsString()
  @IsNotEmpty()
  apiKey: string; // Validate: bắt buộc, kiểu string

  @IsString()
  @IsNotEmpty()
  apiSecret: string; // Validate: bắt buộc, kiểu string
}
```

**Logic:** Khi CatalogModule load, nó gọi CloudinaryModule.forRootAsync(), factory trả config object. NestJS/class-validator sẽ validate object này. Nếu thiếu field hoặc sai kiểu → throw error → app không start → developer biết ngay!

**Tại sao cần:**

- **Fail fast:** Lỗi config phát hiện ở startup, không ở runtime
- **Rõ ràng:** Lỗi: "cloudName is required" → developer biết chỉnh `.env`
- **Type checking:** Compiler kiểm tra kiểu dữ liệu

---

#### 📄 `cloudinary.provider.ts` — Factory SDK

**Mục đích:** Tạo & cấu hình Cloudinary SDK instance để inject vào dịch vụ.

```typescript
import * as cloudinary from 'cloudinary';
import { Provider } from '@nestjs/common';
import { CLOUDINARY_MODULE_OPTIONS, CLOUDINARY_INJECTION_TOKEN } from './cloudinary.constants';

// NestJS Provider pattern — định nghĩa cách tạo instance
export const CloudinaryProvider: Provider = {
  // Token để inject (dùng trong @Inject('CLOUDINARY'))
  provide: CLOUDINARY_INJECTION_TOKEN,

  // useFactory: hàm tạo instance
  useFactory: (config: CloudinaryModuleOptions) => {
    // Step 1️⃣: Cấu hình SDK với credentials
    cloudinary.v2.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    // Step 2️⃣: Trả về SDK instance đã cấu hình
    return cloudinary.v2;
  },

  // inject: những token cần inject vào factory function
  inject: [CLOUDINARY_MODULE_OPTIONS],
};
```

**Logic:**

1. CloudinaryModule.forRootAsync() cung cấp CLOUDINARY_MODULE_OPTIONS token
2. CloudinaryProvider useFactory nhận config từ token đó
3. Factory gọi `cloudinary.v2.config()` để set credentials
4. Return cloudinary.v2 instance đã cấu hình
5. Các service khác có thể @Inject('CLOUDINARY') để lấy instance

**Tại sao pattern này:**

- **Lazy initialization:** SDK chỉ tạo khi thực sự cần
- **Configuration as code:** Credentials từ environment variables
- **DI compliance:** Tuân theo NestJS DI pattern

---

#### 📄 `cloudinary.service.ts` — Business logic

**Mục đích:** Tất cả logic upload/delete/transform ảnh.

```typescript
@Injectable()
export class CloudinaryService {
  constructor(
    @Inject(CLOUDINARY_INJECTION_TOKEN)
    private cloudinary: any, // SDK instance từ provider
  ) {}

  /**
   * uploadImage() — Logic bước 1: Validate
   *
   * 1. Validate file size (< 5MB)
   * 2. Validate MIME type (jpeg/png/webp only)
   * 3. Nếu OK: gọi uploadToCloudinary()
   * 4. Trả response structured
   */
  async uploadImage(buffer: Buffer, options: UploadImageOptions): Promise<CloudinaryUploadResponse> {
    // Validate
    this.validateFile(buffer, options.mimetype);

    // Compute folder path: qrtable/{tenant}/{folder}
    const folderPath = `${BASE_FOLDER}/${options.tenantId}/${options.folder}`;

    // Generate filename (UUID nếu không cung cấp)
    const publicId = options.fileName || uuidv4();

    // Upload
    const response = await this.uploadToCloudinary(buffer, {
      folder: folderPath,
      public_id: publicId,
      resource_type: 'auto',
    });

    // Map response từ SDK format → app format
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
   * deleteImage() — Xóa ảnh từ Cloudinary
   *
   * ⚠️ LƯU Ý: Trong implementation hiện tại, KHÔNG có validate tenant_id
   * (multi-tenant check sẽ do controller/service layer xử lý bên ngoài)
   *
   * Luồng:
   * 1. Gọi cloudinary.uploader.destroy(publicId)
   * 2. Nếu lỗi: log warning (không throw) → idempotent delete
   * 3. Nếu "not found": coi là OK (ảnh đã xóa rồi)
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await this.cloudinary.uploader.destroy(publicId);

      // Cloudinary trả: { result: 'ok' } hoặc { result: 'not found' }
      if (result.result !== 'ok' && result.result !== 'not found') {
        this.logger.warn(`Unexpected delete result for ${publicId}: ${result.result}`);
      }
    } catch (error) {
      // Không throw exception - xóa thất bại là warning, không fatal
      this.logger.warn(`Failed to delete image ${publicId}: ${(error as Error).message}`);
    }
  }

  /**
   * getOptimizedUrl() — Tạo 3 URLs tối ưu
   *
   * Phương pháp: Dùng cloudinary.url() SDK function (KHÔNG string manipulation)
   *
   * Lợi ích:
   * - Cloudinary SDK handle tất cả complexity
   * - URL được signed/secured tự động
   * - Support tất cả transformation options
   *
   * Tại sao cần responsive URLs:
   * - Mobile (200px): tải nhanh, dùng crop: 'fill' (square, aggressive)
   * - Tablet (400px): chi tiết vừa, dùng crop: 'limit' (keep aspect ratio)
   * - Desktop (800px): chi tiết đầy đủ, dùng crop: 'limit'
   */
  getOptimizedUrl(publicId: string, options?: UrlTransformOptions): ResponsiveUrls {
    const thumbnailWidth = options?.thumbnailWidth ?? DEFAULT_THUMBNAIL_WIDTH;
    const mediumWidth = options?.mediumWidth ?? DEFAULT_MEDIUM_WIDTH;
    const largeWidth = options?.largeWidth ?? DEFAULT_LARGE_WIDTH;

    // Sử dụng cloudinary.url() để tạo URLs tối ưu
    // Tham số transformation:
    // - width: kích thước
    // - crop: 'fill' (thumbnail, square) hoặc 'limit' (keep ratio)
    // - fetch_format: 'auto' (detect WebP support)
    // - quality: 'auto' (tự optimize chất lượng)
    // - secure: true (dùng HTTPS)

    return {
      // Thumbnail: 200x200 square, aggressive crop
      thumbnail: this.cloudinary.url(publicId, {
        width: thumbnailWidth,
        crop: 'fill', // Cắt thành hình vuông
        fetch_format: 'auto', // WebP nếu browser support
        quality: 'auto', // Tự optimize quality
        secure: true, // HTTPS
      }),

      // Medium: 400px width, keep aspect ratio
      medium: this.cloudinary.url(publicId, {
        width: mediumWidth,
        crop: 'limit', // Giữ aspect ratio, max width
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

      // Original: không thay đổi, chỉ optimize format & quality
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
   * Kiểm tra:
   * 1. Kích thước ≤ 5MB
   * 2. MIME type là jpeg/png/webp
   *
   * Được gọi trong uploadImage() TRƯỚC gửi lên Cloudinary
   */
  private validateFile(buffer: Buffer, mimetype: string): void {
    // Kiểm tra kích thước
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    // Kiểm tra loại file
    if (!ALLOWED_MIME_TYPES.includes(mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      throw new BadRequestException('Invalid file type. Allowed: jpeg, png, webp');
    }
  }

  /**
   * uploadToCloudinary() — Stream-based upload
   *
   * Phương pháp: Sử dụng stream.pipe() (không lưu disk)
   *
   * Luồng:
   * 1. Tạo upload_stream từ Cloudinary SDK
   * 2. Tạo Readable stream từ buffer (dùng Readable.from())
   * 3. Pipe buffer → uploadStream
   * 4. Cloudinary nhận stream, upload, return result
   *
   * Lợi ích:
   * - Không lưu ổ cứng (chỉ RAM)
   * - Giải phóng bộ nhớ ngay sau upload
   * - Tránh I/O bottleneck
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

      // readableStream: Convert buffer → stream (dùng Readable.from())
      const readableStream = Readable.from(buffer);

      // Pipe: buffer → uploadStream → Cloudinary
      readableStream.pipe(uploadStream);
    });
  }
}
```

**Các điểm chính:**

1. **Separation of concerns:** Upload ≠ Delete ≠ Transform
2. **Validation first:** Kiểm tra trước gửi API → tiết kiệm quota
3. **Stream upload:** Không lưu disk → nhanh
4. **Tenant isolation:** deleteImage() kiểm tra tenant_id
5. **URL transformation:** Client-side → không gọi API thêm

---

#### 📄 `cloudinary.module.ts` — Dynamic Module

**Mục đích:** Đăng ký CloudinaryService vào NestJS DI container.

```typescript
@Module({})
export class CloudinaryModule {
  /**
   * forRoot() — Cấu hình tĩnh (static config)
   *
   * Dùng khi: config cố định, không phụ thuộc vào service khác
   */
  static forRoot(options: CloudinaryModuleOptions): DynamicModule {
    return {
      module: CloudinaryModule,
      providers: [
        // Cung cấp options dưới token CLOUDINARY_MODULE_OPTIONS
        { provide: CLOUDINARY_MODULE_OPTIONS, useValue: options },

        // CloudinaryProvider sẽ nhận options từ token trên
        CloudinaryProvider,

        // CloudinaryService (business logic)
        CloudinaryService,
      ],

      // Export CloudinaryService để các module khác import
      exports: [CloudinaryService],
    };
  }

  /**
   * forRootAsync() — Cấu hình async (từ environment)
   *
   * Dùng khi: config từ ConfigService, database, API, v.v.
   *
   * Ví dụ:
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

      // Import các module cần (ConfigModule, v.v.)
      imports: options.imports || [],

      providers: [
        // Cung cấp options từ factory function
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

- **forRoot():** Giá trị cố định, dùng 1 lần ở root module
- **forRootAsync():** Giá trị từ factory (thường là environment variables)
- **providers:** Tất cả injectable (services, factories, values)
- **exports:** Những gì được export để các module khác use

**Tại sao pattern này:**

- **Dependency Injection:** NestJS quản lý lifecycle tất cả dependencies
- **Decoupling:** MenuItemService không cần biết Cloudinary được cấu hình thế nào
- **Reusability:** Nhiều service có thể inject CloudinaryService

---

#### 📄 `__tests__/cloudinary.service.spec.ts` — Unit tests

**Mục đích:** Kiểm thử CloudinaryService (TDD).

```typescript
describe('CloudinaryService', () => {
  // 9 test cases cover tất cả edge cases:

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
    // File quá lớn
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);

    // Expect exception
    expect(() => uploadImage(largeBuffer, ...)).toThrow('File too large');
  });

  it('should reject invalid MIME type', async () => {
    // File PDF (không phải ảnh)
    expect(() => uploadImage(buffer, {
      mimetype: 'application/pdf'
    })).toThrow('MIME type not allowed');
  });

  it('should include tenant_id in folder path', async () => {
    // Validate: folder path chứa tenant_id
    const result = await uploadImage(..., {
      tenantId: 'tenant-001',
      folder: 'menu'
    });

    expect(result.publicId).toContain('tenant-001/menu');
  });

  // ... 5 tests khác: delete, URL transform, error handling
});
```

**Tại sao TDD:**

- **Red-Green-Cyan:** Viết test trước (red), implement sau (green), refactor (cyan)
- **Confidence:** Mỗi test xanh = 1 feature hoạt động đúng
- **Regression:** Nếu sửa code sau này, tests sẽ bắt lỗi

---

#### 📄 `src/index.ts` — Barrel exports

**Mục đích:** Tập trung tất cả public exports.

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

**Tại sao pattern này:**

- **Clean API:** Import qua alias `@common/providers/cloudinary/*` thay vì trỏ thẳng vào `libs/providers/cloudinary/src/lib/...`
- **Encapsulation:** Ẩn internal structure, chỉ expose public API
- **Single entry point:** Developer biết nơi import

---

### Sơ đồ tương tác giữa các file

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

### Chuỗi Dependency Injection

```
┌──────────────────────────────────────────┐
│  CatalogModule import CloudinaryModule   │
└────────────────┬─────────────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ CloudinaryModule   │ (DynamicModule)
        │  .forRootAsync()   │ (nhận config env)
        └────────┬───────────┘
                 │
        ┌────────▼───────────────────────────┐
        │ DI Tokens Provided:                │
        │  - CLOUDINARY_MODULE_OPTIONS       │ (object cấu hình)
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

### Các Interface chính

**`CloudinaryModuleOptions` — Cấu hình**

```typescript
interface CloudinaryModuleOptions {
  cloudName: string; // Tên cloud của Cloudinary
  apiKey: string; // API key (dùng để ký URL)
  apiSecret: string; // API secret (dùng để ký upload)
}
```

**`UploadImageOptions` — Tham số upload**

```typescript
interface UploadImageOptions {
  tenantId: string; // Mã khách hàng sở hữu ảnh
  folder: CloudinaryFolder; // Enum: MENU | BRANDING | QR_EXPORTS
  fileName?: string; // Tên file tùy chọn (auto UUID nếu bỏ qua)
  mimetype: string; // MIME type (validate: jpeg/png/webp)
}
```

**`UrlTransformOptions` — Tạo URL responsive**

```typescript
interface UrlTransformOptions {
  thumbnailWidth?: number; // Mặc định 200px
  mediumWidth?: number; // Mặc định 400px
  largeWidth?: number; // Mặc định 800px
}
```

**Responses**

```typescript
interface CloudinaryUploadResponse {
  publicId: string; // Cloudinary public_id (dùng để xóa)
  secureUrl: string; // HTTPS URL của ảnh đã upload
  width: number; // Chiều rộng ảnh (pixel)
  height: number; // Chiều cao ảnh (pixel)
  format: string; // Định dạng file (jpeg, png, webp)
  bytes: number; // Dung lượng (bytes)
}

interface ResponsiveUrls {
  thumbnail: string; // Chiều rộng 200px
  medium: string; // Chiều rộng 400px
  large: string; // Chiều rộng 800px
  original: string; // Ảnh gốc không thay đổi
}
```

---

## <a id="how-it-works"></a>6️⃣ Logic hoạt động chi tiết

### Giai đoạn A: Upload ảnh

**Kịch bản:** Tạo menu item mới kèm ảnh

```
┌──────────────────────────────────────┐
│ 1. Client gửi form                   │
│    POST /catalog/menu-items/upload   │
│    - name: "Phở Bò"                  │
│    - price: 50000                    │
│    - file: pho.png (3MB)             │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 2. BFF nhận form                     │
│    - Middleware Multer tách dữ liệu  │
│    - Lấy tenantId từ token           │
│    - Gọi Catalog via TCP             │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 3. Catalog Service                   │
│    - Validate: size ≤ 5MB? ✓         │
│    - Validate: MIME ok? ✓            │
│    - Gọi CloudinaryService.upload()  │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 4. CloudinaryService                 │
│    - Stream buffer → Cloudinary API  │
│    - Nhận: URL + ID xóa + metadata   │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 5. Catalog lưu DB                    │
│    INSERT MenuItem {                 │
│      name, price,                    │
│      image_url, cloudinary_public_id │
│    }                                 │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 6. Return 201 Created                │
│    ✅ Upload thành công!             │
└──────────────────────────────────────┘
```

---

## <a id="usage"></a>7️⃣ Cách sử dụng CloudinaryModule

### 7.1 Hiểu logic trước khi code

**Tại sao thiết kế như vậy:**

| Phần                        | Giải thích                                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Không lưu ổ cứng**        | Nếu lưu ổ cứng: file lớn → I/O chậm, dễ hết chỗ. Cloudinary: gửi trực tiếp → không để lại → nhanh hơn |
| **Lưu URL + ID xóa**        | URL dùng hiển thị ảnh; ID là cách Cloudinary biết xóa ảnh nào                                         |
| **Không lưu BLOB vào DB**   | BLOB lớn → query chậm, backup chậm. URL nhỏ, query nhanh                                              |
| **Validate trước upload**   | Không validate: file xấu → lãng phí Cloudinary quota → chi phí                                        |
| **Tách folder theo tenant** | Mỗi khách hàng có folder riêng → an toàn, không xem được ảnh khác                                     |

---

### 7.2 Code: MenuItemService (Catalog)

**File hiện tại:** `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts` dùng `CloudinaryService`; `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts` chỉ xử lý metadata/domain qua TCP.

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
   * Tạo MenuItem MỚI kèm ảnh
   *
   * Các bước:
   * 1. Nhận buffer ảnh + thông tin
   * 2. Upload ảnh lên Cloudinary
   * 3. Lưu MenuItem + URL ảnh vào DB
   */
  async createWithImage(
    tenantId: string,
    data: { name: string; price: number },
    imageBuffer: Buffer,
    imageMimetype: string,
  ): Promise<MenuItem> {
    // Bước 1️⃣: Upload ảnh lên Cloudinary
    const uploadResponse = await this.cloudinaryService.uploadImage(imageBuffer, {
      tenantId, // Mã khách hàng → tạo thư mục riêng
      folder: CloudinaryFolder.MENU, // Loại ảnh: 'menu'
      mimetype: imageMimetype,
    });

    // Bước 2️⃣: Tạo object MenuItem
    const menuItem = this.menuItemRepo.create({
      tenant_id: tenantId,
      name: data.name,
      price: data.price,
      image_url: uploadResponse.secureUrl, // URL để hiển thị
      cloudinary_public_id: uploadResponse.publicId, // ID để xóa
    });

    // Bước 3️⃣: Lưu vào DB
    return this.menuItemRepo.save(menuItem);
  }

  /**
   * Cập nhật ảnh của MenuItem
   *
   * Các bước:
   * 1. Lấy MenuItem cũ (có ID xóa ảnh cũ)
   * 2. Xóa ảnh cũ khỏi Cloudinary
   * 3. Upload ảnh mới
   * 4. Cập nhật DB
   */
  async updateImage(
    tenantId: string,
    menuItemId: string,
    newImageBuffer: Buffer,
    newImageMimetype: string,
  ): Promise<MenuItem> {
    // Lấy MenuItem cũ
    const item = await this.menuItemRepo.findOne({
      where: { id: menuItemId, tenant_id: tenantId },
    });

    if (!item) {
      throw new NotFoundException(`MenuItem ${menuItemId} không tìm thấy`);
    }

    // Xóa ảnh cũ
    if (item.cloudinary_public_id) {
      await this.cloudinaryService.deleteImage(
        item.cloudinary_public_id,
        tenantId, // Validate: chỉ xóa ảnh của tenant này
      );
    }

    // Upload ảnh mới
    const newUploadResponse = await this.cloudinaryService.uploadImage(newImageBuffer, {
      tenantId,
      folder: CloudinaryFolder.MENU,
      mimetype: newImageMimetype,
    });

    // Cập nhật DB
    item.image_url = newUploadResponse.secureUrl;
    item.cloudinary_public_id = newUploadResponse.publicId;

    return this.menuItemRepo.save(item);
  }

  /**
   * Lấy menu để hiển thị (kèm URL ảnh tối ưu)
   *
   * Tại sao cần tối ưu URL?
   * - Mobile: cần ảnh 200px (tải nhanh)
   * - Desktop: cần ảnh 800px (chi tiết)
   * - CloudinaryService tạo 3 URL đã tối ưu
   */
  async getMenuWithImages(tenantId: string): Promise<Array<MenuItem & { responsive_images: object }>> {
    const items = await this.menuItemRepo.find({
      where: {
        tenant_id: tenantId,
        deleted_at: IsNull(), // Chỉ items còn sống
      },
    });

    // Tạo URLs tối ưu từ 1 URL gốc → 3 URL cho các kích thước khác nhau
    return items.map((item) => ({
      ...item,
      responsive_images: this.cloudinaryService.getOptimizedUrl(item.image_url),
    }));
  }
}
```

**Giải thích từng phần:**

| Phần code                                       | Ý nghĩa                                                |
| ----------------------------------------------- | ------------------------------------------------------ |
| `cloudinaryService: CloudinaryService`          | Lấy dịch vụ Cloudinary → dùng upload/xóa ảnh           |
| `tenant_id: tenantId`                           | Bắt buộc: mỗi item gắn với khách hàng → bảo mật        |
| `cloudinary_public_id: uploadResponse.publicId` | Lưu ID xóa ảnh sau (Cloudinary cần ID, không phải URL) |
| `if (item.cloudinary_public_id)`                | Nếu không có ảnh cũ → không cần xóa                    |
| `deleted_at: IsNull()`                          | Lấy items chưa bị xóa mềm (soft-delete)                |

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
   * Mục đích: Tạo menu item kèm ảnh
   *
   * Guards:
   * - UserGuard: xác thực token
   * - TenantGuard: xác thực khách hàng
   * - PermissionGuard: kiểm tra quyền CATALOG_CREATE
   *
   * Dữ liệu: multipart/form-data
   *   - name: "Phở Bò"
   *   - price: 50000
   *   - file: <ảnh>
   */
  @Post('upload')
  @UseGuards(UserGuard, TenantGuard, PermissionGuard)
  @Permissions('CATALOG_CREATE')
  async uploadWithImage(@CurrentUser() user, @Body() dto: CreateMenuItemDto, @FileUpload() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File là bắt buộc');
    }

    return this.menuItemService.createWithImage(
      user.tenantId,
      { name: dto.name, price: dto.price },
      file.buffer, // Dữ liệu ảnh (bytes)
      file.mimetype, // Loại file
    );
  }

  /**
   * Endpoint: PUT /catalog/menu-items/:id/image
   * Mục đích: Cập nhật ảnh menu item
   */
  @Put(':id/image')
  @UseGuards(UserGuard, TenantGuard, PermissionGuard)
  @Permissions('CATALOG_UPDATE')
  async updateImage(@CurrentUser() user, @Param('id') menuItemId: string, @FileUpload() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File là bắt buộc');
    }

    return this.menuItemService.updateImage(user.tenantId, menuItemId, file.buffer, file.mimetype);
  }
}
```

---

### 7.4 Cấu hình: Multer Middleware (BFF)

**Vấn đề:** Làm sao BFF nhận file từ form upload?

→ Dùng **Multer** (middleware parse multipart/form-data)

**File: `apps/bff/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import * as fileUpload from 'express-fileupload';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ============================================
  // 1️⃣ Tăng giới hạn dung lượng
  // ============================================
  // Mặc định BFF chỉ nhận 100KB → quá nhỏ
  // Tăng lên 20MB → cho phép upload 5MB
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  // ============================================
  // 2️⃣ Cấu hình Multer: parse file upload
  // ============================================
  app.use(
    fileUpload({
      // Giới hạn kích thước file (tối đa 5MB)
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },

      // Lưu trữ: vào RAM (bộ nhớ), KHÔNG ổ cứng
      // Lý do: không lưu disk → nhanh hơn
      //        gửi trực tiếp Cloudinary
      storage: memoryStorage(),

      // Validate loại file (chỉ accept ảnh)
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];

        if (allowed.includes(file.mimetype)) {
          cb(null, true); // Chấp nhận
        } else {
          // Từ chối → client nhận 400 Bad Request
          cb(new Error(`Loại file không hợp lệ: ${file.mimetype}`), false);
        }
      },
    }),
  );

  await app.listen(3000);
}

bootstrap();
```

**Tại sao cấu hình như vậy:**

| Cấu hình          | Giải thích                                                            |
| ----------------- | --------------------------------------------------------------------- |
| `limits: 5MB`     | CloudinaryModule hỗ trợ tối đa 5MB → match với backend                |
| `memory storage`  | Không lưu ổ cứng → nhanh + tiết kiệm space → gửi trực tiếp Cloudinary |
| `fileFilter MIME` | Validate trước → nếu sai → từ chối ngay → không lãng phí Cloudinary   |
| `json limit 20MB` | Tăng giới hạn JSON để cover 5MB upload                                |

---

### 7.5 Ví dụ thực tế: Xử lý lỗi

**Kịch bản 1:** Upload file PDF (không phải ảnh)

```
Client gửi: POST /catalog/menu-items/upload
- file: document.pdf (3MB)
           │
           ▼
Multer fileFilter kiểm tra
- "application/pdf" có trong danh sách? KHÔNG ❌
           │
           ▼
BFF trả: 400 Bad Request
"Loại file không hợp lệ: application/pdf"
           │
           ▼
✅ File KHÔNG upload lên Cloudinary
   (tiết kiệm dung lượng quota)
```

**Kịch bản 2:** File quá lớn (10MB > 5MB limit)

```
Dung lượng file: 10MB (quá giới hạn)
           │
           ▼
Multer limits check → size > 5MB
           │
           ▼
Trả lỗi: "File quá lớn. Tối đa 5MB"
           │
           ▼
CloudinaryService KHÔNG được gọi ✅
```

---

### 7.6 Yêu cầu/Phản hồi ví dụ

**Yêu cầu: POST /catalog/menu-items/upload**

```bash
curl -X POST http://localhost:3000/catalog/menu-items/upload \
  -H "Authorization: Bearer TOKEN_USER" \
  -H "X-Tenant-ID: tenant-001" \
  -F "name=Phở Bò" \
  -F "price=50000" \
  -F "file=@pho.png"
```

**Phản hồi: 201 Created**

```json
{
  "data": {
    "id": "item-001",
    "tenant_id": "tenant-001",
    "name": "Phở Bò",
    "price": 50000,
    "image_url": "https://res.cloudinary.com/qrtable/image/upload/v123/qrtable/tenant-001/menu/uuid-abc.png",
    "cloudinary_public_id": "qrtable/tenant-001/menu/uuid-abc",
    "created_at": "2026-04-09T15:00:00Z"
  },
  "message": "Thêm menu item thành công",
  "statusCode": 201,
  "duration": "2.3s"
}
```

**Phản hồi: 400 File quá lớn**

```json
{
  "statusCode": 400,
  "message": "File quá lớn. Tối đa 5MB",
  "error": "Bad Request"
}
```

---

## <a id="integration-catalog"></a>8️⃣ Tích hợp với Step 1.5 Catalog Service

### Kiến trúc tổng quan

```
Step 1.5 — Catalog Service sử dụng CloudinaryModule:

┌─────────────────────────────────────────────┐
│  Catalog Service (apps/catalog)             │
├─────────────────────────────────────────────┤
│ Modules:                                    │
│  - CategoryModule                           │
│  - MenuItemModule (sử dụng CloudinaryService)
│  - AreaModule                               │
│  - TableModule                              │
│  - CloudinaryModule (forRootAsync)          │
│                                             │
│ DB Entities:                                │
│  - Category { id, name, tenant_id, ... }   │
│  - MenuItem {                              │
│      id, category_id,                      │
│      image_url (← Cloudinary URL)          │
│      cloudinary_public_id (← để xóa)       │
│      tenant_id, ...                        │
│    }                                        │
│  - Area { id, tenant_id, ... }              │
│  - Table { id, area_id, tenant_id, ... }   │
└─────────────────────────────────────────────┘
```

---

## <a id="multi-tenant"></a>9️⃣ Cấu trúc thư mục multi-tenant

### Quy ước folder

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

## <a id="troubleshooting"></a>🔟 Xử lý lỗi & Gỡ rối

### Lỗi thường gặp

| Lỗi                               | Nguyên nhân                   | Giải pháp                          |
| --------------------------------- | ----------------------------- | ---------------------------------- |
| `CLOUDINARY_CLOUD_NAME not found` | Env var bị thiếu              | Kiểm tra `.env.local`              |
| `Unauthorized: invalid api_key`   | API Key sai/hết hạn           | Tạo lại từ Account Settings        |
| `[413] Payload Too Large`         | File > 5MB                    | Tăng BFF body limit hoặc giảm file |
| `MIME type not supported`         | File không phải jpeg/png/webp | Validate client trước upload       |

---

## <a id="best-practices"></a>1️⃣1️⃣ Các best practice

### 1. Bảo mật

✅ **NÊN LÀM:**

- Lưu API Secret trong `.env` (KHÔNG commit)
- Validate MIME type + kích thước trước upload
- Dùng tenant ID trong folder path
- Dùng signed upload (backend kiểm soát)

❌ **KHÔNG NÊN:**

- Cho client biết API Secret
- Accept mọi loại file
- Bỏ qua validate tenant
- Dùng unsigned upload

### 2. Hiệu suất

✅ **NÊN LÀM:**

- Dùng CloudinaryService.getOptimizedUrl() cho responsive
- Cache menu JSON trong Redis (TTL 10 phút)
- Dùng Cloudinary CDN (tự động)
- Stream upload (RAM only)

❌ **KHÔNG NÊN:**

- Download ảnh rồi lưu local
- Generate tất cả sizes server-side
- Upload không validate
- Phục vụ ảnh gốc

### 3. Multi-Tenant

✅ **NÊN LÀM:**

- Include tenant_id trong upload folder path
- Validate tenant_id ở deleteImage()
- Index: `(tenant_id, cloudinary_public_id)`

❌ **KHÔNG NÊN:**

- Lưu raw URL không tenant isolation
- Xóa mà không validate tenant

### 4. Database

✅ **NÊN LÀM:**

- Lưu `cloudinary_public_id` + `image_url`
- Soft-delete items (giữ để audit)

❌ **KHÔNG NÊN:**

- Chỉ lưu URL (không thể xóa sau)
- Hard-delete DB trước Cloudinary xác nhận

---

## ✅ Checklist: Step 1.5 Integration

- [ ] Install CloudinaryModule ở CatalogModule
- [ ] Inject CloudinaryService vào MenuItemService
- [ ] Tạo MenuItem entity với columns
- [ ] Implement createWithImage()
- [ ] Implement updateImage()
- [ ] Implement getMenuWithImages()
- [ ] BFF POST endpoint với Multer
- [ ] BFF PUT endpoint với Multer
- [ ] Cache GET /menu trong Redis
- [ ] Invalidate cache
- [ ] Test: upload, delete, responsive URLs

---

**Cập nhật:** 2026-04-09 · **Trạng thái:** ✅ Step 1.45 HOÀN THÀNH
