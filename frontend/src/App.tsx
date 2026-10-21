import { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { applyTheme } from "./lib/theme";
import SubscriptionLocked from "./pages/Subscription/Locked";
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import VerifyEmail from "./pages/Auth/VerifyEmail";
import AcceptInvitation from "./pages/Auth/AcceptInvitation";
import ForceChangePassword from "./pages/Auth/ForceChangePassword";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import Dashboard from "./pages/Dashboard/index";
import StudentsPage from "./pages/Students/index";
import AddStudent from "./pages/Students/Add";
import StudentDetail from "./pages/Students/Detail";
import PaymentsPage from "./pages/Payments/index";
import RecordPayment from "./pages/Payments/Record";
import PendingPayments from "./pages/Payments/Pending";
import ClassesPage from "./pages/Classes/index";
import SMSPage from "./pages/SMS/index";
import ReportsPage from "./pages/Reports/index";
import SettingsPage from "./pages/Settings/index";
import ResultsPage from "./pages/Results/index";
import Promote from "./pages/Students/Promote";
import BulkImport from "./pages/Students/BulkImport";
import StaffPage from "./pages/Staff/index";
import AuditPage from "./pages/Audit/index";
import RateLimitModal from "./components/shared/RateLimitModal";

// Layout + Guards
import MainLayout from "./components/Layout/MainLayout";
import PermissionGuard from "./components/shared/PermissionGuard";

// Pages — Platform (owner portal)
import PlatformLogin from "./pages/Platform/Login";
import PlatformLayout from "./pages/Platform/Layout";
import PlatformDashboard from "./pages/Platform/Dashboard";
import PlatformSchoolDetail from "./pages/Platform/SchoolDetail";
import PlatformSettingsPage from "./pages/Platform/Settings";
import PlatformSubscriptions from "./pages/Platform/Subscriptions";
import PlatformAnalytics from "./pages/Platform/Analytics";
import PlatformOneKhusaMerchants from "./pages/Platform/OneKhusaMerchants";
import { usePlatformAuthStore } from "./store/platformAuthStore";

// ==================== GUARDS ====================

// School Admin Protected Route
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const {
    isAuthenticated,
    mustChangePassword,
    staff,
    refreshToken,
    logout,
    setTokens,
  } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const validate = async () => {
      if (!isAuthenticated || !refreshToken) {
        setIsChecking(false);
        return;
      }

      try {
        const baseURL = import.meta.env.VITE_API_URL || "";
        const res = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });
        setTokens(res.data.data.token, res.data.data.refreshToken);
      } catch {
        logout();
      } finally {
        setIsChecking(false);
      }
    };

    validate();
  }, [isAuthenticated, refreshToken, logout, setTokens]);

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-[var(--color-primary)] animate-spin" />
          <p className="text-xs text-gray-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword)
    return <Navigate to="/force-change-password" replace />;

  const status = (staff?.school as any)?.subscriptionStatus;
  if (status === "LOCKED" || status === "SUSPENDED") {
    return <SubscriptionLocked />;
  }

  return <>{children}</>;
};

// Platform Owner Protected Route
const PlatformProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated, refreshToken, logout, setTokens } =
    usePlatformAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const validate = async () => {
      if (!isAuthenticated || !refreshToken) {
        setIsChecking(false);
        return;
      }

      try {
        const baseURL = import.meta.env.VITE_API_URL || "";
        const res = await axios.post(`${baseURL}/platform/auth/refresh`, {
          refreshToken,
        });
        setTokens(res.data.data.token, res.data.data.refreshToken);
      } catch {
        logout();
      } finally {
        setIsChecking(false);
      }
    };

    validate();
  }, [isAuthenticated, refreshToken, logout, setTokens]);

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-blue-700 animate-spin" />
          <p className="text-xs text-slate-400">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/platform/login" replace />;
  return <>{children}</>;
};

// Force Password Change Route
const ForcePasswordRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, mustChangePassword } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

// ==================== APP ====================

function App() {
  const { staff } = useAuthStore();

  useEffect(() => {
    applyTheme(staff?.school?.primaryColor);
  }, [staff?.school?.primaryColor]);

  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/:slug" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* FORCE PASSWORD CHANGE */}
        <Route
          path="/force-change-password"
          element={
            <ForcePasswordRoute>
              <ForceChangePassword />
            </ForcePasswordRoute>
          }
        />

        {/* PROTECTED (MainLayout) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* STUDENTS */}
          <Route
            path="students"
            element={
              <PermissionGuard resource="students">
                <StudentsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="students/add"
            element={
              <PermissionGuard resource="students" action="write">
                <AddStudent />
              </PermissionGuard>
            }
          />
          <Route
            path="students/promote"
            element={
              <PermissionGuard resource="students" action="write">
                <Promote />
              </PermissionGuard>
            }
          />
          <Route
            path="students/bulk-import"
            element={
              <PermissionGuard resource="students" action="write">
                <BulkImport />
              </PermissionGuard>
            }
          />
          <Route
            path="students/:id"
            element={
              <PermissionGuard resource="students">
                <StudentDetail />
              </PermissionGuard>
            }
          />

          {/* PAYMENTS */}
          <Route
            path="payments"
            element={
              <PermissionGuard resource="payments">
                <PaymentsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="payments/record"
            element={
              <PermissionGuard resource="payments" action="write">
                <RecordPayment />
              </PermissionGuard>
            }
          />
          <Route
            path="payments/pending"
            element={
              <PermissionGuard resource="payments">
                <PendingPayments />
              </PermissionGuard>
            }
          />

          {/* CLASSES */}
          <Route
            path="classes"
            element={
              <PermissionGuard resource="classes">
                <ClassesPage />
              </PermissionGuard>
            }
          />

          {/* SMS / ALERTS */}
          <Route
            path="sms"
            element={
              <PermissionGuard resource="sms">
                <SMSPage />
              </PermissionGuard>
            }
          />

          {/* REPORTS */}
          <Route
            path="reports"
            element={
              <PermissionGuard resource="reports">
                <ReportsPage />
              </PermissionGuard>
            }
          />

          {/* SETTINGS */}
          <Route
            path="settings"
            element={
              <PermissionGuard resource="settings">
                <SettingsPage />
              </PermissionGuard>
            }
          />

          {/* RESULTS */}
          <Route
            path="results"
            element={
              <PermissionGuard resource="results">
                <ResultsPage />
              </PermissionGuard>
            }
          />

          {/* STAFF */}
          <Route
            path="staff"
            element={
              <PermissionGuard resource="staff">
                <StaffPage />
              </PermissionGuard>
            }
          />

          {/* AUDIT TRAIL */}
          <Route
            path="audit"
            element={
              <PermissionGuard resource="audit">
                <AuditPage />
              </PermissionGuard>
            }
          />
        </Route>

        {/* PLATFORM (owner portal) */}
        <Route path="/platform/login" element={<PlatformLogin />} />
        <Route
          path="/platform"
          element={
            <PlatformProtectedRoute>
              <PlatformLayout />
            </PlatformProtectedRoute>
          }
        >
          <Route
            index
            element={<Navigate to="/platform/dashboard" replace />}
          />
          <Route path="dashboard" element={<PlatformDashboard />} />
          <Route
            path="schools/new"
            element={<Navigate to="/platform/dashboard" replace />}
          />
          <Route path="schools/:id" element={<PlatformSchoolDetail />} />
          <Route path="subscriptions" element={<PlatformSubscriptions />} />
          <Route path="analytics" element={<PlatformAnalytics />} />
          <Route path="onekhusa" element={<PlatformOneKhusaMerchants />} />
          <Route path="settings" element={<PlatformSettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <RateLimitModal />
    </BrowserRouter>
  );
}

export default App;
