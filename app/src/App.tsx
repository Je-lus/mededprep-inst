import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from './lib/auth';
import { useIsStudentAuthenticated } from './lib/student-auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssessmentList from './pages/admin/AssessmentList';
import AssessmentCreate from './pages/admin/AssessmentCreate';
import AssessmentDetail from './pages/admin/AssessmentDetail';
import QrPresenter from './pages/admin/QrPresenter';
import BugReports from './pages/admin/BugReports';
import TakeAssessment from './pages/public/TakeAssessment';
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
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/assessments" element={<ProtectedRoute><AssessmentList /></ProtectedRoute>} />
        <Route path="/assessments/new" element={<ProtectedRoute><AssessmentCreate /></ProtectedRoute>} />
        <Route path="/assessments/:id" element={<ProtectedRoute><AssessmentDetail /></ProtectedRoute>} />
        <Route path="/assessments/:id/present" element={<ProtectedRoute><QrPresenter /></ProtectedRoute>} />
        <Route path="/bug-reports" element={<ProtectedRoute><BugReports /></ProtectedRoute>} />

        {/* Public routes (no auth) */}
        <Route path="/take/:hash" element={<TakeAssessment />} />
        <Route path="/create-account" element={<CreateAccount />} />

        {/* Student routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student" element={<StudentProtectedRoute><StudentDashboard /></StudentProtectedRoute>} />
        <Route path="/student/review/:responseId" element={<StudentProtectedRoute><AssessmentReview /></StudentProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <BugReportButton />
    </>
  );
}
