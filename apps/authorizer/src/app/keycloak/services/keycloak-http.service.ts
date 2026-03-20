import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { CreateKeyCloakUserRequest, ExchangeClientTokenResponse } from '@common/interfaces/common/index';
import { LoginTcpRequest } from '@common/interfaces/tcp/authorizer';
import { ExchangeUserTokenResponse } from '@common/interfaces/common/index';

@Injectable()
export class KeycloakHttpService {
  private readonly logger = new Logger(KeycloakHttpService.name);
  private readonly axiosInstance: AxiosInstance;
  private realm: string;
  private clientId: string;
  private clientSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.axiosInstance = axios.create({
      baseURL: this.configService.get<string>('KEYCLOAK_CONFIG.HOST'),
    });

    this.realm = this.configService.get('KEYCLOAK_CONFIG.REALM');
    this.clientId = this.configService.get('KEYCLOAK_CONFIG.CLIENT_ID');
    this.clientSecret = this.configService.get('KEYCLOAK_CONFIG.CLIENT_SECRET');
  }

  async exchangeClientToken(): Promise<ExchangeClientTokenResponse> {
    const body = new URLSearchParams();

    body.append('client_id', this.clientId);
    body.append('client_secret', this.clientSecret);
    body.append('grant_type', 'client_credentials');
    body.append('scope', 'openid');

    const { data } = await this.axiosInstance.post(
      `/realms/${this.realm}/protocol/openid-connect/token`,
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return data;
  }

  async exchangeUserToken(params: LoginTcpRequest): Promise<ExchangeUserTokenResponse> {
    const body = new URLSearchParams();

    body.append('client_id', this.clientId);
    body.append('client_secret', this.clientSecret);
    body.append('grant_type', 'password');
    body.append('username', params.username);
    body.append('password', params.password);

    const { data } = await this.axiosInstance.post(
      `/realms/${this.realm}/protocol/openid-connect/token`,
      body.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return data;
  }

  async createUser(data: CreateKeyCloakUserRequest): Promise<string> {
    const { email, firstName, lastName, password, tenantId } = data;
    const { access_token: accessToken } = await this.exchangeClientToken();

    const attributes = tenantId ? { tenant_id: [tenantId] } : undefined;

    const { headers } = await this.axiosInstance.post(
      `/admin/realms/${this.realm}/users`,
      {
        firstName,
        lastName,
        email,
        username: email,
        enabled: true,
        emailVerified: true,
        credentials: [
          {
            type: 'password',
            value: password,
            temporary: false,
          },
        ],
        attributes,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const userId = headers['location'].split('/').pop();

    if (!userId) {
      throw new InternalServerErrorException('Failed to create user in Keycloak');
    }

    this.logger.debug(`Created user in Keycloak with ID: ${userId}`);
    return userId;
  }
}
