'use client';

import { authApiClient, type AuthClientOptions } from '@/lib/api/authenticated-client';
import type {
  AdminInvoiceQuery,
  AdminTenantQuery,
  CheckoutSubscriptionPayload,
  CreatePlanPayload,
  DashboardSubscription,
  ManualConfirmPayload,
  OnboardTenantPayload,
  Paginated,
  PaymentSettings,
  PricingPlan,
  SelectSepayBankPayload,
  SepayCallbackResult,
  SubscriptionHistoryRow,
  SubscriptionInvoice,
  TenantAuditEvent,
  TenantDetail,
  TenantListItem,
  TenantUsageSnapshot,
  UpdatePlanPayload,
  UpdateTenantStatusPayload,
} from './types';

function toSearchParams(record: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(record)) {
    if (v === undefined || v === '') {
      continue;
    }
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

function post(body: unknown): AuthClientOptions {
  return { method: 'POST', body: JSON.stringify(body) };
}

function patch(body: unknown): AuthClientOptions {
  return { method: 'PATCH', body: JSON.stringify(body) };
}

function normalizePaginated<T>(raw: unknown): Paginated<T> {
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const items = (Array.isArray(o.items) ? o.items : Array.isArray(o.rows) ? o.rows : []) as T[];
    return {
      items,
      page: Number(o.page ?? o.currentPage ?? 1) || 1,
      limit: Number(o.limit ?? o.pageSize ?? 20) || 20,
      total: Number(o.total ?? o.totalCount ?? items.length) || 0,
    };
  }
  return { items: [], page: 1, limit: 20, total: 0 };
}

function normalizeDashboardSubscription(raw: unknown): DashboardSubscription {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const o = raw as Record<string, unknown>;
  return {
    tenant: (o.tenant ?? o.tenantSummary) as DashboardSubscription['tenant'],
    current: (o.current ?? o.currentSubscription ?? o.subscription) as DashboardSubscription['current'],
    usage: o.usage as TenantUsageSnapshot | undefined,
    plans: (o.plans ?? o.availablePlans) as PricingPlan[] | undefined,
    history: (o.history ?? o.subscriptionHistory) as SubscriptionHistoryRow[] | undefined,
  };
}

export const saasApi = {
  listAdminTenants: async (query: AdminTenantQuery): Promise<Paginated<TenantListItem>> => {
    const data = await authApiClient<unknown>(
      `/admin/tenants${toSearchParams({
        search: query.search,
        status: query.status || undefined,
        planCode: query.planCode,
        page: query.page,
        limit: query.limit,
      })}`,
    );
    return normalizePaginated<TenantListItem>(data);
  },

  onboardTenant: (payload: OnboardTenantPayload) =>
    authApiClient<TenantDetail>('/admin/tenants/onboard', {
      method: 'POST',
      body: JSON.stringify({
        tenantName: payload.tenantName,
        tenantType: payload.tenantType,
        address: payload.address,
        initialPlanCode: payload.initialPlanCode,
        ownerEmail: payload.ownerEmail,
        ownerPassword: payload.ownerPassword,
        ownerFirstName: payload.ownerFirstName,
        ownerLastName: payload.ownerLastName,
        operatingModes: payload.operatingModes,
      }),
    }),

  getTenant: (id: string) => authApiClient<TenantDetail>(`/admin/tenants/${encodeURIComponent(id)}`),

  updateTenantStatus: (id: string, payload: UpdateTenantStatusPayload) =>
    authApiClient<TenantDetail>(`/admin/tenants/${encodeURIComponent(id)}/status`, patch(payload)),

  listPlansAdmin: () => authApiClient<PricingPlan[]>('/admin/plans'),

  createPlan: (payload: CreatePlanPayload) => authApiClient<PricingPlan>('/admin/plans', post(payload)),

  updatePlan: (id: string, payload: UpdatePlanPayload) =>
    authApiClient<PricingPlan>(`/admin/plans/${encodeURIComponent(id)}`, patch(payload)),

  deletePlan: (id: string) =>
    authApiClient<PricingPlan>(`/admin/plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  listAdminInvoices: async (query: AdminInvoiceQuery): Promise<Paginated<SubscriptionInvoice>> => {
    const data = await authApiClient<unknown>(
      `/admin/billing/invoices${toSearchParams({
        status: query.status || undefined,
        tenantId: query.tenantId,
        from: query.from,
        to: query.to,
        planCode: query.planCode,
        page: query.page,
        limit: query.limit,
      })}`,
    );
    return normalizePaginated<SubscriptionInvoice>(data);
  },

  manualConfirmInvoice: (id: string, payload: ManualConfirmPayload) =>
    authApiClient<SubscriptionInvoice>(
      `/admin/billing/invoices/${encodeURIComponent(id)}/manual-confirm`,
      post(payload),
    ),

  cancelAdminInvoice: (id: string) =>
    authApiClient<SubscriptionInvoice>(`/admin/billing/invoices/${encodeURIComponent(id)}/cancel`, post({})),

  listTenantSubscriptions: (tenantId: string) =>
    authApiClient<SubscriptionHistoryRow[]>(`/admin/tenants/${encodeURIComponent(tenantId)}/subscriptions`),

  assignTenantSubscription: (tenantId: string, body: { planCode: string; billingPeriod?: 'MONTHLY' | 'YEARLY' }) =>
    authApiClient<unknown>(`/admin/tenants/${encodeURIComponent(tenantId)}/subscriptions`, post(body)),

  getTenantUsage: (tenantId: string) =>
    authApiClient<TenantUsageSnapshot>(`/admin/tenants/${encodeURIComponent(tenantId)}/usage`),

  getTenantAudit: (tenantId: string) =>
    authApiClient<TenantAuditEvent[]>(`/admin/tenants/${encodeURIComponent(tenantId)}/audit`),

  getDashboardSubscription: async () => {
    const raw = await authApiClient<unknown>('/dashboard/subscription');
    return normalizeDashboardSubscription(raw);
  },

  checkoutSubscription: (payload: CheckoutSubscriptionPayload) =>
    authApiClient<SubscriptionInvoice>('/dashboard/subscription/checkout', post(payload)),

  getDashboardPaymentSettings: () => authApiClient<PaymentSettings>('/dashboard/payment-settings'),

  getSepayAuthorizeUrl: () =>
    authApiClient<{ authorizeUrl: string }>('/dashboard/payment-settings/sepay-authorize-url'),

  handleSepayCallback: (query: { code: string; state: string }) =>
    authApiClient<SepayCallbackResult>(
      `/dashboard/payment-settings/sepay-callback${toSearchParams({ code: query.code, state: query.state })}`,
    ),

  selectSepayBank: (payload: SelectSepayBankPayload) =>
    authApiClient<PaymentSettings>('/dashboard/payment-settings/select-bank', post(payload)),

  disconnectSepay: () => authApiClient<PaymentSettings>('/dashboard/payment-settings/disconnect', post({})),

  getDashboardInvoice: (id: string) =>
    authApiClient<SubscriptionInvoice>(`/dashboard/billing/invoices/${encodeURIComponent(id)}`),

  getDashboardInvoiceStatus: (id: string) =>
    authApiClient<{ status: string }>(`/dashboard/billing/invoices/${encodeURIComponent(id)}/status`),

  cancelDashboardInvoice: (id: string) =>
    authApiClient<SubscriptionInvoice>(`/dashboard/billing/invoices/${encodeURIComponent(id)}/cancel`, post({})),
};
