// website/store/authStore.ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Student {
  id: string;
  fullName: string;
  studentCode: string;
  class: string;
  school: {
    id: string;
    name: string;
    address: string;
    phone: string;
    logo: string | null;
    motto: string | null;
  };
  parentName: string;
  parentPhone: string;
  academicYear: string;
  totalPaid?: number;
}

interface AuthState {
  token: string | null;
  student: Student | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean; // ← add this
  setHasHydrated: (v: boolean) => void; // ← and this
  login: (token: string, student: Student) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      student: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      login: (token, student) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("parent_token", token);
        }
        set({ token, student, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("parent_token");
          localStorage.removeItem("parent_student");
        }
        set({ token: null, student: null, isAuthenticated: false });
      },
    }),
    {
      name: "parent-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
