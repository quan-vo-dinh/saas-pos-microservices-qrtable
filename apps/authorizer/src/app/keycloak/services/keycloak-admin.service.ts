import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type {
  AssignKeycloakRealmRolesRequest,
  CreateStaffKeycloakRequest,
  CreateTenantOwnerKeycloakRequest,
  DisableKeycloakUserRequest,
  GetKeycloakUserAdminRequest,
  ReplaceKeycloakRealmRolesRequest,
  SetKeycloakUserEnabledRequest,
} from '@common/interfaces/tcp/authorizer';
import type {
  CreateStaffKeycloakResponse,
  CreateTenantOwnerKeycloakResponse,
  DisableKeycloakUserResponse,
  KeycloakUserAdminResponse,
  SetKeycloakUserEnabledResponse,
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
      this.throwMappedKeycloakAdminError(error, ErrorCode.OWNER_EMAIL_ALREADY_EXISTS);
    }

    if (!userId) {
      throw new BusinessException(ErrorCode.KEYCLOAK_USER_CREATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      await this.assignRealmRoles({ userId, roleNames: request.roleNames, processId: request.processId });
    } catch (error) {
      await this.disableUser({ userId, reason: 'tenant_owner_role_assign_failed' }).catch(() => undefined);
      this.throwMappedKeycloakAdminError(error, ErrorCode.OWNER_EMAIL_ALREADY_EXISTS);
    }
    return { userId, email: request.email, enabled: true, requiredActions };
  }

  async createStaffUser(request: CreateStaffKeycloakRequest): Promise<CreateStaffKeycloakResponse> {
    const requirePasswordUpdate = request.requirePasswordUpdate !== false;
    const requiredActions = requirePasswordUpdate ? [PASSWORD_REQUIRED_ACTION] : [];
    const { access_token: accessToken } = await this.keycloakHttp.exchangeClientToken();

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
        },
        credentials: [
          {
            type: 'password',
            value: request.password,
            temporary: requirePasswordUpdate,
          },
        ],
      });
      const location = headers.location;
      userId = Array.isArray(location) ? location[0]?.split('/').pop() : location?.split('/').pop();
    } catch (error) {
      this.throwMappedKeycloakAdminError(error, ErrorCode.USER_ALREADY_EXISTS);
    }

    if (!userId) {
      throw new BusinessException(ErrorCode.KEYCLOAK_USER_CREATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      await this.assignRealmRoles({ userId, roleNames: request.roleNames, processId: request.processId });
    } catch (error) {
      await this.disableUser({ userId, reason: 'staff_role_assign_failed' }).catch(() => undefined);
      this.throwMappedKeycloakAdminError(error, ErrorCode.USER_ALREADY_EXISTS);
    }

    return { userId, email: request.email, enabled: true, requiredActions };
  }

  async replaceRealmRoles(request: ReplaceKeycloakRealmRolesRequest): Promise<void> {
    const { access_token: accessToken } = await this.keycloakHttp.exchangeClientToken();
    const currentRoles = await this.keycloakHttp.getUserRealmRoles(accessToken, request.userId);
    const managedRoleNames = new Set(request.managedRoleNames);
    const rolesToRemove = currentRoles.filter((role) => managedRoleNames.has(String(role.name ?? '')));
    const removedRoleNames = rolesToRemove
      .map((role) => String(role.name ?? ''))
      .filter((roleName) => roleName.length > 0);

    await this.keycloakHttp.deleteRealmRoles(accessToken, request.userId, rolesToRemove);

    try {
      await this.assignRealmRoles({
        userId: request.userId,
        roleNames: request.nextRoleNames,
        processId: request.processId,
      });
    } catch (error) {
      if (removedRoleNames.length) {
        await this.assignRealmRoles({
          userId: request.userId,
          roleNames: removedRoleNames,
          processId: request.processId,
        }).catch(() => undefined);
      }
      throw error;
    }
  }

  async setUserEnabled(request: SetKeycloakUserEnabledRequest): Promise<SetKeycloakUserEnabledResponse> {
    const { access_token: accessToken } = await this.keycloakHttp.exchangeClientToken();
    const user = await this.keycloakHttp.getUserById(accessToken, request.userId);
    const existingAttributes = (user.attributes as Record<string, string[]> | undefined) ?? {};
    const attributes: Record<string, string[]> = {
      ...existingAttributes,
      disabled_reason: [request.reason],
    };

    const payload = this.buildKeycloakUserUpdatePayload(user, {
      enabled: request.enabled,
      attributes,
    });

    await this.keycloakHttp.updateUser(accessToken, request.userId, payload);

    return { userId: request.userId, enabled: request.enabled };
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
    await this.setUserEnabled({
      userId: request.userId,
      enabled: false,
      reason: request.reason,
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

  private buildKeycloakUserUpdatePayload(
    user: Record<string, unknown>,
    patch: Record<string, unknown>,
  ): Record<string, unknown> {
    const readOnlyKeys = new Set([
      'id',
      'createdTimestamp',
      'access',
      'federationLink',
      'serviceAccountClientId',
      'origin',
      'self',
    ]);

    const preserved = Object.fromEntries(Object.entries(user).filter(([key]) => !readOnlyKeys.has(key)));

    return {
      ...preserved,
      ...patch,
    };
  }

  private throwMappedKeycloakAdminError(
    error: unknown,
    duplicateErrorCode: ErrorCode = ErrorCode.OWNER_EMAIL_ALREADY_EXISTS,
  ): never {
    if (this.keycloakHttp.isDuplicateUserError(error)) {
      throw new BusinessException(duplicateErrorCode, HttpStatus.CONFLICT);
    }

    if (this.keycloakHttp.isForbiddenError(error)) {
      throw new BusinessException(ErrorCode.KEYCLOAK_ADMIN_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
    }

    throw error;
  }
}
