import { useEffect } from "react";
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
import StaffPage from "./pages/Staff/index"; // NEW
import RateLimitModal from "./components/shared/RateLimitModal";

// Layout
import MainLayout from "./components/Layout/MainLayout";

// ==================== GUARDS ====================

// Standard protected route — redirects to /login or /force-change-password
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, mustChangePassword } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword)
    return <Navigate to="/force-change-password" replace />;

  return <>{children}</>;
};

// Only accessible when logged in AND mustChangePassword is true.
// Otherwise, send them where they belong.
const ForcePasswordRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, mustChangePassword } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!mustChangePassword) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

function App() {
  const { staff } = useAuthStore();

  useEffect(() => {
    applyTheme(staff?.school?.primaryColor);
  }, [staff?.school?.primaryColor]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ==================== PUBLIC ==================== */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/:slug" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/accept-invitation" element={<AcceptInvitation />} />

        {/* ==================== FORCE PASSWORD CHANGE ==================== */}
        <Route
          path="/force-change-password"
          element={
            <ForcePasswordRoute>
              <ForceChangePassword />
            </ForcePasswordRoute>
          }
        />

        {/* ==================== PROTECTED (MainLayout) ==================== */}
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
          <Route path="students" element={<StudentsPage />} />
          <Route path="students/add" element={<AddStudent />} />
          <Route path="students/promote" element={<Promote />} />
          <Route path="students/bulk-import" element={<BulkImport />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="payments/record" element={<RecordPayment />} />
          <Route path="payments/pending" element={<PendingPayments />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="sms" element={<SMSPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="results" element={<ResultsPage />} />
          <Route path="staff" element={<StaffPage />} /> {/* NEW */}
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <RateLimitModal />
    </BrowserRouter>
  );
}

export default App;
