import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Staff } from "../types";

interface AuthState {
  token: string | null;
  staff: Staff | null;
  isAuthenticated: boolean;
  login: (token: string, staff: Staff) => void;
  setStaff: (staff: Staff) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      staff: null,
      isAuthenticated: false,

      login: (token, staff) => {
        localStorage.setItem("token", token);
        set({ token, staff, isAuthenticated: true });
      },
      setStaff: (staff) => {
        set({ staff });
      },

      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("staff");
        set({ token: null, staff: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
