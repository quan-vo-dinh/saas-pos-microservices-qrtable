import { AppConfiguration } from '@common/configuration/app.config';
import { BaseConfiguration } from '@common/configuration/base.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { TypeOrmConfiguration } from '@common/configuration/type-orm.config';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

const DEFAULT_PAYMENT_PORT = 3308;
const DEFAULT_PAYMENT_DATABASE = 'qrtable';
const DEFAULT_ORDER_TCP_TIMEOUT_MS = 5000;

class PaymentAppConfiguration extends AppConfiguration {
  constructor() {
    super();
    this.PORT = Number(process.env['PAYMENT_PORT'] ?? DEFAULT_PAYMENT_PORT);
  }
}

class PaymentTypeOrmConfiguration extends TypeOrmConfiguration {
  constructor() {
    const dedicatedDatabase = process.env['PAYMENT_TYPEORM_DATABASE'];
    const nodeEnv = process.env['NODE_ENV'] || 'development';
    if ((nodeEnv === 'production' || nodeEnv === 'staging') && !dedicatedDatabase) {
      throw new Error('PAYMENT_TYPEORM_DATABASE is required for payment service in staging/production');
    }
    super({
      DATABASE: dedicatedDatabase || process.env['TYPEORM_DATABASE'] || DEFAULT_PAYMENT_DATABASE,
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
  @Type(() => PaymentIntegrationConfiguration)
  PAYMENT_INTEGRATION_CONFIG = new PaymentIntegrationConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
