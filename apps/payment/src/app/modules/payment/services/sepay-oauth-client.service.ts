import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export type OAuthConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export const SEPAY_OAUTH_CLIENT_CONFIG = Symbol('SEPAY_OAUTH_CLIENT_CONFIG');

type SepayOAuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
};

export type SepayBankAccount = {
  id?: number | string;
  uuid: string;
  bank_short_name: string;
  account_number: string;
  account_holder: string;
  balance?: number;
};

type SepayWebhookConfig = {
  bankAccountId: number | string;
  webhookUrl: string;
  apiKey: string;
  name: string;
};

type SepayWebhookResponse = {
  id?: string | number;
  webhook_id?: string | number;
  secret_key?: string;
};

const SEPAY_WEBHOOK_EVENT_TYPE = 'In_only';
const SEPAY_WEBHOOK_AUTH_TYPE = 'Api_Key';
const SEPAY_WEBHOOK_REQUEST_CONTENT_TYPE = 'Json';

@Injectable()
export class SepayOAuthClientService {
  private readonly logger = new Logger(SepayOAuthClientService.name);
  private readonly http: AxiosInstance;
  private readonly config: OAuthConfig;
  private readonly scopes = [
    'bank-account:read',
    'transaction:read',
    'webhook:read',
    'webhook:write',
    'webhook:delete',
    'profile',
  ];

  constructor(
    @Optional() @Inject(SEPAY_OAUTH_CLIENT_CONFIG) config?: Partial<OAuthConfig>,
    @Optional() private readonly configService?: ConfigService,
  ) {
    this.config = {
      baseUrl: this.configService?.get<string>('SEPAY_OAUTH_CONFIG.BASE_URL') ?? 'https://my.sepay.vn',
      clientId: this.configService?.get<string>('SEPAY_OAUTH_CONFIG.CLIENT_ID') ?? '',
      clientSecret: this.configService?.get<string>('SEPAY_OAUTH_CONFIG.CLIENT_SECRET') ?? '',
      redirectUri: this.configService?.get<string>('SEPAY_OAUTH_CONFIG.REDIRECT_URI') ?? '',
      ...config,
    };
    this.http = axios.create({ baseURL: this.config.baseUrl, timeout: 5000 });
  }

  buildAuthorizeUrl(state: string): string {
    this.assertConfigured();
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
    this.assertConfigured();
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
    const payload = toOAuthWebhookPayload(body);
    try {
      const { data } = await this.http.post('/api/v1/webhooks', payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const response = data as SepayWebhookResponse;
      return {
        id: String(response.id ?? response.webhook_id ?? ''),
        secret_key: response.secret_key ?? body.apiKey,
      };
    } catch (error) {
      this.throwSepayApiException('create_webhook', error);
    }
  }

  private assertConfigured(): void {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
      throw new BusinessException(ErrorCode.SEPAY_OAUTH_CLIENT_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  private throwSepayApiException(action: string, error: unknown): never {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const responseData = axios.isAxiosError(error) ? error.response?.data : undefined;
    this.logger.warn(`SePay ${action} failed status=${status ?? 'unknown'} response=${JSON.stringify(responseData)}`);
    throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY, undefined, undefined, {
      provider: 'sepay',
      action,
      status,
      response: responseData,
    });
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
  const record = isRecord(source) ? source : {};
  const bank = isRecord(record.bank) ? record.bank : {};
  const id = readStringOrNumber(record.id ?? record.uuid ?? record.xid);
  const accountNumber = readString(record.account_number ?? record.accountNumber);

  return {
    id,
    uuid: String(id ?? accountNumber),
    bank_short_name: readString(
      record.bank_short_name ?? record.bank_name ?? record.brand_name ?? bank.short_name ?? bank.code,
    ),
    account_number: accountNumber,
    account_holder: readString(record.account_holder ?? record.account_holder_name ?? record.accountHolder),
    balance: readNumber(record.balance ?? record.accumulated),
  };
}

function toOAuthWebhookPayload(body: SepayWebhookConfig): Record<string, unknown> {
  return {
    bank_account_id: parseBankAccountId(body.bankAccountId),
    name: body.name,
    event_type: SEPAY_WEBHOOK_EVENT_TYPE,
    authen_type: SEPAY_WEBHOOK_AUTH_TYPE,
    webhook_url: body.webhookUrl,
    is_verify_payment: 1,
    active: 1,
    api_key: body.apiKey,
    request_content_type: SEPAY_WEBHOOK_REQUEST_CONTENT_TYPE,
  };
}

function parseBankAccountId(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
  }
  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function readString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function readStringOrNumber(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value;
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
