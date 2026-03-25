export type CategoryStatus = 'active' | 'inactive';

export type MenuItemStatus = 'available' | 'out_of_stock';

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  timeStart: string | null;
  timeEnd: string | null;
  status: CategoryStatus;
  itemCount: number;
  createdAt: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  sortOrder: number;
  status: MenuItemStatus;
  createdAt: string;
};
