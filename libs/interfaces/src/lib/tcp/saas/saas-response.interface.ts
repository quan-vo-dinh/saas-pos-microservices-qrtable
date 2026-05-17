import type { SubscriptionInvoiceStatus, SubscriptionStatus, TenantStatus } from '@common/constants/saas.constants';

export type TenantPlanLimitType = 'max_tables' | 'max_staff' | 'max_orders_per_day';

export type TenantPlanLimitExceededDetails = {
  limitType: TenantPlanLimitType;
  limit: number;
  current: number;
  upgradeUrl: '/dashboard/subscription';
};

export type TenantSummaryTcpResponse = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  isActive: boolean;
  defaultCurrency: string;
  defaultLocale: string;
  ownerId?: string | null;
  currentPlanCode?: string | null;
  /** Present when status is SUSPENDED (customer banner / admin). */
  suspendedReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TenantTcpResponse = TenantSummaryTcpResponse;

export type PricingPlanTcpResponse = {
  id: string;
  code: string;
  name: string;
  priceVnd: number;
  maxTables: number;
  maxStaff: number;
  maxOrdersPerDay: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
};

export type SubscriptionTcpResponse = {
  id: string;
  tenantId: string;
  pricingPlanId: string;
  planCodeSnapshot: string;
  priceVndSnapshot: number;
  status: SubscriptionStatus;
  startsAt: string;
  expiresAt?: string | null;
};

export type SubscriptionInvoiceTcpResponse = {
  id: string;
  tenantId: string;
  pricingPlanId: string;
  billingReference: string;
  status: SubscriptionInvoiceStatus;
  amountVnd: number;
  qrUrl: string;
  qrExpiresAt: string;
  paidAt?: string | null;
};

export type CurrentSubscriptionQuotaTcpResponse = {
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  expiresAt: string | null;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  features: string[];
  maxTables: number;
  maxStaff: number;
  maxOrdersPerDay: number;
};

export type SubscriptionDashboardTenantTcpResponse = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
};

export type SubscriptionDashboardPlanTcpResponse = PricingPlanTcpResponse & {
  description: string | null;
  billingPeriod: 'MONTHLY' | 'YEARLY';
};

export type SubscriptionDashboardHistoryTcpResponse = SubscriptionTcpResponse & {
  planCode: string;
  expiresAt: string | null;
  createdAt: string;
};

export type SubscriptionDashboardTcpResponse = {
  tenant: SubscriptionDashboardTenantTcpResponse;
  current: CurrentSubscriptionQuotaTcpResponse | null;
  usage: Record<string, unknown>;
  plans: SubscriptionDashboardPlanTcpResponse[];
  history: SubscriptionDashboardHistoryTcpResponse[];
};
