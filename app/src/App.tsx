import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from './lib/auth';
import { useIsStudentAuthenticated } from './lib/student-auth';
import AdminLayout from './components/AdminLayout';
import StudentLayout from './components/StudentLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssessmentList from './pages/admin/AssessmentList';
import QrPresenter from './pages/admin/QrPresenter';
import QuestionBankList from './pages/admin/QuestionBankList';
import QuestionBankCreate from './pages/admin/QuestionBankCreate';
import QuestionBankDetail from './pages/admin/QuestionBankDetail';
import BugReports from './pages/admin/BugReports';
import InstructorList from './pages/admin/InstructorList';
import StudentList from './pages/admin/StudentList';
import SessionList from './pages/admin/SessionList';
import SessionDetail from './pages/admin/SessionDetail';
import AttendSession from './pages/public/AttendSession';
import CheckOutSession from './pages/public/CheckOutSession';
import CreateAccount from './pages/public/CreateAccount';
import StudentLogin from './pages/student/StudentLogin';
import StudentDashboard from './pages/student/StudentDashboard';
import AssessmentReview from './pages/student/AssessmentReview';
import ForgotPassword from './pages/student/ForgotPassword';
import ResetPassword from './pages/student/ResetPassword';
import VerifyEmail from './pages/student/VerifyEmail';
import Welcome from './pages/Welcome';
import NotFound from './pages/NotFound';
import BugReportButton from './components/BugReportButton';
import ErrorBoundary from './components/ErrorBoundary';
import SessionExpiryWarning from './components/SessionExpiryWarning';

// Lazy-load heavy pages (SurveyJS, recharts) to reduce initial bundle size
const TakeAssessment = lazy(() => import('./pages/public/TakeAssessment'));
const AssessmentCreate = lazy(() => import('./pages/admin/AssessmentCreate'));
const AssessmentDetail = lazy(() => import('./pages/admin/AssessmentDetail'));

function SurveyLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  if (!isAuthenticated) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

function StudentProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsStudentAuthenticated();
  if (!isAuthenticated) return <Navigate to="/student/login" replace />;
  return (
    <>
      {children}
      <SessionExpiryWarning />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Welcome / role selection */}
        <Route path="/welcome" element={<Welcome />} />

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
          <Route
            path="assessments/new"
            element={
              <Suspense fallback={<SurveyLoadingFallback />}>
                <AssessmentCreate />
              </Suspense>
            }
          />
          <Route
            path="assessments/:id"
            element={
              <Suspense fallback={<SurveyLoadingFallback />}>
                <AssessmentDetail />
              </Suspense>
            }
          />
          <Route path="assessments/:id/present" element={<QrPresenter />} />
          <Route path="question-banks" element={<QuestionBankList />} />
          <Route path="question-banks/new" element={<QuestionBankCreate />} />
          <Route path="question-banks/:id" element={<QuestionBankDetail />} />
          <Route path="sessions" element={<SessionList />} />
          <Route path="sessions/:id" element={<SessionDetail />} />
          <Route path="bug-reports" element={<BugReports />} />
          <Route path="students" element={<StudentList />} />
          <Route path="instructors" element={<InstructorList />} />
        </Route>

        {/* Public routes (no auth) */}
        <Route
          path="/take/:hash"
          element={
            <Suspense fallback={<SurveyLoadingFallback />}>
              <TakeAssessment />
            </Suspense>
          }
        />
        <Route path="/attend/:hash" element={<AttendSession />} />
        <Route path="/attend/:hash/checkout" element={<CheckOutSession />} />
        <Route path="/create-account" element={<CreateAccount />} />

        {/* Student routes */}
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/forgot-password" element={<ForgotPassword />} />
        <Route path="/student/reset-password" element={<ResetPassword />} />
        <Route path="/student/verify-email" element={<VerifyEmail />} />
        <Route
          path="/student"
          element={
            <StudentProtectedRoute>
              <StudentLayout />
            </StudentProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="review/:responseId" element={<AssessmentReview />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>

      <BugReportButton />
    </ErrorBoundary>
  );
}
