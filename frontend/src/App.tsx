import { useEffect } from "react";
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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, mustChangePassword, staff } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword)
    return <Navigate to="/force-change-password" replace />;

  const status = (staff?.school as any)?.subscriptionStatus;
  if (status === "LOCKED" || status === "SUSPENDED") {
    return <SubscriptionLocked />;
  }

  return <>{children}</>;
};

const PlatformProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { isAuthenticated } = usePlatformAuthStore();

  if (!isAuthenticated) return <Navigate to="/platform/login" replace />;
  return <>{children}</>;
};

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

          <Route
            path="classes"
            element={
              <PermissionGuard resource="classes">
                <ClassesPage />
              </PermissionGuard>
            }
          />
          <Route
            path="sms"
            element={
              <PermissionGuard resource="sms">
                <SMSPage />
              </PermissionGuard>
            }
          />
          <Route
            path="reports"
            element={
              <PermissionGuard resource="reports">
                <ReportsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="settings"
            element={
              <PermissionGuard resource="settings">
                <SettingsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="results"
            element={
              <PermissionGuard resource="results">
                <ResultsPage />
              </PermissionGuard>
            }
          />
          <Route
            path="staff"
            element={
              <PermissionGuard resource="staff">
                <StaffPage />
              </PermissionGuard>
            }
          />
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
