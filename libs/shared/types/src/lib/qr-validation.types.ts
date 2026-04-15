export type ValidateQrRequest = {
  tableId: string;
  qrToken: string;
};

export type ValidateQrResponse = {
  id: string;
  tenantId: string;
  areaId: string;
  name: string;
  capacity: number;
  status: string;
  qrToken: string;
  sessionId: string | null;
};
