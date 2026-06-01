import { SAAS_PLAN_FEATURE } from '@einvoice/shared-constants';
import { deriveDashboardEntitlements } from './derive-dashboard-entitlements';

describe('deriveDashboardEntitlements', () => {
  it('marks FREE tenant without analytics', () => {
    const entitlements = deriveDashboardEntitlements({
      current: {
        planCode: 'FREE',
        status: 'ACTIVE',
        expiresAt: null,
        features: [SAAS_PLAN_FEATURE.BASIC_POS],
      },
    });

    expect(entitlements.hasBasicAnalytics).toBe(false);
    expect(entitlements.hasAdvancedAnalytics).toBe(false);
    expect(entitlements.canUseExtendedRange).toBe(false);
  });

  it('marks BASIC tenant with basic analytics only', () => {
    const entitlements = deriveDashboardEntitlements({
      current: {
        planCode: 'BASIC',
        status: 'ACTIVE',
        expiresAt: null,
        features: [SAAS_PLAN_FEATURE.BASIC_POS, SAAS_PLAN_FEATURE.ANALYTICS_BASIC],
      },
    });

    expect(entitlements.hasBasicAnalytics).toBe(true);
    expect(entitlements.hasAdvancedAnalytics).toBe(false);
  });

  it('marks PREMIUM tenant with full analytics', () => {
    const entitlements = deriveDashboardEntitlements({
      current: {
        planCode: 'PREMIUM',
        status: 'ACTIVE',
        expiresAt: null,
        features: [
          SAAS_PLAN_FEATURE.BASIC_POS,
          SAAS_PLAN_FEATURE.ANALYTICS_BASIC,
          SAAS_PLAN_FEATURE.ANALYTICS_ADVANCED,
        ],
      },
    });

    expect(entitlements.hasBasicAnalytics).toBe(true);
    expect(entitlements.hasAdvancedAnalytics).toBe(true);
    expect(entitlements.canUseExtendedRange).toBe(true);
  });
});
