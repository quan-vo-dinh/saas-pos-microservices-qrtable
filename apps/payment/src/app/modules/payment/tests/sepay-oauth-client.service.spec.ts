const mockGet = jest.fn();
const mockPost = jest.fn();

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: mockGet,
      post: mockPost,
    })),
  },
}));

import { Test } from '@nestjs/testing';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { SEPAY_OAUTH_CLIENT_CONFIG, SepayOAuthClientService } from '../services/sepay-oauth-client.service';

describe('SepayOAuthClientService', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('builds authorize URL with required scopes and registered redirect URI', () => {
    const service = new SepayOAuthClientService(testConfig());

    const url = service.buildAuthorizeUrl('state-123');

    expect(url).toContain('client_id=client-id');
    expect(url).toContain('state=state-123');
    expect(decodeURIComponent(url)).toContain('webhook:write');
  });

  it('resolves through Nest DI with an explicit OAuth config provider', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SepayOAuthClientService,
        {
          provide: SEPAY_OAUTH_CLIENT_CONFIG,
          useValue: testConfig(),
        },
      ],
    }).compile();

    const service = moduleRef.get(SepayOAuthClientService);
    expect(service.buildAuthorizeUrl('di-state')).toContain('client_id=client-id');
  });

  it('rejects authorization URL generation when OAuth config is incomplete', () => {
    const service = new SepayOAuthClientService({
      baseUrl: 'https://my.sepay.vn',
      clientId: '',
      clientSecret: '',
      redirectUri: '',
    });

    try {
      service.buildAuthorizeUrl('state-123');
      throw new Error('Expected buildAuthorizeUrl to reject incomplete OAuth config');
    } catch (error) {
      expect(error).toMatchObject({
        errorCode: ErrorCode.SEPAY_OAUTH_CLIENT_NOT_CONFIGURED,
      });
    }
  });

  it('normalizes OAuth bank account fields from the SePay API response', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        status: 'success',
        data: [
          {
            id: 19,
            account_holder_name: 'VO DINH QUAN',
            account_number: '0332770502',
            accumulated: '1000000',
            bank: {
              short_name: 'MBBank',
              code: 'MBB',
            },
          },
        ],
      },
    });
    const service = new SepayOAuthClientService(testConfig());

    const banks = await service.listBankAccounts('access-token');

    expect(banks).toEqual([
      {
        id: 19,
        uuid: '19',
        bank_short_name: 'MBBank',
        account_number: '0332770502',
        account_holder: 'VO DINH QUAN',
        balance: 1000000,
      },
    ]);
  });

  it('creates OAuth2 webhooks with SePay API v1 payload shape', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 23 } });
    const service = new SepayOAuthClientService(testConfig());

    const result = await service.upsertWebhook('access-token', {
      bankAccountId: 19,
      name: 'QRTable tenant-1',
      webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
      apiKey: 'tenant-secret',
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/api/v1/webhooks',
      expect.objectContaining({
        bank_account_id: 19,
        name: 'QRTable tenant-1',
        event_type: 'In_only',
        authen_type: 'Api_Key',
        webhook_url: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
        is_verify_payment: 1,
        active: 1,
        api_key: 'tenant-secret',
        request_content_type: 'Json',
      }),
      expect.objectContaining({
        headers: { Authorization: 'Bearer access-token' },
      }),
    );
    expect(result).toEqual({ id: '23', secret_key: 'tenant-secret' });
  });

  it('rejects invalid OAuth2 webhook bank account ids before calling SePay', async () => {
    const service = new SepayOAuthClientService(testConfig());

    await expect(
      service.upsertWebhook('access-token', {
        bankAccountId: 'bank-uuid',
        name: 'QRTable tenant-1',
        webhookUrl: 'https://api.example.com/api/v1/payment/sepay/webhook/pho-ha-noi',
        apiKey: 'tenant-secret',
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.COMMON_VALIDATION_FAILED,
    });

    expect(mockPost).not.toHaveBeenCalled();
  });
});

function testConfig() {
  return {
    baseUrl: 'https://my.sepay.vn',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback',
  };
}
