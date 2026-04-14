import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';

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
  status: MENU_ITEM_STATUS;
};

export type PublicMenuTcpResponse = {
  categories: PublicMenuCategoryResponse[];
};
