import { create } from 'zustand';
import type { UserProfile } from '@einvoice/types';

type AuthStore = {
  profile: UserProfile | null;
  hydrated: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setHydrated: (hydrated: boolean) => void;
  reset: () => void;
};

const initialState = {
  profile: null,
  hydrated: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setProfile: (profile) => set({ profile }),
  setHydrated: (hydrated) => set({ hydrated }),
  reset: () => set(initialState),
}));
