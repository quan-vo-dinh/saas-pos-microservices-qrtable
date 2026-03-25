import { useQuery } from '@tanstack/react-query';
import { tablesService } from '../services/tables.service';

export const tableKeys = {
  all: ['tables'] as const,
  areas: () => [...tableKeys.all, 'areas'] as const,
  area: (id: string) => [...tableKeys.areas(), id] as const,
  tables: (areaId?: string) => [...tableKeys.all, 'list', { areaId }] as const,
  table: (id: string) => [...tableKeys.all, 'detail', id] as const,
};

export function useAreasQuery() {
  return useQuery({
    queryKey: tableKeys.areas(),
    queryFn: tablesService.getAreas,
  });
}

export function useTablesQuery(areaId?: string) {
  return useQuery({
    queryKey: tableKeys.tables(areaId),
    queryFn: () => tablesService.getTables(areaId),
  });
}
