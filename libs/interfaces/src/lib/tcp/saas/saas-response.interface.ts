import type { SubscriptionInvoiceStatus, SubscriptionStatus, TenantStatus } from '@common/constants/saas.constants';

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
