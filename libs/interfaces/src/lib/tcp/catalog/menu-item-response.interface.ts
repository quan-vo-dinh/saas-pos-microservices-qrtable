import { MENU_ITEM_STATUS, PREPARATION_STATION } from '@common/constants/enum/catalog.enum';
import { MenuItem } from '@common/entities/menu-item.entity';

export type MenuItemTcpResponse = MenuItem;

export type OrderableMenuItemSnapshot = {
  menuItemId: string;
  menuItemName: string;
  menuItemImageUrl: string | null;
  unitPrice: number;
  status: MENU_ITEM_STATUS;
  stock: number;
  station: PREPARATION_STATION;
};

export type StockMutationResult = {
  menuItemId: string;
  menuItemName: string;
  requestedQuantity: number;
  remainingStock: number;
  status: MENU_ITEM_STATUS;
};
