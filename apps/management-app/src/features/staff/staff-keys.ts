import type { StaffListQuery } from './types';

export const staffKeys = {
  all: ['staff'] as const,
  list: (query: StaffListQuery) => [...staffKeys.all, 'list', query] as const,
};
