import { IsNotEmpty, IsString } from 'class-validator';

export class CloudinaryConfiguration {
  @IsString()
  @IsNotEmpty()
  CLOUD_NAME: string;

  @IsString()
  @IsNotEmpty()
  API_KEY: string;

  @IsString()
  @IsNotEmpty()
  API_SECRET: string;

  constructor(data?: Partial<CloudinaryConfiguration>) {
    this.CLOUD_NAME = data?.CLOUD_NAME || process.env['CLOUDINARY_CLOUD_NAME'] || '';
    this.API_KEY = data?.API_KEY || process.env['CLOUDINARY_API_KEY'] || '';
    this.API_SECRET = data?.API_SECRET || process.env['CLOUDINARY_API_SECRET'] || '';
  }
}
