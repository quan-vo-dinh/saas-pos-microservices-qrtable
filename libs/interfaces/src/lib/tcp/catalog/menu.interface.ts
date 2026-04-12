export type GetPublicMenuTcpRequest = {
  tenantId: string;
};

export type PublicMenuCategoryResponse = {
  id: string;
  name: string;
  sortOrder: number;
  items: PublicMenuItemResponse[];
};

export type PublicMenuItemResponse = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: string;
};

export type PublicMenuTcpResponse = {
  categories: PublicMenuCategoryResponse[];
};
