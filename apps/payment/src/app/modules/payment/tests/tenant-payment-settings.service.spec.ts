import { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus } from '@nestjs/common';
import { TenantPaymentSettingsService } from '../services/tenant-payment-settings.service';

describe('TenantPaymentSettingsService', () => {
  const repo = {
    findByTenantId: jest.fn(),
    createEmpty: jest.fn(),
    updateByTenantId: jest.fn(),
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

  it('creates empty settings when get is called for an existing tenant without settings row', async () => {
    repo.findByTenantId.mockResolvedValue(null);
    repo.createEmpty.mockResolvedValue({
      tenantId: 'tenant-1',
      connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
    });
    const service = new TenantPaymentSettingsService(repo as never);

    const result = await service.get({ tenantId: 'tenant-1' });

    expect(repo.createEmpty).toHaveBeenCalledWith('tenant-1');
    expect(result).toEqual(
      expect.objectContaining({
        tenantId: 'tenant-1',
        connectionStatus: TenantPaymentConnectionStatus.NOT_CONNECTED,
      }),
    );
  });

  it('stores selected bank and marks settings connected after webhook setup', async () => {
    const localRepo = {
      findByTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', sepayAccessTokenEncrypted: 'enc' }),
      updateByTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', connectionStatus: 'CONNECTED' }),
    };
    const secrets = { decrypt: jest.fn().mockReturnValue('access-token'), encrypt: jest.fn((value) => `enc:${value}`) };
    const sepay = {
      getBankAccountDetail: jest.fn().mockResolvedValue({
        id: 19,
        uuid: 'bank-1',
        bank_short_name: 'VCB',
        account_number: '9332770502',
        account_holder: 'NGUYEN VAN A',
      }),
      upsertWebhook: jest.fn().mockResolvedValue({ id: 'wh-1', secret_key: 'tenant-secret' }),
    };

    const service = new TenantPaymentSettingsService(localRepo as never, secrets as never, sepay as never);
    await service.selectBank({
      tenantId: 'tenant-1',
      ownerUserId: 'owner-1',
      sepayBankAccountUuid: 'bank-1',
      webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
    });

    expect(localRepo.updateByTenantId).toHaveBeenNthCalledWith(
      1,
      'tenant-1',
      expect.objectContaining({
        webhookSecretEncrypted: expect.stringMatching(/^enc:/),
      }),
    );
    expect(sepay.upsertWebhook).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({
        apiKey: expect.stringMatching(/^[a-f0-9]{32}$/),
        bankAccountId: 19,
        name: 'QRTable tenant-1',
        webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
      }),
    );
    expect(localRepo.updateByTenantId).toHaveBeenLastCalledWith(
      'tenant-1',
      expect.objectContaining({
        vietqrEnabled: true,
        vietqrAccountNumber: '9332770502',
        sepayWebhookId: 'wh-1',
      }),
    );
  });

  it('can select a SePay bank by account number when uuid is not provided', async () => {
    const localRepo = {
      findByTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', sepayAccessTokenEncrypted: 'enc' }),
      updateByTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', connectionStatus: 'CONNECTED' }),
    };
    const secrets = { decrypt: jest.fn().mockReturnValue('access-token'), encrypt: jest.fn((value) => `enc:${value}`) };
    const sepay = {
      listBankAccounts: jest.fn().mockResolvedValue([
        {
          uuid: 'bank-1',
          bank_short_name: 'VCB',
          account_number: '1111111111',
          account_holder: 'NGUYEN VAN A',
        },
        {
          id: 21,
          uuid: 'bank-2',
          bank_short_name: 'MBBank',
          account_number: '0332770502',
          account_holder: 'VO DINH QUAN',
        },
      ]),
      getBankAccountDetail: jest.fn(),
      upsertWebhook: jest.fn().mockResolvedValue({ id: 'wh-1', secret_key: 'tenant-secret' }),
    };

    const service = new TenantPaymentSettingsService(localRepo as never, secrets as never, sepay as never);
    await service.selectBank({
      tenantId: 'tenant-1',
      ownerUserId: 'owner-1',
      accountNumber: '0332770502',
      webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
    });

    expect(sepay.getBankAccountDetail).not.toHaveBeenCalled();
    expect(localRepo.updateByTenantId).toHaveBeenNthCalledWith(
      1,
      'tenant-1',
      expect.objectContaining({
        webhookSecretEncrypted: expect.stringMatching(/^enc:/),
      }),
    );
    expect(sepay.upsertWebhook).toHaveBeenCalledWith(
      'access-token',
      expect.objectContaining({
        apiKey: expect.stringMatching(/^[a-f0-9]{32}$/),
        bankAccountId: 21,
        name: 'QRTable tenant-1',
        webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
      }),
    );
    expect(localRepo.updateByTenantId).toHaveBeenLastCalledWith(
      'tenant-1',
      expect.objectContaining({
        sepayBankAccountUuid: 'bank-2',
        vietqrBankName: 'MBBank',
        vietqrAccountNumber: '0332770502',
        vietqrAccountHolder: 'VO DINH QUAN',
      }),
    );
  });

  it('rejects bank selection when SePay does not return a numeric bank account id', async () => {
    const localRepo = {
      findByTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-1', sepayAccessTokenEncrypted: 'enc' }),
      updateByTenantId: jest.fn(),
    };
    const secrets = { decrypt: jest.fn().mockReturnValue('access-token'), encrypt: jest.fn((value) => `enc:${value}`) };
    const sepay = {
      listBankAccounts: jest.fn().mockResolvedValue([
        {
          uuid: '0332770502',
          bank_short_name: 'MBBank',
          account_number: '0332770502',
          account_holder: 'VO DINH QUAN',
        },
      ]),
      upsertWebhook: jest.fn(),
    };

    const service = new TenantPaymentSettingsService(localRepo as never, secrets as never, sepay as never);

    await expect(
      service.selectBank({
        tenantId: 'tenant-1',
        ownerUserId: 'owner-1',
        accountNumber: '0332770502',
        webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.COMMON_VALIDATION_FAILED,
    });

    expect(localRepo.updateByTenantId).not.toHaveBeenCalled();
    expect(sepay.upsertWebhook).not.toHaveBeenCalled();
  });

  it('does not consume OAuth state when payment secrets are not configured', async () => {
    let capturedState = '';
    const localRepo = {
      findByTenantId: jest.fn().mockResolvedValue({
        tenantId: 'tenant-1',
      }),
      createEmpty: jest.fn(),
      updateByTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-1' }),
    };
    const secrets = {
      assertConfigured: jest
        .fn()
        .mockImplementationOnce(() => {
          throw new BusinessException(ErrorCode.PAYMENT_SECRETS_SERVICE_NOT_CONFIGURED, HttpStatus.SERVICE_UNAVAILABLE);
        })
        .mockImplementation(() => undefined),
      encrypt: jest.fn((value: string) => `enc:${value}`),
    };
    const sepay = {
      buildAuthorizeUrl: jest.fn((state: string) => {
        capturedState = state;
        return `https://my.sepay.vn/oauth/authorize?state=${state}`;
      }),
      exchangeCode: jest.fn().mockResolvedValue({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
      }),
      listBankAccounts: jest.fn().mockResolvedValue([]),
    };
    const service = new TenantPaymentSettingsService(localRepo as never, secrets as never, sepay as never);
    await service.generateAuthorizeUrl({
      tenantId: 'tenant-1',
      ownerUserId: 'owner-1',
    });

    await expect(
      service.handleOAuthCallback({ authorizationCode: 'code-1', state: capturedState }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.PAYMENT_SECRETS_SERVICE_NOT_CONFIGURED,
    });

    await expect(service.handleOAuthCallback({ authorizationCode: 'code-1', state: capturedState })).resolves.toEqual(
      expect.objectContaining({ banks: [] }),
    );
  });
});
