import { ROLE } from '@common/constants/enum/role.enum';
import type { AuthorizeResponse } from '@common/interfaces/tcp/authorizer';
import { Injectable } from '@nestjs/common';
import type { PreparationStation } from '@einvoice/types';
import { ForbiddenException } from '@nestjs/common';
import { extractJwtRealmRoles } from '../../authorizer/utils/jwt-metadata.util';

@Injectable()
export class KdsStationAccessService {
  assertCanAccessStation(user: AuthorizeResponse | undefined, station: PreparationStation): void {
    const roles = extractJwtRealmRoles(user?.metadata?.jwt);
    if (roles.includes(ROLE.SUPER_ADMIN) || roles.includes(ROLE.OWNER) || roles.includes(ROLE.MANAGER)) {
      return;
    }
    if (roles.includes(ROLE.CHEF) && station === 'KITCHEN') {
      return;
    }
    if (roles.includes(ROLE.BARISTA) && station === 'BAR') {
      return;
    }
    throw new ForbiddenException();
  }
}
