export const CLOUDINARY_INJECTION_TOKEN = 'CLOUDINARY';
export const CLOUDINARY_MODULE_OPTIONS = 'CLOUDINARY_MODULE_OPTIONS';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const BASE_FOLDER = 'qrtable';

export const DEFAULT_THUMBNAIL_WIDTH = 200;
export const DEFAULT_MEDIUM_WIDTH = 400;
export const DEFAULT_LARGE_WIDTH = 800;

// Validation constants
export const FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/; // Whitelist: alphanumeric, dash, underscore, dot
export const UPLOAD_RATE_LIMIT = 50; // Uploads per hour per tenant
export const UPLOAD_RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms
export const DEFAULT_TENANT_QUOTA_MB = 500; // Default quota: 500MB per tenant

// Magic bytes signatures for file type validation
export const MAGIC_BYTES = {
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF header (must also check for WEBP after)
} as const;

export enum CloudinaryFolder {
  MENU = 'menu',
  BRANDING = 'branding',
  QR_EXPORTS = 'qr-exports',
}
