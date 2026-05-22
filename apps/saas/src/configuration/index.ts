import { BaseConfiguration } from '@common/configuration/base.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { AppConfiguration } from '@common/configuration/app.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TypeOrmConfiguration } from '@common/configuration/type-orm.config';

const DEFAULT_SAAS_KAFKA_CLIENT_ID = 'qrtable-saas-service';

class SaasPlatformPaymentConfiguration {
  @IsOptional()
  @IsString()
  QR_ACCOUNT?: string;

  @IsOptional()
  @IsString()
  QR_BANK?: string;

  @IsOptional()
  @IsString()
  WEBHOOK_SECRET?: string;

  constructor() {
    this.QR_ACCOUNT =
      process.env['SEPAY_PLATFORM_QR_ACCOUNT']?.trim() || process.env['PAYMENT_SEPAY_QR_ACCOUNT']?.trim() || undefined;
    this.QR_BANK =
      process.env['SEPAY_PLATFORM_QR_BANK']?.trim() || process.env['PAYMENT_SEPAY_QR_BANK']?.trim() || undefined;
    this.WEBHOOK_SECRET = process.env['SEPAY_PLATFORM_WEBHOOK_SECRET']?.trim() || undefined;
  }
}

class SaasKafkaClientConfiguration {
  @IsString()
  CLIENT_ID: string;

  constructor() {
    this.CLIENT_ID = process.env['KAFKA_SAAS_CLIENT_ID'] || DEFAULT_SAAS_KAFKA_CLIENT_ID;
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
  @Type(() => TypeOrmConfiguration)
  TYPEORM_CONFIG = new TypeOrmConfiguration();

  @ValidateNested()
  @Type(() => KafkaConfiguration)
  KAFKA_CONFIG = new KafkaConfiguration();

  @ValidateNested()
  @Type(() => SaasPlatformPaymentConfiguration)
  SAAS_PLATFORM_PAYMENT_CONFIG = new SaasPlatformPaymentConfiguration();

  @ValidateNested()
  @Type(() => SaasKafkaClientConfiguration)
  SAAS_KAFKA_CLIENT_CONFIG = new SaasKafkaClientConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
