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
    const publicId = options.fileName || randomUUID();

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
