'use client';

import { create } from 'zustand';

type PosTableUiState = {
  selectedTableId: string | null;
  selectTable: (tableId: string | null) => void;
};

export const usePosTableUiState = create<PosTableUiState>((set) => ({
  selectedTableId: null,
  selectTable: (selectedTableId) => set({ selectedTableId }),
}));
