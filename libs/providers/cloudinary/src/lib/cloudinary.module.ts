import { DynamicModule, Module } from '@nestjs/common';
import { CLOUDINARY_MODULE_OPTIONS } from './cloudinary.constants';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryModuleAsyncOptions, CloudinaryModuleOptions } from './interfaces/cloudinary-options.interface';
import { CloudinaryValidators } from './validators/cloudinary.validators';

@Module({})
export class CloudinaryModule {
  static forRoot(options: CloudinaryModuleOptions): DynamicModule {
    return {
      module: CloudinaryModule,
      providers: [
        { provide: CLOUDINARY_MODULE_OPTIONS, useValue: options },
        CloudinaryProvider,
        CloudinaryValidators,
        CloudinaryService,
      ],
      exports: [CloudinaryService],
    };
  }

  static forRootAsync(options: CloudinaryModuleAsyncOptions): DynamicModule {
    return {
      module: CloudinaryModule,
      imports: options.imports || [],
      providers: [
        {
          provide: CLOUDINARY_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        CloudinaryProvider,
        CloudinaryValidators,
        CloudinaryService,
      ],
      exports: [CloudinaryService],
    };
  }
}
