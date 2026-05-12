import type {
  CountTenantUsersRequest,
  CountTenantUsersResponse,
  DisableTenantUsersRequest,
  DisableTenantUsersResponse,
  UpsertTenantOwnerProfileRequest,
} from '@common/interfaces/tcp/user';
import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class TenantUserService {
  constructor(private readonly userRepository: UserRepository) {}

  upsertOwnerProfile(request: UpsertTenantOwnerProfileRequest) {
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
}
