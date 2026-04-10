export interface CloudinaryUploadResponse {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface ResponsiveUrls {
  thumbnail: string;
  medium: string;
  large: string;
  original: string;
}
