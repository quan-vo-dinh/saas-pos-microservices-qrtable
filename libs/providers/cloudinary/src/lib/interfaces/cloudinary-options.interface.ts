import { ModuleMetadata } from '@nestjs/common';
import { CloudinaryFolder } from '../cloudinary.constants';

export interface CloudinaryModuleOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export interface CloudinaryModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<CloudinaryModuleOptions> | CloudinaryModuleOptions;
}

export interface UploadImageOptions {
  tenantId: string;
  folder: CloudinaryFolder;
  fileName?: string;
  mimetype: string;
}

export interface UrlTransformOptions {
  thumbnailWidth?: number;
  mediumWidth?: number;
  largeWidth?: number;
}
