import { Injectable } from '@nestjs/common';
import { TABLE_STATUS, MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';
import type { CatalogTableReportRequest, CatalogTableReportResponse } from '@common/interfaces/tcp/catalog';
import { MenuItemRepository } from '../../menu-item/repositories/menu-item.repository';
import { TableRepository } from '../repositories/table.repository';

@Injectable()
export class CatalogReportService {
  constructor(
    private readonly tableRepository: TableRepository,
    private readonly menuItemRepository: MenuItemRepository,
  ) {}

  async getTableReport(request: CatalogTableReportRequest): Promise<CatalogTableReportResponse> {
    const [tableStatusBreakdown, menuAvailabilityBreakdown] = await Promise.all([
      this.tableRepository.aggregateStatusBreakdown(request.tenantId),
      this.menuItemRepository.aggregateAvailabilityBreakdown(request.tenantId),
    ]);

    const availableTables = tableStatusBreakdown.find((row) => row.status === TABLE_STATUS.AVAILABLE)?.count ?? 0;
    const occupiedTables =
      (tableStatusBreakdown.find((row) => row.status === TABLE_STATUS.OCCUPIED)?.count ?? 0) +
      (tableStatusBreakdown.find((row) => row.status === TABLE_STATUS.BILLING)?.count ?? 0);
    const unavailableTables = tableStatusBreakdown.find((row) => row.status === TABLE_STATUS.CLEANING)?.count ?? 0;
    const totalTables = tableStatusBreakdown.reduce((sum, row) => sum + row.count, 0);

    const activeMenuItems =
      menuAvailabilityBreakdown.find((row) => row.status === MENU_ITEM_STATUS.AVAILABLE)?.count ?? 0;
    const outOfStockItems =
      menuAvailabilityBreakdown.find((row) => row.status === MENU_ITEM_STATUS.OUT_OF_STOCK)?.count ?? 0;
    const totalMenuItems = menuAvailabilityBreakdown.reduce((sum, row) => sum + row.count, 0);

    return {
      generatedAt: new Date().toISOString(),
      summary: {
        totalTables,
        availableTables,
        occupiedTables,
        unavailableTables,
        totalMenuItems,
        activeMenuItems,
        outOfStockItems,
      },
      tableStatusBreakdown,
      menuAvailabilityBreakdown,
    };
  }
}
