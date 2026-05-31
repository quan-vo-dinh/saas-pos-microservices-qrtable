import { ROLE } from '@common/constants/enum/role.enum';
import { CreateUserRequestDto } from '../../gateway/user';

export type CreateUserTcpRequest = CreateUserRequestDto & {
  tenantId?: string;
};

export type StaffRoleName = ROLE.MANAGER | ROLE.WAITER | ROLE.CHEF | ROLE.BARISTA;

export interface StaffActorContext {
  requestedByUserId: string;
  requestedByRoles: string[];
}

export interface CreateStaffTcpRequest extends StaffActorContext {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleName: StaffRoleName;
  password: string;
  requirePasswordUpdate?: boolean;
  processId?: string;
}

export interface ListStaffTcpRequest extends StaffActorContext {
  tenantId: string;
  search?: string;
  roleName?: StaffRoleName;
  status?: 'ACTIVE' | 'DISABLED';
  page?: number;
  limit?: number;
  processId?: string;
}

export interface GetStaffTcpRequest extends StaffActorContext {
  tenantId: string;
  userId: string;
  processId?: string;
}

export interface ChangeStaffRoleTcpRequest extends StaffActorContext {
  tenantId: string;
  userId: string;
  roleName: StaffRoleName;
  processId?: string;
}

export interface SetStaffStatusTcpRequest extends StaffActorContext {
  tenantId: string;
  userId: string;
  enabled: boolean;
  reason: string;
  processId?: string;
}

export interface UpsertTenantOwnerProfileRequest {
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  roleNames: string[];
  processId?: string;
}

export interface DisableTenantUsersRequest {
  tenantId: string;
  reason: string;
  processId?: string;
}

export interface CountTenantUsersRequest {
  tenantId: string;
  activeOnly?: boolean;
  processId?: string;
}
