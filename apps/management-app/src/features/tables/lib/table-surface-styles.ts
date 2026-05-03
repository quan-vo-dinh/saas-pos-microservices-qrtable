import type { TableStatus } from '../data/schema';

/** Border tokens aligned with {@link TableFloorPlan} cards */
export const statusBorderColors: Record<TableStatus, string> = {
  available: 'border-emerald-500/40 hover:border-emerald-500',
  occupied: 'border-amber-500/40 hover:border-amber-500',
  billing: 'border-blue-500/40 hover:border-blue-500',
  cleaning: 'border-gray-500/40 hover:border-gray-500',
};

export const statusBgColors: Record<TableStatus, string> = {
  available: 'bg-emerald-500/5',
  occupied: 'bg-amber-500/5',
  billing: 'bg-blue-500/5',
  cleaning: 'bg-gray-500/5',
};
