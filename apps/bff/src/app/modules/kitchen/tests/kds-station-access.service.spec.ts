import { ROLE } from '@common/constants/enum/role.enum';
import { ForbiddenException } from '@nestjs/common';
import { PreparationStation } from '@einvoice/types';
import { KdsStationAccessService } from '../services/kds-station-access.service';

describe('KdsStationAccessService', () => {
  const service = new KdsStationAccessService();

  function userWithRoles(roles: ROLE[]) {
    return {
      valid: true,
      metadata: {
        jwt: {
          realmAccess: { roles },
        },
      },
    } as never;
  }

  it('allows CHEF to access KITCHEN when roles are camelCase from proto-loader', () => {
    expect(() => service.assertCanAccessStation(userWithRoles([ROLE.CHEF]), PreparationStation.KITCHEN)).not.toThrow();
  });

  it('allows BARISTA to access BAR when roles are camelCase from proto-loader', () => {
    expect(() => service.assertCanAccessStation(userWithRoles([ROLE.BARISTA]), PreparationStation.BAR)).not.toThrow();
  });

  it('rejects CHEF from BAR', () => {
    expect(() => service.assertCanAccessStation(userWithRoles([ROLE.CHEF]), PreparationStation.BAR)).toThrow(
      ForbiddenException,
    );
  });
});
