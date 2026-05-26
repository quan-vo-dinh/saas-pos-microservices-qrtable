import { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';
import type {
  CreateEmptyPaymentSettingsTcpRequest,
  GeneratePaymentAuthorizeUrlTcpRequest,
  GeneratePaymentAuthorizeUrlTcpResponse,
  HandlePaymentOAuthCallbackTcpRequest,
  HandlePaymentOAuthCallbackTcpResponse,
  PaymentSettingsByTenantTcpRequest,
  SelectBankTcpRequest,
  SelectBankTcpResponse,
  TenantPaymentSettingsTcpResponse,
} from '@common/interfaces/tcp/payment';
import { RedisClientService } from '@common/providers/redis-client/redis-client.service';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { TenantPaymentSettingsEntity } from '../entities/tenant-payment-settings.entity';
import { TenantPaymentSettingsRepository } from '../repositories/tenant-payment-settings.repository';
import { PaymentSecretsService } from './payment-secrets.service';
import { SepayBankAccount, SepayOAuthClientService } from './sepay-oauth-client.service';

@Injectable()
export class TenantPaymentSettingsService {
  private readonly stateFallback = new Map<string, { tenantId: string; ownerUserId: string; expiresAt: number }>();

  constructor(
    private readonly repository: TenantPaymentSettingsRepository,
    private readonly secrets?: PaymentSecretsService,
    private readonly sepay?: SepayOAuthClientService,
    @Optional() private readonly redisClientService?: RedisClientService,
  ) {}

  async createEmpty(params: CreateEmptyPaymentSettingsTcpRequest): Promise<TenantPaymentSettingsTcpResponse> {
    const existing = await this.repository.findByTenantId(params.tenantId);
    if (existing) return this.toResponse(existing);
    return this.toResponse(await this.repository.createEmpty(params.tenantId));
  }

  async get(params: PaymentSettingsByTenantTcpRequest): Promise<TenantPaymentSettingsTcpResponse> {
    const settings = await this.repository.findByTenantId(params.tenantId);
    return this.toResponse(settings ?? (await this.repository.createEmpty(params.tenantId)));
  }

  async generateAuthorizeUrl(
    params: GeneratePaymentAuthorizeUrlTcpRequest,
  ): Promise<GeneratePaymentAuthorizeUrlTcpResponse> {
    const sepay = this.requireSepayClient();
    await this.createEmpty({ tenantId: params.tenantId, processId: params.processId });
    const state = randomBytes(24).toString('hex');
    await this.storeOAuthState(state, {
      tenantId: params.tenantId,
      ownerUserId: params.ownerUserId,
      expiresAt: Date.now() + 300_000,
    });

    return {
      authorizeUrl: sepay.buildAuthorizeUrl(state),
      expiresInSeconds: 300,
    };
  }

  async handleOAuthCallback(
    params: HandlePaymentOAuthCallbackTcpRequest,
  ): Promise<HandlePaymentOAuthCallbackTcpResponse> {
    const secrets = this.requireSecrets();
    const sepay = this.requireSepayClient();
    secrets.assertConfigured();
    const state = await this.consumeOAuthState(params.state);
    const settings = await this.findRequired(state.tenantId);
    const token = await sepay.exchangeCode(params.authorizationCode);
    const expiresAt = new Date(Date.now() + token.expires_in * 1000);
    const scopes = token.scope?.split(/\s+/).filter(Boolean) ?? [];

    await this.repository.updateByTenantId(settings.tenantId, {
      sepayAccessTokenEncrypted: secrets.encrypt(token.access_token),
      sepayRefreshTokenEncrypted: secrets.encrypt(token.refresh_token),
      sepayTokenExpiresAt: expiresAt,
      sepayTokenScopes: scopes,
      connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
      lastError: null,
      lastErrorAt: null,
    });

    const banks = await sepay.listBankAccounts(token.access_token);
    return {
      tokenExpiresAt: expiresAt.toISOString(),
      banks: banks.map((bank) => ({
        uuid: bank.uuid,
        bankShortName: bank.bank_short_name,
        accountNumber: bank.account_number,
        accountHolder: bank.account_holder,
        balance: bank.balance,
      })),
    };
  }

  async selectBank(params: SelectBankTcpRequest): Promise<SelectBankTcpResponse> {
    const secrets = this.requireSecrets();
    const sepay = this.requireSepayClient();
    const settings = await this.findRequired(params.tenantId);
    if (!settings.sepayAccessTokenEncrypted) {
      throw new BusinessException(ErrorCode.SEPAY_ACCESS_TOKEN_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    }

    const accessToken = secrets.decrypt(settings.sepayAccessTokenEncrypted);
    const bank = await this.resolveBankAccount(sepay, accessToken, params);
    const bankAccountId = requireSepayBankAccountId(bank);
    const webhookSecret = randomBytes(16).toString('hex');
    await this.repository.updateByTenantId(params.tenantId, {
      webhookSecretEncrypted: secrets.encrypt(webhookSecret),
      lastError: null,
      lastErrorAt: null,
    });
    const webhook = await sepay.upsertWebhook(accessToken, {
      bankAccountId,
      name: `QRTable ${params.tenantId}`,
      webhookUrl: params.webhookUrl,
      apiKey: webhookSecret,
    });

    await this.repository.updateByTenantId(params.tenantId, {
      sepayBankAccountUuid: bank.uuid,
      sepayWebhookId: webhook.id,
      webhookSecretEncrypted: secrets.encrypt(webhook.secret_key ?? webhookSecret),
      vietqrEnabled: true,
      vietqrBankName: bank.bank_short_name,
      vietqrAccountNumber: bank.account_number,
      vietqrAccountHolder: bank.account_holder,
      connectionStatus: TenantPaymentConnectionStatus.CONNECTED,
      webhookVerifiedAt: new Date(),
      lastError: null,
      lastErrorAt: null,
    });

    return {
      status: 'CONNECTED',
      bankShortName: bank.bank_short_name,
      accountNumberMasked: maskAccountNumber(bank.account_number),
      accountHolder: bank.account_holder,
    };
  }

  private async resolveBankAccount(
    sepay: SepayOAuthClientService,
    accessToken: string,
    params: SelectBankTcpRequest,
  ): Promise<SepayBankAccount> {
    if (params.sepayBankAccountUuid) {
      return sepay.getBankAccountDetail(accessToken, params.sepayBankAccountUuid);
    }

    if (!params.accountNumber) {
      throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
    }

    const banks = await sepay.listBankAccounts(accessToken);
    const bank = banks.find((candidate) => candidate.account_number === params.accountNumber);
    if (!bank) {
      throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
    }

    return bank;
  }

  async disconnect(params: PaymentSettingsByTenantTcpRequest): Promise<TenantPaymentSettingsTcpResponse> {
    return this.toResponse(
      await this.repository.updateByTenantId(params.tenantId, {
        connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
        vietqrEnabled: false,
        sepayBankAccountUuid: null,
        sepayAccessTokenEncrypted: null,
        sepayRefreshTokenEncrypted: null,
        sepayTokenExpiresAt: null,
        sepayTokenScopes: [],
        sepayWebhookId: null,
        webhookSecretEncrypted: null,
        webhookVerifiedAt: null,
        vietqrBankName: null,
        vietqrAccountNumber: null,
        vietqrAccountHolder: null,
      }),
    );
  }

  private async findRequired(tenantId: string): Promise<TenantPaymentSettingsEntity> {
    const settings = await this.repository.findByTenantId(tenantId);
    if (!settings) {
      throw new BusinessException(ErrorCode.TENANT_PAYMENT_SETTINGS_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return settings;
  }

  private toResponse(settings: TenantPaymentSettingsEntity): TenantPaymentSettingsTcpResponse {
    return {
      tenantId: settings.tenantId,
      cashEnabled: settings.cashEnabled,
      vietqrEnabled: settings.vietqrEnabled,
      connectionStatus: settings.connectionStatus,
      bankShortName: settings.vietqrBankName,
      accountNumberMasked: settings.vietqrAccountNumber ? maskAccountNumber(settings.vietqrAccountNumber) : null,
      accountHolder: settings.vietqrAccountHolder,
      webhookVerifiedAt: settings.webhookVerifiedAt?.toISOString() ?? null,
      lastError: settings.lastError,
    };
  }

  private requireSecrets(): PaymentSecretsService {
    if (!this.secrets) {
      throw new BusinessException(ErrorCode.PAYMENT_SECRETS_SERVICE_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return this.secrets;
  }

  private requireSepayClient(): SepayOAuthClientService {
    if (!this.sepay) {
      throw new BusinessException(ErrorCode.SEPAY_OAUTH_CLIENT_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return this.sepay;
  }

  private async storeOAuthState(
    state: string,
    value: { tenantId: string; ownerUserId: string; expiresAt: number },
  ): Promise<void> {
    const payload = JSON.stringify(value);
    const redis = this.redisClientService?.getClient();
    if (redis) {
      await redis.set(`oauth_state:${state}`, payload, 'EX', 300);
      return;
    }
    this.stateFallback.set(state, value);
  }

  private async consumeOAuthState(
    state: string,
  ): Promise<{ tenantId: string; ownerUserId: string; expiresAt: number }> {
    const key = `oauth_state:${state}`;
    const redis = this.redisClientService?.getClient();
    const raw = redis ? await redis.get(key) : JSON.stringify(this.stateFallback.get(state) ?? null);
    if (redis) {
      await redis.del(key);
    } else {
      this.stateFallback.delete(state);
    }
    if (!raw) {
      throw new BusinessException(ErrorCode.INVALID_SEPAY_OAUTH_STATE, HttpStatus.UNAUTHORIZED);
    }
    const parsed = JSON.parse(raw) as { tenantId: string; ownerUserId: string; expiresAt: number } | null;
    if (!parsed || parsed.expiresAt < Date.now()) {
      throw new BusinessException(ErrorCode.INVALID_SEPAY_OAUTH_STATE, HttpStatus.UNAUTHORIZED);
    }
    return parsed;
  }
}

function maskAccountNumber(value: string): string {
  return value.length <= 4 ? value : `•••• ${value.slice(-4)}`;
}

function requireSepayBankAccountId(bank: SepayBankAccount): number {
  const parsed = typeof bank.id === 'number' ? bank.id : Number(String(bank.id ?? '').trim());
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED, HttpStatus.BAD_REQUEST);
  }
  return parsed;
}
