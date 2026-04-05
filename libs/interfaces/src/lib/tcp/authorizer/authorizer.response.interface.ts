import { LoginResponseDto } from '../../gateway/authorizer';
import { JwtPayload } from 'jsonwebtoken';
import { PERMISSION, ROLE } from '@common/constants/enum/role.enum';
import { User } from '@common/schemas/user.schema';
import { Role } from '@common/schemas/role.schema';

export type KeycloakJwtPayload = JwtPayload & {
  email?: string;
  tenant_id?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: {
    roles?: ROLE[];
  };
};

export type PopulatedUser = Omit<User, 'roles'> & {
  roles: Role[];
};

export class AuthorizedMetadata {
  userId: string | undefined;
  user: PopulatedUser | undefined;
  permissions: PERMISSION[] | undefined;
  jwt: KeycloakJwtPayload | undefined;

  constructor(payload?: Partial<AuthorizedMetadata>) {
    Object.assign(this, payload);
  }
}

export class AuthorizeResponse {
  valid: boolean;
  metadata = new AuthorizedMetadata();

  constructor(payload: Partial<AuthorizeResponse>) {
    Object.assign(this, payload);
  }
}

export type LoginTcpResponse = LoginResponseDto;
