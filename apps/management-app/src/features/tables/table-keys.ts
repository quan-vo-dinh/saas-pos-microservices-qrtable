export const tableKeys = {
  all: ['tables'] as const,
  areas: () => [...tableKeys.all, 'areas'] as const,
  area: (id: string) => [...tableKeys.areas(), id] as const,
  tables: (areaId?: string) => [...tableKeys.all, 'list', { areaId }] as const,
  table: (id: string) => [...tableKeys.all, 'detail', id] as const,
};
