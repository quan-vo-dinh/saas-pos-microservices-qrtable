import { CreateUserRequestDto } from '../../gateway/user';

export type CreateUserTcpRequest = CreateUserRequestDto & {
  tenantId?: string;
};

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
