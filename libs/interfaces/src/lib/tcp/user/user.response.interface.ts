import { User } from '@common/schemas/user.schema';

export type UserTcpResponse = User;

export interface CountTenantUsersResponse {
  tenantId: string;
  count: number;
}

export interface DisableTenantUsersResponse {
  tenantId: string;
  modifiedCount: number;
}
