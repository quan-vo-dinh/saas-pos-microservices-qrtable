export type CreateKeyCloakUserTcpRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
};

export interface CreateTenantOwnerKeycloakRequest {
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  tenantSlug: string;
  roleNames: string[];
  temporaryPassword?: string;
  processId?: string;
}

export interface AssignKeycloakRealmRolesRequest {
  userId: string;
  roleNames: string[];
  processId?: string;
}

export interface DisableKeycloakUserRequest {
  userId: string;
  reason: string;
  processId?: string;
}

export interface GetKeycloakUserAdminRequest {
  userId: string;
  processId?: string;
}

export interface CreateStaffKeycloakRequest {
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roleNames: string[];
  password: string;
  requirePasswordUpdate?: boolean;
  processId?: string;
}

export interface ReplaceKeycloakRealmRolesRequest {
  userId: string;
  managedRoleNames: string[];
  nextRoleNames: string[];
  processId?: string;
}

export interface SetKeycloakUserEnabledRequest {
  userId: string;
  enabled: boolean;
  reason: string;
  processId?: string;
}
