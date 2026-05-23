jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { MetadataKey } from '@common/constants/common.constant';
import { TenantStatus } from '@common/constants/saas.constants';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { CustomerTenantLifecycleGuard } from './customer-tenant-lifecycle.guard';

describe('CustomerTenantLifecycleGuard', () => {
  const cache = { get: jest.fn() };
  const saasClient = { send: jest.fn() };

  const guard = () => new CustomerTenantLifecycleGuard(cache as never, saasClient as never);

  const ctx = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext;

  async function expectBusinessError(promise: Promise<unknown>, errorCode: ErrorCode): Promise<void> {
    let caught: unknown;
    try {
      await promise;
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BusinessException);
    expect((caught as BusinessException).errorCode).toBe(errorCode);
  }

  function mockTenantStatus(status: TenantStatus | null): void {
    if (status === null) {
      saasClient.send.mockReturnValue(throwError(() => new Error('saas unavailable')));
      return;
    }
    saasClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: { id: 'tenant-1', status },
      }),
    );
  }

  beforeEach(() => {
    cache.get.mockResolvedValue(undefined);
    mockTenantStatus(TenantStatus.ACTIVE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows browsing routes for suspended tenants', async () => {
    mockTenantStatus(TenantStatus.SUSPENDED);

    await expect(
      guard().canActivate(
        ctx({
          method: 'GET',
          path: '/api/v1/customer/menu',
          [MetadataKey.TENANT_ID]: 'tenant-1',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('blocks customer order mutations for suspended tenants', async () => {
    mockTenantStatus(TenantStatus.SUSPENDED);

    await expectBusinessError(
      guard().canActivate(
        ctx({
          method: 'POST',
          path: '/api/v1/customer/cart/items',
          [MetadataKey.TENANT_ID]: 'tenant-1',
        }),
      ),
      ErrorCode.TENANT_SUSPENDED,
    );
  });

  it('blocks closed tenants for customer routes', async () => {
    mockTenantStatus(TenantStatus.CLOSED);

    await expectBusinessError(
      guard().canActivate(
        ctx({
          method: 'GET',
          path: '/api/v1/customer/menu',
          [MetadataKey.TENANT_ID]: 'tenant-1',
        }),
      ),
      ErrorCode.TENANT_CLOSED,
    );
  });

  it('uses Redis suspended flag when SaaS status is unavailable for mutations', async () => {
    cache.get.mockResolvedValue('1');
    mockTenantStatus(null);

    await expectBusinessError(
      guard().canActivate(
        ctx({
          method: 'POST',
          path: '/api/v1/customer/cart/items',
          [MetadataKey.TENANT_ID]: 'tenant-1',
        }),
      ),
      ErrorCode.TENANT_SUSPENDED,
    );
  });

  it('fails closed for mutations when both Redis and SaaS status are unavailable', async () => {
    mockTenantStatus(null);

    await expectBusinessError(
      guard().canActivate(
        ctx({
          method: 'POST',
          path: '/api/v1/customer/cart/items',
          [MetadataKey.TENANT_ID]: 'tenant-1',
        }),
      ),
      ErrorCode.TENANT_STATUS_UNAVAILABLE,
    );
  });

  it('keeps pending customer VietQR route available for suspended tenants', async () => {
    mockTenantStatus(TenantStatus.SUSPENDED);

    await expect(
      guard().canActivate(
        ctx({
          method: 'POST',
          path: '/api/v1/customer/payment/vietqr',
          [MetadataKey.TENANT_ID]: 'tenant-1',
        }),
      ),
    ).resolves.toBe(true);
  });

  it('queries SaaS by server-derived tenant id only', async () => {
    await guard().canActivate(
      ctx({
        method: 'POST',
        path: '/api/v1/customer/cart/items',
        body: { tenantId: 'attacker-tenant' },
        [MetadataKey.TENANT_ID]: 'tenant-1',
      }),
    );

    expect(saasClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.SAAS.GET_BY_ID,
      expect.objectContaining({
        data: { id: 'tenant-1' },
      }),
    );
  });
});
