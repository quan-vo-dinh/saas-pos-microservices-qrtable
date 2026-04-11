// Module
export { CloudinaryModule } from './lib/cloudinary.module';

// Service
export { CloudinaryService, type CloudinaryUploadResponseWithWarnings } from './lib/cloudinary.service';

// Validators
export {
  CloudinaryValidators,
  type ValidationResult,
  type ValidationWarning,
} from './lib/validators/cloudinary.validators';

// Constants
export {
  CLOUDINARY_INJECTION_TOKEN,
  CLOUDINARY_MODULE_OPTIONS,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  BASE_FOLDER,
  DEFAULT_THUMBNAIL_WIDTH,
  DEFAULT_MEDIUM_WIDTH,
  DEFAULT_LARGE_WIDTH,
  FILENAME_REGEX,
  UPLOAD_RATE_LIMIT,
  UPLOAD_RATE_WINDOW,
  DEFAULT_TENANT_QUOTA_MB,
  MAGIC_BYTES,
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
