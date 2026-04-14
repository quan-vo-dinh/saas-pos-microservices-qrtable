import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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

  /**
   * Self-resolving async registration — reads from ConfigService automatically.
   * Usage: `CloudinaryModule.forRootAsync()`
   * Override: `CloudinaryModule.forRootAsync({ useFactory: ... })` for custom config.
   */
  static forRootAsync(options?: CloudinaryModuleAsyncOptions): DynamicModule {
    const defaultOptions: CloudinaryModuleAsyncOptions = {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        cloudName: configService.get<string>('CLOUDINARY_CLOUD_NAME', ''),
        apiKey: configService.get<string>('CLOUDINARY_API_KEY', ''),
        apiSecret: configService.get<string>('CLOUDINARY_API_SECRET', ''),
      }),
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
