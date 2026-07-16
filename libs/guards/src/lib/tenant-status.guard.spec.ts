import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ExecutionContext } from '@nestjs/common';
import { TenantStatusGuard } from './tenant-status.guard';

describe('TenantStatusGuard', () => {
  const guard = new TenantStatusGuard();
  const context = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  function expectBusinessError(fn: () => unknown, errorCode: ErrorCode) {
    let caught: unknown;

    try {
      fn();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessException);
    expect((caught as BusinessException).errorCode).toBe(errorCode);
  }

  it('allows active tenant', () => {
    expect(
      guard.canActivate(context({ tenant: { status: 'ACTIVE' }, method: 'POST', route: { path: '/catalog' } })),
    ).toBe(true);
  });

  it('blocks closed tenant with TENANT_CLOSED', () => {
    expectBusinessError(() => guard.canActivate(context({ tenant: { status: 'CLOSED' } })), ErrorCode.TENANT_CLOSED);
  });

  it('blocks suspended tenant on mutating dashboard route', () => {
    expectBusinessError(
      () =>
        guard.canActivate(
          context({
            tenant: { status: 'SUSPENDED' },
            method: 'POST',
            route: { path: '/dashboard/subscription/checkout' },
          }),
        ),
      ErrorCode.TENANT_SUSPENDED,
    );
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
