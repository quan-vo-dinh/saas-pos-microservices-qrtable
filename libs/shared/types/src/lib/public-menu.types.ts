export type PublicMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  status: 'available' | 'out_of_stock';
};

export type PublicMenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: PublicMenuItem[];
};

export type PublicMenuResponse = {
  categories: PublicMenuCategory[];
};
