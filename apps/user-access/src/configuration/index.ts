import { BaseConfiguration } from '@common/configuration/base.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { AppConfiguration } from '@common/configuration/app.config';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MongoConfiguration, resolveServiceMongoDatabase } from '@common/configuration/mongo.config';
import { GrpcConfiguration } from '@common/configuration/grpc.config';

const DEFAULT_USER_ACCESS_DATABASE = 'qrtable_auth';

class UserAccessMongoConfiguration extends MongoConfiguration {
  constructor() {
    super({
      DB_NAME: resolveServiceMongoDatabase('USER_ACCESS_MONGO_DB_NAME', DEFAULT_USER_ACCESS_DATABASE),
    });
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
  @Type(() => UserAccessMongoConfiguration)
  MONGO_CONFIG = new UserAccessMongoConfiguration();

  @ValidateNested()
  @Type(() => GrpcConfiguration)
  GRPC_SERV = new GrpcConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
