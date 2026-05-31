import { User } from '@common/schemas/user.schema';
import type { StaffRoleName } from './user.request.interface';

export type UserTcpResponse = User;

export interface CountTenantUsersResponse {
  tenantId: string;
  count: number;
}

export interface DisableTenantUsersResponse {
  tenantId: string;
  modifiedCount: number;
}

export interface StaffProfileTcpResponse {
  userId: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  roleName: StaffRoleName;
  isActive: boolean;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffListTcpResponse {
  items: StaffProfileTcpResponse[];
  page: number;
  limit: number;
  total: number;
}
