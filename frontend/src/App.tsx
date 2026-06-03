import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";

// Pages
import Login from "./pages/Auth/Login";
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

// Layout
import MainLayout from "./components/Layout/MainLayout";

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
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
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="payments/record" element={<RecordPayment />} />
          <Route path="payments/pending" element={<PendingPayments />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="sms" element={<SMSPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
