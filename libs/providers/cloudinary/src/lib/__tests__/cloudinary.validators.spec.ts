import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryValidators } from '../validators/cloudinary.validators';

describe('CloudinaryValidators', () => {
  let validators: CloudinaryValidators;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryValidators],
    }).compile();

    validators = module.get<CloudinaryValidators>(CloudinaryValidators);
  });

  describe('validateMagicBytes', () => {
    it('should validate JPEG magic bytes correctly', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = validators.validateMagicBytes(jpegBuffer, 'image/jpeg');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn if magic bytes indicate JPEG but Content-Type is PNG', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const result = validators.validateMagicBytes(jpegBuffer, 'image/png');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('JPEG');
    });

    it('should validate PNG magic bytes correctly', () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const result = validators.validateMagicBytes(pngBuffer, 'image/png');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should validate WebP magic bytes correctly', () => {
      const webpBuffer = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46,
        0x24,
        0x00,
        0x00,
        0x00, // RIFF header
        0x57,
        0x45,
        0x42,
        0x50, // WEBP
      ]);
      const result = validators.validateMagicBytes(webpBuffer, 'image/webp');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn on unknown magic bytes', () => {
      const unknownBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      const result = validators.validateMagicBytes(unknownBuffer, 'image/jpeg');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn on buffer too small', () => {
      const tinyBuffer = Buffer.from([0xff, 0xd8]);
      const result = validators.validateMagicBytes(tinyBuffer, 'image/jpeg');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('sanitizeFilename', () => {
    it('should accept valid filename', () => {
      const result = validators.sanitizeFilename('menu-item-123.jpg');
      expect(result.clean).toBe('menu-item-123.jpg');
      expect(result.warnings).toHaveLength(0);
    });

    it('should sanitize filename with special characters', () => {
      const result = validators.sanitizeFilename('menu@item#123$.jpg');
      expect(result.clean).toBe('menu_item_123_.jpg');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should reject path traversal', () => {
      const result = validators.sanitizeFilename('../../../etc/passwd');
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('path traversal');
    });

    it('should handle empty filename', () => {
      const result = validators.sanitizeFilename('');
      expect(result.clean).toBeUndefined();
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should truncate long filename', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      const result = validators.sanitizeFilename(longName);
      expect(result.clean).toBeDefined();
      expect(result.clean!.length).toBeLessThanOrEqual(255);
    });

    it('should remove leading dots', () => {
      const result = validators.sanitizeFilename('...filename.jpg');
      expect(result.clean).not.toMatch(/^\./);
    });
  });

  describe('validateTenantId', () => {
    it('should accept valid UUID v4', () => {
      const result = validators.validateTenantId('550e8400-e29b-41d4-a716-446655440000');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn on invalid UUID format', () => {
      const result = validators.validateTenantId('not-a-uuid');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn on empty tenantId', () => {
      const result = validators.validateTenantId('');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('validateFolderEnum', () => {
    it('should accept valid folder names', () => {
      ['menu', 'branding', 'qr-exports'].forEach((folder) => {
        const result = validators.validateFolderEnum(folder);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
      });
    });

    it('should warn on invalid folder name', () => {
      const result = validators.validateFolderEnum('invalid-folder');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn on path traversal in folder', () => {
      const result = validators.validateFolderEnum('../../etc');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should warn on empty folder', () => {
      const result = validators.validateFolderEnum('');
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first upload', () => {
      const result = validators.checkRateLimit('tenant-123');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should allow multiple uploads within limit', () => {
      const tenantId = 'tenant-456';
      for (let i = 0; i < 50; i++) {
        const result = validators.checkRateLimit(tenantId);
        expect(result.isValid).toBe(true);
      }
    });

    it('should warn when exceeding rate limit', () => {
      const tenantId = 'tenant-789';
      // Fill up the limit
      for (let i = 0; i < 51; i++) {
        validators.checkRateLimit(tenantId);
      }
      // Next one should warn
      const result = validators.checkRateLimit(tenantId);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Rate limit exceeded');
    });
  });

  describe('collectAllWarnings', () => {
    it('should aggregate warnings from multiple results', () => {
      const results = [
        { isValid: true, warnings: ['Warning 1'] },
        { isValid: true, warnings: ['Warning 2', 'Warning 3'] },
        { isValid: true, warnings: [] },
      ];
      const warnings = validators.collectAllWarnings(...results);
      expect(warnings).toHaveLength(3);
      expect(warnings.map((w: any) => w.message)).toContain('Warning 1');
      expect(warnings.map((w: any) => w.message)).toContain('Warning 2');
    });
  });
});
