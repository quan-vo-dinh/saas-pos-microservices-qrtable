import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { firstValueFrom, map } from 'rxjs';
import { ObjectId } from 'mongodb';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { ROLE } from '@common/constants/enum/role.enum';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  ChangeStaffRoleTcpRequest,
  CreateStaffTcpRequest,
  GetStaffTcpRequest,
  ListStaffTcpRequest,
  SetStaffStatusTcpRequest,
  StaffListTcpResponse,
  StaffProfileTcpResponse,
  StaffRoleName,
} from '@common/interfaces/tcp/user';
import type {
  CreateStaffKeycloakRequest,
  CreateStaffKeycloakResponse,
  ReplaceKeycloakRealmRolesRequest,
  SetKeycloakUserEnabledRequest,
  SetKeycloakUserEnabledResponse,
} from '@common/interfaces/tcp/authorizer';
import { User } from '@common/schemas/user.schema';
import { Role } from '@common/schemas/role.schema';
import { UserRepository } from '../repositories/user.repository';
import { enforceMaxStaffQuota } from './staff-quota.enforcer';

const MANAGEABLE_STAFF_ROLES = [ROLE.MANAGER, ROLE.WAITER, ROLE.CHEF, ROLE.BARISTA] as const;
const MANAGER_CREATABLE_ROLES = [ROLE.WAITER, ROLE.CHEF, ROLE.BARISTA] as const;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

@Injectable()
export class StaffManagementService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(TCP_SERVICES.AUTHORIZER_SERVICE) private readonly authorizerClient: TcpClient,
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
  ) {}

  async createStaff(request: CreateStaffTcpRequest): Promise<StaffProfileTcpResponse> {
    this.assertCanCreate(request.requestedByRoles, request.roleName);

    const emailExists = await this.userRepository.exists(request.email);
    if (emailExists) {
      throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS, HttpStatus.CONFLICT);
    }

    await enforceMaxStaffQuota({
      tenantId: request.tenantId,
      userRepository: this.userRepository,
      saasClient: this.saasClient,
    });

    const role = await this.userRepository.findRoleByName(request.roleName);
    if (!role?._id) {
      throw new BusinessException(ErrorCode.USER_ROLE_NOT_MANAGEABLE, HttpStatus.BAD_REQUEST);
    }

    let createdKeycloakUserId: string | null = null;

    try {
      const keycloakUser = await this.createKeycloakStaff(request);
      createdKeycloakUserId = keycloakUser.userId;

      const profile = await this.userRepository.createStaffProfile({
        userId: keycloakUser.userId,
        tenantId: request.tenantId,
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        isActive: true,
        roles: [role._id],
      });

      return this.toStaffProfile(profile);
    } catch (error) {
      if (createdKeycloakUserId) {
        await this.setKeycloakUserEnabled({
          userId: createdKeycloakUserId,
          enabled: false,
          reason: 'staff_profile_create_failed',
          processId: request.processId,
        }).catch(() => undefined);
      }
      throw error;
    }
  }

  async listStaff(request: ListStaffTcpRequest): Promise<StaffListTcpResponse> {
    this.assertOwnerOrManager(request.requestedByRoles);

    const manageableRoleIds = await this.getManageableStaffRoleIds();
    const roleId = request.roleName ? (await this.userRepository.findRoleByName(request.roleName))?._id : undefined;

    if (request.roleName && !roleId) {
      return {
        items: [],
        page: request.page ?? DEFAULT_PAGE,
        limit: request.limit ?? DEFAULT_LIMIT,
        total: 0,
      };
    }

    const page = request.page ?? DEFAULT_PAGE;
    const limit = Math.min(request.limit ?? DEFAULT_LIMIT, MAX_LIST_LIMIT);
    const { items, total } = await this.userRepository.listTenantStaff({
      tenantId: request.tenantId,
      manageableRoleIds,
      roleId: roleId ?? undefined,
      status: request.status,
      search: request.search,
      page,
      limit,
    });

    return {
      items: items.map((user) => this.toStaffProfile(user)),
      page,
      limit,
      total,
    };
  }

  async getStaff(request: GetStaffTcpRequest): Promise<StaffProfileTcpResponse> {
    this.assertOwnerOrManager(request.requestedByRoles);

    const user = await this.requireManageableStaffProfile(request.tenantId, request.userId);
    return this.toStaffProfile(user);
  }

  async changeRole(request: ChangeStaffRoleTcpRequest): Promise<StaffProfileTcpResponse> {
    this.assertOwner(request.requestedByRoles);

    const user = await this.requireManageableStaffProfile(request.tenantId, request.userId);
    const previousRoleId = this.getPrimaryRoleId(user);
    const previousRoleName = this.getPrimaryRoleName(user);

    const nextRole = await this.userRepository.findRoleByName(request.roleName);
    if (!nextRole?._id) {
      throw new BusinessException(ErrorCode.USER_ROLE_NOT_MANAGEABLE, HttpStatus.BAD_REQUEST);
    }

    if (previousRoleName === request.roleName) {
      return this.toStaffProfile(user);
    }

    await this.userRepository.setTenantStaffRole({
      tenantId: request.tenantId,
      userId: request.userId,
      roleId: nextRole._id,
    });

    try {
      await this.replaceKeycloakRealmRoles({
        userId: request.userId,
        managedRoleNames: [...MANAGEABLE_STAFF_ROLES],
        nextRoleNames: [request.roleName],
        processId: request.processId,
      });
    } catch (error) {
      if (previousRoleId) {
        await this.userRepository
          .setTenantStaffRole({
            tenantId: request.tenantId,
            userId: request.userId,
            roleId: previousRoleId,
          })
          .catch(() => undefined);
      }
      if (previousRoleName) {
        await this.replaceKeycloakRealmRoles({
          userId: request.userId,
          managedRoleNames: [...MANAGEABLE_STAFF_ROLES],
          nextRoleNames: [previousRoleName],
          processId: request.processId,
        }).catch(() => undefined);
      }
      throw error;
    }

    const updated = await this.requireManageableStaffProfile(request.tenantId, request.userId);
    return this.toStaffProfile(updated);
  }

  async setStatus(request: SetStaffStatusTcpRequest): Promise<StaffProfileTcpResponse> {
    this.assertOwner(request.requestedByRoles);

    const user = await this.requireManageableStaffProfile(request.tenantId, request.userId);

    if (request.enabled === user.isActive) {
      throw new BusinessException(ErrorCode.USER_STATUS_INVALID, HttpStatus.BAD_REQUEST);
    }

    const previousEnabled = user.isActive;

    await this.setKeycloakUserEnabled({
      userId: request.userId,
      enabled: request.enabled,
      reason: request.reason,
      processId: request.processId,
    });

    try {
      const updated = await this.userRepository.setTenantStaffActiveStatus({
        tenantId: request.tenantId,
        userId: request.userId,
        isActive: request.enabled,
        disabledAt: request.enabled ? null : new Date(),
        reason: request.reason,
      });

      if (!updated) {
        throw new BusinessException(ErrorCode.USER_PROFILE_CREATE_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return this.toStaffProfile(updated);
    } catch (error) {
      await this.setKeycloakUserEnabled({
        userId: request.userId,
        enabled: previousEnabled,
        reason: 'staff_status_profile_update_failed',
        processId: request.processId,
      }).catch(() => undefined);
      throw error;
    }
  }

  private isOwner(actorRoles: string[]): boolean {
    return actorRoles.map((role) => role.toUpperCase()).includes(ROLE.OWNER);
  }

  private isManager(actorRoles: string[]): boolean {
    return actorRoles.map((role) => role.toUpperCase()).includes(ROLE.MANAGER);
  }

  private assertCanCreate(actorRoles: string[], roleName: ROLE): void {
    if (
      this.isOwner(actorRoles) &&
      MANAGEABLE_STAFF_ROLES.includes(roleName as (typeof MANAGEABLE_STAFF_ROLES)[number])
    ) {
      return;
    }
    if (
      this.isManager(actorRoles) &&
      MANAGER_CREATABLE_ROLES.includes(roleName as (typeof MANAGER_CREATABLE_ROLES)[number])
    ) {
      return;
    }
    throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
  }

  private assertOwner(actorRoles: string[]): void {
    if (!this.isOwner(actorRoles)) {
      throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
    }
  }

  private assertOwnerOrManager(actorRoles: string[]): void {
    if (!this.isOwner(actorRoles) && !this.isManager(actorRoles)) {
      throw new BusinessException(ErrorCode.AUTH_PERMISSION_DENIED, HttpStatus.FORBIDDEN);
    }
  }

  private async getManageableStaffRoleIds(): Promise<ObjectId[]> {
    const roles = await Promise.all(
      MANAGEABLE_STAFF_ROLES.map((roleName) => this.userRepository.findRoleByName(roleName)),
    );
    return roles.filter((role): role is Role => Boolean(role?._id)).map((role) => role._id);
  }

  private async requireManageableStaffProfile(tenantId: string, userId: string): Promise<User> {
    const user = await this.userRepository.findTenantStaffByUserId({ tenantId, userId });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const roleName = this.getPrimaryRoleName(user);
    if (!roleName || !MANAGEABLE_STAFF_ROLES.includes(roleName as (typeof MANAGEABLE_STAFF_ROLES)[number])) {
      throw new BusinessException(ErrorCode.USER_ROLE_NOT_MANAGEABLE, HttpStatus.BAD_REQUEST);
    }

    return user;
  }

  private getPrimaryRole(user: User): Role | undefined {
    const roles = user.roles as unknown;
    if (!Array.isArray(roles) || roles.length === 0) {
      return undefined;
    }
    return roles[0] as Role;
  }

  private getPrimaryRoleName(user: User): ROLE | undefined {
    return this.getPrimaryRole(user)?.name;
  }

  private getPrimaryRoleId(user: User): ObjectId | undefined {
    const role = this.getPrimaryRole(user);
    return role?._id;
  }

  private toStaffProfile(user: User): StaffProfileTcpResponse {
    const roleName = this.getPrimaryRoleName(user);
    if (!roleName || !MANAGEABLE_STAFF_ROLES.includes(roleName as (typeof MANAGEABLE_STAFF_ROLES)[number])) {
      throw new BusinessException(ErrorCode.USER_ROLE_NOT_MANAGEABLE, HttpStatus.BAD_REQUEST);
    }

    const firstName = user.firstName ?? '';
    const lastName = user.lastName ?? '';
    const displayName = `${firstName} ${lastName}`.trim() || user.email;

    return {
      userId: user.userId,
      tenantId: user.tenantId ?? '',
      email: user.email,
      firstName,
      lastName,
      displayName,
      roleName: roleName as StaffRoleName,
      isActive: user.isActive,
      disabledAt: user.disabledAt ? user.disabledAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private createKeycloakStaff(request: CreateStaffTcpRequest): Promise<CreateStaffKeycloakResponse> {
    const payload: CreateStaffKeycloakRequest = {
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      tenantId: request.tenantId,
      roleNames: [request.roleName],
      password: request.password,
      requirePasswordUpdate: request.requirePasswordUpdate,
      processId: request.processId,
    };

    return firstValueFrom(
      this.authorizerClient
        .send<CreateStaffKeycloakResponse>(TCP_REQUEST_MESSAGE.KEYCLOAK.CREATE_STAFF_USER, {
          data: payload,
          processId: request.processId,
        })
        .pipe(map((response) => response.data)),
    );
  }

  private replaceKeycloakRealmRoles(request: ReplaceKeycloakRealmRolesRequest): Promise<boolean> {
    return firstValueFrom(
      this.authorizerClient
        .send<boolean>(TCP_REQUEST_MESSAGE.KEYCLOAK.REPLACE_REALM_ROLES, {
          data: request,
          processId: request.processId,
        })
        .pipe(map((response) => response.data)),
    );
  }

  private setKeycloakUserEnabled(request: SetKeycloakUserEnabledRequest): Promise<SetKeycloakUserEnabledResponse> {
    return firstValueFrom(
      this.authorizerClient
        .send<SetKeycloakUserEnabledResponse>(TCP_REQUEST_MESSAGE.KEYCLOAK.SET_USER_ENABLED, {
          data: request,
          processId: request.processId,
        })
        .pipe(map((response) => response.data)),
    );
  }
}
