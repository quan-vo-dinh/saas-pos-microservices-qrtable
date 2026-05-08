import { ROLE } from '@common/constants/enum/role.enum';
import { mapAuthorizedMetadataToAuthProfile } from './auth-profile.mapper';

describe('mapAuthorizedMetadataToAuthProfile', () => {
  it('maps proto-loader camelCase JWT tenant and realm roles', () => {
    const profile = mapAuthorizedMetadataToAuthProfile({
      userId: 'u1',
      jwt: {
        tenantId: 'tenant-1',
        realmAccess: { roles: [ROLE.CHEF] },
        email: 'chef@example.test',
      },
    } as never);

    expect(profile).toEqual(
      expect.objectContaining({
        userId: 'u1',
        email: 'chef@example.test',
        tenantId: 'tenant-1',
        roles: [ROLE.CHEF],
      }),
    );
  });
});
