/**
 * SaaS wire enum values for frontend apps.
 *
 * Must stay aligned with `libs/constants/src/lib/saas.constants.ts` (backend source of truth).
 * When backend enums change, update this file and `vi-domain-labels.ts` in the same PR.
 */

export const SAAS_TENANT_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CLOSED: 'CLOSED',
} as const;

export const SAAS_SUBSCRIPTION_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  EXPIRED: 'EXPIRED',
  CANCELED: 'CANCELED',
  SUPERSEDED: 'SUPERSEDED',
} as const;

export const SAAS_INVOICE_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  UNDERPAID: 'UNDERPAID',
  EXPIRED: 'EXPIRED',
  CANCELED: 'CANCELED',
} as const;

export const SAAS_BILLING_PERIOD = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;

export const SAAS_PAYMENT_CONNECTION_STATUS = {
  NOT_CONNECTED: 'NOT_CONNECTED',
  CONNECTED: 'CONNECTED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  REVOKED: 'REVOKED',
  ERROR: 'ERROR',
} as const;

export const SAAS_TENANT_TYPE = {
  RESTAURANT: 'RESTAURANT',
  CAFE: 'CAFE',
  FOOD_COURT: 'FOOD_COURT',
  PUB: 'PUB',
  OTHER: 'OTHER',
} as const;

export type SaasTenantStatus = (typeof SAAS_TENANT_STATUS)[keyof typeof SAAS_TENANT_STATUS];
export type SaasSubscriptionStatus = (typeof SAAS_SUBSCRIPTION_STATUS)[keyof typeof SAAS_SUBSCRIPTION_STATUS];
export type SaasInvoiceStatus = (typeof SAAS_INVOICE_STATUS)[keyof typeof SAAS_INVOICE_STATUS];
export type SaasBillingPeriod = (typeof SAAS_BILLING_PERIOD)[keyof typeof SAAS_BILLING_PERIOD];
export type SaasPaymentConnectionStatus =
  (typeof SAAS_PAYMENT_CONNECTION_STATUS)[keyof typeof SAAS_PAYMENT_CONNECTION_STATUS];
export type SaasTenantType = (typeof SAAS_TENANT_TYPE)[keyof typeof SAAS_TENANT_TYPE];
