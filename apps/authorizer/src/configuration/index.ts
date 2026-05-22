import { BaseConfiguration } from '@common/configuration/base.config';
import { TcpConfiguration } from '@common/configuration/tcp.config';
import { AppConfiguration } from '@common/configuration/app.config';
import { IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { KeycloakConfiguration } from '@common/configuration/keycloak.config';
import { GrpcConfiguration } from '@common/configuration/grpc.config';

class AuthorizerAuthConfiguration {
  @IsBoolean()
  AUTO_PROVISION_ON_FIRST_LOGIN: boolean;

  constructor() {
    this.AUTO_PROVISION_ON_FIRST_LOGIN = process.env['AUTH_AUTO_PROVISION_ON_FIRST_LOGIN'] === 'true';
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
  @Type(() => KeycloakConfiguration)
  KEYCLOAK_CONFIG = new KeycloakConfiguration();

  @ValidateNested()
  @Type(() => GrpcConfiguration)
  GRPC_SERV = new GrpcConfiguration();

  @ValidateNested()
  @Type(() => AuthorizerAuthConfiguration)
  AUTHORIZER_AUTH_CONFIG = new AuthorizerAuthConfiguration();
}

export const CONFIGURATION = new Configuration();
export type TConfiguration = typeof CONFIGURATION;

CONFIGURATION.validate();
