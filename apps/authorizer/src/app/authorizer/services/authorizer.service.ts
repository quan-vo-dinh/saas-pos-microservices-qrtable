import { AuthorizeResponse, LoginTcpRequest } from '@common/interfaces/tcp/authorizer';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { KeycloakHttpService } from '../../keycloak/services/keycloak-http.service';
import jwt, { Jwt, JwtPayload } from 'jsonwebtoken';
import jwksRsa, { JwksClient } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, map } from 'rxjs';
import { Role } from '@common/schemas/role.schema';
import { ClientGrpc } from '@nestjs/microservices';
import { GRPC_SERVICES } from '@common/configuration/grpc.config';
import { UpsertIdentityRequest, UserAccessService } from '@common/interfaces/grpc/user-access';
import { PERMISSION, ROLE } from '@common/constants/enum/role.enum';
import { AUTH_ERROR_CODE } from '@common/constants/enum/auth-error-code.enum';

@Injectable()
export class AuthorizerService {
  private readonly logger = new Logger(AuthorizerService.name);
  private jwksClient: JwksClient;
  private userAccessService: UserAccessService;

  constructor(
    private readonly keycloakHttpService: KeycloakHttpService,
    private readonly configService: ConfigService,
    @Inject(GRPC_SERVICES.USER_ACCESS_SERVICE) private readonly grpcUserAccessClient: ClientGrpc,
  ) {
    const host = this.configService.get('KEYCLOAK_CONFIG.HOST');
    const realm = this.configService.get('KEYCLOAK_CONFIG.REALM');

    this.jwksClient = jwksRsa({
      jwksUri: `${host}/realms/${realm}/protocol/openid-connect/certs`,
      cache: true,
      rateLimit: true,
    });
  }

  onModuleInit() {
    this.userAccessService = this.grpcUserAccessClient.getService<UserAccessService>('UserAccessService');
  }

  async login(params: LoginTcpRequest) {
    const { password, username } = params;

    const { access_token: accessToken, refresh_token: refreshToken } = await this.keycloakHttpService.exchangeUserToken(
      { username, password },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  async verifyUserToken(token: string, processId: string): Promise<AuthorizeResponse> {
    const decoded = jwt.decode(token, { complete: true }) as Jwt | null;

    if (!decoded || !decoded.header || !decoded.payload || !decoded.header.kid) {
      throw new UnauthorizedException(AUTH_ERROR_CODE.INVALID_TOKEN);
    }

    let payload: JwtPayload;

    try {
      const key = await this.jwksClient.getSigningKey(decoded.header.kid);

      const publicKey = key.getPublicKey();
      payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
      this.logger.debug({ payload });
    } catch (error) {
      this.logger.error({ error, processId });
      throw new UnauthorizedException(AUTH_ERROR_CODE.INVALID_TOKEN);
    }

    const userId = typeof payload.sub === 'string' ? payload.sub : undefined;

    if (!userId) {
      throw new UnauthorizedException(AUTH_ERROR_CODE.USER_NOT_PROVISIONED);
    }

    let user = await this.userValidation(userId, processId);

    if (!user) {
      user = await this.autoProvisionFromToken(payload, processId);
    }

    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_CODE.USER_NOT_PROVISIONED);
    }

    const keycloakRoles = this.extractRealmRoles(payload);
    const isRoleMappingValid = this.validateRoleMapping(keycloakRoles, user.roles as unknown as Role[] | undefined);

    if (!isRoleMappingValid) {
      this.logger.warn({
        processId,
        userId,
        keycloakRoles,
        internalRoles: (user.roles as unknown as Role[] | undefined)?.map((role) => role?.name),
      });
      throw new UnauthorizedException(AUTH_ERROR_CODE.ROLE_MAPPING_MISMATCH);
    }

    const permissions = this.collectPermissions(user.roles as unknown as Role[] | undefined);

    return {
      valid: true,
      metadata: {
        jwt: payload,
        permissions,
        user,
        userId: user.id,
      },
    };
  }

  private collectPermissions(roles?: Role[]): PERMISSION[] {
    if (!Array.isArray(roles) || roles.length === 0) {
      return [];
    }

    return roles
      .flatMap((role) => (Array.isArray(role?.permissions) ? role.permissions : []))
      .filter((permission): permission is PERMISSION => typeof permission === 'string');
  }

  private extractRealmRoles(payload: JwtPayload): string[] {
    const realmAccess = payload['realm_access'] as Record<string, unknown> | undefined;

    if (!realmAccess) {
      return [];
    }

    const roles = realmAccess['roles'];

    if (!Array.isArray(roles)) {
      return [];
    }

    return roles.filter((role): role is string => typeof role === 'string');
  }

  private validateRoleMapping(keycloakRoles: string[], internalRoles?: Role[]): boolean {
    const appRoles = new Set(Object.values(ROLE).map((role) => this.normalizeRoleName(role)));

    const keycloakAppRoles = new Set(
      keycloakRoles.map((role) => this.normalizeRoleName(role)).filter((role) => appRoles.has(role)),
    );

    const internalAppRoles = new Set(
      (internalRoles || []).map((role) => this.normalizeRoleName(role?.name)).filter((role) => appRoles.has(role)),
    );

    if (keycloakAppRoles.size === 0 || internalAppRoles.size === 0) {
      return false;
    }

    return Array.from(keycloakAppRoles).some((role) => internalAppRoles.has(role));
  }

  private normalizeRoleName(role?: string): string {
    return (role || '').trim().toUpperCase();
  }

  private async userValidation(userId: string, processId: string) {
    const user = await this.getUserByUserId(userId, processId);

    if (!user) {
      if (!this.isAutoProvisionOnFirstLoginEnabled()) {
        throw new UnauthorizedException(AUTH_ERROR_CODE.USER_NOT_PROVISIONED);
      }

      this.logger.warn({
        processId,
        userId,
        message: 'User profile missing in user-access. Attempting first-login auto provisioning.',
      });

      return undefined;
    }

    return user;
  }

  private async getUserByUserId(userId: string, processId: string) {
    return firstValueFrom(this.userAccessService.getByUserId({ processId, userId }).pipe(map((data) => data.data)));
  }

  private async autoProvisionFromToken(payload: JwtPayload, processId: string) {
    const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
    const email = typeof payload.email === 'string' ? payload.email : undefined;

    if (!userId || !email) {
      throw new UnauthorizedException(AUTH_ERROR_CODE.USER_NOT_PROVISIONED);
    }

    const firstName = this.pickFirstString(payload, ['given_name', 'first_name']);
    const lastName = this.pickFirstString(payload, ['family_name', 'last_name']);
    const roleNames = this.extractRealmRoles(payload);

    const upsertPayload: UpsertIdentityRequest = {
      processId,
      userId,
      email,
      firstName,
      lastName,
      roleNames,
    };

    return firstValueFrom(this.userAccessService.upsertByIdentity(upsertPayload).pipe(map((data) => data.data)));
  }

  private pickFirstString(payload: JwtPayload, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    return undefined;
  }

  private isAutoProvisionOnFirstLoginEnabled(): boolean {
    return process.env['AUTH_AUTO_PROVISION_ON_FIRST_LOGIN'] === 'true';
  }
}
