import { AppConfiguration } from '@common/configuration/app.config';
import { BaseConfiguration } from '@common/configuration/base.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { resolveServicePostgresDatabase, TypeOrmConfiguration } from '@common/configuration/type-orm.config';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

const DEFAULT_PAYMENT_PORT = 3308;
const DEFAULT_PAYMENT_DATABASE = 'qrtable_payment';
const DEFAULT_ORDER_TCP_TIMEOUT_MS = 5000;

class PaymentAppConfiguration extends AppConfiguration {
  constructor() {
    super();
    this.PORT = Number(process.env['PAYMENT_PORT'] ?? DEFAULT_PAYMENT_PORT);
  }
}

class PaymentTypeOrmConfiguration extends TypeOrmConfiguration {
  constructor() {
    super({
      DATABASE: resolveServicePostgresDatabase('PAYMENT_TYPEORM_DATABASE', DEFAULT_PAYMENT_DATABASE),
    });
  }
}

class SepayConfiguration {
  @IsOptional()
  @IsString()
  QR_ACCOUNT?: string;

  @IsOptional()
  @IsString()
  QR_BANK?: string;

  constructor() {
    this.QR_ACCOUNT = process.env['PAYMENT_SEPAY_QR_ACCOUNT']?.trim() || undefined;
    this.QR_BANK = process.env['PAYMENT_SEPAY_QR_BANK']?.trim() || undefined;
  }
}

class SepayOAuthConfiguration {
  @IsOptional()
  @IsString()
  BASE_URL?: string;

  @IsOptional()
  @IsString()
  CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  CLIENT_SECRET?: string;

  @IsOptional()
  @IsString()
  REDIRECT_URI?: string;

  @IsOptional()
  @IsString()
  PUBLIC_API_BASE_URL?: string;

  constructor() {
    this.BASE_URL = process.env['SEPAY_OAUTH_BASE_URL']?.trim() || 'https://my.sepay.vn';
    this.CLIENT_ID = process.env['SEPAY_OAUTH_CLIENT_ID']?.trim() || undefined;
    this.CLIENT_SECRET = process.env['SEPAY_OAUTH_CLIENT_SECRET']?.trim() || undefined;
    this.REDIRECT_URI = process.env['SEPAY_OAUTH_REDIRECT_URI']?.trim() || undefined;
    this.PUBLIC_API_BASE_URL = process.env['PUBLIC_API_BASE_URL']?.trim() || undefined;
    requireWhenDeployed('SEPAY_OAUTH_CLIENT_ID', this.CLIENT_ID);
    requireWhenDeployed('SEPAY_OAUTH_CLIENT_SECRET', this.CLIENT_SECRET);
    requireWhenDeployed('SEPAY_OAUTH_REDIRECT_URI', this.REDIRECT_URI);
    requireWhenDeployed('PUBLIC_API_BASE_URL', this.PUBLIC_API_BASE_URL);
  }
}

class PaymentSecretsConfiguration {
  @IsOptional()
  @IsString()
  ENCRYPTION_KEY?: string;

  constructor() {
    this.ENCRYPTION_KEY = process.env['PAYMENT_SECRETS_ENCRYPTION_KEY']?.trim() || undefined;
    requireWhenDeployed('PAYMENT_SECRETS_ENCRYPTION_KEY', this.ENCRYPTION_KEY);
    if (this.ENCRYPTION_KEY && !/^[a-f0-9]{64}$/i.test(this.ENCRYPTION_KEY)) {
      throw new Error('PAYMENT_SECRETS_ENCRYPTION_KEY must be a 64-character hex string');
    }
  }
}

class PaymentIntegrationConfiguration {
  @IsNumber()
  ORDER_TCP_TIMEOUT_MS: number;

  constructor() {
    this.ORDER_TCP_TIMEOUT_MS = Number(process.env['PAYMENT_ORDER_TCP_TIMEOUT_MS'] ?? DEFAULT_ORDER_TCP_TIMEOUT_MS);
  }
}

class Configuration extends BaseConfiguration {
  @ValidateNested()
  @Type(() => PaymentAppConfiguration)
  APP_CONFIG = new PaymentAppConfiguration();

  @ValidateNested()
  @Type(() => TcpConfiguration)
  TCP_SERV = new TcpConfiguration();

  @ValidateNested()
  @Type(() => PaymentTypeOrmConfiguration)
  TYPEORM_CONFIG = new PaymentTypeOrmConfiguration();

  @ValidateNested()
  @Type(() => KafkaConfiguration)
  KAFKA_CONFIG = new KafkaConfiguration();

  @ValidateNested()
  @Type(() => SepayConfiguration)
  SEPAY_CONFIG = new SepayConfiguration();

  @ValidateNested()
  @Type(() => SepayOAuthConfiguration)
  SEPAY_OAUTH_CONFIG = new SepayOAuthConfiguration();

  @ValidateNested()
  @Type(() => PaymentSecretsConfiguration)
  PAYMENT_SECRETS_CONFIG = new PaymentSecretsConfiguration();

  @ValidateNested()
  @Type(() => PaymentIntegrationConfiguration)
  PAYMENT_INTEGRATION_CONFIG = new PaymentIntegrationConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();

function requireWhenDeployed(name: string, value: string | undefined): void {
  const nodeEnv = process.env['NODE_ENV'] || 'development';
  if ((nodeEnv === 'production' || nodeEnv === 'staging') && !value) {
    throw new Error(`${name} is required for payment service in staging/production`);
  }
}
