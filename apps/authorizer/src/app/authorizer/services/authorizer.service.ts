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
import { UserAccessService } from '@common/interfaces/grpc/user-access';
import { PERMISSION } from '@common/constants/enum/role.enum';

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
      throw new UnauthorizedException('Invalid token structure');
    }

    let payload: JwtPayload;

    try {
      const key = await this.jwksClient.getSigningKey(decoded.header.kid);

      const publicKey = key.getPublicKey();
      payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as JwtPayload;
      this.logger.debug({ payload });
    } catch (error) {
      this.logger.error({ error, processId });
      throw new UnauthorizedException('Invalid token');
    }

    const userId = payload.sub;
    const user = await this.userValidation(userId, processId);
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

  private async userValidation(userId: string, processId: string) {
    const user = await firstValueFrom(
      this.userAccessService.getByUserId({ processId, userId }).pipe(map((data) => data.data)),
    );
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
