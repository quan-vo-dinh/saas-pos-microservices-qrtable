import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type {
  AssignKeycloakRealmRolesRequest,
  CreateTenantOwnerKeycloakRequest,
  DisableKeycloakUserRequest,
  GetKeycloakUserAdminRequest,
} from '@common/interfaces/tcp/authorizer';
import type {
  CreateTenantOwnerKeycloakResponse,
  DisableKeycloakUserResponse,
  KeycloakUserAdminResponse,
} from '@common/interfaces/tcp/authorizer';
import { HttpStatus, Injectable } from '@nestjs/common';
import { KeycloakHttpService } from './keycloak-http.service';

const PASSWORD_REQUIRED_ACTION = 'UPDATE_PASSWORD';

@Injectable()
export class KeycloakAdminService {
  constructor(private readonly keycloakHttp: KeycloakHttpService) {}

  async createTenantOwner(request: CreateTenantOwnerKeycloakRequest): Promise<CreateTenantOwnerKeycloakResponse> {
    const { access_token: accessToken } = await this.keycloakHttp.exchangeClientToken();
    const requiredActions = request.temporaryPassword ? [PASSWORD_REQUIRED_ACTION] : [];

    let userId: string | undefined;
    try {
      const { headers } = await this.keycloakHttp.createUserWithToken(accessToken, {
        email: request.email,
        username: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        enabled: true,
        emailVerified: true,
        requiredActions,
        attributes: {
          tenant_id: [request.tenantId],
          tenant_slug: [request.tenantSlug],
        },
        ...(request.temporaryPassword
          ? {
              credentials: [
                {
                  type: 'password',
                  value: request.temporaryPassword,
                  temporary: true,
                },
              ],
            }
          : {}),
      });
      const location = headers.location;
      userId = Array.isArray(location) ? location[0]?.split('/').pop() : location?.split('/').pop();
    } catch (error) {
      this.throwMappedKeycloakAdminError(error);
    }

    if (!userId) {
      throw new BusinessException(ErrorCode.KEYCLOAK_USER_CREATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      await this.assignRealmRoles({ userId, roleNames: request.roleNames, processId: request.processId });
    } catch (error) {
      this.throwMappedKeycloakAdminError(error);
    }
    return { userId, email: request.email, enabled: true, requiredActions };
  }

  async assignRealmRoles(request: AssignKeycloakRealmRolesRequest): Promise<void> {
    const roleNames = Array.from(new Set(request.roleNames.map((role) => role.trim()).filter(Boolean)));
    if (!roleNames.length) {
      return;
    }
    const { access_token: accessToken } = await this.keycloakHttp.exchangeClientToken();
    const roles = await Promise.all(
      roleNames.map(async (roleName) => {
        const { data } = await this.keycloakHttp.getRealmRole(accessToken, roleName);
        return data;
      }),
    );
    await this.keycloakHttp.assignRealmRoles(accessToken, request.userId, roles);
  }

  async disableUser(request: DisableKeycloakUserRequest): Promise<DisableKeycloakUserResponse> {
    const { access_token: accessToken } = await this.keycloakHttp.exchangeClientToken();
    await this.keycloakHttp.updateUser(accessToken, request.userId, {
      enabled: false,
      attributes: {
        disabled_reason: [request.reason],
      },
    });
    return { userId: request.userId, enabled: false };
  }

  async getUserById(request: GetKeycloakUserAdminRequest): Promise<KeycloakUserAdminResponse> {
    const { access_token: accessToken } = await this.keycloakHttp.exchangeClientToken();
    const user = await this.keycloakHttp.getUserById(accessToken, request.userId);
    return {
      userId: String(user.id ?? request.userId),
      email: user.email ? String(user.email) : undefined,
      firstName: user.firstName ? String(user.firstName) : undefined,
      lastName: user.lastName ? String(user.lastName) : undefined,
      enabled: typeof user.enabled === 'boolean' ? user.enabled : undefined,
      attributes: user.attributes as Record<string, string[]> | undefined,
    };
  }

  private throwMappedKeycloakAdminError(error: unknown): never {
    if (this.keycloakHttp.isDuplicateUserError(error)) {
      throw new BusinessException(ErrorCode.OWNER_EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT);
    }

    if (this.keycloakHttp.isForbiddenError(error)) {
      throw new BusinessException(ErrorCode.KEYCLOAK_ADMIN_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
    }

    throw error;
  }
}
