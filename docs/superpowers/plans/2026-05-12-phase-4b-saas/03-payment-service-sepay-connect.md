# Phase 4B Payment Service SePay Connect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` and `superpowers:subagent-driven-development` to implement this plan task-by-task directly on `main`. Subagents may implement/review tasks, but the coordinator commits only once after this whole plan file passes verification. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor Payment Service from platform-level VietQR env config to tenant-owned payment settings with real SePay OAuth2 Connect, encrypted tokens, automated webhook setup, and tenant bank QR generation.

**Architecture:** Payment Service owns `tenant_payment_settings`, OAuth token storage, bank-account selection, SePay webhook setup, and Tier 1 QR generation. BFF handles HTTP routing; Payment Service remains the financial source of truth for customer bill payments only.

**Tech Stack:** NestJS TCP service, TypeORM, Axios, AES-256-GCM via Node crypto, Redis state cache for OAuth CSRF, Jest.

---

## 0. File Structure

- Modify `apps/payment/src/configuration/index.ts`
  - Add OAuth/env validation for `SEPAY_OAUTH_*`, `PUBLIC_API_BASE_URL`, `PAYMENT_SECRETS_ENCRYPTION_KEY`.
- Modify `apps/payment/src/app/modules/payment/payment.module.ts`
  - Register `TenantPaymentSettingsEntity` and new services/repositories.
- Create `apps/payment/src/app/modules/payment/repositories/tenant-payment-settings.repository.ts`
- Create `apps/payment/src/app/modules/payment/services/payment-secrets.service.ts`
- Create `apps/payment/src/app/modules/payment/services/sepay-oauth-client.service.ts`
- Create `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`
- Modify `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
- Modify `apps/payment/src/app/modules/payment/services/sepay-webhook.service.ts`
- Modify `apps/payment/src/app/modules/payment/controllers/payment.controller.ts`
- Tests under `apps/payment/src/app/modules/payment/tests/`

## Task 1: Add Encryption Service For Payment Secrets

**Files:**

- Create: `apps/payment/src/app/modules/payment/services/payment-secrets.service.ts`
- Test: `apps/payment/src/app/modules/payment/tests/payment-secrets.service.spec.ts`

- [ ] **Step 1: Write encryption tests**

Create `apps/payment/src/app/modules/payment/tests/payment-secrets.service.spec.ts`:

```ts
import { PaymentSecretsService } from '../services/payment-secrets.service';

describe('PaymentSecretsService', () => {
  const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('encrypts and decrypts token without returning plaintext ciphertext', () => {
    const service = new PaymentSecretsService(key);
    const encrypted = service.encrypt('secret-token');
    expect(encrypted).not.toContain('secret-token');
    expect(service.decrypt(encrypted)).toBe('secret-token');
  });

  it('rejects invalid key length', () => {
    expect(() => new PaymentSecretsService('short')).toThrow('PAYMENT_SECRETS_ENCRYPTION_KEY');
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
pnpm nx test payment --testFile=payment-secrets.service.spec.ts
```

Expected:

```txt
FAIL Cannot find module '../services/payment-secrets.service'
```

- [ ] **Step 3: Implement AES-256-GCM service**

Create `apps/payment/src/app/modules/payment/services/payment-secrets.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class PaymentSecretsService {
  private readonly key: Buffer;

  constructor(rawKey = process.env.PAYMENT_SECRETS_ENCRYPTION_KEY ?? '') {
    if (!/^[a-f0-9]{64}$/i.test(rawKey)) {
      throw new Error('PAYMENT_SECRETS_ENCRYPTION_KEY must be a 64-character hex string');
    }
    this.key = Buffer.from(rawKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
pnpm nx test payment --testFile=payment-secrets.service.spec.ts
```

Expected:

```txt
PASS apps/payment/src/app/modules/payment/tests/payment-secrets.service.spec.ts
```

## Task 2: Add Tenant Payment Settings Repository And Service

**Files:**

- Create: `apps/payment/src/app/modules/payment/repositories/tenant-payment-settings.repository.ts`
- Create: `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`
- Modify: `apps/payment/src/app/modules/payment/payment.module.ts`
- Modify: `apps/payment/src/app/modules/payment/controllers/payment.controller.ts`
- Test: `apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts`

- [ ] **Step 1: Write settings service tests**

Create `apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts`:

```ts
import { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';
import { TenantPaymentSettingsService } from '../services/tenant-payment-settings.service';

describe('TenantPaymentSettingsService', () => {
  const repo = {
    findByTenantId: jest.fn(),
    createEmpty: jest.fn(),
    updateConnectedBank: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('creates empty settings idempotently', async () => {
    repo.findByTenantId.mockResolvedValue(null);
    repo.createEmpty.mockResolvedValue({
      tenantId: 'tenant-1',
      connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
    });
    const service = new TenantPaymentSettingsService(repo as never);

    const result = await service.createEmpty({ tenantId: 'tenant-1' });

    expect(result.connectionStatus).toBe(TenantPaymentConnectionStatus.NOT_CONNECTED);
  });

  it('returns existing settings when createEmpty is replayed', async () => {
    repo.findByTenantId.mockResolvedValue({
      tenantId: 'tenant-1',
      connectionStatus: TenantPaymentConnectionStatus.CONNECTED,
    });
    const service = new TenantPaymentSettingsService(repo as never);

    await service.createEmpty({ tenantId: 'tenant-1' });

    expect(repo.createEmpty).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement repository/service**

Create `apps/payment/src/app/modules/payment/repositories/tenant-payment-settings.repository.ts` with methods:

```ts
findByTenantId(tenantId: string): Promise<TenantPaymentSettingsEntity | null>
createEmpty(tenantId: string): Promise<TenantPaymentSettingsEntity>
updateByTenantId(tenantId: string, patch: Partial<TenantPaymentSettingsEntity>): Promise<TenantPaymentSettingsEntity>
```

Create `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`:

```ts
import { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class TenantPaymentSettingsService {
  constructor(
    private readonly repository: {
      findByTenantId(tenantId: string): Promise<Record<string, unknown> | null>;
      createEmpty(tenantId: string): Promise<Record<string, unknown>>;
      updateByTenantId(tenantId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
    },
  ) {}

  async createEmpty(params: { tenantId: string }) {
    const existing = await this.repository.findByTenantId(params.tenantId);
    if (existing) return existing;
    return this.repository.createEmpty(params.tenantId);
  }

  async get(params: { tenantId: string }) {
    const settings = await this.repository.findByTenantId(params.tenantId);
    if (!settings) {
      throw new NotFoundException('TENANT_PAYMENT_SETTINGS_NOT_FOUND');
    }
    return settings;
  }

  async disconnect(params: { tenantId: string }) {
    return this.repository.updateByTenantId(params.tenantId, {
      connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
      vietqrEnabled: false,
      sepayBankAccountUuid: null,
      sepayAccessTokenEncrypted: null,
      sepayRefreshTokenEncrypted: null,
      sepayTokenExpiresAt: null,
      sepayWebhookId: null,
      webhookSecretEncrypted: null,
      webhookVerifiedAt: null,
    });
  }
}
```

- [ ] **Step 3: Add TCP handlers**

Modify `apps/payment/src/app/modules/payment/controllers/payment.controller.ts`:

```ts
@MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GET)
async getPaymentSettings(@RequestParams() body: PaymentSettingsByTenantTcpRequest) {
  return Response.success(await this.tenantPaymentSettingsService.get(body));
}

@MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.CREATE_EMPTY)
async createEmptyPaymentSettings(@RequestParams() body: CreateEmptyPaymentSettingsTcpRequest) {
  return Response.success(await this.tenantPaymentSettingsService.createEmpty(body));
}
```

Inject `TenantPaymentSettingsService` in the controller constructor.

- [ ] **Step 4: Register provider/entity**

Modify `apps/payment/src/app/modules/payment/payment.module.ts`:

```ts
TypeOrmModule.forFeature([
  PaymentEntity,
  RefundEntity,
  AuditPaymentEntity,
  PaymentOutboxEventEntity,
  TenantPaymentSettingsEntity,
]),
```

Add `TenantPaymentSettingsRepository`, `TenantPaymentSettingsService`, `PaymentSecretsService`.

- [ ] **Step 5: Run settings tests**

Run:

```bash
pnpm nx test payment --testFile=tenant-payment-settings.service.spec.ts
```

Expected:

```txt
PASS apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts
```

## Task 3: Add SePay OAuth Client And Callback Flow

**Files:**

- Create: `apps/payment/src/app/modules/payment/services/sepay-oauth-client.service.ts`
- Modify: `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`
- Test: `apps/payment/src/app/modules/payment/tests/sepay-oauth-client.service.spec.ts`

- [ ] **Step 1: Write authorize URL test**

Create `apps/payment/src/app/modules/payment/tests/sepay-oauth-client.service.spec.ts`:

```ts
import { SepayOAuthClientService } from '../services/sepay-oauth-client.service';

describe('SepayOAuthClientService', () => {
  it('builds authorize URL with required scopes and registered redirect URI', () => {
    const service = new SepayOAuthClientService({
      baseUrl: 'https://my.sepay.vn',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      redirectUri: 'https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback',
    });

    const url = service.buildAuthorizeUrl('state-123');

    expect(url).toContain('client_id=client-id');
    expect(url).toContain('state=state-123');
    expect(decodeURIComponent(url)).toContain('webhook:write');
  });
});
```

- [ ] **Step 2: Implement OAuth client**

Create `apps/payment/src/app/modules/payment/services/sepay-oauth-client.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

type OAuthConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
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
    this.http = axios.create({ baseURL: config.baseUrl, timeout: 5000 });
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

  async exchangeCode(code: string) {
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
    return data as { access_token: string; refresh_token: string; expires_in: number; scope?: string };
  }

  async listBankAccounts(accessToken: string) {
    const { data } = await this.http.get('/api/v1/bank-accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data;
  }
}
```

- [ ] **Step 3: Run OAuth client test**

Run:

```bash
pnpm nx test payment --testFile=sepay-oauth-client.service.spec.ts
```

Expected:

```txt
PASS apps/payment/src/app/modules/payment/tests/sepay-oauth-client.service.spec.ts
```

## Task 4: Refactor VietQR Generation To Tenant Bank Settings

**Files:**

- Modify: `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
- Test: `apps/payment/src/app/modules/payment/tests/payment.service.spec.ts`

- [ ] **Step 1: Add regression test**

Add to `apps/payment/src/app/modules/payment/tests/payment.service.spec.ts`:

```ts
it('creates VietQR using tenant payment settings instead of platform env account', async () => {
  tenantPaymentSettingsRepository.findByTenantId.mockResolvedValue({
    tenantId: 'tenant-1',
    vietqrEnabled: true,
    vietqrAccountNumber: '9332770502',
    vietqrBankName: 'VCB',
    connectionStatus: 'CONNECTED',
  });

  const result = await settlementService.createVietQr({
    tenantId: 'tenant-1',
    billId: 'bill-1',
    userId: 'user-1',
  });

  expect(result.bankAccount).toBe('9332770502');
  expect(result.bankName).toBe('VCB');
  expect(result.qrUrl).toContain('acc=9332770502');
});
```

- [ ] **Step 2: Inject settings repository/service**

Modify constructor in `PaymentSettlementService`:

```ts
private readonly tenantSettingsRepo: TenantPaymentSettingsRepository,
```

- [ ] **Step 3: Replace `getSepayQrConfig()`**

Replace `vietQrPresentation(payment)` with:

```ts
private async vietQrPresentation(payment: PaymentEntity): Promise<{ qrUrl: string; bankAccount: string; bankName: string }> {
  const settings = await this.tenantSettingsRepo.findByTenantId(payment.tenantId);
  const account = settings?.vietqrAccountNumber || CONFIGURATION.SEPAY_CONFIG.QR_ACCOUNT;
  const bank = settings?.vietqrBankName || CONFIGURATION.SEPAY_CONFIG.QR_BANK;

  if (!account || !bank) {
    throw new ServiceUnavailableException('Tenant VietQR account and bank are not configured');
  }

  return {
    qrUrl: this.reference.buildQrUrl({
      account,
      bank,
      amount: payment.roundedTotal,
      description: payment.billReference,
    }),
    bankAccount: account,
    bankName: bank,
  };
}
```

Update callers to `await this.vietQrPresentation(...)`.

- [ ] **Step 4: Run payment tests**

Run:

```bash
pnpm nx test payment --testFile=payment.service.spec.ts
```

Expected:

```txt
PASS apps/payment/src/app/modules/payment/tests/payment.service.spec.ts
```

## Task 5: Add Bank Selection And Webhook Setup

**Files:**

- Modify: `apps/payment/src/app/modules/payment/services/tenant-payment-settings.service.ts`
- Modify: `apps/payment/src/app/modules/payment/controllers/payment.controller.ts`
- Test: `apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts`

- [ ] **Step 1: Add select-bank test**

Append:

```ts
it('stores selected bank and marks settings connected after webhook setup', async () => {
  const repo = {
    findByTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', sepayAccessTokenEncrypted: 'enc' }),
    updateByTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', connectionStatus: 'CONNECTED' }),
  };
  const secrets = { decrypt: jest.fn().mockReturnValue('access-token'), encrypt: jest.fn((value) => `enc:${value}`) };
  const sepay = {
    getBankAccountDetail: jest.fn().mockResolvedValue({
      uuid: 'bank-1',
      bank_short_name: 'VCB',
      account_number: '9332770502',
      account_holder: 'NGUYEN VAN A',
    }),
    upsertWebhook: jest.fn().mockResolvedValue({ id: 'wh-1', secret_key: 'tenant-secret' }),
  };

  const service = new TenantPaymentSettingsService(repo as never, secrets as never, sepay as never);
  await service.selectBank({
    tenantId: 'tenant-1',
    ownerUserId: 'owner-1',
    sepayBankAccountUuid: 'bank-1',
    webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
  });

  expect(repo.updateByTenantId).toHaveBeenCalledWith(
    'tenant-1',
    expect.objectContaining({
      vietqrEnabled: true,
      vietqrAccountNumber: '9332770502',
      sepayWebhookId: 'wh-1',
    }),
  );
});
```

- [ ] **Step 2: Implement `selectBank()`**

Add method:

```ts
async selectBank(params: SelectBankTcpRequest): Promise<SelectBankTcpResponse> {
  const settings = await this.get({ tenantId: params.tenantId });
  const accessToken = this.secrets.decrypt(settings.sepayAccessTokenEncrypted);
  const bank = await this.sepay.getBankAccountDetail(accessToken, params.sepayBankAccountUuid);
  const webhookSecret = randomBytes(24).toString('hex');
  const webhook = await this.sepay.upsertWebhook(accessToken, {
    webhook_url: params.webhookUrl,
    auth_type: 'SECRET_KEY',
    secret_key: webhookSecret,
    active: 1,
    allow_events: ['*'],
  });

  await this.repository.updateByTenantId(params.tenantId, {
    sepayBankAccountUuid: bank.uuid,
    sepayWebhookId: webhook.id,
    webhookSecretEncrypted: this.secrets.encrypt(webhook.secret_key ?? webhookSecret),
    vietqrEnabled: true,
    vietqrBankName: bank.bank_short_name,
    vietqrAccountNumber: bank.account_number,
    vietqrAccountHolder: bank.account_holder,
    connectionStatus: TenantPaymentConnectionStatus.CONNECTED,
    webhookVerifiedAt: new Date(),
  });

  return {
    status: 'CONNECTED',
    bankShortName: bank.bank_short_name,
    accountNumberMasked: maskAccountNumber(bank.account_number),
    accountHolder: bank.account_holder,
  };
}
```

Define local helper:

```ts
function maskAccountNumber(value: string): string {
  return value.length <= 4 ? value : `•••• ${value.slice(-4)}`;
}
```

- [ ] **Step 3: Add TCP handler**

```ts
@MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.SELECT_BANK)
async selectBank(@RequestParams() body: SelectBankTcpRequest) {
  return Response.success(await this.tenantPaymentSettingsService.selectBank(body));
}
```

- [ ] **Step 4: Run service tests**

Run:

```bash
pnpm nx test payment --testFile=tenant-payment-settings.service.spec.ts
```

Expected:

```txt
PASS apps/payment/src/app/modules/payment/tests/tenant-payment-settings.service.spec.ts
```

## Final Verification

Run:

```bash
pnpm nx test payment --runInBand
pnpm nx lint payment
```

Expected:

```txt
Payment tests pass.
Payment lint passes or only reports pre-existing unrelated issues documented in the handoff.
```

Commit once for this plan file after all verification commands pass:

```bash
git add apps/payment libs/interfaces/src/lib/tcp/payment
git commit -m "feat: add sepay connect tenant payment settings"
```
