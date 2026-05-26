import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosInstance } from 'axios';
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

    const { headers } = await this.createUserWithToken(accessToken, {
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
    });
    const location = headers['location'];
    const userId = Array.isArray(location) ? location[0]?.split('/').pop() : location?.split('/').pop();

    if (!userId) {
      throw new BusinessException(ErrorCode.KEYCLOAK_USER_CREATION_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.debug(`Created user in Keycloak with ID: ${userId}`);
    return userId;
  }

  createUserWithToken(
    accessToken: string,
    payload: Record<string, unknown>,
  ): Promise<{ headers: Record<string, string | string[] | undefined> }> {
    return this.axiosInstance.post(`/admin/realms/${this.realm}/users`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  getRealmRole(accessToken: string, roleName: string): Promise<{ data: Record<string, unknown> }> {
    return this.axiosInstance.get(`/admin/realms/${this.realm}/roles/${encodeURIComponent(roleName)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  assignRealmRoles(accessToken: string, userId: string, roles: Record<string, unknown>[]): Promise<unknown> {
    return this.axiosInstance.post(`/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`, roles, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async updateUser(accessToken: string, userId: string, payload: Record<string, unknown>): Promise<void> {
    await this.axiosInstance.put(`/admin/realms/${this.realm}/users/${userId}`, payload, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async getUserById(accessToken: string, userId: string): Promise<Record<string, unknown>> {
    const { data } = await this.axiosInstance.get(`/admin/realms/${this.realm}/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    return data;
  }

  isDuplicateUserError(error: unknown): boolean {
    const axiosError = error as AxiosError;
    return axios.isAxiosError(error) && axiosError.response?.status === HttpStatus.CONFLICT;
  }

  isForbiddenError(error: unknown): boolean {
    const axiosError = error as AxiosError;
    return axios.isAxiosError(error) && axiosError.response?.status === HttpStatus.FORBIDDEN;
  }
}
