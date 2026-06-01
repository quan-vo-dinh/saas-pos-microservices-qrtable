export interface CatalogTableReportRequest {
  tenantId: string;
}

export interface CatalogTableReportResponse {
  generatedAt: string;
  summary: {
    totalTables: number;
    availableTables: number;
    occupiedTables: number;
    unavailableTables: number;
    totalMenuItems: number;
    activeMenuItems: number;
    outOfStockItems: number;
  };
  tableStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  menuAvailabilityBreakdown: Array<{
    status: string;
    count: number;
  }>;
}
