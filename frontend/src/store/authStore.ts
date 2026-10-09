import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Staff } from "../types";

interface AuthState {
  token: string | null; // access token
  refreshToken: string | null; // refresh token
  staff: Staff | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  login: (
    token: string,
    refreshToken: string,
    staff: Staff,
    mustChangePassword?: boolean,
  ) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setStaff: (staff: Staff) => void;
  clearMustChangePassword: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      staff: null,
      isAuthenticated: false,
      mustChangePassword: false,

      login: (token, refreshToken, staff, mustChangePassword = false) => {
        localStorage.setItem("token", token);
        set({
          token,
          refreshToken,
          staff,
          isAuthenticated: true,
          mustChangePassword,
        });
      },

      setTokens: (token, refreshToken) => {
        localStorage.setItem("token", token);
        set({ token, refreshToken });
      },

      setStaff: (staff) => {
        set({ staff });
      },

      clearMustChangePassword: () => {
        set({ mustChangePassword: false });
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("staff");
        set({
          token: null,
          refreshToken: null,
          staff: null,
          isAuthenticated: false,
          mustChangePassword: false,
        });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
