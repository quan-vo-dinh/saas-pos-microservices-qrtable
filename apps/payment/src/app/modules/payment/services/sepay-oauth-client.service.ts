import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

type OAuthConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type SepayOAuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};

type SepayBankAccount = {
  uuid: string;
  bank_short_name: string;
  account_number: string;
  account_holder: string;
  balance?: number;
};

type SepayWebhookConfig = {
  webhook_url: string;
  auth_type: 'SECRET_KEY';
  secret_key: string;
  active: 1;
  allow_events: string[];
};

type SepayWebhookResponse = {
  id?: string;
  webhook_id?: string;
  secret_key?: string;
};

@Injectable()
export class SepayOAuthClientService {
  private readonly http: AxiosInstance;
  private readonly scopes = [
    'bank-account:read',
    'transaction:read',
    'webhook:read',
    'webhook:write',
    'webhook:delete',
    'profile',
  ];

  constructor(
    private readonly config: OAuthConfig = {
      baseUrl: process.env.SEPAY_OAUTH_BASE_URL ?? 'https://my.sepay.vn',
      clientId: process.env.SEPAY_OAUTH_CLIENT_ID ?? '',
      clientSecret: process.env.SEPAY_OAUTH_CLIENT_SECRET ?? '',
      redirectUri: process.env.SEPAY_OAUTH_REDIRECT_URI ?? '',
    },
  ) {
    this.http = axios.create({ baseURL: this.config.baseUrl, timeout: 5000 });
  }

  buildAuthorizeUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.scopes.join(' '),
      state,
    });
    return `${this.config.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<SepayOAuthTokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    const { data } = await this.http.post('/oauth/token', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return data as SepayOAuthTokenResponse;
  }

  async listBankAccounts(accessToken: string): Promise<SepayBankAccount[]> {
    const { data } = await this.http.get('/api/v1/bank-accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return normalizeBankAccountsResponse(data);
  }

  async getBankAccountDetail(accessToken: string, uuid: string): Promise<SepayBankAccount> {
    const { data } = await this.http.get(`/api/v1/bank-accounts/${uuid}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return normalizeBankAccountResponse(data);
  }

  async upsertWebhook(accessToken: string, body: SepayWebhookConfig): Promise<{ id: string; secret_key?: string }> {
    const { data } = await this.http.post('/api/v1/webhooks', body, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const response = data as SepayWebhookResponse;
    return {
      id: response.id ?? response.webhook_id ?? '',
      secret_key: response.secret_key,
    };
  }
}

function normalizeBankAccountsResponse(data: unknown): SepayBankAccount[] {
  if (Array.isArray(data)) return data.map(normalizeBankAccountResponse);
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: unknown[] }).data.map(normalizeBankAccountResponse);
  }
  return [];
}

function normalizeBankAccountResponse(data: unknown): SepayBankAccount {
  const source =
    data && typeof data === 'object' && 'data' in data && (data as { data?: unknown }).data
      ? (data as { data: unknown }).data
      : data;
  return source as SepayBankAccount;
}
