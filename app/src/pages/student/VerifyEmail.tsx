import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useVerifyEmail } from '../../hooks/useStudentAuth';
import { useStudentAuthStore } from '../../lib/student-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const verifyEmail = useVerifyEmail();
  const setEmailVerified = useStudentAuthStore((s) => s.setEmailVerified);
  const token = searchParams.get('token') || '';
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (token && !hasAttempted.current) {
      hasAttempted.current = true;
      verifyEmail
        .mutateAsync({ token })
        .then(() => {
          setEmailVerified();
          toast.success('Email verified successfully!');
        })
        .catch(() => {
          // error state handled by mutation state below
        });
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader className="space-y-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                MedEdPrep
              </p>
              <CardTitle className="text-2xl">Invalid Verification Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No verification token provided</AlertTitle>
                <AlertDescription>
                  This link is invalid. Please check your email for the correct verification link.
                </AlertDescription>
              </Alert>
              <div className="text-center">
                <Button asChild>
                  <Link to="/student">Go to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">MedEdPrep</p>
            <CardTitle className="text-2xl">Email Verification</CardTitle>
            <CardDescription>Verifying your email address...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verifyEmail.isPending && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Verifying your email...</p>
              </div>
            )}

            {verifyEmail.isSuccess && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Email verified</AlertTitle>
                  <AlertDescription>
                    Your email has been verified successfully. You can now enjoy the full features
                    of MedEdPrep.
                  </AlertDescription>
                </Alert>
                <div className="text-center">
                  <Button asChild>
                    <Link to="/student">Go to Dashboard</Link>
                  </Button>
                </div>
              </div>
            )}

            {verifyEmail.isError && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Verification failed</AlertTitle>
                  <AlertDescription>
                    This verification link is invalid or has already been used. Please request a new
                    verification email from your dashboard.
                  </AlertDescription>
                </Alert>
                <div className="text-center">
                  <Button asChild>
                    <Link to="/student">Go to Dashboard</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
