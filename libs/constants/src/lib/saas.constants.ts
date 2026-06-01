export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export enum TenantType {
  RESTAURANT = 'RESTAURANT',
  CAFE = 'CAFE',
  FOOD_COURT = 'FOOD_COURT',
  PUB = 'PUB',
  OTHER = 'OTHER',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
  SUPERSEDED = 'SUPERSEDED',
}

export enum SubscriptionInvoiceStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  UNDERPAID = 'UNDERPAID',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
}

export enum TenantPaymentConnectionStatus {
  NOT_CONNECTED = 'NOT_CONNECTED',
  CONNECTED = 'CONNECTED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  REVOKED = 'REVOKED',
  ERROR = 'ERROR',
}

export const BILL_REF_PREFIXES = {
  TABLE_BILL: 'QRTBL',
  SUBSCRIPTION: 'QRSUB',
} as const;

export const DEFAULT_PLAN_CODES = {
  FREE: 'FREE',
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
} as const;

/** Canonical SaaS plan feature codes (dashboard entitlements + plan editor). */
export const PLAN_FEATURE_CODES = {
  BASIC_POS: 'basic_pos',
  ANALYTICS_BASIC: 'analytics_basic',
  ANALYTICS_ADVANCED: 'analytics_advanced',
  PRIORITY_SUPPORT: 'priority_support',
} as const;

export type PlanFeatureCode = (typeof PLAN_FEATURE_CODES)[keyof typeof PLAN_FEATURE_CODES];

export const PLAN_FEATURE_CODE_VALUES = Object.values(PLAN_FEATURE_CODES) as PlanFeatureCode[];

export function hasPlanFeature(features: string[] | null | undefined, required: PlanFeatureCode): boolean {
  return Array.isArray(features) && features.includes(required);
}

export const SAAS_EVENTS = {
  TENANT_CREATED: 'tenant.created',
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_ACTIVATED: 'tenant.activated',
  TENANT_CLOSED: 'tenant.closed',
  SUBSCRIPTION_ASSIGNED: 'subscription.assigned',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',
  SUBSCRIPTION_INVOICE_PAID: 'subscription_invoice.paid',
  TENANT_CACHE_REFRESH_REQUESTED: 'tenant.cache_refresh_requested',
} as const;

/** Socket.io event names for tenant lifecycle → customer `tenant:{id}:customers` room (Phase 4B). */
export const TENANT_LIFECYCLE_SOCKET_EVENTS = {
  SUSPENDED: SAAS_EVENTS.TENANT_SUSPENDED,
  ACTIVATED: SAAS_EVENTS.TENANT_ACTIVATED,
  CLOSED: SAAS_EVENTS.TENANT_CLOSED,
} as const;

export function buildTenantCustomersSocketRoom(tenantId: string): string {
  return `tenant:${tenantId}:customers`;
}

export function buildTenantSlugCustomersSocketRoom(tenantSlug: string): string {
  return `tenant-slug:${tenantSlug}:customers`;
}

export const RESERVED_TENANT_SLUGS = [
  'admin',
  'api',
  'www',
  'app',
  'billing',
  'dashboard',
  'public',
  'static',
  'assets',
  'media',
  'cdn',
  'mail',
  'smtp',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'oauth',
  'sso',
  'health',
  'metrics',
  'status',
  'debug',
  'help',
  'support',
  'docs',
  'blog',
  'system',
  'root',
  'sudo',
  'owner',
  'payment',
  'platform',
  'manager',
  'staff',
  'subscription',
  'tenant',
  'webhook',
  'qrtable',
  'qr-table',
  'qr_table',
  'demo',
  'test',
  'staging',
  'production',
  'pos',
  'kds',
  'kitchen',
  'bar',
  'waiter',
  'chef',
  'barista',
] as const;

export function normalizePlanCode(code: string): string {
  return code.trim().toUpperCase();
}

export function buildTenantSuspendedRedisKey(tenantId: string): string {
  return `tenant:${tenantId}:suspended`;
}

export function buildCurrentSubscriptionRedisKey(tenantId: string): string {
  return `subscription:${tenantId}`;
}
