import { AuthProfileResponseDto } from '@common/interfaces/gateway/authorizer';
import { AuthorizedMetadata } from '@common/interfaces/tcp/authorizer';
import { PERMISSION } from '@common/constants/enum/role.enum';

function extractRoles(userData: AuthorizedMetadata): string[] {
  const rolesFromUser = userData.user?.roles?.map((role) => role.name).filter(Boolean) ?? [];
  if (rolesFromUser.length > 0) {
    return rolesFromUser;
  }

  return userData.jwt?.realm_access?.roles ?? [];
}

export function mapAuthorizedMetadataToAuthProfile(userData: AuthorizedMetadata): AuthProfileResponseDto {
  return {
    userId: userData.userId ?? '',
    email: userData.jwt?.email,
    tenantId: userData.jwt?.tenant_id,
    roles: extractRoles(userData),
    permissions: userData.permissions as PERMISSION[] | undefined,
  };
}
