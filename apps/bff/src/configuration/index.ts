import { GrpcConfiguration } from '@common/configuration/grpc.config';
import { BaseConfiguration } from '@common/configuration/base.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { AppConfiguration } from '@common/configuration/app.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { parseCorsOrigins } from './cors-origins';
import { RedisConfiguration } from '@common/configuration/redis.config';

const DEFAULT_PAYMENT_TCP_TIMEOUT_MS = 5000;
const DEFAULT_PLATFORM_CONTACT_EMAIL = 'support@qrtable.local';

class BffPaymentConfiguration {
  @IsNumber()
  PAYMENT_TCP_TIMEOUT_MS: number;

  @IsOptional()
  @IsString()
  SEPAY_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  PUBLIC_API_BASE_URL?: string;

  constructor() {
    this.PAYMENT_TCP_TIMEOUT_MS = Number(process.env['BFF_PAYMENT_TCP_TIMEOUT_MS'] ?? DEFAULT_PAYMENT_TCP_TIMEOUT_MS);
    this.SEPAY_WEBHOOK_SECRET = process.env['SEPAY_WEBHOOK_SECRET']?.trim() || undefined;
    this.PUBLIC_API_BASE_URL = process.env['PUBLIC_API_BASE_URL']?.trim() || undefined;
  }
}

class BffPlatformConfiguration {
  @IsString()
  PLATFORM_CONTACT_EMAIL: string;

  constructor() {
    this.PLATFORM_CONTACT_EMAIL = process.env['PLATFORM_CONTACT_EMAIL']?.trim() || DEFAULT_PLATFORM_CONTACT_EMAIL;
  }
}

class BffCorsConfiguration {
  @IsArray()
  @IsString({ each: true })
  readonly CORS_ORIGINS: readonly string[];

  constructor() {
    const raw = process.env['CORS_ORIGINS']?.trim();
    const nodeEnv = process.env['NODE_ENV']?.trim() || 'development';
    this.CORS_ORIGINS = parseCorsOrigins(raw, nodeEnv);
  }
}

class Configuration extends BaseConfiguration {
  @ValidateNested()
  @Type(() => AppConfiguration)
  APP_CONFIG = new AppConfiguration();

  @ValidateNested()
  @Type(() => TcpConfiguration)
  TCP_SERV = new TcpConfiguration();

  @ValidateNested()
  @Type(() => RedisConfiguration)
  REDIS_CONFIG = new RedisConfiguration();

  @ValidateNested()
  @Type(() => KafkaConfiguration)
  KAFKA_CONFIG = new KafkaConfiguration();

  @ValidateNested()
  @Type(() => GrpcConfiguration)
  GRPC_SERV = new GrpcConfiguration();

  @ValidateNested()
  @Type(() => BffPaymentConfiguration)
  BFF_PAYMENT_CONFIG = new BffPaymentConfiguration();

  @ValidateNested()
  @Type(() => BffPlatformConfiguration)
  BFF_PLATFORM_CONFIG = new BffPlatformConfiguration();

  @ValidateNested()
  @Type(() => BffCorsConfiguration)
  BFF_CORS_CONFIG = new BffCorsConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
