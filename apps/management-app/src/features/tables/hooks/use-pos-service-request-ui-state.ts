'use client';

import { create } from 'zustand';

type PosServiceRequestUiState = {
  selectedServiceRequestId: string | null;
  selectServiceRequest: (id: string | null) => void;
};

export const usePosServiceRequestUiState = create<PosServiceRequestUiState>((set) => ({
  selectedServiceRequestId: null,
  selectServiceRequest: (selectedServiceRequestId) => set({ selectedServiceRequestId }),
}));
