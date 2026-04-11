import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { MAGIC_BYTES, UPLOAD_RATE_LIMIT, UPLOAD_RATE_WINDOW, CloudinaryFolder } from '../cloudinary.constants';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warn' | 'error';
}

/**
 * Simple UUID v4 validation without external dependency
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * CloudinaryValidators — Collection of validation methods for security
 *
 * Phương pháp soft-fail: validators log warning nhưng KHÔNG throw exception.
 * Frontend sẽ nhận validation warnings trong response.
 */
@Injectable()
export class CloudinaryValidators {
  private readonly logger = new Logger(CloudinaryValidators.name);
  private uploadCounterMap: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * validateMagicBytes() — Kiểm tra file signature thực tế (không chỉ Content-Type header)
   *
   * Tại sao: Frontend có thể fake MIME type header, validation này check actual file bytes
   *
   * Luồng:
   * 1. Đọc 4 bytes đầu từ buffer
   * 2. So sánh với JPEG/PNG/WebP signatures
   * 3. Nếu không match MIME type header → warning
   */
  validateMagicBytes(buffer: Buffer, declaredMimeType: string): ValidationResult {
    const warnings: string[] = [];

    if (buffer.length < 4) {
      warnings.push('File quá nhỏ, không thể kiểm tra magic bytes');
      return { isValid: true, warnings };
    }

    // Đọc bytes đầu
    const magicPrefix = buffer.slice(0, 4);

    // Check JPEG
    if (
      magicPrefix[0] === MAGIC_BYTES.JPEG[0] &&
      magicPrefix[1] === MAGIC_BYTES.JPEG[1] &&
      magicPrefix[2] === MAGIC_BYTES.JPEG[2]
    ) {
      if (declaredMimeType !== 'image/jpeg') {
        warnings.push(`Magic bytes indicate JPEG file nhưng Content-Type là "${declaredMimeType}"`);
      }
      return { isValid: true, warnings };
    }

    // Check PNG
    if (
      magicPrefix[0] === MAGIC_BYTES.PNG[0] &&
      magicPrefix[1] === MAGIC_BYTES.PNG[1] &&
      magicPrefix[2] === MAGIC_BYTES.PNG[2] &&
      magicPrefix[3] === MAGIC_BYTES.PNG[3]
    ) {
      if (declaredMimeType !== 'image/png') {
        warnings.push(`Magic bytes indicate PNG file nhưng Content-Type là "${declaredMimeType}"`);
      }
      return { isValid: true, warnings };
    }

    // Check WebP (RIFF header, then "WEBP" at offset 8)
    if (
      magicPrefix[0] === MAGIC_BYTES.WEBP[0] &&
      magicPrefix[1] === MAGIC_BYTES.WEBP[1] &&
      magicPrefix[2] === MAGIC_BYTES.WEBP[2] &&
      magicPrefix[3] === MAGIC_BYTES.WEBP[3]
    ) {
      // For WebP, check for "WEBP" signature at bytes 8-12
      if (buffer.length >= 12) {
        const webpSignature = buffer.slice(8, 12).toString('ascii');
        if (webpSignature === 'WEBP') {
          if (declaredMimeType !== 'image/webp') {
            warnings.push(`Magic bytes indicate WebP file nhưng Content-Type là "${declaredMimeType}"`);
          }
          return { isValid: true, warnings };
        }
      }
    }

    // If we reach here, magic bytes don't match known formats
    warnings.push(`Không nhận dạng được magic bytes. File có thể không phải ảnh hợp lệ.`);
    return { isValid: true, warnings };
  }

  /**
   * sanitizeFilename() — Xóa ký tự nguy hiểm, prevent path traversal
   *
   * Whitelist: a-z, A-Z, 0-9, dash (-), underscore (_), dot (.)
   * Reject: ../../../, spaces, special chars
   *
   * Luồng:
   * 1. Nếu filename match regex → OK
   * 2. Nếu không match → sanitize (xóa ký tự bẩn)
   * 3. Return original + warning
   */
  sanitizeFilename(filename: string): { clean: string | undefined; warnings: string[] } {
    const warnings: string[] = [];

    if (!filename || filename.trim().length === 0) {
      return { clean: undefined, warnings: ['Filename rỗng'] };
    }

    // Check cho path traversal patterns
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      warnings.push('Filename chứa path traversal characters (../ hoặc \\)');
    }

    // Sanitize: giữ lại whitelist characters
    const cleaned = filename
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-whitelist với underscore
      .replace(/^\.+/, '') // Remove leading dots
      .slice(0, 255); // Max 255 chars

    if (cleaned !== filename) {
      warnings.push(`Filename sanitized: "${filename}" → "${cleaned}"`);
    }

    return { clean: cleaned, warnings };
  }

  /**
   * validateTenantId() — Validate tenant_id is valid UUID v4
   *
   * Tại sao: Multi-tenant isolation guarantee — invalid UUID might bypass checks
   */
  validateTenantId(tenantId: string): ValidationResult {
    const warnings: string[] = [];

    if (!tenantId || tenantId.trim().length === 0) {
      warnings.push('tenantId rỗng - sẽ sử dụng default tenant');
    } else if (!isValidUUID(tenantId)) {
      warnings.push(`tenantId "${tenantId}" không phải UUID v4 hợp lệ`);
    }

    return { isValid: true, warnings };
  }

  /**
   * validateFolderEnum() — Runtime check folder is in CloudinaryFolder enum
   *
   * Tại sao: TypeScript enum chỉ tồn tại lúc compile, runtime có thể bypass.
   * Frontend có thể pass folder="../../" → bypass compile-time check
   */
  validateFolderEnum(folder: string): ValidationResult {
    const warnings: string[] = [];

    if (!folder) {
      warnings.push('folder rỗng');
      return { isValid: true, warnings };
    }

    const validFolders = Object.values(CloudinaryFolder);
    if (!validFolders.includes(folder as any)) {
      warnings.push(`folder "${folder}" không nằm trong enum. Allowed: ${validFolders.join(', ')}`);
    }

    return { isValid: true, warnings };
  }

  /**
   * checkRateLimit() — Limit uploads per tenant (max 50/hour)
   *
   * Phương pháp: In-memory map + TTL reset. Đơn giản, không cần Redis ở stage này.
   * Tại sao: Prevent DoS (spam upload hàng ngàn ảnh)
   */
  checkRateLimit(tenantId: string): ValidationResult {
    const warnings: string[] = [];
    const now = Date.now();

    // Get or create counter for tenant
    let counter = this.uploadCounterMap.get(tenantId);

    if (!counter || now >= counter.resetAt) {
      // Reset counter
      counter = {
        count: 1,
        resetAt: now + UPLOAD_RATE_WINDOW,
      };
      this.uploadCounterMap.set(tenantId, counter);
      return { isValid: true, warnings };
    }

    counter.count++;

    if (counter.count > UPLOAD_RATE_LIMIT) {
      warnings.push(`Rate limit exceeded: ${counter.count} uploads in last hour (max: ${UPLOAD_RATE_LIMIT})`);
    }

    return { isValid: true, warnings };
  }

  /**
   * checkDiskQuota() — Check tenant's total upload size vs quota
   *
   * Note: Implementation cần database query (SELECT SUM(bytes) FROM uploads WHERE tenant_id=?)
   * Tạm thời: placeholder, sẽ implement khi có DB access
   *
   * Tại sao: Prevent one tenant from hogging all Cloudinary storage
   */
  async checkDiskQuota(
    tenantId: string,
    newFileSizeBytes: number,
    quotaMbGetter?: (tenantId: string) => Promise<number>,
  ): Promise<ValidationResult> {
    const warnings: string[] = [];

    // If no quotaGetter provided, skip check (can be implemented later with DB)
    if (!quotaMbGetter) {
      return { isValid: true, warnings };
    }

    try {
      const quotaMb = await quotaMbGetter(tenantId);
      const quotaBytes = quotaMb * 1024 * 1024;

      // TODO: Query database for total upload size for tenant
      // const totalBytes = await db.uploads.aggregate(...)
      // if (totalBytes + newFileSizeBytes > quotaBytes) {
      //   warnings.push(`Quota exceeded...`);
      // }

      return { isValid: true, warnings };
    } catch (error) {
      // Silently fail - don't block upload if quota check fails
      this.logger.warn(`Quota check failed for tenant ${tenantId}: ${error}`);
      return { isValid: true, warnings };
    }
  }

  /**
   * collectAllWarnings() — Aggregate warnings từ tất cả validators
   *
   * Dùng trong uploadImage() để collect tất cả warnings + log them
   */
  collectAllWarnings(...results: ValidationResult[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    results.forEach((result, index) => {
      result.warnings.forEach((msg) => {
        warnings.push({
          field: `validation_${index}`,
          message: msg,
          severity: 'warn',
        });
      });
    });
    return warnings;
  }

  /**
   * logWarnings() — Log validation warnings để monitoring
   */
  logWarnings(tenantId: string, warnings: ValidationWarning[]) {
    if (warnings.length > 0) {
      const summary = warnings.map((w) => w.message).join('; ');
      this.logger.warn(`[Tenant ${tenantId}] Upload validation warnings: ${summary}`);
    }
  }
}
