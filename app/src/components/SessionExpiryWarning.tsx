import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStudentAuthStore } from '../lib/student-auth';
import { api, ensureSuccess } from '../lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Show a warning when the session has less than this many ms remaining. */
const WARNING_THRESHOLD_MS = 5 * 60 * 1000;
/** How often to check the session expiry (ms). */
const CHECK_INTERVAL_MS = 30 * 1000;

export default function SessionExpiryWarning() {
  const navigate = useNavigate();
  const sessionExpiresAt = useStudentAuthStore((s) => s.sessionExpiresAt);
  const refreshSession = useStudentAuthStore((s) => s.refreshSession);
  const logout = useStudentAuthStore((s) => s.logout);

  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(5);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!sessionExpiresAt) return;

    function check() {
      const remaining = sessionExpiresAt! - Date.now();
      if (remaining <= 0) {
        // Session already expired -- force redirect
        setShowWarning(false);
        logout();
        toast.error('Your session has expired. Please sign in again.');
        navigate('/student/login');
        return;
      }
      if (remaining <= WARNING_THRESHOLD_MS) {
        setMinutesLeft(Math.max(1, Math.ceil(remaining / 60_000)));
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }

    // Run immediately, then on interval
    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sessionExpiresAt, logout, navigate]);

  const handleStaySignedIn = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await api.post<{ expiresAt: number }>('/api/student/refresh');
      ensureSuccess(res);
      refreshSession();
      setShowWarning(false);
      toast.success('Session extended.');
    } catch {
      toast.error('Unable to refresh session. Please log in again.');
      logout();
      navigate('/student/login');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshSession, logout, navigate]);

  const handleLogOut = useCallback(() => {
    setShowWarning(false);
    logout();
    navigate('/student/login');
  }, [logout, navigate]);

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Your session is about to expire</DialogTitle>
          <DialogDescription>
            You'll be logged out in {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}. Would
            you like to stay signed in?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleLogOut}>
            Log Out
          </Button>
          <Button onClick={handleStaySignedIn} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Stay Signed In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
