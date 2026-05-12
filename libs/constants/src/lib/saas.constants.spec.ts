import {
  BILL_REF_PREFIXES,
  RESERVED_TENANT_SLUGS,
  TenantStatus,
  buildTenantSuspendedRedisKey,
  normalizePlanCode,
} from './saas.constants';

describe('saas.constants', () => {
  it('keeps the canonical Phase 4B tenant slugs reserved', () => {
    expect(RESERVED_TENANT_SLUGS).toEqual([
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
    ]);
  });

  it('normalizes plan codes to uppercase stable keys', () => {
    expect(normalizePlanCode(' basic ')).toBe('BASIC');
  });

  it('builds stable redis keys for tenant suspension', () => {
    expect(buildTenantSuspendedRedisKey('tenant-1')).toBe('tenant:tenant-1:suspended');
  });

  it('uses separate webhook reference prefixes for bill and subscription money flows', () => {
    expect(BILL_REF_PREFIXES.TABLE_BILL).toBe('QRTBL');
    expect(BILL_REF_PREFIXES.SUBSCRIPTION).toBe('QRSUB');
  });

  it('defines the locked tenant statuses', () => {
    expect(Object.values(TenantStatus)).toEqual(['ACTIVE', 'SUSPENDED', 'CLOSED']);
  });
});
