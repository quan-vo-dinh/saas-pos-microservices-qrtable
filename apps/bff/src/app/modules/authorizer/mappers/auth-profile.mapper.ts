import { AuthProfileResponseDto } from '@common/interfaces/gateway/authorizer';
import { AuthorizedMetadata } from '@common/interfaces/tcp/authorizer';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { extractJwtRealmRoles, extractJwtTenantId } from '../utils/jwt-metadata.util';

function extractRoles(userData: AuthorizedMetadata): string[] {
  const rolesFromUser = userData.user?.roles?.map((role) => role.name).filter(Boolean) ?? [];
  if (rolesFromUser.length > 0) {
    return rolesFromUser;
  }

  return extractJwtRealmRoles(userData.jwt);
}

export function mapAuthorizedMetadataToAuthProfile(userData: AuthorizedMetadata): AuthProfileResponseDto {
  return {
    userId: userData.userId ?? '',
    email: userData.jwt?.email,
    tenantId: extractJwtTenantId(userData.jwt),
    roles: extractRoles(userData),
    permissions: userData.permissions as PERMISSION[] | undefined,
  };
}
