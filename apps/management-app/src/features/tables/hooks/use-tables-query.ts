import { useQuery } from '@tanstack/react-query';
import { useAuthReadyForBff } from '@/lib/auth/use-auth-ready';
import { tableKeys } from '../table-keys';
import { tablesService } from '../services/tables.service';

export function useAreasQuery() {
  const authReady = useAuthReadyForBff();
  return useQuery({
    queryKey: tableKeys.areas(),
    queryFn: tablesService.getAreas,
    enabled: authReady,
  });
}

export function useTablesQuery(areaId?: string) {
  const authReady = useAuthReadyForBff();
  return useQuery({
    queryKey: tableKeys.tables(areaId),
    queryFn: () => tablesService.getTables(areaId),
    enabled: authReady,
  });
}
