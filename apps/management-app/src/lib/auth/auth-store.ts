import { create } from 'zustand';
import type { UserProfile } from '@einvoice/types';

type AuthStore = {
  profile: UserProfile | null;
  accessToken: string | null;
  hydrated: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setAccessToken: (token: string | null) => void;
  setHydrated: (hydrated: boolean) => void;
  reset: () => void;
};

const initialState = {
  profile: null,
  accessToken: null,
  hydrated: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setProfile: (profile) => set({ profile }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setHydrated: (hydrated) => set({ hydrated }),
  reset: () => set(initialState),
}));
