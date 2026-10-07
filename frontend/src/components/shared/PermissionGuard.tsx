// frontend/src/components/shared/PermissionGuard.tsx (new)
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import type { Resource, PermissionAction } from "../../types";

const PermissionGuard = ({
  resource,
  action = "read",
  children,
}: {
  resource: Resource;
  action?: PermissionAction;
  children: React.ReactNode;
}) => {
  const { staff } = useAuthStore();
  const role = staff?.role;

  // School Admin always passes
  if (role?.name === "School Admin") return <>{children}</>;

  const perms = role?.permissions?.[resource];
  if (!Array.isArray(perms) || !perms.includes(action)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export default PermissionGuard;
