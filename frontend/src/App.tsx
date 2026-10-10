import { useEffect, useState } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { applyTheme } from "./lib/theme";

// Pages — Auth
import Login from "./pages/Auth/Login";
import Signup from "./pages/Auth/Signup";
import VerifyEmail from "./pages/Auth/VerifyEmail";
import AcceptInvitation from "./pages/Auth/AcceptInvitation";
import ForceChangePassword from "./pages/Auth/ForceChangePassword";

// Pages — App
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

//  GUARDS

// Standard protected route — redirects to /login or /force-change-password
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, mustChangePassword } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword)
    return <Navigate to="/force-change-password" replace />;

  return <>{children}</>;
};

// Only accessible when logged in AND mustChangePassword is true.
const ForcePasswordRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, mustChangePassword } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

function App() {
  const { staff } = useAuthStore();
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    applyTheme(staff?.school?.primaryColor);
  }, [staff?.school?.primaryColor]);

  // Validate session once on app boot.
  // If the refresh token is expired or missing, force logout before
  // rendering any protected route — prevents the "flash of dashboard".
  useEffect(() => {
    const validate = async () => {
      const { isAuthenticated, refreshToken, logout, setTokens } =
        useAuthStore.getState();

      // Not logged in → nothing to validate
      if (!isAuthenticated || !refreshToken) {
        if (isAuthenticated) logout();
        setSessionChecked(true);
        return;
      }

      try {
        const baseURL = import.meta.env.VITE_API_URL || "";
        const res = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken,
        });
        // Rotated tokens — store the fresh pair
        setTokens(res.data.data.token, res.data.data.refreshToken);
      } catch {
        // Refresh failed — session is dead
        logout();
      } finally {
        setSessionChecked(true);
      }
    };

    validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Splash screen while we validate
  if (!sessionChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-[var(--color-primary)] animate-spin" />
          <p className="text-xs text-gray-400">Restoring session...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/*  PUBLIC  */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/:slug" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />

        {/*  FORCE PASSWORD CHANGE  */}
        <Route
          path="/force-change-password"
          element={
            <ForcePasswordRoute>
              <ForceChangePassword />
            </ForcePasswordRoute>
          }
        />

        {/*  PROTECTED (MainLayout)  */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard — any authenticated user */}
          <Route path="dashboard" element={<Dashboard />} />

          {/*  STUDENTS  */}
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

          {/*  PAYMENTS  */}
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

          {/*  CLASSES  */}
          <Route
            path="classes"
            element={
              <PermissionGuard resource="classes">
                <ClassesPage />
              </PermissionGuard>
            }
          />

          {/*  SMS / ALERTS  */}
          <Route
            path="sms"
            element={
              <PermissionGuard resource="sms">
                <SMSPage />
              </PermissionGuard>
            }
          />

          {/*  REPORTS  */}
          <Route
            path="reports"
            element={
              <PermissionGuard resource="reports">
                <ReportsPage />
              </PermissionGuard>
            }
          />

          {/*  SETTINGS  */}
          <Route
            path="settings"
            element={
              <PermissionGuard resource="settings">
                <SettingsPage />
              </PermissionGuard>
            }
          />

          {/*  RESULTS  */}
          <Route
            path="results"
            element={
              <PermissionGuard resource="results">
                <ResultsPage />
              </PermissionGuard>
            }
          />

          {/*  STAFF  */}
          <Route
            path="staff"
            element={
              <PermissionGuard resource="staff">
                <StaffPage />
              </PermissionGuard>
            }
          />
          {/*  AUDIT TRAIL  */}
          <Route
            path="audit"
            element={
              <PermissionGuard resource="audit">
                <AuditPage />
              </PermissionGuard>
            }
          />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <RateLimitModal />
    </BrowserRouter>
  );
}

export default App;
