import { TenantCreatedConsumer } from './tenant-created.consumer';

describe('TenantCreatedConsumer', () => {
  const areaService = {
    existsByTenantIdAndName: jest.fn(),
    createSystemArea: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('creates a default area once for tenant.created', async () => {
    areaService.existsByTenantIdAndName.mockResolvedValue(false);
    const consumer = new TenantCreatedConsumer(areaService as never);

    await expect(consumer.handleTenantCreated({ tenantId: 'tenant-1', tenantSlug: 'pho-ha-noi' })).resolves.toEqual({
      seeded: true,
    });
    expect(areaService.createSystemArea).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      name: 'Khu vực chính',
      processId: undefined,
    });
  });

  it('is idempotent for duplicate tenant.created events', async () => {
    areaService.existsByTenantIdAndName.mockResolvedValue(true);
    const consumer = new TenantCreatedConsumer(areaService as never);

    await expect(consumer.handleTenantCreated({ tenantId: 'tenant-1' })).resolves.toEqual({
      seeded: false,
      reason: 'DEFAULT_AREA_EXISTS',
    });
    expect(areaService.createSystemArea).not.toHaveBeenCalled();
  });
});
