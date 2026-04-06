export type MockSession = {
  sessionId: string;
  tableId: string;
  tableName: string;
  areaName: string;
  capacity: number;
  restaurantName: string;
  qrToken: string;
};

export const sessions: MockSession[] = [
  {
    sessionId: 'session-001',
    tableId: 'tbl-001',
    tableName: 'T1',
    areaName: 'Tầng trệt',
    capacity: 4,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_t1_abc123',
  },
  {
    sessionId: 'session-002',
    tableId: 'tbl-005',
    tableName: 'T5',
    areaName: 'Tầng trệt',
    capacity: 6,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_t5_def456',
  },
  {
    sessionId: 'session-003',
    tableId: 'tbl-008',
    tableName: 'L3',
    areaName: 'Lầu 1',
    capacity: 4,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_l3_ghi789',
  },
];
