import { TenantPaymentConnectionStatus } from '@common/constants/saas.constants';
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

  it('stores selected bank and marks settings connected after webhook setup', async () => {
    const localRepo = {
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

    const service = new TenantPaymentSettingsService(localRepo as never, secrets as never, sepay as never);
    await service.selectBank({
      tenantId: 'tenant-1',
      ownerUserId: 'owner-1',
      sepayBankAccountUuid: 'bank-1',
      webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
    });

    expect(localRepo.updateByTenantId).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        vietqrEnabled: true,
        vietqrAccountNumber: '9332770502',
        sepayWebhookId: 'wh-1',
      }),
    );
  });
});
