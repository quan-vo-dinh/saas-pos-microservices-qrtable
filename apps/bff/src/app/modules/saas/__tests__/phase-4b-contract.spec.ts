import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
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

  it('documents every dashboard route downstream target that must exist in service controllers', () => {
    expect({
      [SAAS_BFF_ROUTES.dashboardSubscription]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
      [SAAS_BFF_ROUTES.dashboardSubscriptionCheckout]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE,
      [SAAS_BFF_ROUTES.dashboardSubscriptionCancel]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL,
      [SAAS_BFF_ROUTES.dashboardBillingInvoiceById]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
      [SAAS_BFF_ROUTES.dashboardBillingInvoiceStatus]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
      [SAAS_BFF_ROUTES.dashboardBillingInvoiceCancel]: TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE,
      [SAAS_BFF_ROUTES.dashboardPaymentSettings]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GET,
      [SAAS_BFF_ROUTES.dashboardSepayAuthorizeUrl]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GENERATE_AUTHORIZE_URL,
      [SAAS_BFF_ROUTES.dashboardSepayCallback]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.HANDLE_OAUTH_CALLBACK,
      [SAAS_BFF_ROUTES.dashboardSepaySelectBank]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.SELECT_BANK,
      [SAAS_BFF_ROUTES.dashboardSepayDisconnect]: TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.DISCONNECT,
    }).toEqual({
      'dashboard/billing/invoices/:id': TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
      'dashboard/billing/invoices/:id/cancel': TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL_INVOICE,
      'dashboard/billing/invoices/:id/status': TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_INVOICE,
      'dashboard/payment-settings': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GET,
      'dashboard/payment-settings/disconnect': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.DISCONNECT,
      'dashboard/payment-settings/select-bank': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.SELECT_BANK,
      'dashboard/payment-settings/sepay-authorize-url': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.GENERATE_AUTHORIZE_URL,
      'dashboard/payment-settings/sepay-callback': TCP_REQUEST_MESSAGE.PAYMENT_SETTINGS.HANDLE_OAUTH_CALLBACK,
      'dashboard/subscription': TCP_REQUEST_MESSAGE.SUBSCRIPTION.GET_CURRENT,
      'dashboard/subscription/cancel': TCP_REQUEST_MESSAGE.SUBSCRIPTION.CANCEL,
      'dashboard/subscription/checkout': TCP_REQUEST_MESSAGE.SUBSCRIPTION.CHECKOUT_INVOICE,
    });
  });
});
