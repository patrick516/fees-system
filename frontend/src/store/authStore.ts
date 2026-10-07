import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Staff } from "../types";

interface AuthState {
  token: string | null;
  staff: Staff | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean; // NEW
  login: (token: string, staff: Staff, mustChangePassword?: boolean) => void; // UPDATED signature
  setStaff: (staff: Staff) => void;
  clearMustChangePassword: () => void; // NEW
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      staff: null,
      isAuthenticated: false,
      mustChangePassword: false, // NEW default

      login: (token, staff, mustChangePassword = false) => {
        localStorage.setItem("token", token);
        set({
          token,
          staff,
          isAuthenticated: true,
          mustChangePassword, // NEW
        });
      },

      setStaff: (staff) => {
        set({ staff });
      },

      // Called after a successful password change
      clearMustChangePassword: () => {
        set({ mustChangePassword: false });
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("staff");
        set({
          token: null,
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
