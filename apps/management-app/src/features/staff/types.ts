import type { AppRole } from '@einvoice/shared-constants';

export type StaffRoleName = Extract<AppRole, 'MANAGER' | 'WAITER' | 'CHEF' | 'BARISTA'>;
export type StaffStatus = 'ACTIVE' | 'DISABLED';

export type StaffProfile = {
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
};

export type StaffListQuery = {
  search?: string;
  roleName?: StaffRoleName;
  status?: StaffStatus;
  page?: number;
  limit?: number;
};

export type StaffListResponse = {
  items: StaffProfile[];
  page: number;
  limit: number;
  total: number;
};

export type CreateStaffPayload = {
  email: string;
  firstName: string;
  lastName: string;
  roleName: StaffRoleName;
  password: string;
  requirePasswordUpdate?: boolean;
};
