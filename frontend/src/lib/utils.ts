import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns the current academic year in "YYYY-YYYY" format.
 * Academic year starts in September:
 *   - Sep–Dec 2026 → "2026-2027"
 *   - Jan–Aug 2026 → "2025-2026"
 */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 8 ? y : y - 1;
  return `${startYear}-${startYear + 1}`;
}
