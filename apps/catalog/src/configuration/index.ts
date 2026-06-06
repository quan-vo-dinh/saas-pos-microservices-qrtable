import { BaseConfiguration } from '@common/configuration/base.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { AppConfiguration } from '@common/configuration/app.config';
import { IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { resolveServicePostgresDatabase, TypeOrmConfiguration } from '@common/configuration/type-orm.config';
import { KafkaConfiguration } from '@common/configuration/kafka.config';

const DEFAULT_CATALOG_KAFKA_CLIENT_ID = 'qrtable-catalog-service';
const DEFAULT_CATALOG_TENANT_CONSUMER_GROUP = 'catalog-tenant-created-consumer-group';
const DEFAULT_CATALOG_DATABASE = 'qrtable_catalog';

class CatalogTypeOrmConfiguration extends TypeOrmConfiguration {
  constructor() {
    super({
      DATABASE: resolveServicePostgresDatabase('CATALOG_TYPEORM_DATABASE', DEFAULT_CATALOG_DATABASE),
    });
  }
}

class CatalogTenantEventsConfiguration {
  @IsString()
  CLIENT_ID: string;

  @IsString()
  TENANT_CONSUMER_GROUP_ID: string;

  constructor() {
    this.CLIENT_ID = process.env['KAFKA_CATALOG_CLIENT_ID'] || DEFAULT_CATALOG_KAFKA_CLIENT_ID;
    this.TENANT_CONSUMER_GROUP_ID =
      process.env['KAFKA_CATALOG_TENANT_CONSUMER_GROUP'] || DEFAULT_CATALOG_TENANT_CONSUMER_GROUP;
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
  @Type(() => CatalogTypeOrmConfiguration)
  TYPEORM_CONFIG = new CatalogTypeOrmConfiguration();

  @ValidateNested()
  @Type(() => KafkaConfiguration)
  KAFKA_CONFIG = new KafkaConfiguration();

  @ValidateNested()
  @Type(() => CatalogTenantEventsConfiguration)
  CATALOG_TENANT_EVENTS_CONFIG = new CatalogTenantEventsConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
