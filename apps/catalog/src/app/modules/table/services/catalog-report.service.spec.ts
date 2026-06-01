import { CatalogReportService } from './catalog-report.service';
import { MenuItemRepository } from '../../menu-item/repositories/menu-item.repository';
import { TableRepository } from '../repositories/table.repository';

describe('CatalogReportService', () => {
  it('returns zero counts for tenant with no tables or menu items', async () => {
    const tableRepository = {
      aggregateStatusBreakdown: jest.fn().mockResolvedValue([]),
    };
    const menuItemRepository = {
      aggregateAvailabilityBreakdown: jest.fn().mockResolvedValue([]),
    };
    const service = new CatalogReportService(
      tableRepository as unknown as TableRepository,
      menuItemRepository as unknown as MenuItemRepository,
    );

    const result = await service.getTableReport({ tenantId: 'tenant-a' });

    expect(result.summary.totalTables).toBe(0);
    expect(result.summary.totalMenuItems).toBe(0);
    expect(tableRepository.aggregateStatusBreakdown).toHaveBeenCalledWith('tenant-a');
  });
});
