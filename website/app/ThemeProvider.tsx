"use client";
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { applyTheme } from "../lib/theme";
import api from "../lib/axios";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { student } = useAuthStore();

  // Apply cached color immediately (from the logged-in student's school)
  useEffect(() => {
    applyTheme(student?.school?.primaryColor);
  }, [student?.school?.primaryColor]);

  // Fetch the current color from the API too, so admin changes propagate
  // without forcing the parent to log out and back in.
  useEffect(() => {
    const slug = process.env.NEXT_PUBLIC_SCHOOL_SLUG;
    if (!slug) return;
    api
      .get(`/schools/by-slug/${slug}`)
      .then((res) => {
        const color = res.data?.data?.primaryColor;
        if (color) applyTheme(color);
      })
      .catch(() => {});
  }, []);

  return <>{children}</>;
}
