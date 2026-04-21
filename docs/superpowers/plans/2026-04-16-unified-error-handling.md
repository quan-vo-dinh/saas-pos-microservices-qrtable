# Unified Error Handling System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize error handling across the entire QRTable platform with Vietnamese messages, structured error codes, DB constraint catching, and unified frontend error display.

**Architecture:** Create a new shared library `libs/error-messages/` containing ErrorCode enum, localized message maps, BusinessException class, and DB error transformer. Enhance ExceptionInterceptor to handle all error types. Refactor all 43 throw statements across 7 backend services to use BusinessException. Update both frontend apps with Vietnamese messages, Error Boundaries, and toast-based error display.

**Tech Stack:** NestJS (HttpException, RpcException), TypeORM (QueryFailedError), React Error Boundaries, Sonner toast, Zod validation, Nx shared libs

**Spec:** `docs/superpowers/specs/2026-04-15-unified-error-handling-design.md`

---

## File Structure

### New Files

| File                                                                    | Responsibility                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| `libs/error-messages/src/lib/error-code.enum.ts`                        | All 39 error codes as TypeScript enum            |
| `libs/error-messages/src/lib/error-messages.vi.ts`                      | Vietnamese error message map                     |
| `libs/error-messages/src/lib/error-messages.en.ts`                      | English error message map (fallback)             |
| `libs/error-messages/src/lib/success-messages.ts`                       | Success message templates (VI + EN)              |
| `libs/error-messages/src/lib/entity-names.ts`                           | Entity name translations                         |
| `libs/error-messages/src/lib/error-messages.registry.ts`                | `getErrorMessage()` lookup function              |
| `libs/error-messages/src/lib/business.exception.ts`                     | `BusinessException` extending `HttpException`    |
| `libs/error-messages/src/lib/db-error.transformer.ts`                   | TypeORM `QueryFailedError` → `BusinessException` |
| `libs/error-messages/src/lib/__tests__/error-messages.registry.spec.ts` | Unit tests for registry                          |
| `libs/error-messages/src/lib/__tests__/business.exception.spec.ts`      | Unit tests for BusinessException                 |
| `libs/error-messages/src/lib/__tests__/db-error.transformer.spec.ts`    | Unit tests for DB transformer                    |
| `libs/error-messages/src/index.ts`                                      | Public API re-exports                            |
| `libs/error-messages/project.json`                                      | Nx project config                                |
| `libs/error-messages/tsconfig.json`                                     | TypeScript config                                |
| `libs/error-messages/tsconfig.lib.json`                                 | Library build config                             |
| `libs/error-messages/tsconfig.spec.json`                                | Test config                                      |
| `libs/error-messages/jest.config.ts`                                    | Jest config                                      |
| `libs/frontend/utils/src/lib/messages.ts`                               | Frontend success message helpers                 |
| `apps/management-app/src/components/error-boundary.tsx`                 | React Error Boundary for management-app          |
| `apps/customer-pwa/src/components/error-boundary.tsx`                   | React Error Boundary for customer-pwa            |

### Modified Files

| File                                                                           | Change                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------ |
| `tsconfig.base.json`                                                           | Add `@common/error-messages/*` path alias        |
| `libs/interfaces/src/lib/gateway/response.interface.ts`                        | Add optional `errorCode` field                   |
| `libs/interceptors/src/lib/exception.interceptor.ts`                           | Handle BusinessException + DB errors             |
| `libs/interceptors/src/lib/tcpLogging.interceptor.ts`                          | Propagate errorCode through TCP                  |
| `libs/frontend/utils/src/lib/api-client.ts`                                    | Enhanced ApiError with errorCode + serverMessage |
| `libs/guards/src/lib/user.guard.ts`                                            | Use BusinessException (4 throw sites)            |
| `libs/guards/src/lib/tenant.guard.ts`                                          | Use BusinessException (4 throw sites)            |
| `libs/guards/src/lib/permission.guard.ts`                                      | Use BusinessException (2 throw sites)            |
| `libs/utils/src/lib/string.util.ts`                                            | Use BusinessException (1 throw site)             |
| `libs/decorators/src/lib/userData.decorator.ts`                                | Use BusinessException (1 throw site)             |
| `libs/providers/cloudinary/src/lib/cloudinary.service.ts`                      | Use BusinessException (3 throw sites)            |
| `apps/catalog/src/app/modules/category/services/category.service.ts`           | Use BusinessException (5 throw sites)            |
| `apps/catalog/src/app/modules/area/services/area.service.ts`                   | Use BusinessException (5 throw sites)            |
| `apps/catalog/src/app/modules/table/services/table.service.ts`                 | Use BusinessException (10 throw sites)           |
| `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`         | Use BusinessException (5 throw sites)            |
| `apps/authorizer/src/app/authorizer/services/authorizer.service.ts`            | Use BusinessException (5 throw sites)            |
| `apps/authorizer/src/app/authorizer/controllers/authorizer.controller.ts`      | Use BusinessException (1 throw site)             |
| `apps/authorizer/src/app/authorizer/controllers/authorizer-grpc.controller.ts` | Handle BusinessException in catch                |
| `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts`           | Use BusinessException (1 throw site)             |
| `apps/user-access/src/app/modules/user/services/user.service.ts`               | Use BusinessException (1 throw site)             |
| `apps/product/src/app/modules/product/services/product.service.ts`             | Use BusinessException (1 throw site)             |
| `apps/saas/src/services/saas.service.ts`                                       | Use BusinessException (4 throw sites)            |
| `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts`         | Use BusinessException (1 throw site)             |
| `apps/catalog/src/app/modules/category/tests/category.service.spec.ts`         | Update to expect BusinessException               |
| `apps/catalog/src/app/modules/area/tests/area.service.spec.ts`                 | Update to expect BusinessException               |
| `apps/catalog/src/app/modules/table/tests/table.service.spec.ts`               | Update to expect BusinessException               |
| `apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts`       | Update to expect BusinessException               |
| `apps/management-app/src/features/tables/hooks/use-tables-mutations.ts`        | Vietnamese toast messages                        |
| `apps/management-app/src/features/menu/hooks/use-menu-mutations.ts`            | Vietnamese toast messages                        |
| `apps/management-app/src/features/tables/data/schema.ts`                       | Vietnamese Zod messages                          |
| `apps/management-app/src/features/menu/data/schema.ts`                         | Vietnamese Zod messages                          |
| `apps/management-app/src/features/tables/components/area-delete-dialog.tsx`    | Vietnamese UI text                               |
| `apps/management-app/src/features/tables/components/table-delete-dialog.tsx`   | Vietnamese UI text                               |
| `apps/management-app/src/features/menu/components/category-delete-dialog.tsx`  | Vietnamese UI text                               |
| `apps/management-app/src/features/menu/components/menu-item-delete-dialog.tsx` | Vietnamese UI text                               |
| `apps/management-app/src/app/layout.tsx`                                       | Wrap with Error Boundary                         |
| `apps/customer-pwa/src/App.tsx`                                                | Add Toaster + Error Boundary                     |

### Deprecated (to remove after migration)

| File                                                  | Action                                     |
| ----------------------------------------------------- | ------------------------------------------ |
| `libs/constants/src/lib/enum/error-code.enum.ts`      | Remove after migrating user-access         |
| `libs/constants/src/lib/enum/auth-error-code.enum.ts` | Remove after migrating authorizer + guards |

---

## Phase A: Foundation (Shared Library)

### Task 1: Scaffold `libs/error-messages` shared library

**Files:**

- Create: `libs/error-messages/project.json`
- Create: `libs/error-messages/tsconfig.json`
- Create: `libs/error-messages/tsconfig.lib.json`
- Create: `libs/error-messages/tsconfig.spec.json`
- Create: `libs/error-messages/jest.config.ts`
- Create: `libs/error-messages/src/index.ts`
- Modify: `tsconfig.base.json`

- [ ] **Step 1: Generate the library with Nx**

```bash
npx nx g @nx/node:lib error-messages --directory=libs/error-messages --unitTestRunner=jest --strict
```

- [ ] **Step 2: Add path alias to `tsconfig.base.json`**

Add to `compilerOptions.paths`:

```json
"@common/error-messages/*": ["libs/error-messages/src/lib/*"]
```

- [ ] **Step 3: Verify library is recognized by Nx**

Run: `npx nx show project error-messages`
Expected: Shows project configuration with sourceRoot `libs/error-messages/src`

---

### Task 2: Create ErrorCode enum

**Files:**

- Create: `libs/error-messages/src/lib/error-code.enum.ts`

- [ ] **Step 1: Create the ErrorCode enum with all 39 codes**

```typescript
// libs/error-messages/src/lib/error-code.enum.ts

export enum ErrorCode {
  // ─── AUTH ──────────────────────────────────────────
  AUTH_TOKEN_NOT_PROVIDED = 'AUTH_TOKEN_NOT_PROVIDED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_USER_NOT_PROVISIONED = 'AUTH_USER_NOT_PROVISIONED',
  AUTH_ROLE_MAPPING_MISMATCH = 'AUTH_ROLE_MAPPING_MISMATCH',
  AUTH_USER_DATA_NOT_FOUND = 'AUTH_USER_DATA_NOT_FOUND',
  AUTH_PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',

  // ─── TENANT ────────────────────────────────────────
  TENANT_REQUIRED = 'TENANT_REQUIRED',
  TENANT_MISMATCH_IDENTITY = 'TENANT_MISMATCH_IDENTITY',
  TENANT_SESSION_NOT_FOUND = 'TENANT_SESSION_NOT_FOUND',
  TENANT_MISMATCH_SESSION = 'TENANT_MISMATCH_SESSION',

  // ─── CATALOG — Category ────────────────────────────
  CATALOG_CATEGORY_DUPLICATE_NAME = 'CATALOG_CATEGORY_DUPLICATE_NAME',
  CATALOG_CATEGORY_NOT_FOUND = 'CATALOG_CATEGORY_NOT_FOUND',
  CATALOG_CATEGORY_HAS_ACTIVE_ITEMS = 'CATALOG_CATEGORY_HAS_ACTIVE_ITEMS',

  // ─── CATALOG — Area ────────────────────────────────
  CATALOG_AREA_DUPLICATE_NAME = 'CATALOG_AREA_DUPLICATE_NAME',
  CATALOG_AREA_NOT_FOUND = 'CATALOG_AREA_NOT_FOUND',
  CATALOG_AREA_HAS_TABLES = 'CATALOG_AREA_HAS_TABLES',

  // ─── CATALOG — Table ──────────────────────────────
  CATALOG_TABLE_DUPLICATE_NAME = 'CATALOG_TABLE_DUPLICATE_NAME',
  CATALOG_TABLE_NOT_FOUND = 'CATALOG_TABLE_NOT_FOUND',
  CATALOG_TABLE_AREA_NOT_FOUND = 'CATALOG_TABLE_AREA_NOT_FOUND',
  CATALOG_TABLE_CANNOT_DELETE_ACTIVE = 'CATALOG_TABLE_CANNOT_DELETE_ACTIVE',
  CATALOG_TABLE_INVALID_TRANSITION = 'CATALOG_TABLE_INVALID_TRANSITION',
  CATALOG_TABLE_INVALID_QR_TOKEN = 'CATALOG_TABLE_INVALID_QR_TOKEN',

  // ─── CATALOG — MenuItem ────────────────────────────
  CATALOG_MENU_ITEM_NOT_FOUND = 'CATALOG_MENU_ITEM_NOT_FOUND',
  CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND = 'CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND',

  // ─── PRODUCT ──────────────────────────────────────
  PRODUCT_ALREADY_EXISTS = 'PRODUCT_ALREADY_EXISTS',

  // ─── USER ─────────────────────────────────────────
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',

  // ─── SAAS ─────────────────────────────────────────
  SAAS_TENANT_NAME_REQUIRED = 'SAAS_TENANT_NAME_REQUIRED',
  SAAS_TENANT_ALREADY_EXISTS = 'SAAS_TENANT_ALREADY_EXISTS',
  SAAS_TENANT_NOT_FOUND = 'SAAS_TENANT_NOT_FOUND',

  // ─── UPLOAD ───────────────────────────────────────
  UPLOAD_FILE_REQUIRED = 'UPLOAD_FILE_REQUIRED',
  UPLOAD_FILE_TOO_LARGE = 'UPLOAD_FILE_TOO_LARGE',
  UPLOAD_INVALID_FILE_TYPE = 'UPLOAD_INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // ─── COMMON ───────────────────────────────────────
  COMMON_DB_UNIQUE_VIOLATION = 'COMMON_DB_UNIQUE_VIOLATION',
  COMMON_DB_FK_VIOLATION = 'COMMON_DB_FK_VIOLATION',
  COMMON_DB_NOT_NULL_VIOLATION = 'COMMON_DB_NOT_NULL_VIOLATION',
  COMMON_VALIDATION_FAILED = 'COMMON_VALIDATION_FAILED',
  COMMON_INTERNAL_ERROR = 'COMMON_INTERNAL_ERROR',

  // ─── KEYCLOAK ─────────────────────────────────────
  KEYCLOAK_USER_CREATION_FAILED = 'KEYCLOAK_USER_CREATION_FAILED',
}
```

---

### Task 3: Create Vietnamese & English message maps

**Files:**

- Create: `libs/error-messages/src/lib/error-messages.vi.ts`
- Create: `libs/error-messages/src/lib/error-messages.en.ts`

- [ ] **Step 1: Create Vietnamese message map**

```typescript
// libs/error-messages/src/lib/error-messages.vi.ts
import { ErrorCode } from './error-code.enum';

export const ERROR_MESSAGES_VI: Record<ErrorCode, string> = {
  // AUTH
  [ErrorCode.AUTH_TOKEN_NOT_PROVIDED]: 'Token xác thực không được cung cấp',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Token không hợp lệ hoặc đã hết hạn',
  [ErrorCode.AUTH_USER_NOT_PROVISIONED]: 'Tài khoản chưa được kích hoạt trong hệ thống',
  [ErrorCode.AUTH_ROLE_MAPPING_MISMATCH]: 'Vai trò người dùng không khớp giữa hệ thống',
  [ErrorCode.AUTH_USER_DATA_NOT_FOUND]: 'Không tìm thấy thông tin người dùng',
  [ErrorCode.AUTH_PERMISSION_DENIED]: 'Bạn không có quyền thực hiện thao tác này',

  // TENANT
  [ErrorCode.TENANT_REQUIRED]: 'Thông tin cửa hàng là bắt buộc',
  [ErrorCode.TENANT_MISMATCH_IDENTITY]: 'Cửa hàng không khớp với tài khoản của bạn',
  [ErrorCode.TENANT_SESSION_NOT_FOUND]: 'Phiên làm việc không tìm thấy',
  [ErrorCode.TENANT_MISMATCH_SESSION]: 'Cửa hàng không khớp với phiên làm việc',

  // CATALOG — Category
  [ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME]: 'Tên danh mục đã tồn tại',
  [ErrorCode.CATALOG_CATEGORY_NOT_FOUND]: 'Danh mục không tìm thấy',
  [ErrorCode.CATALOG_CATEGORY_HAS_ACTIVE_ITEMS]: 'Không thể xóa danh mục đang có món hoạt động',

  // CATALOG — Area
  [ErrorCode.CATALOG_AREA_DUPLICATE_NAME]: 'Tên khu vực đã tồn tại',
  [ErrorCode.CATALOG_AREA_NOT_FOUND]: 'Khu vực không tìm thấy',
  [ErrorCode.CATALOG_AREA_HAS_TABLES]: 'Không thể xóa khu vực đang có bàn',

  // CATALOG — Table
  [ErrorCode.CATALOG_TABLE_DUPLICATE_NAME]: 'Tên bàn đã tồn tại',
  [ErrorCode.CATALOG_TABLE_NOT_FOUND]: 'Bàn không tìm thấy',
  [ErrorCode.CATALOG_TABLE_AREA_NOT_FOUND]: 'Khu vực không tồn tại trong cửa hàng này',
  [ErrorCode.CATALOG_TABLE_CANNOT_DELETE_ACTIVE]: 'Không thể xóa bàn đang hoạt động',
  [ErrorCode.CATALOG_TABLE_INVALID_TRANSITION]:
    'Chuyển trạng thái bàn không hợp lệ: {{current}} → {{new}}. Cho phép: {{allowed}}',
  [ErrorCode.CATALOG_TABLE_INVALID_QR_TOKEN]: 'Mã QR không hợp lệ hoặc đã hết hạn',

  // CATALOG — MenuItem
  [ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND]: 'Món ăn không tìm thấy',
  [ErrorCode.CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND]: 'Danh mục không tồn tại trong cửa hàng này',

  // PRODUCT
  [ErrorCode.PRODUCT_ALREADY_EXISTS]: 'Sản phẩm đã tồn tại',

  // USER
  [ErrorCode.USER_ALREADY_EXISTS]: 'Tài khoản đã tồn tại',

  // SAAS
  [ErrorCode.SAAS_TENANT_NAME_REQUIRED]: 'Tên cửa hàng là bắt buộc',
  [ErrorCode.SAAS_TENANT_ALREADY_EXISTS]: 'Cửa hàng đã tồn tại',
  [ErrorCode.SAAS_TENANT_NOT_FOUND]: 'Cửa hàng không tìm thấy',

  // UPLOAD
  [ErrorCode.UPLOAD_FILE_REQUIRED]: 'Vui lòng chọn tệp để tải lên',
  [ErrorCode.UPLOAD_FILE_TOO_LARGE]: 'Kích thước tệp vượt quá giới hạn 5MB',
  [ErrorCode.UPLOAD_INVALID_FILE_TYPE]: 'Loại tệp không hợp lệ. Cho phép: jpeg, png, webp',
  [ErrorCode.UPLOAD_FAILED]: 'Tải ảnh lên thất bại, vui lòng thử lại',

  // COMMON
  [ErrorCode.COMMON_DB_UNIQUE_VIOLATION]: 'Dữ liệu đã tồn tại (vi phạm ràng buộc duy nhất)',
  [ErrorCode.COMMON_DB_FK_VIOLATION]: 'Dữ liệu tham chiếu không tồn tại',
  [ErrorCode.COMMON_DB_NOT_NULL_VIOLATION]: 'Trường bắt buộc không được để trống',
  [ErrorCode.COMMON_VALIDATION_FAILED]: 'Dữ liệu không hợp lệ',
  [ErrorCode.COMMON_INTERNAL_ERROR]: 'Lỗi hệ thống, vui lòng thử lại sau',

  // KEYCLOAK
  [ErrorCode.KEYCLOAK_USER_CREATION_FAILED]: 'Không thể tạo tài khoản trên hệ thống xác thực',
};
```

- [ ] **Step 2: Create English message map**

```typescript
// libs/error-messages/src/lib/error-messages.en.ts
import { ErrorCode } from './error-code.enum';

export const ERROR_MESSAGES_EN: Record<ErrorCode, string> = {
  [ErrorCode.AUTH_TOKEN_NOT_PROVIDED]: 'Authentication token is required',
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Invalid or expired token',
  [ErrorCode.AUTH_USER_NOT_PROVISIONED]: 'User account not provisioned in the system',
  [ErrorCode.AUTH_ROLE_MAPPING_MISMATCH]: 'Role mapping mismatch between systems',
  [ErrorCode.AUTH_USER_DATA_NOT_FOUND]: 'User data not found',
  [ErrorCode.AUTH_PERMISSION_DENIED]: 'You do not have permission to perform this action',
  [ErrorCode.TENANT_REQUIRED]: 'Tenant information is required',
  [ErrorCode.TENANT_MISMATCH_IDENTITY]: 'Tenant mismatch with user identity',
  [ErrorCode.TENANT_SESSION_NOT_FOUND]: 'Tenant session not found',
  [ErrorCode.TENANT_MISMATCH_SESSION]: 'Tenant mismatch with session',
  [ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME]: 'Category name already exists',
  [ErrorCode.CATALOG_CATEGORY_NOT_FOUND]: 'Category not found',
  [ErrorCode.CATALOG_CATEGORY_HAS_ACTIVE_ITEMS]: 'Cannot delete category with active menu items',
  [ErrorCode.CATALOG_AREA_DUPLICATE_NAME]: 'Area name already exists',
  [ErrorCode.CATALOG_AREA_NOT_FOUND]: 'Area not found',
  [ErrorCode.CATALOG_AREA_HAS_TABLES]: 'Cannot delete area with tables',
  [ErrorCode.CATALOG_TABLE_DUPLICATE_NAME]: 'Table name already exists',
  [ErrorCode.CATALOG_TABLE_NOT_FOUND]: 'Table not found',
  [ErrorCode.CATALOG_TABLE_AREA_NOT_FOUND]: 'Area not found in this tenant',
  [ErrorCode.CATALOG_TABLE_CANNOT_DELETE_ACTIVE]: 'Cannot delete active table',
  [ErrorCode.CATALOG_TABLE_INVALID_TRANSITION]:
    'Invalid status transition: {{current}} → {{new}}. Allowed: {{allowed}}',
  [ErrorCode.CATALOG_TABLE_INVALID_QR_TOKEN]: 'Invalid or expired QR token',
  [ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND]: 'Menu item not found',
  [ErrorCode.CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND]: 'Category not found in this tenant',
  [ErrorCode.PRODUCT_ALREADY_EXISTS]: 'Product already exists',
  [ErrorCode.USER_ALREADY_EXISTS]: 'User already exists',
  [ErrorCode.SAAS_TENANT_NAME_REQUIRED]: 'Tenant name is required',
  [ErrorCode.SAAS_TENANT_ALREADY_EXISTS]: 'Tenant already exists',
  [ErrorCode.SAAS_TENANT_NOT_FOUND]: 'Tenant not found',
  [ErrorCode.UPLOAD_FILE_REQUIRED]: 'File is required',
  [ErrorCode.UPLOAD_FILE_TOO_LARGE]: 'File size exceeds 5MB limit',
  [ErrorCode.UPLOAD_INVALID_FILE_TYPE]: 'Invalid file type. Allowed: jpeg, png, webp',
  [ErrorCode.UPLOAD_FAILED]: 'Image upload failed, please try again',
  [ErrorCode.COMMON_DB_UNIQUE_VIOLATION]: 'Data already exists (unique constraint violation)',
  [ErrorCode.COMMON_DB_FK_VIOLATION]: 'Referenced data does not exist',
  [ErrorCode.COMMON_DB_NOT_NULL_VIOLATION]: 'Required field cannot be null',
  [ErrorCode.COMMON_VALIDATION_FAILED]: 'Validation failed',
  [ErrorCode.COMMON_INTERNAL_ERROR]: 'Internal server error, please try again later',
  [ErrorCode.KEYCLOAK_USER_CREATION_FAILED]: 'Failed to create user in authentication system',
};
```

---

### Task 4: Create success messages & entity names

**Files:**

- Create: `libs/error-messages/src/lib/success-messages.ts`
- Create: `libs/error-messages/src/lib/entity-names.ts`

- [ ] **Step 1: Create success message templates**

```typescript
// libs/error-messages/src/lib/success-messages.ts

export type SupportedLocale = 'vi' | 'en';

export enum SuccessCode {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  REORDERED = 'REORDERED',
  IMAGE_UPLOADED = 'IMAGE_UPLOADED',
  QR_REGENERATED = 'QR_REGENERATED',
  STATUS_UPDATED = 'STATUS_UPDATED',
}

const SUCCESS_MESSAGES: Record<SupportedLocale, Record<SuccessCode, string>> = {
  vi: {
    [SuccessCode.CREATED]: '{{entity}} đã được tạo thành công',
    [SuccessCode.UPDATED]: '{{entity}} đã được cập nhật thành công',
    [SuccessCode.DELETED]: '{{entity}} đã được xóa',
    [SuccessCode.REORDERED]: 'Đã sắp xếp lại {{entity}}',
    [SuccessCode.IMAGE_UPLOADED]: 'Ảnh đã được tải lên thành công',
    [SuccessCode.QR_REGENERATED]: 'Mã QR đã được tạo lại',
    [SuccessCode.STATUS_UPDATED]: 'Trạng thái đã được cập nhật',
  },
  en: {
    [SuccessCode.CREATED]: '{{entity}} created successfully',
    [SuccessCode.UPDATED]: '{{entity}} updated successfully',
    [SuccessCode.DELETED]: '{{entity}} deleted',
    [SuccessCode.REORDERED]: '{{entity}} reordered',
    [SuccessCode.IMAGE_UPLOADED]: 'Image uploaded successfully',
    [SuccessCode.QR_REGENERATED]: 'QR code regenerated',
    [SuccessCode.STATUS_UPDATED]: 'Status updated',
  },
};

export function getSuccessMessage(code: SuccessCode, entity?: string, locale: SupportedLocale = 'vi'): string {
  const template = SUCCESS_MESSAGES[locale]?.[code] ?? SUCCESS_MESSAGES['vi'][code];
  if (entity) {
    return template.replace('{{entity}}', entity);
  }
  return template;
}
```

- [ ] **Step 2: Create entity name translations**

```typescript
// libs/error-messages/src/lib/entity-names.ts
import type { SupportedLocale } from './success-messages';

export type EntityKey = 'category' | 'area' | 'table' | 'menuItem' | 'product' | 'tenant' | 'user';

const ENTITY_NAMES: Record<SupportedLocale, Record<EntityKey, string>> = {
  vi: {
    category: 'Danh mục',
    area: 'Khu vực',
    table: 'Bàn',
    menuItem: 'Món ăn',
    product: 'Sản phẩm',
    tenant: 'Cửa hàng',
    user: 'Tài khoản',
  },
  en: {
    category: 'Category',
    area: 'Area',
    table: 'Table',
    menuItem: 'Menu item',
    product: 'Product',
    tenant: 'Tenant',
    user: 'User',
  },
};

export function getEntityName(key: EntityKey, locale: SupportedLocale = 'vi'): string {
  return ENTITY_NAMES[locale]?.[key] ?? ENTITY_NAMES['vi'][key];
}
```

---

### Task 5: Create error message registry

**Files:**

- Create: `libs/error-messages/src/lib/error-messages.registry.ts`
- Create: `libs/error-messages/src/lib/__tests__/error-messages.registry.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// libs/error-messages/src/lib/__tests__/error-messages.registry.spec.ts
import { getErrorMessage } from '../error-messages.registry';
import { ErrorCode } from '../error-code.enum';

describe('getErrorMessage', () => {
  it('should return Vietnamese message by default', () => {
    const result = getErrorMessage(ErrorCode.CATALOG_CATEGORY_NOT_FOUND);
    expect(result).toBe('Danh mục không tìm thấy');
  });

  it('should return English message when locale is en', () => {
    const result = getErrorMessage(ErrorCode.CATALOG_CATEGORY_NOT_FOUND, 'en');
    expect(result).toBe('Category not found');
  });

  it('should interpolate params with {{key}} syntax', () => {
    const result = getErrorMessage(ErrorCode.CATALOG_TABLE_INVALID_TRANSITION, 'vi', {
      current: 'available',
      new: 'cleaning',
      allowed: 'occupied',
    });
    expect(result).toBe('Chuyển trạng thái bàn không hợp lệ: available → cleaning. Cho phép: occupied');
  });

  it('should fallback to Vietnamese if locale not found', () => {
    const result = getErrorMessage(ErrorCode.AUTH_TOKEN_INVALID, 'fr' as 'vi');
    expect(result).toBe('Token không hợp lệ hoặc đã hết hạn');
  });

  it('should return error code string if code not in map', () => {
    const result = getErrorMessage('UNKNOWN_CODE' as ErrorCode);
    expect(result).toBe('UNKNOWN_CODE');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test error-messages --testPathPattern=error-messages.registry`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the registry**

```typescript
// libs/error-messages/src/lib/error-messages.registry.ts
import { ErrorCode } from './error-code.enum';
import { ERROR_MESSAGES_VI } from './error-messages.vi';
import { ERROR_MESSAGES_EN } from './error-messages.en';

export type SupportedLocale = 'vi' | 'en';

const DEFAULT_LOCALE: SupportedLocale = 'vi';

const MESSAGES: Record<SupportedLocale, Record<ErrorCode, string>> = {
  vi: ERROR_MESSAGES_VI,
  en: ERROR_MESSAGES_EN,
};

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test error-messages --testPathPattern=error-messages.registry`
Expected: ALL PASS

---

### Task 6: Create BusinessException class

**Files:**

- Create: `libs/error-messages/src/lib/business.exception.ts`
- Create: `libs/error-messages/src/lib/__tests__/business.exception.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// libs/error-messages/src/lib/__tests__/business.exception.spec.ts
import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../business.exception';
import { ErrorCode } from '../error-code.enum';

describe('BusinessException', () => {
  it('should create exception with errorCode and Vietnamese message', () => {
    const exception = new BusinessException(ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME, HttpStatus.CONFLICT);

    expect(exception.errorCode).toBe('CATALOG_CATEGORY_DUPLICATE_NAME');
    expect(exception.getStatus()).toBe(409);

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response.errorCode).toBe('CATALOG_CATEGORY_DUPLICATE_NAME');
    expect(response.message).toBe('Tên danh mục đã tồn tại');
    expect(response.statusCode).toBe(409);
  });

  it('should interpolate params in message', () => {
    const exception = new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_TRANSITION, HttpStatus.BAD_REQUEST, {
      current: 'available',
      new: 'cleaning',
      allowed: 'occupied',
    });

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response.message).toBe('Chuyển trạng thái bàn không hợp lệ: available → cleaning. Cho phép: occupied');
  });

  it('should support English locale', () => {
    const exception = new BusinessException(ErrorCode.CATALOG_AREA_NOT_FOUND, HttpStatus.NOT_FOUND, undefined, 'en');

    const response = exception.getResponse() as Record<string, unknown>;
    expect(response.message).toBe('Area not found');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test error-messages --testPathPattern=business.exception`
Expected: FAIL

- [ ] **Step 3: Implement BusinessException**

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test error-messages --testPathPattern=business.exception`
Expected: ALL PASS

---

### Task 7: Create DB error transformer

**Files:**

- Create: `libs/error-messages/src/lib/db-error.transformer.ts`
- Create: `libs/error-messages/src/lib/__tests__/db-error.transformer.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// libs/error-messages/src/lib/__tests__/db-error.transformer.spec.ts
import { transformDbError } from '../db-error.transformer';
import { BusinessException } from '../business.exception';
import { ErrorCode } from '../error-code.enum';
import { QueryFailedError } from 'typeorm';

function createQueryFailedError(pgCode: string): QueryFailedError {
  const error = new QueryFailedError('SELECT', [], new Error('db error') as never);
  (error as unknown as Record<string, unknown>).driverError = { code: pgCode };
  return error;
}

describe('transformDbError', () => {
  it('should transform unique violation (23505) to COMMON_DB_UNIQUE_VIOLATION', () => {
    const dbError = createQueryFailedError('23505');
    const result = transformDbError(dbError);

    expect(result).toBeInstanceOf(BusinessException);
    expect(result!.errorCode).toBe(ErrorCode.COMMON_DB_UNIQUE_VIOLATION);
    expect(result!.getStatus()).toBe(409);
  });

  it('should transform FK violation (23503) to COMMON_DB_FK_VIOLATION', () => {
    const dbError = createQueryFailedError('23503');
    const result = transformDbError(dbError);

    expect(result).toBeInstanceOf(BusinessException);
    expect(result!.errorCode).toBe(ErrorCode.COMMON_DB_FK_VIOLATION);
    expect(result!.getStatus()).toBe(400);
  });

  it('should transform not-null violation (23502) to COMMON_DB_NOT_NULL_VIOLATION', () => {
    const dbError = createQueryFailedError('23502');
    const result = transformDbError(dbError);

    expect(result).toBeInstanceOf(BusinessException);
    expect(result!.errorCode).toBe(ErrorCode.COMMON_DB_NOT_NULL_VIOLATION);
    expect(result!.getStatus()).toBe(400);
  });

  it('should return null for unknown PG error code', () => {
    const dbError = createQueryFailedError('42601');
    const result = transformDbError(dbError);
    expect(result).toBeNull();
  });

  it('should return null for non-QueryFailedError', () => {
    const result = transformDbError(new Error('random error'));
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx nx test error-messages --testPathPattern=db-error.transformer`
Expected: FAIL

- [ ] **Step 3: Implement DB error transformer**

```typescript
// libs/error-messages/src/lib/db-error.transformer.ts
import { HttpStatus } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ErrorCode } from './error-code.enum';
import { BusinessException } from './business.exception';

interface DriverError {
  code?: string;
  detail?: string;
  constraint?: string;
}

const PG_ERROR_MAP: Record<string, { errorCode: ErrorCode; statusCode: HttpStatus }> = {
  '23505': { errorCode: ErrorCode.COMMON_DB_UNIQUE_VIOLATION, statusCode: HttpStatus.CONFLICT },
  '23503': { errorCode: ErrorCode.COMMON_DB_FK_VIOLATION, statusCode: HttpStatus.BAD_REQUEST },
  '23502': { errorCode: ErrorCode.COMMON_DB_NOT_NULL_VIOLATION, statusCode: HttpStatus.BAD_REQUEST },
};

export function transformDbError(error: unknown): BusinessException | null {
  if (!(error instanceof QueryFailedError)) {
    return null;
  }

  const driverError = (error as QueryFailedError & { driverError?: DriverError }).driverError;
  const pgCode = driverError?.code;

  if (pgCode && PG_ERROR_MAP[pgCode]) {
    const { errorCode, statusCode } = PG_ERROR_MAP[pgCode];
    return new BusinessException(errorCode, statusCode);
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx nx test error-messages --testPathPattern=db-error.transformer`
Expected: ALL PASS

---

### Task 8: Wire up index.ts exports

**Files:**

- Modify: `libs/error-messages/src/index.ts`

- [ ] **Step 1: Export all public APIs**

```typescript
// libs/error-messages/src/index.ts
export { ErrorCode } from './lib/error-code.enum';
export { BusinessException } from './lib/business.exception';
export type { BusinessExceptionResponse } from './lib/business.exception';
export { getErrorMessage } from './lib/error-messages.registry';
export type { SupportedLocale } from './lib/error-messages.registry';
export { transformDbError } from './lib/db-error.transformer';
export { SuccessCode, getSuccessMessage } from './lib/success-messages';
export { getEntityName } from './lib/entity-names';
export type { EntityKey } from './lib/entity-names';
```

- [ ] **Step 2: Run all tests for the library**

Run: `npx nx test error-messages`
Expected: ALL PASS (all 3 test suites)

- [ ] **Step 3: Commit**

```bash
git add libs/error-messages/ tsconfig.base.json
git commit -m "feat(error-messages): add shared error handling library

- ErrorCode enum with 39 codes
- Vietnamese + English message maps
- BusinessException class
- DB error transformer (PG 23505, 23503, 23502)
- Success message templates + entity names
- Full test coverage"
```

---

### Task 9: Enhance ResponseDto with errorCode

**Files:**

- Modify: `libs/interfaces/src/lib/gateway/response.interface.ts`

- [ ] **Step 1: Add optional errorCode field**

Replace the current `ResponseDto` with:

```typescript
// libs/interfaces/src/lib/gateway/response.interface.ts
import { HttpStatus } from '@nestjs/common';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T> {
  @ApiProperty({ type: String })
  message = HTTP_MESSAGE.OK;

  @ApiProperty()
  data?: T;

  @ApiProperty()
  processID?: string;

  @ApiProperty({ type: Number })
  statusCode = HttpStatus.OK;

  @ApiProperty({ type: String })
  duration?: string;

  @ApiProperty({ type: String, required: false })
  errorCode?: string;

  constructor(data?: Partial<ResponseDto<T>>) {
    if (data) Object.assign(this, data);
  }
}
```

---

### Task 10: Enhance ExceptionInterceptor

**Files:**

- Modify: `libs/interceptors/src/lib/exception.interceptor.ts`

- [ ] **Step 1: Replace the entire exception interceptor**

```typescript
// libs/interceptors/src/lib/exception.interceptor.ts
import { CallHandler, ExecutionContext, HttpException, HttpStatus, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, map } from 'rxjs';
import { Request } from 'express';
import { MetadataKey } from '@common/constants/common.constant';
import { ResponseDto } from '@common/interfaces/gateway/response.interface';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { BusinessException, BusinessExceptionResponse } from '@common/error-messages/business.exception';
import { transformDbError } from '@common/error-messages/db-error.transformer';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { getErrorMessage } from '@common/error-messages/error-messages.registry';

export class ExceptionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ExceptionInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request: Request & { [MetadataKey.PROCESSID]: string; [MetadataKey.STARTTIME]: number } = ctx.getRequest();

    const processID = request[MetadataKey.PROCESSID];
    const startTime = request[MetadataKey.STARTTIME];

    return next.handle().pipe(
      map((data: ResponseDto<unknown>) => {
        const durationMs = Date.now() - startTime;
        data.processID = processID;
        data.duration = `${durationMs} ms`;
        return data;
      }),
      catchError((error) => {
        this.logger.error({ error });
        const durationMs = Date.now() - startTime;

        // 1. BusinessException — extract errorCode + message directly
        if (error instanceof BusinessException) {
          const response = error.getResponse() as BusinessExceptionResponse;
          throw new HttpException(
            new ResponseDto({
              data: null,
              errorCode: response.errorCode,
              message: response.message,
              statusCode: response.statusCode,
              duration: `${durationMs} ms`,
              processID,
            }),
            response.statusCode,
          );
        }

        // 2. TypeORM QueryFailedError — transform to BusinessException
        const dbError = transformDbError(error);
        if (dbError) {
          const response = dbError.getResponse() as BusinessExceptionResponse;
          throw new HttpException(
            new ResponseDto({
              data: null,
              errorCode: response.errorCode,
              message: response.message,
              statusCode: response.statusCode,
              duration: `${durationMs} ms`,
              processID,
            }),
            response.statusCode,
          );
        }

        // 3. Standard NestJS HttpException (NotFoundException, BadRequestException, etc.)
        if (error instanceof HttpException) {
          const statusCode = error.getStatus();
          const response = error.getResponse();
          const message =
            typeof response === 'string'
              ? response
              : ((response as Record<string, unknown>)?.message ?? HTTP_MESSAGE.INTERNAL_SERVER_ERROR);

          throw new HttpException(
            new ResponseDto({
              data: null,
              message: Array.isArray(message) ? message.join(', ') : String(message),
              statusCode,
              duration: `${durationMs} ms`,
              processID,
            }),
            statusCode,
          );
        }

        // 4. Unknown error — fallback
        const message = getErrorMessage(ErrorCode.COMMON_INTERNAL_ERROR);
        throw new HttpException(
          new ResponseDto({
            data: null,
            errorCode: ErrorCode.COMMON_INTERNAL_ERROR,
            message,
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            duration: `${durationMs} ms`,
            processID,
          }),
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }),
    );
  }
}
```

---

### Task 11: Enhance TcpLoggingInterceptor

**Files:**

- Modify: `libs/interceptors/src/lib/tcpLogging.interceptor.ts`

- [ ] **Step 1: Update to propagate errorCode through TCP**

```typescript
// libs/interceptors/src/lib/tcpLogging.interceptor.ts
import { CallHandler, ExecutionContext, HttpStatus, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { catchError, Observable, tap } from 'rxjs';
import { RpcException } from '@nestjs/microservices';
import { HTTP_MESSAGE } from '@common/constants/enum/http-message.enum';
import { BusinessException, BusinessExceptionResponse } from '@common/error-messages/business.exception';
import { transformDbError } from '@common/error-messages/db-error.transformer';

@Injectable()
export class TcpLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const now = Date.now();
    const handler = context.getHandler();
    const handlerName = handler.name || 'unknown_handler';

    const args = context.getArgs();
    const param = args[0] as Record<string, unknown> | undefined;
    const processId = (param?.processId as string) || 'unknown_process_id';

    Logger.log(
      `ProcessId: '${processId}' >> method: '${handlerName}' >> at '${now}' >> param: ${JSON.stringify(param)}`,
      TcpLoggingInterceptor.name,
    );

    return next.handle().pipe(
      tap(() =>
        Logger.log(`TCP >> End process '${processId}' >> method: '${handlerName}' after: '${Date.now() - now}ms'`),
      ),
      catchError((error) => {
        const duration = Date.now() - now;
        Logger.error(
          `TCP » Error process '${processId}': ${error.message} >> data: ${JSON.stringify(error)}, after: '${duration}ms'`,
        );

        // BusinessException — propagate errorCode + message
        if (error instanceof BusinessException) {
          const response = error.getResponse() as BusinessExceptionResponse;
          throw new RpcException({
            code: response.statusCode,
            message: response.message,
            errorCode: response.errorCode,
          });
        }

        // TypeORM QueryFailedError — transform then propagate
        const dbError = transformDbError(error);
        if (dbError) {
          const response = dbError.getResponse() as BusinessExceptionResponse;
          throw new RpcException({
            code: response.statusCode,
            message: response.message,
            errorCode: response.errorCode,
          });
        }

        throw new RpcException({
          code: error.status || error.code || error.error?.code || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error?.response?.message || error?.message || HTTP_MESSAGE.INTERNAL_SERVER_ERROR,
        });
      }),
    );
  }
}
```

- [ ] **Step 2: Commit Phase A interceptor changes**

```bash
git add libs/interfaces/ libs/interceptors/
git commit -m "feat(interceptors): enhance error handling with BusinessException + DB error support

- ResponseDto: add optional errorCode field
- ExceptionInterceptor: handle BusinessException, QueryFailedError, standard HttpException
- TcpLoggingInterceptor: propagate errorCode through TCP transport"
```

---

## Phase B: Backend Services (Refactor throw statements)

### Task 12: Refactor Catalog — CategoryService

**Files:**

- Modify: `apps/catalog/src/app/modules/category/services/category.service.ts`
- Modify: `apps/catalog/src/app/modules/category/tests/category.service.spec.ts`

- [ ] **Step 1: Update CategoryService imports and throw statements**

Replace imports at top:

```typescript
// Remove: import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// Add:
import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
```

Replace all 5 throw statements:

| Line | Before                                                                           | After                                                                                           |
| ---- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 28   | `throw new BadRequestException('Category name already exists')`                  | `throw new BusinessException(ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME, HttpStatus.CONFLICT)`   |
| 46   | `throw new NotFoundException('Category not found')`                              | `throw new BusinessException(ErrorCode.CATALOG_CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND)`       |
| 57   | `throw new BadRequestException('Category name already exists')`                  | `throw new BusinessException(ErrorCode.CATALOG_CATEGORY_DUPLICATE_NAME, HttpStatus.CONFLICT)`   |
| 68   | `throw new NotFoundException('Category not found')`                              | `throw new BusinessException(ErrorCode.CATALOG_CATEGORY_NOT_FOUND, HttpStatus.NOT_FOUND)`       |
| 80   | `throw new BadRequestException('Cannot delete category with active menu items')` | `throw new BusinessException(ErrorCode.CATALOG_CATEGORY_HAS_ACTIVE_ITEMS, HttpStatus.CONFLICT)` |

- [ ] **Step 2: Update CategoryService tests**

Replace imports:

```typescript
// Remove: import { BadRequestException, NotFoundException } from '@nestjs/common';
// Add:
import { BusinessException } from '@common/error-messages/business.exception';
```

Replace all `.rejects.toThrow(BadRequestException)` → `.rejects.toThrow(BusinessException)`:
Replace all `.rejects.toThrow(NotFoundException)` → `.rejects.toThrow(BusinessException)`:

- [ ] **Step 3: Run tests**

Run: `npx nx test catalog --testPathPattern=category.service`
Expected: ALL PASS

---

### Task 13: Refactor Catalog — AreaService

**Files:**

- Modify: `apps/catalog/src/app/modules/area/services/area.service.ts`
- Modify: `apps/catalog/src/app/modules/area/tests/area.service.spec.ts`

- [ ] **Step 1: Update AreaService — same pattern as Task 12**

Replace imports:

```typescript
import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
```

| Line | Before                                                            | After                                                                                     |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 27   | `throw new BadRequestException('Area name already exists')`       | `throw new BusinessException(ErrorCode.CATALOG_AREA_DUPLICATE_NAME, HttpStatus.CONFLICT)` |
| 44   | `throw new NotFoundException('Area not found')`                   | `throw new BusinessException(ErrorCode.CATALOG_AREA_NOT_FOUND, HttpStatus.NOT_FOUND)`     |
| 55   | `throw new BadRequestException('Area name already exists')`       | `throw new BusinessException(ErrorCode.CATALOG_AREA_DUPLICATE_NAME, HttpStatus.CONFLICT)` |
| 65   | `throw new NotFoundException('Area not found')`                   | `throw new BusinessException(ErrorCode.CATALOG_AREA_NOT_FOUND, HttpStatus.NOT_FOUND)`     |
| 77   | `throw new BadRequestException('Cannot delete area with tables')` | `throw new BusinessException(ErrorCode.CATALOG_AREA_HAS_TABLES, HttpStatus.CONFLICT)`     |

- [ ] **Step 2: Update AreaService tests — same pattern as Task 12**

- [ ] **Step 3: Run tests**

Run: `npx nx test catalog --testPathPattern=area.service`
Expected: ALL PASS

---

### Task 14: Refactor Catalog — TableService

**Files:**

- Modify: `apps/catalog/src/app/modules/table/services/table.service.ts`
- Modify: `apps/catalog/src/app/modules/table/tests/table.service.spec.ts`

- [ ] **Step 1: Update TableService**

Replace imports:

```typescript
import { HttpStatus, Injectable } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
```

| Line     | Before                                                              | After                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 50       | `throw new BadRequestException('Area not found in this tenant')`    | `throw new BusinessException(ErrorCode.CATALOG_TABLE_AREA_NOT_FOUND, HttpStatus.BAD_REQUEST)`                                                                                                     |
| 55       | `throw new BadRequestException('Table name already exists')`        | `throw new BusinessException(ErrorCode.CATALOG_TABLE_DUPLICATE_NAME, HttpStatus.CONFLICT)`                                                                                                        |
| 81       | `throw new NotFoundException('Table not found')`                    | `throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND)`                                                                                                            |
| 92       | `throw new BadRequestException('Table name already exists')`        | `throw new BusinessException(ErrorCode.CATALOG_TABLE_DUPLICATE_NAME, HttpStatus.CONFLICT)`                                                                                                        |
| 101      | `throw new BadRequestException('Area not found in this tenant')`    | `throw new BusinessException(ErrorCode.CATALOG_TABLE_AREA_NOT_FOUND, HttpStatus.BAD_REQUEST)`                                                                                                     |
| 112      | `throw new NotFoundException('Table not found')`                    | `throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND)`                                                                                                            |
| 121      | `throw new BadRequestException('Cannot delete active table')`       | `throw new BusinessException(ErrorCode.CATALOG_TABLE_CANNOT_DELETE_ACTIVE, HttpStatus.CONFLICT)`                                                                                                  |
| 133      | `throw new BadRequestException(\`Invalid status transition: ...\`)` | `throw new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_TRANSITION, HttpStatus.BAD_REQUEST, { current: table.status, new: newStatus, allowed: allowedTransitions?.join(', ') \|\| 'none' })` |
| 161      | `throw new BadRequestException('Invalid QR token')`                 | `throw new BusinessException(ErrorCode.CATALOG_TABLE_INVALID_QR_TOKEN, HttpStatus.FORBIDDEN)`                                                                                                     |
| 166, 177 | `throw new NotFoundException('Table not found')`                    | `throw new BusinessException(ErrorCode.CATALOG_TABLE_NOT_FOUND, HttpStatus.NOT_FOUND)`                                                                                                            |

- [ ] **Step 2: Update TableService tests**

- [ ] **Step 3: Run tests**

Run: `npx nx test catalog --testPathPattern=table.service`
Expected: ALL PASS

---

### Task 15: Refactor Catalog — MenuItemService

**Files:**

- Modify: `apps/catalog/src/app/modules/menu-item/services/menu-item.service.ts`
- Modify: `apps/catalog/src/app/modules/menu-item/tests/menu-item.service.spec.ts`

- [ ] **Step 1: Update MenuItemService**

| Line   | Before                                                               | After                                                                                                 |
| ------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 29     | `throw new BadRequestException('Category not found in this tenant')` | `throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND, HttpStatus.BAD_REQUEST)` |
| 50     | `throw new NotFoundException('Menu item not found')`                 | `throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND)`            |
| 63     | `throw new BadRequestException('Category not found in this tenant')` | `throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_CATEGORY_NOT_FOUND, HttpStatus.BAD_REQUEST)` |
| 78, 96 | `throw new NotFoundException('Menu item not found')`                 | `throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND)`            |

- [ ] **Step 2: Update tests, run `npx nx test catalog --testPathPattern=menu-item.service`**

- [ ] **Step 3: Commit all catalog changes**

```bash
git add apps/catalog/
git commit -m "refactor(catalog): migrate all services to BusinessException with Vietnamese messages"
```

---

### Task 16: Refactor Guards (UserGuard, TenantGuard, PermissionGuard)

**Files:**

- Modify: `libs/guards/src/lib/user.guard.ts`
- Modify: `libs/guards/src/lib/tenant.guard.ts`
- Modify: `libs/guards/src/lib/permission.guard.ts`

- [ ] **Step 1: Update UserGuard**

Add imports:

```typescript
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus } from '@nestjs/common';
```

Replace throws:
| Line | Before | After |
|---|---|---|
| 48 | `throw new UnauthorizedException(AUTH_ERROR_CODE.INVALID_TOKEN)` | `throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED)` |
| 73 | `throw new UnauthorizedException(AUTH_ERROR_CODE.INVALID_TOKEN)` | `throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED)` |
| 90 | `throw new UnauthorizedException(AUTH_ERROR_CODE.USER_NOT_PROVISIONED)` | `throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED)` |
| 93 | `throw new UnauthorizedException(AUTH_ERROR_CODE.INVALID_TOKEN)` | `throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED)` |

- [ ] **Step 2: Update TenantGuard**

Replace throws:
| Line | Before | After |
|---|---|---|
| 40 | `throw new ForbiddenException('Tenant is required')` | `throw new BusinessException(ErrorCode.TENANT_REQUIRED, HttpStatus.FORBIDDEN)` |
| 44 | `throw new ForbiddenException('Tenant mismatch with user identity')` | `throw new BusinessException(ErrorCode.TENANT_MISMATCH_IDENTITY, HttpStatus.FORBIDDEN)` |
| 54 | `throw new ForbiddenException('Session not found')` | `throw new BusinessException(ErrorCode.TENANT_SESSION_NOT_FOUND, HttpStatus.FORBIDDEN)` |
| 58 | `throw new ForbiddenException('Tenant mismatch with session')` | `throw new BusinessException(ErrorCode.TENANT_MISMATCH_SESSION, HttpStatus.FORBIDDEN)` |

- [ ] **Step 3: Update PermissionGuard**

| Line | Before                                                   | After                                                                                      |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 23   | `throw new UnauthorizedException('User data not found')` | `throw new BusinessException(ErrorCode.AUTH_USER_DATA_NOT_FOUND, HttpStatus.UNAUTHORIZED)` |
| 32   | `throw new ForbiddenException('Permission denied')`      | `throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN)`      |

- [ ] **Step 4: Update utils & decorators**

`libs/utils/src/lib/string.util.ts` line 9:

```typescript
// Before: throw new UnauthorizedException('Token is required');
throw new BusinessException(ErrorCode.AUTH_TOKEN_NOT_PROVIDED, HttpStatus.UNAUTHORIZED);
```

`libs/decorators/src/lib/userData.decorator.ts` line 11:

```typescript
// Before: throw new UnauthorizedException('User data not found');
throw new BusinessException(ErrorCode.AUTH_USER_DATA_NOT_FOUND, HttpStatus.UNAUTHORIZED);
```

- [ ] **Step 5: Commit**

```bash
git add libs/guards/ libs/utils/ libs/decorators/
git commit -m "refactor(guards): migrate guards, utils, decorators to BusinessException"
```

---

### Task 17: Refactor Authorizer, Keycloak, User-Access, Product, SaaS, BFF, Cloudinary

**Files:**

- Modify: `apps/authorizer/src/app/authorizer/services/authorizer.service.ts` (5 throws)
- Modify: `apps/authorizer/src/app/authorizer/controllers/authorizer.controller.ts` (1 throw)
- Modify: `apps/authorizer/src/app/authorizer/controllers/authorizer-grpc.controller.ts` (catch block)
- Modify: `apps/authorizer/src/app/keycloak/services/keycloak-http.service.ts` (1 throw)
- Modify: `apps/user-access/src/app/modules/user/services/user.service.ts` (1 throw)
- Modify: `apps/product/src/app/modules/product/services/product.service.ts` (1 throw)
- Modify: `apps/saas/src/services/saas.service.ts` (4 throws)
- Modify: `apps/bff/src/app/modules/catalog/controllers/menu-item.controller.ts` (1 throw)
- Modify: `libs/providers/cloudinary/src/lib/cloudinary.service.ts` (3 throws)

- [ ] **Step 1: Refactor AuthorizerService**

Replace 5 throws:
| Line | Before | After |
|---|---|---|
| 61 | `AUTH_ERROR_CODE.INVALID_TOKEN` | `throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED)` |
| 74 | `AUTH_ERROR_CODE.INVALID_TOKEN` | `throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED)` |
| 80 | `AUTH_ERROR_CODE.USER_NOT_PROVISIONED` | `throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED)` |
| 90 | `AUTH_ERROR_CODE.USER_NOT_PROVISIONED` | `throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED)` |
| 103 | `AUTH_ERROR_CODE.ROLE_MAPPING_MISMATCH` | `throw new BusinessException(ErrorCode.AUTH_ROLE_MAPPING_MISMATCH, HttpStatus.UNAUTHORIZED)` |
| 160 | `AUTH_ERROR_CODE.USER_NOT_PROVISIONED` | `throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED)` |
| 183 | `AUTH_ERROR_CODE.USER_NOT_PROVISIONED` | `throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED)` |

- [ ] **Step 2: Refactor AuthorizerController (TCP)**

Line 26: `throw new UnauthorizedException('Token is invalid')` → `throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED)`

- [ ] **Step 3: Refactor AuthorizerGrpcController**

Update catch block to handle BusinessException:

```typescript
} catch (error) {
  this.logger.error({ error, processId: params?.processId });

  if (error instanceof BusinessException) {
    throw new RpcException({
      code: status.UNAUTHENTICATED,
      message: error.message,
    });
  }

  if (error instanceof UnauthorizedException) {
    throw new RpcException({
      code: status.UNAUTHENTICATED,
      message: error.message,
    });
  }

  throw new RpcException({
    code: status.INTERNAL,
    message: 'Internal server error',
  });
}
```

- [ ] **Step 4: Refactor KeycloakHttpService**

Line 102: `throw new InternalServerErrorException('Failed to create user in Keycloak')` → `throw new BusinessException(ErrorCode.KEYCLOAK_USER_CREATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR)`

- [ ] **Step 5: Refactor UserService**

Line 31: `throw new BadRequestException(ERROR_CODE.USER_ALREADY_EXISTS)` → `throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, HttpStatus.CONFLICT)`

- [ ] **Step 6: Refactor ProductService**

Line 13: `throw new BadRequestException('Product already exists')` → `throw new BusinessException(ErrorCode.PRODUCT_ALREADY_EXISTS, HttpStatus.CONFLICT)`

- [ ] **Step 7: Refactor SaasService**

| Line | Before                                                   | After                                                                                      |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 12   | `throw new BadRequestException('name is required')`      | `throw new BusinessException(ErrorCode.SAAS_TENANT_NAME_REQUIRED, HttpStatus.BAD_REQUEST)` |
| 18   | `throw new BadRequestException('Tenant already exists')` | `throw new BusinessException(ErrorCode.SAAS_TENANT_ALREADY_EXISTS, HttpStatus.CONFLICT)`   |
| 35   | `throw new NotFoundException('Tenant not found')`        | `throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND)`       |
| 49   | `throw new BadRequestException('Tenant already exists')` | `throw new BusinessException(ErrorCode.SAAS_TENANT_ALREADY_EXISTS, HttpStatus.CONFLICT)`   |

- [ ] **Step 8: Refactor BFF MenuItemController**

Line 239: `throw new BadRequestException('Image file is required')` → `throw new BusinessException(ErrorCode.UPLOAD_FILE_REQUIRED, HttpStatus.BAD_REQUEST)`

- [ ] **Step 9: Refactor CloudinaryService**

| Line | Before                                                                         | After                                                                                     |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 109  | `throw new InternalServerErrorException('Image upload failed')`                | `throw new BusinessException(ErrorCode.UPLOAD_FAILED, HttpStatus.INTERNAL_SERVER_ERROR)`  |
| 161  | `throw new BadRequestException('File size exceeds 5MB limit')`                 | `throw new BusinessException(ErrorCode.UPLOAD_FILE_TOO_LARGE, HttpStatus.BAD_REQUEST)`    |
| 165  | `throw new BadRequestException('Invalid file type. Allowed: jpeg, png, webp')` | `throw new BusinessException(ErrorCode.UPLOAD_INVALID_FILE_TYPE, HttpStatus.BAD_REQUEST)` |

- [ ] **Step 10: Run lint + tests for all affected projects**

```bash
npx nx run-many -t lint --fix --projects=authorizer,user-access,product,saas,bff,error-messages
npx nx run-many -t test --projects=catalog,error-messages
```

- [ ] **Step 11: Commit**

```bash
git add apps/ libs/
git commit -m "refactor(backend): migrate all services to BusinessException

- Authorizer service + controllers + gRPC handler
- Keycloak HTTP service
- User-Access, Product, SaaS services
- BFF menu-item controller
- Cloudinary provider"
```

---

### Task 18: Remove deprecated error code enums

**Files:**

- Delete: `libs/constants/src/lib/enum/error-code.enum.ts`
- Delete: `libs/constants/src/lib/enum/auth-error-code.enum.ts`

- [ ] **Step 1: Verify no remaining imports of old enums**

```bash
grep -rn "error-code.enum\|auth-error-code.enum\|ERROR_CODE\|AUTH_ERROR_CODE" apps/ libs/ --include="*.ts" | grep -v node_modules | grep -v ".spec.ts"
```

Expected: No results (all migrated)

- [ ] **Step 2: Remove the files**

```bash
rm libs/constants/src/lib/enum/error-code.enum.ts
rm libs/constants/src/lib/enum/auth-error-code.enum.ts
```

- [ ] **Step 3: Remove re-exports if any, then commit**

```bash
git add -A libs/constants/
git commit -m "chore(constants): remove deprecated error-code and auth-error-code enums"
```

---

## Phase C: Frontend (Message Updates)

### Task 19: Enhance ApiError class & create frontend messages helper

**Files:**

- Modify: `libs/frontend/utils/src/lib/api-client.ts`
- Create: `libs/frontend/utils/src/lib/messages.ts`

- [ ] **Step 1: Update ApiError in api-client.ts**

Replace the `ApiError` class:

```typescript
export class ApiError extends Error {
  readonly status: number;
  readonly errorCode: string | undefined;
  readonly serverMessage: string;
  readonly body: string;

  constructor(status: number, body: string) {
    let errorCode: string | undefined;
    let serverMessage = body;

    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      errorCode = parsed.errorCode as string | undefined;
      serverMessage = (parsed.message as string) ?? body;
    } catch {
      // body is not JSON — use raw text
    }

    super(serverMessage);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.serverMessage = serverMessage;
    this.body = body;
  }
}
```

- [ ] **Step 2: Create frontend messages helper**

```typescript
// libs/frontend/utils/src/lib/messages.ts
const ENTITY_NAMES: Record<string, string> = {
  category: 'Danh mục',
  area: 'Khu vực',
  table: 'Bàn',
  menuItem: 'Món ăn',
  product: 'Sản phẩm',
  tenant: 'Cửa hàng',
  user: 'Tài khoản',
};

const SUCCESS_TEMPLATES: Record<string, string> = {
  created: '{{entity}} đã được tạo thành công',
  updated: '{{entity}} đã được cập nhật thành công',
  deleted: '{{entity}} đã được xóa',
  reordered: 'Đã sắp xếp lại {{entity}}',
  imageUploaded: 'Ảnh đã được tải lên thành công',
  qrRegenerated: 'Mã QR đã được tạo lại',
  statusUpdated: 'Trạng thái đã được cập nhật',
};

export function successMessage(templateKey: keyof typeof SUCCESS_TEMPLATES, entityKey?: string): string {
  const template = SUCCESS_TEMPLATES[templateKey];
  if (entityKey && ENTITY_NAMES[entityKey]) {
    return template.replace('{{entity}}', ENTITY_NAMES[entityKey]);
  }
  return template;
}

export function getErrorDisplayMessage(error: Error): string {
  if ('serverMessage' in error && typeof (error as Record<string, unknown>).serverMessage === 'string') {
    return (error as Record<string, unknown>).serverMessage as string;
  }
  return error.message;
}
```

- [ ] **Step 3: Export from index**

Add to `libs/frontend/utils/src/index.ts`:

```typescript
export { successMessage, getErrorDisplayMessage } from './lib/messages';
```

---

### Task 20: Refactor Management App — Toast messages (Vietnamese)

**Files:**

- Modify: `apps/management-app/src/features/tables/hooks/use-tables-mutations.ts`
- Modify: `apps/management-app/src/features/menu/hooks/use-menu-mutations.ts`

- [ ] **Step 1: Update use-tables-mutations.ts**

Add import:

```typescript
import { successMessage, getErrorDisplayMessage } from '@einvoice/frontend-utils';
```

Replace all toast calls:

| Before                                                             | After                                                |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| `toast.success('Area created successfully')`                       | `toast.success(successMessage('created', 'area'))`   |
| `toast.error(\`Failed to create area: ${error.message}\`)`         | `toast.error(getErrorDisplayMessage(error))`         |
| `toast.success('Area updated successfully')`                       | `toast.success(successMessage('updated', 'area'))`   |
| `toast.error(\`Failed to update area: ${error.message}\`)`         | `toast.error(getErrorDisplayMessage(error))`         |
| `toast.success('Area deleted')`                                    | `toast.success(successMessage('deleted', 'area'))`   |
| `toast.error(\`Failed to delete area: ${error.message}\`)`         | `toast.error(getErrorDisplayMessage(error))`         |
| `toast.success('Areas reordered')`                                 | `toast.success(successMessage('reordered', 'area'))` |
| `toast.error(\`Failed to reorder areas: ${error.message}\`)`       | `toast.error(getErrorDisplayMessage(error))`         |
| `toast.success('Table created successfully')`                      | `toast.success(successMessage('created', 'table'))`  |
| `toast.error(\`Failed to create table: ${error.message}\`)`        | `toast.error(getErrorDisplayMessage(error))`         |
| `toast.success('Table updated successfully')`                      | `toast.success(successMessage('updated', 'table'))`  |
| `toast.error(\`Failed to update table: ${error.message}\`)`        | `toast.error(getErrorDisplayMessage(error))`         |
| `toast.success('Table deleted')`                                   | `toast.success(successMessage('deleted', 'table'))`  |
| `toast.error(\`Failed to delete table: ${error.message}\`)`        | `toast.error(getErrorDisplayMessage(error))`         |
| `toast.success('Table status updated')`                            | `toast.success(successMessage('statusUpdated'))`     |
| `toast.error(\`Failed to update table status: ${error.message}\`)` | `toast.error(getErrorDisplayMessage(error))`         |
| `toast.success('QR code regenerated')`                             | `toast.success(successMessage('qrRegenerated'))`     |
| `toast.error(\`Failed to regenerate QR code: ${error.message}\`)`  | `toast.error(getErrorDisplayMessage(error))`         |

- [ ] **Step 2: Update use-menu-mutations.ts — same pattern**

Replace all toast calls for category and menu-item mutations similarly.

---

### Task 21: Refactor Management App — Zod schemas (Vietnamese)

**Files:**

- Modify: `apps/management-app/src/features/tables/data/schema.ts`
- Modify: `apps/management-app/src/features/menu/data/schema.ts`

- [ ] **Step 1: Update tables schema**

```typescript
export const areaMutateSchema = z.object({
  name: z.string().min(1, 'Tên khu vực là bắt buộc').max(100),
  sortOrder: z.number().int().min(0).optional(),
});

export const tableMutateSchema = z.object({
  name: z.string().min(1, 'Tên bàn là bắt buộc').max(50),
  areaId: z.string().min(1, 'Khu vực là bắt buộc'),
  capacity: z.number().int().min(1, 'Sức chứa tối thiểu là 1').max(50),
});
```

- [ ] **Step 2: Update menu schema**

```typescript
export const categoryMutateSchema = z.object({
  name: z.string().min(1, 'Tên danh mục là bắt buộc').max(100),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  status: categoryStatusEnum,
});

export const menuItemMutateSchema = z.object({
  name: z.string().min(1, 'Tên món là bắt buộc').max(200),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Giá phải lớn hơn hoặc bằng 0'),
  categoryId: z.string().min(1, 'Danh mục là bắt buộc'),
  stock: z.number().int().min(0, 'Số lượng tồn kho không được âm'),
  status: menuItemStatusEnum,
});
```

---

### Task 22: Refactor Management App — Delete dialogs (Vietnamese)

**Files:**

- Modify: `apps/management-app/src/features/tables/components/area-delete-dialog.tsx`
- Modify: `apps/management-app/src/features/tables/components/table-delete-dialog.tsx`
- Modify: `apps/management-app/src/features/menu/components/category-delete-dialog.tsx`
- Modify: `apps/management-app/src/features/menu/components/menu-item-delete-dialog.tsx`

- [ ] **Step 1: Update all 4 delete dialogs**

**AreaDeleteDialog:**

```typescript
title="Xóa khu vực"
description={`Bạn có chắc chắn muốn xóa "${currentArea?.name ?? ''}"? Tất cả các bàn trong khu vực này cũng sẽ bị xóa.`}
confirmText="Xóa"
```

**TableDeleteDialog:**

```typescript
title="Xóa bàn"
description={`Bạn có chắc chắn muốn xóa bàn "${currentTable?.name ?? ''}"? Mã QR liên kết cũng sẽ bị vô hiệu hóa.`}
confirmText="Xóa"
```

**CategoryDeleteDialog:**

```typescript
title="Xóa danh mục"
description={`Bạn có chắc chắn muốn xóa "${currentCategory?.name ?? ''}"? Thao tác này không thể hoàn tác. Tất cả món ăn trong danh mục này cần được gán lại.`}
confirmText="Xóa"
```

**MenuItemDeleteDialog:**

```typescript
title="Xóa món ăn"
description={`Bạn có chắc chắn muốn xóa "${currentItem?.name ?? ''}"? Thao tác này không thể hoàn tác.`}
confirmText="Xóa"
```

---

### Task 23: Add Error Boundaries

**Files:**

- Create: `apps/management-app/src/components/error-boundary.tsx`
- Create: `apps/customer-pwa/src/components/error-boundary.tsx`
- Modify: `apps/management-app/src/app/layout.tsx`
- Modify: `apps/customer-pwa/src/App.tsx`

- [ ] **Step 1: Create Error Boundary for management-app**

```tsx
// apps/management-app/src/components/error-boundary.tsx
'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Đã xảy ra lỗi</h2>
            <p className="text-muted-foreground mb-4">Vui lòng tải lại trang để tiếp tục.</p>
            <button
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              onClick={() => this.setState({ hasError: false })}
            >
              Tải lại
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: Create Error Boundary for customer-pwa (same content, without `'use client'`)**

Copy same file to `apps/customer-pwa/src/components/error-boundary.tsx` but remove the `'use client'` directive.

- [ ] **Step 3: Wrap management-app layout with Error Boundary**

In `apps/management-app/src/app/layout.tsx`, add:

```tsx
import { ErrorBoundary } from '@/components/error-boundary';

// Inside return:
<Providers>
  <ErrorBoundary>
    <TooltipProvider>{children}</TooltipProvider>
  </ErrorBoundary>
  <Toaster />
</Providers>;
```

- [ ] **Step 4: Wrap customer-pwa App with Error Boundary + add Toaster**

In `apps/customer-pwa/src/App.tsx`:

```tsx
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from 'sonner';

function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>{/* ... existing routes ... */}</Routes>
          </BrowserRouter>
        </CartProvider>
      </SessionProvider>
      <Toaster position="top-center" />
    </ErrorBoundary>
  );
}
```

Note: Check if `sonner` is already in customer-pwa's dependencies. If not:

```bash
cd apps/customer-pwa && pnpm add sonner
```

- [ ] **Step 5: Commit all frontend changes**

```bash
git add apps/management-app/ apps/customer-pwa/ libs/frontend/
git commit -m "feat(frontend): Vietnamese messages, Error Boundaries, enhanced error display

- All toast messages → Vietnamese
- Zod validation messages → Vietnamese
- Delete dialog text → Vietnamese
- React Error Boundaries for both apps
- Sonner toast added to customer-pwa
- Enhanced ApiError with errorCode + serverMessage"
```

---

## Phase D: Verification

### Task 24: Full lint + test verification

- [ ] **Step 1: Run lint for all affected projects**

```bash
npx nx run-many -t lint --fix --projects=error-messages,catalog,authorizer,user-access,product,saas,bff,management-app,customer-pwa
```

Expected: No lint errors

- [ ] **Step 2: Run tests for all affected projects**

```bash
npx nx run-many -t test --projects=error-messages,catalog
```

Expected: ALL PASS

- [ ] **Step 3: Build check**

```bash
npx nx run-many -t build --projects=catalog,bff,authorizer
```

Expected: Build success — no TypeScript errors

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification — all lint + tests passing for unified error handling"
```
