import { Test } from '@nestjs/testing';
import { SEPAY_OAUTH_CLIENT_CONFIG, SepayOAuthClientService } from '../services/sepay-oauth-client.service';

describe('SepayOAuthClientService', () => {
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
});

function testConfig() {
  return {
    baseUrl: 'https://my.sepay.vn',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    redirectUri: 'https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback',
  };
}
