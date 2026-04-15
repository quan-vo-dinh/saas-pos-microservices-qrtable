import { BadRequestException, Inject, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { v2 as cloudinaryType } from 'cloudinary';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
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
import { CloudinaryValidators } from './validators/cloudinary.validators';

/**
 * CloudinaryUploadResponseWithWarnings — Response include validation warnings
 */
export interface CloudinaryUploadResponseWithWarnings extends CloudinaryUploadResponse {
  validationWarnings?: string[];
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject(CLOUDINARY_INJECTION_TOKEN)
    private readonly cloudinary: typeof cloudinaryType,
    private readonly validators: CloudinaryValidators,
  ) {}

  /**
   * uploadImage() — Upload ảnh lên Cloudinary với validation đầy đủ
   *
   * Hybrid validation pattern:
   * - Layer 1 (expected ở BFF): Size check, basic MIME check
   * - Layer 2 (CloudinaryService): Magic bytes, filename sanitize, UUID/enum validation, rate limit, quota check
   *
   * Soft-fail approach: log warnings, nhưng vẫn upload (frontend nhận warnings trong response)
   */
  async uploadImage(file: Buffer, options: UploadImageOptions): Promise<CloudinaryUploadResponseWithWarnings> {
    const allWarnings: string[] = [];

    try {
      // Validation 1: Size + MIME type (basic checks)
      this.validateFile(file, options.mimetype);

      // Validation 2: Magic bytes (actual file signature)
      const magicBytesResult = this.validators.validateMagicBytes(file, options.mimetype);
      allWarnings.push(...magicBytesResult.warnings);

      // Validation 3: Filename sanitization
      const { clean: cleanedFilename, warnings: filenameWarnings } = this.validators.sanitizeFilename(
        options.fileName || randomUUID(),
      );
      allWarnings.push(...filenameWarnings);

      // Validation 4: tenantId validation (UUID v4)
      const tenantIdResult = this.validators.validateTenantId(options.tenantId);
      allWarnings.push(...tenantIdResult.warnings);

      // Validation 5: Folder enum validation (runtime check)
      const folderResult = this.validators.validateFolderEnum(options.folder);
      allWarnings.push(...folderResult.warnings);

      // Validation 6: Rate limit check
      const rateLimitResult = this.validators.checkRateLimit(options.tenantId);
      allWarnings.push(...rateLimitResult.warnings);

      // Validation 7: Disk quota check (placeholder, will implement with DB)
      // const quotaResult = await this.validators.checkDiskQuota(options.tenantId, file.length);
      // allWarnings.push(...quotaResult.warnings);

      // Log warnings for monitoring
      if (allWarnings.length > 0) {
        this.logger.warn(`[${options.tenantId}] Upload warnings: ${allWarnings.join('; ')}`);
      }

      // Build folder path (multi-tenant isolation)
      const folder = `${BASE_FOLDER}/${options.tenantId}/${options.folder}`;
      const publicId = cleanedFilename;

      // Upload to Cloudinary
      const result = await this.uploadToCloudinary(file, {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation: [{ width: DEFAULT_LARGE_WIDTH, crop: 'limit', quality: 'auto' }],
      });

      // Return response with warnings
      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        validationWarnings: allWarnings.length > 0 ? allWarnings : undefined,
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
          this.logger.error(`Cloudinary upload error: ${JSON.stringify(error)}`);
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
