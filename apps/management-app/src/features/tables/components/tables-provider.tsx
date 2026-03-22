'use client';

import React, { useState } from 'react';
import type { Area, RestaurantTable } from '../data/schema';

type TablesDialogType =
  | 'add-area'
  | 'edit-area'
  | 'delete-area'
  | 'add-table'
  | 'edit-table'
  | 'delete-table'
  | 'view-qr';

type TablesContextType = {
  open: TablesDialogType | null;
  setOpen: (type: TablesDialogType | null) => void;
  currentArea: Area | null;
  setCurrentArea: React.Dispatch<React.SetStateAction<Area | null>>;
  currentTable: RestaurantTable | null;
  setCurrentTable: React.Dispatch<React.SetStateAction<RestaurantTable | null>>;
  selectedTableId: string | null;
  setSelectedTableId: React.Dispatch<React.SetStateAction<string | null>>;
};

const TablesContext = React.createContext<TablesContextType | null>(null);

export function TablesProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<TablesDialogType | null>(null);
  const [currentArea, setCurrentArea] = useState<Area | null>(null);
  const [currentTable, setCurrentTable] = useState<RestaurantTable | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  return (
    <TablesContext
      value={{
        open,
        setOpen,
        currentArea,
        setCurrentArea,
        currentTable,
        setCurrentTable,
        selectedTableId,
        setSelectedTableId,
      }}
    >
      {children}
    </TablesContext>
  );
}

export function useTables() {
  const ctx = React.useContext(TablesContext);
  if (!ctx) throw new Error('useTables must be used within <TablesProvider>');
  return ctx;
}
