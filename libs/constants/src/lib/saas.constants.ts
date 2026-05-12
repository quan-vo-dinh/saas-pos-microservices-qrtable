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
