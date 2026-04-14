export type CreateAreaTcpRequest = {
  tenantId: string;
  name: string;
  sortOrder?: number;
};

export type GetAreaListTcpRequest = {
  tenantId: string;
};

export type GetAreaByIdTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateAreaTcpRequest = {
  id: string;
  tenantId: string;
  name?: string;
  sortOrder?: number;
};

export type DeleteAreaTcpRequest = {
  id: string;
  tenantId: string;
};

export type ReorderAreaTcpRequest = {
  tenantId: string;
  items: Array<{ id: string; sortOrder: number }>;
};
