import { Module } from '@nestjs/common';
import { KeycloakController } from './controllers/keycloak.controller';
import { KeycloakAdminService } from './services/keycloak-admin.service';
import { KeycloakHttpService } from './services/keycloak-http.service';

@Module({
  imports: [],
  controllers: [KeycloakController],
  providers: [KeycloakHttpService, KeycloakAdminService],
  exports: [KeycloakHttpService, KeycloakAdminService],
})
export class KeycloakModule {}
