export type TableStatus = 'available' | 'occupied' | 'billing' | 'cleaning';

export type Area = {
  id: string;
  name: string;
  sortOrder: number;
  tableCount: number;
};

export type RestaurantTable = {
  id: string;
  areaId: string;
  areaName: string;
  name: string;
  capacity: number;
  status: TableStatus;
  qrToken: string;
  sessionId: string | null;
};
