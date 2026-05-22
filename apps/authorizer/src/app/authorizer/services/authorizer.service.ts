import {
  AuthorizeResponse,
  KeycloakJwtPayload,
  LoginTcpRequest,
  PopulatedUser,
} from '@common/interfaces/tcp/authorizer';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { KeycloakHttpService } from '../../keycloak/services/keycloak-http.service';
import jwt, { Jwt } from 'jsonwebtoken';
import jwksRsa, { JwksClient } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, map } from 'rxjs';
import { ClientGrpc } from '@nestjs/microservices';
import { GRPC_SERVICES } from '@common/configuration/grpc.config';
import { UpsertIdentityRequest, UserAccessService } from '@common/interfaces/grpc/user-access';
import { PERMISSION, ROLE } from '@common/constants/enum/role.enum';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';

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
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED);
    }

    let payload: KeycloakJwtPayload;

    try {
      const key = await this.jwksClient.getSigningKey(decoded.header.kid);

      const publicKey = key.getPublicKey();
      payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as KeycloakJwtPayload;
      this.logger.debug({ payload });
    } catch (error) {
      this.logger.error({ error, processId });
      throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, HttpStatus.UNAUTHORIZED);
    }

    const userId = typeof payload.sub === 'string' ? payload.sub : undefined;

    if (!userId) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED);
    }

    let user = await this.userValidation(userId, processId);

    if (!user) {
      user = await this.autoProvisionFromToken(payload, processId);
    }

    if (!user) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED);
    }

    const keycloakRoles = this.extractRealmRoles(payload);
    const isRoleMappingValid = this.validateRoleMapping(keycloakRoles, user.roles);

    if (!isRoleMappingValid) {
      this.logger.warn({
        processId,
        userId,
        keycloakRoles,
        internalRoles: user.roles?.map((role) => role?.name),
      });
      throw new BusinessException(ErrorCode.AUTH_ROLE_MAPPING_MISMATCH, HttpStatus.UNAUTHORIZED);
    }

    const permissions = this.collectPermissions(user.roles);

    return {
      valid: true,
      metadata: {
        jwt: this.toProtoJwtPayload(payload),
        permissions,
        user,
        userId: user.id,
      },
    };
  }

  private collectPermissions(roles?: PopulatedUser['roles']): PERMISSION[] {
    if (!Array.isArray(roles) || roles.length === 0) {
      return [];
    }

    return roles
      .flatMap((role) => (Array.isArray(role?.permissions) ? role.permissions : []))
      .filter((permission): permission is PERMISSION => typeof permission === 'string');
  }

  private extractRealmRoles(payload: KeycloakJwtPayload): string[] {
    return payload.realm_access?.roles ?? [];
  }

  private validateRoleMapping(keycloakRoles: string[], internalRoles?: PopulatedUser['roles']): boolean {
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
        throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED);
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

  private async autoProvisionFromToken(payload: KeycloakJwtPayload, processId: string) {
    const { sub: userId, email, given_name: firstName, family_name: lastName } = payload;

    if (!userId || !email) {
      throw new BusinessException(ErrorCode.AUTH_USER_NOT_PROVISIONED, HttpStatus.UNAUTHORIZED);
    }

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

  private isAutoProvisionOnFirstLoginEnabled(): boolean {
    return this.configService.get<boolean>('AUTHORIZER_AUTH_CONFIG.AUTO_PROVISION_ON_FIRST_LOGIN') === true;
  }

  /**
   * Maps Keycloak JWT payload (snake_case) to proto-compatible format.
   * proto-loader (keepCase: false) serializes camelCase JS keys → snake_case proto wire fields,
   * so camelCase aliases are required for snake_case fields defined in the .proto message.
   */
  private toProtoJwtPayload(payload: KeycloakJwtPayload): KeycloakJwtPayload {
    return {
      ...payload,
      tenantId: payload.tenant_id,
      realmAccess: payload.realm_access,
      givenName: payload.given_name,
      familyName: payload.family_name,
    };
  }
}
