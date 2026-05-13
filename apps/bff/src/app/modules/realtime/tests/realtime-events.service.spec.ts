jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { RealtimeEventsService } from '../services/realtime-events.service';

describe('RealtimeEventsService tenant lifecycle events', () => {
  const gateway = { emitToRoom: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('emits lifecycle payload to tenant id and slug customer rooms', () => {
    const service = new RealtimeEventsService(gateway as never);

    service.emitTenantLifecycle({
      eventName: 'tenant.suspended',
      tenantId: 'tenant-1',
      tenantSlug: 'pho-viet',
      status: 'SUSPENDED',
      reason: 'SUBSCRIPTION_EXPIRED',
      occurredAt: '2026-05-13T00:00:00.000Z',
    });

    const payload = {
      tenantId: 'tenant-1',
      tenantSlug: 'pho-viet',
      status: 'SUSPENDED',
      reason: 'SUBSCRIPTION_EXPIRED',
      occurredAt: '2026-05-13T00:00:00.000Z',
    };
    expect(gateway.emitToRoom).toHaveBeenCalledWith('tenant:tenant-1:customers', 'tenant.suspended', payload);
    expect(gateway.emitToRoom).toHaveBeenCalledWith('tenant-slug:pho-viet:customers', 'tenant.suspended', payload);
    expect(JSON.stringify(payload)).not.toMatch(/invoice|payment|secret/i);
  });

  it('does not emit slug room when slug is blank', () => {
    const service = new RealtimeEventsService(gateway as never);

    service.emitTenantLifecycle({
      eventName: 'tenant.closed',
      tenantId: 'tenant-1',
      tenantSlug: '',
      status: 'CLOSED',
      reason: null,
      occurredAt: '2026-05-13T00:00:00.000Z',
    });

    expect(gateway.emitToRoom).toHaveBeenCalledTimes(1);
    expect(gateway.emitToRoom).toHaveBeenCalledWith(
      'tenant:tenant-1:customers',
      'tenant.closed',
      expect.objectContaining({ tenantId: 'tenant-1', status: 'CLOSED' }),
    );
  });
});
