'use client';

import { CategoryMutateDialog } from './category-mutate-dialog';
import { CategoryDeleteDialog } from './category-delete-dialog';
import { MenuItemMutateDrawer } from './menu-item-mutate-drawer';
import { MenuItemDeleteDialog } from './menu-item-delete-dialog';

export function MenuDialogs() {
  return (
    <>
      <CategoryMutateDialog />
      <CategoryDeleteDialog />
      <MenuItemMutateDrawer />
      <MenuItemDeleteDialog />
    </>
  );
}
