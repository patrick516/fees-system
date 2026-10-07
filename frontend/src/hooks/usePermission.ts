// frontend/src/hooks/usePermission.ts
import { useAuthStore } from "../store/authStore";
import type { Resource, PermissionAction } from "../types";

/**
 * Hook for checking permissions in components.
 *
 * Usage:
 *   const { can, role } = usePermission();
 *   if (can("students", "write")) { ... }
 *
 * School Admin always returns true (safety fallback).
 */
export const usePermission = () => {
  const { staff } = useAuthStore();
  const role = staff?.role;

  const can = (resource: Resource, action: PermissionAction): boolean => {
    if (!role) return false;
    if (role.name === "School Admin") return true;
    const perms = role.permissions?.[resource];
    return Array.isArray(perms) && perms.includes(action);
  };

  return { can, role };
};
