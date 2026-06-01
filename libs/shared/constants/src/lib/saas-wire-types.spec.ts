import {
  PLAN_FEATURE_CODE_VALUES,
  SubscriptionInvoiceStatus,
  SubscriptionStatus,
  TenantPaymentConnectionStatus,
  TenantStatus,
  TenantType,
} from '@common/constants/saas.constants';
import {
  SAAS_INVOICE_STATUS,
  SAAS_PAYMENT_CONNECTION_STATUS,
  SAAS_PLAN_FEATURE,
  SAAS_SUBSCRIPTION_STATUS,
  SAAS_TENANT_STATUS,
  SAAS_TENANT_TYPE,
} from './saas-wire-types';

describe('saas-wire-types', () => {
  it('matches backend TenantStatus enum values', () => {
    expect(Object.values(SAAS_TENANT_STATUS).sort()).toEqual(Object.values(TenantStatus).sort());
  });

  it('matches backend SubscriptionStatus enum values', () => {
    expect(Object.values(SAAS_SUBSCRIPTION_STATUS).sort()).toEqual(Object.values(SubscriptionStatus).sort());
  });

  it('matches backend SubscriptionInvoiceStatus enum values', () => {
    expect(Object.values(SAAS_INVOICE_STATUS).sort()).toEqual(Object.values(SubscriptionInvoiceStatus).sort());
  });

  it('matches backend TenantPaymentConnectionStatus enum values', () => {
    expect(Object.values(SAAS_PAYMENT_CONNECTION_STATUS).sort()).toEqual(
      Object.values(TenantPaymentConnectionStatus).sort(),
    );
  });

  it('matches backend TenantType enum values', () => {
    expect(Object.values(SAAS_TENANT_TYPE).sort()).toEqual(Object.values(TenantType).sort());
  });

  it('matches backend plan feature codes', () => {
    expect(Object.values(SAAS_PLAN_FEATURE).sort()).toEqual([...PLAN_FEATURE_CODE_VALUES].sort());
  });
});
