import type {
  CountTenantUsersRequest,
  CountTenantUsersResponse,
  DisableTenantUsersRequest,
  DisableTenantUsersResponse,
  UpsertTenantOwnerProfileRequest,
} from '@common/interfaces/tcp/user';
import { Inject, Injectable } from '@nestjs/common';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { UserRepository } from '../repositories/user.repository';
import { enforceMaxStaffQuota } from './staff-quota.enforcer';

@Injectable()
export class TenantUserService {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(TCP_SERVICES.SAAS_SERVICE) private readonly saasClient: TcpClient,
  ) {}

  async upsertOwnerProfile(request: UpsertTenantOwnerProfileRequest) {
    const isOwnerProfile = request.roleNames?.some((role) => role.toUpperCase() === 'OWNER');
    if (!isOwnerProfile) {
      await enforceMaxStaffQuota({
        tenantId: request.tenantId,
        userRepository: this.userRepository,
        saasClient: this.saasClient,
      });
    }

    return this.userRepository.upsertTenantUserByUserId({
      userId: request.userId,
      tenantId: request.tenantId,
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      roleNames: request.roleNames,
    });
  }

  async disableTenantUsers(request: DisableTenantUsersRequest): Promise<DisableTenantUsersResponse> {
    const result = await this.userRepository.disableUsersByTenantId({
      tenantId: request.tenantId,
      disabledAt: new Date(),
      reason: request.reason,
    });
    return { tenantId: request.tenantId, modifiedCount: result.modifiedCount };
  }

  async countTenantUsers(request: CountTenantUsersRequest): Promise<CountTenantUsersResponse> {
    const count = await this.userRepository.countByTenantId({
      tenantId: request.tenantId,
      activeOnly: request.activeOnly ?? true,
    });
    return { tenantId: request.tenantId, count };
  }

  findOwnerByTenantId(tenantId: string) {
    return this.userRepository.findOwnerByTenantId(tenantId);
  }
}
