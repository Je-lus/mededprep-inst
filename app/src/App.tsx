import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from './lib/auth';
import { useIsStudentAuthenticated } from './lib/student-auth';
import AdminLayout from './components/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssessmentList from './pages/admin/AssessmentList';
import AssessmentCreate from './pages/admin/AssessmentCreate';
import AssessmentDetail from './pages/admin/AssessmentDetail';
import QrPresenter from './pages/admin/QrPresenter';
import BugReports from './pages/admin/BugReports';
import SessionList from './pages/admin/SessionList';
import SessionDetail from './pages/admin/SessionDetail';
import TakeAssessment from './pages/public/TakeAssessment';
import AttendSession from './pages/public/AttendSession';
import CheckOutSession from './pages/public/CheckOutSession';
import CreateAccount from './pages/public/CreateAccount';
import StudentLogin from './pages/student/StudentLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import AssessmentReview from './pages/student/AssessmentReview';
import BugReportButton from './components/BugReportButton';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function StudentProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsStudentAuthenticated();
  if (!isAuthenticated) return <Navigate to="/student/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Admin routes */}
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="assessments" element={<AssessmentList />} />
          <Route path="assessments/new" element={<AssessmentCreate />} />
          <Route path="assessments/:id" element={<AssessmentDetail />} />
          <Route path="assessments/:id/present" element={<QrPresenter />} />
          <Route path="sessions" element={<SessionList />} />
          <Route path="sessions/:id" element={<SessionDetail />} />
          <Route path="bug-reports" element={<BugReports />} />
        </Route>

        {/* Public routes (no auth) */}
        <Route path="/take/:hash" element={<TakeAssessment />} />
        <Route path="/attend/:hash" element={<AttendSession />} />
        <Route path="/attend/:hash/checkout" element={<CheckOutSession />} />
        <Route path="/create-account" element={<CreateAccount />} />

        {/* Student routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route
          path="/student"
          element={
            <StudentProtectedRoute>
              <StudentDashboard />
            </StudentProtectedRoute>
          }
        />
        <Route
          path="/student/review/:responseId"
          element={
            <StudentProtectedRoute>
              <AssessmentReview />
            </StudentProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BugReportButton />
    </>
  );
}
