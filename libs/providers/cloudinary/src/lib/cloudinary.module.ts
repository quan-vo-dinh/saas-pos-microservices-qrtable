import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CLOUDINARY_MODULE_OPTIONS } from './cloudinary.constants';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryModuleAsyncOptions, CloudinaryModuleOptions } from './interfaces/cloudinary-options.interface';
import { CloudinaryConfiguration } from './cloudinary.config';
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

  /**
   * Self-resolving async registration — reads from CLOUDINARY_CONFIG namespace.
   * Requires CLOUDINARY_CONFIG to be registered in app's Configuration class.
   *
   * Usage: `CloudinaryModule.forRootAsync()`
   * Override: `CloudinaryModule.forRootAsync({ useFactory: ... })` for custom config.
   */
  static forRootAsync(options?: CloudinaryModuleAsyncOptions): DynamicModule {
    const defaultOptions: CloudinaryModuleAsyncOptions = {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<CloudinaryConfiguration>('CLOUDINARY_CONFIG');
        return {
          cloudName: config?.CLOUD_NAME ?? '',
          apiKey: config?.API_KEY ?? '',
          apiSecret: config?.API_SECRET ?? '',
        };
      },
    };

    const resolved = options ?? defaultOptions;

    return {
      module: CloudinaryModule,
      imports: resolved.imports || [],
      providers: [
        {
          provide: CLOUDINARY_MODULE_OPTIONS,
          useFactory: resolved.useFactory,
          inject: resolved.inject || [],
        },
        CloudinaryProvider,
        CloudinaryValidators,
        CloudinaryService,
      ],
      exports: [CloudinaryService],
    };
  }
}
