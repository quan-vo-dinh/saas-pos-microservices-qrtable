import { Controller, UseInterceptors } from '@nestjs/common';
import { TcpLoggingInterceptor } from '@common/interceptors/tcpLogging.interceptor';
import { KeycloakHttpService } from '../services/keycloak-http.service';
import { MessagePattern } from '@nestjs/microservices';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { RequestParams } from '@common/decorators/request-param.decorator';
import { CreateKeyCloakUserTcpRequest } from '@common/interfaces/tcp/authorizer';
import { Response } from '@common/interfaces/tcp/common/response.interface';
import {
  AssignKeycloakRealmRolesRequest,
  CreateTenantOwnerKeycloakRequest,
  DisableKeycloakUserRequest,
  GetKeycloakUserAdminRequest,
} from '@common/interfaces/tcp/authorizer';
import { KeycloakAdminService } from '../services/keycloak-admin.service';

@Controller()
@UseInterceptors(TcpLoggingInterceptor)
export class KeycloakController {
  constructor(
    private readonly keycloakHttpService: KeycloakHttpService,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  @MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_USER)
  async createUser(@RequestParams() data: CreateKeyCloakUserTcpRequest): Promise<Response<string>> {
    const result = await this.keycloakHttpService.createUser(data);
    return Response.success<string>(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_TENANT_OWNER)
  async createTenantOwner(@RequestParams() data: CreateTenantOwnerKeycloakRequest) {
    const result = await this.keycloakAdminService.createTenantOwner(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.ASSIGN_REALM_ROLES)
  async assignRealmRoles(@RequestParams() data: AssignKeycloakRealmRolesRequest) {
    await this.keycloakAdminService.assignRealmRoles(data);
    return Response.success(true);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.DISABLE_USER)
  async disableUser(@RequestParams() data: DisableKeycloakUserRequest) {
    const result = await this.keycloakAdminService.disableUser(data);
    return Response.success(result);
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.KEYCLOAK.GET_USER_ADMIN)
  async getUserAdmin(@RequestParams() data: GetKeycloakUserAdminRequest) {
    const result = await this.keycloakAdminService.getUserById(data);
    return Response.success(result);
  }
}
