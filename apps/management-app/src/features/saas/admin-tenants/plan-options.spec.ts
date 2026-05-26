import type { PricingPlan } from '@/features/saas/types';
import { getActivePlanOptions, getNextPlanCode } from './plan-options';

function plan(input: Partial<PricingPlan> & { code: string }): PricingPlan {
  return {
    id: input.id ?? input.code.toLowerCase(),
    code: input.code,
    name: input.name ?? input.code,
    description: input.description ?? null,
    priceVnd: input.priceVnd ?? 0,
    billingPeriod: input.billingPeriod ?? 'MONTHLY',
    maxTables: input.maxTables ?? 10,
    maxStaff: input.maxStaff ?? 5,
    maxOrdersPerDay: input.maxOrdersPerDay ?? 100,
    features: input.features ?? [],
    isActive: input.isActive ?? true,
    displayOrder: input.displayOrder ?? 0,
  };
}

describe('plan options', () => {
  it('uses active plans from the backend instead of default SaaS codes', () => {
    const options = getActivePlanOptions([
      plan({ code: 'STARTER', displayOrder: 2 }),
      plan({ code: 'LEGACY_BASIC', isActive: false, displayOrder: 1 }),
      plan({ code: 'PRO', displayOrder: 1 }),
    ]);

    expect(options.map((item) => item.code)).toEqual(['PRO', 'STARTER']);
  });

  it('keeps the selected plan only when it is still active', () => {
    const plans = [plan({ code: 'STARTER', displayOrder: 1 }), plan({ code: 'BASIC', isActive: false })];

    expect(getNextPlanCode({ plans, currentPlanCode: 'BASIC' })).toBe('STARTER');
    expect(getNextPlanCode({ plans, currentPlanCode: 'STARTER' })).toBe('STARTER');
  });

  it('returns an empty selection when no active plan exists', () => {
    const plans = [plan({ code: 'BASIC', isActive: false })];

    expect(getActivePlanOptions(plans)).toEqual([]);
    expect(getNextPlanCode({ plans, currentPlanCode: 'BASIC' })).toBe('');
  });
});
