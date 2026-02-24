import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useStudentAuthStore } from '@/lib/student-auth';
import { useResendVerification } from '@/hooks/useStudentAuth';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

function EmailVerificationBanner() {
  const student = useStudentAuthStore((s) => s.student);
  const resendVerification = useResendVerification();

  if (!student || student.emailVerified) return null;

  const handleResend = async () => {
    try {
      const result = await resendVerification.mutateAsync();
      toast.success('Verification email sent.');
      // DEV ONLY: show the token in a toast for testing
      if (result.verificationToken) {
        toast.info(`Dev token: ${result.verificationToken}`, { duration: 10000 });
      }
    } catch {
      toast.error('Unable to resend verification email.');
    }
  };

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-sm text-amber-800">
        <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Please verify your email address.</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendVerification.isPending}
          className="font-medium underline hover:text-amber-900 disabled:opacity-50"
        >
          {resendVerification.isPending ? 'Sending...' : 'Resend verification link'}
        </button>
      </div>
    </div>
  );
}

export default function StudentLayout() {
  const { theme } = useTheme();
  const student = useStudentAuthStore((s) => s.student);
  const logout = useStudentAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/student/login');
  };

  return (
    <div
      className={cn(
        'min-h-screen bg-background',
        theme === 'glass-purple' && 'glass-body-gradient',
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-0 focus:top-0 focus:z-50 focus:block focus:w-full focus:bg-primary focus:px-4 focus:py-3 focus:text-center focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-10 border-b bg-card">
        <nav
          aria-label="Student portal"
          className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6"
        >
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">MedEdPrep</h1>
            <span className="hidden text-xs font-semibold uppercase tracking-wide text-primary sm:inline">
              Student Portal
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {student?.firstName} {student?.lastName}
            </span>
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLogout}
              aria-label="Log out of student portal"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Logout
            </Button>
          </div>
        </nav>
      </header>
      <EmailVerificationBanner />
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
