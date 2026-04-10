import { Provider } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CLOUDINARY_INJECTION_TOKEN, CLOUDINARY_MODULE_OPTIONS } from './cloudinary.constants';
import { CloudinaryModuleOptions } from './interfaces/cloudinary-options.interface';

export const CloudinaryProvider: Provider = {
  provide: CLOUDINARY_INJECTION_TOKEN,
  useFactory: (options: CloudinaryModuleOptions) => {
    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
    });
    return cloudinary;
  },
  inject: [CLOUDINARY_MODULE_OPTIONS],
};
