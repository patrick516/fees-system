"use client";
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { applyTheme } from "../lib/theme";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { student } = useAuthStore();

  useEffect(() => {
    applyTheme(student?.school?.primaryColor);
  }, [student?.school?.primaryColor]);

  return <>{children}</>;
}
