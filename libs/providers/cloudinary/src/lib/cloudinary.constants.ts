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
