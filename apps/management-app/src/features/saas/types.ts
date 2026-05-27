/** Phase 4B SaaS / subscription UI types (aligned with BFF + TCP contracts). */

import type {
  SaasBillingPeriod,
  SaasInvoiceStatus,
  SaasPaymentConnectionStatus,
  SaasSubscriptionStatus,
  SaasTenantStatus,
  SaasTenantType,
} from '@einvoice/shared-constants';

/** Wire enums — re-exported from @einvoice/shared-constants (synced with libs/constants/saas.constants.ts). */
export type TenantStatus = SaasTenantStatus;
export type SubscriptionStatus = SaasSubscriptionStatus;
export type InvoiceStatus = SaasInvoiceStatus;
export type BillingPeriod = SaasBillingPeriod;
export type PaymentConnectionStatus = SaasPaymentConnectionStatus;
export type TenantType = SaasTenantType;

export interface PricingPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceVnd: number;
  billingPeriod: BillingPeriod;
  maxTables: number;
  maxStaff: number;
  maxOrdersPerDay: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  type: string;
  ownerEmail: string | null;
  ownerName: string | null;
  planCode: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface TenantDetail extends TenantListItem {
  address: string | null;
  ownerId: string | null;
  defaultCurrency: string;
  defaultLocale: string;
  operatingModes: string[];
  suspendedAt: string | null;
  suspendedReason: string | null;
  closedAt: string | null;
  closedReason: string | null;
}

export interface SubscriptionInvoice {
  id: string;
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  planCodeSnapshot: string;
  amountVnd: number;
  paidAmountVnd: number | null;
  billingPeriod: BillingPeriod;
  billingReference: string;
  status: InvoiceStatus;
  qrUrl: string | null;
  qrExpiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** BFF `GET /dashboard/payment-settings` — field names follow payment TCP response. */
export interface PaymentSettings {
  cashEnabled: boolean;
  vietqrEnabled: boolean;
  connectionStatus: PaymentConnectionStatus;
  bankShortName?: string | null;
  bankName?: string | null;
  accountNumberMasked?: string | null;
  accountHolder?: string | null;
  lastError?: string | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export type AdminTenantQuery = {
  search?: string;
  status?: TenantStatus | '';
  planCode?: string;
  page?: number;
  limit?: number;
};

export type AdminInvoiceQuery = {
  status?: string;
  tenantId?: string;
  tenantSearch?: string;
  planCode?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type OnboardTenantPayload = {
  tenantName: string;
  tenantType?: string;
  address?: string;
  initialPlanCode: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
  operatingModes?: string[];
};

export type UpdateTenantStatusPayload = {
  action: 'SUSPEND' | 'ACTIVATE' | 'CLOSE';
  reason?: string;
};

export type CreatePlanPayload = Omit<PricingPlan, 'id'> & { code: string };
export type UpdatePlanPayload = Partial<Omit<PricingPlan, 'id' | 'code'>>;

export type CheckoutSubscriptionPayload = {
  planCode: string;
  billingPeriod: BillingPeriod;
};

export type ManualConfirmPayload = {
  note: string;
};

export type SelectSepayBankPayload = {
  bankAccountUuid: string;
  accountNumber: string;
  accountHolder: string;
  bankName: string;
  bankShortName?: string;
  bankBin?: string;
};

export type SepayBankAccountOption = {
  uuid: string;
  bankShortName: string;
  accountNumber: string;
  accountHolder: string;
};

export type SepayCallbackResult = {
  banks: SepayBankAccountOption[];
  tokenExpiresAt: string;
};

export type SubscriptionHistoryRow = {
  id: string;
  planCode: string;
  status: SubscriptionStatus;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
};

export type TenantUsageSnapshot = {
  tablesUsed?: number;
  tablesMax?: number;
  staffUsed?: number;
  staffMax?: number;
  ordersToday?: number;
  ordersMaxPerDay?: number;
};

export type TenantAuditEvent = {
  id?: string;
  at?: string;
  action: string;
  detail?: string;
};

/** Composite view for owner subscription page (BFF may evolve fields). */
export type DashboardSubscription = {
  tenant?: {
    id: string;
    name?: string;
    slug?: string;
    status?: TenantStatus;
  };
  current?: {
    planCode: string;
    planName?: string;
    status: SubscriptionStatus;
    expiresAt: string | null;
    billingPeriod?: BillingPeriod;
    features?: string[];
    maxTables?: number;
    maxStaff?: number;
    maxOrdersPerDay?: number;
  } | null;
  usage?: TenantUsageSnapshot;
  plans?: PricingPlan[];
  history?: SubscriptionHistoryRow[];
};
