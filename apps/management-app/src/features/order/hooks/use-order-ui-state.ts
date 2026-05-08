'use client';

import { create } from 'zustand';

export type OrderViewFilter = 'all' | 'PENDING' | 'PROCESSING' | 'READY' | 'SERVED' | 'OVERDUE' | 'OCCUPIED_TABLE';

type OrderUiState = {
  selectedOrderId: string | null;
  viewFilter: OrderViewFilter;
  selectOrder: (orderId: string | null) => void;
  setViewFilter: (filter: OrderViewFilter) => void;
  reset: () => void;
};

const initialState = {
  selectedOrderId: null,
  viewFilter: 'all' as OrderViewFilter,
};

export const useOrderUiState = create<OrderUiState>((set) => ({
  ...initialState,
  selectOrder: (selectedOrderId) => set({ selectedOrderId }),
  setViewFilter: (viewFilter) => set({ viewFilter }),
  reset: () => set(initialState),
}));
