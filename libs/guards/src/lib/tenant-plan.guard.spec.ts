import { ExecutionContext } from '@nestjs/common';
import { TenantPlanGuard } from './tenant-plan.guard';

describe('TenantPlanGuard', () => {
  const guard = new TenantPlanGuard();
  const context = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  it('allows request when subscription is not attached yet', () => {
    expect(guard.canActivate(context({}))).toBe(true);
  });

  it('allows active subscription', () => {
    expect(guard.canActivate(context({ subscription: { status: 'ACTIVE' } }))).toBe(true);
  });

  it('blocks non-active subscription', () => {
    expect(guard.canActivate(context({ subscription: { status: 'EXPIRED' } }))).toBe(false);
  });
});
