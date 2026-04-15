'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger, Skeleton } from '@einvoice/frontend-ui';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { MenuProvider } from './components/menu-provider';
import { MenuPrimaryButtons } from './components/menu-primary-buttons';
import { CategoriesTable } from './components/categories-table';
import { MenuItemsTable } from './components/menu-items-table';
import { MenuDialogs } from './components/menu-dialogs';
import { useCategoriesQuery, useMenuItemsQuery } from './hooks/use-menu-query';

export function MenuPage() {
  const { data: categories, isPending: catPending } = useCategoriesQuery();
  const { data: menuItems, isPending: itemsPending } = useMenuItemsQuery();

  return (
    <MenuProvider>
      <Header fixed>
        <Search />
        <div className="ms-auto flex items-center gap-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Menu Management</h2>
            <p className="text-muted-foreground">
              Manage your menu categories and items.
            </p>
          </div>
          <MenuPrimaryButtons />
        </div>

        <Tabs defaultValue="categories" className="flex flex-1 flex-col">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="items">Menu Items</TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="flex flex-1 flex-col mt-4">
            {catPending ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <CategoriesTable data={categories ?? []} />
            )}
          </TabsContent>
          <TabsContent value="items" className="flex flex-1 flex-col mt-4">
            {itemsPending ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <MenuItemsTable data={menuItems ?? []} />
            )}
          </TabsContent>
        </Tabs>
      </Main>

      <MenuDialogs />
    </MenuProvider>
  );
}
