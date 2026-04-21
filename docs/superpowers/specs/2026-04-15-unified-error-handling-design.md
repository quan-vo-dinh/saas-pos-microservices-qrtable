# Unified Error Handling System — Design Spec

> **Status:** Approved
> **Scope:** Toàn hệ thống (all backend services + 2 frontend apps)
> **Approach:** Centralized Error Registry + DB Constraint Catching
> **Language:** Vietnamese (default) + English (fallback), i18n-ready

---

## 1. Problem Statement

Hệ thống QRTable hiện tại có các vấn đề về error handling:

1. **Error messages hardcoded bằng tiếng Anh** — rải rác trong 65+ error points across 7 services
2. **Không có error code system** — frontend không biết phân loại lỗi để xử lý khác nhau
3. **Không nhất quán** — Authorizer dùng enum, Catalog/Product/SaaS dùng raw strings
4. **Customer PWA thiếu error handling** — không toast, không error boundaries
5. **Không bắt lỗi DB constraints** — chỉ pre-check, không catch TypeORM race condition errors
6. **Frontend hiển thị raw error.message** — `Failed to create area: ${error.message}`
7. **Management-app: 55 messages bằng EN** — cần chuyển sang VI
8. **Không có i18n foundation** — không thể mở rộng ngôn ngữ

### Mục tiêu

- Tất cả error messages hiển thị cho user bằng **tiếng Việt**
- **Error code có cấu trúc** — frontend map theo code để xử lý logic
- **Backend gửi error code + message Việt** — frontend hiển thị trực tiếp
- **Centralized management** — 1 nơi quản lý tất cả errors/messages
- **DB constraint catching** — transform DB errors thành business errors
- **Error Boundaries + Toast** cho cả 2 frontend apps
- **i18n-ready** — dễ thêm ngôn ngữ mới sau này

---

## 2. Error Code Convention

### Naming Pattern

```
SERVICE_DOMAIN_ERROR_TYPE
```

- `SERVICE`: Module/service name (AUTH, CATALOG, SAAS, PRODUCT, USER, UPLOAD, COMMON, TENANT)
- `DOMAIN`: Entity/resource (CATEGORY, AREA, TABLE, MENU_ITEM, TOKEN, DB)
- `ERROR_TYPE`: Loại lỗi (NOT_FOUND, DUPLICATE_NAME, INVALID, HAS_ACTIVE_ITEMS, etc.)

### Full Error Code Registry

#### AUTH — Authentication & Authorization (6 codes)

| Error Code                   | HTTP | Vietnamese Message                           | English Message                       |
| ---------------------------- | ---- | -------------------------------------------- | ------------------------------------- |
| `AUTH_TOKEN_NOT_PROVIDED`    | 401  | Token xác thực không được cung cấp           | Authentication token is required      |
| `AUTH_TOKEN_INVALID`         | 401  | Token không hợp lệ hoặc đã hết hạn           | Invalid or expired token              |
| `AUTH_USER_NOT_PROVISIONED`  | 401  | Tài khoản chưa được kích hoạt trong hệ thống | User account not provisioned          |
| `AUTH_ROLE_MAPPING_MISMATCH` | 401  | Vai trò người dùng không khớp giữa hệ thống  | Role mapping mismatch between systems |
| `AUTH_USER_DATA_NOT_FOUND`   | 401  | Không tìm thấy thông tin người dùng          | User data not found                   |
| `AUTH_PERMISSION_DENIED`     | 403  | Bạn không có quyền thực hiện thao tác này    | Permission denied                     |

#### TENANT — Multi-tenancy (4 codes)

| Error Code                 | HTTP | Vietnamese Message                        | English Message                    |
| -------------------------- | ---- | ----------------------------------------- | ---------------------------------- |
| `TENANT_REQUIRED`          | 403  | Thông tin cửa hàng là bắt buộc            | Tenant information is required     |
| `TENANT_MISMATCH_IDENTITY` | 403  | Cửa hàng không khớp với tài khoản của bạn | Tenant mismatch with user identity |
| `TENANT_SESSION_NOT_FOUND` | 403  | Phiên làm việc không tìm thấy             | Tenant session not found           |
| `TENANT_MISMATCH_SESSION`  | 403  | Cửa hàng không khớp với phiên làm việc    | Tenant mismatch with session       |

#### CATALOG — Category (3 codes)

| Error Code                          | HTTP | Vietnamese Message                           | English Message                               |
| ----------------------------------- | ---- | -------------------------------------------- | --------------------------------------------- |
| `CATALOG_CATEGORY_DUPLICATE_NAME`   | 409  | Tên danh mục đã tồn tại                      | Category name already exists                  |
| `CATALOG_CATEGORY_NOT_FOUND`        | 404  | Danh mục không tìm thấy                      | Category not found                            |
| `CATALOG_CATEGORY_HAS_ACTIVE_ITEMS` | 409  | Không thể xóa danh mục đang có món hoạt động | Cannot delete category with active menu items |

#### CATALOG — Area (3 codes)

| Error Code                    | HTTP | Vietnamese Message                | English Message                |
| ----------------------------- | ---- | --------------------------------- | ------------------------------ |
| `CATALOG_AREA_DUPLICATE_NAME` | 409  | Tên khu vực đã tồn tại            | Area name already exists       |
| `CATALOG_AREA_NOT_FOUND`      | 404  | Khu vực không tìm thấy            | Area not found                 |
| `CATALOG_AREA_HAS_TABLES`     | 409  | Không thể xóa khu vực đang có bàn | Cannot delete area with tables |

#### CATALOG — Table (6 codes)

| Error Code                           | HTTP | Vietnamese Message                                                               | English Message                                                        |
| ------------------------------------ | ---- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `CATALOG_TABLE_DUPLICATE_NAME`       | 409  | Tên bàn đã tồn tại                                                               | Table name already exists                                              |
| `CATALOG_TABLE_NOT_FOUND`            | 404  | Bàn không tìm thấy                                                               | Table not found                                                        |
| `CATALOG_TABLE_AREA_NOT_FOUND`       | 400  | Khu vực không tồn tại trong cửa hàng này                                         | Area not found in this tenant                                          |
| `CATALOG_TABLE_CANNOT_DELETE_ACTIVE` | 409  | Không thể xóa bàn đang hoạt động                                                 | Cannot delete active table                                             |
| `CATALOG_TABLE_INVALID_TRANSITION`   | 400  | Chuyển trạng thái bàn không hợp lệ: {{current}} → {{new}}. Cho phép: {{allowed}} | Invalid status transition: {{current}} → {{new}}. Allowed: {{allowed}} |
| `CATALOG_TABLE_INVALID_QR_TOKEN`     | 403  | Mã QR không hợp lệ hoặc đã hết hạn                                               | Invalid or expired QR token                                            |

#### CATALOG — MenuItem (2 codes)

| Error Code                             | HTTP | Vietnamese Message                        | English Message                   |
| -------------------------------------- | ---- | ----------------------------------------- | --------------------------------- |
| `CATALOG_MENU_ITEM_NOT_FOUND`          | 404  | Món ăn không tìm thấy                     | Menu item not found               |
| `CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND` | 400  | Danh mục không tồn tại trong cửa hàng này | Category not found in this tenant |

#### PRODUCT (1 code)

| Error Code               | HTTP | Vietnamese Message  | English Message        |
| ------------------------ | ---- | ------------------- | ---------------------- |
| `PRODUCT_ALREADY_EXISTS` | 409  | Sản phẩm đã tồn tại | Product already exists |

#### USER (1 code)

| Error Code            | HTTP | Vietnamese Message   | English Message     |
| --------------------- | ---- | -------------------- | ------------------- |
| `USER_ALREADY_EXISTS` | 409  | Tài khoản đã tồn tại | User already exists |

#### SAAS — Tenant Management (3 codes)

| Error Code                   | HTTP | Vietnamese Message       | English Message         |
| ---------------------------- | ---- | ------------------------ | ----------------------- |
| `SAAS_TENANT_NAME_REQUIRED`  | 400  | Tên cửa hàng là bắt buộc | Tenant name is required |
| `SAAS_TENANT_ALREADY_EXISTS` | 409  | Cửa hàng đã tồn tại      | Tenant already exists   |
| `SAAS_TENANT_NOT_FOUND`      | 404  | Cửa hàng không tìm thấy  | Tenant not found        |

#### UPLOAD — File Upload (4 codes)

| Error Code                 | HTTP | Vietnamese Message                               | English Message                             |
| -------------------------- | ---- | ------------------------------------------------ | ------------------------------------------- |
| `UPLOAD_FILE_REQUIRED`     | 400  | Vui lòng chọn tệp để tải lên                     | File is required                            |
| `UPLOAD_FILE_TOO_LARGE`    | 400  | Kích thước tệp vượt quá giới hạn 5MB             | File size exceeds 5MB limit                 |
| `UPLOAD_INVALID_FILE_TYPE` | 400  | Loại tệp không hợp lệ. Cho phép: jpeg, png, webp | Invalid file type. Allowed: jpeg, png, webp |
| `UPLOAD_FAILED`            | 500  | Tải ảnh lên thất bại, vui lòng thử lại           | Image upload failed                         |

#### COMMON — DB Constraints & System (5 codes)

| Error Code                     | HTTP | Vietnamese Message                              | English Message                                   |
| ------------------------------ | ---- | ----------------------------------------------- | ------------------------------------------------- |
| `COMMON_DB_UNIQUE_VIOLATION`   | 409  | Dữ liệu đã tồn tại (vi phạm ràng buộc duy nhất) | Data already exists (unique constraint violation) |
| `COMMON_DB_FK_VIOLATION`       | 400  | Dữ liệu tham chiếu không tồn tại                | Referenced data does not exist                    |
| `COMMON_DB_NOT_NULL_VIOLATION` | 400  | Trường bắt buộc không được để trống             | Required field cannot be null                     |
| `COMMON_VALIDATION_FAILED`     | 400  | Dữ liệu không hợp lệ                            | Validation failed                                 |
| `COMMON_INTERNAL_ERROR`        | 500  | Lỗi hệ thống, vui lòng thử lại sau              | Internal server error                             |

#### KEYCLOAK — External Service (1 code)

| Error Code                      | HTTP | Vietnamese Message                             | English Message                   |
| ------------------------------- | ---- | ---------------------------------------------- | --------------------------------- |
| `KEYCLOAK_USER_CREATION_FAILED` | 500  | Không thể tạo tài khoản trên hệ thống xác thực | Failed to create user in Keycloak |

**Total: 39 error codes**

### Success Message Templates (Frontend)

| Message Code             | Vietnamese Template                    | English Template                |
| ------------------------ | -------------------------------------- | ------------------------------- |
| `SUCCESS_CREATED`        | {{entity}} đã được tạo thành công      | {{entity}} created successfully |
| `SUCCESS_UPDATED`        | {{entity}} đã được cập nhật thành công | {{entity}} updated successfully |
| `SUCCESS_DELETED`        | {{entity}} đã được xóa                 | {{entity}} deleted              |
| `SUCCESS_REORDERED`      | Đã sắp xếp lại {{entity}}              | {{entity}} reordered            |
| `SUCCESS_IMAGE_UPLOADED` | Ảnh đã được tải lên thành công         | Image uploaded successfully     |
| `SUCCESS_QR_REGENERATED` | Mã QR đã được tạo lại                  | QR code regenerated             |
| `SUCCESS_STATUS_UPDATED` | Trạng thái đã được cập nhật            | Status updated                  |

### Entity Name Map (for template interpolation)

| Entity Key | Vietnamese | English   |
| ---------- | ---------- | --------- |
| `category` | Danh mục   | Category  |
| `area`     | Khu vực    | Area      |
| `table`    | Bàn        | Table     |
| `menuItem` | Món ăn     | Menu item |
| `product`  | Sản phẩm   | Product   |
| `tenant`   | Cửa hàng   | Tenant    |
| `user`     | Tài khoản  | User      |

---

## 3. Backend Architecture

### 3.1 Shared Library: `libs/error-messages/`

```
libs/error-messages/
├── src/
│   ├── lib/
│   │   ├── error-code.enum.ts            # ErrorCode enum (all 39 codes)
│   │   ├── error-messages.vi.ts          # Record<ErrorCode, string> — Vietnamese
│   │   ├── error-messages.en.ts          # Record<ErrorCode, string> — English
│   │   ├── success-messages.vi.ts        # Success message templates — Vietnamese
│   │   ├── success-messages.en.ts        # Success message templates — English
│   │   ├── entity-names.ts              # Entity name translations
│   │   ├── error-messages.registry.ts    # getErrorMessage(code, locale?, params?)
│   │   ├── business.exception.ts         # BusinessException extends HttpException
│   │   └── db-error.transformer.ts       # TypeORM error → BusinessException
│   └── index.ts                          # Public API exports
├── tsconfig.json
├── tsconfig.lib.json
├── project.json
└── jest.config.ts
```

**tsconfig.base.json path alias:**

```json
"@common/error-messages/*": ["libs/error-messages/src/lib/*"]
```

### 3.2 ErrorCode Enum

```typescript
// libs/error-messages/src/lib/error-code.enum.ts
export enum ErrorCode {
  // AUTH
  AUTH_TOKEN_NOT_PROVIDED = 'AUTH_TOKEN_NOT_PROVIDED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_USER_NOT_PROVISIONED = 'AUTH_USER_NOT_PROVISIONED',
  AUTH_ROLE_MAPPING_MISMATCH = 'AUTH_ROLE_MAPPING_MISMATCH',
  AUTH_USER_DATA_NOT_FOUND = 'AUTH_USER_DATA_NOT_FOUND',
  AUTH_PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',

  // TENANT
  TENANT_REQUIRED = 'TENANT_REQUIRED',
  TENANT_MISMATCH_IDENTITY = 'TENANT_MISMATCH_IDENTITY',
  TENANT_SESSION_NOT_FOUND = 'TENANT_SESSION_NOT_FOUND',
  TENANT_MISMATCH_SESSION = 'TENANT_MISMATCH_SESSION',

  // CATALOG — Category
  CATALOG_CATEGORY_DUPLICATE_NAME = 'CATALOG_CATEGORY_DUPLICATE_NAME',
  CATALOG_CATEGORY_NOT_FOUND = 'CATALOG_CATEGORY_NOT_FOUND',
  CATALOG_CATEGORY_HAS_ACTIVE_ITEMS = 'CATALOG_CATEGORY_HAS_ACTIVE_ITEMS',

  // CATALOG — Area
  CATALOG_AREA_DUPLICATE_NAME = 'CATALOG_AREA_DUPLICATE_NAME',
  CATALOG_AREA_NOT_FOUND = 'CATALOG_AREA_NOT_FOUND',
  CATALOG_AREA_HAS_TABLES = 'CATALOG_AREA_HAS_TABLES',

  // CATALOG — Table
  CATALOG_TABLE_DUPLICATE_NAME = 'CATALOG_TABLE_DUPLICATE_NAME',
  CATALOG_TABLE_NOT_FOUND = 'CATALOG_TABLE_NOT_FOUND',
  CATALOG_TABLE_AREA_NOT_FOUND = 'CATALOG_TABLE_AREA_NOT_FOUND',
  CATALOG_TABLE_CANNOT_DELETE_ACTIVE = 'CATALOG_TABLE_CANNOT_DELETE_ACTIVE',
  CATALOG_TABLE_INVALID_TRANSITION = 'CATALOG_TABLE_INVALID_TRANSITION',
  CATALOG_TABLE_INVALID_QR_TOKEN = 'CATALOG_TABLE_INVALID_QR_TOKEN',

  // CATALOG — MenuItem
  CATALOG_MENU_ITEM_NOT_FOUND = 'CATALOG_MENU_ITEM_NOT_FOUND',
  CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND = 'CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND',

  // PRODUCT
  PRODUCT_ALREADY_EXISTS = 'PRODUCT_ALREADY_EXISTS',

  // USER
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',

  // SAAS
  SAAS_TENANT_NAME_REQUIRED = 'SAAS_TENANT_NAME_REQUIRED',
  SAAS_TENANT_ALREADY_EXISTS = 'SAAS_TENANT_ALREADY_EXISTS',
  SAAS_TENANT_NOT_FOUND = 'SAAS_TENANT_NOT_FOUND',

  // UPLOAD
  UPLOAD_FILE_REQUIRED = 'UPLOAD_FILE_REQUIRED',
  UPLOAD_FILE_TOO_LARGE = 'UPLOAD_FILE_TOO_LARGE',
  UPLOAD_INVALID_FILE_TYPE = 'UPLOAD_INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // COMMON
  COMMON_DB_UNIQUE_VIOLATION = 'COMMON_DB_UNIQUE_VIOLATION',
  COMMON_DB_FK_VIOLATION = 'COMMON_DB_FK_VIOLATION',
  COMMON_DB_NOT_NULL_VIOLATION = 'COMMON_DB_NOT_NULL_VIOLATION',
  COMMON_VALIDATION_FAILED = 'COMMON_VALIDATION_FAILED',
  COMMON_INTERNAL_ERROR = 'COMMON_INTERNAL_ERROR',

  // KEYCLOAK
  KEYCLOAK_USER_CREATION_FAILED = 'KEYCLOAK_USER_CREATION_FAILED',
}
```

### 3.3 Message Maps

```typescript
// libs/error-messages/src/lib/error-messages.vi.ts
import { ErrorCode } from './error-code.enum';

export const ERROR_MESSAGES_VI: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_TOKEN_NOT_PROVIDED]: 'Token xác thực không được cung cấp',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Token không hợp lệ hoặc đã hết hạn',
  // ... all 39 entries from Section 2 table
};
```

```typescript
// libs/error-messages/src/lib/error-messages.en.ts
import { ErrorCode } from './error-code.enum';

export const ERROR_MESSAGES_EN: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_TOKEN_NOT_PROVIDED]: 'Authentication token is required',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Invalid or expired token',
  // ... all 39 entries
};
```

### 3.4 Error Message Registry

```typescript
// libs/error-messages/src/lib/error-messages.registry.ts
export type SupportedLocale = 'vi' | 'en';
const DEFAULT_LOCALE: SupportedLocale = 'vi';

const MESSAGES: Record<SupportedLocale, Record<ErrorCode, string>> = {
  vi: ERROR_MESSAGES_VI,
  en: ERROR_MESSAGES_EN,
};

/**
 * Get localized error message with optional parameter interpolation.
 * Template params use {{paramName}} syntax.
 *
 * @example
 * getErrorMessage(ErrorCode.CATALOG_TABLE_INVALID_TRANSITION, 'vi', {
 *   current: 'available', new: 'cleaning', allowed: 'occupied'
 * })
 * // → "Chuyển trạng thái bàn không hợp lệ: available → cleaning. Cho phép: occupied"
 */
export function getErrorMessage(
  code: ErrorCode,
  locale: SupportedLocale = DEFAULT_LOCALE,
  params?: Record<string, string>,
): string {
  const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  let message = messages[code] ?? MESSAGES[DEFAULT_LOCALE][code] ?? code;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
  }
  return message;
}
```

### 3.5 BusinessException Class

```typescript
// libs/error-messages/src/lib/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';
import { getErrorMessage, SupportedLocale } from './error-messages.registry';

export interface BusinessExceptionResponse {
  errorCode: ErrorCode;
  message: string;
  statusCode: number;
}

export class BusinessException extends HttpException {
  readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, statusCode: HttpStatus, params?: Record<string, string>, locale?: SupportedLocale) {
    const message = getErrorMessage(errorCode, locale, params);
    const response: BusinessExceptionResponse = {
      errorCode,
      message,
      statusCode,
    };
    super(response, statusCode);
    this.errorCode = errorCode;
  }
}
```

**Usage in services:**

```typescript
// Before:
throw new BadRequestException('Category name already exists');

// After:
throw new BusinessException(ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME, HttpStatus.CONFLICT);

// With dynamic params:
throw new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_TRANSITION, HttpStatus.BAD_REQUEST, {
  current: currentStatus,
  new: newStatus,
  allowed: allowedTransitions.join(', '),
});
```

### 3.6 DB Error Transformer

```typescript
// libs/error-messages/src/lib/db-error.transformer.ts
import { HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from './error-code.enum';
import { BusinessException } from './business.exception';

/**
 * PostgreSQL error codes mapping.
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_MAP: Record<string, { errorCode: ErrorCode; statusCode: HttpStatus }> = {
  '23505': { errorCode: ErrorCode.COMMON_DB_UNIQUE_VIOLATION, statusCode: HttpStatus.CONFLICT },
  '23503': { errorCode: ErrorCode.COMMON_DB_FK_VIOLATION, statusCode: HttpStatus.BAD_REQUEST },
  '23502': { errorCode: ErrorCode.COMMON_DB_NOT_NULL_VIOLATION, statusCode: HttpStatus.BAD_REQUEST },
};

/**
 * Transform TypeORM QueryFailedError into a BusinessException.
 * Returns null if the error is not a known DB constraint violation.
 */
export function transformDbError(error: unknown): BusinessException | null {
  if (!(error instanceof QueryFailedError)) {
    return null;
  }

  const driverError = (error as QueryFailedError & { driverError?: { code?: string } }).driverError;
  const pgCode = driverError?.code;

  if (pgCode && PG_ERROR_MAP[pgCode]) {
    const { errorCode, statusCode } = PG_ERROR_MAP[pgCode];
    return new BusinessException(errorCode, statusCode);
  }

  return null;
}
```

### 3.7 Enhanced ExceptionInterceptor

The existing `ExceptionInterceptor` will be enhanced to handle:

1. **`BusinessException`** — extract `errorCode` + `message` directly
2. **NestJS built-in exceptions** (NotFoundException, BadRequestException, etc.) — pass through with `message`, no `errorCode` (backward compat during migration)
3. **TypeORM `QueryFailedError`** — use `transformDbError()` to convert to BusinessException
4. **class-validator `ValidationError` arrays** — map to `COMMON_VALIDATION_FAILED` with field details
5. **Unknown errors** — map to `COMMON_INTERNAL_ERROR`

```typescript
// Enhanced response format (error case):
{
  data: null,
  errorCode: "CATALOG_CATEGORY_DUPLICATE_NAME",  // NEW — from BusinessException
  message: "Tên danh mục đã tồn tại",
  statusCode: 409,
  duration: "12ms",
  processID: "abc-123"
}

// Success case (unchanged):
{
  data: { ... },
  message: "OK",
  statusCode: 200,
  duration: "5ms",
  processID: "abc-123"
}
```

### 3.8 Enhanced TcpLoggingInterceptor

The TCP interceptor will similarly catch `BusinessException` and `QueryFailedError`, ensuring errors are properly serialized across TCP transport so the BFF can reconstruct them for HTTP responses.

### 3.9 ResponseDto Enhancement

```typescript
// libs/interfaces/src/lib/gateway/response.interface.ts
export class ResponseDto<T> {
  message = HTTP_MESSAGE.OK;
  data?: T;
  processID?: string;
  statusCode = HttpStatus.OK;
  duration?: string;
  errorCode?: string; // NEW — optional, only present on errors
}
```

---

## 4. Frontend Architecture

### 4.1 Enhanced ApiError Class

```typescript
// libs/frontend/utils/src/lib/api-client.ts
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string | undefined;
  readonly serverMessage: string;

  constructor(status: number, body: string) {
    let errorCode: string | undefined;
    let serverMessage = body;

    try {
      const parsed = JSON.parse(body);
      errorCode = parsed.errorCode;
      serverMessage = parsed.message ?? body;
    } catch {
      // body is not JSON — use raw text
    }

    super(serverMessage);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.serverMessage = serverMessage;
  }
}
```

### 4.2 Management App — Toast Handler Pattern

```typescript
// Before:
onSuccess: () => toast.success('Area created successfully'),
onError: (error: Error) => toast.error(`Failed to create area: ${error.message}`),

// After:
onSuccess: () => toast.success('Khu vực đã được tạo thành công'),
onError: (error: Error) => {
  const message = error instanceof ApiError ? error.serverMessage : error.message;
  toast.error(message);
  // error.serverMessage = "Tên khu vực đã tồn tại" (Vietnamese from backend)
},
```

Success messages use Vietnamese templates from a shared frontend messages file.

### 4.3 Success Messages (Frontend)

```typescript
// libs/frontend/utils/src/lib/messages.ts (or inline in each app)
export const ENTITY_NAMES: Record<string, string> = {
  category: 'Danh mục',
  area: 'Khu vực',
  table: 'Bàn',
  menuItem: 'Món ăn',
};

export function successMessage(template: string, entity: string): string {
  return template.replace('{{entity}}', ENTITY_NAMES[entity] ?? entity);
}

// Usage:
toast.success(successMessage('{{entity}} đã được tạo thành công', 'area'));
// → "Khu vực đã được tạo thành công"
```

### 4.4 React Error Boundaries

Both apps get Error Boundary components:

```typescript
// apps/<app>/src/components/error-boundary.tsx
// Wraps the app root — catches unhandled React errors
// Displays fallback UI: "Đã xảy ra lỗi. Vui lòng tải lại trang."
// Includes a "Tải lại" button
// Logs error to console (future: send to monitoring service)
```

### 4.5 Customer PWA — Add Sonner Toast

- Install and configure Sonner toast library (same as management-app)
- Add `<Toaster />` to root layout
- Add error/success toasts for:
  - QR verification errors
  - Order submission errors
  - Payment request errors
  - Network connectivity errors

### 4.6 Zod Schema Messages → Vietnamese

All Zod validation schemas in both apps will use Vietnamese messages:

```typescript
// Before:
z.string().min(1, 'Area name is required');

// After:
z.string().min(1, 'Tên khu vực là bắt buộc');
```

### 4.7 UI Text → Vietnamese (Management App)

All hardcoded English UI text in management-app will be converted to Vietnamese:

- Delete confirmation dialogs
- Button labels (Delete → Xóa, Cancel → Hủy)
- Empty states
- Form labels & placeholders

---

## 5. Migration Strategy

### Phase A: Foundation (Shared Libs)

1. Generate `libs/error-messages` shared library
2. Add path alias `@common/error-messages/*` to `tsconfig.base.json`
3. Implement `ErrorCode` enum with all 39 codes
4. Implement Vietnamese + English message maps
5. Implement `getErrorMessage()` registry function
6. Implement `BusinessException` class
7. Implement `transformDbError()` DB error transformer
8. Enhance `ResponseDto` with optional `errorCode` field
9. Enhance `ExceptionInterceptor` to handle BusinessException + DB errors
10. Enhance `TcpLoggingInterceptor` similarly
11. Write unit tests for all above

### Phase B: Backend Services (Refactor throw statements)

Refactor each service to use `BusinessException` instead of raw NestJS exceptions:

1. **Catalog service** — category (3), area (3), table (6), menu-item (2) = 14 throw statements
2. **Guards** — user.guard (4), tenant.guard (4), permission.guard (2) = 10 throw statements
3. **Authorizer service** — 7 throw statements
4. **SaaS service** — 4 throw statements
5. **User-Access service** — 1 throw statement
6. **Product service** — 1 throw statement
7. **BFF controllers** — 1 throw statement
8. **Cloudinary provider** — 3 throw statements
9. **Decorators/Utils** — 2 throw statements
10. Update existing unit tests to expect `BusinessException`

### Phase C: Frontend (Message Updates)

1. Enhance `ApiError` class in `libs/frontend/utils`
2. Create shared success message helpers
3. **Management-app:**
   - Refactor all toast handlers (17 hooks) → Vietnamese messages
   - Refactor Zod schemas (8 fields) → Vietnamese messages
   - Refactor dialog/UI text (11 components) → Vietnamese
   - Add React Error Boundary
4. **Customer-PWA:**
   - Add Sonner toast library + `<Toaster />`
   - Add React Error Boundary
   - Verify existing Vietnamese messages are consistent

### Cleanup

- Remove old `ERROR_CODE` enum from `libs/constants/src/lib/enum/error-code.enum.ts` (migrate usages)
- Remove old `AUTH_ERROR_CODE` enum from `libs/constants/src/lib/enum/auth-error-code.enum.ts` (migrate usages)
- Keep `HTTP_MESSAGE` enum (used for success responses, not error-specific)

---

## 6. Error Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                            │
│  throw new BusinessException(                                │
│    ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME,                │
│    HttpStatus.CONFLICT                                       │
│  )                                                           │
│         OR                                                   │
│  TypeORM QueryFailedError (race condition)                   │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               EXCEPTION INTERCEPTOR                          │
│  1. BusinessException? → extract errorCode + message         │
│  2. QueryFailedError? → transformDbError() → BusinessExc.    │
│  3. NestJS HttpException? → pass through message             │
│  4. Unknown? → COMMON_INTERNAL_ERROR                         │
│                                                              │
│  Output: ResponseDto {                                       │
│    data: null,                                               │
│    errorCode: "CATALOG_CATEGORY_DUPLICATE_NAME",             │
│    message: "Tên danh mục đã tồn tại",                      │
│    statusCode: 409,                                          │
│    duration: "12ms",                                         │
│    processID: "abc-123"                                      │
│  }                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                TCP TRANSPORT (if microservice)                │
│  Serialized → BFF receives → ExceptionInterceptor formats    │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    HTTP RESPONSE                             │
│  Status: 409                                                 │
│  Body: { errorCode, message, statusCode, duration, processID}│
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND API CLIENT                         │
│  response.ok === false                                       │
│  → parse body → new ApiError(status, body)                   │
│  → ApiError.errorCode = "CATALOG_CATEGORY_DUPLICATE_NAME"    │
│  → ApiError.serverMessage = "Tên danh mục đã tồn tại"       │
└──────────────────────┬──────────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               FRONTEND MUTATION HOOK                         │
│  onError: (error: ApiError) => {                             │
│    toast.error(error.serverMessage)                          │
│    // Shows: "Tên danh mục đã tồn tại"                      │
│    //                                                        │
│    // Can also use error.errorCode for logic:                │
│    // if (error.errorCode === 'AUTH_TOKEN_INVALID')          │
│    //   → redirect to login                                  │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Testing Strategy

### Unit Tests

- `BusinessException`: verify `errorCode`, `message`, `statusCode` extraction
- `getErrorMessage()`: verify locale fallback, param interpolation, missing code handling
- `transformDbError()`: mock `QueryFailedError` with PG codes 23505, 23503, 23502
- Enhanced `ExceptionInterceptor`: verify all 4 error paths (Business, DB, NestJS, Unknown)
- Each service refactoring: update existing tests to expect `BusinessException`

### Integration Tests

- BFF → Microservice: verify `errorCode` propagates through TCP transport
- Frontend: verify `ApiError.errorCode` and `ApiError.serverMessage` parse correctly

---

## 8. Files Affected

### New Files

| File                                                     | Purpose                          |
| -------------------------------------------------------- | -------------------------------- |
| `libs/error-messages/src/lib/error-code.enum.ts`         | All error codes                  |
| `libs/error-messages/src/lib/error-messages.vi.ts`       | Vietnamese messages              |
| `libs/error-messages/src/lib/error-messages.en.ts`       | English messages                 |
| `libs/error-messages/src/lib/success-messages.vi.ts`     | Vietnamese success templates     |
| `libs/error-messages/src/lib/success-messages.en.ts`     | English success templates        |
| `libs/error-messages/src/lib/entity-names.ts`            | Entity name translations         |
| `libs/error-messages/src/lib/error-messages.registry.ts` | Message lookup function          |
| `libs/error-messages/src/lib/business.exception.ts`      | Custom exception class           |
| `libs/error-messages/src/lib/db-error.transformer.ts`    | DB error → BusinessException     |
| `libs/error-messages/src/index.ts`                       | Public exports                   |
| `libs/frontend/utils/src/lib/messages.ts`                | Frontend success message helpers |
| `apps/customer-pwa/src/components/error-boundary.tsx`    | React Error Boundary             |
| `apps/management-app/src/components/error-boundary.tsx`  | React Error Boundary             |

### Modified Files

| File                                                                           | Change                               |
| ------------------------------------------------------------------------------ | ------------------------------------ |
| `tsconfig.base.json`                                                           | Add `@common/error-messages/*` path  |
| `libs/interfaces/src/lib/gateway/response.interface.ts`                        | Add `errorCode?` field               |
| `libs/interceptors/src/lib/exception.interceptor.ts`                           | Handle BusinessException + DB errors |
| `libs/interceptors/src/lib/tcpLogging.interceptor.ts`                          | Handle BusinessException             |
| `libs/frontend/utils/src/lib/api-client.ts`                                    | Enhanced ApiError class              |
| `libs/guards/src/lib/user.guard.ts`                                            | → BusinessException                  |
| `libs/guards/src/lib/tenant.guard.ts`                                          | → BusinessException                  |
| `libs/guards/src/lib/permission.guard.ts`                                      | → BusinessException                  |
| `libs/utils/src/lib/string.util.ts`                                            | → BusinessException                  |
| `libs/decorators/src/lib/userData.decorator.ts`                                | → BusinessException                  |
| `libs/providers/cloudinary/src/lib/cloudinary.service.ts`                      | → BusinessException                  |
| `apps/catalog/src/app/modules/category/services/category.service.ts`           | → BusinessException                  |
| `apps/catalog/src/app/modules/area/services/area.service.ts`                   | → BusinessException                  |
| `apps/catalog/src/app/modules/table/services/table.service.ts`                 | → BusinessException                  |
| `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`         | → BusinessException                  |
| `apps/authorizer/src/app/authorizer/services/authorizer.service.ts`            | → BusinessException                  |
| `apps/authorizer/src/app/authorizer/controllers/authorizer.controller.ts`      | → BusinessException                  |
| `apps/authorizer/src/app/authorizer/controllers/authorizer-grpc.controller.ts` | → BusinessException                  |
| `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts`           | → BusinessException                  |
| `apps/user-access/src/app/modules/user/services/user.service.ts`               | → BusinessException                  |
| `apps/product/src/app/modules/product/services/product.service.ts`             | → BusinessException                  |
| `apps/saas/src/services/saas.service.ts`                                       | → BusinessException                  |
| `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`         | → BusinessException                  |
| `apps/management-app/src/features/tables/hooks/use-tables-mutations.ts`        | Vietnamese toasts                    |
| `apps/management-app/src/features/menu/hooks/use-menu-mutations.ts`            | Vietnamese toasts                    |
| `apps/management-app/src/features/tables/data/schema.ts`                       | Vietnamese Zod messages              |
| `apps/management-app/src/features/menu/data/schema.ts`                         | Vietnamese Zod messages              |
| `apps/management-app/src/features/tables/components/table-delete-dialog.tsx`   | Vietnamese text                      |
| `apps/management-app/src/features/tables/components/area-delete-dialog.tsx`    | Vietnamese text                      |
| `apps/management-app/src/features/menu/components/menu-item-delete-dialog.tsx` | Vietnamese text                      |
| `apps/management-app/src/features/menu/components/category-delete-dialog.tsx`  | Vietnamese text                      |
| All existing `*.spec.ts` test files                                            | Update to expect BusinessException   |

### Deprecated Files (to clean up)

| File                                                  | Action                  |
| ----------------------------------------------------- | ----------------------- |
| `libs/constants/src/lib/enum/error-code.enum.ts`      | Migrate usages → remove |
| `libs/constants/src/lib/enum/auth-error-code.enum.ts` | Migrate usages → remove |

---

## 9. Considerations

- **Backward compatibility:** `errorCode` is optional in ResponseDto — existing frontend code won't break during migration
- **TCP serialization:** `BusinessException` must serialize correctly across NestJS TCP transport. Test this explicitly.
- **class-validator errors:** ValidationPipe returns error arrays — interceptor should map these to `COMMON_VALIDATION_FAILED` with field details in the message
- **i18n expansion:** To add a new language, just create `error-messages.{locale}.ts` and add to the registry map
- **Performance:** Message lookup is O(1) hashmap access — no performance concern
- **Monitoring:** `errorCode` in response enables better error tracking and alerting (group by error code)
