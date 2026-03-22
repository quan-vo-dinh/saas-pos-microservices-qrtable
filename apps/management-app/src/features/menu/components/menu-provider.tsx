'use client';

import React, { useState } from 'react';
import type { Category, MenuItem } from '../data/schema';

type MenuDialogType =
  | 'add-category'
  | 'edit-category'
  | 'delete-category'
  | 'add-item'
  | 'edit-item'
  | 'delete-item';

type MenuContextType = {
  open: MenuDialogType | null;
  setOpen: (type: MenuDialogType | null) => void;
  currentCategory: Category | null;
  setCurrentCategory: React.Dispatch<React.SetStateAction<Category | null>>;
  currentItem: MenuItem | null;
  setCurrentItem: React.Dispatch<React.SetStateAction<MenuItem | null>>;
};

const MenuContext = React.createContext<MenuContextType | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<MenuDialogType | null>(null);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [currentItem, setCurrentItem] = useState<MenuItem | null>(null);

  return (
    <MenuContext value={{ open, setOpen, currentCategory, setCurrentCategory, currentItem, setCurrentItem }}>
      {children}
    </MenuContext>
  );
}

export function useMenu() {
  const ctx = React.useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used within <MenuProvider>');
  return ctx;
}
