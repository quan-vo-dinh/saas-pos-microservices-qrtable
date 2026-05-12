import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantStatusGuard } from './tenant-status.guard';

describe('TenantStatusGuard', () => {
  const guard = new TenantStatusGuard();
  const context = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  it('allows active tenant', () => {
    expect(
      guard.canActivate(context({ tenant: { status: 'ACTIVE' }, method: 'POST', route: { path: '/catalog' } })),
    ).toBe(true);
  });

  it('blocks closed tenant with TENANT_CLOSED', () => {
    expect(() => guard.canActivate(context({ tenant: { status: 'CLOSED' } }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context({ tenant: { status: 'CLOSED' } }))).toThrow('TENANT_CLOSED');
  });

  it('blocks suspended tenant on mutating dashboard route', () => {
    expect(() =>
      guard.canActivate(
        context({
          tenant: { status: 'SUSPENDED' },
          method: 'POST',
          route: { path: '/dashboard/subscription/checkout' },
        }),
      ),
    ).toThrow('TENANT_SUSPENDED');
  });

  it('allows suspended tenant to read dashboard subscription route', () => {
    expect(
      guard.canActivate(
        context({
          tenant: { status: 'SUSPENDED' },
          method: 'GET',
          route: { path: '/dashboard/subscription' },
        }),
      ),
    ).toBe(true);
  });
});
