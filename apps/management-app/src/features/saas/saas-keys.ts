import type { AdminInvoiceQuery, AdminTenantQuery } from './types';

export const saasKeys = {
  all: ['saas'] as const,
  admin: () => [...saasKeys.all, 'admin'] as const,
  tenants: () => [...saasKeys.admin(), 'tenants'] as const,
  tenantsList: (query?: AdminTenantQuery) => [...saasKeys.tenants(), 'list', query ?? {}] as const,
  tenant: (tenantId: string) => [...saasKeys.tenants(), 'detail', tenantId] as const,
  tenantSubscriptions: (tenantId: string) => [...saasKeys.tenant(tenantId), 'subscriptions'] as const,
  tenantUsage: (tenantId: string) => [...saasKeys.tenant(tenantId), 'usage'] as const,
  tenantAudit: (tenantId: string) => [...saasKeys.tenant(tenantId), 'audit'] as const,
  plans: () => [...saasKeys.admin(), 'plans'] as const,
  planCodes: () => [...saasKeys.plans(), 'codes'] as const,
  planAssignOptions: () => [...saasKeys.plans(), 'assign-options'] as const,
  billing: () => [...saasKeys.admin(), 'billing'] as const,
  invoices: () => [...saasKeys.billing(), 'invoices'] as const,
  invoicesList: (query?: AdminInvoiceQuery) => [...saasKeys.invoices(), 'list', query ?? {}] as const,
  dashboard: () => [...saasKeys.all, 'dashboard'] as const,
  dashboardSubscription: () => [...saasKeys.dashboard(), 'subscription'] as const,
  dashboardPaymentSettings: () => [...saasKeys.dashboard(), 'payment-settings'] as const,
  dashboardInvoice: (invoiceId: string) => [...saasKeys.dashboard(), 'invoice', invoiceId] as const,
  dashboardInvoiceStatus: (invoiceId: string) => [...saasKeys.dashboardInvoice(invoiceId), 'status'] as const,
  sepayOauthCallback: (code: string, state: string) =>
    [...saasKeys.dashboardPaymentSettings(), 'sepay-oauth-callback', code, state] as const,
};
