import { SAAS_BFF_ROUTES } from '../saas-bff-routes';

describe('Phase 4B BFF SaaS contracts', () => {
  it('defines unique Phase 4B route constants', () => {
    const routes = Object.values(SAAS_BFF_ROUTES);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('keeps representative public/admin/dashboard/webhook routes stable', () => {
    expect(SAAS_BFF_ROUTES).toMatchObject({
      publicPlans: 'public/plans',
      adminTenants: 'admin/tenants',
      adminTenantOnboard: 'admin/tenants/onboard',
      dashboardSubscription: 'dashboard/subscription',
      dashboardPaymentSettings: 'dashboard/payment-settings',
      tier2Webhook: 'payment/sepay/webhook/platform',
      tier1Webhook: 'payment/sepay/webhook/:tenantSlug',
    });
  });
});
