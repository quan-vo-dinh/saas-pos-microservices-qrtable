import { create } from 'zustand';

type UserProfile = {
  userId: string;
  email?: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
};

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
