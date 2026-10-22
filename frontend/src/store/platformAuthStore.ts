import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlatformAdmin } from "../types/platform";

interface PlatformAuthState {
  token: string | null;
  refreshToken: string | null;
  admin: PlatformAdmin | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  login: (token: string, refreshToken: string, admin: PlatformAdmin) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setAdmin: (admin: PlatformAdmin) => void;
  logout: () => void;
}

export const usePlatformAuthStore = create<PlatformAuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      admin: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      login: (token, refreshToken, admin) => {
        set({ token, refreshToken, admin, isAuthenticated: true });
      },

      setTokens: (token, refreshToken) => {
        set({ token, refreshToken });
      },

      setAdmin: (admin) => set({ admin }),

      logout: () =>
        set({
          token: null,
          refreshToken: null,
          admin: null,
          isAuthenticated: false,
        }),
    }),
    {
      // Different key from staff auth → no collision
      name: "platform-auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
