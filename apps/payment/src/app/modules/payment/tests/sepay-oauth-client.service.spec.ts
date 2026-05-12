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
