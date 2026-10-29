import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Staff } from "../types";
import api from "../lib/axios"; // 🎯 New import

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  staff: Staff | null;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  login: (
    token: string,
    refreshToken: string,
    staff: Staff,
    mustChangePassword?: boolean,
  ) => void;
  setTokens: (token: string, refreshToken: string) => void;
  setStaff: (staff: Staff) => void;
  clearMustChangePassword: () => void;
  refreshSubscriptionStatus: () => Promise<void>; // 🎯 New
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      staff: null,
      isAuthenticated: false,
      mustChangePassword: false,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

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
      setStaff: (staff) => set({ staff }),
      clearMustChangePassword: () => set({ mustChangePassword: false }),

      // 🎯 Poll the backend for the current subscription status
      refreshSubscriptionStatus: async () => {
        const { isAuthenticated, staff, setStaff } = get();
        if (!isAuthenticated || !staff) return;

        try {
          const res = await api.get("/auth/me");
          const newSchool = res.data?.data?.school;
          if (
            newSchool &&
            newSchool.subscriptionStatus !== staff.school.subscriptionStatus
          ) {
            setStaff({
              ...staff,
              school: { ...staff.school, ...newSchool },
            });

            // Force redirect if we became locked
            if (
              newSchool.subscriptionStatus === "LOCKED" ||
              newSchool.subscriptionStatus === "SUSPENDED"
            ) {
              if (!window.location.pathname.includes("subscription")) {
                window.location.href = "/subscription-locked";
              }
            }
          }
        } catch (err) {
          // Silent — interceptor handles 401/403
        }
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
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
