import type { PricingPlan } from '@/features/saas/types';

export function getActivePlanOptions(plans: PricingPlan[] | undefined): PricingPlan[] {
  return [...(plans ?? [])]
    .filter((plan) => plan.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.priceVnd - b.priceVnd || a.code.localeCompare(b.code));
}

export function getNextPlanCode({
  plans,
  currentPlanCode,
}: {
  plans: PricingPlan[] | undefined;
  currentPlanCode: string;
}): string {
  const activePlans = getActivePlanOptions(plans);
  const normalizedCurrent = currentPlanCode.trim().toUpperCase();

  if (activePlans.some((plan) => plan.code === normalizedCurrent)) {
    return normalizedCurrent;
  }

  return activePlans[0]?.code ?? '';
}
