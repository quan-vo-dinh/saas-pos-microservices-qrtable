import { TenantStatus } from '@common/constants/saas.constants';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Subscription } from '@common/entities/subscription.entity';
import { SubscriptionInvoice } from '@common/entities/subscription-invoice.entity';
import { Tenant } from '@common/entities/tenant.entity';

describe('Phase 4B entity shape', () => {
  it('tenant supports status-based active mapping inputs', () => {
    const tenant = new Tenant();
    tenant.name = 'Pho Ha Noi';
    tenant.slug = 'pho-ha-noi';
    tenant.status = TenantStatus.ACTIVE;
    expect(tenant.status).toBe(TenantStatus.ACTIVE);
  });

  it('pricing plan stores quotas and features', () => {
    const plan = new PricingPlan();
    plan.code = 'BASIC';
    plan.features = ['basic_pos'];
    plan.maxTables = 50;
    expect(plan.features).toEqual(['basic_pos']);
  });

  it('subscription invoice stores a QRSUB billing reference', () => {
    const invoice = new SubscriptionInvoice();
    invoice.billingReference = 'QRSUBABC123';
    expect(invoice.billingReference.startsWith('QRSUB')).toBe(true);
  });

  it('subscription stores immutable plan snapshots', () => {
    const subscription = new Subscription();
    subscription.planCodeSnapshot = 'FREE';
    subscription.priceVndSnapshot = 0;
    expect(subscription.priceVndSnapshot).toBe(0);
  });
});
